import React from 'react';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { Donut, HBarList, VBars } from '@/components/graph/Charts';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { CONSENT_STATUS } from '@/data/consentRecords';
import { CONSENT_FORM_RECORDS } from '@/data/consentFormRecords';
import { ACCESS_RECORDS } from '@/data/accessRecords';
import { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import {
  CONSENT_REPORTS,
  CONSENT_STATUS_BUCKETS,
  consentStatusSegmentsFrom,
  consentTypeStatusBarsFrom,
} from '@/data/consentReports';

/* PHCIS | Consent — ตัวเรนเดอร์ widget ของเทมเพลตแดชบอร์ด (TOR ด.1.1.12).
   ใช้ร่วมกันสองที่ ให้ "ตัวอย่าง" ในป๊อปอัปสร้างเทมเพลตกับของจริงบนแดชบอร์ด
   เป็นภาพเดียวกันเป๊ะ:
     • ConsentDashboardTemplatePopup — ตัวอย่างหน้าจอรวมระหว่างจัดวาง
     • ConsentDashboardPage         — แสดงจริงเมื่อเลือกเทมเพลต

   ทุก widget ผูก "ชุดข้อมูล" (dataset) ของระบบความยินยอมจริง และเปลี่ยน
   dataset แล้วภาพต้องเปลี่ยนจริง — Select จึงไม่มี dead control:
     summary — สรุปสถานะความยินยอม (การ์ดตัวเลขของแดชบอร์ด)
     records — รายการความยินยอมทั้งหมด (CONSENT_RECORDS ตามช่วงวันที่)
     reports — สถิติจากรายงานความยินยอม (ยินยอม / ไม่ยินยอม รายเดือน)
     forms   — ทะเบียนแบบฟอร์มความยินยอม (CONSENT_FORM_RECORDS)
     access  — คำขอเข้าถึงข้อมูล (ACCESS_RECORDS) */

const MONTH_LABELS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const MUTED_XS = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const colorAt = (i) => PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length];
const colorOfBucket = (label) => (CONSENT_STATUS_BUCKETS.find((b) => b.label === label) || {}).color;

/* ── ตัวช่วยรวมยอด ─────────────────────────────────────────────────── */
const countBy = (rows, pick) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = pick(r) || '-';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return [...map.entries()];
};

const segmentsOf = (rows, pick) => countBy(rows, pick)
  .filter(([, value]) => value > 0)
  .map(([label, value], i) => ({ label, value, color: colorAt(i) }));

/** แถวของ HBarList — แต่ละแถวแบ่งสีตามสถานะย่อย */
const hbarOf = (rows, pickRow, pickSeg) => {
  const groups = new Map();
  rows.forEach((r) => {
    const label = pickRow(r) || '-';
    const seg = pickSeg(r) || '-';
    const g = groups.get(label) || { label, value: 0, counts: new Map() };
    g.value += 1;
    g.counts.set(seg, (g.counts.get(seg) || 0) + 1);
    groups.set(label, g);
  });
  const segKeys = [...new Set(rows.map((r) => pickSeg(r) || '-'))];
  return [...groups.values()]
    .sort((a, b) => b.value - a.value)
    .map((g) => ({
      label: g.label,
      value: g.value,
      segments: segKeys.map((k, i) => ({ label: k, value: g.counts.get(k) || 0, color: colorAt(i) })),
    }));
};

/** จำนวนต่อเดือนจากวันที่ไทย ("13 สิงหาคม 2569") — ใช้กับกราฟแท่ง */
const monthHistogramOf = (rows, pickDate) => {
  const counts = Array.from({ length: 12 }, () => 0);
  rows.forEach((r) => {
    const d = String(pickDate(r) || '');
    const idx = THAI_MONTHS_FULL.findIndex((m) => d.includes(m));
    if (idx >= 0) counts[idx] += 1;
  });
  return counts;
};

const statCard = ({ key, label, value, icon, tone = 'info', indicator }) => ({
  key,
  label,
  icon,
  value: Number(value).toLocaleString('th-TH'),
  tileBg: `var(--surface-statussummarycard-${tone})`,
  iconInk: `var(--text-statussummarycard-${tone}-number)`,
  indicator,
  indicatorIcon: null,
});

