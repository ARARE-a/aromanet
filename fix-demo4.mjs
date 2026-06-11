import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Add rooms for LUXE (30001) and BLANC (2)
await conn.execute(`INSERT IGNORE INTO rooms (storeId, name, description, capacity, isAvailable) VALUES 
  (30001, 'ルームA', 'スタンダードルーム', 1, 1),
  (30001, 'ルームB', 'プレミアムルーム', 1, 1),
  (30001, 'VIPルーム', 'VIP専用ルーム', 1, 1),
  (2, 'ルーム1', 'スタンダードルーム', 1, 1),
  (2, 'ルーム2', 'プレミアムルーム', 1, 1)`);
console.log('Added rooms');

// Add salary settings for therapists (backRate, nominationFee only)
await conn.execute(`INSERT IGNORE INTO therapist_salary_settings (therapistId, storeId, backRate, nominationFee) VALUES
  (1, 30001, 60, 2000),
  (2, 30001, 55, 1500),
  (3, 2, 60, 2000)`);
console.log('Added salary settings');

// Verify
const [rooms] = await conn.execute('SELECT id, storeId, name FROM rooms');
console.log('Rooms:', JSON.stringify(rooms));

await conn.end();
console.log('Done!');
