import React, { useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import FilterTag from '@/components/forms/FilterTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SearchResultCount from '@/components/search/SearchResultCount';
import AuditRecordPanel from '@/pages/treat/panels/AuditRecordPanel';
import { MR_PATIENTS } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import AUDIT_NAV from '@/pages/audit/auditNav';
import { AUDIT_HISTORY_TABS } from '@/pages/audit/AuditHistoryTabs';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { getTreatmentAudit } from '@/data/treatmentAudit';
import AuditUsageSummary from '@/pages/audit/AuditUsageSummary';

/* ระบบประวัติการใช้งาน · ประวัติการบันทึกเวชระเบียน (ย้ายจาก Step 1 CPOE).
   EMR §1.4.3.16 — audit trail อยู่ที่นี่ (ข้อมูลลับย้ายไปจัดการระบบ) */

const breadcrumb = ['ประวัติการใช้งาน', 'ประวัติการใช้งาน'];
const MOCK_RECORD_SEARCH_HISTORY = [
  { label: 'HN 67-00001', value: '67-00001' },
  { label: 'สมชาย ใจดี', value: 'สมชาย ใจดี' },
  { label: 'HN 67-00002', value: '67-00002' },
];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const TITLE = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  lineHeight: 1.4,
};

const BODY = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};

const searchPool = MR_PATIENTS.map((p) => ({
  id: p.hn,
  label: `${p.prefixTh}${p.firstNameTh} ${p.lastNameTh}`,
  sublabel: `HN ${p.hn}`,
  value: p.hn,
  hn: p.hn,
}));

const matchPatients = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  return searchPool.filter(
    (p) => p.label.toLowerCase().includes(q) || p.hn.toLowerCase().includes(q),
  );
};

const filterPatients = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return searchPool.slice(0, 8);
  return matchPatients(query).slice(0, 12);
};

export default function AuditRecordHistoryPage() {
  const { hn: hnParam } = useParams();
  const history = useHistory();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [recordFilter, setRecordFilter] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const patient = useMemo(
    () => (hnParam ? getPatientByHN(hnParam) : getPatientByHN('67-00001')),
    [hnParam],
  );

  const suggestions = useMemo(() => filterPatients(query), [query]);
  const matchCount = useMemo(() => matchPatients(query).length, [query]);
  const exportReport = { key: 'record-history', title: 'ประวัติการบันทึกเวชระเบียน', table: { columns: [{ key: 'recordedAt', header: 'เวลาที่บันทึก' }, { key: 'by', header: 'ผู้บันทึก' }, { key: 'field', header: 'รายการที่เปลี่ยน' }, { key: 'newValue', header: 'ค่าที่บันทึก' }], rows: getTreatmentAudit() } };

  const handleSubmit = (text, item) => {
    const hn = item?.hn || item?.value || text?.trim();
    if (hn) history.push(`/audit/record-history/${hn}`);
  };

  return (
    <QueuePageShell
      activeKey='audit-log'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-log'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='ประวัติการใช้งาน'
      tabs={AUDIT_HISTORY_TABS}
      activeTab='record'
      onTabChange={(key) => history.push(AUDIT_HISTORY_TABS.find((tab) => tab.key === key)?.path || '/audit/log')}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <AuditUsageSummary />
        <section className='w-full flex flex-col' style={{ ...CARD, paddingLeft: 'var(--dim-space-400)', paddingRight: 'var(--dim-space-400)', gap: 'var(--dim-space-500)' }}>
          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='w-full flex justify-center'>
          <PrimarySearch
            placeholder='ค้นหาชื่อ / HN เช่น 67-00001'
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            suggestions={suggestions}
            history={MOCK_RECORD_SEARCH_HISTORY}
            width={640}
          />
          </div>
          <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {['ข้อมูลผู้รับบริการ', 'บันทึกการรักษา', 'แก้ไขเวชระเบียน'].map((label) => <FilterTag key={label} value={label} selected={recordFilter === label} onClick={() => setRecordFilter((v) => (v === label ? '' : label))} />)}
            <div className='flex-1' />
            <NeutralSubdueButton leadingIcon='ios_share' size='sm' onClick={() => setExportOpen(true)}>นำส่งออกรายงาน</NeutralSubdueButton>
          </div>
          {query.trim() && !patient ? (
            <SearchResultCount found={matchCount} total={searchPool.length} />
          ) : null}
          </div>

        {patient ? (
          <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
            <AuditRecordPanel patient={patient} />
          </div>
        ) : hnParam ? (
          <div className='w-full flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={TITLE}>ไม่พบ HN {hnParam}</span>
            <span style={BODY}>ตรวจสอบหมายเลข HN แล้วค้นหาใหม่</span>
          </div>
        ) : (
          <div className='w-full flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={BODY}>เลือกผู้รับบริการจากช่องค้นหาด้านบนเพื่อดูประวัติการบันทึกและแก้ไข</span>
          </div>
        )}
        </section>
      </div>
      <ExportFormatPopup open={exportOpen} report={exportReport} onClose={() => setExportOpen(false)} documentFooter='ออกเอกสารโดยระบบประวัติการใช้งาน (PHCIS)' />
    </QueuePageShell>
  );
}
