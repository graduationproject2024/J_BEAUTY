import { employeeCustomerView, hash, hashPassword, publicUser, token } from './auth.mjs';
import { now, uid, DEFAULT_SETTINGS } from './db.mjs';
import { processRewardAction, reconcileLoyalty } from './loyalty.mjs';
import { updateBookingAdmin } from './booking.mjs';
import { getFunnelSummary } from './experiences.mjs';
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

function paginate(items, pageParam, limitParam, defaultLimit = 50) {
  const limit = Math.min(200, Math.max(1, Number(limitParam) || defaultLimit));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(totalPages, Math.max(1, Number(pageParam) || 1));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: { page, limit, total, totalPages },
  };
}

export function getAdminPayload(db, helpers, user, query = {}) {
  const isOwner = user.role === 'owner';
  const allBookings = helpers.bookings().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
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

  const allGroups = db
    .all('SELECT reference, data, created_at FROM group_requests ORDER BY created_at DESC LIMIT 100')
    .map((r) => ({ ...JSON.parse(r.data), reference: r.reference, created_at: r.created_at }));

  const allGifts = db
    .all('SELECT reference, data, created_at FROM gift_requests ORDER BY created_at DESC LIMIT 100')
    .map((r) => ({ ...JSON.parse(r.data), reference: r.reference, created_at: r.created_at }));

  if (!isOwner) {
    const empBookings = filterEmployeeBookings(allBookings, pendingRewardBookingIds);
    const pagedBookings = paginate(empBookings, query.bookings_page, query.bookings_limit, 50);
    return {
      bookings: pagedBookings.items,
      pagination: { bookings: pagedBookings.meta },
      customers: rawCustomers.map((c) => employeeCustomerView(c, pendingVerifySet.has(c.id))),
      verifications: activeVerifications,
      payments: [],
      ledger: [],
      reward_requests: pendingRewards,
      group_requests: allGroups.map((g) => ({
        ...g,
        organizer_phone: g.status === 'pending_approval' ? g.organizer_phone : maskPhone(g.organizer_phone),
      })),
      gift_requests: allGifts.map((g) => ({
        ...g,
        sender_phone: maskPhone(g.sender_phone),
      })),
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

  const auditPage = Math.max(1, Number(query.audit_page) || 1);
  const auditLimit = Math.min(200, Math.max(1, Number(query.audit_limit) || 50));
  const auditTotal = db.get('SELECT COUNT(*) AS n FROM audit').n;
  const auditRows = db
    .all('SELECT * FROM audit ORDER BY id DESC LIMIT ? OFFSET ?', auditLimit, (auditPage - 1) * auditLimit)
    .map((row) => {
      const actorInfo = row.actor ? allUsersById.get(row.actor) : null;
      return {
        ...row,
        actor_name: actorInfo ? `${actorInfo.name} (${actorInfo.role})` : row.actor || 'System',
      };
    });

  const ledgerPage = Math.max(1, Number(query.ledger_page) || 1);
  const ledgerLimit = Math.min(200, Math.max(1, Number(query.ledger_limit) || 50));
  const ledgerTotal = db.get('SELECT COUNT(*) AS n FROM ledger').n;
  const ledgerRows = db.all(
    'SELECT * FROM ledger ORDER BY created_at DESC LIMIT ? OFFSET ?',
    ledgerLimit,
    (ledgerPage - 1) * ledgerLimit,
  );

  const pagedBookings = paginate(allBookings, query.bookings_page, query.bookings_limit, 100);

  return {
    bookings: pagedBookings.items,
    pagination: {
      bookings: pagedBookings.meta,
      audit: { page: auditPage, limit: auditLimit, total: auditTotal, totalPages: Math.max(1, Math.ceil(auditTotal / auditLimit)) },
      ledger: { page: ledgerPage, limit: ledgerLimit, total: ledgerTotal, totalPages: Math.max(1, Math.ceil(ledgerTotal / ledgerLimit)) },
    },
    customers: rawCustomers.map(publicUser),
    verifications: activeVerifications,
    payments,
    ledger: ledgerRows,
    reward_requests: allRewardRequests,
    group_requests: allGroups,
    gift_requests: allGifts,
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
      funnel: getFunnelSummary(db),
    },
  };
}

export function handleAdminRoute({ db, helpers, user, route, query, body, checkRate, send }) {
  if (route === '/api/admin' && !body) {
    return send(getAdminPayload(db, helpers, user, query));
  }

  if (/^\/api\/admin\/bookings\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    return send({ booking: updateBookingAdmin(db, helpers, user, id, body) });
  }

  if (/^\/api\/admin\/group-requests\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    const row = db.get('SELECT * FROM group_requests WHERE id=?', id);
    if (!row) fail('Group request not found', 404);
    const reqObj = JSON.parse(row.data);
    if (!['pending_approval', 'approved', 'cancelled'].includes(body.status)) {
      fail('Invalid status');
    }
    reqObj.status = body.status;
    reqObj.updated_at = now();
    db.run('UPDATE group_requests SET data=? WHERE id=?', JSON.stringify(reqObj), id);
    helpers.audit(user, 'group.update', id, JSON.stringify({ status: body.status }));
    return send({ group_request: reqObj });
  }

  if (/^\/api\/admin\/gift-requests\/[^/]+$/.test(route)) {
    const id = route.split('/').pop();
    const row = db.get('SELECT * FROM gift_requests WHERE id=?', id);
    if (!row) fail('Gift request not found', 404);
    const reqObj = JSON.parse(row.data);
    if (body.status && ['pending_staff_payment', 'approved_ready', 'redeemed', 'cancelled'].includes(body.status)) {
      if (body.status === 'redeemed' && !reqObj.payment_verified && body.payment_verified !== true) {
        fail('Gift payment must be verified before redemption');
      }
      reqObj.status = body.status;
      if (body.status === 'redeemed') reqObj.redeemed = true;
    }
    if (typeof body.payment_verified === 'boolean') {
      reqObj.payment_verified = body.payment_verified;
      if (reqObj.payment_verified && !reqObj.payment_verified_at) {
        reqObj.payment_verified_at = now();
      }
    }
    db.run('UPDATE gift_requests SET data=? WHERE id=?', JSON.stringify(reqObj), id);
    helpers.audit(user, 'gift.update', id, JSON.stringify({ status: reqObj.status, payment_verified: reqObj.payment_verified }));
    return send({ gift_request: reqObj });
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
    if (body.approved) {
      review.moderation_status = 'approved';
      review.moderation_note = '';
    } else if (body.moderation_status === 'needs_edit') {
      review.moderation_status = 'needs_edit';
      review.moderation_note = body.moderation_note ? text(body.moderation_note, 300) : '';
    } else {
      review.moderation_status = 'pending';
      review.moderation_note = '';
    }
    review.moderated_at = now();
    db.run('UPDATE reviews SET data=? WHERE id=?', JSON.stringify(review), row.id);
    helpers.audit(user, 'review.moderate', row.id, JSON.stringify({ approved: review.approved, status: review.moderation_status }));
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
