import React from 'react';
import Barcode128 from '@/components/lab/Barcode128';
import { isStickerFieldOn, getPrintSettings, getStickerSize } from '@/data/labPrintSettings';

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

/* The print visibility stylesheet lives in labPrintSettings.js — see the
   note there on why it is shared rather than per-component. */

/* Sticker geometry — 50 × 25 mm is the common thermal specimen-label size
   that fits lengthwise on a 13 × 75 mm blood tube. Printed dimensions are
   in mm so the output matches the physical roll regardless of screen DPI. */
/* ขนาดมาจากการตั้งค่า (labPrintSettings.LAB_STICKER_SIZES) ไม่ได้ตรึงไว้ในโค้ดแล้ว
   ค่าเริ่มต้นยังเป็น 50 × 25 มม. เหมือนเดิม */
const DEFAULT_STICKER_W = '50mm';
const DEFAULT_STICKER_H = '25mm';

/* ลำดับความสำคัญบนสติกเกอร์ (มติผู้ใช้ 31 ส.ค. 69) — เดิมทุกบรรทัดดำ 100% เท่ากันหมด
   ต่างแค่ขนาด อ่านแล้วแบน ตอนนี้ไล่โทนเทาเป็นสามชั้น: ตัวระบุผู้ป่วยดำเข้ม ·
   ข้อมูลหลอด/รายการเทาเข้ม · ข้อมูลประกอบเทาอ่อน (พิมพ์ขาวดำก็ยังไล่ระดับได้จริง
   เพราะเป็นค่าเทาไม่ใช่สี) */
const INK = { strong: '#000000', mid: '#333333', soft: '#666666' };

