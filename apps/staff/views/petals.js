import { $ops, can, esc, loadDashboard, money, num, opsApi, opsState, opsToast, statusBadge, t } from '../ops-state.js';

export function petalsView(d) {
  const rewards = d.reward_requests || [];
  const bookings = (d.bookings || []).filter((b) => ['pending_confirmation', 'confirmed', 'completed'].includes(b.status));
  const ledger = d.ledger || [];
  const lMeta = d.pagination?.ledger || { page: 1, totalPages: 1 };
  const customers = (d.customers || []).filter((c) => c.verified);
  const canRedeem = can('loyalty.redeem');
  const canAdjust = can('loyalty.adjust');

  return `
    <div class="ops-card">
      <h2>${t('طلبات استبدال مكافآت بتلات J', 'J Petals Reward Requests')}</h2>
      ${
        rewards.length
          ? `
            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>${t('المرجع', 'Request ID')}</th>
                    <th>${t('النقاط والقيمة', 'Points & Value')}</th>
                    <th>${t('الحالة', 'Status')}</th>
                    ${canRedeem ? `<th>${t('الإجراء', 'Action')}</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${rewards
                    .map(
                      (r) => `
                        <tr>
                          <td><strong><bdi>${esc(String(r.id || '').slice(0, 8))}</bdi></strong></td>
                          <td><bdi>${num(r.points)}</bdi> ${t('بتلة', 'petals')} · <bdi>${money(r.value)}</bdi></td>
                          <td>${statusBadge(r.status)}</td>
                          ${
                            canRedeem
                              ? `<td>
                                   ${
                                     r.status === 'pending'
                                       ? `<form class="ops-chip-row" data-reward-commit="${esc(r.id)}">
                                            <select name="booking_id" required style="min-height:34px;border:1px solid var(--border-strong);border-radius:var(--r-sm);padding:4px 8px">
                                              <option value="">${t('ربط بحجز العميلة', 'Target booking')}</option>
                                              ${bookings.filter((b) => b.user_id === r.user_id).map((b) => `<option value="${esc(b.id)}">${esc(b.reference)} (${esc(b.date)})</option>`).join('')}
                                            </select>
                                            <button type="submit" class="btn small sage">${t('تأكيد التطبيق', 'Commit')}</button>
                                            <button type="button" class="btn small light" data-reward-cancel="${esc(r.id)}">${t('إلغاء وإعادة النقاط', 'Cancel')}</button>
                                          </form>`
                                       : r.status === 'fulfilled'
                                         ? `<button type="button" class="btn small light" data-reward-cancel="${esc(r.id)}">${t('عكس وإرجاع النقاط', 'Reverse')}</button>`
                                         : `<span class="muted">—</span>`
                                   }
                                 </td>`
                              : ''
                          }
                        </tr>
                      `,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>
            <div class="ops-mobile-cards">
              ${rewards
                .map(
                  (r) => `
                    <div class="ops-mobile-card">
                      <div class="ops-row"><strong><bdi>${num(r.points)}</bdi> ${t('بتلة', 'petals')}</strong>${statusBadge(r.status)}</div>
                      <div class="muted"><bdi>${money(r.value)}</bdi></div>
                    </div>
                  `,
                )
                .join('')}
            </div>
          `
          : `<p class="muted" style="margin:0">${t('لا توجد طلبات استبدال حالياً.', 'No reward requests queued.')}</p>`
      }
    </div>

    ${
      canAdjust
        ? `
          <div class="ops-card">
            <h2>${t('تسوية نقاط بتلات J يدوياً (صلاحية المالكة)', 'Manual Petals Adjustment (Owner)')}</h2>
            <form id="ops-adjust-form" class="form-grid" style="align-items:end">
              <label class="field">
                ${t('العميلة الموثقة', 'Verified Customer')}
                <select name="user_id" required>
                  <option value="">${t('اختاري العميلة', 'Select verified customer')}</option>
                  ${customers.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(c.masked_phone)})</option>`).join('')}
                </select>
              </label>
              <label class="field">
                ${t('عدد النقاط (+ أو -)', 'Points Delta (+ / -)')}
                <input type="number" name="points" required>
              </label>
              <label class="field">
                ${t('مبرر التسوية في سجل التدقيق', 'Audit Reason')}
                <input type="text" name="reason" required maxlength="300">
              </label>
              <button type="submit" class="btn">${t('تسجيل التسوية', 'Apply Adjustment')}</button>
            </form>
          </div>
        `
        : ''
    }

    <div class="ops-card">
      <div class="ops-row" style="margin-bottom:10px">
        <h2 style="margin:0">${t('دفتر حركات النقاط الموثق', 'Verified Points Ledger')}</h2>
        <div class="ops-chip-row">
          <button type="button" class="btn small light" id="ledger-prev" ${lMeta.page <= 1 ? 'disabled' : ''}>${t('السابق', 'Prev')}</button>
          <span class="muted"><bdi>${num(lMeta.page)} / ${num(lMeta.totalPages)}</bdi></span>
          <button type="button" class="btn small light" id="ledger-next" ${lMeta.page >= lMeta.totalPages ? 'disabled' : ''}>${t('التالي', 'Next')}</button>
        </div>
      </div>
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('النقاط', 'Points')}</th>
              <th>${t('السبب', 'Reason')}</th>
              <th>${t('العميلة', 'User ID')}</th>
              <th>${t('التاريخ', 'Created')}</th>
            </tr>
          </thead>
          <tbody>
            ${ledger
              .map(
                (l) => `
                  <tr>
                    <td><strong class="${l.points > 0 ? 'badge completed' : 'badge pending'}"><bdi>${l.points > 0 ? '+' : ''}${num(l.points)}</bdi></strong></td>
                    <td>${esc(l.reason)}</td>
                    <td class="muted"><bdi>${esc(String(l.user_id || '').slice(0, 8))}</bdi></td>
                    <td><bdi>${esc(String(l.created_at || '').slice(0, 16))}</bdi></td>
                  </tr>
                `,
              )
              .join('') || `<tr><td colspan="4" class="muted">${t('لا توجد حركات مسجلة.', 'Ledger is empty.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function bindPetals(renderFn) {
  document.querySelectorAll('[data-reward-commit]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.rewardCommit;
      const booking_id = new FormData(form).get('booking_id');
      e.submitter.disabled = true;
      try {
        await opsApi(`/rewards/${id}`, { action: 'commit', booking_id });
        await loadDashboard();
        opsToast(t('تم تطبيق المكافأة على الحجز', 'Reward committed'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        e.submitter.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-reward-cancel]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/rewards/${btn.dataset.rewardCancel}`, { action: 'cancel' });
        await loadDashboard();
        opsToast(t('تم إلغاء المكافأة وإرجاع النقاط', 'Reward cancelled and points restored'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  $ops('#ops-adjust-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.points = Number(d.points);
    e.submitter.disabled = true;
    try {
      await opsApi('/adjustment', d);
      await loadDashboard();
      opsToast(t('تمت تسوية الرصيد', 'Balance adjusted'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  $ops('#ledger-prev')?.addEventListener('click', async () => {
    opsState.ledgerPage = Math.max(1, opsState.ledgerPage - 1);
    await loadDashboard();
    renderFn();
  });

  $ops('#ledger-next')?.addEventListener('click', async () => {
    opsState.ledgerPage += 1;
    await loadDashboard();
    renderFn();
  });
}

