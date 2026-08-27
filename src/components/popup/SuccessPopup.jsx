import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { SUCCESS_LOTTIE } from '@/components/layout/SuccessScreen';

/* MIH SuccessPopup — ป๊อปอัป "สำเร็จ" หลังกดบันทึก/ลงนามในป๊อปอัป

   ใช้ Lottie เช็คถูกไฟล์เดียวกับ <SuccessScreen> (`/illustration/success.json`)
   แต่เป็นป๊อปอัปขนาดปกติ ไม่ใช่จอเต็มหน้า — เพราะงานที่จบใน popup ไม่ควร
   พาผู้ใช้ออกจากหน้าที่ทำอยู่ (มติผู้ใช้ 27 ส.ค. 69: ทุกหน้าที่กดบันทึกใน
   popup ต้องขึ้นป๊อปอัปสำเร็จ ไม่ใช่ toast)

   แยกออกมาจาก ConsentDashboardPage ที่เป็นเจ้าแรกที่ทำ pattern นี้ ทุกหน้า
   จะได้ใช้ตัวเดียวกันแทนที่จะ copy markup กันไปมา */

export default function SuccessPopup({
  open,
  title,
  description,
  buttonLabel = 'ตกลง',
  onClose,
  /** ปุ่มรอง (ถ้าต้องมีทางแยก เช่น "ดูรายการทั้งหมด") */
  secondaryAction,
  lottieSize = 160,
}) {
  const [anim, setAnim] = useState(null);

  /* โหลด Lottie ครั้งเดียวตอน mount — ถ้าโหลดไม่ได้ก็แสดงเฉพาะข้อความ */
  useEffect(() => {
    let alive = true;
    fetch(SUCCESS_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setAnim(d); })
      .catch(() => { /* ไม่มีไฟล์ก็ข้ามภาพประกอบไป */ });
    return () => { alive = false; };
  }, []);

  return (
    <Popup
      open={Boolean(open)}
      onClose={onClose}
      size='default'
      showCloseButton={false}
      secondaryAction={secondaryAction}
      primaryAction={{ label: buttonLabel, onClick: onClose }}
    >
      <div
        className='flex flex-col items-center text-center w-full'
        style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-400)' }}
      >
        {anim && (
          <LottieIllustration animationData={anim} size={lottieSize} loop={false} ariaLabel='' />
        )}
        <span
          style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg)',
            lineHeight: 1.4,
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            {description}
          </span>
        )}
      </div>
    </Popup>
  );
}
