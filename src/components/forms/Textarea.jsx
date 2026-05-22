import React, { useRef, useState } from 'react';
import { FieldShell, resolveBox, composeBoxShadow, useFieldId } from '@/components/forms/_inputBox';

/* MIH Textarea — Figma "Textarea" (node 268:26). Multiline input.
   5 states (default / hover (focus) / filled / error / disabled).

   Tokens alias from design.md — same family as InputField:
   --surface-input-default, --border-input-*, --text-input-*. Brand-aware
   border-input-hover + primaryBorder-600 retint via <html data-brand>.

   Geometry per Figma: min-height 96px, padding 12px / 8px (3xx / 2xx).
   Vertical resize is enabled by default; pass `resize` to override.    */

const Textarea = React.forwardRef(function Textarea(
  {
    label,
    required = false,
    helperText,
    error,
    placeholder = 'Placeholder',
    value,
    defaultValue,
    onChange,
    rows = 3,
    resize = 'vertical', /* CSS resize value */
    showLabel = true,
    showHelperText = true,
    state,
    disabled = false,
    minHeight = 96,
    id: idProp,
    name,
    className = '',
    style = {},
    textareaStyle,
    boxRef,
    onFocus: onFocusProp,
    onBlur: onBlurProp,
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('textarea');
  const id = idProp || autoId;
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  /* Local handle on the inner <textarea> so the surrounding box can
     forward padding-gutter clicks to it (matches VoiceTextarea). The
     forwarded `ref` is still wired through `composeTextareaRef` so
     SuggestibleTextarea's anchor logic and any external caller refs
     keep pointing at the same DOM node. */
  const textareaInnerRef = useRef(null);
  const composeTextareaRef = (el) => {
    textareaInnerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };
  const [focused, setFocused] = useState(false);
  const [mouseHover, setMouseHover] = useState(false);
  /* Mouse-hover and keyboard-focus both produce Figma's "Hover" state —
     same brand-p600 2px border + 4px primaryBorder-600 ring effect. */
  const effectiveFocused = focused || mouseHover;
  const s = resolveBox({ state, focused: effectiveFocused, hasValue: !!v, error: !!error, disabled });
  const includeRing = effectiveFocused || state === 'hover' || state === 'focus' || state === 'error';
  const boxShadow = composeBoxShadow(s, includeRing);

  const handleChange = (e) => {
    if (!isControlled) setInternal(e.target.value);
    onChange && onChange(e.target.value, e);
  };

  const setBoxRef = (el) => {
    if (!boxRef) return;
    if (typeof boxRef === 'function') boxRef(el);
    else boxRef.current = el;
  };

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
      <div
        ref={setBoxRef}
        onMouseEnter={() => !disabled && setMouseHover(true)}
        onMouseLeave={() => setMouseHover(false)}
        onMouseDown={(e) => {
          if (disabled) return;
          const ta = textareaInnerRef.current;
          if (!ta || e.target === ta) return;
          /* Forward gutter clicks (the 12/8 px padding around the
             textarea) to the textarea so the whole bordered shell acts
             as a hit target. Without this, clicking the padding zone
             did nothing and made the field feel uneditable. */
          e.preventDefault();
          ta.focus();
        }}
        className='w-full flex flex-col items-start overflow-hidden cursor-text'
        style={{
          minHeight,
          paddingLeft:   'var(--dim-space-300)',
          paddingRight:  'var(--dim-space-300)',
          paddingTop:    'var(--dim-space-200)',
          paddingBottom: 'var(--dim-space-200)',
          borderRadius: 'var(--dim-radius-200)',
          /* No CSS border — visible inner border + outer focus ring are
             both box-shadows so they sit flush (no transparent gap) and
             content doesn't reflow when border width swaps. */
          border: 'none',
          background: s.bg,
          boxShadow,
          boxSizing: 'border-box',
          transition: 'box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1)',
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
          rows={rows}
          aria-invalid={!!error || undefined}
          className='mih-input-placeholder w-full bg-transparent'
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
            resize,
            ...textareaStyle,
          }}
          {...rest}
        />
      </div>
    </FieldShell>
  );
});

export default Textarea;
