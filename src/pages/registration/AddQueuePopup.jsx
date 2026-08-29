import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import PatientLookupField from '@/components/patient/PatientLookupField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { QUEUE_NOTE_SUGGESTIONS } from '@/data/registrationForm';
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
  /* โปรไฟล์ที่เลือกจากฐานข้อมูล (null = พิมพ์ชื่อเอง ยังไม่มีประวัติ) */
  const [patient, setPatient] = useState(null);
  const [note, setNote] = useState('');

  /* ล้างฟอร์มทุกครั้งที่เปิดใหม่ — คิวถัดไปไม่ควรค้างชื่อของคิวก่อนหน้า */
  useEffect(() => {
    if (open) { setName(''); setPatient(null); setNote(''); }
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
          onClick: () => onCreate?.({
            name: name.trim(),
            note: note.trim(),
            /* มี patient = คิวนี้ผูกกับ HN เดิม หน้าคิวจะได้ไม่สร้างคนซ้ำ */
            patient,
          }),
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
        {/* ค้นจากฐานข้อมูลก็ได้ พิมพ์ใหม่ก็ได้ (มติผู้ใช้ 29 ส.ค. 69) — คนไข้เก่า
            เลือกจากรายการแล้วคิวผูกกับ HN เดิมทันที ส่วนคนที่ยังไม่เคยมา
            พิมพ์ชื่อลงไปตรง ๆ ไม่ต้องเลือกอะไร */}
        <Field
          label='ชื่อผู้รับบริการ'
          hint='ค้นจากฐานข้อมูล หรือพิมพ์ชื่อใหม่ได้'
        >
          <PatientLookupField
            value={name}
            onChange={setName}
            selected={patient}
            onSelectPatient={setPatient}
            showSearchIcon={false}
            historyKey='mih:add-queue-patient-history'
          />
        </Field>

        <Field label='หมายเหตุ' hint='เช่น มากับผู้ดูแล, ต้องใช้รถเข็น'>
          {/* voice + suggestion เหมือนช่องกรอกอื่นในงานลงทะเบียน — เจ้าหน้าที่
              หน้าเคาน์เตอร์มือไม่ว่าง (ถือบัตร/สแกน) พิมพ์ทีละตัวไม่ทันคิว
              (มติผู้ใช้ 29 ส.ค. 69) */}
          <SuggestibleTextarea
            voice
            style={{ maxWidth: 'none', width: '100%' }}
            value={note}
            onChange={(e) => setNote(e?.target ? e.target.value : e)}
            placeholder='บันทึกสั้น ๆ ช่วยจำสำหรับเจ้าหน้าที่'
            suggestions={QUEUE_NOTE_SUGGESTIONS}
            minChars={1}
            height={112}
            minHeight={80}
            popoverAriaLabel='คำแนะนำหมายเหตุคิว'
          />
        </Field>
      </div>
    </Popup>
  );
};

export default AddQueuePopup;
