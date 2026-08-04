import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import TelemedicineQueueBadge from '@/components/telemed/TelemedicineQueueBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Table, { EllipsisText as TableEllipsisText } from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { PATIENT_PROFILES, getPatientByHN } from '@/data/patientProfiles';
import {
  TREATMENT_QUEUE_ROWS,
  TREATMENT_STATUS_SORT_ORDER,
  compareTreatmentQueueRows,
} from '@/data/treatmentQueue';
import { buildTreatmentSearchHistorySeed } from '@/data/primarySearchHistorySeeds';

/* MIH TreatmentQueuePage — Figma PHCIS-ALL node 2760:140031.
   ระบบบันทึกการรักษา · คิวตรวจรักษาทั่วไป (OPD).
   Summary cards (6, value+label only) · TabUnderline (5 tabs) · PrimarySearch ·
   filter chips · 12-column queue table with ColorfulBadge status pills and
   BrandIconButton + ยกเลิก actions. All colours alias design.md tokens. */

/* Figma PHCIS-ALL 2624:122782 — Level-3 breadcrumb in Header. */
const breadcrumb = ['ระบบบันทึกการรักษา', 'ตรวจรักษาทั่วไป (OPD)'];
const SUMMARY_TITLE = 'คิวตรวจรักษาทั่วไป (OPD)';

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:treatment-queue';

const TREATMENT_SEARCH_HISTORY_SEED = buildTreatmentSearchHistorySeed(TREATMENT_QUEUE_ROWS);
const PAGE_SIZE = 20;

/* Per Figma 2760:140031 — 6 cards, no trend indicator. */
const SUMMARY_CARDS = [
  { key: 'total',    label: 'คิวทั้งหมดวันนี้', value: 8,  color: 'info',       icon: 'directions_walk' },
  { key: 'waiting',  label: 'รอตรวจ',           value: 2,  color: 'info',       icon: 'hourglass_top'   },
  { key: 'progress', label: 'กำลังตรวจ',         value: 2,  color: 'info',       icon: 'stethoscope'     },
  { key: 'done',     label: 'เสร็จแล้ว',         value: 2,  color: 'positive',   icon: 'check_circle'    },
  { key: 'urgent',   label: 'เร่งด่วน',          value: 0,  color: 'inprogress', icon: 'fast_forward'    },
  { key: 'avgwait',  label: 'นาทีรอเฉลี่ย',      value: 34, color: 'positive',   icon: 'schedule'        },
];

const TABS = [
  { key: 'all',      label: 'ทั้งหมด',          icon: 'group',         count: 8 },
  { key: 'waiting',  label: 'รอตรวจ',           icon: 'schedule',      count: 2 },
  { key: 'progress', label: 'กำลังตรวจ',         icon: 'assignment',    count: 2 },
  { key: 'done',     label: 'ตรวจเสร็จแล้ว',     icon: 'check_circle',  count: 2 },
  { key: 'draft',    label: 'ที่ร่างไว้',         icon: 'save',          count: 2 },
];

const TAB_STATUS_FILTER = {
  waiting:  (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done:     (r) => r.statusKey === 'done',
  draft:    (r) => r.statusKey === 'draft',
};

const FILTER_OPTIONS = {
  department: [
    { value: 'all', label: 'ทุกแผนก' },
    { value: 'ตรวจรักษา', label: 'ตรวจรักษา' },
    { value: 'อายุรกรรม', label: 'อายุรกรรม' },
    { value: 'ศัลยกรรม', label: 'ศัลยกรรม' },
  ],
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    { value: 'พญ.สมหญิง รักษ์ดี', label: 'พญ.สมหญิง รักษ์ดี' },
    { value: 'นพ.สมชาย ใจดี', label: 'นพ.สมชาย ใจดี' },
  ],
  type: [
    { value: 'all', label: 'ทุกประเภท' },
    { value: 'walkin', label: 'Walk-in' },
    { value: 'appointment', label: 'นัดหมาย' },
  ],
  time: [
    { value: 'all', label: 'ทั้งวัน' },
    { value: 'morning', label: 'ช่วงเช้า' },
    { value: 'afternoon', label: 'ช่วงบ่าย' },
  ],
};
const FILTER_DEFAULTS = {
  department: 'all',
  doctor: 'all',
  type: 'all',
  dateValue: { quick: 'today' },
  time: 'all',
};

