import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandButton from '@/components/button/BrandButton';
import PharmacyBorrowReturnRequestButton from '@/components/pharmacy/PharmacyBorrowReturnRequestButton';
import PharmacyRegistryEditPopup from '@/components/pharmacy/PharmacyRegistryEditPopup';

/* Cross-links the pharmacy module pages. The Sidebar's `pharmacy` entry stays
   a flat item pointing at the queue (matches the OPD/Registration/Treatment
   convention of one direct-click destination per module). This row uses the
   design-system TabUnderline (page-level nav) instead of pill chips. */

/* ลำดับแท็บ (มติผู้ใช้ 1 ก.ย. 69) — สามแท็บแรกคืองานประจำวันของห้องยาเรียงตาม
   ลำดับที่ทำจริง (จ่ายยา → คลัง → เบิกจ่าย) ตามด้วยทะเบียนผู้รับบริการซึ่งเป็นที่
   ค้นหาข้ามคิว แล้วปิดท้ายด้วยรายงานซึ่งเป็นการมองย้อนหลัง ไม่ใช่งานหน้าเคาน์เตอร์ */
const LINKS = [
  { key: 'queue',       label: 'คิวจ่ายยา',           path: '/pharmacy/queue'       },
  { key: 'stock',       label: 'คลังยาและเวชภัณฑ์',   path: '/pharmacy/stock'       },
  { key: 'requisition', label: 'เบิกจ่าย/รับเข้าคลัง', path: '/pharmacy/requisition' },
  { key: 'patients',    label: 'ผู้รับบริการทั้งหมด', path: '/pharmacy/patients'    },
  { key: 'reports',     label: 'รายงาน',              path: '/pharmacy/reports'     },
];

const TABS = LINKS.map(({ key, label }) => ({ key, label }));

const resolveActiveKey = (pathname) => {
  if (pathname.startsWith('/pharmacy/patients')) return 'patients';
  if (pathname.startsWith('/pharmacy/stock')) return 'stock';
  if (pathname.startsWith('/pharmacy/requisition')) return 'requisition';
  if (pathname.startsWith('/pharmacy/reports')) return 'reports';
  if (pathname.startsWith('/pharmacy/queue') || pathname === '/pharmacy' || pathname === '/pharmacy/') return 'queue';
  if (pathname.startsWith('/pharmacy/')) return 'queue';
  return 'queue';
};

/** Primary action — same SubHeader slot on every pharmacy list page. */
/* กดแล้วเปิดเป็นป๊อปอัป ไม่ใช่เปิดแท็บใหม่ไปหน้า จัดการระบบ (มติผู้ใช้ 1 ก.ย. 69)
   — เภสัชกรที่กำลังดูคิวอยู่ไม่ควรถูกเด้งออกไปอีกแท็บเพื่อเพิ่มยาหนึ่งรายการ
   ป๊อปอัปเป็นตัวเดียวกับที่ใช้แก้ทะเบียนยา (`PharmacyRegistryEditPopup` ที่ห่อ
   `PharmacyRegistryEditor variant='popup'`) จึงเป็นวิซาร์ดชุดเดียวกัน ไม่ใช่ฟอร์ม
   ชุดที่สอง · `drugId='new'` ทำให้ editor เข้าโหมดสร้างใหม่ (`isNew`) */
export const PharmacyAddDrugButton = () => {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      <BrandButton size='md' leadingIcon='add' onClick={() => setCreateOpen(true)}>
        เพิ่มทะเบียนยา
      </BrandButton>
      <PharmacyRegistryEditPopup
        open={createOpen}
        drugId='new'
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
};

/** SubHeader actions shared across every pharmacy page (ยืม–คืน–แลกล็อต + เพิ่มทะเบียนยา). */
export const PharmacyHeaderActions = ({ borrowReturnProps } = {}) => (
  <>
    <PharmacyBorrowReturnRequestButton {...borrowReturnProps} />
    <PharmacyAddDrugButton />
  </>
);

const PharmacySubNav = () => {
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

export default PharmacySubNav;
