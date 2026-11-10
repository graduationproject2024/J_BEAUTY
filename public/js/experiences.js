import { $, api, esc, href, minutes, money, nameOf, riyadhToday, state, t, toast } from './state.js';
import { field, head, provisional } from './components.js';
import { trackFunnel } from './motion.js';

export function studioPage() {
  const s = state.studio;
  const results = s.results || [];
  return `
    <main id="main" class="wrap">
      ${head(
        t('استوديو J للطقوس المناسبة', 'J Ritual Studio'),
        t('أجيبي عن أربعة أسئلة بسيطة وسنقترح عليكِ الخيارات المتوفرة فعلياً في قائمتنا.', 'Answer 4 quick preferences for transparent, catalog-verified recommendations.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('استوديو الطقوس', 'J Ritual Studio'), '']],
      )}
      <div class="split">
        <form id="studio-form" class="card">
          <label class="field">
            ${t('١. ما الإحساس الذي تبحثين عنه اليوم؟', '1. What kind of ritual are you craving?')}
            <select name="mood">
              <option value="unwind" ${s.mood === 'unwind' ? 'selected' : ''}>${t('استرخاء وهدوء (مساج)', 'Unwind & Release Tension (Massage)')}</option>
              <option value="pamper" ${s.mood === 'pamper' ? 'selected' : ''}>${t('دلال متكامل (مساج + أظافر)', 'Complete Pampering (Massage + Nails)')}</option>
              <option value="nails" ${s.mood === 'nails' ? 'selected' : ''}>${t('أظافر أنيقة ومرتبة', 'Fresh Nails & Gel Finish')}</option>
              <option value="occasion" ${s.mood === 'occasion' ? 'selected' : ''}>${t('تجهيز لمناسبة خاصة', 'Preparing for a Special Occasion')}</option>
            </select>
          </label>
          <label class="field">
            ${t('٢. كم لديكِ من الوقت؟', '2. How much time do you have?')}
            <select name="minutes_available">
              <option value="45" ${s.minutes_available == 45 ? 'selected' : ''}>${t('حتى 45 دقيقة', 'Up to 45 min')}</option>
              <option value="75" ${s.minutes_available == 75 ? 'selected' : ''}>${t('حتى 75 دقيقة', 'Up to 75 min')}</option>
              <option value="120" ${s.minutes_available == 120 ? 'selected' : ''}>${t('حتى ساعتين (120 دقيقة)', 'Up to 120 min')}</option>
              <option value="180" ${s.minutes_available == 180 ? 'selected' : ''}>${t('جلسة ممتدة (180 دقيقة)', 'Extended ritual (180 min)')}</option>
            </select>
          </label>
          <label class="field">
            ${t('٣. الميزانية التقديرية (ر.س)', '3. Approximate budget (SAR)')}
            <select name="budget">
              <option value="150" ${s.budget == 150 ? 'selected' : ''}>${t('حتى 150 ر.س', 'Up to 150 SAR')}</option>
              <option value="260" ${s.budget == 260 ? 'selected' : ''}>${t('حتى 260 ر.س', 'Up to 260 SAR')}</option>
              <option value="380" ${s.budget == 380 ? 'selected' : ''}>${t('حتى 380 ر.س', 'Up to 380 SAR')}</option>
              <option value="550" ${s.budget == 550 ? 'selected' : ''}>${t('حتى 550 ر.س', 'Up to 550 SAR')}</option>
            </select>
          </label>
          <label class="field">
            ${t('٤. هل تفضلين خدمة واحدة أم باقة؟', '4. Single service or package?')}
            <select name="format">
              <option value="either" ${s.format === 'either' ? 'selected' : ''}>${t('اقترحي الأفضل لي', 'Show both options')}</option>
              <option value="single" ${s.format === 'single' ? 'selected' : ''}>${t('خدمة فردية', 'Single service')}</option>
              <option value="package" ${s.format === 'package' ? 'selected' : ''}>${t('باقة مدمجة', 'Curated package')}</option>
            </select>
          </label>
          <button class="btn" type="submit" style="width:100%">${t('اعرضي الترشيحات المناسبة', 'Show matching rituals')}</button>
        </form>

        <div>
          <h3>${t('الترشيحات المبنية على قائمتنا الفعلية', 'Catalog-Matched Suggestions')}</h3>
          ${
            results.length
              ? `<div style="display:grid;gap:14px">
                  ${results
                    .map((r) => {
                      const item = r.item;
                      const reasons = r[`reasons_${state.lang}`] || [];
                      const bookUrl =
                        r.kind === 'package'
                          ? `${href('booking')}?package=${esc(item.id)}`
                          : `${href('booking')}?service=${esc(item.id)}`;
                      return `
                      <article class="card">
                        <div class="row" style="margin-bottom:6px">
                          <span class="badge">${r.kind === 'package' ? t('باقة', 'Package') : t('خدمة', 'Service')}</span>
                          <strong>${money(item.price)} · ${minutes(item.duration)}</strong>
                        </div>
                        <h4 style="margin:6px 0">${esc(nameOf(item))}</h4>
                        <ul class="muted" style="padding-inline-start:18px;margin:8px 0 14px">
                          ${reasons.map((rs) => `<li>${esc(rs)}</li>`).join('')}
                        </ul>
                        <a class="btn small" href="${bookUrl}">${t('احجزي هذا الخيار', 'Book this option')}</a>
                      </article>
                    `;
                    })
                    .join('')}
                </div>`
              : `<div class="empty muted">${t('اختاري تفضيلاتكِ واضغطي على عرض الترشيحات لمشاهدة أفضل التطابقات بالأسعار والمدد الحقيقية.', 'Choose your preferences to view matched rituals based on live prices and durations.')}</div>`
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
        ${head(t('تم تسجيل طلب الجلسة الجماعية', 'Group Request Saved'))}
        <div class="content card">
          <div class="success">
            <h3>${t('بانتظار موافقة الإدارة وتنسيق السعة', 'Awaiting Admin Approval & Capacity Review')}</h3>
            <p>${t('رقم الطلب:', 'Reference:')} <strong><bdi>${esc(r.group_request.reference)}</bdi></strong></p>
          </div>
          <p class="muted">${t('لا يتم تأكيد المواعيد الجماعية آلياً. أرسلي الرسالة عبر واتساب لمراجعة توفر الفريق.', 'Group requests are never auto-confirmed. Send via WhatsApp for team capacity coordination.')}</p>
          ${r.whatsapp_url ? `<a class="btn sage" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">${t('فتح واتساب', 'Open WhatsApp')}</a>` : ''}
          <pre style="margin-top:14px">${esc(r.message)}</pre>
          <button type="button" class="btn light" id="new-group-req">${t('طلب جماعي جديد', 'New group request')}</button>
        </div>
      </main>
    `;
  }

  return `
    <main id="main" class="wrap">
      ${head(
        t('طقوس جماعية — Beauty Together', 'Beauty Together — Group Requests'),
        t('نسّقي جلسة منزلية لكِ ولصديقاتكِ أو عائلتكِ في المدينة المنورة (من 2 إلى 5 مشاركات).', 'Coordinate a multi-guest home spa visit in Madinah for 2 to 5 participants.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('جلسة جماعية', 'Beauty Together'), '']],
      )}
      <div class="notice">${t(
        'الطلبات الجماعية تخضع لمراجعة الإدارة وتنسيق الطاقة الاستيعابية وعدد الأخصائيات قبل أي تأكيد.',
        'Group sessions strictly require administrative approval and staff capacity coordination before confirmation.',
      )}</div>
      ${provisional()}
      <form id="group-form" class="card content">
        <div id="form-error" role="alert"></div>
        <div class="form-grid">
          ${field(t('اسم المنسّقة', 'Organizer name'), 'organizer_name', 'text', g.organizer_name || state.user?.name || '', 'required')}
          ${field(t('رقم الجوال السعودي', 'Saudi mobile'), 'organizer_phone', 'tel', g.organizer_phone || state.user?.phone || '', 'required placeholder="05xxxxxxxx"')}
          ${field(t('التاريخ المفضل', 'Preferred date'), 'date', 'date', g.date, `required min="${riyadhToday()}"`)}
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

        <h3>${t('المشاركات وخدماتهن', 'Participants & Selected Services')}</h3>
        ${g.participants
          .map(
            (p, idx) => `
          <div class="card" style="background:var(--ivory);margin-bottom:14px">
            <div class="row" style="margin-bottom:10px">
              <strong>${t(`المشاركة ${idx + 1}`, `Participant ${idx + 1}`)}</strong>
              ${g.participants.length > 2 ? `<button type="button" class="btn small light" data-remove-guest="${idx}">${t('إزالة', 'Remove')}</button>` : ''}
            </div>
            <label class="field">
              ${t('الاسم أو اللقب', 'Name / Label')}
              <input type="text" data-guest-label="${idx}" value="${esc(p.label)}" maxlength="60" required>
            </label>
            <label class="field">
              ${t('اختاري خدمة أو أكثر', 'Choose services')}
              <select multiple size="4" data-guest-services="${idx}" required>
                ${svcs
                  .map(
                    (sv) =>
                      `<option value="${esc(sv.id)}" ${p.service_ids.includes(sv.id) ? 'selected' : ''}>${esc(nameOf(sv))} · ${money(sv.price)} · ${minutes(sv.duration)}</option>`,
                  )
                  .join('')}
              </select>
            </label>
          </div>
        `,
          )
          .join('')}

        ${g.participants.length < 5 ? `<button type="button" class="btn small light" id="add-guest" style="margin-bottom:16px">+ ${t('إضافة مشاركة', 'Add participant')}</button>` : ''}

        <div class="card" style="background:var(--sage-tint);margin-bottom:16px">
          <div class="row">
            <span>${t('المدة الإجمالية التقديرية:', 'Estimated total duration:')} <strong>${minutes(totalMin)}</strong></span>
            <span>${t('الإجمالي التقديري:', 'Estimated total:')} <strong>${money(totalEst)}</strong></span>
          </div>
        </div>

        <label class="check">
          <input type="checkbox" name="terms" required>
          <span>${t('أوافق على السياسات وأفهم أن الطلب ينتظر موافقة الإدارة وتوفر الأخصائيات.', 'I accept the terms and understand group bookings require admin approval.')}</span>
        </label>
        <button type="submit" class="btn">${t('إرسال طلب الجلسة الجماعية', 'Submit Group Request')}</button>
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
        t('أهدي لحظة عناية — Gift a Ritual', 'Gift a Ritual'),
        t('صمّمي بطاقة إهداء رقمية واطلبي اعتمادها وتنسيقها يدوياً مع فريق J SPA.', 'Prepare a thoughtful digital gift card request coordinated manually with our team.'),
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
    e.submitter.disabled = true;
    try {
      const r = await api('/studio/recommend', state.studio);
      state.studio.results = r.recommendations;
      renderFn();
    } catch (err) {
      toast(err.message);
      e.submitter.disabled = false;
    }
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
      const sel = f.querySelector(`[data-guest-services="${idx}"]`);
      if (lbl) p.label = lbl.value;
      if (sel) p.service_ids = [...sel.selectedOptions].map((o) => o.value);
    });
  };

  $('#add-guest')?.addEventListener('click', () => {
    syncGroupDraft();
    if (state.groupDraft.participants.length < 5) {
      state.groupDraft.participants.push({
        label: t(`ضيفة ${state.groupDraft.participants.length + 1}`, `Guest ${state.groupDraft.participants.length + 1}`),
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

  document.querySelectorAll('[data-guest-services]').forEach((sel) => {
    sel.onchange = () => {
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
