/**
 * electron-main.js — PhantomBeats
 *
 * Startup (all parallel — splash shows immediately):
 *   1. Paint splash screen
 *   2. require('./server.js')   → Express binds port 3000 in this process
 *   3. spawn uvicorn main:app   → Python FastAPI binds port 8000
 *   4. Poll both with waitForServer(); load UI when both are healthy
 *
 * Shutdown (any exit path — window close, Ctrl+C, crash):
 *   cleanup() is called exactly once → force-kills Python → destroys window
 */

'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path   = require('path');
const { spawn } = require('child_process');
const net    = require('net');
const fs     = require('fs');
const http   = require('http');
const dotenv = require('dotenv');

// ─── Ports ──────────────────────────────────────────────────

const DEFAULT_EXPRESS_PORT = 3000;
const DEFAULT_PYTHON_PORT  = 8000;
let expressPort = DEFAULT_EXPRESS_PORT;
let pythonPort  = DEFAULT_PYTHON_PORT;

// ─── Path resolution ────────────────────────────────────────

const isDev   = !app.isPackaged;
const appRoot = isDev
  ? __dirname
  : path.join(process.resourcesPath, 'app.asar');

const envPath = path.join(appRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('[Electron] Loaded .env from', envPath);
} else {
  console.warn('[Electron] No .env found at', envPath);
}

// python-api is in extraResources (outside asar so it stays executable)
const pythonApiDir = isDev
  ? path.join(__dirname, 'python-api')
  : path.join(process.resourcesPath, 'python-api');

// ─── Python executable ──────────────────────────────────────

function getPythonExecutable() {
  const candidates = [
    path.join(pythonApiDir, 'venv', 'Scripts', 'python.exe'), // Windows bundled venv
    path.join(pythonApiDir, 'venv', 'bin', 'python3'),         // macOS/Linux bundled venv
    path.join(pythonApiDir, 'venv', 'bin', 'python'),
  ];
  // On Windows, 'python' is the real exe; 'python3' is the MS Store alias (code 9009)
  if (process.platform === 'win32') {
    candidates.push('python', 'python3');
  } else {
    candidates.push('python3', 'python');
  }
  for (const p of candidates) {
    if (!path.isAbsolute(p)) return p;        // bare names go to PATH
    if (fs.existsSync(p))    return p;
  }
  return 'python';
}

// ─── State ──────────────────────────────────────────────────

let mainWindow    = null;
let pythonProcess = null;
let expressServer = null;
let isQuitting    = false;

// ─── Force-kill helper ───────────────────────────────────────
// Windows: taskkill /T /F kills the entire process tree
// POSIX:   negative PID = kill the whole process group

function forceKill(proc, label) {
  if (!proc) return;
  console.log(`[Electron] Killing ${label} (pid ${proc.pid})…`);
  try {
    if (process.platform === 'win32') {
      require('child_process').spawnSync('taskkill', ['/pid', String(proc.pid), '/T', '/F'], {
        stdio: 'ignore'
      });
    } else {
      process.kill(-proc.pid, 'SIGKILL');
    }
  } catch (_) {
    try { proc.kill('SIGKILL'); } catch (__) { /* already dead */ }
  }
}

// ─── Port helpers ───────────────────────────────────────────

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort, maxTries = 10) {
  for (let i = 0; i < maxTries; i += 1) {
    const port = startPort + i;
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found near ${startPort}`);
}

// ─── Health-check poller ─────────────────────────────────────

function waitForServer(port, label, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      if (isQuitting) return reject(new Error('App is quitting'));
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`${label} did not respond within ${timeoutMs / 1000}s`));
      }
      const req = http.get(`http://127.0.0.1:${port}/`, (res) => {
        res.resume();
        console.log(`[Electron] ✅ ${label} ready on :${port}`);
        resolve();
      });
      req.on('error', () => setTimeout(check, 400));
      req.setTimeout(2000, () => { req.destroy(); setTimeout(check, 400); });
    }
    check();
  });
}

// ─── Start Express (in-process) ──────────────────────────────

function startExpress() {
  console.log('[Electron] Starting Express server (in-process)…');

  // Inject env vars that server.js and config/index.js read
  process.env.PORT               = String(expressPort);
  process.env.NODE_ENV           = 'production';
  process.env.ELECTRON_RUN       = '1';
  process.env.DOTENV_CONFIG_PATH = envPath;
  process.env.PYTHON_API_DIR     = pythonApiDir;
  process.env.PYTHON_API_URL     = `http://127.0.0.1:${pythonPort}`;

  // require() is synchronous — Express starts binding immediately
  expressServer = require('./server.js');
  return waitForServer(expressPort, 'Express');
}

