import { uid } from './db.mjs';
import { fail } from './validation.mjs';

/**
 * Reconciles loyalty points for a booking.
 * Points are strictly awarded only when:
 * 1) The booking belongs to a registered AND staff-verified customer
 * 2) Booking status === 'completed'
 * 3) Payment is verified by staff (payment_verified === true)
 * Refunds adjust points proportionally, rolling back atomically if balance would turn negative.
 */
export function reconcileLoyalty(db, helpers, booking) {
  if (!booking.user_id) return;
  const user = db.get('SELECT * FROM users WHERE id=?', booking.user_id);
  if (!user?.verified) return;

  const prior = db.get(
    "SELECT COALESCE(SUM(points),0) AS n FROM ledger WHERE booking_id=? AND reason IN ('visit','visit adjustment')",
    booking.id,
  ).n;

  const eligible = booking.status === 'completed' && booking.payment_verified;
  const netCents = Math.max(0, booking.paid_cents - (booking.refund_cents || 0));
  const target = eligible ? Math.floor((netCents * booking.points_rate) / 100) : 0;
  const delta = target - prior;

  if (!delta) return;

  if (helpers.balance(booking.user_id) + delta < 0) {
    fail(
      'Refund requires owner resolution: points were already redeemed. Reverse the related reward first.',
      409,
    );
  }

  helpers.recordLedger(
    booking.user_id,
    booking.id,
    delta,
    `visit:${booking.id}:${uid()}`,
    prior ? 'visit adjustment' : 'visit',
  );
}

export function requestReward(db, helpers, user, rewardId) {
  if (!user.verified) fail('Phone verification required', 403);
  const reward = helpers.settings().rewards.find((r) => r.id === rewardId);
  if (!reward) fail('Reward unavailable');

  return db.tx(() => {
    if (helpers.balance(user.id) < reward.points) fail('Not enough points');
    const hasPending = db
      .all('SELECT data FROM reward_requests WHERE user_id=?', user.id)
      .some((row) => JSON.parse(row.data).status === 'pending');
    if (hasPending) fail('A reward request is already pending', 409);

    const request = {
      id: uid(),
      user_id: user.id,
      reward_id: reward.id,
      points: reward.points,
      value: reward.value,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    db.run('INSERT INTO reward_requests VALUES(?,?,?)', request.id, user.id, JSON.stringify(request));
    helpers.audit(user, 'reward.request', request.id);
    return request;
  });
}

export function processRewardAction(db, helpers, actorUser, rewardRequestId, body) {
  return db.tx(() => {
    const row = db.get('SELECT * FROM reward_requests WHERE id=?', rewardRequestId);
    if (!row) fail('Reward not found', 404);
    const reqObj = JSON.parse(row.data);

    if (body.action === 'cancel') {
      if (reqObj.status === 'cancelled') fail('Already cancelled', 409);
      if (reqObj.status === 'committed') {
        const b = helpers.bookings().find((x) => x.id === reqObj.booking_id);
        if (!b) fail('Booking not found', 404);
        if (b.payment_verified || b.status === 'completed') {
          fail('Cannot cancel an applied reward after payment');
        }
        helpers.recordLedger(
          reqObj.user_id,
          b.id,
          reqObj.points,
          `reward-cancel:${reqObj.id}`,
          'reward cancellation',
        );
        b.total = Math.round((b.total + reqObj.value) * 100) / 100;
        delete b.reward_id;
        helpers.saveBooking(b);
      }
      reqObj.status = 'cancelled';
    } else if (body.action === 'commit') {
      if (reqObj.status !== 'pending') fail('Reward is no longer pending', 409);
      const b = helpers.bookings().find((x) => x.id === body.booking_id);
      if (!b) fail('Booking not found', 404);
      const customer = db.get('SELECT * FROM users WHERE id=?', reqObj.user_id);
      if (
        !customer?.verified ||
        b.user_id !== reqObj.user_id ||
        !['pending_confirmation', 'confirmed'].includes(b.status) ||
        b.reward_id ||
        b.payment_verified
      ) {
        fail('Reward requires an eligible owned unpaid booking');
      }
      if (helpers.balance(reqObj.user_id) < reqObj.points || b.total < reqObj.value) {
        fail('Insufficient points or booking value');
      }
      helpers.recordLedger(
        reqObj.user_id,
        b.id,
        -reqObj.points,
        `reward:${reqObj.id}`,
        'reward',
      );
      b.total = Math.round((b.total - reqObj.value) * 100) / 100;
      b.reward_id = reqObj.id;
      helpers.saveBooking(b);
      reqObj.status = 'committed';
      reqObj.booking_id = b.id;
    } else {
      fail('Invalid action');
    }

    db.run('UPDATE reward_requests SET data=? WHERE id=?', JSON.stringify(reqObj), reqObj.id);
    helpers.audit(actorUser, `reward.${body.action}`, reqObj.id);
    return reqObj;
  });
}

