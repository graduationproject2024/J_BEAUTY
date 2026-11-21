import { randomBytes } from 'node:crypto';
import { BOOKING_ADD_ONS, now, uid } from './db.mjs';
import { fail, money, phone, text, whatsappUrl } from './validation.mjs';
import { reconcileLoyalty } from './loyalty.mjs';
import { hasCapability, requireCapability } from './authorization/permissions.mjs';
import { invoiceToken } from './pdf-invoice.mjs';
import { calculateTravelBuffer } from './scheduling/travel.mjs';
import { autoAssignPractitioner } from './scheduling/availability.mjs';

export function isNeighborhoodExcluded(settings, neighborhood) {
  const excluded = Array.isArray(settings?.excluded_areas) ? settings.excluded_areas : [];
  if (!excluded.length) return false;
  const norm = (str) =>
    String(str || '')
      .trim()
      .toLowerCase()
      .replace(/^حي\s+/, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه');
  const target = norm(neighborhood);
  if (!target) return false;
  return excluded.some((area) => {
    const ex = norm(area);
    return ex && (target === ex || target.includes(ex) || ex.includes(target));
  });
}

function validatePractitionerConflict(helpers, booking, staffId) {
  if (!staffId) return;
  const s = helpers.settings();
  const start = +new Date(`${booking.date}T${booking.time}:00+03:00`);
  const bDurationMs = (Number(booking.duration) || 60) * 60000;
  const end = start + bDurationMs;
  for (const other of helpers.bookings()) {
    if (
      other.id === booking.id ||
      other.assigned_staff_id !== staffId ||
      !['confirmed', 'in_progress'].includes(other.status)
    ) {
      continue;
    }
    const oStart = +new Date(`${other.date}T${other.time}:00+03:00`);
    const oDurationMs = (Number(other.duration) || 60) * 60000;
    const oEnd = oStart + oDurationMs;
    const travelMs = calculateTravelBuffer(s, other.neighborhood, booking.neighborhood) * 60000;

    // Direct overlap
    if (oStart < end && oEnd > start) {
      fail('Assigned practitioner has an overlapping appointment during this window', 409);
    }
    // Travel buffer overlap between consecutive appointments
    if (oStart < start && oEnd + travelMs > start) {
      fail('Assigned practitioner has an overlapping appointment or travel buffer during this window', 409);
    }
    if (start < oStart && end + travelMs > oStart) {
      fail('Assigned practitioner has an overlapping appointment or travel buffer during this window', 409);
    }
  }
}

export function validateSchedule(helpers, booking, confirmed = false, enforceLead = true) {
  const s = helpers.settings();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(booking.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time)) {
    fail('Invalid date or time');
  }
  const startDt = new Date(`${booking.date}T${booking.time}:00+03:00`);
  if (!Number.isFinite(+startDt) || new Date(+startDt + 10800000).toISOString().slice(0, 10) !== booking.date) {
    fail('Invalid date');
  }
  if (enforceLead && +startDt < Date.now() + s.lead_hours * 3600000) {
    fail('Appointment is too soon');
  }

  const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const dayOfWeek = new Date(`${booking.date}T12:00:00+03:00`).getUTCDay();
  if (!s.working_days.includes(dayOfWeek) || s.blocked_dates.includes(booking.date)) {
    fail('Date is unavailable');
  }
  if (
    toMinutes(booking.time) < toMinutes(s.opening_time) ||
    toMinutes(booking.time) + booking.duration > toMinutes(s.closing_time)
  ) {
    fail('Outside working hours');
  }
  if (isNeighborhoodExcluded(s, booking.neighborhood)) {
    fail(s.out_of_range_message_ar || 'نعتذر، هذا الحي خارج نطاق التغطية حالياً في المدينة المنورة.', 400);
  }
  if (s.areas.length && !s.areas.includes(booking.neighborhood)) {
    fail(s.out_of_range_message_ar || 'Neighborhood is outside configured service areas');
  }

  if (confirmed) {
    const allServices = helpers.services();
    const needsCredentials = booking.items.some((item) => {
      const svc = allServices.find((x) => x.id === item.id);
      return svc?.credentials_required && !svc.credentials_approved;
    });
    if (needsCredentials) {
      fail('Professional credential approval is required before confirmation');
    }
    if (!s.capacity) {
      fail('Owner must configure staff capacity before confirmation');
    }

    const start = +startDt;
    const end = start + (booking.duration + s.travel_buffer) * 60000;
    const events = [];

    for (const other of helpers.bookings()) {
      if (other.id === booking.id || !['confirmed', 'in_progress'].includes(other.status)) continue;
      const otherStart = +new Date(`${other.date}T${other.time}:00+03:00`);
      const otherEnd = otherStart + (other.duration + s.travel_buffer) * 60000;
      if (otherStart < end && otherEnd > start) {
        events.push([Math.max(otherStart, start), 1], [Math.min(otherEnd, end), -1]);
      }
    }

    let concurrent = 0;
    for (const [, change] of events.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
      concurrent += change;
      if (concurrent >= s.capacity) {
        fail('Appointment exceeds staff capacity', 409);
      }
    }
  }
}

