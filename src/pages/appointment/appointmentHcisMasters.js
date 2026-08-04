/* HCIS §2.3 "บันทึกนัดหมายผู้ป่วย" vocabulary — coded master lists that the legacy
   คู่มือระบบคลินิกตรวจรักษา (pp. 2-5..2-15) uses and that TOR 1.6.1.2 / 1.6.2.5 expect.
   Pure constants — no React, no store. Imported by the appointment module only. */

/* ───────────────────────────── สถานะการนัด (coded, HCIS) ───────────────────────── */

/** HCIS status codes shown in the "สถานะการนัด" column. */
export const APPT_STATUS_CODES = [
  { code: '1', key: 'registered', label: 'ลงทะเบียนตรวจรักษาแล้ว', style: 'success' },
  { code: '2', key: 'not_registered', label: 'ยังไม่ได้ลงทะเบียนตรวจรักษา', style: 'info' },
  { code: '3', key: 'pending', label: 'รอเจ้าหน้าที่ยืนยัน', style: 'warning' },
  { code: '4', key: 'postponed', label: 'เลื่อนนัดออกไป', style: 'yellow' },
  { code: '5', key: 'cancelled', label: 'ยกเลิกนัด', style: 'error' },
  { code: '6', key: 'no_show', label: 'ไม่มาตามนัด', style: 'error' },
];

export const getHcisStatusByKey = (key) =>
  APPT_STATUS_CODES.find((s) => s.key === key) || APPT_STATUS_CODES[1];

/**
 * Map a module appointment (module status + derived display status) onto the
 * HCIS coded vocabulary so the list column reads the same words as the legacy
 * system. `displayStatus` comes from getAppointmentDisplayStatus().
 */
export function toHcisStatus(appt, displayStatus) {
  if (!appt) return getHcisStatusByKey('not_registered');
  if (appt.postponed) return getHcisStatusByKey('postponed');
  if (displayStatus === 'cancelled') return getHcisStatusByKey('cancelled');
  if (displayStatus === 'no_show') return getHcisStatusByKey('no_show');
  if (displayStatus === 'completed') return getHcisStatusByKey('registered');
  if (displayStatus === 'pending') return getHcisStatusByKey('pending');
  return getHcisStatusByKey('not_registered');
}

/** Filter options for the "สถานะการนัด" dropdown (HCIS wording + code). */
export const HCIS_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'ทุกสถานะการนัด' },
  ...APPT_STATUS_CODES.map((s) => ({ value: s.key, label: `${s.code} · ${s.label}` })),
];

/* ────────────────────── นัดมาเพื่อ (coded master, paginated, ต่อเติมได้) ───────── */

/** HCIS "นัดมาเพื่อ" master list — coded, paginated in the legacy popup. */
export const APPT_PURPOSE_MASTER = [
  { code: 'P01', label: 'ตรวจตามนัดปกติ' },
  { code: 'P02', label: 'ติดตามผลการรักษา' },
  { code: 'P03', label: 'ฟังผลตรวจทางห้องปฏิบัติการ' },
  { code: 'P04', label: 'ฟังผลเอกซเรย์ / ภาพถ่ายรังสี' },
  { code: 'P05', label: 'รับยาต่อเนื่อง' },
  { code: 'P06', label: 'ตรวจสุขภาพประจำปี' },
  { code: 'P07', label: 'ฉีดวัคซีนตามกำหนด' },
  { code: 'P08', label: 'ทำแผล / ตัดไหม' },
  { code: 'P09', label: 'ตรวจติดตามเบาหวาน (DM)' },
  { code: 'P10', label: 'ตรวจติดตามความดันโลหิตสูง (HT)' },
  { code: 'P11', label: 'ฝากครรภ์ตามนัด (ANC)' },
  { code: 'P12', label: 'ตรวจหลังคลอด' },
  { code: 'P13', label: 'ตรวจพัฒนาการเด็ก' },
  { code: 'P14', label: 'ตรวจสุขภาพช่องปาก / ขูดหินปูน' },
  { code: 'P15', label: 'อุดฟัน / ถอนฟัน' },
  { code: 'P16', label: 'ประเมินสุขภาพจิตตามนัด' },
  { code: 'P17', label: 'บำบัดยาเสพติดตามแผน' },
  { code: 'P18', label: 'ตรวจติดตามวัณโรค (TB)' },
  { code: 'P19', label: 'รับยาต้านไวรัส (ARV)' },
  { code: 'P20', label: 'กายภาพบำบัด' },
  { code: 'P21', label: 'ปรึกษาแพทย์ก่อนทำหัตถการ' },
  { code: 'P22', label: 'ตรวจคัดกรองมะเร็งปากมดลูก' },
  { code: 'P23', label: 'ตรวจคัดกรองมะเร็งเต้านม' },
  { code: 'P24', label: 'เยี่ยมบ้าน / ติดตามผู้ป่วยติดเตียง' },
  { code: 'P25', label: 'ปรึกษาแพทย์ทางไกล (Telemedicine)' },
  { code: 'P26', label: 'อื่น ๆ (ระบุเอง)' },
];

