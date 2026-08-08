import React, { useEffect, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  CHECKUP_STEPS, CHECKUP_TODAY, SPECIMEN_STATUSES, VISIT_STATUSES,
  CANCEL_REASON_SUGGESTIONS, CHECKUP_DOCTORS,
  listVisits, listTodayVisits, listDraftVisitIds, getPackage,
  cancelVisitOrder, restoreVisitOrder, getVisitRecord, getSpecimenTracking,
  formatThaiDate,
} from '@/data/checkupStore';
import {
  PageBody, PageCard, PagerRow, EmptyState, NoticeBar, StepTrackerRow,
} from '@/pages/checkup/CheckupUi';

/* CheckupQueuePage — คิวตรวจสุขภาพ + ติดตามขั้นตอน/สิ่งส่งตรวจ.
   TOR 1.19.10 (รับบริการมากกว่า 1 ครั้งใน 1 โปรแกรม — the "ครั้งที่" column)
   and 1.19.20 (ติดตามขั้นตอนการตรวจและสิ่งส่งตรวจ + รายงานสรุปประจำวัน).

   Search / filter / sort / pager mechanics mirror AncQueuePage verbatim so the
   worklist behaves identically to every other PHCIS queue. */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'คิวตรวจสุขภาพ'];
const SUMMARY_TITLE = 'คิวตรวจสุขภาพวันนี้';
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:checkup-queue';
const PAGE_SIZE = 20;

const TAB_PREDICATE = {
  waiting: (r) => r.statusKey === 'waiting',
  progress: (r) => r.statusKey === 'progress',
  awaitResult: (r) => r.statusKey === 'awaitResult',
  summarised: (r) => r.statusKey === 'summarised',
  draft: (r) => r.statusKey === 'draft' || r.hasDraft,
  cancelled: (r) => r.statusKey === 'cancelled',
};

const STATUS_SORT_ORDER = {
  waiting: 0, progress: 1, awaitResult: 2, draft: 3, summarised: 4, cancelled: 5,
};

const DATE_CHIP_LABELS = { today: 'วันนี้', yesterday: 'เมื่อวาน' };

const FILTER_DEFAULTS = {
  pkg: 'all',
  doctor: 'all',
  round: 'all',
  specimen: 'all',
  dateValue: { quick: 'today' },
};

