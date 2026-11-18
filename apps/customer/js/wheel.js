// J Beauty Spa — Smart Periodic & Ops-Controlled Wheel of Rewards
// Official brand palette: #D9B7C0, #C9AEB6, #A7B79F, #D4AF7C, #EDE6E1, #6B6464

import { state, t, toast, href, esc } from './state.js';
import { openDialog } from './components.js';

export const DEFAULT_WHEEL_PRIZES = [
  { id: 'jb5', title_ar: 'خصم 5%', title_en: '5% OFF', desc_ar: 'خصم 5% ترحيبي على جلستك القادمة', desc_en: '5% welcome discount on your next visit', code: 'JB5', discount_type: 'percent', value: 5, color: '#D9B7C0', textColor: '#3E2932' },
  { id: 'jb7', title_ar: 'خصم 7%', title_en: '7% OFF', desc_ar: 'خصم 7% لطيف على خدمات السبا والأظافر', desc_en: '7% off spa & nail rituals', code: 'JB7', discount_type: 'percent', value: 7, color: '#D4AF7C', textColor: '#FFFFFF' },
  { id: 'jbsar10', title_ar: 'خصم 10 ريال', title_en: '10 SAR OFF', desc_ar: 'خصم 10 ريال فوري على حجزك', desc_en: '10 SAR instant savings on your booking', code: 'JBSAR10', discount_type: 'fixed', value: 10, color: '#A7B79F', textColor: '#FFFFFF' },
  { id: 'jb10', title_ar: 'خصم 10%', title_en: '10% OFF', desc_ar: 'الجائزة الكبرى: خصم 10% على الباقات والخدمات', desc_en: 'Grand Prize: 10% off rituals & packages', code: 'JB10', discount_type: 'percent', value: 10, color: '#C9AEB6', textColor: '#3E2932' },
  { id: 'jbsar15', title_ar: 'خصم 15 ريال', title_en: '15 SAR OFF', desc_ar: 'خصم 15 ريال فوري للطلبات فوق 180 ريال', desc_en: '15 SAR off bookings over 180 SAR', code: 'JBSAR15', discount_type: 'fixed', value: 15, color: '#EDE6E1', textColor: '#3E2932' },
  { id: 'jbpetals20', title_ar: '20 بتلة هدية', title_en: '20 Bonus Petals', desc_ar: 'قسيمة تعادل 20 بتلة خصم فوري', desc_en: 'Instant voucher worth 20 Petals', code: 'JBPETALS20', discount_type: 'fixed', value: 10, color: '#D4AF7C', textColor: '#FFFFFF' },
];

export function getWheelPrizes() {
  const configured = state.catalog?.settings?.wheel_prizes;
  if (Array.isArray(configured) && configured.length >= 2) {
    return configured;
  }
  return DEFAULT_WHEEL_PRIZES;
}

export function isWheelEligible() {
  const s = state.catalog?.settings || {};
  if (s.wheel_enabled === false) return false;

  try {
    const lastSpinRaw = localStorage.getItem('jbeauty_wheel_last_spin');
    if (!lastSpinRaw) return true; // First visit: eligible!

    if (s.wheel_first_visit_only === true) {
      return false;
    }

    const lastSpinMs = Number(lastSpinRaw);
    const cooldownDays = Math.max(1, Number(s.wheel_cooldown_days || 14));
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    return Date.now() - lastSpinMs >= cooldownMs;
  } catch {
    return true;
  }
}

export function isWheelVisible() {
  return isWheelEligible();
}

let currentRotation = 0;
let isSpinning = false;

export function drawWheel(canvas, rotationAngle = 0) {
  if (!canvas) return;
  const prizes = getWheelPrizes();
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = cx - 12;

  ctx.clearRect(0, 0, w, h);

  const numSlices = prizes.length;
  const arcSize = (Math.PI * 2) / numSlices;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationAngle);

  for (let i = 0; i < numSlices; i++) {
    const angle = i * arcSize;
    const prize = prizes[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle, angle + arcSize);
    ctx.closePath();

    ctx.fillStyle = prize.color || '#D9B7C0';
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.save();
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = prize.textColor || '#3E2932';
    ctx.font = 'bold 14px "IBM Plex Sans Arabic", "Noto Naskh Arabic", sans-serif';
    ctx.fillText(t(prize.title_ar, prize.title_en), radius - 22, 0);
    ctx.restore();
  }

  // Outer rose-gold rim
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#D4AF7C';
  ctx.stroke();

  for (let i = 0; i < numSlices * 3; i++) {
    const a = (i * Math.PI * 2) / (numSlices * 3);
    const sx = Math.cos(a) * (radius - 2.5);
    const sy = Math.sin(a) * (radius - 2.5);
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
  }

  ctx.restore();

  // Center hub
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#FAF7F5';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#D4AF7C';
  ctx.stroke();

  ctx.fillStyle = '#3E2932';
  ctx.font = 'bold 13px "IBM Plex Sans Arabic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J Spa', 0, 0);
  ctx.restore();

  // Top pointer
  ctx.save();
  ctx.translate(cx, 16);
  ctx.beginPath();
  ctx.moveTo(-14, -6);
  ctx.lineTo(14, -6);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fillStyle = '#D4AF7C';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3E2932';
  ctx.stroke();
  ctx.restore();
}

