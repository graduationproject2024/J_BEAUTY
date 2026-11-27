import { api } from './state.js';

export function trackFunnel(eventName) {
  try {
    api('/telemetry/event', { event: eventName }).catch(() => {});
  } catch {}
}

/**
 * Ensures all `[data-reveal]` sections render immediately visible (`opacity: 1`) on load
 * so slow scrolling, anchor links, and full-page snapshots never see blank sections.
 */
export function initScrollReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    el.classList.add('is-revealed');
  });
}

/**
 * Official J Beauty Luxury Botanical Bloom Medallion
 * High-definition vector emblem featuring Rosa Damascena petals in Rose Gold (#D4AF7C),
 * Dusty Pink (#D9B7C0), Mauve (#C9AEB6), and Sage (#A7B79F).
 */
export function renderSignatureBloomSVG(filledCount = 4, totalPetals = 8, lightMode = false) {
  const ratio = Math.max(0, Math.min(1, filledCount / Math.max(1, totalPetals)));
  const activePetals = Math.round(ratio * 8);

  const bgFill = lightMode ? '#FAF7F5' : '#3E2932';
  const petalInactiveColor = lightMode ? '#EBE0E3' : '#573E47';
  const goldAccent = '#D4AF7C';

  // 8 radial blooming petals with dynamic gold/pink illumination
  const petalsSvg = Array.from({ length: 8 }, (_, i) => {
    const angle = i * 45;
    const isLit = i < activePetals;
    const fill = isLit ? (i % 2 === 0 ? '#D9B7C0' : '#C9AEB6') : petalInactiveColor;
    const stroke = isLit ? goldAccent : (lightMode ? '#D5C4C9' : '#6A4F59');
    const opacity = isLit ? 1 : 0.45;
    return `<path d="M 0,-14 C -16,-36 -22,-62 0,-76 C 22,-62 16,-36 0,-14 Z"
      transform="translate(120, 130) rotate(${angle})"
      fill="${fill}"
      fill-opacity="${isLit ? '0.85' : '0.35'}"
      stroke="${stroke}"
      stroke-width="1.6"
      opacity="${opacity}"
      stroke-linejoin="round"/>`;
  }).join('');

  return `
    <div class="petal-luxury-medallion ${lightMode ? 'is-light' : 'is-dark'}" role="img" aria-label="شعار نادي بتلات J الفاخر">
      <svg viewBox="0 0 240 260" fill="none" class="bloom-medallion-svg">
        <defs>
          <radialGradient id="bloomGlow-${lightMode ? 'l' : 'd'}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#D4AF7C" stop-opacity="${lightMode ? '0.22' : '0.35'}"/>
            <stop offset="60%" stop-color="#D9B7C0" stop-opacity="${lightMode ? '0.12' : '0.18'}"/>
            <stop offset="100%" stop-color="#D9B7C0" stop-opacity="0"/>
          </radialGradient>
          <linearGradient id="goldGradient-${lightMode ? 'l' : 'd'}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#EBD6BC"/>
            <stop offset="50%" stop-color="#D4AF7C"/>
            <stop offset="100%" stop-color="#9E743F"/>
          </linearGradient>
        </defs>

        <!-- Ambient glow disc -->
        <circle cx="120" cy="130" r="105" fill="url(#bloomGlow-${lightMode ? 'l' : 'd'})"/>

        <!-- Outer luxury arched frame -->
        <rect x="18" y="18" width="204" height="224" rx="102" stroke="url(#goldGradient-${lightMode ? 'l' : 'd'})" stroke-width="1.8" fill="${bgFill}"/>
        <rect x="25" y="25" width="190" height="210" rx="95" stroke="#D9B7C0" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.6"/>

        <!-- Sage leaves flanking the bottom -->
        <g opacity="0.9">
          <path d="M 120,195 C 100,210 75,200 65,185 C 80,185 105,190 120,195 Z" fill="#A7B79F" fill-opacity="0.65" stroke="#556B4E" stroke-width="1"/>
          <path d="M 120,195 C 140,210 165,200 175,185 C 160,185 135,190 120,195 Z" fill="#A7B79F" fill-opacity="0.65" stroke="#556B4E" stroke-width="1"/>
        </g>

        <!-- Radial luxury petals -->
        ${petalsSvg}

        <!-- Center multi-tiered bloom heart -->
        <circle cx="120" cy="130" r="28" fill="${lightMode ? '#F4ECE7' : '#4E343E'}" stroke="url(#goldGradient-${lightMode ? 'l' : 'd'})" stroke-width="1.6"/>
        <g transform="translate(120, 130)">
          <!-- Inner mini rosette -->
          <path d="M 0,-4 C -6,-12 -8,-18 0,-21 C 8,-18 6,-12 0,-4 Z" fill="#D4AF7C" fill-opacity="0.85" stroke="#9E743F" stroke-width="0.8"/>
          <path d="M 0,-4 C -6,-12 -8,-18 0,-21 C 8,-18 6,-12 0,-4 Z" transform="rotate(72)" fill="#D4AF7C" fill-opacity="0.85" stroke="#9E743F" stroke-width="0.8"/>
          <path d="M 0,-4 C -6,-12 -8,-18 0,-21 C 8,-18 6,-12 0,-4 Z" transform="rotate(144)" fill="#D4AF7C" fill-opacity="0.85" stroke="#9E743F" stroke-width="0.8"/>
          <path d="M 0,-4 C -6,-12 -8,-18 0,-21 C 8,-18 6,-12 0,-4 Z" transform="rotate(216)" fill="#D4AF7C" fill-opacity="0.85" stroke="#9E743F" stroke-width="0.8"/>
          <path d="M 0,-4 C -6,-12 -8,-18 0,-21 C 8,-18 6,-12 0,-4 Z" transform="rotate(288)" fill="#D4AF7C" fill-opacity="0.85" stroke="#9E743F" stroke-width="0.8"/>
          <circle cx="0" cy="0" r="6.5" fill="#FAF7F5" stroke="#D4AF7C" stroke-width="1.2"/>
          <circle cx="0" cy="0" r="2.8" fill="#D4AF7C"/>
        </g>

        <!-- Delicate star sparkles -->
        <path d="M 45,65 L 48,58 L 51,65 L 58,68 L 51,71 L 48,78 L 45,71 L 38,68 Z" fill="#D4AF7C" opacity="0.8"/>
        <path d="M 195,65 L 197,60 L 199,65 L 204,67 L 199,69 L 197,74 L 195,69 L 190,67 Z" fill="#D4AF7C" opacity="0.8"/>
      </svg>
    </div>
  `;
}
