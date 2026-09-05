import React from 'react';
import { CommunityStubPage } from './communityShared';

/* รายละเอียดทะเบียนบ้าน — ported from claude/Community household-detail.html. */
const HouseholdDetailPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'รายละเอียด']}
    title='รายละเอียดทะเบียนบ้าน'
  />
);

export default HouseholdDetailPage;
