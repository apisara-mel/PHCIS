/* §1.9.7.2 — resolve a scanned value into either a document header patch
   (PO / delivery note) or a drug registry row to append as a receiving line.
   Keyboard-wedge scanners type into the focused field then hit Enter; the
   camera popup (PharmacyReceivingScanPopup) feeds the same resolver. */

import { DRUG_REGISTRY, getRegistryDrugByBarcode, currentPrice } from '@/data/pharmacyRegistry';

const TODAY = new Date().toISOString().slice(0, 10);

/** Demo document barcodes — picking one fills PO / DN / dates on the form. */
export const RECEIVING_DOCUMENT_SCANS = [
  {
    code: 'PO-2026-0044',
    kind: 'po',
    label: 'ใบสั่งซื้อ PO-2026-0044',
    fields: {
      poNumber: 'PO-2026-0044',
      purchaseDate: '2026-06-01',
      deliveryNoteNumber: 'DN-2026-0091',
      deliveryDate: '2026-07-01',
      receivingType: 'purchase',
      department: 'คลังยาใหญ่ศูนย์ 4 ดินแดง',
    },
  },
  {
    code: 'DN-2026-0091',
    kind: 'dn',
    label: 'ใบส่งของ DN-2026-0091',
    fields: {
      poNumber: 'PO-2026-0044',
      purchaseDate: '2026-06-01',
      deliveryNoteNumber: 'DN-2026-0091',
      deliveryDate: '2026-07-01',
      receivingType: 'purchase',
      department: 'คลังยาใหญ่ศูนย์ 4 ดินแดง',
    },
  },
  {
    code: 'PO-2026-0039',
    kind: 'po',
    label: 'ใบสั่งซื้อ PO-2026-0039',
    fields: {
      poNumber: 'PO-2026-0039',
      purchaseDate: '2026-05-01',
      deliveryNoteNumber: 'DN-2026-0082',
      deliveryDate: '2026-06-01',
      receivingType: 'purchase',
      department: 'คลังยาใหญ่ศูนย์ 4 ดินแดง',
    },
  },
];

/** Quick-pick list for the camera popup's "จำลองสแกน" when no camera /
    BarcodeDetector is available — mix of documents + a few drug barcodes. */
export const DEMO_SCAN_TARGETS = [
  ...RECEIVING_DOCUMENT_SCANS.map((d) => ({ code: d.code, label: d.label })),
  ...DRUG_REGISTRY.slice(0, 4).map((d) => ({
    code: d.barcode,
    label: `${d.name} · ${d.barcode}`,
  })),
];

/** Build a blank receiving line pre-filled from a registry drug. */
export const receivingLineFromDrug = (drug) => {
  if (!drug) return null;
  const price = (() => {
    try { return currentPrice(drug); } catch { return drug.priceSchedule?.[0]?.price ?? 1; }
  })();
  return {
    drugName: drug.name,
    quantity: 500,
    packSize: drug.packSize
      ? `กล่องละ ${drug.packSize} ${drug.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}`
      : '',
    lot: '',
    expiryDate: '',
    receivedFrom: drug.manufacturer || 'องค์การเภสัชกรรม (GPO)',
    drugType: 'GPO',
    costPrice: Math.max(0.1, Number((price * 0.75).toFixed(2))),
    salePrice: price,
    claimablePrice: price,
  };
};

/**
 * @returns {{ type: 'document', code: string, fields: object, label: string }
 *         | { type: 'drug', code: string, drug: object, line: object, label: string }
 *         | { type: 'unknown', code: string }}
 */
export const resolveReceivingScan = (raw) => {
  const code = String(raw || '').trim();
  if (!code) return { type: 'unknown', code: '' };

  const doc = RECEIVING_DOCUMENT_SCANS.find(
    (d) => d.code === code || d.code.toLowerCase() === code.toLowerCase(),
  );
  if (doc) {
    return { type: 'document', code: doc.code, fields: { ...doc.fields }, label: doc.label };
  }

  const drug = getRegistryDrugByBarcode(code);
  if (drug) {
    return {
      type: 'drug',
      code: drug.barcode,
      drug,
      line: receivingLineFromDrug(drug),
      label: `${drug.name} · ${drug.barcode}`,
    };
  }

  /* Free-typed PO-/DN- prefix still lands in the matching header field. */
  if (/^PO-/i.test(code)) {
    return {
      type: 'document',
      code,
      fields: { poNumber: code.toUpperCase(), purchaseDate: TODAY },
      label: `ใบสั่งซื้อ ${code.toUpperCase()}`,
    };
  }
  if (/^DN-/i.test(code)) {
    return {
      type: 'document',
      code,
      fields: { deliveryNoteNumber: code.toUpperCase(), deliveryDate: TODAY },
      label: `ใบส่งของ ${code.toUpperCase()}`,
    };
  }

  return { type: 'unknown', code };
};
