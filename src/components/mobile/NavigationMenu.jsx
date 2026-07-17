import React from 'react';
import { Sym } from './Sym';

/* MIH Mobile · Navigation Menu — Figma DS "Navigation"
   (L8AlrWha3QNKcxaVCH1UFE · 3:555).

   Bottom tab bar with 5 items. Active item = FILLED icon + brand-green
   (primary/700) Mitr label; inactive = outline icon + tertiary label.
   White surface and top drop-shadow (Brand Drop Shadow Top/200). MobileShell
   renders the shared Home Indicator immediately below this navigation.

   Presentational: pass `items`, the `activeKey`, and an `onSelect(item)`
   handler. Each item: { key, icon, label, ...passthrough (e.g. path) }.
   `icon` is a Material Symbols name; the active state fills it automatically
   (no separate active glyph needed).

   Tokens (design.md): surface/card/100 · shadow/brand-drop-top/200 ·
   text/brandPrimary/default (primary/700) · text/content/tertiary ·
   dim/size/1200 (56) · dim/space/{800,200,100} · dim/radius/600 ·
   type/family/heading-graphic2 · type/size/xs. */

export const NAV_MENU_ITEMS = [
  { key: 'home',        icon: 'home',           label: 'หน้าแรก' },
  { key: 'appointment', icon: 'calendar_clock', label: 'นัดหมาย' },
  { key: 'request',     icon: 'send',           label: 'ส่งคำขอ' },
  { key: 'history',     icon: 'history',        label: 'ประวัติ' },
  { key: 'profile',     icon: 'face',           label: 'โปรไฟล์' },
];

/* Figma "Brand Drop Shadow Top/200" — two upward drop shadows in the brand
   shadow tint. The `--shadow-brand-drop-top-200` token isn't defined in
   index.css yet, so we pair the var with a Figma-accurate fallback (same
   var+fallback pattern the codebase uses for --shadow-brand-drop-top-100). */
const NAV_SHADOW =
  'var(--shadow-brand-drop-top-200, 0 -1px 4px 0 rgba(8,167,104,0.08), 0 -1px 8px 0 rgba(8,167,104,0.1))';

/* Per-item state → color + surface (Figma Menu states, DS 3:387):
     Default  — outline icon · text/content/tertiary        · transparent
     Pressed  — outline icon · brand/primary/500 (#54CF97)  · surface/card/brand-100
     Selected — FILLED icon  · text/brandPrimary/default     · transparent
   Pressed is the momentary tap-down feedback; it wins over Selected while held.
   Figma names the pressed text "text/brandprimary/secondary" = #54CF97, which is
   brand/primary/500 here (--brand-p500). We use that token directly because the
   codebase's --text-brandPrimary-secondary drifted to brand-p600 (#08A768). */
const stateColor = ({ active, pressed }) => {
  if (pressed) return 'var(--brand-p500, #54CF97)';
  if (active) return 'var(--text-brandPrimary-default, #007549)';
  return 'var(--text-content-tertiary, #858C92)';
};

const NavigationMenu = ({
  items = NAV_MENU_ITEMS,
  activeKey = 'home',
  onSelect,
  className = '',
  style,
}) => {
  const [pressedKey, setPressedKey] = React.useState(null);
  const clearPressed = () => setPressedKey(null);

  return (
    <nav
      className={`flex items-stretch justify-center ${className}`.trim()}
      style={{
        width: '100%',
        background: 'var(--surface-card-100, #FFFFFF)',
        boxShadow: NAV_SHADOW,
        ...style,
      }}
    >
      {items.map((item) => {
        const active = item.key === activeKey;
        const pressed = item.key === pressedKey;
        const color = stateColor({ active, pressed });
        return (
          <button
            key={item.key}
            type='button'
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => onSelect?.(item)}
            onPointerDown={() => setPressedKey(item.key)}
            onPointerUp={clearPressed}
            onPointerLeave={clearPressed}
            onPointerCancel={clearPressed}
            className='flex flex-col items-center justify-center overflow-hidden'
            style={{
              flex: '1 1 0',
              minWidth: 0,
              height: 'var(--dim-size-1200, 56px)',
              gap: 'var(--dim-space-100, 4px)',
              padding: 'var(--dim-space-200, 8px) 0',
              borderRadius: 'var(--dim-radius-600, 24px)',
              /* Pressed = brand-tinted pill; Default/Selected = flat on surface */
              background: pressed ? 'var(--surface-card-brand-100, #F4FBF8)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color,
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {/* Only the Selected state fills the glyph; Pressed stays outline. */}
            <Sym name={item.icon} size={24} color={color} fill={active && !pressed} />
            <span
              style={{
                fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-body))',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.5,
                whiteSpace: 'nowrap',
                color,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default NavigationMenu;
