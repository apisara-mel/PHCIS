import React, { useEffect, useRef, useState } from 'react';
import { FieldShell, resolveBox, useFieldId } from '@/components/forms/_inputBox';
import { FilterDropdown } from '@/components/forms/FilterTag';
import BrandButton from '@/components/button/BrandButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import {
  ensureMicrophoneAccess,
  isSpeechRecognitionAvailable,
  startSpeechRecognition,
  stopSpeechRecognition,
} from '@/utils/speechRecognition';

/* MIH VoiceTextarea — Figma "Voice Textarea" (node 3217:3511 Default, 3280:3970
   variant matrix). Multiline text input with a bottom toolbar holding:
     • a language picker (alias of <FilterDropdown> with Thai + English),
     • a brand mic button that triggers SpeechRecognition.

   Every dimension + colour aliases design.md per Figma:
     Outer:    gap-150 (6),  max-w-640, min-w-128, w-447 (default)
     Box:      bg-input-default, radius-200 (8), h-128 default (size-2000),
               min-h-96 (size-1800), gap-200 (8). Figma tall variant h-160
               (size-2100) — pass `height={VOICE_TEXTAREA_HEIGHT_TALL}`.
               border + ring via shared resolveBox/composeBoxShadow.
     Top:      p-300 (12), placeholder = body-base (16) / text-input-default.
     Toolbar:  bg-neutral-quaternary (#f9fbfb) — or danger-quaternary in Error,
               gap-200 (8), p-200 (8), radius-200 (8).
     Tag:      FilterDropdown — 36h (Figma) via tagStyle, language icon + chevron.
     Mic:      36×36, radius-600 (24), brandPrimaryButton-tertiary (#e2f3eb),
               icon-brandPrimaryButton-default. In Error → dangerButton-secondary
               + icon-dangerButton-default.                                  */

/** Default outer box height — `--dim-size-2000` (128px). Form / popup compact. */
export const VOICE_TEXTAREA_HEIGHT = 128;
/** Minimum outer box height — `--dim-size-1800` (96px). */
export const VOICE_TEXTAREA_MIN_HEIGHT = 96;
/** Figma 3217:3511 tall variant / body-mark editor — `--dim-size-2100` (160px). */
export const VOICE_TEXTAREA_HEIGHT_TALL = 160;

/** Speech-recognition locale options — design.md §6.16.1 (VoiceTextarea toolbar). */
export const VOICE_TEXTAREA_LANGUAGE_OPTIONS = [
  { value: 'th-TH', label: 'ภาษาไทย' },
  { value: 'en-US', label: 'ภาษาอังกฤษ' },
];

const DEFAULT_LANGUAGES = VOICE_TEXTAREA_LANGUAGE_OPTIONS;

