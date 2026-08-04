import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import '@/components/queue-display/queueDisplayStyles';
import {
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  SURFACE_ROW_ALT,
  Sym,
  accentOf,
} from '@/components/queue-display/queueDisplayUi';
import {
  STORAGE_KEYS,
  useHeartbeat,
  useQueueSnapshot,
  useStoredSetting,
  useTickingClock,
} from '@/components/queue-display/queueDisplayHooks';
import {
  QUEUE_CENTER_SITE,
  formatClock,
  formatThaiDate,
  getTicketStatus,
} from '@/data/queueDisplayView';

/* QueueStatusOnlinePage — /queue-center/display/online?q=A-042

   ยกระดับ TOR 1.3.4.4 "แสดงสถานะคิวผ่านช่องทาง Online" จาก 🟡 เป็นหน้า live:
   ของเดิม `/kiosk/ticket/:queueId` เป็นบัตรคิว **นิ่ง** (วาดลง canvas เพื่อ
   บันทึกเป็นรูป) ไม่ได้ผูกกับสถานะคิวจริง หน้านี้ subscribe store แล้ว
   อัปเดตเองทุกครั้งที่คิวขยับ — หน้าเดิมยังอยู่ ไม่ได้แก้ไฟล์ของ kiosk

   แสดง: เลขคิวของฉัน · จุดบริการ · กำลังเรียกหมายเลขใด · เหลืออีกกี่คิว ·
         เวลารอโดยประมาณ · สถานะ
   ไม่แสดง: ชื่อ-นามสกุล / HN / เลขบัตรประชาชน — หน้านี้เปิดได้จาก QR
   สาธารณะ จึงต้องไม่มีข้อมูลส่วนบุคคลเลย

   Standalone mobile-first (max-width 480) ไม่มี Sidebar/Header
   แบบเดียวกับ `src/pages/kiosk/MobileTicketPage.jsx` */

const STATUS_TONE = {
  waiting: 'blue',
  calling: 'orange',
  serving: 'teal',
  passed: 'red',
  paused: 'yellow',
  done: 'green',
  cancelled: 'grey',
  unknown: 'grey',
};

const card = {
  background: SURFACE_CARD,
  borderRadius: 'var(--dim-radius-600, 24px)',
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
  borderColor: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card)',
  boxSizing: 'border-box',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
};

const StatRow = ({ label, value, emphasis }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 'var(--dim-space-300, 12px)',
      paddingTop: 'var(--dim-space-300, 12px)',
      paddingBottom: 'var(--dim-space-300, 12px)',
      borderBottomStyle: 'solid',
      borderBottomWidth: 'var(--dim-stroke-100, 1px)',
      borderBottomColor: 'var(--border-card-default, #E2E4E6)',
    }}
  >
    <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
      {label}
    </span>
    <span
      style={{
        fontFamily: FONT_BODY,
        fontSize: emphasis ? 'var(--type-size-2xl, 24px)' : 'var(--type-size-base, 16px)',
        fontWeight: 'var(--type-weight-bold, 700)',
        color: INK_STRONG,
        textAlign: 'right',
      }}
    >
      {value}
    </span>
  </div>
);

