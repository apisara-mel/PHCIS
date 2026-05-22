import React from 'react';

/* MIH ColorfulBadge — Figma 2076:8413 (Colorful Badge · MIH Design
   System Foundation).

   Property panel (per Figma):
     • Style     : Grey | Green | Blue | Teal | Orange | Yellow | Red
                   | Indigo | Pink | Magenta | Purple
     • Size      : Small (24h) | Default (32h)
     • Fill      : Default (filled) | Outline
     • Hierarchy : Primary (saturated bg, white text)
                   | Secondary (light bg, saturated text)
     • Show Dot  : boolean — leading 6/8 px filled dot
     • Show Icon : boolean — material symbol after the dot
     • Show Text : boolean — label text

   Token strategy — every style only needs TWO base aliases:
     `--surface-colorfulbadge-{style}` (100-shade · Secondary bg)
     `--text-colorfulbadge-{style}`    (700-shade · Secondary text + Primary bg + Outline border/text)
   The component derives Primary / Outline visuals from those two — no new
   tokens needed per hierarchy.

   Width modes (Figma 2076:8413 · treatment history 176:38684):
     • width="hug"  — pill width follows label text (px 8 + copy + px 8).
       Use under Information rows, allergy/chronic readouts, inline metadata.
     • width="cap"  — min 40px, max 224px, ellipsis when overflowing (default).
       Use in Select popover rows, tables, and fixed slots.                  */

const Sym = ({ name, size = 16, color, weight = 500, fill = 1 }) => (
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
  'grey', 'green', 'blue', 'teal', 'orange', 'yellow', 'red',
  'indigo', 'pink', 'magenta', 'purple',
];

const resolvePalette = ({ style, fill, hierarchy }) => {
  const surface = `var(--surface-colorfulbadge-${style})`; /* light 100   */
  const accent  = `var(--text-colorfulbadge-${style})`;    /* saturated 700 */
  /* Figma `surface/colorfulbadge/{style}-bold` — a mid-tone surface used by
     primary-hierarchy chips when the saturated 700 accent is too dark for a
     bg (e.g. Doctor AI ICD code prefix · Figma 156:27354 uses #818CF8 for
     indigo-bold). If the `-bold` CSS var is declared in `:root`, the
     primary hierarchy renders it; otherwise it falls back to `accent` so
     existing styles without a bold token (most colors) keep their current
     dark-accent fill. */
  const accentBold = `var(--surface-colorfulbadge-${style}-bold, ${accent})`;
  if (fill === 'outline') {
    return {
      bg: 'transparent',
      border: `var(--dim-stroke-100) solid ${accent}`,
      text: accent,
    };
  }
  if (hierarchy === 'primary') {
    return {
      bg: accentBold,
      border: 'none',
      text: '#FFFFFF',
    };
  }
  /* Secondary (default): light fill + saturated text */
  return {
    bg: surface,
    border: 'none',
    text: accent,
  };
};

const ColorfulBadge = ({
  badgeStyle,
  style = 'grey',
  size = 'small',                                            // 'small' | 'default'
  fill = 'default',                                          // 'default' | 'outline'
  hierarchy = 'secondary',                                   // 'primary' | 'secondary'
  width = 'cap',                                             // 'hug' | 'cap'
  maxWidth,                                                  // optional px cap (ellipsis when set with width="cap")
  /** Optional minimum pill width — useful in list contexts where
      every badge should occupy the same column width regardless of
      label length (Figma 4053:6962 — advance-order picker rows). */
  minWidth: minWidthProp,
  showDot = false,
  showIcon,                                                  // boolean | undefined — auto-derives from `icon`
  showText = true,
  icon,                                                      // material symbol name
  iconFill = 1,                                              // Material `FILL` axis (0 = outline)
  iconWeight = 500,
  children,                                                  // label
  className = '',
  styleProp,
}) => {
  const tone = badgeStyle ?? style;
  const resolvedStyle = STYLES.includes(tone) ? tone : 'grey';
  const isDefault = size === 'default';
  const palette = resolvePalette({ style: resolvedStyle, fill, hierarchy });
  const renderIcon = showIcon !== undefined ? showIcon : !!icon;

  const hugWidth = width === 'hug';
  const capMaxWidth = maxWidth ?? 224;
  const iconOrDotOnly = !showText || children === undefined || children === '';

  const sizeStyles = isDefault
    ? {
        height: 'var(--dim-size-600, 32px)',
        gap: 'var(--dim-space-150, 6px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        fontSize: 'var(--type-size-sm, 14px)',
        lineHeight: 1.35,
        dotSize: 8,
        iconSize: 16,
      }
    : {
        /* At least 24px (Figma small); height auto so Thai marks above/below
           the nominal 12px em box are not clipped inside the pill. */
        minHeight: 'var(--dim-size-500, 24px)',
        height: 'auto',
        gap: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        fontSize: 'var(--type-size-xs, 12px)',
        lineHeight: 1.35,
        dotSize: 6,
        iconSize: 16,
      };

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap ${className}`}
      style={{
        ...(isDefault
          ? { height: sizeStyles.height }
          : { minHeight: sizeStyles.minHeight, height: sizeStyles.height }),
        width: hugWidth ? 'fit-content' : undefined,
        /* Caller-supplied `minWidth` wins so list-context callers
           (Figma 4053:6962 — advance-order picker) can lock every
           badge in the row to a baseline pill width regardless of
           label length. Falls back to the size-aware defaults. */
        minWidth: minWidthProp != null
          ? minWidthProp
          : (hugWidth ? (iconOrDotOnly ? 40 : undefined) : 40),
        maxWidth: hugWidth ? maxWidth : capMaxWidth,
        gap: sizeStyles.gap,
        paddingTop: 'var(--dim-space-100, 4px)',
        paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: sizeStyles.paddingLeft,
        paddingRight: sizeStyles.paddingRight,
        borderRadius: 'var(--dim-radius-full)',
        background: palette.bg,
        border: palette.border,
        color: palette.text,
        fontFamily: 'var(--type-family-body)',
        fontSize: sizeStyles.fontSize,
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: sizeStyles.lineHeight,
        boxSizing: 'border-box',
        ...styleProp,
      }}
    >
      {showDot && (
        <span
          aria-hidden
          style={{
            width: sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
          }}
        />
      )}
      {renderIcon && icon && (
        <Sym
          name={icon}
          size={sizeStyles.iconSize}
          color='currentColor'
          fill={iconFill}
          weight={iconWeight}
        />
      )}
      {showText && children !== undefined && (
        <span
          className={hugWidth ? undefined : 'min-w-0'}
          style={hugWidth ? {
            flexShrink: 0,
            whiteSpace: 'nowrap',
          } : {
            overflowX: 'hidden',
            overflowY: 'visible',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
};

export default ColorfulBadge;
