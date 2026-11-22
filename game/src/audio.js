// Procedural WebAudio sound: engine hum, horns, sirens, gunshots, pickups and
// a lazy marimba loop for the bay. No audio files; every sound is synthesised.
'use strict';
SB.Audio = (() => {
  let ctx = null, master = null, engineOsc = null, engineGain = null, musicTimer = 0;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    } catch (e) { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  function shot() { noise(0.12, 0.5, 900); tone(160, 0.08, 'sawtooth', 0.2, 60); }
  function horn() { tone(370, 0.25, 'square', 0.15); tone(466, 0.25, 'square', 0.12); }
  function cash() { tone(880, 0.09, 'sine', 0.25); setTimeout(() => tone(1320, 0.14, 'sine', 0.25), 70); }
  function hurt() { tone(110, 0.2, 'sawtooth', 0.3, 55); }
  function siren(t) { if (ensure()) tone(700 + Math.sin(t * 6) * 250, 0.1, 'triangle', 0.06); }
  function engine(speedRatio, driving) {
    if (!ensure()) return;
    if (!engineOsc) {
      engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth'; engineGain.gain.value = 0;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master); engineOsc.start();
    }
    engineOsc.frequency.value = 55 + Math.abs(speedRatio) * 160;
    engineGain.gain.value = driving ? 0.05 + Math.abs(speedRatio) * 0.05 : 0;
  }
  // A slow I–vi–IV–V marimba figure, scheduled from the update loop.
  const SCALE = [261.6, 220.0, 174.6, 196.0];
  function music(dt, calm) {
    if (!ctx || !calm) return;
    musicTimer -= dt;
    if (musicTimer <= 0) {
      musicTimer = 0.42;
      const base = SCALE[Math.floor(Math.random() * SCALE.length)];
      tone(base * (Math.random() < 0.5 ? 2 : 1), 0.3, 'sine', 0.05);
    }
  }
  return { ensure, tone, noise, shot, horn, cash, hurt, siren, engine, music };
})();
