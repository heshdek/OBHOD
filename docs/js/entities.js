// Препятствия, предметы, генератор уровня.
(function () {
  const C = AT.CFG, A = AT.assets, rnd = AT.rnd, TAU = Math.PI * 2;
  const E = AT.ent = {};

  // Наземные препятствия: размер картинки и хитбокс [левый край, правый край, высота] от x и земли
  const OB = {
    rock: { img: 'rock', w: 58, h: 44, hb: [9, 49, 30] },
    saxS: { img: 'saxaul', w: 74, h: 74, hb: [22, 52, 50] },
    saxL: { img: 'saxaul', w: 106, h: 112, hb: [32, 74, 94] }
  };
  E.OB = OB;

  function addOb(G, type, x) {
    const d = OB[type];
    G.obs.push({ type, x, w: d.w, h: d.h, hb: d.hb, hit: false });
    return d.w;
  }
  function addTumble(G, x, high) {
    // наземное — подпрыгивает (перепрыгнуть), высокое — летит на уровне шеи (пригнуться или высокий прыжок)
    G.obs.push({ type: 'tumble', x, r: 22, high, vx: rnd(60, 110), rot: 0, bp: Math.random() * TAU, hit: false });
    return 44;
  }
  function addPit(G, x, w) { G.obs.push({ type: 'pit', x, w, hit: false }); return w; }
  function addItem(G, type, x, y) {
    G.items.push({ type, x, y, r: type === 'coin' ? 15 : 19, got: false, missed: false, t: Math.random() * 6 });
  }
  // Дуга монет над препятствием по траектории прыжка
  function coinArc(G, cx, peak, n, half) {
    const gy = AT.V.groundY;
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      addItem(G, 'coin', cx + u * half, gy - 40 - (peak - 40) * (1 - u * u));
    }
  }

  function pick(opts) {
    let s = 0; for (const o of opts) s += o[1];
    let r = Math.random() * s;
    for (const o of opts) { r -= o[1]; if (r <= 0) return o[0]; }
    return opts[0][0];
  }

  // Создаёт очередной фрагмент уровня с x = X. Возвращает расстояние до следующего.
  E.spawn = function (G, X) {
    const t = G.playTime, sp = G.speed, gy = AT.V.groundY;
    let len = 0, gapK = rnd(0.95, 1.45);

    if (G.waterT <= 0) {
      G.waterT = rnd(9, 13);
      const air = Math.random() < 0.4;
      addItem(G, 'water', X + 20, gy - (air ? 150 : 42));
      if (Math.random() < 0.5) { addItem(G, 'coin', X - 30, gy - (air ? 120 : 40)); addItem(G, 'coin', X + 70, gy - (air ? 120 : 40)); }
      return 60 + sp * 0.55;
    }

    const opts = [['rock', 3], ['saxS', 3], ['coins', 2], ['melon', 0.6]];
    if (t > 8) opts.push(['pit', 2]);
    if (t > 14) opts.push(['saxL', 2]);
    if (t > 20) opts.push(['tumble', 2]);
    if (t > 26) opts.push(['tumbleHigh', 2]);
    if (t > 40) opts.push(['double', 1.6]);
    const kind = pick(opts);

    switch (kind) {
      case 'rock':
        len = addOb(G, 'rock', X);
        if (Math.random() < 0.5) coinArc(G, X + 29, 125, 5, 80);
        break;
      case 'saxS':
        len = addOb(G, 'saxS', X);
        if (Math.random() < 0.4) coinArc(G, X + 37, 135, 5, 85);
        break;
      case 'saxL':
        len = addOb(G, 'saxL', X);
        if (Math.random() < 0.5) coinArc(G, X + 53, 205, 5, 100);
        gapK += 0.15;
        break;
      case 'pit': {
        const w = rnd(90, 120 + Math.min(30, t * 0.5));
        len = addPit(G, X, w);
        if (Math.random() < 0.5) coinArc(G, X + w / 2, 120, 3, w * 0.4);
        break;
      }
      case 'tumble':
        len = addTumble(G, X + 22, false);
        gapK += 0.1;
        break;
      case 'tumbleHigh':
        len = addTumble(G, X + 22, true);
        // награда за то, что пригнулся
        if (Math.random() < 0.6) for (let i = 0; i < 3; i++) addItem(G, 'coin', X + 120 + i * 40, gy - 28);
        gapK += 0.15;
        break;
      case 'coins': {
        const air = Math.random() < 0.35, y = gy - (air ? 150 : 38), n = 5;
        for (let i = 0; i < n; i++) addItem(G, (i === 2 && Math.random() < 0.15) ? 'melon' : 'coin', X + i * 42, y);
        len = n * 42; gapK = rnd(0.5, 0.8);
        break;
      }
      case 'melon':
        addItem(G, 'melon', X, gy - (Math.random() < 0.5 ? 42 : 140));
        len = 40; gapK = rnd(0.5, 0.8);
        break;
      case 'double': {
        const a = Math.random() < 0.5 ? 'rock' : 'saxS';
        addOb(G, 'rock', X);
        const gap2 = sp * 0.72 + 90;
        len = gap2 + addOb(G, a, X + gap2);
        break;
      }
    }
    if (G.stormI > 0.1) gapK *= 1.25;
    return len + Math.max(260, sp * gapK);
  };

  E.update = function (G, dt) {
    const sp = G.speed, gy = AT.V.groundY, hx = AT.V.horseX;
    for (const o of G.obs) {
      if (o.type === 'tumble') {
        const v = sp + o.vx * (1 + (G.stormI || 0) * 0.8);
        o.x -= v * dt;
        o.rot -= v * dt / o.r;
        o.bp += dt * 6.5;
        o.alt = o.high ? 104 - o.r + Math.sin(o.bp * 0.6) * 4 : Math.abs(Math.sin(o.bp)) * 24;
      } else o.x -= sp * dt;
    }
    for (let i = G.obs.length - 1; i >= 0; i--) {
      const o = G.obs[i];
      if (o.x + (o.w || o.r * 2) < -200) G.obs.splice(i, 1);
    }
    for (const it of G.items) {
      it.x -= sp * dt; it.t += dt;
      if (!it.got && !it.missed && it.x < hx - 70) { it.missed = true; G.combo = 0; }
    }
    for (let i = G.items.length - 1; i >= 0; i--) if (G.items[i].x < -60 || (G.items[i].got && G.items[i].fade <= 0)) G.items.splice(i, 1);
    for (const it of G.items) if (it.got) { it.fade -= dt * 4; it.y -= dt * 160; }
  };

  // Хитбокс препятствия в мировых координатах (для наземных)
  E.box = function (o) {
    const gy = AT.V.groundY;
    return { x1: o.x + o.hb[0], x2: o.x + o.hb[1], y1: gy - o.hb[2], y2: gy };
  };
  // Центр перекати-поля
  E.tumbleCenter = function (o) { return [o.x, AT.V.groundY - o.r - (o.alt || 0)]; };

  E.draw = function (ctx, G) {
    const gy = AT.V.groundY;
    // ямы — первыми, поверх песка
    const pit = A.get('pit');
    for (const o of G.obs) if (o.type === 'pit') ctx.drawImage(pit, o.x, gy - 3, o.w, 72);
    for (const o of G.obs) {
      if (o.type === 'pit') continue;
      if (o.type === 'tumble') {
        const c = E.tumbleCenter(o), im = A.get('tumbleweed'), s = o.r * 2.3;
        // тень
        ctx.fillStyle = 'rgba(80,50,20,' + (o.high ? 0.12 : 0.25) + ')';
        ctx.beginPath(); ctx.ellipse(c[0], gy + 2, o.r * 0.9, 4, 0, 0, TAU); ctx.fill();
        ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(o.rot);
        ctx.drawImage(im, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        const im = A.get(OB[o.type].img);
        ctx.fillStyle = 'rgba(80,50,20,0.25)';
        ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, gy + 2, o.w * 0.42, 5, 0, 0, TAU); ctx.fill();
        ctx.drawImage(im, o.x, gy - o.h + 2, o.w, o.h);
      }
    }
    for (const it of G.items) {
      const im = A.get(it.type);
      const s = it.r * 2.2;
      const bob = it.got ? 0 : Math.sin(it.t * 4) * 3;
      ctx.save();
      if (it.got) ctx.globalAlpha = Math.max(0, it.fade);
      ctx.translate(it.x, it.y + bob);
      if (it.type === 'coin') ctx.scale(Math.max(0.25, Math.abs(Math.cos(it.t * 3.2))), 1);
      ctx.drawImage(im, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  };

  // Для отладки и автотестов: показать хитбоксы
  E.drawDebug = function (ctx, G, hb) {
    ctx.strokeStyle = 'red'; ctx.lineWidth = 1.5;
    ctx.strokeRect(hb.x1, hb.y1, hb.x2 - hb.x1, hb.y2 - hb.y1);
    for (const o of G.obs) {
      if (o.type === 'tumble') { const c = E.tumbleCenter(o); ctx.beginPath(); ctx.arc(c[0], c[1], o.r * 0.8, 0, TAU); ctx.stroke(); }
      else if (o.type === 'pit') ctx.strokeRect(o.x + 18, AT.V.groundY - 4, o.w - 36, 8);
      else { const b = E.box(o); ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1); }
    }
  };
})();
