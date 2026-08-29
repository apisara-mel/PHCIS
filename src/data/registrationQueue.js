import { PATIENT_PROFILES, PENDING_REGISTRATION_NO_PHOTO } from '@/data/patientProfiles';
import { MR_PATIENTS } from '@/data/mrPatients';
import { USERS } from '@/data/usersAccess';
import { REGISTRY_CENTER } from '@/data/registrationRegistries';

/* MIH registrationQueue — shared roster for the เวชระเบียน queue page
   (Figma 2756:148259) and the in-form QueueSubMenu side panel on
   ข้อมูลผู้รับบริการ (/registration/register).

   Both surfaces must agree on queue slots and visit-status buckets
   (รอลงทะเบียน / กำลังลงทะเบียน / ลงทะเบียนแล้ว / ที่ร่างไว้). */

const MR_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p]));

/* ตู้ Kiosk บังคับเสียบบัตรประชาชนก่อนกดคิว ระบบจึงรู้ตัวตนตั้งแต่รับคิว —
   แถวช่องทางนี้ต้องมีรูปและชื่อ ต่างจากคิวที่รับกับเจ้าหน้าที่ซึ่งอาจยังไม่รู้ว่า
   เป็นใคร (มติผู้ใช้ 27 ส.ค. 69) */
export const QUEUE_CHANNEL_KIOSK = 'ผ่านตู้ Kiosk';

const QUEUE_CHANNEL_OPTIONS = [
  QUEUE_CHANNEL_KIOSK,
  'รับกับเจ้าหน้าที่',
  'กับเจ้าหน้าที่ ณ อนามัย',
];

/* ประเภทการเข้ารับบริการ (คอลัมน์ "ประเภท") — แยกช่องทางนัดหมายออกจากกัน
   (มติผู้ใช้ 27 ส.ค. 69). ของเดิมมีแค่ นัดหมายล่วงหน้า / ไม่ได้นัดหมาย /
   ด้วยตนเองผ่าน Application ซึ่งปนกันสองแกน: "นัดหรือไม่นัด" กับ "ใครเป็นคนจอง"
   ทำให้ตอบไม่ได้ว่านัดใบไหนเป็น Telemed */
export const VISIT_TYPE_ONSITE = 'นัดหมาย-ที่ศูนย์บริการ';
export const VISIT_TYPE_TELEMED_SELF = 'นัดหมาย-Telemed-ด้วยตนเอง';
export const VISIT_TYPE_TELEMED_STAFF = 'นัดหมาย-Telemed โดยเจ้าหน้าที่';
export const VISIT_TYPE_WALKIN = 'Walk-in';

export const VISIT_TYPE_OPTIONS = [
  VISIT_TYPE_ONSITE,
  VISIT_TYPE_TELEMED_SELF,
  VISIT_TYPE_TELEMED_STAFF,
  VISIT_TYPE_WALKIN,
];

/** ค่า filter ของแต่ละประเภท — ใช้ร่วมกันระหว่างตารางกับดรอปดาวน์ "ประเภท" */
export const VISIT_TYPE_TO_FILTER = {
  [VISIT_TYPE_ONSITE]: 'appointment-onsite',
  [VISIT_TYPE_TELEMED_SELF]: 'appointment-telemed-self',
  [VISIT_TYPE_TELEMED_STAFF]: 'appointment-telemed-staff',
  [VISIT_TYPE_WALKIN]: 'walkin',
};

/** "นัดหมายทั้งหมด" — รวมนัดสามแบบ (ที่ศูนย์ · Telemed ด้วยตนเอง · Telemed
    โดยเจ้าหน้าที่) ไม่รวม Walk-in. เจ้าหน้าที่ส่วนใหญ่อยากรู้แค่ "วันนี้มีนัดกี่ราย"
    ไม่ได้แยกช่องทางจอง ถ้ามีแต่ตัวเลือกละเอียดต้องเลือกทีละแบบแล้วบวกเอง
    (มติผู้ใช้ 29 ส.ค. 69) */
export const VISIT_TYPE_FILTER_ALL_APPOINTMENTS = 'appointment-all';

export const VISIT_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'ทุกประเภท' },
  { value: VISIT_TYPE_FILTER_ALL_APPOINTMENTS, label: 'นัดหมายทั้งหมด' },
  ...VISIT_TYPE_OPTIONS.map((label) => ({ value: VISIT_TYPE_TO_FILTER[label], label })),
];

/** แถวนี้ผ่านตัวกรอง "ประเภท" ค่านี้หรือไม่ — ที่เดียวที่รู้ว่า `appointment-all`
    หมายถึงนัดสามแบบรวมกัน ผู้เรียกจึงไม่ต้องรู้เอง */
