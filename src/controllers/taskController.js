const taskService = require('../services/taskService');
const { success, error } = require('../utils/response');

async function listTasks(req, res) {
  try {
    const { projectId, status, priority, assigneeId, assignedToMe, search, page, limit, sortBy, sortOrder } = req.query;
    const result = await taskService.listTasks(req.user, {
      projectId,
      status,
      priority,
      assigneeId,
      assignedToMe,
      search,
      page,
      limit,
      sortBy,
      sortOrder
    });
    return success(res, result.tasks, 200, result.pagination);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function getTask(req, res) {
  try {
    const task = await taskService.getTaskById(req.user, req.params.id);
    return success(res, task);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

async function createTask(req, res) {
  try {
    const projectId = req.params.id; // from /projects/:id/tasks
    const task = await taskService.createTask(req.user, projectId, req.body);
    return success(res, task, 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'VALIDATION_ERROR', err.details);
  }
}

async function updateTaskStatus(req, res) {
  try {
    const task = await taskService.updateTaskStatus(req.user, req.params.id, req.body);
    return success(res, task);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'TRANSITION_ERROR');
  }
}

async function addComment(req, res) {
  try {
    const comment = await taskService.addComment(req.user, req.params.id, req.body.body);
    return success(res, comment, 201);
  } catch (err) {
    return error(res, err.message, err.statusCode || 400, err.code || 'COMMENT_ERROR');
  }
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTaskStatus,
  addComment
};
