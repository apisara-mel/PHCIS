import React, { createContext, useContext, useState } from 'react';
import {
  /* New canonical Figma-named buttons */
  BrandButton,
  BrandSubdueButton,
  DangerButton,
  DangerSubdueButton,
  NeutralButton,
  NeutralSubdueButton,
  BrandIconButton,
  BrandSubdueIconButton,
  DangerIconButton,
  DangerSubdueIconButton,
  NeutralIconButton,
  NeutralSubdueIconButton,
  BrandCircleIconButton,
  BrandCircleSubdueIconButton,
  BrandSubdueFloatButton,
  HistoryListFormButton,
  /* Primitives */
  MobileCard,
  MobileInput,
  MobileField,
  MobileBadge,
  MobileSectionLabel,
  MobileHeader,
  Sym,
} from '@/components/mobile';

/* MIH Mobile · Components preview (full-width, no phone frame).
   Documentation surface — mirrors the desktop /components/<slug> pattern
   so the design-system docs viewer can show mobile primitives at their
   real size without a 390-wide phone chrome. Components stay in a
   center column (max 720) because they're authored for 390 — letting
   them stretch full-width would misrepresent their visual weight.

   This page does NOT use MobileShell — the phone frame is for app
   demos, not docs. */

/* Active-section filter. The page is driven by the design-system.html
   sidebar (its own sidemenu) via the `?component=<slug>` URL param — no
   in-page sidemenu, so the two don't duplicate. 'all' (no param) shows
   every section stacked. Section reads the active slug via context so we
   don't thread a prop through all 18 calls. */
const ActiveSectionContext = createContext('all');

/* Map design-system.html catalog slugs → Section anchors. Button slugs now
   match their Section anchors 1:1 (each component has its own matrix table).
   A couple of non-button slugs still fold into a shared section. */
const SLUG_TO_SECTION = {
  'brand-subdue-float-button': 'float-button',  /* FAB section anchor */
  'mobile-field':              'mobile-input',  /* Field lives in the Input + Field section */
};

const Section = ({ title, anchor, subtitle, children }) => {
  const active = useContext(ActiveSectionContext);
  /* Hide sections that don't match the selected slug (unless 'all'). */
  if (active !== 'all' && active !== anchor) return null;
  return (
  <section id={anchor} style={{
    marginBottom: 'var(--dim-space-700, 32px)',
    scrollMarginTop: 80,
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--dim-space-300, 12px)',
      marginBottom: 'var(--dim-space-200, 8px)',
      borderBottom: '1px solid var(--border-content-tertiary, #E1E3E5)',
      paddingBottom: 'var(--dim-space-200, 8px)',
    }}>
      <h2 style={{
        margin: 0,
        fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
        fontWeight: 'var(--type-weight-regular, 400)',
        fontSize: 'var(--type-size-xl, 20px)',
        color: 'var(--text-content-primary)',
      }}>{title}</h2>
      {anchor && (
        <code style={{
          fontFamily: 'Menlo, monospace',
          fontSize: 'var(--type-size-xs, 12px)',
          color: 'var(--text-content-tertiary, #858C92)',
          background: 'var(--surface-content-secondary, #F5F6F7)',
          padding: '2px 6px',
          borderRadius: 'var(--dim-radius-150, 6px)',
        }}>{anchor}</code>
      )}
    </div>
    {subtitle && (
      <p style={{
        margin: '0 0 var(--dim-space-400, 16px)',
        fontSize: 'var(--type-size-sm, 14px)',
        color: 'var(--text-content-secondary, #565D6D)',
        lineHeight: 1.5,
      }}>{subtitle}</p>
    )}
    {/* White demo surface — mirrors the desktop /components card so every
       state-matrix / swatch group sits on white instead of the grey page bg. */}
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-300, 12px)',
      background: 'var(--surface-content-default, #FFFFFF)',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
      borderRadius: 'var(--dim-radius-400, 12px)',
      padding: 'var(--dim-space-400, 16px)',
    }}>
      {children}
    </div>
  </section>
  );
};

const Row = ({ children }) => (
  <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', flexWrap: 'wrap' }}>
    {children}
  </div>
);

