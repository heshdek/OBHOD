// Картинки игры, нарисованные кодом в туркменском стиле (контуры, закрученные облака, орнамент гёль).
// Используются, если соответствующего PNG в assets/ нет. Размеры совпадают с размерами PNG.
(function () {
  const P = AT.ph = {};
  const TAU = Math.PI * 2;
  const INK = '#5a3418';           // основной контур
  const RED = '#b3261e', RED_D = '#7e1711', GREEN = '#2f7d3f', GOLD = '#f0c75e', GOLD_D = '#b8861f', CREAM = '#fff4dc';

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function seeded(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  // Периодическая функция — бесшовна по ширине W
  function periodic(W, terms) {
    return x => { let s = 0; for (const t of terms) s += t[1] * Math.sin(TAU * t[0] * x / W + t[2]); return s; };
  }
  function wrap(W, fn) { fn(-W); fn(0); fn(W); }
  // Объединение фигур с общим контуром: сначала толстый контур у всех, потом заливка
  function blob(g, paths, fill, ink, lw) {
    g.lineJoin = 'round'; g.strokeStyle = ink; g.lineWidth = lw * 2;
    for (const p of paths) g.stroke(p);
    g.fillStyle = fill;
    for (const p of paths) g.fill(p);
  }
  function circ(x, y, r) { const p = new Path2D(); p.arc(x, y, r, 0, TAU); return p; }
  function ell(x, y, rx, ry, rot) { const p = new Path2D(); p.ellipse(x, y, rx, ry, rot || 0, 0, TAU); return p; }
  // Спираль-завиток (как облака и ветер в туркменском орнаменте)
  function spiral(g, x, y, r, turns, dir, start) {
    g.beginPath();
    const n = 60 * turns;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = (start || 0) + dir * t * turns * TAU, rr = r * (1 - t * 0.92);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.stroke();
  }
  // Восьмиконечная звезда (два квадрата)
  function star8(g, x, y, R, r) {
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath();
  }
  // Гёль — восьмиугольный медальон с ромбом и крестом
  function gul(g, x, y, R, c1, c2, c3) {
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.72); }
    g.closePath(); g.fillStyle = c1; g.fill(); g.strokeStyle = INK; g.lineWidth = Math.max(1, R * 0.08); g.stroke();
    g.beginPath(); g.moveTo(x, y - R * 0.55); g.lineTo(x + R * 0.6, y); g.lineTo(x, y + R * 0.55); g.lineTo(x - R * 0.6, y); g.closePath();
    g.fillStyle = c2; g.fill();
    g.fillStyle = c3; g.fillRect(x - R * 0.1, y - R * 0.32, R * 0.2, R * 0.64); g.fillRect(x - R * 0.32, y - R * 0.1, R * 0.64, R * 0.2);
  }

  // ===================== НЕБО: 1024×1024, непрозрачное =====================
  P.sky = function () {
    const W = 1024, H = 1024, c = cv(W, H), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2f8fdb'); gr.addColorStop(0.55, '#7cc4ef'); gr.addColorStop(0.85, '#c4e8f6'); gr.addColorStop(1, '#eef7f2');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const clouds = [[170, 170, 1.0, 1], [640, 110, 0.8, -1], [880, 300, 0.95, 1], [380, 360, 0.75, -1], [120, 520, 0.6, 1], [760, 560, 0.55, -1]];
    for (const [x, y, s, dir] of clouds) cloud(g, x, y, s, dir);
    return c;
  };

  function cloud(g, x, y, s, dir) {
    g.save(); g.translate(x, y); g.scale(s * dir, s);
    const parts = [ell(0, 22, 120, 26), circ(-60, 4, 34), circ(-12, -14, 46), circ(44, 0, 36), circ(86, 14, 24)];
    blob(g, parts, '#ffffff', '#8fbfe0', 3);
    g.save();
    const sh = g.createLinearGradient(0, -10, 0, 48);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(160,200,232,0.55)');
    g.fillStyle = sh;
    for (const p of parts) g.fill(p);
    g.restore();
    // завитки
    g.strokeStyle = '#8fbfe0'; g.lineWidth = 4; g.lineCap = 'round';
    spiral(g, -60, 6, 24, 1.6, 1, Math.PI);
    spiral(g, 44, 2, 22, 1.5, -1, 0);
    g.beginPath(); g.moveTo(-118, 30); g.quadraticCurveTo(-150, 34, -168, 22); g.stroke();
    spiral(g, -176, 12, 12, 1.4, 1, 0.3);
    g.restore();
  }

  // ===================== ГОРЫ КОПЕТДАГ: 2048×512 =====================
  P.mountains = function () {
    const W = 2048, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(7);
    const craggy = (terms) => { const f = periodic(W, terms); return x => f(x) - 0.5 * Math.abs(periodic(W, [[terms[2][0] * 2, terms[2][1], terms[2][2]]])(x)); };
    const layers = [
      { base: 215, f: craggy([[2, 46, r() * 6], [5, 30, r() * 6], [13, 16, r() * 6], [29, 5, r() * 6]]), c0: '#c3b6d8', c1: '#d9c7c4', ink: '#8a7aa0', lit: 'rgba(255,245,250,0.45)' },
      { base: 300, f: craggy([[3, 48, r() * 6], [7, 26, r() * 6], [17, 14, r() * 6], [37, 4, r() * 6]]), c0: '#a28cb4', c1: '#c3a597', ink: '#6e5a80', lit: 'rgba(255,240,235,0.4)' },
      { base: 370, f: craggy([[4, 34, r() * 6], [9, 18, r() * 6], [21, 10, r() * 6], [47, 3, r() * 6]]), c0: '#8a6f8c', c1: '#a9856f', ink: '#57405a', lit: 'rgba(255,235,220,0.35)' }
    ];
    for (const L of layers) {
      const y = x => L.base + L.f(x);
      const gr = g.createLinearGradient(0, L.base - 80, 0, H);
      gr.addColorStop(0, L.c0); gr.addColorStop(1, L.c1);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) g.lineTo(x, y(x));
      g.lineTo(W, H); g.closePath(); g.fill();
      // освещённые склоны (солнце слева)
      for (let x = 0; x < W; x += 3) {
        const d = y(x + 3) - y(x);
        const yy = y(x), hh = 70;
        const sg = g.createLinearGradient(0, yy, 0, yy + hh);
        if (d < -0.3) { sg.addColorStop(0, L.lit); sg.addColorStop(1, 'rgba(255,240,235,0)'); g.globalAlpha = Math.min(0.8, -d * 0.25); }
        else if (d > 0.3) { sg.addColorStop(0, 'rgba(60,35,60,0.22)'); sg.addColorStop(1, 'rgba(60,35,60,0)'); g.globalAlpha = Math.min(0.8, d * 0.25); }
        else continue;
        g.fillStyle = sg; g.fillRect(x, yy, 3, hh);
      }
      g.globalAlpha = 1;
      // складки
      g.strokeStyle = L.ink; g.globalAlpha = 0.35; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 40; i++) {
        const x = r() * W, y0 = y(x) + 8, l = 30 + r() * 70, dx = (r() - 0.5) * 30;
        wrap(W, o => { g.beginPath(); g.moveTo(x + o, y0); g.quadraticCurveTo(x + o + dx * 0.2, y0 + l * 0.6, x + o + dx, y0 + l); g.stroke(); });
      }
      g.globalAlpha = 1;
      // контур хребта
      g.strokeStyle = L.ink; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); for (let x = 0; x <= W; x += 3) { x ? g.lineTo(x, y(x)) : g.moveTo(x, y(x)); } g.stroke();
    }
    return c;
  };

  // ===================== БАРХАНЫ: 2048×512 =====================
  P.dunes = function () {
    const W = 2048, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(21);
    const layers = [
      { base: 290, f: periodic(W, [[3, 36, r() * 6], [6, 18, r() * 6], [13, 7, r() * 6]]), c0: '#f1cb8c', c1: '#e0ae6a' },
      { base: 380, f: periodic(W, [[4, 30, r() * 6], [9, 14, r() * 6], [19, 5, r() * 6]]), c0: '#e7b874', c1: '#cf975a' }
    ];
    layers.forEach((L, li) => {
      const y = x => L.base + L.f(x);
      const gr = g.createLinearGradient(0, L.base - 60, 0, H);
      gr.addColorStop(0, L.c0); gr.addColorStop(1, L.c1);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 3) g.lineTo(x, y(x));
      g.lineTo(W, H); g.closePath(); g.fill();
      for (let x = 0; x < W; x += 3) {
        const d = y(x + 3) - y(x);
        if (d > 0) { g.fillStyle = 'rgba(160,95,45,' + Math.min(0.3, d * 0.2).toFixed(3) + ')'; g.fillRect(x, y(x), 3, 80); }
      }
      // волнистые линии ветра на песке
      g.strokeStyle = 'rgba(170,110,55,0.35)'; g.lineWidth = 2; g.lineCap = 'round';
      for (let i = 0; i < 50; i++) {
        const x = r() * W, yy = y(x) + 18 + r() * 60, l = 30 + r() * 60;
        wrap(W, o => { g.beginPath(); g.moveTo(x + o, yy); g.quadraticCurveTo(x + o + l / 2, yy - 6, x + o + l, yy); g.stroke(); });
      }
      g.strokeStyle = '#fbe6b8'; g.lineWidth = 3;
      g.beginPath(); for (let x = 0; x <= W; x += 3) { x ? g.lineTo(x, y(x) + 2) : g.moveTo(x, y(x) + 2); } g.stroke();
      g.strokeStyle = '#a86f35'; g.lineWidth = 2.5;
      g.beginPath(); for (let x = 0; x <= W; x += 3) { x ? g.lineTo(x, y(x)) : g.moveTo(x, y(x)); } g.stroke();
      // далёкий саксаул
      for (let i = 0; i < 6; i++) {
        const x = r() * W, s = li ? 0.32 : 0.22;
        wrap(W, o => saxaul(g, x + o, y(x) + 8, s, seeded(100 + i + li * 10), 0.75));
      }
    });
    return c;
  };

  // ===================== ПЕРЕДНИЙ ПЛАН: 2048×320, линия бега y=96 =====================
  P.ground = function () {
    const W = 2048, H = 320, S = 96, c = cv(W, H), g = c.getContext('2d'), r = seeded(33);
    const gr = g.createLinearGradient(0, S, 0, H);
    gr.addColorStop(0, '#edc98e'); gr.addColorStop(1, '#cf9c5c');
    g.fillStyle = gr; g.fillRect(0, S, W, H - S);
    g.fillStyle = '#f8e2b0'; g.fillRect(0, S, W, 5);
    g.fillStyle = '#9b6a36'; g.fillRect(0, S - 1, W, 2);
    g.fillStyle = 'rgba(155,106,54,0.25)'; g.fillRect(0, S + 5, W, 3);
    g.lineCap = 'round';
    // рябь
    for (let i = 0; i < 220; i++) {
      const x = r() * W, y = S + 16 + r() * (H - S - 24), l = 18 + r() * 44, a = 0.15 + r() * 0.2;
      g.strokeStyle = 'rgba(160,105,55,' + a.toFixed(2) + ')'; g.lineWidth = 2;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + l / 2, y - 5, x + o + l, y); g.stroke(); });
    }
    // камешки с контуром
    for (let i = 0; i < 60; i++) {
      const x = r() * W, y = S + 12 + r() * (H - S - 16), rr = 2.5 + r() * 5, col = r() < 0.5 ? '#a8917a' : '#c2a888';
      wrap(W, o => { g.beginPath(); g.ellipse(x + o, y, rr * 1.4, rr, 0, 0, TAU); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(90,60,30,0.6)'; g.lineWidth = 1.2; g.stroke(); });
    }
    // кустики колючки у линии бега
    for (let i = 0; i < 24; i++) {
      const x = r() * W, h = 8 + r() * 8;
      wrap(W, o => tuft(g, x + o, S + 1, h));
    }
    // саксаул на переднем плане (ниже линии бега)
    for (let i = 0; i < 5; i++) {
      const x = 200 + i * (W / 5) + (r() - 0.5) * 140, s = 0.5 + r() * 0.15;
      wrap(W, o => saxaul(g, x + o, H + 10, s, seeded(300 + i), 1));
    }
    return c;
  };

  function tuft(g, x, y, h) {
    g.lineCap = 'round';
    g.strokeStyle = '#6b5a2c'; g.lineWidth = 3.4;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 2, y - h * 0.6, x + k * 3.4, y - h); g.stroke(); }
    g.strokeStyle = '#a99a52'; g.lineWidth = 1.8;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 2, y - h * 0.6, x + k * 3.4, y - h); g.stroke(); }
  }

  // Саксаул: корявый ствол с контуром и пышная крона из зелёных клубков
  function saxaul(g, x, y, s, r, alpha) {
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = alpha;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const segs = [], tips = [];
    function branch(px, py, ang, len, w, depth) {
      const bend = (r() - 0.5) * 0.7;
      const mx = px + Math.cos(ang + bend) * len * 0.5, my = py + Math.sin(ang + bend) * len * 0.5;
      const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      segs.push([px, py, mx, my, ex, ey, w]);
      if (depth <= 0) { tips.push([ex, ey]); return; }
      const n = 2 + (r() < 0.3 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * (0.6 + r() * 0.3) + (r() - 0.5) * 0.25;
        branch(ex, ey, a, len * (0.64 + r() * 0.16), w * 0.62, depth - 1);
      }
    }
    branch(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.25, 74, 18, 3);
    // ствол: контур, затем заливка
    for (const sg of segs) { g.strokeStyle = '#3b2414'; g.lineWidth = sg[6] + 5; g.beginPath(); g.moveTo(sg[0], sg[1]); g.quadraticCurveTo(sg[2], sg[3], sg[4], sg[5]); g.stroke(); }
    for (const sg of segs) { g.strokeStyle = '#7a5434'; g.lineWidth = sg[6]; g.beginPath(); g.moveTo(sg[0], sg[1]); g.quadraticCurveTo(sg[2], sg[3], sg[4], sg[5]); g.stroke(); }
    for (const sg of segs) if (sg[6] > 6) { g.strokeStyle = 'rgba(255,220,170,0.35)'; g.lineWidth = sg[6] * 0.25; g.beginPath(); g.moveTo(sg[0] - sg[6] * 0.2, sg[1]); g.quadraticCurveTo(sg[2] - sg[6] * 0.2, sg[3], sg[4] - sg[6] * 0.2, sg[5]); g.stroke(); }
    // крона
    const balls = [];
    for (const t of tips) {
      const n = 2 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) balls.push(circ(t[0] + (r() - 0.5) * 30, t[1] + (r() - 0.5) * 18 - 4, 13 + r() * 9));
    }
    blob(g, balls, '#6d9a3c', '#2f4a1c', 2.6);
    g.fillStyle = '#93c05a';
    for (const t of tips) { g.beginPath(); g.ellipse(t[0] - 5, t[1] - 12, 8, 5, -0.4, 0, TAU); g.fill(); }
    // свисающие побеги
    g.strokeStyle = '#4e7a2c'; g.lineWidth = 2;
    for (const t of tips) for (let k = 0; k < 4; k++) {
      const dx = (r() - 0.5) * 30;
      g.beginPath(); g.moveTo(t[0] + dx * 0.5, t[1] + 6); g.quadraticCurveTo(t[0] + dx, t[1] + 14, t[0] + dx * 1.2, t[1] + 22 + r() * 8); g.stroke();
    }
    g.restore();
  }

  // ===================== САКСАУЛ (препятствие): 256×256 =====================
  P.saxaul = function () {
    const c = cv(256, 256), g = c.getContext('2d');
    saxaul(g, 128, 250, 1.0, seeded(5), 1);
    return c;
  };

  // ===================== КАМЕНЬ: 256×192 =====================
  P.rock = function () {
    const c = cv(256, 192), g = c.getContext('2d');
    const out = [[14, 189], [22, 140], [52, 92], [96, 60], [150, 52], [196, 76], [228, 120], [242, 189]];
    const path = new Path2D(); path.moveTo(out[0][0], out[0][1]); for (const p of out) path.lineTo(p[0], p[1]); path.closePath();
    g.lineJoin = 'round';
    g.fillStyle = '#a2917f'; g.fill(path);
    g.save(); g.clip(path);
    // грани
    const face = (pts, col) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = col; g.fill(); };
    face([[22, 140], [52, 92], [96, 60], [118, 108], [70, 150]], '#c9b8a5');
    face([[96, 60], [150, 52], [140, 100], [118, 108]], '#dccbb8');
    face([[150, 52], [196, 76], [228, 120], [170, 128], [140, 100]], '#b3a08c');
    face([[228, 120], [242, 189], [150, 189], [170, 128]], '#7e6d5e');
    face([[70, 150], [118, 108], [170, 128], [150, 189], [40, 189]], '#958271');
    g.strokeStyle = 'rgba(70,52,40,0.55)'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(118, 108); g.lineTo(96, 60); g.moveTo(118, 108); g.lineTo(140, 100); g.lineTo(150, 52);
    g.moveTo(140, 100); g.lineTo(170, 128); g.lineTo(228, 120); g.moveTo(170, 128); g.lineTo(150, 189); g.moveTo(118, 108); g.lineTo(70, 150); g.stroke();
    // трещина и мох
    g.strokeStyle = 'rgba(60,45,35,0.7)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(190, 140); g.lineTo(200, 160); g.lineTo(194, 178); g.stroke();
    g.fillStyle = 'rgba(120,140,70,0.5)'; g.beginPath(); g.ellipse(60, 180, 26, 8, 0, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = '#3f3027'; g.lineWidth = 5; g.stroke(path);
    return c;
  };

  // ===================== ПЕРЕКАТИ-ПОЛЕ: 256×256 =====================
  P.tumbleweed = function () {
    const c = cv(256, 256), g = c.getContext('2d'), r = seeded(13);
    g.translate(128, 128); g.lineCap = 'round';
    g.fillStyle = 'rgba(190,150,90,0.25)'; g.beginPath(); g.arc(0, 0, 104, 0, TAU); g.fill();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < 110; i++) {
        const a0 = r() * TAU, rr = 24 + r() * 82, span = 0.7 + r() * 1.5, ox = (r() - 0.5) * 26, oy = (r() - 0.5) * 26;
        g.strokeStyle = pass ? (r() < 0.5 ? '#c79a5c' : '#a77a43') : '#5a3c1e';
        g.lineWidth = pass ? 2 + r() * 2 : 5;
        g.beginPath(); g.arc(ox, oy, rr, a0, a0 + span); g.stroke();
      }
    }
    g.strokeStyle = '#5a3c1e'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + 0.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 96, Math.sin(a) * 96); g.stroke(); }
    return c;
  };

  // ===================== ЯМА: 512×128 =====================
  P.pit = function () {
    const W = 512, H = 128, c = cv(W, H), g = c.getContext('2d'), r = seeded(17);
    const hole = new Path2D();
    hole.moveTo(0, 0); hole.lineTo(W, 0);
    for (let y = 0; y <= H; y += 12) hole.lineTo(W - 10 - y * 0.42 - r() * 10, y);
    for (let y = H; y >= 0; y -= 12) hole.lineTo(10 + y * 0.42 + r() * 10, y);
    hole.closePath();
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#8a5a2e'); gr.addColorStop(0.3, '#4a2c14'); gr.addColorStop(1, '#140b05');
    g.fillStyle = gr; g.fill(hole);
    g.save(); g.clip(hole);
    // слои грунта на стенках
    g.strokeStyle = 'rgba(200,150,90,0.35)'; g.lineWidth = 3;
    for (let k = 1; k < 4; k++) { const y = k * 22; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + k) * 3); g.stroke(); }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 4; g.stroke(hole);
    g.fillStyle = '#f8e2b0'; g.fillRect(0, 0, 36, 5); g.fillRect(W - 36, 0, 36, 5);
    g.fillStyle = 'rgba(230,190,130,0.9)';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(40 + r() * (W - 80), 6 + r() * H * 0.7, 1.5 + r() * 2.5, 0, TAU); g.fill(); }
    return c;
  };

  // ===================== ДЫНЯ (гаwун): 128×128 =====================
  P.melon = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    const body = ell(64, 72, 54, 38, -0.12);
    const gr = g.createRadialGradient(48, 56, 6, 64, 72, 60);
    gr.addColorStop(0, '#fff3a8'); gr.addColorStop(0.6, '#f4cc45'); gr.addColorStop(1, '#cf951c');
    g.fillStyle = gr; g.fill(body);
    g.save(); g.clip(body);
    g.strokeStyle = 'rgba(150,105,25,0.55)'; g.lineWidth = 1.6;
    for (let i = -7; i <= 7; i++) {
      g.beginPath(); g.moveTo(64 + i * 9 - 34, 24); g.quadraticCurveTo(64 + i * 9, 72, 64 + i * 9 + 34, 120); g.stroke();
      g.beginPath(); g.moveTo(64 + i * 9 + 34, 24); g.quadraticCurveTo(64 + i * 9, 72, 64 + i * 9 - 34, 120); g.stroke();
    }
    g.strokeStyle = 'rgba(120,150,40,0.45)'; g.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(64, 72, Math.abs(i) * 16 + 4, 38, -0.12, 0, TAU); g.stroke(); }
    g.restore();
    g.strokeStyle = '#7a4f10'; g.lineWidth = 4; g.stroke(body);
    // хвостик и лист
    g.lineCap = 'round'; g.strokeStyle = '#5a3a14'; g.lineWidth = 6;
    g.beginPath(); g.moveTo(14, 66); g.quadraticCurveTo(4, 52, 12, 40); g.stroke();
    g.fillStyle = '#5e9a34'; g.strokeStyle = '#2f4a1c'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(12, 42); g.quadraticCurveTo(30, 18, 50, 26); g.quadraticCurveTo(34, 46, 12, 42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(46, 56, 14, 6, -0.5, 0, TAU); g.fill();
    return c;
  };

  // ===================== ВОДА В БУРДЮКЕ: 128×128 =====================
  P.water = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    g.lineCap = 'round';
    g.strokeStyle = '#3b230e'; g.lineWidth = 7; g.beginPath(); g.arc(64, 46, 34, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.strokeStyle = '#8a5a2b'; g.lineWidth = 3.5; g.beginPath(); g.arc(64, 46, 34, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    const bag = new Path2D();
    bag.moveTo(52, 26); bag.lineTo(76, 26);
    bag.quadraticCurveTo(78, 44, 102, 60); bag.quadraticCurveTo(122, 82, 106, 106);
    bag.quadraticCurveTo(64, 126, 22, 106); bag.quadraticCurveTo(6, 82, 26, 60);
    bag.quadraticCurveTo(50, 44, 52, 26); bag.closePath();
    const gr = g.createRadialGradient(52, 70, 8, 64, 82, 58);
    gr.addColorStop(0, '#c48a4e'); gr.addColorStop(1, '#6a4120');
    g.fillStyle = gr; g.fill(bag);
    // ковровая полоса с гёлем
    g.save(); g.clip(bag);
    g.fillStyle = RED; g.fillRect(0, 70, 128, 28);
    g.fillStyle = GOLD; g.fillRect(0, 68, 128, 3); g.fillRect(0, 97, 128, 3);
    gul(g, 64, 84, 14, '#7e1711', GOLD, RED);
    for (const x of [28, 100]) { g.fillStyle = GREEN; g.beginPath(); g.moveTo(x, 76); g.lineTo(x + 7, 84); g.lineTo(x, 92); g.lineTo(x - 7, 84); g.closePath(); g.fill(); }
    g.restore();
    g.strokeStyle = '#3b230e'; g.lineWidth = 4; g.stroke(bag);
    g.strokeStyle = CREAM; g.lineWidth = 5; g.beginPath(); g.moveTo(50, 34); g.lineTo(78, 34); g.stroke();
    g.strokeStyle = '#3b230e'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(50, 34); g.lineTo(78, 34); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,240,210,0.35)'; g.beginPath(); g.ellipse(42, 56, 10, 5, -0.6, 0, TAU); g.fill();
    // капля
    const drop = new Path2D(); drop.moveTo(106, 2); drop.quadraticCurveTo(124, 26, 114, 36); drop.arc(106, 28, 11, 0.6, Math.PI - 0.6); drop.quadraticCurveTo(88, 26, 106, 2);
    g.fillStyle = '#3fa9f0'; g.fill(drop); g.strokeStyle = '#0d5e9a'; g.lineWidth = 2.5; g.stroke(drop);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(102, 26, 3, 5, 0.3, 0, TAU); g.fill();
    return c;
  };

  // ===================== ЗОЛОТАЯ МОНЕТА: 128×128 =====================
  P.coin = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    const gr = g.createRadialGradient(46, 42, 6, 64, 64, 62);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.5, '#f7cd47'); gr.addColorStop(1, '#bb8214');
    g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
    g.strokeStyle = '#7a520a'; g.lineWidth = 5; g.stroke();
    g.strokeStyle = '#a8740f'; g.lineWidth = 2.5; g.beginPath(); g.arc(64, 64, 47, 0, TAU); g.stroke();
    g.fillStyle = '#a8740f';
    for (let i = 0; i < 24; i++) { const a = i * TAU / 24; g.beginPath(); g.arc(64 + Math.cos(a) * 52.5, 64 + Math.sin(a) * 52.5, 1.8, 0, TAU); g.fill(); }
    star8(g, 64, 64, 38, 28); g.fillStyle = '#eab33a'; g.fill(); g.strokeStyle = '#7a520a'; g.lineWidth = 2.5; g.stroke();
    g.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g.lineTo(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18); }
    g.closePath(); g.fillStyle = RED; g.fill(); g.strokeStyle = '#7a520a'; g.lineWidth = 2; g.stroke();
    g.fillStyle = GOLD; g.beginPath(); g.moveTo(64, 54); g.lineTo(74, 64); g.lineTo(64, 74); g.lineTo(54, 64); g.closePath(); g.fill();
    g.fillStyle = RED_D; g.fillRect(62, 60, 4, 8); g.fillRect(60, 62, 8, 4);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(44, 38, 14, 6, -0.7, 0, TAU); g.fill();
    return c;
  };

  // ===================== СЕРДЦЕ (жизнь): 64×64 =====================
  P.heart = function () {
    const c = cv(64, 64), g = c.getContext('2d');
    const h = new Path2D();
    h.moveTo(32, 57);
    h.bezierCurveTo(4, 39, 3, 12, 19, 9); h.bezierCurveTo(27, 8, 32, 15, 32, 20);
    h.bezierCurveTo(32, 15, 37, 8, 45, 9); h.bezierCurveTo(61, 12, 60, 39, 32, 57);
    h.closePath();
    const gr = g.createLinearGradient(0, 8, 0, 57); gr.addColorStop(0, '#e9453c'); gr.addColorStop(1, '#a3180f');
    g.fillStyle = gr; g.fill(h);
    g.save(); g.clip(h);
    g.fillStyle = GOLD; g.beginPath(); g.moveTo(32, 22); g.lineTo(42, 32); g.lineTo(32, 42); g.lineTo(22, 32); g.closePath(); g.fill();
    g.fillStyle = GREEN; g.beginPath(); g.moveTo(32, 26); g.lineTo(38, 32); g.lineTo(32, 38); g.lineTo(26, 32); g.closePath(); g.fill();
    g.fillStyle = GOLD; g.fillRect(31, 30, 2, 4); g.fillRect(30, 31, 4, 2);
    g.restore();
    g.strokeStyle = '#5c0e09'; g.lineWidth = 3.5; g.lineJoin = 'round'; g.stroke(h);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(19, 19, 6, 3.5, -0.6, 0, TAU); g.fill();
    return c;
  };

  // ===================== ПЕСЧАНАЯ БУРЯ: 1024×512, полупрозрачная =====================
  P.sandstorm = function () {
    const W = 1024, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(41);
    g.lineCap = 'round';
    for (let i = 0; i < 340; i++) {
      const x = r() * W, y = r() * H, l = 30 + r() * 180, j = (r() - 0.5) * 8, a = 0.15 + r() * 0.4, w = 1 + r() * 3.5;
      g.strokeStyle = 'rgba(236,196,128,' + a.toFixed(2) + ')'; g.lineWidth = w;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + l / 2, y + j, x + o + l, y); g.stroke(); });
    }
    // завитки ветра
    for (let i = 0; i < 14; i++) {
      const x = r() * W, y = 40 + r() * (H - 80), rr = 14 + r() * 22, a = 0.25 + r() * 0.25;
      g.strokeStyle = 'rgba(245,215,160,' + a.toFixed(2) + ')'; g.lineWidth = 3;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o - rr * 4, y + rr); g.quadraticCurveTo(x + o - rr * 2, y + rr * 1.1, x + o, y + rr); g.stroke(); spiral(g, x + o, y, rr, 1.4, -1, Math.PI / 2); });
    }
    for (let i = 0; i < 800; i++) {
      g.fillStyle = 'rgba(210,165,100,' + (0.2 + r() * 0.5).toFixed(2) + ')';
      g.fillRect(r() * W, r() * H, 2, 2);
    }
    return c;
  };
})();
