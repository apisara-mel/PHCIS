import React, { useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import TabUnderline from '@/components/tab/TabUnderline';
import InputField from '@/components/forms/InputField';
import OtpInput from '@/components/forms/OtpInput';
import Select from '@/components/forms/Select';
import FileUploadField from '@/components/forms/FileUploadField';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';

/* ConsentIdentityVerifyPopup — TOR ด.1.1.1 (ฝั่งระบบ Consent).

   บังคับพิสูจน์ตัวตน "เจ้าของข้อมูลส่วนบุคคล" ก่อนทุก action ที่เจ้าหน้าที่
   ทำแทนเจ้าของข้อมูล (เพิกถอน / บันทึกจากเอกสาร / แก้ไขความยินยอม /
   อนุมัติ-แก้สิทธิเข้าถึง). ฝั่ง /login มี Thai ID + OTP อยู่แล้ว — popup นี้
   คือเวอร์ชันในเนื้องานของเจ้าหน้าที่.

   2 เส้นทาง (แท็บ):
     1) เลขบัตรประชาชน 13 หลัก (ตรวจ checksum) + OTP มือถือ (mock ส่ง /
        นับถอยหลัง / ส่งใหม่ / ผิดเกิน 3 ครั้ง → lock ชั่วคราว เสนอเส้นทางเอกสาร)
     2) เอกสารยืนยันตัวตน — แนบสำเนาบัตร (เส้นทางผู้ไม่มีมือถือ) + ระบุความ
        สัมพันธ์กรณีผู้แทน/ผู้เยาว์ (สอดคล้อง guardian record เดิม)

   ผ่านแล้วเรียก onVerified({ method, citizenId, relationship, verifiedBy,
   verifiedAt }) เพื่อให้ผู้เรียกเก็บ audit ต่อ (TOR 1.4.3.16).

   หมายเหตุ: การพิสูจน์ตัวตนจริง (DOPA/ThaID) เป็นงาน backend — ที่นี่คือ
   mock ระดับ UI. ยังไม่มีใน MIH DS — integrator ลงทะเบียน awaiting-components
   ผ่าน manifest (ห้าม builder แก้ไฟล์ทะเบียนเอง). */

const MOCK_OTP = '123456';
const MAX_ATTEMPTS = 3;
const RESEND_SECONDS = 30;
const STAFF_NAME = 'ลดา ดีงาม';

const TABS = [
  { key: 'otp', label: 'บัตรประชาชน + OTP', icon: 'smartphone' },
  { key: 'document', label: 'เอกสารยืนยันตัวตน', icon: 'upload_file' },
];

const RELATION_OPTIONS = [
  { value: 'self',     label: 'เจ้าของข้อมูล (มาด้วยตนเอง)' },
  { value: 'father',   label: 'บิดา (กรณีผู้เยาว์)' },
  { value: 'mother',   label: 'มารดา (กรณีผู้เยาว์)' },
  { value: 'guardian', label: 'ผู้ปกครองตามกฎหมาย' },
  { value: 'curator',  label: 'ผู้อนุบาล / ผู้พิทักษ์' },
];

/* Thai citizen-id checksum: sum(d[i] * (13 - i)) i=0..11, (11 - sum%11) % 10 === d[12] */
const validThaiId = (digits) => {
  if (!/^\d{13}$/.test(digits)) return false;
  const sum = digits.slice(0, 12).split('').reduce((acc, d, i) => acc + Number(d) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
};

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const HINT_TEXT = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };

const nowThai = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

export default function ConsentIdentityVerifyPopup({
  open,
  onClose,
  onVerified,
  /* บริบทของ action ที่กำลังทำแทนเจ้าของข้อมูล — แสดงในหัว popup */
  actionLabel = 'ดำเนินการแทนเจ้าของข้อมูล',
  patientName,
  hn,
}) {
  const [tab, setTab] = useState('otp');
  const [citizenId, setCitizenId] = useState('');
  const [idError, setIdError] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  /* document path */
  const [docFile, setDocFile] = useState(null);
  const [docError, setDocError] = useState('');
  const [relationship, setRelationship] = useState('');

  /* reset ทุกครั้งที่เปิดใหม่ */
  useEffect(() => {
    if (!open) return;
    setTab('otp'); setCitizenId(''); setIdError('');
    setOtpSent(false); setOtp(''); setOtpError('');
    setAttempts(0); setLocked(false); setCountdown(0);
    setDocFile(null); setDocError(''); setRelationship('');
  }, [open]);

  /* countdown ปุ่มส่ง OTP ใหม่ */
  useEffect(() => {
    if (countdown <= 0) return undefined;
    timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  const digits = citizenId.replace(/\D/g, '');

  const sendOtp = () => {
    if (!validThaiId(digits)) {
      setIdError(digits.length !== 13
        ? 'กรอกเลขบัตรประชาชนให้ครบ 13 หลัก'
        : 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ไม่ผ่าน) — ตรวจสอบอีกครั้ง');
      return;
    }
    setIdError('');
    setOtpSent(true);
    setOtp('');
    setOtpError('');
    setCountdown(RESEND_SECONDS);
  };

  const verifyOtp = (code) => {
    if (locked) return;
    if (code === MOCK_OTP) {
      onVerified?.({
        method: 'otp',
        citizenId: digits,
        relationship: 'self',
        verifiedBy: STAFF_NAME,
        verifiedAt: nowThai(),
      });
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= MAX_ATTEMPTS) {
      setLocked(true);
      setOtpError('กรอกรหัสผิดเกิน 3 ครั้ง — ระบบล็อกชั่วคราว กรุณาใช้เส้นทางแนบเอกสารยืนยันตัวตนแทน');
    } else {
      setOtpError(`รหัส OTP ไม่ถูกต้อง (เหลืออีก ${MAX_ATTEMPTS - next} ครั้ง)`);
    }
    setOtp('');
  };

  const handleDocFile = (file) => {
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name) || /pdf|image\/(jpeg|png)/.test(file.type);
    if (!okType) { setDocError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG'); setDocFile(null); return; }
    if (file.size > 10 * 1024 * 1024) { setDocError('ไฟล์ต้องไม่เกิน 10 MB'); setDocFile(null); return; }
    setDocError('');
    setDocFile(file.name);
  };

  const docReady = !!docFile && !!relationship;
  const confirmDoc = () => {
    if (!docReady) return;
    onVerified?.({
      method: 'document',
      citizenId: digits || null,
      relationship,
      documentName: docFile,
      verifiedBy: STAFF_NAME,
      verifiedAt: nowThai(),
    });
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      title='พิสูจน์ตัวตนเจ้าของข้อมูล'
      subtitle={`ต้องยืนยันตัวตนก่อน: ${actionLabel}`}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={tab === 'document'
        ? { label: 'ยืนยันด้วยเอกสาร', onClick: confirmDoc, disabled: !docReady }
        : undefined}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {(patientName || hn) && (
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              background: 'var(--surface-brandPrimary-quaternary)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-300)',
            }}
          >
            <Icon name='person' size={18} color='var(--text-brandPrimary-default)' />
            <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)' }}>
              เจ้าของข้อมูล: <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{patientName || '-'}</span>
              {hn ? ` · HN ${hn}` : ''}
            </span>
          </div>
        )}

        <TabUnderline tabs={TABS} value={tab} onChange={setTab} />

        {tab === 'otp' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <InputField
              label='เลขบัตรประชาชนเจ้าของข้อมูล (13 หลัก)'
              required
              value={citizenId}
              onChange={(v) => { setCitizenId(v.replace(/[^\d-]/g, '')); setIdError(''); }}
              placeholder='เช่น 1-1678-89302-23-5'
              error={idError || undefined}
              disabled={otpSent && !locked}
            />

            {!otpSent ? (
              <BrandButton variant='fill' size='md' leadingIcon='sms' onClick={sendOtp}>
                ส่งรหัส OTP ไปที่มือถือ
              </BrandButton>
            ) : (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={BODY_TEXT}>
                  ส่งรหัส 6 หลักไปที่เบอร์มือถือที่ลงทะเบียนของเจ้าของข้อมูลแล้ว
                  (mock: <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{MOCK_OTP}</span>)
                </span>
                <OtpInput
                  length={6}
                  value={otp}
                  onChange={(code) => { setOtp(code); if (otpError && !locked) setOtpError(''); }}
                  onComplete={verifyOtp}
                  size='md'
                  error={otpError || undefined}
                  helperText={otpError || undefined}
                  disabled={locked}
                  autoFocus
                />
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='refresh'
                    disabled={countdown > 0 || locked}
                    onClick={sendOtp}
                  >
                    {countdown > 0 ? `ส่งรหัสใหม่ได้ใน ${countdown} วิ` : 'ส่งรหัสอีกครั้ง'}
                  </NeutralSubdueButton>
                  {locked && (
                    <NeutralSubdueButton size='sm' leadingIcon='upload_file' onClick={() => setTab('document')}>
                      ใช้เอกสารยืนยันตัวตนแทน
                    </NeutralSubdueButton>
                  )}
                </div>
              </div>
            )}
            <span style={HINT_TEXT}>
              เส้นทางนี้สำหรับเจ้าของข้อมูลที่มีมือถือลงทะเบียน — หากไม่มี ให้ใช้แท็บ
              &ldquo;เอกสารยืนยันตัวตน&rdquo;
            </span>
          </div>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <FileUploadField
              label='แนบสำเนาบัตรประชาชน / เอกสารยืนยันตัวตน'
              helperText={docError || 'PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB'}
              accept='.pdf,.jpg,.jpeg,.png'
              buttonLabel='เลือกไฟล์เอกสาร'
              fileName={docFile}
              onFile={handleDocFile}
              onClear={() => setDocFile(null)}
            />
            {docError && (
              <span style={{ ...HINT_TEXT, color: 'var(--text-danger-default, #B91C1C)' }}>{docError}</span>
            )}
            <Select
              label='ความสัมพันธ์กับเจ้าของข้อมูล'
              required
              options={RELATION_OPTIONS}
              value={relationship}
              onChange={setRelationship}
              placeholder='เลือกความสัมพันธ์'
              searchable={false}
            />
            {relationship && relationship !== 'self' && (
              <span style={HINT_TEXT}>
                กรณีผู้แทน/ผู้เยาว์: เอกสารที่แนบต้องเป็นเอกสารของผู้แทนพร้อมหลักฐานความสัมพันธ์
                (เช่น สูติบัตร / คำสั่งศาล) — ระบบจะบันทึกไว้ใน audit trail
              </span>
            )}
          </div>
        )}
      </div>
    </Popup>
  );
}
