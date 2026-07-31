# Awaiting components

Vibe-code components that do **not** exist in the MIH Design System yet.

Rule of the road: before building any new UI, search `src/components/` and
[`design.md`](../design.md) first. If the thing genuinely isn't there, say so
out loud ("ยังไม่มีใน DS"), build it locally, and register it here. Promote an
entry into the design system (Figma + `design.md` §6 + `ComponentsLibraryPage`)
once it has **≥2 call sites** — one use is a page detail, two is a pattern.

| Component | Path | Used by | Sites | Status | Notes |
|---|---|---|---|---|---|
| `XrayReportSheet` | `src/components/xray/XrayReportSheet.jsx` | `/preview/xray-sheets`, `/xray/result`, `/xray/order` | 3 | **documented in DS** (design.md §6.35) · library demo pending | Printed paperwork of งานรังสีวินิจฉัย — 4 variants: `report` ใบรายงานผลการตรวจ (TOR §1.12.6.5) · `request` ใบส่งตรวจ · `appointment` ใบนัดตรวจ · `filmLabel` ฉลากติดซองฟิล์ม 70×40 mm. Replaced the local `ReportSheet` in XrayResultPage and the toast-only print modal in XrayOrderPage. `/preview/xray-sheets` is its living demo, so a `ComponentsLibraryPage` entry is duplicated effort until a second domain needs print sheets. |
| `XrayOrderPicker` | `src/components/xray/XrayOrderPicker.jsx` | `/xray/order`, CPOE `TreatmentSteps.jsx` step 5 | 2 | **ready to promote** | Radiology exam picker (popup + embedded variants) with modality/region filters, ชุดรายการตรวจ, per-สิทธิ price/claim and the §1.12.5.9 duplicate-order warning. Already at 2 call sites — the LIS side (`LabOrderPicker`, other branch) is the same shape, so the DS component should probably be a generic `OrderPicker` with a catalog adapter. |

## Notes on `XrayReportSheet`

- **Deliberately not themed.** Paper has no dark mode; aliasing
  `--surface-card-100` / `--text-content-default` would make the sheet print
  near-blank under `[data-mode="dark"]`. Ink/paper/rule are pinned to the
  light-mode values of the tokens they mirror.
- **Token request for `@mih/design-tokens`** (propose, don't push — that repo
  is read-only from here): a print medium set so the sheet can alias tokens
  like everything else —
  `--print-paper` `#FFFFFF`, `--print-ink` `#363B3F`,
  `--print-ink-soft` `#636B72`, `--print-ink-muted` `#858C92`,
  `--print-rule` `#E2E4E6`.
- **Known gap:** the film label prints the XN as large letterspaced digits in
  place of a real Code128 barcode. No barcode renderer exists on this branch
  and adding a dependency was out of scope; the label is usable by eye until
  one is added.
