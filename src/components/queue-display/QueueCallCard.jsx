import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BigQueueNumber from './BigQueueNumber';
import PassedNumbersBlock from './PassedNumbersBlock';
import {
  ELLIPSIS_ONE_LINE,
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  SURFACE_ROW_ALT,
  SURFACE_STRIP,
  accentOf,
} from './queueDisplayUi';
import { formatHm } from '@/data/queueDisplayView';

/* QueueCallCard — การ์ดคิวหนึ่งจุดบริการ ใช้ร่วมกันทั้ง TV1 และ TV3
   (Figma TV1 129:62055 · TV3 129:62302 — โครงเดียวกันเป๊ะ ต่างแค่จำนวน
   คอลัมน์และป้ายชื่อ จึงเขียนครั้งเดียวไม่ทำซ้ำ)

   TV3 ต่างจาก TV1 ตรงที่แถวคิวรองรับ badge สถานะย่อยต่อแถว เช่น
   "กำลังจัดเตรียมยา" (Figma 129:62360 = MIH Colorful Badge style=orange
   hierarchy=secondary) → ใช้ `ColorfulBadge` ตัวจริงจาก DS ไม่วาดใหม่

   Empty states:
   · ไม่มีคิวปัจจุบัน → BigQueueNumber แสดง "—" + "ยังไม่มีคิว"
   · คิวถัดไปน้อยกว่า `rows` → แถวที่เหลือเป็น placeholder สูงเท่าเดิม
     สลับพื้นเหมือนกัน มุมล่าง radius 24px ยังอยู่ที่แถวสุดท้ายจริง
   · ไม่มีคิวถัดไปเลย → แถวแรกเขียน "ไม่มีคิวรอ" */

const ROW_COUNT = 4;

const NextRow = ({ index, total, seq, number, statusLabel, statusBadge, emptyHint }) => {
  const isLast = index === total - 1;
  const alt = index % 2 === 1;
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        height: 'var(--dim-size-1700, 80px)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        background: alt ? SURFACE_ROW_ALT : SURFACE_CARD,
        borderBottomLeftRadius: isLast ? 'var(--dim-radius-600, 24px)' : undefined,
        borderBottomRightRadius: isLast ? 'var(--dim-radius-600, 24px)' : undefined,
      }}
    >
      <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--dim-space-400, 16px)' }}>
        <span
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 'var(--type-size-3xl, 30px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            color: INK_SECONDARY,
            whiteSpace: 'nowrap',
          }}
        >
          {number ? `คิวที่ ${seq}` : emptyHint || ' '}
        </span>
        {statusBadge && statusLabel ? (
          <ColorfulBadge style={statusBadge} size='default' hierarchy='secondary' width='cap'>
            {statusLabel}
          </ColorfulBadge>
        ) : null}
      </div>
      <span
        style={{
          flexShrink: 0,
          fontFamily: FONT_BODY,
          fontSize: 'var(--type-size-5xl, 48px)',
          fontWeight: 'var(--type-weight-bold, 700)',
          lineHeight: 1.25,
          letterSpacing: 'calc(var(--type-size-5xl, 48px) * -0.02)',
          color: INK_STRONG,
          whiteSpace: 'nowrap',
        }}
      >
        {number || ''}
      </span>
    </div>
  );
};

