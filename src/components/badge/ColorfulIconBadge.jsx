import React from 'react';

/* MIH ColorfulIconBadge — Figma 2307:11697 (Colorful icon Badge). A
   circular badge that wraps a single material symbol — no text, no dot.
   Used as the small avatar-style indicator in lists and Radio/Checkbox
   cards.

   Property panel (per Figma):
     • Style : Grey | Green | Blue | Turquoise | Orange | Yellow | Red
               | Indigo | Pink | Magenta | Purple
     • Size  : Default (36) | Medium (28) | Small (20)
     • Fill  : Default (filled bg) | Outline (transparent + colored stroke)
     • Shape : circle (default) | pill (h 40 cap — Figma 226:29353)

   Visual tokens reuse the ColorfulBadge palette:
     `--surface-colorfulbadge-{style}` — Default fill bg (light shade)
     `--text-colorfulbadge-{style}`    — Icon color + Outline stroke
   `green` uses PHCIS brand emerald (`--brand-p100` / `--brand-p700`), not teal.
   `turquoise` is an alias of `teal` so both Figma turquoise spellings work.

   Material symbol axis: icons default to **outline** (`FILL` 0) per PHCIS
   queue surfaces (Figma 329:51905). Pass `iconFill={1}` when a filled
   glyph is required. */

const Sym = ({ name, size = 16, color, weight = 500, fill = 0 }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const STYLES = [
  'grey', 'green', 'blue', 'turquoise', 'teal', 'orange', 'yellow', 'red',
  'indigo', 'pink', 'magenta', 'purple',
];

const SIZE_SPECS = {
  default: { box: 36, icon: 20 },
  medium:  { box: 28, icon: 16 },
  small:   { box: 20, icon: 12 },
};

/* Figma 226:29353 (PHCIS Step 7 cert strip) — pill cap, h 40, icon 16. */
const PILL_SPEC = {
  height: 40,
  minWidth: 40,
  icon: 16,
  paddingX: 'var(--dim-space-200)',
  paddingY: 'var(--dim-space-100)',
  borderRadius: 'var(--dim-radius-full, 9999px)',
};

const ColorfulIconBadge = ({
  style = 'grey',
  size = 'default',                                          // 'default' | 'medium' | 'small'
  fill = 'default',                                          // 'default' | 'outline'
  shape = 'circle',                                          // 'circle' | 'pill'
  icon = 'link',                                             // material symbol name
  iconFill = 0,                                              // Material `FILL` axis (0 = outline)
  className = '',
  styleProp,
}) => {
  const resolvedStyle = STYLES.includes(style) ? style : 'grey';
  const sizeSpec = SIZE_SPECS[size] || SIZE_SPECS.default;
  const surface = `var(--surface-colorfulbadge-${resolvedStyle})`;
  const accent  = `var(--text-colorfulbadge-${resolvedStyle})`;
  const isOutline = fill === 'outline';
  const isPill = shape === 'pill';

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{
        ...(isPill
          ? {
              width: 'auto',
              minWidth: PILL_SPEC.minWidth,
              height: PILL_SPEC.height,
              paddingLeft: PILL_SPEC.paddingX,
              paddingRight: PILL_SPEC.paddingX,
              paddingTop: PILL_SPEC.paddingY,
              paddingBottom: PILL_SPEC.paddingY,
              borderRadius: PILL_SPEC.borderRadius,
            }
          : {
              width: sizeSpec.box,
              height: sizeSpec.box,
              borderRadius: '50%',
            }),
        background: isOutline ? 'transparent' : surface,
        border: isOutline ? `var(--dim-stroke-100) solid ${accent}` : 'none',
        color: accent,
        boxSizing: 'border-box',
        ...styleProp,
      }}
    >
      <Sym
        name={icon}
        size={isPill ? PILL_SPEC.icon : sizeSpec.icon}
        color='currentColor'
        fill={iconFill}
      />
    </span>
  );
};

export default ColorfulIconBadge;
