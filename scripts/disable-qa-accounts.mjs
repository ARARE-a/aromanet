import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const patterns = ["qa-%@example.com", "probe-%@example.com"];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function findAccounts(conn, table) {
  const where = patterns.map(() => "email like ?").join(" or ");
  const [rows] = await conn.execute(
    `select id, email, status from ${table} where ${where}`,
    patterns,
  );
  return rows;
}

async function disableAccounts(conn, table, rows) {
  const changed = [];
  for (const row of rows) {
    const randomPassword = crypto.randomBytes(32).toString("base64url");
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    await conn.execute(
      `update ${table}
       set passwordHash = ?, crashPasswordHash = null, status = 'suspended'
       where id = ?`,
      [passwordHash, row.id],
    );
    changed.push({ id: row.id, email: row.email, status: "suspended" });
  }
  return changed;
}

async function main() {
  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const tables = ["store_accounts", "therapist_accounts", "customer_accounts"];
    const found = {};
    for (const table of tables) {
      found[table] = await findAccounts(conn, table);
    }

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        found,
        note: "Pass --apply to suspend QA accounts and rotate their passwords.",
      }, null, 2));
      return;
    }

    const changed = {};
    for (const table of tables) {
      changed[table] = await disableAccounts(conn, table, found[table]);
    }
    console.log(JSON.stringify({
      mode: "applied",
      changed,
      note: "Passwords were rotated and not printed.",
    }, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
