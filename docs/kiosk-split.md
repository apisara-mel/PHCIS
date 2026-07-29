# Kiosk app

Canonical self-service kiosk lives in:

- **GitHub:** https://github.com/namonlims/bma.kiosk  
- **Local:** `../bma.kiosk`  
- **Dev:** `cd ../bma.kiosk && npm run dev -- --host 127.0.0.1 --port 3003`  
  → **http://127.0.0.1:3003/Kiosk** (app `basename` is `/Kiosk`)

Archived PHCIS Vite extract (not used): https://github.com/namonlims/bma.kiosk-phcis-extract

## Why `/kiosk` still exists in `bma.health`

System hub demos still deep-link to `/kiosk` inside this monorepo.

Next cleanup (separate PR):

1. Point hub “ตู้ Kiosk” card at the kiosk app URL.
2. Remove or redirect `src/pages/kiosk` in this repo.

See also: [mobile-split.md](./mobile-split.md)
