import React, { useMemo, useState } from 'react';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import { DEFAULT_SEARCH_AVATARS } from '@/data/avatarAssets';
import {
  DEFAULT_PATIENT_AVATAR,
  EMBEDDED_LIST_PAGE_SIZE,
  getAppointmentStatusPresentation,
  formatApptListDate,
  parseDateKey,
  PAGE_SIZE,
} from './appointmentShared';

/* MIH PHCIS · รายการนัดหมาย — Figma 46:11239 (root) / 58:19171 (embedded)
   Flat table with filters — all doctors or scoped to one staffId. */

const TABLE_MAX_HEIGHT = 604;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const TIME_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งวัน' },
  { value: 'morning', label: 'ช่วงเช้า (06:00–12:00)' },
  { value: 'afternoon', label: 'ช่วงบ่าย (12:00–18:00)' },
  { value: 'evening', label: 'ช่วงเย็น (18:00–24:00)' },
];

const EXAM_MODE_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'onsite', label: 'ตรวจที่โรงพยาบาล' },
  { value: 'tele', label: 'Telemedicine' },
];

const FILTER_DIVIDER = (
  <div
    aria-hidden
    style={{
      width: 1,
      height: 'var(--dim-size-600, 24px)',
      alignSelf: 'center',
      flexShrink: 0,
      background: 'var(--border-neutral-tertiary)',
      marginLeft: 'var(--dim-space-100)',
      marginRight: 'var(--dim-space-100)',
    }}
  />
);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Resolve FilterDateTag value → inclusive [start, end] or null (= no filter). */
function resolveDateBounds(dateValue) {
  if (!dateValue?.quick || dateValue.quick === 'all') return null;
  const today = startOfDay(new Date());

  if (dateValue.quick === 'custom') {
    if (dateValue.tab === 'single' && dateValue.single) {
      return { start: startOfDay(dateValue.single), end: endOfDay(dateValue.single) };
    }
    if (dateValue.tab === 'range' && dateValue.range?.start && dateValue.range?.end) {
      return {
        start: startOfDay(dateValue.range.start),
        end: endOfDay(dateValue.range.end),
      };
    }
    return null;
  }

  const singleDay = computeQuickSingle(dateValue.quick, today);
  if (singleDay) {
    return { start: startOfDay(singleDay), end: endOfDay(singleDay) };
  }

  const range = computeQuickRange(dateValue.quick, today);
  if (range?.start && range?.end) {
    return { start: startOfDay(range.start), end: endOfDay(range.end) };
  }

  return null;
}

function matchesTimeFilter(timeStr, filterTime) {
  if (!filterTime || filterTime === 'all') return true;
  const h = Number(String(timeStr || '00:00').split(':')[0]);
  if (filterTime === 'morning') return h >= 6 && h < 12;
  if (filterTime === 'afternoon') return h >= 12 && h < 18;
  if (filterTime === 'evening') return h >= 18;
  return true;
}

/** Figma 46:13687 — short name without title prefix (สมชาย มั่นใจดี). */
function formatPatientShortName(fullName) {
  if (!fullName) return '—';
  return String(fullName)
    .replace(/^(นาย|นาง|น\.ส\.|นางสาว|ด\.ช\.|ด\.ญ\.|Mr\.|Mrs\.|Ms\.)\s*/u, '')
    .trim() || fullName;
}

/** Figma 46:16285 — department label in list row. */
function formatApptDeptLabel(row) {
  if (row.dept) return row.dept;
  if ((row.clinic || '').includes('ทันต')) return 'ทันตกรรม';
  return 'ตรวจรักษา';
}

const PatientAvatar = ({ src, alt = '' }) => (
  <span
    aria-hidden={!alt}
    style={{
      width: 'var(--dim-size-700, 36px)',
      height: 'var(--dim-size-700, 36px)',
      flexShrink: 0,
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-table-header)',
      border: 'var(--dim-stroke-100) solid var(--border-table-default)',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      display: 'inline-block',
    }}
  >
    <img
      src={src}
      alt={alt}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        left: 0,
        top: 0,
      }}
    />
  </span>
);

const renderPatientCell = (row) => (
  <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
    <PatientAvatar src={row.patientAvatar || DEFAULT_PATIENT_AVATAR} />
    <span
      className='truncate'
      style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}
    >
      {formatPatientShortName(row.patient)}
    </span>
  </div>
);

