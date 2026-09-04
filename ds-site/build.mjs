#!/usr/bin/env node
/*
 * Builds the public design-system site served at bma-design-system.mih.co.th
 * into `dist-ds/`.
 *
 *   npm run ds:build
 *
 * Output (4 files + vendor):
 *   dist-ds/index.html       token browser  — every token with a LIVE swatch
 *   dist-ds/reference.html   design.md + LIVE component preview (iframe)
 *   dist-ds/tokens.css       verbatim copy of src/styles/tokens.css
 *   dist-ds/design.md        verbatim copy of design.md
 *   dist-ds/vendor/marked.esm.js
 *
 * Why this exists: the site that was live before this script was hand-published
 * and had no source in any repo, so it drifted (stale tokens.css, no component
 * preview, `*-rgb` swatches rendering blank). Now it is generated from the two
 * files that ARE the source of truth in this repo — `src/styles/tokens.css`
 * (mirror of @mih/design-tokens) and `design.md`.
 *
 * NOTE ON TOKENS: this is the design-system *documentation site*, not app UI.
 * Its own chrome intentionally uses literal values (it must render before /
 * independently of tokens.css so a broken token file is still visible). Every
 * value it *displays* is read live from tokens.css.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'dist-ds');

/* Live PHCIS app that hosts /components/<slug>. Component previews iframe it. */
const LIVE_DEFAULT = 'https://PHCIS.mih.co.th';

/* ────────────────────────────────────────────────────────────
   1. Parse tokens.css
   ──────────────────────────────────────────────────────────── */

/**
 * Collect every custom property declared on the base `:root` block.
 * Brand-scoped (`[data-brand="…"]`) and dark (`[data-theme="dark"]`) blocks are
 * skipped on purpose — they redefine the SAME names, and the browser resolves
 * the active value live, which is the whole point of the swatches.
 */
function parseTokens(css) {
  const tokens = new Map(); /* name → { v, c } — last declaration wins */

  /* Hand-rolled scanner rather than one big regex: tokens.css documents itself
     with comments that contain braces (`--brand-p{50…900}`), which desyncs any
     `\{([^{}]*)\}` block match and silently drops ~80 % of the file. */
  const stack = [];           /* open selectors, outermost first */
  let pendingSelector = '';
  let inComment = false;

  for (const rawLine of css.split('\n')) {
    /* 1. strip comments, remembering the last one on the line — that is the
          token's description in this file's house style. */
    let code = '';
    let comment = '';
    for (let i = 0; i < rawLine.length; ) {
      if (inComment) {
        const end = rawLine.indexOf('*/', i);
        if (end === -1) { comment += rawLine.slice(i); break; }
        comment += rawLine.slice(i, end);
        i = end + 2;
        inComment = false;
      } else {
        const start = rawLine.indexOf('/*', i);
        if (start === -1) { code += rawLine.slice(i); break; }
        code += rawLine.slice(i, start);
        i = start + 2;
        inComment = true;
        comment = '';
      }
    }
    comment = comment.trim();

    /* Put the description back as a normalised trailing comment so the block
       body keeps declaration ↔ description adjacency. */
    /* Braces inside the prose (`--brand-p{50…900}`) would re-enter the brace
       walker below and desync it — that is the bug this scanner exists for. */
    if (comment) code += ' /*' + comment.replace(/[{}]/g, '') + '*/';

    /* 2. walk braces so we always know which selector we are inside, buffering
          each block's body — declarations wrap across lines in this file, so
          they cannot be matched line by line. */
    for (const part of code.split(/([{}])/)) {
      if (part === '{') {
        /* A selector never contains `;` or a comment — anything before one is
           the tail of the previous declaration / the section banner above it. */
        const sel = pendingSelector
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          .split(';').pop()
          .trim().split('\n').pop()
          .trim().replace(/,$/, '');
        stack.push({ sel, body: '' });
        pendingSelector = '';
        continue;
      }
      if (part === '}') {
        const done = stack.pop();
        /* Only the top-level `:root` block is the canonical token list. Brand
           and dark blocks redefine the same names — the browser resolves those
           live, which is exactly what the swatches show. */
        if (done && stack.length === 0) {
          const isRoot = done.sel === ':root';
          const declRe = /--([\w-]+)\s*:\s*([^;]+);[ \t]*(?:\/\*(.*?)\*\/)?/g;
          let m;
          while ((m = declRe.exec(done.body)) !== null) {
            const entry = {
              v: m[2].trim().replace(/\s+/g, ' '),
              c: (m[3] || '').trim(),
              s: isRoot ? '' : done.sel,
            };
            const prev = tokens.get(m[1]);
            if (isRoot) {
              tokens.set(m[1], { ...entry, c: entry.c || (prev && prev.c) || '' });
            } else if (!prev) {
              /* Scoped-only token (e.g. a dark-mode-only alias). Keep it in the
                 catalogue — it exists — but remember it resolves to nothing
                 until that scope is active, so the swatch is honestly blank. */
              tokens.set(m[1], entry);
            }
          }
        }
        pendingSelector = '';
        continue;
      }
      if (!stack.length) pendingSelector += part;
      else stack[stack.length - 1].body += part + '\n';
    }
  }
  return tokens;
}

