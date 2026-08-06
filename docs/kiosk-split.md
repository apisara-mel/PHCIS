# Kiosk app

Canonical self-service kiosk lives in:

- **Production:** https://bma-kiosk.mih.co.th/Kiosk/01-select-service
- **GitHub:** https://github.com/namonlims/bma.kiosk
- **Local:** `../bma.kiosk`
- **Dev:** `cd ../bma.kiosk && npm run dev -- --host 127.0.0.1 --port 3003`
  → **http://127.0.0.1:3003/Kiosk** (app `basename` is `/Kiosk`)

Archived PHCIS Vite extract (not used): https://github.com/namonlims/bma.kiosk-phcis-extract

## This monorepo (`bma.health`)

The old in-repo kiosk UI (`src/pages/kiosk/KioskPage.jsx`, Stitch hub, welcome screen) was **removed** Aug 2026.

| Legacy route | Behaviour |
|--------------|-----------|
| `/kiosk` | Redirect → `https://bma-kiosk.mih.co.th/Kiosk/01-select-service` |
| `/kiosk/ticket/:queueId` | Redirect → `/queue-center/display/online?q=:queueId` (live queue status, TOR 1.3.4.4) |

All new kiosk work lands in **bma.kiosk** only.

See also: [mobile-split.md](./mobile-split.md)
