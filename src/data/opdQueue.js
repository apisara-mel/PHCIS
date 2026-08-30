/* OPD screening queue roster — shared by /opd/queue and the in-form
   QueueSubMenu on /opd/screening so section counts stay aligned. */

import { PATIENT_PROFILES } from '@/data/patientProfiles';
import { applyOpdScreeningDrafts } from '@/data/opdScreeningDrafts';
import { USERS } from '@/data/usersAccess';

/* Status seed — ผู้มาก่อน (A001…) อยู่บน: ตรวจเสร็จแล้ว 2 · คัดกรองแล้ว 2 ·
   รอตรวจ 2 · รอคัดกรอง · กำลังคัดกรอง · ที่ร่างไว้ (matches QueuePage). */
const seedStatus = (i) => {
  if (i < 2) return 'examined';
  if (i < 4) return 'screened';
  if (i < 6) return 'done';
  if (i < 14) return 'waiting';
  if (i < 18) return 'doing';
  if (i < 20) return 'draft';
  return 'waiting';
};

/* พยาบาลที่กำลังคัดกรองอยู่ — ดึงจากทะเบียนผู้ใช้จริงเหมือนฝั่งเวชระเบียน
   ถ้าเพิ่ม/ลบผู้ใช้ในระบบสิทธิ์ รายชื่อตรงนี้ตามทันที (มติผู้ใช้ 30 ส.ค. 69) */
const SCREENERS = USERS
  .filter((u) => (u.role === 'nurse' || u.role === 'registrar') && u.status === 'active')
  .map((u) => u.name);

export const buildOpdQueueRoster = (total = 25) => {
  const rows = [];
  for (let i = 0; i < total; i += 1) {
    const profile = PATIENT_PROFILES[i % PATIENT_PROFILES.length];
    const statusKey = seedStatus(i);
    const typeKey = ['walkin', 'appointment', 'telemedicine'][i % 3];
    const totalMinutes = 8 * 60 + i * 5;
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    rows.push({
      id: `Q-${String(i + 1).padStart(3, '0')}`,
      queue: `A${String(i + 1).padStart(3, '0')}`,
      hn: profile.hn,
      vn: profile.vn,
      name: profile.shortName,
      /* รูปจากทะเบียนผู้ป่วย — พาเนลคิวคัดกรองขึ้นรูปจริงเหมือนพาเนลของห้องตรวจ */
      avatarUrl: profile.avatarUrl,
      doctor: profile.doctor,
      room: `ห้องตรวจที่ ${(i % 4) + 1}`,
      dept: i === 2 || i === 7
        ? 'แผนกสังคมสงเคราะห์และเวชศาสตร์ฟื้นฟู'
        : ['ตรวจรักษา', 'อายุรกรรม', 'ศัลยกรรม', 'กุมารเวช'][i % 4],
      typeKey,
      statusKey,
      contactKey: ['contacted', 'notContacted', 'noAnswer'][i % 3],
      time: `${hh}:${mm}`,
      vipBadge: profile.vip ? 'VIP / ผู้ป่วยพิเศษ' : undefined,
      /* เฉพาะแถวที่กำลังคัดกรองอยู่ — คิวที่ยังไม่มีใครหยิบยังไม่มีเจ้าของงาน */
      screenedBy: statusKey === 'doing' && SCREENERS.length > 0
        ? SCREENERS[i % SCREENERS.length]
        : '',
    });
  }
  return rows;
};

/* Module-scope roster — draft overlays applied once so the queue page
   and screening side panel see the same statusKeys. */
export const OPD_QUEUE_ROWS = applyOpdScreeningDrafts(buildOpdQueueRoster());

const DEFAULT_PREVIEW = { done: 2, draft: 2, inProgress: 2, waiting: 2 };

/* Bucket statuses onto QueueSubMenu's four sections. "คัดกรองแล้ว"
   folds screened + รอตรวจ (done) + examined so nurses see everyone
   past the waiting-to-screen stage in one glance. */
const DONE_STATUS_KEYS = new Set(['screened', 'done', 'examined']);

export const buildOpdQueueSubMenuBuckets = (
  rows = OPD_QUEUE_ROWS,
  preview = DEFAULT_PREVIEW,
) => {
  const previewMap = typeof preview === 'number'
    ? { done: preview, draft: preview, inProgress: preview, waiting: preview }
    : { ...DEFAULT_PREVIEW, ...preview };
  const bucket = (predicate, limit) => {
    const all = rows.filter(predicate);
    return { items: all.slice(0, limit), total: all.length };
  };
  return {
    done: bucket((r) => DONE_STATUS_KEYS.has(r.statusKey), previewMap.done),
    draft: bucket((r) => r.statusKey === 'draft', previewMap.draft),
    inProgress: bucket((r) => r.statusKey === 'doing', previewMap.inProgress),
    waiting: bucket((r) => r.statusKey === 'waiting', previewMap.waiting),
  };
};

export const OPD_QUEUE_SUBMENU_LABELS = {
  done: (n) => `คัดกรองแล้ว (${n})`,
  draft: (n) => `ที่ร่างไว้ (${n})`,
  inProgress: (n) => `กำลังคัดกรอง (${n})`,
  /* พาเนลข้างฟอร์มคัดกรองเหลือหมวดเดียว จึงเรียกตามสิ่งที่มันเป็น
     — "คิวที่รออยู่" (มติผู้ใช้ 28 ส.ค. 69) ส่วนแท็บในตาราง /opd/queue
     ยังใช้คำว่า "รอคัดกรอง" ของมันเอง */
  waiting: (n) => `คิวที่รออยู่ (${n})`,
};
