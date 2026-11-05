import sharp from 'sharp'; import fs from 'node:fs'; import path from 'node:path';
const dir = process.argv[2]; const out = process.argv[3];
const files = fs.readdirSync(dir).filter(f => !/^500|^AJX|^move|^residential|^commerical/.test(f)).sort();
const W = 220, H = 160, cols = 6; const rows = Math.ceil(files.length / cols);
const tiles = [];
for (const [i, f] of files.entries()) {
  try {
    const buf = await sharp(path.join(dir, f)).resize(W, H, { fit: 'contain', background: '#222' }).jpeg().toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="18"><rect width="100%" height="100%" fill="#000"/><text x="3" y="13" font-size="11" fill="#fff" font-family="monospace">${i}:${f.slice(0, 28)}</text></svg>`);
    tiles.push({ input: buf, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 18) + 18 }, { input: label, left: (i % cols) * W, top: Math.floor(i / cols) * (H + 18) });
  } catch (e) { console.log('skip', f, e.message); }
}
await sharp({ create: { width: cols * W, height: rows * (H + 18), channels: 3, background: '#111' } }).composite(tiles).jpeg({ quality: 70 }).toFile(out);
console.log(files.length);
