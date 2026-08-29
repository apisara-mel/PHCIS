import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralIconButton from '@/components/button/NeutralIconButton';
import DangerButton from '@/components/button/DangerButton';
import useModalMotion, { MODAL_MOTION_MS } from '@/components/popup/useModalMotion';

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
     • leading           optional node left of title (e.g. back chevron)
     • onBack            shorthand for leading={<BackButton/>} — a ‹ step-back for a
                         sub-screen; does not replace onClose, which still closes the popup
     • children          body content
     • buttonLayout      'horizontal' | 'vertical'           (default: 'horizontal')
     • primaryAction     { label, onClick, disabled? }
     • secondaryAction   { label, onClick, disabled? }
     • tertiaryAction    { label, onClick, disabled? }      ← new (left-most)
     • actions           full action array override [{ key, kind, label, onClick, disabled }]
                         kind: 'primary' | 'secondary' | 'tertiary'
     • footer            full custom footer JSX override
     • headerTrailing    optional JSX rendered before the header X     (default: null)
     • showCloseButton   show the X close button in the header        (default: true)
     • closeOnEscape     close the dialog when Escape is pressed       (default: true)

   Enter/exit motion (design.md §6.13.3 · Modal enter / exit motion):
     • useModalMotion(open) — keeps portal mounted through exit
     • .mih-popup-overlay + .mih-popup-dialog — data-state visible|hidden
     • Tokens: --motion-duration-modal, --motion-panel-offset-y, etc.

   Nested popups:
     • Open instances push onto an internal stack; the top layer gets a higher
       z-index and is the only one that responds to Escape / overlay click /
       header X. Closing the top layer leaves parent popups open.

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

/* Width per size variant — Figma:
     default     → 448px
     large       → 640px
     extraLarge  → 1440px max (Popup Very Large 75:35675)
   `width` prop overrides base width; extraLarge still caps at VIEWPORT_MAX_* . */
const SIZE_WIDTH = {
  default: 448,
  large: 640,
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

/** Open popup stack (top = last). Escape / overlay only dismiss the top layer;
    each layer gets a higher z-index so nested dialogs fully cover parents. */
const popupStack = [];
const BASE_MODAL_Z = 1400;
const MODAL_Z_STEP = 20;

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
   design.md §7d Neutral Icon Button (Square) **Ghost**:
     Default — no fill, so the X reads as chrome, not as an action button
     Hover   — bg surface/neutralButton/quaternary
   เดิมใช้ NeutralSubdueIconButton variant='fill' ซึ่งเป็น §7f — Fill Default
   ของตัวนั้นคือ surface/neutralButton/secondary (#E2E4E6) จึงมีพื้นสีเทาตั้งแต่
   ยังไม่ hover ผิดจาก §7d ที่คอมเมนต์นี้อ้างไว้เอง (มติผู้ใช้ 25 ส.ค. 69). */
const CloseButton = ({ onClick }) => (
  <NeutralIconButton
    icon='close'
    size='lg'
    variant='ghost'
    aria-label='ปิด'
    onClick={onClick}
  />
);

/* Back (‹) icon button — same square-ghost treatment as CloseButton,
   mirrored to sit at the START of the header when a Popup shows a
   sub-screen it can step back out of (e.g. void-receipt reason form). */
const BackButton = ({ onClick }) => (
  <NeutralIconButton
    icon='arrow_back'
    size='lg'
    variant='ghost'
    aria-label='ย้อนกลับ'
    onClick={onClick}
  />
);

/* "ปิด" ไม่ใช่การยืนยันอะไร มันคือทางออกจาก popup — ต้องเป็น BrandSubdue outline
   เสมอไม่ว่าถูกส่งมาในสล็อตไหน (มติผู้ใช้ 27 ส.ค. 69). หน้าจำนวนมากส่ง
   `primaryAction={{ label: 'ปิด' }}` เพราะเป็นปุ่มเดียวใน footer ซึ่งถ้าปล่อยไว้
   จะได้ปุ่มเขียวทึบที่ดึงสายตาเท่ากับปุ่ม "บันทึก" ของฟอร์มจริง */
const isCloseAction = (action) => String(action?.label || '').trim() === 'ปิด';

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
      <NeutralSubdueButton
        {...common}
        size='md'
        leadingIcon={action.leadingIcon}
        variant={action.variant}
      >
        {action.label}
      </NeutralSubdueButton>
    );
  }
  if (kind === 'secondary' || isCloseAction(action)) {
    return (
      <BrandSubdueButton variant='outline' size='md' {...common} leadingIcon={action.leadingIcon}>
        {action.label}
      </BrandSubdueButton>
    );
  }
  if (action.tone === 'danger') {
    return (
      <DangerButton variant='fill' size='md' {...common} leadingIcon={action.leadingIcon}>
        {action.label}
      </DangerButton>
    );
  }
  return (
    <BrandPrimaryButton {...common} leadingIcon={action.leadingIcon} trailingIcon={action.trailingIcon}>
      {action.label}
    </BrandPrimaryButton>
  );
};

