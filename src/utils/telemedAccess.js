/* TOR §1.13.2 — "ผู้มีสิทธิ์สามารถเพิ่ม/แก้ไขข้อมูลการประเมินได้"
   Role gate for the Telemedicine module. Roles mirror the team described in
   ~/MIH-Docs-Vault/คู่มือ Telemed/ตัวอย่างคู่มือ Telamed.pdf บทที่ 2
   ("บทบาททีมให้บริการ Telemedicine"):

     จนท.รพ.สต.        — ต้นทางที่ส่งผู้รับบริการเข้าระบบ
     เวชระเบียน        — ลงทะเบียน + ขอ Authen Code สปสช.
     พยาบาล            — ซักประวัติ + สัญญาณชีพ + บันทึกการประเมิน
     แพทย์             — วินิจฉัย + สั่งการรักษา
     เภสัชกร           — ดูคำสั่งยา
     IT / PDPA officer — ดูแลความยินยอมและไฟล์บันทึกสาย
     ผู้สังเกตการณ์      — นักศึกษา / ผู้เยี่ยมชม (read-only)

   No API — the "current user" is a module-local mock the pages read so every
   screen can demo the สิทธิ์ไม่พอ state without a login flow. */

import { appendAuditEvent } from '@/pages/audit/auditData';

export const TELEMED_ROLES = [
  {
    key: 'doctor',
    label: 'แพทย์',
    short: 'แพทย์',
    user: 'พญ.สมหญิง รักษาดี',
    caps: ['view', 'viewEmr', 'viewPii', 'add', 'edit', 'cancel', 'order', 'record', 'editRpm', 'notify', 'stats'],
  },
  {
    key: 'nurse',
    label: 'พยาบาลวิชาชีพ',
    short: 'พยาบาล',
    user: 'พว.กนกวรรณ ศรีทอง',
    caps: ['view', 'viewEmr', 'viewPii', 'add', 'edit', 'cancel', 'record', 'editRpm', 'notify'],
  },
  {
    key: 'phc',
    label: 'เจ้าหน้าที่ รพ.สต. / ศูนย์บริการต้นทาง',
    short: 'จนท.รพ.สต.',
    user: 'นางสาวปิยะดา แก้วใส',
    caps: ['view', 'add', 'edit', 'notify', 'editRpm'],
  },
  {
    key: 'registrar',
    label: 'เวชระเบียน (Authen Code สปสช.)',
    short: 'เวชระเบียน',
    user: 'นายวีรยุทธ พงษ์ไพศาล',
    caps: ['view', 'viewPii', 'add', 'edit', 'cancel', 'notify'],
  },
  {
    key: 'pharmacist',
    label: 'เภสัชกร',
    short: 'เภสัชกร',
    user: 'ภก.ณัฐวุฒิ อารีย์',
    caps: ['view', 'viewEmr'],
  },
  {
    key: 'pdpa',
    label: 'IT / เจ้าหน้าที่คุ้มครองข้อมูล (PDPA)',
    short: 'IT-PDPA',
    user: 'นายอธิป ธำรงรัตน์',
    caps: ['view', 'consent', 'deleteRecording', 'stats', 'audit'],
  },
  {
    key: 'observer',
    label: 'ผู้สังเกตการณ์ (นักศึกษา / ผู้เยี่ยมชม)',
    short: 'ผู้สังเกตการณ์',
    user: 'นายพงศกร วรรณศิริ',
    caps: ['view'],
  },
];

export const TELEMED_ROLE_OPTIONS = TELEMED_ROLES.map((r) => ({ value: r.key, label: r.label }));

