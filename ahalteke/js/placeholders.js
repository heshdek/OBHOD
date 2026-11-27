// Временные заглушки: рисуются кодом, если PNG в assets/ нет.
// Размеры холстов совпадают с размерами PNG, которые нужно сгенерировать.
(function () {
  const P = AT.ph = {};
  const TAU = Math.PI * 2;

  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function seeded(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }
  // Периодическая функция: бесшовна по ширине W
  function periodic(W, terms) {
    return x => { let s = 0; for (const t of terms) s += t[1] * Math.sin(TAU * t[0] * x / W + t[2]); return s; };
  }
  // Рисует фигуру три раза (x-W, x, x+W), чтобы тайл был бесшовным
  function wrap(W, fn) { fn(-W); fn(0); fn(W); }

  // ---------- Горы Копетдаг: 2048×512, прозрачный фон ----------
  P.mountains = function () {
    const W = 2048, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(7);
    const far = periodic(W, [[2, 42, r() * 6], [5, 26, r() * 6], [11, 12, r() * 6], [23, 6, r() * 6], [47, 3, r() * 6]]);
    const near = periodic(W, [[3, 46, r() * 6], [7, 22, r() * 6], [13, 12, r() * 6], [29, 6, r() * 6], [61, 2.5, r() * 6]]);

    let gr = g.createLinearGradient(0, 150, 0, H);
    gr.addColorStop(0, '#aeaac6'); gr.addColorStop(1, '#cdbdb6');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, 225 + far(x));
    g.lineTo(W, H); g.closePath(); g.fill();

    gr = g.createLinearGradient(0, 260, 0, H);
    gr.addColorStop(0, '#907f90'); gr.addColorStop(1, '#b89c87');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) g.lineTo(x, 330 + near(x));
    g.lineTo(W, H); g.closePath(); g.fill();

    // овраги и складки
    g.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const x = r() * W, len = 40 + r() * 110, dx = (r() - 0.5) * 40, far1 = r() < 0.4;
      const y0 = (far1 ? 225 + far(x) : 330 + near(x)) + 4;
      g.strokeStyle = far1 ? 'rgba(90,80,110,0.16)' : 'rgba(70,50,60,0.22)';
      g.lineWidth = 2 + r() * 3;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o, y0); g.quadraticCurveTo(x + o + dx * 0.3, y0 + len * 0.5, x + o + dx, y0 + len); g.stroke(); });
    }
    // светлая кромка хребтов
    g.strokeStyle = 'rgba(255,240,225,0.35)'; g.lineWidth = 2;
    g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = 330 + near(x); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    return c;
  };

  // ---------- Барханы: 2048×512, прозрачный фон ----------
  P.dunes = function () {
    const W = 2048, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(21);
    const layers = [
      { base: 300, f: periodic(W, [[3, 34, r() * 6], [6, 18, r() * 6], [13, 7, r() * 6]]), c0: '#ecc688', c1: '#dcae6a' },
      { base: 385, f: periodic(W, [[4, 28, r() * 6], [9, 13, r() * 6], [17, 5, r() * 6]]), c0: '#e2b673', c1: '#c99558' }
    ];
    for (const L of layers) {
      const gr = g.createLinearGradient(0, L.base - 60, 0, H);
      gr.addColorStop(0, L.c0); gr.addColorStop(1, L.c1);
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) g.lineTo(x, L.base + L.f(x));
      g.lineTo(W, H); g.closePath(); g.fill();
      // тень на подветренной стороне
      for (let x = 0; x < W; x += 3) {
        const y = L.base + L.f(x), d = L.f(x + 3) - L.f(x);
        if (d > 0) { g.fillStyle = 'rgba(150,95,50,' + Math.min(0.32, d * 0.22).toFixed(3) + ')'; g.fillRect(x, y, 3, 70); }
      }
      g.strokeStyle = 'rgba(255,242,205,0.55)'; g.lineWidth = 2;
      g.beginPath(); for (let x = 0; x <= W; x += 4) { const y = L.base + L.f(x) + 1; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
    // далёкий саксаул на барханах
    for (let i = 0; i < 9; i++) {
      const x = r() * W, L = layers[i % 2], y = L.base + L.f(x) + 6, s = 0.25 + r() * 0.2;
      wrap(W, o => drawSaxaul(g, x + o, y, s, seeded(100 + i), 'rgba(110,100,70,0.55)', 'rgba(120,135,90,0.55)'));
    }
    return c;
  };

  // ---------- Передний план: 2048×320. Линия бега на y=96. Сверху прозрачно ----------
  P.ground = function () {
    const W = 2048, H = 320, S = 96, c = cv(W, H), g = c.getContext('2d'), r = seeded(33);
    const gr = g.createLinearGradient(0, S, 0, H);
    gr.addColorStop(0, '#e6c283'); gr.addColorStop(1, '#c99a58');
    g.fillStyle = gr; g.fillRect(0, S, W, H - S);
    g.fillStyle = '#f3d79e'; g.fillRect(0, S, W, 5);
    g.fillStyle = 'rgba(150,100,50,0.25)'; g.fillRect(0, S + 5, W, 2);
    // рябь на песке
    g.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const x = r() * W, y = S + 14 + r() * (H - S - 20), l = 14 + r() * 40;
      g.strokeStyle = 'rgba(150,100,55,' + (0.12 + r() * 0.18).toFixed(2) + ')'; g.lineWidth = 1.5 + r() * 1.5;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + l / 2, y - 4, x + o + l, y); g.stroke(); });
    }
    // камешки
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = S + 10 + r() * (H - S - 14), rr = 2 + r() * 5;
      g.fillStyle = r() < 0.5 ? '#9c8366' : '#b39874';
      wrap(W, o => { g.beginPath(); g.ellipse(x + o, y, rr * 1.4, rr, 0, 0, TAU); g.fill(); });
    }
    // мелкая верблюжья колючка у линии бега
    for (let i = 0; i < 26; i++) {
      const x = r() * W, h = 6 + r() * 6;
      wrap(W, o => tuft(g, x + o, S + 2, h, '#9a8a55'));
    }
    // саксаул на переднем плане (ниже линии бега, ближе к зрителю)
    for (let i = 0; i < 6; i++) {
      const x = 170 + i * (W / 6) + (r() - 0.5) * 120, s = 0.42 + r() * 0.18;
      wrap(W, o => drawSaxaul(g, x + o, H + 6, s, seeded(300 + i), '#6d5a45', '#7f9257'));
    }
    return c;
  };

  function tuft(g, x, y, h, col) {
    g.strokeStyle = col; g.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + k * 2, y - h * 0.6, x + k * 3.2, y - h); g.stroke(); }
  }

  // Саксаул: корявый ствол, ветви, свисающие зелёные побеги
  function drawSaxaul(g, x, y, s, r, trunkCol, leafCol) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const tips = [];
    function branch(px, py, ang, len, w, depth) {
      const bend = (r() - 0.5) * 0.6;
      const mx = px + Math.cos(ang + bend) * len * 0.5, my = py + Math.sin(ang + bend) * len * 0.5;
      const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len;
      g.strokeStyle = trunkCol; g.lineWidth = w;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      if (depth <= 0) { tips.push([ex, ey]); return; }
      const n = 2 + (r() < 0.35 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const a = ang + (i - (n - 1) / 2) * (0.55 + r() * 0.35) + (r() - 0.5) * 0.3;
        branch(ex, ey, a, len * (0.62 + r() * 0.2), w * 0.62, depth - 1);
      }
    }
    branch(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.3, 70, 16, 3);
    // побеги
    g.strokeStyle = leafCol; g.lineWidth = 2.2;
    for (const t of tips) {
      for (let k = 0; k < 9; k++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.6, l = 14 + r() * 22;
        const ex = t[0] + Math.cos(a) * l, ey = t[1] + Math.sin(a) * l * 0.6;
        g.beginPath(); g.moveTo(t[0], t[1]); g.quadraticCurveTo((t[0] + ex) / 2, Math.min(t[1], ey) - 8, ex, ey + 10); g.stroke();
      }
    }
    g.restore();
  }

  // ---------- Препятствие «саксаул»: 256×256, прозрачный фон, стоит на нижнем крае ----------
  P.saxaul = function () {
    const c = cv(256, 256), g = c.getContext('2d');
    drawSaxaul(g, 128, 254, 1.05, seeded(5), '#5e4b3a', '#7c9150');
    // светлые штрихи на побегах
    return c;
  };

  // ---------- Камень: 256×192 ----------
  P.rock = function () {
    const c = cv(256, 192), g = c.getContext('2d'), r = seeded(9);
    const pts = [];
    for (let i = 0; i < 11; i++) {
      const a = Math.PI + (i / 10) * Math.PI;
      const rx = 112 * (0.85 + r() * 0.15), ry = 150 * (0.8 + r() * 0.2);
      pts.push([128 + Math.cos(a) * rx, 190 + Math.sin(a) * ry]);
    }
    const gr = g.createLinearGradient(0, 40, 0, 192);
    gr.addColorStop(0, '#b2a291'); gr.addColorStop(1, '#6c5f54');
    g.fillStyle = gr; g.strokeStyle = '#4c423a'; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(pts[0][0], 191);
    for (const p of pts) g.lineTo(p[0], p[1]);
    g.lineTo(pts[pts.length - 1][0], 191); g.closePath(); g.fill(); g.stroke();
    // грани
    g.fillStyle = 'rgba(255,245,230,0.22)';
    g.beginPath(); g.moveTo(pts[3][0], pts[3][1]); g.lineTo(pts[5][0], pts[5][1]); g.lineTo(140, 120); g.lineTo(90, 130); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,30,25,0.22)';
    g.beginPath(); g.moveTo(pts[7][0], pts[7][1]); g.lineTo(pts[9][0], pts[9][1]); g.lineTo(230, 190); g.lineTo(150, 190); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(50,40,35,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(120, 80); g.lineTo(132, 120); g.lineTo(122, 150); g.stroke();
    return c;
  };

  // ---------- Перекати-поле: 256×256 ----------
  P.tumbleweed = function () {
    const c = cv(256, 256), g = c.getContext('2d'), r = seeded(13);
    g.translate(128, 128); g.lineCap = 'round';
    for (let i = 0; i < 150; i++) {
      const a0 = r() * TAU, rr = 30 + r() * 80, span = 0.6 + r() * 1.6;
      g.strokeStyle = r() < 0.5 ? 'rgba(176,138,85,0.9)' : 'rgba(128,96,58,0.9)';
      g.lineWidth = 1.5 + r() * 3;
      g.beginPath(); g.arc((r() - 0.5) * 30, (r() - 0.5) * 30, rr, a0, a0 + span); g.stroke();
    }
    g.strokeStyle = 'rgba(110,80,45,0.9)'; g.lineWidth = 3;
    for (let i = 0; i < 10; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 100, Math.sin(a) * 100); g.stroke(); }
    return c;
  };

  // ---------- Яма: 512×128, верхний край = поверхность песка ----------
  P.pit = function () {
    const W = 512, H = 128, c = cv(W, H), g = c.getContext('2d'), r = seeded(17);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
    for (let y = 0; y <= H; y += 16) g.lineTo(W - 16 - y * 0.35 - r() * 12, y);
    for (let y = H; y >= 0; y -= 16) g.lineTo(16 + y * 0.35 + r() * 12, y);
    g.closePath();
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#6e4826'); gr.addColorStop(0.35, '#2e1d0f'); gr.addColorStop(1, '#0f0905');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = '#f0d49a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 2); g.lineTo(40, 2); g.moveTo(W - 40, 2); g.lineTo(W, 2); g.stroke();
    g.fillStyle = 'rgba(210,170,110,0.8)';
    for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(30 + r() * (W - 60), r() * H * 0.8, 1 + r() * 2.5, 0, TAU); g.fill(); }
    return c;
  };

  // ---------- Дыня: 128×128 ----------
  P.melon = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    const gr = g.createRadialGradient(50, 52, 6, 64, 68, 60);
    gr.addColorStop(0, '#fff2a6'); gr.addColorStop(0.6, '#f2c94c'); gr.addColorStop(1, '#c8921d');
    g.fillStyle = gr; g.beginPath(); g.ellipse(64, 70, 54, 40, -0.15, 0, TAU); g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(160,120,40,0.55)'; g.lineWidth = 1.6;
    for (let i = -6; i <= 6; i++) {
      g.beginPath(); g.moveTo(64 + i * 10 - 30, 20); g.quadraticCurveTo(64 + i * 10, 70, 64 + i * 10 + 30, 120); g.stroke();
      g.beginPath(); g.moveTo(64 + i * 10 + 30, 20); g.quadraticCurveTo(64 + i * 10, 70, 64 + i * 10 - 30, 120); g.stroke();
    }
    g.restore();
    g.strokeStyle = '#a5741a'; g.lineWidth = 3; g.beginPath(); g.ellipse(64, 70, 54, 40, -0.15, 0, TAU); g.stroke();
    g.strokeStyle = '#6b4a1e'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(14, 64); g.quadraticCurveTo(6, 52, 12, 44); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(46, 52, 14, 7, -0.5, 0, TAU); g.fill();
    return c;
  };

  // ---------- Вода в бурдюке: 128×128 ----------
  P.water = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    g.strokeStyle = '#4a2d14'; g.lineWidth = 4; g.beginPath(); g.arc(64, 44, 34, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    const gr = g.createRadialGradient(54, 70, 8, 64, 80, 56);
    gr.addColorStop(0, '#b5773f'); gr.addColorStop(1, '#5c3818');
    g.fillStyle = gr; g.strokeStyle = '#3b230e'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(54, 26); g.lineTo(74, 26);
    g.quadraticCurveTo(76, 44, 100, 62); g.quadraticCurveTo(118, 82, 104, 104);
    g.quadraticCurveTo(64, 124, 24, 104); g.quadraticCurveTo(10, 82, 28, 62);
    g.quadraticCurveTo(52, 44, 54, 26); g.closePath(); g.fill(); g.stroke();
    // шнур на горлышке
    g.strokeStyle = '#e8d3a0'; g.lineWidth = 4; g.beginPath(); g.moveTo(52, 34); g.lineTo(76, 34); g.stroke();
    // орнамент
    g.fillStyle = '#b3261e'; g.beginPath(); g.moveTo(64, 70); g.lineTo(78, 84); g.lineTo(64, 98); g.lineTo(50, 84); g.closePath(); g.fill();
    g.fillStyle = '#f0c75e'; g.beginPath(); g.moveTo(64, 77); g.lineTo(71, 84); g.lineTo(64, 91); g.lineTo(57, 84); g.closePath(); g.fill();
    g.setLineDash([4, 4]); g.strokeStyle = '#e0c08a'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(26, 98); g.quadraticCurveTo(64, 116, 102, 98); g.stroke(); g.setLineDash([]);
    // капля
    g.fillStyle = '#3fa9f0'; g.strokeStyle = '#0d5e9a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(104, 4); g.quadraticCurveTo(122, 28, 112, 38); g.arc(104, 30, 11, 0.5, Math.PI - 0.5); g.quadraticCurveTo(88, 26, 104, 4); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(100, 28, 3, 5, 0.3, 0, TAU); g.fill();
    return c;
  };

  // ---------- Золотая монета: 128×128 ----------
  P.coin = function () {
    const c = cv(128, 128), g = c.getContext('2d');
    const gr = g.createRadialGradient(48, 44, 6, 64, 64, 62);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#f5c842'); gr.addColorStop(1, '#b77d12');
    g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 58, 0, TAU); g.fill();
    g.strokeStyle = '#8f5f0c'; g.lineWidth = 6; g.stroke();
    g.strokeStyle = 'rgba(143,95,12,0.6)'; g.lineWidth = 2; g.beginPath(); g.arc(64, 64, 46, 0, TAU); g.stroke();
    // восьмиконечная звезда
    g.fillStyle = '#e3a92a'; g.strokeStyle = '#8f5f0c'; g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 - Math.PI / 2, rr = i % 2 ? 18 : 34; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(46, 40, 14, 7, -0.7, 0, TAU); g.fill();
    return c;
  };

  // ---------- Сердце (жизнь): 64×64 ----------
  P.heart = function () {
    const c = cv(64, 64), g = c.getContext('2d');
    g.fillStyle = '#d8322f'; g.strokeStyle = '#7a1210'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(32, 56);
    g.bezierCurveTo(4, 38, 4, 12, 20, 10); g.bezierCurveTo(28, 9, 32, 16, 32, 20);
    g.bezierCurveTo(32, 16, 36, 9, 44, 10); g.bezierCurveTo(60, 12, 60, 38, 32, 56);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(21, 21, 6, 4, -0.6, 0, TAU); g.fill();
    return c;
  };

  // ---------- Текстура песчаной бури: 1024×512, полупрозрачная, бесшовная ----------
  P.sandstorm = function () {
    const W = 1024, H = 512, c = cv(W, H), g = c.getContext('2d'), r = seeded(41);
    g.lineCap = 'round';
    for (let i = 0; i < 420; i++) {
      const x = r() * W, y = r() * H, l = 30 + r() * 180, j = (r() - 0.5) * 8;
      g.strokeStyle = 'rgba(236,196,128,' + (0.15 + r() * 0.45).toFixed(2) + ')';
      g.lineWidth = 1 + r() * 3.5;
      wrap(W, o => { g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + l / 2, y + j, x + o + l, y); g.stroke(); });
    }
    for (let i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(210,165,100,' + (0.2 + r() * 0.5).toFixed(2) + ')';
      g.fillRect(r() * W, r() * H, 2, 2);
    }
    return c;
  };
})();