/** HCIS "การเตรียมตัวตรวจ" master list — flows onto the printed slip. */
export const APPT_PREP_MASTER = [
  { code: 'R01', label: 'งดอาหารและเครื่องดื่มอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด' },
  { code: 'R02', label: 'งดน้ำหวาน / น้ำอัดลม 12 ชั่วโมง' },
  { code: 'R03', label: 'นำบัตรประชาชนและบัตรโรงพยาบาลมาด้วยทุกครั้ง' },
  { code: 'R04', label: 'นำยาที่รับประทานอยู่ทั้งหมดมาด้วย' },
  { code: 'R05', label: 'นำสมุดบันทึกความดัน / น้ำตาลมาด้วย' },
  { code: 'R06', label: 'งดใส่คอนแทคเลนส์ 24 ชั่วโมงก่อนตรวจตา' },
  { code: 'R07', label: 'แปรงฟันก่อนมาพบทันตแพทย์' },
  { code: 'R08', label: 'กลั้นปัสสาวะก่อนตรวจอัลตราซาวด์ช่องท้องส่วนล่าง' },
  { code: 'R09', label: 'สวมเสื้อผ้าหลวมสบาย ไม่มีโลหะ สำหรับถ่ายภาพรังสี' },
  { code: 'R10', label: 'นำสมุดฝากครรภ์และผลตรวจครั้งล่าสุดมาด้วย' },
  { code: 'R11', label: 'มาก่อนเวลานัด 30 นาที เพื่อลงทะเบียนและวัดสัญญาณชีพ' },
  { code: 'R12', label: 'เตรียมอุปกรณ์และสัญญาณอินเทอร์เน็ตสำหรับตรวจทางไกล' },
];

/** HCIS "โรคที่นัดมาตรวจ" — ICD-10 lookup used on the appointment record. */
export const APPT_DX_ICD10 = [
  { code: 'E11.9', label: 'เบาหวานชนิดที่ 2 ไม่มีภาวะแทรกซ้อน' },
  { code: 'I10', label: 'ความดันโลหิตสูงชนิดไม่ทราบสาเหตุ' },
  { code: 'E78.5', label: 'ไขมันในเลือดผิดปกติ' },
  { code: 'J45.9', label: 'โรคหืด ไม่ระบุรายละเอียด' },
  { code: 'J44.9', label: 'โรคปอดอุดกั้นเรื้อรัง' },
  { code: 'A15.0', label: 'วัณโรคปอด ยืนยันผลเสมหะ' },
  { code: 'B24', label: 'โรคติดเชื้อเอชไอวี ไม่ระบุรายละเอียด' },
  { code: 'F32.9', label: 'โรคซึมเศร้า ไม่ระบุรายละเอียด' },
  { code: 'F19.2', label: 'ภาวะติดสารเสพติดหลายชนิด' },
  { code: 'K02.9', label: 'ฟันผุ ไม่ระบุรายละเอียด' },
  { code: 'Z34.0', label: 'ดูแลครรภ์ปกติครั้งแรก' },
  { code: 'Z39.2', label: 'ตรวจติดตามหลังคลอด' },
  { code: 'M54.5', label: 'ปวดหลังส่วนล่าง' },
  { code: 'N18.3', label: 'โรคไตเรื้อรังระยะ 3' },
  { code: 'Z00.0', label: 'ตรวจสุขภาพทั่วไป' },
];

