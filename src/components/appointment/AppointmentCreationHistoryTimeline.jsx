import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import { DEFAULT_SEARCH_AVATARS } from '@/data/avatarAssets';
import {
  appointmentStatusLabel,
  appointmentStatusTone,
} from '@/pages/appointment/appointmentCreationHistory';

/* ประวัติสร้างการนัดหมาย — ตารางปกติ (มติผู้ใช้ 25 ส.ค. 69)
   เหตุผลเดียวกับประวัติคำขอเข้าถึงข้อมูล: timeline แบ่งกลุ่มรายเดือนอ่านยาก
   กว่าตารางธรรมดาเมื่อข้อมูลมีหลายคอลัมน์ให้เทียบ

   "สร้างเมื่อ" กับ "วันนัด" แยกคอลัมน์กันเสมอ — ถ้าปนกันจะอ่านไม่ออกว่าเลขไหน
   คืออะไร

   ค้นหา + ตัวกรอง (มติผู้ใช้ 27 ส.ค. 69): รายการยาวหลายสิบนัดจนต้องแบ่งหน้า
   การไล่ทีละหน้าหาคนไข้รายเดียวจึงไม่ไหว — ใช้ชุดเดียวกับทะเบียนอื่นในระบบ
   (PrimarySearch + FilterDropdown/FilterDateTag + ClearFiltersTag) กรอง
   "วันที่สร้าง" กับ "วันนัด" แยกกันเพราะเป็นคนละวันและมักถามคนละคำถาม */

const MUTED = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const TEXT = {
  color: 'var(--text-content-primary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.45,
};

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

const DATE_QUICK_LABELS = {
  today: 'วันนี้',
  yesterday: 'เมื่อวาน',
  thismonth: 'เดือนนี้',
  lastmonth: 'เดือนที่แล้ว',
};

