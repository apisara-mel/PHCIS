import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import RadioButton from '@/components/radio/RadioButton';

/* Figma PHCIS | Telemedicine · leave a call (70:4532)
   Trigger: Telemed admin กดวางสาย / ออกจากห้องประชุม
   Annotation: "ปิดห้องประชุม" แสดงเฉพาะผู้ที่มีสิทธิ์ปิดห้อง (telemed admin). */

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {(choice: 'leave' | 'endMeeting') => void} onConfirm
 * @param {boolean} [canEndMeeting=true] — false hides "ปิดห้องประชุม" (non-admin)
 */
const TelemedLeaveCallPopup = ({
  open,
  onClose,
  onConfirm,
  canEndMeeting = true,
}) => {
  const [choice, setChoice] = useState(null);

  useEffect(() => {
    if (open) setChoice(null);
  }, [open]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      width={448}
      title='เลือกความต้องการของคุณ'
      bodyStyle={{ paddingTop: 0, gap: 'var(--dim-space-200, 8px)' }}
      tertiaryAction={{
        label: 'ยกเลิก',
        onClick: onClose,
      }}
      primaryAction={{
        label: 'ตกลง',
        disabled: !choice,
        onClick: () => {
          if (!choice) return;
          onConfirm?.(choice);
        },
      }}
    >
      <div
        role='radiogroup'
        aria-label='เลือกความต้องการของคุณ'
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-200, 8px)',
          width: '100%',
        }}
      >
        <RadioButton
          name='telemed-leave-choice'
          value='leave'
          checked={choice === 'leave'}
          onChange={() => setChoice('leave')}
          border
          title='แค่ออกจากห้องประชุม'
          showRadio={false}
          showCircleIcon={false}
          showIcon={false}
          showDescription={false}
          showBadge={false}
          showBadgeTitle={false}
          showPalette={false}
          className='w-full'
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        {canEndMeeting && (
          <RadioButton
            name='telemed-leave-choice'
            value='endMeeting'
            checked={choice === 'endMeeting'}
            onChange={() => setChoice('endMeeting')}
            border
            title='ปิดห้องประชุม'
            showRadio={false}
            showCircleIcon={false}
            showIcon={false}
            showDescription={false}
            showBadge={false}
            showBadgeTitle={false}
            showPalette={false}
            className='w-full'
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        )}
      </div>
    </Popup>
  );
};

export default TelemedLeaveCallPopup;