const VoiceTextarea = React.forwardRef(function VoiceTextarea(
  {
    label,
    required = false,
    helperText,
    error,
    placeholder = 'พิมพ์หรือกดปุ่มไมโครโฟนเพื่อพูด...',
    value,
    defaultValue,
    onChange,
    onMicClick,
    languages = DEFAULT_LANGUAGES,
    language: languageProp,
    defaultLanguage,
    onLanguageChange,
    useSpeechRecognition = true,
    showLabel = true,
    showHelperText = true,
    showSaveButton = false,
    /** When true (default with showSaveButton), บันทึก stays disabled until value is non-empty — Figma 217:27083 Focus-Empty. */
    saveRequiresValue = true,
    saveDisabled: saveDisabledProp,
    saveLabel = 'บันทึก',
    onSaveClick,
    /* Body-mark variant (Figma 267:31507) adds Delete + Cancel buttons
       next to Save. Opt-in via the matching `show*` flag so other
       VoiceTextarea callers keep their existing toolbar. */
    showCancelButton = false,
    cancelLabel = 'ยกเลิก',
    onCancelClick,
    showDeleteButton = false,
    deleteAriaLabel = 'ลบ',
    /** Independent disable for the delete button (e.g. body-mark editor
        disables delete until the user has typed a note). Falls back to
        the field-level `disabled` when not provided. */
    deleteDisabled,
    onDeleteClick,
    state,
    disabled = false,
    height = VOICE_TEXTAREA_HEIGHT,
    minHeight = VOICE_TEXTAREA_MIN_HEIGHT,
    id: idProp,
    name,
    className = '',
    style = {},
    /* Popover anchor for SuggestibleTextarea — attaches to the bordered shell. */
    boxRef,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('voice-textarea');
  const id = idProp || autoId;
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  /* Local handle on the inner <textarea> so the surrounding box can
     forward clicks to it. Forwarded `ref` is still wired by composeRef
     below so SuggestibleTextarea's anchor logic keeps pointing at the
     real DOM element. */
  const textareaInnerRef = useRef(null);
  const composeTextareaRef = (el) => {
    textareaInnerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  const [internalLang, setInternalLang] = useState(defaultLanguage ?? languages[0]?.value ?? 'th-TH');
  const isLangControlled = languageProp !== undefined;
  const languageCode = isLangControlled ? languageProp : internalLang;

  const [focused, setFocused] = useState(false);
  const [mouseHover, setMouseHover] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speechHint, setSpeechHint] = useState('');
  /* When the active mic is the user's connected phone (Continuity Mic,
     paired-phone USB mic, EpocCam audio, etc.), surface it as a small
     "เชื่อมต่อโทรศัพท์" chip next to the mic button so the doctor sees
     confirmation that the routing worked. Cleared on stop. */
  const [micDevice, setMicDevice] = useState({ isPhone: false, label: '' });
  const recognitionRef = useRef(null);
  const hasSpeech = isSpeechRecognitionAvailable();

  useEffect(() => () => stopSpeechRecognition(recognitionRef.current), []);

  const effectiveFocused = focused || mouseHover;
  const hasValue = Boolean(String(v ?? '').trim());
  const saveDisabled = saveDisabledProp ?? (showSaveButton && saveRequiresValue && !hasValue);
  const s = resolveBox({ state, focused: effectiveFocused, hasValue, error: !!error, disabled });
  const includeRing = effectiveFocused || state === 'hover' || state === 'focus' || state === 'error';
  /* VoiceTextarea uses a real CSS border (not the inset-shadow technique
     that InputField / Textarea use) so the form's stroke paints OVER the
     inner toolbar's bg — without this the toolbar's gray fill would visually
     cover the parent's inset shadow at the toolbar edges. composeBoxShadow
     is called WITHOUT borderShadow so only the outer 4px ring remains. */
  const ringOnly = includeRing && s.ring !== 'none' ? s.ring : 'none';
  /* Figma 3280:3970 — 1px default border, 2px on hover/focus/error. */
  const strokeWidth = disabled
    ? 'var(--dim-stroke-100)'
    : (error || effectiveFocused)
      ? 'var(--dim-stroke-200)'
      : 'var(--dim-stroke-100)';

  const setBoxRef = (el) => {
    if (!boxRef) return;
    if (typeof boxRef === 'function') boxRef(el);
    else boxRef.current = el;
  };

  const handleChange = (e) => {
    if (!isControlled) setInternal(e.target.value);
    onChange && onChange(e.target.value, e);
  };

  const setValue = (next) => {
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const setLanguage = (next) => {
    if (!isLangControlled) setInternalLang(next);
    onLanguageChange && onLanguageChange(next);
  };

  const stopSpeech = () => {
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setRecording(false);
    setMicDevice({ isPhone: false, label: '' });
  };

  const startSpeech = async () => {
    setSpeechHint('');
    const result = await ensureMicrophoneAccess();
    if (!result.ok) {
      setSpeechHint('ไม่สามารถใช้ไมโครโฟนได้ — กรุณาอนุญาตการใช้ไมค์ในเบราว์เซอร์หรือการตั้งค่าโทรศัพท์');
      return;
    }
    /* Surface which input the auto-picker ended up grabbing so the doctor
       sees the "เชื่อมต่อโทรศัพท์" chip when the phone mic is active. */
    setMicDevice({
      isPhone: Boolean(result.isPhone),
      label: result.deviceLabel || '',
    });

    recognitionRef.current = startSpeechRecognition({
      lang: languageCode,
      onTranscript: (transcript) => {
        setValue(v ? `${v} ${transcript}`.trim() : transcript);
      },
      onEnd: () => {
        recognitionRef.current = null;
        setRecording(false);
      },
      onError: (message) => {
        if (message) setSpeechHint(message);
      },
    });

    if (recognitionRef.current) setRecording(true);
  };

  const handleMic = async () => {
    if (disabled) return;
    if (onMicClick) onMicClick();
    if (!useSpeechRecognition || !hasSpeech) {
      setSpeechHint('เบราว์เซอร์นี้ไม่รองรับพูดแปลงข้อความ — ใช้แป้นพิมพ์ไมค์ของโทรศัพท์แทนได้');
      return;
    }
    if (recording) stopSpeech();
    else await startSpeech();
  };

  /* Toolbar bg — neutral by default, danger in Error per Figma 3280:3932. */
  const toolbarBg = error
    ? 'var(--surface-danger-quaternary)'
    : 'var(--surface-neutral-quaternary)';

  /* Mic retint in Error — Figma 3280:3923. Override the brand tokens
     locally on the button instead of swapping component types, so the
     canonical BrandCircleSubdueIconButton keeps owning the visual. */
  const micStyleOverride = error
    ? {
        '--surface-brandPrimaryButton-tertiary':       'var(--surface-dangerButton-secondary)',
        '--surface-brandPrimaryButton-tertiary-hover': 'var(--surface-dangerButton-secondary-hover)',
        '--icon-brandPrimaryButton-default':           'var(--icon-dangerButton-default)',
      }
    : undefined;

  const effectiveHelperText = speechHint || helperText;

  return (
    <FieldShell
      label={label}
      required={required}
      helperText={effectiveHelperText}
      error={error}
      showLabel={showLabel}
      showHelperText={showHelperText}
      htmlFor={id}
      className={className}
      style={style}
    >
      <div
        ref={setBoxRef}
        onMouseEnter={() => !disabled && setMouseHover(true)}
        onMouseLeave={() => setMouseHover(false)}
        className='w-full flex flex-col items-start'
        style={{
          position: 'relative',
          height,
          minHeight,
          /* Figma gap-200 (8px) between the typing area and the toolbar. */
          gap: 'var(--dim-space-200)',
          borderRadius: 'var(--dim-radius-200)',
          border: `${strokeWidth} solid ${s.borderColor}`,
          background: s.bg,
          boxShadow: ringOnly,
          boxSizing: 'border-box',
          /* Clip the toolbar's rounded bottom corners flush with the outer
             box's rounded corners (the form's stroke wraps the curve). */
          overflow: 'hidden',
          transition: 'border-color 160ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Top — multiline input area. Figma 3217:3512 uses p-300 (12).
            onMouseDown forwards padding-gutter clicks to the textarea so
            the whole top zone (not just the textarea rectangle) acts as
            a hit target — without this, clicking the 12 px gutter inside
            the box did nothing and made the field feel uneditable on
            first try (Figma 330:42665 "On first visit, the default state
            appears" — long placeholder filling the box made this worse). */}
        <div
          className='w-full flex-1 min-h-0 flex items-start cursor-text'
          style={{ padding: 'var(--dim-space-300)' }}
          onMouseDown={(e) => {
            if (disabled) return;
            const ta = textareaInnerRef.current;
            if (!ta || e.target === ta) return;
            e.preventDefault();
            ta.focus();
          }}
        >
          <textarea
            ref={composeTextareaRef}
            id={id}
            name={name}
            value={v}
            onChange={handleChange}
            onFocus={(e) => {
              setFocused(true);
              onFocusProp?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlurProp?.(e);
            }}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-invalid={!!error || undefined}
            className='mih-input-placeholder w-full h-full bg-transparent'
            style={{
              color: s.valueColor,
              caretColor: 'var(--brand-p600)',
              border: 0,
              outline: 'none',
              boxShadow: 'none',
              background: 'transparent',
              WebkitAppearance: 'none',
              appearance: 'none',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              resize: 'none',
            }}
            {...rest}
          />
        </div>

        {/* Bottom toolbar — Figma 3217:3503 + PHCIS | Medical-examination
            150:33650 (doctor-column exam notes). Language picker + mic
            anchor to the LEFT in every variant; body-mark variant
            267:31507 still pins Delete + Cancel + Save to the right. */}
        <div
          className='w-full flex items-center shrink-0'
          style={{
            gap: 'var(--dim-space-200)',
            padding: 'var(--dim-space-200)',
            borderRadius: '0 0 var(--dim-radius-200) var(--dim-radius-200)',
            background: toolbarBg,
            transition: 'background 160ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div
            className={`flex items-center min-w-0${(showSaveButton || showCancelButton || showDeleteButton) ? ' flex-1' : ''}`}
            style={{ gap: 'var(--dim-space-200)' }}
          >
            <FilterDropdown
              leadingIcon='language'
              options={languages}
              value={languageCode}
              onChange={setLanguage}
              disabled={disabled}
              menuZIndex='var(--sm-z-modal-popover, 1450)'
              tagStyle={{
                height: 36,
                maxWidth: 192,
                minWidth: 40,
              }}
            />
            <BrandCircleSubdueIconButton
              icon={recording ? 'graphic_eq' : 'mic'}
              size='sm'
              variant='fill'
              onClick={handleMic}
              disabled={disabled}
              aria-label={recording ? 'หยุดบันทึกเสียง' : 'เริ่มบันทึกเสียง'}
              aria-pressed={recording}
              style={micStyleOverride}
            />
            {/* "เชื่อมต่อโทรศัพท์" chip — only renders while recording AND
                the auto-picker grabbed a phone-like audio input (Continuity
                Mic, paired-phone USB, EpocCam audio…). Title attribute
                shows the resolved device label on hover so the doctor can
                confirm WHICH phone was selected. */}
            {recording && micDevice.isPhone && (
              <span
                title={micDevice.label || 'โทรศัพท์'}
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-150, 6px)',
                  height: 28,
                  padding: '0 var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  color: 'var(--text-brandPrimary-default, #007549)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                  lineHeight: 1.5,
                  whiteSpace: 'nowrap',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                📱 เชื่อมต่อโทรศัพท์
              </span>
            )}
          </div>
          {(showSaveButton || showCancelButton || showDeleteButton) && (
            <div
              className='flex items-center shrink-0'
              style={{ gap: 'var(--dim-space-200)' }}
            >
              {showDeleteButton && (
                <NeutralSubdueIconButton
                  variant='outline'
                  size='sm'
                  icon='delete'
                  aria-label={deleteAriaLabel}
                  disabled={(deleteDisabled ?? disabled) === true || disabled}
                  onClick={onDeleteClick}
                />
              )}
              {showCancelButton && (
                <NeutralSubdueButton
                  size='sm'
                  disabled={disabled}
                  onClick={onCancelClick}
                >
                  {cancelLabel}
                </NeutralSubdueButton>
              )}
              {showSaveButton && (
                <BrandButton
                  variant='fill'
                  size='sm'
                  disabled={disabled || saveDisabled}
                  onClick={onSaveClick}
                >
                  {saveLabel}
                </BrandButton>
              )}
            </div>
          )}
        </div>
      </div>
    </FieldShell>
  );
});

export default VoiceTextarea;
