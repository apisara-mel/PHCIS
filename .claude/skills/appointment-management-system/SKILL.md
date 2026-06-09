---
name: appointment-management-system
description: >
  Build an interactive doctor appointment management system for a hospital or
  clinic. Use this skill whenever the user asks for: doctor appointment system,
  examination schedule, slot management, nurse roster, doctor scheduling,
  working-hour configuration, queue booking, OPD scheduling, or an outpatient
  department dashboard.
  Always use this skill whenever the user wants any kind of clinic/hospital
  scheduling or appointment management system.
---

# Doctor Appointment Management System — Skill

Build an interactive web application for managing doctor appointments at a
hospital or clinic. The system runs entirely in the browser (no backend
required).

## The system has 5 pages

1. **Examination schedule setup** — Configure slot duration, slot counts per
   period (morning / noon / afternoon), and booking-type percentages.
2. **Doctor schedule overview** — Show every doctor's status and the number of
   slots they have published.
3. **Appointment list** — Show all appointments, filterable by doctor / date /
   type.
4. **Notifications** — Auto-notify the doctor on schedule save (no doctor
   confirmation required).
5. **Staff management** — Doctor / nurse profiles, working days and hours,
   days off and leave.

## Component & Design Token policy (mandatory every time)

**Before creating or modifying any UI, ALWAYS run this step first:**

### Step 0: Audit existing components in the project

1. **Scan the current project** — Look at the HTML / CSS / JS already in
   `outputs/` or the workspace and check whether reusable components already
   exist.
   - Look for class names, reusable sections, and UI patterns already in use.
   - If a design system or token file (`design.md` / `tokens.md` /
     `styles.md`) exists, read it first.

2. **If components already exist → alias them, do not duplicate.**
   - Do NOT create new components that overlap with existing ones.
   - Reuse the existing class names / structure exactly so the system stays
     consistent.
   - Example: if the project already has `.btn-primary`, `.card`, `.badge`,
     use those classes directly — do not invent new ones.

3. **If no components exist → you may create new ones, but ONLY by aliasing
   tokens from `design.md`.**
   - Read `design.md` (or the equivalent token file) before writing any CSS.
   - Always reference tokens via CSS variables — never hardcode color,
     spacing, or font-size values.
   - If `design.md` is not found, fall back to this skill's color guide (see
     "Color system" below).

**Rule of thumb:**
```
Existing component   → alias it (do not duplicate)
No existing component → create new, but only by aliasing tokens from design.md
```

---

## Workflow

### 1. Gather information

Ask the user:
- Name of the hospital or clinic
- Doctor list (name, specialty, department) — fall back to the built-in
  sample if the user does not provide one
- Nurse list (if any)
- Core working hours (default: 08:00–17:00)

If the user wants to ship immediately without giving any data, use the
built-in default values.

### 2. Read the template

Read the template file from `assets/`:
```
Read: <skill_dir>/assets/template.html
```

### 3. Customize the template

Edit these parts of the HTML:

**System title** — find `<title>` and the header text, then replace with the
hospital / clinic name:
```html
<title>Appointment Management — [Hospital Name]</title>
```

**Doctor data** — find `let staffList = [` and replace with the user's roster,
following this shape:
```js
let staffList = [
  {
    id: 1,
    role: 'doctor',           // 'doctor' or 'nurse'
    name: 'Dr. [Name]',
    spec: '[Specialty]',      // doctor only
    dept: '[Department]',
    icon: '👨‍⚕️',             // or '👩‍⚕️' for female / nurse
    phone: '[Phone]',
    schedule: {
      mon: { on: true,  start: '08:00', end: '16:00' },
      tue: { on: true,  start: '08:00', end: '16:00' },
      wed: { on: true,  start: '08:00', end: '16:00' },
      thu: { on: true,  start: '08:00', end: '16:00' },
      fri: { on: true,  start: '08:00', end: '16:00' },
      sat: { on: false, start: '08:00', end: '12:00' },
      sun: { on: false, start: '08:00', end: '12:00' },
    },
    daysOff: []
  },
  // ... additional staff members
];
```

**Notes**:
- If no phone is provided, use `''`.
- `daysOff` is an array of `'YYYY-MM-DD'` strings for special days off.
- Doctors are filtered automatically on the schedule-setup page (`role: 'doctor'` only).

### 4. Save and create the artifact

Save the customized HTML to the `outputs/` folder, then create a Cowork
artifact:

```
Write: outputs/[name]-appointment-system.html
```

Then publish:
- Use `mcp__cowork__create_artifact` or `mcp__cowork__update_artifact`
- title: "Appointment Management — [Name]"
- artifact_id: a meaningful slug, e.g. `[name]-appointment-system`

### 5. Brief the user

Tell the user what they can do:
- Click the tabs at the top to switch pages.
- Pick a doctor → configure slots → press "Save schedule".
- On the Staff page: edit profiles, set working days, mark days off.
- A notification is sent automatically on save — no doctor confirmation
  required.

---

## Core feature reference

### Slot calculation
```js
slots = Math.floor(periodMinutes / slotDuration)
// morning: 240 min, noon: 60 min, afternoon: 240 min
```

### Booking % presets (5 defaults)
| Preset            | Regular | Online | Special/Emergency |
|-------------------|---------|--------|-------------------|
| Balanced          | 50%     | 25%    | 25% (auto)        |
| Regular-heavy     | 70%     | 20%    | 10% (auto)        |
| Online-heavy      | 40%     | 40%    | 20% (auto)        |
| Special-heavy     | 50%     | 10%    | 40% (auto)        |
| Equal             | 34%     | 33%    | 33% (auto)        |

Special/Emergency = 100 − Regular − Online (computed automatically).

### Time periods (3 periods)
- **Morning**: 08:00–12:00 (240 min) — default ON
- **Noon**: 12:00–13:00 (60 min) — default OFF
- **Afternoon**: 13:00–17:00 (240 min) — default ON

### Color system (guidance — never use hex literals)

The table below is a **semantic guide** for "what each color is used for"
only. **Do not hardcode hex values in CSS** — always pull a semantic-level
token from `design.md`.

| Color role         | Used for                          | Token to map to (example) |
|--------------------|-----------------------------------|---------------------------|
| Primary / heading  | Active doctor, headers            | `--color-primary`         |
| Secondary / action | Online type, secondary buttons    | `--color-secondary`       |
| Warning / special  | Warnings, special slots           | `--color-warning`         |
| Info / system      | System notifications              | `--color-info`            |
| Danger / emergency | Emergency, days off               | `--color-danger`          |

**How to apply:**
1. Read `design.md` → find the semantic token that matches each role above.
2. Map that token to the system's CSS variables, e.g.:
   ```css
   :root {
     --green:  var(--color-primary);   /* from design.md */
     --blue:   var(--color-secondary);
     --amber:  var(--color-warning);
     --purple: var(--color-info);
     --red:    var(--color-danger);
   }
   ```
3. If `design.md` has no matching token, ASK the user first — never guess or
   hardcode a value.

---

## When the user wants to edit an existing system

If the artifact already exists:
1. Read the current HTML file.
2. Edit only the part the user asked about.
3. Update via `mcp__cowork__update_artifact`.

Common edits:
- Add a doctor → edit `staffList`.
- Change working hours → edit `schedule` on the staff member.
- Add a new preset → edit the `PRESETS` array.
- Rename the hospital → edit `<title>` and `.site-name`.
