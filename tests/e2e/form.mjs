// Lead form: empty submit shows errors; valid submit shows the hand-off step. node tests/e2e/form.mjs <baseUrl>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = (process.argv[2] || 'http://localhost:4321/Propbillions').replace(/\/$/, '');
const b = await chromium.launch(); const p = await b.newPage();
let navigatedTo = '';
p.on('request', (r) => { if (r.url().startsWith('mailto:') || r.url().includes('wa.me')) navigatedTo = r.url(); });
await p.goto(base + '/contact', { waitUntil: 'load' });
const f = p.locator('#contact-form');
await f.locator('[data-submit]').click();
const errs = await f.locator('[data-err]').allTextContents();
const hasErrors = errs.filter(Boolean).length >= 3;
await p.waitForTimeout(2600); // the form rejects bot-speed submits under 2.5 s
await f.locator('[name=name]').fill('Test Lead');
await f.locator('[name=phone]').fill('98100 12345');
await f.locator('[name=consent]').check();
await f.locator('[data-submit]').click();
await p.waitForTimeout(500);
const done = await f.locator('[data-done]').innerText().catch(() => '');
console.log(JSON.stringify({ hasErrors, errors: errs.filter(Boolean), done: done.slice(0, 160) }, null, 1));
await b.close();
process.exit(hasErrors && /One last tap|Got it/.test(done) ? 0 : 1);
