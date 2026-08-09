/* Genera los iconos PNG de la PWA sin dependencias externas.
   Uso: node tools/make_icons.js   (escribe icons/icon-192.png y icon-512.png) */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PAL = {
  '.': null,
  '1': [0x14, 0x12, 0x10],
  'R': [0xe0, 0x33, 0x2f],
  'r': [0x9c, 0x1a, 0x18],
  'P': [0xff, 0x3b, 0x30],
  'p': [0xff, 0x9d, 0x95],
  'Y': [0xff, 0xd9, 0x3b],
  'y': [0xd9, 0xa3, 0x18],
  'z': [0xff, 0xf6, 0xbd],
  'S': [0xf4, 0xbb, 0x8e],
  's': [0xc9, 0x85, 0x5c],
  'B': [0x1f, 0x1f, 0x24],
  'V': [0x2e, 0x7d, 0x4f],
  'v': [0x17, 0x51, 0x2f],
  'Q': [0x8e, 0x22, 0x47],
  'K': [0xf7, 0xe7, 0xc6],
  'C': [0x2a, 0x86, 0xc9],
  'c': [0x12, 0x4f, 0x7d],
  'W': [0xf2, 0xdf, 0xae]
};

// 24x24: Cami de frente sobre el mar, con una botella al costado
const ART = [
  'cccccccccccccccccccccccc',
  'cccccccccccccccccccccccc',
  'ccccccccrRRRRRrcccccccvc',
  'ccccccrRRRRRRRRRrccccVVc',
  'ccccccRRzRRRRRRRRrccvVVc',
  'ccccc1RRRRRRRRRRRR1cVQQV',
  'ccccc1BBBBBBBBBBBB1cVKKV',
  'ccccc1BPPPPPPPPPPB1cVQKV',
  'ccccc1BpPPPPPPPPPB1cvVVv',
  'ccccc1BBBBBBBBBBBB1ccvvc',
  'ccccc11SSSSSSSSSS11ccccc',
  'ccccc11SSSSssSSSS11ccccc',
  'ccccc111SSSSSSSS111ccccc',
  'cccccc11SSSSSSSS11cccccc',
  'cccccc1YYYYYYYYYY1cccccc',
  'ccccccYYYYYYYYYYYYcccccc',
  'cccccYYYYYYYYYYYYYYccccc',
  'cccccYYYYYYYYYYYYYYccccc',
  'ccccccYYzYYYYYYYYYcccccc',
  'ccccccyYYYYYYYYYYycccccc',
  'cccccccYYYYYYYYYYccccccc',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWWWWWWWWW'
];

function crcTable() {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function render(size) {
  const src = ART.length;          // 24
  const scale = Math.floor(size / src);
  const off = Math.floor((size - scale * src) / 2);
  const buf = Buffer.alloc(size * size * 4);
  const bg = PAL['c'];
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bg[0]; buf[i * 4 + 1] = bg[1]; buf[i * 4 + 2] = bg[2]; buf[i * 4 + 3] = 255;
  }
  for (let y = 0; y < src; y++) {
    for (let x = 0; x < ART[y].length; x++) {
      const col = PAL[ART[y][x]];
      if (!col) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = off + x * scale + dx, py = off + y * scale + dy;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const o = (py * size + px) * 4;
          buf[o] = col[0]; buf[o + 1] = col[1]; buf[o + 2] = col[2]; buf[o + 3] = 255;
        }
      }
    }
  }
  return png(size, size, buf);
}

const dir = path.join(__dirname, '..', 'icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
[192, 512].forEach(s => {
  const file = path.join(dir, `icon-${s}.png`);
  fs.writeFileSync(file, render(s));
  console.log('escrito ' + file);
});
