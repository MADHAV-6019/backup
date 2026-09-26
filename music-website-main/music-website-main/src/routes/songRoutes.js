const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');
const streamService = require('../services/streamService');

/**
 * GET /api/songs/search?q=...
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query "q" is required' });
    const results = await musicService.searchSongs(q);
    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/songs/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const song = await musicService.getSongById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/songs/:id/stream
 */
router.get('/:id/stream', async (req, res) => {
  await streamService.streamSong(req.params.id, req, res);
});

/**
 * GET /api/songs/:id/lyrics
 */
router.get('/:id/lyrics', async (_req, res) => {
  res.status(404).json({ error: 'Lyrics not available' });
});

module.exports = router;
