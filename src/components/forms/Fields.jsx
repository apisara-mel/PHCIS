import React from 'react';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';

/* MIH MR form primitives — Section / SubCard / Field grid + a couple of
   composite controls. The actual input/textarea visuals live in:

     • src/components/forms/InputField.jsx  (Figma 267:50)
     • src/components/forms/Textarea.jsx    (Figma 268:26)

   This file only re-exports `TextArea` as an alias for back-compat and
   houses Field layout helpers. Import `InputField` directly — there is no
   `TextInput` alias anymore. Tokens follow design.md form-input + content
   palettes, so brand switching retints atomically.                       */

const Sym = ({ name, size = 16, color }) => (
  <span
    className='material-symbols-outlined'
    style={{ fontFamily: 'Material Symbols Outlined', fontSize: size, color, lineHeight: 1, display: 'inline-flex' }}
    aria-hidden
  >
    {name}
  </span>
);

/* Figma SVG assets tinted via icon/topic/default (mask + background). */
export const TokenSvgIcon = ({
  src,
  size = 18,
  color = 'var(--icon-topic-default)',
}) => (
  <span
    aria-hidden
    style={{
      display: 'block',
      flexShrink: 0,
      width: size,
      height: size,
      backgroundColor: color,
      WebkitMaskImage: `url(${src})`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      WebkitMaskPosition: 'center',
      maskImage: `url(${src})`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
    }}
  />
);

/* Figma Topic row icons (PHCIS-Registration 134:25593) — 18×18 SVG assets. */
export const SectionTitleIcon = ({ src, size = 18 }) => (
  <TokenSvgIcon src={src} size={size} />
);

/* Section header — leading icon + bold title.
   Used at the top of every form group ("ข้อมูลส่วนตัว", "ที่อยู่", etc).
   Pass `iconElement` for Figma SVG assets (18px); `icon` for Material Symbols (18px). */
export const SectionTitle = ({ icon, iconElement, children }) => (
  <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
    {iconElement ?? (icon && <Sym name={icon} size={18} color='var(--text-brandPrimary-default)' />)}
    <span style={{
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-heading-content)',
      fontWeight: 'var(--type-weight-bold)',
      fontSize: 'var(--type-size-base)',
      lineHeight: 1.5,
    }}>
      {children}
    </span>
  </div>
);

/* Sub-card container — bordered region inside a section (e.g. one address
   block, one insurance entry). Wraps fields with consistent padding +
   optional title row + optional trailing pill (เช่น "ประกันสังคม").
   `surfaceTone="neutral"` — PHCIS Registration address / emergency SubCards
   (Figma 133:9181): `--surface-neutral-quaternary` + neutral quaternary border.
   `surfaceTone="brandQuaternary"` — Step 5 drug-allergy group input
   (Figma 134:27582 → group input 2498:6269): `--surface-brandPrimary-quaternary`
   + `--border-brandPrimary-quaternary`, 16 px pad, 12 px gap. */
export const SubCard = ({
  title,
  pillLabel,
  onDelete,
  children,
  footer,
  surfaceTone = 'card',
}) => {
  const isNeutral = surfaceTone === 'neutral';
  const isBrandQuaternary = surfaceTone === 'brandQuaternary';
  const isTopicTitle = isNeutral || isBrandQuaternary;
  return (
  <div
    className='flex flex-col w-full'
    style={{
      gap: isBrandQuaternary
        ? 'var(--dim-space-300)'
        : isNeutral
          ? 'var(--dim-space-400)'
          : 'var(--dim-space-300)',
      padding: isBrandQuaternary ? 'var(--dim-space-400)' : 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-400)',
      background: isBrandQuaternary
        ? 'var(--surface-brandPrimary-quaternary)'
        : isNeutral
          ? 'var(--surface-neutral-quaternary)'
          : 'var(--surface-card-100)',
      border: isBrandQuaternary
        ? 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)'
        : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
    }}
  >
    {(title || onDelete) && (
      <div className='flex items-center w-full'>
        <span style={{
          color: isTopicTitle
            ? 'var(--text-topic-tertiary-title)'
            : 'var(--text-content-default)',
          fontFamily: isTopicTitle
            ? 'var(--type-family-heading-content, var(--type-family-body))'
            : 'var(--type-family-body)',
          fontWeight: isTopicTitle
            ? 'var(--type-weight-bold, 700)'
            : 'var(--type-weight-medium)',
          fontSize: isBrandQuaternary
            ? 'var(--type-size-sm)'
            : isNeutral
              ? 'var(--type-size-base)'
              : 'var(--type-size-sm)',
        }}>
          {title}
        </span>
        {pillLabel && (
          <span
            className='inline-flex items-center'
            style={{
              marginLeft: 'var(--dim-space-200)',
              height: 22,
              paddingLeft: 'var(--dim-space-200)', paddingRight: 'var(--dim-space-200)',
              borderRadius: 'var(--dim-radius-full)',
              background: 'var(--surface-brandPrimary-tertiary)',
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
            }}
          >
            {pillLabel}
          </span>
        )}
        <div className='flex-1' />
        {onDelete && (
          <BrandSubdueIconButton
            type='button'
            variant='outline'
            size='md'
            icon='delete'
            onClick={onDelete}
            aria-label='ลบ'
          />
        )}
      </div>
    )}
    {children}
    {footer}
  </div>
  );
};

