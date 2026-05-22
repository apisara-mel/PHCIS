import React from 'react';

/* MIH Small Alert — Figma 3355:3149 (DS Foundation) + PHCIS | OPD 323:58923
   (toast instance: TickOnCircle raster → `leadingGraphic="phcis"` SVG).
   Inline pill: 24px leading graphic + single-line label. Success / error only.
   Surfaces: `--surface-smallalert-*` → teal/500 · red/500. Label + on-surface
   chrome: `--text-smallalert-on-*`. Typography body3: `--type-family-body` ·
   `--type-size-base` · `--type-weight-regular` · lh 1.5 · letter-spacing 0.
   Spacing: pl dim-400, pr dim-600, py dim-200, gap dim-100; radius dim-radius-full.
   Shadows: `--shadow-smallalert-*` (success = `--shadow-brand-drop-bottom-200`);
   pass `omitBoxShadow` when a parent applies `--filter-brand-drop-bottom-200`. */

const VARIANTS = {
  success: {
    surface: 'var(--surface-smallalert-success)',
    foreground: 'var(--text-smallalert-on-success)',
    shadow: 'var(--shadow-smallalert-success)',
    icon: 'check_circle',
    fill: 1,
    defaultMessage: 'คัดลอกสำเร็จ',
  },
  error: {
    surface: 'var(--surface-smallalert-error)',
    foreground: 'var(--text-smallalert-on-error)',
    shadow: 'var(--shadow-smallalert-error)',
    icon: 'cancel',
    fill: 1,
    defaultMessage: 'คัดลอกไม่สำเร็จ',
  },
};

/** Figma PHCIS 323:58923 / DS TickOnCircle — white 18px disc + check opening to pill surface. */
const PhcisTickOnCircle = () => (
  <svg
    width={24}
    height={24}
    viewBox='0 0 24 24'
    aria-hidden
    style={{ flexShrink: 0, display: 'block' }}
  >
    <circle cx='12' cy='12' r='9' fill='var(--text-smallalert-on-success)' />
    <path
      fill='var(--surface-smallalert-success)'
      fillRule='evenodd'
      d='M16.2 8.4 14.9 7.1 10.4 11.6 9.1 10.3 7.8 11.6l2.6 2.6 5.8-5.8Z'
    />
  </svg>
);

/** Error companion — white X on solid error surface (Figma small alert error). */
const PhcisErrorMark = () => (
  <svg
    width={24}
    height={24}
    viewBox='0 0 24 24'
    aria-hidden
    style={{ flexShrink: 0, display: 'block' }}
  >
    <path
      fill='none'
      stroke='var(--text-smallalert-on-error)'
      strokeWidth='2.25'
      strokeLinecap='round'
      d='M9 9l6 6M15 9l-6 6'
    />
  </svg>
);

const Sym = ({ name, size = 24, color, weight = 400, fill = 0 }) => (
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

/**
 * @param {Object} props
 * @param {'success'|'error'} [props.variant='success']
 * @param {'material'|'phcis'} [props.leadingGraphic='material'] — PHCIS toast (323:58923) uses `phcis` (TickOnCircle SVG + X stroke) per Figma; DS library defaults to Material Symbols.
 * @param {boolean} [props.omitBoxShadow=false] — when true, no `box-shadow` on the pill (e.g. toast applies `--filter-brand-drop-bottom-200` on a parent wrapper).
 * @param {React.ReactNode} [props.children] — label; falls back to Thai defaults from Figma
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export default function SmallAlert({
  variant = 'success',
  leadingGraphic = 'material',
  omitBoxShadow = false,
  children,
  className = '',
  style,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  ...rest
}) {
  const cfg = VARIANTS[variant] ?? VARIANTS.success;
  const label = children != null ? children : cfg.defaultMessage;
  const usePhcis = leadingGraphic === 'phcis';

  const labelStyle = {
    minWidth: 0,
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-base)',
    fontWeight: 'var(--type-weight-regular)',
    lineHeight: 1.5,
    letterSpacing: 0,
    fontStyle: 'normal',
    whiteSpace: 'nowrap',
    color: cfg.foreground,
  };

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        gap: 'var(--dim-space-100)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-full)',
        background: cfg.surface,
        color: cfg.foreground,
        boxShadow: omitBoxShadow ? undefined : cfg.shadow,
        maxWidth: '100%',
        ...style,
      }}
      {...rest}
    >
      {usePhcis ? (
        variant === 'error' ? (
          <PhcisErrorMark />
        ) : (
          <PhcisTickOnCircle />
        )
      ) : (
        <Sym name={cfg.icon} color={cfg.foreground} fill={cfg.fill} weight={400} />
      )}
      <span style={labelStyle}>{label}</span>
    </div>
  );
}
