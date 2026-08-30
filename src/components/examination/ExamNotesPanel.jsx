import React, { useState } from 'react';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import Select from '@/components/forms/Select';
import { getCarriedScreening } from '@/data/screeningHandoff';
import { activeFlagsFor } from '@/data/treatmentPatientFlags';
import { growthBandsFor, mophZoneFor } from '@/data/treatmentVaccines';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Tooltip from '@/components/tooltip/Tooltip';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  CHIEF_COMPLAINT_SUGGESTIONS,
  PRESENT_ILLNESS_SUGGESTIONS,
  PHYSICAL_EXAM_SUGGESTIONS,
} from '@/pages/opd/ScreeningPage';

/* MIH ExamNotesPanel — Figma PHCIS | Medical-examination 151:36633 (บันทึกการตรวจ).
   Nurse read-only column with copy-to-doctor affordance + physician textareas
   + diagnosis attachment upload zone. `embedded` drops outer section chrome when
   nested inside the Step 3 exam card. */

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

/* X Button — Figma "x button" (MIH-Design-System-Foundation 3393:1072).
   Neutral close glyph: 32×32, transparent default, neutral/100 hover fill
   (`--surface-neutralButton-quaternary-hover` = #F4F5F5 — matches the
   Figma `background/neutral/tertiary` alias), no border, no scale on
   press. Mirrors Alert's inline CloseButton pattern but uses the neutral
   token set so it can sit on any surface (here: an attachment chip). */
const XCloseButton = ({ ariaLabel, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--dim-radius-200)',
        background: hover ? 'var(--surface-neutralButton-quaternary-hover)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--icon-neutralButton-default)',
        transition: 'background-color 150ms ease',
      }}
    >
      <span
        className='material-symbols-outlined'
        style={{
          fontFamily: 'Material Symbols Outlined',
          fontSize: 16,
          lineHeight: 1,
          display: 'inline-flex',
        }}
        aria-hidden
      >
        close
      </span>
    </button>
  );
};

/* Nurse → doctor copy row (Figma PHCIS | Medical-examination 151:36633).
   Mirrors the screening-page HistoryEntry copy contract (Figma 162:17951 ·
   `HistoryListForm.HistoryEntry`): the `+` glyph becomes a `check` tick
   when the doctor field already contains the nurse's value. This is a
   **controlled visual** — the parent derives `copied` from the live doctor
   notes, so re-editing or clearing the doctor field automatically reverts
   the icon. Re-copying is still allowed when copied (re-fires onCopy and
   announces via aria-live), matching the screening row. */
/* ปุ่มคัดลอกแบบจาง — ไอคอนอย่างเดียว ไม่มีพื้น เข้มขึ้นเมื่อชี้
   คัดลอกลงคลิปบอร์ดเฉย ๆ ไม่วางลงช่องของแพทย์ให้เอง — หมอเลือกเองว่าจะวางที่ไหน
   (มติผู้ใช้ 28 ส.ค. 69) ติ๊กถูก 1.5 วินาทีเป็นสัญญาณว่าคัดลอกแล้ว */
const CopyIconButton = ({ label, text }) => {
  const [hover, setHover] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch (err) {
      /* คลิปบอร์ดถูกปิด (http หรือผู้ใช้ไม่อนุญาต) — ยังติ๊กถูกให้เห็นว่ากดแล้ว */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type='button'
      onClick={handleCopy}
      aria-label={label}
      title={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='shrink-0 inline-flex items-center justify-center'
      style={{
        width: 24,
        height: 24,
        borderRadius: 'var(--dim-radius-200)',
        border: 'none',
        background: hover ? 'var(--surface-neutral-quaternary)' : 'transparent',
        color: (hover || copied)
          ? 'var(--icon-brandPrimary-default, #007549)'
          : 'var(--icon-neutral-quaternary, #C6CBD0)',
        cursor: 'pointer',
      }}
    >
      <Icon name={copied ? 'check' : 'content_copy'} size={14} />
    </button>
  );
};

const NurseCopyRow = ({ label, value, copied = false, copyDisabled = false, onCopy }) => {
  const [liveStamp, setLiveStamp] = useState(0);
  const handleCopy = () => {
    if (copyDisabled) return;
    onCopy?.();
    setLiveStamp((k) => k + 1);
  };
  return (
    <div
      className='flex items-center w-full'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-400)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        background: 'var(--surface-card-100)',
      }}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
        <span style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
        }}
        >
          {label}
        </span>
        <span style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
        }}
        >
          {value || '—'}
        </span>
      </div>
      <div className='relative shrink-0 flex flex-col items-end' style={{ gap: 'var(--dim-space-100)' }}>
        <Tooltip
          position='top'
          maxWidth={280}
          content={
            copyDisabled
              ? 'ไม่มีข้อมูลจากพยาบาลให้คัดลอก'
              : copied
                ? 'คลิกเพื่อคัดลอกซ้ำอีกครั้ง'
                : undefined
          }
        >
          <BrandCircleSubdueIconButton
            type='button'
            variant='fill'
            size='sm'
            visualActive={copied}
            disabled={copyDisabled}
            icon={copied ? 'check' : 'content_copy'}
            aria-label={
              copyDisabled
                ? `คัดลอก${label} — ไม่มีข้อมูลจากพยาบาล`
                : copied
                  ? `คัดลอก${label}ไปยังบันทึกของแพทย์อีกครั้ง`
                  : `คัดลอก${label}ไปยังบันทึกของแพทย์`
            }
            onClick={handleCopy}
          />
        </Tooltip>
        <div className='sr-only' aria-live='polite' aria-atomic='true'>
          {copied ? <span key={liveStamp}>คัดลอกไปยังบันทึกของแพทย์แล้ว</span> : null}
        </div>
      </div>
    </div>
  );
};

