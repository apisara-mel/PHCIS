import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import DangerButton from '@/components/button/DangerButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';

/* MIH AlertDialog — Figma "Alert Dialog" (MIH DS · Popup node 1:1159).
   Compact confirmation modal for critical actions. Distinct from <Popup>
   (header+body+footer chrome) — AlertDialog is a borderless centered card
   with a tone icon, title, supporting text, and a 2-button action row.

   Property panel (per Figma):
     • type       'info' | 'success' | 'warning' | 'destructive'
     • alignment  'center' | 'left'

   Variants × tokens (action button color):
                 │ Information │  Success  │  Warning  │ Destructive
     Center      │   brand     │   brand   │   danger  │   danger
     Left        │   brand     │   brand   │   danger  │   danger

     ★ Note: Figma's spec calls for an orange Warning variant on the
       Left alignment, but the DS button family has no "Warning"
       siblings — we collapse Warning to DangerButton for both
       alignments. Spec-fidelity tradeoff: keep DS button aliasing
       clean rather than spawn a new button family for a single use.

   Dimensions (per Figma):
     • Width: 448 (Center) / 320 (Left)
     • Padding: 32 (--dim-space-800)
     • Radius: 16 (--dim-radius-500)
     • Content gap: 24 (--dim-space-600) between content + actions
     • Icon size: 32 (Center) / 24 (Left)
     • Title: h5 (lg/18 Bold) Center · h6 (base/16 Bold) Left
     • Subtext: body4 (sm/14 Regular)
     • Buttons: h44 (size='lg'), 12 gap

   Tokens aliased:
     surface/alertdialog/default     → --surface-alertdialog-default
     border/alertdialog/default      → --border-alertdialog-default
     text/alertdialog/text           → --text-alertdialog-text
     text/alertdialog/subtext        → --text-alertdialog-subtext
     icon/alertDialog/info           → --icon-alertdialog-info        (brand-aware)
     icon/alert/success              → --icon-alertdialog-success
     icon/alert/warning              → --icon-alertdialog-warning
     icon/alert/error                → --icon-alertdialog-destructive

   Tone icons (Material Symbols, filled):
     info        → 'info'
     success     → 'check_circle'
     warning     → 'warning'
     destructive → 'cancel'

   Action handlers:
     • onConfirm — primary button click
     • onClose   — dismiss (overlay click / Esc / cancel button fallback)
     • onCancel  — secondary "cancel" button, OPTIONAL. When omitted the
                   cancel button reuses `onClose` (legacy behaviour).
                   Use this when the cancel button has different intent
                   from the dismiss action (e.g. UnsavedChanges where
                   cancel = "discard" but Esc/backdrop = "stay").        */

