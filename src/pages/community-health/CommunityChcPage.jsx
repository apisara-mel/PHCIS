import React from 'react';
import { CommunityStubPage } from './communityShared';

/* ข้อมูลศูนย์สุขภาพชุมชน — ported from claude/Community community-chc.html. */
const CommunityChcPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน']}
    title='ข้อมูลศูนย์สุขภาพชุมชน'
  />
);

export default CommunityChcPage;
