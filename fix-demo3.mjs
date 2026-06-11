import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Check rooms table columns
const [roomCols] = await conn.execute('DESCRIBE rooms');
console.log('Rooms columns:', roomCols.map(c => c.Field).join(', '));

const [ssCols] = await conn.execute('DESCRIBE therapist_salary_settings');
console.log('SalarySettings columns:', ssCols.map(c => c.Field).join(', '));

await conn.end();
