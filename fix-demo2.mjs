import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Fix therapist storeIds: therapists 1,2 should belong to store 30001 (LUXE)
await conn.execute('UPDATE therapists SET storeId = 30001 WHERE id IN (1, 2)');
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

// Check therapist table columns
const [cols] = await conn.execute('DESCRIBE therapists');
console.log('Therapist columns:', cols.map(c => c.Field).join(', '));

await conn.end();
console.log('Done!');
