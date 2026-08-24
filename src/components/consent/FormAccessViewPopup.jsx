import React from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import FormScopeGrouping from '@/components/consent/FormScopeGrouping';
import FormPositionGrouping from '@/components/consent/FormPositionGrouping';

/** รวมขอบเขตหน่วยงานและบทบาทไว้ในจุดเดียวตาม User Control PDF. */
export default function FormAccessViewPopup({ open, record, onClose }) {
  return (
    <Popup
      open={Boolean(open && record)}
      onClose={onClose}
      size='extraLarge'
      title='ผู้ที่มีสิทธิ์เข้าถึง'
      subtitle={record ? `${record.code} · ${record.name}` : undefined}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      {record ? (
        <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500, 20px)' }}>
          <div
            className='flex flex-wrap items-center w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary)',
            }}
          >
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{record.code}</ColorfulBadge>
            <span className='text-sm font-medium text-ink'>{record.name}</span>
          </div>
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <h3 className='text-base text-brand'>บทบาท / ตำแหน่ง</h3>
            <FormPositionGrouping source={record} columns={2} variant='panel' />
          </section>
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <h3 className='text-base text-brand'>ขอบเขตหน่วยงานที่เข้าถึงได้</h3>
            <FormScopeGrouping source={record} columns={2} variant='panel' />
          </section>
        </div>
      ) : null}
    </Popup>
  );
}
