// Generates icon-192.png and icon-512.png using pure Node.js (no dependencies)
const zlib = require('zlib');
const fs = require('fs');

// CRC32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// Bresenham thick line: sets pixels along a line with given half-thickness
function drawThickLine(pixels, w, x0, y0, x1, y1, r, R, G, B) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len; // normal
  // Rasterize: iterate bounding box
  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - r));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(x0, x1) + r));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - r));
  const maxY = Math.min(w - 1, Math.ceil(Math.max(y0, y1) + r));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Project point onto line
      const px = x - x0, py = y - y0;
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / (len * len)));
      const closestX = x0 + t * dx, closestY = y0 + t * dy;
      const dist = Math.hypot(x - closestX, y - closestY);
      if (dist <= r) {
        const alpha = dist > r - 1 ? Math.round((r - dist) * 255) : 255;
        const i = (y * w + x) * 4;
        // Alpha blend
        const a = alpha / 255;
        pixels[i]   = Math.round(pixels[i]   * (1 - a) + R * a);
        pixels[i+1] = Math.round(pixels[i+1] * (1 - a) + G * a);
        pixels[i+2] = Math.round(pixels[i+2] * (1 - a) + B * a);
        pixels[i+3] = Math.min(255, pixels[i+3] + alpha);
      }
    }
  }
}

function createIcon(size) {
  const w = size, h = size;
  const pixels = new Uint8Array(w * h * 4); // RGBA, starts transparent

  const cx = w / 2, cy = h / 2;
  const outerR = w * 0.47;
  const borderW = w * 0.065;
  const innerR = outerR - borderW;

  // Fill circle: purple inside, orange border
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const i = (y * w + x) * 4;
      if (dist <= outerR) {
        if (dist >= innerR) {
          // Orange border #EF9F27
          pixels[i] = 239; pixels[i+1] = 159; pixels[i+2] = 39; pixels[i+3] = 255;
        } else {
          // Purple fill #5349B7
          pixels[i] = 83; pixels[i+1] = 73; pixels[i+2] = 183; pixels[i+3] = 255;
        }
      }
      // Anti-alias outer edge
      if (dist > outerR - 1 && dist <= outerR + 1) {
        const blend = Math.max(0, Math.min(1, outerR + 0.5 - dist));
        pixels[i+3] = Math.round(blend * 255);
        if (dist < innerR) { pixels[i] = 83; pixels[i+1] = 73; pixels[i+2] = 183; }
        else { pixels[i] = 239; pixels[i+1] = 159; pixels[i+2] = 39; }
      }
    }
  }

  // Draw W letter in white
  // W occupies roughly 55% of inner radius width, centered
  const ww = innerR * 1.0;  // total W width
  const wh = innerR * 0.85; // total W height
  const wt = w * 0.055;      // stroke thickness
  const wx = cx - ww / 2;   // left edge
  const wy = cy - wh / 2 - wh * 0.05; // top edge (slightly above center)

  // W = 4 diagonal lines: down-right, up-right, down-right, up-right
  // Points (normalized): TL, BL-inner, CM, BR-inner, TR
  const pts = [
    [wx,            wy],          // 0: top-left
    [wx + ww*0.22,  wy + wh],     // 1: bottom-left
    [wx + ww*0.5,   wy + wh*0.5], // 2: center-mid
    [wx + ww*0.78,  wy + wh],     // 3: bottom-right
    [wx + ww,       wy],          // 4: top-right
  ];

  drawThickLine(pixels, w, pts[0][0], pts[0][1], pts[1][0], pts[1][1], wt, 255, 255, 255);
  drawThickLine(pixels, w, pts[1][0], pts[1][1], pts[2][0], pts[2][1], wt, 255, 255, 255);
  drawThickLine(pixels, w, pts[2][0], pts[2][1], pts[3][0], pts[3][1], wt, 255, 255, 255);
  drawThickLine(pixels, w, pts[3][0], pts[3][1], pts[4][0], pts[4][1], wt, 255, 255, 255);

  // Build PNG binary
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(6, 9); // 8-bit RGBA

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(w * 4 + 1);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      row[1 + x*4] = pixels[si]; row[2 + x*4] = pixels[si+1];
      row[3 + x*4] = pixels[si+2]; row[4 + x*4] = pixels[si+3];
    }
    rows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 6 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

fs.writeFileSync('icon-192.png', createIcon(192));
console.log('✅ icon-192.png created');
fs.writeFileSync('icon-512.png', createIcon(512));
console.log('✅ icon-512.png created');
