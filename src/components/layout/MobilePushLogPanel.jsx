import React from 'react';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { MOBILE_PUSH_LOG } from '@/data/registrationVisits';

/* TOR 1.1.2.2 — การแจ้งเตือนผ่าน Mobile Application (จำลอง)

   เนื้อในของเมนู "แจ้งเตือน" บนแถบเมนูซ้าย (มติผู้ใช้ 27 ส.ค. 69: การแจ้งเตือน
   นี้ต้องอยู่ในเมนูแจ้งเตือน ไม่ใช่ปุ่มเฉพาะหน้าคิวเวชระเบียน) แยกเป็น
   component เพราะ log เป็นของทั้งระบบ ไม่ได้ผูกกับหน้าใดหน้าหนึ่ง

   `MOBILE_PUSH_LOG` เป็น array ที่ mutate ตรง ๆ (unshift) ตัวเรียกจึงควรส่ง
   `key` ที่เปลี่ยนหลังส่ง push เพื่อบังคับให้อ่านรายการใหม่ */

const PANEL_WIDTH = 360;

export default function MobilePushLogPanel({ entries = MOBILE_PUSH_LOG }) {
  return (
    <div
      className='flex flex-col'
      style={{
        width: PANEL_WIDTH,
        maxHeight: 420,
        overflowY: 'auto',
        background: 'var(--surface-card-100, #FFFFFF)',
        borderRadius: 'var(--dim-radius-300, 10px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
        boxShadow: 'var(--shadow-drop-bottom-400)',
        padding: 'var(--dim-space-300, 12px)',
        gap: 'var(--dim-space-200, 8px)',
      }}
    >
      <span style={{
        fontFamily: 'var(--type-family-heading-content)',
        fontSize: 'var(--type-size-sm, 14px)',
        fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
        color: 'var(--text-content-default, #363B3F)',
      }}>
        การแจ้งเตือนผ่าน Mobile Application (จำลอง)
      </span>
      {entries.length === 0 ? (
        <span style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-tertiary, #858C92)',
        }}>
          ยังไม่มีการแจ้งเตือน
        </span>
      ) : entries.map((entry) => (
        <div
          key={entry.id}
          className='flex flex-col'
          style={{
            gap: 2,
            paddingTop: 'var(--dim-space-200, 8px)',
            paddingBottom: 'var(--dim-space-200, 8px)',
            paddingLeft: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-300, 12px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
          }}
        >
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{entry.queue || '—'}</ColorfulBadge>
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              color: 'var(--text-content-default, #363B3F)',
            }}>
              {entry.patientName || entry.hn}
            </span>
            <div className='flex-1' />
            <span style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}>
              {entry.sentAt}
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            color: 'var(--text-content-secondary, #636B72)',
          }}>
            {entry.message} · ช่องทาง: {entry.channel}
          </span>
        </div>
      ))}
    </div>
  );
}
