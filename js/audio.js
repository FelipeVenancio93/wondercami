/* WonderCami — audio chiptune generado por WebAudio.
   Sin archivos: todo son osciladores y ruido. */
(function (global) {
  'use strict';

  var ctx = null, master = null, musGain = null, sfxGain = null;
  var ready = false, muted = false;
  var noiseBuf = null;

  var NOTES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function freq(name) {
    if (!name || name === '-') return 0;
    var i = 0, semi = NOTES[name.charAt(0).toUpperCase()];
    i = 1;
    if (name.charAt(1) === '#') { semi += 1; i = 2; }
    else if (name.charAt(1) === 'b') { semi -= 1; i = 2; }
    var oct = parseInt(name.substr(i), 10);
    var midi = (oct + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function parseSeq(str) {
    var out = [], toks = str.split(/\s+/);
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (!t || t === '|') continue;
      var p = t.split(':');
      out.push({ f: freq(p[0]), d: parseInt(p[1] || '4', 10) });
    }
    return out;
  }

  function makeNoise() {
    var len = Math.floor(ctx.sampleRate * 0.5);
    var b = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  function init() {
    if (ctx) return;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.75; master.connect(ctx.destination);
    musGain = ctx.createGain(); musGain.gain.value = 0.34; musGain.connect(master);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
    noiseBuf = makeNoise();
    ready = true;
  }

  function unlock() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  /* ---------------- SFX ---------------- */

  function blip(o) {
    if (!ready || muted) return;
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + o.dur + 0.02);
  }

  function noise(dur, vol, hp) {
    if (!ready || muted) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = hp ? 'highpass' : 'lowpass';
    f.frequency.value = hp || 1400;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
  }

  var SFX = {
    jump: function () { blip({ f0: 300, f1: 780, dur: 0.14, wave: 'square', vol: 0.28 }); },
    throw_: function () { blip({ f0: 700, f1: 260, dur: 0.11, wave: 'sawtooth', vol: 0.22 }); },
    smash: function () { noise(0.18, 0.3, 900); blip({ f0: 220, f1: 60, dur: 0.16, wave: 'square', vol: 0.2 }); },
    eat: function () { blip({ f0: 620, f1: 980, dur: 0.09, wave: 'triangle', vol: 0.3 }); },
    item: function () { blip({ f0: 660, f1: 1320, dur: 0.16, wave: 'square', vol: 0.28 }); },
    egg: function () { blip({ f0: 880, f1: 1760, dur: 0.1, wave: 'square', vol: 0.24 }); },
    hurt: function () { blip({ f0: 400, f1: 90, dur: 0.32, wave: 'sawtooth', vol: 0.3 }); },
    die: function () {
      blip({ f0: 520, f1: 70, dur: 0.7, wave: 'square', vol: 0.3 });
      noise(0.4, 0.15, 500);
    },
    splash: function () { noise(0.35, 0.3, 0); blip({ f0: 200, f1: 900, dur: 0.2, wave: 'sine', vol: 0.15 }); },
    bosshit: function () { blip({ f0: 180, f1: 420, dur: 0.16, wave: 'square', vol: 0.35 }); noise(0.12, 0.2, 1800); },
    bossdie: function () { noise(1.0, 0.4, 0); blip({ f0: 300, f1: 40, dur: 1.0, wave: 'sawtooth', vol: 0.35 }); },
    life: function () {
      var s = [880, 1108, 1318, 1760];
      for (var i = 0; i < s.length; i++) (function (f, i) {
        setTimeout(function () { blip({ f0: f, dur: 0.12, wave: 'square', vol: 0.3 }); }, i * 80);
      })(s[i], i);
    },
    moto: function () { blip({ f0: 90, f1: 220, dur: 0.5, wave: 'sawtooth', vol: 0.25 }); },
    select: function () { blip({ f0: 520, f1: 1040, dur: 0.09, wave: 'square', vol: 0.25 }); }
  };

  function sfx(name) {
    if (!ready) return;
    var f = SFX[name === 'throw' ? 'throw_' : name];
    if (f) f();
  }

  /* ---------------- MUSICA ---------------- */

  var TRACKS = {};

  TRACKS.beach = {
    bpm: 148,
    tracks: [
      { wave: 'square', gain: 0.24, oct: 0, seq:
        'E5:2 G5:2 A5:4 G5:2 E5:2 D5:4  C5:2 E5:2 G5:4 A5:2 G5:2 E5:4 ' +
        'D5:2 F5:2 A5:4 G5:2 F5:2 E5:4  D5:2 C5:2 D5:4 E5:6 -:2 ' +
        'A5:2 C6:2 B5:4 A5:2 G5:2 E5:4  G5:2 A5:2 G5:4 E5:2 D5:2 C5:4 ' +
        'D5:2 E5:2 G5:4 A5:4 G5:2 E5:2  D5:4 C5:4 C5:8' },
      { wave: 'square', gain: 0.11, oct: 0, seq:
        'C5:2 E5:2 F5:4 E5:2 C5:2 B4:4  A4:2 C5:2 E5:4 F5:2 E5:2 C5:4 ' +
        'B4:2 D5:2 F5:4 E5:2 D5:2 C5:4  B4:2 A4:2 B4:4 C5:6 -:2 ' +
        'F5:2 A5:2 G5:4 F5:2 E5:2 C5:4  E5:2 F5:2 E5:4 C5:2 B4:2 A4:4 ' +
        'B4:2 C5:2 E5:4 F5:4 E5:2 C5:2  B4:4 A4:4 A4:8' },
      { wave: 'triangle', gain: 0.5, oct: 0, seq:
        'C3:2 C3:2 G3:2 C3:2 G2:2 G2:2 D3:2 G2:2 ' +
        'A2:2 A2:2 E3:2 A2:2 F2:2 F2:2 C3:2 F2:2 ' +
        'G2:2 G2:2 D3:2 G2:2 C3:2 C3:2 G3:2 C3:2 ' +
        'F2:2 F2:2 C3:2 F2:2 G2:2 G2:2 D3:2 G2:2 ' +
        'F2:2 F2:2 C3:2 F2:2 C3:2 C3:2 G3:2 C3:2 ' +
        'C3:2 C3:2 G3:2 C3:2 A2:2 A2:2 E3:2 A2:2 ' +
        'G2:2 G2:2 D3:2 G2:2 F2:2 F2:2 C3:2 F2:2 ' +
        'G2:2 G2:2 G2:2 G2:2 C3:2 C3:2 C3:2 C3:2' }
    ],
    drums: 'k.h.s.h.k.h.s.h.k.h.s.h.k.h.shsh'
  };

  TRACKS.boss = {
    bpm: 166,
    tracks: [
      { wave: 'square', gain: 0.26, seq:
        'A4:2 A4:2 C5:2 A4:2 E5:4 D5:2 C5:2  B4:2 B4:2 D5:2 B4:2 F5:4 E5:2 D5:2 ' +
        'C5:2 E5:2 A5:2 E5:2 G5:4 F5:2 E5:2  D5:2 C5:2 B4:2 A4:2 A4:8' },
      { wave: 'sawtooth', gain: 0.1, seq:
        'A3:2 A3:2 C4:2 A3:2 E4:4 D4:2 C4:2  B3:2 B3:2 D4:2 B3:2 F4:4 E4:2 D4:2 ' +
        'C4:2 E4:2 A4:2 E4:2 G4:4 F4:2 E4:2  D4:2 C4:2 B3:2 A3:2 A3:8' },
      { wave: 'triangle', gain: 0.55, seq:
        'A2:2 A2:2 A2:2 A2:2 A2:2 A2:2 G2:2 G2:2 ' +
        'B2:2 B2:2 B2:2 B2:2 B2:2 B2:2 A2:2 A2:2 ' +
        'C3:2 C3:2 C3:2 C3:2 C3:2 C3:2 B2:2 B2:2 ' +
        'A2:2 A2:2 E2:2 E2:2 A2:2 A2:2 A2:2 A2:2' }
    ],
    drums: 'k.h.s.hkk.h.s.hh'
  };

  var mus = null;          // estado del track actual
  var timer = null;

  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
    mus = null;
  }

  function playMusic(name) {
    if (!ready || muted) { return; }
    if (mus && mus.name === name) return;
    stopMusic();
    var def = TRACKS[name];
    if (!def) return;
    var spb = 60 / def.bpm / 4; // duracion de un 16avo
    mus = {
      name: name, def: def, spb: spb,
      next: ctx.currentTime + 0.06,
      voices: def.tracks.map(function (t) { return { notes: parseSeq(t.seq), i: 0, def: t }; }),
      drumI: 0
    };
    timer = setInterval(schedule, 25);
    schedule();
  }

  function playVoiceNote(v, when) {
    var n = v.notes[v.i];
    var dur = n.d * mus.spb;
    if (n.f > 0) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = v.def.wave;
      osc.frequency.setValueAtTime(n.f, when);
      var peak = 0.22 * (v.def.gain || 1);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(peak, when + 0.012);
      g.gain.exponentialRampToValueAtTime(peak * 0.55, when + dur * 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.95);
      osc.connect(g); g.connect(musGain);
      osc.start(when); osc.stop(when + dur);
    }
    v.i = (v.i + 1) % v.notes.length;
    return dur;
  }

  function playDrum(ch, when) {
    if (ch === '.') return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    var g = ctx.createGain();
    var dur = 0.08, vol = 0.16;
    if (ch === 'k') { f.type = 'lowpass'; f.frequency.value = 180; dur = 0.13; vol = 0.4; }
    else if (ch === 's') { f.type = 'bandpass'; f.frequency.value = 1600; dur = 0.11; vol = 0.2; }
    else { f.type = 'highpass'; f.frequency.value = 6500; dur = 0.04; vol = 0.1; }
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f); f.connect(g); g.connect(musGain);
    src.start(when); src.stop(when + dur + 0.02);
  }

  function schedule() {
    if (!mus || !ready) return;
    var horizon = ctx.currentTime + 0.25;
    // cada voz avanza con su propio reloj
    if (!mus.voiceTime) mus.voiceTime = mus.voices.map(function () { return mus.next; });
    if (mus.drumTime === undefined) mus.drumTime = mus.next;

    for (var vi = 0; vi < mus.voices.length; vi++) {
      var v = mus.voices[vi];
      var guard = 0;
      while (mus.voiceTime[vi] < horizon && guard++ < 64) {
        var d = playVoiceNote(v, mus.voiceTime[vi]);
        mus.voiceTime[vi] += d;
      }
    }
    var pat = mus.def.drums;
    var g2 = 0;
    while (mus.drumTime < horizon && g2++ < 64) {
      playDrum(pat.charAt(mus.drumI % pat.length), mus.drumTime);
      mus.drumI++;
      mus.drumTime += mus.spb * 2;
    }
  }

  /* Jingles cortos: secuencias one-shot que no loopean */
  function jingle(name) {
    if (!ready || muted) return;
    stopMusic();
    var seqs = {
      clear: [['C5', 0.11], ['E5', 0.11], ['G5', 0.11], ['C6', 0.14], ['G5', 0.1], ['C6', 0.34]],
      over: [['G4', 0.16], ['F#4', 0.16], ['F4', 0.16], ['E4', 0.5]],
      win: [['C5', 0.12], ['D5', 0.12], ['E5', 0.12], ['F5', 0.12], ['G5', 0.14],
            ['A5', 0.14], ['B5', 0.14], ['C6', 0.5], ['G5', 0.16], ['C6', 0.6]],
      start: [['C5', 0.1], ['G5', 0.1], ['C6', 0.24]]
    };
    var s = seqs[name] || seqs.clear;
    var t = ctx.currentTime + 0.03;
    for (var i = 0; i < s.length; i++) {
      var f = freq(s[i][0]), d = s[i][1];
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.26, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g); g.connect(musGain);
      osc.start(t); osc.stop(t + d + 0.02);
      // bajo simple una octava abajo
      var b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = 'triangle'; b.frequency.setValueAtTime(f / 2, t);
      bg.gain.setValueAtTime(0.14, t);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + d);
      b.connect(bg); bg.connect(musGain);
      b.start(t); b.stop(t + d + 0.02);
      t += d;
    }
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.75;
    if (m) stopMusic();
  }

  global.Snd = {
    unlock: unlock,
    sfx: sfx,
    music: playMusic,
    stopMusic: stopMusic,
    jingle: jingle,
    setMuted: setMuted,
    isMuted: function () { return muted; },
    isReady: function () { return ready; }
  };
})(window);
