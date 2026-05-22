import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/icons/Icon';

/** Scrollable ancestors (not window) — fixed popover tracks the field when a
    parent `overflow-y-auto` / `overflow-hidden` scrolls. */
export function getScrollableParents(node) {
  const out = [];
  let el = node?.parentElement;
  while (el) {
    const { overflow, overflowY } = window.getComputedStyle(el);
    if (/(auto|scroll|overlay)/.test(overflow) || /(auto|scroll|overlay)/.test(overflowY)) {
      out.push(el);
    }
    el = el.parentElement;
  }
  return out;
}

/** Figma 335:64463 — bold matched substring in brand-p600. */
export function highlightMatch(text, query, keyPrefix = 'm') {
  if (!text) return text;
  const q = String(query || '').trim();
  if (!q) return text;
  const lower = String(text).toLowerCase();
  const lq = q.toLowerCase();
  const out = [];
  let cursor = 0;
  let idx = lower.indexOf(lq, cursor);
  while (idx !== -1) {
    if (idx > cursor) out.push(text.slice(cursor, idx));
    out.push(
      <span
        key={`${keyPrefix}-${idx}`}
        style={{
          color: 'var(--text-brandPrimary-secondary, #08A768)',
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-bold, 700)',
          fontSize: 'var(--type-size-sm, 14px)',
          lineHeight: 1.5,
          background: 'transparent',
        }}
      >
        {text.slice(idx, idx + q.length)}
      </span>,
    );
    cursor = idx + q.length;
    idx = lower.indexOf(lq, cursor);
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return <>{out}</>;
}

