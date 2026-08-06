import React, { useEffect, useState } from 'react';
import '@/components/timeline/stickyTimelineStyles';
import useTimelineScrollSpy from '@/components/timeline/useTimelineScrollSpy';

/* GroupedTimelineScrollFeed — filter chrome + หัวเดือน active stick ด้วยกัน
   ใช้ scroll-spy แทน nested position:sticky (เสถียรกว่าใน popup / flex scroll) */

export default function GroupedTimelineScrollFeed({
  scrollRef,
  groups = [],
  chrome = null,
  stickyBackground = 'var(--surface-card-100)',
  getGroupKey = (group) => group.label,
  getGroupLabel = (group) => group.label,
  getGroupCount = (group) => group.events?.length ?? group.count,
  countLabel = 'รายการ',
  renderGroupBody,
  sectionGap = 'var(--dim-space-600)',
  groupGap = 'var(--dim-space-300)',
  titleStyle,
  mutedStyle,
}) {
  const { activeGroup, registerSection } = useTimelineScrollSpy(scrollRef, groups, getGroupKey);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = scrollRef?.current;
    if (!root) return undefined;
    const onScroll = () => setScrolled(root.scrollTop > 4);
    onScroll();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [scrollRef, groups.length]);

  if (!groups.length) return null;

  return (
    <>
      <div
        className='mih-timeline-sticky-chrome w-full min-w-0'
        data-scrolled={scrolled || undefined}
        style={{ background: stickyBackground }}
      >
        {chrome}
        {activeGroup && scrolled && (
          <div className='mih-timeline-sticky-chrome-date'>
            <span style={titleStyle}>{getGroupLabel(activeGroup)}</span>
            <span style={mutedStyle}>
              {getGroupCount(activeGroup)} {countLabel}
            </span>
          </div>
        )}
      </div>
      <div className='flex flex-col w-full min-w-0' style={{ gap: sectionGap }}>
        {groups.map((group) => {
          const key = getGroupKey(group);
          return (
            <section
              key={key}
              ref={(el) => registerSection(key, el)}
              className='flex flex-col w-full min-w-0'
              style={{ gap: groupGap }}
            >
              <div
                className='mih-timeline-month-in-flow flex items-center flex-wrap w-full min-w-0'
                style={{ gap: 'var(--dim-space-200)' }}
              >
                <span style={titleStyle}>{getGroupLabel(group)}</span>
                <span style={mutedStyle}>
                  {getGroupCount(group)} {countLabel}
                </span>
              </div>
              {renderGroupBody(group)}
            </section>
          );
        })}
      </div>
    </>
  );
}
