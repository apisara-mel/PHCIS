import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import FileUploadField from '@/components/forms/FileUploadField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { getConsentChannelOptions } from '@/data/consentChannels';
import { CONSENT_TYPE_TONE } from '@/data/consentRecords';
import { getConsentRecords } from '@/data/consentWorkflowStore';
import { resolveConsentPatient } from '@/data/consentPatientDisplay';
import { CONSENT_FORM_RECORDS, CONSENT_FORM_STATUS } from '@/data/consentFormRecords';

/* Helper popups ของ ConsentManagementPage — แตกไฟล์ตาม playbook (ห้ามรื้อ /
   ทำให้หน้าเดิม diff ใหญ่เกิน):

     • CreateConsentRequestPopup — ด.1.1.4 + ด.1.1.6 workflow สร้างคำขอ
       ความยินยอม: เลือกผู้ป่วย (ค้น HN) → เทมเพลต+เวอร์ชันล่าสุด → ช่องทาง
       ลงนาม (ที่ศูนย์บริการ · Mobile App) → วันครบกำหนด
     • ReconsentPopup — ด.1.1.7 Re-Consent ครบวงจร: เลือกช่องทาง + วันครบ
       ก่อนสร้าง record รอลงนามเวอร์ชันล่าสุด
     • PaperConsentRecordPopup — ด.1.1.8 เจ้าหน้าที่บันทึกให้/เพิกถอนจาก
       เอกสารกระดาษ: แนบสแกน + วันที่มีผล + เหตุผล + ConsentAuditBar

   ทุก popup มี guard "ละทิ้งการแก้ไข?" เมื่อปิดกลางทาง. ค่า visual ทุกตัว
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

/* ── ช่องทางลงนาม — radio tiles (ด.1.1.6 · 2 ช่องทาง) ───────────────────── */
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
          className='flex flex-col items-start text-left'
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
            transition: 'border-color 120ms ease, background-color 120ms ease',
          }}
        >
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)' }}>
            <Icon name={c.icon} size={18} />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>{c.label}</span>
          </span>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.4 }}>{c.hint}</span>
        </button>
      );
    })}
  </div>
  );
};

/* ── รายชื่อผู้ป่วย (unique จาก worklist) ─────────────────────────────── */
const PATIENT_POOL = (() => {
  const seen = new Set();
  return getConsentRecords().filter((r) => {
    if (seen.has(r.hn)) return false;
    seen.add(r.hn);
    return true;
  }).map((r) => {
    const patient = resolveConsentPatient(r.hn, r.name);
    return { hn: r.hn, name: patient.name, guardian: r.guardian };
  });
})();

/* เทมเพลตที่เผยแพร่แล้วเท่านั้น + เวอร์ชันล่าสุดของแต่ละใบ */
const TEMPLATE_OPTIONS = CONSENT_FORM_RECORDS
  .filter((r) => (CONSENT_FORM_STATUS[r.status] || {}).tab === 'published')
  .map((r) => ({ value: String(r.id), label: `${r.code} · ${r.name} (${r.version})`, record: r }));

