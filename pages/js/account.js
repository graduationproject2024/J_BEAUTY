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
import {
  localizedFinishLabel,
  localizedLengthLabel,
  localizedShapeLabel,
  recommendedServiceForStyle,
  renderNailPreviewSVG,
} from './atelier.js';

export function auth(mode = 'login') {
  const tokenVal =
    new URLSearchParams(location.search).get('token') ||
    decodeURIComponent(location.hash.slice(1)) ||
    '';

  return `
    <main id="main" class="wrap">
      <div class="auth-shell">
        <div class="auth">
          <span class="eyebrow">J Beauty · ${t('جواز جمالك الخاص', 'BEAUTY PASSPORT')}</span>
          <h1 tabindex="-1">${mode === 'register'
      ? t('إنشاء حساب عميلة', 'Create your account')
      : mode === 'reset'
        ? t('تعيين كلمة مرور جديدة', 'Set a fresh password')
        : t('تسجيل الدخول', 'Welcome back')
    }</h1>
          <p class="muted">${t('تابعي مواعيدك، تصاميم الأظافر، وبتلات برنامج J من مكان واحد.', 'Manage appointments, saved Nail Atelier looks, and J Petals rewards in one calm journal.')}</p>
          <form id="auth-form" data-mode="${mode}">
            <div id="form-error" role="alert"></div>
            ${mode === 'register' ? field(t('الاسم', 'Name'), 'name', 'text', '', 'required autocomplete="name"') : ''}
            ${mode !== 'reset'
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
      t('كلمة المرور (8 أحرف على الأقل)', 'Password (min 8 characters)'),
      'password',
      'password',
      '',
      `required minlength="8" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}"`,
    )}
            ${mode === 'register'
      ? `${field(t('تأكيد كلمة المرور', 'Confirm password'), 'passwordConfirmation', 'password', '', 'required minlength="8" autocomplete="new-password"')}
                   <label class="check">
                     <input type="checkbox" name="terms" required>
                     <span>${t('أوافق على الشروط وسياسة الخصوصية.', 'I agree to the terms and privacy notice.')} <a class="text-link" href="${href('terms')}">${t('اقرئي الشروط', 'Read terms')}</a></span>
                   </label>`
      : ''
    }
            <button class="btn" type="submit" style="width:100%">
              ${mode === 'register'
      ? t('إنشاء الحساب', 'Create account')
      : mode === 'reset'
        ? t('حفظ كلمة المرور', 'Save password')
        : t('تسجيل الدخول', 'Sign in')
    }
            </button>
          </form>
          <div class="auth-links muted">
            ${mode === 'login'
      ? `<a class="text-link" href="${href('register')}">${t('جديدة هنا؟ أنشئي حساباً', 'New here? Create an account')}</a>
                   <a class="text-link auth-secondary-link" href="${href('recovery')}">${t('نسيت كلمة المرور؟', 'Forgot your password?')}</a>`
      : `<a class="text-link" href="${href('login')}">${t('لديك حساب؟ سجلي الدخول', 'Already registered? Sign in')}</a>`
    }
          </div>
        </div>

        <aside class="auth-aside card">
          <span class="eyebrow">${t('مزايا جواز الجمال', 'PASSPORT PRIVILEGES')}</span>
          <h2>${t('ملف عناية شخصي في راحة بيتك', 'Your private home ritual journal')}</h2>
          <p class="muted">${t(
      'صُمم جواز الجمال ليحفظ ذوقك في العناية وتصاميم الأظافر ويمنحك متابعة شفافة لزياراتك دون رسائل تسويقية مزعجة.',
      'Your Beauty Passport keeps your nail looks, preferred care rituals, and verified J Petals balance in one discreet space.',
    )}</p>
          <ul class="inclusion-list">
            <li>${t('حفظ تصاميم أتيليه J للأظافر وإعادة طلبها بنقرة', 'Save custom J Nail Atelier designs for effortless rebooking')}</li>
            <li>${t('متابعة رصيد بتلات J بعد اكتمال الخدمة والدفع', 'Track genuine J Petals earned after staff-verified completed visits')}</li>
            <li>${t('تأكيد فوري ومباشر للمواعيد عبر واتساب بكل خصوصية وسهولة', 'Instant appointment confirmation via WhatsApp with full privacy and ease')}</li>
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
  const canReview = b.status === 'completed';
  const canUploadReceipt = !b.payment_verified && !['cancelled', 'no_show'].includes(b.status);
  return `
    <article class="booking-card">
      <div class="row" style="margin-bottom:8px">
        <h3 style="margin:0"><bdi>${esc(b.reference)}</bdi></h3>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${b.payment_verified ? `<span class="badge" style="background:var(--sage-green);color:#fff">✓ ${t('مدفوع', 'Paid')}</span>` : b.receipt_uploaded ? `<span class="badge pending">📤 ${t('تم رفع الإيصال', 'Receipt Sent')}</span>` : ''}
          ${statusBadge(b.status)}
        </div>
      </div>
      <p class="muted" style="margin-bottom:8px"><bdi>${esc(b.date)} · ${esc(b.time)}</bdi> · ${esc(b.neighborhood)}</p>
      <p style="margin-bottom:12px">${(b.items || []).map((i) => esc(nameOf(i) || i.name)).join(' · ')}</p>
      <div class="row">
        <strong><bdi>${money(b.total)}</bdi></strong>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          ${existingReview ? reviewModerationStatusBadge(existingReview) : ''}
          ${canUploadReceipt ? `<button class="btn small sage" data-upload-receipt="${esc(b.reference)}" type="button">📤 ${b.receipt_uploaded ? t('تحديث إيصال الدفع', 'Update Receipt') : t('إرفاق إيصال الدفع', 'Upload Receipt')}</button>` : ''}
          <button class="btn small light" data-rebook="${esc(b.id)}" type="button">${t('إعادة الحجز', 'Rebook')}</button>
          ${canReview
      ? existingReview
        ? `<button class="btn small light" data-review="${esc(b.id)}" data-edit-review="true" type="button">${t('تعديل التقييم', 'Edit review')}</button>`
        : `<button class="btn small light" data-review="${esc(b.id)}" type="button">${t('قيّمي تجربتك معنا', 'Rate your experience')}</button>`
      : ''
    }
        </div>
      </div>
    </article>
  `;
}

