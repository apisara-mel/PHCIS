import React, { useEffect, useRef, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandCircleIconButton from '@/components/button/BrandCircleIconButton';
import { Icon } from '@/components/icons/Icon';

/* PrimarySearch — Figma MIH DS Foundation 2056:4246
   56px pill search with five states: Default / Hover / Focus / Typing /
   Filled. Typing shows the Figma X Button + Brand Circle Icon Button;
   all other states contain only the leading Search glyph and input text.

   Dropdown (focused state, overlays the page):
     • empty input   → recent-search history (`history` prop, default [])
     • typing        → live suggestions     (`suggestions` prop, default [])
                       Falls back to `emptyMessage` when suggestions is empty.

  `history` / `suggestions` accept either plain strings or rich records:
    `{ id?, label, sublabel?, value?, icon?, avatarSrc? }`.
  Clicking a row commits `value ?? label` via `onChange` + `onSubmit(value, item)`.

   All colors / dimensions / typography aliased from design.md via the
   dash-named CSS variables in src/index.css. */

/* Wrapped native input owns no browser chrome; the pill shell renders every
   border, background and shadow. The caret intentionally remains visible
   because Figma's Typing state explicitly shows the insertion point. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-primarysearch-input-style';
  const css = `
.mih-primarysearch-input::placeholder {
  color: var(--primarysearch-input-color, var(--text-primarysearch-default, #ADB2B7));
  opacity: 1;
}
.mih-primarysearch-input,
.mih-primarysearch-input:focus,
.mih-primarysearch-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-primarysearch-input::-webkit-search-cancel-button,
.mih-primarysearch-input::-webkit-search-decoration,
.mih-primarysearch-input::-webkit-search-results-button,
.mih-primarysearch-input::-webkit-search-results-decoration {
  -webkit-appearance: none !important;
  appearance: none !important;
  display: none !important;
}
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* XButton (typing-state clear) — Figma node 3345:2713 / 2056:4246's
   typing variant. 40×40 brand-quaternary chip that wipes the input. */
const XButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      aria-label='clear search'
      onMouseDown={(e) => e.preventDefault() /* keep input focused */}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 'var(--dim-size-800, 40px)',
        height: 'var(--dim-size-800, 40px)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        background: hovered
          ? 'var(--surface-brandPrimary-quaternary-hover)'
          : 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
        border: 'none',
        cursor: 'pointer',
        padding: 'var(--dim-space-0)',
        transition: 'background-color 150ms ease-out, color 150ms ease-out',
      }}
    >
      <Icon name='close' size={16} style={{ color: 'currentColor' }} />
    </button>
  );
};

const SubmitButton = ({ onClick }) => (
  <BrandCircleIconButton
    icon='arrow_upward'
    variant='fill'
    size='md'
    aria-label='ค้นหา'
    onClick={onClick}
    onMouseDown={(e) => e.preventDefault() /* keep input focused */}
    className='shrink-0'
  />
);

/* Normalise a suggestion / history entry into `{ id, label, sublabel?, value?, icon?, avatarSrc? }`.
   Strings collapse to `{ label, value: label }` so callers can pass either
   plain strings (recent-search style) or rich records (queue match cards). */
const normaliseItem = (item, idx) => {
  if (item == null) return null;
  if (typeof item === 'string') {
    return { id: `${idx}-${item}`, label: item, value: item };
  }
  return {
    id: item.id ?? `${idx}-${item.label ?? ''}`,
    label: item.label ?? '',
    sublabel: item.sublabel,
    value: item.value ?? item.label ?? '',
    icon: item.icon,
    avatarSrc: item.avatarSrc ?? item.avatarUrl ?? item.src,
    /* Leading colorful pills (Figma 3345:2981 / 3346:8231 — queue + HN
       row variant). Each entry: { label, tone }. `tone` maps to a
       ColorfulBadge surface/text pair such as 'teal', 'indigo', 'blue',
       'brand'. Pass `null` / omit to keep the legacy text-only row. */
    badges: Array.isArray(item.badges) ? item.badges : undefined,
  };
};

