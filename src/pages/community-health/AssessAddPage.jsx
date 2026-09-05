import React from 'react';
import { CommunityStubPage } from './communityShared';

/* เพิ่มแบบประเมิน — ported from claude/Community assess-add.html. */
const AssessAddPage = () => (
  <CommunityStubPage
    activeKey='assess'
    breadcrumb={['การประเมิน', 'เพิ่มแบบประเมิน']}
    title='เพิ่มแบบประเมิน'
  />
);

export default AssessAddPage;
