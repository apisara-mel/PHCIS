import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';

/* MIH HubCard — Figma "hub card" (PHCIS-Signin node 217:1587 / instances
   4:501 …). A clickable system tile for the System Selection Hub:
   80×80 illustration, title, description, divider, "last used" footer.

   Props:
     illustration  — img src (single composed SVG from the hub icon set)
     title         — system name (h5 · Mitr 18px)
     description   — supporting copy (body4 · Sarabun 14px)
     lastUsed      — footer timestamp string
     onClick       — fired on click / Enter / Space (omit ⇒ disabled tile)
     disabled      — force non-interactive
     size          — `default` (full /hub page) · `compact` (apps-grid overlay)

   All sizes share Brand Drop Shadow Bottom/200 at rest (same token as
   SystemHubPage). Popover grid uses `compact` inside SystemGridMenu. */

const SHADOW = 'var(--shadow-brand-drop-bottom-200)';
const SHADOW_HOVER =
  'var(--shadow-brand-drop-bottom-300, 0 2px 8px rgba(8,167,104,0.14), 0 1px 3px rgba(8,167,104,0.10))';

/* `compact` — apps-grid overlay (SystemGridMenu) below the 64px header;
   `default` — full SystemHubPage landing grid. */
const HUB_CARD_SIZES = {
  default: {
    padding: 'var(--dim-space-600, 24px)',
    gap: 'var(--dim-space-400, 16px)',
    illustration: 'var(--dim-size-1700, 80px)',
    radius: 'var(--dim-radius-500, 16px)',
    titleSize: 'var(--type-size-lg, 18px)',
    descSize: 'var(--type-size-sm, 14px)',
    footerIcon: 14,
    descLines: 0,
    showLastUsed: true,
  },
  compact: {
    padding: 'var(--dim-space-400, 16px)',
    gap: 'var(--dim-space-300, 12px)',
    illustration: 'var(--dim-size-1200, 56px)',
    radius: 'var(--dim-radius-400, 12px)',
    titleSize: 'var(--type-size-sm, 14px)',
    descSize: 'var(--type-size-xs, 12px)',
    footerIcon: 12,
    descLines: 2,
    showLastUsed: false,
  },
};

const HubCard = ({
  illustration,
  title,
  description,
  lastUsed,
  onClick,
  disabled = false,
  size = 'default',
}) => {
  const [hover, setHover] = useState(false);
  const inert = disabled || !onClick;
  const activate = () => { if (!inert) onClick(); };
  const tone = HUB_CARD_SIZES[size] ?? HUB_CARD_SIZES.default;

  return (
    <article
      role={inert ? undefined : 'button'}
      tabIndex={inert ? undefined : 0}
      onClick={activate}
      onKeyDown={(e) => {
        if (!inert && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(); }
      }}
      onMouseEnter={() => !inert && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: '1 1 0',
        minWidth: 0,
        gap: tone.gap,
        padding: tone.padding,
        background: 'var(--surface-card-100, #FFFFFF)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
        borderRadius: tone.radius,
        boxShadow: hover ? SHADOW_HOVER : SHADOW,
        cursor: inert ? 'default' : 'pointer',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease',
      }}
    >
      {/* 80×80 colored illustration (hub icon set, single composed SVG). */}
      <img
        src={illustration}
        alt=''
        aria-hidden
        style={{
          width: tone.illustration,
          height: tone.illustration,
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--dim-space-100, 4px)',
          flex: '1 1 0',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
            fontSize: tone.titleSize,
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-body)',
            fontSize: tone.descSize,
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            color: 'var(--text-content-tertiary, #858C92)',
            ...(tone.descLines > 0
              ? {
                display: '-webkit-box',
                WebkitLineClamp: tone.descLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }
              : null),
          }}
        >
          {description}
        </p>
      </div>

      {tone.showLastUsed !== false && (
        <>
          <div
            aria-hidden
            style={{
              width: '100%',
              height: 'var(--dim-stroke-100, 1px)',
              background: 'var(--border-neutral-quaternary, #F4F5F5)',
              flexShrink: 0,
            }}
          />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-100, 4px)' }}>
            <Icon name='schedule' size={tone.footerIcon} color='var(--text-content-quaternary, #ADB2B7)' />
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
                color: 'var(--text-content-quaternary, #ADB2B7)',
                whiteSpace: 'nowrap',
              }}
            >
              เข้าใช้งานล่าสุด: {lastUsed}
            </span>
          </div>
        </>
      )}
    </article>
  );
};

export default HubCard;
