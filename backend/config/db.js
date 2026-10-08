const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
// Also fallback to root .env if not found
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const isSslRequired =
  process.env.DB_SSL === 'true' ||
  process.env.MYSQL_SSL === 'true' ||
  (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')) ||
  String(process.env.DB_PORT) === '4000';

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT, 10) || 3306,
  user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
  password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
  database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_portal',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: true,
  enableKeepAlive: true,
  ssl: isSslRequired
    ? {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    : undefined
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
