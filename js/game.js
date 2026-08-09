/* WonderCami — motor de juego.
   Cami cruza la costa brasilera en moto tirando botellas de vino para
   rescatar a Rosita del Capitan Coco. */
(function (global) {
  'use strict';

  var TILE = 16, ROWS = 11, LEVEL_H = ROWS * TILE, HUD_H = 16;
  var VH = LEVEL_H + HUD_H;          // alto virtual del canvas
  var WATER_Y = (ROWS - 3) * TILE;   // superficie del agua (al ras de la arena)

  // Fisica
  var GRAV = 0.38, MAXFALL = 7.5;
  var RUN = 2.1, ACC = 0.5, MOTO_SPEED = 3.1;
  var JUMP_V = 7.8, JUMP_HOLD = 0.22, JUMP_HOLD_F = 11;
  var VIT_MAX = 100, VIT_DRAIN = 100 / (52 * 60);

  var PW = 10, PH = 22;              // hitbox de Cami a pie
  var PW_MOTO = 20, PH_MOTO = 20;

  var FOOD = {
    queso: { vit: 22, pts: 100 }, salamin: { vit: 28, pts: 150 },
    aceituna: { vit: 14, pts: 100 }, mani: { vit: 10, pts: 100 }
  };
  var ITEM_NAME = {
    queso: 'QUESO', salamin: 'SALAMIN', aceituna: 'ACEITUNA', mani: 'MANI',
    moto: 'MOTO!', botella: 'BOTELLA!', botella2: 'BOTELLA DOBLE!',
    estrella: 'INVENCIBLE!', vida: '1UP!'
  };

  var S = null;            // sprites
  var vw = 400;            // ancho virtual (lo fija main.js)

  var G = {
    st: 'title', stT: 0,
    score: 0, hi: 0, lives: 3, roundIdx: 0,
    level: null, cam: 0, camF: 0, camMax: 0,
    p: null, ents: [], bots: [], fx: [], boss: null,
    t: 0, nextLifeAt: 20000, shake: 0, flash: 0,
    bossNoWeaponT: 0
  };

  /* ================= utilidades ================= */

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ================= carga de nivel ================= */

  function smoothGround(g) {
    // Ningun escalon de tierra a tierra puede subir mas de 1 tile:
    // asi las lomas se caminan como rampas.
    var n = g.length, i, pass;
    function suavizar() {
      for (pass = 0; pass < 6; pass++) {
        for (i = 1; i < n; i++)
          if (g[i] > 0 && g[i - 1] > 0 && g[i] - g[i - 1] > 1) g[i] = g[i - 1] + 1;
        for (i = n - 2; i >= 0; i--)
          if (g[i] > 0 && g[i + 1] > 0 && g[i] - g[i + 1] > 1) g[i] = g[i + 1] + 1;
      }
    }
    suavizar();

    // Cada pozo lleva 3 columnas llanas antes y 3 despues. Si el salto sale
    // bajando una loma, Cami esta en el aire cuando llega al borde y no puede
    // saltar: es una muerte que el jugador no controla.
    var run = 0;
    for (i = 0; i <= n; i++) {
      if (i < n && g[i] === 0) { run++; continue; }
      if (run > 0) {
        var s = i - run, e = i - 1, k;
        if (s - 1 >= 0 && g[s - 1] > 0)
          for (k = Math.max(0, s - 3); k < s; k++) if (g[k] > 0) g[k] = g[s - 1];
        if (e + 1 < n && g[e + 1] > 0)
          for (k = e + 1; k <= Math.min(n - 1, e + 3); k++) if (g[k] > 0) g[k] = g[e + 1];
      }
      run = 0;
    }
    suavizar();
    return g;
  }

  // Columna de tierra segura: deja columnas libres a los dos lados. A la
  // izquierda porque ahi aterriza Cami despues de un pozo, y a la derecha
  // porque si salta el obstaculo tiene que caer en piso firme.
  function nearestGroundCol(g, c, ml, mr) {
    var n = g.length;
    if (ml === undefined) { ml = 5; mr = 5; }
    c = clamp(c, 0, n - 1);
    function ok(i) {
      if (i < 0 || i >= n) return false;
      for (var j = i - ml; j <= i + mr; j++) {
        if (j < 0 || j >= n || g[j] === 0) return false;
      }
      return true;
    }
    for (var d = 0; d < n; d++) {
      if (ok(c - d)) return c - d;
      if (ok(c + d)) return c + d;
    }
    if (ml > 0 || mr > 0) return nearestGroundCol(g, c, Math.max(0, ml - 1), Math.max(0, mr - 1));
    return clamp(c, 0, n - 1);
  }

  // Ubica un bicho o un obstaculo: tierra segura Y a mas de 4 columnas de
  // cualquier otro peligro. Si no hay lugar, devuelve -1 y no se coloca:
  // preferimos un round con menos enemigos que un amontonamiento mortal.
  function placeHazardCol(g, c, used) {
    var n = g.length, SEP = 4;
    function safe(i) {
      if (i < 0 || i >= n || used[i]) return false;
      for (var j = i - 5; j <= i + 5; j++) {
        if (j < 0 || j >= n || g[j] === 0) return false;
      }
      return true;
    }
    for (var d = 0; d < n; d++) {
      if (safe(c - d)) { c -= d; break; }
      if (safe(c + d)) { c += d; break; }
      if (d === n - 1) return -1;
    }
    for (var u = -SEP; u <= SEP; u++) used[c + u] = true;
    return c;
  }

  // Columna de agua mas cercana que no tenga un muelle encima: si no,
  // el pulpo emerge dentro de la plataforma donde esta parada Cami.
  function nearestWaterCol(g, c, plats, taken) {
    var n = g.length;
    c = clamp(c, 0, n - 1);
    function free(i) {
      if (i < 0 || i >= n || g[i] !== 0 || taken[i]) return false;
      for (var k = 0; k < plats.length; k++) {
        var a = plats[k].x / TILE, b = a + plats[k].w / TILE;
        if (i + 1 > a - 1 && i < b + 1) return false;
      }
      return true;
    }
    for (var d = 0; d < n; d++) {
      if (free(c - d)) { c -= d; break; }
      if (free(c + d)) { c += d; break; }
      if (d === n - 1) return -1;
    }
    for (var u = -3; u <= 3; u++) taken[c + u] = true;
    return c;
  }

  function loadRound(idx) {
    var def = Levels.area1[idx];
    var g = smoothGround(def.g.slice());
    var L = {
      def: def, g: g, cols: g.length, width: g.length * TILE,
      sky: def.sky, sea: def.sea, name: def.name,
      metaCol: def.metaCol, boss: !!def.boss,
      bossX: def.bossCol ? def.bossCol * TILE : 0,
      arenaX: def.arenaCol ? def.arenaCol * TILE : 0,
      checkpointX: 0
    };
    G.level = L;
    // el checkpoint tiene que caer si o si sobre tierra firme
    if (def.checkpoint) L.checkpointX = nearestGroundCol(g, def.checkpoint, 2, 2) * TILE;
    buildEnts();
    G.p = makePlayer(TILE * 2);
    G.p.spawnX = TILE * 2;
    G.cam = 0; G.camF = 0; G.camMax = 0;
    G.bots = []; G.fx = []; G.boss = null;
    G.bossNoWeaponT = 0;
  }

  function topAt(col) {
    var g = G.level.g;
    if (col < 0) col = 0;
    if (col >= g.length) col = g.length - 1;
    var h = g[col];
    return h === 0 ? 1e9 : (ROWS - h) * TILE;
  }
  function topAtX(x) { return topAt(Math.floor(x / TILE)); }
  function isWaterCol(c) {
    var g = G.level.g;
    return g[clamp(c, 0, g.length - 1)] === 0;
  }

  function buildEnts() {
    var L = G.level, list = [], plats = [], i, c;
    var g = L.g;

    // 1) Muelles de madera. Un salto normal avanza entre 30 y 86 px, o sea
    //    que desde el borde L el muelle util va de la columna L+3 a la L+6.
    //    Colocamos uno ahi mientras falten mas de 4 columnas de agua.
    var run = 0;
    for (i = 0; i <= g.length; i++) {
      if (i < g.length && g[i] === 0) { run++; continue; }
      if (run >= 5) {
        var s = i - run, e2 = i - 1;
        var lp = s - 1;                        // ultimo lugar donde se puede pisar
        var guard = 0;
        while (e2 - lp > 4 && guard++ < 40) {
          // El muelle arranca 2 columnas despues del borde y llega hasta 8:
          // cubre desde el saltito mas corto hasta el salto largo en moto.
          var a = lp + 2, b = Math.min(lp + 8, e2);
          if (a > e2 || b <= lp) break;
          plats.push({ t: 'plat', x: a * TILE, y: (ROWS - 3) * TILE, w: (b - a + 1) * TILE, h: 6,
            x0: a * TILE, mv: 0, ph: 0 });
          lp = b;
        }
      }
      run = 0;
    }

    // 2) El resto de las entidades, ya sabiendo donde estan los muelles
    var used = {}, usedWater = {};
    for (i = 0; i < L.def.ents.length; i++) {
      var e = L.def.ents[i];
      c = e.c;
      if (e.t === 'octo') {
        c = nearestWaterCol(g, c, plats, usedWater);
        if (c < 0) continue;                       // no quedo agua libre
        list.push({ t: 'octo', x: c * TILE + 2, y: WATER_Y + 16, w: 12, h: 11,
          base: WATER_Y + 16, tt: Math.floor(Math.random() * 180), a: 0 });
        continue;
      }
      var lethal = (e.t === 'crab' || e.t === 'frog' || e.t === 'gull' ||
                    e.t === 'rock' || e.t === 'fire');
      if (lethal) {
        c = placeHazardCol(g, c, used);
        if (c < 0) continue;                       // no habia lugar seguro
      } else {
        c = nearestGroundCol(g, c, 1, 1);          // palmeras y huevos no molestan
      }
      var top = topAt(c);
      switch (e.t) {
        case 'palm':
          list.push({ t: 'palm', x: c * TILE, y: top, w: 16, h: 0, coco: !!e.coco, dropped: false });
          break;
        case 'crab':
          list.push({ t: 'crab', x: c * TILE, y: top - 10, w: 16, h: 10, vx: -0.6, a: 0, on: false });
          break;
        case 'frog':
          list.push({ t: 'frog', x: c * TILE, y: top - 10, w: 14, h: 10, vx: 0, vy: 0,
            tt: 30 + Math.floor(Math.random() * 60), dir: -1, on: true });
          break;
        case 'gull':
          // vuelan bajo: hay que saltarlas (o botellearlas)
          list.push({ t: 'gull', x: c * TILE, y: top - 15, w: 12, h: 7, on: false, a: 0 });
          break;
        case 'rock':
          list.push({ t: 'rock', x: c * TILE + 2, y: top - 10, w: 12, h: 10 });
          break;
        case 'fire':
          list.push({ t: 'fire', x: c * TILE + 1, y: top - 10, w: 10, h: 10 });
          break;
        case 'egg':
          list.push({ t: 'egg', x: c * TILE + 3, y: top - 10, w: 10, h: 10, item: e.item, open: 0 });
          break;
      }
    }

    if (L.metaCol !== undefined) {
      var mc = nearestGroundCol(g, L.metaCol);
      list.push({ t: 'meta', x: mc * TILE, y: topAt(mc) - 30, w: 16, h: 30 });
      L.metaX = mc * TILE;
    }

    G.ents = plats.concat(list);
    G.plats = plats;
  }

  function makePlayer(x) {
    // por las dudas: nunca aparecer sobre el agua
    if (topAtX(x) > 1e8) x = nearestGroundCol(G.level.g, Math.floor(x / TILE), 2, 2) * TILE;
    return {
      x: x, y: topAtX(x) - PH, w: PW, h: PH, vx: 0, vy: 0,
      onGround: false, face: 1, anim: 0, animT: 0,
      moto: false, weapon: 0, vit: VIT_MAX, inv: 0, star: 0,
      throwT: 0, jumpF: 0, dead: false, deadT: 0, spawnX: x,
      coyote: 0
    };
  }

  /* ================= arranque / estados ================= */

  function newGame() {
    G.score = 0; G.lives = 3; G.roundIdx = 0; G.nextLifeAt = 20000;
    loadRound(0);
    setState('ready');
  }

  function setState(s) { G.st = s; G.stT = 0; }

  function respawn() {
    var L = G.level;
    var sx = G.p.spawnX;
    // Al morir se pierde la moto y la botella doble, pero si tenias arma
    // volves con la simple. Si te dejaramos sin nada, un enemigo volador
    // podia dejarte trabado para siempre en el mismo lugar.
    var keep = G.p.weapon > 0 ? 1 : 0;
    buildEnts();
    G.p = makePlayer(sx);
    G.p.spawnX = sx;
    G.p.weapon = keep;
    G.p.inv = 90;
    G.bots = []; G.fx = [];
    if (L.boss && G.boss) { G.boss.hp = G.boss.maxhp; G.boss.flash = 0; }
    G.camF = clamp(sx - vw * 0.42, 0, Math.max(0, L.width - vw));
    G.cam = Math.round(G.camF);
    G.camMax = G.cam;
    setState('ready');
  }

  function addScore(n, x, y) {
    G.score += n;
    if (x !== undefined) G.fx.push({ t: 'txt', x: x, y: y, vy: -0.55, life: 46, s: String(n) });
    if (G.score >= G.nextLifeAt) {
      G.nextLifeAt += 20000; G.lives++; Snd.sfx('life');
    }
  }

  function puff(x, y, color, n, spd) {
    for (var i = 0; i < (n || 6); i++)
      G.fx.push({ t: 'p', x: x, y: y, vx: rnd(-1, 1) * (spd || 1.4), vy: rnd(-1.8, 0.3) * (spd || 1.4),
        life: 20 + Math.random() * 14, c: color || '#ffffff' });
  }

  function killPlayer(cause) {
    var p = G.p;
    if (p.dead) return;
    if (global.WC_DEBUG) console.log('MUERTE', cause, 'x=' + Math.round(p.x), 'y=' + Math.round(p.y), 'vit=' + Math.round(p.vit));
    p.dead = true; p.deadT = 0; p.vy = -5.4; p.vx = 0;
    G.shake = 10;
    Snd.stopMusic();
    Snd.sfx(cause === 'water' ? 'splash' : 'die');
    setState('dying');
  }

  /* ================= jugador ================= */

  function playerUpdate() {
    var p = G.p, L = G.level;
    var I = global.Input;

    if (p.inv > 0) p.inv--;
    if (p.star > 0) { p.star--; if (p.star === 0) p.inv = 30; }
    if (p.throwT > 0) p.throwT--;

    // vitalidad
    p.vit -= VIT_DRAIN;
    if (p.vit <= 0) { p.vit = 0; killPlayer('vit'); return; }

    // ---- horizontal
    if (p.moto) {
      p.vx = MOTO_SPEED; p.face = 1;
    } else {
      var want = 0;
      if (I.left) want -= 1;
      if (I.right) want += 1;
      var target = want * RUN;
      if (want !== 0) p.face = want;
      if (p.vx < target) p.vx = Math.min(target, p.vx + ACC);
      else if (p.vx > target) p.vx = Math.max(target, p.vx - ACC);
    }

    // ---- salto
    if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
    if (I.jumpP && (p.onGround || p.coyote > 0)) {
      p.vy = -JUMP_V; p.onGround = false; p.coyote = 0; p.jumpF = JUMP_HOLD_F;
      Snd.sfx('jump');
    }
    if (p.jumpF > 0 && I.jump && p.vy < 0) { p.vy -= JUMP_HOLD; p.jumpF--; }
    else p.jumpF = 0;

    // ---- tirar botella
    if (I.fireP && p.weapon > 0 && p.throwT === 0) {
      var maxB = p.weapon === 2 ? 4 : 2;
      if (G.bots.length < maxB) {
        throwBottle(p.weapon === 2);
        p.throwT = 12;
        Snd.sfx('throw');
      }
    }

    // ---- gravedad
    p.vy += GRAV;
    if (p.vy > MAXFALL) p.vy = MAXFALL;

    var pw = p.moto ? PW_MOTO : PW, ph = p.moto ? PH_MOTO : PH;
    p.w = pw; p.h = ph;

    // ---- mover en X con pared / rampa
    var nx = p.x + p.vx;
    var leftLimit = Math.max(0, G.cam);
    if (L.boss && p.x > L.arenaX) leftLimit = Math.max(leftLimit, L.arenaX);
    if (nx < leftLimit) { nx = leftLimit; p.vx = 0; }
    if (nx + pw > L.width) { nx = L.width - pw; p.vx = 0; }

    if (p.onGround) {
      var footTop = colTopRange(nx, nx + pw);
      if (footTop < 1e8) {
        var diff = (p.y + ph) - footTop;
        if (diff > 0 && diff <= TILE + 2) { p.y = footTop - ph; }         // sube la rampa
        else if (diff > TILE + 2) { nx = p.x; p.vx = 0; }                  // pared
      }
    } else {
      var t2 = colTopRange(nx, nx + pw);
      if (t2 < 1e8 && (p.y + ph) - t2 > 6) { nx = p.x; p.vx = 0; }
    }
    p.x = nx;

    // ---- mover en Y
    var prevBottom = p.y + ph;
    p.y += p.vy;
    p.onGround = false;

    var top = colTopRange(p.x, p.x + pw);
    if (p.vy >= 0 && top < 1e8 && p.y + ph >= top && prevBottom <= top + Math.max(10, p.vy + 4)) {
      p.y = top - ph; p.vy = 0; p.onGround = true;
    }

    // plataformas (solo desde arriba)
    for (var i = 0; i < G.plats.length; i++) {
      var pl = G.plats[i];
      if (p.vy < 0) break;
      if (p.x + pw > pl.x && p.x < pl.x + pl.w &&
          prevBottom <= pl.y + 4 && p.y + ph >= pl.y && p.y + ph <= pl.y + 14) {
        p.y = pl.y - ph; p.vy = 0; p.onGround = true;
        if (pl.mv) p.x += pl.dx || 0;
      }
    }

    // caida al agua
    if (p.y > LEVEL_H + 8) { killPlayer('water'); return; }

    // ---- animacion
    if (p.moto) { p.animT++; p.anim = (p.animT >> 2) & 1; }
    else if (!p.onGround) p.anim = -1;
    else if (Math.abs(p.vx) > 0.25) { p.animT += Math.abs(p.vx); p.anim = Math.floor(p.animT / 5) % 4; }
    else { p.anim = -2; p.animT = 0; }

    // ---- fin de round
    if (!L.boss && L.metaX !== undefined && p.x + pw / 2 > L.metaX + 6) {
      finishRound();
    }
    if (L.checkpointX && p.x > L.checkpointX && p.spawnX < L.checkpointX) {
      p.spawnX = L.checkpointX;
      G.fx.push({ t: 'txt', x: p.x, y: p.y - 12, vy: -0.5, life: 70, s: 'CHECKPOINT' });
    }
  }

  // Punto mas alto del terreno entre dos x (Infinity si es todo agua)
  function colTopRange(x0, x1) {
    var c0 = Math.floor(x0 / TILE), c1 = Math.floor((x1 - 0.01) / TILE), best = 1e9;
    for (var c = c0; c <= c1; c++) {
      var t = topAt(c);
      if (t < best) best = t;
    }
    return best;
  }

  function throwBottle(dbl) {
    var p = G.p;
    var bx = p.x + (p.face > 0 ? p.w - 2 : -6);
    var by = p.y + 4;
    G.bots.push({ x: bx, y: by, w: 8, h: 8, vx: 3.2 * p.face, vy: -2.9, a: 0 });
    if (dbl) G.bots.push({ x: bx, y: by, w: 8, h: 8, vx: 2.2 * p.face, vy: -4.3, a: 0 });
  }

  function giveItem(kind, x, y) {
    var p = G.p;
    if (FOOD[kind]) {
      p.vit = Math.min(VIT_MAX, p.vit + FOOD[kind].vit);
      addScore(FOOD[kind].pts, x, y);
      Snd.sfx('eat');
    } else if (kind === 'moto') {
      p.moto = true; p.h = PH_MOTO; p.w = PW_MOTO; p.y -= 2;
      addScore(500, x, y); Snd.sfx('moto');
    } else if (kind === 'botella') {
      p.weapon = Math.max(p.weapon, 1); addScore(500, x, y); Snd.sfx('item');
    } else if (kind === 'botella2') {
      p.weapon = 2; addScore(1000, x, y); Snd.sfx('item');
    } else if (kind === 'estrella') {
      p.star = 8 * 60; addScore(1000, x, y); Snd.sfx('item');
    } else if (kind === 'vida') {
      G.lives++; addScore(0, x, y); Snd.sfx('life');
    }
    G.fx.push({ t: 'txt', x: x - 10, y: y - 14, vy: -0.4, life: 60, s: ITEM_NAME[kind] || '' });
  }

  function hurtPlayer() {
    var p = G.p;
    if (p.inv > 0 || p.star > 0 || p.dead) return;
    if (p.moto) {
      p.moto = false; p.inv = 100; p.h = PH; p.w = PW;
      puff(p.x + 8, p.y + 12, '#e0332f', 12, 2);
      Snd.sfx('hurt');
      G.shake = 8;
      return;
    }
    killPlayer('hit');
  }

  /* ================= entidades ================= */

  function entsUpdate() {
    var p = G.p, L = G.level, i, e;
    var viewL = G.cam - 80, viewR = G.cam + vw + 80;

    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i];
      if (e.dead) continue;
      var near = e.x > viewL && e.x < viewR;

      switch (e.t) {
        case 'plat':
          if (e.mv) {
            e.ph += 0.018;
            var nx2 = e.x0 + Math.sin(e.ph) * e.mv * TILE;
            e.dx = nx2 - e.x; e.x = nx2;
          }
          break;

        case 'crab':
          if (!near) break;
          // Patrulla: arranca hacia Cami y despues rebota contra el agua o
          // los desniveles. No la persigue, asi se puede saltar.
          if (!e.on && Math.abs(p.x - e.x) < 150) { e.on = true; e.vx = p.x < e.x ? -0.62 : 0.62; }
          if (e.on) {
            var nx3 = e.x + e.vx;
            var t = topAtX(nx3 + (e.vx > 0 ? e.w : 0));
            if (t > 1e8 || Math.abs(t - (e.y + e.h)) > TILE + 2 ||
                nx3 < 0 || nx3 + e.w > G.level.width) {
              e.vx = -e.vx;
            } else {
              e.x = nx3; e.y = t - e.h;
            }
            e.a = (G.t >> 3) & 1;
          }
          break;

        case 'frog':
          if (!near) break;
          e.tt--;
          if (e.on && e.tt <= 0) {
            // solo persigue de cerca; si no, salta patrullando
            if (Math.abs(p.x - e.x) < 110) e.dir = p.x < e.x ? -1 : 1;
            else e.dir = -e.dir;
            e.vy = -4.4; e.vx = 0.85 * e.dir; e.on = false; e.tt = 95;
          }
          if (!e.on) {
            e.vy += 0.32; e.x += e.vx; e.y += e.vy;
            var tf = topAtX(e.x + 7);
            if (e.vy > 0 && tf < 1e8 && e.y + e.h >= tf) { e.y = tf - e.h; e.vy = 0; e.on = true; e.tt = 45; }
            if (e.y > LEVEL_H + 20) { e.dead = true; }
          }
          e.a = e.on ? 0 : 1;
          break;

        case 'gull':
          if (!e.on) {
            // Arranca desde donde esta, sin teletransportarse al borde de la
            // pantalla: asi la ves venir de lejos y podes preparar el salto.
            if (p.x > e.x - 200) e.on = true;
            break;
          }
          e.x -= 1.0; e.a += 0.07;
          // Vuela raspando el piso, con muy poco vaiven, para que SIEMPRE se
          // pueda saltar por arriba. Si planeara alto se cruzaria con la
          // cabeza de Cami en el pico del salto y, si venis sin botellas,
          // quedarias trabado sin forma de pasar.
          var gt = topAtX(e.x + 6);
          if (gt > 1e8) gt = WATER_Y;
          // suavizado: si no, al cruzar un escalon del terreno pega un salto
          // de 16 px de golpe justo cuando la tenes encima
          e.y += ((gt - 15 + Math.sin(e.a) * 5) - e.y) * 0.12;
          // Nunca cruza un pozo: si se metiera ahi, te la comerias en el aire
          // durante un salto obligado, sin manera de esquivarla.
          if (topAtX(e.x - 10) > 1e8) e.dead = true;
          if (e.x < G.cam - 40) e.dead = true;
          break;

        case 'palm':
          // cae con anticipacion para que se pueda ver venir y esquivar
          if (e.coco && !e.dropped && p.x > e.x - 66 && p.x < e.x + 10) {
            e.dropped = true;
            G.ents.push({ t: 'coco', x: e.x + 4, y: e.y - 52, w: 8, h: 8, vy: 0 });
          }
          break;

        case 'coco':
          e.vy += 0.30; e.y += e.vy;
          var tc = topAtX(e.x + 4);
          if (tc < 1e8 && e.y + e.h >= tc) { e.dead = true; puff(e.x + 4, tc - 4, '#8a5a2b', 5, 1.1); }
          if (e.y > LEVEL_H + 20) e.dead = true;
          break;

        case 'octo':
          if (!near) break;
          e.tt++;
          var cyc = e.tt % 190;
          if (cyc < 100) e.y = e.base;
          else if (cyc < 128) e.y = e.base - (cyc - 100) / 28 * 30;
          else if (cyc < 165) e.y = e.base - 30;
          else e.y = e.base - 30 + (cyc - 165) / 25 * 30;
          e.a = (G.t >> 3) & 1;
          break;

        case 'egg':
          if (e.open > 0) { e.open--; if (e.open === 0) e.dead = true; break; }
          if (near && hit(p, e)) {
            e.open = 26;
            addScore(50, e.x, e.y);
            Snd.sfx('egg');
            // El item sale despedido hacia donde va Cami: si no, yendo en
            // moto (que no frena) le cae siempre atras y lo pierde.
            G.ents.push({ t: 'item', kind: e.item, x: e.x, y: e.y - 12, w: 10, h: 9,
              vx: clamp(p.vx * 0.85, -3, 3), vy: -2.6, life: 640, on: false, bob: 0 });
          }
          break;

        case 'item':
          e.life--;
          if (e.life <= 0) { e.dead = true; break; }
          if (!e.on) {
            e.vy += 0.28; e.y += e.vy;
            e.x += (e.vx || 0);
            e.vx = (e.vx || 0) * 0.985;
            var ti = topAtX(e.x + 5);
            if (e.vy > 0 && ti < 1e8 && e.y + e.h >= ti) { e.y = ti - e.h; e.vx = 0; e.on = true; }
            if (e.y > LEVEL_H + 20) e.dead = true;
          } else { e.bob += 0.12; }
          if (hit(p, e)) { giveItem(e.kind, e.x, e.y); e.dead = true; }
          break;
      }

      // ---- contacto con Cami
      if (!e.dead && !p.dead) {
        var lethal = (e.t === 'crab' || e.t === 'frog' || e.t === 'gull' || e.t === 'coco' ||
                      e.t === 'rock' || e.t === 'fire' || e.t === 'bcoco');
        if (e.t === 'octo' && e.y < e.base - 6) lethal = true;
        if (lethal && hit(p, e)) {
          if (global.WC_DEBUG) console.log('GOLPE de', e.t, 'en x=' + Math.round(e.x) + ' y=' + Math.round(e.y));
          if (p.star > 0 && e.t !== 'rock' && e.t !== 'fire') { destroyEnt(e); }
          else if (p.star > 0) { /* invencible atraviesa piedra y fuego */ }
          else hurtPlayer();
        }
      }
    }

    // proyectil del jefe
    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i];
      if (e.dead || e.t !== 'bcoco') continue;
      e.vy += 0.17; e.x += e.vx; e.y += e.vy;
      var tb = topAtX(e.x + 4);
      if (tb < 1e8 && e.y + e.h >= tb) { e.dead = true; puff(e.x + 4, tb - 4, '#8a5a2b', 5, 1.2); }
      if (e.x < G.cam - 30 || e.y > LEVEL_H + 20) e.dead = true;
    }

    for (i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].dead) G.ents.splice(i, 1);
    G.plats = G.ents.filter(function (x) { return x.t === 'plat'; });
  }

  var PTS = { crab: 200, frog: 300, gull: 400, octo: 500, coco: 100, rock: 100, bcoco: 50 };

  function destroyEnt(e) {
    e.dead = true;
    var c = e.t === 'rock' ? '#9a9aa5' : (e.t === 'coco' || e.t === 'bcoco' ? '#8a5a2b' : '#ff9ec4');
    puff(e.x + e.w / 2, e.y + e.h / 2, c, 8, 1.6);
    addScore(PTS[e.t] || 100, e.x, e.y);
    Snd.sfx('smash');
  }

  function botsUpdate() {
    for (var i = G.bots.length - 1; i >= 0; i--) {
      var b = G.bots[i];
      b.vy += 0.17; b.x += b.vx; b.y += b.vy; b.a += 0.35;
      var t = topAtX(b.x + 4);
      var gone = false;
      if (t < 1e8 && b.y + b.h >= t) { splash(b.x, t - 4); gone = true; }
      if (b.y > LEVEL_H + 10 || b.x < G.cam - 20 || b.x > G.cam + vw + 30) gone = true;

      if (!gone) {
        for (var j = 0; j < G.ents.length; j++) {
          var e = G.ents[j];
          if (e.dead) continue;
          if (e.t === 'crab' || e.t === 'frog' || e.t === 'gull' || e.t === 'coco' ||
              e.t === 'rock' || e.t === 'bcoco' ||
              (e.t === 'octo' && e.y < e.base - 6)) {
            if (hit(b, e)) { destroyEnt(e); splash(b.x, b.y); gone = true; break; }
          }
        }
      }
      if (!gone && G.boss && !G.boss.dead && G.boss.flash === 0) {
        if (hit(b, G.boss)) { bossHit(); splash(b.x, b.y); gone = true; }
      }
      if (gone) G.bots.splice(i, 1);
    }
  }

  function splash(x, y) {
    for (var i = 0; i < 7; i++)
      G.fx.push({ t: 'p', x: x + 4, y: y + 4, vx: rnd(-1.4, 1.4), vy: rnd(-2, -0.2),
        life: 16 + Math.random() * 10, c: i % 2 ? '#8e2247' : '#2e7d4f' });
  }

  function fxUpdate() {
    for (var i = G.fx.length - 1; i >= 0; i--) {
      var f = G.fx[i];
      f.life--;
      if (f.t === 'p') { f.vy += 0.13; f.x += f.vx; f.y += f.vy; }
      else { f.y += f.vy; }
      if (f.life <= 0) G.fx.splice(i, 1);
    }
  }

  /* ================= jefe ================= */

  function spawnBoss() {
    var L = G.level;
    var y = topAtX(L.bossX) - 48;
    G.boss = { x: L.bossX, y: y, y0: y, w: 44, h: 48, hp: 10, maxhp: 10,
      t: 0, flash: 0, dead: false, mouth: 0, deadT: 0 };
    Snd.music('boss');
  }

  function bossHit() {
    var b = G.boss;
    b.hp--; b.flash = 14; G.shake = 7;
    addScore(300, b.x + 20, b.y);
    if (b.hp <= 0) {
      b.dead = true; b.deadT = 0;
      Snd.stopMusic(); Snd.sfx('bossdie');
      addScore(5000, b.x + 20, b.y - 10);
      G.shake = 26;
    } else Snd.sfx('bosshit');
  }

  function bossUpdate() {
    var b = G.boss, p = G.p;
    if (b.dead) {
      b.deadT++;
      if (b.deadT % 4 === 0) puff(b.x + rnd(0, b.w), b.y + rnd(0, b.h), b.deadT % 8 ? '#ff7a18' : '#ffe14f', 5, 2.2);
      if (b.deadT > 90) { G.boss = null; winArea(); }
      return;
    }
    b.t++;
    if (b.flash > 0) b.flash--;
    b.y = b.y0 + Math.sin(b.t * 0.045) * 5;

    var period = b.hp <= 5 ? 62 : 82;
    var ph = b.t % period;
    b.mouth = ph > period - 22 ? 1 : 0;
    if (ph === period - 1) {
      var n = b.hp <= 5 ? 3 : 1;
      for (var i = 0; i < n; i++) {
        G.ents.push({ t: 'bcoco', x: b.x + 4, y: b.y + 30, w: 8, h: 8,
          vx: -2.1 - i * 0.35, vy: -3.6 + i * 0.9 });
      }
      Snd.sfx('throw');
    }
    if (hit(p, b)) hurtPlayer();
  }

  /* ================= fin de round / area ================= */

  function finishRound() {
    Snd.stopMusic();
    Snd.jingle('clear');
    G.bonus = Math.floor(G.p.vit) * 10;
    setState('clear');
  }

  function winArea() {
    Snd.jingle('win');
    G.bonus = Math.floor(G.p.vit) * 10;
    setState('ending');
    G.rosita = { x: G.p.x + 120, y: G.p.y, arrived: false };
  }

  /* ================= loop principal ================= */

  function update() {
    G.t++;
    if (G.shake > 0) G.shake--;
    if (G.flash > 0) G.flash--;
    G.stT++;
    var I = global.Input;

    switch (G.st) {
      case 'title':
        if (I.anyP) { Snd.unlock(); Snd.jingle('start'); newGame(); }
        break;

      case 'ready':
        if (G.stT > 96) {
          setState('play');
          Snd.music(G.level.boss && G.p.x > G.level.arenaX ? 'boss' : 'beach');
        }
        break;

      case 'play': {
        var L = G.level;
        playerUpdate();
        if (G.p.dead) break;
        if (L.boss && !G.boss && G.p.x > L.arenaX) spawnBoss();
        // si volvio a la arena despues de morir, la musica del jefe arranca igual
        if (G.boss && !G.boss.dead && G.p.x > L.arenaX) Snd.music('boss');
        if (G.boss) bossUpdate();
        entsUpdate();
        botsUpdate();
        fxUpdate();
        camUpdate();
        // Red de seguridad: en la arena, si Cami se queda sin botellas le damos una
        if (G.boss && !G.boss.dead && G.p.weapon === 0) {
          G.bossNoWeaponT++;
          var hasItem = G.ents.some(function (e) {
            return e.t === 'item' && (e.kind === 'botella' || e.kind === 'botella2');
          });
          if (!hasItem && G.bossNoWeaponT > 180) {
            G.bossNoWeaponT = 0;
            // Cae justo encima de Cami: si aparece lejos y ella se queda
            // esquivando cocos, nunca la agarra y la pelea es inganable.
            G.ents.push({ t: 'item', kind: 'botella2', x: G.p.x + G.p.w / 2 - 5,
              y: Math.max(4, G.p.y - 70), w: 10, h: 9, vx: 0, vy: 0,
              life: 900, on: false, bob: 0 });
            G.fx.push({ t: 'txt', x: G.p.x - 14, y: G.p.y - 20, vy: -0.4, life: 80, s: 'BOTELLA!' });
          }
        }
        break;
      }

      case 'dying': {
        var p = G.p;
        p.vy += GRAV; p.y += p.vy; p.deadT++;
        fxUpdate();
        if (G.stT > 110) {
          G.lives--;
          if (G.lives <= 0) { Snd.jingle('over'); setState('gameover'); }
          else respawn();
        }
        break;
      }

      case 'clear':
        fxUpdate();
        if (G.stT > 40 && G.bonus > 0) {
          var step = Math.min(G.bonus, 40);
          G.bonus -= step; G.score += step;
          if (G.stT % 3 === 0) Snd.sfx('select');
        }
        if (G.stT > 200 || (G.stT > 60 && I.anyP && G.bonus === 0)) {
          G.roundIdx++;
          if (G.roundIdx >= Levels.area1.length) { setState('ending'); }
          else { loadRound(G.roundIdx); setState('ready'); }
        }
        break;

      case 'gameover':
        if (G.score > G.hi) G.hi = G.score;
        if (G.stT > 150 && I.anyP) { saveHi(); setState('title'); }
        if (G.stT > 480) { saveHi(); setState('title'); }
        break;

      case 'ending':
        fxUpdate();
        if (G.stT > 40 && G.bonus > 0) { G.bonus -= Math.min(G.bonus, 60); G.score += Math.min(G.bonus, 60) || 0; }
        if (G.rosita && !G.rosita.arrived) {
          G.rosita.x -= 1.6;
          if (G.rosita.x < G.p.x + 22) G.rosita.arrived = true;
        }
        if (G.score > G.hi) G.hi = G.score;
        if (G.stT > 240 && I.anyP) { saveHi(); setState('title'); }
        break;
    }
  }

  function camUpdate() {
    var L = G.level, p = G.p;
    var target = p.x + p.w / 2 - vw * 0.42;
    target = clamp(target, 0, Math.max(0, L.width - vw));
    // En la pelea la camara sigue a Cami igual, pero nunca deja al Capitan
    // Coco fuera de cuadro.
    if (L.boss && G.boss) {
      target = clamp(Math.max(target, L.bossX + 62 - vw), 0, Math.max(0, L.width - vw));
    }
    G.camF += (target - G.camF) * 0.14;
    if (Math.abs(target - G.camF) < 0.4) G.camF = target;
    // la camara se dibuja siempre en pixeles enteros: si no, los tiles
    // quedan con costuras por el antialias
    G.cam = Math.round(G.camF);
  }

  function saveHi() {
    try { localStorage.setItem('wondercami.hi', String(G.hi)); } catch (e) {}
  }
  function loadHi() {
    try { G.hi = parseInt(localStorage.getItem('wondercami.hi') || '0', 10) || 0; } catch (e) { G.hi = 0; }
  }

  /* ================= dibujo ================= */

  var HORIZON = 92;   // linea del mar: todo lo de abajo es agua de fondo

  function drawSky(ctx) {
    var sky = (G.level ? G.level.sky : ['#37c0ee', '#8fe3f7', '#f6e7b8']);
    var gr = ctx.createLinearGradient(0, 0, 0, HORIZON);
    gr.addColorStop(0, sky[0]); gr.addColorStop(0.66, sky[1]); gr.addColorStop(1, sky[2]);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, vw, HORIZON);
  }

  function drawBack(ctx) {
    var cam = G.cam;
    var sea = G.level ? G.level.sea : '#1f7fbf';

    // sol
    ctx.fillStyle = 'rgba(255,247,200,0.92)';
    ctx.beginPath(); ctx.arc(vw - 60, 30, 15, 0, 6.284); ctx.fill();

    // nubes
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    for (var i = 0; i < 7; i++) {
      var cx = ((i * 173 + 40) - cam * 0.18) % (vw + 180); if (cx < -90) cx += vw + 180;
      cloud(ctx, cx - 60, 12 + (i % 3) * 12, 1 + (i % 2) * 0.35);
    }

    // islas lejanas apoyadas en el horizonte
    ctx.fillStyle = shade(sea, 0.5);
    for (var k = 0; k < 9; k++) {
      var ix = ((k * 151 + 30) - cam * 0.3) % (vw + 200); if (ix < -110) ix += vw + 200;
      var iw = 60 + (k % 3) * 26, ih = 18 + (k % 4) * 8;
      ctx.beginPath();
      ctx.moveTo(ix - 100, HORIZON);
      ctx.lineTo(ix - 100 + iw / 2, HORIZON - ih);
      ctx.lineTo(ix - 100 + iw, HORIZON);
      ctx.closePath(); ctx.fill();
    }

    // el mar ocupa todo lo que va del horizonte para abajo
    var gr2 = ctx.createLinearGradient(0, HORIZON, 0, LEVEL_H);
    gr2.addColorStop(0, shade(sea, 0.85));
    gr2.addColorStop(1, sea);
    ctx.fillStyle = gr2;
    ctx.fillRect(0, HORIZON, vw, LEVEL_H - HORIZON);

    // olitas
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    for (var w = 0; w < vw; w += 14) {
      for (var r = 0; r < 3; r++) {
        var wy = HORIZON + 4 + r * 9 + Math.sin((w + G.t * (0.5 + r * 0.2)) * 0.09) * 1.5;
        ctx.fillRect(w + ((G.t * (0.15 + r * 0.1)) % 14), wy, 5 + r, 1);
      }
    }
  }

  function cloud(ctx, x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 6 * s, 0, 6.284);
    ctx.arc(x + 7 * s, y - 3 * s, 8 * s, 0, 6.284);
    ctx.arc(x + 16 * s, y, 6 * s, 0, 6.284);
    ctx.fill();
  }

  function shade(hex, f) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    r = clamp(Math.round(r * f + 255 * (1 - f) * 0.25), 0, 255);
    g = clamp(Math.round(g * f + 255 * (1 - f) * 0.3), 0, 255);
    b = clamp(Math.round(b * f + 255 * (1 - f) * 0.4), 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function drawPalm(ctx, x, groundY) {
    var t = groundY;
    ctx.fillStyle = '#8a5a2b';
    for (var i = 0; i < 46; i++) {
      var yy = t - i;
      var bend = Math.sin(i * 0.05) * 4;
      ctx.fillRect(x + 6 + bend, yy - 1, 4, 1);
    }
    ctx.fillStyle = '#5c3a1a';
    for (var j = 0; j < 46; j += 6) ctx.fillRect(x + 6 + Math.sin(j * 0.05) * 4, t - j - 1, 4, 1);
    var hx = x + 6 + Math.sin(46 * 0.05) * 4 + 2, hy = t - 46;
    ctx.fillStyle = '#1f7a2e';
    var arms = [[-1, -0.35], [1, -0.35], [-1, 0.25], [1, 0.25], [0, -1]];
    for (var a = 0; a < arms.length; a++) {
      var dx = arms[a][0], dy = arms[a][1];
      for (var s = 0; s < 18; s++) {
        var px = hx + dx * s, py = hy + dy * s + s * s * 0.035;
        var th = Math.max(1, 4 - s * 0.18);
        ctx.fillStyle = s < 9 ? '#48b85a' : '#1f7a2e';
        ctx.fillRect(px - th / 2, py, th, th);
      }
    }
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(hx - 4, hy + 4, 3, 3); ctx.fillRect(hx + 2, hy + 5, 3, 3);
  }

  function drawGround(ctx) {
    var L = G.level, g = L.g;
    var c0 = Math.max(0, Math.floor(G.cam / TILE) - 1);
    var c1 = Math.min(g.length - 1, Math.ceil((G.cam + vw) / TILE) + 1);
    for (var c = c0; c <= c1; c++) {
      var h = g[c];
      var x = c * TILE - G.cam;
      if (h === 0) { drawWater(ctx, x, c); continue; }
      var top = (ROWS - h) * TILE;
      ctx.fillStyle = '#cfae74';
      ctx.fillRect(x, top, TILE, LEVEL_H - top);
      ctx.fillStyle = '#f2dfae';
      ctx.fillRect(x, top, TILE, 4);
      ctx.fillStyle = '#e3c993';
      ctx.fillRect(x, top + 4, TILE, 2);
      // arena mojada al nivel del mar
      if (top < WATER_Y) {
        ctx.fillStyle = 'rgba(120,95,60,0.18)';
        ctx.fillRect(x, WATER_Y - 6, TILE, LEVEL_H - WATER_Y + 6);
      }
      // motitas, piedritas y caracoles
      var seed = c * 2654435761 % 1024;
      ctx.fillStyle = 'rgba(120,90,50,0.26)';
      for (var k = 0; k < 3; k++) {
        var sy = top + 9 + ((c * 37 + k * 53) % Math.max(6, (LEVEL_H - top - 12)));
        ctx.fillRect(x + ((c * 29 + k * 11) % 14), sy, 2, 2);
      }
      if (seed % 7 === 0) {
        ctx.fillStyle = '#fff4dd';
        ctx.fillRect(x + (seed % 10), top - 2, 3, 2);
        ctx.fillRect(x + (seed % 10) + 1, top - 3, 1, 1);
      } else if (seed % 11 === 0) {
        ctx.fillStyle = '#a89272';
        ctx.fillRect(x + (seed % 9), top - 2, 4, 2);
      }
      // borde hacia el agua
      if (c > 0 && g[c - 1] === 0) { ctx.fillStyle = '#b8955f'; ctx.fillRect(x, top, 2, LEVEL_H - top); }
      if (c < g.length - 1 && g[c + 1] === 0) { ctx.fillStyle = '#b8955f'; ctx.fillRect(x + TILE - 2, top, 2, LEVEL_H - top); }
    }
  }

  function drawWater(ctx, x, c) {
    var sea = G.level.sea;
    // el agua del pozo va mas clara que el mar del fondo para que el hueco
    // se lea de una
    ctx.fillStyle = shade(sea, 1.3);
    ctx.fillRect(x, WATER_Y, TILE, LEVEL_H - WATER_Y);
    ctx.fillStyle = 'rgba(190,235,255,0.55)';
    for (var i = 0; i < TILE; i += 4) {
      var wy = WATER_Y + 1 + Math.sin((c * TILE + i + G.t * 1.1) * 0.11) * 2;
      ctx.fillRect(x + i, wy, 3, 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    var fx2 = (c * 7 + Math.floor(G.t * 0.4)) % 16;
    ctx.fillRect(x + fx2, WATER_Y + 5, 4, 1);
  }

  function blit(ctx, img, x, y) {
    if (!img) return;
    ctx.drawImage(img, Math.round(x), Math.round(y));
  }

  function drawEnts(ctx) {
    var i, e, x, y;
    // palmeras primero (van detras del suelo)
    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i];
      if (e.t === 'palm') drawPalm(ctx, e.x - G.cam, e.y);
    }
    drawGround(ctx);

    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i];
      x = e.x - G.cam; y = e.y;
      if (x < -60 || x > vw + 60) continue;
      switch (e.t) {
        case 'plat':
          ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y, e.w, 6);
          ctx.fillStyle = '#b8834a'; ctx.fillRect(x, y, e.w, 2);
          ctx.fillStyle = '#5c3a1a';
          for (var q = 0; q < e.w; q += 8) ctx.fillRect(x + q, y + 4, 6, 2);
          break;
        case 'crab': blit(ctx, S.crab[e.a || 0][e.vx < 0 ? 'l' : 'r'], x, y); break;
        case 'frog': blit(ctx, S.frog[e.a || 0][e.vx < 0 ? 'l' : 'r'], x, y - 2); break;
        case 'gull': blit(ctx, S.gull[(G.t >> 3) & 1].l, x, y); break;
        case 'coco': case 'bcoco': blit(ctx, S.coco, x, y); break;
        case 'octo':
          // solo se ve la parte que asoma sobre el agua
          ctx.save();
          ctx.beginPath(); ctx.rect(0, 0, vw, WATER_Y + 5); ctx.clip();
          blit(ctx, S.octo[e.a || 0], x, y);
          ctx.restore();
          break;
        case 'rock': blit(ctx, S.rock, x - 2, y); break;
        case 'fire': blit(ctx, S.fire[(G.t >> 3) & 1], x - 1, y); break;
        case 'egg':
          blit(ctx, e.open > 0 ? S.eggOpen : S.egg, x, y + (e.open > 0 ? 0 : Math.sin(G.t * 0.08) * 1));
          break;
        case 'item':
          blit(ctx, S.items[e.kind], x, y + (e.on ? Math.sin(e.bob) * 2 : 0));
          break;
        case 'meta':
          blit(ctx, S.meta, x, y);
          break;
      }
    }
  }

  function drawPlayer(ctx) {
    var p = G.p;
    if (!p) return;
    if (p.inv > 0 && !p.dead && (G.t >> 2) % 2 === 0) return;
    var dir = p.face > 0 ? 'r' : 'l';
    var img, ox = -3, oy = -3;

    if (p.moto) {
      img = S.cami.moto[p.anim & 1][dir];
      ox = -3; oy = -3;
    } else if (p.dead) {
      img = S.cami.jump[dir];
    } else if (!p.onGround) {
      img = (p.throwT > 6 ? S.cami.throw[dir] : S.cami.jump[dir]);
    } else if (p.throwT > 4) {
      img = (Math.abs(p.vx) > 0.3 ? S.cami.throwRun[dir] : S.cami.throw[dir]);
    } else if (p.anim >= 0) {
      img = S.cami.run[p.anim][dir];
    } else {
      img = S.cami.stand[dir];
    }

    var x = p.x - G.cam + ox, y = p.y + oy;
    if (p.star > 0 && (G.t >> 1) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.9;
      blit(ctx, S.camiWhite[dir], x, y);
      ctx.restore();
      return;
    }
    if (p.dead) {
      ctx.save();
      ctx.translate(Math.round(x + 8), Math.round(y + 12));
      ctx.rotate(p.deadT * 0.14);
      ctx.drawImage(img, -8, -12);
      ctx.restore();
      return;
    }
    blit(ctx, img, x, y);
  }

  function drawBoss(ctx) {
    var b = G.boss;
    if (!b) return;
    var img = (b.flash > 0 && (G.t >> 1) % 2 === 0)
      ? (b.mouth ? S.bossFlash.open : S.bossFlash.idle)
      : (b.mouth ? S.boss.open : S.boss.idle);
    var x = Math.round(b.x - G.cam), y = Math.round(b.y);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, x, y, img.width * 2, img.height * 2);

    // barra de vida centrada arriba: nunca se sale de pantalla
    var bw = Math.min(140, vw - 60), bx = Math.round((vw - bw) / 2), by = 6;
    Font.drawCenter(ctx, 'CAPITAN COCO', vw / 2, by - 4, '#ffd93b', 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, by + 6, bw + 4, 8);
    ctx.fillStyle = '#7a1f1f'; ctx.fillRect(bx, by + 8, bw, 4);
    ctx.fillStyle = '#e0332f';
    ctx.fillRect(bx, by + 8, Math.round(bw * b.hp / b.maxhp), 4);
    ctx.fillStyle = '#ff9d95';
    ctx.fillRect(bx, by + 8, Math.round(bw * b.hp / b.maxhp), 1);
  }

  function drawBots(ctx) {
    for (var i = 0; i < G.bots.length; i++) {
      var b = G.bots[i];
      var img = S.bottle[Math.floor(b.a) % 2];
      ctx.save();
      ctx.translate(Math.round(b.x - G.cam + 4), Math.round(b.y + 4));
      ctx.rotate(b.a);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    }
  }

  function drawFx(ctx) {
    for (var i = 0; i < G.fx.length; i++) {
      var f = G.fx[i];
      if (f.t === 'p') {
        ctx.fillStyle = f.c;
        ctx.globalAlpha = Math.min(1, f.life / 14);
        ctx.fillRect(Math.round(f.x - G.cam), Math.round(f.y), 2, 2);
        ctx.globalAlpha = 1;
      } else {
        Font.draw(ctx, f.s, f.x - G.cam, f.y, f.life > 14 ? '#ffffff' : 'rgba(255,255,255,0.5)', 1);
      }
    }
  }

  /* ---------- HUD ---------- */

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }

  function drawHUD(ctx) {
    ctx.fillStyle = 'rgba(6,10,26,0.92)';
    ctx.fillRect(0, 0, vw, HUD_H);
    ctx.fillStyle = '#3a4a7a';
    ctx.fillRect(0, HUD_H - 1, vw, 1);

    Font.draw(ctx, 'CAMI', 4, 5, '#ffd93b', 1);
    Font.draw(ctx, pad(G.score, 7), 31, 5, '#ffffff', 1);

    // barra de vitalidad
    var bx = 78, bw = Math.max(50, vw - 78 - 86), by = 4, bh = 7;
    ctx.fillStyle = '#000000'; ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#1a1f36'; ctx.fillRect(bx, by, bw, bh);
    var f = G.p ? G.p.vit / VIT_MAX : 1;
    var col = f > 0.5 ? '#48b85a' : (f > 0.22 ? '#ffd93b' : '#e0332f');
    ctx.fillStyle = col;
    ctx.fillRect(bx, by, Math.round(bw * f), bh);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx, by, Math.round(bw * f), 2);

    // derecha: moto, arma, vidas, round
    if (G.p && G.p.moto) blit(ctx, S.items.moto, vw - 80, 4);
    if (G.p && G.p.weapon > 0)
      blit(ctx, G.p.weapon === 2 ? S.items.botella2 : S.items.botella, vw - 64, 3);
    blit(ctx, S.items.vida, vw - 48, 4);
    Font.draw(ctx, 'X' + Math.max(0, G.lives - 1), vw - 36, 5, '#ffffff', 1);
    Font.draw(ctx, 'R' + (G.roundIdx + 1), vw - 15, 5, '#6fd0ff', 1);
  }

  /* ---------- pantallas ---------- */

  function drawTitle(ctx) {
    drawSky(ctx);
    drawBack(ctx);
    // suelo simple
    var gy = LEVEL_H - 52;
    ctx.fillStyle = '#cfae74'; ctx.fillRect(0, gy, vw, 52);
    ctx.fillStyle = '#f2dfae'; ctx.fillRect(0, gy, vw, 4);
    ctx.fillStyle = '#e3c993'; ctx.fillRect(0, gy + 4, vw, 2);
    drawPalm(ctx, 18, gy);
    drawPalm(ctx, vw - 54, gy);

    var cx = vw / 2;
    var bob = Math.sin(G.t * 0.05) * 2;
    Font.drawCenter(ctx, 'WONDER', cx, 26 + bob, '#12100f', 4);
    Font.drawCenter(ctx, 'WONDER', cx - 1, 25 + bob, '#ffd93b', 4);
    Font.drawCenter(ctx, 'CAMI', cx, 60 + bob, '#12100f', 4);
    Font.drawCenter(ctx, 'CAMI', cx - 1, 59 + bob, '#e0332f', 4);
    Font.drawCenter(ctx, 'COSTA BRASILERA - AREA 1', cx, 92, '#ffffff', 1);

    // Cami y Rosita corriendo por la playa
    var px = ((G.t * 1.2) % (vw + 90)) - 50;
    blit(ctx, S.cami.run[Math.floor(G.t / 5) % 4].r, px, gy - 25);
    blit(ctx, S.rosita.run[(G.t >> 3) & 1].r, px - 32, gy - 14);

    if ((G.t >> 4) % 2 === 0)
      Font.drawCenter(ctx, 'TOCA PARA JUGAR', cx, 112, '#ffffff', 2);
    Font.drawCenter(ctx, 'RECORD ' + pad(G.hi, 7), cx, 134, '#ffd93b', 1);
    Font.drawCenter(ctx, 'RESCATA A ROSITA DEL CAPITAN COCO', cx, LEVEL_H - 12, 'rgba(255,255,255,0.75)', 1);
  }

  function drawReady(ctx) {
    var cx = vw / 2;
    ctx.fillStyle = 'rgba(6,10,26,0.72)';
    ctx.fillRect(0, 0, vw, LEVEL_H);
    Font.drawCenter(ctx, G.level.name, cx, LEVEL_H / 2 - 26, '#ffd93b', 3);
    Font.drawCenter(ctx, 'CAMI  X ' + Math.max(0, G.lives - 1), cx, LEVEL_H / 2 + 6, '#ffffff', 2);
    if (G.roundIdx === 0 && G.stT < 96)
      Font.drawCenter(ctx, 'EL CAPITAN COCO SE LLEVO A ROSITA', cx, LEVEL_H / 2 + 30, '#6fd0ff', 1);
    else if (G.level.boss)
      Font.drawCenter(ctx, 'AL FINAL ESTA ROSITA', cx, LEVEL_H / 2 + 30, '#6fd0ff', 1);
  }

  function drawClear(ctx) {
    var cx = vw / 2;
    ctx.fillStyle = 'rgba(6,10,26,0.78)';
    ctx.fillRect(0, 0, vw, LEVEL_H);
    Font.drawCenter(ctx, G.level.name + ' LISTO', cx, LEVEL_H / 2 - 28, '#ffd93b', 3);
    Font.drawCenter(ctx, 'BONUS VITALIDAD  ' + pad(G.bonus, 5), cx, LEVEL_H / 2 + 6, '#ffffff', 2);
    Font.drawCenter(ctx, 'PUNTAJE  ' + pad(G.score, 7), cx, LEVEL_H / 2 + 28, '#6fd0ff', 1);
  }

  function drawGameOver(ctx) {
    var cx = vw / 2;
    ctx.fillStyle = 'rgba(6,10,26,0.82)';
    ctx.fillRect(0, 0, vw, LEVEL_H);
    Font.drawCenter(ctx, 'GAME OVER', cx, LEVEL_H / 2 - 24, '#e0332f', 4);
    Font.drawCenter(ctx, 'ROSITA TE ESPERA', cx, LEVEL_H / 2 + 12, '#ffffff', 1);
    Font.drawCenter(ctx, 'PUNTAJE  ' + pad(G.score, 7), cx, LEVEL_H / 2 + 26, '#ffd93b', 1);
    if (G.stT > 150 && (G.t >> 4) % 2 === 0)
      Font.drawCenter(ctx, 'TOCA PARA VOLVER', cx, LEVEL_H / 2 + 44, '#6fd0ff', 1);
  }

  function drawEnding(ctx) {
    var cx = vw / 2;
    // escena propia: atardecer sobre la playa, sin el nivel de fondo
    var gr = ctx.createLinearGradient(0, 0, 0, HORIZON);
    gr.addColorStop(0, '#2a2260'); gr.addColorStop(0.6, '#8e3b7a'); gr.addColorStop(1, '#ff9a52');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, HORIZON);
    ctx.fillStyle = 'rgba(255,247,200,0.9)';
    ctx.beginPath(); ctx.arc(vw - 54, HORIZON - 12, 17, 0, 6.284); ctx.fill();
    var gr2 = ctx.createLinearGradient(0, HORIZON, 0, LEVEL_H);
    gr2.addColorStop(0, '#123a63'); gr2.addColorStop(1, '#0e2a4d');
    ctx.fillStyle = gr2; ctx.fillRect(0, HORIZON, vw, LEVEL_H - HORIZON);
    ctx.fillStyle = 'rgba(255,200,140,0.25)';
    for (var w = 0; w < vw; w += 12)
      ctx.fillRect(w, HORIZON + 4 + Math.sin((w + G.t) * 0.09) * 2, 6, 1);

    var gy = LEVEL_H - 58;
    ctx.fillStyle = '#a98d5c'; ctx.fillRect(0, gy, vw, 58);
    ctx.fillStyle = '#cfae74'; ctx.fillRect(0, gy, vw, 4);
    drawPalm(ctx, 14, gy);
    drawPalm(ctx, vw - 46, gy);

    blit(ctx, S.cami.stand.r, cx - 26, gy - 25);
    blit(ctx, S.rosita.sit.l, cx + 4, gy - 14);
    var hb = Math.sin(G.t * 0.08) * 3;
    Font.draw(ctx, '<3', cx - 3, gy - 36 + hb, '#ff5ea8', 1);

    Font.drawCenter(ctx, 'RESCATASTE A ROSITA!', cx, 16, '#ffd93b', 2);
    Font.drawCenter(ctx, 'AREA 1 COMPLETADA', cx, 34, '#ffffff', 1);
    Font.drawCenter(ctx, 'PUNTAJE FINAL ' + pad(G.score, 7), cx, 48, '#6fd0ff', 2);

    if (G.stT > 240 && (G.t >> 4) % 2 === 0)
      Font.drawCenter(ctx, 'TOCA PARA VOLVER AL TITULO', cx, LEVEL_H - 10, '#ffffff', 1);
  }

  function draw(ctx) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (G.st === 'title') {
      ctx.translate(0, HUD_H);
      drawTitle(ctx);
      ctx.restore();
      ctx.fillStyle = '#060a1a'; ctx.fillRect(0, 0, vw, HUD_H);
      Font.draw(ctx, 'WONDERCAMI', 4, 5, '#ffd93b', 1);
      Font.draw(ctx, 'CAMI + ROSITA', vw - 82, 5, '#6fd0ff', 1);
      return;
    }

    var sh = G.shake > 0 ? (Math.random() - 0.5) * G.shake * 0.7 : 0;
    ctx.translate(Math.round(sh), HUD_H + Math.round(sh * 0.4));

    drawSky(ctx);
    drawBack(ctx);
    drawEnts(ctx);
    drawBoss(ctx);
    drawBots(ctx);
    drawPlayer(ctx);
    drawFx(ctx);

    if (G.st === 'ready') drawReady(ctx);
    if (G.st === 'clear') drawClear(ctx);
    if (G.st === 'gameover') drawGameOver(ctx);
    if (G.st === 'ending') drawEnding(ctx);

    ctx.restore();
    drawHUD(ctx);
  }

  /* ================= API ================= */

  function init() {
    S = Sprites.build();
    loadHi();
    setState('title');
  }

  global.Game = {
    _G: G,                 // para depurar desde la consola
    _round: function (i) { G.roundIdx = i; loadRound(i); setState('ready'); },
    init: init,
    update: update,
    draw: draw,
    setViewport: function (w) { vw = w; },
    VH: VH,
    HUD_H: HUD_H,
    state: function () { return G.st; },
    isPlaying: function () { return G.st === 'play'; }
  };
})(window);
