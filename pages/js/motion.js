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
 * Pierre-Joseph Redouté archival botanical oval cameo system (CC0, Cleveland Museum of Art).
 * Displays clean uncropped plates inside double champagne passe-partout framing.
 */
export function renderSignatureBloomSVG(filledCount = 4, totalPetals = 8, lightMode = false) {
  const ratio = Math.max(0, Math.min(1, filledCount / Math.max(1, totalPetals)));
  const isAdvancedTier = lightMode || ratio >= 0.4;
  const imgSrc = lightMode
    ? '/J_BEAUTY/public/assets/images/botanical/rose-damascena.webp'
    : '/J_BEAUTY/public/assets/images/botanical/rose-bloom.webp';
  const stageClass = ratio >= 1 ? 'is-radiant' : ratio >= 0.4 ? 'is-bloom' : ratio > 0 ? 'is-opening' : 'is-bud';
  const alt = isAdvancedTier
    ? 'لوحة نباتية أرشيفية لوردة Rosa damascena'
    : 'لوحة نباتية أرشيفية لوردة متفتحة';

  return `
    <div class="petal-cameo ${lightMode ? 'is-ivory' : 'is-plum'} ${stageClass}" role="img" aria-label="${alt}">
      <div class="petal-cameo-ring">
        <div class="petal-cameo-mat">
          <img src="${imgSrc}" alt="" loading="eager" decoding="async">
        </div>
      </div>
    </div>
  `;
}
