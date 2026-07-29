#!/usr/bin/env node
/*
  validate-figma-layers.mjs — Gate for the drawing-ui-on-figma skill.

  Reads a Figma `get_metadata` JSON tree and checks layer names against the
  shared naming grammar, cross-checks component names against vibe-code
  (case-insensitive), flags intentional gaps (NEW/*), and reports logic/state
  coverage hints from LOGIC-MATRIX.md.

  Usage:
    node validate-figma-layers.mjs <metadata.json> [--repo <repoRoot>]
    get_metadata … > meta.json && node validate-figma-layers.mjs meta.json
    cat meta.json | node validate-figma-layers.mjs

  Exit code:
    0 — no ERRORs (unnamed default layers)
    1 — ERRORs remain
    2 — usage / parse failure
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
let metaPath = null;
let repoRoot = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo') repoRoot = args[++i];
  else if (args[i] === '-h' || args[i] === '--help') { printHelp(); process.exit(0); }
  else if (!metaPath) metaPath = args[i];
}
if (!repoRoot) repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

function printHelp() {
  console.log(`Usage: node validate-figma-layers.mjs <metadata.json> [--repo <repoRoot>]
       cat meta.json | node validate-figma-layers.mjs

Checks:
  · No default Figma names (Frame 12, Group 3, …)
  · Grammar: Screen/ Section/ data: label: note: img: Item/n Component · State NEW/…
  · Component names match src/components (case-insensitive)
  · NEW/* marks intentional components not yet in code
  · State suffix coverage (Default, Empty, Loading, Error, …)`);
}

function readInput() {
  if (metaPath) return fs.readFileSync(metaPath, 'utf8');
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

const raw = readInput().trim();
if (!raw) {
  console.error('No metadata provided. Pass a JSON file or pipe it on stdin.');
  process.exit(2);
}

let tree;
try {
  tree = JSON.parse(raw);
} catch {
  const m = raw.match(/[[{][\s\S]*[\]}]/);
  if (!m) { console.error('Could not parse metadata as JSON.'); process.exit(2); }
  try { tree = JSON.parse(m[0]); } catch (e) {
    console.error('Could not parse metadata as JSON:', e.message);
    process.exit(2);
  }
}

const nodes = [];
(function walk(n) {
  if (Array.isArray(n)) { n.forEach(walk); return; }
  if (n && typeof n === 'object') {
    if (typeof n.name === 'string') nodes.push({ name: n.name, type: n.type || '' });
    for (const k of Object.keys(n)) if (n[k] && typeof n[k] === 'object') walk(n[k]);
  }
})(tree);

if (!nodes.length) {
  console.error('No named layers found in metadata.');
  process.exit(2);
}

function collectComponents(root) {
  const canonical = new Set();
  const byLower = new Map();

  const add = (name) => {
    canonical.add(name);
    byLower.set(name.toLowerCase(), name);
  };

  const compDir = path.join(root, 'src', 'components');
  if (fs.existsSync(compDir)) {
    (function walkFs(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walkFs(full);
        else if (/^[A-Z][A-Za-z0-9]*\.jsx?$/.test(e.name)) add(e.name.replace(/\.jsx?$/, ''));
      }
    })(compDir);
  }

  const reg = path.join(root, 'src', 'pages', 'components', 'ComponentsLibraryPage.jsx');
  if (fs.existsSync(reg)) {
    const txt = fs.readFileSync(reg, 'utf8');
    for (const m of txt.matchAll(/name:\s*'([A-Z][A-Za-z0-9]+)'/g)) add(m[1]);
  }

  return { canonical, byLower };
}

const { canonical: known, byLower: knownLower } = collectComponents(repoRoot);

const DEFAULT_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Instance|Component|Text|Image|Slice|Union|Subtract|Boolean|Mask)(\s*\d+)?$/i;
const STATE_TOKENS = new Set([
  'default', 'hover', 'focus', 'active', 'pressed', 'selected', 'disabled',
  'loading', 'error', 'empty', 'success', 'open', 'closed', 'expanded', 'collapsed',
  'readonly', 'edit', 'editmode', 'overdue', 'expired', 'due', 'waiting',
]);

const buckets = {
  unnamed: [],
  screen: [],
  section: [],
  data: [],
  label: [],
  note: [],
  img: [],
  item: [],
  newComponent: [],
  componentKnown: [],
  componentUnknown: [],
  other: [],
};

const dataFields = new Set();
const statesFound = new Set();
const screensWithState = new Map();

function parseState(name) {
  const parts = name.split('·').map((s) => s.trim());
  if (parts.length < 2) return null;
  return parts.slice(1).join(' · ');
}

function baseComponentName(name) {
  const beforeState = name.split('·')[0].trim();
  return beforeState.split('/')[0].trim();
}

function resolveKnown(base) {
  if (known.has(base)) return base;
  return knownLower.get(base.toLowerCase()) ?? null;
}

for (const { name } of nodes) {
  const n = name.trim();
  const state = parseState(n);
  if (state) statesFound.add(state.toLowerCase());

  if (DEFAULT_RE.test(n)) { buckets.unnamed.push(n); continue; }
  if (n.startsWith('Screen/')) {
    buckets.screen.push(n);
    if (state) {
      const key = n.split('·')[0].trim();
      if (!screensWithState.has(key)) screensWithState.set(key, new Set());
      screensWithState.get(key).add(state.toLowerCase());
    }
    continue;
  }
  if (n.startsWith('Section/')) { buckets.section.push(n); continue; }
  if (n.startsWith('data:')) { buckets.data.push(n); dataFields.add(n.slice(5).trim()); continue; }
  if (n.startsWith('label:')) { buckets.label.push(n); continue; }
  if (n.startsWith('note:')) { buckets.note.push(n); continue; }
  if (n.startsWith('img:')) { buckets.img.push(n); continue; }
  if (n.startsWith('NEW/')) { buckets.newComponent.push(n); continue; }
  if (/^[A-Za-z][\w ]*\/\d+$/.test(n)) { buckets.item.push(n); continue; }

  const base = baseComponentName(n);
  if (/^[A-Z][A-Za-z0-9]+$/.test(base)) {
    const match = resolveKnown(base);
    if (match) buckets.componentKnown.push(n);
    else buckets.componentUnknown.push(n);
    continue;
  }

  buckets.other.push(n);
}

const uniq = (a) => [...new Set(a)].sort();
const total = nodes.length;
const named = total - buckets.unnamed.length;

const line = (s = '') => console.log(s);
line('── Figma layer validation (drawing-ui-on-figma) ──');
line(`repo: ${repoRoot}`);
line(`layers: ${total} · named: ${named}/${total} · vibe-code components: ${known.size}`);
line();

function section(title, items, { level = 'ok' } = {}) {
  if (!items.length) return;
  const tag = level === 'error' ? '✗ ERROR' : level === 'warn' ? '! WARN' : '·';
  line(`${tag}  ${title} (${items.length})`);
  for (const it of uniq(items)) line(`      ${it}`);
  line();
}

section('Unnamed / default layers — rename before sign-off', buckets.unnamed, { level: 'error' });
section(
  'PascalCase names with NO vibe-code match — rename, alias case-insensitively, or prefix NEW/',
  buckets.componentUnknown,
  { level: 'warn' },
);
section('Off-grammar names — use Screen/ Section/ data: label: note: img: or Component · State', buckets.other, { level: 'warn' });

section('Screens', buckets.screen);
section('Sections', buckets.section);
section('Matched vibe-code components (case-insensitive)', buckets.componentKnown);
section('Intentional new components (NEW/)', buckets.newComponent);
section('List items (Item/n)', buckets.item);
section('Labels', buckets.label);
section('Logic annotations (note:*)', buckets.note);
section('Images (img:*)', buckets.img);

line('── data:* placeholder fields ──');
if (dataFields.size) for (const f of [...dataFields].sort()) line(`      ${f}`);
else line('      (none)');
line();

line('── state coverage (from " · State" suffixes) ──');
if (statesFound.size) {
  for (const s of [...statesFound].sort()) line(`      ${s}`);
} else {
  line('      ! WARN  no state suffixes found — add frames like `Screen/Foo · Empty` per LOGIC-MATRIX.md');
}
line();

const recommendedStates = ['empty', 'loading', 'error', 'disabled'];
const missingRecommended = recommendedStates.filter((s) => !statesFound.has(s));
const hasInteractive = buckets.componentKnown.length > 0 || buckets.screen.length > 0;

if (hasInteractive && missingRecommended.length) {
  line('── logic matrix hints ──');
  line(`  ! WARN  missing common states: ${missingRecommended.join(', ')}`);
  line('         see .claude/skills/drawing-ui-on-figma/LOGIC-MATRIX.md');
  line();
}

if (screensWithState.size) {
  line('── per-screen states ──');
  for (const [screen, states] of [...screensWithState.entries()].sort()) {
    line(`      ${screen}: ${[...states].sort().join(', ')}`);
  }
  line();
}

const errors = buckets.unnamed.length;
const warns = buckets.componentUnknown.length + buckets.other.length
  + (hasInteractive && missingRecommended.length ? 1 : 0)
  + (statesFound.size === 0 && hasInteractive ? 1 : 0);

line('── summary ──');
line(`  named to grammar: ${named}/${total}`);
line(`  vibe-code matches: ${uniq(buckets.componentKnown).length}`);
line(`  NEW/ components: ${uniq(buckets.newComponent).length}`);
line(`  unknown PascalCase: ${uniq(buckets.componentUnknown).length}`);
line(`  notes: ${uniq(buckets.note).length} · data fields: ${dataFields.size}`);
line(`  states detected: ${statesFound.size}`);
line(`  ERRORs: ${errors} · WARNs: ${warns}`);
line(errors
  ? '\nNot ready — fix ERROR layers, then re-run.'
  : '\nOK — no default layer names. Review WARNs (states, unknown components) before sign-off.');

process.exit(errors ? 1 : 0);
