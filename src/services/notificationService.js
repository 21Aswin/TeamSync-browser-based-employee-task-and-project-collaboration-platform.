const db = require('../config/db');

async function listNotifications(user, { unreadOnly = false, page = 1, limit = 30 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const where = ['user_id = ?'];
  const params = [user.id];

  if (unreadOnly === 'true' || unreadOnly === true) {
    where.push('read_at IS NULL');
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM notifications ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [unreadRows] = await db.query(
    'SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [user.id]
  );
  const unreadCount = unreadRows[0].unread_count;

  const [rows] = await db.query(
    `SELECT id, user_id, type, title, body, reference_type, reference_id, read_at, created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, offset]
  );

  return {
    notifications: rows,
    unreadCount,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

async function markAsRead(user, notificationId) {
  const [rows] = await db.query('SELECT user_id, read_at FROM notifications WHERE id = ?', [notificationId]);
  if (rows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Notification not found.' };
  }

  // Security: only notification owner can mark as read
  if (rows[0].user_id !== user.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'You are not authorized to mark this notification.' };
  }

  await db.query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ?', [notificationId]);

  const [updated] = await db.query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
  return updated[0];
}

async function markAllAsRead(user) {
  await db.query('UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL', [user.id]);
  return { message: 'All notifications marked as read.' };
}

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};
