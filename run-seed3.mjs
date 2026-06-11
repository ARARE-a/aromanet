import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import {
  storeAccounts, stores, therapistAccounts, therapists,
  customerAccounts, customerProfiles, menus, shifts, customerLevels
} from "./drizzle/schema.js";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const hash = await bcrypt.hash("password123", 10);
const crashHash = await bcrypt.hash("crash123", 10);

// Check if stores already seeded
const existingStores = await db.select().from(stores).limit(1);
if (existingStores.length > 0) {
  console.log("Stores already exist, skipping...");
  await conn.end();
  process.exit(0);
}

console.log("Seeding stores...");

// Get or create store accounts
const existingStoreAccs = await db.select().from(storeAccounts);
let storeAccId1, storeAccId2;

if (existingStoreAccs.length >= 2) {
  storeAccId1 = existingStoreAccs[0].id;
  storeAccId2 = existingStoreAccs[1].id;
  console.log("Using existing store accounts:", storeAccId1, storeAccId2);
} else if (existingStoreAccs.length === 1) {
  storeAccId1 = existingStoreAccs[0].id;
  const r = await db.insert(storeAccounts).values({ email: "store2@example.com", passwordHash: hash });
  storeAccId2 = r[0].insertId;
} else {
  const r1 = await db.insert(storeAccounts).values({ email: "store1@example.com", passwordHash: hash, crashPasswordHash: crashHash });
  storeAccId1 = r1[0].insertId;
  const r2 = await db.insert(storeAccounts).values({ email: "store2@example.com", passwordHash: hash });
  storeAccId2 = r2[0].insertId;
}

// Insert stores
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

const s2 = await db.insert(stores).values({
  accountId: storeAccId2,
  name: "プレミアムエステ BLANC",
  description: "白を基調とした清潔感あるサロン。初めての方も安心してご利用いただけます。",
  address: "東京都新宿区歌舞伎町2-3-4 BLANCビル3F",
  prefecture: "東京都",
  city: "新宿区",
  phone: "03-9876-5432",
  access: "新宿駅東口徒歩7分",
  openHours: "12:00",
  closeHours: "24:00",
  regularHoliday: "月曜定休",
  isPublic: true,
  reviewAvg: "4.60",
  reviewCount: 28,
});
const storeId2 = s2[0].insertId;

console.log("Seeding therapists...");

// Get or create therapist accounts
const existingTherapistAccs = await db.select().from(therapistAccounts);
let tAccId1, tAccId2, tAccId3;

if (existingTherapistAccs.length >= 3) {
  tAccId1 = existingTherapistAccs[0].id;
  tAccId2 = existingTherapistAccs[1].id;
  tAccId3 = existingTherapistAccs[2].id;
} else {
  // Insert new therapist accounts
  const emails = existingTherapistAccs.map(a => a.email);
  if (!emails.includes("therapist1@example.com")) {
    const r = await db.insert(therapistAccounts).values({ email: "therapist1@example.com", passwordHash: hash });
    tAccId1 = r[0].insertId;
  } else {
    tAccId1 = existingTherapistAccs.find(a => a.email === "therapist1@example.com").id;
  }
  if (!emails.includes("therapist2@example.com")) {
    const r = await db.insert(therapistAccounts).values({ email: "therapist2@example.com", passwordHash: hash });
    tAccId2 = r[0].insertId;
  } else {
    tAccId2 = existingTherapistAccs.find(a => a.email === "therapist2@example.com").id;
  }
  if (!emails.includes("therapist3@example.com")) {
    const r = await db.insert(therapistAccounts).values({ email: "therapist3@example.com", passwordHash: hash });
    tAccId3 = r[0].insertId;
  } else {
    tAccId3 = existingTherapistAccs.find(a => a.email === "therapist3@example.com").id;
  }
}

const t1 = await db.insert(therapists).values({ accountId: tAccId1, storeId: storeId1, displayName: "葵（あおい）", age: 24, height: 162, bust: 85, waist: 58, hip: 87, style: "スレンダー", catchphrase: "心も体も癒します♪", selfIntro: "初めまして！葵です。丁寧な施術で皆様をリラックスさせます。", isPublic: true, nominationCount: 128, reviewAvg: "4.90", reviewCount: 38 });
const tId1 = t1[0].insertId;

const t2 = await db.insert(therapists).values({ accountId: tAccId2, storeId: storeId1, displayName: "桜（さくら）", age: 22, height: 158, bust: 83, waist: 56, hip: 85, style: "かわいい系", catchphrase: "笑顔でお迎えします！", selfIntro: "こんにちは！桜です。明るく楽しい時間をお過ごしください。", isPublic: true, nominationCount: 95, reviewAvg: "4.75", reviewCount: 29 });
const tId2 = t2[0].insertId;

const t3 = await db.insert(therapists).values({ accountId: tAccId3, storeId: storeId2, displayName: "凛（りん）", age: 26, height: 165, bust: 88, waist: 60, hip: 90, style: "スタイル抜群", catchphrase: "上質なひとときを", selfIntro: "凛と申します。丁寧な施術で特別なひとときをご提供します。", isPublic: true, nominationCount: 67, reviewAvg: "4.85", reviewCount: 21 });
const tId3 = t3[0].insertId;