const AttachmentCard = ({ file, onRemove }) => (
  <div
    className='inline-flex items-center flex-1 min-w-0'
    style={{
      gap: 'var(--dim-space-300)',
      minHeight: 80,
      maxWidth: 320,
      padding: 'var(--dim-space-400)',
      background: 'var(--surface-formbuilder-card)',
      border: 'var(--dim-stroke-100) solid var(--border-formbuilder-filled)',
      borderRadius: 'var(--dim-radius-200)',
      boxShadow: 'var(--shadow-formbuilder, 0 1px 2px rgba(100,116,139,0.1))',
    }}
  >
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
        fontSize: 18,
      }}
      aria-hidden
    >
      📄
    </span>
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
      <span style={{
        color: 'var(--text-formbuilder-text)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      >
        {file.name}
      </span>
      <span style={{
        color: 'var(--text-formbuilder-subtext)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}
      >
        {formatBytes(file.sizeBytes)}
      </span>
    </div>
    <XCloseButton ariaLabel={`ลบ ${file.name}`} onClick={onRemove} />
  </div>
);


/* 1 วัน → 1 ปี — ถี่ช่วงต้น (วัน) แล้วห่างขึ้นเรื่อย ๆ ตามที่หมอถามจริง */
export const SYMPTOM_DURATION_OPTIONS = [
  '1 วัน', '2 วัน', '3 วัน', '4 วัน', '5 วัน', '6 วัน',
  '1 สัปดาห์', '2 สัปดาห์', '3 สัปดาห์',
  '1 เดือน', '2 เดือน', '3 เดือน', '4 เดือน', '5 เดือน', '6 เดือน',
  '7 เดือน', '8 เดือน', '9 เดือน', '10 เดือน', '11 เดือน',
  '1 ปี',
].map((v) => ({ value: v, label: v }));

/* Each doctor textarea drives a SuggestibleTextarea + VoiceTextarea
   (Figma 162:24221 popover · 3280:3970 voice toolbar). `voice` swaps
   the inner field for VoiceTextarea so dictation + language picker are
   one click away; the suggestion popover still anchors below the typed
   glyph row. `duration` uses minChars=1 — durations often start with a
   single digit (matches the ScreeningPage DURATION_SUGGESTIONS usage). */
const DOCTOR_FIELDS = [
  {
    key: 'cc',
    label: 'อาการ (Chief Complaint)',
    required: true,
    height: 104,
    minHeight: 88,
    suggestions: CHIEF_COMPLAINT_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำอาการ',
  },
  {
    key: 'pi',
    label: 'ประวัติการเจ็บป่วยปัจจุบัน (Present Illness)',
    required: true,
    height: 104,
    minHeight: 88,
    suggestions: PRESENT_ILLNESS_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำประวัติการเจ็บป่วยปัจจุบัน',
  },
  {
    key: 'duration',
    label: 'ระยะเวลาที่มีอาการ',
    required: true,
    /* เป็นดรอปดาวน์ ไม่ใช่ช่องพิมพ์ — ระยะเวลาเป็นค่าที่เลือกจากชุดเดียวกันทุกครั้ง
       การพิมพ์อิสระทำให้ได้ "3วัน" "3 วัน" "สามวัน" ปนกันจนสรุปสถิติไม่ได้
       (มติผู้ใช้ 28 ส.ค. 69) */
    control: 'select',
    options: SYMPTOM_DURATION_OPTIONS,
  },
  {
    key: 'pe',
    label: 'ตรวจร่างกาย (Physical Examination)',
    required: true,
    height: 120,
    minHeight: 96,
    suggestions: PHYSICAL_EXAM_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำผลตรวจร่างกาย',
  },
];


const Field = ({ label, required, children }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
    <span style={{
      color: 'var(--text-content-default)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
    }}
    >
      {label}
      {required && (
        <span style={{ color: 'var(--text-input-require)', marginLeft: 'var(--dim-space-050)' }}>*</span>
      )}
    </span>
    {children}
  </div>
);

/* หนึ่งบรรทัดในคอลัมน์ "บันทึกจากพยาบาล" — `row` = [label, value, tone?]
   ถ้ามี `tone` ค่าจะแสดงเป็น ColorfulBadge สีตามระดับแทนข้อความเปล่า ส่วนข้อความ
   ที่คัดลอกยังเป็น "หัวข้อ: ค่า" เหมือนกันทั้งสองแบบ */
/* โทนป้ายระดับความรุนแรง — ไล่จากแดงลงมา ให้กวาดตาเจอตัวรุนแรงก่อน */
const SEVERITY_TONE = { มาก: 'red', รุนแรง: 'red', ปานกลาง: 'orange', 'เล็กน้อย': 'yellow' };

/* หัวข้อบล็อกต้องเด่นกว่าเนื้อหาในบล็อก (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมเป็น
   xs สีเทาอ่อน เล็กและจางกว่าค่าที่มันครอบอยู่ กวาดตาลงมาจึงหาไม่เจอว่าบล็อก
   ใหม่เริ่มตรงไหน · ตอนนี้ sm + ตัวหนา + สีข้อความหลัก และมีเส้นคั่นใต้หัวข้อ */
const BLOCK_TITLE_STYLE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-heading-content)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 1.5,
  paddingBottom: 'var(--dim-space-200)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
};

/* หนึ่งรายการที่พยาบาลซักไว้ — ชื่อเป็นบรรทัดของตัวเอง ระดับ/ความน่าจะเป็นเป็นป้าย
   ส่วนอาการกับหมายเหตุแยกบรรทัดชิดซ้าย อ่านไล่ลงมาได้ */
const NurseRecord = ({ record }) => (
  <div
    className='flex flex-col w-full'
    style={{
      gap: 'var(--dim-space-100)',
      paddingTop: 'var(--dim-space-200)',
      paddingBottom: 'var(--dim-space-200)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
      <span className='flex-1 min-w-0' style={{
        color: 'var(--text-content-primary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
      }}>
        {record.name}
      </span>
      {record.severity && (
        <ColorfulBadge style={SEVERITY_TONE[record.severity] || 'grey'} size='small' hierarchy='secondary'>
          {record.severity}
        </ColorfulBadge>
      )}
      {(record.probability || record.status) && (
        <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
          {record.probability || record.status}
        </ColorfulBadge>
      )}
      <CopyIconButton
        label={`คัดลอก ${record.name}`}
        text={`${record.name}: ${[record.severity, record.probability || record.status, record.symptom, record.note].filter(Boolean).join(' · ')}`}
      />
    </div>
    {record.symptom && (
      <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
        {record.symptom}
      </span>
    )}
    {record.note && (
      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>
        {record.note}
      </span>
    )}
  </div>
);

/* หนึ่งแถวเป็นกริดสามช่อง: ป้ายกว้างคงที่ · ค่าชิดซ้าย · ปุ่มคัดลอก
   (มติผู้ใช้ 31 ส.ค. 69) ของเดิมดันค่าไปชิดขวาด้วย `ml-auto` ทุกแถวจึงเริ่ม
   คนละตำแหน่ง กวาดตาอ่านลงมาไม่เป็นแนว และค่าที่ยาวจนขึ้นบรรทัดใหม่ (เช่น
   "บันทึกเพิ่มเติม") ยิ่งอ่านยาก · ป้ายกว้างคงที่ทำให้ค่าทุกแถวเริ่มตรงคอลัมน์
   เดียวกันทั้งการ์ด ไม่ใช่ตามความยาวป้ายของแต่ละแถว */
const NURSE_ROW_LABEL_WIDTH = 148;

const NurseRow = ({ row }) => {
  const [label, value, tone] = row;
  return (
    <div
      className='grid w-full items-start'
      style={{
        gridTemplateColumns: `${NURSE_ROW_LABEL_WIDTH}px minmax(0, 1fr) auto`,
        columnGap: 'var(--dim-space-200)',
      }}
    >
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}>{label}</span>
      {tone ? (
        <span className='flex min-w-0'>
          <ColorfulBadge style={tone} size='small' hierarchy='secondary'>{value}</ColorfulBadge>
        </span>
      ) : (
        <span className='min-w-0' style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
          textAlign: 'left',
          overflowWrap: 'anywhere',
        }}>{value}</span>
      )}
      {/* คัดลอกได้ทีละหัวข้อ ไม่ใช่เฉพาะทั้งบล็อก */}
      <CopyIconButton label={`คัดลอก ${label}`} text={`${label}: ${value}`} />
    </div>
  );
};

