import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';
import DatePickerRange from '@/components/forms/DatePickerRange';
import SelectableTag from '@/components/forms/SelectableTag';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { LineChart } from '@/components/graph/Charts';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import HomeVisitSubNav from '@/components/homevisit/HomeVisitSubNav';
import {
  BARTHEL_MAX_SCORE,
  VITAL_FIELDS,
  formatHomeVisitDate,
  interpretBarthel,
  evaluateVital,
  resolveGroup,
  resolveSource,
  resolveProfession,
  getHomeVisitQueueRows,
  getVisitFollowUpOverdue,
} from '@/data/homevisitVisits';
import {
  getRegistryEntries,
  findRegistryEntryByHn,
  getRegistryCancellation,
  getVisitHistory,
  HOMEVISIT_LAB_HISTORY,
  HOMEVISIT_XRAY_HISTORY,
} from '@/data/homevisitRegistry';
import {
  getQuotaUsage,
  fiscalYearLabel,
} from '@/data/homevisitHhc';
import {
  HomeVisitAccessGate,
  GroupBadge,
  SourceBadge,
  FlagBadges,
  SectionCard,
  EmptyHint,
  NoticeBand,
  isoToday,
  isoMonthsAgo,
  isoDate,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitFollowUpPage — การติดตามการเยี่ยมบ้าน (TOR 1.10.12.4 + 1.18.3).

   รูปแบบเดียวกับ AddictionFollowUpPage / NcdFollowUpPage: เลือกผู้รับบริการ
   → เลือกช่วงเวลา → อ่านภาพรวมระยะยาวเป็นแผงที่ "แต่ละแผงมี empty state
   ของตัวเอง" (แผงไม่เคยถูกซ่อน เพื่อให้ “ไม่มีข้อมูล” ต่างจาก “ไม่ได้แสดง”):
     1. ผลตรวจร่างกาย (สัญญาณชีพ) — timeline รายครั้ง + กราฟแนวโน้ม 1 ชุดข้อมูล/1 แกน
     2. คะแนน ADL (ดัชนีบาร์เธล)  — กราฟ + ตารางรายครั้ง พร้อมการแปลผล
     3. ผล Lab                     — แถวผิดปกติถูกทำเครื่องหมาย
     4. ผล X-ray
   เข้าถึงได้ตามสิทธิสำนักอนามัย (§1.18.3) — ผู้ไม่มีสิทธิเห็น locked state
   ไม่ใช่รายการว่าง. Deep link: /homevisit/follow-up?hn=… จากหน้าทะเบียน. */

const breadcrumb = ['ระบบเยี่ยมบ้าน', 'ติดตามการเยี่ยมบ้าน'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:homevisit-followup';
const VISIT_PAGE_SIZE = 8;

const ADL_SERIES_COLOR = 'var(--surface-colorfulbadge-teal-bold, #24A899)';
const VITAL_SERIES_COLOR = 'var(--surface-colorfulbadge-blue-bold, #2580EA)';

const QUICK_RANGES = [
  { key: '6m', label: '6 เดือน', from: () => isoMonthsAgo(6) },
  { key: '1y', label: '1 ปี', from: () => isoMonthsAgo(12) },
  { key: '2y', label: '2 ปี', from: () => isoMonthsAgo(24) },
  { key: '5y', label: '5 ปี', from: () => isoMonthsAgo(60) },
];

const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
};

const inRange = (iso, from, to) => !!iso && iso >= from && iso <= to;

/* กราฟแสดงทีละชุดข้อมูลบนแกนเดียว — ห้ามผสมหน่วยคนละแบบในกราฟเดียว. */
const VITAL_SERIES = [
  { key: 'sys',         label: 'ความดันตัวบน (mmHg)' },
  { key: 'dia',         label: 'ความดันตัวล่าง (mmHg)' },
  { key: 'pulse',       label: 'ชีพจร (ครั้ง/นาที)' },
  { key: 'temp',        label: 'อุณหภูมิ (°C)' },
  { key: 'oxygen',      label: 'ออกซิเจนปลายนิ้ว (%)' },
  { key: 'respiration', label: 'อัตราการหายใจ (ครั้ง/นาที)' },
  { key: 'weight',      label: 'น้ำหนัก (กก.)' },
];

const HomeVisitFollowUpPage = () => {
  const history = useHistory();
  const location = useLocation();

  const [tick, setTick] = useState(0);
  const [selectedHn, setSelectedHn] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [quick, setQuick] = useState('1y');
  const [range, setRange] = useState({ from: isoMonthsAgo(12), to: isoToday() });
  const [visitPage, setVisitPage] = useState(1);
  const [vitalSeriesKey, setVitalSeriesKey] = useState('sys');
  const [selectedVisitNo, setSelectedVisitNo] = useState(null);
  const [deepLinkMiss, setDeepLinkMiss] = useState(null);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* ผู้รับบริการที่ติดตามได้ — ทะเบียนมาก่อน (การติดตามคือเรื่องของทะเบียน)
     แล้วเติมด้วยคิวเยี่ยมของวันนี้เผื่อรายที่ยังไม่ลงทะเบียน. */
  const pool = useMemo(() => {
    const map = new Map();
    getRegistryEntries().forEach((r) => {
      map.set(r.hn, {
        hn: r.hn, name: r.name, group: r.group, source: r.source,
        responsible: r.responsible, confidential: r.confidential, registered: true,
      });
    });
    getHomeVisitQueueRows().forEach((r) => {
      if (!map.has(r.hn)) {
        map.set(r.hn, {
          hn: r.hn, name: r.name, group: r.group, source: r.source,
          responsible: r.responsible, confidential: r.confidential, registered: false,
        });
      }
    });
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  /* Deep link ?hn=… จากปุ่ม "ดูการติดตาม" ในหน้าทะเบียน */
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('hn');
    if (!q) return;
    if (pool.some((p) => p.hn === q)) {
      setSelectedHn(q);
      setDeepLinkMiss(null);
    } else {
      setSelectedHn(null);
      setDeepLinkMiss(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const selectedRow = useMemo(() => pool.find((p) => p.hn === selectedHn) || null, [pool, selectedHn]);
  const cardPatient = useMemo(
    () => (selectedHn && getPatientByHN(selectedHn)) || DEFAULT_PATIENT,
    [selectedHn],
  );
  const registry = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (selectedHn ? findRegistryEntryByHn(selectedHn) : null),
    [selectedHn, tick],
  );
  const cancellation = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => (registry ? getRegistryCancellation(registry.id) : null),
    [registry, tick],
  );
  const overdue = useMemo(
    () => (registry ? getVisitFollowUpOverdue(registry) : null),
    [registry],
  );

  /* ช่วงเวลาที่ไม่ถูกต้องต้องไม่ขับเคลื่อนแผงข้อมูล */
  const rangeInvalid = !!(range.from && range.to && range.to < range.from);
  const lastValidRange = useRef(range);
  useEffect(() => {
    if (!rangeInvalid) lastValidRange.current = range;
  }, [range, rangeInvalid]);
  const effRange = rangeInvalid ? lastValidRange.current : range;

  const visits = useMemo(() => {
    if (!selectedHn) return [];
    return getVisitHistory(selectedHn)
      .filter((v) => inRange(v.date, effRange.from, effRange.to))
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHn, effRange, tick]);

  const visitsDesc = useMemo(() => [...visits].reverse(), [visits]);

  const labs = useMemo(() => {
    if (!selectedHn) return [];
    return (HOMEVISIT_LAB_HISTORY[selectedHn] || [])
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, effRange]);

  const xrays = useMemo(() => {
    if (!selectedHn) return [];
    return (HOMEVISIT_XRAY_HISTORY[selectedHn] || [])
      .filter((r) => inRange(r.date, effRange.from, effRange.to))
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [selectedHn, effRange]);

  const adlPoints = useMemo(
    () => visits.filter((v) => Number.isFinite(v.adl)).map((v) => ({ date: v.date, value: v.adl })),
    [visits],
  );

  const vitalPoints = useMemo(() => visits
    .map((v) => ({ date: v.date, value: Number(v.vitals?.[vitalSeriesKey]) }))
    .filter((p) => Number.isFinite(p.value)),
  [visits, vitalSeriesKey]);

  const summaryCards = useMemo(() => ([
    { key: 'visits',  label: 'จำนวนครั้งที่เยี่ยมในช่วง', value: visits.length, color: 'info', icon: 'home_health' },
    {
      key: 'adl',
      label: 'ADL ล่าสุด',
      value: adlPoints.length ? `${adlPoints[adlPoints.length - 1].value}/${BARTHEL_MAX_SCORE}` : '—',
      color: 'brand',
      icon: 'accessible',
    },
    { key: 'labs',    label: 'ผล Lab ในช่วง',   value: labs.length,  color: 'positive',    icon: 'biotech' },
    { key: 'xrays',   label: 'ผล X-ray ในช่วง', value: xrays.length, color: 'inprogress',  icon: 'radiology' },
    {
      key: 'abnormal',
      label: 'ผล Lab ผิดปกติ',
      value: labs.filter((r) => r.abnormal).length,
      color: 'destructive',
      icon: 'priority_high',
    },
  ]), [visits, adlPoints, labs, xrays]);

  const totalVisitPages = Math.max(1, Math.ceil(visitsDesc.length / VISIT_PAGE_SIZE));
  const visitPageRows = visitsDesc.slice((visitPage - 1) * VISIT_PAGE_SIZE, visitPage * VISIT_PAGE_SIZE);
  useEffect(() => { setVisitPage(1); }, [selectedHn, effRange.from, effRange.to]);
  useEffect(() => { if (visitPage > totalVisitPages) setVisitPage(totalVisitPages); }, [visitPage, totalVisitPages]);

  const pickQuick = (key) => {
    const q = QUICK_RANGES.find((r) => r.key === key);
    if (!q) return;
    setQuick(key);
    setRange({ from: q.from(), to: isoToday() });
  };

  /* ── ค้นหา ───────────────────────────────────────────────────────── */
  const poolToSearchItem = (row) => ({
    id: row.hn,
    label: row.confidential ? `ผู้รับบริการ HN ${row.hn} (ข้อมูลลับ)` : row.name,
    sublabel: `${resolveGroup(row.group)?.short || '—'} · ${row.responsible || '—'}`,
    value: row.confidential ? row.hn : row.name,
    badges: [
      { label: row.hn, tone: 'indigo' },
      ...(row.registered ? [{ label: 'มีทะเบียน', tone: 'teal' }] : [{ label: 'ยังไม่ลงทะเบียน', tone: 'grey' }]),
    ],
    avatarSrc: row.confidential ? undefined : getPatientByHN(row.hn)?.avatarUrl,
  });

  const pickerMatchCount = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return 0;
    return pool.filter((row) => [row.hn, row.name, row.responsible]
      .some((f) => f && String(f).toLowerCase().includes(q))).length;
  }, [searchQ, pool]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((row) => [row.hn, row.name, row.responsible].some((f) => f && String(f).toLowerCase().includes(q)))
      .slice(0, 8)
      .map(poolToSearchItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQ, pool]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = pool.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return pool.find((row) => [row.hn, row.name].some((f) => f && String(f).toLowerCase().includes(q))) ?? null;
  };

  const selectPatient = (hn) => {
    setSelectedHn(hn);
    setDeepLinkMiss(null);
    setVisitPage(1);
    setSelectedVisitNo(null);
  };

  /* ── ตาราง ───────────────────────────────────────────────────────── */
  const visitColumns = [
    { key: 'no', label: 'ครั้งที่' },
    { key: 'date', label: 'วันที่เยี่ยม', render: (r) => formatHomeVisitDate(r.date) },
    { key: 'by', label: 'ผู้เยี่ยม', flex: true, minWidth: 170 },
    {
      key: 'profession', label: 'วิชาชีพ', sortable: false,
      render: (r) => resolveProfession(r.profession)?.label || '—',
    },
    {
      key: 'vitals', label: 'ผลตรวจร่างกาย', sortable: false, flex: true, minWidth: 240,
      render: (r) => (
        <span>
          {r.vitals?.sys && r.vitals?.dia ? `BP ${r.vitals.sys}/${r.vitals.dia}` : 'BP —'}
          {' · '}{r.vitals?.pulse ? `PR ${r.vitals.pulse}` : 'PR —'}
          {' · '}{r.vitals?.temp ? `T ${r.vitals.temp}` : 'T —'}
          {' · '}{r.vitals?.oxygen ? `SpO2 ${r.vitals.oxygen}%` : 'SpO2 —'}
        </span>
      ),
    },
    {
      key: 'adl', label: 'คะแนน ADL', sortable: false,
      render: (r) => {
        if (!Number.isFinite(r.adl)) return '—';
        const interp = interpretBarthel(r.adl);
        return (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span>{r.adl}/{BARTHEL_MAX_SCORE}</span>
            <ColorfulBadge style={interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={260}>
              {interp.label}
            </ColorfulBadge>
          </div>
        );
      },
    },
    { key: 'summary', label: 'สรุปการเยี่ยม', flex: true, minWidth: 280 },
    { key: 'orders', label: 'คำสั่งการรักษา', flex: true, minWidth: 220 },
  ];

  const labColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatHomeVisitDate(r.date) },
    { key: 'test', label: 'รายการตรวจ', flex: true, minWidth: 240 },
    { key: 'result', label: 'ผล', flex: true, minWidth: 240 },
    {
      key: 'abnormal', label: 'สถานะ', sortable: false,
      render: (r) => (r.abnormal ? (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <ColorfulIconBadge style='red' size='medium' fill='default' icon='priority_high' />
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ผิดปกติ</ColorfulBadge>
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปกติ</ColorfulBadge>
      )),
    },
  ];

  const xrayColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatHomeVisitDate(r.date) },
    { key: 'exam', label: 'รายการตรวจ', flex: true, minWidth: 260 },
    { key: 'result', label: 'ผลการอ่าน', flex: true, minWidth: 300 },
  ];

  /* §2.4.1 + §1.18.1 (มติ คทง.4) — ดึงข้อมูลดิบรายครั้งไป Pivot เองได้
     และแสดงโควตาสิทธิ สปสช. คู่กับตัวเลข Person / Visit ให้ไม่ปนกัน */
  const quota = useMemo(
    () => (registry ? getQuotaUsage(registry, getVisitHistory(selectedHn)) : null),
    [registry, selectedHn],
  );

  const vitalSeriesLabel = VITAL_SERIES.find((s) => s.key === vitalSeriesKey)?.label || '';
  const selectedVisit = visits.find((v) => v.no === selectedVisitNo) || null;

  return (
    <QueuePageShell
      activeKey='homevisit'
      breadcrumb={breadcrumb}
      title='เยี่ยมบ้าน (Home Visit)'
      /* แถบปุ่มบนหัวหน้าถูกลบออก — ทะเบียนเข้าถึงได้จากเมนูซ้าย
         (Sidebar subItems ของ "ระบบการเยี่ยมบ้าน") */
      summaryCards={selectedHn ? summaryCards : undefined}
      belowSummary={<HomeVisitSubNav />}
    >
      <HomeVisitAccessGate subject='ข้อมูลติดตามการเยี่ยมบ้าน'>
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-600, 24px)',
          }}
        >
          {/* ── เลือกผู้รับบริการ ─────────────────────────────────── */}
          <SectionCard icon='person_search' title='เลือกผู้รับบริการที่ต้องการติดตาม'>
            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={setSearchQ}
                onSubmit={(label, item) => {
                  setSearchQ(label);
                  const match = resolveSearchRow(label, item);
                  pushHistory(match ? poolToSearchItem(match) : (item ?? label));
                  if (match) selectPatient(match.hn);
                }}
                suggestions={searchSuggestions}
                history={searchHistory}
                onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                placeholder='ค้นหา HN / ชื่อผู้รับบริการ / ผู้รับผิดชอบ'
                width={640}
              />
            </div>
            {searchQ.trim() && !selectedHn ? (
              <SearchResultCount found={pickerMatchCount} total={pool.length} />
            ) : null}
            {deepLinkMiss && !selectedHn && (
              <NoticeBand tone='warning' icon='link_off'>
                ไม่พบ HN {deepLinkMiss} ในทะเบียนเยี่ยมบ้านหรือคิวเยี่ยมของวันนี้ —
                ค้นหาผู้รับบริการรายอื่น หรือกลับไปลงทะเบียนที่หน้าทะเบียนผู้รับบริการเยี่ยมบ้านก่อน
              </NoticeBand>
            )}
            {!selectedHn && searchQ.trim() && searchSuggestions.length === 0 && (
              <EmptyHint>
                ไม่พบผู้รับบริการที่ตรงกับ "{searchQ.trim()}" — ตรวจสอบ HN หรือชื่อแล้วลองอีกครั้ง
              </EmptyHint>
            )}
            {!selectedHn && !searchQ.trim() && !deepLinkMiss && (
              <EmptyHint icon='monitoring'>
                ค้นหาและเลือกผู้รับบริการเพื่อดูผลตรวจร่างกาย คะแนน ADL ผล Lab และผล X-ray
                ย้อนหลังตามช่วงเวลาที่กำหนด
              </EmptyHint>
            )}
          </SectionCard>

          {selectedHn && (
            <>
              <PatientCard
                patient={cardPatient}
                title='ติดตามการเยี่ยมบ้านรายบุคคล'
                onBack={() => { setSelectedHn(null); setSearchQ(''); }}
                tags={(
                  <div className='flex items-center gap-2 flex-wrap'>
                    {registry ? (
                      <>
                        <GroupBadge group={registry.group} full />
                        <SourceBadge source={registry.source} />
                        <FlagBadges group={registry.group} flags={registry.flags} />
                        {registry.confidential && (
                          <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                        )}
                      </>
                    ) : (
                      <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีทะเบียนเยี่ยมบ้าน</ColorfulBadge>
                    )}
                  </div>
                )}
                actions={(
                  <BrandSubdueButton
                    variant='outline'
                    leadingIcon='assignment'
                    onClick={() => history.push({ pathname: '/homevisit/visit', state: { hn: selectedHn } })}
                  >
                    เปิดบันทึกการเยี่ยม
                  </BrandSubdueButton>
                )}
              />

              {registry && (
                <PatientSummaryCard
                  cells={[
                    { label: 'ผู้รับผิดชอบ', value: registry.responsible },
                    { label: 'วิชาชีพ', value: resolveProfession(registry.profession)?.label || '—' },
                    { label: 'ชุมชน/เขต', value: `${registry.community || '—'} · ${registry.district || '—'}` },
                    { label: 'ลงทะเบียนเมื่อ', value: formatHomeVisitDate(registry.registeredDate) },
                    { label: 'การให้บริการสะสม (Visit)', value: `${registry.visitCount || 0} ครั้ง` },
                    { label: `สิทธิ สปสช. ${fiscalYearLabel().replace('ปีงบประมาณ ', 'ปีงบ ').split(' (')[0]}`, value: quota ? `${quota.used}/${quota.quota} ครั้ง` : '—' },
                  ]}
                />
              )}

              {quota && (
                <NoticeBand
                  tone={quota.level === 'over' ? 'danger' : quota.level === 'near' ? 'warning' : 'info'}
                  icon='confirmation_number'
                >
                  {quota.message} — ตัวเลขนี้นับ “การให้บริการ (Visit)” ของผู้รับบริการรายนี้
                  ไม่ใช่จำนวน “รายบุคคล (Person)” ที่ใช้ในรายงานภาพรวมของศูนย์ฯ
                </NoticeBand>
              )}

              {cancellation && (
                <NoticeBand tone='warning' icon='block'>
                  ทะเบียนของผู้รับบริการรายนี้ถูกยกเลิกโดย {cancellation.by} เมื่อ {cancellation.at}
                  {' '}(เหตุผล: {cancellation.reason}) — ยังดูข้อมูลย้อนหลังได้ แต่จะไม่มีการนัดเยี่ยมใหม่
                  จนกว่าจะเปิดใช้งานทะเบียนอีกครั้ง
                </NoticeBand>
              )}

              {overdue && (
                <NoticeBand tone='danger' icon='running_with_errors'>
                  เลยกำหนดเยี่ยม/ติดตามประเมินผลแล้ว — ครบกำหนด {formatHomeVisitDate(overdue.dueDate)}
                  {' '}(เกินมา {overdue.daysOverdue} วัน · รอบติดตามของกลุ่มนี้ทุก {overdue.windowDays} วัน)
                </NoticeBand>
              )}

              {!registry && (
                <NoticeBand tone='info' icon='assignment_late'>
                  ผู้รับบริการรายนี้ยังไม่มีทะเบียนเยี่ยมบ้าน — ดูข้อมูลย้อนหลังได้
                  แต่ควรลงทะเบียนเพื่อให้มีกลุ่มผู้รับบริการและรอบการติดตามที่ถูกต้อง
                </NoticeBand>
              )}

              {/* ── ช่วงเวลา ────────────────────────────────────────── */}
              <SectionCard icon='calendar' title='ช่วงเวลาที่ติดตาม'>
                <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  {QUICK_RANGES.map((r) => (
                    <SelectableTag key={r.key} label={r.label} size='md' selected={quick === r.key} onClick={() => pickQuick(r.key)} />
                  ))}
                  <div style={{ minWidth: 320 }}>
                    <DatePickerRange
                      showLabel={false}
                      showHelperText={false}
                      size='md'
                      value={[range.from, range.to]}
                      onChange={([from, to]) => { setRange({ from, to }); setQuick(null); }}
                      format={isoDate}
                      parse={(s) => (s ? new Date(s) : null)}
                    />
                  </div>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                    {formatHomeVisitDate(effRange.from)} – {formatHomeVisitDate(effRange.to)}
                  </span>
                </div>
                {rangeInvalid && (
                  <NoticeBand tone='danger' icon='error'>
                    วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่มต้น — ยังคงแสดงผลของช่วงเวลาก่อนหน้าจนกว่าจะแก้ไขให้ถูกต้อง
                  </NoticeBand>
                )}
              </SectionCard>

              {/* ── 1. ผลตรวจร่างกาย ────────────────────────────────── */}
              <SectionCard
                icon='activity'
                title='ผลตรวจร่างกาย (สัญญาณชีพ) รายครั้ง'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    กราฟแสดงทีละชุดข้อมูลบนแกนเดียว — เลือกค่าที่ต้องการดูแนวโน้ม
                  </span>
                )}
              >
                {visits.length === 0 ? (
                  <EmptyHint icon='event_note'>
                    ไม่มีการเยี่ยมบ้านในช่วง {formatHomeVisitDate(effRange.from)} – {formatHomeVisitDate(effRange.to)}
                    {' '}— ปรับช่วงเวลาให้กว้างขึ้นเพื่อดูประวัติที่เก่ากว่านี้
                  </EmptyHint>
                ) : (
                  <>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      {VITAL_SERIES.map((s) => (
                        <SelectableTag
                          key={s.key}
                          label={s.label}
                          size='md'
                          selected={vitalSeriesKey === s.key}
                          onClick={() => setVitalSeriesKey(s.key)}
                        />
                      ))}
                    </div>

                    {vitalPoints.length === 0 ? (
                      <EmptyHint icon='show_chart'>
                        ไม่มีค่า “{vitalSeriesLabel}” ที่บันทึกไว้ในช่วงเวลานี้ — เลือกค่าอื่นหรือขยายช่วงเวลา
                      </EmptyHint>
                    ) : vitalPoints.length === 1 ? (
                      <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                        <span
                          aria-hidden='true'
                          style={{
                            width: 'var(--dim-space-300, 12px)',
                            height: 'var(--dim-space-300, 12px)',
                            borderRadius: 'var(--dim-radius-full, 9999px)',
                            background: VITAL_SERIES_COLOR,
                            flexShrink: 0,
                          }}
                        />
                        <div className='flex flex-col'>
                          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                            {formatHomeVisitDate(vitalPoints[0].date)} · {vitalSeriesLabel} = {vitalPoints[0].value}
                          </span>
                          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                            มีผลตรวจครั้งเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 ครั้งจึงแสดงเป็นเส้นแนวโน้ม
                          </span>
                        </div>
                      </div>
                    ) : (
                      <LineChart
                        months={vitalPoints.map((p) => shortThaiDate(p.date))}
                        series={[{ label: vitalSeriesLabel, color: VITAL_SERIES_COLOR, values: vitalPoints.map((p) => p.value) }]}
                        height={200}
                      />
                    )}

                    <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                      {visitsDesc.slice(0, 6).map((v) => {
                        const rows = VITAL_FIELDS
                          .filter((f) => String(v.vitals?.[f.key] ?? '').trim() !== '')
                          .map((f) => ({ label: f.label, value: `${v.vitals[f.key]} ${f.unit}` }));
                        const abnormal = VITAL_FIELDS.some(
                          (f) => evaluateVital(f.key, v.vitals?.[f.key]).status === 'abnormal',
                        );
                        return (
                          <div key={`tl-${v.no}`} style={{ width: 260 }}>
                            <VitalSignTimelineCard
                              time={`ครั้งที่ ${v.no}`}
                              date={formatHomeVisitDate(v.date)}
                              vitals={rows}
                              badge={abnormal ? 'ผิดปกติ' : undefined}
                              selected={selectedVisitNo === v.no}
                              onClick={() => setSelectedVisitNo(selectedVisitNo === v.no ? null : v.no)}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {selectedVisit && (
                      <NoticeBand tone='neutral' icon='clipboard'>
                        ครั้งที่ {selectedVisit.no} · {formatHomeVisitDate(selectedVisit.date)} โดย {selectedVisit.by} —
                        {' '}{selectedVisit.summary || 'ไม่มีสรุปการเยี่ยม'} · คำสั่งการรักษา: {selectedVisit.orders || '—'}
                      </NoticeBand>
                    )}
                  </>
                )}
              </SectionCard>

              {/* ── 2. คะแนน ADL ────────────────────────────────────── */}
              <SectionCard
                icon='accessible'
                title='คะแนน ADL (ดัชนีบาร์เธล) แต่ละครั้งที่เยี่ยม'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    เต็ม {BARTHEL_MAX_SCORE} คะแนน · ติดสังคม 12–20 · ติดบ้าน 5–11 · ติดเตียง 0–4
                  </span>
                )}
              >
                {adlPoints.length === 0 ? (
                  <EmptyHint icon='show_chart'>
                    ไม่มีคะแนน ADL ที่บันทึกไว้ในช่วง {formatHomeVisitDate(effRange.from)} – {formatHomeVisitDate(effRange.to)}
                  </EmptyHint>
                ) : adlPoints.length === 1 ? (
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                      {formatHomeVisitDate(adlPoints[0].date)} · {adlPoints[0].value}/{BARTHEL_MAX_SCORE} คะแนน
                    </span>
                    <ColorfulBadge style={interpretBarthel(adlPoints[0].value).badge} size='small' hierarchy='secondary' width='hug' maxWidth={320}>
                      {interpretBarthel(adlPoints[0].value).label}
                    </ColorfulBadge>
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      มีผลประเมินครั้งเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 ครั้งจึงแสดงเป็นเส้นแนวโน้ม
                    </span>
                  </div>
                ) : (
                  <LineChart
                    months={adlPoints.map((p) => shortThaiDate(p.date))}
                    series={[{ label: 'คะแนน ADL (ดัชนีบาร์เธล)', color: ADL_SERIES_COLOR, values: adlPoints.map((p) => p.value) }]}
                    height={200}
                  />
                )}

                {visitsDesc.length > 0 && (
                  <>
                    <Table
                      columns={visitColumns}
                      rows={visitPageRows}
                      rowKey={(r) => `${selectedHn}-${r.no}`}
                      emptyMessage='ไม่มีการเยี่ยมในช่วงเวลาที่เลือก'
                    />
                    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <span style={{
                        color: 'var(--text-content-secondary, #636B72)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                      }}>
                        {`แสดง ${(visitPage - 1) * VISIT_PAGE_SIZE + 1}–${Math.min(visitPage * VISIT_PAGE_SIZE, visitsDesc.length)} จาก ${visitsDesc.length} ครั้ง`}
                      </span>
                      <div className='flex-1' />
                      <Pagination currentPage={visitPage} pageCount={totalVisitPages} onPageChange={setVisitPage} />
                    </div>
                  </>
                )}
              </SectionCard>

              {/* ── 3. ผล Lab ───────────────────────────────────────── */}
              <SectionCard
                icon='biotech'
                title='ผลตรวจทางห้องปฏิบัติการในช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {labs.length} รายการ ({labs.filter((r) => r.abnormal).length} รายการผิดปกติ)
                  </span>
                )}
              >
                {labs.length === 0 ? (
                  <EmptyHint icon='science'>
                    ไม่มีผล Lab ในช่วง {formatHomeVisitDate(effRange.from)} – {formatHomeVisitDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <Table columns={labColumns} rows={labs} rowKey={(r) => `${r.date}-${r.test}`} emptyMessage='ไม่มีผล Lab ในช่วงเวลาที่เลือก' />
                )}
              </SectionCard>

              {/* ── 4. ผล X-ray ─────────────────────────────────────── */}
              <SectionCard
                icon='radiology'
                title='ผลเอกซเรย์ในช่วงเวลา'
                aside={(
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {xrays.length} รายการ
                  </span>
                )}
              >
                {xrays.length === 0 ? (
                  <EmptyHint icon='image_not_supported'>
                    ไม่มีผล X-ray ในช่วง {formatHomeVisitDate(effRange.from)} – {formatHomeVisitDate(effRange.to)}
                  </EmptyHint>
                ) : (
                  <Table columns={xrayColumns} rows={xrays} rowKey={(r) => `${r.date}-${r.exam}`} emptyMessage='ไม่มีผล X-ray ในช่วงเวลาที่เลือก' />
                )}
              </SectionCard>

              {visits.length === 0 && labs.length === 0 && xrays.length === 0 && (
                <NoticeBand tone='neutral' icon='info'>
                  ไม่พบข้อมูลใด ๆ ของผู้รับบริการรายนี้ในช่วงเวลาที่เลือก — ลองขยายช่วงเวลา
                  หรือตรวจสอบว่ามีการบันทึกการเยี่ยมและส่งข้อมูลกลับศูนย์บริการฯ แล้วหรือยัง
                </NoticeBand>
              )}
            </>
          )}
        </div>
      </HomeVisitAccessGate>
    </QueuePageShell>
  );
};

export default HomeVisitFollowUpPage;
