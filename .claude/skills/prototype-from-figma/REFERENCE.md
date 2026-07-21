# Prototype from Figma — Reference

Detailed rules for the six gates in [SKILL.md](SKILL.md).

## 1. Layer naming grammar  [req 1]

Rename with `use_figma` so names encode intent, not decoration. Keep names in English, PascalCase for component/screen names, camelCase for data fields.

| Layer kind | Rename to | Example |
|---|---|---|
| Artboard / top frame | `Screen/<Name>` | `Screen/TelemedConsult` |
| Region inside a screen | `Section/<Name>` | `Section/CallControls` |
| An MIH design-system component | its **exact** component name | `BrandButton`, `PhotoUploadField`, `ColorfulBadge` |
| A stateful instance | `<Name> · <State>` | `MicControl · Muted` |
| Repeated list/grid item | `<Item>/<n>` | `ParticipantRow/1`, `ParticipantRow/2` |
| Dynamic data text | `data:<field>` | `data:patientName`, `data:hn`, `data:bp` |
| Fixed label copy | `label:<slug>` | `label:endCall` |
| Image that holds real content | `img:<subject>` | `img:patientAvatar` |
| Annotation / build note | `note:<slug>` | `note:recordingRequiresConsent` |

Validate after renaming with `scripts/validate-layers.mjs` (feed it the `get_metadata` JSON). It cross-checks component names against `src/components/**` + the `/components` registry, flags unnamed/off-grammar layers, and lists the `data:*` fields for Gate 6. Exit 0 = ready.

Rules:
- One component instance = one canonical name. If two layers are the same MIH component, give them the same base name (+ index/state suffix) so they alias to one import.
- Never rename to a name that does not exist in code unless you are also proposing that component (gate 5).
- Show the full rename plan (old → new) and get user confirmation before writing — this mutates their file.

## 2. Reading annotations  [req 2]

Sources to sweep, all of them:
- **Dev-mode annotations** — returned in `get_design_context` component descriptions and measurement pins.
- **Sticky notes / FigJam-style callouts** and **comments** on the board.
- **Text layers** named `note:*` (after gate 1) or visually placed as margin notes.

Turn them into a numbered requirement list, e.g.:
```
A1. Recording only allowed after patient consent (PDPA).
A2. End-call button must be Danger fill, others Brand subdue.
A3. Muted mic/cam → Danger Circle Subdue (red mic_off / videocam_off).
```
Each Ax is a checkable acceptance criterion for the prototype. If an annotation conflicts with the design system, surface it to the user rather than guessing.

## 3. Token alias rules  [req 4]

- Check `design.md` §3 (Token Scale) and §4 (Semantic) + `src/index.css` first.
- If Figma defines a value not in the system, add it to **both** files, then reference `var(--token, <literal>)` where the literal **matches the token's real value**.
- Forbidden: numeric/`px`/hex literals where a token exists; a fallback that lies about the value.
- **Only exception: gradients.** Use inline `linear-gradient(...)` / `radial-gradient(...)`; the system does not catalog gradients.
- Icons come from Figma (Material Symbols) → `<Icon>`/`<Sym>`, else Lucide. No other source, no inline `<svg>` for an existing-library glyph.

## 4. Missing-components sheet  [req 5]

When a required component has no existing match and no close alias, log it (do not ship a silent hand-roll as production).

Create/append to a Google Sheet via the Google Drive MCP (`mcp__claude_ai_Google_Drive__create_file` with mimeType `application/vnd.google-apps.spreadsheet`, or append if a "MIH — Missing Components" sheet already exists). Share the URL with the user.

Columns:

| Column | Meaning |
|---|---|
| `Component` | Proposed name (PascalCase), matching the Figma layer name |
| `Purpose` | One line — what it does / where it's used |
| `Figma node` | `fileKey` + node id (e.g. `JeQ… / 22:1463`) |
| `Variants / props` | States, sizes, styles it needs |
| `Nearest existing` | Closest current component, or "none" |
| `Tokens needed` | Any new tokens gate 4 would add |
| `Priority` | High / Med / Low for the prototype |
| `Status` | `proposed` → `approved` → `built` |

A ready CSV template with these columns ships at `scripts/missing-components.csv` — copy it to `docs/missing-components.csv` and append rows. If the Google Drive MCP is unavailable (e.g. headless/cron), use that CSV and tell the user it needs manual upload.

For the prototype itself, build a **clearly-labelled** local stand-in (comment `// PROTOTYPE stand-in — pending <Component> (see sheet)`), still tokens-only, so the screen is complete without pretending the component is production-ready.

## 5. Mock context sources  [req 6]

| Slot | Pull from |
|---|---|
| Patient name / HN / age / sex / address | `src/data/patientProfiles.js`, `src/data/mrPatients.js` |
| Vitals / readings | `src/data/treatmentVisits.js` and related mock data |
| Avatars / photos | `public/avatars/*` (Thai studio portraits) |
| Doctor / staff names | existing mock rosters in `src/data/*` |
| Any other image | context-appropriate placeholder, never a grey box or `example.com` |

Match sex + age band when picking an avatar. Keep names/HN consistent across a screen (one patient = one identity everywhere).
