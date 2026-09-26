import { renderSidebar } from './components/Sidebar.js';
import { renderPlayer } from './components/Player.js';
import { renderQueue } from './components/Queue.js';
import { renderNowPlayingDetail } from './components/NowPlayingDetail.js';
import { renderSearch, handleSearch } from './components/Search.js';
import { renderHome } from './components/NowPlaying.js';
import { renderLibrary } from './components/Library.js';
import { renderPlaylistView } from './components/PlaylistView.js';
import { renderAuthModal, hideAuthModal } from './components/AuthModal.js';
import { renderAccountDropdown } from './components/AccountDropdown.js';
import { renderImportModal } from './components/ImportModal.js';
import { initLyrics, toggleLyrics } from './components/Lyrics.js';
import { initThemeSwitcher, getCurrentTheme } from './components/ThemeSwitcher.js';
import { viewTransition, showToast } from './utils/animations.js';
import { icons, debounce, formatDuration, getPlaceholderImage } from './utils/helpers.js';
import * as storage from './services/storage.js';
import {
  getSession, getUser, getUserProfile, onAuthChange,
  isSupabaseConfigured
} from './services/supabaseClient.js';
import player from './services/playerEngine.js';
import gsap from 'gsap';
const state = {
  currentView: 'home',
  currentPlaylistId: null,
  rightPanelOpen: false,
  searchQuery: '',
  authState: {
    user: null,
    profile: null,
    isGuest: true,
  },
};
const topNav = document.getElementById('top-nav');
const viewContainer = document.getElementById('view-container');
const rightPanel = document.getElementById('right-panel');
const nowPlayingDetail = document.getElementById('now-playing-detail');
const queuePanel = document.getElementById('queue-panel');
const playerBar = document.getElementById('player-bar');
const modalOverlay = document.getElementById('modal-overlay');
const contextMenu = document.getElementById('context-menu');
const toastContainer = document.getElementById('toast-container');
const authModal = document.getElementById('auth-modal');
const importModal = document.getElementById('import-modal');
const mobileTabBar = document.getElementById('mobile-tab-bar');
const mobilePlayerOverlay = document.getElementById('mobile-player-overlay');
const lyricsPanelContainer = document.getElementById('lyrics-panel-container');
const themeSwitcher = initThemeSwitcher((newTheme) => {
  _renderNav();
  _renderView();
  if (state.rightPanelOpen) _renderRightPanel();
});
async function _initAuth() {
  const guestPref = storage.getGuestModePreference();

  if (isSupabaseConfigured()) {
    const session = await getSession();
    if (session?.user) {
      await _handleLoginSuccess(session);
      return;
    }
  }
  if (guestPref === true) {
    _enterGuestMode();
    return;
  }
  _showAuthModal();
}

function _showAuthModal() {
  renderAuthModal(authModal, {
    onAuthSuccess: async (result) => {
      await _handleLoginSuccess(result.session || result);
    },
    onGuestMode: () => {
      _enterGuestMode();
    },
  });
}

async function _handleLoginSuccess(session) {
  const user = session?.user || await getUser();
  if (!user) {
    _enterGuestMode();
    return;
  }
  if (state.authState?.user?.id === user.id && !state.authState?.isGuest) {
    return;
  }

  let profile = null;
  try {
    profile = await getUserProfile(user.id);
  } catch (e) {  }

  state.authState = {
    user,
    profile,
    isGuest: false,
  };

  storage.initStorage(user);
  storage.setGuestMode(false);
  try {
    await storage.loadFromCloud();
  } catch (e) {
    console.warn('[Auth] Cloud sync failed:', e.message);
  }
  _renderNav();
  _renderView();

  showToast(toastContainer, `Welcome back, ${profile?.display_name || user.email?.split('@')[0] || 'User'}!`);
}

function _enterGuestMode() {
  state.authState = {
    user: null,
    profile: null,
    isGuest: true,
  };
  storage.initStorage(null);
  storage.setGuestMode(true);
  hideAuthModal(authModal);
  _renderNav();
  _renderView();
}

function _handleSignOut() {
  state.authState = {
    user: null,
    profile: null,
    isGuest: true,
  };
  storage.clearUserData();
  storage.initStorage(null);
  storage.setGuestMode(false); 
  _renderNav();
  _renderView();
  showToast(toastContainer, 'Signed out successfully');
  setTimeout(() => _showAuthModal(), 500);
}
if (isSupabaseConfigured()) {
  onAuthChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await _handleLoginSuccess(session);
    } else if (event === 'SIGNED_OUT') {
      _handleSignOut();
    }
  });
}
function _navigate(view) {
  state.currentView = view;
  state.currentPlaylistId = null;
  _renderNav();
  _renderView();
  _renderMobileTabBar();
}