/* ───────────────────────── หน่วยงานที่สั่งนัด / คลินิกที่นัดตรวจ ───────────────── */

export const ORDERING_UNIT_MASTER = [
  'ศูนย์บริการสาธารณสุข 4 ดินแดง',
  'ศูนย์บริการสาธารณสุข 7 บุญมี ปุรุราชรังสรรค์',
  'ศูนย์บริการสาธารณสุข 8 บุญรอด รุ่งเรือง',
  'ศูนย์บริการสาธารณสุข 21 วัดธาตุทอง',
  'OPD อายุรกรรม',
  'คลินิกเวชศาสตร์ครอบครัว',
  'ห้องฉุกเฉิน',
  'ทันตกรรม',
  'กุมารเวช',
];

export const CLINIC_MASTER = [
  'คลินิกตรวจโรคทั่วไป',
  'คลินิกอายุรกรรม',
  'คลินิกโรคเรื้อรัง (NCD)',
  'คลินิกฝากครรภ์ (ANC)',
  'คลินิกสุขภาพเด็กดี',
  'คลินิกสุขภาพจิต',
  'คลินิกวัณโรค',
  'คลินิกยาเสพติด',
  'ทันตกรรม',
  'คลินิกผู้สูงอายุ',
];

/* ───────────────────────────── ช่องทางคำขอนัด (รับนัดหมาย) ──────────────────── */

export const REQUEST_CHANNELS = [
  { value: 'mobile', label: 'Mobile App (§4.2)', icon: 'smartphone', style: 'blue' },
  { value: 'line', label: 'LINE Official', icon: 'chat', style: 'green' },
  { value: 'phone', label: 'โทรศัพท์', icon: 'call', style: 'purple' },
  { value: 'walkin', label: 'เคาน์เตอร์ (Walk-in)', icon: 'badge', style: 'orange' },
  { value: 'continuation', label: 'นัดต่อเนื่องจากการรักษา', icon: 'clinical_notes', style: 'teal' },
];

export const getChannelMeta = (value) =>
  REQUEST_CHANNELS.find((c) => c.value === value) || REQUEST_CHANNELS[0];

/** สาเหตุการปฏิเสธคำขอ — master list (TOR 1.6.2.6 / 1.6.2.7). */
export const REQUEST_REJECT_REASONS = [
  { value: 'no_slot', label: 'ไม่มี Slot ว่างในช่วงเวลาที่ขอ' },
  { value: 'no_right', label: 'ผู้รับบริการไม่มีสิทธิรับบริการในหน่วยบริการนี้' },
  { value: 'incomplete', label: 'ข้อมูลคำขอไม่ครบถ้วน' },
  { value: 'clinic_closed', label: 'คลินิกปิดให้บริการในวันที่ขอ' },
  { value: 'duplicate', label: 'มีนัดหมายซ้ำในระบบอยู่แล้ว' },
  { value: 'other', label: 'อื่น ๆ (ระบุเหตุผล)' },
];

