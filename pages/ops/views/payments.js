import { $ops, can, esc, loadDashboard, money, opsApi, opsToast, statusBadge, t } from '../ops-state.js';

export function paymentsView(d) {
  const payments = d.payments || [];
  const refunds = d.refund_requests || [];
  const verifiedBookings = payments.filter((p) => p.payment_verified && p.net_amount > 0);
  const canRequest = can('refunds.request');
  const canApprove = can('refunds.approve');

  return `
    ${
      canRequest
        ? `
          <div class="ops-card">
            <h2>${t('رفع طلب استرداد مالي (خطوة ١)', 'Request Refund (Step 1: Finance Request)')}</h2>
            <p class="muted">${t('يطلب فريق المالية الاسترداد بمبرر موثق، ولا ينفذ الاسترداد المالي إلا باعتماد المالكة.', 'Finance can submit a justified refund request; cumulative balance adjustment requires Owner approval.')}</p>
            <form id="ops-refund-req-form" class="form-grid" style="align-items:end">
              <label class="field">
                ${t('الحجز الموثق دفعه', 'Verified Paid Booking')}
                <select name="booking_id" required>
                  <option value="">${t('اختاري الحجز', 'Select booking')}</option>
                  ${verifiedBookings
                    .map((p) => `<option value="${esc(p.booking_id)}">${esc(p.reference)} · ${esc(p.customer_name)} (${money(p.net_amount)})</option>`)
                    .join('')}
                </select>
              </label>
              <label class="field">
                ${t('مبلغ الاسترداد الإضافي (ر.س)', 'Refund Amount (SAR)')}
                <input type="text" inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" dir="ltr" lang="en" name="amount" required>
              </label>
              <label class="field">
                ${t('سبب الاسترداد', 'Reason')}
                <input type="text" name="reason" required maxlength="300">
              </label>
              <button type="submit" class="btn">${t('إرسال للموافقة', 'Submit Request')}</button>
            </form>
          </div>
        `
        : ''
    }

    <div class="ops-card">
      <h2>${t('طلبات الاسترداد المالي', 'Refund Approval Queue')}</h2>
      ${
        refunds.length
          ? `
            <div class="ops-table-wrap">
              <table class="ops-table">
                <thead>
                  <tr>
                    <th>${t('الحجز', 'Booking')}</th>
                    <th>${t('المبلغ', 'Amount')}</th>
                    <th>${t('السبب وطالبة الطلب', 'Reason & Requester')}</th>
                    <th>${t('الحالة', 'Status')}</th>
                    ${canApprove ? `<th>${t('قرار المالكة', 'Owner Decision')}</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${refunds
                    .map(
                      (r) => `
                        <tr>
                          <td><strong><bdi>${esc(r.booking_reference)}</bdi></strong></td>
                          <td><bdi>${money(r.amount)}</bdi></td>
                          <td>${esc(r.reason)}<div class="muted">${esc(r.requested_by_name)}</div></td>
                          <td>${statusBadge(r.status)}</td>
                          ${
                            canApprove
                              ? `<td>
                                   ${
                                     r.status === 'pending'
                                       ? `<div class="ops-chip-row">
                                            <button type="button" class="btn small sage" data-refund-decide="${esc(r.id)}" data-decision="approve">${t('اعتماد', 'Approve')}</button>
                                            <button type="button" class="btn small danger" data-refund-decide="${esc(r.id)}" data-decision="reject">${t('رفض', 'Reject')}</button>
                                          </div>`
                                       : `<span class="muted"><bdi>${esc(String(r.decided_at || '').slice(0, 10))}</bdi></span>`
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
              ${refunds
                .map(
                  (r) => `
                    <div class="ops-mobile-card">
                      <div class="ops-row"><strong><bdi>${esc(r.booking_reference)}</bdi></strong>${statusBadge(r.status)}</div>
                      <div><strong><bdi>${money(r.amount)}</bdi></strong> · ${esc(r.requested_by_name)}</div>
                      <div class="muted">${esc(r.reason)}</div>
                      ${
                        canApprove && r.status === 'pending'
                          ? `<div class="ops-chip-row">
                               <button type="button" class="btn small sage" data-refund-decide="${esc(r.id)}" data-decision="approve">${t('اعتماد', 'Approve')}</button>
                               <button type="button" class="btn small danger" data-refund-decide="${esc(r.id)}" data-decision="reject">${t('رفض', 'Reject')}</button>
                             </div>`
                          : ''
                      }
                    </div>
                  `,
                )
                .join('')}
            </div>
          `
          : `<p class="muted" style="margin:0">${t('لا توجد طلبات استرداد مسجلة.', 'No refund requests logged.')}</p>`
      }
    </div>

    <div class="ops-card">
      <h2>${t('سجل المدفوعات والتحقق المالي', 'Payment Ledger & Reconciliation')}</h2>
      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('المرجع', 'Reference')}</th>
              <th>${t('العميلة', 'Client')}</th>
              <th>${t('المدفوع / المسترد / الصافي', 'Paid / Refund / Net')}</th>
              <th>${t('الوسيلة والتوثيق', 'Method & Status')}</th>
            </tr>
          </thead>
          <tbody>
            ${payments
              .map(
                (p) => `
                  <tr>
                    <td><strong><bdi>${esc(p.reference)}</bdi></strong><div class="muted"><bdi>${esc(p.service_date)}</bdi></div></td>
                    <td>${esc(p.customer_name)}</td>
                    <td>
                      <bdi>${money(p.paid_amount)}</bdi> / <bdi>${money(p.refund_amount)}</bdi> / <strong><bdi>${money(p.net_amount)}</bdi></strong>
                    </td>
                    <td>
                      <span class="badge">${esc(p.payment_method || '-')}</span>
                      ${p.payment_verified ? `<span class="badge mfa-ok">${t('موثق', 'Verified')}</span>` : `<span class="badge pending">${t('بانتظار التوثيق', 'Awaiting Check')}</span>`}
                    </td>
                  </tr>
                `,
              )
              .join('') || `<tr><td colspan="4" class="muted">${t('لا توجد سجلات مدفوعات.', 'No payment records yet.')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="ops-mobile-cards">
        ${payments
          .map(
            (p) => `
              <div class="ops-mobile-card">
                <div class="ops-row"><strong><bdi>${esc(p.reference)}</bdi></strong>${p.payment_verified ? `<span class="badge mfa-ok">${t('موثق', 'Verified')}</span>` : `<span class="badge pending">${t('غير موثق', 'Unverified')}</span>`}</div>
                <div>${esc(p.customer_name)} · <bdi>${money(p.net_amount)}</bdi></div>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}

export function bindPayments(renderFn) {
  $ops('#ops-refund-req-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.amount = Number(d.amount);
    e.submitter.disabled = true;
    try {
      await opsApi('/refunds/request', d);
      await loadDashboard();
      opsToast(t('تم تسجيل طلب الاسترداد للموافقة', 'Refund request submitted for Owner decision'));
      renderFn();
    } catch (err) {
      opsToast(err.message);
      e.submitter.disabled = false;
    }
  });

  document.querySelectorAll('[data-refund-decide]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/refunds/${btn.dataset.refundDecide}/decide`, { decision: btn.dataset.decision });
        await loadDashboard();
        opsToast(t('تم تنفيذ القرار المالي بنجاح', 'Refund decision recorded'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}

