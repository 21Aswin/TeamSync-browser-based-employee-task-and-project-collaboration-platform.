const db = require('../config/db');

async function getAllDepartments() {
  const [rows] = await db.query(
    `SELECT d.id, d.name, d.code, d.status, d.created_at,
            COUNT(u.id) AS employee_count
     FROM departments d
     LEFT JOIN users u ON u.department_id = d.id AND u.status = 'ACTIVE'
     GROUP BY d.id
     ORDER BY d.name ASC`
  );
  return rows;
}

async function createDepartment({ name, code, status = 'ACTIVE' }) {
  if (!name || !code) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Name and Code are required for a department.' };
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanName = name.trim();

  // Check unique code
  const [existing] = await db.query('SELECT id FROM departments WHERE code = ?', [cleanCode]);
  if (existing.length > 0) {
    throw {
      statusCode: 400,
      code: 'DUPLICATE_CODE',
      message: `Department with code '${cleanCode}' already exists.`
    };
  }

  const [result] = await db.query(
    'INSERT INTO departments (name, code, status) VALUES (?, ?, ?)',
    [cleanName, cleanCode, status]
  );

  return {
    id: result.insertId,
    name: cleanName,
    code: cleanCode,
    status
  };
}

async function updateDepartment(id, { name, code, status }) {
  const [existing] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
  if (existing.length === 0) {
    throw { statusCode: 404, code: 'NOT_FOUND', message: 'Department not found.' };
  }

  const updates = [];
  const params = [];

  if (name !== undefined && name.trim()) {
    updates.push('name = ?');
    params.push(name.trim());
  }

  if (code !== undefined && code.trim()) {
    const cleanCode = code.trim().toUpperCase();
    const [dup] = await db.query('SELECT id FROM departments WHERE code = ? AND id != ?', [cleanCode, id]);
    if (dup.length > 0) {
      throw { statusCode: 400, code: 'DUPLICATE_CODE', message: `Department code '${cleanCode}' is already in use.` };
    }
    updates.push('code = ?');
    params.push(cleanCode);
  }

  if (status !== undefined) {
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      throw { statusCode: 400, code: 'INVALID_STATUS', message: 'Status must be ACTIVE or INACTIVE.' };
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length > 0) {
    params.push(id);
    await db.query(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [updated] = await db.query('SELECT * FROM departments WHERE id = ?', [id]);
  return updated[0];
}

module.exports = {
  getAllDepartments,
  createDepartment,
  updateDepartment
};
