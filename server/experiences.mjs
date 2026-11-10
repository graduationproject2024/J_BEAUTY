import { randomBytes } from 'node:crypto';
import { now, uid } from './db.mjs';
import { validateSchedule } from './booking.mjs';
import { fail, optionalText, phone, text, whatsappUrl } from './validation.mjs';

const ALLOWED_FUNNEL_EVENTS = new Set([
  'home_view',
  'service_view',
  'studio_complete',
  'atelier_save',
  'booking_start',
  'booking_step_2',
  'booking_step_3',
  'booking_step_4',
  'booking_step_5',
  'booking_submitted',
  'whatsapp_handoff_click',
  'group_request',
  'gift_request',
]);

function riyadhDayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function recordFunnelEvent(db, eventName) {
  if (!ALLOWED_FUNNEL_EVENTS.has(eventName)) return;
  const day = riyadhDayKey();
  db.run(
    'INSERT INTO funnel_events(day,event,count) VALUES(?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1',
    day,
    eventName,
  );
}

export function getFunnelSummary(db) {
  const rows = db.all('SELECT event, SUM(count) AS total FROM funnel_events GROUP BY event');
  const totals = {};
  for (const row of rows) totals[row.event] = Number(row.total || 0);
  return totals;
}

/**
 * Deterministic, explainable Ritual Studio recommendations strictly bound to active catalog records,
 * credential approval rules, durations, and prices.
 */
