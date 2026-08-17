import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';

/* สลับหน้าในระบบการเยี่ยมบ้าน — แบบเดียวกับ PharmacySubNav / LabSubNav.
   เมนูซ้ายของ "ระบบการเยี่ยมบ้าน" เป็นรายการเดียวชี้ที่คิวนัดเยี่ยม
   (ตามแบบ OPD / เวชระเบียน / บันทึกการรักษา ที่หนึ่งโมดูล = หนึ่งปลายทาง)
   แล้วใช้แถบนี้เป็น nav ระดับหน้าแทน sub-menu เดิม.

   หน้า "บันทึกประเมินการเยี่ยมบ้าน" (/homevisit/visit) ไม่อยู่ในแถบนี้
   โดยตั้งใจ — เป็นฟอร์มของผู้รับบริการรายหนึ่ง ไม่ใช่หน้าระดับโมดูล
   จึงคงแถบไว้ที่คิว (เข้าถึงฟอร์มผ่านปุ่มในตาราง). */

const LINKS = [
  { key: 'queue',    label: 'คิวนัดเยี่ยมบ้าน',    path: '/homevisit'           },
  { key: 'registry', label: 'ทะเบียน',             path: '/homevisit/registry'  },
  { key: 'followUp', label: 'ติดตามการเยี่ยมบ้าน', path: '/homevisit/follow-up' },
];

const TABS = LINKS.map(({ key, label }) => ({ key, label }));

const resolveActiveKey = (pathname) => {
  if (pathname.startsWith('/homevisit/registry')) return 'registry';
  if (pathname.startsWith('/homevisit/follow-up')) return 'followUp';
  return 'queue';
};

const HomeVisitSubNav = () => {
  const history = useHistory();
  const location = useLocation();
  const activeKey = resolveActiveKey(location.pathname);

  return (
    <TabUnderline
      tabs={TABS}
      value={activeKey}
      morphOnScroll
      onChange={(key) => {
        const link = LINKS.find((l) => l.key === key);
        if (link) history.push(link.path);
      }}
      style={{ gap: 'var(--dim-space-0)' }}
    />
  );
};

export default HomeVisitSubNav;
