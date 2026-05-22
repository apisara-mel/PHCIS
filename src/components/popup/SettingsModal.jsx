import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';

/* MIH SettingsModal — Figma "Popup Very Large / การตั้งค่า" (PHCIS-ALL
   node 2646:98421). Two-column layout:
     • Left:  ActionList nav (ภาษา / โหมดและธีม / เปลี่ยนรหัสผ่าน / แจ้งเตือน)
     • Right: Mode (Light/Dark/System) + Theme (10 brand swatches)

   Selecting a theme emits onApply({ mode, theme }); the host page applies
   the brand mode by setting <html data-brand="..."> — every semantic
   token aliased through --brand-p* re-tints atomically.                */

const Sym = ({ name, size = 16, color, fill }) => (
  <span
    className='material-symbols-outlined'
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontSize: size,
      color,
      lineHeight: 1,
      display: 'inline-flex',
      fontVariationSettings: fill ? "'FILL' 1" : undefined,
    }}
    aria-hidden
  >
    {name}
  </span>
);

/* Mode catalog — bg + icon colors alias from Figma popup spec (node 95:5469):
   • Light  bg = surface/pink/quaternary   · icon = text/colorfulbadge/pink   (pink/700 #BE185D)
   • Dark   bg = surface/navy/quaternary   · icon = text/colorfulbadge/indigo (indigo/700 #4338CA)
   • System bg = surface/brandprimary/quaternary · icon = text/brandprimary/default (retints with [data-brand])

   Light + Dark icons stay semantically fixed (sun = pink/warm, moon = indigo/night)
   regardless of brand mode. Only System retints — it represents the user's brand. */
const MODES = [
  { key: 'light',  label: 'Light',  th: 'สว่าง',     icon: 'light_mode',
    bg:        'var(--surface-pink-quaternary, #FBF4F8)',
    iconColor: 'var(--text-colorfulbadge-pink, #BE185D)' },
  { key: 'dark',   label: 'Dark',   th: 'มืด',       icon: 'dark_mode',
    bg:        'var(--surface-navy-quaternary, #F3F5FC)',
    iconColor: 'var(--text-colorfulbadge-indigo, #4338CA)' },
  { key: 'system', label: 'System', th: 'ตามระบบ',   icon: 'desktop_windows',
    bg:        'var(--surface-brandprimary-quaternary, var(--brand-p50, #F4FBF8))',
    iconColor: 'var(--text-brandprimary-default, var(--brand-p700, #007549))' },
];

/* Theme catalog — keys must match the [data-brand="..."] selectors in
   index.css. Swatch values (c700/c300/cLight) are pulled per-theme from
   the Figma popup spec (node 97:6492) — each row shows its own palette
   regardless of the currently-active brand mode, so users can preview
   before applying.

   Figma quirks to preserve:
     • Soft Sky uses palette `/50` (#F5FBFF) instead of /100 — keeps the
       lightest block visibly brighter against the /300 mid-tone.
     • Muted Teal uses the Tailwind `teal/100` (#D1F6EE) for the lightest
       block, not the desaturated `muted-teal/100` — adds pop to the
       palette preview.                                                  */
/* Order mirrors Figma node 97:5781 — 2-column grid, reading left-to-right,
   top-to-bottom (Row 1: Default / Soft Peach, Row 2: Muted Teal / Sakura,
   Row 3: Soft Sky / Rose Mist, Row 4: Blue Serenity / Dusty Mauve, Row 5:
   Soft Lavender / Muted Gray). */
const THEMES = [
  { key: 'default',        label: 'Default',        c700: '#007549', c300: '#91DFBB', cLight: '#E2F3EB' },
  { key: 'soft-peach',     label: 'Soft Peach',     c700: '#D0714D', c300: '#FCD1B8', cLight: '#FEF0E8' },
  { key: 'muted-teal',     label: 'Muted Teal',     c700: '#486462', c300: '#8DC3C0', cLight: '#D1F6EE' },
  { key: 'sakura',         label: 'Sakura',         c700: '#D687A8', c300: '#FFCFDF', cLight: '#FFEDF3' },
  { key: 'soft-sky',       label: 'Soft Sky',       c700: '#5594C4', c300: '#D6ECFA', cLight: '#F5FBFF' },
  { key: 'rose-mist',      label: 'Rose Mist',      c700: '#BC8584', c300: '#F4D0CF', cLight: '#FCEEED' },
  { key: 'blue-serenity',  label: 'Blue Serenity',  c700: '#6676E0', c300: '#BBC6FE', cLight: '#E4E8FF' },
  { key: 'dusty-mauve',    label: 'Dusty Mauve',    c700: '#664750', c300: '#D0ADB2', cLight: '#F2E6E8' },
  { key: 'soft-lavender',  label: 'Soft Lavender',  c700: '#836FC0', c300: '#D6C6FA', cLight: '#F2ECFF' },
  { key: 'warm-gray',      label: 'Muted Gray',     c700: '#5C504A', c300: '#BDB5AF', cLight: '#EBE7E4' },
];

