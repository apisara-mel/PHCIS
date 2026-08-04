import React, { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import QueueTvFrame from '@/components/queue-display/QueueTvFrame';
import QueueCallCard from '@/components/queue-display/QueueCallCard';
import {
  STORAGE_KEYS,
  useHeartbeat,
  useQueueAnnouncer,
  useQueueCallEvents,
  useQueueSnapshot,
  useStoredSetting,
} from '@/components/queue-display/queueDisplayHooks';
import {
  buildSpeechText,
  getAnnouncement,
  getHallState,
} from '@/data/queueDisplayView';

/* HallDisplayPage — TV1 "จุดพักคอยรวม (Main Hall)" · Figma node 129:62395
   route: /queue-center/display/hall?zone=hall

   3 คอลัมน์เท่ากัน (แผนกซักประวัติ / รอเข้าห้องตรวจ / การเงินและรับยา)
   ใช้ QueueCallCard ตัวเดียวกับ TV3 — ไม่เขียนซ้ำ

   TOR: 1.3.4.1 แสดงสถานะการเรียกคิวไปยังหน้าจอ
        1.3.4.2 เสียงเรียกคิว (SpeechSynthesis th-TH · ปิดได้ · degrade เงียบ)
        1.3.4.3 เรียกซ้ำ (callCount เปลี่ยน → กระพริบ + อ่านใหม่ทันที)

   จอนี้ไม่มี interaction ใด ๆ ตามสเปก — เป็นจอแสดงผลอย่างเดียว
   และห้ามแสดงชื่อ-นามสกุล/HN ของผู้รับบริการ (จอตั้งในโถงรวม) */

const HallDisplayPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const zoneId = params.get('zone') || 'hall';

  const [soundOn] = useStoredSetting(STORAGE_KEYS.sound, false);
  const { supported, speak } = useQueueAnnouncer(soundOn);

  const [state] = useQueueSnapshot(useCallback(() => getHallState(zoneId), [zoneId]));
  const [announcement] = useQueueSnapshot(useCallback(() => getAnnouncement(), []));
  const { stale, lastBeat } = useHeartbeat();

  const columns = (state && state.columns) || [];

  /* เวลาที่คิวของจอนี้ถูกเรียกล่าสุด (คอลัมน์ใดก็ได้) — QueueTvFrame ใช้บอก
     "ไม่มีการเรียกคิวมาแล้ว N นาที" ซึ่งเป็นคนละเรื่องกับ feed ตาย */
  const lastCallAt = columns.reduce(
    (max, col) => ((col.current && col.current.calledAt && col.current.calledAt > max)
      ? col.current.calledAt
      : max),
    0,
  ) || null;

  const entries = columns.map((col) => ({
    key: col.station ? col.station.id : 'unknown',
    sig: col.current ? `${col.current.number}#${col.current.callCount}` : '',
    speech: col.current
      ? buildSpeechText(col.current.number, col.label || (col.station && col.station.label), col.current.callCount)
      : '',
  }));

  const pulses = useQueueCallEvents(
    entries,
    useCallback((entry) => { if (entry && entry.speech) speak(entry.speech); }, [speak]),
  );

  return (
    <QueueTvFrame
      title={(state && state.zone && state.zone.label) || 'จุดพักคอยรวม (Main Hall)'}
      announcement={announcement && announcement.text}
      stale={stale}
      lastBeat={lastBeat}
      lastCallAt={lastCallAt}
      soundOn={soundOn}
      soundSupported={supported}
    >
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          gap: 'var(--dim-space-1200, 48px)',
          paddingTop: 'var(--dim-space-800, 32px)',
          paddingBottom: 'var(--dim-space-800, 32px)',
          paddingLeft: 'var(--dim-space-1200, 48px)',
          paddingRight: 'var(--dim-space-1200, 48px)',
        }}
      >
        {columns.map((col) => (
          <QueueCallCard
            key={col.station ? col.station.id : col.label}
            state={col}
            rows={4}
            pulsing={!!pulses[col.station ? col.station.id : '']}
          />
        ))}
      </div>
    </QueueTvFrame>
  );
};

export default HallDisplayPage;
