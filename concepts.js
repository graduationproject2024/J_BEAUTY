const directions = {
  synthesis: {
    title: 'Your Beauty.<br><em>Your Ritual. Your Moment.</em>',
    description:
      'Thoughtful massage, nail artistry, and botanical home spa care brought directly to your home in Madinah with personal team confirmation.',
  },
  botanical: {
    title: 'A quiet moment,<br><em>in the comfort of home.</em>',
    description:
      'Soft botanical harmony, sage stillness, and calm rituals delivered at home with manual confirmation.',
  },
  blush: {
    title: 'Your soft glow.<br><em>Curated at home.</em>',
    description:
      'A feminine beauty sanctuary with rose-tinted warmth, tailored nail artistry, and calm personal care in Madinah.',
  },
  editorial: {
    title: 'The quiet art<br><em>of slowing down.</em>',
    description:
      'Architectural restraint, refined serif typography, and deliberate pacing for home wellness in Al Madinah.',
  },
};

document.querySelectorAll('[data-theme]').forEach((btn) => {
  if (btn.tagName !== 'BUTTON') return;
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    document.getElementById('canvas').dataset.theme = theme;
    document.getElementById('heroTitle').innerHTML = directions[theme].title;
    document.getElementById('heroDescription').textContent = directions[theme].description;
    document.querySelectorAll('.choices button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
  });
});

document.querySelectorAll('[data-frame]').forEach((btn) => {
  if (btn.tagName !== 'BUTTON') return;
  btn.addEventListener('click', () => {
    document.getElementById('canvas').dataset.frame = btn.dataset.frame;
    document.querySelectorAll('.viewport-switch button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
  });
});

document.getElementById('ritual').addEventListener('change', (event) => {
  document.getElementById('estimate').textContent = event.target.value + ' SAR';
});

document.getElementById('previewForm').addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('previewNotice').textContent =
    'This is a design concept preview only. No appointment has been created. Visit /ar/booking to request an appointment.';
});
