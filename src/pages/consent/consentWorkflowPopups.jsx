import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import DatePicker from '@/components/forms/DatePicker';
import Select from '@/components/forms/Select';
import FileUploadField from '@/components/forms/FileUploadField';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import { resolveRegistrationConsentFormId } from '@/data/registrationConsentForms';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import { UploadProgressBox, useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { getConsentChannelOptions, MOBILE_APP_CHANNEL } from '@/data/consentChannels';
import { CONSENT_STATUS } from '@/data/consentRecords';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { CONSENT_FORM_RECORDS, CONSENT_FORM_STATUS } from '@/data/consentFormRecords';
import AccessRequestForm from '@/pages/consent/AccessRequestForm';

/* Helper popups ของ ConsentManagementPage — แตกไฟล์ตาม playbook (ห้ามรื้อ /
   ทำให้หน้าเดิม diff ใหญ่เกิน):

     • CreateConsentRequestPopup — ด.1.1.4 + ด.1.1.6 สร้างคำขอเข้าถึง
       แบบฟอร์มยินยอม: ใช้ AccessRequestForm เดียวกับเมนูขอสิทธิ์การเข้าถึงแบบฟอร์ม
     • ReconsentPopup — ด.1.1.7 Re-Consent ครบวงจร: เลือกช่องทาง + วันครบ
       ก่อนสร้าง record รอลงนามเวอร์ชันล่าสุด
     • PaperConsentRecordPopup — ด.1.1.8 เจ้าหน้าที่บันทึกให้/เพิกถอนจาก
       เอกสารกระดาษ: แนบสแกน + วันที่มีผล + เหตุผล

   ทุก popup มี guard "ยืนยันการละทิ้งการแก้ไข" เมื่อปิดกลางทาง. ค่า visual ทุกตัว
   alias design.md tokens; copy ไทย; mock local. */

export const STAFF_NAME = 'ลดา ดีงาม';

export const todayThai = () =>
  new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
export const nowThai = () =>
  new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

const thaiDateFormat = (d) =>
  d ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const ERROR_TEXT = {
  color: 'var(--text-danger-default, #B91C1C)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

/* ป้ายชื่อช่องอัปโหลด — ชุดเดียวกับ LABEL_TEXT ของหน้าสร้างคำขอเข้าถึงข้อมูล */
const UPLOAD_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-content, var(--type-family-body))',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium, 500)',
  lineHeight: 1.45,
};

/* Hover / selected-hover via CSS so border + surface update without layout shift. */
if (typeof document !== 'undefined' && !document.getElementById('mih-consent-channel-tile-style')) {
  const s = document.createElement('style');
  s.id = 'mih-consent-channel-tile-style';
  s.textContent = `
.mih-consent-channel-tile {
  transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease, color 120ms ease;
}
.mih-consent-channel-tile:hover {
  border-color: var(--border-brandPrimary-tertiary, #C5EDDA) !important;
  background: var(--surface-brandPrimary-quaternary, #F4FBF8) !important;
  box-shadow: var(--shadow-card-hover, 0 4px 12px rgba(0, 117, 73, 0.12)) !important;
}
.mih-consent-channel-tile:hover .mih-consent-channel-tile-title {
  color: var(--text-brandPrimary-default, #007549) !important;
}
.mih-consent-channel-tile:hover .mih-consent-channel-tile-icon {
  color: var(--text-brandPrimary-default, #007549) !important;
}
.mih-consent-channel-tile[aria-pressed="true"]:hover {
  border-color: var(--border-brandPrimary-default, #007549) !important;
  background: var(--surface-brandPrimary-quaternary-hover, #E2F3EB) !important;
  box-shadow: inset 0 0 0 var(--dim-stroke-100) var(--border-brandPrimary-default, #007549),
    var(--shadow-card-hover, 0 4px 12px rgba(0, 117, 73, 0.12)) !important;
}
.mih-consent-channel-tile:focus-visible {
  outline: var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549);
  outline-offset: 2px;
}
`;
  document.head.appendChild(s);
}

