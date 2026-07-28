#!/usr/bin/env node
/*
  validate-layers.mjs — Gate 0 guardrail for the prototype-from-figma skill.

  Reads a Figma `get_metadata` JSON tree and checks every layer name against
  the skill's naming grammar, then cross-checks any component-looking names
  against the components that actually exist in this repo. Prints a coverage
  report and a list of the `data:*` fields that still need mock content (Gate 6).

  Usage:
    node validate-layers.mjs <metadata.json> [--repo <repoRoot>]
    get_metadata … > meta.json && node validate-layers.mjs meta.json
    cat meta.json | node validate-layers.mjs            # metadata on stdin

  Exit code: 0 if no ERRORs (every layer named to the grammar), 1 otherwise.
  This validates NAMES only — whether a name matches the layer's true intent
  still needs a human + the screenshot.
*/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let metaPath = null;
let repoRoot = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--repo') repoRoot = args[++i];
  else if (args[i] === '-h' || args[i] === '--help') { printHelp(); process.exit(0); }
  else if (!metaPath) metaPath = args[i];
}
// skill lives at <repo>/.claude/skills/prototype-from-figma/scripts → repo is 4 up
if (!repoRoot) repoRoot = path.resolve(__dirname, '..', '..', '..', '..');

function printHelp() {
  console.log('Usage: node validate-layers.mjs <metadata.json> [--repo <repoRoot>]  (or pipe metadata on stdin)');
}

// ── read metadata (file or stdin) ───────────────────────────────────────
function readInput() {
  if (metaPath) return fs.readFileSync(metaPath, 'utf8');
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}
const raw = readInput().trim();
if (!raw) { console.error('No metadata provided. Pass a JSON file or pipe it on stdin.'); process.exit(2); }

let tree;
try {
  tree = JSON.parse(raw);
} catch {
  // tolerate MCP wrappers: grab the first {...} or [...] blob
  const m = raw.match(/[[{][\s\S]*[\]}]/);
  if (!m) { console.error('Could not parse metadata as JSON.'); process.exit(2); }
  try { tree = JSON.parse(m[0]); } catch (e) { console.error('Could not parse metadata as JSON:', e.message); process.exit(2); }
}

// ── collect every named node ────────────────────────────────────────────
const nodes = [];
(function walk(n) {
  if (Array.isArray(n)) { n.forEach(walk); return; }
  if (n && typeof n === 'object') {
    if (typeof n.name === 'string') nodes.push({ name: n.name, type: n.type || '' });
    for (const k of Object.keys(n)) if (n[k] && typeof n[k] === 'object') walk(n[k]);
  }
})(tree);

if (!nodes.length) { console.error('No named layers found in metadata.'); process.exit(2); }

// ── known component names from the repo ─────────────────────────────────
function collectComponents(root) {
  const set = new Set();
  const compDir = path.join(root, 'src', 'components');
  if (fs.existsSync(compDir)) {
    (function walkFs(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walkFs(full);
        else if (/^[A-Z][A-Za-z0-9]*\.jsx?$/.test(e.name)) set.add(e.name.replace(/\.jsx?$/, ''));
      }
    })(compDir);
  }
  // registry names in the components library page (name: 'Xxx')
  const reg = path.join(root, 'src', 'pages', 'components', 'ComponentsLibraryPage.jsx');
  if (fs.existsSync(reg)) {
    const txt = fs.readFileSync(reg, 'utf8');
    for (const m of txt.matchAll(/name:\s*'([A-Z][A-Za-z0-9]+)'/g)) set.add(m[1]);
  }
  return set;
}
const known = collectComponents(repoRoot);

// ── classify each layer ─────────────────────────────────────────────────
const DEFAULT_RE = /^(Frame|Group|Rectangle|Ellipse|Vector|Line|Polygon|Star|Instance|Component|Text|Image|Slice|Union|Subtract|Boolean|Mask)(\s*\d+)?$/i;
const PREFIXES = ['Screen/', 'Section/', 'data:', 'label:', 'note:', 'img:'];
const baseName = (s) => s.split('·')[0].trim().split('/')[0].trim(); // strip " · State" and "/index"

