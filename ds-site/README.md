# ds-site — public design-system site

Generates <https://bma-design-system.mih.co.th> into `dist-ds/`.

```sh
npm run ds:build          # → dist-ds/
npx serve dist-ds         # or any static server, to check before publishing
```

## What it publishes

| file | what it is |
|---|---|
| `index.html` | Token browser. Every token in `src/styles/tokens.css` with a swatch the **browser resolves live**, so brand / dark switching shows what the apps actually render. |
| `reference.html` | `design.md` rendered, **plus a live component preview** — each Components-Library entry iframes `https://PHCIS.mih.co.th/components/<slug>?embed=1`. Built from `docs/design-system.html`. |
| `tokens.css` | verbatim copy of `src/styles/tokens.css` |
| `design.md` | verbatim copy of `design.md` (the page fetches it at runtime) |
| `vendor/marked.esm.js` | markdown renderer, vendored so the site needs no CDN |

## Publishing

The site is served by office-202 (behind the Cloudflare tunnel), from the vhost
root for `bma-design-system.mih.co.th`:

```sh
npm run ds:build
rsync -rlptvz dist-ds/ <user>@<office-202>:/var/www/bma-design-system/
```

`dist-ds/` is git-ignored — the *inputs* are what live in git.

## Why this exists

The previous site had no source in any repo. It drifted:

- `tokens.css` was 17 declarations behind `src/styles/tokens.css`
- `--*-rgb` tokens (`106 214 165` — a bare triplet, only valid inside `rgb()`)
  were painted as `background: var(--token)` and rendered as an empty
  checkerboard, so ~40 colour swatches showed nothing
- the token grid re-resolved on brand change but **not** on dark-mode change,
  so every value went stale after one click
- the brand `<select>` listed `default` twice and claimed 11 brand modes
- there was no component preview anywhere on the site

All of the above are fixed here and regenerate from the repo.

## Editing

- **Token list / swatch rules** → `buildIndexHtml` + `classifyToken` in `build.mjs`
- **Reference page** → edit `docs/design-system.html` (the in-repo browser),
  then rebuild. `build.mjs` re-points it at deployable paths and asserts every
  replacement, so renaming something there fails the build loudly instead of
  publishing a half-wired page.
