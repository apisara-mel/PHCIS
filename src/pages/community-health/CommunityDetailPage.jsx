import React from 'react';
import { CommunityStubPage } from './communityShared';

/* รายละเอียดทะเบียนชุมชน — ported from claude/Community community-detail.html. */
const CommunityDetailPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน', 'รายละเอียด']}
    title='รายละเอียดทะเบียนชุมชน'
  />
);

export default CommunityDetailPage;
