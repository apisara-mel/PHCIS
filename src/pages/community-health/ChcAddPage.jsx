import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มศูนย์สุขภาพชุมชน — ported from claude/Community chc-add.html. */
const ChcAddPage = () => (
  <CommunityStubPage
    activeKey='community'
    breadcrumb={['ข้อมูลชุมชน', 'ข้อมูลศูนย์สุขภาพชุมชน', 'เพิ่มศูนย์สุขภาพชุมชน']}
    title='เพิ่มศูนย์สุขภาพชุมชน'
  />
);

export default ChcAddPage;