const buckets = { unnamed: [], screen: [], section: [], data: [], label: [], note: [], img: [], item: [], componentKnown: [], componentUnknown: [], other: [] };
const dataFields = new Set();

for (const { name } of nodes) {
  const n = name.trim();
  if (DEFAULT_RE.test(n)) { buckets.unnamed.push(n); continue; }
  if (n.startsWith('Screen/')) { buckets.screen.push(n); continue; }
  if (n.startsWith('Section/')) { buckets.section.push(n); continue; }
  if (n.startsWith('data:')) { buckets.data.push(n); dataFields.add(n.slice(5).trim()); continue; }
  if (n.startsWith('label:')) { buckets.label.push(n); continue; }
  if (n.startsWith('note:')) { buckets.note.push(n); continue; }
  if (n.startsWith('img:')) { buckets.img.push(n); continue; }
  if (/^[A-Za-z][\w ]*\/\d+$/.test(n)) { buckets.item.push(n); continue; } // Item/1
  const base = baseName(n);
  if (/^[A-Z][A-Za-z0-9]+$/.test(base)) {
    if (known.has(base)) buckets.componentKnown.push(n);
    else buckets.componentUnknown.push(n);
    continue;
  }
  buckets.other.push(n);
}

// ── report ──────────────────────────────────────────────────────────────
const uniq = (a) => [...new Set(a)].sort();
const total = nodes.length;
const named = total - buckets.unnamed.length;

const line = (s = '') => console.log(s);
line('── Figma layer-name validation ──');
line(`repo: ${repoRoot}`);
line(`layers: ${total} · named: ${named}/${total} · known components in repo: ${known.size}`);
line();

function section(title, items, { level = 'ok' } = {}) {
  if (!items.length) return;
  const tag = level === 'error' ? '✗ ERROR' : level === 'warn' ? '! WARN' : '·';
  line(`${tag}  ${title} (${items.length})`);
  for (const it of uniq(items)) line(`      ${it}`);
  line();
}

section('Unnamed / default layers — MUST rename before extracting', buckets.unnamed, { level: 'error' });
section('Component names with NO match in code — typo, or propose in the missing-components sheet (Gate 5)', buckets.componentUnknown, { level: 'warn' });
section('Named but off-grammar — give a Screen/ Section/ data: label: note: img: prefix', buckets.other, { level: 'warn' });

section('Screens', buckets.screen);
section('Sections', buckets.section);
section('Aliased components (matched in repo)', buckets.componentKnown);
section('List items', buckets.item);
section('Labels', buckets.label);
section('Notes / annotations to read (Gate 2)', buckets.note);
section('Images', buckets.img);

line('── data:* fields to mock (Gate 6) ──');
if (dataFields.size) for (const f of [...dataFields].sort()) line(`      ${f}`);
else line('      (none — no data:* layers found)');
line();

// ── summary + exit ──────────────────────────────────────────────────────
const errors = buckets.unnamed.length;
const warns = buckets.componentUnknown.length + buckets.other.length;
line('── summary ──');
line(`  named to grammar: ${named}/${total}`);
line(`  aliased components: ${uniq(buckets.componentKnown).length} · unknown components: ${uniq(buckets.componentUnknown).length}`);
line(`  data fields to mock: ${dataFields.size}`);
line(`  notes to read: ${uniq(buckets.note).length}`);
line(`  ERRORs: ${errors} · WARNs: ${warns}`);
line(errors ? '\nNot ready — rename the ERROR layers, then re-run.' : '\nOK — all layers named to the grammar. Review WARNs, then proceed to Gate 1.');
process.exit(errors ? 1 : 0);
