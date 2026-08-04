import React, { useEffect, useRef, useState } from 'react';
import './queueDisplayStyles';
import { FONT_DISPLAY } from './queueDisplayUi';

/* AnnouncementMarquee — แถบประกาศล่างจอ (Figma 129:62178 / 129:62179)

   · สูง 64px = --dim-size-1400 พื้นเป็น gradient teal
     `linear-gradient(90deg, #00A4AC, #1FA091)` — ข้อยกเว้น gradient ตาม
     CLAUDE.md (เขียน inline ได้ ไม่มี token)
   · ข้อความสั้น → จัดกึ่งกลาง "นิ่ง ๆ" ไม่วิ่ง
   · ข้อความยาวเกินความกว้างจอ → วิ่งวนด้วย CSS animation (วัดจริงก่อน
     ไม่ใช่เดาจากจำนวนตัวอักษร) ความเร็วคงที่ ~90px/วินาที
   · ยังไม่ตั้งข้อความ → แถบยังอยู่ (โครงจอสูงเท่าเดิม) แต่แสดงข้อความ
     default แทนคำว่า undefined */

const DEFAULT_TEXT = 'สำนักอนามัย กรุงเทพมหานคร';
const SPEED_PX_PER_SEC = 90;

const AnnouncementMarquee = ({ text, label = 'Announcement:' }) => {
  const viewportRef = useRef(null);
  const measureRef = useRef(null);
  const [duration, setDuration] = useState(0);

  const body = String(text == null ? '' : text).trim() || DEFAULT_TEXT;

  /* วัดความกว้างจริงของข้อความเทียบกับช่องมอง แล้วตัดสินว่าต้องวิ่งไหม
     วัดใหม่ทุกครั้งที่ข้อความเปลี่ยน + ตอน resize (จอ 4:3 แคบกว่า 16:9) */
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const viewport = viewportRef.current;
      const content = measureRef.current;
      if (!viewport || !content) return;
      const overflow = content.scrollWidth - viewport.clientWidth;
      if (overflow > 8) {
        /* ราง marquee มีเนื้อหาสองชุดต่อกัน → เลื่อน 50% คือครบหนึ่งรอบ */
        setDuration((content.scrollWidth + viewport.clientWidth) / SPEED_PX_PER_SEC);
      } else {
        setDuration(0);
      }
    };
    const onResize = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('resize', onResize);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [body, label]);

  const scrolling = duration > 0;

  const textStyle = {
    fontFamily: FONT_DISPLAY,
    fontSize: 'var(--type-size-2xl, 24px)',
    fontWeight: 'var(--type-weight-regular, 400)',
    lineHeight: 1.375,
    color: 'var(--text-content-on-content, #FFFFFF)',
    whiteSpace: 'nowrap',
  };

  const segment = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--dim-space-600, 24px)',
        paddingRight: scrolling ? 'var(--dim-space-2400, 96px)' : 'var(--dim-space-0, 0px)',
      }}
    >
      <span style={textStyle}>{label}</span>
      <span style={textStyle}>{body}</span>
    </span>
  );

  return (
    <div
      role='status'
      aria-live='polite'
      style={{
        position: 'relative',
        width: '100%',
        height: 'var(--dim-size-1400, 64px)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(90deg, #00A4AC 0%, #1FA091 100%)',
        /* Figma ใส่เงาสองชั้นใต้แถบนี้ → ตรงกับ --shadow-card (4px + 8px)
           fallback สะกดตามค่าจริงของ token ไม่ใช่ค่าที่ Figma เขียนไว้ */
        boxShadow:
          'var(--shadow-card, 0px 1px 4px rgba(0,117,73,0.08), 0px 1px 8px rgba(0,117,73,0.10))',
        paddingLeft: 'var(--dim-space-800, 32px)',
        paddingRight: 'var(--dim-space-800, 32px)',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={viewportRef}
        style={{
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: scrolling ? 'flex-start' : 'center',
        }}
      >
        <span
          ref={measureRef}
          className={scrolling ? 'qd-marquee-track' : undefined}
          style={
            scrolling
              ? { animationDuration: `${duration}s`, '--qd-marquee-shift': '-50%' }
              : { display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }
          }
        >
          {segment}
          {/* ชุดที่สองทำให้ข้อความวิ่งต่อเนื่องไม่มีช่องว่างตอนวนกลับ */}
          {scrolling ? segment : null}
        </span>
      </div>
    </div>
  );
};

export default AnnouncementMarquee;
