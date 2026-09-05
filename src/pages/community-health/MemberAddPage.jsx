import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มสมาชิกในครัวเรือน — ported from claude/Community member-add.html. */
const MemberAddPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ทะเบียนบ้านและสมาชิก', 'เพิ่มสมาชิก']}
    title='เพิ่มสมาชิกในครัวเรือน'
  />
);

export default MemberAddPage;
