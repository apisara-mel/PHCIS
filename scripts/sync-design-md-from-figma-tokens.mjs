#!/usr/bin/env node
/**
 * Sync design.md token tables from Figma W3C Design Token exports in tokens/figma/.
 *
 * Usage:
 *   node scripts/sync-design-md-from-figma-tokens.mjs            # all sections
 *   node scripts/sync-design-md-from-figma-tokens.mjs primitive  # §1 only
 *   node scripts/sync-design-md-from-figma-tokens.mjs brand      # §2 only
 *   node scripts/sync-design-md-from-figma-tokens.mjs breakpoint # §3 only
 *   node scripts/sync-design-md-from-figma-tokens.mjs semantic     # §4 only
 *
 * npm run tokens:sync
 */

import { writeFileSync } from 'node:fs';
import { DESIGN_MD, readDesignMd, stampDesignMd } from './lib/figma-tokens.mjs';
import { syncBrand } from './lib/sync-brand.mjs';
import { syncBreakpoint } from './lib/sync-breakpoint.mjs';
import { syncPrimitive } from './lib/sync-primitive.mjs';
import { syncSemantic } from './lib/sync-semantic.mjs';

const TARGETS = {
  primitive: syncPrimitive,
  brand: syncBrand,
  breakpoint: syncBreakpoint,
  semantic: syncSemantic,
};

const STAMP_NOTES = {
  primitive: '§1 primitives synced from tokens/figma/primitive.tokens.json',
  brand: '§2 brand synced from tokens/figma/brand/*.tokens.json',
  breakpoint: '§3 breakpoints synced from tokens/figma/breakpoint/*.tokens.json',
  semantic: '§4 semantic synced from tokens/figma/light+dark.tokens.json',
};

function main() {
  const args = process.argv.slice(2);
  const selected = args.length > 0 ? args : Object.keys(TARGETS);
  const runAll = selected.length === Object.keys(TARGETS).length;

  for (const name of selected) {
    const fn = TARGETS[name];
    if (!fn) {
      console.error(`Unknown target "${name}". Valid: ${Object.keys(TARGETS).join(', ')}`);
      process.exit(1);
    }
    fn({ stamp: !runAll });
  }

  const note = runAll
    ? '§1–§4 synced from tokens/figma/ (primitive · brand · breakpoint · semantic)'
    : STAMP_NOTES[selected[0]];

  if (runAll) {
    writeFileSync(DESIGN_MD, stampDesignMd(readDesignMd(), note), 'utf8');
  }

  console.log(`Done. design.md updated (${note}).`);
}

main();