const CheckupQueuePage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  /* sessionStorage writes (cancel / restore) are not React state — bump to re-derive. */
  const [tick, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const {
    history: searchHistory, push: pushHistory, clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isAllDefault = filters.pkg === 'all'
    && filters.doctor === 'all'
    && filters.round === 'all'
    && filters.specimen === 'all'
    && filters.dateValue?.quick === 'today';

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const allVisits = useMemo(() => listVisits(), [tick]);

  const rows = useMemo(() => {
    const recordDraftIds = new Set(listDraftVisitIds('record'));
    const screeningDraftIds = new Set(listDraftVisitIds('screening'));
    const base = filters.dateValue?.quick === 'today'
      ? allVisits.filter((v) => v.visitDate === CHECKUP_TODAY)
      : allVisits;
    return base.map((v) => ({
      ...v,
      packageName: getPackage(v.packageId)?.name || '—',
      packageCode: getPackage(v.packageId)?.code || '—',
      hasDraft: recordDraftIds.has(v.id) || screeningDraftIds.has(v.id),
      hasRecord: !!getVisitRecord(v.id),
    }));
  }, [allVisits, filters.dateValue]);

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'group' },
    { key: 'waiting', label: `รอตรวจ (${rows.filter(TAB_PREDICATE.waiting).length})`, icon: 'schedule' },
    { key: 'progress', label: `กำลังตรวจ (${rows.filter(TAB_PREDICATE.progress).length})`, icon: 'assignment' },
    { key: 'awaitResult', label: `รอผล (${rows.filter(TAB_PREDICATE.awaitResult).length})`, icon: 'hourglass_top' },
    { key: 'summarised', label: `สรุปแล้ว (${rows.filter(TAB_PREDICATE.summarised).length})`, icon: 'fact_check' },
    { key: 'draft', label: `ที่ร่างไว้ (${rows.filter(TAB_PREDICATE.draft).length})`, icon: 'save' },
    { key: 'cancelled', label: `ยกเลิกใบสั่ง (${rows.filter(TAB_PREDICATE.cancelled).length})`, icon: 'block' },
    { key: 'tracking', label: 'ติดตามสิ่งส่งตรวจ', icon: 'colorize' },
  ]), [rows]);

  const summaryCards = useMemo(() => {
    const today = listTodayVisits();
    return [
      { key: 'total', label: 'ผู้รับบริการวันนี้', value: today.length, color: 'info', icon: 'directions_walk' },
      { key: 'waiting', label: 'รอตรวจ / กำลังตรวจ', value: today.filter((v) => v.statusKey === 'waiting' || v.statusKey === 'progress').length, color: 'info', icon: 'schedule' },
      { key: 'await', label: 'รอผลตรวจ', value: today.filter((v) => v.statusKey === 'awaitResult').length, color: 'warning', icon: 'hourglass_top' },
      { key: 'done', label: 'สรุปผลแล้ว', value: today.filter((v) => v.statusKey === 'summarised').length, color: 'positive', icon: 'fact_check' },
    ];
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tick]);

  const filterOptions = useMemo(() => ({
    pkg: [
      { value: 'all', label: 'ทุกชุดตรวจ' },
      ...Array.from(new Set(rows.map((r) => r.packageId)))
        .filter(Boolean)
        .map((id) => ({ value: id, label: getPackage(id)?.code || id })),
    ],
    doctor: [
      { value: 'all', label: 'ทุกคน' },
      ...CHECKUP_DOCTORS.map((d) => ({ value: d, label: d })),
    ],
    round: [
      { value: 'all', label: 'ทุกครั้ง' },
      { value: '1', label: 'ครั้งที่ 1' },
      { value: '2+', label: 'ครั้งที่ 2 ขึ้นไป' },
    ],
    specimen: [
      { value: 'all', label: 'ทุกสถานะ' },
      ...Object.values(SPECIMEN_STATUSES).map((s) => ({ value: s.key, label: s.label })),
    ],
  }), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    const pred = TAB_PREDICATE[activeTab];
    if (pred) result = result.filter(pred);
    if (filters.pkg !== 'all') result = result.filter((r) => r.packageId === filters.pkg);
    if (filters.doctor !== 'all') result = result.filter((r) => r.doctor === filters.doctor);
    if (filters.round === '1') result = result.filter((r) => (r.round || 1) === 1);
    if (filters.round === '2+') result = result.filter((r) => (r.round || 1) >= 2);
    if (filters.specimen !== 'all') result = result.filter((r) => r.specimen === filters.specimen);
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      result = result.filter((r) => [r.hn, r.name, r.orderNo, r.doctor, r.packageName, r.packageCode, r.programName]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, filters, searchQ]);

  const sortedRows = useMemo(() => {
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const arrival = (a, b) => String(a.visitTime).localeCompare(String(b.visitTime));
    if (!sortConfig.key) return [...filtered].sort(arrival);
    const numeric = ['status', 'round'];
    const normalize = (row, key) => {
      if (key === 'status') return STATUS_SORT_ORDER[row.statusKey] ?? 99;
      if (key === 'round') return row.round || 1;
      return row[key] ?? '';
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...filtered].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = numeric.includes(sortConfig.key)
        ? Number(av) - Number(bv)
        : collator.compare(String(av), String(bv));
      return primary !== 0 ? sign * primary : arrival(a, b);
    });
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleSort = (key) => setSortConfig((prev) => (prev.key === key
    ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
    : { key, direction: 'asc' }));

  /* Row click routing: an order that isn't confirmed yet opens the order page,
     an in-flight visit opens the record wizard, a finished one opens history. */
  const rowTarget = (row) => {
    if (row.statusKey === 'cancelled') return `/checkup/order/${row.id}`;
    if (row.statusKey === 'summarised') return `/checkup/report/${row.id}`;
    if (row.statusKey === 'waiting') return `/checkup/order/${row.id}`;
    return `/checkup/record/${row.id}`;
  };

  const handleRowClick = (row) => history.push(rowTarget(row));

  const openCancel = (row) => {
    setCancelReason('');
    setCancelError('');
    setCancelTarget(row);
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('ต้องระบุเหตุผลการยกเลิกใบสั่งตรวจ');
      return;
    }
    cancelVisitOrder(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const searchItem = (row) => ({
    id: row.id,
    label: row.name,
    sublabel: `${row.hn} · ${row.packageCode}`,
    value: row.name,
    badges: [
      { label: `ครั้งที่ ${row.round || 1}`, tone: 'teal' },
      { label: row.hn, tone: 'indigo' },
    ],
    avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
  });

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return rows
      .filter((r) => [r.hn, r.name, r.orderNo, r.packageCode].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(searchItem);
  }, [searchQ, rows]);

  const renderName = (row) => (
    <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
      <QueuePatientAvatar name={row.name} hn={row.hn} size={28} />
      <MaskedWorklistName
        name={row.name}
        recordKey={row.hn || row.id}
        linkTo={rowTarget(row)}
      />
    </span>
  );

  const renderPackage = (row) => (
    <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={{ fontSize: 'var(--type-size-sm, 14px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.packageName}
      </span>
      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
        {`รหัสชุดตรวจ ${row.packageCode}`}
      </span>
    </span>
  );

  const renderRound = (row) => (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
      <ColorfulBadge style={(row.round || 1) > 1 ? 'indigo' : 'grey'} size='small' hierarchy='secondary'>
        {`ครั้งที่ ${row.round || 1}`}
      </ColorfulBadge>
    </span>
  );

  const renderStatus = (row) => {
    const cfg = VISIT_STATUSES[row.statusKey] || VISIT_STATUSES.waiting;
    return (
      <span className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
        <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>
        {row.hasDraft && row.statusKey !== 'draft' ? (
          <ColorfulBadge style='grey' size='small' hierarchy='secondary' icon='save'>มีร่างค้าง</ColorfulBadge>
        ) : null}
        {row.rightsValid === false ? (
          <ColorfulBadge style='yellow' size='small' hierarchy='secondary' icon='warning'>สิทธิหมดอายุ</ColorfulBadge>
        ) : null}
      </span>
    );
  };

  const renderActions = (row) => (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <BrandSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='history'
        onClick={(e) => { e.stopPropagation(); history.push(`/checkup/history/${row.hn}`); }}
        aria-label={`ดูประวัติการตรวจของ HN ${row.hn}`}
      >
        ประวัติ
      </BrandSubdueButton>
      {row.statusKey === 'cancelled' ? (
        <BrandSubdueButton
          variant='fill'
          size='sm'
          leadingIcon='restart_alt'
          onClick={(e) => { e.stopPropagation(); restoreVisitOrder(row.id); setTick((t) => t + 1); }}
        >
          กู้คืนใบสั่ง
        </BrandSubdueButton>
      ) : (
        <NeutralSubdueButton
          size='sm'
          leadingIcon='block'
          onClick={(e) => { e.stopPropagation(); openCancel(row); }}
        >
          ยกเลิกใบสั่ง
        </NeutralSubdueButton>
      )}
    </span>
  );

  const columns = useMemo(() => ([
    { key: 'visitTime', label: 'เวลา', width: 80 },
    { key: 'hn', label: 'HN', width: 100 },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 220, render: renderName },
    { key: 'packageName', label: 'ชุดตรวจ', flex: true, minWidth: 260, render: renderPackage },
    { key: 'round', label: 'ครั้งที่รับบริการ', width: 140, render: renderRound },
    { key: 'orderNo', label: 'เลขที่ใบสั่งตรวจ', width: 160 },
    { key: 'doctor', label: 'แพทย์', flex: true, minWidth: 170 },
    { key: 'status', label: 'สถานะ', width: 150, render: renderStatus },
    { key: 'actions', label: 'การดำเนินการ', width: 250, sortable: false, render: renderActions },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [tick]);

  /* ── ติดตามสิ่งส่งตรวจ tab ─────────────────────────────────────── */
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const trackingRows = useMemo(() => getSpecimenTracking(CHECKUP_TODAY), [tick]);

  const trackingColumns = useMemo(() => ([
    { key: 'hn', label: 'HN', width: 100 },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (row) => <MaskedWorklistName name={row.name} recordKey={row.hn} linkTo={`/checkup/record/${row.id}`} />,
    },
    { key: 'orderNo', label: 'เลขที่ใบสั่งตรวจ', width: 160 },
    {
      key: 'steps',
      label: 'ขั้นตอนการตรวจ',
      flex: true,
      minWidth: 420,
      sortable: false,
      render: (row) => {
        const visit = allVisits.find((v) => v.id === row.id);
        return <StepTrackerRow steps={CHECKUP_STEPS} state={visit?.steps || {}} />;
      },
    },
    { key: 'tubes', label: 'สิ่งส่งตรวจ', width: 170 },
    {
      key: 'specimen',
      label: 'สถานะสิ่งส่งตรวจ',
      width: 150,
      render: (row) => {
        const cfg = SPECIMEN_STATUSES[row.specimen] || SPECIMEN_STATUSES.pending;
        return <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>;
      },
    },
    { key: 'stage', label: 'ขั้นตอนปัจจุบัน', width: 150 },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), [allVisits]);

  const actions = (
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <BrandSubdueButton variant='outline' size='md' leadingIcon='inventory_2' onClick={() => history.push('/checkup/packages')}>
        ทะเบียนชุดตรวจ
      </BrandSubdueButton>
      <BrandSubdueButton variant='outline' size='md' leadingIcon='groups' onClick={() => history.push('/checkup/targets')}>
        กลุ่มเป้าหมาย
      </BrandSubdueButton>
      <BrandSubdueButton variant='outline' size='md' leadingIcon='volunteer_activism' onClick={() => history.push('/checkup/community')}>
        กิจกรรมชุมชน
      </BrandSubdueButton>
      <BrandSubdueButton variant='fill' size='md' leadingIcon='summarize' onClick={() => history.push('/checkup/reports')}>
        ออกรายงานสรุปประจำวัน
      </BrandSubdueButton>
    </div>
  );

  const showEmptyAll = rows.length === 0;
  const noResults = !showEmptyAll && sortedRows.length === 0;

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={breadcrumb}
      summaryTitle={SUMMARY_TITLE}
      summaryCards={summaryCards}
      actions={actions}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกใบสั่งตรวจสุขภาพ'
        subtitle={cancelTarget ? `${cancelTarget.name} · HN ${cancelTarget.hn} · ${cancelTarget.orderNo}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกใบสั่ง', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <NoticeBar tone='warning' icon='warning'>
            การยกเลิกใบสั่งตรวจต้องระบุเหตุผล และจะถูกบันทึกไว้ใน audit trail พร้อมชื่อผู้ยกเลิกและเวลา
          </NoticeBar>
          <SuggestibleTextarea
            voice
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(e) => { setCancelReason(e?.target ? e.target.value : e); setCancelError(''); }}
            placeholder='เช่น ผู้รับบริการไม่ได้งดอาหารก่อนตรวจ นัดตรวจใหม่สัปดาห์หน้า'
            suggestions={CANCEL_REASON_SUGGESTIONS}
            minChars={2}
          />
          {cancelError ? (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-danger-secondary, #DC2626)' }}>
              {cancelError}
            </span>
          ) : null}
        </div>
      </Popup>

      <PageBody>
        <PageCard>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = rows.find((r) => r.id === item?.id)
                  || rows.find((r) => [r.hn, r.name, r.orderNo].some((f) => f && String(f).toLowerCase().includes(String(label).toLowerCase())));
                pushHistory(match ? searchItem(match) : (item ?? label));
                if (match) handleRowClick(match);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / ชื่อ-นามสกุล / เลขที่ใบสั่งตรวจ / รหัสชุดตรวจ'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ทั้งหมด' selected={isAllDefault} onClick={() => { setFilters(FILTER_DEFAULTS); setPage(1); }} />
              <FilterDropdown prefix='ชุดตรวจ:' options={filterOptions.pkg} value={filters.pkg} onChange={setFilter('pkg')} />
              <FilterDropdown prefix='แพทย์:' options={filterOptions.doctor} value={filters.doctor} onChange={setFilter('doctor')} />
              <FilterDropdown prefix='ครั้งที่:' options={filterOptions.round} value={filters.round} onChange={setFilter('round')} />
              <FilterDropdown prefix='สิ่งส่งตรวจ:' options={filterOptions.specimen} value={filters.specimen} onChange={setFilter('specimen')} />
              <FilterDateTag
                prefix='วัน:'
                value={filters.dateValue}
                onChange={setFilter('dateValue')}
                defaultQuick='today'
                quickLabels={DATE_CHIP_LABELS}
              />
            </OverflowFlexRow>
          </div>

          {activeTab === 'tracking' ? (
            <>
              <NoticeBar tone='info' icon='info'>
                {`ติดตามขั้นตอนการตรวจและสถานะสิ่งส่งตรวจของผู้รับบริการ ณ วันที่ ${formatThaiDate(CHECKUP_TODAY)} — คลิกชื่อเพื่อเปิดหน้าบันทึกผลตรวจ`}
              </NoticeBar>
              {trackingRows.length === 0 ? (
                <EmptyState
                  icon='colorize'
                  title='ยังไม่มีสิ่งส่งตรวจที่ต้องติดตามวันนี้'
                  subtitle='เมื่อออกใบสั่งตรวจและเก็บสิ่งส่งตรวจแล้ว รายการจะปรากฏที่นี่'
                  actionLabel='ไปหน้ากลุ่มเป้าหมายเพื่อเปิดการตรวจ'
                  onAction={() => history.push('/checkup/targets')}
                />
              ) : (
                <Table
                  columns={trackingColumns}
                  rows={trackingRows}
                  rowKey={(r) => r.id}
                  stickyColCount={2}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
              )}
            </>
          ) : showEmptyAll ? (
            <EmptyState
              icon='health_metrics'
              title='ยังไม่มีผู้รับบริการตรวจสุขภาพในวันที่เลือก'
              subtitle='เริ่มจากสร้างกลุ่มเป้าหมายและลงรายการตรวจรอล่วงหน้า หรือออกใบสั่งตรวจให้ผู้รับบริการรายบุคคล'
              actionLabel='สร้างกลุ่มเป้าหมายแรก'
              onAction={() => history.push('/checkup/targets')}
            />
          ) : (
            <>
              {noResults ? (
                <EmptyState
                  icon='search_off'
                  title='ไม่พบผลลัพธ์'
                  subtitle='ลองปรับคำค้นหาหรือล้างตัวกรองเพื่อดูรายการทั้งหมด'
                  actionLabel='ล้างตัวกรองทั้งหมด'
                  onAction={() => { setFilters(FILTER_DEFAULTS); setSearchQ(''); setActiveTab('all'); }}
                />
              ) : (
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  onRowClick={handleRowClick}
                  stickyColCount={3}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
              )}
              <PagerRow page={page} pageSize={PAGE_SIZE} total={sortedRows.length} onPageChange={setPage} />
            </>
          )}

          <div
            className='flex items-center flex-wrap'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-300)',
              borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            <Icon name='info' size={14} />
            <span>
              ระบบรองรับการรับบริการมากกว่า 1 ครั้งใน 1 โปรแกรมตรวจสุขภาพ (§1.19.10) — ดูครั้งที่รับบริการในคอลัมน์ "ครั้งที่รับบริการ"
            </span>
            <div className='flex-1' />
            <Link
              to='/checkup/reports'
              style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-xs, 12px)' }}
            >
              รายงานติดตามสิ่งส่งตรวจประจำวัน →
            </Link>
          </div>
        </PageCard>
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupQueuePage;
