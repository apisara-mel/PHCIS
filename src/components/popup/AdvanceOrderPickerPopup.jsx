import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SecondarySearch from '@/components/search/SecondarySearch';
import TabCapsule from '@/components/tab/TabCapsule';

/* Hover affordance for the picker rows — Figma 4053:8530. The hover
   state lifts the row onto a light neutral tint so the doctor sees
   the row they're about to click. Injected once at module load
   (idempotent — re-runs in HMR replace the textContent so stale
   rules don't pile up). */
const PICKER_ROW_STYLE_ID = 'mih-advance-order-row-styles';
if (typeof document !== 'undefined') {
  const css = `
    .mih-advance-order-row { transition: background-color 120ms ease; }
    .mih-advance-order-row:hover {
      background: var(--surface-list-hover, #F4FBF8) !important;
    }
    .mih-advance-order-row:focus-visible {
      outline: none !important;
      background: var(--surface-list-hover, #F4FBF8) !important;
    }
  `;
  let el = document.getElementById(PICKER_ROW_STYLE_ID);
  if (!el) {
    el = document.createElement('style');
    el.id = PICKER_ROW_STYLE_ID;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/* MIH AdvanceOrderPickerPopup — Figma PHCIS | Appointment [Popup Large 4053:6953](https://www.figma.com/design/7zBAxKlVPzTJJY9joje5WB/PHCIS-%7C-Appointment?node-id=4053-6953)
   / 4053:5711. Filter chip row uses Tab Capsule (`variant="filter"`) per that frame;
   list + search spacing follows node `4053:6962`.

   Opens from the Step-6 "เลือกคำสั่งล่วงหน้า" Select trigger. Multi-
   select picker for the advance-order categories (Lab / Imaging /
   Vital Signs / Procedure / Medication) with three filter layers:

     • Filter pills (top)  — ทั้งหมด / Lab / Imaging / Vital Signs /
                             Procedure / อื่นๆ. "อื่นๆ" surfaces every
                             option that isn't in the four named groups
                             (currently the two Medication entries).
     • Search input        — case-insensitive substring match over the
                             label AND the badge prefix label so the
                             doctor can type "lab" or "CBC" to narrow.
     • Checkbox list       — each row carries the category prefix
                             badge + label. Picking commits to a local
                             draft Set; "ตกลง" hands the array of
                             selected ids back to the caller.

   Footer:
     • ล้างค่า — wipes the draft selection.
     • ตกลง   — calls `onConfirm(idsArray)` and closes the popup.

   Close paths (X / Escape / overlay click) discard the draft. The
   popup resets every re-open so a previous session's typing /
   tag-filter state never bleeds across opens. */

const ALL_TAG = { key: '__all',  label: 'ทั้งหมด' };
const OTHER_TAG = { key: '__other', label: 'อื่นๆ' };

/* Buckets the popup recognises as named filter pills. Anything outside
   these groups falls under "อื่นๆ". Keep the order in sync with the
   filter row above. */
const NAMED_GROUPS = [
  { key: 'lab',       label: 'Lab' },
  { key: 'imaging',   label: 'Imaging' },
  { key: 'vital',     label: 'Vital Signs' },
  { key: 'procedure', label: 'Procedure' },
];

const AdvanceOrderPickerPopup = ({
  open,
  onClose,
  onConfirm,
  options = [],
  /** Current selection (array of option ids). Default empty. */
  value = [],
  title = 'เลือกคำสั่งล่วงหน้า',
  subtitle = 'เลือกคำสั่งล่วงหน้าก่อนการพบแพทย์',
  clearLabel = 'ล้างค่า',
  confirmLabel = 'ตกลง',
  searchPlaceholder = 'Search...',
}) => {
  /* Draft selection — a Set keyed by option value. Local to the popup
     so close-without-saving discards the draft. */
  const [draft, setDraft] = useState(() => new Set(value));
  const [activeTag, setActiveTag] = useState(ALL_TAG.key);
  const [query, setQuery] = useState('');

  /* Reset every time the popup re-opens so a previous session's tag
     filter / search / draft selection doesn't bleed across opens.
     Seeds the draft from the controlled `value` prop. */
  useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setActiveTag(ALL_TAG.key);
      setQuery('');
    }
  }, [open, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((opt) => {
      /* Tag filter */
      if (activeTag === OTHER_TAG.key) {
        if (NAMED_GROUPS.some((g) => g.key === opt.group)) return false;
      } else if (activeTag !== ALL_TAG.key) {
        if (opt.group !== activeTag) return false;
      }
      /* Search filter */
      if (q) {
        const hay = `${opt.label || ''} ${opt.badge?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [options, activeTag, query]);

  const toggle = (id) => setDraft((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const handleClear = () => setDraft(new Set());
  const handleConfirm = () => {
    onConfirm?.(Array.from(draft));
    onClose?.();
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size='large'
      /* Fixed 768 px dialog height so the list area stays tall enough
         to scan ~12 rows in one viewport (Figma 4053:5711). The inner
         list owns its own scroll — see the body div below. */
      height={768}
      /* Footer CTAs stay disabled until the doctor has picked at least
         one option — nothing to clear and nothing to confirm. Re-enables
         the moment any row is checked. */
      tertiaryAction={{ label: clearLabel, onClick: handleClear, disabled: draft.size === 0 }}
      primaryAction={{ label: confirmLabel, onClick: handleConfirm, disabled: draft.size === 0 }}
      /* Figma 4053:6962 `Select Advanced order` — vertical gap space/200
         between filter row, Secondary Search, and list. */
      bodyStyle={{ gap: 'var(--dim-space-200, 8px)' }}
    >
      {/* Filter row — Figma PHCIS | Appointment Popup Large 4053:6953
          (`Select Advanced order` → "Tab + button"): Tab Capsule chips
          (40h, `surface/border/text-tabcapsule-*`), gap space/200,
          `pb` + row-gap space/300 before Secondary Search. Node 4053:5921
          from some links does not resolve in MCP; row matches this frame. */}
      <div
        className='flex w-full min-w-0 flex-wrap items-center content-center'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          rowGap: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
        }}
      >
        <div
          className='flex min-w-0 flex-1 flex-wrap items-center'
          style={{ gap: 'var(--dim-space-200, 8px)' }}
        >
          {[ALL_TAG, ...NAMED_GROUPS, OTHER_TAG].map((tag) => (
            <TabCapsule
              key={tag.key}
              variant='filter'
              label={tag.label}
              selected={activeTag === tag.key}
              onClick={() => setActiveTag(tag.key)}
            />
          ))}
        </div>
      </div>

      {/* Search input — Figma 4053:6953 body (`Secondary Search`). Aliases the
          design system's SecondarySearch component (lighter chrome
          than PrimarySearch; no suggestions / history dropdown — pure
          local filter input). The popup wants a full-width bar, so we
          override the component's default 320/maxWidth-448 cap via
          inline `style` (SecondarySearch spreads style last). */}
      <SecondarySearch
        value={query}
        onChange={(next) => setQuery(next ?? '')}
        placeholder={searchPlaceholder}
        className='w-full'
        style={{ width: '100%', maxWidth: 'none' }}
      />

      {/* Option list — Figma 4053:5711. Single column of rows; each
          row is the full-width clickable area so the doctor can tap
          anywhere along the row (badge / label / checkbox) to toggle.
          A hairline separator under each row mirrors the Figma's
          table-like cadence. */}
      <div
        role='listbox'
        aria-multiselectable
        className='flex flex-col w-full'
        style={{ gap: 0 }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 'var(--dim-space-600, 24px)',
              textAlign: 'center',
              color: 'var(--text-content-tertiary, #858C92)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            ไม่พบรายการที่ค้นหา
          </div>
        ) : (
          filtered.map((opt) => {
            const id = opt.value;
            const checked = draft.has(id);
            return (
              <button
                key={id}
                type='button'
                role='option'
                aria-selected={checked}
                onClick={() => toggle(id)}
                /* `mih-advance-order-row` is the hook for the
                   module-load stylesheet above — owns the row's hover
                   affordance (Figma 4053:8530). */
                className='mih-advance-order-row flex items-center w-full text-left'
                style={{
                  gap: 'var(--dim-space-300, 12px)',
                  padding: 'var(--dim-space-300, 12px) var(--dim-space-200, 8px)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-content-default, #4D5358)',
                  lineHeight: 1.5,
                }}
              >
                {opt.badge?.style && opt.badge?.label && (
                  /* `minWidth={72}` per Figma 4053:6962 — every badge
                     in the list reserves the same pill width so the
                     labels line up cleanly across rows. */
                  <ColorfulBadge
                    style={opt.badge.style}
                    size='small'
                    width='hug'
                    minWidth={72}
                    hierarchy='secondary'
                  >
                    {opt.badge.label}
                  </ColorfulBadge>
                )}
                <span className='flex-1 min-w-0 truncate'>{opt.label}</span>
                {/* Checkbox stops propagation so clicking it doesn't
                    double-fire when the row-level handler also runs. */}
                <Checkbox
                  checked={checked}
                  onChange={() => toggle(id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={opt.label}
                />
              </button>
            );
          })
        )}
      </div>
    </Popup>
  );
};

export default AdvanceOrderPickerPopup;
