# Smart Service Kiosk UI — Stitch export

**Project:** Smart Service Kiosk UI  
**Stitch project ID:** `10817979751782111775`  
**Fetched:** see `manifest.json`

Standalone reference package for สำนักงานอนามัย kiosk screens (not mixed into staff PHCIS pages). Use with skill `health-office-kiosk` when implementing `/kiosk`.

## Screens

| # | Title | Slug | Image | HTML |
|---|-------|------|-------|------|
| 1 | หน้ารายละเอียดสิทธิ์ (Kiosk) | `rights-detail` | [images/rights-detail.png](images/rights-detail.png) | [html/rights-detail.html](html/rights-detail.html) |
| 2 | หน้าเลือกช่องทางการชำระเงิน (Kiosk) | `payment-channel` | [images/payment-channel.png](images/payment-channel.png) | [html/payment-channel.html](html/payment-channel.html) |
| 3 | หน้าเลือกบริการ (Kiosk) | `service-select` | [images/service-select.png](images/service-select.png) | [html/service-select.html](html/service-select.html) |
| 4 | หน้าชำระค่าบริการและรับใบเสร็จ (Kiosk) | `payment-receipt` | [images/payment-receipt.png](images/payment-receipt.png) | [html/payment-receipt.html](html/payment-receipt.html) |

## How to re-fetch

Requires `STITCH_API_KEY` (or Cursor Stitch MCP key) and `@google/stitch-sdk`:

```bash
# from repo root — script can be added under scripts/ later
node -e "/* use stitch.project('10817979751782111775').getScreen(id) */"
curl -L -o docs/kiosk/stitch/images/<slug>.png "<imageUrl>"
curl -L -o docs/kiosk/stitch/html/<slug>.html "<htmlUrl>"
```

## Implementation notes

- Stitch HTML is **reference only** (Tailwind utility dump) — port into `src/pages/kiosk/` with MIH tokens (`design.md`), do not paste raw Stitch CSS into production.
- Map to TOR §1.16 (rights / payment / service picker) via `.claude/skills/health-office-kiosk/`.
- Existing flow: `KioskPage.jsx` + `MobileTicketPage.jsx` + `kioskMock.js`.