// ─── Start Python FastAPI ────────────────────────────────────

function startPython() {
  // ── Strategy 1: Bundled PyInstaller exe (production — works on ANY machine)
  const bundledExe = isDev
    ? path.join(__dirname, 'python-api-dist', 'python-api-server', 'python-api-server.exe')
    : path.join(process.resourcesPath, 'python-api-server', 'python-api-server.exe');

  const hasBundledExe = fs.existsSync(bundledExe);

  // ── Strategy 2: Fall back to system/venv Python (dev mode)
  const mainPy = path.join(pythonApiDir, 'main.py');
  const hasMainPy = fs.existsSync(mainPy);

  if (!hasBundledExe && !hasMainPy) {
    console.warn('[Electron] No Python backend found (neither bundled exe nor main.py) — skipping');
    return Promise.resolve();
  }

  try {
    if (hasBundledExe) {
      // Launch the self-contained PyInstaller bundle — no Python install needed
      console.log(`[Electron] Starting bundled Python API: ${bundledExe}`);
      pythonProcess = spawn(
        bundledExe,
        [],  // main.py is baked into the exe; we pass port via env
        {
          cwd: path.dirname(bundledExe),
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            UVICORN_HOST: '127.0.0.1',
            UVICORN_PORT: String(pythonPort),
          },
        }
      );
    } else {
      // Dev fallback: use venv or system Python + uvicorn
      const pyExe = getPythonExecutable();
      console.log(`[Electron] Starting Python FastAPI via ${pyExe}…`);
      pythonProcess = spawn(
        pyExe,
        [
          '-m', 'uvicorn',
          'main:app',
          '--host', '127.0.0.1',
          '--port', String(pythonPort),
          '--no-access-log',
        ],
        {
          cwd: pythonApiDir,
          detached: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        }
      );
    }

    pythonProcess.stdout.on('data', (d) =>
      process.stdout.write(`[Python] ${d}`)
    );
    pythonProcess.stderr.on('data', (d) =>
      process.stderr.write(`[Python] ${d}`)
    );
    pythonProcess.on('error', (err) => {
      console.warn(`[Electron] Python process error: ${err.message}`);
      pythonProcess = null;
    });
    pythonProcess.on('exit', (code, sig) => {
      if (!isQuitting) {
        console.warn(`[Electron] Python exited unexpectedly (code=${code} sig=${sig})`);
      }
      pythonProcess = null;
    });

    return waitForServer(pythonPort, 'Python FastAPI');
  } catch (err) {
    console.warn(`[Electron] Failed to spawn Python: ${err.message}`);
    return Promise.reject(new Error(`Python backend failed to start: ${err.message}`));
  }
}

// ─── Splash / error HTML ─────────────────────────────────────

