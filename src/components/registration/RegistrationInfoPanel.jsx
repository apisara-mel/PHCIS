import React from 'react';
import { SectionTitle, SubCard } from '@/components/forms/Fields';
import {
  getRegistrationHandoff,
  handoffFlagLines,
} from '@/data/registrationHandoff';

/* "ข้อมูลจากเวชระเบียน" ที่จุดคัดกรอง — ทุกอย่างที่ห้องบัตรบันทึกไว้ต้องมาโผล่
   ที่นี่ **ยกเว้น** ข้อมูลส่วนตัว · ที่อยู่ · ข้อมูลการติดต่อ (มติผู้ใช้ 29 ส.ค. 69)

   ทั้งการ์ดเป็น *ข้อความอ่านอย่างเดียว* — จุดคัดกรองแก้สิทธิการรักษาเองไม่ได้
   (ของจริงเปิด/ปิดสิทธิทำที่ห้องบัตรและห้องเงิน) การแก้ไขทำที่หน้าเวชระเบียน */

const Row = ({ label, value }) => (
  <div
    className='flex flex-wrap w-full'
    style={{ gap: 'var(--dim-space-200)', alignItems: 'baseline' }}
  >
    <span
      style={{
        minWidth: 180,
        color: 'var(--text-content-subtle, #6B7280)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.6,
      }}
    >
      {label}
    </span>
    <span
      style={{
        flex: '1 1 240px',
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.6,
        whiteSpace: 'pre-line',
      }}
    >
      {value || '—'}
    </span>
  </div>
);

const RegistrationInfoPanel = ({ patient }) => {
  const hn = patient?.hn || '';
  const handoff = getRegistrationHandoff(hn);

  if (!handoff) return null;

  const rights = handoff.rights || [];
  const flagLines = handoffFlagLines(handoff);
  const homeVisit = handoff.registryKey === 'home-visit';

  /* ทุกบรรทัดไหลใน 2 คอลัมน์ (มติผู้ใช้ 29 ส.ค. 69) — การ์ดนี้อ่านอย่างเดียว
     บรรทัดสั้น การเรียงคอลัมน์เดียวเต็มความกว้างทำให้ค่าอยู่ห่างจากชื่อรายการมาก
     และการ์ดยาวเกินจำเป็น · ใช้ `mih-field-grid` เพื่อยุบเหลือคอลัมน์เดียวเองบนจอแคบ */
  const rows = [
    ...(rights.length > 0
      ? rights.map((g) => ({
        label: g.title,
        value: [g.primary, g.role && `(${g.role})`].filter(Boolean).join(' '),
      }))
      : [{ label: 'สิทธิการรักษา', value: '' }]),
    ...(homeVisit
      ? [
        { label: 'ประเภทผู้รับบริการ 6 กลุ่ม', value: handoff.patientGroup },
        { label: 'ประเภทรับ–ส่งต่อ', value: handoff.homevisitIntake },
      ]
      : []),
    {
      label: homeVisit ? 'การเคลื่อนไหว' : 'สภาพที่มาใช้บริการ',
      value: handoff.mobility,
    },
    ...(flagLines.length > 0
      ? flagLines
      : [{ label: 'หมายเหตุและ Flag', value: 'ไม่มีข้อควรระวังที่เวชระเบียนบันทึกไว้' }]),
  ];

  return (
    /* พื้นหลังเทาอ่อน — บล็อกอ่านอย่างเดียวที่ยกมาจากอีกหน้าหนึ่ง ไม่ใช่การ์ดขาว
       ที่กรอกได้เหมือนฟอร์มรอบข้าง (มติผู้ใช้ 29 ส.ค. 69) */
    <SubCard surfaceTone='neutral'>
      {/* ชื่อรายการทุกบรรทัดยกมาจากหน้าลงทะเบียนตัวต่อตัว — ต้องเป็นคำเดียวกับที่
          ห้องบัตรเห็น ไม่งั้นคนที่อ่านสองหน้าต่อกันต้องแปลศัพท์เอง */}
      <SectionTitle icon='badge'>ข้อมูลจากเวชระเบียน</SectionTitle>

      <div
        className='w-full mih-field-grid'
        style={{
          display: 'grid',
          '--field-grid-cols': 2,
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          rowGap: 'var(--dim-space-200)',
          columnGap: 'var(--dim-space-600, 24px)',
        }}
      >
        {rows.map((r) => <Row key={r.label} label={r.label} value={r.value} />)}
      </div>
    </SubCard>
  );
};

export default RegistrationInfoPanel;
