import React, { useRef, useState } from 'react';

/* useFieldId — tiny stand-in for React 18's useId (this app is on React 17).
   Returns a stable, unique-per-mount id for label/input pairing.            */
let __mihFieldIdCounter = 0;
export const useFieldId = (prefix = 'field') => {
  const ref = useRef(null);
  if (ref.current === null) {
    __mihFieldIdCounter += 1;
    ref.current = `${prefix}-${__mihFieldIdCounter}`;
  }
  return ref.current;
};

/* MIH FieldShell + InputBox — shared internals for the Forms Input family
   (Figma 263:7252). NOT exported as a public component; only consumed by
   InputField, VoiceInputField, InputFieldSlash, InputFieldRange, Textarea.

   All values alias from design.md via the CSS custom properties declared
   in src/index.css. Brand-aware tokens (border-input-hover, primaryBorder-600,
   icon-input-hover) retint atomically when <html data-brand> changes.   */

/* Dimensions aliased from design.md / Figma per node 267:50.
   Figma component description: "Size (Large/Small) × State
   (Default/Focus/Error/Disabled). Label + Input + Helper."

   Naming aliases (any of these work):
     • size='lg'  ≡  size='large'                 — 40h (dim-size-800)
     • size='sm'  ≡  size='small'  ≡  size='md'   — 36h (dim-size-700)
   `md` is kept as an alias for back-compat.                              */
