import { $ops, can, esc, loadDashboard, opsApi, opsState, opsToast, t } from '../ops-state.js';

export function customersView(d) {
  const customers = d.customers || [];
  const canVerify = can('customers.verify_identity');
  const canRecovery = can('customers.recovery_token');

  return `
    ${
      canVerify || canRecovery
        ? `
          <div class="form-grid" style="margin-bottom:16px">
            ${
              canVerify
                ? `
                  <div class="ops-card" style="margin-bottom:0">
                    <h2>${t('توثيق ملكية جوال العميلة (عبر واتساب)', 'Verify Customer Phone Ownership')}</h2>
                    <form id="ops-verify-form">
                      <label class="field">
                        ${t('اختاري العميلة', 'Customer account')}
                        <select name="user_id" required>
                          <option value="">${t('اختاري عميلة بانتظار التوثيق', 'Select unverified customer')}</option>
                          ${customers
                            .filter((c) => !c.verified)
                            .map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.masked_phone)})</option>`)
                            .join('')}
                        </select>
                      </label>
                      <label class="field">
                        ${t('رقم الجوال الفعلي الملاحظ في واتساب', 'Observed WhatsApp sender phone')}
                        <input type="tel" name="observed_phone" required placeholder="05xxxxxxxx">
                      </label>
                      <label class="field">
                        ${t('الرمز المرجعي أحادي الاستخدام', 'One-time verification reference')}
                        <input type="text" name="reference" required>
                      </label>
                      <label class="ops-check" style="margin-bottom:10px">
                        <input type="checkbox" name="checked" required>
                        <span>${t('تحققت من المرسلة الفعلية في واتساب ومطابقة الرمز.', 'I matched the real WhatsApp sender and one-time code.')}</span>
                      </label>
                      <button type="submit" class="btn sage">${t('تأكيد توثيق الحساب', 'Verify Ownership')}</button>
                    </form>
                  </div>
                `
                : ''
            }
            ${
              canRecovery
                ? `
                  <div class="ops-card" style="margin-bottom:0">
                    <h2>${t('إصدار رابط استعادة كلمة مرور العميلة', 'Issue Customer Recovery Link')}</h2>
                    <form id="ops-recovery-form">
                      <label class="field">
                        ${t('الحساب', 'Customer account')}
                        <select name="user_id" required>
                          <option value="">${t('اختاري حساب العميلة', 'Select customer')}</option>
                          ${customers
                            .map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.masked_phone)}) ${c.verified ? '✓' : ''}</option>`)
                            .join('')}
                        </select>
                      </label>
                      <label class="field">
                        ${t('الرقم المتطابق في واتساب', 'Observed WhatsApp sender')}
                        <input type="tel" name="observed_phone" required placeholder="05xxxxxxxx">
                      </label>
                      <label class="ops-check" style="margin-bottom:10px">
                        <input type="checkbox" name="checked" required>
                        <span>${t('تأكدت من تواصل صاحبة الجوال نفسها عبر واتساب.', 'Confirmed genuine account holder over WhatsApp.')}</span>
                      </label>
                      <button type="submit" class="btn">${t('توليد رابط الاستعادة', 'Generate Reset Link')}</button>
                    </form>
                    ${
                      opsState.lastRecovery
                        ? `<div class="alert success" style="margin-top:12px">
                             <strong>${t('رابط الاستعادة لموقع العميلات (صالح 15 دقيقة):', 'Customer-origin recovery URL (15m):')}</strong>
                             <div class="mono" style="margin-top:6px"><bdi>${esc(opsState.lastRecovery.reset_url)}</bdi></div>
                           </div>`
                        : ''
                    }
                  </div>
                `
                : ''
            }
          </div>
        `
        : ''
    }

    <div class="ops-card">
      <h2>${t('دليل العميلات (بيانات الجوال محمية جزئياً)', 'Customer Directory (Masked Numbers)')}</h2>
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('الاسم', 'Name')}</th>
              <th>${t('الجوال المقنّع', 'Masked Phone')}</th>
              <th>${t('التوثيق', 'Verification')}</th>
              <th>${t('تاريخ الانضمام', 'Created')}</th>
              <th>${t('تواصل العناية والاحتفاظ', 'Retention & Care')}</th>
            </tr>
          </thead>
          <tbody>
            ${customers
              .map(
                (c) => {
                  const rebookMsg = encodeURIComponent(
                    `مرحباً بك ${c.name} من J Beauty Spa 🌸\n` +
                    `مرت فترة منذ جلستك الأخيرة.. هل حان وقت تجديد الدلال والراحة؟\n` +
                    `يسعدنا تقديم كود خصم خاص 10% لجلستك القادمة: [SPAWHEEL10] ✨\n` +
                    `احجزي موعدك الآن بكل سهولة ونصلك في راحة بيتك.`
                  );
                  const birthdayMsg = encodeURIComponent(
                    `كل عام وأنتِ بألف خير وتألق ${c.name}! 🎉🌸\n` +
                    `أسرة J Beauty Spa تتمنى لك عاماً مليئاً بالجمال والسعادة.\n` +
                    `يسعدنا إهداؤك خصم 15% بمناسبة يوم ميلادك بكود: [LUXURY15] 🎁✨\n` +
                    `نتشرف دائماً بخدمتك.`
                  );
                  return `
                    <tr>
                      <td><strong>${esc(c.name)}</strong></td>
                      <td><bdi>${esc(c.masked_phone)}</bdi></td>
                      <td>
                        ${c.verified ? `<span class="badge mfa-ok">${t('موثقة', 'Verified')}</span>` : `<span class="badge pending">${t('غير موثقة', 'Unverified')}</span>`}
                        ${c.has_pending_verification ? `<span class="badge">${t('رمز توثيق نشط', 'Active code')}</span>` : ''}
                      </td>
                      <td><bdi>${esc(String(c.created_at || '').slice(0, 10))}</bdi></td>
                      <td>
                        <div class="ops-chip-row">
                          <a href="https://wa.me/?text=${rebookMsg}" target="_blank" rel="noopener noreferrer" class="btn small light" title="${t('إرسال تذكير إعادة الحجز عبر واتساب', 'Send Re-booking reminder')}">
                            🔄 ${t('تذكير إعادة الحجز', 'Re-book')}
                          </a>
                          <a href="https://wa.me/?text=${birthdayMsg}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:var(--rose-gold-light);color:var(--plum)" title="${t('إرسال معايدة وهدية يوم الميلاد', 'Send Birthday Gift')}">
                            🎁 ${t('هدية الميلاد', 'Birthday')}
                          </a>
                        </div>
                      </td>
                    </tr>
                  `;
                },
              )
              .join('') || `<tr><td colspan="5" class="muted">${t('لا توجد حسابات مسجلة.', 'No customer accounts yet.')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="ops-mobile-cards">
        ${customers
          .map(
            (c) => {
              const rebookMsg = encodeURIComponent(
                `مرحباً بك ${c.name} من J Beauty Spa 🌸\n` +
                `مرت فترة منذ جلستك الأخيرة.. هل حان وقت تجديد الدلال والراحة؟ كود خصم خاص 10%: [SPAWHEEL10] ✨`
              );
              const birthdayMsg = encodeURIComponent(
                `كل عام وأنتِ بخير ${c.name}! 🎉 هدية يوم ميلادك خصم 15% من J Beauty Spa بكود: [LUXURY15] 🎁`
              );
              return `
                <div class="ops-mobile-card">
                  <div class="ops-row"><strong>${esc(c.name)}</strong>${c.verified ? `<span class="badge mfa-ok">${t('موثقة', 'Verified')}</span>` : `<span class="badge pending">${t('غير موثقة', 'Unverified')}</span>`}</div>
                  <div class="muted"><bdi>${esc(c.masked_phone)}</bdi> · <bdi>${esc(String(c.created_at || '').slice(0, 10))}</bdi></div>
                  <div class="ops-chip-row" style="margin-top:8px">
                    <a href="https://wa.me/?text=${rebookMsg}" target="_blank" rel="noopener noreferrer" class="btn small light">🔄 ${t('تذكير إعادة الحجز', 'Re-book')}</a>
                    <a href="https://wa.me/?text=${birthdayMsg}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:var(--rose-gold-light);color:var(--plum)">🎁 ${t('هدية الميلاد', 'Birthday')}</a>
                  </div>
                </div>
              `;
            },
          )
          .join('')}
      </div>
    </div>
  `;
}

export function bindCustomers(renderFn) {
  $ops('#ops-verify-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.checked = e.target.elements.checked.checked;
    e.submitter.disabled = true;
    try {
      await opsApi('/verify', d);
      await loadDashboard();
      opsToast(t('تم توثيق حساب العميلة بنجاح', 'Customer ownership verified'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  $ops('#ops-recovery-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.checked = e.target.elements.checked.checked;
    e.submitter.disabled = true;
    try {
      opsState.lastRecovery = await opsApi('/recovery', d);
      opsToast(t('تم توليد رابط الاستعادة بنجاح', 'Recovery link generated'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });
}

