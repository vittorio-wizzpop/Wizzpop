// Genera icon-192.png e icon-512.png — pure Node.js, no deps
// Design: gradiente viola, saetta bianca, bordo arancio
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
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Alpha-blend (src over dst)
function blend(pixels, i, r, g, b, a) {
  if (a === 0) return;
  if (a === 255) { pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = 255; return; }
  const fa = a / 255, ia = 1 - fa;
  pixels[i]   = Math.round(pixels[i]   * ia + r * fa);
  pixels[i+1] = Math.round(pixels[i+1] * ia + g * fa);
  pixels[i+2] = Math.round(pixels[i+2] * ia + b * fa);
  pixels[i+3] = Math.min(255, pixels[i+3] + a);
}

// ── Point-in-polygon (ray casting) ───────────────────────────────────
function pointInPoly(px, py, verts) {
  let inside = false;
  const n = verts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = verts[i], [xj, yj] = verts[j];
    if (((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Signed distance from point to line segment (for anti-aliasing bolt edges)
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax)*dx + (py - ay)*dy) / lenSq, 0, 1);
  return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));
}

// Min distance from point to polygon edge
function distToPoly(px, py, verts) {
  const n = verts.length;
  let minD = Infinity;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = verts[i], [bx, by] = verts[(i+1) % n];
    minD = Math.min(minD, distToSegment(px, py, ax, ay, bx, by));
  }
  return minD;
}

// ── Main icon creator ─────────────────────────────────────────────────
function createIcon(size) {
  const w = size, h = size;
  const pixels = new Uint8Array(w * h * 4); // RGBA, all transparent

  const cx = w / 2, cy = h / 2;
  const outerR  = w * 0.47;
  const borderW = outerR * 0.10;  // 10% of outer radius for visible ring
  const innerR  = outerR - borderW;

  // ── 1. Circle: gradient purple background + orange ring ──────────
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const idx  = (y * w + x) * 4;

      // Anti-alias outer edge
      const outerAlpha = clamp((outerR + 0.8 - dist) / 1.6, 0, 1);
      if (outerAlpha <= 0) continue;

      const a = Math.round(outerAlpha * 255);

      if (dist >= innerR) {
        // Orange border ring #EF9F27
        blend(pixels, idx, 239, 159, 39, a);
      } else {
        // Purple gradient: #5349B7 (83,73,183) top → #3C3489 (60,52,137) bottom
        // Anti-alias inner→outer transition at border
        const t  = y / h;
        const gr = Math.round(lerp(83, 60, t));
        const gg = Math.round(lerp(73, 52, t));
        const gb = Math.round(lerp(183, 137, t));
        blend(pixels, idx, gr, gg, gb, a);
      }
    }
  }

  // ── 2. Lightning bolt polygon ──────────────────────────────────────
  // Bounding box of the bolt: ~60% of innerR wide, 82% tall, centered
  // Slightly tilted right: top is shifted right, bottom to the left
  const bw = innerR * 0.64;
  const bh = innerR * 0.82;

  // Bolt vertices (fractions of half-size, from center):
  //   Upper blade: top-right → left notch → right indent
  //   Lower blade: left indent → lower-right → bottom tip
  //
  //  ╲  ← top right
  //   ╲
  //    ╲__←  notch (wider here = looks like real bolt)
  //       ╲
  //        ╲  ← bottom left
  const raw = [
    [ 0.28, -1.00],   // A — top tip (shifted right)
    [-0.46,  0.02],   // B — middle-left (upper half ends)
    [ 0.08,  0.02],   // C — notch indent (right)
    [-0.28,  1.00],   // D — bottom tip (shifted left)
    [ 0.46, -0.02],   // E — middle-right (lower half starts)
    [-0.08, -0.02],   // F — notch indent (left)
  ];

  const bolt = raw.map(([nx, ny]) => [cx + nx * bw, cy + ny * bh]);

  // Rasterize bolt with 1px anti-alias band
  const AA_BAND = 1.2;
  // Bounding box
  const bxs = bolt.map(p => p[0]), bys = bolt.map(p => p[1]);
  const minX = Math.max(0, Math.floor(Math.min(...bxs) - AA_BAND));
  const maxX = Math.min(w-1, Math.ceil (Math.max(...bxs) + AA_BAND));
  const minY = Math.max(0, Math.floor(Math.min(...bys) - AA_BAND));
  const maxY = Math.min(h-1, Math.ceil (Math.max(...bys) + AA_BAND));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Only draw inside the inner circle
      if (Math.hypot(x - cx, y - cy) > innerR - 0.5) continue;
      const idx = (y * w + x) * 4;
      const inside = pointInPoly(x, y, bolt);
      if (inside) {
        // Fully inside: white, but smooth border
        const edgeDist = distToPoly(x, y, bolt);
        const a = edgeDist < AA_BAND ? Math.round((edgeDist / AA_BAND) * 255) : 255;
        blend(pixels, idx, 255, 255, 255, a);
      } else {
        // Outside but within AA_BAND of edge
        const edgeDist = distToPoly(x, y, bolt);
        if (edgeDist < AA_BAND) {
          const a = Math.round((1 - edgeDist / AA_BAND) * 180); // softer fringe
          blend(pixels, idx, 255, 255, 255, a);
        }
      }
    }
  }

  // ── 3. Encode PNG ─────────────────────────────────────────────────
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8);    // bit depth
  ihdr.writeUInt8(6, 9);    // colour type: RGBA

  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(w * 4 + 1);
    row[0] = 0; // filter: None
    for (let x = 0; x < w; x++) {
      const si = (y * w + x) * 4;
      row[1 + x*4] = pixels[si];   row[2 + x*4] = pixels[si+1];
      row[3 + x*4] = pixels[si+2]; row[4 + x*4] = pixels[si+3];
    }
    rows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 6 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Generate ──────────────────────────────────────────────────────────
fs.writeFileSync('icon-192.png', createIcon(192));
console.log('✅ icon-192.png  (192×192)');
fs.writeFileSync('icon-512.png', createIcon(512));
console.log('✅ icon-512.png  (512×512)');
