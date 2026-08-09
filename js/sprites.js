/* WonderCami — banco de sprites
   Cami: casco rojo, anteojos de esqui rojos, pelo negro a los hombros,
   piloto de lluvia amarillo patito.
   Rosita: galga inglesa negra con patas, panza y punta de trompa blancas. */
(function (global) {
  'use strict';

  var mk = Pixel.makeSprite;
  var flip = Pixel.flipX;
  var cat = Pixel.compose;

  /* ---------- CAMI ---------- */

  // Cabeza + torso (filas 0..20). Las piernas se pegan aparte.
  var CAMI_TOP = [
    '....rRRRRRr.....',
    '..rRRRRRRRRRr...',
    '..RRzRRRRRRRRr..',
    '.1RRRRRRRRRRRR1.',
    '.1BBBBBBBBBBBB1.',
    '.1BPPPPPPPPPPB1.',
    '.1BpPPPPPPPPPB1.',
    '.1BBBBBBBBBBBB1.',
    '.11SSSSSSSSSS11.',
    '.11SSSSssSSSS11.',
    '.111SSSSSSSS111.',
    '..11SSSSSSSS11..',
    '..1YYYYYYYYYY1..',
    '..YYYYYYYYYYYY..',
    '.SYYYYYYYYYYYYS.',
    '.SYYYYYYYYYYYYS.',
    '..YYYYYYYYYYYY..',
    '..YYzYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '..yYYYYYYYYYYy..',
    '...YYYYYYYYYY...'
  ];

  // Torso con el brazo derecho estirado hacia adelante (pose de tiro)
  var CAMI_TOP_THROW = CAMI_TOP.slice(0, 13).concat([
    '..YYYYYYYYYYYYSS',
    '.SYYYYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '..YYzYYYYYYYYY..',
    '..YYYYYYYYYYYY..',
    '..yYYYYYYYYYYy..',
    '...YYYYYYYYYY...'
  ]);

  var LEGS_STAND = [
    '...NNNN..NNNN...',
    '...NNNN..NNNN...',
    '...BBBB..BBBB...',
    '..BBBBB..BBBBB..'
  ];
  var LEGS_RUN_A = [
    '..NNNN...NNNN...',
    '.NNNN.....NNNN..',
    '.BBB.......BBB..',
    'BBBB.......BBBB.'
  ];
  var LEGS_RUN_B = [
    '...NNNNNNNN.....',
    '...NNN..NNN.....',
    '...BBB..BBB.....',
    '..BBBB..BBBB....'
  ];
  var LEGS_RUN_C = [
    '...NNNN..NNNN...',
    '..NNNN....NNNN..',
    '..BBB......BBB..',
    '.BBBB......BBBB.'
  ];
  var LEGS_JUMP = [
    '..NNNNN..NNNN...',
    '..NNN.....NNNN..',
    '..BBB......BBB..',
    '..BBB.......BB..'
  ];

  /* Cami arriba de la moto (mira a la derecha) */
  var CAMI_MOTO_A = [
    '..........rRRRRRr.........',
    '........rRRRRRRRRRr.......',
    '........RRzRRRRRRRr.......',
    '.......1RRRRRRRRRRRR1.....',
    '.......1BBBBBBBBBBBB1.....',
    '.......1BPPPPPPPPPPB1.....',
    '.......1BpPPPPPPPPPB1.....',
    '.......1BBBBBBBBBBBB1.....',
    '.......11SSSSSSSSSS11.....',
    '.......111SSSSSSSS111.....',
    '......YYY11SSSSSS11YY.....',
    '.....YYYYYY111111YYYY.....',
    '....YYYYYYYYYYYYYYYYYS....',
    '...YYYYYYYYYYYYYYYYYSS....',
    '...YYYYYYYYYYYYYYYYY......',
    '..NNNNYYYYYYYYYYNNNN......',
    '..RRRRRRRRRRRRRRRRRRRR....',
    '.rRRRRRRRRRRRRRRRRRRRr....',
    '.BB..rrrrrrrrrrrr...BB....',
    '2222................2222..',
    '22B22..............22B22..',
    '22B22..............22B22..',
    '.222................222...'
  ];
  var CAMI_MOTO_B = CAMI_MOTO_A.slice(0, 19).concat([
    '2222................2222..',
    '2B222..............2B222..',
    '222B2..............222B2..',
    '.222................222...'
  ]);

  /* ---------- ROSITA (galga inglesa negra) ---------- */

  var ROSITA_A = [
    '1......................',
    '11..................111.',
    '.11................11111',
    '..111.............111111',
    '...1111111111111111115..',
    '..111111111111111111155.',
    '..1111111111111111111...',
    '..111555555555511111....',
    '..11.55555555511........',
    '..11..........11........',
    '..11..........11........',
    '..11..........11........',
    '.155..........551.......',
    '.555..........555.......'
  ];
  var ROSITA_B = ROSITA_A.slice(0, 9).concat([
    '..11..........11........',
    '..1.1........1.1........',
    '.11..1......1..11.......',
    '155...5....5...551......',
    '555...55..55...555......'
  ]);
  var ROSITA_SIT = [
    '....................111.',
    '...................11111',
    '..................111111',
    '..1..............1111115',
    '..11............11111155',
    '...11..........111111...',
    '...111........1111111...',
    '...111555555555111111...',
    '...11.5555555551111.....',
    '...11.........1111......',
    '...11.........1111......',
    '...11.........1111......',
    '..1555.......15551......',
    '..5555.......55555......'
  ];

  /* ---------- ENEMIGOS ---------- */

  var CRAB_A = [
    '..X..........X..',
    '...X........X...',
    '..XXXXXXXXXXXX..',
    '.XXXXXXXXXXXXXX.',
    '.XX5XXXXXXXX5XX.',
    '.XX1XXXXXXXX1XX.',
    '.XXXXXXXXXXXXXX.',
    '..xxxxxxxxxxxx..',
    'X.X.X......X.X.X',
    'X..X..X..X..X..X'
  ];
  var CRAB_B = CRAB_A.slice(0, 8).concat([
    '.X.X.X....X.X.X.',
    'X...X.X..X.X...X'
  ]);

  var FROG_A = [
    '..GG......GG..',
    '.G55G....G55G.',
    '.G51G....G15G.',
    '.GGGGGGGGGGGG.',
    'GGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGG',
    'GgGGGGGGGGGGgG',
    'Gg.gggggggg.gG',
    'GG..........GG',
    'gg..........gg'
  ];
  var FROG_B = [
    '..GG......GG..',
    '.G55G....G55G.',
    '.G51G....G15G.',
    '.GGGGGGGGGGGG.',
    'GGGGGGGGGGGGGG',
    'gGGGGGGGGGGGGg',
    'g.GGGGGGGGGG.g',
    'g..gggggggg..g',
    'gg..........gg',
    'g............g'
  ];

  var COCONUT = [
    '..mmmm..',
    '.mMMMMm.',
    'mMMmmMMm',
    'mMm11mMm',
    'mMMmmMMm',
    'mMMMMMMm',
    '.mMMMMm.',
    '..mmmm..'
  ];

  var OCTO_A = [
    '..TTTTTTTT..',
    '.TTTTTTTTTT.',
    'TTTTTTTTTTTT',
    'TT5TTTTTT5TT',
    'TT1TTTTTT1TT',
    'TTTTTTTTTTTT',
    'TTTTHHHHTTTT',
    '.TTTTTTTTTT.',
    'T.T.T..T.T.T',
    'T.T.T..T.T.T',
    '.T...T..T..T'
  ];
  var OCTO_B = OCTO_A.slice(0, 8).concat([
    '.T.T.T..T.T.',
    'T..T..TT..T.',
    'T...T....T.T'
  ]);

  var GULL_A = [
    '...5....5...',
    '..55....55..',
    '.555....555.',
    '55555555555.',
    '.5555555551.',
    '...O5555....',
    '....OO......'
  ];
  var GULL_B = [
    '............',
    '............',
    '.5.......5..',
    '55555555555.',
    '5555555555O.',
    '.55555555O..',
    '..555555....'
  ];

  /* ---------- OBSTACULOS ---------- */

  var ROCK = [
    '....3333....',
    '..33444433..',
    '.3444444443.',
    '34444444443.',
    '34443444443.',
    '34444444443.',
    '.3444444443.',
    '.3344444433.',
    '..33333333..',
    '...222222...'
  ];

  var FIRE_A = [
    '.....F......',
    '....FF......',
    '...FfF..F...',
    '..FffF.FF...',
    '..FffFFfF...',
    '.FffffffF...',
    '.FfffffffF..',
    '.FFfffffFF..',
    '..FFFFFFF...',
    '.mMMMMMMMm..'
  ];
  var FIRE_B = [
    '......F.....',
    '..F...FF....',
    '..FF..FfF...',
    '..FfF.FffF..',
    '.FFfFFFffF..',
    '.FffffffffF.',
    '.FfffffffF..',
    '..FFfffFFF..',
    '..FFFFFFF...',
    '.mMMMMMMMm..'
  ];

  /* ---------- HUEVO E ITEMS ---------- */

  var EGG = [
    '...5555...',
    '..555555..',
    '.55555555.',
    '5555OO5555',
    '5555OO5555',
    '55O5555O55',
    '55OO55OO55',
    '.55555555.',
    '..555555..',
    '...5555...'
  ];
  var EGG_OPEN = [
    '..........',
    '...5..5...',
    '..55..55..',
    '.5555555..',
    '5555OO5555',
    '55O5555O55',
    '.55555555.',
    '..555555..',
    '..5.55.5..',
    '..........'
  ];

  var IT_QUESO = [
    '..EEEEEE..',
    '.EEEEEEEE.',
    'EEeEEEEeEE',
    'EEEEEEEEEE',
    'EeEEEEEEeE',
    'EEEEEeEEEE',
    'eeeeeeeeee'
  ];
  var IT_SALAMIN = [
    '..QQQQQQ..',
    '.QqQQQqQQ.',
    'QQQKQQQKQQ',
    'QKQQQQQQQQ',
    'QQQQKQQQKQ',
    '.QQQQQQQQ.',
    '..QQQQQQ..'
  ];
  var IT_ACEITUNA = [
    '...gggg...',
    '..gGGGGg..',
    '.gGGXXGGg.',
    '.gGGXXGGg.',
    '.gGGGGGGg.',
    '..gGGGGg..',
    '...gggg...'
  ];
  var IT_MANI = [
    '..MMM.....',
    '.MMMMM....',
    '.MMmMM....',
    '..MMMMM...',
    '...MMMMM..',
    '....MMmM..',
    '....MMM...'
  ];
  var IT_MOTO = [
    '....RRRRRR..',
    '..RRRRRRRRR.',
    '.RRRRRRRRRR.',
    'BB.rrrrrr.BB',
    '222......222',
    '2B2......2B2',
    '222......222'
  ];
  var BOTTLE = [
    '...vv...',
    '...VV...',
    '..vVVv..',
    '..VVVV..',
    '.vVQQVv.',
    '.VKKKKV.',
    '.VKQKQV.',
    '.vVQQVv.',
    '..vVVv..',
    '...vv...'
  ];
  var BOTTLE_SPIN = [
    '........',
    '..vvVVv.',
    '.vVVVVVv',
    'vVQQKKQV',
    'vVQQKKQV',
    '.vVVVVVv',
    '..vvVVv.',
    '........'
  ];
  var IT_BOTELLA2 = [
    '..vv..vv..',
    '..VV..VV..',
    '.vVVvvVVv.',
    '.VQQVVQQV.',
    '.VKKVVKKV.',
    '.vVVvvVVv.',
    '..vv..vv..'
  ];
  var IT_ESTRELLA = [
    '....ff....',
    '....ff....',
    '.f.ffff.f.',
    '.ffffffff.',
    '..ffffff..',
    '..fff.fff.',
    '.ff....ff.'
  ];
  var IT_VIDA = [
    '..rRRRRr..',
    '.rRRRRRRr.',
    '.RRzRRRRR.',
    '.BBBBBBBB.',
    '.BPPPPPPB.',
    '.BpPPPPPB.',
    '.BBBBBBBB.'
  ];

  /* ---------- CARTEL DE META ---------- */

  var META = [
    '..MMMMMMMMMMMM..',
    '.MKKKKKKKKKKKKM.',
    '.MK5KK5KK5KK5KM.',
    '.MKK5KK5KK5KK5M.',
    '.MK5KK5KK5KK5KM.',
    '.MKKKKKKKKKKKKM.',
    '..MMMMMMMMMMMM..',
    '......MMMM......',
    '......MMMM......',
    '......MMMM......',
    '......MMMM......',
    '......MMMM......',
    '......MMMM......',
    '.....mMMMMm.....',
    '....mmMMMMmm....'
  ];

  /* ---------- CAPITAN COCO (jefe) ---------- */

  // Sombrero de pirata + mascara tiki tallada en coco
  var BOSS_HAT = [
    '.......11111111.........',
    '....1111BBBBBB1111......',
    '..11BBBBBBBBBBBBBB11....',
    '.1BBBBBBB5555BBBBBBB1...',
    '.1BBBBBB555555BBBBBB1...',
    '..1BBBBBBB55BBBBBBB1....',
    '...1111BBBBBBBB1111.....',
    '.......11111111.........'
  ];
  var BOSS_FACE = [
    '..1mmmmmmmmmmmmmmmm1....',
    '.1mMMMMMMMMMMMMMMMMm1...',
    '.1mMMMMMMMMMMMMMMMMm1...',
    '.1mMM555MMMMMM555MMm1...',
    '.1mMM515MMMMMM515MMm1...',
    '.1mMM555MMMMMM555MMm1...',
    '.1mMMMMMMMMMMMMMMMMm1...',
    '.1mMMMOOOOOOOOOOMMMm1...',
    '.1mMMMMMMMMMMMMMMMMm1...',
    '.1mMM11111111111MMMm1...',
    '.1mMM1KKKKKKKKK1MMMm1...',
    '.1mMM11111111111MMMm1...',
    '.1mMMMMMMMMMMMMMMMMm1...',
    '..1mMMMMMMMMMMMMMMm1....',
    '...1mmMMMMMMMMMMmm1.....',
    '....11mmmmmmmmmm11......'
  ];
  var BOSS_FACE_OPEN = BOSS_FACE.slice(0, 9).concat([
    '.1mMM11111111111MMMm1...',
    '.1mMM1qqqqqqqqq1MMMm1...',
    '.1mMM1q5q5q5q5q1MMMm1...',
    '.1mMM11111111111MMMm1...',
    '..1mMMMMMMMMMMMMMMm1....',
    '...1mmMMMMMMMMMMmm1.....',
    '....11mmmmmmmmmm11......'
  ]);

  var BOSS_IDLE = cat(BOSS_HAT, BOSS_FACE);
  var BOSS_OPEN = cat(BOSS_HAT, BOSS_FACE_OPEN);


  /* ---------- CONSTRUCCION ---------- */

  function build() {
    function S(rows) { return mk(rows); }
    function pair(rows) { var a = mk(rows); return { r: a, l: flip(a) }; }

    var S_ = {};

    S_.cami = {
      stand: pair(cat(CAMI_TOP, LEGS_STAND)),
      run: [
        pair(cat(CAMI_TOP, LEGS_RUN_A)),
        pair(cat(CAMI_TOP, LEGS_RUN_B)),
        pair(cat(CAMI_TOP, LEGS_RUN_C)),
        pair(cat(CAMI_TOP, LEGS_RUN_B))
      ],
      jump: pair(cat(CAMI_TOP, LEGS_JUMP)),
      throw: pair(cat(CAMI_TOP_THROW, LEGS_STAND)),
      throwRun: pair(cat(CAMI_TOP_THROW, LEGS_RUN_B)),
      moto: [pair(CAMI_MOTO_A), pair(CAMI_MOTO_B)]
    };

    S_.rosita = {
      run: [pair(ROSITA_A), pair(ROSITA_B)],
      sit: pair(ROSITA_SIT)
    };

    S_.crab = [pair(CRAB_A), pair(CRAB_B)];
    S_.frog = [pair(FROG_A), pair(FROG_B)];
    S_.coco = S(COCONUT);
    S_.octo = [S(OCTO_A), S(OCTO_B)];
    S_.gull = [pair(GULL_A), pair(GULL_B)];
    S_.rock = S(ROCK);
    S_.fire = [S(FIRE_A), S(FIRE_B)];
    S_.egg = S(EGG);
    S_.eggOpen = S(EGG_OPEN);
    S_.meta = S(META);
    S_.boss = { idle: S(BOSS_IDLE), open: S(BOSS_OPEN) };
    S_.bossFlash = { idle: Pixel.tint(S(BOSS_IDLE), '#ffffff'), open: Pixel.tint(S(BOSS_OPEN), '#ffffff') };

    S_.bottle = [S(BOTTLE), S(BOTTLE_SPIN)];

    S_.items = {
      queso: S(IT_QUESO),
      salamin: S(IT_SALAMIN),
      aceituna: S(IT_ACEITUNA),
      mani: S(IT_MANI),
      moto: S(IT_MOTO),
      botella: S(BOTTLE),
      botella2: S(IT_BOTELLA2),
      estrella: S(IT_ESTRELLA),
      vida: S(IT_VIDA)
    };

    // Silueta blanca de Cami para el parpadeo de invencibilidad
    S_.camiWhite = {
      r: Pixel.tint(S_.cami.stand.r, '#ffffff'),
      l: Pixel.tint(S_.cami.stand.l, '#ffffff')
    };

    return S_;
  }

  global.Sprites = { build: build };
})(window);
