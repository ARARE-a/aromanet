import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const knownPasswords = ["password123"];
const accountTables = ["store_accounts", "therapist_accounts", "customer_accounts"];

function normalizeDatabaseUrl(rawValue) {
  if (!rawValue) {
    throw new Error(
      [
        "DATABASE_URL is required.",
        "Set it to the full database connection URL before running this command.",
        'Example shape: mysql://USER:PASSWORD@HOST:4000/DATABASE',
      ].join("\n"),
    );
  }

  const value = rawValue.trim().replace(/^['"]|['"]$/g, "");

  if (!value) {
    throw new Error("DATABASE_URL is empty after trimming spaces and quotes.");
  }

  if (value.includes("...") || value.includes("***") || value.includes("*****")) {
    throw new Error(
      [
        "DATABASE_URL looks like a masked or shortened value.",
        "Copy the real full connection URL using the copy button from the database screen.",
        "Do not paste the visible masked text with ... or ******.",
      ].join("\n"),
    );
  }

  if (!value.includes("://")) {
    throw new Error(
      [
        "DATABASE_URL is missing the protocol.",
        "It should start with mysql:// or mysql2://.",
        'Example shape: mysql://USER:PASSWORD@HOST:4000/DATABASE',
      ].join("\n"),
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      [
        "DATABASE_URL is not a valid URL.",
        "Copy the full database connection URL again, not the masked display value.",
        "Make sure there are no line breaks or extra spaces.",
      ].join("\n"),
    );
  }

  if (!["mysql:", "mysql2:"].includes(parsed.protocol)) {
    throw new Error(`DATABASE_URL protocol must be mysql:// or mysql2://, but got ${parsed.protocol}//.`);
  }

  if (!parsed.hostname || !parsed.username) {
    throw new Error("DATABASE_URL must include username, host, and database name.");
  }

  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error("DATABASE_URL is missing the database name after the host.");
  }

  return value;
}

async function main() {
  const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

  const conn = await mysql.createConnection(databaseUrl);
  const report = {
    mode: apply ? "applied" : "dry-run",
    checkedPasswords: knownPasswords,
    matches: {},
    changed: {},
    note: apply
      ? "Matching passwords were rotated and matching accounts were suspended. Passwords were not printed."
      : "Pass --apply to rotate matching passwords and suspend matching accounts.",
  };

  for (const table of accountTables) {
    const [rows] = await conn.execute(`SELECT id, email, status, passwordHash FROM \`${table}\``);
    const matches = [];

    for (const row of rows) {
      if (!row.passwordHash) continue;
      for (const password of knownPasswords) {
        if (await bcrypt.compare(password, row.passwordHash)) {
          matches.push({ id: row.id, email: row.email, status: row.status });
          break;
        }
      }
    }

    report.matches[table] = matches;

    if (apply && matches.length) {
      report.changed[table] = [];
      for (const account of matches) {
        const replacement = crypto.randomBytes(24).toString("base64url");
        const hash = await bcrypt.hash(replacement, 12);
        await conn.execute(
          `UPDATE \`${table}\` SET passwordHash = ?, crashPasswordHash = NULL, status = 'suspended' WHERE id = ?`,
          [hash, account.id],
        );
        report.changed[table].push({ ...account, status: "suspended" });
      }
    }
  }

  await conn.end();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
