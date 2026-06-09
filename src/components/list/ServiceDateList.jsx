import React, { useState } from 'react';
import ActionList from '@/components/list/ActionList';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { Sym } from '@/components/forms/Fields';

/* MIH ServiceDateList — Figma Appointment 29:13306 Action List (px space-400 · py space-300).
   PHCIS | CPOE 176:38629 uses the same rail inset when showRailShadow is set. */

const ROW_RADIUS = 'var(--sm-radius-100, 6px)';

const ServiceDateRow = ({ item, selected, onSelect }) => {
  const [hovered, setHovered] = useState(false);

  const listState = selected
    ? (hovered ? 'selected-hover' : 'default')
    : (hovered ? 'hover' : 'default');

  const rowStyle = {
    borderRadius: ROW_RADIUS,
    ...(selected ? {
      color: 'var(--text-list-default)',
      background: hovered
        ? 'var(--surface-list-selected-hover)'
        : 'var(--surface-list-hover)',
      borderLeft: 'var(--dim-stroke-400) solid var(--text-brandPrimary-default)',
    } : {}),
  };

  return (
    <div
      className='w-full'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ActionList
        as='button'
        label={item.date}
        state={listState}
        showLeadingIcon={false}
        showSwitch={false}
        showBadge={false}
        showCheck={false}
        showChevronRight={false}
        trailing={(
          <span className='inline-flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
            {item.center && (
              <ColorfulBadge style='blue' size='small' hierarchy='secondary'>
                {item.center}
              </ColorfulBadge>
            )}
            <span
              className='inline-flex shrink-0'
              style={{ opacity: selected ? 1 : 0 }}
              aria-hidden={!selected}
            >
              <Sym
                name='chevron_right'
                size={16}
                color='var(--icon-list-secondary-default, currentColor)'
              />
            </span>
          </span>
        )}
        onClick={onSelect}
        style={rowStyle}
      />
    </div>
  );
};

const ServiceDateList = ({
  title = 'วันที่รับบริการ',
  items = [],
  selectedIndex = 0,
  onSelect,
  width = 316,
  className = '',
  showRailShadow = false,
  fillHeight = false,
}) => (
  <aside
    className={`flex flex-col shrink-0 ${className}`}
    style={{
      width,
      minWidth: 160,
      gap: 'var(--dim-space-100)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
      borderRight: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-card-100)',
      boxShadow: showRailShadow ? 'var(--shadow-brand-top-200)' : undefined,
      ...(fillHeight
        ? { alignSelf: 'stretch', height: '100%', minHeight: 720 }
        : null),
    }}
  >
    <div
      className='flex items-start w-full shrink-0'
      style={{
        gap: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-200)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
      }}
    >
      <span style={{
        color: 'var(--text-topic-tertiary-title)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontWeight: 'var(--type-weight-regular)',
        fontSize: 'var(--type-size-base)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
      >
        {title}
      </span>
    </div>
    <div
      className='flex flex-col w-full min-h-0'
      style={{ gap: 'var(--dim-space-0)', flex: fillHeight ? 1 : undefined }}
    >
      {items.map((item, index) => (
        <ServiceDateRow
          key={item.id ?? `${item.date}-${index}`}
          item={item}
          selected={index === selectedIndex}
          onSelect={() => onSelect?.(index)}
        />
      ))}
    </div>
  </aside>
);

export default ServiceDateList;
