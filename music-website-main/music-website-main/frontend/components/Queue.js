import { icons, getPlaceholderImage, formatDuration } from '../utils/helpers.js';
import { staggerTracks } from '../utils/animations.js';
import player from '../services/playerEngine.js';

/**
 * Queue Component (inside right panel)
 * Shows up next tracks
 */
export function renderQueue(container) {
  _render(container);

  // Listen for changes
  player.on('songchange', () => _render(container));
  player.on('queuechange', () => _render(container));
}

function _render(container) {
  const upNext = player.getUpNext();

  container.innerHTML = `
    <div class="queue-header">
      <h3 class="queue-title">Next in queue</h3>
      ${upNext.length > 0 ? `<button class="queue-clear-btn" id="queue-clear">Clear</button>` : ''}
    </div>

    <div class="queue-tracks">
      ${
        upNext.length > 0
          ? upNext
              .map(
                (song, i) => `
          <div class="queue-track" data-queue-index="${player.currentIndex + 1 + i}">
            <span class="queue-track-number">${i + 1}</span>
            <img class="queue-track-img" src="${song.image || getPlaceholderImage()}" alt="" onerror="this.src='${getPlaceholderImage()}'" />
            <div class="queue-track-info">
              <div class="queue-track-title">${song.title || 'Unknown'}</div>
              <div class="queue-track-artist">${song.artists?.primary || song.artists?.singers || ''}</div>
            </div>
            <span class="queue-track-duration">${formatDuration(song.duration)}</span>
          </div>
        `
              )
              .join('')
          : '<div style="text-align:center;padding:16px 0;color:var(--text-muted);font-size:13px;">Add songs to your queue</div>'
      }
    </div>
  `;

  // Clear queue
  container.querySelector('#queue-clear')?.addEventListener('click', () => {
    player.clearQueue();
  });

  // Click to play from queue
  container.querySelectorAll('.queue-track[data-queue-index]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.queueIndex);
      const song = player.queue[idx];
      if (song) {
        player.currentIndex = idx;
        player.playSong(song);
      }
    });
  });

  staggerTracks('.queue-track');
}
