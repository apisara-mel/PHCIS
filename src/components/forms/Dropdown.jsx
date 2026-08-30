import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/icons/Icon';
import Switch from '@/components/switch/Switch';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/**
 * MIH Dropdown — design.md §6.4 (input field) for the trigger and
 * §6.14 (dropdown panel + list items) for the popover. Per Figma node
 * 268:36 the hover state shows a 2px primary/600 border + 4px
 * primaryBorder/600 (15%) glow ring.
 *
 * Hover/open/filled/error visuals are driven by React state with inline
 * styles (Tailwind v2 JIT hover modifiers with arbitrary values are
 * unreliable here, especially for compound styles like box-shadow).
 *
 * Tokens (project-prefixed, brand-aware):
 *   --surface-input-default      bg
 *   --border-input-default       1px idle / filled border
 *   --border-input-hover         2px hover border  → primary/600 #08A768
 *   --border-input-typing        2px open/focus border → primary/600
 *   --border-input-error         2px error border  → red/600
 *   --primaryBorder-600          4px focus-ring (primary/600 @15%)
 *   --text-input-default/hover   placeholder colour (n400)
 *   --text-input-filled          selected-value colour (n700)
 *   --icon-input-default/filled  chevron + leading-icon
 *   --dim-space-200/300/400, --dim-radius-200, --dim-stroke-100/200
 *   --type-family-body, --type-size-sm, --type-weight-regular
 *
 * Props:
 *   value      — current selected value (controlled)
 *   onChange   — (next) => void
 *   options    — [{ value, label, icon? }]
 *   placeholder
 *   size       — 'lg' (40px) | 'md' (36px)
 *   state      — when set, locks visual to one of:
 *                'default' | 'hover' | 'open' | 'filled' | 'error' | 'disabled'
 */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/* ความสูง/ระยะขอบ/ขนาดตัวอักษร ต้องดึงจากโทเคนชุดเดียวกับ InputBox (_inputBox.jsx
   SIZES) ไม่ใช่ตัวเลขดิบ — ของเดิม md เขียนความสูงเป็น 36 ตรง ๆ และใช้ระยะขอบ
   `--dim-space-200` ต่างจากอินพุตที่ใช้ `--dim-space-300` ดรอปดาวน์กับช่องกรอกที่
   วางอยู่แถวเดียวกันจึงดูไม่เท่ากัน (มติผู้ใช้ 31 ส.ค. 69)
     md → --dim-size-700 (36) · space-300 · type-size-sm
     lg → --dim-size-800 (40) · space-400 · type-size-base  */
const SIZE = {
  md: { h: 'var(--dim-size-700, 36px)', px: 'var(--dim-space-300)', gap: 'var(--dim-space-150)', icon: 16, font: 'var(--type-size-sm)' },
  lg: { h: 'var(--dim-size-800, 40px)', px: 'var(--dim-space-400)', gap: 'var(--dim-space-200)', icon: 20, font: 'var(--type-size-base)' },
};