const Line = ({ children, bold, size = '7pt', tone = 'strong' }) => (
  <div
    style={{
      fontFamily: 'var(--type-family-body)',
      fontSize: size,
      fontWeight: bold ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
      lineHeight: 1.25,
      color: INK[tone] || INK.strong,
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
  const size = getStickerSize(settings?.stickerSize);
  const stickerW = size?.width || DEFAULT_STICKER_W;
  const stickerH = size?.height || DEFAULT_STICKER_H;
  const { accessionNo, tube, tubeCount, volumeMl, rows } = group;
  const first = rows[0];
  const masked = rows.some((r) => r.confidential);

  return (
    <div
      className='mih-lab-sticker'
      style={{
        width: stickerW,
        height: stickerH,
        /* ขอบใบเป็นเส้นประเทาอ่อน ไม่ใช่กรอบดำทึบ (มติผู้ใช้ 31 ส.ค. 69) — สติกเกอร์
           จริงไม่ได้พิมพ์กรอบ ขอบคือรอยไดคัทของกระดาษ เส้นประจึงสื่อว่า "นี่คือขอบ
           ของดวงสติกเกอร์" ไม่ใช่หมึกที่พิมพ์ลงไป · กรอบดำเดิมยังไปแย่งสายตากับ
           ป้าย STAT และแถบสีจุกด้วย */
        border: '0.2mm dashed #C7CDD2',
        borderRadius: '1mm',
        boxShadow: '0 0.3mm 0.8mm rgba(16, 24, 40, 0.08)',
        padding: '1.2mm 1.5mm',
        margin: '0 2mm 2mm 0',
        display: 'inline-flex',
        flexDirection: 'row',
        gap: '1.2mm',
        background: '#FFFFFF',
        boxSizing: 'border-box',
        verticalAlign: 'top',
        overflow: 'hidden',
      }}
    >
      {/* แถบสีจุกเต็มความสูงด้านซ้าย (มติผู้ใช้ 31 ส.ค. 69) — เป็นตัวแบ่ง "ประเภท
          สิ่งส่งตรวจ" ที่อ่านได้จากระยะไกลกว่าตัวหนังสือใด ๆ บนใบ เจ้าหน้าที่หยิบ
          หลอดถูกก่อนจะทันได้อ่านชื่อหลอดด้วยซ้ำ · ตอนพิมพ์ขาวดำแถบจะเป็นเทาเข้ม
          ซึ่งยังทำหน้าที่แบ่งโซนของใบได้อยู่ */}
      {isStickerFieldOn('tube') && tube && (
        <div aria-hidden style={{ width: '1.8mm', alignSelf: 'stretch', borderRadius: '0.6mm', background: tube.color, flexShrink: 0 }} />
      )}

      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1mm' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isStickerFieldOn('siteName') && (
            <Line size='5.5pt' tone='soft'>{settings.siteName}</Line>
          )}
          {/* Patient identifiers — both required, and deliberately the
              largest text on the label: this is what a nurse reads back
              against the patient's wristband before the needle goes in.
              A confidential order (VCT) prints the HN only. */}
          {isStickerFieldOn('patientName') && (
            <Line bold size='9pt' tone='strong'>
              {masked ? 'ผู้ป่วยปกปิด (VCT)' : first.patient.shortName}
            </Line>
          )}
          <Line size='7pt' tone='mid'>
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
            /* ป้ายทึบกลับสี — ต้องเด่นกว่าทุกอย่างบนใบ เห็นได้จากตะกร้าส่งตรวจ
               STAT แดง / ด่วน ส้ม แยกระดับด้วยสี ไม่ใช่แค่คำ */
            style={{
              background: first.urgency === 'stat' ? '#C62828' : '#B26A00',
              borderRadius: '0.8mm',
              padding: '0.4mm 1.2mm',
              fontFamily: 'var(--type-family-body)',
              fontSize: '7pt',
              fontWeight: 'var(--type-weight-bold)',
              color: '#FFFFFF',
              letterSpacing: '0.02em',
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
          <Line bold size='7.5pt' tone='strong'>{accessionNo}</Line>
          {isStickerFieldOn('tube') && tube && (
            <Line size='6pt' tone='mid'>
              {/* จุดสีจุกนำหน้าชื่อหลอด (มติผู้ใช้ 31 ส.ค. 69) — บนจอเจ้าหน้าที่จับคู่
                  สติกเกอร์กับหลอดด้วยสีได้ทันที เร็วกว่าอ่านชื่อสี ส่วนตอนพิมพ์จริงบน
                  เครื่องความร้อนขาวดำ จุดจะออกมาเป็นวงเทา ชื่อสีจึงยังต้องอยู่คู่กัน
                  ไม่ได้แทนที่กัน */}
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: '1.4mm',
                  height: '1.4mm',
                  borderRadius: '50%',
                  background: tube.color,
                  marginRight: '0.8mm',
                  verticalAlign: 'middle',
                }}
              />
              {tube.label} · จุก{tube.capThai}
              {isStickerFieldOn('volume') && ` · ${volumeMl} mL`}
              {tubeCount > 1 && ` · ${tubeCount} หลอด`}
            </Line>
          )}
          {isStickerFieldOn('testNames') && (
            <Line size='6pt' tone='mid'>{rows.map((r) => r.testLabel).join(', ')}</Line>
          )}
        </div>
      </div>

      <div style={{ borderTop: '0.15mm solid #CCCCCC', paddingTop: '0.6mm' }}>
        {isStickerFieldOn('fasting') && (first.test?.fastingHours ?? 0) > 0 && (
          <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '6pt', fontWeight: 'var(--type-weight-bold)', lineHeight: 1.25, color: '#B26A00' }}>
            งดอาหาร {first.test.fastingHours} ชม.
          </div>
        )}
        <Line size='5.5pt' tone='soft'>
          {isStickerFieldOn('location') && first.location}
          {isStickerFieldOn('doctor') && ` · ${first.doctor}`}
          {isStickerFieldOn('collectedAt') && ` · สั่ง ${first.orderedAt}`}
        </Line>
      </div>
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
