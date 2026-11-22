import { $ops, can, canAny, esc, loadDashboard, money, num, opsApi, opsState, opsToast, statusBadge, t } from '../ops-state.js';

export function bookingsView(d) {
  const list = d.bookings || [];
  const meta = d.pagination?.bookings || { page: 1, totalPages: 1, total: list.length };
  const rawPractitioners = d.assignable_practitioners || [];
  const rawSpecialists = (d.specialists || []).map((s) => ({ id: s.id, name: `${s.name_ar || s.name_en} (${s.title_ar || 'أخصائية معتمدة'})` }));
  const practitioners = [...rawSpecialists, ...rawPractitioners.filter((p) => !rawSpecialists.some((s) => s.id === p.id))];
  const canFullEdit = can('bookings.update');
  const canConfirm = can('bookings.confirm') || canFullEdit;
  const canBasicStatus = can('bookings.update_status_basic') || canFullEdit;
  const canPractitionerStatus = can('bookings.update_assigned_status') && !canBasicStatus && !canConfirm;
  const canAssign = can('bookings.assign');
  const canNotes = canFullEdit || can('bookings.confirm');
  const canPay = can('payments.verify');

  const bookingActionsHtml = (b) => {
    const isExpanded = opsState.expandedBookingId === b.id;
    const transitions = {
      pending_confirmation: [
        canConfirm ? ['confirmed', 'تأكيد الموعد', 'Confirm'] : null,
        canBasicStatus ? ['cancelled', 'إلغاء', 'Cancel'] : null,
      ].filter(Boolean),
      confirmed: [
        canBasicStatus || canPractitionerStatus ? ['in_progress', 'بدء الزيارة', 'Start Visit'] : null,
        canBasicStatus || canPractitionerStatus ? ['completed', 'إكمال الزيارة', 'Complete'] : null,
        canBasicStatus ? ['no_show', 'عدم حضور', 'No Show'] : null,
        canBasicStatus ? ['cancelled', 'إلغاء', 'Cancel'] : null,
      ].filter(Boolean),
      in_progress: [
        canBasicStatus || canPractitionerStatus ? ['completed', 'إكمال الزيارة', 'Complete'] : null,
        canBasicStatus ? ['cancelled', 'إلغاء', 'Cancel'] : null,
      ].filter(Boolean),
    }[b.status] || [];

    const clientPhoneDigits = String(b.phone || '').replace(/\D/g, '');
    const normalizedPhone = clientPhoneDigits.startsWith('05') ? '966' + clientPhoneDigits.slice(1) : clientPhoneDigits;
    const servicesList = (b.items || []).map((i) => `${i.name_ar || i.name} (${i.price} ر.س)`).join(' + ');
    const addOnsList = b.add_ons && b.add_ons.length ? `\n- الخدمات الإضافية: ${b.add_ons.map((a) => `${a.name_ar} (+${a.price} ر.س)`).join(' + ')}` : '';
    const deliveryLine = Number(b.delivery_fee || 0) > 0 ? `\n- رسوم التوصيل: ${b.delivery_fee} ر.س` : '';
    const couponLine = b.discount_amount ? `\n- الخصم (${b.coupon_code || ''}): -${b.discount_amount} ر.س` : '';
    const cfg = d.settings || {};
    const publicBase = (opsState.customerOrigin || window.location.origin).replace(/\/+$/, '');
    const publicInvoicePdfUrl = b.invoice_pdf_url ? `${publicBase}${b.invoice_pdf_url}` : '';
    const publicInvoiceViewUrl = b.invoice_url ? `${publicBase}${b.invoice_url}` : '';
    const detailsMsg = encodeURIComponent(
      `مرحباً بك ${b.name} في J Beauty Spa 🌸\n` +
      `يسعدنا استلام طلب حجزك المنزلي في المدينة المنورة:\n` +
      `- رقم الحجز: ${b.reference}\n` +
      `- الموعد: ${b.date} في تمام الساعة ${b.time}\n` +
      `- الحي: ${b.neighborhood}\n` +
      `- الخدمات: ${servicesList}${addOnsList}${deliveryLine}${couponLine}\n` +
      `- الإجمالي النهائي: ${b.total} ر.س\n\n` +
      `لطفاً إتمام التحويل البنكي لتأكيد الموعد وإرسال إيصال الدفع:\n` +
      `البنك: ${cfg.bank_name || 'مصرف الراجحي'}\n` +
      `المستفيد: ${cfg.bank_account_holder || 'مؤسسة J Beauty Spa'}\n` +
      `IBAN: ${cfg.bank_iban || 'SA0380000000000000000000'}\n\n` +
      `بانتظار إرسال صورة إيصال الدفع لتأكيد موعدك وإصدار الفاتورة ✨`
    );
    const waDetailsUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${detailsMsg}` : '#';

    const confirmMsg = encodeURIComponent(
      `تم تأكيد حجزك ودفعك بنجاح في J Beauty Spa! 🌸\n` +
      `- رقم الحجز: ${b.reference}\n` +
      `- الموعد: ${b.date} الساعة ${b.time}\n` +
      `- الأخصائية: ${b.assigned_staff_name || 'فريق مختصات J Beauty Spa'}\n` +
      `${publicInvoicePdfUrl ? `\n📄 رابط فاتورتك الرسمية PDF:\n${publicInvoicePdfUrl}\n` : ''}\n` +
      `المختصة ستصل إلى موقعك في الموعد المحدد بكل ما يلزم من أدوات معقمة فردياً. نتمنى لك تجربة استرخاء ودلال استثنائية ✨`
    );
    const waConfirmUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${confirmMsg}` : '#';

    const invoiceWaMsg = encodeURIComponent(
      `مرحباً ${b.name} 🌸\n` +
      `إليك فاتورة حجزك الرسمية من J Beauty Home Spa:\n` +
      `- رقم الفاتورة: INV-${String(b.reference || '').replace(/^J-/, '')}\n` +
      `- الخدمات: ${servicesList}${addOnsList}${deliveryLine}${couponLine}\n` +
      `- الإجمالي: ${b.total} ر.س\n` +
      `- حالة الدفع: ${b.payment_verified ? 'مدفوعة وموثّقة ✓' : 'بانتظار تأكيد الدفع'}\n\n` +
      `📄 تحميل الفاتورة بصيغة PDF:\n${publicInvoicePdfUrl}\n` +
      `🌐 عرض الفاتورة أونلاين:\n${publicInvoiceViewUrl}\n\n` +
      `سعدنا بخدمتك دائماً في J Beauty Spa ✨`
    );
    const waInvoiceUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${invoiceWaMsg}` : '#';

    return `
      <div class="ops-chip-row" style="margin-top:6px">
        ${transitions
          .map(
            ([nextSt, ar, en]) =>
              `<button type="button" class="btn small ${nextSt === 'confirmed' || nextSt === 'completed' ? 'sage' : nextSt === 'cancelled' || nextSt === 'no_show' ? 'light' : ''}" data-bk-transition="${esc(b.id)}" data-next-status="${nextSt}">${t(ar, en)}</button>`,
          )
          .join('')}
        <a href="/api/ops/bookings/${encodeURIComponent(b.id)}/invoice.pdf" target="_blank" rel="noopener noreferrer" class="btn small light" title="${t('تحميل فاتورة PDF', 'Download PDF Invoice')}">
          📄 ${t('فاتورة PDF', 'PDF Invoice')}
        </a>
        ${
          b.receipt_uploaded
            ? `<button type="button" class="btn small" style="background:var(--rose-gold);color:#fff" data-view-receipt="${esc(b.id)}">👁 ${t('عرض إيصال الدفع', 'View Receipt')}</button>`
            : ''
        }
        ${
          normalizedPhone
            ? `
              <a href="${waDetailsUrl}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:#25D366;color:#fff;display:inline-flex;align-items:center;gap:4px">
                <span>💬</span> ${t('طلب الدفع والإيصال', 'Payment WA')}
              </a>
              <a href="${waConfirmUrl}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:#128C7E;color:#fff;display:inline-flex;align-items:center;gap:4px">
                <span>✓</span> ${t('تأكيد الموعد', 'Confirm WA')}
              </a>
              <a href="${waInvoiceUrl}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:var(--plum);color:#fff;display:inline-flex;align-items:center;gap:4px">
                <span>📩</span> ${t('إرسال الفاتورة PDF واتساب', 'Send PDF Invoice WA')}
              </a>
            `
            : ''
        }
        ${
          canAny('bookings.assign', 'bookings.update', 'payments.verify') || canNotes
            ? `<button type="button" class="btn small light" data-bk-expand="${esc(b.id)}">${isExpanded ? t('إغلاق التفاصيل', 'Hide details') : t('إدارة / تعيين / إيصال', 'Manage / Assign / Receipt')}</button>`
            : ''
        }
      </div>
      ${
        isExpanded
          ? `
            <form class="ops-card" style="margin-top:10px;margin-bottom:0;background:var(--ivory)" data-bk-form="${esc(b.id)}">
              <div class="form-grid">
                ${
                  canAssign
                    ? `
                      <label class="field">
                        ${t('الأخصائية المعينة', 'Assigned Practitioner')}
                        <select name="assigned_staff_id">
                          <option value="">${t('غير معينة', 'Unassigned')}</option>
                          ${practitioners
                            .map((p) => `<option value="${esc(p.id)}" ${b.assigned_staff_id === p.id ? 'selected' : ''}>${esc(p.name)}</option>`)
                            .join('')}
                        </select>
                      </label>
                    `
                    : ''
                }
                ${
                  canFullEdit && ['pending_confirmation', 'confirmed'].includes(b.status)
                    ? `
                      <label class="field">
                        ${t('تاريخ الموعد', 'Date')}
                        <input type="date" name="date" value="${esc(b.date)}">
                      </label>
                      <label class="field">
                        ${t('وقت الموعد', 'Time')}
                        <input type="time" name="time" value="${esc(b.time)}">
                      </label>
                    `
                    : ''
                }
              </div>
              ${
                canNotes
                  ? `
                    <label class="field">
                      ${t('ملاحظات الفريق الداخلية (لا تظهر للعميلة)', 'Internal staff notes')}
                      <textarea name="internal_notes" maxlength="1000">${esc(b.internal_notes || '')}</textarea>
                    </label>
                  `
                  : ''
              }
              ${
                canPay
                  ? `
                    <div class="form-grid" style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px">
                      <label class="field">
                        ${t('المبلغ المدفوع (ر.س)', 'Paid Amount (SAR)')}
                        <input type="text" inputmode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" dir="ltr" lang="en" name="paid_amount" value="${esc(b.paid_amount ?? b.total ?? '')}" ${b.payment_verified ? 'readonly' : ''}>
                      </label>
                      <label class="field">
                        ${t('وسيلة الدفع', 'Payment Method')}
                        <select name="payment_method" ${b.payment_verified ? 'disabled' : ''}>
                          <option value="">${t('اختاري الوسيلة', 'Select method')}</option>
                          <option value="cash" ${b.payment_method === 'cash' ? 'selected' : ''}>${t('نقداً عند الزيارة', 'Cash')}</option>
                          <option value="card" ${b.payment_method === 'card' ? 'selected' : ''}>${t('شبكة / بطاقة', 'Card / Mada')}</option>
                          <option value="bank_transfer" ${b.payment_method === 'bank_transfer' ? 'selected' : ''}>${t('تحويل بنكي', 'Bank Transfer')}</option>
                          <option value="other" ${b.payment_method === 'other' ? 'selected' : ''}>${t('أخرى', 'Other')}</option>
                        </select>
                      </label>
                    </div>
                    ${
                      !b.payment_verified
                        ? `<label class="ops-check" style="margin-bottom:10px">
                             <input type="checkbox" name="payment_verified">
                             <span>${t('توثيق استلام المبلغ فعلياً (لا يمكن التراجع بعد التوثيق إلا عبر الاسترداد)', 'Confirm payment received (immutable once verified)')}</span>
                           </label>`
                        : `<div class="badge mfa-ok" style="margin-bottom:10px">${t('تم توثيق الدفع بالكامل', 'Payment verified')}</div>`
                    }
                  `
                  : ''
              }
              <button type="submit" class="btn small">${t('حفظ التعديلات', 'Save Changes')}</button>
            </form>
            ${
              canPay || canFullEdit
                ? `
                  <form class="ops-card" style="margin-top:8px;margin-bottom:0;background:#fff;border:1px dashed var(--rose-gold)" data-bk-receipt-form="${esc(b.id)}">
                    <div class="ops-row" style="margin-bottom:6px">
                      <strong>📤 ${t('إرفاق / توثيق إيصال الدفع لهذا الحجز', 'Attach Payment Receipt Proof')}</strong>
                      ${b.receipt_uploaded ? `<button type="button" class="btn small light" data-view-receipt="${esc(b.id)}">👁 ${t('عرض الإيصال المرفق', 'View Attached Receipt')}</button>` : ''}
                    </div>
                    <div class="form-grid" style="align-items:end">
                      <label class="field" style="margin:0">
                        <small>${t('مرجع التحويل (اختياري)', 'Transfer Ref')}</small>
                        <input type="text" name="transfer_ref" value="${esc(b.receipt_transfer_ref || '')}" placeholder="TRF-...">
                      </label>
                      <label class="field" style="margin:0">
                        <small>${t('صورة أو PDF للإيصال (2MB)', 'Receipt Image/PDF')}</small>
                        <input type="file" name="receipt_file" accept="image/png,image/jpeg,image/webp,application/pdf" required>
                      </label>
                      <button type="submit" class="btn small sage">📤 ${t('حفظ الإيصال في السجل', 'Attach Receipt')}</button>
                    </div>
                  </form>
                `
                : ''
            }
          `
          : ''
      }
    `;
  };

  return `
    <div class="ops-card">
      <form id="ops-bookings-filter" class="ops-filter-bar">
        <label class="field">
          ${t('بحث بالمرجع أو الاسم أو الحي أو الأخصائية', 'Search ref, client, neighborhood, staff')}
          <input type="search" name="q" value="${esc(opsState.bookingSearch)}" placeholder="${t('J-... / اسم العميلة', 'J-... / Client name')}">
        </label>
        <label class="field">
          ${t('حالة الحجز', 'Booking Status')}
          <select name="status">
            <option value="">${t('جميع الحالات المسموحة', 'All visible statuses')}</option>
            <option value="pending_confirmation" ${opsState.bookingStatus === 'pending_confirmation' ? 'selected' : ''}>${t('بانتظار التأكيد', 'Pending Confirmation')}</option>
            <option value="confirmed" ${opsState.bookingStatus === 'confirmed' ? 'selected' : ''}>${t('مؤكد', 'Confirmed')}</option>
            <option value="in_progress" ${opsState.bookingStatus === 'in_progress' ? 'selected' : ''}>${t('قيد التنفيذ', 'In Progress')}</option>
            <option value="completed" ${opsState.bookingStatus === 'completed' ? 'selected' : ''}>${t('مكتمل', 'Completed')}</option>
            <option value="cancelled" ${opsState.bookingStatus === 'cancelled' ? 'selected' : ''}>${t('ملغى', 'Cancelled')}</option>
          </select>
        </label>
        <button type="submit" class="btn">${t('تصفية', 'Filter')}</button>
        <button type="button" class="btn light" id="ops-bookings-reset">${t('إعادة ضبط', 'Reset')}</button>
      </form>

      <div class="ops-table-wrap">
        <table class="ops-table">
          <thead>
            <tr>
              <th>${t('المرجع', 'Reference')}</th>
              <th>${t('العميلة والجوال', 'Client & Mobile')}</th>
              <th>${t('الخدمات والموعد', 'Services & Schedule')}</th>
              <th>${t('الأخصائية والدفع', 'Staff & Payment')}</th>
              <th>${t('الحالة والإجراء', 'Status & Actions')}</th>
            </tr>
          </thead>
          <tbody>
            ${
              list.length
                ? list
                    .map(
                      (b) => `
                        <tr>
                          <td><strong><bdi>${esc(b.reference)}</bdi></strong></td>
                          <td>
                            <div>${esc(b.name)}</div>
                            <div class="muted"><bdi>${esc(b.phone)}</bdi> · ${esc(b.neighborhood)}</div>
                            ${b.notes ? `<div class="muted">${t('ملاحظة العميلة:', 'Client note:')} ${esc(b.notes)}</div>` : ''}
                          </td>
                          <td>
                            <div><bdi>${esc(b.date)} · ${esc(b.time)}</bdi></div>
                            <div class="muted">${(b.items || []).map((i) => esc(i[`name_${opsState.lang}`] || i.name_ar)).join(' + ')}</div>
                          </td>
                          <td>
                            <div>${b.assigned_staff_name ? `<span class="badge">${esc(b.assigned_staff_name)}</span>` : `<span class="muted">${t('غير معينة', 'Unassigned')}</span>`}</div>
                            ${b.total !== null ? `<div><bdi>${money(b.total)}</bdi> ${b.payment_verified ? '<span class="badge mfa-ok">✓</span>' : ''}</div>` : ''}
                          </td>
                          <td>
                            ${statusBadge(b.status)}
                            ${bookingActionsHtml(b)}
                          </td>
                        </tr>
                      `,
                    )
                    .join('')
                : `<tr><td colspan="5" class="muted">${t('لا توجد حجوزات مطابقة.', 'No matching bookings found.')}</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="ops-mobile-cards">
        ${
          list.length
            ? list
                .map(
                  (b) => `
                    <div class="ops-mobile-card">
                      <div class="ops-row"><strong><bdi>${esc(b.reference)}</bdi></strong>${statusBadge(b.status)}</div>
                      <div><strong>${esc(b.name)}</strong> · <bdi>${esc(b.phone)}</bdi></div>
                      <div class="muted"><bdi>${esc(b.date)} · ${esc(b.time)}</bdi> · ${esc(b.neighborhood)}</div>
                      <div class="muted">${(b.items || []).map((i) => esc(i[`name_${opsState.lang}`] || i.name_ar)).join(' + ')}</div>
                      <div class="ops-row">
                        <span>${b.assigned_staff_name ? esc(b.assigned_staff_name) : t('غير معينة', 'Unassigned')}</span>
                        ${b.total !== null ? `<strong><bdi>${money(b.total)}</bdi></strong>` : ''}
                      </div>
                      ${bookingActionsHtml(b)}
                    </div>
                  `,
                )
                .join('')
            : `<p class="muted">${t('لا توجد حجوزات مطابقة.', 'No matching bookings found.')}</p>`
        }
      </div>

      <div class="ops-row" style="margin-top:12px">
        <span class="muted">${t('صفحة', 'Page')} <bdi>${num(meta.page)}</bdi> / <bdi>${num(meta.totalPages)}</bdi> (${num(meta.total)})</span>
        <div class="ops-chip-row">
          <button type="button" class="btn small light" id="bk-prev" ${meta.page <= 1 ? 'disabled' : ''}>${t('السابق', 'Previous')}</button>
          <button type="button" class="btn small light" id="bk-next" ${meta.page >= meta.totalPages ? 'disabled' : ''}>${t('التالي', 'Next')}</button>
        </div>
      </div>
    </div>
  `;
}

export async function openReceiptModal(bookingId) {
  try {
    const res = await opsApi(`/bookings/${bookingId}/receipt`);
    const receipts = res.receipts || [];
    let dlg = document.getElementById('ops-receipt-modal');
    if (dlg) dlg.remove();
    dlg = document.createElement('dialog');
    dlg.id = 'ops-receipt-modal';
    dlg.style.cssText = 'border:none;border-radius:18px;padding:0;max-width:580px;width:92vw;background:#fff;box-shadow:0 24px 64px rgba(45,35,40,0.28);';
    dlg.innerHTML = `
      <div style="padding:18px 22px;border-bottom:1px solid #ede6e1;display:flex;justify-content:space-between;align-items:center">
        <div>
          <strong style="font-size:1.05rem">${t('إيصالات التحويل البنكي', 'Bank Transfer Receipts')}</strong>
          <div class="muted" style="font-size:.82rem"><bdi>${esc(res.reference || bookingId)}</bdi></div>
        </div>
        <button type="button" class="btn small light" id="ops-rcpt-close">✕</button>
      </div>
      <div style="padding:18px 22px;max-height:70vh;overflow:auto;display:grid;gap:14px">
        ${
          receipts.length
            ? receipts
                .map((r) => {
                  const isPdf = String(r.mime_type || '').includes('pdf');
                  const safeData = String(r.file_data || '');
                  return `
                    <div style="border:1px solid #e7dde0;border-radius:12px;padding:12px;background:#fcfafa">
                      <div class="ops-row" style="margin-bottom:8px">
                        <span class="badge">${r.uploaded_by === 'staff' ? t('مرفوع من الإدارة', 'Uploaded by Staff') : t('مرفوع من العميلة', 'Uploaded by Customer')}</span>
                        <span class="muted" style="font-size:.8rem"><bdi>${esc(String(r.created_at || '').slice(0, 16).replace('T', ' '))}</bdi></span>
                      </div>
                      ${r.transfer_ref ? `<div style="font-size:.86rem;margin-bottom:8px">${t('رقم الحوالة:', 'Transfer Ref:')} <strong><bdi>${esc(r.transfer_ref)}</bdi></strong></div>` : ''}
                      ${
                        isPdf
                          ? `<a href="${esc(safeData)}" download="${esc(r.filename || 'receipt.pdf')}" class="btn small">📄 ${t('تحميل ملف الإيصال PDF', 'Download Receipt PDF')} (${esc(r.filename || 'receipt.pdf')})</a>`
                          : `<img src="${esc(safeData)}" alt="${esc(r.filename || 'Receipt')}" style="width:100%;max-height:420px;object-fit:contain;border-radius:10px;border:1px solid #ede6e1;background:#fff">`
                      }
                    </div>
                  `;
                })
                .join('')
            : `<p class="muted" style="margin:0">${t('لا توجد إيصالات مرفوعة لهذا الحجز بعد.', 'No receipts uploaded for this booking yet.')}</p>`
        }
      </div>
    `;
    document.body.appendChild(dlg);
    dlg.querySelector('#ops-rcpt-close').onclick = () => dlg.close();
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg) dlg.close();
    });
    dlg.showModal();
  } catch (err) {
    opsToast(err.message);
  }
}

