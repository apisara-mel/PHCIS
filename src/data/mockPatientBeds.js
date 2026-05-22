/* Mock catalogue for "เลือกเตียงผู้ป่วย" — Figma PHCIS | OPD 166:36434.
   Images exported from the design file into `public/images/beds/`. */

export const MOCK_PATIENT_BEDS = [
  {
    id: 'bed01',
    code: 'Bed01',
    title: 'เตียงไฟฟ้า (Electric Hospital Bed)',
    description: 'ปรับระดับด้วยมอเตอร์, ราวกั้น, ที่วางน้ำเกลือ',
    isNew: true,
    imageSrc: '/images/beds/bed01.jpg',
  },
  {
    id: 'bed02',
    code: 'Bed02',
    title: 'เตียงพับได้ (Foldable / Recliner Bed)',
    description: 'พับเก็บได้, ประหยัดพื้นที่',
    isNew: true,
    imageSrc: '/images/beds/bed02.jpg',
  },
  {
    id: 'bed03',
    code: 'Bed03',
    title: 'เตียงหมุนมือ (Manual Crank Bed)',
    description: 'ปรับระดับด้วยมือหมุน, ราวกั้นสองข้าง',
    isNew: true,
    imageSrc: '/images/beds/bed03.jpg',
  },
  {
    id: 'bed04',
    code: 'Bed04',
    title: 'เตียงสามัญ (Basic Hospital Bed)',
    description: 'โครงเหล็ก, ที่นอนสีเขียว, ราวกั้น',
    isNew: false,
    imageSrc: '/images/beds/bed04.jpg',
  },
  {
    id: 'bed05',
    code: 'Bed05',
    title: 'เตียงกึ่งพิเศษ (Semi-Electric Bed)',
    description: 'โครงขาว, ที่นอนสีเขียวอ่อน, ดูสะอาด',
    isNew: false,
    imageSrc: '/images/beds/bed05.jpg',
  },
];

/** Thai chip label on the care-order button — Figma PHCIS | OPD 163:34956 ("เตียงที่ 4"). */
export function formatThaiBedChipLabel(bedId) {
  if (!bedId || typeof bedId !== 'string') return '';
  const m = /^bed0*(\d+)$/i.exec(bedId.trim());
  if (!m) return '';
  return `เตียงที่ ${parseInt(m[1], 10)}`;
}
