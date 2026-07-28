import React, { useEffect, useMemo, useRef, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import AlertDialog from '@/components/popup/AlertDialog';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Pagination from '@/components/pagination/Pagination';
import { Icon } from '@/components/icons/Icon';
import { LAB_ORDERS, LAB_STATUSES, LAB_CATEGORIES, withTestLabel } from '@/data/labOrdersPrototype';
import LabDetailPanel from '@/pages/lab/LabDetailPanel';

/* PROTOTYPE variant B — wipe me.
   Flat table + status filter tabs — closest structural match to the
   existing OPD/registration/treatment queue pages (src/pages/opd/QueuePage.jsx),
   so this variant reads as "the lab module, in the house style". Search box
   is the same <PrimarySearch> used on src/pages/opd/QueuePage.jsx (56px
   pill, suggestion dropdown, avatar pile + recent-search history), wired
   to patient/HN/test/doctor instead of queue/HN/name/doctor. Clicking a
   row (or committing a search match) opens the same detail panel as
   Variant C (result summary, normal range, trend chart, critical-value
   banner) in a split pane on the right.

   The status-filter tabs themselves are NOT rendered here — they're lifted
   to LabQueuePrototypePage and passed to QueuePageShell's `tabs` prop, same
   positioning as QueuePage.jsx's sticky tab strip (flush under the summary
   band, full width, not indented inside the card). `LAB_TABS` is exported
   so the page can wire it up; `activeTab` arrives as a prop.

   Additions per TOR ภาคผนวก ก §1.15 (ระบบงานห้องปฏิบัติการ):
     §1.15.4.10 — category action-bar filter (โลหิตวิทยา/เคมีคลินิก/
                  น้ำเหลืองวิทยา/จุลชีววิทยา/สารเสพติด), same FilterDropdown
                  widget as QueuePage.jsx's action bar.
     §1.15.4.9  — "ความเร่งด่วน" STAT badge inline on the Order cell;
                  "สิ่งส่งตรวจ" (specimen) column; "ราคา และข้อมูลยอดรวม
                  ทั้งหมด" price column + a total-of-visible-rows footer;
                  "สามารถลบข้อมูลได้" delete action per row.
     §1.15.4.6  — "ผลผิดปกติ" (abnormal, not just critical) flag, alongside
                  the existing critical flag in the same column.
     §1.15.2.4  — "ปกปิดผลการตรวจที่เป็นความลับ" — a lock glyph next to the
                  patient name flags confidential rows; the actual masking
                  happens in LabDetailPanel.

   `ROWS` (module-level) seeds `LAB_TABS`' counts AND the component's local
   `liveRows` state — deleting a row only affects the table in front of you
   (liveRows), not the sticky status-tab counts up in QueuePageShell, which
   stay computed from the original seed. Acceptable simplification for a
   throwaway prototype; a real delete would need that count lifted too. */

export const label = 'Table + status filter (house style)';

const STATUS_PILL = {
  collected:  { style: 'info',    label: 'เก็บตัวอย่างแล้ว' },
  analysing:  { style: 'warning', label: 'กำลังวิเคราะห์' },
  reported:   { style: 'success', label: 'รายงานผลแล้ว' },
};

const ROWS = LAB_ORDERS.map(withTestLabel);

/* Same pagination convention (and page size) as QueuePage.jsx's worklist. */
const PAGE_SIZE = 20;

/* Category key → Thai label, for the table column (the action-bar filter
   dropdown already has its own value/label list, CATEGORY_OPTIONS below). */
const CATEGORY_LABEL = Object.fromEntries(LAB_CATEGORIES.map((c) => [c.key, c.label]));

/* Patient avatar chip — 36px circle, same shape/size as the `Avatar` cell
   QueuePage.jsx renders in front of the patient name (Figma 3185:144272
   row rhythm). Our rows already carry `patient.avatarUrl` directly (no
   name-lookup table needed), so this falls back to the first-letter
   initial on image load failure. */
const PatientAvatar = ({ patient }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full, 9999px)',
        background: 'var(--surface-avatar-fallback, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {patient?.avatarUrl && !imgError ? (
        <img
          src={patient.avatarUrl}
          alt={patient.shortName}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        patient?.shortName?.trim().charAt(0) || '?'
      )}
    </div>
  );
};

/* localStorage key for PrimarySearch recent-search history — page-scoped,
   same convention as SEARCH_HISTORY_KEY in QueuePage.jsx. */
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:lab-queue';

