/* Mock catalogue for "เลือกเตียงผู้ป่วย" / "เพิ่มเตียงสังเกตอาการใหม่"
   — Figma PHCIS | OPD 166:36434. Product photos live in
   `public/images/beds/` (AI-generated catalog set, Aug 2026).
   Ten formats; picker pages show 5 cards at a time.
   Card title: titleTh (top) + titleEn (bottom, thin/small/grey). */

export const MOCK_PATIENT_BEDS = [
  {
    id: 'bed01',
    code: 'Bed01',
    titleTh: 'เตียงไฟฟ้า',
    titleEn: 'Electric Hospital Bed',
    title: 'เตียงไฟฟ้า (Electric Hospital Bed)',
    description: 'ปรับหัว-ท้ายด้วยมอเตอร์ ราวกั้นสแตนเลสยกได้ มีจุดแขวนน้ำเกลือ',
    isNew: true,
    imageSrc: '/images/beds/bed01.png',
  },
  {
    id: 'bed02',
    code: 'Bed02',
    titleTh: 'เตียงพับได้',
    titleEn: 'Foldable / Recliner Bed',
    title: 'เตียงพับได้ (Foldable / Recliner Bed)',
    description: 'พับเก็บและปรับนอนเอียงได้ ล้อเลื่อน เนื้อเบาะสีกรมท่า ประหยัดพื้นที่',
    isNew: true,
    imageSrc: '/images/beds/bed02.png',
  },
  {
    id: 'bed03',
    code: 'Bed03',
    titleTh: 'เตียงหมุนมือ',
    titleEn: 'Manual Crank Bed',
    title: 'เตียงหมุนมือ (Manual Crank Bed)',
    description: 'ปรับระดับด้วยมือหมุนที่ปลายเตียง โครงเหล็กสีเทา ที่นอนเขียว ราวกั้นสองข้าง',
    isNew: true,
    imageSrc: '/images/beds/bed03.png',
  },
  {
    id: 'bed04',
    code: 'Bed04',
    titleTh: 'เตียงสามัญ',
    titleEn: 'Basic Hospital Bed',
    title: 'เตียงสามัญ (Basic Hospital Bed)',
    description: 'โครงเหล็กมาตรฐาน ที่นอนสีเขียว ราวกั้นพับลงได้ ไม่มีมอเตอร์',
    isNew: false,
    imageSrc: '/images/beds/bed04.png',
  },
  {
    id: 'bed05',
    code: 'Bed05',
    titleTh: 'เตียงกึ่งพิเศษ',
    titleEn: 'Semi-Electric Bed',
    title: 'เตียงกึ่งพิเศษ (Semi-Electric Bed)',
    description: 'โครงสีขาว ที่นอนเขียวอ่อน ปรับหัวเตียงด้วยไฟฟ้า ปรับท้ายด้วยมือหมุน',
    isNew: false,
    imageSrc: '/images/beds/bed05.png',
  },
  {
    id: 'bed06',
    code: 'Bed06',
    titleTh: 'เตียง ICU',
    titleEn: 'ICU Bed',
    title: 'เตียง ICU (ICU Bed)',
    description: 'รองรับผู้ป่วยวิกฤต ปรับหลายทิศทาง มีราวกั้นสูงและจุดยึดอุปกรณ์ติดตามอาการ',
    isNew: true,
    imageSrc: '/images/beds/bed06.png',
  },
  {
    id: 'bed07',
    code: 'Bed07',
    titleTh: 'เตียงเด็ก',
    titleEn: 'Pediatric Bed',
    title: 'เตียงเด็ก (Pediatric Bed)',
    description: 'ขนาดสั้นสำหรับผู้ป่วยเด็ก ราวกั้นสูงรอบเตียง ป้องกันการตกเตียง',
    isNew: true,
    imageSrc: '/images/beds/bed07.png',
  },
  {
    id: 'bed08',
    code: 'Bed08',
    titleTh: 'เตียงคลอด',
    titleEn: 'Delivery / Labor Bed',
    title: 'เตียงคลอด (Delivery / Labor Bed)',
    description: 'ปรับท่าคลอดได้ ที่วางขาแยกส่วน ท้ายเตียงถอดออกเพื่อช่วยคลอด',
    isNew: false,
    imageSrc: '/images/beds/bed08.png',
  },
  {
    id: 'bed09',
    code: 'Bed09',
    titleTh: 'เตียงตรวจ',
    titleEn: 'Examination Couch',
    title: 'เตียงตรวจ (Examination Couch)',
    description: 'เตียงตรวจรักษาสั้น ปรับหัวได้ เหมาะสังเกตอาการระยะสั้นหรือตรวจซ้ำ',
    isNew: false,
    imageSrc: '/images/beds/bed09.png',
  },
  {
    id: 'bed10',
    code: 'Bed10',
    titleTh: 'เตียงเคลื่อนย้าย',
    titleEn: 'Stretcher / Transport Bed',
    title: 'เตียงเคลื่อนย้าย (Stretcher / Transport Bed)',
    description: 'ล้อเลื่อนสี่ทิศทาง ราวกั้นพับได้ ใช้รับส่งผู้ป่วยฉุกเฉินในวอร์ด',
    isNew: true,
    imageSrc: '/images/beds/bed10.png',
  },
];

/** Cards visible per page in the bed-type picker carousel. */
export const BED_TYPE_PAGE_SIZE = 5;

/** Thai chip label on the care-order button — Figma PHCIS | OPD 163:34956 ("เตียงที่ 4"). */
export function formatThaiBedChipLabel(bedId) {
  if (!bedId || typeof bedId !== 'string') return '';
  const m = /^bed0*(\d+)$/i.exec(bedId.trim());
  if (!m) return '';
  return `เตียงที่ ${parseInt(m[1], 10)}`;
}
