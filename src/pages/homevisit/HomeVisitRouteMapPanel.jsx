import React from 'react';
import Icon from '@/components/icons/Icon';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  HOMEVISIT_CENTER,
  HOMEVISIT_CENTER_LOCATION,
  distanceMeters,
  formatDistance,
  resolveVisitStatus,
} from '@/data/homevisitVisits';
import { GroupBadge, EmptyHint, NoticeBand } from '@/pages/homevisit/homevisitShared';

/* HomeVisitRouteMapPanel — มุมมอง "แผนที่" ของคิวนัดเยี่ยมบ้าน (TOR 1.18.2
   ระดับคิว: วางแผนเส้นทางออกเยี่ยม).

   ⚠ ข้อจำกัดที่ตั้งใจ: `AddressMapBlock` (mock map ของ Registration) ผูก
   หมุด **หนึ่งหมุดต่อหนึ่ง instance** ตาม contract {lat, lng, pinSaved}
   จึงแสดงหมุดของ "จุดเยี่ยมที่เลือก" ทีละจุด แล้วให้รายการลำดับการเดินทาง
   ด้านข้างทำหน้าที่เป็นแผนเส้นทางทั้งวัน (คลิกที่การ์ด → หมุดเลื่อนไปจุดนั้น
   พร้อมระยะทางจากศูนย์บริการฯ). แผนที่หลายหมุดพร้อมกันต้องมี component
   ใหม่ + GIS จริง ซึ่งเป็นขอบเขตของทีมอื่นตาม TOR §2.3 — wave นี้จึงไม่สร้าง.

   Component นี้อยู่ในโฟลเดอร์ของโมดูล (ไม่ใช่ design system) และรายงานไว้
   ใน manifest `newComponents` ตาม playbook §2 ข้อ 8. */

const StopCard = ({ stop, index, selected, onSelect }) => {
  const status = resolveVisitStatus(stop.statusKey);
  const dist = stop.home?.lat ? distanceMeters(HOMEVISIT_CENTER_LOCATION, stop.home) : null;
  return (
    <button
      type='button'
      onClick={() => onSelect(stop.id)}
      className='w-full flex items-start text-left transition-colors'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: selected
          ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
          : 'var(--dim-stroke-100) solid var(--border-card-default, #E2E4E6)',
        background: selected
          ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
          : 'var(--surface-card-100, #FFFFFF)',
        cursor: 'pointer',
      }}
      aria-pressed={selected}
    >
      <span
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-500, 24px)',
          height: 'var(--dim-size-500, 24px)',
          borderRadius: 'var(--dim-radius-full, 9999px)',
          background: 'var(--surface-brandPrimary-tertiary, #E2F3EB)',
          color: 'var(--text-brandPrimary-default, #007549)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-bold)',
        }}
      >
        {index + 1}
      </span>
      <span className='flex-1 min-w-0 flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
        <span className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
            color: 'var(--text-content-default, #363B3F)',
          }}>
            {stop.appointmentTime || '—'} · {stop.confidential ? 'ข้อมูลลับ (กดที่ตารางเพื่อขอดูชื่อ)' : stop.name}
          </span>
          <GroupBadge group={stop.group} />
          {status && (
            <ColorfulBadge style={status.badge} size='small' hierarchy='secondary'>{status.label}</ColorfulBadge>
          )}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {stop.community || '—'} · {stop.district || '—'} · ผู้รับผิดชอบ {stop.responsible || '—'}
        </span>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {stop.home?.pinSaved
            ? `ระยะจาก${HOMEVISIT_CENTER} ประมาณ ${formatDistance(dist)}`
            : 'ยังไม่ได้ปักหมุดตำแหน่งบ้าน — ต้องปักหมุดที่ทะเบียนก่อนวางแผนเส้นทาง'}
        </span>
      </span>
    </button>
  );
};

const HomeVisitRouteMapPanel = ({
  stops = [],
  selectedId,
  onSelect,
  onOpenRecord,
  onClearFilters,
}) => {
  const selected = stops.find((s) => s.id === selectedId) || stops[0] || null;
  const pinned = stops.filter((s) => s.home?.pinSaved);
  const unpinned = stops.filter((s) => !s.home?.pinSaved);

  if (stops.length === 0) {
    return (
      <EmptyHint
        icon='map'
        action={onClearFilters ? (
          <NeutralSubdueButton variant='outline' leadingIcon='restart_alt' onClick={onClearFilters}>
            ล้างตัวกรอง
          </NeutralSubdueButton>
        ) : undefined}
      >
        ไม่มีจุดเยี่ยมที่ตรงกับเงื่อนไขปัจจุบัน — ปรับหรือล้างตัวกรองเพื่อดูแผนการเดินทางของวันนี้
      </EmptyHint>
    );
  }

  return (
    <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <NoticeBand tone='neutral' icon='info'>
        แผนที่ในระบบนี้เป็นแผนที่จำลอง (mock) — ระบบสารสนเทศภูมิศาสตร์ (GIS) จริงอยู่ในขอบเขตของ TOR §2.3
        จึงแสดงหมุดของจุดที่เลือกทีละจุด และใช้รายการลำดับด้านล่างเป็นแผนเส้นทางของวัน
        ({pinned.length} จุดที่ปักหมุดแล้ว{unpinned.length > 0 ? ` · ${unpinned.length} จุดยังไม่ได้ปักหมุด` : ''})
      </NoticeBand>

      <div className='w-full flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', flex: '1 1 380px', minWidth: 320 }}>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span className='text-brand-500'><Icon name='route' size={18} /></span>
            <span style={{
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-bold)',
              color: 'var(--text-content-default, #363B3F)',
            }}>
              ลำดับการออกเยี่ยม ({stops.length} จุด)
            </span>
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', maxHeight: 460, overflowY: 'auto' }}>
            {stops.map((stop, i) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={i}
                selected={selected?.id === stop.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', flex: '1 1 420px', minWidth: 320 }}>
          {selected?.home?.pinSaved ? (
            <>
              <AddressMapBlock
                value={selected.home}
                readOnly
                heading={`ตำแหน่งบ้าน — ${selected.confidential ? 'ผู้รับบริการ (ข้อมูลลับ)' : selected.name}`}
              />
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {selected.address || '—'}
                </span>
                <div className='flex-1' />
                {onOpenRecord && (
                  <NeutralSubdueButton size='sm' leadingIcon='assignment' onClick={() => onOpenRecord(selected)}>
                    เปิดบันทึกการเยี่ยม
                  </NeutralSubdueButton>
                )}
              </div>
            </>
          ) : (
            <EmptyHint icon='wrong_location'>
              จุดที่เลือกยังไม่ได้ปักหมุดตำแหน่งบ้าน — เปิดทะเบียนผู้รับบริการเพื่อปักหมุดก่อน
              จึงจะแสดงบนแผนที่และคำนวณระยะทางได้
            </EmptyHint>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeVisitRouteMapPanel;
