export const meta = {
  name: 'build-tor-wave',
  description: 'Build a wave of PHCIS TOR modules: spec → build → integrate → verify → fix',
  whenToUse:
    'Run with args = array of module descriptors [{id:"1.10.3", name:"งานสุขภาพจิต", route:"/clinic/mental-health", dir:"src/pages/clinic/mental-health", manual:"คู่มือระบบสุขภาพจิตและคลินิกสุขภาพจิต.pdf", extraSections:[], notes:""}]. Wave plan lives in docs/tor-sprint-plan-2026-08.md.',
  phases: [
    { title: 'Spec', detail: 'per module: TOR leaves + legacy manual + reuse map → screen spec' },
    { title: 'Build', detail: 'per module: create pages/data/components in own dirs only' },
    { title: 'Integrate', detail: 'single agent wires routes, nav, checklist, awaiting-components' },
    { title: 'Verify', detail: 'local build + per-module review (bugs, tokens, edge cases, UX score)' },
    { title: 'Fix', detail: 'apply confirmed fixes, rebuild' },
  ],
}

let modules = args
if (typeof modules === 'string') modules = JSON.parse(modules)
if (!Array.isArray(modules) || modules.length === 0) {
  throw new Error('args must be a JSON array of module descriptors — see docs/tor-sprint-plan-2026-08.md')
}

const PLAYBOOK = 'docs/tor-wave-playbook.md'

const SPEC_SCHEMA = {
  type: 'object',
  required: ['moduleId', 'summary', 'screens'],
  properties: {
    moduleId: { type: 'string' },
    summary: { type: 'string' },
    screens: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'route', 'purpose'],
        properties: {
          name: { type: 'string' },
          route: { type: 'string' },
          purpose: { type: 'string' },
          reuses: { type: 'array', items: { type: 'string' } },
          torIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    edgeCases: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
  },
}

const MANIFEST_SCHEMA = {
  type: 'object',
  required: ['moduleId', 'filesCreated', 'routes', 'checklistUpdates'],
  properties: {
    moduleId: { type: 'string' },
    filesCreated: { type: 'array', items: { type: 'string' } },
    routes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['path', 'importName', 'importPath'],
        properties: {
          path: { type: 'string' },
          importName: { type: 'string' },
          importPath: { type: 'string' },
          exact: { type: 'boolean' },
        },
      },
    },
    navEntries: {
      type: 'array',
      items: {
        type: 'object',
        required: ['menu', 'label', 'path'],
        properties: {
          menu: { type: 'string' },
          label: { type: 'string' },
          path: { type: 'string' },
          icon: { type: 'string' },
        },
      },
    },
    checklistUpdates: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { enum: ['done', 'partial', 'todo'] },
          url: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
    newComponents: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'usedIn', 'reason'],
        properties: {
          name: { type: 'string' },
          usedIn: { type: 'string' },
          reason: { type: 'string' },
        },
      },
    },
    notes: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  required: ['moduleId', 'uxScore', 'issues'],
  properties: {
    moduleId: { type: 'string' },
    uxScore: { type: 'number' },
    issues: {
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
        },
      },
    },
  },
}

const BUILD_CHECK_SCHEMA = {
  type: 'object',
  required: ['buildOk', 'errors'],
  properties: {
    buildOk: { type: 'boolean' },
    errors: { type: 'array', items: { type: 'string' } },
  },
}

const modDesc = (m) =>
  `Module TOR §${m.id} "${m.name}" — base route ${m.route}, owned dir ${m.dir}` +
  (m.extraSections && m.extraSections.length ? `, also covers TOR §${m.extraSections.join(', §')}` : '') +
  (m.manual ? `, legacy manual: ~/MIH-Docs-Vault/คู่มือระบบงาน/${m.manual}` : '') +
  (m.notes ? `. Notes: ${m.notes}` : '')

log(`Wave: ${modules.length} modules — ${modules.map((m) => '§' + m.id).join(', ')}`)

