// Genera icon-192.png e icon-512.png — pure Node.js, no deps
// Design: sfondo viola scuro, saetta arancio/gialla grande, bordo arancio sottile
const zlib = require('zlib');
const fs   = require('fs');

// ── CRC32 ─────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++)
    crc = (crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

// ── Helpers ───────────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Alpha-blend src over dst
function blend(px, i, r, g, b, a) {
  if (a <= 0) return;
  if (a >= 255) { px[i]=r; px[i+1]=g; px[i+2]=b; px[i+3]=255; return; }
  const f = a / 255, q = 1 - f;
  px[i]   = Math.round(px[i]   * q + r * f);
  px[i+1] = Math.round(px[i+1] * q + g * f);
  px[i+2] = Math.round(px[i+2] * q + b * f);
  px[i+3] = Math.min(255, px[i+3] + a);
}

// Point-in-polygon (ray casting)
function inPoly(px, py, verts) {
  let inside = false;
  const n = verts.length;
  for (let i = 0, j = n-1; i < n; j = i++) {
    const [xi, yi] = verts[i], [xj, yj] = verts[j];
    if (((yi > py) !== (yj > py)) &&
        px < ((xj-xi) * (py-yi)) / (yj-yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Min distance from point to polygon boundary
function distToEdge(px, py, verts) {
  const n = verts.length;
  let minD = Infinity;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = verts[i], [bx, by] = verts[(i+1) % n];
    const dx = bx-ax, dy = by-ay, lenSq = dx*dx + dy*dy;
    if (lenSq === 0) { minD = Math.min(minD, Math.hypot(px-ax, py-ay)); continue; }
    const t = clamp(((px-ax)*dx + (py-ay)*dy) / lenSq, 0, 1);
    minD = Math.min(minD, Math.hypot(px-(ax+t*dx), py-(ay+t*dy)));
  }
  return minD;
}

// ── Icon builder ──────────────────────────────────────────────────────
function createIcon(size) {
  const w = size, h = size;
  const px = new Uint8Array(w * h * 4); // RGBA all zeros (transparent)

  const cx = w / 2, cy = h / 2;
  const outerR  = w * 0.46;
  const borderW = outerR * 0.06;   // thin orange ring ~6%
  const innerR  = outerR - borderW;

  // ── 1. Dark-purple background circle ─────────────────────────────
  // Gradient: #5349B7 (83,73,183) top → #2A1E6A (42,30,106) bottom
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const i    = (y * w + x) * 4;
      // Soft anti-alias on outer edge (1.5px band)
      const edgeA = clamp((outerR + 0.75 - dist) / 1.5, 0, 1);
      if (edgeA <= 0) continue;
      const a = Math.round(edgeA * 255);

      if (dist >= innerR) {
        // Orange ring #EF9F27 = 239,159,39
        blend(px, i, 239, 159, 39, a);
      } else {
        // Purple gradient
        const t  = y / h;                        // 0=top, 1=bottom
        const gr = Math.round(lerp(83, 42, t));  // #5349B7 → #2A1E6A
        const gg = Math.round(lerp(73, 30, t));
        const gb = Math.round(lerp(183,106, t));
        blend(px, i, gr, gg, gb, a);
      }
    }
  }

  // ── 2. Lightning bolt ─────────────────────────────────────────────
  // Bolt bounding box: ~62% of innerR wide, ~85% tall, centered.
  // Bold classic ⚡: two diagonal blades with a horizontal notch.
  //
  //    A ╲                  A = top-right
  //       ╲                 B = middle-left (upper blade tip)
  //     B--C                C = notch right (step outward)
  //         ╲               E = notch left (step inward, symmetric of C)
  //       E--D (=CE rotated) D = middle-right (lower blade start)
  //          ╲               F = bottom-left (lower blade tip)
  //           F
  const bw = innerR * 0.68;  // half-width multiplier
  const bh = innerR * 0.86;  // half-height multiplier

  const raw = [
    [ 0.38, -1.00],  // A  top-right
    [-0.52,  0.06],  // B  middle-left
    [ 0.18,  0.06],  // C  notch-right
    [-0.38,  1.00],  // D  bottom-left
    [ 0.52, -0.06],  // E  middle-right
    [-0.18, -0.06],  // F  notch-left
  ];

  const bolt = raw.map(([nx, ny]) => [cx + nx*bw, cy + ny*bh]);

  // Precompute bounding box
  const bxs = bolt.map(p => p[0]), bys = bolt.map(p => p[1]);
  const minX = Math.max(0, Math.floor(Math.min(...bxs) - 2));
  const maxX = Math.min(w-1, Math.ceil (Math.max(...bxs) + 2));
  const minY = Math.max(0, Math.floor(Math.min(...bys) - 2));
  const maxY = Math.min(h-1, Math.ceil (Math.max(...bys) + 2));

  // Bolt gradient:
  //   centre of icon → bright yellow #FFE566 (255,229,102)
  //   edges          → orange        #EF9F27 (239,159,39)
  const gradMax = innerR * 0.72;
  const AA = 1.2;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (Math.hypot(x - cx, y - cy) > innerR + 0.5) continue;
      const i       = (y * w + x) * 4;
      const inside  = inPoly(x, y, bolt);
      const edgeDist= distToEdge(x, y, bolt);

      let alpha;
      if (inside) {
        alpha = edgeDist < AA ? Math.round((edgeDist / AA) * 255) : 255;
      } else if (edgeDist < AA) {
        alpha = Math.round((1 - edgeDist / AA) * 200);
      } else continue;

      if (alpha <= 0) continue;

      // Radial gradient colour (distance from icon centre)
      const distFromC = Math.hypot(x - cx, y - cy);
      const t = Math.min(1, distFromC / gradMax);
      const cr = Math.round(lerp(255, 239, t));  // 255→239
      const cg = Math.round(lerp(229, 159, t));  // 229→159
      const cb = Math.round(lerp(102,  39, t));  //102→ 39

      blend(px, i, cr, cg, cb, alpha);
    }
  }

  // ── 3. Encode PNG ─────────────────────────────────────────────────
  const sig  = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8);    // 8-bit depth
  ihdr.writeUInt8(6, 9);    // RGBA

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(w * 4 + 1);
    row[0] = 0;
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      row[1+x*4]=px[si]; row[2+x*4]=px[si+1];
      row[3+x*4]=px[si+2]; row[4+x*4]=px[si+3];
    }
    rows.push(row);
  }

  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 6 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate both sizes ───────────────────────────────────────────────
fs.writeFileSync('icon-192.png', createIcon(192));
console.log('✅  icon-192.png  (192×192)');
fs.writeFileSync('icon-512.png', createIcon(512));
console.log('✅  icon-512.png  (512×512)');
