import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/icons/Icon';

/* MIH UploadProgressBar — smooth determinate progress for file / image upload.
   Tokens alias design.md (brand primary fill on quaternary track). */

const TRACK_H = 'var(--dim-size-100, 8px)';

const LABEL = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const PCT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.5,
  fontVariantNumeric: 'tabular-nums',
};

const BOX = {
  width: '100%',
  boxSizing: 'border-box',
  padding: 'var(--dim-space-400) var(--dim-space-500)',
  background: 'var(--surface-formbuilder-default, #F4FBF8)',
  border: 'var(--dim-stroke-150, 1.5px) dashed var(--border-formbuilder-default, #C5EDDA)',
  borderRadius: 'var(--dim-radius-200, 8px)',
};

const STYLE_ID = 'mih-upload-progress-bar';

const ensureStyles = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes mih-upload-progress-shimmer {
      0% { transform: translateX(-120%); }
      100% { transform: translateX(220%); }
    }
    .mih-upload-progress-fill {
      position: relative;
      overflow: hidden;
      will-change: width;
    }
    .mih-upload-progress-fill::after {
      content: '';
      position: absolute;
      inset: 0;
      width: 40%;
      background: linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in srgb, #fff 45%, transparent) 50%,
        transparent 100%
      );
      animation: mih-upload-progress-shimmer 1.1s ease-in-out infinite;
      pointer-events: none;
    }
  `;
  document.head.appendChild(el);
};

const formatBytes = (n) => {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const isImageFile = (file) => file && (
  /^image\//i.test(file.type)
  || /\.(jpe?g|png|gif|webp)$/i.test(file.name || '')
);

/**
 * @param {object} props
 * @param {number} props.progress — 0..100
 * @param {string} [props.label]
 * @param {string} [props.fileName]
 * @param {boolean} [props.showPercent]
 */
export default function UploadProgressBar({
  progress = 0,
  label = 'กำลังอัปโหลด…',
  fileName,
  showPercent = true,
}) {
  useEffect(() => { ensureStyles(); }, []);

  const pct = Math.max(0, Math.min(100, Number(progress) || 0));
  const rounded = Math.round(pct);

  return (
    <div
      className='flex flex-col w-full'
      style={{ gap: 'var(--dim-space-200)' }}
      role='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
      aria-label={label}
    >
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)', flex: 1 }}>
          <span style={LABEL}>{label}</span>
          {fileName ? (
            <span
              className='truncate'
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.4,
              }}
            >
              {fileName}
            </span>
          ) : null}
        </div>
        {showPercent ? <span style={PCT}>{rounded}%</span> : null}
      </div>
      <div
        style={{
          width: '100%',
          height: TRACK_H,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          overflow: 'hidden',
        }}
      >
        <div
          className='mih-upload-progress-fill'
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 'var(--dim-radius-full)',
            background: 'var(--surface-brandPrimary-default, #007549)',
            minWidth: pct > 0 && pct < 2 ? 'var(--dim-size-100, 8px)' : undefined,
          }}
        />
      </div>
    </div>
  );
}

/** Progress bar wrapped in its own form-builder box. */
export function UploadProgressBox({
  progress = 0,
  label = 'กำลังอัปโหลด…',
  fileName,
  showPercent = true,
  style,
}) {
  return (
    <div
      className='flex w-full'
      style={{ ...BOX, ...style }}
      aria-busy='true'
    >
      <UploadProgressBar
        progress={progress}
        label={label}
        fileName={fileName}
        showPercent={showPercent}
      />
    </div>
  );
}

/** Evidence preview shown below upload controls after a file is attached. */
export function UploadEvidenceCard({ file, onRemove, disabled = false, label = 'หลักฐานที่แนบ' }) {
  const [previewUrl, setPreviewUrl] = useState('');
  const isImage = isImageFile(file);

  useEffect(() => {
    if (!file || !isImage) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  if (!file) return null;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <span
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
      <div
        className='flex items-center w-full'
        style={{
          gap: 'var(--dim-space-300)',
          minHeight: 'var(--dim-size-1700, 80px)',
          padding: 'var(--dim-space-400)',
          background: 'var(--surface-formbuilder-card, #FFFFFF)',
          border: 'var(--dim-stroke-100) solid var(--border-formbuilder-filled, #C5EDDA)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          boxSizing: 'border-box',
        }}
      >
        {isImage && previewUrl ? (
          <span
            className='shrink-0 overflow-hidden'
            style={{
              width: 'var(--dim-size-1400, 64px)',
              height: 'var(--dim-size-1400, 64px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--surface-formbuilder-default, #F4FBF8)',
            }}
          >
            <img
              src={previewUrl}
              alt={file.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </span>
        ) : (
          <span
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 'var(--dim-size-1400, 64px)',
              height: 'var(--dim-size-1400, 64px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              background: 'var(--brand-p100, #E6F6EF)',
              color: 'var(--text-formbuilder-text, #007549)',
            }}
          >
            <Icon name='description' size={28} color='currentColor' />
          </span>
        )}
        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span
            className='truncate'
            style={{
              color: 'var(--text-formbuilder-text, #007549)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
            }}
          >
            {file.name}
          </span>
          <span
            style={{
              color: 'var(--text-formbuilder-subtext, #5B8F78)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}
          >
            {[formatBytes(file.size), file.type || (isImage ? 'image' : 'file')].filter(Boolean).join(' · ')}
          </span>
        </div>
        {onRemove ? (
          <button
            type='button'
            onClick={onRemove}
            disabled={disabled}
            aria-label={`ลบ ${file.name}`}
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 'var(--dim-size-600, 32px)',
              height: 'var(--dim-size-600, 32px)',
              background: 'transparent',
              border: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              color: 'var(--text-formbuilder-text, #007549)',
              opacity: disabled ? 0.5 : 1,
              borderRadius: 'var(--dim-radius-full)',
            }}
          >
            <Icon name='close' size={18} color='currentColor' />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Animate progress 0→100 with ease-out over `durationMs`. Calls onDone at end. */
export function useSmoothUploadProgress({ active, durationMs = 1400, onDone }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setProgress(0);
      return undefined;
    }

    setProgress(0);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs);
      /* ease-out cubic — เร็วตอนต้น ชะลอตอนท้าย ให้รู้สึก smooth */
      const eased = 1 - ((1 - t) ** 3);
      setProgress(eased * 100);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        onDoneRef.current?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, durationMs]);

  return progress;
}
