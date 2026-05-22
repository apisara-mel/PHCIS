import React, { useEffect, useRef, useState } from 'react';
import { FieldShell, InputBox, useFieldId } from '@/components/forms/_inputBox';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import {
  ensureMicrophoneAccess,
  isSpeechRecognitionAvailable,
  startSpeechRecognition,
  stopSpeechRecognition,
} from '@/utils/speechRecognition';

/* MIH VoiceInputField — Figma "Voice Input Field" (node 3026:23094).
   Single-line input with a trailing brand-tinted mic button (alias of
   BrandCircleSubdueIconButton fill / xs per Figma 2103:647).

   onMicClick fires when the mic button is pressed. If the browser exposes
   SpeechRecognition and `useSpeechRecognition` is true (default), the
   button toggles dictation directly and appends recognized text to the
   value — otherwise it just fires onMicClick.                          */

const VoiceInputField = React.forwardRef(function VoiceInputField(
  {
    label,
    required = false,
    helperText,
    error,
    size = 'lg',
    placeholder = 'Placeholder',
    value,
    defaultValue,
    onChange,
    onMicClick,
    useSpeechRecognition = true,
    speechLang = 'th-TH',
    showLabel = true,
    showHelperText = true,
    state,
    disabled = false,
    name,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const id = useFieldId('voice-input');
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const hasSpeech = isSpeechRecognitionAvailable();

  useEffect(() => () => stopSpeechRecognition(recognitionRef.current), []);

  const setValue = (next) => {
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const stopSpeech = () => {
    stopSpeechRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setRecording(false);
  };

  const startSpeech = async () => {
    const { ok } = await ensureMicrophoneAccess();
    if (!ok) return;

    recognitionRef.current = startSpeechRecognition({
      lang: speechLang,
      onTranscript: (transcript) => {
        setValue(v ? `${v} ${transcript}`.trim() : transcript);
      },
      onEnd: () => {
        recognitionRef.current = null;
        setRecording(false);
      },
    });

    if (recognitionRef.current) setRecording(true);
  };

  const handleMic = async () => {
    if (disabled) return;
    if (onMicClick) onMicClick();
    if (!useSpeechRecognition || !hasSpeech) return;
    if (recording) stopSpeech();
    else await startSpeech();
  };

  const trailing = (
    <BrandCircleSubdueIconButton
      icon={recording ? 'graphic_eq' : 'mic'}
      size='xs'
      variant='fill'
      aria-label='เสียง'
      onClick={handleMic}
      disabled={disabled}
    />
  );

  return (
    <FieldShell
      label={label}
      required={required}
      helperText={helperText}
      error={error}
      showLabel={showLabel}
      showHelperText={showHelperText}
      htmlFor={id}
      className={className}
      style={style}
    >
      <InputBox
        ref={ref}
        id={id}
        name={name}
        size={size}
        value={v}
        onChange={setValue}
        placeholder={placeholder}
        trailing={trailing}
        state={state}
        error={!!error}
        disabled={disabled}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
});

export default VoiceInputField;