function _renderView() {
  viewTransition(viewContainer, () => {
    switch (state.currentView) {
      case 'home':
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
          profile: state.authState.profile,
        });
        break;
      case 'search':
        renderSearch(viewContainer, {
          onContextMenu: _showContextMenu,
          searchQuery: state.searchQuery,
        });
        break;
      case 'library':
        renderLibrary(viewContainer, {
          onPlaylistSelect: _openPlaylist,
          onContextMenu: _showContextMenu,
          onImportPlaylist: _showImportModal,
          onCreatePlaylist: _showCreatePlaylistModal,
        });
        break;
      case 'playlist':
        renderPlaylistView(viewContainer, {
          playlistId: state.currentPlaylistId,
          onContextMenu: _showContextMenu,
          onBack: () => _navigate('library'),
        });
        break;
      default:
        renderHome(viewContainer, {
          onContextMenu: _showContextMenu,
          theme: getCurrentTheme(),
          profile: state.authState.profile,
        });
    }
  });
}

function _openPlaylist(playlistId) {
  state.currentView = 'playlist';
  state.currentPlaylistId = playlistId;
  _renderNav();
  _renderView();
  _renderMobileTabBar();
}
function _showImportModal() {
  renderImportModal(importModal, {
    onComplete: () => {
      _renderNav();
      if (state.currentView === 'library') _renderView();
    },
    onClose: () => {
      importModal.innerHTML = '';
    },
  });
}
function _toggleRightPanel() {
  state.rightPanelOpen = !state.rightPanelOpen;
  if (state.rightPanelOpen) {
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  } else {
    gsap.to(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        rightPanel.classList.add('hidden');
        gsap.set(rightPanel, { x: 0, opacity: 1 });
      },
    });
  }
}

function _closeRightPanel() {
  if (!state.rightPanelOpen) return;
  state.rightPanelOpen = false;
  gsap.to(rightPanel, {
    x: 360,
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      rightPanel.classList.add('hidden');
      gsap.set(rightPanel, { x: 0, opacity: 1 });
      const queueToggle = playerBar.querySelector('#queue-toggle-btn');
      if (queueToggle) queueToggle.classList.remove('active');
    },
  });
}

function _renderRightPanel() {
  renderNowPlayingDetail(nowPlayingDetail, {
    onClose: _closeRightPanel,
  });
  renderQueue(queuePanel);
}