const Dropdown = ({
  value,
  onChange,
  options = [],
  placeholder = 'เลือก',
  size = 'md',
  state = 'default',
  className = '',
  triggerClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [hoveredValue, setHoveredValue] = useState(null);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  // Close on outside-click + Escape
  /* เมนูถูก render ผ่าน portal ไปไว้ที่ <body> จึงไม่ได้เป็นลูกของ `ref` — ตัวเช็ก
     "คลิกนอกกล่อง" เดิมจึงนับการกดบนตัวเลือกว่าเป็นการคลิกข้างนอก แล้วสั่งปิดเมนู
     ตั้งแต่ `mousedown` ปุ่มตัวเลือกถูกถอดออกจาก DOM ก่อน `click` จะยิง ผลคือกด
     เลือกไม่ติดสักที (พบ 31 ส.ค. 69) ต้องเช็กกล่องเมนูด้วยอีกตัว */
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      const t = e.target;
      if (ref.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Position the popover under the trigger; track scroll/resize.
  useEffect(() => {
    if (!open || !triggerRef.current) return undefined;
    const update = () => {
      const r = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const hasValue = !!selected;

  // Resolve effective state — explicit `state` prop takes precedence,
  // then transient interaction states (open / hover), finally filled/idle.
  const isDisabled = state === 'disabled';
  const isError    = state === 'error';
  const forced     = ['hover', 'open', 'filled'].includes(state) ? state : null;
  const isOpen     = forced === 'open'   || (!forced && open);
  const isHover    = forced === 'hover'  || (!forced && hovered && !isDisabled && !isError && !isOpen);
  const isFilled   = forced === 'filled' || (!forced && hasValue && !isOpen && !isHover);

  const dim = SIZE[size] || SIZE.md;

  /* Border + ring per Figma node 268:36 hover spec.
     - hover/open/error: 2px coloured border + 4px primaryBorder/600 ring
     - filled/default: 1px neutral border, no ring */
  const borderColor = (() => {
    if (isError)  return 'var(--border-input-error)';
    if (isOpen)   return 'var(--border-input-typing)';
    if (isHover)  return 'var(--border-input-hover)';
    if (isFilled) return 'var(--border-input-filled)';
    return 'var(--border-input-default)';
  })();
  const borderWidth = (isError || isOpen || isHover) ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)';
  const ring = (isOpen || isHover) ? '0 0 0 4px var(--focus-ring-input-hover, var(--primaryBorder-600))' : 'none';

  /* `isFilled` เป็นเท็จระหว่าง hover/open (มันเป็นสถานะ "นิ่ง") — ถ้าไล่ตาม
     ลำดับนั้นตรง ๆ ข้อความของค่าที่เลือกไว้จะจางลงเป็นสี default ตอนเอาเมาส์ไปชี้
     เช็ค `hasValue` ก่อน สีของค่าที่เลือกจึงคงที่ทุกสถานะ (มติผู้ใช้ 27 ส.ค. 69) */
  const textColor = (() => {
    if (isDisabled) return 'var(--text-input-disabled)';
    if (hasValue)   return isOpen
      ? 'var(--text-input-typing, var(--text-input-filled))'
      : 'var(--text-input-filled)';
    if (isOpen)     return 'var(--text-input-typing, var(--text-input-filled))';
    if (isHover)    return 'var(--text-input-hover, var(--text-input-default))';
    return 'var(--text-input-default)';
  })();

  const iconColor = (() => {
    if (isDisabled || isError) return 'var(--icon-input-default)';
    if (isOpen || isFilled || hasValue) return 'var(--icon-input-filled)';
    if (isHover)               return 'var(--icon-input-hover, var(--icon-input-default))';
    return 'var(--icon-input-default)';
  })();

  const bg = isDisabled ? 'var(--surface-input-disabled)' : 'var(--surface-input-default)';

  return (
    <div
      ref={ref}
      className={`relative ${isOpen ? 'z-[var(--sm-z-dropdown,1100)]' : 'z-auto'} ${className}`}
    >
      <button
        ref={triggerRef}
        type='button'
        onClick={() => !isDisabled && !forced && setOpen((v) => !v)}
        onMouseEnter={() => !isDisabled && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={isDisabled}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        className={`w-full inline-flex items-center outline-none ${triggerClassName}`}
        style={{
          height: dim.h,
          gap: dim.gap,
          paddingLeft: dim.px,
          paddingRight: dim.px,
          borderRadius: 'var(--dim-radius-200, 8px)',
          borderStyle: 'solid',
          borderWidth,
          borderColor,
          background: bg,
          boxShadow: ring,
          color: textColor,
          fontFamily: 'var(--type-family-body)',
          fontSize: dim.font,
          fontWeight: 'var(--type-weight-regular, 400)',
          lineHeight: 1.5,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          /* Smooth visual transitions matching the rest of MIH inputs. */
          transition: [
            `border-color 160ms ${EASE}`,
            `border-width 160ms ${EASE}`,
            `box-shadow 200ms ${EASE}`,
            `background-color 160ms ${EASE}`,
          ].join(', '),
        }}
      >
        {selected?.icon && (
          <span className='shrink-0' style={{ color: iconColor }}>
            <Icon name={selected.icon} size={dim.icon} />
          </span>
        )}
        <span className='flex-1 text-left truncate'>
          {selected ? selected.label : placeholder}
        </span>
        <span
          className='shrink-0'
          style={{
            color: iconColor,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: `transform 160ms ${EASE}`,
            display: 'inline-flex',
          }}
        >
          <Icon name='chevron-down' size={16} />
        </span>
      </button>

      {isOpen && !isDisabled && !forced && menuPos && createPortal(
        <div
          ref={menuRef}
          role='listbox'
          /* `mih-dropdown-popover` = ป้ายให้ Popup รู้ว่าคลิกนี้เป็นของคอนโทรลที่อยู่
             ในตัวมันเอง แม้ DOM จะอยู่นอก dialog เพราะเมนูวาดผ่าน portal — ไม่งั้น
             เลือกตัวเลือกแล้วป๊อปอัปทั้งใบปิดตาม (พบ 31 ส.ค. 69) ชุดเดียวกับ
             mih-select-popover / mih-datepicker-popover ที่ Popup ยกเว้นไว้อยู่แล้ว */
          className='fixed mih-dropdown-popover'
          style={{
            top: menuPos.top,
            left: menuPos.left,
            width: menuPos.width,
            /* ชั้นเดียวกับ Select / DatePicker / TimePicker / FilterTag —
               `--sm-z-popover` (1199) อยู่ต่ำกว่าชั้นของ Popup (--sm-z-modal 1400)
               ดรอปดาวน์ที่อยู่ในป๊อปอัปจึงกดแล้วเมนูไปโผล่ใต้ป๊อปอัป มองไม่เห็น
               (พบในป๊อปอัปเพิ่มตู้บริการ 31 ส.ค. 69) เมนูเรนเดอร์เฉพาะตอนเปิด และ
               ดรอปดาวน์ที่อยู่หลังป๊อปอัปกดไม่ได้อยู่แล้ว การยกชั้นจึงไม่ไปบังอะไร */
            zIndex: 'var(--sm-z-modal-popover, 1450)',
            padding: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            background: 'var(--surface-dropdown-default, #FFFFFF)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
        >
          <ul className='flex flex-col gap-0.5 max-h-60 overflow-y-auto scrollbar-thin'>
            {options.length === 0 && (
              <li
                className='opacity-60'
                style={{
                  padding: 'var(--dim-space-200) var(--dim-space-300)',
                  color: 'var(--text-list-default)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                ไม่มีตัวเลือก
              </li>
            )}
            {options.map((o) => {
              const isSelected = value === o.value;
              const isItemHovered = hoveredValue === o.value;
              const itemBg = isSelected
                ? (isItemHovered
                  ? 'var(--surface-list-selected-hover)'
                  : 'var(--surface-list-selected, var(--surface-list-default))')
                : (isItemHovered
                  ? 'var(--surface-list-hover)'
                  : 'var(--surface-list-default)');
              const itemText = isSelected
                ? (isItemHovered
                  ? 'var(--text-list-selected-hover, var(--text-list-hover))'
                  : 'var(--text-list-selected, var(--text-list-default))')
                : (isItemHovered
                  ? 'var(--text-list-hover)'
                  : 'var(--text-list-default)');
              return (
                <li key={o.value}>
                  <button
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    onClick={() => { onChange?.(o.value); setOpen(false); }}
                    onMouseEnter={() => setHoveredValue(o.value)}
                    onMouseLeave={() => setHoveredValue(null)}
                    className='w-full flex items-center text-left'
                    style={{
                      minHeight: 'var(--dim-size-1000, 40px)',
                      gap: 'var(--dim-space-200)',
                      paddingLeft: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-200)',
                      paddingBottom: 'var(--dim-space-200)',
                      borderRadius: 'var(--dim-radius-150, 6px)',
                      background: itemBg,
                      color: itemText,
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      lineHeight: 1.5,
                      border: 'none',
                      cursor: 'pointer',
                      transition: `background-color 120ms ${EASE}, color 120ms ${EASE}`,
                    }}
                  >
                    {o.icon && (
                      <span style={{ color: 'var(--icon-list-secondary-default)' }}>
                        <Icon name={o.icon} size={16} />
                      </span>
                    )}
                    <span className='flex-1 truncate'>{o.label}</span>
                    {isSelected && (
                      <span style={{ color: 'var(--icon-list-check)' }}>
                        <Icon name='check' size={16} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default Dropdown;

/* ── DropdownRowPreview — single dropdown list-item with forced state.
   Matches Figma 382:14360 property panel:

     Properties:
       • State            'default' | 'hover' | 'selected' | 'selected-hover'
       • Icon             'default' (neutral gray) | 'darker' (neutral 700)
       • Show Leading icon
       • Show Switch
       • Show Badge       (TH-style colorful badge)
       • Show Check
       • Show Chevron right

   Used by the state-matrix table in the components library and by anywhere
   else that needs a non-interactive row sample (mocks, design docs).        */

const ROW_STATE_TONES = {
  default: {
    bg:   'var(--surface-list-default)',
    text: 'var(--text-list-default)',
  },
  hover: {
    bg:   'var(--surface-list-hover)',
    text: 'var(--text-list-hover)',
  },
  selected: {
    bg:   'var(--surface-list-selected, var(--surface-list-default))',
    text: 'var(--text-list-selected, var(--text-list-default))',
  },
  'selected-hover': {
    bg:   'var(--surface-list-selected-hover)',
    text: 'var(--text-list-selected-hover, var(--text-list-hover))',
  },
};

const ROW_ICON_TONES = {
  default: 'var(--icon-list-secondary-default, var(--text-content-tertiary))',
  darker:  'var(--icon-list-primary-default, var(--text-content-default))',
};

export const DropdownRowPreview = ({
  state = 'default',
  icon = 'default',                       /* 'default' | 'darker' */
  label = 'List01',
  leadingIcon = 'person',
  badgeText = 'TH',
  switchOn = false,
  /* Show flags — mirror Figma 382:14360 property panel */
  showLeadingIcon = true,
  showSwitch = true,
  showBadge = true,
  showCheck = true,
  showChevron = true,
}) => {
  const tone = ROW_STATE_TONES[state] || ROW_STATE_TONES.default;
  const iconColor = ROW_ICON_TONES[icon] || ROW_ICON_TONES.default;
  const isSelected = state === 'selected' || state === 'selected-hover';
  return (
    <div
      className='inline-flex items-center text-left'
      style={{
        width: '100%',
        minWidth: 240,
        minHeight: 'var(--dim-size-1000, 40px)',
        gap: 'var(--dim-space-200)',
        paddingLeft:  'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingTop:    'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: tone.bg,
        color: tone.text,
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
      }}
    >
      {showLeadingIcon && (
        <span style={{ color: iconColor, display: 'inline-flex' }}>
          <Icon name={leadingIcon} size={16} />
        </span>
      )}
      <span className='flex-1 truncate'>{label}</span>
      {showSwitch && (
        <Switch
          checked={switchOn}
          onChange={() => {}}
          aria-label={switchOn ? 'On' : 'Off'}
        />
      )}
      {showBadge && (
        <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>
          {badgeText}
        </ColorfulBadge>
      )}
      {showCheck && isSelected && (
        <span style={{ color: 'var(--icon-list-check, var(--brand-p600))', display: 'inline-flex' }}>
          <Icon name='check' size={16} />
        </span>
      )}
      {showChevron && (
        <span style={{ color: iconColor, display: 'inline-flex' }}>
          <Icon name='chevron-right' size={16} />
        </span>
      )}
    </div>
  );
};
