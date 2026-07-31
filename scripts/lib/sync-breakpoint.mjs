import { join } from 'node:path';
import {
  TOKENS_DIR,
  loadJson,
  readDesignMd,
  replaceRegion,
  writeDesignMd,
} from './figma-tokens.mjs';

const BREAKPOINT_DIR = join(TOKENS_DIR, 'breakpoint');
const BREAKPOINT_ORDER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

function renderBreakpointTable(breakpoints) {
  const lines = [
    '| Mode | `default` (px) |',
    '|------|----------------|',
  ];

  for (const mode of BREAKPOINT_ORDER) {
    const value = breakpoints[mode];
    if (value == null) continue;
    lines.push(`| \`${mode}\` | \`${value}\` |`);
  }

  return lines.join('\n');
}

export function syncBreakpoint({ stamp = true } = {}) {
  const breakpoints = {};

  for (const mode of BREAKPOINT_ORDER) {
    const file = join(BREAKPOINT_DIR, `${mode}.tokens.json`);
    const data = loadJson(file);
    breakpoints[mode] = data.default?.$value;
  }

  const body = [
    '## 3. Breakpoint Tokens',
    '',
    'Breakpoint tokens define responsive layout widths aligned with Tailwind CSS breakpoints.',
    '',
    renderBreakpointTable(breakpoints),
  ].join('\n').trimEnd();

  const content = replaceRegion(
    readDesignMd(),
    '## 3. Breakpoint Tokens',
    '---\n\n## 4. Semantic Tokens',
    `${body}\n\n`,
  );

  writeDesignMd(content, '§3 breakpoints synced from tokens/figma/breakpoint/*.tokens.json', { stamp });
  console.log(`Synced ${BREAKPOINT_ORDER.length} breakpoints → design.md §3`);
}
