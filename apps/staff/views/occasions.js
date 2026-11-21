import { can, esc, loadDashboard, minutes, money, opsApi, opsState, opsToast, statusBadge, t } from '../ops-state.js';

function phone(val) {
  return String(val || '').replace(/\D/g, '');
}

async function openReceiptModal(title, fetchUrl) {
  try {
    const data = await opsApi(fetchUrl);
    const receipts = data.receipts || [];
    const dlg = document.createElement('dialog');
    dlg.className = 'ops-modal';
    dlg.id = 'ops-rcpt-dialog';
    dlg.innerHTML = `
      <div class="ops-modal-card" style="max-width:580px;width:95%">
        <div class="ops-row" style="margin-bottom:12px">
          <h2 style="font-size:18px;margin:0">🧾 ${esc(title)} — <bdi>${esc(data.reference)}</bdi></h2>
          <button type="button" class="btn small light" id="ops-rcpt-close">✕</button>
        </div>
        ${
          receipts.length
            ? receipts
                .map((r) => {
                  const safeData = r.data_url || '';
                  const isPdf = (r.mime_type || '').includes('pdf') || safeData.startsWith('data:application/pdf');
                  return `
                    <div class="ops-card" style="background:var(--ivory);margin-bottom:10px">
                      <div class="ops-row" style="margin-bottom:6px">
                        <strong>${esc(r.sender_name || t('المحوّلة', 'Sender'))}</strong>
                        <span class="muted" style="font-size:12px">${esc(r.created_at)}</span>
                      </div>
                      ${r.transfer_ref ? `<div style="font-size:13px;margin-bottom:6px"><strong>${t('مرجع التحويل:', 'Transfer Ref:')}</strong> <bdi>${esc(r.transfer_ref)}</bdi></div>` : ''}
                      ${
                        isPdf
                          ? `<a href="${esc(safeData)}" download="${esc(r.filename || 'receipt.pdf')}" class="btn small sage" style="display:inline-block">📄 ${t('تحميل مستند الإيصال PDF', 'Download PDF')} (${esc(r.filename || 'receipt.pdf')})</a>`
                          : `<img src="${esc(safeData)}" alt="${esc(r.filename || 'Receipt')}" style="width:100%;max-height:420px;object-fit:contain;border-radius:10px;border:1px solid #ede6e1;background:#fff">`
                      }
                    </div>
                  `;
                })
                .join('')
            : `<p class="muted" style="margin:0">${t('لا توجد إيصالات مرفوعة لهذا الطلب بعد.', 'No receipts uploaded for this request yet.')}</p>`
        }
      </div>
    `;
    document.body.appendChild(dlg);
    dlg.querySelector('#ops-rcpt-close').onclick = () => {
      dlg.close();
      dlg.remove();
    };
    dlg.addEventListener('click', (ev) => {
      if (ev.target === dlg) {
        dlg.close();
        dlg.remove();
      }
    });
    dlg.showModal();
  } catch (err) {
    opsToast(err.message);
  }
}

