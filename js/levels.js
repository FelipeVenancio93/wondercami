/* WonderCami — Area 1: Costa Brasilera. Cuatro rounds.
   El terreno se escribe como "altura*repeticiones" en tiles desde abajo.
   Altura 0 = agua (pozo mortal). */
(function (global) {
  'use strict';

  var ROWS = 11;          // alto del nivel en tiles
  var TILE = 16;

  function ground(str) {
    var out = [], toks = str.split(/\s+/);
    for (var i = 0; i < toks.length; i++) {
      if (!toks[i]) continue;
      var p = toks[i].split('*');
      var h = parseInt(p[0], 10);
      var n = parseInt(p[1] || '1', 10);
      for (var k = 0; k < n; k++) out.push(h);
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* ROUND 1 — La playa. Introduce cangrejos, cocos y la primera botella. */

  var R1 = {
    name: 'ROUND 1',
    sky: ['#37c0ee', '#8fe3f7', '#f6e7b8'],
    sea: '#1f7fbf',
    g: ground(
      '3*32 4*6 3*10 0*3 3*12 5*5 4*3 3*10 0*3 3*14 0*4 3*10 ' +
      '4*8 3*12 0*3 3*10 5*6 3*13 0*4 3*16 4*4 3*20'),
    ents: [
      { t: 'palm', c: 8 }, { t: 'palm', c: 38, coco: 1 }, { t: 'palm', c: 66 },
      { t: 'palm', c: 88, coco: 1 }, { t: 'palm', c: 118 }, { t: 'palm', c: 141, coco: 1 },
      { t: 'palm', c: 172 }, { t: 'palm', c: 192, coco: 1 },
      { t: 'crab', c: 20 }, { t: 'crab', c: 45 }, { t: 'crab', c: 71 },
      { t: 'crab', c: 96 }, { t: 'crab', c: 122 }, { t: 'crab', c: 151 }, { t: 'crab', c: 178 },
      { t: 'rock', c: 61 }, { t: 'rock', c: 112 }, { t: 'rock', c: 166 },
      { t: 'frog', c: 79 }, { t: 'frog', c: 132 },
      { t: 'gull', c: 102 }, 
      { t: 'egg', c: 14, item: 'queso' },
      { t: 'egg', c: 55, item: 'botella' },
      // La moto entra temprano: el Round 1 hace de tutorial y conviene
      // tener pista por delante para acostumbrarse a que no frena.
      { t: 'egg', c: 83, item: 'moto' },
      { t: 'egg', c: 105, item: 'salamin' },
      { t: 'egg', c: 126, item: 'aceituna' },
      { t: 'egg', c: 158, item: 'queso' },
      { t: 'egg', c: 196, item: 'queso' }
    ],
    checkpoint: 104
  };

  /* ------------------------------------------------------------------ */
  /* ROUND 2 — Mas pozos y ranas. Aparece la moto temprano.              */

  var R2 = {
    name: 'ROUND 2',
    sky: ['#2ea9dd', '#7fd6f0', '#ffd08a'],
    sea: '#1a6ea8',
    g: ground(
      '3*20 0*3 3*10 4*5 3*8 0*3 3*6 0*3 3*12 5*6 3*8 0*4 ' +
      '3*10 4*4 5*4 5*5 4*4 3*10 0*3 3*8 0*3 3*8 0*3 3*14 ' +
      '5*7 3*10 0*4 3*12 4*6 3*8 0*3 3*18'),
    ents: [
      { t: 'palm', c: 12, coco: 1 }, { t: 'palm', c: 44 }, { t: 'palm', c: 70, coco: 1 },
      { t: 'palm', c: 100 }, { t: 'palm', c: 128, coco: 1 }, { t: 'palm', c: 160 },
      { t: 'palm', c: 186, coco: 1 }, { t: 'palm', c: 205 },
      { t: 'crab', c: 16 }, { t: 'crab', c: 40 }, { t: 'crab', c: 63 },
      { t: 'crab', c: 94 }, { t: 'crab', c: 121 }, { t: 'crab', c: 149 },
      { t: 'crab', c: 176 }, { t: 'crab', c: 198 },
      { t: 'frog', c: 34 }, { t: 'frog', c: 58 }, { t: 'frog', c: 106 },
      { t: 'frog', c: 143 }, { t: 'frog', c: 190 },
      { t: 'rock', c: 51 }, { t: 'rock', c: 87 }, { t: 'rock', c: 136 }, { t: 'rock', c: 181 },
      { t: 'gull', c: 66 },  { t: 'gull', c: 168 },
      { t: 'fire', c: 108 }, { t: 'fire', c: 155 },
      { t: 'egg', c: 9, item: 'botella' },
      { t: 'egg', c: 30, item: 'queso' },
      { t: 'egg', c: 62, item: 'moto' },
      { t: 'egg', c: 98, item: 'salamin' },
      { t: 'egg', c: 124, item: 'aceituna' },
      { t: 'egg', c: 152, item: 'botella' },
      { t: 'egg', c: 184, item: 'mani' },
      { t: 'egg', c: 203, item: 'vida' }
    ],
    checkpoint: 110
  };

  /* ------------------------------------------------------------------ */
  /* ROUND 3 — Marea alta: pulpos, plataformas y fogatas.                */

  var R3 = {
    name: 'ROUND 3',
    sky: ['#1f6fb8', '#5fb6e0', '#ffb46a'],
    sea: '#124f7d',
    g: ground(
      '3*18 0*6 3*8 0*6 3*10 4*5 3*6 0*7 3*12 5*5 3*6 0*4 ' +
      '3*8 0*8 3*10 4*6 3*6 0*5 3*10 5*6 3*8 0*6 3*12 ' +
      '4*5 3*6 0*7 3*10 5*6 3*8 0*4 3*20'),
    ents: [
      { t: 'octo', c: 21 }, { t: 'octo', c: 35 }, { t: 'octo', c: 63 },
      { t: 'octo', c: 104 }, { t: 'octo', c: 133 }, { t: 'octo', c: 163 }, { t: 'octo', c: 192 },
      { t: 'palm', c: 10, coco: 1 }, { t: 'palm', c: 48 }, { t: 'palm', c: 78, coco: 1 },
      { t: 'palm', c: 118 }, { t: 'palm', c: 143, coco: 1 }, { t: 'palm', c: 168 },
      { t: 'palm', c: 194, coco: 1 },
      { t: 'crab', c: 14 }, { t: 'crab', c: 45 }, { t: 'crab', c: 74 },
      { t: 'crab', c: 112 }, { t: 'crab', c: 140 }, { t: 'crab', c: 166 }, { t: 'crab', c: 191 },
      { t: 'frog', c: 28 }, { t: 'frog', c: 84 }, { t: 'frog', c: 124 }, { t: 'frog', c: 185 },
      { t: 'gull', c: 52 }, { t: 'gull', c: 136 }, 
      { t: 'fire', c: 44 }, { t: 'fire', c: 82 }, { t: 'fire', c: 121 }, { t: 'fire', c: 164 },
      { t: 'rock', c: 30 }, { t: 'rock', c: 88 }, { t: 'rock', c: 147 }, { t: 'rock', c: 189 },
      { t: 'egg', c: 8, item: 'botella' },
      { t: 'egg', c: 41, item: 'queso' },
      { t: 'egg', c: 70, item: 'moto' },
      { t: 'egg', c: 92, item: 'salamin' },
      { t: 'egg', c: 116, item: 'botella2' },
      { t: 'egg', c: 145, item: 'aceituna' },
      { t: 'egg', c: 170, item: 'estrella' },
      { t: 'egg', c: 196, item: 'queso' }
    ],
    checkpoint: 108
  };

  /* ------------------------------------------------------------------ */
  /* ROUND 4 — Camino al Capitan Coco. Termina en la arena del jefe.     */

  var R4 = {
    name: 'ROUND 4',
    sky: ['#2a2260', '#8e3b7a', '#ff9a52'],
    sea: '#0e2a4d',
    g: ground(
      '3*16 0*4 3*8 4*5 3*6 0*5 3*10 5*6 3*6 0*6 3*10 ' +
      '4*6 3*8 0*4 3*8 5*6 4*4 3*8 0*6 3*10 5*7 3*8 0*5 ' +
      '3*12 4*6 3*10 0*4 3*10 4*40'),
    ents: [
      { t: 'octo', c: 17 }, { t: 'octo', c: 41 }, { t: 'octo', c: 68 },
      { t: 'octo', c: 97 }, { t: 'octo', c: 128 }, { t: 'octo', c: 159 }, { t: 'octo', c: 191 },
      { t: 'palm', c: 9, coco: 1 }, { t: 'palm', c: 38, coco: 1 },
      { t: 'palm', c: 62 }, { t: 'palm', c: 96, coco: 1 }, { t: 'palm', c: 130 },
      { t: 'palm', c: 158, coco: 1 },
      { t: 'crab', c: 12 }, { t: 'crab', c: 33 }, { t: 'crab', c: 58 },
      { t: 'crab', c: 88 }, { t: 'crab', c: 104 }, { t: 'crab', c: 128 }, { t: 'crab', c: 156 },
      { t: 'frog', c: 26 }, { t: 'frog', c: 54 }, { t: 'frog', c: 92 },
      { t: 'frog', c: 120 }, { t: 'frog', c: 144 },
      { t: 'gull', c: 42 }, { t: 'gull', c: 118 }, 
      { t: 'fire', c: 30 }, { t: 'fire', c: 66 }, { t: 'fire', c: 100 },
      { t: 'fire', c: 126 }, { t: 'fire', c: 155 },
      { t: 'rock', c: 24 }, { t: 'rock', c: 60 }, { t: 'rock', c: 94 }, { t: 'rock', c: 140 },
      { t: 'egg', c: 6, item: 'botella' },
      { t: 'egg', c: 28, item: 'queso' },
      { t: 'egg', c: 52, item: 'moto' },
      { t: 'egg', c: 76, item: 'salamin' },
      { t: 'egg', c: 106, item: 'botella2' },
      { t: 'egg', c: 134, item: 'aceituna' },
      { t: 'egg', c: 160, item: 'queso' },
      // Antes y dentro de la arena del jefe siempre hay botellas y comida
      { t: 'egg', c: 168, item: 'botella2' },
      { t: 'egg', c: 173, item: 'salamin' },
      { t: 'egg', c: 200, item: 'botella2' },
      { t: 'egg', c: 212, item: 'queso' },
      { t: 'egg', c: 220, item: 'botella2' }
    ],
    checkpoint: 100,
    boss: true,
    bossCol: 232,     // donde se planta el Capitan Coco
    arenaCol: 206     // desde aca no se puede volver: arranca la pelea
  };

  var AREA1 = [R1, R2, R3, R4];

  // El cartel de meta va unas columnas antes del final (los rounds sin jefe)
  AREA1.forEach(function (L) {
    L.cols = L.g.length;
    L.width = L.cols * TILE;
    if (!L.boss) L.metaCol = L.cols - 7;
  });

  global.Levels = {
    ROWS: ROWS,
    TILE: TILE,
    HEIGHT: ROWS * TILE,
    area1: AREA1
  };
})(window);
