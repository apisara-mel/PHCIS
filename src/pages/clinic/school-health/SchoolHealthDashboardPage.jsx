import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import Icon from '@/components/icons/Icon';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import {
  SH_ACADEMIC_YEARS, SH_TERMS, CURRENT_ACADEMIC_YEAR, CURRENT_TERM,
  gradeLabel, formatShDate, todayIso, thNum, pct,
} from '@/data/schoolHealthCore';
import {
  schoolOptions, gradeOptionsForSchool, getClassrooms, getSchoolById,
  getActiveSchools, getSchoolCapacity, getUpcomingVisits,
} from '@/data/schoolHealthSchools';
import { getDashboardData, getLatestService } from '@/data/schoolHealthServices';
import { NUTRITION_BANDS, nutritionBand } from '@/data/schoolHealthGrowthRef';
import {
  PageBody, PageCard, SubCard, SectionHeader, NoticeBar, EmptyState,
  PagerRow, StatTile, StatRow, AuditLine, ReadField,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* SchoolHealthDashboardPage — Dashboard ภาพรวม/เก็บตก (TOR §3.1.2, §3.4.3)

   · การ์ดสรุปประจำวัน: ผ่านเกณฑ์ / ไม่ผ่านเกณฑ์ / อยู่ในความดูแลทั้งหมด /
     รับเพิ่มได้ (คิดจากความจุห้องเรียนที่กรอกในทะเบียนโรงเรียน — §3.1.2)
   · ตาราง drill-down รายโรงเรียน (coverage วัคซีน โภชนาการ สายตา ซีด เหา พัฒนาการ)
   · worklist "เก็บตก" — นักเรียนที่ยังไม่ได้รับบริการตามรอบ คลิกส่งเข้า Batch entry
   · แถบแจ้งเตือนกำหนดออกให้บริการล่วงหน้า 1 สัปดาห์ */

const breadcrumb = ['บันทึกการรักษา', 'งานอนามัยโรงเรียน', 'Dashboard'];
const PAGE_SIZE = 10;

const PASS_COLORS = { pass: PHCIS_CHART.teal, fail: PHCIS_CHART.pink, none: PHCIS_CHART.yellow };

const SchoolHealthDashboardPage = () => {
  const history = useHistory();
  const [filters, setFilters] = useState({
    school: 'all', grade: 'all', room: 'all',
    academicYear: CURRENT_ACADEMIC_YEAR, term: CURRENT_TERM,
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [page, setPage] = useState(1);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isDefault = filters.school === 'all' && filters.grade === 'all' && filters.room === 'all'
    && filters.academicYear === CURRENT_ACADEMIC_YEAR && filters.term === CURRENT_TERM;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(!isDefault, () => {
    setFilters({ school: 'all', grade: 'all', room: 'all', academicYear: CURRENT_ACADEMIC_YEAR, term: CURRENT_TERM });
    setPage(1);
  });

  const data = useMemo(
    () => getDashboardData({
      schoolId: filters.school,
      grade: filters.grade,
      roomId: filters.room,
      academicYear: filters.academicYear,
    }),
    [filters.school, filters.grade, filters.room, filters.academicYear],
  );

  const upcoming = useMemo(() => getUpcomingVisits(7), []);
  const rooms = getClassrooms(filters.school === 'all' ? null : filters.school)
    .filter((r) => filters.grade === 'all' || r.grade === filters.grade);

  const capacity = useMemo(() => {
    const scoped = filters.school === 'all'
      ? getActiveSchools()
      : getActiveSchools().filter((s) => s.id === filters.school);
    return scoped.reduce((acc, s) => {
      const c = getSchoolCapacity(s.id);
      return { capacity: acc.capacity + c.capacity, enrolled: acc.enrolled + c.enrolled, vacancy: acc.vacancy + c.vacancy };
    }, { capacity: 0, enrolled: 0, vacancy: 0 });
  }, [filters.school]);

  const nutritionCounts = useMemo(() => {
    const map = new Map();
    data.rows.forEach((r) => {
      if (!r.checkup?.nutritionKey || r.checkup.nutritionKey === 'out-of-range') return;
      map.set(r.checkup.nutritionKey, (map.get(r.checkup.nutritionKey) || 0) + 1);
    });
    return map;
  }, [data]);

  const nutritionSegments = NUTRITION_BANDS
    .map((b, i) => ({
      label: b.label,
      value: nutritionCounts.get(b.key) || 0,
      color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    }))
    .filter((s) => s.value > 0);

  const coverageRows = data.bySchool.map((s) => ({
    label: s.schoolName,
    value: s.coverage,
    segments: [{ value: s.coverage, color: PHCIS_CHART.teal, label: 'ความครอบคลุมการตรวจ (%)' }],
  }));

  const passSegments = [
    { label: 'ผ่านเกณฑ์', value: data.passed, color: PASS_COLORS.pass },
    { label: 'ไม่ผ่านเกณฑ์', value: data.failed, color: PASS_COLORS.fail },
    { label: 'ยังไม่ได้รับบริการ', value: data.notServed, color: PASS_COLORS.none },
  ].filter((s) => s.value > 0);

  const summaryCards = useMemo(() => ([
    { key: 'total', label: 'นักเรียนในความดูแลทั้งหมด', value: thNum(data.total), color: 'info', icon: 'school' },
    { key: 'pass', label: 'ผ่านเกณฑ์', value: thNum(data.passed), color: 'positive', icon: 'check_circle' },
    { key: 'fail', label: 'ไม่ผ่านเกณฑ์', value: thNum(data.failed), color: 'warning', icon: 'error' },
    { key: 'none', label: 'ยังไม่ได้รับบริการตามรอบ', value: thNum(data.notServed), color: 'warning', icon: 'pending' },
    { key: 'vacancy', label: 'รับเพิ่มได้ (จากความจุห้องเรียน)', value: thNum(capacity.vacancy), color: 'info', icon: 'person_add' },
  ]), [data, capacity]);

  const tabs = [
    { key: 'overview', label: 'ภาพรวมและ drill-down', icon: 'monitoring', count: data.bySchool.length },
    { key: 'followup', label: 'worklist เก็บตก', icon: 'fast_forward', count: data.followUp.length },
    { key: 'plan', label: 'แจ้งเตือนออกให้บริการ', icon: 'event_upcoming', count: upcoming.length },
  ];

  const followUpPageRows = data.followUp.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(data.followUp.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const drillColumns = [
    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 220 },
    { key: 'total', label: 'นักเรียน', align: 'center', render: (r) => `${thNum(r.total)} คน` },
    { key: 'served', label: 'ตรวจแล้ว', align: 'center', render: (r) => `${thNum(r.served)} คน` },
    {
      key: 'coverage',
      label: 'ความครอบคลุมการตรวจ',
      render: (r) => (
        <ColorfulBadge style={r.coverage >= 80 ? 'green' : r.coverage >= 50 ? 'yellow' : 'red'} size='small' hierarchy='secondary'>
          {`${r.coverage}%`}
        </ColorfulBadge>
      ),
    },
    {
      key: 'vaccineCoverage',
      label: 'วัคซีนครบตามชั้น',
      render: (r) => (
        <ColorfulBadge style={r.vaccineCoverage >= 90 ? 'green' : r.vaccineCoverage >= 70 ? 'yellow' : 'red'} size='small' hierarchy='secondary'>
          {`${r.vaccineCoverage}%`}
        </ColorfulBadge>
      ),
    },
    { key: 'offTarget', label: 'โภชนาการไม่ตรงเกณฑ์', align: 'center', render: (r) => `${thNum(r.offTarget)} คน` },
    { key: 'visionAbn', label: 'สายตาผิดปกติ', align: 'center', render: (r) => `${thNum(r.visionAbn)} คน` },
    { key: 'anemic', label: 'ภาวะซีด', align: 'center', render: (r) => `${thNum(r.anemic)} คน` },
    { key: 'liceFound', label: 'พบเหา', align: 'center', render: (r) => `${thNum(r.liceFound)} คน` },
    { key: 'devDelay', label: 'พัฒนาการต้องติดตาม', align: 'center', render: (r) => `${thNum(r.devDelay)} คน` },
    {
      key: 'passed',
      label: 'ผ่าน / ไม่ผ่าน',
      sortable: false,
      render: (r) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <ColorfulBadge style='green' size='small' hierarchy='secondary'>{`ผ่าน ${r.passed}`}</ColorfulBadge>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>{`ไม่ผ่าน ${r.failed}`}</ColorfulBadge>
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <NeutralSubdueButton
          size='sm'
          leadingIcon='filter_alt'
          onClick={() => { setFilters((f) => ({ ...f, school: r.id, grade: 'all', room: 'all' })); setActiveTab('followup'); }}
        >
          ดูเฉพาะโรงเรียนนี้
        </NeutralSubdueButton>
      ),
    },
  ];

  const followUpColumns = [
    { key: 'studentNo', label: 'เลขที่' },
    { key: 'hn', label: 'HN' },
    {
      key: 'fullName',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => <MaskedWorklistName name={r.fullName} recordKey={r.hn} linkTo={`/clinic/school-health/student/${r.id}`} />,
    },
    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 200 },
    { key: 'room', label: 'ชั้น/ห้อง', render: (r) => `${r.gradeName} · ${r.roomName}` },
    { key: 'pending', label: 'ค้างอะไรบ้าง', flex: true, minWidth: 280, sortable: false },
    {
      key: 'lastCheckup',
      label: 'ตรวจสุขภาพล่าสุด',
      sortable: false,
      render: (r) => {
        const last = getLatestService(r.id, 'checkup');
        return last ? formatShDate(last.date) : <span style={{ color: 'var(--text-alert-warning, #C2410C)' }}>ยังไม่เคยตรวจ</span>;
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
            leadingIcon='vaccines'
            onClick={() => history.push({
              pathname: '/clinic/school-health/batch-vaccine',
              state: { schoolId: r.schoolId, grade: r.grade, roomId: r.roomId },
            })}
          >
            ส่งเข้ารอบเก็บตก
          </BrandSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='clinical_notes' onClick={() => history.push(`/clinic/school-health/student/${r.id}`)}>
            เปิดข้อมูลนักเรียน
          </NeutralSubdueButton>
        </div>
      ),
    },
  ];

  const scopeLabel = `${filters.school === 'all' ? 'ทุกโรงเรียน' : (getSchoolById(filters.school)?.name || '—')} · ${filters.grade === 'all' ? 'ทุกชั้น' : gradeLabel(filters.grade)} · ${filters.room === 'all' ? 'ทุกห้อง' : (rooms.find((r) => r.id === filters.room)?.name || '—')} · ปีการศึกษา ${filters.academicYear} ภาคเรียนที่ ${filters.term}`;

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='Dashboard งานอนามัยโรงเรียน'
      summaryTitle='Dashboard งานอนามัยโรงเรียน'
      summaryCards={summaryCards}
      onBack={() => history.push('/clinic/school-health')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='summarize' onClick={() => history.push('/clinic/school-health/reports')}>
            หน้ารายงาน
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
      <PageBody>
        {/* แถบแจ้งเตือนล่วงหน้า 1 สัปดาห์ — แสดงทุกแท็บ */}
        {upcoming.length > 0 ? (
          <NoticeBar
            tone='warning'
            icon='event_upcoming'
            trailing={(
              <NeutralSubdueButton size='sm' leadingIcon='list' onClick={() => setActiveTab('plan')}>
                ดูแผนทั้งหมด
              </NeutralSubdueButton>
            )}
          >
            {`มีกำหนดออกให้บริการโรงเรียนภายใน 7 วัน ${upcoming.length} รายการ — ใกล้ที่สุดคือ ${upcoming[0].schoolName} (${upcoming[0].gradeName}) ${upcoming[0].service} วันที่ ${formatShDate(upcoming[0].date)} อีก ${upcoming[0].daysLeft} วัน`}
          </NoticeBar>
        ) : (
          <NoticeBar tone='brand' icon='event_available'>
            ไม่มีกำหนดออกให้บริการโรงเรียนภายใน 7 วันข้างหน้า
          </NoticeBar>
        )}

        <PageCard gap='var(--dim-space-400, 16px)'>
          <SectionHeader
            icon='filter_alt'
            title='ขอบเขตข้อมูล'
            subtitle={scopeLabel}
          />
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown
                prefix='โรงเรียน:'
                options={schoolOptions()}
                value={filters.school}
                onChange={(v) => { setFilters((f) => ({ ...f, school: v, grade: 'all', room: 'all' })); setPage(1); }}
              />
              <FilterDropdown
                prefix='ชั้น:'
                options={gradeOptionsForSchool(filters.school === 'all' ? null : filters.school)}
                value={filters.grade}
                onChange={(v) => { setFilters((f) => ({ ...f, grade: v, room: 'all' })); setPage(1); }}
              />
              <FilterDropdown
                prefix='ห้อง:'
                options={[{ value: 'all', label: 'ทุกห้อง' }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]}
                value={filters.room}
                onChange={setFilter('room')}
              />
              <FilterDropdown prefix='ปีการศึกษา:' options={SH_ACADEMIC_YEARS} value={filters.academicYear} onChange={setFilter('academicYear')} />
              <FilterDropdown prefix='ภาคเรียน:' options={SH_TERMS} value={filters.term} onChange={setFilter('term')} />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>
          <SubCard tone='brand'>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
              <ReadField label='ความจุห้องเรียนรวม' value={`${thNum(capacity.capacity)} คน`} minWidth={180} />
              <ReadField label='นักเรียนในทะเบียน' value={`${thNum(capacity.enrolled)} คน`} minWidth={180} />
              <ReadField label='รับเพิ่มได้' value={`${thNum(capacity.vacancy)} คน`} minWidth={150} />
              <ReadField label='ความครอบคลุมการตรวจรวม' value={`${pct(data.total - data.notServed, data.total)}%`} minWidth={220} />
              <div className='flex-1' />
              <AuditLine icon='info'>{`ข้อมูล ณ ${formatShDate(todayIso())} — "รับเพิ่มได้" คำนวณจากความจุห้องเรียนที่กรอกในทะเบียนโรงเรียน (TOR 3.1.2)`}</AuditLine>
            </div>
          </SubCard>
        </PageCard>

        <SmoothFilterResults opaque={resultsOpaque}>
          {activeTab === 'overview' ? (
            <>
              <div className='grid grid-cols-1 xl:grid-cols-3 w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
                <PageCard>
                  <SectionHeader icon='donut_small' title='สัดส่วนผ่าน/ไม่ผ่านเกณฑ์' />
                  {passSegments.length === 0 ? (
                    <EmptyState compact icon='donut_small' title='ยังไม่มีข้อมูลในขอบเขตนี้' subtitle='ลองล้างตัวกรอง หรือบันทึกผลตรวจสุขภาพก่อน' />
                  ) : (
                    <DonutWithLegend
                      segments={passSegments}
                      size={180}
                      centerLabel={`${pct(data.passed, data.total)}%`}
                      centerSub='ผ่านเกณฑ์'
                    />
                  )}
                </PageCard>

                <PageCard>
                  <SectionHeader icon='monitor_weight' title='ภาวะโภชนาการ (BMI for Age)' />
                  {nutritionSegments.length === 0 ? (
                    <EmptyState compact icon='monitor_weight' title='ยังไม่มีผลแปลผลโภชนาการ' subtitle='บันทึกน้ำหนัก/ส่วนสูงเพื่อให้ระบบแปลผลอัตโนมัติ' />
                  ) : (
                    <DonutWithLegend
                      segments={nutritionSegments}
                      size={180}
                      centerLabel={thNum(nutritionSegments.reduce((s, x) => s + x.value, 0))}
                      centerSub='คนที่แปลผลแล้ว'
                    />
                  )}
                </PageCard>

                <PageCard>
                  <SectionHeader icon='bar_chart' title='ความครอบคลุมการตรวจรายโรงเรียน' />
                  {coverageRows.length === 0 ? (
                    <EmptyState compact icon='bar_chart' title='ยังไม่มีข้อมูลรายโรงเรียน' />
                  ) : (
                    <div className='w-full'><HBarList valueLabel='%' rows={coverageRows} /></div>
                  )}
                </PageCard>
              </div>

              <PageCard>
                <SectionHeader
                  icon='table_chart'
                  title='drill-down รายโรงเรียน'
                  subtitle='คลิก "ดูเฉพาะโรงเรียนนี้" เพื่อกรองไปยัง worklist เก็บตกของโรงเรียนนั้น'
                />
                {data.bySchool.length === 0 ? (
                  <EmptyState
                    icon='apartment'
                    title='ไม่มีโรงเรียนที่มีนักเรียนในขอบเขตนี้'
                    subtitle='ตรวจสอบตัวกรอง หรือเพิ่มห้องเรียน/นำเข้ารายชื่อนักเรียนที่ทะเบียนก่อน'
                    actionLabel='ไปทะเบียนโรงเรียน'
                    onAction={() => history.push('/clinic/school-health/schools')}
                  />
                ) : (
                  <>
                    <Table
                      columns={drillColumns}
                      rows={data.bySchool}
                      rowKey={(r) => r.id}
                      stickyColCount={1}
                      stickyRightColCount={1}
                      stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                      emptyMessage='ไม่มีข้อมูล'
                    />
                    <div className='w-full' style={{ paddingTop: 'var(--dim-space-300, 12px)' }}>
                      <VBars
                        months={data.bySchool.map((s) => s.schoolName)}
                        series={[
                          { label: 'ผ่านเกณฑ์ (คน)', color: PHCIS_CHART.teal, values: data.bySchool.map((s) => s.passed) },
                          { label: 'ไม่ผ่านเกณฑ์ (คน)', color: PHCIS_CHART.pink, values: data.bySchool.map((s) => s.failed) },
                        ]}
                        height={220}
                        barMaxWidth={data.bySchool.length <= 5 ? 24 : 12}
                      />
                    </div>
                  </>
                )}
              </PageCard>
            </>
          ) : null}

          {activeTab === 'followup' ? (
            <PageCard>
              <SectionHeader
                icon='fast_forward'
                title='worklist เก็บตก — นักเรียนที่ยังไม่ได้รับบริการตามรอบ'
                subtitle='รวมนักเรียนที่ยังไม่ได้ตรวจสุขภาพในรอบนี้ และ/หรือได้รับวัคซีนไม่ครบตามระดับชั้น'
              />
              <StatRow>
                <StatTile label='ต้องเก็บตกทั้งหมด' value={thNum(data.followUp.length)} unit='คน' icon='fast_forward' tone='warning' />
                <StatTile label='ยังไม่ได้ตรวจสุขภาพ' value={thNum(data.notServed)} unit='คน' icon='pending' tone='danger' />
                <StatTile
                  label='วัคซีนไม่ครบตามชั้น'
                  value={thNum(data.rows.filter((r) => r.missingVaccines.length > 0).length)}
                  unit='คน'
                  icon='vaccines'
                  tone='warning'
                />
                <StatTile label='ผ่านเกณฑ์แล้ว' value={thNum(data.passed)} unit='คน' icon='check_circle' tone='brand' />
              </StatRow>
              {data.followUp.length === 0 ? (
                <EmptyState
                  icon='check_circle'
                  title='ไม่มีนักเรียนค้างเก็บตกในขอบเขตนี้'
                  subtitle='ทุกคนได้รับการตรวจสุขภาพและวัคซีนครบตามระดับชั้นแล้ว'
                />
              ) : (
                <>
                  <Table
                    columns={followUpColumns}
                    rows={followUpPageRows}
                    rowKey={(r) => r.id}
                    stickyColCount={3}
                    stickyRightColCount={1}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่มีรายการ'
                  />
                  <PagerRow page={page} pageSize={PAGE_SIZE} total={data.followUp.length} onPageChange={setPage} unit='คน' />
                </>
              )}
            </PageCard>
          ) : null}

          {activeTab === 'plan' ? (
            <PageCard>
              <SectionHeader
                icon='event_upcoming'
                title='กำหนดออกให้บริการโรงเรียน'
                subtitle='ระบบแจ้งเตือนล่วงหน้า 1 สัปดาห์ — แถวที่เหลือ ≤ 7 วันจะถูกไฮไลต์'
              />
              {upcoming.length === 0 ? (
                <EmptyState compact icon='event_available' title='ไม่มีกำหนดออกให้บริการภายใน 7 วัน' subtitle='ดูแผนทั้งหมดได้ที่แท็บ "แผนออกให้บริการ" ในทะเบียนโรงเรียน' actionLabel='ไปทะเบียนโรงเรียน' onAction={() => history.push('/clinic/school-health/schools')} />
              ) : (
                <Table
                  columns={[
                    { key: 'date', label: 'วันที่', render: (r) => formatShDate(r.date) },
                    {
                      key: 'daysLeft',
                      label: 'เหลืออีก',
                      render: (r) => (
                        <ColorfulBadge style={r.daysLeft <= 3 ? 'red' : 'orange'} size='small' hierarchy='secondary'>
                          {`${r.daysLeft} วัน`}
                        </ColorfulBadge>
                      ),
                    },
                    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 220 },
                    { key: 'gradeName', label: 'ชั้น' },
                    { key: 'service', label: 'กิจกรรมที่วางแผน', flex: true, minWidth: 280 },
                    { key: 'staff', label: 'ผู้รับผิดชอบ', flex: true, minWidth: 190 },
                    {
                      key: 'actions',
                      label: 'การดำเนินการ',
                      sortable: false,
                      render: (r) => (
                        <BrandSubdueButton
                          variant='outline'
                          size='sm'
                          leadingIcon='checklist'
                          onClick={() => history.push({
                            pathname: '/clinic/school-health/batch-vaccine',
                            state: { schoolId: r.schoolId, grade: r.grade },
                          })}
                        >
                          เตรียมบันทึกรายห้อง
                        </BrandSubdueButton>
                      ),
                    },
                  ]}
                  rows={upcoming}
                  rowKey={(r) => r.id}
                  emptyMessage='ไม่มีแผนออกให้บริการ'
                />
              )}
            </PageCard>
          ) : null}
        </SmoothFilterResults>

        <PageCard gap='var(--dim-space-300, 12px)'>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            <Icon name='info' size={14} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
              {`เกณฑ์ "ผ่าน" = โภชนาการสมส่วน + สายตาปกติ + ไม่พบเหา + ไม่มีภาวะซีด + วัคซีนครบตามระดับชั้น · ผลโภชนาการอ้างเกณฑ์ ${NUTRITION_BANDS.map((b) => b.label).join(' / ')} · ชื่อนักเรียนใน worklist ถูกปิดบังตามข้อกำหนดข้อมูลลับ (§1.4.2)`}
            </span>
          </div>
          <AuditLine icon='science'>
            {`ตัวอย่างการแปลผล: ${nutritionBand('obese')?.label || 'อ้วน'} และ ${nutritionBand('thin')?.label || 'ผอม'} ถือว่า "น้ำหนักไม่ตรงเกณฑ์" ตามรายงาน TOR 3.6.2`}
          </AuditLine>
        </PageCard>
      </PageBody>
    </QueuePageShell>
  );
};

export default SchoolHealthDashboardPage;
