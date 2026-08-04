import React from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/components/icons/Icon';
import Barcode128 from '@/components/lab/Barcode128';
import QueueQrCode from './QueueQrCode';
import {
  QUEUE_CENTER_SITE,
  getStation,
  getQueueSettings,
  queueTypeMeta,
  formatClock,
  formatDateTh,
} from '@/data/queueCenterStore';

/* ════════════════════════════════════════════════════════════════════════
   QueueTicket — บัตรคิว (TOR 1.3.2.4 / 1.3.2.6 / 1.3.7.3)

   ใช้ทั้งบนจอ (พรีวิวในหน้าออกคิว + พรีวิวสดในหน้าตั้งค่า) และตอนพิมพ์จริง
   ตัวสลับเอกสารตอนพิมพ์อยู่ที่ `printQueueTicket()` ใน queueCenterStore
   (data attribute บน <html> แบบเดียวกับ labPrintSettings / pharmacy print)

   หัวข้อบนบัตรตามสเปก: โลโก้+ชื่อศูนย์ · รหัสคิวตัวใหญ่ · ชื่อ-นามสกุล ·
   HN + Barcode128 · จุดบริการ/โซน/ชั้น · ขั้นตอนการรับบริการ (ข้อความจาก
   หน้าตั้งค่า) · เวลาออกคิว · จำนวนคิวรออยู่ข้างหน้า · QR → หน้าติดตามคิว

   ปลายทาง QR (แก้โดย integrator ตอนเชื่อมโมดูล 1.3 เข้ากับโมดูลจอแสดงผล
   1.3.4): เดิมชี้ `/kiosk/ticket/:id` ซึ่งเป็น "บัตรคิวนิ่ง" ไว้บันทึกรูป
   ไม่ใช่สถานะสด. TOR 1.3.2.5 ต้องการให้สแกนแล้ว "ดูสถานะคิวผ่านช่องทาง
   Online" จึงชี้ไป `/queue-center/display/online?q=<รหัสคิว>` ที่ subscribe
   queueCenterStore แล้วอัปเดตเลขที่กำลังเรียก / คิวคงเหลือ / ETA เอง.
   หน้า /kiosk/ticket/:queueId เดิมยังอยู่ ไม่ได้ถูกแตะ.
   ════════════════════════════════════════════════════════════════════════ */

export const ticketStatusUrl = (queueId, queueCode) => {
  const origin = typeof window !== 'undefined' && window.location
    ? window.location.origin
    : 'https://phcis.bma.go.th';
  const track = queueCode || queueId;
  return `${origin}/queue-center/display/online?q=${encodeURIComponent(track)}`;
};

const Line = () => (
  <div
    style={{
      width: '100%',
      height: 'var(--dim-stroke-100, 1px)',
      background: 'var(--border-neutral-tertiary)',
    }}
  />
);

const Row = ({ label, value, strong }) => (
  <div className='flex items-baseline w-full' style={{ gap: 'var(--dim-space-200)' }}>
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs, 12px)',
        color: 'var(--text-content-tertiary)',
        minWidth: 'var(--dim-size-2100, 160px)',
      }}
    >
      {label}
    </span>
    <span
      className='flex-1 min-w-0'
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: strong ? 'var(--type-size-base, 16px)' : 'var(--type-size-sm, 14px)',
        fontWeight: strong ? 'var(--type-weight-bold, 700)' : 'var(--type-weight-medium, 500)',
        color: 'var(--text-content-primary)',
      }}
    >
      {value}
    </span>
  </div>
);

/**
 * queue        record จาก queueCenterStore (หรือ draft ตอนพรีวิว)
 * waitingAhead จำนวนคิวที่รออยู่ข้างหน้า
 * ticketText   override ข้อความขั้นตอน (หน้าตั้งค่าใช้พรีวิวสด)
 * compact      ย่อขนาดสำหรับพรีวิวข้างฟอร์ม
 */
