import React from 'react';
import { getPrintSettings } from '@/data/labPrintSettings';
import { groupRowsByTube } from '@/components/lab/LabSpecimenLabel';

/* รายงานรายการเก็บตัวอย่างสิ่งส่งตรวจ — TOR ภาคผนวก ก §1.15.5.2:
   "สามารถสร้างสั่งพิมพ์รายงานรายการการเก็บตัวอย่างสิ่งส่งตรวจตามเงื่อนไขที่
    สำนักอนามัยกำหนด".

   This is the sheet the phlebotomist carries on the round: who to draw,
   where they are, which tubes to bring, and a box to tick off each one.
   It is deliberately grouped by ordering location, because that is the
   order the round is physically walked — a list sorted by accession would
   send the same person back to the same ward four times.

   One row per TUBE, not per test, matching the stickers that come out
   alongside it (§1.15.5.3). A tick column and a time column are left blank
   for the drawer to complete by hand, since the round happens away from a
   screen and gets keyed in afterwards. */

const TH = ({ children, width, align = 'left' }) => (
  <th
    style={{
      width,
      textAlign: align,
      fontFamily: 'var(--type-family-body)',
      fontSize: '8pt',
      fontWeight: 'var(--type-weight-bold)',
      color: '#000000',
      borderBottom: '0.4mm solid #000000',
      padding: '1.5mm 1mm',
    }}
  >
    {children}
  </th>
);

const TD = ({ children, align = 'left', bold, mono }) => (
  <td
    style={{
      textAlign: align,
      fontFamily: mono ? 'var(--type-family-mono, monospace)' : 'var(--type-family-body)',
      fontSize: '8pt',
      fontWeight: bold ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
      color: '#000000',
      borderBottom: '0.15mm solid #999999',
      padding: '1.8mm 1mm',
      verticalAlign: 'top',
    }}
  >
    {children}
  </td>
);

const LabCollectionReport = ({ rows = [], title = 'รายการเก็บตัวอย่างสิ่งส่งตรวจ', filterNote }) => {
  const settings = getPrintSettings();
  const groups = groupRowsByTube(rows);

  /* Group by ordering location — the round's actual walking order. */
  const byLocation = new Map();
  groups.forEach((g) => {
    const loc = g.rows[0].location;
    if (!byLocation.has(loc)) byLocation.set(loc, []);
    byLocation.get(loc).push(g);
  });

  /* STAT first inside each location, for the same reason the worklist
     floats it: an urgent draw should not wait behind a routine one. */
  byLocation.forEach((list) => list.sort((a, b) => a.rows[0].urgencyRank - b.rows[0].urgencyRank));

  const totalTubes = groups.reduce((n, g) => n + (g.tubeCount || 1), 0);

  return (
    <div className='mih-lab-print-only mih-lab-print-collection' style={{ padding: '8mm', background: '#FFFFFF' }}>
      <div style={{ marginBottom: '4mm' }}>
        <div style={{ fontFamily: 'var(--type-family-heading-content)', fontSize: '13pt', fontWeight: 'var(--type-weight-bold)', color: '#000000' }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '8pt', color: '#000000' }}>
          {settings.siteName} · งานชันสูตรโรค
        </div>
        <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '8pt', color: '#000000' }}>
          {groups.length} รายการเก็บ · {totalTubes} หลอด · ผู้ป่วย {new Set(groups.map((g) => g.rows[0].patient.hn)).size} ราย
          {filterNote ? ` · ${filterNote}` : ''}
        </div>
      </div>

      {[...byLocation.entries()].map(([loc, list]) => (
        <div key={loc} style={{ marginBottom: '5mm', breakInside: 'avoid' }}>
          <div
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: '9pt',
              fontWeight: 'var(--type-weight-bold)',
              color: '#000000',
              background: '#EEEEEE',
              padding: '1.2mm 1.5mm',
            }}
          >
            {loc} — {list.length} รายการ
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH width='8mm' align='center'>✓</TH>
                <TH width='26mm'>Accession</TH>
                <TH>ผู้ป่วย / HN</TH>
                <TH width='16mm'>อายุ/เพศ</TH>
                <TH>รายการตรวจ</TH>
                <TH width='30mm'>หลอด (สีจุก)</TH>
                <TH width='16mm' align='center'>ปริมาตร</TH>
                <TH width='20mm'>เวลาเก็บ</TH>
                <TH width='20mm'>ผู้เก็บ</TH>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => {
                const r = g.rows[0];
                const masked = g.rows.some((x) => x.confidential);
                const fasting = g.rows.reduce((m, x) => Math.max(m, x.test?.fastingHours ?? 0), 0);
                return (
                  <tr key={g.accessionNo}>
                    {/* Hand-ticked on the round. */}
                    <TD align='center'>☐</TD>
                    <TD mono bold>
                      {g.accessionNo}
                      {r.urgency !== 'routine' && (
                        <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '7pt', fontWeight: 'var(--type-weight-bold)' }}>
                          {r.urgency === 'stat' ? '★ STAT' : '● ด่วน'}
                        </div>
                      )}
                    </TD>
                    <TD bold>
                      {masked ? 'ผู้ป่วยปกปิด (VCT)' : r.patient.shortName}
                      <div style={{ fontWeight: 'var(--type-weight-regular)', fontSize: '7.5pt' }}>
                        HN {masked ? '•••••' : r.patient.hn}
                      </div>
                    </TD>
                    <TD>{masked ? '—' : `${parseInt(r.patient.age, 10)} / ${r.patient.sex}`}</TD>
                    <TD>
                      {g.rows.map((x) => x.testLabel).join(', ')}
                      {/* Fasting is on the round sheet because it is checked
                          at the bedside, before the draw — too late once the
                          tube is filled. */}
                      {fasting > 0 && (
                        <div style={{ fontSize: '7.5pt', fontWeight: 'var(--type-weight-bold)' }}>
                          ⚠ ต้องงดอาหาร {fasting} ชม. — ยืนยันกับผู้ป่วยก่อนเจาะ
                        </div>
                      )}
                    </TD>
                    <TD>{g.tube ? `${g.tube.label} (จุก${g.tube.capThai})` : '—'}</TD>
                    <TD align='center'>{g.volumeMl} mL</TD>
                    {/* Blank — filled in by hand on the round. */}
                    <TD>{' '}</TD>
                    <TD>{' '}</TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <div
        style={{
          marginTop: '6mm',
          paddingTop: '2mm',
          borderTop: '0.15mm solid #999999',
          fontFamily: 'var(--type-family-body)',
          fontSize: '7.5pt',
          color: '#000000',
        }}
      >
        ผู้เก็บตัวอย่าง ..................................................  ผู้รับตัวอย่างเข้าห้องปฏิบัติการ ..................................................  วันที่/เวลา ..........................
        <div style={{ marginTop: '1.5mm' }}>
          หมายเหตุ: ตรวจสอบตัวผู้ป่วยด้วย 2 ตัวระบุ (ชื่อ-สกุล + HN) ทุกครั้งก่อนเจาะ · ห้ามเขียน/แปะสติกเกอร์ทับหลอดที่ไม่ตรงกับผู้ป่วย
        </div>
      </div>
    </div>
  );
};

export default LabCollectionReport;
