/* Pure shared escaping, localization & formatting utilities — zero auth/admin logic */
export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);

export function makeI18n(getLang) {
  const t = (ar, en) => (getLang() === 'ar' ? ar : en);
  const nameOf = (o) => o?.[`name_${getLang()}`] || o?.name || '';
  const descOf = (o) => o?.[`description_${getLang()}`] || '';
  const num = (v) => Number(v || 0).toLocaleString(getLang() === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
  const money = (v) => `${num(v)} ${t('ر.س', 'SAR')}`;
  const minutes = (v) => `${num(v)} ${t('دقيقة', 'min')}`;
  return { t, nameOf, descOf, num, money, minutes };
}

export function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function monogramSvg(cls = 'brand-mark') {
  return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <circle cx="48" cy="48" r="44" stroke="#D4AF7C" stroke-width="1.6"/>
    <path d="M48 12C54 22 54 32 48 40C42 32 42 22 48 12Z" fill="#D9B7C0" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M18 36C27 34 36 39 40 46C31 48 22 44 18 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M78 36C69 34 60 39 56 46C65 48 74 44 78 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="currentColor" stroke-width="1.2"/>
    <path d="M53 34V61C53 70.5 46.5 76 38.5 76C32.5 76 28.5 72.5 28.5 68C28.5 64.5 31 62 34 62C36.8 62 38.5 64 38.5 66.2" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="53" cy="25" r="2.6" fill="#D4AF7C"/>
  </svg>`;
}