const QueueStatusOnlinePage = () => {
  const location = useLocation();
  const queryTicket = new URLSearchParams(location.search).get('q') || '';

  const [storedTicket, setStoredTicket] = useStoredSetting(STORAGE_KEYS.ticket, '');
  const [ticket, setTicket] = useState(queryTicket || storedTicket || '');
  const [draft, setDraft] = useState(queryTicket || storedTicket || '');

  const now = useTickingClock(1000);
  const { stale } = useHeartbeat();
  const [status] = useQueueSnapshot(useCallback(() => getTicketStatus(ticket), [ticket]));
  const alertedRef = useRef(null);

  /* จำเลขคิวไว้ให้เปิดซ้ำได้ — ผู้รับบริการมักปิดแท็บระหว่างรอ */
  useEffect(() => {
    if (ticket) setStoredTicket(ticket);
  }, [ticket, setStoredTicket]);

  /* สั่นเตือนเมื่อใกล้ถึงคิว (เหลือ ≤ 2) และตอนถูกเรียก — เตือนครั้งเดียว
     ต่อสถานะ ไม่สั่นรัวทุกครั้งที่ store ขยับ */
  useEffect(() => {
    if (!status || !status.found) return;
    const key = `${status.statusKey}:${status.positionsAhead}`;
    if (alertedRef.current === key) return;
    const near = status.statusKey === 'calling'
      || (status.statusKey === 'waiting' && status.positionsAhead != null && status.positionsAhead <= 2);
    if (!near) return;
    alertedRef.current = key;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(status.statusKey === 'calling' ? [220, 90, 220] : 160);
      } catch (err) {
        /* อุปกรณ์ไม่รองรับ → ข้ามเงียบ ๆ */
      }
    }
  }, [status]);

  const submit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    alertedRef.current = null;
    setTicket(draft.trim());
  };

  const found = status && status.found;
  const tone = STATUS_TONE[(status && status.statusKey) || 'unknown'] || 'grey';
  /* station ที่ store คืนมาผ่าน view ถูก decorate มาแล้ว จึงมี `accent` ตรง ๆ */
  const accent = accentOf(status && status.station ? status.station.accent : 'grey');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
        fontFamily: FONT_BODY,
        boxSizing: 'border-box',
        paddingTop: 'var(--dim-space-600, 24px)',
        paddingBottom: 'var(--dim-space-800, 32px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
      }}
    >
      <div style={{ maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* หัวเรื่อง */}
        <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
          <h1 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-2xl, 24px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
            ติดตามคิวของคุณ
          </h1>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
            {`${QUEUE_CENTER_SITE.name} · ${formatThaiDate(now)} ${formatClock(now)}`}
          </span>
        </header>

        {/* ช่องกรอกเลขคิว — wrapper เป็นเจ้าของกรอบ, input ถอด chrome ทั้งหมด */}
        <form onSubmit={submit} style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)' }}>
          <div
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              background: SURFACE_CARD,
              borderRadius: 'var(--mobile-input-radius, 12px)',
              borderStyle: 'solid',
              borderWidth: 'var(--dim-stroke-100, 1px)',
              borderColor: 'var(--border-card-default, #E2E4E6)',
              boxSizing: 'border-box',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
            }}
          >
            <Sym name='confirmation_number' size={20} color={INK_SECONDARY} />
            <input
              className='mih-qd-ticket-input'
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='กรอกเลขคิว เช่น A-125'
              aria-label='เลขคิวของคุณ'
              inputMode='text'
              autoComplete='off'
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                fontFamily: FONT_BODY,
                fontSize: 'var(--type-size-base, 16px)',
                color: INK_STRONG,
              }}
            />
          </div>
          <button
            type='submit'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--dim-space-200, 8px)',
              minHeight: 'var(--dim-size-900, 44px)',
              borderRadius: 'var(--mobile-button-radius, 9999px)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--surface-brandPrimaryButton-default, #007549)',
              color: 'var(--text-content-on-content, #FFFFFF)',
              fontFamily: FONT_BODY,
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            ตรวจสอบ
          </button>
        </form>

        {/* แถบเตือนเมื่อข้อมูลหยุดอัปเดต */}
        {stale ? (
          <div
            role='status'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              background: 'var(--surface-colorfulbadge-orange, #FFEDD5)',
              color: 'var(--text-colorfulbadge-orange, #C2410C)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              boxSizing: 'border-box',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            <Sym name='sync_problem' size={20} color='var(--text-colorfulbadge-orange, #C2410C)' />
            กำลังเชื่อมต่อกับระบบคิว… ข้อมูลอาจไม่เป็นปัจจุบัน
          </div>
        ) : null}

        {/* ── ยังไม่ได้กรอกเลขคิว ─────────────────────────────────── */}
        {!ticket ? (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}>
            <Sym name='qr_code_scanner' size={48} color={INK_SECONDARY} />
            <span style={{ fontSize: 'var(--type-size-base, 16px)', color: INK_STRONG, fontWeight: 'var(--type-weight-medium, 500)' }}>
              กรอกเลขคิวบนบัตรคิวของคุณ
            </span>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
              หรือสแกน QR ที่ติดอยู่บริเวณจุดบริการ ระบบจะแสดงสถานะคิวของคุณแบบอัตโนมัติ
            </span>
          </div>
        ) : null}

        {/* ── ไม่พบ / ยกเลิก / หมดอายุ ────────────────────────────── */}
        {ticket && !found ? (
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}>
            <Sym name='search_off' size={48} color='var(--text-danger-secondary, #DC2626)' />
            <span style={{ fontSize: 'var(--type-size-lg, 18px)', fontWeight: 'var(--type-weight-bold, 700)', color: INK_STRONG }}>
              {status && status.statusLabel ? status.statusLabel : 'ไม่พบบัตรคิวนี้'}
            </span>
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
              บัตรคิวใช้ได้เฉพาะวันที่ออกบัตรเท่านั้น หากเป็นคิวของวันก่อนหน้า หรือคิวถูกยกเลิกไปแล้ว
              กรุณาติดต่อเจ้าหน้าที่ประชาสัมพันธ์ที่จุดบริการ
              {` โทร ${QUEUE_CENTER_SITE.phone}`}
            </span>
          </div>
        ) : null}

        {/* ── พบบัตรคิว ───────────────────────────────────────────── */}
        {found ? (
          <React.Fragment>
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>เลขคิวของคุณ</span>
              <span
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-6xl, 60px)',
                  fontWeight: 'var(--type-weight-bold, 700)',
                  lineHeight: 1.1,
                  letterSpacing: 'calc(var(--type-size-6xl, 60px) * -0.03)',
                  color: accent,
                }}
              >
                {status.number}
              </span>
              <ColorfulBadge style={tone} size='default' hierarchy='secondary' width='hug'>
                {status.statusLabel}
              </ColorfulBadge>
              {status.statusKey === 'passed' ? (
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-danger-secondary, #DC2626)', textAlign: 'center', lineHeight: 1.6 }}>
                  กรุณาติดต่อเจ้าหน้าที่ที่จุดบริการเพื่อขอเรียกคิวใหม่ — คิวของคุณยังไม่ถูกยกเลิก
                </span>
              ) : null}
            </div>

            <div style={{ ...card, paddingTop: 'var(--dim-space-200, 8px)', paddingBottom: 'var(--dim-space-200, 8px)' }}>
              <StatRow label='จุดบริการ' value={status.station ? status.station.label : '—'} />
              <StatRow label='ตำแหน่ง' value={status.station ? `${status.station.zone} · ${status.station.floor}` : '—'} />
              <StatRow label='กำลังเรียกหมายเลข' value={status.calling || 'ยังไม่เริ่มเรียก'} emphasis />
              <StatRow
                label='เหลืออีก'
                value={status.positionsAhead == null ? '—' : `${status.positionsAhead} คิว`}
                emphasis
              />
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--dim-space-300, 12px)', paddingTop: 'var(--dim-space-300, 12px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>เวลารอโดยประมาณ</span>
                <span style={{ fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-bold, 700)', color: INK_STRONG }}>
                  {status.etaMinutes == null ? '—' : (status.etaMinutes === 0 ? 'ถึงคิวแล้ว' : `ประมาณ ${status.etaMinutes} นาที`)}
                </span>
              </div>
            </div>

            <div
              style={{
                background: SURFACE_ROW_ALT,
                borderRadius: 'var(--dim-radius-400, 12px)',
                boxSizing: 'border-box',
                paddingTop: 'var(--dim-space-400, 16px)',
                paddingBottom: 'var(--dim-space-400, 16px)',
                paddingLeft: 'var(--dim-space-400, 16px)',
                paddingRight: 'var(--dim-space-400, 16px)',
                fontSize: 'var(--type-size-xs, 12px)',
                color: INK_SECONDARY,
                lineHeight: 1.7,
              }}
            >
              หน้านี้อัปเดตสถานะอัตโนมัติ ไม่ต้องรีเฟรช · เวลารอเป็นค่าประมาณ อาจเปลี่ยนตามความเร่งด่วนของผู้รับบริการรายอื่น ·
              เพื่อความปลอดภัยของข้อมูล หน้านี้ไม่แสดงชื่อ-นามสกุลและเลขประจำตัวผู้ป่วย
            </div>
          </React.Fragment>
        ) : null}
      </div>
    </div>
  );
};

export default QueueStatusOnlinePage;
