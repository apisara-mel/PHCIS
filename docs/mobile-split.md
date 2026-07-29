# Mobile app split

The citizen mobile app (`/m/*`) now lives in a dedicated repo:

- **GitHub:** https://github.com/namonlims/bma.mobile  
- **Local:** `../bma.mobile`  
- **Dev:** `cd ../bma.mobile && npm run dev` → `http://127.0.0.1:3001/m`

Shared design tokens: [`@mih/design-tokens`](https://github.com/namonlims/mih-design)

## Why `/m` still exists in `bma.health`

1. System hub demos still deep-link to `/m`.
2. Web badges (`ColorfulBadge` / `ColorfulIconBadge`) import `src/components/mobile/figmaIcons`.

Next cleanup (separate PR):

1. Publish or copy `figmaIcons` into a shared package / web-only path.
2. Remove `src/pages/mobile` + mobile-only routes from this repo.
3. Point hub “แอปประชาชน” card at the mobile app URL.
