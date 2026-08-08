import React, { useMemo, useState } from 'react';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Badge from '@/components/badge/Badge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import PharmacySubNav, { PharmacyAddDrugButton } from '@/components/pharmacy/PharmacySubNav';
import PharmacyMedicationHistoryPopup from '@/components/pharmacy/PharmacyMedicationHistoryPopup';
import { buildPatientsSummaryCards } from '@/pages/pharmacy/pharmacySummaryCards';
import { PHARMACY_WORKLIST_CARD_BODY } from '@/pages/pharmacy/pharmacyContentCard';
import { MR_PATIENTS, MR_STATUS, MR_LIFE_STATUS, lifeStatusLabel } from '@/data/mrPatients';
import { PHARMACY_QUEUE } from '@/data/pharmacyQueue';
import QueuePatientAvatar, { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';

/* ผู้รับบริการทั้งหมด — MPI lookup across the whole patient roster (not
   today's dispense-queue status filter). ดูประวัติการรับยา opens an
   in-page popup (PharmacyMedicationHistoryPopup). */

const breadcrumb = ['ระบบงานเภสัชกรรม', 'ผู้รับบริการทั้งหมด'];
const PAGE_SIZE = 20;

const STATUS_BY_KEY = Object.fromEntries(MR_STATUS.map((s) => [s.key, s.label]));

const STATUS_PILL = {
  active:   { style: 'success', label: 'Active' },
  inactive: { style: 'neutral', label: 'Inactive' },
  pending:  { style: 'warning', label: 'รอลงทะเบียน' },
  draft:    { style: 'info',    label: 'ที่ร่างไว้' },
};

const REG_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...MR_STATUS.map((s) => ({ value: s.key, label: s.label })),
];

const LIFE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  ...MR_LIFE_STATUS.map((s) => ({ value: s.key, label: s.label })),
];

const RX_TODAY_FILTER_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'yes', label: 'มีใบสั่งวันนี้' },
  { value: 'no',  label: 'ไม่มีใบสั่งวันนี้' },
];

const patientName = (p) => `${p.prefixTh || ''}${p.firstNameTh} ${p.lastNameTh}`.trim();

