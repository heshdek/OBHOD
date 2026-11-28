// Фон: небо + 3 слоя с параллаксом, смена времени суток, звёзды, песчаная буря.
(function () {
  const C = AT.CFG, A = AT.assets, TAU = Math.PI * 2;
  const BG = AT.bg = {};
  let stars = [], clouds = [];

  BG.init = function () {
    stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.3, tw: Math.random() * TAU });
    clouds = [];
    for (let i = 0; i < 6; i++) clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.3, s: 0.6 + Math.random() * 0.8 });
  };

  // Веса фаз [день, закат, ночь]: 60 с каждая, плавный переход в конце фазы
  BG.weights = function (clock) {
    const P = C.DAY_PHASE, B = C.BLEND;
    const i = Math.floor(clock / P) % 3, loc = clock % P;
    let w = 0;
    if (loc > P - B) { const u = (loc - (P - B)) / B; w = u * u * (3 - 2 * u); }
    const arr = [0, 0, 0];
    arr[i] = 1 - w; arr[(i + 1) % 3] += w;
    return arr;
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  // Небо, солнце/луна, звёзды. Рисуется прямо на основной холст (не тонируется).
  BG.drawSky = function (ctx, V, W, time, dist) {
    const skyH = V.groundY + 10;
    const sky = A.get('sky');
    if (sky) {
      const sc = Math.max(V.w / sky.width, skyH / sky.height);
      const dw = sky.width * sc, dh = sky.height * sc;
      ctx.drawImage(sky, (V.w - dw) / 2, 0, dw, dh);   // привязка к верху: облака видны и в альбомном режиме
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      g.addColorStop(0, '#3f93dc'); g.addColorStop(0.7, '#9fd2f0'); g.addColorStop(1, '#d8eef6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, skyH);
    }
    if (W[1] > 0.001) {
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      g.addColorStop(0, '#3b2a5e'); g.addColorStop(0.55, '#d9635a'); g.addColorStop(1, '#f8b75c');
      ctx.globalAlpha = W[1] * 0.92; ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, skyH);
    }
    if (W[2] > 0.001) {
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      g.addColorStop(0, '#040817'); g.addColorStop(1, '#1e2c58');
      ctx.globalAlpha = W[2] * 0.96; ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, skyH);
    }
    ctx.globalAlpha = 1;

    // звёзды
    const sa = W[2] + W[1] * 0.15;
    if (sa > 0.02) {
      ctx.fillStyle = '#fff';
      for (const s of stars) {
        const a = sa * (0.55 + 0.45 * Math.sin(time * 2.2 + s.tw));
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(s.x * V.w, s.y * (V.groundY - 140), s.r, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // солнце
    const sunA = W[0] + W[1];
    if (sunA > 0.01) {
      const k = W[1] / sunA;
      const sx = V.w * lerp(0.78, 0.66, k), sy = lerp(V.groundY * 0.22, V.groundY - 230, k);
      const r = lerp(30, 40, k);
      const glow = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 3.2);
      glow.addColorStop(0, k > 0.5 ? 'rgba(255,170,90,0.55)' : 'rgba(255,250,210,0.6)');
      glow.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.globalAlpha = sunA;
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, r * 3.2, 0, TAU); ctx.fill();
      ctx.fillStyle = k > 0.5 ? '#ff9a4a' : '#fff6c8';
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // луна
    if (W[2] > 0.01) {
      const mx = V.w * 0.8, my = Math.max(70, V.groundY * 0.2);
      ctx.globalAlpha = W[2];
      const glow = ctx.createRadialGradient(mx, my, 10, mx, my, 80);
      glow.addColorStop(0, 'rgba(220,230,255,0.35)'); glow.addColorStop(1, 'rgba(220,230,255,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, 80, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eef0f8'; ctx.beginPath(); ctx.arc(mx, my, 24, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(160,170,195,0.5)';
      ctx.beginPath(); ctx.arc(mx - 7, my - 5, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 8, my + 6, 4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 3, my - 10, 2.5, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // облака — только если нет sky.png
    if (!sky) {
      ctx.globalAlpha = 0.85 * (1 - W[2] * 0.75);
      ctx.fillStyle = W[1] > 0.5 ? '#ffd6c0' : '#ffffff';
      const span = V.w + 300;
      for (const c of clouds) {
        let x = ((c.x * span - dist * 0.015 - time * 6) % span + span) % span - 150;
        const y = c.y * (V.groundY - 200), s = c.s;
        ctx.beginPath(); ctx.ellipse(x, y, 46 * s, 16 * s, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 28 * s, y - 10 * s, 30 * s, 18 * s, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x - 26 * s, y - 6 * s, 24 * s, 14 * s, 0, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  };

  function tile(ctx, img, offset, drawH, bottomY, viewW) {
    if (!img) return;
    const dw = img.width * drawH / img.height;
    let x = -(((offset % dw) + dw) % dw);
    const y = bottomY - drawH;
    for (; x < viewW; x += dw) ctx.drawImage(img, x, y, dw + 0.6, drawH);
  }

  // Горы, барханы, земля. Рисуется на холст сцены (потом тонируется по времени суток).
  BG.drawLand = function (ctx, V, dist) {
    tile(ctx, A.get('mountains'), dist * 0.06, 300, V.groundY - 26, V.w);
    tile(ctx, A.get('dunes'), dist * 0.28, 200, V.groundY + 22, V.w);
    ctx.fillStyle = '#c99a58';
    ctx.fillRect(0, V.groundY + 30, V.w, V.h - V.groundY);
    // ground.png 320 px высотой, линия бега на 96 px → рисуем высотой 160, верх = groundY − 48
    tile(ctx, A.get('ground'), dist, 160, V.groundY + 112, V.w);
  };

  // Песчаная буря: плотная завеса, видно только рядом с конём
  BG.drawStorm = function (ctx, V, I, time, hx, hy) {
    if (I <= 0.001) return;
    const g = ctx.createRadialGradient(hx, hy, 50, hx, hy, 360);
    g.addColorStop(0, 'rgba(214,168,98,' + (0.32 * I).toFixed(3) + ')');
    g.addColorStop(0.45, 'rgba(210,164,96,' + (0.55 * I).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(200,155,90,' + (0.9 * I).toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, V.w, V.h);
    const tex = A.get('sandstorm');
    if (tex) {
      ctx.globalAlpha = 0.85 * I;
      const h = V.h / 2;
      tile(ctx, tex, time * 900, h, h, V.w);
      tile(ctx, tex, time * 1300 + 300, h, V.h, V.w);
      ctx.globalAlpha = 1;
    }
  };
})();
