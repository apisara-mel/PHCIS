import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import AlertDialog from '@/components/popup/AlertDialog';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import Popover from '@/components/popup/Popover';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePickerRange from '@/components/forms/DatePickerRange';
import SelectableCardButton from '@/components/button/SelectableCardButton';
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
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import SecondarySearch from '@/components/search/SecondarySearch';
import {
  SectionHeader as SearchSectionHeader,
  SuggestionRow as SearchSuggestionRow,
} from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  consentPatientSearchSuggestions,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
import { CONSENT_FORM_RECORDS, CONSENT_FORM_STATUS } from '@/data/consentFormRecords';
import PHCIS_CURRENT_USER from '@/data/phcisCurrentUser';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';
import Checkbox from '@/components/checkbox/Checkbox';
import { DATA_SCOPE_GROUPS, DATA_SCOPE_VALUES } from '@/data/dataScopeCatalog';

/* Shared ด.1.1.17.1 form — อัปโหลด/ถ่ายภาพแบบฟอร์มขอเข้าถึง → mock-OCR → ตรวจแก้ → ส่งคำขอ.
   Used by RequestFormAccessPage (full page), ScanImportPopup, and
   CreateConsentRequestPopup (modal). */

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};

/* วันแรกที่เลือกได้ = วันนี้ (คำนวณครั้งเดียวตอนโหลดโมดูล ไม่สร้าง Date
   ใหม่ทุก render) */
const requestPeriodFloor = new Date();