document.addEventListener('toggle-queue', () => {
  if (state.rightPanelOpen) {
    _closeRightPanel();
  } else {
    state.rightPanelOpen = true;
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  }
});
player.on('songchange', () => {
  if (!state.rightPanelOpen) {
    state.rightPanelOpen = true;
    rightPanel.classList.remove('hidden');
    _renderRightPanel();
    gsap.from(rightPanel, {
      x: 360,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
    const queueToggle = playerBar.querySelector('#queue-toggle-btn');
    if (queueToggle) queueToggle.classList.add('active');
  }
});
function _renderPlayerBar() {
  renderPlayer();
}
function _initLyrics() {
  initLyrics(lyricsPanelContainer, {
    onVisibilityChange: (visible) => {
      const btn = playerBar.querySelector('#lyrics-toggle-btn');
      if (btn) btn.classList.toggle('active', visible);
    },
  });
}
function _showContextMenu(event, song) {
  const playlists = storage.getPlaylists();

  const x = Math.min(event.clientX, window.innerWidth - 220);
  const y = Math.min(event.clientY, window.innerHeight - 300);
  const openSubmenuLeft = x > window.innerWidth - 420;

  let playlistSubmenu = '';
  if (playlists.length > 0) {
    playlistSubmenu = `
      <div class="context-submenu ${openSubmenuLeft ? 'open-left' : ''}">
        <div class="context-menu-item">
          ${icons.plus} Add to Playlist ${icons.chevronRight}
        </div>
        <div class="context-submenu-list">
          ${playlists
            .map(
              (pl) =>
                `<div class="context-menu-item" data-action="add-to-playlist" data-playlist-id="${pl.id}">${pl.name}</div>`
            )
            .join('')}
        </div>
      </div>
    `;
  }

  const isLiked = storage.isLiked(song.id);

  contextMenu.innerHTML = `
    <div class="context-menu-item" data-action="play">${icons.play} Play</div>
    <div class="context-menu-item" data-action="queue">${icons.plus} Add to Queue</div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="like">${isLiked ? icons.heartFilled : icons.heart} ${isLiked ? 'Remove from Liked' : 'Like'}</div>
    ${playlistSubmenu}
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" data-action="create-playlist-add">${icons.plus} New Playlist with Song</div>
  `;
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  contextMenu.classList.remove('hidden');
  contextMenu.querySelectorAll('[data-action]').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      switch (action) {
        case 'play':
          player.playSong(song);
          break;
        case 'queue':
          player.addToQueue(song);
          showToast(toastContainer, `Added "${song.title}" to queue`);
          break;
        case 'like':
          const liked = storage.toggleLike(song);
          showToast(toastContainer, liked ? `Liked "${song.title}"` : `Removed from Liked`);
          break;
        case 'add-to-playlist': {
          const plId = item.dataset.playlistId;
          const added = storage.addSongToPlaylist(plId, song);
          const pl = storage.getPlaylistById(plId);
          showToast(
            toastContainer,
            added ? `Added to "${pl?.name}"` : `Already in "${pl?.name}"`
          );
          _renderNav();
          break;
        }
        case 'create-playlist-add':
          const newPl = storage.createPlaylist(`My Playlist`);
          storage.addSongToPlaylist(newPl.id, song);
          showToast(toastContainer, `Created playlist with "${song.title}"`);
          _renderNav();
          break;
      }
      contextMenu.classList.add('hidden');
    });
  });
}
document.addEventListener('click', (e) => {
  if (!contextMenu.contains(e.target)) {
    contextMenu.classList.add('hidden');
  }
});
function _showCreatePlaylistModal() {
  modalOverlay.classList.remove('hidden');
  const input = document.getElementById('playlist-name-input');
  input.value = '';
  setTimeout(() => input.focus(), 100);
}

document.getElementById('modal-cancel')?.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

document.getElementById('modal-create')?.addEventListener('click', () => {
  const input = document.getElementById('playlist-name-input');
  const name = input.value.trim();
  if (name) {
    storage.createPlaylist(name);
    modalOverlay.classList.add('hidden');
    _renderNav();
    showToast(toastContainer, `Created "${name}"`);
  }
});

document.getElementById('playlist-name-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('modal-create')?.click();
  }
  if (e.key === 'Escape') {
    modalOverlay.classList.add('hidden');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      player.togglePlay();
      break;
    case 'ArrowRight':
      if (e.ctrlKey) player.next();
      break;
    case 'ArrowLeft':
      if (e.ctrlKey) player.prev();
      break;
  }
});
document.addEventListener('mousemove', (e) => {
  document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
  document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
  const isInteractive = e.composedPath().some(el => {
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.getAttribute?.('role') === 'button') {
      return true;
    }
    if (el.classList && (el.classList.contains('track-row') || el.classList.contains('playlist-item') || el.classList.contains('song-card') || el.classList.contains('playlist-card'))) {
      return true;
    }
    return false;
  });
  
  if (isInteractive) {
    document.documentElement.setAttribute('data-cursor-hover', 'true');
  } else {
    document.documentElement.removeAttribute('data-cursor-hover');
  }
});
function _renderMobileTabBar() {
  if (!mobileTabBar) return;
  const isLibraryActive = state.currentView === 'library' || state.currentView === 'playlist';
  mobileTabBar.innerHTML = `
    <button class="mobile-tab ${state.currentView === 'home' ? 'active' : ''}" data-view="home">
      ${icons.home}
      <span>Home</span>
    </button>
    <button class="mobile-tab ${state.currentView === 'search' ? 'active' : ''}" data-view="search">
      ${icons.search}
      <span>Search</span>
    </button>
    <button class="mobile-tab ${isLibraryActive ? 'active' : ''}" data-view="library">
      ${icons.library}
      <span>Library</span>
    </button>
  `;

  mobileTabBar.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      _navigate(tab.dataset.view);
    });
  });
}
let _mobilePlayerOpen = false;

function _isMobile() {
  return window.matchMedia('(max-width: 768px)').matches;
}

