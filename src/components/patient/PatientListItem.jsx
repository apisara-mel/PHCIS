import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import QueuePatientAvatar from '@/components/patient/QueuePatientAvatar';

/* MIH PatientListItem — แถว "ผู้รับบริการ" มาตรฐานของระบบ

   ทุกที่ที่ค้นหาผู้รับบริการต้องแสดงด้วยแถวนี้ (มติผู้ใช้ 27 ส.ค. 69) — เดิม
   แต่ละหน้าประกอบ badge/รูป/ชื่อ เองในผลค้นหา ทำให้ลำดับและระยะไม่ตรงกัน

   ลำดับตายตัว:  เลขคิว → เลขHN → รูป Profile → ชื่อ (+ บรรทัดรอง)

   **เลขคิวแสดงหรือซ่อนขึ้นกับ context ของหน้า** — หน้าที่ทำงานกับคิว (เวชระเบียน,
   ห้องตรวจ, คัดกรอง) ส่ง `queue` มาด้วย · หน้าที่ไม่มีคิว (ทะเบียนผู้รับบริการ,
   ความยินยอม, ค้นหาข้ามระบบ) ไม่ต้องส่ง แถวจะยุบช่องเลขคิวไปเอง ไม่เว้นที่ว่างไว้

   เลขคิวใช้ badge teal · HN ใช้ indigo — โทนเดียวกับคอลัมน์ในตาราง worklist

   `renderText` ให้ผู้เรียกครอบข้อความได้ (เช่น highlight คำที่ค้นเจอในผลค้นหา)
   ค่าเริ่มต้นคือแสดงข้อความตรง ๆ */

const AVATAR_SIZE = 32;

const PatientListItem = ({
  /** เลขคิว — ไม่ส่ง = หน้านี้ไม่มี context เรื่องคิว แถวจะไม่มีช่องนี้ */
  queue,
  hn,
  name,
  /** บรรทัดรอง เช่น "เลขบัตร 1369900526072" */
  sublabel,
  avatarUrl,
  /** ยังไม่รู้ตัวตน → silhouette "ผู้ใช้ใหม่" */
  newUser = false,
  /** (text, key) => ReactNode — ใช้ highlight คำค้น */
  renderText,
  /** ต่อท้ายแถว เช่น chevron ของผลค้นหา */
  trailing,
  className = '',
  style,
}) => {
  const text = (value, key) => (renderText ? renderText(value, key) : value);
  return (
    <span
      className={`flex items-center min-w-0 w-full ${className}`}
      style={{ gap: 'var(--dim-space-200, 8px)', ...style }}
    >
      {queue && (
        <span className='shrink-0'>
          <ColorfulBadge style='teal' size='small' width='hug' hierarchy='secondary'>
            {queue}
          </ColorfulBadge>
        </span>
      )}
      {hn && (
        <span className='shrink-0'>
          <ColorfulBadge style='indigo' size='small' width='hug' hierarchy='secondary'>
            {hn}
          </ColorfulBadge>
        </span>
      )}
      <QueuePatientAvatar
        name={name}
        hn={hn}
        avatarUrl={avatarUrl}
        newUser={newUser}
        size={AVATAR_SIZE}
      />
      <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
        <span
          className='truncate'
          style={{
            color: 'inherit',
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-regular, 400)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}
        >
          {text(name, 'name')}
        </span>
        {sublabel && (
          <span
            className='mih-search-row__sublabel truncate'
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            {text(sublabel, 'sub')}
          </span>
        )}
      </span>
      {trailing}
    </span>
  );
};

export default PatientListItem;
