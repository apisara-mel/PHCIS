import React from 'react';
import { useHistory } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import { DonutWithLegend, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';

/* แดชบอร์ด — ported from claude/Community community-dashboard.html.
   Reuses PHCIS's own dashboard building blocks (SummaryCardsBar, Donut/
   HBar/VBar charts, PHCIS_CHART palette) instead of the static prototype's
   own mih-design-system.css token layer, per CLAUDE.md §"Design tokens are
   the only source of truth". The interactive GIS map (with pin popovers,
   layer toggle, zoom) is its own page (/community-health/gis) — this page
   only teases it, same relationship as the source prototype's "ดูแผนที่เต็ม". */

const SUMMARY_CARDS = [
  { key: 'communities', color: 'info', icon: 'holiday_village', value: '34', label: 'จำนวนชุมชน', indicator: 'เพิ่ม 5 จากปีที่แล้ว' },
  { key: 'houses', color: 'info', icon: 'home', value: '1,240', label: 'จำนวนบ้าน', indicator: 'เพิ่ม 5 จากปีที่แล้ว' },
  { key: 'members', color: 'info', icon: 'groups', value: '4,186', label: 'จำนวนสมาชิก', indicator: 'เพิ่ม 20 จากปีที่แล้ว' },
  { key: 'volunteers', color: 'positive', icon: 'volunteer_activism', value: '214', label: 'จำนวน อสส.', indicator: 'เพิ่ม 31 จากปีที่แล้ว' },
  { key: 'chc', color: 'inprogress', icon: 'local_hospital', value: '6', label: 'ศูนย์สุขภาพชุมชน', indicator: 'คงเดิมจากปีที่แล้ว', indicatorIcon: null },
  { key: 'activities', color: 'inprogress', icon: 'event_available', value: '58', label: 'จำนวนกิจกรรม', indicator: 'คงเดิมจากปีที่แล้ว', indicatorIcon: null },
];

const HOUSES_BY_DISTRICT = {
  months: ['ดินแดง', 'ห้วยขวาง', 'พญาไท', 'คลองเตย', 'บางกะปิ', 'อื่นๆ'],
  series: [{ label: 'จำนวนบ้าน', color: PHCIS_CHART.teal, values: [630, 312, 289, 156, 198, 120] }],
};

const MEMBERS_BY_GROUP = [
  { value: 18, color: PHCIS_CHART.pink, label: 'เด็ก (0-14 ปี)' },
  { value: 61, color: PHCIS_CHART.teal, label: 'วัยทำงาน (15-59 ปี)' },
  { value: 21, color: PHCIS_CHART.yellow, label: 'ผู้สูงอายุ (60 ปีขึ้นไป)' },
];

const ACTIVITIES_BY_TYPE = [
  { label: 'เยี่ยมบ้าน', value: 22 },
  { label: 'สำรวจชุมชนและบ้าน', value: 16 },
  { label: 'ประเมินสภาพแวดล้อม', value: 10 },
  { label: 'อบรม/ให้ความรู้', value: 7 },
  { label: 'อื่นๆ', value: 3 },
];

const SURVEYS_BY_STATUS = [
  { value: 56, color: PHCIS_CHART.teal, label: 'สำรวจแล้ว' },
  { value: 18, color: PHCIS_CHART.pink, label: 'กำลังสำรวจ' },
  { value: 26, color: PHCIS_CHART.yellow, label: 'ยังไม่สำรวจ' },
];

const ASSESSMENTS_BY_RESULT = [
  { value: 62, color: PHCIS_CHART.teal, label: 'ผ่านเกณฑ์' },
  { value: 24, color: PHCIS_CHART.pink, label: 'ต้องปรับปรุง' },
  { value: 14, color: PHCIS_CHART.yellow, label: 'ยังไม่ได้ประเมิน' },
];

const CardTitle = ({ children }) => (
  <p
    style={{
      margin: 0,
      fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
      color: 'var(--text-topic-tertiary-title, #363B3F)',
    }}
  >
    {children}
  </p>
);

const ChartRow = ({ children }) => (
  <div
    className='grid'
    style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--dim-space-600, 24px)' }}
  >
    {children}
  </div>
);

/* Teaser for the full interactive GIS map — the real map (pins, layers,
   zoom, popovers) lives on its own page (community-gis.html → /community-health/gis). */
const MapTeaserCard = () => {
  const history = useHistory();
  return (
    <CommunityCard style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <div className='flex items-center justify-between'>
        <CardTitle>ภาพรวมพื้นที่บนแผนที่</CardTitle>
        <button
          type='button'
          onClick={() => history.push('/community-health/gis')}
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            background: 'none',
            border: 0,
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-brandPrimary-default, var(--brand-p700, #007549))',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-medium, 500)',
          }}
        >
          ดูแผนที่เต็ม
          <Icon name='arrow_forward' size={16} />
        </button>
      </div>
      <div
        className='flex flex-col items-center justify-center w-full'
        style={{
          minHeight: 220,
          borderRadius: 'var(--dim-radius-400, 12px)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          border: 'var(--dim-stroke-100, 1px) dashed var(--border-brandPrimary-quaternary, #E2F3EB)',
          gap: 'var(--dim-space-200, 8px)',
        }}
      >
        <Icon name='travel_explore' size={32} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
        <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)' }}>
          ขอบเขตชุมชนดินแดง — บ้าน · ศูนย์บริการสาธารณสุข · อสส.
        </span>
      </div>
    </CommunityCard>
  );
};

const CommunityDashboardPage = () => (
  <CommunityLayout activeKey='dashboard' breadcrumb={['แดชบอร์ด']}>
    <SummaryCardsBar cards={SUMMARY_CARDS} variant='panel' detached />

    <ChartRow>
      <CommunityCard>
        <CardTitle>จำนวนบ้านตามเขต</CardTitle>
        <VBars months={HOUSES_BY_DISTRICT.months} series={HOUSES_BY_DISTRICT.series} showLegend={false} />
      </CommunityCard>

      <CommunityCard>
        <CardTitle>จำนวนสมาชิกตามกลุ่ม</CardTitle>
        <DonutWithLegend segments={MEMBERS_BY_GROUP} />
      </CommunityCard>
    </ChartRow>

    <ChartRow>
      <CommunityCard>
        <CardTitle>จำนวนกิจกรรมตามประเภท</CardTitle>
        <HBarList rows={ACTIVITIES_BY_TYPE} valueLabel='ครั้ง' />
      </CommunityCard>

      <CommunityCard>
        <CardTitle>จำนวนการสำรวจตามสถานะ</CardTitle>
        <DonutWithLegend segments={SURVEYS_BY_STATUS} />
      </CommunityCard>
    </ChartRow>

    <ChartRow>
      <CommunityCard>
        <CardTitle>จำนวนการประเมินตามผล</CardTitle>
        <DonutWithLegend segments={ASSESSMENTS_BY_RESULT} />
      </CommunityCard>

      <MapTeaserCard />
    </ChartRow>
  </CommunityLayout>
);

export default CommunityDashboardPage;
