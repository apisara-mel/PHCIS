import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import TabUnderline from '@/components/tab/TabUnderline';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import CommunityLayout from './CommunityLayout';
import { CommunityCard, CommunityComingSoon } from './communityShared';
import {
  getCommunityById,
  STATUS_LABEL,
  buildHouseholds,
  buildSurveys,
  buildAssessments,
} from './communityRegisterData';

/* รายละเอียดทะเบียนชุมชน — ported from claude/Community community-detail.html.
   Keeps the source's 4-stat-card + tab-bar shape (ข้อมูลชุมชน / บ้านและ
   สมาชิก / การสำรวจ / การประเมิน) but drops the embedded interactive GIS
   map — that lives on its own page (/community-health/gis), same relationship
   CommunityDashboardPage's MapTeaserCard already established for this
   module, so the map isn't duplicated three different ways. */

const TABS = [
  { key: 'info', label: 'ข้อมูลชุมชน' },
  { key: 'hh', label: 'บ้านและสมาชิก' },
  { key: 'survey', label: 'การสำรวจ' },
  { key: 'assess', label: 'การประเมิน' },
];

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

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

const InfoRow = ({ label, value }) => (
  <div
    className='flex items-center justify-between'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-200, 8px)',
      paddingBottom: 'var(--dim-space-200, 8px)',
      borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    }}
  >
    <dt style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary, #858C92)' }}>{label}</dt>
    <dd style={{ ...TEXT_CELL, margin: 0, textAlign: 'right' }}>{value ?? '—'}</dd>
  </div>
);

const InfoCard = ({ title, rows }) => (
  <CommunityCard style={{ gap: 'var(--dim-space-300, 12px)', flex: '1 1 320px' }}>
    <CardTitle>{title}</CardTitle>
    <dl className='flex flex-col w-full' style={{ margin: 0, gap: 0 }}>
      {rows.map((r) => <InfoRow key={r.label} label={r.label} value={r.value} />)}
    </dl>
  </CommunityCard>
);

const ChipList = ({ items, tone = 'green', icon }) => (
  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150, 6px)' }}>
    {items.length === 0 ? (
      <span style={{ ...TEXT_CELL, color: 'var(--text-content-tertiary, #858C92)' }}>ไม่มีข้อมูล</span>
    ) : items.map((item) => (
      <ColorfulBadge key={item} style={tone} size='small' hierarchy='secondary' width='hug' icon={icon}>
        {item}
      </ColorfulBadge>
    ))}
  </div>
);

const SurveyStatus = ({ done }) => (
  <ColorfulBadge style={done ? 'green' : 'yellow'} size='small' hierarchy='secondary' width='hug' showDot>
    {done ? 'เสร็จสิ้น' : 'รอสำรวจ'}
  </ColorfulBadge>
);

