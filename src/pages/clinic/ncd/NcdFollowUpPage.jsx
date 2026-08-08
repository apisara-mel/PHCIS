import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import TabCapsule from '@/components/tab/TabCapsule';
import DatePickerRange from '@/components/forms/DatePickerRange';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import VitalSignTimelineCard from '@/components/card/VitalSignTimelineCard';
import NcdTrendSection from '@/pages/clinic/ncd/NcdTrendSection';
import {
  DmControlGaugeCard,
  HtControlGaugeCard,
  DmComplicationsCard,
  SingleGaugeCard,
} from '@/components/graph/DashboardCards';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  resolveNcdGroup,
  formatNcdDate,
  getNcdRegistryRows,
  getNcdCancellation,
  getNcdFollowUpVisits,
  getNcdVisitCount,
  getNcdAppointment,
  computeNcdControlStats,
} from '@/data/ncdVisits';

/* NcdFollowUpPage — การติดตามการดูแลผู้รับบริการโรคเฉพาะ (TOR 1.10.2.8) at
   /clinic/ncd/followup. Pick a patient (or arrive with an HN in nav state
   from the queue / registry / record links), choose ช่วงเวลา, then read the
   period's medical data both ways the TOR asks for:

     • ตารางข้อมูล — one row per visit × ตรวจร่างกาย / ทันตกรรม / Lab (FBS,
       HbA1c, LDL, eGFR) / X-ray, "—" wherever a visit never had that exam,
       paginated with the ANC snap-back contract
     • แผนภูมิ — DmControlGaugeCard / HtControlGaugeCard /
       DmComplicationsCard prop-overridden from their population-level
       ปีงบฯ 2569 defaults to THIS patient's period stats (title, value,
       label, sub all per-patient so the card can't be misread as a
       dashboard stat) + a PEFR SingleGaugeCard for asthma/COPD
     • กราฟ — NcdTrendSection: real per-metric line charts over the SAME
       `visits` array (น้ำตาล / ความดัน / ไขมัน-ไต / ปอด / น้ำหนัก), plus the
       visit-by-visit rail of VitalSignTimelineCard for the per-visit detail

   Edge cases from the spec: no data in the selected range shows placeholder
   text instead of misleading gauges/trends; a single visit renders the
   table + gauges but withholds the trend rail and prints the lone value
   instead of a chart axis; a metric the patient has no results for says so
   instead of drawing a flat zero line; the dental / X-ray columns show "—"
   when never examined (dental rows are static mocks — NOT imported from the
   sibling dental module, playbook §4 file-scope rule). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานกลุ่มโรคเฉพาะ NCD'];

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:ncd-followup';
const PAGE_SIZE = 8;

/* Gauge chart colors — same literals the DashboardCards defaults already
   use (chart-series colors are not tokenized; matching the DS defaults
   keeps the follow-up gauges visually identical to the dashboard family). */
const GAUGE_TEAL = '#14B8A6';
const GAUGE_INDIGO = '#6366F1';
const GAUGE_PINK = '#EC4899';

/* PEFR target for the lung-function gauge — generic adult reference used
   for the mock; a real deployment derives per-patient predicted PEFR from
   sex/age/height (flagged for clinical review in the manifest). */
const PEFR_TARGET = 450;

const isoDaysAgo = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};
const todayIso = () => new Date().toISOString().slice(0, 10);

const RANGE_OPTIONS = [
  { key: '3m',     label: '3 เดือนล่าสุด' },
  { key: '6m',     label: '6 เดือนล่าสุด' },
  { key: '12m',    label: '1 ปีล่าสุด' },
  { key: 'all',    label: 'ทั้งหมด' },
  { key: 'custom', label: 'กำหนดเอง' },
];

const isoFormat = (d) => (d ? d.toISOString().slice(0, 10) : '');
const isoParse = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const isAbnormalVisit = (v) =>
  (v.sbp != null && v.sbp >= 140) || (v.dbp != null && v.dbp >= 90)
  || (v.fbs != null && v.fbs >= 126) || (v.hba1c != null && v.hba1c >= 7)
  || (v.spo2 != null && v.spo2 < 95);

