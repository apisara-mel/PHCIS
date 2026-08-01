import React, { useState } from 'react';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralButton from '@/components/button/NeutralButton';
import AlertDialog from '@/components/popup/AlertDialog';

/* Audit bar — TOR 1.4.3.16: ทุกจุดบันทึก/แก้ไขแบบฟอร์มต้องแสดง ผู้บันทึก ·
   เวลาบันทึก · เวลาแก้ไขล่าสุด และให้ "ทำเครื่องหมายข้อมูลผิด" ได้
   (เก็บเวลาที่ระบุข้อมูลผิดไว้ใน audit trail).

   แสดงเป็นแถบเดียววางท้าย card/หน้า — pattern เดียวกับ
   RegistrationEditHistoryPanel แต่ย่อเหลือบรรทัดเดียว + ปุ่ม mark-wrong.
   ยังไม่มีใน MIH DS — ลงทะเบียนใน docs/awaiting-components.md. */

const LINE = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/**
 * @param {string} recordedBy — ผู้บันทึก
 * @param {string} recordedAt — เวลาบันทึก เช่น '6 พฤษภาคม 2569 · 09:21'
 * @param {string} editedAt   — เวลาแก้ไขล่าสุด (optional)
 * @param {string} flaggedAt  — เวลาที่ถูกทำเครื่องหมายข้อมูลผิด (controlled, optional)
 * @param {Function} onFlag   — เรียกเมื่อยืนยันทำเครื่องหมายข้อมูลผิด
 */
export default function ConsentAuditBar({ recordedBy, recordedAt, editedAt, flaggedAt, onFlag }) {
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
        <Icon name='history' size={18} color='var(--text-content-tertiary)' />
        <span style={{ ...LINE, flex: 1, minWidth: 200 }}>
          บันทึกโดย{' '}
          <span style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{recordedBy}</span>
          {' '}· {recordedAt}
          {editedAt ? <> · แก้ไขล่าสุด {editedAt}</> : null}
        </span>
        {flagged ? (
          <ColorfulBadge style='red' size='small' hierarchy='secondary' width='hug' showIcon icon='flag'>
            ทำเครื่องหมายข้อมูลผิดแล้ว · {flagged}
          </ColorfulBadge>
        ) : (
          <NeutralButton variant='outline' size='sm' leadingIcon='flag' onClick={() => setConfirmOpen(true)}>
            ทำเครื่องหมายข้อมูลผิด
          </NeutralButton>
        )}
      </div>

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
    </>
  );
}
