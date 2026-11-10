import { descOf, esc, href, minutes, money, nameOf, page, safeURL, state, t } from './state.js';

export function monogramSvg(cls = 'brand-mark') {
  return `<svg class="${cls}" viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <circle cx="48" cy="48" r="44" stroke="#D4AF7C" stroke-width="1.4"/>
    <path d="M48 12C54 22 54 32 48 40C42 32 42 22 48 12Z" fill="#D9B7C0" fill-opacity="0.45" stroke="#503C45" stroke-width="1.2"/>
    <path d="M18 36C27 34 36 39 40 46C31 48 22 44 18 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="#503C45" stroke-width="1.2"/>
    <path d="M78 36C69 34 60 39 56 46C65 48 74 44 78 36Z" fill="#A7B79F" fill-opacity="0.45" stroke="#503C45" stroke-width="1.2"/>
    <path d="M53 34V61C53 70.5 46.5 76 38.5 76C32.5 76 28.5 72.5 28.5 68C28.5 64.5 31 62 34 62C36.8 62 38.5 64 38.5 66.2" stroke="#503C45" stroke-width="3.2" stroke-linecap="round"/>
    <circle cx="53" cy="25" r="2.6" fill="#D4AF7C"/>
  </svg>`;
}

export function icon(kind) {
  const icons = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
    spark: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>',
    shield: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/></svg>',
    user: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  };
  return icons[kind] || '';
}

export function header() {
  const cur = page();
  const navLinks = [
    ['home', 'الرئيسية', 'Home'],
    ['services', 'الخدمات', 'Services'],
    ['packages', 'الباقات', 'Packages'],
    ['petals', 'نادي بتلات J', 'J Petals Club'],
    ['reviews', 'الآراء', 'Reviews'],
    ['about', 'عن J SPA', 'About'],
  ];
  const accountRoute = state.user
    ? ['owner', 'employee'].includes(state.user.role)
      ? 'admin'
      : 'account'
    : 'login';

  return `
    <div class="announcement">
      ${t(
        'سبا نسائي منزلي في المدينة المنورة · مواعيد بتأكيد شخصي من فريقنا',
        'WOMEN’S HOME SPA · AL MADINAH · PERSONALLY CONFIRMED APPOINTMENTS',
      )}
    </div>
    <div class="header-shell">
      <header class="wrap header">
        <a class="brand" href="${href('home')}">
          ${monogramSvg()}
          <span class="brand-wordmark">
            <strong>J SPA</strong>
            <small>${t('سبا نسائي منزلي · المدينة', 'THE ART OF SLOW BEAUTY')}</small>
          </span>
        </a>
        <nav class="nav" id="nav" aria-label="${t('التنقل الرئيسي', 'Main navigation')}">
          ${navLinks
            .map(
              ([r, ar, en]) =>
                `<a href="${href(r)}" class="${cur === r ? 'active' : ''}">${t(ar, en)}</a>`,
            )
            .join('')}
          <div class="nav-mobile-cta">
            <a class="btn" href="${href('booking')}">${t('احجزي موعدكِ الآن', 'Book your moment')}</a>
          </div>
        </nav>
        <div class="header-tools">
          <button class="lang" id="language" type="button" aria-label="${t('Switch to English', 'التبديل للعربية')}">
            ${t('EN', 'عربي')}
          </button>
          <a class="account-pill" href="${href(accountRoute)}" aria-label="${t('حسابي', 'Account')}">
            ${icon('user')}
            <span>${state.user ? esc(state.user.name.split(' ')[0]) : t('حسابي', 'Account')}</span>
          </a>
          <a class="btn small header-book-btn" href="${href('booking')}">${t('احجزي موعدكِ', 'Book')}</a>
          <button class="menu" id="menu" type="button" aria-label="${t('فتح القائمة', 'Toggle menu')}" aria-expanded="false" aria-controls="nav">
            ${icon('menu')}
          </button>
        </div>
      </header>
    </div>
  `;
}

