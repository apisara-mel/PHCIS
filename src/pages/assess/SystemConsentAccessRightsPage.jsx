/* ต้อง import React ตรง ๆ — โปรเจกต์รันบน React 17 + vite 2 ซึ่งยังใช้ classic
   JSX runtime (JSX ถูกแปลงเป็น React.createElement) ถ้าไม่มีบรรทัดนี้หน้าจะ
   crash ทันทีด้วย "React is not defined" ทั้งที่ไฟล์อื่นดูเหมือนไม่ได้ใช้ React. */
import React from 'react';
import ConsentAccessRightsPage from '@/pages/consent/ConsentAccessRightsPage';

/* PHCIS | จัดการระบบ — สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม (TOR ด.1.1.18).
   Reuses ConsentAccessRightsPage with the system-management shell (/assess). */

export default function SystemConsentAccessRightsPage() {
  return <ConsentAccessRightsPage />;
}