// ---- Spec + Build: pipelined per module (no barrier between the two stages) ----
const manifests = (
  await pipeline(
    modules,
    (m) =>
      agent(
        `You are the spec author for one PHCIS TOR module. READ FIRST: ${PLAYBOOK} (mandatory contract) and CLAUDE.md.\n` +
          `${modDesc(m)}\n` +
          `1. Run: node scripts/tor-gap-report.mjs --section ${m.id}` +
          (m.extraSections || []).map((s) => ` && node scripts/tor-gap-report.mjs --section ${s}`).join('') +
          ` — every ❌/🟡 leaf is in scope.\n` +
          `2. Skim the legacy HCIS manual PDF listed above (Read tool, first ~15 pages) for real-world workflow, fields, and vocabulary.\n` +
          `3. Study the reference pattern: src/pages/treat/anc/ (queue + record via shells) and the module's nearest existing siblings. Map every screen to EXISTING components/shells (design.md §6) — reuse aggressively.\n` +
          `4. Produce the screen spec: minimal set of screens that covers ALL in-scope TOR leaves, each screen listing torIds it satisfies, components it reuses, and its edge cases (empty / validation / cancel-edit / no-rights / audit trail per playbook §5).\n` +
          `Do NOT write any code. Return the spec as structured output.`,
        { label: `spec:${m.id}`, phase: 'Spec', schema: SPEC_SCHEMA }
      ),
    (spec, m) =>
      agent(
        `You are the builder for PHCIS TOR module §${m.id} "${m.name}". READ FIRST: ${PLAYBOOK} (mandatory) + CLAUDE.md, then follow this approved spec exactly:\n` +
          JSON.stringify(spec) +
          `\n${modDesc(m)}\n` +
          `Build every screen in the spec as React 17 JSX pages with realistic Thai mock data (Bangkok health-center context).\n` +
          `HARD RULES:\n` +
          `- Create/edit files ONLY inside your owned dirs (${m.dir}, src/data/, and a module component dir if needed). NEVER touch Routes.jsx, systemCatalog, sidebar/nav, docs/*, design.md, tokens.css, or another module's files (playbook §4).\n` +
          `- Every value aliases a design token with a truthful fallback; icons via <Icon>/Lucide adapter only; React-17-safe hooks only; Tailwind var() color classes forbidden; inline padding/margin longhand only; SuggestibleTextarea with suggestions+minChars for clinician text.\n` +
          `- Cover every state and edge case in the spec; every "แสดง/บันทึก/ยกเลิก/แก้ไข" TOR leaf gets all four actions.\n` +
          `- Reuse existing components; anything genuinely new goes in your module dir and is reported in newComponents (do NOT edit awaiting-components.md yourself).\n` +
          `When done, verify each created file parses (node --check is not valid for JSX — instead re-read your files for balanced JSX and correct imports), then return the integration manifest (playbook §7) as structured output. checklistUpdates must be honest — partial with a note beats fake done.`,
        { label: `build:${m.id}`, phase: 'Build', schema: MANIFEST_SCHEMA }
      )
  )
).filter(Boolean)

if (!manifests.length) throw new Error('No module produced a manifest — nothing to integrate')
log(`Build done: ${manifests.length}/${modules.length} manifests`)

// ---- Integrate: ONE agent owns all shared files (barrier is required here) ----
await agent(
  `You are the sole integrator for this wave. READ FIRST: ${PLAYBOOK}. You are the ONLY agent allowed to edit shared files. Apply ALL of these module manifests:\n` +
    JSON.stringify(manifests) +
    `\nTasks, in order:\n` +
    `1. src/routes/Routes.jsx — add lazy/regular imports + <Route> entries per manifest (match existing file style; react-router v5 Switch; more-specific paths before less-specific).\n` +
    `2. Navigation — wire navEntries into src/data/systemCatalog.js and/or the sidebar config the way existing modules are wired (study how /treat/anc and /pharmacy appear first). Icons must be valid Material Symbols names.\n` +
    `3. docs/tor-checklist.html — update the status map entries per checklistUpdates (same format as existing '<id>': {s:'done', u:'/route', n:'note'}).\n` +
    `4. docs/awaiting-components.md — register every newComponents entry following the file's existing format and rules (status 🕐 รอเคสที่ 2, log date, proposed API).\n` +
    `5. docs/progress-tracker.html — refresh the per-system counts for the touched sections if the file's data format makes that straightforward; skip with a note if not.\n` +
    `Then run: node scripts/tor-gap-report.mjs --todo and include its output in your final report. Report exactly what you changed.`,
  { label: 'integrate', phase: 'Integrate' }
)

