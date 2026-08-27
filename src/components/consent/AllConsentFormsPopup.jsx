import React, { useMemo, useState } from 'react';

import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Alert from '@/components/alert/Alert';
import PendingConsentFormCard from '@/components/consent/PendingConsentFormCard';
import FilterTag from '@/components/forms/FilterTag';
import { REGISTRATION_OTHER_CONSENT_CARDS } from '@/data/registrationConsentForms';
import { downloadRegistrationConsentPdf } from '@/data/registrationConsentDownload';

/* PHCIS | เวชระเบียน · ขั้นที่ 1 — "ดูแบบฟอร์มทั้งหมด"

   กลุ่ม "แบบฟอร์มอื่นๆ" บนหน้าโชว์ไม่กี่ใบพอให้กวาดตา ใบที่เหลือทั้งทะเบียนอยู่
   ในป๊อปอัปนี้ พร้อมช่องค้นหาชื่อ/รหัส

   กด "กรอกแบบฟอร์ม" จะปิดป๊อปอัปนี้แล้วเปิดตัวกรอกแทน (กติกา DS: ไม่ซ้อน popup
   บน popup) ตัวกรอกมีปุ่ม ‹ ย้อนกลับมาที่รายการนี้ */

/** ประเภทแบบฟอร์มที่มีอยู่จริงในรายการ — ไล่จากข้อมูล ไม่ hardcode */
const FORM_TYPES = [...new Set(
  REGISTRATION_OTHER_CONSENT_CARDS.map((f) => f.categoryLabel).filter(Boolean),
)];

const ALL_TYPES = 'ทั้งหมด';

const AllConsentFormsPopup = ({ open, onClose, onFill, onPrint }) => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState(ALL_TYPES);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return REGISTRATION_OTHER_CONSENT_CARDS.filter((f) => {
      if (type !== ALL_TYPES && f.categoryLabel !== type) return false;
      if (!q) return true;
      return `${f.title} ${f.code} ${f.categoryLabel}`.toLowerCase().includes(q);
    });
  }, [query, type]);

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='extraLarge'
      title='แบบฟอร์มทั้งหมด'
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <InputField
            value={query}
            onChange={setQuery}
            placeholder='ค้นหาชื่อแบบฟอร์ม หรือรหัส'
            leadingIcon='search'
            showLabel={false}
            showHelperText={false}
            style={{ width: 360, maxWidth: '100%' }}
          />
          {/* กรองตามหัวข้อหลักของใบยินยอม — อยู่แถวเดียวกับช่องค้นหา */}
          <FilterTag
            value={ALL_TYPES}
            selected={type === ALL_TYPES}
            onClick={() => setType(ALL_TYPES)}
          />
          {FORM_TYPES.map((t) => (
            <FilterTag
              key={t}
              value={t}
              selected={type === t}
              onClick={() => setType(t)}
            />
          ))}
        </div>
        {results.length === 0 ? (
          <Alert
            type='info'
            title='ไม่พบแบบฟอร์มที่ค้นหา'
            subtext={query.trim()
              ? `ไม่มีใบยินยอมที่ตรงกับ “${query.trim()}”${type === ALL_TYPES ? '' : ` ในประเภท ${type}`}`
              : `ยังไม่มีใบยินยอมในประเภท ${type}`}
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
          />
        ) : (
          <div
            className='grid w-full items-stretch'
            /* 4 ใบต่อแถวเสมอ — breakpoint ของ Tailwind วัดจากความกว้างจอ ไม่ใช่ของ
               ป๊อปอัป พอจอกว้างแต่ป๊อปอัปแคบกว่า การ์ดจึงล้นออกนอกกรอบ */
            style={{
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 'var(--dim-space-400)',
            }}
          >
            {results.map((item) => (
              <PendingConsentFormCard
                key={item.id}
                {...item}
                onPrint={() => onPrint?.(item)}
                onDownload={() => downloadRegistrationConsentPdf(item)}
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
