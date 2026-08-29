import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Icon from '@/components/icons/Icon';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  TB_PATIENT_TYPES,
  TB_PATIENT_TYPE_BADGE,
  resolveTbPatientType,
  getTbQueueRows,
} from '@/data/tbQueue';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';
import DutyRosterAction from '@/components/patient/DutyRosterAction';
import { withEmrRowAction } from '@/components/patient/EmrRowAction';

/* TbQueuePage — คิวการรักษาคลินิกวัณโรค (TOR §1.10.4.1–.2).
   Mirrors AncQueuePage mechanics verbatim (search + filter chips +
   sortable table + "แสดง X–Y จาก Z รายการ" pager) with TB-specific
   columns: ประเภทผู้ป่วย (New M+/New M-/EP/Relapse/TAD/MDR — legacy
   คู่มือระบบวัณโรค.pdf vocabulary), เลขทะเบียน + เดือนที่รักษา, นัด DOT
   วันนี้, and a สิทธิหมดอายุ warning on the rights column (playbook §5
   no-rights edge). Header actions cross-link ทะเบียนวัณโรค + คัดกรอง
   กลุ่มเสี่ยง (module-internal routes only — integrator wires nav). */

const breadcrumb = ['บันทึกการรักษา', 'คลินิกวัณโรค'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:tb-queue';
const PAGE_SIZE = 20;

const STATUS_BADGE = {
  waiting:  { style: 'blue',   label: 'รอตรวจ' },
  progress: { style: 'orange', label: 'กำลังตรวจ' },
  done:     { style: 'teal',   label: 'ตรวจแล้ว' },
};
const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2 };

const FILTER_OPTIONS = {
  status: [
    { value: 'all',      label: 'ทุกสถานะ' },
    { value: 'waiting',  label: 'รอตรวจ' },
    { value: 'progress', label: 'กำลังตรวจ' },
    { value: 'done',     label: 'ตรวจแล้ว' },
  ],
  patientType: [
    { value: 'all', label: 'ทุกประเภท' },
    ...TB_PATIENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
    { value: 'suspect', label: 'สงสัยวัณโรค (ยังไม่ขึ้นทะเบียน)' },
  ],
  doctor: [
    { value: 'all', label: 'ทุกคน' },
    ...Array.from(new Set(getTbQueueRows().map((r) => r.doctor))).map((d) => ({ value: d, label: d })),
  ],
};
const FILTER_DEFAULTS = {
  status: 'all',
  patientType: 'all',
  doctor: 'all',
  dateValue: { quick: 'today' },
};
const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const renderQueue = (row) => (
  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.queue}</ColorfulBadge>
);

const renderType = (row) => {
  const type = resolveTbPatientType(row.patientType);
  if (!type) {
    return (
      <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สงสัยวัณโรค</ColorfulBadge>
    );
  }
  return (
    <ColorfulBadge style={TB_PATIENT_TYPE_BADGE[row.patientType] || 'grey'} size='small' hierarchy='secondary'>
      {type.label}
    </ColorfulBadge>
  );
};

const renderRegistry = (row) => (
  row.registryNo
    ? `${row.registryNo} · เดือนที่ ${row.treatmentMonth ?? 0}`
    : '—'
);

const renderRights = (row) => (
  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
    {row.rightsExpired && (
      <ColorfulBadge style='red' size='small' hierarchy='secondary'>สิทธิหมดอายุ</ColorfulBadge>
    )}
    <span
      className='truncate'
      style={{
        maxWidth: 180,
        color: row.rightsExpired ? 'var(--text-danger-default, #C72121)' : 'var(--text-content-secondary)',
        fontSize: 'var(--type-size-sm)',
      }}
    >
      {row.rights}
    </span>
  </span>
);

const renderTelemedicine = (row) => (
  row.telemedicine ? <ColorfulIconBadge style='blue' size='medium' fill='default' icon='videocam' /> : null
);

const renderDotToday = (row) => (
  row.dotToday
    ? <ColorfulBadge style='purple' size='small' hierarchy='secondary'>นัด DOT</ColorfulBadge>
    : null
);

const queueRowToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.doctor,
  value: row.name,
  badges: [
    { label: row.queue, tone: 'teal' },
    { label: row.hn, tone: 'indigo' },
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const TbQueuePage = () => {
  const history = useHistory();
  /* หน้านี้เดิมไม่มีแถบแท็บเลย — เพิ่มแท็บเดียว "คิววันนี้" เพื่อให้ shell มีที่
     ต่อแท็บ "นัดล่วงหน้า" ให้ (มติผู้ใช้ 29 ส.ค. 69) คิวของวันยังเป็นเนื้อหาเดิม
     ทั้งหมด แท็บแรกจึงไม่เปลี่ยนพฤติกรรมอะไร */
  const [activeTab, setActiveTab] = useState('waiting');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const rows = useMemo(() => getTbQueueRows(), []);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const isAllDefault =
    filters.status === FILTER_DEFAULTS.status &&
    filters.patientType === FILTER_DEFAULTS.patientType &&
    filters.doctor === FILTER_DEFAULTS.doctor &&
    filters.dateValue.quick === FILTER_DEFAULTS.dateValue.quick;

  const filtersActive = !isAllDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters(FILTER_DEFAULTS);
    setSearchQ('');
    setPage(1);
  });

  const summaryCards = useMemo(() => ([
    { key: 'waiting',  label: 'รอตรวจ',        value: rows.filter((r) => r.statusKey === 'waiting').length,  color: 'info',     icon: 'schedule' },
    { key: 'progress', label: 'กำลังตรวจ',      value: rows.filter((r) => r.statusKey === 'progress').length, color: 'warning',  icon: 'assignment' },
    { key: 'done',     label: 'ตรวจแล้ว',       value: rows.filter((r) => r.statusKey === 'done').length,     color: 'positive', icon: 'check_circle' },
    { key: 'dot',      label: 'นัด DOT วันนี้',  value: rows.filter((r) => r.dotToday).length,                 color: 'info',     icon: 'medication' },
  ]), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (filters.status !== 'all') result = result.filter((r) => r.statusKey === filters.status);
    if (filters.patientType !== 'all') {
      result = filters.patientType === 'suspect'
        ? result.filter((r) => !r.patientType)
        : result.filter((r) => r.patientType === filters.patientType);
    }
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    /* date chip is a visual placeholder — the mock roster is today-only,
       same convention as OPD/ANC queue pages. */
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((row) =>
        [row.queue, row.hn, row.name, row.idCard, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [rows, filters, searchQ]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrivalCompare = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(arrivalCompare);

    const NUMERIC_KEYS = ['status', 'wait', 'registry'];
    const normalize = (row, key) => {
      switch (key) {
        case 'status':   return STATUS_SORT_ORDER[row.statusKey] ?? 99;
        case 'wait':     return row.waitMinutes ?? 0;
        case 'registry': return row.treatmentMonth ?? -1;
        case 'type':     return resolveTbPatientType(row.patientType)?.label ?? 'สงสัย';
        default:         return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = NUMERIC_KEYS.includes(sortConfig.key)
        ? Number(av) - Number(bv)
        : collator.compare(String(av), String(bv));
      if (primary !== 0) return sign * primary;
      return arrivalCompare(a, b);
    });
  }, [filtered, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => (prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }));
  };

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleRowClick = (row) => history.push({
    pathname: '/clinic/tb/record',
    state: { hn: row.hn, queue: row.queue, name: row.name },
  });

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = rows.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return rows.find((row) =>
      [row.queue, row.hn, row.name, row.idCard, row.doctor].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    const matches = [];
    const seen = new Set();
    for (const row of rows) {
      if (matches.length >= 8) break;
      if (seen.has(row.hn)) continue;
      if ([row.queue, row.hn, row.name, row.idCard, row.doctor].some((f) => f && f.toLowerCase().includes(q))) {
        seen.add(row.hn);
        matches.push(queueRowToSearchItem(row));
      }
    }
    return matches;
  }, [searchQ, rows]);

  const renderName = (row) => (
    <MaskedWorklistName
      name={row.name}
      recordKey={row.hn || row.queue}
      linkTo={{ pathname: '/clinic/tb/record', state: { hn: row.hn, queue: row.queue, name: row.name } }}
    />
  );

  const renderStatus = (row) => {
    const badge = STATUS_BADGE[row.statusKey] || STATUS_BADGE.waiting;
    return <ColorfulBadge style={badge.style} size='small' hierarchy='secondary'>{badge.label}</ColorfulBadge>;
  };

  const renderActions = (row) => (
    <BrandSubdueButton
      variant={row.statusKey === 'done' ? 'outline' : 'fill'}
      size='sm'
      leadingIcon={row.statusKey === 'done' ? 'visibility' : 'stethoscope'}
      onClick={(e) => { e.stopPropagation(); handleRowClick(row); }}
    >
      {row.statusKey === 'done' ? 'ดูบันทึก' : 'เปิดบันทึกการตรวจ'}
    </BrandSubdueButton>
  );

  const columns = useMemo(() => ([
    { key: 'queue',    label: 'คิว',  render: renderQueue },
    { key: 'hn',       label: 'HN' },
    { key: 'name',     label: 'ชื่อ-นามสกุล',      flex: true, minWidth: 170, render: renderName },
    { key: 'type',     label: 'ประเภทผู้ป่วย', render: renderType },
    { key: 'registry', label: 'ทะเบียน / เดือนที่', render: renderRegistry },
    { key: 'rights',   label: 'สิทธิ', render: renderRights },
    { key: 'telemed',  label: 'Telemedicine', align: 'center', sortable: false, render: renderTelemedicine },
    { key: 'dot',      label: 'DOT วันนี้', align: 'center', sortable: false, render: renderDotToday },
    { key: 'doctor',   label: 'แพทย์',            flex: true, minWidth: 150 },
    { key: 'wait',     label: 'รอนาน',  render: (r) => (r.waitMinutes ? `${r.waitMinutes} นาที` : '—') },
    { key: 'status',   label: 'สถานะ', render: renderStatus },
    { key: 'actions',  label: 'การดำเนินการ', sortable: false, render: withEmrRowAction(renderActions) },
  ]), []);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุก worklist ของบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='คิวการรักษาคลินิกวัณโรค'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='clinical_notes' onClick={() => history.push('/clinic/tb/registry')}>
            ทะเบียนวัณโรค
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='monitoring' onClick={() => history.push('/clinic/tb/follow-up')}>
            ติดตามการดูแล
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='person_search' onClick={() => history.push('/clinic/tb/screening')}>
            คัดกรองกลุ่มเสี่ยง
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
      tabs={[{ key: 'waiting', label: 'คิววันนี้', icon: 'schedule', count: rows.length }]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      /* แท็บ "นัดล่วงหน้า" — shell เป็นคนเติมแท็บและวาดเนื้อหา */
      upcoming={{ depts: ['อายุรกรรม'] }}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
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
              placeholder='ค้นหาคิว / HN / ชื่อ-สกุล / เลขบัตรประชาชน / แพทย์'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown prefix='สถานะ:' options={FILTER_OPTIONS.status} value={filters.status} onChange={setFilter('status')} />
              <FilterDropdown prefix='ประเภทผู้ป่วย:' options={FILTER_OPTIONS.patientType} value={filters.patientType} onChange={setFilter('patientType')} />
              <FilterDropdown prefix='แพทย์:' options={withDoctorAvatars(FILTER_OPTIONS.doctor)} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick={FILTER_DEFAULTS.dateValue.quick}
                quickLabels={DATE_CHIP_LABELS}
              />
            <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
<SearchResultCount found={sortedRows.length} total={rows.length} />

          {rows.length === 0 ? (
            <div className='flex flex-col items-center text-center w-full' style={{ paddingTop: 'var(--dim-space-800)', paddingBottom: 'var(--dim-space-800)', gap: 'var(--dim-space-300)' }}>
              <Icon name='pulmonology' size={40} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
              <span style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-base)' }}>
                วันนี้ยังไม่มีคิวคลินิกวัณโรค
              </span>
              <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm)' }}>
                คิวจะปรากฏเมื่อผู้รับบริการลงทะเบียนเข้าคลินิกวัณโรคที่จุดคัดกรอง
              </span>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                rows={pageRows}
                rowKey={(row) => row.hn}
                sortConfig={sortConfig}
                onSort={handleSort}
                onRowClick={handleRowClick}
                stickyColCount={3}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบรายการที่ตรงกับการค้นหา / ตัวกรอง'
              />

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
                <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  {`แสดง ${rangeStart}–${rangeEnd} จาก ${sortedRows.length} รายการ`}
                </span>
                <div className='flex-1' />
                <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
          </SmoothFilterResults>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default TbQueuePage;
