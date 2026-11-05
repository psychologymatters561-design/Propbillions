// Copy gate: fails the build if visible text contains em dashes or banned stock phrases.
// Usage: node scripts/copy-gate.mjs [dir=dist]
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'dist';
const banned = [
  /luxury redefined/i, /\belevat(e|es|ed|ing)\b/i, /\bseamless(ly)?\b/i, /world[- ]class/i, /\bunparalleled\b/i,
  /\bleverag(e|es|ing)\b/i, /\bempower(s|ing)?\b/i, /\bunlock(s|ing)?\b/i, /\brobust\b/i, /\bactionable\b/i, /data-driven/i,
  /\bsolutions\b/i, /\btestament\b/i, /\blandscape\b/i, /\bdelve\b/i, /\bdream (home|property)\b/i, /\bstate[- ]of[- ]the[- ]art\b/i,
];
const hits = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk(p);
  if (!/\.(html)$/.test(e.name)) return;
  const html = fs.readFileSync(p, 'utf8');
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  if (text.includes('—')) hits.push(`${p}: em dash`);
  for (const re of banned) { const m = text.match(re); if (m) hits.push(`${p}: "${m[0]}"`); }
});
if (!fs.existsSync(dir)) { console.log('copy gate: nothing to check'); process.exit(0); }
walk(dir);
if (hits.length) { console.error('Copy gate failed:\n' + hits.join('\n')); process.exit(1); }
console.log('Copy gate passed: no em dashes, no stock phrases.');
