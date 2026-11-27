import { employeeCustomerView, hash, hashPassword, staffPublicUser, token } from '../auth.mjs';
import { DEFAULT_SETTINGS, now, uid } from '../db.mjs';
import { processRewardAction, reconcileLoyalty } from '../loyalty.mjs';
import { updateBookingAdmin } from '../booking.mjs';
import { getFunnelSummary } from '../experiences.mjs';
import {
  ASSIGNABLE_STAFF_ROLES,
  CAPABILITIES,
  OWNER_ONLY_CAPABILITIES,
  hasCapability,
  requireCapability,
} from '../authorization/permissions.mjs';
import { fail, maskPhone, money, phone, safeImageUrl, safeSocialUrl, text } from '../validation.mjs';

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

function riyadhTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function filterScopedBookings(db, helpers, user, pendingRewardBookingIds) {
  const canReadAll = hasCapability(user, 'bookings.read');
  const canReadAssigned = hasCapability(user, 'bookings.read_assigned');
  if (!canReadAll && !canReadAssigned) return [];

  let rows;
  if (!canReadAll && canReadAssigned) {
    // Practitioner strictly queries via indexed assigned_staff_id column
    rows = db.all('SELECT * FROM bookings WHERE assigned_staff_id=?', user.id).map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      reference: row.reference,
      user_id: row.user_id,
      assigned_staff_id: row.assigned_staff_id,
    }));
  } else {
    rows = helpers.bookings();
  }

  const isOwner = user.role === 'owner';
  const canFinance = hasCapability(user, 'payments.read') || hasCapability(user, 'payments.verify');
  const recentCutoff = Date.now() - 14 * 86400000;

  return rows
    .filter((b) => {
      if (isOwner) return true;
      if (!canReadAll && canReadAssigned) {
        return ['confirmed', 'in_progress', 'completed'].includes(b.status);
      }
      if (['pending_confirmation', 'confirmed', 'in_progress'].includes(b.status)) return true;
      if (b.status === 'completed' && !b.payment_verified) return true;
      if (pendingRewardBookingIds.has(b.id)) return true;
      const created = Date.parse(b.created_at || '');
      return b.status === 'completed' && Number.isFinite(created) && created >= recentCutoff;
    })
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((b) => {
      const closed = b.status === 'cancelled' || b.status === 'no_show' || (b.status === 'completed' && b.payment_verified);
      const maskNeeded = !isOwner && (closed || (!canReadAll && canReadAssigned));
      return {
        id: b.id,
        reference: b.reference,
        user_id: b.user_id,
        name: b.name,
        phone: maskNeeded ? maskPhone(b.phone) : b.phone,
        neighborhood: b.neighborhood,
        notes: !isOwner && closed ? '' : b.notes,
        internal_notes: canReadAll ? (b.internal_notes || '') : '',
        date: b.date,
        time: b.time,
        items: b.items,
        package_id: b.package_id,
        total: canReadAll || canFinance ? b.total : null,
        duration: b.duration,
        status: b.status,
        assigned_staff_id: b.assigned_staff_id || null,
        assigned_staff_name: b.assigned_staff_name || null,
        paid_amount: canFinance || isOwner ? b.paid_amount : null,
        refund_amount: canFinance || isOwner ? (b.refund_cents || 0) / 100 : null,
        payment_verified: b.payment_verified,
        payment_verified_at: b.payment_verified_at || null,
        payment_method: canFinance || isOwner ? b.payment_method : null,
        created_at: b.created_at,
      };
    });
}