function splashURL(msg = 'Initializing audio engine…') {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="background:#050508;color:#fff;font-family:Barlow,Inter,sans-serif;
  display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <h2 style="font-size:2rem;margin-bottom:12px;letter-spacing:-.02em">🎵 PhantomBeats</h2>
    <p style="color:#888;font-size:.9rem">${msg}</p>
  </div>
</body></html>`);
}

function errorURL(msg) {
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(`<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body style="background:#050508;color:#fff;font-family:sans-serif;
  display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center;max-width:460px;padding:2rem">
    <h1>⚠️ PhantomBeats</h1>
    <p style="margin-top:8px">Could not start a required service.</p>
    <pre style="margin-top:16px;color:#666;font-size:12px;white-space:pre-wrap">${msg}</pre>
    <p style="margin-top:16px;font-size:13px;color:#555">Close and reopen the app, or check the logs.</p>
  </div>
</body></html>`);
}

// ─── Create window ───────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,   // allow cross-origin image loading (Google CDN album art)
    },
    title: 'PhantomBeats',
    backgroundColor: '#050508',
    show: false,
    icon: isDev
      ? path.join(__dirname, 'build', 'icon.ico')
      : path.join(process.resourcesPath, 'app.asar', 'build', 'icon.ico'),
  });

  mainWindow.setMenuBarVisibility(false);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      cleanup();
    }
  });

  // ① Show splash instantly — user sees this while servers boot
  mainWindow.loadURL(splashURL());
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('console-message', (_e, _lvl, msg) =>
    console.log(`[Renderer] ${msg}`)
  );
  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) =>
    console.error(`[Electron] Page load failed: ${code} ${desc} — ${url}`)
  );

  // ② Boot Express + Python in parallel — Python failure is non-fatal
  try {
    expressPort = await findAvailablePort(DEFAULT_EXPRESS_PORT);
    pythonPort = await findAvailablePort(DEFAULT_PYTHON_PORT);
  } catch (err) {
    console.error('[Electron] Port allocation failed:', err.message);
    if (!isQuitting) mainWindow.loadURL(errorURL(err.message));
    return;
  }

  if (expressPort !== DEFAULT_EXPRESS_PORT) {
    console.warn(`[Electron] Express port ${DEFAULT_EXPRESS_PORT} in use, using ${expressPort}`);
  }
  if (pythonPort !== DEFAULT_PYTHON_PORT) {
    console.warn(`[Electron] Python port ${DEFAULT_PYTHON_PORT} in use, using ${pythonPort}`);
  }

  console.log('[Electron] Starting all services in parallel…');
  const [expressResult, pythonResult] = await Promise.allSettled([
    startExpress(),
    startPython(),
  ]);

  if (expressResult.status === 'rejected') {
    console.error('[Electron] Express failed:', expressResult.reason?.message);
    if (!isQuitting) mainWindow.loadURL(errorURL(expressResult.reason?.message));
    return;
  }

  if (pythonResult.status === 'rejected') {
    // Python failure is NON-FATAL — app launches without streaming/search
    console.warn('[Electron] ⚠ Python backend failed (non-fatal):', pythonResult.reason?.message);
    console.warn('[Electron] App will launch without music streaming. Python + pip packages (fastapi, uvicorn, ytmusicapi, yt-dlp) are required for full functionality.');
  } else {
    console.log('[Electron] ✅ Python backend ready');
  }

  console.log('[Electron] Loading UI…');
  if (!isQuitting) {
    await mainWindow.webContents.session.clearCache();
    mainWindow.loadURL(`http://127.0.0.1:${expressPort}`);
  }
}

// ─── Shutdown ────────────────────────────────────────────────
// Idempotent — safe to call from multiple handlers simultaneously.

function cleanup() {
  if (isQuitting) return;
  isQuitting = true;
  console.log('[Electron] Shutting down…');

  // Kill Python backend
  if (pythonProcess) {
    forceKill(pythonProcess, 'Python FastAPI');
    pythonProcess = null;
  }

  // Close Express HTTP server
  if (expressServer && typeof expressServer.close === 'function') {
    try { expressServer.close(); } catch (_) {}
  }

  // Destroy Electron window
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }

  // Force-exit to prevent dangling event-loop handles
  setTimeout(() => process.exit(0), 500);
}

// ─── App lifecycle ───────────────────────────────────────────

app.whenReady().then(() => {
  // Spoof UA so Google image CDN (lh3.googleusercontent.com) serves album art
  app.userAgentFallback =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/124.0.0.0 Safari/537.36';

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Cover every exit path — all three fire on different scenarios
app.on('window-all-closed', () => { cleanup(); app.quit(); });
app.on('before-quit',  cleanup);
app.on('will-quit',    cleanup);

// Terminal signals (Ctrl+C, systemd, Task Manager → End Process)
process.on('SIGINT',  () => { cleanup(); app.quit(); });
process.on('SIGTERM', () => { cleanup(); app.quit(); });

// Crash safety — don't leave zombie Python processes behind
process.on('uncaughtException', (err) => {
  console.error('[Electron] Uncaught exception:', err);
  cleanup();
  app.quit();
});
process.on('unhandledRejection', (reason) => {
  // Log but don't quit — these are often non-fatal (network errors, etc.)
  console.error('[Electron] Unhandled rejection:', reason);
});

// ─── IPC handlers ────────────────────────────────────────────

ipcMain.handle('download-song', async (_event, url, filename) => {
  try {
    const downloadDir = path.join(app.getPath('userData'), 'downloads');
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
    const dest = path.join(downloadDir, filename);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

    fs.writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
    return { success: true, path: dest };
  } catch (err) {
    console.error('[Download] Failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('list-downloads', async () => {
  try {
    const downloadDir = path.join(app.getPath('userData'), 'downloads');
    if (!fs.existsSync(downloadDir)) return [];
    return fs.readdirSync(downloadDir).map(f => ({
      name: f,
      path: path.join(downloadDir, f),
    }));
  } catch (err) {
    console.error('[Downloads] List failed:', err);
    return [];
  }
});