function _openMobilePlayer() {
  if (!mobilePlayerOverlay || !_isMobile()) return;
  const song = player.getCurrentSong();
  if (!song) return;
  _mobilePlayerOpen = true;
  _renderMobilePlayer();
  mobilePlayerOverlay.classList.remove('hidden', 'closing');
  mobilePlayerOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function _closeMobilePlayer() {
  if (!mobilePlayerOverlay) return;
  _mobilePlayerOpen = false;
  mobilePlayerOverlay.classList.add('closing');
  document.body.style.overflow = '';
  setTimeout(() => {
    mobilePlayerOverlay.classList.remove('visible', 'closing');
    mobilePlayerOverlay.classList.add('hidden');
  }, 350);
}

function _renderMobilePlayer() {
  if (!mobilePlayerOverlay) return;
  const song = player.getCurrentSong();
  const isPlaying = player.isPlaying;
  const isLiked = song ? storage.isLiked(song.id) : false;
  const imgSrc = (song && !song.isLocal && song.image) ? song.image : getPlaceholderImage();
  const title = song?.title || 'No song playing';
  const artist = (song?.artists?.primary || song?.artists?.singers || '') || '—';

  mobilePlayerOverlay.innerHTML = `
    <div class="mp-top-bar">
      <button class="mp-collapse-btn" id="mp-collapse">${icons.chevronDown}</button>
      <span class="mp-now-playing-label">Now Playing</span>
      <button class="mp-more-btn" id="mp-more">${icons.moreVertical}</button>
    </div>

    <div class="mp-album-art-wrapper">
      <img class="mp-album-art" id="mp-art" src="${imgSrc}" alt="${title}" />
    </div>

    <div class="mp-song-info">
      <div class="mp-song-text">
        <div class="mp-song-title" id="mp-title">${title.length > 25 ? `<marquee scrollamount="4">${title}</marquee>` : title}</div>
        <div class="mp-song-artist" id="mp-artist">${artist}</div>
      </div>
      <button class="mp-like-btn ${isLiked ? 'liked' : ''}" id="mp-like">
        ${isLiked ? icons.heartFilled : icons.heart}
      </button>
    </div>

    <div class="mp-progress-section">
      <div class="mp-progress-bar-container" id="mp-progress-container" style="position:relative;">
        <div class="mp-progress-bar" id="mp-progress" style="width:0%"></div>
        <input type="range" class="invisible-seeker" id="mobile-progress-slider" min="0" max="1000" value="0" />
      </div>
      <div class="mp-time-row">
        <span class="mp-time" id="mp-current-time">0:00</span>
        <span class="mp-time" id="mp-total-time">0:00</span>
      </div>
    </div>

    <div class="mp-controls">
      <button class="mp-ctrl-btn ${player.shuffle ? 'active' : ''}" id="mp-shuffle">${icons.shuffle}</button>
      <button class="mp-ctrl-btn mp-skip-btn" id="mp-prev">${icons.skipBack}</button>
      <button class="mp-play-btn" id="mp-play">${isPlaying ? icons.pause : icons.play}</button>
      <button class="mp-ctrl-btn mp-skip-btn" id="mp-next">${icons.skipForward}</button>
      <button class="mp-ctrl-btn ${player.repeat !== 'off' ? 'active' : ''}" id="mp-repeat">${player.repeat === 'one' ? icons.repeat1 : icons.repeat}</button>
    </div>
    <div class="mp-volume-section">
      ${icons.volumeHigh}
      <input type="range" class="volume-range-slider" id="mp-volume" min="0" max="1" step="0.01" value="${player.volume || 1}" style="--volume-pct: ${Math.round((player.volume || 1) * 100)}%" />
      <button class="mp-lyrics-btn" id="mp-lyrics" title="Lyrics" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; padding: 4px;">
        ${icons.lyrics}
      </button>
    </div>
  `;
  mobilePlayerOverlay.querySelector('#mp-collapse')?.addEventListener('click', _closeMobilePlayer);

  mobilePlayerOverlay.querySelector('#mp-play')?.addEventListener('click', () => player.togglePlay());
  mobilePlayerOverlay.querySelector('#mp-next')?.addEventListener('click', () => player.next());
  mobilePlayerOverlay.querySelector('#mp-prev')?.addEventListener('click', () => player.prev());
  mobilePlayerOverlay.querySelector('#mp-shuffle')?.addEventListener('click', () => player.toggleShuffle());
  mobilePlayerOverlay.querySelector('#mp-repeat')?.addEventListener('click', () => player.toggleRepeat());

  mobilePlayerOverlay.querySelector('#mp-like')?.addEventListener('click', () => {
    if (!song) return;
    const liked = storage.toggleLike(song);
    const btn = mobilePlayerOverlay.querySelector('#mp-like');
    if (btn) {
      btn.innerHTML = liked ? icons.heartFilled : icons.heart;
      btn.classList.toggle('liked', liked);
    }
  });

  mobilePlayerOverlay.querySelector('#mp-more')?.addEventListener('click', (e) => {
    if (song) {
      _closeMobilePlayer();
      setTimeout(() => _showContextMenu(e, song), 400);
    }
  });

  mobilePlayerOverlay.querySelector('#mp-volume')?.addEventListener('input', (e) => {
    player.setVolume(parseFloat(e.target.value));
    e.target.style.setProperty('--volume-pct', `${Math.round(e.target.value * 100)}%`);
  });

  mobilePlayerOverlay.querySelector('#mp-lyrics')?.addEventListener('click', () => {
    import('./components/Lyrics.js').then(({ toggleLyrics }) => {
      toggleLyrics();
    });
  });
  const progressSlider = mobilePlayerOverlay.querySelector('#mobile-progress-slider');
  progressSlider?.addEventListener('input', (e) => {
    const pct = parseInt(e.target.value) / 1000;
    const progressEl = mobilePlayerOverlay.querySelector('#mp-progress');
    const curEl = mobilePlayerOverlay.querySelector('#mp-current-time');
    if (progressEl) progressEl.style.width = `${pct * 100}%`;
    const duration = player.audio?.duration || 0;
    if (curEl && duration > 0) curEl.textContent = formatDuration(pct * duration);
  });
  progressSlider?.addEventListener('change', (e) => {
    player.seek(parseInt(e.target.value) / 1000);
  });
}

function _updateMobilePlayerTime({ currentTime, duration }) {
  if (!_mobilePlayerOpen) return;
  const progressSlider = mobilePlayerOverlay.querySelector('#mobile-progress-slider');
  if (progressSlider && progressSlider.matches(':active')) return;

  const progress = mobilePlayerOverlay.querySelector('#mp-progress');
  const curEl = mobilePlayerOverlay.querySelector('#mp-current-time');
  const totEl = mobilePlayerOverlay.querySelector('#mp-total-time');
  const pct = duration ? (currentTime / duration) : 0;
  if (progress) progress.style.width = `${pct * 100}%`;
  if (curEl) curEl.textContent = formatDuration(currentTime);
  if (totEl) totEl.textContent = formatDuration(duration);
  if (progressSlider) progressSlider.value = Math.round(pct * 1000);
}

function _updateMobilePlayerState({ isPlaying }) {
  if (!_mobilePlayerOpen) return;
  const btn = mobilePlayerOverlay.querySelector('#mp-play');
  if (btn) btn.innerHTML = isPlaying ? icons.pause : icons.play;
}

function _updateMobilePlayerSong({ song }) {
  if (!_mobilePlayerOpen) return;
  _renderMobilePlayer();
}
player.on('timeupdate', _updateMobilePlayerTime);
player.on('statechange', _updateMobilePlayerState);
player.on('songchange', _updateMobilePlayerSong);
player.on('shufflechange', ({ shuffle }) => {
  if (!_mobilePlayerOpen) return;
  const btn = mobilePlayerOverlay.querySelector('#mp-shuffle');
  if (btn) btn.classList.toggle('active', shuffle);
});
player.on('repeatchange', ({ repeat }) => {
  if (!_mobilePlayerOpen) return;
  const btn = mobilePlayerOverlay.querySelector('#mp-repeat');
  if (btn) {
    btn.classList.toggle('active', repeat !== 'off');
    btn.innerHTML = repeat === 'one' ? icons.repeat1 : icons.repeat;
  }
});

function _initMobilePlayer() {
  if (!playerBar) return;
  playerBar.addEventListener('click', (e) => {
    if (!_isMobile()) return;
    if (e.target.closest('button') || e.target.closest('.player-btn') || e.target.closest('.play-btn')) return;
    _openMobilePlayer();
  });
}
/* ── AURORA CANVAS ── */
function _initAurora() {
  const cv = document.getElementById('aurora-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let w, h, t = 0;
  
  function resize() {
    w = cv.width = window.innerWidth;
    h = cv.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, w, h);
    t += 0.005;
    
    // Draw 3 shifting blurred circles for the aura
    const cx1 = w * 0.3 + Math.sin(t) * 200;
    const cy1 = h * 0.4 + Math.cos(t) * 150;
    
    const cx2 = w * 0.7 + Math.sin(t * 0.8 + 2) * 250;
    const cy2 = h * 0.6 + Math.cos(t * 1.1) * 200;
    
    const cx3 = w * 0.5 + Math.sin(t * 1.3 + 4) * 150;
    const cy3 = h * 0.2 + Math.cos(t * 0.9 + 1) * 100;
    
    const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, w * 0.4);
    g1.addColorStop(0, 'rgba(138, 43, 226, 0.4)'); // Purple
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);
    
    const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, w * 0.4);
    g2.addColorStop(0, 'rgba(0, 240, 255, 0.3)'); // Cyan
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);
    
    const g3 = ctx.createRadialGradient(cx3, cy3, 0, cx3, cy3, w * 0.5);
    g3.addColorStop(0, 'rgba(255, 0, 128, 0.25)'); // Pink
    g3.addColorStop(1, 'transparent');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(draw);
  }
  draw();
}

