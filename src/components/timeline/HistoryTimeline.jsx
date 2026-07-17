import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import emptyHistoryAnim from '@/assets/illustrations/disease-history.json';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';
import Popup from '@/components/popup/Popup';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';

/* MIH HistoryTimeline — Figma node 80:12916 + PHCIS OPD vitals chrome
   (e.g. 160:24874). Panel shell uses brand quaternary surface + border
   (design.md · surface.brandPrimary.quaternary / border.brandPrimary.quaternary)
   → index.css --surface-brandPrimary-quaternary, --border-brandPrimary-quaternary
   (brand-p50 / brand-p100) so switching `data-brand` retints the column.

   Tokens (design.md §4·§6):
     surface/brandPrimary/quaternary  → --surface-brandPrimary-quaternary
     border/brandPrimary/quaternary   → --border-brandPrimary-quaternary
     surface/brandPrimary/tertiary    → count pill bg (--surface-brandPrimary-tertiary)
     text/brandPrimaryButton/default  → count pill label
     text/topic/tertiary-title        → panel title
     surface/colorfulbadge/blue       → (legacy; replaced by brand pill above) */

const sampleData = [
  { time: '21:19:27', date: '6 พฤษภาคม 2569', pressure: '128/80 mmHg', temp: '36.5 °C', weight: '60 kg' },
  { time: '20:45:10', date: '6 พฤษภาคม 2569', pressure: '130/82 mmHg', temp: '36.7 °C', weight: '60 kg' },
  { time: '19:58:44', date: '6 พฤษภาคม 2569', pressure: '126/79 mmHg', temp: '36.4 °C', weight: '60 kg' },
  { time: '18:22:01', date: '6 พฤษภาคม 2569', pressure: '124/78 mmHg', temp: '36.6 °C', weight: '59.8 kg' },
  { time: '17:10:32', date: '6 พฤษภาคม 2569', pressure: '132/84 mmHg', temp: '36.8 °C', weight: '60.2 kg', badge: 'ผิดปกติ' },
  { time: '15:47:19', date: '6 พฤษภาคม 2569', pressure: '129/81 mmHg', temp: '36.5 °C', weight: '60 kg' },
  { time: '14:26:55', date: '6 พฤษภาคม 2569', pressure: '127/80 mmHg', temp: '36.3 °C', weight: '59.9 kg' },
  { time: '13:04:08', date: '6 พฤษภาคม 2569', pressure: '125/78 mmHg', temp: '36.4 °C', weight: '59.9 kg' },
  { time: '11:42:37', date: '6 พฤษภาคม 2569', pressure: '131/83 mmHg', temp: '36.7 °C', weight: '60.1 kg' },
  { time: '10:18:53', date: '6 พฤษภาคม 2569', pressure: '123/77 mmHg', temp: '36.2 °C', weight: '59.7 kg' },
  { time: '09:05:14', date: '6 พฤษภาคม 2569', pressure: '122/76 mmHg', temp: '36.1 °C', weight: '59.6 kg' },
  { time: '08:12:29', date: '6 พฤษภาคม 2569', pressure: '126/79 mmHg', temp: '36.4 °C', weight: '59.8 kg' },
];

const pad2 = (n) => String(n).padStart(2, '0');

const formatClock = (d = new Date()) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

const formatThaiBuddhistDateLong = (d = new Date()) =>
  new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

const newRowId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `hist-${Date.now()}`;

/* Common note shortcuts — covers the typical "context of measurement"
   captures that nurses use across OPD vitals workflows (rest period, drug
   timing, posture, activity). Tapping a chip fills the textarea; tapping
   the active one clears it. Free-text remains the source of truth. */
const NOTE_PRESETS = [
  'หลังพัก 15 นาที',
  'ก่อนรับยา',
  'หลังรับยา',
  'ขณะนอน',
  'ขณะนั่ง',
  'ขณะยืน',
  'หลังออกกำลัง',
];

/* Chip-style toggle — uses the same brand/neutral tokens as VitalSignTimelineCard
   so it retints when switching `<html data-brand>` modes. Selected state
   matches the Vital Sign card hover/selected: surface.brandPrimary.quaternary
   + border.brandPrimary.tertiary + text.brandPrimaryButton.default. */
