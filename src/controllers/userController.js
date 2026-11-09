const userService = require('../services/userService');
const { success, error } = require('../utils/response');

async function listUsers(req, res) {
  try {
    const { role, departmentId, status, search, page, limit } = req.query;
    const result = await userService.listUsers({ role, departmentId, status, search, page, limit });
    return success(res, result.users, 200, result.pagination);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function getUser(req, res) {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return error(res, 'User not found', 404, 'NOT_FOUND');
    }
    return success(res, user);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    return success(res, user, 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'VALIDATION_ERROR');
  }
}

async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return success(res, user, 200);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'UPDATE_ERROR');
  }
}

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser
};
