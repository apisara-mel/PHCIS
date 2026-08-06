import React from 'react';
import StickyTimelineDateHeader from '@/components/timeline/StickyTimelineDateHeader';

/* MIH GroupedTimeline — vertical feed แบ่ง section ตามวันที่/เดือน
   ใช้ sticky header ร่วมกันทุก timeline ในระบบ */

export default function GroupedTimeline({
  groups = [],
  getGroupKey = (group) => group.label,
  getGroupLabel = (group) => group.label,
  getGroupCount = (group) => group.events?.length ?? group.count,
  countLabel = 'รายการ',
  renderGroupBody,
  stickyTop = 0,
  stickyBackground = 'var(--surface-card-100)',
  sectionGap = 'var(--dim-space-600)',
  groupGap = 'var(--dim-space-300)',
  titleStyle,
  mutedStyle,
}) {
  if (!groups.length) return null;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: sectionGap }}>
      {groups.map((group) => (
        <section
          key={getGroupKey(group)}
          className='flex flex-col w-full min-w-0'
          style={{ gap: groupGap }}
        >
          <StickyTimelineDateHeader
            label={getGroupLabel(group)}
            count={getGroupCount(group)}
            countLabel={countLabel}
            stickyTop={stickyTop}
            background={stickyBackground}
            titleStyle={titleStyle}
            mutedStyle={mutedStyle}
          />
          {renderGroupBody(group)}
        </section>
      ))}
    </div>
  );
}