export const matchesVisitTypeFilter = (visitType, filterValue) => {
  if (!filterValue || filterValue === 'all') return true;
  if (filterValue === VISIT_TYPE_FILTER_ALL_APPOINTMENTS) {
    return isAppointmentVisitType(visitType);
  }
  return VISIT_TYPE_TO_FILTER[visitType] === filterValue;
};

/** จริงหรือไม่ว่าแถวนี้มาตามนัด (ทั้งสามแบบ) — Walk-in และแถวที่ยังไม่เคยมา = false */
export const isAppointmentVisitType = (visitType) => (
  Boolean(visitType) && visitType !== VISIT_TYPE_WALKIN
);

/* Telemed ยังเป็นสัดส่วนน้อยของงานจริง (การ์ดสรุปบนหน้าเดียวกัน: Telemedicine
   วันนี้ = 4) — ถ้าใช้ `i % 4` ทุกประเภทจะได้ 25% เท่ากันแล้วขัดกับการ์ด
   จึงถ่วงน้ำหนักด้วยแพตเทิร์นแทน */
const VISIT_TYPE_PATTERN = [
  VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN, VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN,
  VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN, VISIT_TYPE_ONSITE, VISIT_TYPE_TELEMED_SELF,
  VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN, VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN,
  VISIT_TYPE_ONSITE, VISIT_TYPE_WALKIN, VISIT_TYPE_TELEMED_STAFF, VISIT_TYPE_ONSITE,
];

/* Default table / submenu ordering — ลงทะเบียนแล้ว → ที่ร่างไว้ →
   กำลังลงทะเบียน → รอลงทะเบียน, then queue id within each bucket. */
export const REGISTRATION_STATUS_SORT_ORDER = {
  done: 0,
  draft: 1,
  progress: 2,
  pending: 3,
};

export const compareRegistrationQueueRows = (a, b) => {
  const byStatus = (REGISTRATION_STATUS_SORT_ORDER[a.status] ?? 99)
    - (REGISTRATION_STATUS_SORT_ORDER[b.status] ?? 99);
  if (byStatus !== 0) return byStatus;
  return String(a.queue).localeCompare(String(b.queue));
};

/* Demo distribution — ลงทะเบียนแล้ว 2 · กำลังลงทะเบียน 2 · รอลงทะเบียน … */
const seedRegistrationStatus = (i) => {
  if (i < 2) return 'done';
  if (i < 4) return 'progress';
  if (i < 16) return 'pending';
  if (i < 22) return 'draft';
  return 'pending';
};

/** "42 ปี - 3 เดือน - 8 วัน" → "42" — ตารางคิวแสดงเฉพาะปี
    export เพื่อให้ป๊อปอัป "เพิ่มคิว" แปลงอายุด้วยกฎเดียวกัน */
export const ageYearsOnly = (age) => {
  const m = String(age ?? '').match(/^(\d+)/);
  return m ? m[1] : '';
};

/* เจ้าหน้าที่เวชระเบียนที่กำลังลงทะเบียนอยู่ — ดึงจากทะเบียนผู้ใช้จริง ไม่ตั้ง
   ชื่อขึ้นมาใหม่ ถ้าเพิ่ม/ลบผู้ใช้ในระบบสิทธิ์ รายชื่อตรงนี้ตามทันที */
const REGISTRARS = USERS
  .filter((u) => u.role === 'registrar' && u.status === 'active')
  .map((u) => u.name);

/* Build a 130-row roster — one PATIENT_PROFILES entry per index (same pool
   as OPD queue / Screening PatientCard), MR fields for phone/rights/status. */
