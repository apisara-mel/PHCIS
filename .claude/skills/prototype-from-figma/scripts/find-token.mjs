#!/usr/bin/env node
/*
  find-token.mjs — Gate 3 reverse token lookup for the prototype-from-figma skill.

  Given a raw value from Figma (hex, rgb(), or a px / unitless dimension), print
  every design token in src/index.css whose RESOLVED value matches — so you alias
  the right token instead of grepping by hand or inlining a literal.

  Usage:
    node find-token.mjs '#C5EDDA'              → color token(s)
    node find-token.mjs 'rgb(197,237,218)'     → same, via rgb
    node find-token.mjs 8px                     → dimension token(s)
    node find-token.mjs 24                      → treated as 24px
    node find-token.mjs '#08A768' 16px 999px   → several at once
    node find-token.mjs '#123456' --repo <root>

  Exit 0 if at least one query matched a token; 1 if a query matched nothing
  (a signal to add the token to design.md + index.css, or that it's a gradient).
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── args ────────────────────────────────────────────────────────────────
const queries = [];
let repoRoot = null;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--repo') repoRoot = argv[++i];
  else if (argv[i] === '-h' || argv[i] === '--help') { help(); process.exit(0); }
  else queries.push(argv[i]);
}
if (!repoRoot) repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
if (!queries.length) { help(); process.exit(2); }

function help() {
  console.log("Usage: node find-token.mjs <hex|rgb()|Npx|N> [more…] [--repo <root>]");
}

const cssPath = path.join(repoRoot, 'src', 'index.css');
if (!fs.existsSync(cssPath)) { console.error(`index.css not found at ${cssPath} (pass --repo).`); process.exit(2); }
const css = fs.readFileSync(cssPath, 'utf8');

// ── parse --name: value; declarations (first definition wins) ───────────
const raw = new Map();
for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  const name = m[1];
  if (!raw.has(name)) raw.set(name, m[2].trim());
}

// resolve var(--x, fallback) chains to a literal
function resolve(value, depth = 0) {
  if (depth > 12 || !value) return value;
  const m = value.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)\s*$/);
  if (!m) return value;
  const [, ref, fallback] = m;
  if (raw.has(ref)) return resolve(raw.get(ref), depth + 1);
  return fallback ? resolve(fallback.trim(), depth + 1) : value;
}

// ── value normalisation ─────────────────────────────────────────────────
const hex = (s) => {
  let h = s.trim().toLowerCase();
  const rgb = h.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  if (h[0] !== '#') { if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(h)) h = '#' + h; else return null; }
  if (/^#[0-9a-f]{3}$/.test(h)) h = '#' + h.slice(1).split('').map((c) => c + c).join('');
  return /^#[0-9a-f]{6}$/.test(h) ? h : null;
};
const dim = (s) => {
  const m = s.trim().match(/^(-?\d*\.?\d+)\s*(px)?$/i);
  return m ? `${parseFloat(m[1])}px` : null;
};
function normalize(s) {
  const h = hex(s); if (h) return { kind: 'color', key: h };
  const d = dim(s); if (d) return { kind: 'dim', key: d };
  return { kind: 'raw', key: s.trim().toLowerCase() };
}

// index every token by its normalised resolved value
const byColor = new Map(); const byDim = new Map();
for (const [name, rawVal] of raw) {
  const resolved = resolve(rawVal);
  const h = hex(resolved); if (h) { (byColor.get(h) || byColor.set(h, []).get(h)).push({ name, rawVal, resolved }); }
  const d = dim(resolved); if (d) { (byDim.get(d) || byDim.set(d, []).get(d)).push({ name, rawVal, resolved }); }
}

// ── run queries ─────────────────────────────────────────────────────────
let anyMiss = false;
for (const q of queries) {
  const { kind, key } = normalize(q);
  console.log(`\n"${q}"  →  ${kind === 'color' ? key : kind === 'dim' ? key : '(unrecognised — pass a hex, rgb(), or px value)'}`);
  const hits = kind === 'color' ? byColor.get(key) : kind === 'dim' ? byDim.get(key) : null;
  if (!hits || !hits.length) {
    anyMiss = true;
    if (kind === 'color') console.log('   ✗ no token with this color — add it to design.md + index.css (or it may be a gradient → inline exception).');
    else if (kind === 'dim') console.log('   ✗ no token with this dimension — add it to design.md + index.css.');
    else console.log('   ✗ not a value find-token understands.');
    continue;
  }
  for (const h of hits) {
    const via = h.rawVal !== h.resolved ? `  (via ${h.rawVal})` : '';
    console.log(`   ✓ var(${h.name}, ${h.resolved})${via}`);
  }
}
console.log();
process.exit(anyMiss ? 1 : 0);