const renderTypeBadge = () => (
  <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
    นัดหมาย
  </ColorfulBadge>
);

const renderTelemedicine = (row) => {
  const isTele = row.examMode === 'tele' || row.examMode === 'telemedicine';
  if (!isTele) return null;
  return (
    <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' />
  );
};

/** Figma 58:19193 — ยืนยันแล้ว / เสร็จสิ้น / ไม่มาตามนัด */
const renderStatusBadge = (row) => {
  const { label, style } = getAppointmentStatusPresentation(row);
  return (
    <StatusBadge style={style} size='small' showDot={false}>
      {label}
    </StatusBadge>
  );
};

/** Figma 46:11239 (root) / 58:19171 (embedded) — appointment list columns. */
const buildFigmaListColumns = ({ variant }) => {
  const isRoot = variant === 'root';

  const cols = [
    {
      key: 'date',
      header: 'วันที่',
      width: isRoot ? 128 : 192,
      sortable: true,
      render: (row) => (
        <span style={TEXT_CELL}>{formatApptListDate(row.date)}</span>
      ),
    },
    {
      key: 'time',
      header: 'เวลา',
      width: 112,
      sortable: true,
      render: (row) => (
        <span style={TEXT_CELL}>{row.time || '—'}</span>
      ),
    },
    {
      key: 'hn',
      header: 'HN',
      width: 96,
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.hn || '—'}</span>,
    },
    {
      key: 'patient',
      header: isRoot ? 'ผู้รับบริการ' : 'ชื่อ-นามสกุล ผู้รับบริการ',
      flex: true,
      minWidth: isRoot ? undefined : 177,
      sortable: true,
      render: renderPatientCell,
    },
  ];

  if (isRoot) {
    cols.push({
      key: 'doctor',
      header: 'แพทย์',
      flex: true,
      sortable: true,
      render: (row) => (
        <span className='truncate' style={TEXT_CELL}>{row.doctor || '—'}</span>
      ),
    });
  }

  cols.push(
    {
      key: 'type',
      header: 'ประเภท',
      width: 96,
      sortable: false,
      render: renderTypeBadge,
    },
    {
      key: 'telemedicine',
      header: 'Telemedicine',
      width: 128,
      sortable: false,
      render: renderTelemedicine,
    },
    {
      key: 'clinic',
      header: 'แผนก',
      width: 256,
      sortable: true,
      render: (row) => (
        <span className='truncate' style={TEXT_CELL}>{formatApptDeptLabel(row)}</span>
      ),
    },
    {
      key: 'status',
      header: 'สถานะ',
      width: isRoot ? 128 : 224,
      sortable: false,
      render: renderStatusBadge,
    },
  );

  return cols;
};

