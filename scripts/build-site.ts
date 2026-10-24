// Builds the marketing site around the web app: a landing page, a "How to cancel …" guide for
// every preset service, and a sitemap. Output goes next to the exported web app (which lives in <out>/app).
//
// Usage: npx tsx scripts/build-site.ts <outDir>
// Env:   SITE_URL   absolute site URL, e.g. https://letsdothis4991-ui.github.io/subtrack
//        BASE_PATH  path prefix, e.g. /subtrack (default: derived from SITE_URL)
//        PLAY_URL   Google Play listing URL once the app is live (shows "Coming soon" until set)
//        SUPPORT_EMAIL
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_PATHS } from '../src/lib/logos.generated';
import { DEFAULT_CATEGORIES, PRESETS, type ServicePreset } from '../src/lib/presets';

const OUT = process.argv[2] ?? 'dist';
const SITE_URL = (process.env.SITE_URL ?? 'https://letsdothis4991-ui.github.io/subtrack').replace(/\/$/, '');
const BASE = (process.env.BASE_PATH ?? new URL(SITE_URL).pathname).replace(/\/$/, '');
const PLAY_URL = process.env.PLAY_URL?.trim() || '';
const EMAIL = process.env.SUPPORT_EMAIL ?? 'letsdothis4991@gmail.com';
const APP = `${BASE}/app/`;
const YEAR = new Date().getFullYear();

const APPLE_SUBS = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBS = 'https://play.google.com/store/account/subscriptions';

export const slug = (name: string) =>
  name.toLowerCase().replace(/\+/g, ' plus').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const catName = (id: string) => DEFAULT_CATEGORIES.find((c) => c.id === id)?.name ?? 'Other';

const STYLE = `
:root{--bg:#FAFAF7;--surface:#fff;--text:#141414;--muted:#6E6E69;--border:#E7E7E1;--accent:#2F6B5E;--accent-soft:#E3EEEA;--on-accent:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#111;--surface:#1A1A19;--text:#F1F1EC;--muted:#A2A29C;--border:#2A2A28;--accent:#7FBFAE;--accent-soft:#1F302B;--on-accent:#0E1A17}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
a{color:var(--accent)}img{max-width:100%;display:block}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
header{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px;color:var(--text);text-decoration:none}
.brand img{width:36px;height:36px;border-radius:10px}
nav{display:flex;gap:18px;font-size:15px}nav a{color:var(--muted);text-decoration:none}nav a:hover{color:var(--text)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 20px;border-radius:12px;font-weight:600;text-decoration:none;border:1px solid var(--border);color:var(--text);background:var(--surface)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.btn.soon{opacity:.7;cursor:default}
h1{font-size:clamp(34px,6vw,56px);line-height:1.08;letter-spacing:-1.5px;margin:0 0 16px}
h2{font-size:clamp(26px,4vw,34px);letter-spacing:-.8px;margin:0 0 12px;line-height:1.15}
h3{font-size:19px;margin:0 0 6px}
.lead{font-size:20px;color:var(--muted);max-width:560px}
.muted{color:var(--muted)}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:40px 0 60px}
.hero img{border-radius:28px;box-shadow:0 30px 60px rgba(0,0,0,.18)}
.ctas{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
section{padding:56px 0;border-top:1px solid var(--border)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:28px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:22px}
.shots{display:flex;gap:16px;overflow-x:auto;padding:8px 0 16px;scroll-snap-type:x mandatory}
.shots img{width:220px;flex:0 0 auto;border-radius:18px;scroll-snap-align:start}
.price{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:28px}
.price .card b{font-size:30px}
details{border-bottom:1px solid var(--border);padding:14px 0}summary{cursor:pointer;font-weight:600}
footer{border-top:1px solid var(--border);padding:30px 0 50px;font-size:14px;color:var(--muted);display:flex;flex-wrap:wrap;gap:18px;justify-content:space-between}
footer a{color:var(--muted)}
.svc{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin-top:24px}
.svc a{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);text-decoration:none}
.logo{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#fff;font-weight:700}
.logo svg{width:20px;height:20px;fill:#fff}
article{max-width:720px;margin:0 auto;padding:20px 0 40px}
article ol{padding-left:22px}article li{margin:8px 0}
.callout{background:var(--accent-soft);border-radius:18px;padding:22px;margin:28px 0}
.crumbs{font-size:14px;color:var(--muted);margin:10px 0 20px}.crumbs a{color:var(--muted)}
@media (max-width:760px){.hero{grid-template-columns:1fr}.hero img{max-width:320px;margin:0 auto}.grid,.price{grid-template-columns:1fr}nav a.hide-sm{display:none}}
`;

