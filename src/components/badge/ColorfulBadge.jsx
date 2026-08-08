import React from 'react';
import { FigmaIcon, resolveFigmaIconKey } from '@/components/mobile/figmaIcons';

/* MIH ColorfulBadge — Figma App DS 2076:8413
   (MIH-Design-System-Foundation--App · Colorful Badge).

   Property panel (per Figma):
     • Style     : Grey | Green | Blue | Teal | Orange | Yellow | Red
                   | Indigo | Pink | Magenta | Purple
     • Size      : Small (24h) | Default (32h)
     • Fill      : Default (filled) | Outline
     • Hierarchy : Primary (bold mid-tone bg · badge-on text)
                   | Secondary (light 100 bg · saturated 700 text)
     • Show Dot  : boolean — leading 6/8 px filled dot
     • Show Icon : boolean — Figma Feather (Home) or Material symbol after the dot
     • Show Text : boolean — label text

   Tokens — every style needs:
     `--surface-colorfulbadge-{style}`      (100 · Secondary bg)
     `--text-colorfulbadge-{style}`         (700 · Secondary / Outline text)
     `--surface-colorfulbadge-{style}-bold` (500 · Primary bg)
     `--text-colorfulbadge-badge-on`        (Primary label)
   Outline Grey/Green use `--border-colorfulbadge-neutral` / `-brand`;
   other styles map to semantic border tokens or the 700 accent.

   Width modes (Figma 2076:8413 · treatment history 176:38684):
     • width="hug"  — pill width follows label
     • width="cap"  — min 40px, max 224px, ellipsis (default) */

const Sym = ({ name, size = 16, color, weight = 500, fill = 1 }) => {
  if (resolveFigmaIconKey(name)) {
    return <FigmaIcon name={name} size={size} color={color} />;
  }
  return (
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
};

export const COLORFUL_BADGE_STYLES = [
  'grey', 'green', 'blue', 'teal', 'orange', 'yellow', 'red',
  'indigo', 'pink', 'magenta', 'purple',
];

/* Outline border — Figma only ships Grey + Green outline variants with
   dedicated border tokens; remaining styles use semantic 200 borders. */
const OUTLINE_BORDER = {
  grey: 'var(--border-colorfulbadge-neutral, #E2E4E6)',
  green: 'var(--border-colorfulbadge-brand, #C5EDDA)',
  blue: 'var(--border-colorfulbadge-info, #BFDBFE)',
  teal: 'var(--border-colorfulbadge-success, #A2EDDE)',
  yellow: 'var(--border-colorfulbadge-warning, #FEF08A)',
  orange: 'var(--border-colorfulbadge-warning2, #FED7AA)',
  red: 'var(--border-colorfulbadge-error, #FECACA)',
};

const resolvePalette = ({ style, fill, hierarchy }) => {
  const surface = `var(--surface-colorfulbadge-${style})`;
  const accent = `var(--text-colorfulbadge-${style})`;
  const accentBold = `var(--surface-colorfulbadge-${style}-bold, ${accent})`;
  const onBold = 'var(--text-colorfulbadge-badge-on, #FFFFFF)';

  if (fill === 'outline' || fill === 'Outline') {
    return {
      bg: 'transparent',
      border: `var(--dim-stroke-100, 1px) solid ${OUTLINE_BORDER[style] || accent}`,
      text: accent,
    };
  }
  if (hierarchy === 'primary' || hierarchy === 'Primary') {
    return {
      bg: accentBold,
      border: 'none',
      text: onBold,
    };
  }
  return {
    bg: surface,
    border: 'none',
    text: accent,
  };
};

const normalizeSize = (size) => {
  const s = String(size || 'small').toLowerCase();
  return s === 'default' || s === 'md' || s === 'lg' ? 'default' : 'small';
};

const normalizeHierarchy = (h) => (
  String(h || 'secondary').toLowerCase() === 'primary' ? 'primary' : 'secondary'
);

const normalizeFill = (f) => (
  String(f || 'default').toLowerCase() === 'outline' ? 'outline' : 'default'
);

/**
 * @param {object} props
 * @param {string} [props.style] — color style (grey | green | …)
 * @param {string} [props.badgeStyle] — alias of style
 * @param {'small'|'default'|'Small'|'Default'} [props.size]
 * @param {'default'|'outline'|'Default'|'Outline'} [props.fill]
 * @param {'primary'|'secondary'|'Primary'|'Secondary'} [props.hierarchy]
 * @param {'hug'|'cap'} [props.width]
 */
const ColorfulBadge = ({
  badgeStyle,
  style = 'grey',
  size = 'small',
  fill = 'default',
  hierarchy = 'secondary',
  width = 'cap',
  maxWidth,
  minWidth: minWidthProp,
  showDot = false,
  showIcon,
  showText = true,
  icon,
  iconFill = 1,
  iconWeight = 500,
  children,
  className = '',
  styleProp,
}) => {
  const tone = badgeStyle ?? style;
  const resolvedStyle = COLORFUL_BADGE_STYLES.includes(tone) ? tone : 'grey';
  const resolvedSize = normalizeSize(size);
  const resolvedFill = normalizeFill(fill);
  const resolvedHierarchy = normalizeHierarchy(hierarchy);
  const isDefault = resolvedSize === 'default';
  const isPrimary = resolvedHierarchy === 'primary';
  const palette = resolvePalette({
    style: resolvedStyle,
    fill: resolvedFill,
    hierarchy: resolvedHierarchy,
  });
  const renderIcon = showIcon !== undefined ? showIcon : !!icon;

  const hugWidth = width === 'hug';
  const capMaxWidth = maxWidth ?? 224;
  const iconOrDotOnly = !showText || children === undefined || children === '';

  /* Gap: Small → 4; Default+Secondary → 4; Default+Primary → 6 (Figma). */
  const gap = (isDefault && isPrimary)
    ? 'var(--dim-space-150, 6px)'
    : 'var(--dim-space-100, 4px)';

  const sizeStyles = isDefault
    ? {
        height: 'var(--dim-size-600, 32px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        fontSize: 'var(--type-size-sm, 14px)',
        dotSize: 8,
        iconSize: 16,
      }
    : {
        height: 'var(--dim-size-500, 24px)',
        paddingLeft: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        fontSize: 'var(--type-size-xs, 12px)',
        dotSize: 6,
        iconSize: 16,
      };

  return (
    <span
      data-mih-colorful-badge=""
      className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap ${className}`}
      style={{
        height: sizeStyles.height,
        width: hugWidth ? 'fit-content' : undefined,
        minWidth: minWidthProp != null
          ? minWidthProp
          : (hugWidth ? (iconOrDotOnly ? 40 : undefined) : 40),
        maxWidth: hugWidth ? maxWidth : capMaxWidth,
        gap,
        paddingTop: 'var(--dim-space-100, 4px)',
        paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: sizeStyles.paddingLeft,
        paddingRight: sizeStyles.paddingRight,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: palette.bg,
        border: palette.border,
        color: palette.text,
        fontFamily: 'var(--type-family-body)',
        fontSize: sizeStyles.fontSize,
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
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
          data-mih-colorful-badge-label=""
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
