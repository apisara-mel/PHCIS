import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import ConfidentialDataPanel from '@/pages/treat/panels/ConfidentialDataPanel';
import { MR_PATIENTS } from '@/data/mrPatients';
import { getPatientByHN } from '@/data/patientProfiles';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* ระบบจัดการระบบ · การจัดการข้อมูลลับ (EMR §1.4.2.1).
   ย้ายจาก ระบบประวัติการใช้งาน (/audit/record-history). */

const breadcrumb = ['จัดการระบบ', 'การจัดการข้อมูลลับ'];

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

const filterPatients = (query) => {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return searchPool.slice(0, 8);
  return searchPool.filter(
    (p) => p.label.toLowerCase().includes(q) || p.hn.toLowerCase().includes(q),
  ).slice(0, 12);
};

export default function SystemConfidentialDataPage() {
  const { hn: hnParam } = useParams();
  const history = useHistory();
  const [query, setQuery] = useState('');

  const patient = useMemo(
    () => (hnParam ? getPatientByHN(hnParam) : null),
    [hnParam],
  );

  const suggestions = useMemo(() => filterPatients(query), [query]);

  const handleSubmit = (text, item) => {
    const hn = item?.hn || item?.value || text?.trim();
    if (hn) history.push(`/admin/confidential-data/${hn}`);
  };

  return (
    <QueuePageShell
      activeKey='system-confidential-data'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-confidential-data'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='การจัดการข้อมูลลับ'
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={TITLE}>ค้นหาผู้รับบริการ</span>
            <span style={BODY}>
              จัดการรายการข้อมูลลับ (masking · ขอเปิดดู · บันทึกการเข้าถึง) ตามข้อกำหนด §1.4.2 — ย้ายจากระบบประวัติการใช้งานมาอยู่ที่จัดการระบบ
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
            <ConfidentialDataPanel patient={patient} />
          </>
        ) : hnParam ? (
          <section className='w-full flex flex-col items-center text-center' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
            <span style={TITLE}>ไม่พบ HN {hnParam}</span>
            <span style={BODY}>ตรวจสอบหมายเลข HN แล้วค้นหาใหม่</span>
          </section>
        ) : (
          <section className='w-full flex flex-col items-center text-center' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
            <span style={BODY}>เลือกผู้รับบริการจากช่องค้นหาด้านบนเพื่อจัดการข้อมูลลับ</span>
          </section>
        )}
      </div>
    </QueuePageShell>
  );
}