export function formatBookingResult(helpers, booking) {
  const servicesList = (booking.items || [])
    .map((i) => `${i.name_ar} (${i.price} ر.س)`)
    .join(' + ');
  const addOnsLine =
    booking.add_ons && booking.add_ons.length
      ? `\nالخدمات الإضافية (Add-Ons): ${booking.add_ons.map((a) => `${a.name_ar} (+${a.price} ر.س)`).join(' + ')}`
      : '';
  const deliveryLine =
    Number(booking.delivery_fee || 0) > 0
      ? `\nرسوم التوصيل المنزلي: ${booking.delivery_fee} ر.س`
      : '';
  const discountLine = booking.discount_amount
    ? `\nكود الخصم / الإهداء (${booking.coupon_code}): -${booking.discount_amount} ر.س`
    : '';
  const notesLine = booking.notes ? `\nملاحظات: ${booking.notes}` : '';
  const message =
    `مرحباً J Beauty Spa 🌸\n` +
    `طلب حجز منزلي في المدينة المنورة:\n` +
    `• رقم الطلب: ${booking.reference}\n` +
    `• الاسم: ${booking.name}\n` +
    `• الجوال: ${booking.phone}\n` +
    `• الخدمات: ${servicesList}` +
    `${addOnsLine}` +
    `${deliveryLine}\n` +
    `• التاريخ والوقت: ${booking.date} الساعة ${booking.time}\n` +
    `• الحي: ${booking.neighborhood}` +
    `${discountLine}\n` +
    `• إجمالي الحجز: ${booking.total} ر.س` +
    `${notesLine}\n` +
    `بانتظار تأكيد الموعد وتفاصيل الدفع ✨`;
  const invTok = invoiceToken(booking);
  const invUrl = `/api/invoices/${booking.reference}/${invTok}`;
  const invPdfUrl = `/api/invoices/${booking.reference}/${invTok}.pdf`;
  return {
    booking: {
      ...booking,
      invoice_token: invTok,
      invoice_url: invUrl,
      invoice_pdf_url: invPdfUrl,
      whatsapp_message: message,
    },
    invoice_token: invTok,
    invoice_url: invUrl,
    invoice_pdf_url: invPdfUrl,
    message,
    whatsapp_url: whatsappUrl(helpers.settings(), message),
  };
}

export function findActiveGiftByCode(db, code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return null;
  const rows = db.all('SELECT id, reference, data FROM gift_requests');
  for (const row of rows) {
    try {
      const g = JSON.parse(row.data);
      const giftCode = String(g.gift_code || '').trim().toUpperCase();
      // SECURITY: Gift card must be paid, verified, and activated by staff before redemption
      if (!g.payment_verified || g.status !== 'approved_ready') continue;
      if (g.redeemed || g.status === 'redeemed' || g.status === 'cancelled') continue;
      if (giftCode === clean) {
        return { rowId: row.id, gift: g };
      }
    } catch {}
  }
  return null;
}

