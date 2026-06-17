import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const rotatePasswords = process.argv.includes("--rotate-passwords");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optional(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function assertPassword(name, value) {
  if (!value) return;
  if (value.length < 12) {
    throw new Error(`${name} must be at least 12 characters for production accounts`);
  }
}

async function getOne(conn, sql, params) {
  const [rows] = await conn.execute(sql, params);
  return rows[0] ?? null;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function upsertStore(conn) {
  const email = optional("PROD_STORE_EMAIL");
  const password = optional("PROD_STORE_PASSWORD");
  const name = optional("PROD_STORE_NAME");
  if (!email && !password && !name) return null;
  if (!email || !password || !name) {
    throw new Error("Set PROD_STORE_EMAIL, PROD_STORE_PASSWORD, and PROD_STORE_NAME together");
  }
  assertPassword("PROD_STORE_PASSWORD", password);

  const existing = await getOne(conn, "select id from store_accounts where email = ? limit 1", [email]);
  if (!apply) return { role: "store", email, action: existing ? "would_update_profile" : "would_create" };

  let accountId = existing?.id;
  if (!accountId) {
    const [result] = await conn.execute(
      "insert into store_accounts (email, passwordHash, identityVerified, identityVerifiedAt) values (?, ?, ?, ?)",
      [email, await hashPassword(password), process.env.PROD_MARK_VERIFIED === "1", process.env.PROD_MARK_VERIFIED === "1" ? new Date() : null]
    );
    accountId = result.insertId;
  } else if (rotatePasswords) {
    await conn.execute("update store_accounts set passwordHash = ? where id = ?", [await hashPassword(password), accountId]);
  }

  const store = await getOne(conn, "select id from stores where accountId = ? limit 1", [accountId]);
  if (store) {
    await conn.execute("update stores set name = ? where id = ?", [name, store.id]);
    return { role: "store", email, action: "updated", accountId, storeId: store.id };
  }
  const [storeResult] = await conn.execute("insert into stores (accountId, name) values (?, ?)", [accountId, name]);
  return { role: "store", email, action: "created", accountId, storeId: storeResult.insertId };
}

async function upsertTherapist(conn, fallbackStoreId) {
  const email = optional("PROD_THERAPIST_EMAIL");
  const password = optional("PROD_THERAPIST_PASSWORD");
  const displayName = optional("PROD_THERAPIST_NAME");
  if (!email && !password && !displayName) return null;
  if (!email || !password || !displayName) {
    throw new Error("Set PROD_THERAPIST_EMAIL, PROD_THERAPIST_PASSWORD, and PROD_THERAPIST_NAME together");
  }
  assertPassword("PROD_THERAPIST_PASSWORD", password);
  const storeId = Number(optional("PROD_THERAPIST_STORE_ID") ?? fallbackStoreId ?? 0) || null;

  const existing = await getOne(conn, "select id from therapist_accounts where email = ? limit 1", [email]);
  if (!apply) return { role: "therapist", email, action: existing ? "would_update_profile" : "would_create", storeId };

  let accountId = existing?.id;
  if (!accountId) {
    const [result] = await conn.execute(
      "insert into therapist_accounts (email, passwordHash, identityVerified, identityVerifiedAt, ageVerified) values (?, ?, ?, ?, ?)",
      [email, await hashPassword(password), process.env.PROD_MARK_VERIFIED === "1", process.env.PROD_MARK_VERIFIED === "1" ? new Date() : null, process.env.PROD_MARK_VERIFIED === "1"]
    );
    accountId = result.insertId;
  } else if (rotatePasswords) {
    await conn.execute("update therapist_accounts set passwordHash = ? where id = ?", [await hashPassword(password), accountId]);
  }

  const therapist = await getOne(conn, "select id from therapists where accountId = ? limit 1", [accountId]);
  if (therapist) {
    await conn.execute(
      "update therapists set displayName = ?, storeId = coalesce(?, storeId), affiliationStatus = case when ? is null then affiliationStatus else 'approved' end where id = ?",
      [displayName, storeId, storeId, therapist.id]
    );
    return { role: "therapist", email, action: "updated", accountId, therapistId: therapist.id, storeId };
  }
  const [therapistResult] = await conn.execute(
    "insert into therapists (accountId, displayName, storeId, affiliationStatus) values (?, ?, ?, ?)",
    [accountId, displayName, storeId, storeId ? "approved" : "pending"]
  );
  return { role: "therapist", email, action: "created", accountId, therapistId: therapistResult.insertId, storeId };
}

async function upsertCustomer(conn) {
  const email = optional("PROD_CUSTOMER_EMAIL");
  const password = optional("PROD_CUSTOMER_PASSWORD");
  const displayName = optional("PROD_CUSTOMER_NAME");
  if (!email && !password && !displayName) return null;
  if (!email || !password || !displayName) {
    throw new Error("Set PROD_CUSTOMER_EMAIL, PROD_CUSTOMER_PASSWORD, and PROD_CUSTOMER_NAME together");
  }
  assertPassword("PROD_CUSTOMER_PASSWORD", password);

  const existing = await getOne(conn, "select id from customer_accounts where email = ? limit 1", [email]);
  if (!apply) return { role: "customer", email, action: existing ? "would_update_profile" : "would_create" };

  let accountId = existing?.id;
  if (!accountId) {
    const [result] = await conn.execute(
      "insert into customer_accounts (email, passwordHash, ageVerified, ageVerifiedAt) values (?, ?, ?, ?)",
      [email, await hashPassword(password), process.env.PROD_MARK_VERIFIED === "1", process.env.PROD_MARK_VERIFIED === "1" ? new Date() : null]
    );
    accountId = result.insertId;
  } else if (rotatePasswords) {
    await conn.execute("update customer_accounts set passwordHash = ? where id = ?", [await hashPassword(password), accountId]);
  }

  const profile = await getOne(conn, "select id from customer_profiles where accountId = ? limit 1", [accountId]);
  if (profile) {
    await conn.execute("update customer_profiles set displayName = ? where id = ?", [displayName, profile.id]);
    return { role: "customer", email, action: "updated", accountId };
  }
  await conn.execute("insert into customer_profiles (accountId, displayName) values (?, ?)", [accountId, displayName]);
  return { role: "customer", email, action: "created", accountId };
}

async function main() {
  const databaseUrl = required("DATABASE_URL");
  const conn = await mysql.createConnection(databaseUrl);
  const results = [];
  try {
    if (apply) await conn.beginTransaction();
    const storeResult = await upsertStore(conn);
    if (storeResult) results.push(storeResult);
    const therapistResult = await upsertTherapist(conn, storeResult?.storeId);
    if (therapistResult) results.push(therapistResult);
    const customerResult = await upsertCustomer(conn);
    if (customerResult) results.push(customerResult);
    if (apply) await conn.commit();
  } catch (error) {
    if (apply) await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }

  console.log(JSON.stringify({
    mode: apply ? "applied" : "dry-run",
    rotatePasswords,
    results,
    note: apply ? "No passwords were printed." : "Pass --apply to write changes.",
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
