import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import DatePicker from '@/components/forms/DatePicker';
import FilterDateTag from '@/components/forms/FilterDateTag';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Icon from '@/components/icons/Icon';
import { Donut, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import {
  CHECKUP_TODAY, SPECIMEN_STATUSES, COMMUNITY_STATUSES,
  getDailySummary, getSpecimenTracking, getPopulationInsight,
  formatThaiDate, formatThaiDateTime, CHECKUP_STAFF, CHECKUP_CENTER,
} from '@/data/checkupStore';
import {
  PageBody, PageCard, PagerRow, EmptyState, NoticeBar, SectionHeader, SubCard,
  StatTile, ReadField,
} from '@/pages/checkup/CheckupUi';

/* CheckupReportsPage — ศูนย์รายงานงานตรวจสุขภาพ.

   Tab 1 · สรุปผลกิจกรรมรายวัน (TOR 1.19.9) — แยก 3 ส่วนตามที่ TOR กำหนด:
            1) การบันทึกคัดกรอง  2) การส่งต่อผู้รับบริการ  3) กิจกรรมสุขภาพชุมชน
   Tab 2 · รายงานติดตามสิ่งส่งตรวจประจำวัน (TOR 1.19.20)
   Tab 3 · Population health insight (TOR 1.19.21) */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'รายงาน'];
const PAGE_SIZE = 10;

const toIsoDate = (d) => {
  if (!d) return CHECKUP_TODAY;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return CHECKUP_TODAY;
  return date.toISOString().slice(0, 10);
};

const CheckupReportsPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('daily');
  const [date, setDate] = useState(CHECKUP_TODAY);
  const [dateChip, setDateChip] = useState({ quick: 'today' });
  const [specimenFilter, setSpecimenFilter] = useState('all');
  const specimenFiltersActive = specimenFilter !== 'all';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(specimenFiltersActive, () => setSpecimenFilter('all'));
  const [page, setPage] = useState(1);
  const [trackPage, setTrackPage] = useState(1);
  const printedAt = useMemo(() => new Date().toISOString(), [activeTab, date]);

  const daily = useMemo(() => getDailySummary(date), [date]);
  const tracking = useMemo(() => getSpecimenTracking(date), [date]);
  const insight = useMemo(() => getPopulationInsight(), []);

  const filteredTracking = useMemo(
    () => (specimenFilter === 'all' ? tracking : tracking.filter((t) => t.specimen === specimenFilter)),
    [tracking, specimenFilter],
  );

  const screeningPageRows = daily.screeningRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const trackingPageRows = filteredTracking.slice((trackPage - 1) * PAGE_SIZE, trackPage * PAGE_SIZE);

  useEffect(() => { setPage(1); setTrackPage(1); }, [date, activeTab, specimenFilter]);

  const tabs = [
    { key: 'daily', label: 'สรุปผลกิจกรรมรายวัน', icon: 'summarize' },
    { key: 'specimen', label: 'ติดตามสิ่งส่งตรวจประจำวัน', icon: 'colorize' },
    { key: 'population', label: 'Population health insight', icon: 'insights' },
  ];

  /* ── Tab 1 columns ───────────────────────────────────────────────── */

  const screeningColumns = [
    { key: 'hn', label: 'HN' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => (
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          <MaskedWorklistName name={r.name} recordKey={r.hn} linkTo={`/checkup/record/${r.id}`} />
          {r.confidential ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ปิดบังข้อมูลลับ</ColorfulBadge>
          ) : null}
        </span>
      ),
    },
    { key: 'program', label: 'โปรแกรมตรวจ', flex: true, minWidth: 280 },
    { key: 'forms', label: 'จำนวนแบบคัดกรอง', align: 'center', render: (r) => `${r.forms} แบบ` },
    {
      key: 'formList',
      label: 'แบบคัดกรองที่บันทึก',
      flex: true,
      minWidth: 300,
      sortable: false,
      render: (r) => (r.formList === '—'
        ? <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่บันทึกคัดกรอง</span>
        : r.formList),
    },
  ];

  const referralColumns = [
    { key: 'hn', label: 'HN' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => <MaskedWorklistName name={r.name} recordKey={r.hn} linkTo={`/checkup/report/${r.id}`} />,
    },
    { key: 'to', label: 'ส่งต่อไปยัง', flex: true, minWidth: 220 },
    { key: 'reason', label: 'เหตุผลการส่งต่อ', flex: true, minWidth: 300 },
    { key: 'count', label: 'รายการผิดปกติ', align: 'center', render: (r) => `${r.count} รายการ` },
  ];

  const activityColumns = [
    { key: 'name', label: 'ชื่อโครงการ / กิจกรรม', flex: true, minWidth: 320 },
    { key: 'place', label: 'สถานที่', flex: true, minWidth: 250 },
    {
      key: 'time',
      label: 'เวลา',
      sortable: false,
      render: (r) => (r.timeStart ? `${r.timeStart}${r.timeEnd ? `–${r.timeEnd}` : ''} น.` : '—'),
    },
    { key: 'attendees', label: 'ผู้เข้าร่วม', align: 'center', render: (r) => `${r.attendees || 0} คน` },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        const cfg = COMMUNITY_STATUSES[r.status] || COMMUNITY_STATUSES.planned;
        return <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>;
      },
    },
    { key: 'outcome', label: 'ผลการทำกิจกรรม', flex: true, minWidth: 340 },
  ];

  const trackingColumns = [
    { key: 'hn', label: 'HN' },
    {
      key: 'name',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => <MaskedWorklistName name={r.name} recordKey={r.hn} linkTo={`/checkup/record/${r.id}`} />,
    },
    { key: 'orderNo', label: 'เลขที่ใบสั่งตรวจ' },
    { key: 'tubes', label: 'ชนิดสิ่งส่งตรวจ', flex: true, minWidth: 190 },
    { key: 'specimenCount', label: 'จำนวนรายการ', align: 'center', render: (r) => `${r.specimenCount} รายการ` },
    {
      key: 'specimen',
      label: 'สถานะสิ่งส่งตรวจ',
      render: (r) => {
        const cfg = SPECIMEN_STATUSES[r.specimen] || SPECIMEN_STATUSES.pending;
        return <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>;
      },
    },
    { key: 'stage', label: 'ขั้นตอนปัจจุบัน' },
    {
      key: 'overdue',
      label: 'ค้างดำเนินการ',
      render: (r) => (r.overdue
        ? <ColorfulBadge style='yellow' size='small' hierarchy='secondary' icon='hourglass_top'>รอผลจาก Lab</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ตามกำหนด</ColorfulBadge>)},
  ];

  const printBar = (
    <SubCard tone='brand'>
      <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500)' }}>
        <ReadField label='หน่วยบริการ' value={CHECKUP_CENTER} minWidth={280} />
        <ReadField label='ผู้ออกรายงาน' value={CHECKUP_STAFF.name} minWidth={220} />
        <ReadField label='เวลาที่พิมพ์' value={formatThaiDateTime(printedAt)} minWidth={240} />
        <div className='flex-1' />
        <NeutralSubdueButton size='sm' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
          พิมพ์รายงาน
        </NeutralSubdueButton>
      </div>
    </SubCard>
  );

  const specimenDonut = useMemo(() => Object.values(SPECIMEN_STATUSES).map((s, i) => ({
    label: s.label,
    value: tracking.filter((t) => t.specimen === s.key).length,
    color: [PHCIS_CHART.yellow, PHCIS_CHART.pink, PHCIS_CHART.indigo, PHCIS_CHART.teal][i % 4],
  })).filter((s) => s.value > 0), [tracking]);

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={breadcrumb}
      title='รายงานงานตรวจสุขภาพ'
      onBack={() => history.push('/checkup')}
      backLabel='กลับไปคิวตรวจสุขภาพ'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton size='md' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            พิมพ์รายงานหน้านี้
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='groups' onClick={() => history.push('/checkup/targets')}>
            กลุ่มเป้าหมาย
          </BrandSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <PageBody>
        {activeTab !== 'population' ? (
          <PageCard gap='var(--dim-space-400)'>
            <div className='flex items-end flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <DatePicker
                label='เลือกวันที่ออกรายงาน'
                showHelperText={false}
                size='md'
                value={new Date(date)}
                onChange={(d) => setDate(toIsoDate(d))}
              />
              <OverflowFlexRow itemGap='var(--dim-space-200)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDateTag
                  prefix='วัน:'
                  value={dateChip}
                  onChange={(v) => {
                    setDateChip(v);
                    if (v?.quick === 'today') setDate(CHECKUP_TODAY);
                    if (v?.quick === 'yesterday') {
                      const d = new Date(CHECKUP_TODAY);
                      d.setDate(d.getDate() - 1);
                      setDate(toIsoDate(d));
                    }
                    if (v?.single) setDate(toIsoDate(v.single));
                  }}
                  defaultQuick='today'
                  quickLabels={{ today: 'วันนี้', yesterday: 'เมื่อวาน' }}
                />
                {activeTab === 'specimen' ? (
                  <>
                    <FilterDropdown
                      prefix='สถานะสิ่งส่งตรวจ:'
                      options={[{ value: 'all', label: 'ทุกสถานะ' }, ...Object.values(SPECIMEN_STATUSES).map((s) => ({ value: s.key, label: s.label }))]}
                      value={specimenFilter}
                      onChange={setSpecimenFilter}
                    />
                    <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
                  </>
                ) : null}
              </OverflowFlexRow>
              <div className='flex-1' />
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                {`รายงานประจำวันที่ ${formatThaiDate(date)}`}
              </span>
            </div>
            {printBar}
          </PageCard>
        ) : null}

        {activeTab === 'daily' ? (
          <>
            <PageCard>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='ผู้รับบริการในวันนี้' value={daily.screeningRows.length} unit='ราย' tone='info' icon='groups' />
                <StatTile label='แบบคัดกรองที่บันทึก' value={daily.screeningTotal} unit='แบบ' tone='brand' icon='checklist' />
                <StatTile label='ส่งต่อผู้รับบริการ' value={daily.referralTotal} unit='ราย' tone='warning' icon='send' />
                <StatTile label='กิจกรรมชุมชน' value={daily.activities.length} unit='กิจกรรม' tone='info' icon='volunteer_activism' />
                <StatTile label='ผู้เข้าร่วมกิจกรรม' value={daily.activityAttendees} unit='คน' tone='brand' icon='diversity_3' />
              </div>
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='checklist'
                title='ส่วนที่ 1 · การบันทึกคัดกรอง'
                subtitle='จำนวนแบบคัดกรองที่บันทึกให้ผู้รับบริการแต่ละราย — ผลที่เป็นข้อมูลลับถูกปิดบัง (§1.4.2)'
              />
              {daily.screeningRows.length === 0 ? (
                <EmptyState
                  icon='checklist'
                  title='ไม่มีการบันทึกคัดกรองในวันที่เลือก'
                  subtitle='เลือกวันอื่น หรือบันทึกแบบคัดกรองจากหน้าคิวตรวจสุขภาพ'
                  actionLabel='ไปคิวตรวจสุขภาพ'
                  onAction={() => history.push('/checkup')}
                />
              ) : (
                <>
                  <Table
                    columns={screeningColumns}
                    rows={screeningPageRows}
                    rowKey={(r) => r.id}
                    stickyColCount={2}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่พบรายการ'
                  />
                  <PagerRow page={page} pageSize={PAGE_SIZE} total={daily.screeningRows.length} onPageChange={setPage} unit='ราย' />
                  <SubCard tone='brand'>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
                      <ReadField label='ยอดรวมผู้รับบริการ' value={`${daily.screeningRows.length} ราย`} />
                      <ReadField label='ยอดรวมแบบคัดกรอง' value={`${daily.screeningTotal} แบบ`} />
                      <ReadField label='ผู้รับบริการที่มีข้อมูลลับ' value={`${daily.screeningRows.filter((r) => r.confidential).length} ราย`} minWidth={220} />
                    </div>
                  </SubCard>
                </>
              )}
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='send'
                title='ส่วนที่ 2 · การส่งต่อผู้รับบริการ'
                subtitle='ผู้รับบริการที่พบความผิดปกติและถูกส่งต่อเพื่อประเมิน/รักษาเพิ่มเติม'
              />
              {daily.referrals.length === 0 ? (
                <EmptyState
                  icon='send'
                  title='ไม่มีการส่งต่อผู้รับบริการในวันที่เลือก'
                  subtitle='เมื่อผลตรวจพบความผิดปกติ ระบบจะเสนอการส่งต่อและแสดงในรายงานนี้'
                />
              ) : (
                <>
                  <Table columns={referralColumns} rows={daily.referrals} rowKey={(r) => r.id} emptyMessage='ไม่พบรายการ' />
                  <SubCard tone='brand'>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
                      <ReadField label='ยอดรวมการส่งต่อ' value={`${daily.referralTotal} ราย`} />
                      <ReadField
                        label='ส่งต่อคลินิกโรคเรื้อรัง (NCD)'
                        value={`${daily.referrals.filter((r) => r.to.includes('NCD')).length} ราย`}
                        minWidth={240}
                      />
                    </div>
                  </SubCard>
                </>
              )}
            </PageCard>

            <PageCard>
              <SectionHeader
                icon='volunteer_activism'
                title='ส่วนที่ 3 · บันทึกกิจกรรมด้านสุขภาพชุมชน'
                subtitle='กิจกรรม/โครงการที่ดำเนินการในวันที่เลือก พร้อมจำนวนผู้เข้าร่วมและผลลัพธ์'
              />
              {daily.activities.length === 0 ? (
                <EmptyState
                  icon='volunteer_activism'
                  title='ไม่มีกิจกรรมสุขภาพชุมชนในวันที่เลือก'
                  subtitle='สร้างกิจกรรมหรือเลือกวันอื่นเพื่อดูรายงาน'
                  actionLabel='ไปทะเบียนกิจกรรมชุมชน'
                  onAction={() => history.push('/checkup/community')}
                />
              ) : (
                <>
                  <Table columns={activityColumns} rows={daily.activities} rowKey={(r) => r.id} emptyMessage='ไม่พบรายการ' />
                  <SubCard tone='brand'>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
                      <ReadField label='ยอดรวมกิจกรรม' value={`${daily.activities.length} กิจกรรม`} />
                      <ReadField label='ยอดรวมผู้เข้าร่วม' value={`${daily.activityAttendees} คน`} />
                      <ReadField
                        label='กิจกรรมที่สรุปแล้ว'
                        value={`${daily.activities.filter((a) => a.status === 'done').length} กิจกรรม`}
                        minWidth={200}
                      />
                    </div>
                  </SubCard>
                </>
              )}
            </PageCard>
          </>
        ) : null}

        {activeTab === 'specimen' ? (
          <PageCard>
            <SectionHeader
              icon='colorize'
              title='รายงานติดตามสิ่งส่งตรวจประจำวัน'
              subtitle='สถานะสิ่งส่งตรวจต่อขั้นตอน — รายการที่ยัง "ส่ง Lab" และผู้รับบริการยังอยู่สถานะรอผล ถือว่าค้างดำเนินการ'
            />
            <SmoothFilterResults opaque={resultsOpaque}>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                {Object.values(SPECIMEN_STATUSES).map((s) => (
                  <StatTile
                    key={s.key}
                    label={s.label}
                    value={tracking.filter((t) => t.specimen === s.key).length}
                    unit='ราย'
                    tone={s.key === 'resulted' ? 'brand' : s.key === 'pending' ? 'warning' : 'info'}
                    icon='colorize'
                  />
                ))}
                <StatTile label='ค้างดำเนินการ' value={tracking.filter((t) => t.overdue).length} unit='ราย' tone='danger' icon='hourglass_top' />
              </div>
              {specimenDonut.length > 0 ? (
                <SubCard style={{ flex: '0 0 auto' }}>
                  <SectionHeader icon='donut_small' title='สัดส่วนสถานะสิ่งส่งตรวจ' />
                  <Donut
                    segments={specimenDonut}
                    size={180}
                    centerLabel={String(tracking.length)}
                    centerSub='รายทั้งหมด'
                  />
                </SubCard>
              ) : null}
            </div>

            {tracking.length === 0 ? (
              <EmptyState
                icon='colorize'
                title='ไม่มีสิ่งส่งตรวจในวันที่เลือก'
                subtitle='เลือกวันอื่น หรือออกใบสั่งตรวจให้ผู้รับบริการก่อน'
                actionLabel='ไปคิวตรวจสุขภาพ'
                onAction={() => history.push('/checkup')}
              />
            ) : filteredTracking.length === 0 ? (
              <EmptyState
                icon='search_off'
                title='ไม่พบผลลัพธ์'
                subtitle='ลองล้างตัวกรองสถานะสิ่งส่งตรวจ'
                actionLabel='ล้างตัวกรอง'
                onAction={() => setSpecimenFilter('all')}
              />
            ) : (
              <>
                <Table
                  columns={trackingColumns}
                  rows={trackingPageRows}
                  rowKey={(r) => r.id}
                  stickyColCount={2}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบรายการ'
                />
                <PagerRow page={trackPage} pageSize={PAGE_SIZE} total={filteredTracking.length} onPageChange={setTrackPage} unit='ราย' />
              </>
            )}
            </SmoothFilterResults>
          </PageCard>
        ) : null}

        {activeTab === 'population' ? (
          <>
            <PageCard>
              <SectionHeader
                icon='insights'
                title='Population health insight'
                subtitle='ภาพรวมสุขภาพของกลุ่มเป้าหมายจากผลตรวจที่สรุปแล้วทั้งหมด (TOR 1.19.21)'
                trailing={(
                  <NeutralSubdueButton size='sm' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
                    พิมพ์
                  </NeutralSubdueButton>
                )}
              />
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <StatTile label='ผลตรวจที่สรุปแล้ว' value={insight.total} unit='ครั้ง' tone='info' icon='fact_check' />
                <StatTile label='สรุปผลปกติ' value={insight.normal} unit='ครั้ง' tone='brand' icon='check_circle' />
                <StatTile label='สรุปผลผิดปกติ' value={insight.abnormal} unit='ครั้ง' tone='danger' icon='error' />
                <StatTile
                  label='สัดส่วนผิดปกติ'
                  value={insight.total ? `${Math.round((insight.abnormal / insight.total) * 100)}%` : '—'}
                  tone='warning'
                  icon='percent'
                />
              </div>
              {printBar}
            </PageCard>

            <div className='grid grid-cols-1 xl:grid-cols-2 w-full' style={{ gap: 'var(--dim-space-600)' }}>
              <PageCard>
                <SectionHeader icon='donut_small' title='การกระจายผลปกติ / ผิดปกติ' subtitle='นับจากสรุปผลการตรวจของทุกครั้งที่สรุปแล้ว' />
                {insight.total === 0 ? (
                  <EmptyState compact icon='donut_small' title='ยังไม่มีผลตรวจที่สรุปแล้ว' subtitle='บันทึกผลตรวจให้ครบเพื่อดูภาพรวมประชากร' />
                ) : (
                  <Donut
                    segments={[
                      { label: 'ปกติ', value: insight.normal, color: PHCIS_CHART.teal },
                      { label: 'ผิดปกติ', value: insight.abnormal, color: PHCIS_CHART.pink },
                    ]}
                    size={200}
                    centerLabel={`${Math.round((insight.normal / (insight.total || 1)) * 100)}%`}
                    centerSub='สรุปผลปกติ'
                    centerExtra={`จาก ${insight.total} ครั้ง`}
                  />
                )}
              </PageCard>

              <PageCard>
                <SectionHeader icon='bar_chart' title='ความผิดปกติที่พบบ่อย (Top findings)' subtitle='นับจำนวนครั้งที่แต่ละรายการถูกแปลผลว่าผิดปกติ' />
                {insight.topFindings.length === 0 ? (
                  <EmptyState compact icon='bar_chart' title='ยังไม่พบความผิดปกติ' subtitle='เมื่อมีผลตรวจผิดปกติ ระบบจะจัดอันดับให้ที่นี่' />
                ) : (
                  <HBarList
                    valueLabel='ครั้ง'
                    maxVisibleRows={6.5}
                    rows={insight.topFindings.map((f) => ({
                      label: f.label,
                      value: f.count,
                      segments: [{ value: f.count, color: PHCIS_CHART.pink, label: 'ผิดปกติ' }],
                    }))}
                  />
                )}
              </PageCard>
            </div>

            <PageCard>
              <SectionHeader
                icon='diversity_3'
                title='ความครอบคลุมการคัดกรองต่อกลุ่มวัย (Coverage)'
                subtitle='สัดส่วนสมาชิกกลุ่มเป้าหมายที่ได้รับการตรวจและสรุปผลแล้ว แยกตามกลุ่มวัย'
              />
              {insight.coverage.every((c) => c.target === 0) ? (
                <EmptyState
                  compact
                  icon='diversity_3'
                  title='ยังไม่มีข้อมูลกลุ่มเป้าหมายที่มีวันเกิดครบ'
                  subtitle='นำเข้ารายชื่อกลุ่มเป้าหมายพร้อมวันเกิดเพื่อคำนวณความครอบคลุมตามกลุ่มวัย'
                  actionLabel='ไปหน้ากลุ่มเป้าหมาย'
                  onAction={() => history.push('/checkup/targets')}
                />
              ) : (
                <>
                  <VBars
                    months={insight.coverage.map((c) => c.band)}
                    series={[
                      { label: 'เป้าหมาย (ราย)', color: PHCIS_CHART.yellow, values: insight.coverage.map((c) => c.target) },
                      { label: 'ตรวจและสรุปผลแล้ว (ราย)', color: PHCIS_CHART.teal, values: insight.coverage.map((c) => c.screened) },
                    ]}
                    height={220}
                  />
                  <Table
                    columns={[
                      { key: 'band', label: 'กลุ่มวัย', flex: true, minWidth: 240 },
                      { key: 'target', label: 'เป้าหมาย', align: 'center', render: (r) => `${r.target} ราย` },
                      { key: 'screened', label: 'ตรวจแล้ว', align: 'center', render: (r) => `${r.screened} ราย` },
                      {
                        key: 'pct',
                        label: 'ความครอบคลุม',
                        render: (r) => (
                          <ColorfulBadge
                            style={r.pct >= 80 ? 'green' : r.pct >= 50 ? 'yellow' : 'red'}
                            size='small'
                            hierarchy='secondary'
                          >
                            {`${r.pct}%`}
                          </ColorfulBadge>
                        ),
                      },
                    ]}
                    rows={insight.coverage}
                    rowKey={(r) => r.band}
                    emptyMessage='ไม่มีข้อมูล'
                  />
                </>
              )}
              <NoticeBar tone='info' icon='info'>
                ความครอบคลุมคำนวณจากสมาชิกกลุ่มเป้าหมายที่มีวันเกิดในระบบ และนับว่า "ตรวจแล้ว" เมื่อมีใบสั่งตรวจที่สรุปผลแล้วภายใต้ HN เดียวกัน
              </NoticeBar>
            </PageCard>
          </>
        ) : null}

        <PageCard gap='var(--dim-space-300)'>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)', color: 'var(--text-content-tertiary, #858C92)' }}>
            <Icon name='info' size={14} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
              {`รายงานทุกฉบับระบุผู้ออกรายงาน (${CHECKUP_STAFF.name}) และเวลาที่พิมพ์ · ชื่อผู้รับบริการในรายงานกลุ่มถูกปิดบังตามข้อกำหนดข้อมูลลับ §1.4.2`}
            </span>
          </div>
        </PageCard>
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupReportsPage;
