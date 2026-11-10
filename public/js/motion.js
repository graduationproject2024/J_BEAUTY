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
    if (rect.top < window.innerHeight * 0.96) {
      el.classList.add('is-revealed');
    } else {
      revealObserver.observe(el);
    }
  });
}

/**
 * Hand-crafted botanical peony / rose engraving for J Petals Club.
 * Progressively unfurls outer & inner organic layers tied to verified petal accrual,
 * using GPU-only transform & opacity transitions without clutter or fake counters.
 */
export function renderSignatureBloomSVG(filledCount = 4, totalPetals = 8, lightMode = false) {
  const ratio = Math.max(0, Math.min(1, filledCount / Math.max(1, totalPetals)));
  const uidPrefix = lightMode ? 'blm-l' : 'blm-d';
  const outlineMuted = lightMode ? 'rgba(80, 60, 69, 0.22)' : 'rgba(212, 175, 124, 0.34)';
  const veinStroke = lightMode ? 'rgba(80, 60, 69, 0.16)' : 'rgba(212, 175, 124, 0.28)';
  const centerFill = lightMode ? '#FBF7F4' : '#352F32';
  const monogramColor = lightMode ? '#503C45' : '#D4AF7C';

  // Asymmetrical botanical outer guard petals + staggered cupped rose petals + inner rosette
  const outerPetals = [
    { d: 'M130 112 C116 74 96 48 118 32 C131 23 145 27 152 38 C161 52 146 84 130 112 Z', vein: 'M131 100 C128 74 132 52 134 38', thresh: 0.12 },
    { d: 'M135 114 C156 80 189 63 206 79 C219 92 213 114 196 122 C176 131 152 124 135 114 Z', vein: 'M144 114 C168 102 188 94 202 86', thresh: 0.28 },
    { d: 'M134 120 C166 120 198 136 196 161 C195 178 175 186 157 175 C142 166 135 142 134 120 Z', vein: 'M143 128 C164 139 178 153 187 166', thresh: 0.44 },
    { d: 'M125 120 C122 146 112 174 92 178 C74 182 61 164 66 144 C71 124 98 118 125 120 Z', vein: 'M116 128 C98 140 84 154 76 166', thresh: 0.60 },
    { d: 'M126 113 C98 121 67 118 55 98 C45 81 55 59 75 58 C97 57 114 82 126 113 Z', vein: 'M115 107 C94 94 78 82 66 72', thresh: 0.76 },
  ];

  const midPetals = [
    { d: 'M130 113 C112 88 111 58 131 50 C150 43 161 68 146 95 C140 105 135 110 130 113 Z', thresh: 0.20 },
    { d: 'M134 115 C154 94 181 95 185 116 C188 134 166 141 146 129 C140 124 136 120 134 115 Z', thresh: 0.36 },
    { d: 'M132 121 C154 134 164 160 144 170 C127 178 114 157 122 135 C125 127 128 123 132 121 Z', thresh: 0.52 },
    { d: 'M126 119 C104 140 78 139 76 118 C75 98 98 92 117 107 C121 111 124 115 126 119 Z', thresh: 0.70 },
    { d: 'M128 114 C96 104 82 81 96 66 C109 53 132 72 132 97 C132 106 130 110 128 114 Z', thresh: 0.86 },
  ];

  const innerHeart = [
    { d: 'M130 112 C117 98 119 77 132 75 C144 73 149 91 136 106 Z', thresh: 0.05 },
    { d: 'M134 117 C148 106 160 117 151 129 C142 140 129 129 131 120 Z', thresh: 0.10 },
    { d: 'M126 117 C113 128 102 116 112 104 C121 94 133 105 128 114 Z', thresh: 0.16 },
  ];

  const renderLayer = (list, gradId, baseOp, delayOffset) =>
    list
      .map((p, idx) => {
        const lit = ratio >= p.thresh;
        const delayMs = delayOffset + idx * 45;
        return `<g class="bloom-petal ${lit ? 'is-bloomed lit' : ''}" style="--petal-delay:${delayMs}ms;transform-origin:130px 116px">
          <path d="${p.d}"
            fill="${lit ? `url(#${gradId})` : 'transparent'}"
            fill-opacity="${lit ? baseOp : '0'}"
            stroke="${lit ? '#D4AF7C' : outlineMuted}"
            stroke-width="${lit ? '1.15' : '1'}"
            stroke-linecap="round"
            stroke-linejoin="round"/>
          ${p.vein ? `<path d="${p.vein}" stroke="${lit ? veinStroke : outlineMuted}" stroke-width="0.85" stroke-linecap="round" fill="none" opacity="${lit ? '0.85' : '0.4'}"/>` : ''}
        </g>`;
      })
      .join('');

  return `
    <svg class="signature-bloom" viewBox="0 0 260 250" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="${uidPrefix}-outer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FBF7F4" stop-opacity="0.96"/>
          <stop offset="55%" stop-color="#E7C9D1" stop-opacity="0.94"/>
          <stop offset="100%" stop-color="#C9AEB6" stop-opacity="0.92"/>
        </linearGradient>
        <linearGradient id="${uidPrefix}-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F7ECEE" stop-opacity="0.98"/>
          <stop offset="100%" stop-color="#D9B7C0" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="${uidPrefix}-inner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FBF7F4"/>
          <stop offset="100%" stop-color="#E4C1CB"/>
        </linearGradient>
        <linearGradient id="${uidPrefix}-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#B9C8B1" stop-opacity="0.88"/>
          <stop offset="100%" stop-color="#7F9176" stop-opacity="0.85"/>
        </linearGradient>
        <filter id="${uidPrefix}-soft" x="-12%" y="-12%" width="124%" height="124%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#352F32" flood-opacity="0.16"/>
        </filter>
      </defs>

      <!-- Delicate Botanical Stem & Asymmetric Calyx Leaves -->
      <g opacity="0.92">
        <path d="M130 165 C128 192 124 214 117 236" stroke="#8FA185" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M126 196 C104 188 85 196 78 214 C98 220 115 212 126 196 Z" fill="url(#${uidPrefix}-leaf)" stroke="#607257" stroke-width="0.9"/>
        <path d="M122 199 C106 202 94 207 84 212" stroke="#607257" stroke-width="0.7" opacity="0.6"/>
        <path d="M127 205 C149 194 169 197 179 212 C161 223 142 218 127 205 Z" fill="url(#${uidPrefix}-leaf)" stroke="#607257" stroke-width="0.9"/>
        <path d="M131 206 C147 207 160 209 172 211" stroke="#607257" stroke-width="0.7" opacity="0.6"/>
        <circle cx="152" cy="186" r="2.2" fill="#D4AF7C" opacity="0.55"/>
        <circle cx="101" cy="182" r="1.8" fill="#D4AF7C" opacity="0.45"/>
      </g>

      <!-- Botanical Hairline Frame Arc -->
      <circle cx="130" cy="116" r="92" stroke="${outlineMuted}" stroke-dasharray="2.5 5" stroke-width="1"/>

      <!-- Outer Guard Petals -> Mid Cupped Petals -> Inner Heart Rosette -->
      <g filter="url(#${uidPrefix}-soft)">
        ${renderLayer(outerPetals, `${uidPrefix}-outer`, '0.88', 0)}
        ${renderLayer(midPetals, `${uidPrefix}-mid`, '0.94', 120)}
        ${renderLayer(innerHeart, `${uidPrefix}-inner`, '0.98', 220)}
      </g>

      <!-- Whisper-light Gold Stamen Dots & Brand Crest -->
      <circle cx="130" cy="116" r="21" fill="${centerFill}" stroke="#D4AF7C" stroke-width="1.3"/>
      <circle cx="130" cy="116" r="17.5" stroke="#D4AF7C" stroke-opacity="0.45" stroke-width="0.7"/>
      <text x="130" y="123" text-anchor="middle" fill="${monogramColor}" font-family="Newsreader, Georgia, serif" font-style="italic" font-size="22">J</text>
    </svg>
  `;
}
