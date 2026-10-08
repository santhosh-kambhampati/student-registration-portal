const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// Also fallback to root .env if not found
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_portal',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  testConnection
};
