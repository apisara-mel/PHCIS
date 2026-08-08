import React, { useEffect, useRef, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';

/* MIH FormBuilder Signature — Figma "Signature" (node 2451:13969).
   Interactive signature pad: empty drop-zone preview, then a canvas the
   user can sign on with mouse or touch. Two visual states from Figma —
   default / hover — plus an "active" state once the user starts signing.

   Behaviour:
     • Empty + idle → dashed brand-p200 border, edit-3 icon centered with
       "เซ็นชื่อในกล่องนี้" hint. Click anywhere to start signing.
     • Empty + hover → border deepens to brand-p600 (token swap).
     • Active (drawing) → canvas is interactive. "ล้าง" (clear) button
       appears once strokes exist. Pen is brand-p700 by default.

   API:
     • value (string)        — base64/PNG data URL or any image URL; when set and
                             not drawing, pad shows **signed preview** (solid
                             border per --border-formbuilder-filled). Click
                             clears preview and enters draw mode (unless disabled).
     • onChange(dataUrl)     — fires on stroke end with the latest data URL.
     • penColor (string)     — stroke colour (default brand-p700 token).
     • height, width         — canvas dimensions (default 100h × 323w).
     • disabled              — prevents drawing.
     • placeholder           — empty-state hint (default 'เซ็นชื่อในกล่องนี้').
     • clearLabel            — clear-button label (default 'ล้าง').
     • confirmLabel          — confirm-button label (default 'ยืนยันลายเซ็น').
     • onConfirm(dataUrl)    — fires when user confirms; exits drawing mode.
     • onBeginDrawing        — fires when the user enters canvas mode (incl.
                             re-sign from the saved preview).
     • showFooter            — show/hide bottom action row (default true).
     • signerName            — optional issuer name shown in the idle pad
                             (Figma 228:26614 / 294:28752).
     • licenseNo             — optional license label (e.g. ท.00012345).
     • signedAt              — optional timestamp line after confirm.  */

/** Certificate issuer pad — Figma 228:26614 outer frame (px). */
const CERT_SIGNER_PANEL_HEIGHT = 149;

const Sym = ({ name, size = 20, color }) => (
  <span
    className='material-symbols-outlined shrink-0'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
    }}
    aria-hidden
  >
    {name}
  </span>
);

