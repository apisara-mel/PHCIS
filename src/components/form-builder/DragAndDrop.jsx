import React, { useEffect, useRef, useState } from 'react';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import DangerButton from '@/components/button/DangerButton';

/* MIH FormBuilder DragAndDrop — Figma "Drag and Drop" (node 2451:13908).
   File-upload drop zone with two layouts and full interaction: drag-over
   highlight, native file picker, multi-file support, validation, and a
   Filled-state file card with a remove X.

   Layouts (size prop):
     • 'lg' (default) — 192h vertical: 40×40 white circle icon, title,
       "Select files" Brand Subdue Button, helper text "PNG, JPG, PDF up
       to 10 MB".
     • 'sm'           — 80h horizontal: same elements inline, no helper.

   States (auto-resolved):
     • default — dashed brand-p200 border + brand-p50 fill
     • hover   — dashed brand-p600 border (driven by mouse hover OR DOM
                  dragover events from real drags)
     • error   — dashed danger/700 border + danger/quaternary fill (set
                  via the `error` prop or auto when validation fails)
     • filled  — once `value` has files: render a stack of file cards
                  (Figma 2562:10822) — white card, brand-p100 thumb box,
                  filename + size, X to remove.

   API:
     • value (File[])           — controlled file list (or `defaultValue`).
     • onChange(files)          — fires after add/remove with the full list.
     • onError({ code, message, file? }) — fires on rejected files.
     • accept (string)          — same syntax as <input accept>.
     • multiple (bool)          — default true.
     • maxSize (bytes)          — per-file size cap (default 10 MB).
     • disabled (bool)          — blocks all interaction.                   */

const Sym = ({ name, size = 20, color, fill }) => (
  <span
    className='material-symbols-outlined shrink-0'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: fill ? "'FILL' 1" : undefined,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const DEFAULT_MAX = 10 * 1024 * 1024; /* 10 MB */

const FileCard = ({ file, onRemove, disabled }) => {
  const [hover, setHover] = useState(false);
  return (
  <div
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    className='inline-flex items-center w-full'
    style={{
      gap: 'var(--dim-space-300)',
      minHeight: 80,
      padding: 'var(--dim-space-400)',
      background: 'var(--surface-formbuilder-card)',
      border: `var(--dim-stroke-100) solid var(--border-formbuilder-filled)`,
      borderRadius: 'var(--dim-radius-200)',
      boxShadow: hover ? 'var(--shadow-formbuilder)' : 'none',
      boxSizing: 'border-box',
      transition: 'box-shadow 120ms ease',
    }}
  >
    {/* 40×40 brand-p100 thumbnail */}
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--brand-p100)',
        color: 'var(--text-formbuilder-text)',
      }}
    >
      <Sym name='description' size={20} color='currentColor' fill />
    </span>
    <div className='flex flex-col flex-1 min-w-0'>
      <span
        className='truncate'
        style={{
          color: 'var(--text-formbuilder-text)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
        }}
      >
        {file.name}
      </span>
      <span
        className='truncate'
        style={{
          color: 'var(--text-formbuilder-subtext)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
        }}
      >
        {formatBytes(file.size)}
      </span>
    </div>
    <button
      type='button'
      onClick={onRemove}
      disabled={disabled}
      aria-label={`Remove ${file.name}`}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 24,
        height: 24,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: 'var(--text-formbuilder-text)',
      }}
    >
      <Sym name='close' size={16} color='currentColor' />
    </button>
  </div>
  );
};

/* Image-preview variant of the filled card — used when `preview` is on and
   the file is an image. Renders the actual uploaded image (object-fit:
   contain on a brand-p50 stage) above a filename + size + remove row, so
   the user sees the cover art clearly instead of a generic file icon.
   Non-image files (e.g. PDF) keep the compact <FileCard>. */