/* Grid wrapper — 4 columns on wide screens, 2 on medium, 1 on narrow.
   Most form rows in Figma use 4-column layouts (รหัสไปรษณีย์ / จังหวัด /
   เขต/อำเภอ / แขวง/ตำบล) so this is the default. */
export const FieldGrid = ({
  cols = 4,
  rowGap = 'var(--dim-space-300)',
  columnGap = 'var(--dim-space-300)',
  children,
}) => (
  <div
    className='w-full'
    style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      rowGap,
      columnGap,
    }}
  >
    {children}
  </div>
);

/* Field wrapper — label (with optional red asterisk) above a control.
   Label color/weight aliases Figma "Field name" on the Default Select
   (node 155:20747) and matches the broader input-label semantic token
   (`--text-input-label` = #4D5358, neutral/700) used by every form
   control in the design system. The asterisk uses the require/600 red
   alias with a 2px (--dim-space-050) gap per the same Figma Field name
   row. */
export const Field = ({ label, required, span = 1, children, hint }) => (
  <div
    className='flex flex-col min-w-0'
    style={{ gap: 'var(--dim-space-150)', gridColumn: `span ${span} / span ${span}` }}
  >
    {label && (
      <label style={{
        color: 'var(--text-input-label)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        fontWeight: 'var(--type-weight-medium)',
        lineHeight: 1.5,
      }}>
        {label}
        {required && (
          /* design.md row 1205 · text.input.require → --text-input-require
             (red/600). Single source — same alias as VitalCard / SymptomStep.
             2px gap matches Figma `dimension/space/050` between label and *. */
          <span style={{ color: 'var(--text-input-require)', marginLeft: 'var(--dim-space-050)' }} aria-hidden>*</span>
        )}
      </label>
    )}
    {children}
    {hint && (
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}>
        {hint}
      </span>
    )}
  </div>
);

/* `TextInput`, `SelectInput`, `TextArea`, and `Checkbox` have been removed.
   • For text inputs  use `<InputField .../>` from '@/components/forms/InputField'.
   • For selects      use `<Select .../>`     from '@/components/forms/Select'.
   • For text areas   use `<Textarea .../>`   from '@/components/forms/Textarea'.
   • For checkboxes   use `<Checkbox .../>`   from '@/components/checkbox/Checkbox'.
   The leading icon is the variant — toggled via `leadingIcon` + `showLeadingIcon'. */

/* Add-row pill button — used at the bottom of repeater sections
   ("+ เพิ่มผู้ติดต่อฉุกเฉิน", "+ เพิ่ม", "+ เพิ่มสิทธิการรักษา"). */
export const AddRowButton = ({ children, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='inline-flex items-center justify-center'
    style={{
      gap: 'var(--dim-space-200)',
      height: 36,
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) dashed var(--border-brandPrimary-tertiary)',
      color: 'var(--text-brandPrimary-default)',
      fontFamily: 'var(--type-family-ui, var(--type-family-body))',
      fontSize: 'var(--type-size-sm)',
      fontWeight: 'var(--type-weight-medium)',
      cursor: 'pointer',
    }}
  >
    <Sym name='add' size={16} color='currentColor' />
    {children}
  </button>
);

export { Sym };
