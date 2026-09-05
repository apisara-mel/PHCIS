import React from 'react';
import { CommunityStubPage } from './communityShared';

/* รายละเอียดศูนย์สุขภาพชุมชน — ported from claude/Community chc-detail.html. */
const ChcDetailPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน', 'รายละเอียด']}
    title='รายละเอียดศูนย์สุขภาพชุมชน'
  />
);

export default ChcDetailPage;