const Popup = ({
  open,
  onClose,
  title,
  subtitle,
  leading = null,
  /** Shorthand for the commonest `leading` node: a ‹ back button for a
      sub-screen within the popup (e.g. the void-receipt reason form
      stepping back to the receipt view). Does not replace onClose —
      the X still closes the whole popup. */
  onBack,
  size = 'default',
  width,
  buttonLayout = 'horizontal',
  children,
  primaryAction,
  secondaryAction,
  tertiaryAction,
  /* โหนดที่วางกึ่งกลางแถวหัวข้อ (เช่น แถบ step ของ popup แบบหลายขั้น) —
     ต่างจาก headerTrailing ที่ชิดขวาติดปุ่มปิด */
  headerCenter,
  actions,
  footer,
  className = '',
  /** Optional chrome overrides for screens that need a persistent header or
      a compact action bar while the body grows (for example, a multi-select
      access editor). */
  headerStyle = {},
  footerStyle = {},
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
  headerTrailing = null,
  showCloseButton = true,
  /** When false, pressing Escape does not call onClose. Mirrors
      `showCloseButton` for the same hardened-dismissal use case. */
  closeOnEscape = true,
}) => {
  const dialogRef = useRef(null);
  const stackIdRef = useRef(null);
  if (stackIdRef.current == null) {
    stackIdRef.current = `popup-${Math.random().toString(36).slice(2)}`;
  }
  const stackId = stackIdRef.current;
  const titleId = `${stackId}-title`;
  const { mounted, motionState } = useModalMotion(open, MODAL_MOTION_MS);
  const [stackDepth, setStackDepth] = useState(0);

  useEffect(() => {
    if (!mounted) return undefined;
    popupStack.push(stackId);
    setStackDepth(popupStack.length - 1);
    return () => {
      const idx = popupStack.indexOf(stackId);
      if (idx >= 0) popupStack.splice(idx, 1);
    };
  }, [mounted, stackId]);

  const isTopPopup = () => popupStack.length === 0
    || popupStack[popupStack.length - 1] === stackId;

  useEffect(() => {
    if (!open || !closeOnEscape) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (!isTopPopup()) return;
      e.stopPropagation();
      onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnEscape, stackId]);

  useEffect(() => {
    if (!mounted) return undefined;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [mounted]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusDialog = window.requestAnimationFrame(() => {
      const focusables = dialogRef.current?.querySelectorAll(focusableSelector);
      (focusables?.[0] || dialogRef.current)?.focus();
    });
    const trapFocus = (event) => {
      if (event.key !== 'Tab' || !isTopPopup()) return;
      const focusables = [...(dialogRef.current?.querySelectorAll(focusableSelector) || [])]
        .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
      if (focusables.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trapFocus);
    return () => {
      window.cancelAnimationFrame(focusDialog);
      document.removeEventListener('keydown', trapFocus);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open, stackId]);

  if (!mounted) return null;

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
      tertiaryAction && { key: 'tertiary', kind: 'tertiary', ...tertiaryAction },
      secondaryAction && { key: 'secondary', kind: 'secondary', ...secondaryAction },
      primaryAction && { key: 'primary', kind: 'primary', ...primaryAction },
    ].filter(Boolean);

  const hasFooter = footer || resolvedActions.length > 0;
  const isVertical = buttonLayout === 'vertical';
  const layerZIndex = BASE_MODAL_Z + stackDepth * MODAL_Z_STEP;

  const requestClose = () => {
    if (!onClose) return;
    if (!isTopPopup()) return;
    onClose();
  };

  const overlay = (
    <div
      role='presentation'
      className='mih-popup-overlay'
      data-state={motionState}
      onMouseDown={(e) => {
        if (!open || !onClose) return;
        if (!isTopPopup()) return;
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
        if (t.closest?.('.mih-datepicker-popover')) return;
        if (t.closest?.('.mih-popover-in')) return;
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: layerZIndex,
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
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'หน้าต่างโต้ตอบ'}
        tabIndex={-1}
        className={`mih-popup-dialog ${className}`.trim()}
        data-state={motionState}
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
          position: 'relative',
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
            paddingTop: 'var(--dim-space-600)',
            paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-400))',
            /* หัวข้อกับเนื้อ popup เคยห่างกัน 32px (header 24 + body 8) ซึ่งอ่าน
               เป็นคนละบล็อกจนฟอร์มดูลอย — ลดเหลือ 12 (รวมเป็น 20px) 29 ส.ค. 69
               (มติผู้ใช้) ระยะบน/ซ้าย/ขวาคงเดิม popup ที่ต้องการระยะเดิมส่ง
               `headerStyle={{ paddingBottom: 'var(--dim-space-600)' }}` ทับได้ */
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
            background: 'var(--surface-modal-default)',
            /* ให้ headerCenter วางกึ่งกลางจริงด้วย absolute ได้ */
            position: 'relative',
            ...headerStyle,
          }}
        >
          {/* ไอคอน `leading` ถูกจัดให้อยู่กึ่งกลางกล่องบรรทัดของหัวข้อ (16px × 1.5
              = 24px) — ไอคอน Material ที่ caller ส่งมามักมาพร้อม line-height
              ของ Tailwind (`text-2xl` = 32px) กล่องจึงสูงกว่าบรรทัดหัวข้อ และ
              เมื่อแถวเป็น items-start ไอคอนจะเหลื่อมกับตัวอักษร โหนดที่สูงกว่า
              24px (เช่นปุ่มย้อนกลับ) ไม่ถูกบีบเพราะใช้ min-height */}
          {onBack ? (
            <BackButton onClick={onBack} />
          ) : leading ? (
            <span
              className='shrink-0 inline-flex items-center justify-center'
              style={{ minHeight: 'calc(var(--type-size-title, var(--type-size-base, 16px)) * 1.5)' }}
            >
              {leading}
            </span>
          ) : null}
          <div
            className='flex-1 min-w-0 flex flex-col'
            style={{ gap: 'var(--dim-space-100)' }}
          >
            {title && (
              <p
                id={titleId}
                style={{
                  color: 'var(--text-modal-text)',
                  fontFamily: 'var(--type-family-heading-content)',
                  fontSize: 'var(--type-size-title, var(--type-size-base, 16px))',
                  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
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
          {headerCenter ? (
            /* กึ่งกลาง popup จริง ๆ ไม่ใช่กึ่งกลางของพื้นที่ที่เหลือจาก title
               (ถ้าอยู่ใน flow ปกติ title จะดันให้เยื้องไปทางขวา) */
            <div
              className='absolute flex items-start justify-center'
              style={{
                left: 0,
                right: 0,
                top: 'var(--dim-space-600)',
                pointerEvents: 'none',
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>{headerCenter}</div>
            </div>
          ) : null}
          {(headerTrailing || showCloseButton) && (
            <div
              className='inline-flex shrink-0 items-center'
              style={{ gap: 'var(--dim-space-200)' }}
            >
              {headerTrailing}
              {showCloseButton && <CloseButton onClick={requestClose} />}
            </div>
          )}
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
                ? 'scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-clip'
                : 'flex min-h-0 flex-1 flex-col'
            }
            style={{
              WebkitOverflowScrolling: bodyScrollable ? 'touch' : undefined,
              paddingTop: 'var(--dim-space-200)',
              paddingLeft: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
              paddingRight: 'clamp(var(--dim-space-300), 4vw, var(--dim-space-600))',
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
              ...footerStyle,
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