export function occasionsView(d) {
  const groups = d.group_requests || [];
  const gifts = d.gift_requests || [];
  const canManageOcc = can('occasions.manage');
  const canVerifyGifts = can('gifts.verify_payment');

  return `
    <div class="ops-card">
      <h2>${t('طلبات تنسيق جلسات المناسبات', 'Occasion Group Requests')}</h2>
      ${
        groups.length
          ? groups
              .map((g) => {
                const depositReq = Math.round(Number(g.estimated_total || 0) * 0.3) || 100;
                const waOccApproveUrl = `https://wa.me/${phone(g.organizer_phone)}?text=${encodeURIComponent(
                  `مرحباً أ/ ${g.organizer_name} 🌸\nيسعدنا إبلاغك باعتماد طلب حجز جلسة المناسبات الخاصة بك لدى J Beauty Spa ✨\n\n• رقم الحجز: ${g.reference}\n• الموعد: ${g.date} ${g.time}\n• الحي: ${g.neighborhood}\n• الإجمالي التقديري: ${g.estimated_total} ر.س\n• العربون المطلوب لتأكيد الموعد: ${depositReq} ر.س\n\n💳 بيانات الحساب البنكي:\nمصرف الراجحي\nالمستفيد: مؤسسة J Beauty Spa\nالآيبان: SA0380000000000000000000\n\nيرجى تحويل العربون ورفع الإيصال لتثبيت الموعد نهائياً وتجهيز فريق العمل 🌸`,
                )}`;
                return `
                  <div class="ops-card" style="background:var(--ivory);margin-bottom:12px">
                    <div class="ops-row" style="margin-bottom:6px">
                      <div>
                        <strong><bdi>${esc(g.reference)}</bdi></strong> · ${esc(g.organizer_name)}
                        <span class="muted"><bdi>${esc(g.organizer_phone)}</bdi></span>
                      </div>
                      ${statusBadge(g.status)}
                    </div>
                    <div class="muted"><bdi>${esc(g.date)} · ${esc(g.time)}</bdi> · ${esc(g.neighborhood)} · <bdi>${money(g.estimated_total)}</bdi> · <bdi>${minutes(g.estimated_duration)}</bdi></div>
                    <div style="margin:8px 0;font-size:13px">
                      ${(g.participants || [])
                        .map((p) => `<div>• <strong>${esc(p.label)}</strong>: ${(p.items || []).map((i) => esc(i[`name_${opsState.lang}`] || i.name_ar)).join(' + ')}</div>`)
                        .join('')}
                    </div>
                    <div class="ops-chip-row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
                      ${
                        g.receipt_uploaded
                          ? `<button type="button" class="btn small" style="background:var(--rose-gold);color:#fff" data-view-group-receipt="${esc(g.id)}">👁 ${t('عرض إيصال التحويل', 'View Receipt')}</button>`
                          : ''
                      }
                      ${
                        canManageOcc && g.status === 'pending_approval'
                          ? `<button type="button" class="btn small sage" data-occ-act="approved" data-occ-id="${esc(g.id)}">${t('اعتماد التنسيق', 'Approve')}</button>
                             <button type="button" class="btn small light" data-occ-act="cancelled" data-occ-id="${esc(g.id)}">${t('إلغاء الطلب', 'Cancel')}</button>`
                          : ''
                      }
                      ${
                        g.status === 'approved' && g.organizer_phone
                          ? `<a href="${waOccApproveUrl}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:#25D366;color:#fff;display:inline-flex;align-items:center;gap:4px">
                               <span>💬</span> ${t('إرسال اعتماد الحجز والعربون واتساب', 'Send Approval & Deposit WA')}
                             </a>`
                          : ''
                      }
                    </div>
                  </div>
                `;
              })
              .join('')
          : `<p class="muted" style="margin:0">${t('لا توجد طلبات مناسبات.', 'No occasion requests yet.')}</p>`
      }
    </div>

    ${
      canVerifyGifts || canManageOcc
        ? `
          <div class="ops-card">
            <h2>${t('طلبات بطاقات الإهداء', 'Gift Requests')}</h2>
            ${
              gifts.length
                ? gifts
                    .map((gf) => {
                      const waGiftSendUrl = `https://wa.me/${phone(gf.sender_phone)}?text=${encodeURIComponent(
                        `مرحباً أ/ ${gf.sender_name} 🌸\nتم توثيق تحويلك البنكي وتفعيل بطاقة الإهداء الفاخرة بنجاح لدى J Beauty Spa ✨\n\n• كود الإهداء: ${gf.gift_code}\n• المهدى إليها: ${gf.recipient_name}\n• الهدية: ${gf.chosen?.name_ar || 'جلسة عناية فاخرة'}\n\nيمكن للمهدى إليها استخدام الكود مباشرة عند طلب أي موعد. شكراً لاختيارك J Beauty Spa 🌸`,
                      )}`;
                      return `
                        <div class="ops-card" style="background:var(--ivory);margin-bottom:10px">
                          <div class="ops-row">
                            <div>
                              <strong><bdi>${esc(gf.reference)}</bdi></strong>
                              ${gf.gift_code ? ` · <span class="badge sage mono" style="letter-spacing:1px">${esc(gf.gift_code)}</span>` : ''}
                              · ${esc(gf.sender_name)} → ${esc(gf.recipient_name)}
                            </div>
                            ${statusBadge(gf.status)}
                          </div>
                          <div class="muted"><bdi>${money(gf.value || gf.estimated_amount || 0)}</bdi> · ${gf.chosen ? esc(gf.chosen.name_ar || gf.chosen.name_en) : ''} · ${gf.redeemed ? t('تم استخدام الكود في حجز', 'Redeemed in booking') : gf.status === 'cancelled' ? t('ملغاة ولا تعمل', 'Cancelled & revoked') : gf.payment_verified ? t('الكود مفعّل وجاهز للاستخدام', 'Code active & verified') : t('بانتظار توثيق تحويل السداد', 'Awaiting payment verification')}</div>
                          <div class="ops-chip-row" style="margin-top:8px;gap:8px;flex-wrap:wrap">
                            ${
                              gf.receipt_uploaded
                                ? `<button type="button" class="btn small" style="background:var(--rose-gold);color:#fff" data-view-gift-receipt="${esc(gf.id)}">👁 ${t('عرض إيصال التحويل', 'View Receipt')}</button>`
                                : ''
                            }
                            ${
                              canVerifyGifts && !gf.payment_verified && gf.status !== 'cancelled'
                                ? `<button type="button" class="btn small sage" data-gift-verify="${esc(gf.id)}">${t('توثيق الدفع وتفعيل الكود', 'Verify Payment & Activate Code')}</button>`
                                : ''
                            }
                            ${
                              gf.payment_verified && gf.status === 'approved_ready' && gf.sender_phone
                                ? `<a href="${waGiftSendUrl}" target="_blank" rel="noopener noreferrer" class="btn small" style="background:#25D366;color:#fff;display:inline-flex;align-items:center;gap:4px">
                                     <span>💬</span> ${t('إرسال الكود المفعّل للمهدي واتساب', 'Send Activated Code WA')}
                                   </a>`
                                : ''
                            }
                            ${
                              canVerifyGifts && gf.payment_verified && gf.status === 'approved_ready'
                                ? `<button type="button" class="btn small" data-gift-status="redeemed" data-gift-id="${esc(gf.id)}">${t('تحديد كمُستخدم', 'Mark Redeemed')}</button>`
                                : ''
                            }
                            ${
                              canManageOcc && !['redeemed', 'cancelled'].includes(gf.status)
                                ? `<button type="button" class="btn small light" data-gift-status="cancelled" data-gift-id="${esc(gf.id)}">${t('إلغاء', 'Cancel')}</button>`
                                : ''
                            }
                          </div>
                        </div>
                      `;
                    })
                    .join('')
                : `<p class="muted" style="margin:0">${t('لا توجد طلبات إهداء.', 'No gift requests yet.')}</p>`
            }
          </div>
        `
        : ''
    }
  `;
}

