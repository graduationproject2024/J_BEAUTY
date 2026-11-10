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
  admin: null,
  adminTab: 'overview',
  adminBookingFilter: 'pending_confirmation',
  adminCalendarDate: '',
  bookingStep: 1,
  bookingMode: 'services',
  bookingCategory: 'all',
  summaryExpanded: false,
  bookingResult: null,
  filter: 'all',
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
  return clean === 'loyalty' ? 'petals' : clean;
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

