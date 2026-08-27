import React, {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import OverflowMoreTrigger from '@/components/overflow/OverflowMoreTrigger';
import { TagDivider } from '@/components/forms/FilterTag';

let __overflowMenuSeq = 0;

/* Greedy horizontal row + Tab-style "More" menu when children do not fit.
   Measurement includes flex `gap` and the "More" trigger width so items stay
   in-row whenever the real layout would fit. Hidden slots stay mounted in-row
   with display:none (for measurement); when the menu is open, clones render
   in the fixed popover (same FilterTag / chips) and close after a choice. */

const isInPortalPopover = (target) => {
  if (!(target instanceof Element)) return false;
  if (target.closest('.mih-search-popover')) return true;
  return false;
};

export default function OverflowFlexRow({
  children,
  className = '',
  style = {},
  itemGap = 'var(--dim-space-200)',
  moreAriaLabel = 'แสดงตัวกรองที่ซ่อน',
  menuId: menuIdProp,
  /** ค่าเริ่มต้นอยู่เหนือ modal อยู่แล้ว (--sm-z-modal-popover) — ส่งมาเองเมื่อ
      ต้องการกดให้ต่ำลง เช่นเมนูที่ต้องอยู่ใต้ tooltip */
  menuZIndex,
}) {
  const menuIdRef = useRef(menuIdProp || null);
  if (menuIdRef.current == null) {
    __overflowMenuSeq += 1;
    menuIdRef.current = menuIdProp || `mih-overflowflex-pop-${__overflowMenuSeq}`;
  }
  const menuId = menuIdRef.current;

  const items = React.Children.toArray(children).filter((c) => c != null && c !== false);
  const n = items.length;

  const containerRef = useRef(null);
  const moreBtnRef = useRef(null);
  const [firstHiddenIdx, setFirstHiddenIdx] = useState(n);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState({ top: 'var(--dim-space-0)', right: 'var(--dim-space-0)' });

  const measureOverflow = useCallback(() => {
    const container = containerRef.current;
    if (!container || n === 0) {
      setFirstHiddenIdx(n);
      return;
    }
    const els = Array.from(container.querySelectorAll('[data-oflow-idx]'));
    if (els.length !== n) return;

    const prevDisplay = els.map((el) => el.style.display);
    els.forEach((el) => { el.style.display = ''; });

    const widths = els.map((el) => el.getBoundingClientRect().width);
    const moreW = (moreBtnRef.current && moreBtnRef.current.offsetWidth) || 62;
    const containerW = container.clientWidth;
    const cs = getComputedStyle(container);
    const gapPx = parseFloat(cs.columnGap || cs.rowGap || cs.gap) || 0;

    /* Width if we show the first k item wrappers (0..k-1). When k < n, the row
       also has the "More" trigger after the last visible item — include one gap
       before it. Flex `gap` was missing from the old sum and made us hide
       items too early. */
    const widthForVisiblePrefix = (k) => {
      if (k <= 0) return k < n ? moreW : 0;
      let need = 0;
      for (let j = 0; j < k; j++) {
        need += widths[j];
        if (j < k - 1) need += gapPx;
      }
      if (k < n) {
        need += gapPx + moreW;
      }
      return need;
    };

    let firstHidden = n;
    for (let k = n; k >= 0; k--) {
      if (widthForVisiblePrefix(k) <= containerW + 0.5) {
        firstHidden = k;
        break;
      }
    }

    els.forEach((el, i) => { el.style.display = prevDisplay[i] || ''; });
    setFirstHiddenIdx((prev) => (prev === firstHidden ? prev : firstHidden));
  }, [n]);

  useLayoutEffect(() => { measureOverflow(); }, [measureOverflow, firstHiddenIdx]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (typeof ResizeObserver === 'undefined' || !container) return undefined;
    const ro = new ResizeObserver(() => measureOverflow());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measureOverflow]);

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
      if (isInPortalPopover(e.target)) return;
      const pop = document.getElementById(menuId);
      if (pop && pop.contains(e.target)) return;
      setMoreOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setMoreOpen(false);
      e.stopPropagation();
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', () => setMoreOpen(false));
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [moreOpen, menuId]);

  const hasOverflow = firstHiddenIdx < n;
  const hiddenSlice = hasOverflow ? items.slice(firstHiddenIdx) : [];

  const childLooksActive = (child) => {
    if (!React.isValidElement(child)) return false;
    const p = child.props;
    return !!(p.selected || p.open);
  };
  const selectedHidden = hasOverflow && hiddenSlice.some(childLooksActive);

  return (
    <div
      ref={containerRef}
      className={`flex items-center min-w-0 flex-1 ${className}`}
      style={{ gap: itemGap, ...style }}
    >
      {items.map((child, idx) => (
        <div
          key={idx}
          data-oflow-idx={idx}
          className='shrink-0'
          style={{ display: idx >= firstHiddenIdx ? 'none' : undefined }}
        >
          {child}
        </div>
      ))}
      {hasOverflow && (
        <OverflowMoreTrigger
          ref={moreBtnRef}
          open={moreOpen}
          accent={selectedHidden}
          onClick={() => (moreOpen ? setMoreOpen(false) : openMore())}
          ariaLabel={moreAriaLabel}
        />
      )}
      {moreOpen && hiddenSlice.length > 0 && typeof document !== 'undefined' && createPortal(
        /* Portal: avoid flex-item quirks (popover was a child of the horizontal
           toolbar flex row). Vertical stack, spacing via gap — no hairlines. */
        <div
          id={menuId}
          role='menu'
          className='mih-overflowflex-menu'
          onMouseDown={(e) => { e.stopPropagation(); }}
          style={{
            position: 'fixed',
            top: morePos.top,
            right: morePos.right,
            width: 'fit-content',
            maxWidth: 'min(calc(100vw - 24px), 400px)',
            boxSizing: 'border-box',
            background: 'var(--surface-dropdown-default)',
            border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-dropdown)',
            padding: 'var(--dim-space-100)',
            zIndex: menuZIndex ?? 'var(--sm-z-modal-popover, 1450)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 'var(--dim-space-100)',
          }}
        >
          {hiddenSlice.map((child, i) => {
            const idx = firstHiddenIdx + i;
            const isTagDivider = React.isValidElement(child) && child.type === TagDivider;
            return (
              <div
                key={`ovm-${idx}`}
                role='presentation'
                className={
                  isTagDivider
                    ? 'w-full flex justify-center min-w-0 shrink-0 overflow-hidden'
                    : /* w-fit + no min-w-0 — keep FilterTag / chips at intrinsic width in menu */
                    'flex w-fit shrink-0 flex-col items-start justify-center'
                }
                style={
                  isTagDivider
                    ? {
                      height: '1px',
                      minHeight: 0,
                      paddingLeft: 'var(--dim-space-200)',
                      paddingRight: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-0)',
                      paddingBottom: 'var(--dim-space-0)',
                    }
                    : {
                      paddingLeft: 'var(--dim-space-200)',
                      paddingRight: 'var(--dim-space-200)',
                    }
                }
              >
                {React.isValidElement(child)
                  ? React.cloneElement(child, {
                    key: `ov-clone-${idx}`,
                    onClick: (e) => {
                      if (typeof child.props.onClick === 'function') {
                        child.props.onClick(e);
                      }
                      setMoreOpen(false);
                    },
                  })
                  : child}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </div>
  );
}
