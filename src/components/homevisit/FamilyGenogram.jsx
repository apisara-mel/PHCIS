import React from 'react';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { familyMemberAvatar } from '@/data/homevisitRegistry';
import { FAMILY_HEALTH_OPTIONS } from '@/data/homevisitVisits';

/* ผังเครือญาติของครัวเรือน (Family Folder · genogram)
   ══════════════════════════════════════════════════════════════════
   ตารางบอกได้ว่า "ใครอยู่บ้านนี้บ้าง" แต่ตอบไม่ได้ทันทีว่าใครเป็นรุ่นไหนของใคร
   ทีมเยี่ยมบ้านอ่านโครงสร้างครัวเรือนจากผังเร็วกว่า (มติผู้ใช้ 2 ก.ย. 69)
   จึงสลับดูได้สองมุมมองด้วย <ViewToggle> บนหัวข้อ

   จัดผังเป็นสามรุ่นตามคำว่า "ความสัมพันธ์" ที่ทะเบียนเก็บไว้:
     รุ่นบน   — บิดา/มารดา · ญาติผู้ใหญ่
     รุ่นเดียวกัน — ผู้รับบริการ (เน้นสี) · คู่สมรส · พี่/น้อง
     รุ่นล่าง  — บุตร · หลาน
   ความสัมพันธ์ที่ไม่เข้าสามกลุ่มนี้ (เช่น ผู้ดูแล/เพื่อนบ้าน) ไปอยู่แถวล่างสุด
   ในชื่อ "สมาชิกอื่นในครัวเรือน" เพื่อไม่ให้หายไปจากผัง */

const UPPER = ['บิดา/มารดา', 'บิดา', 'มารดา', 'ปู่/ย่า', 'ตา/ยาย', 'ญาติผู้ใหญ่'];
const SAME = ['คู่สมรส', 'สามี', 'ภรรยา', 'พี่/น้อง', 'พี่', 'น้อง'];
const LOWER = ['บุตร', 'ธิดา', 'หลาน', 'เหลน'];

const healthLabel = (value) =>
  FAMILY_HEALTH_OPTIONS.find((o) => o.value === value)?.label || value || '';

/* ป้ายภาวะสุขภาพ — ใช้โทนเดียวกับป้ายในระบบ: ผู้ดูแลหลักเป็นสีเขียว
   คนที่มีโรค/พึ่งพิงเป็นสีส้ม ที่เหลือเป็นสีกลาง */
const healthTone = (value) => {
  if (value === 'caregiver') return 'green';
  if (['ncd', 'chronic', 'disability'].includes(value)) return 'orange';
  if (value === 'away' || value === 'unknown') return 'grey';
  return 'blue';
};

const CONNECTOR = 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)';

const PersonCard = ({ name, relation, age, health, avatarUrl, primary = false }) => (
  <div
    className='flex items-center'
    style={{
      gap: 'var(--dim-space-300, 12px)',
      padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
      minWidth: 232,
      borderRadius: 'var(--dim-radius-400, 12px)',
      background: primary
        ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
        : 'var(--surface-card-100, #FFFFFF)',
      border: primary
        ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
        : 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
      boxShadow: 'var(--shadow-drop-bottom-200)',
    }}
  >
    <QueuePatientAvatar name={name} avatarUrl={avatarUrl} size={40} />
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-50, 2px)' }}>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        color: primary
          ? 'var(--text-brandPrimary-default, #007549)'
          : 'var(--text-content-default, #363B3F)',
      }}>
        {name || '—'}
      </span>
      <span style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: 'var(--text-content-tertiary, #858C92)',
      }}>
        {[relation, age ? `${age} ปี` : ''].filter(Boolean).join(' · ') || '—'}
      </span>
      {health && (
        <ColorfulBadge style={healthTone(health)} size='small' hierarchy='secondary' width='hug' maxWidth={220}>
          {healthLabel(health)}
        </ColorfulBadge>
      )}
    </div>
  </div>
);

const GenerationRow = ({ label, children }) => (
  <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      color: 'var(--text-content-tertiary, #858C92)',
    }}>
      {label}
    </span>
    <div className='flex items-stretch justify-center flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {children}
    </div>
  </div>
);

/** เส้นเชื่อมระหว่างรุ่น — เส้นตั้งสั้น ๆ กลางผัง */
const Connector = () => (
  <div style={{ height: 24, borderLeft: CONNECTOR }} aria-hidden />
);

const FamilyGenogram = ({ members = [], patientName, patientHn, patientAvatarUrl }) => {
  const inGroup = (m, group) => group.some((g) => String(m.relation || '').includes(g));
  const upper = members.filter((m) => inGroup(m, UPPER));
  const same = members.filter((m) => inGroup(m, SAME));
  const lower = members.filter((m) => inGroup(m, LOWER));
  const others = members.filter((m) => !upper.includes(m) && !same.includes(m) && !lower.includes(m));

  return (
    <div
      className='flex flex-col items-center w-full'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        padding: 'var(--dim-space-600, 24px)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
        overflowX: 'auto',
      }}
    >
      {upper.length > 0 && (
        <>
          <GenerationRow label='รุ่นก่อน'>
            {upper.map((m) => (
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} />
            ))}
          </GenerationRow>
          <Connector />
        </>
      )}

      <GenerationRow label='รุ่นเดียวกัน'>
        <PersonCard
          primary
          name={patientName || 'ผู้รับบริการ'}
          relation={patientHn ? `ผู้รับบริการ · HN ${patientHn}` : 'ผู้รับบริการ'}
          avatarUrl={patientAvatarUrl}
        />
        {same.map((m) => (
          <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} />
        ))}
      </GenerationRow>

      {lower.length > 0 && (
        <>
          <Connector />
          <GenerationRow label='รุ่นถัดไป'>
            {lower.map((m) => (
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} />
            ))}
          </GenerationRow>
        </>
      )}

      {others.length > 0 && (
        <>
          <Connector />
          <GenerationRow label='สมาชิกอื่นในครัวเรือน'>
            {others.map((m) => (
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} />
            ))}
          </GenerationRow>
        </>
      )}

      {members.length === 0 && (
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          color: 'var(--text-content-secondary, #636B72)',
        }}>
          ยังไม่มีข้อมูลสมาชิกในครอบครัวในทะเบียนของครัวเรือนนี้
        </span>
      )}
    </div>
  );
};

export default FamilyGenogram;