const DATE_CHIP_LABELS = {
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
};

/* Figma table uses ColorfulBadge for queue / type / room / status — not StatusBadge. */
const STATUS_BADGE = {
  waiting:  { style: 'blue',   label: 'รอตรวจ'        },
  progress: { style: 'orange', label: 'ตรวจอยู่'      },
  done:     { style: 'teal',   label: 'ตรวจเสร็จแล้ว' },
  draft:    { style: 'grey',   label: 'ที่ร่างไว้'    },
};

const TYPE_BADGE = {
  walkin:       { style: 'grey', label: 'Walk-in' },
  appointment:  { style: 'blue', label: 'นัดหมาย' },
  telemedicine: { style: 'blue', label: 'นัดหมาย' },
};

/* CC_SAMPLES / seedStatus / buildVitals / buildRoster — moved to
   src/data/treatmentQueue.js so the in-visit QueueSubMenu side panel
   can share the exact same roster (counts and identities stay in
   sync between the queue page and the side panel). */

const FEMALE_NAME_HINTS = ['ดวงใจ', 'สุดา', 'ปริญญา', 'พญ.', 'นาง', 'น.ส.', 'สมหญิง', 'วิภา'];
const isFemaleName = (name = '') => FEMALE_NAME_HINTS.some((hint) => name.includes(hint));

const NAME_AVATAR_MAP = Object.fromEntries(
  PATIENT_PROFILES.filter((p) => p.avatarUrl).map((p) => [p.shortName, p.avatarUrl]),
);
const THAI_MALE_AVATARS = [
  '/avatars/mock-male-asian-a.png',
  '/avatars/mock-male-asian-b.png',
  '/avatars/mock-male-asian-c.png',
  '/avatars/patient-male-d.png',
  '/avatars/patient-male-e.png',
];
const THAI_FEMALE_AVATARS = [
  '/avatars/patient-female-a.png',
  '/avatars/patient-female-b.png',
  '/avatars/patient-female-c.png',
  '/avatars/patient-female-d.png',
  '/avatars/patient-female-e.png',
  '/avatars/patient-female-f.png',
];

const Avatar = ({ name = '', seed = 0 }) => {
  const [imgError, setImgError] = useState(false);
  const female = isFemaleName(name);
  const sourceList = female ? THAI_FEMALE_AVATARS : THAI_MALE_AVATARS;
  const src = NAME_AVATAR_MAP[name] || sourceList[seed % sourceList.length];

  return (
    <div
      className='shrink-0 flex items-center justify-center text-white overflow-hidden'
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--surface-neutral-tertiary, #9AA1A8)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1,
      }}
      aria-hidden
    >
      {!imgError ? (
        <img
          src={src}
          alt=''
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        name.trim().charAt(0) || '?'
      )}
    </div>
  );
};

const VitalsCell = ({ vitals }) => {
  const rowStyle = {
    display: 'flex',
    gap: 'var(--dim-space-200)',
    alignItems: 'baseline',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs)',
    fontWeight: 'var(--type-weight-medium)',
    lineHeight: 1.5,
  };
  const labelStyle = { color: 'var(--text-neutral-tertiary, #ADB2B7)' };
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-0)' }}>
      <div style={rowStyle}>
        <span style={labelStyle}>BP</span>
        <span style={{ color: vitals.bpColor }}>{vitals.bp}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>PR</span>
        <span style={{ color: vitals.prColor }}>{vitals.pr}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>O₂</span>
        <span style={{ color: vitals.spo2Color }}>{vitals.spo2}</span>
      </div>
    </div>
  );
};

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
    {row.queue}
  </ColorfulBadge>
);

