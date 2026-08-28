import React, { useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { LabOrderBody } from '@/pages/lab/LabOrderPage';
import LabSpecimenLabel from '@/components/lab/LabSpecimenLabel';
import { LAB_ORDERS, withTestLabel, updateLabOrder } from '@/data/labOrders';
import { printLab } from '@/data/labPrintSettings';

/* หัวหน้าจอของโมดูลห้องปฏิบัติการ — ปุ่มสองตัวที่ต้องอยู่ทุกหน้าในโมดูล
   (มติผู้ใช้ 28 ส.ค. 69) เดิมมีเฉพาะหน้า Worklist ทำให้พอสลับไปหน้าอื่นผ่าน
   แถบเมนูย่อย ทางลัดที่ใช้บ่อยที่สุดสองอันหายไปเฉย ๆ

   แยกเป็นสองชิ้นเพราะลำดับบนหัวจอคือ พิมพ์ฉลาก → คำขอเข้าถึงข้อมูล →
   ส่งตรวจแล็บ โดยปุ่มกลางถูก render จาก SubHeader เอง ปุ่มพิมพ์ฉลากจึงไป
   ทาง `leadingActions` ส่วน CTA ไปทาง `actions` */

/* §1.15.5.1 — พิมพ์ฉลากติดหลอดทั้งชุด
   `rows` = ขอบเขตที่จะพิมพ์ หน้าที่มีตารางของตัวเองส่งมุมมองปัจจุบันมา เพื่อให้
   ตัวกรองบนหน้ามีผลจริง หน้าที่ไม่มีตารางของสิ่งส่งตรวจ (เช่น ส่งตรวจภายนอก)
   ไม่ต้องส่งอะไร แล้วจะพิมพ์ทุกรายการใน Worklist ที่ยังไม่เคยพิมพ์แทน */
export const LabPrintLabelsButton = ({ rows = null, onPrint }) => {
  const [printRows, setPrintRows] = useState([]);

  const pending = useMemo(() => {
    const scope = rows ?? LAB_ORDERS.map(withTestLabel);
    /* คำสั่งตรวจล่วงหน้ายังไม่มี Accession จึงพิมพ์ฉลากไม่ได้ ต้องกด "ดึงมาใช้" ก่อน */
    return scope.filter((r) => r.status !== 'advance' && !r.labeled);
  }, [rows]);

  const handleClick = () => {
    if (!pending.length) return;
    setPrintRows(pending);
    pending.forEach((r) => updateLabOrder(r.id, { labeled: true }));
    onPrint?.(pending);
    /* ให้แผ่นฉลาก render ด้วยรายการใหม่ก่อน แล้วค่อยสั่งพิมพ์ */
    window.setTimeout(() => printLab('sticker'), 0);
  };

  return (
    <>
      <NeutralSubdueButton
        variant='outline'
        leadingIcon='print'
        disabled={pending.length === 0}
        title={pending.length === 0
          ? 'ทุกรายการพิมพ์ฉลากแล้ว'
          : `พิมพ์ฉลาก ${pending.length} รายการที่ยังไม่ได้พิมพ์`}
        onClick={handleClick}
      >
        พิมพ์ฉลากตรวจแล็บ
      </NeutralSubdueButton>

      {/* แผ่นฉลากเฉพาะตอนพิมพ์ — ซ่อนไว้เสมอ `printLab('sticker')` เป็นตัวเปิด
          ผ่าน attribute บน root ที่ @media print อ่าน */}
      <div className='mih-lab-print-root'>
        <LabSpecimenLabel rows={printRows} />
      </div>
    </>
  );
};

/* ฟอร์มเดียวกับหน้า /lab/order ซึ่งถูกซ่อนออกจากเมนูไปแล้ว */
export const LabOrderCtaButton = ({ onDone }) => {
  const [open, setOpen] = useState(false);
  const actions = useRef(null);

  return (
    <>
      <BrandButton leadingIcon='biotech' onClick={() => setOpen(true)}>
        ส่งตรวจแล็บ
      </BrandButton>
      <Popup
        open={open}
        onClose={() => setOpen(false)}
        title='ส่งตรวจแล็บ'
        subtitle='ฟอร์มเดียวกับหน้าบันทึกส่งตรวจของห้องปฏิบัติการ'
        size='extraLarge'
        primaryAction={{ label: 'ส่งคำขอตรวจ', onClick: () => actions.current?.submit?.() }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setOpen(false) }}
      >
        <LabOrderBody
          hideActions
          actionsRef={actions}
          onDone={() => { setOpen(false); onDone?.(); }}
        />
      </Popup>
    </>
  );
};
