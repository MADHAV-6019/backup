
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  if (err.response) {
    const status = err.response.status;
    return res.status(status).json({
      success: false,
      error: `Upstream service error (${status})`,
      message: err.message,
    });
  }
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Music service unavailable',
      message: 'Music API (Python) is not running. Please start it on port 8000.',
    });
  }
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      error: 'Request timeout',
      message: 'The upstream service took too long to respond.',
    });
  }
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