export const buildRegistrationQueueRoster = (opts = 130) => {
  /* รับได้ทั้งตัวเลข (ผู้เรียกเดิม) และ object (ทะเบียนแยกของคลินิกลับ)
     — ทะเบียนคนละเล่มต้องได้รายชื่อคนละชุด ไม่ใช่ 20 แถวแรกของทะเบียนศูนย์
     จึงเลื่อน seed ด้วย `seedOffset` (ดู registrationRegistries.js) */
  const cfg = typeof opts === 'number' ? { total: opts } : (opts ?? {});
  /* catalog เรียกฟิลด์นี้ว่า `rosterSize` (อ่านรู้เรื่องกว่าในบริบทของทะเบียน)
     ส่วนผู้เรียกเดิมส่ง `total` มา — รับทั้งสองชื่อ */
  const { seedOffset = 0, registryKey = REGISTRY_CENTER } = cfg;
  const total = cfg.total ?? cfg.rosterSize ?? 130;
  const rows = [];
  let pendingNoPhotoIdx = 0;
  for (let i = 0; i < total; i += 1) {
    const seed = i + seedOffset;
    const status = seedRegistrationStatus(i);
    const queueChannel = QUEUE_CHANNEL_OPTIONS[seed % QUEUE_CHANNEL_OPTIONS.length];
    /* คิวที่ยังไม่รู้ตัวตนมีได้เฉพาะช่องทางที่ไม่ได้เสียบบัตร — คิวจากตู้ Kiosk
       อ่านบัตรมาแล้ว จึงมีโปรไฟล์เต็มเสมอ */
    const usePendingNoPhoto = status === 'pending'
      && queueChannel !== QUEUE_CHANNEL_KIOSK
      && pendingNoPhotoIdx < PENDING_REGISTRATION_NO_PHOTO.length;
    const profile = usePendingNoPhoto
      ? PENDING_REGISTRATION_NO_PHOTO[pendingNoPhotoIdx++]
      : PATIENT_PROFILES[seed % PATIENT_PROFILES.length];
    const neverServed = Boolean(usePendingNoPhoto || profile.neverServed);
    const mr = profile.hn ? MR_BY_HN[profile.hn] : null;
    const fallbackMr = MR_PATIENTS[seed % MR_PATIENTS.length];
    /* First in-progress row is VIP — matches QueueSubMenu Figma chip. */
    const isVip = status === 'progress' && i === 2;
    rows.push({
      id: `MR-${String(i + 1).padStart(3, '0')}`,
      queue: `A${String(i + 1).padStart(3, '0')}`,
      hn: neverServed ? '' : profile.hn,
      name: neverServed ? '' : profile.fullName,
      age: neverServed ? '' : ageYearsOnly(profile.age),
      nationalId: neverServed ? '' : profile.nationalId,
      passportNo: neverServed ? '' : (mr?.passportNo ?? ''),
      lifeStatus: neverServed ? 'alive' : (mr?.lifeStatus ?? 'alive'),
      deceasedDate: neverServed ? '' : (mr?.deceasedDate ?? ''),
      phone: neverServed ? '' : (mr?.phone ?? fallbackMr.phone),
      rights: neverServed
        ? (profile.rights || fallbackMr.rights)
        : (mr?.rights ?? fallbackMr.rights),
      queueChannel,
      visitType: neverServed ? '' : VISIT_TYPE_PATTERN[seed % VISIT_TYPE_PATTERN.length],
      patientStatus: neverServed ? 'inactive' : (seed % 7 === 0 ? 'inactive' : 'active'),
      status,
      /* รูป profile — ตัวเดียวกับที่ตารางคิวเวชระเบียนใช้ (PATIENT_PROFILES)
         พกมากับแถวเลย พาเนลข้างฟอร์มจะได้ไม่ต้องไป lookup เองแล้วหลุดกัน */
      avatarUrl: neverServed ? undefined : profile.avatarUrl,
      noProfilePhoto: neverServed,
      neverServed,
      vipBadge: isVip ? 'VIP / ผู้ป่วยพิเศษ' : undefined,
      /* เฉพาะแถวที่กำลังทำอยู่ — คิวที่ยังไม่มีใครหยิบยังไม่มีเจ้าของงาน
         (มติผู้ใช้ 29 ส.ค. 69) */
      registeredBy: status === 'progress' && REGISTRARS.length > 0
        ? REGISTRARS[seed % REGISTRARS.length]
        : '',
      registryKey,
    });
  }
  return rows;
};

export const REGISTRATION_QUEUE_ROWS = buildRegistrationQueueRoster();

/* Bucket helper for QueueSubMenu — maps MR visit statuses onto the four
   panel sections (done / draft / inProgress / waiting). */
const DEFAULT_PREVIEW = { done: 2, draft: 2, inProgress: 2, waiting: 2 };

export const buildRegistrationQueueSubMenuBuckets = (
  rows = REGISTRATION_QUEUE_ROWS,
  preview = DEFAULT_PREVIEW,
) => {
  const previewMap = typeof preview === 'number'
    ? { done: preview, draft: preview, inProgress: preview, waiting: preview }
    : { ...DEFAULT_PREVIEW, ...preview };
  const bucket = (status, limit) => {
    const all = rows
      .filter((r) => r.status === status)
      .slice()
      .sort(compareRegistrationQueueRows);
    return { items: all.slice(0, limit), total: all.length };
  };
  return {
    done:       bucket('done',     previewMap.done),
    draft:      bucket('draft',    previewMap.draft),
    inProgress: bucket('progress', previewMap.inProgress),
    waiting:    bucket('pending',  previewMap.waiting),
  };
};

/* Section labels for QueueSubMenu on เวชระเบียน flows. */
export const REGISTRATION_QUEUE_SUBMENU_LABELS = {
  done:       (n) => `ลงทะเบียนแล้ว (${n})`,
  draft:      (n) => `ที่ร่างไว้ (${n})`,
  inProgress: (n) => `กำลังลงทะเบียน (${n})`,
  waiting:    (n) => `รอลงทะเบียน (${n})`,
};
