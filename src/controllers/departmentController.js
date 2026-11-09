const departmentService = require('../services/departmentService');
const { success, error } = require('../utils/response');

async function listDepartments(req, res) {
  try {
    const departments = await departmentService.getAllDepartments();
    return success(res, departments);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function createDepartment(req, res) {
  try {
    const { name, code, status } = req.body;
    const department = await departmentService.createDepartment({ name, code, status });
    return success(res, department, 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'VALIDATION_ERROR');
  }
}

module.exports = {
  listDepartments,
  createDepartment
};
