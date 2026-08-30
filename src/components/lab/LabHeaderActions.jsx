import React, { useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
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

  /* `printable` = ทุกรายการที่ออกฉลากได้ในขอบเขตนี้ · `pending` = เฉพาะที่ยัง
     ไม่เคยพิมพ์ คำสั่งตรวจล่วงหน้ายังไม่มี Accession จึงพิมพ์ไม่ได้ทั้งสองกอง
     ต้องกด "ดึงมาใช้" ก่อน */
  const { printable, pending } = useMemo(() => {
    const scope = rows ?? LAB_ORDERS.map(withTestLabel);
    const ready = scope.filter((r) => r.status !== 'advance');
    return { printable: ready, pending: ready.filter((r) => !r.labeled) };
  }, [rows]);

  const handleClick = () => {
    /* ปุ่มเปิดใช้เสมอ (มติผู้ใช้ 30 ส.ค. 69) — ถ้าไม่เหลือรายการที่ยังไม่พิมพ์
       ให้พิมพ์ซ้ำทั้งมุมมองปัจจุบัน เพราะฉลากหายหรือติดพลาดเป็นเรื่องปกติหน้างาน */
    const batch = pending.length ? pending : printable;
    if (!batch.length) return;
    setPrintRows(batch);
    batch.forEach((r) => updateLabOrder(r.id, { labeled: true }));
    onPrint?.(batch);
    /* ให้แผ่นฉลาก render ด้วยรายการใหม่ก่อน แล้วค่อยสั่งพิมพ์ */
    window.setTimeout(() => printLab('sticker'), 0);
  };

  return (
    <>
      <NeutralSubdueButton
        variant='outline'
        leadingIcon='print'
        title={pending.length
          ? `พิมพ์ฉลาก ${pending.length} รายการที่ยังไม่ได้พิมพ์`
          : `ทุกรายการพิมพ์ฉลากแล้ว — กดเพื่อพิมพ์ซ้ำ ${printable.length} รายการในมุมมองนี้`}
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

/* เพิ่มรายการตรวจเข้าทะเบียน — ปุ่มต้องอยู่ในเมนูห้องปฏิบัติการของระบบ PHCIS
   ด้วย (มติผู้ใช้ 30 ส.ค. 69) ทะเบียนรายการตรวจย้ายไปอยู่ จัดการระบบ ตั้งแต่
   28 ส.ค. 69 คนหน้างานที่เจอรายการตรวจใหม่จึงไม่มีทางเข้าถึงจากโมดูลตัวเอง
   ปุ่มนี้พาไปหน้าทะเบียนพร้อมเปิดฟอร์ม "เพิ่มรายการตรวจใหม่" ให้เลย — ฟอร์มเดียว
   ที่เดียว ไม่แตกเป็นสองชุดที่ต้องดูแลคู่กัน */
export const LabAddTestButton = () => {
  const history = useHistory();
  return (
    <NeutralSubdueButton
      /* md เท่ากับปุ่มเดียวกันบนหัวการ์ดทะเบียน (มติผู้ใช้ 31 ส.ค. 69) — ไม่ปล่อยให้
         ไปหยิบขนาดจาก ButtonSizeAliasProvider ของ SubHeader ซึ่งเป็น sm */
      size='md'
      variant='outline'
      leadingIcon='add'
      title='เพิ่มทะเบียนรายการตรวจ (จัดการระบบ › ทะเบียนรายการตรวจ)'
      onClick={() => history.push('/admin/lab/registry?new=1')}
    >
      เพิ่มทะเบียนรายการตรวจ
    </NeutralSubdueButton>
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
