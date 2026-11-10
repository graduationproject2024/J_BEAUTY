export const $ = (s) => document.querySelector(s);

export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);

export const state = {
  lang: location.pathname.split('/')[1] === 'en' ? 'en' : 'ar',
  user: null,
  csrf: '',
  catalog: { services: [], packages: [], settings: {}, reviews: [] },
  account: null,
  favorites: [],
  admin: null,
  adminTab: 'overview',
  adminBookingFilter: 'pending_confirmation',
  adminCalendarDate: '',
  adminBookingsPage: 1,
  adminAuditPage: 1,
  adminLedgerPage: 1,
  bookingStep: 1,
  bookingMode: 'services',
  bookingCategory: '',
  summaryExpanded: false,
  bookingResult: null,
  filter: 'all',
  homeMood: 'unwind',
  lookbookFilter: 'all',
  atelier: {
    name: '',
    shape: 'almond',
    length: 'medium',
    polish_color: '#F3DCE1',
    french_style: 'classic',
    tip_color: '#FBF7F4',
    finish: 'gloss',
    accent: 'none',
    skin: 'warm',
    lightX: 45,
    lastShareUrl: '',
  },
  studio: {
    mood: 'unwind',
    minutes_available: 75,
    budget: 260,
    format: 'either',
    results: [],
  },
  groupDraft: {
    organizer_name: '',
    organizer_phone: '',
    date: '',
    time: '',
    neighborhood: '',
    participants: [
      { label: 'ضيفة 1', service_ids: ['relaxation'] },
      { label: 'ضيفة 2', service_ids: ['classic'] },
    ],
  },
  groupResult: null,
  giftResult: null,
  draft: {
    service_ids: [],
    package_id: null,
    date: '',
    time: '',
    name: '',
    phone: '',
    neighborhood: '',
    notes: '',
    terms: false,
    idempotency_key: crypto.randomUUID(),
  },
};

export const t = (ar, en) => (state.lang === 'ar' ? ar : en);
export const nameOf = (o) => o?.[`name_${state.lang}`] || o?.name || '';
export const descOf = (o) => o?.[`description_${state.lang}`] || '';
export const money = (v) =>
  `${Number(v || 0).toLocaleString(state.lang === 'ar' ? 'ar-SA' : 'en-US')} ${t('ر.س', 'SAR')}`;
export const minutes = (v) => `${v || 0} ${t('دقيقة', 'min')}`;
export const href = (r = '') => `/${state.lang}/${r}`;

export function page() {
  const raw = location.pathname.split('/').slice(2).join('/') || 'home';
  const clean = raw.replace(/\/$/, '') || 'home';
  if (clean === 'loyalty') return 'petals';
  if (clean === 'passport') return 'account';
  return clean;
}

export function safeURL(s) {
  try {
    return ['https:', 'http:'].includes(new URL(s).protocol);
  } catch {
    return false;
  }
}

export function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.style.display = 'none';
  }, 4200);
}

export async function api(path, body) {
  const res = await fetch('/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || t('تعذر إتمام الطلب', 'Request failed'));
  return data;
}

export async function refreshSession() {
  const r = await api('/session');
  state.user = r.user;
  state.csrf = r.csrfToken;
  if (r.user?.role === 'customer' && !state.favorites.length) {
    try {
      const acc = await api('/account');
      state.account = acc;
      state.favorites = acc.passport?.favorites || [];
    } catch {}
  }
  return r;
}

export function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function isStaff() {
  return state.user?.role === 'owner' || state.user?.role === 'employee';
}

export function isOwner() {
  return state.user?.role === 'owner';
}
