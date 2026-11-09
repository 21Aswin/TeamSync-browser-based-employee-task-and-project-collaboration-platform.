const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function listUsers({ role, departmentId, status, search, page = 1, limit = 50 }) {
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  const where = [];
  const params = [];

  if (role) {
    where.push('r.role_key = ?');
    params.push(role);
  }

  if (departmentId) {
    where.push('u.department_id = ?');
    params.push(departmentId);
  }

  if (status) {
    where.push('u.status = ?');
    params.push(status);
  }

  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  // Get total count
  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM users u
     JOIN roles r ON u.role_id = r.id
     ${whereClause}`,
    params
  );
  const total = countRows[0].total;

  // Get paginated users
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.status, u.role_id, r.role_key, r.role_name,
            u.department_id, d.name AS department_name, d.code AS department_code,
            u.job_title, u.created_at, u.updated_at
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, offset]
  );

  return {
    users: rows,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  };
}

async function getUserById(id) {
  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.status, u.role_id, r.role_key, r.role_name,
            u.department_id, d.name AS department_name, d.code AS department_code,
            u.job_title, u.created_at, u.updated_at
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function createUser({ name, email, password, role_id, department_id, job_title }) {
  if (!name || !email || !password || !role_id) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Name, email, password, and role are required.'
    };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate unique email
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length > 0) {
    throw {
      statusCode: 400,
      code: 'DUPLICATE_EMAIL',
      message: `User with email '${cleanEmail}' already exists.`
    };
  }

  // Validate role exists
  const [roles] = await db.query('SELECT id FROM roles WHERE id = ?', [role_id]);
  if (roles.length === 0) {
    throw {
      statusCode: 400,
      code: 'INVALID_ROLE',
      message: 'Selected role does not exist.'
    };
  }

  // Validate department exists if provided
  if (department_id) {
    const [depts] = await db.query('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (depts.length === 0) {
      throw {
        statusCode: 400,
        code: 'INVALID_DEPARTMENT',
        message: 'Selected department does not exist.'
      };
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [res] = await db.query(
    `INSERT INTO users (name, email, password_hash, role_id, department_id, job_title, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [name.trim(), cleanEmail, passwordHash, role_id, department_id || null, job_title || null]
  );

  return getUserById(res.insertId);
}

async function updateUser(id, { name, role_id, department_id, job_title, status, password }) {
  const user = await getUserById(id);
  if (!user) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found.' };
  }

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (role_id !== undefined) {
    const [roles] = await db.query('SELECT id FROM roles WHERE id = ?', [role_id]);
    if (roles.length === 0) {
      throw { statusCode: 400, code: 'INVALID_ROLE', message: 'Invalid role.' };
    }
    updates.push('role_id = ?');
    params.push(role_id);
  }

  if (department_id !== undefined) {
    if (department_id) {
      const [depts] = await db.query('SELECT id FROM departments WHERE id = ?', [department_id]);
      if (depts.length === 0) {
        throw { statusCode: 400, code: 'INVALID_DEPARTMENT', message: 'Invalid department.' };
      }
    }
    updates.push('department_id = ?');
    params.push(department_id || null);
  }

  if (job_title !== undefined) {
    updates.push('job_title = ?');
    params.push(job_title || null);
  }

  if (status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Status must be ACTIVE or INACTIVE.' };
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (updates.length > 0) {
    params.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return getUserById(id);
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser
};