const NotePresetChips = ({ value, onChange }) => {
  const trimmed = (value || '').trim();
  return (
    <div
      className='flex flex-wrap items-center'
      style={{ gap: 'var(--dim-space-300)' }}
    >
      {NOTE_PRESETS.map((preset) => {
        const active = trimmed === preset;
        return (
          <SelectableTag
            key={preset}
            size='lg'
            leadingGlyph='plus'
            label={preset}
            selected={active}
            onClick={() => onChange(active ? '' : preset)}
          />
        );
      })}
    </div>
  );
};

const toCardItem = (entry) => {
  const { time, date, pressure, temp, weight, badge, note } = entry;
  return {
    time: `เวลา ${time}`,
    date,
    badge,
    vitals: [
      { label: 'ความดัน', value: pressure },
      { label: 'อุณหภูมิ', value: temp },
      { label: 'น้ำหนัก', value: weight },
      ...(note ? [{ label: 'หมายเหตุ', value: note }] : []),
    ],
  };
};

/* Soft fade overlay at top/bottom of the timeline scroller. We can't use
   `box-shadow: inset` on the overflow container itself — the scrolling
   children paint on top of it, so the inset never shows. Instead we lay
   two pointer-events:none gradient sashes over the scroller.

   Brand-aware tint — uses --PrimaryShadow-* effect tokens (index.css §
   "Brand drop shadow primitives"). They resolve to
   `rgb(var(--brand-p600-rgb) / α)`, so when the user switches brand the
   sash retints automatically. We stack /602 (12%) over /600 (8%) for a
   slightly stronger near-edge falloff, matching --shadow-header. */
const TIMELINE_FADE_HEIGHT = 4;
const TIMELINE_FADE_TOP =
  'linear-gradient(to bottom, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';
const TIMELINE_FADE_BOTTOM =
  'linear-gradient(to top, var(--PrimaryShadow-602) 0%, var(--PrimaryShadow-600) 50%, transparent 100%)';

/* Empty-state placeholder — Figma node 293:65594 ("Empty / Step 1").
   Rendered inside the scrollable list when the timeline has zero rounds.
   Centered illustration + brand-p700 heading + tertiary quaternary
   description.

   Illustration is the Lottie animation
   `src/assets/illustrations/disease-history.json` ("Disease Report",
   Bodymovin v4.8.0, 175-frame loop) rendered via the shared
   `LottieIllustration` wrapper. The JSON is imported as data (Vite
   parses at compile time) and fed to lottie-web through
   `animationData` — synchronous, no fetch race against effect destroy.
   112 px square matches the previous Material Symbols footprint so
   surrounding text spacing is unchanged. */
const EmptyHistoryPlaceholder = () => (
  <div
    className='flex flex-1 flex-col items-center justify-center w-full text-center'
    style={{ gap: 'var(--dim-space-150, 6px)', minHeight: 0 }}
  >
    <LottieIllustration animationData={emptyHistoryAnim} size={112} />
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-brandPrimary-default, #007549)',
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        lineHeight: 1.5,
      }}
    >
      ยังไม่มีประวัติการวัด
    </p>
    <p
      style={{
        margin: 'var(--dim-space-0)',
        color: 'var(--text-content-quaternary, #ADB2B7)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
      }}
    >
      กรุณาเริ่มวัดสัญญาณชีพ
    </p>
  </div>
);

/* onRoundsChange(nextRows, { action: 'add', added }) — หลังเพิ่มรอบสำเร็จ
   onActiveRoundChange({ index, round }) — เลือกการ์ด / หลังเพิ่มรอบ / ครั้งแรกหลัง mount
   initialRows — seed the list. Default = `sampleData` (for previews).
                 Pass `[]` for the first-visit empty state (Figma 293:65594). */
const DEFAULT_SEED_ROWS = sampleData.map((row, i) => ({ ...row, id: `seed-${i}` }));

