require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,

  // Python FastAPI — the primary music backend
  pythonApiUrl: process.env.PYTHON_API_URL || 'http://localhost:8000',

  // These two were referenced in services but never defined → instant crash on startup.
  // They now fall back to the Python API (same service) so the app doesn't explode when
  // those services are constructed, even if you never call them.
  jiosaavnApiUrl: process.env.JIOSAAVN_API_URL || process.env.PYTHON_API_URL || 'http://localhost:8000',
  ytmusicApiUrl:  process.env.YTMUSIC_API_URL  || process.env.PYTHON_API_URL || 'http://localhost:8000',

  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = config;
