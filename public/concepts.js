const directions = {
  botanical: {title:'A little stillness.<br><em>Entirely yours.</em>',description:'Thoughtful beauty rituals, brought to the place you feel most yourself. Make room for a softer kind of day.'},
  blush: {title:'Your glow.<br><em>Your own kind<br>of beautiful.</em>',description:'A fresh shade. A softer mood. Personal beauty rituals that make everyday feel a little more like you.'},
  editorial: {title:'The art of<br><em>taking time.</em>',description:'An invitation to slow down. Considered rituals, beautiful details, and the luxury of being at home.'}
};
document.querySelectorAll('[data-theme]').forEach(button => {
  if(button.tagName !== 'BUTTON') return;
  button.addEventListener('click', () => {
    const name = button.dataset.theme;
    document.getElementById('canvas').dataset.theme = name;
    document.getElementById('heroTitle').innerHTML = directions[name].title;
    document.getElementById('heroDescription').textContent = directions[name].description;
    document.querySelectorAll('.choices button').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
  });
});
document.getElementById('ritual').addEventListener('change', event => {
  document.getElementById('estimate').textContent = event.target.value + ' SAR';
});
document.getElementById('previewForm').addEventListener('submit', event => {
  event.preventDefault();
  document.getElementById('previewNotice').textContent = 'This is a visual design preview. No booking has been submitted. Open the main J SPA website to request an appointment.';
});
