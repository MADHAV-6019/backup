const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const importService = require('../services/importService');
const upload = multer({ dest: '/tmp/uploads/' });
router.post('/spotify', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Playlist URL is required' });
    }
    const result = await importService.importSpotifyPlaylist(url);
    res.json({
      success: true,
      playlistName: result.playlistName,
      totalTracks: result.totalTracks,
      songs: result.songs,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
router.post('/ytmusic', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Playlist URL is required' });
    }
    const result = await importService.importYTMusicPlaylist(url);
    res.json({
      success: true,
      playlistName: result.playlistName,
      totalTracks: result.totalTracks,
      songs: result.songs,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
router.post('/database', upload.single('dbFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Database file is required' });
    }

    const result = await importService.importDbFile(req.file.path, req.file.originalname);
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({
      success: true,
      playlistName: result.playlistName,
      totalTracks: result.totalTracks,
      songs: result.songs,
    });
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
