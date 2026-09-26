/**
 * server.js — PhantomBeats Express server
 *
 * This file is require()'d directly by electron-main.js (in-process).
 * It must NOT call process.exit() and must NOT block the event loop.
 *
 * Structure:
 *   /           → serves the built frontend (dist/)
 *   /api/search → searchRoutes
 *   /api/songs  → songRoutes  (stream, lyrics, details)
 *   /api/home   → homeRoutes  (trending)
 *   /api/import → importRoutes
 *   /api/albums → albumRoutes
 *   /api/artists→ artistRoutes
 *   /api/playlists → playlistRoutes
 */

'use strict';

const path    = require('path');
const express = require('express');

const config        = require('./src/config');
const errorHandler  = require('./src/middleware/errorHandler');

// Routes
const searchRoutes   = require('./src/routes/searchRoutes');
const songRoutes     = require('./src/routes/songRoutes');
const homeRoutes     = require('./src/routes/homeRoutes');
const importRoutes   = require('./src/routes/importRoutes');
const albumRoutes    = require('./src/routes/albumRoutes');
const artistRoutes   = require('./src/routes/artistRoutes');
const playlistRoutes = require('./src/routes/playlistRoutes');


const app = express();

// ─── Security & parsing ─────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health / ping ───────────────────────────────────────────

app.get('/api', (_req, res) => res.json({ service: 'phantombeats', status: 'ok' }));
app.get('/ping', (_req, res) => res.json({ status: 'healthy' }));

// ─── API routes ──────────────────────────────────────────────

app.use('/api/search',   searchRoutes);
app.use('/api/songs',    songRoutes);
app.use('/api/home',     homeRoutes);
app.use('/api/import',   importRoutes);
app.use('/api/albums',   albumRoutes);
app.use('/api/artists',  artistRoutes);
app.use('/api/playlists', playlistRoutes);

// ─── Static frontend ─────────────────────────────────────────

const distDir = path.join(__dirname, 'dist');

const { existsSync } = require('fs');

if (existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: '0',
    etag: true,
    lastModified: true,
  }));

  // SPA catch-all — let the frontend router handle unknown paths
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  // Dev mode: no static build present — just tell the browser where to go
  app.get(/.*/, (_req, res) => {
    res.json({
      message: 'PhantomBeats API is running. Start the frontend dev server separately.',
      api: `http://localhost:${config.port}/api`,
    });
  });
}

// ─── Error handler (must be last) ────────────────────────────

app.use(errorHandler);

// ─── Start listening ─────────────────────────────────────────

const PORT = config.port;

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Server] Express listening on http://127.0.0.1:${PORT}`);
  console.log(`[Server] Python API proxy → ${config.pythonApiUrl}`);

  if (homeRoutes.warmUpTrending) homeRoutes.warmUpTrending();
});

// Surface bind errors clearly instead of swallowing them
server.on('error', (err) => {
  console.error('[Server] Failed to start:', err.message);
  // Don't call process.exit() — let Electron decide what to do
});

module.exports = server;
