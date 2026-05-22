import React, { useState } from 'react';
import ActionList from '@/components/list/ActionList';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { Sym } from '@/components/forms/Fields';

/* MIH ServiceDateList — Figma PHCIS | CPOE node 176:38629 (Action List · วันที่รับบริการ).
   Rows use ActionList four-state matrix: default · hover · selected (at-rest uses
   list/hover surface + left accent) · selected-hover. Label stays --text-list-default
   on the active row per Figma; unselected rows pick up --text-list-hover on hover. */

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
}) => (
  <aside
    className={`flex flex-col shrink-0 ${className}`}
    style={{
      width,
      gap: 'var(--dim-space-100)',
      padding: 'var(--dim-space-300) var(--dim-space-400)',
      borderRight: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      background: 'var(--surface-card-100)',
    }}
  >
    <div
      className='flex items-start w-full'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-200) var(--dim-space-400)',
      }}
    >
      <span style={{
        color: 'var(--text-topic-tertiary-title)',
        fontFamily: 'var(--type-family-heading-content)',
        fontWeight: 'var(--type-weight-bold)',
        fontSize: 'var(--type-size-base)',
        lineHeight: 1.5,
        wordBreak: 'break-word',
      }}
      >
        {title}
      </span>
    </div>
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-0)' }}>
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