/* Maps a lab order row into PrimarySearch's suggestion/history item shape
   (Figma 3345:2981 — two colorful pills + label + sublabel), mirroring
   queueRowToSearchItem in QueuePage.jsx. */
const rowToSearchItem = (row) => ({
  id: row.id,
  label: row.patient.shortName,
  sublabel: row.doctor,
  value: row.patient.shortName,
  badges: [
    { label: row.testLabel, tone: 'purple' },
    { label: row.patient.hn, tone: 'indigo' },
  ],
  avatarSrc: row.patient.avatarUrl,
});

/* TOR §1.15.4.10 category filter — FilterDropdown option shape (value/label). */
const CATEGORY_OPTIONS = [
  { value: 'all', label: 'ทุกประเภทตรวจ' },
  ...LAB_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
];

/* Status filter for the action bar — same values as the sticky LAB_TABS
   strip up in QueuePageShell; this dropdown is a second way to set the
   same `activeTab` value (see `onActiveTabChange` prop), not a separate
   filter dimension. */
const STATUS_OPTIONS = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...LAB_STATUSES.map((s) => ({ value: s.key, label: s.label })),
];

/* Urgency filter — TOR §1.15.4.9 "ความเร่งด่วน" */
const URGENCY_OPTIONS = [
  { value: 'all', label: 'ทุกระดับความเร่งด่วน' },
  { value: 'stat', label: 'STAT' },
  { value: 'routine', label: 'Routine' },
];

export const LAB_TABS = [
  { key: 'all', label: 'ทั้งหมด', icon: 'biotech', count: ROWS.length },
  ...LAB_STATUSES.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.key === 'collected' ? 'science' : s.key === 'analysing' ? 'hourglass_top' : 'check_circle',
    count: ROWS.filter((r) => r.status === s.key).length,
  })),
];

/* Function (not a plain array) because the delete action needs the
   component's `onDelete` closure — see `buildColumns(handleDelete)` below. */
const buildColumns = (onDelete) => [
  { key: 'orderId', label: 'Order', width: 104 },
  /* TOR §1.15.4.9 "ความเร่งด่วน" — own column (was inline in Order) so it
     reads as a proper field, not a decoration on the order number. */
  {
    key: 'urgency', label: 'ระดับความเร่งด่วน', width: 160,
    render: (row) => (
      row.urgency === 'stat'
        ? <Badge style='error' size='small'>STAT</Badge>
        : <Badge style='neutral' size='small'>Routine</Badge>
    ),
  },
  {
    key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
    render: (row) => (
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
        <PatientAvatar patient={row.patient} />
        <EllipsisText text={row.patient.shortName} />
        {/* Confidential result — TOR §1.15.2.4 "ปกปิดผลการตรวจที่เป็นความลับ"
            (e.g. Anti-HIV). Actual masking happens in the detail panel;
            this is just the in-table signal that a row is sensitive. */}
        {row.confidential && (
          <span
            title='ผลตรวจเป็นความลับ'
            className='shrink-0'
            style={{ color: 'var(--text-content-quaternary)' }}
          >
            <Icon name='lock' size={14} />
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'hn', label: 'HN', width: 112,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.patient.hn}
      </span>
    ),
  },
  /* VN (Visit Number) — Figma 3185:144272 cell rhythm sits next to HN,
     same convention as src/pages/opd/QueuePage.jsx's BASE_COLUMNS. */
  { key: 'vn', label: 'VN', width: 112 },
  { key: 'testLabel', label: 'รายการตรวจ', flex: true, minWidth: 220 },
  /* TOR §1.15.4.10 "ประเภทตรวจ" (category) — same source as the action-bar
     category filter (LAB_TEST_CATALOG's `category` field), shown per row
     so it's visible without having to filter. */
  {
    key: 'category', label: 'ประเภทตรวจ', width: 140,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {CATEGORY_LABEL[row.category] ?? '—'}
      </span>
    ),
  },
  /* TOR §1.15.4.9 "ชุดตรวจ" (test panel/set) — e.g. product-spec.md §10.2's
     "CBC + BUN/Cr + electrolyte panel". Blank for standalone single-test
     orders (most rows), since not every order belongs to a pre-set panel. */
  {
    key: 'panel', label: 'ชุดตรวจ', width: 320,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
        {row.panel ?? '—'}
      </span>
    ),
  },
  /* TOR §1.15.4.9 "สิ่งส่งตรวจ" (specimen type) */
  {
    key: 'specimen', label: 'สิ่งส่งตรวจ', width: 150,
    render: (row) => (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
        {row.specimen ?? '—'}
      </span>
    ),
  },
  { key: 'doctor', label: 'แพทย์สั่ง', width: 160 },
  { key: 'orderedAt', label: 'เวลาสั่ง', width: 88 },
  {
    key: 'status', label: 'สถานะ', width: 148,
    render: (row) => <Badge style={STATUS_PILL[row.status]?.style} size='small'>{STATUS_PILL[row.status]?.label}</Badge>,
  },
  /* TOR §1.15.3.2 "ค่าวิกฤต" (critical) vs §1.15.4.6 "ผลที่มีค่าผิดปกติ"
     (abnormal) — two distinct severities. Critical takes visual priority
     when both are true (critical values are always abnormal too). */
  {
    key: 'resultFlag', label: 'ผลผิดปกติ / วิกฤต', width: 160,
    render: (row) => {
      if (row.critical) {
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
            <Icon name='warning' size={16} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
              ค่าวิกฤต
            </span>
          </div>
        );
      }
      if (row.abnormal) {
        return (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-statusbadge-warning, #C2410C)' }}>
            <Icon name='error' size={16} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-medium)' }}>
              ผิดปกติ
            </span>
          </div>
        );
      }
      return null;
    },
  },
  /* TOR §1.15.4.9 "ราคา และข้อมูลยอดรวมทั้งหมด" — per-row price; the grand
     total of the currently-filtered rows is rendered as a footer line
     below the table (see LabQueueVariantB's return JSX). */
  {
    key: 'price', label: 'ราคา', width: 96,
    /* Table only natively supports align:'center'|'left' — right-align
       manually so the numbers stay scannable like a real billing column. */
    render: (row) => (
      <div className='w-full flex justify-end'>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {row.price.toLocaleString('th-TH')}
        </span>
      </div>
    ),
  },
  /* TOR §1.15.4.9 "สามารถลบข้อมูลได้" — in-memory removal only, see the
     module-doc note above about liveRows vs. the sticky tab counts. */
  {
    key: 'actions', label: 'การดำเนินการ', width: 120, sortable: false, align: 'center',
    render: (row) => (
      <NeutralSubdueIconButton
        icon='delete'
        variant='outline'
        size='sm'
        aria-label={`ลบรายการ ${row.orderId}`}
        onClick={(e) => { e.stopPropagation(); onDelete(row); }}
      />
    ),
  },
];

