import React, { useMemo } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';

/* Version Control ของเทมเพลตแบบฟอร์มความยินยอม — TOR ด.1.1.5.

   VersionHistoryPopup: timeline เวอร์ชัน V1.0 → ปัจจุบัน (ผู้แก้ไข, วันที่,
   สรุปที่เปลี่ยน, สถานะเผยแพร่/เก็บถาวร) + action "สร้างเวอร์ชันใหม่" ที่พา
   ไป wizard เดิมแบบ prefill + bump — แก้ทับเวอร์ชันที่เผยแพร่แล้วไม่ได้
   (เวอร์ชันเก่าเปิดดู/พิมพ์ได้ read-only เท่านั้น).

   ประวัติเป็น mock ที่ derive จากเลขเวอร์ชันปัจจุบันของ record — ไม่มี
   dataset จริงของทุกเวอร์ชันใน repo. */

/* 'V 2.1' → { major: 2, minor: 1 } (fallback V1.0) */
const parseVersion = (v) => {
  const m = /([0-9]+)\.([0-9]+)/.exec(String(v || ''));
  return m ? { major: Number(m[1]), minor: Number(m[2]) } : { major: 1, minor: 0 };
};

/* bump แบบ major: 'V 2.1' → 'V 3.0' (ห้ามแก้ทับ — ด.1.1.5) */
export const bumpVersion = (v) => {
  const { major } = parseVersion(v);
  return `V ${major + 1}.0`;
};

const EDITORS = ['ลดา ดีงาม', 'นที ทองคำ', 'พว.สุชาดา แก้วมณี'];
const SUMMARIES = [
  'จัดทำเอกสารฉบับแรกตามแบบสำนักอนามัย',
  'ปรับข้อความข้อ 2 (ความเสี่ยงและภาวะแทรกซ้อน) ตามคำแนะนำนิติกร',
  'เพิ่มข้อการคุ้มครองข้อมูลส่วนบุคคล (PDPA) และช่องผู้แทนผู้เยาว์',
  'ปรับรูปแบบลายเซ็นรองรับ e-Signature 3 ช่องทาง',
  'แก้ไขถ้อยคำการเพิกถอนความยินยอมให้สอดคล้องมาตรา 19',
];

/* สร้าง timeline เวอร์ชันจากเลขปัจจุบัน เช่น V 2.1 → V1.0, V1.1, V2.0, V2.1 */
export const buildVersionHistory = (record) => {
  const cur = parseVersion(record.version);
  const seq = [];
  for (let mj = 1; mj <= cur.major; mj += 1) {
    const maxMinor = mj === cur.major ? cur.minor : 1;
    for (let mn = 0; mn <= maxMinor; mn += 1) seq.push({ major: mj, minor: mn });
  }
  const trimmed = seq.slice(-5); // กัน timeline ยาวเกิน
  return trimmed.map((v, i) => {
    const isCurrent = i === trimmed.length - 1;
    return {
      version: `V ${v.major}.${v.minor}`,
      date: isCurrent ? record.updatedDate : `${8 + i * 37} วันก่อน ${record.updatedDate}`,
      editor: EDITORS[i % EDITORS.length],
      summary: SUMMARIES[i % SUMMARIES.length],
      status: isCurrent ? 'เผยแพร่ (ปัจจุบัน)' : 'เก็บถาวร',
      isCurrent,
    };
  }).reverse(); // ล่าสุดอยู่บนสุด
};

const LINE = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

export function VersionHistoryPopup({ open, record, onClose, onCreateVersion }) {
  const entries = useMemo(() => (record ? buildVersionHistory(record) : []), [record]);
  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='ประวัติเวอร์ชันแบบฟอร์ม'
      subtitle={record ? `${record.code} · ${record.name}` : undefined}
      primaryAction={{ label: 'สร้างเวอร์ชันใหม่', onClick: () => record && onCreateVersion(record) }}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div
          className='flex items-start'
          style={{
            gap: 'var(--dim-space-200)',
            paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
            background: 'var(--surface-info-tertiary, #DBEAFE)',
            borderRadius: 'var(--dim-radius-300)',
          }}
        >
          <Icon name='info' size={18} color='var(--text-info-default, #1D4ED8)' />
          <span style={{ ...LINE, color: 'var(--text-info-default, #1D4ED8)' }}>
            แก้ไขเทมเพลตที่เผยแพร่แล้วต้อง &ldquo;สร้างเวอร์ชันใหม่&rdquo; เท่านั้น (ห้ามแก้ทับ) —
            เผยแพร่แล้ว record ที่เซ็นเวอร์ชันเก่าจะกลายเป็นสถานะ &ldquo;มีเวอร์ชันใหม่&rdquo; ในหน้าจัดการความยินยอม
          </span>
        </div>

        {/* timeline */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-0)' }}>
          {entries.map((e, i) => (
            <div key={e.version} className='flex items-stretch' style={{ gap: 'var(--dim-space-300)' }}>
              {/* rail */}
              <div className='flex flex-col items-center' style={{ width: 24, flexShrink: 0 }}>
                <span
                  aria-hidden
                  style={{
                    width: 12, height: 12, borderRadius: 'var(--dim-radius-full)',
                    /* inactive dot ใช้ token เดียวกับเส้น rail ด้านล่าง (neutral/200) */
                    background: e.isCurrent ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--border-neutral-tertiary, #E2E4E6)',
                    border: 'var(--dim-stroke-100) solid var(--surface-card-100)',
                    marginTop: 'var(--dim-space-100)',
                    flexShrink: 0,
                  }}
                />
                {i < entries.length - 1 && (
                  <span aria-hidden style={{ width: 'var(--dim-stroke-100)', flex: 1, background: 'var(--border-neutral-tertiary)' }} />
                )}
              </div>
              {/* card */}
              <div
                className='flex flex-col flex-1 min-w-0'
                style={{
                  gap: 'var(--dim-space-150)',
                  marginBottom: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                  background: e.isCurrent ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-200, #FDFDFD)',
                  border: `var(--dim-stroke-100) solid ${e.isCurrent ? 'var(--border-brandPrimary-quaternary)' : 'var(--border-neutral-quaternary, #F4F5F5)'}`,
                  borderRadius: 'var(--dim-radius-300)',
                }}
              >
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{e.version}</ColorfulBadge>
                  <ColorfulBadge style={e.isCurrent ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>{e.status}</ColorfulBadge>
                  <span style={{ ...LINE, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>{e.date}</span>
                </div>
                <span style={LINE}>{e.summary}</span>
                <span style={{ ...LINE, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
                  ผู้แก้ไข: {e.editor}
                  {!e.isCurrent && ' · เปิดดู/พิมพ์ได้แบบ read-only เท่านั้น'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
}

export default VersionHistoryPopup;