export function getOpsDashboardPayload(db, helpers, user, query = {}) {
  const isOwner = user.role === 'owner';
  const currentSettings = helpers.settings();
  const allServices = helpers.services();
  const allPackages = helpers.packages();
  const todayStr = riyadhTodayStr();

  const allRewardRequests = hasCapability(user, 'loyalty.read')
    ? db.all('SELECT data FROM reward_requests').map((r) => JSON.parse(r.data))
    : [];
  const pendingRewards = allRewardRequests.filter((r) => r.status === 'pending');
  const pendingRewardBookingIds = new Set(pendingRewards.map((r) => r.booking_id).filter(Boolean));

  const scopedBookings = filterScopedBookings(db, helpers, user, pendingRewardBookingIds);
  const search = String(query.q || '').trim().toLowerCase();
  const statusFilter = String(query.status || '').trim();
  const filteredBookings = scopedBookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (!search) return true;
    return (
      String(b.reference || '').toLowerCase().includes(search) ||
      String(b.name || '').toLowerCase().includes(search) ||
      String(b.neighborhood || '').toLowerCase().includes(search) ||
      String(b.assigned_staff_name || '').toLowerCase().includes(search)
    );
  });
  const pagedBookings = paginate(filteredBookings, query.bookings_page, query.bookings_limit, isOwner ? 100 : 50);

  const canReadCustomers = hasCapability(user, 'customers.read_limited') || hasCapability(user, 'customers.verify_identity');
  const activeVerifications = hasCapability(user, 'customers.verify_identity')
    ? db.all('SELECT id,user_id,expires,used FROM verification WHERE used=0 AND expires>?', Date.now())
    : [];
  const pendingVerifySet = new Set(activeVerifications.map((v) => v.user_id));
  const customers = canReadCustomers
    ? db.all("SELECT * FROM users WHERE role='customer'").map((c) => employeeCustomerView(c, pendingVerifySet.has(c.id)))
    : [];

  const allGroups = hasCapability(user, 'occasions.read') || hasCapability(user, 'occasions.manage')
    ? db.all('SELECT reference, data, created_at FROM group_requests ORDER BY created_at DESC LIMIT 100').map((r) => ({
        ...JSON.parse(r.data),
        reference: r.reference,
        created_at: r.created_at,
        organizer_phone: isOwner
          ? JSON.parse(r.data).organizer_phone
          : JSON.parse(r.data).status === 'pending_approval'
            ? JSON.parse(r.data).organizer_phone
            : maskPhone(JSON.parse(r.data).organizer_phone),
      }))
    : [];

  const allGifts = hasCapability(user, 'gifts.verify_payment') || hasCapability(user, 'occasions.manage') || isOwner
    ? db.all('SELECT reference, data, created_at FROM gift_requests ORDER BY created_at DESC LIMIT 100').map((r) => {
        const d = JSON.parse(r.data);
        return {
          ...d,
          reference: r.reference,
          created_at: r.created_at,
          sender_phone: isOwner ? d.sender_phone : maskPhone(d.sender_phone),
        };
      })
    : [];

  const allUsersById = new Map(
    db.all('SELECT id,name,role FROM users').map((u) => [u.id, { name: u.name, role: u.role }]),
  );

  const canReadPayments = hasCapability(user, 'payments.read') || hasCapability(user, 'payments.verify');
  const allBookingsRaw = canReadPayments || isOwner || hasCapability(user, 'reports.operational') ? helpers.bookings() : [];

  const payments = canReadPayments
    ? allBookingsRaw
        .filter((b) => b.payment_verified || (b.status === 'completed' && !b.payment_verified))
        .map((b) => ({
          id: b.id,
          booking_id: b.id,
          reference: b.reference,
          customer_name: b.name,
          booking_total: b.total,
          paid_amount: b.paid_amount || 0,
          refund_amount: (b.refund_cents || 0) / 100,
          outstanding_amount: Math.max(0, Math.round((b.total * 100 - (b.paid_cents || 0))) / 100),
          net_amount: Math.max(0, (b.paid_cents || 0) - (b.refund_cents || 0)) / 100,
          payment_method: b.payment_method,
          payment_verified: b.payment_verified,
          payment_verified_at: b.payment_verified_at || null,
          service_date: b.date,
          status: b.status,
        }))
    : [];

  const refundRequests =
    hasCapability(user, 'refunds.request') || hasCapability(user, 'refunds.approve')
      ? db.all('SELECT * FROM refund_requests ORDER BY created_at DESC LIMIT 100').map((r) => ({
          ...r,
          amount: r.amount_cents / 100,
          requested_by_name: allUsersById.get(r.requested_by)?.name || r.requested_by,
          booking_reference: allBookingsRaw.find((b) => b.id === r.booking_id)?.reference || r.booking_id,
        }))
      : [];

  const ledgerLimit = Math.min(200, Math.max(1, Number(query.ledger_limit) || 50));
  const ledgerPage = Math.max(1, Number(query.ledger_page) || 1);
  const ledgerTotal = hasCapability(user, 'loyalty.read') ? db.get('SELECT COUNT(*) AS n FROM ledger').n : 0;
  const ledgerRows = hasCapability(user, 'loyalty.read')
    ? db.all('SELECT * FROM ledger ORDER BY created_at DESC LIMIT ? OFFSET ?', ledgerLimit, (ledgerPage - 1) * ledgerLimit)
    : [];

  const reviews = hasCapability(user, 'reviews.moderate')
    ? db.all('SELECT * FROM reviews').map((r) => ({ ...JSON.parse(r.data), booking_id: r.booking_id }))
    : [];

  const auditPage = Math.max(1, Number(query.audit_page) || 1);
  const auditLimit = Math.min(200, Math.max(1, Number(query.audit_limit) || 50));
  const auditTotal = hasCapability(user, 'audit.read') ? db.get('SELECT COUNT(*) AS n FROM audit').n : 0;
  const auditRows = hasCapability(user, 'audit.read')
    ? db
        .all('SELECT * FROM audit ORDER BY id DESC LIMIT ? OFFSET ?', auditLimit, (auditPage - 1) * auditLimit)
        .map((row) => {
          const actorInfo = row.actor ? allUsersById.get(row.actor) : null;
          return {
            ...row,
            actor_name: actorInfo ? `${actorInfo.name} (${actorInfo.role})` : row.actor || 'System',
          };
        })
    : [];

  const assignablePractitioners =
    hasCapability(user, 'bookings.assign') || hasCapability(user, 'calendar.read')
      ? db
          .all("SELECT id,name,role FROM users WHERE role IN ('practitioner','ops_manager','owner')")
          .map((u) => ({ id: u.id, name: u.name, role: u.role }))
      : [];

  const staffList = hasCapability(user, 'staff.manage')
    ? db.all("SELECT * FROM users WHERE role!='customer' ORDER BY created_at ASC").map(staffPublicUser)
    : [];

  const operationalOverview = {
    pending_bookings: scopedBookings.filter((b) => b.status === 'pending_confirmation').length,
    today_confirmed: scopedBookings.filter((b) => b.date === todayStr && ['confirmed', 'in_progress'].includes(b.status)).length,
    upcoming_confirmed: scopedBookings.filter((b) => b.date > todayStr && b.status === 'confirmed').length,
    completed_visits: scopedBookings.filter((b) => b.status === 'completed').length,
    unpaid_completed: canReadPayments ? allBookingsRaw.filter((b) => b.status === 'completed' && !b.payment_verified).length : 0,
    pending_rewards: pendingRewards.length,
    pending_occasions: allGroups.filter((g) => g.status === 'pending_approval').length,
    pending_refunds: refundRequests.filter((r) => r.status === 'pending').length,
    today: todayStr,
  };

  const analytics =
    isOwner || hasCapability(user, 'reports.operational') || hasCapability(user, 'reports.financial')
      ? {
          total: allBookingsRaw.length,
          pending: allBookingsRaw.filter((b) => b.status === 'pending_confirmation').length,
          confirmed: allBookingsRaw.filter((b) => b.status === 'confirmed').length,
          completed: allBookingsRaw.filter((b) => b.status === 'completed').length,
          revenue:
            isOwner || hasCapability(user, 'reports.financial')
              ? allBookingsRaw
                  .filter((b) => b.payment_verified)
                  .reduce((sum, b) => sum + ((b.paid_cents || 0) - (b.refund_cents || 0)) / 100, 0)
              : null,
          unpaid: allBookingsRaw.filter((b) => b.status === 'completed' && !b.payment_verified).length,
          points_issued: isOwner ? db.get('SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE points>0').n : null,
          points_redeemed: isOwner ? -db.get("SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE reason='reward'").n : null,
          funnel: isOwner ? getFunnelSummary(db) : null,
        }
      : {};

  return {
    actor: staffPublicUser(user),
    overview: operationalOverview,
    bookings: pagedBookings.items,
    pagination: {
      bookings: pagedBookings.meta,
      audit: { page: auditPage, limit: auditLimit, total: auditTotal, totalPages: Math.max(1, Math.ceil(auditTotal / auditLimit)) },
      ledger: { page: ledgerPage, limit: ledgerLimit, total: ledgerTotal, totalPages: Math.max(1, Math.ceil(ledgerTotal / ledgerLimit)) },
    },
    assignable_practitioners: assignablePractitioners,
    customers,
    verifications: activeVerifications,
    payments,
    refund_requests: refundRequests,
    ledger: ledgerRows,
    reward_requests: isOwner ? allRewardRequests : pendingRewards,
    group_requests: allGroups,
    gift_requests: allGifts,
    services: hasCapability(user, 'services.manage') || hasCapability(user, 'bookings.read') ? allServices : [],
    packages: hasCapability(user, 'packages.manage') || hasCapability(user, 'bookings.read') ? allPackages : [],
    schedule_config: {
      capacity: currentSettings.capacity,
      working_days: currentSettings.working_days,
      opening_time: currentSettings.opening_time,
      closing_time: currentSettings.closing_time,
      blocked_dates: currentSettings.blocked_dates,
      travel_buffer: currentSettings.travel_buffer,
      areas: currentSettings.areas,
    },
    reviews,
    settings: hasCapability(user, 'settings.manage') ? currentSettings : {},
    staff: staffList,
    audit: auditRows,
    analytics,
  };
}

