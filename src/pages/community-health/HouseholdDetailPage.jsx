import React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SummaryCardsBar from '@/components/layout/SummaryCardsBar';
import CommunityLayout from './CommunityLayout';
import { CommunityCard } from './communityShared';
import { getHouseholdById, getHouseholdMembers, HOUSEHOLD_STATUS_META } from './communityHouseholdData';

/* รายละเอียดทะเบียนบ้าน — ported from claude/Community household-detail.html.
   Read-only house info (`.infocard`/`.inforow`) + the source's `.dcards`
   summary strip + the member roster table (`.mcard` / `.tbl`), rebuilt on
   PHCIS's own SummaryCardsBar / Table / ColorfulBadge per CLAUDE.md. */

const TEXT_CELL = {
  color: 'var(--text-neutral-default, #4D5358)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
};

const PERSON_STATUS_BADGE = {
  'มีชีวิต': 'teal',
  'ย้ายออก': 'yellow',
  'เสียชีวิต': 'grey',
  'พิการ': 'orange',
};

const MemberStatusBadge = ({ status }) => {
  const badge = PERSON_STATUS_BADGE[status] || 'grey';
  if (!status) return <span style={TEXT_CELL}>—</span>;
  return (
    <ColorfulBadge style={badge} size='small' hierarchy='secondary' width='hug'>
      {status}
    </ColorfulBadge>
  );
};

const MEMBER_COLUMNS = [
  { key: 'nid', header: 'เลขประจำตัวประชาชน', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.nid}</span> },
  { key: 'name', header: 'ชื่อ-นามสกุล', flex: true, minWidth: 180, sortable: true, render: (row) => <span style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium, 500)' }}>{row.name}</span> },
  { key: 'sex', header: 'เพศ', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.sex}</span> },
  { key: 'age', header: 'อายุ', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.age}</span> },
  { key: 'relation', header: 'ความสัมพันธ์กับเจ้าบ้าน', sortable: true, render: (row) => <span style={TEXT_CELL}>{row.relation}</span> },
  { key: 'status', header: 'สถานะ', sortable: true, render: (row) => <MemberStatusBadge status={row.status} /> },
];

const InfoRow = ({ label, value }) => (
  <div className='flex items-start' style={{ gap: 'var(--dim-space-400, 16px)', padding: 'var(--dim-space-200, 8px) 0' }}>
    <dt
      style={{
        width: 200,
        flexShrink: 0,
        color: 'var(--text-content-tertiary, #858C92)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm, 14px)',
      }}
    >
      {label}
    </dt>
    <dd
      style={{
        margin: 0,
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

const NotFoundCard = () => {
  const history = useHistory();
  return (
    <CommunityCard>
      <div className='flex flex-col items-center justify-center w-full text-center' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-800, 32px) 0' }}>
        <Icon name='search_off' size={32} style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
        <span style={{ color: 'var(--text-content-default, #363B3F)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)' }}>
          ไม่พบข้อมูลครัวเรือนนี้
        </span>
        <BrandSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => history.push('/community-health/household')}>
          กลับไปทะเบียนบ้านและสมาชิก
        </BrandSubdueButton>
      </div>
    </CommunityCard>
  );
};

const HouseholdDetailPage = () => {
  const { id } = useParams();
  const history = useHistory();
  const house = getHouseholdById(id);

  if (!house) {
    return (
      <CommunityLayout activeKey='community' breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'ไม่พบข้อมูล']}>
        <NotFoundCard />
      </CommunityLayout>
    );
  }

  const members = getHouseholdMembers(id);
  const statusMeta = HOUSEHOLD_STATUS_META[house.status];
  const elderlyCount = members.filter((m) => typeof m.age === 'number' && m.age >= 60).length;
  const childCount = members.filter((m) => typeof m.age === 'number' && m.age <= 14).length;

  const summaryCards = [
    { key: 'survey', color: 'info', icon: 'event_available', value: house.surveyDate, label: 'วันที่สำรวจล่าสุด', indicator: `ผู้สำรวจ: ${house.surveyor}`, indicatorIcon: null },
    { key: 'members', color: 'info', icon: 'groups', value: String(house.memberCount), label: 'จำนวนสมาชิก' },
    { key: 'elderly', color: 'inprogress', icon: 'elderly', value: String(elderlyCount), label: 'จำนวนผู้สูงอายุ' },
    { key: 'children', color: 'positive', icon: 'child_care', value: String(childCount), label: 'จำนวนเด็ก' },
  ];

  return (
    <CommunityLayout
      activeKey='community'
      breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', `บ้านเลขที่ ${house.houseNo}`]}
    >
      <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton variant='outline' size='md' leadingIcon='arrow_back' onClick={() => history.push('/community-health/household')}>
            กลับ
          </BrandSubdueButton>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
              color: 'var(--text-topic-tertiary-title, #363B3F)',
            }}
          >
            บ้านเลขที่ {house.houseNo}
          </h1>
          {statusMeta && (
            <ColorfulBadge style={statusMeta.badge} size='small' hierarchy='secondary' width='hug'>
              {statusMeta.label}
            </ColorfulBadge>
          )}
        </div>
      </div>

      <SummaryCardsBar cards={summaryCards} variant='panel' detached />

      <CommunityCard>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
            color: 'var(--text-topic-tertiary-title, #363B3F)',
          }}
        >
          ข้อมูลทะเบียนบ้าน
        </p>
        <dl style={{ margin: 0 }}>
          <InfoRow label='บ้านเลขที่' value={house.houseNo} />
          <InfoRow label='ที่อยู่' value={house.address} />
          <InfoRow label='ชุมชน' value={house.community} />
          <InfoRow label='เขต' value={house.district} />
          <InfoRow label='แขวง / ตำบล' value={house.subdistrict} />
          <InfoRow label='พิกัด' value={house.coordinates} />
          <InfoRow label='อสส. ผู้รับผิดชอบ' value={house.volunteer} />
        </dl>
      </CommunityCard>

      <CommunityCard>
        <div className='flex items-center justify-between'>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-medium, 500))',
              color: 'var(--text-topic-tertiary-title, #363B3F)',
            }}
          >
            สมาชิกครัวเรือน
          </p>
          <BrandButton
            variant='fill'
            size='md'
            leadingIcon='person_add'
            onClick={() => history.push(`/community-health/household/${house.id}/member/new`)}
          >
            เพิ่มสมาชิก
          </BrandButton>
        </div>
        <Table columns={MEMBER_COLUMNS} rows={members} maxHeight={480} />
      </CommunityCard>
    </CommunityLayout>
  );
};

export default HouseholdDetailPage;