export const ChannelTiles = ({ value, onChange, clinicValue }) => {
  const clinicCtx = useClinicFilter();
  const resolvedClinic = clinicValue ?? clinicCtx?.clinic;
  const options = useMemo(() => getConsentChannelOptions(resolvedClinic), [resolvedClinic]);

  return (
  <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
    {options.map((c) => {
      const selected = value === c.value;
      return (
        <button
          key={c.value}
          type='button'
          aria-pressed={selected}
          onClick={() => onChange(c.value)}
          className='mih-consent-channel-tile flex flex-col items-start text-left'
          style={{
            flex: '1 1 160px',
            gap: 'var(--dim-space-150)',
            paddingTop: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-400)',
            borderRadius: 'var(--dim-radius-300)',
            border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-card-default)'}`,
            background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
            boxShadow: selected ? 'inset 0 0 0 var(--dim-stroke-100) var(--border-brandPrimary-default, #007549)' : 'none',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <span className='mih-consent-channel-tile-icon inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)' }}>
            <Icon name={c.icon} size={18} />
            <span className='mih-consent-channel-tile-title' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)' }}>{c.label}</span>
          </span>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>{c.hint}</span>
        </button>
      );
    })}
  </div>
  );
};

/* ══ 1) สร้างคำขอเข้าถึงแบบฟอร์มยินยอม (ด.1.1.4 / ด.1.1.6) ═══════════════ */
export function CreateConsentRequestPopup({
  open,
  onClose,
  onCreate,
  initialFormId = '',
}) {
  const [formApi, setFormApi] = useState({
    ready: false,
    dirty: false,
    submit: () => {},
    requestCancel: () => {},
  });

  if (!open) return null;

  return (
    <Popup
      open={open}
      onClose={() => (formApi.dirty ? formApi.requestCancel() : onClose())}
      /* กว้างพอให้ตารางขอบเขตข้อมูล 2 คอลัมน์อยู่ในบรรทัดเดียว (มติผู้ใช้
         25 ส.ค. 69) — 'large' เดิมบีบจนคอลัมน์ขวาตกลงไปข้างล่าง */
      size='large'
      width={960}
      title='คำขอเข้าถึงข้อมูล'
      primaryAction={{ label: 'ส่งคำขอเข้าถึงข้อมูล', onClick: () => formApi.submit(), disabled: !formApi.ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: () => (formApi.dirty ? formApi.requestCancel() : onClose()) }}
    >
      <AccessRequestForm
        key={open ? 'open' : 'closed'}
        showFooter={false}
        fixedAccessType='patient_consent'
        initialFormId={initialFormId}
        onCancel={onClose}
        onSubmit={(payload) => onCreate?.(payload)}
        onStateChange={setFormApi}
      />
    </Popup>
  );
}

const MetaRow = ({ label, children }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span
      style={{
        width: 140,
        flexShrink: 0,
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        paddingTop: 2,
      }}
    >
      {label}
    </span>
    <div className='flex items-center flex-wrap min-w-0 flex-1' style={{ gap: 'var(--dim-space-150)' }}>
      {children}
    </div>
  </div>
);