export function handleOpsRoute({ db, helpers, user, route, query, body, checkRate, send, customerOrigin }) {
  if (route === '/api/ops/dashboard' && !body) {
    return send(getOpsDashboardPayload(db, helpers, user, query));
  }

  if (/^\/api\/ops\/bookings\/[^/]+$/.test(route) && body) {
    const id = route.split('/').pop();
    return send({ booking: updateBookingAdmin(db, helpers, user, id, body) });
  }

  if (route === '/api/ops/calendar/block' && body) {
    requireCapability(user, 'calendar.manage');
    const dateStr = String(body.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) fail('Invalid date');
    const s = helpers.settings();
    const blocked = new Set(s.blocked_dates || []);
    if (body.action === 'unblock') blocked.delete(dateStr);
    else blocked.add(dateStr);
    s.blocked_dates = [...blocked].sort();
    db.run('UPDATE config SET data=? WHERE id=1', JSON.stringify(s));
    helpers.audit(user, 'calendar.block_update', dateStr, JSON.stringify({ action: body.action || 'block' }));
    return send({ blocked_dates: s.blocked_dates });
  }

  if (/^\/api\/ops\/group-requests\/[^/]+$/.test(route) && body) {
    requireCapability(user, 'occasions.manage');
    const id = route.split('/').pop();
    const row = db.get('SELECT * FROM group_requests WHERE id=?', id);
    if (!row) fail('Group request not found', 404);
    const reqObj = JSON.parse(row.data);
    if (!['pending_approval', 'approved', 'cancelled'].includes(body.status)) fail('Invalid status');
    reqObj.status = body.status;
    reqObj.updated_at = now();
    db.run('UPDATE group_requests SET data=? WHERE id=?', JSON.stringify(reqObj), id);
    helpers.audit(user, 'group.update', id, JSON.stringify({ status: body.status }));
    return send({ group_request: reqObj });
  }

  if (/^\/api\/ops\/gift-requests\/[^/]+$/.test(route) && body) {
    if (typeof body.payment_verified === 'boolean' || body.status === 'redeemed') {
      requireCapability(user, 'gifts.verify_payment');
    } else {
      requireCapability(user, 'occasions.manage');
    }
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

  if (route === '/api/ops/verify' && body) {
    requireCapability(user, 'customers.verify_identity');
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

  if (route === '/api/ops/recovery' && body) {
    requireCapability(user, 'customers.recovery_token');
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
    const resetUrl = `${customerOrigin || ''}/ar/reset#${resetToken}`;
    return send({
      token: resetToken,
      reset_url: resetUrl,
      expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
    });
  }

  if (route === '/api/ops/refunds/request' && body) {
    requireCapability(user, 'refunds.request');
    const b = helpers.bookings().find((x) => x.id === body.booking_id);
    if (!b) fail('Booking not found', 404);
    if (!b.payment_verified) fail('Cannot refund an unverified payment');
    const reqCents = money(body.amount);
    if (reqCents <= 0 || (b.refund_cents || 0) + reqCents > b.paid_cents) {
      fail('Refund request exceeds remaining refundable payment');
    }
    const reason = text(body.reason, 500);
    const id = uid();
    db.tx(() => {
      db.run(
        'INSERT INTO refund_requests(id,booking_id,requested_by,amount_cents,reason,status,created_at) VALUES(?,?,?,?,?,?,?)',
        id,
        b.id,
        user.id,
        reqCents,
        reason,
        'pending',
        now(),
      );
      helpers.audit(user, 'refund.request', id, JSON.stringify({ booking_id: b.id, amount: reqCents / 100, reason }));
    });
    return send({ refund_request: { id, booking_id: b.id, amount: reqCents / 100, reason, status: 'pending' } }, 201);
  }

  if (/^\/api\/ops\/refunds\/[^/]+\/decide$/.test(route) && body) {
    requireCapability(user, 'refunds.approve');
    const id = route.split('/')[4];
    const decision = String(body.decision || '').trim();
    if (!['approve', 'reject'].includes(decision)) fail('Invalid refund decision');
    const out = db.tx(() => {
      const reqRow = db.get('SELECT * FROM refund_requests WHERE id=?', id);
      if (!reqRow) fail('Refund request not found', 404);
      if (reqRow.status !== 'pending') fail('Refund request already processed', 409);

      if (decision === 'approve') {
        const b = helpers.bookings().find((x) => x.id === reqRow.booking_id);
        if (!b || !b.payment_verified) fail('Verified booking payment required');
        const nextRefund = (b.refund_cents || 0) + reqRow.amount_cents;
        if (nextRefund > b.paid_cents) fail('Refund exceeds verified paid amount');
        b.refund_cents = nextRefund;
        b.refund_updated_at = now();
        reconcileLoyalty(db, helpers, b);
        helpers.saveBooking(b);
      }

      db.run(
        'UPDATE refund_requests SET status=?, decided_by=?, decided_at=? WHERE id=?',
        decision === 'approve' ? 'approved' : 'rejected',
        user.id,
        now(),
        id,
      );
      helpers.audit(user, `refund.${decision}`, id, JSON.stringify({ booking_id: reqRow.booking_id, amount: reqRow.amount_cents / 100 }));
      return { id, status: decision === 'approve' ? 'approved' : 'rejected' };
    });
    return send({ refund_request: out });
  }

  if (/^\/api\/ops\/rewards\/[^/]+$/.test(route) && body) {
    requireCapability(user, 'loyalty.redeem');
    const id = route.split('/').pop();
    return send({ reward_request: processRewardAction(db, helpers, user, id, body) });
  }

  if (/^\/api\/ops\/reviews\/[^/]+$/.test(route) && body) {
    requireCapability(user, 'reviews.moderate');
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

  if (route === '/api/ops/services' && body) {
    requireCapability(user, 'services.manage');
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

  if (route === '/api/ops/packages' && body) {
    requireCapability(user, 'packages.manage');
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

  if (route === '/api/ops/settings' && body) {
    requireCapability(user, 'settings.manage');
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

  if (route === '/api/ops/staff' && body) {
    requireCapability(user, 'staff.manage');
    if (!ASSIGNABLE_STAFF_ROLES.includes(body.role)) {
      fail(`Valid assignable staff role required: ${ASSIGNABLE_STAFF_ROLES.join(', ')}`);
    }
    const p = phone(body.phone);
    if (db.get('SELECT id FROM users WHERE phone=?', p)) fail('Phone already in use', 409);
    const id = uid();
    db.run(
      'INSERT INTO users(id,name,phone,password,role,verified,created_at) VALUES(?,?,?,?,?,?,?)',
      id,
      text(body.name, 100),
      p,
      hashPassword(body.password),
      body.role,
      1,
      now(),
    );
    helpers.audit(user, 'staff.create', id, JSON.stringify({ role: body.role }));
    return send({ ok: true, id, role: body.role }, 201);
  }

  if (/^\/api\/ops\/staff\/[^/]+$/.test(route) && body) {
    requireCapability(user, 'staff.manage');
    const id = route.split('/').pop();
    const target = db.get("SELECT * FROM users WHERE id=? AND role NOT IN ('customer','owner')", id);
    if (!target) fail('Staff account not found', 404);

    if (body.action === 'disable') {
      db.tx(() => {
        db.run('UPDATE users SET role=?, updated_at=? WHERE id=?', 'disabled_employee', now(), id);
        db.run('DELETE FROM sessions WHERE user_id=?', id);
        helpers.audit(user, 'staff.disable', id);
      });
      return send({ ok: true });
    }

    if (body.action === 'enable') {
      const nextRole = ASSIGNABLE_STAFF_ROLES.includes(body.role) ? body.role : 'legacy_employee';
      db.tx(() => {
        db.run('UPDATE users SET role=?, updated_at=? WHERE id=?', nextRole, now(), id);
        helpers.audit(user, 'staff.enable', id, JSON.stringify({ role: nextRole }));
      });
      return send({ ok: true, role: nextRole });
    }

    if (body.action === 'reset_mfa') {
      db.tx(() => {
        db.run(
          'UPDATE users SET mfa_enabled=0, mfa_secret_enc=NULL, mfa_recovery_hashes=NULL, updated_at=? WHERE id=?',
          now(),
          id,
        );
        db.run('DELETE FROM sessions WHERE user_id=?', id);
        helpers.audit(user, 'staff.mfa_reset', id);
      });
      return send({ ok: true });
    }

    if (body.role !== undefined || body.permissions !== undefined) {
      const nextRole = body.role !== undefined
        ? (ASSIGNABLE_STAFF_ROLES.includes(body.role) ? body.role : fail('Invalid assignable staff role'))
        : target.role;

      let permStr = target.permissions_json;
      if (body.permissions !== undefined) {
        const grant = Array.isArray(body.permissions?.grant)
          ? body.permissions.grant.filter((c) => CAPABILITIES.includes(c) && !OWNER_ONLY_CAPABILITIES.has(c))
          : [];
        const revoke = Array.isArray(body.permissions?.revoke)
          ? body.permissions.revoke.filter((c) => CAPABILITIES.includes(c))
          : [];
        permStr = JSON.stringify({ grant, revoke });
      }

      db.tx(() => {
        db.run('UPDATE users SET role=?, permissions_json=?, updated_at=? WHERE id=?', nextRole, permStr, now(), id);
        // Immediately revoke active staff sessions on role or permission change so least privilege takes effect right away
        db.run('DELETE FROM sessions WHERE user_id=?', id);
        helpers.audit(user, 'staff.permissions_update', id, JSON.stringify({ role: nextRole }));
      });
      return send({ ok: true, role: nextRole });
    }

    fail('Invalid staff action');
  }

  if (route === '/api/ops/adjustment' && body) {
    requireCapability(user, 'loyalty.adjust');
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
