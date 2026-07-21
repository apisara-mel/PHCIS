#!/usr/bin/env node
/*
  verify-route.mjs — Gate 5 verify harness for the prototype-from-figma skill.

  Loads a route in headless Chrome, fails on console / page errors, optionally
  asserts a selector is present and saves a screenshot to diff against Figma.
  Also guards the dev-server staleness trap (rsync preserves mtimes → Vite serves
  a stale module even though the source is current): pass --stale to detect it
  and get the exact restart command.

  Run it with the project's puppeteer Node (Node 16):
    ~/.local/node16/bin/node verify-route.mjs /components/photo-upload-field
    … verify-route.mjs /telemed --selector 'button[aria-label="วางสาย"]' --shot /tmp/telemed.png
    … verify-route.mjs /telemed --stale 'src/pages/telemed/TelemedConsultPage.jsx::mutedDanger'

  Options:
    --port <n>        dev-server port           (default 3001)
    --host <h>        dev-server host           (default 127.0.0.1)
    --wait <ms>       settle time after load    (default 3000)
    --selector <css>  assert this element exists (repeatable)
    --shot <path>     save a full-page screenshot
    --stale <src::needle>  fail if GET /<src> does not contain <needle> (stale-module guard)

  Env: CHROME_PATH (Chrome binary), PUPPETEER_CORE_DIR (node_modules holding puppeteer-core).
  Exit 0 pass · 1 render/assert error · 3 stale dev server · 2 usage/setup error.
*/

import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

// ── args ────────────────────────────────────────────────────────────────
const o = { port: 3001, host: '127.0.0.1', wait: 3000, selectors: [], shot: null, stale: null, route: null };
const a = process.argv.slice(2);
for (let i = 0; i < a.length; i++) {
  const v = a[i];
  if (v === '--port') o.port = +a[++i];
  else if (v === '--host') o.host = a[++i];
  else if (v === '--wait') o.wait = +a[++i];
  else if (v === '--selector') o.selectors.push(a[++i]);
  else if (v === '--shot') o.shot = a[++i];
  else if (v === '--stale') o.stale = a[++i];
  else if (v === '-h' || v === '--help') { usage(); process.exit(0); }
  else if (!o.route) o.route = v;
}
function usage() { console.log('Usage: node verify-route.mjs <route> [--port n] [--selector css] [--shot path] [--stale src::needle]'); }
if (!o.route) { usage(); process.exit(2); }
if (o.route[0] !== '/') o.route = '/' + o.route;
const base = `http://${o.host}:${o.port}`;

// ── helpers ─────────────────────────────────────────────────────────────
const httpGet = (url) => new Promise((res) => {
  http.get(url, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res({ status: r.statusCode, body: d })); })
    .on('error', () => res({ status: 0, body: '' }));
});

function loadPuppeteer() {
  const dir = process.env.PUPPETEER_CORE_DIR
    || path.join(process.env.HOME || '', 'MIH-PHCIS-local', 'node_modules');
  let entry;
  try { entry = require.resolve('puppeteer-core', { paths: [dir, process.cwd()] }); }
  catch { throw new Error(`puppeteer-core not found. Set PUPPETEER_CORE_DIR to a node_modules that has it (tried ${dir}).`); }
  return import(pathToFileURL(entry).href).then((m) => m.default || m);
}

// ── run ─────────────────────────────────────────────────────────────────
(async () => {
  // 0. server up?
  const ping = await httpGet(base + '/');
  if (ping.status === 0) { console.error(`✗ dev server not reachable at ${base} — start it first.`); process.exit(2); }

  // 1. stale-module guard
  if (o.stale) {
    const [src, needle] = o.stale.split('::');
    if (!src || !needle) { console.error('--stale expects <src::needle>'); process.exit(2); }
    const mod = await httpGet(`${base}/${src.replace(/^\//, '')}`);
    if (!mod.body.includes(needle)) {
      console.error(`✗ STALE dev server: ${base}/${src} does not contain "${needle}".`);
      console.error('  Vite is serving an old compile (rsync preserves mtimes). Restart with a clean cache:');
      console.error('    pkill -f "MIH-PHCIS-local/node_modules/.bin/vite"; pkill -f "MIH-PHCIS-local.*dev.sh"; \\');
      console.error('    rm -rf ~/MIH-PHCIS-local/node_modules/.vite; (cd ~/MIH-PHCIS-local && nohup ./dev.sh >/tmp/dev.log 2>&1 &)');
      process.exit(3);
    }
    console.log(`· served module fresh (${src} contains "${needle}")`);
  }

  const puppeteer = await loadPuppeteer();
  const executablePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  let assertMisses = [];
  try {
    await page.goto(base + o.route, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise((r) => setTimeout(r, o.wait));
    for (const sel of o.selectors) {
      const found = await page.$(sel);
      if (!found) assertMisses.push(sel);
    }
    if (o.shot) { await page.screenshot({ path: o.shot, fullPage: true }); console.log(`· screenshot → ${o.shot}`); }
  } catch (e) {
    errors.push('navigation: ' + e.message);
  }
  await browser.close();

  // filter noise: keep only real crash-class console errors + all pageerrors
  const real = errors.filter((e) => /pageerror|navigation/.test(e)
    || /is not defined|Cannot read|Cannot access|undefined is not|not a function|Unexpected token|Failed to fetch dynamically/.test(e));

  console.log(`\n── verify ${o.route} @ ${base} ──`);
  console.log(`  errors: ${real.length}  ·  assertions: ${o.selectors.length - assertMisses.length}/${o.selectors.length}`);
  real.slice(0, 10).forEach((e) => console.log('   ✗ ' + e));
  assertMisses.forEach((s) => console.log('   ✗ selector not found: ' + s));

  const ok = real.length === 0 && assertMisses.length === 0;
  console.log(ok ? '\n✓ PASS' : '\n✗ FAIL');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('setup error: ' + e.message); process.exit(2); });
