import { icons, getPlaceholderImage } from '../utils/helpers.js';
import * as api from '../services/api.js';
import player from '../services/playerEngine.js';

export async function renderHome(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🎧</div>
      <h3>Tuning into the void...</h3>
      <p>Loading spatial audio</p>
    </div>
  `;

  try {
    const data = await api.getTrending();

    // API returns an array of categories; accept legacy object shape too.
    const categories = Array.isArray(data) ? data : (data?.categories || []);

    // Pick the first song as the "Hero" featured track
    let heroSong = null;
    let masonrySongs = [];

    if (categories.length > 0) {
      const firstCat = categories[0];
      if (firstCat.songs && firstCat.songs.length > 0) {
        heroSong = firstCat.songs[0];
        masonrySongs = firstCat.songs.slice(1, 10);
      }
    }

    if (!heroSong) {
      const retryCount = parseInt(container.dataset.homeRetryCount || '0', 10);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📡</div>
          <h3>No spatial audio found</h3>
          <p>Try again in a moment</p>
        </div>
      `;
      if (retryCount < 5) {
        container.dataset.homeRetryCount = String(retryCount + 1);
        setTimeout(() => renderHome(container), 4000);
      }
      return;
    }

    const art = heroSong.image || getPlaceholderImage();
    const title = heroSong.title || 'Unknown Title';
    const artist = heroSong.artist?.name || heroSong.artists?.primary || 'Unknown Artist';

    const cardsHtml = masonrySongs
      .map((song, i) => {
        const sArt = song.image || getPlaceholderImage();
        const sTitle = song.title || 'Unknown';
        const sArtist = song.artist?.name || song.artists?.primary || 'Unknown';
        const id = song.videoId || song.id || '';

        let cardClass = 'card';
        if (i === 0) cardClass += ' card-feature';
        else if (i % 6 === 1) cardClass += ' card-wide';
        else if (i % 6 === 2) cardClass += ' card-tall';

        const nameSize = i === 0 ? 'lg' : (i % 6 === 1 ? 'md' : 'sm');

        return `
          <div class="${cardClass}" data-index="${i}" data-id="${id}">
            <img src="${sArt}" class="card-art" alt="Cover" onerror="this.src='${getPlaceholderImage()}'" />
            <div class="card-scrim"></div>
            <div class="card-inner">
              <div class="card-label">Spatial</div>
              <div class="card-name ${nameSize}">${sTitle}</div>
              <div class="card-meta">${sArtist}</div>
            </div>
            <button class="card-like" type="button" aria-label="Play">${icons.play}</button>
          </div>
        `;
      })
      .join('');

    container.dataset.homeRetryCount = '0';
    container.innerHTML = `
      <section class="hero">
        <div class="stage-wrap" id="hero-stage">
          <div class="album-3d" id="hero-card" data-id="${heroSong.videoId || heroSong.id}">
            <img src="${art}" class="album-art" alt="Cover" onerror="this.src='${getPlaceholderImage()}'" />
            <div class="album-overlay"></div>
            <div class="album-shine"></div>
            <div class="album-badge">Featured</div>
          </div>
        </div>
        <div class="blur-text">
          <div class="track-title">${title}</div>
          <div class="track-artist">${artist}</div>
          <button class="track-mood playable" id="hero-play">
            <span class="mood-dot"></span>
            Play featured track
          </button>
        </div>
        <div class="scroll-hint">
          <div class="scroll-line"></div>
          <span style="font-size:.65rem;letter-spacing:.18em;text-transform:uppercase;">Scroll</span>
        </div>
      </section>

      <section class="library">
        <div class="section-header">
          <div>
            <div class="section-eyebrow">Discover</div>
            <div class="section-title">More Spatial Picks</div>
          </div>
        </div>
        <div class="masonry" id="masonry-container">
          ${cardsHtml}
        </div>
      </section>
    `;

    const heroStage = container.querySelector('#hero-stage');
    const heroCard = container.querySelector('#hero-card');
    if (heroStage && heroCard) {
      heroStage.addEventListener('mousemove', (e) => {
        const rect = heroStage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        heroCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      heroStage.addEventListener('mouseleave', () => {
        heroCard.style.transform = 'rotateX(0deg) rotateY(0deg)';
      });
    }

    const playHero = () => player.playSong(heroSong, masonrySongs);
    container.querySelector('#hero-play')?.addEventListener('click', playHero);
    heroCard?.addEventListener('click', playHero);

    container.querySelectorAll('#masonry-container .card').forEach((item) => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index, 10);
        const song = masonrySongs[index];
        if (!song) return;
        player.playSong(song, masonrySongs.slice(index + 1));
      });
    });

    gsap.from('.album-3d', { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out' });
    gsap.from('.card', {
      y: 40,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      delay: 0.2,
    });

  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Failed to load spatial audio</h3>
        <p>${err.message || 'Please try again later'}</p>
      </div>
    `;
  }
}
