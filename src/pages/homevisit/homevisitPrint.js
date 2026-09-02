/* งานเยี่ยมบ้าน (TOR §1.10.12 + §1.18) — การพิมพ์เอกสาร.

   กลไกเดียวกับ `addictionPrint.js` / `appointmentShared.js`: เปิดหน้าต่างว่าง
   เขียนเอกสาร A4 แบบ self-contained แล้วให้ `window.onload` เรียก
   `window.print()`. สีในเอกสารเป็น literal hex เพราะเอกสารที่พิมพ์เป็น
   document object ใหม่ที่ไม่ได้โหลด stylesheet ของแอป — `var(--…)` จึงไม่มีค่า.
   ทุก literal สะท้อน token ที่มันแทน (brand-p700 #007549, text-content-default
   #363B3F, text-content-tertiary #858C92, border-card-default #E2E4E6,
   surface-brandPrimary-quaternary #F4FBF8). */

import { formatHomeVisitDate, formatHomeVisitDateTime, HOMEVISIT_CENTER } from '@/data/homevisitVisits';
import { STANDARD_TOOLS, interpretStandardTool } from '@/data/homevisitAssessments';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const DOC_CSS = `
  body{font-family:Sarabun,sans-serif;padding:32px;color:#363B3F}
  h1{font-size:20px;color:#007549;margin:0 0 4px}
  h2{font-size:14px;color:#007549;margin:24px 0 8px}
  .meta{color:#858C92;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:8px}
  th,td{padding:6px 8px;border-bottom:1px solid #E2E4E6;font-size:12px;text-align:left;vertical-align:top}
  th{background:#F4FBF8;color:#007549;font-weight:700}
  .kv td:first-child{width:200px;color:#858C92}
  .empty{font-size:12px;color:#858C92;padding:8px 0}
  .sign{margin-top:36px;display:flex;gap:48px;font-size:12px;color:#858C92}
  .sign div{flex:1;border-top:1px solid #E2E4E6;padding-top:6px;text-align:center}
  .foot{margin-top:24px;font-size:11px;color:#858C92}
  @media print{body{padding:0}}
`;

const openPrintDoc = (title, bodyHtml) => {
  if (typeof window === 'undefined') return;
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>${DOC_CSS}</style></head><body>${bodyHtml}
<div class="foot">พิมพ์จากระบบ PHCIS · งานเยี่ยมบ้าน · ${esc(HOMEVISIT_CENTER)} สำนักอนามัย กรุงเทพมหานคร — ${esc(formatHomeVisitDateTime())}</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=920,height=1000');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
};

