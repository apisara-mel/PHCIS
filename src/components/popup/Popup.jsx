import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerButton from '@/components/button/DangerButton';

/* MIH Popup — design-system modal template per Figma:
   • Default     (node 1:424) — 448px wide
   • Large       (node 1:564) — 640px min-width
   • ExtraLarge  (node 1:639) — fluid up to 1440×1024 (viewport inset 24px)
   XButton (Figma 104:5369). Footer actions use DS components per design.md §5.

   Template structure (every variant):
     ┌──────────────────────────────────────┐
     │  Title                            ✕  │   ← header
     │  Subtitle                            │
     │  …context-specific content…          │   ← body (no stroke under header)
     ├──────────────────────────────────────┤   ← footer top rule only
     │       [Tertiary] [Secondary] [Primary]  ← footer (up to 3 default buttons,
     └──────────────────────────────────────┘                  more via `actions` array)

   Footer button order in Horizontal layout (Figma):
     Tertiary (NeutralSubdueButton) → Secondary (BrandSubdueButton) → Primary (BrandPrimaryButton).
   In Vertical layout (size='default' typically), buttons stack — Primary on top.

   Props:
     • size              'default' | 'large' | 'extraLarge'  (default: 'default')
     • width             optional width: number (logical px) → capped by viewport;
                         or any CSS width string (wins over `size` when set)
     • open / onClose
     • title / subtitle  required title; optional subtitle line
     • children          body content
     • buttonLayout      'horizontal' | 'vertical'           (default: 'horizontal')
     • primaryAction     { label, onClick, disabled? }
     • secondaryAction   { label, onClick, disabled? }
     • tertiaryAction    { label, onClick, disabled? }      ← new (left-most)
     • actions           full action array override [{ key, kind, label, onClick, disabled }]
                         kind: 'primary' | 'secondary' | 'tertiary'
     • footer            full custom footer JSX override
     • showCloseButton   show the X close button in the header        (default: true)
     • closeOnEscape     close the dialog when Escape is pressed       (default: true)

   Note on dismissal hardening — set both flags to false to force the
   user to either click the primary footer action or click outside the
   dialog (overlay) to close. AddMedicationPopup uses this combo so an
   accidental Esc or stray X-click can not discard a half-typed
   prescription. Overlay-click dismissal stays on because clicking
   outside reads as an explicit "cancel" gesture in Figma's modal
   spec; if a caller wants to lock that too, wrap `onClose` and short-
   circuit there.

   Tokens (aliased from design.md):
     surface/modal/default            → --surface-modal-default
     text/modal/text                  → --text-modal-text
     text/modal/subtext               → --text-modal-subtext
     border/neutral/quaternary        → --border-neutral-quaternary
     effect/drop-shadow-bottom/400    → --shadow-drop-bottom-400 (canonical popup-family shadow; --shadow-dropdown is a back-compat alias)
     dim/radius/500                   → --dim-radius-500
     dim/space/{100,200,400,600}      → paddings + gaps
     type/family/heading-content      → title font
     type/family/body                 → subtitle font
     type/size/{base,sm}              → 16 / 14 */

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
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

/* Width per size variant — Figma:
     default     → 448px
     large       → 640px
     extraLarge  → 1440px max (Popup Very Large 75:35675)
   `width` prop overrides base width; extraLarge still caps at VIEWPORT_MAX_* . */
const SIZE_WIDTH = {
  default:    448,
  large:      640,
  extraLarge: 1440,
};

/** Figma 75:35675 — viewport inset 24px; dialog caps at 1440×1024, grows with screen below caps. */
const VIEWPORT_EDGE_INSET = 'var(--dim-space-600, 24px)';
const VIEWPORT_MAX_WIDTH = 1440;
const VIEWPORT_MAX_HEIGHT = 1024;

/* Stack-aware body scroll lock so nested modals do not fight each other.
   Restores previous inline overflow/padding when the last Popup closes. */
let bodyScrollLockCount = 0;
let bodyScrollLockSavedOverflow = '';
let bodyScrollLockSavedPaddingRight = '';

const lockBodyScroll = () => {
  bodyScrollLockCount += 1;
  if (bodyScrollLockCount !== 1) return;

  bodyScrollLockSavedOverflow = document.body.style.overflow;
  bodyScrollLockSavedPaddingRight = document.body.style.paddingRight;

  const gutter = window.innerWidth - document.documentElement.clientWidth;
  if (gutter > 0) {
    document.body.style.paddingRight = `${gutter}px`;
  }
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

/* Close (X) icon button — Figma 104:5369 (Default / Hover).
   Maps to design.md §7d Neutral Icon Button (Square) Ghost variant:
     Default — bg surface/neutralButton/quaternary       icon icon/neutralButton/default
     Hover   — bg surface/neutralButton/quaternary-hover icon icon/neutralButton/secondary */
const CloseButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      aria-label='ปิด'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='shrink-0 flex items-center justify-center transition-colors duration-150 ease-out'
      style={{
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        background: hovered
          ? 'var(--surface-neutralbutton-quaternary-hover, #F4F5F5)'
          : 'var(--surface-neutralbutton-quaternary, #F9FBFB)',
        border: 'none',
        borderRadius: 'var(--dim-radius-200, 8px)',
        cursor: 'pointer',
        color: hovered
          ? 'var(--icon-neutralbutton-secondary, #636B72)'
          : 'var(--icon-neutralbutton-default, #4D5358)',
      }}
    >
      <Sym name='close' size={16} color='currentColor' />
    </button>
  );
};