const SIZES = {
  lg:    { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', fontSize: 'var(--type-size-base)', iconSize: 'var(--dim-size-400)' },
  large: { height: 'var(--dim-size-800)', paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', fontSize: 'var(--type-size-base)', iconSize: 'var(--dim-size-400)' },
  sm:    { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)',   iconSize: 'var(--dim-size-300, 16px)' },
  small: { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)',   iconSize: 'var(--dim-size-300, 16px)' },
  md:    { height: 'var(--dim-size-700)', paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', fontSize: 'var(--type-size-sm)',   iconSize: 'var(--dim-size-300, 16px)' },
};

/* Icon wrapper — Figma 267:10. Explicit width/height matches the icon
   box token (e.g. dimension/size/400 = 20 for Large). The glyph centers
   inside the fixed box so the surrounding flex `gap: var(--dim-space-200)`
   (8px) lands on the box edge, not on the glyph's side-bearing, keeping
   the visual icon ↔ text spacing tight to Figma's intent.                */
export const Sym = ({ name, size = 20, color }) => (
  <span
    className='material-symbols-outlined shrink-0'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      width: size,
      height: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Resolve box visual state — `state` overrides auto-detection from
   focus/value/error/disabled. Per Figma 267:50 the hover/focus and error
   states use --dim-stroke-200 (2px) borders; the others use 1px.

   Anti-jump technique: the CSS `border` is always 2px transparent
   (reserves the same layout box in every state). The visible "border"
   is drawn via INSET box-shadow whose width changes 1px → 2px on
   hover/focus/error — inset shadows don't reflow content, so the
   placeholder + leading icon stay put as the cursor enters/leaves.

   `state='focus'` is accepted as an alias of `'hover'` per Figma docs. */
export const resolveBox = ({ state, focused, hasValue, error, disabled }) => {
  const normalised = state === 'focus' ? 'hover' : state;
  const effective = normalised || (
    disabled    ? 'disabled' :
    error       ? 'error'    :
    focused     ? 'hover'    : /* mouse-hover OR keyboard focus */
    hasValue    ? 'filled'   :
    'default'
  );
  /* Every bundle returns BOTH `borderShadow` (inset) AND raw `borderColor`
     +`borderWidth` tokens so callers can pick the rendering technique:
       • InputField / Textarea use `borderShadow` (no inner colored element).
       • VoiceTextarea has an inner colored toolbar that would visually
         cover an inset shadow — it uses a real CSS border instead so the
         stroke paints on top of the toolbar's bg.                        */
  switch (effective) {
    case 'hover':
      return {
        borderShadow: 'inset 0 0 0 var(--dim-stroke-200) var(--border-input-hover)',
        borderColor:  'var(--border-input-hover)',
        borderWidth:  'var(--dim-stroke-200)',
        bg:           'var(--surface-input-default)',
        ring:         '0 0 0 var(--dim-stroke-400, 4px) var(--primaryBorder-600)',
        iconColor:    'var(--icon-input-hover)',
        valueColor:   'var(--text-input-typing)',
      };
    case 'filled':
      return {
        borderShadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-filled)',
        borderColor:  'var(--border-input-filled)',
        borderWidth:  'var(--dim-stroke-100)',
        bg:           'var(--surface-input-default)',
        ring:         'none',
        iconColor:    'var(--icon-input-filled)',
        valueColor:   'var(--text-input-filled)',
      };
    case 'error':
      return {
        borderShadow: 'inset 0 0 0 var(--dim-stroke-200) var(--border-input-error)',
        borderColor:  'var(--border-input-error)',
        borderWidth:  'var(--dim-stroke-200)',
        bg:           'var(--surface-input-default)',
        ring:         '0 0 0 var(--dim-stroke-400, 4px) var(--focus-ring-input-error)',
        iconColor:    'var(--icon-input-error)',
        valueColor:   hasValue ? 'var(--text-input-filled)' : 'var(--text-input-default)',
      };
    case 'disabled':
      return {
        borderShadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-disabled)',
        borderColor:  'var(--border-input-disabled)',
        borderWidth:  'var(--dim-stroke-100)',
        bg:           'var(--surface-input-disabled)',
        ring:         'none',
        iconColor:    'var(--icon-input-disabled)',
        valueColor:   'var(--text-input-disabled)',
      };
    default:
      return {
        borderShadow: 'inset 0 0 0 var(--dim-stroke-100) var(--border-input-default)',
        borderColor:  'var(--border-input-default)',
        borderWidth:  'var(--dim-stroke-100)',
        bg:           'var(--surface-input-default)',
        ring:         'none',
        iconColor:    'var(--icon-input-default)',
        valueColor:   hasValue ? 'var(--text-input-filled)' : 'var(--text-input-default)',
      };
  }
};

/* Combine the inset border-shadow with the (optional) outer focus ring
   into one box-shadow value — the wrapper applies this directly.        */
export const composeBoxShadow = (s, includeRing) =>
  includeRing && s.ring && s.ring !== 'none'
    ? `${s.borderShadow}, ${s.ring}`
    : s.borderShadow;

/* Renders the label row (Figma "Field name") + the helper text below the
   box. Wraps {children} which is the actual input box.                   */
export const FieldShell = ({
  label,
  required = false,
  helperText,
  error,
  showLabel = true,
  showHelperText = true,
  htmlFor,
  className = '',
  style = {},
  children,
}) => {
  const helper = error || helperText;
  return (
    <div
      className={`flex flex-col items-start ${className}`}
      style={{
        gap: 'var(--dim-space-150)',
        maxWidth: 640,
        minWidth: 128,
        width: '100%',
        boxSizing: 'content-box',
        ...style,
      }}
    >
      {showLabel && label != null && (
        <label
          htmlFor={htmlFor}
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-050, 2px)',
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}
        >
          <span>{label}</span>
          {required && (
            <span style={{ color: 'var(--text-input-require)', fontWeight: 'var(--type-weight-regular)' }}>*</span>
          )}
        </label>
      )}
      {children}
      {showHelperText && helper && (
        <p
          className='w-full'
          style={{
            margin: 'var(--dim-space-0)',
            color: error ? 'var(--text-danger-secondary)' : 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
          }}
        >
          {helper}
        </p>
      )}
    </div>
  );
};

/* The actual <input> wrapped in its styled box. Designed for a single-line
   text input — Textarea swaps the inner element to <textarea> via its own
   path and does not use this. */
