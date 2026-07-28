# PROTOTYPE — lab module main view

**Question:** What should the `lab` (ห้องปฏิบัติการ) module's main queue view
look like? `lab` is currently a Sidebar stub (`src/components/layout/Sidebar.jsx:58`,
icon `biotech`, no route) — see `product-spec.md` §10.2 and `user-flow.md` §9.2
in the `MIH-Docs-Vault` Obsidian vault for the intended scope: lab test
ordering + result viewer, sample-collection pipeline (collected → analysing
→ reported), critical-value alerts back to the ordering doctor, historical
trend view, fed by Treatment Step 5 `labs[]` orders.

**Route:** `/prototype/lab` (throwaway — not linked from the Sidebar;
`lab`'s stub status is untouched).

**Verdict:** Table + status filter (was Variant B), with a search box
(patient / HN / test / doctor) above the table, plus click-a-row → detail
panel (ported from the List+detail direction, was Variant C) shown split on
the right — result summary, normal range, critical-value banner, historical
trend chart. The Kanban-columns direction (was Variant A) and the
list-only-detail direction were tried and dropped in favor of this combined
shape.

**Cleanup when done:** delete `LabQueuePrototypePage.jsx`, move
`variants/LabQueueVariantB.jsx` + `LabDetailPanel.jsx` into a real page
(e.g. `LabQueuePage.jsx`), delete the `/prototype/lab` route in
`Routes.jsx`, wire `Sidebar.jsx`'s `lab` entry to a real `path`, and replace
`labOrdersPrototype.js` mock data with real data wiring. Delete this file
once folded in.

## TOR compliance pass (ภาคผนวก ก §1.15 ระบบงานห้องปฏิบัติการ)

Checked the prototype against the OCR'd TOR text (scanned PDF, no text
layer — `MIH-Docs-Vault/TOR/02-ภาคผนวก-ก.pdf` pages 38–39, extracted via
`pdftoppm` + `tesseract -l tha+eng`). Added everything that's in-scope for
this queue/result-viewing page:

- §1.15.4.10 — category action bar + own table column (โลหิตวิทยา/เคมีคลินิก/
  น้ำเหลืองวิทยา/จุลชีววิทยา/สารเสพติด) — 3 new mock tests added so every
  category has data
- §1.15.4.9  — ระดับความเร่งด่วน (STAT/Routine) own column + filter, ชุดตรวจ
  (test panel, e.g. "CBC + BUN/Cr + electrolyte panel") column via
  `resolvePanel()`, สิ่งส่งตรวจ (specimen) column, ราคา column + total-of-
  filtered-rows footer, delete action per row with a confirmation dialog
  (same `AlertDialog type='warning'` icon convention as ScreeningPage's
  `UnsavedChangesPopup`)
- §1.15.4.6  — "ผลผิดปกติ" flag, distinct from "ค่าวิกฤต" (critical)
- §1.15.3.2  — reference range resolved per patient sex/age
  (`resolveReferenceRange()`), not a single flat string
- §1.15.2.4  — confidential-result masking (Anti-HIV) with reveal toggle
- §1.15.6.3  — print-result button, gated on status='reported' and unmasked

**Deliberately out of scope for this page** (belong elsewhere per
product-spec.md): §1.15.1 LIS integration (backend), §1.15.3.1/3.3 test
registry + rights-based pricing config (admin screen), §1.15.4.1–4.4/4.7–4.8
order placement + reorder + duplicate/pre-order alerts (Treatment Step 5),
§1.15.5 sticker/barcode printing (sample-collection desk), §1.15.6.1–6.2
result entry + external-lab results (lab tech's data-entry screen).

**Known simplification:** deleting a row only removes it from this table's
local state (`liveRows`) — the sticky status-tab counts in
`LabQueuePrototypePage` (`LAB_TABS`) stay computed from the original seed
data. A real implementation would lift that count too.
