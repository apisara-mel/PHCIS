import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';

/* MIH ViewToggle — List / grid view switch, Figma "Tab Bar / Pill"
   (291:113045 · 334:134446): #e2f3eb pill track · p-4 · gap-2 · radius-full;
   each tab h-32 · px-12 py-6 · radius-full · 14px icon; active = white chip.
   Shared across any page offering a grid/list view switch (ConsentFormsPage,
   ObservationQueuePage) so the toggle stays visually identical everywhere. */

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

const resolveButtonStyle = ({ selected, hovered }) => {
  if (selected) {
    return {
      background: 'var(--surface-card-100)',
      color: 'var(--text-brandPrimary-default)',
      iconColor: 'var(--text-brandPrimary-default)',
      boxShadow: hovered ? 'var(--shadow-card-hover, var(--shadow-card))' : 'var(--shadow-card)',
    };
  }
  if (hovered) {
    return {
      background: 'var(--surface-tabpill-hover)',
      color: 'var(--text-tabpill-hover)',
      iconColor: 'var(--icon-tabpill-hover)',
      boxShadow: 'none',
    };
  }
  return {
    background: 'transparent',
    color: 'var(--text-content-tertiary)',
    iconColor: 'var(--text-content-tertiary)',
    boxShadow: 'none',
  };
};

/* ตัวเลือกมาตรฐาน — รายการ / ตาราง (ผู้เรียกเดิมไม่ต้องส่ง `options`). */
export const VIEW_TOGGLE_LIST_GRID = [
  { value: 'list', icon: 'format_list_bulleted', label: 'มุมมองรายการ' },
  { value: 'grid', icon: 'grid_view', label: 'มุมมองตาราง' },
];

/**
 * @param {Array<{value:string, icon:string, label:string}>} options
 *   ชุดมุมมองอื่นที่ไม่ใช่ list/grid เช่น รายการ/แผนที่ ของงานเยี่ยมบ้าน —
 *   ให้ยังเป็น component ตัวเดียวกัน จะได้ไม่มี toggle หน้าตาซ้ำในระบบ.
 */
const ViewToggle = ({ value, onChange, options = VIEW_TOGGLE_LIST_GRID }) => {
  const [hovered, setHovered] = useState(null);

  return (
    <div
      className='inline-flex items-start'
      style={{
        gap: 'var(--dim-space-050)',
        padding: 'var(--dim-space-100)',
        borderRadius: 'var(--dim-radius-full)',
        background: 'var(--surface-brandPrimary-quaternary)',
      }}
    >
      {options.map(({ value: v, icon, label }) => {
        const selected = value === v;
        const isHovered = hovered === v;
        const s = resolveButtonStyle({ selected, hovered: isHovered });
        return (
          <button
            key={v}
            type='button'
            onClick={() => onChange(v)}
            onMouseEnter={() => setHovered(v)}
            onMouseLeave={() => setHovered(null)}
            aria-pressed={selected}
            aria-label={label}
            title={label}
            className='inline-flex items-center justify-center'
            style={{
              height: 'var(--dim-size-600, 32px)',
              padding: 'var(--dim-space-150) var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-full)',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              background: s.background,
              color: s.color,
              boxShadow: s.boxShadow,
              transition: [
                `background-color 200ms ${EASE}`,
                `color 200ms ${EASE}`,
                `box-shadow 240ms ${EASE}`,
              ].join(', '),
            }}
          >
            <Icon name={icon} size={14} style={{ color: s.iconColor, transition: `color 200ms ${EASE}` }} />
          </button>
        );
      })}
    </div>
  );
};

export default ViewToggle;