/* ══ 1) สร้างคำขอความยินยอม (ด.1.1.4 / ด.1.1.6) ══════════════════════════ */
export function CreateConsentRequestPopup({ open, onClose, onCreate }) {
  const [query, setQuery] = useState('');
  const [patient, setPatient] = useState(null);
  const [templateId, setTemplateId] = useState('');
  const [channel, setChannel] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [touched, setTouched] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery(''); setPatient(null); setTemplateId(''); setChannel('');
    setDueDate(null); setTouched(false); setConfirmDiscard(false);
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PATIENT_POOL.filter((p) => p.hn.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const template = TEMPLATE_OPTIONS.find((t) => t.value === templateId)?.record || null;
  const dirty = touched && (query || patient || templateId || channel || dueDate);
  const ready = !!patient && !!template && !!channel && !!dueDate;

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const create = () => {
    if (!ready) return;
    onCreate({
      patient,
      template,
      channel,
      dueDate: thaiDateFormat(dueDate),
    });
  };

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        size='large'
        title='สร้างคำขอความยินยอม'
        subtitle='เลือกผู้ป่วย เทมเพลต ช่องทางลงนาม และวันครบกำหนด — ระบบจะสร้างรายการสถานะ "รอลงนาม"'
        primaryAction={{ label: 'สร้างคำขอ', onClick: create, disabled: !ready }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          {/* 1. ผู้ป่วย */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={LABEL_TEXT}>1. ผู้ป่วย <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span></span>
            {patient ? (
              <div
                className='flex items-center w-full'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                  borderRadius: 'var(--dim-radius-300)',
                }}
              >
                <Icon name='person' size={18} color='var(--text-brandPrimary-default)' />
                <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', flex: 1 }}>
                  <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{patient.name}</span> · HN {patient.hn}
                  {patient.guardian ? ` · ผู้แทน: ${patient.guardian}` : ''}
                </span>
                <button
                  type='button'
                  onClick={() => { setPatient(null); setQuery(''); }}
                  aria-label='เปลี่ยนผู้ป่วย'
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-content-tertiary)', padding: 0 }}
                >
                  <Icon name='close' size={16} />
                </button>
              </div>
            ) : (
              <>
                <InputField
                  showLabel={false}
                  value={query}
                  onChange={(v) => { setQuery(v); setTouched(true); }}
                  placeholder='ค้นหาด้วย HN หรือชื่อผู้ป่วย เช่น 67-00008'
                  leadingIcon='search'
                />
                {query.trim() && matches.length === 0 && (
                  <span style={ERROR_TEXT}>ไม่พบผู้ป่วย — ตรวจสอบ HN หรือชื่ออีกครั้ง</span>
                )}
                {matches.length > 0 && (
                  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)' }}>
                    {matches.map((p) => (
                      <button
                        key={p.hn}
                        type='button'
                        onClick={() => setPatient(p)}
                        className='flex items-center text-left w-full'
                        style={{
                          gap: 'var(--dim-space-300)',
                          paddingTop: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-300)',
                          paddingBottom: 'var(--dim-space-200)', paddingLeft: 'var(--dim-space-300)',
                          background: 'var(--surface-card-100)',
                          border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                          borderRadius: 'var(--dim-radius-200)',
                          cursor: 'pointer',
                        }}
                      >
                        <Icon name='person' size={16} color='var(--text-content-tertiary)' />
                        <span style={BODY_TEXT}>{p.name} · HN {p.hn}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 2. เทมเพลต + เวอร์ชันล่าสุด */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <Select
              label='2. เทมเพลตความยินยอม (เวอร์ชันล่าสุดที่เผยแพร่)'
              required
              options={TEMPLATE_OPTIONS}
              value={templateId}
              onChange={(v) => { setTemplateId(v); setTouched(true); }}
              placeholder='เลือกแบบฟอร์มความยินยอม'
            />
            {template && (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                <ColorfulBadge style={CONSENT_TYPE_TONE[template.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{template.type}</ColorfulBadge>
                <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{template.version}</ColorfulBadge>
                <span style={{ ...BODY_TEXT, fontSize: 'var(--type-size-xs)' }}>ใช้เวอร์ชันล่าสุดโดยอัตโนมัติ (Version Control — ด.1.1.5)</span>
              </div>
            )}
          </div>

          {/* 3. ช่องทางลงนาม */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={LABEL_TEXT}>3. ช่องทางลงนาม <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span></span>
            <ChannelTiles value={channel} onChange={(v) => { setChannel(v); setTouched(true); }} />
          </div>

          {/* 4. วันครบกำหนด — ห้ามย้อนหลัง */}
          <DatePicker
            label='4. วันครบกำหนดลงนาม'
            required
            value={dueDate}
            onChange={(d) => { setDueDate(d); setTouched(true); }}
            format={thaiDateFormat}
            minDate={new Date()}
            placeholder='เลือกวันครบกำหนด'
            helperText='เลือกได้เฉพาะวันนี้เป็นต้นไป — วันย้อนหลังถูกปิดไว้'
          />

          {!ready && touched && (
            <span style={ERROR_TEXT}>กรอกให้ครบ: ผู้ป่วย · เทมเพลต · ช่องทาง · วันครบกำหนด จึงจะสร้างคำขอได้</span>
          )}
        </div>
      </Popup>

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ละทิ้งการแก้ไข?'
        description='ข้อมูลคำขอที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ละทิ้ง'
        cancelLabel='กรอกต่อ'
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}

/* ══ 2) Re-Consent (ด.1.1.7) ═════════════════════════════════════════════ */
export function ReconsentPopup({ open, record, onClose, onConfirm }) {
  const [channel, setChannel] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChannel(''); setDueDate(null); setConfirmDiscard(false);
  }, [open]);

  /* เวอร์ชันล่าสุดของเทมเพลตประเภทเดียวกัน (ถ้าเจอ) */
  const latest = useMemo(() => {
    if (!record) return null;
    return CONSENT_FORM_RECORDS.find((f) => f.type === record.type && (CONSENT_FORM_STATUS[f.status] || {}).tab === 'published') || null;
  }, [record]);

  const dirty = !!channel || !!dueDate;
  const ready = !!channel && !!dueDate;

  /* guard "ละทิ้งการแก้ไข?" — pattern เดียวกับ CreateConsentRequestPopup */
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
        title='ส่งคำขอความยินยอมใหม่ (Re-Consent)'
        subtitle={record ? `${record.name} · HN ${record.hn} · ${record.type}` : undefined}
        primaryAction={{
          label: 'สร้างคำขอ Re-Consent',
          onClick: () => ready && onConfirm({ channel, dueDate: thaiDateFormat(dueDate), latestVersion: latest ? latest.version : record?.version }),
          disabled: !ready,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          <span style={BODY_TEXT}>
            record เดิมจะย้ายเป็นสถานะ <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>หมดอายุ-Reconsent</ColorfulBadge>{' '}
            และระบบจะสร้างรายการใหม่สถานะ &ldquo;รอลงนาม&rdquo; ด้วยเวอร์ชันล่าสุด{' '}
            {latest ? <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{latest.version}</ColorfulBadge> : null}
          </span>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={LABEL_TEXT}>ช่องทางลงนาม <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span></span>
            <ChannelTiles value={channel} onChange={setChannel} />
          </div>
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
        title='ละทิ้งการแก้ไข?'
        description='ช่องทางลงนามและวันครบกำหนดที่เลือกไว้จะไม่ถูกบันทึก'
        confirmLabel='ละทิ้ง'
        cancelLabel='กรอกต่อ'
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
  const [fileError, setFileError] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('grant'); setFileName(null); setFileError('');
    setEffectiveDate(null); setReason(''); setConfirmDiscard(false);
  }, [open]);

  const handleFile = (file) => {
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!okType) { setFileError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG'); setFileName(null); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError('ไฟล์ต้องไม่เกิน 10 MB'); setFileName(null); return; }
    setFileError('');
    setFileName(file.name);
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
            onClear={() => setFileName(null)}
          />
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
        title='ละทิ้งการแก้ไข?'
        description='ไฟล์แนบและข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ละทิ้ง'
        cancelLabel='กรอกต่อ'
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