export const InputBox = React.forwardRef(function InputBox({
  id,
  size = 'lg',
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  leadingIcon,
  leading,                   /* arbitrary leading node (e.g. คำนำหน้ารหัส) */
  trailing,                  /* arbitrary trailing node (e.g. mic button) */
  state,                     /* manual state override */
  error = false,
  disabled = false,
  required = false,
  type = 'text',
  name,
  className = '',
  style = {},
  inputStyle = {},
  ...rest
}, ref) {
  const inputRef = useRef(null);
  const [internal, setInternal] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const [focused, setFocused] = useState(false);
  const [mouseHover, setMouseHover] = useState(false);
  const dim = SIZES[size] || SIZES.lg;
  /* Figma's "Hover" state = mouse-hover OR keyboard focus. Both light up
     the brand-p600 2px border AND the 4px primaryBorder-600 ring, so the
     visual treatment matches the design's "Hover" cell regardless of
     whether the cursor or the keyboard triggered it.                     */
  const effectiveFocused = focused || mouseHover;
  const s = resolveBox({ state, focused: effectiveFocused, hasValue: !!v, error, disabled });
  const includeRing = effectiveFocused || state === 'hover' || state === 'focus' || state === 'error';
  const boxShadow = composeBoxShadow(s, includeRing);

  const handleChange = (e) => {
    if (!isControlled) setInternal(e.target.value);
    onChange && onChange(e.target.value, e);
  };

  /* Caller may pass `style` on the native <input> via ...rest; spreading rest
     after our style object would clobber padding — keep inner chrome-free
     (0px horizontal padding) per Figma / components preview. */
  const { style: restInputStyle, ...inputDomRest } = rest;
  const mergedInputStyle = { ...restInputStyle, ...inputStyle };

  const assignInputRef = (el) => {
    inputRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <div
      onMouseEnter={() => !disabled && setMouseHover(true)}
      onMouseLeave={() => setMouseHover(false)}
      onMouseDown={(e) => {
        if (disabled) return;
        const input = inputRef.current;
        if (!input || e.target === input) return;
        /* Don't steal clicks from trailing actions (mic, clear, etc.). */
        if (e.target.closest('button, a, [role="button"]')) return;
        /* Forward gutter clicks to the <input> so the whole bordered
           shell is a hit target (same fix as Textarea). */
        e.preventDefault();
        input.focus();
      }}
      className={`flex items-center w-full cursor-text ${className}`}
      style={{
        gap: 'var(--dim-space-200)',
        height: dim.height,
        paddingLeft:   dim.paddingX,
        paddingRight:  dim.paddingX,
        paddingTop:    dim.paddingY,
        paddingBottom: dim.paddingY,
        borderRadius: 'var(--dim-radius-200)',
        /* No CSS border — both the visible inner border AND the outer focus
           ring are drawn via box-shadow so they sit flush (no transparent
           gap between them) and content never reflows when the border
           width swaps between 1px and 2px. */
        border: 'none',
        background: s.bg,
        boxShadow,
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'box-shadow 160ms cubic-bezier(0.4, 0, 0.2, 1), background 160ms cubic-bezier(0.4, 0, 0.2, 1)',
        ...style,
      }}
    >
      {leadingIcon && <Sym name={leadingIcon} size={dim.iconSize} color={s.iconColor} />}
      {leading}
      <input
        ref={assignInputRef}
        id={id}
        name={name}
        type={type}
        value={v}
        onChange={handleChange}
        onFocus={(e) => { setFocused(true); onFocus && onFocus(e); }}
        onBlur={(e) => { setFocused(false); onBlur && onBlur(e); }}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={error || undefined}
        className='mih-input-placeholder flex-1 min-w-0 bg-transparent'
        {...inputDomRest}
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
          fontSize: dim.fontSize,
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
          ...mergedInputStyle,
          paddingLeft: 'var(--dim-space-0)',
          paddingRight: 'var(--dim-space-0)',
        }}
      />
      {trailing}
    </div>
  );
});

/* Placeholder color is set on the <input> element via CSS variable — fall
   back to inline ::placeholder pseudo. React doesn't support inline
   pseudo, so we inject a global style once when this module loads.        */
if (typeof document !== 'undefined' && !document.getElementById('mih-input-placeholder-style')) {
  const s = document.createElement('style');
  s.id = 'mih-input-placeholder-style';
  s.textContent = `
.mih-input-placeholder::placeholder { color: var(--text-input-default, #ADB2B7); opacity: 1; }
.mih-input-placeholder:disabled::placeholder { color: var(--text-input-disabled, var(--text-input-default, #ADB2B7)); }
`;
  document.head.appendChild(s);
}
