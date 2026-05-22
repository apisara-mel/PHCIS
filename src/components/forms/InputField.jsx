import React from 'react';
import { FieldShell, InputBox, useFieldId } from '@/components/forms/_inputBox';

/* MIH InputField — Figma "Input Field" (node 267:50). The single canonical
   single-line input for the whole app. Both InputField and the legacy
   Fields.TextInput export resolve to this component, so any visual tweak
   propagates atomically.

   Variants (per Figma):
     • Size:           lg (40h base) / md (36h sm)
     • State:          default · hover · filled · error · disabled
                        (auto-resolved from mouse-hover, focus, value,
                         error and disabled, with `state` override)
     • showLeadingIcon: toggles the leading icon slot — that is the
                        Figma variant for "with icon" vs "no icon".

   Bare-mode optimisation: when the caller suppresses both the label AND
   the helper (`showLabel={false}` + `showHelperText={false}`) and supplies
   no label/error text, we skip the FieldShell wrapper entirely and render
   just <InputBox>. This is the path the legacy Fields.TextInput exercise
   inside their own <Field> wrappers — same DOM as before the merge.

   All visual values alias from design.md tokens (--surface-input-*,
   --border-input-*, --text-input-*, --icon-input-*, --dim-stroke-200,
   --primaryBorder-600). Brand-aware tokens retint via <html data-brand>. */

const InputField = React.forwardRef(function InputField(
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
    leadingIcon,
    showLabel = true,
    showHelperText = true,
    showLeadingIcon = true,
    state,
    disabled = false,
    type = 'text',
    id: idProp,
    name,
    className = '',
    style = {},
    inputStyle,
    ...rest
  },
  ref,
) {
  const autoId = useFieldId('input');
  const id = idProp || autoId;

  /* The Box is always the same — only its surrounding shell changes. */
  const box = (
    <InputBox
      ref={ref}
      id={id}
      name={name}
      size={size}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      leadingIcon={showLeadingIcon ? leadingIcon : undefined}
      state={state}
      error={!!error}
      disabled={disabled}
      required={required}
      type={type}
      className={className}
      style={style}
      inputStyle={inputStyle}
      {...rest}
    />
  );

  /* Bare mode — caller owns its own label/helper layout (e.g. legacy
     <Field> from Fields.jsx). No FieldShell wrapper added.              */
  const renderLabel  = showLabel && label != null;
  const renderHelper = showHelperText && (error || helperText);
  if (!renderLabel && !renderHelper) return box;

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
      {box}
    </FieldShell>
  );
});

export default InputField;
