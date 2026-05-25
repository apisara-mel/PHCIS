import React, { useState } from 'react';

/* MIH SideSubMenu — Figma "Side SubMenu" (node 299:3610).

   Companion panel that opens to the right of <Sidebar /> when a primary
   menu has its own sub-departments (e.g. all clinics under
   "ระบบบันทึกการรักษา"). Tinted brand-p50 shell + a list of
   <SideSubMenuItem> rows + an optional <SideSubMenuHeader> at the top
   labelling the parent section.

   Property panel (matches Figma 1:1):
     • State    'default' | 'hover' | 'selected' | 'disabled'
     • Header   optional section title above the items

   Visual rules per state (item):
     • Default    transparent surface · brand-p700 regular body
     • Hover      brand-p100 surface · brand-p700 regular body
     • Selected   brand-p100 surface · brand-p700 BOLD heading
     • Disabled   transparent surface · neutral-300 text · no pointer

   Tokens alias from design.md; brand surfaces retint via [data-brand].  */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const SHELL_BG     = 'var(--surface-card-brand-100, var(--brand-p50, #F4FBF8))';
const SHELL_BORDER = 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, var(--brand-p100, #E2F3EB))';
const SHELL_SHADOW = 'var(--shadow-sidemenu, 0 1px 4px rgba(8,167,104,0.10), 0 1px 2px rgba(8,167,104,0.08))';

/* Section header — body Medium · xs · neutral-tertiary. Used to label
   the parent menu the sub-departments belong to. */
export const SideSubMenuHeader = ({ children, className = '', style = {}, ...rest }) => (
  <div
    className={`flex items-center w-full ${className}`}
    style={{
      gap: 'var(--dim-space-300, 12px)',
      minHeight: 48,
      padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
      ...style,
    }}
    {...rest}
  >
    <span
      className='flex-1 min-w-0'
      style={{
        color: 'var(--text-neutral-tertiary, var(--text-content-tertiary, #ADB2B7))',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        fontWeight: 'var(--type-weight-medium, 500)',
        lineHeight: 1.5,
      }}
    >
      {children}
    </span>
  </div>
);

const resolveItemTone = (state) => {
  switch (state) {
    case 'hover':
      return {
        bg:     'var(--surface-sidesubmenu-hover, var(--brand-p100, #E2F3EB))',
        text:   'var(--text-sidesubmenu-default, var(--brand-p700, #007549))',
        weight: 'var(--type-weight-regular, 400)',
        family: 'var(--type-family-body)',
      };
    case 'selected':
      return {
        bg:     'var(--surface-sidesubmenu-selected, var(--brand-p100, #E2F3EB))',
        text:   'var(--text-sidesubmenu-selected, var(--brand-p700, #007549))',
        weight: 'var(--type-weight-bold, 700)',
        family: 'var(--type-family-heading-content, var(--type-family-body))',
      };
    case 'disabled':
      return {
        bg:     'transparent',
        text:   'var(--text-sidesubmenu-disabled, #C9CDD0)',
        weight: 'var(--type-weight-regular, 400)',
        family: 'var(--type-family-body)',
      };
    default:
      return {
        bg:     'transparent',
        text:   'var(--text-sidesubmenu-default, var(--brand-p700, #007549))',
        weight: 'var(--type-weight-regular, 400)',
        family: 'var(--type-family-body)',
      };
  }
};

/* Single sub-menu row. Pass `state` to force the visual for design-system
   grids; otherwise state resolves from `selected` + `disabled` + hover. */
export const SideSubMenuItem = React.forwardRef(function SideSubMenuItem(
  {
    children = 'Sub menu item',
    selected = false,
    disabled = false,
    state,                                  /* force 'default' | 'hover' | 'selected' | 'disabled' */
    onClick,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const effectiveState = state || (
    disabled        ? 'disabled'
    : selected      ? 'selected'
    : internalHover ? 'hover'
    : 'default'
  );
  const isDisabled = effectiveState === 'disabled';
  const isSelected = effectiveState === 'selected';
  const tone = resolveItemTone(effectiveState);

  const interactive = !!onClick && !isDisabled;

  return (
    <div
      ref={ref}
      role={interactive ? 'menuitem' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-current={isSelected ? 'page' : undefined}
      aria-disabled={isDisabled || undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      onMouseEnter={() => !state && !disabled && setInternalHover(true)}
      onMouseLeave={() => !state && setInternalHover(false)}
      onFocus={() => !state && !disabled && setInternalHover(true)}
      onBlur={() => !state && setInternalHover(false)}
      className={`flex items-center w-full ${className}`}
      style={{
        gap: 'var(--dim-space-300, 12px)',
        minHeight: 48,
        padding: 'var(--dim-space-200, 8px) var(--dim-space-600, 24px)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: tone.bg,
        cursor: interactive ? 'pointer' : (isDisabled ? 'not-allowed' : 'default'),
        transition: `background-color 160ms ${EASE}`,
        outline: 'none',
        ...style,
      }}
      {...rest}
    >
      <span
        className='flex-1 min-w-0'
        style={{
          color:      tone.text,
          fontFamily: tone.family,
          fontSize:   'var(--type-size-base, 16px)',
          fontWeight: tone.weight,
          lineHeight: 1.5,
        }}
      >
        {children}
      </span>
    </div>
  );
});

/* Container — pass `header` (string or node) + `items` array
   ({ key, label, disabled? }), or compose <SideSubMenuItem> children
   manually for full control. */
const SideSubMenu = React.forwardRef(function SideSubMenu(
  {
    header,
    items,
    selectedKey,
    onSelect,
    showBottomSpacer = true,           /* matches Figma "Bottom" slot — h=112 */
    children,
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  return (
    <aside
      ref={ref}
      className={`flex flex-col ${className}`}
      style={{
        width: 384,
        background:  SHELL_BG,
        borderRight: SHELL_BORDER,
        boxShadow:   SHELL_SHADOW,
        paddingTop:    'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-0)',
        paddingLeft:   'var(--dim-space-100, 4px)',
        paddingRight:  'var(--dim-space-100, 4px)',
        overflow:      'hidden',
        ...style,
      }}
      {...rest}
    >
      {/* Scrollable nav — when items + header overflow the panel height
         (short viewport), a vertical scrollbar appears inside the panel
         while the shell chrome (border, shadow, padding) stays anchored. */}
      <nav
        className='flex flex-col flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden scrollbar-thin'
        style={{ gap: 'var(--dim-space-150, 6px)' }}
      >
        {header && (
          typeof header === 'string'
            ? <SideSubMenuHeader>{header}</SideSubMenuHeader>
            : header
        )}
        {items
          ? items.map((it) => (
              <SideSubMenuItem
                key={it.key}
                selected={it.key === selectedKey}
                disabled={it.disabled}
                onClick={onSelect ? () => onSelect(it.key) : undefined}
              >
                {it.label}
              </SideSubMenuItem>
            ))
          : children}
      </nav>
      {showBottomSpacer && (
        <div aria-hidden style={{ height: 112, flexShrink: 0, width: '100%' }} />
      )}
    </aside>
  );
});

export default SideSubMenu;
