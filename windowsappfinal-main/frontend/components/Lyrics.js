import { getSongLyrics } from '../services/api.js';
import player from '../services/playerEngine.js';
import { icons } from '../utils/helpers.js';



let _lyricsVisible = false;
let _currentSongId = null;
let _parsedLines = [];     
let _plainLines = [];      
let _isSynced = false;
let _activeLineIdx = -1;
let _lyricsContainer = null;
let _onVisibilityChange = null;
let _isLoading = false;
let _hasError = false;
let _typewriterTimeout = null;
function _parseSyncedLyrics(syncedText) {
  if (!syncedText) return [];
  const lines = syncedText.split('\n');
  const parsed = [];
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\]\s?(.*)/);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = mins * 60 + secs + ms / 1000;
      const text = match[4].trim();
      parsed.push({ time, text });
    }
  }
  return parsed;
}
async function _fetchLyrics(songId) {
  _isLoading = true;
  _hasError = false;
  _parsedLines = [];
  _plainLines = [];
  _isSynced = false;
  _activeLineIdx = -1;
  _renderContent();

  try {
    const data = await getSongLyrics(songId);
    if (!data) {
      _hasError = true;
      _isLoading = false;
      _renderContent();
      return;
    }

    if (data.syncedLyrics) {
      _parsedLines = _parseSyncedLyrics(data.syncedLyrics);
      _isSynced = _parsedLines.length > 0;
    }

    if (!_isSynced && data.plainLyrics) {
      _plainLines = data.plainLyrics
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
    }

    if (_parsedLines.length === 0 && _plainLines.length === 0) {
      _hasError = true;
    }
  } catch (err) {
    console.warn('[Lyrics] Fetch error:', err.message);
    _hasError = true;
  }

  _isLoading = false;
  _renderContent();
}
function _renderContent() {
  if (!_lyricsContainer) return;
  const content = _lyricsContainer.querySelector('.lyrics-content');
  if (!content) return;

  if (_isLoading) {
    content.innerHTML = `
      <div class="lyrics-loading">
        <div class="lyrics-loading-dots">
          <span></span><span></span><span></span>
        </div>
        <p>Finding lyrics…</p>
      </div>
    `;
    return;
  }

  if (_hasError || (_parsedLines.length === 0 && _plainLines.length === 0)) {
    content.innerHTML = `
      <div class="lyrics-empty">
        <div class="lyrics-empty-icon">${icons.music}</div>
        <p>No lyrics available</p>
        <span>Lyrics aren't available for this song yet</span>
      </div>
    `;
    return;
  }

  if (_isSynced) {
    content.innerHTML = _parsedLines.map((line, i) => {
      const isEmpty = !line.text;
      return `<div class="lyrics-line ${isEmpty ? 'lyrics-line-gap' : ''}" data-idx="${i}">
        <span class="lyrics-line-text">${line.text || '♪'}</span>
      </div>`;
    }).join('');
    _syncActiveLine(player.audio?.currentTime || 0);
  } else {
    content.innerHTML = _plainLines.map((line, i) =>
      `<div class="lyrics-line lyrics-line-plain" data-idx="${i}">
        <span class="lyrics-line-text">${line}</span>
      </div>`
    ).join('');
  }
}
function _syncActiveLine(currentTime) {
  if (!_isSynced || _parsedLines.length === 0 || !_lyricsContainer) return;

  let newIdx = -1;
  for (let i = _parsedLines.length - 1; i >= 0; i--) {
    const lineTime = _parsedLines[i].time;
    if (currentTime >= lineTime - 0.15) {
      const nextTime = i < _parsedLines.length - 1 ? _parsedLines[i + 1].time : (player.audio?.duration || Infinity);
      if (currentTime > lineTime + 7 && nextTime - currentTime > 3) {
        newIdx = -1; 
      } else {
        newIdx = i;
      }
      break;
    }
  }

  if (newIdx === _activeLineIdx) return;
  
  const content = _lyricsContainer.querySelector('.lyrics-content');
  if (!content) return;
  const allLines = content.querySelectorAll('.lyrics-line');
  const timeElapsedMs = newIdx >= 0 ? (currentTime - _parsedLines[newIdx].time) * 1000 : 0;
  const prevIdx = _activeLineIdx;
  if (_activeLineIdx >= 0) {
      const prevLine = allLines[_activeLineIdx];
      if (prevLine) {
          const textTarget = _parsedLines[_activeLineIdx].text || '♪';
          prevLine.querySelector('.lyrics-line-text').innerHTML = escapeHtml(textTarget);
      }
      if (_typewriterTimeout) {
          clearTimeout(_typewriterTimeout);
          _typewriterTimeout = null;
      }
  }

  _activeLineIdx = newIdx;
  let trueIdx = -1;
  for (let j = _parsedLines.length - 1; j >= 0; j--) {
      if (currentTime >= _parsedLines[j].time - 0.15) {
          trueIdx = j;
          break;
      }
  }

  allLines.forEach((el, i) => {
    el.classList.toggle('active', i === newIdx);
    const isPast = newIdx === -1 ? i <= trueIdx : i < newIdx;
    el.classList.toggle('past', isPast);
    
    if (isPast) {
        el.querySelector('.lyrics-line-text').innerHTML = escapeHtml(_parsedLines[i].text || '♪');
    }
  });
  function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  if (newIdx >= 0) {
    const activeLine = allLines[newIdx];
    const textTarget = _parsedLines[newIdx].text || '♪';
    const textEl = activeLine.querySelector('.lyrics-line-text');
    textEl.innerHTML = '<span class="lyrics-cursor"></span>';
    const typeSpeed = Math.min(40, 1500 / Math.max(textTarget.length, 1)); 
    let typeIdx = Math.max(0, Math.floor(timeElapsedMs / typeSpeed));
    if (typeIdx > textTarget.length) typeIdx = textTarget.length;

    function typeChar() {
        if (typeIdx < textTarget.length) {
            const updatedText = escapeHtml(textTarget.substring(0, typeIdx + 1));
            textEl.innerHTML = `${updatedText}<span class="lyrics-cursor"></span>`;
            typeIdx++;
            _typewriterTimeout = setTimeout(typeChar, typeSpeed);
        } else {
            textEl.innerHTML = `${escapeHtml(textTarget)}<span class="lyrics-cursor"></span>`;
        }
    }
    if (typeIdx >= textTarget.length) {
        textEl.innerHTML = `${escapeHtml(textTarget)}<span class="lyrics-cursor"></span>`;
    } else {
        typeChar();
    }
  }
  const scrollLineTarget = newIdx >= 0 ? allLines[newIdx] : (trueIdx >= 0 ? allLines[trueIdx] : null);
  if (scrollLineTarget) {
    const jumpDistance = newIdx >= 0 ? Math.abs(newIdx - prevIdx) : Math.abs(trueIdx - prevIdx);
    scrollLineTarget.scrollIntoView({
      behavior: jumpDistance > 1 ? 'auto' : 'smooth',
      block: 'center',
    });
  }
}
function _onTimeUpdate({ currentTime }) {
  if (!_lyricsVisible || !_isSynced) return;
  _syncActiveLine(currentTime);
}
function _onSongChange({ song }) {
  if (!_lyricsVisible) {
    _currentSongId = null;
    return;
  }
  if (song && song.id !== _currentSongId) {
    _currentSongId = song.id;
    _fetchLyrics(song.id);
  }
}

