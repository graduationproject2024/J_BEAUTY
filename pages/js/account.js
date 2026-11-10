import {
  $,
  api,
  esc,
  href,
  money,
  nameOf,
  num,
  page,
  refreshSession,
  state,
  t,
  toast,
} from './state.js';
import {
  field,
  head,
  openDialog,
  openReviewModal,
  petalBloomSVG,
  reviewModerationStatusBadge,
  simpleTable,
  statusBadge,
} from './components.js';
import { renderNailPreviewSVG, recommendedServiceForStyle } from './atelier.js';

export function auth(mode = 'login') {
  const tokenVal =
    new URLSearchParams(location.search).get('token') ||
    decodeURIComponent(location.hash.slice(1)) ||
    '';

  return `
    <main id="main" class="wrap">
      <div class="auth-shell">
        <div class="auth">
          <span class="eyebrow">J SPA · ${t('جواز جمالكِ الخاص', 'BEAUTY PASSPORT')}</span>
          <h1 tabindex="-1">${
            mode === 'register'
              ? t('إنشاء حساب عميلة', 'Create your account')
              : mode === 'reset'
                ? t('تعيين كلمة مرور جديدة', 'Set a fresh password')
                : t('تسجيل الدخول', 'Welcome back')
          }</h1>
          <p class="muted">${t('تابعي مواعيدكِ، تصاميم الأظافر، وبتلات نادي J من مكان واحد.', 'Manage appointments, saved Nail Atelier looks, and J Petals rewards in one calm journal.')}</p>
          <form id="auth-form" data-mode="${mode}">
            <div id="form-error" role="alert"></div>
            ${mode === 'register' ? field(t('الاسم', 'Name'), 'name', 'text', '', 'required autocomplete="name"') : ''}
            ${
              mode !== 'reset'
                ? field(
                    t('رقم الجوال السعودي', 'Saudi mobile number'),
                    'phone',
                    'tel',
                    '',
                    'required inputmode="tel" autocomplete="tel" placeholder="05xxxxxxxx"',
                  )
                : field(
                    t('رمز الاستعادة من الفريق', 'Recovery token from staff'),
                    'token',
                    'text',
                    tokenVal,
                    'required',
                  )
            }
            ${field(
              t('كلمة المرور (12 حرفاً على الأقل)', 'Password (min 12 characters)'),
              'password',
              'password',
              '',
              `required minlength="12" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"`,
            )}
            ${
              mode === 'register'
                ? `${field(t('تأكيد كلمة المرور', 'Confirm password'), 'passwordConfirmation', 'password', '', 'required minlength="12" autocomplete="new-password"')}
                   <label class="check">
                     <input type="checkbox" name="terms" required>
                     <span>${t('أوافق على الشروط وسياسة الخصوصية.', 'I agree to the terms and privacy notice.')} <a class="text-link" href="${href('terms')}">${t('اقرئي الشروط', 'Read terms')}</a></span>
                   </label>`
                : ''
            }
            <button class="btn" type="submit" style="width:100%">
              ${
                mode === 'register'
                  ? t('إنشاء الحساب', 'Create account')
                  : mode === 'reset'
                    ? t('حفظ كلمة المرور', 'Save password')
                    : t('تسجيل الدخول', 'Sign in')
              }
            </button>
          </form>
          <div class="auth-links muted">
            ${
              mode === 'login'
                ? `<a class="text-link" href="${href('register')}">${t('جديدة هنا؟ أنشئي حساباً', 'New here? Create an account')}</a>
                   <a class="text-link auth-secondary-link" href="${href('recovery')}">${t('نسيتِ كلمة المرور؟', 'Forgot your password?')}</a>`
                : `<a class="text-link" href="${href('login')}">${t('لديكِ حساب؟ سجلي الدخول', 'Already registered? Sign in')}</a>`
            }
          </div>
        </div>

        <aside class="auth-aside card">
          <span class="eyebrow">${t('مزايا جواز الجمال', 'PASSPORT PRIVILEGES')}</span>
          <h2>${t('ملف عناية شخصي في راحة بيتكِ', 'Your private home ritual journal')}</h2>
          <p class="muted">${t(
            'صُمم جواز الجمال ليحفظ ذوقكِ في العناية وتصاميم الأظافر ويمنحكِ متابعة شفافة لزياراتكِ دون رسائل تسويقية مزعجة.',
            'Your Beauty Passport keeps your nail looks, preferred care rituals, and verified J Petals balance in one discreet space.',
          )}</p>
          <ul class="inclusion-list">
            <li>${t('حفظ تصاميم أتيليه J للأظافر وإعادة طلبها بنقرة', 'Save custom J Nail Atelier designs for effortless rebooking')}</li>
            <li>${t('متابعة رصيد بتلات J بعد اكتمال الخدمة والدفع', 'Track genuine J Petals earned after staff-verified completed visits')}</li>
            <li>${t('توثيق شخصي لملكية الجوال عبر واتساب بدون رسائل OTP مدفوعة', 'Personal WhatsApp number confirmation without third-party SMS fees')}</li>
            <li>${t('إدارة مفضلة الخدمات وتفضيلات الزيارة المنزلية بالمدينة المنورة', 'Bookmark preferred rituals and Madinah neighborhood notes')}</li>
          </ul>
          <div class="hero-actions" style="margin-top:20px">
            <a class="btn small light" href="${href('booking')}">${t('أو المتابعة كزائرة لطلب موعد', 'Or continue as a guest')}</a>
          </div>
        </aside>
      </div>
    </main>
  `;
}

export function bookingCard(b) {
  const existingReview = state.account?.reviews?.find((r) => r.booking_id === b.id);
  const canReview = b.status === 'completed' && state.user?.verified;
  return `
    <article class="booking-card">
      <div class="row" style="margin-bottom:8px">
        <h3 style="margin:0"><bdi>${esc(b.reference)}</bdi></h3>
        ${statusBadge(b.status)}
      </div>
      <p class="muted" style="margin-bottom:8px"><bdi>${esc(b.date)} · ${esc(b.time)}</bdi> · ${esc(b.neighborhood)}</p>
      <p style="margin-bottom:12px">${(b.items || []).map((i) => esc(nameOf(i) || i.name)).join(' · ')}</p>
      <div class="row">
        <strong><bdi>${money(b.total)}</bdi></strong>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${existingReview ? reviewModerationStatusBadge(existingReview) : ''}
          <button class="btn small light" data-rebook="${esc(b.id)}" type="button">${t('إعادة الحجز', 'Rebook')}</button>
          ${
            canReview
              ? existingReview
                ? `<button class="btn small light" data-review="${esc(b.id)}" data-edit-review="true" type="button">${t('تعديل التقييم', 'Edit review')}</button>`
                : `<button class="btn small light" data-review="${esc(b.id)}" type="button">${t('قيّمي تجربتكِ معنا', 'Rate your experience')}</button>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

export function petalsContent() {
  const rewards =
    state.account?.rewards ||
    state.catalog.settings?.rewards || [
      { id: 'petal-200', points: 200, value: 10 },
      { id: 'petal-500', points: 500, value: 30 },
    ];
  const verified = !!state.user?.verified;
  const hasLive = Boolean(state.account && verified);
  const balance = hasLive ? Number(state.account.balance || 0) : 0;
  const displayPts = hasLive ? balance : state.user ? 0 : 250;
  const nextReward = rewards.find((r) => r.points > displayPts) || rewards[rewards.length - 1] || { points: 500, value: 30 };
  const maxTier = Math.max(500, Number(rewards[rewards.length - 1]?.points || 500));
  const fillPct = Math.max(4, Math.min(100, Math.round((displayPts / maxTier) * 100)));
  const filledPetals = Math.round((displayPts / maxTier) * 8);
  const firstRewardPts = Number(rewards[0]?.points || 200);
  const firstRewardVal = Number(rewards[0]?.value || 10);
  const firstTickPct = Math.round((firstRewardPts / maxTier) * 100);
  const tierName =
    displayPts >= maxTier
      ? t('إزهار مكتمل متألق', 'Full Luminous Bloom')
      : displayPts >= firstRewardPts
        ? t('إزهار الورد الجوري', 'Damask Rose Bloom')
        : t('بداية تفتح البراعم', 'Opening Rosebud');
  const tierLatin =
    displayPts >= firstRewardPts
      ? `Rosa damascena · ${t('المستوى الثاني', 'Tier II')}`
      : `Rosa centifolia · ${t('المستوى الأول', 'Tier I')}`;

  return `
    <div class="loyalty-band is-petals-hero" style="margin-bottom:28px">
      <div class="loyalty-copy-col">
        <span class="eyebrow">${t('نادي بتلات J', 'J PETALS CLUB')}</span>
        <h2>${t('نادي بتلات J', 'J Petals Club')}</h2>
        <p>${t(
          'نكافئ لحظات عنايتكِ. تُحتسب 1 بتلة افتراضياً لكل 1 ر.س مدفوعة فعلياً بعد خصوماتكِ وتُضاف تلقائياً بمجرد اكتمال الزيارة وتأكيد الدفع من الموظفة لحسابكِ الموثق.',
          'Points are awarded automatically only after a service is completed, staff verifies payment, and account ownership is verified.',
        )}</p>
        ${
          state.account?.has_pending_entitlement && !verified
            ? `<div class="notice" style="margin-top:14px;color:var(--charcoal)">${t(
                'لديكِ نقاط مستحقة معلّقة من زيارات مكتملة ومدفوعة بانتظار إكمال توثيق رقم جوالكِ لإظهارها وتفعيلها.',
                'You have pending entitlements from completed verified-paid visits held safely until phone verification is completed.',
              )}</div>`
            : ''
        }
        ${!state.user ? `<div style="margin-top:18px"><a class="btn rose" href="${href('register')}">${t('انضمي للنادي الآن', 'Join J Petals Club')}</a></div>` : ''}
      </div>
      <div class="loyalty-gallery-card is-ivory-card">
        <div class="loyalty-showcase-meta">
          <span class="eyebrow">${t('الورد المديني الأرشيفي · المستوى الحالي', 'ARCHIVE BOTANICAL · CURRENT TIER')}</span>
          <div class="loyalty-balance-num">${num(displayPts)}</div>
          <p class="loyalty-balance-sub">${tierName}</p>
          <p class="loyalty-latin-sub" dir="ltr">${esc(tierLatin)}</p>
          <p class="loyalty-next-copy">
            ${
              hasLive
                ? balance >= nextReward.points
                  ? t('مؤهلة لطلب المكافأة المتاحة الآن!', 'Eligible for an available reward right now!')
                  : t(`متبقٍ ${num(nextReward.points - balance)} بتلة للمكافأة التالية`, `${num(nextReward.points - balance)} petals until next reward`)
                : state.user
                  ? t('وثّقي رقم جوالكِ لعرض رصيدكِ الفعلي.', 'Verify your phone number to view your live balance.')
                  : t('عرض توضيحي (250 بتلة) — كل 1 ر.س مدفوع وموثق = 1 بتلة حقيقية', 'Illustrative preview (250 Petals) — 1 verified paid SAR = 1 Petal')
            }
          </p>
          <div class="petal-progress-wrap" aria-label="${t('مسار التقدم للمكافآت', 'Reward progress')}">
            <div class="petal-progress-track">
              <div class="petal-progress-fill" style="width:${fillPct}%"></div>
              <span class="petal-progress-tick" style="inset-inline-start:${firstTickPct}%" aria-hidden="true"></span>
            </div>
            <div class="petal-milestone-row">
              <span>${num(0)}</span>
              <span>${num(firstRewardPts)} (${money(firstRewardVal)})</span>
              <span>${num(maxTier)} (${money(rewards[rewards.length - 1]?.value || 30)})</span>
            </div>
          </div>
        </div>
        <div class="loyalty-cameo-slot">
          ${petalBloomSVG(filledPetals, 8, true)}
        </div>
      </div>
    </div>

    <div class="grid two section-tight" style="padding-top:0">
      ${rewards
        .map(
          (r) => `
        <article class="card">
          <span class="eyebrow">${num(r.points)} ${t('بتلة', 'PETALS')}</span>
          <h3>${t('مكافأة خصم بقيمة', 'Reward discount of')} ${money(r.value)}</h3>
          <p class="muted">${t('تُراجع من الفريق وتُطبق على حجزكِ المؤهل غير المدفوع.', 'Reviewed by staff and applied to an eligible unpaid booking.')}</p>
          ${
            hasLive
              ? `<button class="btn small light" data-reward="${esc(r.id)}" ${balance < r.points ? 'disabled' : ''} type="button">${t('طلب استبدال المكافأة', 'Request reward')}</button>`
              : ''
          }
        </article>
      `,
        )
        .join('')}
    </div>
  `;
}

export function petalsPage() {
  return `
    <main id="main" class="wrap">
      ${head(
        t('نادي بتلات J', 'J Petals Club'),
        t('برنامج الولاء الداخلي لعميلات J SPA في المدينة المنورة.', 'J SPA’s internal loyalty club for verified customers in Madinah.'),
        [[t('الرئيسية', 'Home'), 'home'], [t('نادي بتلات J', 'J Petals Club'), '']],
      )}
      ${petalsContent()}
    </main>
  `;
}

function passportJournalSection() {
  const passport = state.account?.passport || {};
  const favSvcs = state.catalog.services.filter((s) => (passport.favorites || []).includes(s.id));
  const savedStyles = passport.saved_styles || [];
  const prefs = passport.preferences || {};
  const areas = state.catalog.settings?.areas || [];

  return `
    <section class="passport-grid">
      <div class="card">
        <div class="row" style="margin-bottom:12px">
          <h3 style="margin:0">${t('خدماتكِ المفضلة', 'Favorite Rituals')}</h3>
          <a class="text-link" href="${href('services')}">${t('تصفحي المزيد', 'Browse')}</a>
        </div>
        ${
          favSvcs.length
            ? `<div style="display:grid;gap:10px">
                ${favSvcs
                  .map(
                    (s) => `
                  <div class="row" style="padding:10px;border:1px solid var(--border);border-radius:var(--r-sm)">
                    <div>
                      <strong>${esc(nameOf(s))}</strong>
                      <div class="muted" style="font-size:13px">${money(s.price)}</div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <a class="btn small" href="${href('booking')}?service=${esc(s.id)}">${t('حجز', 'Book')}</a>
                      <button type="button" class="btn small light" data-passport-unfav="${esc(s.id)}">✕</button>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>`
            : `<p class="muted">${t('اضغطي على أيقونة القلب بجانب أي خدمة لحفظها هنا.', 'Tap the heart on any service to keep your favorites handy.')}</p>`
        }
      </div>

      <div class="card">
        <div class="row" style="margin-bottom:12px">
          <h3 style="margin:0">${t('تصاميم أتيليه الأظافر المحفوظة', 'Saved Nail Atelier Styles')}</h3>
          <a class="text-link" href="${href('atelier')}">${t('تصميم جديد', 'New look')}</a>
        </div>
        ${
          savedStyles.length
            ? `<div style="display:grid;gap:10px">
                ${savedStyles
                  .map(
                    (st) => `
                  <div class="row" style="padding:10px;border:1px solid var(--border);border-radius:var(--r-sm)">
                    <div style="display:flex;align-items:center;gap:10px">
                      <span class="swatch-mini" style="background:${esc(st.polish_color)}"></span>
                      <div>
                        <strong>${esc(st.name)}</strong>
                        <div class="muted" style="font-size:13px">${esc(st.shape)} · ${esc(st.finish)}</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px">
                      <button type="button" class="btn small" data-book-style="${esc(st.id)}">${t('احجزي', 'Book')}</button>
                      <button type="button" class="btn small light" data-del-style="${esc(st.id)}">✕</button>
                    </div>
                  </div>
                `,
                  )
                  .join('')}
              </div>`
            : `<p class="muted">${t('صمّمي شكل ولون أظافركِ في أتيليه J واحفظيه هنا.', 'Create your signature look in J Nail Atelier and save it here.')}</p>`
        }
      </div>

      <form id="passport-prefs-form" class="card full">
        <h3>${t('تفضيلات عنايتكِ الشخصية', 'Personal Care Preferences')}</h3>
        <p class="muted">${t('محفوظة في حسابكِ الخاص فقط لتسهيل طلباتكِ القادمة.', 'Scoped privately to your account to tailor future bookings.')}</p>
        <div class="form-grid">
          <label class="field">
            ${t('الحي المفضل بالمدينة', 'Preferred Madinah neighborhood')}
            ${
              areas.length
                ? `<select name="preferred_neighborhood">
                     <option value="">${t('بدون تحديد', 'Not set')}</option>
                     ${areas.map((a) => `<option value="${esc(a)}" ${prefs.preferred_neighborhood === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
                   </select>`
                : `<input name="preferred_neighborhood" value="${esc(prefs.preferred_neighborhood || '')}" maxlength="150">`
            }
          </label>
          <label class="field">
            ${t('ضغط المساج المفضل', 'Preferred massage pressure')}
            <select name="pressure">
              <option value="light" ${prefs.pressure === 'light' ? 'selected' : ''}>${t('لطيف', 'Light')}</option>
              <option value="medium" ${prefs.pressure === 'medium' ? 'selected' : ''}>${t('متوسط', 'Medium')}</option>
              <option value="firm" ${prefs.pressure === 'firm' ? 'selected' : ''}>${t('عميق / قوي', 'Firm')}</option>
            </select>
          </label>
          <label class="field">
            ${t('لمعة الأظافر المفضلة', 'Preferred nail finish')}
            <select name="nail_finish">
              <option value="gloss" ${prefs.nail_finish === 'gloss' ? 'selected' : ''}>${t('لمعة زجاجية', 'High Gloss')}</option>
              <option value="pearl" ${prefs.nail_finish === 'pearl' ? 'selected' : ''}>${t('لؤلؤي ناعم', 'Pearl Sheen')}</option>
              <option value="matte" ${prefs.nail_finish === 'matte' ? 'selected' : ''}>${t('مطفي مخملي', 'Velvet Matte')}</option>
            </select>
          </label>
          ${field(t('تفضيل الروائح / الزيوت', 'Scent / Oil note'), 'scent_note', 'text', prefs.scent_note || '', 'maxlength="150" placeholder="Lavender, Chamomile..."')}
        </div>
        <label class="check">
          <input type="checkbox" name="reminder_opt_in" ${prefs.reminder_opt_in ? 'checked' : ''}>
          <span>${t('أرغب بتفعيل تذكيرات المواعيد مستقبلاً عبر واتساب عند موافقة الفريق (اختياري، ولا يعني إرسالاً آلياً حالياً).', 'Opt in to future manual appointment reminders (optional; no automated messaging active).')}</span>
        </label>
        <button type="submit" class="btn small">${t('حفظ تفضيلاتي', 'Save preferences')}</button>
      </form>
    </section>
  `;
}

export async function accountPage(section) {
  if (!state.user) return auth('login');
  if (!state.account) {
    state.account = await api('/account');
    state.favorites = state.account.passport?.favorites || [];
  }
  const cur = page();
  const passport = state.account.passport || {};
  const bookings = state.account.bookings || [];

  return `
    <main id="main" class="wrap">
      ${head(t('جواز الجمال · ', 'Beauty Passport · ') + esc(state.user.name))}
      <div class="account-grid">
        <aside class="side-nav">
          <h3 style="margin-bottom:2px">${t('حسابكِ', 'Your journal')}</h3>
          <span class="muted" style="margin-bottom:10px"><bdi>${esc(state.user.phone)}</bdi></span>
          ${[
            ['account', 'جواز الجمال', 'Beauty Passport'],
            ['bookings', 'حجوزاتي', 'My bookings'],
            ['rewards', 'بتلاتي ومكافآتي', 'Petals & rewards'],
          ]
            .map(
              ([r, ar, en]) =>
                `<a href="${href(r)}" class="${cur === r ? 'active' : ''}">${t(ar, en)}</a>`,
            )
            .join('')}
          <button class="btn light small" id="logout" type="button" style="margin-top:12px">${t('تسجيل الخروج', 'Sign out')}</button>
        </aside>
        <div class="dashboard-content">
          ${
            !state.user.verified
              ? `<div class="notice">
                   <h3 style="margin-bottom:6px">${t('توثيق ملكية رقم الجوال عبر واتساب', 'Verify Your Phone Ownership via WhatsApp')}</h3>
                   <p>${t(
                     'لحماية خصوصية حجوزاتكِ ومنع ربط أي أرقام بالخطأ، نتحقق يدوياً من ملكية رقمكِ دون أي رسائل SMS مدفوعة:',
                     'To protect your booking history and loyalty balance without paid SMS OTPs, staff verifies your number in 4 simple steps:',
                   )}</p>
                   <div class="verify-steps">
                     <div class="verify-step">1. ${t('أنشئي مرجع التحقق المؤقت بالزر أدناه.', 'Generate your short-lived reference below.')}</div>
                     <div class="verify-step">2. ${t('افتحي واتساب واضغطي إرسال بنفسكِ.', 'Open WhatsApp and press Send manually.')}</div>
                     <div class="verify-step">3. ${t('تطابق الموظفة رقم المرسلة الفعلي مع حسابكِ.', 'Staff matches the actual WhatsApp sender.')}</div>
                     <div class="verify-step">4. ${t('تُفتح حجوزاتكِ وبتلاتكِ فور الاعتماد.', 'Your rewards and reviews unlock immediately.')}</div>
                   </div>
                   <button class="btn small" id="verify-request" type="button">${t('تأكيد رقم الجوال عبر واتساب', 'Verify number through WhatsApp')}</button>
                   <div id="verification-result"></div>
                 </div>`
              : `<div class="row" style="margin-bottom:18px">
                   <span class="badge">✓ ${t('حساب موثق', 'Verified account')}</span>
                   <a class="btn small" href="${href('booking')}">${t('طلب موعد جديد', 'Book a new visit')}</a>
                 </div>`
          }

          ${
            section === 'rewards'
              ? `${petalsContent()}
                 <h3>${t('سجل البتلات', 'Petal history')}</h3>
                 ${simpleTable(state.account.ledger || [], ['created_at', 'points', 'reason', 'booking_id'])}
                 <h3 style="margin-top:24px">${t('طلبات استبدال المكافآت', 'Reward requests')}</h3>
                 ${simpleTable(state.account.reward_requests || [], ['id', 'status', 'points', 'value'])}`
              : section === 'bookings'
                ? `<h2>${t('حجوزاتكِ', 'Your bookings')}</h2>
                   ${
                     bookings.length
                       ? bookings.map(bookingCard).join('')
                       : `<div class="empty"><h3>${t('لحظتكِ الأولى تبدأ هنا', 'Your first moment starts here')}</h3><p class="muted">${t('لا توجد حجوزات مرتبطة بهذا الحساب بعد.', 'No bookings linked to this account yet.')}</p><a class="btn" href="${href('booking')}">${t('اطلبي موعدكِ الآن', 'Request an appointment')}</a></div>`
                   }`
                : `${passportJournalSection()}
                   <h2 style="margin-top:28px">${t('حجوزاتكِ الأخيرة', 'Recent Visits')}</h2>
                   ${
                     bookings.length
                       ? bookings.slice(0, 3).map(bookingCard).join('')
                       : `<div class="empty muted">${t('لا توجد حجوزات مرتبطة بهذا الحساب بعد. حجوزات الزائرات لا تُربط تلقائياً برقم الجوال.', 'No bookings linked yet. Guest bookings are never merged automatically by phone number.')}</div>`
                   }
                   ${
                     (passport.group_requests || []).length || (passport.gift_requests || []).length
                       ? `<h3 style="margin-top:24px">${t('طلبات المناسبات والإهداء', 'Occasion & Gift Requests')}</h3>
                          ${[...(passport.group_requests || []), ...(passport.gift_requests || [])]
                            .map(
                              (req) => `<div class="booking-card"><div class="row"><strong><bdi>${esc(req.reference)}</bdi></strong>${statusBadge(req.status)}</div><p class="muted">${esc(req.created_at?.slice(0, 10) || '')}</p></div>`,
                            )
                            .join('')}`
                       : ''
                   }`
          }
        </div>
      </div>
    </main>
  `;
}

export function bindAccount(goFn, renderFn) {
  $('#auth-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form));
    const mode = form.dataset.mode;
    data.terms = !!form.elements.terms?.checked;
    e.submitter.disabled = true;
    try {
      await api('/' + mode, data);
      await refreshSession();
      state.account = null;
      state.admin = null;
      if (mode === 'reset') {
        toast(t('تم تحديث كلمة المرور. يرجى تسجيل الدخول.', 'Password updated. Please sign in.'));
        goFn('login');
      } else {
        goFn(state.user?.role === 'owner' || state.user?.role === 'employee' ? 'admin' : 'account');
      }
    } catch (err) {
      $('#form-error').innerHTML = `<div class="error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $('#logout')?.addEventListener('click', async () => {
    await api('/logout', {});
    state.account = null;
    state.admin = null;
    state.favorites = [];
    await refreshSession();
    goFn('home');
  });

  $('#verify-request')?.addEventListener('click', async () => {
    try {
      const r = await api('/verification/request', {});
      $('#verification-result').innerHTML = `
        <div class="success">
          <p>${t('مرجع التحقق:', 'Verification reference:')} <strong><bdi>${esc(r.reference)}</bdi></strong></p>
          <p class="muted">${t('صالح حتى:', 'Expires:')} <bdi>${esc(r.expires_at)}</bdi></p>
          ${
            r.whatsapp_url
              ? `<a class="btn sage small" href="${esc(r.whatsapp_url)}" target="_blank" rel="noopener">${t('افتحي واتساب واضغطي إرسال', 'Open WhatsApp, then press Send')}</a>`
              : `<p class="muted">${t('رقم واتساب غير معد بعد لدى الإدارة.', 'Business WhatsApp number is not configured yet.')}</p>`
          }
        </div>
      `;
    } catch (err) {
      toast(err.message);
    }
  });

  document.querySelectorAll('[data-rebook]').forEach((btn) => {
    btn.onclick = () => {
      const b = state.account?.bookings?.find((x) => x.id === btn.dataset.rebook);
      if (!b) return;
      if (b.package_id) {
        state.bookingCategory = 'packages';
        state.bookingMode = 'packages';
        state.draft.package_id = b.package_id;
        state.draft.service_ids = [];
      } else {
        state.bookingMode = 'services';
        state.draft.package_id = null;
        state.draft.service_ids = (b.items || []).map((i) => i.id);
        const svc = state.catalog.services.find((s) => s.id === state.draft.service_ids[0]);
        state.bookingCategory = svc?.category || 'massage';
      }
      state.draft.neighborhood = b.neighborhood || '';
      state.bookingStep = 3;
      goFn('booking');
    };
  });

  document.querySelectorAll('[data-passport-unfav]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        const res = await api('/passport/favorites', {
          service_id: btn.dataset.passportUnfav,
          action: 'remove',
        });
        state.favorites = res.favorites;
        state.account = null;
        renderFn();
      } catch (err) {
        toast(err.message);
      }
    };
  });

  document.querySelectorAll('[data-del-style]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        await api(`/atelier/styles/${btn.dataset.delStyle}/delete`, {});
        state.account = null;
        renderFn();
      } catch (err) {
        toast(err.message);
      }
    };
  });

  document.querySelectorAll('[data-book-style]').forEach((btn) => {
    btn.onclick = () => {
      const st = state.account?.passport?.saved_styles?.find((x) => x.id === btn.dataset.bookStyle);
      if (!st) return;
      state.atelier = { ...state.atelier, ...st };
      const svcId = st.recommended_service_id || recommendedServiceForStyle(st);
      state.bookingStep = 3;
      state.bookingMode = 'services';
      state.bookingCategory = 'gel';
      state.draft.package_id = null;
      state.draft.service_ids = [svcId];
      state.draft.notes = `[Nail Atelier: ${st.name}] ${st.shape}, ${st.length}, ${st.polish_color}, ${st.finish}`;
      goFn('booking');
    };
  });

  $('#passport-prefs-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const d = Object.fromEntries(new FormData(f));
    d.reminder_opt_in = f.elements.reminder_opt_in.checked;
    try {
      await api('/passport/preferences', d);
      state.account = null;
      toast(t('تم حفظ تفضيلاتكِ الشخصية', 'Preferences saved'));
      renderFn();
    } catch (err) {
      toast(err.message);
    }
  });

  document.querySelectorAll('[data-reward]').forEach((btn) => {
    btn.onclick = async () => {
      try {
        btn.disabled = true;
        await api('/rewards/request', { reward_id: btn.dataset.reward });
        state.account = null;
        toast(t('تم تسجيل طلب المكافأة للمراجعة', 'Reward request saved for staff review'));
        renderFn();
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-review]').forEach((btn) => {
    btn.onclick = () => {
      openReviewModal({
        bookings: state.account?.bookings || [],
        existingReviews: state.account?.reviews || [],
        initialBookingId: btn.dataset.review,
        onSaved: async () => {
          state.account = null;
          renderFn();
        },
      });
    };
  });
}
