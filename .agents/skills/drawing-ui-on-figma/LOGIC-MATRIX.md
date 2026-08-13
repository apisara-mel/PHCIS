# Logic & Use-Case Matrix

Requirement **8**: every drawn UI must express **logic and all use cases**. Treat matching as **case-insensitive** — component names, variant props, layer searches, and state labels (`Default` = `default` = `DEFAULT`).

For each screen, produce frames or variant sets covering applicable rows below. Skip rows marked N/A with a `note:na-<reason>` layer.

## Universal interaction states

Apply to buttons, inputs, tabs, list rows, icon buttons, switches, checkboxes:

| State | Visual signal | When |
|-------|---------------|------|
| Default | Resting tokens | Initial render |
| Hover | Hover surface/border tokens | Pointer over (desktop) |
| Focus | Focus ring (`border-brandPrimaryButton-tertiary` / input focus glow) | Keyboard focus |
| Active / Pressed | Darker fill or inset shadow | Mouse down |
| Selected / Toggled | Selected/quaternary surface | Toggle on, row selected |
| Disabled | `--surface-disabled-*`, muted text | Action unavailable |
| Loading | Spinner or skeleton; disabled primary | Async in flight |
| Error | Danger border/text; inline message | Validation / API failure |
| Success | Positive badge/toast | Completed action |

## Screen-level states

| State | Apply to | Figma expression |
|-------|----------|------------------|
| Empty | Tables, search results, queues | Table empty row + illustration slot; `note:emptyMessage` |
| Loading | Initial fetch | Skeleton rows (`Table` loading) or shimmer blocks |
| Partial | Filters applied, few results | Summary count + truncated table |
| Full | Max data page | Pagination active |
| Error (page) | Load failed | AlertDialog or inline banner + retry |
| Permission denied | gated action | AlertDialog; primary disabled |
| Unsaved changes | form exit | UnsavedChangesPopup (Popup library) |
| Edit mode | queue reorder | Drag handle column visible; pagination hidden |

## Text & content edge cases

Design **at least one** frame or variant for each relevant row:

| Edge case | Test content | Expected behavior |
|-----------|--------------|-------------------|
| Long Thai name | 30+ char patient name | Ellipsis + tooltip |
| Long HN / ID | `HN-2568-0000123456` | No column blowout |
| Short / missing optional | Empty CC, no telemed badge | Cell blank, not broken layout |
| Multi-line CC | 2-line chief complaint | Row height grows or ellipsis |
| Zero counts | Summary card `0` | Still readable, no collapse |
| Max counts | `999+` queue depth | Badge overflow rules |
| All filters active | Every chip selected | Overflow row `+N more` |
| Date edge | Yesterday / custom range | FilterDateTag states |

## Domain-specific (PHCIS)

| Domain | Use cases | Components / notes |
|--------|-----------|-------------------|
| Registration | Smart card read fail; duplicate HN; step incomplete | StepProgress incomplete steps; AlertDialog |
| OPD screening | Draft saved; vitals abnormal highlight; bed selection branch | ColorfulBadge vitals colors; BedSelectionPopup |
| Treatment queue | Tab filters; telemed badge states (early/countdown/due/overdue/expired); edit mode drag | `TelemedicineQueueBadge`; Table sticky cols |
| Treatment form | Read-only steps 1–2; ICD search empty; unsaved CPOE | Stepper locked steps; AISearch empty |
| Telemed | Permission denied; device not found; waiting room; patient cam off; poor connection; post-call summary | Popup + badge variants; `note:timeout` |
| Consent / admin | Bulk select none; export disabled | Checkbox indeterminate if supported else note |

## Popup / modal flows

For each modal, minimum **3 frames**:

1. **Trigger context** — underlying screen with affordance visible  
2. **Open** — modal centered/scrim `@ 50%` overlay token  
3. **Outcome** — confirm success OR error inline OR dismiss back to trigger  

Add **4th** for destructive confirm (Danger primary on confirm).

## Table flows

| Case | Show |
|------|------|
| Sortable header | `unfold_more` icon on applicable columns |
| Sorted asc/desc | `expand_less` / `expand_more` |
| Sticky columns | First N columns pinned (queue, HN, name) |
| Row hover | `--surface-table-hover` |
| Row click | Optional chevron / action column |
| Empty | Title + optional subtext + illustration |
| Pagination | Sticky bottom pager; page 1 and last page |
| Edit mode | Drag handle column; no row navigation |

## Checklist before sign-off

```
Logic coverage:
- [ ] Happy path frame exists
- [ ] Empty state (if data-driven)
- [ ] Loading state (if async)
- [ ] Error state (validation or system)
- [ ] Disabled / permission blocked (if actions exist)
- [ ] Long-content variant (Thai overflow)
- [ ] Modal open + close path (if popups)
- [ ] Mobile or narrow width (if responsive) — optional second frame
- [ ] Annotations (`note:*`) for timers, PDPA, role gates
```

If a use case is out of scope for the request, add `note:deferred-<case>` rather than omitting silently.