const matchesQuery = (row, q) => {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [row.patient.shortName, row.patient.hn, row.testLabel, row.doctor, row.orderId]
    .some((field) => String(field ?? '').toLowerCase().includes(needle));
};

/* Every header must be clickable-sortable (Table only renders the arrow
   icons / tracks `sortConfig` — it does NOT reorder rows itself, the
   caller has to). Rank maps below turn non-alphabetic columns (urgency,
   status, the combined critical/abnormal flag) into a sortable number;
   everything else sorts as text via Intl.Collator (handles Thai text AND
   numeric-looking strings like VN/HN correctly — "a-z or 1-100" either
   way). Mirrors QueuePage.jsx's `sortedRows` pattern. */
const URGENCY_RANK = { stat: 0, routine: 1 };
const STATUS_RANK = { collected: 0, analysing: 1, reported: 2 };
const severityRank = (row) => (row.critical ? 0 : row.abnormal ? 1 : 2);

const sortValue = (row, key) => {
  switch (key) {
    case 'urgency':    return URGENCY_RANK[row.urgency] ?? 9;
    case 'patient':    return row.patient.shortName;
    case 'hn':         return row.patient.hn;
    case 'category':   return CATEGORY_LABEL[row.category] ?? '';
    case 'status':     return STATUS_RANK[row.status] ?? 9;
    case 'resultFlag': return severityRank(row);
    case 'price':      return row.price ?? 0;
    default:           return row[key] ?? '';
  }
};

const COLLATOR = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });

const sortRows = (rows, sortConfig) => {
  if (!sortConfig.key) return rows;
  const sign = sortConfig.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sortConfig.key);
    const bv = sortValue(b, sortConfig.key);
    if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
    return sign * COLLATOR.compare(String(av), String(bv));
  });
};

