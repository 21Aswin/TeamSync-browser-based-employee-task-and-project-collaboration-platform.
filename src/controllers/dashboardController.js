const dashboardService = require('../services/dashboardService');
const { success, error } = require('../utils/response');

async function getStats(req, res) {
  try {
    const stats = await dashboardService.getDashboardStats(req.user);
    return success(res, stats);
  } catch (err) {
    return error(res, err.message, err.statusCode || 500, err.code || 'SERVER_ERROR');
  }
}

module.exports = {
  getStats
};
