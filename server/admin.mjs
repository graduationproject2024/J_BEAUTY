import { employeeCustomerView, hash, hashPassword, publicUser, token } from './auth.mjs';
import { now, uid, DEFAULT_SETTINGS } from './db.mjs';
import { processRewardAction, reconcileLoyalty } from './loyalty.mjs';
import { updateBookingAdmin } from './booking.mjs';
import { fail, maskPhone, money, phone, safeImageUrl, safeSocialUrl, text } from './validation.mjs';

function filterEmployeeBookings(allBookings, pendingRewardBookingIds) {
  const recentCutoff = Date.now() - 14 * 86400000;
  return allBookings
    .filter((b) => {
      if (['pending_confirmation', 'confirmed', 'in_progress'].includes(b.status)) return true;
      if (b.status === 'completed' && !b.payment_verified) return true;
      if (pendingRewardBookingIds.has(b.id)) return true;
      const created = Date.parse(b.created_at || '');
      return b.status === 'completed' && Number.isFinite(created) && created >= recentCutoff;
    })
    .map((b) => {
      const closed = b.status === 'cancelled' || b.status === 'no_show' || (b.status === 'completed' && b.payment_verified);
      return {
        id: b.id,
        reference: b.reference,
        user_id: b.user_id,
        name: b.name,
        phone: closed ? maskPhone(b.phone) : b.phone,
        neighborhood: b.neighborhood,
        notes: closed ? '' : b.notes,
        date: b.date,
        time: b.time,
        items: b.items,
        package_id: b.package_id,
        total: b.total,
        duration: b.duration,
        status: b.status,
        paid_amount: b.paid_amount,
        payment_verified: b.payment_verified,
        payment_verified_at: b.payment_verified_at || null,
        payment_method: b.payment_method,
        created_at: b.created_at,
      };
    });
}

