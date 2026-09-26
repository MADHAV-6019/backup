/**
 * Global error handling middleware
 * Catches all errors thrown in route handlers and sends a clean JSON response
 */
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Axios errors from upstream services
  if (err.response) {
    const status = err.response.status;
    return res.status(status).json({
      success: false,
      error: `Upstream service error (${status})`,
      message: err.message,
    });
  }

  // Connection errors (JioSaavn API not running)
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Music service unavailable',
      message: 'JioSaavn API is not running. Please start it on port 8000.',
    });
  }

  // Timeout errors
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({
      success: false,
      error: 'Request timeout',
      message: 'The upstream service took too long to respond.',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}

module.exports = errorHandler;
