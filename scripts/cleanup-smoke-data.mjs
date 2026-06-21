import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const patterns = (process.env.QA_ACCOUNT_PATTERNS ?? "qa-%@example.com,probe-%@example.com")
  .split(",")
  .map((pattern) => pattern.trim())
  .filter(Boolean);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function whereLike(column) {
  return patterns.map(() => `${column} like ?`).join(" or ");
}

function placeholders(values) {
  return values.map(() => "?").join(",");
}

function uniqueIds(rows) {
  return Array.from(new Set(rows.map((row) => Number(row.id)).filter(Number.isInteger)));
}

async function selectIds(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return uniqueIds(rows);
}

async function deleteIn(conn, table, column, values) {
  if (!values.length) return 0;
  const [result] = await conn.execute(
    `delete from ${table} where ${column} in (${placeholders(values)})`,
    values,
  );
  return result.affectedRows ?? 0;
}

async function deleteWhere(conn, table, where, params) {
  if (!params.length) return 0;
  const [result] = await conn.execute(`delete from ${table} where ${where}`, params);
  return result.affectedRows ?? 0;
}

async function deleteAny(conn, table, clauses) {
  const active = clauses.filter((clause) => clause.values.length > 0);
  if (!active.length) return 0;
  const where = active.map((clause) => clause.sql).join(" or ");
  const params = active.flatMap((clause) => clause.values);
  return deleteWhere(conn, table, where, params);
}

async function collect(conn) {
  const storeAccountIds = await selectIds(
    conn,
    `select id from store_accounts where ${whereLike("email")}`,
    patterns,
  );
  const therapistAccountIds = await selectIds(
    conn,
    `select id from therapist_accounts where ${whereLike("email")}`,
    patterns,
  );
  const customerIds = await selectIds(
    conn,
    `select id from customer_accounts where ${whereLike("email")}`,
    patterns,
  );

  const storeIds = await selectIds(
    conn,
    `select id from stores where accountId in (${placeholders(storeAccountIds.length ? storeAccountIds : [-1])})`,
    storeAccountIds.length ? storeAccountIds : [-1],
  );
  const therapistIds = await selectIds(
    conn,
    `select id from therapists where accountId in (${placeholders(therapistAccountIds.length ? therapistAccountIds : [-1])}) or storeId in (${placeholders(storeIds.length ? storeIds : [-1])})`,
    [...(therapistAccountIds.length ? therapistAccountIds : [-1]), ...(storeIds.length ? storeIds : [-1])],
  );
  const allTherapistAccountIds = Array.from(new Set([
    ...therapistAccountIds,
    ...await selectIds(
      conn,
      `select accountId as id from therapists where id in (${placeholders(therapistIds.length ? therapistIds : [-1])})`,
      therapistIds.length ? therapistIds : [-1],
    ),
  ]));

  const reservationIds = await selectIds(
    conn,
    `select id from reservations where storeId in (${placeholders(storeIds.length ? storeIds : [-1])}) or therapistId in (${placeholders(therapistIds.length ? therapistIds : [-1])}) or customerId in (${placeholders(customerIds.length ? customerIds : [-1])})`,
    [
      ...(storeIds.length ? storeIds : [-1]),
      ...(therapistIds.length ? therapistIds : [-1]),
      ...(customerIds.length ? customerIds : [-1]),
    ],
  );
  const threadIds = await selectIds(
    conn,
    `select id from message_threads where storeId in (${placeholders(storeIds.length ? storeIds : [-1])}) or therapistId in (${placeholders(therapistIds.length ? therapistIds : [-1])}) or customerId in (${placeholders(customerIds.length ? customerIds : [-1])}) or reservationId in (${placeholders(reservationIds.length ? reservationIds : [-1])})`,
    [
      ...(storeIds.length ? storeIds : [-1]),
      ...(therapistIds.length ? therapistIds : [-1]),
      ...(customerIds.length ? customerIds : [-1]),
      ...(reservationIds.length ? reservationIds : [-1]),
    ],
  );
  const messageIds = await selectIds(
    conn,
    `select id from messages where threadId in (${placeholders(threadIds.length ? threadIds : [-1])})`,
    threadIds.length ? threadIds : [-1],
  );
  const postIds = await selectIds(
    conn,
    `select id from posts where storeId in (${placeholders(storeIds.length ? storeIds : [-1])}) or therapistId in (${placeholders(therapistIds.length ? therapistIds : [-1])})`,
    [...(storeIds.length ? storeIds : [-1]), ...(therapistIds.length ? therapistIds : [-1])],
  );
  const reviewIds = await selectIds(
    conn,
    `select id from reviews where reservationId in (${placeholders(reservationIds.length ? reservationIds : [-1])}) or storeId in (${placeholders(storeIds.length ? storeIds : [-1])}) or therapistId in (${placeholders(therapistIds.length ? therapistIds : [-1])}) or customerId in (${placeholders(customerIds.length ? customerIds : [-1])})`,
    [
      ...(reservationIds.length ? reservationIds : [-1]),
      ...(storeIds.length ? storeIds : [-1]),
      ...(therapistIds.length ? therapistIds : [-1]),
      ...(customerIds.length ? customerIds : [-1]),
    ],
  );

  return {
    storeAccountIds,
    therapistAccountIds: allTherapistAccountIds,
    customerIds,
    storeIds,
    therapistIds,
    reservationIds,
    threadIds,
    messageIds,
    postIds,
    reviewIds,
  };
}

