import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import AuditRecordPanel from '@/pages/treat/panels/AuditRecordPanel';
import { MR_PATIENTS } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import AUDIT_NAV from '@/pages/audit/auditNav';

/* ระบบประวัติการใช้งาน · ประวัติการบันทึกเวชระเบียน (ย้ายจาก Step 1 CPOE).
   EMR §1.4.3.16 — audit trail อยู่ที่นี่ (ข้อมูลลับย้ายไปจัดการระบบ) */

const breadcrumb = ['ประวัติการใช้งาน', 'ประวัติการบันทึกเวชระเบียน'];

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
  const [query, setQuery] = useState('');

  const patient = useMemo(
    () => (hnParam ? getPatientByHN(hnParam) : null),
    [hnParam],
  );

  const suggestions = useMemo(() => filterPatients(query), [query]);
  const matchCount = useMemo(() => matchPatients(query).length, [query]);

  const handleSubmit = (text, item) => {
    const hn = item?.hn || item?.value || text?.trim();
    if (hn) history.push(`/audit/record-history/${hn}`);
  };

  return (
    <QueuePageShell
      activeKey='audit-record-history'
      sidebarItems={AUDIT_NAV}
      sidebarFallbackKey='audit-record-history'
      brandTitle='ระบบประวัติการใช้งาน'
      breadcrumb={breadcrumb}
      title='ประวัติการบันทึกเวชระเบียน'
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={TITLE}>ค้นหาผู้รับบริการ</span>
            <span style={BODY}>
              ประวัติการบันทึกและแก้ไขของเวชระเบียน — การจัดการข้อมูลลับอยู่ที่ จัดการระบบ › การจัดการข้อมูลลับ
            </span>
          </div>
          <PrimarySearch
            placeholder='ค้นหาชื่อ / HN เช่น 67-00001'
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            suggestions={suggestions}
            width={640}
          />
          {query.trim() && !patient ? (
            <SearchResultCount found={matchCount} total={searchPool.length} />
          ) : null}
        </section>

        {patient ? (
          <>
            <PatientSummaryCard
              avatarUrl={patient.avatarUrl}
              avatarAlt={patient.fullName}
              cells={[
                { label: 'ชื่อ-นามสกุล', value: patient.fullName },
                { label: 'HN', value: patient.hn },
                { label: 'สิทธิการรักษา', value: patient.insurance || '—' },
              ]}
            />
            <AuditRecordPanel patient={patient} />
          </>
        ) : hnParam ? (
          <section className='w-full flex flex-col items-center text-center' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
            <span style={TITLE}>ไม่พบ HN {hnParam}</span>
            <span style={BODY}>ตรวจสอบหมายเลข HN แล้วค้นหาใหม่</span>
          </section>
        ) : (
          <section className='w-full flex flex-col items-center text-center' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
            <span style={BODY}>เลือกผู้รับบริการจากช่องค้นหาด้านบนเพื่อดูประวัติการบันทึกและแก้ไข</span>
          </section>
        )}
      </div>
    </QueuePageShell>
  );
}
