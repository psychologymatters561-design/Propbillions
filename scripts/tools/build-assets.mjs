// Copies the client's own images into assets/source (originals + manifest) and writes web-sized
// versions into public/img. Every image keeps its origin, and renders are marked for the
// "Artist's impression" label. Run: node scripts/tools/build-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'audit-raw/hf/crawl/images';
const crawl = JSON.parse(fs.readFileSync('audit-raw/hf/crawl/images.json', 'utf8'));
const byFile = Object.fromEntries(crawl.filter((c) => c.file).map((c) => [c.file, c]));
// file prefix -> where it goes, what it is
const MAP = [
  ['whatsapp-image-2026-09-26-at-175350-50', 'projects/heaven-in-the-forest/site-1', 'photo', 'Site photo shared by PropBillions (WhatsApp image dated 26 Sep 2026)'],
  ['whatsapp-image-2026-09-26-at-175350-1', 'projects/heaven-in-the-forest/site-2', 'photo', 'Site photo shared by PropBillions (WhatsApp image dated 26 Sep 2026)'],
  ['whatsapp-image-2026-09-26-at-175351-48', 'projects/heaven-in-the-forest/site-3', 'photo', 'Site photo shared by PropBillions (WhatsApp image dated 26 Sep 2026)'],
  ['whatsapp-image-2026-09-26-at-175351-1', 'projects/heaven-in-the-forest/site-4', 'photo', 'Site photo shared by PropBillions (WhatsApp image dated 26 Sep 2026)'],
  ['screenshot-2026-09-15', 'projects/heaven-in-the-forest/banner', 'render', 'Developer banner (FLR Developers LLP)'],
  ['1bhk-1', 'projects/heaven-in-the-forest/plan-1bhk', 'plan', 'Floor plan, 1 BHK, 570 sq ft as printed'],
  ['2bhk-1', 'projects/heaven-in-the-forest/plan-2bhk', 'plan', 'Floor plan, 2 BHK villa'],
  ['3bhk-', 'projects/heaven-in-the-forest/plan-3bhk', 'plan', 'Floor plan, 3 BHK villa'],
  ['whatsapp-image-2024-05-17', 'projects/london-mart/render', 'render', 'Developer render'],
  ['lowerground', 'projects/london-mart/plan-lower-ground', 'plan', 'Lower ground floor plan'],
  ['upperground', 'projects/london-mart/plan-ground', 'plan', 'Ground floor plan'],
  ['firstfloor', 'projects/london-mart/plan-first', 'plan', 'First floor plan'],
  ['secondfloor', 'projects/london-mart/plan-second', 'plan', 'Second floor plan'],
  ['3rdfloor', 'projects/london-mart/plan-third', 'plan', 'Third floor plan'],
  ['4thfloor', 'projects/london-mart/plan-fourth', 'plan', 'Fourth floor plan'],
  ['5thfloor', 'projects/london-mart/plan-fifth', 'plan', 'Fifth floor plan'],
  ['techpark-', 'projects/tech-park-knowledge-park-5/render', 'render', 'Developer render'],
  ['screenshot-2026-09-21-at-24531', 'projects/tech-park-knowledge-park-5/facade-1', 'render', 'Outer facade render'],
  ['screenshot-2026-09-21-at-24548', 'projects/tech-park-knowledge-park-5/facade-2', 'render', 'Outer facade render'],
  ['screenshot-2026-09-21-at-24600', 'projects/tech-park-knowledge-park-5/facade-3', 'render', 'Outer facade render'],
  ['screenshot-2026-09-21-at-24407', 'projects/tech-park-knowledge-park-5/layout', 'plan', 'Site layout'],
  ['godrej-woodz-sector-43', 'projects/godrej-the-plaza/render', 'render', 'Developer render (Godrej Woods)'],
  ['godrej-golf-links', 'projects/godrej-golf-links/render', 'render', 'Developer render'],
  ['sky_mansion_by_risland', 'projects/risland-sky-mansion/render', 'render', 'Developer render'],
  ['sarvesh_chauhan', 'team/sarvesh-chauhan', 'portrait', 'Team photo from propbillions.com/about'],
  ['Fareed_Ahmad', 'team/fareed-ahmad', 'portrait', 'Team photo from propbillions.com/about'],
  ['shahnawaz', 'team/shahnawaz-khan', 'portrait', 'Team photo from propbillions.com/about'],
  ['muskan', 'team/muskan-malik', 'portrait', 'Team photo from propbillions.com/about'],
  ['amit_kumar', 'team/amit-kumar', 'portrait', 'Team photo from propbillions.com/about'],
  ['34-', 'team/event-1', 'photo', 'Team event photo from the gallery'],
  ['6-8', 'team/event-2', 'photo', 'Team event photo from the gallery'],
  ['5-ec', 'team/event-3', 'photo', 'Team event photo from the gallery'],
  ['logo-561', 'brand/logo-current', 'logo', 'Current logo'],
];
const SKIP = { 'about-hero': 'Origin unknown, likely stock. Not used.', 'site-visit': 'Origin unknown. Not used.', 'logo-be87': 'Mislabelled skyline image, origin unknown. Not used.', '500-': 'Stock-style tile. Not used.', 'residential-': 'Stock-style tile. Not used.', 'commerical-': 'Stock-style tile. Not used.', 'move-': 'Stock-style tile. Not used.', 'AJX3': 'Blog thumbnail. Not used.', '7-90': 'Gallery photo, duplicate set. Not used.' };