const tableHtml = (headers, rows, emptyText) => {
  if (!rows.length) return `<div class="empty">${esc(emptyText)}</div>`;
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const body = rows
    .map((cells) => `<tr>${cells.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

/** พิมพ์คิวนัดหมายเยี่ยมบ้าน / แผนออกเยี่ยมของวัน (1.18.1 / 1.18.2). */
export const printHomeVisitRegistry = (rows, filterSummary) => {
  const body = `
    <h1>ทะเบียนผู้รับบริการเยี่ยมบ้าน</h1>
    <div class="meta">เงื่อนไขที่พิมพ์: ${esc(filterSummary || 'ทั้งหมด')} · จำนวน ${rows.length} รายการ</div>
    ${tableHtml(
    ['HN', 'ชื่อ-สกุล', 'อายุ/เพศ', 'กลุ่มผู้รับบริการ', 'ประเภทรับเข้า', 'ชุมชน/เขต', 'ผู้รับผิดชอบ', 'ลงทะเบียน', 'เยี่ยมล่าสุด', 'สถานะ'],
    rows.map((r) => [
      r.hn, r.confidential ? '(ข้อมูลลับ)' : r.name,
      `${r.age ?? '—'} ปี / ${r.gender || '—'}`,
      r.groupLabel || '—', r.sourceLabel || '—',
      `${r.community || '—'} · ${r.district || '—'}`,
      r.responsible || '—',
      formatHomeVisitDate(r.registeredDate),
      r.lastVisitDate ? formatHomeVisitDate(r.lastVisitDate) : 'ยังไม่เคยเยี่ยม',
      r.statusLabel || '—',
    ]),
    'ไม่มีรายการที่ตรงกับเงื่อนไขที่เลือก',
  )}`;
  openPrintDoc('ทะเบียนผู้รับบริการเยี่ยมบ้าน', body);
};

/** พิมพ์ใบสรุปการเยี่ยมบ้าน 1 ครั้ง (1.10.12.2 · ขั้นตอนที่ 7). */
export const printHomeVisitSummary = ({
  patientName, hn, groupLabel, sourceLabel, address, visitNo,
  serviceDate, arrivalTime, distanceLabel, team,
  vitals, adlScore, adlLabel, assessment, roleNotes, activities, orders,
  familyNote, nextVisitDate, planNote, carePlans, submission,
}) => {
  const vitalRows = Object.keys(vitals || {})
    .filter((k) => String(vitals[k] ?? '').trim() !== '')
    .map((k) => [vitals[k].label, `${vitals[k].value} ${vitals[k].unit}`]);

  const body = `
    <h1>ใบสรุปการเยี่ยมบ้าน (Home Visit Summary)</h1>
    <div class="meta">ครั้งที่ ${esc(visitNo)} · วันที่ให้บริการ ${esc(formatHomeVisitDate(serviceDate))} · เวลาถึงบ้าน ${esc(arrivalTime || '—')}</div>
    <table class="kv"><tbody>
      <tr><td>ชื่อ-สกุลผู้รับบริการ</td><td>${esc(patientName || '—')}</td></tr>
      <tr><td>HN</td><td>${esc(hn || '—')}</td></tr>
      <tr><td>กลุ่มผู้รับบริการ</td><td>${esc(groupLabel || '—')}</td></tr>
      <tr><td>ประเภทรับเข้า</td><td>${esc(sourceLabel || '—')}</td></tr>
      <tr><td>ที่อยู่ที่ไปเยี่ยม</td><td>${esc(address || '—')}</td></tr>
      <tr><td>ระยะจากพิกัดปัจจุบันถึงบ้าน</td><td>${esc(distanceLabel || '—')}</td></tr>
      <tr><td>ทีมผู้ออกเยี่ยม</td><td>${esc((team || []).join(', ') || '—')}</td></tr>
    </tbody></table>

    <h2>สัญญาณชีพ</h2>
    ${tableHtml(['รายการ', 'ค่าที่วัดได้'], vitalRows, 'ไม่ได้บันทึกสัญญาณชีพในการเยี่ยมครั้งนี้')}

    <h2>ผลการประเมินและคัดกรอง</h2>
    <table class="kv"><tbody>
      <tr><td>คะแนน ADL (ดัชนีบาร์เธล)</td><td>${esc(adlScore ?? '—')} คะแนน — ${esc(adlLabel || '—')}</td></tr>
      <tr><td>สรุปการประเมิน</td><td>${esc(assessment || '—')}</td></tr>
    </tbody></table>

    <h2>บันทึกตามบทบาทวิชาชีพ</h2>
    ${tableHtml(['วิชาชีพ', 'บันทึก'], roleNotes || [], 'ไม่มีบันทึกตามบทบาทวิชาชีพ')}

    <h2>กิจกรรมการดูแลที่ให้</h2>
    ${(activities || []).length
    ? `<div style="font-size:12px">${esc((activities || []).join(' · '))}</div>`
    : '<div class="empty">ไม่ได้บันทึกกิจกรรมการดูแล</div>'}

    <h2>คำสั่งการรักษา</h2>
    ${tableHtml(['ประเภท', 'รายการ'], orders || [], 'ไม่มีคำสั่งการรักษาในการเยี่ยมครั้งนี้')}

    <h2>Family Folder และแผนการดูแล</h2>
    <table class="kv"><tbody>
      <tr><td>บันทึก Family Folder</td><td>${esc(familyNote || '—')}</td></tr>
      <tr><td>นัดเยี่ยมครั้งถัดไป</td><td>${esc(nextVisitDate ? formatHomeVisitDate(nextVisitDate) : '—')}</td></tr>
      <tr><td>Template กิจกรรม/เป้าหมาย</td><td>${esc((carePlans || []).map((plan) => [plan.problem, plan.goal].filter(Boolean).join(' — ')).filter(Boolean).join(' · ') || '—')}</td></tr>
      <tr><td>เกณฑ์ประเมินผล</td><td>${esc((carePlans || []).map((plan) => plan.evaluation).filter(Boolean).join(' · ') || '—')}</td></tr>
      <tr><td>แผนการดูแลต่อเนื่อง</td><td>${esc(planNote || '—')}</td></tr>
      <tr><td>ส่งข้อมูลเข้าศูนย์บริการฯ</td><td>${esc(submission ? `ส่งแล้วโดย ${submission.by} · ${submission.at}` : 'ยังไม่ได้ส่ง')}</td></tr>
    </tbody></table>

    <div class="sign">
      <div>ลงชื่อผู้ออกเยี่ยม</div>
      <div>ลงชื่อผู้รับบริการ/ผู้ดูแล</div>
      <div>ลงชื่อหัวหน้าทีมเยี่ยมบ้าน</div>
    </div>
  `;
  openPrintDoc(`ใบสรุปการเยี่ยมบ้าน HN ${hn || ''}`.trim(), body);
};

/** พิมพ์ใบสรุปการติดตามการเยี่ยมบ้านรายบุคคลตามช่วงเวลา (1.10.12.4). */
export const printHomeVisitFollowUp = ({
  patientName, hn, registry, range, visits, labs, xrays,
}) => {
  const body = `
    <h1>ใบสรุปการติดตามการเยี่ยมบ้าน</h1>
    <div class="meta">ช่วงเวลา ${esc(formatHomeVisitDate(range.from))} – ${esc(formatHomeVisitDate(range.to))}</div>
    <table class="kv"><tbody>
      <tr><td>ชื่อ-สกุลผู้รับบริการ</td><td>${esc(patientName || '—')}</td></tr>
      <tr><td>HN</td><td>${esc(hn || '—')}</td></tr>
      <tr><td>กลุ่มผู้รับบริการ</td><td>${esc(registry?.groupLabel || 'ยังไม่มีทะเบียน')}</td></tr>
      <tr><td>ประเภทรับเข้า</td><td>${esc(registry?.sourceLabel || '—')}</td></tr>
      <tr><td>ผู้รับผิดชอบ</td><td>${esc(registry?.responsible || '—')}</td></tr>
    </tbody></table>

    <h2>ผลตรวจร่างกายและคะแนน ADL รายครั้ง</h2>
    ${tableHtml(
    ['ครั้งที่', 'วันที่เยี่ยม', 'ผู้เยี่ยม', 'ความดัน', 'ชีพจร', 'อุณหภูมิ', 'SpO2', 'ADL', 'สรุป'],
    (visits || []).map((v) => [
      v.no, formatHomeVisitDate(v.date), v.by,
      v.vitals?.sys && v.vitals?.dia ? `${v.vitals.sys}/${v.vitals.dia}` : '—',
      v.vitals?.pulse || '—', v.vitals?.temp || '—', v.vitals?.oxygen || '—',
      v.adl ?? '—', v.summary || '—',
    ]),
    'ไม่มีการเยี่ยมในช่วงเวลาที่เลือก',
  )}

    <h2>ผลการประเมินด้วยเครื่องมือมาตรฐาน</h2>
    ${tableHtml(
    ['ครั้งที่', 'วันที่เยี่ยม', ...STANDARD_TOOLS.map((t) => `${t.name} (เต็ม ${t.max})`)],
    (visits || []).map((v) => [
      v.no, formatHomeVisitDate(v.date),
      ...STANDARD_TOOLS.map((t) => {
        const raw = v.toolScores?.[t.key];
        if (!Number.isFinite(Number(raw))) return '—';
        const interp = interpretStandardTool(t.key, raw);
        return `${raw}${t.unit === '%' ? '%' : ''}${interp ? ` — ${interp.label}` : ''}`;
      }),
    ]),
    'ไม่มีผลการประเมินในช่วงเวลาที่เลือก',
  )}

    <h2>ผลตรวจทางห้องปฏิบัติการ</h2>
    ${tableHtml(['วันที่', 'รายการตรวจ', 'ผล', 'สถานะ'],
    (labs || []).map((r) => [formatHomeVisitDate(r.date), r.test, r.result, r.abnormal ? 'ผิดปกติ' : 'ปกติ']),
    'ไม่มีผล Lab ในช่วงเวลาที่เลือก')}

    <h2>ผลเอกซเรย์</h2>
    ${tableHtml(['วันที่', 'รายการตรวจ', 'ผลการอ่าน'],
    (xrays || []).map((r) => [formatHomeVisitDate(r.date), r.exam, r.result]),
    'ไม่มีผล X-ray ในช่วงเวลาที่เลือก')}
  `;
  openPrintDoc(`ใบสรุปการติดตามการเยี่ยมบ้าน HN ${hn || ''}`.trim(), body);
};