/* ── State-matrix table (mirrors desktop /components BrandButton) ───────
   Columns = Figma State property (Default / Hover / Active / Focus /
   Disabled). Rows = Size. One table per Style (variant). `hovered` /
   `active` / `focused` / `disabled` props force the state on the shared
   base renderer (no real user input needed).

   Figma's Circle Icon Button labels its active state "Selected"; it still
   forces the same `active` prop, so the column header stays "Active". */
const MATRIX_STATES = [
  { key: 'default',  label: 'Default',  forced: {} },
  { key: 'hover',    label: 'Hover',    forced: { hovered: true } },
  { key: 'active',   label: 'Active',   forced: { active: true } },
  { key: 'focus',    label: 'Focus',    forced: { focused: true } },
  { key: 'disabled', label: 'Disabled', forced: { disabled: true } },
];

/* Mobile buttons ship 2 sizes (md 44 / lg 56). Figma's Small (36) is
   desktop-only — not implemented on mobile per design.md §7.3. */
const MATRIX_SIZES = [
  { key: 'lg', label: 'Large (56)' },
  { key: 'md', label: 'Medium (44)' },
];

const VARIANT_LABEL = { fill: 'Fill', outline: 'Outline', ghost: 'Ghost' };

const MX_HEAD = {
  textAlign: 'left',
  padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
  borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
  whiteSpace: 'nowrap',
};
const MX_DIVIDER = 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)';

