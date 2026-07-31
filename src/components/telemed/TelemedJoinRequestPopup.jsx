import React from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* Figma PHCIS | Telemedicine · Additional Cases
   "Someone asked to join the meeting" (146:20338 / Popup Large 95:48873)
   Trigger: in-call when a participant (patient) requests admission. */

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {() => void} onConfirm — admit into the room
 * @param {{ fullName?: string, name?: string, avatar?: string, role?: string, specialty?: string, department?: string }} [requester]
 */
const TelemedJoinRequestPopup = ({
  open,
  onClose,
  onConfirm,
  requester = {},
}) => {
  const name = requester.fullName || requester.name || 'ผู้ขอเข้าห้อง';
  const avatar = requester.avatar || '/avatars/telemed/patient.png';
  const role = requester.role || 'ผู้รับบริการ';
  const specialty = requester.specialty || '—';
  const department = requester.department || 'OPD';

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='ขอเข้าห้องตรวจรักษา'
      subtitle='ยืนยันการรับบริการเข้าสู่ห้องตรวจรักษา'
      secondaryAction={{
        label: 'ยกเลิก',
        onClick: onClose,
      }}
      primaryAction={{
        label: 'ยืนยัน',
        onClick: onConfirm,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--dim-space-400, 16px)',
          width: '100%',
        }}
      >
        {/* Patient / requester strip — Figma "Patient Telemed" */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--dim-space-600, 24px)',
            width: '100%',
            minHeight: 'var(--dim-size-1800, 96px)',
            padding: 'var(--dim-space-400, 16px)',
            borderRadius: 'var(--dim-radius-400, 12px)',
            background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: 'var(--dim-size-1500, 68px)',
              height: 'var(--dim-size-1500, 68px)',
              borderRadius: 'var(--dim-radius-full, 9999px)',
              border: 'var(--dim-stroke-400, 4px) solid var(--border-image-default, #FFFFFF)',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'var(--surface-neutral-tertiary, #F4F5F5)',
            }}
          >
            <img
              src={avatar}
              alt=''
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
              ชื่อ-นามสกุล
            </span>
            <span style={{
              fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
              fontSize: 'var(--type-size-base, 16px)',
              color: 'var(--text-brandPrimary-default, #007549)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
            >
              {name}
            </span>
          </div>

          <div style={{ width: 1, height: 'var(--dim-size-1000, 48px)', background: 'var(--border-neutral-tertiary, #E2E4E6)', flexShrink: 0 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
              ประเภท
            </span>
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
              {role}
            </ColorfulBadge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', flexShrink: 0 }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
              สาขาย่อย
            </span>
            <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
              {specialty}
            </ColorfulBadge>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', minWidth: 0 }}>
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)', lineHeight: 1.5 }}>
              แผนกที่มีสิทธิ์
            </span>
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>
              {department}
            </ColorfulBadge>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--dim-space-200, 8px)',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-heading-graphic2, "Mitr", sans-serif)',
            fontSize: 'var(--type-size-lg, 18px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            color: 'var(--text-alertdialog-text, #4D5358)',
            lineHeight: 1.5,
          }}
          >
            {name} ขอเข้าห้องตรวจรักษา
          </p>
          <p style={{
            margin: 0,
            fontFamily: 'var(--type-family-body, "Sarabun", sans-serif)',
            fontSize: 'var(--type-size-sm, 14px)',
            color: 'var(--text-alertdialog-subtext, #636B72)',
            lineHeight: 1.5,
          }}
          >
            ผู้รับบริการพร้อมแล้ว ต้องการรับเข้าห้องหรือไม่
          </p>
        </div>
      </div>
    </Popup>
  );
};

export default TelemedJoinRequestPopup;
