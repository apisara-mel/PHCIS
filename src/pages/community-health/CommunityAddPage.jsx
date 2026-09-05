import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มทะเบียนชุมชน — ported from claude/Community community-add.html. */
const CommunityAddPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน', 'เพิ่มทะเบียนชุมชน']}
    title='เพิ่มทะเบียนชุมชน'
  />
);

export default CommunityAddPage;
