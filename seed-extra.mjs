import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }

// Parse mysql URL
const url = new URL(dbUrl);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const hash = await bcrypt.hash('password123', 12);

// Check if already added
const [existing] = await conn.execute("SELECT id FROM store_accounts WHERE email = 'store3@example.com' LIMIT 1");
if (existing.length > 0) {
  console.log('Extra demo data already exists');
  await conn.end();
  process.exit(0);
}

// Osaka store account
await conn.execute(
  "INSERT INTO store_accounts (email, passwordHash, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
  ['store3@example.com', hash]
);
const [storeAcc3] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const storeAccId3 = storeAcc3[0]['LAST_INSERT_ID()'];

await conn.execute(
  `INSERT INTO stores (accountId, name, description, address, prefecture, city, phone, access, openHours, closeHours, regularHoliday, isPublic, reviewAvg, reviewCount, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [storeAccId3, 'アロマサロン OSAKA', '大阪・梅田の高級メンズエステ。関西最高峰のリラクゼーションをご提供します。',
   '大阪府大阪市北区梅田　1-1-1 OSAKAビル8F', '大阪府', '大阪市北区', '06-1234-5678', '梅田駅徒歩3分',
   '11:00', '23:00', '不定休', 1, '4.75', 35]
);
const [store3] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const storeId3 = store3[0]['LAST_INSERT_ID()'];

// Osaka therapist
await conn.execute(
  "INSERT INTO therapist_accounts (email, passwordHash, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
  ['therapist4@example.com', hash]
);
const [tAcc4] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const tAccId4 = tAcc4[0]['LAST_INSERT_ID()'];

await conn.execute(
  `INSERT INTO therapists (accountId, storeId, displayName, age, height, bio, specialties, isPublic, affiliationStatus, nominationCount, reviewAvg, reviewCount, backRate, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [tAccId4, storeId3, 'ゆか', 25, 162, '大阪出身の元気なセラピストです。関西弁でアットホームな雰囲気でお迎えします。',
   'アロマオイルマッサージ, タイ古式', 1, 'approved', 67, '4.80', 20, '55.00']
);

// Nagoya store account
await conn.execute(
  "INSERT INTO store_accounts (email, passwordHash, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
  ['store4@example.com', hash]
);
const [storeAcc4] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const storeAccId4 = storeAcc4[0]['LAST_INSERT_ID()'];

await conn.execute(
  `INSERT INTO stores (accountId, name, description, address, prefecture, city, phone, access, openHours, closeHours, regularHoliday, isPublic, reviewAvg, reviewCount, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [storeAccId4, 'プレミアムエステ NAGOYA', '名古屋・栄の隠れ家的サロン。完全予約制で贅沢な時間をお過ごしください。',
   '愛知県名古屋市中区椄1-3-2-1 NAGOYAビル4F', '愛知県', '名古屋市中区', '052-123-4567', '栄駅徒歩5分',
   '12:00', '23:00', '火曜定休', 1, '4.65', 18]
);
const [store4] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const storeId4 = store4[0]['LAST_INSERT_ID()'];

// Nagoya therapist
await conn.execute(
  "INSERT INTO therapist_accounts (email, passwordHash, createdAt, updatedAt) VALUES (?, ?, NOW(), NOW())",
  ['therapist5@example.com', hash]
);
const [tAcc5] = await conn.execute("SELECT LAST_INSERT_ID() as id");
const tAccId5 = tAcc5[0]['LAST_INSERT_ID()'];

await conn.execute(
  `INSERT INTO therapists (accountId, storeId, displayName, age, height, bio, specialties, isPublic, affiliationStatus, nominationCount, reviewAvg, reviewCount, backRate, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
  [tAccId5, storeId4, 'なつき', 23, 159, '名古屋出身の癒し系セラピスト。丁寧な施術で疲れを取り除きます。',
   'スウェーディッシュマッサージ, ストレッチ', 1, 'approved', 32, '4.60', 12, '50.00']
);

// Menus for Osaka
await conn.execute(
  "INSERT INTO menus (storeId, name, description, durationMinutes, price, nominationFee, isPublic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
  [storeId3, '60分コース', '全身アロマオイルマッサージ', 60, 8500, 1000, 1]
);
await conn.execute(
  "INSERT INTO menus (storeId, name, description, durationMinutes, price, nominationFee, isPublic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
  [storeId3, '90分コース', '全身アロマ + ヘッドスパ', 90, 12500, 1500, 1]
);

// Menus for Nagoya
await conn.execute(
  "INSERT INTO menus (storeId, name, description, durationMinutes, price, nominationFee, isPublic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
  [storeId4, '60分コース', '全身アロマオイルマッサージ', 60, 7800, 1000, 1]
);
await conn.execute(
  "INSERT INTO menus (storeId, name, description, durationMinutes, price, nominationFee, isPublic, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
  [storeId4, '90分コース', '全身アロマ + ヘッドスパ', 90, 11500, 1500, 1]
);

await conn.end();
console.log('Extra demo data seeded successfully!');
console.log('- Osaka store (store3@example.com / password123)');
console.log('- Osaka therapist (therapist4@example.com / password123)');
console.log('- Nagoya store (store4@example.com / password123)');
console.log('- Nagoya therapist (therapist5@example.com / password123)');
