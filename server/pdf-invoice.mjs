import { createHmac, timingSafeEqual } from 'node:crypto';
import { fail } from './validation.mjs';

const INVOICE_SECRET = process.env.SESSION_SECRET || process.env.INVOICE_SECRET || 'j-beauty-spa-invoice-hmac-2026-v2';

export function invoiceToken(booking) {
  return createHmac('sha256', INVOICE_SECRET)
    .update(`${booking.id}:${booking.reference}:${booking.created_at || ''}`)
    .digest('hex')
    .slice(0, 24);
}

export function verifyInvoiceToken(booking, token) {
  if (!booking || typeof token !== 'string' || !token) return false;
  const expected = invoiceToken(booking);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function pdfEscape(str) {
  return String(str || '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Generates a valid, self-contained binary PDF 1.4 invoice buffer (zero external dependencies).
 * Includes J Beauty Spa branding colors (#3E2932 plum, #D4AF7C rose gold, #EDE6E1 cream),
 * itemized services, add-ons, coupon/gift discount, delivery fee, and payment status.
 */
export function generateInvoicePdfBuffer(booking, settings = {}) {
  const invoiceNo = `INV-${String(booking.reference || booking.id || '').replace(/^J-/, '')}`;
  const issuedDate = (booking.payment_verified_at || booking.created_at || new Date().toISOString()).slice(0, 10);
  const statusText = booking.payment_verified ? 'PAID & VERIFIED' : 'PENDING PAYMENT';

  const ops = [];
  // Page cream header backdrop (A4 = 595 x 842 pt)
  ops.push('0.929 0.902 0.882 rg 0 715 595 127 re f');
  // Rose gold top accent bar (#D4AF7C)
  ops.push('0.831 0.686 0.486 rg 0 834 595 8 re f');
  // Rose gold divider under header
  ops.push('0.831 0.686 0.486 RG 1.5 w 44 715 m 551 715 l S');

  // Brand Title
  ops.push('BT /F2 22 Tf 0.243 0.161 0.196 rg 44 790 Td (J BEAUTY HOME SPA) Tj ET');
  ops.push('BT /F1 10 Tf 0.420 0.392 0.392 rg 44 772 Td (Luxury Women\'s Home Spa Sanctuary - Al Madinah, KSA) Tj ET');
  ops.push(`BT /F1 9 Tf 0.420 0.392 0.392 rg 44 756 Td (WhatsApp: +${pdfEscape(settings.business_phone || '966533718324')} | https://j-beauty-gamma.vercel.app) Tj ET`);

  // Invoice Box Top Right
  ops.push('BT /F2 16 Tf 0.243 0.161 0.196 rg 380 792 Td (OFFICIAL INVOICE) Tj ET');
  ops.push(`BT /F1 10 Tf 0.420 0.392 0.392 rg 380 774 Td (Invoice No: ${pdfEscape(invoiceNo)}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.420 0.392 0.392 rg 380 759 Td (Booking Ref: ${pdfEscape(booking.reference)}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.420 0.392 0.392 rg 380 744 Td (Issued: ${pdfEscape(issuedDate)}) Tj ET`);

  // Status pill
  if (booking.payment_verified) {
    ops.push('0.655 0.718 0.624 rg 380 722 170 16 re f');
    ops.push(`BT /F2 9 Tf 1 1 1 rg 408 727 Td (${pdfEscape(statusText)}) Tj ET`);
  } else {
    ops.push('0.851 0.718 0.753 rg 380 722 170 16 re f');
    ops.push(`BT /F2 9 Tf 0.243 0.161 0.196 rg 404 727 Td (${pdfEscape(statusText)}) Tj ET`);
  }

  // Client & Appointment Info Card
  ops.push('0.980 0.969 0.961 rg 44 615 507 82 re f');
  ops.push('0.831 0.686 0.486 RG 0.8 w 44 615 507 82 re S');
  ops.push('BT /F2 11 Tf 0.243 0.161 0.196 rg 58 678 Td (CLIENT & APPOINTMENT DETAILS) Tj ET');
  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 58 658 Td (Client Name: ${pdfEscape(booking.name || 'Guest Client')}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 58 642 Td (Mobile: ${pdfEscape(booking.phone || '-')}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 58 626 Td (Neighborhood: ${pdfEscape(booking.neighborhood || 'Al Madinah')}) Tj ET`);

  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 310 658 Td (Appointment Date: ${pdfEscape(booking.date || '-')}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 310 642 Td (Appointment Time: ${pdfEscape(booking.time || '-')}) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.25 0.22 0.23 rg 310 626 Td (Specialist: ${pdfEscape(booking.assigned_staff_name || 'J Beauty Team')}) Tj ET`);

  // Table Header
  let y = 582;
  ops.push(`0.243 0.161 0.196 rg 44 ${y} 507 24 re f`);
  ops.push(`BT /F2 10 Tf 1 1 1 rg 56 ${y + 8} Td (SERVICE / ITEM DESCRIPTION) Tj ET`);
  ops.push(`BT /F2 10 Tf 1 1 1 rg 355 ${y + 8} Td (DURATION) Tj ET`);
  ops.push(`BT /F2 10 Tf 1 1 1 rg 465 ${y + 8} Td (AMOUNT (SAR)) Tj ET`);

  y -= 24;
  const rows = [];
  for (const item of booking.items || []) {
    rows.push({
      label: item.name_en || item.id || 'Spa Service',
      duration: `${item.duration || 0} min`,
      price: `${Number(item.price || 0).toFixed(2)} SAR`,
    });
  }
  for (const addon of booking.add_ons || []) {
    rows.push({
      label: `[Add-on] ${addon.name_en || addon.id}`,
      duration: `${addon.duration || 15} min`,
      price: `${Number(addon.price || 0).toFixed(2)} SAR`,
    });
  }
  if (Number(booking.delivery_fee || 0) > 0) {
    rows.push({
      label: 'Home Delivery Service Fee (Al Madinah)',
      duration: '-',
      price: `${Number(booking.delivery_fee).toFixed(2)} SAR`,
    });
  }

  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      ops.push(`0.975 0.960 0.955 rg 44 ${y - 4} 507 22 re f`);
    }
    ops.push(`BT /F1 10 Tf 0.20 0.18 0.19 rg 56 ${y + 3} Td (${pdfEscape(row.label.slice(0, 48))}) Tj ET`);
    ops.push(`BT /F1 10 Tf 0.42 0.39 0.39 rg 355 ${y + 3} Td (${pdfEscape(row.duration)}) Tj ET`);
    ops.push(`BT /F1 10 Tf 0.20 0.18 0.19 rg 465 ${y + 3} Td (${pdfEscape(row.price)}) Tj ET`);
    ops.push(`0.90 0.86 0.84 RG 0.5 w 44 ${y - 4} m 551 ${y - 4} l S`);
    y -= 24;
  });

  // Totals Summary Box
  y -= 16;
  const subtotal = Number(booking.subtotal ?? booking.total ?? 0);
  const discount = Number(booking.discount_amount || 0);
  const total = Number(booking.total || 0);
  const paid = Number(booking.paid_amount || 0);

  ops.push(`0.929 0.902 0.882 rg 310 ${y - 78} 241 96 re f`);
  ops.push(`0.831 0.686 0.486 RG 1 w 310 ${y - 78} 241 96 re S`);

  ops.push(`BT /F1 10 Tf 0.35 0.32 0.32 rg 324 ${y + 2} Td (Subtotal:) Tj ET`);
  ops.push(`BT /F1 10 Tf 0.20 0.18 0.19 rg 465 ${y + 2} Td (${subtotal.toFixed(2)} SAR) Tj ET`);

  if (discount > 0) {
    ops.push(`BT /F1 10 Tf 0.33 0.42 0.30 rg 324 ${y - 16} Td (Discount (${pdfEscape(booking.coupon_code || 'PROMO')}):) Tj ET`);
    ops.push(`BT /F1 10 Tf 0.33 0.42 0.30 rg 465 ${y - 16} Td (-${discount.toFixed(2)} SAR) Tj ET`);
  } else {
    ops.push(`BT /F1 10 Tf 0.45 0.42 0.42 rg 324 ${y - 16} Td (Discount:) Tj ET`);
    ops.push(`BT /F1 10 Tf 0.45 0.42 0.42 rg 465 ${y - 16} Td (0.00 SAR) Tj ET`);
  }

  ops.push(`0.831 0.686 0.486 RG 0.8 w 324 ${y - 28} m 538 ${y - 28} l S`);
  ops.push(`BT /F2 12 Tf 0.243 0.161 0.196 rg 324 ${y - 46} Td (TOTAL DUE:) Tj ET`);
  ops.push(`BT /F2 12 Tf 0.243 0.161 0.196 rg 455 ${y - 46} Td (${total.toFixed(2)} SAR) Tj ET`);

  ops.push(`BT /F1 10 Tf 0.35 0.32 0.32 rg 324 ${y - 66} Td (Amount Paid (${pdfEscape(booking.payment_method || 'pending')}):) Tj ET`);
  ops.push(`BT /F2 10 Tf 0.33 0.42 0.30 rg 465 ${y - 66} Td (${paid.toFixed(2)} SAR) Tj ET`);

  // Bank info on left if unpaid
  if (!booking.payment_verified) {
    ops.push(`BT /F2 10 Tf 0.243 0.161 0.196 rg 44 ${y + 2} Td (BANK TRANSFER INFORMATION) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.35 0.32 0.32 rg 44 ${y - 14} Td (Bank: ${pdfEscape(settings.bank_name || 'Al Rajhi Bank')}) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.35 0.32 0.32 rg 44 ${y - 28} Td (Account: ${pdfEscape(settings.bank_account_holder || 'J Beauty Spa')}) Tj ET`);
    ops.push(`BT /F1 9 Tf 0.35 0.32 0.32 rg 44 ${y - 42} Td (IBAN: ${pdfEscape(settings.bank_iban || 'SA0380000000000000000000')}) Tj ET`);
    ops.push(`BT /F1 8.5 Tf 0.50 0.45 0.45 rg 44 ${y - 58} Td (Please upload or send your transfer receipt to confirm.) Tj ET`);
  }

  // Footer
  ops.push('0.831 0.686 0.486 RG 1 w 44 74 m 551 74 l S');
  ops.push('BT /F1 9 Tf 0.42 0.39 0.39 rg 44 54 Td (Thank you for choosing J Beauty Spa - Women-only home luxury in Al Madinah.) Tj ET');
  ops.push(`BT /F1 8 Tf 0.55 0.50 0.50 rg 44 40 Td (Document Authenticity Code: ${pdfEscape(invoiceToken(booking))} | Generated electronically by J Beauty Ops) Tj ET`);

  const streamData = ops.join('\n');
  const streamBytes = Buffer.byteLength(streamData, 'latin1');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamBytes} >>\nstream\n${streamData}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

function escHtml(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderInvoiceHtml(booking, settings = {}, pdfDownloadUrl = '') {
  const invoiceNo = `INV-${String(booking.reference || '').replace(/^J-/, '')}`;
  const issuedDate = (booking.payment_verified_at || booking.created_at || new Date().toISOString()).slice(0, 10);
  const items = booking.items || [];
  const addOns = booking.add_ons || [];
  const deliveryFee = Number(booking.delivery_fee || 0);
  const discount = Number(booking.discount_amount || 0);
  const subtotal = Number(booking.subtotal ?? booking.total ?? 0);

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>فاتورة J Beauty Spa — ${escHtml(booking.reference)}</title>
  <style>
    :root { --dusty-pink:#D9B7C0; --mauve-pink:#C9AEB6; --sage-green:#A7B79F; --rose-gold:#D4AF7C; --cream-bg:#EDE6E1; --text-dark:#6B6464; --plum:#3E2932; }
    * { box-sizing:border-box; }
    body { margin:0; padding:24px; background:var(--cream-bg); color:var(--plum); font-family:"IBM Plex Sans Arabic","Tahoma",sans-serif; }
    .sheet { max-width:780px; margin:0 auto; background:#fff; border-radius:22px; overflow:hidden; border:1.5px solid rgba(212,175,124,.55); box-shadow:0 18px 48px rgba(62,41,50,.12); }
    .top { background:linear-gradient(135deg,#FAF5F1,#EDE6E1); padding:28px 32px; border-bottom:2px solid var(--rose-gold); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
    .brand { display:flex; align-items:center; gap:14px; }
    .brand img { width:58px; height:58px; border-radius:50%; border:1.5px solid var(--rose-gold); background:#fff; padding:3px; object-fit:contain; }
    .brand h1 { margin:0; font-size:24px; color:var(--plum); }
    .brand small { color:var(--text-dark); font-size:13px; }
    .meta { text-align:left; font-size:13.5px; color:var(--text-dark); }
    .status { display:inline-block; padding:4px 12px; border-radius:999px; font-weight:700; font-size:12.5px; margin-top:6px; }
    .status.paid { background:var(--sage-green); color:#fff; }
    .status.pending { background:var(--dusty-pink); color:var(--plum); }
    .body { padding:28px 32px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; background:#FAF7F5; border:1px solid rgba(212,175,124,.35); border-radius:14px; padding:16px 20px; margin-bottom:22px; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { background:var(--plum); color:#fff; padding:11px 14px; text-align:right; font-size:13.5px; }
    td { padding:11px 14px; border-bottom:1px solid #EFE7E2; font-size:14px; }
    .totals { max-width:320px; margin-right:auto; background:#FAF7F5; border:1px solid var(--rose-gold); border-radius:14px; padding:16px 18px; }
    .tot-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; }
    .tot-row.grand { border-top:1px solid var(--rose-gold); padding-top:10px; margin-top:8px; font-size:18px; font-weight:700; color:var(--plum); }
    .actions { max-width:780px; margin:16px auto 0; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px; border:none; cursor:pointer; background:var(--plum); color:#fff; }
    .btn.gold { background:linear-gradient(135deg,#D4AF7C,#B68B54); color:#fff; }
    .foot { text-align:center; padding:18px 28px; background:#FAF7F5; border-top:1px solid #EFE7E2; color:var(--text-dark); font-size:12.5px; }
    @media print { body { background:#fff; padding:0; } .actions { display:none; } .sheet { box-shadow:none; border:1px solid #ddd; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <img src="/assets/brand/official-logo.png" alt="J Beauty Spa">
        <div>
          <h1>J Beauty Spa</h1>
          <small>سبا نسائي منزلي فاخر · المدينة المنورة</small>
        </div>
      </div>
      <div class="meta">
        <div><strong>رقم الفاتورة:</strong> <bdi>${escHtml(invoiceNo)}</bdi></div>
        <div><strong>رقم الحجز:</strong> <bdi>${escHtml(booking.reference)}</bdi></div>
        <div><strong>تاريخ الإصدار:</strong> <bdi>${escHtml(issuedDate)}</bdi></div>
        <span class="status ${booking.payment_verified ? 'paid' : 'pending'}">
          ${booking.payment_verified ? '✓ مدفوعة وموثّقة' : '⏳ بانتظار تأكيد الدفع'}
        </span>
      </div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div><strong>اسم العميلة:</strong> ${escHtml(booking.name)}</div>
        <div><strong>الموعد:</strong> <bdi>${escHtml(booking.date)} · ${escHtml(booking.time)}</bdi></div>
        <div><strong>الجوال:</strong> <bdi>${escHtml(booking.phone)}</bdi></div>
        <div><strong>الحي:</strong> ${escHtml(booking.neighborhood)}</div>
        <div><strong>الأخصائية:</strong> ${escHtml(booking.assigned_staff_name || 'فريق مختصات J Beauty Spa')}</div>
        <div><strong>حالة الزيارة:</strong> ${escHtml(booking.status)}</div>
      </div>
      <table>
        <thead><tr><th>الخدمة / البند</th><th>المدة</th><th>المبلغ</th></tr></thead>
        <tbody>
          ${items.map((i) => `<tr><td>${escHtml(i.name_ar || i.name_en)}</td><td>${escHtml(i.duration)} دقيقة</td><td>${escHtml(i.price)} ر.س</td></tr>`).join('')}
          ${addOns.map((a) => `<tr><td>✦ إضافة: ${escHtml(a.name_ar || a.name_en)}</td><td>${escHtml(a.duration || 15)} دقيقة</td><td>${escHtml(a.price)} ر.س</td></tr>`).join('')}
          ${deliveryFee > 0 ? `<tr><td>رسوم التوصيل المنزلي (المدينة المنورة)</td><td>—</td><td>${escHtml(deliveryFee)} ر.س</td></tr>` : ''}
        </tbody>
      </table>
      <div class="totals">
        <div class="tot-row"><span>المجموع الفرعي</span><strong>${escHtml(subtotal)} ر.س</strong></div>
        ${discount > 0 ? `<div class="tot-row" style="color:#556B4E"><span>الخصم (${escHtml(booking.coupon_code || '')})</span><strong>-${escHtml(discount)} ر.س</strong></div>` : ''}
        <div class="tot-row grand"><span>الإجمالي النهائي</span><span>${escHtml(booking.total)} ر.س</span></div>
        <div class="tot-row" style="margin-top:6px;margin-bottom:0;color:var(--text-dark)"><span>المدفوع فعلياً</span><strong>${escHtml(booking.paid_amount || 0)} ر.س</strong></div>
      </div>
    </div>
    <div class="foot">
      شكراً لاختيارك J Beauty Spa · سبا نسائي منزلي بالمدينة المنورة · رمز التحقق الإلكتروني: <bdi>${escHtml(invoiceToken(booking))}</bdi>
    </div>
  </div>
  <div class="actions">
    ${pdfDownloadUrl ? `<a class="btn gold" href="${escHtml(pdfDownloadUrl)}" download="${escHtml(invoiceNo)}.pdf">⬇ تحميل فاتورة PDF الرسمية</a>` : ''}
    <a class="btn" href="javascript:void(0)" id="print-invoice-btn">🖨 طباعة / حفظ كـ PDF</a>
  </div>
</body>
</html>`;
}

/**
 * Validates receipt file upload (base64 data URL or raw base64) strictly using magic bytes
 * so forged MIME types, SVG/XSS payloads, and executables are impossible.
 */
export function validateReceiptUpload(body) {
  const raw = String(body?.file_data || body?.data_url || '').trim();
  if (!raw) fail('يرجى إرفاق صورة أو ملف PDF لإيصال الدفع', 400);

  let base64Str = raw;
  let declaredMime = String(body?.mime_type || '').toLowerCase().trim();
  const dataUrlMatch = raw.match(/^data:([a-z0-9/+-]+);base64,([A-Za-z0-9+/=\s]+)$/i);
  if (dataUrlMatch) {
    declaredMime = dataUrlMatch[1].toLowerCase();
    base64Str = dataUrlMatch[2].replace(/\s+/g, '');
  } else {
    base64Str = raw.replace(/\s+/g, '');
  }

  const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']);
  if (!allowedMimes.has(declaredMime) || (body?.mime_type && !allowedMimes.has(String(body.mime_type).toLowerCase().trim()))) {
    fail('صيغة الإيصال غير مدعومة. الصيغ المسموحة فقط: PNG, JPG, WEBP, PDF', 400);
  }

  let buf;
  try {
    buf = Buffer.from(base64Str, 'base64');
  } catch {
    fail('ملف الإيصال تالف أو غير صالح', 400);
  }

  if (buf.length < 16) {
    fail('ملف الإيصال فارغ أو غير صالح', 400);
  }
  if (buf.length > 2 * 1024 * 1024) {
    fail('حجم ملف الإيصال يجب أن لا يتجاوز 2 ميجابايت', 413);
  }

  // Magic bytes verification (prevents disguised HTML/SVG/JS/EXE uploads)
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebp = buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  const isPdf = buf.slice(0, 4).toString('ascii') === '%PDF';

  let verifiedMime = null;
  if (isPng) verifiedMime = 'image/png';
  else if (isJpg) verifiedMime = 'image/jpeg';
  else if (isWebp) verifiedMime = 'image/webp';
  else if (isPdf) verifiedMime = 'application/pdf';

  if (!verifiedMime) {
    fail('محتوى الملف لا يطابق صورة أو PDF صالحة (تم رفض الملف لأسباب أمنية)', 400);
  }

  const rawFilename = String(body?.filename || '');
  if (rawFilename) {
    if (rawFilename.includes('..') || rawFilename.includes('/') || rawFilename.includes('\\') || rawFilename.includes('\0')) {
      fail('اسم الملف غير مسموح به (مسار غير آمن)', 400);
    }
    const extMatch = rawFilename.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '';
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.pdf']);
    if (ext && !allowedExts.has(ext)) {
      fail('امتداد الملف غير مسموح به. الصيغ المسموحة: png, jpg, jpeg, webp, pdf', 400);
    }
  }

  const safeName = String(body?.filename || `receipt.${verifiedMime === 'application/pdf' ? 'pdf' : verifiedMime.split('/')[1]}`)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80);

  return {
    mime_type: verifiedMime,
    filename: safeName,
    data_url: `data:${verifiedMime};base64,${buf.toString('base64')}`,
    size_bytes: buf.length,
    sender_name: String(body?.sender_name || '').trim().slice(0, 100),
    transfer_ref: String(body?.transfer_ref || '').trim().slice(0, 80),
  };
}

export function renderOccasionContractHtml(g, settings = {}) {
  const ref = escHtml(g.reference || 'OCC-000');
  const invoiceNo = `OCC-INV-${String(g.reference || '').replace(/^OCC-/, '')}`;
  const dateStr = escHtml(g.date || '');
  const timeStr = escHtml(g.time || '');
  const areaStr = escHtml(g.neighborhood || '');
  const nameStr = escHtml(g.organizer_name || 'العميلة الكريمة');
  const phoneStr = escHtml(g.organizer_phone || '');
  const total = Number(g.estimated_total || 0);
  const deposit = Number(g.deposit_paid || Math.round(total * 0.3) || 100);
  const remaining = Math.max(0, total - deposit);
  const isConfirmed = g.status === 'confirmed';
  const participants = g.participants || [];

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>عقد وفاتورة مناسبة — J Beauty Spa — ${ref}</title>
  <style>
    :root { --dusty-pink:#D9B7C0; --mauve-pink:#C9AEB6; --sage-green:#A7B79F; --rose-gold:#D4AF7C; --cream-bg:#EDE6E1; --text-dark:#6B6464; --plum:#3E2932; }
    * { box-sizing:border-box; }
    body { margin:0; padding:24px; background:var(--cream-bg); color:var(--plum); font-family:"IBM Plex Sans Arabic","Tahoma",sans-serif; }
    .sheet { max-width:820px; margin:0 auto; background:#fff; border-radius:22px; overflow:hidden; border:1.5px solid rgba(212,175,124,.55); box-shadow:0 18px 48px rgba(62,41,50,.12); }
    .top { background:linear-gradient(135deg,#FAF5F1,#EDE6E1); padding:28px 32px; border-bottom:2px solid var(--rose-gold); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; }
    .brand { display:flex; align-items:center; gap:14px; }
    .brand img { width:58px; height:58px; border-radius:50%; border:1.5px solid var(--rose-gold); background:#fff; padding:3px; object-fit:contain; }
    .brand h1 { margin:0; font-size:24px; color:var(--plum); }
    .brand small { color:var(--text-dark); font-size:13px; }
    .meta { text-align:left; font-size:13.5px; color:var(--text-dark); }
    .status { display:inline-block; padding:5px 14px; border-radius:999px; font-weight:700; font-size:13px; margin-top:6px; }
    .status.paid { background:var(--sage-green); color:#fff; }
    .status.pending { background:var(--dusty-pink); color:var(--plum); }
    .body { padding:28px 32px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; background:#FAF7F5; border:1px solid rgba(212,175,124,.35); border-radius:14px; padding:16px 20px; margin-bottom:22px; font-size:14px; }
    table { width:100%; border-collapse:collapse; margin-bottom:20px; }
    th { background:var(--plum); color:#fff; padding:11px 14px; text-align:right; font-size:13.5px; }
    td { padding:11px 14px; border-bottom:1px solid #EFE7E2; font-size:14px; }
    .totals { max-width:340px; margin-right:auto; background:#FAF7F5; border:1px solid var(--rose-gold); border-radius:14px; padding:16px 18px; margin-bottom:24px; }
    .tot-row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px; }
    .tot-row.grand { border-top:1px solid var(--rose-gold); padding-top:10px; margin-top:8px; font-size:18px; font-weight:700; color:var(--plum); }
    .terms-box { background:#FAF8F6; border:1px dashed #D4AF7C; border-radius:12px; padding:16px 20px; font-size:13px; line-height:1.7; color:var(--text-dark); }
    .actions { max-width:820px; margin:16px auto 0; display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
    .btn { display:inline-flex; align-items:center; gap:8px; padding:11px 22px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px; border:none; cursor:pointer; background:var(--plum); color:#fff; }
    .btn.gold { background:linear-gradient(135deg,#D4AF7C,#B68B54); color:#fff; }
    .foot { text-align:center; padding:18px 28px; background:#FAF7F5; border-top:1px solid #EFE7E2; color:var(--text-dark); font-size:12.5px; }
    @media print { body { background:#fff; padding:0; } .actions { display:none; } .sheet { box-shadow:none; border:1px solid #ddd; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div class="brand">
        <img src="/assets/brand/official-logo.png" alt="J Beauty Spa">
        <div>
          <h1>J Beauty Spa</h1>
          <small>سبا نسائي منزلي فاخر · المدينة المنورة</small>
        </div>
      </div>
      <div class="meta">
        <div><strong>وثيقة عقد وفاتورة مناسبة:</strong> <bdi>${invoiceNo}</bdi></div>
        <div><strong>رقم طلب المناسبة:</strong> <bdi>${ref}</bdi></div>
        <div><strong>الرقم الضريبي:</strong> <bdi>310000000000003</bdi></div>
        <span class="status ${isConfirmed ? 'paid' : 'pending'}">
          ${isConfirmed ? '✓ معتمد ومثبت رسمياً (العربون مسدد)' : '⏳ بانتظار سداد العربون وتأكيد التثبيت'}
        </span>
      </div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div><strong>المنسقة:</strong> ${nameStr}</div>
        <div><strong>الجوال:</strong> <bdi dir="ltr">${phoneStr}</bdi></div>
        <div><strong>تاريخ المناسبة:</strong> <bdi>${dateStr}</bdi> (${timeStr})</div>
        <div><strong>الحي والموقع:</strong> ${areaStr} — المدينة المنورة</div>
      </div>

      <h3 style="margin:0 0 10px;color:var(--plum);font-size:16px">قائمة الضيفات والخدمات المعتمدة للجلسة:</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>الضيفة / الصفة</th>
            <th>الخدمات المختارة</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map((p, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${escHtml(p.label || `الضيفة ${idx + 1}`)}</strong></td>
              <td>${(p.items || []).map((it) => escHtml(it.name_ar || it.name || '')).join(' + ') || 'عناية متكاملة'}</td>
            </tr>
          `).join('') || `<tr><td colspan="3">جلسة مناسبات مخصصة</td></tr>`}
        </tbody>
      </table>

      <div class="totals">
        <div class="tot-row"><span>إجمالي باقة المناسبة التقديري:</span><strong>${total} ر.س</strong></div>
        <div class="tot-row" style="color:var(--sage-green)"><span>العربون ${isConfirmed ? 'المسدد' : 'المطلوب'}:</span><strong>${deposit} ر.س</strong></div>
        <div class="tot-row grand"><span>المتبقي عند تقديم الخدمة:</span><strong>${remaining} ر.س</strong></div>
      </div>

      <div class="terms-box">
        <strong>شروط واعتماد حجز جلسات المناسبات:</strong>
        <div>• يتم تثبيت فريق الأخصائيات والأدوات المعقمة رسمياً فور تأكيد استلام العربون البنكي.</div>
        <div>• المتبقي يسدد للأخصائيات عند الحضور وبدء تقديم الجلسة.</div>
        <div>• جميع الأدوات مغلفة ومعقمة فردياً وفق أعلى معايير الصالونات العالمية للسيدات فقط في المدينة المنورة.</div>
      </div>
    </div>
    <div class="foot">
      <span>مؤسسة J Beauty Spa · المدينة المنورة · خدمة عملاء: 0533718324 · www.j-beauty.com</span>
    </div>
  </div>
  <div class="actions">
    <button type="button" class="btn gold" onclick="window.print()">🖨️ طباعة العقد والفاتورة</button>
  </div>
</body>
</html>`;
}
