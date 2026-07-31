import React, { useRef, useState } from 'react';

/* MIH PhotoUploadField — Figma "Photo" (node 3420:2565 · Telemed 127:56901).
   Dashed-border photo / image upload dropzone for the form builder. Two
   states per Figma: Default / Hover (border darkens to brand green on hover,
   fill holds). Icon (image, 20) + centered label ("ถ่ายรูป" / "อัปโหลดภาพ").

   Interaction: a real <button>. Pass `onFiles` to wire a hidden <input
   type="file"> (clicking opens the picker; add `capture` for direct camera);
   otherwise it just fires `onClick`.

   Tokens (all alias from design.md formBuilder scale — no hex literals):
     • Surface — --surface-formbuilder-default / -hover (brand/p50 #F4FBF8)
     • Border  — --border-formbuilder-default (#C5EDDA) / -hover (#08A768)
     • Text/Icon — --text-formbuilder-text (#007549)
     • Geometry — --dim-stroke-150 (1.5px), --dim-radius-200 (8px),
                  --dim-space-600 (24px), --dim-space-200 (8px),
                  --dim-size-2000 (128px), --dim-size-400 (20px) */

const Sym = ({ name, size, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
    }}
    aria-hidden
  >
    {name}
  </span>
);

const PhotoUploadField = React.forwardRef(function PhotoUploadField(
  {
    label = 'อัปโหลดภาพ',
    icon = 'image',
    onClick,
    onFiles,
    accept = 'image/*',
    capture,               /* e.g. 'environment' to open the camera directly */
    multiple = false,
    disabled = false,
    fullWidth = false,     /* stretch to fill container (Telemed 127:56901 uses size-full) */
    /* Controlled hover override — used by the design-system state matrix. */
    hovered: hoveredProp,
    type = 'button',
    'aria-label': ariaLabel,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [hoveredState, setHoveredState] = useState(false);
  const inputRef = useRef(null);
  const hovered = (hoveredProp ?? hoveredState) && !disabled;

  const handleClick = (e) => {
    if (disabled) return;
    if (onFiles && inputRef.current) inputRef.current.click();
    onClick && onClick(e);
  };

  const borderColor = hovered
    ? 'var(--border-formbuilder-hover, #08A768)'
    : 'var(--border-formbuilder-default, #C5EDDA)';

  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel || label}
      onClick={handleClick}
      onMouseEnter={() => setHoveredState(true)}
      onMouseLeave={() => setHoveredState(false)}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center transition-colors duration-200 ease-out ${className}`}
      style={{
        width: fullWidth ? '100%' : 'var(--dim-size-2000, 128px)',
        height: 'var(--dim-size-2000, 128px)',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        borderRadius: 'var(--dim-radius-200, 8px)',
        border: `var(--dim-stroke-150, 1.5px) dashed ${borderColor}`,
        background: hovered
          ? 'var(--surface-formbuilder-hover, #F4FBF8)'
          : 'var(--surface-formbuilder-default, #F4FBF8)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      {...rest}
    >
      <span style={{ display: 'flex', flex: '1 0 0', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-200, 8px)', minWidth: 0 }}>
        <Sym name={icon} size='var(--dim-size-400, 20px)' color='var(--text-formbuilder-text, #007549)' />
        <span style={{
          fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
          fontSize: 'var(--type-size-xs, 12px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          lineHeight: 1.5,
          color: 'var(--text-formbuilder-text, #007549)',
          textAlign: 'center',
        }}
        >{label}</span>
      </span>
      {onFiles && (
        <input
          ref={inputRef}
          type='file'
          accept={accept}
          capture={capture}
          multiple={multiple}
          onChange={(e) => { const files = e.target.files; if (files && files.length) onFiles(files); e.target.value = ''; }}
          style={{ display: 'none' }}
          tabIndex={-1}
          aria-hidden
        />
      )}
    </button>
  );
});

export default PhotoUploadField;
