const db = require('../config/db');

// Realtime emitter hook (injected from socket module)
let ioEmitter = null;
function setRealtimeEmitter(emitter) {
  ioEmitter = emitter;
}

async function listProjects(user, { search, status, page = 1, limit = 20 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const where = [];
  const params = [];

  // Scoping: Admin sees all; others see only projects they manage or are members of
  if (user.role_key !== 'ADMIN') {
    where.push(`(p.manager_id = ? OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = ?))`);
    params.push(user.id, user.id);
  }

  if (status) {
    where.push('p.status = ?');
    params.push(status.toUpperCase());
  }

  if (search) {
    where.push('(p.name LIKE ? OR p.project_code LIKE ? OR p.description LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows] = await db.query(
    `SELECT COUNT(DISTINCT p.id) AS total
     FROM projects p
     ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await db.query(
    `SELECT p.id, p.project_code, p.name, p.description, p.status,
            p.start_date, p.due_date, p.created_at, p.updated_at,
            p.manager_id, u_mgr.name AS manager_name, u_mgr.email AS manager_email,
            (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
            (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'COMPLETED') AS completed_task_count
     FROM projects p
     JOIN users u_mgr ON p.manager_id = u_mgr.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, offset]
  );

  return {
    projects: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

async function getProjectById(user, projectId) {
  // Check access: Admin or member or manager
  const [pRows] = await db.query(
    `SELECT p.id, p.project_code, p.name, p.description, p.status,
            p.start_date, p.due_date, p.created_at, p.updated_at,
            p.manager_id, u_mgr.name AS manager_name, u_mgr.email AS manager_email
     FROM projects p
     JOIN users u_mgr ON p.manager_id = u_mgr.id
     WHERE p.id = ?`,
    [projectId]
  );

  if (pRows.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Project not found.' };
  }

  const project = pRows[0];

  if (user.role_key !== 'ADMIN') {
    const isManager = project.manager_id === user.id;
    const [memberRows] = await db.query(
      'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, user.id]
    );

    if (!isManager && memberRows.length === 0) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Project not found.' }; // Never leak project existence to unauthorized callers
    }
  }

  // Fetch project members
  const [members] = await db.query(
    `SELECT u.id, u.name, u.email, u.job_title, u.status, r.role_key, r.role_name,
            d.name AS department_name, pm.joined_at
     FROM project_members pm
     JOIN users u ON pm.user_id = u.id
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE pm.project_id = ?
     ORDER BY pm.joined_at ASC`,
    [projectId]
  );

  project.members = members;
  return project;
}

async function createProject(user, { name, project_code, description, start_date, due_date, status = 'PLANNING', manager_id, member_ids = [] }) {
  if (!name || !project_code) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Project name and unique code are required.' };
  }

  const cleanCode = project_code.trim().toUpperCase();

  // Validate dates
  if (start_date && due_date && new Date(due_date) < new Date(start_date)) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Due date cannot precede start date.',
      details: [{ field: 'dueDate', message: 'Due date cannot precede start date.' }]
    };
  }

  // Determine manager
  let assignedManagerId = user.id;
  if (user.role_key === 'ADMIN') {
    assignedManagerId = manager_id || user.id;
  } else if (user.role_key === 'MANAGER') {
    assignedManagerId = user.id; // Manager can only create projects where they are the manager
  } else {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Employees cannot create projects.' };
  }

  // Verify manager is active
  const [mgrRows] = await db.query('SELECT id, status FROM users WHERE id = ?', [assignedManagerId]);
  if (mgrRows.length === 0 || mgrRows[0].status !== 'ACTIVE') {
    throw { statusCode: 400, code: 'INVALID_MANAGER', message: 'Assigned manager is not an active user.' };
  }

  // Check unique project code
  const [existingCode] = await db.query('SELECT id FROM projects WHERE project_code = ?', [cleanCode]);
  if (existingCode.length > 0) {
    throw { statusCode: 400, code: 'DUPLICATE_CODE', message: `Project code '${cleanCode}' is already in use.` };
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [projRes] = await conn.query(
      `INSERT INTO projects (project_code, name, description, manager_id, status, start_date, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanCode, name.trim(), description || null, assignedManagerId, status, start_date || null, due_date || null, user.id]
    );

    const projectId = projRes.insertId;

    // Automatically add manager to project members
    const initialMembers = new Set([assignedManagerId]);
    if (Array.isArray(member_ids)) {
      member_ids.forEach(id => initialMembers.add(parseInt(id, 10)));
    }

    const addedMembersToNotify = [];
    for (const memberId of initialMembers) {
      if (isNaN(memberId)) continue;
      // Verify member is active
      const [uRows] = await conn.query('SELECT id, status FROM users WHERE id = ?', [memberId]);
      if (uRows.length > 0 && uRows[0].status === 'ACTIVE') {
        await conn.query('INSERT IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)', [projectId, memberId]);
        if (memberId !== user.id) {
          const [nRes] = await conn.query(
            `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
             VALUES (?, 'PROJECT_ADDED', 'Assigned to New Project', ?, 'PROJECT', ?)`,
            [memberId, `You were added to project "${name.trim()}" (${cleanCode}) by ${user.name}.`, projectId]
          );
          addedMembersToNotify.push({
            id: nRes.insertId,
            user_id: memberId,
            type: 'PROJECT_ADDED',
            title: 'Assigned to New Project',
            body: `You were added to project "${name.trim()}" (${cleanCode}) by ${user.name}.`,
            reference_type: 'PROJECT',
            reference_id: projectId,
            read_at: null,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    await conn.commit();

    if (ioEmitter) {
      for (const notif of addedMembersToNotify) {
        ioEmitter.emitToUser(notif.user_id, 'notification:new', { notification: notif });
      }
    }

    return getProjectById(user, projectId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateProject(user, projectId, updateData) {
  const project = await getProjectById(user, projectId);

  // Permission check: Admin or assigned manager
  if (user.role_key !== 'ADMIN' && project.manager_id !== user.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only the project manager or an administrator can update this project.' };
  }

  const updates = [];
  const params = [];

  if (updateData.name !== undefined) {
    updates.push('name = ?');
    params.push(updateData.name.trim());
  }

  if (updateData.description !== undefined) {
    updates.push('description = ?');
    params.push(updateData.description);
  }

  if (updateData.status !== undefined) {
    const validStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];
    if (!validStatuses.includes(updateData.status.toUpperCase())) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Invalid project status.' };
    }
    updates.push('status = ?');
    params.push(updateData.status.toUpperCase());
  }

  if (updateData.start_date !== undefined) {
    updates.push('start_date = ?');
    params.push(updateData.start_date || null);
  }

  if (updateData.due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(updateData.due_date || null);
  }

  if (updateData.manager_id !== undefined && user.role_key === 'ADMIN') {
    const [mgrRows] = await db.query("SELECT id, status FROM users WHERE id = ? AND status = 'ACTIVE'", [updateData.manager_id]);
    if (mgrRows.length === 0) {
      throw { statusCode: 400, code: 'INVALID_MANAGER', message: 'Manager must be an active user.' };
    }
    updates.push('manager_id = ?');
    params.push(updateData.manager_id);
  }

  if (updates.length > 0) {
    params.push(projectId);
    await db.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return getProjectById(user, projectId);
}

async function addProjectMember(user, projectId, userId) {
  const project = await getProjectById(user, projectId);

  if (user.role_key !== 'ADMIN' && project.manager_id !== user.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only project manager or admin can add project members.' };
  }

  const [uRows] = await db.query('SELECT id, status FROM users WHERE id = ?', [userId]);
  if (uRows.length === 0 || uRows[0].status !== 'ACTIVE') {
    throw { statusCode: 400, code: 'INVALID_USER', message: 'User must be active to join a project.' };
  }

  await db.query(
    'INSERT INTO project_members (project_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE joined_at = joined_at',
    [projectId, userId]
  );

  // Notify member if not the actor
  if (parseInt(userId, 10) !== user.id) {
    const [nRes] = await db.query(
      `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id)
       VALUES (?, 'PROJECT_ADDED', 'Added to Project', ?, 'PROJECT', ?)`,
      [userId, `You were added as a team member to project "${project.name}" (${project.project_code}) by ${user.name}.`, projectId]
    );
    if (ioEmitter) {
      ioEmitter.emitToUser(userId, 'notification:new', {
        notification: {
          id: nRes.insertId,
          user_id: parseInt(userId, 10),
          type: 'PROJECT_ADDED',
          title: 'Added to Project',
          body: `You were added as a team member to project "${project.name}" (${project.project_code}) by ${user.name}.`,
          reference_type: 'PROJECT',
          reference_id: projectId,
          read_at: null,
          created_at: new Date().toISOString()
        }
      });
    }
  }

  return getProjectById(user, projectId);
}

async function removeProjectMember(user, projectId, userId) {
  const project = await getProjectById(user, projectId);

  if (user.role_key !== 'ADMIN' && project.manager_id !== user.id) {
    throw { statusCode: 403, code: 'FORBIDDEN', message: 'Only project manager or admin can remove project members.' };
  }

  // Prevent removing manager
  if (project.manager_id === parseInt(userId, 10)) {
    throw { statusCode: 400, code: 'INVALID_ACTION', message: 'Cannot remove the primary project manager.' };
  }

  await db.query('DELETE FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
  return getProjectById(user, projectId);
}

module.exports = {
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  setRealtimeEmitter
};
