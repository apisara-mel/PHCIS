import React, { useContext, useLayoutEffect, useRef, useState } from 'react';
import TabCountBadge from '@/components/tab/TabCountBadge';

/* MIH TabPill — Figma "Tab Pill" (MIH Design System Foundation, node 370:30).

   Variants (per Figma node 370:30 — `size` axis is "Default" × "Large"):
     • size  : "small" (Figma's Default · h32, sm 14px text)
                "large" (Figma's Large · auto height, base 16px text)
     • style : "text" | "icon"
     • state : "default" | "hover" | "selected" | "disabled"

   Leading icon (per Figma "Tag" node 1:2473 / Tab Pill node 370:30):
     Pass `leadingIcon` to render an icon before the label. It accepts:
       • string  — Material Symbols icon name (auto-rendered)
       • element — a <Sym>, <Icon>, or any element that takes size+style
       • function — render prop receiving { size, color }
     If `leadingIcon` is omitted / null / false, no icon is rendered — the
     pill stays text-only. Existing call sites that used `icon` + `showIcon`
     continue to work via back-compat aliases.

   Micro-interactions:
     • Inside an animated <TabBar> (default): the parent renders a single
       indicator that physically slides between selected pills; this pill
       therefore paints NO selected bg/shadow of its own — only label/icon
       colour transitions. That gives one continuous motion across the bar
       instead of two separate per-pill animations playing in parallel.
     • Press feedback: scale(0.96) on pointer-down, springs back on release.
     • Hover/selected colour morphs share one cubic-bezier curve so the
       label colour, icon colour, and indicator slide all feel cohesive.

   Tokens (mode-switchable via CSS vars, aliased from design.md §6.16):
     surface/tabpill/{default,selected,hover,disabled}
     text/tabpill/{default,hover,selected,disabled}
     icon/tabpill/{default,hover,selected,disabled}
     shadow/tabpill/selected (= Brand Bottom/200 · --PrimaryShadow-600/601) */

/* TabBarContext — used by the parent TabBar (defined below in the same
   module) to tell each pill that the bar already paints the selected
   indicator, so the pill should stay transparent for the `selected` state.
   Kept on the module so existing call sites that imported it from the
   former TabBar.jsx still resolve. */
export const TabBarContext = React.createContext({ animated: false });

/* Per Figma node 370:30. The `text` style uses `iconText`; `icon` style
   (icon-only) uses `iconOnly`. Padding/font/height keys collapse to inline
   styles below. `height` is null for `large` because the pill grows from
   padding + 1.5 line-height; `small` enforces 32px to match dimension/size/600. */
const SIZE = {
  small: {
    py: 6,                            /* dimension/space/150 / 2  → 6px */
    px: 12,                           /* — (literal in Figma) */
    height: 32,                       /* dimension/size/600 */
    fontSize: 'var(--type-size-sm)',  /* 14 */
    fontFamily: "'Sarabun', sans-serif",
    iconText: 14,
    iconOnly: 20,
    gap: 'var(--dim-space-150)',      /* 6 */
  },
  large: {
    py: 'var(--dim-space-300)',       /* 12 */
    px: 'var(--dim-space-400)',       /* 16 */
    height: null,                      /* let py+content drive it */
    fontSize: 'var(--type-size-base)',
    fontFamily: 'var(--type-family-ui, var(--type-family-body))',
    iconText: 16,
    iconOnly: 24,
    gap: 'var(--dim-space-150)',
  },
};

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/* Inline Material Symbols renderer for string leadingIcon names. Keeps
   TabPill self-contained — no external Icon import needed. Colour and size
   come from the resolved icon-tabpill token + the size variant. */
const Sym = ({ name, size, color }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      flexShrink: 0,
    }}
    aria-hidden
  >
    {name}
  </span>
);

const stateStyles = (state, animatedBar) => {
  /* In an animated TabBar the parent paints the selected fill, so the pill
     stays transparent for `selected` (and `disabled`, which would otherwise
     also paint over the indicator). Hover still tints — it's only ever on
     unselected pills, so it never conflicts with the indicator. */
  switch (state) {
    case 'selected':
      return {
        background: animatedBar ? 'transparent' : 'var(--surface-tabpill-selected)',
        color: 'var(--text-tabpill-selected)',
        iconColor: 'var(--icon-tabpill-selected)',
        boxShadow: animatedBar ? 'none' : 'var(--shadow-tabpill-selected)',
      };
    case 'hover':
      return {
        background: 'var(--surface-tabpill-hover)',
        color: 'var(--text-tabpill-hover)',
        iconColor: 'var(--icon-tabpill-hover)',
        boxShadow: 'none',
      };
    case 'disabled':
      return {
        background: animatedBar ? 'transparent' : 'var(--surface-tabpill-disabled)',
        color: 'var(--text-tabpill-disabled)',
        iconColor: 'var(--icon-tabpill-disabled)',
        boxShadow: 'none',
      };
    case 'default':
    default:
      return {
        background: 'transparent',
        color: 'var(--text-tabpill-default)',
        iconColor: 'var(--icon-tabpill-default)',
        boxShadow: 'none',
      };
  }
};

