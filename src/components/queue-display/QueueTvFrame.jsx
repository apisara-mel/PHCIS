import React, { useCallback, useEffect, useRef } from 'react';
import './queueDisplayStyles';
import AnnouncementMarquee from './AnnouncementMarquee';
import {
  AnamaiLogo,
  CANVAS_H,
  CANVAS_W,
  ClockGlyph24,
  ELLIPSIS_ONE_LINE,
  FONT_BODY,
  FONT_DISPLAY,
  INK_BRANDTAG,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  Sym,
  BORDER_HAIRLINE,
} from './queueDisplayUi';
import {
  useIdleCursor,
  useQueueSnapshot,
  useScreenWakeLock,
  useTickingClock,
  useTvScale,
} from './queueDisplayHooks';
import {
  formatClock,
  formatHm,
  formatThaiDate,
  isDemoAutoCallRunning,
} from '@/data/queueDisplayView';

/* QueueTvFrame — โครงร่วมของจอ TV ทั้งสามแบบ (Figma header 129:62041 +
   แถบประกาศ 129:62178) ครอบ header · เนื้อจอ · แถบประกาศ · overlay สถานะ

   ── การสเกล ──────────────────────────────────────────────────────────────
   canvas ออกแบบไว้ 1920×1270 แล้วสเกลทั้งผืนแบบ contain ด้วย
   transform: scale(min(vw/1920, vh/1270)) จุดหมุนกลางจอ → พอดีทุกอัตราส่วน
   (16:9 · 16:10 · 4:3 · 21:9 · 4K) โดยไม่ยืดสัดส่วนและไม่มี scrollbar
   ตัวเลข 1920/1270 เป็น "หน่วยของสมการ layout" ไม่ใช่ค่า visual จึงไม่ต้อง
   alias token — ค่าภายใน canvas ทุกตัวยัง alias token ตามปกติ

   ── สถานะพิเศษบนจอ ───────────────────────────────────────────────────────
   · stale (ตัวรับข้อมูลของจอค้าง) → แถบ "กำลังเชื่อมต่อ..." ทับส่วนหัว
     จอ TV ไม่มีคนคุม ห้ามค้างเป็นภาพนิ่งที่ดูเหมือนข้อมูลจริง
     ⚠ "ไม่มีใครกดเรียกคิว" ไม่ใช่ stale — ดู `lastCallAt` ด้านล่าง
   · lastCallAt เก่ากว่า IDLE_CALL_MS → แถบเงียบ ๆ "ไม่มีการเรียกคิวมาแล้ว
     N นาที" (ข้อเท็จจริง ไม่ใช่คำเตือนว่าระบบพัง)
   · โหมดสาธิตกำลังทำงาน → แถบถาวรบอกว่าคิวบนจอถูกเรียกอัตโนมัติ
   · เสียงปิด / browser ไม่รองรับ → ไอคอนลำโพงปิดมุมจอ (เงียบ ไม่มี error) */

const FACILITY_NAME = 'สำนักอนามัย';

/** เกินเท่านี้ถือว่า "คิวไม่ขยับ" — 10 นาทีคือช่วงที่เจ้าหน้าที่ควรรู้ตัว
    แต่ยังไม่ตื่นตูมกับช่วงคนไข้เข้าห้องตรวจนาน */
const IDLE_CALL_MS = 10 * 60 * 1000;

