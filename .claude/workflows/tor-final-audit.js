export const meta = {
  name: 'tor-final-audit',
  description: 'Repo-wide pre-PR audit: compliance sweeps → adversarial verify → fix → rebuild',
  whenToUse:
    'Run before opening the wave PR (or at sprint end). Optional args = {sections: ["1.10","1.19"]} to focus the TOR-coverage critic on specific sections; omit for all in-scope.',
  phases: [
    { title: 'Sweep', detail: 'parallel finders: tokens, pitfalls, build, TOR honesty, edge cases' },
    { title: 'Judge', detail: 'adversarial verification of every finding' },
    { title: 'Fix', detail: 'apply confirmed fixes per area' },
    { title: 'Seal', detail: 'final build + gap report' },
  ],
}

const PLAYBOOK = 'docs/tor-wave-playbook.md'
let auditArgs = args
if (typeof auditArgs === 'string') auditArgs = JSON.parse(auditArgs)
const focus = auditArgs && Array.isArray(auditArgs.sections) && auditArgs.sections.length ? auditArgs.sections : null

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file', 'severity', 'summary', 'fix'],
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          severity: { enum: ['critical', 'major', 'minor'] },
          summary: { type: 'string' },
          fix: { type: 'string' },
          area: { type: 'string' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['real', 'reason'],
  properties: { real: { type: 'boolean' }, reason: { type: 'string' } },
}

const BUILD_CHECK_SCHEMA = {
  type: 'object',
  required: ['buildOk', 'errors'],
  properties: { buildOk: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } },
}

const RECENT = `Scope: files changed on this branch vs origin/main (git diff --name-only origin/main...HEAD) — sweep those first and hardest; only widen if a finding leads you elsewhere.`

const FINDERS = [
  {
    key: 'tokens',
    prompt:
      `Token-compliance finder. READ FIRST: CLAUDE.md + ${PLAYBOOK} §2. ${RECENT}\n` +
      `Grep-driven sweep for: raw hex that matches an existing token in src/styles/tokens.css; numeric borderRadius/gap/padding/fontSize literals; fontWeight numbers; boxShadow rgba literals; var() fallbacks that lie about the token's real value; Tailwind bg-[var(--x)]/text-[var(--x)] classes (compile to nothing on Tailwind 2.1); inline padding/margin SHORTHAND carrying var(). Gradients are exempt. Return findings with concrete fixes (which token to use).`,
  },
  {
    key: 'pitfalls',
    prompt:
      `Runtime-pitfall finder. READ FIRST: ${PLAYBOOK} §2. ${RECENT}\n` +
      `Hunt: React-18-only hooks (useId, useSyncExternalStore, useDeferredValue, useTransition, useInsertionEffect — this app is React 17, they import as undefined and crash); react-router v6 APIs (useNavigate, Routes element=) in this v5 app; bare VoiceTextarea without suggestions (must be SuggestibleTextarea voice + suggestions + minChars); native inputs inside custom wrappers missing the chrome-strip stylesheet pattern (AISearch.jsx); imports of files that do not exist; duplicate route paths in src/routes/Routes.jsx.`,
  },
  {
    key: 'tor-honesty',
    prompt:
      `TOR-coverage honesty critic. Run node scripts/tor-gap-report.mjs${focus ? ` --section ${focus.join(' and --section ')}` : ' --todo'} and read docs/tor-checklist.html status notes.\n` +
      `Pick 15 leaves marked done across the ${focus ? 'focus sections' : 'sections most recently touched on this branch'} and verify each against the actual UI code at its recorded route: does the screen really satisfy the leaf text (all of แสดง/บันทึก/ยกเลิก/แก้ไข where required)? Flag every overstated status as a finding (fix = corrected status + what UI is missing). Also flag in-scope leaves still todo that block a whole section from being demoable.`,
  },
  {
    key: 'edge-ux',
    prompt:
      `Edge-case & UX finder. READ FIRST: ${PLAYBOOK} §5. ${RECENT}\n` +
      `For each page added/changed on this branch: check empty states, validation errors, cancel/edit flows, no-rights/expired-rights handling, audit-trail display, search-with-no-results, pagination. Apply Nielsen heuristics (status visibility, real-workflow match, consistency with sibling modules, error prevention). Only report concrete, fixable gaps — not stylistic taste.`,
  },
]