const QueueCallCard = ({ state, pulsing = false, rows = ROW_COUNT }) => {
  if (!state || !state.station) return null;
  const { station, current, next, remaining, passed } = state;
  const accent = accentOf(station.accent);
  const label = state.label || station.label;

  const filled = (next || []).slice(0, rows);
  const placeholders = Math.max(0, rows - filled.length);

  return (
    <div
      style={{
        flex: '1 1 0%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
      }}
    >
      {/* หัวการ์ด 72px พื้นสีประจำแผนก มุมบน radius 24 */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          height: 'var(--dim-size-1600, 72px)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          background: accent,
          borderTopLeftRadius: 'var(--dim-radius-600, 24px)',
          borderTopRightRadius: 'var(--dim-radius-600, 24px)',
        }}
      >
        <span
          title={label}
          style={{
            ...ELLIPSIS_ONE_LINE,
            fontFamily: FONT_DISPLAY,
            fontSize: 'var(--type-size-3xl, 30px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.25,
            letterSpacing: 'calc(var(--type-size-3xl, 30px) * -0.02)',
            color: 'var(--text-content-on-content, #FFFFFF)',
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      </div>

      {/* หมายเลขปัจจุบัน */}
      <div
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--dim-space-300, 12px)',
          background: SURFACE_ROW_ALT,
          paddingTop: 'var(--dim-space-800, 32px)',
          paddingBottom: 'var(--dim-space-800, 32px)',
          paddingLeft: 'var(--dim-space-800, 32px)',
          paddingRight: 'var(--dim-space-800, 32px)',
        }}
      >
        <span
          style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: FONT_DISPLAY,
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.375,
            color: INK_STRONG,
          }}
        >
          หมายเลขปัจจุบัน
        </span>
        <BigQueueNumber
          number={current ? current.number : null}
          accent={accent}
          variant='default'
          pulsing={pulsing}
          ariaLabel={current ? `${label} หมายเลขปัจจุบัน ${current.number}` : `${label} ยังไม่มีคิว`}
        />
        {/* เรียกซ้ำ (1.3.4.3) — คนที่ยืนดูจอโถงรวมต้องรู้ว่าเลขของตัวเองถูก
            เรียกซ้ำแล้ว ไม่ใช่รู้เฉพาะบนจอเฉพาะจุดบริการ (TV2) กับคอนโซล */}
        {current && current.callCount > 1 ? (
          <span
            style={{
              width: '100%',
              textAlign: 'center',
              fontFamily: FONT_BODY,
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.375,
              color: INK_SECONDARY,
            }}
          >
            {`เรียกครั้งที่ ${current.callCount}${current.calledAt ? ` · ${formatHm(current.calledAt)} น.` : ''}`}
          </span>
        ) : null}
      </div>

      {/* คิวถัดไป */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 'var(--dim-size-1000, 48px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            background: SURFACE_STRIP,
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: INK_STRONG,
              whiteSpace: 'nowrap',
            }}
          >
            คิวถัดไป
          </span>
        </div>

        {filled.map((row, i) => (
          <NextRow
            key={row.number}
            index={i}
            total={rows}
            seq={row.seq}
            number={row.number}
            statusLabel={row.statusLabel}
            statusBadge={row.statusBadge}
          />
        ))}
        {Array.from({ length: placeholders }).map((_, i) => (
          <NextRow
            // eslint-disable-next-line react/no-array-index-key
            key={`qd-placeholder-${i}`}
            index={filled.length + i}
            total={rows}
            emptyHint={filled.length === 0 && i === 0 ? 'ไม่มีคิวรอ' : ''}
          />
        ))}
      </div>

      {/* คิวที่เหลือทั้งหมด */}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--dim-space-400, 16px)',
          background: SURFACE_CARD,
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          borderBottomLeftRadius: 'var(--dim-radius-400, 12px)',
          borderBottomRightRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <span
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            lineHeight: 1.25,
            letterSpacing: 'calc(var(--type-size-lg, 18px) * -0.02)',
            color: INK_SECONDARY,
          }}
        >
          คิวที่เหลือทั้งหมด
        </span>
        <span
          style={{
            flexShrink: 0,
            fontFamily: FONT_BODY,
            fontSize: 'var(--type-size-2xl, 24px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.25,
            letterSpacing: 'calc(var(--type-size-2xl, 24px) * -0.02)',
            color: INK_SECONDARY,
            opacity: 0.7,
          }}
        >
          {remaining == null ? 0 : remaining}
        </span>
      </div>

      <PassedNumbersBlock passed={passed} variant='card' maxVisible={4} />
    </div>
  );
};

export default QueueCallCard;