export function petalsContent() {
  const sourceRewards = state.account?.rewards || state.catalog.settings?.rewards || [];
  const rewards = (Array.isArray(sourceRewards) ? sourceRewards : [])
    .filter((r) => r && Number.isFinite(Number(r.points)) && Number(r.points) > 0 && Number.isFinite(Number(r.value)) && Number(r.value) > 0)
    .map((r) => ({ ...r, points: Number(r.points), value: Number(r.value) }))
    .sort((a, b) => a.points - b.points);
  const hasLive = Boolean(state.user && state.account);
  const balance = hasLive ? Math.max(0, Number(state.account.balance || 0)) : 0;
  const nextReward = rewards.find((r) => r.points > balance) || null;
  const topReward = rewards[rewards.length - 1] || null;
  const target = nextReward || topReward;
  const targetValue = target?.points || 1;
  const progressValue = Math.min(balance, targetValue);
  const filledPetals = hasLive ? Math.max(1, Math.round((progressValue / Math.max(1, targetValue)) * 8)) : 5;
  const rewardsList = Array.isArray(state.account?.reward_requests) ? state.account.reward_requests : [];
  const pendingReq = rewardsList.find((q) => q.status === 'pending') || null;
  const availableCount = hasLive ? rewards.filter((r) => balance >= r.points).length : 0;
  const statusCopy = !state.user
    ? t('سجّلي الدخول لمشاهدة رصيدك الحقيقي من الزيارات المكتملة والمدفوعة.', 'Sign in to view your real balance earned from completed, verified visits.')
    : !rewards.length
      ? t('لم تُعتمد المكافآت بعد. ستظهر هنا فور إضافتها.', 'Rewards will appear when the program is configured.')
      : pendingReq
        ? t('لديك طلب مكافأة قيد المراجعة الإدارية حالياً ولا يمكن إرسال طلب جديد حتى حسمه.', 'A reward request is pending team approval; duplicate requests are disabled until resolved.')
        : nextReward
          ? t(`متبقٍ ${num(nextReward.points - balance)} بتلة للمكافأة التالية.`, `${num(nextReward.points - balance)} Petals until your next reward.`)
          : t('يمكنك طلب المكافآت المتاحة لرصيدك.', 'You may request rewards available for your balance.');

  return `
    <section class='jb-rewards-dashboard' aria-labelledby='jb-rewards-heading'>
      <div class='jb-rewards-main'>
        <div class='jb-rewards-heading'>
          <span class='eyebrow'>J BEAUTY · PETALS PROGRAM</span>
          <h2 id='jb-rewards-heading'>${t('برنامج بتلات J', 'J Petals Program')}</h2>
          <p>${t('برنامج بتلات J هو تعبيرنا عن الامتنان لثقتك الدائمة. كل جلسة عناية مكتملة تقربك من مكافآت وتجارب استرخاء استثنائية (1 ريال = 1 بتلة).', 'J Petals is our heartfelt appreciation for your trust. Every completed ritual brings you closer to exclusive treats and savings.')}</p>
        </div>
        <div class='jb-points-display jb-points-hero' aria-live='polite'>
          <div>
            <span class='jb-points-label'>${t('رصيد البتلات', 'Your Petals balance')}</span>
            <strong class='jb-points-total ${hasLive ? '' : 'jb-points-guest'}'>${hasLive ? num(balance) : '—'}</strong>
            ${hasLive ? `<span class='jb-points-unit'>${t('بتلة', 'Petals')}</span>` : ''}
            <p class='jb-points-note'>${statusCopy}</p>
            ${hasLive && target ? `
              <div class='jb-progress-box'>
                <div class='jb-progress-label'><span>${t('التقدم للمكافأة التالية', 'Reward progress')}</span><strong dir='ltr'>${num(progressValue)} / ${num(targetValue)}</strong></div>
                <progress max='${targetValue}' value='${progressValue}' aria-label="${t('التقدم نحو المكافأة', 'Progress toward reward')}"></progress>
              </div>` : ''}
            ${availableCount && !pendingReq ? `<span class='jb-rewards-available'>${availableCount === 1 ? t('مكافأة واحدة متاحة وفق رصيدك', '1 reward option within your balance') : t(`${num(availableCount)} مكافآت متاحة وفق رصيدك`, `${num(availableCount)} reward options within your balance`)}</span>` : ''}
            ${!state.user ? `<div class='jb-rewards-cta'><a class='btn rose' href="${href('register')}">${t('أنشئي حسابك', 'Create your account')}</a></div>` : ''}
          </div>
          <div class='jb-petals-cameo-sm' aria-hidden='true'>${petalBloomSVG(filledPetals, 8, true, hasLive ? balance : null)}</div>
        </div>
      </div>
      <div class='jb-rewards-aside'>
        <span class='eyebrow'>${t('طريقة عمل البرنامج', 'HOW IT WORKS')}</span>
        <ol>
          <li><strong>${t('خدمة مكتملة', 'Completed service')}</strong><span>${t('تُسجل الزيارة بعد تنفيذها فعليًا.', 'Your visit is marked complete.')}</span></li>
          <li><strong>${t('دفع موثّق', 'Verified payment')}</strong><span>${t('تُحتسب البتلات من المبلغ المؤهل المدفوع.', 'Petals are based on eligible verified spending.')}</span></li>
          <li><strong>${t('مكافأة معتمدة', 'Approved reward')}</strong><span>${t('يُراجع طلب الاستبدال ويُطبق على حجز مؤهل غير مدفوع.', 'Redemption is reviewed for an eligible unpaid booking.')}</span></li>
        </ol>
        <p class='jb-rewards-disclaimer'>${t('قد تُعدّل البتلات عند استرداد المدفوعات، ولا تُستبدل نقدًا.', 'Petals may be adjusted after refunds and cannot be exchanged for cash.')}</p>
      </div>
    </section>
    <section class='jb-rewards-catalog' aria-labelledby='jb-rewards-catalog-title'>
      <div class='section-head'><div><span class='eyebrow'>${t('المكافآت', 'REWARDS')}</span><h2 id='jb-rewards-catalog-title'>${t('مكافآت متاحة للطلب', 'Rewards you can request')}</h2></div></div>
      ${rewards.length ? `<div class='jb-reward-grid'>${rewards.map((r) => {
        const title = r.name_ar ? t(r.name_ar, r.name_en) : (r.value === 10 ? t('قسيمة خصم ترحيبية (10 ر.س)', 'Welcome Voucher (10 SAR)') : r.value === 30 ? t('مكافأة الدلال الفضي (30 ر.س)', 'Silver Reward (30 SAR)') : t(`مكافأة ${money(r.value)}`, `${money(r.value)} Reward`));
        const desc = r.description_ar ? t(r.description_ar, r.description_en) : (r.value === 10 ? t('تُخصم مباشرة من قيمة جلستك القادمة عند تأكيد الموعد.', 'Deducted directly from your next appointment.') : r.value === 30 ? t('خصم يمنحك ترقية أو إضافة خدمة عناية خاصة لموعدك.', 'Upgrade or add treatments to your visit.') : t('خصم يُطبق على حجز مؤهل قبل الدفع.', 'Applied to an eligible booking before payment.'));
        return `
        <article class='jb-reward-card'>
          <div class='jb-reward-top'><span>${num(r.points)} ${t('بتلة', 'Petals')}</span><strong>${money(r.value)}</strong></div>
          <h3>${esc(title)}</h3>
          <p>${esc(desc)}</p>
          ${hasLive ? `<button type='button' class='btn small' data-reward='${esc(r.id)}' ${balance < r.points || pendingReq ? 'disabled' : ''}>${pendingReq ? t('يوجد طلب قيد المراجعة', 'Pending request active') : balance >= r.points ? t('اطلبي المكافأة', 'Request reward') : t('الرصيد غير كافٍ', 'Not enough Petals')}</button>` : ''}
        </article>`;
      }).join('')}</div>` : `<div class='empty'>${t('لم تُضف مكافآت إلى البرنامج بعد.', 'No rewards are configured yet.')}</div>`}
    </section>
  `;
}
export function petalsPage() {
  return `
    <main id="main" class="wrap">
      ${head(
    t('برنامج بتلات J', 'J Petals Program'),
    t('برنامج الولاء الداخلي لعميلات J Beauty Spa في المدينة المنورة.', 'J Beauty Spa’s internal loyalty program for customers in Madinah.'),
    [[t('الرئيسية', 'Home'), 'home'], [t('برنامج بتلات J', 'J Petals Program'), '']],
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
          <h3 style="margin:0">${t('خدماتك المفضلة', 'Favorite Rituals')}</h3>
          <a class="text-link" href="${href('services')}">${t('تصفحي المزيد', 'Browse')}</a>
        </div>
        ${favSvcs.length
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
        ${savedStyles.length
      ? `<div style="display:grid;gap:10px">
                ${savedStyles
        .map(
          (st) => `
                  <div class="row saved-style-row" style="padding:10px;border:1px solid var(--border);border-radius:var(--r-sm);gap:12px">
                    <div style="display:flex;align-items:center;gap:12px">
                      <div class="saved-style-thumb">${renderNailPreviewSVG(st)}</div>
                      <div>
                        <strong>${esc(st.name)}</strong>
                        <div class="muted" style="font-size:13px">${esc(localizedShapeLabel(st.shape))} · ${esc(localizedLengthLabel(st.length || 'medium'))} · ${esc(localizedFinishLabel(st.finish || 'gloss'))}</div>
                      </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button type="button" class="btn small light" data-load-style="${esc(st.id)}">${t('تعديل', 'Edit')}</button>
                      <button type="button" class="btn small" data-book-style="${esc(st.id)}">${t('احجزي', 'Book')}</button>
                      <button type="button" class="btn small light" data-del-style="${esc(st.id)}" aria-label="${t('حذف التصميم', 'Delete look')}">✕</button>
                    </div>
                  </div>
                `,
        )
        .join('')}
              </div>`
      : `<p class="muted">${t('صمّمي شكل ولون أظافرك في أتيليه J واحفظيه هنا.', 'Create your signature look in J Nail Atelier and save it here.')}</p>`
    }
      </div>

      <form id="passport-prefs-form" class="card full">
        <h3>${t('تفضيلات عنايتك الشخصية', 'Personal Care Preferences')}</h3>
        <p class="muted">${t('محفوظة في حسابك الخاص فقط لتسهيل طلباتك القادمة.', 'Scoped privately to your account to tailor future bookings.')}</p>
        <div class="form-grid">
          <label class="field">
            ${t('الحي المفضل بالمدينة', 'Preferred Madinah neighborhood')}
            ${areas.length
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
          ${field(t('تفضيل الروائح / الزيوت', 'Scent / Oil note'), 'scent_note', 'text', prefs.scent_note || '', `maxlength="150" placeholder="${t('مثال: الخزامى، البابونج، الورد المديني...', 'Lavender, Chamomile, Rose...')}"`)}
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
      ${head(t('جواز الجمال', 'Beauty Passport'), `${t('أهلاً بك، ', 'Welcome, ')}<bdi>${esc(state.user.name)}</bdi>`)}
      <div class="account-grid">
        <aside class="side-nav">
          <h3 style="margin-bottom:2px">${t('حسابك', 'Your journal')}</h3>
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
          <div class="row" style="margin-bottom:18px;flex-wrap:wrap;gap:10px">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span class="badge" style="background:var(--sage-green);color:#fff">✓ ${t('حساب فعّال وجاهز', 'Active Member')}</span>
              ${state.user.verified ? `<span class="badge">✦ ${t('موثّق من الإدارة', 'Staff Verified')}</span>` : ''}
            </div>
            <a class="btn small shimmer-btn" href="${href('booking')}">${t('طلب موعد جديد ✦', 'Book a new visit ✦')}</a>
          </div>

          ${section === 'rewards'
      ? (() => {
        const bookingRef = (id) => bookings.find((b) => b.id === id)?.reference || '—';
        const reasonLabel = (reason) =>
          ({
            visit: t('توثيق زيارة مكتملة', 'Completed verified visit'),
            'visit adjustment': t('تعديل بعد استرداد مبلغ', 'Refund adjustment'),
            reward: t('استبدال مكافأة', 'Reward redemption'),
            'reward cancellation': t('رد بتلات مكافأة ملغاة', 'Cancelled reward restored'),
          })[reason] || reason;
        const reqStatusLabel = (status) =>
          ({
            pending: t('قيد المراجعة الإدارية', 'Pending review'),
            committed: t('معتمدة ومطبقة', 'Approved & applied'),
            cancelled: t('ملغاة', 'Cancelled'),
          })[status] || status;
        const ledgerRows = (state.account.ledger || []).map((row) => ({
          created_at: String(row.created_at || '').slice(0, 10),
          points: `${Number(row.points) > 0 ? '+' : ''}${num(row.points)}`,
          reason: reasonLabel(row.reason),
          booking_id: row.booking_id ? bookingRef(row.booking_id) : '—',
        }));
        const reqRows = (state.account.reward_requests || []).map((r) => ({
          id: String(r.id || '').slice(0, 8).toUpperCase(),
          status: reqStatusLabel(r.status),
          points: `${num(r.points)} ${t('بتلة', 'petals')}`,
          value: money(r.value),
        }));
        return `${petalsContent()}
                    <h3>${t('سجل البتلات', 'Petal history')}</h3>
                    ${simpleTable(ledgerRows, ['created_at', 'points', 'reason', 'booking_id'])}
                    <h3 style="margin-top:24px">${t('طلبات استبدال المكافآت', 'Reward requests')}</h3>
                    ${simpleTable(reqRows, ['id', 'status', 'points', 'value'])}`;
      })()
      : section === 'bookings'
        ? `<h2>${t('حجوزاتك', 'Your bookings')}</h2>
                   ${bookings.length
          ? bookings.map(bookingCard).join('')
          : `<div class="empty"><h3>${t('لحظتك الأولى تبدأ هنا', 'Your first moment starts here')}</h3><p class="muted">${t('لا توجد حجوزات مرتبطة بهذا الحساب بعد.', 'No bookings linked to this account yet.')}</p><a class="btn" href="${href('booking')}">${t('اطلبي موعدك الآن', 'Request an appointment')}</a></div>`
        }`
        : `${passportJournalSection()}
                   <h2 style="margin-top:28px">${t('حجوزاتك الأخيرة', 'Recent Visits')}</h2>
                   ${bookings.length
          ? bookings.slice(0, 3).map(bookingCard).join('')
          : `<div class="empty muted">${t('لا توجد حجوزات مرتبطة بهذا الحساب بعد. حجوزات الزائرات لا تُربط تلقائياً برقم الجوال.', 'No bookings linked yet. Guest bookings are never merged automatically by phone number.')}</div>`
        }
                   ${(passport.group_requests || []).length || (passport.gift_requests || []).length
          ? `<h3 style="margin-top:24px">${t('طلبات المناسبات والإهداء', 'Occasion & Gift Requests')}</h3>
                          ${[...(passport.group_requests || []), ...(passport.gift_requests || [])]
            .map((req) => {
              const isGroup = 'organizer_name' in req || 'estimated_total' in req;
              const isApproved = req.status === 'approved' || req.status === 'approved_ready';
              const deposit = isGroup ? Math.round(Number(req.estimated_total || 0) * 0.3) || 100 : 0;
              return `
                <div class="booking-card" style="border:1px solid ${isApproved ? 'var(--rose-gold)' : 'var(--border)'};border-radius:var(--r-md);margin-bottom:12px;padding:16px">
                  <div class="row" style="margin-bottom:6px">
                    <strong><bdi>${esc(req.reference)}</bdi></strong>
                    ${statusBadge(req.status)}
                  </div>
                  <p class="muted" style="margin:0 0 6px;font-size:13px">${esc(req.created_at?.slice(0, 10) || '')}${isGroup ? ` · ${esc(req.date || '')} ${esc(req.time || '')} · ${money(req.estimated_total)}` : ''}</p>
                  ${
                    isGroup && isApproved
                      ? `<div style="background:var(--cream);border-radius:var(--r-sm);padding:10px;margin-top:8px;font-size:13px;border:1px solid rgba(212,175,124,0.3)">
                          <strong style="color:var(--plum);display:block;margin-bottom:4px">🎉 ${t('تم اعتماد طلب المناسبة بنجاح!', 'Occasion Request Approved!')}</strong>
                          <div>${t('العربون المطلوب لتأكيد وتثبيت الموعد نهائياً:', 'Deposit required to finalize booking:')} <strong style="color:var(--rose-gold-deep)">${money(deposit)}</strong></div>
                          <div style="font-size:12px;color:var(--ink-muted);margin-top:3px">${t('مصرف الراجحي · الآيبان:', 'Al Rajhi Bank · IBAN:')} <bdi class="mono">SA0380000000000000000000</bdi></div>
                          <a href="https://wa.me/966533718324?text=${encodeURIComponent(t(`مرحباً فريق J Beauty 🌸 بخصوص طلب المناسبة ${req.reference}، أود تأكيد سداد العربون (${deposit} ر.س)...`, `Hello J Beauty team 🌸 Regarding occasion ${req.reference}, I would like to confirm deposit payment...`))}" target="_blank" rel="noopener" class="btn small" style="background:#25D366;color:#fff;margin-top:8px;display:inline-flex;align-items:center;gap:6px">💬 ${t('تأكيد السداد عبر واتساب', 'Confirm Payment via WhatsApp')}</a>
                        </div>`
                      : ''
                  }
                </div>
              `;
            })
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
      if (mode === 'reset') {
        toast(t('تم تحديث كلمة المرور. يرجى تسجيل الدخول.', 'Password updated. Please sign in.'));
        goFn('login');
      } else {
        goFn('account');
      }
    } catch (err) {
      $('#form-error').innerHTML = `<div class="error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $('#logout')?.addEventListener('click', async () => {
    await api('/logout', {});
    state.account = null;
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
          ${r.whatsapp_url
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

  document.querySelectorAll('[data-load-style]').forEach((btn) => {
    btn.onclick = () => {
      const st = state.account?.passport?.saved_styles?.find((x) => x.id === btn.dataset.loadStyle);
      if (!st) return;
      state.atelier = { ...state.atelier, ...st, cameraPreset: state.atelier.cameraPreset || 'editorial' };
      goFn('atelier');
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
      toast(t('تم حفظ تفضيلاتك الشخصية', 'Preferences saved'));
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

  document.querySelectorAll('[data-upload-receipt]').forEach((btn) => {
    btn.onclick = () => {
      const ref = btn.dataset.uploadReceipt;
      const s = state.catalog?.settings || {};
      openDialog(`
        <div>
          <span class="eyebrow" style="color:var(--rose-gold-deep)">✦ ${t('توثيق الدفع', 'PAYMENT PROOF')} ✦</span>
          <h2 style="margin:6px 0 8px">${t('إرفاق إيصال التحويل البنكي', 'Upload Payment Receipt')}</h2>
          <p class="muted" style="font-size:14px">${t('رقم الحجز:', 'Booking Ref:')} <strong><bdi>${esc(ref)}</bdi></strong></p>
          <div class="bank-mini-box" style="margin-bottom:14px">
            <div><strong>${t('البنك:', 'Bank:')}</strong> ${esc(s.bank_name || 'مصرف الراجحي')}</div>
            <div><strong>${t('المستفيد:', 'Account:')}</strong> ${esc(s.bank_account_holder || 'مؤسسة J Beauty Spa')}</div>
            <div><strong>IBAN:</strong> <bdi class="mono">${esc(s.bank_iban || 'SA0380000000000000000000')}</bdi></div>
          </div>
          <form id="modal-receipt-form" style="display:grid;gap:10px">
            <div id="modal-receipt-err" role="alert"></div>
            <label class="field" style="margin:0">
              ${t('اسم المحوّل (اختياري)', 'Sender Name')}
              <input type="text" name="sender_name" value="${esc(state.user?.name || '')}" maxlength="100">
            </label>
            <label class="field" style="margin:0">
              ${t('رقم العملية المرجعي (اختياري)', 'Transfer Reference')}
              <input type="text" name="transfer_ref" placeholder="TRF-..." maxlength="80">
            </label>
            <label class="field" style="margin:0">
              ${t('صورة الإيصال أو PDF (حد أقصى 2 ميجابايت)', 'Receipt Image or PDF (max 2MB)')}
              <input type="file" name="receipt_file" accept="image/png,image/jpeg,image/webp,application/pdf" required>
            </label>
            <button type="submit" class="btn sage" style="width:100%">📤 ${t('رفع وإرسال الإيصال للإدارة', 'Upload Receipt')}</button>
          </form>
        </div>
      `);
      document.querySelector('#modal-receipt-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const file = form.elements.receipt_file?.files?.[0];
        const errBox = document.querySelector('#modal-receipt-err');
        if (!file) return;
        e.submitter.disabled = true;
        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error(t('تعذر قراءة الملف', 'Read failed')));
            reader.readAsDataURL(file);
          });
          await api(`/bookings/${encodeURIComponent(ref)}/receipt`, {
            file_data: dataUrl,
            filename: file.name,
            mime_type: file.type,
            sender_name: form.elements.sender_name?.value || '',
            transfer_ref: form.elements.transfer_ref?.value || '',
            phone: state.user?.phone || '',
          });
          document.querySelector('#modal')?.close();
          state.account = null;
          toast(t('تم إرسال إيصال الدفع لمنصة الإدارة بنجاح ✓', 'Receipt uploaded successfully ✓'));
          renderFn();
        } catch (err) {
          if (errBox) errBox.innerHTML = `<div class="error">${esc(err.message)}</div>`;
          e.submitter.disabled = false;
        }
      });
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
