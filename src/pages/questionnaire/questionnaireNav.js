import { QUESTIONNAIRE_MODULES } from '@/data/questionnaire';

/* แบบสัมภาษณ์ลูกค้า (BA/SA Questionnaire) เป็นเครื่องมือภายในของทีม BA/SA
   ไม่ใช่หน้าจอของ PHCIS — จึงมีเมนูข้างของตัวเอง เหมือน AUDIT_NAV โดยส่ง
   เข้า <QueuePageShell sidebarItems={...}>. ไอคอนใช้ชื่อ Material Symbols
   ตรงตาม design.md Appendix B */

export const QUESTIONNAIRE_NAV = [
  { key: 'q-overview', label: 'ภาพรวมการสัมภาษณ์', icon: 'fact_check', path: '/questionnaire' },
  ...QUESTIONNAIRE_MODULES.map((m) => ({
    key: `q-${m.key}`,
    label: m.label,
    icon: m.icon,
    path: `/questionnaire/${m.key}`,
  })),
];

export default QUESTIONNAIRE_NAV;
