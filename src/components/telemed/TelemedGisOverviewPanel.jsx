import React, { useMemo, useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import TelemedRpmSparkline from '@/components/telemed/TelemedRpmSparkline';
import { RPM_SOURCE } from '@/data/telemedRpm';
import {
  buildGisPins,
  gisBounds,
  projectPin,
  LOCATION_PRECISION_LABEL,
  LOCATION_PRECISION_HINT,
} from '@/utils/telemedEmr';

/* TelemedGisOverviewPanel — แผนที่รวมจุดประเมินผู้รับบริการทุกราย
   (TOR §1.13.5 "ระบุตำแหน่งของการประเมินผู้รับบริการผ่านแผนที่ GIS")

   ทำไมเป็น component ใหม่: AddressMapBlock ของ design system ปักได้ "หมุดเดียว"
   และเป็นแบบฟอร์มที่ผู้ใช้ลากหมุดเอง (ใช้ตอนลงทะเบียนที่อยู่). ข้อ 1.13.5
   ต้องการภาพรวมหลายหมุดพร้อมกัน + สีตามระดับการเฝ้าระวัง + คลิกหมุดเพื่อดู
   ค่าล่าสุด ซึ่งไม่มีอะไรใน src/components/ รองรับ — จึงสร้างไว้ในโฟลเดอร์ของ
   โมดูล และรายงานผ่าน manifest.newComponents (ยังไม่ยกขึ้น DS จนกว่าจะมีผู้ใช้
   ที่สอง). ต่อ popup รายผู้ป่วยเดิมที่ใช้ AddressMapBlock ไว้อย่างเดิม.

   ⚠️ แผนที่นี้เป็นภาพจำลอง (ไม่มี tile server / ไม่มี Leaflet) พิกัดเป็นข้อมูล
   สาธิต — แบนเนอร์บนพาเนลบอกไว้ตรง ๆ และพาเนลถูกซ่อนตอนสั่งพิมพ์. */

const STYLE_ID = 'mih-telemed-gis-style';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
@media print {
  .mih-telemed-gis { display: none !important; }
}
.mih-telemed-gis-pin {
  background: transparent;
  border: 0;
  padding: 0;
  cursor: pointer;
  line-height: 0;
}
.mih-telemed-gis-pin:focus-visible {
  outline: var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549);
  outline-offset: var(--dim-space-050, 2px);
  border-radius: var(--dim-radius-full, 9999px);
}
`;
  document.head.appendChild(el);
}

/* ระดับการเฝ้าระวัง → สีหมุด (ใช้โทนเดียวกับ StatusBadge/ColorfulBadge) */
const PIN_TONE = {
  critical: { label: 'วิกฤต',      color: 'var(--text-alert-error, #B91C1C)',   badge: 'red',    status: 'error' },
  stale:    { label: 'เฝ้าระวัง',   color: 'var(--text-alert-warning, #C2410C)', badge: 'orange', status: 'warning' },
  device:   { label: 'เฝ้าระวัง',   color: 'var(--text-alert-warning, #C2410C)', badge: 'orange', status: 'warning' },
  warning:  { label: 'เฝ้าระวัง',   color: 'var(--text-alert-warning, #C2410C)', badge: 'orange', status: 'warning' },
  normal:   { label: 'ปกติ',       color: 'var(--text-alert-success, #196C65)', badge: 'green',  status: 'success' },
};

const cardStyle = {
  borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
  background: 'var(--surface-card-100, #FFFFFF)',
  boxShadow: 'var(--shadow-card)',
  paddingTop: 'var(--dim-space-400, 16px)',
  paddingBottom: 'var(--dim-space-400, 16px)',
  paddingLeft: 'var(--dim-space-400, 16px)',
  paddingRight: 'var(--dim-space-400, 16px)',
};

const Legend = () => (
  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {['critical', 'stale', 'normal'].map((lvl) => (
      <span
        key={lvl}
        className='inline-flex items-center'
        style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}
      >
        <Icon name='location_on' size={16} style={{ color: PIN_TONE[lvl].color }} />
        {PIN_TONE[lvl].label}
      </span>
    ))}
  </div>
);

/**
 * @param {object}   props
 * @param {Array}    props.rows        แถวที่ผ่านตัวกรองของกระดานแล้ว — หมุดที่แสดง
 * @param {Array}    [props.boundsRows] แถวทั้งหมดก่อนกรอง ใช้คำนวณกรอบแผนที่
 *                                      เพื่อไม่ให้แผนที่กระโดดเวลาผู้ใช้กรอง
 */
const TelemedGisOverviewPanel = ({
  rows = [],
  boundsRows = null,
  onOpenPatient,
  onCall,
  onPinOpen,
}) => {
  const [selectedId, setSelectedId] = useState(null);

  /* ตัวกรองมีชุดเดียวคือของกระดาน (แท็บวิกฤต/เฝ้าระวัง · ค้นหา · หน่วยบริการ ·
     วันที่) — พาเนลนี้เคยมี dropdown สถานะ/เขต ของตัวเองซ้อนอยู่ ทำให้แผนที่กับ
     ตารางขัดกันได้ จึงถอดออกและอ่านจากตัวกรองเดียวกันกับตาราง */
  const pins = useMemo(() => buildGisPins(rows), [rows]);

  /* กรอบแผนที่คำนวณจากหมุด "ทั้งหมด" เพื่อไม่ให้แผนที่กระโดดตอนกรอง */
  const extentPins = useMemo(
    () => (Array.isArray(boundsRows) && boundsRows.length ? buildGisPins(boundsRows) : pins),
    [boundsRows, pins],
  );
  const bounds = useMemo(() => gisBounds(extentPins), [extentPins]);

  const selected = pins.find((p) => p.id === selectedId) || null;
  const missing = rows.length - pins.length;

  const handlePinClick = (pin) => {
    setSelectedId((cur) => (cur === pin.id ? null : pin.id));
    if (selectedId !== pin.id) onPinOpen?.(pin);
  };

  return (
    <div className='mih-telemed-gis flex flex-col w-full' style={{ ...cardStyle, gap: 'var(--dim-space-300, 12px)' }}>
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-150, 6px)',
            fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
            fontSize: 'var(--type-size-base, 16px)',
            color: 'var(--text-content-default, #363B3F)',
          }}
        >
          <Icon name='map' size={18} style={{ color: 'var(--icon-brandPrimary-default, #007549)' }} />
          แผนที่จุดประเมิน (GIS) — ผู้รับบริการทุกรายบนกระดาน
        </span>
        <div className='flex-1' />
        <Legend />
      </div>

      <div
        className='flex items-start w-full'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: 'var(--surface-alert-info, #F0F6FF)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-alert-info, #DBEAFE)',
          paddingTop: 'var(--dim-space-200, 8px)',
          paddingBottom: 'var(--dim-space-200, 8px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
        }}
      >
        <Icon name='info' size={16} style={{ color: 'var(--text-alert-info, #1D4ED8)', flexShrink: 0 }} />
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)', lineHeight: 1.6 }}>
          แผนที่สาธิต — ไม่มี tile server จริง พิกัดมาจากที่อยู่ที่ลงทะเบียนอุปกรณ์ที่บ้าน
          (ถ้ายังไม่มีพิกัดบ้านจะใช้พิกัดหน่วยบริการต้นทางแทน และระบุไว้ที่หมุดนั้น)
          · ไม่ถูกพิมพ์ออกไปกับรายงาน
        </span>
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <Icon name='filter_alt' size={16} style={{ color: 'var(--text-content-tertiary, #858C92)' }} />
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          {`แผนที่แสดง ${pins.length} จุด ตามตัวกรองของกระดานด้านล่าง (แท็บ · คำค้น · หน่วยบริการ · วันที่)`}
          {missing > 0 ? ` · อีก ${missing} รายยังไม่มีพิกัดในระบบ` : ''}
        </span>
      </div>

      {/* ── ผืนแผนที่จำลอง ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'var(--dim-size-2600, 384px)',
          borderRadius: 'var(--dim-radius-400, 12px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary, #E2E4E6)',
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #F4EFE5 0%, #FBF8F1 45%, #EAF3EC 100%)',
        }}
      >
        {/* เส้นตารางพิกัด (ทุก 25%) */}
        {[25, 50, 75].map((p) => (
          <div
            key={`v-${p}`}
            style={{
              position: 'absolute', top: 0, bottom: 0, left: `${p}%`,
              width: 'var(--dim-stroke-100, 1px)',
              background: 'var(--border-neutral-tertiary, #E2E4E6)',
              opacity: 0.7,
            }}
          />
        ))}
        {[25, 50, 75].map((p) => (
          <div
            key={`h-${p}`}
            style={{
              position: 'absolute', left: 0, right: 0, top: `${p}%`,
              height: 'var(--dim-stroke-100, 1px)',
              background: 'var(--border-neutral-tertiary, #E2E4E6)',
              opacity: 0.7,
            }}
          />
        ))}
        {/* แม่น้ำจำลอง (แถบไล่สี — gradient เป็นข้อยกเว้นเดียวที่ inline ได้) */}
        <div
          style={{
            position: 'absolute', left: '-10%', right: '-10%', top: '62%',
            height: 'var(--dim-size-600, 32px)',
            transform: 'rotate(-8deg)',
            background: 'linear-gradient(90deg, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0.32) 50%, rgba(59,130,246,0.18) 100%)',
          }}
        />

        {/* ป้ายมุมแผนที่ */}
        <span
          style={{
            position: 'absolute', top: 'var(--dim-space-200, 8px)', left: 'var(--dim-space-300, 12px)',
            fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {`เหนือ ${bounds.north.toFixed(3)} · ตะวันตก ${bounds.west.toFixed(3)}`}
        </span>
        <span
          style={{
            position: 'absolute', bottom: 'var(--dim-space-200, 8px)', right: 'var(--dim-space-300, 12px)',
            fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)',
          }}
        >
          {`ใต้ ${bounds.south.toFixed(3)} · ตะวันออก ${bounds.east.toFixed(3)} · MIH Map Mock`}
        </span>

        {pins.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center text-center'
            style={{ position: 'absolute', inset: 0, gap: 'var(--dim-space-150, 6px)' }}
          >
            <Icon name='wrong_location' size={32} style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }} />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
              ไม่พบจุดประเมินตามตัวกรองของกระดาน
            </span>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ล้างคำค้น หรือเลือกแท็บ “ทั้งหมด” ด้านล่างเพื่อดูหมุดทั้งหมด
            </span>
          </div>
        ) : pins.map((pin) => {
          const pos = projectPin(pin, bounds);
          const tone = PIN_TONE[pin.level] || PIN_TONE.normal;
          const active = selectedId === pin.id;
          return (
            <button
              key={pin.id}
              type='button'
              className='mih-telemed-gis-pin'
              aria-label={`จุดประเมินของ ${pin.name} · ${tone.label}`}
              title={`${pin.name} · ${pin.label}`}
              onClick={() => handlePinClick(pin)}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: active ? 'translate(-50%, -100%) scale(1.25)' : 'translate(-50%, -100%)',
                transition: 'transform 120ms ease',
                zIndex: active ? 3 : 2,
              }}
            >
              <Icon name='location_on' size={active ? 32 : 26} style={{ color: tone.color }} />
            </button>
          );
        })}
      </div>

      {/* ── รายละเอียดหมุดที่เลือก ── */}
      {selected ? (
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
          }}
        >
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)', color: 'var(--text-content-default, #363B3F)' }}>
              {selected.name}
            </span>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`HN ${selected.hn}`}
            </span>
            <StatusBadge style={(PIN_TONE[selected.level] || PIN_TONE.normal).status} size='small'>
              {(PIN_TONE[selected.level] || PIN_TONE.normal).label}
            </StatusBadge>
            <ColorfulBadge style={selected.precision === 'home' ? 'teal' : 'grey'} size='small' hierarchy='secondary'>
              {LOCATION_PRECISION_LABEL[selected.precision]}
            </ColorfulBadge>
            <div className='flex-1' />
            <NeutralSubdueButton size='sm' variant='outline' leadingIcon='close' onClick={() => setSelectedId(null)}>
              ปิด
            </NeutralSubdueButton>
          </div>

          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary, #636B72)' }}>
            {`${selected.label} · พิกัด ${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}
          </span>
          <span style={{ fontSize: 'var(--type-size-xxs, 10px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {LOCATION_PRECISION_HINT[selected.precision]}
          </span>

          {selected.row?.latest ? (
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-default, #363B3F)' }}>
                {selected.row.latest.bpSys != null
                  ? `BP ${selected.row.latest.bpSys}/${selected.row.latest.bpDia} mmHg`
                  : selected.row.latest.dtx != null
                    ? `DTX ${selected.row.latest.dtx} mg/dL`
                    : 'ค่าล่าสุด —'}
              </span>
              <ColorfulBadge style={RPM_SOURCE[selected.row.latest.source]?.tone || 'grey'} size='small' hierarchy='secondary'>
                {RPM_SOURCE[selected.row.latest.source]?.label || 'ไม่ทราบที่มา'}
              </ColorfulBadge>
              {selected.row.trend?.length > 0 && (
                <TelemedRpmSparkline
                  width={180}
                  points={selected.row.trend
                    .filter((r) => r.bpSys != null)
                    .map((r) => ({ at: r.at, value: r.bpSys, label: 'SBP' }))}
                  ariaLabel={`แนวโน้มความดันตัวบนของ ${selected.name}`}
                />
              )}
            </div>
          ) : (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ยังไม่มีค่าจากอุปกรณ์ส่งเข้าระบบ
            </span>
          )}

          {selected.row?.alerts?.length > 0 && (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>
              {selected.row.alerts.map((a) => a.detail).join(' · ')}
            </span>
          )}

          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <BrandSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='person'
              onClick={() => onOpenPatient?.(selected.row)}
            >
              ไปที่การ์ดผู้ป่วย
            </BrandSubdueButton>
            {onCall && (
              <NeutralSubdueButton size='sm' variant='outline' leadingIcon='videocam' onClick={() => onCall(selected.row)}>
                เปิดสายปรึกษา
              </NeutralSubdueButton>
            )}
          </div>
        </div>
      ) : (
        <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
          คลิกที่หมุดเพื่อดูค่าล่าสุดของผู้รับบริการรายนั้น (การเปิดดูถูกบันทึกลงประวัติการใช้งาน)
        </span>
      )}
    </div>
  );
};

export default TelemedGisOverviewPanel;