function logo(p: ServicePreset, size = 36) {
  const path = p.logo ? LOGO_PATHS[p.logo] : undefined;
  const inner = path ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>` : esc(p.name[0]);
  return `<span class="logo" style="background:${p.color};width:${size}px;height:${size}px">${inner}</span>`;
}

function page(opts: { title: string; description: string; path: string; body: string; jsonLd?: object }) {
  const url = `${SITE_URL}${opts.path}`;
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(opts.title)}"><meta property="og:description" content="${esc(opts.description)}">
<meta property="og:url" content="${url}"><meta property="og:type" content="website">
<meta property="og:image" content="${SITE_URL}/img/feature-graphic.png"><meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#2F6B5E">
<link rel="icon" href="${BASE}/favicon.png">
${opts.jsonLd ? `<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>` : ''}
<style>${STYLE}</style>
</head><body><div class="wrap">
<header><a class="brand" href="${BASE}/"><img src="${BASE}/favicon.png" alt="">SubTrack</a>
<nav><a class="hide-sm" href="${BASE}/#features">Features</a><a href="${BASE}/cancel/">How to cancel</a><a href="${APP}">Open app</a></nav></header>
${opts.body}
<footer><span>© ${YEAR} SubTrack · <a href="mailto:${EMAIL}">${EMAIL}</a></span>
<span><a href="${BASE}/privacy.html">Privacy</a> · <a href="${BASE}/cancel/">Cancellation guides</a> · <a href="${APP}">Web app</a></span></footer>
</div></body></html>`;
}

const playButton = (label = 'Get it on Google Play') =>
  PLAY_URL ? `<a class="btn primary" href="${PLAY_URL}">${label}</a>` : `<span class="btn primary soon" title="Launching soon">Coming soon to Google Play</span>`;

// ---------- Landing ----------
const features = [
  ['A reminder before every renewal', 'Pick how many days ahead. It pops up with the price and a link to cancel, so free trials and annual renewals never catch you out.'],
  ['One honest monthly total', 'Weekly, monthly, yearly and in any currency, converted to yours. See what you really spend per month and per year.'],
  ['Find what to cancel', 'A 30-second monthly check-in flags what you don’t use. Price rises and cheaper annual plans show up automatically.'],
  ['Budgets and insights', 'Set a monthly limit overall or per category. Charts show where the money goes and what’s coming next.'],
  ['Shared and family plans', 'Split the cost, see who owes you, and send a friendly reminder. Totals can count only your share.'],
  ['Private by design', 'No bank login and no account needed. Your data stays on your device, with optional sync to the web app.'],
];

const landing = page({
  title: 'SubTrack: subscription tracker with renewal reminders (no bank login)',
  description: 'Track every subscription, get a reminder before each renewal and find what to cancel. No bank login, no subscription. Free on Android and the web.',
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SubTrack',
    operatingSystem: 'Android, Web',
    applicationCategory: 'FinanceApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  },
  body: `
<div class="hero">
  <div>
    <h1>Every subscription.<br>No bank login.</h1>
    <p class="lead">SubTrack keeps all your subscriptions in one place, reminds you before each renewal, and shows you what to cancel. Simple, private, and free.</p>
    <div class="ctas">${playButton()}<a class="btn" href="${APP}">Use it in your browser</a></div>
    <p class="muted" style="font-size:14px;margin-top:14px">No account. No bank connection. No subscription to track your subscriptions.</p>
  </div>
  <img src="${BASE}/img/02-reminders.png" alt="SubTrack showing a renewal reminder and the monthly total" width="540" height="960">
</div>

<section id="features">
  <h2>Everything you need, nothing you don’t</h2>
  <p class="muted">Built for people who want to stop paying for things they forgot about.</p>
  <div class="grid">${features.map(([h, p]) => `<div class="card"><h3>${h}</h3><p class="muted" style="margin:0">${p}</p></div>`).join('')}</div>
  <div class="shots" style="margin-top:32px">${['01-total', '03-save', '04-shared', '05-calendar', '06-year'].map((f) => `<img src="${BASE}/img/${f}.png" alt="" loading="lazy" width="220" height="391">`).join('')}</div>
</section>

<section id="pricing">
  <h2>Free, with one small ad</h2>
  <p class="muted">Upgrade once if you like it. No weekly plans, no auto-renewing “premium”.</p>
  <div class="price">
    <div class="card"><h3>Free</h3><b>$0</b><p class="muted">Unlimited subscriptions, reminders, insights, budgets, shared plans, CSV import and export, and the web app. One small banner ad.</p></div>
    <div class="card" style="border-color:var(--accent)"><h3>SubTrack Plus</h3><b>One payment</b><p class="muted">No ads, the renewal calendar, your year in review, colour themes and home-screen widget styles. Yours for good.</p></div>
  </div>
</section>

<section id="cancel">
  <h2>Need to cancel something?</h2>
  <p class="muted">Step-by-step guides with the direct link to each service’s account page.</p>
  <div class="svc">${PRESETS.slice(0, 12).map((p) => `<a href="${BASE}/cancel/${slug(p.name)}/">${logo(p)}<span>Cancel ${esc(p.name)}</span></a>`).join('')}</div>
  <p style="margin-top:18px"><a href="${BASE}/cancel/">See all ${PRESETS.length} cancellation guides →</a></p>
</section>

<section id="faq">
  <h2>Questions</h2>
  <details><summary>Does SubTrack connect to my bank?</summary><p class="muted">No. You add subscriptions yourself (or pick from 45 popular services, or import a CSV), so there’s nothing to link and nothing to leak.</p></details>
  <details><summary>Can it cancel subscriptions for me?</summary><p class="muted">Each subscription has a direct link to the service’s account page, and SubTrack reminds you before it renews so you can cancel in time.</p></details>
  <details><summary>Does it work on iPhone?</summary><p class="muted">The web app works in any browser, including Safari on iPhone. A native iOS app may follow.</p></details>
  <details><summary>Where is my data stored?</summary><p class="muted">On your device. If you choose to sign in, it also syncs to your private account so you can use the web app. See the <a href="${BASE}/privacy.html">privacy policy</a>.</p></details>
</section>
`,
});