const TabPill = React.forwardRef(function TabPill(
  {
    size = 'small',
    style: kind = 'text',
    state,
    selected = false,
    disabled = false,
    /* Leading icon — string (Material Symbols name) | element | render fn.
       When omitted/falsy the pill renders as text-only. */
    leadingIcon,
    /* Back-compat aliases. `icon` is the previous prop name; `showIcon`
       lets callers force-hide an icon they would otherwise pass. */
    icon: iconLegacy,
    showIcon = true,
    /* Optional count chip — same brandTag frame as TabUnderline. */
    count,
    children,
    onClick,
    type = 'button',
    role = 'tab',
    className = '',
    styleOverride,
    ...rest
  },
  ref,
) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const { animated: animatedBar } = useContext(TabBarContext);
  /* Accept legacy "default" alias for "small" so older call sites don't break. */
  const dim = SIZE[size === 'default' ? 'small' : size] || SIZE.small;

  // Resolve effective state precedence: explicit prop > disabled > selected > hover > default
  const effective =
    state || (disabled ? 'disabled' : selected ? 'selected' : hovered ? 'hover' : 'default');
  const s = stateStyles(effective, animatedBar);

  /* Resolve which icon source to use. `leadingIcon` wins; falls back to the
     legacy `icon` prop. `showIcon={false}` force-hides regardless of source. */
  const iconSource = showIcon ? (leadingIcon ?? iconLegacy) : null;

  const renderIcon = () => {
    if (iconSource == null || iconSource === false) return null;
    const sz = kind === 'icon' ? dim.iconOnly : dim.iconText;
    if (typeof iconSource === 'string') {
      return <Sym name={iconSource} size={sz} color={s.iconColor} />;
    }
    if (typeof iconSource === 'function') {
      return iconSource({ size: sz, color: s.iconColor });
    }
    return React.cloneElement(iconSource, {
      size: sz,
      style: { color: s.iconColor, ...(iconSource.props?.style || {}) },
    });
  };

  return (
    <button
      ref={ref}
      type={type}
      role={role}
      aria-selected={role === 'tab' ? !!selected : undefined}
      aria-pressed={role === 'tab' ? undefined : !!selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onBlur={() => setPressed(false)}
      className={`relative inline-flex items-center justify-center whitespace-nowrap ${className}`}
      style={{
        gap: kind === 'icon' ? 0 : dim.gap,
        paddingLeft: dim.px,
        paddingRight: dim.px,
        paddingTop: dim.py,
        paddingBottom: dim.py,
        height: dim.height ? `${dim.height}px` : 'auto',
        borderRadius: 'var(--dim-radius-full)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: s.background,
        color: s.color,
        boxShadow: s.boxShadow,
        fontFamily: dim.fontFamily,
        fontSize: dim.fontSize,
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
        outline: 'none',
        flex: '0 0 auto',
        // Keep label/icon above the TabBar's absolute indicator.
        zIndex: 1,
        transform: pressed && !disabled ? 'scale(0.96)' : 'scale(1)',
        transition: [
          `background-color 200ms ${EASE}`,
          `color 200ms ${EASE}`,
          `box-shadow 240ms ${EASE}`,
          `transform 140ms ${EASE}`,
        ].join(', '),
        ...(styleOverride || {}),
      }}
      {...rest}
    >
      {kind === 'icon' ? (
        renderIcon()
      ) : (
        <>
          {renderIcon()}
          {children != null && <span>{children}</span>}
          {typeof count === 'number' && (
            <TabCountBadge
              count={count}
              tone='green'
              selected={effective === 'selected'}
              hovered={effective === 'hover' || (effective === 'selected' && hovered)}
            />
          )}
        </>
      )}
    </button>
  );
});

export default TabPill;

/* Size aliases — explicit components for the two DS sizes.
   Useful when callers want stable APIs instead of repeating `size=...`. */
export const TabPillSmall = React.forwardRef(function TabPillSmall(props, ref) {
  return <TabPill ref={ref} size='small' {...props} />;
});

