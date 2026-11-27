// Главный модуль: состояние, игровой цикл, физика коня, столкновения, HUD.
(function () {
  const C = AT.CFG, A = AT.assets, S = AT.store, rnd = AT.rnd, clamp = AT.clamp, TAU = Math.PI * 2;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const scene = document.createElement('canvas'), sctx = scene.getContext('2d');

  const V = AT.V = { w: 960, h: 540, groundY: 430, horseX: 180, scale: 1, dpr: 1, cssW: 960, cssH: 540, safe: [0, 0, 0, 0] };

  function readSafe() {
    const el = document.getElementById('safe');
    const cs = getComputedStyle(el);
    V.safe = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(v => parseFloat(v) || 0);
  }

  function resize() {
    V.cssW = Math.max(1, window.innerWidth);
    V.cssH = Math.max(1, window.innerHeight);
    V.dpr = Math.min(window.devicePixelRatio || 1, 2);
    V.scale = Math.min(V.cssH / C.BASE_H, V.cssW / C.BASE_W);
    V.w = V.cssW / V.scale;
    V.h = V.cssH / V.scale;
    V.groundY = V.h - Math.max(110, V.h * 0.2);
    V.horseX = clamp(V.w * 0.2, 165, 230);
    canvas.width = Math.round(V.cssW * V.dpr);
    canvas.height = Math.round(V.cssH * V.dpr);
    canvas.style.width = V.cssW + 'px';
    canvas.style.height = V.cssH + 'px';
    scene.width = canvas.width; scene.height = canvas.height;
    readSafe();
  }

  // ---------------- Состояние ----------------
  const G = AT.G = { state: 'boot', clock: 0, speed: 280, dist: 0, obs: [], items: [], parts: [], floats: [], stormI: 0, debug: false };
  const H = AT.H = { h: 0, vy: 0, onGround: true, holding: false, holdT: 0, duckT: 0, phase: 0, buffer: 0 };

  function resetHorse() {
    Object.assign(H, { h: 0, vy: 0, onGround: true, holding: false, holdT: 0, duckT: 0, buffer: 0 });
  }

  function newRun() {
    Object.assign(G, {
      playTime: 0, speed: C.SPEED_START, slow: 1, dist: 0, coins: 0, bonus: 0, combo: 0, comboT: 0,
      lives: C.LIVES, stamina: 100, invuln: 0, stumble: 0, dieT: 0, overT: 0,
      obs: [], items: [], parts: [], floats: [], spawnD: 520, waterT: 7,
      stormNext: rnd(30, 42), stormT: -1, stormDur: 0, stormI: 0, stormWarned: false,
      shake: 0, flash: 0, hintT: 6, msg: null, lowWarn: false
    });
    G.clock = 0;
    resetHorse();
    AT.input.reset();
  }

  const meters = () => G.dist / C.UNITS_PER_M;
  const score = () => Math.floor(meters()) + G.bonus;
  const ducking = () => H.onGround && (H.duckT > 0 || AT.input.duckHeld);

  function horseBox() {
    const d = ducking();
    const top = d ? 60 : 108;
    return { x1: V.horseX - 40, x2: V.horseX + (d ? 64 : 50), y1: V.groundY - H.h - top, y2: V.groundY - H.h - 6 };
  }

  function message(tk, ru, t) { G.msg = { tk, ru, t: t || 2 }; }

  // ---------------- Действия ----------------
  function doJump() {
    if (G.state !== 'play') return;
    if (!H.onGround) { H.buffer = C.JUMP_BUFFER; return; }
    H.vy = C.JUMP_V; H.onGround = false; H.holdT = 0; H.holding = AT.input.held; H.duckT = 0;
    AT.audio.jump();
    dust(V.horseX - 30, 6);
  }

  function doDuck(dur) {
    if (G.state !== 'play') return;
    if (!H.onGround) { H.vy = Math.min(H.vy, -C.FAST_FALL_V); H.holding = false; }
    H.duckT = Math.max(H.duckT, dur || 0.7);
    H.buffer = 0;
  }

  function hurt(kind) {
    if (G.state !== 'play') return;
    if (G.invuln > 0 && kind !== 'stamina') return;
    G.lives--;
    G.combo = 0;
    G.invuln = C.INVULN;
    G.stumble = C.STUMBLE;
    G.slow = 0.6;
    G.shake = 0.3;
    G.flash = 0.25;
    AT.audio.hit();
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* ignore */ }
    if (kind === 'stamina') message('Güýç gutardy!', 'Выносливость кончилась!', 1.8);
    if (G.lives <= 0) die();
  }

  function die() {
    G.state = 'dying'; G.dieT = 0; G.lives = 0;
    AT.audio.wind(0);
    AT.audio.over();
    const s = S.get();
    const sc = score(), m = Math.floor(meters());
    const newRecord = sc > s.best;
    s.games += 1;
    s.coinsTotal += G.coins;
    if (newRecord) s.best = sc;
    if (m > s.bestDist) s.bestDist = m;
    S.save();
    G.result = { meters: m, coins: G.coins, score: sc, best: s.best, newRecord };
  }

  function collect(it) {
    it.got = true; it.fade = 1;
    G.combo++;
    const mult = Math.min(G.combo, 20);
    let pts = 0;
    if (it.type === 'coin') { G.coins++; pts = 5 * mult; AT.audio.coin(); }
    else if (it.type === 'melon') { G.stamina = Math.min(100, G.stamina + C.MELON_ADD); pts = 15 + 5 * mult; AT.audio.melon(); }
    else if (it.type === 'water') { G.stamina = Math.min(100, G.stamina + C.WATER_ADD); pts = 5 * mult; AT.audio.water(); floatText(it.x, it.y - 24, 'Suw!', '#7fd0ff'); }
    G.bonus += pts;
    floatText(it.x, it.y, '+' + pts, '#ffe27a');
    if (G.combo >= 3) G.comboT = 1.4;
  }

  function floatText(x, y, txt, col) { G.floats.push({ x, y, txt, col, t: 0.9 }); }

  function dust(x, n) {
    for (let i = 0; i < n; i++) {
      if (G.parts.length > 60) G.parts.shift();
      G.parts.push({ x: x + rnd(-8, 8), y: V.groundY - rnd(0, 6), vx: -rnd(40, 120), vy: -rnd(20, 70), r: rnd(3, 7), t: rnd(0.35, 0.6), t0: 0.6 });
    }
  }

  // ---------------- Обновление ----------------
  const BEATS = [0.0, 0.1, 0.45, 0.55];

  function animHorse(dt) {
    const stride = 0.5 * Math.sqrt(C.SPEED_START / Math.max(G.speed, 120));
    const prev = H.phase;
    H.phase = (H.phase + dt / stride) % 1;
    if (H.onGround && G.speed > 50) {
      for (const b of BEATS) {
        const crossed = prev <= H.phase ? (prev < b && H.phase >= b) : (prev < b || H.phase >= b);
        if (crossed) {
          if (G.state === 'play') AT.audio.hoof();
          if (Math.random() < 0.6) dust(V.horseX + (b < 0.3 ? -40 : 30), 1);
        }
      }
    }
  }

  function updateParts(dt) {
    for (const p of G.parts) { p.t -= dt; p.x += (p.vx - G.speed * 0.3) * dt; p.y += p.vy * dt; p.vy += 60 * dt; p.r += dt * 8; }
    G.parts = G.parts.filter(p => p.t > 0);
    for (const f of G.floats) { f.t -= dt; f.y -= 50 * dt; f.x -= G.speed * dt * 0.5; }
    G.floats = G.floats.filter(f => f.t > 0);
  }

  function physics(dt) {
    if (H.buffer > 0) H.buffer -= dt;
    if (H.duckT > 0) H.duckT -= dt;
    if (!H.onGround) {
      let g = C.GRAVITY;
      H.holdT += dt;
      if (H.holding && H.vy > 0 && H.holdT > C.HOLD_FROM && H.holdT < C.HOLD_TO) g *= C.HOLD_GRAV;
      H.vy -= g * dt;
      H.h += H.vy * dt;
      // конь никогда не уходит за верхний край экрана
      const maxH = V.groundY - 175;
      if (H.h > maxH) { H.h = maxH; if (H.vy > 0) H.vy = 0; }
      if (H.h <= 0) {
        H.h = 0; H.vy = 0; H.onGround = true;
        dust(V.horseX, 5);
        AT.audio.hoof();
        if (H.buffer > 0) { H.buffer = 0; doJump(); }
      }
    }
  }

  function circleRect(cx, cy, r, b) {
    const nx = clamp(cx, b.x1, b.x2), ny = clamp(cy, b.y1, b.y2);
    return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= r * r;
  }

  function collide() {
    const hb = horseBox();
    for (const o of G.obs) {
      if (o.hit) continue;
      let hit = false;
      if (o.type === 'pit') {
        const fx = V.horseX + 6;
        hit = H.onGround && fx > o.x + 18 && fx < o.x + o.w - 18;
      } else if (o.type === 'tumble') {
        const c = AT.ent.tumbleCenter(o);
        hit = circleRect(c[0], c[1], o.r * 0.8, hb);
      } else {
        const b = AT.ent.box(o);
        hit = hb.x1 < b.x2 && hb.x2 > b.x1 && hb.y1 < b.y2 && hb.y2 > b.y1;
      }
      if (hit && G.invuln <= 0) { o.hit = true; hurt('ob'); if (G.state !== 'play') return; }
    }
    const pb = { x1: hb.x1 - 6, x2: hb.x2 + 10, y1: hb.y1 - 8, y2: hb.y2 + 8 };
    for (const it of G.items) if (!it.got && circleRect(it.x, it.y, it.r, pb)) collect(it);
  }

  function stepPlay(dt) {
    G.playTime += dt;
    const base = Math.min(C.SPEED_MAX, C.SPEED_START + C.SPEED_ACCEL * G.playTime);
    G.slow = Math.min(1, G.slow + dt * 0.45);
    G.speed = base * G.slow;
    G.dist += G.speed * dt;

    G.stamina -= C.STAMINA_DRAIN * dt;
    if (G.stamina <= 0) { G.stamina = 0; hurt('stamina'); if (G.state !== 'play') return; G.stamina = 60; }
    if (G.stamina < 25 && !G.lowWarn) { G.lowWarn = true; message('Suw gerek!', 'Нужна вода!', 1.6); }
    if (G.stamina > 40) G.lowWarn = false;

    if (G.invuln > 0) G.invuln -= dt;
    if (G.stumble > 0) G.stumble -= dt;

    physics(dt);

    G.spawnD -= G.speed * dt;
    G.waterT -= dt;
    if (G.spawnD <= 0) G.spawnD += AT.ent.spawn(G, V.w + 80);

    // песчаная буря
    if (G.stormT < 0) {
      if (!G.stormWarned && G.playTime > G.stormNext - 2) { G.stormWarned = true; message('Gum tupany!', 'Песчаная буря!', 2.2); }
      if (G.playTime >= G.stormNext) { G.stormT = 0; G.stormDur = rnd(7, 9); }
    } else {
      G.stormT += dt;
      if (G.stormT > G.stormDur) { G.stormT = -1; G.stormNext = G.playTime + rnd(35, 55); G.stormWarned = false; }
    }
    G.stormI = G.stormT < 0 ? 0 : clamp(Math.min(G.stormT / 1.2, (G.stormDur - G.stormT) / 1.5), 0, 1);

    AT.ent.update(G, dt);
    collide();
  }

  function update(dt) {
    if (G.state === 'pause' || G.state === 'boot') return;
    G.clock += dt;
    if (G.shake > 0) G.shake -= dt;
    if (G.flash > 0) G.flash -= dt;
    if (G.comboT > 0) G.comboT -= dt;
    if (G.hintT > 0 && G.state === 'play') G.hintT -= dt;
    if (G.msg) { G.msg.t -= dt; if (G.msg.t <= 0) G.msg = null; }

    if (G.state === 'play') {
      // мелкие шаги — чтобы на высокой скорости не «проскакивать» препятствия
      const n = Math.ceil(dt / (1 / 120));
      for (let i = 0; i < n && G.state === 'play'; i++) stepPlay(dt / n);
      AT.audio.wind(G.stormI);
    } else if (G.state === 'dying' || G.state === 'over') {
      G.dieT += dt;
      G.speed = Math.max(0, G.speed - 700 * dt);
      G.dist += G.speed * dt;
      if (!H.onGround) physics(dt);
      AT.ent.update(G, dt);
      if (G.state === 'dying' && G.dieT > 1.3) {
        G.state = 'over'; G.overT = 0;
        AT.ui.setOver(G.result);
        AT.ui.show('over');
      }
      if (G.state === 'over') G.overT += dt;
    } else {
      // меню / рекорд: конь бежит на фоне
      G.speed = 280;
      G.dist += G.speed * dt;
    }
    if (G.state !== 'dying' && G.state !== 'over') animHorse(dt);
    updateParts(dt);
  }

  // ---------------- Отрисовка ----------------
  const frameCount = img => Math.max(1, Math.round(img.width / (img.height * C.FRAME_W / C.FRAME_H)));
  // Кадр из листа «в одну строку»: якорь — центр туловища на линии земли
  function drawSheet(c, img, idx, x, y, sx, sy) {
    const n = frameCount(img), fw = img.width / n, fh = img.height;
    idx = clamp(idx, 0, n - 1);
    const k = C.HORSE_DRAW_W / fw, dw = fw * k * sx, dh = fh * k * sy;
    c.drawImage(img, idx * fw, 0, fw, fh, x - dw * C.FRAME_ANCHOR_X, y - dh + C.FRAME_GROUND * k * sy, dw, dh);
  }

  function drawHorse(c) {
    const x = V.horseX, y = V.groundY - H.h;
    // тень
    const sh = Math.max(0.25, 1 - H.h / 260);
    c.fillStyle = 'rgba(70,40,15,' + (0.3 * sh).toFixed(3) + ')';
    c.beginPath(); c.ellipse(x, V.groundY + 2, 62 * sh, 7 * sh, 0, 0, TAU); c.fill();

    let alpha = 1;
    if (G.state === 'play' && G.invuln > 0 && Math.floor(G.invuln * 14) % 2 === 0) alpha = 0.3;
    c.globalAlpha = alpha;

    let mode = 'run', k = 0, ft = 0;
    if (G.state === 'dying' || G.state === 'over') { mode = 'fall'; ft = Math.min(1, G.dieT / 0.9); }
    else if (G.stumble > 0) { mode = 'fall'; ft = 1 - G.stumble / C.STUMBLE; }
    else if (!H.onGround) { mode = 'jump'; k = clamp(-H.vy / C.JUMP_V, -1, 1); }
    else if (ducking()) mode = 'duck';

    const run = A.img.horse_run, jmp = A.img.horse_jump, fall = A.img.horse_fall;
    if (mode === 'jump' && jmp) {
      const n = frameCount(jmp);
      drawSheet(c, jmp, Math.floor((k + 1) / 2 * n), x, y, 1, 1);
    } else if (mode === 'fall' && fall) {
      const n = frameCount(fall);
      const idx = G.state === 'play'
        ? Math.floor(Math.sin(Math.PI * ft) * Math.min(n, C.STUMBLE_FRAMES) * 0.999)
        : Math.floor(ft * n);
      drawSheet(c, fall, idx, x, y, 1, 1);
    } else if ((mode === 'run' || mode === 'duck') && run) {
      const n = frameCount(run), idx = Math.floor(H.phase * n) % n;
      if (mode === 'duck') drawSheet(c, run, idx, x + 6, y, 1.06, 0.72);
      else drawSheet(c, run, idx, x, y, 1, 1);
    } else {
      AT.drawHorseProc(c, x, y, 1, { mode, p: H.phase, k, t: ft });
    }
    c.globalAlpha = 1;
  }

  function drawParts(c) {
    for (const p of G.parts) {
      c.fillStyle = 'rgba(225,190,130,' + (0.55 * p.t / p.t0).toFixed(3) + ')';
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill();
    }
  }

  function render() {
    const W = AT.bg.weights(G.clock);
    const k = V.dpr * V.scale;

    // 1) небо
    ctx.setTransform(k, 0, 0, k, 0, 0);
    AT.bg.drawSky(ctx, V, W, G.clock, G.dist);

    // 2) сцена на отдельном холсте → тонировка по времени суток
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scene.width, scene.height);
    sctx.setTransform(k, 0, 0, k, 0, 0);
    AT.bg.drawLand(sctx, V, G.dist);
    AT.ent.draw(sctx, G);
    drawParts(sctx);
    drawHorse(sctx);
    if (G.debug) AT.ent.drawDebug(sctx, G, horseBox());

    const tint = [];
    if (W[1] > 0.001) tint.push('rgba(255,110,50,' + (0.22 * W[1]).toFixed(3) + ')');
    if (W[2] > 0.001) tint.push('rgba(18,28,80,' + (0.52 * W[2]).toFixed(3) + ')');
    if (tint.length) {
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalCompositeOperation = 'source-atop';
      for (const t of tint) { sctx.fillStyle = t; sctx.fillRect(0, 0, scene.width, scene.height); }
      sctx.globalCompositeOperation = 'source-over';
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let ox = 0, oy = 0;
    if (G.shake > 0) { const m = 7 * V.dpr * G.shake / 0.3; ox = rnd(-m, m); oy = rnd(-m, m); }
    ctx.drawImage(scene, ox, oy);

    // 3) буря, тексты, вспышка
    ctx.setTransform(k, 0, 0, k, 0, 0);
    AT.bg.drawStorm(ctx, V, G.stormI, G.clock, V.horseX + 30, V.groundY - H.h - 70);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of G.floats) {
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.font = 'bold 20px "Trebuchet MS",sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,25,10,0.8)'; ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    if (G.flash > 0) { ctx.fillStyle = 'rgba(200,30,20,' + (G.flash * 1.2).toFixed(3) + ')'; ctx.fillRect(0, 0, V.w, V.h); }

    if (G.state === 'play' || G.state === 'pause' || G.state === 'dying') drawHUD();
  }

  function txt(s, x, y, size, col, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px "Trebuchet MS","Segoe UI",sans-serif';
    ctx.textAlign = align || 'left';
    ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = 'rgba(40,15,5,0.75)'; ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
    ctx.fillStyle = col || '#fff8e8'; ctx.fillText(s, x, y);
  }

  function drawHUD() {
    ctx.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    ctx.textBaseline = 'top';
    const L = 12 + V.safe[3], T = 12 + V.safe[0], R = V.cssW - 12 - V.safe[1];
    // жизни
    const heart = A.get('heart');
    for (let i = 0; i < C.LIVES; i++) {
      ctx.globalAlpha = i < G.lives ? 1 : 0.25;
      ctx.drawImage(heart, L + i * 30, T, 26, 26);
    }
    ctx.globalAlpha = 1;
    // выносливость
    const by = T + 34, bw = 130;
    ctx.drawImage(A.get('water'), L - 2, by - 4, 24, 24);
    ctx.fillStyle = 'rgba(30,12,5,0.55)';
    roundRect(L + 26, by + 2, bw, 13, 6); ctx.fill();
    const low = G.stamina < 25, blink = low && Math.floor(G.clock * 5) % 2 === 0;
    ctx.fillStyle = low ? (blink ? '#ff6a4d' : '#c9321f') : '#46b3f0';
    roundRect(L + 27, by + 3, Math.max(0, (bw - 2) * G.stamina / 100), 11, 5); ctx.fill();
    ctx.strokeStyle = '#f0c75e'; ctx.lineWidth = 1.5; roundRect(L + 26, by + 2, bw, 13, 6); ctx.stroke();
    txt('Güýç', L + 26, by + 18, 11, '#fff8e8', 'left', 'bold');
    ctx.font = 'bold 11px "Trebuchet MS","Segoe UI",sans-serif';
    txt('· выносливость', L + 30 + ctx.measureText('Güýç').width, by + 19, 9, 'rgba(255,248,232,0.8)', 'left', 'normal');
    // монеты
    ctx.drawImage(A.get('coin'), L, by + 34, 22, 22);
    txt(String(G.coins), L + 28, by + 36, 18, '#ffe27a');

    // справа: расстояние и очки (под кнопками)
    const ry = T + 52;
    txt(Math.floor(meters()) + ' m', R, ry, 26, '#fff8e8', 'right');
    txt('Aralyk · расстояние', R, ry + 28, 9, 'rgba(255,248,232,0.8)', 'right', 'normal');
    txt('Bal ' + score(), R, ry + 42, 16, '#ffe27a', 'right');
    txt('очки', R, ry + 60, 9, 'rgba(255,248,232,0.8)', 'right', 'normal');

    const cx = V.cssW / 2;
    // серия
    if (G.comboT > 0 && G.combo >= 3) {
      ctx.globalAlpha = Math.min(1, G.comboT * 2);
      txt('Seriýa ×' + G.combo, cx, T + 4, 22, '#ffe27a', 'center');
      txt('серия', cx, T + 30, 10, '#fff8e8', 'center', 'normal');
      ctx.globalAlpha = 1;
    }
    // сообщение (буря, вода)
    if (G.msg) {
      ctx.globalAlpha = Math.min(1, G.msg.t * 2);
      const my = V.cssH * 0.3;
      txt(G.msg.tk, cx, my, 30, '#ffd36b', 'center');
      txt(G.msg.ru, cx, my + 36, 13, '#fff8e8', 'center', 'normal');
      ctx.globalAlpha = 1;
    }
    // подсказка по управлению в начале забега
    if (G.hintT > 0 && G.state === 'play') {
      ctx.globalAlpha = Math.min(1, G.hintT);
      const small = V.cssW < 520;
      const hy = V.cssH - (small ? 110 : 64) - V.safe[2];
      txt(small ? 'Bas — bök · Uzak bas — beýik · Aşak süýş — egil' : 'Bas — bökmek · Uzak bas — beýik bökmek · Aşak süýş — egilmek', cx, hy, small ? 13 : 16, '#fff8e8', 'center');
      txt(small ? 'тап — прыжок · удержание — выше · свайп вниз — пригнуться' : 'тап / пробел — прыжок · удержание — высокий прыжок · свайп вниз / ↓ — пригнуться', cx, hy + 22, small ? 10 : 12, 'rgba(255,248,232,0.85)', 'center', 'normal');
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------------- Экраны и управление ----------------
  function startGame() {
    newRun();
    G.state = 'play';
    AT.ui.show(null);
  }
  function toMenu() {
    G.state = 'menu';
    G.obs = []; G.items = []; G.floats = []; G.stormI = 0; G.msg = null;
    resetHorse();
    AT.audio.wind(0);
    AT.ui.show('menu');
  }
  function pause() {
    if (G.state !== 'play') return;
    G.state = 'pause';
    AT.input.reset(); H.holding = false;
    AT.audio.wind(0);
    AT.ui.show('pause');
  }
  function resume() {
    if (G.state !== 'pause') return;
    G.state = 'play';
    AT.ui.show(null);
    last = performance.now();
  }
  function toggleSound() {
    const m = !AT.audio.isMuted();
    AT.audio.setMuted(m);
    S.set('muted', m);
    AT.ui.setMuted(m);
  }

  AT.ui.init({
    start: startGame,
    restart: startGame,
    record: () => { AT.ui.setRecord(S.get()); AT.ui.show('record'); G.state = 'record'; },
    back: () => { G.state = 'menu'; AT.ui.show('menu'); },
    sound: toggleSound,
    pause,
    resume,
    menu: toMenu
  });

  const I = AT.input;
  I.on.any = () => AT.audio.resume();
  I.on.jumpDown = src => {
    if (G.state === 'play') doJump();
    else if (src === 'key') {
      if (G.state === 'menu') startGame();
      else if (G.state === 'pause') resume();
      else if (G.state === 'over' && G.overT > 0.6) startGame();
    }
  };
  I.on.jumpUp = () => { H.holding = false; };
  I.on.duck = d => doDuck(d);
  I.on.pause = () => { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); };
  I.on.mute = toggleSound;
  I.on.enter = () => {
    if (G.state === 'menu') startGame();
    else if (G.state === 'pause') resume();
    else if (G.state === 'over' && G.overT > 0.6) startGame();
  };

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  document.addEventListener('pointerdown', () => AT.audio.resume(), true);

  // ---------------- Цикл ----------------
  let last = performance.now();
  AT.game = { manual: false, step: update, render, startGame, toMenu, pause, resume, horseBox, newRun };

  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    if (!AT.game.manual) { update(dt); render(); }
    requestAnimationFrame(frame);
  }

  resize();
  const muted = !!S.get().muted;
  AT.audio.setMuted(muted);
  AT.ui.setMuted(muted);
  AT.bg.init();
  A.load().then(() => {
    AT.ui.hideLoading();
    G.state = 'menu';
    AT.ui.show('menu');
    last = performance.now();
  });
  requestAnimationFrame(frame);
})();
