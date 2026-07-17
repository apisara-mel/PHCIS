import React from 'react';

/* MIH Mobile · Card — Figma DS "Card" (E5DppVK8yi0EKJp1SUuKa9 · 39:407).

   Horizontal, selectable list card. Structure (Figma "Group" 39:409):
     [optional 36px illustration]  ·  Text Group and Badge (39:413)
                                        ├─ Text Group (39:414)
                                        │   ├─ Title     — Mitr, base(16), content/default
                                        │   └─ Sub Title — Sarabun, sm(14), content/tertiary
                                        └─ [optional trailing badge]

   Used for service-type options (booking 58:25640), department rows and the
   "recent" horizontal chips (booking 39:409 instances on 246:34335), etc.

   States (Figma Card state set):
     Default  — surface/card/100        · 1px border/brandprimary/quaternary (#E2F3EB)
     Pressed  — surface/card/brand-100  · 1px border/brandprimary/tertiary   (#C5EDDA)  ← momentary tap-down
     Selected — surface/card/100        · 2px border/brandprimary/default    (#007549)
   `selected` drives the Selected look; the internal pointer state drives
   Pressed and wins over Selected while the finger is down (same contract as
   NavigationMenu's Pressed).

   Tokens: dim/radius/600 (24) · dim/space/400 (16 — padding + illustration↔text gap) ·
   dim/space/050 (2 — title↔subtitle) · dim/stroke/{100,200} · type/size/{base,sm} ·
   type/family/heading-graphic2 (title) · type/family/body (subtitle). */

const stateStyle = ({ selected, pressed }) => {
  if (pressed) {
    return {
      background: 'var(--surface-card-brand-100, #F4FBF8)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
    };
  }
  if (selected) {
    return {
      background: 'var(--surface-card-100, #FFFFFF)',
      border: 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)',
    };
  }
  return {
    background: 'var(--surface-card-100, #FFFFFF)',
    border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
  };
};

const MobileOptionCard = ({
  title,
  subtitle,
  illustration,        /* optional ReactNode rendered in a 36×36 leading slot */
  badge,               /* optional trailing ReactNode (e.g. a MobileBadge) */
  selected = false,
  onClick,
  width,               /* fixed width for the horizontal "recent" variant (e.g. 256) */
  align = 'center',    /* 'center' | 'start' — cross-axis alignment of the row */
  className = '',
  style,
  children,            /* optional custom body, replaces the default title/subtitle group */
}) => {
  const [pressed, setPressed] = React.useState(false);
  const clear = () => setPressed(false);
  const fixed = width != null;
  const w = typeof width === 'number' ? `${width}px` : width;

  return (
    <button
      type='button'
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      aria-pressed={selected}
      className={`flex text-left ${className}`.trim()}
      style={{
        width: fixed ? w : '100%',
        flex: fixed ? `0 0 ${w}` : undefined,
        alignItems: align === 'start' ? 'flex-start' : 'center',
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        cursor: 'pointer',
        transition: 'background 120ms ease, border-color 120ms ease',
        ...stateStyle({ selected, pressed }),
        ...style,
      }}
    >
      {illustration != null && (
        <span
          className='overflow-hidden shrink-0 flex items-center justify-center'
          style={{ width: 36, height: 36 }}
        >
          {illustration}
        </span>
      )}

      {children != null ? (
        children
      ) : (
        <span className='flex flex-col min-w-0' style={{ flex: 1, gap: 'var(--dim-space-050, 2px)' }}>
          <span
            style={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              color: 'var(--text-content-default, #111314)',
              lineHeight: 1.5,
            }}
          >
            {title}
          </span>
          {subtitle != null && (
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-tertiary, #858C92)',
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}

      {badge != null && <span className='shrink-0'>{badge}</span>}
    </button>
  );
};

export default MobileOptionCard;
