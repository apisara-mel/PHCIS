import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '../..');
export const DESIGN_MD = join(ROOT, 'design.md');
export const TOKENS_DIR = join(ROOT, 'tokens/figma');

export const BRAND_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

export const CORE_COLOR_PALETTES = [
  'emerald', 'forest', 'neutral', 'slate', 'grey', 'pink', 'yellow', 'orange',
  'teal', 'purple', 'magenta', 'blue', 'indigo', 'red',
];

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function getByPath(obj, parts) {
  let cur = obj;
  for (const p of parts) {
    cur = cur?.[p];
  }
  return cur;
}

export function formatColorValue(value) {
  if (!value || typeof value !== 'object') return '';
  if (value.hex) {
    const hex = value.hex.toUpperCase();
    const alpha = value.alpha ?? 1;
    if (alpha < 1) {
      const pct = Math.round(alpha * 100);
      return `${hex} @ ${pct}%`;
    }
    return hex;
  }
  return JSON.stringify(value);
}

export function formatAlias(tokenNode) {
  const alias = tokenNode?.$extensions?.['com.figma.aliasData'];
  if (!alias?.targetVariableSetName || !alias?.targetVariableName) return '';
  return `${alias.targetVariableSetName}/${alias.targetVariableName}`;
}

export function paletteFromAlias(tokenNode) {
  const alias = formatAlias(tokenNode);
  const match = alias.match(/color\/([^/]+)\/\d+/);
  return match?.[1] ?? '';
}

export function sortSteps(steps) {
  return [...steps].sort((a, b) => {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
    return na - nb;
  });
}

export function flattenTokens(root, prefix = []) {
  const out = [];
  if (!root || typeof root !== 'object') return out;

  for (const [key, value] of Object.entries(root)) {
    if (key.startsWith('$')) continue;
    const pathParts = [...prefix, key];
    if (value && typeof value === 'object' && '$type' in value) {
      out.push({ token: pathParts.join('.'), node: value });
    } else if (value && typeof value === 'object') {
      out.push(...flattenTokens(value, pathParts));
    }
  }
  return out;
}

export function replaceRegion(content, startMarker, endMarker, newBody) {
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error(`Could not locate region in design.md: "${startMarker}" … "${endMarker}"`);
  }

  return `${content.slice(0, startIdx)}${newBody}${content.slice(endIdx)}`;
}

export function stampDesignMd(content, note) {
  const today = new Date();
  const monthYear = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return content.replace(
    /> Auto-generated from Figma Variable exports\. Last updated: .+/,
    `> Auto-generated from Figma Variable exports. Last updated: ${monthYear} (${note})`,
  );
}

export function writeDesignMd(content, note, { stamp = true } = {}) {
  writeFileSync(DESIGN_MD, stamp ? stampDesignMd(content, note) : content, 'utf8');
}

export function readDesignMd() {
  return readFileSync(DESIGN_MD, 'utf8');
}

export function renderPaletteTable(paletteName, paletteNode) {
  const steps = sortSteps(Object.keys(paletteNode).filter((k) => !k.startsWith('$')));
  const lines = [
    `#### \`${paletteName}\``,
    '',
    '| Step | Hex |',
    '|------|-----|',
  ];

  for (const step of steps) {
    const hex = formatColorValue(paletteNode[step]?.$value);
    lines.push(`| ${step} | \`${hex}\` |`);
  }

  return lines.join('\n');
}

export function renderSimpleTable(tokens, columns) {
  const header = `| ${columns.map((c) => c.header).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const lines = [header, divider];

  for (const row of tokens) {
    lines.push(`| ${columns.map((c) => c.render(row)).join(' | ')} |`);
  }

  return lines.join('\n');
}

export function listBrandFiles() {
  const brandDir = join(TOKENS_DIR, 'brand');
  return readdirSync(brandDir)
    .filter((name) => name.endsWith('.tokens.json'))
    .map((name) => ({
      file: join(brandDir, name),
      mode: name.replace(/\.tokens\.json$/, ''),
    }))
    .sort((a, b) => {
      if (a.mode === 'default') return -1;
      if (b.mode === 'default') return 1;
      return a.mode.localeCompare(b.mode);
    });
}
