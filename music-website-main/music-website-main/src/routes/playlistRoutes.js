const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');

/**
 * GET /api/playlists?q=...
 * Search for playlist-related songs
 */
router.get('/', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });

    const songs = await musicService.searchSongs(q, 20);
    res.json({ success: true, data: { title: q, songs } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/playlists/:id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const song = await musicService.getSongById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
