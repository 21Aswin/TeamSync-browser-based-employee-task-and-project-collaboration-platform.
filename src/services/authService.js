const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

async function login(email, password) {
  if (!email || !password) {
    throw { statusCode: 400, code: 'INVALID_INPUT', message: 'Email and password are required.' };
  }

  // Generic message on failure to prevent user enumeration
  const genericAuthError = {
    statusCode: 401,
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password.'
  };

  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.password_hash, u.status, u.role_id, r.role_key, r.role_name,
            u.department_id, d.name AS department_name, d.code AS department_code, u.job_title
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.email = ?`,
    [email.trim().toLowerCase()]
  );

  if (rows.length === 0) {
    throw genericAuthError;
  }

  const user = rows[0];

  if (user.status !== 'ACTIVE') {
    throw {
      statusCode: 403,
      code: 'ACCOUNT_INACTIVE',
      message: 'Account is deactivated. Please contact your system administrator.'
    };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw genericAuthError;
  }

  // Generate JWT token (24h expiry)
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role_key
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  // Return user info without password_hash
  const { password_hash, ...safeUser } = user;

  return {
    token,
    user: safeUser
  };
}

module.exports = {
  login
};
