/* MIH — ทะเบียนจังหวัดของประเทศไทย ครบทั้ง 77 จังหวัด (มติผู้ใช้ 27 ส.ค. 69)

   เดิมช่อง "จังหวัด" กับ "รหัสไปรษณีย์" ในฟอร์มที่อยู่มีให้เลือกแค่ 6 / 5 ค่า
   ซึ่งเป็น mock ตอนวางเลย์เอาต์ ทำให้กรอกที่อยู่จริงไม่ได้

   `postcode` ที่ใส่ไว้คือ **รหัสไปรษณีย์หลักของอำเภอเมือง** จังหวัดนั้น —
   ⚠️ ไม่ใช่รหัสครบทุกตำบล (ของจริงมีราว 5,000 รหัส) พอสำหรับให้เลือกจังหวัด
   แล้วได้รหัสตั้งต้นที่ถูก แต่ถ้าต้องการความถูกต้องระดับตำบลต้องต่อ API
   ที่ทำการไปรษณีย์ไทย / กรมการปกครอง — ดู docs/awaiting-components.md

   เรียงตามตัวอักษรไทยด้วย `localeCompare('th')` เพื่อให้ dropdown ไล่หาง่าย */

export const THAI_PROVINCES = [
  { name: 'กระบี่',            postcode: '81000' },
  { name: 'กรุงเทพมหานคร',     postcode: '10200' },
  { name: 'กาญจนบุรี',         postcode: '71000' },
  { name: 'กาฬสินธุ์',          postcode: '46000' },
  { name: 'กำแพงเพชร',        postcode: '62000' },
  { name: 'ขอนแก่น',          postcode: '40000' },
  { name: 'จันทบุรี',           postcode: '22000' },
  { name: 'ฉะเชิงเทรา',        postcode: '24000' },
  { name: 'ชลบุรี',            postcode: '20000' },
  { name: 'ชัยนาท',           postcode: '17000' },
  { name: 'ชัยภูมิ',            postcode: '36000' },
  { name: 'ชุมพร',            postcode: '86000' },
  { name: 'เชียงราย',          postcode: '57000' },
  { name: 'เชียงใหม่',          postcode: '50000' },
  { name: 'ตรัง',             postcode: '92000' },
  { name: 'ตราด',             postcode: '23000' },
  { name: 'ตาก',              postcode: '63000' },
  { name: 'นครนายก',          postcode: '26000' },
  { name: 'นครปฐม',           postcode: '73000' },
  { name: 'นครพนม',           postcode: '48000' },
  { name: 'นครราชสีมา',        postcode: '30000' },
  { name: 'นครศรีธรรมราช',     postcode: '80000' },
  { name: 'นครสวรรค์',         postcode: '60000' },
  { name: 'นนทบุรี',           postcode: '11000' },
  { name: 'นราธิวาส',          postcode: '96000' },
  { name: 'น่าน',             postcode: '55000' },
  { name: 'บึงกาฬ',           postcode: '38000' },
  { name: 'บุรีรัมย์',           postcode: '31000' },
  { name: 'ปทุมธานี',          postcode: '12000' },
  { name: 'ประจวบคีรีขันธ์',     postcode: '77000' },
  { name: 'ปราจีนบุรี',         postcode: '25000' },
  { name: 'ปัตตานี',           postcode: '94000' },
  { name: 'พระนครศรีอยุธยา',   postcode: '13000' },
  { name: 'พะเยา',            postcode: '56000' },
  { name: 'พังงา',            postcode: '82000' },
  { name: 'พัทลุง',            postcode: '93000' },
  { name: 'พิจิตร',            postcode: '66000' },
  { name: 'พิษณุโลก',          postcode: '65000' },
  { name: 'เพชรบุรี',          postcode: '76000' },
  { name: 'เพชรบูรณ์',         postcode: '67000' },
  { name: 'แพร่',             postcode: '54000' },
  { name: 'ภูเก็ต',            postcode: '83000' },
  { name: 'มหาสารคาม',        postcode: '44000' },
  { name: 'มุกดาหาร',          postcode: '49000' },
  { name: 'แม่ฮ่องสอน',        postcode: '58000' },
  { name: 'ยโสธร',            postcode: '35000' },
  { name: 'ยะลา',             postcode: '95000' },
  { name: 'ร้อยเอ็ด',          postcode: '45000' },
  { name: 'ระนอง',            postcode: '85000' },
  { name: 'ระยอง',            postcode: '21000' },
  { name: 'ราชบุรี',           postcode: '70000' },
  { name: 'ลพบุรี',            postcode: '15000' },
  { name: 'ลำปาง',            postcode: '52000' },
  { name: 'ลำพูน',            postcode: '51000' },
  { name: 'เลย',              postcode: '42000' },
  { name: 'ศรีสะเกษ',          postcode: '33000' },
  { name: 'สกลนคร',           postcode: '47000' },
  { name: 'สงขลา',            postcode: '90000' },
  { name: 'สตูล',             postcode: '91000' },
  { name: 'สมุทรปราการ',       postcode: '10270' },
  { name: 'สมุทรสงคราม',      postcode: '75000' },
  { name: 'สมุทรสาคร',        postcode: '74000' },
  { name: 'สระแก้ว',          postcode: '27000' },
  { name: 'สระบุรี',           postcode: '18000' },
  { name: 'สิงห์บุรี',          postcode: '16000' },
  { name: 'สุโขทัย',           postcode: '64000' },
  { name: 'สุพรรณบุรี',         postcode: '72000' },
  { name: 'สุราษฎร์ธานี',       postcode: '84000' },
  { name: 'สุรินทร์',           postcode: '32000' },
  { name: 'หนองคาย',          postcode: '43000' },
  { name: 'หนองบัวลำภู',       postcode: '39000' },
  { name: 'อ่างทอง',          postcode: '14000' },
  { name: 'อำนาจเจริญ',        postcode: '37000' },
  { name: 'อุดรธานี',          postcode: '41000' },
  { name: 'อุตรดิตถ์',          postcode: '53000' },
  { name: 'อุทัยธานี',          postcode: '61000' },
  { name: 'อุบลราชธานี',       postcode: '34000' },
];

/** ชื่อจังหวัดทั้ง 77 เรียงตามตัวอักษรไทย — ใช้กับ <Select options> */
export const THAI_PROVINCE_NAMES = THAI_PROVINCES
  .map((p) => p.name)
  .sort((a, b) => a.localeCompare(b, 'th'));

/** รหัสไปรษณีย์หลักของทุกจังหวัด เรียงจากน้อยไปมาก (ไม่ซ้ำ) */
export const THAI_POSTCODES = Array.from(
  new Set(THAI_PROVINCES.map((p) => p.postcode)),
).sort();

/** รหัสไปรษณีย์ → ชื่อจังหวัด (เติมช่องจังหวัดให้อัตโนมัติเมื่อเลือกรหัส) */
export const provinceByPostcode = (postcode) =>
  THAI_PROVINCES.find((p) => p.postcode === String(postcode || '').trim())?.name || '';

/** ชื่อจังหวัด → รหัสไปรษณีย์หลัก */
export const postcodeByProvince = (province) =>
  THAI_PROVINCES.find((p) => p.name === String(province || '').trim())?.postcode || '';
