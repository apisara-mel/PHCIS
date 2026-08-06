import React, { useEffect, useState } from 'react';
import ActionList from '@/components/list/ActionList';
import LabNotificationCountBadge from '@/components/badge/LabNotificationCountBadge';
import { EXAM_SUPPORT_ITEMS } from '@/data/treatmentVisits';
import {
  subscribeLabNotifications, unreadLabNotificationCount,
} from '@/data/treatmentInterfaces';

/* MIH ExamSupportList — Figma PHCIS | Medical-examination 191:24581
   (ข้อมูลประกอบการตรวจร่างกาย). */

const ExamSupportList = ({
  items = EXAM_SUPPORT_ITEMS,
  onItemClick,
  patientHn,
  width = 320,
  className = '',
}) => {
  const [labUnreadCount, setLabUnreadCount] = useState(
    () => unreadLabNotificationCount(patientHn),
  );

  useEffect(() => {
    const refresh = () => setLabUnreadCount(unreadLabNotificationCount(patientHn));
    refresh();
    return subscribeLabNotifications(refresh);
  }, [patientHn]);

  return (
    <aside
      className={`flex flex-col shrink-0 self-stretch min-h-0 h-full ${className}`}
      style={{
        width,
        minWidth: 160,
        padding: 'var(--dim-space-300) var(--dim-space-100)',
        borderRadius: 'var(--dim-radius-400)',
        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
        background: 'var(--surface-actionlist-default, #fff)',
        gap: 'var(--dim-space-100)',
      }}
    >
      <div
        style={{
          padding: 'var(--dim-space-200) var(--dim-space-400)',
        }}
      >
        <span style={{
          color: 'var(--text-topic-secondary-title)',
          fontFamily: 'var(--type-family-heading-content)',
          fontWeight: 'var(--type-weight-bold)',
          fontSize: 'var(--type-size-base)',
          lineHeight: 1.5,
        }}
        >
          ข้อมูลประกอบการตรวจร่างกาย
        </span>
      </div>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-050, 2px)' }}>
        {items.map((item) => (
          <ActionList
            key={item.key}
            as='button'
            label={(
              <span
                className='inline-flex items-center min-w-0'
                style={{ gap: 'var(--dim-space-150, 6px)' }}
              >
                <span className='truncate'>{item.label}</span>
                {item.key === 'lab' && (
                  <LabNotificationCountBadge count={labUnreadCount} />
                )}
              </span>
            )}
            circleIcon={item.circleIcon}
            showLeadingIcon={false}
            showSwitch={false}
            showBadge={false}
            showCheck={false}
            showSuccess={item.hasResult}
            showChevronRight
            onClick={() => onItemClick?.(item.key)}
          />
        ))}
      </div>
    </aside>
  );
};

export default ExamSupportList;
