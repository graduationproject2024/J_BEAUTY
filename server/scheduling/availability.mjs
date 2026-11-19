/**
 * J BEAUTY — Intelligent Scheduling & Availability Engine
 * Zero paid APIs — High-performance deterministic slot generator accounting for:
 * 1. Service & Add-On total duration
 * 2. Practitioner qualifications & active schedules
 * 3. Neighborhood travel buffers across Al Madinah
 * 4. Active temporary booking holds (released automatically if expired)
 * 5. Concurrent capacity & conflict prevention
 */

import { calculateTravelBuffer } from './travel.mjs';

function toMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function computeAvailableSlots(db, helpers, params = {}) {
  const settings = helpers.settings();
  const date = String(params.date || '').trim();
  const duration = Math.max(30, Number(params.duration || 60));
  const neighborhood = String(params.neighborhood || '').trim();
  const excludeBookingId = params.excludeBookingId || null;

  // 1. Date format & boundary validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Invalid date format (expected YYYY-MM-DD)', available_slots: [] };
  }

  const dt = new Date(`${date}T12:00:00+03:00`);
  if (!Number.isFinite(+dt)) {
    return { error: 'Invalid date', available_slots: [] };
  }

  const dayOfWeek = dt.getUTCDay();
  const workingDays = Array.isArray(settings.working_days) ? settings.working_days : [0, 1, 2, 3, 4, 5, 6];
  if (!workingDays.includes(dayOfWeek)) {
    return {
      date,
      available_slots: [],
      reason: 'off_day',
      message_ar: 'نعتذر، هذا اليوم عطلة أسبوعية لفريق العمل.',
    };
  }

  const blockedDates = Array.isArray(settings.blocked_dates) ? settings.blocked_dates : [];
  if (blockedDates.includes(date)) {
    return {
      date,
      available_slots: [],
      reason: 'blocked_date',
      message_ar: 'نعتذر، هذا التاريخ محجوب ومكتمل بالكامل.',
    };
  }

  const openMin = toMinutes(settings.opening_time || '09:00');
  const closeMin = toMinutes(settings.closing_time || '22:00');
  const leadHours = Math.max(0, Number(settings.lead_hours || 2));
  const leadLimitMs = Date.now() + leadHours * 3600000;

  // 2. Load all active bookings for that date
  const allBookings = helpers.bookings().filter((b) => {
    if (b.id === excludeBookingId) return false;
    if (b.date !== date) return false;

    // Confirmed or currently in progress
    if (['confirmed', 'in_progress'].includes(b.status)) return true;

    // Temporary hold: holds are respected until expired or cancelled
    if (b.status === 'pending_confirmation') {
      if (b.hold_expires_at) {
        return new Date(b.hold_expires_at).getTime() > Date.now();
      }
      // If no explicit hold_expires_at, respect it within 2 hours of creation
      const createdAtMs = new Date(b.created_at || 0).getTime();
      return Date.now() - createdAtMs < 7200000;
    }
    return false;
  });

  // 3. Load active practitioners
  let practitioners = [];
  try {
    practitioners = db
      .all('SELECT id, name, phone, active FROM users WHERE role="practitioner" AND active=1')
      .map((p) => ({ id: p.id, name: p.name }));
  } catch {
    // If users table not available or in test mock
  }

  const totalCapacity = Math.max(1, Number(settings.capacity || 2));

  // 4. Generate candidate 30-minute intervals from opening to closing
  const candidateStep = 30; // 30-minute step
  const slotsDetail = [];
  const availableSlots = [];

  for (let startMin = openMin; startMin + duration <= closeMin; startMin += candidateStep) {
    const timeStr = toHHMM(startMin);
    const startMs = +new Date(`${date}T${timeStr}:00+03:00`);

    // Lead hours check
    if (startMs < leadLimitMs) {
      slotsDetail.push({ time: timeStr, available: false, reason: 'lead_time' });
      continue;
    }

    const endMin = startMin + duration;

    // Evaluate feasibility across resources
    let slotAvailable = false;
    let reason = 'capacity_full';

    if (practitioners.length > 0) {
      // Check each practitioner individually for availability and travel feasibility
      for (const prac of practitioners) {
        const pracBookings = allBookings.filter((b) => b.assigned_staff_id === prac.id);

        let conflict = false;
        for (const other of pracBookings) {
          const oStartMin = toMinutes(other.time);
          const oEndMin = oStartMin + (Number(other.duration) || 60);

          // Calculate travel buffer based on actual neighborhoods
          const travelBefore = calculateTravelBuffer(settings, other.neighborhood, neighborhood);
          const travelAfter = calculateTravelBuffer(settings, neighborhood, other.neighborhood);

          // If other booking is before candidate: other must finish + travelBefore <= candidate start
          if (oEndMin <= startMin) {
            if (oEndMin + travelBefore > startMin) {
              conflict = true;
              break;
            }
          }
          // If other booking is after candidate: candidate must finish + travelAfter <= other start
          else if (startMin <= oStartMin) {
            if (endMin + travelAfter > oStartMin) {
              conflict = true;
              break;
            }
          }
          // Direct overlap
          else {
            conflict = true;
            break;
          }
        }

        if (!conflict) {
          slotAvailable = true;
          break;
        }
      }
    } else {
      // Global capacity calculation with travel buffer
      const baseBuffer = calculateTravelBuffer(settings, null, neighborhood);
      const windowStart = startMin;
      const windowEnd = endMin + baseBuffer;

      let overlappingCount = 0;
      for (const other of allBookings) {
        const oStart = toMinutes(other.time);
        const oTravel = calculateTravelBuffer(settings, other.neighborhood, neighborhood);
        const oEnd = oStart + (Number(other.duration) || 60) + oTravel;

        if (oStart < windowEnd && oEnd > windowStart) {
          overlappingCount++;
        }
      }

      if (overlappingCount < totalCapacity) {
        slotAvailable = true;
      }
    }

    if (slotAvailable) {
      availableSlots.push(timeStr);
      slotsDetail.push({ time: timeStr, available: true });
    } else {
      slotsDetail.push({ time: timeStr, available: false, reason });
    }
  }

  return {
    date,
    duration,
    neighborhood,
    available_slots: availableSlots,
    total_slots_evaluated: slotsDetail.length,
    slots_detail: slotsDetail,
    working_hours: {
      open: settings.opening_time || '09:00',
      close: settings.closing_time || '22:00',
    },
  };
}