const HistoryTimeline = forwardRef(function HistoryTimeline(
  {
    onRoundsChange,
    onActiveRoundChange,
    roundDisplayOverrides = {},
    initialRows,
    /* When the parent renders Figma 332:55917 (BrandDashedAddButton
       "เพิ่มรอบการวัด" in the vitals panel), hide this duplicate outline CTA. */
    hideOutlineAddButton = false,
  },
  ref,
) {
  const [rows, setRows] = useState(() =>
    Array.isArray(initialRows) ? initialRows : DEFAULT_SEED_ROWS,
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [activeIdx, setActiveIdx] = useState(0);
  const [addRoundOpen, setAddRoundOpen] = useState(false);
  const [roundNote, setRoundNote] = useState('');

  const listScrollRef = useRef(null);
  const [listScroll, setListScroll] = useState({
    overflow: false,
    shadowTop: false,
    shadowBottom: false,
  });

  const updateListScrollShadow = useCallback(() => {
    const el = listScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight > clientHeight + 2;
    if (!overflow) {
      setListScroll({ overflow: false, shadowTop: false, shadowBottom: false });
      return;
    }
    const eps = 2;
    setListScroll({
      overflow: true,
      shadowTop: scrollTop > eps,
      shadowBottom: scrollTop < scrollHeight - clientHeight - eps,
    });
  }, []);

  useLayoutEffect(() => {
    updateListScrollShadow();
  }, [rows, updateListScrollShadow]);

  useLayoutEffect(() => {
    const el = listScrollRef.current;
    if (typeof ResizeObserver === 'undefined' || !el) return undefined;
    const ro = new ResizeObserver(() => updateListScrollShadow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateListScrollShadow]);

  const notifyActiveRound = (idx) => {
    const round = rowsRef.current[idx];
    if (round) onActiveRoundChange?.({ index: idx, round });
  };

  const onActiveRoundChangeRef = useRef(onActiveRoundChange);
  onActiveRoundChangeRef.current = onActiveRoundChange;

  useLayoutEffect(() => {
    const r = rowsRef.current[0];
    if (r) onActiveRoundChangeRef.current?.({ index: 0, round: r });
  }, []);

  const closeAddRound = () => {
    setAddRoundOpen(false);
    setRoundNote('');
  };

  useImperativeHandle(
    ref,
    () => ({
      openAddRound: () => setAddRoundOpen(true),
    }),
    [],
  );

  const handleConfirmAddRound = () => {
    const note = roundNote.trim();
    const now = new Date();
    const newRow = {
      id: newRowId(),
      time: formatClock(now),
      date: formatThaiBuddhistDateLong(now),
      pressure: '—',
      temp: '—',
      weight: '—',
      /* Fresh round → no measurements yet. VitalsForm reads this flag to
         clear all input cards and hide the "ปกติ" status badges. */
      isFresh: true,
      ...(note ? { note } : {}),
    };
    const prev = rowsRef.current;
    const next = [newRow, ...prev];
    setRows(next);
    rowsRef.current = next;
    setActiveIdx(0);
    closeAddRound();
    onRoundsChange?.(next, { action: 'add', added: newRow });
    notifyActiveRound(0);
  };

  return (
    <aside
      className='w-[320px] shrink-0 self-stretch h-[calc(100vh-220px)] rounded-xl p-6 flex flex-col gap-4'
      style={{
        background: 'var(--surface-brandPrimary-quaternary)',
        borderWidth: 'var(--dim-stroke-100)',
        borderStyle: 'solid',
        borderColor: 'var(--border-brandPrimary-quaternary)',
      }}
    >
      <div className='flex items-center gap-3 w-full'>
        <h3 className='flex-1 text-base font-bold text-token-topicTertiaryTitle'>
          ประวัติการวัด
        </h3>
        <span
          className='inline-flex items-center justify-center h-6 min-w-[40px] px-2 py-1 rounded-full text-xs font-medium'
          style={{
            background: 'var(--surface-brandPrimary-tertiary)',
            color: 'var(--text-brandprimarybutton-default)',
          }}
        >
          {rows.length} รอบ
        </span>
      </div>

      {/* "เพิ่มรอบการวัดใหม่" — Brand Button · Outline · Medium per Figma
          80:12916. self-center hugs the label width and centres horizontally
          inside the column-flex panel.

          Hidden on the first-visit empty state (Figma 293:65594) —
          clinicians fill the panel directly to create the first round,
          so the "add another round" CTA only appears once the timeline
          already has ≥ 1 entry. This keeps the empty illustration
          (`EmptyHistoryPlaceholder`) the sole focal point on first
          landing, matching the empty-state spec.

          Also hidden when `hideOutlineAddButton` — VitalsForm renders
          Figma 332:55917 (BrandDashedAddButton) in the right panel instead. */}
      {!hideOutlineAddButton && rows.length > 0 && (
        <BrandPrimaryButton
          variant='outline'
          size='md'
          leadingIcon='add'
          className='self-center'
          onClick={() => setAddRoundOpen(true)}
        >
          เพิ่มรอบการวัดใหม่
        </BrandPrimaryButton>
      )}

      {/* Figma PHCIS | OPD 333:54594 — Popup Large: Voice Textarea + shortcut
          chips (dim-space-600 stack) · footer ยกเลิก / ยืนยัน (md / 40h). */}
      <Popup
        open={addRoundOpen}
        onClose={closeAddRound}
        title='เพิ่มรอบการวัดใหม่'
        subtitle='สร้างรอบการวัดสัญญาณชีพใหม่'
        size='large'
        primaryAction={{ label: 'ยืนยัน', onClick: handleConfirmAddRound }}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeAddRound }}
      >
        <div
          className='flex w-full min-w-0 flex-col'
          style={{ gap: 'var(--dim-space-600)' }}
        >
          {/* SuggestibleTextarea in `voice` mode — surfaces the same
              NOTE_PRESETS as inline typing suggestions (minChars=1) in
              addition to the click-to-fill chips below. Honors the
              project rule that every voice textarea ships with a
              suggestion popover. */}
          <div className='flex w-full min-w-0 flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <SuggestibleTextarea
              voice
              label='หมายเหตุ (ถ้ามี)'
              value={roundNote}
              onChange={(e) => setRoundNote(e?.target?.value ?? '')}
              suggestions={NOTE_PRESETS}
              minChars={1}
              popoverAriaLabel='คำแนะนำหมายเหตุรอบการวัด'
            />
            <span style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}>
              ใช้เพื่อเตือนความจำสำหรับรอบการวัดนี้
            </span>
          </div>
          <NotePresetChips value={roundNote} onChange={setRoundNote} />
        </div>
      </Popup>

      <div className='relative min-h-0 flex-1'>
        <div
          ref={listScrollRef}
          className='absolute inset-0 flex flex-col gap-2 overflow-y-auto scrollbar-thin pr-1'
          onScroll={updateListScrollShadow}
        >
          {rows.length === 0 && <EmptyHistoryPlaceholder />}
          {rows.map((row, i) => (
            <VitalSignTimelineCard
              key={row.id}
              {...toCardItem({ ...row, ...(roundDisplayOverrides[row.id] || {}) })}
              selected={i === activeIdx}
              onClick={() => {
                setActiveIdx(i);
                notifyActiveRound(i);
              }}
            />
          ))}
        </div>

        {/* Top/bottom fade — toggled by scroll position. pointer-events:none
            so it never blocks card clicks; sits above scrolling cards via
            absolute positioning on the static wrapper. */}
        <div
          aria-hidden
          className='pointer-events-none absolute left-0 right-0 top-0 transition-opacity duration-150'
          style={{
            height: TIMELINE_FADE_HEIGHT,
            background: TIMELINE_FADE_TOP,
            opacity: listScroll.overflow && listScroll.shadowTop ? 1 : 0,
            borderTopLeftRadius: 'inherit',
            borderTopRightRadius: 'inherit',
          }}
        />
        <div
          aria-hidden
          className='pointer-events-none absolute left-0 right-0 bottom-0 transition-opacity duration-150'
          style={{
            height: TIMELINE_FADE_HEIGHT,
            background: TIMELINE_FADE_BOTTOM,
            opacity: listScroll.overflow && listScroll.shadowBottom ? 1 : 0,
            borderBottomLeftRadius: 'inherit',
            borderBottomRightRadius: 'inherit',
          }}
        />
      </div>
    </aside>
  );
});

export default HistoryTimeline;