/** Shared autocomplete popover for Textarea / VoiceTextarea wrappers. */
export function useTextareaSuggestions({
  value,
  onChange,
  suggestions,
  minChars = 3,
  popoverWidth = 591,
  popoverAriaLabel = 'คำแนะนำ',
  anchorRef,
  containerRef,
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  /* Keep a draft query in sync with keystrokes so the popover filters on
     the character just typed — not the previous React `value` prop (one
     frame behind when VoiceTextarea forwards (value, event)). */
  const [inputQuery, setInputQuery] = useState(() => String(value ?? '').trim());
  useEffect(() => {
    setInputQuery(String(value ?? '').trim());
  }, [value]);

  const enabled = Array.isArray(suggestions) && suggestions.length > 0;

  const filtered = useMemo(() => {
    if (!enabled || inputQuery.length < minChars) return [];
    const lq = inputQuery.toLowerCase();
    return suggestions.filter((s) => String(s).toLowerCase().includes(lq)).slice(0, 10);
  }, [enabled, inputQuery, minChars, suggestions]);

  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    if (!showDropdown) setHoveredRow(null);
  }, [showDropdown]);

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined') return;
    const anchor = anchorRef?.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    /* Popover sits 4 px below the *baseline of the last typed line* —
       Figma PHCIS-ALL 3185:144422. For TEXTAREA we use
       `top + min(scrollHeight, clientHeight)` to follow the content
       height, then subtract the textarea's own paddingBottom so the
       anchor lands at the text glyph row rather than below the
       textarea's bottom inner padding. For inputs / other anchors we
       keep `rect.bottom`. */
    const GAP = 4;
    const gutter = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxW = Math.min(popoverWidth, vw - 2 * gutter);
    const left = Math.min(Math.max(gutter, rect.left), vw - maxW - gutter);
    const width = Math.min(popoverWidth, vw - left - gutter);
    let contentBottom;
    if (anchor.tagName === 'TEXTAREA') {
      const cs = window.getComputedStyle(anchor);
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      contentBottom =
        rect.top + Math.min(anchor.scrollHeight, anchor.clientHeight) - padBottom;
    } else {
      contentBottom = rect.bottom;
    }
    const top = Math.max(gutter, contentBottom + GAP);
    const maxH = Math.min(488, Math.max(120, vh - top - gutter));
    setMenuPos({ top, left, width, maxHeight: maxH });
  }, [anchorRef, popoverWidth]);

  useLayoutEffect(() => {
    if (!showDropdown) {
      setMenuPos(null);
      return undefined;
    }
    updateMenuPosition();
    return undefined;
  }, [showDropdown, filtered, inputQuery, popoverWidth, updateMenuPosition]);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const onScrollOrResize = () => updateMenuPosition();
    const parents = anchorRef?.current
      ? getScrollableParents(anchorRef.current)
      : [];
    parents.forEach((p) => p.addEventListener('scroll', onScrollOrResize, { passive: true }));
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) {
      vv.addEventListener('resize', onScrollOrResize);
      vv.addEventListener('scroll', onScrollOrResize);
    }
    return () => {
      parents.forEach((p) => p.removeEventListener('scroll', onScrollOrResize));
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      if (vv) {
        vv.removeEventListener('resize', onScrollOrResize);
        vv.removeEventListener('scroll', onScrollOrResize);
      }
    };
  }, [showDropdown, anchorRef, updateMenuPosition]);

  useEffect(() => {
    if (!showDropdown) return undefined;
    const onDown = (e) => {
      if (containerRef?.current?.contains(e.target)) return;
      if (popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showDropdown, containerRef]);

  const notifyChange = (nextValue, nativeEvent) => {
    const q = String(nextValue ?? '').trim();
    setInputQuery(q);
    if (nativeEvent?.target != null) {
      onChange(nativeEvent);
    } else {
      onChange({ target: { value: nextValue } });
    }
    setOpen(q.length >= minChars);
  };

  const handleEventChange = (e) => {
    notifyChange(e?.target?.value ?? '', e);
  };

  const handleValueChange = (next, e) => {
    notifyChange(next, e);
  };

  const pick = (text) => {
    onChange({ target: { value: text } });
    setHoveredRow(null);
    setOpen(false);
  };

  const handleFocus = useCallback(() => {
    if (enabled && inputQuery.length >= minChars) setOpen(true);
  }, [enabled, inputQuery, minChars]);

  const portal =
    showDropdown && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popoverRef}
            role='listbox'
            aria-label={popoverAriaLabel}
            /* `mih-suggestion-popover` is the escape-hatch class the
               Popup base's outside-click handler looks for so clicks
               inside this portaled popover don't dismiss the host modal
               (Add/Edit Diagnosis popups keep their typed-state intact
               while the doctor picks a suggestion). */
            className='mih-suggestion-popover fixed flex flex-col items-stretch'
            style={{
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              /* Sit above modals (--sm-z-modal 1400) so the popover
                 still shows when the textarea lives inside a Popup
                 (e.g. BodyRecordPopup / DrawingCanvasPopup). Same
                 token used by other portal'd menus opened from
                 inside a modal. */
              zIndex: 'var(--sm-z-modal-popover, 1450)',
              background: 'var(--surface-dropdown-default, #FFFFFF)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default, #EBEBEB)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-dropdown, 0 16px 16px rgba(100,116,139,0.15), 0 4px 2px rgba(100,116,139,0.10))',
              padding: 'var(--dim-space-100, 4px)',
              gap: 'var(--dim-space-050, 2px)',
              overflowY: 'auto',
            }}
          >
            {filtered.map((s, i) => {
              const hovered = hoveredRow === i;
              return (
                <button
                  key={i}
                  type='button'
                  role='option'
                  onMouseDown={(e) => { e.preventDefault(); }}
                  onClick={() => pick(s)}
                  onMouseEnter={() => setHoveredRow(i)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className='w-full flex items-center text-left'
                  style={{
                    gap: 'var(--dim-space-200, 8px)',
                    paddingLeft: 'var(--dim-space-300, 12px)',
                    paddingRight: 'var(--dim-space-300, 12px)',
                    paddingTop: 'var(--dim-space-200, 8px)',
                    paddingBottom: 'var(--dim-space-200, 8px)',
                    minHeight: 48,
                    overflow: 'hidden',
                    background: hovered
                      ? 'var(--surface-list-hover, #F4FBF8)'
                      : 'var(--surface-list-default, #FFFFFF)',
                    border: 'none',
                    borderRadius: 'var(--dim-radius-100, 6px)',
                    color: 'var(--text-list-default, #4D5358)',
                    fontFamily: 'var(--type-family-body)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    lineHeight: 1.5,
                    cursor: 'pointer',
                    transition: 'background-color 120ms ease',
                  }}
                >
                  <span
                    className='min-w-0 flex-1 whitespace-normal'
                    style={{
                      color: 'var(--text-list-default, #4D5358)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      lineHeight: 1.5,
                    }}
                  >
                    {highlightMatch(s, inputQuery, `sug-${i}`)}
                  </span>
                  <Icon
                    name='add_circle'
                    size={16}
                    className='shrink-0'
                    style={{
                      color: hovered
                        ? 'var(--icon-brandPrimary-secondary, var(--brand-p600))'
                        : 'var(--icon-brandPrimary-quaternary, var(--brand-p300))',
                      transition: 'color 120ms ease',
                    }}
                  />
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return {
    enabled,
    handleEventChange,
    handleValueChange,
    handleFocus,
    portal,
  };
}
