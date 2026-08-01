import React from 'react';

/* Tube cap-colour dot — the "ชนิดตัวอย่าง + หลอด (สีจุก)" cell in the team's
   worklist column spec, and the same swatch the order-entry summary and the
   Setup page's สีจุก picker render.

   The colour is never passed in as a literal by callers: it comes off
   `LAB_TUBES[test.tubeKey].color` in labCatalog.js, which is how the team's
   rule "รายกลุ่มตรวจ และสีหลอดจะ relate กัน เป็นมาตรฐาน … ถ้าเลือก Heme สีหลอด
   จะ auto เปลี่ยนตาม" is enforced structurally rather than by convention.

   A bare colour dot is not accessible on its own, so the label always
   renders alongside it (and `title` carries the Thai cap name for the
   icon-only `showLabel={false}` variant used in dense cells). */
const LabTubeDot = ({ tube, count = 1, showLabel = true, size = 10 }) => {
  if (!tube) return <span style={{ color: 'var(--text-content-tertiary)' }}>—</span>;

  return (
    <span
      className='inline-flex items-center min-w-0'
      style={{ gap: 'var(--dim-space-150)' }}
      title={`${tube.thai}${count > 1 ? ` × ${count}` : ''} — ${tube.additive}`}
    >
      <span
        className='shrink-0'
        aria-hidden
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: tube.color,
          /* A white ring keeps the grey Fluoride cap legible on the row
             hover fill, which is itself a light neutral. */
          boxShadow: '0 0 0 1px var(--surface-card-100, #FFFFFF)',
        }}
      />
      {showLabel && (
        <span
          className='truncate'
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            color: 'var(--text-content-secondary)',
          }}
        >
          {tube.label}{count > 1 ? ` × ${count}` : ''}
        </span>
      )}
    </span>
  );
};

export default LabTubeDot;
