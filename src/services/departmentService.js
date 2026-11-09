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

module.exports = {
  getAllDepartments,
  createDepartment
};