/* Render a single footer action via the matching DS button.
   `kind` selects: tertiary → NeutralSubdueButton, secondary → BrandSubdueButton outline,
                  primary → BrandPrimaryButton.
   `action.tone === 'danger'` on a primary swaps to <DangerButton variant='fill'>
   so destructive confirms (e.g. ลบคิว) read as red. */
const FooterButton = ({ kind, action, fullWidth }) => {
  if (!action) return null;
  const common = {
    onClick: action.onClick,
    disabled: action.disabled,
    className: fullWidth ? 'w-full' : 'shrink-0',
  };
  if (kind === 'tertiary') {
    return (
      <NeutralSubdueButton {...common} size='md'>
        {action.label}
      </NeutralSubdueButton>
    );
  }
  if (kind === 'secondary') {
    return (
      <BrandSubdueButton variant='outline' size='md' {...common}>
        {action.label}
      </BrandSubdueButton>
    );
  }
  if (action.tone === 'danger') {
    return (
      <DangerButton variant='fill' size='md' {...common}>
        {action.label}
      </DangerButton>
    );
  }
  return <BrandPrimaryButton {...common}>{action.label}</BrandPrimaryButton>;
};

const Popup = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'default',
  width,
  buttonLayout = 'horizontal',
  children,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  actions,
  footer,
  className = '',
  bodyStyle,
  bodyOuterStyle,
  /** Optional fixed dialog height (number → px, or any CSS string).
      Still clamped under `--sm-z-modal-popover`'s viewport cap so it
      never exceeds the available viewport. When omitted, the dialog
      sizes to its content (default Figma "Large" / "Default" sizes). */
  height: heightProp,
  /** When false, body uses overflow hidden (fill-height canvases e.g. BodyRecordPopup). */
  bodyScrollable = true,
  /** When false, the X icon in the header is hidden. Footer + overlay
      remain the only ways to close. Used by hardened forms (e.g.
      AddMedicationPopup) to prevent an accidental discard. */
  showCloseButton = true,
  /** When false, pressing Escape does not call onClose. Mirrors
      `showCloseButton` for the same hardened-dismissal use case. */
  closeOnEscape = true,
}) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnEscape]);

  useEffect(() => {
    if (!open) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [open]);

  if (!open) return null;

  /* Numeric width → cap by viewport so modals stay usable on small screens.
     String `width` is passed through (e.g. caller-defined min()). */
  const resolvedWidth = width ?? SIZE_WIDTH[size] ?? SIZE_WIDTH.default;
  const fillsViewport = size === 'extraLarge';
  const viewportBox = fillsViewport
    ? `min(${VIEWPORT_MAX_WIDTH}px, calc(100vw - 2 * ${VIEWPORT_EDGE_INSET}))`
    : null;
  const viewportHeight = fillsViewport
    ? `min(${VIEWPORT_MAX_HEIGHT}px, calc(100vh - 2 * ${VIEWPORT_EDGE_INSET}))`
    : `calc(100vh - 2 * ${VIEWPORT_EDGE_INSET})`;

  const dialogWidthStyle = typeof resolvedWidth === 'number'
    ? {
      width: fillsViewport
        ? viewportBox
        : `min(${resolvedWidth}px, calc(100vw - 2 * ${VIEWPORT_EDGE_INSET}))`,
      maxWidth: fillsViewport ? viewportBox : '100%',
      minWidth: 0,
    }
    : {
      width: resolvedWidth,
      maxWidth: fillsViewport
        ? viewportBox
        : `calc(100vw - 2 * ${VIEWPORT_EDGE_INSET})`,
      minWidth: 0,
    };

  /* Resolve footer actions list. If `actions` array is given, use it
     verbatim (caller controls order + count). Otherwise build from named
     props in Figma order (left to right): tertiary, secondary, primary. */
  const resolvedActions = actions
    ?? [
      tertiaryAction  && { key: 'tertiary',  kind: 'tertiary',  ...tertiaryAction  },
      secondaryAction && { key: 'secondary', kind: 'secondary', ...secondaryAction },
      primaryAction   && { key: 'primary',   kind: 'primary',   ...primaryAction   },
    ].filter(Boolean);

  const hasFooter = footer || resolvedActions.length > 0;
  const isVertical = buttonLayout === 'vertical';

  const overlay = (
    <div
      role='presentation'
      onMouseDown={(e) => {
        if (!onClose) return;
        const t = e.target instanceof Element ? e.target : e.target?.parentElement;
        if (!t) return;
        /* Clicks on the panel (header/body/footer) stay open. */
        if (dialogRef.current?.contains(t)) return;
        /* Portaled UI anchored from inside the modal (e.g. OverflowFlexRow "More").
           Each entry below is a `<Popover>` (or similar) that renders into
           document.body but logically belongs to a control inside the
           dialog — picking an option there must NOT dismiss the modal,
           even though the DOM hit is technically outside `dialogRef`. */
        if (t.closest?.('.mih-overflowflex-menu')) return;
        if (t.closest?.('.mih-search-popover')) return;
        if (t.closest?.('.mih-diag-type-popover')) return;
        if (t.closest?.('.mih-suggestion-popover')) return;
        if (t.closest?.('.mih-select-popover')) return;
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--sm-z-modal, 1400)',
        background: 'var(--surface-overlay-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: VIEWPORT_EDGE_INSET,
        paddingBottom: VIEWPORT_EDGE_INSET,
        paddingLeft: VIEWPORT_EDGE_INSET,
        paddingRight: VIEWPORT_EDGE_INSET,
        overscrollBehavior: 'none',
      }}
    >
      <div
        ref={dialogRef}
        role='dialog'
        aria-modal='true'
        className={className}
        style={{
          ...dialogWidthStyle,
          maxHeight: viewportHeight,
          /* Explicit `height` prop wins over the size-derived height
             (number → px, string → CSS value). Still bounded by
             `maxHeight: viewportHeight` so a fixed height never spills
             past the available viewport. */
          height: heightProp != null
            ? (typeof heightProp === 'number' ? `${heightProp}px` : heightProp)
            : (fillsViewport ? viewportHeight : undefined),
          minHeight: 0,
          background: 'var(--surface-modal-default)',
          /* Figma Popup chrome (e.g. 161:42074 / 1:564) carries a 1 px
             `border/popover/grey` (#E2E4E6) ring around the dialog. */
          border: 'var(--dim-stroke-100) solid var(--border-popover-grey, #E2E4E6)',
          borderRadius: 'var(--dim-radius-500)',
          boxShadow: 'var(--shadow-drop-bottom-400)',
          fontFamily: 'var(--type-family-body)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header — title row + optional subtitle + close button.
            Padding per Figma "Title+Body" container (Popup Default 1:424 /
            Large 1:564 / ExtraLarge 1:639, MIH DS - Popup):
              pt 24 (--dim-space-600), pr 16 (--dim-space-400),
              pb 24 (--dim-space-600), pl 24 (--dim-space-600).
            Intentionally no bottom stroke so header + body read as one surface. */}
        <div
          className='shrink-0 flex w-full items-start justify-end'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop:    'var(--dim-space-600)',
            paddingRight:  'clamp(var(--dim-space-300), 4vw, var(--dim-space-400))',
            paddingBottom: 'var(--dim-space-600)',
            paddingLeft:   'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
            background:    'var(--surface-modal-default)',
          }}
        >
          <div
            className='flex-1 min-w-0 flex flex-col'
            style={{ gap: 'var(--dim-space-100)' }}
          >
            {title && (
              <p
                style={{
                  color: 'var(--text-modal-text)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontSize: 'var(--type-size-base)',
                  fontWeight: 'var(--type-weight-bold)',
                  lineHeight: 1.5,
                  margin: 'var(--dim-space-0)',
                }}
              >
                {title}
              </p>
            )}
            {subtitle && (
              <p
                style={{
                  color: 'var(--text-modal-subtext)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  lineHeight: 1.5,
                  margin: 'var(--dim-space-0)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {showCloseButton && <CloseButton onClick={onClose} />}
        </div>

        {/* Body — outer segment fixes flex height; inner owns vertical scroll
            (avoids flex-column overflow quirks where content grows past the viewport). */}
        <div
          className='flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden'
          style={bodyOuterStyle}
        >
          <div
            className={
              bodyScrollable
                ? 'scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden'
                : 'flex min-h-0 flex-1 flex-col overflow-hidden'
            }
            style={{
              WebkitOverflowScrolling: bodyScrollable ? 'touch' : undefined,
              paddingTop: bodyScrollable ? 'var(--dim-space-200)' : 0,
              paddingLeft: bodyScrollable
                ? 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))'
                : 0,
              paddingRight: bodyScrollable
                ? 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))'
                : 0,
              paddingBottom: bodyScrollable ? 'var(--dim-space-600)' : 0,
              gap: bodyScrollable ? 'var(--dim-space-400)' : 0,
              ...bodyStyle,
            }}
          >
            {children}
          </div>
        </div>

        {hasFooter && (
          <div
            className='shrink-0 flex w-full'
            style={{
              padding: 'clamp(var(--dim-space-400), 4vw, var(--dim-space-600))',
              gap: 'var(--dim-space-300)',
              background: 'var(--surface-modal-default)',
              flexDirection: isVertical ? 'column' : 'row',
              alignItems: 'center',
              justifyContent: isVertical ? 'center' : 'flex-end',
              borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            }}
          >
            {footer ?? resolvedActions.map((a) => (
              <FooterButton
                key={a.key ?? a.label}
                kind={a.kind}
                action={a}
                fullWidth={isVertical}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(overlay, document.body)
    : overlay;
};

export default Popup;
