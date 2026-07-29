import { join } from 'node:path';
import {
  TOKENS_DIR,
  formatAlias,
  formatColorValue,
  getByPath,
  loadJson,
  readDesignMd,
  replaceRegion,
  writeDesignMd,
} from './figma-tokens.mjs';

const LIGHT_PATH = join(TOKENS_DIR, 'light.tokens.json');
const DARK_PATH = join(TOKENS_DIR, 'dark.tokens.json');

const CATEGORIES = [
  { section: '4.1', key: 'background' },
  { section: '4.2', key: 'text' },
  { section: '4.3', key: 'border' },
  { section: '4.4', key: 'icon' },
  { section: '4.5', key: 'surface' },
];

const BACKGROUND_FOOTNOTE =
  '> `background.bg.*` are translucent ambient-wash fills (alpha-baked primitives, §1 *Special Color Tokens*). Light aliases `color/bg/teal-400` & `color/bg/sky-cyan-400`; dark aliases the deeper `color/bg/teal-600` & `color/bg/sky-cyan-600` — both at 20 % opacity.';

function flattenCategory(root, category) {
  const out = [];
  const node = root[category];
  if (!node || typeof node !== 'object') return out;

  function walk(current, parts) {
    for (const [key, value] of Object.entries(current)) {
      if (key.startsWith('$')) continue;
      const pathParts = [...parts, key];
      if (value && typeof value === 'object' && '$type' in value) {
        out.push({ token: pathParts.join('.'), light: value });
      } else if (value && typeof value === 'object') {
        walk(value, pathParts);
      }
    }
  }

  walk(node, [category]);
  return out;
}

function renderTable(tokens, dark) {
  const lines = [
    '| Token | Light | Dark | Alias (Light) |',
    '|-------|-------|------|----------------|',
  ];

  for (const { token, light: lightNode } of tokens) {
    const darkNode = getByPath(dark, token.split('.'));
    const lightVal = formatColorValue(lightNode?.$value);
    const darkVal = formatColorValue(darkNode?.$value);
    const alias = formatAlias(lightNode);
    lines.push(`| \`${token}\` | \`${lightVal}\` | \`${darkVal}\` | \`${alias}\` |`);
  }

  return lines.join('\n');
}

function renderSemanticSection(light, dark) {
  const blocks = [];

  for (const { section, key } of CATEGORIES) {
    const tokens = flattenCategory(light, key);
    blocks.push(`### ${section}. \`${key}\``, '');
    blocks.push(renderTable(tokens, dark));
    if (key === 'background') {
      blocks.push('', BACKGROUND_FOOTNOTE);
    }
    blocks.push('');
  }

  return blocks.join('\n').trimEnd();
}

export function syncSemantic({ stamp = true } = {}) {
  const light = loadJson(LIGHT_PATH);
  const dark = loadJson(DARK_PATH);

  const lightCount = CATEGORIES.reduce(
    (sum, { key }) => sum + flattenCategory(light, key).length,
    0,
  );
  const darkCount = CATEGORIES.reduce(
    (sum, { key }) => sum + flattenCategory(dark, key).length,
    0,
  );

  if (lightCount !== darkCount) {
    console.warn(`Warning: light (${lightCount}) and dark (${darkCount}) token counts differ.`);
  }

  const body = renderSemanticSection(light, dark);
  const content = replaceRegion(
    readDesignMd(),
    '### 4.1. `background`',
    '### 4.6. `typography`',
    `${body}\n\n`,
  );

  writeDesignMd(content, '§4 semantic synced from tokens/figma/light+dark.tokens.json', { stamp });
  console.log(`Synced ${lightCount} semantic color tokens → design.md §4.1–§4.5`);
}
