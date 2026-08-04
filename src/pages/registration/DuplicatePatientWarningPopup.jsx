import React from 'react';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';

/* MIH DuplicatePatientWarningPopup — TOR 1.1.1.5: ระบบแจ้งเตือนเมื่อพบ
   ชื่อ-นามสกุลซ้ำกับทะเบียนเดิม ก่อนบันทึก. Lists every colliding record
   (รูปโปรไฟล์ · วันเดือนปีเกิด · HN). "ยืนยันดำเนินการต่อ" is audited by
   the host ({confirmedBy, timestamp, matchedHNs} → RegistrationEditHistoryPanel);
   "ยกเลิก" returns to the form without saving. Exact-CID duplicates stay
   hard-blocked upstream (1.1.1.4 — unchanged).

   Module-owned popup (src/pages/registration) per playbook §4. */

/* หน้าที่เดียวของ popup นี้คือให้เจ้าหน้าที่แยกคนชื่อซ้ำออกจากกันด้วยสายตา
   ดังนั้นรูป/ตัวย่อ ต้องมาจาก "แถวที่แสดงอยู่" เท่านั้น — ห้าม cross-reference
   patientProfiles ด้วย HN เพราะ MR_PATIENTS (แหล่งของ matches) กับ
   patientProfiles ให้ชื่อคนละคนใน HN เดียวกัน (เช่น 67-00001, 67-00009)
   ทำให้รูปกับชื่อในแถวเดียวกันเป็นคนละคน. */
const MatchRow = ({ match }) => {
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
        background: 'var(--surface-neutral-quaternary, #F9FBFB)',
      }}
    >
      <QueuePatientAvatar
        name={match.fullName}
        hn={match.hn}
        avatarUrl={match.photoUrl}
        size={40}
      />
      <div className='flex flex-col flex-1 min-w-0'>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          color: 'var(--text-content-default, #363B3F)',
          lineHeight: 1.5,
        }}>
          {match.fullName}
        </span>
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-tertiary, #858C92)',
          lineHeight: 1.5,
        }}>
          วันเดือนปีเกิด: {match.dob || '—'}
        </span>
      </div>
      <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
        HN {match.hn}
      </ColorfulBadge>
    </div>
  );
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {Array<{hn:string, fullName:string, dob:string, photoUrl?:string}>} props.matches
 *   — `photoUrl` (ถ้ามี) ต้องมาจากทะเบียนเดียวกับ `fullName` เท่านั้น
 * @param {string} props.typedName — the name the receptionist typed
 * @param {() => void} props.onConfirm — audited "ยืนยันดำเนินการต่อ"
 * @param {() => void} props.onCancel  — back to the form, nothing saved
 */
const DuplicatePatientWarningPopup = ({
  open,
  matches = [],
  typedName = '',
  onConfirm,
  onCancel,
}) => (
  <Popup
    open={open}
    onClose={onCancel}
    title='พบชื่อ-นามสกุลซ้ำในทะเบียน'
    subtitle={`"${typedName}" ตรงกับผู้รับบริการเดิม ${matches.length} ราย — ตรวจสอบก่อนดำเนินการต่อ`}
    size='large'
    secondaryAction={{ label: 'ยกเลิก', onClick: onCancel }}
    primaryAction={{ label: 'ยืนยันดำเนินการต่อ', onClick: onConfirm }}
  >
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Alert
        type='warning'
        title='อาจเป็นบุคคลเดียวกับทะเบียนเดิม'
        subtext='หากยืนยันดำเนินการต่อ ระบบจะบันทึกผู้ยืนยัน วันเวลา และ HN ที่ชนไว้ในประวัติการแก้ไขข้อมูล (audit trail) ทุกครั้ง'
        showCloseButton={false}
        showBadge={false}
        showIndicator={false}
        style={{ width: '100%' }}
      />
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {matches.map((m) => <MatchRow key={m.hn} match={m} />)}
      </div>
    </div>
  </Popup>
);

export default DuplicatePatientWarningPopup;
