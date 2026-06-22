import mysql from "mysql2/promise";
import "dotenv/config";

const apply = process.argv.includes("--apply");

function argValue(name, fallback = undefined) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function currentMonthParts() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const end = next.toISOString().slice(0, 10);
  return { start, end };
}

function optionalNumber(value, name) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

async function main() {
  const defaults = currentMonthParts();
  const year = optionalNumber(argValue("--year", String(defaults.year)), "--year");
  const month = optionalNumber(argValue("--month", String(defaults.month)), "--month");
  const storeId = optionalNumber(argValue("--store-id"), "--store-id");
  const therapistId = optionalNumber(argValue("--therapist-id"), "--therapist-id");
  const { start, end } = monthBounds(year, month);

  const conn = await mysql.createConnection(required("DATABASE_URL"));
  const where = ["s.date >= ?", "s.date < ?", "s.therapistId is not null"];
  const params = [start, end];
  if (storeId) {
    where.push("s.storeId = ?");
    params.push(storeId);
  }
  if (therapistId) {
    where.push("s.therapistId = ?");
    params.push(therapistId);
  }

  const [rows] = await conn.execute(
    `select
       s.storeId,
       s.therapistId,
       coalesce(sum(s.totalAmount), 0) as totalSales,
       coalesce(sum(s.therapistBack), 0) as backAmount,
       coalesce(sum(s.optionAmount), 0) as optionAmount,
       sum(case when s.nominationFee > 0 then 1 else 0 end) as nominationCount,
       coalesce(t.backRate, '50.00') as therapistBackRate
     from sales s
     left join therapists t on t.id = s.therapistId
     where ${where.join(" and ")}
     group by s.storeId, s.therapistId, t.backRate
     order by s.storeId, s.therapistId`,
    params,
  );

  const preview = [];
  for (const row of rows) {
    const [existingRows] = await conn.execute(
      "select id, adjustmentAmount, adjustmentNote, totalPayroll, isPaid, paidAt, backRate from therapist_payrolls where storeId = ? and therapistId = ? and year = ? and month = ? limit 1",
      [row.storeId, row.therapistId, year, month],
    );
    const existing = existingRows[0];
    const adjustmentAmount = Number(existing?.adjustmentAmount ?? 0);
    const backAmount = Number(row.backAmount ?? 0);
    preview.push({
      storeId: Number(row.storeId),
      therapistId: Number(row.therapistId),
      year,
      month,
      totalSales: Number(row.totalSales ?? 0),
      backAmount,
      adjustmentAmount,
      totalPayroll: backAmount + adjustmentAmount,
      existingPayrollId: existing?.id ?? null,
    });
  }

  if (!apply) {
    console.log(JSON.stringify({
      mode: "dry-run",
      year,
      month,
      storeId: storeId ?? null,
      therapistId: therapistId ?? null,
      count: preview.length,
      preview,
      note: "Pass --apply to update therapist_payrolls from sales.",
    }, null, 2));
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    let inserted = 0;
    let updated = 0;
    for (const row of rows) {
      const [existingRows] = await conn.execute(
        "select id, adjustmentAmount, adjustmentNote, totalPayroll, isPaid, paidAt, backRate from therapist_payrolls where storeId = ? and therapistId = ? and year = ? and month = ? limit 1",
        [row.storeId, row.therapistId, year, month],
      );
      const existing = existingRows[0];
      const adjustmentAmount = Number(existing?.adjustmentAmount ?? 0);
      const backAmount = Number(row.backAmount ?? 0);
      const totalPayroll = backAmount + adjustmentAmount;
      const payrollChanged = existing && Number(existing.totalPayroll ?? 0) !== totalPayroll;
      const payload = [
        Number(row.nominationCount ?? 0),
        Number(row.totalSales ?? 0),
        String(row.therapistBackRate ?? existing?.backRate ?? "50.00"),
        backAmount,
        Number(row.optionAmount ?? 0),
        adjustmentAmount,
        existing?.adjustmentNote ?? null,
        totalPayroll,
        payrollChanged ? false : Boolean(existing?.isPaid ?? false),
        payrollChanged ? null : (existing?.paidAt ?? null),
      ];
      if (existing) {
        await conn.execute(
          `update therapist_payrolls
           set nominationCount = ?, totalSales = ?, backRate = ?, backAmount = ?, optionAmount = ?,
               adjustmentAmount = ?, adjustmentNote = ?, totalPayroll = ?, isPaid = ?, paidAt = ?
           where id = ?`,
          [...payload, existing.id],
        );
        updated += 1;
      } else {
        await conn.execute(
          `insert into therapist_payrolls
             (therapistId, storeId, year, month, nominationCount, totalSales, backRate, backAmount,
              optionAmount, adjustmentAmount, adjustmentNote, totalPayroll, isPaid, paidAt)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.therapistId, row.storeId, year, month, ...payload],
        );
        inserted += 1;
      }
    }
    await conn.commit();
    console.log(JSON.stringify({ mode: "applied", year, month, inserted, updated, preview }, null, 2));
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    await conn.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
