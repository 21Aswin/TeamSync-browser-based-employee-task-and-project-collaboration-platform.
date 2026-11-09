const authService = require('../services/authService');
const { success, error } = require('../utils/response');

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Set secure HTTP-only cookie if configured
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    return success(res, result, 200);
  } catch (err) {
    return error(
      res,
      err.message || 'Login failed.',
      err.statusCode || 500,
      err.code || 'AUTH_ERROR',
      err.details || []
    );
  }
}

async function logout(req, res) {
  res.clearCookie('token');
  return success(res, { message: 'Logged out successfully.' }, 200);
}

async function getCurrentUser(req, res) {
  return success(res, req.user, 200);
}

module.exports = {
  login,
  logout,
  getCurrentUser
};