fs.mkdirSync('assets/source', { recursive: true });
const manifest = [];
for (const file of fs.readdirSync(SRC)) {
  const meta = byFile[file] || {};
  const hit = MAP.find(([p]) => file.startsWith(p));
  const skip = Object.entries(SKIP).find(([p]) => file.startsWith(p));
  fs.copyFileSync(path.join(SRC, file), path.join('assets/source', file));
  const info = await sharp(path.join(SRC, file)).metadata().catch(() => ({}));
  const entry = { file: `assets/source/${file}`, originalUrl: meta.url || null, foundOn: meta.page || null, bytes: fs.statSync(path.join(SRC, file)).size, width: info.width, height: info.height, alt: meta.alt || null };
  if (!hit) { manifest.push({ ...entry, used: false, note: skip ? skip[1] : 'Not used.' }); continue; }
  const [, dest, kind, note] = hit;
  const outs = [];
  const widths = kind === 'portrait' ? [640, 320] : kind === 'logo' ? [415] : kind === 'plan' ? [1600, 900] : [1600, 900, 480];
  const ws = [...new Set(widths.map((w) => Math.min(w, info.width || w)))];
  for (const w of ws) {
    const out = `public/img/${dest}-${w}.webp`;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const r = await sharp(path.join(SRC, file)).rotate().resize({ width: Math.min(w, info.width || w), withoutEnlargement: true }).webp({ quality: kind === 'plan' ? 82 : 72 }).toFile(out);
    outs.push({ src: out.replace('public', ''), width: r.width, height: r.height, bytes: r.size });
  }
  manifest.push({ ...entry, used: true, kind, note, rights: kind === 'render' || kind === 'plan' ? "Developer material shown on the client's site. Written permission from the developer to confirm. Label: Artist's impression." : kind === 'portrait' ? 'Client team photo. Confirm consent of each person.' : "Client's own material.", outputs: outs });
}
fs.writeFileSync('assets/source/manifest.json', JSON.stringify(manifest, null, 1));
// Lookup used by the site: dest -> outputs
const lookup = Object.fromEntries(manifest.filter((m) => m.used).map((m) => [MAP.find(([p]) => m.file.split('/').pop().startsWith(p))[1], { kind: m.kind, note: m.note, sizes: m.outputs }]));
fs.writeFileSync('src/data/images.json', JSON.stringify(lookup, null, 1));
console.log('used', manifest.filter((m) => m.used).length, 'of', manifest.length);
