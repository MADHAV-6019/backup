const axios = require('axios');
const musicService = require('./musicService');

class StreamService {
  
  async streamSong(songId, req, res) {
    try {
      let mediaUrl = await musicService.getStreamUrl(songId);
      let upstreamResponse;

      try {
        upstreamResponse = await this._fetchUpstream(mediaUrl, req);
      } catch (fetchErr) {
        if (fetchErr.response && [403, 410].includes(fetchErr.response.status)) {
          console.warn(`[Stream] Stale URL for ${songId} (${fetchErr.response.status}), refreshing...`);
          musicService.invalidateStreamUrl(songId);
          mediaUrl = await musicService.getStreamUrl(songId);
          upstreamResponse = await this._fetchUpstream(mediaUrl, req);
        } else {
          throw fetchErr;
        }
      }

      ['content-type', 'content-length', 'content-range', 'accept-ranges'].forEach((h) => {
        if (upstreamResponse.headers[h]) res.setHeader(h, upstreamResponse.headers[h]);
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

      if (upstreamResponse.status === 206) {
        res.status(206);
      } else {
        if (!res.getHeader('content-type')) {
          res.setHeader('content-type', 'audio/mp4');
        }
        res.setHeader('accept-ranges', 'bytes');
        res.status(200);
      }

      // Pure passthrough — no disk caching
      upstreamResponse.data.pipe(res);

      upstreamResponse.data.on('error', (err) => {
        console.error('[Stream] Upstream error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
      });

    } catch (error) {
      console.error(`[Stream] Error for ${songId}:`, error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream song' });
      }
    }
  }

  
  async _fetchUpstream(mediaUrl, req) {
    const upstreamHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    return axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'stream',
      headers: upstreamHeaders,
      timeout: 30000,
    });
  }
}

module.exports = new StreamService();
