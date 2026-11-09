/**
 * Standard API Response Utilities
 */

function success(res, data, statusCode = 200, meta = null) {
  const body = { data };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

function error(res, message, statusCode = 400, code = 'BAD_REQUEST', details = []) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      details: Array.isArray(details) ? details : [details]
    }
  });
}

module.exports = {
  success,
  error
};