/* ══ 2) Re-Consent (ด.1.1.7) ═════════════════════════════════════════════ */
export function ReconsentPopup({ open, record, onClose, onConfirm }) {
  const [dueDate, setDueDate] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDueDate(null); setConfirmDiscard(false);
  }, [open]);

  /* เวอร์ชันล่าสุดของเทมเพลตประเภทเดียวกัน (ถ้าเจอ) */
  const latest = useMemo(() => {
    if (!record) return null;
    return CONSENT_FORM_RECORDS.find((f) => f.type === record.type && (CONSENT_FORM_STATUS[f.status] || {}).tab === 'published') || null;
  }, [record]);

  const patientCard = useMemo(
    () => (record ? resolveConsentPatientCard(record.hn, record.name) : null),
    [record],
  );

  /* ชื่อ/HN ใน popup ต้องตรงกับแถวตาราง (enrichConsentRow) */
  const displayName = record?.name || patientCard?.fullName || patientCard?.shortName || '—';
  const displayHn = record?.hn || patientCard?.hn || '—';
  const displayAvatar = record?.avatarUrl || patientCard?.avatarUrl;

  const displayVersion = latest?.version || record?.version || '—';
  const formTitle = record
    ? [record.formCode, record.formName || record.type].filter(Boolean).join(' · ')
    : '—';
  const statusMeta = (record && CONSENT_STATUS[record.status]) || {};
  const statusLabel = statusMeta.label || record?.status || '—';

  const dirty = !!dueDate;
  const ready = !!dueDate;

  /* guard "ยืนยันการละทิ้งการแก้ไข" — pattern เดียวกับ CreateConsentRequestPopup */
  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        size='large'
        title='Reconsent'
        subtitle='ส่งคำขอความยินยอมใหม่'
        primaryAction={{
          label: 'สร้างคำขอ Reconsent',
          onClick: () => ready && onConfirm({
            channel: MOBILE_APP_CHANNEL,
            dueDate: thaiDateFormat(dueDate),
            latestVersion: latest ? latest.version : record?.version,
          }),
          disabled: !ready,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          {record ? (
            <PatientSummaryCard
              avatarUrl={displayAvatar}
              avatarAlt={displayName}
              cells={[
                {
                  label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                  value: displayName,
                },
                {
                  label: 'HN (Hospital Number)',
                  value: displayHn,
                },
              ]}
            />
          ) : null}

          {record ? (
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-400)',
                border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                background: 'var(--surface-card-100)',
              }}
            >
              <MetaRow label='ชื่อแบบฟอร์ม'>
                <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
                  {formTitle}
                </span>
              </MetaRow>
              <MetaRow label='เวอร์ชั่น'>
                <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
                  {displayVersion}
                </ColorfulBadge>
                {latest?.version && record.version && latest.version !== record.version ? (
                  <span style={{ ...BODY_TEXT, fontSize: 'var(--type-size-xs)' }}>
                    จาก {record.version} → เวอร์ชันล่าสุด
                  </span>
                ) : null}
              </MetaRow>
              <MetaRow label='สถานะ'>
                <ColorfulBadge
                  style={statusMeta.tone || 'grey'}
                  size='small'
                  hierarchy='secondary'
                  width='hug'
                >
                  {statusLabel}
                </ColorfulBadge>
              </MetaRow>
            </div>
          ) : null}

          <DatePicker
            label='วันครบกำหนดลงนาม'
            required
            value={dueDate}
            onChange={setDueDate}
            format={thaiDateFormat}
            minDate={new Date()}
            placeholder='เลือกวันครบกำหนด'
          />
        </div>
      </Popup>

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ยืนยันการละทิ้งการแก้ไข'
        description='วันครบกำหนดที่เลือกไว้จะไม่ถูกบันทึก'
        confirmLabel='ยืนยัน'
        cancelLabel='ยกเลิก'
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}

/* ══ 3) อัปโหลดแบบฟอร์มกระดาษ (ด.1.1.8) ═════════════════════════════════ */
const REASON_HINTS = [
  'ผู้ป่วยยื่นเอกสารเพิกถอนความยินยอมด้วยตนเองที่ศูนย์บริการ',
  'ผู้ปกครองยื่นหนังสือให้ความยินยอมแทนผู้เยาว์',
  'รับเอกสารความยินยอมฉบับกระดาษจากหน่วยบริการเครือข่าย',
];

