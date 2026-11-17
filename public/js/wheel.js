// J Beauty Spa — Interactive Wheel of Rewards (عجلة مكافآت J Beauty Spa)
// Official brand colors: #D9B7C0 (Dusty Pink), #C9AEB6 (Mauve Pink), #A7B79F (Sage Green), #D4AF7C (Rose Gold)

import { state, t, toast, href, esc } from './state.js';
import { openDialog } from './components.js';

export const WHEEL_PRIZES = [
  {
    id: 'spawheel10',
    title_ar: 'خصم 10%',
    title_en: '10% OFF',
    desc_ar: 'خصم 10% على جميع باقات وخدمات السبا',
    desc_en: '10% off all rituals and packages',
    code: 'SPAWHEEL10',
    discount_type: 'percent',
    value: 10,
    color: '#D9B7C0',
    textColor: '#3E2932',
  },
  {
    id: 'luxury15',
    title_ar: 'خصم 15%',
    title_en: '15% OFF',
    desc_ar: 'خصم 15% فاخر على الباقات المتناغمة',
    desc_en: '15% off curated spa packages',
    code: 'LUXURY15',
    discount_type: 'percent',
    value: 15,
    color: '#D4AF7C',
    textColor: '#FFFFFF',
  },
  {
    id: 'petal20',
    title_ar: 'خصم 20 ريال',
    title_en: '20 SAR OFF',
    desc_ar: 'خصم 20 ريال فوري على موعدك القادم',
    desc_en: '20 SAR instant deduction on your booking',
    code: 'PETAL20',
    discount_type: 'fixed',
    value: 20,
    color: '#A7B79F',
    textColor: '#FFFFFF',
  },
  {
    id: 'freemask',
    title_ar: 'ماسك مجاني',
    title_en: 'Free Mask',
    desc_ar: 'ماسك ترطيب فاخر لليدين أو القدمين مجاناً',
    desc_en: 'Complimentary luxury nourishing mask',
    code: 'FREEMASK',
    discount_type: 'fixed',
    value: 35,
    color: '#C9AEB6',
    textColor: '#3E2932',
  },
  {
    id: 'petals50',
    title_ar: '50 بتلة إضافية',
    title_en: '50 Petals',
    desc_ar: '50 نقطة ولاء بتلات تُضاف إلى رصيدك',
    desc_en: '50 bonus loyalty petals added to account',
    code: 'PETALS50',
    discount_type: 'fixed',
    value: 25,
    color: '#EAD9CA',
    textColor: '#3E2932',
  },
  {
    id: 'welcome10',
    title_ar: 'كوبون ترحيبي 10%',
    title_en: 'Welcome 10%',
    desc_ar: 'كوبون ترحيبي 10% لك ولصديقتك',
    desc_en: '10% welcome bonus for you and a friend',
    code: 'WELCOME10',
    discount_type: 'percent',
    value: 10,
    color: '#D4AF7C',
    textColor: '#FFFFFF',
  },
];

let currentRotation = 0;
let isSpinning = false;

