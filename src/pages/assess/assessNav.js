/* PHCIS | Assess-control — side menu (Figma 17:25402 Open / 1:2559 Hide).
   The assess (จัดการระบบ) system shares ONE Side Menu with the /admin pages, so
   this re-exports the canonical SYSTEM_NAV. Both page sets therefore render the
   identical 9-item menu (แดชบอร์ด · ศูนย์บริการ · Group Policy · แผนก ·
   ตั้งค่าห้องตรวจและโควตารายวัน · ตำแหน่ง · สิทธิการเข้าถึง · สิทธิตามความยินยอม ·
   บุคลากร) with the shared <Sidebar>'s Open/Hide states. */
import SYSTEM_NAV from '@/pages/system/systemNav';

export const ASSESS_NAV = SYSTEM_NAV;

export default ASSESS_NAV;
