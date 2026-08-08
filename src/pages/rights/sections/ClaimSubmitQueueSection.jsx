import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Table, { EllipsisText } from '@/components/table/Table';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Alert from '@/components/alert/Alert';
import Pagination from '@/components/pagination/Pagination';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { EmptyState, T, useRightsClaimTick } from '@/pages/rights/rightsUi';
import { computeQuickRange, computeQuickSingle } from '@/components/popup/DateFilterPopup';
import {
  RIGHTS_VISITS,
  SUBMIT_STATUSES,
  submitStatusOf,
  submitStatusMeta,
  rightsById,
  clinicLabelOf,
  principalDx,
  maskNationalId,
  parseThaiBuddhistDate,
} from '@/data/rightsClaimStore';

/* §1.7.3.1 — "ค้นหารายชื่อผู้รับบริการที่ Close Visit ได้ แล้วแสดงข้อมูลสิทธิ
   คลินิก แพทย์ รหัสโรค/รหัสหัตถการ ตามข้อมูลการรับบริการครั้งนั้น".

   This is the list half. Clicking a row opens /rights/submit/:visitId where
   the same visit is shown in full and can be edited/confirmed (§1.7.3.2–.6).

   The rows are mock Close-Visit records in rightsClaimStore, NOT derived
   from the real OPD/treatment queues — this module must not read or patch
   src/pages/opd, so เลขที่การมารับบริการ is a synthetic sequence. */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:rights-submit';
const PAGE_SIZE = 10;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/* Reuses DateFilterPopup's own quick-range maths so the chip and the table
   agree on what "7 วันที่ผ่านมา" means (same approach as
   financePaymentPrototype's matchesDateFilter). */
const matchesDateFilter = (thaiDateStr, filterValue) => {
  const date = parseThaiBuddhistDate(thaiDateStr);
  if (!date) return true;
  const quick = filterValue?.quick;
  if (!quick) return true;
  if (quick === 'custom') {
    if (filterValue.tab === 'single' && filterValue.single) {
      return date.getTime() === startOfDay(filterValue.single).getTime();
    }
    if (filterValue.tab === 'range' && filterValue.range?.start && filterValue.range?.end) {
      return date.getTime() >= startOfDay(filterValue.range.start).getTime()
        && date.getTime() <= startOfDay(filterValue.range.end).getTime();
    }
    return true;
  }
  const single = computeQuickSingle(quick);
  if (single) return date.getTime() === single.getTime();
  const range = computeQuickRange(quick);
  if (range) return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
  return true;
};

const visitToSearchItem = (v) => ({
  id: v.id,
  label: v.patient.shortName,
  sublabel: `${v.visitNo} · ${clinicLabelOf(v)}`,
  value: v.patient.shortName,
  avatarSrc: v.patient.avatarUrl,
  badges: [
    { label: v.hn, tone: 'indigo' },
    { label: v.visitDate, tone: 'teal' },
  ],
});

