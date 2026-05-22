import React, { useState } from 'react';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';

/* MIH QueueSubMenu — Figma "Sub Menu B" (PHCIS-ALL 2624:122779 collapsed
   / 2624:122781 expanded).

   Compact patient-queue side panel that sits alongside the treatment
   form so the doctor can glance at the day's queue without leaving the
   open visit.    Four sections (top → bottom): ตรวจเสร็จแล้ว (teal) · ที่ร่างไว้
   (grey) · ตรวจอยู่ (blue, brand-100 outline) · รอคิว (orange).

   A single green circular toggle button is anchored to the right edge:
     • Collapsed (Figma 2624:122779) — only the toggle is visible
       (chevron_right). Click expands the panel.
     • Expanded  (Figma 2624:122781) — full 327 px panel renders with
       header, "ดูทั้งหมด" button, and queue sections. The toggle now
       shows chevron_left; click collapses it back. */

/* Collapsed strip is intentionally thin — Figma PHCIS|CPOE 195:28425
   shows only the round toggle button "peeking" past the right edge of
   a hairline-thin strip. The button (BrandCircleIconButton sm · 36 px)
   is anchored top-right and overflows the aside by ~half its width
   when collapsed, so the doctor sees just the green chevron knob. */
const COLLAPSED_WIDTH = 24;
const EXPANDED_WIDTH = 327;
const TRANSITION = 'width 240ms cubic-bezier(0.32, 0.72, 0, 1)';

/* Each bucket is `{ items, total }` so the header can show the full
   queue size while the list renders only a short preview. Plain arrays
   are also accepted for backwards compatibility — see `normaliseBucket`. */
const DEFAULT_QUEUE = {
  done: {
    items: [
      { id: 'd1', name: 'นายสมชาย มีสุข' },
      { id: 'd2', name: 'นางสาวดวงใจ พินิจ' },
    ],
    total: 2,
  },
  draft: {
    items: [
      { id: 'dr1', name: 'นางปริญญา รัตนา' },
      { id: 'dr2', name: 'นายภูริ ใจกล้า' },
    ],
    total: 2,
  },
  inProgress: {
    items: [
      { id: 'p1', name: 'นางสุดา ปลอดโปร่ง', badge: 'VIP / ผู้ป่วยพิเศษ' },
      { id: 'p2', name: 'นายศุภชัย แก้วใส' },
    ],
    total: 2,
  },
  waiting: {
    items: [
      { id: 'w1', name: 'นางมาลี อ่อนน้อม' },
      { id: 'w2', name: 'นางสาวธนพร สุนทรา' },
    ],
    total: 2,
  },
};

/* Accepts either `{ items, total }` or a plain array (legacy callers).
   When passed an array, `total` falls back to the array length. */
const normaliseBucket = (bucket) => {
  if (!bucket) return { items: [], total: 0 };
  if (Array.isArray(bucket)) return { items: bucket, total: bucket.length };
  return { items: bucket.items ?? [], total: bucket.total ?? bucket.items?.length ?? 0 };
};

const DOT_TONES = {
  done:       'var(--icon-positive-tertiary, #3EC3B2)', /* teal   */
  draft:      'var(--icon-neutral-tertiary, #9CA3AF)',  /* grey   */
  inProgress: 'var(--icon-info-tertiary, #60A5FA)',     /* blue   */
  waiting:    'var(--icon-warning-tertiary, #FB923C)',  /* orange */
};

/* Single queue row — coloured dot · name · optional VIP badge · chevron. */
const QueueRow = ({ name, tone, badge, emphasis = false, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      padding: 'var(--dim-space-300, 12px)',
      border: emphasis
        ? 'var(--dim-stroke-200, 2px) solid var(--border-card-brand-100, #C5EDDA)'
        : 'var(--dim-stroke-100, 1px) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-card-default, #FFFFFF)',
      cursor: 'pointer',
    }}
  >
    <span
      aria-hidden
      className='shrink-0'
      style={{
        width: 8, height: 8,
        borderRadius: 4,
        background: tone,
      }}
    />
    <span className='flex-1 min-w-0 flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        style={{
          color: 'var(--text-content-default, #171A1F)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
        }}
      >
        {name}
      </span>
      {badge && (
        <ColorfulBadge style='red' size='small' width='hug' hierarchy='secondary'>
          {badge}
        </ColorfulBadge>
      )}
    </span>
    <Icon name='chevron_right' size={16} className='shrink-0' />
  </button>
);

const SectionLabel = ({ children, trailing }) => (
  <div
    className='flex items-center w-full'
    style={{ gap: 'var(--dim-space-400, 16px)' }}
  >
    <span
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-content-secondary, #565D6D)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-regular, 400)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
    {trailing}
  </div>
);

