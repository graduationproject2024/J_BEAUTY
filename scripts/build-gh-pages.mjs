import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHelpers, openDatabase } from '../server/db.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outArg = args.find((a) => !a.startsWith('--')) || 'dist-pages';
const baseFlag = args.find((a) => a.startsWith('--base='));
const BASE = (baseFlag ? baseFlag.slice(7) : '/J_BEAUTY').replace(/\/+$/, '');
const OUT_DIR = path.resolve(ROOT, outArg);
const PUBLIC_DIR = path.join(ROOT, 'public');

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
cpSync(PUBLIC_DIR, OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, '.nojekyll'), '');

// Export catalog data directly from the canonical SQLite seed schema
const db = openDatabase(':memory:');
const helpers = createHelpers(db);
const catalog = {
  services: helpers
    .services()
    .filter((s) => s.active)
    .map((s) => ({
      ...s,
      image: typeof s.image === 'string' && s.image.startsWith('/assets/') ? `${BASE}${s.image}` : s.image,
    })),
  packages: helpers.packages().filter((p) => p.active),
  settings: helpers.settings(),
  reviews: [],
  static_preview: true,
};
db.close();

mkdirSync(path.join(OUT_DIR, 'data'), { recursive: true });
writeFileSync(path.join(OUT_DIR, 'data', 'catalog.json'), JSON.stringify(catalog, null, 2));

const rewriteHtml = (html) =>
  html
    .replaceAll('href="/assets/', `href="${BASE}/assets/`)
    .replaceAll('src="/assets/', `src="${BASE}/assets/`)
    .replaceAll('href="/fonts/', `href="${BASE}/fonts/`)
    .replaceAll('href="/styles.css"', `href="${BASE}/styles.css"`)
    .replaceAll('href="/concepts.css"', `href="${BASE}/concepts.css"`)
    .replaceAll('src="/app.js"', `src="${BASE}/app.js"`)
    .replaceAll('src="/concepts.js"', `src="${BASE}/concepts.js"`)
    .replaceAll('href="/ar/booking"', `href="${BASE}/ar/booking"`)
    .replaceAll('href="/ar/"', `href="${BASE}/ar/"`);

