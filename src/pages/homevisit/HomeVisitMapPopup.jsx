import React, { useState } from 'react';
import Popup from '@/components/popup/Popup';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import { upsertHomeVisitAppointment } from '@/data/homevisitVisits';
import { findRegistryEntryByHn, upsertRegistryEntry } from '@/data/homevisitRegistry';
import { isInsideServiceArea, SERVICE_AREA } from '@/data/homevisitHhc';
import { NoticeBand } from '@/pages/homevisit/homevisitShared';

/* ดูแผนที่ / ปักหมุดบ้าน จากแถวในตารางคิวเยี่ยมบ้าน (TOR §1.18.2).

   พยาบาลต้องเห็นตำแหน่งบ้านก่อนออกเดินทาง และแก้หมุดได้ทันทีเมื่อไปถึง
   แล้วพบว่าหมุดเดิมไม่ตรง — ไม่ต้องย้อนกลับไปแก้ที่หน้าทะเบียน.

   เขียนกลับ 2 ที่ให้ตรงกันเสมอ:
     • ทะเบียนผู้รับบริการ (แหล่งจริงของตำแหน่งบ้าน · §1.10.12.1)
     • overlay ของนัดในคิว เพื่อให้แถว/แผนเส้นทางอัปเดตทันทีในรอบนี้ */

const HomeVisitMapPopup = ({ open, row, onClose, onSaved }) => {
  const [draft, setDraft] = useState(null);

  if (!open || !row) return null;

  const current = draft ?? row.home ?? null;
  /* ป้ายสถานะ/ระยะทางอ่านจาก "ตำแหน่งที่บันทึกแล้ว" เสมอ — ระหว่างลากหมุด
     ยังไม่ถือว่าเปลี่ยน จนกว่าจะกดบันทึก (ไม่งั้นป้ายจะกระพริบเป็น
     "ยังไม่ได้ปักหมุด" ทั้งที่กำลังแก้อยู่). */
  const saved = row.home;
  const inside = current?.lat ? isInsideServiceArea(current) : null;
  const dirty = !!draft
    && (draft.lat !== saved?.lat || draft.lng !== saved?.lng);

  const close = () => {
    setDraft(null);
    onClose?.();
  };

  const save = () => {
    if (!draft) return close();
    /* ลาก/คลิกหมุดแล้วกด "บันทึกตำแหน่ง" = ปักหมุดเรียบร้อย */
    const home = { ...draft, pinSaved: true };
    const registry = row.hn ? findRegistryEntryByHn(row.hn) : null;
    if (registry) upsertRegistryEntry({ ...registry, home });
    upsertHomeVisitAppointment({ id: row.id, home });
    setDraft(null);
    onSaved?.(home);
    onClose?.();
    return undefined;
  };

  return (
    <Popup
      open={open}
      onClose={close}
      title='ตำแหน่งบ้านผู้รับบริการ'
      subtitle={`${row.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : row.name} · HN: ${row.hn} · ${row.community || '—'} ${row.district || ''}`}
      tertiaryAction={{ label: dirty ? 'ยกเลิกการแก้ไข' : 'ปิด', onClick: close }}
      primaryAction={{ label: 'บันทึกตำแหน่ง', onClick: save, disabled: !dirty }}
      width={720}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          {row.address || 'ยังไม่ได้บันทึกที่อยู่'}
        </span>

        {inside === false && (
          <NoticeBand tone='danger' icon='wrong_location'>
            ตำแหน่งนี้อยู่นอก{SERVICE_AREA.label} — ตรวจสอบที่อยู่อีกครั้ง
            หรือประสานส่งต่อให้ศูนย์บริการสาธารณสุขที่รับผิดชอบพื้นที่นั้น
          </NoticeBand>
        )}

        <AddressMapBlock
          value={current || {}}
          onChange={(next) => setDraft(next)}
          heading='ปักหมุด / แก้ไขตำแหน่งบ้าน'
          hint='ลากหมุด คลิกบนแผนที่ หรือกด “ใช้ตำแหน่งปัจจุบัน” ตอนไปถึงบ้านจริง แล้วกดบันทึกตำแหน่ง'
          flush
        />
      </div>
    </Popup>
  );
};

export default HomeVisitMapPopup;
