import React, { useEffect, useRef, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* MIH AI Search — Figma MIH-DS Foundation `3396:1598`.

   Indigo-themed search bar designed for AI search surfaces (e.g. Doctor
   AI ICD lookup — Figma PHCIS · Medical-examination 156:27359). Same
   64 px Large shell as PrimarySearch but every brand-green hook is
   replaced with the indigo `aiSearch` semantic group:

     border  → --border-aiSearch-{default,hover,typing,filled}
     icon    → --icon-aiSearch-{default,hover,typing,filled}
     shadow  → --shadow-indigo-drop-bottom (Figma "Indigo Drop Shadow Bottom")
     submit  → linear-gradient(#6F82FF → #C079EA) 36 px circle
     X clear → indigo-100 #EEF2FF circle, 32 px

   The component has FIVE states matching Figma's `state` enum:

     • default — placeholder + leading search icon, no dropdown
     • hover   — same chrome, label tone shifts (mouse over)
     • focus   — empty value + caret focused; opens "ค้นหาล่าสุด"
                 dropdown with the `history` rows and a `ล้างประวัติ` clear
                 button on the right
     • typing  — value is non-empty AND focused; X clear chip + gradient
                 submit on the right, history dropdown stays open (without
                 the "ล้างประวัติ" header)
     • filled  — value committed (blurred); colorful badge prefix +
                 dark-tone text, no dropdown

   The dropdown reuses the same shared `--surface-dropdown-default`
   + `--border-dropdown-default` chrome as PrimarySearch so list-row
   hover/active behaviour stays consistent across both searches.

   `history` accepts plain strings or rich records:
     `{ id?, label, sublabel?, value?, badge?, badgeStyle?, icon? }`.

   `suggestions` accepts the same record shape and OVERRIDES `history`
   for the Typing dropdown — same contract as PrimarySearch. When the
   parent doesn't pass `suggestions`, AISearch falls back to showing
   history rows in Typing (legacy behavior). Empty `suggestions` array
   renders `emptyMessage` instead of swallowing the dropdown.

   Clicking a row commits `value ?? label` via `onChange` + `onSubmit`.

   Interaction parity with PrimarySearch:
     • caret  — blinks on focus + typing (browser default, never hidden);
                the input's `:placeholder-shown` rule is intentionally
                absent so the user always sees where the cursor sits.
     • X clear (typing-state right cluster) — `onChange?.('')` to wipe the
                value + `onClear?.()` callback + refocus the input. After
                clearing, the state collapses `typing → focus`, the X +
                gradient submit disappear, and the recent-history
                dropdown's "ค้นหาล่าสุด" header reappears. */

/* Inline Sym so the file stays import-light. We deliberately re-implement
   instead of pulling Material Icons through a runtime helper. */
const Sym = ({ name, size = 16, color, className = '' }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      flexShrink: 0,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const DEFAULT_PLACEHOLDER = 'ค้นหารหัสโรค เช่น ไข้เลือดออก';

/* Placeholder colour — design system stylesheet injection.
   `::placeholder` can't be targeted from React's inline `style` prop, so
   we drop one global stylesheet onto the document at module load (the
   same pattern `_inputBox.jsx` uses for the main form inputs).
     • `.mih-aisearch-input::placeholder` aliases the
       `text/primarySearch/default` design token (Figma node
       3396:1602), so the empty Default + Hover states show
       "ค้นหารหัสโรค เช่น ไข้เลือดออก" at #ADB2B7 — matching the spec
       across every browser (Chromium / Firefox / Safari otherwise render
       their own muted-grey defaults that don't honour the token).
     • `opacity: 1` overrides Firefox's 0.54 default opacity which would
       otherwise lighten the placeholder past the Figma colour.
   Once the user types (Typing/Filled state) the input has a value, so
   the placeholder is hidden and the rule no longer applies. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-aisearch-placeholder-style';
  const css = `
.mih-aisearch-input::placeholder { color: var(--text-primarysearch-default, #ADB2B7); opacity: 1; }
.mih-aisearch-input,
.mih-aisearch-input:focus,
.mih-aisearch-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
@keyframes mih-aisearch-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.mih-aisearch-spinner { animation: mih-aisearch-spin 900ms linear infinite; }
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* — Right cluster — gradient submit (Figma "Sent Button" 3401:6262 ·
   Default 3401:6254 · Hover 3401:6261). Linear-gradient indigo→fuchsia
   morphing between two sizes:
     • Default: 36 × 36 (`dimension/size/700`)
     • Hover:   40 × 40 (`dimension/size/800`) — visually "grows" toward
                the cursor, signals "active target" without changing the
                gradient or radius. Same `dimension/radius/600` (24 px,
                already capped to a circle) across both states.
   Pressed (mousedown) keeps the local press feedback — `translateY(1px)
   scale(0.95)` — same press pattern other MIH buttons (BrandButton,
   NeutralSubdueButton) ship. Layered on top of the hover scale via a
   single `transform` so the two interactions compose smoothly.
   `onMouseDown={(e) => e.preventDefault()}` keeps the input focused so
   the typing state survives the click (otherwise blur → state collapses
   Typing → Filled → button unmounts before mouseup → click swallowed). */
const AISubmitButton = ({ onClick, disabled, ariaLabel = 'ส่งคำค้นหา' }) => {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const enlarged = hovered && !disabled;
  const size = enlarged ? 'var(--dim-size-800, 40px)' : 'var(--dim-size-700, 36px)';
  return (
    <button
      type='button'
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) setPressed(true); }}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className='inline-flex items-center justify-center shrink-0 rounded-full'
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--dim-radius-600, 24px)',
        background: 'linear-gradient(180deg, #6F82FF 0%, #C079EA 100%)',
        border: 'none',
        color: '#FFFFFF',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transform: pressed ? 'translateY(1px) scale(0.95)' : 'translateY(0) scale(1)',
        transition:
          'width 180ms ease, height 180ms ease, opacity 160ms ease, transform 140ms ease',
      }}
    >
      <Sym name='arrow_upward' size={16} color='currentColor' />
    </button>
  );
};

