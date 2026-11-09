const express = require('express');
const router = express.Router();

const { authenticate, requireRole, loginRateLimiter } = require('../middleware/auth');
const authController = require('../controllers/authController');
const departmentController = require('../controllers/departmentController');
const userController = require('../controllers/userController');
const projectController = require('../controllers/projectController');
const taskController = require('../controllers/taskController');
const notificationController = require('../controllers/notificationController');
const dashboardController = require('../controllers/dashboardController');
const db = require('../config/db');
const { success } = require('../utils/response');

// Health Check
router.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    return success(res, { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(503).json({ error: { code: 'DB_UNAVAILABLE', message: 'Database connection failed.' } });
  }
});

// Auth Routes
router.post('/auth/login', loginRateLimiter, authController.login);
router.post('/auth/register', loginRateLimiter, authController.register);
router.post('/auth/logout', authenticate, authController.logout);
router.get('/auth/me', authenticate, authController.getCurrentUser);

// Department Routes
router.get('/departments', authenticate, departmentController.listDepartments);
router.post('/departments', authenticate, requireRole('ADMIN'), departmentController.createDepartment);

// User Routes
router.get('/users', authenticate, userController.listUsers);
router.post('/users', authenticate, requireRole('ADMIN'), userController.createUser);
router.get('/users/:id', authenticate, userController.getUser);
router.patch('/users/:id', authenticate, requireRole('ADMIN'), userController.updateUser);

// Project Routes
router.get('/projects', authenticate, projectController.listProjects);
router.post('/projects', authenticate, requireRole('ADMIN', 'MANAGER'), projectController.createProject);
router.get('/projects/:id', authenticate, projectController.getProject);
router.patch('/projects/:id', authenticate, requireRole('ADMIN', 'MANAGER'), projectController.updateProject);
router.post('/projects/:id/members', authenticate, requireRole('ADMIN', 'MANAGER'), projectController.addMember);
router.delete('/projects/:id/members/:userId', authenticate, requireRole('ADMIN', 'MANAGER'), projectController.removeMember);

// Task Routes
router.get('/tasks', authenticate, taskController.listTasks);
router.post('/projects/:id/tasks', authenticate, requireRole('ADMIN', 'MANAGER'), taskController.createTask);
router.get('/tasks/:id', authenticate, taskController.getTask);
router.patch('/tasks/:id/status', authenticate, taskController.updateTaskStatus);
router.post('/tasks/:id/comments', authenticate, taskController.addComment);

// Notification Routes
router.get('/notifications', authenticate, notificationController.listNotifications);
router.patch('/notifications/:id/read', authenticate, notificationController.markAsRead);
router.post('/notifications/read-all', authenticate, notificationController.markAllAsRead);

// Dashboard Routes
router.get('/dashboard/stats', authenticate, dashboardController.getStats);

module.exports = router;
