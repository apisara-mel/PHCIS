import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import Select from '@/components/forms/Select';
import DatePickerRange from '@/components/forms/DatePickerRange';
import TabCapsule from '@/components/tab/TabCapsule';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import GrowthPercentileChart from '@/pages/clinic/immunization/GrowthPercentileChart';
import { getVaccineById } from '@/data/immunizationVaccines';
import {
  IMM_CHILDREN,
  getImmChild,
  getGrowthRecords,
  GROWTH_CHART_DEFS,
  GROWTH_REFERENCE,
  buildGrowthPoints,
  evaluatePercentile,
  ageInMonths,
  resolveDspmBand,
  evaluateDspm,
  getImmVisitRecords,
  getNextDueDoses,
  getActiveImmDoses,
  getAefiRecords,
  getImmAppointments,
  getImmNextAppointment,
  resolveImmAppointmentType,
  summarizeEpi,
  resolveAefiSeverity,
  AEFI_SEVERITY_STYLE,
  DOSE_STATUS_META,
  describeDose,
  formatImmDate,
  formatImmDateTime,
  formatAgeYMD,
  formatAgeShort,
  todayIso,
} from '@/data/immunizationClinic';

/* ImmunizationFollowUpPage — การติดตามการสร้างเสริมภูมิคุ้มกัน (TOR 1.10.9.8)
   พร้อมมุมมอง IIS ที่เกี่ยวข้อง (1.11.2.3 ดูย้อนหลัง / 1.11.2.4 ความครบถ้วน).
   โครงตาม NcdFollowUpPage: เลือกผู้รับบริการ → แท็บติดตาม 3 ด้าน
   (การเจริญเติบโต · พัฒนาการ · การสร้างเสริมภูมิคุ้มกัน) และมี "รายชื่อเด็ก
   ค้างเข็ม/ขาดนัด" สำหรับงานตามตัวในชุมชน. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสร้างเสริมภูมิคุ้มกัน', 'ติดตามการสร้างเสริมภูมิคุ้มกัน'];
const PAGE_SIZE = 10;

const TABS = [
  { key: 'growth',      label: 'การเจริญเติบโต',        icon: 'monitor_weight' },
  { key: 'development', label: 'พัฒนาการ',              icon: 'child_care' },
  { key: 'vaccine',     label: 'การสร้างเสริมภูมิคุ้มกัน', icon: 'vaccines' },
  { key: 'outreach',    label: 'รายชื่อค้างเข็ม / ขาดนัด', icon: 'campaign' },
];

const Card = ({ children }) => (
  <div
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
    {children}
  </div>
);

const TopicHeader = ({ icon, children }) => (
  <div className='flex items-center gap-2 w-full'>
    <span className='text-brand-500'><Icon name={icon} size={20} /></span>
    <h2 className='text-base font-bold text-brand-500'>{children}</h2>
  </div>
);

const Banner = ({ tone = 'info', icon = 'info', children }) => {
  const palette = {
    info:    { bg: 'var(--surface-brandPrimary-quaternary, #F4FBF8)', fg: 'var(--text-brandPrimary-default, #007549)' },
    warning: { bg: 'var(--surface-warning-quaternary, #FFF9F0)',      fg: 'var(--text-warning-default, #C2410C)' },
    danger:  { bg: 'var(--surface-danger-quaternary, #FFF0F0)',       fg: 'var(--text-danger-default, #B91C1C)' },
    neutral: { bg: 'var(--surface-card-quaternary, #F9FBFB)',         fg: 'var(--text-content-secondary, #636B72)' },
  }[tone];
  return (
    <div
      className='flex items-start gap-2 w-full'
      style={{
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 'var(--type-size-sm)',
      }}
    >
      <Icon name={icon} size={18} />
      <span className='min-w-0'>{children}</span>
    </div>
  );
};

const AuditLine = ({ children }) => (
  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{children}</span>
);

const EmptyBlock = ({ icon = 'inbox', title, children }) => (
  <div
    className='flex flex-col items-center text-center w-full'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      paddingTop: 'var(--dim-space-800, 48px)',
      paddingBottom: 'var(--dim-space-800, 48px)',
      paddingLeft: 'var(--dim-space-600, 24px)',
      paddingRight: 'var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      border: 'var(--dim-stroke-100, 1px) dashed var(--border-neutral-tertiary, #C6CACD)',
      background: 'var(--surface-card-quaternary, #F9FBFB)',
    }}
  >
    <Icon name={icon} size={32} />
    <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default, #363B3F)' }}>
      {title}
    </span>
    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)', maxWidth: 520 }}>
      {children}
    </span>
  </div>
);

const ImmunizationFollowUpPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [hn, setHn] = useState(navState?.hn || IMM_CHILDREN[2].hn);
  const [activeTab, setActiveTab] = useState('growth');
  const [chartKey, setChartKey] = useState(GROWTH_CHART_DEFS[0].key);
  const [range, setRange] = useState(['', '']);
  const [outreachPage, setOutreachPage] = useState(1);

  const child = useMemo(() => getImmChild(hn), [hn]);

  const allRecords = useMemo(() => getGrowthRecords(hn), [hn]);
  const records = useMemo(() => {
    const [from, to] = range;
    if (!from && !to) return allRecords;
    return allRecords.filter((r) => (!from || r.date >= from) && (!to || r.date <= to));
  }, [allRecords, range]);

  const months = ageInMonths(child?.birthDate);
  const availableCharts = GROWTH_CHART_DEFS.filter((d) => {
    if (months == null) return true;
    if (d.maxX != null && d.minX == null && months > d.maxX + 6) return false;
    if (d.minX != null && months < d.minX) return false;
    return true;
  });
  const activeDef = availableCharts.find((d) => d.key === chartKey) || availableCharts[0] || GROWTH_CHART_DEFS[0];
  const reference = GROWTH_REFERENCE[activeDef.referenceKey]?.[child?.sex] || [];
  const points = buildGrowthPoints(activeDef, records, child?.birthDate);
  const lastPoint = points[points.length - 1];
  const evaluation = lastPoint ? evaluatePercentile(reference, lastPoint.x, lastPoint.y) : null;

  /* พัฒนาการ — ผลประเมิน DSPM รายครั้ง (จาก visit records) + ผลปัจจุบัน */
  const dspmTimeline = useMemo(() => {
    const visits = getImmVisitRecords(hn);
    return visits
      .filter((v) => Object.keys(v.dspmAnswers || {}).length > 0)
      .map((v) => {
        const at = (v.savedAt || '').slice(0, 10);
        const band = resolveDspmBand(child?.birthDate, at);
        const result = evaluateDspm(band, v.dspmAnswers);
        return {
          id: v.savedAt,
          date: at,
          band: band.label,
          result,
          note: v.dspmNote || '',
          referral: !!v.dspmReferral,
          assessor: v.dspmAssessor || v.savedBy,
          savedBy: v.savedBy,
          savedAt: v.savedAt,
        };
      })
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [hn, child]);

  const latestDspm = dspmTimeline[0] || null;

  /* วัคซีน */
  const epi = useMemo(() => summarizeEpi(hn), [hn]);
  const nextDue = useMemo(() => getNextDueDoses(hn), [hn]);
  const doses = useMemo(() => getActiveImmDoses(hn), [hn]);
  const aefi = useMemo(() => getAefiRecords(hn).filter((a) => a.status !== 'cancelled'), [hn]);
  const appointments = useMemo(() => getImmAppointments(hn), [hn]);

  /* รายชื่อค้างเข็ม / ขาดนัด ทั้งคลินิก */
  const outreachRows = useMemo(() => {
    const today = todayIso();
    return IMM_CHILDREN
      .map((c) => {
        const s = summarizeEpi(c.hn);
        const next = getImmNextAppointment(c.hn);
        const missed = getImmAppointments(c.hn).filter((a) => a.status === 'booked' && a.date < today);
        return { child: c, summary: s, next, missedCount: missed.length, lastMissed: missed[0] || null };
      })
      .filter((r) => r.summary.overdue > 0 || r.missedCount > 0);
  }, []);

  const outreachTotalPages = Math.max(1, Math.ceil(outreachRows.length / PAGE_SIZE));
  const outreachPageRows = outreachRows.slice((outreachPage - 1) * PAGE_SIZE, outreachPage * PAGE_SIZE);

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ติดตามการสร้างเสริมภูมิคุ้มกันและพัฒนาการเด็ก'
      onBack={() => history.push('/clinic/immunization')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div style={{ minWidth: 300 }}>
            <Select
              showLabel={false} searchable size='md'
              value={hn} onChange={setHn}
              options={IMM_CHILDREN.map((c) => ({ value: c.hn, label: `${c.hn} · ${c.fullName}` }))}
              placeholder='เลือกผู้รับบริการ'
            />
          </div>
          <BrandSubdueButton
            variant='outline'
            leadingIcon='menu_book'
            onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn } })}
          >
            เปิดสมุดวัคซีน
          </BrandSubdueButton>
        </div>
      )}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {activeTab !== 'outreach' && (
          <Card>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default, #363B3F)' }}>
                  {child?.fullName || '—'}
                </span>
                <AuditLine>
                  HN {hn} · เพศ{child?.sex} · เกิด {formatImmDate(child?.birthDate)} · อายุ {formatAgeYMD(child?.birthDate)}
                </AuditLine>
              </div>
              <div className='flex items-center gap-3 flex-wrap'>
                <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>{`วัคซีน EPI: ${epi.label}`}</ColorfulBadge>
                {latestDspm && (
                  <ColorfulBadge style={latestDspm.result.style} size='small' hierarchy='secondary'>
                    {`พัฒนาการล่าสุด: ${latestDspm.result.label}`}
                  </ColorfulBadge>
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'growth' && (
          <Card>
            <div className='flex items-center justify-between w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <TopicHeader icon='monitor_weight'>แนวโน้มการเจริญเติบโตเทียบเกณฑ์ percentile</TopicHeader>
              <div style={{ minWidth: 320 }}>
                <DatePickerRange
                  value={range}
                  onChange={setRange}
                  parse={(v) => (v ? new Date(v) : null)}
                  format={(d) => (d ? d.toISOString().slice(0, 10) : '')}
                />
              </div>
            </div>

            {allRecords.length === 0 ? (
              <EmptyBlock icon='monitoring' title='ยังไม่มีข้อมูลการเจริญเติบโต'>
                เด็กคนนี้ยังไม่เคยถูกชั่งน้ำหนัก/วัดส่วนสูงในระบบ — บันทึกได้ที่ขั้นตอนที่ 3 ของใบบันทึกสุขภาพเด็กดี
              </EmptyBlock>
            ) : (
              <>
                <div className='flex items-center gap-2 flex-wrap'>
                  {availableCharts.map((d) => (
                    <TabCapsule
                      key={d.key}
                      variant='filter'
                      label={d.title}
                      selected={activeDef.key === d.key}
                      onClick={() => setChartKey(d.key)}
                    />
                  ))}
                </div>

                <GrowthPercentileChart
                  title={activeDef.title}
                  unit={activeDef.unit}
                  axisLabel={activeDef.axisLabel}
                  reference={reference}
                  points={points}
                  latestEvaluation={evaluation}
                  emptyMessage='ไม่มีข้อมูลในช่วงเวลาที่เลือก — ปรับช่วงเวลาเพื่อดูแนวโน้ม'
                />

                {evaluation && (evaluation.label === 'ต่ำกว่าเกณฑ์' || evaluation.label === 'เกินเกณฑ์') && (
                  <Banner tone='warning' icon='warning'>
                    ค่าล่าสุดอยู่นอกช่วงปกติ ({evaluation.label} · percentile ที่ {evaluation.percentile}) —
                    ให้คำแนะนำโภชนาการแก่ผู้ปกครองและนัดติดตามภายใน 1 เดือน
                  </Banner>
                )}

                <Table
                  columns={[
                    { key: 'date', label: 'วันที่', render: (r) => formatImmDate(r.date) },
                    { key: 'age', label: 'อายุ', render: (r) => formatAgeShort(child?.birthDate, r.date) },
                    { key: 'weight', label: 'น้ำหนัก (กก.)', render: (r) => r.weight ?? '—' },
                    { key: 'height', label: 'ส่วนสูง (ซม.)', render: (r) => r.height ?? '—' },
                    { key: 'headCirc', label: 'รอบศีรษะ (ซม.)', render: (r) => r.headCirc ?? '—' },
                    { key: 'chestCirc', label: 'รอบอก (ซม.)', render: (r) => r.chestCirc ?? '—' },
                    {
                      key: 'weightEval', label: 'แปลผลน้ำหนักตามอายุ', sortable: false, flex: true, minWidth: 200,
                      render: (r) => {
                        const ref = GROWTH_REFERENCE[months > 36 ? 'weight2to19' : 'weight0to36']?.[child?.sex] || [];
                        const ev = evaluatePercentile(ref, ageInMonths(child?.birthDate, r.date), r.weight);
                        return ev
                          ? <ColorfulBadge style={ev.style} size='small' hierarchy='secondary'>{`${ev.label} (P${ev.percentile})`}</ColorfulBadge>
                          : '—';
                      },
                    },
                  ]}
                  rows={[...records].reverse()}
                  rowKey={(r) => `${r.date}-${r.weight}`}
                  emptyMessage='ไม่มีข้อมูลในช่วงเวลาที่เลือก'
                />
              </>
            )}
          </Card>
        )}

        {activeTab === 'development' && (
          <Card>
            <TopicHeader icon='child_care'>ผลการประเมินพัฒนาการ (DSPM) รายครั้ง</TopicHeader>

            {latestDspm?.result?.refer && (
              <Banner tone='warning' icon='warning'>
                ผลประเมินล่าสุด &quot;{latestDspm.result.label}&quot; — แนะนำส่งต่อคลินิกกระตุ้นพัฒนาการ
                และนัดประเมินซ้ำภายใน 1 เดือน
              </Banner>
            )}

            {dspmTimeline.length === 0 ? (
              <EmptyBlock icon='child_care' title='ยังไม่มีผลการประเมินพัฒนาการ'>
                เด็กคนนี้ยังไม่เคยถูกประเมิน DSPM ในระบบ — ประเมินได้ที่ขั้นตอนที่ 4 ของใบบันทึกสุขภาพเด็กดี
              </EmptyBlock>
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'date', label: 'วันที่ประเมิน', render: (r) => formatImmDate(r.date) },
                    { key: 'age', label: 'อายุ', render: (r) => formatAgeShort(child?.birthDate, r.date) },
                    { key: 'band', label: 'ช่วงอายุที่ประเมิน', flex: true, minWidth: 160 },
                    {
                      key: 'result', label: 'ผลการประเมิน', flex: true, minWidth: 260,
                      render: (r) => <ColorfulBadge style={r.result.style} size='small' hierarchy='secondary'>{r.result.label}</ColorfulBadge>,
                    },
                    {
                      key: 'failed', label: 'ข้อที่ไม่ผ่าน', flex: true, minWidth: 240,
                      render: (r) => (r.result.failed.length === 0 ? '—' : r.result.failed.map((f) => `${f.domain}: ${f.text}`).join(' · ')),
                    },
                    {
                      key: 'referral', label: 'การส่งต่อ',
                      render: (r) => (r.referral
                        ? <ColorfulBadge style='orange' size='small' hierarchy='secondary'>ส่งต่อกระตุ้นพัฒนาการ</ColorfulBadge>
                        : <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ไม่ส่งต่อ</ColorfulBadge>),
                    },
                    { key: 'note', label: 'บันทึก', flex: true, minWidth: 260, render: (r) => r.note || '—' },
                    {
                      key: 'audit', label: 'ผู้ประเมิน / บันทึก', flex: true, minWidth: 220,
                      render: (r) => (
                        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <span style={{ fontSize: 'var(--type-size-sm)' }}>{r.assessor}</span>
                          <AuditLine>{formatImmDateTime(r.savedAt)}</AuditLine>
                        </div>
                      ),
                    },
                  ]}
                  rows={dspmTimeline}
                  rowKey={(r) => r.id}
                  stickyColCount={1}
                  emptyMessage='ยังไม่มีผลการประเมิน'
                />
                <AuditLine>
                  เกณฑ์ข้อประเมินเป็นชุดย่อของ DSPM สำหรับต้นแบบ — เกณฑ์ฉบับเต็มรอเชื่อมกับ backend
                </AuditLine>
              </>
            )}
          </Card>
        )}

        {activeTab === 'vaccine' && (
          <>
            <Card>
              <TopicHeader icon='event_upcoming'>เข็มถัดไปและเข็มที่ค้าง</TopicHeader>
              <div className='flex items-center gap-3 flex-wrap'>
                <ColorfulBadge style={epi.style} size='small' hierarchy='secondary'>
                  {`${epi.label} · ได้รับแล้ว ${epi.done}/${epi.expected} เข็มที่ถึงกำหนด`}
                </ColorfulBadge>
                {getImmNextAppointment(hn) && (
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                    {`นัดถัดไป ${formatImmDate(getImmNextAppointment(hn).date)}`}
                  </ColorfulBadge>
                )}
              </div>

              {epi.overdue > 0 && (
                <Banner tone='danger' icon='warning'>
                  มีเข็มเกินกำหนด {epi.overdue} เข็ม — ติดต่อผู้ปกครองเพื่อนัดให้วัคซีนแบบเร่งรัด (catch-up)
                </Banner>
              )}

              <Table
                columns={[
                  { key: 'vaccine', label: 'วัคซีน', flex: true, minWidth: 220, render: (r) => `${r.abbr} — ${r.nameTh}` },
                  { key: 'seq', label: 'เข็มที่' },
                  { key: 'dueDate', label: 'ครบกำหนดเมื่ออายุ', render: (r) => formatImmDate(r.dueDate) },
                  {
                    key: 'status', label: 'สถานะ',
                    render: (r) => {
                      const meta = DOSE_STATUS_META[r.status] || DOSE_STATUS_META.upcoming;
                      return <ColorfulBadge style={meta.style} size='small' hierarchy='secondary'>{meta.label}</ColorfulBadge>;
                    },
                  },
                  {
                    key: 'action', label: 'การดำเนินการ', sortable: false,
                    render: () => (
                      <BrandSubdueButton
                        variant='outline' size='sm' leadingIcon='menu_book'
                        onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn } })}
                      >
                        บันทึกในสมุดวัคซีน
                      </BrandSubdueButton>
                    ),
                  },
                ]}
                rows={nextDue.slice(0, 12)}
                rowKey={(r) => `${r.vaccineId}-${r.seq}`}
                emptyMessage='ไม่มีเข็มที่ค้างหรือกำลังจะถึงกำหนด'
              />
            </Card>

            <Card>
              <TopicHeader icon='calendar'>ประวัตินัดหมาย</TopicHeader>
              <Table
                columns={[
                  { key: 'date', label: 'วันนัด', render: (r) => formatImmDate(r.date) },
                  { key: 'time', label: 'เวลา', render: (r) => (r.time ? `${r.time} น.` : '—') },
                  { key: 'type', label: 'ประเภท', flex: true, minWidth: 200, render: (r) => resolveImmAppointmentType(r.type) },
                  { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240, render: (r) => r.note || '—' },
                  {
                    key: 'status', label: 'สถานะ',
                    render: (r) => (r.status === 'cancelled' ? (
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกนัด</ColorfulBadge>
                        {r.cancellation && <AuditLine>เหตุผล: {r.cancellation.reason}</AuditLine>}
                      </div>
                    ) : r.date < todayIso() ? (
                      <ColorfulBadge style='orange' size='small' hierarchy='secondary'>ขาดนัด</ColorfulBadge>
                    ) : (
                      <ColorfulBadge style='blue' size='small' hierarchy='secondary'>นัดแล้ว</ColorfulBadge>
                    )),
                  },
                  {
                    key: 'audit', label: 'ผู้บันทึกนัด', flex: true, minWidth: 220,
                    render: (r) => (
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <span style={{ fontSize: 'var(--type-size-sm)', textDecoration: r.status === 'cancelled' ? 'line-through' : 'none' }}>
                          {r.bookedBy}
                        </span>
                        <AuditLine>{formatImmDateTime(r.bookedAt)}</AuditLine>
                      </div>
                    ),
                  },
                ]}
                rows={appointments}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีนัดหมายของเด็กคนนี้'
              />
            </Card>

            <Card>
              <TopicHeader icon='e911_emergency'>ประวัติอาการไม่พึงประสงค์ (AEFI)</TopicHeader>
              {aefi.length === 0 ? (
                <Banner tone='info' icon='check-circle'>
                  ไม่พบรายงานอาการไม่พึงประสงค์หลังได้รับวัคซีนของเด็กคนนี้ (ได้รับวัคซีนแล้ว {doses.length} เข็ม)
                </Banner>
              ) : (
                <Table
                  columns={[
                    { key: 'onset', label: 'วัน-เวลาที่เริ่มมีอาการ', render: (r) => `${formatImmDate(r.onsetDate)}${r.onsetTime ? ` ${r.onsetTime} น.` : ''}` },
                    { key: 'dose', label: 'เข็มที่อ้างอิง', flex: true, minWidth: 200, render: (r) => describeDose(doses.find((d) => d.id === r.doseId)) },
                    { key: 'symptom', label: 'อาการ', flex: true, minWidth: 280 },
                    {
                      key: 'severity', label: 'ความรุนแรง',
                      render: (r) => (
                        <ColorfulBadge style={AEFI_SEVERITY_STYLE[r.severity] || 'grey'} size='small' hierarchy='secondary'>
                          {resolveAefiSeverity(r.severity)}
                        </ColorfulBadge>
                      ),
                    },
                    { key: 'outcome', label: 'ผลลัพธ์', flex: true, minWidth: 220, render: (r) => r.outcome || '—' },
                  ]}
                  rows={aefi}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่มีรายงาน AEFI'
                />
              )}
            </Card>

            <Card>
              <TopicHeader icon='history'>ประวัติการได้รับวัคซีนย้อนหลัง</TopicHeader>
              <Table
                columns={[
                  { key: 'date', label: 'วันที่', render: (r) => formatImmDate(r.date) },
                  { key: 'age', label: 'อายุที่ได้รับ', render: (r) => formatAgeShort(child?.birthDate, r.date) },
                  { key: 'vaccine', label: 'วัคซีน', flex: true, minWidth: 220, render: (r) => `${getVaccineById(r.vaccineId)?.abbr || '—'} เข็มที่ ${r.seq}` },
                  { key: 'place', label: 'สถานที่รับ', flex: true, minWidth: 220, render: (r) => (r.otherFacility ? `${r.facilityName} (หน่วยงานอื่น)` : (r.place || '—')) },
                  { key: 'nurse', label: 'ผู้ให้วัคซีน', flex: true, minWidth: 160, render: (r) => r.nurse || '—' },
                ]}
                rows={doses}
                rowKey={(r) => r.id}
                emptyMessage='ยังไม่มีประวัติการได้รับวัคซีน'
              />
            </Card>
          </>
        )}

        {activeTab === 'outreach' && (
          <Card>
            <TopicHeader icon='campaign'>รายชื่อเด็กค้างเข็ม / ขาดนัด สำหรับติดตามในพื้นที่</TopicHeader>
            {outreachRows.length === 0 ? (
              <EmptyBlock icon='celebration' title='ยินดีด้วย — ไม่มีเด็กค้างเข็มหรือขาดนัด'>
                เด็กทุกคนในทะเบียนได้รับวัคซีนครบตามเกณฑ์อายุและมาตามนัดทั้งหมด
              </EmptyBlock>
            ) : (
              <>
                <Banner tone='warning' icon='warning'>
                  พบเด็ก {outreachRows.length} คนที่ต้องติดตาม — ประสานผู้ปกครองทางโทรศัพท์
                  หรือส่งทีมเยี่ยมบ้านตามที่อยู่ในทะเบียน
                </Banner>
                <Table
                  columns={[
                    { key: 'hn', label: 'HN', render: (r) => r.child.hn },
                    {
                      key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200,
                      render: (r) => <MaskedWorklistName name={r.child.fullName} recordKey={r.child.hn} className='truncate' />,
                    },
                    { key: 'age', label: 'อายุ (ป-ด-ว)', render: (r) => formatAgeYMD(r.child.birthDate) },
                    {
                      key: 'epi', label: 'สถานะ EPI', sortable: false,
                      render: (r) => <ColorfulBadge style={r.summary.style} size='small' hierarchy='secondary'>{r.summary.label}</ColorfulBadge>,
                    },
                    {
                      key: 'missed', label: 'ขาดนัด', sortable: false,
                      render: (r) => (r.missedCount > 0
                        ? (
                          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{`ขาดนัด ${r.missedCount} ครั้ง`}</ColorfulBadge>
                            {r.lastMissed && <AuditLine>นัดล่าสุด {formatImmDate(r.lastMissed.date)}</AuditLine>}
                          </div>
                        )
                        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ไม่ขาดนัด</ColorfulBadge>),
                    },
                    { key: 'address', label: 'ที่อยู่สำหรับติดตาม', flex: true, minWidth: 300, render: (r) => r.child.address || '—' },
                    {
                      key: 'actions', label: 'การดำเนินการ', sortable: false,
                      render: (r) => (
                        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                          <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => { setHn(r.child.hn); setActiveTab('vaccine'); }}>
                            ดูรายละเอียด
                          </NeutralSubdueButton>
                          <BrandSubdueButton
                            variant='outline' size='sm' leadingIcon='menu_book'
                            onClick={() => history.push({ pathname: '/clinic/immunization/vaccine-book', state: { hn: r.child.hn } })}
                          >
                            สมุดวัคซีน
                          </BrandSubdueButton>
                        </div>
                      ),
                    },
                  ]}
                  rows={outreachPageRows}
                  rowKey={(r) => r.child.hn}
                  stickyColCount={2}
                  emptyMessage='ไม่มีเด็กที่ต้องติดตาม'
                />
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={{ color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-sm)' }}>
                    {`แสดง ${outreachRows.length === 0 ? 0 : (outreachPage - 1) * PAGE_SIZE + 1}–${Math.min(outreachPage * PAGE_SIZE, outreachRows.length)} จาก ${outreachRows.length} รายการ`}
                  </span>
                  <div className='flex-1' />
                  <Pagination currentPage={outreachPage} pageCount={outreachTotalPages} onPageChange={setOutreachPage} />
                </div>
              </>
            )}
          </Card>
        )}
      </div>
    </QueuePageShell>
  );
};

export default ImmunizationFollowUpPage;
