import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HallDisplayPage from './HallDisplayPage';
import StationDisplayPage from './StationDisplayPage';
import FinanceDisplayPage from './FinanceDisplayPage';
import {
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  SURFACE_ROW_ALT,
  SURFACE_STRIP,
  Sym,
  accentOf,
} from '@/components/queue-display/queueDisplayUi';
import {
  STORAGE_KEYS,
  useFullscreen,
  useQueueAnnouncer,
  useStoredSetting,
} from '@/components/queue-display/queueDisplayHooks';
import {
  QUEUE_CENTER_SITE,
  QUEUE_STATIONS,
  QUEUE_ZONES,
  buildSpeechText,
  isDemoAutoCallRunning,
  startDemoAutoCall,
  stopDemoAutoCall,
} from '@/data/queueDisplayView';

/* QueueDisplayLauncherPage — /queue-center/display

   (ก) มี ?layout=hall|station|finance → render เลย์เอาต์นั้นทันที (ส่ง
       ?zone= / ?room= / ?dept= ต่อไปให้หน้าจอ) เพื่อให้ตั้งจอ TV ด้วย URL
       เดียวได้ และเปิดซ้ำเองหลังไฟดับ
   (ข) ไม่มี query → หน้าเลือกจอ: การ์ด 3 เลย์เอาต์ + ตัวควบคุมประจำเครื่อง
       · เปิด/ปิดเสียงเรียกคิว + ปุ่มทดสอบเสียง (รับ user gesture ครั้งแรก
         ซึ่ง browser ต้องการก่อนอนุญาตให้ SpeechSynthesis เล่นบนจอ TV)
       · โหมดเต็มจอ (Fullscreen API)
       · เลือกโซน / จุดบริการ
       · ลิงก์ "จอควบคุมการเรียกคิว" + QR ของหน้าติดตามคิวออนไลน์
   ค่าที่เลือกถูกเก็บใน localStorage ทั้งหมด

   TOR: 1.3.4.1 (ส่งภาพไปยังจอ) · 1.3.4.2 (เปิด/ปิด + ทดสอบเสียง)

   หน้านี้เป็น standalone ไม่มี Sidebar/Header ของแอป — แบบเดียวกับ /kiosk */

const LAYOUTS = [
  {
    key: 'hall',
    title: 'จอโถงรวม (Main Hall)',
    caption: '3 คอลัมน์ — ซักประวัติ / ห้องตรวจ / การเงินและรับยา',
    icon: 'grid_view',
    path: '/queue-center/display/hall',
    accent: 'blue',
    needs: 'zone',
  },
  {
    key: 'station',
    title: 'จอเฉพาะจุดบริการ',
    caption: 'เลขคิวขนาดใหญ่ + คิวถัดไป 6 คิว สำหรับติดหน้าห้องตรวจ',
    icon: 'tv',
    path: '/queue-center/display/station',
    accent: 'pink',
    needs: 'station',
  },
  {
    key: 'finance',
    title: 'จอการเงินและรับยา',
    caption: '2 คอลัมน์ — คิวชำระเงิน / คิวรับยา พร้อมสถานะจัดยา',
    icon: 'payments',
    path: '/queue-center/display/finance',
    accent: 'indigo',
    needs: 'zone',
  },
];

const panel = {
  background: SURFACE_CARD,
  borderRadius: 'var(--dim-radius-500, 16px)',
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
  borderColor: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card-strong)',
  boxSizing: 'border-box',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
};

const btnBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--dim-space-200, 8px)',
  minHeight: 'var(--dim-size-900, 44px)',
  paddingTop: 'var(--dim-space-300, 12px)',
  paddingBottom: 'var(--dim-space-300, 12px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
  borderRadius: 'var(--dim-radius-450, 14px)',
  cursor: 'pointer',
  fontFamily: FONT_BODY,
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-medium, 500)',
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
};

const primaryBtn = {
  ...btnBase,
  background: 'var(--surface-brandPrimaryButton-default, #007549)',
  borderColor: 'var(--surface-brandPrimaryButton-default, #007549)',
  color: 'var(--text-content-on-content, #FFFFFF)',
};

const ghostBtn = {
  ...btnBase,
  background: SURFACE_CARD,
  borderColor: 'var(--border-card-default, #E2E4E6)',
  color: INK_STRONG,
};

