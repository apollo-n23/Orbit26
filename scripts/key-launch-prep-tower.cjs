/**
 * One-shot: chroma-key pink studio BG from Imagine JPGs → transparent PNGs.
 * Not part of the app runtime.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const session =
  'C:\\Users\\antho\\.grok\\sessions\\C%3A%5CUsers%5Cantho%5COrbit26\\019ff863-d727-7e51-ac2c-3e3057a37856\\images';
const outDir = path.join(__dirname, '..', 'public');

const jobs = [
  { src: path.join(session, '1.jpg'), name: 'LaunchPrepTowerMast.png' },
  { src: path.join(session, '5.jpg'), name: 'LaunchPrepStrongback.png' },
  { src: path.join(session, '4.jpg'), name: 'LaunchPrepTowerBase.png' },
];

function isBg(r, g, b) {
  // Studio pink/magenta (JPEG-compressed #FF00FF → ~230,50,170)
  if (r < 120) return false;
  if (g > 140) return false;
  if (r - g < 55) return false;
  if (b - g < 40) return false;
  if (b < 90) return false;
  // Avoid pure red hazard / amber: need B not far below R
  if (b < r * 0.45) return false;
  return true;
}

function keyRgba(rgb, w, h, channels) {
  // Global chroma key (not edge-only) so lattice holes go transparent.
  const n = w * h;
  const rgba = Buffer.alloc(n * 4);
  const bgMask = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const o = i * channels;
    if (isBg(rgb[o], rgb[o + 1], rgb[o + 2])) bgMask[i] = 1;
  }

  // Soft fringe: pink-tinted pixels next to keyed bg
  const soft = new Uint8Array(n);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (bgMask[i]) continue;
      let near = false;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        if (bgMask[(y + dy) * w + (x + dx)]) {
          near = true;
          break;
        }
      }
      if (!near) continue;
      const o = i * channels;
      const r = rgb[o];
      const g = rgb[o + 1];
      const b = rgb[o + 2];
      if (r > g + 35 && b > g + 15 && r > 90) soft[i] = 1;
    }
  }

  for (let i = 0; i < n; i++) {
    const o = i * channels;
    const r = rgb[o];
    const g = rgb[o + 1];
    const b = rgb[o + 2];
    const di = i * 4;
    if (bgMask[i]) {
      rgba[di] = 0;
      rgba[di + 1] = 0;
      rgba[di + 2] = 0;
      rgba[di + 3] = 0;
    } else if (soft[i]) {
      const strength = Math.min(1, (r - g + (b - g) - 50) / 150);
      const a = Math.round(255 * (1 - Math.max(0, strength)));
      const nr = Math.round(r - (r - g) * 0.6 * strength);
      const nb = Math.round(b - (b - g) * 0.5 * strength);
      rgba[di] = nr;
      rgba[di + 1] = g;
      rgba[di + 2] = nb;
      rgba[di + 3] = a;
    } else {
      // Despill residual pink/purple (e.g. clamp pads that picked up key color)
      let nr = r;
      let ng = g;
      let nb = b;
      if (r > g + 40 && b > g + 25 && r > 100 && g < 140) {
        // Recolor purple pads toward warm steel / keep amber clamps (amber has high G)
        if (g < 100 && b > r * 0.55) {
          nr = Math.round(g + 30);
          ng = Math.round(g + 20);
          nb = Math.round(g + 25);
        } else {
          const s = Math.min(0.55, (r - g - 40) / 180);
          nr = Math.round(r - (r - g) * s);
          nb = Math.round(b - (b - g) * s * 0.85);
        }
      }
      rgba[di] = nr;
      rgba[di + 1] = ng;
      rgba[di + 2] = nb;
      rgba[di + 3] = 255;
    }
  }
  return rgba;
}

function bbox(data, w, h, pad) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        found = true;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return { left: 0, top: 0, width: w, height: h };
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function main() {
  for (const job of jobs) {
    if (!fs.existsSync(job.src)) {
      throw new Error('Missing source: ' + job.src);
    }
    const { data, info } = await sharp(job.src)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = keyRgba(data, info.width, info.height, info.channels);
    const box = bbox(rgba, info.width, info.height, 6);
    const cropped = Buffer.alloc(box.width * box.height * 4);
    for (let y = 0; y < box.height; y++) {
      for (let x = 0; x < box.width; x++) {
        const si = ((box.top + y) * info.width + (box.left + x)) * 4;
        const di = (y * box.width + x) * 4;
        cropped[di] = rgba[si];
        cropped[di + 1] = rgba[si + 1];
        cropped[di + 2] = rgba[si + 2];
        cropped[di + 3] = rgba[si + 3];
      }
    }
    const outPath = path.join(outDir, job.name);
    await sharp(cropped, {
      raw: { width: box.width, height: box.height, channels: 4 },
    })
      .png()
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    let t = 0;
    let o = 0;
    let p = 0;
    for (let i = 3; i < cropped.length; i += 4) {
      if (cropped[i] === 0) t++;
      else if (cropped[i] === 255) o++;
      else p++;
    }
    console.log(
      job.name,
      meta.width + 'x' + meta.height,
      'hasAlpha=' + meta.hasAlpha,
      'opaque',
      o,
      'trans',
      t,
      'partial',
      p,
      'bytes',
      fs.statSync(outPath).size,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
