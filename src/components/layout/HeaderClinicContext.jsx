import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/* ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร — ครบทั้ง 69 ศูนย์.
   ตามรายการของ BMA (สำนักอนามัย กทม.) ลำดับ 1–69 ใช้สำหรับ Header
   <FilterDropdown leadingIcon="location_on" /> และ <Sidebar /> mobile.

   Value scheme: `hc-{number}` keeps things URL-safe / log-friendly while
   the label "ศูนย์ N ชื่อ" matches the Figma chip text. Default is
   ศูนย์ 4 ดินแดง (`hc-4`) — that's the showroom clinic the demo started
   from and the value Figma screenshots pin to. */
const RAW_CLINICS = [
  [1,  'สะพานมอญ'],
  [2,  'วัดมักกะสัน'],
  [3,  'บางซื่อ'],
  [4,  'ดินแดง'],
  [5,  'จุฬาลงกรณ์'],
  [6,  'สโมสรวัฒนธรรมหญิง'],
  [7,  'บุญมี ปุรุราชรังสรรค์'],
  [8,  'บุญรอด รุ่งเรือง'],
  [9,  'ประชาธิปไตย'],
  [10, 'สุขุมวิท'],
  [11, 'ประดิพัทธ์'],
  [12, 'จันทร์เที่ยง เนตรวิเศษ'],
  [13, 'ไมตรีวานิช'],
  [14, 'แก้ว สีบุญเรือง'],
  [15, 'ลาดพร้าว'],
  [16, 'ลุมพินี'],
  [17, 'ประชานิเวศน์'],
  [18, 'มงคล-วอน-วังตาล'],
  [19, 'วงศ์สว่าง'],
  [20, 'บมจ.ธนาคารนครหลวงไทย'],
  [21, 'วัดธาตุทอง'],
  [22, 'วัดปากบ่อ'],
  [23, 'สี่พระยา'],
  [24, 'บางเขน'],
  [25, 'ห้วยขวาง'],
  [26, 'เจ้าคุณพระประยุรวงศ์'],
  [27, 'จันทร์ฉิม ไพบูลย์'],
  [28, 'กรุงธนบุรี'],
  [29, 'ช่วง นุชเนตร'],
  [30, 'วัดเจ้าอาม'],
  [31, 'เอิบ-จิตร ทังสุบุตร'],
  [32, 'มาริษ ตินตมุสิก'],
  [33, 'วัดหงส์รัตนาราม'],
  [34, 'โพธิ์ศรี'],
  [35, 'หัวหมาก'],
  [36, 'บุคคโล'],
  [37, 'ประสงค์-สุดสาคร'],
  [38, 'จี๊ด-ทองคำ บำเพ็ญ'],
  [39, 'ราษฎร์บูรณะ'],
  [40, 'บางแค'],
  [41, 'คลองเตย'],
  [42, 'ถนอม ทองสิมา'],
  [43, 'มีนบุรี'],
  [44, 'ลำผักชี'],
  [45, 'ร่มเกล้า ลาดกระบัง'],
  [46, 'กันตารัติอุทิศ'],
  [47, 'คลองขวาง'],
  [48, 'นาควัชระ อุทิศ'],
  [49, 'วัดชัยพฤกษมาลา'],
  [50, 'บึงกุ่ม'],
  [51, 'วัดไผ่ตัน'],
  [52, 'สามเสนนอก'],
  [53, 'ทุ่งสองห้อง'],
  [54, 'ทัศน์เอี่ยม'],
  [55, 'เตชะสัมพันธ์'],
  [56, 'ทับเจริญ'],
  [57, 'บุญเรือง ล้ำเลิศ'],
  [58, 'ล้อม-พิมเสน ฟักอุดม'],
  [59, 'ทุ่งครุ'],
  [60, 'รสสุคนธ์ มโนชญากร'],
  [61, 'สังวาลย์ ทัศนารมย์'],
  [62, 'ตวงรัชฎ์ ศศะนาวิน-ภักดีฐานปัญญา'],
  [63, 'สมาคมแต้จิ๋วแห่งประเทศไทย'],
  [64, 'คลองสามวา'],
  [65, 'รักษาศุข บางบอน'],
  [66, 'ตำหนักพระแม่กวนอิมโชคชัย 4'],
  [67, 'ทวีวัฒนา'],
  [68, 'สะพานสูง'],
  [69, 'คันนายาว'],
];

/** Shared with <Header /> clinic <FilterDropdown /> and <Sidebar /> mobile row. */
export const CLINIC_OPTIONS = RAW_CLINICS.map(([n, name]) => ({
  value: `hc-${n}`,
  label: `ศูนย์ ${n} ${name}`,
}));

/** Default clinic — pinned to ศูนย์ 4 ดินแดง so demo screens & Figma references stay stable. */
export const DEFAULT_CLINIC_VALUE = 'hc-4';

const CLINIC_STORAGE_KEY = 'mih:selected-clinic';

const isValidClinicValue = (value) =>
  CLINIC_OPTIONS.some((o) => o.value === value);

/** Restore the last selected ศูนย์ (Hub header chip → every PHCIS screen). */
const readStoredClinic = () => {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_VALUE;
  try {
    const stored = window.localStorage.getItem(CLINIC_STORAGE_KEY);
    if (stored && isValidClinicValue(stored)) return stored;
  } catch {
    /* private mode / blocked storage */
  }
  return DEFAULT_CLINIC_VALUE;
};

const ClinicFilterContext = createContext(null);

/** Wrap layouts that render <Sidebar /> + <Header /> so clinic state syncs; below `md` the chip moves into the drawer.
    Nests are no-ops — App.jsx owns the single provider so Hub ↔ PHCIS pages share one value. */
export function ClinicFilterProvider({ children }) {
  const parent = useContext(ClinicFilterContext);
  if (parent) return children;

  const [clinic, setClinicState] = useState(readStoredClinic);

  const setClinic = useCallback((value) => {
    if (!isValidClinicValue(value)) return;
    setClinicState(value);
  }, []);

  useEffect(() => {
    if (!isValidClinicValue(clinic)) return;
    try {
      window.localStorage.setItem(CLINIC_STORAGE_KEY, clinic);
    } catch {
      /* ignore */
    }
  }, [clinic]);

  const value = useMemo(
    () => ({ clinic, setClinic, options: CLINIC_OPTIONS }),
    [clinic, setClinic],
  );
  return (
    <ClinicFilterContext.Provider value={value}>
      {children}
    </ClinicFilterContext.Provider>
  );
}

export function useClinicFilter() {
  return useContext(ClinicFilterContext);
}
