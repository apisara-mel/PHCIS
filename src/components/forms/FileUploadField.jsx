import React, { useRef, useState } from 'react';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Icon } from '@/components/icons/Icon';

/* FileUploadField — DS-shaped wrapper around <input type="file">.

   CLAUDE.md: "Custom search / input / textarea / select wrappers in this
   project own their own border, focus, and shadow. The native control
   sitting inside MUST be completely chrome-free." A bare file input is the
   loudest browser-default control there is — every OS renders its own
   button, its own font and its own "No file chosen" text, none of which
   match the design system. So the native input is hidden entirely and the
   visible affordance is a DS button plus a filename chip.

   Props:
     • label / helperText — same copy slots as InputField
     • accept            — forwarded to the native input
     • buttonLabel       — defaults to "เลือกไฟล์"
     • fileName          — controlled display name (falls back to the picked
                           file's own name, so callers that don't track it
                           still show something)
     • onFile(file)      — the picked File; cleared selections fire nothing
     • onClear()         — shown as an × next to the filename when provided */

const FileUploadField = ({
  label,
  helperText,
  accept,
  buttonLabel = 'เลือกไฟล์',
  fileName,
  onFile,
  onClear,
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const shown = fileName ?? picked;

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    /* Cancelling the OS picker fires change with an empty list — keep the
       previous selection rather than blanking the field. */
    if (!file) return;
    setPicked(file.name);
    onFile?.(file);
    /* Reset so picking the *same* file twice still fires change. */
    e.target.value = '';
  };

  const clear = () => {
    setPicked(null);
    onClear?.();
  };

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
      {label && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)', color: 'var(--text-content-default)' }}>
          {label}
        </span>
      )}

      <input ref={inputRef} type='file' accept={accept} onChange={handleChange} style={{ display: 'none' }} />

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton
          size='sm'
          leadingIcon='attach_file'
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {buttonLabel}
        </NeutralSubdueButton>

        {shown ? (
          <span
            className='inline-flex items-center min-w-0'
            style={{
              gap: 'var(--dim-space-150)',
              maxWidth: 280,
              background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
              borderRadius: 'var(--dim-radius-200)',
              paddingTop: 'var(--dim-space-100)',
              paddingRight: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-100)',
              paddingLeft: 'var(--dim-space-200)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-default)',
            }}
          >
            <span className='truncate'>{shown}</span>
            {onClear && (
              <button
                type='button'
                aria-label='ลบไฟล์ที่เลือก'
                onClick={clear}
                className='shrink-0 inline-flex items-center'
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--text-content-tertiary)' }}
              >
                <Icon name='close' size={14} />
              </button>
            )}
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ยังไม่ได้เลือกไฟล์
          </span>
        )}
      </div>

      {helperText && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};

export default FileUploadField;