export function bindOccasions(renderFn) {
  document.querySelectorAll('[data-view-group-receipt]').forEach((btn) => {
    btn.onclick = () => {
      openReceiptModal(t('إيصال مناسبة', 'Occasion Receipt'), `/group-requests/${btn.dataset.viewGroupReceipt}/receipt`);
    };
  });

  document.querySelectorAll('[data-view-gift-receipt]').forEach((btn) => {
    btn.onclick = () => {
      openReceiptModal(t('إيصال بطاقة إهداء', 'Gift Card Receipt'), `/gift-requests/${btn.dataset.viewGiftReceipt}/receipt`);
    };
  });

  document.querySelectorAll('[data-occ-act]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/group-requests/${btn.dataset.occId}`, { status: btn.dataset.occAct });
        await loadDashboard();
        opsToast(t('تم تحديث طلب المناسبة', 'Occasion request updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-gift-verify]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/gift-requests/${btn.dataset.giftVerify}`, { payment_verified: true, status: 'approved_ready' });
        await loadDashboard();
        opsToast(t('تم توثيق الدفع وتفعيل بطاقة الإهداء', 'Gift payment verified and activated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('[data-gift-status]').forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        await opsApi(`/gift-requests/${btn.dataset.giftId}`, { status: btn.dataset.giftStatus });
        await loadDashboard();
        opsToast(t('تم تحديث حالة الإهداء', 'Gift status updated'));
        renderFn();
      } catch (err) {
        opsToast(err.message);
        btn.disabled = false;
      }
    };
  });
}


