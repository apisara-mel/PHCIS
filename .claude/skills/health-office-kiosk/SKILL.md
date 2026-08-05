---
name: health-office-kiosk
description: >-
  Builds or updates the สำนักงานอนามัย / สำนักอนามัย self-service kiosk UI
  by applying TOR requirements (esp. §1.16 Kiosk + related queue/rights items)
  onto the bma.kiosk app (production https://bma-kiosk.mih.co.th). Use when
  the user asks for kiosk UI, ตู้ Kiosk, กดบัตรคิว, สปสช. rights check at
  kiosk, EDC payment kiosk, walk-in vs appointment kiosk screens, or
  TOR-driven kiosk features for the health office.
---

# Health Office Kiosk UI (TOR-driven)

Build or extend the **ตู้ Kiosk** for สำนักงานอนามัย / สำนักอนามัย by treating **TOR** as the requirement source of truth, then mapping each TOR leaf into screens, states, and vibe-code in the **`bma.kiosk`** repo (sibling `../bma.kiosk`, deployed at https://bma-kiosk.mih.co.th/Kiosk/).

Do **not** invent features outside TOR without labelling them `นอกขอบเขต / Phase 2`. Do **not** add kiosk UI back into this monorepo — `/kiosk` here only redirects to production.

## Source of truth (read first)

| Artifact | Role |
|----------|------|
| [`docs/tor-checklist.html`](../../../docs/tor-checklist.html) | Canonical TOR tree — search `1.16`, statuses `done`/`partial`/`todo` |
| [`docs/progress-tracker.html`](../../../docs/progress-tracker.html) | Feature vs TOR coverage for ระบบงานตู้ Kiosk |
| [`docs/product-spec.md`](../../../docs/product-spec.md) §10.8 | State machine, layout, tokens, use cases |
| [`docs/kiosk-userflow.html`](../../../docs/kiosk-userflow.html) | Legacy screen mockups (reference only) |
| **`../bma.kiosk/src/pagesRegistry.tsx`** | Canonical Figma screens · `01-select-service` … `15-*` |
| **`../bma.kiosk/src/flow.ts`** | `flow` query param · `useFlowNav` · idle reset |
| [`docs/kiosk-split.md`](../../../docs/kiosk-split.md) | Production URL + redirect rules in this repo |
| [REFERENCE.md](REFERENCE.md) | TOR ID → screen matrix + UX rules |

Figma (when available): PHCIS \| KIOSK · file `PlyfeAl2AdZtqZK7eZrxKg` · see product-spec §10.8.

**Stitch reference (Green Modern TH):** [`docs/kiosk/stitch/`](../../../docs/kiosk/stitch/) — project `10817979751782111775`  
screens: service-select · rights-detail · payment-channel · payment-receipt (PNG + HTML).

## Hard rules

1. **Apply TOR first** — every new screen/control maps to ≥1 TOR ID (`1.16.x.x` or related). Update `tor-checklist.html` status when shipping.
2. **Reuse existing kiosk flow** — state machine `welcome → service → sub-service → appointment → verify → confirm → ticket` (skip `sub-service` when `drill === false`).
3. **Tokens only** — alias `design.md` / `src/index.css`; kiosk radii often `--dim-radius-450` (14px) and `--dim-radius-600` (24px). Gradient header is the documented exception.
4. **Touch-first** — targets ≥ `--dim-size-900` (44px), prefer larger kiosk hit areas (cards ~120px+ height). Idle timeout → reset to welcome.
5. **Standalone chrome** — no staff Sidebar/Header; fixed kiosk canvas (1440×1462 pattern) unless user asks for responsive.

Companions: [drawing-ui-on-figma](../drawing-ui-on-figma/SKILL.md) · [sync-mih-component](../sync-mih-component/SKILL.md) · [ux-assessment](../ux-assessment/SKILL.md) · [prototype-from-figma](../prototype-from-figma/SKILL.md) · **`kiosk-360-face-scan`** in [namonlims/claude-skills](https://github.com/namonlims/claude-skills/tree/main/kiosk-360-face-scan) (archived 360° head-pose scan — remove when switching to simple photo).

## Workflow checklist

```
Health-office kiosk UI:
- [ ] 1. TOR scope — list leaf IDs from docs/tor-checklist.html (§1.16 + related)
- [ ] 2. Gap — compare to progress-tracker / existing KioskPage steps
- [ ] 3. Traceability — TOR ID → step → UI state → acceptance
- [ ] 4. Design — PHCIS-ALL / KIOSK Figma or extend kiosk-userflow patterns
- [ ] 5. Implement — `../bma.kiosk/src/pages/*.tsx` + `flow.ts` (match Figma tokens)
- [ ] 6. Docs — product-spec §10.8, kiosk-userflow, tor-checklist status
- [ ] 7. Verify — primary TOR paths + idle/error/manual-ID use cases
```

### 1. Load TOR requirements

From `docs/tor-checklist.html` (or [REFERENCE.md](REFERENCE.md)), extract:

- **§1.16.1** ออกคิว + ตรวจสิทธิ Online สปสช. + อุปกรณ์ตู้  
- **§1.16.2** ปิดสิทธิ  
- **§1.16.3** รับชำระเงิน (EDC / ใบเสร็จ / e-Receipt)  
- Related: registration fallback if kiosk fails (`1.1.1.7–9`), queue print (`1.3.2.*`), mobile pay↔kiosk (`4.12.2`)

Mark each leaf: `done` | `partial` | `todo` from the checklist `STATUS` map.

### 2. Gap analysis

Produce a short table before coding:

| TOR ID | Status now | UI gap | Proposed step |
|--------|------------|--------|---------------|
| 1.16.1.1 | partial | Real สปสช. wire | verify |
| 1.16.1.6 | todo | Card reader | verify · hardware stub |

Only implement what the user asked for this turn; keep Phase 2 items listed.

### 3. Traceability matrix (required in summary)

```markdown
| TOR ID | Screen / step | Acceptance |
|--------|---------------|------------|
| 1.16.1.3 | confirm + service drill | มีประวัติ → เลือกแผนก → ออกคิว |
| 1.16.1.4 | verify fail → MR path | ไม่มีประวัติ → ส่งคิวเวชระเบียน |
```

### 4–5. Design & implement

**State machine (canonical):**

```
welcome → service → sub-service? → appointment → verify → confirm → ticket
```

| Step | TOR focus | UI notes |
|------|-----------|----------|
| welcome | — | Brand header สำนักอนามัย · ♿ · ไทย/EN · clock |
| service | 1.3.2.6, 1.16.1.3 | 6 service cards from `SERVICES` |
| sub-service | 1.16.1.3 | Drill clinics; skip if `!drill` |
| appointment | 1.16.1.5 | นัด / walk-in |
| verify | 1.16.1.1, .6–.8, .11 | Chip / manual 13-digit / biometric stub |
| confirm | 1.16.1.3–.5 | Patient + dept + rights result |
| ticket | 1.16.1.9–.10, 1.16.3.* | Print · QR → `/kiosk/ticket/:id` |

**Hardware / integration stubs** (when TOR requires but no SDK): show UI affordance + `note:` / disabled state + mock success path — never fake production integration as done in TOR checklist without labelling `partial` / simulated.

**Mock data:** extend `kioskMock.js` (patients, appointments, services) — keep deterministic queue numbers.

**Icons:** Material Symbols (same pattern as KioskPage `<Sym>`).

### 6. Update docs when shipping

| File | Update |
|------|--------|
| `docs/tor-checklist.html` | Set `s:'done'|'partial'` + `u` route + `n` note |
| `docs/product-spec.md` §10.8 | New steps / use cases |
| `docs/kiosk-userflow.html` | New screens if flow changed |
| `docs/progress-tracker.html` | Only if leaf counts/status narrative change |

### 7. Verify (TOR use cases)

Minimum paths (also in product-spec):

1. นัดล่วงหน้า → chip → print  
2. Walk-in → chip → QR mobile ticket  
3. Manual 13-digit ID  
4. ID not found → error + suggest counter / MR  
5. Service without drill (pharmacy/lab)  
6. Idle ~60s → welcome  
7. Accessibility: large touch, language toggle, ♿ entry if in TOR/Figma  

Optional: run [ux-assessment](../ux-assessment/SKILL.md) for contrast/touch.

## Outside TOR

If the user asks for something not in §1.16 / related leaves:

1. Say **นอกขอบเขต TOR**  
2. Offer Phase 2 label  
3. Do not mark `done` in tor-checklist  

## Anti-patterns

- ❌ New kiosk route that duplicates `/kiosk` without TOR gap  
- ❌ Staff AppShell chrome on kiosk  
- ❌ Tiny text/buttons (staff-desktop density)  
- ❌ Claiming สปสช./EDC/biometric `done` when only mocked  
- ❌ Skipping tor-checklist update after UI ship  

## Resources

- TOR ID matrix + hardware stubs → [REFERENCE.md](REFERENCE.md)
- Existing flow detail → `docs/product-spec.md` §10.8 · `docs/kiosk-userflow.html`
