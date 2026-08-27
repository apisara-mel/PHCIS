import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';

/* Cross-links the §1.20 dashboard / report-platform pages. Same convention as
   PharmacySubNav: the Sidebar keeps one flat `dashboard` entry pointing at the
   hospital overview, and this row (design-system TabUnderline, page-level nav)
   moves between the report screens. */

export const DASHBOARD_NAV_LINKS = [
  { key: 'overview',  label: 'ภาพรวมโรงพยาบาล',   path: '/dashboard'                    },
  { key: 'pharmacy',  label: 'รายงานเภสัชกรรม',    path: '/dashboard/reports/pharmacy'   },
  { key: 'checkup',   label: 'รายงานตรวจสุขภาพ',   path: '/dashboard/reports/checkup'    },
  { key: 'clinics',   label: 'คลินิกพิเศษ',        path: '/dashboard/clinics'            },
  { key: 'executive', label: 'ผู้บริหาร',           path: '/dashboard/executive'          },
];

const TABS = DASHBOARD_NAV_LINKS.map(({ key, label }) => ({ key, label }));

export const resolveDashboardNavKey = (pathname = '') => {
  if (pathname.startsWith('/dashboard/reports/service')) return 'service';
  if (pathname.startsWith('/dashboard/reports/pharmacy')) return 'pharmacy';
  if (pathname.startsWith('/dashboard/reports/checkup')) return 'checkup';
  /* ศูนย์รวมรายงานไม่มี tab แล้ว (มติผู้ใช้ 27 ส.ค. 69) — เข้าจาก dropdown
     "ดูรายงานทั้งหมด" แทน · คืนค่า 'reports' ต่อไปเพื่อให้ไม่มี tab ไหนถูก
     ไฮไลต์ผิดขณะอยู่หน้านั้น */
  if (pathname.startsWith('/dashboard/reports')) return 'reports';
  if (pathname.startsWith('/dashboard/clinics')) return 'clinics';
  if (pathname.startsWith('/dashboard/executive')) return 'executive';
  return 'overview';
};

const DashboardSubNav = () => {
  const history = useHistory();
  const location = useLocation();
  const activeKey = resolveDashboardNavKey(location.pathname);

  return (
    <TabUnderline
      tabs={TABS}
      value={activeKey}
      morphOnScroll
      onChange={(key) => {
        const link = DASHBOARD_NAV_LINKS.find((l) => l.key === key);
        if (link) history.push(link.path);
      }}
      style={{ gap: 'var(--dim-space-0)' }}
    />
  );
};

export default DashboardSubNav;
