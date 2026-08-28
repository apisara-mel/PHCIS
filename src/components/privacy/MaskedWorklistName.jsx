import React from 'react';
import { Link } from 'react-router-dom';
import { EllipsisText } from '@/components/table/Table';

/* MaskedWorklistName — ชื่อผู้รับบริการใน worklist ทุกโมดูล

   ⚠️ ไม่ปิดบังชื่ออีกแล้ว (มติผู้ใช้ 28 ส.ค. 69) — ชื่อ-นามสกุลแสดงเต็มทุกหน้า
   เจ้าหน้าที่ที่เข้าถึง worklist ได้คือคนที่ต้องเห็นชื่ออยู่แล้ว การกดเปิดทีละชื่อ
   จึงไม่ได้กันใครจริง แต่ทำให้กวาดสายตาหาคนในตารางช้าลงทุกครั้ง

   ชื่อ component และ prop เดิมถูกคงไว้ เพราะมีจอเรียกใช้กว่า 40 หน้า การเปลี่ยน
   ชื่อทั้งหมดเป็น diff ใหญ่ที่ไม่ได้ทำให้อะไรทำงานต่างไป และถ้าศูนย์ไหนต้องเปิด
   การปิดบังกลับมา จุดแก้ยังอยู่ที่นี่ที่เดียว (กลไกเดิม PrivacyRevealPopup +
   src/data/worklistPiiReveal.js ยังอยู่ในโค้ดเบส) */

const LINK_STYLE = {
  color: 'var(--text-neutral-default)',
  fontWeight: 'var(--type-weight-medium)',
  cursor: 'pointer',
  textDecoration: 'none',
};

const BUTTON_STYLE = {
  ...LINK_STYLE,
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  textAlign: 'left',
};

export default function MaskedWorklistName({
  name,
  /* recordKey / fieldLabel / onReveal — ไม่ใช้แล้ว แต่ยังรับไว้เพื่อไม่ให้ผู้เรียก
     เดิมทั้งหมดต้องแก้พร้อมกัน */
  recordKey = '',
  fieldLabel = 'ชื่อ-นามสกุล ของผู้รับบริการ',
  linkTo = null,
  onRevealedClick = null,
  className = 'min-w-0 flex-1 truncate',
  style = {},
  truncate = true,
  emptyLabel = '—',
  stopPropagation = true,
  onReveal,
}) {
  const full = String(name ?? '').trim();

  if (!full) {
    return <span className={className} style={style}>{emptyLabel}</span>;
  }

  const textNode = truncate
    ? <EllipsisText text={full} className={className} fill={false} />
    : <span className={className} style={style}>{full}</span>;

  if (linkTo) {
    return (
      <Link
        to={linkTo}
        className={`${className} hover:underline`.trim()}
        style={{ ...LINK_STYLE, ...style }}
        onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
      >
        {textNode}
      </Link>
    );
  }

  if (onRevealedClick) {
    return (
      <button
        type='button'
        className={`${className} hover:underline`.trim()}
        style={{ ...BUTTON_STYLE, ...style }}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          onRevealedClick(e);
        }}
      >
        {textNode}
      </button>
    );
  }

  return <span className={className} style={style}>{textNode}</span>;
}
