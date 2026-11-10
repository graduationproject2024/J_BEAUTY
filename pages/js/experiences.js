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
      return first?.image || '/J_BEAUTY/public/assets/images/hero-sanctuary.webp';
    }
    return rec.item?.image || `/J_BEAUTY/public/assets/images/services/${rec.item?.id}.webp`;
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
                   <p style="margin-bottom:10px">${t('جاري مطابقة خياراتكِ من كتالوج J SPA المعتمد…', 'Matching your preferences against verified J SPA services…')}</p>
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
      img: '/J_BEAUTY/public/assets/images/services/hot-stone.webp',
      ar: 'سكينة الأحجار الدافئة',
      en: 'Warm Basalt Sanctuary',
      sub_ar: 'مساج الأحجار الساخنة · 60 دقيقة · 265 ر.س',
      sub_en: 'Hot Stone Massage · 60 min · 265 SAR',
      link: href('services/hot-stone'),
    },
    {
      cat: 'nails',
      img: '/J_BEAUTY/public/assets/images/services/french-tip.webp',
      ar: 'فرنش كلاسيكي ناعم',
      en: 'Timeless Ivory French Tip',
      sub_ar: 'منيكير فرنش تيب · قاعدة وردية شفافة',
      sub_en: 'French Tip Manicure · Sheer blush base',
      link: href('services/french-tip'),
    },
    {
      cat: 'gel',
      img: '/J_BEAUTY/public/assets/images/services/colored-french.webp',
      ar: 'أطراف مريمية عصرية',
      en: 'Sage Micro-French Gel',
      sub_ar: 'جل فرنسي بأطراف ملونة · 60 دقيقة',
      sub_en: 'Colored French Gel · 60 min',
      link: href('atelier'),
    },
    {
      cat: 'nails',
      img: '/J_BEAUTY/public/assets/images/services/pedicure.webp',
      ar: 'طقوس العناية بالقدمين',
      en: 'Rose-Petal Foot Sanctuary',
      sub_ar: 'بديكير دافئ ببتلات الورد · 45 دقيقة',
      sub_en: 'Warm Rose-Petal Pedicure · 45 min',
      link: href('services/pedicure'),
    },
    {
      cat: 'gel',
      img: '/J_BEAUTY/public/assets/images/services/french-gel.webp',
      ar: 'لمعان الفرنش الزجاجي',
      en: 'Glass-Shine French Gel',
      sub_ar: 'جل فرنسي ثابت · مثالي للمناسبات',
      sub_en: 'Long-wear French Gel · Occasion ready',
      link: href('services/french-gel'),
    },
    {
      cat: 'massage',
      img: '/J_BEAUTY/public/assets/images/services/lymphatic.webp',
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

export function groupBookingPage() {
  const g = state.groupDraft;
  const s = state.catalog.settings || {};
  const svcs = state.catalog.services || [];

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
            <h3>${t('بانتظار موافقة الإدارة ومراجعة السعة', 'Awaiting Admin Approval & Capacity Review')}</h3>
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

  return `
    <main id="main" class="wrap">
      ${head(
        t('تنسيق جلسات المناسبات', 'Occasion Experiences'),
        t('نسّقي جلسات العناية والاسترخاء والأظافر لمنزلكِ في المدينة المنورة لاحتفالاتكِ ومناسباتكِ (من 2 إلى 5 مستفيدات).', 'Arrange coordinated home spa and nail appointments in Madinah for special celebrations (2 to 5 participants).'),
        [[t('الرئيسية', 'Home'), 'home'], [t('تنسيق جلسات المناسبات', 'Occasion Experiences'), '']],
      )}
      <div class="notice">${t(
        'تخضع طلبات المناسبات لمراجعة الإدارة وتنسيق الطاقة الاستيعابية وعدد المختصات قبل أي تأكيد.',
        'Occasion coordination requests strictly require administrative approval and staff capacity review before confirmation.',
      )}</div>
      ${provisional()}
      <form id="group-form" class="occasion-layout booking-layout">
        <div class="card booking-main">
          <div id="form-error" role="alert"></div>
          <div class="form-grid">
            ${field(t('اسم منسّقة المناسبة', 'Coordinator name'), 'organizer_name', 'text', g.organizer_name || state.user?.name || '', 'required')}
            ${field(t('رقم الجوال السعودي', 'Saudi mobile'), 'organizer_phone', 'tel', g.organizer_phone || state.user?.phone || '', 'required placeholder="05xxxxxxxx"')}
            ${field(t('التاريخ المفضل', 'Preferred date'), 'date', 'date', g.date || new Date(Date.parse(riyadhToday() + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10), `required min="${riyadhToday()}"`)}
            ${field(t('الوقت المفضل', 'Preferred time'), 'time', 'time', g.time, 'required')}
          </div>
          <label class="field">
            ${t('الحي في المدينة المنورة', 'Madinah neighborhood')}
            ${
              s.areas?.length
                ? `<select name="neighborhood" required><option value="">${t('اختاري الحي', 'Select')}</option>${s.areas.map((a) => `<option value="${esc(a)}" ${g.neighborhood === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>`
                : `<input name="neighborhood" value="${esc(g.neighborhood)}" required>`
            }
          </label>

          <h3 style="margin-top:8px">${t('المستفيدات والخدمات المطلوبة', 'Participants & Selected Services')}</h3>
          ${g.participants
            .map(
              (p, idx) => `
            <div class="card occasion-guest-card">
              <div class="row" style="margin-bottom:10px">
                <strong>${t(`المستفيدة ${num(idx + 1)}`, `Participant ${num(idx + 1)}`)}</strong>
                ${g.participants.length > 2 ? `<button type="button" class="btn small light" data-remove-guest="${idx}">${t('إزالة', 'Remove')}</button>` : ''}
              </div>
              <label class="field">
                ${t('الاسم أو الوصف', 'Name / Label')}
                <input type="text" data-guest-label="${idx}" value="${esc(p.label)}" maxlength="60" required>
              </label>
              <div class="control-group" style="margin-bottom:0">
                <span class="control-label">${t('اختاري خدمة أو أكثر', 'Choose services')}</span>
                <div class="occasion-svc-grid" data-guest-services="${idx}">
                  ${svcs
                    .map((sv) => {
                      const active = p.service_ids.includes(sv.id);
                      return `
                        <label class="occasion-svc-chip ${active ? 'is-selected' : ''}">
                          <input type="checkbox" data-guest-svc="${idx}" value="${esc(sv.id)}" ${active ? 'checked' : ''}>
                          <span>${esc(nameOf(sv))}</span>
                          <small><bdi>${money(sv.price)}</bdi> · <bdi>${minutes(sv.duration)}</bdi></small>
                        </label>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          `,
            )
            .join('')}

          ${g.participants.length < 5 ? `<button type="button" class="btn small light" id="add-guest" style="margin-bottom:16px">+ ${t('إضافة مستفيدة', 'Add participant')}</button>` : ''}

          <label class="check">
            <input type="checkbox" name="terms" required>
            <span>${t('أوافق على السياسات وأفهم أن طلب المناسبة ينتظر موافقة الإدارة وتوفر المختصات.', 'I accept the terms and understand occasion bookings require admin approval.')}</span>
          </label>
          <button type="submit" class="btn" style="width:100%">${t('إرسال طلب تنسيق المناسبة', 'Submit Occasion Request')}</button>
        </div>

        <aside class="summary occasion-summary">
          <span class="eyebrow" style="margin-bottom:8px">${t('ملخص المناسبة التقديري', 'ESTIMATED OCCASION SUMMARY')}</span>
          <h3>${num(g.participants.length)} ${t('مستفيدات', 'Participants')}</h3>
          ${g.participants
            .map((p, idx) => {
              const pSvcs = p.service_ids.map((id) => svcs.find((x) => x.id === id)).filter(Boolean);
              const subTotal = pSvcs.reduce((a, b) => a + Number(b.price || 0), 0);
              return `<div class="summary-line"><span>${esc(p.label || t(`المستفيدة ${num(idx + 1)}`, `Guest ${num(idx + 1)}`))}</span><span>${money(subTotal)}</span></div>`;
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
        t('أعدّي بطاقة إهداء إلكترونية أنيقة يتم تنسيقها واعتمادها يدوياً مع فريق J SPA.', 'Prepare a thoughtful digital gift voucher request coordinated manually with our team.'),
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
    for (const k of ['organizer_name', 'organizer_phone', 'date', 'time', 'neighborhood']) {
      if (f.elements[k]) state.groupDraft[k] = f.elements[k].value;
    }
    state.groupDraft.participants.forEach((p, idx) => {
      const lbl = f.querySelector(`[data-guest-label="${idx}"]`);
      const boxes = [...f.querySelectorAll(`[data-guest-svc="${idx}"]`)];
      if (lbl) p.label = lbl.value;
      if (boxes.length) p.service_ids = boxes.filter((b) => b.checked).map((b) => b.value);
    });
  };

  $('#add-guest')?.addEventListener('click', () => {
    syncGroupDraft();
    if (state.groupDraft.participants.length < 5) {
      state.groupDraft.participants.push({
        label: t(`المستفيدة ${state.groupDraft.participants.length + 1}`, `Guest ${state.groupDraft.participants.length + 1}`),
        service_ids: ['relaxation'],
      });
      renderFn();
    }
  });

  document.querySelectorAll('[data-remove-guest]').forEach((b) => {
    b.onclick = () => {
      syncGroupDraft();
      const idx = Number(b.dataset.removeGuest);
      if (state.groupDraft.participants.length > 2) {
        state.groupDraft.participants.splice(idx, 1);
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

  $('#group-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    syncGroupDraft();
    const f = e.target;
    e.submitter.disabled = true;
    try {
      const r = await api('/group-requests', {
        ...state.groupDraft,
        terms: f.elements.terms.checked,
      });
      state.groupResult = r;
      state.account = null;
      renderFn();
    } catch (err) {
      $('#form-error').innerHTML = `<div class="error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $('#new-group-req')?.addEventListener('click', () => {
    state.groupResult = null;
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
