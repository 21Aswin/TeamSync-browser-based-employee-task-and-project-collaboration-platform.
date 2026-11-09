const notificationService = require('../services/notificationService');
const { success, error } = require('../utils/response');

async function listNotifications(req, res) {
  try {
    const { unreadOnly, page, limit } = req.query;
    const result = await notificationService.listNotifications(req.user, { unreadOnly, page, limit });
    return success(res, result.notifications, 200, {
      unreadCount: result.unreadCount,
      ...result.pagination
    });
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function markAsRead(req, res) {
  try {
    const notification = await notificationService.markAsRead(req.user, req.params.id);
    return success(res, notification);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'NOTIFICATION_ERROR');
  }
}

async function markAllAsRead(req, res) {
  try {
    const result = await notificationService.markAllAsRead(req.user);
    return success(res, result);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
