# Accessibility Checklist (WCAG 2.2 AA + MIH)

Map findings to **WCAG** success criteria. Prefer fixes that use **design.md tokens** — never recommend raw hex.

## Perceivable

| Check | WCAG | MIH guidance |
|-------|------|--------------|
| Text contrast ≥ 4.5:1 (body), ≥ 3:1 (large 18px+ / bold 14px+) | 1.4.3 | Use `--text-content-*` on `--surface-*` / `--surface-card-*`; verify dark mode |
| UI component contrast ≥ 3:1 vs adjacent colors | 1.4.11 | Borders, icons, focus rings — `--border-*`, `--icon-*` |
| Information not conveyed by color alone | 1.4.1 | Status badges include text/icon; vitals abnormal = color + value context |
| Images have purpose text | 1.1.1 | `alt=""` decorative; meaningful `alt` or `aria-hidden` + visible label |
| Resize to 200% without loss | 1.4.4 | Avoid fixed px widths on text containers; use flex/min-width 0 + ellipsis + tooltip |
| Reflow at 320px width | 1.4.10 | Mobile routes `/m/*`; no horizontal scroll for primary task |
| Motion respects `prefers-reduced-motion` | 2.3.3 | Popups/modals — see `design.md` motion tokens |

## Operable

| Check | WCAG | MIH guidance |
|-------|------|--------------|
| All functionality via keyboard | 2.1.1 | Tab order logical; no `tabIndex` traps except modals |
| Focus visible | 2.4.7 | `--focus-ring-*` / input hover ring; custom inputs strip native chrome but keep focus on wrapper |
| Touch target ≥ 44×44 CSS px | 2.5.5 (AAA, target AA practice) | `--dim-size-900`; circle icon buttons 36px min — flag if below 44 on mobile |
| No keyboard trap (except modal) | 2.1.2 | AlertDialog returns focus on close |
| Skip redundant navigation | 2.4.1 | Staff app uses persistent side menu — ensure main landmark |
| Page title / heading hierarchy | 2.4.2, 1.3.1 | One `h1` per view; queue title in shell |
| Link/button purpose clear | 2.4.4 | Icon-only → `accessibilityLabel`; Thai verbs consistent |
| Target size spacing | 2.5.8 | Adjacent tap targets not overlapping hit areas |

## Understandable

| Check | WCAG | MIH guidance |
|-------|------|--------------|
| Language of page | 3.1.1 | `<html lang="th">` or Thai primary |
| Labels on inputs | 3.3.2 | `InputField` label + error text; search placeholders not sole label |
| Error identification | 3.3.1 | Inline validation; AlertDialog for blocking errors |
| Error suggestion | 3.3.3 | "กรุณากรอก HN 13 หลัก" not just "invalid" |
| Consistent navigation | 3.2.3 | QueuePageShell, tabs, filters same across MR/OPD/Treat |
| Confirm destructive actions | 3.3.4 | ยกเลิกคิว, ลบรายการ, end telemed call |

## Robust

| Check | WCAG | MIH guidance |
|-------|------|--------------|
| Valid roles/states | 4.1.2 | `aria-pressed` toggles; `aria-expanded` accordions; `aria-disabled` |
| Name, role, value for custom controls | 4.1.2 | Switch, Checkbox, Select wrappers expose state |
| Status messages | 4.1.3 | Toast/small alert announced — `role="status"` or live region where used |

## Component spot-checks (code)

| Component | Required |
|-----------|----------|
| `*IconButton` | `accessibilityLabel` / `aria-label` |
| `Table` row click | Keyboard Enter/Space on row if clickable |
| `Pagination` | Current page announced; buttons labeled |
| `FilterDropdown` | Keyboard open/close; selected state visible |
| `PrimarySearch` | Combobox pattern or label; history keyboard nav |
| `AlertDialog` | Focus initial element; Esc; focus restore |
| `ColorfulBadge` | Text label inside — not color-only |
| `TelemedicineQueueBadge` | Link text or aria-label for state (due/overdue) |

## Contrast quick-reference (semantic pairs)

Verify in **light and dark** when assessing staff UI:

| Use | Text token | Surface token |
|-----|------------|---------------|
| Body on card | `--text-content-default` | `--surface-card-100` |
| Secondary meta | `--text-content-secondary` | `--surface-card-100` |
| Table cell | `--text-table-title` | `--surface-table-header` |
| Primary button label | `--text-brandPrimaryButton-on-default` | `--surface-brandPrimaryButton-default` |
| Disabled | `--text-disabled-*` | `--surface-disabled-*` |
| Error inline | `--text-danger-default` | `--surface-card-100` |

If contrast fails, **change the token pair** in Figma/code — do not patch with one-off hex.

## States to audit (not just default)

Empty · Loading · Error · Disabled · Focus · Hover · Long content · Dark mode · High zoom (200%)
