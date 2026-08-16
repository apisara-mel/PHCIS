import React from 'react';
import Icon from '@/components/icons/Icon';

/* ข้อมูลเดิมจากบัตรประชาชนในทะเบียน — รูป + ข้อมูลหลักที่ใช้เทียบตัวตน

   แสดงเหนือแท็บวิธียืนยันในขั้น "ยืนยันตัวตนผู้รับบริการ" ของระบบจัดการ
   ความยินยอม: ไม่ว่าจะเสียบบัตร / ตรวจเอกสารแทนบัตร / สแกนลายนิ้วมือ
   เจ้าหน้าที่ต้องเห็นชุดข้อมูลเดียวกันนี้เป็นตัวตั้ง */

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
  flexShrink: 0,
};
const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const Row = ({ label, value }) => (
  <div className='flex items-start justify-between w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
    <span style={LABEL}>{label}</span>
    <span className='text-right min-w-0' style={VALUE}>{value || '—'}</span>
  </div>
);

const ConsentIdCardOnFile = ({ idCard, stacked = false }) => {
  if (!idCard) return null;

  return (
    <div
      /* stacked = คอลัมน์ซ้ายของ popup ยืนยันตัวตน (รูปอยู่บน ข้อมูลอยู่ล่าง)
         แถวเดียว = ใช้ในกล่องกว้าง ๆ */
      className={`flex w-full min-w-0 ${stacked ? 'flex-col items-center self-stretch' : 'items-start'}`}
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
        borderRadius: 'var(--dim-radius-300)',
        /* ยกการ์ดขึ้นจากพื้น popup — เป็น "หลักฐานตั้งต้น" ที่ใช้เทียบ ไม่ใช่
           กล่องข้อมูลธรรมดา (ชุดเงาเดียวกับการ์ดอื่นในระบบ) */
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* สองรูปคู่กัน — ซ้าย: รูปถ่ายในทะเบียนผู้รับบริการ · ขวา: รูปจากชิป
          บัตรประชาชน (มีฉากหลังแถบวัดส่วนสูงตามที่ DOPA ออกให้)
          เจ้าหน้าที่เทียบหน้าได้ทั้งสองแหล่งในจอเดียว */}
      <div
        className={`flex items-start ${stacked ? 'justify-center w-full' : ''}`}
        style={{ gap: 'var(--dim-space-300)' }}
      >
        {[
          { src: idCard.photoUrl, label: 'รูปถ่าย', fallbackIcon: 'person' },
          { src: idCard.idCardPhotoUrl, label: 'รูปจากบัตรประชาชน', fallbackIcon: 'badge' },
        ].map((shot) => (
          <div key={shot.label} className='flex flex-col items-center' style={{ gap: 'var(--dim-space-150)' }}>
            <div
              className='shrink-0 overflow-hidden'
              style={{
                width: stacked ? 132 : 96,
                height: stacked ? 168 : 120,
                borderRadius: 'var(--dim-radius-200)',
                background: 'var(--surface-neutral-quaternary, #F4F5F5)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              }}
            >
              {shot.src ? (
                <img
                  src={shot.src}
                  alt={`${shot.label}ของ ${idCard.fullName || 'ผู้รับบริการ'}`}
                  className='h-full w-full object-cover object-center'
                  loading='lazy'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center'>
                  <Icon name={shot.fallbackIcon} size={36} color='var(--icon-content-tertiary, #7A7F83)' />
                </div>
              )}
            </div>
            <span style={{ ...LABEL, flexShrink: 1 }}>{shot.label}</span>
          </div>
        ))}
      </div>

      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
        <span style={{ ...LABEL, color: 'var(--text-content-secondary)' }}>
          ข้อมูลเดิมจากบัตรประชาชนในทะเบียน
        </span>
        <Row label='ชื่อ-นามสกุล' value={idCard.fullName} />
        <Row label='เลขบัตรประชาชน' value={idCard.nationalId} />
        <Row label='วันเกิด' value={idCard.dob} />
        <Row label='เพศ' value={idCard.gender} />
        <Row label='HN' value={idCard.hn} />
        {idCard.address && <Row label='ที่อยู่ตามทะเบียน' value={idCard.address} />}
      </div>
    </div>
  );
};

export default ConsentIdCardOnFile;