const AppointmentListView = ({
  appointments,
  staff,
  staffId = null,
  onOpenDetail,
  /** When true, render filters + table only (no outer card — parent owns chrome). */
  embedded = false,
}) => {
  const lockedDoctor = staffId != null;
  const listVariant = embedded ? 'embedded' : 'root';
  const pageSize = embedded ? EMBEDDED_LIST_PAGE_SIZE : PAGE_SIZE;

  const [search, setSearch] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterExamMode, setFilterExamMode] = useState('');
  const [filterTime, setFilterTime] = useState('all');
  const [dateValue, setDateValue] = useState({ quick: 'today' });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const doctorOptions = useMemo(() => {
    const opts = [{ value: '', label: 'ทุกแพทย์' }];
    staff.forEach((s) => opts.push({ value: String(s.id), label: s.name }));
    return opts;
  }, [staff]);

  const dateBounds = useMemo(() => resolveDateBounds(dateValue), [dateValue]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const doctorFilter = lockedDoctor ? String(staffId) : filterDoctor;

    return appointments.filter((a) => {
      if (doctorFilter && String(a.staffId) !== doctorFilter) return false;

      if (filterExamMode) {
        const mode = a.examMode === 'telemedicine' ? 'tele' : (a.examMode || 'onsite');
        if (mode !== filterExamMode) return false;
      }

      if (dateBounds) {
        const d = parseDateKey(a.date);
        if (d < dateBounds.start || d > dateBounds.end) return false;
      }

      if (!matchesTimeFilter(a.time, filterTime)) return false;

      if (!q) return true;
      const searchFields = [
        a.patient,
        formatPatientShortName(a.patient),
        a.hn,
      ];
      if (listVariant === 'root') searchFields.push(a.doctor);
      return searchFields.some((field) => String(field || '').toLowerCase().includes(q));
    });
  }, [
    appointments,
    lockedDoctor,
    staffId,
    filterDoctor,
    filterExamMode,
    filterTime,
    dateBounds,
    search,
    listVariant,
  ]);

  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const sorted = useMemo(() => {
    const { key, direction } = sortConfig;
    const sign = direction === 'desc' ? -1 : 1;
    const copy = filtered.slice();
    copy.sort((a, b) => {
      if (key === 'date') {
        const da = parseDateKey(a.date).getTime();
        const db = parseDateKey(b.date).getTime();
        if (db !== da) return sign * (da - db);
        return sign * (a.time || '').localeCompare(b.time || '');
      }
      const av = a[key];
      const bv = b[key];
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av ?? '').localeCompare(String(bv ?? ''), 'th');
      if (primary !== 0) return sign * primary;
      return (a.id || '').localeCompare(b.id || '');
    });
    return copy;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const rangeStart = sorted.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, sorted.length);

  const isAllFilters = !filterDoctor
    && !filterExamMode
    && dateValue.quick === 'all'
    && filterTime === 'all';

  const columns = useMemo(
    () => buildFigmaListColumns({ variant: listVariant }),
    [listVariant],
  );

  const resetAllFilters = () => {
    setFilterDoctor('');
    setFilterExamMode('');
    setFilterTime('all');
    setDateValue({ quick: 'all' });
    setPage(1);
  };

  const body = (
    <>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          onSubmit={(v) => { setSearch(v); setPage(1); }}
          placeholder='ค้นหา ชื่อผู้รับบริการ / HN'
          width={640}
          avatars={DEFAULT_SEARCH_AVATARS}
        />
      </div>

      <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          <FilterTag
            value='ทั้งหมด'
            selected={isAllFilters}
            onClick={resetAllFilters}
          />
          {!lockedDoctor && (
            <FilterDropdown
              prefix='แพทย์:'
              options={doctorOptions}
              value={filterDoctor}
              onChange={(v) => { setFilterDoctor(v); setPage(1); }}
            />
          )}
          <FilterDropdown
            prefix='ประเภท:'
            options={EXAM_MODE_OPTIONS}
            value={filterExamMode}
            onChange={(v) => { setFilterExamMode(v); setPage(1); }}
          />
          {FILTER_DIVIDER}
          <FilterDateTag
            prefix='วัน:'
            value={dateValue.quick === 'all' ? undefined : dateValue}
            defaultQuick='today'
            quickLabels={{
              today: 'วันนี้',
              yesterday: 'เมื่อวาน',
              thismonth: 'เดือนนี้',
              lastmonth: 'เดือนที่แล้ว',
            }}
            placeholder='วันนี้'
            selectedWhen={(v) => v?.quick && v.quick !== 'all'}
            onChange={(v) => { setDateValue(v); setPage(1); }}
          />
          <FilterDropdown
            prefix='เวลา:'
            options={TIME_FILTER_OPTIONS}
            value={filterTime}
            onChange={(v) => { setFilterTime(v); setPage(1); }}
          />
        </OverflowFlexRow>

        <Table
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={onOpenDetail}
          emptyMessage='ไม่พบนัดหมาย'
          style={{
            maxHeight: TABLE_MAX_HEIGHT,
            overflow: 'auto',
          }}
        />

        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-600)',
            paddingTop: 'var(--dim-space-400)',
          }}
        >
          <span
            style={{
              flex: 1,
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            แสดง {rangeStart}-{rangeEnd} จาก {sorted.length} รายการ
          </span>
          <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
        {body}
      </div>
    );
  }

  return (
    <div className='flex flex-col flex-1 min-w-0'>
      <section
        className='w-full flex flex-col'
        style={{
          background: 'var(--surface-card-100)',
          borderRadius: 'var(--dim-radius-500)',
          border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          boxShadow: 'var(--shadow-brand-top-200)',
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {body}
      </section>
    </div>
  );
};

export default AppointmentListView;