/** Idle / signed metadata stack — Figma 228:26615 (gap space/200). */
const SignatureMetaStack = ({
  placeholder,
  signerName,
  licenseNo,
  signedAt,
  showHint = true,
}) => {
  const licenseLine = licenseNo
    ? (signedAt
      ? `เลขใบอนุญาตประกอบวิชาชีพ ${licenseNo}  ลงนาม ${signedAt}`
      : `เลขใบอนุญาตประกอบวิชาชีพ ${licenseNo}`)
    : null;

  return (
    <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
      {showHint && (
        <>
          <Sym name='edit' size={20} color='var(--text-formbuilder-text)' />
          <span
            style={{
              color: 'var(--text-formbuilder-subtext)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {placeholder}
          </span>
        </>
      )}
      {signerName ? (
        <span
          style={{
            color: 'var(--text-formbuilder-text)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {signerName}
        </span>
      ) : null}
      {licenseLine ? (
        <span
          style={{
            color: 'var(--text-formbuilder-subtext)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
          }}
        >
          {licenseLine}
        </span>
      ) : null}
    </div>
  );
};

const Signature = React.forwardRef(function Signature(
  {
    value,
    onChange,
    penColor = 'var(--text-formbuilder-text)',
    height = 100,
    width,
    disabled = false,
    placeholder = 'เซ็นชื่อในกล่องนี้',
    clearLabel = 'ล้าง',
    confirmLabel = 'ยืนยันลายเซ็น',
    onConfirm,
    onBeginDrawing,
    showFooter = true,
    signerName,
    licenseNo,
    signedAt,
    state,                                /* force 'default' | 'hover' for demos */
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const isControlled = value !== undefined;
  const [internalDataUrl, setInternalDataUrl] = useState('');
  const [active, setActive] = useState(false);
  const [internalHover, setInternalHover] = useState(false);
  const dataUrl = isControlled ? value : internalDataUrl;
  const hasStrokes = !!dataUrl;
  /** Persisted ink (or image URL) while not in drawing mode — "signed" / read-only preview. */
  const showFilledPreview = hasStrokes && !active;
  const showSignerMeta = Boolean(signerName || licenseNo);
  const panelHeight = showSignerMeta ? CERT_SIGNER_PANEL_HEIGHT : height;
  const hover = state ? state === 'hover' : internalHover;
  const setHover = state ? () => {} : setInternalHover;
  const isEmptyIdle = !active && !showFilledPreview;

  /* Resolve a CSS variable to its computed colour string so the 2D canvas
     stroke can use it (canvas does not understand `var(--…)`).            */
  const resolvePen = () => {
    if (typeof window === 'undefined') return '#007549';
    if (penColor.startsWith('var(')) {
      const name = penColor.match(/var\((--[^,)]+)/)?.[1];
      if (!name) return '#007549';
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || '#007549';
    }
    return penColor;
  };

  /* Re-paint the canvas at the device pixel ratio so strokes stay crisp on
     hi-DPI screens. Re-called whenever the wrapper resizes.               */
  const sizeCanvas = () => {
    const cvs = canvasRef.current;
    const wrap = wrapRef.current;
    if (!cvs || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight || panelHeight;
    cvs.width = Math.max(1, Math.round(cssW * dpr));
    cvs.height = Math.max(1, Math.round(cssH * dpr));
    cvs.style.width = `${cssW}px`;
    cvs.style.height = `${cssH}px`;
    const ctx = cvs.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    /* Re-render any persisted dataUrl after resize. */
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, cssW, cssH);
        ctx.drawImage(img, 0, 0, cssW, cssH);
      };
      img.src = dataUrl;
    }
  };

  useEffect(() => {
    if (!active) return undefined;
    sizeCanvas();
    const ro = new ResizeObserver(sizeCanvas);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /* Sync external `value` changes back into the canvas (e.g. when caller
     clears via setValue('')).                                             */
  useEffect(() => {
    if (!active) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, cvs.width / dpr, cvs.height / dpr);
      };
      img.src = dataUrl;
    }
    ctx.restore();
  }, [dataUrl, active]);

  const eventPoint = (e) => {
    const cvs = canvasRef.current;
    if (!cvs) return { x: 0, y: 0 };
    const r = cvs.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const startStroke = (e) => {
    if (disabled) return;
    e.preventDefault();
    const cvs = canvasRef.current;
    if (!cvs) return;
    drawingRef.current = true;
    const ctx = cvs.getContext('2d');
    ctx.strokeStyle = resolvePen();
    ctx.lineWidth = 2;
    const p = eventPoint(e);
    lastPointRef.current = p;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const moveStroke = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    const p = eventPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };
  const endStroke = (e) => {
    if (!drawingRef.current) return;
    if (e) e.preventDefault();
    drawingRef.current = false;
    const cvs = canvasRef.current;
    if (!cvs) return;
    let next = '';
    try {
      next = cvs.toDataURL('image/png');
    } catch {
      return;
    }
    if (!isControlled) setInternalDataUrl(next);
    onChange && onChange(next);
  };

  const clear = () => {
    const cvs = canvasRef.current;
    if (cvs) {
      const ctx = cvs.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.restore();
    }
    if (!isControlled) setInternalDataUrl('');
    onChange && onChange('');
  };

  const confirmSigning = () => {
    if (disabled || !hasStrokes) return;
    setActive(false);
    onConfirm && onConfirm(dataUrl);
  };

  const enterActive = () => {
    if (disabled) return;
    setActive(true);
    onBeginDrawing && onBeginDrawing();
  };

  /* Form Builder states — design.md §6.20: empty default/hover = dashed 1.5px;
     filled idle = solid 1px + white card; filled hover = dashed hover + shadow
     (re-sign affordance, same as empty hover). */
  const isFormHover = hover && !disabled && !active;
  const panelBorder = isFormHover
    ? 'var(--dim-stroke-150) dashed var(--border-formbuilder-hover)'
    : showFilledPreview
      ? 'var(--dim-stroke-100) solid var(--border-formbuilder-filled)'
      : 'var(--dim-stroke-150) dashed var(--border-formbuilder-default)';
  const panelBackground = showFilledPreview && !isFormHover
    ? 'var(--surface-formbuilder-card)'
    : 'var(--surface-formbuilder-default)';
  const panelShadow = isFormHover ? 'var(--shadow-formbuilder)' : 'none';

  return (
    <div
      ref={(node) => {
        wrapRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={`flex flex-col w-full ${className}`}
      style={{
        gap: 'var(--dim-space-200)',
        width: width ?? '100%',
        ...style,
      }}
      {...rest}
    >
      <div
        role={
          active
            ? undefined
            : showFilledPreview && disabled
              ? 'img'
              : disabled
                ? undefined
                : 'button'
        }
        tabIndex={active || disabled ? -1 : 0}
        aria-label={
          active
            ? undefined
            : showFilledPreview
              ? (disabled ? 'ลายเซ็นที่บันทึกแล้ว' : 'ลายเซ็นที่บันทึกแล้ว คลิกเพื่อลงนามใหม่')
              : placeholder
        }
        onClick={!active && !disabled ? enterActive : undefined}
        onKeyDown={(e) => {
          if (!active && !disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            enterActive();
          }
        }}
        onMouseEnter={() => !state && setHover(true)}
        onMouseLeave={() => !state && setHover(false)}
        className='relative w-full flex items-center justify-center'
        style={{
          minHeight: panelHeight,
          height: panelHeight,
          padding: active
            ? 0
            : 'var(--dim-space-600)',
          borderRadius: 'var(--dim-radius-200)',
          border: panelBorder,
          background: panelBackground,
          boxShadow: panelShadow,
          cursor: active
            ? 'crosshair'
            : (disabled ? 'not-allowed' : 'pointer'),
          boxSizing: 'border-box',
          transition: 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease, min-height 120ms ease, height 120ms ease',
          opacity: disabled && !showFilledPreview ? 0.6 : 1,
          overflow: 'hidden',
        }}
      >
        {/* Empty idle — Figma 228:26614 / 294:28752 default */}
        {isEmptyIdle && (
          showSignerMeta ? (
            <SignatureMetaStack
              placeholder={placeholder}
              signerName={signerName}
              licenseNo={licenseNo}
              signedAt={signedAt}
            />
          ) : (
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Sym name='edit' size={20} color='var(--text-formbuilder-text)' />
              <span
                style={{
                  color: 'var(--text-formbuilder-subtext)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  fontWeight: 'var(--type-weight-medium)',
                  lineHeight: 1.5,
                  textAlign: 'center',
                }}
              >
                {placeholder}
              </span>
            </div>
          )
        )}
        {/* Signed preview — ink + issuer metadata (Figma 294:28752) */}
        {!active && showFilledPreview && (
          <div
            className='flex flex-col items-center w-full'
            style={{ gap: 'var(--dim-space-200)' }}
          >
            <img
              src={dataUrl}
              alt='ลายเซ็น'
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: 56,
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
            {showSignerMeta ? (
              <SignatureMetaStack
                signerName={signerName}
                licenseNo={licenseNo}
                signedAt={signedAt}
                showHint={false}
              />
            ) : null}
          </div>
        )}
        {/* Active drawing canvas */}
        {active && (
          <canvas
            ref={canvasRef}
            onMouseDown={startStroke}
            onMouseMove={moveStroke}
            onMouseUp={endStroke}
            onMouseLeave={endStroke}
            onTouchStart={startStroke}
            onTouchMove={moveStroke}
            onTouchEnd={endStroke}
            style={{
              width: '100%',
              height: '100%',
              touchAction: 'none',
              display: 'block',
            }}
          />
        )}
      </div>
      {showFooter && active && (
        <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-300)' }}>
          <NeutralSubdueButton
            type='button'
            variant='outline'
            size='sm'
            leadingIcon='restart_alt'
            onClick={clear}
            disabled={disabled || !hasStrokes}
          >
            {clearLabel}
          </NeutralSubdueButton>
          <BrandButton
            type='button'
            size='sm'
            onClick={confirmSigning}
            disabled={disabled || !hasStrokes}
          >
            {confirmLabel}
          </BrandButton>
        </div>
      )}
    </div>
  );
});

export default Signature;