const Sym = ({ name, size = 24, color, fill = 1, weight = 500 }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`,
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Per-type icon + tone color (Figma `icon/alertDialog/*` family). Tone
   color drives ONLY the icon — action buttons swap component family
   based on the destructive bucket below.
   ★ Info is BRAND-AWARE via --icon-alertdialog-info → --brand-p700, so
     it retints automatically on setBrandTheme(). Success/Warning/
     Destructive are fixed semantic colors (teal/orange/red 700). */
const TYPE_SPEC = {
  info:        { icon: 'info',         tone: 'var(--icon-alertdialog-info)'        },
  success:     { icon: 'check_circle', tone: 'var(--icon-alertdialog-success)'     },
  warning:     { icon: 'warning',      tone: 'var(--icon-alertdialog-warning)'     },
  destructive: { icon: 'cancel',       tone: 'var(--icon-alertdialog-destructive)' },
};

/* Stack-aware body scroll lock — shared semantics with <Popup> so a
   stacked AlertDialog over a Popup still restores cleanly. Re-declared
   locally to keep AlertDialog independent of Popup's internals. */
let bodyScrollLockCount = 0;
let bodyScrollLockSavedOverflow = '';
let bodyScrollLockSavedPaddingRight = '';

const lockBodyScroll = () => {
  bodyScrollLockCount += 1;
  if (bodyScrollLockCount !== 1) return;
  bodyScrollLockSavedOverflow = document.body.style.overflow;
  bodyScrollLockSavedPaddingRight = document.body.style.paddingRight;
  const gutter = window.innerWidth - document.documentElement.clientWidth;
  if (gutter > 0) document.body.style.paddingRight = `${gutter}px`;
  document.body.style.overflow = 'hidden';
};
const unlockBodyScroll = () => {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
  if (bodyScrollLockCount !== 0) return;
  document.body.style.overflow = bodyScrollLockSavedOverflow;
  document.body.style.paddingRight = bodyScrollLockSavedPaddingRight;
  bodyScrollLockSavedOverflow = '';
  bodyScrollLockSavedPaddingRight = '';
};

const AlertDialog = ({
  open,
  onClose,
  onCancel,
  onConfirm,
  type = 'info',
  alignment = 'center',
  title,
  description,
  cancelLabel = 'ยกเลิก',
  confirmLabel = 'ตกลง',
  showCancel = true,
  className = '',
}) => {
  const dialogRef = useRef(null);
  const spec = TYPE_SPEC[type] || TYPE_SPEC.info;
  const isCenter = alignment === 'center';
  /* Action buttons collapse to danger family for warning + destructive;
     info + success use the green brand family. */
  const isDanger = type === 'warning' || type === 'destructive';
  const PrimaryBtn   = isDanger ? DangerButton       : BrandButton;
  const SecondaryBtn = isDanger ? DangerSubdueButton : BrandSubdueButton;
  /* Cancel button handler — when callers need to distinguish "explicit
     cancel" from "dismiss" (e.g. UnsavedChanges: cancel = discard input,
     dismiss = stay on page), pass `onCancel`. Otherwise fall back to
     `onClose` for the legacy 1-action-row behaviour. */
  const handleCancel = onCancel ?? onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  /* Card width — Figma 448 (Center) / 320 (Left). On narrow viewports
     clamp by 24px gutter (--dim-space-600) each side so the card never
     touches the edge. */
  const width = isCenter ? 448 : 320;
  const dialogWidth = `min(${width}px, calc(100vw - 2 * var(--dim-space-600, 24px)))`;

  /* Buttons: Center → flex-1 share row width; Left → shrink-fit. */
  const actionFillClass = isCenter ? 'flex-1 min-w-0' : 'shrink-0';

  const card = (
    <div
      role='presentation'
      onMouseDown={(e) => {
        if (!onClose) return;
        const t = e.target instanceof Element ? e.target : e.target?.parentElement;
        if (!t) return;
        if (dialogRef.current?.contains(t)) return;
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--sm-z-modal, 1400)',
        background: 'rgba(15, 23, 42, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--dim-space-600, 24px)',
        overscrollBehavior: 'none',
      }}
    >
      <div
        ref={dialogRef}
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={title ? 'mih-alertdialog-title' : undefined}
        aria-describedby={description ? 'mih-alertdialog-desc' : undefined}
        className={className}
        style={{
          width: dialogWidth,
          maxWidth: '100%',
          background: 'var(--surface-alertdialog-default)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-alertdialog-default)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 'var(--dim-space-800, 32px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isCenter ? 'center' : 'stretch',
          gap: 'var(--dim-space-600, 24px)',
          fontFamily: 'var(--type-family-body)',
        }}
      >
        {/* Content block — icon stacks above text in Center, sits inline
            with the title in Left (per Figma node 1:1198 / 1:1170). */}
        {isCenter ? (
          <div
            className='flex flex-col items-center w-full'
            style={{ gap: 'var(--dim-space-300, 12px)' }}
          >
            <Sym name={spec.icon} size={32} color={spec.tone} />
            <div
              className='flex flex-col items-center w-full text-center'
              style={{ gap: 'var(--dim-space-200, 8px)' }}
            >
              {title && (
                <p
                  id='mih-alertdialog-title'
                  style={{
                    margin: 'var(--dim-space-0)',
                    color: 'var(--text-alertdialog-text)',
                    fontFamily: 'var(--type-family-heading-content)',
                    fontWeight: 'var(--type-weight-bold, 700)',
                    fontSize: 'var(--type-size-lg, 18px)',
                    lineHeight: 1.5,
                  }}
                >
                  {title}
                </p>
              )}
              {description && (
                <p
                  id='mih-alertdialog-desc'
                  style={{
                    margin: 'var(--dim-space-0)',
                    color: 'var(--text-alertdialog-subtext)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            className='flex flex-col w-full'
            style={{ gap: 'var(--dim-space-200, 8px)' }}
          >
            <div
              className='flex items-start w-full'
              style={{ gap: 'var(--dim-space-300, 12px)' }}
            >
              <Sym name={spec.icon} size={24} color={spec.tone} />
              {title && (
                <p
                  id='mih-alertdialog-title'
                  className='flex-1 min-w-0'
                  style={{
                    margin: 'var(--dim-space-0)',
                    color: 'var(--text-content-default, var(--text-alertdialog-text))',
                    fontFamily: 'var(--type-family-heading-content)',
                    fontWeight: 'var(--type-weight-bold, 700)',
                    fontSize: 'var(--type-size-base, 16px)',
                    lineHeight: 1.5,
                  }}
                >
                  {title}
                </p>
              )}
            </div>
            {description && (
              <p
                id='mih-alertdialog-desc'
                style={{
                  margin: 'var(--dim-space-0)',
                  color: 'var(--text-content-secondary, var(--text-alertdialog-subtext))',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  lineHeight: 1.5,
                }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Actions row — Cancel (outline) + Primary (fill). Both buttons
            inherit size='lg' (h44) per Figma's 44px row. */}
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            justifyContent: isCenter ? 'center' : 'flex-end',
          }}
        >
          {showCancel && (
            <SecondaryBtn
              variant='outline'
              size='lg'
              onClick={handleCancel}
              className={actionFillClass}
            >
              {cancelLabel}
            </SecondaryBtn>
          )}
          <PrimaryBtn
            size='lg'
            onClick={onConfirm}
            className={actionFillClass}
          >
            {confirmLabel}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(card, document.body)
    : card;
};

export default AlertDialog;
