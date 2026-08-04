import React from 'react';
import { getPrintSettings } from '@/data/labPrintSettings';
import { summariseSendOut, LAB_EXTERNAL_LAB_BY_KEY, LAB_SENDOUT_REASON_BY_KEY } from '@/data/labSendOuts';

/* Monospace for accession numbers — a rendering requirement on a printed
   manifest, not a design-system value. tokens.css defines no
   --type-family-mono, so the var() here only ever resolved to its own
   fallback; a plain stack states that honestly. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


/* ใบนำส่งสิ่งส่งตรวจไปหน่วยงานภายนอก — the manifest that travels with the
   cool box, and the receiving lab's proof of what it was handed.

   Same shape as LabCollectionReport.jsx (mm units, black ink, hairline
   rules) so the two lab paper documents read as one family, and the same
   preview/print contract as LabReportPage: the on-screen preview and the
   paper render from THIS component, so they cannot drift.

   Two signature blocks at the foot, because a specimen that never arrived
   has to be traceable to two named people — the one who packed it and the
   one who received it — not to "the courier".

   Confidential analytes (§1.15.6.4) print as their group name only. A
   manifest is handled by a courier, a security guard and a receiving clerk;
   an "Anti-HIV" line on it identifies the patient's clinical status to
   everyone in that chain. The receiving lab reads the accession barcode,
   which resolves to the real test on their side. */

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
      fontFamily: mono ? MONO : 'var(--type-family-body)',
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

const SignatureBlock = ({ role, name }) => (
  <div style={{ flex: '1 1 0', minWidth: 0 }}>
    <div style={{ borderBottom: '0.15mm solid #000000', height: '12mm' }} />
    <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '8pt', color: '#000000', paddingTop: '1mm' }}>
      {role}
    </div>
    <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '7.5pt', color: '#444444' }}>
      {name || '(  ลงชื่อ / วัน-เวลา  )'}
    </div>
  </div>
);

const LabSendOutManifest = ({ rows = [], draft = null, batchNo = '', preview = false }) => {
  const settings = getPrintSettings();
  const summary = summariseSendOut(rows);
  const lab = draft?.labKey ? LAB_EXTERNAL_LAB_BY_KEY[draft.labKey] : null;
  const reason = draft?.reason ? LAB_SENDOUT_REASON_BY_KEY[draft.reason] : null;

  return (
    <div
      className={preview ? '' : 'mih-lab-print-only mih-lab-print-manifest'}
      style={{
        width: '210mm',
        background: '#FFFFFF',
        color: '#000000',
        paddingTop: '10mm',
        paddingRight: '10mm',
        paddingBottom: '10mm',
        paddingLeft: '10mm',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ borderBottom: '0.4mm solid #000000', paddingBottom: '2mm' }}>
        <div style={{ fontFamily: 'var(--type-family-heading-content)', fontSize: '13pt', fontWeight: 'var(--type-weight-bold)' }}>
          ใบนำส่งสิ่งส่งตรวจไปหน่วยงานภายนอก
        </div>
        <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '9pt' }}>
          {settings.siteName} · งานชันสูตรโรค
        </div>
      </div>

      <table style={{ width: '100%', marginTop: '3mm', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <TD bold>เลขที่ใบนำส่ง</TD>
            <TD mono>{batchNo || '(ออกเลขเมื่อยืนยันการส่ง)'}</TD>
            <TD bold>หน่วยงานปลายทาง</TD>
            <TD>{lab?.name ?? '—'}</TD>
          </tr>
          <tr>
            <TD bold>วัน-เวลาที่ส่ง</TD>
            <TD>{draft?.sentAt ?? '—'}</TD>
            <TD bold>คาดว่าจะได้ผล</TD>
            <TD>{draft?.expectedAt ?? '—'}{lab ? ` (ระยะเวลาตอบกลับ ${lab.turnaroundDays} วัน)` : ''}</TD>
          </tr>
          <tr>
            <TD bold>ผู้นำส่ง</TD>
            <TD>{draft?.courier ?? '—'}</TD>
            <TD bold>เหตุผลที่ส่งออก</TD>
            <TD>{reason?.label ?? '—'}</TD>
          </tr>
          {lab?.courier && (
            <tr>
              <TD bold>รอบรับ-ส่ง</TD>
              <TD>{lab.courier}</TD>
              <TD bold>ติดต่อ</TD>
              <TD>{lab.contact}</TD>
            </tr>
          )}
          {draft?.note && (
            <tr>
              <TD bold>หมายเหตุ</TD>
              <td colSpan={3} style={{ fontFamily: 'var(--type-family-body)', fontSize: '8pt', padding: '1.8mm 1mm', borderBottom: '0.15mm solid #999999' }}>
                {draft.note}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Grouped by ประเภทงาน — the shape of the receiving lab's own
          paperwork, so their clerk can tick straight down it. */}
      {summary.groups.map((g) => (
        <div key={g.key} style={{ marginTop: '4mm' }}>
          <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '9pt', fontWeight: 'var(--type-weight-bold)' }}>
            {g.label} ({g.rows.length} รายการ)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1mm' }}>
            <thead>
              <tr>
                <TH width='8mm' align='center'>#</TH>
                <TH width='30mm'>Accession</TH>
                <TH width='42mm'>ผู้ป่วย / HN</TH>
                <TH>รายการตรวจ</TH>
                <TH width='26mm'>ชนิดสิ่งส่งตรวจ</TH>
                <TH width='18mm' align='center'>ความเร่งด่วน</TH>
                <TH width='16mm' align='center'>รับแล้ว</TH>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r, i) => (
                <tr key={r.id}>
                  <TD align='center'>{i + 1}</TD>
                  <TD mono>{r.accessionNo}</TD>
                  <TD>
                    {r.confidential ? 'ผู้ป่วยปกปิด' : (r.patient?.fullName ?? r.patient?.shortName ?? '')}
                    <br />
                    <span style={{ fontSize: '7.5pt', color: '#444444' }}>
                      HN {r.confidential ? '•••••' : (r.patient?.hn ?? '')}
                    </span>
                  </TD>
                  <TD bold>{r.confidential ? `${r.groupLabel} (รายละเอียดปกปิด)` : r.testLabel}</TD>
                  <TD>{r.tubeLabel}</TD>
                  <TD align='center'>{r.urgencyLabel}</TD>
                  <TD align='center'>☐</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* รวมจำนวนสิ่งส่งตรวจ — counted per specimen, not per test, because
          that is what the person packing and the person receiving both
          physically count. */}
      <div
        style={{
          marginTop: '4mm',
          borderTop: '0.4mm solid #000000',
          paddingTop: '2mm',
          fontFamily: 'var(--type-family-body)',
          fontSize: '9pt',
        }}
      >
        <div style={{ fontWeight: 'var(--type-weight-bold)' }}>
          รวมจำนวนสิ่งส่งตรวจ {summary.totalSpecimens} ตัวอย่าง · {summary.totalTests} รายการตรวจ
        </div>
        <div style={{ fontSize: '8pt', color: '#333333' }}>
          {summary.specimenGroups.map((s) => `${s.label} ${s.specimens} ตัวอย่าง`).join(' · ')}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8mm', marginTop: '10mm' }}>
        <SignatureBlock role='ผู้จัดเตรียม/นำส่ง (ห้องปฏิบัติการต้นทาง)' name={draft?.courier} />
        <SignatureBlock role='ผู้รับ (หน่วยงานปลายทาง)' name='' />
      </div>
    </div>
  );
};

export default LabSendOutManifest;
