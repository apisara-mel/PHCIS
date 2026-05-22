import React, { useState } from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';

/* MIH InventoryCard — Figma "Inventory Card · MIH Design System / Card"
   (node 93:2643). Generic image-led picker card for inventory-style
   choices: ward beds, equipment, vehicles, exam rooms, supply items.
   Pairs a photo (top, 180h) with a metadata block (badge row + bold
   title + tertiary subtext).

   Three visual states per Figma:
     • default  — **1px** neutral border (border/card/default), no shadow.
     • hover    — 1px light-brand border + **outer ring** `0 0 0 3px` in the
                  same tone (reads as 4px brand-100) + --shadow-card-hover.
     • selected — 1px brand border + 3px outer ring (reads as 4px brand-600)
                  + --shadow-card-hover.

   Border width stays **1px** in every state so photo/text never reflow.
   The extra 3px Figma stroke is a **non-layout** box-shadow ring outside
   the border box; the root intentionally omits `overflow:hidden` so that
   ring is not clipped — clipping lives on an inner shell only.

   Hover is auto-detected via mouseEnter/Leave when an `onClick` is
   supplied; consumers can also force a state via the `state` prop
   (e.g. "selected" while a multi-select choice is committed, or
   "hover" for a static documentation preview).

   Geometry contract: outer box is 227×290 with `box-sizing:border-box`;
   inner layout is stable because stroke width never changes.

   Property panel (mirrors Figma):
     • Show Badge       — render the ColorfulBadge slot (default true)
     • Show Status Badge — render the StatusBadge slot (default true)
     • Show Title       — render the bold title (default true)
     • Show Subtext     — render the tertiary subtext (default true)
     • State            — 'default' | 'hover' | 'selected'

   API extensions (beyond the Figma panel):
     • image / imageAlt   — photo src + alt for the header tile
     • title / subtext    — text content
     • badge              — { label, style, icon, ...rest } → ColorfulBadge
     • statusBadge        — { label, style, icon, ...rest } → StatusBadge
     • selected           — boolean shortcut for state='selected'
     • onClick / disabled — interactive surface (Enter/Space activates)
     • className / style  — passthrough

   Token contract (design.md / index.css):
     --surface-card-100                card face
     --border-card-default             default 1px stroke
     --border-brandPrimary-quaternary  hover ring + 1px stroke (brand-100)
     --border-brandprimary-default     selected ring + 1px stroke (brand-600)
     --shadow-card-hover               hover/selected elevation (brand-tinted)
     --dim-radius-400                  card + photo corner radius (12)
     --dim-space-200/400               gap + padding (8 / 16)
     --dim-stroke-100                  border width (fixed 1px)
     --type-family-{heading,body}      Sarabun bold + regular
     --type-size-sm                    14px title + subtext */

const DEFAULT_IMAGE = '/images/bed-default.jpg';

const HOVER_SHADOW =
  'var(--shadow-card-hover, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))';

const cardBaseStyle = {
  width: 227,
  background: 'transparent',
  borderRadius: 'var(--dim-radius-400, 12px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  boxSizing: 'border-box',
};

/* 1px border always; hover/selected add a 3px outer ring (no layout shift). */
const STROKE = 'var(--dim-stroke-100, 1px)';

const resolveBorder = (resolved) => {
  const base = {
    borderStyle: 'solid',
    borderWidth: STROKE,
  };
  if (resolved === 'selected') {
    const ring = 'var(--border-brandprimary-default, var(--border-brandPrimary-default, #007549))';
    return {
      ...base,
      borderColor: ring,
      boxShadow: `0 0 0 3px ${ring}, ${HOVER_SHADOW}`,
    };
  }
  if (resolved === 'hover') {
    const ring = 'var(--border-brandPrimary-quaternary, #C5EDDA)';
    return {
      ...base,
      borderColor: ring,
      boxShadow: `0 0 0 3px ${ring}, ${HOVER_SHADOW}`,
    };
  }
  return {
    ...base,
    borderColor: 'var(--border-card-default, #E2E4E6)',
    boxShadow: 'none',
  };
};

