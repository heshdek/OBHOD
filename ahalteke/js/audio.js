// Звуки синтезируются через Web Audio API — файлы не нужны, игра работает офлайн.
(function () {
  let ac = null, master = null, noiseBuf = null, muted = false;
  let wind = null, windGain = null;

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }

  function ready() { return ac && !muted && ac.state === 'running'; }

  function tone(type, f0, f1, dur, vol, delay) {
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, ftype, freq, q, delay) {
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = ftype; f.frequency.value = freq; f.Q.value = q || 1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }


  // ---------- Фоновая музыка: мягкая, в туркменском ладу (пентатоника, пощипывание струны, дрон) ----------
  // Ноты: A3 C4 D4 E4 G4 A4 C5 D5 — минорная пентатоника с мягкой «восточной» тягой
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
  const CHORDS = [110, 146.83, 164.81, 110];   // дрон: A2, D3, E3, A2 — по тактам
  const STEP = 60 / 84 / 2;                    // восьмые при 84 bpm
  let mGain = null, mTimer = null, mNext = 0, mStep = 0, mIdx = 4, mStarted = false, mDrones = [];

  function pluck(f, t, vol) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
    const lp = ac.createBiquadFilter(), g2 = ac.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o2.type = 'sine'; o2.frequency.value = f * 2;
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    g2.gain.value = 0.22;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(mGain);
    o.start(t); o2.start(t); o.stop(t + 1.6); o2.stop(t + 1.6);
  }

  function musicStep(t) {
    const bar = Math.floor(mStep / 8) % CHORDS.length;
    if (mStep % 8 === 0) {
      mDrones.forEach((d, i) => {
        const base = CHORDS[bar];
        const f = i === 0 ? base : base * 1.5;      // квинта поверх
        d.frequency.setTargetAtTime(f, t, 0.4);
      });
    }
    // мелодия: случайное блуждание по ступеням, с паузами, чаще ходит вниз-вверх на соседние ноты
    if (Math.random() < 0.62) {
      const r = Math.random();
      const move = r < 0.45 ? 1 : r < 0.9 ? -1 : (Math.random() < 0.5 ? 2 : -2);
      mIdx = Math.max(0, Math.min(SCALE.length - 1, mIdx + move));
      const vol = (mStep % 4 === 0 ? 0.075 : 0.05) * (0.85 + Math.random() * 0.3);
      pluck(SCALE[mIdx], t, vol);
      if (Math.random() < 0.18) pluck(SCALE[mIdx] * 2, t + STEP * 0.5, 0.03);   // редкое «эхо» октавой
    }
    mStep++;
  }

  function scheduleMusic() {
    if (!ac || ac.state !== 'running') return;
    while (mNext < ac.currentTime + 0.25) { musicStep(mNext); mNext += STEP; }
  }

  function startMusic() {
    if (mStarted || !ac) return;
    mStarted = true;
    mGain = ac.createGain();
    mGain.gain.value = 0.42;
    mGain.connect(master);
    for (let i = 0; i < 2; i++) {
      const d = ac.createOscillator(), dg = ac.createGain();
      d.type = 'sine'; d.frequency.value = CHORDS[0] * (i ? 1.5 : 1);
      dg.gain.value = i ? 0.018 : 0.03;
      d.connect(dg); dg.connect(mGain); d.start();
      mDrones.push(d);
    }
    mNext = ac.currentTime + 0.15;
    mTimer = setInterval(scheduleMusic, 90);
  }

  AT.audio = {
    resume() {
      init();
      if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
      if (ac) startMusic();
    },
    setMuted(m) {
      muted = !!m;
      if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ac.currentTime, 0.02);
    },
    isMuted() { return muted; },
    hoof() {
      if (!ready()) return;
      noise(0.06, 0.28, 'lowpass', 600 + Math.random() * 300, 1);
      tone('sine', 120 + Math.random() * 20, 55, 0.08, 0.35);
    },
    jump() {
      if (!ready()) return;
      tone('triangle', 300, 680, 0.2, 0.22);
      noise(0.16, 0.1, 'bandpass', 1400, 1.5);
    },
    coin() {
      if (!ready()) return;
      tone('square', 988, 988, 0.07, 0.08);
      tone('square', 1319, 1319, 0.16, 0.08, 0.06);
    },
    water() {
      if (!ready()) return;
      tone('sine', 380, 900, 0.12, 0.3);
      tone('sine', 600, 1300, 0.1, 0.22, 0.09);
    },
    melon() {
      if (!ready()) return;
      tone('triangle', 523, 523, 0.09, 0.22);
      tone('triangle', 659, 659, 0.09, 0.22, 0.07);
      tone('triangle', 784, 784, 0.16, 0.22, 0.14);
    },
    hit() {
      if (!ready()) return;
      tone('sine', 170, 45, 0.35, 0.6);
      noise(0.28, 0.45, 'lowpass', 900, 0.8);
    },
    over() {
      if (!ready()) return;
      [440, 370, 311, 220].forEach((f, i) => tone('triangle', f, f * 0.98, 0.22, 0.22, i * 0.17));
    },
    click() {
      if (!ready()) return;
      tone('sine', 720, 720, 0.05, 0.15);
    },
    // Ветер песчаной бури: уровень 0..1
    wind(level) {
      if (!ac || ac.state !== 'running') return;
      if (level > 0.01 && !wind) {
        wind = ac.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
        windGain = ac.createGain(); windGain.gain.value = 0;
        wind.connect(f); f.connect(windGain); windGain.connect(master);
        wind.start();
      }
      if (wind) {
        windGain.gain.setTargetAtTime(level * 0.3, ac.currentTime, 0.15);
        if (level <= 0.01) {
          const w = wind; wind = null;
          setTimeout(() => { try { w.stop(); } catch (e) { /* ignore */ } }, 600);
        }
      }
    }
  };
})();
