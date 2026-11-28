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


  // ---------- Фоновая музыка: тихая, медитативная, восточная. Короткий повторяющийся мотив, мягкое эхо ----------
  // Средний регистр, без высоких нот: A3 C4 D4 E4 G4 A4 — пентатоника
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440];
  // Мотив из 8 долей; -1 — пауза. Повторяется, иногда слегка меняется — отсюда гипнотический эффект
  const MOTIF = [3, -1, 2, 4, 3, -1, 1, 2];
  const CHORDS = [110, 146.83, 164.81, 110];        // дрон по тактам: A2, D3, E3, A2
  const BEAT = 60 / 56;                              // медленно, ~56 долей в минуту
  let mGain = null, mDelay = null, mTimer = null, mNext = 0, mBeat = 0, mStarted = false, mDrones = [], mVar = MOTIF.slice();

  function note(f, t, vol, dur) {
    const o = ac.createOscillator(), low = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    const lg = ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    low.type = 'sine'; low.frequency.value = f * 0.5; lg.gain.value = 0.25;
    lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.35);          // мягкая атака, без щелчка
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);         // долгое затухание
    o.connect(lp); low.connect(lg); lg.connect(lp); lp.connect(g);
    g.connect(mGain); g.connect(mDelay);                          // сухой звук и эхо
    o.start(t); low.start(t); o.stop(t + dur + 0.1); low.stop(t + dur + 0.1);
  }

  function musicBeat(t) {
    const bar = Math.floor(mBeat / 8) % CHORDS.length;
    if (mBeat % 8 === 0) {
      // раз в два такта чуть меняем одну ноту мотива — мелодия живёт, но остаётся узнаваемой
      if (mBeat > 0 && Math.random() < 0.5) {
        const i = Math.floor(Math.random() * MOTIF.length);
        if (MOTIF[i] >= 0) mVar[i] = Math.max(0, Math.min(SCALE.length - 1, MOTIF[i] + (Math.random() < 0.5 ? -1 : 1)));
      }
      mDrones.forEach((d, i) => d.frequency.setTargetAtTime(i === 0 ? CHORDS[bar] : CHORDS[bar] * 1.5, t, 1.2));
    }
    const n = mVar[mBeat % MOTIF.length];
    if (n >= 0) note(SCALE[n], t, 0.028, 2.6);
    mBeat++;
  }

  function scheduleMusic() {
    if (!ac || ac.state !== 'running') return;
    while (mNext < ac.currentTime + 0.4) { musicBeat(mNext); mNext += BEAT; }
  }

  function startMusic() {
    if (mStarted || !ac) return;
    mStarted = true;
    mGain = ac.createGain(); mGain.gain.value = 0.55;
    // эхо: мягкий «зал», отфильтрован, чтобы не звенело
    mDelay = ac.createDelay(1.0); mDelay.delayTime.value = 0.62;
    const fb = ac.createGain(); fb.gain.value = 0.38;
    const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1100;
    const dout = ac.createGain(); dout.gain.value = 0.45;
    mDelay.connect(dlp); dlp.connect(fb); fb.connect(mDelay); dlp.connect(dout); dout.connect(mGain);
    mGain.connect(master);
    for (let i = 0; i < 2; i++) {
      const d = ac.createOscillator(), dg = ac.createGain();
      d.type = 'sine'; d.frequency.value = CHORDS[0] * (i ? 1.5 : 1);
      dg.gain.value = i ? 0.012 : 0.02;
      d.connect(dg); dg.connect(mGain); d.start();
      mDrones.push(d);
    }
    mNext = ac.currentTime + 0.3;
    mTimer = setInterval(scheduleMusic, 150);
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