const isoFormat = (date) => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const isoParse = (value) => (value ? new Date(`${value}T00:00:00`) : null);
/** Matches FieldShell in `_inputBox.jsx` — keeps custom fields aligned with Select/Input. */
export const FIELD_SHELL_LAYOUT = {
  width: '100%',
  maxWidth: 'var(--dim-size-2900, 640px)',
  minWidth: 'var(--dim-size-2000, 128px)',
  boxSizing: 'content-box',
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



/** ประเภทสิ่งที่ขอเข้าถึง */
export const ACCESS_TYPE_OPTIONS = [
  {
    value: 'patient_consent',
    label: 'ขอเข้าถึงข้อมูลความยินยอมของผู้รับบริการ',
    shortLabel: 'ขอดูข้อมูลการให้ความยินยอมของผู้รับบริการ',
    caption: 'เพื่อตรวจสอบดูการให้ความยินยอมของผู้รับบริการ',
    description: 'ขอสิทธิ์ตรวจสอบสถานะความยินยอมที่ผู้รับบริการรายนั้นให้ไว้ ต้องระบุผู้รับบริการ',
  },
];

/** เหตุผลที่ขอสิทธิ์ (dropdown) — ค่า `other` เปิด Voice SuggestibleTextarea */
export const ACCESS_REASON_OTHER = 'other';
export const ACCESS_REASON_OPTIONS = [
  { value: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ', label: 'ตรวจสอบสถานะความยินยอมก่อนให้บริการ' },
  { value: 'ส่งต่อ / ประสานงานกับหน่วยงานอื่น', label: 'ส่งต่อ / ประสานงานกับหน่วยงานอื่น' },
  { value: 'งานวิจัย / ตรวจสอบคุณภาพ', label: 'งานวิจัย / ตรวจสอบคุณภาพ' },
  { value: 'แก้ไขหรืออัปเดตข้อมูลความยินยอม', label: 'แก้ไขหรืออัปเดตข้อมูลความยินยอม' },
  { value: ACCESS_REASON_OTHER, label: 'อื่นๆ ตามที่หน่วยงานกำหนด' },
];

const ACCESS_REASON_OTHER_SUGGESTIONS = [
  'ตรวจสอบข้อมูลความยินยอมก่อนให้บริการแก่ผู้รับบริการ',
  'ต้องการตรวจสอบว่าผู้รับบริการเคยให้ความยินยอมเรื่องใดบ้าง',
  'ประสานส่งต่อข้อมูลความยินยอมไปยังสถานพยาบาลอื่นตามคำขอ',
  'ใช้ประกอบการตรวจสอบคุณภาพและ audit ภายในหน่วยงาน',
  'แก้ไขข้อมูลความยินยอมตามคำขอของเจ้าของข้อมูล',
  'ใช้ประกอบการประชุมคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล',
];

const ACCESS_ADDITIONAL_NOTE_SUGGESTIONS = [
  'แนบหลักฐานคำขอจากหน่วยงานต้นสังกัดแล้ว',
  'ขอตรวจสอบข้อมูลความยินยอมเพื่อให้บริการที่จุดรับบริการวันนี้',
  'ผู้รับบริการมาพร้อมผู้ปกครอง — ต้องการตรวจสอบความยินยอมเดิม',
  'ประสานงานส่งต่อข้อมูลความยินยอมไปโรงพยาบาลปลายทาง',
  'ใช้ประกอบการตรวจสอบสิทธิก่อนให้บริการ',
];

export const ACCESS_TYPE_DISPLAY_LABEL = Object.fromEntries(
  [
    ...ACCESS_TYPE_OPTIONS.map((o) => [o.value, o.shortLabel]),
    ['form', 'คำขอเดิมสำหรับแบบฟอร์ม (Legacy)'],
  ],
);

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

const PATIENT_SEARCH_HISTORY_KEY = 'mih:secondarysearch-history:consent-access-request';
const PATIENT_SEARCH_HISTORY_SEED = consentPatientSearchHistorySeed(4);

const SEARCH_POPOVER_CHROME = {
  maxHeight: 'min(480px, calc(100vh - 64px))',
  background: 'var(--surface-dropdown-default)',
  border: 'var(--dim-stroke-100) solid var(--border-dropdown-default)',
  borderRadius: 'var(--dim-radius-500)',
  boxShadow: 'var(--shadow-dropdown)',
  padding: 'var(--dim-space-100)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-0)',
  overflow: 'hidden',
  zIndex: 'var(--sm-z-modal-popover, 1450)',
};

const resolveConsentPatientPick = (label, item) => (
  (item?.id && CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === item.id))
  || CONSENT_PATIENT_SEARCH_POOL.find((p) =>
    p.label === label || p.name === label || p.hn === label)
);

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
 * @param {string} [props.initialAccessType]
 * @param {string} [props.initialFormId]
 * @param {string} [props.fixedAccessType] — lock type + hide card selector (e.g. popup สร้างคำขอ → `form`)
 */
export default function AccessRequestForm({
  onSubmit,
  onCancel,
  showFooter = true,
  submitLabel = 'ส่งคำขอเข้าถึงข้อมูล',
  cancelLabel = 'ยกเลิก',
  onStateChange,
  initialAccessType = 'patient_consent',
  initialFormId = '',
  fixedAccessType = '',
}) {
  const [phase, setPhase] = useState('review');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [fileError, setFileError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [name, setName] = useState(PHCIS_CURRENT_USER.displayName || '');
  const [empCode, setEmpCode] = useState(PHCIS_CURRENT_USER.employeeCode || '');
  const [unit, setUnit] = useState('');
  const [hn, setHn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [scopes, setScopes] = useState([]);
  const [requestedPeriod, setRequestedPeriod] = useState(['', '']);
  const [accessType, setAccessType] = useState(fixedAccessType || initialAccessType);
  const [formId, setFormId] = useState(initialFormId);
  const [reason, setReason] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchPopoverWidth, setPatientSearchPopoverWidth] = useState(null);
  const patientSearchBoxRef = useRef(null);
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
      setName(PHCIS_CURRENT_USER.displayName || OCR_RESULT.name);
      setEmpCode(PHCIS_CURRENT_USER.employeeCode || OCR_RESULT.empCode);
      setUnit('');
      setHn(OCR_RESULT.hn);
      setPatientQuery('');
      setPurpose(OCR_RESULT.purpose);
      setScopes(OCR_RESULT.scopes);
      setAccessType(fixedAccessType || OCR_RESULT.accessType);
      setFormId(OCR_RESULT.formId);
      setReason(OCR_RESULT.reason);
      setReasonDetail('');
    } else {
      setOcrFailed(true);
      setName(PHCIS_CURRENT_USER.displayName || '');
      setEmpCode(PHCIS_CURRENT_USER.employeeCode || '');
      setUnit('');
      setHn('');
      setPatientQuery('');
      setPurpose('');
      setScopes([]);
      setAccessType(fixedAccessType || 'patient_consent');
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
    /* PDF และภาพ JPG/PNG ที่ผ่านการตรวจชนิดไฟล์ ล้วนส่งต่อเข้า OCR ได้ */
    runOcr(file.name, true);
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
    setPhase('review');
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
  /* แบบฟอร์มอาจถูกขอเพื่อผู้รับบริการเฉพาะรายได้ด้วย จึงเปิดตัวเลือกผู้รับบริการ
     ให้คำขอแบบฟอร์มเช่นกัน แต่บังคับเฉพาะประเภทข้อมูลความยินยอม */
  const supportsPatient = true;
  const needsForm = false;
  const reasonIsOther = reason === ACCESS_REASON_OTHER;
  const [requestedStart, requestedEnd] = requestedPeriod;
  const requestedPeriodInvalid = !!requestedStart && !!requestedEnd && requestedEnd < requestedStart;
  const resolvedReason = reasonIsOther ? reasonDetail.trim() : reason;
  const selectedForm = formId ? FORM_OPTIONS.find((o) => o.value === formId) : null;
  const dirty = Boolean(
    fileName || hn || formId || reason || reasonDetail || additionalNote.trim() || patientQuery
    || requestedStart || requestedEnd
    || (!fixedAccessType && accessType),
  );
  const ready = phase === 'review'
    && name.trim()
    && accessType
    && (!needsForm || formId)
    && reason
    && (!reasonIsOther || reasonDetail.trim().length >= 3)
    && scopes.length > 0
    && !!requestedStart
    && !!requestedEnd
    && !requestedPeriodInvalid
    && (!needsPatient || hn.trim());

  const selectedPatient = supportsPatient && hn
    ? CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === hn) || null
    : null;

  const patientSuggestions = useMemo(
    () => (supportsPatient ? consentPatientSearchSuggestions(patientQuery) : []),
    [supportsPatient, patientQuery],
  );

  useLayoutEffect(() => {
    if (!patientSearchOpen) return undefined;
    const measure = () => {
      const width = patientSearchBoxRef.current?.getBoundingClientRect().width;
      if (width) setPatientSearchPopoverWidth(width);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [patientSearchOpen]);

  const showPatientSuggestions = patientQuery.trim().length > 0;
  const patientHistoryItems = !showPatientSuggestions ? patientSearchHistory : [];

  const pickPatient = (patient, historyItem) => {
    if (!patient) return;
    setHn(patient.hn);
    setPatientQuery('');
    setPatientSearchOpen(false);
    pushPatientHistory(historyItem || toConsentPatientSearchItem(patient));
  };

  const submitPatientSearch = (label, item) => {
    const found = resolveConsentPatientPick(label, item)
      || (patientSuggestions[0]?.id
        ? CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === patientSuggestions[0].id)
        : null);
    if (found) pickPatient(found, item || patientSuggestions[0]);
    else setPatientQuery(label);
    setPatientSearchOpen(false);
  };

  const pickPatientSearchItem = (item) => {
    submitPatientSearch(item.value ?? item.label ?? '', item);
  };

  const clearPatient = () => {
    setHn('');
    setPatientQuery('');
    setPatientSearchOpen(false);
  };

  const submit = () => {
    if (!ready) return;
    onSubmit?.({
      name: name.trim(),
      empCode: empCode.trim(),
      unit: unit.trim(),
      hn: hn.trim() || '-',
      patientName: selectedPatient?.name || selectedPatient?.label || '',
      purpose: resolvedReason,
      scopes,
      requestedPeriodStart: requestedStart,
      requestedPeriodEnd: requestedEnd,
      fileName,
      accessType,
      accessTypeLabel: ACCESS_TYPE_DISPLAY_LABEL[accessType] || accessType,
      formId: needsForm ? formId : '',
      formCode: needsForm ? (selectedForm?.code || '') : '',
      formName: needsForm ? (selectedForm?.name || selectedForm?.label || '') : '',
      reason: resolvedReason,
      reasonKey: reason,
      note: additionalNote.trim(),
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
  }, [ready, dirty, accessType, formId, reason, reasonDetail, needsPatient, hn, fileName]);

  /* การ์ดผู้ขอเป็น section แรกของฟอร์ม (มติผู้ใช้ 25 ส.ค. 69) — ของเดิมอยู่
     ท้ายสุดในขั้นสรุป ทำให้ต้องเลื่อนจนสุดถึงจะรู้ว่าใครเป็นคนขอ */
  /* ผู้ขอ = ผู้ใช้ที่ล็อกอินอยู่ แก้ไม่ได้อยู่แล้ว — แสดงเป็นการ์ดพื้นเขียวอ่อน
     แทนช่องกรอกที่ disabled สองช่องซึ่งดูเหมือนต้องกรอกทั้งที่กรอกไม่ได้ */
  const requesterCard = (
  <div
    className='flex items-center w-full min-w-0'
    style={{
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      background: 'var(--surface-brandPrimary-quaternary)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      borderRadius: 'var(--dim-radius-300, 10px)',
    }}
  >
    {/* PHCIS_CURRENT_USER ไม่มีรูป — StaffProfileAvatar จะ fallback
        เป็นตัวย่อจากชื่อให้เอง */}
    <StaffProfileAvatar staff={{ name }} size={40} />
    <div className='flex flex-col min-w-0 flex-1' style={{ gap: 'var(--dim-space-050)' }}>
      <span
        className='truncate'
        style={{
          color: 'var(--text-content-primary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium, 500)',
          lineHeight: 1.45,
        }}
      >
        {name || '—'}
      </span>
      <span
        className='truncate'
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.4,
        }}
      >
        {[empCode, PHCIS_CURRENT_USER.department, PHCIS_CURRENT_USER.activity]
          .filter(Boolean).join(' · ')}
      </span>
    </div>
    <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ผู้ขอ</ColorfulBadge>
  </div>
  );

  /* ขอบเขตข้อมูล: เช็กบ็อกซ์เต็มความกว้าง แบ่งซ้าย-ขวา (มติผู้ใช้ 25 ส.ค. 69)
     dropdown เดิมซ่อนตัวเลือกไว้หลังการคลิก ทำให้ผู้ขอมองไม่เห็นว่ามีหมวด
     "อ่อนไหว" แยกอยู่ — ซึ่งเป็นข้อมูลที่ผู้อนุมัติต้องพิจารณาเป็นรายกรณี */
  const toggleScope = (value) => setScopes((prev) => {
    const list = Array.isArray(prev) ? prev : [];
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  });
  const selectedScopes = Array.isArray(scopes) ? scopes : [];
  const allScopesPicked = selectedScopes.length === DATA_SCOPE_VALUES.length;

  const scopePicker = (
    <div className='flex flex-col items-start w-full min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
      <div className='flex items-center justify-between w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={LABEL_TEXT}>
          ขอบเขตข้อมูลที่ขอเข้าถึง
          <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}> *</span>
        </span>
        <BrandSubdueButton
          variant='outline'
          size='sm'
          onClick={() => setScopes(allScopesPicked ? [] : [...DATA_SCOPE_VALUES])}
        >
          {allScopesPicked ? 'ล้างที่เลือก' : 'เลือกทุกหมวด'}
        </BrandSubdueButton>
      </div>
      <div
        className='grid w-full min-w-0'
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(var(--dim-size-2600, 384px), 1fr))',
          gap: 'var(--dim-space-400)',
          alignItems: 'start',
        }}
      >
        {DATA_SCOPE_GROUPS.map((group) => (
          <div
            key={group.key}
            className='flex flex-col min-w-0'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              background: group.sensitive
                ? 'var(--surface-alert-warning, #FFF9F0)'
                : 'var(--surface-neutral-quaternary)',
              border: `var(--dim-stroke-100) solid ${group.sensitive
                ? 'var(--border-alert-warning, #FFEDD5)'
                : 'var(--border-card-default)'}`,
              borderRadius: 'var(--dim-radius-300)',
            }}
          >
            <span className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              {group.sensitive ? (
                <Icon name='lock_person' size={16} color='var(--text-warning-default, #C2410C)' />
              ) : null}
              <span style={{ ...LABEL_TEXT, fontWeight: 'var(--type-weight-medium, 500)' }}>
                {group.title}
              </span>
            </span>
            <span style={{ ...BODY_TEXT, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              {group.hint}
            </span>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-100)' }}>
              {group.scopes.map((scope) => (
                <Checkbox
                  key={scope.value}
                  label={scope.value}
                  description={scope.hint}
                  checked={selectedScopes.includes(scope.value)}
                  onChange={() => toggleScope(scope.value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const evidenceUpload = (
    <>
      <div
        className='flex flex-col items-start w-full'
        style={{ gap: 'var(--dim-space-150)', ...FIELD_SHELL_LAYOUT }}
      >
        <span style={LABEL_TEXT}>
          อัปโหลดหลักฐานประกอบคำขอ (ถ้ามี)
        </span>
        <div className='flex items-stretch w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <DragAndDrop
            value={[]}
            onChange={handleUploadChange}
            onError={({ message }) => setFileError(message || 'ไฟล์ไม่ถูกต้อง')}
            accept='.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf'
            multiple={false}
            preview={false}
            size='sm'
            title='ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด'
            helper='ไม่บังคับ · รองรับ PDF, JPG หรือ PNG'
            ctaLabel='เลือกไฟล์'
            error={!!fileError}
            disabled={phase === 'reading'}
            style={{ flex: '1 1 0', minWidth: 0, width: '100%', minHeight: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', boxSizing: 'border-box' }}
          />
          <PhotoUploadField
            label='สแกนเอกสาร'
            icon='document_scanner'
            onClick={() => phase !== 'reading' && setCameraOpen(true)}
            disabled={phase === 'reading'}
            aria-label='สแกนเอกสารด้วยกล้อง'
            style={{ width: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', flexShrink: 0, boxSizing: 'border-box' }}
          />
          <PhotoUploadField
            label='ถ่ายภาพ'
            icon='photo_camera'
            onClick={() => phase !== 'reading' && setCameraOpen(true)}
            disabled={phase === 'reading'}
            aria-label='ถ่ายภาพด้วยกล้อง'
            style={{ width: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', flexShrink: 0, boxSizing: 'border-box' }}
          />
        </div>
        {phase === 'reading' && <UploadProgressBox progress={uploadProgress} label='กำลังอัปโหลดและอ่านเอกสาร…' fileName={fileName || undefined} />}
        {phase === 'review' && uploadFiles[0] && <UploadEvidenceCard file={uploadFiles[0]} onRemove={clearEvidence} label='หลักฐานที่แนบ' />}
        {phase === 'review' && Boolean(fileName) && (
          <div
            className='flex items-start w-full'
            style={{
              gap: 'var(--dim-space-200)',
              padding: 'var(--dim-space-300) var(--dim-space-400)',
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
                : 'อัปโหลดเอกสารสำเร็จ — อ่านข้อมูลจากเอกสารแล้ว ตรวจสอบก่อนบันทึก'}
            </span>
          </div>
        )}
      </div>
      {fileError && <span style={ERROR_TEXT}>{fileError}</span>}
    </>
  );

  return (
    <>
      {/* รากฟอร์มกว้างได้ถึง 960px (มติผู้ใช้ 25 ส.ค. 69) — ตารางขอบเขตข้อมูล
          2 คอลัมน์ต้องการ ~800px ส่วนช่องกรอกอื่นยังถูก FieldShell คุมที่ 640px
          ของมันเอง จึงไม่ยืดตาม */}
      <div
        className='flex flex-col items-start'
        style={{
          ...FIELD_SHELL_LAYOUT,
          gap: 'var(--dim-space-800, 32px)',
          maxWidth: 'calc(var(--dim-size-2900, 640px) + var(--dim-size-2500, 320px))',
        }}
      >
        {/* ประเภท → แบบฟอร์ม / ผู้รับบริการ → เหตุผล */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-800, 32px)' }}>
          {!fixedAccessType && (
          <div
            className='flex flex-col items-start w-full'
            style={{ gap: 'var(--dim-space-150)', ...FIELD_SHELL_LAYOUT }}
            role='group'
            aria-labelledby='access-type-label'
          >
            <span
              id='access-type-label'
              className='flex items-center w-full'
              style={{
                ...LABEL_TEXT,
                gap: 'var(--dim-space-050, 2px)',
              }}
            >
              <span>ประเภทการขอเข้าถึง</span>
              <span style={{ color: 'var(--text-danger-default, #B91C1C)' }} aria-hidden>*</span>
            </span>
            <div
              role='radiogroup'
              aria-labelledby='access-type-label'
              className='flex flex-row flex-wrap items-stretch w-full'
              style={{ gap: 'var(--dim-space-400, 16px)' }}
            >
              {ACCESS_TYPE_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className='flex min-w-0'
                  style={{
                    flex: '1 1 0',
                    maxWidth: 'var(--dim-size-2500, 320px)',
                  }}
                >
                  <SelectableCardButton
                    selected={accessType === opt.value}
                    onClick={() => {
                      setAccessType(opt.value);
                      if (opt.value !== 'form') {
                        setFormId('');
                      }
                    }}
                    ariaLabel={`${opt.shortLabel}. ${opt.caption}`}
                    minHeight={0}
                    padX='var(--dim-space-300, 12px)'
                    padY='var(--dim-space-150, 6px)'
                    className='flex w-full h-full items-start'
                  >
                    <span
                      className='flex flex-col items-start w-full min-w-0'
                      style={{ gap: 'var(--dim-space-050)' }}
                    >
                      <span
                        className='w-full text-left'
                        style={{
                          color: 'var(--text-content-default, #363B3F)',
                          fontSize: 'var(--type-size-sm, 14px)',
                          fontWeight: 'var(--type-weight-medium, 500)',
                          lineHeight: 1.4,
                        }}
                      >
                        {opt.shortLabel}
                      </span>
                      <span
                        className='w-full text-left'
                        style={{
                          color: 'var(--text-content-quaternary, #ADB2B7)',
                          fontSize: 'var(--type-size-xs, 12px)',
                          fontWeight: 'var(--type-weight-regular, 400)',
                          lineHeight: 1.4,
                        }}
                      >
                        {opt.caption}
                      </span>
                    </span>
                  </SelectableCardButton>
                </div>
              ))}
            </div>
          </div>
          )}

          {requesterCard}

          {evidenceUpload}

          {supportsPatient && (
            <div
              className='flex flex-col items-start w-full'
              style={{ gap: 'var(--dim-space-150)', ...FIELD_SHELL_LAYOUT }}
            >
              <span style={LABEL_TEXT}>
                เลือกผู้รับบริการที่ต้องการเข้าถึง
                {needsPatient ? <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}> *</span> : null}
                {!needsPatient ? <span style={{ color: 'var(--text-content-tertiary)' }}> (ถ้ามี)</span> : null}
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
                    {selectedPatient.nationalId && (
                      <span style={{
                        ...BODY_TEXT,
                        fontSize: 'var(--type-size-xs)',
                        color: 'var(--text-content-tertiary)',
                      }}
                      >
                        {/* ตัดเบอร์โทรออก (มติผู้ใช้ 25 ส.ค. 69) — เป็นข้อมูล
                            ติดต่อที่ไม่จำเป็นต่อการยืนยันว่าเลือกถูกคน */}
                        {selectedPatient.nationalId
                          ? `เลขบัตร ${selectedPatient.nationalId}`
                          : ''}
                      </span>
                    )}
                  </span>
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={clearPatient}>
                    เปลี่ยน
                  </BrandSubdueButton>
                </div>
              ) : (
                <div ref={patientSearchBoxRef} className='relative w-full'>
                  <SecondarySearch
                    fullWidth
                    value={patientQuery}
                    onChange={(v) => {
                      setPatientQuery(v ?? '');
                      setPatientSearchOpen(true);
                    }}
                    onSubmit={(label) => submitPatientSearch(
                      label,
                      showPatientSuggestions ? patientSuggestions[0] : patientHistoryItems[0],
                    )}
                    onFocus={() => setPatientSearchOpen(true)}
                    placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
                  />
                  <Popover
                    open={patientSearchOpen}
                    onClose={() => setPatientSearchOpen(false)}
                    anchorRef={patientSearchBoxRef}
                    className='mih-search-popover'
                    style={{
                      ...SEARCH_POPOVER_CHROME,
                      width: patientSearchPopoverWidth ?? undefined,
                      minWidth: patientSearchPopoverWidth ?? 200,
                      maxWidth: patientSearchPopoverWidth ?? undefined,
                    }}
                  >
                    <div
                      className='scrollbar-thin flex flex-col w-full'
                      style={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        maxHeight: 'min(480px, calc(100vh - 64px))',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                      }}
                    >
                      {showPatientSuggestions ? (
                        patientSuggestions.length > 0 ? (
                          patientSuggestions.map((item) => (
                            <SearchSuggestionRow
                              key={item.id || item.label}
                              item={item}
                              query={patientQuery}
                              onPick={pickPatientSearchItem}
                            />
                          ))
                        ) : (
                          <div
                            style={{
                              padding: 'var(--dim-space-300)',
                              color: 'var(--text-content-tertiary)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-sm)',
                              lineHeight: 1.5,
                            }}
                          >
                            ไม่พบรายการที่ค้นหา
                          </div>
                        )
                      ) : (
                        <>
                          <SearchSectionHeader
                            title='ค้นหาล่าสุด'
                            trailing={patientSearchHistory.length > 0 ? (
                              <NeutralSubdueButton
                                variant='outline'
                                size='sm'
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={clearPatientHistory}
                                className='shrink-0'
                              >
                                ล้างประวัติ
                              </NeutralSubdueButton>
                            ) : null}
                          />
                          {patientHistoryItems.length > 0 ? (
                            patientHistoryItems.map((item) => (
                              <SearchSuggestionRow
                                key={item.id || item.label || item.value}
                                item={item}
                                onPick={pickPatientSearchItem}
                              />
                            ))
                          ) : (
                            <div
                              style={{
                                padding: 'var(--dim-space-300)',
                                color: 'var(--text-content-tertiary)',
                                fontFamily: 'var(--type-family-body)',
                                fontSize: 'var(--type-size-sm)',
                                lineHeight: 1.5,
                              }}
                            >
                              ยังไม่มีประวัติการค้นหา
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popover>
                </div>
              )}
            </div>
          )}

          {accessType && (
            <Select
              label='วัตถุประสงค์/เหตุผลที่ขอเข้าถึง'
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
              label='ระบุวัตถุประสงค์/เหตุผลอื่นๆ'
              value={reasonDetail}
              onChange={(e) => setReasonDetail(e?.target?.value ?? (typeof e === 'string' ? e : ''))}
              placeholder='พิมพ์หรือพูดวัตถุประสงค์หรือเหตุผลที่ขอเข้าถึง…'
              suggestions={ACCESS_REASON_OTHER_SUGGESTIONS}
              minChars={3}
              popoverAriaLabel='คำแนะนำเหตุผลที่ขอเข้าถึง'
            />
          )}

          {needsForm && (
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
            <SuggestibleTextarea
              voice
              label='บันทึกเพิ่มเติม'
              value={additionalNote}
              onChange={(e) => setAdditionalNote(e?.target?.value ?? (typeof e === 'string' ? e : ''))}
              placeholder='พิมพ์หรือพูดรายละเอียดเพิ่มเติมที่เกี่ยวกับคำขอนี้'
              suggestions={ACCESS_ADDITIONAL_NOTE_SUGGESTIONS}
              minChars={2}
              popoverAriaLabel='คำแนะนำบันทึกเพิ่มเติม'
            />
          )}
        </div>

        {phase === 'review' && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {/* ระยะห่างระหว่างฟิลด์ในป็อปอัปต้องเท่ากันทุกช่อง (มติผู้ใช้ 25 ส.ค. 69)
              — เดิมกล่องนอกใช้ space-400 แต่กลุ่มข้างในใช้ space-300 จึงดูไม่สม่ำเสมอ */}
            <div className='flex flex-col items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                {/* ไม่มีการ์ดผู้รับบริการซ้ำตรงนี้แล้ว (มติผู้ใช้ 25 ส.ค. 69) —
                    ผู้รับบริการคนเดียวกันแสดงอยู่ในหัวข้อ "เลือกผู้รับบริการ
                    ที่ต้องการเข้าถึง" ด้านบนแล้ว */}
                {scopePicker}
                <DatePickerRange
                  label='ช่วงวันที่ต้องการเริ่มใช้สิทธิ'
                  required
                  value={requestedPeriod}
                  onChange={setRequestedPeriod}
                  format={isoFormat}
                  parse={isoParse}
                  /* ขอสิทธิ์ย้อนหลังไม่ได้ — ทั้งวันเริ่มต้นและวันสิ้นสุดเลือก
                     ได้ตั้งแต่วันนี้เป็นต้นไป (มติผู้ใช้ 25 ส.ค. 69) */
                  minDate={requestPeriodFloor}
                  error={requestedPeriodInvalid ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
                  helperText='อาจจะมีการปรับเปลี่ยนเวลาตามที่ผู้ดูแลระบบพิจารณาตามความเหมาะสม'
                />
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
        title='ยืนยันการละทิ้งการแก้ไข'
        description='เอกสารที่อัปโหลดและข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ยืนยัน'
        cancelLabel='ยกเลิก'
        onConfirm={() => { setConfirmDiscard(false); onCancel?.(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
