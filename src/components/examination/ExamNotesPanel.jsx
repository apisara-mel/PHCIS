import React, { useState } from 'react';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import Tooltip from '@/components/tooltip/Tooltip';
import {
  CHIEF_COMPLAINT_SUGGESTIONS,
  PRESENT_ILLNESS_SUGGESTIONS,
  PHYSICAL_EXAM_SUGGESTIONS,
  DURATION_SUGGESTIONS,
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

const NURSE_FIELDS = [
  { key: 'cc', label: 'อาการ (Chief Complaint)' },
  { key: 'pi', label: 'ประวัติปัจจุบัน (Present Illness)' },
  { key: 'pe', label: 'ตรวจร่างกาย (Physical Examination)' },
  { key: 'duration', label: 'ระยะเวลาที่มีอาการ' },
];

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
    height: 140,
    minHeight: 120,
    suggestions: CHIEF_COMPLAINT_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำอาการ',
  },
  {
    key: 'pi',
    label: 'ประวัติปัจจุบัน (Present Illness)',
    required: true,
    height: 180,
    minHeight: 140,
    suggestions: PRESENT_ILLNESS_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำประวัติปัจจุบัน',
  },
  {
    key: 'pe',
    label: 'ตรวจร่างกาย (Physical Examination)',
    required: true,
    height: 240,
    minHeight: 180,
    suggestions: PHYSICAL_EXAM_SUGGESTIONS,
    minChars: 3,
    popoverAriaLabel: 'คำแนะนำผลตรวจร่างกาย',
  },
  {
    key: 'duration',
    label: 'ระยะเวลาที่มีอาการ',
    required: true,
    height: 120,
    minHeight: 96,
    suggestions: DURATION_SUGGESTIONS,
    minChars: 1,
    popoverAriaLabel: 'คำแนะนำระยะเวลา',
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

  const shellStyle = embedded
    ? {
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-500)',
      background: 'var(--surface-neutral-quaternary)',
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
      <span style={{
        color: 'var(--text-topic-secondary-title)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        fontSize: 'var(--type-size-base)',
      }}
      >
        บันทึกการตรวจ
      </span>

      <div className='flex w-full items-stretch min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {/* Nurse column */}
        <div
          className='flex flex-col shrink-0'
          style={{
            width: 448,
            gap: 'var(--dim-space-400)',
            padding: 'var(--dim-space-600)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-card-100)',
          }}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            <span style={{
              color: 'var(--text-topic-tertiary-title)',
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
          {NURSE_FIELDS.map((f) => {
            const nurseVal = (nurseNotes[f.key] ?? '').trim();
            const doctorVal = (doctorNotes[f.key] ?? '').trim();
            /* No nurse value → nothing to copy. Mirrors HistoryListForm's
               `copyDisabled` contract (Figma 162:17951) — button greys
               out and aria-label explains why. */
            const hasNurseNote = nurseVal !== '' && nurseVal !== '-';
            /* `copied` mirrors HistoryListForm: tick stays on while the
               doctor field still carries the nurse's narrative. Edits or
               clears revert the icon automatically. */
            const copied = hasNurseNote && nurseVal === doctorVal;
            return (
              <NurseCopyRow
                key={f.key}
                label={f.label}
                value={nurseNotes[f.key]}
                copied={copied}
                copyDisabled={!hasNurseNote}
                onCopy={() => onCopyFromNurse?.(f.key)}
              />
            );
          })}
        </div>

        {/* Doctor column */}
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            gap: 'var(--dim-space-400)',
            padding: 'var(--dim-space-600)',
            borderRadius: 'var(--dim-radius-400)',
            border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-card-100)',
          }}
        >
          <span style={{
            color: 'var(--text-topic-tertiary-title)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-base)',
          }}
          >
            บันทึกของแพทย์
          </span>

          {DOCTOR_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
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
            <DragAndDrop
              onChange={(files) => onAttachmentsChange?.(files)}
              accept='.png,.jpg,.jpeg,.pdf'
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
