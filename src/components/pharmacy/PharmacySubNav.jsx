import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandButton from '@/components/button/BrandButton';
import PharmacyBorrowReturnRequestButton from '@/components/pharmacy/PharmacyBorrowReturnRequestButton';

/* Cross-links the pharmacy module pages. The Sidebar's `pharmacy` entry stays
   a flat item pointing at the queue (matches the OPD/Registration/Treatment
   convention of one direct-click destination per module). This row uses the
   design-system TabUnderline (page-level nav) instead of pill chips. */

/* "ผู้รับบริการทั้งหมด" ย้ายไปแท็บสุดท้าย (มติผู้ใช้ 1 ก.ย. 69) — สี่แท็บแรกคืองาน
   ประจำวันของห้องยา (จ่ายยา → คลัง → เบิกจ่าย → รายงาน) ส่วนทะเบียนผู้รับบริการ
   เป็นที่ค้นหาข้ามคิว เปิดเมื่อต้องการ ไม่ใช่ขั้นในเส้นทางงาน */
const LINKS = [
  { key: 'queue',       label: 'คิวจ่ายยา',           path: '/pharmacy/queue'       },
  { key: 'stock',       label: 'คลังยาและเวชภัณฑ์',   path: '/pharmacy/stock'       },
  { key: 'requisition', label: 'เบิกจ่าย/รับเข้าคลัง', path: '/pharmacy/requisition' },
  { key: 'reports',     label: 'รายงาน',              path: '/pharmacy/reports'     },
  { key: 'patients',    label: 'ผู้รับบริการทั้งหมด', path: '/pharmacy/patients'    },
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
export const PharmacyAddDrugButton = () => {
  const openCreateDrug = () => {
    window.open('/admin/pharmacy/registry/new', '_blank', 'noopener,noreferrer');
  };
  return (
    <BrandButton size='md' leadingIcon='add' onClick={openCreateDrug}>
      เพิ่มทะเบียนยา
    </BrandButton>
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
