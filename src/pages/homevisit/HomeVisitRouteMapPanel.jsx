import React, { useState } from 'react';
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
import { SERVICE_AREA, isInsideServiceArea } from '@/data/homevisitHhc';
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

const StopCard = ({ stop, index, selected, onSelect, onOpenRecord }) => {
  const status = resolveVisitStatus(stop.statusKey);
  const dist = stop.home?.lat ? distanceMeters(HOMEVISIT_CENTER_LOCATION, stop.home) : null;
  /* การ์ดต้องตอบสนองการชี้เมาส์ (มติผู้ใช้ 2 ก.ย. 69) — การ์ดที่ไม่ขยับตอนชี้
     อ่านเหมือนป้ายข้อความ คนใช้จะไม่รู้ว่ากดเลือกจุดได้ */
  const [hovered, setHovered] = useState(false);
  return (
    /* กรอบนอกเป็น <div> เพราะมีปุ่ม "เปิดบันทึกการเยี่ยม" อยู่ข้างใน —
       HTML ห้ามปุ่มซ้อนปุ่ม (มติผู้ใช้ 2 ก.ย. 69) พื้นที่กดเลือกจุดคือปุ่มด้านซ้าย */
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className='w-full flex items-start transition-colors'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-300, 12px)',
        paddingBottom: 'var(--dim-space-300, 12px)',
        paddingLeft: 'var(--dim-space-300, 12px)',
        paddingRight: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: selected
          ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
          : `var(--dim-stroke-100) solid ${hovered
            ? 'var(--border-brandPrimaryButton-tertiary, #C5EDDA)'
            : 'var(--border-card-default, #E2E4E6)'}`,
        background: selected || hovered
          ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
          : 'var(--surface-card-100, #FFFFFF)',
        boxShadow: !selected && hovered ? 'var(--shadow-brand-drop-bottom-200)' : 'none',
        cursor: 'pointer',
        transition: 'background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease',
      }}
    >
      <button
        type='button'
        onClick={() => onSelect(stop.id)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-pressed={selected}
        className='flex-1 min-w-0 flex items-start text-left'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
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

      {/* ปุ่มเปิดบันทึกการเยี่ยมอยู่ในแถวเลย (มติผู้ใช้ 2 ก.ย. 69) — เดิมอยู่ใต้
          แผนที่ ต้องเลือกจุดก่อนถึงจะเห็น */}
      {onOpenRecord && (
        <span className='shrink-0'>
          <NeutralSubdueButton size='sm' leadingIcon='assignment' onClick={() => onOpenRecord(stop)}>
            เปิดบันทึกการเยี่ยม
          </NeutralSubdueButton>
        </span>
      )}
    </div>
  );
};

/* ขอบเขตพื้นที่รับผิดชอบ + จุดเยี่ยมทั้งหมดในภาพเดียว (มติ คทง.4 ต่อ §1.18.2).
   วาดด้วย SVG จาก polygon ใน `homevisitHhc` — ยังเป็น mock ไม่ใช่ GIS จริง
   (§2.3 เป็นของอีกทีม) แต่แทน "แผนที่วาดมือใน Family Folder" ได้แล้ว. */