/** Capability → ข้อความบอกเหตุผลเวลาปุ่มถูกปิด (Nielsen #9 — บอกทางแก้ ไม่ใช่แค่ห้าม). */
export const TELEMED_CAP_REASON = {
  add:             'บทบาทของคุณไม่มีสิทธิ์เพิ่มข้อมูลการประเมิน — ขอสิทธิ์ที่ผู้ดูแลระบบ (จัดการระบบ › สิทธิ์ผู้ใช้งาน)',
  edit:            'บทบาทของคุณไม่มีสิทธิ์แก้ไขข้อมูลการประเมิน — ขอสิทธิ์ที่ผู้ดูแลระบบ',
  cancel:          'บทบาทของคุณไม่มีสิทธิ์ยกเลิกรายการ — ขอสิทธิ์ที่ผู้ดูแลระบบ',
  order:           'สั่งยา / สั่งตรวจ ทำได้เฉพาะแพทย์ผู้ให้บริการในสาย',
  record:          'การเริ่ม-หยุดบันทึกสายทำได้เฉพาะแพทย์และพยาบาลผู้ให้บริการ',
  editRpm:         'บทบาทของคุณไม่มีสิทธิ์แก้ไขค่าที่รับจากอุปกรณ์ที่บ้าน',
  viewEmr:         'ต้องขอสิทธิ์เข้าถึงเวชระเบียน (EMR) ก่อนจึงจะเปิดดูข้อมูลผู้รับบริการระหว่างสายได้',
  viewPii:         'ข้อมูลส่วนบุคคลถูกปิดบังตามระดับสิทธิ์ของคุณ (TOR §1.4.2)',
  consent:         'การจัดการความยินยอมทำได้เฉพาะเจ้าหน้าที่ PDPA',
  deleteRecording: 'การลบไฟล์บันทึกสายทำได้เฉพาะเจ้าหน้าที่ PDPA',
  notify:          'บทบาทของคุณไม่มีสิทธิ์ส่งข้อความแจ้งเตือนผู้รับบริการ',
  stats:           'รายงานสถิติทั้งหน่วยบริการเปิดให้เฉพาะผู้ดูแลระบบ / หัวหน้างาน — คุณเห็นเฉพาะสถิติของตนเอง',
  audit:           'บันทึกการเข้าใช้งานเปิดให้เฉพาะผู้ดูแลระบบ / เจ้าหน้าที่ PDPA',
};

export const getTelemedRole = (roleKey) =>
  TELEMED_ROLES.find((r) => r.key === roleKey) || TELEMED_ROLES[0];

/** true เมื่อบทบาทนั้นทำ capability ได้ */
export const telemedCan = (roleKey, cap) => getTelemedRole(roleKey).caps.includes(cap);

/** ข้อความอธิบายว่าทำไมทำไม่ได้ (undefined = ทำได้) */
export const telemedDenyReason = (roleKey, cap) =>
  (telemedCan(roleKey, cap) ? undefined : (TELEMED_CAP_REASON[cap] || 'บทบาทของคุณไม่มีสิทธิ์ในการดำเนินการนี้'));

/** ชื่อผู้ใช้ที่ถูกบันทึกลง audit / "ผู้บันทึก" บน UI */
export const telemedActor = (roleKey) => getTelemedRole(roleKey).user;

/** ปิดบัง PII เมื่อบทบาทไม่มีสิทธิ์ (TOR §1.4.2) — เก็บ 2 ตัวแรกไว้เป็น context */
export const maskPii = (value, roleKey) => {
  if (!value) return '—';
  if (telemedCan(roleKey, 'viewPii')) return value;
  const text = String(value);
  if (text.length <= 3) return '•••';
  return `${text.slice(0, 2)}${'•'.repeat(Math.max(3, text.length - 4))}${text.slice(-2)}`;
};

/**
 * บันทึกเหตุการณ์ของโมดูล Telemedicine ลง audit log กลาง (TOR §1.13.11).
 * คืน entry ที่ append แล้ว เพื่อให้หน้าจอเอาไปแสดง "ผู้บันทึก + เวลา" ได้ทันที.
 */
export const logTelemedEvent = (roleKey, action, { ok = true, detail } = {}) =>
  appendAuditEvent({
    user: telemedActor(roleKey),
    action: detail ? `${action} · ${detail}` : action,
    mod: 'Telemedicine',
    ok,
  });

/** Default role ของแต่ละหน้า — เปลี่ยนได้จาก role switcher บนหน้าจอ */
export const TELEMED_DEFAULT_ROLE = 'doctor';
