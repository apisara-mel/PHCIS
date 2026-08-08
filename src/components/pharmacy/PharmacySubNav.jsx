import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';
import BrandButton from '@/components/button/BrandButton';

/* Cross-links the pharmacy module pages. The Sidebar's `pharmacy` entry stays
   a flat item pointing at the queue (matches the OPD/Registration/Treatment
   convention of one direct-click destination per module). This row uses the
   design-system TabUnderline (page-level nav) instead of pill chips. */

const LINKS = [
  { key: 'queue',       label: 'คิวจ่ายยา',           path: '/pharmacy/queue'       },
  { key: 'patients',    label: 'ผู้รับบริการทั้งหมด', path: '/pharmacy/patients'    },
  { key: 'registry',    label: 'ทะเบียนยา',           path: '/pharmacy/registry'    },
  { key: 'stock',       label: 'คลังยาและเวชภัณฑ์',   path: '/pharmacy/stock'       },
  { key: 'requisition', label: 'เบิกจ่าย/รับเข้าคลัง', path: '/pharmacy/requisition' },
  { key: 'reports',     label: 'รายงาน',              path: '/pharmacy/reports'     },
];

const TABS = LINKS.map(({ key, label }) => ({ key, label }));

const resolveActiveKey = (pathname) => {
  if (pathname.startsWith('/pharmacy/patients')) return 'patients';
  if (pathname.startsWith('/pharmacy/registry')) return 'registry';
  if (pathname.startsWith('/pharmacy/stock')) return 'stock';
  if (pathname.startsWith('/pharmacy/requisition')) return 'requisition';
  if (pathname.startsWith('/pharmacy/reports')) return 'reports';
  if (pathname.startsWith('/pharmacy/queue') || pathname === '/pharmacy' || pathname === '/pharmacy/') return 'queue';
  if (pathname.startsWith('/pharmacy/')) return 'queue';
  return 'queue';
};

/** Primary action — same SubHeader slot on every pharmacy list page. */
export const PharmacyAddDrugButton = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  if (pathname === '/pharmacy/registry/new') return null;

  return (
    <BrandButton size='md' leadingIcon='add' onClick={() => history.push('/pharmacy/registry/new')}>
      เพิ่มทะเบียนยา
    </BrandButton>
  );
};

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
