import React, { useMemo, useState } from 'react';

import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Alert from '@/components/alert/Alert';
import PendingConsentFormCard from '@/components/consent/PendingConsentFormCard';
import { REGISTRATION_OTHER_CONSENT_CARDS } from '@/data/registrationConsentForms';

/* PHCIS | เวชระเบียน · ขั้นที่ 1 — "ดูแบบฟอร์มทั้งหมด"

   กลุ่ม "แบบฟอร์มอื่นๆ" บนหน้าโชว์ไม่กี่ใบพอให้กวาดตา ใบที่เหลือทั้งทะเบียนอยู่
   ในป๊อปอัปนี้ พร้อมช่องค้นหาชื่อ/รหัส

   กด "กรอกแบบฟอร์ม" จะปิดป๊อปอัปนี้แล้วเปิดตัวกรอกแทน (กติกา DS: ไม่ซ้อน popup
   บน popup) ตัวกรอกมีปุ่ม ‹ ย้อนกลับมาที่รายการนี้ */

const AllConsentFormsPopup = ({ open, onClose, onFill, onPrint }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REGISTRATION_OTHER_CONSENT_CARDS;
    return REGISTRATION_OTHER_CONSENT_CARDS.filter((f) => (
      `${f.title} ${f.code} ${f.categoryLabel}`.toLowerCase().includes(q)
    ));
  }, [query]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='แบบฟอร์มทั้งหมด'
      subtitle={`ใบยินยอมที่เผยแพร่อยู่ในระบบ ${REGISTRATION_OTHER_CONSENT_CARDS.length} ใบ — พิมพ์เตรียมไว้ หรือให้ลงนามที่เคาน์เตอร์ได้`}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <InputField
          value={query}
          onChange={setQuery}
          placeholder='ค้นหาชื่อแบบฟอร์ม หรือรหัส'
          leadingIcon='search'
          showLabel={false}
          showHelperText={false}
          style={{ maxWidth: 420 }}
        />
        {results.length === 0 ? (
          <Alert
            type='info'
            title='ไม่พบแบบฟอร์มที่ค้นหา'
            subtext={`ไม่มีใบยินยอมที่ตรงกับ “${query.trim()}”`}
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
          />
        ) : (
          <div
            className='grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 min-[1366px]:grid-cols-4 items-stretch'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            {results.map((item) => (
              <PendingConsentFormCard
                key={item.id}
                {...item}
                onPrint={() => onPrint?.(item)}
                onFill={() => onFill?.(item)}
              />
            ))}
          </div>
        )}
      </div>
    </Popup>
  );
};

export default AllConsentFormsPopup;
