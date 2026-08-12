/* WonderCami — arranque, escalado del canvas, controles y loop. */
(function (global) {
  'use strict';

  var canvas, ctx;
  var VH = 192;
  var MIN_VW = 288, MAX_VW = 460;
  var vw = 400;

  /* ---------------- input ---------------- */

  var Input = {
    left: false, right: false, jump: false, fire: false,
    run: false,                     // solo teclado: Ctrl corre ademas de tirar
    jumpP: false, fireP: false, anyP: false
  };
  var pressQ = { jump: false, fire: false, any: false };
  global.Input = Input;

  function setBtn(name, down) {
    if (name === 'left') Input.left = down;
    else if (name === 'right') Input.right = down;
    else if (name === 'jump') { Input.jump = down; if (down) { pressQ.jump = true; pressQ.any = true; } }
    else if (name === 'fire') { Input.fire = down; if (down) { pressQ.fire = true; pressQ.any = true; } }
  }

  function bindButton(el, name) {
    if (!el) return;
    var active = {};
    function down(ev) {
      ev.preventDefault();
      Snd.unlock();
      modoTeclado(false);
      active[ev.pointerId] = true;
      el.classList.add('on');
      setBtn(name, true);
      if (el.setPointerCapture) { try { el.setPointerCapture(ev.pointerId); } catch (e) {} }
    }
    function up(ev) {
      delete active[ev.pointerId];
      if (Object.keys(active).length === 0) { el.classList.remove('on'); setBtn(name, false); }
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* Mapa de teclado, estilo puerto de PC de los arcades de los 80:
     flechas para moverse, ALT salta, CTRL corre y tira botellas.
     Dejamos Z/X/espacio como alternativas para el que las prefiera. */
  var KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    AltLeft: 'jump', AltRight: 'jump',
    KeyZ: 'jump', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    ControlLeft: 'fire', ControlRight: 'fire',
    KeyX: 'fire', ArrowDown: 'fire', KeyS: 'fire', ShiftLeft: 'fire'
  };
  var RUN_KEYS = { ControlLeft: 1, ControlRight: 1 };

  function onKey(ev, down) {
    var n = KEYS[ev.code];
    if (n) {
      // Imprescindible: sin esto ALT abre el menu del navegador y
      // ALT+flecha izquierda te manda a la pagina anterior en plena partida.
      ev.preventDefault();
      setBtn(n, down);
      if (RUN_KEYS[ev.code]) Input.run = down;
      modoTeclado(true);
    }
    if (down) { pressQ.any = true; Snd.unlock(); }
    if (down && ev.code === 'KeyM') toggleMute();
  }

  /* ---------------- teclado o tactil ---------------- */

  var hayTactil = ('ontouchstart' in global) || navigator.maxTouchPoints > 0;
  var conTeclado = !hayTactil;

  function modoTeclado(si) {
    if (conTeclado === si) return;
    conTeclado = si;
    document.body.classList.toggle('teclado', conTeclado);
    if (global.Game) Game.setInputMode(conTeclado ? 'teclado' : 'tactil');
    if (conTeclado) { Input.left = Input.right = Input.jump = Input.fire = false; }
    else Input.run = false;
  }

  /* ---------------- escalado ---------------- */

  function resize() {
    var w = global.innerWidth, h = global.innerHeight;
    var aspect = w / h;
    vw = Math.round(VH * aspect);
    vw = Math.max(MIN_VW, Math.min(MAX_VW, vw));
    if (vw % 2) vw++;

    canvas.width = vw;
    canvas.height = VH;
    Game.setViewport(vw);

    var scale = Math.min(w / vw, h / VH);
    canvas.style.width = Math.floor(vw * scale) + 'px';
    canvas.style.height = Math.floor(VH * scale) + 'px';

    ctx = canvas.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = false;

    // El cartel de "gira el celular" solo tiene sentido si hay pantalla tactil
    document.body.classList.toggle('portrait', h > w && hayTactil);
  }

  /* ---------------- audio / pantalla ---------------- */

  function toggleMute() {
    Snd.unlock();
    var m = !Snd.isMuted();
    Snd.setMuted(m);
    var b = document.getElementById('mute');
    if (b) b.textContent = m ? '♪✕' : '♪';
    try { localStorage.setItem('wondercami.mute', m ? '1' : '0'); } catch (e) {}
  }

  function toggleFull() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      var r = el.requestFullscreen || el.webkitRequestFullscreen;
      if (r) {
        var pr = r.call(el);
        if (pr && pr.then) pr.then(lockLandscape).catch(function () {});
        else lockLandscape();
      }
    } else if (document.exitFullscreen) document.exitFullscreen();
  }

  function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock)
        screen.orientation.lock('landscape').catch(function () {});
    } catch (e) {}
  }

  /* ---------------- loop ---------------- */

  var last = 0, acc = 0;
  var STEP = 1000 / 60;
  var paused = false;

  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = now - last;
    last = now;
    if (dt > 250) dt = STEP;      // volvimos de segundo plano
    if (paused) { acc = 0; return; }
    acc += dt;
    var steps = 0;
    while (acc >= STEP && steps < 4) {
      Input.jumpP = pressQ.jump; pressQ.jump = false;
      Input.fireP = pressQ.fire; pressQ.fire = false;
      Input.anyP = pressQ.any; pressQ.any = false;
      Game.update();
      acc -= STEP;
      steps++;
    }
    if (steps === 4) acc = 0;
    Game.draw(ctx);
  }

  /* ---------------- arranque ---------------- */

  function boot() {
    canvas = document.getElementById('game');
    Game.init();
    document.body.classList.toggle('teclado', conTeclado);
    Game.setInputMode(conTeclado ? 'teclado' : 'tactil');
    resize();

    bindButton(document.getElementById('bLeft'), 'left');
    bindButton(document.getElementById('bRight'), 'right');
    bindButton(document.getElementById('bJump'), 'jump');
    bindButton(document.getElementById('bFire'), 'fire');

    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault(); Snd.unlock(); pressQ.any = true;
    });

    document.getElementById('mute').addEventListener('click', function (e) {
      e.stopPropagation(); toggleMute();
    });
    document.getElementById('full').addEventListener('click', function (e) {
      e.stopPropagation(); Snd.unlock(); toggleFull();
    });

    global.addEventListener('keydown', function (e) { onKey(e, true); });
    global.addEventListener('keyup', function (e) { onKey(e, false); });
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', function () { setTimeout(resize, 250); });
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (paused) Snd.stopMusic();
      else last = 0;
    });
    global.addEventListener('blur', function () { Input.left = Input.right = Input.jump = Input.fire = false; });

    try {
      if (localStorage.getItem('wondercami.mute') === '1') { Snd.setMuted(true); document.getElementById('mute').textContent = '♪✕'; }
    } catch (e) {}

    document.getElementById('loading').style.display = 'none';
    requestAnimationFrame(frame);

    // En localhost no registramos el SW: molesta para desarrollar.
    var isLocal = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0 && !isLocal) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
