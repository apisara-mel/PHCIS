import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import InputField from '@/components/forms/InputField';
import OtpInput from '@/components/forms/OtpInput';
import Select from '@/components/forms/Select';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import Icon from '@/components/icons/Icon';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import CONSENT_FORM_RECORDS, { resolveConsentFormForWorklistType } from '@/data/consentFormRecords';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import { logExport } from '@/data/consentWorkflowStore';

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
   เส้นทาง OTP หลังยืนยันสำเร็จ → ขั้นดาวน์โหลดเอกสารให้ความยินยอม (ด.1.1.15)
   ก่อนกด "ดำเนินการต่อ".

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
const FIELD_LABEL = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  color: 'var(--text-content-default)',
};

const nowThai = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

/** Strip legacy callers that embed HN in patientName ("ชื่อ · HN …"). */
const patientNameFallback = (patientName) => {
  const raw = String(patientName || '').trim();
  if (!raw) return '';
  const dotHn = raw.indexOf(' · HN ');
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
  formCode,
  consentType,
}) {
  const [phase, setPhase] = useState('verify'); // 'verify' | 'download'
  const [pendingAudit, setPendingAudit] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadNote, setDownloadNote] = useState('');
  const [downloadError, setDownloadError] = useState('');
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
  const [docFiles, setDocFiles] = useState([]);
  const [docError, setDocError] = useState('');
  const [relationship, setRelationship] = useState('');

  const patientCard = useMemo(() => {
    if (!hn && !patientName) return null;
    return resolveConsentPatientCard(hn, patientNameFallback(patientName));
  }, [hn, patientName]);

  const formRecord = useMemo(() => {
    if (formCode) {
      return CONSENT_FORM_RECORDS.find((f) => f.code === formCode) || null;
    }
    if (consentType) {
      const resolved = resolveConsentFormForWorklistType(consentType);
      return CONSENT_FORM_RECORDS.find((f) => f.code === resolved.formCode) || null;
    }
    const resolved = resolveConsentFormForWorklistType('PDPA');
    return CONSENT_FORM_RECORDS.find((f) => f.code === resolved.formCode) || CONSENT_FORM_RECORDS[0] || null;
  }, [formCode, consentType]);

  /* reset ทุกครั้งที่เปิดใหม่ */
  useEffect(() => {
    if (!open) return;
    setPhase('verify');
    setPendingAudit(null);
    setDownloading(false);
    setDownloadNote('');
    setDownloadError('');
    setTab('otp'); setCitizenId(''); setIdError('');
    setOtpSent(false); setOtp(''); setOtpError('');
    setAttempts(0); setLocked(false); setCountdown(0);
    setDocFiles([]); setDocError(''); setRelationship('');
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
      setPendingAudit({
        method: 'otp',
        citizenId: digits,
        relationship: 'self',
        verifiedBy: STAFF_NAME,
        verifiedAt: nowThai(),
      });
      setPhase('download');
      setDownloadNote('');
      setDownloadError('');
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

  const handleDocFilesChange = (files) => {
    const file = files[0];
    if (!file) {
      setDocFiles([]);
      setDocError('');
      return;
    }
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name) || /pdf|image\/(jpeg|png)/.test(file.type);
    if (!okType) {
      setDocError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG');
      setDocFiles([]);
      return;
    }
    setDocError('');
    setDocFiles([file]);
  };

  const docReady = docFiles.length > 0 && !!relationship;
  const confirmDoc = () => {
    if (!docReady) return;
    onVerified?.({
      method: 'document',
      citizenId: digits || null,
      relationship,
      documentName: docFiles[0].name,
      verifiedBy: STAFF_NAME,
      verifiedAt: nowThai(),
    });
  };

  const finishVerification = () => {
    if (!pendingAudit) return;
    onVerified?.(pendingAudit);
  };

  const handleDownloadForm = async () => {
    if (!formRecord || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const filename = await downloadConsentFormPdf(formRecord);
      logExport({ source: `${formRecord.code} ${formRecord.name}`, format: 'pdf' });
      setDownloadNote(`ดาวน์โหลด ${filename} แล้ว — ระบบบันทึก log การส่งออกข้อมูล`);
    } catch {
      setDownloadNote('');
      setDownloadError('ไม่สามารถดาวน์โหลด PDF ได้ — ลองใหม่อีกครั้ง');
    } finally {
      setDownloading(false);
    }
  };

  const popupTitle = phase === 'download'
    ? 'ดาวน์โหลดเอกสารให้ความยินยอม'
    : 'พิสูจน์ตัวตนเจ้าของข้อมูล';
  const popupSubtitle = phase === 'download'
    ? `พิสูจน์ตัวตนแล้ว — ดาวน์โหลดเอกสารก่อน: ${actionLabel}`
    : `ต้องยืนยันตัวตนก่อน: ${actionLabel}`;

  return (
    <Popup
      open={open}
      onClose={onClose}
      width='var(--dim-size-2800, 512px)'
      title={popupTitle}
      subtitle={popupSubtitle}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={phase === 'download'
        ? { label: 'ดำเนินการต่อ', onClick: finishVerification }
        : tab === 'document'
          ? { label: 'ยืนยันด้วยเอกสาร', onClick: confirmDoc, disabled: !docReady }
          : undefined}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {patientCard && (
          <PatientSummaryCard
            avatarUrl={patientCard.avatarUrl}
            avatarAlt={patientCard.fullName || patientCard.shortName || ''}
            cells={[
              {
                label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                value: patientCard.fullName || patientCard.shortName || '—',
              },
              {
                label: 'HN (Hospital Number)',
                value: patientCard.hn || hn || '—',
              },
            ]}
          />
        )}

        {phase === 'download' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex items-start w-full'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                background: 'var(--surface-statussummarycard-positive, #D1F6EE)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              }}
            >
              <Icon name='check_circle' size={22} color='var(--text-brandPrimary-default, #007549)' />
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{
                  fontFamily: 'var(--type-family-heading-content)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                  color: 'var(--text-content-default)',
                }}
                >
                  พิสูจน์ตัวตนเจ้าของข้อมูลสำเร็จ
                </span>
                <span style={BODY_TEXT}>
                  ยืนยันตัวตนด้วย OTP เมื่อ {pendingAudit?.verifiedAt || '—'}
                </span>
              </div>
            </div>

            <span style={BODY_TEXT}>
              ดาวน์โหลดเอกสารให้ความยินยอมเพื่อพิมพ์ให้เจ้าของข้อมูลลงนามก่อนดำเนินการต่อ
              (TOR ด.1.1.15)
            </span>

            {formRecord && (
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-100)',
                  padding: 'var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-300)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                }}
              >
                <span style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  color: 'var(--text-content-default)',
                }}
                >
                  {formRecord.name}
                </span>
                <span style={HINT_TEXT}>
                  {formRecord.code} · เวอร์ชัน {formRecord.version} · {formRecord.type}
                </span>
              </div>
            )}

            <BrandButton
              variant='fill'
              size='md'
              leadingIcon='download'
              onClick={handleDownloadForm}
              disabled={!formRecord || downloading}
            >
              {downloading ? 'กำลังสร้าง PDF…' : 'ดาวน์โหลด PDF'}
            </BrandButton>

            {downloadNote && (
              <span style={{ ...BODY_TEXT, color: 'var(--text-brandPrimary-default, #007549)' }}>
                {downloadNote}
              </span>
            )}
            {downloadError && (
              <span style={{ ...HINT_TEXT, color: 'var(--text-danger-default, #B91C1C)' }}>
                {downloadError}
              </span>
            )}
          </div>
        ) : (
          <>
        <TabBar aria-label='วิธียืนยันตัวตน' align='center' className='self-center shrink-0 max-w-full'>
          {TABS.map((t) => (
            <TabPill
              key={t.key}
              size='small'
              selected={tab === t.key}
              leadingIcon={t.icon}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </TabPill>
          ))}
        </TabBar>

        {tab === 'otp' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)', textAlign: 'center' }}>
              <span style={BODY_TEXT}>สำหรับเจ้าของข้อมูลที่มีมือถือลงทะเบียน</span>
              <span style={BODY_TEXT}>
                หากไม่มี ให้ใช้แท็บ &ldquo;เอกสารยืนยันตัวตน&rdquo;
              </span>
            </div>
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
          </div>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={FIELD_LABEL}>แนบสำเนาบัตรประชาชน / เอกสารยืนยันตัวตน</span>
              <DragAndDrop
                value={docFiles}
                onChange={handleDocFilesChange}
                onError={() => setDocError('ไฟล์ต้องไม่เกิน 10 MB')}
                accept='.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf'
                multiple={false}
                preview={false}
                title='ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด'
                helper='PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB'
                ctaLabel='เลือกไฟล์เอกสาร'
                error={!!docError}
              />
              {docError && (
                <span style={{ ...HINT_TEXT, color: 'var(--text-danger-default, #B91C1C)' }}>{docError}</span>
              )}
            </div>
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
          </>
        )}
      </div>
    </Popup>
  );
}