const dash = (v, unit = '') => (v == null || v === '' ? '—' : `${v}${unit}`);

/* Whole-phrase screening markers — see the dmScreening comment below. */
const FOOT_MARKERS = ['ตรวจเท้า', 'ที่เท้า', 'ปลายเท้า', 'หลังเท้า', 'monofilament'];
const EYE_MARKERS = ['ตรวจตา', 'ตรวจจอประสาทตา', 'จอประสาทตา', 'ตาประจำปี', 'DR'];

const SectionHeader = ({ icon, children, action }) => (
  <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
    <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}><Icon name={icon} size={20} /></span>
    <h2
      className='flex-1 min-w-0'
      style={{
        fontSize: 'var(--type-size-base)',
        fontWeight: 'var(--type-weight-bold)',
        color: 'var(--text-brandPrimary-default, #007549)',
      }}
    >
      {children}
    </h2>
    {action}
  </div>
);

const EmptyRangeCard = ({ children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200)',
      padding: 'var(--dim-space-700, 40px)',
      borderRadius: 'var(--dim-radius-400)',
      border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #C6CACD)',
      color: 'var(--text-content-tertiary)',
    }}
  >
    <Icon name='monitoring' size={32} />
    <span style={{ fontSize: 'var(--type-size-sm)' }}>{children}</span>
  </div>
);

const registryRowToSearchItem = (row) => {
  const profile = getPatientByHN(row.hn);
  const identity = profile
    ? [profile.sex, profile.age, profile.nationalId, profile.insurance].filter(Boolean).join(' · ')
    : row.doctor;
  return {
    id: row.hn,
    label: row.name,
    sublabel: identity,
    value: row.name,
    badges: [
      { label: row.hn, tone: 'indigo' },
      ...(row.diseaseGroups || []).slice(0, 2).map((key) => ({
        label: resolveNcdGroup(key)?.short || key,
        tone: 'teal',
      })),
    ],
    avatarSrc: profile?.avatarUrl,
  };
};

const NcdFollowUpPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [hn, setHn] = useState(navState?.hn || '');
  const [searchQ, setSearchQ] = useState('');
  const [rangeKey, setRangeKey] = useState('12m');
  const [customRange, setCustomRange] = useState(['', '']);
  const [page, setPage] = useState(1);
  const [detailVisit, setDetailVisit] = useState(null);
  const [selectedVisitIdx, setSelectedVisitIdx] = useState(null);

  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(SEARCH_HISTORY_KEY, { seedIfEmpty: [] });

  const registryRows = useMemo(() => getNcdRegistryRows(), []);
  const registration = registryRows.find((r) => r.hn === hn) || null;
  const cancellation = hn ? getNcdCancellation(hn) : null;
  const profile = hn ? getPatientByHN(hn) : null;
  /* นัดหมายครั้งถัดไป booked from the record (TOR 1.10.2.5 "แสดง" outside the
     record itself) — cancelled bookings still show, flagged, never hidden. */
  const nextAppt = hn ? getNcdAppointment(hn) : null;

  /* ช่วงเวลา — quick ranges map to [from, to]; "ทั้งหมด" leaves both open;
     กำหนดเอง reads the DatePickerRange pair (either side may stay open). */
  const [fromIso, toIso] = useMemo(() => {
    switch (rangeKey) {
      case '3m':     return [isoDaysAgo(3), todayIso()];
      case '6m':     return [isoDaysAgo(6), todayIso()];
      case '12m':    return [isoDaysAgo(12), todayIso()];
      case 'custom': return [customRange[0] || null, customRange[1] || null];
      default:       return [null, null];
    }
  }, [rangeKey, customRange]);

  const visits = useMemo(
    () => (hn ? getNcdFollowUpVisits(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const stats = useMemo(() => computeNcdControlStats(visits), [visits]);
  const diseaseGroups = registration?.diseaseGroups || [];
  const hasDm = diseaseGroups.includes('dm');
  const hasHt = diseaseGroups.includes('ht');
  const hasResp = diseaseGroups.includes('asthma') || diseaseGroups.includes('copd');

  /* Complication-screening coverage (DM) — share of the period's visits
     where the foot / retina exam was documented.

     Matched on WHOLE clinical phrases, never on the bare syllables. 'ตา' is a
     two-character Thai substring that also appears inside ordinary words
     ('ตามนัด', 'ตาราง'), so `includes('ตา')` counted "ปรึกษาทางไกล — ทบทวน…
     ตามนัด" as an eye screening and overstated the coverage gauge. */
  const dmScreening = useMemo(() => {
    if (!visits.length) return { foot: 0, eye: 0 };
    const matches = (text, markers) => markers.some((m) => (text || '').includes(m));
    const foot = visits.filter((v) => matches(v.exam, FOOT_MARKERS)).length;
    const eye = visits.filter((v) => matches(v.exam, EYE_MARKERS)).length;
    return {
      foot: Math.round((foot / visits.length) * 100),
      eye: Math.round((eye / visits.length) * 100),
    };
  }, [visits]);

  /* Reset paging + selection whenever patient or range changes. */
  useEffect(() => {
    setPage(1);
    setSelectedVisitIdx(null);
  }, [hn, fromIso, toIso]);

  const totalPages = Math.max(1, Math.ceil(visits.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  /* Table calls rowKey(row) without an index — stamp a stable key while
     slicing (dates alone could collide when a visit is confirmed twice in
     one session). */
  const pageVisits = visits
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((v, i) => ({ ...v, _rowKey: `${v.date}-${(page - 1) * PAGE_SIZE + i}` }));
  const rangeStart = visits.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, visits.length);

  /* ── Patient picker ─────────────────────────────────────────────── */

  const pickerMatches = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return registryRows;
    return registryRows.filter((r) =>
      [r.hn, r.name, r.doctor, r.icd10].some((f) => f && f.toLowerCase().includes(q)),
    );
  }, [registryRows, searchQ]);

  const searchSuggestions = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    if (!q) return [];
    return pickerMatches.slice(0, 8).map(registryRowToSearchItem);
  }, [searchQ, pickerMatches]);

  const selectPatient = (row) => {
    setHn(row.hn);
    setSearchQ('');
    pushHistory(registryRowToSearchItem(row));
  };

  const resolveSearchRow = (query, item) => {
    if (item?.id) {
      const byId = registryRows.find((r) => r.hn === item.id);
      if (byId) return byId;
    }
    const q = (query ?? item?.value ?? item?.label ?? '').toString().trim().toLowerCase();
    if (!q) return null;
    return registryRows.find((r) =>
      [r.hn, r.name, r.doctor, r.icd10].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  /* ── Summary cards (only once a patient is chosen) ──────────────── */

  const summaryCards = useMemo(() => {
    if (!hn) return undefined;
    return [
      { key: 'visits', label: 'ครั้งที่รับบริการในช่วง', value: visits.length, color: 'info', icon: 'event_available' },
      { key: 'hba1c', label: 'HbA1c ล่าสุด (%)', value: stats.latestHba1c != null ? stats.latestHba1c : '—', color: 'brand', icon: 'water_drop' },
      { key: 'bp', label: 'ความดันล่าสุด (mmHg)', value: stats.latestBp || '—', color: 'inprogress', icon: 'monitor_heart' },
      { key: 'pefr', label: 'PEFR ล่าสุด (L/min)', value: stats.latestPefr != null ? stats.latestPefr : '—', color: 'positive', icon: 'pulmonology' },
    ];
  }, [hn, visits, stats]);

  /* ── ตาราง — visits × ผลตรวจ (TOR 1.10.2.8 ตารางข้อมูล) ───────────── */

  const columns = useMemo(() => ([
    { key: 'date', label: 'วันที่', render: (v) => formatNcdDate(v.date) },
    {
      key: 'type', label: 'ประเภท',
      render: (v) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          {v.type === 'Telemedicine' && <Icon name='videocam' size={14} />}
          {v.type}
        </span>
      ),
    },
    {
      key: 'bp', label: 'BP',
      render: (v) => (
        <span style={(v.sbp != null && v.sbp >= 140) || (v.dbp != null && v.dbp >= 90) ? { color: 'var(--text-danger-default, #C72121)', fontWeight: 'var(--type-weight-medium)' } : undefined}>
          {dash(v.bp)}
        </span>
      ),
    },
    {
      key: 'fbs', label: 'FBS',
      render: (v) => (
        <span style={v.fbs != null && v.fbs >= 126 ? { color: 'var(--text-danger-default, #C72121)', fontWeight: 'var(--type-weight-medium)' } : undefined}>
          {dash(v.fbs)}
        </span>
      ),
    },
    {
      key: 'hba1c', label: 'HbA1c',
      render: (v) => (
        <span style={v.hba1c != null && v.hba1c >= 7 ? { color: 'var(--text-danger-default, #C72121)', fontWeight: 'var(--type-weight-medium)' } : undefined}>
          {dash(v.hba1c)}
        </span>
      ),
    },
    { key: 'ldl',  label: 'LDL', render: (v) => dash(v.ldl) },
    { key: 'egfr', label: 'eGFR', render: (v) => dash(v.egfr) },
    { key: 'pefr', label: 'PEFR', render: (v) => dash(v.pefr) },
    { key: 'spo2', label: 'SpO₂', render: (v) => dash(v.spo2, '%') },
    { key: 'exam',   label: 'ผลตรวจร่างกาย',   flex: true, minWidth: 180, render: (v) => <span className='truncate block'>{dash(v.exam)}</span> },
    { key: 'dental', label: 'การตรวจทันตกรรม', flex: true, minWidth: 150, render: (v) => <span className='truncate block'>{dash(v.dental)}</span> },
    { key: 'xray',   label: 'X-ray',           flex: true, minWidth: 150, render: (v) => <span className='truncate block'>{dash(v.xray)}</span> },
    {
      key: 'attachments', label: 'เอกสารแนบ', sortable: false,
      render: (v) => ((v.attachments || []).length === 0 ? '—' : (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <Icon name='attach_file' size={14} />
          {v.attachments.length} ไฟล์
        </span>
      )),
    },
    {
      key: 'detail', label: '', sortable: false,
      render: (v) => (
        <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setDetailVisit(v); }}>
          รายละเอียด
        </NeutralSubdueButton>
      ),
    },
  ]), []);

  /* ── Timeline card mapping ──────────────────────────────────────── */

  const timelineVitals = (v) => [
    v.bp != null ? { label: 'ความดันโลหิต', value: `${v.bp} mmHg` } : null,
    v.pulse != null ? { label: 'ชีพจร', value: `${v.pulse} /นาที` } : null,
    v.fbs != null ? { label: 'FBS', value: `${v.fbs} mg/dL` } : null,
    v.hba1c != null ? { label: 'HbA1c', value: `${v.hba1c} %` } : null,
    v.pefr != null ? { label: 'PEFR', value: `${v.pefr} L/min` } : null,
    v.spo2 != null ? { label: 'SpO₂', value: `${v.spo2} %` } : null,
    v.weight != null ? { label: 'น้ำหนัก', value: `${v.weight} กก.` } : null,
  ].filter(Boolean);

  const groupBadges = (row) => (row.diseaseGroups || []).map((key) => {
    const g = resolveNcdGroup(key);
    return g ? <ColorfulBadge key={key} style={g.badge} size='small' hierarchy='secondary'>{g.short}</ColorfulBadge> : null;
  });

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='การติดตามการดูแลผู้รับบริการโรคเฉพาะ (NCD)'
      onBack={() => history.push('/clinic/ncd')}
      actions={hn ? (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='swap_horiz' onClick={() => { setHn(''); setSearchQ(''); }}>
            เปลี่ยนผู้รับบริการ
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์รายงานการติดตาม
          </BrandSubdueButton>
        </div>
      ) : undefined}
      summaryCards={summaryCards}
    >
      {/* Drill-in — per-visit detail incl. Lab / X-ray / dental preview */}
      <Popup
        open={!!detailVisit}
        onClose={() => setDetailVisit(null)}
        size='large'
        title='รายละเอียดการรับบริการ'
        subtitle={detailVisit ? `${registration?.name || ''} · ${formatNcdDate(detailVisit.date)} · ${detailVisit.type}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDetailVisit(null) }}
        secondaryAction={{ label: 'พิมพ์', onClick: () => window.print() }}
      >
        {detailVisit && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='grid grid-cols-2 gap-x-6 gap-y-2' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              <span>ความดันโลหิต: {dash(detailVisit.bp, ' mmHg')}</span>
              <span>ชีพจร: {dash(detailVisit.pulse, ' /นาที')}</span>
              <span>น้ำหนัก: {dash(detailVisit.weight, ' กก.')}</span>
              <span>SpO₂: {dash(detailVisit.spo2, ' %')}</span>
              <span>FBS: {dash(detailVisit.fbs, ' mg/dL')}</span>
              <span>HbA1c: {dash(detailVisit.hba1c, ' %')}</span>
              <span>LDL: {dash(detailVisit.ldl, ' mg/dL')}</span>
              <span>eGFR: {dash(detailVisit.egfr, ' mL/min')}</span>
              <span>PEFR: {dash(detailVisit.pefr, ' L/min')}</span>
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              <span><strong>ผลตรวจร่างกาย:</strong> {dash(detailVisit.exam)}</span>
              <span><strong>การตรวจทันตกรรม:</strong> {detailVisit.dental || '— ไม่มีการตรวจทันตกรรมในวิสิตนี้'}</span>
              <span><strong>X-ray:</strong> {detailVisit.xray || '— ไม่มีการตรวจ X-ray ในวิสิตนี้'}</span>
              <span><strong>บันทึกแพทย์:</strong> {dash(detailVisit.note)}</span>
            </div>

            {/* เอกสารแนบระหว่างการรักษา (TOR 1.10.2.4) — metadata carried by
                the visit record; the mock never retains the file itself, so
                this is a readable index, not a document viewer. */}
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                เอกสารแนบระหว่างการรักษา
              </span>
              {(detailVisit.attachments || []).length === 0 ? (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                  — ไม่มีเอกสารแนบในวิสิตนี้
                </span>
              ) : (
                detailVisit.attachments.map((att) => (
                  <span
                    key={att.id}
                    className='inline-flex items-center'
                    style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
                  >
                    <Icon name={att.type === 'pdf' ? 'picture_as_pdf' : 'image'} size={16} />
                    {att.name}
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                      {att.sizeLabel} · แนบเมื่อ {formatNcdDate(att.addedAt)}
                    </span>
                  </span>
                ))
              )}
            </div>
            {isAbnormalVisit(detailVisit) && (
              <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug'>
                วิสิตนี้มีค่าผิดปกติ (BP / น้ำตาล / SpO₂ เกินเกณฑ์ควบคุม)
              </ColorfulBadge>
            )}
          </div>
        )}
      </Popup>

      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-600)' }}>
        <section
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {!hn ? (
            /* ── State 1 — pick a patient ─────────────────────────── */
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <SectionHeader icon='users'>เลือกผู้รับบริการเพื่อติดตามการดูแล</SectionHeader>
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={searchQ}
                  onChange={setSearchQ}
                  onSubmit={(label, item) => {
                    const match = resolveSearchRow(label, item);
                    if (match) selectPatient(match);
                    else setSearchQ(label);
                  }}
                  suggestions={searchSuggestions}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  placeholder='ค้นหา HN / ชื่อ-สกุล / ICD-10 / แพทย์ผู้ดูแล'
                  width={640}
                />
              </div>

              <SearchResultCount found={pickerMatches.length} total={registryRows.length} />

              {pickerMatches.length === 0 ? (
                <div className='flex flex-col items-center text-center' style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-200)' }}>
                  <Icon name='search_off' size={32} />
                  <p style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                    ไม่พบผู้รับบริการในทะเบียนโรคเฉพาะที่ตรงกับ “{searchQ}”
                  </p>
                </div>
              ) : (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {pickerMatches.map((row) => {
                    const rowCancel = getNcdCancellation(row.hn);
                    return (
                      <div
                        key={row.hn}
                        role='button'
                        tabIndex={0}
                        onClick={() => selectPatient(row)}
                        onKeyDown={(e) => { if (e.key === 'Enter') selectPatient(row); }}
                        className='flex items-center w-full cursor-pointer transition-shadow hover:shadow-cardHover flex-wrap'
                        style={{
                          gap: 'var(--dim-space-300)',
                          padding: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-300)',
                          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                          background: 'var(--surface-card-100)',
                          opacity: rowCancel ? 0.75 : 1,
                        }}
                      >
                        <div className='flex-1 min-w-0 flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                          <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                            {row.name}
                          </span>
                          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
                          {groupBadges(row)}
                          {rowCancel && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
                        </div>
                        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                          ข้อมูลติดตาม {getNcdVisitCount(row.hn)} ครั้ง
                        </span>
                        <Icon name='chevron-right' size={16} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── State 2 — follow-up dataset for the chosen patient ── */
            <>
              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <div className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                    <span style={{ fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                      {profile?.fullName || registration?.name || hn}
                    </span>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>HN {hn}</span>
                    {registration && groupBadges(registration)}
                    {cancellation && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
                  </div>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {[
                      profile?.sex && `เพศ ${profile.sex}`,
                      profile?.age && `อายุ ${profile.age}`,
                      profile?.insurance && `สิทธิ ${profile.insurance}`,
                      registration?.doctor && `แพทย์ผู้ดูแล ${registration.doctor}`,
                      registration?.diagnosisDate && `วินิจฉัย ${formatNcdDate(registration.diagnosisDate)}`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='assignment'
                  onClick={() => history.push({ pathname: '/clinic/ncd/record', state: { hn, name: registration?.name } })}
                >
                  เปิดบันทึกการตรวจรักษา
                </BrandSubdueButton>
              </div>

              {nextAppt && (
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <Icon name={nextAppt.status === 'cancelled' ? 'block' : 'event_available'} size={16} />
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    นัดหมายครั้งถัดไป {formatNcdDate(nextAppt.date)}
                    {nextAppt.time ? ` · ${nextAppt.time} น.` : ''}
                    {nextAppt.mode === 'telemedicine' ? ' · Telemedicine' : ''}
                  </span>
                  {nextAppt.status === 'cancelled'
                    ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัดหมายแล้ว</ColorfulBadge>
                    : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ยืนยันแล้ว</ColorfulBadge>}
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    บันทึกโดย {nextAppt.createdBy}
                    {nextAppt.status === 'cancelled' && nextAppt.cancelReason ? ` · เหตุผลที่ยกเลิก: ${nextAppt.cancelReason}` : ''}
                  </span>
                </div>
              )}

              {!registration && (
                <div
                  className='flex items-center'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-200)',
                    background: 'var(--surface-alert-warning, #FFF9F0)',
                    color: 'var(--text-warning-default, #C2410C)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  <Icon name='shield_question' size={18} />
                  ผู้รับบริการรายนี้ยังไม่อยู่ในทะเบียนโรคเฉพาะ — ขึ้นทะเบียนได้ที่หน้าทะเบียนผู้รับบริการ
                </div>
              )}

              {/* ช่วงเวลา */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='calendar'>ช่วงเวลาที่ติดตาม</SectionHeader>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  {RANGE_OPTIONS.map((opt) => (
                    <TabCapsule
                      key={opt.key}
                      variant='filter'
                      label={opt.label}
                      selected={rangeKey === opt.key}
                      onClick={() => setRangeKey(opt.key)}
                    />
                  ))}
                </div>
                {rangeKey === 'custom' && (
                  <div style={{ maxWidth: 480 }}>
                    <DatePickerRange
                      showLabel={false}
                      value={customRange}
                      onChange={setCustomRange}
                      format={isoFormat}
                      parse={isoParse}
                    />
                  </div>
                )}
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                  {fromIso || toIso
                    ? `แสดงข้อมูล ${fromIso ? formatNcdDate(fromIso) : 'ตั้งแต่ครั้งแรก'} – ${toIso ? formatNcdDate(toIso) : 'ปัจจุบัน'} · พบ ${visits.length} ครั้ง`
                    : `แสดงข้อมูลทั้งหมด · พบ ${visits.length} ครั้ง`}
                </span>
              </div>

              {/* แผนภูมิ / กราฟ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='activity'>แผนภูมิและกราฟการควบคุมโรค (รายบุคคล)</SectionHeader>
                {visits.length === 0 ? (
                  <EmptyRangeCard>
                    ยังไม่มีข้อมูลในช่วงเวลาที่เลือก — ปรับช่วงเวลา หรือบันทึกการตรวจรักษาครั้งแรกจากหน้าคิว
                  </EmptyRangeCard>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full'>
                    {hasDm && (
                      stats.dmControlPct != null ? (
                        <DmControlGaugeCard
                          title='การควบคุมน้ำตาล — ผู้รับบริการรายนี้'
                          value={stats.dmControlPct}
                          color={GAUGE_TEAL}
                          label={`ของวิสิตที่มีผล HbA1c (${stats.dmVisitCount} ครั้ง) มี HbA1c < 7%`}
                          sub={`HbA1c ล่าสุด ${stats.latestHba1c ?? '—'}% · FBS ล่าสุด ${stats.latestFbs ?? '—'} mg/dL`}
                        />
                      ) : (
                        <SingleGaugeCard
                          title='การควบคุมน้ำตาล — ผู้รับบริการรายนี้'
                          icon='activity'
                          value={0}
                          color={GAUGE_TEAL}
                          label='ยังไม่มีผล HbA1c ในช่วงเวลา'
                          sub='สั่งตรวจ HbA1c ได้จากขั้นตอนคำสั่งการรักษา'
                        />
                      )
                    )}
                    {hasHt && (
                      stats.htControlPct != null ? (
                        <HtControlGaugeCard
                          title='การควบคุมความดันโลหิต — ผู้รับบริการรายนี้'
                          value={stats.htControlPct}
                          color={GAUGE_INDIGO}
                          label={`ของวิสิตที่วัดความดัน (${stats.htVisitCount} ครั้ง) ต่ำกว่า 140/90`}
                          sub={`ความดันล่าสุด ${stats.latestBp ?? '—'} mmHg`}
                        />
                      ) : (
                        <SingleGaugeCard
                          title='การควบคุมความดันโลหิต — ผู้รับบริการรายนี้'
                          icon='activity'
                          value={0}
                          color={GAUGE_INDIGO}
                          label='ยังไม่มีผลวัดความดันในช่วงเวลา'
                        />
                      )
                    )}
                    {hasDm && (
                      <DmComplicationsCard
                        title='การคัดกรองภาวะแทรกซ้อนเบาหวาน — รายบุคคล'
                        gauges={[
                          { value: dmScreening.foot, color: GAUGE_PINK, label: 'วิสิตที่ตรวจเท้า (%)', size: 130 },
                          { value: dmScreening.eye, color: GAUGE_INDIGO, label: 'วิสิตที่ตรวจตา (%)', size: 130 },
                        ]}
                      />
                    )}
                    {hasResp && (
                      stats.latestPefr != null ? (
                        <SingleGaugeCard
                          title='สมรรถภาพปอด (PEFR) — ผู้รับบริการรายนี้'
                          icon='activity'
                          value={Math.min(100, Math.round((stats.latestPefr / PEFR_TARGET) * 100))}
                          color={GAUGE_TEAL}
                          label={`ของค่าอ้างอิง ${PEFR_TARGET} L/min`}
                          sub={`PEFR ล่าสุด ${stats.latestPefr} L/min · แรกของช่วง ${stats.firstPefr} L/min (${stats.pefrVisitCount} ครั้ง)`}
                        />
                      ) : (
                        <SingleGaugeCard
                          title='สมรรถภาพปอด (PEFR) — ผู้รับบริการรายนี้'
                          icon='activity'
                          value={0}
                          color={GAUGE_TEAL}
                          label='ยังไม่มีผล PEFR ในช่วงเวลา'
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              {/* กราฟต่อเนื่องในช่วงเวลา (TOR 1.10.2.8 "กราฟ") — driven by the
                  SAME `visits` array as the table and the gauges, so the three
                  views of the period can never disagree. (This replaced the
                  shared VitalsSignGraphDialog, which takes no data props and
                  rendered a static demo series on a per-patient page.) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='monitoring'>
                  แนวโน้มต่อเนื่องในช่วงเวลา (กราฟผลตรวจรายครั้ง)
                </SectionHeader>
                <NcdTrendSection
                  visits={visits}
                  diseaseGroups={diseaseGroups}
                  selectedVisitIdx={selectedVisitIdx}
                  onSelectVisit={(idx, visit) => { setSelectedVisitIdx(idx); setDetailVisit(visit); }}
                />
              </div>

              {/* เส้นแนวโน้ม — visit-by-visit timeline rail */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='clipboard'>
                  แนวโน้มตามครั้งที่รับบริการ (สรุปรายวิสิต)
                </SectionHeader>
                {visits.length === 0 ? (
                  <EmptyRangeCard>ยังไม่มีข้อมูลในช่วงเวลาที่เลือก</EmptyRangeCard>
                ) : visits.length === 1 ? (
                  <EmptyRangeCard>
                    มีข้อมูลเพียง 1 ครั้งในช่วงเวลา — ยังไม่พอสำหรับแสดงแนวโน้ม ดูรายละเอียดได้จากตารางด้านล่าง
                  </EmptyRangeCard>
                ) : (
                  <div className='flex w-full overflow-x-auto' style={{ gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-200)' }}>
                    {visits.map((v, idx) => (
                      <div key={`${v.date}-${idx}`} className='shrink-0' style={{ width: 220 }}>
                        <VitalSignTimelineCard
                          time={formatNcdDate(v.date)}
                          date={v.type}
                          vitals={timelineVitals(v)}
                          badge={isAbnormalVisit(v) ? 'ผิดปกติ' : undefined}
                          selected={selectedVisitIdx === idx}
                          onClick={() => { setSelectedVisitIdx(idx); setDetailVisit(v); }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ตารางข้อมูล */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='clipboard-list'>
                  ตารางข้อมูลการรับบริการ (ตรวจร่างกาย · ทันตกรรม · Lab · X-ray)
                </SectionHeader>
                <Table
                  columns={columns}
                  rows={pageVisits}
                  rowKey={(v) => v._rowKey}
                  onRowClick={(v) => setDetailVisit(v)}
                  emptyMessage='ยังไม่มีข้อมูลในช่วงเวลาที่เลือก'
                />
                {visits.length > 0 && (
                  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                      {`แสดง ${rangeStart}–${rangeEnd} จาก ${visits.length} รายการ`}
                    </span>
                    <div className='flex-1' />
                    <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </QueuePageShell>
  );
};

export default NcdFollowUpPage;
