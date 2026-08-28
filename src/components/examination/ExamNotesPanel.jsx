import React, { useState } from 'react';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import Select from '@/components/forms/Select';
import { getCarriedScreening } from '@/data/screeningHandoff';
import Checkbox from '@/components/checkbox/Checkbox';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import Tooltip from '@/components/tooltip/Tooltip';
import Icon from '@/components/icons/Icon';
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
    label: 'ประวัติปัจจุบัน (Present Illness)',
    required: true,
    height: 104,
    minHeight: 88,
    suggestions: PRESENT_ILLNESS_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำประวัติปัจจุบัน',
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
  const nurseBlocks = [
    {
      title: 'สัญญาณชีพล่าสุด',
      rows: (screening.vitalItems || []).filter((v) => v.value)
        .map((v) => [v.label, v.value]),
    },
    {
      title: 'อาการป่วย',
      rows: [
        ['อาการสำคัญ (CC)', screening.cc],
        ['ระยะเวลาที่มีอาการ', screening.duration],
        ['ประวัติการเจ็บป่วยปัจจุบัน', screening.presentIllness],
      ].filter(([, v]) => v),
    },
    {
      title: 'ความเร่งด่วน',
      rows: screening.triage
        ? [['ระดับ', `${screening.triage.label} · ${screening.triage.subLabel}`]]
        : [],
    },
    {
      title: 'ระดับความเจ็บปวด (Pain Score)',
      rows: screening.pain ? [['ระดับ', screening.pain.label]] : [],
    },
    {
      title: 'คำสั่งการพยาบาลและการสังเกตอาการ',
      rows: (screening.orders || []).map((o, i) => [`คำสั่งที่ ${i + 1}`, o]),
    },
    {
      title: 'สิ่งที่จุดคัดกรองระบุไว้',
      rows: [
        ['ใบรับรองแพทย์', screening.cert == null ? '' : (screening.cert ? 'ต้องการ' : 'ไม่ต้องการ')],
        ['เตียงสังเกตอาการ', screening.bedId],
      ].filter(([, v]) => v),
    },
  ].filter((b) => b.rows.length > 0);

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

      <div className='flex w-full items-stretch min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {/* Nurse column */}
        <div
          className='flex flex-col shrink-0'
          style={{
            /* ไม่มีพื้นขาว/กรอบของตัวเอง — การ์ดขาวมาจากตัวห่อในหน้าแล้ว
               (มติผู้ใช้ 28 ส.ค. 69) เหลือเส้นคั่นบาง ๆ ระหว่างสองคอลัมน์ */
            width: 448,
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
              <span style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
              }}>{block.title}</span>
              {block.rows.map(([label, value]) => (
                <div key={label} className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                  }}>{label}</span>
                  <span className='ml-auto text-right' style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                  }}>{value}</span>
                  {/* คัดลอกได้ทีละหัวข้อ ไม่ใช่เฉพาะทั้งบล็อก */}
                  <CopyIconButton label={`คัดลอก ${label}`} text={`${label}: ${value}`} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Doctor column */}
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            gap: 'var(--dim-space-400)',
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
