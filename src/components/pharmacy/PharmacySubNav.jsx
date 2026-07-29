import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

/* Cross-links the pharmacy module's four pages (queue/registry/stock/
   requisition). The Sidebar's `pharmacy` entry stays a flat item pointing
   at the queue (matches the OPD/Registration/Treatment convention of one
   direct-click destination per module) rather than growing a `subItems`
   flyout — this row is the simpler, lower-risk way to make the other
   three pages discoverable, per the plan's own fallback note. */

const LINKS = [
  { label: 'คิวจ่ายยา',           path: '/pharmacy/queue'       },
  { label: 'ทะเบียนยา',           path: '/pharmacy/registry'    },
  { label: 'คลังยาและเวชภัณฑ์',   path: '/pharmacy/stock'       },
  { label: 'เบิกจ่าย/รับเข้าคลัง', path: '/pharmacy/requisition' },
  { label: 'ประวัติการรับยา',     path: '/pharmacy/history'     },
  { label: 'รายงาน',              path: '/pharmacy/reports'     },
];

const PharmacySubNav = () => {
  const history = useHistory();
  const location = useLocation();
  return (
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
      {LINKS.map((l) => {
        const active = location.pathname.startsWith(l.path);
        return (
          <button
            key={l.path}
            type='button'
            onClick={() => history.push(l.path)}
            className='inline-flex items-center'
            style={{
              height: 'var(--dim-size-600, 32px)',
              padding: '0 var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-full)',
              background: active ? 'var(--surface-brandPrimary-quaternary)' : 'transparent',
              border: `var(--dim-stroke-100) solid ${active ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
              color: active ? 'var(--text-brandPrimary-default)' : 'var(--text-content-secondary)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: active ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
              cursor: 'pointer',
            }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
};

export default PharmacySubNav;
