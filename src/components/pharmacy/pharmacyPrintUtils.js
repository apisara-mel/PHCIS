/* Shared print-mode trigger for the pharmacy module. Two independent
   printable documents live on `PharmacyDispensePage` at once — per-drug
   labels (`PharmacyLabelPrint`) and the single-sheet full prescription
   (`PharmacyPrescriptionPrint`, ToR §1.9.2.12 "พิมพ์ใบสั่งยาได้") — and a
   click on either "print" button must print ONLY that document, not both.

   Also used by `PharmacyMedicationHistoryPopup` (`med-history` mode) for
   printing the MPI medication-history sheet from ผู้รับบริการทั้งหมด.

   React state can't drive this reliably: `window.print()` called right
   after `setState` in the same handler still sees the pre-update DOM,
   since the state update is batched to the next render. Setting a DOM
   attribute directly is synchronous, so the print stylesheet's
   `@media print` rules pick it up immediately. */
export const triggerPharmacyPrint = (mode) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-pharmacy-print-mode', mode);
    const clear = () => {
      document.documentElement.removeAttribute('data-pharmacy-print-mode');
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
  }
  window.print();
};

/* Minimal EN phrase dictionary — covers the frequency/when/unit vocabulary
   actually used by this mock dataset (ToR §1.9.2.5 "พิมพ์วิธีใช้ยาภาษา
   อังกฤษ"). Falls back to the Thai source string for anything not in the
   table rather than pretending to be a full translation engine. */
export const PHARMACY_PRINT_EN_PHRASES = {
  'วันละ 3 ครั้ง': '3 times daily',
  'วันละ 2 ครั้ง': 'twice daily',
  'วันละ 1 ครั้ง': 'once daily',
  'ทุก 6 ชั่วโมงเมื่อมีอาการ': 'every 6 hours as needed',
  'หลังอาหาร': 'after meals',
  'หลังอาหารทันที': 'immediately after meals',
  'ก่อนนอน': 'at bedtime',
  'ก่อนอาหารเช้า': 'before breakfast 30 min',
  'เม็ด': 'tablet(s)',
  'แคปซูล': 'capsule(s)',
  'รับประทานจนยาหมด แม้อาการดีขึ้น': 'Complete the full course even if symptoms improve.',
  'รับประทานเมื่อมีไข้หรือปวด': 'Take when fever or pain occurs.',
  'งดใช้ร่วมกับยาแก้ปวดกลุ่มเดียวกัน': 'Do not combine with other drugs of the same class.',
  'อาจทำให้ง่วงซึม': 'May cause drowsiness.',
  'รับประทานต่อเนื่องตามแพทย์สั่ง': 'Take continuously as prescribed.',
  'รับประทานก่อนอาหาร 30 นาที': 'Take 30 minutes before meals.',
  'ยานอกบัญชี — ตรวจสอบสิทธิก่อนจ่าย': 'Non-formulary item — verify coverage before dispensing.',
};

export const translatePharmacyPrintPhrase = (s, lang = 'th') => (
  lang === 'en' ? (PHARMACY_PRINT_EN_PHRASES[s] || s) : s
);