const InventoryCard = ({
  image = DEFAULT_IMAGE,
  imageAlt = 'Inventory item photo',
  title = 'Title',
  subtext = 'Subtext',
  badge = { label: 'Info', style: 'blue' },
  statusBadge = { label: 'Success', style: 'success' },
  showBadge = true,
  showStatusBadge = true,
  showTitle = true,
  showSubtext = true,
  state,
  selected = false,
  disabled = false,
  onClick,
  className = '',
  style = {},
  ...rest
}) => {
  const [hover, setHover] = useState(false);
  const interactive = !disabled && typeof onClick === 'function';

  /* Explicit `state` wins; otherwise selected > hover > default. */
  let resolved = state;
  if (!resolved) {
    if (selected) resolved = 'selected';
    else if (interactive && hover) resolved = 'hover';
    else resolved = 'default';
  }

  const borderStyle = resolveBorder(resolved);

  const handleClick = () => { if (interactive) onClick(); };
  const handleKey = (e) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  /* Badge defaults — `label` (the text) is forwarded as `children` to
     ColorfulBadge/StatusBadge, since that is the underlying component
     API. `icon` opts in to a leading material symbol. Caller can pass
     any other badge prop directly via the badge object (style,
     hierarchy, fill, showDot, etc.). */
  const { label: badgeLabel, ...badgeRest } = badge || {};
  const { label: statusLabel, ...statusRest } = statusBadge || {};
  const colorfulProps = {
    size: 'small',
    fill: 'default',
    hierarchy: 'secondary',
    showText: true,
    showDot: true,
    ...badgeRest,
  };
  const statusProps = {
    size: 'small',
    fill: 'default',
    showText: true,
    showDot: true,
    ...statusRest,
  };

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={disabled || undefined}
      aria-pressed={interactive ? resolved === 'selected' : undefined}
      onClick={handleClick}
      onKeyDown={handleKey}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      className={className}
      style={{
        ...cardBaseStyle,
        ...borderStyle,
        cursor: interactive ? 'pointer' : 'default',
        opacity: disabled ? 0.55 : 1,
        transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
        ...style,
      }}
      {...rest}
    >
      {/* Inner shell: clips photo + text to radius; root stays overflow
          visible so the 3px hover/selected ring is not clipped. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          flex: 1,
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-card-100, #FFFFFF)',
        }}
      >
        {/* Photo — top 180px tile. Per the updated Figma the image has no
            inner stroke; the outer card border alone defines the edge. */}
        <div
          style={{
            height: 180,
            width: '100%',
            overflow: 'hidden',
            borderTopLeftRadius: 'var(--dim-radius-400, 12px)',
            borderTopRightRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-card-100, #FFFFFF)',
            flexShrink: 0,
          }}
        >
          <img
            src={image}
            alt={imageAlt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Text block — badge row + title + subtext. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'var(--dim-space-150)',
            padding: 'var(--dim-space-400, 16px)',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          {(showBadge || showStatusBadge) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--dim-space-200, 8px)',
                width: '100%',
                flexWrap: 'wrap',
              }}
            >
              {showBadge && <ColorfulBadge {...colorfulProps}>{badgeLabel}</ColorfulBadge>}
              {showStatusBadge && <StatusBadge {...statusProps}>{statusLabel}</StatusBadge>}
            </div>
          )}
          {showTitle && (
            <p
              style={{
                margin: 'var(--dim-space-0)',
                width: '100%',
                fontFamily: 'var(--type-family-heading, var(--type-family-body))',
                fontWeight: 'var(--type-weight-bold, 700)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                color: 'var(--text-content-default, var(--text-content-primary, #363B3F))',
              }}
            >
              {title}
            </p>
          )}
          {showSubtext && (
            <p
              style={{
                margin: 'var(--dim-space-0)',
                width: '100%',
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-regular, 400)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryCard;