export function footer() {
  const s = state.catalog.settings || {};
  const waDigits = String(s.business_phone || '').replace(/\D/g, '');
  const socialLinks = ['instagram', 'tiktok']
    .filter((k) => safeURL(s[k]))
    .map(
      (k) =>
        `<a href="${esc(s[k])}" target="_blank" rel="noopener noreferrer">${k === 'instagram' ? 'Instagram' : 'TikTok'}</a>`,
    )
    .join('');

  return `
    <footer class="footer">
      <div class="wrap">
        <div class="footer-grid">
          <div>
            <a class="brand" href="${href('home')}">
              ${monogramSvg()}
              <span class="brand-wordmark">
                <strong>J SPA</strong>
                <small>${t('سبا نسائي منزلي', 'HOME SPA · MADINAH')}</small>
              </span>
            </a>
            <p>${t('لحظتكِ الخاصة… في راحة بيتكِ. خدمات مساج وعناية بالأظافر والجل مخصصة للسيدات في المدينة المنورة.', 'Your Moment of Beauty, At Home. Women-only massage, nail care, and gel rituals in Al Madinah.')}</p>
          </div>
          <div class="footer-links">
            <strong>${t('استكشفي', 'Explore')}</strong>
            ${[
              ['services', 'جميع الخدمات (13)', 'All services (13)'],
              ['packages', 'الباقات', 'Packages'],
              ['booking', 'طلب موعد منزلي', 'Request an appointment'],
              ['petals', 'نادي بتلات J', 'J Petals Club'],
              ['reviews', 'تجارب العميلات', 'Customer reviews'],
              ['faq', 'الأسئلة الشائعة', 'FAQ'],
            ]
              .map(([r, ar, en]) => `<a href="${href(r)}">${t(ar, en)}</a>`)
              .join('')}
          </div>
          <div class="footer-links">
            <strong>${t('المساندة والسياسات', 'Care & Policies')}</strong>
            ${[
              ['contact', 'تواصلي معنا', 'Contact'],
              ['policies', 'سياسة الحجز', 'Booking policies'],
              ['privacy', 'سياسة الخصوصية', 'Privacy policy'],
              ['terms', 'الشروط والأحكام', 'Terms & conditions'],
              ['admin', 'لوحة الفريق والإدارة', 'Staff access'],
            ]
              .map(([r, ar, en]) => `<a href="${href(r)}">${t(ar, en)}</a>`)
              .join('')}
            ${waDigits ? `<a href="https://wa.me/${esc(waDigits)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
            ${socialLinks}
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} J SPA · ${t('المدينة المنورة، المملكة العربية السعودية', 'Al Madinah, Saudi Arabia')}</span>
          <span>${t('للسيدات فقط · التأكيد يتم يدوياً عبر الفريق', 'Women only · Manual staff confirmation')}</span>
        </div>
      </div>
    </footer>
  `;
}

export const head = (title, sub = '', crumbs = []) => `
  <div class="page-head">
    ${
      crumbs.length
        ? `<nav class="breadcrumbs" aria-label="Breadcrumb">${crumbs
            .map(([label, route], idx) =>
              route && idx < crumbs.length - 1
                ? `<a href="${href(route)}">${esc(label)}</a> <span aria-hidden="true">/</span>`
                : `<span>${esc(label)}</span>`,
            )
            .join(' ')}</nav>`
        : `<span class="eyebrow">J SPA · ${t('المدينة المنورة', 'MADINAH')}</span>`
    }
    <h1>${title}</h1>
    ${sub ? `<p class="muted">${sub}</p>` : ''}
  </div>
