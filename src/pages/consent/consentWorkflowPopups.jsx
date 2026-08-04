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
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { useClinicFilter } from '@/components/layout/HeaderClinicContext';
import { getConsentChannelOptions, MOBILE_APP_CHANNEL } from '@/data/consentChannels';
import { CONSENT_TYPE_TONE, CONSENT_STATUS } from '@/data/consentRecords';
import { getConsentRecords } from '@/data/consentWorkflowStore';
import { resolveConsentPatient, resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  consentPatientSearchSuggestions,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
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

const CREATE_REQUEST_SEARCH_HISTORY_KEY = 'mih:primarysearch-history:consent-create-request';
const CREATE_REQUEST_SEARCH_SEED = consentPatientSearchHistorySeed(4);

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
  const {
    history: searchHistory,
    push: pushHistory,
    clear: clearHistory,
  } = useSearchHistory(CREATE_REQUEST_SEARCH_HISTORY_KEY, {
    seedIfEmpty: CREATE_REQUEST_SEARCH_SEED,
  });

  useEffect(() => {
    if (!open) return;
    setQuery(''); setPatient(null); setTemplateId(''); setChannel('');
    setDueDate(null); setTouched(false); setConfirmDiscard(false);
  }, [open]);

  const suggestions = useMemo(
    () => consentPatientSearchSuggestions(query),
    [query],
  );

  const template = TEMPLATE_OPTIONS.find((t) => t.value === templateId)?.record || null;
  const dirty = touched && (query || patient || templateId || channel || dueDate);
  const ready = !!patient && !!template && !!channel && !!dueDate;

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const pickPatient = (p, item) => {
    if (!p) return;
    const fromPool = PATIENT_POOL.find((x) => x.hn === p.hn);
    setPatient({
      hn: p.hn,
      name: p.name || p.label,
      guardian: fromPool?.guardian || null,
    });
    setQuery('');
    setTouched(true);
    pushHistory(item || toConsentPatientSearchItem(p));
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
                <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>{patient.hn}</ColorfulBadge>
                <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', flex: 1 }}>
                  <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{patient.name}</span>
                  {patient.guardian ? ` · ผู้แทน: ${patient.guardian}` : ''}
                </span>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='close'
                  onClick={() => { setPatient(null); setQuery(''); }}
                >
                  เปลี่ยน
                </NeutralSubdueButton>
              </div>
            ) : (
              <div className='w-full flex items-start justify-center'>
                <PrimarySearch
                  value={query}
                  onChange={(v) => { setQuery(v); setTouched(true); }}
                  onSubmit={(label, item) => {
                    const found = (item?.id && CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === item.id))
                      || CONSENT_PATIENT_SEARCH_POOL.find((p) =>
                        p.label === label || p.name === label || p.hn === label)
                      || (() => {
                        const hit = PATIENT_POOL.find((p) => p.hn === label || p.name === label);
                        return hit ? CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === hit.hn) : null;
                      })();
                    if (found) pickPatient(found, item);
                    else setQuery(label);
                  }}
                  suggestions={suggestions}
                  history={searchHistory}
                  onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
                  placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
                  width={640}
                  scrollOffsetTop={null}
                />
              </div>
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
              <MetaRow label='ประเภท Consent'>
                <ColorfulBadge
                  style={CONSENT_TYPE_TONE[record.type] || 'grey'}
                  size='small'
                  hierarchy='secondary'
                  width='hug'
                >
                  {record.type || '—'}
                </ColorfulBadge>
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
        title='ละทิ้งการแก้ไข?'
        description='วันครบกำหนดที่เลือกไว้จะไม่ถูกบันทึก'
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
