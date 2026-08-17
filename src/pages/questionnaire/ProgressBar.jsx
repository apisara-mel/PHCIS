import React from 'react';

/* แถบความคืบหน้าของการสัมภาษณ์ — ตอบแล้ว / ต้องติดตาม / ไม่เกี่ยวข้อง
   เรียงต่อกันในรางเดียว เพื่อให้เห็นสถานะรวมของโมดูลได้ในสายตาเดียว */

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
};

const SEGMENTS = [
  { key: 'answered', label: 'ตอบแล้ว',      color: 'var(--surface-brandPrimary-default)' },
  { key: 'followup', label: 'ต้องติดตาม',   color: 'var(--text-warning-default)' },
  { key: 'na',       label: 'ไม่เกี่ยวข้อง', color: 'var(--text-content-quaternary)' },
];

const ProgressBar = ({ stats, compact = false }) => {
  const total = stats.total || 1;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)' }}>
      {!compact && (
        <div className='flex items-baseline w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span
            style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg)',
            }}
          >
            {stats.percent}%
          </span>
          <span style={LABEL}>
            ตอบแล้ว {stats.answered} · ต้องติดตาม {stats.followup} · ไม่เกี่ยวข้อง {stats.na} ·
            เหลือ {stats.pending} จากทั้งหมด {stats.total} ข้อ
          </span>
        </div>
      )}
      <div
        className='flex w-full'
        style={{
          height: compact ? 6 : 10,
          borderRadius: 'var(--dim-radius-full, 999px)',
          background: 'var(--border-neutral-tertiary)',
          overflow: 'hidden',
        }}
        role='progressbar'
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`ความคืบหน้า ${stats.percent} เปอร์เซ็นต์`}
      >
        {SEGMENTS.map((seg) => (
          stats[seg.key] > 0 ? (
            <span
              key={seg.key}
              title={`${seg.label} ${stats[seg.key]} ข้อ`}
              style={{ display: 'block', height: '100%', width: `${(stats[seg.key] / total) * 100}%`, background: seg.color }}
            />
          ) : null
        ))}
      </div>
    </div>
  );
};

export default ProgressBar;
