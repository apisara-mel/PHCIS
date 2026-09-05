import React from 'react';
import { CommunityStubPage } from './communityShared';

/* รายละเอียดอาสาสมัครชุมชน — ported from claude/Community volunteer-detail.html. */
const VolunteerDetailPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'อาสาสมัครชุมชน', 'รายละเอียด']}
    title='รายละเอียดอาสาสมัครชุมชน'
  />
);

export default VolunteerDetailPage;
