/* PHCIS | EMR §1.4.3.15 — ข้อควรระวัง (Flag) ระดับผู้รับบริการ.

   TreatmentSafetyRail เรนเดอร์ป้าย DNR / บริจาคอวัยวะ / เสี่ยงพลัดตกหกล้ม /
   VIP มาตั้งแต่เวฟก่อนแล้ว แต่ทะเบียนกลาง `mrPatients.js` seed มาแค่
   `vip / allergyDrug / allergyOther / chronic` จึงไม่มีวันเห็นป้าย 3 ตัวแรก
   — เป็นช่องว่าง "งาน data" ไม่ใช่ "งาน UI" ตามที่ gap report ระบุ.

   `mrPatients.js` เป็นทะเบียนกลางที่โมดูลอื่น (ลงทะเบียน / เวชระเบียน /
   ห้องยา) ใช้ร่วมกัน และอยู่นอกขอบเขตการแก้ของเวฟนี้ (playbook §4) ไฟล์นี้
   จึงเป็น **overlay ของโมดูลบันทึกการรักษา** ที่ merge ทับ `patient.flags`
   ตอนอ่านเท่านั้น ไม่เขียนกลับทะเบียนกลาง.

   ถ้า integrator ตัดสินใจย้าย seed นี้ไปไว้ที่ `mrPatients.js` จริง ให้ทำ
   ผ่าน manifest — ไม่ใช่จากไฟล์นี้.

   คำศัพท์ flag ยึดตาม TOR §1.4.3.15:
     dnr        — ความประสงค์ในการไม่ปั๊มหัวใจ (Do Not Resuscitate)
     organDonor — ความประสงค์ในการบริจาคอวัยวะ
     fallRisk   — ความปลอดภัยในการรักษา (เสี่ยงพลัดตกหกล้ม)
   ทุกรายการอ้างอิงเอกสารต้นทางที่ผู้ป่วยเซ็นไว้ เพื่อให้ตรวจสอบย้อนกลับได้ */

export const TREATMENT_PATIENT_FLAG_OVERRIDES = {
  /* นายสมชาย มั่นคง — CKD ระยะ 3 + หัวใจล้มเหลว, ทำหนังสือแสดงเจตนาไว้ */
  '67-00001': {
    dnr: true,
    organDonor: true,
    fallRisk: true,
    source: {
      dnr: 'หนังสือแสดงเจตนาไม่ประสงค์รับบริการสาธารณสุขฯ (Living Will) เลขที่ LW-2568-0114 · ลงนาม 12 ธ.ค. 2568 · พยาน 2 คน',
      organDonor: 'บัตรประจำตัวผู้แสดงความจำนงบริจาคอวัยวะ สภากาชาดไทย เลขที่ OD-6812774 · 3 มี.ค. 2567',
      fallRisk: 'ประเมิน Morse Fall Scale 55 คะแนน (เสี่ยงสูง) เมื่อ 6 พ.ค. 2569 · บวมทั้งสองขา เดินเซ',
    },
  },

  /* นางสาวสมหญิง มีสุข — หลังผ่าตัดช่องท้อง ลุกนั่งลำบาก */
  '67-00002': {
    fallRisk: true,
    source: {
      fallRisk: 'ประเมิน Morse Fall Scale 45 คะแนน (เสี่ยงปานกลาง) เมื่อ 2 พ.ค. 2569 · หลังผ่าตัดไส้ติ่ง ปวดแผลเวลาเปลี่ยนท่า',
    },
  },

  /* นายวีระ ดีงาม — เบาหวานคุมไม่ได้ + แผลเท้า, ประสงค์บริจาคอวัยวะ */
  '67-00003': {
    organDonor: true,
    source: {
      organDonor: 'บัตรประจำตัวผู้แสดงความจำนงบริจาคอวัยวะ สภากาชาดไทย เลขที่ OD-6704518 · 19 ก.ย. 2567',
    },
  },

  /* นางประนอม สุขสมบูรณ์ (VIP อยู่แล้วในทะเบียนกลาง) — ผู้สูงอายุนั่งรถเข็น */
  '67-00006': {
    dnr: true,
    fallRisk: true,
    source: {
      dnr: 'หนังสือแสดงเจตนาฯ เลขที่ LW-2569-0033 · ลงนาม 21 ม.ค. 2569 · บุตรสาวเป็นผู้รับมอบอำนาจ',
      fallRisk: 'ประเมิน Morse Fall Scale 70 คะแนน (เสี่ยงสูงมาก) เมื่อ 14 เม.ย. 2569 · นั่งรถเข็น เคยหกล้มในบ้าน 2 ครั้ง',
    },
  },

  /* นายบรรจง ทองแท้ — ผู้สูงอายุนั่งรถเข็น เสี่ยงหกล้ม */
  '67-00009': {
    fallRisk: true,
    organDonor: true,
    source: {
      fallRisk: 'ประเมิน Morse Fall Scale 60 คะแนน (เสี่ยงสูง) เมื่อ 28 มี.ค. 2569 · นั่งรถเข็น สายตาเลือนราง',
      organDonor: 'บัตรประจำตัวผู้แสดงความจำนงบริจาคอวัยวะ สภากาชาดไทย เลขที่ OD-6601209 · 8 ก.พ. 2566',
    },
  },
};

/* ป้ายกำกับ + คำอธิบายมาตรฐานของแต่ละ flag (ใช้ทั้งใน SafetyRail และ
   หน้านโยบายการเข้าถึงข้อมูล) */
export const TREATMENT_FLAG_LABELS = {
  dnr:        { label: 'DNR — ไม่ประสงค์ปั๊มหัวใจ', icon: 'do_not_disturb_on', tone: 'error'   },
  organDonor: { label: 'ประสงค์บริจาคอวัยวะ',        icon: 'volunteer_activism', tone: 'info'  },
  fallRisk:   { label: 'เสี่ยงพลัดตกหกล้ม',          icon: 'personal_injury',  tone: 'warning' },
  vip:        { label: 'VIP',                       icon: 'star',             tone: 'purple'  },
};

/* Merge overlay ทับ flags เดิมของผู้ป่วย — เรียกจาก TreatmentFormPage.
   คืน object ใหม่เสมอ ไม่ mutate ทะเบียนกลาง. */
export const mergePatientFlags = (patient) => {
  if (!patient) return patient;
  const overlay = TREATMENT_PATIENT_FLAG_OVERRIDES[patient.hn];
  if (!overlay) return patient;
  const { source, ...flagValues } = overlay;
  return {
    ...patient,
    flags: { ...(patient.flags || {}), ...flagValues },
    flagSources: { ...(patient.flagSources || {}), ...(source || {}) },
  };
};

/* รายการ flag ที่เปิดอยู่ของผู้ป่วยรายหนึ่ง พร้อมที่มา — ใช้แสดงรายละเอียด
   เวลาผู้ใช้กดดูว่าป้ายนี้มาจากเอกสารอะไร */
export const activeFlagsFor = (patient) => {
  const flags = patient?.flags || {};
  const sources = patient?.flagSources || {};
  return Object.keys(TREATMENT_FLAG_LABELS)
    .filter((key) => !!flags[key])
    .map((key) => ({
      key,
      ...TREATMENT_FLAG_LABELS[key],
      source: sources[key] || '',
    }));
};

export default TREATMENT_PATIENT_FLAG_OVERRIDES;