const renderLifeStatus = (p) => {
  const status = p.lifeStatus || 'alive';
  if (status === 'deceased') {
    return (
      <StatusBadge style='neutral' size='small' showDot>
        {lifeStatusLabel(status)}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge style='success' size='small' showDot>
      {lifeStatusLabel(status)}
    </StatusBadge>
  );
};

const PharmacyPatientsPage = () => {
  const [searchQ, setSearchQ] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('all');
  const [lifeFilter, setLifeFilter] = useState('all');
  const [rxTodayFilter, setRxTodayFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [historyPatient, setHistoryPatient] = useState(null);

  const rxCountByHn = useMemo(() => {
    const map = new Map();
    PHARMACY_QUEUE.forEach((r) => {
      map.set(r.hn, (map.get(r.hn) || 0) + 1);
    });
    return map;
  }, []);

  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const filtersActive = regStatusFilter !== 'all'
    || lifeFilter !== 'all'
    || rxTodayFilter !== 'all'
    || searchQ.trim() !== '';

  const clearFilters = () => {
    setRegStatusFilter('all');
    setLifeFilter('all');
    setRxTodayFilter('all');
    setSearchQ('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    let rows = MR_PATIENTS;
    if (regStatusFilter !== 'all') {
      rows = rows.filter((p) => p.status === regStatusFilter);
    }
    /* TOR §1.1.1.2 — filter สถานะชีวิต (same axis as registration directory). */
    if (lifeFilter !== 'all') {
      rows = rows.filter((p) => (p.lifeStatus || 'alive') === lifeFilter);
    }
    if (rxTodayFilter === 'yes') {
      rows = rows.filter((p) => (rxCountByHn.get(p.hn) || 0) > 0);
    } else if (rxTodayFilter === 'no') {
      rows = rows.filter((p) => (rxCountByHn.get(p.hn) || 0) === 0);
    }
    const q = searchQ.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const name = patientName(p).toLowerCase();
      const nameEn = `${p.firstNameEn || ''} ${p.lastNameEn || ''}`.toLowerCase();
      return (
        p.hn.toLowerCase().includes(q)
        || (p.nationalId || '').replace(/-/g, '').includes(q.replace(/-/g, ''))
        || name.includes(q)
        || nameEn.includes(q)
        || (p.phone || '').replace(/-/g, '').includes(q.replace(/-/g, ''))
      );
    });
  }, [searchQ, regStatusFilter, lifeFilter, rxTodayFilter, rxCountByHn]);

  /* Column-header sort — same pattern as PharmacyQueuePage: only applied
     once the pharmacist clicks a header (null key keeps insertion order). */
  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'patient':    return patientName(row);
        case 'age':        return row.age ?? -1;
        case 'rxToday':    return rxCountByHn.get(row.hn) || 0;
        case 'lifeStatus': return lifeStatusLabel(row.lifeStatus);
        case 'status':     return STATUS_PILL[row.status]?.label || STATUS_BY_KEY[row.status] || row.status || '';
        default:           return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [filtered, sortConfig, rxCountByHn]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedRows.length);

  const summaryCards = useMemo(
    () => buildPatientsSummaryCards(MR_PATIENTS, { rxCountByHn }),
    [rxCountByHn],
  );

  const columns = [
    {
      key: 'patient',
      label: 'ผู้รับบริการ',
      flex: true,
      minWidth: 240,
      render: (p) => {
        const name = patientName(p);
        const avatar = resolveQueuePatientAvatarProps({ hn: p.hn, displayName: name });
        return (
          <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
            <QueuePatientAvatar size={36} {...avatar} />
            <div className='flex flex-col min-w-0 flex-1'>
              <MaskedWorklistName
                name={name}
                recordKey={p.hn}
                className='min-w-0 truncate'
              />
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                HN {p.hn}
              </span>
            </div>
          </div>
        );
      },
    },
    { key: 'gender', label: 'เพศ', render: (p) => p.gender || '—' },
    { key: 'age', label: 'อายุ', render: (p) => (p.age != null ? `${p.age} ปี` : '—') },
    { key: 'rights', label: 'สิทธิ', render: (p) => p.rights || '—' },
    { key: 'phone', label: 'โทรศัพท์', render: (p) => p.phone || '—' },
    {
      key: 'lifeStatus',
      label: 'สถานะชีวิต',
      render: renderLifeStatus,
    },
    {
      key: 'rxToday',
      label: 'ใบสั่งวันนี้',
      align: 'center',
      render: (p) => {
        const n = rxCountByHn.get(p.hn) || 0;
        return n > 0
          ? <Badge style='info' size='small'>{n}</Badge>
          : <span style={{ color: 'var(--text-content-tertiary)' }}>—</span>;
      },
    },
    {
      key: 'status',
      label: 'สถานะทะเบียน',
      render: (p) => {
        const pill = STATUS_PILL[p.status] || { style: 'neutral', label: STATUS_BY_KEY[p.status] || p.status };
        return <Badge style={pill.style} size='small'>{pill.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      align: 'center',
      sortable: false,
      render: (p) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='history'
          onClick={(e) => {
            e.stopPropagation();
            setHistoryPatient(p);
          }}
          aria-label={`ดูประวัติการรับยาของ HN ${p.hn}`}
        >
          ดูประวัติการรับยา
        </BrandSubdueButton>
      ),
    },
  ];

  return (
    <>
    <QueuePageShell
      activeKey='pharmacy'
      breadcrumb={breadcrumb}
      title='ระบบงานเภสัชกรรม'
      summaryCards={summaryCards}
      actions={<PharmacyAddDrugButton />}
      belowSummary={<PharmacySubNav />}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        <div className='w-full flex flex-col' style={PHARMACY_WORKLIST_CARD_BODY}>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(v) => { setSearchQ(v); setPage(1); }}
              placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุล / เบอร์โทร'
              width={640}
            />
          </div>

          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <FilterDropdown
              prefix='สถานะทะเบียน :'
              options={REG_STATUS_FILTER_OPTIONS}
              value={regStatusFilter}
              onChange={(v) => { setRegStatusFilter(v); setPage(1); }}
            />
            <FilterDropdown
              prefix='สถานะชีวิต :'
              options={LIFE_FILTER_OPTIONS}
              value={lifeFilter}
              onChange={(v) => { setLifeFilter(v); setPage(1); }}
            />
            <FilterDropdown
              prefix='ใบสั่งวันนี้ :'
              options={RX_TODAY_FILTER_OPTIONS}
              value={rxTodayFilter}
              onChange={(v) => { setRxTodayFilter(v); setPage(1); }}
            />
            {filtersActive ? (
              <FilterTag
                variant='neutral'
                leadingIcon='close'
                value='ล้างตัวกรอง'
                showTitle={false}
                onClick={clearFilters}
              />
            ) : null}
          </div>

          <div className='flex flex-col' style={{ minHeight: 'calc(100vh - 420px)' }}>
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={(p) => p.hn}
              sortConfig={sortConfig}
              onSort={handleSort}
              stickyColCount={1}
              stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
              onRowClick={(p) => setHistoryPatient(p)}
              emptyMessage={filtersActive ? 'ไม่พบผู้รับบริการที่ตรงกับตัวกรอง' : 'ยังไม่มีผู้รับบริการในระบบ'}
              emptySubtext={filtersActive ? 'ลองล้างตัวกรองหรือแก้คำค้นหา' : null}
            />
          </div>

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
              แสดง {rangeStart}–{rangeEnd} จาก {sortedRows.length} รายการ
            </span>
            <div className='flex-1' />
            <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>
    </QueuePageShell>

    <PharmacyMedicationHistoryPopup
      open={Boolean(historyPatient)}
      onClose={() => setHistoryPatient(null)}
      hn={historyPatient?.hn || ''}
      patientName={historyPatient ? patientName(historyPatient) : ''}
    />
    </>
  );
};

export default PharmacyPatientsPage;