/* Left side-panel item; selected state mirrors Figma 97:6492. */
const NavItem = ({ icon, label, active, onClick }) => {
  const [hover, setHover] = useState(false);
  const tinted = active || hover;
  return (
    <div
      role='menuitem'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(); }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className='cursor-pointer flex items-center w-full overflow-hidden'
      style={{
        minHeight: 'var(--dim-size-1000)',          /* 48px */
        boxSizing: 'border-box',
        gap:           'var(--dim-space-200)',
        paddingLeft:   'var(--dim-space-300)',
        paddingRight:  'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius:  active ? 'var(--dim-radius-100)' : 6,
        borderLeft:    active ? 'var(--dim-stroke-400) solid var(--brand-p700)' : 'none',
        background: tinted ? 'var(--surface-list-hover)' : 'transparent',
        color:      tinted ? 'var(--text-list-hover)'    : 'var(--text-list-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize:   'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      <span
        aria-hidden
        className='inline-flex items-center justify-center shrink-0'
        style={{ width: 'var(--dim-size-300)', height: 'var(--dim-size-300)' }}
      >
        <Sym name={icon} size={16} color='currentColor' />
      </span>
      <span className='flex-1 min-w-0 truncate'>{label}</span>
      {active && (
        <span
          aria-hidden
          className='inline-flex items-center justify-center shrink-0'
          style={{ width: 'var(--dim-size-300)', height: 'var(--dim-size-300)' }}
        >
          <Sym name='chevron_right' size={16} color='currentColor' />
        </span>
      )}
    </div>
  );
};

/* Generic radio card used for both Mode and Theme rows. */
const RadioCard = ({ selected, onClick, children, fullWidth = false }) => {
  const [hover, setHover] = useState(false);
  const interactive = hover && !selected;

  return (
    <div
      role='radio'
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick && onClick(); }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className='cursor-pointer flex items-center overflow-hidden shrink-0 transition'
      style={{
        flex:          fullWidth ? '1 1 0' : '0 0 auto',
        minHeight:     56,
        minWidth:      40,
        gap:           'var(--dim-space-200)',
        paddingLeft:   'var(--dim-space-400)',
        paddingRight:  'var(--dim-space-400)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius:  'var(--dim-radius-200)',
        background:    interactive
          ? 'var(--surface-list-hover)'
          : 'var(--surface-neutralbutton-quinary)',
        borderStyle:   'solid',
        borderWidth:   selected ? 'var(--dim-stroke-200)' : 'var(--dim-stroke-100)',
        borderColor:   selected || interactive
          ? 'var(--border-brandprimarybutton-tertiary)'
          : 'var(--border-neutralbutton-tertiary)',
        boxShadow:     interactive ? 'var(--shadow-card-hover)' : 'none',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
};

const ModeButton = ({ mode, selected, onClick }) => (
  <RadioCard selected={selected} onClick={onClick}>
    <div
      className='shrink-0 flex items-center justify-center'
      style={{
        width:  'var(--dim-size-700)',           /* 36px */
        height: 'var(--dim-size-700)',
        borderRadius: 18,
        background: mode.bg,
      }}
    >
      <Sym name={mode.icon} size={20} color={mode.iconColor} />
    </div>
    <div className='flex flex-col items-start justify-center overflow-hidden'>
      <span
        className='whitespace-nowrap'
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}
      >
        {mode.label}
      </span>
      <span
        className='whitespace-nowrap'
        style={{
          color: 'var(--text-content-tertiary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          lineHeight: 1.5,
        }}
      >
        {mode.th}
      </span>
    </div>
  </RadioCard>
);

/* Three-segment swatch (20+20+40 = 80×36) that previews a theme's
   palette: dark accent (c700) + mid (c300) + lightest tint (cLight,
   either /50 or /100 per Figma — see THEMES quirks above). */
const ThemeSwatch = ({ c700, c300, cLight }) => (
  <div
    aria-hidden
    className='flex items-center overflow-hidden shrink-0'
    style={{ height: 36, borderRadius: 'var(--dim-radius-100)' }}
  >
    <div style={{ width: 20, height: '100%', background: c700 }} />
    <div style={{ width: 20, height: '100%', background: c300 }} />
    <div style={{ width: 40, height: '100%', background: cLight }} />
  </div>
);

const ThemeCard = ({ theme, selected, onClick }) => (
  <RadioCard selected={selected} onClick={onClick} fullWidth>
    <ThemeSwatch c700={theme.c700} c300={theme.c300} cLight={theme.cLight} />
    <div className='flex flex-col items-start justify-center overflow-hidden'>
      <span
        className='whitespace-nowrap'
        style={{
          color: 'var(--text-content-default)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}
      >
        {theme.label}
      </span>
    </div>
  </RadioCard>
);

const SectionTitle = ({ children }) => (
  <p
    className='w-full'
    style={{
      color:      'var(--text-topic-tertiary-title)',
      fontFamily: 'var(--type-family-heading-content)',
      fontSize:   'var(--type-size-base)',
      fontWeight: 'var(--type-weight-bold)',
      lineHeight: 1.5,
      margin: 'var(--dim-space-0)',
    }}
  >
    {children}
  </p>
);

const SettingsModal = ({
  open,
  onClose,
  onApply,
  initialMode = 'light',
  initialTheme = 'default',
}) => {
  const [mode, setMode] = useState(initialMode);
  const [theme, setTheme] = useState(initialTheme);

  // Reset local state to current applied values whenever the modal re-opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setTheme(initialTheme);
    }
  }, [open, initialMode, initialTheme]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='การตั้งค่า'
      subtitle='ปรับแต่งการใช้งานให้เหมาะกับคุณ'
      width={1024}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
      primaryAction={{ label: 'ตกลง', onClick: () => onApply && onApply({ mode, theme }) }}
      /* Body owns its own sidebar + right-panel layout, so reset the
         template's column padding/gap and let the children paint to edges. */
      bodyStyle={{ padding: 'var(--dim-space-0)', gap: 'var(--dim-space-0)', flexDirection: 'row' }}
    >
      {/* Action list (left, 316px) */}
      <div
        className='flex flex-col self-stretch'
        style={{
          width: 316,
          minWidth: 160,
          gap: 'var(--dim-space-100)',
          paddingLeft:   'var(--dim-space-600)',
          paddingRight:  'var(--dim-space-400)',
          paddingTop:    'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          borderRight:   'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-0)' }}>
          <NavItem icon='translate'     label='ภาษา' />
          <NavItem icon='palette'       label='โหมดและธีม' active />
          <NavItem icon='lock'          label='เปลี่ยนรหัสผ่าน' />
          <NavItem icon='notifications' label='การตั้งค่าแจ้งเตือน' />
        </div>
      </div>

      {/* Right panel */}
      <div
        className='flex-1 min-w-0 flex flex-col'
        style={{
          background: 'var(--surface-card-100)',
          padding: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* Mode group */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <SectionTitle>โหมด (Mode)</SectionTitle>
          <div className='flex w-full' style={{ gap: 'var(--dim-space-400)', flexWrap: 'wrap' }}>
            {MODES.map((m) => (
              <ModeButton
                key={m.key}
                mode={m}
                selected={mode === m.key}
                onClick={() => setMode(m.key)}
              />
            ))}
          </div>
        </div>

        {/* Theme group — 2 cards per row */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <SectionTitle>ธีม (Theme)</SectionTitle>
          <div
            className='grid w-full'
            style={{
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              columnGap: 'var(--dim-space-400)',
              rowGap:    'var(--dim-space-400)',
            }}
          >
            {THEMES.map((t) => (
              <ThemeCard
                key={t.key}
                theme={t}
                selected={theme === t.key}
                onClick={() => setTheme(t.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </Popup>
  );
};

export default SettingsModal;
