import "dotenv/config";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const knownPasswords = ["password123"];
const accountTables = ["store_accounts", "therapist_accounts", "customer_accounts"];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

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