const QueueTicket = ({ queue, waitingAhead = 0, ticketText, compact = false }) => {
  if (!queue) return null;
  const station = getStation(queue.stationId);
  const settings = getQueueSettings();
  const steps = ticketText
    ?? settings.ticketText.perStation[queue.stationId]
    ?? settings.ticketText.default;
  const type = queueTypeMeta(queue.queueType);

  return (
    <div
      className='mih-queue-ticket flex flex-col'
      style={{
        width: compact ? '100%' : 'var(--dim-size-2700, 448px)',
        maxWidth: '100%',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        paddingTop: 'var(--dim-space-500)',
        paddingRight: 'var(--dim-space-500)',
        paddingBottom: 'var(--dim-space-500)',
        paddingLeft: 'var(--dim-space-500)',
        gap: 'var(--dim-space-300)',
      }}
    >
      {/* หัวบัตร — โลโก้ + ชื่อศูนย์ */}
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div
          className='shrink-0 inline-flex items-center justify-center'
          style={{
            width: 'var(--dim-size-800, 40px)',
            height: 'var(--dim-size-800, 40px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            color: 'var(--text-brandPrimary-default)',
          }}
        >
          <Icon name='local_hospital' size={22} />
        </div>
        <div className='flex-1 min-w-0 flex flex-col'>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-bold, 700)',
              color: 'var(--text-content-primary)',
            }}
          >
            {QUEUE_CENTER_SITE.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xxs, 10px)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            {QUEUE_CENTER_SITE.office} · โทร {QUEUE_CENTER_SITE.phone}
          </span>
        </div>
      </div>

      <Line />

      {/* รหัสคิวตัวใหญ่ */}
      <div className='w-full flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-tertiary)',
          }}
        >
          หมายเลขคิวของท่าน
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: compact ? 'var(--type-size-4xl, 36px)' : 'var(--type-size-5xl, 48px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.1,
            color: 'var(--text-brandPrimary-default)',
            letterSpacing: '0.02em',
          }}
        >
          {queue.code}
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            fontWeight: 'var(--type-weight-medium, 500)',
            color: 'var(--text-content-secondary)',
          }}
        >
          ประเภทคิว: {type.label}
          {queue.appointmentTime ? ` · นัดหมาย ${queue.appointmentTime} น.` : ''}
        </span>
      </div>

      <Line />

      <div className='w-full flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
        <Row label='ชื่อ-นามสกุล' value={queue.patient?.fullName || queue.patient?.name || 'ผู้รับบริการไม่ระบุตัวตน'} strong />
        <Row label='HN' value={queue.patient?.hn || '— (ยังไม่มีเวชระเบียน)'} />
        <Row label='จุดบริการ' value={station ? `${station.label}` : '—'} strong />
        <Row label='ตำแหน่ง' value={station ? `${station.zone} · ${station.floor}` : '—'} />
        <Row label='วัน-เวลาที่ออกคิว' value={`${formatDateTh(queue.issuedAt)} เวลา ${formatClock(queue.issuedAt)} น.`} />
        <Row label='คิวที่รออยู่ข้างหน้า' value={`${waitingAhead} คิว`} strong />
      </div>

      {queue.patient?.rightsExpired ? (
        <div
          className='w-full flex items-start'
          style={{
            gap: 'var(--dim-space-200)',
            background: 'var(--surface-dangerButton-quaternary)',
            border: 'var(--dim-stroke-100, 1px) solid var(--surface-dangerButton-tertiary)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            paddingTop: 'var(--dim-space-200)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-200)',
            paddingLeft: 'var(--dim-space-300)',
          }}
        >
          <Icon name='gpp_maybe' size={16} style={{ color: 'var(--text-danger-default)' }} />
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-danger-default)',
            }}
          >
            โปรดตรวจสอบสิทธิที่เวชระเบียนก่อนเข้ารับบริการ
          </span>
        </div>
      ) : null}

      {/* ขั้นตอนการรับบริการ — 1.3.7.3 */}
      <div
        className='w-full flex flex-col'
        style={{
          gap: 'var(--dim-space-100)',
          background: 'var(--surface-neutral-quaternary)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          paddingTop: 'var(--dim-space-300)',
          paddingRight: 'var(--dim-space-300)',
          paddingBottom: 'var(--dim-space-300)',
          paddingLeft: 'var(--dim-space-300)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xxs, 10px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            color: 'var(--text-content-secondary)',
          }}
        >
          ขั้นตอนการรับบริการ
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary)',
            whiteSpace: 'pre-line',
          }}
        >
          {steps}
        </span>
      </div>

      {/* HN barcode + QR สถานะคิวออนไลน์ */}
      <div className='w-full flex items-end' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex-1 min-w-0 flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
          <Barcode128 value={queue.patient?.hn || queue.code} height={38} moduleWidth={1.3} />
        </div>
        <div className='shrink-0 flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
          {/* หน้าติดตามคิวค้นด้วย `code` (getTicketStatus จับคู่ row.code)
              ไม่ใช่ id — ส่ง code ไปเป็นหลัก แล้ว fallback เป็น id */}
          <QueueQrCode value={ticketStatusUrl(queue.id, queue.code)} size={compact ? 72 : 88} />
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xxs, 10px)',
              color: 'var(--text-content-tertiary)',
            }}
          >
            สแกนดูสถานะคิว
          </span>
        </div>
      </div>

      {queue.printCount > 1 ? (
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xxs, 10px)',
            color: 'var(--text-content-tertiary)',
            textAlign: 'center',
          }}
        >
          พิมพ์ซ้ำครั้งที่ {queue.printCount - 1} · {formatClock(queue.lastPrintAt)} น.
        </span>
      ) : null}
    </div>
  );
};

/**
 * QueueTicketPrintRoot — เอกสารสำหรับพิมพ์ ต้องเป็น **ลูกโดยตรงของ <body>**
 *
 * print stylesheet ใน queueCenterStore ใช้กติกา
 *   html[data-queue-print-mode] body > *:not(.mih-queue-print-root) { display: none }
 * ถ้าวาง div นี้ไว้ในต้นไม้ของหน้า มันจะอยู่ใต้ #root ซึ่งโดนซ่อนไปทั้งก้อน
 * แล้วพิมพ์ออกมาเป็นกระดาษเปล่า — จึง portal ไปที่ body โดยตรง
 * (Popup ก็ portal ไป body เหมือนกัน แต่ไม่มีคลาสนี้ จึงถูกซ่อนตอนพิมพ์ตามต้องการ)
 */
export const QueueTicketPrintRoot = ({ queue, waitingAhead = 0, ticketText }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className='mih-queue-print-root'>
      <div className='mih-queue-print-only mih-queue-print-ticket'>
        {queue ? <QueueTicket queue={queue} waitingAhead={waitingAhead} ticketText={ticketText} /> : null}
      </div>
    </div>,
    document.body,
  );
};

export default QueueTicket;