console.log("Seeding customers...");

// Get or create customer accounts
const existingCustAccs = await db.select().from(customerAccounts);
let cAccId1, cAccId2;

if (existingCustAccs.length >= 2) {
  cAccId1 = existingCustAccs[0].id;
  cAccId2 = existingCustAccs[1].id;
} else {
  const custEmails = existingCustAccs.map(a => a.email);
  if (!custEmails.includes("customer1@example.com")) {
    const r = await db.insert(customerAccounts).values({ email: "customer1@example.com", passwordHash: hash });
    cAccId1 = r[0].insertId;
  } else {
    cAccId1 = existingCustAccs.find(a => a.email === "customer1@example.com").id;
  }
  if (!custEmails.includes("customer2@example.com")) {
    const r = await db.insert(customerAccounts).values({ email: "customer2@example.com", passwordHash: hash });
    cAccId2 = r[0].insertId;
  } else {
    cAccId2 = existingCustAccs.find(a => a.email === "customer2@example.com").id;
  }
}

// Check if customer profiles exist
const existingProfiles = await db.select().from(customerProfiles);
if (existingProfiles.length === 0) {
  await db.insert(customerProfiles).values({ accountId: cAccId1, nickname: "田中 太郎", memberLevel: 3, totalSpent: 85000 });
  await db.insert(customerProfiles).values({ accountId: cAccId2, nickname: "ゲスト様", memberLevel: 1, totalSpent: 5000 });
}

console.log("Seeding menus...");
await db.insert(menus).values([
  { storeId: storeId1, name: "リラクゼーションコース", description: "全身をゆっくりほぐす基本コース", durationMinutes: 60, price: 8000, nominationFee: 2000, isPublic: true },
  { storeId: storeId1, name: "プレミアムコース", description: "全身+フェイシャルの贅沢コース", durationMinutes: 90, price: 12000, nominationFee: 3000, isPublic: true },
  { storeId: storeId1, name: "VIPコース", description: "完全個室でのプレミアム施術", durationMinutes: 120, price: 18000, nominationFee: 5000, isPublic: true },
  { storeId: storeId2, name: "スタンダードコース", description: "60分の基本コース", durationMinutes: 60, price: 7500, nominationFee: 1500, isPublic: true },
  { storeId: storeId2, name: "ロングコース", description: "90分のゆったりコース", durationMinutes: 90, price: 11000, nominationFee: 2500, isPublic: true },
]);

console.log("Seeding shifts...");
const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
await db.insert(shifts).values([
  { therapistId: tId1, storeId: storeId1, date: today, startTime: "11:00", endTime: "20:00", isPublished: true },
  { therapistId: tId2, storeId: storeId1, date: today, startTime: "13:00", endTime: "22:00", isPublished: true },
  { therapistId: tId1, storeId: storeId1, date: tomorrow, startTime: "11:00", endTime: "20:00", isPublished: true },
  { therapistId: tId3, storeId: storeId2, date: today, startTime: "12:00", endTime: "21:00", isPublished: true },
]);

console.log("Seeding customer levels...");
const existingLevels = await db.select().from(customerLevels);
if (existingLevels.length === 0) {
  await db.insert(customerLevels).values([
    { level: 1, name: "ブロンズ", minAmount: 0, badgeColor: "#CD7F32", benefits: "基本サービス" },
    { level: 2, name: "シルバー", minAmount: 10000, badgeColor: "#C0C0C0", benefits: "誕生日特典500円OFF" },
    { level: 3, name: "ゴールド", minAmount: 30000, badgeColor: "#FFD700", benefits: "指名料10%OFF" },
    { level: 4, name: "プラチナ", minAmount: 60000, badgeColor: "#E5E4E2", benefits: "指名料15%OFF+優先予約" },
    { level: 5, name: "ダイヤ", minAmount: 100000, badgeColor: "#B9F2FF", benefits: "指名料20%OFF+専用クーポン" },
    { level: 6, name: "ブラック", minAmount: 150000, badgeColor: "#1a1a1a", benefits: "指名料25%OFF+VIP優先" },
    { level: 7, name: "ロイヤル", minAmount: 220000, badgeColor: "#8B0000", benefits: "指名料30%OFF+限定指名可" },
    { level: 8, name: "エメラルド", minAmount: 300000, badgeColor: "#50C878", benefits: "指名料35%OFF+プレミアム" },
    { level: 9, name: "サファイア", minAmount: 400000, badgeColor: "#0F52BA", benefits: "指名料40%OFF+全特典" },
    { level: 10, name: "レジェンド", minAmount: 500000, badgeColor: "#9400D3", benefits: "指名料50%OFF+全特典+特別待遇" },
  ]);
}

console.log("Seed complete! storeId1:", storeId1, "storeId2:", storeId2);
await conn.end();