export function getAdminPayload(db, helpers, user) {
  const isOwner = user.role === 'owner';
  const allBookings = helpers.bookings();
  const activeVerifications = db.all(
    'SELECT id,user_id,expires,used FROM verification WHERE used=0 AND expires>?',
    Date.now(),
  );
  const pendingVerifySet = new Set(activeVerifications.map((v) => v.user_id));
  const allRewardRequests = db
    .all('SELECT data FROM reward_requests')
    .map((r) => JSON.parse(r.data));
  const pendingRewards = allRewardRequests.filter((r) => r.status === 'pending');
  const pendingRewardBookingIds = new Set(pendingRewards.map((r) => r.booking_id).filter(Boolean));
  const rawCustomers = db.all("SELECT * FROM users WHERE role='customer'");
  const allServices = helpers.services();
  const allPackages = helpers.packages();
  const currentSettings = helpers.settings();

  if (!isOwner) {
    return {
      bookings: filterEmployeeBookings(allBookings, pendingRewardBookingIds),
      customers: rawCustomers.map((c) => employeeCustomerView(c, pendingVerifySet.has(c.id))),
      verifications: activeVerifications,
      payments: [],
      ledger: [],
      reward_requests: pendingRewards,
      services: allServices,
      packages: allPackages,
      schedule_config: {
        capacity: currentSettings.capacity,
        working_days: currentSettings.working_days,
        opening_time: currentSettings.opening_time,
        closing_time: currentSettings.closing_time,
        blocked_dates: currentSettings.blocked_dates,
        travel_buffer: currentSettings.travel_buffer,
        areas: currentSettings.areas,
      },
      reviews: [],
      settings: {},
      staff: [],
      audit: [],
      analytics: {},
    };
  }

  const allUsersById = new Map(
    db.all('SELECT id,name,role FROM users').map((u) => [u.id, { name: u.name, role: u.role }]),
  );

  const payments = allBookings
    .filter((b) => b.payment_verified)
    .map((b) => ({
      id: b.id,
      booking_id: b.id,
      reference: b.reference,
      customer_name: b.name,
      booking_total: b.total,
      paid_amount: b.paid_amount,
      refund_amount: (b.refund_cents || 0) / 100,
      net_amount: Math.max(0, b.paid_cents - (b.refund_cents || 0)) / 100,
      payment_method: b.payment_method,
      payment_verified: b.payment_verified,
      payment_verified_at: b.payment_verified_at || null,
      service_date: b.date,
    }));

  const auditRows = db.all('SELECT * FROM audit ORDER BY id DESC LIMIT 500').map((row) => {
    const actorInfo = row.actor ? allUsersById.get(row.actor) : null;
    return {
      ...row,
      actor_name: actorInfo ? `${actorInfo.name} (${actorInfo.role})` : row.actor || 'System',
    };
  });

  return {
    bookings: allBookings,
    customers: rawCustomers.map(publicUser),
    verifications: activeVerifications,
    payments,
    ledger: db.all('SELECT * FROM ledger ORDER BY created_at DESC LIMIT 500'),
    reward_requests: allRewardRequests,
    services: allServices,
    packages: allPackages,
    reviews: db.all('SELECT * FROM reviews').map((r) => ({ ...JSON.parse(r.data), booking_id: r.booking_id })),
    settings: currentSettings,
    staff: db.all("SELECT * FROM users WHERE role!='customer'").map(publicUser),
    audit: auditRows,
    analytics: {
      total: allBookings.length,
      pending: allBookings.filter((b) => b.status === 'pending_confirmation').length,
      confirmed: allBookings.filter((b) => b.status === 'confirmed').length,
      completed: allBookings.filter((b) => b.status === 'completed').length,
      revenue: allBookings
        .filter((b) => b.payment_verified)
        .reduce((sum, b) => sum + (b.paid_cents - (b.refund_cents || 0)) / 100, 0),
      unpaid: allBookings.filter((b) => b.status === 'completed' && !b.payment_verified).length,
      returning_customers: Object.values(
        allBookings
          .filter((b) => b.user_id && b.status === 'completed')
          .reduce((acc, b) => ((acc[b.user_id] = (acc[b.user_id] || 0) + 1), acc), {}),
      ).filter((count) => count > 1).length,
      points_issued: db.get('SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE points>0').n,
      points_redeemed: -db.get("SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE reason='reward'").n,
      most_booked: allServices
        .map((s) => ({
          name: s.name_en,
          name_ar: s.name_ar,
          count: allBookings.filter((b) => b.items.some((item) => item.id === s.id)).length,
        }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

export function handleAdminRoute({ db, helpers, user, route, body, checkRate, send }) {
  if (route === '/api/admin' && !body) {
    return send(getAdminPayload(db, helpers, user));
  }

  if (/^\/api\/admin\/bookings\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    return send({ booking: updateBookingAdmin(db, helpers, user, id, body) });
  }

  if (route === '/api/admin/verify') {
    db.tx(() => {
      if (body.checked !== true) fail('Confirm that you checked the actual WhatsApp sender');
      const target = db.get('SELECT * FROM users WHERE id=?', body.user_id);
      if (!target || target.role !== 'customer' || phone(body.observed_phone) !== target.phone) {
        fail('Sender number does not match');
      }
      const refHash = hash(String(body.reference || '').trim().toUpperCase());
      const verification = db.get(
        'SELECT * FROM verification WHERE user_id=? AND reference_hash=? AND used=0 AND expires>?',
        target.id,
        refHash,
        Date.now(),
      );
      if (!verification) fail('Invalid or expired verification reference');

      db.run('UPDATE verification SET used=1 WHERE user_id=?', target.id);
      db.run('UPDATE users SET verified=1 WHERE id=?', target.id);
      for (const b of helpers.bookings().filter((x) => x.user_id === target.id)) {
        reconcileLoyalty(db, helpers, b);
      }
      helpers.audit(user, 'account.verify', target.id, 'Actual sender and one-time reference checked');
    });
    return send({ ok: true });
  }

  if (route === '/api/admin/recovery') {
    const target = db.get('SELECT * FROM users WHERE id=?', body.user_id);
    if (!target || target.role !== 'customer' || body.checked !== true || phone(body.observed_phone) !== target.phone) {
      fail('Verified customer and actual sender check required');
    }
    checkRate(`recovery:${target.id}`, 5, 3600000);
    const resetToken = token();
    db.tx(() => {
      if (!target.verified) {
        for (const b of helpers.bookings().filter((x) => x.user_id === target.id)) {
          b.user_id = null;
          helpers.saveBooking(b);
        }
        db.run('UPDATE bookings SET user_id=NULL WHERE user_id=?', target.id);
        db.run('UPDATE verification SET used=1 WHERE user_id=?', target.id);
        db.run('UPDATE users SET verified=1,password=? WHERE id=?', hashPassword(token()), target.id);
        db.run('DELETE FROM sessions WHERE user_id=?', target.id);
        helpers.audit(
          user,
          'account.unverified_phone_reclaim',
          target.id,
          'Actual sender checked; previous self-created records detached before reset',
        );
      }
      db.run('UPDATE recovery SET used=1 WHERE user_id=?', target.id);
      db.run('INSERT INTO recovery VALUES(?,?,?,?,0)', uid(), target.id, hash(resetToken), Date.now() + 15 * 60000);
      helpers.audit(user, 'account.recovery_created', target.id);
    });
    return send({
      token: resetToken,
      reset_url: `/ar/reset#${resetToken}`,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
    });
  }

  if (/^\/api\/admin\/rewards\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    return send({ reward_request: processRewardAction(db, helpers, user, id, body) });
  }

  // Everything below requires Owner privilege
  if (user.role !== 'owner') fail('Owner access required', 403);

  if (route === '/api/admin/services') {
    const existing = body.id ? helpers.services().find((s) => s.id === body.id) : null;
    if (body.id && !existing) fail('Service not found');
    const s = { ...existing, ...body, id: existing?.id || uid() };
    s.name_ar = text(s.name_ar, 150);
    s.name_en = text(s.name_en, 150);
    s.description_ar = text(s.description_ar, 2000);
    s.description_en = text(s.description_en, 2000);
    s.price_cents = money(s.price);
    if (!Number.isInteger(s.duration) || s.duration < 5 || s.duration > 480) fail('Invalid duration');
    if (!['massage', 'nails', 'gel'].includes(s.category)) fail('Invalid category');
    s.active = s.active !== false;
    s.credentials_required = existing?.credentials_required || !!s.credentials_required;
    s.credentials_approved = !!s.credentials_approved;
    s.image = safeImageUrl(s.image || '');
    db.run('INSERT OR REPLACE INTO services VALUES(?,?)', s.id, JSON.stringify(s));
    helpers.audit(user, 'service.save', s.id);
    return send({ service: { ...s, price: s.price_cents / 100 } });
  }

  if (route === '/api/admin/packages') {
    const existing = body.id ? helpers.packages().find((p) => p.id === body.id) : null;
    if (body.id && !existing) fail('Package not found');
    if (body.remove) {
      db.run('DELETE FROM packages WHERE id=?', body.id);
      helpers.audit(user, 'package.remove', body.id);
      return send({ ok: true });
    }
    const allServiceIds = new Set(helpers.services().map((s) => s.id));
    const p = { ...existing, ...body, id: existing?.id || uid() };
    p.name_ar = text(p.name_ar, 150);
    p.name_en = text(p.name_en, 150);
    p.price_cents = money(p.price);
    if (
      !Array.isArray(p.service_ids) ||
      !p.service_ids.length ||
      new Set(p.service_ids).size !== p.service_ids.length ||
      p.service_ids.some((id) => !allServiceIds.has(id))
    ) {
      fail('Invalid package services');
    }
    p.active = p.active !== false;
    db.run('INSERT OR REPLACE INTO packages VALUES(?,?)', p.id, JSON.stringify(p));
    helpers.audit(user, 'package.save', p.id);
    return send({ package: p });
  }

  if (route === '/api/admin/settings') {
    const s = { ...helpers.settings(), ...body.settings };
    for (const k of Object.keys(s)) {
      if (!(k in DEFAULT_SETTINGS)) delete s[k];
    }
    if (s.business_phone) s.business_phone = phone(s.business_phone);
    for (const k of ['instagram', 'tiktok']) {
      if (s[k]) s[k] = safeSocialUrl(s[k], k);
    }
    for (const k of ['capacity', 'travel_buffer', 'lead_hours']) {
      if (!Number.isInteger(s[k]) || s[k] < 0 || s[k] > 1000) fail('Invalid schedule setting');
    }
    if (!Number.isFinite(s.points_per_sar) || s.points_per_sar < 0 || s.points_per_sar > 100) {
      fail('Invalid points rate');
    }
    if (!Array.isArray(s.areas) || s.areas.length > 100 || s.areas.some((v) => typeof v !== 'string' || !v.trim() || v.length > 150)) {
      fail('Invalid areas');
    }
    if (!Array.isArray(s.working_days) || s.working_days.some((v) => !Number.isInteger(v) || v < 0 || v > 6)) {
      fail('Invalid working days');
    }
    for (const k of ['opening_time', 'closing_time']) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s[k])) fail('Invalid working time');
    }
    if (s.opening_time >= s.closing_time) fail('Closing must follow opening');
    if (!Array.isArray(s.blocked_dates) || s.blocked_dates.some((v) => !/^\d{4}-\d{2}-\d{2}$/.test(v))) {
      fail('Invalid blocked dates');
    }
    if (!Array.isArray(s.rewards) || s.rewards.length > 20 || new Set(s.rewards.map((r) => r.id)).size !== s.rewards.length) {
      fail('Invalid rewards');
    }
    for (const r of s.rewards) {
      text(r.id, 50);
      if (!Number.isInteger(r.points) || r.points < 1 || r.points > 1000000) fail('Invalid reward points');
      money(r.value);
    }
    for (const k of Object.keys(s).filter((k) => /_(ar|en)$/.test(k))) {
      if (typeof s[k] !== 'string' || s[k].length > 15000) fail('Invalid content');
    }
    s.business_approved = !!s.business_approved;
    db.run('UPDATE config SET data=? WHERE id=1', JSON.stringify(s));
    helpers.audit(user, 'settings.update', '1');
    return send({ settings: s });
  }

  if (/^\/api\/admin\/reviews\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    const row = db.get('SELECT * FROM reviews WHERE id=?', id);
    if (!row) fail('Review not found', 404);
    if (typeof body.approved !== 'boolean') fail('Invalid approval');
    const review = JSON.parse(row.data);
    review.approved = body.approved;
    db.run('UPDATE reviews SET data=? WHERE id=?', JSON.stringify(review), row.id);
    helpers.audit(user, 'review.moderate', row.id);
    return send({ review });
  }

  if (route === '/api/admin/staff') {
    if (body.role !== 'employee') fail('Only employee accounts can be created here');
    const p = phone(body.phone);
    if (db.get('SELECT id FROM users WHERE phone=?', p)) fail('Phone already in use', 409);
    const id = uid();
    db.run(
      'INSERT INTO users VALUES(?,?,?,?,?,?,?)',
      id,
      text(body.name, 100),
      p,
      hashPassword(body.password),
      'employee',
      1,
      now(),
    );
    helpers.audit(user, 'staff.create', id);
    return send({ ok: true }, 201);
  }

  if (/^\/api\/admin\/staff\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    const employee = db.get("SELECT id FROM users WHERE id=? AND role IN ('employee','disabled_employee')", id);
    if (!employee) fail('Employee not found', 404);
    if (body.action !== 'disable' && body.action !== 'enable') fail('Invalid staff action');
    const role = body.action === 'enable' ? 'employee' : 'disabled_employee';
    db.tx(() => {
      db.run('UPDATE users SET role=? WHERE id=?', role, id);
      db.run('DELETE FROM sessions WHERE user_id=?', id);
      helpers.audit(user, `staff.${body.action}`, id);
    });
    return send({ ok: true });
  }

  if (route === '/api/admin/adjustment') {
    const points = body.points;
    const reason = text(body.reason, 500);
    if (!Number.isInteger(points) || !points || Math.abs(points) > 100000) fail('Invalid points');
    db.tx(() => {
      const target = db.get('SELECT * FROM users WHERE id=?', body.user_id);
      if (!target?.verified || target.role !== 'customer') fail('Verified customer required');
      if (helpers.balance(target.id) + points < 0) fail('Balance cannot be negative');
      helpers.recordLedger(target.id, null, points, `manual:${uid()}`, `manual: ${reason}`);
      helpers.audit(user, 'loyalty.adjust', target.id, JSON.stringify({ points, reason }));
    });
    return send({ ok: true });
  }

  fail('Not found', 404);
}

