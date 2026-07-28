#!/usr/bin/env node
/**
 * Pull the human-readable design.md mirror from @mih/design-tokens.
 * CSS is already loaded via `import '@mih/design-tokens/tokens.css'` in main.jsx.
 *
 * Usage: npm run tokens:pull
 */
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

let pkgDir
try {
  pkgDir = dirname(require.resolve('@mih/design-tokens/package.json'))
} catch {
  console.error('Cannot resolve @mih/design-tokens — run npm install first.')
  process.exit(1)
}

const src = join(pkgDir, 'design.md')
const dest = join(root, 'design.md')

if (!existsSync(src)) {
  console.error(`Missing ${src}`)
  process.exit(1)
}

const banner = [
  '# Design System Token Reference',
  '',
  '> **Canonical package:** [`@mih/design-tokens`](https://github.com/namonlims/mih-design) (`packages/design-tokens`).  ',
  '> CSS custom properties ship from that package (`tokens.css`); this `design.md` is the human-readable mirror.  ',
  '> Edit tokens in **mih-design**, then run `npm run tokens:pull` here to refresh this file.',
  '>',
].join('\n')

let body = readFileSync(src, 'utf8')

// Drop leading H1 + any prior canonical banner so we can re-apply ours once
body = body.replace(/^# Design System Token Reference\s*/m, '')
body = body.replace(/^> \*\*Canonical package:[\s\S]*?(?=\n> Auto-generated|\n## |\n# )/m, '')
body = body.replace(/^\n+/, '')

writeFileSync(dest, `${banner}\n${body}`)
console.log(`Pulled design.md ← ${src}`)