export const TabPillLarge = React.forwardRef(function TabPillLarge(props, ref) {
  return <TabPill ref={ref} size='large' {...props} />;
});

/* Back-compat naming aliases used in some screens/spec notes. */
export const TabPill1 = TabPillSmall;
export const TabPill2 = TabPillLarge;

/* ─── TabBar — container that holds a row of <TabPill> children ──────────
   Figma "Tab Bar" (MIH Design System Foundation, node 2514:7929).
   Lives in the same module as TabPill so the two parts of the pattern stay
   together (one file, one mental model). Older imports from
   '@/components/forms/TabBar' should be updated to import from
   '@/components/tab/TabPill'.

   Micro-interaction:
     A single indicator div sits behind the pills and is animated to the
     position/width of the currently aria-selected child. Switching tabs
     reads as one element gliding across the bar.

   Tokens:
     surface/tabpill/background  → --surface-tabpill-background
     surface/tabpill/selected    → --surface-tabpill-selected (indicator fill)
     shadow/tabpill/selected     → --shadow-tabpill-selected   (indicator shadow)
     dim/space/100               → padding (4px)
     dim/radius/full             → 9999px

   Props:
     • align    — "start" (default), "center", "end"
     • stretch  — when true, every <TabPill> child grows to share remaining
                  space equally (flex: 1).
     • animated — when true (default) renders the sliding indicator and
                  tells child TabPills (via context) to skip painting their
                  own selected bg. Set false to keep per-pill bg painting. */

export const TabBar = React.forwardRef(function TabBar(
  {
    children,
    className = '',
    style = {},
    align = 'start',
    stretch = false,
    animated = true,
    'aria-label': ariaLabel,
    ...rest
  },
  ref,
) {
  const justify =
    align === 'center' ? 'justify-center' : align === 'end' ? 'justify-end' : 'justify-start';

  const containerRef = useRef(null);
  const setRefs = (node) => {
    containerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  /* Indicator measurement — read the selected pill's position relative to
     the container after every layout pass. Deps array intentionally
     omitted: layout-affecting changes (font load, theme switch, parent
     resize) all need re-measurement, and the cost is two
     getBoundingClientRect calls + a state update only when values change. */
  const [indicator, setIndicator] = useState({ x: 0, width: 0, ready: false });
  useLayoutEffect(() => {
    if (!animated) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const measure = () => {
      const selected = container.querySelector('[aria-selected="true"]');
      if (!selected) {
        setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const cRect = container.getBoundingClientRect();
      const sRect = selected.getBoundingClientRect();
      const next = {
        x: sRect.left - cRect.left,
        width: sRect.width,
        ready: true,
      };
      setIndicator((prev) =>
        prev.x === next.x && prev.width === next.width && prev.ready === next.ready
          ? prev
          : next,
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    Array.from(container.children).forEach((c) => {
      if (c instanceof Element) ro.observe(c);
    });
    return () => ro.disconnect();
  });

  const renderChildren = () => {
    if (!stretch) return children;
    return React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      const prevOverride = child.props.styleOverride || {};
      return React.cloneElement(child, {
        styleOverride: {
          flex: '1 1 0',
          minWidth: 0,
          ...prevOverride,
        },
      });
    });
  };

  return (
    <TabBarContext.Provider value={{ animated }}>
      <div
        ref={setRefs}
        role='tablist'
        aria-label={ariaLabel}
        className={`relative flex items-stretch ${justify} ${stretch ? 'w-full' : 'overflow-x-auto'} ${className}`}
        style={{
          background: 'var(--surface-tabpill-background)',
          padding: 'var(--dim-space-100)',
          gap: 'var(--dim-space-050)',
          borderRadius: 'var(--dim-radius-full)',
          ...style,
        }}
        {...rest}
      >
        {animated && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 'var(--dim-space-100)',
              bottom: 'var(--dim-space-100)',
              left: 'var(--dim-space-0)',
              width: indicator.width,
              transform: `translateX(${indicator.x}px)`,
              background: 'var(--surface-tabpill-selected)',
              borderRadius: 'var(--dim-radius-full)',
              boxShadow: 'var(--shadow-tabpill-selected)',
              opacity: indicator.ready ? 1 : 0,
              transition: indicator.ready
                ? `transform 280ms ${EASE}, width 280ms ${EASE}, opacity 160ms ${EASE}`
                : 'opacity 160ms linear',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        {renderChildren()}
      </div>
    </TabBarContext.Provider>
  );
});
