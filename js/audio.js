// ---------- Sons procedurais (WebAudio, sem arquivos) ----------
const Sound = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let sfxVol = 0.4;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = sfxVol;
    master.connect(ctx.destination);
    // buffer de ruído branco reutilizável
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function tone({ freq = 440, end = freq, dur = 0.15, type = 'square', vol = 0.5, delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.2, vol = 0.5, freq = 1200, q = 1, type = 'lowpass', delay = 0 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  return {
    init,
    shoot(w) {
      if (w === 'shotgun') {
        noise({ dur: 0.28, vol: 0.7, freq: 900, type: 'lowpass' });
        tone({ freq: 120, end: 40, dur: 0.22, type: 'sawtooth', vol: 0.45 });
      } else if (w === 'smg') {
        noise({ dur: 0.08, vol: 0.35, freq: 2200 });
        tone({ freq: 480, end: 160, dur: 0.06, type: 'square', vol: 0.22 });
      } else {
        noise({ dur: 0.12, vol: 0.4, freq: 1600 });
        tone({ freq: 340, end: 90, dur: 0.1, type: 'square', vol: 0.3 });
      }
    },
    zombieHit() { noise({ dur: 0.08, vol: 0.35, freq: 700 }); tone({ freq: 180, end: 90, dur: 0.08, type: 'triangle', vol: 0.25 }); },
    zombieDie() {
      tone({ freq: 220, end: 45, dur: 0.4, type: 'sawtooth', vol: 0.3 });
      noise({ dur: 0.3, vol: 0.3, freq: 500 });
    },
    playerHurt() { tone({ freq: 300, end: 80, dur: 0.25, type: 'sawtooth', vol: 0.45 }); noise({ dur: 0.15, vol: 0.3, freq: 800 }); },
    pickup() { tone({ freq: 520, end: 880, dur: 0.12, type: 'sine', vol: 0.35 }); tone({ freq: 880, end: 1320, dur: 0.12, type: 'sine', vol: 0.3, delay: 0.09 }); },
    rescue() {
      [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.3, delay: i * 0.09 }));
    },
    neighborLost() { tone({ freq: 400, end: 150, dur: 0.5, type: 'triangle', vol: 0.35 }); },
    wave() {
      tone({ freq: 130, end: 130, dur: 0.35, type: 'sawtooth', vol: 0.35 });
      tone({ freq: 174, end: 174, dur: 0.35, type: 'sawtooth', vol: 0.3, delay: 0.3 });
      tone({ freq: 130, end: 65, dur: 0.7, type: 'sawtooth', vol: 0.35, delay: 0.6 });
    },
    groan() {
      tone({ freq: rand(70, 120), end: rand(40, 60), dur: rand(0.4, 0.9), type: 'sawtooth', vol: 0.12 });
    },
    click() { tone({ freq: 700, end: 500, dur: 0.06, type: 'square', vol: 0.2 }); },
    empty() { tone({ freq: 220, end: 220, dur: 0.05, type: 'square', vol: 0.15 }); },
    key() { tone({ freq: 880, end: 1320, dur: 0.1, type: 'sine', vol: 0.32 }); tone({ freq: 1320, dur: 0.14, type: 'triangle', vol: 0.24, delay: 0.08 }); },
    explosion() {
      tone({ freq: 160, end: 30, dur: 0.5, type: 'sawtooth', vol: 0.55 });
      noise({ dur: 0.5, vol: 0.6, freq: 500, type: 'lowpass' });
      noise({ dur: 0.25, vol: 0.4, freq: 2000, type: 'bandpass', q: 1, delay: 0.02 });
    },
    heartbeat() {
      tone({ freq: 70, end: 45, dur: 0.12, type: 'sine', vol: 0.4 });
      tone({ freq: 62, end: 40, dur: 0.14, type: 'sine', vol: 0.32, delay: 0.18 });
    },
    vault() { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.32, delay: i * 0.08 })); noise({ dur: 0.3, vol: 0.25, freq: 400 }); },
    getCtx() { return ctx; },
    getMaster() { return master; },
    getNoise() { return noiseBuf; },
    setVolume(v) { sfxVol = Math.max(0, Math.min(0.6, v)); if (master) master.gain.value = sfxVol; },
    getVolume() { return sfxVol; },
    spit() { noise({ dur: 0.18, vol: 0.3, freq: 1400, type: 'bandpass', q: 2 }); tone({ freq: 300, end: 520, dur: 0.16, type: 'sawtooth', vol: 0.18 }); },
    bossRoar() {
      tone({ freq: 90, end: 55, dur: 0.7, type: 'sawtooth', vol: 0.4 });
      tone({ freq: 130, end: 70, dur: 0.7, type: 'square', vol: 0.2 });
      noise({ dur: 0.6, vol: 0.25, freq: 300 });
    },
    bossSlam() {
      tone({ freq: 120, end: 30, dur: 0.5, type: 'sawtooth', vol: 0.5 });
      noise({ dur: 0.4, vol: 0.5, freq: 200, type: 'lowpass' });
    },
    bossTeleport() {
      tone({ freq: 500, end: 1400, dur: 0.2, type: 'sine', vol: 0.28 });
      noise({ dur: 0.2, vol: 0.2, freq: 2400, type: 'bandpass', q: 3 });
    },
    bossSummon() {
      [180, 240, 300].forEach((f, i) => tone({ freq: f, end: f * 1.5, dur: 0.3, type: 'triangle', vol: 0.22, delay: i * 0.06 }));
    },
    bossCast() { tone({ freq: 620, end: 240, dur: 0.16, type: 'sawtooth', vol: 0.24 }); noise({ dur: 0.1, vol: 0.15, freq: 1800 }); },
    bossDie() {
      tone({ freq: 260, end: 40, dur: 1.1, type: 'sawtooth', vol: 0.45 });
      tone({ freq: 130, end: 30, dur: 1.2, type: 'square', vol: 0.3 });
      noise({ dur: 1, vol: 0.35, freq: 400 });
    },
    powerup() { [523, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.1, type: 'sine', vol: 0.28, delay: i * 0.05 })); },
  };
})();

