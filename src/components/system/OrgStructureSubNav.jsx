import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';
import { ORG_STRUCTURE_TABS } from '@/pages/system/systemNav';

/* แถบแท็บของเมนู "โครงสร้างองค์กรและสิทธิ์" — 5 หน้าที่เคยเป็น 5 เมนูใน rail
   ยุบเป็นเมนูเดียวแล้วสลับกันด้วยแท็บ (มติผู้ใช้ 29 ส.ค. 69) แบบเดียวกับ
   PharmacySubNav / LabSubNav / HomeVisitSubNav: เมนูใน Sidebar เหลือรายการ
   เดียวชี้หน้าแรกของกลุ่ม ส่วนแถบนี้เป็น nav ระดับหน้า วางที่ prop
   `belowSummary` ของ QueuePageShell.

   รายการแท็บอ่านจาก ORG_STRUCTURE_TABS ที่ systemNav — ที่เดียวกับที่
   accessMenuCatalog ใช้แตกสิทธิ์ระดับเมนูย่อย จึงไม่ต้องแก้สองที่ให้ตรงกัน.

   หน้าลูก (เช่น /admin/centers/new, /assess/access-control/:id) ยังคงไฮไลต์
   แท็บแม่ของมัน เพราะเทียบด้วย prefix ของ path. */

const TABS = ORG_STRUCTURE_TABS.map(({ key, label }) => ({ key, label }));

const resolveActiveKey = (pathname) => {
  const hit = ORG_STRUCTURE_TABS.find(
    (t) => pathname === t.path || pathname.startsWith(`${t.path}/`),
  );
  /* /assess/group-policy = route เดิมของ "บทบาท" (redirect มาที่ /assess/activities) */
  if (!hit && pathname.startsWith('/assess/group-policy')) return 'assess-activity';
  return hit ? hit.key : ORG_STRUCTURE_TABS[0].key;
};

const OrgStructureSubNav = () => {
  const history = useHistory();
  const location = useLocation();
  const activeKey = resolveActiveKey(location.pathname);

  return (
    <TabUnderline
      tabs={TABS}
      value={activeKey}
      morphOnScroll
      onChange={(key) => {
        const tab = ORG_STRUCTURE_TABS.find((t) => t.key === key);
        if (tab && tab.path !== location.pathname) history.push(tab.path);
      }}
      style={{ gap: 'var(--dim-space-0)' }}
    />
  );
};

export default OrgStructureSubNav;
