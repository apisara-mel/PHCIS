# Heuristic Evaluation

Based on **Nielsen's 10 usability heuristics**, extended for **hospital staff workflows** (PHCIS). Rate each heuristic 1–5 for the scoped screen; document violations as findings.

## Nielsen's 10 heuristics

| # | Heuristic | PHCIS questions |
|---|-----------|-----------------|
| 1 | **Visibility of system status** | Does the user see queue position, save/draft state, loading, telemed connection? Are tabs/filters reflecting active state? |
| 2 | **Match real world** | Thai clinical terms (HN, สิทธิ์, CC, คิว)? Order matches hospital workflow (ลงทะเบียน → คัดกรอง → ตรวจ)? |
| 3 | **User control & freedom** | Undo draft, cancel popup, back from form without data loss (`UnsavedChangesPopup`)? Clear exit from telemed? |
| 4 | **Consistency & standards** | Same button hierarchy (Brand primary / Neutral subdue / Danger)? Same table/filter patterns across queues? |
| 5 | **Error prevention** | Confirm before destructive acts? HN/patient identity visible on treat screen? Disabled submit until valid? |
| 6 | **Recognition over recall** | Patient card sticky; filters show current values; ICD/search suggestions — not memorizing codes |
| 7 | **Flexibility & efficiency** | Keyboard shortcuts/search for power users? Edit queue order? Smart card read? |
| 8 | **Aesthetic & minimalist design** | Only task-relevant fields visible? Summary cards not duplicating table? Progressive disclosure on long forms |
| 9 | **Help users recover from errors** | Plain Thai error messages + next step? Retry on network? Validation at field level |
| 10 | **Help & documentation** | Tooltips on abnormal vitals? `note:*` in Figma? In-app hints for rare flows (bed selection) |

**Scoring:** 5 = no issues · 4 = minor · 3 = major on secondary path · 2 = major on primary path · 1 = blocks task

## Healthcare-specific heuristics (add to review)

| # | Heuristic | Check |
|---|-----------|-------|
| H11 | **Patient identity safety** | Name + HN + photo visible before clinical write actions; wrong-patient risk mitigated |
| H12 | **Clinical urgency** | Urgent/wait-time visible in queue; telemed overdue states obvious |
| H13 | **Interruption tolerance** | Draft save, session recovery, clear unsaved state when switching tabs |
| H14 | **Dual attention** | High scannability — table zebra/hover, badges, align numbers for comparison |
| H15 | **Privacy (PDPA)** | Sensitive data masked where appropriate; consent before recording/telemed |
| H16 | **Fatigue-resistant density** | 8+ hour shift: contrast, spacing, not all-bold; critical info stands out |
| H17 | **Multilingual clarity** | Thai primary; medical abbreviations explained once; no ambiguous icons |

## Usability dimensions (task-level)

Score each 1–5 for the **primary task** defined in scope:

| Dimension | Question |
|-----------|----------|
| **Learnability** | First-time staff user understands without training doc? |
| **Efficiency** | Expert completes task with minimal clicks/scroll? |
| **Memorability** | Returning after a week — where is the action? |
| **Errors** | How likely is a slip? How severe? Recoverable? |
| **Satisfaction** | Feels trustworthy for clinical use? |

## Common PHCIS anti-patterns

| Pattern | Heuristic violated | Fix direction |
|---------|-------------------|---------------|
| Primary action buried in ⋮ menu | #4, #8 | Promote to row action or toolbar |
| Status only as colored dot | #1, A11y 1.4.1 | Add badge text |
| 5-step form with no progress | #1 | `StepProgress` with completed steps |
| Same verb for save and submit | #2 | บันทึกร่าง vs ยืนยัน |
| Modal with no cancel | #3 | Neutral subdue cancel |
| Table with no empty state | #9 | Empty message + filter hint |
| Telemed entry only via hidden gesture | #7 | Visible badge/link in queue column |
| Truncated patient name, no tooltip | #6, A11y | `EllipsisText` + title tooltip |

## Severity mapping (heuristic → report)

| Heuristic issue | Typical severity |
|-----------------|------------------|
| Wrong patient / data loss | **Critical** |
| Primary task blocked | **Critical** |
| Error with no recovery | **Major** |
| Inconsistent with rest of PHCIS | **Major** |
| Secondary path friction | **Minor** |
| Cosmetic inconsistency | **Suggestion** |

## Review order

1. Walk **primary task** happy path (heuristics #1–#5, H11–H12)
2. Walk **error and edge paths** (#9, H13, empty/disabled)
3. Compare to **reference screen** in same subsystem (Registration vs OPD vs Treat queue)
4. Cross-check **mobile** route if staff use tablet