/** สาเหตุการยกเลิกนัด — master list ที่ใช้ทั้งฟอร์มและหน้าตั้งค่า. */
export const APPT_CANCEL_REASONS = [
  'ผู้รับบริการขอยกเลิก',
  'แพทย์ไม่ว่าง / ปรับตารางออกตรวจ',
  'คลินิกปิดให้บริการ (วันหยุด)',
  'ผิดพลาดในการจอง',
  'ผู้รับบริการเสียชีวิต / ย้ายสิทธิ',
  'อื่น ๆ',
];

/** เหตุผลที่บันทึก "ไม่มาตามนัด" (TOR 1.6.2.8 / 1.3.2.3). */
export const NO_SHOW_REASONS = [
  'ไม่มาติดต่อและติดต่อกลับไม่ได้',
  'ติดต่อกลับแล้ว — ขอเลื่อนนัด',
  'ผู้รับบริการแจ้งว่าไปรับบริการที่อื่น',
  'อื่น ๆ',
];

/** ตัวเลือก "อื่น ๆ" ที่ต้องบังคับให้ระบุคำอธิบายเพิ่ม (ใช้ร่วมกันหลายหน้า). */
export const OTHER_REASON_LABEL = 'อื่น ๆ';

/* Suggestion pools for SuggestibleTextarea (clinician-typed fields). */
export const REQUEST_DECISION_NOTE_SUGGESTIONS = [
  'ยืนยันนัดตามวัน-เวลาที่ผู้รับบริการขอ ไม่พบการชนตารางแพทย์',
  'ยืนยันนัดโดยเปลี่ยนแพทย์ผู้ตรวจตามตารางออกตรวจจริง',
  'เสนอเวลาใหม่เนื่องจากช่วงที่ขอเต็มโควตาคลินิก',
  'ปฏิเสธคำขอเนื่องจากคลินิกปิดให้บริการในวันที่ขอ',
  'ปฏิเสธคำขอเนื่องจากข้อมูลผู้รับบริการไม่ครบถ้วน ต้องติดต่อกลับ',
  'ติดต่อผู้รับบริการทางโทรศัพท์แล้ว ตกลงเลื่อนไปสัปดาห์ถัดไป',
  'ผู้รับบริการไม่มีสิทธิในหน่วยบริการนี้ แนะนำให้ติดต่อหน่วยบริการตามสิทธิ',
];

export const NO_SHOW_NOTE_SUGGESTIONS = [
  'โทรติดต่อ 2 ครั้งไม่มีผู้รับสาย และส่ง SMS แจ้งแล้ว',
  'ญาติแจ้งว่าผู้รับบริการเข้ารักษาตัวที่โรงพยาบาลอื่น',
  'ผู้รับบริการติดภารกิจ ขอเลื่อนนัดเป็นสัปดาห์ถัดไป',
  'เดินทางมาไม่ได้เนื่องจากปัญหาการเดินทาง/น้ำท่วมในพื้นที่',
  'มาถึงหลังปิดรับลงทะเบียนตรวจรักษาของวันนั้น',
  'ผู้รับบริการย้ายที่อยู่ ติดต่อตามเบอร์เดิมไม่ได้',
];

export const RECURRENCE_REASON_SUGGESTIONS = [
  'นัดติดตามอาการต่อเนื่องทุก 14 วัน ตามแผนการรักษา',
  'นัดรับยาต่อเนื่องทุก 30 วัน จนกว่าจะควบคุมระดับน้ำตาลได้',
  'นัดฉีดวัคซีนตามกำหนดของกรมควบคุมโรค',
  'นัดกลุ่มผู้ป่วยเบาหวาน-ความดัน เพื่อตรวจติดตามและให้ความรู้',
  'นัดกลุ่มบำบัดผู้ใช้ยาเสพติด สัปดาห์ละ 1 ครั้ง',
  'นัดกายภาพบำบัดต่อเนื่องสัปดาห์ละ 2 ครั้ง เป็นเวลา 6 สัปดาห์',
];

export const APPT_TYPE_PREP_SUGGESTIONS = APPT_PREP_MASTER.map((p) => p.label);
