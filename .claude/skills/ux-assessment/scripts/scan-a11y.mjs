#!/usr/bin/env node
/*
  scan-a11y.mjs — Automated accessibility heuristics for MIH vibe-code.

  Static analysis only — confirms patterns that often cause a11y issues.
  Always follow with manual WCAG review (ACCESSIBILITY.md).

  Usage:
    node scan-a11y.mjs <file.jsx> [file2 ...]
    node scan-a11y.mjs src/pages/treat
    node scan-a11y.mjs src/components/button

  Exit: 0 always (findings printed; human decides severity)
*/

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (!args.length || args.includes('-h') || args.includes('--help')) {
  console.log(`Usage: node scan-a11y.mjs <file-or-dir> [...]

Checks (regex heuristics):
  · IconButton without accessibilityLabel / aria-label
  · <button without aria-label when no visible text child
  · onClick on non-interactive elements (div/span) without role
  · <img without alt
  · Hardcoded hex colors in style={{ (contrast/token drift risk)
  · input/textarea without id+label association (weak heuristic)
  · tabIndex > 0`);
  process.exit(args.includes('-h') ? 0 : 2);
}

const JSX_EXT = /\.(jsx|tsx)$/;

function collectFiles(entry) {
  const abs = path.resolve(entry);
  if (!fs.existsSync(abs)) {
    console.error(`Not found: ${entry}`);
    return [];
  }
  const stat = fs.statSync(abs);
  if (stat.isFile()) return JSX_EXT.test(abs) ? [abs] : [];
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const s = fs.statSync(full);
      if (s.isDirectory() && name !== 'node_modules') walk(full);
      else if (s.isFile() && JSX_EXT.test(name)) out.push(full);
    }
  })(abs);
  return out;
}

const files = args.flatMap(collectFiles);
if (!files.length) {
  console.error('No .jsx/.tsx files found.');
  process.exit(2);
}

const findings = [];

function add(file, line, rule, snippet) {
  findings.push({ file, line, rule, snippet: snippet.trim().slice(0, 120) });
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const isIconButton = /IconButton|iconButton/.test(content);

  lines.forEach((line, i) => {
    const n = i + 1;

    if (/IconButton/.test(line) && !/accessibilityLabel|aria-label/.test(line)) {
      // multi-line props — flag file-level if IconButton import exists without any label in file
    }

    if (/<img\b/.test(line) && !/\balt=/.test(line)) {
      add(filePath, n, 'img-missing-alt', line);
    }

    if (/<(div|span)\b[^>]*\bonClick=/.test(line) && !/\brole=/.test(line)) {
      add(filePath, n, 'clickable-non-interactive', line);
    }

    if (/\bonClick=/.test(line) && /<button\b/.test(line) && !/>[^<]{1,80}<\/button>/.test(line)) {
      // skip — complex
    }

    if (/style=\{\{[^}]*#[0-9a-fA-F]{3,8}/.test(line)) {
      add(filePath, n, 'hardcoded-hex-in-style', line);
    }

    if (/\btabIndex=\{?[1-9]/.test(line)) {
      add(filePath, n, 'positive-tabindex', line);
    }

    if (/<input\b/.test(line) && !/\bid=/.test(line) && !/aria-label/.test(line)) {
      add(filePath, n, 'input-maybe-unlabeled', line);
    }
  });

  if (isIconButton && !/accessibilityLabel|aria-label/.test(content)) {
    add(filePath, 1, 'icon-button-file-missing-label', '(file uses IconButton but no accessibilityLabel/aria-label found)');
  }

  const buttonMatches = [...content.matchAll(/<button\b([^>]*)>/g)];
  for (const m of buttonMatches) {
    const attrs = m[1];
    if (!/aria-label/.test(attrs) && !/>\s*[^<\s]/.test(m[0])) {
      const idx = content.indexOf(m[0]);
      const line = content.slice(0, idx).split('\n').length;
      add(filePath, line, 'button-maybe-no-accessible-name', m[0]);
    }
  }
}

for (const f of files) scanFile(f);

console.log('── a11y scan (automated heuristics) ──');
console.log(`files: ${files.length} · findings: ${findings.length}`);
console.log();

const byRule = {};
for (const f of findings) {
  if (!byRule[f.rule]) byRule[f.rule] = [];
  byRule[f.rule].push(f);
}

for (const [rule, items] of Object.entries(byRule).sort()) {
  console.log(`[${rule}] (${items.length})`);
  for (const it of items.slice(0, 15)) {
    console.log(`  ${path.relative(process.cwd(), it.file)}:${it.line}`);
    console.log(`    ${it.snippet}`);
  }
  if (items.length > 15) console.log(`  … +${items.length - 15} more`);
  console.log();
}

if (!findings.length) {
  console.log('No automated issues detected. Run manual ACCESSIBILITY.md + HEURISTICS.md review.');
}

console.log('Note: false positives possible — verify each finding manually.');
