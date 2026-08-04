import React, { useEffect, useMemo, useRef, useState } from 'react';
import AlertDialog from '@/components/popup/AlertDialog';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import {
  UploadProgressBox,
  UploadEvidenceCard,
  useSmoothUploadProgress,
} from '@/components/forms/UploadProgressBar';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  consentPatientSearchSuggestions,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
import { CONSENT_FORM_RECORDS, CONSENT_FORM_STATUS } from '@/data/consentFormRecords';

/* Shared ด.1.1.17.1 form — อัปโหลด/ถ่ายภาพแบบฟอร์มขอเข้าถึง → mock-OCR → ตรวจแก้ → ส่งคำขอ.
   Used by RequestFormAccessPage (full page) and ScanImportPopup (modal). */

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const LABEL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};
const ERROR_TEXT = {
  color: 'var(--text-danger-default, #B91C1C)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const PURPOSE_OPTIONS = [
  'การรักษาพยาบาล', 'การส่งต่อผู้ป่วย', 'การวิจัยทางการแพทย์',
  'การเบิกจ่ายค่ารักษา', 'การตรวจสอบคุณภาพ', 'การติดตามอาการ',
].map((p) => ({ value: p, label: p }));

const SCOPE_OPTIONS = ['ประวัติการรักษา', 'ผลตรวจ Lab', 'ภาพรังสี', 'ใบสั่งยา', 'ข้อมูลสิทธิ']
  .map((s) => ({ value: s, label: s }));

/** ประเภทสิ่งที่ขอเข้าถึง */
export const ACCESS_TYPE_OPTIONS = [
  { value: 'form', label: 'ขอเข้าถึงแบบฟอร์มความยินยอม' },
  { value: 'patient_consent', label: 'ขอเข้าถึงข้อมูลความยินยอมของผู้รับบริการ' },
];

/** เหตุผลที่ขอสิทธิ์ (dropdown) — ค่า `other` เปิด Voice SuggestibleTextarea */
export const ACCESS_REASON_OTHER = 'other';
export const ACCESS_REASON_OPTIONS = [
  { value: 'ต้องใช้แบบฟอร์มในการให้บริการ', label: 'ต้องใช้แบบฟอร์มในการให้บริการ' },
  { value: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ', label: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ' },
  { value: 'ส่งต่อ / ประสานงานกับหน่วยงานอื่น', label: 'ส่งต่อ / ประสานงานกับหน่วยงานอื่น' },
  { value: 'งานวิจัย / ตรวจสอบคุณภาพ', label: 'งานวิจัย / ตรวจสอบคุณภาพ' },
  { value: 'แก้ไขหรืออัปเดตข้อมูลความยินยอม', label: 'แก้ไขหรืออัปเดตข้อมูลความยินยอม' },
  { value: ACCESS_REASON_OTHER, label: 'อื่นๆ ตามที่หน่วยงานกำหนด' },
];

const ACCESS_REASON_OTHER_SUGGESTIONS = [
  'ขอใช้แบบฟอร์มเพื่อพิมพ์ให้ผู้รับบริการลงนามที่จุดบริการ',
  'ต้องการตรวจสอบว่าผู้รับบริการเคยให้ความยินยอมเรื่องใดบ้าง',
  'ประสานส่งต่อข้อมูลความยินยอมไปยังสถานพยาบาลอื่นตามคำขอ',
  'ใช้ประกอบการตรวจสอบคุณภาพและ audit ภายในหน่วยงาน',
  'แก้ไขข้อมูลความยินยอมตามคำขอของเจ้าของข้อมูล',
  'ใช้ประกอบการประชุมคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล',
];

const ACCESS_TYPE_LABEL = Object.fromEntries(ACCESS_TYPE_OPTIONS.map((o) => [o.value, o.label]));

/** แบบฟอร์มความยินยอมที่เลือกได้ (เผยแพร่ก่อน แล้วตามด้วยสถานะอื่น) */
const FORM_OPTIONS = (() => {
  const published = [];
  const rest = [];
  CONSENT_FORM_RECORDS.forEach((r) => {
    const opt = {
      value: String(r.id),
      label: r.name,
      code: r.code,
      name: r.name,
      badge: { style: 'teal', label: r.code },
      subtext: `${r.type} · ${r.version}`,
    };
    if ((CONSENT_FORM_STATUS[r.status] || {}).tab === 'published') published.push(opt);
    else rest.push(opt);
  });
  return [...published, ...rest];
})();

