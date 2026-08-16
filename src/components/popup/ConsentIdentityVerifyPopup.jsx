import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import ConsentIdentityVerifyPanel from '@/components/consent/ConsentIdentityVerifyPanel';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { formatNationalId, ID_CARD_CHIP_PHOTO_MOCK } from '@/data/registrationForm';
import { findMrPatientByHn } from '@/data/mrPatients';

/* ConsentIdentityVerifyPopup — TOR ด.1.1.1 (ฝั่งระบบ Consent).

   บังคับยืนยันตัวตน "เจ้าของข้อมูลส่วนบุคคล" ก่อนทุก action ที่เจ้าหน้าที่
   ทำแทนเจ้าของข้อมูล (เพิกถอน / บันทึกจากเอกสาร / แก้ไขความยินยอม /
   อนุมัติ-แก้สิทธิเข้าถึง).

   14 ส.ค. 2569: เปลี่ยนจากชุดเดิม (เลขบัตร 13 หลัก + OTP / แนบสำเนาเอกสาร)
   มาใช้ `ConsentIdentityVerifyPanel` — แผงเดียวกับขั้นยืนยันตัวตนก่อนกรอก
   แบบฟอร์มทุกทางเข้าของโมดูล Consent:
     • ตัวเลือกผู้ให้ความยินยอม (ผู้รับบริการเอง / ผู้ปกครองแทนบุตร)
     • pill tab 3 วิธี — เสียบบัตร / เอกสารแทนบัตร / สแกนลายนิ้วมือ
     • คอลัมน์ซ้ายโชว์ข้อมูลบัตรประชาชนในทะเบียนของผู้รับบริการรายนั้น
   ผ่านแล้วกด "ต่อไป" → onVerified({ method, methodText, subject,
   subjectLabel, verifiedAt }) ให้ผู้เรียกเก็บ audit ต่อ (TOR 1.4.3.16).

   การพิสูจน์ตัวตนจริง (เครื่องอ่านบัตร / เครื่องสแกนนิ้ว) เป็นงาน backend —
   ที่นี่คือ mock ระดับ UI ชุดเดียวกับหน้าอื่น */

const IDENTITY_IDLE = {
  verifiedAt: null,
  method: null,
  methodText: '',
  reading: false,
  subject: 'self',
  subjectLabel: '',
};

/** Strip legacy callers that embed HN in patientName ("ชื่อ · HN …"). */
const patientNameFallback = (raw = '') => {
  const dotHn = raw.indexOf('·');
  if (dotHn >= 0) return raw.slice(0, dotHn).trim();
  return raw.replace(/^ผู้รับบริการ\s*/u, '').trim();
};

export default function ConsentIdentityVerifyPopup({
  open,
  onClose,
  onVerified,
  /* บริบทของ action ที่กำลังทำแทนเจ้าของข้อมูล — แสดงในหัว popup */
  actionLabel = 'ดำเนินการแทนเจ้าของข้อมูล',
  patientName,
  hn,
}) {
  /* กระจกสถานะจากแผงยืนยัน — state จริงอยู่ใน ConsentIdentityVerifyPanel */
  const [identity, setIdentity] = useState(IDENTITY_IDLE);

  useEffect(() => {
    if (!open) setIdentity(IDENTITY_IDLE);
  }, [open]);

  /* ข้อมูลบัตรประชาชนในทะเบียน — คอลัมน์ซ้ายของแผง (ชุดเดียวกับ
     ConsentRequestFormsPopup) · ไม่รู้ตัวผู้รับบริการ = แผงคอลัมน์เดียว */
  const idCardOnFile = useMemo(() => {
    if (!hn) return null;
    const name = patientNameFallback(patientName || '');
    const card = resolveConsentPatientCard(hn, name);
    const mr = findMrPatientByHn(hn);
    const addr = mr?.address;
    return {
      photoUrl: card?.avatarUrl || '',
      idCardPhotoUrl: ID_CARD_CHIP_PHOTO_MOCK,
      fullName: card?.fullName
        || [mr?.prefixTh, mr?.firstNameTh, mr?.lastNameTh].filter(Boolean).join(' ')
        || name,
      nationalId: mr?.nationalId ? formatNationalId(mr.nationalId) : '',
      dob: mr?.dob || '',
      gender: mr?.gender || '',
      hn,
      address: addr
        ? [addr.houseNo, addr.moo && `หมู่ ${addr.moo}`, addr.road, addr.subdistrict, addr.district, addr.province, addr.zip]
          .filter(Boolean).join(' ')
        : '',
    };
  }, [hn, patientName]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      /* สูงตาม content เหมือนขั้นยืนยันตัวตนของ popup กรอกแบบฟอร์ม */
      size='large'
      width={idCardOnFile ? 1040 : 720}
      title='ยืนยันตัวตนผู้รับบริการ'
      subtitle={`ยืนยันตัวตนก่อน: ${actionLabel}`}
      primaryAction={{
        label: 'ต่อไป',
        onClick: () => onVerified?.({
          method: identity.method,
          methodText: identity.methodText,
          subject: identity.subject,
          subjectLabel: identity.subjectLabel,
          verifiedAt: identity.verifiedAt,
        }),
        disabled: !identity.verifiedAt || identity.reading,
      }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose, disabled: identity.reading }}
    >
      {open && (
        <ConsentIdentityVerifyPanel
          idCard={idCardOnFile}
          /* ประโยคในกล่องวิธียืนยัน — ที่นี่ไม่ใช่ขั้น "กรอกฟอร์ม" */
          contextText={`ยืนยันตัวตนก่อน${actionLabel}`}
          onChange={setIdentity}
        />
      )}
    </Popup>
  );
}
