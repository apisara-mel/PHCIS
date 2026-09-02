import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import Textarea from '@/components/forms/Textarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  hasSchoolHealthRights, setSchoolHealthRights,
  formatShDate, todayIso, thNum,
} from '@/data/schoolHealthCore';
import { schoolOptions, gradeOptionsForSchool } from '@/data/schoolHealthSchools';
import { getActiveStudents, rightLabel, rightStyle } from '@/data/schoolHealthStudents';
import {
  getQueueRows, getScheduledNotArrived, cancelQueue, restoreQueue,
  setQueueStatus, QUEUE_STATUS, SERVICE_TYPES, getDashboardData,
} from '@/data/schoolHealthServices';
import {
  PagerRow, ReadOnlyBanner, NoticeBar,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* SchoolHealthQueuePage — หน้า landing ของงานอนามัยโรงเรียน (TOR §3.3.1 / §3.3.4)

   โครงหน้าเหมือน AncQueuePage เป๊ะ (tabs + search + filter row + sort +
   pagination "แสดง X–Y จาก Z รายการ") เปลี่ยนเฉพาะหมวดตัวกรองให้เป็นบริบท
   โรงเรียน (โรงเรียน / ชั้น / กิจกรรมบริการ) และคอลัมน์เป็น
   โรงเรียน-ชั้น-ห้อง แทนอายุครรภ์/ความเสี่ยง

   TOR 3.3.4 กำหนดว่าต้องเห็น "นักเรียนทั้งหมด" และ "ตรวจเสร็จแล้ว" →
   การ์ดสรุปบนสุดจึงมีทั้งจำนวนนักเรียนในความดูแลทั้งหมด (ไม่ใช่แค่คิววันนี้)
   และจำนวนที่ตรวจเสร็จแล้ว */

const breadcrumb = ['บันทึกการรักษา', 'งานอนามัยโรงเรียน', 'คิวให้บริการ'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:school-health-queue';
const PAGE_SIZE = 20;

const TAB_PREDICATE = {
  waiting: (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  done: (r) => r.statusKey === 'done',
  draft: (r) => r.statusKey === 'draft',
};

const STATUS_SORT_ORDER = { waiting: 0, progress: 1, done: 2, draft: 3 };

const SchoolHealthQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState({
    school: 'all', grade: 'all', service: 'all', dateValue: { quick: 'today' },
  });
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [toast, setToast] = useState('');

  const canWrite = hasSchoolHealthRights();

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getQueueRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scheduled = useMemo(() => getScheduledNotArrived(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allStudents = useMemo(() => getActiveStudents(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dashboard = useMemo(() => getDashboardData(), [tick]);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isDefault = filters.school === 'all'
    && filters.grade === 'all'
    && filters.service === 'all'
    && filters.dateValue?.quick === 'today';
  const filtersActive = !isDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters({ school: 'all', grade: 'all', service: 'all', dateValue: { quick: 'today' } });
    setSearchQ('');
    setPage(1);
  });

  /* แท็บ "รายชื่อผู้ป่วยทั้งหมด" เป็นทะเบียน ไม่ใช่คิว — จึงรวมนักเรียนที่นัดไว้
     วันนี้แต่ยังไม่มาติดต่อ (กลุ่มนี้ยังไม่มีคิว/เวลามาถึง · มติผู้ใช้ 3 ก.ย. 69) */
  const registryRows = useMemo(() => ([
    ...rows,
    ...scheduled.map((r) => ({ ...r, statusKey: 'scheduled' })),
  ]), [rows, scheduled]);

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.length },
    { key: 'waiting', label: 'รอตรวจ', icon: 'schedule', count: rows.filter(TAB_PREDICATE.waiting).length },
    { key: 'progress', label: 'กำลังตรวจ', icon: 'assignment', count: rows.filter(TAB_PREDICATE.progress).length },
    { key: 'done', label: 'ตรวจเสร็จแล้ว', icon: 'check_circle', count: rows.filter(TAB_PREDICATE.done).length },
    { key: 'draft', label: 'ที่ร่างไว้', icon: 'save', count: rows.filter(TAB_PREDICATE.draft).length },
    { key: 'directory', label: 'รายชื่อผู้ป่วยทั้งหมด', icon: 'groups', count: registryRows.length },
  ]), [rows, registryRows]);

  const summaryCards = useMemo(() => ([
    { key: 'students', label: 'นักเรียนในความดูแลทั้งหมด', value: thNum(allStudents.length), color: 'info', icon: 'school' },
    { key: 'queue', label: 'คิวให้บริการวันนี้', value: thNum(rows.length), color: 'info', icon: 'directions_walk' },
    { key: 'done', label: 'ตรวจเสร็จแล้ววันนี้', value: thNum(rows.filter(TAB_PREDICATE.done).length), color: 'positive', icon: 'check_circle' },
    { key: 'waiting', label: 'รอตรวจ/กำลังตรวจ', value: thNum(rows.filter((r) => r.statusKey === 'waiting' || r.statusKey === 'progress').length), color: 'warning', icon: 'hourglass_top' },
    { key: 'followup', label: 'ต้องเก็บตก', value: thNum(dashboard.followUp.length), color: 'warning', icon: 'fast_forward' },
  ]), [allStudents, rows, dashboard]);

  const filtered = useMemo(() => {
    let result = activeTab === 'directory' ? registryRows : rows;
    const pred = TAB_PREDICATE[activeTab];
    if (pred) result = result.filter(pred);
    if (filters.school !== 'all') result = result.filter((r) => r.schoolId === filters.school);
    if (filters.grade !== 'all') result = result.filter((r) => r.grade === filters.grade);
    if (filters.service !== 'all') result = result.filter((r) => r.serviceType === filters.service);
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => [r.queue, r.hn, r.fullName, r.schoolName, r.roomName, r.studentNo]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, registryRows, activeTab, filters, searchQ]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const byQueue = (a, b) => String(a.queue).localeCompare(String(b.queue));
    if (!sortConfig.key) return [...filtered].sort(byQueue);
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    const normalize = (row, key) => {
      if (key === 'status') return STATUS_SORT_ORDER[row.statusKey] ?? 99;
      if (key === 'name') return row.fullName;
      if (key === 'room') return `${row.gradeName} ${row.roomName}`;
      if (key === 'service') return row.serviceLabel;
      return row[key] ?? '';
    };
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : byQueue(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const openProfile = (row) => history.push(`/clinic/school-health/student/${row.studentId || row.id}`);

  const handleSort = (key) => setSortConfig((prev) => (prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' }));

  const confirmCancel = () => {
    if (!cancelReason.trim()) { setCancelError('กรุณาระบุเหตุผลการยกเลิกคิว'); return; }
    cancelQueue(cancelTarget.studentId, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setTick((t) => t + 1);
    setToast('ยกเลิกคิวเรียบร้อย — เปิดใช้งานคืนได้จากปุ่มในแถวเดิม');
  };

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.queue, r.hn, r.fullName, r.schoolName].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map((r) => ({
        id: r.studentId,
        label: r.fullName,
        sublabel: `${r.schoolName} · ${r.gradeName} ${r.roomName}`,
        value: r.fullName,
        badges: [{ label: r.queue, tone: 'teal' }, { label: r.hn, tone: 'indigo' }],
      }));
  }, [searchQ, rows]);

  const columns = useMemo(() => ([
    { key: 'queue', label: 'คิว', render: (r) => <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{r.queue}</ColorfulBadge> },
    { key: 'arriveAt', label: 'เวลามาถึง' },
    { key: 'hn', label: 'HN' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุลนักเรียน',
      flex: true,
      minWidth: 190,
      render: (r) => (
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <MaskedWorklistName
            name={r.fullName}
            recordKey={r.hn}
            linkTo={`/clinic/school-health/student/${r.studentId}`}
          />
          {r.confidential ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ</ColorfulBadge>
          ) : null}
        </span>
      ),
    },
    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 190 },
    { key: 'room', label: 'ชั้น/ห้อง', render: (r) => `${r.gradeName} · ${r.roomName}` },
    { key: 'service', label: 'กิจกรรมบริการ', render: (r) => r.serviceLabel },
    { key: 'room2', label: 'จุดให้บริการ', flex: true, minWidth: 170, sortable: false, render: (r) => r.room || '—' },
    {
      key: 'rights',
      label: 'สิทธิพื้นฐาน',
      sortable: false,
      render: (r) => (
        <ColorfulBadge style={r.rightExpired ? 'red' : rightStyle(r.rightType)} size='small' hierarchy='secondary'>
          {r.rightExpired ? 'สิทธิหมดอายุ' : rightLabel(r.rightType)}
        </ColorfulBadge>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        if (r.cancellation) return <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกคิวแล้ว</ColorfulBadge>;
        /* เฉพาะแท็บทะเบียน — นักเรียนที่นัดไว้แต่ยังไม่มาติดต่อ ยังไม่ได้อยู่ในคิว */
        if (r.statusKey === 'scheduled') return <ColorfulBadge style='purple' size='small' hierarchy='secondary'>นัดแล้วยังไม่มา</ColorfulBadge>;
        return <ColorfulBadge style={QUEUE_STATUS[r.statusKey]?.style || 'grey'} size='small' hierarchy='secondary'>{QUEUE_STATUS[r.statusKey]?.label || '—'}</ColorfulBadge>;
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='clinical_notes'
            onClick={(e) => { e.stopPropagation(); openProfile(r); }}
          >
            บันทึกบริการ
          </BrandSubdueButton>
          {r.statusKey !== 'done' && !r.cancellation ? (
            <NeutralSubdueButton
              size='sm'
              leadingIcon='check'
              disabled={!canWrite}
              onClick={(e) => {
                e.stopPropagation();
                if (!canWrite) return;
                setQueueStatus(r.studentId, 'done');
                setTick((t) => t + 1);
                setToast(`ปิดคิว ${r.queue} เป็น "ตรวจเสร็จแล้ว"`);
              }}
            >
              ปิดคิว
            </NeutralSubdueButton>
          ) : null}
          {r.cancellation ? (
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={(e) => {
                e.stopPropagation();
                if (!canWrite) return;
                restoreQueue(r.studentId);
                setTick((t) => t + 1);
                setToast('เปิดใช้งานคิวอีกครั้งแล้ว');
              }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <DangerSubdueButton
              size='sm'
              disabled={!canWrite}
              onClick={(e) => {
                e.stopPropagation();
                if (!canWrite) return;
                setCancelReason('');
                setCancelError('');
                setCancelTarget(r);
              }}
            >
              ยกเลิกคิว
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
    /* แท็บทะเบียนตัดคอลัมน์ที่เป็นเรื่องของคิววันนี้ออก — แถวที่นัดไว้แต่ยังไม่มา
       ยังไม่มีเลขคิวและเวลามาถึง */
  ].filter((c) => !(activeTab === 'directory' && ['queue', 'arriveAt'].includes(c.key)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [canWrite, tick, activeTab]);

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='คิวให้บริการงานอนามัยโรงเรียน'
      summaryTitle='คิวให้บริการงานอนามัยโรงเรียน'
      summaryCards={summaryCards}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={() => { setSchoolHealthRights(!hasSchoolHealthRights()); setTick((t) => t + 1); }}
            title='สลับสิทธิปฏิบัติงานอนามัยโรงเรียน (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='apartment' onClick={() => history.push('/clinic/school-health/schools')}>
            ทะเบียนโรงเรียน
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='groups' onClick={() => history.push('/clinic/school-health/students')}>
            ทะเบียนนักเรียน
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => history.push('/clinic/school-health/dashboard')}>
            Dashboard
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='summarize' onClick={() => history.push('/clinic/school-health/reports')}>
            รายงาน
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' size='sm' leadingIcon='vaccines' onClick={() => history.push('/clinic/school-health/batch-vaccine')}>
            บันทึกรายห้อง (Batch)
          </BrandSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกคิวให้บริการ'
        subtitle={cancelTarget ? `${cancelTarget.queue} · ${cancelTarget.fullName} · ${cancelTarget.schoolName}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกคิว', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NoticeBar tone='info' icon='info'>
            คิวจะไม่ถูกลบ — ระบบเก็บแถวเดิมไว้ในสถานะ &quot;ยกเลิกคิวแล้ว&quot; พร้อมเหตุผลและผู้ยกเลิก
            และเปิดใช้งานคืนได้จากปุ่มในแถวเดิม
          </NoticeBar>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
            error={cancelError || undefined}
            placeholder='เช่น นักเรียนขาดเรียน / ผู้ปกครองขอเลื่อนรอบบริการ'
          />
        </div>
      </Popup>

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        <ReadOnlyBanner show={!canWrite} />

        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                setPage(1);
                pushHistory(item ?? label);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหาคิว / HN / ชื่อนักเรียน / โรงเรียน'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown
                prefix='โรงเรียน:'
                options={schoolOptions()}
                value={filters.school}
                onChange={(v) => { setFilter('school')(v); setFilters((f) => ({ ...f, grade: 'all' })); }}
              />
              <FilterDropdown
                prefix='ชั้น:'
                options={gradeOptionsForSchool(filters.school === 'all' ? null : filters.school)}
                value={filters.grade}
                onChange={setFilter('grade')}
              />
              <FilterDropdown
                prefix='กิจกรรม:'
                options={[{ value: 'all', label: 'ทุกกิจกรรม' }, ...SERVICE_TYPES.map((t) => ({ value: t.value, label: t.label }))]}
                value={filters.service}
                onChange={setFilter('service')}
              />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick='today'
                quickLabels={{ today: 'วันนี้', yesterday: 'เมื่อวาน' }}
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={sortedRows.length} total={activeTab === 'directory' ? registryRows.length : rows.length} unit='คิว' />

            <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onRowClick={openProfile}
                  stickyColCount={3}
                  stickyRightColCount={1}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบคิวที่ตรงกับเงื่อนไข'
                  emptySubtext='ลองล้างตัวกรอง หรือเลือกแท็บ "ทั้งหมด" เพื่อดูคิวทุกสถานะ'
                />
                <PagerRow page={page} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPage} unit='คิว' sticky />
            </>
          </SmoothFilterResults>
        </div>

        <NoticeBar tone='info' icon='info'>
          {`คิววันที่ ${formatShDate(todayIso())} · ชื่อนักเรียนใน worklist ถูกปิดบังตามข้อกำหนดข้อมูลลับ (§1.4.2) — คลิกชื่อเพื่อขอเปิดเผยชั่วคราว 30 นาที · การให้บริการ ${SERVICE_TYPES.map((t) => t.label).join(' · ')} บันทึกได้จากหน้าข้อมูลนักเรียน`}
        </NoticeBar>
      </div>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SchoolHealthQueuePage;