/* One Style's matrix: rows = sizes, cols = states. */
const StateMatrixTable = ({ Component, variant, demoProps = {} }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
    <span style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
    }}>Style · {VARIANT_LABEL[variant] || variant}</span>
    <div style={{
      width: '100%',
      overflowX: 'auto',
      border: 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
      borderRadius: 'var(--dim-radius-300, 10px)',
      background: 'var(--surface-content-default, #FFFFFF)',
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
      }}>
        <thead>
          <tr>
            <th style={{ ...MX_HEAD, fontWeight: 'var(--type-weight-bold, 700)', color: 'var(--text-content-primary)' }}>
              {VARIANT_LABEL[variant] || variant}
            </th>
            {MATRIX_STATES.map((s) => (
              <th key={s.key} style={{ ...MX_HEAD, fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MATRIX_SIZES.map((sz, i) => (
            <tr key={sz.key}>
              <td style={{
                padding: 'var(--dim-space-300, 12px)',
                borderTop: i === 0 ? 'none' : MX_DIVIDER,
                color: 'var(--text-content-tertiary, #858C92)',
                whiteSpace: 'nowrap',
                verticalAlign: 'middle',
              }}>{sz.label}</td>
              {MATRIX_STATES.map((s) => (
                <td key={s.key} style={{
                  padding: 'var(--dim-space-300, 12px)',
                  borderTop: i === 0 ? 'none' : MX_DIVIDER,
                  verticalAlign: 'middle',
                }}>
                  <Component variant={variant} size={sz.key} fullWidth={false} {...demoProps} {...s.forced} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ── Do / Don't guidelines panel (mirrors desktop /components) ──────────
   Behavior · Do · Don't columns inside a tinted panel. Sits below the
   state-matrix tables in each component section. */
const Guidelines = ({ behavior = [], dos = [], donts = [] }) => {
  const TITLE = {
    margin: 0,
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-xs, 12px)',
    fontWeight: 'var(--type-weight-bold, 700)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };
  const LIST = {
    margin: 0,
    paddingLeft: 'var(--dim-space-400, 16px)',
    color: 'var(--text-content-secondary, #565D6D)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm, 14px)',
    lineHeight: 1.6,
  };
  const Column = ({ label, items, accent }) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 200px', minWidth: 0, gap: 'var(--dim-space-200, 8px)' }}>
      <h4 style={{ ...TITLE, color: accent || 'var(--text-content-primary)' }}>{label}</h4>
      <ul style={LIST}>{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
      <span style={{
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: 'var(--text-content-primary)',
      }}>Behavior &amp; Guidelines</span>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--dim-space-500, 20px)',
        padding: 'var(--dim-space-400, 16px)',
        background: 'var(--surface-content-secondary, #F5F6F7)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-content-tertiary, #E1E3E5)',
      }}>
        {behavior.length > 0 && <Column label='Behavior' items={behavior} />}
        {dos.length > 0      && <Column label='Do'    items={dos}   accent='var(--text-brandPrimary-default, #007549)' />}
        {donts.length > 0    && <Column label="Don't" items={donts} accent='var(--text-danger-default, #B91C1C)' />}
      </div>
    </div>
  );
};

/* Renders one StateMatrixTable per Style the component ships, then an
   optional Do/Don't guidelines panel. */
const ButtonMatrix = ({ Component, variants = ['fill', 'outline', 'ghost'], demoProps = {}, guide }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-500, 20px)' }}>
    {variants.map((v) => (
      <StateMatrixTable key={v} Component={Component} variant={v} demoProps={demoProps} />
    ))}
    {guide && <Guidelines {...guide} />}
  </div>
);

/* Shared demo content per button family. */
const TEXT_DEMO = { leadingIcon: 'add', trailingIcon: 'arrow_forward', children: 'Button' };
const ICON_DEMO = { icon: 'add' };

/* Do / Don't content per button family (keyed by Section anchor). */
const BUTTON_GUIDE = {
  'brand-button': {
    behavior: ['ปุ่มหลักของหน้า/section — ใช้ 1 ปุ่ม Fill ต่อกลุ่ม action', 'Fill = primary · Outline = secondary · Ghost = tertiary/inline', 'เต็มความกว้าง (fullWidth) เป็นค่าเริ่มต้นบนมือถือ'],
    dos: ['ใช้ Fill กับ action หลัก เช่น "ยืนยันนัดหมาย"', 'ใส่ trailing arrow เมื่อพาไปขั้นถัดไป', 'ใช้ size lg (56) สำหรับ CTA เต็มจอ'],
    donts: ['อย่าวาง Fill หลายปุ่มในกลุ่มเดียว — แย่งความสนใจ', 'อย่าใช้ Ghost เป็น action หลัก', 'อย่าตั้งความสูงเอง — ใช้ token md/lg'],
  },
  'brand-subdue-button': {
    behavior: ['พื้นผิว brand แบบนุ่ม (quaternary) — เน้นน้อยกว่า BrandButton', 'มีเฉพาะ Fill / Outline (ไม่มี Ghost)'],
    dos: ['ใช้กับ action รองที่ยังสื่อ brand เช่น "Telemedicine"', 'จับคู่เป็น secondary ข้าง BrandButton'],
    donts: ['อย่าใช้แทน primary CTA', 'อย่าวางบนพื้นหลัง brand เข้ม — contrast ต่ำ'],
  },
  'danger-button': {
    behavior: ['action ที่ทำลาย/ย้อนกลับไม่ได้ เช่น ลบถาวร ยกเลิกนัด', 'Fill / Outline / Ghost'],
    dos: ['ใช้กับการลบถาวรหรือยกเลิกนัด', 'ควรมี confirm dialog ก่อนทำงานจริง'],
    donts: ['อย่าใช้กับ action ทั่วไปที่ไม่อันตราย', 'อย่าวางชิด BrandButton โดยไม่มีระยะห่าง — กดผิดง่าย'],
  },
  'danger-subdue-button': {
    behavior: ['destructive แบบนุ่ม — Fill / Outline เท่านั้น'],
    dos: ['ใช้กับลบรายการที่กู้คืนได้ เช่น "ลบ draft"'],
    donts: ['อย่าใช้กับการลบถาวร — ใช้ DangerButton เต็มน้ำหนัก'],
  },
  'neutral-button': {
    behavior: ['secondary แบบ greyscale — ไม่ดึงสายตา', 'Fill / Outline / Ghost'],
    dos: ['ใช้กับ "ยกเลิก" "ย้อนกลับ" upload', 'จับคู่เป็นปุ่มรองข้าง primary'],
    donts: ['อย่าใช้เป็น primary CTA', 'อย่าใช้สื่อ action อันตราย — ใช้ Danger'],
  },
  'neutral-subdue-button': {
    behavior: ['neutral แบบนุ่ม — Fill / Outline · นิยมใช้ "ภายหลัง"/"ข้าม"'],
    dos: ['ใช้กับ action ที่ผู้ใช้มักข้าม เช่น "ข้ามไปก่อน"'],
    donts: ['อย่าใช้แทนปุ่มยืนยันหลัก'],
  },
  'brand-icon-button': {
    behavior: ['icon-only สี่เหลี่ยม 44/56 — ต้องมี aria-label เสมอ', 'พื้นที่กดอย่างน้อย 44px ตาม a11y'],
    dos: ['ใช้กับ action ที่ icon สื่อชัด เช่น + เพิ่ม', 'ใส่ aria-label อธิบาย action'],
    donts: ['อย่าใช้ icon กำกวมโดยไม่มี label/tooltip', 'อย่าทำให้เล็กกว่า 44px — กดยากบนมือถือ'],
  },
  'brand-subdue-icon-button': {
    behavior: ['icon-only brand แบบนุ่ม — Fill / Outline'],
    dos: ['ใช้กับ action รองแบบ icon เช่น เพิ่มรายการในการ์ด'],
    donts: ['อย่าใช้แทน primary icon action — ใช้ BrandIconButton'],
  },
  'danger-icon-button': {
    behavior: ['icon-only destructive — Fill / Outline / Ghost'],
    dos: ['ใช้กับลบรายการแบบ icon (เช่น ถังขยะ)', 'มี confirm ก่อนลบถาวร'],
    donts: ['อย่าใช้กับ action ปกติ', 'อย่าละ aria-label'],
  },
  'danger-subdue-icon-button': {
    behavior: ['icon-only destructive แบบนุ่ม — Fill / Outline'],
    dos: ['ใช้ลบรายการที่กู้คืนได้แบบ icon'],
    donts: ['อย่าใช้กับการลบถาวร'],
  },
  'neutral-icon-button': {
    behavior: ['icon-only neutral — Fill / Outline / Ghost · เช่น more_vert'],
    dos: ['ใช้กับเมนู/overflow (จุดสามจุด) หรือ action รอง'],
    donts: ['อย่าใช้สื่อ action อันตราย — ใช้ Danger'],
  },
  'neutral-subdue-icon-button': {
    behavior: ['icon-only neutral แบบนุ่ม — Fill / Outline'],
    dos: ['ใช้กับ action รองที่ต้องการน้ำหนักภาพต่ำ'],
    donts: ['อย่าละ aria-label'],
  },
  'brand-circle-icon-button': {
    behavior: ['วงกลมเต็ม (shape=circle) — มักใช้กับ toggle เช่น favorite', 'Figma เรียก state Active ว่า "Selected"'],
    dos: ['ใช้กับ toggle/like (Selected = ติดดาวแล้ว)', 'ใส่ aria-pressed สื่อสถานะ'],
    donts: ['อย่าใช้กับข้อความยาว — เป็น icon-only', 'อย่าวางเรียงหลายปุ่มจนสับสน'],
  },
  'brand-circle-subdue-icon-button': {
    behavior: ['วงกลม brand แบบนุ่ม — Fill / Outline'],
    dos: ['ใช้กับ toggle รองที่ต้องการน้ำหนักภาพต่ำ'],
    donts: ['อย่าใช้แทน BrandCircleIconButton ในจุดที่ต้องเด่น'],
  },
};

const MobileComponentsPage = () => {
  /* Driven by the design-system.html sidebar via URL params:
       ?component=<slug>  → show only that section (alias-resolved)
       ?embed=1           → hide this page's own top bar (it's in an iframe) */
  const params = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const embedded = params.get('embed') === '1';
  const rawComponent = params.get('component') || '';
  const activeSlug = rawComponent
    ? (SLUG_TO_SECTION[rawComponent] || rawComponent)
    : 'all';
  const showAll = activeSlug === 'all';

  const [text, setText] = useState('');
  const [theme, setTheme] = useState('light');
  const isDark = theme === 'dark';
  return (
    <div
      data-mobile-theme={isDark ? 'dark' : undefined}
      style={{
        minHeight: '100vh',
        width: '100%',
        background: isDark ? '#020617' : 'var(--surface-content-secondary, #F5F6F7)',
        fontFamily: 'var(--type-family-body)',
        color: isDark ? '#F5F6F7' : 'var(--text-content-primary)',
      }}
    >
      {/* Top bar — page identifier, no back button (this is a doc page).
          Hidden when embedded in design-system.html (its chrome already
          shows the title + theme toggle). */}
      {!embedded && (
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--surface-content-default, #FFFFFF)',
        borderBottom: '1px solid var(--border-content-tertiary, #E1E3E5)',
      }}>
        <div style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 'var(--dim-space-400, 16px) var(--dim-space-500, 20px)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dim-space-300, 12px)',
        }}>
          <span style={{
            width: 36, height: 36,
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-brandPrimary-default, #007549)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sym name='phone_iphone' size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
              fontWeight: 'var(--type-weight-regular, 400)',
              fontSize: 'var(--type-size-xl, 20px)',
              color: 'var(--text-content-primary)',
              lineHeight: 1.2,
            }}>Mobile components</h1>
            <p style={{
              margin: 0,
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}>design.md §7 · พรีวิว primitives สำหรับ /m/* app</p>
          </div>
          {/* Theme toggle — flips data-mobile-theme on this preview's
              root only, so the rest of the docs viewer stays in the
              normal app theme. Light values come from :root; dark
              overrides come from [data-mobile-theme="dark"] in
              src/index.css. */}
          <button
            type='button'
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: isDark ? '#1F2A37' : 'var(--surface-content-secondary, #F5F6F7)',
              color: isDark ? '#F5F6F7' : 'var(--text-content-primary)',
              border: '1px solid var(--border-content-tertiary, #E1E3E5)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              cursor: 'pointer',
            }}
            aria-pressed={isDark}
            aria-label='Toggle dark theme'
          >
            <Sym name={isDark ? 'dark_mode' : 'light_mode'} size={16} />
            {isDark ? 'Dark' : 'Light'}
          </button>
          <a
            href='/docs/design-system.html'
            style={{
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontWeight: 'var(--type-weight-bold, 700)',
              textDecoration: 'none',
            }}
          >↗ Design System</a>
        </div>
      </div>
      )}

      {/* Content column — filtered by the ?component slug. The
          design-system.html sidebar is the navigation, so there is no
          in-page sidemenu (it would duplicate the outer one).
          • "All" view: capped at 720 (components authored for 390-wide).
          • Single-component view: full width so the 6-column state-matrix
            table (Style + 5 states) has room and isn't clipped. */}
      <ActiveSectionContext.Provider value={activeSlug}>
      <div style={{
        maxWidth: showAll ? 720 : 'none',
        margin: '0 auto',
        padding: 'var(--dim-space-600, 24px) var(--dim-space-500, 20px) var(--dim-space-800, 40px)',
      }}>
        {showAll && (
        /* Token snapshot */
        <MobileCard
          padding='var(--dim-space-400, 16px)'
          style={{
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            borderColor: 'var(--border-brandPrimary-default, #007549)',
            marginBottom: 'var(--dim-space-600, 24px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--dim-space-300, 12px)' }}>
            <Sym name='palette' size={20} color='var(--text-brandPrimary-default, #007549)' />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}>
                Mobile platform tokens (--mobile-*)
              </p>
              <p style={{
                margin: '4px 0 0',
                fontSize: 'var(--type-size-xs, 12px)',
                color: 'var(--text-brandPrimary-default, #007549)',
                lineHeight: 1.5,
              }}>
                button radius <strong>pill</strong> · md 44 / lg 56 · input 48 / 16px font (กัน iOS auto-zoom) · card r-500 · badge pill
              </p>
            </div>
          </div>
        </MobileCard>
        )}

        {showAll && (
        <Section
          title='State matrix · convention'
          anchor='state-matrix'
          subtitle='ทุก button component ด้านล่างมีตาราง state เหมือน Desktop: คอลัมน์ = State (Default · Hover · Active · Focus · Disabled, อ้างอิงจาก Figma), แถว = Size (Large 56 / Medium 44). กด toggle ด้านบนเพื่อสลับ light/dark.'
        >
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)', lineHeight: 1.6 }}>
            มือถือใช้ 2 ขนาด (md 44 / lg 56) — Small (36) เป็น desktop-only ตาม design.md §7.3. แต่ละ Style (Fill / Outline / Ghost) แยกเป็นตารางของตัวเอง.
          </p>
        </Section>
        )}

        <Section
          title='BrandButton'
          anchor='brand-button'
          subtitle='Figma 231:29 · Style: Fill | Outline | Ghost · State: Default / Hover / Active / Focus / Disabled · Size: Large (56) | Medium (44)'
        >
          <ButtonMatrix Component={BrandButton} variants={['fill', 'outline', 'ghost']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['brand-button']} />
        </Section>

        <Section
          title='BrandSubdueButton'
          anchor='brand-subdue-button'
          subtitle='Figma 2024:3589 · Style: Fill | Outline · softer brand surface (quaternary bg)'
        >
          <ButtonMatrix Component={BrandSubdueButton} variants={['fill', 'outline']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['brand-subdue-button']} />
        </Section>

        <Section
          title='DangerButton'
          anchor='danger-button'
          subtitle='Figma 2024:3590 · Style: Fill | Outline | Ghost · destructive / irreversible actions'
        >
          <ButtonMatrix Component={DangerButton} variants={['fill', 'outline', 'ghost']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['danger-button']} />
        </Section>

        <Section
          title='DangerSubdueButton'
          anchor='danger-subdue-button'
          subtitle='Figma 2024:3592 · Style: Fill | Outline · softer destructive surface'
        >
          <ButtonMatrix Component={DangerSubdueButton} variants={['fill', 'outline']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['danger-subdue-button']} />
        </Section>

        <Section
          title='NeutralButton'
          anchor='neutral-button'
          subtitle='Figma 2024:3591 · Style: Fill | Outline | Ghost · greyscale secondary surface'
        >
          <ButtonMatrix Component={NeutralButton} variants={['fill', 'outline', 'ghost']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['neutral-button']} />
        </Section>

        <Section
          title='NeutralSubdueButton'
          anchor='neutral-subdue-button'
          subtitle='Figma 2024:2940 · Style: Fill | Outline · softer neutral surface (skip / later)'
        >
          <ButtonMatrix Component={NeutralSubdueButton} variants={['fill', 'outline']} demoProps={TEXT_DEMO} guide={BUTTON_GUIDE['neutral-subdue-button']} />
        </Section>

        <Section
          title='BrandIconButton'
          anchor='brand-icon-button'
          subtitle='Figma 377:11596 · Style: Fill | Outline | Ghost · square icon-only 44 / 56'
        >
          <ButtonMatrix Component={BrandIconButton} variants={['fill', 'outline', 'ghost']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['brand-icon-button']} />
        </Section>

        <Section
          title='BrandSubdueIconButton'
          anchor='brand-subdue-icon-button'
          subtitle='Figma 2024:4352 · Style: Fill | Outline · subdued square icon-only'
        >
          <ButtonMatrix Component={BrandSubdueIconButton} variants={['fill', 'outline']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['brand-subdue-icon-button']} />
        </Section>

        <Section
          title='DangerIconButton'
          anchor='danger-icon-button'
          subtitle='Figma 2024:3701 · Style: Fill | Outline | Ghost · destructive square icon-only'
        >
          <ButtonMatrix Component={DangerIconButton} variants={['fill', 'outline', 'ghost']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['danger-icon-button']} />
        </Section>

        <Section
          title='DangerSubdueIconButton'
          anchor='danger-subdue-icon-button'
          subtitle='Figma 2024:4434 · Style: Fill | Outline · subdued destructive square icon-only'
        >
          <ButtonMatrix Component={DangerSubdueIconButton} variants={['fill', 'outline']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['danger-subdue-icon-button']} />
        </Section>

        <Section
          title='NeutralIconButton'
          anchor='neutral-icon-button'
          subtitle='Figma 2024:4189 · Style: Fill | Outline | Ghost · neutral square icon-only'
        >
          <ButtonMatrix Component={NeutralIconButton} variants={['fill', 'outline', 'ghost']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['neutral-icon-button']} />
        </Section>

        <Section
          title='NeutralSubdueIconButton'
          anchor='neutral-subdue-icon-button'
          subtitle='Figma 2024:4516 · Style: Fill | Outline · subdued neutral square icon-only'
        >
          <ButtonMatrix Component={NeutralSubdueIconButton} variants={['fill', 'outline']} demoProps={ICON_DEMO} guide={BUTTON_GUIDE['neutral-subdue-icon-button']} />
        </Section>

        <Section
          title='BrandCircleIconButton'
          anchor='brand-circle-icon-button'
          subtitle='Figma 2103:548 · Style: Fill | Outline | Ghost · State active labeled "Selected" in Figma · shape=circle'
        >
          <ButtonMatrix Component={BrandCircleIconButton} variants={['fill', 'outline', 'ghost']} demoProps={{ icon: 'favorite' }} guide={BUTTON_GUIDE['brand-circle-icon-button']} />
        </Section>

        <Section
          title='BrandCircleSubdueIconButton'
          anchor='brand-circle-subdue-icon-button'
          subtitle='Figma 2103:645 · Style: Fill | Outline · subdued circular icon-only'
        >
          <ButtonMatrix Component={BrandCircleSubdueIconButton} variants={['fill', 'outline']} demoProps={{ icon: 'favorite' }} guide={BUTTON_GUIDE['brand-circle-subdue-icon-button']} />
        </Section>

        <Section
          title='BrandSubdueFloatButton (FAB)'
          anchor='float-button'
          subtitle='Figma 2293:11088 · floating action — quaternary bg + drop shadow'
        >
          <div style={{
            position: 'relative',
            height: 120,
            background: 'var(--surface-content-secondary, #F5F6F7)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: '1px dashed var(--border-content-tertiary, #E1E3E5)',
            padding: 16,
          }}>
            <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              วาง position fixed/absolute มุมขวาล่างของหน้า
            </p>
            <div style={{ position: 'absolute', bottom: 12, right: 12 }}>
              <BrandSubdueFloatButton icon='edit' />
            </div>
          </div>
        </Section>

        <Section
          title='HistoryListFormButton'
          anchor='history-list-form-button'
          subtitle='Figma 3360:2711 · wide pill row inside history forms · neutral surface'
        >
          <HistoryListFormButton leadingIcon='add'>เพิ่มรายการประวัติ</HistoryListFormButton>
          <HistoryListFormButton leadingIcon='note_add'>เพิ่มหมายเหตุ</HistoryListFormButton>
          <HistoryListFormButton leadingIcon='add' disabled>Disabled</HistoryListFormButton>
        </Section>

        <Section
          title='Card'
          anchor='mobile-card'
          subtitle='radius-500 · padding / onClick / elevated opt-in'
        >
          <MobileCard>
            <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>Default card</p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)' }}>padding 16, radius 16, no shadow</p>
          </MobileCard>
          <MobileCard elevated>
            <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>Elevated card</p>
            <p style={{ margin: '4px 0 0', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)' }}>shadow-brand-drop-bottom-200</p>
          </MobileCard>
          <MobileCard onClick={() => alert('tapped')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)' }}>
              <Sym name='touch_app' size={24} color='var(--text-brandPrimary-default, #007549)' />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>Tappable card (onClick)</p>
                <p style={{ margin: '2px 0 0', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>role="button" · Enter / Space activate</p>
              </div>
              <Sym name='chevron_right' size={20} color='var(--text-content-tertiary, #858C92)' />
            </div>
          </MobileCard>
        </Section>

        <Section
          title='Input + Field'
          anchor='mobile-input'
          subtitle='16px base font (กัน iOS auto-zoom) · 48h · label / required / hint / error'
        >
          <MobileField label='ชื่อ-นามสกุล' hint='ใส่ชื่อจริงตามบัตรประชาชน'>
            <MobileInput placeholder='เช่น สมชาย ใจดี' value={text} onChange={(e) => setText(e.target.value)} />
          </MobileField>
          <MobileField label='เลขประจำตัวประชาชน' required>
            <MobileInput placeholder='13 หลัก' inputMode='numeric' maxLength={13} />
          </MobileField>
          <MobileField label='รหัสผ่าน' error='รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'>
            <MobileInput type='password' placeholder='อย่างน้อย 8 ตัวอักษร' value='abc' readOnly />
          </MobileField>
        </Section>

        <Section
          title='Badge'
          anchor='mobile-badge'
          subtitle='5 tones · always pill · กำกับ status / chips'
        >
          <Row>
            <MobileBadge>neutral</MobileBadge>
            <MobileBadge tone='brand'>brand</MobileBadge>
            <MobileBadge tone='success'>success</MobileBadge>
            <MobileBadge tone='warning'>warning</MobileBadge>
            <MobileBadge tone='info'>info</MobileBadge>
          </Row>
          <Row>
            <MobileBadge tone='brand'>2.4 กม.</MobileBadge>
            <MobileBadge tone='success'>ยืนยันแล้ว</MobileBadge>
            <MobileBadge tone='warning'>ยกเลิก</MobileBadge>
            <MobileBadge tone='info'>ใหม่</MobileBadge>
          </Row>
        </Section>

        <Section
          title='SectionLabel'
          anchor='mobile-section-label'
          subtitle='bold sm + optional right-aligned action'
        >
          <MobileCard>
            <MobileSectionLabel action={
              <button type='button' style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-brandPrimary-default, #007549)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-bold, 700)',
              }}>ดูทั้งหมด</button>
            }>
              นัดหมายของฉัน
            </MobileSectionLabel>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #565D6D)' }}>
              วางเหนือ block เนื้อหา — ขนาด sm หนา 700 พร้อม action ขวา
            </p>
          </MobileCard>
        </Section>

        <Section
          title='Sym (Material Symbols)'
          anchor='sym'
          subtitle='outline default · fill=true สำหรับ active state'
        >
          <MobileCard>
            <Row>
              {['home', 'event_available', 'description', 'account_circle', 'apps', 'videocam', 'medication', 'payments'].map((n) => (
                <div key={n} style={{
                  width: 76,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '8px 0',
                }}>
                  <Sym name={n} size={28} color='var(--text-content-primary)' />
                  <span style={{
                    fontSize: 10,
                    color: 'var(--text-content-tertiary, #858C92)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>{n}</span>
                </div>
              ))}
            </Row>
            <div style={{
              marginTop: 'var(--dim-space-300, 12px)',
              display: 'flex',
              gap: 'var(--dim-space-300, 12px)',
              alignItems: 'center',
            }}>
              <Sym name='favorite' size={24} fill={false} color='var(--text-brandPrimary-default, #007549)' />
              <Sym name='favorite' size={24} fill={true} color='var(--text-brandPrimary-default, #007549)' />
              <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                outline → fill (active)
              </span>
            </div>
          </MobileCard>
        </Section>

        <Section
          title='Header'
          anchor='mobile-header'
          subtitle='56h app-bar pattern — solid + transparent variants'
        >
          <div style={{
            borderRadius: 'var(--dim-radius-500, 16px)',
            overflow: 'hidden',
            border: '1px solid var(--border-content-tertiary, #E1E3E5)',
          }}>
            <MobileHeader
              title='ตัวอย่างหัวข้อ'
              subtitle='หัวข้อย่อย'
              hideBack
              right={<Sym name='notifications' size={24} />}
            />
          </div>
          <div style={{
            borderRadius: 'var(--dim-radius-500, 16px)',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0A8268 0%, #4CC6AE 100%)',
            padding: '40px 0 0',
          }}>
            <MobileHeader
              title='Transparent variant'
              subtitle='ใช้บน hero gradient'
              transparent
              hideBack
            />
            <div style={{ height: 60 }} />
          </div>
        </Section>

        <Section
          title='Shell (PhoneFrame)'
          anchor='mobile-shell'
          subtitle='390×844 phone mock — ใช้เฉพาะตอน demo app flow ไม่ใช่ docs'
        >
          <MobileCard>
            <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)' }}>
              ดู Shell ในการใช้งานจริง
            </p>
            <p style={{
              margin: '4px 0 12px',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-content-secondary, #565D6D)',
              lineHeight: 1.5,
            }}>
              MobileShell ห่อทุก /m/* page ด้วยกรอบโทรศัพท์ + status bar + bottom nav — ดูตัวอย่างที่หน้า home หรือ login
            </p>
            <Row>
              <a
                href='/m/home'
                target='_blank'
                rel='noopener'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'var(--surface-brandPrimary-default, #007549)',
                  color: '#FFFFFF',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  textDecoration: 'none',
                }}
              >
                <Sym name='open_in_new' size={16} />
                /m/home
              </a>
              <a
                href='/m/login'
                target='_blank'
                rel='noopener'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                  color: 'var(--text-brandPrimary-default, #007549)',
                  border: '1.5px solid var(--border-brandPrimary-default, #007549)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  textDecoration: 'none',
                }}
              >
                <Sym name='open_in_new' size={16} />
                /m/login
              </a>
            </Row>
          </MobileCard>
        </Section>

        {showAll && (
        <div style={{
          textAlign: 'center',
          padding: 'var(--dim-space-500, 20px) 0 0',
          borderTop: '1px solid var(--border-content-tertiary, #E1E3E5)',
        }}>
          <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            อ่านเพิ่ม → <a href='/design.md' target='_blank' rel='noopener' style={{ color: 'var(--text-brandPrimary-default, #007549)', fontWeight: 'var(--type-weight-bold, 700)' }}>design.md §7</a>
          </p>
        </div>
        )}
        </div>{/* /content */}
      </ActiveSectionContext.Provider>
    </div>
  );
};

export default MobileComponentsPage;
