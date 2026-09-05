import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import CommunityLayout from './CommunityLayout';
import { CommunityCard, CommunityComingSoon } from './communityShared';
import { VOLUNTEER_STATUS_META, findVolunteerById } from './communityVolunteerData';

/* รายละเอียดอาสาสมัครชุมชน — ported from claude/Community volunteer-detail.html.
   Read-only view: hero summary tiles → ข้อมูลทั่วไป (dl list) →
   บ้านที่รับผิดชอบ (Table) → ประวัติการปฏิบัติงาน (Table). Same shell/token
   conventions as ChcDetailPage.jsx (headerActions back+name+badge,
   SummaryCardsBar, CommunityCard + CardTitle + InfoRow). No edit affordance
   is rendered — there is no wired /volunteer/:id/edit route yet, matching
   the task's "read-only" scope. */

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const InfoRow = ({ label, value }) => (
  <div
    className='flex items-start justify-between'
    style={{
      gap: 'var(--dim-space-400, 16px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
    }}
  >
    <dt
      style={{
        flex: '0 0 auto',
        minWidth: 180,
        color: 'var(--text-content-tertiary, #8A9099)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {label}
    </dt>
    <dd
      style={{
        margin: 0,
        flex: '1 1 auto',
        textAlign: 'right',
        color: 'var(--text-content-default, #363B3F)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-medium, 500)',
      }}
    >
      {value}
    </dd>
  </div>
);

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

const NotFoundCard = () => (
  <CommunityCard>
    <CommunityComingSoon title='ไม่พบข้อมูลอาสาสมัครชุมชนนี้' />
  </CommunityCard>
);

const HOUSE_COLUMNS = [
  { key: 'no', header: 'บ้านเลขที่', minWidth: 100, render: (row) => <span style={TEXT_CELL}>{row.no}</span> },
  { key: 'community', header: 'ชุมชน', flex: true, minWidth: 160, render: (row) => <span style={TEXT_CELL}>{row.community}</span> },
  { key: 'head', header: 'หัวหน้าครัวเรือน', minWidth: 160, render: (row) => <span style={TEXT_CELL}>{row.head}</span> },
  { key: 'members', header: 'สมาชิก', minWidth: 90, render: (row) => <span style={TEXT_CELL}>{row.members} คน</span> },
  { key: 'surveyedAt', header: 'วันที่สำรวจล่าสุด', minWidth: 130, render: (row) => <span style={TEXT_CELL}>{row.surveyedAt}</span> },
];

const WORK_COLUMNS = [
  { key: 'date', header: 'วันที่ปฏิบัติงาน', minWidth: 120, render: (row) => <span style={TEXT_CELL}>{row.date}</span> },
  { key: 'activity', header: 'กิจกรรม', minWidth: 200, render: (row) => <span style={TEXT_CELL}>{row.activity}</span> },
  { key: 'detail', header: 'รายละเอียด/พื้นที่ที่เกี่ยวข้อง', flex: true, minWidth: 240, render: (row) => <span style={TEXT_CELL}>{row.detail}</span> },
];

/* อายุงาน (ปี) — นับจากวันที่เริ่มปฏิบัติงานถึงวันนี้ ปัดลง */
const yearsOfService = (startDate) => {
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const beforeAnniversary = (now.getMonth() < start.getMonth())
    || (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
};

const VolunteerDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const volunteer = findVolunteerById(id);

  if (!volunteer) {
    return (
      <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน', 'รายละเอียด']}>
        <NotFoundCard />
      </CommunityLayout>
    );
  }

  const statusMeta = VOLUNTEER_STATUS_META[volunteer.status];

  const summaryCards = [
    { key: 'houses', color: 'info', icon: 'home', value: String(volunteer.houses), label: 'บ้านที่รับผิดชอบ', indicator: null, indicatorIcon: null },
    { key: 'community', color: 'positive', icon: 'holiday_village', value: volunteer.community, label: 'ชุมชนที่รับผิดชอบ', indicator: null, indicatorIcon: null },
    { key: 'tenure', color: 'inprogress', icon: 'calendar_month', value: `${yearsOfService(volunteer.startDate)} ปี`, label: 'ระยะเวลาปฏิบัติงาน', indicator: null, indicatorIcon: null },
    { key: 'workHistory', color: 'destructive', icon: 'event_available', value: String(volunteer.workHistory.length), label: 'ครั้งที่บันทึกปฏิบัติงาน', indicator: null, indicatorIcon: null },
  ];

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน', volunteer.name]}
      headerActions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='md'
            leadingIcon='arrow_back'
            onClick={() => history.push('/community-health/volunteer')}
          >
            กลับ
          </NeutralSubdueButton>
          <h1
            className='flex-1'
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
              color: 'var(--text-topic-tertiary-title, #363B3F)',
            }}
          >
            {volunteer.name}
          </h1>
          {statusMeta && (
            <ColorfulBadge style={statusMeta.tone} size='default' hierarchy='secondary' width='hug' showDot>
              {statusMeta.label}
            </ColorfulBadge>
          )}
        </div>
      )}
    >
      <SummaryCardsBar cards={summaryCards} variant='panel' detached />

      <div
        className='grid'
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--dim-space-600, 24px)' }}
      >
        <CommunityCard>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
          <dl style={{ margin: 0 }}>
            <InfoRow label='รหัส อสส.' value={volunteer.code} />
            <InfoRow label='ชื่อ-นามสกุล' value={volunteer.name} />
            <InfoRow label='เพศ' value={volunteer.sex} />
            <InfoRow label='อายุ' value={`${volunteer.age} ปี`} />
            <InfoRow label='เลขบัตรประชาชน' value={volunteer.cid} />
            <InfoRow label='เบอร์โทรติดต่อ' value={volunteer.phone} />
            <InfoRow label='อีเมล' value={volunteer.email || '—'} />
            <InfoRow label='ที่อยู่' value={volunteer.addr} />
          </dl>
        </CommunityCard>

        <CommunityCard>
          <CardTitle>ข้อมูลการปฏิบัติงาน</CardTitle>
          <dl style={{ margin: 0 }}>
            <InfoRow label='ศูนย์สุขภาพชุมชน' value={volunteer.center} />
            <InfoRow label='ประเภทอาสาสมัคร' value={volunteer.type} />
            <InfoRow label='ชุมชนที่รับผิดชอบ' value={volunteer.community} />
            <InfoRow label='พื้นที่รับผิดชอบ' value={volunteer.coverage} />
            <InfoRow label='บ้านที่รับผิดชอบ' value={`${volunteer.houses} หลัง`} />
            <InfoRow label='วันที่เริ่มปฏิบัติงาน' value={volunteer.startDate} />
          </dl>
        </CommunityCard>
      </div>

      <CommunityCard>
        <div className='flex items-center justify-between'>
          <CardTitle>{`บ้านที่รับผิดชอบ (${volunteer.houseList.length} หลัง)`}</CardTitle>
        </div>
        <Table columns={HOUSE_COLUMNS} rows={volunteer.houseList} maxHeight={320} rowKey={(row) => row.no} />
      </CommunityCard>

      <CommunityCard>
        <CardTitle>ประวัติการปฏิบัติงาน</CardTitle>
        <Table columns={WORK_COLUMNS} rows={volunteer.workHistory} maxHeight={320} rowKey={(row) => `${row.date}-${row.activity}`} />
      </CommunityCard>
    </CommunityLayout>
  );
};

export default VolunteerDetailPage;
