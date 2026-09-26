const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Rate limiter middleware
 * Limits each IP to a configurable number of requests per time window
 */
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests',
    message: `You have exceeded the rate limit. Please try again later.`,
  },
});

module.exports = limiter;