/* Loading spinner — 36 × 36 indigo chip with a spinning `progress_activity`
   glyph. Sits in the right cluster while the parent fetches results so the
   user has feedback that a query is in flight. */
const AILoadingSpinner = () => (
  <span
    role='status'
    aria-label='กำลังค้นหา'
    className='inline-flex items-center justify-center shrink-0 rounded-full'
    style={{
      width: 'var(--dim-size-700, 36px)',
      height: 'var(--dim-size-700, 36px)',
      borderRadius: 'var(--dim-radius-600, 24px)',
      background: 'var(--color-indigo-100, #EEF2FF)',
      color: 'var(--icon-aiSearch-typing, #4338CA)',
    }}
  >
    <Sym name='progress_activity' size={20} color='currentColor' className='mih-aisearch-spinner' />
  </span>
);

/* — X clear chip (Figma 3396:3243 default · 3396:3245 hover · 3396:3250
   click-contract). 32 × 32 chip housing a 16 px close glyph.
     • Default: bg `color/indigo/100` (#EEF2FF), radius `dimension/radius/600`
       (24 px — already capped to a circle at this size).
     • Hover:   bg `color/indigo/200` (#E0E7FF), radius `dimension/radius/full`
       (9999 px — same visual circle, kept explicit for token parity with
       Figma's hover variant).
   `onMouseDown={(e) => e.preventDefault()}` keeps the input focused so
   the typing state survives long enough for the click event to fire
   (otherwise blur → state collapses Typing → Filled → button unmounts
   before mouseup → click is swallowed). */
const AIClearButton = ({ onClick, ariaLabel = 'ล้างคำค้นหา' }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={ariaLabel}
      className='inline-flex items-center justify-center shrink-0 rounded-full'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        borderRadius: hovered
          ? 'var(--dim-radius-full, 9999px)'
          : 'var(--dim-radius-600, 24px)',
        background: hovered
          ? 'var(--color-indigo-200, #E0E7FF)'
          : 'var(--color-indigo-100, #EEF2FF)',
        border: 'none',
        color: 'var(--icon-aiSearch-typing, #4338CA)',
        cursor: 'pointer',
        transition:
          'background-color 150ms ease, border-radius 200ms ease, color 150ms ease',
      }}
    >
      <Sym name='close' size={16} color='currentColor' />
    </button>
  );
};

/* Row inside the "ค้นหาล่าสุด" dropdown. Hover paints the brand-green
   list tokens — same as PrimarySearch — so list interaction stays
   consistent across both search components. Spacing follows Figma
   3396:1627 (Dropdown / Recent): the leading badge sits in a 64 px
   fixed-width column so ICD codes of varying length (e.g. "I10" vs
   "M54.9") stack with the label text vertically aligned across rows.
   A 16 px `add_circle` trailing icon is always visible (no hover
   reveal) — it indicates "add this code to the active query". */
