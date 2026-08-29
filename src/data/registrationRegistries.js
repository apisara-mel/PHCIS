/* PHCIS — ทะเบียนของระบบงานเวชระเบียน (Medical Record registries)
   ══════════════════════════════════════════════════════════════════════
   ศูนย์บริการสาธารณสุขใช้ "เวชระเบียนของศูนย์" ชุดเดียวร่วมกันทุกคลินิก
   ยกเว้นสองคลินิกที่กฎหมายกำหนดให้เก็บทะเบียนแยกและจำกัดผู้เข้าถึง:

     • คลินิกรักปลอดภัย (เดิมชื่อ "คลินิกโรคติดต่อทางเพศสัมพันธ์และโรคเอดส์")
       — พ.ร.บ.โรคเอดส์ / แนวปฏิบัติการรักษาความลับผู้ติดเชื้อ HIV
     • คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด
       — ประมวลกฎหมายยาเสพติด: ผู้เข้ารับการบำบัดได้รับการคุ้มครองข้อมูล

   ทะเบียนสองชุดหลังจึงไม่ใช่ "มุมมองที่กรองมาจากทะเบียนศูนย์" แต่เป็นทะเบียน
   คนละเล่ม มีเลขคิว/รายชื่อ/ประวัติการค้นหาของตัวเอง ผู้ที่ไม่มีสิทธิ์ในคลินิก
   นั้นจะไม่เห็นแม้แต่ว่ามีคนไข้อยู่กี่ราย (มติผู้ใช้ 29 ส.ค. 69)

   ไฟล์นี้เป็นแหล่งความจริงเดียวของ: เมนูย่อยใน rail · route · หัวข้อหน้า ·
   ขนาด roster ของแต่ละทะเบียน — เพิ่มทะเบียนใหม่ที่นี่ที่เดียว */

/** ทะเบียนกลางของศูนย์ — ใช้ร่วมทุกคลินิกที่ไม่ได้ถูกกันออกไว้ */
export const REGISTRY_CENTER = 'center';
/** คลินิกรักปลอดภัย (HIV / STI) */
export const REGISTRY_SAFE_LOVE = 'safe-love';
/** คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด */
export const REGISTRY_ADDICTION = 'addiction';

export const REGISTRATION_REGISTRIES = [
  {
    key: REGISTRY_CENTER,
    /* label = ชื่อในเมนูย่อย · title = หัวข้อหน้า (SubHeader) */
    label: 'เวชระเบียนของศูนย์',
    title: 'ระบบงานเวชระเบียน',
    breadcrumb: ['ระบบงานเวชระเบียน'],
    path: '/registration/queue',
    /* เมนูย่อยใช้ key นี้ · หน้ายังส่ง activeKey='registration' เหมือนเดิม */
    menuKey: 'mr-center',
    confidential: false,
    /* คลินิกที่ใช้ทะเบียนนี้ = ทุกคลินิกที่ไม่ได้อยู่ในทะเบียนแยก */
    clinicKey: null,
    rosterSize: 130,
    /* offset ในกองโปรไฟล์ — ทะเบียนคนละเล่มจึงไม่ควรได้รายชื่อชุดเดียวกัน */
    seedOffset: 0,
  },
  {
    key: REGISTRY_SAFE_LOVE,
    label: 'เวชระเบียนคลินิกรักปลอดภัย',
    title: 'เวชระเบียนคลินิกรักปลอดภัย',
    breadcrumb: ['ระบบงานเวชระเบียน', 'คลินิกรักปลอดภัย'],
    path: '/registration/safe-love',
    menuKey: 'mr-safe-love',
    confidential: true,
    clinicKey: 'std',
    /* ทะเบียนแยกมีคนไข้น้อยกว่าทะเบียนศูนย์มาก — ตัวเลขนี้คุมทั้ง roster
       และการ์ดสรุป ซึ่งคำนวณจาก roster จริงไม่ได้ hardcode */
    rosterSize: 24,
    seedOffset: 37,
    /* ข้อความแจ้งเตือนบนหัวหน้า — ทะเบียนลับต้องบอกให้ชัดว่านี่คนละเล่ม */
    noticeTitle: 'ทะเบียนลับเฉพาะคลินิก',
    noticeSubtext:
      'ทะเบียนนี้แยกจากเวชระเบียนของศูนย์ เปิดให้เฉพาะผู้มีสิทธิ์ในคลินิกรักปลอดภัย '
      + 'การเปิดดูทุกครั้งถูกบันทึกไว้ในร่องรอยการใช้งาน',
  },
  {
    key: REGISTRY_ADDICTION,
    label: 'เวชระเบียนคลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด',
    title: 'เวชระเบียนคลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด',
    breadcrumb: ['ระบบงานเวชระเบียน', 'คลินิกบำบัดและรักษาผู้ป่วยติดสารเสพติด'],
    path: '/registration/addiction',
    menuKey: 'mr-addiction',
    confidential: true,
    clinicKey: 'drug',
    rosterSize: 18,
    seedOffset: 73,
    noticeTitle: 'ทะเบียนลับเฉพาะคลินิก',
    noticeSubtext:
      'ทะเบียนนี้แยกจากเวชระเบียนของศูนย์ เปิดให้เฉพาะผู้มีสิทธิ์ในคลินิกบำบัดและรักษา'
      + 'ผู้ป่วยติดสารเสพติด การเปิดดูทุกครั้งถูกบันทึกไว้ในร่องรอยการใช้งาน',
  },
];

const BY_KEY = Object.fromEntries(REGISTRATION_REGISTRIES.map((r) => [r.key, r]));

/** คืนนิยามทะเบียน — key ที่ไม่รู้จักตกกลับไปที่ทะเบียนของศูนย์ */
export const getRegistrationRegistry = (key) => BY_KEY[key] ?? BY_KEY[REGISTRY_CENTER];

/** รายการเมนูย่อยของเมนู "เวชระเบียน" ใน rail — เรียงตามลำดับในไฟล์นี้ */
export const REGISTRATION_MENU_SUBITEMS = REGISTRATION_REGISTRIES.map((r) => ({
  key: r.menuKey,
  label: r.label,
  path: r.path,
}));

/** ทะเบียนแยกทั้งหมด (ไม่รวมของศูนย์) — ใช้สร้าง route และตรวจสิทธิ์ */
export const CONFIDENTIAL_REGISTRIES = REGISTRATION_REGISTRIES.filter((r) => r.confidential);
