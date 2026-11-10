import { randomBytes } from 'node:crypto';
import { now, uid } from './db.mjs';
import { fail, money, phone, text, whatsappUrl } from './validation.mjs';
import { reconcileLoyalty } from './loyalty.mjs';

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
  if (s.areas.length && !s.areas.includes(booking.neighborhood)) {
    fail('Neighborhood is outside configured service areas');
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
    if (!s.capacity || !s.areas.length) {
      fail('Owner must configure staff capacity and service areas before confirmation');
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
  const notesLine = booking.notes ? `\nملاحظات: ${booking.notes}` : '';
  const message =
    `مرحباً J SPA،\n` +
    `أرغب في تقديم طلب حجز منزلي.\n` +
    `رقم الطلب: ${booking.reference}\n` +
    `الاسم: ${booking.name}\n` +
    `الخدمة: ${booking.items.map((i) => i.name_ar).join('، ')}\n` +
    `التاريخ المفضل: ${booking.date}\n` +
    `الوقت المفضل: ${booking.time}\n` +
    `الحي: ${booking.neighborhood}\n` +
    `الإجمالي التقديري: ${booking.total} ر.س` +
    `${notesLine}\n` +
    `يرجى تأكيد توفر الموعد.`;
  return {
    booking,
    message,
    whatsapp_url: whatsappUrl(helpers.settings(), message),
  };
}

export function createBooking(db, helpers, user, sessionId, body) {
  if (body.terms !== true) fail('Accept booking terms');
  const idempotencyKey = text(body.idempotency_key, 100);
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

  const booking = {
    id: uid(),
    reference: `J-${randomBytes(6).toString('hex').toUpperCase()}`,
    user_id: user?.role === 'customer' ? user.id : null,
    name: text(body.name, 100),
    phone: phone(body.phone),
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
    package_id: selectedPkg?.id || null,
    total: selectedPkg ? selectedPkg.price : items.reduce((sum, item) => sum + item.price, 0),
    duration: items.reduce((sum, item) => sum + item.duration, 0),
    status: 'pending_confirmation',
    paid_amount: 0,
    paid_cents: 0,
    payment_verified: false,
    payment_verified_at: null,
    payment_method: null,
    refund_cents: 0,
    points_rate: s.points_per_sar,
    created_at: now(),
  };

  if (user?.role === 'customer' && booking.phone !== user.phone) {
    fail('Use your registered phone number');
  }

  validateSchedule(helpers, booking);

  db.tx(() => {
    db.run(
      'INSERT INTO bookings VALUES(?,?,?,?,?,?)',
      booking.id,
      booking.reference,
      booking.user_id,
      scope,
      idempotencyKey,
      JSON.stringify(booking),
    );
    helpers.audit(user, 'booking.request', booking.id);
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

    if (body.status && body.status !== b.status) {
      if (!transitions[b.status]?.includes(body.status)) {
        fail('Invalid booking status transition');
      }
      b.status = body.status;
    }

    if (body.date !== undefined) b.date = body.date;
    if (body.time !== undefined) b.time = body.time;
    if ((body.date || body.time) && !['pending_confirmation', 'confirmed'].includes(b.status)) {
      fail('Cannot reschedule this booking');
    }
    if (['confirmed', 'in_progress'].includes(b.status) && (b.status !== prev.status || body.date || body.time)) {
      validateSchedule(helpers, b, true, b.status !== 'in_progress');
    } else if (body.date || body.time) {
      validateSchedule(helpers, b);
    }

    if (body.paid_amount !== undefined) {
      const cents = money(body.paid_amount);
      if (b.payment_verified && cents !== b.paid_cents) {
        fail('Verified payments are immutable. Record a refund instead.');
      }
      b.paid_cents = cents;
      b.paid_amount = cents / 100;
    }

    if (body.payment_method !== undefined) {
      if (!['cash', 'card', 'bank_transfer', 'other'].includes(body.payment_method)) {
        fail('Invalid payment method');
      }
      b.payment_method = body.payment_method;
    }

    if (body.payment_verified !== undefined) {
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
    }

    if (body.refund_amount !== undefined) {
      if (actorUser.role !== 'owner') fail('Owner access required', 403);
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
        paid_amount: b.paid_amount,
        refund_amount: (b.refund_cents || 0) / 100,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 200) : '',
      }),
    );
    return b;
  });
}

