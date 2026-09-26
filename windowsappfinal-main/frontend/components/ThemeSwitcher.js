import { icons } from '../utils/helpers.js';
import { themeTransition, buttonPress } from '../utils/animations.js';
import * as storage from '../services/storage.js';



const THEME_ORDER = ['melodyflow', 'dreadflow', 'retroflow'];

const THEME_OVERLAYS = {
  melodyflow: 'radial-gradient(circle, rgba(0,240,255,0.3) 0%, rgba(10,14,26,0.9) 100%)',
  dreadflow: 'radial-gradient(circle, rgba(220,20,60,0.4) 0%, rgba(10,0,0,0.9) 100%)',
  retroflow: 'radial-gradient(circle, rgba(255,107,138,0.35) 0%, rgba(232,223,245,0.9) 100%)',
};

export function initThemeSwitcher(onThemeChange) {
  const savedTheme = storage.getTheme();
  _applyTheme(savedTheme);

  return { toggle: () => _toggle(onThemeChange) };
}

function _applyTheme(theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);
  document.title = 'Phantombeats — Music Streaming';
  storage.setTheme(theme);
}

function _toggle(onThemeChange) {
  const overlay = document.getElementById('theme-overlay');
  const currentTheme = storage.getTheme();
  const currentIdx = THEME_ORDER.indexOf(currentTheme);
  const newTheme = THEME_ORDER[(currentIdx + 1) % THEME_ORDER.length];
  overlay.style.background = THEME_OVERLAYS[newTheme] || THEME_OVERLAYS.melodyflow;

  themeTransition(overlay, () => {
    _applyTheme(newTheme);
    if (onThemeChange) onThemeChange(newTheme);
  });
}

export function getCurrentTheme() {
  return storage.getTheme();
}
