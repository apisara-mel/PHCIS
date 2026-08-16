import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import DatePicker from '@/components/forms/DatePicker';
import FileUploadField from '@/components/forms/FileUploadField';
import { UploadProgressBox, useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
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
       เอกสารกระดาษ: แนบสแกน + วันที่มีผล + เหตุผล + ConsentAuditBar

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
      size='large'
      title='สร้างคำขอเข้าถึงแบบฟอร์มยินยอม'
      primaryAction={{ label: 'ส่งคำขอสิทธิ์เข้าถึงแบบฟอร์ม', onClick: () => formApi.submit(), disabled: !formApi.ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: () => (formApi.dirty ? formApi.requestCancel() : onClose()) }}
    >
      <AccessRequestForm
        key={open ? 'open' : 'closed'}
        showFooter={false}
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

/* ══ 3) บันทึกจากเอกสารกระดาษ (ด.1.1.8) ═════════════════════════════════ */
const PAPER_MODES = [
  { value: 'grant',  label: 'บันทึกการให้ความยินยอม',  icon: 'task_alt' },
  { value: 'revoke', label: 'บันทึกการเพิกถอน',        icon: 'do_not_disturb_on' },
];
const REASON_HINTS = [
  'ผู้ป่วยยื่นเอกสารเพิกถอนความยินยอมด้วยตนเองที่ศูนย์บริการ',
  'ผู้ปกครองยื่นหนังสือให้ความยินยอมแทนผู้เยาว์',
  'รับเอกสารความยินยอมฉบับกระดาษจากหน่วยบริการเครือข่าย',
];

export function PaperConsentRecordPopup({ open, record, onClose, onSave }) {
  const [mode, setMode] = useState('grant');
  const [fileName, setFileName] = useState(null);
  const [pendingName, setPendingName] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('grant'); setFileName(null); setPendingName(null); setUploading(false);
    setFileError(''); setEffectiveDate(null); setReason(''); setConfirmDiscard(false);
  }, [open]);

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

  const dirty = fileName || effectiveDate || reason.trim();
  const ready = !!fileName && !!effectiveDate && reason.trim().length > 0;

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
        title='บันทึกจากเอกสารกระดาษ'
        subtitle={record ? `${record.name} · HN ${record.hn} · ${record.type}` : 'บันทึกให้/เพิกถอนความยินยอมจากเอกสารของเจ้าของข้อมูล'}
        primaryAction={{
          label: mode === 'grant' ? 'บันทึกการให้ความยินยอม' : 'บันทึกการเพิกถอน',
          onClick: () => ready && onSave({ mode, fileName, effectiveDate: thaiDateFormat(effectiveDate), reason }),
          disabled: !ready,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          {/* ประเภทการบันทึก */}
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {PAPER_MODES.map((m) => {
              const selected = mode === m.value;
              return (
                <button
                  key={m.value}
                  type='button'
                  aria-pressed={selected}
                  onClick={() => setMode(m.value)}
                  className='inline-flex items-center'
                  style={{
                    flex: '1 1 200px',
                    gap: 'var(--dim-space-200)',
                    paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-300)',
                    border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-card-default)'}`,
                    background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                    color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <Icon name={m.icon} size={18} />
                  {m.label}
                </button>
              );
            })}
          </div>

          <FileUploadField
            label='แนบสแกนเอกสาร (ให้/เพิกถอนความยินยอม)'
            helperText={fileError || 'PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB'}
            accept='.pdf,.jpg,.jpeg,.png'
            buttonLabel='เลือกไฟล์สแกน'
            fileName={fileName}
            onFile={handleFile}
            onClear={() => { setFileName(null); setPendingName(null); setUploading(false); }}
            disabled={uploading}
          />
          {uploading && (
            <UploadProgressBox
              progress={uploadProgress}
              label='กำลังอัปโหลดไฟล์…'
              fileName={pendingName || undefined}
            />
          )}
          {fileError && <span style={ERROR_TEXT}>{fileError}</span>}

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

          {/* Audit ตาม TOR 1.4.3.16 — แสดง ณ จุดบันทึก */}
          <ConsentAuditBar recordedBy={STAFF_NAME} recordedAt={nowThai()} />
        </div>
      </Popup>

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