// ---------- Música de fundo procedural (loop adaptativo) ----------
const Music = (() => {
  let ctx = null, bus = null, ugain = null, timer = null;
  let playing = false, mode = 'game';       // 'game' | 'boss' | 'menu'
  let musicVol = 0.7;
  let step = 0, nextTime = 0, bar = 0;
  const SPB16 = () => 60 / (mode === 'boss' ? 148 : mode === 'menu' ? 84 : 108) / 4; // 16-avos
  // progressão em Lá menor (graves, em Hz): Am – F – G – Em
  const roots = [55.0, 43.65, 49.0, 41.2];
  const third = [65.41, 51.91, 58.27, 49.0];   // terça
  const fifth = [82.41, 65.41, 73.42, 61.74];  // quinta

  function ensure() {
    Sound.init();
    ctx = Sound.getCtx();
    if (!ctx) return false;
    if (!ugain) { ugain = ctx.createGain(); ugain.gain.value = musicVol; ugain.connect(ctx.destination); }
    if (!bus) { bus = ctx.createGain(); bus.gain.value = 0; bus.connect(ugain); }
    return true;
  }

  function synth(freq, t, dur, opt = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = opt.type || 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    if (opt.glide) o.frequency.exponentialRampToValueAtTime(opt.glide, t + dur);
    f.type = 'lowpass'; f.frequency.value = opt.cutoff || 700;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opt.vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function kick(t, vol = 0.5) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.22);
  }
  function drum(t, freq, dur, vol, type = 'highpass') {
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = Sound.getNoise();
    f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function playStep(s, t) {
    const boss = mode === 'boss', menu = mode === 'menu';
    if (s === 0) bar = (bar + 1) % 4;
    const r = roots[bar], th = third[bar], fi = fifth[bar];

    // --- pad/acorde no começo de cada compasso ---
    if (s === 0) {
      const padDur = SPB16() * 16 * 0.95;
      synth(r * 2, t, padDur, { type: 'triangle', vol: menu ? 0.12 : 0.10, cutoff: 500 });
      synth(th * 2, t, padDur, { type: 'sine', vol: 0.07, cutoff: 600 });
      synth(fi * 2, t, padDur, { type: 'sine', vol: 0.06, cutoff: 600 });
    }
    if (menu) return; // menu = só pad/drone suave

    // --- baixo sincopado ---
    if (s === 0 || s === 6 || s === 8 || s === 11 || s === 14) {
      synth(r, t, SPB16() * 2.2, { type: 'sawtooth', vol: 0.28, cutoff: boss ? 900 : 650, glide: r * 0.98 });
    }
    // --- bumbo ---
    if (s === 0 || s === 8 || (boss && (s === 4 || s === 12))) kick(t, boss ? 0.6 : 0.45);
    // --- caixa ---
    if (s === 4 || s === 12) drum(t, 1800, 0.14, boss ? 0.35 : 0.22, 'bandpass');
    // --- chimbau ---
    if (s % 2 === 1) drum(t, 7000, 0.03, boss ? 0.14 : 0.08, 'highpass');
    // --- lead tenso (só no chefe) ---
    if (boss && (s === 2 || s === 7 || s === 10 || s === 13)) {
      synth(th * 4, t, SPB16() * 1.5, { type: 'square', vol: 0.12, cutoff: 2000 });
    }
  }

  function schedule() {
    if (!playing || !ctx) return;
    while (nextTime < ctx.currentTime + 0.18) {
      playStep(step, nextTime);
      nextTime += SPB16();
      step = (step + 1) % 16;
    }
  }

  return {
    start(m = 'game') {
      if (!ensure()) return;
      if (playing) { this.setMode(m); return; }
      mode = m;
      playing = true;
      step = 0; bar = 0;
      nextTime = ctx.currentTime + 0.1;
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), ctx.currentTime);
      bus.gain.exponentialRampToValueAtTime(m === 'menu' ? 0.34 : 0.55, ctx.currentTime + 1.5);
      timer = setInterval(schedule, 25);
    },
    setMode(m) {
      if (mode === m) return;
      mode = m;
      if (bus && ctx) {  // ajusta o volume conforme a intensidade
        const target = m === 'boss' ? 0.64 : m === 'menu' ? 0.34 : 0.52;
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
        bus.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.6);
      }
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer); timer = null;
      if (bus && ctx) {
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime);
        bus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      }
    },
    setVolume(v) { musicVol = Math.max(0, Math.min(1, v)); if (ugain) ugain.gain.value = musicVol; },
    getVolume() { return musicVol; },
  };
})();
