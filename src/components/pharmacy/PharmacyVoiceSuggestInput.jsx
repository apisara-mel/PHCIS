import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';

/* Chrome-stripped inner <input> per CLAUDE.md "No browser-default input
   chrome" — the wrapper div below (not the native control) owns border/
   focus/shadow. Caret intentionally stays visible: unlike a compact
   search bar, this is a multi-word free-text field (Med Error / เหตุผล
   ไม่มารับยา / แจ้งปัญหาใบยา) where the pharmacist needs to see the
   cursor position while composing a sentence — the rule's own
   "specific reason to show the caret" exception. */
if (typeof document !== 'undefined') {
  const styleId = 'mih-pharmacy-voice-input-style';
  const css = `
.mih-pharmacy-voice-input,
.mih-pharmacy-voice-input:focus,
.mih-pharmacy-voice-input:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
@keyframes mih-pharmacy-voice-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.mih-pharmacy-voice-recording { animation: mih-pharmacy-voice-pulse 1100ms ease-in-out infinite; }
`;
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

const SpeechRecognitionCtor = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/* Free-text input for pharmacy dispense exception flows. Adds two things
   a plain <input> doesn't have:
     • a mic button that dictates speech straight into the field
       (Web Speech API, Thai locale) instead of typing
     • a dropdown of frequently-used phrases for that field (`suggestions`),
       shown once 3+ characters are typed, so a repeat entry like
       "รอเกิน 3 วัน" doesn't need retyping in full */
const PharmacyVoiceSuggestInput = ({
  value,
  onChange,
  placeholder,
  suggestions = [],
  'aria-label': ariaLabel,
  style = {},
}) => {
  const [recording, setRecording] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const recognitionRef = useRef(null);
  const wrapperRef = useRef(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 3) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && s !== value).slice(0, 5);
  }, [value, suggestions]);

  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const onDocMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [dropdownOpen]);

  /* Stop any in-flight recognition session on unmount so a closed panel
     doesn't keep the mic hot in the background. */
  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleRecording = () => {
    if (!SpeechRecognitionCtor) {
      window.alert('เบราว์เซอร์นี้ไม่รองรับการพิมพ์ด้วยเสียง — ใช้ Chrome หรือ Edge');
      return;
    }
    if (recording) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      if (!transcript) return;
      onChange(value.trim() ? `${value.trim()} ${transcript}` : transcript);
    };
    recognition.onerror = () => setRecording(false);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, minWidth: 'var(--dim-size-2280, 218px)' }}>
      <div
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-150)',
          padding: 'var(--dim-space-150) var(--dim-space-300)',
          background: 'var(--surface-input-default)',
          border: 'var(--dim-stroke-100) solid var(--border-input-default)',
          borderRadius: 'var(--dim-radius-200)',
          ...style,
        }}
      >
        <input
          type='text'
          className='mih-pharmacy-voice-input'
          value={value}
          onChange={(e) => { onChange(e.target.value); setDropdownOpen(true); }}
          onFocus={() => setDropdownOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}
        />
        <button
          type='button'
          onClick={toggleRecording}
          aria-label={recording ? 'หยุดพิมพ์ด้วยเสียง' : 'พิมพ์ด้วยเสียง'}
          title={recording ? 'กำลังฟัง... กดเพื่อหยุด' : 'พิมพ์ด้วยเสียง'}
          className={recording ? 'mih-pharmacy-voice-recording' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            width: 'var(--dim-size-600, 32px)',
            height: 'var(--dim-size-600, 32px)',
            borderRadius: 'var(--dim-radius-full)',
            border: 'none',
            cursor: 'pointer',
            background: recording ? 'var(--surface-alert-error)' : 'var(--surface-brandPrimary-quaternary)',
            color: recording ? 'var(--text-alert-error)' : 'var(--text-brandPrimary-default)',
          }}
        >
          <Icon name='mic' size={16} />
        </button>
      </div>
      {dropdownOpen && matches.length > 0 && (
        <div
          role='listbox'
          aria-label='คำแนะนำ'
          onMouseDown={(e) => e.preventDefault()}
          className='flex flex-col'
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--dim-space-100, 4px))',
            left: 0,
            right: 0,
            zIndex: 50,
            gap: 'var(--dim-space-050, 2px)',
            padding: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-300)',
            border: 'var(--dim-stroke-100) solid var(--border-dropdown-default, #EBEBEB)',
            background: 'var(--surface-dropdown-default, #FFFFFF)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          {matches.map((s) => (
            <button
              key={s}
              type='button'
              role='option'
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(s); setDropdownOpen(false); }}
              className='w-full text-left'
              style={{
                padding: 'var(--dim-space-200) var(--dim-space-300)',
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--dim-radius-150)',
                fontSize: 'var(--type-size-sm)',
                color: 'var(--text-content-secondary)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-list-hover, #F4FBF8)';
                e.currentTarget.style.color = 'var(--text-list-hover, #007549)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-content-secondary)';
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PharmacyVoiceSuggestInput;
