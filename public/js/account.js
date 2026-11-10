import {
  $,
  api,
  esc,
  href,
  money,
  nameOf,
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
  petalBloomSVG,
  simpleTable,
  statusBadge,
} from './components.js';

export function auth(mode = 'login') {
  const tokenVal =
    new URLSearchParams(location.search).get('token') ||
    decodeURIComponent(location.hash.slice(1)) ||
    '';

  return `
    <main id="main" class="wrap">
      <div class="auth">
        <span class="eyebrow">J SPA · ${t('حسابكِ الخاص', 'YOUR SPACE')}</span>
        <h1>${
          mode === 'register'
            ? t('إنشاء حساب عميلة', 'Create your account')
            : mode === 'reset'
              ? t('تعيين كلمة مرور جديدة', 'Set a fresh password')
              : t('تسجيل الدخول', 'Welcome back')
        }</h1>
        <p class="muted">${t('تابعي مواعيدكِ وبتلات نادي J من مكان واحد.', 'Follow your appointments and J Petals rewards in one calm place.')}</p>
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
                  'required autocomplete="tel" placeholder="05xxxxxxxx"',
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
        <div class="muted" style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
          ${
            mode === 'login'
              ? `<a class="text-link" style="width:fit-content" href="${href('register')}">${t('جديدة هنا؟ أنشئي حساباً', 'New here? Create an account')}</a>
                 <a href="${href('recovery')}">${t('نسيتِ كلمة المرور؟', 'Forgot your password?')}</a>`
              : `<a class="text-link" style="width:fit-content" href="${href('login')}">${t('لديكِ حساب؟ سجلي الدخول', 'Already registered? Sign in')}</a>`
          }
        </div>
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
      <p class="muted" style="margin-bottom:8px">${esc(b.date)} · ${esc(b.time)} · ${esc(b.neighborhood)}</p>
      <p style="margin-bottom:12px">${(b.items || []).map((i) => esc(nameOf(i) || i.name)).join(' · ')}</p>
      <div class="row">
        <strong>${money(b.total)}</strong>
        ${
          canReview
            ? existingReview
              ? `<button class="btn small light" data-review="${esc(b.id)}" data-edit-review="true" type="button">${t('تعديل تقييمكِ', 'Edit review')}</button>`
              : `<button class="btn small light" data-review="${esc(b.id)}" type="button">${t('شاركي تجربتكِ', 'Share your experience')}</button>`
            : ''
        }
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
  const balance = verified && state.account ? Number(state.account.balance || 0) : 0;
  const nextReward = rewards.find((r) => r.points > balance) || rewards[rewards.length - 1] || { points: 500 };
  const progressRatio = verified && state.account ? Math.min(1, balance / Math.max(1, nextReward.points)) : 0.45;
  const filledPetals = verified && state.account ? Math.round(progressRatio * 8) : 4;

  return `
    <div class="loyalty-band" style="margin-bottom:28px">
      <div>
        <span class="eyebrow">J PETALS CLUB</span>
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
      </div>
      <div class="loyalty-card">
        <span class="eyebrow" style="margin-bottom:4px">${t('رصيد البتلات الحالي', 'YOUR PETAL BALANCE')}</span>
        <div class="petal-arc-wrap">
          ${petalBloomSVG(filledPetals, 8)}
          <div class="loyalty-balance-num">${state.account && verified ? balance.toLocaleString() : '—'}</div>
          <p class="muted" style="color:#E0D3D8">
            ${
              state.account && verified
                ? balance >= nextReward.points
                  ? t('مؤهلة لطلب المكافأة المتاحة الآن!', 'Eligible for an available reward!')
                  : t(`متبقٍ ${nextReward.points - balance} بتلة للمكافأة التالية`, `${nextReward.points - balance} petals until next reward`)
                : state.user
                  ? t('وثّقي رقم جوالكِ لعرض رصيدكِ الفعلي.', 'Verify your phone number to view your live balance.')
                  : t('عرض توضيحي — سجلي الدخول لمشاهدة رصيدكِ الفعلي.', 'Illustrative preview — sign in to see your live balance.')
            }
          </p>
        </div>
        ${!state.user ? `<a class="btn rose" style="width:100%" href="${href('register')}">${t('انضمي للنادي الآن', 'Join J Petals Club')}</a>` : ''}
      </div>
    </div>

    <div class="grid two section-tight" style="padding-top:0">
      ${rewards
        .map(
          (r) => `
        <article class="card">
          <span class="eyebrow">${r.points} ${t('بتلة', 'PETALS')}</span>
          <h3>${t('مكافأة خصم بقيمة', 'Reward discount of')} ${money(r.value)}</h3>
          <p class="muted">${t('تُراجع من الفريق وتُطبق على حجزكِ المؤهل غير المدفوع.', 'Reviewed by staff and applied to an eligible unpaid booking.')}</p>
          ${
            state.account && verified
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

export async function accountPage(section) {
  if (!state.user) return auth('login');
  if (!state.account) {
    state.account = await api('/account');
  }
  const cur = page();

  return `
    <main id="main" class="wrap">
      ${head(t('أهلاً، ', 'Hello, ') + esc(state.user.name))}
      <div class="account-grid">
        <aside class="side-nav">
          <h3 style="margin-bottom:2px">${t('حسابكِ', 'Your space')}</h3>
          <span class="muted" style="margin-bottom:10px"><bdi>${esc(state.user.phone)}</bdi></span>
          ${[
            ['account', 'نظرة عامة', 'Overview'],
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
              : `<h2>${t('حجوزاتكِ', 'Your bookings')}</h2>
                 ${
                   state.account.bookings?.length
                     ? state.account.bookings.map(bookingCard).join('')
                     : `<div class="empty">
                          <h3>${t('لحظتكِ الأولى تبدأ هنا', 'Your first moment starts here')}</h3>
                          <p class="muted">${t(
                            'لا توجد حجوزات مرتبطة بهذا الحساب بعد. حجوزات الزائرات السابقة لا تُربط تلقائياً برقم الجوال حفاظاً على الخصوصية.',
                            'No bookings are attached to your account yet. Guest bookings are never automatically merged by phone number.',
                          )}</p>
                          <a class="btn" href="${href('booking')}">${t('اطلبي موعدكِ الآن', 'Request an appointment')}</a>
                        </div>`
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
      const bookingId = btn.dataset.review;
      const isEdit = btn.dataset.editReview === 'true';
      const existing = state.account?.reviews?.find((r) => r.booking_id === bookingId);
      openDialog(`
        <h2>${isEdit ? t('تعديل تجربتكِ', 'Edit your experience') : t('كيف كانت لحظتكِ؟', 'How was your moment?')}</h2>
        <form id="review-form">
          <label class="field">
            ${t('التقييم', 'Rating')}
            <select name="rating">
              ${[5, 4, 3, 2, 1]
                .map((n) => `<option value="${n}" ${existing?.rating === n ? 'selected' : ''}>${n} / 5</option>`)
                .join('')}
            </select>
          </label>
          ${field(t('الاسم الظاهر للعامة (اختياري)', 'Public display name (optional)'), 'display_name', 'text', existing?.display_name || '', 'maxlength="60"')}
          <label class="field">
            ${t('تجربتكِ', 'Your experience')}
            <textarea name="body" required maxlength="2000">${esc(existing?.body || '')}</textarea>
          </label>
          <p class="muted">${t('لا تضعي رقم الجوال أو العنوان. تُراجع الآراء قبل نشرها.', 'Do not include phone numbers or addresses. Reviews are moderated before publication.')}</p>
          <button class="btn" type="submit">${t('إرسال للمراجعة', 'Submit for moderation')}</button>
        </form>
      `);
      $('#review-form').onsubmit = async (ev) => {
        ev.preventDefault();
        try {
          const d = Object.fromEntries(new FormData(ev.target));
          await api('/reviews', {
            ...d,
            booking_id: bookingId,
            rating: Number(d.rating),
            edit: isEdit,
          });
          $('#modal').close();
          state.account = null;
          toast(t('شكراً لمشاركة تجربتكِ', 'Thank you for sharing'));
          renderFn();
        } catch (err) {
          toast(err.message);
        }
      };
    };
  });
}