export function bindBookings(renderFn) {
  $ops('#ops-bookings-filter')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    opsState.bookingSearch = String(d.q || '').trim();
    opsState.bookingStatus = String(d.status || '').trim();
    opsState.bookingsPage = 1;
    await loadDashboard();
    renderFn();
  });

  $ops('#ops-bookings-reset')?.addEventListener('click', async () => {
    opsState.bookingSearch = '';
    opsState.bookingStatus = '';
    opsState.bookingsPage = 1;
    await loadDashboard();
    renderFn();
  });

  $ops('#bk-prev')?.addEventListener('click', async () => {
    opsState.bookingsPage = Math.max(1, opsState.bookingsPage - 1);
    await loadDashboard();
    renderFn();
  });

  $ops('#bk-next')?.addEventListener('click', async () => {
    opsState.bookingsPage += 1;
    await loadDashboard();
    renderFn();
  });

  document.querySelectorAll('[data-bk-expand]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.bkExpand;
      opsState.expandedBookingId = opsState.expandedBookingId === id ? null : id;
      renderFn();
    };
  });

  document.querySelectorAll('[data-bk-transition]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.bkTransition;
      const status = btn.dataset.nextStatus;
      btn.disabled = true;
      try {
        await opsApi(`/bookings/${id}`, { status });
        await loadDashboard();
        opsToast(t('تم تحديث حالة الحجز', 'Booking status updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-bk-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.bkForm;
      const fd = new FormData(form);
      const payload = {};
      if (form.elements.assigned_staff_id) payload.assigned_staff_id = fd.get('assigned_staff_id');
      if (form.elements.date) payload.date = fd.get('date');
      if (form.elements.time) payload.time = fd.get('time');
      if (form.elements.internal_notes) payload.internal_notes = fd.get('internal_notes');
      if (form.elements.paid_amount && !form.elements.paid_amount.readOnly && fd.get('paid_amount') !== '') {
        payload.paid_amount = Number(fd.get('paid_amount'));
      }
      if (form.elements.payment_method && !form.elements.payment_method.disabled && fd.get('payment_method')) {
        payload.payment_method = fd.get('payment_method');
      }
      if (form.elements.payment_verified?.checked) {
        payload.payment_verified = true;
      }
      e.submitter.disabled = true;
      try {
        await opsApi(`/bookings/${id}`, payload);
        await loadDashboard();
        opsToast(t('تم حفظ التعديلات', 'Booking changes saved'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        e.submitter.disabled = false;
      }
    });
  });

  document.querySelectorAll('[data-view-receipt]').forEach((btn) => {
    btn.onclick = () => openReceiptModal(btn.dataset.viewReceipt);
  });

  document.querySelectorAll('[data-bk-receipt-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = form.dataset.bkReceiptForm;
      const fileInput = form.elements.file;
      const file = fileInput?.files?.[0];
      if (!file) {
        opsToast(t('اختاري ملف الإيصال أولاً', 'Please select a receipt file first'));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        opsToast(t('حجم الملف يتجاوز 2 ميجابايت', 'File exceeds 2 MB limit'));
        return;
      }
      const btn = e.submitter;
      if (btn) btn.disabled = true;
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error(t('تعذر قراءة الملف', 'Failed to read file')));
          reader.readAsDataURL(file);
        });
        await opsApi(`/bookings/${id}/receipt`, {
          file_data: dataUrl,
          filename: file.name,
          mime_type: file.type,
          transfer_ref: String(form.elements.transfer_ref?.value || '').trim(),
        });
        await loadDashboard();
        opsToast(t('تم حفظ إيصال الدفع وربطه بالحجز', 'Payment receipt saved and attached to booking'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        if (btn) btn.disabled = false;
      }
    });
  });
}
