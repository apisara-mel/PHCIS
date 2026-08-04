import React, { useEffect, useRef, useState } from 'react';
import './queueDisplayStyles';
import {
  ClockGlyph32,
  FONT_BODY,
  FONT_DISPLAY,
  INK_DANGER,
  INK_SECONDARY,
  SURFACE_CARD,
  SURFACE_STRIP,
  TriangleAlertGlyph,
} from './queueDisplayUi';

/* PassedNumbersBlock — "หมายเลขที่เรียกผ่านไปแล้ว"

   variant='card'  Figma TV1 129:62484 / TV3 129:62325
                   หัวข้อ 18px + ชิปเลข 48px สูง radius 12 + บรรทัดเตือนแดง
   variant='bar'   Figma TV2 129:62509
                   แถบล่างซ้ายเต็มความกว้าง: clock 32 + หัวข้อ 30px +
                   triangle-alert + "กรุณาติดต่อเจ้าหน้าที่" + แถวชิป 72px

   Edge cases:
   · ไม่มีหมายเลขที่เรียกผ่าน → **ซ่อนทั้งบล็อกรวมบรรทัดเตือนสีแดง**
     (ไม่แสดงคำเตือนลอย ๆ โดยไม่มีเลข)
   · เกิน `maxVisible` ใบ → แสดง N ใบล่าสุด + ชิป "+X" และเลื่อนแนวนอนได้
     โดยความสูงบล็อกไม่เปลี่ยน */

const Chip = ({ children, tall }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      height: tall ? 'var(--dim-size-1600, 72px)' : 'var(--dim-size-1000, 48px)',
      paddingLeft: tall ? 'var(--dim-space-800, 32px)' : 'var(--dim-space-300, 12px)',
      paddingRight: tall ? 'var(--dim-space-800, 32px)' : 'var(--dim-space-300, 12px)',
      borderRadius: tall ? 'var(--dim-radius-450, 14px)' : 'var(--dim-radius-400, 12px)',
      background: SURFACE_STRIP,
      fontFamily: FONT_BODY,
      fontSize: tall ? 'var(--type-size-4xl, 36px)' : 'var(--type-size-2xl, 24px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      lineHeight: 1.25,
      letterSpacing: tall ? 'var(--dim-space-0, 0px)' : undefined,
      color: INK_SECONDARY,
      opacity: 0.7,
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </span>
);

const WarningLine = ({ text, size, bold }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--dim-space-300, 12px)',
      whiteSpace: 'nowrap',
    }}
  >
    <TriangleAlertGlyph />
    <span
      style={{
        fontFamily: bold ? FONT_BODY : FONT_DISPLAY,
        fontSize: size,
        fontWeight: bold ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-medium, 500)',
        lineHeight: 1.25,
        color: INK_DANGER,
      }}
    >
      {text}
    </span>
  </span>
);

const PassedNumbersBlock = ({
  passed = [],
  variant = 'card',
  maxVisible = 4,
  accent,
}) => {
  const scrollRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  const list = Array.isArray(passed) ? passed : [];
  const visible = list.slice(0, maxVisible);
  const hidden = Math.max(0, list.length - visible.length);

  /* เลื่อนแนวนอนอัตโนมัติเมื่อชิปล้นแถว (จอ TV ไม่มีคนปัด) */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const check = () => setOverflowing(node.scrollWidth - node.clientWidth > 4);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [list.length]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !overflowing) return undefined;
    let dir = 1;
    const id = window.setInterval(() => {
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      let next = node.scrollLeft + dir * 40;
      if (next >= max) {
        next = max;
        dir = -1;
      } else if (next <= 0) {
        next = 0;
        dir = 1;
      }
      node.scrollLeft = next;
    }, 1200);
    return () => window.clearInterval(id);
  }, [overflowing]);

  /* ไม่มีเลขที่เรียกผ่าน → ซ่อนทั้งบล็อก (รวมบรรทัดเตือน) */
  if (list.length === 0) return null;

  if (variant === 'bar') {
    return (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: SURFACE_CARD,
          borderTopStyle: 'solid',
          borderTopWidth: 'var(--dim-stroke-200, 2px)',
          borderTopColor: SURFACE_STRIP,
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--dim-space-600, 24px)',
            minWidth: 0,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', minWidth: 0 }}>
            <ClockGlyph32 color={accent || INK_SECONDARY} />
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: 'var(--type-size-3xl, 30px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                lineHeight: 1.2,
                color: INK_SECONDARY,
                whiteSpace: 'nowrap',
              }}
            >
              หมายเลขที่เรียกผ่านไปแล้ว (Passed Numbers)
            </span>
          </span>
          <WarningLine text='กรุณาติดต่อเจ้าหน้าที่' size='var(--type-size-2xl, 24px)' bold />
        </div>

        <div
          ref={scrollRef}
          className='qd-hscroll'
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-400, 16px)', width: '100%' }}
        >
          {visible.map((p) => (
            <Chip key={p.number} tall>{p.number}</Chip>
          ))}
          {hidden > 0 ? <Chip tall>{`+${hidden}`}</Chip> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        background: SURFACE_CARD,
        borderBottomLeftRadius: 'var(--dim-radius-400, 12px)',
        borderBottomRightRadius: 'var(--dim-radius-400, 12px)',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--dim-space-400, 16px)',
      }}
    >
      <span
        style={{
          width: '100%',
          fontFamily: FONT_DISPLAY,
          fontSize: 'var(--type-size-lg, 18px)',
          fontWeight: 'var(--type-weight-medium, 500)',
          lineHeight: 1.25,
          letterSpacing: 'calc(var(--type-size-lg, 18px) * -0.02)',
          color: INK_SECONDARY,
        }}
      >
        หมายเลขที่เรียกผ่านไปแล้ว:
      </span>

      <div
        ref={scrollRef}
        className='qd-hscroll'
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-400, 16px)', width: '100%' }}
      >
        {visible.map((p) => (
          <Chip key={p.number}>{p.number}</Chip>
        ))}
        {hidden > 0 ? <Chip>{`+${hidden}`}</Chip> : null}
      </div>

      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--dim-space-300, 12px)',
          background: SURFACE_CARD,
          borderRadius: 'var(--dim-radius-400, 12px)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
        }}
      >
        <WarningLine
          text='หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่'
          size='var(--type-size-xl, 20px)'
        />
      </div>
    </div>
  );
};

export default PassedNumbersBlock;
