import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Checkbox from '@/components/checkbox/Checkbox';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import TabPill from '@/components/tab/TabPill';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import {
  XRAY_EXAMS, XRAY_EXAM_BY_ID, XRAY_MODALITIES, XRAY_BODY_REGIONS,
  XRAY_EXAM_SETS, XRAY_VIEWS, getRegion,
  claimFor, summariseSelection, duplicateWarning,
} from '@/data/xrayCatalog';

/* "เลือกรายการตรวจทางรังสีวิทยา" — the X-ray order-entry control. Sibling of
   LabOrderPicker, but the domain changes two things on purpose:

     • เงินแยกตามสิทธิ (TOR §1.12.4.2) — a lab test costs what it costs; an
       X-ray exam reimburses differently per สิทธิ (UCS/SSS/OFC/BMA/CASH),
       so every row shows ราคา + เบิกได้ + ผู้ป่วยจ่าย resolved through
       `claimFor(exam, rightKey)` instead of a flat price.
     • การเตือนสั่งซ้ำแรงกว่า Lab (TOR §1.12.5.9) — repeating a blood draw
       wastes a tube; repeating a radiograph RE-IRRADIATES the patient.
       `duplicateWarning` therefore returns `level: 'block'` for a repeat
       inside ~10% of the window (e.g. a second CXR within 3 days) and this
       picker REFUSES that add outright — a dismissible banner is not
       enough when the cost is radiation dose, not money.

   Mounted two ways (`variant`):
     'popup'    (default) — wrapped in <Popup>, used by XrayOrderPage.
     'embedded' — bare control, for Treatment Step (CPOE) mounting it
                  inside its own form. No router hooks, no navigation —
                  the host page owns everything around it.               */

/* ── Browser-chrome strip for the search input ──────────────────────────
   CLAUDE.md "No browser-default input chrome": the wrapper below owns the
   border, so the native <input> must be completely chrome-free or Webkit
   paints thin vertical edges at its left/right boundary. Injected once at
   module load, idempotent across HMR (same pattern as AISearch.jsx).
   The caret stays VISIBLE deliberately — this is a type-to-filter search
   and, like AISearch/PrimarySearch, the user needs to see where the
   cursor sits while composing a query. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-xraypicker-style';
  const css = `
.mih-xraypicker-input::placeholder { color: var(--text-primarysearch-default, #ADB2B7); opacity: 1; }
.mih-xraypicker-input,
.mih-xraypicker-input:focus,
.mih-xraypicker-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
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

const VIEW_BY_KEY = Object.fromEntries(XRAY_VIEWS.map((v) => [v.key, v]));
const viewCodes = (exam) => (exam.views ?? []).map((k) => VIEW_BY_KEY[k]?.code ?? k).join('/');

const baht = (n) => (n ?? 0).toLocaleString('th-TH');

/* Groups render in XRAY_MODALITIES order and only when they hold a match —
   mirrors LabOrderPicker's orderedGroups so both order screens read the
   same way (group header = the same vocabulary as the worklist column). */
const orderedGroups = (exams) => XRAY_MODALITIES
  .map((m) => ({ modality: m, items: exams.filter((e) => e.modality === m.key) }))
  .filter((g) => g.items.length > 0);

/* รายการที่ใช้บ่อย — the exams a ศบส. orders daily (CXR, ช่องท้อง/KUB,
   กระดูกสันหลังส่วนเอว, อัลตราซาวด์ช่องท้อง). Pinned as an extra group at
   the top of the unfiltered list so the 90% case never scrolls; the full
   catalog still renders below — nothing is hidden, only duplicated up. */
const FREQUENT_EXAM_IDS = [
  'xr-cxr-pa', 'xr-cxr-palat', 'xr-kub', 'xr-acute-abd',
  'xr-lsspine', 'us-upper-abd', 'us-whole-abd',
];