export function drawWheel(canvas, rotationAngle = 0) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = cx - 12;

  ctx.clearRect(0, 0, w, h);

  const numSlices = WHEEL_PRIZES.length;
  const arcSize = (Math.PI * 2) / numSlices;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotationAngle);

  // Draw slices
  for (let i = 0; i < numSlices; i++) {
    const angle = i * arcSize;
    const prize = WHEEL_PRIZES[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, angle, angle + arcSize);
    ctx.closePath();

    ctx.fillStyle = prize.color;
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    // Draw prize text
    ctx.save();
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = prize.textColor;
    ctx.font = 'bold 15px "IBM Plex Sans Arabic", "Noto Naskh Arabic", sans-serif';
    ctx.fillText(t(prize.title_ar, prize.title_en), radius - 24, 0);
    ctx.restore();
  }

  // Outer gold rim
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#D4AF7C';
  ctx.stroke();

  // Subtle studs on rim
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

  // Center hub & logo bloom
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

  // Pointer indicator at the top
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
  const existingPrize = localStorage.getItem('jbeauty_wheel_prize');
  let savedPrize = null;
  if (existingPrize) {
    try {
      savedPrize = JSON.parse(existingPrize);
    } catch {}
  }

  openDialog(`
    <div class="wheel-modal-shell">
      <div style="text-align:center;margin-bottom:16px">
        <span class="eyebrow" style="color:var(--rose-gold-deep)">✦ ${t('مكافآت حصرية', 'EXCLUSIVE REWARDS')} ✦</span>
        <h2 style="margin:4px 0 6px;color:var(--plum);font-size:24px">${t('عجلة مكافآت J Beauty Spa 🌸', 'J Beauty Spa Wheel of Rewards 🌸')}</h2>
        <p class="muted" style="margin:0;font-size:14px">${t('دوّري العجلة واحصلي على كود خصم فوري أو هدية مميزة لجلستك القادمة!', 'Spin the wheel for an instant promo discount or luxury gift on your next session!')}</p>
      </div>

      <div class="wheel-stage-container" style="position:relative;display:flex;justify-content:center;align-items:center;margin:16px auto 20px">
        <canvas id="rewards-wheel-canvas" width="340" height="340" style="max-width:100%;height:auto;filter:drop-shadow(0 8px 24px rgba(62,41,50,0.14))"></canvas>
      </div>

      <div id="wheel-action-area" style="text-align:center">
        ${
          savedPrize
            ? `
              <div class="card" style="background:var(--blush-tint);border:1.5px solid var(--rose-gold);padding:16px 20px;border-radius:var(--r-md);margin-bottom:14px">
                <span class="badge" style="background:var(--sage);color:#fff;margin-bottom:6px">${t('جائزتك المحفوظة', 'Your Saved Prize')}</span>
                <h3 style="margin:4px 0;color:var(--plum)">${esc(t(savedPrize.title_ar, savedPrize.title_en))}</h3>
                <p class="muted" style="margin:0 0 10px;font-size:14px">${esc(t(savedPrize.desc_ar, savedPrize.desc_en))}</p>
                <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
                  <div style="font-size:17px;font-weight:700;letter-spacing:1px;padding:6px 14px;background:#fff;border:1px dashed var(--rose-gold);border-radius:var(--r-sm)">${esc(savedPrize.code)}</div>
                  <button type="button" class="btn small" id="copy-wheel-code-btn">${t('نسخ الكود', 'Copy Code')}</button>
                  <button type="button" class="btn small sage" id="apply-wheel-booking-btn">${t('استخدام في الحجز', 'Book with Code')}</button>
                </div>
              </div>
              <button type="button" class="btn light small" id="spin-wheel-btn">${t('تدوير العجلة مجدداً ↻', 'Spin Again ↻')}</button>
            `
            : `
              <button type="button" class="btn" id="spin-wheel-btn" style="min-width:200px;font-size:16px;padding:12px 28px;box-shadow:var(--shadow-gold)">
                ${t('تدوير العجلة الآن ✦', 'Spin the Wheel ✦')}
              </button>
            `
        }
      </div>
    </div>
  `);

  const canvas = document.querySelector('#rewards-wheel-canvas');
  drawWheel(canvas, currentRotation);

  const spinBtn = document.querySelector('#spin-wheel-btn');
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

  if (savedPrize) {
    setupPrizeActions(savedPrize);
  }

  const startSpin = () => {
    if (isSpinning) return;
    isSpinning = true;
    const currentBtn = document.querySelector('#spin-wheel-btn');
    if (currentBtn) currentBtn.disabled = true;

    // Pick random prize
    const prizeIndex = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const winningPrize = WHEEL_PRIZES[prizeIndex];

    const numSlices = WHEEL_PRIZES.length;
    const arcSize = (Math.PI * 2) / numSlices;

    // Pointer is at top (3*PI/2 in canvas coordinate system)
    const targetSliceCenter = (prizeIndex + 0.5) * arcSize;
    const desiredFinalAngle = (Math.PI * 1.5) - targetSliceCenter;
    const extraRotations = (5 + Math.floor(Math.random() * 3)) * (Math.PI * 2);

    const initialRotation = currentRotation;
    const startAngle = initialRotation % (Math.PI * 2);
    const totalRotationNeeded = extraRotations + (desiredFinalAngle - startAngle);

    const duration = 4200;
    const startTime = performance.now();
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      currentRotation = initialRotation + totalRotationNeeded * eased;
      drawWheel(canvas, currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        isSpinning = false;
        localStorage.setItem('jbeauty_wheel_prize', JSON.stringify(winningPrize));
        toast(t('مبروك! فزت بـ ' + winningPrize.title_ar + ' 🌸', 'Congratulations! You won ' + winningPrize.title_en + ' 🌸'));

        if (actionArea) {
          actionArea.innerHTML = `
            <div class="card" style="background:var(--blush-tint);border:1.5px solid var(--rose-gold);padding:18px 20px;border-radius:var(--r-md);margin-bottom:14px;animation:fadeIn 0.4s ease-out">
              <span class="badge" style="background:var(--sage);color:#fff;margin-bottom:6px">🎉 ${t('مبروك! فزت معنا', 'Congratulations!')}</span>
              <h3 style="margin:4px 0;color:var(--plum);font-size:20px">${esc(t(winningPrize.title_ar, winningPrize.title_en))}</h3>
              <p class="muted" style="margin:0 0 12px;font-size:14px">${esc(t(winningPrize.desc_ar, winningPrize.desc_en))}</p>
              <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap">
                <div style="font-size:18px;font-weight:700;letter-spacing:1px;padding:6px 16px;background:#fff;border:1px dashed var(--rose-gold);border-radius:var(--r-sm);color:var(--plum)">${esc(winningPrize.code)}</div>
                <button type="button" class="btn small" id="copy-wheel-code-btn">${t('نسخ الكود', 'Copy Code')}</button>
                <button type="button" class="btn small sage" id="apply-wheel-booking-btn">${t('استخدام في الحجز', 'Book with Code')}</button>
              </div>
            </div>
            <button type="button" class="btn light small" id="spin-wheel-btn">${t('تدوير العجلة مجدداً ↻', 'Spin Again ↻')}</button>
          `;
          setupPrizeActions(winningPrize);
          document.querySelector('#spin-wheel-btn')?.addEventListener('click', startSpin);
        }
      }
    };

    requestAnimationFrame(animateSpin);
  };

  document.querySelector('#spin-wheel-btn')?.addEventListener('click', startSpin);
}

export function initWheelFloatingButton() {
  if (document.querySelector('#wheel-floating-btn')) return;

  const btnHtml = `
    <button id="wheel-floating-btn" class="wheel-floating-btn" type="button" aria-label="${t('عجلة مكافآت J Beauty Spa', 'J Beauty Spa Wheel of Rewards')}">
      <span class="wheel-btn-glow"></span>
      <span class="wheel-btn-icon">🎁</span>
      <span class="wheel-btn-label">${t('عجلة المكافآت', 'Rewards Wheel')}</span>
    </button>
  `;

  document.body.insertAdjacentHTML('beforeend', btnHtml);

  document.querySelector('#wheel-floating-btn')?.addEventListener('click', () => {
    openRewardsWheelDialog();
  });
}
