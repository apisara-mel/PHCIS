import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralButton from '@/components/button/NeutralButton';
import AlertDialog from '@/components/popup/AlertDialog';
import { StaffAvatar } from '@/components/appointment/StaffProfileAvatar';

/* Audit bar — TOR 1.4.3.16: ทุกจุดบันทึก/แก้ไขแบบฟอร์มต้องแสดง ผู้บันทึก ·
   เวลาบันทึก · เวลาแก้ไขล่าสุด และให้ "ทำเครื่องหมายข้อมูลผิด" ได้
   (เก็บเวลาที่ระบุข้อมูลผิดไว้ใน audit trail).

   แสดงเป็นแถบเดียววางท้าย card/หน้า — pattern เดียวกับ
   RegistrationEditHistoryPanel แต่ย่อเหลือบรรทัดเดียว + ปุ่ม mark-wrong.
   ยังไม่มีใน MIH DS — ลงทะเบียนใน docs/awaiting-components.md.

   โหมดดูแบบฟอร์ม (popup): hide icon / timestamps / flag แล้วโชว์ avatar + กิจกรรม */

const LINE = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const GROUP_TONE = {
  แพทย์: 'blue',
  พยาบาล: 'magenta',
  เภสัชกร: 'teal',
};

/**
 * @param {string} recordedBy — ผู้บันทึก
 * @param {string} [recordedAt] — เวลาบันทึก เช่น '6 พฤษภาคม 2569 · 09:21'
 * @param {string} [editedAt]   — เวลาแก้ไขล่าสุด
 * @param {string} [flaggedAt]  — เวลาที่ถูกทำเครื่องหมายข้อมูลผิด (controlled)
 * @param {Function} [onFlag]   — เรียกเมื่อยืนยันทำเครื่องหมายข้อมูลผิด
 * @param {boolean} [showIcon=true]
 * @param {boolean} [showTimestamps=true]
 * @param {boolean} [showFlag=true]
 * @param {boolean} [showRecordedByLabel=true] — แสดงคำนำหน้า "บันทึกโดย"
 * @param {string} [avatarSrc] — รูปโปรไฟล์เจ้าหน้าที่
 * @param {string} [groupPolicy] — กิจกรรม ของเจ้าหน้าที่
 */
export default function ConsentAuditBar({
  recordedBy,
  recordedAt,
  editedAt,
  flaggedAt,
  onFlag,
  showIcon = true,
  showTimestamps = true,
  showFlag = true,
  showRecordedByLabel = true,
  avatarSrc,
  groupPolicy,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [localFlaggedAt, setLocalFlaggedAt] = useState(null);
  const flagged = flaggedAt || localFlaggedAt;

  const confirmFlag = () => {
    const stamp = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    setLocalFlaggedAt(stamp);
    setConfirmOpen(false);
    onFlag?.(stamp);
  };

  return (
    <>
      <div
        className='flex items-center flex-wrap w-full'
        style={{
          gap: 'var(--dim-space-300)',
          padding: 'var(--dim-space-300) var(--dim-space-400)',
          background: 'var(--surface-card-200, #FDFDFD)',
          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
          borderRadius: 'var(--dim-radius-300)',
        }}
      >
        {avatarSrc ? (
          <StaffAvatar name={recordedBy} src={avatarSrc} size={32} />
        ) : showIcon ? (
          <Icon name='history' size={18} color='var(--text-content-tertiary)' />
        ) : null}

        <span
          className='inline-flex items-center flex-wrap min-w-0'
          style={{ ...LINE, flex: 1, gap: 'var(--dim-space-200)', minWidth: 200 }}
        >
          <span>
            {showRecordedByLabel ? <>บันทึกโดย{' '}</> : null}
            <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>
              {recordedBy}
            </span>
            {showTimestamps && recordedAt ? <> · {recordedAt}</> : null}
            {showTimestamps && editedAt ? <> · แก้ไขล่าสุด {editedAt}</> : null}
          </span>
          {groupPolicy ? (
            <ColorfulBadge
              style={GROUP_TONE[groupPolicy] || 'grey'}
              size='small'
              hierarchy='secondary'
              width='hug'
            >
              {groupPolicy}
            </ColorfulBadge>
          ) : null}
        </span>

        {showFlag ? (
          flagged ? (
            <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' showIcon icon='flag'>
              ทำเครื่องหมายข้อมูลผิดแล้ว · {flagged}
            </ColorfulBadge>
          ) : (
            <NeutralButton variant='outline' size='sm' leadingIcon='flag' onClick={() => setConfirmOpen(true)}>
              ทำเครื่องหมายข้อมูลผิด
            </NeutralButton>
          )
        ) : null}
      </div>

      {showFlag ? (
        <AlertDialog
          open={confirmOpen}
          type='warning'
          title='ทำเครื่องหมายข้อมูลผิด'
          description='ระบบจะบันทึกเวลาที่ระบุว่าข้อมูลผิดไว้ในประวัติการแก้ไข (audit trail) และแจ้งผู้เกี่ยวข้องให้ตรวจสอบ — ข้อมูลเดิมจะไม่ถูกลบ'
          confirmLabel='ยืนยันทำเครื่องหมาย'
          cancelLabel='ยกเลิก'
          onConfirm={confirmFlag}
          onCancel={() => setConfirmOpen(false)}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}
