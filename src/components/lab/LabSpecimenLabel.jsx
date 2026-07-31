import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import { isStickerFieldOn, getPrintSettings } from '@/data/labPrintSettings';

/* Printable specimen stickers — TOR ภาคผนวก ก §1.15.5.

   §1.15.5.1  the sticker itself, with a configurable field set
              (labPrintSettings.js — "ตามเงื่อนไขที่สำนักอนามัยกำหนด")
   §1.15.5.2  the collection worklist report, below
   §1.15.5.3  one barcode per SPECIMEN TYPE — the team's "Barcode ตาม Tube":
              tests drawn into the same tube share one accession and get one
              sticker between them, which is what stops a two-test order
              producing two labels for one physical tube.

   Printing works the way PharmacyLabelPrint.jsx does: these documents are
   always mounted but hidden, and an injected @media print stylesheet flips
   which one is visible based on a root `data-lab-print-mode` attribute. No
   PDF or barcode library — `window.print()` and inline SVG. */

if (typeof document !== 'undefined' && !document.getElementById('mih-lab-print-style')) {
  const css = document.createElement('style');
  css.id = 'mih-lab-print-style';
  css.textContent = `
    .mih-lab-print-only { display: none; }
    @media print {
      /* Hide the app entirely, then reveal only the requested document. */
      body > *:not(.mih-lab-print-root) { display: none !important; }
      .mih-lab-no-print { display: none !important; }
      html[data-lab-print-mode="sticker"] .mih-lab-print-only.mih-lab-print-sticker { display: block !important; }
      html[data-lab-print-mode="collection"] .mih-lab-print-only.mih-lab-print-collection { display: block !important; }
      .mih-lab-sticker { break-inside: avoid; page-break-inside: avoid; }
    }
  `;
  document.head.appendChild(css);
}

/* Sticker geometry — 50 × 25 mm is the common thermal specimen-label size
   that fits lengthwise on a 13 × 75 mm blood tube. Printed dimensions are
   in mm so the output matches the physical roll regardless of screen DPI. */
const STICKER_W = '50mm';
const STICKER_H = '25mm';

const Line = ({ children, bold, size = '7pt' }) => (
  <div
    style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: size,
      fontWeight: bold ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
      lineHeight: 1.25,
      color: '#000000',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </div>
);

/* One sticker = one TUBE. `group` carries the accession, the tube and every
   test drawn into it. */
export const SpecimenSticker = ({ group, settings }) => {
  const { accessionNo, tube, tubeCount, volumeMl, rows } = group;
  const first = rows[0];
  const masked = rows.some((r) => r.confidential);

  return (
    <div
      className='mih-lab-sticker'
      style={{
        width: STICKER_W,
        height: STICKER_H,
        border: '0.2mm solid #000000',
        borderRadius: '1mm',
        padding: '1.2mm 1.5mm',
        margin: '0 2mm 2mm 0',
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        boxSizing: 'border-box',
        verticalAlign: 'top',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1mm' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Line size='5.5pt'>{settings.siteName}</Line>
          {/* Patient identifiers — both required, and deliberately the
              largest text on the label: this is what a nurse reads back
              against the patient's wristband before the needle goes in.
              A confidential order (VCT) prints the HN only. */}
          {isStickerFieldOn('patientName') && (
            <Line bold size='8pt'>
              {masked ? 'ผู้ป่วยปกปิด (VCT)' : first.patient.shortName}
            </Line>
          )}
          <Line size='7pt'>
            {isStickerFieldOn('hn') && <>HN {masked ? '•••••' : first.patient.hn}</>}
            {isStickerFieldOn('ageSex') && !masked && (
              <> · {parseInt(first.patient.age, 10)}ปี/{first.patient.sex}</>
            )}
          </Line>
        </div>
        {/* STAT has to be visible on the tube itself, not only on screen —
            it is what makes a courier walk instead of wait. */}
        {isStickerFieldOn('urgency') && first.urgency !== 'routine' && (
          <div
            style={{
              border: '0.3mm solid #000000',
              borderRadius: '0.8mm',
              padding: '0.3mm 1mm',
              fontFamily: 'var(--type-family-body)',
              fontSize: '7pt',
              fontWeight: 'var(--type-weight-bold)',
              color: '#000000',
              whiteSpace: 'nowrap',
            }}
          >
            {first.urgency === 'stat' ? 'STAT' : 'ด่วน'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm', minWidth: 0 }}>
        {isStickerFieldOn('barcode') && (
          <Barcode128 value={accessionNo} height={26} moduleWidth={0.9} showText={false} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <Line bold size='7pt'>{accessionNo}</Line>
          {isStickerFieldOn('tube') && tube && (
            <Line size='6pt'>
              {/* Cap colour is printed as a name, not a swatch — specimen
                  stickers are printed on monochrome thermal printers. */}
              {tube.label} · จุก{tube.capThai}
              {isStickerFieldOn('volume') && ` · ${volumeMl} mL`}
              {tubeCount > 1 && ` · ${tubeCount} หลอด`}
            </Line>
          )}
          {isStickerFieldOn('testNames') && (
            <Line size='6pt'>{rows.map((r) => r.testLabel).join(', ')}</Line>
          )}
        </div>
      </div>

      <div>
        {isStickerFieldOn('fasting') && (first.test?.fastingHours ?? 0) > 0 && (
          <Line bold size='6pt'>งดอาหาร {first.test.fastingHours} ชม.</Line>
        )}
        <Line size='5.5pt'>
          {isStickerFieldOn('location') && first.location}
          {isStickerFieldOn('doctor') && ` · ${first.doctor}`}
          {isStickerFieldOn('collectedAt') && ` · สั่ง ${first.orderedAt}`}
        </Line>
      </div>
    </div>
  );
};

/* Groups the rows of an order into one entry per tube — §1.15.5.3's
   "แยกตามชนิดสิ่งส่งตรวจ". Two Chemistry tests both drawn into a Clot tube
   produce ONE sticker; a CBC (EDTA) alongside them produces a second. */
export const groupRowsByTube = (rows = []) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.accessionNo;
    if (!map.has(key)) {
      map.set(key, {
        accessionNo: r.accessionNo,
        tube: r.tube,
        tubeCount: r.tubeCount,
        volumeMl: r.volumeMl,
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  });
  return [...map.values()];
};

/* The print-only sticker sheet. `rows` are the worklist rows to label. */
const LabSpecimenLabel = ({ rows = [] }) => {
  const settings = getPrintSettings();
  const groups = groupRowsByTube(rows);

  return (
    <div className='mih-lab-print-only mih-lab-print-sticker'>
      {groups.map((g) => (
        /* copiesPerTube covers sites that label both the tube and the
           request slip from one print run. */
        Array.from({ length: Math.max(1, settings.copiesPerTube) }, (_, i) => (
          <SpecimenSticker key={`${g.accessionNo}-${i}`} group={g} settings={settings} />
        ))
      ))}
    </div>
  );
};

export default LabSpecimenLabel;
