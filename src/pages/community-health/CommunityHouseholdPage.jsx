import React from 'react';
import { CommunityStubPage } from './communityShared';

/* ทะเบียนบ้านและสมาชิก — ported from claude/Community community-household.html. */
const CommunityHouseholdPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก']}
    title='ทะเบียนบ้านและสมาชิก'
  />
);

export default CommunityHouseholdPage;