/* Recent / typing dropdown rows alias the DS `<ColorfulBadge>` directly
   (Figma 2076:8413). Per Figma 3345:2981 the queue pill is `teal` and the
   HN pill is `indigo`, both rendered as Small / Default fill / Secondary
   hierarchy. See `SuggestionRow` below for the call site. */

/* Section header used inside the dropdown — Figma node I2692:5995;3345:2219
   (Title row of "Dropdown/Recent"). Body Regular sm (14 px) tertiary text,
   no uppercase / no letter-spacing. Padding pt 16 / pb 8 / px 16 ; 10 px
   gap between title and trailing slot. The trailing slot typically hosts
   a <NeutralSubdueButton> ("ล้างประวัติ") — see DropdownPanel callers. */
const SectionHeader = ({ title, trailing }) => (
  <div
    className='w-full flex items-center'
    style={{
      paddingLeft:   'var(--dim-space-400)',
      paddingRight:  'var(--dim-space-400)',
      paddingTop:    'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-200)',
      gap: 'var(--dim-space-200, 8px)',
    }}
  >
    <span
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontWeight: 'var(--type-weight-regular, 400)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      {title}
    </span>
    {trailing}
  </div>
);

/* Hover state — Figma 2692:5995 (List items inside dropdown). The
   `.mih-search-row` class (defined in src/index.css) drives:
     surface  → --surface-list-default → --surface-list-hover  (brand-p50)
     label    → --text-list-default    → --text-list-hover     (brand-p700)
     icon     → --text-content-tertiary → --text-list-hover
     sublabel → --text-content-tertiary → --text-list-hover
   All four animate together via `transition: color/background-color
   150ms ease-out`. The CSS rule lives in index.css so it works under
   Tailwind v2.1 JIT without arbitrary-value class quirks, and so inline
   styles can't override the hover tone via specificity. */
/* Row — Figma I2692:5995;3345:2068 (canonical "List" item) + the rich
   recent/typing dropdown rows from 3345:2981 / 3346:8231.
     min-h 48 · px 12 · py 8 · gap 8 · radius 4.
   Leading content priority:
     1. `item.badges` (Figma 3345:2981 — queue + HN colorful pills)
     2. else leading icon (`item.icon` or fall-back `leadingIcon`)
     3. else text-only row (Figma 2692:5995 default)
   Trailing chevron-right fades in on row hover via `.mih-search-row__chevron`
   so the resting state stays clean. */
const SuggestionRow = ({ item, leadingIcon, onPick }) => {
  const iconName = item.icon || leadingIcon;
  const hasBadges = Array.isArray(item.badges) && item.badges.length > 0;
  return (
    <button
      type='button'
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onPick && onPick(item)}
      className='mih-search-row w-full flex items-center cursor-pointer overflow-hidden text-left'
      style={{
        minHeight: 'var(--dim-size-1000)',
        gap:           'var(--dim-space-200, 8px)',
        paddingLeft:   'var(--dim-space-300)',
        paddingRight:  'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius:  'var(--dim-radius-100, 4px)',
        fontFamily: 'var(--type-family-body)',
        fontSize:   'var(--type-size-sm)',
        lineHeight: 1.5,
        border: 'none',
      }}
    >
      {hasBadges ? (
        <span
          className='inline-flex items-center shrink-0'
          style={{ gap: 'var(--dim-space-100, 4px)' }}
        >
          {item.badges.map((b, i) => (
            <ColorfulBadge
              key={`${b.label}-${i}`}
              style={b.tone}
              size='small'
              fill='default'
              hierarchy='secondary'
            >
              {b.label}
            </ColorfulBadge>
          ))}
        </span>
      ) : iconName ? (
        <span
          aria-hidden
          className='mih-search-row__icon inline-flex items-center justify-center shrink-0'
          style={{
            width: 'var(--dim-size-400)',
            height: 'var(--dim-size-400)',
          }}
        >
          <Icon name={iconName} size={18} style={{ color: 'currentColor' }} />
        </span>
      ) : null}
      <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
        <span
          className='truncate'
          style={{
            color: 'inherit',
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-regular, 400)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}
        >
          {item.label}
        </span>
        {item.sublabel && (
          <span
            className='mih-search-row__sublabel truncate'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            {item.sublabel}
          </span>
        )}
      </span>
      {/* Trailing chevron-right — hover-only (CSS `.mih-search-row__chevron`).
          Per Figma 3345:2981 / 3346:8231 it points to the row being focused
          by the cursor; resting rows hide it via opacity 0. */}
      <span
        aria-hidden
        className='mih-search-row__chevron inline-flex items-center justify-center shrink-0'
        style={{
          width: 'var(--dim-size-400)',
          height: 'var(--dim-size-400)',
        }}
      >
        <Icon name='chevron_right' size={16} style={{ color: 'currentColor' }} />
      </span>
    </button>
  );
};

