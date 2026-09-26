const express = require('express');
const router = express.Router();
const musicService = require('../services/musicService');
const streamService = require('../services/streamService');


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


router.get('/:id', async (req, res, next) => {
  try {
    const song = await musicService.getSongById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json({ success: true, data: song });
  } catch (error) {
    next(error);
  }
});


router.get('/:id/stream', async (req, res) => {
  await streamService.streamSong(req.params.id, req, res);
});


router.get('/:id/lyrics', async (req, res, next) => {
  try {
    const lyrics = await musicService.getLyrics(req.params.id);
    if (!lyrics) return res.status(404).json({ error: 'Lyrics not available' });
    res.json({ success: true, data: lyrics });
  } catch (error) {
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return res.status(404).json({ error: 'Lyrics not available' });
    }
    next(error);
  }
});

module.exports = router;
