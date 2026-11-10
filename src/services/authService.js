const crypto = require('crypto');
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

async function register({ name, email, password, role_id, department_id, job_title }) {
  if (!name || !email || !password) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Name, email, and password are required.'
    };
  }

  if (password.length < 6) {
    throw {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Password must be at least 6 characters long.'
    };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Validate unique email
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
  if (existing.length > 0) {
    throw {
      statusCode: 400,
      code: 'DUPLICATE_EMAIL',
      message: `An account with email '${cleanEmail}' already exists.`
    };
  }

  // Default role to EMPLOYEE (id: 3) if not provided or if user attempts to register as ADMIN
  let assignedRoleId = 3;
  if (role_id) {
    const parsedRole = parseInt(role_id, 10);
    // Disallow public self-registration as ADMIN (id: 1)
    if (parsedRole === 1) {
      throw {
        statusCode: 403,
        code: 'FORBIDDEN_ROLE',
        message: 'Cannot self-register as Administrator.'
      };
    }
    if ([2, 3].includes(parsedRole)) {
      assignedRoleId = parsedRole;
    }
  }

  // Validate department exists if provided
  let assignedDeptId = null;
  if (department_id) {
    const [depts] = await db.query('SELECT id FROM departments WHERE id = ?', [department_id]);
    if (depts.length > 0) {
      assignedDeptId = depts[0].id;
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const [res] = await db.query(
    `INSERT INTO users (name, email, password_hash, role_id, department_id, job_title, status)
     VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [name.trim(), cleanEmail, passwordHash, assignedRoleId, assignedDeptId, job_title ? job_title.trim() : null]
  );

  const newUserId = res.insertId;

  // Retrieve created user
  const [userRows] = await db.query(
    `SELECT u.id, u.name, u.email, u.status, u.role_id, r.role_key, r.role_name,
            u.department_id, d.name AS department_name, d.code AS department_code, u.job_title
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [newUserId]
  );

  const newUser = userRows[0];

  const token = jwt.sign(
    {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role_key
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  return {
    token,
    user: newUser
  };
}

async function updateProfile(userId, { name, full_name, job_title }) {
  const updates = [];
  const params = [];
  const resolvedName = name || full_name;
  if (resolvedName && resolvedName.trim()) {
    updates.push('name = ?');
    params.push(resolvedName.trim());
  }
  if (job_title !== undefined) {
    updates.push('job_title = ?');
    params.push(job_title ? job_title.trim() : null);
  }
  if (updates.length > 0) {
    params.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  const [rows] = await db.query(
    `SELECT u.id, u.name, u.email, u.status, u.role_id, r.role_key, r.role_name,
            u.department_id, d.name AS department_name, d.code AS department_code, u.job_title
     FROM users u
     JOIN roles r ON u.role_id = r.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0];
}

async function changePassword(userId, { currentPassword, newPassword }) {
  if (!currentPassword || !newPassword) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Current password and new password are required.' };
  }
  if (newPassword.length < 6) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters.' };
  }

  const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) {
    throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
  }

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) {
    throw { statusCode: 400, code: 'INVALID_PASSWORD', message: 'Current password is incorrect.' };
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);
  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

  return { message: 'Password updated successfully.' };
}

async function forgotPassword(email) {
  if (!email || !email.trim()) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Email is required.' };
  }
  const cleanEmail = email.trim().toLowerCase();
  const [rows] = await db.query('SELECT id, name, email, status FROM users WHERE email = ?', [cleanEmail]);
  if (rows.length === 0) {
    throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'No account found with this email address.' };
  }
  const user = rows[0];
  if (user.status !== 'ACTIVE') {
    throw { statusCode: 403, code: 'ACCOUNT_INACTIVE', message: 'This account is deactivated. Please contact your administrator.' };
  }

  // Generate secure token (48 chars hex)
  const token = crypto.randomBytes(24).toString('hex');

  // Invalidate any previously unused tokens for this user
  await db.query('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL', [user.id]);

  await db.query(
    'INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
    [user.id, user.email, token]
  );

  return {
    message: 'Password reset token generated successfully.',
    token,
    email: user.email,
    name: user.name
  };
}

async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Token and new password are required.' };
  }
  if (newPassword.length < 6) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters.' };
  }

  const [rows] = await db.query(
    'SELECT id, user_id, email, used_at, IF(expires_at < NOW(), 1, 0) AS is_expired FROM password_resets WHERE token = ?',
    [token]
  );

  if (rows.length === 0) {
    throw { statusCode: 400, code: 'INVALID_TOKEN', message: 'Invalid password reset token.' };
  }

  const resetRecord = rows[0];
  if (resetRecord.used_at) {
    throw { statusCode: 400, code: 'TOKEN_ALREADY_USED', message: 'This password reset token has already been used.' };
  }

  if (resetRecord.is_expired) {
    throw { statusCode: 400, code: 'TOKEN_EXPIRED', message: 'Password reset token has expired. Please request a new one.' };
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRecord.user_id]);
  await db.query('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [resetRecord.id]);

  return {
    message: 'Password has been reset successfully. You can now sign in with your new password.'
  };
}

module.exports = {
  login,
  register,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
};
