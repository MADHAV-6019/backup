require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  pythonApiUrl: process.env.PYTHON_API_URL || 'http://localhost:8000',
  nodeEnv: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 200,
  },
};

module.exports = config;
