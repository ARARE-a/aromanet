import mysql from "mysql2/promise";

const apply = process.argv.includes("--apply");
const recalculatePayroll = process.argv.includes("--recalculate-payroll");
const markers = (process.env.SMOKE_DATA_MARKERS ?? "本番動作確認,動作確認")
  .split(",")
  .map(marker => marker.trim())
  .filter(Boolean);

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function likeParams() {
  return markers.map(marker => `%${marker}%`);
}

function markerWhere(columns) {
  return columns.map(column => `${column} like ?`).join(" or ");
}

async function selectIds(conn, sql, params = []) {
  const [rows] = await conn.execute(sql, params);
  return rows;
}

function ids(rows) {
  return Array.from(new Set(rows.map(row => row.id).filter(id => Number.isInteger(id))));
}

async function deleteIn(conn, table, column, values) {
  if (!values.length) return 0;
  const placeholders = values.map(() => "?").join(",");
  const [result] = await conn.execute(`delete from ${table} where ${column} in (${placeholders})`, values);
  return result.affectedRows ?? values.length;
}

async function collect(conn) {
  const params = likeParams();
  const reservationRows = await selectIds(
    conn,
    `select id, customerId, storeId, therapistId, date, totalPrice from reservations where ${markerWhere(["customerNote", "note"])}`,
    [...params, ...params]
  );
  const reservationIds = ids(reservationRows);

  const reviewParams = [...params];
  let reviewSql = `select id from reviews where ${markerWhere(["comment"])}`;
  if (reservationIds.length) {
    reviewSql += ` or reservationId in (${reservationIds.map(() => "?").join(",")})`;
    reviewParams.push(...reservationIds);
  }
  const reviewRows = await selectIds(conn, reviewSql, reviewParams);

  const messageRows = await selectIds(conn, `select id from messages where ${markerWhere(["content"])}`, params);
  const postRows = await selectIds(conn, `select id from posts where ${markerWhere(["content"])}`, params);
  const shiftRows = await selectIds(conn, `select id from shifts where ${markerWhere(["note"])}`, params);
  const menuRows = await selectIds(conn, `select id from menus where ${markerWhere(["name", "description"])}`, [...params, ...params]);
  const roomRows = await selectIds(conn, `select id from rooms where ${markerWhere(["name", "description"])}`, [...params, ...params]);

  const notificationParams = [...params, ...params];
  let notificationSql = `select id from notifications where ${markerWhere(["title", "body"])}`;
  if (reservationIds.length) {
    notificationSql += ` or relatedId in (${reservationIds.map(() => "?").join(",")})`;
    notificationParams.push(...reservationIds);
  }
  const notificationRows = await selectIds(conn, notificationSql, notificationParams);

  const impactedPayrollMonths = Array.from(new Set(
    reservationRows
      .filter(row => row.storeId && row.therapistId && row.date)
      .map(row => `${row.storeId}:${row.therapistId}:${String(row.date).slice(0, 7)}`)
  ));

  return {
    reservationRows,
    reservationIds,
    reviewIds: ids(reviewRows),
    messageIds: ids(messageRows),
    postIds: ids(postRows),
    shiftIds: ids(shiftRows),
    menuIds: ids(menuRows),
    roomIds: ids(roomRows),
    notificationIds: ids(notificationRows),
    impactedPayrollMonths,
  };
}

async function adjustCustomerSpend(conn, reservationRows) {
  const spendByCustomer = new Map();
  for (const row of reservationRows) {
    spendByCustomer.set(row.customerId, (spendByCustomer.get(row.customerId) ?? 0) + Number(row.totalPrice ?? 0));
  }
  for (const [customerId, amount] of spendByCustomer) {
    if (amount > 0) {
      await conn.execute(
        "update customer_profiles set totalSpent = greatest(totalSpent - ?, 0) where accountId = ?",
        [amount, customerId]
      );
    }
  }
}

async function recalculateImpactedPayroll(conn, impactedPayrollMonths) {
  for (const key of impactedPayrollMonths) {
    const [storeIdRaw, therapistIdRaw, month] = key.split(":");
    const storeId = Number(storeIdRaw);
    const therapistId = Number(therapistIdRaw);
    const year = Number(month.slice(0, 4));
    const monthNumber = Number(month.slice(5, 7));
    const [rows] = await conn.execute(
      `select
        coalesce(sum(therapistBack), 0) as totalBack,
        count(case when nominationFee > 0 then 1 end) as nominationCount
       from sales
       where storeId = ? and therapistId = ? and date >= ? and date < date_add(?, interval 1 month)`,
      [storeId, therapistId, `${month}-01`, `${month}-01`]
    );
    const summary = rows[0] ?? { totalBack: 0, nominationCount: 0 };
    await conn.execute(
      `update therapist_payrolls
       set nominationCount = ?, totalSales = ?, backAmount = ?, totalPayroll = ?
       where storeId = ? and therapistId = ? and year = ? and month = ?`,
      [
        Number(summary.nominationCount ?? 0),
        Number(summary.totalBack ?? 0),
        Number(summary.totalBack ?? 0),
        Number(summary.totalBack ?? 0),
        storeId,
        therapistId,
        year,
        monthNumber,
      ]
    );
  }
}

async function purge(conn, data) {
  const deleted = {};
  deleted.postImages = await deleteIn(conn, "post_images", "postId", data.postIds);
  deleted.posts = await deleteIn(conn, "posts", "id", data.postIds);
  deleted.messages = await deleteIn(conn, "messages", "id", data.messageIds);
  deleted.reviews = await deleteIn(conn, "reviews", "id", data.reviewIds);
  deleted.reservationOptions = await deleteIn(conn, "reservation_options", "reservationId", data.reservationIds);
  deleted.sales = await deleteIn(conn, "sales", "reservationId", data.reservationIds);
  deleted.reservations = await deleteIn(conn, "reservations", "id", data.reservationIds);
  deleted.shifts = await deleteIn(conn, "shifts", "id", data.shiftIds);
  deleted.notifications = await deleteIn(conn, "notifications", "id", data.notificationIds);
  deleted.menus = await deleteIn(conn, "menus", "id", data.menuIds);
  deleted.rooms = await deleteIn(conn, "rooms", "id", data.roomIds);
  await adjustCustomerSpend(conn, data.reservationRows);
  if (recalculatePayroll) await recalculateImpactedPayroll(conn, data.impactedPayrollMonths);
  return deleted;
}

async function main() {
  if (!markers.length) throw new Error("SMOKE_DATA_MARKERS must contain at least one marker");
  const conn = await mysql.createConnection(required("DATABASE_URL"));
  try {
    const data = await collect(conn);
    const preview = {
      markers,
      reservations: data.reservationIds.length,
      reviews: data.reviewIds.length,
      messages: data.messageIds.length,
      posts: data.postIds.length,
      shifts: data.shiftIds.length,
      notifications: data.notificationIds.length,
      menus: data.menuIds.length,
      rooms: data.roomIds.length,
      impactedPayrollMonths: data.impactedPayrollMonths,
    };
    if (!apply) {
      console.log(JSON.stringify({ mode: "dry-run", preview, note: "Pass --apply to delete these rows." }, null, 2));
      return;
    }
    await conn.beginTransaction();
    const deleted = await purge(conn, data);
    await conn.commit();
    console.log(JSON.stringify({ mode: "applied", deleted, impactedPayrollMonths: data.impactedPayrollMonths, recalculatePayroll }, null, 2));
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
