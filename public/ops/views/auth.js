import { $ops, esc, loadDashboard, monogramSvg, opsApi, opsState, refreshOpsSession, t } from '../ops-state.js';

export function opsLoginView() {
  return `
    <main id="ops-main" class="ops-auth-wrap">
      <div class="ops-auth-card">
        <div class="ops-brand-head">
          ${monogramSvg()}
          <div>
            <strong>J Beauty Operations</strong>
            <small>${t('بوابة العمليات والإدارة الداخلية · المدينة المنورة', 'Internal Operations Portal · Al Madinah')}</small>
          </div>
        </div>
        <h1 style="font-size:21px;margin-bottom:6px">${t('تسجيل دخول الفريق', 'Staff Sign In')}</h1>
        <p class="muted" style="margin-bottom:16px">${t(
          'هذه البوابة مخصصة للموظفات والأخصائيات والمالكة فقط. لا تقبل حسابات العميلات.',
          'Dedicated internal workstation for J Beauty staff and leadership. Customer accounts cannot sign in here.',
        )}</p>
        <div id="ops-auth-error" role="alert"></div>
        <form id="ops-login-form">
          <label class="field">
            ${t('رقم الجوال السعودي المسجّل', 'Registered staff mobile')}
            <input type="tel" name="phone" required autocomplete="tel" placeholder="05xxxxxxxx">
          </label>
          <label class="field">
            ${t('كلمة المرور', 'Password')}
            <input type="password" name="password" required autocomplete="current-password">
          </label>
          <button type="submit" class="btn" style="width:100%;margin-top:6px">${t('دخول إلى بوابة العمليات', 'Sign In to Operations')}</button>
        </form>
        <div class="ops-row" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
          <button type="button" class="btn small light" id="ops-lang-toggle">${t('English', 'العربية')}</button>
          <span class="muted" style="font-size:12px">${t('حماية الجلسة مفعّلة', 'Scoped Session Protected')}</span>
        </div>
      </div>
    </main>
  `;
}

export function bindOpsAuth(renderFn) {
  $ops('#ops-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const errBox = $ops('#ops-auth-error');
    if (errBox) errBox.innerHTML = '';
    e.submitter.disabled = true;
    try {
      await opsApi('/login', { phone: d.phone, password: d.password });
      await refreshOpsSession();
      opsState.mfaSetupData = null;
      if (!opsState.mfa.required || opsState.mfa.verified) {
        await loadDashboard();
      }
      renderFn();
    } catch (err) {
      if (errBox) errBox.innerHTML = `<div class="alert error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });
}