export function openRewardsWheelDialog() {
  const s = state.catalog?.settings || {};
  if (s.wheel_enabled === false) {
    toast(t('عجلة المكافآت غير متاحة حالياً.', 'Rewards wheel is currently paused.'));
    return;
  }

  const eligible = isWheelEligible();
  let savedPrize = null;
  try {
    const raw = localStorage.getItem('jbeauty_wheel_prize');
    if (raw) savedPrize = JSON.parse(raw);
  } catch {}

  openDialog(`
    <div class="wheel-modal-shell">
      <div style="text-align:center;margin-bottom:16px">
        <span class="eyebrow" style="color:var(--rose-gold-deep)">✦ ${t('هدية الزيارة الأولى والعروض الدورية', 'EXCLUSIVE PERIODIC REWARDS')} ✦</span>
        <h2 style="margin:4px 0 6px;color:var(--plum);font-size:24px">${t('عجلة مكافآت J Beauty Spa 🌸', 'J Beauty Spa Wheel of Rewards 🌸')}</h2>
        <p class="muted" style="margin:0;font-size:14px">${t('دوري العجلة لفرصة ربح كود خصم لطيف لجلستك المنزلية القادمة.', 'Spin the wheel for a special promo code on your upcoming home session.')}</p>
      </div>

      <div class="wheel-stage-container" style="position:relative;display:flex;justify-content:center;align-items:center;margin:16px auto 20px">
        <canvas id="rewards-wheel-canvas" width="340" height="340" style="max-width:100%;height:auto;filter:drop-shadow(0 8px 24px rgba(62,41,50,0.14))"></canvas>
      </div>

      <div id="wheel-action-area" style="text-align:center">
        ${
          !eligible && savedPrize
            ? `
              <div class="card" style="background:var(--cream-bg);border:1.5px solid var(--rose-gold);padding:16px 20px;border-radius:var(--r-md);margin-bottom:14px">
                <span class="badge" style="background:var(--sage-green);color:#fff;margin-bottom:6px">${t('جائزتك الفعالة', 'Your Active Prize')}</span>
                <h3 style="margin:4px 0;color:var(--plum)">${esc(t(savedPrize.title_ar, savedPrize.title_en))}</h3>
                <p class="muted" style="margin:0 0 10px;font-size:14px">${esc(t(savedPrize.desc_ar, savedPrize.desc_en))}</p>
                <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
                  <div style="font-size:17px;font-weight:700;letter-spacing:1px;padding:6px 14px;background:#fff;border:1px dashed var(--rose-gold);border-radius:var(--r-sm);color:var(--plum)">${esc(savedPrize.code)}</div>
                  <button type="button" class="btn small" id="copy-wheel-code-btn">${t('نسخ الكود', 'Copy Code')}</button>
                  <button type="button" class="btn small sage" id="apply-wheel-booking-btn">${t('تطبيق في الحجز', 'Use in Booking')}</button>
                </div>
              </div>
              <p class="muted" style="font-size:13px;margin:0">${t('يمكنك تدوير العجلة مجدداً في العرض الدوري القادم.', 'You can spin again during the next periodic reward window.')}</p>
            `
            : `
              <button type="button" class="btn shimmer-btn" id="spin-wheel-btn" style="min-width:220px;font-size:16px;padding:13px 28px;box-shadow:var(--shadow-gold)">
                ${t('تدوير العجلة الآن ✦', 'Spin the Wheel ✦')}
              </button>
            `
        }
      </div>
    </div>
  `);

  const canvas = document.querySelector('#rewards-wheel-canvas');
  drawWheel(canvas, currentRotation);
  const actionArea = document.querySelector('#wheel-action-area');

  const setupPrizeActions = (prize) => {
    document.querySelector('#copy-wheel-code-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(prize.code);
        toast(t('تم نسخ كود الخصم: ' + prize.code, 'Coupon copied: ' + prize.code));
      } catch {
        toast(prize.code);
      }
    });

    document.querySelector('#apply-wheel-booking-btn')?.addEventListener('click', () => {
      state.draft.coupon_code = prize.code;
      state.draft.coupon = {
        code: prize.code,
        discount_type: prize.discount_type,
        value: prize.value,
        name: prize.title_ar,
      };
      document.querySelector('#modal')?.close();
      toast(t('تم تفعيل كود الخصم في حجزك 🌸', 'Coupon activated in your booking 🌸'));
      history.pushState({}, '', href('booking'));
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  };

  if (!eligible && savedPrize) {
    setupPrizeActions(savedPrize);
  }

  const startSpin = () => {
    if (isSpinning) return;
    const prizes = getWheelPrizes();
    isSpinning = true;
    const currentBtn = document.querySelector('#spin-wheel-btn');
    if (currentBtn) currentBtn.disabled = true;

    const prizeIndex = Math.floor(Math.random() * prizes.length);
    const winningPrize = prizes[prizeIndex];

    const numSlices = prizes.length;
    const arcSize = (Math.PI * 2) / numSlices;
    const targetSliceCenter = (prizeIndex + 0.5) * arcSize;
    const desiredFinalAngle = Math.PI * 1.5 - targetSliceCenter;
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * (Math.PI * 2);

    const initialRotation = currentRotation;
    const startAngle = initialRotation % (Math.PI * 2);
    const totalRotationNeeded = extraRotations + (desiredFinalAngle - startAngle);

    const duration = 3800;
    const startTime = performance.now();
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

    const animateSpin = (nowTs) => {
      const elapsed = nowTs - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      currentRotation = initialRotation + totalRotationNeeded * eased;
      drawWheel(canvas, currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        isSpinning = false;
        try {
          localStorage.setItem('jbeauty_wheel_prize', JSON.stringify(winningPrize));
          localStorage.setItem('jbeauty_wheel_last_spin', String(Date.now()));
        } catch {}
        syncWheelFloatingVisibility();
        toast(t('مبروك! فزت بـ ' + winningPrize.title_ar + ' 🌸', 'Congratulations! You won ' + winningPrize.title_en + ' 🌸'));

        if (actionArea) {
          actionArea.innerHTML = `
            <div class="card" style="background:var(--cream-bg);border:1.5px solid var(--rose-gold);padding:18px 20px;border-radius:var(--r-md);margin-bottom:10px">
              <span class="badge" style="background:var(--sage-green);color:#fff;margin-bottom:6px">🎉 ${t('مبروك! فزت معنا', 'Congratulations!')}</span>
              <h3 style="margin:4px 0;color:var(--plum);font-size:20px">${esc(t(winningPrize.title_ar, winningPrize.title_en))}</h3>
              <p class="muted" style="margin:0 0 12px;font-size:14px">${esc(t(winningPrize.desc_ar, winningPrize.desc_en))}</p>
              <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
                <div style="font-size:18px;font-weight:700;letter-spacing:1px;padding:6px 16px;background:#fff;border:1px dashed var(--rose-gold);border-radius:var(--r-sm);color:var(--plum)">${esc(winningPrize.code)}</div>
                <button type="button" class="btn small" id="copy-wheel-code-btn">${t('نسخ الكود', 'Copy Code')}</button>
                <button type="button" class="btn small sage" id="apply-wheel-booking-btn">${t('تطبيق في الحجز', 'Use in Booking')}</button>
              </div>
            </div>
          `;
          setupPrizeActions(winningPrize);
        }
      }
    };

    requestAnimationFrame(animateSpin);
  };

  document.querySelector('#spin-wheel-btn')?.addEventListener('click', startSpin);
}

export function syncWheelFloatingVisibility() {
  const existing = document.querySelector('#wheel-floating-btn');
  if (!isWheelVisible()) {
    existing?.remove();
    return;
  }
  if (!existing) {
    const btnHtml = `
      <button id="wheel-floating-btn" class="wheel-floating-btn" type="button" aria-label="${t('عجلة مكافآت J Beauty Spa', 'J Beauty Spa Wheel of Rewards')}">
        <span class="wheel-btn-icon">🎁</span>
        <span class="wheel-btn-label">${t('هدية زيارتك', 'Welcome Gift')}</span>
      </button>
    `;
    document.body.insertAdjacentHTML('beforeend', btnHtml);
    document.querySelector('#wheel-floating-btn')?.addEventListener('click', () => {
      openRewardsWheelDialog();
    });
  }
}

export function initWheelFloatingButton() {
  syncWheelFloatingVisibility();
}