// ---------- Cancel guides ----------
function steps(p: ServicePreset): string {
  if (p.manageUrl === APPLE_SUBS) {
    return `<ol>
<li>On your iPhone or iPad, open <b>Settings</b> and tap your name.</li>
<li>Tap <b>Subscriptions</b>.</li>
<li>Choose <b>${esc(p.name)}</b> and tap <b>Cancel Subscription</b>, then confirm.</li>
<li>On a Mac or PC, you can also <a href="${p.manageUrl}" rel="nofollow noopener">manage Apple subscriptions online</a>.</li>
</ol>`;
  }
  if (p.manageUrl === PLAY_SUBS) {
    return `<ol>
<li>Open the <b>Google Play Store</b> app and tap your profile picture.</li>
<li>Tap <b>Payments &amp; subscriptions</b>, then <b>Subscriptions</b>.</li>
<li>Pick the subscription and tap <b>Cancel subscription</b>, then follow the prompts.</li>
<li>Or open <a href="${p.manageUrl}" rel="nofollow noopener">Google Play subscriptions</a> in a browser.</li>
</ol>`;
  }
  return `<ol>
<li>Open your <a href="${p.manageUrl}" rel="nofollow noopener">${esc(p.name)} account page</a> and sign in.</li>
<li>Look for <b>Membership</b>, <b>Plan</b>, <b>Subscription</b> or <b>Billing</b>.</li>
<li>Choose <b>Cancel</b> (sometimes called <i>turn off auto-renew</i> or <i>end membership</i>) and confirm. Services often show an offer first; keep going if you still want to cancel.</li>
<li>Check your email for a cancellation confirmation and keep it, along with the date your access ends.</li>
</ol>`;
}

const storeNote = `<h2>Signed up through Google Play or Apple?</h2>
<p>If you pay through an app store, cancel it there instead:</p>
<ul>
<li><b>Android:</b> Play Store → profile picture → Payments &amp; subscriptions → Subscriptions → Cancel. <a href="${PLAY_SUBS}" rel="nofollow noopener">Open Google Play subscriptions</a>.</li>
<li><b>iPhone:</b> Settings → your name → Subscriptions → Cancel. <a href="${APPLE_SUBS}" rel="nofollow noopener">Open Apple subscriptions</a>.</li>
</ul>`;

