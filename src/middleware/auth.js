const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const { error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'teamsync_fallback_secret_key_32chars';

/**
 * Authentication Middleware
 * Checks Bearer Authorization header or Cookie
 * Verifies active user status from database on each request
 */
async function authenticate(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return error(res, 'Authentication token required.', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return error(res, 'Invalid or expired authentication token.', 401, 'TOKEN_EXPIRED');
    }

    // Verify user exists and is active in database
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.status, u.role_id, r.role_key, r.role_name,
              u.department_id, d.name AS department_name, d.code AS department_code, u.job_title
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      return error(res, 'User account not found.', 401, 'USER_NOT_FOUND');
    }

    const user = rows[0];
    if (user.status !== 'ACTIVE') {
      return error(res, 'Account is inactive or has been deactivated.', 401, 'ACCOUNT_INACTIVE');
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH_MIDDLEWARE_ERROR]', err);
    return error(res, 'Authentication verification error.', 500, 'AUTH_ERROR');
  }
}

/**
 * Role-Based Access Control Middleware
 * @param  {...string} roles (e.g. 'ADMIN', 'MANAGER')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return error(res, 'Authentication required.', 401, 'UNAUTHORIZED');
    }

    if (!roles.includes(req.user.role_key)) {
      return error(
        res,
        `Access denied. Role '${req.user.role_key}' is not authorized for this resource. Required: [${roles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

/**
 * Login Rate Limiter (Protects against brute-force attacks)
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Developer/test friendly, protects in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many failed login attempts from this IP. Please try again after 15 minutes.',
      details: []
    }
  }
});

module.exports = {
  authenticate,
  requireRole,
  loginRateLimiter,
  JWT_SECRET
};
