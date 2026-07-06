import React, { useEffect, useState } from 'react';
import Tooltip from '@/components/tooltip/Tooltip';

/** Tailwind-aligned min-widths: label shows at this width and up; below = icon-only when `collapseLabelBelow` is set. */
const COLLAPSE_LABEL_MIN_PX = { sm: 640, md: 768, lg: 1024, xl: 1280 };

function useViewportMinWidthGte(px) {
  const [matches, setMatches] = useState(() => {
    if (px == null) return true;
    if (typeof window === 'undefined') return true;
    return window.matchMedia(`(min-width: ${px}px)`).matches;
  });
  useEffect(() => {
    if (px == null) return undefined;
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [px]);
  return matches;
}

/* MIH NeutralSubdueButton — Figma "Neutral Subdue Button" (node 2024:2940).
   2 styles (fill / outline) × 3 sizes × 5 states.

   Property panel:
     • Style              → `variant` ('fill' | 'outline')
     • Size               → `size`    ('sm' | 'md' | 'lg')
     • State              → derived from {disabled, active, focused, hover}
     • Show Label/Leading/Trailing icon → `show*` toggles

   Tone rule (family-wide):
     • Text + icon stay at `text/icon-neutralButton/default`
     • Outline border stays at `border/neutralButton/tertiary`
     • Only the surface retints on hover
     • Focus → 4px `outline` (sits OUTSIDE the box, no layout shift)

   • Fill default     → secondary surface (neutral/200); Fill hover → secondary-hover
   • Outline default  → transparent; Outline hover → quaternary surface
   • Active           → quaternary surface + 1px quaternary border
   • Disabled         → disabledButton tertiary

   Tokens alias from design.md §4.5 — no hex literals.            */

const SIZES = {
  sm: { height: 36, paddingX: 'var(--dim-space-300)', paddingY: 'var(--dim-space-150)', gap: 'var(--dim-space-150)', icon: 16, fontSize: 'var(--type-size-sm)' },
  md: { height: 40, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-base)' },
  lg: { height: 44, paddingX: 'var(--dim-space-400)', paddingY: 'var(--dim-space-200)', gap: 'var(--dim-space-200)', icon: 20, fontSize: 'var(--type-size-base)' },
};

const Sym = ({ name, size, color }) => (
  <span
    className='material-symbols-outlined transition-colors duration-200 ease-out'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

const FOCUS_OUTLINE_TERTIARY = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-tertiary)';
const FOCUS_OUTLINE_SECONDARY = 'var(--dim-stroke-400, 4px) solid var(--border-neutralButton-secondary)';

const resolveStyles = ({ variant, isHover, active, focused, disabled }) => {
  if (disabled) {
    return {
      bg: 'var(--surface-disabledButton-tertiary)',
      border: variant === 'outline'
        ? `var(--dim-stroke-100) solid var(--border-disabledButton-tertiary)`
        : 'none',
      outline: 'none',
      text: 'var(--icon-disabledButton-tertiary)',
      icon: 'var(--icon-disabledButton-tertiary)',
    };
  }
  if (active) {
    return {
      bg: 'var(--surface-neutralButton-quaternary)',
      border: `var(--dim-stroke-100) solid var(--border-neutralButton-quaternary)`,
      outline: 'none',
      text: 'var(--text-neutralButton-default)',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  if (variant === 'outline') {
    return {
      bg: isHover ? 'var(--surface-neutralButton-quaternary)' : 'transparent',
      border: 'var(--dim-stroke-100) solid var(--border-neutralButton-tertiary)',
      outline: focused ? FOCUS_OUTLINE_TERTIARY : 'none',
      text: 'var(--text-neutralButton-default)',
      icon: 'var(--icon-neutralButton-default)',
    };
  }
  /* fill — Subdue (secondary = neutral/200) */
  return {
    bg: isHover ? 'var(--surface-neutralButton-secondary-hover)' : 'var(--surface-neutralButton-secondary)',
    border: 'none',
    outline: focused ? FOCUS_OUTLINE_SECONDARY : 'none',
    text: 'var(--text-neutralButton-default)',
    icon: 'var(--icon-neutralButton-default)',
  };
};

const NeutralSubdueButton = React.forwardRef(function NeutralSubdueButton(
  {
    leadingIcon,
    leadingIconElement,
    trailingIcon,
    children,
    onClick,
    disabled = false,
    active = false,
    focused = false,
    hovered: hoveredProp = false,
    type = 'button',
    variant = 'outline', /* legacy default */
    size = 'sm',         /* legacy default */
    showLabel = true,
    showLeadingIcon,
    showTrailingIcon,
    className = '',
    style = {},
    /** `'lg'` → below 1024px viewport width, hide label and use square icon hit-target (queue toolbars). */
    collapseLabelBelow,
    /** Used for `aria-label` + `title` when collapsed; falls back to string `children` if omitted. */
    accessibilityLabel,
    'aria-label': ariaLabelProp,
    ...rest
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isHover = (hovered || hoveredProp) && !disabled;
  const styleType = variant === 'outlined' ? 'outline' : variant;
  const dim = SIZES[size] || SIZES.sm;
  const s = resolveStyles({ variant: styleType, isHover, active, focused, disabled });
  const renderLeadingIcon  = showLeadingIcon  !== undefined
    ? showLeadingIcon
    : !!(leadingIconElement || leadingIcon);
  const renderTrailingIcon = showTrailingIcon !== undefined ? showTrailingIcon : !!trailingIcon;

  const collapsePx = (collapseLabelBelow && COLLAPSE_LABEL_MIN_PX[collapseLabelBelow]) ?? null;
  const wideEnoughForLabel = useViewportMinWidthGte(collapsePx);
  const isCompact = !!collapseLabelBelow && !wideEnoughForLabel;
  const effectiveShowLabel = showLabel && (!collapseLabelBelow || wideEnoughForLabel);
  const resolvedShortLabel = accessibilityLabel
    ?? (typeof children === 'string' ? children : undefined);
  const computedAriaLabel = isCompact
    ? (resolvedShortLabel ?? ariaLabelProp)
    : ariaLabelProp;
  /* Native `title` is suppressed in compact mode because the styled <Tooltip>
     wrapper below already surfaces the label on hover/focus; keeping both
     would double-render (browser native tooltip + bubble). */
  const computedTitle = undefined;

  const btn = (
    <button
      ref={ref}
      type={type}
      aria-pressed={active || undefined}
      aria-label={computedAriaLabel}
      title={computedTitle}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-200 ease-out ${className}`}
      style={{
        height: dim.height,
        minWidth: isCompact ? dim.height : 80,
        maxWidth: isCompact ? dim.height : 384,
        gap: isCompact ? 0 : dim.gap,
        paddingLeft: isCompact ? 'var(--dim-space-200)' : dim.paddingX,
        paddingRight: isCompact ? 'var(--dim-space-200)' : dim.paddingX,
        paddingTop: dim.paddingY, paddingBottom: dim.paddingY,
        borderRadius: 'var(--dim-radius-200)',
        background: s.bg, border: s.border, color: s.text,
        outline: s.outline,
        outlineOffset: 0,
        fontFamily: 'var(--type-family-body)',
        fontSize: dim.fontSize, fontWeight: 'var(--type-weight-medium)', lineHeight: 1.5,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: disabled ? 'none' : (pressed ? 'translateY(1px) scale(0.97)' : (hovered ? 'translateY(-1px)' : 'translateY(0)')),
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {renderLeadingIcon && (
        leadingIconElement
          ?? (leadingIcon && <Sym name={leadingIcon} size={dim.icon} color={s.icon} />)
      )}
      {effectiveShowLabel && children != null && <span>{children}</span>}
      {renderTrailingIcon && trailingIcon && <Sym name={trailingIcon} size={dim.icon} color={s.icon} />}
    </button>
  );

  /* In compact (icon-only) mode, surface the collapsed label as a styled
     tooltip on hover/focus so users still see the menu name (e.g.
     "แก้ไขลำดับคิว", "นำส่งออกรายงาน"). */
  if (isCompact && resolvedShortLabel) {
    return (
      <Tooltip content={resolvedShortLabel} position='top' disabled={disabled}>
        {btn}
      </Tooltip>
    );
  }

  return btn;
});

export default NeutralSubdueButton;