const ClaimSubmitQueueSection = ({ role }) => {
  const history = useHistory();
  /* The store mutates RIGHTS_VISITS in place, so `tick` (not the array
     reference) is what tells the memos below that a visit changed. */
  const tick = useRightsClaimTick();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [dateFilter, setDateFilter] = useState({ quick: '30days' });
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const { history: searchHistory, push: pushHistory, clear: clearHistory } = useSearchHistory(SEARCH_HISTORY_KEY);

  /* Any filter change resets to page 1 — otherwise a narrowed result set
     can leave the user staring at an empty page 3. */
  useEffect(() => { setPage(1); }, [query, status, dateFilter]);

  const dateRows = useMemo(
    () => RIGHTS_VISITS.filter((v) => matchesDateFilter(v.visitDate, dateFilter)),
    [dateFilter, tick],
  );

  const statusRows = useMemo(
    () => (status === 'all' ? dateRows : dateRows.filter((v) => submitStatusOf(v) === status)),
    [dateRows, status, tick],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return statusRows;
    return statusRows.filter((v) => [
      v.visitNo, v.hn, v.patient.shortName, v.patient.fullName, v.patient.nationalId,
      clinicLabelOf(v), v.doctor, principalDx(v)?.code,
    ].some((f) => f && String(f).toLowerCase().includes(q)));
  }, [statusRows, query, tick]);

  const SORTERS = {
    visitDate:  (v) => parseThaiBuddhistDate(v.visitDate)?.getTime() || 0,
    hn:         (v) => v.hn,
    patient:    (v) => v.patient.shortName,
    rights:     (v) => rightsById(v.billingRightsId)?.name || '',
    clinic:     (v) => clinicLabelOf(v),
    doctor:     (v) => v.doctor,
    dx:         (v) => principalDx(v)?.code || '',
    procedures: (v) => v.icd9.length,
    status:     (v) => SUBMIT_STATUSES.findIndex((s) => s.key === submitStatusOf(v)),
  };

  const sortedRows = useMemo(() => {
    const accessor = SORTERS[sortConfig.key];
    if (!accessor) return rows;
    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }, [rows, sortConfig]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return RIGHTS_VISITS
      .filter((v) => [v.visitNo, v.hn, v.patient.shortName].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(visitToSearchItem);
  }, [query]);

  const statusTabs = [
    { key: 'all', label: 'ทั้งหมด', icon: 'list', count: dateRows.length },
    ...SUBMIT_STATUSES.map((s) => ({
      key: s.key,
      label: s.label,
      icon: s.icon,
      count: dateRows.filter((v) => submitStatusOf(v) === s.key).length,
    })),
  ];

  const filtersActive = query.trim() !== '' || status !== 'all' || dateFilter?.quick !== '30days';

  const columns = [
    {
      key: 'visitDate', label: 'วันที่รับบริการ', width: 160,
      render: (v) => (
        <div className='flex flex-col min-w-0'>
          <span style={T.value}>{v.visitDate}</span>
          <span style={T.muted}>{v.visitTime} น. · {v.visitNo}</span>
        </div>
      ),
    },
    {
      key: 'patient', label: 'HN / ชื่อ-สกุล', flex: true, minWidth: 220,
      render: (v) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={v.patient.shortName} />
          {/* §1.4.2 — เลขบัตรประชาชนใน list แสดงแบบปิดบังเสมอ */}
          <span style={T.muted}>HN {v.hn} · {maskNationalId(v.patient.nationalId)}</span>
        </div>
      ),
    },
    {
      key: 'rights', label: 'สิทธิ', width: 160,
      render: (v) => {
        const r = rightsById(v.billingRightsId);
        return (
          <div className='flex flex-col items-start min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <ColorfulBadge badgeStyle={r?.badge || 'grey'} size='small'>{r?.code || '-'}</ColorfulBadge>
            {v.rightsExpired && <span style={{ ...T.muted, color: 'var(--text-statusbadge-error, #B91C1C)' }}>สิทธิหมดอายุ</span>}
          </div>
        );
      },
    },
    {
      key: 'clinic', label: 'คลินิก', width: 200,
      render: (v) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={clinicLabelOf(v)} />
          <span style={T.muted}>{v.subClinic}</span>
        </div>
      ),
    },
    { key: 'doctor', label: 'แพทย์ผู้ตรวจ', width: 170, render: (v) => <EllipsisText text={v.doctor} /> },
    {
      key: 'dx', label: 'ICD10 หลัก', width: 190,
      render: (v) => {
        const dx = principalDx(v);
        if (!dx) return <span style={T.muted}>ยังไม่ระบุรหัส</span>;
        return (
          <div className='flex flex-col min-w-0'>
            <span style={T.value}>{dx.code}</span>
            <EllipsisText text={dx.termTh || dx.term} />
          </div>
        );
      },
    },
    {
      key: 'procedures', label: 'ICD9CM', width: 100, align: 'center',
      render: (v) => <span style={T.value}>{v.icd9.length} รายการ</span>,
    },
    {
      key: 'status', label: 'สถานะยืนยัน', width: 150,
      render: (v) => {
        const meta = submitStatusMeta(submitStatusOf(v));
        return <StatusBadge style={meta.color === 'positive' ? 'success' : meta.color} size='small'>{meta.label}</StatusBadge>;
      },
    },
    {
      key: 'confirmedBy', label: 'ผู้ยืนยัน / เวลา', width: 210,
      sortable: false,
      render: (v) => {
        if (v.reworkReason) {
          return (
            <div className='flex flex-col min-w-0'>
              <span style={{ ...T.muted, color: 'var(--text-statusbadge-error, #B91C1C)' }}>ตีกลับให้แก้ไข</span>
              <EllipsisText text={v.reworkReason} />
            </div>
          );
        }
        const c = v.treatmentConfirm.confirmed ? v.treatmentConfirm : null;
        if (!c) return <span style={T.muted}>ยังไม่ยืนยัน</span>;
        return (
          <div className='flex flex-col min-w-0'>
            <EllipsisText text={c.by} />
            <span style={T.muted}>{c.at}</span>
          </div>
        );
      },
    },
    {
      key: 'action', label: '', width: 130, sortable: false,
      render: (v) => (
        <div className='flex items-center justify-end w-full'>
          <BrandSubdueButton
            size='sm'
            trailingIcon='arrow_forward'
            onClick={(e) => { e.stopPropagation(); history.push(`/rights/submit/${v.id}`); }}
          >
            {role.canEdit ? 'ตรวจสอบ' : 'ดูข้อมูล'}
          </BrandSubdueButton>
        </div>
      ),
    },
  ];

  const handleSort = (key) => setSortConfig((prev) => (prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' }));

  const reworkCount = dateRows.filter((v) => v.reworkReason).length;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
      {reworkCount > 0 && (
        <Alert
          type='warning'
          title={`มี ${reworkCount} ครั้งบริการที่ถูกตีกลับให้แก้ไข`}
          subtext='รายการเหล่านี้จะไม่ถูกดึงออกไปในไฟล์ส่งเบิกจนกว่าจะยืนยันข้อมูลการรักษาและรหัสโรคใหม่'
          detail={(
            <div className='flex justify-end w-full'>
              <BrandSubdueButton size='sm' onClick={() => setStatus('needsEdit')}>ดูเฉพาะรายการที่ต้องแก้ไข</BrandSubdueButton>
            </div>
          )}
        />
      )}

      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={query}
          onChange={setQuery}
          onSubmit={(v, item) => {
            const resolved = item?.id ? RIGHTS_VISITS.find((r) => r.id === item.id) : null;
            pushHistory(resolved ? visitToSearchItem(resolved) : v);
            setQuery(v);
            if (resolved) history.push(`/rights/submit/${resolved.id}`);
          }}
          placeholder='ค้นหาเลขที่การมารับบริการ / HN / ชื่อ-สกุล / แพทย์ / รหัส ICD10'
          width={680}
          history={searchHistory}
          onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
          suggestions={suggestions}
        />
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <FilterDateTag
          prefix='วันที่รับบริการ:'
          value={dateFilter}
          onChange={setDateFilter}
          defaultQuick='30days'
        />
        {statusTabs.map((t) => (
          <FilterTag
            key={t.key}
            leadingIcon={t.icon}
            selected={status === t.key}
            onClick={() => setStatus(t.key)}
            value={`${t.label} (${t.count})`}
          />
        ))}
        {filtersActive && (
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            onClick={() => { setQuery(''); setStatus('all'); setDateFilter({ quick: '30days' }); }}
          >
            ล้างตัวกรอง
          </NeutralSubdueButton>
        )}
      </div>

      <span style={T.muted}>
        พบ {sortedRows.length} ครั้งบริการ (Close Visit) จากทั้งหมด {RIGHTS_VISITS.length} รายการ
      </span>

      {sortedRows.length === 0 ? (
        <EmptyState
          icon='search_off'
          title='ไม่พบครั้งบริการที่ตรงกับเงื่อนไข'
          subtext='ลองขยายช่วงวันที่ ยกเลิกตัวกรองสถานะ หรือค้นด้วยเลขที่การมารับบริการแทน'
        />
      ) : (
        <>
          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(v) => v.id}
            sortConfig={sortConfig}
            onSort={handleSort}
            stickyColCount={2}
            onRowClick={(v) => history.push(`/rights/submit/${v.id}`)}
            emptyMessage='ไม่พบครั้งบริการที่ตรงกับเงื่อนไข'
          />
          {pageCount > 1 && (
            <div className='w-full flex items-center justify-between' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={T.muted}>
                แสดง {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedRows.length)} จาก {sortedRows.length} รายการ
              </span>
              <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClaimSubmitQueueSection;