// ---- Sweep + build check in parallel ----
const [buildCheck, ...sweeps] = await parallel([
  () =>
    agent(
      `Build verifier. Follow ${PLAYBOOK} §6 exactly: rsync Drive repo → ~/MIH-PHCIS-local (command inside dev.sh, do NOT start the server), then Node-16 vite build. Report buildOk + every error verbatim. Do not fix anything.`,
      { label: 'sweep:build', phase: 'Sweep', schema: BUILD_CHECK_SCHEMA }
    ),
  ...FINDERS.map((f) => () =>
    agent(f.prompt + `\nDo NOT edit files. Return structured findings; empty list is valid if clean. Tag each finding with area:'${f.key}'.`, {
      label: `sweep:${f.key}`,
      phase: 'Sweep',
      schema: FINDINGS_SCHEMA,
    })
  ),
])

const found = sweeps.filter(Boolean).flatMap((s) => s.findings)
log(`Sweep: ${found.length} findings, build ${buildCheck ? (buildCheck.buildOk ? 'OK' : 'FAILED') : 'unknown'}`)

// ---- Judge: adversarial verify each finding (skip minors to save wall-clock) ----
const majors = found.filter((f) => f.severity !== 'minor')
const minors = found.filter((f) => f.severity === 'minor')
const judged = await parallel(
  majors.map((f) => () =>
    agent(
      `Skeptic. Try to REFUTE this code-review finding by reading the actual file. Finding: ${JSON.stringify(f)}\n` +
        `It is refuted if: the code already handles it, the rule does not apply here (e.g. gradient exemption, kiosk/mobile legacy copy), or the cited file/line does not contain the claim. Default real=false when uncertain.`,
      { label: `judge:${f.area}:${(f.file || '').split('/').pop()}`, phase: 'Judge', schema: VERDICT_SCHEMA }
    ).then((v) => ({ f, real: !!(v && v.real) }))
  )
)
const confirmed = judged.filter(Boolean).filter((j) => j.real).map((j) => j.f).concat(minors)
log(`Judge: ${confirmed.length}/${found.length} findings confirmed (minors auto-pass)`)

// ---- Fix per area ----
const buildErrors = buildCheck && !buildCheck.buildOk ? buildCheck.errors : []
if (confirmed.length || buildErrors.length) {
  const byArea = {}
  for (const f of confirmed) (byArea[f.area || 'misc'] ||= []).push(f)
  await parallel(
    Object.entries(byArea).map(([area, list]) => () =>
      agent(
        `Fixer for audit area "${area}". READ FIRST: CLAUDE.md + ${PLAYBOOK}. Apply every fix below exactly; verify by re-reading each file. If two findings touch the same file, apply both carefully. Report fixes applied + skipped (with reason).\n` +
          JSON.stringify(list),
        { label: `fix:${area}`, phase: 'Fix' }
      )
    )
  )
  if (buildErrors.length) {
    await agent(`Fix these build errors (any file): ${JSON.stringify(buildErrors)}. Follow CLAUDE.md rules.`, {
      label: 'fix:build',
      phase: 'Fix',
    })
  }
}

// ---- Seal ----
const seal = await agent(
  `Final seal. 1) Re-run the build per ${PLAYBOOK} §6 (rsync → local, Node 16 vite build). 2) Run node scripts/tor-gap-report.mjs --todo. Report buildOk, errors verbatim, and paste the gap-report output into the errors array as info lines prefixed "GAP: " (buildOk reflects only the build).`,
  { label: 'seal', phase: 'Seal', schema: BUILD_CHECK_SCHEMA }
)

return {
  findings: found.length,
  confirmed: confirmed.length,
  fixed: confirmed.length,
  finalBuildOk: !!(seal && seal.buildOk),
  sealReport: seal ? seal.errors : ['seal agent failed'],
}
