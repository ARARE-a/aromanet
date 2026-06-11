import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { storeAccounts, stores, shifts, menus } from "./drizzle/schema.js";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const hash = await bcrypt.hash("password123", 10);
const crashHash = await bcrypt.hash("crash123", 10);

// Re-insert store1 account and store
const r1 = await db.insert(storeAccounts).values({
  email: "store1@example.com",
  passwordHash: hash,
  crashPasswordHash: crashHash,
});
const storeAccId1 = r1[0].insertId;
console.log("New storeAccId1:", storeAccId1);

const s1 = await db.insert(stores).values({
  accountId: storeAccId1,
  name: "アロマサロン LUXE",
  description: "高級感あふれる完全個室のメンズエステサロンです。熟練のセラピストが心身ともにリフレッシュさせます。",
  address: "東京都渋谷区道玄坂1-2-3 LUXEビル5F",
  prefecture: "東京都",
  city: "渋谷区",
  phone: "03-1234-5678",
  access: "渋谷駅徒歩5分",
  openHours: "11:00",
  closeHours: "23:00",
  regularHoliday: "不定休",
  isPublic: true,
  reviewAvg: "4.80",
  reviewCount: 42,
});
const storeId1 = s1[0].insertId;
console.log("New storeId1:", storeId1);

// Re-insert menus for store1
await db.insert(menus).values([
  { storeId: storeId1, name: "リラクゼーションコース", description: "全身をゆっくりほぐす基本コース", durationMinutes: 60, price: 8000, nominationFee: 2000, isPublic: true },
  { storeId: storeId1, name: "プレミアムコース", description: "全身+フェイシャルの贅沢コース", durationMinutes: 90, price: 12000, nominationFee: 3000, isPublic: true },
  { storeId: storeId1, name: "VIPコース", description: "完全個室でのプレミアム施術", durationMinutes: 120, price: 18000, nominationFee: 5000, isPublic: true },
]);

// Re-insert shifts for store1 therapists
const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
await db.insert(shifts).values([
  { therapistId: 1, storeId: storeId1, date: today, startTime: "11:00", endTime: "20:00", isPublished: true },
  { therapistId: 2, storeId: storeId1, date: today, startTime: "13:00", endTime: "22:00", isPublished: true },
  { therapistId: 1, storeId: storeId1, date: tomorrow, startTime: "11:00", endTime: "20:00", isPublished: true },
]);

console.log("Re-seed complete! storeId1:", storeId1);
await conn.end();
