import React, { useEffect, useMemo, useRef, useState } from 'react';
import InputField from '@/components/forms/InputField';
import RadioButton from '@/components/radio/RadioButton';
import Signature from '@/components/form-builder/Signature';
import { consentSignatureRoles } from '@/data/consentFormFieldKeys';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import Popover from '@/components/popup/Popover';
import { getRegistrationConsentForm } from '@/data/registrationConsentForms';

/* เนื้อในของ "กรอกใบยินยอม" (PD-1011 / TX-1011 / CL-1011) —
   Figma PHCIS_Registration_Step01_Consent 295:41105

   ย้ายออกมาจาก RegistrationConsentFillPage เพราะระบบจัดการความยินยอมเปิดฟอร์ม
   เดียวกันเป็น nested popup (แท็บผู้รับบริการทั้งหมด → กรอกแบบฟอร์มความยินยอม
   → เลือกใบ) ทั้งสองที่ต้องเป็นเอกสารฉบับเดียวกันเป๊ะ ไม่ใช่สองสำเนาที่ drift

   สถานะฟอร์มอยู่ในนี้ ส่วนปุ่มบันทึกอยู่ที่ผู้เรียก (footer ของหน้า / footer ของ
   popup) จึงคุยกันผ่าน `onStateChange({ ready, submit })` — สัญญาเดียวกับ
   AccessRequestForm ↔ CreateConsentRequestPopup */

const sectionCardStyle = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  padding: 'var(--dim-space-600) 24px',
  width: '100%',
};

const sectionTitleStyle = {
  margin: 0,
  width: '100%',
  color: '#383B3D',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 'normal',
};

/** Compact consent radios — Figma 295:41105 / 298:82500
   Radio Button · Border=Yes · title only · h=40 (ยินยอม 74 / ไม่ยินยอม 88). */
const consentRadioStyle = {
  minHeight: 40,
  height: 40,
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
};

const ConsentChoiceRadios = ({ value, onChange, name }) => (
  <div
    className='flex flex-wrap items-center'
    style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)' }}
    role='radiogroup'
    aria-label={name}
  >
    <RadioButton
      name={name}
      value='yes'
      title='ยินยอม'
      checked={value === 'yes'}
      onChange={() => onChange('yes')}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon={false}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={consentRadioStyle}
    />
    <RadioButton
      name={name}
      value='no'
      title='ไม่ยินยอม'
      checked={value === 'no'}
      onChange={() => onChange('no')}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon={false}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={consentRadioStyle}
    />
  </div>
);

const emptyAnswers = (clauses) => Object.fromEntries(clauses.map((c) => [c.id, '']));

