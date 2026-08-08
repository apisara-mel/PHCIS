import React from 'react';

/* MIH StatusBadge — Figma 302:73 (Status Badge · MIH Design System
   Foundation). See design.md §4.1/4.2 for the StatusBadge token set.

   Property panel (per Figma):
     • Style    : Neutral | Info | Warning | Error | Success
     • Size     : Small (24h) | Default (32h)
     • Fill     : Default (filled bg) | Outline (transparent + neutral border)
     • Show Icon : boolean  — render the material symbol when set
     • Show Dot  : boolean  — render the leading 8/6 px tone-coloured dot
     • Show Text : boolean  — render the label text

   `yellow` is kept as a project-only style for queue/dashboard rows that
   need an in-progress amber tone (aliases the same pill tokens).

   Tokens — no hex literals:
     --surface-statusbadge-{style}     · filled bg
     --text-statusbadge-{style}        · label + dot colour; leading icon on **success** uses `--icon-positive-success` (icon/positive/success · teal/500), other styles inherit via `currentColor`
     --border-statusbadge-neutral      · outline border
     --dim-space-{100,150,200,300}     · gap + horizontal padding (per size)
     --dim-size-{500,600}              · pill height (24/32)
     --type-family-body                · Sarabun
     --type-size-{xs,sm}               · 12/14px
     --type-weight-medium              · 500 */

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

const STYLES = ['neutral', 'info', 'success', 'warning', 'error', 'yellow'];

const StatusBadge = ({
  style = 'neutral',
  size = 'small',                                             // 'small' | 'default'
  fill = 'default',                                           // 'default' | 'outline'
  showDot = false,
  showIcon,                                                   // boolean | undefined — auto-derived from `icon` if undefined
  showText = true,                                            // hide label without removing the `children` prop
  icon,                                                       // material symbol name (optional)
  children,                                                   // label
  className = '',
  styleProp,                                                  // extra inline overrides
}) => {
  const resolvedStyle = STYLES.includes(style) ? style : 'neutral';
  const isDefault = size === 'default';
  const isOutline = fill === 'outline';
  const text = `var(--text-statusbadge-${resolvedStyle})`;
  const iconColor =
    resolvedStyle === 'success' ? 'var(--icon-positive-success)' : 'currentColor';
  const renderIcon = showIcon !== undefined ? showIcon : !!icon;

  /* 24h Small uses gap 4, padding 8; 32h Default uses gap 6, padding 12.   */
  const sizeStyles = isDefault
    ? {
        height: 'var(--dim-size-600, 32px)',
        gap: 'var(--dim-space-150, 6px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        fontSize: 'var(--type-size-sm, 14px)',
        dotSize: 8,
        iconSize: 16,
      }
    : {
        height: 'var(--dim-size-500, 24px)',
        gap: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        fontSize: 'var(--type-size-xs, 12px)',
        dotSize: 6,
        iconSize: 16,
      };

  const fillStyles = isOutline
    ? {
        background: 'transparent',
        border: 'var(--dim-stroke-100) solid var(--border-statusbadge-neutral)',
      }
    : {
        background: `var(--surface-statusbadge-${resolvedStyle})`,
        border: 'none',
      };

  return (
    <span
      data-mih-status-badge=""
      className={`inline-flex items-center justify-center shrink-0 whitespace-nowrap ${className}`}
      style={{
        height: sizeStyles.height,
        minWidth: 40,
        maxWidth: 224,
        gap: sizeStyles.gap,
        paddingTop: 'var(--dim-space-100, 4px)',
        paddingBottom: 'var(--dim-space-100, 4px)',
        paddingLeft: sizeStyles.paddingLeft,
        paddingRight: sizeStyles.paddingRight,
        borderRadius: 'var(--dim-radius-full)',
        color: text,
        fontFamily: 'var(--type-family-body)',
        fontSize: sizeStyles.fontSize,
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        ...fillStyles,
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
            background: text,
            flexShrink: 0,
          }}
        />
      )}
      {renderIcon && icon && <Sym name={icon} size={sizeStyles.iconSize} color={iconColor} />}
      {showText && children !== undefined && (
        <span
          data-mih-status-badge-label=""
          className='overflow-hidden'
          style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {children}
        </span>
      )}
    </span>
  );
};

export default StatusBadge;
