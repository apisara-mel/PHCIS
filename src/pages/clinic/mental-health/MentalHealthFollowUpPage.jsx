import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import DatePickerRange from '@/components/forms/DatePickerRange';
import SelectableTag from '@/components/forms/SelectableTag';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ColorfulIconBadge from '@/components/badge/ColorfulIconBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Icon from '@/components/icons/Icon';
import { LineChart } from '@/components/graph/Charts';
import { ConfidentialMask } from '@/pages/clinic/mental-health/MentalHealthSteps';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  MH_SCHEDULED_TODAY,
  getMhQueueRows,
  getMhRegistrationByHn,
  resolveMhIssuedAt,
  getMhAssessmentHistory,
  getMhLabResults,
  getMhVisitEvents,
  MH_EVENT_TYPES,
  interpret9Q,
  interpret8Q,
  interpretSt5,
  interpretDementia,
  hasMentalHealthRights,
  setMentalHealthRights,
  formatMhDate,
  formatMhDateTime,
  logMhPrint,
  getMhPrintLog,
} from '@/data/mentalHealthClinic';

/* MentalHealthFollowUpPage — ติดตามการดูแลผู้รับบริการโรคเฉพาะ (สุขภาพจิต,
   TOR 1.10.3.8 + 1.10.3.1). Search a patient → pick a date range → see the
   longitudinal picture: score trends of 2Q/9Q/8Q/ST-5/สมองเสื่อม (small
   multiples — one tool per plot, single-axis, so scales are never mixed),
   the assessment history table, related lab results, and a visit timeline
   (ตรวจ / บำบัด / นัด / ส่งต่อ). Assessment-derived content is ข้อมูลลับ
   (§1.4.2) and masked without the mental-health-clinic right. */

const breadcrumb = ['บันทึกการรักษา', 'งานสุขภาพจิต', 'ติดตามผลการดูแล'];
const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:mental-health-followup';
const ASSESSMENT_PAGE_SIZE = 8;

/* One fixed color per assessment tool (identity — never re-assigned when a
   tool has no data in range). Colors alias the DS colorful-badge bold
   steps; each tool renders in its OWN plot, so hues are never adjacent
   series in one chart. */
const TOOL_SERIES = [
  { tool: '9Q', label: 'ซึมเศร้า (9Q)', color: 'var(--surface-colorfulbadge-blue-bold, #3B82F6)', max: 27 },
  { tool: '8Q', label: 'ฆ่าตัวตาย (8Q)', color: 'var(--surface-colorfulbadge-purple-bold, #A855F7)', max: 35 },
  { tool: 'ST-5', label: 'ความเครียด (ST-5)', color: 'var(--surface-colorfulbadge-orange-bold, #F97316)', max: 15 },
  { tool: '2Q', label: 'ซึมเศร้า (2Q)', color: 'var(--surface-colorfulbadge-teal-bold, #24A899)', max: 2 },
  { tool: 'สมองเสื่อม', label: 'สมองเสื่อม (AMT)', color: 'var(--surface-colorfulbadge-indigo-bold, #818CF8)', max: 10 },
];

const TOOL_BADGE_STYLE = { '9Q': 'blue', '8Q': 'purple', 'ST-5': 'orange', '2Q': 'teal', 'สมองเสื่อม': 'indigo' };

/* การแปลผล is COMPUTED from the same interpret* rules the record form
   uses — never hand-typed (module hard rule). */
const interpFor = (tool, score) => {
  switch (tool) {
    case '9Q': return interpret9Q(score);
    case '8Q': return interpret8Q(score);
    case 'ST-5': return interpretSt5(score);
    case 'สมองเสื่อม': return interpretDementia(score);
    case '2Q': return score > 0
      ? { label: 'ผลบวก — ประเมินต่อด้วย 9Q', style: 'orange' }
      : { label: 'ปกติ', style: 'green' };
    default: return { label: '—', style: 'grey' };
  }
};

const LAB_FLAG = {
  normal: { style: 'green', label: 'ปกติ' },
  high: { style: 'red', label: 'สูงกว่าเกณฑ์' },
  low: { style: 'blue', label: 'ต่ำกว่าเกณฑ์' },
};

const isoOf = (d) => d.toISOString().slice(0, 10);
const todayIso = () => isoOf(new Date());
const monthsAgoIso = (n) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return isoOf(d);
};
const startOfMonthIso = () => {
  const d = new Date();
  d.setDate(1);
  return isoOf(d);
};

