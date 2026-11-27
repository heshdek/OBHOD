// Процедурный ахалтекинец — заглушка, пока нет horse_run.png / horse_jump.png / horse_fall.png.
// Сухое стройное тело, высоко поставленная длинная шея, маленькая голова, миндалевидный глаз,
// тонкие ноги, буланая масть с металлическим блеском, короткая редкая грива, тонкий хвост,
// серебро с сердоликом на нагруднике и уздечке, оберег алача на шее.
// Начало координат — земля под центром коня, конь смотрит вправо; ширина ≈ 190, высота ≈ 165.
(function () {
  const TAU = Math.PI * 2;
  const GOLD = '#dcb878', GOLD_D = '#b3884a', GOLD_L = '#f6e2ae';
  const DARK = '#2b211a', HOOF = '#15100c';
  const SILVER = '#dfe4ea', SILVER_D = '#7d858e', CARNELIAN = '#b3261e';

  // Угол бедра/плеча (от вертикали, «+» вперёд) и сгиб нижней части ноги в галопе
  function gallop(q) {
    if (q < 0.4) { const u = q / 0.4; return [0.5 - 1.05 * u, 0.08 + 0.12 * Math.sin(Math.PI * u)]; }
    const u = (q - 0.4) / 0.6;
    return [-0.55 + 1.05 * (0.5 - 0.5 * Math.cos(Math.PI * u)), 0.08 + 1.5 * Math.sin(Math.PI * Math.min(1, u * 1.2))];
  }

  function leg(ctx, jx, jy, a1, L1, a2, L2, w1, w2, cUp, cLow) {
    const kx = jx + Math.sin(a1) * L1, ky = jy + Math.cos(a1) * L1;
    const hx = kx + Math.sin(a2) * L2, hy = ky + Math.cos(a2) * L2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = cUp; ctx.lineWidth = w1;
    ctx.beginPath(); ctx.moveTo(jx, jy); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.strokeStyle = cLow; ctx.lineWidth = w2;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.fillStyle = cLow; ctx.beginPath(); ctx.arc(kx, ky, w2 * 0.75, 0, TAU); ctx.fill();
    // копыто
    ctx.strokeStyle = HOOF; ctx.lineWidth = w2 + 2.2;
    ctx.beginPath(); ctx.moveTo(hx, hy - 1); ctx.lineTo(hx + Math.sin(a2) * 5, hy + Math.cos(a2) * 5); ctx.stroke();
  }

  AT.drawHorseProc = function (ctx, x, y, s, pose) {
    const mode = pose.mode || 'run', p = pose.p || 0;
    let bob = 0, pitch = 0, low = 0, neckA = -1.02, headRel = 1.95, tailLift = 0, ls = 1;
    // [плечо/бедро, сгиб] для 4 ног: дальняя задняя, ближняя задняя, дальняя передняя, ближняя передняя
    let L = [];
    if (mode === 'run' || mode === 'duck') {
      const offs = [0.0, 0.08, 0.42, 0.52];
      for (const o of offs) L.push(gallop((p + o) % 1));
      bob = 3 * Math.sin(TAU * p);
      pitch = 0.035 * Math.sin(TAU * p + 1.2);
      if (mode === 'duck') {
        low = 26; neckA = 0.05; headRel = 1.2; pitch += 0.03; ls = 0.72;
        L = L.map(l => [l[0] * 0.75, l[1] * 0.8 + 0.2]);
      }
    } else if (mode === 'jump') {
      const k = AT.clamp(pose.k || 0, -1, 1), mid = 1 - Math.abs(k);
      pitch = 0.16 * k - 0.04;
      neckA = -0.85 - 0.12 * k;
      tailLift = 0.6;
      const hindUp = -0.75 + 0.55 * mid, hindB = 0.4 + 0.9 * mid;
      L = [[hindUp - 0.05, hindB], [hindUp, hindB], [1.05, 2.25], [1.15, 2.35]];
    } else if (mode === 'fall') {
      const t = AT.clamp(pose.t || 0, 0, 1), e = Math.sin(Math.PI * Math.min(1, t * 1.25));
      pitch = 0.2 * e; low = 14 * e; neckA = -1.0 + 0.6 * e; headRel = 1.95 + 0.2 * e; ls = 1 - 0.18 * e;
      L = [[0.35 * e, 0.3 + 0.5 * e], [0.25 * e, 0.3 + 0.4 * e], [-0.3, 0.4 + 1.3 * e], [-0.15, 0.3 + 1.4 * e]];
    } else { // stand
      L = [[0.05, 0.05], [-0.05, 0.05], [0.0, 0.05], [0.05, 0.05]];
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.translate(0, bob * 0.5);
    ctx.rotate(pitch);
    ctx.translate(0, low);

    const FS = [36, -80], HP = [-40, -86]; // плечо, тазобедренный сустав
    const drawLeg = (i, far) => {
      const front = i >= 2, a = L[i][0], b = L[i][1];
      const cu = far ? '#a37c45' : GOLD, cl = far ? '#1e1712' : DARK;
      if (front) leg(ctx, FS[0] + (far ? -3 : 0), FS[1], a, 37 * ls, a - b, 36 * ls, far ? 8 : 9, 4.2, cu, cl);
      else leg(ctx, HP[0] + (far ? -3 : 0), HP[1], a - 0.2, 41 * ls, a + 0.25 - b * 0.7, 39 * ls, far ? 10.5 : 11.5, 4.4, cu, cl);
    };

    // дальние ноги
    drawLeg(0, true); drawLeg(2, true);

    // хвост — тонкий, тёмный
    const sway = 4 * Math.sin(TAU * p);
    ctx.strokeStyle = DARK; ctx.lineCap = 'round';
    const tx0 = -57, ty0 = -98;
    const tex = -86 - tailLift * 18 + sway * 0.3, tey = -48 - tailLift * 34 + sway;
    for (let i = 0; i < 4; i++) {
      ctx.lineWidth = 3.4 - i * 0.7;
      ctx.beginPath(); ctx.moveTo(tx0, ty0);
      ctx.quadraticCurveTo(-76 - i * 2, -96 + i * 3 - tailLift * 10, tex - i * 2.5, tey + i * 4);
      ctx.stroke();
    }

    // туловище: сухое, подтянутый живот
    let gr = ctx.createLinearGradient(0, -112, 0, -64);
    gr.addColorStop(0, GOLD_L); gr.addColorStop(0.45, GOLD); gr.addColorStop(1, GOLD_D);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(52, -94);
    ctx.quadraticCurveTo(46, -111, 28, -111);
    ctx.quadraticCurveTo(4, -101, -24, -104);
    ctx.quadraticCurveTo(-47, -111, -59, -97);
    ctx.quadraticCurveTo(-66, -82, -52, -76);
    ctx.quadraticCurveTo(-30, -73, -4, -73);
    ctx.quadraticCurveTo(24, -62, 42, -70);
    ctx.quadraticCurveTo(56, -78, 52, -94);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,35,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();

    // металлический блеск
    ctx.fillStyle = 'rgba(255,250,225,0.45)';
    ctx.beginPath(); ctx.ellipse(-36, -100, 15, 5, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(28, -96, 12, 6, 0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-4, -99, 18, 3, 0, 0, TAU); ctx.fill();
    // мускулы
    ctx.strokeStyle = 'rgba(140,95,45,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-40, -96); ctx.quadraticCurveTo(-30, -84, -44, -74); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -100); ctx.quadraticCurveTo(22, -86, 34, -74); ctx.stroke();

    // ближние ноги
    drawLeg(1, false); drawLeg(3, false);

    // шея: длинная, тонкая, высоко поставленная
    const B1 = [24, -109], B2 = [50, -86];
    const M = [(B1[0] + B2[0]) / 2, (B1[1] + B2[1]) / 2];
    const d = [Math.cos(neckA), Math.sin(neckA)], n = [-d[1], d[0]];
    const NL = 72;
    const T = [M[0] + d[0] * NL, M[1] + d[1] * NL];
    const T1 = [T[0] - n[0] * 6, T[1] - n[1] * 6], T2 = [T[0] + n[0] * 6, T[1] + n[1] * 6];
    gr = ctx.createLinearGradient(B1[0], B1[1], T[0], T[1]);
    gr.addColorStop(0, GOLD); gr.addColorStop(1, GOLD_L);
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(B1[0], B1[1]);
    ctx.quadraticCurveTo((B1[0] + T1[0]) / 2 - n[0] * 5, (B1[1] + T1[1]) / 2 - n[1] * 5, T1[0], T1[1]);
    ctx.lineTo(T2[0], T2[1]);
    ctx.quadraticCurveTo((B2[0] + T2[0]) / 2 + n[0] * 2, (B2[1] + T2[1]) / 2 + n[1] * 2, B2[0], B2[1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,35,0.5)'; ctx.lineWidth = 1.1; ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,225,0.35)';
    ctx.beginPath(); ctx.ellipse(M[0] + d[0] * 30 - n[0] * 2, M[1] + d[1] * 30 - n[1] * 2, 16, 3, neckA, 0, TAU); ctx.fill();

    // короткая редкая грива
    ctx.strokeStyle = 'rgba(58,42,30,0.85)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const bx = B1[0] + (T1[0] - B1[0]) * t - n[0] * 3.6 * Math.sin(Math.PI * t);
      const by = B1[1] + (T1[1] - B1[1]) * t - n[1] * 3.6 * Math.sin(Math.PI * t);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - n[0] * 3.2 - d[0] * 2.5, by - n[1] * 3.2 - d[1] * 2.5); ctx.stroke();
    }

    // голова: маленькая, сухая
    const ha = neckA + headRel, hd = [Math.cos(ha), Math.sin(ha)], hn = [-hd[1], hd[0]];
    const P0 = [T[0] - n[0] * 1, T[1] - n[1] * 1];
    const HL = 42;
    const Mz = [P0[0] + hd[0] * HL, P0[1] + hd[1] * HL];
    const pt = (base, a, b) => [base[0] + hd[0] * a + hn[0] * b, base[1] + hd[1] * a + hn[1] * b];
    const f0 = pt(P0, 0, -6), f1 = pt(Mz, 0, -3.8), m1 = pt(Mz, 0, 3.6), j1 = pt(P0, 15, 9), j0 = pt(P0, 0, 9);
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(f0[0], f0[1]);
    const fc = pt(P0, HL * 0.5, -5.2);
    ctx.quadraticCurveTo(fc[0], fc[1], f1[0], f1[1]);
    const mc = pt(Mz, 4, 0);
    ctx.quadraticCurveTo(mc[0], mc[1], m1[0], m1[1]);
    const jc = pt(P0, 26, 6);
    ctx.quadraticCurveTo(jc[0], jc[1], j1[0], j1[1]);
    ctx.quadraticCurveTo(j0[0] + hd[0] * 4, j0[1] + hd[1] * 4, j0[0], j0[1]);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,35,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    // тёмная морда
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(90,72,60,0.85)';
    const mzc = pt(Mz, -3, 0);
    ctx.beginPath(); ctx.arc(mzc[0], mzc[1], 9, 0, TAU); ctx.fill();
    ctx.restore();
    // ноздря
    const ns = pt(Mz, -4, -1.5);
    ctx.fillStyle = '#1b1410'; ctx.beginPath(); ctx.ellipse(ns[0], ns[1], 1.8, 1.1, ha, 0, TAU); ctx.fill();
    // уши: длинные, тонкие
    for (let e = 0; e < 2; e++) {
      const eb = pt(P0, 2 + e * 3, -5);
      const ed = [-hd[0] * 0.45 - hn[0], -hd[1] * 0.45 - hn[1]];
      const el = Math.hypot(ed[0], ed[1]); ed[0] /= el; ed[1] /= el;
      const tip = [eb[0] + ed[0] * 13, eb[1] + ed[1] * 13];
      ctx.fillStyle = e ? GOLD : '#c9a061';
      ctx.beginPath();
      ctx.moveTo(eb[0] - hd[0] * 3, eb[1] - hd[1] * 3);
      ctx.quadraticCurveTo(tip[0] - hd[0] * 2, tip[1] - hd[1] * 2, tip[0], tip[1]);
      ctx.quadraticCurveTo(tip[0] + hd[0] * 3, tip[1] + hd[1] * 3, eb[0] + hd[0] * 3, eb[1] + hd[1] * 3);
      ctx.closePath(); ctx.fill();
    }
    // миндалевидный глаз
    const ey = pt(P0, 11, -1.8);
    ctx.fillStyle = '#1a120c';
    ctx.beginPath(); ctx.ellipse(ey[0], ey[1], 3.6, 1.8, ha + 0.25, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ey[0] + 0.9, ey[1] - 0.6, 0.7, 0, TAU); ctx.fill();

    // уздечка: серебро с сердоликом
    ctx.strokeStyle = SILVER_D; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    const c0 = pt(P0, 3, -6), c1 = pt(P0, 5, 8), nb0 = pt(Mz, -10, -5.5), nb1 = pt(Mz, -9, 5.5);
    ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(nb1[0], nb1[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nb0[0], nb0[1]); ctx.lineTo(nb1[0], nb1[1]); ctx.stroke();
    ctx.strokeStyle = SILVER; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.lineTo(nb1[0], nb1[1]); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nb0[0], nb0[1]); ctx.lineTo(nb1[0], nb1[1]); ctx.stroke();
    for (const q of [c1, nb1, pt(P0, 4, 1)]) {
      ctx.fillStyle = SILVER; ctx.beginPath(); ctx.arc(q[0], q[1], 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = CARNELIAN; ctx.beginPath(); ctx.arc(q[0], q[1], 1.3, 0, TAU); ctx.fill();
    }
    // повод
    ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(nb1[0], nb1[1]);
    ctx.quadraticCurveTo((nb1[0] + 22) / 2 + 4, (nb1[1] - 100) / 2 + 14, 22, -101); ctx.stroke();

    // алача — чёрно-белый шнур-оберег на шее, с кисточкой
    const A1 = [B1[0] + (T1[0] - B1[0]) * 0.42, B1[1] + (T1[1] - B1[1]) * 0.42];
    const A2 = [B2[0] + (T2[0] - B2[0]) * 0.42, B2[1] + (T2[1] - B2[1]) * 0.42];
    ctx.lineCap = 'butt';
    ctx.strokeStyle = '#111'; ctx.lineWidth = 3.6;
    ctx.beginPath(); ctx.moveTo(A1[0] - n[0] * 1, A1[1] - n[1] * 1); ctx.lineTo(A2[0] + n[0] * 1, A2[1] + n[1] * 1); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.6; ctx.setLineDash([2, 2]);
    ctx.beginPath(); ctx.moveTo(A1[0] - n[0] * 1, A1[1] - n[1] * 1); ctx.lineTo(A2[0] + n[0] * 1, A2[1] + n[1] * 1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(A2[0] + 1, A2[1] + 9); ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(A2[0] + 1.5, A2[1]); ctx.lineTo(A2[0] + 3, A2[1] + 8); ctx.stroke();

    // нагрудник: серебро с сердоликом
    ctx.strokeStyle = SILVER_D; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(26, -104); ctx.quadraticCurveTo(52, -98, 50, -80); ctx.stroke();
    ctx.strokeStyle = SILVER; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(26, -104); ctx.quadraticCurveTo(52, -98, 50, -80); ctx.stroke();
    for (const q of [[36, -101], [46, -94], [50, -85]]) {
      ctx.fillStyle = SILVER; ctx.beginPath(); ctx.arc(q[0], q[1], 3.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = SILVER_D; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = CARNELIAN; ctx.beginPath(); ctx.arc(q[0], q[1], 1.9, 0, TAU); ctx.fill();
    }
    // подвеска-тумар
    ctx.fillStyle = SILVER; ctx.strokeStyle = SILVER_D; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(47, -84); ctx.lineTo(55, -84); ctx.lineTo(51, -73); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = CARNELIAN; ctx.beginPath(); ctx.arc(51, -81, 1.6, 0, TAU); ctx.fill();

    ctx.restore();
  };
})();