export default function ConsentFormFillBody({
  formId,
  /** ค่าตั้งต้นของช่องข้อมูลผู้ป่วย — ผู้เรียกเป็นคนหาให้ (หน้าเวชระเบียนใช้
      ร่างการลงทะเบียน · ระบบความยินยอมใช้ทะเบียนผู้รับบริการ) */
  initialFullName = '',
  initialNationalId = '',
  initialHn = '',
  /** แผงขวา (QR + เครื่องมือถือตัวอย่าง) — ปิดได้เมื่อพื้นที่ไม่พอ */
  showSidePanel = true,
  /** แจ้งสถานะฟอร์มกลับผู้เรียก: { ready, submit } */
  onStateChange,
  /** ส่งผลลัพธ์ตอนบันทึก: { formId, meta, fullName, nationalId, hn, answers, outcome, signature } */
  onSubmit,
  /** keys ของผู้ลงนามที่แบบฟอร์มกำหนด — ถ้าไม่ส่ง ใช้ meta.signatures */
  signatureKeys,
  /** badge สถานะยืนยันตัวตน — วางแถวเดียวกับหัวข้อ "ข้อมูลผู้ป่วย"
      (มติผู้ใช้ 25 ส.ค. 69) เดิมเป็น Alert เต็มความกว้างเหนือฟอร์ม
      ทั้งที่บอกสถานะสั้น ๆ แค่บรรทัดเดียว */
  identityBadge = null,
}) {
  const meta = useMemo(() => getRegistrationConsentForm(formId), [formId]);

  const [fullName, setFullName] = useState(initialFullName);
  const [nationalId, setNationalId] = useState(initialNationalId);
  const [hn, setHn] = useState(initialHn);
  const [answers, setAnswers] = useState(() => emptyAnswers(meta.clauses));
  /* ช่องเซ็นหนึ่งช่องต่อผู้ลงนามหนึ่งคนที่แบบฟอร์มกำหนดไว้ (มติผู้ใช้ 25 ส.ค. 69)
     เดิมมีช่องเดียวตายตัวไม่ว่าจะเลือกผู้ลงนามกี่คน */
  const signatureRoles = useMemo(
    () => consentSignatureRoles(signatureKeys ?? meta.signatures),
    [signatureKeys, meta.signatures],
  );
  const [signatures, setSignatures] = useState({});
  const setRoleSignature = (key, value) => setSignatures((prev) => ({ ...prev, [key]: value }));
  /* ผู้เรียกเดิมรับ `signature` เดี่ยว — ส่งของผู้ป่วยไปเหมือนเดิมเพื่อไม่ให้พัง */
  const signature = signatures[signatureRoles[0]?.key] ?? null;
  const [qrOpen, setQrOpen] = useState(false);
  const qrButtonRef = useRef(null);

  useEffect(() => {
    setAnswers(emptyAnswers(meta.clauses));
    setSignatures({});
  }, [meta.id, meta.clauses]);

  useEffect(() => {
    setFullName(initialFullName);
    setNationalId(initialNationalId);
    setHn(initialHn);
  }, [initialFullName, initialNationalId, initialHn]);

  const fieldValues = { fullName, nationalId, hn };
  const setFieldValue = { fullName: setFullName, nationalId: setNationalId, hn: setHn };

  const canSave = useMemo(() => {
    const fieldsOk = (meta.patientFields || []).every((f) => {
      if (!f.required) return true;
      return String(fieldValues[f.key] || '').trim() !== '';
    });
    const clausesOk = meta.clauses.every((c) => answers[c.id] === 'yes' || answers[c.id] === 'no');
    return Boolean(fieldsOk && clausesOk && signatureRoles.every((r) => signatures[r.key]));
  }, [answers, fieldValues, meta.clauses, meta.patientFields, signatures, signatureRoles]);

  /* ปุ่มบันทึกอยู่นอก component นี้ — ส่ง submit ให้ผู้เรียกถือไว้ · ไม่ใส่
     onSubmit/onStateChange ใน deps เพราะ callback มักเป็น inline function
     ที่เปลี่ยน identity ทุก render (จะกลายเป็น loop) */
  useEffect(() => {
    onStateChange?.({
      ready: canSave,
      submit: () => {
        if (!canSave) return;
        const outcome = Object.values(answers).some((a) => a === 'no') ? 'declined' : 'signed';
        onSubmit?.({ formId: meta.id, meta, fullName, nationalId, hn, answers, outcome, signature, signatures });
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, answers, fullName, nationalId, hn, signature, signatures, meta]);

  const qrSrc = useMemo(() => {
    const target = typeof window !== 'undefined'
      ? `${window.location.origin}/registration/consent/${meta.id}?role=patient`
      : meta.id;
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(target)}`;
  }, [meta.id]);

  const setAnswer = (id) => (val) => setAnswers((s) => ({ ...s, [id]: val }));

  return (
    <div
      /* `shrink-0` + ไม่มี overflow-hidden — ใน popup ตัวนี้เป็นลูกของ body ที่
         เป็น flex column + overflow-y:auto ถ้าปล่อยให้ย่อได้/ตัดเนื้อหา เอกสาร
         จะถูกครอบตัดแทนที่จะดันให้ popup เลื่อนได้ (เคสหน้าลงทะเบียน 14 ส.ค.) */
      className='flex items-start justify-center w-full min-w-0 shrink-0'
      style={{ gap: 'var(--dim-space-600)' }}
    >
      {/* ── Left form (max 640) ── */}
      <div
        className='flex flex-col min-w-0'
        style={{ flex: '1 0 0', maxWidth: 640, gap: 'var(--dim-space-400)' }}
      >
        {showSidePanel ? (
          <div
            className='flex flex-wrap items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-300, 12px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary)',
              color: 'var(--text-brandPrimary-default)',
            }}
          >
            <Icon name='info' size={18} />
            <span className='flex-1 min-w-0 text-sm'>ผู้รับบริการสามารถสแกน QR เพื่อกรอกบนโทรศัพท์ได้</span>
            <NeutralSubdueButton
              ref={qrButtonRef}
              size='sm'
              variant='outline'
              leadingIcon='qr_code_2'
              active={qrOpen}
              aria-expanded={qrOpen}
              onMouseEnter={() => setQrOpen(true)}
              onFocus={() => setQrOpen(true)}
              onClick={() => setQrOpen((open) => !open)}
            >
              แสดง QR
            </NeutralSubdueButton>
            <Popover
              open={qrOpen}
              onClose={() => setQrOpen(false)}
              anchorRef={qrButtonRef}
              style={{
                padding: 'var(--dim-space-400, 16px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-dropdown-default)',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 'var(--sm-z-modal-popover, 1450)',
              }}
            >
              <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <img
                  src={qrSrc}
                  alt={`QR สำหรับ ${meta.title}`}
                  style={{ width: 'var(--dim-size-2100, 160px)', height: 'var(--dim-size-2100, 160px)' }}
                />
                <span className='text-xs text-ink-tertiary'>สแกนเพื่อเปิดแบบฟอร์มบนโทรศัพท์</span>
              </div>
            </Popover>
          </div>
        ) : null}
        <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
          <div
            className='flex items-center justify-between flex-wrap w-full min-w-0'
            style={{ gap: 'var(--dim-space-200)' }}
          >
            {/* sectionTitleStyle มี width:100% — ต้อง override เป็น auto
                ไม่งั้น badge ถูกดันตกไปบรรทัดล่าง */}
            <h2 style={{ ...sectionTitleStyle, width: 'auto' }}>ข้อมูลผู้ป่วย</h2>
            {identityBadge}
          </div>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {(meta.patientFields || []).map((field) => (
              <InputField
                key={field.key}
                label={field.label}
                required={field.required}
                value={fieldValues[field.key] || ''}
                onChange={setFieldValue[field.key]}
                placeholder={field.placeholder}
                showHelperText={false}
                showLeadingIcon={false}
              />
            ))}
          </div>
        </section>

        <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100)' }}>
            <h2 style={{ ...sectionTitleStyle, width: 'auto', whiteSpace: 'nowrap' }}>
              ข้อความยินยอม
            </h2>
          </div>
          {meta.intro && (
            <p style={{
              margin: 0,
              width: '100%',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}>
              {meta.intro}
            </p>
          )}
          {meta.clauses.map((clause, index) => (
            <div
              key={clause.id}
              className='flex w-full items-start'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-300)',
                borderRadius: 'var(--dim-radius-400, 12px)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                background: 'var(--surface-card-100)',
              }}
            >
              <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                <span style={{
                  color: 'var(--text-topic-secondary-title, #007549)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular)',
                  lineHeight: 1.5,
                }}>
                  ข้อที่ {index + 1} - {clause.title}
                </span>
                <p style={{
                  margin: 0,
                  color: 'var(--text-content-default)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.5,
                }}>
                  {clause.detail}
                </p>
                <ConsentChoiceRadios
                  name={`clause-${clause.id}`}
                  value={answers[clause.id]}
                  onChange={setAnswer(clause.id)}
                />
              </div>
            </div>
          ))}
        </section>

        <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
          <h2 style={sectionTitleStyle}>ลายมือชื่อ</h2>
          {signatureRoles.map((role) => (
            <div key={role.key} className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                {role.label}
              </span>
              <Signature
                value={signatures[role.key] || null}
                onChange={(v) => setRoleSignature(role.key, v)}
                onConfirm={(v) => setRoleSignature(role.key, v)}
                height={100}
                width='100%'
              />
            </div>
          ))}
          <div
            className='flex flex-col w-full'
            style={{
              background: 'var(--surface-card-200, #FDFDFD)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              padding: 'var(--dim-space-400)',
              gap: 'var(--dim-space-100)',
              color: 'var(--text-content-secondary)',
            }}
          >
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-bold)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}>
              หมายเหตุ
            </span>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}>
              {meta.signatureNote || 'เอกสารนี้มีอายุ 365 วัน นับจากวันที่ลงนาม'}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