const HistoryRow = ({ item, onSelect, highlighted = false, onHover }) => {
  const [hover, setHover] = useState(false);
  /* `active` paints the hover tokens whether the user reached the row by
     mouse hover OR by keyboard ↑↓. Visual signal is consistent so the
     user doesn't need to learn two separate "selected" looks. */
  const active = hover || highlighted;
  return (
    <button
      type='button'
      role='option'
      aria-selected={highlighted}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect?.(item)}
      onMouseEnter={() => { setHover(true); onHover?.(); }}
      onMouseLeave={() => setHover(false)}
      className='w-full flex items-center text-left'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        minHeight: 48,
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: active ? 'var(--surface-list-hover, #F4FBF8)' : 'var(--surface-list-default, #FFFFFF)',
        border: 'none',
        color: active ? 'var(--text-list-hover, #007549)' : 'var(--text-list-default, #4D5358)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        cursor: 'pointer',
        transition: 'background-color 120ms ease, color 120ms ease',
      }}
    >
      {item.badge && (
        <div
          className='shrink-0 flex items-center'
          style={{ width: 64 }}
        >
          <ColorfulBadge
            style={item.badgeStyle || 'blue'}
            hierarchy='primary'
            size='small'
            width='cap'
          >
            {item.badge}
          </ColorfulBadge>
        </div>
      )}
      <span className='flex-1 min-w-0 whitespace-normal' style={{ color: 'inherit' }}>
        {item.label}
      </span>
      <Sym
        name='add_circle'
        size={16}
        color={active ? 'var(--text-list-hover, #007549)' : 'var(--text-content-tertiary, #858C92)'}
      />
    </button>
  );
};

