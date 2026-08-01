#!/usr/bin/env node
/**
 * Pull the design-token mirrors from @mih/design-tokens into this repo:
 *
 *   tokens.css → src/styles/tokens.css   (imported by src/main.jsx)
 *   design.md  → design.md               (human-readable reference)
 *
 * Both mirrors are committed so `npm ci && npm run build` works on machines
 * that can't read the private mih-design repo (office-202 cron, GitHub
 * runners, new devs). mih-design stays the source of truth — edit tokens
 * there, run this script here, commit the diff.
 *
 * Usage:
 *   npm run tokens:pull            refresh the mirrors
 *   npm run tokens:pull -- --check exit 1 if the mirrors are stale (no writes)
 *
 * Source lookup order:
 *   1. $MIH_DESIGN_TOKENS_DIR
 *   2. node resolution of @mih/design-tokens (if it's still linked/installed)
 *   3. ../mih-design/packages/design-tokens (sibling checkout)
 */
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { createRequire } from 'module'
import { dirname, join, relative } from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')

function resolveSourceDir() {
  if (process.env.MIH_DESIGN_TOKENS_DIR) return process.env.MIH_DESIGN_TOKENS_DIR
  try {
    return dirname(require.resolve('@mih/design-tokens/package.json'))
  } catch {
    const sibling = join(root, '..', 'mih-design', 'packages', 'design-tokens')
    if (existsSync(sibling)) return sibling
  }
  return null
}

const pkgDir = resolveSourceDir()

if (!pkgDir) {
  console.error([
    'หา @mih/design-tokens ไม่เจอ — ต้องมี repo mih-design อยู่ข้าง ๆ:',
    '',
    '  git clone git@github.com:namonlims/mih-design.git ../mih-design',
    '',
    'หรือชี้ path เองด้วย MIH_DESIGN_TOKENS_DIR=/path/to/packages/design-tokens',
    '',
    'สคริปต์นี้จำเป็นเฉพาะตอนอัปเดต token เท่านั้น — build/dev ใช้',
    'src/styles/tokens.css ที่ commit ไว้แล้ว ไม่ต้องมี mih-design',
  ].join('\n'))
  process.exit(1)
}

const GENERATED_BANNER = `/* ─────────────────────────────────────────────────────────────
 * GENERATED FILE — DO NOT EDIT BY HAND
 *
 * Mirror ของ @mih/design-tokens/tokens.css (namonlims/mih-design →
 * packages/design-tokens). แก้ token ที่ repo mih-design แล้วรัน
 * \`npm run tokens:pull\` ที่นี่เพื่ออัปเดตไฟล์นี้ + design.md แล้ว commit
 *
 * ที่ commit ไฟล์ generate ไว้ในรีโปเพราะ build ต้องทำงานได้บนเครื่องที่
 * ไม่มีสิทธิ์อ่าน mih-design (office-202 cron, GitHub runner, dev ใหม่)
 * ───────────────────────────────────────────────────────────── */
`

const MD_BANNER = [
  '# Design System Token Reference',
  '',
  '> **Canonical package:** [`@mih/design-tokens`](https://github.com/namonlims/mih-design) (`packages/design-tokens`).  ',
  '> CSS custom properties ship from that package (`tokens.css`); this `design.md` is the human-readable mirror.  ',
  '> Edit tokens in **mih-design**, then run `npm run tokens:pull` here to refresh this file.',
  '>',
].join('\n')

function buildTokensCss(source) {
  return GENERATED_BANNER + source
}

function buildDesignMd(source) {
  let body = source
  // Drop leading H1 + any prior canonical banner so we can re-apply ours once
  body = body.replace(/^# Design System Token Reference\s*/m, '')
  body = body.replace(/^> \*\*Canonical package:[\s\S]*?(?=\n> Auto-generated|\n## |\n# )/m, '')
  body = body.replace(/^\n+/, '')
  return `${MD_BANNER}\n${body}`
}

const mirrors = [
  { src: join(pkgDir, 'tokens.css'), dest: join(root, 'src', 'styles', 'tokens.css'), build: buildTokensCss },
  { src: join(pkgDir, 'design.md'), dest: join(root, 'design.md'), build: buildDesignMd },
]

let stale = 0

for (const { src, dest, build } of mirrors) {
  if (!existsSync(src)) {
    console.error(`Missing ${src}`)
    process.exit(1)
  }

  const next = build(readFileSync(src, 'utf8'))
  const current = existsSync(dest) ? readFileSync(dest, 'utf8') : null
  const rel = relative(root, dest)

  if (current === next) {
    console.log(`ตรงกันอยู่แล้ว: ${rel}`)
    continue
  }

  if (checkOnly) {
    console.error(`::warning::${rel} ไม่ตรงกับ ${src} — รัน \`npm run tokens:pull\` แล้ว commit`)
    stale += 1
    continue
  }

  writeFileSync(dest, next)
  console.log(`อัปเดตแล้ว: ${rel} ← ${src}`)
}

if (stale > 0) process.exit(1)