const PATIENT_SEARCH_HISTORY_KEY = 'mih:primarysearch-history:consent-access-request';
const PATIENT_SEARCH_HISTORY_SEED = consentPatientSearchHistorySeed(4);

const OCR_RESULT = {
  name: 'ธนวัฒน์ ศรีสุข',
  empCode: 'EMP-0142',
  unit: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',
  hn: '67-00009',
  purpose: 'การส่งต่อผู้ป่วย',
  scopes: ['ประวัติการรักษา', 'ผลตรวจ Lab'],
  accessType: 'patient_consent',
  formId: String(FORM_OPTIONS[0]?.value || '1'),
  reason: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ',
};

/**
 * @param {object} props
 * @param {(payload: object) => void} props.onSubmit
 * @param {() => void} [props.onCancel]
 * @param {boolean} [props.showFooter=true] — page mode shows footer buttons; popup uses Popup actions instead
 * @param {string} [props.submitLabel]
 * @param {string} [props.cancelLabel]
 * @param {(state: { ready: boolean, dirty: boolean, submit: () => void, requestCancel: () => void }) => void} [props.onStateChange]
 */
export default function AccessRequestForm({
  onSubmit,
  onCancel,
  showFooter = true,
  submitLabel = 'ส่งคำขอสิทธิ์',
  cancelLabel = 'ยกเลิก',
  onStateChange,
}) {
  const [phase, setPhase] = useState('upload');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [fileError, setFileError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [name, setName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [unit, setUnit] = useState('');
  const [hn, setHn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [scopes, setScopes] = useState([]);
  const [accessType, setAccessType] = useState('');
  const [formId, setFormId] = useState('');
  const [reason, setReason] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const ocrResultRef = useRef({ readable: false });
  const {
    history: patientSearchHistory,
    push: pushPatientHistory,
    clear: clearPatientHistory,
  } = useSearchHistory(PATIENT_SEARCH_HISTORY_KEY, {
    seedIfEmpty: PATIENT_SEARCH_HISTORY_SEED,
  });

  const applyOcrResult = (readable) => {
    if (readable) {
      setOcrFailed(false);
      setName(OCR_RESULT.name);
      setEmpCode(OCR_RESULT.empCode);
      setUnit(OCR_RESULT.unit);
      setHn(OCR_RESULT.hn);
      setPatientQuery('');
      setPurpose(OCR_RESULT.purpose);
      setScopes(OCR_RESULT.scopes);
      setAccessType(OCR_RESULT.accessType);
      setFormId(OCR_RESULT.formId);
      setReason(OCR_RESULT.reason);
      setReasonDetail('');
    } else {
      setOcrFailed(true);
      setName('');
      setEmpCode('');
      setUnit('');
      setHn('');
      setPatientQuery('');
      setPurpose('');
      setScopes([]);
      setAccessType('');
      setFormId('');
      setReason('');
      setReasonDetail('');
    }
    setPhase('review');
  };

  const uploadProgress = useSmoothUploadProgress({
    active: phase === 'reading',
    durationMs: 1600,
    onDone: () => applyOcrResult(ocrResultRef.current.readable),
  });

  const ingestFile = (file) => {
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name)
      || (file.type && /^(image\/(jpeg|png)|application\/pdf)$/i.test(file.type));
    if (!okType) { setFileError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG'); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError('ไฟล์ต้องไม่เกิน 10 MB'); return; }
    setFileError('');
    setUploadFiles([file]);
    setFileName(file.name);
    runOcr(file.name, /\.pdf$/i.test(file.name) || file.type === 'application/pdf');
  };

  const handleUploadChange = (files) => {
    if (!files || files.length === 0) return;
    ingestFile(files[0]);
  };

  const clearEvidence = () => {
    setUploadFiles([]);
    setFileName(null);
    setFileError('');
    setOcrFailed(false);
    setPhase('upload');
  };

  const handleCameraCapture = (dataUrl) => {
    setCameraOpen(false);
    if (!dataUrl) return;
    const comma = dataUrl.indexOf(',');
    const meta = comma >= 0 ? dataUrl.slice(0, comma) : '';
    const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const file = new File([bytes], 'camera-scan.png', { type: mime });
    ingestFile(file);
  };

  const runOcr = (_fname, readable) => {
    ocrResultRef.current = { readable: !!readable };
    setPhase('reading');
  };

  const needsPatient = accessType === 'patient_consent';
  const reasonIsOther = reason === ACCESS_REASON_OTHER;
  const resolvedReason = reasonIsOther ? reasonDetail.trim() : reason;
  const selectedForm = formId ? FORM_OPTIONS.find((o) => o.value === formId) : null;
  const dirty = Boolean(fileName || name || hn || accessType || formId || reason || reasonDetail || patientQuery);
  const ready = phase === 'review'
    && name.trim()
    && accessType
    && formId
    && reason
    && (!reasonIsOther || reasonDetail.trim().length >= 3)
    && purpose
    && scopes.length > 0
    && (!needsPatient || hn.trim());

  const selectedPatient = needsPatient && hn
    ? CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === hn) || null
    : null;

  const patientSuggestions = useMemo(
    () => (needsPatient ? consentPatientSearchSuggestions(patientQuery) : []),
    [needsPatient, patientQuery],
  );

  const pickPatient = (patient, historyItem) => {
    if (!patient) return;
    setHn(patient.hn);
    setPatientQuery('');
    pushPatientHistory(historyItem || toConsentPatientSearchItem(patient));
  };

  const clearPatient = () => {
    setHn('');
    setPatientQuery('');
  };

  const submit = () => {
    if (!ready) return;
    onSubmit?.({
      name: name.trim(),
      empCode: empCode.trim(),
      unit: unit.trim(),
      hn: needsPatient ? hn.trim() : '-',
      patientName: needsPatient ? (selectedPatient?.name || selectedPatient?.label || '') : '',
      purpose,
      scopes,
      fileName,
      accessType,
      accessTypeLabel: ACCESS_TYPE_LABEL[accessType] || accessType,
      formId,
      formCode: selectedForm?.code || '',
      formName: selectedForm?.name || selectedForm?.label || '',
      reason: resolvedReason,
      reasonKey: reason,
    });
  };

  const requestCancel = () => {
    if (dirty) setConfirmDiscard(true);
    else onCancel?.();
  };

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const requestCancelRef = useRef(requestCancel);
  requestCancelRef.current = requestCancel;

  useEffect(() => {
    onStateChangeRef.current?.({
      ready,
      dirty,
      submit: () => submitRef.current(),
      requestCancel: () => requestCancelRef.current(),
    });
  }, [ready, dirty, accessType, formId, reason, reasonDetail, needsPatient, hn]);

  return (
    <>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        {/* ประเภท → แบบฟอร์ม / ผู้รับบริการ → เหตุผล */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <Select
            label='ประเภทการขอเข้าถึง'
            required
            options={ACCESS_TYPE_OPTIONS}
            value={accessType}
            onChange={(v) => {
              setAccessType(v);
              if (v === 'form') clearPatient();
            }}
            placeholder='เลือกประเภทการขอ'
            searchable={false}
          />

          {accessType === 'form' && (
            <Select
              label='ชื่อแบบฟอร์มความยินยอม'
              required
              options={FORM_OPTIONS}
              value={formId}
              onChange={setFormId}
              placeholder='ค้นหาหรือเลือกแบบฟอร์ม…'
              searchable
            />
          )}

          {needsPatient && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={LABEL_TEXT}>
                ผู้รับบริการ
                <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}> *</span>
              </span>
              {selectedPatient ? (
                <div
                  className='flex items-center w-full'
                  style={{
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                    borderRadius: 'var(--dim-radius-300)',
                  }}
                >
                  <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
                    {selectedPatient.hn}
                  </ColorfulBadge>
                  <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)', flex: 1 }}>
                    <span style={{
                      ...BODY_TEXT,
                      color: 'var(--text-content-default)',
                      fontWeight: 'var(--type-weight-medium)',
                    }}
                    >
                      {selectedPatient.label}
                    </span>
                    {(selectedPatient.nationalId || selectedPatient.phone) && (
                      <span style={{
                        ...BODY_TEXT,
                        fontSize: 'var(--type-size-xs)',
                        color: 'var(--text-content-tertiary)',
                      }}
                      >
                        {[
                          selectedPatient.nationalId
                            ? `เลขบัตร ${selectedPatient.nationalId}`
                            : '',
                          selectedPatient.phone ? `โทร ${selectedPatient.phone}` : '',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={clearPatient}>
                    เปลี่ยน
                  </NeutralSubdueButton>
                </div>
              ) : (
                <div className='w-full flex items-start justify-center'>
                  <PrimarySearch
                    value={patientQuery}
                    onChange={setPatientQuery}
                    onSubmit={(label, item) => {
                      const found = (item?.id && CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === item.id))
                        || CONSENT_PATIENT_SEARCH_POOL.find((p) =>
                          p.label === label || p.name === label || p.hn === label);
                      if (found) pickPatient(found, item || toConsentPatientSearchItem(found));
                      else setPatientQuery(label);
                    }}
                    suggestions={patientSuggestions}
                    history={patientSearchHistory}
                    onHistoryClear={patientSearchHistory.length > 0 ? clearPatientHistory : undefined}
                    placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
                    width={640}
                    scrollOffsetTop={null}
                  />
                </div>
              )}
            </div>
          )}

          {needsPatient && (
            <Select
              label='ชื่อแบบฟอร์มความยินยอม'
              required
              options={FORM_OPTIONS}
              value={formId}
              onChange={setFormId}
              placeholder='ค้นหาหรือเลือกแบบฟอร์ม…'
              searchable
            />
          )}

          {accessType && (
            <Select
              label='เหตุผลที่ขอเข้าถึง'
              required
              options={ACCESS_REASON_OPTIONS}
              value={reason}
              onChange={(v) => {
                setReason(v);
                if (v !== ACCESS_REASON_OTHER) setReasonDetail('');
              }}
              placeholder='เลือกเหตุผล'
              searchable={false}
            />
          )}

          {reasonIsOther && (
            <SuggestibleTextarea
              voice
              required
              label='ระบุเหตุผลอื่นๆ'
              rows={3}
              height={120}
              minHeight={96}
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e?.target?.value ?? (typeof e === 'string' ? e : ''))}
              placeholder='พิมพ์หรือพูดเหตุผลที่ขอเข้าถึง…'
              suggestions={ACCESS_REASON_OTHER_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำเหตุผลที่ขอเข้าถึง'
            />
          )}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={LABEL_TEXT}>อัปโหลดหลักฐานเพื่อสิทธิการเข้าถึงแบบฟอร์ม</span>
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex min-w-0'
              style={{
                flex: '0 1 var(--dim-size-2600, 384px)',
                width: '100%',
                maxWidth: 'var(--dim-size-2600, 384px)',
              }}
            >
              <DragAndDrop
                value={[]}
                onChange={handleUploadChange}
                onError={({ message }) => setFileError(message || 'ไฟล์ไม่ถูกต้อง')}
                accept='.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf'
                multiple={false}
                preview={false}
                size='sm'
                title='ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด'
                helper=''
                ctaLabel='เลือกไฟล์'
                error={!!fileError}
                disabled={phase === 'reading'}
                style={{
                  flex: 1,
                  width: '100%',
                  minHeight: 'var(--dim-size-2000, 128px)',
                  height: 'var(--dim-size-2000, 128px)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <PhotoUploadField
              label='สแกนเอกสาร'
              icon='document_scanner'
              onClick={() => phase !== 'reading' && setCameraOpen(true)}
              disabled={phase === 'reading'}
              aria-label='สแกนเอกสารด้วยกล้อง'
              style={{
                width: 'var(--dim-size-2000, 128px)',
                height: 'var(--dim-size-2000, 128px)',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            />
            <PhotoUploadField
              label='ถ่ายภาพเอกสาร'
              icon='photo_camera'
              onClick={() => phase !== 'reading' && setCameraOpen(true)}
              disabled={phase === 'reading'}
              aria-label='ถ่ายภาพเอกสารด้วยกล้อง'
              style={{
                width: 'var(--dim-size-2000, 128px)',
                height: 'var(--dim-size-2000, 128px)',
                flexShrink: 0,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {phase === 'reading' && (
            <UploadProgressBox
              progress={uploadProgress}
              label='กำลังอัปโหลดและอ่านเอกสาร…'
              fileName={fileName || undefined}
            />
          )}

          {phase === 'review' && uploadFiles[0] && (
            <UploadEvidenceCard
              file={uploadFiles[0]}
              onRemove={clearEvidence}
              label='หลักฐานที่แนบ'
            />
          )}
        </div>
        {fileError && <span style={ERROR_TEXT}>{fileError}</span>}

        {phase === 'review' && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div
              className='flex items-start'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                background: ocrFailed
                  ? 'var(--surface-danger-tertiary, #FEE2E2)'
                  : 'var(--surface-statussummarycard-positive, #D1F6EE)',
                borderRadius: 'var(--dim-radius-300)',
              }}
            >
              <Icon
                name={ocrFailed ? 'error' : 'check_circle'}
                size={18}
                color={ocrFailed
                  ? 'var(--text-danger-default, #B91C1C)'
                  : 'var(--text-statussummarycard-positive-number, #196C65)'}
              />
              <span style={{
                ...BODY_TEXT,
                color: ocrFailed
                  ? 'var(--text-danger-default, #B91C1C)'
                  : 'var(--text-statussummarycard-positive-number, #196C65)',
              }}
              >
                {ocrFailed
                  ? 'OCR อ่านข้อมูลจากภาพไม่สำเร็จ — กรอกข้อมูลเองได้ทุกช่องด้านล่าง (ไฟล์แนบยังถูกเก็บไว้)'
                  : 'อ่านข้อมูลจากเอกสารสำเร็จ — ตรวจสอบและแก้ไขก่อนบันทึก'}
              </span>
            </div>
            <span style={LABEL_TEXT}>ตรวจสอบข้อมูลคำขอ</span>
            <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col' style={{ flex: '1 1 260px', gap: 'var(--dim-space-300)' }}>
                <InputField label='ผู้ขอ (เจ้าหน้าที่)' required value={name} onChange={setName} placeholder='ชื่อ-นามสกุลผู้ขอ' />
                <InputField label='รหัสพนักงาน' value={empCode} onChange={setEmpCode} placeholder='เช่น EMP-0142' />
                <InputField label='หน่วยงาน' value={unit} onChange={setUnit} placeholder='หน่วยงานต้นสังกัด' />
              </div>
              <div className='flex flex-col' style={{ flex: '1 1 260px', gap: 'var(--dim-space-300)' }}>
                {needsPatient && selectedPatient && (
                  <div
                    className='flex items-center w-full'
                    style={{
                      gap: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-400)',
                      background: 'var(--surface-brandPrimary-quaternary)',
                      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                      borderRadius: 'var(--dim-radius-300)',
                    }}
                  >
                    <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
                      {selectedPatient.hn}
                    </ColorfulBadge>
                    <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
                      <span style={{
                        ...BODY_TEXT,
                        color: 'var(--text-content-default)',
                        fontWeight: 'var(--type-weight-medium)',
                      }}
                      >
                        {selectedPatient.label}
                      </span>
                      {selectedPatient.nationalId && (
                        <span style={{
                          ...BODY_TEXT,
                          fontSize: 'var(--type-size-xs)',
                          color: 'var(--text-content-tertiary)',
                        }}
                        >
                          {`เลขบัตร ${selectedPatient.nationalId}`}
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <Select label='วัตถุประสงค์การใช้ข้อมูล' required options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} placeholder='เลือกวัตถุประสงค์' searchable={false} />
                <Select multiple selectAllLabel='เลือกทุกหมวด' label='ขอบเขตข้อมูลที่ขอเข้าถึง' required options={SCOPE_OPTIONS} value={scopes} onChange={setScopes} placeholder='เลือกหมวดข้อมูล' searchable={false} />
              </div>
            </div>
          </div>
        )}

        {showFooter && (
          <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {onCancel && (
              <NeutralSubdueButton variant='outline' size='md' onClick={requestCancel}>
                {cancelLabel}
              </NeutralSubdueButton>
            )}
            <BrandButton variant='fill' size='md' disabled={!ready} onClick={submit}>
              {submitLabel}
            </BrandButton>
          </div>
        )}
      </div>

      <CameraCapturePopup
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ละทิ้งการแก้ไข?'
        description='เอกสารที่อัปโหลดและข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ละทิ้ง'
        cancelLabel='ทำต่อ'
        onConfirm={() => { setConfirmDiscard(false); onCancel?.(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
