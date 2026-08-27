import React, { useMemo, useState } from 'react';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { DEFAULT_SEARCH_AVATARS } from '@/data/avatarAssets';
import {
  DEFAULT_PATIENT_AVATAR,
  EMBEDDED_LIST_PAGE_SIZE,
  getAppointmentDisplayStatus,
  getAppointmentStatusPresentation,
  formatApptListDate,
  isAppointmentSlotPast,
  parseDateKey,
  PAGE_SIZE,
  APPT_STATUS_CONFIRMED,
  APPT_STATUS_PENDING,
  APPT_STATUS_CANCELLED,
  APPT_STATUS_NO_SHOW,
} from './appointmentShared';
import { HCIS_STATUS_FILTER_OPTIONS, toHcisStatus } from './appointmentHcisMasters';
import {
  AVAILABILITY,
  countActiveAppointmentsOnDate,
  evaluateDayAvailability,
} from './appointmentSettingsStore';

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

/* TOR 1.6.2.8 — กรองตามความพร้อมรับนัดของวันนั้น (Available / Non-available). */
const AVAILABILITY_FILTER_OPTIONS = [
  { value: '', label: 'ทุกความพร้อมรับนัด' },
  { value: 'available', label: 'Available (วันที่ยังรับนัดได้)' },
  { value: 'nonavailable', label: 'Non-available (เต็ม/วันหยุด/นอกช่วง)' },
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

/** Figma 58:19193 — รอการยืนยัน / ยืนยันแล้ว / เสร็จสิ้น / ไม่มาตามนัด */
const renderStatusBadge = (row) => {
  const { label, style } = getAppointmentStatusPresentation(row);
  return (
    <StatusBadge style={style} size='small' showDot={false}>
      {label}
    </StatusBadge>
  );
};

/** HCIS §2.3 — "สถานะการนัด" แบบมีรหัส (2 = ยังไม่ได้ลงทะเบียนตรวจรักษา ฯลฯ). */
const renderHcisStatusBadge = (row) => {
  const hcis = toHcisStatus(row, getAppointmentDisplayStatus(row));
  return (
    <StatusBadge style={hcis.style} size='small' showDot={false}>
      {`${hcis.code} · ${hcis.label}`}
    </StatusBadge>
  );
};

const makeRenderConfirmAction = (onConfirm) => (row) => (
  <BrandButton
    variant='fill'
    size='sm'
    onClick={(e) => {
      e.stopPropagation();
      onConfirm?.(row);
    }}
  >
    ยืนยัน
  </BrandButton>
);

const makeRenderEditAction = (onEdit) => (row) => (
  <BrandSubdueButton
    variant='outline'
    size='md'
    leadingIcon='edit'
    onClick={(e) => {
      e.stopPropagation();
      onEdit?.(row);
    }}
  >
    แก้ไข
  </BrandSubdueButton>
);

/** Figma 46:11239 (root) / 58:19171 (embedded) — appointment list columns. */
const buildFigmaListColumns = ({
  variant,
  showConfirmAction = false,
  showEditAction = false,
  onConfirmAppointment,
  onEditAppointment,
}) => {
  const isRoot = variant === 'root';

  const cols = [
    {
      key: 'date',
      header: 'วันที่',
      width: isRoot ? 176 : 192,
      sortable: true,
      render: (row) => (
        <span style={{ ...TEXT_CELL, whiteSpace: 'nowrap' }}>{formatApptListDate(row.date)}</span>
      ),
    },
    {
      key: 'time',
      header: 'เวลา',
      sortable: true,
      render: (row) => (
        <span style={TEXT_CELL}>{row.time || '—'}</span>
      ),
    },
    {
      key: 'hn',
      header: 'HN',
      sortable: true,
      render: (row) => <span style={TEXT_CELL}>{row.hn || '—'}</span>,
    },
    {
      key: 'patient',
      header: isRoot ? 'ผู้รับบริการ' : 'ชื่อ-นามสกุล ผู้รับบริการ',
      width: isRoot ? 220 : 200,
      sortable: true,
      render: renderPatientCell},
  ];

  if (isRoot) {
    cols.push({
      key: 'doctor',
      header: 'แพทย์',
      flex: true,
      minWidth: 200,
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
      sortable: false,
      align: 'left',
      render: renderTypeBadge},
    {
      key: 'telemedicine',
      header: 'Telemedicine',
      sortable: false,
      align: 'left',
      render: renderTelemedicine},
    {
      key: 'orderingUnit',
      header: 'หน่วยงานที่สั่งนัด',
      sortable: true,
      render: (row) => (
        <span className='truncate' style={TEXT_CELL}>
          {row.orderingUnit || row.site || '—'}
        </span>
      ),
    },
    {
      key: 'clinic',
      header: 'แผนก',
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
      render: renderStatusBadge},
    {
      key: 'hcisStatus',
      header: 'สถานะการนัด (HCIS)',
      sortable: false,
      render: renderHcisStatusBadge},
  );

  if (showConfirmAction) {
    cols.push({
      key: 'actions',
      header: 'การดำเนินการ',
      sortable: false,
      render: makeRenderConfirmAction(onConfirmAppointment)});
  } else if (showEditAction) {
    cols.push({
      key: 'actions',
      header: 'การดำเนินการ',
      sortable: false,
      render: makeRenderEditAction(onEditAppointment)});
  }

  return cols;
};

const AppointmentListView = ({
  appointments,
  staff,
  staffId = null,
  onOpenDetail,
  onConfirmAppointment,
  /**
   * Status scope for root tabs:
   *   'confirmed' — นัดหมายที่ยืนยันแล้ว
   *   'pending'   — นัดหมายที่รอการยืนยัน
   *   'all'       — นัดหมายทั้งหมด (รวมที่ผ่านมาแล้ว)
   *   'cancelled' — นัดหมายที่ยกเลิก / ไม่มาตามนัด
   */
  statusFilter = 'all',
  /** When true, render search + table only (no outer card — parent owns chrome). */
  embedded = false,
}) => {
  const lockedDoctor = staffId != null;
  const listVariant = embedded ? 'embedded' : 'root';
  const pageSize = embedded ? EMBEDDED_LIST_PAGE_SIZE : PAGE_SIZE;
  const includePast = statusFilter === 'all' || statusFilter === 'cancelled';
  const showConfirmAction = statusFilter === 'pending' && typeof onConfirmAppointment === 'function';
  const showEditAction = statusFilter === 'confirmed' && typeof onOpenDetail === 'function';
  /** Status tabs already segment the list — don't also clamp to today by default. */
  const defaultDateQuick = 'all';

  const [search, setSearch] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterExamMode, setFilterExamMode] = useState('');
  const [filterTime, setFilterTime] = useState('all');
  const [filterHcis, setFilterHcis] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('');
  const [dateValue, setDateValue] = useState({ quick: defaultDateQuick });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  /* รูป portrait มากับ roster อยู่แล้ว — ติดให้ตัวเลือกเลย ไม่ต้องไป lookup
     ด้วยชื่อเหมือนหน้าอื่นที่เก็บตัวกรองแพทย์เป็นสตริง (มติผู้ใช้ 27 ส.ค. 69) */
  const doctorOptions = useMemo(() => {
    const opts = [{ value: '', label: 'ทุกแพทย์', leadingIcon: 'groups' }];
    staff.forEach((s) => opts.push({
      value: String(s.id),
      label: s.name,
      image: s.avatarSrc,
      imageVariant: 'avatar',
    }));
    return opts;
  }, [staff]);

  const dateBounds = useMemo(() => resolveDateBounds(dateValue), [dateValue]);

  /** Available / Non-available ของแต่ละวัน — คำนวณครั้งเดียวต่อวันที่ (TOR 1.6.2.8). */
  const availabilityByDate = useMemo(() => {
    if (!filterAvailability) return null;
    const map = {};
    [...new Set(appointments.map((a) => a.date))].forEach((dateKey) => {
      if (!dateKey) return;
      const booked = countActiveAppointmentsOnDate(appointments, dateKey);
      map[dateKey] = evaluateDayAvailability({ dateKey, bookedCount: booked });
    });
    return map;
  }, [appointments, filterAvailability]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const doctorFilter = lockedDoctor ? String(staffId) : filterDoctor;

    return appointments.filter((a) => {
      if (doctorFilter && String(a.staffId) !== doctorFilter) return false;

      const displayStatus = getAppointmentDisplayStatus(a);
      if (statusFilter === 'confirmed' && displayStatus !== APPT_STATUS_CONFIRMED) return false;
      if (statusFilter === 'pending' && displayStatus !== APPT_STATUS_PENDING) return false;
      if (
        statusFilter === 'cancelled'
        && displayStatus !== APPT_STATUS_CANCELLED
        && displayStatus !== APPT_STATUS_NO_SHOW
      ) return false;
      if (!includePast && isAppointmentSlotPast(a)) return false;

      if (filterExamMode) {
        const mode = a.examMode === 'telemedicine' ? 'tele' : (a.examMode || 'onsite');
        if (mode !== filterExamMode) return false;
      }

      if (dateBounds) {
        const d = parseDateKey(a.date);
        if (d < dateBounds.start || d > dateBounds.end) return false;
      }

      if (!matchesTimeFilter(a.time, filterTime)) return false;

      if (filterHcis && toHcisStatus(a, displayStatus).key !== filterHcis) return false;

      if (filterAvailability && availabilityByDate) {
        const verdict = availabilityByDate[a.date];
        const isAvailable = verdict?.status === AVAILABILITY.AVAILABLE;
        if (filterAvailability === 'available' && !isAvailable) return false;
        if (filterAvailability === 'nonavailable' && isAvailable) return false;
      }

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
    statusFilter,
    includePast,
    filterDoctor,
    filterExamMode,
    filterTime,
    filterHcis,
    filterAvailability,
    availabilityByDate,
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

  const columns = useMemo(
    () => buildFigmaListColumns({
      variant: listVariant,
      showConfirmAction,
      showEditAction,
      onConfirmAppointment,
      onEditAppointment: onOpenDetail,
    }),
    [listVariant, showConfirmAction, showEditAction, onConfirmAppointment, onOpenDetail],
  );

  const filtersActive = !!(search || filterDoctor || filterExamMode || filterHcis || filterAvailability
    || filterTime !== 'all' || (dateValue.quick && dateValue.quick !== 'all'));
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setFilterDoctor('');
      setFilterExamMode('');
      setFilterTime('all');
      setFilterHcis('');
      setFilterAvailability('');
      setDateValue({ quick: defaultDateQuick });
      setPage(1);
    },
  );

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
            defaultQuick={defaultDateQuick}
            quickLabels={{
              today: 'วันนี้',
              yesterday: 'เมื่อวาน',
              thismonth: 'เดือนนี้',
              lastmonth: 'เดือนที่แล้ว',
            }}
            placeholder='ทุกวัน'
            selectedWhen={(v) => v?.quick && v.quick !== 'all'}
            onChange={(v) => { setDateValue(v); setPage(1); }}
          />
          <FilterDropdown
            prefix='เวลา:'
            options={TIME_FILTER_OPTIONS}
            value={filterTime}
            onChange={(v) => { setFilterTime(v); setPage(1); }}
          />
          <FilterDropdown
            prefix='สถานะการนัด:'
            options={HCIS_STATUS_FILTER_OPTIONS}
            value={filterHcis}
            onChange={(v) => { setFilterHcis(v); setPage(1); }}
          />
          <FilterDropdown
            prefix='รับนัด:'
            options={AVAILABILITY_FILTER_OPTIONS}
            value={filterAvailability}
            onChange={(v) => { setFilterAvailability(v); setPage(1); }}
          />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </OverflowFlexRow>

        <SmoothFilterResults opaque={resultsOpaque}>
        <SearchResultCount found={sorted.length} total={appointments.length} />

        <Table
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          onRowClick={onOpenDetail}
          stickyColCount={4}
          emptyMessage={search
            ? `ไม่พบนัดหมายที่ตรงกับ “${search}”`
            : statusFilter === 'pending' ? 'ยังไม่มีนัดหมายที่รอการยืนยัน'
              : statusFilter === 'cancelled' ? 'ยังไม่มีนัดหมายที่ยกเลิกหรือไม่มาตามนัด'
                : statusFilter === 'confirmed' ? 'ยังไม่มีนัดหมายที่ยืนยันแล้ว'
                  : 'ยังไม่มีนัดหมายในระบบ'}
          emptySubtext={search || filterHcis || filterAvailability
            ? 'ลองล้างตัวกรองแล้วค้นหาใหม่อีกครั้ง'
            : null}
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
        </SmoothFilterResults>
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
