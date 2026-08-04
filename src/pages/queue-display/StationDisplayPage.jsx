import React, { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import QueueTvFrame from '@/components/queue-display/QueueTvFrame';
import BigQueueNumber from '@/components/queue-display/BigQueueNumber';
import PassedNumbersBlock from '@/components/queue-display/PassedNumbersBlock';
import {
  ClockGlyph32,
  DISPLAY_SIZE,
  ELLIPSIS_ONE_LINE,
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  SURFACE_ROW_ALT,
  SURFACE_STRIP,
  Volume2Glyph,
  accentOf,
  fitFactor,
} from '@/components/queue-display/queueDisplayUi';
import {
  STORAGE_KEYS,
  useHeartbeat,
  useQueueAnnouncer,
  useQueueCallEvents,
  useQueueSnapshot,
  useStoredSetting,
} from '@/components/queue-display/queueDisplayHooks';
import {
  QUEUE_STATIONS,
  buildSpeechText,
  formatHm,
  getAnnouncement,
  getStationState,
} from '@/data/queueDisplayView';

/* StationDisplayPage — TV2 "จอเฉพาะจุดบริการ" · Figma node 129:62394
   route: /queue-center/display/station?room=st-opd  (รับ id / รหัสสั้น `OPD` /
   ชื่อไทยเต็ม และรองรับ ?dept= / ?station= ด้วย)

   ซ้าย : แถบ pill "กำลังเรียก + ชื่อห้อง" → กล่องเลขคิวยักษ์ (border 8px =
          --dim-stroke-800) → ชิป "เรียกล่าสุดเวลา HH:MM น."
   ขวา  : รางสูงเต็มจอ หัว "คิวถัดไป" พื้นสีแผนก + 6 คิว + คิวคงเหลือ
   ล่างซ้าย: แถบ "หมายเลขที่เรียกผ่านไปแล้ว (Passed Numbers)" (เลื่อนอัตโนมัติ
          เมื่อเกิน 4 ใบ)

   เป็น "variant hero" ของข้อมูลชุดเดียวกับ TV1/TV3 — ไม่ได้เขียน store
   หรือ layout ใหม่ ใช้ getStationState เดิม

   TOR: 1.3.4.1 · 1.3.4.2 · 1.3.4.3 (callCount → กระพริบ + อ่านซ้ำ)
        1.3.4.5 (confirmed จาก store แสดงเป็นสถานะ "ยืนยันการมาแล้ว") */

const RAIL_ROWS = 6;

/** จุดบริการเริ่มต้นเมื่อ **ไม่ได้ส่ง query เลย** — ห้องตรวจ OPD ตาม Figma TV2 */
const DEFAULT_STATION_ID = 'st-opd';

/**
 * รับได้ทั้ง id ของ store ('st-opd'), รหัสสั้น ('OPD') และชื่อไทยเต็ม
 * @returns {{ id: string|null, raw: string }}
 *   id = null เมื่อส่งค่ามาแล้ว resolve ไม่ได้ — ห้าม fallback เป็น st-opd
 *   เงียบ ๆ เพราะจอหน้าห้องตรวจจะแสดงคิวของแผนกอื่นให้คนที่ยืนรออยู่หน้าห้อง
 *   เข้าใจว่าเป็นคิวของตัวเอง (พิมพ์ ?room= ผิดตัวเดียวก็เกิดได้)
 */
const resolveStationId = (params) => {
  const raw = params.get('room') || params.get('dept') || params.get('station') || '';
  if (!raw) return { id: DEFAULT_STATION_ID, raw: '' };
  const key = String(raw).trim().toLowerCase();
  const byId = QUEUE_STATIONS.find((s) => s.id.toLowerCase() === key);
  if (byId) return { id: byId.id, raw };
  const byCode = QUEUE_STATIONS.find((s) => String(s.code || '').toLowerCase() === key);
  if (byCode) return { id: byCode.id, raw };
  const byLabel = QUEUE_STATIONS.find((s) => s.label === raw || s.room === raw);
  return { id: byLabel ? byLabel.id : null, raw };
};

const RailRow = ({ number, alt, isLast }) => (
  <div
    style={{
      flex: '1 1 0%',
      minHeight: 0,
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: alt ? SURFACE_ROW_ALT : SURFACE_CARD,
      borderBottomStyle: isLast ? 'none' : 'solid',
      borderBottomWidth: isLast ? 'var(--dim-space-0, 0px)' : 'var(--dim-stroke-200, 2px)',
      borderBottomColor: SURFACE_STRIP,
      paddingLeft: 'var(--dim-space-400, 16px)',
      paddingRight: 'var(--dim-space-400, 16px)',
    }}
  >
    <span
      style={{
        ...ELLIPSIS_ONE_LINE,
        fontFamily: FONT_BODY,
        fontSize: DISPLAY_SIZE.rail(fitFactor(number, 5)),
        fontWeight: 'var(--type-weight-bold, 700)',
        lineHeight: 1.2,
        letterSpacing: `calc(${DISPLAY_SIZE.rail(fitFactor(number, 5))} * -0.025)`,
        color: number ? INK_STRONG : INK_SECONDARY,
        textAlign: 'center',
      }}
    >
      {number || '—'}
    </span>
  </div>
);

const StationDisplayPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requested = resolveStationId(params);
  const stationId = requested.id || '';

  const [soundOn] = useStoredSetting(STORAGE_KEYS.sound, false);
  const { supported, speak } = useQueueAnnouncer(soundOn);

  const [state] = useQueueSnapshot(
    useCallback(() => getStationState(stationId, { nextCount: RAIL_ROWS }), [stationId]),
  );
  const [announcement] = useQueueSnapshot(useCallback(() => getAnnouncement(), []));
  const { stale, lastBeat } = useHeartbeat();

  const station = state && state.station;
  const current = state && state.current;
  const accent = accentOf(station && station.accent);
  const roomLabel = (station && station.room) || 'จุดบริการ';

  const pulses = useQueueCallEvents(
    [
      {
        key: stationId,
        sig: current ? `${current.number}#${current.callCount}` : '',
        speech: current
          ? buildSpeechText(current.number, roomLabel, current.callCount)
          : '',
      },
    ],
    useCallback((entry) => { if (entry && entry.speech) speak(entry.speech); }, [speak]),
  );

  const next = (state && state.next) || [];
  const railRows = Array.from({ length: RAIL_ROWS }).map((_, i) => (next[i] ? next[i].number : ''));

  /* ── ระบุจุดบริการมาแล้วแต่หาไม่เจอ ─────────────────────────────────
     บอกค่าที่รับมาตรง ๆ + ทางกลับไปตั้งค่าจอ ดีกว่าแสดงคิวของแผนกอื่น */
  if (!requested.id) {
    return (
      <QueueTvFrame
        title='ไม่พบจุดบริการที่ระบุ'
        announcement={announcement && announcement.text}
        stale={stale}
        lastBeat={lastBeat}
        soundOn={soundOn}
        soundSupported={supported}
      >
        <div
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-2400, 96px)',
            paddingRight: 'var(--dim-space-2400, 96px)',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'var(--type-size-5xl, 48px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.25,
              color: INK_STRONG,
            }}
          >
            {`ไม่พบจุดบริการ “${requested.raw}” ในระบบคิว`}
          </span>
          <span
            style={{
              fontFamily: FONT_BODY,
              fontSize: 'var(--type-size-3xl, 30px)',
              lineHeight: 1.5,
              color: INK_SECONDARY,
            }}
          >
            จอนี้จะไม่แสดงคิวของจุดบริการอื่นแทน เพื่อไม่ให้ผู้รับบริการเข้าใจผิด
            <br />
            ตรวจสอบค่า ?room= ใน URL ของจอ แล้วเลือกจุดบริการใหม่จากหน้าตั้งค่าจอ
          </span>
          <Link
            to='/queue-center/display'
            style={{
              fontFamily: FONT_BODY,
              fontSize: 'var(--type-size-3xl, 30px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: 'var(--text-brandPrimary-default, #007549)',
            }}
          >
            ไปที่หน้าเลือกจอแสดงผล
          </Link>
        </div>
      </QueueTvFrame>
    );
  }

  return (
    <QueueTvFrame
      title={(station && station.label) || 'จุดบริการ'}
      announcement={announcement && announcement.text}
      stale={stale}
      lastBeat={lastBeat}
      lastCallAt={(current && current.calledAt) || null}
      soundOn={soundOn}
      soundSupported={supported}
    >
      <div style={{ width: '100%', display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
        {/* ── ซ้าย: กำลังเรียก + เลขคิวยักษ์ + เวลาเรียกล่าสุด ────────── */}
        <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: '1 1 0%',
              minHeight: 0,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--dim-space-1200, 48px)',
              paddingTop: 'var(--dim-space-2400, 96px)',
              paddingBottom: 'var(--dim-space-1200, 48px)',
              paddingLeft: 'var(--dim-space-2400, 96px)',
              paddingRight: 'var(--dim-space-2400, 96px)',
            }}
          >
            {/* pill "กำลังเรียก · ห้องตรวจ 3" */}
            <div
              style={{
                width: '100%',
                boxSizing: 'border-box',
                flexShrink: 0,
                height: 'var(--dim-size-1900, 112px)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--dim-space-600, 24px)',
                paddingLeft: 'var(--dim-space-1200, 48px)',
                paddingRight: 'var(--dim-space-1200, 48px)',
                borderStyle: 'solid',
                borderWidth: 'var(--dim-stroke-200, 2px)',
                borderColor: 'var(--border-neutral-tertiary, #E2E4E6)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
              }}
            >
              <Volume2Glyph color={INK_STRONG} />
              <span
                style={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 'var(--type-size-5xl, 48px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.25,
                  letterSpacing: 'calc(var(--type-size-5xl, 48px) * -0.02)',
                  color: INK_STRONG,
                }}
              >
                {current ? 'กำลังเรียก' : 'พร้อมให้บริการ'}
              </span>
              <span
                title={roomLabel}
                style={{
                  ...ELLIPSIS_ONE_LINE,
                  maxWidth: '55%',
                  fontFamily: FONT_DISPLAY,
                  fontSize: 'var(--type-size-6xl, 60px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.25,
                  color: INK_STRONG,
                }}
              >
                {roomLabel}
              </span>
            </div>

            <BigQueueNumber
              number={current ? current.number : null}
              accent={accent}
              variant='hero'
              pulsing={!!pulses[stationId]}
              ariaLabel={current ? `กำลังเรียกหมายเลข ${current.number} ที่ ${roomLabel}` : 'ยังไม่มีคิว'}
            />

            {/* ชิปเวลาเรียกล่าสุด + สถานะการยืนยันการมา (TOR 1.3.4.5) */}
            <div
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--dim-space-300, 12px)',
                boxSizing: 'border-box',
                background: SURFACE_ROW_ALT,
                borderStyle: 'solid',
                borderWidth: 'var(--dim-stroke-100, 1px)',
                borderColor: SURFACE_STRIP,
                borderRadius: 'var(--dim-radius-full, 9999px)',
                paddingTop: 'var(--dim-space-400, 16px)',
                paddingBottom: 'var(--dim-space-400, 16px)',
                paddingLeft: 'var(--dim-space-800, 32px)',
                paddingRight: 'var(--dim-space-800, 32px)',
              }}
            >
              <ClockGlyph32 color={accent} />
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-3xl, 30px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.2,
                  color: INK_SECONDARY,
                  whiteSpace: 'nowrap',
                }}
              >
                {current
                  ? `เรียกล่าสุดเวลา ${formatHm(current.calledAt)} น.${current.callCount > 1 ? ` · เรียกครั้งที่ ${current.callCount}` : ''}${current.confirmed === true ? ' · ยืนยันการมาแล้ว' : ''}`
                  : 'ยังไม่มีการเรียกคิวในจุดบริการนี้'}
              </span>
            </div>
          </div>

          <PassedNumbersBlock
            passed={(state && state.passed) || []}
            variant='bar'
            maxVisible={4}
            accent={accent}
          />
        </div>

        {/* ── ขวา: รางคิวถัดไป + คิวคงเหลือ ─────────────────────────── */}
        <div
          style={{
            width: '30%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            borderLeftStyle: 'solid',
            borderLeftWidth: 'var(--dim-stroke-200, 2px)',
            borderLeftColor: SURFACE_STRIP,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              height: 'var(--dim-size-1900, 112px)',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: accent,
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
            }}
          >
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 'var(--type-size-5xl, 48px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.25,
                letterSpacing: 'calc(var(--type-size-5xl, 48px) * -0.02)',
                color: 'var(--text-content-on-content, #FFFFFF)',
                whiteSpace: 'nowrap',
              }}
            >
              คิวถัดไป
            </span>
          </div>

          <div style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {railRows.map((number, i) => (
              <RailRow
                // eslint-disable-next-line react/no-array-index-key
                key={number || `qd-rail-${i}`}
                number={number}
                alt={i % 2 === 1}
                isLast={i === railRows.length - 1}
              />
            ))}
          </div>

          <div
            style={{
              flexShrink: 0,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: SURFACE_CARD,
              borderTopStyle: 'solid',
              borderTopWidth: 'var(--dim-stroke-200, 2px)',
              borderTopColor: SURFACE_STRIP,
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            <span
              style={{
                width: '100%',
                textAlign: 'center',
                fontFamily: FONT_DISPLAY,
                fontSize: 'var(--type-size-2xl, 24px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.25,
                letterSpacing: 'calc(var(--type-size-2xl, 24px) * -0.02)',
                color: INK_SECONDARY,
              }}
            >
              คิวที่เหลือทั้งหมด
            </span>
            <span
              style={{
                fontFamily: FONT_BODY,
                fontSize: DISPLAY_SIZE.rail(),
                fontWeight: 'var(--type-weight-bold, 700)',
                lineHeight: 1.15,
                letterSpacing: `calc(${DISPLAY_SIZE.rail()} * -0.02)`,
                color: INK_SECONDARY,
                opacity: 0.7,
              }}
            >
              {state && state.remaining != null ? state.remaining : 0}
            </span>
          </div>
        </div>
      </div>
    </QueueTvFrame>
  );
};

export default StationDisplayPage;
