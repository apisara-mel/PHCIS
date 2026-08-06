import React from 'react';
import Icon from '@/components/icons/Icon';

/* MIH Small Alert — Figma 3355:3149 (DS Foundation) + PHCIS | OPD 323:58923
   (toast: inverted SuccessIcon → `<Icon name="tick_on_circle" />` =
   white disc + Material `check` in `--icon-positive-success`).
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
 * @param {'material'|'phcis'} [props.leadingGraphic='material'] — PHCIS toast (323:58923) uses `phcis` (`Icon` `tick_on_circle` / `phcis_error_x`); DS library defaults to Material Symbols.
 * @param {boolean} [props.omitBoxShadow=false] — when true, no `box-shadow` on the pill (e.g. toast applies `--filter-brand-drop-bottom-200` on a parent wrapper).
 * @param {number} [props.leadingIconSize=24] — leading graphic box (px); PHCIS top toast uses 16.
 * @param {string} [props.iconGap] — gap between leading graphic and label; defaults to dim-100 (4px), or dim-300 when `action` is set.
 * @param {{ label: string, onClick?: () => void }} [props.action] — optional trailing CTA
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export default function SmallAlert({
  variant = 'success',
  leadingGraphic = 'material',
  leadingIconSize = 24,
  iconGap,
  omitBoxShadow = false,
  children,
  action = null,
  className = '',
  style,
  role = 'status',
  'aria-live': ariaLive = 'polite',
  ...rest
}) {
  const cfg = VARIANTS[variant] ?? VARIANTS.success;
  const label = children != null ? children : cfg.defaultMessage;
  const usePhcis = leadingGraphic === 'phcis';
  const resolvedIconGap = iconGap ?? (action ? 'var(--dim-space-300)' : 'var(--dim-space-100)');

  const labelStyle = {
    minWidth: 0,
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-base)',
    fontWeight: 'var(--type-weight-regular)',
    lineHeight: 1.5,
    letterSpacing: 0,
    fontStyle: 'normal',
    whiteSpace: action ? 'normal' : 'nowrap',
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
        flexWrap: action ? 'wrap' : undefined,
        gap: action ? 'var(--dim-space-300)' : resolvedIconGap,
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: action ? 'var(--dim-space-400)' : 'var(--dim-space-600)',
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
        <Icon
          name={variant === 'error' ? 'phcis_error_x' : 'tick_on_circle'}
          size={leadingIconSize}
        />
      ) : (
        <Sym name={cfg.icon} size={leadingIconSize} color={cfg.foreground} fill={cfg.fill} weight={400} />
      )}
      <span style={labelStyle}>{label}</span>
      {action?.label ? (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            action.onClick?.();
          }}
          style={{
            flexShrink: 0,
            border: 'none',
            background: cfg.foreground,
            color: cfg.surface,
            borderRadius: 'var(--dim-radius-full)',
            paddingTop: 'var(--dim-space-100)',
            paddingBottom: 'var(--dim-space-100)',
            paddingLeft: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-300)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