const ExamNotesPanel = ({
  nurseNotes = {},
  doctorNotes = {},
  attachments = [],
  /** ใช้ดึงผลคัดกรองมาแสดงในคอลัมน์ซ้ายให้ครบทุกหัวข้อ */
  patient = null,
  /** ผลที่ระบบมีอยู่แล้วและถูกติ๊กให้แนบไปกับบันทึก — { lab, imaging } */
  linkedResults = {},
  onLinkedResultsChange,
  onDoctorChange,
  onCopyFromNurse,
  onAttachmentsChange,
  onRemoveAttachment,
  embedded = false,
  className = '',
}) => {
  /* SuggestibleTextarea emits DOM-event-shaped onChange — extract value. */
  const setDoctorFromEvent = (key) => (e) =>
    onDoctorChange?.({ ...doctorNotes, [key]: e?.target?.value ?? '' });

  /* คอลัมน์ซ้ายต้องเห็น "ทุกอย่างที่พยาบาลบันทึกไว้" ไม่ใช่แค่ 4 ช่องที่คัดลอกได้
     — สัญญาณชีพ · อาการป่วย · ความเร่งด่วน · Pain score · คำสั่งการพยาบาล ·
     สิ่งที่จุดคัดกรองระบุไว้ · เตียงสังเกตอาการ (มติผู้ใช้ 28 ส.ค. 69) */
  const screening = getCarriedScreening(patient || {});

  /* "ระบุว่าไม่มี" ต้องขึ้นเป็นบรรทัด ไม่ใช่หายไปเฉย ๆ — หมอต้องอ่านออกว่า
     พยาบาลถามแล้วและได้คำตอบ ต่างจากหมวดที่ยังไม่ได้ซัก (ซึ่งไม่ขึ้นเลย) */
  /* แท็บซักประวัติส่งรายการดิบมาให้ `NurseRecord` วาดเอง (มติผู้ใช้ 31 ส.ค. 69) —
     ของเดิมยัดทุกอย่างเป็นข้อความยาวบรรทัดเดียวชิดขวา ระดับ/ความน่าจะเป็น/อาการ
     ปนกันจนอ่านไม่ออกว่าอันไหนคืออะไร */
  const historyBlock = (title, topic) => {
    const records = topic?.records || [];
    if (records.length === 0 && topic?.denied) {
      return { title, rows: [['ผลการซักประวัติ', 'ซักแล้ว — ระบุว่าไม่มี']] };
    }
    return { title, records };
  };

  const behaviour = screening.behaviour || null;
  const vitalRound = screening.vitalRound;

  /* ข้อมูลที่มาจากหน้าเวชระเบียน (มติผู้ใช้ 31 ส.ค. 69) — คอลัมน์ซ้ายเคยมีแต่ผล
     คัดกรองของวันนี้ ทั้งที่ทะเบียนผู้ป่วยถือข้อมูลที่หมอต้องอ่านก่อนลงมือหลายอย่าง
     (ธงผู้ป่วย · สิทธิ · การเคลื่อนไหว · ผู้ติดต่อฉุกเฉิน · ประวัติแพ้/โรคประจำตัว
     ที่บันทึกไว้ในทะเบียน ไม่ใช่ที่ซักวันนี้) `patient` ที่หน้าส่งมาคือเรกคอร์ด
     เวชระเบียนที่ merge ธงแล้ว จึงอ่านได้ตรง ๆ */
  const registryFlags = activeFlagsFor(patient) || [];
  /* เหลือเฉพาะ "ธงผู้ป่วยจากเวชระเบียน" (มติผู้ใช้ 31 ส.ค. 69) — บล็อก
     "ข้อมูลทะเบียนผู้ป่วย" (สิทธิ · หมู่เลือด · การเคลื่อนไหว · อาชีพ · โทรศัพท์)
     และ "ผู้ติดต่อกรณีฉุกเฉิน" ถูกเอาออก ทั้งสองชุดเป็นข้อมูลทะเบียนที่การ์ด
     ผู้ป่วยด้านบนกับป๊อปอัปเวชระเบียนถืออยู่แล้ว ไม่ใช่ผลคัดกรองของรอบนี้
     ที่คอลัมน์นี้มีไว้ให้อ่าน */
  const registryBlocks = [
    {
      title: 'ธงผู้ป่วยจากเวชระเบียน',
      rows: registryFlags.map((f) => [f.label, patient?.flagSources?.[f.key] || 'บันทึกไว้ในทะเบียน']),
    },
  ].filter((b) => b.rows.length > 0);

  /* ToR ผนวก ก ๑.๒.๒.๕ — ผู้ที่อายุต่ำกว่า 18 ปี อ่านภาวะโภชนาการจาก "กราฟการ
     เจริญเติบโต" ส่วนตั้งแต่ 18 ปีขึ้นไปอ่านจาก BMI · สามหัวข้อนี้ขึ้นเสมอไม่ว่า
     จะมีค่าหรือไม่ (มติผู้ใช้ 31 ส.ค. 69) — หัวข้อที่หายไปเงียบ ๆ อ่านไม่ออกว่า
     "ไม่เข้าเกณฑ์" หรือ "ยังไม่ได้วัด" ค่าที่ยังไม่มีจึงขึ้นขีดแทน
     เกณฑ์เทียบใช้ `mophZoneFor` ตัวเดียวกับคลินิกวัคซีนและการ์ดภาวะโภชนาการของ
     จุดคัดกรอง — ไม่ตัดสินซ้ำที่นี่ */
  const NO_VALUE = '—';
  const ageYears = parseInt(patient?.age, 10);
  const isChild = Number.isFinite(ageYears) && ageYears > 0 && ageYears < 18;
  const rawVitals = screening.vitalRaw || {};
  const growthSex = patient?.sex || patient?.gender;
  const growthZone = (metric, value) => (
    isChild && Number.isFinite(value) && value > 0
      ? mophZoneFor(metric, growthBandsFor(growthSex, metric), ageYears, value)?.label || ''
      : ''
  );
  const weightZone = growthZone('weight', rawVitals.weight);
  const heightZone = growthZone('height', rawVitals.height);
  const nutritionRows = [
    /* BMI ไม่ใช่เกณฑ์ของเด็ก — ขึ้นหัวข้อไว้แต่บอกตรง ๆ ว่าใช้กราฟแทน */
    ['BMI', isChild ? `${NO_VALUE} (อายุต่ำกว่า 18 ปี ใช้กราฟการเจริญเติบโต)` : (rawVitals.bmi || NO_VALUE)],
    [
      'ภาวะโภชนาการ',
      weightZone || heightZone
        ? [weightZone && `น้ำหนักตามเกณฑ์อายุ: ${weightZone}`,
          heightZone && `ส่วนสูงตามเกณฑ์อายุ: ${heightZone}`].filter(Boolean).join(' · ')
        : NO_VALUE,
    ],
    [
      'กราฟการเจริญเติบโต',
      isChild
        ? (weightZone || heightZone
          ? `เทียบเกณฑ์กรมอนามัยแล้วที่อายุ ${ageYears} ปี`
          : `${NO_VALUE} (ยังไม่มีน้ำหนัก/ส่วนสูงของรอบนี้)`)
        : `${NO_VALUE} (ใช้กับผู้รับบริการอายุต่ำกว่า 18 ปี)`,
    ],
  ];

  const nurseBlocks = [
    {
      title: 'สัญญาณชีพล่าสุด',
      rows: [
        ...(vitalRound?.date
          ? [['รอบที่วัด', `${vitalRound.date}${vitalRound.time ? ` · ${vitalRound.time}` : ''}`]]
          : []),
        /* BMI ถูกกันออกจากรายการทั่วไป — ไปอยู่ในชุดสามหัวข้อภาวะโภชนาการข้างล่าง
           ที่ขึ้นเสมอ ไม่ถูกกรองทิ้งตอนไม่มีค่า */
        ...(screening.vitalItems || [])
          .filter((v) => v.value && v.label !== 'BMI')
          .map((v) => [v.label, v.value]),
        ...nutritionRows,
        /* บันทึกเพิ่มเติมของพยาบาลตอนวัด — ท่าที่วัด · เหตุที่ค่าผิดปกติ ·
           สิ่งที่ผู้ป่วยบอกระหว่างวัด (มติผู้ใช้ 31 ส.ค. 69) */
        ...(screening.vitalNote ? [['บันทึกเพิ่มเติม', screening.vitalNote]] : []),
      ],
    },
    {
      title: 'อาการป่วย',
      /* ระยะเวลาย้ายลงใต้ประวัติการเจ็บป่วยปัจจุบัน (มติผู้ใช้ 31 ส.ค. 69) —
         อ่านเรียงเป็นเรื่องเดียวกัน: อาการสำคัญ → เล่าอาการ → เป็นมานานเท่าไร */
      rows: [
        ['อาการสำคัญ (CC)', screening.cc],
        ['ประวัติการเจ็บป่วยปัจจุบัน', screening.presentIllness],
        ['ระยะเวลาที่มีอาการ', screening.duration],
      ].filter(([, v]) => v),
    },
    /* ความเร่งด่วน + Pain score เป็น Badge สีตามระดับ (มติผู้ใช้ 30 ส.ค. 69) —
       สองค่านี้อ่านเป็น "ระดับ" ไม่ใช่ข้อความ สีจึงต้องบอกความหนักเบาได้ทันที
       `tone` มาจากแคตตาล็อกจุดคัดกรอง หน้าจอไม่ได้ตั้งสีเอง */
    {
      title: 'ความเร่งด่วน',
      rows: screening.triage
        ? [['ระดับ', `${screening.triage.label} · ${screening.triage.subLabel}`, screening.triage.tone]]
        : [],
    },
    {
      title: 'ระดับความเจ็บปวด (Pain Score)',
      rows: screening.pain ? [['ระดับ', screening.pain.label, screening.pain.tone]] : [],
    },
    {
      title: 'คำสั่งการพยาบาลและการสังเกตอาการ',
      rows: [
        ...(screening.orders || []).map((o, i) => [`คำสั่งที่ ${i + 1}`, o]),
        /* "รายละเอียดคำสั่งอื่น ๆ" เป็นช่องของตัวเองที่จุดคัดกรอง ไม่ใช่คำสั่งลำดับ
           ถัดไป — เดิมถูกต่อท้ายอาร์เรย์จนขึ้นเป็น "คำสั่งที่ N" */
        ...(screening.othersNote ? [['รายละเอียดคำสั่งอื่น ๆ', screening.othersNote]] : []),
      ],
    },
    /* บล็อก "สิ่งที่จุดคัดกรองระบุไว้" (ใบรับรองแพทย์ · เตียงสังเกตอาการ) ถูกเอาออก
       31 ส.ค. 69 — ใบรับรองแพทย์เป็นการตัดสินใจของแพทย์ที่ขั้นเอกสารอยู่แล้ว
       ส่วนเตียงสังเกตอาการเป็นของหอสังเกตอาการ ไม่ใช่ผลคัดกรองที่หมอต้องอ่าน
       ก่อนตรวจ · `screening.cert` / `screening.bedId` ยังส่งมาจาก handoff ครบ */
    /* บล็อก "คลินิกและแพทย์ที่จุดคัดกรองส่งต่อ" ถูกเอาออก 31 ส.ค. 69 — แพทย์ที่
       เปิดเคสอยู่คือปลายทางนั้นอยู่แล้ว การอ่านซ้ำว่าถูกส่งมาที่ไหนไม่ได้ช่วย
       ตัดสินใจอะไรระหว่างตรวจ · `screening.assignment` ยังส่งมาจาก handoff ครบ */
    /* พฤติกรรมสุขภาพขึ้นเป็นบล็อกของตัวเอง ไม่ใช่แท็บสุดท้ายของหมวดซักประวัติ
       (มติผู้ใช้ 31 ส.ค. 69) — เป็นข้อมูลที่หมออ่านประกอบทุกเคส (บุหรี่/เหล้า/
       การออกกำลังกาย) ไม่ใช่หมวดที่เปิดดูเฉพาะตอนสงสัยเรื่องแพ้เหมือนแท็บอื่น
       ซ่อนอยู่หลังแท็บจึงมีโอกาสไม่ถูกเปิดอ่านเลย */
    {
      title: 'พฤติกรรมสุขภาพ',
      rows: [
        ['สูบบุหรี่', behaviour?.smoking],
        ['ดื่มแอลกอฮอล์', behaviour?.alcohol],
        ['ออกกำลังกาย', behaviour?.exercise],
        ['ข้อมูลเพิ่มเติม', behaviour?.detail],
      ].filter(([, v]) => v),
    },
    /* เวลาที่บันทึกผลคัดกรอง — บอกว่าค่าที่อ่านอยู่นี้สดแค่ไหน */
    {
      title: 'การบันทึกผลคัดกรอง',
      rows: [['บันทึกเมื่อ', screening.capturedAt]].filter(([, v]) => v),
    },
  ].filter((b) => b.rows.length > 0).concat(registryBlocks);

  /* ซักประวัติทั้งชุดจากจุดคัดกรอง ทำเป็นแท็บ (มติผู้ใช้ 30 ส.ค. 69) — ป้ายและ
     ลำดับตรงกับแท็บของจุดคัดกรองเป๊ะ ๆ หมอกับพยาบาลจึงอ่านหัวข้อชุดเดียวกัน
     เดิมข้อมูลชุดนี้ไม่ได้ถูกส่งต่อมาให้หมออ่านตรงนี้เลย ทั้งที่
     `getCarriedScreening` คืนค่ามาให้อยู่แล้ว · วางเป็นแท็บไม่ใช่บล็อกเรียงลงมา
     เพราะหกหมวดต่อกันดันคอลัมน์ยาวจนสัญญาณชีพหลุดจอ */
  const historyTabs = [
    historyBlock('แพ้ยา', screening.allergyTopics?.drug),
    historyBlock('แพ้อาหาร', screening.allergyTopics?.food),
    historyBlock('แพ้สารเคมี', screening.allergyTopics?.chemical),
    historyBlock('โรคประจำตัว', screening.allergyTopics?.disease),
    historyBlock('อื่น ๆ', screening.allergyTopics?.other),
    /* บล็อก "จากทะเบียน (แพ้ยา/โรคประจำตัว)" ถูกเอาออก 31 ส.ค. 69 — ซ้ำกับแถบแพ้ยา/
       โรคประจำตัวบนหัวการ์ดผู้ป่วยและป๊อปอัป EMR ที่เพิ่งย้ายปุ่มมาไว้แถวเดียวกัน
       คอลัมน์นี้เหลือเฉพาะสิ่งที่ซักไว้ที่จุดคัดกรองรอบนี้ */
  ];

  /* embedded = หน้าที่เรียกใช้เป็นคนวางการ์ดขาวและ padding เอง พาเนลจึงโปร่งใส
     ไม่งั้นจะได้พื้นเทาซ้อนอยู่ในการ์ดขาวอีกชั้น (มติผู้ใช้ 28 ส.ค. 69) */
  const shellStyle = embedded
    ? {
      gap: 'var(--dim-space-300)',
      padding: 0,
      background: 'transparent',
    }
    : {
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-500)',
      background: 'var(--surface-neutral-quaternary)',
    };

  return (
    <section
      className={`flex flex-col w-full ${className}`}
      style={shellStyle}
    >
      {/* หัวข้อ "บันทึกการตรวจ" ถูกเอาออก 28 ส.ค. 69 — หัวข้อย่อยสองคอลัมน์
          (บันทึกจากพยาบาล / บันทึกของแพทย์) บอกอยู่แล้วว่าการ์ดนี้คืออะไร */}

      {/* เลื่อนไปพร้อมกันทั้งหน้าเหมือนเดิม (มติผู้ใช้ 31 ส.ค. 69 — กลับมติที่ลอง
          แยก scroll สองฝั่งในวันเดียวกัน) */}
      <div className='flex w-full items-stretch min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {/* Nurse column */}
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            /* ไม่มีพื้นขาว/กรอบของตัวเอง — การ์ดขาวมาจากตัวห่อในหน้าแล้ว
               (มติผู้ใช้ 28 ส.ค. 69) เหลือเส้นคั่นบาง ๆ ระหว่างสองคอลัมน์
               แบ่งพื้นที่ 50/50 (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมตรึงคอลัมน์พยาบาล
               ไว้ 448px พอจอกว้างขึ้น ฝั่งแพทย์กินที่ไปเกือบหมด ทั้งที่ตอนนี้
               คอลัมน์ซ้ายมีผลคัดกรองครบทุกหมวดแล้ว ต้องการที่พอ ๆ กัน */
            flexBasis: 0,
            gap: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-600)',
            borderRight: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
          }}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={{
              /* หัวข้อคอลัมน์ใช้สีแบรนด์เหมือนหัวข้อการ์ดอื่นในขั้นตอน
                 (มติผู้ใช้ 28 ส.ค. 69) */
              color: 'var(--text-topic-primary-title, var(--text-brandPrimary-default))',
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              fontSize: 'var(--type-size-base)',
            }}
            >
              บันทึกจากพยาบาล
            </span>
            <span style={{
              color: 'var(--text-topic-tertiary-subtext, var(--text-content-tertiary))',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
            }}
            >
              กดเครื่องหมาย “+” เพื่อเพิ่มรายการไปทางด้านขวา
            </span>
          </div>
          {/* แถวคัดลอก 4 ช่องเดิม (อาการ · ประวัติปัจจุบัน · ตรวจร่างกาย · ระยะเวลา)
              ถูกเอาออก 28 ส.ค. 69 — ข้อมูลชุดเดียวกันอยู่ในบล็อกผลคัดกรองด้านล่าง
              ซึ่งคัดลอกไปช่องของแพทย์ได้เหมือนกัน */}
          {nurseBlocks.map((block) => (
            <div
              key={block.title}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              }}
            >
              {/* หัวข้อบล็อกไม่มีปุ่มคัดลอก — คัดลอกทีละบรรทัดพอ (มติผู้ใช้ 28 ส.ค. 69) */}
              <span style={BLOCK_TITLE_STYLE}>{block.title}</span>
              {block.rows.map((row) => <NurseRow key={row[0]} row={row} />)}
            </div>
          ))}

          {/* หมวดซักประวัติเรียงลงมาทีละบล็อก ไม่ใช้แท็บแล้ว (มติผู้ใช้ 31 ส.ค. 69)
              — แท็บบังคับให้กดทีละหมวดถึงจะรู้ว่ามีอะไร หมอที่กำลังไล่อ่านก่อนตรวจ
              ต้องเห็นการแพ้ทุกหมวดพร้อมกัน ตอนนี้คอลัมน์เลื่อนแยกฝั่งแล้ว
              ความยาวที่เพิ่มขึ้นจึงไม่ดันสัญญาณชีพหลุดจอเหมือนเหตุผลเดิม */}
          {historyTabs.map((topic) => (
            <div
              key={topic.title}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              }}
            >
              <span style={BLOCK_TITLE_STYLE}>{topic.title}</span>

              {topic.records?.length ? (
                <div className='flex flex-col w-full'>
                  {topic.records.map((r, i) => <NurseRecord key={`${r.name}-${i}`} record={r} />)}
                </div>
              ) : topic.rows?.length ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  {topic.rows.map((row) => <NurseRow key={row[0]} row={row} />)}
                </div>
              ) : (
                <span style={{
                  color: 'var(--text-content-tertiary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}>
                  ยังไม่ได้ซักประวัติหมวดนี้ที่จุดคัดกรอง
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Doctor column */}
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            /* คู่กับคอลัมน์ซ้าย — flexBasis 0 ทั้งคู่ทำให้แบ่งครึ่งพอดีทุกความกว้าง */
            flexBasis: 0,
            /* ระยะห่างระหว่างช่องกรอก 24px (มติผู้ใช้ 31 ส.ค. 69) — 16px เดิมทำให้
               ป้ายหัวข้อของช่องถัดไปเบียดขอบล่างของ textarea ก่อนหน้า */
            gap: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
          }}
        >
          <span style={{
            color: 'var(--text-topic-primary-title, var(--text-brandPrimary-default))',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-base)',
          }}
          >
            บันทึกของแพทย์
          </span>

          {DOCTOR_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.control === 'select' ? (
                <Select
                  value={doctorNotes[f.key] ?? ''}
                  onChange={(v) => onDoctorChange?.({ ...doctorNotes, [f.key]: v })}
                  options={f.options}
                  placeholder='เลือกระยะเวลาที่มีอาการ'
                />
              ) : (
                <SuggestibleTextarea
                  voice
                  value={doctorNotes[f.key] ?? ''}
                  onChange={setDoctorFromEvent(f.key)}
                  height={f.height}
                  minHeight={f.minHeight}
                  suggestions={f.suggestions}
                  minChars={f.minChars}
                  popoverAriaLabel={f.popoverAriaLabel}
                />
              )}
            </Field>
          ))}

          {/* Cap the attachment section at FieldShell's 640px maxWidth so the
              title row, drop zone, and attachment chips align with the
              textareas above (which all flow through FieldShell). */}
          <div
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-300)', maxWidth: 640 }}
          >
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-content)',
              fontWeight: 'var(--type-weight-medium)',
              fontSize: 'var(--type-size-sm)',
            }}
            >
              ข้อมูลประกอบการวินิจฉัย
            </span>
            {/* แนบผลที่ระบบมีอยู่แล้วด้วยการติ๊ก ไม่ต้องดาวน์โหลดมาอัปโหลดซ้ำ —
                ติ๊กแล้วผลของ visit นี้จะถูกอ้างอิงไปกับบันทึกการตรวจ
                (มติผู้ใช้ 28 ส.ค. 69) */}
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <Checkbox
                label='แนบผลแล็บ'
                checked={!!linkedResults.lab}
                onChange={(e) => onLinkedResultsChange?.({
                  ...linkedResults, lab: e?.target?.checked ?? !linkedResults.lab,
                })}
              />
              <Checkbox
                label='แนบผลฉายรังสี'
                checked={!!linkedResults.imaging}
                onChange={(e) => onLinkedResultsChange?.({
                  ...linkedResults, imaging: e?.target?.checked ?? !linkedResults.imaging,
                })}
              />
            </div>
            <DragAndDrop
              onChange={(files) => onAttachmentsChange?.(files)}
              accept='.png,.jpg,.jpeg,.pdf'
              style={{ minHeight: 96 }}
            />
            {attachments.length > 0 && (
              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
                {attachments.map((file) => (
                  <AttachmentCard
                    key={file.id}
                    file={file}
                    onRemove={() => onRemoveAttachment?.(file.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExamNotesPanel;