const indexHtml = rewriteHtml(readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8'));
writeFileSync(path.join(OUT_DIR, 'index.html'), indexHtml);
writeFileSync(path.join(OUT_DIR, '404.html'), indexHtml);

const conceptsHtmlPath = path.join(OUT_DIR, 'concepts.html');
writeFileSync(conceptsHtmlPath, rewriteHtml(readFileSync(conceptsHtmlPath, 'utf8')));

for (const cssFile of ['styles.css', 'concepts.css']) {
  const p = path.join(OUT_DIR, cssFile);
  writeFileSync(p, readFileSync(p, 'utf8').replaceAll("url('/fonts/", "url('./fonts/"));
}

const rewriteAssetStrings = (code) =>
  code
    .replaceAll('"/assets/', `"${BASE}/assets/`)
    .replaceAll("'/assets/", `'${BASE}/assets/`)
    .replaceAll('`/assets/', `\`${BASE}/assets/`);

// Update app.js internal route link selector for subpath deployment
const appPath = path.join(OUT_DIR, 'app.js');
let appCode = rewriteAssetStrings(readFileSync(appPath, 'utf8'));
appCode = appCode.replace(
  'document.querySelectorAll(`a[href^="/${state.lang}/"]`)',
  "document.querySelectorAll(`a[href^=\"${href('')}\"]`)",
);
writeFileSync(appPath, appCode);

// Clarify static preview status in header announcement on GitHub Pages build
const componentsPath = path.join(OUT_DIR, 'js', 'components.js');
let compCode = rewriteAssetStrings(readFileSync(componentsPath, 'utf8'));
compCode = compCode.replace(
  "t(\n        'سبا نسائي منزلي في المدينة المنورة · مواعيد بتأكيد شخصي من فريقنا',\n        'WOMEN’S HOME SPA · AL MADINAH · PERSONALLY CONFIRMED APPOINTMENTS',\n      )",
  "t(\n        'معاينة واجهة J SPA على GitHub Pages · سبا نسائي منزلي في المدينة المنورة (للحجوزات الفعلية يلزم خادم Node.js)',\n        'J SPA GITHUB PAGES PREVIEW · AL MADINAH WOMEN’S HOME SPA (LIVE BOOKINGS REQUIRE NODE.JS SERVER)',\n      )",
);
writeFileSync(componentsPath, compCode);

for (const file of ['atelier.js', 'booking.js', 'experiences.js', 'motion.js', 'pages-public.js', 'account.js', 'admin.js']) {
  const p = path.join(OUT_DIR, 'js', file);
  writeFileSync(p, rewriteAssetStrings(readFileSync(p, 'utf8')));
}

// Replace js/state.js network API wrapper cleanly with deterministic client-side static preview engine
const statePath = path.join(OUT_DIR, 'js', 'state.js');
let stateCode = readFileSync(statePath, 'utf8');

const staticHelpers = `
const SITE_BASE =
  location.pathname === '${BASE}' || location.pathname.startsWith('${BASE}/') ? '${BASE}' : '';

function strippedPath() {
  return SITE_BASE && location.pathname.startsWith(SITE_BASE)
    ? location.pathname.slice(SITE_BASE.length) || '/'
    : location.pathname;
}

function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
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
        reasons_ar.push(\`يناسب وقتكِ (\${svc.duration} دقيقة)\`);
        reasons_en.push(\`Fits comfortably within \${svc.duration} min\`);
      } else score -= 20;
      if (svc.price <= maxBudget) {
        score += 25;
        reasons_ar.push(\`ضمن ميزانيتكِ (\${svc.price} ر.س)\`);
        reasons_en.push(\`Within your \${maxBudget} SAR budget (\${svc.price} SAR)\`);
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
        reasons_ar.push(\`المدة المجمعة \${pkg.duration} دقيقة ضمن وقتكِ\`);
        reasons_en.push(\`Total combined duration (\${pkg.duration} min) fits your window\`);
      } else score -= 18;
      if (pkg.price <= maxBudget) {
        score += 24;
        const saving = Math.max(0, (pkg.original_total || 0) - pkg.price);
        reasons_ar.push(saving > 0 ? \`ضمن ميزانيتكِ (\${pkg.price} ر.س بتوفير \${saving} ر.س)\` : \`ضمن ميزانيتكِ (\${pkg.price} ر.س)\`);
        reasons_en.push(saving > 0 ? \`Within budget (\${pkg.price} SAR, saving \${saving} SAR)\` : \`Within budget (\${pkg.price} SAR)\`);
      } else score -= 25;
      results.push({ kind: 'package', item: pkg, score, reasons_ar, reasons_en });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.item.price - b.item.price).slice(0, 4);
}
`;

stateCode = stateCode.replace(
  "lang: location.pathname.split('/')[1] === 'en' ? 'en' : 'ar',",
  "lang: strippedPath().split('/')[1] === 'en' ? 'en' : 'ar',",
);
stateCode = stateCode.replace(
  "export const href = (r = '') => `/${state.lang}/${r}`;",
  "export const href = (r = '') => `${SITE_BASE}/${state.lang}/${r}`;",
);
stateCode = stateCode.replace(
  "const raw = location.pathname.split('/').slice(2).join('/') || 'home';",
  "const raw = strippedPath().split('/').slice(2).join('/') || 'home';",
);

const apiRegex = /export async function api\(path, body\) \{[\s\S]*?\n\}/;
stateCode = stateCode.replace(
  apiRegex,
  `let cachedCatalog = null;
export async function api(path, body) {
  if (path === '/session') return { user: null, csrfToken: 'github-pages-preview' };
  if (path === '/catalog') {
    if (!cachedCatalog) {
      const r = await fetch(\`\${SITE_BASE}/data/catalog.json\`);
      cachedCatalog = await r.json();
    }
    return cachedCatalog;
  }
  if (path === '/telemetry/event') return { ok: true };
  if (path === '/studio/recommend') return { recommendations: recommendStaticRituals(body) };
  if (path.startsWith('/atelier/styles/') && body === undefined) {
    const code = decodeURIComponent(path.split('/').pop() || '');
    return { style: decodeShare(code) };
  }
  if (path === '/atelier/styles') {
    if (!body?.share) {
      throw new Error(t(
        'حفظ التصاميم في جواز الجمال يتطلب تشغيل خادم Node.js. يمكنكِ استخدام «إنشاء رابط مشاركة» مباشرة في هذه المعاينة.',
        'Saving styles requires the live Node.js backend. Use “Share Look” directly in this static preview.',
      ));
    }
    const share_code = encodeShare({
      name: body.name || '',
      shape: body.shape,
      length: body.length,
      polish_color: body.polish_color,
      french_style: body.french_style,
      tip_color: body.tip_color,
      finish: body.finish,
      accent: body.accent,
      skin: body.skin,
    });
    try { localStorage.setItem('jspa_style_' + share_code, JSON.stringify(body)); } catch {}
    return { style: { ...body, share_code } };
  }
  if (path === '/bookings') {
    if (!body?.date || !body?.time || !body?.name || !body?.phone || !body?.neighborhood) {
      throw new Error(t('يرجى استكمال جميع الحقول المطلوبة.', 'Please fill in all required booking fields.'));
    }
    const svcs = state.catalog?.services || [];
    const pkgs = state.catalog?.packages || [];
    const pkg = body.package_id ? pkgs.find((p) => p.id === body.package_id) : null;
    const chosen = pkg ? [pkg] : svcs.filter((s) => (body.service_ids || []).includes(s.id));
    if (!chosen.length) throw new Error(t('يرجى اختيار خدمة أو باقة.', 'Please select a service or package.'));
    const total = pkg ? pkg.price : chosen.reduce((a, b) => a + Number(b.price || 0), 0);
    const ref = 'J-PREVIEW-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const lines = chosen.map((x) => nameOf(x)).join(' + ');
    const msg = t(
      \`[معاينة استعراضية — GitHub Pages]\\nمرجع الطلب: \${ref}\\nالخدمة: \${lines}\\nالتاريخ والوقت: \${body.date} · \${body.time}\\nالحي: \${body.neighborhood}\\nالاسم: \${body.name}\\nالجوال: \${body.phone}\\nالإجمالي التقديري: \${total} ر.س\\n* ملاحظة: هذه معاينة واجهة على GitHub Pages ولم يُحفظ الطلب على خادم.\`,
      \`[Static UI Preview — GitHub Pages]\\nReference: \${ref}\\nSelection: \${lines}\\nDate & Time: \${body.date} · \${body.time}\\nNeighborhood: \${body.neighborhood}\\nName: \${body.name}\\nMobile: \${body.phone}\\nEstimated Total: \${total} SAR\\n* Note: GitHub Pages runs UI preview only; no server database record was created.\`,
    );
    return { booking: { reference: ref, estimated_total: total }, estimated_total: total, message: msg, whatsapp_url: '' };
  }
  if (path === '/group-requests') {
    const ref = 'JG-PREVIEW-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    return {
      group_request: { reference: ref },
      whatsapp_url: '',
      message: t(\`[معاينة مناسبة] المرجع: \${ref} — التاريخ: \${body?.date || ''}\`, \`[Occasion Preview] Ref: \${ref} — Date: \${body?.date || ''}\`),
    };
  }
  if (path === '/gift-requests') {
    const ref = 'GIFT-PREVIEW-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    return {
      gift_request: { reference: ref },
      whatsapp_url: '',
      message: t(\`[معاينة إهداء] المرجع: \${ref} — المُهدى إليها: \${body?.recipient_name || ''}\`, \`[Gift Preview] Ref: \${ref} — Recipient: \${body?.recipient_name || ''}\`),
    };
  }
  throw new Error(t(
    'هذه الصفحة تحتاج إلى تشغيل خادم Node.js 24 وقاعدة بيانات SQLite (المعاينة الحالية تعمل بشكل ثابت على GitHub Pages).',
    'Live customer accounts, loyalty persistence, and Admin require the Node.js 24 + SQLite backend (GitHub Pages is static preview only).',
  ));
}`,
);

writeFileSync(statePath, staticHelpers + '\n' + stateCode);
console.log(`Built static GitHub Pages showcase in ${OUT_DIR} (base="${BASE || '/'}")`);