const ImagePreviewCard = ({ file, onRemove, disabled }) => {
  const [hover, setHover] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        background: 'var(--surface-formbuilder-card)',
        border: `var(--dim-stroke-100) solid var(--border-formbuilder-filled)`,
        borderRadius: 'var(--dim-radius-200)',
        boxShadow: hover ? 'var(--shadow-formbuilder)' : 'none',
        boxSizing: 'border-box',
        transition: 'box-shadow 120ms ease',
      }}
    >
      {/* Image stage — full-width 16:9 frame, image fills it (object-fit: cover) */}
      <div
        className='w-full flex items-center justify-center overflow-hidden'
        style={{
          borderRadius: 'var(--dim-radius-200)',
          background: 'var(--surface-formbuilder-default)',
          aspectRatio: '16 / 9',
        }}
      >
        {url && (
          <img
            src={url}
            alt={file.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </div>
      {/* filename + size + remove */}
      <div className='inline-flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--dim-radius-200)',
            background: 'var(--brand-p100)',
            color: 'var(--text-formbuilder-text)',
          }}
        >
          <Sym name='image' size={20} color='currentColor' fill />
        </span>
        <div className='flex flex-col flex-1 min-w-0'>
          <span
            className='truncate'
            style={{
              color: 'var(--text-formbuilder-text)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {file.name}
          </span>
          <span
            className='truncate'
            style={{
              color: 'var(--text-formbuilder-subtext)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
            }}
          >
            {formatBytes(file.size)}
          </span>
        </div>
        <button
          type='button'
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${file.name}`}
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 24,
            height: 24,
            background: 'transparent',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--text-formbuilder-text)',
          }}
        >
          <Sym name='close' size={16} color='currentColor' />
        </button>
      </div>
    </div>
  );
};

const isImageFile = (f) => !!f && typeof f.type === 'string' && f.type.startsWith('image/');

const DragAndDrop = React.forwardRef(function DragAndDrop(
  {
    value,
    defaultValue,
    onChange,
    onError,
    accept,
    multiple = true,
    maxSize = DEFAULT_MAX,
    size = 'lg',
    /* When true, image files render as a large <ImagePreviewCard> showing the
       actual uploaded picture (used for cover-image uploads). Non-image files
       still fall back to the compact <FileCard>. */
    preview = false,
    disabled = false,
    error: errorProp,
    state,                                /* force 'default' | 'hover' | 'error' | 'filled' for demos */
    title = 'ลากและวางไฟล์ หรือคลิกเพื่ออัปโหลด',
    helper = 'PNG, JPG, PDF up to 10 MB',
    ctaLabel = 'Select files',
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const inputRef = useRef(null);
  const [internal, setInternal] = useState(() => defaultValue || []);
  const isControlled = value !== undefined;
  const files = isControlled ? value : internal;
  const [internalHover, setInternalHover] = useState(false);
  const hover = state ? state === 'hover' : internalHover;
  const setHover = state ? () => {} : setInternalHover;
  const [dragOver, setDragOver] = useState(false);
  const [internalError, setInternalError] = useState(false);
  const errored = state === 'error' || !!errorProp || internalError;

  const isHover = state === 'hover' || ((hover || dragOver) && !disabled && !errored);

  const updateFiles = (next) => {
    if (!isControlled) setInternal(next);
    onChange && onChange(next);
  };

  const validateAndAdd = (incoming) => {
    if (!incoming || incoming.length === 0) return;
    const list = Array.from(incoming);
    const accepted = [];
    let rejected = false;
    list.forEach((f) => {
      if (maxSize && f.size > maxSize) {
        rejected = true;
        onError && onError({ code: 'size', message: `${f.name} exceeds max size`, file: f });
        return;
      }
      accepted.push(f);
    });
    if (rejected) {
      setInternalError(true);
      window.setTimeout(() => setInternalError(false), 2400);
    }
    if (accepted.length === 0) return;
    const merged = multiple ? [...files, ...accepted] : accepted.slice(0, 1);
    updateFiles(merged);
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current && inputRef.current.click();
  };
  const handleInput = (e) => {
    validateAndAdd(e.target.files);
    e.target.value = ''; /* allow re-selecting the same file */
  };
  const handleDragOver = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(false);
  };
  const handleDrop = (e) => {
    if (disabled) return;
    e.preventDefault();
    setDragOver(false);
    validateAndAdd(e.dataTransfer.files);
  };
  const removeAt = (idx) => {
    const next = files.slice();
    next.splice(idx, 1);
    updateFiles(next);
  };

  /* Border + bg resolve through tokens — error wins, then hover, default. */
  const border = errored
    ? `var(--dim-stroke-150) dashed var(--border-formbuilder-error)`
    : `var(--dim-stroke-150) dashed ${
        isHover ? 'var(--border-formbuilder-hover)' : 'var(--border-formbuilder-default)'
      }`;
  const bg = errored
    ? 'var(--surface-formbuilder-error)'
    : 'var(--surface-formbuilder-default)';

  const isSm = size === 'sm';

  /* Filled rendering — stack file cards. Drop-zone is hidden once any
     file exists (caller can still call onChange([]) to reset).             */
  if (files && files.length > 0) {
    return (
      <div
        ref={ref}
        className={`flex flex-col w-full ${className}`}
        style={{ gap: 'var(--dim-space-200)', ...style }}
        {...rest}
      >
        {files.map((f, i) => (
          preview && isImageFile(f) ? (
            <ImagePreviewCard
              key={`${f.name}-${i}`}
              file={f}
              disabled={disabled}
              onRemove={() => removeAt(i)}
            />
          ) : (
            <FileCard
              key={`${f.name}-${i}`}
              file={f}
              disabled={disabled}
              onRemove={() => removeAt(i)}
            />
          )
        ))}
        {multiple && !disabled && (
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='add'
            onClick={handleClick}
            className='self-start'
          >
            {ctaLabel}
          </BrandSubdueButton>
        )}
        <input
          ref={inputRef}
          type='file'
          accept={accept}
          multiple={multiple}
          onChange={handleInput}
          className='sr-only'
          tabIndex={-1}
        />
      </div>
    );
  }

  /* Empty drop zone — vertical (lg) or horizontal (sm). */
  return (
    <div
      ref={ref}
      role='button'
      tabIndex={disabled ? -1 : 0}
      aria-label={title}
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex w-full items-center justify-center ${className}`}
      style={{
        flexDirection: isSm ? 'row' : 'column',
        gap: 'var(--dim-space-200)',
        minHeight: isSm ? 80 : 192,
        padding: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-200)',
        border,
        background: bg,
        boxShadow: isHover ? 'var(--shadow-formbuilder)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxSizing: 'border-box',
        transition: 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease',
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
      {...rest}
    >
      {/* Icon + title (+ helper for lg / inline-stacked for sm) */}
      <div
        className='flex items-center'
        style={{
          flexDirection: isSm ? 'row' : 'column',
          gap: isSm ? 'var(--dim-space-300)' : 'var(--dim-space-200)',
          flex: isSm ? '1 0 0' : undefined,
          minWidth: 0,
        }}
      >
        <span
          className='inline-flex items-center justify-center shrink-0'
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-card-100, #FFFFFF)',
            boxShadow: 'var(--shadow-card, 0 1px 2px rgba(100,116,139,0.10))',
            color: errored ? 'var(--icon-formbuilder-error)' : 'var(--text-formbuilder-text)',
          }}
        >
          <Sym name='upload_file' size={20} color='currentColor' />
        </span>
        <div
          className='flex flex-col min-w-0'
          style={{
            alignItems: isSm ? 'flex-start' : 'center',
            gap: 'var(--dim-space-0)',
          }}
        >
          <span
            className={isSm ? '' : 'text-center'}
            style={{
              color: errored ? 'var(--text-formbuilder-error)' : 'var(--text-formbuilder-text)',
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
              lineHeight: 1.5,
            }}
          >
            {title}
          </span>
          {isSm && helper && (
            <span
              style={{
                color: 'var(--text-formbuilder-subtext)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                fontWeight: 'var(--type-weight-medium)',
                lineHeight: 1.5,
              }}
            >
              {helper}
            </span>
          )}
        </div>
      </div>

      {/* Figma 341:8227 (Brand) / 341:8558 (Danger). Outline / sm in both
          cases. Stop propagation so the button click and the zone click
          don't both fire. */}
      {errored ? (
        <DangerButton
          variant='outline'
          size='sm'
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          {ctaLabel}
        </DangerButton>
      ) : (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          disabled={disabled}
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
        >
          {ctaLabel}
        </BrandSubdueButton>
      )}

      {/* Helper line — only on lg (sm shows helper inline above) */}
      {!isSm && helper && (
        <span
          className='text-center'
          style={{
            color: 'var(--text-formbuilder-subtext)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
          }}
        >
          {helper}
        </span>
      )}

      <input
        ref={inputRef}
        type='file'
        accept={accept}
        multiple={multiple}
        onChange={handleInput}
        className='sr-only'
        tabIndex={-1}
      />
    </div>
  );
});

export default DragAndDrop;
export { FileCard };
