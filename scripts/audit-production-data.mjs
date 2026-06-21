import mysql from "mysql2/promise";

const suspiciousEmailSql = [
  "email like '%@example.com'",
  "email like 'qa-%'",
  "email like 'probe-%'",
  "email like 'smoke-%'",
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

async function safeQuery(conn, sql, params = []) {
  try {
    return await query(conn, sql, params);
  } catch (error) {
    const message = String(error?.message ?? "");
    if (message.includes("doesn't exist") || error?.code === "ER_NO_SUCH_TABLE") return [];
    throw error;
  }
}

async function auditAccounts(conn, table) {
  const suspicious = await query(
    conn,
    `select id, email, status from ${table} where ${suspiciousEmailSql} order by id`
  );
  const activeRisk = suspicious.filter(row => !["suspended", "deleted"].includes(row.status));
  return { suspicious, activeRisk };
}

async function main() {
  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const storeAccounts = await auditAccounts(conn, "store_accounts");
    const therapistAccounts = await auditAccounts(conn, "therapist_accounts");
    const customerAccounts = await auditAccounts(conn, "customer_accounts");

    const publicStores = await query(
      conn,
      `select s.id, s.name, s.isPublic, sa.email, sa.status
       from stores s
       inner join store_accounts sa on sa.id = s.accountId
       where s.isPublic = 1 and (sa.status <> 'active' or ${suspiciousEmailSql.replaceAll("email", "sa.email")})
       order by s.id`
    );

    const publicTherapists = await query(
      conn,
      `select t.id, t.displayName, t.isPublic, ta.email, ta.status, s.id as storeId, s.isPublic as storeIsPublic, sa.email as storeEmail, sa.status as storeStatus
       from therapists t
       inner join therapist_accounts ta on ta.id = t.accountId
       left join stores s on s.id = t.storeId
       left join store_accounts sa on sa.id = s.accountId
       where t.isPublic = 1 and (
         ta.status <> 'active'
         or ${suspiciousEmailSql.replaceAll("email", "ta.email")}
         or s.isPublic <> 1
         or sa.status <> 'active'
         or ${suspiciousEmailSql.replaceAll("email", "sa.email")}
       )
       order by t.id`
    );

    const publicPosts = await query(
      conn,
      `select p.id, p.storeId, p.therapistId, p.isPublic
       from posts p
       left join stores s on s.id = p.storeId
       left join store_accounts sa on sa.id = s.accountId
       left join therapists t on t.id = p.therapistId
       left join therapist_accounts ta on ta.id = t.accountId
       where p.isPublic = 1 and (
         (p.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousEmailSql.replaceAll("email", "sa.email")}))
         or (p.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousEmailSql.replaceAll("email", "ta.email")}))
       )
       order by p.id`
    );

    const publicStories = await safeQuery(
      conn,
      `select sp.id, sp.storeId, sp.therapistId
       from story_posts sp
       left join stores s on s.id = sp.storeId
       left join store_accounts sa on sa.id = s.accountId
       left join therapists t on t.id = sp.therapistId
       left join therapist_accounts ta on ta.id = t.accountId
       where (
         (sp.storeId is not null and (s.isPublic <> 1 or sa.status <> 'active' or ${suspiciousEmailSql.replaceAll("email", "sa.email")}))
         or (sp.therapistId is not null and (t.isPublic <> 1 or ta.status <> 'active' or ${suspiciousEmailSql.replaceAll("email", "ta.email")}))
       )
       order by sp.id`
    );

    const pendingVerifications = {
      identity: await query(conn, "select count(*) as count from identity_verifications where status = 'pending'"),
      age: await query(conn, "select count(*) as count from age_verifications where status = 'pending'"),
    };

    const risks = {
      activeSuspiciousAccounts:
        storeAccounts.activeRisk.length + therapistAccounts.activeRisk.length + customerAccounts.activeRisk.length,
      publicStores: publicStores.length,
      publicTherapists: publicTherapists.length,
      publicPosts: publicPosts.length,
      publicStories: publicStories.length,
    };

    const ok = Object.values(risks).every(count => count === 0);
    console.log(JSON.stringify({
      ok,
      risks,
      accounts: {
        store_accounts: storeAccounts,
        therapist_accounts: therapistAccounts,
        customer_accounts: customerAccounts,
      },
      publicExposure: {
        stores: publicStores,
        therapists: publicTherapists,
        posts: publicPosts,
        stories: publicStories,
      },
      pendingVerifications: {
        identity: pendingVerifications.identity[0]?.count ?? 0,
        age: pendingVerifications.age[0]?.count ?? 0,
      },
      note: ok
        ? "No active QA/demo accounts or public QA/demo exposure were found."
        : "Fix the reported risks before promoting this database.",
    }, null, 2));

    if (!ok) process.exit(1);
  } finally {
    await conn.end();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
