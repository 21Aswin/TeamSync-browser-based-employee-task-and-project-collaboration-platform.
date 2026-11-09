const projectService = require('../services/projectService');
const { success, error } = require('../utils/response');

async function listProjects(req, res) {
  try {
    const { search, status, page, limit } = req.query;
    const result = await projectService.listProjects(req.user, { search, status, page, limit });
    return success(res, result.projects, 200, result.pagination);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function getProject(req, res) {
  try {
    const project = await projectService.getProjectById(req.user, req.params.id);
    return success(res, project);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function createProject(req, res) {
  try {
    const project = await projectService.createProject(req.user, req.body);
    return success(res, project, 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'VALIDATION_ERROR', err.details);
  }
}

async function updateProject(req, res) {
  try {
    const project = await projectService.updateProject(req.user, req.params.id, req.body);
    return success(res, project);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'UPDATE_ERROR');
  }
}

async function addMember(req, res) {
  try {
    const { userId } = req.body;
    const project = await projectService.addProjectMember(req.user, req.params.id, userId);
    return success(res, project);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'MEMBER_ERROR');
  }
}

async function removeMember(req, res) {
  try {
    const project = await projectService.removeProjectMember(req.user, req.params.id, req.params.userId);
    return success(res, project);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'MEMBER_ERROR');
  }
}

module.exports = {
  listProjects,
  getProject,
  createProject,
  updateProject,
  addMember,
  removeMember
};
