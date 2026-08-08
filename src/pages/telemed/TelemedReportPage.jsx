import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import FilterTag, { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { TelemedCallStatsCard } from '@/components/graph/DashboardCards';
import { HBarList, VBars } from '@/components/graph/Charts';
import {
  CALL_OUTCOME,
  CALL_DIRECTION,
  getTelemedCalls,
  getTelemedAuditSeed,
  filterCalls,
  summarizeCalls,
  groupCalls,
  monthlySeries,
  hourlyBuckets,
  toCallStatsCardProps,
  formatStatDate,
  formatStatTime,
  formatMinutes,
} from '@/data/telemedCallStats';
import { getTelemedVisits } from '@/data/telemedVisits';
import { consentCoverage } from '@/data/telemedConsent';
import { getAuditLog, subscribeAuditLog } from '@/pages/audit/auditData';
import {
  TELEMED_DEFAULT_ROLE,
  telemedCan,
  telemedDenyReason,
  telemedActor,
  logTelemedEvent,
  maskPii,
} from '@/utils/telemedAccess';
import {
  TELEMED_BREADCRUMB,
  PageBanner,
  RoleSwitcher,
  ContentCard,
  EmptyState,
  PagerBar,
  resolveDateRange,
} from '@/pages/telemed/telemedShared';

/* TelemedReportPage — รายงานสถิติการโทร + บันทึกการเข้าใช้งาน
   (TOR §1.13.3 / .8 / .10 / .11).

   แท็บ (ก) สถิติการปรึกษาทางไกล — สายเข้า/สายออก · ระยะเวลาเฉลี่ยและรวม ·
   สายไม่สำเร็จ (no-show / สัญญาณหลุด / ปฏิเสธ) · รายแพทย์ · รายหน่วยบริการ
   ต้นทาง · รายเดือน · รายช่วงเวลา · อัตราการบันทึกสายที่มี consent
   แท็บ (ข) บันทึกการเข้าใช้งาน — seed ย้อนหลังจาก telemedCallStats.js รวม
   กับ live audit log (auditData.js เป็น in-memory ไม่มี persistence จึงต้อง
   seed เอง ไม่อย่างนั้นแท็บจะว่างเมื่อ refresh). */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:telemed-report';
const PAGE_SIZE = 20;

const TABS = [
  { key: 'stats', label: 'สถิติการปรึกษาทางไกล', icon: 'bar_chart' },
  { key: 'audit', label: 'บันทึกการเข้าใช้งาน',   icon: 'history' },
];

const toInputDate = (d) => {
  const dd = new Date(d);
  return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`;
};

const StatTile = ({ label, value, sub, tone = 'info', icon }) => (
  <div
    className='flex flex-col flex-1 min-w-0'
    style={{
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      gap: 'var(--dim-space-150)',
      boxShadow: 'var(--shadow-card)',
      minWidth: 180,
    }}
  >
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
      {icon && <Icon name={icon} size={16} />}
      {label}
    </span>
    <span
      style={{
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-2xl, 24px)',
        color: tone === 'negative' ? 'var(--text-alert-error, #B91C1C)' : 'var(--text-content-default)',
      }}
    >
      {value}
    </span>
    {sub && <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{sub}</span>}
  </div>
);

const ChartBox = ({ title, children, empty }) => (
  <div
    className='flex flex-col flex-1 min-w-0'
    style={{
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
      background: 'var(--surface-card-100)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      gap: 'var(--dim-space-300)',
      boxShadow: 'var(--shadow-card)',
      minWidth: 320,
    }}
  >
    <span style={{ fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
      {title}
    </span>
    {empty ? (
      <div
        className='flex flex-col items-center text-center'
        style={{ gap: 'var(--dim-space-150)', paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)' }}
      >
        <Icon name='bar_chart' size={28} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>{empty}</span>
      </div>
    ) : children}
  </div>
);

const TelemedReportPage = () => {
  const history = useHistory();

  const [role, setRole] = useState(TELEMED_DEFAULT_ROLE);
  const [tab, setTab] = useState('stats');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [dateValue, setDateValue] = useState({ quick: 'last30' });
  const [auditTick, setAuditTick] = useState(0);

  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return toInputDate(d);
  });
  const [to, setTo] = useState(() => toInputDate(new Date()));
  const [rangeError, setRangeError] = useState('');

  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  useEffect(() => subscribeAuditLog(() => setAuditTick((t) => t + 1)), []);

  const canSeeAll = telemedCan(role, 'stats');
  const canSeeAudit = telemedCan(role, 'audit') || telemedCan(role, 'stats');
  const canSeePii = telemedCan(role, 'viewPii');

  const allCalls = useMemo(() => getTelemedCalls(), []);
  const visits = useMemo(() => getTelemedVisits(), []);
  const coverage = useMemo(() => consentCoverage(), []);

  const doctorOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกคน' },
    ...Array.from(new Set(allCalls.map((c) => c.doctor))).map((d) => ({ value: d, label: d })),
  ]), [allCalls]);

  const unitOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกหน่วยบริการ' },
    ...Array.from(new Set(allCalls.map((c) => c.unit))).map((u) => ({ value: u, label: u })),
  ]), [allCalls]);

  const outcomeOptions = useMemo(() => ([
    { value: 'all', label: 'ทุกผลลัพธ์' },
    ...Object.keys(CALL_OUTCOME).map((k) => ({ value: k, label: CALL_OUTCOME[k].label })),
  ]), []);

  useEffect(() => {
    if (from && to && new Date(from) > new Date(to)) setRangeError('วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด');
    else setRangeError('');
  }, [from, to]);

  /* สิทธิ: ผู้ที่ไม่ใช่ผู้ดูแล/หัวหน้างานเห็นเฉพาะสถิติของตนเอง */
  const scopedCalls = useMemo(
    () => (canSeeAll ? allCalls : allCalls.filter((c) => c.doctor === telemedActor(role))),
    [allCalls, canSeeAll, role],
  );

  const calls = useMemo(() => {
    if (rangeError) return [];
    let out = filterCalls(scopedCalls, {
      from, to, doctor: doctorFilter, unit: unitFilter, outcome: outcomeFilter,
    });
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      out = out.filter((c) => [c.id, c.hn, c.name, c.doctor, c.unit].some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return out;
  }, [scopedCalls, from, to, doctorFilter, unitFilter, outcomeFilter, searchQ, rangeError]);

  const summary = useMemo(() => summarizeCalls(calls), [calls]);
  const byDoctor = useMemo(() => groupCalls(calls, 'doctor'), [calls]);
  const byUnit = useMemo(() => groupCalls(calls, 'unit'), [calls]);
  const monthly = useMemo(() => monthlySeries(calls), [calls]);
  const hourly = useMemo(() => hourlyBuckets(calls), [calls]);

  /* ── audit rows: seed + live ─────────────────────────────────────── */
  const auditRows = useMemo(() => {
    const seed = getTelemedAuditSeed();
    const live = getAuditLog()
      .filter((r) => r.mod === 'Telemedicine')
      .map((r, i) => ({
        id: `LIVE-${i}-${r.time}`,
        at: null,
        timeLabel: r.time,
        user: r.user,
        action: r.action,
        hn: '',
        name: '',
        ip: 'session ปัจจุบัน',
        ok: r.ok,
        result: r.ok ? 'สำเร็จ' : 'ล้มเหลว',
        live: true,
      }));
    const combined = [...live, ...seed.map((r) => ({ ...r, timeLabel: `${formatStatDate(r.at)} ${formatStatTime(r.at)}` }))];
    if (!searchQ.trim()) return combined;
    const q = searchQ.trim().toLowerCase();
    return combined.filter((r) => [r.user, r.action, r.hn, r.name, r.result].some((f) => f && String(f).toLowerCase().includes(q)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditTick, searchQ]);

  const activeRows = tab === 'stats' ? calls : auditRows;

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return activeRows;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...activeRows].sort((a, b) => {
      const av = a[sortConfig.key];
      const bv = b[sortConfig.key];
      if (typeof av === 'number' && typeof bv === 'number') return sign * (av - bv);
      return sign * collator.compare(String(av ?? ''), String(bv ?? ''));
    });
  }, [activeRows, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = sortedRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, sortedRows.length);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  useEffect(() => { setPage(1); }, [tab]);

  const summaryCards = useMemo(() => ([
    { key: 'total',  label: 'สายทั้งหมด',       value: summary.total,     color: 'info',     icon: 'call' },
    { key: 'in',     label: 'สายเข้า',          value: summary.callsIn,   color: 'positive', icon: 'call_received' },
    { key: 'out',    label: 'สายออก',           value: summary.callsOut,  color: 'info',     icon: 'call_made' },
    { key: 'failed', label: 'สายไม่สำเร็จ',      value: summary.noshow + summary.dropped + summary.declined, color: 'destructive', icon: 'call_end' },
    { key: 'avg',    label: 'ระยะเวลาเฉลี่ย',   value: `${summary.avgMin} น.`, color: 'inprogress', icon: 'timer' },
  ]), [summary]);

  const exportCsv = useCallback(() => {
    const rows = tab === 'stats'
      ? [
        ['รหัสสาย', 'วันที่', 'เวลา', 'ทิศทาง', 'ผลลัพธ์', 'นาที', 'แพทย์', 'หน่วยบริการ', 'HN', 'บันทึกสาย'],
        ...calls.map((c) => [
          c.id, formatStatDate(c.at), formatStatTime(c.at),
          CALL_DIRECTION[c.direction].label, CALL_OUTCOME[c.outcome].label,
          c.durationMin, c.doctor, c.unit,
          canSeePii ? c.hn : maskPii(c.hn, role),
          c.recorded ? 'บันทึก' : 'ไม่บันทึก',
        ]),
      ]
      : [
        ['เวลา', 'ผู้ใช้', 'เหตุการณ์', 'HN', 'ผลลัพธ์', 'IP'],
        ...auditRows.map((r) => [
          r.timeLabel, r.user, r.action,
          canSeePii ? r.hn : maskPii(r.hn, role),
          r.result, r.ip,
        ]),
      ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = tab === 'stats' ? 'telemed-call-stats.csv' : 'telemed-audit-log.csv';
    a.click();
    URL.revokeObjectURL(url);
    logTelemedEvent(role, 'ส่งออกรายงาน Telemedicine (CSV)', { detail: `${rows.length - 1} แถว ตามตัวกรองปัจจุบัน` });
  }, [tab, calls, auditRows, canSeePii, role]);

  /* ชิป "ช่วง:" ต้องเขียนลงช่อง วันที่เริ่ม/วันที่สิ้นสุด ที่เป็นตัวกรองจริง
     ไม่งั้นชิปเปลี่ยนสถานะแต่ผลลัพธ์ไม่ขยับ (และขัดกับช่วงวันที่แสดงข้าง ๆ) */
  const applyQuickRange = (v) => {
    setDateValue(v);
    const range = resolveDateRange(v);
    if (range) {
      setFrom(toInputDate(range.start));
      setTo(toInputDate(range.end));
    }
    setPage(1);
  };

  /* แก้ช่องวันที่เอง → ชิปต้องสะท้อนช่วงจริง ไม่ค้างที่ "30 วันล่าสุด" */
  const syncChip = (nextFrom, nextTo) => {
    if (!nextFrom || !nextTo) return;
    setDateValue({ quick: 'custom', tab: 'range', range: { start: new Date(nextFrom), end: new Date(nextTo) } });
  };

  const resetRange = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    setFrom(toInputDate(d));
    setTo(toInputDate(new Date()));
    setDateValue({ quick: 'last30' });
    setDoctorFilter('all');
    setUnitFilter('all');
    setOutcomeFilter('all');
    setSearchQ('');
    setPage(1);
  };

  /* ── columns ───────────────────────────────────────────────────────── */
  const callColumns = useMemo(() => ([
    { key: 'id',        label: 'รหัสสาย' },
    { key: 'at',        label: 'วัน-เวลา', render: (r) => `${formatStatDate(r.at)} ${formatStatTime(r.at)}` },
    { key: 'direction', label: 'ทิศทาง', render: (r) => (
      <ColorfulBadge style={CALL_DIRECTION[r.direction].tone} size='small' hierarchy='secondary'>
        {CALL_DIRECTION[r.direction].label}
      </ColorfulBadge>
    ) },
    { key: 'name',      label: 'ผู้รับบริการ', flex: true, minWidth: 190, render: (r) => (
      <div className='flex flex-col min-w-0'>
        <span className='truncate' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
          {maskPii(r.name, role)}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {`HN ${maskPii(r.hn, role)}`}
        </span>
      </div>
    ) },
    { key: 'doctor',    label: 'แพทย์',      flex: true, minWidth: 160 },
    { key: 'unit',      label: 'หน่วยบริการต้นทาง', flex: true, minWidth: 200 },
    { key: 'durationMin', label: 'ระยะเวลา', render: (r) => (r.durationMin ? `${r.durationMin} นาที` : '—') },
    { key: 'outcome',   label: 'ผลลัพธ์', render: (r) => (
      <ColorfulBadge style={CALL_OUTCOME[r.outcome].tone} size='small' hierarchy='secondary'>
        {CALL_OUTCOME[r.outcome].label}
      </ColorfulBadge>
    ) },
    { key: 'recorded',  label: 'บันทึกสาย', render: (r) => (
      <StatusBadge style={r.recorded ? 'success' : 'neutral'} icon={r.recorded ? 'radio_button_checked' : 'block'}>
        {r.recorded ? 'บันทึกแล้ว' : 'ไม่บันทึก'}
      </StatusBadge>
    ) },
  ]), [role]);

  const auditColumns = useMemo(() => ([
    { key: 'timeLabel', label: 'เวลา' },
    { key: 'user',      label: 'ผู้ใช้งาน',  flex: true, minWidth: 190 },
    { key: 'action',    label: 'เหตุการณ์',  flex: true, minWidth: 280 },
    { key: 'hn',        label: 'ผู้รับบริการ', render: (r) => (
      r.hn ? `${maskPii(r.name, role)} (${maskPii(r.hn, role)})` : '—'
    ) },
    { key: 'ip',        label: 'ที่มา' },
    { key: 'result',    label: 'ผลลัพธ์', render: (r) => (
      <StatusBadge style={r.ok ? 'success' : 'error'} icon={r.ok ? 'check_circle' : 'error'}>
        {r.result}
      </StatusBadge>
    ) },
    { key: 'live',      label: 'แหล่งข้อมูล', sortable: false, render: (r) => (
      <ColorfulBadge style={r.live ? 'teal' : 'grey'} size='small' hierarchy='secondary'>
        {r.live ? 'session ปัจจุบัน' : 'ประวัติย้อนหลัง'}
      </ColorfulBadge>
    ) },
  ]), [role]);

  return (
    <QueuePageShell
      activeKey='telemed'
      breadcrumb={TELEMED_BREADCRUMB('รายงานสถิติและบันทึกการเข้าใช้งาน')}
      title='รายงานสถิติการปรึกษาทางไกล + บันทึกการเข้าใช้งาน'
      onBack={() => history.push('/telemed/worklist')}
      backLabel='หน้าห้องตรวจ'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <RoleSwitcher role={role} onChange={setRole} />
          <BrandSubdueButton variant='outline' size='md' leadingIcon='download' onClick={exportCsv}>
            ส่งออก CSV (ตามตัวกรอง)
          </BrandSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => { logTelemedEvent(role, 'พิมพ์รายงานสถิติ Telemedicine'); window.print(); }}>
            พิมพ์รายงาน
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={tab === 'stats' ? summaryCards : undefined}
      tabs={TABS}
      tabVariant='pill'
      activeTab={tab}
      onTabChange={setTab}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          gap: 'var(--dim-space-400)',
        }}
      >
        {!canSeeAll && (
          <PageBanner tone='warning' icon='lock' title='คุณเห็นเฉพาะสถิติของตนเอง'>
            {telemedDenyReason(role, 'stats')}
          </PageBanner>
        )}
        {tab === 'audit' && !canSeeAudit && (
          <PageBanner tone='warning' icon='visibility_off' title='ข้อมูลผู้รับบริการถูกปิดบัง'>
            {telemedDenyReason(role, 'audit')} — เห็นเหตุการณ์ได้แต่ HN/ชื่อถูกปิดบังตาม TOR §1.4.2
          </PageBanner>
        )}

        <ContentCard>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label, item) => { setSearchQ(label); pushHistory(item ?? label); }}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder={tab === 'stats' ? 'ค้นหารหัสสาย / HN / ชื่อ / แพทย์ / หน่วยบริการ' : 'ค้นหาผู้ใช้งาน / เหตุการณ์ / ผลลัพธ์'}
              width={640}
            />
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterTag value='ล้างตัวกรอง' selected={false} onClick={resetRange} />
              <FilterDropdown prefix='แพทย์:' options={doctorOptions} value={doctorFilter} onChange={(v) => { setDoctorFilter(v); setPage(1); }} />
              <FilterDropdown prefix='หน่วยบริการ:' options={unitOptions} value={unitFilter} onChange={(v) => { setUnitFilter(v); setPage(1); }} />
              <FilterDropdown prefix='ผลลัพธ์:' options={outcomeOptions} value={outcomeFilter} onChange={(v) => { setOutcomeFilter(v); setPage(1); }} />
              <FilterDateTag prefix='ช่วง:' value={dateValue} onChange={applyQuickRange} defaultQuick='last30' quickLabels={{ last30: '30 วันล่าสุด', last7: '7 วันล่าสุด' }} />
            </OverflowFlexRow>
          </div>

          <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', minWidth: 200 }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>วันที่เริ่ม</span>
              <InputField
                size='lg'
                type='date'
                showLabel={false}
                showHelperText={false}
                value={from}
                onChange={(v) => {
                  const next = typeof v === 'string' ? v : v?.target?.value;
                  setFrom(next);
                  syncChip(next, to);
                  setPage(1);
                }}
              />
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', minWidth: 200 }}>
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>วันที่สิ้นสุด</span>
              <InputField
                size='lg'
                type='date'
                showLabel={false}
                showHelperText={false}
                value={to}
                onChange={(v) => {
                  const next = typeof v === 'string' ? v : v?.target?.value;
                  setTo(next);
                  syncChip(from, next);
                  setPage(1);
                }}
              />
            </div>
            <NeutralSubdueButton size='md' variant='outline' leadingIcon='restart_alt' onClick={resetRange}>
              รีเซ็ตช่วงเวลา
            </NeutralSubdueButton>
            {rangeError && (
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-sm)' }}>
                <Icon name='error' size={14} />
                {rangeError}
              </span>
            )}
          </div>

          {tab === 'stats' && (
            <SearchResultCount found={sortedRows.length} total={scopedCalls.length} />
          )}

          {tab === 'stats' ? (
            <>
              <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                <StatTile icon='timer' label='ระยะเวลารวมทุกสาย' value={formatMinutes(summary.totalMin)} sub={`เฉลี่ย ${summary.avgMin} นาที/สาย`} />
                <StatTile icon='person_off' label='ผู้รับบริการไม่เข้าห้อง' value={summary.noshow} tone='negative' sub='No-show' />
                <StatTile icon='signal_disconnected' label='สัญญาณหลุด' value={summary.dropped} tone='negative' sub='ต้องโทรใหม่' />
                <StatTile icon='radio_button_checked' label='อัตราการบันทึกสาย' value={`${summary.recordedPct}%`} sub={`${summary.recorded}/${summary.total} สาย · มีความยินยอม ${coverage.pct}%`} />
                <StatTile icon='event_available' label='นัดปรึกษาทางไกลวันนี้' value={visits.filter((v) => v.status !== 'cancelled').length} sub='จากหน้าห้องตรวจ' />
              </div>

              {calls.length === 0 ? (
                <EmptyState
                  icon='bar_chart'
                  title={rangeError ? 'ช่วงวันที่ไม่ถูกต้อง' : 'ไม่มีข้อมูลสายในช่วงเวลาที่เลือก'}
                  hint={rangeError ? rangeError : 'ลองขยายช่วงวันที่ หรือล้างตัวกรองแพทย์ / หน่วยบริการ'}
                  action={(
                    <NeutralSubdueButton size='md' variant='outline' leadingIcon='restart_alt' onClick={resetRange}>
                      รีเซ็ตช่วงเวลา
                    </NeutralSubdueButton>
                  )}
                />
              ) : (
                <>
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                    <div style={{ flex: '1 1 420px', minWidth: 340 }}>
                      <TelemedCallStatsCard
                        {...toCallStatsCardProps(summary, byDoctor)}
                        title={`สถิติการปรึกษาทางไกล (${summary.total} สาย)`}
                      />
                    </div>
                    <ChartBox title='สายแยกตามหน่วยบริการต้นทาง' empty={byUnit.length ? undefined : 'ไม่มีข้อมูลหน่วยบริการในช่วงนี้'}>
                      <HBarList
                        rows={byUnit.map((u) => ({ label: u.key, value: u.count, second: u.minutes }))}
                        valueLabel='สาย'
                        secondLabel='นาที'
                      />
                    </ChartBox>
                  </div>

                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                    <ChartBox title='จำนวนสายรายเดือน (6 เดือนล่าสุด)' empty={monthly.counts.some((c) => c > 0) ? undefined : 'ไม่มีสายใน 6 เดือนล่าสุด'}>
                      <VBars
                        months={monthly.months}
                        series={[{ label: 'จำนวนสาย', color: '#14B8A6', values: monthly.counts }]}
                        height={200}
                      />
                    </ChartBox>
                    <ChartBox title='สายแยกตามช่วงเวลาของวัน' empty={hourly.some((h) => h.value > 0) ? undefined : 'ไม่มีข้อมูลช่วงเวลา'}>
                      <HBarList
                        rows={hourly.map((h) => ({ label: h.label, value: h.value, second: h.value }))}
                        valueLabel='สาย'
                        secondLabel='สาย'
                      />
                    </ChartBox>
                  </div>

                  <Table
                    columns={callColumns}
                    rows={pageRows}
                    rowKey={(r) => r.id}
                    sortConfig={sortConfig}
                    onSort={(key) => setSortConfig((prev) => (prev.key === key
                      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                      : { key, direction: 'asc' }))}
                    stickyColCount={1}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่พบสายที่ตรงกับตัวกรอง'
                  />
                  <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sortedRows.length}>
                    <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                  </PagerBar>
                </>
              )}
            </>
          ) : (
            <>
              <PageBanner tone='info' icon='shield_lock' title='บันทึกการเข้าใช้งานโมดูล Telemedicine'>
                รวมเหตุการณ์ที่เกิดขึ้นใน session ปัจจุบัน (จาก audit log กลาง ซึ่งเป็นหน่วยความจำชั่วคราว) เข้ากับประวัติย้อนหลังของโมดูล —
                เหตุการณ์ที่บันทึก: เข้าสู่ระบบ · เข้าห้องตรวจ · เข้าร่วม/ออกจากสาย · เริ่ม/หยุดบันทึก · ให้/ปฏิเสธ/เพิกถอนความยินยอม · เปิดดู EMR ระหว่างสาย · แก้ไข/ยกเลิกการประเมิน
              </PageBanner>
              {sortedRows.length === 0 ? (
                <EmptyState
                  icon='history'
                  title='ไม่พบเหตุการณ์ที่ตรงกับการค้นหา'
                  hint='ลองล้างคำค้น หรือใช้งานฟังก์ชันในโมดูลเพื่อสร้างเหตุการณ์ใหม่'
                  action={(
                    <NeutralSubdueButton size='md' variant='outline' leadingIcon='filter_alt_off' onClick={() => setSearchQ('')}>
                      ล้างคำค้น
                    </NeutralSubdueButton>
                  )}
                />
              ) : (
                <>
                  <Table
                    columns={auditColumns}
                    rows={pageRows}
                    rowKey={(r) => r.id}
                    sortConfig={sortConfig}
                    onSort={(key) => setSortConfig((prev) => (prev.key === key
                      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                      : { key, direction: 'asc' }))}
                    stickyColCount={1}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่พบเหตุการณ์'
                  />
                  <PagerBar rangeStart={rangeStart} rangeEnd={rangeEnd} total={sortedRows.length}>
                    <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                  </PagerBar>
                </>
              )}
            </>
          )}
        </ContentCard>
      </div>
    </QueuePageShell>
  );
};

export default TelemedReportPage;
