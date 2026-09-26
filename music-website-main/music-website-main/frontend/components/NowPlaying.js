import { icons, getPlaceholderImage, formatDuration, getGreeting } from '../utils/helpers.js';
import { staggerCards, fadeIn } from '../utils/animations.js';
import * as api from '../services/api.js';
import player from '../services/playerEngine.js';

/**
 * Home / NowPlaying View
 * Shows trending songs and current playback hero
 */
export function renderHome(container, { onContextMenu, theme }) {
  const greeting = getGreeting();
  const tagline =
    theme === 'dreadflow'
      ? 'Embrace the darkness. Let the music consume you.'
      : 'Discover new music. Create your perfect vibe.';

  container.innerHTML = `
    <div class="home-view">
      <div class="home-hero">
        <div class="home-hero-content">
          <h1 class="home-greeting">${greeting}</h1>
          <p class="home-subtitle">${tagline}</p>
        </div>
      </div>

      <div id="trending-sections">
        <div class="section-header">
          <h2 class="section-title">Trending Now</h2>
        </div>
        <div class="song-grid" id="trending-grid">
          <div class="empty-state" style="grid-column:1/-1;padding:32px;">
            <p style="color:var(--text-muted);">Loading trending songs...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  fadeIn(container.querySelector('.home-hero'), { y: 30, duration: 0.6 });

  // Load trending
  _loadTrending(container, onContextMenu);
}

async function _loadTrending(container, onContextMenu) {
  const grid = container.querySelector('#trending-grid');
  const sectionsContainer = container.querySelector('#trending-sections');
  if (!grid || !sectionsContainer) return;

  try {
    const trending = await api.getTrending();

    if (!trending || trending.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🎵</div><h3>No trending songs</h3><p>Make sure the backend is running</p></div>';
      return;
    }

    // Render each category
    let html = '';
    trending.forEach((category) => {
      html += `
        <div class="section-header" style="margin-top:24px;">
          <h2 class="section-title">${category.category}</h2>
        </div>
        <div class="song-grid trending-category-grid">
          ${category.songs
            .map(
              (song) => `
            <div class="song-card" data-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>
              <div class="song-card-img-wrapper">
                <img class="song-card-img" src="${song.image || getPlaceholderImage()}" alt="${song.title}" onerror="this.src='${getPlaceholderImage()}'" />
                <button class="song-card-play" data-play-song='${JSON.stringify(song).replace(/'/g, '&#39;')}'>${icons.play}</button>
              </div>
              <div class="song-card-title" title="${song.title}">${song.title}</div>
              <div class="song-card-artist">${song.artists?.primary || song.artists?.singers || 'Unknown'}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `;
    });

    // Replace the initial grid with all sections
    grid.remove();
    sectionsContainer.querySelector('.section-header').remove();
    sectionsContainer.innerHTML = html;

    // Click to play
    sectionsContainer.querySelectorAll('.song-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.song-card-play')) return;
        const song = JSON.parse(card.dataset.song);
        player.playSong(song);
      });

      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const song = JSON.parse(card.dataset.song);
        onContextMenu(e, song);
      });
    });

    sectionsContainer.querySelectorAll('.song-card-play').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = JSON.parse(btn.dataset.playSong);
        player.playSong(song);
      });
    });

    staggerCards('.song-card');
  } catch (error) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><h3>Failed to load</h3><p>${error.message}</p></div>`;
  }
}
