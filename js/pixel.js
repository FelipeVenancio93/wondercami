/* WonderCami — motor de pixel art
   Los sprites se declaran como arrays de strings; cada caracter es un color
   de la paleta. El ancho se toma de la fila mas larga y las filas cortas se
   rellenan a la derecha con transparente. */
(function (global) {
  'use strict';

  var PAL = {
    '.': null,
    '0': '#000000',
    '1': '#141210', // negro (pelo Rosita/Cami, contornos)
    '2': '#2b2b30',
    '3': '#555560',
    '4': '#9a9aa5',
    '5': '#ffffff',
    '6': '#e6e6ea',
    'R': '#e0332f', // rojo casco
    'r': '#9c1a18', // rojo casco sombra
    'P': '#ff3b30', // lente de esqui (rojo medio)
    'p': '#ff9d95', // brillo del lente
    'Y': '#ffd93b', // amarillo patito (piloto)
    'y': '#d9a318', // amarillo sombra
    'z': '#fff6bd', // amarillo brillo
    'S': '#f4bb8e', // piel
    's': '#c9855c', // piel sombra
    'B': '#1f1f24', // botas / negro azulado
    'N': '#2f4fa8', // jean
    'n': '#1c2f66',
    'G': '#48b85a', // verde
    'g': '#1f7a2e',
    'O': '#e08a2e', // naranja
    'o': '#9c5a18',
    'C': '#6fd0ff', // celeste
    'c': '#2a86c9',
    'W': '#f2dfae', // arena clara
    'w': '#cfae74', // arena oscura
    'M': '#8a5a2b', // madera / marron
    'm': '#5c3a1a',
    'V': '#2e7d4f', // vidrio de botella
    'v': '#17512f',
    'Q': '#8e2247', // vino
    'q': '#4a0f24',
    'K': '#f7e7c6', // etiqueta / hueso
    'A': '#ff9ec4', // rosa
    'E': '#f2c14e', // dorado / queso
    'e': '#b8892a',
    'F': '#ff7a18', // fuego
    'f': '#ffe14f', // fuego claro
    'T': '#9b5de5', // violeta
    'H': '#ff5ea8', // magenta
    'X': '#d9482f', // rojo cangrejo
    'x': '#8f2a19'
  };

  var warned = false;

  function makeSprite(rows) {
    var w = 0, h = rows.length, i;
    for (i = 0; i < h; i++) if (rows[i].length > w) w = rows[i].length;
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var img = ctx.createImageData(w, h);
    var d = img.data;
    for (var y = 0; y < h; y++) {
      var row = rows[y];
      if (row.length !== w && !warned) { warned = true; }
      for (var x = 0; x < w; x++) {
        var ch = x < row.length ? row.charAt(x) : '.';
        var hex = PAL[ch];
        if (hex === undefined) hex = '#ff00ff'; // color faltante: bien visible
        if (hex === null) continue;
        var o = (y * w + x) * 4;
        d[o] = parseInt(hex.substr(1, 2), 16);
        d[o + 1] = parseInt(hex.substr(3, 2), 16);
        d[o + 2] = parseInt(hex.substr(5, 2), 16);
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  /* Espejo horizontal (para mirar a la izquierda) */
  function flipX(src) {
    var cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.translate(src.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(src, 0, 0);
    return cv;
  }

  /* Silueta de un color solido: para el parpadeo de invencibilidad y de golpe */
  function tint(src, color) {
    var cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    var ctx = cv.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    return cv;
  }

  /* Une varias filas de cuerpo + filas de piernas en un solo sprite */
  function compose() {
    var rows = [];
    for (var i = 0; i < arguments.length; i++) rows = rows.concat(arguments[i]);
    return rows;
  }

  global.Pixel = {
    PAL: PAL,
    makeSprite: makeSprite,
    flipX: flipX,
    tint: tint,
    compose: compose
  };
})(window);
