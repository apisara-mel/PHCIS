import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Switch       from '@/components/switch/Switch';
import Checkbox     from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Stepper      from '@/components/stepper/Stepper';
import InputField   from '@/components/forms/InputField';
import Select       from '@/components/forms/Select';
import BrandIconButton       from '@/components/button/BrandIconButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

/* Skeleton-row pulse — idempotent module-load stylesheet injection so HMR
   doesn't leave a stale <style> behind. Mirrors the AISearch chrome-strip
   pattern in CLAUDE.md. The bar uses `--surface-table-hover` (brand-p50)
   so the placeholder tint stays consistent with hover rows. */
if (typeof document !== 'undefined' && !document.getElementById('mih-table-skeleton-style')) {
  const css = document.createElement('style');
  css.id = 'mih-table-skeleton-style';
  css.textContent = `
    @keyframes mih-table-skeleton-pulse {
      0%, 100% { opacity: 0.55; }
      50%      { opacity: 1; }
    }
    .mih-table-skeleton-bar {
      height: var(--dim-space-300, 12px);
      background: var(--surface-table-hover);
      border-radius: var(--dim-radius-150, 6px);
      animation: mih-table-skeleton-pulse 1.4s ease-in-out infinite;
    }
  `;
  document.head.appendChild(css);
}

/* MIH Table — Figma node 49FBtstXs6YQGlpVqREqhy / 22:11760.
   Brand-aware via design.md tokens (surface.table.*, border.table.*,
   text.table.*) so switching `<html data-brand="...">` retints
   the header bg, hover row, and dividers consistently.

   Generic by design — consumers pass a `columns` config and a
   `rows` array; cell content comes from `column.render(row, index)`
   or falls back to `<EllipsisText text={row[column.key]} />`. The
   header text reads from `column.label` first, then `column.header`
   (two conventions coexist in the codebase — both are supported).

   Supports:
     • Sortable headers (sort icon flips per direction)
     • Sticky-left columns (first N columns lock to the viewport)
     • Drag-to-reorder rows (HTML5 DnD, edit-mode only)
     • Whole-row click → navigate / open detail (Enter/Space too)
     • Hover row bg (skipped in edit mode + while dragging)
     • Empty state                                                  */

