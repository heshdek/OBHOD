// Управление: тап / клик / пробел — прыжок, удержание — высокий прыжок,
// свайп вниз / стрелка вниз — пригнуться. P / Esc — пауза, M — звук.
(function () {
  const I = AT.input = { held: false, duckHeld: false, on: {} };
  const emit = (n, a) => { const f = I.on[n]; if (f) f(a); };
  const canvas = document.getElementById('game');

  // На сенсорном экране ждём до 90 мс: если палец пошёл вниз — это свайп, иначе прыжок
  let touch = null;
  const TAP_WAIT = 90, SWIPE_PX = 24;

  function jumpNow() { I.held = true; emit('jumpDown'); }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    emit('any');
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      jumpNow();
      return;
    }
    if (touch) return;
    touch = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), decided: false, timer: 0 };
    touch.timer = setTimeout(() => { if (touch && !touch.decided) { touch.decided = true; jumpNow(); } }, TAP_WAIT);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }, { passive: false });

  canvas.addEventListener('pointermove', e => {
    if (!touch || e.pointerId !== touch.id) return;
    const dy = e.clientY - touch.y0, dx = e.clientX - touch.x0;
    if (dy > SWIPE_PX && dy > Math.abs(dx)) {
      if (!touch.decided) { touch.decided = true; clearTimeout(touch.timer); emit('duck', 0.7); touch.swiped = true; }
      else if (!touch.swiped && performance.now() - touch.t0 < 350) { touch.swiped = true; I.held = false; emit('jumpUp'); emit('duck', 0.7); }
    }
  });

  function endPointer(e) {
    if (e.pointerType === 'mouse') { if (I.held) { I.held = false; emit('jumpUp'); } return; }
    if (!touch || e.pointerId !== touch.id) return;
    clearTimeout(touch.timer);
    if (!touch.decided) { touch.decided = true; I.held = true; emit('jumpDown'); }
    I.held = false; emit('jumpUp');
    touch = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  const JUMP_KEYS = ['Space', 'ArrowUp', 'KeyW'], DUCK_KEYS = ['ArrowDown', 'KeyS'];
  window.addEventListener('keydown', e => {
    if (JUMP_KEYS.includes(e.code) || DUCK_KEYS.includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    emit('any');
    if (JUMP_KEYS.includes(e.code)) { I.held = true; emit('jumpDown', 'key'); }
    else if (DUCK_KEYS.includes(e.code)) { I.duckHeld = true; emit('duck', 0.25); }
    else if (e.code === 'Escape' || e.code === 'KeyP') emit('pause');
    else if (e.code === 'KeyM') emit('mute');
    else if (e.code === 'Enter') emit('enter');
  });
  window.addEventListener('keyup', e => {
    if (JUMP_KEYS.includes(e.code)) { I.held = false; emit('jumpUp'); }
    else if (DUCK_KEYS.includes(e.code)) { I.duckHeld = false; }
  });

  window.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('touchmove', e => { if (e.target === canvas) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  I.reset = function () { I.held = false; I.duckHeld = false; if (touch) { clearTimeout(touch.timer); touch = null; } };
})();
