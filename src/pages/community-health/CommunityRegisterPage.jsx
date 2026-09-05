import React from 'react';
import { CommunityStubPage } from './communityShared';

/* ข้อมูลทะเบียนชุมชน — ported from claude/Community community-register.html. */
const CommunityRegisterPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลทะเบียนชุมชน']}
    title='ข้อมูลทะเบียนชุมชน'
  />
);

export default CommunityRegisterPage;