const QueueTvFrame = ({
  title,
  centerName = 'ศูนย์ 4 ดินแดง',
  announcement,
  stale = false,
  lastBeat,
  /** เวลาที่คิวบนจอนี้ถูกเรียกล่าสุด (null = ยังไม่เริ่มเรียกวันนี้) */
  lastCallAt = null,
  soundOn = false,
  soundSupported = true,
  children,
}) => {
  const rootRef = useRef(null);
  const scale = useTvScale(rootRef);
  const now = useTickingClock(1000);
  const cursorIdle = useIdleCursor(4000);
  useScreenWakeLock(true);

  /* โหมดสาธิตเปลี่ยนสถานะ → queueDisplayView notify subscriber ของจอ */
  const [demoRunning] = useQueueSnapshot(useCallback(() => isDemoAutoCallRunning(), []));

  const idleMs = lastCallAt ? now.getTime() - lastCallAt : 0;
  const idleMinutes = idleMs > IDLE_CALL_MS ? Math.floor(idleMs / 60000) : 0;

  /* จอเต็มหน้าจอ — กัน scrollbar ของ body โผล่บนอัตราส่วนที่ letterbox
     คืนค่าเดิมตอน unmount เพื่อไม่ให้หน้าอื่นในแอปพัง */
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cursorIdle ? 'qd-cursor-hidden' : undefined}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: 'hidden',
        background: SURFACE_CARD,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className='qd-canvas'
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          flexDirection: 'column',
          background: SURFACE_CARD,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--dim-space-600, 24px)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            borderBottomStyle: 'solid',
            borderBottomWidth: 'var(--dim-stroke-200, 2px)',
            borderBottomColor: BORDER_HAIRLINE,
          }}
        >
          {/* Figma ตรึงกล่องซ้าย/ขวาไว้ที่ 216/190px เพื่อให้ชื่อกลางจออยู่
              กึ่งกลางพอดี — ที่นี่ให้ทั้งสองฝั่ง hug ตามเนื้อหาแทน เพราะชื่อ
              ศูนย์บริการและวันที่ไทยยาวไม่เท่ากันในแต่ละศูนย์ ถ้าตรึงความกว้าง
              ข้อความจะถูกตัดทิ้ง (ไม่มี token สำหรับ 216/190px ด้วย) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-300, 12px)',
              flexShrink: 0,
            }}
          >
            <AnamaiLogo />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', minWidth: 0 }}>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-2xl, 24px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  lineHeight: 1.25,
                  color: INK_STRONG,
                }}
              >
                {FACILITY_NAME}
              </span>
              <span
                title={centerName}
                style={{
                  ...ELLIPSIS_ONE_LINE,
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  lineHeight: 1.375,
                  color: INK_BRANDTAG,
                }}
              >
                {centerName}
              </span>
            </div>
          </div>

          <h1
            title={title}
            style={{
              ...ELLIPSIS_ONE_LINE,
              flex: '1 1 0%',
              margin: 0,
              textAlign: 'center',
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-4xl, 36px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.375,
              color: INK_STRONG,
            }}
          >
            {title}
          </h1>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
              <ClockGlyph24 />
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-3xl, 30px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  lineHeight: 1.375,
                  color: INK_STRONG,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatClock(now)}
              </span>
            </div>
            <span
              style={{
                width: '100%',
                textAlign: 'right',
                fontFamily: FONT_DISPLAY,
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-regular, 400)',
                lineHeight: 1.375,
                color: INK_SECONDARY,
                whiteSpace: 'nowrap',
              }}
            >
              {formatThaiDate(now)}
            </span>
          </div>
        </div>

        {/* ── เนื้อจอ ─────────────────────────────────────────────────── */}
        <div style={{ flex: '1 1 0%', minHeight: 0, width: '100%', display: 'flex', position: 'relative' }}>
          {children}
        </div>

        {/* ── แถบประกาศ ──────────────────────────────────────────────── */}
        <AnnouncementMarquee text={announcement} />

        {/* ── overlay: ตัวรับข้อมูลของจอค้าง ─────────────────────────── */}
        {stale ? (
          <div
            role='alert'
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--dim-space-300, 12px)',
              height: 'var(--dim-size-1400, 64px)',
              background: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
              color: 'var(--text-colorfulbadge-orange, #C2410C)',
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            <Sym name='sync_problem' size={32} color='var(--text-colorfulbadge-orange, #C2410C)' />
            <span>
              {`กำลังเชื่อมต่อ... ข้อมูลอัปเดตล่าสุดเมื่อ ${lastBeat ? formatHm(lastBeat) : '—'} น.`}
            </span>
          </div>
        ) : null}

        {/* ── overlay: คิวไม่ขยับ (ข้อเท็จจริง ไม่ใช่ error) ─────────── */}
        {!stale && idleMinutes ? (
          <div
            role='status'
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 18,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--dim-space-300, 12px)',
              height: 'var(--dim-size-1400, 64px)',
              background: 'var(--surface-neutral-tertiary, #F4F5F5)',
              color: INK_SECONDARY,
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-2xl, 24px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            <Sym name='schedule' size={32} color={INK_SECONDARY} />
            <span>
              {`ไม่มีการเรียกคิวมาแล้ว ${idleMinutes} นาที · เรียกล่าสุด ${formatHm(lastCallAt)} น.`}
            </span>
          </div>
        ) : null}

        {/* ── overlay: โหมดสาธิต ─────────────────────────────────────
            คิวบนจอถูกเรียกอัตโนมัติ ผู้ที่เดินมาเห็นจอต้องรู้ว่านี่ไม่ใช่
            คิวจริงของหน่วยบริการ และเจ้าหน้าที่ต้องรู้ว่าจะไปปิดได้ที่ไหน */}
        {demoRunning ? (
          <div
            role='status'
            style={{
              position: 'absolute',
              left: 'var(--dim-space-600, 24px)',
              bottom: 'calc(var(--dim-size-1400, 64px) + var(--dim-space-300, 12px))',
              zIndex: 15,
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              background: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
              color: 'var(--text-colorfulbadge-yellow, #A16207)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              paddingTop: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-200, 8px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              fontFamily: FONT_BODY,
              fontSize: 'var(--type-size-xl, 20px)',
              fontWeight: 'var(--type-weight-medium, 500)',
            }}
          >
            <Sym name='autoplay' size={24} color='var(--text-colorfulbadge-yellow, #A16207)' />
            <span>โหมดสาธิตกำลังทำงาน — คิวถูกเรียกอัตโนมัติ (ปิดได้ที่หน้าเลือกจอ)</span>
          </div>
        ) : null}

        {/* ── overlay: สถานะเสียง ────────────────────────────────────── */}
        {!soundOn || !soundSupported ? (
          <div
            title={
              soundSupported
                ? 'เสียงเรียกคิวถูกปิดอยู่ — เปิดได้จากหน้าเลือกจอ'
                : 'อุปกรณ์นี้ไม่รองรับเสียงเรียกคิวอัตโนมัติ'
            }
            style={{
              position: 'absolute',
              right: 'var(--dim-space-600, 24px)',
              bottom: 'calc(var(--dim-size-1400, 64px) + var(--dim-space-300, 12px))',
              zIndex: 15,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'var(--dim-size-800, 40px)',
              height: 'var(--dim-size-800, 40px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'var(--surface-neutral-tertiary, #F4F5F5)',
              opacity: 0.85,
            }}
          >
            <Sym name='volume_off' size={24} color={INK_SECONDARY} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default QueueTvFrame;
