const db = require('../config/db');
const { validateStatusTransition } = require('../utils/statusRules');

// Realtime emitter hook (injected from socket module)
let ioEmitter = null;
function setRealtimeEmitter(emitter) {
  ioEmitter = emitter;
}

async function listTasks(user, { projectId, status, priority, assigneeId, assignedToMe, search, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'DESC' }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const where = [];
  const params = [];

  // Role Scoping
  if (user.role_key !== 'ADMIN') {
    if (assignedToMe === 'true' || assignedToMe === true) {
      where.push('ta.user_id = ?');
      params.push(user.id);
    } else {
      where.push(`(p.manager_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`);
      params.push(user.id, user.id);
    }
  } else if (assignedToMe === 'true' || assignedToMe === true) {
    where.push('ta.user_id = ?');
    params.push(user.id);
  }

  if (projectId) {
    where.push('t.project_id = ?');
    params.push(projectId);
  }

  if (status) {
    where.push('t.status = ?');
    params.push(status.toUpperCase());
  }

  if (priority) {
    where.push('t.priority = ?');
    params.push(priority.toUpperCase());
  }

  if (assigneeId) {
    where.push('ta.user_id = ?');
    params.push(assigneeId);
  }

  if (search) {
    where.push('(t.title LIKE ? OR t.description LIKE ? OR p.name LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Allowed sort columns
  const allowedSortCols = {
    created_at: 't.created_at',
    due_date: 't.due_date',
    priority: 't.priority',
    status: 't.status',
    title: 't.title'
  };
  const sortCol = allowedSortCols[sortBy] || 't.created_at';
  const order = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const [countRows] = await db.query(
    `SELECT COUNT(DISTINCT t.id) AS total
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await db.query(
    `SELECT t.id, t.project_id, p.name AS project_name, p.project_code,
            t.title, t.description, t.status, t.priority,
            t.start_date, t.due_date, t.created_at, t.updated_at,
            ta.user_id AS assignee_id, u_ass.name AS assignee_name, u_ass.email AS assignee_email,
            (SELECT COUNT(*) FROM task_comments tc WHERE tc.task_id = t.id) AS comment_count,
            CASE
              WHEN t.status != 'COMPLETED' AND t.due_date IS NOT NULL AND t.due_date < CURDATE() THEN 1
              ELSE 0
            END AS is_overdue
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     LEFT JOIN users u_ass ON ta.user_id = u_ass.id
     ${whereClause}
     ORDER BY ${sortCol} ${order}
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, offset]
  );

  return {
    tasks: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

async function getTaskById(user, taskId) {
  const [tRows] = await db.query(
    `SELECT t.id, t.project_id, p.name AS project_name, p.project_code, p.manager_id,
            t.title, t.description, t.status, t.priority,
            t.start_date, t.due_date, t.created_at, t.updated_at,
            t.created_by, u_creator.name AS creator_name,
            ta.user_id AS assignee_id, u_ass.name AS assignee_name, u_ass.email AS assignee_email,
            CASE
              WHEN t.status != 'COMPLETED' AND t.due_date IS NOT NULL AND t.due_date < CURDATE() THEN 1
              ELSE 0
            END AS is_overdue
     FROM tasks t
     JOIN projects p ON t.project_id = p.id
     JOIN users u_creator ON t.created_by = u_creator.id
     LEFT JOIN task_assignees ta ON ta.task_id = t.id
     LEFT JOIN users u_ass ON ta.user_id = u_ass.id
     WHERE t.id = ?`,
    [taskId]
  );

  if (tRows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found.' };
  }

  const task = tRows[0];

  // Access check: Admin or member of the project
  if (user.role_key !== 'ADMIN') {
    const isManager = task.manager_id === user.id;
    const isAssignee = task.assignee_id === user.id;
    const [pm] = await db.query(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
      [task.project_id, user.id]
    );

    if (!isManager && !isAssignee && pm.length === 0) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Task not found.' }; // Never leak private task
    }
  }

  // Fetch comments
  const [comments] = await db.query(
    `SELECT tc.id, tc.task_id, tc.body, tc.created_at,
            tc.user_id, u.name AS user_name, u.email AS user_email, r.role_name
     FROM task_comments tc
     JOIN users u ON tc.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     WHERE tc.task_id = ?
     ORDER BY tc.created_at ASC`,
    [taskId]
  );
  task.comments = comments;

  // Fetch task history
  const [history] = await db.query(
    `SELECT th.id, th.action, th.old_value, th.new_value, th.created_at,
            th.actor_id, u.name AS actor_name
     FROM task_history th
     JOIN users u ON th.actor_id = u.id
     WHERE th.task_id = ?
     ORDER BY th.created_at DESC`,
    [taskId]
  );
  task.history = history;

  return task;
}

async function createTask(user, projectId, { title, description, priority = 'MEDIUM', assigneeId, startDate, dueDate }) {
  if (!title || !title.trim()) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Task title is required.' };
  }

  // Validate dates
  if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Due date cannot precede start date.',
      details: [{ field: 'dueDate', message: 'Due date cannot precede start date.' }]
    };
  }

  // Check project exists
  const [pRows] = await db.query('SELECT id, name, manager_id FROM projects WHERE id = ?', [projectId]);
  if (pRows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Project not found.' };
  }
  const project = pRows[0];

  // Permissions: Admin or project manager
  if (user.role_key !== 'ADMIN' && project.manager_id !== user.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only project managers or administrators can create tasks in this project.' };
  }

  // Assignee must be active member of project
  let verifiedAssigneeId = null;
  if (assigneeId) {
    const [mRows] = await db.query(
      `SELECT pm.user_id
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ? AND pm.user_id = ? AND u.status = 'ACTIVE'`,
      [projectId, assigneeId]
    );

    if (mRows.length === 0) {
      throw {
        statusCode: 400,
        code: 'INVALID_ASSIGNEE',
        message: 'The selected assignee is not an active member of this project.'
      };
    }
    verifiedAssigneeId = parseInt(assigneeId, 10);
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const taskPriority = validPriorities.includes(String(priority).toUpperCase()) ? String(priority).toUpperCase() : 'MEDIUM';

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Insert task
    const [tRes] = await conn.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, created_by, start_date, due_date)
       VALUES (?, ?, ?, 'TODO', ?, ?, ?, ?)`,
      [projectId, title.trim(), description || null, taskPriority, user.id, startDate || null, dueDate || null]
    );
    const taskId = tRes.insertId;

    // 2. Insert assignee
    if (verifiedAssigneeId) {
      await conn.query(
        `INSERT INTO task_assignees (task_id, user_id, assigned_by) VALUES (?, ?, ?)`,
        [taskId, verifiedAssigneeId, user.id]
      );
    }

    // 3. Insert initial history
    await conn.query(
      `INSERT INTO task_history (task_id, actor_id, action, old_value, new_value)
       VALUES (?, ?, 'TASK_CREATED', NULL, 'TODO')`,
      [taskId, user.id]
    );

    // 4. Create notification for assignee
    let createdNotification = null;
    if (verifiedAssigneeId && verifiedAssigneeId !== user.id) {
      const [notifRes] = await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
         VALUES (?, 'TASK_ASSIGNED', 'New task assigned to you', ?, 'TASK', ?)`,
        [verifiedAssigneeId, `You were assigned task "${title.trim()}" in project ${project.name}`, taskId]
      );
      createdNotification = {
        id: notifRes.insertId,
        user_id: verifiedAssigneeId,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        body: `You were assigned task "${title.trim()}" in project ${project.name}`,
        reference_type: 'TASK',
        reference_id: taskId,
        read_at: null,
        created_at: new Date().toISOString()
      };
    }

    await conn.commit();

    const createdTask = await getTaskById(user, taskId);

    // Broadcast realtime events after DB commit
    if (ioEmitter) {
      ioEmitter.emitToProject(projectId, 'task:created', { task: createdTask });
      if (verifiedAssigneeId) {
        ioEmitter.emitToUser(verifiedAssigneeId, 'task:assigned', { task: createdTask });
        if (createdNotification) {
          ioEmitter.emitToUser(verifiedAssigneeId, 'notification:new', { notification: createdNotification });
        }
      }
    }

    return createdTask;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateTaskStatus(user, taskId, { status }) {
  if (!status) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Target status is required.' };
  }

  const targetStatus = String(status).toUpperCase();
  const validStatuses = ['TODO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'BLOCKED'];
  if (!validStatuses.includes(targetStatus)) {
    throw { statusCode: 400, code: 'INVALID_STATUS', message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const task = await getTaskById(user, taskId);

  // Permission verification:
  // Admin: full access
  // Manager: project manager
  // Employee: MUST be the assigned employee
  const isManager = user.role_key === 'MANAGER' && task.manager_id === user.id;
  const isAdmin = user.role_key === 'ADMIN';
  const isAssignee = task.assignee_id === user.id;

  if (!isAdmin && !isManager && !isAssignee) {
    throw {
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'You can only update status on tasks assigned to you.'
    };
  }

  // Centralized transition validation
  const transitionCheck = validateStatusTransition(task.status, targetStatus, user.role_key);
  if (!transitionCheck.valid) {
    throw {
      statusCode: 400,
      code: 'INVALID_STATUS_TRANSITION',
      message: transitionCheck.message
    };
  }

  if (task.status === targetStatus) {
    return task; // No-op
  }

  const oldStatus = task.status;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Update task status
    await conn.query('UPDATE tasks SET status = ? WHERE id = ?', [targetStatus, taskId]);

    // 2. Insert task history
    await conn.query(
      `INSERT INTO task_history (task_id, actor_id, action, old_value, new_value)
       VALUES (?, ?, 'STATUS_CHANGED', ?, ?)`,
      [taskId, user.id, oldStatus, targetStatus]
    );

    // 3. Notifications:
    // If employee moved it, notify the manager
    // If manager moved it, notify the assignee
    const notificationsToEmit = [];
    if (isAssignee && task.manager_id && task.manager_id !== user.id) {
      const notifMsg = `Task "${task.title}" was moved from ${oldStatus} to ${targetStatus} by ${user.name}.`;
      const [nRes] = await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
         VALUES (?, 'TASK_STATUS_CHANGED', 'Task Status Updated', ?, 'TASK', ?)`,
        [task.manager_id, notifMsg, taskId]
      );
      notificationsToEmit.push({
        id: nRes.insertId,
        user_id: task.manager_id,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task Status Updated',
        body: notifMsg,
        reference_type: 'TASK',
        reference_id: taskId,
        read_at: null,
        created_at: new Date().toISOString()
      });
    } else if ((isManager || isAdmin) && task.assignee_id && task.assignee_id !== user.id) {
      const notifMsg = `Your task "${task.title}" status was changed to ${targetStatus} by ${user.name}.`;
      const [nRes] = await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
         VALUES (?, 'TASK_STATUS_CHANGED', 'Task Review / Status Updated', ?, 'TASK', ?)`,
        [task.assignee_id, notifMsg, taskId]
      );
      notificationsToEmit.push({
        id: nRes.insertId,
        user_id: task.assignee_id,
        type: 'TASK_STATUS_CHANGED',
        title: 'Task Review / Status Updated',
        body: notifMsg,
        reference_type: 'TASK',
        reference_id: taskId,
        read_at: null,
        created_at: new Date().toISOString()
      });
    }

    await conn.commit();

    const updatedTask = await getTaskById(user, taskId);

    // Broadcast realtime event
    if (ioEmitter) {
      ioEmitter.emitToProject(task.project_id, 'task:status_changed', {
        taskId,
        projectId: task.project_id,
        oldStatus,
        newStatus: targetStatus,
        actor: { id: user.id, name: user.name, role: user.role_key },
        task: updatedTask
      });

      for (const notif of notificationsToEmit) {
        ioEmitter.emitToUser(notif.user_id, 'notification:new', { notification: notif });
      }
    }

    return updatedTask;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function addComment(user, taskId, body) {
  if (!body || !body.trim()) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Comment body cannot be empty.' };
  }

  const task = await getTaskById(user, taskId);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [cRes] = await conn.query(
      'INSERT INTO task_comments (task_id, user_id, body) VALUES (?, ?, ?)',
      [taskId, user.id, body.trim()]
    );
    const commentId = cRes.insertId;

    await conn.query(
      `INSERT INTO task_history (task_id, actor_id, action, old_value, new_value)
       VALUES (?, ?, 'COMMENT_ADDED', NULL, ?)`,
      [taskId, user.id, `Comment #${commentId}`]
    );

    // Notify assignee / manager if someone else commented
    const recipients = new Set();
    if (task.assignee_id && task.assignee_id !== user.id) recipients.add(task.assignee_id);
    if (task.manager_id && task.manager_id !== user.id) recipients.add(task.manager_id);

    const createdNotifications = [];
    for (const rId of recipients) {
      const notifMsg = `${user.name} commented on task "${task.title}": "${body.trim().substring(0, 60)}..."`;
      const [nRes] = await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
         VALUES (?, 'TASK_COMMENT', 'New task comment', ?, 'TASK', ?)`,
        [rId, notifMsg, taskId]
      );
      createdNotifications.push({
        id: nRes.insertId,
        user_id: rId,
        type: 'TASK_COMMENT',
        title: 'New task comment',
        body: notifMsg,
        reference_type: 'TASK',
        reference_id: taskId,
        read_at: null,
        created_at: new Date().toISOString()
      });
    }

    await conn.commit();

    const [newCommentRows] = await db.query(
      `SELECT tc.id, tc.task_id, tc.body, tc.created_at,
              tc.user_id, u.name AS user_name, u.email AS user_email, r.role_name
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       JOIN roles r ON u.role_id = r.id
       WHERE tc.id = ?`,
      [commentId]
    );
    const newComment = newCommentRows[0];

    // Real-time broadcast
    if (ioEmitter) {
      ioEmitter.emitToProject(task.project_id, 'task:comment_added', {
        taskId,
        comment: newComment
      });

      for (const notif of createdNotifications) {
        ioEmitter.emitToUser(notif.user_id, 'notification:new', { notification: notif });
      }
    }

    return newComment;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTaskStatus,
  addComment,
  setRealtimeEmitter
};