const XrayOrderPicker = ({
  /* examIds[] — controlled when provided; otherwise the picker keeps its
     own selection (same dual contract as LabOrderPicker so CPOE can use
     either style). */
  value,
  onChange,
  /* Patient context — only used for display (ชื่อ in the summary line) and
     the femaleScreening hint; the host page owns the actual clinical
     gating (pregnancy block, allergy alert). */
  patient = null,
  /* สิทธิการรักษา key (UCS/SSS/OFC/BMA/CASH) — drives ราคา/เบิกได้/จ่ายเอง
     on every row and in the summary (TOR §1.12.4.2 / §1.12.5.4). */
  rightKey = 'CASH',
  /* Prior imaging for THIS patient — [{ examId, daysAgo, resultSummary }]
     from `xrayHistoryFor(hn)` (TOR §1.12.5.9). */
  history = [],
  variant = 'popup',
  open = false,
  onClose,
  disabled = false,
}) => {
  const [internal, setInternal] = useState([]);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;

  const [tab, setTab] = useState('exams'); /* 'exams' | 'sets' — legacy §2.1 item 7 ชุดรายการตรวจ */
  const [query, setQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  /* The last refused (level 'block') add — surfaced as a destructive
     banner with the reason + days-ago so the refusal is explained, never
     silent (TOR §1.12.5.9). */
  const [blockNotice, setBlockNotice] = useState(null);

  const setSelected = (next) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  /* Retired exams stay in the catalog so old orders resolve, but must not
     be orderable — same soft-delete contract as the lab picker. */
  const orderable = useMemo(() => XRAY_EXAMS.filter((e) => !e.retired), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderable.filter((e) => {
      if (modalityFilter !== 'all' && e.modality !== modalityFilter) return false;
      if (regionFilter !== 'all' && e.region !== regionFilter) return false;
      if (!q) return true;
      return e.name.toLowerCase().includes(q)
        || e.nameEn.toLowerCase().includes(q)
        || e.code.toLowerCase().includes(q);
    });
  }, [orderable, query, modalityFilter, regionFilter]);

  const groups = useMemo(() => orderedGroups(filtered), [filtered]);

  /* The pinned frequent group shows only on the untouched list — a query
     or filter means the user is already navigating, so pinning would
     just shove their results down. */
  const showFrequent = tab === 'exams' && !query.trim() && modalityFilter === 'all' && regionFilter === 'all';
  const frequentExams = useMemo(
    () => (showFrequent ? FREQUENT_EXAM_IDS.map((id) => XRAY_EXAM_BY_ID[id]).filter((e) => e && !e.retired) : []),
    [showFrequent],
  );

  /* ── Keyboard model (exams tab) ─────────────────────────────────────
     One flat list in visual order (frequent group first, then the
     modality groups); ArrowUp/Down move a highlighted row, Enter toggles
     it, Esc closes (the host <Popup> already listens). rowKey — not exam
     id — keys the highlight because frequent rows duplicate ids. */
  const flatEntries = useMemo(() => {
    if (tab !== 'exams') return [];
    return [
      ...frequentExams.map((exam) => ({ rowKey: `freq-${exam.id}`, exam })),
      ...groups.flatMap(({ items }) => items.map((exam) => ({ rowKey: `main-${exam.id}`, exam }))),
    ];
  }, [tab, frequentExams, groups]);

  const [highlight, setHighlight] = useState(-1);
  const rowRefs = useRef({});
  useEffect(() => { setHighlight(-1); }, [query, modalityFilter, regionFilter, tab, open]);
  useEffect(() => {
    const entry = flatEntries[highlight];
    if (!entry) return;
    const el = rowRefs.current[entry.rowKey];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [highlight, flatEntries]);

  const handleListKeyDown = (e) => {
    if (tab !== 'exams' || flatEntries.length === 0) return;
    const t = e.target instanceof Element ? e.target : null;
    /* Never hijack a control that owns the key natively: selects and
       checkboxes keep their arrows/space, buttons keep Enter. Only the
       search field (the stated home of this flow) and non-interactive
       targets drive the list cursor. */
    if (t && t.closest('select, textarea') ) return;
    if (t && t.matches('input') && !t.classList.contains('mih-xraypicker-input')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, flatEntries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (t && t.closest('button, a')) return; /* Enter = activate, not toggle */
      const entry = flatEntries[highlight];
      if (entry) {
        e.preventDefault();
        toggle(entry.exam.id);
      }
    }
  };

  /* ── Focus management (popup variant only) ──────────────────────────
     Open → remember the trigger, start focus in the search field, and
     trap Tab inside the dialog (header ✕ + footer buttons included, via
     the .mih-popup-dialog ancestor). Close → hand focus back to the
     trigger (WCAG 2.4.3 focus order / no keyboard trap the user can't
     leave — Esc always exits through the host Popup). */
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const returnFocusRef = useRef(null);
  useEffect(() => {
    if (variant !== 'popup' || !open) return undefined;
    returnFocusRef.current = document.activeElement;
    const focusTimer = setTimeout(() => {
      if (searchRef.current) searchRef.current.focus();
    }, 80); /* after the modal enter motion mounts the input */
    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const dialog = (rootRef.current && rootRef.current.closest('.mih-popup-dialog')) || rootRef.current;
      if (!dialog) return;
      const focusables = Array.from(dialog.querySelectorAll(
        "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
      )).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !dialog.contains(active)) { e.preventDefault(); last.focus(); }
      } else if (active === last || !dialog.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      const prev = returnFocusRef.current;
      if (prev && typeof prev.focus === 'function' && document.contains(prev)) prev.focus();
    };
  }, [open, variant]);

  /* Repeat warnings resolved once per render for every orderable exam so
     the inline note, the disabled state, and the roll-up all agree. */
  const warnings = useMemo(() => {
    const map = {};
    orderable.forEach((e) => {
      const w = duplicateWarning(e.id, history);
      if (w) map[e.id] = w;
    });
    return map;
  }, [orderable, history]);

  const summary = useMemo(() => summariseSelection(selected, rightKey), [selected, rightKey]);
  const selectedWarns = selected.filter((id) => warnings[id]?.level === 'warn');
  const selectedReferrals = selected.filter((id) => XRAY_EXAM_BY_ID[id]?.referralOnly);

  /* Single gate every add path goes through — checkbox, ชุดรายการตรวจ,
     everything. 'block' refuses with the reason; 'warn' lets the add
     through (the banner + inline note inform, the host page rolls them
     up). Removing is always allowed. */
  const toggle = (id) => {
    if (disabled) return;
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      return;
    }
    const w = warnings[id];
    if (w?.level === 'block') {
      setBlockNotice({ examId: id, warning: w });
      return;
    }
    setBlockNotice(null);
    setSelected([...selected, id]);
  };

  /* ชุดรายการตรวจ — expands the set, still per-member gated: blocked
     members are refused (with the banner naming them) while the rest of
     the set is added, so one recent CXR doesn't kill the whole ชุด. */
  const addSet = (set) => {
    if (disabled) return;
    const additions = [];
    const refused = [];
    set.examIds.forEach((id) => {
      if (selected.includes(id)) return;
      const w = warnings[id];
      if (w?.level === 'block') refused.push({ examId: id, warning: w });
      else additions.push(id);
    });
    if (additions.length > 0) setSelected([...selected, ...additions]);
    setBlockNotice(refused.length > 0 ? refused[0] : null);
  };

  /* ── Search + filter head ─────────────────────────────────────────── */
  const head = (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {/* Tab row — รายการเดี่ยว vs ชุดรายการตรวจ (legacy §2.1 item 7). */}
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }} role='tablist'>
        <TabPill selected={tab === 'exams'} onClick={() => setTab('exams')} leadingIcon='radiology'>
          รายการตรวจ
        </TabPill>
        <TabPill selected={tab === 'sets'} onClick={() => setTab('sets')} leadingIcon='library_add'>
          ชุดรายการตรวจ
        </TabPill>
      </div>

      {tab === 'exams' && (
        <>
          {/* Search — ค้นหาจากชื่อไทย / ชื่ออังกฤษ / รหัส (legacy §2.1 item 5
              typed one letter into a look-up; here it's live filtering). The
              wrapper owns the border; the input is chrome-stripped above. */}
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              background: 'var(--surface-input-default)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              paddingTop: 'var(--dim-space-150, 6px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-150, 6px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
            }}
          >
            <Icon name='search' size={18} style={{ color: 'var(--text-content-tertiary)' }} aria-hidden />
            <input
              ref={searchRef}
              type='text'
              className='mih-xraypicker-input flex-1 min-w-0'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label='ค้นหารายการตรวจ (ชื่อไทย ชื่ออังกฤษ หรือรหัส)'
              placeholder='ค้นหาชื่อรายการตรวจ / ชื่ออังกฤษ / รหัส เช่น CXR, X000001'
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            />
            {query && (
              <button
                type='button'
                onClick={() => setQuery('')}
                aria-label='ล้างคำค้นหา'
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
              >
                <Icon name='close' size={16} style={{ color: 'var(--text-content-tertiary)' }} />
              </button>
            )}
          </div>

          {/* Modality pills + region select — the two grouping axes the TOR
              order table needs (§1.12.5.4 ตำแหน่งที่ตรวจ is a first-class
              column, so it is a first-class filter here too). */}
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <TabPill size='small' selected={modalityFilter === 'all'} onClick={() => setModalityFilter('all')}>
              ทุกประเภท
            </TabPill>
            {XRAY_MODALITIES.map((m) => (
              <TabPill
                key={m.key}
                size='small'
                selected={modalityFilter === m.key}
                onClick={() => setModalityFilter(m.key)}
                leadingIcon={m.icon}
              >
                {m.thai}
              </TabPill>
            ))}
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              aria-label='กรองตามตำแหน่งที่ตรวจ'
              style={{
                marginLeft: 'auto',
                paddingTop: 'var(--dim-space-100, 4px)',
                paddingRight: 'var(--dim-space-200, 8px)',
                paddingBottom: 'var(--dim-space-100, 4px)',
                paddingLeft: 'var(--dim-space-200, 8px)',
                background: 'var(--surface-input-default)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-secondary)',
                outline: 'none',
              }}
            >
              <option value='all'>ทุกตำแหน่ง</option>
              {XRAY_BODY_REGIONS.map((r) => (
                <option key={r.key} value={r.key}>{r.thai}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* The refused-add banner — TOR §1.12.5.9 'block': the reason and the
          days-ago must be shown, because "the computer said no" without the
          dose rationale teaches users to distrust the gate. */}
      {blockNotice && (
        <Alert
          type='destructive'
          iconName='block'
          title='ไม่สามารถเพิ่มรายการได้ — สั่งซ้ำเร็วเกินไป'
          subtext={`${blockNotice.warning.message} · ${XRAY_EXAM_BY_ID[blockNotice.examId]?.name ?? ''} ตรวจล่าสุด ${blockNotice.warning.daysAgo} วันก่อน (เกณฑ์ ${blockNotice.warning.windowDays} วัน)${blockNotice.warning.resultSummary ? ` · ผลเดิม: ${blockNotice.warning.resultSummary}` : ''} — ผู้ป่วยจะได้รับปริมาณรังสีซ้ำโดยไม่จำเป็น หากจำเป็นทางคลินิกให้ปรึกษารังสีแพทย์`}
          showBadge={false}
          showIndicator={false}
          showDetail={false}
          onClose={() => setBlockNotice(null)}
        />
      )}
    </div>
  );

  /* ── One exam row ─────────────────────────────────────────────────── */
  const renderExamRow = (exam, rowKey = `main-${exam.id}`) => {
    const isSelected = selected.includes(exam.id);
    const warning = warnings[exam.id];
    const blocked = warning?.level === 'block' && !isSelected;
    const { price, claim, patientPay } = claimFor(exam, rightKey);
    const region = getRegion(exam);
    const views = viewCodes(exam);
    const highlighted = flatEntries[highlight]?.rowKey === rowKey;

    return (
      <div
        key={rowKey}
        ref={(el) => { rowRefs.current[rowKey] = el; }}
        className='flex flex-col w-full min-w-0'
        /* Whole-row click toggles (bigger target than the 16px box); real
           controls inside keep their own behaviour. Blocked rows route
           through the same gate, so the refusal banner still explains. */
        onClick={(e) => {
          if (disabled) return;
          const t = e.target instanceof Element ? e.target : null;
          if (t && t.closest('label, button, a, input, select')) return;
          toggle(exam.id);
        }}
        style={{
          borderRadius: 'var(--dim-radius-300, 10px)',
          border: `var(--dim-stroke-100, 1px) solid ${isSelected ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-quaternary)'}`,
          background: isSelected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
          opacity: blocked ? 0.72 : 1,
          cursor: disabled ? 'default' : 'pointer',
          /* Keyboard highlight — the arrow-key cursor. */
          outline: highlighted ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default)' : 'none',
          outlineOffset: 'var(--dim-space-050, 2px)',
          /* Inline `padding:` shorthand carrying var() is dropped by CSSOM
             in React — longhand only. */
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
        }}
      >
        <div className='flex items-start w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {/* The sr-only label rides INSIDE the Checkbox's <label>, which
              is what actually names the hidden native input (name-from-
              content) — an aria-label prop would land on the label element
              and never reach the input (WCAG 4.1.2). */}
          <Checkbox
            checked={isSelected}
            onChange={() => toggle(exam.id)}
            disabled={disabled || blocked}
            label={<span className='sr-only'>{`เลือก ${exam.name} (${exam.nameEn})`}</span>}
          />
          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {/* Name row + attribute badges. referralOnly = สั่งได้จาก ศบส.
                แต่ไปตรวจที่ รพ. (พิมพ์ใบส่งต่อ), contrast + femaleScreening
                = the §1.12.5.3 screening blocks the host page must ask. */}
            <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontWeight: 'var(--type-weight-medium)',
                  fontSize: 'var(--type-size-sm)',
                  color: 'var(--text-content-default)',
                }}
              >
                {exam.name}
              </span>
              {exam.referralOnly && <Badge style='info' size='small' icon='send'>ส่งตรวจภายนอก</Badge>}
              {exam.contrast && <Badge style='warning' size='small' icon='water_drop'>สารทึบรังสี</Badge>}
              {exam.femaleScreening && <Badge style='yellow' size='small' icon='female'>ซักประวัติตั้งครรภ์</Badge>}
            </div>

            {/* Identity line — code + English name + region + views, the
                same fields the worklist columns show (§1.12.5.4). */}
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-tertiary)',
              }}
            >
              {exam.code} · {exam.nameEn}
              {region ? ` · ${region.thai}` : ''}
              {views ? ` · ท่าถ่าย ${views}` : ''}
            </span>

            {/* เงินตามสิทธิ — §1.12.4.2: price is flat, reimbursement is
                per-right; ผู้ป่วยจ่าย > 0 is exactly the partial-claim case
                the reviewers probe (e.g. US under UCS/SSS). */}
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                color: 'var(--text-content-secondary)',
              }}
            >
              {baht(price)} บาท · เบิกได้ {baht(claim)} บาท
              {patientPay > 0 ? ` · ผู้ป่วยจ่ายส่วนต่าง ${baht(patientPay)} บาท` : ''}
            </span>

            {/* การเตรียมตัว — printed on ใบนัดตรวจรังสี (legacy §2.1 item 11);
                shown here so the orderer can brief the patient at the desk. */}
            {exam.prep && (
              <span
                className='inline-flex items-start'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  color: 'var(--text-content-tertiary)',
                }}
              >
                <span className='shrink-0' style={{ marginTop: 'var(--dim-space-050, 2px)' }}>
                  <Icon name='info' size={14} />
                </span>
                <span>เตรียมตัว: {exam.prep}</span>
              </span>
            )}

            {/* §1.12.5.9 — inline on the option itself, as a filled strip
                so it cannot be scanned past: icon + tinted surface + text
                (never colour alone — WCAG 1.4.1). 'warn' informs; 'block'
                explains the refusal (days-ago vs window) right where it
                happened. */}
            {warning && (
              <span
                className='flex items-start w-full'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  marginTop: 'var(--dim-space-100, 4px)',
                  background: warning.level === 'block'
                    ? 'var(--surface-alert-error)'
                    : 'var(--surface-alert-warning)',
                  border: `var(--dim-stroke-100, 1px) solid ${warning.level === 'block'
                    ? 'var(--border-alert-error)'
                    : 'var(--border-alert-warning)'}`,
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  paddingTop: 'var(--dim-space-150, 6px)',
                  paddingRight: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-150, 6px)',
                  paddingLeft: 'var(--dim-space-200, 8px)',
                  color: warning.level === 'block'
                    ? 'var(--text-alert-error)'
                    : 'var(--text-alert-warning)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                }}
              >
                <span className='shrink-0' style={{ marginTop: 'var(--dim-space-050, 2px)' }} aria-hidden>
                  <Icon name={warning.level === 'block' ? 'block' : 'content_copy'} size={14} />
                </span>
                <span>
                  {warning.level === 'block' ? 'สั่งซ้ำไม่ได้ — ' : 'เพิ่งตรวจไปไม่นาน — '}
                  {warning.message}
                  {` (ตรวจล่าสุด ${warning.daysAgo} วันก่อน · เกณฑ์ ${warning.windowDays} วัน)`}
                  {warning.resultSummary ? ` — ผลเดิม: ${warning.resultSummary}` : ''}
                  {warning.level === 'block'
                    ? ' · ระบบไม่อนุญาตให้สั่งซ้ำ (ป้องกันการรับรังสีซ้ำ)'
                    : ''}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── ชุดรายการตรวจ tab ────────────────────────────────────────────── */
  const renderSets = () => (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {XRAY_EXAM_SETS.map((set) => {
        const members = set.examIds.map((id) => XRAY_EXAM_BY_ID[id]).filter(Boolean);
        const setTotal = members.reduce((sum, e) => sum + (e.price ?? 0), 0);
        const allIn = set.examIds.every((id) => selected.includes(id));
        return (
          <div
            key={set.id}
            className='flex items-start w-full min-w-0'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: `var(--dim-stroke-100, 1px) solid ${allIn ? 'var(--border-brandPrimary-default)' : 'var(--border-neutral-quaternary)'}`,
              background: allIn ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
            }}
          >
            <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontWeight: 'var(--type-weight-medium)',
                    fontSize: 'var(--type-size-sm)',
                    color: 'var(--text-content-default)',
                  }}
                >
                  {set.name}
                </span>
                <Badge style='info' size='small'>{members.length} รายการ</Badge>
              </div>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  color: 'var(--text-content-tertiary)',
                }}
              >
                {members.map((e) => e.name).join(' · ')} · รวม {baht(setTotal)} บาท
              </span>
              {/* Per-member repeat notes surface here too, so the ชุด tab
                  never hides what the รายการ tab would have warned about. */}
              {set.examIds.filter((id) => warnings[id]).map((id) => (
                <span
                  key={id}
                  style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                    fontWeight: 'var(--type-weight-medium)',
                    color: warnings[id].level === 'block'
                      ? 'var(--text-statusbadge-error, #B91C1C)'
                      : 'var(--text-statusbadge-warning, #C2410C)',
                  }}
                >
                  {warnings[id].message}
                </span>
              ))}
            </div>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={allIn ? 'check' : 'add'}
              disabled={disabled || allIn}
              onClick={() => addSet(set)}
            >
              {allIn ? 'เพิ่มแล้ว' : 'เพิ่มชุดนี้'}
            </BrandSubdueButton>
          </div>
        );
      })}
    </div>
  );

  /* ── Sticky impact summary — §1.12.5.4 "ข้อมูลยอดรวมทั้งหมด" ───────── */
  const footer = (
    <div
      className='flex flex-col w-full'
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'var(--surface-card-200)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
        boxShadow: 'var(--shadow-card)',
        paddingTop: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        gap: 'var(--dim-space-200, 8px)',
      }}
    >
      {summary.count === 0 ? (
        <span aria-live='polite' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
          ยังไม่ได้เลือกรายการตรวจ · ใช้ปุ่มลูกศร ↑↓ เลื่อน กด Enter เพื่อเลือก
        </span>
      ) : (
        <>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontWeight: 'var(--type-weight-medium)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-default)',
              }}
            >
              เลือกแล้ว {summary.count} รายการ
            </span>
            {/* byModality — how many rooms the visit touches (เอกซเรย์ 2 ·
                อัลตราซาวด์ 1), the radiographer's room-planning line. */}
            {summary.byModality.map((m) => (
              <Badge key={m.key} style='neutral' size='small'>{m.thai} {m.count}</Badge>
            ))}
            {selectedReferrals.length > 0 && (
              <Badge style='info' size='small' icon='send'>ส่งตรวจภายนอก {selectedReferrals.length}</Badge>
            )}
          </div>
          {/* Running totals live in the footer so the user never closes
              the picker just to see money; aria-live keeps SR users
              current as rows toggle. */}
          <span aria-live='polite' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
            เลือกแล้ว {summary.count} รายการ · รวม {baht(summary.total)} บาท · เบิกได้ {baht(summary.claimTotal)} บาท · ผู้ป่วยจ่าย {baht(summary.patientPay)} บาท
            {patient ? ` · ${patient.shortName ?? patient.fullName ?? ''}` : ''}
          </span>
          {selectedWarns.length > 0 && (
            <Alert
              type='warning'
              iconName='content_copy'
              title={`มี ${selectedWarns.length} รายการที่เพิ่งตรวจไปไม่นาน`}
              subtext={selectedWarns
                .map((id) => `${XRAY_EXAM_BY_ID[id]?.name ?? id} (${warnings[id].daysAgo} วันก่อน · เกณฑ์ ${warnings[id].windowDays} วัน)`)
                .join(' · ')}
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          )}
        </>
      )}
    </div>
  );

  /* Group header for the pinned frequent list — same layout language as
     the modality headers below so the list reads as one system. */
  const frequentHeader = (
    <div
      className='flex items-center'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-150, 6px)',
        borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
      }}
    >
      <Icon name='star' size={16} style={{ color: 'var(--text-brandPrimary-default)' }} aria-hidden />
      <span
        style={{
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-default)',
        }}
      >
        รายการที่ใช้บ่อย
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        รายการเดิมทั้งหมดยังอยู่ตามกลุ่มด้านล่าง
      </span>
    </div>
  );

  const highlightedEntry = flatEntries[highlight] ?? null;

  const body = (
    <div
      ref={rootRef}
      className='flex flex-col w-full min-w-0'
      style={{ gap: 'var(--dim-space-400, 16px)' }}
      onKeyDown={handleListKeyDown}
    >
      {/* SR announcement of the arrow-key cursor — the highlight is
          otherwise purely visual. */}
      <span className='sr-only' aria-live='polite'>
        {highlightedEntry
          ? `${highlightedEntry.exam.name} — ${selected.includes(highlightedEntry.exam.id) ? 'เลือกแล้ว กด Enter เพื่อเอาออก' : 'กด Enter เพื่อเลือก'}`
          : ''}
      </span>
      {head}
      {tab === 'sets' ? renderSets() : (
        groups.length === 0 ? (
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              color: 'var(--text-content-tertiary)',
              paddingTop: 'var(--dim-space-400, 16px)',
              paddingBottom: 'var(--dim-space-400, 16px)',
              textAlign: 'center',
            }}
          >
            ไม่พบรายการตรวจที่ตรงกับคำค้นหา
          </span>
        ) : (
          <>
          {frequentExams.length > 0 && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {frequentHeader}
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {frequentExams.map((exam) => renderExamRow(exam, `freq-${exam.id}`))}
              </div>
            </div>
          )}
          {groups.map(({ modality, items }) => (
            <div key={modality.key} className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {/* Group header — modality Thai name + code, same vocabulary
                  as the worklist's ประเภทงานรังสี column. */}
              <div
                className='flex items-center'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-150, 6px)',
                  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                }}
              >
                <Icon name={modality.icon} size={16} style={{ color: 'var(--text-brandPrimary-default)' }} />
                <span
                  style={{
                    fontFamily: 'var(--type-family-heading-content)',
                    fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                    fontSize: 'var(--type-size-sm)',
                    color: 'var(--text-content-default)',
                  }}
                >
                  {modality.thai}
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  {modality.code}
                </span>
                {modality.referralOnly && <Badge style='info' size='small'>ส่งตรวจภายนอกทั้งกลุ่ม</Badge>}
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {items.map((exam) => renderExamRow(exam, `main-${exam.id}`))}
              </div>
            </div>
          ))}
          </>
        )
      )}
      {footer}
    </div>
  );

  /* 'embedded' — CPOE (Treatment Step) mounts the bare control inside its
     own form; no popup chrome, no navigation, host owns submit. */
  if (variant === 'embedded') return body;

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เลือกรายการตรวจทางรังสีวิทยา'
      subtitle='ค้นหา เลือกจากชุดรายการตรวจ หรือกรองตามประเภทงานรังสีและตำแหน่งที่ตรวจ'
      width={760}
      primaryAction={{
        label: summary.count > 0 ? `ตกลง (${summary.count} รายการ)` : 'ตกลง',
        onClick: onClose,
      }}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {body}
    </Popup>
  );
};

export default XrayOrderPicker;