const ViewAllButton = ({ onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='inline-flex items-center justify-center'
    style={{
      height: 36,
      gap: 'var(--dim-space-150, 6px)',
      padding: 'var(--dim-space-150, 6px) var(--dim-space-300, 12px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
      borderRadius: 'var(--dim-radius-200, 8px)',
      background: 'var(--surface-neutralbutton-default, #FFFFFF)',
      color: 'var(--text-neutralbutton-default, #4D5358)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    ดูทั้งหมด
    <Icon name='chevron_right' size={16} />
  </button>
);

const QueueSubMenu = ({
  /** Controlled open/closed. If omitted, the panel manages its own state. */
  expanded: controlledExpanded,
  onExpandedChange,
  /** Patient buckets — defaults to mock data when omitted. */
  queue = DEFAULT_QUEUE,
  /** Click handlers — wire to navigation when ready. */
  onViewAll,
  onPickPatient,
  className = '',
  style = {},
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;
  /* Toggle handler — fires for BOTH icon variants (chevron_right when
     collapsed → expand · chevron_left when expanded → collapse). The
     parent can listen via `onExpandedChange` if it wants to sync other
     UI to the panel state. */
  const toggle = () => {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  const doneBucket       = normaliseBucket(queue.done);
  const draftBucket      = normaliseBucket(queue.draft);
  const inProgressBucket = normaliseBucket(queue.inProgress);
  const waitingBucket    = normaliseBucket(queue.waiting);

  return (
    <aside
      aria-label='คิวผู้ป่วย'
      className={`relative shrink-0 self-stretch ${className}`}
      style={{
        /* Outer placeholder — reserves just the collapsed strip
           footprint so the form column to the right sits flush
           against the panel. The visible panel below is the
           COLLAPSED_WIDTH (24 px) strip. */
        width: COLLAPSED_WIDTH,
        /* `overflow: visible` so the absolute child can extend past
           this placeholder horizontally when expanded. */
        overflow: 'visible',
        ...style,
      }}
    >
      {/* Visual panel — `position: fixed` so the panel (and its
          absolutely-positioned toggle button) stays anchored to the
          viewport regardless of page scroll. The aside placeholder
          above still reserves COLLAPSED_WIDTH in the flex flow so the
          form column never reflows when the panel expands.
          `left: var(--sm-width-closed)` parks the panel immediately
          after the Sidebar rail's collapsed footprint, matching the
          aside's in-flow position. */}
      <div
        className='fixed top-0 bottom-0'
        style={{
          left: 'var(--sm-width-closed)',
          width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
          transition: TRANSITION,
          background: 'var(--surface-navigation-default, #FFFFFF)',
          borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandsecondary-quaternary, #EFF5EF)',
          boxShadow: 'var(--shadow-sidemenu, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))',
          /* Float above the form column AND the sticky page chrome
             (Header z=1200 · Footer z=40 · PatientCard sticky inside
             content) so the expanded overlay covers them cleanly. Set
             just under --sm-z-overlay (1300, Sidebar) so the global
             rail still wins if both stack. */
          zIndex: 1250,
          overflow: 'visible',
        }}
      >
      {/* Clipping wrapper — the panel itself runs `overflow: visible` so
          the toggle button can stick out, but the queue body keeps a
          fixed inner width (EXPANDED_WIDTH) so its layout doesn't
          reflow during the collapse animation. This wrapper hides the
          excess horizontally while the panel is narrower than the
          body. */}
      <div
        className='h-full'
        style={{ width: '100%', overflow: 'hidden' }}
      >
      {/* Expanded body — slides into view when open. Kept mounted in the
          collapsed state with opacity:0 so the slide-in animation has
          content to reveal (no flicker on first expand).
          `overscrollBehavior: contain` traps wheel / touch scroll
          inside this body so reaching the top or bottom never chains
          out to the page underneath — the form column only scrolls
          when the cursor sits outside this panel. */}
      <div
        aria-hidden={!expanded}
        className='flex flex-col h-full'
        style={{
          width: EXPANDED_WIDTH,
          padding: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? 'auto' : 'none',
          transition: 'opacity 200ms ease',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SectionLabel trailing={<ViewAllButton onClick={onViewAll} />}>
            {`ตรวจเสร็จแล้ว (${doneBucket.total})`}
          </SectionLabel>
          {doneBucket.items.map((p) => (
            <QueueRow
              key={p.id}
              name={p.name}
              tone={DOT_TONES.done}
              onClick={onPickPatient ? () => onPickPatient(p, 'done') : undefined}
            />
          ))}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SectionLabel>{`ที่ร่างไว้ (${draftBucket.total})`}</SectionLabel>
          {draftBucket.items.map((p) => (
            <QueueRow
              key={p.id}
              name={p.name}
              tone={DOT_TONES.draft}
              onClick={onPickPatient ? () => onPickPatient(p, 'draft') : undefined}
            />
          ))}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SectionLabel>{`ผู้ป่วยตรวจอยู่ (${inProgressBucket.total})`}</SectionLabel>
          {inProgressBucket.items.map((p) => (
            <QueueRow
              key={p.id}
              name={p.name}
              tone={DOT_TONES.inProgress}
              badge={p.badge}
              emphasis
              onClick={onPickPatient ? () => onPickPatient(p, 'inProgress') : undefined}
            />
          ))}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SectionLabel>{`ผู้ป่วยรอคิว (${waitingBucket.total})`}</SectionLabel>
          {waitingBucket.items.map((p) => (
            <QueueRow
              key={p.id}
              name={p.name}
              tone={DOT_TONES.waiting}
              onClick={onPickPatient ? () => onPickPatient(p, 'waiting') : undefined}
            />
          ))}
        </div>
      </div>
      </div>

      {/* Toggle — Figma PHCIS|CPOE 195:28425 (collapsed · chevron_right)
          and 195:41153 (expanded · chevron_left, `left: 303` on a 327
          px wide panel → button overflows the right edge by 12 px). In
          BOTH states the button is `position: absolute` at top:24px and
          its right edge sits 12 px past the panel's right border, so
          the toggle keeps a fixed visual anchor across the expand /
          collapse animation. The aside runs `overflow: visible` so the
          peek is never clipped. */}
      <BrandCircleIconButton
        size='sm'
        icon={expanded ? 'chevron_left' : 'chevron_right'}
        onClick={toggle}
        aria-label={expanded ? 'ย่อแถบคิวผู้ป่วย' : 'ขยายแถบคิวผู้ป่วย'}
        aria-expanded={expanded}
        style={{
          position: 'absolute',
          top: 'var(--dim-space-600, 24px)',
          right: -20,
          zIndex: 1,
        }}
      />
      </div>
    </aside>
  );
};

export default QueueSubMenu;
