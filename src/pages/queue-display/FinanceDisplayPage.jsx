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
  getFinanceState,
} from '@/data/queueDisplayView';

/* FinanceDisplayPage — TV3 "การเงินและรับยา" · Figma node 129:62393
   route: /queue-center/display/finance?zone=finance

   2 คอลัมน์ (คิวชำระเงิน #F472B6 / คิวรับยา #818CF8) โครงการ์ดเดียวกับ TV1
   ต่างกันแค่แถวคิวรองรับ badge สถานะย่อยต่อแถว เช่น "กำลังจัดเตรียมยา"
   (ColorfulBadge style=orange hierarchy=secondary) — สถานะมาจาก store
   (รอชำระเงิน / ชำระแล้ว / กำลังจัดเตรียมยา / รอเรียกรับยา) ไม่ hardcode

   TOR: 1.3.4.1 · 1.3.4.2 · 1.3.4.3 */

const FinanceDisplayPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const zoneId = params.get('zone') || 'finance';

  const [soundOn] = useStoredSetting(STORAGE_KEYS.sound, false);
  const { supported, speak } = useQueueAnnouncer(soundOn);

  const [state] = useQueueSnapshot(useCallback(() => getFinanceState(zoneId), [zoneId]));
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
      title={(state && state.zone && state.zone.label) || 'การเงินและรับยา'}
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

export default FinanceDisplayPage;