const QUICK_RANGES = [
  { key: 'thisMonth', label: 'เดือนนี้', from: startOfMonthIso },
  { key: '3m', label: '3 เดือน', from: () => monthsAgoIso(3) },
  { key: '6m', label: '6 เดือน', from: () => monthsAgoIso(6) },
  { key: '1y', label: '1 ปี', from: () => monthsAgoIso(12) },
];

/* Short Thai date for chart axis ticks (formatMhDate is too wide there). */
const TH_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const shortThaiDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]}`;
};

const SectionCard = ({ icon, title, aside, children }) => (
  <section
    className='w-full flex flex-col'
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
      boxShadow: 'var(--shadow-card-strong)',
      paddingTop: 'var(--dim-space-600, 24px)',
      paddingBottom: 'var(--dim-space-600, 24px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      gap: 'var(--dim-space-400, 16px)',
    }}
  >
    <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      <span className='text-brand-500'><Icon name={icon} size={20} /></span>
      <h2 className='text-base font-bold text-brand-500'>{title}</h2>
      <div className='flex-1' />
      {aside}
    </div>
    {children}
  </section>
);

const EmptyHint = ({ icon = 'search_off', children }) => (
  <div
    className='flex flex-col items-center justify-center w-full text-center'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-800, 48px)',
      paddingBottom: 'var(--dim-space-800, 48px)',
      color: 'var(--text-content-tertiary, #858C92)',
      fontSize: 'var(--type-size-sm)',
    }}
  >
    <Icon name={icon} size={32} />
    <span>{children}</span>
  </div>
);

const patientToSearchItem = (row) => ({
  id: row.hn,
  label: row.name,
  sublabel: row.doctor,
  value: row.name,
  badges: [
    { label: row.hn, tone: 'indigo' },
    ...(row.mhNumber ? [{ label: row.mhNumber, tone: 'teal' }] : []),
  ],
  avatarSrc: getPatientByHN(row.hn)?.avatarUrl,
});

const MentalHealthFollowUpPage = () => {
  const history = useHistory();
  const [selectedHn, setSelectedHn] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [quick, setQuick] = useState('6m');
  const [range, setRange] = useState({ from: monthsAgoIso(6), to: todayIso() });
  const [assessmentPage, setAssessmentPage] = useState(1);
  /* Re-render hook for the §1.4.2 rights demo toggle (sessionStorage). */
  const [, setRightsTick] = useState(0);
  /* Re-render hook for the print audit log (sessionStorage). */
  const [printTick, setPrintTick] = useState(0);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  /* Patient pool = today's clinic roster (queue + scheduled). */
  const pool = useMemo(() => {
    const seen = new Set();
    return [...getMhQueueRows(), ...MH_SCHEDULED_TODAY]
      .filter((p) => (seen.has(p.hn) ? false : seen.add(p.hn)));
  }, []);

  const selectedRow = useMemo(
    () => pool.find((p) => p.hn === selectedHn) || null,
    [pool, selectedHn],
  );
  const cardPatient = useMemo(
    () => (selectedHn && getPatientByHN(selectedHn)) || DEFAULT_PATIENT,
    [selectedHn],
  );
  const registration = useMemo(
    () => (selectedHn ? getMhRegistrationByHn(selectedHn) : null),
    [selectedHn],
  );

  const canRead = hasMentalHealthRights();

  const assessments = useMemo(
    () => (selectedHn ? getMhAssessmentHistory(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );
  const labs = useMemo(
    () => (selectedHn ? getMhLabResults(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );
  const events = useMemo(
    () => (selectedHn ? getMhVisitEvents(selectedHn, range.from, range.to) : []),
    [selectedHn, range],
  );

  const assessmentsSorted = useMemo(
    () => [...assessments].sort((a, b) => b.date.localeCompare(a.date) || a.tool.localeCompare(b.tool)),
    [assessments],
  );
  const eventsSorted = useMemo(
    () => [...events].sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );

  /* Per-tool trend data — a tool with ≥2 points gets a line, exactly one
     point renders as a dot (LineChart needs ≥2 x-positions), zero points
     is omitted. */
  const toolTrends = useMemo(() => TOOL_SERIES.map((t) => {
    const points = assessments
      .filter((a) => a.tool === t.tool)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { ...t, points };
  }).filter((t) => t.points.length > 0), [assessments]);

  const latest9Q = useMemo(() => {
    const rows = assessmentsSorted.filter((a) => a.tool === '9Q');
    return rows.length > 0 ? rows[0] : null;
  }, [assessmentsSorted]);

  const summaryCards = useMemo(() => ([
    { key: 'assessments', label: 'ครั้งที่ประเมินในช่วง', value: assessments.length, color: 'info', icon: 'checklist' },
    { key: 'labs', label: 'ผลตรวจแลปในช่วง', value: labs.length, color: 'info', icon: 'labs' },
    { key: 'events', label: 'เหตุการณ์การดูแล', value: events.length, color: 'positive', icon: 'timeline' },
    {
      key: 'latest9q',
      label: '9Q ครั้งล่าสุดในช่วง',
      value: canRead ? (latest9Q ? latest9Q.score : '—') : '••',
      color: latest9Q && interpret9Q(latest9Q.score).referDoctor ? 'negative' : 'positive',
      icon: 'psychology'},
  ]), [assessments, labs, events, latest9Q, canRead]);

  const totalAssessmentPages = Math.max(1, Math.ceil(assessmentsSorted.length / ASSESSMENT_PAGE_SIZE));
  const assessmentPageRows = assessmentsSorted.slice(
    (assessmentPage - 1) * ASSESSMENT_PAGE_SIZE,
    assessmentPage * ASSESSMENT_PAGE_SIZE,
  );
  useEffect(() => {
    if (assessmentPage > totalAssessmentPages) setAssessmentPage(totalAssessmentPages);
  }, [assessmentPage, totalAssessmentPages]);

  const pickQuick = (key) => {
    const q = QUICK_RANGES.find((r) => r.key === key);
    if (!q) return;
    setQuick(key);
    setRange({ from: q.from(), to: todayIso() });
    setAssessmentPage(1);
  };

  const selectPatient = (hn) => {
    setSelectedHn(hn);
    setAssessmentPage(1);
  };

  const pickerMatchCount = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return 0;
    return pool.filter((row) => [row.hn, row.cid, row.name, row.mhNumber]
      .some((f) => f && f.toLowerCase().includes(q))).length;
  }, [searchQ, pool]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter((row) => [row.hn, row.cid, row.name, row.mhNumber].some((f) => f && f.toLowerCase().includes(q)))
      .slice(0, 8)
      .map(patientToSearchItem);
  }, [searchQ, pool]);

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = pool.find((row) => row.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return pool.find((row) =>
      [row.hn, row.cid, row.name, row.mhNumber].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  const toggleRightsDemo = () => {
    setMentalHealthRights(!hasMentalHealthRights());
    setRightsTick((t) => t + 1);
  };

  /* พิมพ์สรุปการติดตาม (playbook §5 การพิมพ์เอกสาร) — ใช้ audit log ตัว
     เดียวกับหน้าบันทึกสุขภาพจิต (ผู้พิมพ์ + เวลา). */
  const printLog = useMemo(
    () => (selectedHn ? getMhPrintLog(selectedHn) : []),
    [selectedHn, printTick],
  );

  const hasPrintableData = assessments.length > 0 || labs.length > 0 || events.length > 0;
  const canPrint = !!selectedHn && !!registration && canRead && hasPrintableData;

  const printSummary = () => {
    if (!selectedHn) return;
    logMhPrint(selectedHn, `สรุปการติดตามการดูแล (${formatMhDate(range.from)} – ${formatMhDate(range.to)})`);
    setPrintTick((t) => t + 1);
  };

  const assessmentColumns = [
    { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatMhDate(r.date) },
    {
      key: 'tool', label: 'แบบประเมิน',
      render: (r) => (
        <ColorfulBadge style={TOOL_BADGE_STYLE[r.tool] || 'grey'} size='small' hierarchy='secondary'>{r.tool}</ColorfulBadge>
      ),
    },
    { key: 'score', label: 'คะแนน', render: (r) => r.score },
    {
      key: 'interp', label: 'การแปลผล', flex: true, minWidth: 240, sortable: false,
      render: (r) => {
        const it = interpFor(r.tool, r.score);
        return <ColorfulBadge style={it.style} size='small' hierarchy='secondary' width='hug' maxWidth={420}>{it.label}</ColorfulBadge>;
      },
    },
    { key: 'assessor', label: 'ผู้ประเมิน', flex: true, minWidth: 180 },
  ];

  const labColumns = [
    { key: 'date', label: 'วันที่ตรวจ', render: (r) => formatMhDate(r.date) },
    { key: 'test', label: 'รายการตรวจ', flex: true, minWidth: 180 },
    { key: 'value', label: 'ผล' },
    { key: 'unit', label: 'หน่วย' },
    { key: 'ref', label: 'ค่าอ้างอิง' },
    {
      key: 'flag', label: 'สถานะ', sortable: false,
      render: (r) => {
        const f = LAB_FLAG[r.flag] || LAB_FLAG.normal;
        return <ColorfulBadge style={f.style} size='small' hierarchy='secondary'>{f.label}</ColorfulBadge>;
      },
    },
  ];

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ติดตามการดูแลผู้รับบริการ — สุขภาพจิต'
      onBack={() => history.push('/clinic/mental-health')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canRead ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิการเข้าถึงข้อมูลลับ (สำหรับทดสอบ)'
          >
            {canRead ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          {/* พิมพ์อยู่ท้ายหน้าเป็นหลัก (ดูก่อนพิมพ์) — ปุ่มบนนี้เป็นทางลัด
              เฉพาะตอนที่มีข้อมูลให้พิมพ์จริง จึงไม่รกเมื่อยังไม่ได้เลือกคน */}
          {canPrint && (
            <BrandSubdueButton variant='outline' leadingIcon='print' onClick={printSummary}>
              พิมพ์สรุปการติดตาม
            </BrandSubdueButton>
          )}
          <BrandSubdueButton
            variant='outline'
            leadingIcon='contact_page'
            onClick={() => history.push('/clinic/mental-health/registry')}
          >
            ทะเบียนสุขภาพจิต
          </BrandSubdueButton>
        </div>
      )}
      summaryCards={summaryCards}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-600, 24px)' }}>

        {/* ── Patient search ─────────────────────────────────────────── */}
        <SectionCard icon='person_search' title='เลือกผู้รับบริการ'>
          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label, item) => {
                setSearchQ(label);
                const match = resolveSearchRow(label, item);
                pushHistory(match ? patientToSearchItem(match) : (item ?? label));
                if (match) selectPatient(match.hn);
              }}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
              placeholder='ค้นหา HN / เลขบัตรประชาชน / ชื่อ-สกุลผู้รับบริการ / เลขที่สุขภาพจิต'
              width={640}
            />
          </div>
          {searchQ.trim() && !selectedHn ? (
            <SearchResultCount found={pickerMatchCount} total={pool.length} />
          ) : null}
          {searchQ.trim() && searchSuggestions.length === 0 && !selectedHn && (
            <EmptyHint>ไม่พบผู้รับบริการที่ตรงกับ "{searchQ.trim()}" — ตรวจสอบ HN / ชื่อ แล้วลองอีกครั้ง</EmptyHint>
          )}
          {!selectedHn && !searchQ.trim() && (
            <EmptyHint icon='monitoring'>
              ค้นหาและเลือกผู้รับบริการเพื่อดูแนวโน้มผลประเมิน ผลแลป และเหตุการณ์การดูแลย้อนหลัง
            </EmptyHint>
          )}
        </SectionCard>

        {selectedHn && (
          <PatientCard
            patient={cardPatient}
            title='ติดตามผลการดูแลรายบุคคล'
            onBack={() => setSelectedHn(null)}
            actions={(
              <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                {registration && (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                    {registration.mhNumber} · {resolveMhIssuedAt(registration.issuedAt)}
                  </ColorfulBadge>
                )}
              </div>
            )}
          />
        )}

        {/* ผู้ป่วยยังไม่มีทะเบียนสุขภาพจิต → ลงทะเบียนก่อน (1.10.3.8 edge) */}
        {selectedHn && !registration && (
          <SectionCard icon='contact_page' title='ยังไม่มีทะเบียนสุขภาพจิต'>
            <EmptyHint icon='assignment_late'>
              {selectedRow?.name || 'ผู้รับบริการ'} (HN {selectedHn}) ยังไม่ได้ลงทะเบียนสุขภาพจิต —
              ต้องลงทะเบียนก่อนจึงจะติดตามผลการดูแลต่อเนื่องได้
            </EmptyHint>
            <div className='flex items-center justify-center w-full'>
              <BrandSubdueButton variant='fill' leadingIcon='person_add' onClick={() => history.push('/clinic/mental-health/registry')}>
                ไปที่ทะเบียนสุขภาพจิต
              </BrandSubdueButton>
            </div>
          </SectionCard>
        )}

        {selectedHn && registration && (
          <>
            {/* ── Date range ─────────────────────────────────────────── */}
            <SectionCard icon='date_range' title='ช่วงเวลาที่ติดตาม'>
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {QUICK_RANGES.map((r) => (
                  <SelectableTag
                    key={r.key}
                    label={r.label}
                    size='md'
                    selected={quick === r.key}
                    onClick={() => pickQuick(r.key)}
                  />
                ))}
                <div style={{ minWidth: 320 }}>
                  <DatePickerRange
                    showLabel={false}
                    showHelperText={false}
                    size='md'
                    value={[range.from, range.to]}
                    onChange={([from, to]) => {
                      setRange({ from, to });
                      setQuick(null);
                      setAssessmentPage(1);
                    }}
                    format={isoOf}
                    parse={(s) => (s ? new Date(s) : null)}
                  />
                </div>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {formatMhDate(range.from)} – {formatMhDate(range.to)}
                </span>
              </div>
            </SectionCard>

            {!canRead ? (
              <SectionCard icon='lock_person' title='ข้อมูลการติดตามผล'>
                <ConfidentialMask what='แนวโน้มผลประเมิน ผลแลป และเหตุการณ์การดูแลสุขภาพจิต' />
              </SectionCard>
            ) : (
              <>
                {/* ── Score trends (small multiples, one tool per plot) ── */}
                <SectionCard
                  icon='monitoring'
                  title='แนวโน้มคะแนนแบบประเมิน'
                  aside={(
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      แสดงเฉพาะเครื่องมือที่มีผลประเมินในช่วงที่เลือก
                    </span>
                  )}
                >
                  {toolTrends.length === 0 ? (
                    <EmptyHint icon='show_chart'>
                      ไม่มีผลประเมินในช่วง {formatMhDate(range.from)} – {formatMhDate(range.to)} —
                      ปรับช่วงเวลา หรือประเมินจากหน้าบันทึกสุขภาพจิต
                    </EmptyHint>
                  ) : (
                    <div
                      className='w-full'
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 'var(--dim-space-400, 16px)',
                      }}
                    >
                      {toolTrends.map((t) => (
                        <div
                          key={t.tool}
                          className='flex flex-col'
                          style={{
                            gap: 'var(--dim-space-200, 8px)',
                            paddingTop: 'var(--dim-space-400, 16px)',
                            paddingBottom: 'var(--dim-space-400, 16px)',
                            paddingLeft: 'var(--dim-space-400, 16px)',
                            paddingRight: 'var(--dim-space-400, 16px)',
                            borderRadius: 'var(--dim-radius-chart-area, 10px)',
                            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
                            background: 'var(--surface-chart-area, #FEFEFE)',
                          }}
                        >
                          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <span
                              aria-hidden='true'
                              style={{
                                width: 'var(--dim-space-200, 8px)',
                                height: 'var(--dim-space-200, 8px)',
                                borderRadius: '50%',
                                background: t.color,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                              {t.label}
                            </span>
                            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-chart-axis-label, #A3ACB4)' }}>
                              เต็ม {t.max}
                            </span>
                          </div>
                          {t.points.length >= 2 ? (
                            <LineChart
                              months={t.points.map((p) => shortThaiDate(p.date))}
                              series={[{ label: t.label, color: t.color, values: t.points.map((p) => p.score) }]}
                              height={150}
                            />
                          ) : (
                            /* Single data point — a dot, not a line. */
                            <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', paddingTop: 'var(--dim-space-400, 16px)', paddingBottom: 'var(--dim-space-400, 16px)' }}>
                              <span
                                aria-hidden='true'
                                style={{
                                  width: 'var(--dim-space-300, 12px)',
                                  height: 'var(--dim-space-300, 12px)',
                                  borderRadius: '50%',
                                  background: t.color,
                                  flexShrink: 0,
                                }}
                              />
                              <div className='flex flex-col'>
                                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                                  คะแนน {t.points[0].score}/{t.max} · {formatMhDate(t.points[0].date)}
                                </span>
                                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                                  มีผลประเมินครั้งเดียวในช่วงนี้ — ต้องมีอย่างน้อย 2 ครั้งจึงแสดงเป็นเส้นแนวโน้ม
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {/* ── Assessment history ─────────────────────────────── */}
                <SectionCard icon='checklist' title='ประวัติการประเมิน'>
                  <Table
                    columns={assessmentColumns}
                    rows={assessmentPageRows}
                    rowKey={(r) => `${r.date}-${r.tool}`}
                    emptyMessage='ไม่มีผลประเมินในช่วงเวลาที่เลือก'
                  />
                  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ color: 'var(--text-content-secondary, #636B72)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                      {`แสดง ${assessmentsSorted.length === 0 ? 0 : (assessmentPage - 1) * ASSESSMENT_PAGE_SIZE + 1}–${Math.min(assessmentPage * ASSESSMENT_PAGE_SIZE, assessmentsSorted.length)} จาก ${assessmentsSorted.length} รายการ`}
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={assessmentPage} pageCount={totalAssessmentPages} onPageChange={setAssessmentPage} />
                  </div>
                </SectionCard>

                {/* ── Related labs ───────────────────────────────────── */}
                <SectionCard
                  icon='labs'
                  title='ผลตรวจทางห้องปฏิบัติการที่เกี่ยวข้อง'
                  aside={(
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      เช่น ระดับยา Lithium · TFT · CBC — {labs.length} รายการในช่วง
                    </span>
                  )}
                >
                  <Table
                    columns={labColumns}
                    rows={labs}
                    rowKey={(r) => `${r.date}-${r.test}`}
                    emptyMessage='ไม่มีผลตรวจแลปในช่วงเวลาที่เลือก'
                  />
                </SectionCard>

                {/* ── Visit timeline (ตรวจ / บำบัด / นัด / ส่งต่อ) ────── */}
                <SectionCard icon='timeline' title='เหตุการณ์การดูแล'>
                  {eventsSorted.length === 0 ? (
                    <EmptyHint icon='event_note'>ไม่มีเหตุการณ์การดูแลในช่วงเวลาที่เลือก</EmptyHint>
                  ) : (
                    <div className='flex flex-col w-full'>
                      {eventsSorted.map((ev, idx) => {
                        const type = MH_EVENT_TYPES[ev.type] || MH_EVENT_TYPES.exam;
                        const isLast = idx === eventsSorted.length - 1;
                        return (
                          <div key={`${ev.date}-${idx}`} className='flex w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                            <div className='flex flex-col items-center'>
                              <ColorfulIconBadge style={type.style} icon={type.icon} size='medium' />
                              {!isLast && (
                                <div
                                  aria-hidden='true'
                                  style={{
                                    width: 'var(--dim-stroke-200, 2px)',
                                    flex: 1,
                                    background: 'var(--border-neutral-quaternary, #EEF0F1)',
                                  }}
                                />
                              )}
                            </div>
                            <div
                              className='flex flex-col flex-1 min-w-0'
                              style={{ gap: 'var(--dim-space-100, 4px)', paddingBottom: isLast ? 0 : 'var(--dim-space-500, 20px)' }}
                            >
                              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                                <ColorfulBadge style={type.style} size='small' hierarchy='secondary'>{type.label}</ColorfulBadge>
                                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                                  {formatMhDate(ev.date)}
                                </span>
                              </div>
                              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                                {ev.title}
                              </span>
                              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                                {ev.detail}
                              </span>
                              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                                โดย {ev.by}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                {/* ── พิมพ์เอกสาร (playbook §5) ─────────────────────── */}
                <SectionCard
                  icon='print'
                  title='พิมพ์เอกสาร'
                  aside={(
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      บันทึกผู้พิมพ์และเวลาทุกครั้ง (ข้อมูลลับ §1.4.2)
                    </span>
                  )}
                >
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                    <BrandSubdueButton
                      variant='outline'
                      leadingIcon='print'
                      disabled={!hasPrintableData}
                      onClick={printSummary}
                    >
                      พิมพ์สรุปการติดตาม
                    </BrandSubdueButton>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                      ช่วง {formatMhDate(range.from)} – {formatMhDate(range.to)} ·
                      ประเมิน {assessments.length} ครั้ง · แลป {labs.length} รายการ ·
                      เหตุการณ์ {eventsSorted.length} รายการ
                    </span>
                  </div>
                  {!hasPrintableData && (
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                      ไม่มีข้อมูลในช่วงที่เลือก — ปรับช่วงเวลาก่อนพิมพ์
                    </span>
                  )}
                  {printLog.length > 0 && (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      {printLog.map((e, i) => (
                        <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                          พิมพ์{e.docType} โดย {e.by} · {formatMhDateTime(e.at)}
                        </span>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </>
        )}
      </div>
    </QueuePageShell>
  );
};

export default MentalHealthFollowUpPage;
