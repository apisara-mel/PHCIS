import React, { useRef } from 'react';
import TextareaCanonical from '@/components/forms/Textarea';
import VoiceTextarea, {
  VOICE_TEXTAREA_HEIGHT,
  VOICE_TEXTAREA_MIN_HEIGHT,
} from '@/components/forms/VoiceTextarea';
import { useTextareaSuggestions } from '@/components/forms/textareaSuggestions';

/* MIH SuggestibleTextarea — Figma PHCIS · OPD 162:24221 + Voice Textarea 3280:3970.

   Multiline field (plain Textarea or VoiceTextarea) with a shared autocomplete
   popover (`textareaSuggestions`). Set `voice` for speak-to-text toolbar.

   Used by SymptomStep, HistoryListForm, and any screen that passes
   `suggestions` + optional `voice`. */

const InnerTextarea = React.forwardRef(({
  label,
  required,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  rows = 3,
  boxRef,
  disabled = false,
}, ref) => (
  <TextareaCanonical
    ref={ref}
    boxRef={boxRef}
    label={label}
    required={required}
    showLabel={!!label}
    showHelperText={false}
    disabled={disabled}
    value={value ?? ''}
    onChange={(next, e) => {
      if (typeof onChange === 'function') onChange(e || { target: { value: next } });
    }}
    onFocus={onFocus}
    onBlur={onBlur}
    rows={rows}
    placeholder={placeholder}
    className='flex-1 min-w-0'
  />
));
InnerTextarea.displayName = 'InnerTextarea';

const InnerVoiceTextarea = React.forwardRef(({
  label,
  required,
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  height = VOICE_TEXTAREA_HEIGHT,
  minHeight = VOICE_TEXTAREA_MIN_HEIGHT,
  boxRef,
  disabled = false,
  resizable = true,
}, ref) => (
  <VoiceTextarea
    ref={ref}
    boxRef={boxRef}
    label={label}
    required={required}
    showLabel={!!label}
    showHelperText={false}
    disabled={disabled}
    resizable={resizable}
    value={value ?? ''}
    /* VoiceTextarea emits (value, event); suggestion hook expects that pair.
       Wrapping as a DOM event breaks minChars filtering (Figma 162:24221). */
    onChange={onChange}
    onFocus={onFocus}
    onBlur={onBlur}
    height={height}
    minHeight={minHeight}
    placeholder={placeholder}
    className='flex-1 min-w-0'
  />
));
InnerVoiceTextarea.displayName = 'InnerVoiceTextarea';

const SuggestibleTextarea = ({
  label,
  required,
  value,
  onChange,
  placeholder,
  suggestions,
  minChars = 3,
  rows = 3,
  voice = false,
  height = VOICE_TEXTAREA_HEIGHT,
  minHeight = VOICE_TEXTAREA_MIN_HEIGHT,
  disabled = false,
  resizable = true,
  popoverWidth = 591,
  popoverAriaLabel = 'คำแนะนำ',
}) => {
  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    enabled,
    handleEventChange,
    handleValueChange,
    handleFocus,
    portal,
  } = useTextareaSuggestions({
    value,
    onChange,
    suggestions,
    minChars,
    popoverWidth,
    popoverAriaLabel,
    /* Anchor the dropdown to the inner <textarea> (textareaRef) so it
       sits just below the typing area — not below the entire field
       including the voice/save toolbar. Falls back to the outer box
       on first render while the textarea ref is still attaching. */
    anchorRef: textareaRef,
    containerRef,
  });

  const Field = voice ? InnerVoiceTextarea : InnerTextarea;
  const changeHandler = voice ? handleValueChange : handleEventChange;

  const fieldProps = {
    label,
    required,
    value,
    placeholder,
    ref: textareaRef,
    boxRef,
    disabled,
    resizable,
  };

  const passthroughChange = voice
    ? (next, e) => onChange(e || { target: { value: next } })
    : onChange;

  if (voice) {
    fieldProps.height = height;
    fieldProps.minHeight = minHeight;
  } else {
    fieldProps.rows = rows;
  }
  fieldProps.onChange = enabled ? changeHandler : passthroughChange;
  if (enabled) fieldProps.onFocus = handleFocus;

  if (!enabled) {
    return <Field {...fieldProps} />;
  }

  return (
    <>
      <div ref={containerRef} className='flex-1 min-w-0 relative'>
        <Field {...fieldProps} />
      </div>
      {portal}
    </>
  );
};

export default SuggestibleTextarea;
