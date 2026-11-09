const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('[MIGRATE] Connecting to MySQL server...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const dbName = process.env.DB_NAME || 'teamsync_db';
    console.log(`[MIGRATE] Ensuring database ${dbName} exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${dbName}\`;`);

    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('[MIGRATE] Executing schema.sql...');
    await connection.query(sql);

    console.log('[MIGRATE] Schema migrated successfully!');
  } catch (error) {
    console.error('[MIGRATE] Error running migrations:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().then(() => process.exit(0));
}

module.exports = migrate;