const LabQueueVariantB = ({ activeTab = 'all', onActiveTabChange = () => {} }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [category, setCategory] = useState('all');
  const [urgency, setUrgency] = useState('all');
  const [page, setPage] = useState(1);
  /* Editable copy of ROWS — lets the delete action (TOR §1.15.4.9 "สามารถ
     ลบข้อมูลได้") actually remove a row from this table. See the module
     doc comment above for why LAB_TABS' counts stay on the static seed. */
  const [liveRows, setLiveRows] = useState(ROWS);

  /* Delete confirmation — same `deleteCandidate` pattern as QueuePage.jsx's
     row-delete flow. Holds the row pending confirmation so the popup keeps
     showing the right copy until the user confirms/cancels. */
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const handleAskDelete = (row) => setDeleteCandidate(row);
  const handleCancelDelete = () => setDeleteCandidate(null);
  const handleConfirmDelete = () => {
    if (!deleteCandidate) return;
    setLiveRows((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
    setSelectedId((prev) => (prev === deleteCandidate.id ? null : prev));
    setDeleteCandidate(null);
  };

  const columns = useMemo(() => buildColumns(handleAskDelete), []);

  /* Recent searches — same persisted-history hook QueuePage.jsx uses for
     PrimarySearch, page-scoped via SEARCH_HISTORY_KEY. */
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY);

  const filtered = useMemo(() => liveRows
    .filter((r) => activeTab === 'all' || r.status === activeTab)
    .filter((r) => category === 'all' || r.category === category)
    .filter((r) => urgency === 'all' || r.urgency === urgency)
    .filter((r) => matchesQuery(r, query)),
  [liveRows, activeTab, category, urgency, query]);

  /* Every column header is sortable — Table only tracks/display sortConfig,
     the actual reordering happens here (see sortRows() above). */
  const sorted = useMemo(() => sortRows(filtered, sortConfig), [filtered, sortConfig]);

  /* Pagination — same convention as QueuePage.jsx's worklist (Pagination
     component + "แสดง X–Y จาก N รายการ" sticky footer bar). */
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sorted.length);

  /* Jump back to page 1 whenever a filter narrows the result set, and snap
     back if the current page fell out of range (e.g. after a delete). */
  useEffect(() => { setPage(1); }, [activeTab, category, urgency, query]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const panelOpen = selectedId != null;
  /* Keep rendering the last-selected order's content while the panel
     collapses shut, instead of clearing it the instant `selectedId` goes
     null — otherwise the detail content would blank out mid-animation
     while the box is still visibly shrinking. Reading/writing a ref
     during render like this is safe (React's documented "remember info
     from previous render" pattern): it's idempotent per commit and never
     itself triggers a re-render. */
  const lastSelectedIdRef = useRef(null);
  if (selectedId != null) lastSelectedIdRef.current = selectedId;
  const selected = useMemo(
    () => liveRows.find((r) => r.id === (selectedId ?? lastSelectedIdRef.current)) ?? null,
    [liveRows, selectedId],
  );

  /* TOR §1.15.4.9 "ข้อมูลยอดรวมทั้งหมด" — total for the ONE order the doctor
     placed (all rows sharing `orderId`, e.g. a panel like CBC+Renal+
     Electrolyte ordered together as ORD-241), not the whole filtered table
     — a table-wide sum would mix line items across different patients'
     unrelated orders, which isn't what "ยอดรวม" means in §1.15.4's order-
     placement context. Shown in the detail panel, scoped to `selected`. */
  const orderSiblings = useMemo(
    () => (selected ? liveRows.filter((r) => r.orderId === selected.orderId) : []),
    [liveRows, selected],
  );
  const orderTotal = useMemo(
    () => orderSiblings.reduce((sum, r) => sum + (r.price ?? 0), 0),
    [orderSiblings],
  );

  /* Live suggestion list while typing — same field set as the table
     filter, capped at 8 to match PrimarySearch's dropdown convention. */
  const searchSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    for (const row of liveRows) {
      if (matches.length >= 8) break;
      if (matchesQuery(row, query)) matches.push(rowToSearchItem(row));
    }
    return matches;
  }, [liveRows, query]);

  const resolveSearchRow = (q, item) => {
    if (item?.id) {
      const byId = liveRows.find((row) => row.id === item.id);
      if (byId) return byId;
    }
    const needle = (q ?? item?.value ?? item?.label ?? '').toString().trim();
    if (!needle) return null;
    return liveRows.find((row) => matchesQuery(row, needle)) ?? null;
  };

  /* Recent-search avatar pile — resolves each persisted entry back to a
     lab order row and pulls the matching patient's avatar. Capped at 3. */
  const searchAvatars = useMemo(() => {
    const result = [];
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const direct = entry && typeof entry === 'object' ? entry.avatarSrc : null;
      if (direct) { result.push(direct); continue; }
      const q = typeof entry === 'string' ? entry : (entry?.value ?? entry?.label ?? '');
      const row = q ? resolveSearchRow(q, null) : null;
      if (row?.patient.avatarUrl) result.push(row.patient.avatarUrl);
    }
    return result;
  }, [searchHistory]);

  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
  ));

  return (
    <>
    <AlertDialog
      open={!!deleteCandidate}
      type='warning'
      title='ลบรายการตรวจนี้?'
      description={deleteCandidate ? `รายการตรวจ${deleteCandidate.testLabel} ของ${deleteCandidate.patient.fullName ?? deleteCandidate.patient.shortName} (HN ${deleteCandidate.patient.hn}) จะถูกลบออกจากรายการ คุณต้องการดำเนินการต่อหรือไม่` : ''}
      cancelLabel='ยกเลิก'
      confirmLabel='ลบรายการ'
      onClose={handleCancelDelete}
      onCancel={handleCancelDelete}
      onConfirm={handleConfirmDelete}
    />
    <div className='w-full flex' style={{ gap: 'var(--dim-space-400)' }}>
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-card-strong)',
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        {/* Centered Primary Search — same component/layout as
            src/pages/opd/QueuePage.jsx's search row (Figma 115:35757). */}
        <div className='w-full flex items-start justify-center'>
          <PrimarySearch
            value={query}
            onChange={setQuery}
            onSubmit={(v, item) => {
              const row = resolveSearchRow(v, item);
              pushHistory(row ? rowToSearchItem(row) : v);
              setQuery(v);
              if (row) setSelectedId(row.id);
            }}
            placeholder='ค้นหาผู้ป่วย · HN · รายการตรวจ · แพทย์ผู้สั่ง'
            width={640}
            history={searchHistory}
            onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            suggestions={searchSuggestions}
            avatars={searchAvatars}
          />
        </div>
        {/* Category action bar — TOR §1.15.4.10 "แสดงแถบข้อมูลการขอตรวจตาม
            ประเภท" (โลหิตวิทยา/น้ำเหลืองวิทยา/จุลชีววิทยา/สารเสพติด, +
            เคมีคลินิก). Same FilterDropdown widget as QueuePage.jsx's
            action bar (department/doctor/type filters); "ทุกประเภทตรวจ"
            is already the dropdown's own reset option, so the separate
            reset FilterTag pill was removed as redundant. */}
        <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          {/* Urgency filter — TOR §1.15.4.9 "ความเร่งด่วน" */}
          <FilterDropdown
            prefix='ความเร่งด่วน:'
            options={URGENCY_OPTIONS}
            value={urgency}
            onChange={setUrgency}
          />
          <FilterDropdown
            prefix='ประเภทตรวจ:'
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={setCategory}
          />
          {/* Status filter — same `activeTab` value the sticky LAB_TABS
              strip up in QueuePageShell controls, just a second way to
              set it from inside the action bar. */}
          <FilterDropdown
            prefix='สถานะ:'
            options={STATUS_OPTIONS}
            value={activeTab}
            onChange={onActiveTabChange}
          />
        </OverflowFlexRow>
        <Table
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={(row) => setSelectedId(row.id)}
          stickyColCount={2}
          emptyMessage='ไม่พบรายการตรวจที่ตรงกับการค้นหา'
        />
        {/* Pagination — same "แสดง X–Y จาก N รายการ" + <Pagination> footer
            bar as QueuePage.jsx's worklist. */}
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-200)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            แสดง {rangeStart}–{rangeEnd} จาก {sorted.length} รายการ
          </span>
          <div className='flex-1' />
          <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      </div>
      {/* Always mounted (rather than conditionally rendered) so opening /
          closing animates via a width + opacity transition instead of
          popping in and out. `pointerEvents: 'none'` while closed stops
          the invisible collapsed box from swallowing clicks. */}
      <div
        className='flex flex-col'
        aria-hidden={!panelOpen}
        style={{
          width: panelOpen ? 420 : 0,
          minWidth: 0,
          flexShrink: 0,
          opacity: panelOpen ? 1 : 0,
          pointerEvents: panelOpen ? 'auto' : 'none',
          transition: 'width 280ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms ease-out',
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-card-strong)',
          minHeight: 560,
          overflow: 'hidden',
        }}
      >
        <div style={{ width: 420 }}>
          <LabDetailPanel
            key={selected?.id}
            order={selected}
            onClose={() => setSelectedId(null)}
            orderItemCount={orderSiblings.length}
            orderTotal={orderTotal}
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default LabQueueVariantB;
