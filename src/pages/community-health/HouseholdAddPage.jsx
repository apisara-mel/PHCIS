import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มทะเบียนบ้าน — ported from claude/Community household-add.html. */
const HouseholdAddPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'เพิ่มทะเบียนบ้าน']}
    title='เพิ่มทะเบียนบ้าน'
  />
);

export default HouseholdAddPage;