const HouseSurveyStatus = ({ surveyed }) => (
  <ColorfulBadge style={surveyed ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug' showDot>
    {surveyed ? 'สำรวจแล้ว' : 'ยังไม่สำรวจ'}
  </ColorfulBadge>
);

const RATING_TONE = { 'ดี': 'green', 'พอใช้': 'yellow', 'ควรปรับปรุง': 'red', '-': 'grey' };
const RatingBadge = ({ value }) => (
  <ColorfulBadge style={RATING_TONE[value] || 'grey'} size='small' hierarchy='secondary' width='hug' showDot>
    {value}
  </ColorfulBadge>
);

const ResultBadge = ({ result }) => (
  <ColorfulBadge style={result === 'ผ่าน' ? 'green' : result === 'ควรปรับปรุง' ? 'red' : 'grey'} size='small' hierarchy='secondary' width='hug' showDot>
    {result}
  </ColorfulBadge>
);

const HOUSEHOLD_COLUMNS = [
  { key: 'no', header: 'ลำดับ', minWidth: 60, render: (r) => <span style={TEXT_CELL}>{r.no}</span> },
  { key: 'houseNo', header: 'บ้านเลขที่', minWidth: 90, render: (r) => <span style={TEXT_CELL}>{r.houseNo}</span> },
  { key: 'address', header: 'ที่อยู่', flex: true, minWidth: 240, render: (r) => <span style={TEXT_CELL}>{r.address}</span> },
  { key: 'members', header: 'จำนวนสมาชิก', minWidth: 110, render: (r) => <span style={TEXT_CELL}>{r.members}</span> },
  { key: 'responsible', header: 'อสส. ผู้รับผิดชอบ', minWidth: 150, render: (r) => <span style={TEXT_CELL}>{r.responsible}</span> },
  { key: 'surveyedAt', header: 'วันที่สำรวจล่าสุด', minWidth: 130, render: (r) => <span style={TEXT_CELL}>{r.surveyedAt}</span> },
  { key: 'surveyed', header: 'สถานะการสำรวจ', minWidth: 120, render: (r) => <HouseSurveyStatus surveyed={r.surveyed} /> },
];

const SURVEY_COLUMNS = [
  { key: 'no', header: 'ลำดับ', minWidth: 60, render: (r) => <span style={TEXT_CELL}>{r.no}</span> },
  { key: 'date', header: 'วันที่สำรวจ', minWidth: 110, render: (r) => <span style={TEXT_CELL}>{r.date}</span> },
  { key: 'type', header: 'ประเภทการสำรวจ', minWidth: 150, render: (r) => <span style={TEXT_CELL}>{r.type}</span> },
  { key: 'area', header: 'พื้นที่/บ้านที่สำรวจ', minWidth: 150, render: (r) => <span style={TEXT_CELL}>{r.area}</span> },
  { key: 'surveyor', header: 'ผู้สำรวจ', minWidth: 130, render: (r) => <span style={TEXT_CELL}>{r.surveyor}</span> },
  { key: 'summary', header: 'ผลการสำรวจโดยสรุป', flex: true, minWidth: 220, render: (r) => <span style={TEXT_CELL}>{r.summary}</span> },
  { key: 'done', header: 'สถานะ', minWidth: 100, render: (r) => <SurveyStatus done={r.done} /> },
];

const ASSESSMENT_COLUMNS = [
  { key: 'houseNo', header: 'บ้านเลขที่', minWidth: 90, render: (r) => <span style={TEXT_CELL}>{r.houseNo}</span> },
  { key: 'date', header: 'วันที่ประเมิน', minWidth: 110, render: (r) => <span style={TEXT_CELL}>{r.date}</span> },
  { key: 'assessor', header: 'ผู้ประเมิน', minWidth: 150, render: (r) => <span style={TEXT_CELL}>{r.assessor}</span> },
  { key: 'water', header: 'น้ำดื่มและน้ำใช้', minWidth: 120, render: (r) => <RatingBadge value={r.water} /> },
  { key: 'sanitation', header: 'สุขาภิบาลอาหารและสุขา', minWidth: 150, render: (r) => <RatingBadge value={r.sanitation} /> },
  { key: 'waste', header: 'การจัดการขยะมูลฝอย', minWidth: 140, render: (r) => <RatingBadge value={r.waste} /> },
  { key: 'environment', header: 'สภาพแวดล้อมในบ้าน', minWidth: 140, render: (r) => <RatingBadge value={r.environment} /> },
  { key: 'result', header: 'ผลการประเมิน', minWidth: 110, render: (r) => <ResultBadge result={r.result} /> },
];

const NotFound = ({ history }) => (
  <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน', 'ไม่พบข้อมูล']}>
    <CommunityCard>
      <CommunityComingSoon title='ไม่พบชุมชนที่ต้องการ' />
      <div className='flex justify-center'>
        <BrandSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => history.push('/community-health/register')}>
          กลับไปทะเบียนชุมชน
        </BrandSubdueButton>
      </div>
    </CommunityCard>
  </CommunityLayout>
);

const CommunityDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const community = useMemo(() => getCommunityById(id), [id]);
  const [activeTab, setActiveTab] = useState('info');

  /* Hooks must run unconditionally — build the sub-tables even when
     `community` is momentarily undefined (bad :id), then branch on the
     not-found view below instead of returning early above these calls. */
  const households = useMemo(() => (community ? buildHouseholds(community) : []), [community]);
  const surveys = useMemo(() => (community ? buildSurveys(community) : []), [community]);
  const assessments = useMemo(() => (community ? buildAssessments(community) : []), [community]);

  if (!community) return <NotFound history={history} />;

  const statCards = [
    { key: 'houses', color: 'info', icon: 'home', value: community.houses.toLocaleString('th-TH'), label: 'บ้านทั้งหมด', indicator: `${community.deltaHouses} เทียบกับปีก่อน` },
    { key: 'members', color: 'positive', icon: 'groups', value: community.members.toLocaleString('th-TH'), label: 'สมาชิกในชุมชน', indicator: `${community.deltaMembers} เทียบกับปีก่อน` },
    { key: 'surveyed', color: 'inprogress', icon: 'fact_check', value: community.surveyedHouses.toLocaleString('th-TH'), label: 'บ้านที่สำรวจแล้ว', indicator: `${community.deltaSurveyed} ของบ้านทั้งหมด` },
    { key: 'unsurveyed', color: 'destructive', icon: 'assignment_late', value: community.unsurveyedHouses.toLocaleString('th-TH'), label: 'บ้านที่ยังไม่ได้สำรวจ', indicator: `${community.deltaUnsurveyed} ของบ้านทั้งหมด` },
  ];

  return (
    <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน', community.nameTh]}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <NeutralSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => history.push('/community-health/register')}>
          กลับ
        </NeutralSubdueButton>
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
            color: 'var(--text-topic-tertiary-title, #363B3F)',
          }}
        >
          {community.nameTh}
        </h1>
        <ColorfulBadge style={community.status === 'active' ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug' showDot>
          {STATUS_LABEL[community.status]}
        </ColorfulBadge>
        <div className='flex-1' />
        <BrandSubdueButton
          variant='fill'
          size='md'
          leadingIcon='edit'
          /* ยังไม่มีเส้นทางแก้ไขแยกจากฟอร์มเพิ่ม (Routes.jsx มีแค่ .../new
             กับ .../:id) — ปุ่มนี้จึงพาไปฟอร์มเพิ่มชุมชนแบบเดียวกับต้นแบบ
             ที่ไม่ได้แยกหน้าจอเพิ่ม/แก้ไขออกจากกันชัดเจนเช่นกัน */
          onClick={() => history.push('/community-health/register/new')}
        >
          แก้ไขข้อมูล
        </BrandSubdueButton>
      </div>

      <SummaryCardsBar cards={statCards} variant='panel' detached />

      <TabUnderline tabs={TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'info' && (
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <InfoCard
            title='ข้อมูลทั่วไป'
            rows={[
              { label: 'รหัสชุมชน', value: community.code },
              { label: 'ชื่อชุมชน', value: `${community.nameTh} (${community.nameEn})` },
              { label: 'เขต', value: community.district },
              { label: 'แขวง', value: community.subdistrict },
              { label: 'สถานะ', value: STATUS_LABEL[community.status] },
            ]}
          />
          <InfoCard
            title='ข้อมูลพื้นที่'
            rows={[
              { label: 'ที่อยู่/รายละเอียดพื้นที่', value: community.address },
              { label: 'พิกัด', value: community.coords },
              { label: 'รหัสไปรษณีย์', value: community.postcode },
              { label: 'ศูนย์บริการสาธารณสุขที่รับผิดชอบ', value: community.center },
            ]}
          />
          <InfoCard
            title='ผู้นำชุมชน / อาสาสมัคร'
            rows={[
              { label: 'ชื่อ-นามสกุล', value: community.leaderName },
              { label: 'ตำแหน่ง', value: community.leaderRole },
              { label: 'โทรศัพท์', value: community.leaderTel },
            ]}
          />
          <InfoCard
            title='ข้อมูลประชากร'
            rows={[
              { label: 'จำนวนประชากรทั้งหมด', value: community.population.total.toLocaleString('th-TH') },
              { label: 'ประชากรชาย', value: community.population.male.toLocaleString('th-TH') },
              { label: 'ประชากรหญิง', value: community.population.female.toLocaleString('th-TH') },
              { label: 'ผู้สูงอายุ', value: community.population.elder.toLocaleString('th-TH') },
              { label: 'เด็ก', value: community.population.child.toLocaleString('th-TH') },
              { label: 'ผู้พิการ', value: community.population.disabled.toLocaleString('th-TH') },
              { label: 'โรคเรื้อรัง', value: community.population.chronic.toLocaleString('th-TH') },
            ]}
          />
          <CommunityCard style={{ gap: 'var(--dim-space-400, 16px)', flex: '1 1 320px' }}>
            <CardTitle>พื้นที่เสี่ยง</CardTitle>
            <ChipList items={community.risks} tone='orange' icon='warning' />
            <CardTitle>สถานที่/สิ่งอำนวยความสะดวก</CardTitle>
            <ChipList items={community.facilities} tone='blue' icon='place' />
          </CommunityCard>
        </div>
      )}

      {activeTab === 'hh' && (
        <CommunityCard>
          <CardTitle>บ้านและสมาชิกในชุมชน</CardTitle>
          <Table columns={HOUSEHOLD_COLUMNS} rows={households} maxHeight={480} />
        </CommunityCard>
      )}

      {activeTab === 'survey' && (
        <CommunityCard>
          <CardTitle>ประวัติการสำรวจ</CardTitle>
          <Table columns={SURVEY_COLUMNS} rows={surveys} maxHeight={480} />
        </CommunityCard>
      )}

      {activeTab === 'assess' && (
        <CommunityCard>
          <CardTitle>ประวัติการประเมิน</CardTitle>
          <Table columns={ASSESSMENT_COLUMNS} rows={assessments} maxHeight={480} />
        </CommunityCard>
      )}
    </CommunityLayout>
  );
};

export default CommunityDetailPage;
