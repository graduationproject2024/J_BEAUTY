import { $, api, esc, href, minutes, money, nameOf, num, riyadhToday, state, t, toast } from './state.js';
import { field, head, provisional } from './components.js';
import { trackFunnel } from './motion.js';

export function studioPage() {
  const s = state.studio;
  const results = s.results || [];
  const allSvcs = state.catalog.services || [];
  const imgFor = (rec) => {
    if (rec.kind === 'package') {
      const first = allSvcs.find((sv) => sv.id === rec.item.service_ids?.[0]);
      return first?.image || '/assets/images/hero-sanctuary.webp';
    }
    return rec.item?.image || `/assets/images/services/${rec.item?.id}.webp`;
  };

  const moodOpts = [
    ['unwind', t('استرخاء وتهدئة', 'Unwind & Massage')],
    ['pamper', t('عناية متكاملة', 'Personal Pampering')],
    ['nails', t('تجديد الأظافر', 'Nails & Gel')],
    ['occasion', t('مناسبة خاصة', 'Special Occasion')],
  ];
  const timeOpts = [45, 75, 120, 180];
  const budgetOpts = [150, 260, 380, 550];
  const formatOpts = [
    ['either', t('الأنسب لي', 'Show both')],
    ['single', t('خدمة مفردة', 'Single ritual')],
    ['package', t('باقة متكاملة', 'Curated package')],
  ];

  return `
    <main id="main" class="wrap">
      ${head(
        t('استوديو اختيار الخدمات', 'J Ritual Studio'),
        t('حدّدي تفضيلاتكِ الأربعة لنرشّح لكِ الأنسب من خدماتنا وباقاتنا المعتمدة بأسعارها ومددها الفعلية.', 'Share 4 preferences to view tailored, catalog-verified services and packages with transparent pricing.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('استوديو الاختيار', 'J Ritual Studio'), '']],
      )}
      <div class="studio-layout split">
        <form id="studio-form" class="card studio-form-card">
          <span class="eyebrow">${t('تفضيلات الجلسة', 'PREFERENCES')}</span>
          <input type="hidden" name="mood" value="${esc(s.mood)}">
          <input type="hidden" name="minutes_available" value="${esc(s.minutes_available)}">
          <input type="hidden" name="budget" value="${esc(s.budget)}">
          <input type="hidden" name="format" value="${esc(s.format)}">

          <div class="control-group">
            <span class="control-label">${t('١. ما نوع العناية التي ترغبين بها؟', '1. What kind of care would you like?')}</span>
            <div class="chip-row studio-chip-grid">
              ${moodOpts
                .map(
                  ([val, label]) =>
                    `<button type="button" class="mini-chip ${s.mood === val ? 'active' : ''}" data-studio-opt="mood" data-val="${val}">${label}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٢. الوقت المتاح', '2. Available time')}</span>
            <div class="chip-row">
              ${timeOpts
                .map(
                  (m) =>
                    `<button type="button" class="mini-chip ${Number(s.minutes_available) === m ? 'active' : ''}" data-studio-opt="minutes_available" data-val="${m}">${t(`حتى ${num(m)} دقيقة`, `Up to ${num(m)} min`)}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٣. الميزانية التقديرية', '3. Budget (SAR)')}</span>
            <div class="chip-row">
              ${budgetOpts
                .map(
                  (b) =>
                    `<button type="button" class="mini-chip ${Number(s.budget) === b ? 'active' : ''}" data-studio-opt="budget" data-val="${b}">${t(`حتى ${money(b)}`, `Up to ${money(b)}`)}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">${t('٤. هل تفضلين خدمة مفردة أم باقة؟', '4. Single service or package?')}</span>
            <div class="chip-row">
              ${formatOpts
                .map(
                  ([val, label]) =>
                    `<button type="button" class="mini-chip ${s.format === val ? 'active' : ''}" data-studio-opt="format" data-val="${val}">${label}</button>`,
                )
                .join('')}
            </div>
          </div>

          <button class="btn" type="submit" style="width:100%">${t('تحديث الاقتراحات', 'Update tailored suggestions')}</button>
        </form>

        <div class="studio-results-col">
          <div class="row" style="margin-bottom:14px">
            <h2 style="margin:0;font-size:22px">${t('الاقتراحات المطابقة لقائمتنا', 'Catalog-Matched Suggestions')}</h2>
            ${results.length ? `<span class="badge">${num(results.length)} ${t('خيارات', 'matches')}</span>` : ''}
          </div>
          ${
            results.length
              ? `<div class="studio-cards">
                  ${results
                    .map((r, idx) => {
                      const item = r.item;
                      const reasons = r[`reasons_${state.lang}`] || [];
                      const bookUrl =
                        r.kind === 'package'
                          ? `${href('booking')}?package=${esc(item.id)}`
                          : `${href('booking')}?service=${esc(item.id)}`;
                      const detailUrl = r.kind === 'package' ? href('packages') : href('services/' + item.id);
                      return `
                      <article class="card studio-reco-card ${idx === 0 ? 'is-top-match' : ''}">
                        <img class="studio-thumb" src="${esc(imgFor(r))}" alt="${esc(nameOf(item))}" loading="lazy">
                        <div class="studio-reco-body">
                          <div class="row" style="margin-bottom:4px">
                            <span class="badge">${idx === 0 ? t('الأنسب لاختياركِ', 'Best Match') : r.kind === 'package' ? t('باقة', 'Package') : t('خدمة', 'Service')}</span>
                            <strong><bdi>${money(item.price)}</bdi> · <bdi>${minutes(item.duration)}</bdi></strong>
                          </div>
                          <h3>${esc(nameOf(item))}</h3>
                          <ul class="studio-reasons muted">
                            ${reasons.slice(0, 3).map((rs) => `<li>${esc(rs)}</li>`).join('')}
                          </ul>
                          <div class="hero-actions" style="gap:8px;margin-top:10px">
                            <a class="btn small" href="${bookUrl}">${t('اطلبي هذا الخيار', 'Book this option')}</a>
                            <a class="btn small light" href="${detailUrl}">${t('التفاصيل', 'Details')}</a>
                          </div>
                        </div>
                      </article>
                    `;
                    })
                    .join('')}
                </div>`
              : `<div class="card empty-compact muted">
                   <p style="margin-bottom:10px">${t('جاري مطابقة خياراتكِ من كتالوج J Beauty المعتمد…', 'Matching your preferences against verified J Beauty services…')}</p>
                   <div class="hero-actions" style="gap:8px">
                     <a class="btn small light" href="${href('services')}">${t('تصفحي الخدمات (13)', 'Browse all services')}</a>
                     <a class="btn small light" href="${href('packages')}">${t('استعرضي الباقات', 'View packages')}</a>
                   </div>
                 </div>`
          }
        </div>
      </div>
    </main>
  `;
}

export function lookbookPage() {
  const f = state.lookbookFilter || 'all';
  const entries = [
    {
      cat: 'massage',
      img: '/assets/images/services/hot-stone.webp',
      ar: 'سكينة الأحجار الدافئة',
      en: 'Warm Basalt Sanctuary',
      sub_ar: 'مساج الأحجار الساخنة · 60 دقيقة · 265 ر.س',
      sub_en: 'Hot Stone Massage · 60 min · 265 SAR',
      link: href('services/hot-stone'),
    },
    {
      cat: 'nails',
      img: '/assets/images/services/french-tip.webp',
      ar: 'فرنش كلاسيكي ناعم',
      en: 'Timeless Ivory French Tip',
      sub_ar: 'منيكير فرنش تيب · قاعدة وردية شفافة',
      sub_en: 'French Tip Manicure · Sheer blush base',
      link: href('services/french-tip'),
    },
    {
      cat: 'gel',
      img: '/assets/images/services/colored-french.webp',
      ar: 'أطراف مريمية عصرية',
      en: 'Sage Micro-French Gel',
      sub_ar: 'جل فرنسي بأطراف ملونة · 60 دقيقة',
      sub_en: 'Colored French Gel · 60 min',
      link: href('atelier'),
    },
    {
      cat: 'nails',
      img: '/assets/images/services/pedicure.webp',
      ar: 'طقوس العناية بالقدمين',
      en: 'Rose-Petal Foot Sanctuary',
      sub_ar: 'بديكير دافئ ببتلات الورد · 45 دقيقة',
      sub_en: 'Warm Rose-Petal Pedicure · 45 min',
      link: href('services/pedicure'),
    },
    {
      cat: 'gel',
      img: '/assets/images/services/french-gel.webp',
      ar: 'لمعان الفرنش الزجاجي',
      en: 'Glass-Shine French Gel',
      sub_ar: 'جل فرنسي ثابت · مثالي للمناسبات',
      sub_en: 'Long-wear French Gel · Occasion ready',
      link: href('services/french-gel'),
    },
    {
      cat: 'massage',
      img: '/assets/images/services/lymphatic.webp',
      ar: 'جلسة الخفة والانتعاش',
      en: 'Rose Quartz & Calm Flow',
      sub_ar: 'التصريف اللمفاوي · يتطلب اعتماد المؤهلات',
      sub_en: 'Lymphatic Drainage · Credential approval required',
      link: href('services/lymphatic'),
    },
  ];
  const visible = entries.filter((e) => f === 'all' || e.cat === f);

  return `
    <main id="main" class="wrap">
      ${head(
        t('معرض الإطلالات والأناقة', 'Beauty Lookbook'),
        t('أفكار منسّقة للجلسات والأظافر من صورنا المعتمدة مع رابط مباشر للتنفيذ أو التصميم.', 'Curated home spa and nail aesthetics linking straight to services or the interactive Nail Atelier.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('معرض الإطلالات', 'Lookbook'), '']],
      )}
      <div class="filter">
        ${[
          ['all', 'الكل', 'All'],
          ['massage', 'المساج', 'Massage'],
          ['nails', 'الأظافر', 'Nails'],
          ['gel', 'الجل', 'Gel'],
        ]
          .map(([id, ar, en]) => `<button type="button" data-lookbook-filter="${id}" class="${f === id ? 'active' : ''}">${t(ar, en)}</button>`)
          .join('')}
      </div>
      <div class="grid section-tight" style="padding-top:0">
        ${visible
          .map(
            (e) => `
          <article class="service-card">
            <div class="art"><img src="${e.img}" alt="${esc(t(e.ar, e.en))}" loading="lazy"></div>
            <div class="service-body">
              <h3>${esc(t(e.ar, e.en))}</h3>
              <p>${esc(t(e.sub_ar, e.sub_en))}</p>
              <a class="btn small light" href="${e.link}">${t('استكشفي الإطلالة', 'Explore look')}</a>
            </div>
          </article>
        `,
          )
          .join('')}
      </div>
    </main>
  `;
}

const OCCASION_TYPES = [
  ['bridal', 'تجهيز عروس وصديقاتها', 'Bridal Preparation', 'تنسيق جلسات العروس وقريباتها في المنزل'],
  ['family', 'لقاء عائلي مريح', 'Family Gathering', 'جلسات استرخاء وأظافر للأمهات والأخوات'],
  ['gathering', 'جمعة صديقات وقهوة', 'Friends Ritual', 'تجربة سبا نسائية مشتركة في راحة البيت'],
  ['eid', 'تهيئة عيد ومناسبة خاصة', 'Celebration & Eid Prep', 'تجهيز جماعي أنيق قبل العيد أو الحفل'],
];

const displayGuestLabel = (p, idx) => {
  const raw = String(p?.label || '').trim();
  if (!raw || /^(المستفيدة|Guest|Participant)\s*\d+$/i.test(raw)) {
    return t(`المستفيدة ${num(idx + 1)}`, `Participant ${num(idx + 1)}`);
  }
  return raw;
};

export function groupBookingPage() {
  const g = state.groupDraft;
  const s = state.catalog.settings || {};
  const svcs = state.catalog.services || [];
  const step = Math.min(5, Math.max(1, Number(state.occasionStep || 1)));
  state.occasionStep = step;
  const guestIdx = Math.min(Math.max(0, Number(state.occasionGuestTab || 0)), g.participants.length - 1);
  state.occasionGuestTab = guestIdx;

  const defaultDate = new Date(Date.parse(riyadhToday() + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  if (!g.organizer_name && state.user?.name) g.organizer_name = state.user.name;
  if (!g.organizer_phone && state.user?.phone) g.organizer_phone = state.user.phone;
  if (!g.date) g.date = defaultDate;
  if (!g.time) g.time = '17:00';
  if (!g.neighborhood && state.account?.passport?.preferences?.preferred_neighborhood) {
    g.neighborhood = state.account.passport.preferences.preferred_neighborhood;
  }

  let totalEst = 0;
  let totalMin = 0;
  for (const p of g.participants) {
    for (const id of p.service_ids) {
      const found = svcs.find((x) => x.id === id);
      if (found) {
        totalEst += found.price;
        totalMin += found.duration;
      }
    }
  }

  if (state.groupResult) {
    const r = state.groupResult;
    return `
      <main id="main" class="wrap">
        ${head(t('تم تسجيل طلب تنسيق المناسبة', 'Occasion Request Saved'))}
        <div class="content card">
          <div class="success">
            <h3>${t('بانتظار موافقة الإدارة ومراجعة السعة', 'Awaiting Operations Approval & Capacity Review')}</h3>
            <p>${t('رقم الطلب:', 'Reference:')} <strong><bdi>${esc(r.group_request.reference)}</bdi></strong></p>
          </div>
          <p class="muted">${t('لا يتم تأكيد طلبات المناسبات آلياً. أرسلي التفاصيل عبر واتساب لمراجعة توفر الفريق.', 'Occasion requests are never auto-confirmed. Send via WhatsApp for team capacity coordination.')}</p>
          ${r.whatsapp_url ? `<a class="btn sage" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">${t('فتح واتساب', 'Open WhatsApp')}</a>` : ''}
          <pre style="margin-top:14px">${esc(r.message)}</pre>
          <button type="button" class="btn light" id="new-group-req">${t('طلب تنسيق مناسبة جديدة', 'New occasion request')}</button>
        </div>
      </main>
    `;
  }

  const wizardSteps = [
    [1, 'المناسبة والمنسّقة', 'Occasion & Host'],
    [2, 'المستفيدات', 'Participants'],
    [3, 'الخدمات', 'Services'],
    [4, 'الموعد والحي', 'Date & Area'],
    [5, 'المراجعة', 'Review'],
  ];

  const renderStepBody = () => {
    if (step === 1) {
      return `
        <h3>${t('١. نوع المناسبة وبيانات المنسّقة', '1. Occasion Type & Coordinator')}</h3>
        <span class="control-label">${t('اختاري طابع المناسبة', 'Select occasion style')}</span>
        <div class="occasion-type-grid">
          ${OCCASION_TYPES.map(
            ([id, ar, en, sub]) => `
              <button type="button" class="occasion-type-card ${g.occasion_type === id ? 'is-selected' : ''}" data-occ-type="${id}">
                <strong>${t(ar, en)}</strong>
                <small>${t(sub, en)}</small>
              </button>
            `,
          ).join('')}
        </div>
        <div class="form-grid">
          ${field(t('اسم منسّقة المناسبة', 'Coordinator name'), 'organizer_name', 'text', g.organizer_name, 'required')}
          ${field(t('رقم الجوال السعودي', 'Saudi mobile'), 'organizer_phone', 'tel', g.organizer_phone, 'required placeholder="05xxxxxxxx"')}
        </div>
      `;
    }

    if (step === 2) {
      return `
        <h3>${t('٢. عدد المستفيدات وأسماؤهن (من ٢ إلى ٥)', '2. Participants (2 to 5 guests)')}</h3>
        <div class="occasion-count-bar">
          <div>
            <strong>${t('عدد المستفيدات في الجلسة', 'Number of participants')}</strong>
            <div class="muted">${t('الحد الأدنى مستفيدتان والحد الأقصى خمس مستفيدات.', 'Minimum 2 and maximum 5 guests per home request.')}</div>
          </div>
          <div class="occasion-count-stepper">
            <button type="button" id="occ-dec-guest" ${g.participants.length <= 2 ? 'disabled' : ''} aria-label="${t('إنقاص العدد', 'Decrease guests')}">−</button>
            <span>${num(g.participants.length)} ${t('مستفيدات', 'guests')}</span>
            <button type="button" id="occ-inc-guest" ${g.participants.length >= 5 ? 'disabled' : ''} aria-label="${t('زيادة العدد', 'Increase guests')}">+</button>
          </div>
        </div>
        ${g.participants
          .map(
            (p, idx) => `
              <div class="card occasion-guest-card">
                <div class="row" style="margin-bottom:8px">
                  <strong>${t(`المستفيدة ${num(idx + 1)}`, `Participant ${num(idx + 1)}`)}</strong>
                  ${g.participants.length > 2 ? `<button type="button" class="btn small light" data-remove-guest="${idx}">${t('إزالة', 'Remove')}</button>` : ''}
                </div>
                <label class="field" style="margin-bottom:0">
                  ${t('الاسم أو الصفة (مثلاً: العروس، أختي، والدتي)', 'Name or role (e.g. Bride, Sister, Mom)')}
                  <input type="text" data-guest-label="${idx}" value="${esc(displayGuestLabel(p, idx))}" maxlength="60" required>
                </label>
              </div>
            `,
          )
          .join('')}
      `;
    }

    if (step === 3) {
      const activeGuest = g.participants[guestIdx];
      const catFilter = state.occasionCatFilter || 'all';
      const visibleSvcs = catFilter === 'all' ? svcs : svcs.filter((sv) => sv.category === catFilter);
      return `
        <div class="row" style="margin-bottom:10px">
          <h3 style="margin:0">${t('٣. اختاري خدمات كل مستفيدة', '3. Services per Participant')}</h3>
          <div class="chip-row">
            ${[
              ['all', 'الكل', 'All'],
              ['massage', 'المساج', 'Massage'],
              ['nails', 'الأظافر', 'Nails'],
              ['gel', 'الجل', 'Gel'],
            ]
              .map(
                ([id, ar, en]) =>
                  `<button type="button" class="mini-chip ${catFilter === id ? 'active' : ''}" data-occ-cat="${id}">${t(ar, en)}</button>`,
              )
              .join('')}
          </div>
        </div>
        <div class="occasion-tabs" role="tablist" aria-label="${t('تبويبات المستفيدات', 'Participant service tabs')}">
          ${g.participants
            .map((p, idx) => {
              const label = displayGuestLabel(p, idx);
              return `
                <button type="button" role="tab" aria-selected="${guestIdx === idx}" class="occasion-tab ${guestIdx === idx ? 'active' : ''}" data-occ-tab="${idx}">
                  <span>${num(idx + 1)}. ${esc(label)}</span>
                  <span class="badge">${num(p.service_ids.length)}</span>
                </button>
              `;
            })
            .join('')}
        </div>
        <div class="card occasion-guest-card" style="margin-bottom:0">
          <div class="row" style="margin-bottom:10px">
            <strong>${esc(displayGuestLabel(activeGuest, guestIdx))}</strong>
            <span class="muted">${num(activeGuest.service_ids.length)} ${t('خدمات مختارة (1 إلى 6)', 'selected (1 to 6)')}</span>
          </div>
          <div class="occasion-svc-grid" data-guest-services="${guestIdx}">
            ${visibleSvcs
              .map((sv) => {
                const active = activeGuest.service_ids.includes(sv.id);
                return `
                  <label class="occasion-svc-chip ${active ? 'is-selected' : ''}">
                    <input type="checkbox" data-guest-svc="${guestIdx}" value="${esc(sv.id)}" ${active ? 'checked' : ''}>
                    <span>${esc(nameOf(sv))}</span>
                    <small><bdi>${money(sv.price)}</bdi> · <bdi>${minutes(sv.duration)}</bdi></small>
                  </label>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    if (step === 4) {
      const openTime = s.opening_time || '09:00';
      const closeTime = s.closing_time || '22:00';
      const workingDays = s.working_days || [0, 1, 2, 3, 4, 5, 6];
      const blocked = new Set(s.blocked_dates || []);
      const nextDays = Array.from({ length: 7 }, (_, i) => {
        const dt = new Date(Date.parse(riyadhToday() + 'T12:00:00+03:00') + (i + 1) * 86400000);
        const iso = dt.toISOString().slice(0, 10);
        const weekday = dt.getUTCDay();
        return { iso, label: iso.slice(5), disabled: blocked.has(iso) || !workingDays.includes(weekday) };
      });
      const suggestedTimes = ['10:00', '13:00', '16:00', '18:30', '20:00'].filter(
        (slot) => slot >= openTime && slot <= closeTime,
      );
      return `
        <h3>${t('٤. التاريخ والوقت والحي في المدينة', '4. Date, Time & Neighborhood')}</h3>
        <div class="time-chips">
          ${nextDays
            .map(
              (d) =>
                `<button type="button" class="time-chip ${g.date === d.iso ? 'active' : ''}" ${d.disabled ? 'disabled' : ''} data-occ-date="${d.iso}">${d.label}</button>`,
            )
            .join('')}
        </div>
        <div class="form-grid">
          ${field(t('التاريخ المفضل', 'Preferred date'), 'date', 'date', g.date, `required min="${riyadhToday()}"`)}
          ${field(t('الوقت المفضل', 'Preferred time'), 'time', 'time', g.time, 'required')}
        </div>
        ${
          suggestedTimes.length
            ? `<div class="time-chips">${suggestedTimes
                .map((slot) => `<button type="button" class="time-chip ${g.time === slot ? 'active' : ''}" data-occ-time="${slot}">${slot}</button>`)
                .join('')}</div>`
            : ''
        }
        <label class="field">
          ${t('الحي في المدينة المنورة', 'Madinah neighborhood')}
          ${
            s.areas?.length
              ? `<select name="neighborhood" required><option value="">${t('اختاري الحي', 'Select')}</option>${s.areas.map((a) => `<option value="${esc(a)}" ${g.neighborhood === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>`
              : `<input name="neighborhood" value="${esc(g.neighborhood)}" required>`
          }
        </label>
        <label class="field">
          ${t('ملاحظات تنسيقية إضافية (اختياري)', 'Additional notes (optional)')}
          <textarea name="notes" maxlength="800" placeholder="${t('مثال: نرغب بمختصتين متزامنتين أو ملاحظات تجهيز خاصة...', 'Optional notes for team coordination...')}">${esc(g.notes || '')}</textarea>
        </label>
      `;
    }

    const occMeta = OCCASION_TYPES.find((x) => x[0] === g.occasion_type) || OCCASION_TYPES[0];
    return `
      <h3>${t('٥. مراجعة طلب المناسبة والإرسال', '5. Review & Submit Request')}</h3>
      <div class="occasion-review-card">
        <div class="row"><strong>${t(occMeta[1], occMeta[2])}</strong><button type="button" class="btn small light" data-occ-jump="1">${t('تعديل', 'Edit')}</button></div>
        <div class="muted">${esc(g.organizer_name)} · <bdi>${esc(g.organizer_phone)}</bdi></div>
        <div class="muted"><bdi>${esc(g.date)}</bdi> · <bdi>${esc(g.time)}</bdi> · ${esc(g.neighborhood)}</div>
      </div>
      ${g.participants
        .map((p, idx) => {
          const pSvcs = p.service_ids.map((id) => svcs.find((x) => x.id === id)).filter(Boolean);
          const sub = pSvcs.reduce((a, b) => a + Number(b.price || 0), 0);
          return `
            <div class="occasion-review-card">
              <div class="row">
                <strong>${esc(displayGuestLabel(p, idx))}</strong>
                <strong>${money(sub)}</strong>
              </div>
              <div class="muted">${pSvcs.map((sv) => esc(nameOf(sv))).join(' + ')}</div>
            </div>
          `;
        })
        .join('')}
      <label class="check" style="margin-top:12px">
        <input type="checkbox" name="terms" required>
        <span>${t('أوافق على السياسات وأفهم أن طلب المناسبة ينتظر موافقة الفريق وتوفر المختصات.', 'I accept the terms and understand occasion requests await team capacity approval.')}</span>
      </label>
    `;
  };

  return `
    <main id="main" class="wrap">
      ${head(
        t('تنسيق جلسات المناسبات', 'Occasion Experiences'),
        t('نسّقي جلسات العناية والاسترخاء والأظافر لمنزلكِ في المدينة المنورة لاحتفالاتكِ ومناسباتكِ في خمس خطوات واضحة.', 'Arrange coordinated home spa and nail sessions in Madinah across 5 guided steps (2 to 5 participants).'),
        [[t('الرئيسية', 'Home'), 'home'], [t('تنسيق جلسات المناسبات', 'Occasion Experiences'), '']],
      )}
      <div class="progress five" role="navigation" aria-label="${t('خطوات تنسيق المناسبة', 'Occasion wizard steps')}">
        ${wizardSteps
          .map(
            ([n, ar, en]) => `
              <span class="${step === n ? 'current' : step > n ? 'done' : ''}" ${n < step ? `data-occ-jump="${n}" style="cursor:pointer"` : ''}>
                <b>${num(n)}</b>
                <em>${t(ar, en)}</em>
              </span>
            `,
          )
          .join('')}
      </div>
      <div class="notice">${t(
        'تخضع طلبات المناسبات لمراجعة فريق العمليات وتنسيق الطاقة الاستيعابية وعدد المختصات قبل أي تأكيد.',
        'Occasion coordination requests strictly require operations review and specialist allocation before confirmation.',
      )}</div>
      ${provisional()}
      <form id="group-form" class="occasion-layout booking-layout">
        <div class="card booking-main">
          <div id="form-error" role="alert"></div>
          ${renderStepBody()}
          <div class="form-actions" style="margin-top:18px;display:flex;justify-content:space-between;gap:12px">
            ${step > 1 ? `<button type="button" class="btn light" id="occ-prev">${t('السابق', 'Back')}</button>` : '<span></span>'}
            ${
              step < 5
                ? `<button type="button" class="btn" id="occ-next">${t('التالي', 'Continue')}</button>`
                : `<button type="submit" class="btn">${t('إرسال طلب تنسيق المناسبة', 'Submit Occasion Request')}</button>`
            }
          </div>
        </div>

        <aside class="summary occasion-summary">
          <span class="eyebrow" style="margin-bottom:8px">${t('ملخص المناسبة التقديري', 'ESTIMATED OCCASION SUMMARY')}</span>
          <h3>${num(g.participants.length)} ${t('مستفيدات', 'Participants')}</h3>
          ${g.participants
            .map((p, idx) => {
              const pSvcs = p.service_ids.map((id) => svcs.find((x) => x.id === id)).filter(Boolean);
              const subTotal = pSvcs.reduce((a, b) => a + Number(b.price || 0), 0);
              return `<div class="summary-line"><span>${esc(displayGuestLabel(p, idx))} (${num(p.service_ids.length)})</span><span>${money(subTotal)}</span></div>`;
            })
            .join('')}
          <div class="summary-line">
            <span>${t('المدة الإجمالية التقديرية', 'Estimated duration')}</span>
            <strong><bdi>${minutes(totalMin)}</bdi></strong>
          </div>
          <div class="summary-line summary-total">
            <span>${t('الإجمالي التقديري', 'Estimated total')}</span>
            <span><bdi>${money(totalEst)}</bdi></span>
          </div>
          <p class="muted" style="margin-top:12px;margin-bottom:0">${t(
            'يتطلب تأكيد طلبات المناسبات مراجعة السعة وعدد المختصات يدوياً عبر واتساب.',
            'Team capacity and specialist allocation are confirmed manually via WhatsApp.',
          )}</p>
        </aside>
      </form>
    </main>
  `;
}

export function giftsPage() {
  if (state.giftResult) {
    const r = state.giftResult;
    return `
      <main id="main" class="wrap">
        ${head(t('تم حفظ طلب الإهداء', 'Gift Request Saved'))}
        <div class="content card">
          <div class="success">
            <h3>${t('بانتظار مراجعة الفريق وتوثيق الدفع اليدوي', 'Pending Staff Review & Manual Payment Verification')}</h3>
            <p>${t('مرجع الإهداء:', 'Gift Reference:')} <strong><bdi>${esc(r.gift_request.reference)}</bdi></strong></p>
          </div>
          <p class="muted">${t('لا يُفعّل الإهداء كرصيد مدفوع إلا بعد تحقق الموظفة من السداد. يمكنكِ إرسال التفاصيل الآن عبر واتساب.', 'Gift cards are activated only after manual staff payment verification.')}</p>
          ${r.whatsapp_url ? `<a class="btn sage" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">${t('فتح واتساب لتنسيق الإهداء', 'Open WhatsApp')}</a>` : ''}
          <pre style="margin-top:14px">${esc(r.message)}</pre>
          <button type="button" class="btn light" id="new-gift-req">${t('إعداد إهداء آخر', 'Create another gift request')}</button>
        </div>
      </main>
    `;
  }

  return `
    <main id="main" class="wrap">
      ${head(
        t('أهدي لحظة عناية', 'Gift a Ritual'),
        t('أعدّي بطاقة إهداء إلكترونية أنيقة يتم تنسيقها واعتمادها يدوياً مع فريق J Beauty.', 'Prepare a thoughtful digital gift voucher request coordinated manually with our team.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('الإهداء', 'Gift a Ritual'), '']],
      )}
      <div class="notice">${t(
        'تنويه شفاف: الموقع لا يبيع بطاقات مدفوعة إلكترونياً بشكل آلي. تسجيل الإهداء يُنشئ طلباً يُفعّل بعد مراجعة الفريق وتوثيق التحويل أو الدفع يدوياً.',
        'Transparent workflow: this form submits a manual gift request. Gift cards become redeemable only after staff confirms payment.',
      )}</div>
      <form id="gift-form" class="card content">
        <div id="form-error" role="alert"></div>
        <div class="form-grid">
          ${field(t('اسم المُهدِية', 'Your name'), 'sender_name', 'text', state.user?.name || '', 'required')}
          ${field(t('جوالكِ السعودي', 'Your Saudi mobile'), 'sender_phone', 'tel', state.user?.phone || '', 'required placeholder="05xxxxxxxx"')}
        </div>
        ${field(t('اسم المُهدى إليها', 'Recipient name'), 'recipient_name', 'text', '', 'required')}
        <label class="field">
          ${t('اختاري باقة أو خدمة للإهداء', 'Choose a package or service')}
          <select name="gift_choice" required>
            <optgroup label="${t('الباقات', 'Packages')}">
              ${(state.catalog.packages || []).map((p) => `<option value="pkg:${esc(p.id)}">${esc(nameOf(p))} · ${money(p.price)}</option>`).join('')}
            </optgroup>
            <optgroup label="${t('الخدمات', 'Services')}">
              ${(state.catalog.services || []).map((s) => `<option value="svc:${esc(s.id)}">${esc(nameOf(s))} · ${money(s.price)}</option>`).join('')}
            </optgroup>
          </select>
        </label>
        <label class="field">
          ${t('رسالة الإهداء الشخصية (اختياري)', 'Personal message (optional)')}
          <textarea name="personal_message" maxlength="350" placeholder="${t('أتمنى لكِ لحظة هادئة ومليئة بالجمال...', 'Wishing you a calm and restorative moment...')}"></textarea>
        </label>
        <label class="check">
          <input type="checkbox" name="terms" required>
          <span>${t('أفهم أن الإهداء طلب يدوي يُفعّل فقط بعد تأكيد الفريق والدفع.', 'I understand this is a manual request activated only after staff confirmation and payment.')}</span>
        </label>
        <button type="submit" class="btn">${t('تسجيل طلب الإهداء', 'Submit Gift Request')}</button>
      </form>
    </main>
  `;
}

export function bindExperiences(renderFn) {
  async function runStudioRecommend(submitBtn) {
    try {
      const r = await api('/studio/recommend', state.studio);
      state.studio.results = r.recommendations || [];
      state.studio._autoLoaded = true;
      renderFn();
    } catch (err) {
      toast(err.message);
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  // Populate initial recommendations automatically upon visiting /studio so no empty box appears
  if ($('#studio-form') && !state.studio._autoLoaded && !state.studio.results.length) {
    state.studio._autoLoaded = true;
    runStudioRecommend();
  }

  document.querySelectorAll('[data-studio-opt]').forEach((btn) => {
    btn.onclick = () => {
      const key = btn.dataset.studioOpt;
      const val = btn.dataset.val;
      state.studio[key] = ['minutes_available', 'budget'].includes(key) ? Number(val) : val;
      const hidden = document.querySelector(`#studio-form [name="${key}"]`);
      if (hidden) hidden.value = val;
      document.querySelectorAll(`[data-studio-opt="${key}"]`).forEach((x) => x.classList.toggle('active', x === btn));
      runStudioRecommend();
    };
  });

  $('#studio-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    state.studio = {
      ...state.studio,
      mood: d.mood,
      minutes_available: Number(d.minutes_available),
      budget: Number(d.budget),
      format: d.format,
    };
    if (e.submitter) e.submitter.disabled = true;
    await runStudioRecommend(e.submitter);
  });

  document.querySelectorAll('[data-lookbook-filter]').forEach((b) => {
    b.onclick = () => {
      state.lookbookFilter = b.dataset.lookbookFilter;
      renderFn();
    };
  });

  const syncGroupDraft = () => {
    const f = $('#group-form');
    if (!f) return;
    for (const k of ['organizer_name', 'organizer_phone', 'date', 'time', 'neighborhood', 'notes']) {
      if (f.elements[k]) state.groupDraft[k] = f.elements[k].value;
    }
    state.groupDraft.participants.forEach((p, idx) => {
      const lbl = f.querySelector(`[data-guest-label="${idx}"]`);
      const boxes = [...f.querySelectorAll(`[data-guest-svc="${idx}"]`)];
      if (lbl) p.label = lbl.value;
      if (boxes.length) p.service_ids = boxes.filter((b) => b.checked).map((b) => b.value);
    });
  };

  const addGuest = () => {
    syncGroupDraft();
    if (state.groupDraft.participants.length < 5) {
      state.groupDraft.participants.push({
        label: t(`المستفيدة ${state.groupDraft.participants.length + 1}`, `Guest ${state.groupDraft.participants.length + 1}`),
        service_ids: ['relaxation'],
      });
      renderFn();
    }
  };

  $('#occ-inc-guest')?.addEventListener('click', addGuest);
  $('#occ-dec-guest')?.addEventListener('click', () => {
    syncGroupDraft();
    if (state.groupDraft.participants.length > 2) {
      state.groupDraft.participants.pop();
      state.occasionGuestTab = Math.min(state.occasionGuestTab, state.groupDraft.participants.length - 1);
      renderFn();
    }
  });

  document.querySelectorAll('[data-occ-type]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      state.groupDraft.occasion_type = b.dataset.occType;
      renderFn();
    };
  });

  document.querySelectorAll('[data-occ-tab]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      state.occasionGuestTab = Number(b.dataset.occTab);
      renderFn();
    };
  });

  document.querySelectorAll('[data-occ-cat]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      state.occasionCatFilter = b.dataset.occCat;
      renderFn();
    };
  });

  document.querySelectorAll('[data-occ-date]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      state.groupDraft.date = b.dataset.occDate;
      renderFn();
    };
  });

  document.querySelectorAll('[data-occ-time]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      state.groupDraft.time = b.dataset.occTime;
      renderFn();
    };
  });

  document.querySelectorAll('[data-occ-jump]').forEach((el) => {
    el.onclick = () => {
      syncGroupDraft();
      state.occasionStep = Number(el.dataset.occJump);
      renderFn();
    };
  });

  document.querySelectorAll('[data-remove-guest]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      const idx = Number(b.dataset.removeGuest);
      if (state.groupDraft.participants.length > 2) {
        state.groupDraft.participants.splice(idx, 1);
        state.occasionGuestTab = Math.min(state.occasionGuestTab, state.groupDraft.participants.length - 1);
        renderFn();
      }
    };
  });

  document.querySelectorAll('[data-guest-svc]').forEach((chk) => {
    chk.onchange = () => {
      syncGroupDraft();
      renderFn();
    };
  });

  $('#occ-prev')?.addEventListener('click', () => {
    syncGroupDraft();
    state.occasionStep = Math.max(1, state.occasionStep - 1);
    renderFn();
  });

  $('#occ-next')?.addEventListener('click', () => {
    syncGroupDraft();
    const g = state.groupDraft;
    const errBox = $('#form-error');
    if (errBox) errBox.innerHTML = '';

    if (state.occasionStep === 1) {
      if (!String(g.organizer_name || '').trim()) {
        if (errBox) errBox.innerHTML = `<div class="error">${t('يرجى كتابة اسم منسّقة المناسبة', 'Please enter coordinator name')}</div>`;
        return;
      }
      if (!/^(\+?966|0)?5\d{8}$/.test(String(g.organizer_phone || '').replace(/\s+/g, ''))) {
        if (errBox) errBox.innerHTML = `<div class="error">${t('يرجى إدخال رقم جوال سعودي صحيح (05xxxxxxxx)', 'Please enter a valid Saudi mobile number (05xxxxxxxx)')}</div>`;
        return;
      }
    } else if (state.occasionStep === 2) {
      if (g.participants.some((p) => !String(p.label || '').trim())) {
        if (errBox) errBox.innerHTML = `<div class="error">${t('يرجى كتابة اسم أو صفة كل مستفيدة', 'Please enter a name or role for each participant')}</div>`;
        return;
      }
    } else if (state.occasionStep === 3) {
      const missingIdx = g.participants.findIndex((p) => !Array.isArray(p.service_ids) || !p.service_ids.length);
      if (missingIdx !== -1) {
        state.occasionGuestTab = missingIdx;
        renderFn();
        $('#form-error').innerHTML = `<div class="error">${t('يرجى اختيار خدمة واحدة على الأقل لكل مستفيدة (1–6 خدمات)', 'Please select at least 1 service for each participant')}</div>`;
        return;
      }
      if (g.participants.some((p) => p.service_ids.length > 6)) {
        if (errBox) errBox.innerHTML = `<div class="error">${t('الحد الأقصى 6 خدمات لكل مستفيدة', 'Maximum 6 services per participant')}</div>`;
        return;
      }
    } else if (state.occasionStep === 4) {
      if (!g.date || g.date < riyadhToday() || !g.time || !String(g.neighborhood || '').trim()) {
        if (errBox) errBox.innerHTML = `<div class="error">${t('يرجى اختيار التاريخ والوقت والحي في المدينة المنورة', 'Please select preferred date, time, and Madinah neighborhood')}</div>`;
        return;
      }
    }

    state.occasionStep = Math.min(5, state.occasionStep + 1);
    renderFn();
  });

  $('#group-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    syncGroupDraft();
    const f = e.target;
    const occMeta = OCCASION_TYPES.find((x) => x[0] === state.groupDraft.occasion_type) || OCCASION_TYPES[0];
    const combinedNotes = [occMeta[1], state.groupDraft.notes].filter(Boolean).join(' — ');
    e.submitter.disabled = true;
    try {
      const r = await api('/group-requests', {
        organizer_name: state.groupDraft.organizer_name,
        organizer_phone: state.groupDraft.organizer_phone,
        date: state.groupDraft.date,
        time: state.groupDraft.time,
        neighborhood: state.groupDraft.neighborhood,
        participants: state.groupDraft.participants,
        notes: combinedNotes,
        terms: f.elements.terms.checked,
      });
      state.groupResult = r;
      state.occasionStep = 1;
      state.account = null;
      renderFn();
    } catch (err) {
      $('#form-error').innerHTML = `<div class="error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $('#new-group-req')?.addEventListener('click', () => {
    state.groupResult = null;
    state.occasionStep = 1;
    renderFn();
  });

  $('#gift-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const d = Object.fromEntries(new FormData(f));
    const [kind, id] = String(d.gift_choice || '').split(':');
    e.submitter.disabled = true;
    try {
      const r = await api('/gift-requests', {
        sender_name: d.sender_name,
        sender_phone: d.sender_phone,
        recipient_name: d.recipient_name,
        personal_message: d.personal_message,
        package_id: kind === 'pkg' ? id : undefined,
        service_id: kind === 'svc' ? id : undefined,
        terms: f.elements.terms.checked,
      });
      state.giftResult = r;
      state.account = null;
      renderFn();
    } catch (err) {
      $('#form-error').innerHTML = `<div class="error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $('#new-gift-req')?.addEventListener('click', () => {
    state.giftResult = null;
    renderFn();
  });

  if (pageIsStudio()) trackFunnel('studio_complete');
}

function pageIsStudio() {
  return location.pathname.includes('/studio') && state.studio?.results?.length > 0;
}