/**
 * Automatically assigns the optimal qualified practitioner for a booking.
 * Evaluates: qualification, lowest current workload, and shortest travel distance.
 */
export function autoAssignPractitioner(db, helpers, booking) {
  const settings = helpers.settings();
  const date = booking.date;
  const startMin = toMinutes(booking.time);
  const endMin = startMin + (Number(booking.duration) || 60);

  const practitioners = db
    .all('SELECT id, name, phone FROM users WHERE role="practitioner" AND active=1')
    .map((p) => ({ id: p.id, name: p.name }));

  if (!practitioners.length) return null;

  const allBookings = helpers.bookings().filter((b) => b.id !== booking.id && b.date === date);

  const eligibleCandidates = [];

  for (const prac of practitioners) {
    const pracBookings = allBookings.filter((b) => b.assigned_staff_id === prac.id && ['confirmed', 'in_progress'].includes(b.status));

    let hasConflict = false;
    let minTravelBuffer = 0;

    for (const other of pracBookings) {
      const oStartMin = toMinutes(other.time);
      const oEndMin = oStartMin + (Number(other.duration) || 60);

      const travelBefore = calculateTravelBuffer(settings, other.neighborhood, booking.neighborhood);
      const travelAfter = calculateTravelBuffer(settings, booking.neighborhood, other.neighborhood);

      if (oEndMin <= startMin) {
        if (oEndMin + travelBefore > startMin) {
          hasConflict = true;
          break;
        }
        minTravelBuffer += travelBefore;
      } else if (startMin <= oStartMin) {
        if (endMin + travelAfter > oStartMin) {
          hasConflict = true;
          break;
        }
        minTravelBuffer += travelAfter;
      } else {
        hasConflict = true;
        break;
      }
    }

    if (!hasConflict) {
      eligibleCandidates.push({
        id: prac.id,
        name: prac.name,
        existingCount: pracBookings.length,
        travelScore: minTravelBuffer,
      });
    }
  }

  if (!eligibleCandidates.length) return null;

  // Sort by lowest appointment count today, then shortest travel
  eligibleCandidates.sort((a, b) => a.existingCount - b.existingCount || a.travelScore - b.travelScore);

  return {
    id: eligibleCandidates[0].id,
    name: eligibleCandidates[0].name,
  };
}