export function recommendRituals(helpers, input = {}) {
  const s = helpers.settings();
  const activeServices = helpers.services().filter((svc) => {
    if (!svc.active) return false;
    if (s.business_approved && svc.credentials_required && !svc.credentials_approved) return false;
    return true;
  });
  const activePackages = helpers.packages().filter((pkg) => {
    if (!pkg.active) return false;
    const allSvcsActive = (pkg.service_ids || []).every((id) => activeServices.some((sv) => sv.id === id));
    return allSvcsActive;
  });

  const mood = String(input.mood || 'unwind');
  const maxMinutes = Number(input.minutes_available || 120);
  const maxBudget = Number(input.budget || 600);
  const format = String(input.format || 'either');

  const moodCategories = {
    unwind: ['massage'],
    pamper: ['massage', 'nails'],
    nails: ['nails', 'gel'],
    occasion: ['gel', 'nails', 'massage'],
  };
  const preferredCats = moodCategories[mood] || ['massage', 'nails', 'gel'];

  const results = [];

  if (format !== 'package') {
    for (const svc of activeServices) {
      let score = 0;
      const reasons_ar = [];
      const reasons_en = [];

      const catRank = preferredCats.indexOf(svc.category);
      if (catRank !== -1) {
        score += 40 - catRank * 10;
        reasons_ar.push('يتناغم مع المزاج والنتيجة التي تبحثين عنها');
        reasons_en.push('Matches your desired ritual mood');
      }
      if (svc.duration <= maxMinutes) {
        score += 25;
        reasons_ar.push(`يناسب وقتكِ (${svc.duration} دقيقة)`);
        reasons_en.push(`Fits comfortably within ${svc.duration} min`);
      } else {
        score -= 20;
      }
      if (svc.price <= maxBudget) {
        score += 25;
        reasons_ar.push(`ضمن ميزانيتكِ (${svc.price} ر.س)`);
        reasons_en.push(`Within your ${maxBudget} SAR budget (${svc.price} SAR)`);
      } else {
        score -= 25;
      }
      if (svc.credentials_required && !svc.credentials_approved) {
        reasons_ar.push('ملاحظة: تتطلب اعتماد المؤهلات من الإدارة قبل التأكيد');
        reasons_en.push('Note: requires credential approval before confirmation');
      }

      results.push({
        kind: 'service',
        item: svc,
        score,
        reasons_ar,
        reasons_en,
      });
    }
  }

  if (format !== 'single') {
    for (const pkg of activePackages) {
      let score = 10;
      const reasons_ar = [];
      const reasons_en = [];

      const pkgSvcs = activeServices.filter((sv) => pkg.service_ids.includes(sv.id));
      const catHits = pkgSvcs.filter((sv) => preferredCats.includes(sv.category)).length;
      score += catHits * 18;
      if (catHits > 0) {
        reasons_ar.push('باقة تجمع عدة طقوس متوافقة مع اختياركِ');
        reasons_en.push('Combines complementary rituals aligned with your goal');
      }
      if (pkg.duration <= maxMinutes) {
        score += 22;
        reasons_ar.push(`المدة المجمعة ${pkg.duration} دقيقة ضمن وقتكِ`);
        reasons_en.push(`Total combined duration (${pkg.duration} min) fits your window`);
      } else {
        score -= 18;
      }
      if (pkg.price <= maxBudget) {
        score += 24;
        const saving = Math.max(0, pkg.original_total - pkg.price);
        reasons_ar.push(
          saving > 0
            ? `ضمن ميزانيتكِ (${pkg.price} ر.س بتوفير ${saving} ر.س)`
            : `ضمن ميزانيتكِ (${pkg.price} ر.س)`,
        );
        reasons_en.push(
          saving > 0
            ? `Within budget (${pkg.price} SAR, saving ${saving} SAR)`
            : `Within budget (${pkg.price} SAR)`,
        );
      } else {
        score -= 25;
      }

      results.push({
        kind: 'package',
        item: pkg,
        score,
        reasons_ar,
        reasons_en,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 4);
}

const VALID_SHAPES = new Set(['almond', 'square', 'squoval', 'coffin', 'natural']);
const VALID_LENGTHS = new Set(['short', 'medium', 'long']);
const VALID_FRENCH = new Set(['none', 'classic', 'micro', 'colored', 'ombre']);
const VALID_FINISH = new Set(['gloss', 'matte', 'pearl']);
const VALID_ACCENT = new Set(['none', 'gold_foil', 'floral_dot', 'pearl_dot']);

function validHex(val) {
  return typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val);
}

export function saveNailStyle(db, user, body) {
  const name = text(body.name || 'إطلالتي', 80);
  const shape = VALID_SHAPES.has(body.shape) ? body.shape : fail('Invalid nail shape');
  const length = VALID_LENGTHS.has(body.length) ? body.length : fail('Invalid nail length');
  const polishColor = validHex(body.polish_color) ? body.polish_color : fail('Invalid polish color');
  const frenchStyle = VALID_FRENCH.has(body.french_style) ? body.french_style : fail('Invalid French style');
  const tipColor = validHex(body.tip_color || '#FBF7F4') ? (body.tip_color || '#FBF7F4') : fail('Invalid tip color');
  const finish = VALID_FINISH.has(body.finish) ? body.finish : fail('Invalid finish');
  const accent = VALID_ACCENT.has(body.accent || 'none') ? (body.accent || 'none') : fail('Invalid accent');

  const id = uid();
  const shareCode = body.share ? randomBytes(4).toString('hex').toUpperCase() : null;
  const payload = {
    id,
    name,
    shape,
    length,
    polish_color: polishColor,
    french_style: frenchStyle,
    tip_color: tipColor,
    finish,
    accent,
    recommended_service_id:
      frenchStyle === 'colored'
        ? 'colored-french'
        : frenchStyle !== 'none'
          ? 'french-gel'
          : 'gel-polish',
  };

  if (user || shareCode) {
    db.run(
      'INSERT INTO nail_styles VALUES(?,?,?,?,?)',
      id,
      user?.id || null,
      shareCode,
      JSON.stringify(payload),
      now(),
    );
  }
  recordFunnelEvent(db, 'atelier_save');
  return { ...payload, share_code: shareCode, created_at: now() };
}

export function getSharedNailStyle(db, code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(clean)) fail('Style not found', 404);
  const row = db.get('SELECT data, share_code, created_at FROM nail_styles WHERE share_code=?', clean);
  if (!row) fail('Style not found', 404);
  return { ...JSON.parse(row.data), share_code: row.share_code, created_at: row.created_at };
}

export function getPassportData(db, helpers, user) {
  const favRows = db.all(
    'SELECT service_id FROM passport_favorites WHERE user_id=? ORDER BY created_at DESC',
    user.id,
  );
  const styleRows = db.all(
    'SELECT id, share_code, data, created_at FROM nail_styles WHERE user_id=? ORDER BY created_at DESC LIMIT 30',
    user.id,
  );
  const prefRow = db.get('SELECT data FROM passport_prefs WHERE user_id=?', user.id);
  const myBookings = helpers
    .bookings()
    .filter((b) => b.user_id === user.id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const lastBooking = myBookings.find((b) => b.status !== 'cancelled') || myBookings[0] || null;

  const groupReqs = db
    .all('SELECT reference, data, created_at FROM group_requests WHERE user_id=? ORDER BY created_at DESC', user.id)
    .map((r) => ({ ...JSON.parse(r.data), reference: r.reference, created_at: r.created_at }));

  const giftReqs = db
    .all('SELECT reference, data, created_at FROM gift_requests WHERE user_id=? ORDER BY created_at DESC', user.id)
    .map((r) => ({ ...JSON.parse(r.data), reference: r.reference, created_at: r.created_at }));

  return {
    favorites: favRows.map((r) => r.service_id),
    saved_styles: styleRows.map((r) => ({
      ...JSON.parse(r.data),
      id: r.id,
      share_code: r.share_code,
      created_at: r.created_at,
    })),
    preferences: prefRow
      ? JSON.parse(prefRow.data)
      : {
          preferred_neighborhood: '',
          pressure: 'medium',
          nail_finish: 'gloss',
          reminder_opt_in: false,
          scent_note: '',
        },
    last_booking: lastBooking
      ? {
          id: lastBooking.id,
          reference: lastBooking.reference,
          package_id: lastBooking.package_id || null,
          service_ids: (lastBooking.items || []).map((i) => i.id),
          neighborhood: lastBooking.neighborhood,
          items: lastBooking.items,
          total: lastBooking.total,
        }
      : null,
    group_requests: groupReqs,
    gift_requests: giftReqs,
  };
}

export function togglePassportFavorite(db, helpers, user, body) {
  const svc = helpers.services().find((s) => s.id === body.service_id && s.active);
  if (!svc) fail('Service unavailable', 404);
  if (body.action === 'remove') {
    db.run('DELETE FROM passport_favorites WHERE user_id=? AND service_id=?', user.id, svc.id);
  } else {
    db.run(
      'INSERT OR IGNORE INTO passport_favorites VALUES(?,?,?)',
      user.id,
      svc.id,
      now(),
    );
  }
  return db
    .all('SELECT service_id FROM passport_favorites WHERE user_id=? ORDER BY created_at DESC', user.id)
    .map((r) => r.service_id);
}

export function savePassportPreferences(db, helpers, user, body) {
  const areas = helpers.settings().areas || [];
  const neighborhood = optionalText(body.preferred_neighborhood, 150);
  if (neighborhood && areas.length && !areas.includes(neighborhood)) {
    fail('Neighborhood is outside configured service areas');
  }
  const pressure = ['light', 'medium', 'firm'].includes(body.pressure) ? body.pressure : 'medium';
  const nailFinish = VALID_FINISH.has(body.nail_finish) ? body.nail_finish : 'gloss';
  const prefs = {
    preferred_neighborhood: neighborhood,
    pressure,
    nail_finish: nailFinish,
    reminder_opt_in: body.reminder_opt_in === true,
    scent_note: optionalText(body.scent_note, 150),
  };
  db.run(
    'INSERT OR REPLACE INTO passport_prefs VALUES(?,?,?)',
    user.id,
    JSON.stringify(prefs),
    now(),
  );
  return prefs;
}

export function createGroupRequest(db, helpers, user, body) {
  if (body.terms !== true) fail('Accept booking terms');
  const organizerName = text(body.organizer_name, 100);
  const organizerPhone = phone(body.organizer_phone);
  if (user?.role === 'customer' && organizerPhone !== user.phone) {
    fail('Use your registered phone number');
  }
  const neighborhood = text(body.neighborhood, 150);
  const notes = optionalText(body.notes, 1000);
  const participantsRaw = body.participants;
  if (!Array.isArray(participantsRaw) || participantsRaw.length < 2 || participantsRaw.length > 5) {
    fail('Group booking requires 2 to 5 participants');
  }

  const allServices = helpers.services();
  const s = helpers.settings();
  let totalPrice = 0;
  let totalDuration = 0;

  const participants = participantsRaw.map((p, idx) => {
    const label = text(p.label || `Guest ${idx + 1}`, 60);
    if (!Array.isArray(p.service_ids) || !p.service_ids.length || p.service_ids.length > 6) {
      fail('Choose services for each participant');
    }
    const uniqueIds = [...new Set(p.service_ids)];
    const items = uniqueIds.map((id) => {
      const svc = allServices.find((x) => x.id === id && x.active);
      if (!svc) fail('Service unavailable');
      if (s.business_approved && svc.credentials_required && !svc.credentials_approved) {
        fail('Selected service requires business credential approval');
      }
      return { id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, price: svc.price, duration: svc.duration };
    });
    const subtotal = items.reduce((acc, i) => acc + i.price, 0);
    const subDuration = items.reduce((acc, i) => acc + i.duration, 0);
    totalPrice += subtotal;
    totalDuration += subDuration;
    return { label, items, subtotal, duration: subDuration };
  });

  // Check date/time rules using sequential combined duration estimate
  validateSchedule(
    helpers,
    {
      id: 'group-check',
      date: body.date,
      time: body.time,
      duration: Math.min(totalDuration, 240),
      neighborhood,
      items: participants.flatMap((p) => p.items),
    },
    false,
    true,
  );

  const id = uid();
  const reference = `JG-${randomBytes(5).toString('hex').toUpperCase()}`;
  const reqObj = {
    id,
    reference,
    user_id: user?.role === 'customer' ? user.id : null,
    organizer_name: organizerName,
    organizer_phone: organizerPhone,
    neighborhood,
    date: body.date,
    time: body.time,
    participants,
    estimated_total: totalPrice,
    estimated_duration: totalDuration,
    notes,
    status: 'pending_approval',
    created_at: now(),
  };

  db.tx(() => {
    db.run('INSERT INTO group_requests VALUES(?,?,?,?,?)', id, reference, reqObj.user_id, JSON.stringify(reqObj), reqObj.created_at);
    helpers.audit(user, 'group.request', id);
    recordFunnelEvent(db, 'group_request');
  });

  const message =
    `مرحباً J Spa 🌸\n` +
    `طلب جلسة جماعية (Beauty Together)\n` +
    `رقم الطلب: ${reference}\n` +
    `المنسّقة: ${organizerName}\n` +
    `عدد المشاركات: ${participants.length}\n` +
    `التاريخ والوقت المفضل: ${body.date} ${body.time}\n` +
    `الحي: ${neighborhood}\n` +
    `الإجمالي التقديري: ${totalPrice} ر.س\n` +
    `أرجو مراجعة توفر الفريق وتأكيد التنسيق.`;

  return { group_request: reqObj, message, whatsapp_url: whatsappUrl(s, message) };
}

export function createGiftRequest(db, helpers, user, body) {
  if (body.terms !== true) fail('Accept booking terms');
  const senderName = text(body.sender_name, 100);
  const senderPhone = phone(body.sender_phone);
  if (user?.role === 'customer' && senderPhone !== user.phone) {
    fail('Use your registered phone number');
  }
  const recipientName = text(body.recipient_name, 100);
  const personalMessage = optionalText(body.personal_message, 350);

  const pkg = body.package_id ? helpers.packages().find((p) => p.id === body.package_id && p.active) : null;
  const svc = !pkg && body.service_id ? helpers.services().find((s) => s.id === body.service_id && s.active) : null;
  if (!pkg && !svc) fail('Choose a service or package to gift');

  const chosen = pkg
    ? { kind: 'package', id: pkg.id, name_ar: pkg.name_ar, name_en: pkg.name_en, price: pkg.price }
    : { kind: 'service', id: svc.id, name_ar: svc.name_ar, name_en: svc.name_en, price: svc.price };

  const id = uid();
  const reference = `GIFT-${randomBytes(5).toString('hex').toUpperCase()}`;
  const reqObj = {
    id,
    reference,
    user_id: user?.role === 'customer' ? user.id : null,
    sender_name: senderName,
    sender_phone: senderPhone,
    recipient_name: recipientName,
    personal_message: personalMessage,
    chosen,
    estimated_amount: chosen.price,
    status: 'pending_staff_payment',
    payment_verified: false,
    redeemed: false,
    created_at: now(),
  };

  db.tx(() => {
    db.run('INSERT INTO gift_requests VALUES(?,?,?,?,?)', id, reference, reqObj.user_id, JSON.stringify(reqObj), reqObj.created_at);
    helpers.audit(user, 'gift.request', id);
    recordFunnelEvent(db, 'gift_request');
  });

  const message =
    `مرحباً J Spa 🎁\n` +
    `أرغب في طلب إهداء تجربة سبا (Gift a Ritual)\n` +
    `مرجع الطلب: ${reference}\n` +
    `من: ${senderName}\n` +
    `إلى: ${recipientName}\n` +
    `الهدية: ${chosen.name_ar}\n` +
    `القيمة التقديرية: ${chosen.price} ر.س\n` +
    `أرجو تنسيق تأكيد الإهداء والدفع يدوياً.`;

  return { gift_request: reqObj, message, whatsapp_url: whatsappUrl(helpers.settings(), message) };
}
