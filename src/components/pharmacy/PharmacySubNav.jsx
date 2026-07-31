import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';

/* Cross-links the pharmacy module pages. The Sidebar's `pharmacy` entry stays
   a flat item pointing at the queue (matches the OPD/Registration/Treatment
   convention of one direct-click destination per module). This row uses the
   design-system TabUnderline (page-level nav) instead of pill chips. */

const LINKS = [
  { key: 'queue',       label: 'คิวจ่ายยา',           path: '/pharmacy/queue'       },
  { key: 'registry',    label: 'ทะเบียนยา',           path: '/pharmacy/registry'    },
  { key: 'stock',       label: 'คลังยาและเวชภัณฑ์',   path: '/pharmacy/stock'       },
  { key: 'requisition', label: 'เบิกจ่าย/รับเข้าคลัง', path: '/pharmacy/requisition' },
  { key: 'history',     label: 'ประวัติการรับยา',     path: '/pharmacy/history'     },
  { key: 'reports',     label: 'รายงาน',              path: '/pharmacy/reports'     },
];

const TABS = LINKS.map(({ key, label }) => ({ key, label }));

const PharmacySubNav = () => {
  const history = useHistory();
  const location = useLocation();

  const activeKey = LINKS.find((l) => location.pathname.startsWith(l.path))?.key
    || LINKS[0].key;

  return (
    <TabUnderline
      tabs={TABS}
      value={activeKey}
      onChange={(key) => {
        const link = LINKS.find((l) => l.key === key);
        if (link) history.push(link.path);
      }}
      style={{ gap: 'var(--dim-space-0)' }}
    />
  );
};

export default PharmacySubNav;