const AISearch = React.forwardRef(function AISearch(
  {
    value = '',
    onChange,
    onSubmit,
    onClear,
    onClearHistory,
    placeholder = DEFAULT_PLACEHOLDER,
    history = [],
    /** Live suggestions shown in the Typing state — typically a parent-
        filtered slice of a larger catalog (e.g. ICD-10 codes whose code
        or name contains the typed query). When `suggestions` is provided
        (array, even if empty), it OVERRIDES `history` for the typing
        dropdown: an empty array renders `emptyMessage` instead. When
        undefined / null, AISearch falls back to showing `history` rows
        in Typing — the previous behavior. */
    suggestions,
    /** Copy shown when the user is typing but `suggestions` is empty. */
    emptyMessage = 'ไม่พบรายการที่ค้นหา',
    /** Copy shown when the user opens the dropdown but `history` is empty. */
    historyEmptyMessage = 'ยังไม่มีประวัติการค้นหา',
    historyTitle = 'ค้นหาล่าสุด',
    clearHistoryLabel = 'ล้างประวัติ',
    width,
    minWidth = 320,
    maxWidth = 640,
    showShadow = true,
    /** Force the visual state — useful in design-system grids. Pass one of
        'default' | 'hover' | 'focus' | 'typing' | 'filled' to bypass the
        focus/value-driven auto-resolver. */
    state: stateProp,
    /** Optional badge prefix shown in the Filled state (e.g. ICD code).
        Pass a string for the badge label only, or `{ label, style }`. */
    filledBadge,
    /** When true, swaps the right cluster for an inline spinner — used by
        the parent while an async query is in flight (e.g. ICD lookup). */
    loading = false,
    'aria-label': ariaLabel = 'ค้นหา',
    className = '',
    style = {},
  },
  ref,
) {
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const composeRef = (el) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  /* Keyboard navigation cursor for the history dropdown. -1 means "no
     row highlighted" — Enter then commits the current input value
     instead of a row. */
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const trimmed = String(value ?? '').trim();
  const hasValue = trimmed.length > 0;

  /* Auto-resolved state: focus + has-value = typing; focus + empty = focus;
     blurred + has-value = filled; blurred + hover = hover; else default.
     `stateProp` always wins so design-system grids can pin a state. */
  const state =
    stateProp
    || (focused && hasValue ? 'typing'
      : focused ? 'focus'
      : hasValue ? 'filled'
      : hovered ? 'hover'
      : 'default');

  const isOpen = state === 'focus' || state === 'typing';
  /* Loading swaps out the X + Submit pair for a single spinner so the
     user can't double-submit while a query is in flight. Filled-state
     badge stays hidden during loading too. */
  const showSubmit = state === 'typing' && !loading;
  const showClear = state === 'typing' && !loading;
  const showFilledBadge = state === 'filled' && filledBadge != null && filledBadge !== false && !loading;

  /* Resolve which list backs the dropdown for the current state:
       • Focus  → recent history (with "ค้นหาล่าสุด" header)
       • Typing → suggestions (parent-filtered live results) when the
                  prop is provided; otherwise fall back to history so
                  legacy callers don't break. An empty suggestions array
                  is an explicit "no matches" signal — render
                  `emptyMessage` instead of swallowing the dropdown. */
  const hasSuggestions = Array.isArray(suggestions);
  const activeRows = state === 'typing'
    ? (hasSuggestions ? suggestions : history)
    : history;
  const showEmptySuggestions = state === 'typing' && hasSuggestions && activeRows.length === 0;
  const showEmptyHistory = state === 'focus' && history.length === 0;
  const dropdownVisible = isOpen
    && (activeRows.length > 0 || showEmptySuggestions || showEmptyHistory);

  /* Reset the keyboard highlight whenever the dropdown closes or its
     contents change. Without this the highlighted index would point
     into a stale list after typing or after history/suggestions
     mutations. */
  useEffect(() => {
    if (!isOpen) setHighlightedIndex(-1);
    else if (highlightedIndex >= activeRows.length) setHighlightedIndex(-1);
  }, [isOpen, activeRows.length, trimmed]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Click-outside: blur the input when the user clicks anywhere outside
     the AISearch wrapper. Bound on mousedown (not click) so the blur
     fires before any potential focus-stealing click target inside the
     page interferes. */
  useEffect(() => {
    if (!focused) return undefined;
    const onDocMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [focused]);

  /* Border + icon token per state — wired to design.md §6.17.6b AI Search
     semantic tokens. Focus + typing keep the default indigo/500 border so
     focusing the input does not introduce a visible "outline" line (the
     dropdown + caret already signal focus). Hover darkens to indigo/700
     and filled drops to indigo/600 per Figma. The icon still retints per
     state — only the border is pinned to default for focus/typing. */
  const borderToken =
    state === 'hover' ? 'var(--border-aiSearch-hover)'
    : state === 'filled' ? 'var(--border-aiSearch-filled)'
    : 'var(--border-aiSearch-default)';
  const iconToken =
    state === 'hover' ? 'var(--icon-aiSearch-hover)'
    : state === 'focus' ? 'var(--icon-aiSearch-typing)'
    : state === 'typing' ? 'var(--icon-aiSearch-filled)'
    : state === 'filled' ? 'var(--icon-aiSearch-filled)'
    : 'var(--icon-aiSearch-default)';
  const textToken =
    state === 'hover' ? 'var(--text-primarysearch-hover, #4D5358)'
    : state === 'typing' || state === 'filled' ? 'var(--text-primarysearch-typing, #4D5358)'
    : 'var(--text-primarysearch-default, #ADB2B7)';

  const resolvedFilledBadge = typeof filledBadge === 'object' && filledBadge !== null
    ? filledBadge
    : { label: filledBadge, style: 'blue' };

  const handleSubmit = () => {
    if (!hasValue) return;
    onSubmit?.(trimmed);
  };

  /* Commit a row from `activeRows` at index `i` — same path the mouse
     takes when clicking a row, so Enter-on-highlight and Click stay in
     sync. Works for both history rows (Focus state) and suggestion
     rows (Typing state) since `activeRows` resolves to whichever list
     is currently rendered. */
  const commitRowAt = (i) => {
    const raw = activeRows[i];
    if (raw == null) return;
    const picked = typeof raw === 'string' ? { label: raw } : raw;
    const next = picked.value ?? picked.label;
    onChange?.(next);
    onSubmit?.(next, picked);
  };

  /* Keyboard contract:
       Enter   → commit highlighted row if any; else submit current value
       ↑ / ↓   → move the highlight through `activeRows` (wrap-around).
                 Only active while the dropdown is open + rows exist.
       Escape  → clear + blur (focus → default)                          */
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && isOpen && activeRows.length > 0) {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % activeRows.length);
    } else if (e.key === 'ArrowUp' && isOpen && activeRows.length > 0) {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + activeRows.length) % activeRows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < activeRows.length) {
        commitRowAt(highlightedIndex);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
      onClear?.();
    }
  };

  /* Resolve width — explicit > defaults from Figma 640 max / 320 min. */
  const widthStyle = width != null
    ? { width, maxWidth: width }
    : { width: '100%', minWidth, maxWidth };

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col w-full ${className}`}
      /* `position: relative` anchors the absolute-positioned dropdown
         below so it overlays the surrounding layout instead of pushing
         it down when opened. Wrapper height = search-bar height
         (64 px); the dropdown floats out of flow on top of whatever
         sits beneath the AISearch. */
      style={{ position: 'relative', gap: 'var(--dim-space-100, 4px)', ...widthStyle, ...style }}
    >
      <div
        className='flex items-center w-full'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          gap: 'var(--dim-space-400, 16px)',
          height: 'var(--dim-size-1400, 64px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: `var(--dim-stroke-200, 2px) solid ${borderToken}`,
          background: 'var(--surface-search-default, #FFFFFF)',
          boxShadow: showShadow ? 'var(--shadow-indigo-drop-bottom-200)' : 'none',
          transition: 'border-color 160ms ease, box-shadow 160ms ease',
        }}
      >
        {/* Search icon — Figma 3396:1614 (Search · 20×20 frame with
            8.33% icon inset → ~16.7 px effective glyph). Material
            Symbols Outlined `search` matches the Figma asset's
            outlined-magnifying-glass shape at the same effective size. */}
        <Sym name='search' size={20} color={iconToken} />
        {showFilledBadge && (
          <ColorfulBadge
            style={resolvedFilledBadge.style || 'blue'}
            hierarchy='primary'
            size='small'
            width='hug'
          >
            {resolvedFilledBadge.label}
          </ColorfulBadge>
        )}
        <input
          ref={composeRef}
          type='text'
          /* `mih-aisearch-input` triggers the global `::placeholder`
             rule injected at module load (see top of file) so the
             empty-state placeholder colour aliases the
             `--text-primarysearch-default` token across all browsers. */
          className='mih-aisearch-input'
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{
            flex: 1,
            minWidth: 0,
            height: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: textToken,
          }}
        />
        {showClear && (
          <AIClearButton
            onClick={() => {
              onChange?.('');
              onClear?.();
              inputRef.current?.focus();
            }}
          />
        )}
        {showSubmit && <AISubmitButton onClick={handleSubmit} disabled={!hasValue} />}
        {loading && <AILoadingSpinner />}
      </div>

      {/* Recent-history / suggestions dropdown — focus + typing states.
          `activeRows` resolves to `suggestions` in Typing (when provided)
          else `history`. Empty-state messages render when the parent
          explicitly signals "no suggestions" / "no history".
          `onMouseDown={(e) => e.preventDefault()}` keeps the input
          focused so the dropdown doesn't unmount before a click fires. */}
      {dropdownVisible && (
        <div
          role='listbox'
          aria-label={state === 'typing' && hasSuggestions ? 'คำแนะนำ' : historyTitle}
          onMouseDown={(e) => e.preventDefault()}
          className='flex flex-col'
          style={{
            /* Absolute-positioned so the dropdown floats over the
               surrounding layout instead of pushing it down. Anchored
               to the wrapper (position: relative). `top: calc(100% +
               space/100)` keeps the same 4 px gap the previous in-flow
               layout had. z-index 50 sits above page chrome but below
               any system overlay (modal / toast). */
            position: 'absolute',
            top: 'calc(100% + var(--dim-space-100, 4px))',
            left: 0,
            right: 0,
            zIndex: 50,
            width: '100%',
            gap: 'var(--dim-space-050, 2px)',
            padding: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default, #EBEBEB)',
            background: 'var(--surface-dropdown-default, #FFFFFF)',
            boxShadow:
              'var(--shadow-dropdown, 0 16px 16px rgba(100,116,139,0.15), 0 4px 2px rgba(100,116,139,0.10))',
          }}
        >
          {/* Header — focus state only (Figma 3345:2219). Typing skips it. */}
          {state === 'focus' && history.length > 0 && (
            <div
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
              }}
            >
              <span style={{
                flex: 1,
                color: 'var(--text-content-tertiary, #858C92)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
              }}>
                {historyTitle}
              </span>
              {onClearHistory && (
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={(e) => {
                    e.preventDefault();
                    onClearHistory?.();
                  }}
                >
                  {clearHistoryLabel}
                </NeutralSubdueButton>
              )}
            </div>
          )}
          {(showEmptySuggestions || showEmptyHistory) ? (
            <div
              style={{
                padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
                color: 'var(--text-content-tertiary, #858C92)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
              }}
            >
              {showEmptySuggestions ? emptyMessage : historyEmptyMessage}
            </div>
          ) : (
            activeRows.map((raw, idx) => {
              const item = typeof raw === 'string' ? { label: raw } : raw;
              return (
                <HistoryRow
                  key={item.id || `${item.label}-${idx}`}
                  item={item}
                  highlighted={idx === highlightedIndex}
                  onHover={() => setHighlightedIndex(idx)}
                  onSelect={(picked) => {
                    const next = picked.value ?? picked.label;
                    onChange?.(next);
                    onSubmit?.(next, picked);
                  }}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
});

AISearch.displayName = 'AISearch';

export default AISearch;