function _renderNav() {
  if (!topNav) return;
  const isGuest = state.authState.isGuest;
  const name = state.authState?.profile?.display_name || state.authState?.user?.email?.split('@')[0] || 'U';
  
  const userSection = isGuest
    ? `<button class="nav-sign-in" id="nav-user"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In</button>`
    : `<div class="user-avatar" id="nav-user" style="text-transform:uppercase;">${name[0]}</div>`;

  topNav.innerHTML = `
    <div class="nav-brand">
      <h1 style="font-family:var(--font-serif);font-style:italic;font-size:24px;">Phantom Beats</h1>
    </div>
    <div class="nav-links">
      <a class="nav-item ${state.currentView === 'home' ? 'active' : ''}" data-view="home">Discover</a>
      <a class="nav-item ${state.currentView === 'search' ? 'active' : ''}" data-view="search">Search</a>
      <a class="nav-item ${state.currentView === 'library' ? 'active' : ''}" data-view="library">Library</a>
    </div>
    <div class="nav-actions">
      <input type="text" class="nav-search" id="nav-search-input" placeholder="Search..." value="${state.searchQuery}" />
      ${userSection}
    </div>
  `;

  // Nav link clicks
  topNav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => _navigate(el.dataset.view));
  });

  // Search input
  const searchInput = topNav.querySelector('#nav-search-input');
  const debouncedSearch = debounce((query) => {
    state.searchQuery = query;
    if (query.trim().length >= 2) {
      if (state.currentView !== 'search') {
        state.currentView = 'search';
        _renderNav();
        _renderView();
      } else {
        handleSearch(query, viewContainer, _showContextMenu);
      }
    } else if (state.currentView === 'search' && query.trim().length === 0) {
      handleSearch('', viewContainer, _showContextMenu);
    }
  }, 400);

  searchInput?.addEventListener('input', (e) => debouncedSearch(e.target.value));
  searchInput?.addEventListener('focus', () => {
    if (state.currentView !== 'search') _navigate('search');
  });

  // User button
  topNav.querySelector('#nav-user')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isGuest) _showAuthModal();
    else {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;right:24px;top:76px;background:rgba(20,20,30,0.95);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.08);padding:8px;border-radius:12px;z-index:1000;min-width:140px;';
      d.innerHTML = `<button id="btn-logout" style="width:100%;text-align:left;background:none;border:none;color:rgba(255,255,255,0.9);padding:10px 14px;border-radius:8px;cursor:pointer;font-size:14px;">Sign Out</button>`;
      document.body.appendChild(d);
      
      d.querySelector('#btn-logout').onclick = () => {
        document.body.removeChild(d);
        _handleSignOut();
      };
      
      const closeDropdown = () => {
        if (d.parentNode) document.body.removeChild(d);
        document.removeEventListener('click', closeDropdown);
      };
      setTimeout(() => document.addEventListener('click', closeDropdown), 10);
    }
  });
}

async function init() {
  _initAurora();
  _renderPlayerBar();
  _initLyrics();
  await _initAuth();
  _renderMobileTabBar();
  _initMobilePlayer();

  console.log(
    `%c🎵 Aura Spatial UI initialized`,
    'color: #00f0ff; font-size: 14px; font-weight: bold;'
  );
}

init();
