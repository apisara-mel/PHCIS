import React from 'react';
import Icon from '@/components/icons/Icon';

/* MIH ViewToggle — Grid / list view switch, Figma "Tab Bar / Pill"
   (291:113045 · 334:134446): #e2f3eb pill track · p-4 · gap-2 · radius-full;
   each tab h-32 · px-12 py-6 · radius-full · 14px icon; active = white chip.
   Shared across any page offering a grid/list view switch (ConsentFormsPage,
   ObservationQueuePage) so the toggle stays visually identical everywhere. */
const ViewToggle = ({ value, onChange }) => (
  <div
    className='inline-flex items-start'
    style={{ gap: 'var(--dim-space-050)', padding: 'var(--dim-space-100)', borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-quaternary)' }}
  >
    {[['grid', 'grid_view'], ['list', 'format_list_bulleted']].map(([v, icon]) => {
      const on = value === v;
      return (
        <button
          key={v}
          type='button'
          onClick={() => onChange(v)}
          aria-pressed={on}
          aria-label={v === 'grid' ? 'มุมมองตาราง' : 'มุมมองรายการ'}
          className='inline-flex items-center justify-center'
          style={{
            height: 32,
            padding: 'var(--dim-space-150) var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-full)', border: 'none', outline: 'none', cursor: 'pointer',
            background: on ? 'var(--surface-card-100)' : 'transparent',
            color: on ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)',
            boxShadow: on ? 'var(--shadow-card)' : 'none',
            transition: 'background-color 120ms ease, color 120ms ease',
          }}
        >
          <Icon name={icon} size={14} />
        </button>
      );
    })}
  </div>
);

export default ViewToggle;
