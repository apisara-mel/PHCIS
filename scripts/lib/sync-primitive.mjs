import { join } from 'node:path';
import {
  CORE_COLOR_PALETTES,
  DESIGN_MD,
  TOKENS_DIR,
  flattenTokens,
  formatColorValue,
  loadJson,
  readDesignMd,
  renderPaletteTable,
  renderSimpleTable,
  replaceRegion,
  sortSteps,
  writeDesignMd,
} from './figma-tokens.mjs';

const PRIMITIVE_PATH = join(TOKENS_DIR, 'primitive.tokens.json');

const TYPOGRAPHY_GROUPS = [
  { title: 'Font Size (px)', prefix: 'typography.size.' },
  { title: 'Font Weight', prefix: 'typography.weight.' },
  { title: 'Letter Spacing', prefix: 'typography.letter-spacing.' },
  { title: 'Font Family', prefix: 'typography.family.' },
  { title: 'Font Style', prefix: 'typography.style.' },
];

const DIMENSION_GROUPS = [
  { title: 'Spacing (px)', prefix: 'dimension.space.' },
  { title: 'Border Radius (px)', prefix: 'dimension.radius.' },
  { title: 'Size Scale (px)', prefix: 'dimension.size.' },
  { title: 'Blur (px)', prefix: 'dimension.blur.' },
  { title: 'Depth / Z-index', prefix: 'dimension.depth.' },
  { title: 'Stroke Width (px)', prefix: 'dimension.stroke.' },
];

function getTypographyRoot(primitive) {
  return primitive.typography ?? primitive.typograpphy;
}

function renderColorPalettes(colorRoot) {
  const paletteNames = Object.keys(colorRoot).filter((k) => !k.startsWith('$'));
  const core = CORE_COLOR_PALETTES.filter((name) => paletteNames.includes(name));
  const additional = paletteNames.filter(
    (name) => !CORE_COLOR_PALETTES.includes(name) && !['shadow', 'bg'].includes(name),
  );

  const blocks = [
    '### 1a. Color Palettes',
    '',
    'Each palette has 11 steps (50 → 950). Values are in HEX.',
    '',
    ...core.flatMap((name) => ['', renderPaletteTable(name, colorRoot[name])]),
    '',
    '#### Special Color Tokens',
    '',
    'Alpha-baked shadow primitives. Alpha is pre-multiplied into the swatch — consumers use them as drop-shadow / glow color values directly.',
    '',
    renderSpecialColorTable(colorRoot.shadow, 'color.shadow'),
    '',
    '> **Indigo shadow primitives** alias `indigo/400` (`#818CF8` — the same swatch used by `--surface-colorfulbadge-indigo-bold`) at three opacity tiers. Used wherever a brand-violet ambient glow is needed — e.g. Doctor AI panel hover and indigo-bold pill drops.',
    '',
    'Alpha-baked **background tint** primitives (Figma scope `EFFECT_COLOR`). Each is a `teal`/`sky-cyan` swatch pre-multiplied to 20 % — used directly as a translucent fill (e.g. card / chip ambient wash). The light and dark modes alias these via `background.bg.*` (§4).',
    '',
    renderSpecialColorTable(colorRoot.bg, 'color.bg'),
    '',
    'Solid **sky-cyan/700** (`--color-sky-cyan-700 = #0859A8`) — the ศูนย์ number text',
    'inside the Clinic Card badge (Figma DS Card `E5DppVK8yi0EKJp1SUuKa9` 39:197); the',
    'badge fill itself is a 141° cyan gradient (token exception, inline).',
    '',
    '---',
    '',
    '### 1a-2. Additional Color Palettes (from JSON)',
    '',
    '> Palettes below come from `primitive.tokens.json` and are addressable as primitives. Brand modes (§2) reach into a subset of these for their `primary`/`secondary` maps.',
    '',
    ...additional.flatMap((name) => ['', renderPaletteTable(name, colorRoot[name])]),
  ];

  return blocks.join('\n').trimEnd();
}

function renderSpecialColorTable(group, prefix) {
  const steps = sortSteps(Object.keys(group ?? {}).filter((k) => !k.startsWith('$')));
  const lines = [
    '| Token | Hex | Opacity |',
    '|-------|-----|---------|',
  ];

  for (const step of steps) {
    const value = group[step]?.$value;
    const hex = formatColorValue(value);
    const alpha = value?.alpha ?? 1;
    const opacity = alpha < 1 ? `${Math.round(alpha * 100)} %` : '100 %';
    lines.push(`| \`${prefix}.${step}\` | \`${hex.split(' @ ')[0]}\` | ${opacity} |`);
  }

  return lines.join('\n');
}

function renderTokenGroup(title, tokens, prefix) {
  const filtered = tokens.filter((t) => t.token.startsWith(prefix));
  if (filtered.length === 0) return '';

  const table = renderSimpleTable(filtered, [
    { header: 'Token', render: (row) => `\`${row.token}\`` },
    { header: 'Value', render: (row) => `\`${formatPrimitiveValue(row.node)}\`` },
  ]);

  return [`#### ${title}`, '', table].join('\n');
}

function formatPrimitiveValue(node) {
  const { $type, $value } = node;
  if ($type === 'color') return formatColorValue($value);
  if ($type === 'number') return String($value);
  if ($type === 'string') return String($value);
  return JSON.stringify($value);
}

function renderTypography(primitive) {
  const typoRoot = getTypographyRoot(primitive);
  const tokens = flattenTokens(typoRoot, ['typography']);
  const groups = TYPOGRAPHY_GROUPS.map((g) => renderTokenGroup(g.title, tokens, g.prefix)).filter(Boolean);

  return [
    '### 1b. Typography',
    '',
    ...groups.flatMap((group, index) => (index === 0 ? [group] : ['', group])),
    '',
    '> `heading-graphic` (Sao Chingcha) and `heading-graphic2` (Mitr — Google Fonts) are the two **brand display** typefaces; Mitr has broader weight coverage (200–900). Body / heading / UI use Sarabun.',
  ].join('\n').trimEnd();
}

function renderDimension(primitive) {
  const tokens = flattenTokens(primitive.dimension, ['dimension']);
  const groups = DIMENSION_GROUPS.map((g) => renderTokenGroup(g.title, tokens, g.prefix)).filter(Boolean);

  return [
    '### 1c. Dimension',
    '',
    ...groups.flatMap((group, index) => (index === 0 ? [group] : ['', group])),
    '',
    '> `dimension.radius.1000` (100px) — success card top arch (Archive Mobile [178:122765](https://www.figma.com/design/4WXeI8fgBLQGgQ9VheM2yD/-Archive--Mobile-Application?node-id=178-122765)).',
  ].join('\n').trimEnd();
}

export function syncPrimitive({ stamp = true } = {}) {
  const primitive = loadJson(PRIMITIVE_PATH);
  const body = [
    renderColorPalettes(primitive.color),
    '',
    renderTypography(primitive),
    '',
    renderDimension(primitive),
  ].join('\n').trimEnd();

  const content = replaceRegion(
    readDesignMd(),
    '### 1a. Color Palettes',
    '### 1d. Effect Styles',
    `${body}\n\n`,
  );

  writeDesignMd(content, '§1 primitives synced from tokens/figma/primitive.tokens.json', { stamp });
  const paletteCount = Object.keys(primitive.color).filter((k) => !k.startsWith('$')).length;
  console.log(`Synced primitive tokens → design.md §1a–§1c (${paletteCount} color palettes)`);
  console.log(`  source: ${PRIMITIVE_PATH}`);
}
