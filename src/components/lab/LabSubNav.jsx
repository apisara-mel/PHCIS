import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';

/* Cross-links the lab module pages — same pattern as PharmacySubNav.
   Sidebar `lab` stays a flat item pointing at the queue; this row is the
   page-level TabUnderline nav. Labels match the lab menu list.

   ทะเบียนรายการตรวจ is deliberately absent — it moved to จัดการระบบ
   (/admin/lab/registry) on 28 ส.ค. 69: master data the admin owns, not a
   screen the bench switches to mid-shift. */

const LINKS = [
  { key: 'queue',     label: 'คิวห้องปฏิบัติการ',                   path: '/lab/queue'     },
  { key: 'order',     label: 'บันทึกส่งตรวจ',                       path: '/lab/order'     },
  { key: 'receive',   label: 'สถานีรับสิ่งส่งตรวจ',                  path: '/lab/receive'   },
  { key: 'send-out',  label: 'ส่งตรวจภายนอก (Lab-out)',             path: '/lab/send-out'  },
  { key: 'interface', label: 'เชื่อมต่อ LIS และเครื่องตรวจวิเคราะห์', path: '/lab/interface' },
];

const TABS = LINKS.map(({ key, label }) => ({ key, label }));

const resolveActiveKey = (pathname) => {
  if (pathname.startsWith('/lab/order')) return 'order';
  if (pathname.startsWith('/lab/receive')) return 'receive';
  if (pathname.startsWith('/lab/send-out')) return 'send-out';
  if (pathname.startsWith('/lab/interface')) return 'interface';
  if (pathname.startsWith('/lab/queue') || pathname === '/lab' || pathname === '/lab/') return 'queue';
  /* Secondary screens (report / history) — keep queue highlighted. */
  if (pathname.startsWith('/lab/')) return 'queue';
  return 'queue';
};

const LabSubNav = () => {
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

export default LabSubNav;
