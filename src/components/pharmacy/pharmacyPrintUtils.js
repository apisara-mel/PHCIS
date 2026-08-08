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