/** Brand modes actually published in tokens.css (plus the implicit default). */
function parseBrandModes(css) {
  const found = new Set(['default']);
  for (const m of css.matchAll(/\[data-brand="([\w-]+)"\]/g)) found.add(m[1]);
  return [...found];
}

const GROUP_ORDER = [
  'brand', 'color', 'surface', 'text', 'border', 'icon',
  'shadow', 'dim', 'type', 'motion', 'background', 'mobile', 'misc',
];

const GROUP_LABEL = {
  brand: 'Brand primitives',
  color: 'Color primitives',
  surface: 'Surface',
  text: 'Text',
  border: 'Border',
  icon: 'Icon',
  shadow: 'Shadow & effects',
  dim: 'Dimension',
  type: 'Typography',
  motion: 'Motion',
  background: 'Background',
  mobile: 'Mobile overlay',
  misc: 'Other',
};

function groupOf(name) {
  if (name.startsWith('mobile-')) return 'mobile';
  if (name.startsWith('brand-')) return 'brand';
  if (name.startsWith('surface-')) return 'surface';
  if (name.startsWith('text-')) return 'text';
  if (name.startsWith('border-')) return 'border';
  if (name.startsWith('icon-')) return 'icon';
  if (name.startsWith('background-')) return 'background';
  if (name.startsWith('dim-')) return 'dim';
  if (name.startsWith('type-')) return 'type';
  if (name.startsWith('motion-')) return 'motion';
  if (name.startsWith('shadow-') || /^PrimaryShadow/i.test(name)) return 'shadow';
  if (name.startsWith('color-') || name.startsWith('focus-ring-') || name.startsWith('gradient-')) return 'color';
  return 'misc';
}

/* ────────────────────────────────────────────────────────────
   2. index.html — token browser
   ──────────────────────────────────────────────────────────── */

const SHELL_CSS = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:'Sarabun','Inter','Noto Sans Thai',system-ui,sans-serif;
  background:var(--page-bg);color:var(--page-fg);-webkit-font-smoothing:antialiased}
