// Процедурный ахалтекинец — заглушка, пока нет horse_run.png / horse_jump.png / horse_fall.png.
// Анатомия: длинная сухая шея высокого выхода, высокая холка, глубокая узкая грудь, подтянутый живот,
// длинные тонкие ноги с суставами, маленькая сухая голова с прямым профилем и миндалевидным глазом.
// Масть буланая с металлическим блеском, тёмные ноги, короткая редкая грива, тонкий хвост.
// Сбруя: серебро с сердоликом на нагруднике и уздечке, алача (чёрно-белый шнур) на шее.
// Ноги двигаются через обратную кинематику: копыто стоит на земле, суставы сгибаются правильно.
// Начало координат — земля под центром коня, конь смотрит вправо; ширина ≈ 200, высота ≈ 175.
(function () {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  const GOLD = '#d9b06a', GOLD_L = '#f7e2a9', GOLD_D = '#a47437';
  const DARK = '#251a12', HOOF = '#15100c';
  const SILVER = '#e4e8ed', SILVER_D = '#7a828b', CARN = '#b3261e';
  const OUTLINE = 'rgba(70,42,18,0.6)';

  // Передняя нога: локоть → запястье (предплечье L1) → путовый сустав (пясть L2) → бабка LP → копыто
  const FR = { L1: 36, L2: 30, LP: 10, cx: 37, reach: 36, lift: 30 };
  // Задняя нога: тазобедренный → коленный (бедро) → скакательный (голень L1) → путовый (плюсна L2)
  const HI = { hip: [-39, -96], fem: 26, L1: 36, L2: 33, LP: 10, cx: -36, reach: 34, lift: 20 };
  const DUTY = 0.38;

  // Траектория копыта в галопе (в системе земли)
  function cycle(q, cx, reach, lift) {
    if (q < DUTY) {
      const u = q / DUTY;
      return { x: cx + reach * (1 - 2 * u), y: -6, pa: 0.5 + 0.35 * Math.sin(Math.PI * u) };
    }
    const u = (q - DUTY) / (1 - DUTY);
    const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
    const s = Math.sin(Math.PI * Math.pow(u, 0.8));
    return { x: cx + reach * (-1 + 2 * e), y: -6 - lift * s, pa: 0.5 - 1.5 * s };
  }

  // Двухзвенная обратная кинематика. sign=+1 — сустав вперёд (запястье), −1 — назад (скакательный)
  function ik(R, T, L1, L2, sign) {
    let dx = T[0] - R[0], dy = T[1] - R[1], d = Math.hypot(dx, dy);
    const max = L1 + L2 - 0.05;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 1e-3) d = 1e-3;
    const a = Math.atan2(dy, dx);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const ang = a - sign * A;
    return [[R[0] + Math.cos(ang) * L1, R[1] + Math.sin(ang) * L1], [R[0] + dx, R[1] + dy]];
  }

  // Плавный контур конечности по цепочке точек и толщинам
  function limbPath(pts, ws) {
    const n = pts.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const nx = -dy, ny = dx, w = ws[i] / 2;
      Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    const p = new Path2D();
    const side = (arr, first) => {
      if (first) p.moveTo(arr[0][0], arr[0][1]); else p.lineTo(arr[0][0], arr[0][1]);
      for (let i = 1; i < arr.length - 1; i++) {
        const m = [(arr[i][0] + arr[i + 1][0]) / 2, (arr[i][1] + arr[i + 1][1]) / 2];
        p.quadraticCurveTo(arr[i][0], arr[i][1], m[0], m[1]);
      }
      const last = arr[arr.length - 1]; p.lineTo(last[0], last[1]);
    };
    side(Lp, true);
    side(Rp.slice().reverse(), false);
    p.closePath();
    return p;
  }

  // Копыто по направлению бабки
  function hoofPath(H, pa) {
    const ax = Math.sin(pa + 0.25), ay = Math.cos(pa + 0.25), nx = ay, ny = -ax;
    const p = new Path2D();
    p.moveTo(H[0] - nx * 4, H[1] - ny * 4);
    p.lineTo(H[0] + nx * 4.2, H[1] + ny * 4.2);
    p.lineTo(H[0] + nx * 5.6 + ax * 7.5, H[1] + ny * 5.6 + ay * 7.5);
    p.lineTo(H[0] - nx * 4.6 + ax * 5.5, H[1] - ny * 4.6 + ay * 5.5);
    p.closePath();
    return p;
  }

  // Строит ногу: верх (светлый, мышцы), низ (тёмный), копыто
  function buildLeg(front, H, pa) {
    const lp = front ? FR.LP : HI.LP;
    let F = [H[0] - Math.sin(pa) * lp, H[1] - Math.cos(pa) * lp];
    let up, upW, K, E;
    if (front) {
      const elbow = [30 + 0.08 * (H[0] - FR.cx), -74];
      [K, E] = ik(elbow, F, FR.L1, FR.L2, 1);
      up = [[37, -95], elbow, K]; upW = [20, 15, 9.5];
    } else {
      const fa = 0.5 + 0.009 * (H[0] - HI.cx);
      const st = [HI.hip[0] + Math.sin(fa) * HI.fem, HI.hip[1] + Math.cos(fa) * HI.fem];
      [K, E] = ik(st, F, HI.L1, HI.L2, -1);
      const mid = [lerp(st[0], K[0], 0.45), lerp(st[1], K[1], 0.45)];
      up = [HI.hip, st, mid, K]; upW = [28, 21, 14, 10];
    }
    if (E[0] !== F[0] || E[1] !== F[1]) { H = [E[0] + Math.sin(pa) * lp, E[1] + Math.cos(pa) * lp]; F = E; }
    const cm = [lerp(K[0], F[0], 0.55), lerp(K[1], F[1], 0.55)];
    const low = [K, cm, F, H], lowW = [front ? 8.6 : 9.2, 6.4, 8.8, 6.4];
    return { up: limbPath(up, upW), low: limbPath(low, lowW), hoof: hoofPath(H, pa), K, F, H };
  }

  AT.drawHorseProc = function (ctx, x, y, s, pose) {
    const mode = pose.mode || 'run', p = pose.p || 0;
    let bob = 0, pitch = 0, low = 0, neckA = -0.95, headRel = 1.7, tailK = 0;
    let reachK = 1, liftK = 1;
    // цели копыт: [дальняя задняя, ближняя задняя, дальняя передняя, ближняя передняя]
    let T = null, groundFrame = true;

    if (mode === 'run' || mode === 'duck') {
      bob = -3 * Math.cos(TAU * (p - 0.95));
      pitch = 0.035 * Math.sin(TAU * (p - 0.2));
      neckA = -0.95 + 0.06 * Math.sin(TAU * p);
      if (mode === 'duck') { low = 22; neckA = -0.12; headRel = 1.25; pitch += 0.02; reachK = 0.8; liftK = 0.65; }
      const offs = [0.0, 0.1, 0.42, 0.52];
      T = offs.map((o, i) => {
        const front = i >= 2, L = front ? FR : HI;
        return cycle((p + o) % 1, L.cx + (i % 2 ? 0 : -3), L.reach * reachK, L.lift * liftK);
      });
    } else if (mode === 'jump') {
      const k = clamp(pose.k || 0, -1, 1);
      pitch = 0.15 * k - 0.03; neckA = -0.82 - 0.1 * k; headRel = 1.6; tailK = 1;
      groundFrame = false;
      const land = sstep((k - 0.2) / 0.8);
      const fH = [lerp(44, 62, land), lerp(-60, -16, land)], fpa = lerp(-1.6, 0.35, land);
      const tuck = 1 - Math.abs(k);
      let hH, hpa;
      if (k < 0) { const u = sstep(k + 1); hH = [lerp(-82, -32, u), lerp(-22, -48, u)]; hpa = lerp(0.2, -1.2, u); }
      else { hH = [lerp(-32, -24, k), lerp(-48, -30, k)]; hpa = lerp(-1.2, -0.3, k); }
      T = [
        { x: hH[0] - 4, y: hH[1] + 2, pa: hpa }, { x: hH[0], y: hH[1], pa: hpa },
        { x: fH[0] - 4 - 4 * tuck, y: fH[1] + 3, pa: fpa }, { x: fH[0], y: fH[1], pa: fpa }
      ];
    } else if (mode === 'fall') {
      const t = clamp(pose.t || 0, 0, 1), e = Math.sin(Math.PI * Math.min(1, t * 1.25));
      pitch = 0.2 * e; low = 12 * e; neckA = -0.95 + 0.7 * e; headRel = 1.8;
      T = [
        { x: -40, y: -6, pa: 0.55 }, { x: -32, y: -6, pa: 0.6 },
        { x: lerp(38, 18, e), y: -6 + 2 * e, pa: lerp(0.5, -1.5, e) }, { x: lerp(42, 26, e), y: -6, pa: lerp(0.55, -1.4, e) }
      ];
    } else { // stand
      T = [{ x: -42, y: -6, pa: 0.55 }, { x: -35, y: -6, pa: 0.55 }, { x: 33, y: -6, pa: 0.55 }, { x: 39, y: -6, pa: 0.55 }];
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(0, bob + low);
    ctx.rotate(pitch);

    // цели из системы земли → в систему тела
    const cp = Math.cos(-pitch), sp = Math.sin(-pitch);
    const toBody = (gx, gy) => { const yy = gy - bob - low; return [gx * cp - yy * sp, gx * sp + yy * cp]; };
    const legs = T.map((t, i) => {
      const H = groundFrame ? toBody(t.x, t.y) : [t.x, t.y];
      return buildLeg(i >= 2, H, t.pa + (groundFrame ? pitch : 0));
    });

    // общий градиент тела
    const bodyG = ctx.createLinearGradient(0, -120, 0, -62);
    bodyG.addColorStop(0, GOLD_L); bodyG.addColorStop(0.42, GOLD); bodyG.addColorStop(1, GOLD_D);
    const lowG = (L, far) => {
      const g = ctx.createLinearGradient(L.K[0], L.K[1], L.H[0], L.H[1]);
      g.addColorStop(0, far ? '#7a5528' : GOLD_D); g.addColorStop(0.28, far ? '#2a1d13' : '#4a3422'); g.addColorStop(1, far ? '#140e0a' : DARK);
      return g;
    };
    const drawGroup = (paths) => {
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
      for (const q of paths) ctx.stroke(q[0]);
      for (const q of paths) { ctx.fillStyle = q[1]; ctx.fill(q[0]); }
    };

    // ---- дальние ноги (в тени) ----
    const farUp = '#a9803f';
    drawGroup([
      [legs[0].up, farUp], [legs[0].low, lowG(legs[0], true)], [legs[0].hoof, HOOF],
      [legs[2].up, farUp], [legs[2].low, lowG(legs[2], true)], [legs[2].hoof, HOOF]
    ]);

    // ---- хвост: тонкий, редкий ----
    const wave = Math.sin(TAU * p), tx = -57, ty = -103;
    const dock = [-67 - tailK * 6, -92 - tailK * 4];
    ctx.lineCap = 'round';
    ctx.strokeStyle = DARK; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(-64, -101, dock[0], dock[1]); ctx.stroke();
    // хвост: несколько тонких прядей разной длины, сходятся у репицы
    const strands = [[-1.2, 1.0, 2.0], [0.4, 0.92, 1.6], [1.6, 1.05, 1.3], [-0.2, 0.85, 1.8], [0.9, 0.78, 1.1], [-1.8, 0.7, 1.0], [2.2, 0.9, 0.9]];
    for (let i = 0; i < strands.length; i++) {
      const [sp2, len, w] = strands[i];
      const ph = wave * (1 + i * 0.15);
      const ex = dock[0] + lerp(-20 + ph * 3, -44, tailK) * len + sp2 * 1.4;
      const ey = dock[1] + lerp(48 + ph * 3, 12, tailK) * len + sp2 * 1.2;
      const cx2 = dock[0] + lerp(-14, -26, tailK) + sp2 * 0.6 + ph * 2;
      const cy2 = dock[1] + lerp(14, -4, tailK) + sp2 * 0.4;
      ctx.strokeStyle = i % 3 === 2 ? 'rgba(80,56,34,0.75)' : 'rgba(30,21,14,0.9)';
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(dock[0], dock[1]); ctx.quadraticCurveTo(cx2, cy2, ex, ey); ctx.stroke();
    }

    // ---- туловище ----
    const body = new Path2D();
    body.moveTo(55, -93);
    body.quadraticCurveTo(52, -106, 42, -110);
    body.quadraticCurveTo(34, -116, 24, -114);      // холка
    body.quadraticCurveTo(8, -104, -6, -104);       // спина
    body.quadraticCurveTo(-24, -106, -38, -110);    // поясница → круп
    body.quadraticCurveTo(-52, -110, -58, -102);    // корень хвоста
    body.quadraticCurveTo(-67, -92, -62, -79);      // седалищный бугор
    body.quadraticCurveTo(-56, -68, -42, -70);
    body.quadraticCurveTo(-30, -72, -24, -76);      // коленная складка
    body.quadraticCurveTo(-14, -84, 0, -78);        // подтянутый пах
    body.quadraticCurveTo(14, -72, 24, -64);        // глубокая грудь
    body.quadraticCurveTo(34, -62, 42, -70);        // локоть
    body.quadraticCurveTo(54, -78, 55, -93);        // грудь
    body.closePath();

    // ---- шея и голова: геометрия ----
    const B1 = [28, -113], B2 = [55, -90];
    const M = [(B1[0] + B2[0]) / 2, (B1[1] + B2[1]) / 2];
    const d = [Math.cos(neckA), Math.sin(neckA)], cn = [d[1], -d[0]]; // cn — сторона гребня
    const P = [M[0] + d[0] * 62, M[1] + d[1] * 62];                   // затылок
    const ha = neckA + headRel, hc = Math.cos(ha), hs = Math.sin(ha);
    const hp = (lx, ly) => [P[0] + lx * hc - ly * hs, P[1] + lx * hs + ly * hc];
    const Q = hp(6, 12);                                             // горло
    const crestC = [M[0] + d[0] * 30 + cn[0] * 11, M[1] + d[1] * 30 + cn[1] * 11];
    const throatC = [M[0] + d[0] * 30 - cn[0] * 5, M[1] + d[1] * 30 - cn[1] * 5];
    const crestE = [P[0] + cn[0] * 3, P[1] + cn[1] * 3];
    const neck = new Path2D();
    neck.moveTo(B1[0], B1[1]);
    neck.quadraticCurveTo(crestC[0], crestC[1], crestE[0], crestE[1]);
    neck.lineTo(Q[0], Q[1]);
    neck.quadraticCurveTo(throatC[0], throatC[1], B2[0], B2[1]);
    neck.lineTo(30, -100);
    neck.closePath();

    // голова в своей системе: x — от затылка к носу
    const headL = new Path2D();
    headL.moveTo(-3, -3);
    headL.quadraticCurveTo(10, -9.5, 22, -7.5);   // лоб, надглазье
    headL.quadraticCurveTo(36, -6, 46, -4.5);     // прямой профиль
    headL.quadraticCurveTo(52, -3.6, 52.5, 1);    // нос
    headL.quadraticCurveTo(52.6, 5.6, 49, 7);     // верхняя губа
    headL.quadraticCurveTo(47, 8.6, 44, 9);
    headL.quadraticCurveTo(43, 11.5, 40, 11);     // подбородок
    headL.quadraticCurveTo(35, 10, 31, 11.6);
    headL.quadraticCurveTo(24, 17.5, 15, 16.5);   // ганаши
    headL.quadraticCurveTo(8, 15.5, 5, 11);
    headL.quadraticCurveTo(0, 7, -3, -3);
    headL.closePath();
    const earL = (bx, by) => {
      const e = new Path2D();
      e.moveTo(bx - 2.6, by + 1);
      e.quadraticCurveTo(bx - 6, by - 9, bx - 4.5, by - 16);
      e.quadraticCurveTo(bx + 1, by - 9, bx + 3, by + 0.5);
      e.closePath();
      return e;
    };

    // ---- основная группа: контур, затем заливка ----
    const near = [legs[1], legs[3]];
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.lineJoin = 'round';
    ctx.stroke(body); ctx.stroke(neck);
    for (const L of near) { ctx.stroke(L.up); ctx.stroke(L.low); ctx.stroke(L.hoof); }
    ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(ha);
    ctx.stroke(earL(1, -5)); ctx.fillStyle = '#b98d4f'; ctx.fill(earL(1, -5));
    ctx.stroke(headL);
    ctx.restore();

    ctx.fillStyle = bodyG; ctx.fill(body);
    for (const L of near) {
      ctx.fillStyle = bodyG; ctx.fill(L.up);
      ctx.fillStyle = lowG(L, false); ctx.fill(L.low);
      ctx.fillStyle = HOOF; ctx.fill(L.hoof);
    }
    // тень и блеск на туловище
    ctx.save(); ctx.clip(body);
    let g = ctx.createRadialGradient(4, -66, 4, 4, -70, 40);
    g.addColorStop(0, 'rgba(120,75,30,0.45)'); g.addColorStop(1, 'rgba(120,75,30,0)');
    ctx.fillStyle = g; ctx.fillRect(-40, -110, 90, 50);
    ctx.fillStyle = 'rgba(255,250,228,0.5)';
    ctx.beginPath(); ctx.ellipse(-36, -103, 17, 5, -0.12, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2, -101, 20, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,228,0.28)';
    ctx.beginPath(); ctx.ellipse(-44, -88, 10, 12, 0.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(130,85,38,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-14, -100); ctx.quadraticCurveTo(-8, -88, -14, -80); ctx.stroke(); // бок
    ctx.beginPath(); ctx.moveTo(-50, -100); ctx.quadraticCurveTo(-40, -88, -50, -74); ctx.stroke(); // ляжка
    ctx.restore();

    // плечо и мускулатура
    ctx.strokeStyle = 'rgba(130,85,38,0.38)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(26, -110); ctx.quadraticCurveTo(30, -92, 44, -84); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,228,0.35)';
    ctx.beginPath(); ctx.ellipse(38, -95, 7, 11, -0.5, 0, TAU); ctx.fill();

    ctx.fillStyle = bodyG; ctx.fill(neck);
    ctx.save(); ctx.clip(neck);
    ctx.fillStyle = 'rgba(255,250,228,0.4)';
    ctx.beginPath(); ctx.ellipse(M[0] + d[0] * 30 + cn[0] * 5, M[1] + d[1] * 30 + cn[1] * 5, 22, 3.5, neckA, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,75,30,0.25)';
    ctx.beginPath(); ctx.ellipse(throatC[0], throatC[1], 18, 4, neckA, 0, TAU); ctx.fill();
    ctx.restore();

    // короткая редкая грива по гребню
    ctx.strokeStyle = 'rgba(37,26,18,0.9)'; ctx.lineCap = 'round';
    for (let i = 1; i <= 11; i++) {
      const t = i / 12, u = 1 - t;
      const bx = u * u * B1[0] + 2 * u * t * crestC[0] + t * t * crestE[0];
      const by = u * u * B1[1] + 2 * u * t * crestC[1] + t * t * crestE[1];
      ctx.lineWidth = 1.3 + (i % 2) * 0.6;
      const l = 3 + (i % 3);
      ctx.beginPath(); ctx.moveTo(bx - cn[0] * 1, by - cn[1] * 1);
      ctx.lineTo(bx + cn[0] * l - d[0] * 3, by + cn[1] * l - d[1] * 3); ctx.stroke();
    }

    // алача — чёрно-белый шнур на шее с кисточкой
    {
      const t = 0.42, u = 1 - t;
      const A1 = [u * u * B1[0] + 2 * u * t * crestC[0] + t * t * crestE[0], u * u * B1[1] + 2 * u * t * crestC[1] + t * t * crestE[1]];
      const A2 = [u * u * B2[0] + 2 * u * t * throatC[0] + t * t * Q[0], u * u * B2[1] + 2 * u * t * throatC[1] + t * t * Q[1]];
      ctx.lineCap = 'butt'; ctx.lineWidth = 3.4;
      ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(A1[0], A1[1]); ctx.lineTo(A2[0], A2[1]); ctx.stroke();
      ctx.setLineDash([2.2, 2.2]); ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(A1[0], A1[1]); ctx.lineTo(A2[0], A2[1]); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineCap = 'round'; ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(A2[0] - 1, A2[1] + 9); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(A2[0] + 1.2, A2[1]); ctx.lineTo(A2[0] + 1.5, A2[1] + 8); ctx.stroke();
    }

    // нагрудник: серебро с сердоликом
    ctx.lineCap = 'round';
    ctx.strokeStyle = SILVER_D; ctx.lineWidth = 4.6;
    ctx.beginPath(); ctx.moveTo(30, -111); ctx.quadraticCurveTo(57, -102, 54, -80); ctx.stroke();
    ctx.strokeStyle = SILVER; ctx.lineWidth = 2.8;
    ctx.beginPath(); ctx.moveTo(30, -111); ctx.quadraticCurveTo(57, -102, 54, -80); ctx.stroke();
    for (const q of [[39, -106], [49, -99], [54, -90]]) {
      ctx.fillStyle = SILVER; ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = SILVER_D; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = CARN; ctx.beginPath(); ctx.arc(q[0], q[1], 1.9, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = SILVER; ctx.strokeStyle = SILVER_D; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(50, -84); ctx.lineTo(58, -84); ctx.lineTo(54, -72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CARN; ctx.beginPath(); ctx.arc(54, -81, 1.6, 0, TAU); ctx.fill();

    // ---- голова ----
    ctx.save(); ctx.translate(P[0], P[1]); ctx.rotate(ha);
    ctx.fillStyle = GOLD; ctx.fill(headL);
    ctx.save(); ctx.clip(headL);
    g = ctx.createLinearGradient(34, 0, 53, 0);
    g.addColorStop(0, 'rgba(95,72,55,0)'); g.addColorStop(0.5, 'rgba(95,72,55,0.75)'); g.addColorStop(1, 'rgba(70,52,40,0.95)');
    ctx.fillStyle = g; ctx.fillRect(30, -12, 26, 30);
    ctx.fillStyle = 'rgba(255,250,228,0.45)';
    ctx.beginPath(); ctx.ellipse(24, -5.5, 14, 1.8, 0, 0, TAU); ctx.fill();   // блеск на профиле
    ctx.fillStyle = 'rgba(120,75,30,0.3)';
    ctx.beginPath(); ctx.ellipse(16, 11, 9, 5, 0.2, 0, TAU); ctx.fill();      // ганаши
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,80,40,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(11, 3); ctx.quadraticCurveTo(18, 6, 23, 13); ctx.stroke();      // скула
    // ближнее ухо
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.stroke(earL(4.5, -6.5));
    ctx.fillStyle = GOLD; ctx.fill(earL(4.5, -6.5));
    ctx.fillStyle = 'rgba(90,60,35,0.5)';
    ctx.beginPath(); ctx.ellipse(1.5, -14, 1.1, 4, -0.25, 0, TAU); ctx.fill();
    // миндалевидный глаз с надбровьем
    ctx.strokeStyle = 'rgba(110,70,35,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(19.5, -1, 5.2, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#1a110b';
    ctx.beginPath(); ctx.ellipse(19.5, -1.6, 3.9, 2.1, 0.12, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,80,50,0.9)';
    ctx.beginPath(); ctx.ellipse(19.2, -1.4, 2, 1.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0b0705'; ctx.beginPath(); ctx.ellipse(19.3, -1.5, 1.1, 1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(20.6, -2.4, 0.7, 0, TAU); ctx.fill();
    // широкая ноздря
    ctx.strokeStyle = '#140d09'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(49.5, -1.8); ctx.quadraticCurveTo(45.5, -0.5, 46.5, 3); ctx.stroke();
    ctx.strokeStyle = 'rgba(20,13,9,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(44.5, 9); ctx.lineTo(49, 7.2); ctx.stroke();           // губы
    // уздечка: серебро с сердоликом
    ctx.lineCap = 'round';
    const strap = (pts, w) => {
      ctx.strokeStyle = SILVER_D; ctx.lineWidth = w + 1.2;
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      ctx.strokeStyle = SILVER; ctx.lineWidth = w;
      ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
    };
    strap([[5, -6.5], [8, 13]], 1.6);              // нащёчный ремень за ухом
    strap([[8, 6], [37, 7.5]], 1.4);               // к капсюлю
    strap([[37, -5.2], [38.5, 10]], 1.8);          // капсюль
    strap([[8, -7.5], [12, -7.2]], 1.4);           // налобный
    for (const q of [[8, 6], [37.6, 2], [10, -7.4]]) {
      ctx.fillStyle = SILVER; ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = CARN; ctx.beginPath(); ctx.arc(q[0], q[1], 1.25, 0, TAU); ctx.fill();
    }
    const rein = hp(38.5, 9);
    ctx.restore();

    // повод к холке
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(rein[0], rein[1]);
    ctx.quadraticCurveTo((rein[0] + 26) / 2 + 2, Math.max(rein[1], -112) + 16, 26, -110); ctx.stroke();

    ctx.restore();
  };
})();
