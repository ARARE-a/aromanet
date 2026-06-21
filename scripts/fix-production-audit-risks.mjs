import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");

const suspiciousAccountWhere = [
  "email like '%@example.com'",
  "email like 'qa-%'",
  "email like 'probe-%'",
  "email like 'test-%'",
  "email like 'demo-%'",
].join(" or ");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function query(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

async function execute(conn, sql, params = []) {
  const [result] = await conn.execute(sql, params);
  return result.affectedRows ?? 0;
}

async function collectSuspiciousAccounts(conn, table) {
  return query(conn, `select id, email, status from ${table} where ${suspiciousAccountWhere} order by id`);
}

async function rotateAndSuspendAccounts(conn, table, rows) {
  let changed = 0;
  for (const row of rows) {
    const randomPassword = crypto.randomBytes(32).toString("base64url");
    const passwordHash = await bcrypt.hash(randomPassword, 12);
    changed += await execute(
      conn,
      `update ${table}
       set passwordHash = ?, crashPasswordHash = null, status = 'suspended'
       where id = ? and status <> 'deleted'`,
      [passwordHash, row.id],
    );
  }
  return changed;
}

async function collectExposure(conn) {
  const publicStores = await query(
    conn,
    `select s.id, s.name, sa.email, sa.status
     from stores s
     inner join store_accounts sa on sa.id = s.accountId
     where s.isPublic = 1 and (sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")})
     order by s.id`,
  );

  const publicTherapists = await query(
    conn,
    `select t.id, t.displayName, ta.email, ta.status, s.id as storeId, sa.email as storeEmail, sa.status as storeStatus
     from therapists t
     inner join therapist_accounts ta on ta.id = t.accountId
     left join stores s on s.id = t.storeId
     left join store_accounts sa on sa.id = s.accountId
     where t.isPublic = 1 and (
       ta.status <> 'active'
       or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}
       or s.isPublic <> 1
       or sa.status <> 'active'
       or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}
     )
     order by t.id`,
  );

  const publicPosts = await query(
    conn,
    `select p.id, p.storeId, p.therapistId
     from posts p
     left join stores s on s.id = p.storeId
     left join store_accounts sa on sa.id = s.accountId
     left join therapists t on t.id = p.therapistId
     left join therapist_accounts ta on ta.id = t.accountId
     where p.isPublic = 1 and (
       (p.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}))
       or (p.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}))
     )
     order by p.id`,
  );

  const publicStories = await query(
    conn,
    `select sp.id, sp.storeId, sp.therapistId
     from story_posts sp
     left join stores s on s.id = sp.storeId
     left join store_accounts sa on sa.id = s.accountId
     left join therapists t on t.id = sp.therapistId
     left join therapist_accounts ta on ta.id = t.accountId
     where (
       (sp.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}))
       or (sp.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}))
     )
     order by sp.id`,
  );

  return { publicStores, publicTherapists, publicPosts, publicStories };
}

async function depublicizeExposure(conn) {
  const storesChanged = await execute(
    conn,
    `update stores s
     inner join store_accounts sa on sa.id = s.accountId
     set s.isPublic = 0
     where s.isPublic = 1 and (sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")})`,
  );

  const therapistsChanged = await execute(
    conn,
    `update therapists t
     inner join therapist_accounts ta on ta.id = t.accountId
     left join stores s on s.id = t.storeId
     left join store_accounts sa on sa.id = s.accountId
     set t.isPublic = 0
     where t.isPublic = 1 and (
       ta.status <> 'active'
       or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}
       or s.isPublic <> 1
       or sa.status <> 'active'
       or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}
     )`,
  );

  const postsChanged = await execute(
    conn,
    `update posts p
     left join stores s on s.id = p.storeId
     left join store_accounts sa on sa.id = s.accountId
     left join therapists t on t.id = p.therapistId
     left join therapist_accounts ta on ta.id = t.accountId
     set p.isPublic = 0
     where p.isPublic = 1 and (
       (p.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}))
       or (p.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}))
     )`,
  );

  const storiesDeleted = await execute(
    conn,
    `delete sp from story_posts sp
     left join stores s on s.id = sp.storeId
     left join store_accounts sa on sa.id = s.accountId
     left join therapists t on t.id = sp.therapistId
     left join therapist_accounts ta on ta.id = t.accountId
     where (
       (sp.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "sa.email")}))
       or (sp.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousAccountWhere.replaceAll("email", "ta.email")}))
     )`,
  );

  return {
    stores: storesChanged,
    therapists: therapistsChanged,
    posts: postsChanged,
    stories: storiesDeleted,
  };
}

async function main() {
  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const before = await collectExposure(conn);
    const suspiciousAccounts = {
      store_accounts: await collectSuspiciousAccounts(conn, "store_accounts"),
      therapist_accounts: await collectSuspiciousAccounts(conn, "therapist_accounts"),
      customer_accounts: await collectSuspiciousAccounts(conn, "customer_accounts"),
    };

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        suspiciousAccounts,
        publicExposureBefore: {
          stores: before.publicStores,
          therapists: before.publicTherapists,
          posts: before.publicPosts,
          stories: before.publicStories,
        },
        note: "Pass --apply to suspend suspicious accounts, hide risky public records, and delete risky stories.",
      }, null, 2));
      return;
    }

    await conn.beginTransaction();
    try {
      const accountChanges = {
        store_accounts: await rotateAndSuspendAccounts(conn, "store_accounts", suspiciousAccounts.store_accounts),
        therapist_accounts: await rotateAndSuspendAccounts(conn, "therapist_accounts", suspiciousAccounts.therapist_accounts),
        customer_accounts: await rotateAndSuspendAccounts(conn, "customer_accounts", suspiciousAccounts.customer_accounts),
      };
      const exposureChanged = await depublicizeExposure(conn);
      await conn.commit();

      console.log(JSON.stringify({
        mode: "applied",
        suspiciousAccounts,
        publicExposureBefore: {
          stores: before.publicStores,
          therapists: before.publicTherapists,
          posts: before.publicPosts,
          stories: before.publicStories,
        },
        changed: {
          accounts: accountChanges,
          publicExposure: exposureChanged,
        },
        note: "Audit risks were deactivated. Run pnpm run prod:audit-data again.",
      }, null, 2));
    } catch (error) {
      await conn.rollback();
      throw error;
    }
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