export function initLyrics(container, { onVisibilityChange }) {
  _lyricsContainer = container;
  _onVisibilityChange = onVisibilityChange;

  container.innerHTML = `
    <div class="lyrics-panel hidden" id="lyrics-panel">
      <div class="lyrics-header">
        <div class="lyrics-header-left">
          <div class="lyrics-header-icon">${icons.music}</div>
          <span class="lyrics-header-title">Lyrics</span>
        </div>
        <button class="lyrics-close-btn" id="lyrics-close-btn" title="Close lyrics">${icons.x}</button>
      </div>
      <div class="lyrics-content" id="lyrics-content">
        <div class="lyrics-empty">
          <div class="lyrics-empty-icon">${icons.music}</div>
          <p>Play a song to see lyrics</p>
        </div>
      </div>
      <div class="lyrics-footer">
        <span class="lyrics-source">Powered by LRCLIB</span>
      </div>
    </div>
  `;

  const closeBtn = container.querySelector('#lyrics-close-btn');
  closeBtn?.addEventListener('click', () => toggleLyrics());
  player.on('timeupdate', _onTimeUpdate);
  player.on('songchange', _onSongChange);
}

export function toggleLyrics() {
  _lyricsVisible = !_lyricsVisible;
  const panel = _lyricsContainer?.querySelector('#lyrics-panel');
  if (!panel) return;

  if (_lyricsVisible) {
    panel.classList.remove('hidden');
    panel.classList.add('lyrics-slide-in');
    const song = player.getCurrentSong();
    if (song && song.id !== _currentSongId) {
      _currentSongId = song.id;
      _fetchLyrics(song.id);
    } else if (song && _isSynced) {
      _syncActiveLine(player.audio?.currentTime || 0);
    }
  } else {
    panel.classList.add('hidden');
    panel.classList.remove('lyrics-slide-in');
  }

  if (_onVisibilityChange) _onVisibilityChange(_lyricsVisible);
}

export function isLyricsVisible() {
  return _lyricsVisible;
}