const ServiceAreaMap = ({ stops, selectedId, onSelect }) => {
  const pts = [
    ...SERVICE_AREA.polygon,
    SERVICE_AREA.center,
    ...stops.filter((s) => s.home?.pinSaved).map((s) => s.home),
  ];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.004;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const W = 480;
  const H = 320;
  const x = (lng) => ((lng - minLng) / (maxLng - minLng)) * W;
  const y = (lat) => H - ((lat - minLat) / (maxLat - minLat)) * H;

  return (
    <div
      className='w-full flex flex-col'
      style={{
        gap: 'var(--dim-space-200, 8px)',
        padding: 'var(--dim-space-300, 12px)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
        background: 'var(--surface-card-100, #FFFFFF)',
      }}
    >
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <span className='text-brand-500'><Icon name='map' size={18} /></span>
        <span style={{
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-bold)',
          color: 'var(--text-content-default, #363B3F)',
        }}>
          {SERVICE_AREA.label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width='100%'
        role='img'
        aria-label={`แผนผังจุดเยี่ยม ${stops.length} จุดภายใน${SERVICE_AREA.label}`}
        style={{ display: 'block', borderRadius: 'var(--dim-radius-300, 10px)', background: 'var(--surface-neutral-quaternary, #F9FBFB)' }}
      >
        <polygon
          points={SERVICE_AREA.polygon.map((p) => `${x(p.lng)},${y(p.lat)}`).join(' ')}
          fill='var(--surface-brandPrimary-quaternary, #F4FBF8)'
          stroke='var(--border-brandPrimary-secondary, #6AD6A5)'
          strokeWidth='2'
          strokeDasharray='6 4'
        />
        <circle cx={x(SERVICE_AREA.center.lng)} cy={y(SERVICE_AREA.center.lat)} r='7' fill='var(--surface-brandPrimary-default, #007549)' />
        <text
          x={x(SERVICE_AREA.center.lng) + 12}
          y={y(SERVICE_AREA.center.lat) + 4}
          style={{ fontSize: 'var(--type-size-xs, 12px)' }}
          fill='var(--text-content-secondary, #636B72)'
        >
          ศูนย์บริการฯ
        </text>
        {stops.filter((s) => s.home?.pinSaved).map((s, i) => {
          const inside = isInsideServiceArea(s.home) !== false;
          const isSel = s.id === selectedId;
          return (
            <g
              key={s.id}
              onClick={() => onSelect?.(s.id)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={x(s.home.lng)}
                cy={y(s.home.lat)}
                r={isSel ? 13 : 10}
                fill={inside ? 'var(--surface-colorfulbadge-teal-bold, #24A899)' : 'var(--surface-pill-red, #FEE2E2)'}
                stroke={isSel ? 'var(--border-brandPrimary-default, #007549)' : 'var(--surface-card-100, #FFFFFF)'}
                strokeWidth='2'
              />
              <text
                x={x(s.home.lng)}
                y={y(s.home.lat) + 4}
                style={{ fontSize: 'var(--type-size-xs, 12px)' }}
                textAnchor='middle'
                fill={inside ? 'var(--surface-card-100, #FFFFFF)' : 'var(--text-pill-red, #B91C1C)'}
              >
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
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
  /* §1.18.2 (มติ คทง.4) — วาดขอบเขตพื้นที่บริการแทนแผนที่วาดมือใน Family Folder */
  const outside = pinned.filter((s) => isInsideServiceArea(s.home) === false);

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
      {/* แบนเนอร์ "แผนที่จำลอง (mock)" ถูกถอดออก (มติผู้ใช้ 2 ก.ย. 69) */}

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
                onOpenRecord={onOpenRecord}
              />
            ))}
          </div>
        </div>

        {/* แผนที่พื้นที่รับผิดชอบกับแผนที่บ้านของจุดที่เลือกอยู่ "ข้างกัน"
            (มติผู้ใช้ 2 ก.ย. 69) — กดเลขบนแผนที่แล้วเห็นตำแหน่งบ้านทันที
            โดยไม่ต้องเลื่อนลงไปดูใต้แผนที่ · จอแคบจะยุบลงมาเรียงกันเอง */}
        <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)', flex: '2 1 640px', minWidth: 320 }}>
          <div className='flex flex-col' style={{ flex: '1 1 320px', minWidth: 280 }}>
            <ServiceAreaMap stops={stops} selectedId={selected?.id} onSelect={onSelect} />
          </div>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', flex: '1 1 320px', minWidth: 280 }}>
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
    </div>
  );
};

export default HomeVisitRouteMapPanel;
