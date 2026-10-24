// Generates captioned Google Play screenshots (1080x1920) and the feature graphic (1024x500)
// from the web build, using sample data.
//
// Usage: npx expo export --platform web && (serve dist on a port) && node scripts/store-screenshots.mjs http://localhost:8091
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright is used from wherever it's installed (it isn't an app dependency).
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.argv[2] ?? 'http://localhost:8091';
const OUT = new URL('../assets/store/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const ACCENT = '#2F6B5E';
const PAPER = '#FAFAF7';
const INK = '#141414';

const shots = [
  { file: '01-total', path: '/', caption: 'Know what you<br>really pay', sub: 'Every subscription, one monthly total' },
  { file: '02-reminders', path: '/', caption: 'A reminder before<br>every renewal', sub: 'Cancel in time, never get caught out', notification: true },
  { file: '03-save', path: '/insights', caption: 'Find what<br>to cancel', sub: 'Monthly check-ins, price rises, annual savings' },
  { file: '04-shared', path: '/subscription/:netflix', caption: 'Share plans,<br>settle up', sub: 'Split costs and see who owes you' },
  { file: '05-calendar', path: '/calendar', caption: 'See every<br>renewal day', sub: 'Plan around big charges', pickBusiestDay: true },
  { file: '06-year', path: '/year', caption: 'No bank login.<br>No subscription.', sub: 'Private by design. One-off upgrade.' },
];

const icon = `data:image/png;base64,${readFileSync(new URL('../assets/icon.png', import.meta.url)).toString('base64')}`;

const b = await chromium.launch();
const app = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2.4, locale: 'en-US' });
await app.goto(BASE + '/', { waitUntil: 'networkidle' });
await app.getByText('Explore with sample data').click();
await app.waitForTimeout(600);
// Unlock Plus screens for the screenshots.
await app.evaluate(() => {
  const k = 'subtrack-v1';
  const d = JSON.parse(localStorage.getItem(k));
  d.state.settings.plus = true;
  localStorage.setItem(k, JSON.stringify(d));
});
const netflixId = await app.evaluate(() => JSON.parse(localStorage.getItem('subtrack-v1')).state.subscriptions.find((s) => s.name === 'Netflix').id);

const raw = {};
for (const s of shots) {
  await app.goto(BASE + s.path.replace(':netflix', netflixId), { waitUntil: 'networkidle' });
  await app.waitForTimeout(700);
  if (s.pickBusiestDay) {
    // Select the upcoming day with the most renewals so the list under the calendar isn't empty.
    const labels = await app.locator('[aria-label*="renewals"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const best = labels.map((l) => ({ l, n: Number(l.match(/: (\d+) renewals/)?.[1] ?? 0) })).sort((a, b) => b.n - a.n)[0];
    if (best?.n) await app.locator(`[aria-label="${best.l}"]`).click();
    await app.waitForTimeout(400);
  }
  raw[s.file] = (await app.screenshot()).toString('base64');
}

const frame = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const s of shots) {
  const banner = s.notification
    ? `<div class="notif"><img src="${icon}"><div><b>Netflix renews in 3 days</b><span>$15.49. Still using it? Tap to review or cancel.</span></div><em>now</em></div>`
    : '';
  await frame.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box;margin:0}
    body{width:1080px;height:1920px;background:${ACCENT};font-family:Inter,Roboto,'Segoe UI',system-ui,sans-serif;color:#fff;overflow:hidden;position:relative}
    h1{position:absolute;top:120px;left:0;right:0;text-align:center;font-size:92px;line-height:1.05;font-weight:700;letter-spacing:-2px}
    p{position:absolute;top:360px;left:0;right:0;text-align:center;font-size:40px;opacity:.85}
    .phone{position:absolute;top:500px;left:50%;transform:translateX(-50%);width:780px;height:1560px;border-radius:64px;background:#111;padding:18px;box-shadow:0 40px 80px rgba(0,0,0,.35)}
    .phone img{width:100%;height:100%;border-radius:48px;display:block;object-fit:cover;object-position:top}
    .notif{position:absolute;top:560px;left:50%;transform:translateX(-50%);width:860px;background:${PAPER};color:${INK};border-radius:36px;padding:30px 34px;display:flex;gap:24px;align-items:center;box-shadow:0 24px 60px rgba(0,0,0,.35);z-index:2}
    .notif img{width:84px;height:84px;border-radius:22px}
    .notif b{display:block;font-size:36px;margin-bottom:6px}.notif span{font-size:30px;color:#555}.notif em{font-style:normal;color:#888;font-size:28px;align-self:flex-start}
  </style></head><body>
    <h1>${s.caption}</h1><p>${s.sub}</p>
    <div class="phone"><img src="data:image/png;base64,${raw[s.file]}"></div>${banner}
  </body></html>`);
  await frame.screenshot({ path: `${OUT}${s.file}.png` });
  console.log('wrote', s.file);
}

// Feature graphic 1024x500
const fg = await b.newPage({ viewport: { width: 1024, height: 500 } });
await fg.setContent(`<!doctype html><html><head><style>
  *{box-sizing:border-box;margin:0}
  body{width:1024px;height:500px;background:${ACCENT};font-family:Inter,Roboto,'Segoe UI',system-ui,sans-serif;color:#fff;overflow:hidden;position:relative}
  .txt{position:absolute;left:70px;top:120px;width:520px}
  .brand{display:flex;align-items:center;gap:20px;margin-bottom:34px}
  .brand img{width:84px;height:84px;border-radius:22px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
  .brand span{font-size:54px;font-weight:700;letter-spacing:-1px}
  h1{font-size:44px;line-height:1.15;font-weight:700;letter-spacing:-1px}
  p{font-size:24px;opacity:.85;margin-top:16px}
  .phone{position:absolute;right:70px;top:60px;width:300px;height:600px;border-radius:36px;background:#111;padding:9px;transform:rotate(-6deg);box-shadow:0 30px 60px rgba(0,0,0,.35)}
  .phone img{width:100%;height:100%;border-radius:28px;object-fit:cover;object-position:top}
</style></head><body>
  <div class="txt"><div class="brand"><img src="${icon}"><span>SubTrack</span></div>
  <h1>Every subscription.<br>No bank login.</h1><p>Reminders before you're charged.</p></div>
  <div class="phone"><img src="data:image/png;base64,${raw['01-total']}"></div>
</body></html>`);
await fg.screenshot({ path: `${OUT}feature-graphic.png` });
console.log('wrote feature-graphic');
await b.close();
