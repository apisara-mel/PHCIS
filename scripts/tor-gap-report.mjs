#!/usr/bin/env node
// TOR gap report — parses docs/tor-checklist.html (the machine-readable TOR tree
// + status map) and prints coverage per section, or the leaf list of one section.
//
//   node scripts/tor-gap-report.mjs                 → summary table (all sections)
//   node scripts/tor-gap-report.mjs --section 1.10.3 → every leaf of §1.10.3 with status
//   node scripts/tor-gap-report.mjs --todo           → summary, only sections with todo > 0
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(repoRoot, 'docs/tor-checklist.html'), 'utf8');

const nodes = [...html.matchAll(/\{id:'([^']+)',level:(\d+),(?:title|text):'((?:[^'\\]|\\.)*)'/g)]
  .map((m) => ({ id: m[1], level: +m[2], text: m[3].replace(/\\'/g, "'") }));
const status = {};
for (const m of html.matchAll(/'([^'\s]+)':\s*\{\s*s:\s*'(done|partial|todo)'((?:[^}\\]|\\.)*)\}/g)) {
  const note = /n:\s*'((?:[^'\\]|\\.)*)'/.exec(m[3]);
  const url = /u:\s*'((?:[^'\\]|\\.)*)'/.exec(m[3]);
  status[m[1]] = { s: m[2], n: note ? note[1] : '', u: url ? url[1] : '' };
}

const leaves = nodes.filter((n) => n.level === 4);
const args = process.argv.slice(2);
const sectionArg = args.includes('--section') ? args[args.indexOf('--section') + 1] : null;

if (sectionArg) {
  const sec = nodes.find((n) => n.id === sectionArg);
  console.log(`§${sectionArg} ${sec ? sec.text : ''}`);
  for (const l of leaves.filter((x) => x.id === sectionArg || x.id.startsWith(sectionArg + '.'))) {
    const st = status[l.id] || { s: 'todo', n: '', u: '' };
    const mark = { done: '✅', partial: '🟡', todo: '❌' }[st.s];
    console.log(`${mark} ${l.id}  ${l.text}${st.u ? `  [${st.u}]` : ''}${st.n ? `  — ${st.n}` : ''}`);
  }
  process.exit(0);
}

const onlyTodo = args.includes('--todo');
for (const s of nodes.filter((n) => n.level === 2)) {
  const kids = leaves.filter((l) => l.id === s.id || l.id.startsWith(s.id + '.'));
  if (!kids.length) continue;
  const c = { done: 0, partial: 0, todo: 0 };
  for (const k of kids) c[(status[k.id] || { s: 'todo' }).s]++;
  if (onlyTodo && c.todo === 0 && c.partial === 0) continue;
  const pct = Math.round((100 * (c.done + c.partial * 0.5)) / kids.length);
  console.log(
    `${s.id.padEnd(6)} ${String(kids.length).padStart(3)} leaves  done:${String(c.done).padStart(3)}  partial:${String(c.partial).padStart(3)}  todo:${String(c.todo).padStart(3)}  ~${String(pct).padStart(3)}%  ${s.text.slice(0, 60)}`
  );
}
