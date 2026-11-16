import { $ops, esc, loadDashboard, monogramSvg, opsApi, opsState, opsToast, refreshOpsSession, roleLabel, t } from '../ops-state.js';

export function opsMfaView() {
  const u = opsState.user;
  const needsSetup = !opsState.mfa.enabled || !!opsState.mfaSetupData;
  const setup = opsState.mfaSetupData;

  return `
    <main id="ops-main" class="ops-auth-wrap">
      <div class="ops-auth-card">
        <div class="ops-brand-head">
          ${monogramSvg()}
          <div>
            <strong>J Beauty Operations</strong>
            <small>${esc(u.name)} · ${esc(roleLabel(u.role))}</small>
          </div>
        </div>
        <h1 style="font-size:20px;margin-bottom:6px">
          ${needsSetup ? t('تفعيل التحقق الثنائي الإلزامي (MFA)', 'Mandatory Two-Factor Setup') : t('تأكيد رمز تطبيق المصادقة', 'Two-Factor Verification')}
        </h1>
        <p class="muted" style="margin-bottom:14px">
          ${needsSetup
            ? t('لأمان بيانات العميلات والعمليات المالية، يجب إتمام ربط تطبيق المصادقة (Google Authenticator أو 1Password) قبل الوصول إلى لوحة العمليات.', 'To protect customer records and financial actions, link an authenticator app before entering Operations.')
            : t('أدخلي الرمز المكوّن من 6 أرقام من تطبيق المصادقة، أو استخدمي أحد رموز الطوارئ.', 'Enter the 6-digit code from your authenticator app or use a single-use recovery code.')}
        </p>
        <div id="ops-mfa-error" role="alert"></div>

        ${
          needsSetup && !setup
            ? `<button type="button" class="btn" id="ops-start-mfa-setup" style="width:100%">${t('إنشاء مفتاح المصادقة وأكواد الطوارئ', 'Generate Authenticator Key & Recovery Codes')}</button>`
            : ''
        }

        ${
          setup
            ? `
              <div class="alert warn">
                <strong>${t('الخطوة ١: أضيفي هذا المفتاح في تطبيق المصادقة', 'Step 1: Add this key in your authenticator app')}</strong>
                <div class="mono" style="margin-top:8px"><bdi>${esc(setup.secret)}</bdi></div>
                <small class="muted" style="display:block;margin-top:6px;overflow-wrap:anywhere;word-break:break-all"><bdi>${esc(setup.otpauth_uri)}</bdi></small>
              </div>
              <div class="alert success">
                <strong>${t('الخطوة ٢: احفظي رموز الطوارئ أحادية الاستخدام (تظهر مرة واحدة فقط)', 'Step 2: Save single-use recovery codes (shown once)')}</strong>
                <div class="mono" style="margin-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:4px">
                  ${setup.recovery_codes.map((c) => `<span><bdi>${esc(c)}</bdi></span>`).join('')}
                </div>
              </div>
            `
            : ''
        }

        ${
          !needsSetup || setup
            ? `
              <form id="ops-mfa-verify-form" style="margin-top:12px">
                <label class="field">
                  ${t('رمز المصادقة من 6 أرقام', '6-digit TOTP code')}
                  <input type="text" inputmode="numeric" pattern="[0-9]{6}" name="code" placeholder="000000" autocomplete="one-time-code" ${!needsSetup ? '' : 'required'}>
                </label>
                ${
                  !needsSetup
                    ? `<label class="field">
                         ${t('أو رمز طوارئ أحادي الاستخدام (اختياري)', 'Or single-use recovery code (optional)')}
                         <input type="text" name="recovery_code" placeholder="ABCD-1234">
                       </label>`
                    : ''
                }
                <button type="submit" class="btn" style="width:100%">${t('تأكيد والدخول إلى العمليات', 'Verify & Enter Operations')}</button>
              </form>
            `
            : ''
        }

        <div class="ops-row" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
          <button type="button" class="btn small light" id="ops-lang-toggle">${t('English', 'العربية')}</button>
          <button type="button" class="btn small light" id="ops-logout-gate">${t('تسجيل الخروج', 'Sign Out')}</button>
        </div>
      </div>
    </main>
  `;
}

export function bindOpsMfa(renderFn) {
  $ops('#ops-start-mfa-setup')?.addEventListener('click', async (btnEv) => {
    btnEv.currentTarget.disabled = true;
    try {
      opsState.mfaSetupData = await opsApi('/mfa/setup', {});
      renderFn();
    } catch (err) {
      const box = $ops('#ops-mfa-error');
      if (box) box.innerHTML = `<div class="alert error">${esc(err.message)}</div>`;
      btnEv.currentTarget.disabled = false;
    }
  });

  $ops('#ops-mfa-verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const errBox = $ops('#ops-mfa-error');
    if (errBox) errBox.innerHTML = '';
    e.submitter.disabled = true;
    try {
      const payload = d.code?.trim() ? { code: d.code.trim() } : { recovery_code: d.recovery_code?.trim() };
      await opsApi('/mfa/verify', payload);
      await refreshOpsSession();
      opsState.mfaSetupData = null;
      await loadDashboard();
      opsToast(t('تم التحقق الثنائي بنجاح', 'Two-factor verification completed'));
      renderFn();
    } catch (err) {
      if (errBox) errBox.innerHTML = `<div class="alert error">${esc(err.message)}</div>`;
      e.submitter.disabled = false;
    }
  });

  $ops('#ops-logout-gate')?.addEventListener('click', async () => {
    await opsApi('/logout', {});
    opsState.user = null;
    opsState.mfaSetupData = null;
    await refreshOpsSession();
    renderFn();
  });
}
