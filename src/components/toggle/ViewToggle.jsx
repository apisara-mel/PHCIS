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

const ViewToggle = ({ value, onChange }) => {
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
      {[['list', 'format_list_bulleted'], ['grid', 'grid_view']].map(([v, icon]) => {
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
            aria-label={v === 'grid' ? 'มุมมองตาราง' : 'มุมมองรายการ'}
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
