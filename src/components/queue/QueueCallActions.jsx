import React, { useState } from 'react';
import BrandIconButton from '@/components/button/BrandIconButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Tooltip from '@/components/tooltip/Tooltip';
import AlertDialog from '@/components/popup/AlertDialog';

/* MIH QueueCallActions — ชุดปุ่มจัดการคิว 3 ปุ่ม: เรียกคิว · พัก/คืนคิว · ยกเลิกคิว

   เดิมมาร์กอัปชุดนี้อยู่ในตารางคิวเวชระเบียนที่เดียว พอพาเนลคิวข้างฟอร์มต้องใช้
   ชุดเดียวกัน (มติผู้ใช้ 27 ส.ค. 69) จึงแยกออกมาเป็น component กลาง — แก้ที่นี่
   ที่เดียว ทั้งตารางและพาเนลเปลี่ยนตาม ไม่ต้องมีปุ่มสองชุดให้ drift

   `paused` สลับ pause ↔ play (พักคิวไม่ได้เอาแถวออกจากลิสต์ แค่ปิดเรียกคิวชั่วคราว)
   การ "พักคิว" ต้องยืนยันก่อน (มติผู้ใช้ 27 ส.ค. 69) — ป๊อปอัปอยู่ในนี้ ทุกที่ที่
   ใช้ปุ่มชุดนี้จึงได้เหมือนกันหมด ส่วนการ "คืนคิว" (หยุดพักคิว) ไม่ต้องยืนยัน
   เพราะเป็นการย้อนกลับสู่สถานะปกติ ไม่ได้กระทบลำดับคิวของใคร
   `disabledReason` มีค่า = ปิดทุกปุ่มพร้อมบอกเหตุผลใน tooltip (เช่น ผู้เสียชีวิต) */

const QueueCallActions = ({
  paused = false,
  disabled = false,
  /** เหตุผลที่กดไม่ได้ — ขึ้นใน tooltip ของปุ่มเรียกคิวแทนข้อความปกติ */
  disabledReason,
  /** ปุ่มเรียกคิว: 'fill' (คิวที่รออยู่) · 'quaternary' (คิวที่กำลังทำอยู่) */
  callVariant = 'fill',
  size = 'sm',
  onCall,
  onPause,
  onCancel,
  /** ปุ่มเพิ่มเติมท้ายแถว (เช่น more_vert ในตาราง) */
  children,
}) => {
  const [confirmPause, setConfirmPause] = useState(false);
  const blocked = disabled || Boolean(disabledReason);
  const canCall = !blocked && !paused;
  const pauseLabel = paused ? 'หยุดพักคิว' : 'พักคิว';
  const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };
  /* กดพัก → ถามก่อน · กดคืนคิว → ทำเลย */
  const handlePauseClick = paused ? onPause : () => setConfirmPause(true);

  return (
    <>
    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <Tooltip
        content={disabledReason || 'เรียกคิว'}
        position='top'
        disabled={!canCall && !disabledReason}
      >
        <BrandIconButton
          icon='volume_up'
          size={size}
          variant={callVariant}
          disabled={!canCall}
          aria-label='เรียกคิว'
          onClick={canCall ? stop(onCall) : undefined}
        />
      </Tooltip>
      <Tooltip content={pauseLabel} position='top' disabled={blocked}>
        <BrandIconButton
          icon={paused ? 'play_arrow' : 'pause'}
          size={size}
          variant='quaternary'
          disabled={blocked}
          aria-label={pauseLabel}
          onClick={!blocked ? stop(handlePauseClick) : undefined}
        />
      </Tooltip>
      <NeutralSubdueButton
        variant='outline'
        size={size}
        disabled={disabled}
        aria-label='ยกเลิกคิว'
        onClick={!disabled ? stop(onCancel) : undefined}
      >
        ยกเลิกคิว
      </NeutralSubdueButton>
      {children}
      </div>

      <AlertDialog
        open={confirmPause}
        type='warning'
        alignment='center'
        title='พักคิวนี้ไว้ก่อน?'
        description='คิวจะยังอยู่ในรายการ แต่จะถูกข้ามตอนเรียกคิวจนกว่าจะกดคืนคิว'
        cancelLabel='ยกเลิก'
        confirmLabel='พักคิว'
        onCancel={() => setConfirmPause(false)}
        onClose={() => setConfirmPause(false)}
        onConfirm={() => { setConfirmPause(false); onPause?.(); }}
      />
    </>
  );
};

export default QueueCallActions;
