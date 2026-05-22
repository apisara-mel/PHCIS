import React, { useState } from 'react';

/* MIH FormBuilder Content — Figma "Content" (node 2210:7837). Small
   palette card used inside form builders to insert a read-only content
   block (e.g. heading, paragraph). Two states: default / hover.

   Layout: 36×36 brand-tinted icon box + title + subtitle + dashed border.
   Defaults to "ข้อความ / สำหรับอ่านอย่างเดียว" + 'text_fields' icon, but
   `label`, `sublabel` and `icon` accept overrides so callers can use the
   same chip for any palette entry (image / divider / spacer …).

   onClick fires when the chip is activated. Defaults are draggable so
   palette items can be dropped onto a canvas — caller may set
   `draggable={false}` to disable.                                       */

const Sym = ({ name, size = 20, color }) => (
  <span
    className='material-symbols-outlined shrink-0'
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

const Content = React.forwardRef(function Content(
  {
    icon = 'text_fields',
    label = 'ข้อความ',
    sublabel = 'สำหรับอ่านอย่างเดียว',
    onClick,
    onDragStart,
    draggable = true,
    width = 204,
    state,                                /* force 'default' | 'hover' for demos */
    className = '',
    style = {},
    ...rest
  },
  ref,
) {
  const [internalHover, setInternalHover] = useState(false);
  const hover = state ? state === 'hover' : internalHover;
  const setHover = state ? () => {} : setInternalHover;

  return (
    <div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`inline-flex items-center transition ${className}`}
      style={{
        width,
        gap: 'var(--dim-space-200)',
        padding: 'var(--dim-space-300)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-150) dashed ${
          hover ? 'var(--border-formbuilder-hover)' : 'var(--border-formbuilder-default)'
        }`,
        background: hover
          ? 'var(--surface-formbuilder-hover)'
          : 'var(--surface-formbuilder-default)',
        boxShadow: hover ? 'var(--shadow-formbuilder)' : 'none',
        cursor: onClick ? 'pointer' : (draggable ? 'grab' : 'default'),
        boxSizing: 'border-box',
        transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
        ...style,
      }}
      {...rest}
    >
      {/* Icon box (36×36, brand-tinted) */}
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--dim-radius-200)',
          background: hover
            ? 'var(--icon-formbuilder-iconbox-hover)'
            : 'var(--icon-formbuilder-iconbox-default)',
          color: 'var(--text-formbuilder-text)',
        }}
      >
        <Sym name={icon} size={20} color='currentColor' />
      </span>

      {/* Text column */}
      <span className='flex flex-col items-start min-w-0 flex-1'>
        <span
          className='w-full truncate'
          style={{
            color: 'var(--text-formbuilder-text)',
            fontFamily: 'var(--type-family-heading-content)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1.5,
          }}
        >
          {label}
        </span>
        {sublabel != null && (
          <span
            className='w-full truncate'
            style={{
              color: 'var(--text-formbuilder-subtext)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
            }}
          >
            {sublabel}
          </span>
        )}
      </span>
    </div>
  );
});

export default Content;