function cancelPage(p: ServicePreset): string {
  const s = slug(p.name);
  const related = PRESETS.filter((x) => x.categoryId === p.categoryId && x.name !== p.name).slice(0, 6);
  const store = p.manageUrl === APPLE_SUBS || p.manageUrl === PLAY_SUBS;
  const title = `How to cancel ${p.name} (and avoid the next charge)`;
  return page({
    title: `${title} | SubTrack`,
    description: `Step-by-step: cancel ${p.name} in a couple of minutes, with the direct link to your account page and tips to make sure you’re not charged again.`,
    path: `/cancel/${s}/`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: `How to cancel ${p.name}`,
      step: store
        ? [{ '@type': 'HowToStep', text: `Open your ${p.manageUrl === APPLE_SUBS ? 'Apple' : 'Google Play'} subscriptions and cancel ${p.name}.`, url: p.manageUrl }]
        : [
            { '@type': 'HowToStep', text: `Open your ${p.name} account page and sign in.`, url: p.manageUrl },
            { '@type': 'HowToStep', text: 'Find Membership, Plan, Subscription or Billing.' },
            { '@type': 'HowToStep', text: 'Choose Cancel and confirm.' },
            { '@type': 'HowToStep', text: 'Keep the confirmation email and note when access ends.' },
          ],
    },
    body: `<article>
<div class="crumbs"><a href="${BASE}/">SubTrack</a> › <a href="${BASE}/cancel/">How to cancel</a> › ${esc(p.name)}</div>
<div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">${logo(p, 56)}<span class="muted">${esc(catName(p.categoryId))}</span></div>
<h1>How to cancel ${esc(p.name)}</h1>
<p class="lead">Cancelling ${esc(p.name)} takes a couple of minutes. Here’s how, plus how to make sure the next payment doesn’t go through.</p>
<p><a class="btn primary" href="${p.manageUrl}" rel="nofollow noopener">Open ${esc(p.name)} account settings ↗</a></p>
<h2>Steps</h2>
${steps(p)}
${store ? '' : storeNote}
<h2>Before you cancel</h2>
<ul>
<li><b>Cancel at least a day before your renewal date.</b> Most services charge at the start of the new period.</li>
<li><b>You usually keep access</b> until the end of the period you’ve paid for, so cancelling early doesn’t lose you anything.</li>
<li><b>On a family or shared plan?</b> Let the others know; cancelling usually ends their access too.</li>
<li><b>Only pausing?</b> Some services let you pause or switch to a cheaper plan on the same page.</li>
</ul>
<div class="callout">
<h3>Never miss a renewal again</h3>
<p style="margin:6px 0 14px">SubTrack reminds you before ${esc(p.name)} and your other subscriptions renew, so you can cancel in time. Free, with no bank login.</p>
<div class="ctas" style="margin-top:0">${playButton()}<a class="btn" href="${APP}">Try it in your browser</a></div>
</div>
${related.length ? `<h2>Related guides</h2><div class="svc">${related.map((r) => `<a href="${BASE}/cancel/${slug(r.name)}/">${logo(r)}<span>Cancel ${esc(r.name)}</span></a>`).join('')}</div>` : ''}
<p class="muted" style="font-size:13px;margin-top:36px">SubTrack isn’t affiliated with ${esc(p.name)}. Account pages change from time to time; if a link has moved, look for “Account” or “Billing” in the service’s menu. Brand names and logos belong to their owners.</p>
</article>`,
  });
}

const index = page({
  title: 'How to cancel any subscription: step-by-step guides | SubTrack',
  description: `Step-by-step guides to cancel ${PRESETS.length} popular subscriptions, from Netflix and Spotify to ChatGPT and Xbox Game Pass, with direct links to each account page.`,
  path: '/cancel/',
  body: `<article style="max-width:none">
<h1>How to cancel a subscription</h1>
<p class="lead">Pick a service for step-by-step instructions and the direct link to its account page.</p>
${DEFAULT_CATEGORIES.map((c) => {
  const list = PRESETS.filter((p) => p.categoryId === c.id);
  return list.length
    ? `<h2 style="margin-top:36px">${esc(c.name)}</h2><div class="svc">${list.map((p) => `<a href="${BASE}/cancel/${slug(p.name)}/">${logo(p)}<span>${esc(p.name)}</span></a>`).join('')}</div>`
    : '';
}).join('')}
${storeNote}
</article>`,
});

// ---------- Write ----------
const write = (rel: string, html: string) => {
  const file = join(OUT, rel);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, html);
};

write('index.html', landing);
write('cancel/index.html', index);
for (const p of PRESETS) write(`cancel/${slug(p.name)}/index.html`, cancelPage(p));

mkdirSync(join(OUT, 'img'), { recursive: true });
for (const f of readdirSync('assets/store')) if (f.endsWith('.png')) copyFileSync(join('assets/store', f), join(OUT, 'img', f));
copyFileSync('assets/favicon.png', join(OUT, 'favicon.png'));

const urls = ['/', '/cancel/', ...PRESETS.map((p) => `/cancel/${slug(p.name)}/`), '/privacy.html'];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`Site: landing + ${PRESETS.length} cancel guides + sitemap → ${OUT}`);
