import gsap from 'gsap';

/**
 * GSAP Animation Presets for MelodyFlow / DreadFlow
 */

/** Fade in and slide up */
export function fadeIn(elements, options = {}) {
  return gsap.from(elements, {
    opacity: 0,
    y: options.y || 20,
    duration: options.duration || 0.5,
    ease: options.ease || 'power2.out',
    stagger: options.stagger || 0,
    delay: options.delay || 0,
    onComplete: options.onComplete,
  });
}

/** Stagger card entrance */
export function staggerCards(selector, options = {}) {
  const elements = document.querySelectorAll(selector);
  if (!elements.length) return;
  return gsap.from(elements, {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.4,
    ease: 'power2.out',
    stagger: options.stagger || 0.06,
    delay: options.delay || 0.1,
    clearProps: 'opacity,transform',
  });
}

/** Slide in from left (sidebar) */
export function slideInLeft(element, options = {}) {
  return gsap.from(element, {
    x: -260,
    opacity: 0,
    duration: options.duration || 0.6,
    ease: 'power3.out',
  });
}

/** Slide in from bottom (player bar) */
export function slideInBottom(element, options = {}) {
  return gsap.from(element, {
    y: 90,
    opacity: 0,
    duration: options.duration || 0.5,
    ease: 'power3.out',
    delay: options.delay || 0.2,
  });
}

/** Pulse glow effect on album art */
export function pulseGlow(element) {
  return gsap.to(element, {
    boxShadow: 'var(--glow-lg)',
    duration: 1.2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

/** Album art entrance (now playing hero) */
export function albumArtEntrance(element) {
  return gsap.from(element, {
    scale: 0.8,
    opacity: 0,
    rotation: -5,
    duration: 0.7,
    ease: 'back.out(1.4)',
  });
}

/** View transition — fade out current, fade in new */
export function viewTransition(container, renderFn) {
  const tl = gsap.timeline();
  tl.to(container, {
    opacity: 0,
    y: -10,
    duration: 0.15,
    ease: 'power2.in',
    onComplete: () => {
      renderFn();
      gsap.set(container, { y: 10 });
    },
  });
  tl.to(container, {
    opacity: 1,
    y: 0,
    duration: 0.3,
    ease: 'power2.out',
  });
  return tl;
}

/** Theme switch flash transition */
export function themeTransition(overlay, onSwitch) {
  const tl = gsap.timeline();
  tl.to(overlay, {
    opacity: 1,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: onSwitch,
  });
  tl.to(overlay, {
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out',
  });
  return tl;
}

/** Queue panel slide toggle */
export function toggleQueuePanel(panel, show) {
  if (show) {
    panel.classList.remove('hidden');
    gsap.from(panel, {
      x: 340,
      opacity: 0,
      duration: 0.35,
      ease: 'power3.out',
    });
  } else {
    gsap.to(panel, {
      x: 340,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        panel.classList.add('hidden');
        gsap.set(panel, { x: 0, opacity: 1 });
      },
    });
  }
}

/** Toast notification entrance/exit */
export function showToast(container, message, duration = 2500) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  gsap.from(toast, {
    y: 20,
    opacity: 0,
    scale: 0.95,
    duration: 0.3,
    ease: 'back.out(1.5)',
  });

  setTimeout(() => {
    gsap.to(toast, {
      y: -10,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => toast.remove(),
    });
  }, duration);
}

/** Track row stagger */
export function staggerTracks(selector) {
  const rows = document.querySelectorAll(selector);
  if (!rows.length) return;
  return gsap.from(rows, {
    opacity: 0,
    x: -15,
    duration: 0.3,
    ease: 'power2.out',
    stagger: 0.04,
    clearProps: 'opacity,transform',
  });
}

/** Button press animation */
export function buttonPress(element) {
  gsap.to(element, {
    scale: 0.92,
    duration: 0.1,
    ease: 'power2.in',
    yoyo: true,
    repeat: 1,
  });
}

/** Search bar expand animation */
export function searchExpand(element) {
  gsap.from(element, {
    width: '200px',
    duration: 0.4,
    ease: 'power2.out',
  });
}
