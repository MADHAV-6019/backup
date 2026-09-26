const axios = require('axios');
const config = require('../config');

function extractSpotifyPlaylistId(url) {
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}


async function importSpotifyPlaylist(url) {
  const playlistId = extractSpotifyPlaylistId(url);
  if (!playlistId) throw new Error('Invalid Spotify playlist URL');

  console.log(`[Spotify Import] Importing playlist ${playlistId}...`);

  const pythonApiUrl = config.pythonApiUrl || 'http://localhost:8000';

  try {
    const response = await axios.get(
      `${pythonApiUrl}/spotify/playlist/${playlistId}`,
      { timeout: 60000 } 
    );

    const data = response.data;
    const spotifyTracks = data.tracks || [];

    if (spotifyTracks.length === 0) {
      throw new Error('No tracks could be extracted from the playlist.');
    }

    console.log(
      `[Spotify Import] Got ${spotifyTracks.length} tracks from Spotify, matching to library...`
    );
    const matchedSongs = await matchTracksToLibrary(
      spotifyTracks.map((t) => ({
        title: t.title || '',
        artist: '', 
        album: '',
        duration: 0,
      }))
    );

    return {
      playlistName: data.title || 'Spotify Playlist',
      totalTracks: spotifyTracks.length,
      songs: matchedSongs,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error('Spotify playlist not found. Make sure the URL is correct.');
    }
    if (err.response?.status === 400) {
      throw new Error(
        err.response.data?.detail ||
          'Could not extract tracks. The playlist may be empty or private.'
      );
    }
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        'Music service is not running. Please wait a moment and try again.'
      );
    }
    throw new Error(`Failed to import Spotify playlist: ${err.message}`);
  }
}

function extractYTMusicPlaylistId(url) {
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

async function importYTMusicPlaylist(url) {
  const playlistId = extractYTMusicPlaylistId(url);
  if (!playlistId) throw new Error('Invalid YouTube Music playlist URL');

  console.log(`[YTMusic Import] Importing playlist ${playlistId}...`);

  const pythonApiUrl = config.pythonApiUrl || 'http://localhost:8000';

  try {
    const response = await axios.get(
      `${pythonApiUrl}/playlist/${playlistId}`,
      { timeout: 30000 }
    );

    const data = response.data;
    const songs = Array.isArray(data.tracks) ? data.tracks : [];

    return {
      playlistName: data.title || 'YouTube Music Playlist',
      totalTracks: songs.length,
      songs,
    };
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error('Playlist not found. Make sure it is public.');
    }
    if (err.code === 'ECONNREFUSED') {
      throw new Error(
        'Music service is not running. Please wait a moment and try again.'
      );
    }
    throw new Error(`Failed to fetch YT Music playlist: ${err.message}`);
  }
}

const musicService = require('./musicService');

async function matchTracksToLibrary(tracks) {
  const matched = [];
  const batchSize = 5;

  for (let i = 0; i < tracks.length; i += batchSize) {
    const batch = tracks.slice(i, i + batchSize);
    const promises = batch.map(async (track) => {
      try {
        const query = `${track.title} ${track.artist}`.trim();
        const results = await musicService.searchSongs(query, 3);
        if (results && results.length > 0) {
          return results[0];
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    results.forEach((r) => {
      if (r) matched.push(r);
    });

    if (i + batchSize < tracks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return matched;
}

const initSqlJs = require('sql.js');
const fs = require('fs');

async function importDbFile(filePath, originalName = 'Imported Database') {
  console.log(`[DB Import] Parsing uploaded database file: ${originalName}`);
  let db;
  let tracks = [];

  try {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(filePath);
    db = new SQL.Database(fileBuffer);

    const tablesResult = db.exec(`SELECT name FROM sqlite_master WHERE type='table'`);
    if (!tablesResult.length || !tablesResult[0].values.length) {
      throw new Error('Could not find any tables in the database.');
    }

    const tableNames = tablesResult[0].values.map(row => row[0].toLowerCase());
    const possibleTables = tableNames.filter(n => n.includes('song') || n.includes('track'));

    if (possibleTables.length === 0) {
      throw new Error('Could not find any tables containing song data in the database.');
    }

    const keywordsTitle = ['title', 'name', 'song_name'];
    const keywordsArtist = ['artist', 'author', 'singer', 'artist_name', 'artisttext'];
    let foundTracks = [];

    for (const table of possibleTables) {
      const colsResult = db.exec(`PRAGMA table_info("${table}")`);
      if (!colsResult.length) continue;
      const colNames = colsResult[0].values.map(row => row[1].toLowerCase());

      const titleColIdx = colNames.findIndex(c => keywordsTitle.some(k => c.includes(k) || c === k));
      const artistColIdx = colNames.findIndex(c => keywordsArtist.some(k => c.includes(k) || c === k));

      if (titleColIdx === -1) continue;

      const rowsResult = db.exec(`SELECT * FROM "${table}" LIMIT 3000`);
      if (!rowsResult.length) continue;

      for (const row of rowsResult[0].values) {
        const title = String(row[titleColIdx] || '').trim();
        const artist = artistColIdx !== -1 ? String(row[artistColIdx] || '').trim() : '';
        if (title) foundTracks.push({ title, artist, album: '', duration: 0 });
      }

      if (foundTracks.length > 0) {
        console.log(`[DB Import] Found ${foundTracks.length} tracks in table '${table}'`);
        break;
      }
    }

    if (foundTracks.length === 0) {
      throw new Error('Found table but could not extract valid song titles.');
    }

    const uniqueTracksStr = new Set();
    tracks = foundTracks.filter(t => {
      const key = `${t.title}::${t.artist}`.toLowerCase();
      if (uniqueTracksStr.has(key)) return false;
      uniqueTracksStr.add(key);
      return true;
    });

  } catch (err) {
    if (db) db.close();
    throw new Error(`Failed to parse database file: ${err.message}`);
  }

  if (db) db.close();

  console.log(`[DB Import] Extracted ${tracks.length} unique tracks. Matching to library...`);
  const limit = 200;
  const tracksToProcess = tracks.slice(0, limit);

  const matchedSongs = await matchTracksToLibrary(tracksToProcess);
  const safeName = originalName.replace(/\.[^/.]+$/, "") || 'Database Import';

  return {
    playlistName: safeName,
    totalTracks: tracks.length,
    songs: matchedSongs,
  };
}

module.exports = {
  importSpotifyPlaylist,
  importYTMusicPlaylist,
  importDbFile,
};
