/* §1.20.9 — ฐานข้อมูลซ้ำ (Read Replica Database) สำหรับงานวิเคราะห์/วิจัย
   แยกจากฐานข้อมูลให้บริการ + อัปเดตต่อเนื่อง (Real-Time Update)

   ข้อจำกัดที่ซื่อสัตย์: prototype นี้เป็น frontend mock — ไม่มี replica จริง
   สิ่งที่ทำได้คือ "แสดงสถานะแหล่งข้อมูล" ให้ผู้ใช้เห็นว่ารายงานทุกหน้าอ่านจาก
   replica ไม่ใช่ฐานข้อมูลบริการ พร้อมสถานะ sync / replication lag 2 สถานะ
   (ปกติ · ล่าช้า) และประวัติการ sync ล่าสุด */

const LAG_WARN_SECONDS = 60;

/* ค่า lag ที่หมุนวนเมื่อกด "รีเฟรชสถานะ" — ครอบคลุมทั้งสถานะปกติและล่าช้า
   เพื่อให้ UI มีมากกว่าหนึ่ง state ตาม playbook §5 */
const LAG_CYCLE = [3, 8, 12, 5, 94, 132, 21, 6];

let cursor = 0;
let lastCheckedAt = new Date();

export const REPLICA_INFO = {
  name: 'PHCIS Analytics Read Replica',
  engine: 'PostgreSQL 15 (streaming replication)',
  scope: 'ข้อมูลบริการทุกศูนย์บริการสาธารณสุข สำนักอนามัย กทม.',
  refreshMode: 'Real-Time (logical streaming)',
  separatedFrom: 'ฐานข้อมูลระบบให้บริการ (PHCIS OLTP)',
  retention: 'ย้อนหลัง 5 ปีงบประมาณ',
};

const formatClock = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

/** สถานะปัจจุบันของ replica — { lagSeconds, degraded, syncedAtLabel, checkedAtLabel } */
export const getReplicaStatus = () => {
  const lagSeconds = LAG_CYCLE[cursor % LAG_CYCLE.length];
  const syncedAt = new Date(lastCheckedAt.getTime() - lagSeconds * 1000);
  return {
    lagSeconds,
    degraded: lagSeconds > LAG_WARN_SECONDS,
    thresholdSeconds: LAG_WARN_SECONDS,
    syncedAtLabel: formatClock(syncedAt),
    checkedAtLabel: formatClock(lastCheckedAt),
  };
};

/** กด "รีเฟรชสถานะ" — เลื่อน cursor แล้วคืนสถานะใหม่ */
export const refreshReplicaStatus = () => {
  cursor += 1;
  lastCheckedAt = new Date();
  return getReplicaStatus();
};

/** ประวัติการ sync ล่าสุด (แสดงในป๊อปอัปรายละเอียดแหล่งข้อมูล) */
export const REPLICA_SYNC_LOG = [
  { id: 'sync-1', at: '08:59:58', tables: 'visit, visit_diagnosis',   rows: 1284, status: 'ok'      },
  { id: 'sync-2', at: '08:59:43', tables: 'prescription, rx_item',    rows: 963,  status: 'ok'      },
  { id: 'sync-3', at: '08:59:21', tables: 'lab_result',               rows: 412,  status: 'ok'      },
  { id: 'sync-4', at: '08:58:55', tables: 'appointment',              rows: 288,  status: 'ok'      },
  { id: 'sync-5', at: '08:57:12', tables: 'patient_allergy',          rows: 37,   status: 'delayed' },
  { id: 'sync-6', at: '08:55:40', tables: 'checkup_result',           rows: 156,  status: 'ok'      },
];

export const REPLICA_STATUS_LABEL = {
  ok: 'สำเร็จ',
  delayed: 'ล่าช้า',
};

export default getReplicaStatus;
