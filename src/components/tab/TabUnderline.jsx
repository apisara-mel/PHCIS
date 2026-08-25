import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ActionList from '@/components/list/ActionList';
import OverflowMoreTrigger from '@/components/overflow/OverflowMoreTrigger';
import TabCountBadge from '@/components/tab/TabCountBadge';
import { morphTabUnderlineBarStyle } from '@/components/layout/headerMorphStyles';
import { Icon } from '@/components/icons/Icon';

/* MIH TabUnderline — design-system canonical underline tab strip.
   One component renders the whole row of tabs *and* the single sliding
   "ink-bar" indicator beneath them. Replaces the previous TabUnderline
   (per-tab button) + TabUnderlineBar (parent wrapper) split.

   Props:
     • tabs       Array<{ key, label, count?, groupStart? }>  (`icon` on a tab
                  is ignored — underline tabs are label-only; no leading icon)
                  `groupStart: true` draws a vertical divider *before* that tab
                  so one strip can carry two kinds of tab (e.g. a set of status
                  worklists + a separate directory view). Ignored on index 0.
     • value      currently selected tab key
     • onChange   (key) => void
     • animated   default true. When false, each tab paints its own
                  scaleX-from-centre underline on the **label** only
                  (`[data-tabunderline-ink]`), matching sliding-ink width.
     • className, style   applied to the outer bar container.

   Token contract (design.md §6.15 / rows 1301-1305, 1473-1476, 1666-1670):
     • text.tabUnderline.{default,hover,selected,selected-hover}
     • border.tab.{hover,selected,selected-hover}

   Anti-jitter notes:
     • CSS does not interpolate `font-weight` — switching 400→500 snaps and
       widens the text by 1-2px which ripples to neighbouring tabs as a
       flicker on every hover. We keep the **font weight constant** at
       medium and signal selection via colour + the underline only.
     • The shared sliding indicator is one absolutely-positioned span that
       transforms via translateX + width — surrounding tabs never reflow.
     • `will-change: transform, width` keeps it on a GPU layer. */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/* Inset between the tab edge and the underline edge when falling back to
   full-button measurement (no label ink node). Prefer measuring
   `[data-tabunderline-ink]` so the bar hugs the label glyphs. */
const UNDERLINE_INSET = 12; /* var(--dim-space-300) */

const TabButton = ({ tab, selected, hovered, pressed, onHover, onPress, onClick, animated }) => {
  /* Resolve compound state: selected-hover > selected > hover > default. */
  const isSelectedHover = selected && hovered;
  const isHover         = !selected && hovered;

  const textColor = isSelectedHover
    ? 'var(--text-tabunderline-selected-hover)'
    : selected
      ? 'var(--text-tabunderline-selected)'
      : isHover
        ? 'var(--text-tabunderline-hover)'
        : 'var(--text-tabunderline-default)';

  /* Standalone (non-animated) per-tab underline — only when animated bar
     is off. Otherwise the parent paints one shared sliding indicator. */
  const underlineColor = isSelectedHover
    ? 'var(--border-tab-selected-hover)'
    : selected
      ? 'var(--border-tab-selected)'
      : 'var(--border-tab-hover)';
  const underlineActive = selected || hovered;

  return (
    <button
      type='button'
      role='tab'
      aria-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => { onHover(false); onPress(false); }}
      onMouseDown={() => onPress(true)}
      onMouseUp={() => onPress(false)}
      className='relative inline-flex flex-col items-center justify-center cursor-pointer shrink-0'
      style={{
        height: 40,
        paddingLeft:  'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        background: 'transparent',
        border: 'none',
        color: textColor,
        fontSize: 'var(--type-size-base)',
        lineHeight: 1.5,
        transform: pressed ? 'scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)'),
        transition: [
          `color 220ms ${EASE}`,
          `transform 180ms ${EASE}`,
        ].join(', '),
      }}
    >
      <span
        className='inline-flex items-center'
        style={{ gap: 'var(--dim-space-150)', height: '100%' }}
      >
        <span
          data-tabunderline-ink
          className='relative inline-block max-w-full whitespace-nowrap'
        >
          <span
            style={{
              color: 'inherit',
              /* Same family/weight as Topic title — count pill stays Sarabun below. */
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              fontSize: 'var(--type-size-base)',
              lineHeight: 1.5,
              transition: `color 220ms ${EASE}`,
            }}
          >
            {tab.label}
          </span>
          {!animated && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 'var(--dim-space-0)',
                right: 'var(--dim-space-0)',
                bottom: 'var(--dim-space-0)',
                height: 'var(--dim-stroke-400, 4px)',
                background: underlineColor,
                borderRadius: '2px 2px 0 0',
                transform: underlineActive ? 'scaleX(1)' : 'scaleX(0.001)',
                transformOrigin: 'center',
                willChange: 'transform',
                transition: [
                  `transform 280ms ${EASE}`,
                  `background-color 220ms ${EASE}`,
                ].join(', '),
                pointerEvents: 'none',
              }}
            />
          )}
        </span>
        {typeof tab.count === 'number' && (
          <TabCountBadge count={tab.count} selected={selected} hovered={hovered} />
        )}
      </span>
    </button>
  );
};

