import { icons } from '../utils/helpers.js';
import { themeTransition, buttonPress } from '../utils/animations.js';
import * as storage from '../services/storage.js';

/**
 * Theme Switcher
 * Toggles between MelodyFlow and DreadFlow with a GSAP flash transition
 */
export function initThemeSwitcher(onThemeChange) {
  // Apply saved theme on load
  const savedTheme = storage.getTheme();
  _applyTheme(savedTheme);

  return { toggle: () => _toggle(onThemeChange) };
}

function _applyTheme(theme) {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);

  if (theme === 'dreadflow') {
    document.title = 'DreadFlow — A Path to Suffering';
  } else {
    document.title = 'MelodyFlow — Music Streaming';
  }

  storage.setTheme(theme);
}

function _toggle(onThemeChange) {
  const overlay = document.getElementById('theme-overlay');
  const currentTheme = storage.getTheme();
  const newTheme = currentTheme === 'melodyflow' ? 'dreadflow' : 'melodyflow';

  // Flash color based on target theme
  overlay.style.background =
    newTheme === 'dreadflow'
      ? 'radial-gradient(circle, rgba(220,20,60,0.4) 0%, rgba(10,0,0,0.9) 100%)'
      : 'radial-gradient(circle, rgba(0,240,255,0.3) 0%, rgba(10,14,26,0.9) 100%)';

  themeTransition(overlay, () => {
    _applyTheme(newTheme);
    if (onThemeChange) onThemeChange(newTheme);
  });
}

export function getCurrentTheme() {
  return storage.getTheme();
}