const renderName = (row, idx, { editMode } = {}) => (
  <div className='flex items-center gap-2 min-w-0'>
    <Avatar name={row.name} seed={idx} />
    {editMode ? (
      <TableEllipsisText text={row.name} />
    ) : (
      <Link
        to={{
          pathname: '/treat/record',
          state: { hn: row.hn, queue: row.queue, name: row.name },
        }}
        className='min-w-0 flex-1 truncate hover:underline'
        style={{
          color: 'var(--text-neutral-default)',
          fontWeight: 'var(--type-weight-medium)',
          textDecoration: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {row.name}
      </Link>
    )}
  </div>
);

const renderType = (row) => {
  const badge = TYPE_BADGE[row.typeKey] || TYPE_BADGE.walkin;
  return (
    <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>
      {badge.label}
    </ColorfulBadge>
  );
};

const renderTelemedicine = (row) => (
  row.typeKey === 'telemedicine' && row.telemedAppointmentAt ? (
    <TelemedicineQueueBadge appointmentAt={row.telemedAppointmentAt} visitId={row.id} />
  ) : null
);

const renderRoom = (row) => (
  <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
    {row.room}
  </ColorfulBadge>
);

const renderStatus = (row) => {
  const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
  return (
    <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>
      {badge.label}
    </ColorfulBadge>
  );
};

const makeRenderActions = ({ onCall }) => function ActionsCell(row) {
  const callIsDone = row.statusKey === 'done';
  const callNotYet = row.statusKey === 'waiting';
  const callButtonProps = callIsDone
    ? { variant: 'ghost', disabled: true, 'aria-label': 'ตรวจเสร็จแล้ว' }
    : callNotYet
      ? { variant: 'fill', 'aria-label': 'เรียกคิว' }
      : {
          variant: 'ghost',
          'aria-label': 'เรียกคิวอีกครั้ง',
          style: { border: 'var(--dim-stroke-100) solid var(--border-brandPrimaryButton-quaternary)' },
        };

  return (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <BrandIconButton
        icon='volume_up'
        size='sm'
        {...callButtonProps}
        onClick={(e) => { e.stopPropagation(); onCall?.(row); }}
      />
      <button
        type='button'
        disabled={callIsDone}
        aria-disabled={callIsDone || undefined}
        onClick={(e) => e.stopPropagation()}
        className='inline-flex items-center justify-center shrink-0'
        style={{
          height: 36,
          paddingLeft: 'var(--dim-space-300)',
          paddingRight: 'var(--dim-space-300)',
          borderRadius: 'var(--dim-radius-200)',
          background: callIsDone
            ? 'var(--surface-disabledButton-tertiary)'
            : 'transparent',
          color: callIsDone
            ? 'var(--icon-disabledButton-tertiary)'
            : 'var(--text-neutralbutton-default)',
          border: callIsDone
            ? 'var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)'
            : 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
          cursor: callIsDone ? 'not-allowed' : 'pointer',
        }}
      >
        ยกเลิก
      </button>
    </div>
  );
};

const BASE_COLUMNS = [
  { key: 'queue',        label: 'คิว',              width: 80,  render: renderQueue },
  { key: 'hn',           label: 'HN',               width: 96  },
  { key: 'name',         label: 'ชื่อ-นามสกุล',      flex: true, minWidth: 160, render: renderName },
  { key: 'type',         label: 'ประเภท',           width: 96,  render: renderType },
  { key: 'telemedicine', label: 'Telemedicine',     width: 168, align: 'center', render: renderTelemedicine },
  { key: 'cc',           label: 'อาการสำคัญ (CC)',   width: 224, render: (row) => <TableEllipsisText text={row.cc} /> },
  { key: 'vitals',       label: 'Vitals',           width: 128, sortable: false, render: (row) => <VitalsCell vitals={row.vitals} /> },
  { key: 'room',         label: 'ห้อง',             width: 112, render: renderRoom },
  { key: 'doctor',       label: 'แพทย์รักษา',        flex: true, minWidth: 140 },
  { key: 'wait',         label: 'รอนาน',            width: 112, render: (row) => `${row.waitMinutes} นาที` },
  { key: 'status',       label: 'สถานะ',            width: 128, render: renderStatus },
];

/* buildRoster moved to src/data/treatmentQueue.js — see TREATMENT_QUEUE_ROWS. */

const TreatmentQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(TREATMENT_QUEUE_ROWS);
  const [editMode, setEditMode] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: TREATMENT_SEARCH_HISTORY_SEED });

  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));
  const isAllDefault =
    filters.department === FILTER_DEFAULTS.department &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.type === FILTER_DEFAULTS.type &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick &&
    filters.time === FILTER_DEFAULTS.time;

  const handleRowClick = (row) => history.push({
    pathname: '/treat/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  const handleTabChange = (key) => {
    setActiveTab(key);
    setPage(1);
  };

  const toggleEditMode = () => setEditMode((m) => !m);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleDragStart = (idx) => (e) => {
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const handleDragOver = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overIdx !== idx) setOverIdx(idx);
  };
  const handleDrop = (idx) => (e) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setRows((prev) => {
        const next = [...prev];
        const [item] = next.splice(draggedIdx, 1);
        next.splice(idx, 0, item);
        return next;
      });
    }
    setDraggedIdx(null);
    setOverIdx(null);
  };
  const handleDragEnd = () => {
    setDraggedIdx(null);
    setOverIdx(null);
  };

  const queueRowToSearchItem = (row) => ({
    id: row.id,
    label: row.name,
    sublabel: row.doctor,
    value: row.name,
    badges: [
      { label: row.queue, tone: 'teal' },
      { label: row.hn, tone: 'indigo' },
    ],
    avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.id === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) => {
      const fields = [row.queue, row.hn, row.name, row.doctor];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    }) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.id)) continue;
      const fields = [row.queue, row.hn, row.name, row.doctor];
      if (fields.some((f) => f && f.toLowerCase().includes(q))) {
        seen.add(row.id);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [rows, searchQ]);

  const searchAvatars = useMemo(() => {
    const result = [];
    const seenHn = new Set();
    for (const entry of searchHistory) {
      if (result.length >= 3) break;
      const directAvatar = entry && typeof entry === 'object'
        ? (entry.avatarSrc ?? entry.avatarUrl ?? entry.src)
        : null;
      const q = (typeof entry === 'string'
        ? entry
        : (entry?.value ?? entry?.label ?? '')).toString().trim().toLowerCase();
      if (!q && !directAvatar) continue;
      const match = entry?.id
        ? rows.find((row) => row.id === entry.id)
        : rows.find((row) => {
          const fields = [row.queue, row.hn, row.name, row.doctor];
          return fields.some((f) => f && f.toLowerCase().includes(q));
        });
      const dedupeKey = match?.hn ?? directAvatar;
      if (!dedupeKey || seenHn.has(dedupeKey)) continue;
      const profile = match ? getPatientByHN(match.hn) : null;
      const src = directAvatar ?? profile?.avatarUrl;
      if (!src) continue;
      seenHn.add(dedupeKey);
      result.push({ src });
    }
    return result;
  }, [searchHistory, rows]);

  const filtered = useMemo(() => {
    /* Edit mode — full underlying queue so drag indices stay stable. */
    if (editMode) return rows;
    let result = rows;
    const tabPred = TAB_STATUS_FILTER[activeTab];
    if (tabPred) result = result.filter(tabPred);
    if (filters.department !== 'all') {
      /* Placeholder — rows have no dept field yet; keep full list. */
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.doctor, row.cc]
          .some((f) => f && String(f).toLowerCase().includes(q)),
      );
    }
    return result;
  }, [rows, activeTab, searchQ, filters, editMode]);

  const sortedRows = useMemo(() => {
    if (editMode) return filtered;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    if (!sortConfig.key) {
      return filtered.slice().sort(compareTreatmentQueueRows);
    }
    const normalize = (row, key) => {
      switch (key) {
        case 'type':
          return TYPE_BADGE[row.typeKey]?.label || '';
        case 'status':
          return TREATMENT_STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'telemedicine':
          return row.telemedAppointmentAt
            ? new Date(row.telemedAppointmentAt).getTime()
            : 0;
        case 'wait':
          return row.waitMinutes ?? 0;
        default:
          return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return filtered.slice().sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = sortConfig.key === 'status'
        || sortConfig.key === 'telemedicine'
        || sortConfig.key === 'wait'
        ? (Number(av) || 0) - (Number(bv) || 0)
        : collator.compare(String(av), String(bv));
      if (primary !== 0) return sign * primary;
      return compareTreatmentQueueRows(a, b);
    });
  }, [filtered, editMode, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = editMode
    ? sortedRows
    : sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = editMode
    ? sortedRows.length
    : Math.min(page * PAGE_SIZE, sortedRows.length);

  /* Snap page back into range when filtering / sorting shrinks the result —
     mirrors the OPD QueuePage pagination contract. */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const columns = useMemo(
    () => [
      ...BASE_COLUMNS,
      {
        key: 'actions',
        label: 'การดำเนินการ',
        width: 160,
        sortable: false,
        render: makeRenderActions({ onCall: () => {} }),
      },
    ],
    [],
  );

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      summaryTitle={SUMMARY_TITLE}
      summaryCards={SUMMARY_CARDS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(match ? queueRowToSearchItem(match) : (item ?? label));
                if (match) handleRowClick(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / เลขบัตร / ชื่อ-สกุล / โทรศัพท์'
              width={640}
              avatars={searchAvatars}
            />
          </div>

          <div
            className='flex items-start w-full'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => setFilters(FILTER_DEFAULTS)} />
              <FilterDropdown prefix='แผนก:' options={FILTER_OPTIONS.department} value={filters.department} onChange={setFilter('department')} />
              <FilterDropdown prefix='แพทย์:' options={FILTER_OPTIONS.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ประเภท:' options={FILTER_OPTIONS.type} value={filters.type} onChange={setFilter('type')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
              <FilterDropdown prefix='เวลา:' options={FILTER_OPTIONS.time} value={filters.time} onChange={setFilter('time')} />
            </OverflowFlexRow>
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
              <NeutralSubdueButton
                leadingIcon={editMode ? 'check' : 'format_list_bulleted'}
                collapseLabelBelow='lg'
                accessibilityLabel={editMode ? 'เสร็จสิ้น' : 'แก้ไขลำดับคิว'}
                onClick={toggleEditMode}
              >
                {editMode ? 'เสร็จสิ้น' : 'แก้ไขลำดับคิว'}
              </NeutralSubdueButton>
              <NeutralSubdueButton
                leadingIcon='ios_share'
                collapseLabelBelow='lg'
                accessibilityLabel='นำส่งออกรายงาน'
                disabled={editMode}
              >
                นำส่งออกรายงาน
              </NeutralSubdueButton>
            </div>
          </div>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(row) => row.id}
            sortConfig={sortConfig}
            onSort={editMode ? undefined : handleSort}
            onRowClick={editMode ? undefined : handleRowClick}
            stickyColCount={3}
            stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
            emptyMessage='ไม่พบรายการ'
            editMode={editMode}
            draggedIdx={draggedIdx}
            overIdx={overIdx}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
          />

          {/* Pagination — sticky-bottom contract mirrors the OPD QueuePage so
              the pager stays in view while the table scrolls. */}
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              position: 'sticky',
              bottom: 'var(--dim-space-0)',
              zIndex: 50,
              background: 'var(--surface-card-100)',
              paddingTop: 'var(--dim-space-200)',
              borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            }}
          >
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
            >
              {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
            </span>
            <div className='flex-1' />
            {!editMode && (
              <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
            )}
          </div>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default TreatmentQueuePage;
