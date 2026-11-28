// Рекорд и прогресс в localStorage (всё в try/catch: в приватном режиме хранилище может быть недоступно)
(function () {
  const KEY = 'ahalteke.save.v1';
  const DEF = { best: 0, bestDist: 0, coinsTotal: 0, games: 0, muted: false };
  let data = Object.assign({}, DEF);

  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && typeof o === 'object') {
        data.best = Number(o.best) || 0;
        data.bestDist = Number(o.bestDist) || 0;
        data.coinsTotal = Number(o.coinsTotal) || 0;
        data.games = Number(o.games) || 0;
        data.muted = !!o.muted;
      }
    }
  } catch (e) { /* хранилище недоступно — играем без сохранения */ }

  AT.store = {
    get() { return data; },
    save() {
      try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    },
    set(k, v) { data[k] = v; this.save(); }
  };
})();