async function purge(conn, data) {
  const deleted = {};

  deleted.reports = await deleteAny(conn, "reports", [
    { sql: `targetType = 'message' and targetId in (${placeholders(data.messageIds)})`, values: data.messageIds },
    { sql: `targetType = 'review' and targetId in (${placeholders(data.reviewIds)})`, values: data.reviewIds },
    { sql: `targetType = 'post' and targetId in (${placeholders(data.postIds)})`, values: data.postIds },
    { sql: `targetType = 'store' and targetId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `targetType = 'therapist' and targetId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `targetType = 'customer' and targetId in (${placeholders(data.customerIds)})`, values: data.customerIds },
    { sql: `reporterRole = 'store' and reporterId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `reporterRole = 'therapist' and reporterId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `reporterRole = 'customer' and reporterId in (${placeholders(data.customerIds)})`, values: data.customerIds },
  ]);
  deleted.blocks = await deleteAny(conn, "blocks", [
    { sql: `blockerRole = 'store' and blockerId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `blockedRole = 'store' and blockedId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `blockerRole = 'therapist' and blockerId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `blockedRole = 'therapist' and blockedId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `blockerRole = 'customer' and blockerId in (${placeholders(data.customerIds)})`, values: data.customerIds },
    { sql: `blockedRole = 'customer' and blockedId in (${placeholders(data.customerIds)})`, values: data.customerIds },
  ]);

  deleted.postComments = await deleteIn(conn, "post_comments", "postId", data.postIds);
  deleted.postImages = await deleteIn(conn, "post_images", "postId", data.postIds);
  deleted.favorites = await deleteAny(conn, "favorites", [
    { sql: `customerId in (${placeholders(data.customerIds)})`, values: data.customerIds },
    { sql: `targetType = 'store' and targetId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `targetType = 'therapist' and targetId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `targetType = 'post' and targetId in (${placeholders(data.postIds)})`, values: data.postIds },
  ]);
  deleted.follows = await deleteAny(conn, "follows", [
    { sql: `customerId in (${placeholders(data.customerIds)})`, values: data.customerIds },
    { sql: `targetType = 'store' and targetId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `targetType = 'therapist' and targetId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);

  deleted.messages = await deleteIn(conn, "messages", "threadId", data.threadIds);
  deleted.messageThreads = await deleteIn(conn, "message_threads", "id", data.threadIds);
  deleted.reservationOptions = await deleteIn(conn, "reservation_options", "reservationId", data.reservationIds);
  deleted.sales = await deleteIn(conn, "sales", "reservationId", data.reservationIds);
  deleted.reviews = await deleteIn(conn, "reviews", "id", data.reviewIds);
  deleted.reservations = await deleteIn(conn, "reservations", "id", data.reservationIds);

  deleted.storyPosts = await deleteAny(conn, "story_posts", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);
  deleted.posts = await deleteIn(conn, "posts", "id", data.postIds);
  deleted.shifts = await deleteAny(conn, "shifts", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);
  deleted.therapistPayrolls = await deleteAny(conn, "therapist_payrolls", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);
  deleted.therapistSalarySettings = await deleteAny(conn, "therapist_salary_settings", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);
  deleted.customerMemos = await deleteAny(conn, "customer_memos", [
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `customerId in (${placeholders(data.customerIds)})`, values: data.customerIds },
  ]);
  deleted.ngCustomers = await deleteAny(conn, "ng_customers", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `customerId in (${placeholders(data.customerIds)})`, values: data.customerIds },
  ]);

  deleted.notifications = await deleteAny(conn, "notifications", [
    { sql: `recipientRole = 'store' and recipientId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `recipientRole = 'therapist' and recipientId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
    { sql: `recipientRole = 'customer' and recipientId in (${placeholders(data.customerIds)})`, values: data.customerIds },
    { sql: `relatedId in (${placeholders(data.reservationIds)})`, values: data.reservationIds },
  ]);
  deleted.affiliationRequests = await deleteAny(conn, "affiliation_requests", [
    { sql: `storeId in (${placeholders(data.storeIds)})`, values: data.storeIds },
    { sql: `therapistId in (${placeholders(data.therapistIds)})`, values: data.therapistIds },
  ]);
  deleted.therapistInviteLinks = await deleteIn(conn, "therapist_invite_links", "storeId", data.storeIds);
  deleted.menuOptions = await deleteIn(conn, "menu_options", "storeId", data.storeIds);
  deleted.coupons = await deleteIn(conn, "coupons", "storeId", data.storeIds);
  deleted.menus = await deleteIn(conn, "menus", "storeId", data.storeIds);
  deleted.rooms = await deleteIn(conn, "rooms", "storeId", data.storeIds);

  deleted.ageVerifications = await deleteIn(conn, "age_verifications", "customerId", data.customerIds);
  deleted.identityVerifications = await deleteAny(conn, "identity_verifications", [
    { sql: `role = 'store' and accountId in (${placeholders(data.storeAccountIds)})`, values: data.storeAccountIds },
    { sql: `role = 'therapist' and accountId in (${placeholders(data.therapistAccountIds)})`, values: data.therapistAccountIds },
  ]);
  deleted.auditLogs = await deleteAny(conn, "audit_logs", [
    { sql: `actorRole = 'store' and actorId in (${placeholders(data.storeAccountIds)})`, values: data.storeAccountIds },
    { sql: `actorRole = 'therapist' and actorId in (${placeholders(data.therapistAccountIds)})`, values: data.therapistAccountIds },
    { sql: `actorRole = 'customer' and actorId in (${placeholders(data.customerIds)})`, values: data.customerIds },
  ]);

  deleted.customerProfiles = await deleteIn(conn, "customer_profiles", "accountId", data.customerIds);
  deleted.therapists = await deleteIn(conn, "therapists", "id", data.therapistIds);
  deleted.stores = await deleteIn(conn, "stores", "id", data.storeIds);
  deleted.customerAccounts = await deleteIn(conn, "customer_accounts", "id", data.customerIds);
  deleted.therapistAccounts = await deleteIn(conn, "therapist_accounts", "id", data.therapistAccountIds);
  deleted.storeAccounts = await deleteIn(conn, "store_accounts", "id", data.storeAccountIds);

  return deleted;
}

async function main() {
  if (!patterns.length) throw new Error("QA_ACCOUNT_PATTERNS must contain at least one pattern.");

  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const data = await collect(conn);
    const preview = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length]));

    if (!apply) {
      console.log(JSON.stringify({
        mode: "dry-run",
        patterns,
        preview,
        note: "Pass --apply to permanently delete QA smoke accounts and their linked data.",
      }, null, 2));
      return;
    }

    await conn.beginTransaction();
    const deleted = await purge(conn, data);
    await conn.commit();
    console.log(JSON.stringify({ mode: "applied", patterns, preview, deleted }, null, 2));
  } catch (error) {
    if (apply) await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
