import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { Field } from '@/components/forms/Fields';

/* PHCIS | เวชระเบียน — ป๊อปอัป "เพิ่มคิว"

   กด "เพิ่มคิว" บนหัวหน้าคิว → ป๊อปอัปนี้บอกเลขคิวที่จะได้ แล้วให้กรอกชื่อกับ
   หมายเหตุ **แบบไม่บังคับ** (มติผู้ใช้ 27 ส.ค. 69) — คิวหน้าเคาน์เตอร์มักออกให้
   ก่อนรู้ตัวตน จึงต้องสร้างคิวเปล่าได้ ชื่อ/หมายเหตุเป็นแค่ตัวช่วยจำของเจ้าหน้าที่
   ตัวตนจริงไปกรอกในฟอร์มลงทะเบียนทีหลัง

   CTA คือ "สร้างคิว" — คิวยังไม่ถูกสร้างจนกว่าจะกดปุ่มนี้ (ต่างจากเดิมที่กด
   "เพิ่มคิว" แล้วเด้งไปหน้าฟอร์มทันที) */

const AddQueuePopup = ({ open, onClose, queueNo, onCreate }) => {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  /* ล้างฟอร์มทุกครั้งที่เปิดใหม่ — คิวถัดไปไม่ควรค้างชื่อของคิวก่อนหน้า */
  useEffect(() => {
    if (open) { setName(''); setNote(''); }
  }, [open]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      title='เพิ่มคิว'
      subtitle='ออกคิวใหม่สำหรับผู้รับบริการที่หน้าเคาน์เตอร์'
      size='default'
      showCloseButton
      actions={[
        { key: 'cancel', kind: 'tertiary', label: 'ยกเลิก', onClick: onClose },
        {
          key: 'create',
          kind: 'primary',
          label: 'สร้างคิว',
          onClick: () => onCreate?.({ name: name.trim(), note: note.trim() }),
        },
      ]}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {/* เลขคิวที่จะได้ — badge teal ชุดเดียวกับคอลัมน์ "คิว" ในตาราง */}
        <div
          className='flex items-center w-full'
          style={{
            gap: 'var(--dim-space-300)',
            padding: 'var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
          }}
        >
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}>
            หมายเลขคิวที่จะได้รับ
          </span>
          <div className='flex-1' />
          <ColorfulBadge style='teal' size='default' width='hug' hierarchy='secondary'>
            {queueNo || '—'}
          </ColorfulBadge>
        </div>

        {/* ทั้งสองช่องไม่บังคับ — ป้ายกำกับจึงไม่มีดอกจัน และมี hint บอกชัด */}
        <Field label='ชื่อผู้รับบริการ' hint='ไม่บังคับ — กรอกได้ภายหลังในฟอร์มลงทะเบียน'>
          <InputField
            value={name}
            onChange={setName}
            placeholder='เช่น นายสมชาย มีสุข'
            showFieldName={false}
            showHelperText={false}
          />
        </Field>

        <Field label='หมายเหตุ' hint='ไม่บังคับ — เช่น มากับผู้ดูแล, ต้องใช้รถเข็น'>
          <Textarea
            value={note}
            onChange={setNote}
            placeholder='บันทึกสั้น ๆ ช่วยจำสำหรับเจ้าหน้าที่'
            rows={3}
            showLabel={false}
            showHelperText={false}
          />
        </Field>
      </div>
    </Popup>
  );
};

export default AddQueuePopup;
