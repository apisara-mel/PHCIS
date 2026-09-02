import React, { useState } from 'react';
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

/* การ์ดสมาชิก — ชี้เมาส์ค้างแล้วขึ้นรายละเอียดรายคน (มติผู้ใช้ 2 ก.ย. 69)
   ผังบอกโครงสร้างครัวเรือนได้เร็ว แต่พื้นที่ในการ์ดจำกัด รายละเอียดที่เหลือ
   (ภาวะสุขภาพเต็มข้อความ · HN ของผู้รับบริการ) จึงอยู่ในทูลทิป */
const PersonCard = ({ name, relation, age, health, avatarUrl, hn, primary = false, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const details = [
    ['ชื่อ-สกุล', name],
    ['ความสัมพันธ์', primary ? 'ผู้รับบริการ' : relation],
    ['อายุ', age ? `${age} ปี` : ''],
    ['ภาวะสุขภาพ', healthLabel(health)],
    ['HN', hn],
  ].filter(([, value]) => String(value || '').trim());

  return (
  <div
    className='flex items-center'
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onFocus={() => setHovered(true)}
    onBlur={() => setHovered(false)}
    onClick={onClick}
    onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    role={onClick ? 'button' : undefined}
    tabIndex={0}
    style={{
      position: 'relative',
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
      cursor: onClick ? 'pointer' : 'default',
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

    {hovered && details.length > 0 && (
      <div
        role='tooltip'
        className='flex flex-col'
        style={{
          position: 'absolute',
          top: 'calc(100% + var(--dim-space-200, 8px))',
          left: 0,
          zIndex: 'var(--sm-z-tooltip, 1500)',
          minWidth: 232,
          gap: 'var(--dim-space-100, 4px)',
          padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-card-100, #FFFFFF)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
      >
        {details.map(([label, value]) => (
          <div key={label} className='flex items-baseline' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary, #858C92)',
              minWidth: 84,
            }}>
              {label}
            </span>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-default, #363B3F)',
            }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
  );
};

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

const FamilyGenogram = ({ members = [], patientName, patientHn, patientAvatarUrl, onSelect, selfRow }) => {
  const inGroup = (m, group) => group.some((g) => String(m.relation || '').includes(g));
  const upper = members.filter((m) => inGroup(m, UPPER));
  const same = members.filter((m) => inGroup(m, SAME));
  const lower = members.filter((m) => inGroup(m, LOWER));
  const others = members.filter((m) => !upper.includes(m) && !same.includes(m) && !lower.includes(m));

  return (
    <div
      className='flex flex-col items-center w-full'
      /* ไม่มีกรอบ/พื้นหลังรองอีกชั้น (มติผู้ใช้ 2 ก.ย. 69) — ผังอยู่ในการ์ดขาว
         ของ Family Folder อยู่แล้ว พื้นสีเทารองทำให้เป็นกล่องซ้อนกล่อง */
      style={{
        gap: 'var(--dim-space-200, 8px)',
        overflowX: 'auto',
      }}
    >
      {upper.length > 0 && (
        <>
          <GenerationRow label='รุ่นก่อน'>
            {upper.map((m) => (
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} onClick={onSelect ? () => onSelect(m) : undefined} />
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
          hn={patientHn}
          avatarUrl={patientAvatarUrl}
          onClick={onSelect && selfRow ? () => onSelect(selfRow) : undefined}
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
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} onClick={onSelect ? () => onSelect(m) : undefined} />
            ))}
          </GenerationRow>
        </>
      )}

      {others.length > 0 && (
        <>
          <Connector />
          <GenerationRow label='สมาชิกอื่นในครัวเรือน'>
            {others.map((m) => (
              <PersonCard key={m.id} {...m} avatarUrl={familyMemberAvatar(m)} onClick={onSelect ? () => onSelect(m) : undefined} />
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
