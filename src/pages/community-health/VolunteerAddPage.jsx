import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มอาสาสมัครชุมชน — ported from claude/Community volunteer-add.html. */
const VolunteerAddPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน', 'เพิ่มอาสาสมัคร']}
    title='เพิ่มอาสาสมัครชุมชน'
  />
);

export default VolunteerAddPage;
