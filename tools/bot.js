/* Autopiloto de prueba: se pega en la consola del navegador para verificar
   que los 4 rounds se puedan terminar (pozos, plataformas y el jefe).
   Uso:  WCBot.run(60000)   ->  devuelve el log de eventos. */
(function (global) {
  'use strict';
  var G = Game._G;

  function ents() { return G.ents; }

  function step() {
    var L = G.level, p = G.p;
    var I = global.Input;
    I.left = false; I.right = false; I.jumpP = false; I.fireP = false; I.anyP = false;

    if (G.st === 'title' || G.st === 'gameover' || G.st === 'clear' || G.st === 'ending') {
      I.anyP = true;
      Game.update();
      return;
    }
    if (G.st !== 'play' || !p || p.dead) { Game.update(); return; }

    var c = Math.floor((p.x + p.w) / 16);
    var jump = false, hold = false;

    // pozo adelante
    for (var k = 1; k <= 7; k++) {
      if (L.g[c + k] === 0) {
        var dist = (c + k) * 16 - (p.x + p.w);
        if (dist < 8) jump = true;
        break;
      }
    }
    // obstaculos y bichos
    var es = ents();
    for (var i = 0; i < es.length; i++) {
      var e = es[i];
      var dx = e.x - (p.x + p.w);
      if (e.t === 'rock' || e.t === 'fire') { if (dx > -6 && dx < 22) jump = true; }
      if (e.t === 'crab') { if (dx > -6 && dx < 34) jump = true; }
      if (e.t === 'frog') {
        if (!e.on && dx > -10 && dx < 60) hold = true;         // esperar a que caiga
        else if (dx > -6 && dx < 26) jump = true;
      }
      if (e.t === 'gull' && e.on) {
        if (dx > -8 && dx < 40 && e.y + e.h > p.y + 2) jump = true;
      }
      if (e.t === 'coco' || e.t === 'bcoco') {
        if (Math.abs(e.x - p.x) < 26 && e.y < p.y) hold = true;
        if (e.t === 'bcoco' && dx > 8 && dx < 34 && e.y > p.y - 10) jump = true;
      }
      if (e.t === 'octo' && e.y < e.base - 6 && dx > -8 && dx < 26) jump = true;
    }
    // el pulpo tapando: mejor esperar
    if (p.y > 150) jump = true;

    // contra el jefe: mantener distancia y tirar botellas
    if (G.boss && !G.boss.dead) {
      // si esta sin arma, primero ir a buscar la botella que aparece
      var drop = es.filter(function (e) {
        return e.t === 'item' && (e.kind === 'botella' || e.kind === 'botella2');
      })[0];
      if (p.weapon === 0 && drop) {
        I.right = drop.x > p.x + 2; I.left = drop.x < p.x - 2;
        I.jumpP = jump && (p.onGround || p.coyote > 0);
        Game.update();
        return;
      }
      var d = G.boss.x - p.x;
      I.right = d > 130; I.left = d < 100;
      I.jumpP = jump && (p.onGround || p.coyote > 0);
      I.fireP = (G.t % 9 === 0);
      Game.update();
      return;
    }

    if (!hold) I.right = true;
    I.jumpP = jump && (p.onGround || p.coyote > 0);
    I.fire = true;                 // el disparo ahora es sostenido, en rafaga
    I.fireP = (G.t % 11 === 0);
    Game.update();
  }

  function run(frames) {
    var ev = [], last = G.st, lastR = G.roundIdx, stuck = 0, prevX = -1, prevRound = -1;
    G.lives = 99;
    if (G.st === 'title') { global.Input.anyP = true; Game.update(); }
    for (var i = 0; i < frames; i++) {
      step();
      if (G.st !== last) {
        ev.push(i + ' ' + last + '->' + G.st + ' R' + (G.roundIdx + 1) +
          ' x=' + Math.round(G.p ? G.p.x : 0) + '/' + (G.level ? G.level.width : 0) +
          ' pts=' + G.score);
        last = G.st;
      }
      if (G.st !== 'play') { prevX = -1; stuck = 0; }
      if (G.st === 'play') {
        if (G.roundIdx !== prevRound) { prevRound = G.roundIdx; prevX = -1; stuck = 0; }
        if (Math.round(G.p.x) <= prevX + 1) stuck++; else { stuck = 0; prevX = Math.round(G.p.x); }
        if (stuck > 900) { ev.push(i + ' TRABADO en x=' + Math.round(G.p.x) + ' R' + (G.roundIdx + 1)); break; }
      }
      if (G.st === 'ending' && G.stT > 260) { ev.push(i + ' FINAL OK pts=' + G.score); break; }
    }
    return ev;
  }

  /* ------------------------------------------------------------------ */
  /* Test del novato: modela a una persona de verdad, no a un robot.
     Reacciona 200 ms tarde, salta cuando ve el peligro a una distancia que
     varia (45-105 px, variabilidad humana) y salta los pozos cerca del borde.
     CRITERIO: tiene que terminar el Round 1 muriendo poco o nada.
     Antes del pase de UX hacia GAME OVER a los 2 segundos, siempre.        */
  function novato(round) {
    var I = global.Input;
    Game._round(round || 0);
    G.st = 'play'; G.stT = 0; G.lives = 3; G.score = 0;
    var muertes = [], cola = [], vista = 75, i, j;
    for (i = 0; i < 15000; i++) {
      var p = G.p;
      if (!p) break;
      if (i % 40 === 0) vista = 45 + Math.random() * 60;
      var quiere = false;
      var c = Math.floor((p.x + p.w) / 16);
      for (var k = 1; k <= 5; k++) {
        if (G.level.g[c + k] === 0) {
          if ((c + k) * 16 - (p.x + p.w) < 30) quiere = true;
          break;
        }
      }
      for (var e = 0; e < G.ents.length; e++) {
        var en = G.ents[e];
        if (['crab', 'frog', 'rock', 'fire', 'gull', 'coco'].indexOf(en.t) < 0) continue;
        var dx = en.x - (p.x + p.w);
        if (dx > -6 && dx < vista) quiere = true;
      }
      cola.push(quiere);
      var dec = cola.length > 12 ? cola.shift() : false;
      I.left = false; I.right = true;
      I.jumpP = dec && p.onGround;
      I.fire = p.weapon > 0; I.fireP = false; I.anyP = false;
      Game.update();
      if (G.st === 'dying') {
        muertes.push(Math.round((G.p.x / 2.1) / 60) + 's');
        for (j = 0; j < 300 && G.st !== 'play'; j++) { G.lives = 3; I.jumpP = false; Game.update(); }
        cola = [];
      }
      if (G.st === 'clear') {
        return 'TERMINO' + (muertes.length ? (' — murio en ' + muertes.join(', ')) : ' SIN MORIR');
      }
    }
    return 'NO TERMINO. muertes: ' + muertes.slice(0, 10).join(', ');
  }

  global.WCBot = { run: run, step: step, novato: novato };
})(window);
