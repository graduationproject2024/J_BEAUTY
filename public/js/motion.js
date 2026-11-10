import { api } from './state.js';

let revealObserver = null;

export function trackFunnel(eventName) {
  try {
    api('/telemetry/event', { event: eventName }).catch(() => {});
  } catch {}
}

export function initScrollReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  if (revealObserver) revealObserver.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08, rootMargin: '0px 0px -24px 0px' },
  );

  targets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      el.classList.add('is-revealed');
    } else {
      revealObserver.observe(el);
    }
  });
}

/**
 * Original signature J SPA blooming flower SVG tied to loyalty progress.
 * Petals scale & unfurl cleanly from the center using GPU transforms only.
 */
export function renderSignatureBloomSVG(filledCount = 4, totalPetals = 8, lightMode = false) {
  const strokeMuted = lightMode ? 'rgba(80, 60, 69, 0.25)' : 'rgba(212, 175, 124, 0.42)';
  const centerFill = lightMode ? '#503C45' : '#D4AF7C';
  const ringStroke = lightMode ? 'rgba(96, 114, 87, 0.25)' : 'rgba(212, 175, 124, 0.24)';

  const outerSepals = Array.from({ length: totalPetals }, (_, idx) => {
    const angle = idx * (360 / totalPetals) + 22.5;
    return `<ellipse cx="110" cy="46" rx="8" ry="22" transform="rotate(${angle} 110 110)"
      fill="#A7B79F" fill-opacity="0.22" stroke="#A7B79F" stroke-opacity="0.45" stroke-width="1"/>`;
  }).join('');

  const petals = Array.from({ length: totalPetals }, (_, idx) => {
    const angle = idx * (360 / totalPetals);
    const active = idx < filledCount;
    const delayMs = idx * 55;
    return `<g class="bloom-petal ${active ? 'is-bloomed' : ''}" style="--petal-delay:${delayMs}ms;transform-origin:110px 110px">
      <path d="M110 34 C126 52 126 84 110 98 C94 84 94 52 110 34 Z"
        transform="rotate(${angle} 110 110)"
        fill="${active ? '#D9B7C0' : 'transparent'}"
        fill-opacity="${active ? '0.92' : '0'}"
        stroke="${active ? '#D4AF7C' : strokeMuted}"
        stroke-width="1.5"/>
    </g>`;
  }).join('');

  return `
    <svg class="signature-bloom" viewBox="0 0 220 220" fill="none" aria-hidden="true">
      <circle cx="110" cy="110" r="88" stroke="${ringStroke}" stroke-dasharray="3 5"/>
      ${outerSepals}
      ${petals}
      <circle cx="110" cy="110" r="20" fill="${lightMode ? '#FBF7F4' : '#352F32'}" stroke="#D4AF7C" stroke-width="1.6"/>
      <text x="110" y="116" text-anchor="middle" fill="${centerFill}" font-family="Newsreader, Georgia, serif" font-size="20">J</text>
    </svg>
  `;
}