// ---- Verify: global build + per-module reviews run together ----
const [buildCheck, ...reviews] = await parallel([
  () =>
    agent(
      `Verify the app builds after this wave. Follow ${PLAYBOOK} §6 exactly: sync the Drive repo to ~/MIH-PHCIS-local using the rsync command found inside ~/MIH-PHCIS-local/dev.sh (do NOT start the dev server), then run the production build there with Node 16. Report buildOk and every error verbatim. If the build fails, do NOT fix anything — just report.`,
      { label: 'verify:build', phase: 'Verify', schema: BUILD_CHECK_SCHEMA }
    ),
  ...manifests.map((mf) => () =>
    agent(
      `Adversarial reviewer for TOR module §${mf.moduleId}. READ FIRST: ${PLAYBOOK} + CLAUDE.md. Manifest: ${JSON.stringify(mf)}\n` +
        `Review every file in filesCreated. Hunt for REAL defects only:\n` +
        `1. Bugs: broken imports, undefined vars, React-17-illegal hooks (useId/useSyncExternalStore/useDeferredValue/useTransition/useInsertionEffect), state bugs, broken handlers, react-router v5 misuse.\n` +
        `2. Token compliance: raw hex matching an existing token, numeric radius/padding/fontSize literals, fontWeight numbers, shadow literals, lying var() fallbacks, Tailwind bg-[var(--x)] classes, inline padding/margin shorthand carrying var().\n` +
        `3. Icon rule: inline <svg> for glyphs that exist in Material Symbols/Lucide, or non-approved icon sets.\n` +
        `4. TOR coverage honesty: spot-check 5 random checklistUpdates marked done against the actual UI code — flag any that overstate.\n` +
        `5. Edge cases per playbook §5 (empty/validation/cancel-edit/no-rights/audit) — flag missing ones.\n` +
        `6. Score the module 0-10 on ux-heuristics (Nielsen: visibility of status, match to real workflow from the legacy manual, consistency with sibling modules, error prevention, recognition over recall).\n` +
        `Do NOT edit any file. Return structured issues (each with a concrete fix) + uxScore. An empty issues list is a valid answer if the module is genuinely clean.`,
      { label: `review:${mf.moduleId}`, phase: 'Verify', schema: REVIEW_SCHEMA }
    )
  ),
])

const validReviews = reviews.filter(Boolean)
const allIssues = validReviews.flatMap((r) => r.issues.map((i) => ({ ...i, moduleId: r.moduleId })))
const buildErrors = buildCheck && !buildCheck.buildOk ? buildCheck.errors : []
log(
  `Verify: build ${buildCheck ? (buildCheck.buildOk ? 'OK' : 'FAILED') : 'unknown'}, ` +
    `${allIssues.length} issues, UX scores: ${validReviews.map((r) => `§${r.moduleId}=${r.uxScore}`).join(' ')}`
)

// ---- Fix: one fixer per module with issues, plus one for build errors ----
const needsFix = allIssues.length > 0 || buildErrors.length > 0
if (needsFix) {
  const byModule = {}
  for (const i of allIssues) (byModule[i.moduleId] ||= []).push(i)
  await parallel(
    Object.entries(byModule).map(([modId, list]) => () => {
      const mf = manifests.find((m) => m.moduleId === modId)
      return agent(
        `Fixer for TOR module §${modId}. READ FIRST: ${PLAYBOOK} + CLAUDE.md. Fix EVERY confirmed issue below in the module's own files (${JSON.stringify(mf ? mf.filesCreated : [])}). If a fix requires touching a shared file (Routes.jsx, nav, docs), report it back instead of editing.\n` +
          JSON.stringify(list) +
          `\nAlso fix anything among these global build errors that points into this module's files: ${JSON.stringify(buildErrors)}\n` +
          `Verify each fix by re-reading the file. Report what you fixed and anything you had to skip.`,
        { label: `fix:${modId}`, phase: 'Fix' }
      )
    })
  )
  if (buildErrors.length) {
    await agent(
      `Shared-file fixer. These build errors remain after per-module fixes ran: ${JSON.stringify(buildErrors)}. Fix any that live in shared files (src/routes/Routes.jsx, nav/systemCatalog) — you are authorized to edit shared files. Skip errors already fixed inside module dirs.`,
      { label: 'fix:shared', phase: 'Fix' }
    )
  }
  const recheck = await agent(
    `Re-verify the build after fixes, same procedure as before (${PLAYBOOK} §6: rsync to ~/MIH-PHCIS-local, Node 16 vite build, no dev server). Report buildOk + errors verbatim.`,
    { label: 'verify:rebuild', phase: 'Fix', schema: BUILD_CHECK_SCHEMA }
  )
  log(`Rebuild: ${recheck && recheck.buildOk ? 'OK' : 'STILL FAILING — needs manual attention'}`)
  return {
    modules: manifests.map((m) => m.moduleId),
    manifests,
    issuesFound: allIssues.length,
    uxScores: validReviews.map((r) => ({ id: r.moduleId, score: r.uxScore })),
    finalBuildOk: !!(recheck && recheck.buildOk),
    remainingErrors: recheck ? recheck.errors : ['recheck agent failed'],
  }
}

return {
  modules: manifests.map((m) => m.moduleId),
  manifests,
  issuesFound: 0,
  uxScores: validReviews.map((r) => ({ id: r.moduleId, score: r.uxScore })),
  finalBuildOk: !!(buildCheck && buildCheck.buildOk),
  remainingErrors: buildErrors,
}