const Sym = ({ name, size = 14, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Truncate text with a fallback tooltip on hover when it overflows.
   Default cell renderer for columns that don't supply `render`.

   `fill` (default true) — add `flex-1` so the cell grows like a table column.
   Set `fill={false}` for inline flex rows (e.g. Header breadcrumb) where each
   segment should only use natural width up to remaining space, not split the
   row equally between segments.

   Tooltip portals to document.body (fixed) so table `overflow-x: auto`
   never clips the full name. */
export const EllipsisText = ({ text, className = '', fill = true, compact = false }) => {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [isOverflow, setIsOverflow] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  useEffect(() => {
    const check = () => {
      if (!ref.current) return;
      setIsOverflow(ref.current.scrollWidth > ref.current.clientWidth);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [text]);
  useLayoutEffect(() => {
    if (!hovered || !isOverflow || !wrapRef.current) return undefined;
    const place = () => {
      const r = wrapRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [hovered, isOverflow, text]);
  return (
    <span
      ref={wrapRef}
      className={`relative block min-w-0 ${fill ? 'flex-1' : ''}`.trim()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Clip แนวนอนที่ชั้นนอก — ข้อความอยู่ชั้นใน (line-height สูง + padding)
         เพื่อไม่ให้ overflow:hidden ตัดสระ/วรรณยุกต์ไทยด้านบน */}
      <span
        ref={ref}
        className={`block min-w-0 ${className}`}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            lineHeight: compact ? 1.5 : 1.75,
            paddingTop: compact ? 'var(--dim-space-050, 2px)' : 'var(--dim-space-150, 6px)',
            paddingBottom: compact ? 'var(--dim-space-050, 2px)' : 'var(--dim-space-150, 6px)',
          }}
        >
          {text}
        </span>
      </span>
      {hovered && isOverflow && typeof document !== 'undefined' && createPortal(
        <span
          className='pointer-events-none'
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            zIndex: 'var(--sm-z-tooltip, 1300)',
            maxWidth: 480,
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            padding: 'var(--dim-space-150, 6px) var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-150, 6px)',
            background: 'var(--surface-dropdown-default)',
            color: 'var(--text-list-default)',
            border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
            boxShadow: 'var(--shadow-dropdown)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}
        >
          {text}
        </span>,
        document.body,
      )}
    </span>
  );
};

const DRAG_COL_W = 40;

const colWidthPx = (c) => (typeof c.width === 'number' ? c.width : 0) || c.minWidth || 0;

const colSizeStyle = (c) => c.flex
  ? { flex: '1 0 0', minWidth: c.minWidth || 0 }
  : { width: c.width, flexShrink: 0 };

/* ── Figma-spec atoms ─────────────────────────────────────────
   Standalone named exports that mirror the Figma "MIH Design System ·
   Table" property panels 1:1. They render the visual states (default,
   hover, slot show/hide) without carrying any row/column orchestration
   so callers can compose them inside the generic <Table> via
   `column.render`, or use them on their own (e.g. for state-matrix
   docs).
   • HeaderCell        — Figma 177:6297
   • DataCell          — Figma 20:1894
   • FooterCell        — Figma 41:6279
   • TableSelectAllRow — Figma 24:25939
   • TableSummary      — Figma 41:6764
   ──────────────────────────────────────────────────────────── */

/* HeaderCell — title + optional subtext + optional sort icon.
   Title typography aliases design.md §6.34.1:
     family `--type-family-heading-content` (Mitr)
     weight `--type-weight-title` (Regular 400)
     size   `--type-size-table-title` (12px fixed — exempt from font-size control)
   Property panel matches Figma node 177:6297 (state · showSorting ·
   showSubtext). When `state` is omitted it resolves from internal hover
   (mouseenter / focusin). */
export const HeaderCell = React.forwardRef(function HeaderCell(
  {
    title       = 'Title',
    subtext     = 'subtext',
    state,                                       /* force 'default' | 'hover' */
    showSorting = true,
    showSubtext = true,
    titleWrap   = false,
    sortDirection,                               /* null | 'asc' | 'desc' — overrides icon */
    align       = 'left',
    onClick,
    className   = '',
    style       = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const effectiveState = state || (internalHover ? 'hover' : 'default');
  const isHover = effectiveState === 'hover';
  const sortIcon = sortDirection === 'asc'
    ? 'expand_less'
    : sortDirection === 'desc'
      ? 'expand_more'
      : 'unfold_more';
  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => !state && setInternalHover(true)}
      onMouseLeave={() => !state && setInternalHover(false)}
      className={`inline-flex ${titleWrap ? 'items-start' : 'items-center'} ${className}`}
      style={{
        minHeight: 44,
        gap: 'var(--dim-space-100, 4px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        background: isHover
          ? 'var(--surface-table-hover, var(--brand-p50, #F4FBF8))'
          : 'var(--surface-table-header, var(--brand-p50, #F4FBF8))',
        borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-table-default, var(--brand-p100, #E2F3EB))',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 160ms cubic-bezier(0.32, 0.72, 0, 1)',
        ...style,
      }}
      {...rest}
    >
      <div className='flex flex-col min-w-0' style={{ lineHeight: 1.5, flex: '1 1 auto' }}>
        <span
          title={!titleWrap && typeof title === 'string' ? title : undefined}
          style={{
            color: 'var(--text-table-title, var(--brand-p800, #004C31))',
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            /* Fixed 12px — do NOT fall back to --type-size-xs (becomes 10px under data-font-size=sm). */
            fontSize: 'var(--type-size-table-title, 12px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            display: 'block',
            minWidth: 0,
            ...(titleWrap
              ? { whiteSpace: 'normal', overflow: 'visible', wordBreak: 'break-word' }
              : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
          }}
        >
          {title}
        </span>
        {showSubtext && subtext != null && (
          <span
            title={typeof subtext === 'string' ? subtext : undefined}
            style={{
              color: 'var(--text-table-subtext, var(--text-content-tertiary, #858C92))',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              display: 'block',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtext}
          </span>
        )}
      </div>
      {showSorting && (
        <Sym
          name={sortIcon}
          size={14}
          /* Idle (unsorted + not hovered): muted secondary-quaternary gray.
             Hover or Sorted (asc/desc): brand-primary green — signals the
             column is interactable or driving the row order. */
          color={(sortDirection || isHover)
            ? 'var(--icon-brandPrimary-default, var(--brand-p700, #007549))'
            : 'var(--icon-brandSecondary-quaternary, var(--icon-input-default, #ADB2B7))'}
        />
      )}
    </div>
  );
});

/* FooterCell — brand-p100 surface, bold sm brand-p800 text. */
export const FooterCell = React.forwardRef(function FooterCell(
  {
    title     = 'Title',
    align     = 'left',
    className = '',
    style     = {},
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-center ${className}`}
      style={{
        minHeight: 44,
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        background: 'var(--surface-table-footer, var(--brand-p100, #E2F3EB))',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        ...style,
      }}
      {...rest}
    >
      <span style={{
        color: 'var(--text-table-footer, var(--brand-p800, #004C31))',
        fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
      }}>
        {title}
      </span>
    </div>
  );
});

/* ── DataCell slot helpers ───────────────────────────────────
   The interactive slots (Checkbox / Switch / Stepper / InputField /
   Select / IconButton / Badge) all alias the canonical design-system
   components — no bespoke visuals here. These helpers only handle the
   slot-specific layout details (profile avatar crop, text-group typo,
   default placeholders) that aren't worth a separate component.

   Profile + TextGroup are layout-only atoms with no design-system
   equivalent yet, so they're inlined as helpers below. */

const ProfileSlot = ({ src = '/images/doctor-a.png', alt = '' }) => (
  <span aria-hidden={!alt} style={{
    width: 'var(--dim-size-700, 36px)',
    height: 'var(--dim-size-700, 36px)',
    flexShrink: 0,
    borderRadius: 'var(--dim-radius-full)',
    background: 'var(--surface-table-header)',
    border: 'var(--dim-stroke-100) solid var(--border-table-default)',
    boxSizing: 'border-box',
    overflow: 'hidden',
    position: 'relative',
    display: 'inline-block',
  }}>
    <img
      src={src}
      alt={alt}
      style={{
        position: 'absolute',
        width: '203.9%', height: '204.23%',
        left: '-1.3%', top: '-103.09%',
        maxWidth: 'none',
      }}
    />
  </span>
);

const TextGroupSlot = ({ text = 'text', subtext = 'text', showText = true, showSubtext = true }) => (
  <div className='inline-flex flex-col shrink-0' style={{
    fontFamily: 'var(--type-family-body)',
    lineHeight: 1.5,
  }}>
    {showText && (
      <span style={{
        color: 'var(--text-neutral-default, var(--text-content-secondary, #4D5358))',
        fontSize: 'var(--type-size-content, var(--type-size-sm, 14px))',
      }}>{text}</span>
    )}
    {showSubtext && (
      <span style={{
        color: 'var(--text-neutral-tertiary, var(--text-content-tertiary, #ADB2B7))',
        fontSize: 'var(--type-size-xs, 12px)',
      }}>{subtext}</span>
    )}
  </div>
);

/* DataCell — Figma 20:1894 with the full property panel.
   Defaults match Figma's master variant (every slot on except Switch).
   `state` forces visual state for design-system grids; in real use it
   resolves from internal hover.

   Live interactivity: passing `onCheckChange` / `onSwitchChange` /
   `onButton{1,2,3}Click` wraps the corresponding slot in a real button
   so the cell becomes keyboard-activatable. */
export const DataCell = React.forwardRef(function DataCell(
  {
    /* Show flags — mirror Figma property panel */
    showCheckbox   = true,
    showProfile    = true,
    showTextGroup  = true,
    showText       = true,
    showSubtext    = true,
    showStepper    = true,
    showInputField = true,
    showSelect     = true,
    showBadge      = true,
    showSwitch     = false,
    showButton1    = true,
    showButton2    = true,
    showButton3    = true,
    /* Content props */
    text         = 'text',
    subtext      = 'text',
    badgeText    = 'text',
    badgeIcon    = 'pill',
    profileSrc,
    profileAlt   = '',
    inputPlaceholder  = 'Placeholder',
    selectPlaceholder = 'Select option',
    checked      = false,
    switchOn     = true,
    button1Icon  = 'image',
    button2Icon  = 'image',
    button3Icon  = 'image',
    /* Live handlers — turn the corresponding slot stub into a button */
    onCheckChange,
    onSwitchChange,
    onButton1Click,
    onButton2Click,
    onButton3Click,
    /* Visual state */
    state,                                       /* force 'default' | 'hover' */
    onClick,
    children,                                    /* custom content (overrides slots) */
    className = '',
    style     = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const effectiveState = state || (internalHover ? 'hover' : 'default');
  const isHover = effectiveState === 'hover';
  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseEnter={() => !state && setInternalHover(true)}
      onMouseLeave={() => !state && setInternalHover(false)}
      className={`inline-flex items-center ${className}`}
      style={{
        minHeight: 56,
        gap: 'var(--dim-space-150, 6px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        background: isHover
          ? 'var(--surface-table-hover, var(--brand-p50, #F4FBF8))'
          : 'var(--surface-table-default, #FFFFFF)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-table-line, var(--brand-p50, #F4FBF8))',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 160ms cubic-bezier(0.32, 0.72, 0, 1)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {children ?? (
        <>
          {showCheckbox  && (
            <Checkbox
              checked={checked}
              onChange={onCheckChange || (() => {})}
              aria-label={checked ? 'Uncheck row' : 'Check row'}
            />
          )}
          {showProfile   && <ProfileSlot src={profileSrc} alt={profileAlt} />}
          {showTextGroup && <TextGroupSlot text={text} subtext={subtext} showText={showText} showSubtext={showSubtext} />}
          {showStepper   && (
            <Stepper size='small' min={0} defaultValue={0} />
          )}
          {showInputField&& (
            <InputField
              size='sm'
              placeholder={inputPlaceholder}
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              style={{ minWidth: 128, flexShrink: 0 }}
            />
          )}
          {showSelect    && (
            <Select
              size='sm'
              placeholder={selectPlaceholder}
              options={[]}
              showFieldName={false}
              showHelperText={false}
              showLeadingIcon={false}
              style={{ minWidth: 128, flexShrink: 0 }}
            />
          )}
          {showBadge     && (
            <ColorfulBadge
              style='teal'
              size='default'
              hierarchy='secondary'
              showDot
              icon={badgeIcon}
            >
              {badgeText}
            </ColorfulBadge>
          )}
          {showSwitch    && (
            <Switch
              checked={switchOn}
              onChange={onSwitchChange || (() => {})}
              aria-label={switchOn ? 'Switch off' : 'Switch on'}
            />
          )}
          {showButton1   && (
            <BrandSubdueIconButton
              variant='outline'
              size='sm'
              icon={button1Icon}
              onClick={onButton1Click ? (e) => { e.stopPropagation(); onButton1Click(e); } : undefined}
              aria-label='Action 1'
            />
          )}
          {showButton2   && (
            <BrandSubdueIconButton
              variant='outline'
              size='sm'
              icon={button2Icon}
              onClick={onButton2Click ? (e) => { e.stopPropagation(); onButton2Click(e); } : undefined}
              aria-label='Action 2'
            />
          )}
          {showButton3   && (
            <BrandIconButton
              variant='fill'
              size='sm'
              icon={button3Icon}
              onClick={onButton3Click ? (e) => { e.stopPropagation(); onButton3Click(e); } : undefined}
              aria-label='Action 3'
            />
          )}
        </>
      )}
    </div>
  );
});

/* TableRow — Figma 1:277 (variants Default / Hover). Container that
   tracks hover once for the whole row, then propagates `state="hover"`
   down to every <DataCell> child so the entire row tints in unison
   (instead of cell-by-cell, which feels "flashy" as the cursor crosses
   column boundaries).

   Opt-out per cell: pass `state="default"` (or any explicit value) on
   the DataCell — TableRow never overrides an already-set state. Use
   this for action columns (icon buttons, switches) where the row-hover
   tint would compete with the cell's own interactive surface. */
export const TableRow = React.forwardRef(function TableRow(
  {
    children,
    state,                                       /* force 'default' | 'hover' */
    onClick,
    className = '',
    style     = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const effectiveState = state || (internalHover ? 'hover' : 'default');

  /* Clone DataCell-like children and inject `state` unless the child
     already has it (allowing per-cell opt-out). We don't constrain the
     check to a specific component type — any child that understands a
     `state` prop will pick it up. */
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.props.state !== undefined) return child;
    return React.cloneElement(child, { state: effectiveState });
  });

  return (
    <div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.target.closest('button, a, input')) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); }
      }}
      onMouseEnter={() => !state && setInternalHover(true)}
      onMouseLeave={() => !state && setInternalHover(false)}
      className={`flex w-full ${className}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {enhancedChildren}
    </div>
  );
});

/* TableSelectAllRow — Figma 24:25939. A wide caption cell followed by
   N checkbox-only DataCells (used to select an entire column instead of
   a row, mirroring the Figma demo). */
export const TableSelectAllRow = React.forwardRef(function TableSelectAllRow(
  {
    label = 'เลือกคอลัมน์ทั้งหมด →',
    cells = 10,                                 /* number of trailing checkbox cells */
    cellWidth = 120,
    leadingWidth,                                /* default: flex-1 */
    className = '',
    style     = {},
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-center w-full ${className}`}
      style={style}
      {...rest}
    >
      <div
        className='inline-flex items-center'
        style={{
          minHeight: 56,
          gap: 'var(--dim-space-150, 6px)',
          paddingLeft: 'var(--dim-space-400, 16px)',
          paddingRight: 'var(--dim-space-400, 16px)',
          paddingTop: 'var(--dim-space-200, 8px)',
          paddingBottom: 'var(--dim-space-200, 8px)',
          background: 'var(--surface-table-default, #FFFFFF)',
          borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-table-line, var(--brand-p50, #F4FBF8))',
          ...(leadingWidth ? { width: leadingWidth } : { flex: '1 0 0' }),
        }}
      >
        <span style={{
          color: 'var(--text-content-secondary, #636B72)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          lineHeight: 1.5,
        }}>
          {label}
        </span>
      </div>
      {Array.from({ length: cells }).map((_, i) => (
        <DataCell
          key={i}
          style={{ width: cellWidth }}
          showCheckbox
          showProfile={false}
          showTextGroup={false}
          showStepper={false}
          showInputField={false}
          showSelect={false}
          showBadge={false}
          showSwitch={false}
          showButton1={false}
          showButton2={false}
          showButton3={false}
        />
      ))}
    </div>
  );
});

/* TableSummary — Figma 41:6764. Row of FooterCells (one per column). */
export const TableSummary = React.forwardRef(function TableSummary(
  {
    cells = [],                                 /* [{ title, width? }] */
    className = '',
    style     = {},
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`inline-flex items-center ${className}`}
      style={style}
      {...rest}
    >
      {cells.map((c, i) => (
        <FooterCell
          key={i}
          title={c.title}
          style={c.width ? { width: c.width } : undefined}
        />
      ))}
    </div>
  );
});

/* Internal header cell used by the generic <Table> orchestrator below.
   Aliases the exported <HeaderCell /> DS atom (Figma 177:6297) so the
   hover state, sort-icon color tween, and border-bottom token come from
   a single source of truth. The orchestrator layer only adds:
     • column-sizing (`colSizeStyle`)
     • sticky-left positioning
     • sortDirection derived from `sortIconName`
   No bespoke header styles here — keep the design system in HeaderCell. */
const TableHeaderInternal = ({
  column,
  sortable,
  sortIconName,
  sticky,
  stickyLeft,
  stickyShadow,
  onSort,
  /* When non-null (page-sticky mode), the header row lives OUTSIDE the
     X-scrolling body, so its sticky-left columns can't use CSS
     `position: sticky; left:` (no scrollport to track). We instead place
     them with a counter-transform that cancels the parent's
     `translateX(-scrollX)` so they appear pinned. */
  stickyTransformX = null,
}) => {
  /* `sortIconName` is the orchestrator's pre-computed icon name; map it
     back to the prop name `<HeaderCell>` expects so it can tint the icon
     (green when sorted/hovered, gray otherwise). */
  const sortDirection = sortIconName === 'expand_less'
    ? 'asc'
    : sortIconName === 'expand_more'
      ? 'desc'
      : null;

  const stickyStyle = !sticky
    ? null
    : stickyTransformX != null
      ? {
          position: 'relative',
          transform: `translate3d(${stickyTransformX}px, 0, 0)`,
          background: 'var(--surface-table-header)',
          willChange: 'transform',
          zIndex: 30 - (column._idx ?? 0),
          boxShadow: stickyShadow
            ? '6px 0 10px -6px var(--PrimaryShadow-601)'
            : undefined,
        }
      : {
          position: 'sticky',
          left: stickyLeft,
          zIndex: 30 - (column._idx ?? 0),
          boxShadow: stickyShadow
            ? '6px 0 10px -6px var(--PrimaryShadow-601)'
            : undefined,
        };

  /* Column heading source — accept BOTH `label` and `header` so the
     table is forgiving about which name callers use. Two conventions
     coexist in the codebase: queue tables (OPD / Treatment /
     Registration / Components Library queue demo) use `label:`, while
     the in-form tables (Step 4 ICD-10 diagnosis, Step 5 medication
     orders, RegistrationQueuePage's main list) use `header:`. Without
     this fallback, every `header:`-based column rendered HeaderCell's
     default `title='Title'` placeholder — that's the source of the
     "Title Title Title …" headers users saw on Step 4's ICD-10 table
     (Figma 317:29773;161:36938-36945 → วันที่ / เวลา / รหัส /
     การวินิจฉัย / ประเภท / การดำเนินการ). Prefer `label` when both are
     provided so existing call sites that explicitly set `label` keep
     their current behaviour. */
  const title = column.label ?? column.header;
  return (
    <HeaderCell
      title={title}
      subtext={column.subtext}
      showSubtext={!!column.subtext}
      showSorting={sortable}
      sortDirection={sortDirection}
      titleWrap={!!column.headerWrap}
      align={column.align === 'center' ? 'center' : 'left'}
      onClick={sortable ? () => onSort(column.key) : undefined}
      aria-disabled={!sortable}
      style={{
        ...colSizeStyle(column),
        ...stickyStyle,
        cursor: sortable ? 'pointer' : 'default',
      }}
    />
  );
};

const Row = ({
  row, index, columns,
  stickyColCount, stickyLeft, stickyShadow,
  editMode, isDragging, isOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onRowClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const isHover = hovered && !isDragging && !editMode && !!onRowClick;

  /* Resolve row background once so sticky cells echo the same swatch.
     Drag-over wins → list-hover; row-hover → table-hover; else default. */
  const rowBg = isOver
    ? 'var(--surface-list-hover)'
    : (isHover ? 'var(--surface-table-hover)' : 'var(--surface-table-default)');

  return (
    <div
      role={editMode || !onRowClick ? undefined : 'button'}
      tabIndex={editMode || !onRowClick ? undefined : 0}
      /* `items-stretch` (not `items-center`) so every cell fills the full
         row height. Sticky cells own their own background that must
         completely cover whatever non-sticky content scrolls behind them.
         With `items-center`, sticky cells only grew to their own
         (often single-line) content height while a tall non-sticky cell
         (e.g. the 3-line VitalsCell) stretched the row to ~70 px — its
         top/bottom edges peeked above/below the sticky cell's shorter
         background during horizontal scroll, producing the ghost-text
         bleed-through (slices of BP values like "0/80" / "/80" appearing
         behind the คิว / HN sticky columns). Each cell still has
         `display: flex; alignItems: center` internally so the content
         remains vertically centered — only the cell's painted box now
         spans the row. */
      className='flex w-full items-stretch transition-all duration-150 ease-out'
      draggable={editMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if (editMode || !onRowClick) return;
        if (e.target.closest('a, button')) return;
        onRowClick(row);
      }}
      onKeyDown={(e) => {
        if (editMode || !onRowClick) return;
        if (e.target.closest('a, button')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick(row);
        }
      }}
      style={{
        background: rowBg,
        borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)',
        minHeight: 64,
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-content, var(--type-size-sm, 14px))',
        lineHeight: 1.5,
        cursor: editMode
          ? (isDragging ? 'grabbing' : 'grab')
          : (onRowClick ? 'pointer' : 'default'),
        opacity: isDragging ? 0.4 : 1,
        userSelect: editMode ? 'none' : 'auto',
      }}
    >
      {editMode && (
        <div
          aria-label={`drag row ${index + 1}`}
          style={{
            width: DRAG_COL_W, flexShrink: 0,
            /* Pin the drag handle to the row's left edge so it stays
               visible while the table scrolls horizontally. zIndex sits
               above sticky data columns (max 20) so it never gets
               covered by the leftmost sticky cell's overlay shadow. */
            position: 'sticky',
            left: 'var(--dim-space-0)',
            zIndex: 21,
            background: rowBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-content-tertiary)', cursor: 'grab',
          }}
        >
          <Sym name='drag_indicator' size={20} color='currentColor' />
        </div>
      )}
      {columns.map((c, colIdx) => {
        const isSticky = colIdx < stickyColCount;
        const cellStyle = {
          ...colSizeStyle(c),
          boxSizing: 'border-box',
          ...(isSticky ? {
            position: 'sticky',
            left: stickyLeft(colIdx),
            zIndex: 20 - colIdx,
            background: rowBg,
            boxShadow: stickyShadow && colIdx === stickyColCount - 1
              ? '6px 0 10px -6px var(--PrimaryShadow-601)'
              : undefined,
          } : null),
          display: 'flex', alignItems: 'center',
          justifyContent: c.align === 'center' ? 'center' : 'flex-start',
          gap: 'var(--dim-space-150)',
          paddingLeft:  'var(--dim-space-400)',
          paddingRight: 'var(--dim-space-400)',
          paddingTop:    'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          minWidth: c.flex ? c.minWidth : undefined,
          /* visible — overflow:hidden clips Thai diacritics on Sarabun */
          overflow: 'visible',
        };
        const node = c.render
          ? c.render(row, index, { editMode })
          : (c.key === 'name' || c.key === 'patientName')
            ? (
              <MaskedWorklistName
                name={row[c.key]}
                recordKey={row.hn || row.id || row.queue}
              />
            )
            : <EllipsisText text={String(row[c.key] ?? '')} />;
        return (
          <div key={c.key} style={cellStyle}>{node}</div>
        );
      })}
    </div>
  );
};

const Table = ({
  columns,
  rows,
  rowKey = (row) => row.id,

  /* Sorting */
  sortConfig = { key: null, direction: 'asc' },
  onSort,

  /* Sticky-left columns */
  stickyColCount = 0,

  /* Row interactions */
  onRowClick,

  /* Drag-reorder (edit-mode) */
  editMode = false,
  draggedIdx = null,
  overIdx = null,
  onDragStart, onDragOver, onDrop, onDragEnd,

  /* Pin the header row to the page scroll instead of the table's own
     overflow box (Pagination already does this at `bottom: 0`). Pass the
     cumulative height of any sticky chrome stacked above the table — e.g.
     `QUEUE_STICKY_UNDER_TABS` (CSS var that tracks Topbar auto-hide) or a
     number like 113. Default `null` keeps the legacy behavior (header
     sticks inside the table wrapper only). Set to `0` to opt in to
     page-scroll sticky without an offset. Accepts a CSS length string. */
  stickyHeaderTop = null,

  /* Empty state. `emptyMessage` is the primary line (title). `emptySubtext`
     is an optional secondary line for guidance ("ลองปรับตัวกรอง…"). Pass an
     `emptyIllustration` node (Lottie / <img>) to render an illustration above
     the text — Figma's Table system has no canonical empty-state symbol, so
     this stays opt-in and falls back to the plain title-only layout. */
  emptyMessage = 'ไม่พบข้อมูล',
  emptySubtext = null,
  emptyIllustration = null,

  /* Loading / skeleton state. When `loading` is true, the rows array is
     ignored and N placeholder rows are rendered with pulsing bars sized
     to each column's width. Use this while fetching server data so the
     user sees the column structure immediately instead of an empty box
     followed by a flash of content. */
  loading = false,
  skeletonRows = 5,

  /* Extra inset at the far-right edge of the scrollable table content
     (header + body). Useful when the last column's action buttons sit
     flush against the table border at scroll end. */
  trailingInset = null,

  className = '',
  style = {},
}) => {
  /* When `stickyHeaderTop` is a number, the header pins to the PAGE
     viewport (mirrors the Pagination sticky at `bottom: 0`). We can't do
     that while the table wrapper owns the X-scroll: `overflow-x: auto`
     makes the wrapper a scroll container, and Chrome/Safari/Firefox all
     trap sticky-Y children inside it regardless of `overflow-y: clip`.
     Solution → split into two siblings:
       1. Sticky header band, OUTSIDE the X-scroller, with internal
          `overflow: hidden` + `transform: translateX(-scrollX)` to mirror
          the body's horizontal scroll position.
       2. Body that is the real X-scroll container.
     A small effect syncs `scrollX` so the header tracks the body 1:1. */
  const usePageSticky = stickyHeaderTop !== null;

  const wrapRef = useRef(null);
  const bodyRef = useRef(null);
  const [stickyShadow, setStickyShadow] = useState(false);
  const [scrollX, setScrollX] = useState(0);

  useEffect(() => {
    const el = usePageSticky ? bodyRef.current : wrapRef.current;
    if (!el) return;
    const onScroll = () => {
      const sl = el.scrollLeft;
      setStickyShadow(sl > 0);
      if (usePageSticky) setScrollX(sl);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [usePageSticky]);

  const stickyLeft = (colIdx) => {
    let left = editMode ? DRAG_COL_W : 0;
    for (let i = 0; i < colIdx; i += 1) {
      left += colWidthPx(columns[i]);
    }
    return left;
  };

  const totalMinWidth = columns.reduce(
    (s, c) => s + colWidthPx(c), 0,
  ) + (editMode ? DRAG_COL_W : 0);

  const trailingInsetStyle = trailingInset ? { paddingRight: trailingInset } : null;

  const isSortable = (c) => c.sortable !== false && !!onSort;

  /* Header cells — shared between legacy & page-sticky render paths. In
     page-sticky mode we pass `stickyTransformX={scrollX}` so each sticky
     column counters the row's translateX and stays visually pinned. */
  const headerCells = (
    <>
      {editMode && (
        <div
          aria-hidden
          style={{
            width: DRAG_COL_W, flexShrink: 0,
            /* Mirror the row drag handle so the header keeps its
               left-edge alignment when the table is scrolled. */
            position: 'sticky',
            left: 'var(--dim-space-0)',
            zIndex: 21,
            background: 'var(--surface-table-header)',
          }}
        />
      )}
      {columns.map((c, colIdx) => {
        const sortable = isSortable(c);
        const isSticky = colIdx < stickyColCount;
        const sortIconName = sortConfig.key === c.key
          ? (sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more')
          : 'unfold_more';
        return (
          <TableHeaderInternal
            key={c.key}
            column={{ ...c, _idx: colIdx }}
            sortable={sortable}
            sortIconName={sortIconName}
            sticky={isSticky}
            stickyLeft={stickyLeft(colIdx)}
            stickyShadow={stickyShadow && colIdx === stickyColCount - 1}
            onSort={onSort}
            stickyTransformX={usePageSticky && isSticky ? scrollX : null}
          />
        );
      })}
    </>
  );

  /* Skeleton placeholder rows — match the real row chrome (height,
     dividers, padding) so the table doesn't shift when real data lands.
     Each cell gets a `.mih-table-skeleton-bar` whose width is a stable
     pseudo-random fraction of the column's pixel width (60 – 88%), keyed
     off `colIdx + rowIdx` so the same row/column always renders at the
     same width across re-renders. */
  const skeletonBarWidth = (rowIdx, colIdx) => {
    const seed = (rowIdx * 7 + colIdx * 13) % 100;
    return `${60 + (seed % 29)}%`;
  };

  const rowsAndEmpty = (
    <>
      {loading
        ? Array.from({ length: Math.max(1, skeletonRows) }).map((_, rowIdx) => (
            <div
              key={`skeleton-${rowIdx}`}
              className='flex items-center'
              style={{
                minWidth: totalMinWidth,
                paddingLeft: 'var(--dim-space-400, 16px)',
                paddingRight: 'var(--dim-space-400, 16px)',
                paddingTop: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-300, 12px)',
                borderBottom:
                  'var(--dim-stroke-100) solid var(--border-table-line)',
                background: 'var(--surface-table-default)',
              }}
            >
              {editMode && (
                <div aria-hidden style={{ width: DRAG_COL_W, flexShrink: 0 }} />
              )}
              {columns.map((c, colIdx) => (
                <div
                  key={c.key}
                  style={{
                    width: colWidthPx(c),
                    flexShrink: 0,
                    paddingRight: 'var(--dim-space-200, 8px)',
                  }}
                >
                  <span
                    className='mih-table-skeleton-bar'
                    style={{ display: 'block', width: skeletonBarWidth(rowIdx, colIdx) }}
                  />
                </div>
              ))}
            </div>
          ))
        : rows.map((row, idx) => (
            <Row
              key={rowKey(row)}
              row={row}
              index={idx}
              columns={columns}
              stickyColCount={stickyColCount}
              stickyLeft={stickyLeft}
              stickyShadow={stickyShadow}
              editMode={editMode}
              isDragging={editMode && draggedIdx === idx}
              isOver={editMode && overIdx === idx && draggedIdx !== idx}
              onDragStart={editMode && onDragStart ? onDragStart(idx) : undefined}
              onDragOver={editMode && onDragOver ? onDragOver(idx) : undefined}
              onDrop={editMode && onDrop ? onDrop(idx) : undefined}
              onDragEnd={editMode && onDragEnd ? onDragEnd : undefined}
              onRowClick={onRowClick}
            />
          ))}
      {!loading && rows.length === 0 && (
        <div
          className='flex flex-col items-center justify-center text-center'
          style={{
            gap: 'var(--dim-space-150)',
            padding: 'var(--dim-space-600)',
            fontFamily: 'var(--type-family-body)',
          }}
        >
          {emptyIllustration}
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: emptySubtext
                ? 'var(--type-weight-medium, 500)'
                : 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
          >
            {emptyMessage}
          </span>
          {emptySubtext && (
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.5,
              }}
            >
              {emptySubtext}
            </span>
          )}
        </div>
      )}
    </>
  );

  /* Page-sticky layout: header is a sibling of (not nested in) the
     X-scroller, so its nearest scroll-container ancestor is the window
     and `top: stickyHeaderTop` resolves against the viewport. */
  if (usePageSticky) {
    return (
      <div
        ref={wrapRef}
        className={`w-full ${className}`}
        style={{
          border: 'var(--dim-stroke-100) solid var(--border-table-default)',
          borderRadius: 'var(--dim-radius-400)',
          /* `overflow: clip` honours border-radius without becoming a
             scroll container (CSS Overflow L3). Older engines just fall
             back to `visible`; sticky still works because the wrapper
             never establishes a scrollport in any axis. */
          overflow: 'clip',
          ...style,
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: stickyHeaderTop,
            zIndex: 1050,
            /* Clip the translated row so it doesn't bleed past the
               table's left/right edges. This `overflow: hidden` is on
               the STICKY element itself, which doesn't affect its own
               sticky positioning — only its ancestors do. */
            overflow: 'hidden',
            background: 'var(--surface-table-header)',
            transition: 'top 200ms ease',
          }}
        >
          <div
            className='flex items-center'
            style={{
              minWidth: totalMinWidth,
              minHeight: 44,
              transform: `translate3d(${-scrollX}px, 0, 0)`,
              willChange: 'transform',
              position: 'relative',
              ...trailingInsetStyle,
            }}
          >
            {/* Sticky-column backdrop — page-sticky mode counter-translates
               each sticky <HeaderCell> so it visually stays pinned at the
               left. But the row itself is translated by `-scrollX`, so any
               non-sticky cells that scroll BEHIND the sticky cells can
               bleed through at the left edge (sub-pixel rendering + the
               cells sharing a single stacking context). This solid strip
               sits at the same counter-translated position as the sticky
               cells with a z-index between non-sticky (auto / 0) and
               sticky (≥ 19), guaranteeing an opaque wall at the left
               corner of the header during horizontal scroll. */}
            {(stickyColCount > 0 || editMode) && (
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 'var(--dim-space-0)',
                  left: 'var(--dim-space-0)',
                  height: '100%',
                  width: stickyLeft(stickyColCount),
                  transform: `translate3d(${scrollX}px, 0, 0)`,
                  willChange: 'transform',
                  background: 'var(--surface-table-header)',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            )}
            {headerCells}
          </div>
        </div>

        <div ref={bodyRef} style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: totalMinWidth, ...trailingInsetStyle }}>
            {rowsAndEmpty}
          </div>
        </div>
      </div>
    );
  }

  /* Legacy layout — table is its own X-scroll container, header sticks
     to the top of the wrapper. Preserved for forms / popups where the
     surrounding context already manages page scroll. */
  return (
    <div
      ref={wrapRef}
      className={`w-full overflow-x-auto ${className}`}
      style={{
        border: 'var(--dim-stroke-100) solid var(--border-table-default)',
        borderRadius: 'var(--dim-radius-400)',
        ...style,
      }}
    >
      <div style={{ minWidth: totalMinWidth, ...trailingInsetStyle }}>
        <div
          className='flex w-full items-center sticky top-0'
          style={{
            /* Must sit above body sticky-left cells (z ≤ 21). Those cells
               create their own stacking contexts as siblings of this row;
               if this row stays at z-index 10 they paint over the header
               while scrolling and the header looks like it vanished. */
            zIndex: 40,
            minHeight: 44,
            background: 'var(--surface-table-header)',
          }}
        >
          {headerCells}
        </div>
        {rowsAndEmpty}
      </div>
    </div>
  );
};

export default Table;