const Stacked = ({ primary, secondary }) => (
  <div className='flex flex-col min-w-0 w-full'>
    <span className='truncate' style={TEXT} title={typeof primary === 'string' ? primary : undefined}>
      {primary || '—'}
    </span>
    {secondary ? (
      <span className='truncate' style={MUTED} title={typeof secondary === 'string' ? secondary : undefined}>
        {secondary}
      </span>
    ) : null}
  </div>
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

const parseKey = (key) => {
  if (!key) return null;
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** FilterDateTag value → ช่วง [start, end] แบบรวมปลาย หรือ null (= ไม่กรอง) */
const resolveDateBounds = (dateValue) => {
  if (!dateValue?.quick || dateValue.quick === 'all') return null;
  const today = startOfDay(new Date());

  if (dateValue.quick === 'custom') {
    if (dateValue.tab === 'single' && dateValue.single) {
      return { start: startOfDay(dateValue.single), end: endOfDay(dateValue.single) };
    }
    if (dateValue.tab === 'range' && dateValue.range?.start && dateValue.range?.end) {
      return { start: startOfDay(dateValue.range.start), end: endOfDay(dateValue.range.end) };
    }
    return null;
  }

  const singleDay = computeQuickSingle(dateValue.quick, today);
  if (singleDay) return { start: startOfDay(singleDay), end: endOfDay(singleDay) };

  const range = computeQuickRange(dateValue.quick, today);
  if (range?.start && range?.end) {
    return { start: startOfDay(range.start), end: endOfDay(range.end) };
  }
  return null;
};

const withinBounds = (key, bounds) => {
  if (!bounds) return true;
  const d = parseKey(key);
  if (!d) return false;
  return d >= bounds.start && d <= bounds.end;
};

const ALL_DATE = { quick: 'all' };

export default function AppointmentCreationHistoryTimeline({ records = [] }) {
  const [search, setSearch] = useState('');
  const [createdDate, setCreatedDate] = useState(ALL_DATE);
  const [apptDate, setApptDate] = useState(ALL_DATE);
  const [clinic, setClinic] = useState('');
  const [status, setStatus] = useState('');

  /* ตัวเลือกมาจากข้อมูลจริงในตาราง ไม่ใช่ master list — ป้ายในดรอปดาวน์จึง
     ตรงกับสิ่งที่กรองได้เสมอ ไม่มีตัวเลือกที่กรองแล้วว่าง */
  const clinicOptions = useMemo(() => ([
    { value: '', label: 'ทุกคลินิก' },
    ...[...new Set(records.map((r) => r.clinic).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((c) => ({ value: c, label: c })),
  ]), [records]);

  const statusOptions = useMemo(() => ([
    { value: '', label: 'ทุกสถานะ' },
    ...[...new Set(records.map((r) => r.status).filter(Boolean))]
      .map((s) => ({ value: s, label: appointmentStatusLabel(s) })),
  ]), [records]);

  const createdBounds = useMemo(() => resolveDateBounds(createdDate), [createdDate]);
  const apptBounds = useMemo(() => resolveDateBounds(apptDate), [apptDate]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (clinic && r.clinic !== clinic) return false;
      if (status && r.status !== status) return false;
      if (!withinBounds(r.createdKey, createdBounds)) return false;
      if (!withinBounds(r.date, apptBounds)) return false;
      if (!q) return true;
      return [r.patient, r.hn, r.doctor, r.reason, r.type]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q));
    });
  }, [records, search, clinic, status, createdBounds, apptBounds]);

  const filtersActive = !!(
    search || clinic || status
    || (createdDate.quick && createdDate.quick !== 'all')
    || (apptDate.quick && apptDate.quick !== 'all')
  );

  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setSearch('');
      setClinic('');
      setStatus('');
      setCreatedDate(ALL_DATE);
      setApptDate(ALL_DATE);
    },
  );

  const columns = useMemo(() => [
    {
      key: 'created',
      header: 'สร้างเมื่อ',
      render: (r) => <Stacked primary={r.createdDate} secondary={r.createdTime} />,
    },
    {
      key: 'appt',
      header: 'วันนัด / เวลา',
      render: (r) => <Stacked primary={r.apptDateLabel} secondary={r.time} />,
    },
    {
      key: 'patient',
      header: 'ผู้รับบริการ',
      render: (r) => <Stacked primary={r.patient} secondary={r.hn ? `HN ${r.hn}` : ''} />,
    },
    {
      key: 'clinic',
      header: 'คลินิก / แพทย์',
      render: (r) => <Stacked primary={r.clinic} secondary={r.doctor} />,
    },
    {
      key: 'reason',
      header: 'เหตุผลการนัด',
      render: (r) => <Stacked primary={r.reason || r.type} secondary={r.orderingUnit || r.site} />,
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (r) => (
        <ColorfulBadge style={appointmentStatusTone(r.status)} size='small' showDot width='hug'>
          {appointmentStatusLabel(r.status)}
        </ColorfulBadge>
      ),
    },
  ], []);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={search}
          onChange={setSearch}
          onSubmit={setSearch}
          placeholder='ค้นหา ชื่อผู้รับบริการ / HN'
          width={640}
          avatars={DEFAULT_SEARCH_AVATARS}
        />
      </div>

      <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
        <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
          <FilterDateTag
            prefix='วันที่สร้าง:'
            value={createdDate.quick === 'all' ? undefined : createdDate}
            defaultQuick='all'
            quickLabels={DATE_QUICK_LABELS}
            placeholder='ทุกวัน'
            selectedWhen={(v) => v?.quick && v.quick !== 'all'}
            onChange={setCreatedDate}
          />
          <FilterDateTag
            prefix='วันนัด:'
            value={apptDate.quick === 'all' ? undefined : apptDate}
            defaultQuick='all'
            quickLabels={DATE_QUICK_LABELS}
            placeholder='ทุกวัน'
            selectedWhen={(v) => v?.quick && v.quick !== 'all'}
            onChange={setApptDate}
          />
          {FILTER_DIVIDER}
          <FilterDropdown
            prefix='คลินิก:'
            options={clinicOptions}
            value={clinic}
            onChange={setClinic}
          />
          <FilterDropdown
            prefix='สถานะ:'
            options={statusOptions}
            value={status}
            onChange={setStatus}
          />
          <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
        </OverflowFlexRow>

        <SmoothFilterResults opaque={resultsOpaque}>
          <SearchResultCount found={filtered.length} total={records.length} unit='นัดหมาย' />

          <Table
            columns={columns}
            rows={filtered}
            rowKey={(r, i) => r.id ?? i}
            emptyMessage={filtersActive
              ? 'ไม่พบประวัติที่ตรงกับตัวกรอง'
              : 'ยังไม่มีประวัติสร้างการนัดหมาย'}
            emptySubtext={filtersActive
              ? 'ลองล้างตัวกรองหรือขยายช่วงวันที่'
              : 'นัดหมายที่คุณสร้างจากเมนู “สร้างการนัดหมาย” จะมาแสดงที่นี่'}
          />
        </SmoothFilterResults>
      </div>
    </div>
  );
}
