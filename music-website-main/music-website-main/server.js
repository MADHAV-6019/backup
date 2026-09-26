const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const config = require('./src/config');
const errorHandler = require('./src/middleware/errorHandler');
const rateLimiter = require('./src/middleware/rateLimiter');

// Route imports
const searchRoutes = require('./src/routes/searchRoutes');
const songRoutes = require('./src/routes/songRoutes');
const albumRoutes = require('./src/routes/albumRoutes');
const playlistRoutes = require('./src/routes/playlistRoutes');
const artistRoutes = require('./src/routes/artistRoutes');
const homeRoutes = require('./src/routes/homeRoutes');

const app = express();

// ─── Python Environment Setup ──────────────────────────────────
const PYTHON_API_DIR = path.join(__dirname, 'python-api');
const isWin = process.platform === 'win32';
const VENV_DIR = path.join(PYTHON_API_DIR, 'venv');
const VENV_PYTHON = isWin
  ? path.join(VENV_DIR, 'Scripts', 'python.exe')
  : path.join(VENV_DIR, 'bin', 'python3');
const VENV_PIP = isWin
  ? path.join(VENV_DIR, 'Scripts', 'pip.exe')
  : path.join(VENV_DIR, 'bin', 'pip3');

/**
 * Ensure Python venv exists with all dependencies installed.
 * Creates a virtual environment automatically on first run.
 */
function ensurePythonEnv() {
  const venvReadyMarker = path.join(VENV_DIR, '.installed');
  // Check if venv python and packages are fully installed
  if (fs.existsSync(venvReadyMarker)) {
    console.log('[Python] Virtual environment ready ✅');
    return true;
  }

  console.log('[Python] Setting up virtual environment (this may take a minute)...');

  try {
    // If incomplete venv exists, remove it
    if (fs.existsSync(VENV_DIR)) {
      console.log('[Python] Cleaning up incomplete virtual environment...');
      fs.rmSync(VENV_DIR, { recursive: true, force: true });
    }

    // Find system python
    const pyCmd = isWin ? 'python' : 'python3';

    console.log(`[Python] Creating fresh virtual environment using ${pyCmd}...`);
    execSync(`${pyCmd} -m venv ${VENV_DIR}`, { cwd: PYTHON_API_DIR, stdio: 'inherit' });

    // Install dependencies
    const reqFile = path.join(PYTHON_API_DIR, 'requirements.txt');
    if (fs.existsSync(reqFile)) {
      console.log('[Python] Installing dependencies...');
      // Use python -m pip instead of pip binary (more reliable on Linux)
      execSync(`"${VENV_PYTHON}" -m pip install -r requirements.txt`, { cwd: PYTHON_API_DIR, stdio: 'inherit' });
    }

    fs.writeFileSync(venvReadyMarker, 'done');
    console.log('[Python] Setup complete ✅');
    return true;
  } catch (err) {
    console.error(`[Python] Setup failed: ${err.message}`);
    console.error('[Python] Please install python3-venv and python3-pip manually if they are missing:');
    console.error('  sudo apt install python3-venv python3-pip');
    console.error(`[Python] Or manually run:`);
    console.error(`  cd python-api && python3 -m venv venv && venv/bin/python3 -m pip install -r requirements.txt`);
    return false;
  }
}

// ─── Auto-Spawn Python API ────────────────────────────────────
let pythonProcess = null;

function startPythonApi() {
  if (!ensurePythonEnv()) {
    console.error('[Python] Cannot start — environment setup failed.');
    return;
  }

  console.log('[Python] Starting Music API on port 8000...');

  pythonProcess = spawn(
    VENV_PYTHON,
    ['-m', 'uvicorn', 'main:app', '--port', '8000', '--host', '0.0.0.0'],
    {
      cwd: PYTHON_API_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    }
  );

  pythonProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Python] ${msg}`);
  });

  pythonProcess.on('error', (err) => {
    console.error(`[Python] Failed to start: ${err.message}`);
  });

  pythonProcess.on('exit', (code) => {
    console.log(`[Python] Process exited with code ${code}`);
    if (code !== null && code !== 0) {
      console.log('[Python] Restarting in 3 seconds...');
      setTimeout(startPythonApi, 3000);
    }
  });
}

// ─── Graceful Shutdown ─────────────────────────────────────────
function cleanup() {
  if (pythonProcess) {
    console.log('[Python] Shutting down...');
    pythonProcess.kill();
    pythonProcess = null;
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => { if (pythonProcess) pythonProcess.kill(); });

// ─── Middleware ─────────────────────────────────────────────────
app.use(cors(config.cors));
app.use(express.json());
app.use(rateLimiter);

// ─── Serve Built Frontend ──────────────────────────────────────
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/search', searchRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/home', homeRoutes);

// ─── Health Check ──────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const musicService = require('./src/services/musicService');
  const health = await musicService.ping();

  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      express: 'running',
      python: pythonProcess ? 'running' : 'stopped',
      music_api: health.status || 'unknown',
    },
  });
});

// ─── SPA Fallback ──────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// ─── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// ─── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ─────────────────────────────────────────────────────
app.listen(config.port, () => {
  startPythonApi();
  console.log(`
╔══════════════════════════════════════════════════════╗
║         🎵  Music Streaming Server  🎵               ║
╠══════════════════════════════════════════════════════╣
║  Server:   http://localhost:${config.port}                   ║
║  Python:   http://localhost:8000 (auto-spawned)      ║
║  Frontend: Served from ./dist                        ║
╠══════════════════════════════════════════════════════╣
║  Single command: npm start                           ║
║  Open: http://localhost:${config.port}                       ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
