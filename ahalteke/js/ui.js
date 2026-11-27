// Экраны (DOM): меню, рекорд, пауза, конец игры. Логотип bugra — во всех состояниях.
(function () {
  const $ = id => document.getElementById(id);
  const screens = { menu: $('scr-menu'), record: $('scr-record'), pause: $('scr-pause'), over: $('scr-over') };

  const UI = AT.ui = {};

  UI.init = function (handlers) {
    document.querySelectorAll('[data-action]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        b.blur();
        AT.audio.resume();
        AT.audio.click();
        const f = handlers[b.dataset.action];
        if (f) f();
      });
      b.addEventListener('pointerdown', e => e.stopPropagation());
    });
    // Логотип: если assets/logo.png нет — показываем текстовую заглушку
    const logo = $('logo'), img = logo.querySelector('img');
    const fail = () => logo.classList.add('noimg');
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0) fail();
  };

  UI.show = function (name) {
    for (const k in screens) screens[k].classList.toggle('on', k === name);
    document.body.classList.toggle('playing', name === null);
  };

  UI.hideLoading = function () { const l = $('loading'); if (l) l.remove(); };

  UI.setMuted = function (m) {
    document.querySelectorAll('.snd-tk').forEach(e => { e.textContent = m ? 'Ses: ýapyk' : 'Ses: açyk'; });
    document.querySelectorAll('.snd-ru').forEach(e => { e.textContent = m ? 'Звук: выкл' : 'Звук: вкл'; });
    const b = $('btn-sound');
    b.querySelector('.ico-on').style.display = m ? 'none' : '';
    b.querySelector('.ico-off').style.display = m ? '' : 'none';
  };

  const fmt = n => Math.floor(n).toLocaleString('ru-RU');

  UI.setRecord = function (s) {
    $('r-best').textContent = fmt(s.best);
    $('r-dist').textContent = fmt(s.bestDist) + ' m';
    $('r-coins').textContent = fmt(s.coinsTotal);
    $('r-games').textContent = fmt(s.games);
  };

  UI.setOver = function (r) {
    $('o-dist').textContent = fmt(r.meters) + ' m';
    $('o-coins').textContent = fmt(r.coins);
    $('o-score').textContent = fmt(r.score);
    $('o-best').textContent = fmt(r.best);
    $('o-new').classList.toggle('on', !!r.newRecord);
  };
})();
