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

## 6. Responsive  [req 7]

A Figma frame is a single fixed width; the prototype must adapt. Breakpoints (design.md §3, Tailwind-aligned):

| Token | min-width | Typical device |
|---|---|---|
| `xs` | 402 | small phone |
| `sm` | 640 | phone / large phone |
| `md` | 768 | tablet |
| `lg` | 1024 | small laptop |
| `xl` | 1280 | desktop |
| `2xl` | 1536 | large desktop |

Read the frame width in Gate 1 → that's the primary breakpoint. Grab sibling frames at other widths if they exist; each is the spec for that breakpoint.

Build rules:
- **Fluid, not fixed.** `width: 100%` + `max-width` (a token), `flex`/`grid` with `flex-wrap` / `repeat(auto-fit, minmax(...))`. Put `min-width: 0` on flex children so long text/wide children shrink instead of forcing overflow. Fixed px only for truly fixed dimensions (icon/control sizes) — still tokens.
- **Adapt by tier.** Tailwind prefixes (`md:`, `lg:`) work in this repo (v2.1). Multi-column → single column, tighten padding/gap by one `--dim-space-*` tier, reflow toolbars, stack cards as width drops.
- **No horizontal page scroll — ever.** Wide tables/charts/code scroll inside their own `overflow-x: auto` box; the body never does.
- **Mobile shell.** Mobile-frame screens use the existing `src/components/mobile/*` layout (MobileShell etc.), not a shrunk desktop layout.
- **Images.** `max-width: 100%`, `height: auto`, `object-fit: cover` for avatars/photos so they scale without distortion.
- Watch the known repo quirks: inline `padding`/`margin` **shorthand** with `var()` renders as 0 (use longhand); Tailwind 2.1 `bg-[var(--x)]` emits no CSS (use a config color or inline `style`).

Verify with `scripts/verify-route.mjs <route> --viewport 390x844 --viewport 768x1024 --viewport 1440x900 --shot <name>.png` — checks each width for errors + horizontal-scroll and writes `<name>@<w>.png` per viewport to diff against the matching Figma frame.

### Responsive checklist
- [ ] No layout pinned to the Figma canvas width
- [ ] Columns collapse and paddings/gaps step down as width shrinks
- [ ] Each captured Figma frame resembled at its breakpoint (single frame → degrade toward `xs`)
- [ ] Wide content scrolls in its own container; body has no horizontal scroll at any width
- [ ] Mobile screens use the mobile shell; images scale with `max-width:100%`
