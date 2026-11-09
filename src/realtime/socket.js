const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { setRealtimeEmitter } = require('../services/taskService');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth && socket.handshake.auth.token;

      if (!token && socket.handshake.headers && socket.handshake.headers.cookie) {
        const cookieMatches = socket.handshake.headers.cookie.match(/token=([^;]+)/);
        if (cookieMatches) {
          token = cookieMatches[1];
        }
      }

      if (!token) {
        return next(new Error('AUTH_REQUIRED'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);

      const [rows] = await db.query(
        `SELECT u.id, u.name, u.email, u.status, r.role_key
         FROM users u
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = ?`,
        [decoded.userId]
      );

      if (rows.length === 0 || rows[0].status !== 'ACTIVE') {
        return next(new Error('USER_INACTIVE_OR_NOT_FOUND'));
      }

      socket.user = rows[0];
      next();
    } catch (err) {
      return next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    const userRoom = `user:${user.id}`;
    socket.join(userRoom);
    console.log(`[SOCKET] User connected: ${user.name} (ID: ${user.id}, Role: ${user.role_key}) joined room ${userRoom}`);

    // Join Project Room with server-side authorization check
    socket.on('project:join', async (data) => {
      try {
        const projectId = parseInt(data.projectId, 10);
        if (!projectId || isNaN(projectId)) {
          return socket.emit('error', { message: 'Invalid project ID' });
        }

        // Authorize project room join
        if (user.role_key === 'ADMIN') {
          socket.join(`project:${projectId}`);
          socket.emit('project:joined', { projectId });
          return;
        }

        const [pRows] = await db.query(
          `SELECT 1 FROM projects p
           WHERE p.id = ? AND (p.manager_id = ? OR EXISTS (
             SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?
           ))`,
          [projectId, user.id, user.id]
        );

        if (pRows.length > 0) {
          socket.join(`project:${projectId}`);
          socket.emit('project:joined', { projectId });
        } else {
          socket.emit('error', { message: 'Unauthorized: You are not a member of this project.' });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to join project room.' });
      }
    });

    socket.on('project:leave', (data) => {
      const projectId = parseInt(data.projectId, 10);
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[SOCKET] User disconnected: ${user.name} (ID: ${user.id})`);
    });
  });

  // Inject helper emitter into taskService
  setRealtimeEmitter({
    emitToProject: (projectId, event, payload) => {
      io.to(`project:${projectId}`).emit(event, payload);
    },
    emitToUser: (userId, event, payload) => {
      io.to(`user:${userId}`).emit(event, payload);
    },
    emitAll: (event, payload) => {
      io.emit(event, payload);
    }
  });

  return io;
}

module.exports = {
  initSocket
};
