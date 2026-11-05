import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const urls = fs.existsSync('scripts/audit/benchmarks.txt') ? fs.readFileSync('scripts/audit/benchmarks.txt', 'utf8').split(/\s+/).filter(Boolean) : [];
const b = await chromium.launch();
const res = {};
for (const url of urls) {
  const n = url.replace(/https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_');
  for (const [mode, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', devices['iPhone 13']]]) {
    const c = await b.newContext(opts); const p = await c.newPage();
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await p.waitForTimeout(5000);
      await p.screenshot({ path: `${out}/${n}_${mode}.jpg`, type: 'jpeg', quality: 60 });
      if (mode === 'desktop') {
        await p.screenshot({ path: `${out}/${n}_full.jpg`, fullPage: true, type: 'jpeg', quality: 40 }).catch(() => {});
        res[url] = await p.evaluate(() => ({ title: document.title, headings: [...document.querySelectorAll('h1,h2,h3')].map((h) => h.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60), text: document.body.innerText.slice(0, 6000) }));
      }
    } catch (e) { res[url + ' ' + mode] = { error: e.message.slice(0, 200) }; }
    await c.close();
  }
}
await b.close();
fs.writeFileSync(`${out}/bench.json`, JSON.stringify(res, null, 1));