/** พรีวิวย่อของเลย์เอาต์ — วาดจากบล็อกสี ไม่ใช่ภาพ screenshot ที่จะเก่า */
const LayoutThumb = ({ layoutKey, accent }) => {
  const tint = accentOf(accent);
  /* คืน element ของ list → ต้องมี key ทุกใบ ไม่งั้น console เต็มไปด้วย
     "Each child in a list should have a unique key" จนกลบ warning จริง */
  const block = (flex, i) => (
    <div
      key={`qd-thumb-${layoutKey}-${i}`}
      style={{
        flex: `${flex} 1 0%`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-100, 4px)',
        minWidth: 0,
      }}
    >
      <div style={{ height: 'var(--dim-space-200, 8px)', background: tint, borderTopLeftRadius: 'var(--dim-radius-100, 4px)', borderTopRightRadius: 'var(--dim-radius-100, 4px)' }} />
      <div style={{ flex: '1 1 0%', background: SURFACE_CARD, borderStyle: 'solid', borderWidth: 'var(--dim-stroke-200, 2px)', borderColor: tint, borderRadius: 'var(--dim-radius-100, 4px)' }} />
      <div style={{ height: 'var(--dim-space-300, 12px)', background: SURFACE_STRIP, borderRadius: 'var(--dim-radius-100, 4px)' }} />
    </div>
  );

  return (
    <div
      aria-hidden
      style={{
        height: 'var(--dim-size-1900, 112px)',
        background: SURFACE_ROW_ALT,
        borderRadius: 'var(--dim-radius-300, 10px)',
        display: 'flex',
        gap: 'var(--dim-space-200, 8px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        paddingLeft: 'var(--dim-space-200, 8px)',
        paddingRight: 'var(--dim-space-200, 8px)',
        boxSizing: 'border-box',
      }}
    >
      {layoutKey === 'hall' ? [block(1, 0), block(1, 1), block(1, 2)] : null}
      {layoutKey === 'finance' ? [block(1, 0), block(1, 1)] : null}
      {layoutKey === 'station' ? [block(2, 0), block(1, 1)] : null}
    </div>
  );
};

const QueueDisplayLauncherPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const layoutParam = params.get('layout');

  const [soundOn, setSoundOn] = useStoredSetting(STORAGE_KEYS.sound, false);
  const [zoneId, setZoneId] = useStoredSetting(STORAGE_KEYS.zone, 'hall');
  const [stationId, setStationId] = useStoredSetting(STORAGE_KEYS.station, 'st-opd');
  const [demoOn, setDemoOn] = useState(() => isDemoAutoCallRunning());
  const [testResult, setTestResult] = useState(null);

  const { supported, hasThaiVoice, speak } = useQueueAnnouncer(true);
  const { active: fullscreen, toggle: toggleFullscreen } = useFullscreen();

  /* โหมดสาธิตเป็น interval ระดับ module และ **ตั้งใจให้เดินต่อหลังออกจาก
     หน้านี้** เพราะขั้นตอนใช้งานคือ "เปิดโหมดสาธิต → กดเปิดจอ TV → ดูคิว
     ขยับ" ถ้า cleanup ตอน unmount ฟีเจอร์จะใช้ไม่ได้เลย
     แลกกับข้อนี้: จอ TV ทั้งสามแบบแสดงแถบ "โหมดสาธิตกำลังทำงาน" ถาวร
     (QueueTvFrame) และคอนโซลจอมีปุ่มหยุด — ไม่มีทางที่คิวจะขยับเองโดยไม่มี
     affordance ให้ปิด */
  useEffect(() => {
    if (demoOn) startDemoAutoCall(15000);
    else stopDemoAutoCall();
  }, [demoOn]);

  const handleTestSound = useCallback(() => {
    /* กดปุ่มนี้คือ user gesture ที่ browser ต้องการ ก่อนอนุญาตให้จอ TV
       พูดเองอัตโนมัติในภายหลัง */
    const ok = speak(buildSpeechText('A-123', 'ห้องตรวจ OPD ทั่วไป', 1));
    setSoundOn(true);
    setTestResult(ok ? 'ok' : 'blocked');
  }, [speak, setSoundOn]);

  /* (ก) มี ?layout= → แสดงจอนั้นเลย */
  if (layoutParam === 'hall') return <HallDisplayPage />;
  if (layoutParam === 'station') return <StationDisplayPage />;
  if (layoutParam === 'finance') return <FinanceDisplayPage />;

  const onlineUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/queue-center/display/online`
    : '/queue-center/display/online';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(onlineUrl)}`;

  const linkFor = (layout) => {
    if (layout.needs === 'station') return `${layout.path}?room=${encodeURIComponent(stationId)}`;
    return `${layout.path}?zone=${encodeURIComponent(layout.key === 'finance' ? 'finance' : zoneId)}`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
        boxSizing: 'border-box',
        paddingTop: 'var(--dim-space-800, 32px)',
        paddingBottom: 'var(--dim-space-800, 32px)',
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ maxWidth: 1120, marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-600, 24px)' }}>
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-3xl, 30px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: INK_STRONG,
            }}
          >
            จอแสดงผลการเรียกคิว
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--type-size-base, 16px)', color: INK_SECONDARY }}>
            {`${QUEUE_CENTER_SITE.name} · ${QUEUE_CENTER_SITE.office}`}
          </p>
        </header>

        {/* ── การ์ดเลือกเลย์เอาต์ ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 'var(--dim-space-600, 24px)', flexWrap: 'wrap' }}>
          {LAYOUTS.map((layout) => (
            <div key={layout.key} style={{ ...panel, flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
              <LayoutThumb layoutKey={layout.key} accent={layout.accent} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-200, 8px)' }}>
                <Sym name={layout.icon} size={24} color={accentOf(layout.accent)} />
                <span style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: INK_STRONG }}>
                  {layout.title}
                </span>
              </div>
              <p style={{ margin: 0, flex: '1 1 auto', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.5 }}>
                {layout.caption}
              </p>

              {layout.needs === 'zone' && layout.key === 'hall' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
                  โซนที่จอนี้ตั้งอยู่
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    style={{
                      minHeight: 'var(--dim-size-800, 40px)',
                      borderRadius: 'var(--dim-radius-400, 12px)',
                      borderStyle: 'solid',
                      borderWidth: 'var(--dim-stroke-100, 1px)',
                      borderColor: 'var(--border-card-default, #E2E4E6)',
                      background: SURFACE_CARD,
                      color: INK_STRONG,
                      fontFamily: FONT_BODY,
                      fontSize: 'var(--type-size-base, 16px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                    }}
                  >
                    {QUEUE_ZONES.map((z) => (
                      <option key={z.id} value={z.id}>{z.label}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {layout.needs === 'station' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
                  จุดบริการ / ห้องตรวจ
                  <select
                    value={stationId}
                    onChange={(e) => setStationId(e.target.value)}
                    style={{
                      minHeight: 'var(--dim-size-800, 40px)',
                      borderRadius: 'var(--dim-radius-400, 12px)',
                      borderStyle: 'solid',
                      borderWidth: 'var(--dim-stroke-100, 1px)',
                      borderColor: 'var(--border-card-default, #E2E4E6)',
                      background: SURFACE_CARD,
                      color: INK_STRONG,
                      fontFamily: FONT_BODY,
                      fontSize: 'var(--type-size-base, 16px)',
                      paddingLeft: 'var(--dim-space-300, 12px)',
                      paddingRight: 'var(--dim-space-300, 12px)',
                    }}
                  >
                    {QUEUE_STATIONS.filter((s) => s.active).map((s) => (
                      <option key={s.id} value={s.id}>{`${s.label} · ${s.zone}`}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <Link to={linkFor(layout)} style={{ ...primaryBtn, textDecoration: 'none' }}>
                <Sym name='play_arrow' size={20} color='var(--text-content-on-content, #FFFFFF)' />
                เปิดจอนี้
              </Link>
            </div>
          ))}
        </div>

        {/* ── ตัวควบคุมประจำเครื่อง ──────────────────────────────────── */}
        <div style={{ ...panel, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
            ตั้งค่าประจำจอนี้
          </h2>

          <div style={{ display: 'flex', gap: 'var(--dim-space-300, 12px)', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type='button'
              onClick={() => setSoundOn(!soundOn)}
              disabled={!supported}
              aria-pressed={soundOn}
              style={{
                ...(soundOn ? primaryBtn : ghostBtn),
                cursor: supported ? 'pointer' : 'not-allowed',
                opacity: supported ? 1 : 0.55,
              }}
            >
              <Sym
                name={soundOn ? 'volume_up' : 'volume_off'}
                size={20}
                color={soundOn ? 'var(--text-content-on-content, #FFFFFF)' : INK_STRONG}
              />
              {soundOn ? 'เสียงเรียกคิว: เปิด' : 'เสียงเรียกคิว: ปิด'}
            </button>

            <button type='button' onClick={handleTestSound} disabled={!supported} style={{ ...ghostBtn, cursor: supported ? 'pointer' : 'not-allowed', opacity: supported ? 1 : 0.55 }}>
              <Sym name='hearing' size={20} color={INK_STRONG} />
              ทดสอบเสียง
            </button>

            <button type='button' onClick={toggleFullscreen} style={ghostBtn}>
              <Sym name={fullscreen ? 'fullscreen_exit' : 'fullscreen'} size={20} color={INK_STRONG} />
              {fullscreen ? 'ออกจากเต็มจอ' : 'เข้าโหมดเต็มจอ'}
            </button>

            <button type='button' onClick={() => setDemoOn(!demoOn)} aria-pressed={demoOn} style={demoOn ? primaryBtn : ghostBtn}>
              <Sym name='autoplay' size={20} color={demoOn ? 'var(--text-content-on-content, #FFFFFF)' : INK_STRONG} />
              {demoOn ? 'โหมดสาธิต: เดินคิวอัตโนมัติ' : 'โหมดสาธิต: ปิด'}
            </button>
          </div>

          {/* สถานะเสียงแบบตรงไปตรงมา — จอสาธารณะห้ามขึ้น error แต่หน้าตั้งค่า
              ต้องบอกความจริงว่าทำไมเงียบ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
            {!supported ? (
              <span>เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง — จอจะแสดงผลตามปกติแต่ไม่มีเสียงเรียก</span>
            ) : null}
            {supported && !hasThaiVoice ? (
              <span>ไม่พบเสียงภาษาไทยในเครื่องนี้ — ระบบจะใช้เสียงเริ่มต้นของเบราว์เซอร์แทน</span>
            ) : null}
            {testResult === 'ok' ? <span>ทดสอบเสียงสำเร็จ · จอจะประกาศอัตโนมัติเมื่อมีการเรียกคิว</span> : null}
            {testResult === 'blocked' ? (
              <span>เบราว์เซอร์ยังบล็อกเสียงอยู่ — กด “ทดสอบเสียง” อีกครั้งบนหน้าจอนี้ก่อนเปิดจอ TV</span>
            ) : null}
            <span>
              โหมดสาธิตจะเรียกคิวถัดไปอัตโนมัติทุก 15 วินาที บันทึกลงประวัติว่าเป็นการเรียกจากโหมดสาธิต
              และ <b>ยังทำงานต่อแม้ออกจากหน้านี้</b> (จอ TV จะขึ้นแถบ “โหมดสาธิตกำลังทำงาน” และคอนโซลจอมีปุ่มหยุด)
            </span>
          </div>
        </div>

        {/* ── ลิงก์ที่เกี่ยวข้อง + QR ────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 'var(--dim-space-600, 24px)', flexWrap: 'wrap' }}>
          <div style={{ ...panel, flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
              สำหรับเจ้าหน้าที่
            </h2>
            <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
              เรียกคิวถัดไป · เรียกซ้ำ · บันทึกการมายืนยันของผู้รับบริการ · แก้ไขข้อความประกาศบนจอ
              พร้อมประวัติการเรียกทุกครั้ง
            </p>
            <Link to='/queue-center/display/console' style={{ ...ghostBtn, textDecoration: 'none', alignSelf: 'flex-start' }}>
              <Sym name='settings_remote' size={20} color={INK_STRONG} />
              เปิดจอควบคุมการเรียกคิว
            </Link>
          </div>

          <div style={{ ...panel, flex: '1 1 380px', display: 'flex', gap: 'var(--dim-space-400, 16px)', alignItems: 'center' }}>
            <img
              src={qrSrc}
              alt={`QR สำหรับเปิดหน้าติดตามคิวออนไลน์ ${onlineUrl}`}
              width={140}
              height={140}
              style={{ borderRadius: 'var(--dim-radius-400, 12px)', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)', minWidth: 0 }}>
              <span style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: INK_STRONG }}>
                ติดตามคิวออนไลน์
              </span>
              <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
                พิมพ์ QR นี้ติดที่จุดบริการ ผู้รับบริการสแกนแล้วดูสถานะคิวของตนเองได้จากมือถือ
              </p>
              <Link to='/queue-center/display/online' style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)' }}>
                เปิดหน้าติดตามคิว
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueDisplayLauncherPage;
