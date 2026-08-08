import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import PrimarySearch from '@/components/search/PrimarySearch';
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
import { SingleGaugeCard } from '@/components/graph/DashboardCards';
import PHCIS_CHART from '@/data/phcisChartPalette';
import RehabTrendSection from '@/pages/clinic/rehab/RehabTrendSection';
import { getPatientByHN } from '@/data/patientProfiles';
import {
  resolveRehabCause,
  resolveImcPhase,
  resolveDischargeStatus,
  formatRehabDate,
  formatRehabDateTime,
  imcGoldenPeriod,
  barthelDependency,
  getRehabRegistryRows,
  getRehabCancellation,
  getRehabFollowUpVisits,
  getRehabVisitCount,
  getRehabAppointment,
  computeRehabStats,
} from '@/data/rehabVisits';

/* RehabFollowUpPage — การติดตามการฟื้นฟู (TOR 1.10.10.8) at
   /clinic/rehab/followup. Pick a patient (or arrive with an HN in nav state
   from the queue / registry / record), choose ช่วงเวลา, then read the period
   in the three ways the TOR asks for:

     • ตารางข้อมูล — 1 แถวต่อครั้งที่รับบริการ × ตรวจร่างกาย (ROM / MMT) /
       ADLs (Barthel) / Lab / X-ray, "—" ทุกช่องที่ไม่ได้ตรวจครั้งนั้น,
       แบ่งหน้าพร้อม snap-back เหมือน ANC
     • แผนภูมิ — SingleGaugeCard ที่ override prop เป็นค่าเฉพาะผู้ป่วยรายนี้:
       Barthel แรกรับ vs ล่าสุด · ความสำเร็จตามเป้าหมาย · จำนวนครั้งที่มา
       เทียบแผนของ Course
     • กราฟแนวโน้ม — RehabTrendSection (Barthel / ROM / MMT / ชีพจร)
       + รางสรุปรายครั้งด้วย VitalSignTimelineCard

   Edge cases ตาม spec: ช่วงเวลาที่ไม่มีข้อมูลแสดงข้อความแทนเกจที่ทำให้เข้าใจผิด;
   มีข้อมูลครั้งเดียวยังแสดงตาราง+เกจ แต่ไม่วาดแกนแนวโน้ม (พิมพ์ค่าเดี่ยวแทน);
   ตัวชี้วัดที่ไม่เคยวัดบอก "ไม่มีข้อมูล" แทนเส้นศูนย์แบน; ช่อง Lab / X-ray
   แสดง "—" เมื่อไม่ได้ตรวจ (Lab/X-ray เป็น mock ภายในโมดูล ไม่ import จาก
   โมดูล lab/xray — กติกาขอบเขตไฟล์ playbook §4). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด'];

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:rehab-followup';
const PAGE_SIZE = 8;

const isoDaysAgo = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
};
const todayIsoLocal = () => new Date().toISOString().slice(0, 10);

const RANGE_OPTIONS = [
  { key: '3m',     label: '3 เดือนล่าสุด' },
  { key: '6m',     label: '6 เดือนล่าสุด' },
  { key: '12m',    label: '1 ปีล่าสุด' },
  { key: 'all',    label: 'ทั้งหมด' },
  { key: 'custom', label: 'กำหนดเอง' },
];

const isoFormat = (d) => (d ? d.toISOString().slice(0, 10) : '');
const isoParse = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const dash = (v, unit = '') => (v == null || v === '' ? '—' : `${v}${unit}`);

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
      padding: 'var(--dim-space-800, 32px)',
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
    : row.owner;
  const cause = resolveRehabCause(row.cause);
  return {
    id: row.hn,
    label: row.name,
    sublabel: identity,
    value: row.name,
    badges: [
      { label: row.hn, tone: 'indigo' },
      ...(cause ? [{ label: cause.short, tone: 'teal' }] : []),
    ],
    avatarSrc: profile?.avatarUrl,
  };
};

const RehabFollowUpPage = () => {
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

  const registryRows = useMemo(() => getRehabRegistryRows(), []);
  const registration = registryRows.find((r) => r.hn === hn) || null;
  const cancellation = hn ? getRehabCancellation(hn) : null;
  const profile = hn ? getPatientByHN(hn) : null;
  const nextAppt = hn ? getRehabAppointment(hn) : null;
  const cause = resolveRehabCause(registration?.cause);
  const golden = registration?.serviceType === 'imc' ? imcGoldenPeriod(registration.onsetDate) : null;

  /* ช่วงเวลา — quick ranges map to [from, to]; "ทั้งหมด" ปล่อยเปิดทั้งสองด้าน;
     กำหนดเอง อ่านคู่จาก DatePickerRange (เปิดข้างใดข้างหนึ่งได้). */
  const [fromIso, toIso] = useMemo(() => {
    switch (rangeKey) {
      case '3m':     return [isoDaysAgo(3), todayIsoLocal()];
      case '6m':     return [isoDaysAgo(6), todayIsoLocal()];
      case '12m':    return [isoDaysAgo(12), todayIsoLocal()];
      case 'custom': return [customRange[0] || null, customRange[1] || null];
      default:       return [null, null];
    }
  }, [rangeKey, customRange]);

  const visits = useMemo(
    () => (hn ? getRehabFollowUpVisits(hn, fromIso, toIso) : []),
    [hn, fromIso, toIso],
  );
  const stats = useMemo(() => computeRehabStats(visits, registration), [visits, registration]);

  /* ความสำเร็จตามเป้าหมาย — นับจากเป้าหมายที่บันทึกในวิสิตล่าสุดที่มี goals.
     ไม่มี goals เลย = null (แสดง "ยังไม่ได้ตั้งเป้าหมาย" แทนเกจ 0%). */
  const goalStats = useMemo(() => {
    const withGoals = visits.filter((v) => (v.goals || []).length > 0);
    if (withGoals.length === 0) return null;
    const latest = withGoals[withGoals.length - 1];
    const total = latest.goals.length;
    const achieved = latest.goals.filter((g) => g.achieved).length;
    return { total, achieved, pct: Math.round((achieved / total) * 100) };
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
      [r.hn, r.name, r.owner, r.icd10, r.courseNo].some((f) => f && f.toLowerCase().includes(q)),
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
      [r.hn, r.name, r.owner, r.icd10, r.courseNo].some((f) => f && f.toLowerCase().includes(q)),
    ) ?? null;
  };

  /* ── Summary cards (only once a patient is chosen) ──────────────── */

  const latestDependency = barthelDependency(stats.barthelLatest);

  const summaryCards = useMemo(() => {
    if (!hn) return undefined;
    return [
      { key: 'visits',  label: 'ครั้งที่รับบริการในช่วง', value: visits.length, color: 'info', icon: 'event_available' },
      { key: 'admit',   label: 'Barthel แรกรับ',          value: stats.barthelAdmit != null ? stats.barthelAdmit : '—', color: 'inprogress', icon: 'assignment' },
      { key: 'latest',  label: 'Barthel ล่าสุด',          value: stats.barthelLatest != null ? stats.barthelLatest : '—', color: 'brand', icon: 'accessibility_new' },
      { key: 'gain',    label: 'คะแนนที่เพิ่มขึ้น',        value: stats.barthelGain != null ? `${stats.barthelGain > 0 ? '+' : ''}${stats.barthelGain}` : '—', color: 'positive', icon: 'trending_up' },
    ];
  }, [hn, visits, stats]);

  /* ── ตาราง — visits × ผลตรวจ (TOR 1.10.10.8 ตารางข้อมูล) ─────────── */

  const columns = useMemo(() => ([
    { key: 'date', label: 'วันที่', render: (v) => formatRehabDate(v.date) },
    { key: 'visitNo', label: 'ครั้งที่', render: (v) => (v.visitNo != null ? v.visitNo : '—') },
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
      key: 'barthel', label: 'Barthel (ADLs)',
      render: (v) => {
        if (v.barthel == null) return '—';
        const dep = barthelDependency(v.barthel);
        return (
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
            <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{v.barthel}</span>
            <ColorfulBadge style={dep.badge} size='small' hierarchy='secondary'>{dep.label}</ColorfulBadge>
          </span>
        );
      },
    },
    { key: 'romKnee',     label: 'ROM เข่า (°)',   render: (v) => dash(v.romKnee) },
    { key: 'romShoulder', label: 'ROM ไหล่ (°)',   render: (v) => dash(v.romShoulder) },
    { key: 'muscleGrade', label: 'MMT (เกรด)',     render: (v) => dash(v.muscleGrade) },
    { key: 'bp',          label: 'BP',             render: (v) => dash(v.bp) },
    { key: 'exam',        label: 'ผลตรวจร่างกาย',  flex: true, minWidth: 200, render: (v) => <span className='truncate block'>{dash(v.exam)}</span> },
    { key: 'lab',         label: 'Lab',            flex: true, minWidth: 140, render: (v) => <span className='truncate block'>{dash(v.lab)}</span> },
    { key: 'xray',        label: 'X-ray',          flex: true, minWidth: 140, render: (v) => <span className='truncate block'>{dash(v.xray)}</span> },
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
    v.barthel != null ? { label: 'Barthel', value: `${v.barthel} คะแนน` } : null,
    v.romKnee != null ? { label: 'ROM เข่า', value: `${v.romKnee}°` } : null,
    v.romShoulder != null ? { label: 'ROM ไหล่', value: `${v.romShoulder}°` } : null,
    v.muscleGrade != null ? { label: 'MMT', value: `เกรด ${v.muscleGrade}` } : null,
    v.bp != null ? { label: 'ความดันโลหิต', value: `${v.bp} mmHg` } : null,
    v.pulse != null ? { label: 'ชีพจร', value: `${v.pulse} /นาที` } : null,
  ].filter(Boolean);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='การติดตามการฟื้นฟูและกายภาพบำบัด'
      onBack={() => history.push('/clinic/rehab')}
      actions={hn ? (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton leadingIcon='swap_horiz' onClick={() => { setHn(''); setSearchQ(''); }}>
            เปลี่ยนผู้รับบริการ
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='print' onClick={() => window.print()}>
            พิมพ์รายงานการฟื้นฟู
          </BrandSubdueButton>
        </div>
      ) : undefined}
      summaryCards={summaryCards}
    >
      {/* Drill-in — per-visit detail incl. หัตถการ / เป้าหมาย / Lab / X-ray */}
      <Popup
        open={!!detailVisit}
        onClose={() => setDetailVisit(null)}
        size='large'
        title='รายละเอียดการรับบริการฟื้นฟู'
        subtitle={detailVisit ? `${registration?.name || ''} · ${formatRehabDate(detailVisit.date)} · ${detailVisit.type}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDetailVisit(null) }}
        secondaryAction={{ label: 'พิมพ์', onClick: () => window.print() }}
      >
        {detailVisit && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='grid grid-cols-1 md:grid-cols-2'
              style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
            >
              <span>ครั้งที่: {detailVisit.visitNo != null ? detailVisit.visitNo : '—'}</span>
              <span>ผู้รักษา: {dash(detailVisit.therapist)}</span>
              <span>ความดันโลหิต: {dash(detailVisit.bp, ' mmHg')}</span>
              <span>ชีพจร: {dash(detailVisit.pulse, ' /นาที')}</span>
              <span>Barthel: {dash(detailVisit.barthel, ' คะแนน')}</span>
              <span>ROM เข่า: {dash(detailVisit.romKnee, '°')}</span>
              <span>ROM ไหล่: {dash(detailVisit.romShoulder, '°')}</span>
              <span>MMT: {dash(detailVisit.muscleGrade, ' เกรด')}</span>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              <span><strong>ผลตรวจร่างกาย:</strong> {dash(detailVisit.exam)}</span>
              <span><strong>Lab:</strong> {detailVisit.lab || '— ไม่มีการส่งตรวจ Lab ในครั้งนี้'}</span>
              <span><strong>X-ray:</strong> {detailVisit.xray || '— ไม่มีการส่งตรวจ X-ray ในครั้งนี้'}</span>
              <span><strong>บันทึกผู้รักษา:</strong> {dash(detailVisit.note)}</span>
            </div>

            {(detailVisit.program || []).length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                  โปรแกรมฟื้นฟูในครั้งนี้
                </span>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
                  {detailVisit.program.map((p) => (
                    <ColorfulBadge key={p} style='teal' size='small' hierarchy='secondary'>{p}</ColorfulBadge>
                  ))}
                </div>
              </div>
            )}

            {(detailVisit.procedures || []).length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                  หัตถการที่ทำ
                </span>
                {detailVisit.procedures.map((p) => (
                  <span key={p.id} style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                    • {p.name || '—'} · ผู้ทำ {p.performer || '—'} · เวลา {p.time || '—'}
                    {p.note ? ` · ${p.note}` : ''}
                  </span>
                ))}
              </div>
            )}

            {(detailVisit.goals || []).length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                  เป้าหมายการฟื้นฟู
                </span>
                {detailVisit.goals.map((g) => (
                  <span
                    key={g.id}
                    className='inline-flex items-center'
                    style={{ gap: 'var(--dim-space-200)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}
                  >
                    <Icon name={g.achieved ? 'check-circle' : 'radio_button_unchecked'} size={14} />
                    {g.text}
                  </span>
                ))}
              </div>
            )}

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default)' }}>
                เอกสารแนบระหว่างการฟื้นฟู
              </span>
              {(detailVisit.attachments || []).length === 0 ? (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                  — ไม่มีเอกสารแนบในครั้งนี้
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
                      {att.sizeLabel} · แนบเมื่อ {formatRehabDate(att.addedAt)}
                    </span>
                  </span>
                ))
              )}
            </div>

            {detailVisit.recordedBy && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                ผู้บันทึก {detailVisit.recordedBy} · {formatRehabDateTime(detailVisit.recordedAt)}
              </span>
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
              <SectionHeader icon='users'>เลือกผู้รับบริการเพื่อติดตามการฟื้นฟู</SectionHeader>
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
                  placeholder='ค้นหา HN / ชื่อ-สกุล / ICD-10 / เลขที่ Course / ผู้รับผิดชอบ'
                  width={640}
                />
              </div>

              {pickerMatches.length === 0 ? (
                <div className='flex flex-col items-center text-center' style={{ padding: 'var(--dim-space-800, 32px)', gap: 'var(--dim-space-200)' }}>
                  <Icon name='search_off' size={32} />
                  <p style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                    ไม่พบผู้รับบริการในทะเบียนฟื้นฟูที่ตรงกับ “{searchQ}”
                  </p>
                  <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => setSearchQ('')}>
                    ล้างคำค้นหา
                  </NeutralSubdueButton>
                </div>
              ) : (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {pickerMatches.map((row) => {
                    const rowCancel = getRehabCancellation(row.hn);
                    const rowCause = resolveRehabCause(row.cause);
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
                          {rowCause && <ColorfulBadge style={rowCause.badge} size='small' hierarchy='secondary'>{rowCause.short}</ColorfulBadge>}
                          {row.serviceType === 'imc' && <ColorfulBadge style='blue' size='small' hierarchy='secondary'>IMC</ColorfulBadge>}
                          {rowCancel && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
                        </div>
                        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                          ข้อมูลติดตาม {getRehabVisitCount(row.hn)} ครั้ง
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
                    {cause && <ColorfulBadge style={cause.badge} size='small' hierarchy='secondary'>{cause.label}</ColorfulBadge>}
                    {registration?.serviceType === 'imc' && (
                      <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                        {`IMC · ${resolveImcPhase(registration.imcPhase)?.label?.split(' — ')[0] || 'ระยะฟื้นฟู'}`}
                      </ColorfulBadge>
                    )}
                    {cancellation && <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกทะเบียนแล้ว</ColorfulBadge>}
                  </div>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {[
                      profile?.sex && `เพศ ${profile.sex}`,
                      profile?.age && `อายุ ${profile.age}`,
                      profile?.insurance && `สิทธิ ${profile.insurance}`,
                      registration?.owner && `ผู้รับผิดชอบ ${registration.owner}`,
                      registration?.onsetDate && `วันเกิดโรค ${formatRehabDate(registration.onsetDate)}`,
                      registration?.admitDate && `รับเข้า ${formatRehabDate(registration.admitDate)}`,
                    ].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <BrandSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='assignment'
                  onClick={() => history.push({ pathname: '/clinic/rehab/record', state: { hn, name: registration?.name } })}
                >
                  เปิดบันทึกการฟื้นฟู
                </BrandSubdueButton>
              </div>

              {/* แถบสรุป Course — เลขที่ Course · สถานะจำหน่าย · สรุปผล */}
              {registration && (
                <div
                  className='flex items-center w-full flex-wrap'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-300)',
                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                    background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  }}
                >
                  <Icon name='assignment' size={18} />
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    Course {registration.courseNo || '—'}
                    {registration.courseTotal ? ` · แผน ${registration.courseTotal} ครั้ง` : ''}
                    {` · มารับบริการแล้ว ${getRehabVisitCount(hn)} ครั้ง`}
                  </span>
                  <ColorfulBadge
                    style={registration.dischargeStatus === 'ongoing' ? 'blue' : 'green'}
                    size='small'
                    hierarchy='secondary'
                  >
                    {resolveDischargeStatus(registration.dischargeStatus)?.label || 'อยู่ระหว่างการฟื้นฟู'}
                  </ColorfulBadge>
                  {golden && (
                    <ColorfulBadge
                      style={golden.expired ? 'red' : golden.daysLeft <= 30 ? 'orange' : 'teal'}
                      size='small'
                      hierarchy='secondary'
                    >
                      {golden.expired
                        ? `พ้นกรอบ IMC เมื่อ ${formatRehabDate(golden.deadlineIso)}`
                        : `กรอบ IMC เหลือ ${golden.daysLeft} วัน`}
                    </ColorfulBadge>
                  )}
                </div>
              )}

              {nextAppt && (
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <Icon name={nextAppt.status === 'cancelled' ? 'block' : 'event_available'} size={16} />
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    นัดหมายครั้งถัดไป {formatRehabDate(nextAppt.date)}
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
                  ผู้รับบริการรายนี้ยังไม่อยู่ในทะเบียนฟื้นฟู — ขึ้นทะเบียนได้ที่หน้าทะเบียนฟื้นฟู/IMC
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
                    ? `แสดงข้อมูล ${fromIso ? formatRehabDate(fromIso) : 'ตั้งแต่ครั้งแรก'} – ${toIso ? formatRehabDate(toIso) : 'ปัจจุบัน'} · พบ ${visits.length} ครั้ง`
                    : `แสดงข้อมูลทั้งหมด · พบ ${visits.length} ครั้ง`}
                </span>
              </div>

              {/* แผนภูมิ */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='activity'>แผนภูมิผลการฟื้นฟู (รายบุคคล)</SectionHeader>
                {visits.length === 0 ? (
                  <EmptyRangeCard>
                    ยังไม่มีข้อมูลในช่วงเวลาที่เลือก — ปรับช่วงเวลา หรือบันทึกการฟื้นฟูครั้งแรกจากหน้าคิว
                  </EmptyRangeCard>
                ) : (
                  <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full'>
                    {stats.barthelLatest != null ? (
                      <SingleGaugeCard
                        title='ความสามารถทำกิจวัตรประจำวัน (Barthel)'
                        icon='accessibility_new'
                        value={stats.barthelLatest}
                        color={PHCIS_CHART.teal}
                        label={`${stats.barthelLatest} / 100 คะแนน · ${latestDependency.label}`}
                        sub={stats.barthelAdmit != null
                          ? `แรกรับ ${stats.barthelAdmit} คะแนน · เปลี่ยนแปลง ${stats.barthelGain != null && stats.barthelGain > 0 ? '+' : ''}${stats.barthelGain ?? '—'} คะแนน`
                          : 'ยังไม่มีคะแนนแรกรับในทะเบียน'}
                      />
                    ) : (
                      <SingleGaugeCard
                        title='ความสามารถทำกิจวัตรประจำวัน (Barthel)'
                        icon='accessibility_new'
                        value={0}
                        color={PHCIS_CHART.teal}
                        label='ยังไม่มีผลประเมิน Barthel ในช่วงเวลา'
                        sub='ประเมินได้จากขั้นตอนที่ 3 ของบันทึกการฟื้นฟู'
                      />
                    )}

                    {goalStats ? (
                      <SingleGaugeCard
                        title='ความสำเร็จตามเป้าหมายการฟื้นฟู'
                        icon='flag'
                        value={goalStats.pct}
                        color={PHCIS_CHART.indigo}
                        label={`บรรลุแล้ว ${goalStats.achieved} จาก ${goalStats.total} เป้าหมาย`}
                        sub='นับจากเป้าหมายที่บันทึกไว้ในการประเมินครั้งล่าสุดของช่วงเวลา'
                      />
                    ) : (
                      <SingleGaugeCard
                        title='ความสำเร็จตามเป้าหมายการฟื้นฟู'
                        icon='flag'
                        value={0}
                        color={PHCIS_CHART.indigo}
                        label='ยังไม่ได้ตั้งเป้าหมายในช่วงเวลานี้'
                        sub='ตั้งเป้าหมายได้จากขั้นตอนที่ 4 ของบันทึกการฟื้นฟู'
                      />
                    )}

                    {stats.attendedPct != null ? (
                      <SingleGaugeCard
                        title='จำนวนครั้งที่มาเทียบแผน Course'
                        icon='event_available'
                        value={stats.attendedPct}
                        color={PHCIS_CHART.pink}
                        label={`มาแล้ว ${visits.length} จากแผน ${stats.plannedSessions} ครั้ง`}
                        sub={`เหลืออีก ${Math.max(0, stats.plannedSessions - visits.length)} ครั้งตามแผน`}
                      />
                    ) : (
                      <SingleGaugeCard
                        title='จำนวนครั้งที่มาเทียบแผน Course'
                        icon='event_available'
                        value={0}
                        color={PHCIS_CHART.pink}
                        label='ยังไม่ได้ระบุจำนวนครั้งตามแผนในทะเบียน'
                        sub='ระบุจำนวนครั้งตามแผนได้ที่หน้าทะเบียนฟื้นฟู'
                      />
                    )}
                  </div>
                )}
              </div>

              {/* กราฟแนวโน้ม */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='monitoring'>
                  กราฟแนวโน้มในช่วงเวลา (ผลประเมินรายครั้ง)
                </SectionHeader>
                <RehabTrendSection
                  visits={visits}
                  selectedVisitIdx={selectedVisitIdx}
                  onSelectVisit={(idx, visit) => { setSelectedVisitIdx(idx); setDetailVisit(visit); }}
                />
              </div>

              {/* รางสรุปรายครั้ง */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon='clipboard'>สรุปรายครั้งที่รับบริการ</SectionHeader>
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
                          time={formatRehabDate(v.date)}
                          date={v.type}
                          vitals={timelineVitals(v)}
                          badge={v.barthel != null && v.barthel < 60 ? 'พึ่งพาสูง' : undefined}
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
                  ตารางข้อมูลการรับบริการ (ตรวจร่างกาย · ADLs · Lab · X-ray)
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

export default RehabFollowUpPage;