const DropdownPanel = ({ children }) => (
  <div
    className='w-full flex flex-col mih-search-popover'
    style={{
      background:    'var(--surface-dropdown-default)',
      border:        'var(--dim-stroke-100) solid var(--border-dropdown-default)',
      borderRadius:  'var(--dim-radius-500)',
      boxShadow:     'var(--shadow-dropdown)',
      padding:       'var(--dim-space-100)',
      gap: 'var(--dim-space-0)',
    }}
  >
    {children}
  </div>
);

const PrimarySearch = ({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  placeholder = 'ค้นหาเลข HN / เลขบัตรประชาชน / ชื่อ-นามสกุล',
  width = 640,
  /* Kept for backward API compatibility; the current Figma component no
     longer renders the legacy recent-search avatar pile. */
  avatars: _avatars,
  /* Live match list while typing — `Array<string | { id?, label, sublabel?, value?, icon? }>`.
     Default `[]` so non-opt-in pages don't show a dropdown. */
  suggestions = [],
  /* Recent-search history shown when focused with an empty input.
     Same shape as `suggestions`. */
  history = [],
  historyTitle = 'ค้นหาล่าสุด',
  /* Shown under the history header when the recent-search list is empty
     so the dropdown still appears and the user sees what the section is
     for. Pass `null` to suppress the placeholder (and hide the dropdown
     entirely when there's no history). */
  historyEmptyMessage = 'ยังไม่มีประวัติการค้นหา',
  suggestionsTitle,
  /* Shown when the user is typing but `suggestions` is empty. Pass `null`
     or empty string to suppress. */
  emptyMessage = 'ไม่พบรายการที่ค้นหา',
  /* Optional — when provided, renders a "ล้าง" affordance on the history
     header so users can wipe their recent searches. */
  onHistoryClear,
  /* On focus, scroll only when needed so the recent-search dropdown fits.
     Prefer `--mih-queue-sticky-under-tabs` (QueuePageShell) so the bar lands
     just under Topbar + SubHeader + tabs — not underneath them (default
     120px was too aggressive on consent / queue pages). Set to `null` to
     disable auto-scroll entirely. */
  scrollOffsetTop = 120,
  state: stateProp,                /* force visual state: 'default' | 'hover' | 'typing' | 'filled' */
  className = '',
  style = {},
  ...rest
}) => {
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState(defaultValue);
  const v = isControlled ? value : innerValue;

  const [focused, setFocused] = useState(false);
  const [hover,   setHover]   = useState(false);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  // Click-outside collapses the typing state
  useEffect(() => {
    if (!focused) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        inputRef.current && inputRef.current.blur();
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [focused]);

  /* Keep the search bar reachable under sticky chrome and leave room for
     the history / suggestion dropdown. Skip scrolling when already fine. */
  useEffect(() => {
    if (!focused) return undefined;
    if (scrollOffsetTop == null) return undefined;
    if (typeof window === 'undefined') return undefined;
    const el = wrapRef.current;
    if (!el) return undefined;

    const STICKY_GAP = 12;
    const DROPDOWN_MIN_SPACE = 280;

    const readStickyUnderTabsPx = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--mih-queue-sticky-under-tabs')
        .trim();
      if (!raw) return null;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : null;
    };

    const raf = requestAnimationFrame(() => {
      const stickyPx = readStickyUnderTabsPx();
      const offset = stickyPx != null
        ? stickyPx + STICKY_GAP
        : (Number(scrollOffsetTop) || 120);

      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const obscuredByChrome = rect.top < offset - 8;
      const needsRoomForDropdown = spaceBelow < DROPDOWN_MIN_SPACE;

      if (!obscuredByChrome && !needsRoomForDropdown) return;

      if (!obscuredByChrome && needsRoomForDropdown) {
        const deficit = DROPDOWN_MIN_SPACE - spaceBelow;
        window.scrollTo({ top: window.scrollY + deficit, behavior: 'smooth' });
        return;
      }

      const target = Math.max(0, window.scrollY + rect.top - offset);
      if (Math.abs(target - window.scrollY) <= 8) return;
      window.scrollTo({ top: target, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [focused, scrollOffsetTop]);

  const handleChange = (e) => {
    if (!isControlled) setInnerValue(e.target.value);
    onChange && onChange(e.target.value, e);
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSubmit) onSubmit(v);
    if (e.key === 'Escape') {
      inputRef.current && inputRef.current.blur();
    }
  };

  /* Resolve visual state — Figma 2056:4246 property panel exposes FIVE
     states: Default · Hover · Focus · Typing · Filled. Focus and Typing
     both have the input focused, but split on whether a value is present:
       focused + empty   → focus   (dropdown shows recent)
       focused + value   → typing  (right cluster: XButton + SubmitButton; dropdown shows suggestions)
     `stateProp` keeps overriding for the state-matrix preview. */
  const filled = !!v;
  const computedState = focused
    ? (filled ? 'typing' : 'focus')
    : hover
    ? 'hover'
    : filled
    ? 'filled'
    : 'default';
  /* Foundation's earlier state node calls Hover "Pressed" (2056:4105).
     Keep `pressed` as an API alias while resolving to the canonical token. */
  const forcedState = String(stateProp || '').toLowerCase();
  const state = forcedState === 'pressed' ? 'hover' : (forcedState || computedState);
  const isTyping = state === 'typing';

  // Color tokens follow the state's variant per Figma 2056:4246.
  const iconColor  = `var(--icon-primarysearch-${state})`;
  const inputColor = `var(--text-primarysearch-${state})`;

  // Figma 2056:4246 — shared 56px pill shell for all five states.
  const shellStyle = {
    height: 'var(--dim-size-1200, 56px)',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: state === 'default' || state === 'typing'
      ? 'var(--dim-size-2500, 320px)'
      : 'var(--dim-size-2100, 160px)',
    maxWidth: width,
    background: 'var(--surface-search-default)',
    borderStyle: 'solid',
    borderWidth: 'var(--dim-stroke-200)',
    borderColor: `var(--border-primarysearch-${state})`,
    borderRadius: 'var(--dim-radius-full, 9999px)',
    boxShadow: 'var(--shadow-primarysearch)',
    paddingLeft: 'var(--dim-size-500, 24px)',
    paddingRight: 'var(--dim-size-500, 24px)',
    paddingTop: 'var(--dim-space-400, 16px)',
    paddingBottom: 'var(--dim-space-400, 16px)',
    gap: 'var(--dim-space-600)',
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <div
      ref={wrapRef}
      className={`flex flex-col ${className}`}
      style={{
        width: '100%',
        minWidth: 'var(--dim-size-2100, 160px)',
        maxWidth: width || 640,
        position: 'relative',
        ...style,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => inputRef.current && inputRef.current.focus()}
      {...rest}
    >
      {/* Search shell */}
      <div
        className='transition-all duration-200 ease-out'
        style={shellStyle}
      >
        {/* Left: icon + input */}
        <div className='flex flex-1 min-w-0 items-center' style={{ gap: 'var(--dim-space-400)' }}>
          <span
            aria-hidden
            className='inline-flex items-center justify-center shrink-0'
            style={{ width: 'var(--dim-size-400)', height: 'var(--dim-size-400)' }}
          >
            <Icon name='search' size={20} style={{ color: iconColor }} />
          </span>
          <input
            ref={inputRef}
            type='search'
            value={v}
            placeholder={placeholder}
            onChange={handleChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            className='mih-primarysearch-input flex-1 min-w-0 bg-transparent outline-none border-0 p-0'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize:   'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: inputColor,
              '--primarysearch-input-color': inputColor,
              WebkitTextStroke: 0,
              WebkitAppearance: 'none',
              appearance: 'none',
              outline: 'none',
              border: 'none',
              boxShadow: 'none',
              boxSizing: 'content-box',
            }}
          />
        </div>

        {/* Figma Typing state only: X Button + Brand Circle Icon Button. */}
        {isTyping && (
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-600, 24px)' }}>
            <XButton
              onClick={() => {
                if (!isControlled) setInnerValue('');
                onChange && onChange('', null);
                inputRef.current && inputRef.current.focus();
              }}
            />
            <SubmitButton onClick={() => onSubmit && onSubmit(v)} />
          </div>
        )}
      </div>

      {/* Dropdown — focused + empty value → history;
                     focused + value → live suggestions (or empty state).
          Absolutely positioned so it overlays the table below without
          pushing layout. `top: calc(100% + space/100)` keeps the 4px gap. */}
      {(() => {
        if (!focused) return null;

        const trimmed = (v ?? '').toString();
        const showSuggestions = trimmed.length > 0;

        const historyItems = !showSuggestions
          ? history.map(normaliseItem).filter(Boolean)
          : [];
        const suggestionItems = showSuggestions
          ? suggestions.map(normaliseItem).filter(Boolean)
          : [];

        const hasContent = showSuggestions
          ? (suggestionItems.length > 0 || !!emptyMessage)
          : (historyItems.length > 0 || !!historyEmptyMessage);
        if (!hasContent) return null;

        const pickItem = (item) => {
          const next = item.value ?? item.label ?? '';
          if (!isControlled) setInnerValue(next);
          onChange && onChange(next, null);
          onSubmit && onSubmit(next, item);
          inputRef.current && inputRef.current.blur();
        };

        return (
          <div
            style={{
              position: 'absolute',
              top:  'calc(100% + var(--dim-space-100))',
              left: 'var(--dim-space-0)',
              right: 'var(--dim-space-0)',
              zIndex: 1100,
            }}
          >
            <DropdownPanel>
              {showSuggestions ? (
                <>
                  {suggestionsTitle && <SectionHeader title={suggestionsTitle} />}
                  {suggestionItems.length > 0 ? (
                    suggestionItems.map((item) => (
                      <SuggestionRow
                        key={item.id}
                        item={item}
                        onPick={pickItem}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        paddingLeft:   'var(--dim-space-300)',
                        paddingRight:  'var(--dim-space-300)',
                        paddingTop:    'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-300)',
                        color: 'var(--text-content-tertiary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        lineHeight: 1.5,
                      }}
                    >
                      {emptyMessage}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <SectionHeader
                    title={historyTitle}
                    trailing={onHistoryClear ? (
                      <NeutralSubdueButton
                        variant='outline'
                        size='sm'
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onHistoryClear}
                        className='shrink-0'
                      >
                        ล้างประวัติ
                      </NeutralSubdueButton>
                    ) : null}
                  />
                  {historyItems.length > 0 ? (
                    historyItems.map((item) => (
                      <SuggestionRow
                        key={item.id}
                        item={item}
                        leadingIcon={
                          Array.isArray(item.badges) && item.badges.length > 0
                            ? undefined
                            : 'schedule'
                        }
                        onPick={pickItem}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        paddingLeft:   'var(--dim-space-300)',
                        paddingRight:  'var(--dim-space-300)',
                        paddingTop:    'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-300)',
                        color: 'var(--text-content-tertiary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        lineHeight: 1.5,
                      }}
                    >
                      {historyEmptyMessage}
                    </div>
                  )}
                </>
              )}
            </DropdownPanel>
          </div>
        );
      })()}
    </div>
  );
};

export default PrimarySearch;