`;

export const provisional = () =>
  state.catalog.settings?.business_approved
    ? ''
    : `<div class="notice">${t(
        'الأسعار والباقات والوصف الحالي تقديرية وقابلة للتعديل لحين اعتمادها النهائي من إدارة J SPA. إرسال الطلب لا يعني تأكيد الموعد.',
        'Current prices, packages, and service details are provisional pending business approval. Submitting a request does not confirm an appointment.',
      )}</div>`;

export function serviceArt(s, cls = '') {
  const src =
    s?.image && /^(\/[^/]|https:\/\/)/.test(s.image)
      ? s.image
      : `/assets/images/services/${s?.id || 'relaxation'}.webp`;
  const catLabel =
    s?.category === 'massage'
      ? t('المساج', 'Massage')
      : s?.category === 'nails'
        ? t('الأظافر', 'Nail care')
        : t('الجل', 'Gel');

  return `
    <div class="art ${cls}">
      <img src="${esc(src)}" alt="${esc(nameOf(s))}" loading="lazy">
      <span class="service-badge">${catLabel}</span>
    </div>
  `;
}

export function serviceCard(s) {
  return `
    <article class="service-card">
      <a href="${href('services/' + s.id)}">${serviceArt(s)}</a>
      <div class="service-body">
        <h3><a href="${href('services/' + s.id)}">${esc(nameOf(s))}</a></h3>
        <p>${esc(descOf(s))}</p>
        <div class="card-meta">
          <span>${minutes(s.duration)}</span>
          <span>${money(s.price)}</span>
        </div>
        <div class="service-actions">
          <a class="btn small" href="${href('booking')}?service=${esc(s.id)}">${t('احجزي الخدمة', 'Book')}</a>
          <a class="btn small light" href="${href('services/' + s.id)}">${t('التفاصيل', 'Details')}</a>
        </div>
      </div>
    </article>
  `;
}

export function packageCard(p, i) {
  const svcs = (p.service_ids || [])
    .map((id) => state.catalog.services.find((s) => s.id === id))
    .filter(Boolean);
  const saving = Math.max(0, Number(p.original_total || 0) - Number(p.price || 0));
  const tagline = p[`tagline_${state.lang}`] || '';

  return `
    <article class="package">
      <div class="package-top">
        <span class="number">0${i + 1}</span>
        ${saving > 0 ? `<span class="saving-pill">${t(`توفير ${money(saving)}`, `Save ${money(saving)}`)}</span>` : ''}
      </div>
      <h3>${esc(nameOf(p))}</h3>
      ${tagline ? `<p class="muted">${esc(tagline)}</p>` : ''}
      <div class="package-items">
        ${svcs.map((s) => `<span class="package-chip">${esc(nameOf(s))}</span>`).join('')}
      </div>
      <div class="package-footer">
        <div>
          <p class="price">${money(p.price)} <del>${money(p.original_total)}</del></p>
          <small class="muted">${minutes(p.duration)}</small>
        </div>
        <a class="btn small" href="${href('booking')}?package=${esc(p.id)}">${t('اختاري الباقة', 'Choose package')}</a>
      </div>
    </article>
  `;
}

export function reviewsContent(reviews = []) {
  if (!reviews.length) {
    return `
      <div class="empty">
        <h3>${t('نترك المساحة لتجربتكِ الحقيقية', 'A space for genuine experiences')}</h3>
        <p class="muted">${t(
          'تُعرض هنا التقييمات المرتبطة بزيارات منزلية مكتملة بعد مراجعتها واعتمادها من الإدارة. لا توجد تقييمات منشورة حتى الآن.',
          'Verified customer reviews from completed home visits appear here after moderation. No reviews have been published yet.',
        )}</p>
      </div>
    `;
  }
  return `
    <div class="grid">
      ${reviews
        .map(
          (r) => `
          <article class="card">
            <div class="stars" aria-label="${r.rating} / 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
            <p>${esc(r.body)}</p>
            <span class="muted">${esc(r.display_name || t('عميلة J SPA', 'J SPA guest'))} · ${t('زيارة مكتملة وموثقة', 'Verified completed visit')}</span>
          </article>
        `,
        )
        .join('')}
    </div>
  `;
}

export function petalBloomSVG(filledCount = 4, totalPetals = 8) {
  const petals = Array.from({ length: totalPetals }, (_, idx) => {
    const angle = -135 + idx * (270 / (totalPetals - 1));
    const active = idx < filledCount;
    return `<ellipse cx="100" cy="48" rx="14" ry="34" transform="rotate(${angle} 100 100)"
      fill="${active ? '#D9B7C0' : 'transparent'}"
      fill-opacity="${active ? '0.9' : '0'}"
      stroke="${active ? '#D4AF7C' : 'rgba(212,175,124,0.4)'}"
      stroke-width="1.6"/>`;
  }).join('');

  return `
    <svg class="petal-arc-svg" viewBox="0 0 200 165" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="66" stroke="rgba(212,175,124,0.22)" stroke-dasharray="3 4"/>
      ${petals}
      <circle cx="100" cy="100" r="16" fill="#D4AF7C" fill-opacity="0.22" stroke="#D4AF7C" stroke-width="1.5"/>
      <text x="100" y="105" text-anchor="middle" fill="#D4AF7C" font-family="Georgia, serif" font-size="16">J</text>
    </svg>
  `;
}

export function statusBadge(s) {
  const map = {
    pending_confirmation: [t('بانتظار التأكيد', 'Pending confirmation'), 'pending'],
    confirmed: [t('مؤكد', 'Confirmed'), ''],
    in_progress: [t('قيد التنفيذ', 'In progress'), ''],
    completed: [t('مكتمل', 'Completed'), ''],
    cancelled: [t('ملغي', 'Cancelled'), 'danger'],
    no_show: [t('لم تحضر', 'No show'), 'danger'],
  };
  const [label, cls] = map[s] || [esc(s), ''];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function fieldLabel(k) {
  return (
    {
      id: t('المرجع', 'Reference'),
      reference: t('رقم الطلب', 'Booking Ref'),
      created_at: t('التاريخ', 'Timestamp'),
      payment_verified_at: t('تاريخ التحقق', 'Verified At'),
      service_date: t('تاريخ الموعد', 'Service Date'),
      customer_name: t('العميلة', 'Customer'),
      booking_total: t('قيمة الحجز', 'Booking Value'),
      paid_amount: t('المدفوع', 'Paid'),
      refund_amount: t('المسترد', 'Refunded'),
      net_amount: t('الصافي', 'Net Revenue'),
      payment_method: t('الطريقة', 'Method'),
      payment_verified: t('الحالة', 'Status'),
      points: t('البتلات', 'Petals'),
      reason: t('السبب', 'Reason'),
      booking_id: t('الحجز', 'Booking'),
      status: t('الحالة', 'Status'),
      value: t('القيمة', 'Value'),
      name: t('الاسم', 'Name'),
      phone: t('الجوال', 'Phone'),
      verified: t('موثق', 'Verified'),
      role: t('الدور', 'Role'),
      action: t('الإجراء', 'Action'),
      actor_name: t('المنفّذ', 'Actor'),
      target: t('الهدف', 'Target'),
      detail: t('التفاصيل', 'Details'),
      metric: t('المؤشر', 'Metric'),
    }[k] || k.replaceAll('_', ' ')
  );
}

export function simpleTable(rows, keys) {
  if (!rows.length) {
    return `<div class="empty muted">${t('لا توجد سجلات بعد.', 'No records yet.')}</div>`;
  }
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${keys.map((k) => `<th>${esc(fieldLabel(k))}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) =>
                `<tr>${keys
                  .map((k) => {
                    const val = r[k];
                    const formatted =
                      val === null || val === undefined || val === ''
                        ? '—'
                        : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);
                    return `<td>${esc(formatted)}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function openDialog(content) {
  document.querySelector('#modal')?.remove();
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog id="modal">
      <div class="row" style="margin-bottom:14px">
        <span></span>
        <button class="btn light small" id="close-dialog" type="button">${t('إغلاق', 'Close')}</button>
      </div>
      ${content}
    </dialog>`,
  );
  const modal = document.querySelector('#modal');
  modal.showModal();
  document.querySelector('#close-dialog').onclick = () => modal.close();
}

export const field = (label, key, type = 'text', value = '', extra = '') =>
  `<label class="field">${label}<input name="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;