const TabUnderline = React.forwardRef(function TabUnderline(
  {
    tabs = [],
    value,
    onChange,
    animated = true,
    disableOverflow = false,
    /* When true, height/type/padding track `--header-morph-motion` (scroll compact). */
    morphOnScroll = false,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const containerRef = useRef(null);
  const moreBtnRef   = useRef(null);
  const setRefs = (node) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [pressedIdx, setPressedIdx] = useState(-1);
  const [indicator, setIndicator] = useState({
    x: 0, width: 0, color: 'transparent', ready: false,
  });

  /* Overflow handling — how many tabs are hidden into the dropdown.
     `firstHiddenIdx === tabs.length` means everything fits. */
  const [firstHiddenIdx, setFirstHiddenIdx] = useState(tabs.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState({ top: 'var(--dim-space-0)', right: 'var(--dim-space-0)' });

  const selectedIdx = tabs.findIndex((t) => t.key === value);
  const selectedHidden = selectedIdx >= 0 && selectedIdx >= firstHiddenIdx;

  /* ── Overflow measurement ─────────────────────────────────────────
     Renders all tabs, then in useLayoutEffect temporarily un-hides any
     `display:none` ones, captures their natural widths, restores hidden
     state, and computes how many fit in the container (reserving room
     for the More trigger when there are overflowing tabs). The temp
     toggle happens synchronously before paint so users never see it. */
  const measureOverflow = useCallback(() => {
    if (disableOverflow) {
      setFirstHiddenIdx(tabs.length);
      return;
    }
    const container = containerRef.current;
    if (!container || tabs.length === 0) {
      setFirstHiddenIdx(tabs.length);
      return;
    }
    const tabEls = Array.from(container.querySelectorAll('[data-tab-idx]'));
    if (tabEls.length !== tabs.length) return;
    const prevDisplay = tabEls.map((el) => el.style.display);
    tabEls.forEach((el) => { el.style.display = ''; });

    const widths = tabEls.map((el) => el.getBoundingClientRect().width);
    const moreW = (moreBtnRef.current && moreBtnRef.current.offsetWidth) || 60;
    const containerW = container.clientWidth;

    let sum = 0;
    let firstHidden = tabs.length;
    for (let i = 0; i < widths.length; i++) {
      const next = sum + widths[i];
      const remaining = tabs.length - i - 1;
      const limit = remaining > 0 ? containerW - moreW : containerW;
      if (next > limit + 0.5) {
        firstHidden = i;
        break;
      }
      sum = next;
    }
    tabEls.forEach((el, i) => { el.style.display = prevDisplay[i] || ''; });
    setFirstHiddenIdx((prev) => (prev === firstHidden ? prev : firstHidden));
  }, [tabs, disableOverflow]);

  useLayoutEffect(() => { measureOverflow(); }, [measureOverflow]);
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (typeof ResizeObserver === 'undefined' || !container) return undefined;
    const ro = new ResizeObserver(() => measureOverflow());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureOverflow]);

  /* Position dropdown under the More button using fixed coords so a
     scrollable / overflow:hidden ancestor cannot clip it. */
  const openMore = () => {
    const btn = moreBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    setMorePos({
      top: Math.round(r.bottom + 4),
      right: Math.round(window.innerWidth - r.right),
    });
    setMoreOpen(true);
  };

  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (e) => {
      if (moreBtnRef.current && moreBtnRef.current.contains(e.target)) return;
      const pop = document.getElementById('mih-taboverflow-pop');
      if (pop && pop.contains(e.target)) return;
      setMoreOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', () => setMoreOpen(false));
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  /* Measure indicator on every render — cheap (a few getBoundingClientRect
     calls + a state diff that no-ops if values match). Lets hover, value,
     and layout changes all flow through without explicit deps tracking. */
  useLayoutEffect(() => {
    if (!animated) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const measure = () => {
      const tabEls = Array.from(container.querySelectorAll('[role="tab"]'))
        .filter((el) => el.style.display !== 'none');
      if (!tabEls.length) {
        setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const activeIdx = hoveredIdx >= 0 ? hoveredIdx : selectedIdx;
      const activeEl = activeIdx >= 0 && activeIdx < firstHiddenIdx
        ? container.querySelector(`[data-tab-idx="${activeIdx}"]`)
        : null;
      if (!activeEl) {
        setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const cRect = container.getBoundingClientRect();
      const inkEl = activeEl.querySelector('[data-tabunderline-ink]');
      const inkRect = inkEl?.getBoundingClientRect();
      const btnEl = activeEl.querySelector('[role="tab"]');
      const btnRect = btnEl?.getBoundingClientRect();

      /* `morphOnScroll` ย่อทั้งแถบด้วย scale3d ตอนเลื่อนหน้า — getBoundingClientRect
         คืนค่า "หลังย่อ" แล้ว แต่ indicator เป็นลูกที่อยู่ในกล่องที่ถูกย่อ ค่า px
         ที่เราสั่งจะถูกย่อซ้ำอีกรอบ ทำให้ขีดขยับไปทางซ้ายมากขึ้นเรื่อย ๆ ตามระยะ
         ของแท็บ (แท็บแรกแทบไม่เพี้ยน แท็บท้าย ๆ เพี้ยนชัด) — หารกลับด้วย scale
         ที่วัดจาก rect ÷ layout width · ไม่ย่อ (scale = 1) ค่าไม่เปลี่ยน */
      const scale = (container.offsetWidth > 0 && cRect.width > 0)
        ? cRect.width / container.offsetWidth
        : 1;
      const unscale = (v) => (scale > 0 ? v / scale : v);

      let x;
      let w;
      if (inkRect && inkRect.width > 0.5) {
        /* Hug the label glyph box — excludes count pill. */
        x = unscale(inkRect.left - cRect.left);
        w = Math.max(0, unscale(inkRect.width));
      } else if (btnRect) {
        x = unscale(btnRect.left - cRect.left) + UNDERLINE_INSET;
        w = Math.max(0, unscale(btnRect.width) - 2 * UNDERLINE_INSET);
      } else {
        const tRect = activeEl.getBoundingClientRect();
        x = unscale(tRect.left - cRect.left) + UNDERLINE_INSET;
        w = Math.max(0, unscale(tRect.width) - 2 * UNDERLINE_INSET);
      }

      const isHoveringSelected    = activeIdx === selectedIdx && hoveredIdx >= 0;
      const isHoveringNonSelected = activeIdx !== selectedIdx;
      let color;
      if (isHoveringSelected)         color = 'var(--border-tab-selected-hover)';
      else if (isHoveringNonSelected) color = 'var(--border-tab-hover)';
      else                            color = 'var(--border-tab-selected)';

      const next = {
        x,
        width: w,
        color,
        ready: true,
      };
      setIndicator((prev) =>
        prev.x === next.x
          && prev.width === next.width
          && prev.color === next.color
          && prev.ready === next.ready
          ? prev
          : next,
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    Array.from(container.children).forEach((c) => {
      if (c instanceof Element) ro.observe(c);
    });
    container.querySelectorAll('[data-tabunderline-ink]').forEach((el) => {
      if (el instanceof Element) ro.observe(el);
    });
    return () => ro.disconnect();
  });

  const hasOverflow = firstHiddenIdx < tabs.length;
  const hiddenTabs  = hasOverflow ? tabs.slice(firstHiddenIdx) : [];

  return (
    <div
      ref={setRefs}
      role='tablist'
      className={`relative flex items-end ${className}`}
      style={{
        ...style,
        ...(morphOnScroll ? morphTabUnderlineBarStyle : null),
      }}
      {...rest}
    >
      {tabs.map((tab, idx) => (
        <div
          key={tab.key}
          data-tab-idx={idx}
          className='flex items-stretch'
          style={{ display: idx >= firstHiddenIdx ? 'none' : undefined }}
        >
          {/* Group divider — only when this tab opens a new group AND it is
              not the first *visible* tab (a leading rule would dangle). */}
          {tab.groupStart && idx > 0 && idx !== firstHiddenIdx && (
            <span
              aria-hidden
              style={{
                alignSelf: 'center',
                width: 'var(--dim-stroke-100, 1px)',
                height: 'var(--dim-space-500, 20px)',
                background: 'var(--border-neutral-tertiary, #E2E4E6)',
                flexShrink: 0,
              }}
            />
          )}
          <TabButton
            tab={tab}
            selected={tab.key === value}
            hovered={hoveredIdx === idx}
            pressed={pressedIdx === idx}
            animated={animated}
            onHover={(on) => setHoveredIdx(on ? idx : (h) => (h === idx ? -1 : h))}
            onPress={(on) => setPressedIdx(on ? idx : (p) => (p === idx ? -1 : p))}
            onClick={() => onChange && onChange(tab.key)}
          />
        </div>
      ))}
      {!disableOverflow && hasOverflow && (
        <OverflowMoreTrigger
          ref={moreBtnRef}
          open={moreOpen}
          accent={selectedHidden}
          ariaLabel='แสดงแท็บที่ซ่อน'
          onClick={() => (moreOpen ? setMoreOpen(false) : openMore())}
        />
      )}
      {animated && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 'var(--dim-space-0)',
            bottom: 'var(--dim-space-0)',
            width: indicator.width,
            height: 'var(--dim-stroke-400, 4px)',
            background: indicator.color,
            borderRadius: '2px 2px 0 0',
            transform: `translate3d(${indicator.x}px, 0, 0)`,
            opacity: indicator.ready ? 1 : 0,
            willChange: 'transform, width, background-color',
            transition: indicator.ready
              ? [
                `transform 320ms ${EASE}`,
                `width 320ms ${EASE}`,
                `background-color 220ms ${EASE}`,
                'opacity 180ms linear',
              ].join(', ')
              : 'opacity 180ms linear',
            pointerEvents: 'none',
          }}
        />
      )}
      {/* portal ไป <body> — แถบแท็บถูก scale ด้วย morph (transform) ซึ่งกลายเป็น
          containing block ของ position:fixed ทำให้เมนูไปโผล่ไกลจากปุ่ม ⋯ */}
      {moreOpen && hiddenTabs.length > 0 && typeof document !== 'undefined' && createPortal((
        <div
          id='mih-taboverflow-pop'
          role='menu'
          style={{
            position: 'fixed',
            top: morePos.top,
            right: morePos.right,
            minWidth: 200,
            background:   'var(--surface-dropdown-default)',
            border:       'var(--dim-stroke-100) solid var(--border-dropdown-default)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow:    'var(--shadow-dropdown)',
            padding:      'var(--dim-space-100)',
            zIndex: 'var(--sm-z-popover, 1199)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {hiddenTabs.map((tab, hIdx) => {
            const selected = tab.key === value;
            /* Carry the group break into the overflow menu as a horizontal rule. */
            const rule = tab.groupStart && hIdx > 0 ? (
              <span
                key={`${tab.key}-rule`}
                aria-hidden
                style={{
                  display: 'block',
                  height: 'var(--dim-stroke-100, 1px)',
                  background: 'var(--border-neutral-tertiary, #E2E4E6)',
                  marginTop: 'var(--dim-space-100, 4px)',
                  marginBottom: 'var(--dim-space-100, 4px)',
                }}
              />
            ) : null;
            return (
              <React.Fragment key={tab.key}>
              {rule}
              <ActionList
                as='button'
                role='menuitem'
                showLeadingIcon={false}
                label={tab.label}
                trailing={typeof tab.count === 'number' ? (
                  <span
                    style={{
                      color: 'var(--text-content-tertiary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-xs)',
                      fontWeight: 'var(--type-weight-medium)',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {tab.count}
                  </span>
                ) : undefined}
                /* Tab overflow rows are pure navigation — selection is
                   already implied by the active underline state when the
                   user picks one, so the canonical trailing affordances
                   (check + chevron_right) only add visual noise inside
                   this specific popover. Disable them at the call site
                   so the central ActionList keeps its defaults. */
                showCheck={false}
                showChevronRight={false}
                active={selected}
                onClick={() => {
                  if (onChange) onChange(tab.key);
                  setMoreOpen(false);
                }}
                style={{
                  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                }}
              />
              </React.Fragment>
            );
          })}
        </div>
      ), document.body)}
    </div>
  );
});

export default TabUnderline;

/* ── TabUnderlineItem — single-tab variant for state-matrix demos ──
   Matches Figma node 371:30: 3 sizes × 5 states. Used standalone (no bar)
   when callers want to drive the visual state directly via props (table
   cells, design-system docs, etc.). The interactive multi-tab bar is the
   default <TabUnderline /> above. */

const ITEM_SIZE = {
  lg: { h: 44, fontSize: 'var(--type-size-base)', icon: 16, chev: 14, bar: 'var(--dim-stroke-400, 4px)' },
  md: { h: 40, fontSize: 'var(--type-size-base)', icon: 16, chev: 14, bar: 'var(--dim-stroke-400, 4px)' },
  sm: { h: 36, fontSize: 'var(--type-size-xs)',   icon: 14, chev: 12, bar: 'var(--dim-stroke-200, 2px)' },
};

const ITEM_TONES = {
  default: { text: 'var(--text-tabunderline-default)',         icon: 'var(--icon-tabunderline-default)',         bar: 'transparent' },
  hover:   { text: 'var(--text-tabunderline-hover)',           icon: 'var(--icon-tabunderline-hover)',           bar: 'var(--border-tab-hover)' },
  selected:{ text: 'var(--text-tabunderline-selected)',        icon: 'var(--icon-tabunderline-selected)',        bar: 'var(--border-tab-selected)' },
  'selected-hover': {
    text: 'var(--text-tabunderline-selected-hover)',
    icon: 'var(--icon-tabunderline-selected-hover)',
    bar:  'var(--border-tab-selected-hover)',
  },
  disabled:{ text: 'var(--text-tabunderline-disabled)',        icon: 'var(--icon-tabunderline-disabled)',        bar: 'transparent' },
};

export const TabUnderlineItem = React.forwardRef(function TabUnderlineItem(
  {
    size = 'lg',                       /* 'lg' | 'md' | 'sm' (44/40/36) */
    state = 'default',                 /* default | hover | selected | selected-hover | disabled */
    label = 'Tab Label',
    leadingIcon = 'pets',              /* ignored unless showLeadingIcon — underline tabs are label-only by default */
    showLeadingIcon = false,
    showTrailingIcon = true,
    onClick,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const dim  = ITEM_SIZE[size]   || ITEM_SIZE.lg;
  const tone = ITEM_TONES[state] || ITEM_TONES.default;
  const disabled = state === 'disabled';

  const renderIcon = (source, sz) => {
    if (!source) return null;
    if (typeof source === 'string') {
      return (
        <span style={{ color: tone.icon, display: 'inline-flex', lineHeight: 1 }} aria-hidden>
          <Icon name={source} size={sz} />
        </span>
      );
    }
    if (typeof source === 'function') return source({ size: sz, color: tone.icon });
    return source;
  };

  return (
    <button
      ref={ref}
      type='button'
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      aria-selected={state === 'selected' || state === 'selected-hover'}
      className={`inline-flex items-center justify-center relative ${className}`}
      style={{
        height: dim.h,
        paddingLeft:  'var(--dim-space-600)',
        paddingRight: 'var(--dim-space-600)',
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: dim.fontSize,
        lineHeight: 1.5,
        color: tone.text,
        transition: `color 200ms ${EASE}`,
        ...style,
      }}
      {...rest}
    >
      <span
        className='inline-flex items-center'
        style={{
          gap: 'var(--dim-space-150)',
          height: '100%',
          borderBottom: `${dim.bar} solid ${tone.bar}`,
        }}
      >
        {showLeadingIcon && renderIcon(leadingIcon, dim.icon)}
        <span
          style={{
            color: 'inherit',
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: dim.fontSize,
            lineHeight: 1.5,
          }}
        >
          {label}
        </span>
        {showTrailingIcon && (
          <span style={{ color: tone.icon, display: 'inline-flex', lineHeight: 1 }} aria-hidden>
            <Icon name='keyboard_arrow_down' size={dim.chev} />
          </span>
        )}
      </span>
    </button>
  );
});
