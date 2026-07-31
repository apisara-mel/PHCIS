import {
  BRAND_STEPS,
  formatAlias,
  formatColorValue,
  listBrandFiles,
  loadJson,
  paletteFromAlias,
  readDesignMd,
  replaceRegion,
  writeDesignMd,
} from './figma-tokens.mjs';

const ALPHA_GROUPS = [
  { key: 'primaryBorder', label: 'brand.primaryBorder' },
  { key: 'PrimaryShadow', label: 'brand.PrimaryShadow' },
  { key: 'primaryText', label: 'brand.primaryText' },
];

function renderBrandModeOverview(brands) {
  const lines = [
    '### Brand Modes Overview',
    '',
    '| Mode | primary palette | secondary palette | Primary-700 | Primary-600 |',
    '|------|-----------------|-------------------|-------------|-------------|',
  ];

  for (const { mode, data } of brands) {
    const primaryPalette = paletteFromAlias(data.primary?.['700']) || mode;
    const secondaryPalette = paletteFromAlias(data.secondary?.['700']) || mode;
    const p700 = formatColorValue(data.primary?.['700']?.$value);
    const p600 = formatColorValue(data.primary?.['600']?.$value);
    lines.push(`| \`${mode}\` | \`${primaryPalette}\` | \`${secondaryPalette}\` | \`${p700}\` | \`${p600}\` |`);
  }

  return lines.join('\n');
}

function renderBrandStepsTable(mode, data) {
  const primaryPalette = paletteFromAlias(data.primary?.['700']) || mode;
  const secondaryPalette = paletteFromAlias(data.secondary?.['700']) || mode;

  const lines = [
    `#### Brand: \`${mode}\``,
    '',
    `| Step | primary (\`${primaryPalette}\`) | secondary (\`${secondaryPalette}\`) |`,
    '|------|------------------------|------------------------|',
  ];

  for (const step of BRAND_STEPS) {
    const primary = formatColorValue(data.primary?.[step]?.$value);
    const secondary = formatColorValue(data.secondary?.[step]?.$value);
    lines.push(`| ${step} | \`${primary}\` | \`${secondary}\` |`);
  }

  return lines.join('\n');
}

function renderAlphaTable(data) {
  const rows = [];

  for (const { key, label } of ALPHA_GROUPS) {
    const group = data[key];
    if (!group) continue;

    for (const step of Object.keys(group).filter((k) => !k.startsWith('$')).sort()) {
      const node = group[step];
      const hex = formatColorValue(node?.$value).split(' @ ')[0];
      const alpha = node?.$value?.alpha ?? 1;
      const alphaPct = `${Math.round(alpha * 100)}%`;
      const alias = formatAlias(node);
      const source = alias ? alias.split('/').slice(-2).join('/') : `${key}/${step}`;
      rows.push(`| \`${label}.${step}\` | \`${hex}\` | \`${alphaPct}\` | \`${source}\` |`);
    }
  }

  if (rows.length === 0) return '';

  return [
    '',
    '| Alpha Token | Hex | Alpha | Source step |',
    '|-------------|-----|-------|-------------|',
    ...rows,
  ].join('\n');
}

function renderBrandColorValues(brands) {
  const blocks = [
    '### Brand Color Values per Mode',
    '',
    'Each brand token step (`50`–`950`) resolves to the corresponding step in the mapped Primitive palette.',
    '',
    '> **Usage in code:** Reference `brand.primary.{step}` or `brand.secondary.{step}` and switch the brand mode to automatically change colors. Alpha tokens (`primaryBorder`, `PrimaryShadow`, `primaryText`) follow the same brand-mode switch and are pre-baked transparency variants used for shadows, focus rings, and subdued text.',
    '',
    ...brands.flatMap(({ mode, data }, index) => {
      const section = [
        renderBrandStepsTable(mode, data),
        renderAlphaTable(data),
      ].join('\n');
      return index === 0 ? [section] : ['', section];
    }),
  ];

  return blocks.join('\n').trimEnd();
}

export function syncBrand({ stamp = true } = {}) {
  const brands = listBrandFiles().map(({ file, mode }) => ({
    mode,
    data: loadJson(file),
  }));

  const body = [
    renderBrandModeOverview(brands),
    '',
    renderBrandColorValues(brands),
  ].join('\n').trimEnd();

  const content = replaceRegion(
    readDesignMd(),
    '### Brand Modes Overview',
    '---\n\n## 3. Breakpoint Tokens',
    `${body}\n\n`,
  );

  writeDesignMd(content, '§2 brand synced from tokens/figma/brand/*.tokens.json', { stamp });
  console.log(`Synced ${brands.length} brand modes → design.md §2`);
}