:root{--page-bg:#F7F9F9;--page-fg:#14312A;--panel:#FFFFFF;--line:#E3E9E8;--muted:#5C6B68;
  --accent:var(--brand-p700,#007549);--accent-soft:var(--brand-p100,#E2F3EB)}
body[data-mode="dark"]{--page-bg:#0C1512;--page-fg:#E8F1EE;--panel:#141F1B;--line:#243530;--muted:#93A6A1;
  --accent:var(--brand-p400,#6AD6A5);--accent-soft:#182A24}
a{color:var(--accent)}
header.top{position:sticky;top:0;z-index:20;background:var(--panel);border-bottom:1px solid var(--line);
  padding:.75rem 1.25rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap}
.brandmark{display:flex;align-items:center;gap:.6rem;font-weight:700;letter-spacing:-.01em}
.dot{width:1.6rem;height:1.6rem;border-radius:.5rem;background:linear-gradient(135deg,var(--brand-p600,#08A768),var(--brand-p800,#004C31))}
.pill{font:600 .7rem/1 ui-monospace,monospace;padding:.35rem .55rem;border-radius:999px;background:var(--accent-soft);color:var(--accent)}
nav.tabs{display:flex;gap:.25rem;margin-left:auto;flex-wrap:wrap}
nav.tabs a{padding:.4rem .7rem;border-radius:.5rem;text-decoration:none;color:var(--muted);font-size:.85rem;font-weight:600}
nav.tabs a.on{background:var(--accent-soft);color:var(--accent)}
select,input,button.ghost{font:inherit;font-size:.85rem;padding:.4rem .6rem;border:1px solid var(--line);
  border-radius:.5rem;background:var(--panel);color:var(--page-fg)}
button.ghost{cursor:pointer}
main{max-width:1200px;margin:0 auto;padding:1.5rem 1.25rem 5rem}
.hero{padding:1.5rem 0 1rem}
.hero h1{margin:0 0 .35rem;font-size:1.9rem;letter-spacing:-.02em}
.hero p{margin:0;color:var(--muted);max-width:70ch;line-height:1.6}
.stats{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:.75rem;padding:.6rem .9rem}
.stat b{display:block;font-size:1.25rem}
.stat span{font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
section h2{font-size:1.05rem;margin:2.25rem 0 .25rem;scroll-margin-top:5rem}
section .sub{color:var(--muted);font-size:.8rem;margin:0 0 .75rem}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.6rem}
.tok{background:var(--panel);border:1px solid var(--line);border-radius:.7rem;padding:.6rem;cursor:pointer;
  display:flex;gap:.6rem;align-items:center;text-align:left;width:100%;color:inherit;font:inherit}
.tok:hover{border-color:var(--accent)}
.sw{width:2.4rem;height:2.4rem;border-radius:.5rem;border:1px solid var(--line);flex:none;overflow:hidden;
  background-image:linear-gradient(45deg,#0001 25%,transparent 25%,transparent 75%,#0001 75%),
  linear-gradient(45deg,#0001 25%,transparent 25%,transparent 75%,#0001 75%);background-size:10px 10px;background-position:0 0,5px 5px}
.sw i{display:block;width:100%;height:100%}
.tok .meta{min-width:0;flex:1}
.tok code{display:block;font-size:.72rem;font-family:ui-monospace,monospace;word-break:break-all;line-height:1.3}
.tok small{display:block;color:var(--muted);font-size:.68rem;margin-top:.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tok .resolved{font-family:ui-monospace,monospace;color:var(--page-fg);opacity:.75}
.chip{font:600 .72rem/1.25 ui-monospace,monospace;background:var(--accent-soft);color:var(--accent);
  padding:.5rem .55rem;border-radius:.45rem;flex:none;min-width:3.4rem;max-width:6.5rem;text-align:center;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.toast{position:fixed;bottom:1.25rem;left:50%;transform:translateX(-50%) translateY(2rem);opacity:0;
  background:var(--page-fg);color:var(--page-bg);padding:.55rem .9rem;border-radius:999px;font-size:.8rem;
  transition:.2s;pointer-events:none;z-index:50}
.toast.on{opacity:1;transform:translateX(-50%)}
footer{color:var(--muted);font-size:.75rem;text-align:center;padding:2rem 1rem}
.swatchrow{display:flex;gap:.35rem;flex-wrap:wrap;margin:.5rem 0 0}
.swatchrow div{flex:1 1 4rem;height:3rem;border-radius:.45rem;border:1px solid var(--line);position:relative}
.swatchrow div span{position:absolute;bottom:.15rem;left:.3rem;font:600 .6rem ui-monospace,monospace;color:#fff;mix-blend-mode:difference}
`;

/* Shared runtime: decides how a token previews. This is THE fix for
   "สี token แสดง preview สีที่ถูกต้อง" — the old site trusted a build-time
   `kind` flag, so `--*-rgb` (a bare `106 214 165` triplet, only valid inside
   `rgb()`) was painted as `background: var(--x)` and rendered blank. */
const CLASSIFY_JS = `
function resolveVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue('--'+name).trim();
}
/* → { kind:'color', css, label } | { kind:'value', label } */
function classifyToken(name, resolved){
  const v = (resolved||'').trim();
  if(!v) return {kind:'value', label:'—'};
  /* space- or comma-separated RGB triplet (…-rgb tokens) — only a color
     once wrapped in rgb(). Alpha variants keep their own tokens. */
  if(/^\\d{1,3}[ ,]+\\d{1,3}[ ,]+\\d{1,3}$/.test(v)){
    const css='rgb('+v.replace(/,/g,' ')+')';
    return {kind:'color', css:css, label:css};
  }
  if(/gradient\\(/.test(v)) return {kind:'color', css:v, label:'gradient'};
  if(window.CSS && CSS.supports && CSS.supports('color', v)) return {kind:'color', css:v, label:v};
  return {kind:'value', label:v};
}
`;

function buildIndexHtml({ tokens, brands, sha }) {
  const list = [...tokens.entries()].map(([n, t]) => ({ n, v: t.v, c: t.c, s: t.s || '', g: groupOf(n) }));
  const groupsPresent = GROUP_ORDER.filter((g) => list.some((t) => t.g === g));
  const brandOptions = brands
    .map((b) => `<option value="${b}">${b}</option>`)
    .join('');
  const brandRamp = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
    .filter((s) => tokens.has('brand-p' + s))
    .map((s) => `<div style="background:var(--brand-p${s})"><span>${s}</span></div>`)
    .join('');

  return `<!doctype html>
<html lang="en" data-brand="default">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>MIH Design System — Tokens</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%23007549'/><path d='M9 22V10h3l4 6 4-6h3v12h-3v-7l-4 6-4-6v7z' fill='white'/></svg>">
<link rel="stylesheet" href="./tokens.css">
<style>${SHELL_CSS}</style>
</head>
<body data-mode="light">
<header class="top">
  <div class="brandmark"><span class="dot"></span> MIH Design System <span class="pill">${sha}</span></div>
  <label style="display:flex;gap:.4rem;align-items:center;font-size:.8rem;color:var(--muted)">Brand
    <select id="brandSel">${brandOptions}</select>
  </label>
  <button class="ghost" id="modeBtn" title="Toggle dark mode">Dark</button>
  <nav class="tabs">
    <a href="./index.html" class="on">Tokens</a>
    <a href="./reference.html">Reference + Preview</a>
    <a href="./tokens.css">tokens.css</a>
    <a href="https://github.com/namonlims/mih-design">GitHub</a>
  </nav>
</header>
<main>
<div class="hero">
  <h1>MIH PHCIS Design Tokens</h1>
  <p>ทุกค่าด้านล่าง browser resolve สดจาก <code>tokens.css</code> — สลับ brand หรือ dark mode
  แล้ว swatch จะเปลี่ยนตามที่แอปเรนเดอร์จริง กดที่ token เพื่อ copy <code>var()</code>
  ส่วน component preview อยู่ที่แท็บ <a href="./reference.html">Reference + Preview</a></p>
  <div class="swatchrow">${brandRamp}</div>
  <div class="stats">
    <div class="stat"><b>${list.length}</b><span>tokens</span></div>
    <div class="stat"><b>${brands.length}</b><span>brand modes</span></div>
    <div class="stat"><b>${groupsPresent.length}</b><span>groups</span></div>
    <div class="stat"><b id="colorCount">—</b><span>color tokens</span></div>
  </div>
  <p style="margin-top:1rem"><input id="q" placeholder="filter tokens, e.g. surface-brand, radius, danger" style="width:min(420px,100%)"></p>
</div>
<div id="sections"></div>
<script>
const TOKENS=${JSON.stringify(list)};
const LABEL=${JSON.stringify(GROUP_LABEL)};
const GROUPS=${JSON.stringify(groupsPresent)};
${CLASSIFY_JS}
const wrap=document.getElementById('sections'), q=document.getElementById('q');
let colorCount=0;
function card(t){
  const el=document.createElement('button');
  el.className='tok';el.type='button';el.onclick=()=>copyTok(t.n);
  const resolved=resolveVar(t.n);
  const info=classifyToken(t.n,resolved);
  if(info.kind==='color'){
    colorCount++;
    el.innerHTML='<span class="sw"><i></i></span>';
    el.querySelector('i').style.background=info.css;
  }else{
    el.innerHTML='<span class="chip"></span>';
    el.querySelector('.chip').textContent=info.label;
  }
  const meta=document.createElement('span');
  meta.className='meta';
  const code=document.createElement('code');code.textContent='--'+t.n;
  const small=document.createElement('small');
  small.className=info.kind==='color'?'resolved':'';
  /* A token declared only inside a scope (dark-only alias) resolves to nothing
     until that scope is active — say so instead of showing an empty chip. */
  const scoped=t.s&&info.label==='—'?'only under '+t.s:'';
  small.textContent=scoped||t.c||info.label;
  small.title=(t.c?t.c+'  ·  ':'')+(t.s?t.s+'  ·  ':'')+info.label;
  meta.appendChild(code);meta.appendChild(small);
  el.appendChild(meta);
  el.title='--'+t.n+'  =  '+info.label;
  return el;
}
function render(filter){
  wrap.textContent='';colorCount=0;
  const f=(filter||'').trim().toLowerCase();
  for(const g of GROUPS){
    const items=TOKENS.filter(t=>t.g===g && (!f || t.n.toLowerCase().includes(f) || (t.c||'').toLowerCase().includes(f)));
    if(!items.length) continue;
    const sec=document.createElement('section');
    sec.innerHTML='<h2 id="g-'+g+'">'+(LABEL[g]||g)+'</h2><p class="sub">'+items.length+' tokens</p>';
    const grid=document.createElement('div');grid.className='grid';
    items.forEach(t=>grid.appendChild(card(t)));
    sec.appendChild(grid);wrap.appendChild(sec);
  }
  if(!wrap.children.length) wrap.innerHTML='<p style="color:var(--muted)">No token matches that filter.</p>';
  /* The stat is a property of the token set, not of the current filter — only
     the unfiltered pass may set it, or it reads as "colours disappeared". */
  if(!f) document.getElementById('colorCount').textContent=colorCount;
}
q.addEventListener('input',()=>render(q.value));
/* Re-resolve on BOTH brand and mode change — the old site only listened for
   brand, so every value shown went stale the moment you toggled dark. */
window.addEventListener('mih:brand',()=>render(q.value));
window.addEventListener('mih:mode',()=>render(q.value));
render('');
</script></main>
<div class="toast" id="toast"></div>
<footer>Generated from <code>src/styles/tokens.css</code> · <span id="sha">${sha}</span> &middot; bma-design-system.mih.co.th</footer>
<script>
const root=document.documentElement, body=document.body;
const brandSel=document.getElementById('brandSel'), modeBtn=document.getElementById('modeBtn');
const savedBrand=localStorage.getItem('mih.brand')||'default';
const savedMode=localStorage.getItem('mih.mode')||'light';
function applyMode(m){body.dataset.mode=m;root.dataset.theme=m;root.dataset.mobileTheme=m;
  modeBtn.textContent=m==='dark'?'Light':'Dark';localStorage.setItem('mih.mode',m);
  window.dispatchEvent(new Event('mih:mode'))}
function applyBrand(b){root.dataset.brand=b;brandSel.value=b;localStorage.setItem('mih.brand',b);
  window.dispatchEvent(new Event('mih:brand'))}
applyBrand(savedBrand);applyMode(savedMode);
brandSel.onchange=()=>applyBrand(brandSel.value);
modeBtn.onclick=()=>applyMode(body.dataset.mode==='dark'?'light':'dark');
const toast=document.getElementById('toast');let toastT;
window.copyTok=(name)=>{navigator.clipboard.writeText('var(--'+name+')').then(()=>{
  toast.textContent='copied  var(--'+name+')';toast.classList.add('on');
  clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('on'),1400)})};
</script>
</body></html>
`;
}

/* ────────────────────────────────────────────────────────────
   3. reference.html — design.md + live component preview
   ──────────────────────────────────────────────────────────── */

/**
 * `docs/design-system.html` is the in-repo browser that already knows how to
 * map every design.md section to a Components-Library slug and iframe it.
 * The public site gets the same page, re-pointed at deployable paths.
 * Each replacement is asserted so a rename in the source breaks the build
 * loudly instead of shipping a half-wired page.
 */
function buildReferenceHtml(src) {
  const edits = [
    /* marked from the CDN → vendored copy (site must work behind a firewall) */
    [`import { marked } from 'https://esm.sh/marked@12';`,
     `import { marked } from './vendor/marked.esm.js';`],

    /* design.md sits next to the page once published, not one level up */
    [`fetch('../design.md', { cache: 'no-cache' })`,
     `fetch('./design.md', { cache: 'no-cache' })`],
    [`<a href="../design.md" target="_blank" rel="noopener">↗ raw design.md</a>`,
     `<a href="./design.md" target="_blank" rel="noopener">↗ raw design.md</a>\n        <a href="./index.html">↗ Tokens</a>`],

    /* live preview target: the deployed PHCIS app, not someone's laptop */
    [`<input id="server-url" type="text" value="http://127.0.0.1:3000" />`,
     `<input id="server-url" type="text" value="${LIVE_DEFAULT}" />`],
    [`const serverRoot = (serverInput.value || 'http://127.0.0.1:3000').replace(/\\/+$/, '');`,
     `const serverRoot = (serverInput.value || '${LIVE_DEFAULT}').replace(/\\/+$/, '');`],

    /* the "how to fix it" hint has to name the real host now */
    [`<p class="error">เปิดผ่าน Vite (<code>http://127.0.0.1:3000/docs/design-system.html</code>) ไม่ใช่ file://</p>`,
     `<p class="error">ต้องเปิดผ่าน http(s) ไม่ใช่ <code>file://</code> — <code>${LIVE_DEFAULT.replace('bma-health', 'bma-design-system')}/reference.html</code></p>`],

    /* the placeholder used to talk about Vite */
    [`<div style="font-size:12px;margin-top:8px;">iframe จะโหลด <code>/components/&lt;slug&gt;</code> จาก Vite</div>`,
     `<div style="font-size:12px;margin-top:8px;">iframe จะโหลด <code>/components/&lt;slug&gt;</code> จาก <code>${LIVE_DEFAULT}</code></div>`],

    /* default to the split view so a preview is visible without a click —
       this is the whole point of the page for a reviewer */
    [`  let currentTab = 'spec';         /* 'spec' | 'live' | 'both' */`,
     `  let currentTab = 'both';         /* 'spec' | 'live' | 'both' */`],
    [`    <div class="panes mode-spec" id="panes">`,
     `    <div class="panes mode-both" id="panes">`],
    [`        <button class="tab-btn active" data-tab="spec" type="button">📖 Spec</button>
        <button class="tab-btn" data-tab="live" type="button">🧩 Live</button>
        <button class="tab-btn" data-tab="both" type="button">⫩ Both</button>`,
     `        <button class="tab-btn" data-tab="spec" type="button">📖 Spec</button>
        <button class="tab-btn" data-tab="live" type="button">🧩 Live</button>
        <button class="tab-btn active" data-tab="both" type="button">⫩ Both</button>`],

    /* Swatches: the in-repo version only handled bare #RRGGBB text. On the
       public site the doc is full of `--token` references whose colour the
       reader cannot picture — resolve those live too. */
    [`  function injectSwatches(root) {
    root.querySelectorAll('code').forEach((c) => {
      const t = c.textContent.trim();
      if (/^#[0-9A-Fa-f]{6}$/.test(t)) {
        const sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.background = t;
        c.parentNode.insertBefore(sw, c);
      }
    });
  }`,
     `  function injectSwatches(root) {
    root.querySelectorAll('code').forEach((c) => {
      const t = c.textContent.trim();
      let css = null;
      if (/^#[0-9A-Fa-f]{3,8}$/.test(t)) {
        css = t;
      } else if (/^--[\\w-]+$/.test(t) || /^var\\(--[\\w-]+\\)$/.test(t)) {
        /* token reference → ask the browser what it resolves to right now,
           under the active [data-brand] + dark mode. */
        const name = t.replace(/^var\\(|\\)$/g, '').replace(/^--/, '');
        const info = classifyToken(name, resolveVar(name));
        if (info.kind === 'color') css = info.css;
      } else if (/^(rgb|rgba|hsl|hsla)\\(/i.test(t) && window.CSS && CSS.supports('color', t)) {
        css = t;
      }
      if (!css) return;
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = css;
      sw.title = t + '  =  ' + css;
      c.parentNode.insertBefore(sw, c);
    });
  }

  /* Re-resolve every swatch when brand / mode flips. */
  window.addEventListener('mih:restyle', () => {
    content.querySelectorAll('span.swatch').forEach((s) => s.remove());
    injectSwatches(content);
  });`],
  ];

  let out = src;
  for (const [from, to] of edits) {
    if (!out.includes(from)) {
      throw new Error(
        'ds-site/build.mjs: marker not found in docs/design-system.html —\n' +
        '  ' + from.split('\n')[0].slice(0, 110) + '\n' +
        'The source page changed; update the edit list before publishing.',
      );
    }
    out = out.split(from).join(to);
  }

  /* tokens.css must load so every var() in the doc/swatches resolves, and the
     brand + dark switchers need somewhere to live. */
  out = out.replace(
    '<title>MIH PHCIS — Design System</title>',
    '<title>MIH Design System — Reference + Preview</title>\n' +
    '<link rel="stylesheet" href="./tokens.css" />',
  );

  /* Brand + dark-mode control, matching index.html\'s storage keys so the two
     pages stay in sync. Injected into the existing server-bar row. */
  const controls = `    <div class="server-bar" style="gap:6px">
      <span>Brand:</span>
      <select id="ds-brand" style="flex:1;font:inherit;font-size:12px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:#fff"></select>
      <button id="ds-mode" type="button" title="สลับค่า token ที่ swatch/preview ใช้ (chrome ของหน้านี้ยังเป็น light เสมอ)">Dark tokens</button>
    </div>
`;
  out = out.replace('    <nav class="toc" id="toc">', controls + '    <nav class="toc" id="toc">');

  const controlScript = `
<script>
/* Brand / dark-mode switcher — same localStorage keys as index.html. */
(function () {
  var BRANDS = ${JSON.stringify(buildReferenceHtml.brands || ['default'])};
  var root = document.documentElement;
  var sel = document.getElementById('ds-brand');
  var btn = document.getElementById('ds-mode');
  sel.innerHTML = BRANDS.map(function (b) { return '<option value="' + b + '">' + b + '</option>'; }).join('');
  function applyBrand(b) {
    root.dataset.brand = b; sel.value = b;
    try { localStorage.setItem('mih.brand', b); } catch (e) {}
    window.dispatchEvent(new Event('mih:restyle'));
  }
  function applyMode(m) {
    document.body.dataset.mode = m; root.dataset.theme = m; root.dataset.mobileTheme = m;
    btn.textContent = m === 'dark' ? 'Light tokens' : 'Dark tokens';
    try { localStorage.setItem('mih.mode', m); } catch (e) {}
    window.dispatchEvent(new Event('mih:restyle'));
  }
  var b = 'default', m = 'light';
  try { b = localStorage.getItem('mih.brand') || 'default'; m = localStorage.getItem('mih.mode') || 'light'; } catch (e) {}
  if (BRANDS.indexOf(b) === -1) b = 'default';
  applyBrand(b); applyMode(m);
  sel.onchange = function () { applyBrand(sel.value); };
  btn.onclick = function () { applyMode(document.body.dataset.mode === 'dark' ? 'light' : 'dark'); };
}());
</script>
`;
  out = out.replace('</body>', controlScript + '</body>');

  /* classifyToken / resolveVar are shared with index.html — the swatch code
     above calls them, so they must exist before the module script runs. */
  out = out.replace('<script type="module">', `<script>${CLASSIFY_JS}</script>\n<script type="module">`);

  return out;
}

/* ────────────────────────────────────────────────────────────
   4. Run
   ──────────────────────────────────────────────────────────── */

const tokensCssPath = join(ROOT, 'src', 'styles', 'tokens.css');
const designMdPath = join(ROOT, 'design.md');
const sourcePagePath = join(ROOT, 'docs', 'design-system.html');

for (const p of [tokensCssPath, designMdPath, sourcePagePath]) {
  if (!existsSync(p)) throw new Error('ds-site/build.mjs: missing input ' + p);
}

const css = readFileSync(tokensCssPath, 'utf8');
const tokens = parseTokens(css);
const brands = parseBrandModes(css);
/* Stamp the build with the commit the tokens came from — the old site said
   "@ main", which never told anyone whether it was current. */
let stamp = 'main';
try {
  stamp = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', 'src/styles/tokens.css', 'design.md'], { encoding: 'utf8' }).trim();
  if (dirty) stamp += '+local';
} catch { /* not a checkout — keep the fallback */ }

buildReferenceHtml.brands = brands;

mkdirSync(join(OUT, 'vendor'), { recursive: true });
copyFileSync(tokensCssPath, join(OUT, 'tokens.css'));
copyFileSync(designMdPath, join(OUT, 'design.md'));
copyFileSync(join(HERE, 'vendor', 'marked.esm.js'), join(OUT, 'vendor', 'marked.esm.js'));

writeFileSync(join(OUT, 'index.html'), buildIndexHtml({ tokens, brands, sha: stamp }));
writeFileSync(join(OUT, 'reference.html'), buildReferenceHtml(readFileSync(sourcePagePath, 'utf8')));

const byGroup = GROUP_ORDER
  .map((g) => [g, [...tokens.keys()].filter((n) => groupOf(n) === g).length])
  .filter(([, n]) => n > 0);

console.log('dist-ds/ built');
console.log('  tokens      ' + tokens.size + '  (' + byGroup.map(([g, n]) => g + ':' + n).join(' ') + ')');
console.log('  brand modes ' + brands.length + '  ' + brands.join(' '));
console.log('  live app    ' + LIVE_DEFAULT + '/components/<slug>?embed=1');