/* ── ชุดข้อมูลทั้งหมดที่ widget เลือกผูกได้ ─────────────────────────── */
export const buildConsentWidgetContext = ({
  records = [],
  summary = [],
  forms = CONSENT_FORM_RECORDS,
  access = ACCESS_RECORDS,
}) => {
  const statsReport = CONSENT_REPORTS.find((r) => r.key === 'consent-stats');
  const reportSeries = (statsReport?.bars || []).map((b) => ({
    name: b.name,
    color: colorOfBucket(b.name === 'ยินยอม' ? 'ยินยอมแล้ว' : 'ปฏิเสธ / ถอน') || colorAt(0),
    values: b.base,
  }));

  const datasets = {
    summary: {
      label: 'สรุปสถานะความยินยอม',
      cards: summary,
    },
    records: {
      label: 'รายการความยินยอมทั้งหมด',
      cards: summary,
      segments: consentStatusSegmentsFrom(records),
      hbar: consentTypeStatusBarsFrom(records),
      months: [{ name: 'คำขอความยินยอม', color: colorAt(0), values: monthHistogramOf(records, (r) => r.createdDate) }],
      rows: [...records].slice(-6).reverse().map((r) => ({
        id: `rec-${r.id}`,
        lead: r.hn,
        title: r.formName,
        badge: (CONSENT_STATUS[r.status] || {}).label || r.status,
        tone: (CONSENT_STATUS[r.status] || {}).tone || 'grey',
      })),
    },
    reports: {
      label: 'สถิติจากรายงานความยินยอม',
      cards: (statsReport?.donut || []).map((d, i) => statCard({
        key: `rep-${i}`,
        label: d.label,
        value: d.value,
        icon: i === 0 ? 'verified' : 'do_not_disturb_on',
        tone: i === 0 ? 'positive' : 'destructive',
        indicator: 'รวมทั้งปี',
      })),
      segments: (statsReport?.donut || []).map((d, i) => ({ label: d.label, value: d.value, color: colorAt(i) })),
      months: reportSeries,
    },
    forms: {
      label: 'ทะเบียนแบบฟอร์มความยินยอม',
      cards: countBy(forms, (f) => f.status).slice(0, 4).map(([label, value], i) => statCard({
        key: `form-${i}`,
        label,
        value,
        icon: 'folder_open',
        tone: ['info', 'positive', 'inprogress', 'destructive'][i % 4],
        indicator: `จากทั้งหมด ${forms.length} ฉบับ`,
      })),
      segments: segmentsOf(forms, (f) => f.status),
      hbar: hbarOf(forms, (f) => f.type, (f) => f.status),
      months: [{ name: 'แบบฟอร์มที่สร้าง', color: colorAt(2), values: monthHistogramOf(forms, (f) => f.createdDate) }],
      rows: [...forms].slice(0, 6).map((f) => ({
        id: `form-${f.id}`,
        lead: f.code,
        title: f.name,
        badge: f.status,
        tone: 'indigo',
      })),
    },
    access: {
      label: 'คำขอเข้าถึงข้อมูล',
      cards: countBy(access, (a) => a.status).slice(0, 4).map(([label, value], i) => statCard({
        key: `acc-${i}`,
        label,
        value,
        icon: 'lock',
        tone: ['inprogress', 'positive', 'destructive', 'info'][i % 4],
        indicator: `จากคำขอทั้งหมด ${access.length} รายการ`,
      })),
      segments: segmentsOf(access, (a) => a.status),
      hbar: hbarOf(access, (a) => a.category || a.dataGroup || 'ไม่ระบุหมวด', (a) => a.status),
      rows: [...access].slice(0, 6).map((a) => ({
        id: `acc-${a.id || a.reqNo}`,
        lead: a.reqNo,
        title: a.name,
        badge: a.status,
        tone: 'teal',
      })),
    },
  };

  return { datasets, records, summary };
};

const Empty = ({ children }) => <span style={MUTED_XS}>{children}</span>;

/** เรนเดอร์ 1 widget ตามชนิด + ชุดข้อมูลที่เลือกไว้ในเทมเพลต */
export const ConsentDashboardWidget = ({ widget, ctx, compact = false }) => {
  const { type, dataset } = widget || {};
  const data = (ctx?.datasets || {})[dataset] || (ctx?.datasets || {}).records || {};

  if (type === 'stat') {
    const cards = (data.cards || []).slice(0, compact ? 2 : 4);
    if (!cards.length) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return (
      <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
        {cards.map((card) => (
          <SummaryCard key={card.key} card={card} variant='panel' />
        ))}
      </div>
    );
  }

  if (type === 'overview' || type === 'donut') {
    const segments = data.segments || [];
    const total = segments.reduce((a, s) => a + s.value, 0);
    if (!total) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return (
      <div className='flex items-center justify-center flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <Donut
          segments={segments}
          size={compact ? 140 : 190}
          thickness={compact ? 12 : 16}
          centerLabel={total.toLocaleString('th-TH')}
          centerSub='รายการ'
        />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
          {segments.map((s) => (
            <span key={s.label} className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--dim-radius-full)',
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ ...MUTED_XS, color: 'var(--text-content-secondary)', whiteSpace: 'nowrap' }}>{s.label}</span>
              <span style={{ ...MUTED_XS, color: s.color, whiteSpace: 'nowrap' }}>
                {s.value.toLocaleString('th-TH')} · {`${((s.value / total) * 100).toFixed(0)}%`}
              </span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'bars') {
    const series = data.months || [];
    if (!series.length) return <Empty>ชุดข้อมูลนี้ไม่มีข้อมูลรายเดือน</Empty>;
    return <VBars months={MONTH_LABELS} series={series} height={compact ? 160 : 220} barMaxWidth={16} />;
  }

  if (type === 'hbar') {
    const rows = data.hbar || [];
    if (!rows.length) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return <HBarList rows={rows} valueLabel='รายการ' />;
  }

  if (type === 'table') {
    const rows = data.rows || [];
    if (!rows.length) return <Empty>ไม่มีรายการในชุดนี้</Empty>;
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {rows.slice(0, compact ? 3 : 6).map((r) => (
          <div
            key={r.id}
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
            }}
          >
            <span style={{ ...CELL_TEXT, width: 'var(--dim-size-1700, 80px)', flexShrink: 0 }}>{r.lead}</span>
            <span className='flex-1 min-w-0 truncate' style={CELL_TEXT}>{r.title}</span>
            <ColorfulBadge style={r.tone} size='small' hierarchy='secondary' width='hug'>
              {r.badge}
            </ColorfulBadge>
          </div>
        ))}
      </div>
    );
  }

  return <Empty>ยังไม่รองรับ widget ชนิดนี้</Empty>;
};

export default ConsentDashboardWidget;
