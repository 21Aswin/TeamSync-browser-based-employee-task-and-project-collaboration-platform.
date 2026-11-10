require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { initSocket } = require('./src/realtime/socket');
const db = require('./src/config/db');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Verify DB connection then start listening
async function start() {
  try {
    const conn = await db.getConnection();
    console.log('[TEAMSYNC] MySQL Database connection established successfully.');
    conn.release();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` TeamSync Platform Server is running!`);
      console.log(` URL: http://0.0.0.0:${PORT}`);
      console.log(` REST API prefix: http://localhost:${PORT}/api/v1`);
      console.log(` Socket.IO enabled with server-side authorization`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[TEAMSYNC] Fatal Error starting server:', err);
    process.exit(1);
  }
}

start();

module.exports = { app, server, io };
