const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'teamsync_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  timezone: '+00:00', // Strict UTC
  dateStrings: true
};

// Enable SSL if specified or if connecting to cloud database providers
if (process.env.DB_SSL === 'true' || (process.env.DB_HOST && !['localhost', '127.0.0.1', 'mysql'].includes(process.env.DB_HOST))) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