export function createBooking(db, helpers, user, sessionId, body) {
  if (body.terms !== true) fail('Accept booking terms');
  const idempotencyKey = text(body.idempotency_key || uid(), 100);
  const scope = user?.id || sessionId;

  const existing = db.get('SELECT id FROM bookings WHERE scope=? AND idempotency=?', scope, idempotencyKey);
  if (existing) {
    const found = helpers.bookings().find((b) => b.id === existing.id);
    return { created: false, result: formatBookingResult(helpers, found) };
  }

  const allPackages = helpers.packages();
  const allServices = helpers.services();
  const selectedPkg = body.package_id
    ? allPackages.find((p) => p.id === body.package_id && p.active)
    : null;
  if (body.package_id && !selectedPkg) fail('Package unavailable');

  const ids = selectedPkg ? selectedPkg.service_ids : body.service_ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 13 || new Set(ids).size !== ids.length) {
    fail('Choose services');
  }

  const items = ids.map((id) => {
    const svc = allServices.find((s) => s.id === id && s.active);
    if (!svc) fail('Service unavailable');
    return svc;
  });

  const s = helpers.settings();
  if (s.business_approved && items.some((x) => x.credentials_required && !x.credentials_approved)) {
    fail('This service requires business credential approval before booking');
  }

  // Parse optional add-ons (accept array of IDs or objects with id):
  const validAddOns = [];
  if (Array.isArray(body.add_ons) && body.add_ons.length) {
    const seenAddOns = new Set();
    for (const rawAddon of body.add_ons) {
      const aId = typeof rawAddon === 'object' && rawAddon ? rawAddon.id : rawAddon;
      if (!aId || seenAddOns.has(aId)) continue;
      const found = BOOKING_ADD_ONS.find((a) => a.id === aId);
      if (found) {
        seenAddOns.add(aId);
        validAddOns.push(found);
      }
    }
  }

  const baseTotal = selectedPkg ? selectedPkg.price : items.reduce((sum, item) => sum + item.price, 0);
  const baseDuration = items.reduce((sum, item) => sum + item.duration, 0);
  const addOnsTotal = validAddOns.reduce((sum, a) => sum + a.price, 0);
  const addOnsDuration = validAddOns.reduce((sum, a) => sum + a.duration, 0);
  const deliveryFee = Math.max(0, Number(s.delivery_fee || 0));
  const subtotal = baseTotal + addOnsTotal + deliveryFee;
  const finalDuration = baseDuration + addOnsDuration;

  const clientPhone = phone(body.phone);

  // Parse optional coupon or auto-verified gift card code:
  let appliedCoupon = null;
  let appliedGiftRow = null;
  let discountAmount = 0;
  if (body.coupon_code) {
    const code = String(body.coupon_code).trim().toUpperCase();
    const giftMatch = findActiveGiftByCode(db, code);
    if (giftMatch) {
      const { gift } = giftMatch;
      if (gift.status === 'cancelled') {
        fail('تم إلغاء بطاقة الإهداء هذه من قبل الإدارة ولا يمكن استخدامها.', 400);
      }
      if (gift.status === 'redeemed' || gift.redeemed) {
        fail('تم استخدام كود بطاقة الإهداء هذه مسبقاً.', 400);
      }
      if (gift.status === 'pending_payment' || !gift.payment_verified) {
        fail('بطاقة الإهداء بانتظار تأكيد التحويل البنكي وتفعيلها من الإدارة قبل الاستخدام.', 400);
      }
      const giftVal = Number(gift.estimated_amount || gift.chosen?.price || 0);
      appliedCoupon = gift.gift_code || gift.reference;
      discountAmount = Math.min(subtotal, giftVal);
      appliedGiftRow = giftMatch;
    } else {
      const c = db.get('SELECT * FROM coupons WHERE UPPER(code)=? AND active=1', code);
      const today = new Date().toISOString().slice(0, 10);
      if (!c) {
        fail('كود الخصم المدخل غير صالح أو غير مفعّل', 400);
      }
      if (c.valid_from && c.valid_from > today) fail('هذا الكوبون لم يبدأ تفعيله بعد', 400);
      if (c.valid_until && c.valid_until < today) fail('عذراً، انتهت صلاحية هذا الكوبون', 400);
      if (c.min_spend && subtotal < c.min_spend) {
        fail(`الحد الأدنى للاستفادة من هذا الكوبون هو ${c.min_spend} ر.س`, 400);
      }
      if (c.max_uses > 0 && c.used_count >= c.max_uses) {
        fail('عذراً، اكتمل الحد الأقصى لاستخدام هذا الكوبون', 400);
      }

      // Enforce single-use per customer (phone or user_id)
      const altPhone = clientPhone.startsWith('966') ? '0' + clientPhone.slice(3) : clientPhone;
      const alreadyRedeemed = db.get(
        'SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code)=? AND (phone=? OR phone=? OR (user_id IS NOT NULL AND user_id=?))',
        c.code,
        clientPhone,
        altPhone,
        user?.id || null,
      );
      if (alreadyRedeemed) {
        fail('تم استخدام كود الخصم هذا مسبقاً لهذا الرقم. الكوبون متاح للاستخدام لمرة واحدة فقط لكل عميلة.', 400);
      }

      appliedCoupon = c.code;
      if (c.discount_type === 'percent') {
        discountAmount = Math.round((subtotal * c.discount_value) / 100);
      } else {
        discountAmount = Math.min(subtotal, c.discount_value);
      }
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  const booking = {
    id: uid(),
    reference: `J-${randomBytes(6).toString('hex').toUpperCase()}`,
    user_id: user?.role === 'customer' ? user.id : null,
    name: text(body.name, 100),
    phone: clientPhone,
    neighborhood: text(body.neighborhood, 150),
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : '',
    date: body.date,
    time: body.time,
    items: items.map(({ id, name_ar, name_en, price, duration }) => ({
      id,
      name_ar,
      name_en,
      price,
      duration,
    })),
    add_ons: validAddOns.map(({ id, name_ar, name_en, price, duration }) => ({
      id,
      name_ar,
      name_en,
      price,
      duration,
    })),
    package_id: selectedPkg?.id || null,
    delivery_fee: deliveryFee,
    subtotal,
    coupon_code: appliedCoupon,
    discount_amount: discountAmount,
    total: finalTotal,
    duration: finalDuration,
    status: 'pending_confirmation',
    payment_status: 'awaiting_receipt',
    hold_expires_at: new Date(Date.now() + 3600000).toISOString(),
    paid_amount: 0,
    paid_cents: 0,
    payment_verified: false,
    payment_verified_at: null,
    payment_method: null,
    receipt_uploaded: false,
    receipt_uploaded_at: null,
    refund_cents: 0,
    points_rate: s.points_per_sar,
    assigned_staff_id: null,
    assigned_staff_name: null,
    internal_notes: '',
    created_at: now(),
  };

  if (user?.role === 'customer' && booking.phone !== user.phone) {
    fail('Use your registered phone number');
  }

  validateSchedule(helpers, booking);

  db.tx(() => {
    // Re-check atomic single-use inside BEGIN IMMEDIATE transaction (prevents race condition!)
    if (appliedGiftRow) {
      const freshRow = db.get('SELECT data FROM gift_requests WHERE id=?', appliedGiftRow.rowId);
      const freshGift = freshRow ? JSON.parse(freshRow.data) : null;
      if (!freshGift || !freshGift.payment_verified || freshGift.status !== 'approved_ready' || freshGift.status === 'cancelled' || freshGift.redeemed || freshGift.status === 'redeemed') {
        fail('بطاقة الإهداء هذه غير مفعّلة أو لم يتم التحقق من سدادها أو تم استخدامها بالفعل.', 400);
      }
      freshGift.status = 'redeemed';
      freshGift.redeemed = true;
      freshGift.redeemed_booking_id = booking.id;
      freshGift.redeemed_booking_ref = booking.reference;
      freshGift.redeemed_at = now();
      db.run('UPDATE gift_requests SET data=? WHERE id=?', JSON.stringify(freshGift), appliedGiftRow.rowId);
    } else if (appliedCoupon) {
      const altPhone = clientPhone.startsWith('966') ? '0' + clientPhone.slice(3) : clientPhone;
      const raceCheck = db.get(
        'SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code)=? AND (phone=? OR phone=? OR (user_id IS NOT NULL AND user_id=?))',
        appliedCoupon,
        clientPhone,
        altPhone,
        user?.id || null,
      );
      if (raceCheck) {
        fail('تم استخدام كود الخصم هذا مسبقاً لهذا الرقم.', 400);
      }
      db.run('UPDATE coupons SET used_count = used_count + 1 WHERE UPPER(code)=?', appliedCoupon);
      db.run(
        'INSERT INTO coupon_redemptions(id, coupon_id, coupon_code, user_id, phone, booking_id, created_at) VALUES(?,?,?,?,?,?,?)',
        uid(),
        appliedCoupon,
        appliedCoupon,
        user?.id || null,
        clientPhone,
        booking.id,
        now(),
      );
    }

    db.run(
      'INSERT INTO bookings(id,reference,user_id,scope,idempotency,data,assigned_staff_id) VALUES(?,?,?,?,?,?,?)',
      booking.id,
      booking.reference,
      booking.user_id,
      scope,
      idempotencyKey,
      JSON.stringify(booking),
      null,
    );
    helpers.audit(user, 'booking.request', booking.id, JSON.stringify({ reference: booking.reference, total: booking.total, add_ons: validAddOns.length }));
  });

  return { created: true, result: formatBookingResult(helpers, booking) };
}

export function updateBookingAdmin(db, helpers, actorUser, bookingId, body) {
  const transitions = {
    pending_confirmation: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'completed', 'cancelled', 'no_show'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
    no_show: [],
  };

  return db.tx(() => {
    const b = helpers.bookings().find((x) => x.id === bookingId);
    if (!b) fail('Booking not found', 404);
    const prev = { ...b };

    const isPractitionerOnly =
      !hasCapability(actorUser, 'bookings.update') &&
      !hasCapability(actorUser, 'bookings.update_status_basic') &&
      !hasCapability(actorUser, 'bookings.confirm') &&
      hasCapability(actorUser, 'bookings.update_assigned_status');

    if (isPractitionerOnly) {
      if (b.assigned_staff_id !== actorUser.id) {
        fail('Access restricted to your assigned bookings', 403);
      }
      if (
        body.date !== undefined ||
        body.time !== undefined ||
        body.assigned_staff_id !== undefined ||
        body.paid_amount !== undefined ||
        body.payment_method !== undefined ||
        body.payment_verified !== undefined ||
        body.refund_amount !== undefined
      ) {
        fail('Missing required permission for this booking modification', 403);
      }
      if (body.status && !['in_progress', 'completed'].includes(body.status)) {
        fail('Practitioners can only update assigned visits to in progress or completed', 403);
      }
    }

    if (body.status && body.status !== b.status) {
      if (body.status === 'confirmed' && b.status === 'pending_confirmation') {
        if (!hasCapability(actorUser, 'bookings.confirm') && !hasCapability(actorUser, 'bookings.update')) {
          fail('Missing required permission: bookings.confirm', 403);
        }
      } else if (!isPractitionerOnly) {
        if (
          !hasCapability(actorUser, 'bookings.update') &&
          !hasCapability(actorUser, 'bookings.update_status_basic')
        ) {
          fail('Missing required permission: bookings.update', 403);
        }
      }
      if (!transitions[b.status]?.includes(body.status)) {
        fail('Invalid booking status transition');
      }
      b.status = body.status;
    }

    if (body.date !== undefined || body.time !== undefined) {
      requireCapability(actorUser, 'bookings.update');
      if (body.date !== undefined) b.date = body.date;
      if (body.time !== undefined) b.time = body.time;
      if (!['pending_confirmation', 'confirmed'].includes(b.status)) {
        fail('Cannot reschedule this booking');
      }
    }

    if (body.assigned_staff_id !== undefined) {
      requireCapability(actorUser, 'bookings.assign');
      const staffId = body.assigned_staff_id ? String(body.assigned_staff_id).trim() : null;
      if (!staffId) {
        b.assigned_staff_id = null;
        b.assigned_staff_name = null;
      } else {
        const assignee = db.get(
          "SELECT id,name,role FROM users WHERE id=? AND role IN ('practitioner','ops_manager','owner')",
          staffId,
        );
        if (!assignee) fail('Valid active staff practitioner required for assignment', 400);
        b.assigned_staff_id = assignee.id;
        b.assigned_staff_name = assignee.name;
      }
    }

    if (body.internal_notes !== undefined) {
      if (!hasCapability(actorUser, 'bookings.update') && !hasCapability(actorUser, 'bookings.confirm')) {
        fail('Missing required permission to edit internal notes', 403);
      }
      b.internal_notes = typeof body.internal_notes === 'string' ? body.internal_notes.trim().slice(0, 1000) : '';
    }

    if (['confirmed', 'in_progress'].includes(b.status) && (b.status !== prev.status || body.date || body.time || body.assigned_staff_id !== undefined)) {
      validateSchedule(helpers, b, true, b.status !== 'in_progress');
      validatePractitionerConflict(helpers, b, b.assigned_staff_id);
    } else if (body.date || body.time) {
      validateSchedule(helpers, b);
    }

    if (body.paid_amount !== undefined) {
      requireCapability(actorUser, 'payments.verify');
      const cents = money(body.paid_amount);
      if (b.payment_verified && cents !== b.paid_cents) {
        fail('Verified payments are immutable. Record a refund instead.');
      }
      b.paid_cents = cents;
      b.paid_amount = cents / 100;
    }

    if (body.payment_method !== undefined) {
      requireCapability(actorUser, 'payments.verify');
      if (!['cash', 'card', 'bank_transfer', 'other'].includes(body.payment_method)) {
        fail('Invalid payment method');
      }
      b.payment_method = body.payment_method;
    }

    if (body.payment_verified !== undefined) {
      requireCapability(actorUser, 'payments.verify');
      if (typeof body.payment_verified !== 'boolean') fail('Invalid verification flag');
      if (b.payment_verified && !body.payment_verified) {
        fail('Use a refund to reverse verified payment');
      }
      if (body.payment_verified && (!b.payment_method || b.paid_cents <= 0)) {
        fail('Enter payment amount and method');
      }
      if (body.payment_verified && !b.payment_verified) {
        b.payment_verified_at = now();
      }
      b.payment_verified = body.payment_verified;
      if (body.payment_verified) {
        b.payment_status = 'verified_paid';
        b.hold_expires_at = null;
        if (b.status === 'pending_confirmation') {
          b.status = 'confirmed';
        }
        if (!b.assigned_staff_id) {
          try {
            const autoAssign = autoAssignPractitioner(db, helpers, b);
            if (autoAssign) {
              b.assigned_staff_id = autoAssign.id;
              b.assigned_staff_name = autoAssign.name;
            }
          } catch {}
        }
      }
    }

    if (body.refund_amount !== undefined) {
      requireCapability(actorUser, 'refunds.approve');
      text(body.reason, 500);
      const refund = money(body.refund_amount);
      if (!b.payment_verified || refund > b.paid_cents || refund < (b.refund_cents || 0)) {
        fail('Invalid cumulative refund amount');
      }
      b.refund_cents = refund;
      b.refund_updated_at = now();
    }

    if (b.status === 'cancelled' && b.payment_verified && b.paid_cents > (b.refund_cents || 0)) {
      fail('Record full refund before cancellation');
    }

    reconcileLoyalty(db, helpers, b);
    helpers.saveBooking(b);
    helpers.audit(
      actorUser,
      'booking.update',
      b.id,
      JSON.stringify({
        status: b.status,
        assigned_staff_id: b.assigned_staff_id || null,
        paid_amount: b.paid_amount,
        refund_amount: (b.refund_cents || 0) / 100,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 200) : '',
      }),
    );
    return b;
  });
}

