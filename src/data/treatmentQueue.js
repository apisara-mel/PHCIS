import { PATIENT_PROFILES } from '@/data/patientProfiles';

/* MIH treatmentQueue — shared roster for the "ระบบบันทึกการรักษา /
   คิวตรวจรักษาทั่วไป (OPD)" page (Figma PHCIS-ALL 2760:140031) and
   the in-visit QueueSubMenu side panel (Figma PHCIS|CPOE 195:41153).

   Both surfaces have to agree on who is in the queue, what slot they
   hold, and which bucket they're in (รอตรวจ / กำลังตรวจ / ตรวจเสร็จ /
   ที่ร่างไว้) — so the row generator lives here as the single source
   of truth. `buildRoster` is deterministic (no randomness) so the
   exported `TREATMENT_QUEUE_ROWS` constant is safe to memoise at
   module load and reuse across renders. */

/* Default table / list ordering on ระบบบันทึกการรักษา — ตรวจเสร็จแล้ว →
   ที่ร่างไว้ → ตรวจอยู่ → รอตรวจ, then queue id within each bucket. */
export const TREATMENT_STATUS_SORT_ORDER = {
  done: 0,
  draft: 1,
  progress: 2,
  waiting: 3,
};

export const compareTreatmentQueueRows = (a, b) => {
  const byStatus = (TREATMENT_STATUS_SORT_ORDER[a.statusKey] ?? 99)
    - (TREATMENT_STATUS_SORT_ORDER[b.statusKey] ?? 99);
  if (byStatus !== 0) return byStatus;
  return String(a.queue).localeCompare(String(b.queue));
};

export const TREATMENT_QUEUE_CC_SAMPLES = [
  'เจ็บแน่นหน้าอก ร้าวไหล่ซ้าย',
  'ไอมีเสมหะ มีไข้',
  'ปวดศีรษะ วิงเวียน',
  'ปวดท้อง ท้องเสีย',
  'เจ็บคอ ไอแห้ง',
];

/* Demo distribution — ตรวจเสร็จแล้ว 2 · ที่ร่างไว้ 2 · ตรวจอยู่ 2 · รอตรวจ 2 */
const seedStatus = (i) => {
  if (i < 2) return 'done';
  if (i < 4) return 'draft';
  if (i < 6) return 'progress';
  return 'waiting';
};

const buildVitals = (i) => {
  const abnormal = i % 4 === 1;
  return {
    bp:   abnormal ? '158/98' : '120/80',
    pr:   abnormal ? '102' : '78',
    spo2: '97%',
    bpColor:   abnormal ? 'var(--text-danger-default)'  : 'var(--text-content-default)',
    prColor:   abnormal ? 'var(--text-warning-default)' : 'var(--text-content-default)',
    spo2Color: 'var(--text-positive-secondary, #1B867D)',
  };
};

/* Demo offsets (minutes from now) for telemedicine rows — surfaces every
   Figma 78:16524 badge state in the queue table at once:
   early · countdown · due · overdue · expired. */
const TELEMED_APPOINTMENT_OFFSETS_MIN = [45, 13, 0, -3, -45];

export const buildTreatmentQueueRoster = (total = 15, baseTime = Date.now()) => {
  const rows = [];
  let telemedIdx = 0;
  for (let i = 0; i < total; i += 1) {
    const profile = PATIENT_PROFILES[i % PATIENT_PROFILES.length];
    const typeKey = ['walkin', 'appointment', 'telemedicine'][i % 3];
    /* First in-progress row is VIP — matches QueueSubMenu Figma chip. */
    const isVip = i === 4;
    const row = {
      id: `T-${String(i + 1).padStart(3, '0')}`,
      queue: `A${String(i + 1).padStart(3, '0')}`,
      hn: profile.hn,
      name: profile.shortName,
      doctor: profile.doctor,
      typeKey,
      cc: TREATMENT_QUEUE_CC_SAMPLES[i % TREATMENT_QUEUE_CC_SAMPLES.length],
      vitals: buildVitals(i),
      room: `ห้องตรวจที่ ${(i % 4) + 1}`,
      waitMinutes: 12 + (i * 3) % 67,
      statusKey: seedStatus(i),
      vipBadge: isVip ? 'VIP / ผู้ป่วยพิเศษ' : undefined,
    };
    if (typeKey === 'telemedicine') {
      const offsetMin = TELEMED_APPOINTMENT_OFFSETS_MIN[
        telemedIdx % TELEMED_APPOINTMENT_OFFSETS_MIN.length
      ];
      telemedIdx += 1;
      row.telemedAppointmentAt = new Date(baseTime + offsetMin * 60_000).toISOString();
    }
    rows.push(row);
  }
  return rows;
};

/* Module-scope cached roster — both the queue table and the in-visit
   side panel reference this same array so counts stay in sync. */
export const TREATMENT_QUEUE_ROWS = buildTreatmentQueueRoster();

/* Bucket helper for QueueSubMenu — returns `{ items, total }` per
   status so the side panel can show the FULL queue size in the section
   header while only rendering a short preview slice below. The Figma
   side panel previews a short slice per bucket (done / draft / in-progress /
   waiting) but header counts mirror the queue page totals. */
const DEFAULT_PREVIEW = { done: 2, draft: 2, inProgress: 2, waiting: 2 };
export const buildQueueSubMenuBuckets = (rows = TREATMENT_QUEUE_ROWS, preview = DEFAULT_PREVIEW) => {
  const previewMap = typeof preview === 'number'
    ? { done: preview, draft: preview, inProgress: preview, waiting: preview }
    : { ...DEFAULT_PREVIEW, ...preview };
  const bucket = (status, limit) => {
    const all = rows
      .filter((r) => r.statusKey === status)
      .slice()
      .sort(compareTreatmentQueueRows);
    return { items: all.slice(0, limit), total: all.length };
  };
  return {
    done:       bucket('done',     previewMap.done),
    draft:      bucket('draft',    previewMap.draft),
    inProgress: bucket('progress', previewMap.inProgress),
    waiting:    bucket('waiting',  previewMap.waiting),
  };
};