export function PaperConsentRecordPopup({ open, record, records = [], onClose, onSave }) {
  /* ป็อปอัปนี้บันทึก "ให้ความยินยอม" จากเอกสารกระดาษอย่างเดียว (มติผู้ใช้
     25 ส.ค. 69) — การเพิกถอนมีทางเข้าของตัวเองในหน้าจัดการความยินยอม */
  const mode = 'grant';
  const [fileName, setFileName] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  /* สถานะของ "เอกสารที่กรอก" อยู่ใน ConsentFormFillBody — คุยผ่าน onStateChange
     สัญญาเดียวกับที่หน้าเวชระเบียนกับ popup อื่น ๆ ใช้ */
  const [docApi, setDocApi] = useState({ ready: false, submit: () => {} });
  /* ผู้รับบริการกับแบบฟอร์มแยกเป็นคนละช่อง (มติผู้ใช้ 25 ส.ค. 69) — ของเดิม
     ยัดรวมเป็นบรรทัดเดียว "ชื่อ · HN · แบบฟอร์ม" ทำให้คนไข้ที่มีหลายฟอร์ม
     โผล่ซ้ำหลายบรรทัดในลิสต์เดียว หาว่าจะเลือกอันไหนไม่ออก */
  const [selectedHn, setSelectedHn] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState('');

  useEffect(() => {
    if (!open) return;
    setFileName(null); setPendingName(null); setUploading(false);
    setFileError(''); setEffectiveDate(null); setReason(''); setConfirmDiscard(false); setCameraOpen(false);
    setDocApi({ ready: false, submit: () => {} });
    setSelectedHn(record?.hn != null ? String(record.hn) : '');
    setSelectedRecordId(record?.id != null ? String(record.id) : '');
  }, [open]);

  /* หนึ่งบรรทัดต่อผู้รับบริการหนึ่งคน — ระเบียนคนเดียวกันหลายใบยุบเป็นแถวเดียว */
  const patientOptions = useMemo(() => {
    const seen = new Map();
    records.forEach((item) => {
      const key = String(item.hn);
      if (!seen.has(key)) seen.set(key, { value: key, label: `${item.name} · HN ${item.hn}` });
    });
    return [...seen.values()];
  }, [records]);

  const formOptions = useMemo(() => records
    .filter((item) => String(item.hn) === selectedHn)
    .map((item) => ({
      value: String(item.id),
      label: item.formName || item.type,
      subtext: item.formCode || undefined,
    })), [records, selectedHn]);

  const pickPatient = (hn) => {
    setSelectedHn(hn);
    /* เลือกให้เลยถ้าคนนั้นมีใบเดียว — ไม่ต้องให้กดซ้ำในช่องที่มีตัวเลือกเดียว */
    const forHn = records.filter((item) => String(item.hn) === hn);
    setSelectedRecordId(forHn.length === 1 ? String(forHn[0].id) : '');
  };

  const resolvedRecord = record || records.find((item) => String(item.id) === selectedRecordId) || null;

  const uploadProgress = useSmoothUploadProgress({
    active: uploading,
    durationMs: 1100,
    onDone: () => {
      setFileName(pendingName);
      setPendingName(null);
      setUploading(false);
    },
  });

  const handleFile = (file) => {
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!okType) { setFileError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG'); setFileName(null); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError('ไฟล์ต้องไม่เกิน 10 MB'); setFileName(null); return; }
    setFileError('');
    setPendingName(file.name);
    setUploading(true);
  };

  const dirty = selectedHn || selectedRecordId || fileName || effectiveDate || reason.trim();
  /* ต้องกรอกเอกสารครบเหมือนตอนผู้รับบริการกรอกเอง + แนบต้นฉบับ (มติผู้ใช้
     25 ส.ค. 69) — ลายมือชื่อไม่นับ เพราะอยู่บนกระดาษที่อัปโหลดมาแล้ว */
  const ready = !!resolvedRecord && !!fileName && !!effectiveDate
    && reason.trim().length > 0 && docApi.ready;

  const fillFormId = useMemo(
    () => (resolvedRecord
      ? resolveRegistrationConsentFormId({
        formCode: resolvedRecord.formCode,
        type: resolvedRecord.type,
      })
      : null),
    [resolvedRecord],
  );

  const uploadSlot = (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
    {/* ชุดอัปโหลดเดียวกับหน้าสร้างคำขอเข้าถึงข้อมูล (มติผู้ใช้ 25 ส.ค. 69)
        — ลากวาง + สแกนเอกสาร + ถ่ายภาพ แทนปุ่ม "เลือกไฟล์" บรรทัดเดียว */}
    <div className='flex flex-col items-start w-full' style={{ gap: 'var(--dim-space-150)' }}>
      <span style={UPLOAD_LABEL}>
        แนบสแกนเอกสารต้นฉบับที่ผู้รับบริการลงนามแล้ว
        <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}> *</span>
      </span>
      <div className='flex items-stretch w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <DragAndDrop
          value={[]}
          onChange={(next) => {
            const picked = next?.[next.length - 1];
            const raw = picked?.file || picked;
            if (raw?.name) handleFile(raw);
          }}
          onError={({ message }) => setFileError(message || 'ไฟล์ไม่ถูกต้อง')}
          accept='.pdf,.jpg,.jpeg,.png,image/jpeg,image/png,application/pdf'
          multiple={false}
          preview={false}
          size='sm'
          title='ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด'
          helper='รองรับ PDF, JPG หรือ PNG'
          ctaLabel='เลือกไฟล์'
          error={!!fileError}
          disabled={uploading}
          style={{ flex: '1 1 0', minWidth: 0, width: '100%', minHeight: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', boxSizing: 'border-box' }}
        />
        <PhotoUploadField
          label='สแกนเอกสาร'
          icon='document_scanner'
          onClick={() => !uploading && setCameraOpen(true)}
          disabled={uploading}
          aria-label='สแกนเอกสารด้วยกล้อง'
          style={{ width: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', flexShrink: 0, boxSizing: 'border-box' }}
        />
        <PhotoUploadField
          label='ถ่ายภาพ'
          icon='photo_camera'
          onClick={() => !uploading && setCameraOpen(true)}
          disabled={uploading}
          aria-label='ถ่ายภาพด้วยกล้อง'
          style={{ width: 'var(--dim-size-2000, 128px)', height: 'var(--dim-size-2000, 128px)', flexShrink: 0, boxSizing: 'border-box' }}
        />
      </div>
      {fileName ? (
        <div
          className='flex items-center w-full min-w-0'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-200)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-300)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
            border: 'var(--dim-stroke-100) solid var(--border-card-default)',
          }}
        >
          <Icon name='description' size={18} color='var(--text-brandPrimary-default)' />
          <span className='flex-1 min-w-0 truncate text-sm'>{fileName}</span>
          <button
            type='button'
            onClick={() => { setFileName(null); setPendingName(null); setUploading(false); }}
            aria-label='ลบไฟล์ที่แนบ'
            style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0, color: 'var(--text-content-tertiary)' }}
          >
            <Icon name='close' size={16} />
          </button>
        </div>
      ) : null}
    </div>
    {uploading && (
      <UploadProgressBox
        progress={uploadProgress}
        label='กำลังอัปโหลดไฟล์…'
        fileName={pendingName || undefined}
      />
    )}
    {fileError && <span style={ERROR_TEXT}>{fileError}</span>}
    </div>
  );

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        /* กว้างขึ้นให้สองช่องบน (ผู้รับบริการ / แบบฟอร์ม) อยู่ครบในบรรทัดเดียว
           และช่องเหตุผลไม่ถูกบีบจนพิมพ์ได้ทีละสองสามคำ (มติผู้ใช้ 25 ส.ค. 69) */
        size='large'
        width={880}
        title='อัปโหลดแบบฟอร์มกระดาษ'
        subtitle={resolvedRecord ? `${resolvedRecord.name} · HN ${resolvedRecord.hn} · ${resolvedRecord.type}` : 'เลือกผู้รับบริการและแบบฟอร์มตามเอกสารต้นฉบับ'}
        primaryAction={{
          label: 'บันทึกการให้ความยินยอม',
          onClick: () => {
            if (!ready) return;
            /* ให้ ConsentFormFillBody คายคำตอบรายข้อออกมาก่อน แล้วค่อยส่งขึ้นไป
               พร้อมกัน — ไม่งั้นผู้เรียกได้แต่ไฟล์แนบ ไม่รู้ว่ายินยอมข้อไหนบ้าง */
            const document = docApi.submit?.() || null;
            onSave({
              mode,
              record: resolvedRecord,
              fileName,
              effectiveDate: thaiDateFormat(effectiveDate),
              reason,
              storageType: 'Paper',
              verifiedBy: 'original_file',
              signature: null,
              document,
            });
          },
          disabled: !ready,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          {!record ? (
            <div
              className='grid w-full min-w-0'
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(var(--dim-size-2400, 240px), 1fr))',
                gap: 'var(--dim-space-400)',
              }}
            >
              <Select
                label='ผู้รับบริการ'
                required
                searchable
                value={selectedHn}
                onChange={pickPatient}
                options={patientOptions}
                placeholder='ค้นหา HN หรือชื่อผู้รับบริการ'
              />
              <Select
                label='แบบฟอร์มความยินยอม'
                required
                searchable
                value={selectedRecordId}
                onChange={setSelectedRecordId}
                options={formOptions}
                disabled={!selectedHn}
                placeholder={selectedHn ? 'เลือกแบบฟอร์มตามเอกสารต้นฉบับ' : 'เลือกผู้รับบริการก่อน'}
              />
            </div>
          ) : null}

          {/* เอกสารฉบับเต็ม — ตัวเดียวกับที่ผู้รับบริการกรอกเอง (มติผู้ใช้
              25 ส.ค. 69) เจ้าหน้าที่จึงเลือกความยินยอมรายข้อตามที่เซ็นมาบน
              กระดาษได้ครบ · ช่องแนบต้นฉบับไปแทนที่บล็อกลายมือชื่อ */}
          {fillFormId ? (
            <ConsentFormFillBody
              key={fillFormId}
              formId={fillFormId}
              initialFullName={resolvedRecord?.name || ''}
              initialHn={resolvedRecord?.hn || ''}
              showSidePanel={false}
              hideSignature
              uploadSlot={uploadSlot}
              onStateChange={setDocApi}
            />
          ) : (
            uploadSlot
          )}

          <DatePicker
            label='วันที่มีผล'
            required
            value={effectiveDate}
            onChange={setEffectiveDate}
            format={thaiDateFormat}
            placeholder='เลือกวันที่เอกสารมีผล'
          />

          <SuggestibleTextarea
            voice
            label='เหตุผล / บันทึกเพิ่มเติม'
            required
            value={reason}
            onChange={(v) => setReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
            placeholder='พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...'
            suggestions={REASON_HINTS}
            minChars={3}
            height={110}
          />

        </div>
      </Popup>

      <CameraCapturePopup
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        /* CameraCapturePopup ส่ง dataURL มาเป็นสตริง ไม่ใช่ File — ต้องแปลงเอง
           แบบเดียวกับ handleCameraCapture ในหน้าสร้างคำขอเข้าถึงข้อมูล */
        onCapture={(dataUrl) => {
          setCameraOpen(false);
          if (!dataUrl) return;
          const comma = dataUrl.indexOf(',');
          const meta = comma >= 0 ? dataUrl.slice(0, comma) : '';
          const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
          const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png';
          const bin = atob(b64);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
          handleFile(new File([bytes], 'camera-scan.png', { type: mime }));
        }}
      />

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ยืนยันการละทิ้งการแก้ไข'
        description='ไฟล์แนบและข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ยืนยัน'
        cancelLabel='ยกเลิก'
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
