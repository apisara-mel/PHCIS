/* PHCIS | Assess-control — side menu (Figma 17:25402 Open / 1:2559 Hide).
   The assess (จัดการระบบ) system shares ONE Side Menu with the /admin pages, so
   this re-exports the canonical SYSTEM_NAV. Both page sets therefore render the
   identical menu (แดชบอร์ด · โครงสร้างองค์กรและสิทธิ์ · บุคลากร ·
   ทะเบียนรายการตรวจ · วันหยุดประจำปี · เทมเพลตแดชบอร์ด · ระบบบริหารจัดการคิว)
   with the shared <Sidebar>'s Open/Hide states.
   ("แผนก" ถูกถอดออกจากเมนู 10 ส.ค. 2569 — ย้ายไปผูกกับศูนย์บริการแล้ว ·
    รูปแบบโครงสร้างศูนย์ · ศูนย์บริการ · ตำแหน่ง · บทบาท · สิทธิ์การเข้าถึงระบบ
    ยุบเป็นแท็บใต้เมนู "โครงสร้างองค์กรและสิทธิ์" 29 ส.ค. 2569) */
import SYSTEM_NAV from '@/pages/system/systemNav';

export const ASSESS_NAV = SYSTEM_NAV;

export default ASSESS_NAV;
