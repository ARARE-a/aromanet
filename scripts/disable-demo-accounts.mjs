import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");

const demoAccounts = {
  store_accounts: ["store1@example.com", "store2@example.com", "store3@example.com", "store4@example.com"],
  therapist_accounts: [
    "therapist1@example.com",
    "therapist2@example.com",
    "therapist3@example.com",
    "therapist4@example.com",
    "therapist5@example.com",
  ],
  customer_accounts: ["customer1@example.com", "customer2@example.com"],
};

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function collect(conn) {
  const found = {};
  for (const [table, emails] of Object.entries(demoAccounts)) {
    const placeholders = emails.map(() => "?").join(",");
    const [rows] = await conn.execute(
      `select id, email, status from ${table} where email in (${placeholders})`,
      emails
    );
    found[table] = rows;
  }
  return found;
}

async function disableRows(conn, found) {
  const changed = {};
  for (const [table, rows] of Object.entries(found)) {
    changed[table] = [];
    for (const row of rows) {
      const randomPassword = crypto.randomBytes(32).toString("base64url");
      const passwordHash = await bcrypt.hash(randomPassword, 12);
      await conn.execute(
        `update ${table}
         set passwordHash = ?, crashPasswordHash = null, status = 'suspended'
         where id = ?`,
        [passwordHash, row.id]
      );
      changed[table].push({ id: row.id, email: row.email, status: "suspended" });
    }
  }
  return changed;
}

async function main() {
  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const found = await collect(conn);
    const preview = Object.fromEntries(
      Object.entries(found).map(([table, rows]) => [
        table,
        rows.map(row => ({ id: row.id, email: row.email, status: row.status })),
      ])
    );

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        found: preview,
        note: "Pass --apply to rotate passwords, clear crash passwords, and suspend these demo accounts.",
      }, null, 2));
      return;
    }

    await conn.beginTransaction();
    const changed = await disableRows(conn, found);
    await conn.commit();
    console.log(JSON.stringify({
      mode: "applied",
      changed,
      note: "Passwords were rotated and not printed.",
    }, null, 2));
  } catch (error) {
    if (apply) await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
