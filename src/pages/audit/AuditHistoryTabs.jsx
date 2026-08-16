import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TabUnderline from '@/components/tab/TabUnderline';

export const AUDIT_HISTORY_TABS = [
  { key: 'activity', label: 'ประวัติการใช้งานทั้งหมด', path: '/audit/log' },
  { key: 'record', label: 'ประวัติการบันทึกเวชระเบียน', path: '/audit/record-history' },
  { key: 'pii', label: 'ประวัติการเข้าถึงข้อมูลส่วนบุคคล', path: '/audit/pii-access' },
  { key: 'opd', label: 'OPD / ตรวจรักษา', path: '/audit/log?system=opd' },
  { key: 'pharm', label: 'ห้องยา', path: '/audit/log?system=pharm' },
  { key: 'lab', label: 'ห้องปฏิบัติการ', path: '/audit/log?system=lab' },
  { key: 'xray', label: 'X-ray', path: '/audit/log?system=xray' },
  { key: 'finance', label: 'การเงิน / เคลม', path: '/audit/log?system=finance' },
  { key: 'telemed', label: 'Telemedicine', path: '/audit/log?system=telemed' },
];

export default function AuditHistoryTabs() {
  const history = useHistory();
  const location = useLocation();
  const active = location.pathname.startsWith('/audit/record-history')
    ? 'record'
    : location.pathname.startsWith('/audit/pii-access') ? 'pii' : new URLSearchParams(location.search).get('system') || 'activity';

  return (
    <TabUnderline
      tabs={AUDIT_HISTORY_TABS}
      value={active}
      disableOverflow
      onChange={(key) => history.push(AUDIT_HISTORY_TABS.find((tab) => tab.key === key)?.path || '/audit/log')}
      style={{ width: '100%', overflowX: 'auto' }}
    />
  );
}
