import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { eq } from 'drizzle-orm';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Fix therapist storeIds: therapists 1,2 should belong to store 30001 (LUXE)
await conn.execute('UPDATE therapist_profiles SET storeId = 30001 WHERE id IN (1, 2)');
console.log('Fixed therapist storeIds for LUXE');

// Add rooms for LUXE
await conn.execute(`INSERT IGNORE INTO rooms (storeId, name, description, capacity, isActive) VALUES 
  (30001, 'ルームA', 'スタンダードルーム', 1, 1),
  (30001, 'ルームB', 'プレミアムルーム', 1, 1),
  (30001, 'VIPルーム', 'VIP専用ルーム', 1, 1),
  (2, 'ルーム1', 'スタンダードルーム', 1, 1),
  (2, 'ルーム2', 'プレミアムルーム', 1, 1)`);
console.log('Added rooms');

// Add salary settings for therapists
await conn.execute(`INSERT IGNORE INTO therapist_salary_settings (therapistId, storeId, backRate, nominationFee, extensionFee) VALUES
  (1, 30001, 60, 2000, 1500),
  (2, 30001, 55, 1500, 1000),
  (3, 2, 60, 2000, 1500)`);
console.log('Added salary settings');

// Add more therapists for BLANC (store 2)
const [existing] = await conn.execute('SELECT COUNT(*) as cnt FROM therapist_accounts WHERE email = "therapist4@example.com"');
if (existing[0].cnt === 0) {
  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.default.hash('password123', 10);
  const [r1] = await conn.execute(
    'INSERT INTO therapist_accounts (email, passwordHash, crashPasswordHash, isActive) VALUES (?, ?, ?, 1)',
    ['therapist4@example.com', hash, await bcrypt.default.hash('crash123', 10)]
  );
  const accId = r1.insertId;
  await conn.execute(
    'INSERT INTO therapist_profiles (accountId, displayName, storeId, prefecture, age, height, bodyType, isPublic) VALUES (?, ?, 2, "東京都", 24, 162, "スレンダー", 1)',
    [accId, '雫（しずく）']
  );
  console.log('Added therapist4 for BLANC');
}

await conn.end();
console.log('Done!');
