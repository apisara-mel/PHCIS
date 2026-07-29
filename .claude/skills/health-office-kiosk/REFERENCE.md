# Health Office Kiosk — TOR & UI Reference

Facility branding in UI: **สำนักอนามัย** (and branch e.g. ศูนย์ 4 ดินแดง). Product/org wording may say สำนักงานอนามัย — same kiosk system.

## TOR §1.16 — ระบบงานตู้ Kiosk

Source: `docs/tor-checklist.html`.

### 1.16.1 ออกคิว และตรวจสอบสิทธิ Online กับ สปสช.

| ID | Requirement (สรุป) | Primary UI step | Typical status |
|----|-------------------|-----------------|----------------|
| 1.16.1.1 | ตรวจสิทธิจากบัตรประชาชน Online สปสช. | verify → confirm | partial (mock) |
| 1.16.1.2 | เก็บประวัติการตรวจสิทธิ | verify / audit stub | partial |
| 1.16.1.3 | มีประวัติในหน่วย → เลือกแผนก + ออกคิว | service → confirm → ticket | done / extend |
| 1.16.1.4 | ไม่มีประวัติ → ส่งคิวเวชระเบียน | verify fail / confirm branch | partial |
| 1.16.1.5 | ยืนยันเข้ารับบริการจากนัด Mobile App | appointment → confirm | partial |
| 1.16.1.6 | เครื่องอ่านบัตรประชาชน (Smart Card) | verify | todo (simulate) |
| 1.16.1.7 | กล้องบันทึกภาพ | verify / photo capture | todo |
| 1.16.1.8 | เครื่องอ่านบาร์โค้ด/QR | verify / appointment scan | todo |
| 1.16.1.9 | เครื่องพิมพ์เลขคิว | ticket · print | partial |
| 1.16.1.10 | เชื่อมโยง PHCIS | mock shared data → real API later | partial |
| 1.16.1.11 | Biometric identification | verify alternative | todo |

### 1.16.2 ปิดสิทธิ

| ID | Requirement | UI |
|----|-------------|-----|
| 1.16.2.1 | ยืนยันปิดสิทธิ สปสช. เมื่อสิ้นสุดบริการ | Separate end-of-visit kiosk mode or staff-triggered — usually **Phase / not in queue-issuance flow** |

### 1.16.3 รับชำระเงิน (Kiosk)

| ID | Requirement | UI |
|----|-------------|-----|
| 1.16.3.1 | EDC + QR ชำระค่าบริการ | payment step or finance service path |
| 1.16.3.2 | ออกใบเสร็จ | print / PDF |
| 1.16.3.3 | e-Receipt | mobile download / PNG (current ticket page analog) |
| 1.16.3.4 | เชื่อมบัญชีเจ้าหนี้/ลูกหนี้ | backend — UI only shows success + ref no. |

## Related TOR (outside §1.16 but kiosk-adjacent)

| ID | Why it matters for kiosk UI |
|----|----------------------------|
| 1.1.1.7–1.1.1.9 | เวชระเบียน fallback เมื่อตู้ขัดข้อง / อ่านบัตรไม่ได้ |
| 1.3.2.5–1.3.2.6 | พิมพ์คิว + เลือกประเภทบริการ |
| 1.3.4.4 | ดูสถานะคิวบนมือถือ |
| 4.12.2 | จ่ายบน Mobile หรือที่ตู้ Kiosk |

## Existing state machine

```
welcome → service → sub-service → appointment → verify → confirm → ticket
                         ↑ skip if service.drill === false
```

Routes:

- `/kiosk` — `KioskPage.jsx`
- `/kiosk/ticket/:queueId` — `MobileTicketPage.jsx`

## UX rules for สำนักงานอนามัย kiosk

| Rule | Detail |
|------|--------|
| Language | Thai primary; EN toggle (wire `lang` — full i18n may be partial) |
| Accessibility | ♿ entry; large type; high contrast brand tokens; touch ≥ 44px (prefer bigger) |
| Timeout | ~60s idle on in-flow steps → welcome (PDPA + shared device) |
| Identity | 13-digit Thai ID pad `X-XXXX-XXXXX-XX-X`; chip-read demo button |
| Errors | ไม่พบข้อมูล → suggest เคาน์เตอร์เวชระเบียน; never silent fail |
| Ticket leakage | Right-side / ticket panel only **after** verify (no queue # before ID) |
| Branding | Header gradient `#54AA8C → #4CC6AE` (exception); facility name + branch |
| Date/time | Thai Buddhist year (+543), tick per minute |

## Hardware stub pattern

When TOR requires device integration:

```text
UI: affordance (insert card / face camera / scan QR / pay EDC)
  → Demo / Simulate button (dev) OR disabled + "รอเชื่อมต่ออุปกรณ์"
  → On success: same confirm/ticket path as mock
  → tor-checklist: s:'partial', n:'simulated — no SDK'
```

Do not set `s:'done'` until real SDK + acceptance.

## Token quick list (kiosk)

| Use | Token |
|-----|-------|
| Screen bg | `--background-screen-brand-100` |
| Card radius outer | `--dim-radius-600` |
| Inner / Figma 14px | `--dim-radius-450` |
| Selected card | `--surface-brandPrimary-quaternary` + thick brand border |
| Shadow lift | `--shadow-brand-drop-bottom-200` |
| Overlay | `--surface-overlay-default` |
| Padding large | `--dim-space-800` / `--dim-space-1200` |

## Acceptance template (per TOR leaf)

```markdown
### TOR <id>
- Given: <precondition>
- When: <user action on kiosk>
- Then: <observable UI + queue/rights/payment outcome>
- Evidence: route `/kiosk` step `<name>` · mock/fixture `<…>`
```

## Updating tor-checklist.html

Find the STATUS entry for the ID (near `/* ===== 1.16 Kiosk`):

```js
'1.16.1.3': {s:'done', u:'/kiosk', n:'short note of what shipped'},
```

Use `partial` when UI exists but integration is mocked.
