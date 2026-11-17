
const SITE_BASE =
  location.pathname === '/J_BEAUTY' || location.pathname.startsWith('/J_BEAUTY/') ? '/J_BEAUTY' : '';

function strippedPath() {
  return SITE_BASE && location.pathname.startsWith(SITE_BASE)
    ? location.pathname.slice(SITE_BASE.length) || '/'
    : location.pathname;
}

function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeShare(code) {
  try {
    const raw = localStorage.getItem('jspa_style_' + code);
    if (raw) return JSON.parse(raw);
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64 + '==='.slice((b64.length + 3) % 4);
    const bin = atob(pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function recommendStaticRituals(input = {}) {
  const services = state.catalog?.services || [];
  const packages = state.catalog?.packages || [];
  const mood = String(input.mood || 'unwind');
  const maxMinutes = Number(input.minutes_available || 120);
  const maxBudget = Number(input.budget || 600);
  const format = String(input.format || 'either');
  const moodCategories = {
    unwind: ['massage'],
    pamper: ['massage', 'nails'],
    nails: ['nails', 'gel'],
    occasion: ['gel', 'nails', 'massage'],
  };
  const preferredCats = moodCategories[mood] || ['massage', 'nails', 'gel'];
  const results = [];

  if (format !== 'package') {
    for (const svc of services) {
      let score = 0;
      const reasons_ar = [];
      const reasons_en = [];
      const catRank = preferredCats.indexOf(svc.category);
      if (catRank !== -1) {
        score += 40 - catRank * 10;
        reasons_ar.push('تتوافق مع نوع العناية الذي اخترتِه');
        reasons_en.push('Matches your desired service preference');
      }
      if (svc.duration <= maxMinutes) {
        score += 25;
        reasons_ar.push(`يناسب وقتكِ (${svc.duration} دقيقة)`);
        reasons_en.push(`Fits comfortably within ${svc.duration} min`);
      } else score -= 20;
      if (svc.price <= maxBudget) {
        score += 25;
        reasons_ar.push(`ضمن ميزانيتكِ (${svc.price} ر.س)`);
        reasons_en.push(`Within your ${maxBudget} SAR budget (${svc.price} SAR)`);
      } else score -= 25;
      if (svc.credentials_required && !svc.credentials_approved) {
        reasons_ar.push('ملاحظة: تتطلب اعتماد المؤهلات من الإدارة قبل التأكيد');
        reasons_en.push('Note: requires credential approval before confirmation');
      }
      results.push({ kind: 'service', item: svc, score, reasons_ar, reasons_en });
    }
  }

  if (format !== 'single') {
    for (const pkg of packages) {
      let score = 10;
      const reasons_ar = [];
      const reasons_en = [];
      const pkgSvcs = services.filter((sv) => pkg.service_ids.includes(sv.id));
      const catHits = pkgSvcs.filter((sv) => preferredCats.includes(sv.category)).length;
      score += catHits * 18;
      if (catHits > 0) {
        reasons_ar.push('باقة متكاملة تجمع خدمات متوافقة مع اختياركِ');
        reasons_en.push('Combines complementary services aligned with your goal');
      }
      if (pkg.duration <= maxMinutes) {
        score += 22;
        reasons_ar.push(`المدة المجمعة ${pkg.duration} دقيقة ضمن وقتكِ`);
        reasons_en.push(`Total combined duration (${pkg.duration} min) fits your window`);
      } else score -= 18;
      if (pkg.price <= maxBudget) {
        score += 24;
        const saving = Math.max(0, (pkg.original_total || 0) - pkg.price);
        reasons_ar.push(saving > 0 ? `ضمن ميزانيتكِ (${pkg.price} ر.س بتوفير ${saving} ر.س)` : `ضمن ميزانيتكِ (${pkg.price} ر.س)`);
        reasons_en.push(saving > 0 ? `Within budget (${pkg.price} SAR, saving ${saving} SAR)` : `Within budget (${pkg.price} SAR)`);
      } else score -= 25;
      results.push({ kind: 'package', item: pkg, score, reasons_ar, reasons_en });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.item.price - b.item.price).slice(0, 4);
}

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
  lang: typeof location !== 'undefined' && location.pathname ? (location.pathname.split('/')[1] === 'en' ? 'en' : 'ar') : 'ar',
  user: null,
  csrf: '',
  catalog: { services: [], packages: [], settings: {}, reviews: [] },
  account: null,
  favorites: [],
  bookingStep: 1,
  bookingMode: 'services',
  bookingCategory: '',
  summaryExpanded: false,
  bookingResult: null,
  occasionStep: 1,
  occasionGuestTab: 0,
  filter: 'all',
  homeMood: 'unwind',
  lookbookFilter: 'all',
  atelier: {
    name: '',
    shape: 'almond',
    length: 'medium',
    polish_color: '#F3DCE1',
    french_style: 'classic',
    tip_color: '#F5EFE8',
    finish: 'gloss',
    accent: 'none',
    skin: 'warm',
    lightX: 42,
    cameraPreset: 'editorial',
    activeTab: 'shape',
    includeRemoval: false,
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
    occasion_type: 'bridal',
    organizer_name: '',
    organizer_phone: '',
    date: '',
    time: '',
    neighborhood: '',
    notes: '',
    participants: [
      { label: '', service_ids: ['relaxation'] },
      { label: '', service_ids: ['classic'] },
    ],
  },
  occasionCatFilter: 'all',
  groupResult: null,
  giftResult: null,
  draft: {
    service_ids: [],
    package_id: null,
    add_ons: [],
    coupon: null,
    coupon_code: '',
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
export const num = (v) =>
  Number(v || 0).toLocaleString(state.lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US');
export const money = (v) => `${num(v)} ${t('ر.س', 'SAR')}`;
export const minutes = (v) => `${num(v)} ${t('دقيقة', 'min')}`;
export const href = (r = '') => `${SITE_BASE}/${state.lang}/${r}`;

export function page() {
  const raw = strippedPath().split('/').slice(2).join('/') || 'home';
  const clean = raw.replace(/\/$/, '') || 'home';
  if (clean === 'loyalty') return 'petals';
  if (clean === 'passport') return 'account';
  if (clean === 'group-booking') return 'occasions';
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

export async function api(path, body, isRetry = false) {
  if (body !== undefined && !state.csrf && path !== '/session') {
    try {
      await refreshSession();
    } catch {}
  }
  const res = await fetch('/api' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? {}
        : { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403 && data.error === 'Invalid CSRF token' && !isRetry) {
      await refreshSession();
      return api(path, body, true);
    }
    throw new Error(data.error || t('تعذر إتمام الطلب', 'Request failed'));
  }
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
    } catch { }
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
