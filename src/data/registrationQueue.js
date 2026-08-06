import { PATIENT_PROFILES, PENDING_REGISTRATION_NO_PHOTO } from '@/data/patientProfiles';
import { MR_PATIENTS } from '@/data/mrPatients';

/* MIH registrationQueue — shared roster for the เวชระเบียน queue page
   (Figma 2756:148259) and the in-form QueueSubMenu side panel on
   ข้อมูลผู้รับบริการ (/registration/register).

   Both surfaces must agree on queue slots and visit-status buckets
   (รอลงทะเบียน / กำลังลงทะเบียน / ลงทะเบียนแล้ว / ที่ร่างไว้). */

const MR_BY_HN = Object.fromEntries(MR_PATIENTS.map((p) => [p.hn, p]));

const QUEUE_CHANNEL_OPTIONS = [
  'ผ่านตู้ Kiosk',
  'รับกับเจ้าหน้าที่',
  'กับเจ้าหน้าที่ ณ อนามัย',
];

const VISIT_TYPE_OPTIONS = [
  'นัดหมายล่วงหน้า',
  'ไม่ได้นัดหมาย',
  'ด้วยตนเองผ่าน Application',
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

const ageYearsOnly = (age) => {
  const m = String(age ?? '').match(/^(\d+)/);
  return m ? m[1] : '';
};

/* Build a 130-row roster — one PATIENT_PROFILES entry per index (same pool
   as OPD queue / Screening PatientCard), MR fields for phone/rights/status. */
export const buildRegistrationQueueRoster = (total = 130) => {
  const rows = [];
  let pendingNoPhotoIdx = 0;
  for (let i = 0; i < total; i += 1) {
    const status = seedRegistrationStatus(i);
    const usePendingNoPhoto = status === 'pending'
      && pendingNoPhotoIdx < PENDING_REGISTRATION_NO_PHOTO.length;
    const profile = usePendingNoPhoto
      ? PENDING_REGISTRATION_NO_PHOTO[pendingNoPhotoIdx++]
      : PATIENT_PROFILES[i % PATIENT_PROFILES.length];
    const neverServed = Boolean(usePendingNoPhoto || profile.neverServed);
    const mr = profile.hn ? MR_BY_HN[profile.hn] : null;
    const fallbackMr = MR_PATIENTS[i % MR_PATIENTS.length];
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
      queueChannel: QUEUE_CHANNEL_OPTIONS[i % QUEUE_CHANNEL_OPTIONS.length],
      visitType: neverServed ? '' : VISIT_TYPE_OPTIONS[i % VISIT_TYPE_OPTIONS.length],
      patientStatus: neverServed ? 'inactive' : (i % 7 === 0 ? 'inactive' : 'active'),
      status,
      noProfilePhoto: neverServed,
      neverServed,
      vipBadge: isVip ? 'VIP / ผู้ป่วยพิเศษ' : undefined,
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
