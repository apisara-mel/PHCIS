import React from 'react';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';

/* MIH Mobile · ServiceRequestCard — Archive Figma 194:153209 (card)
   inside card group 194:153207 (Home · ส่งคำขอ carousel).

   160×93 · radius-600 · pad-300 · gap-200 · Brand Drop Bottom/200
   · Colorful icon Badge pill h40 · label sm / heading-graphic2 / center
   Height = pad×2 + badge 40 + gap 8 + 1-line type-sm (21) → 93. */

export const SERVICE_REQUEST_CARD_WIDTH = 160;
export const SERVICE_REQUEST_CARD_HEIGHT = 93;

/**
 * @param {object} props
 * @param {React.ReactNode} props.label
 * @param {string} [props.icon] — Material Symbol (when no iconSrc)
 * @param {string} [props.iconSrc] — Figma-exported 16×16 SVG
 * @param {string} [props.badgeStyle] — ColorfulIconBadge style (green | blue | …)
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export const ServiceRequestCard = ({
  label,
  icon,
  iconSrc,
  badgeStyle = 'green',
  onClick,
  className = '',
  style,
}) => {
  const surface = `var(--surface-colorfulbadge-${badgeStyle}, var(--surface-brandPrimary-quaternary, #E2F3EB))`;

  return (
    <button
      type='button'
      className={className}
      onClick={onClick}
      style={{
        boxSizing: 'border-box',
        flex: `0 0 ${SERVICE_REQUEST_CARD_WIDTH}px`,
        width: SERVICE_REQUEST_CARD_WIDTH,
        height: SERVICE_REQUEST_CARD_HEIGHT,
        margin: 0,
        border: 0,
        cursor: onClick ? 'pointer' : 'default',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        padding: 'var(--dim-space-300, 12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 'var(--dim-space-200, 8px)',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {iconSrc ? (
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            boxSizing: 'border-box',
            minWidth: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            padding: 'var(--dim-space-100, 4px) var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-full, 9999px)',
            background: surface,
          }}
          aria-hidden
        >
          <img
            src={iconSrc}
            alt=''
            width={16}
            height={16}
            style={{ width: 16, height: 16, display: 'block' }}
          />
        </span>
      ) : (
        <ColorfulIconBadge
          style={badgeStyle}
          shape='pill'
          icon={icon || 'link'}
          iconFill={0}
        />
      )}

      <span
        style={{
          width: '100%',
          margin: 0,
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          color: 'var(--text-content-default, #111314)',
          textAlign: 'center',
          /* Figma 194:153209 is single-line label within 93h — clamp so long mock labels don't grow the card */
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default ServiceRequestCard;
