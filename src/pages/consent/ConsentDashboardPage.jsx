import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import Icon from '@/components/icons/Icon';
import { Donut, VBars } from '@/components/graph/Charts';
import { CONSENT_RECORDS, CONSENT_STATUS, CONSENT_SUMMARY, CONSENT_TYPE_TONE } from '@/data/consentRecords';
import { CONSENT_REPORTS } from '@/data/consentReports';
import {
  DASHBOARD_LAYOUTS, WIDGET_TYPES, WIDGET_DATASETS, WIDGET_TYPE_DATASETS,
  listDashboardTemplates, getDefaultDashboardTemplate, getDefaultDashboardTemplateId,
  setDefaultDashboardTemplate, saveDashboardTemplate, deleteDashboardTemplate,
} from '@/data/consentDashboardTemplates';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — แดชบอร์ด + Dashboard Builder (TOR ด.1.1.12 + ด.1.1.9).

   /consent/dashboard          → render แดชบอร์ดจาก template ที่เลือก (เมนู
                                 "แดชบอร์ด" เดิมชี้ /consent — ตอนนี้มีหน้าจริง)
   /consent/dashboard/builder  → โหมด builder: เลือกแม่แบบ layout (2/3/4 โซน),
                                 เพิ่ม widget จาก palette (stat / donut / bars /
                                 table) ผูก dataset consent จริง, จัดลำดับด้วย
                                 ปุ่มเลื่อนขึ้น/ลง, บันทึกเป็น template +
                                 ตั้งค่าเริ่มต้น, จัดการ template (แก้ไข/ลบ)

   Store เป็น module-level mock (session เดียว ไม่ persist). ทุกค่า visual
   alias design.md tokens; copy ไทย. */

const PIE_PALETTE = ['#14B8A6', '#EC4899', '#6366F1', '#F59E0B'];

const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const MUTED_XS = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };

/* ── Dataset จริงที่ widget ใช้ render — ทุก widget branch ตาม
   widget.dataset (summary / records / reports) เปลี่ยน dataset = เปลี่ยนผล ── */
const datasetOptionsFor = (type) => {
  const allowed = WIDGET_TYPE_DATASETS[type] || WIDGET_DATASETS.map((d) => d.key);
  return WIDGET_DATASETS.filter((d) => allowed.includes(d.key));
};
const defaultDatasetFor = (type) => (WIDGET_TYPE_DATASETS[type] || ['records'])[0];
/* dataset ที่ save ไว้แต่ type นั้นผูกไม่ได้ → ตกกลับค่าเริ่มต้นของ type */
const effectiveDataset = (widget) =>
  ((WIDGET_TYPE_DATASETS[widget.type] || []).includes(widget.dataset)
    ? widget.dataset
    : defaultDatasetFor(widget.type));

const parseStatNum = (v) => Number(String(v).replace(/[^0-9.]/g, '')) || 0;

const donutSegments = () => {
  const buckets = [
    { label: 'ยินยอมแล้ว', match: ['ยินยอมแล้ว'] },
    { label: 'รอลงนาม', match: ['รอลงนาม', 'อยู่ระหว่างลงนาม', 'มีเวอร์ชันใหม่'] },
    { label: 'ปฏิเสธ / ถอน', match: ['ปฏิเสธ', 'ถอนความยินยอม', 'ยกเลิกคำขอ'] },
    { label: 'หมดอายุ / ใกล้หมด', match: ['หมดอายุ', 'ใกล้หมดอายุ', 'หมดอายุ-Reconsent'] },
  ];
  return buckets.map((b, i) => ({
    label: b.label,
    color: PIE_PALETTE[i % PIE_PALETTE.length],
    value: CONSENT_RECORDS.filter((r) => b.match.includes(r.status)).length,
  })).filter((s) => s.value > 0);
};

/* donut ผูก dataset 'reports' → สัดส่วนจาก stat ตัวเลขของรายงาน 16.1 */
const reportDonutSegments = () => (CONSENT_REPORTS[0].stats || [])
  .filter((s) => !String(s.value).includes('%'))
  .map((s, i) => ({ label: s.label, color: PIE_PALETTE[i % PIE_PALETTE.length], value: parseStatNum(s.value) }))
  .filter((s) => s.value > 0);

const BAR_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.'];
const barSeries = () => (CONSENT_REPORTS[0].bars || []).map((b, i) => ({
  name: b.name,
  color: PIE_PALETTE[i % PIE_PALETTE.length],
  values: BAR_MONTHS.map((_, k) => b.base[k % b.base.length]),
}));

/* bars ผูก dataset 'records' → นับ record จริงต่อเดือนจาก createdDate */
const THAI_MONTH_FULL = { 'ม.ค.': 'มกราคม', 'ก.พ.': 'กุมภาพันธ์', 'มี.ค.': 'มีนาคม', 'เม.ย.': 'เมษายน', 'พ.ค.': 'พฤษภาคม' };
const recordBarSeries = () => [{
  name: 'Consent ที่สร้าง (จาก record จริง)',
  color: PIE_PALETTE[0],
  values: BAR_MONTHS.map((m) => CONSENT_RECORDS.filter((r) => (r.createdDate || '').includes(THAI_MONTH_FULL[m])).length),
}];

const RECENT_COLUMNS = [
  { key: 'hn', header: 'HN', width: 100, render: (r) => <span style={BODY_TEXT}>{r.hn}</span> },
  { key: 'name', header: 'ชื่อ-นามสกุล', width: 180, render: (r) => <span className='truncate' style={{ ...BODY_TEXT, color: 'var(--text-content-default)' }}>{r.name}</span> },
  { key: 'type', header: 'ประเภท', width: 120, render: (r) => <ColorfulBadge style={CONSENT_TYPE_TONE[r.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.type}</ColorfulBadge> },
  { key: 'status', header: 'สถานะ', width: 140, render: (r) => <ColorfulBadge style={(CONSENT_STATUS[r.status] || {}).tone || 'grey'} size='small' hierarchy='secondary' width='hug'>{r.status}</ColorfulBadge> },
  { key: 'createdDate', header: 'วันที่สร้าง', width: 150, render: (r) => <span style={MUTED_XS}>{r.createdDate}</span> },
];

/* stat widget → หยิบ SummaryCard ที่ label ใกล้เคียงชื่อ widget ที่สุด */
const statCardFor = (title) =>
  CONSENT_SUMMARY.find((c) => title && title.includes(c.label)) || CONSENT_SUMMARY[0];

/* stat widget ผูก dataset 'reports' → สร้าง card จาก stat รายงาน 16.1 */
const REPORT_STAT_TILES = {
  positive: { tileBg: 'var(--surface-statussummarycard-positive, #D1F6EE)', iconInk: 'var(--text-statussummarycard-positive-number, #196C65)' },
  danger:   { tileBg: 'var(--surface-danger-tertiary, #FEE2E2)',            iconInk: 'var(--text-danger-default, #B91C1C)' },
  info:     { tileBg: 'var(--surface-statussummarycard-info, #DBEAFE)',     iconInk: 'var(--text-statussummarycard-info-number, #1D4ED8)' },
};
const reportStatCardFor = (title) => {
  const stats = CONSENT_REPORTS[0].stats || [];
  const s = stats.find((x) => title && title.includes(x.label)) || stats[0];
  return {
    icon: s.icon, value: s.value, label: `${s.label} (รายงาน 16.1)`,
    indicatorIcon: null,
    ...(REPORT_STAT_TILES[s.tone] || REPORT_STAT_TILES.info),
  };
};

/* ── Widget renderer (ใช้ทั้งหน้า view และ preview ใน builder) —
   branch ตาม widget.dataset จริง เปลี่ยน dataset ใน builder = ผลเปลี่ยน ── */
function WidgetBody({ widget, compact = false }) {
  const dataset = effectiveDataset(widget);
  if (widget.type === 'stat') {
    return <SummaryCard card={dataset === 'reports' ? reportStatCardFor(widget.title) : statCardFor(widget.title)} variant='panel' />;
  }
  if (widget.type === 'donut') {
    const segments = dataset === 'reports' ? reportDonutSegments() : donutSegments();
    const total = segments.reduce((a, s) => a + s.value, 0);
    return (
      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
        <Donut segments={segments} size={compact ? 110 : 150} thickness={compact ? 16 : 22} centerLabel={total.toLocaleString('th-TH')} centerSub='รายการ' />
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          {segments.map((s) => (
            <div key={s.label} className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 'var(--dim-radius-full)', background: s.color, flexShrink: 0 }} />
              <span style={MUTED_XS}>{s.label}</span>
              <span style={{ ...MUTED_XS, color: s.color }}>{s.value.toLocaleString('th-TH')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (widget.type === 'bars') {
    return <VBars months={BAR_MONTHS} series={dataset === 'records' ? recordBarSeries() : barSeries()} height={compact ? 120 : 180} />;
  }
  /* table — dataset 'reports' ใช้ตารางรายงาน 16.1, 'records' ใช้ worklist */
  if (dataset === 'reports') {
    const report = CONSENT_REPORTS[0];
    return <Table columns={report.table.columns} rows={report.table.rows.slice(0, compact ? 3 : 5)} rowKey={(r) => `${r.hn}-${r.date}`} />;
  }
  /* CONSENT_RECORDS เรียงใหม่สุด → เก่าสุด: head ของ array คือรายการล่าสุด */
  const rows = CONSENT_RECORDS.slice(0, compact ? 3 : 5);
  return <Table columns={RECENT_COLUMNS} rows={rows} rowKey={(r) => r.id} />;
}

const widgetMeta = (type) => WIDGET_TYPES.find((w) => w.key === type) || WIDGET_TYPES[0];

/* ══ หน้า view — render จาก template ═══════════════════════════════════ */
function DashboardView() {
  const history = useHistory();
  const [templates] = useState(() => listDashboardTemplates());
  const [templateId, setTemplateId] = useState(() => getDefaultDashboardTemplateId());
  const template = templates.find((t) => t.id === templateId) || getDefaultDashboardTemplate();
  const layout = DASHBOARD_LAYOUTS.find((l) => l.key === template.layout) || DASHBOARD_LAYOUTS[1];

  return (
    <QueuePageShell
      activeKey='consent-dashboard'
      sidebarItems={CONSENT_NAV}
      sidebarFallbackKey='consent-dashboard'
      brandTitle='ระบบจัดการความยินยอม'
      breadcrumb={['แดชบอร์ด']}
      title='แดชบอร์ด'
      actions={(
        <div className='flex items-center flex-wrap justify-end' style={{ gap: 'var(--dim-space-300)' }}>
          <div style={{ minWidth: 260 }}>
            <Select
              showLabel={false}
              options={templates.map((t) => ({ value: t.id, label: t.id === getDefaultDashboardTemplateId() ? `${t.name} (ค่าเริ่มต้น)` : t.name }))}
              value={template.id}
              onChange={setTemplateId}
              searchable={false}
            />
          </div>
          <BrandButton variant='fill' size='md' leadingIcon='dashboard_customize' onClick={() => history.push('/consent/dashboard/builder')}>
            Dashboard Builder
          </BrandButton>
        </div>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        <span style={MUTED_XS}>
          Template: {template.name} · แม่แบบ {layout.title} · อัปเดตล่าสุด {template.updatedAt} โดย {template.updatedBy}
        </span>
        {template.widgets.length === 0 ? (
          <section className='flex flex-col items-center justify-center' style={{ ...CARD_STYLE, minHeight: 220, gap: 'var(--dim-space-300)' }}>
            <Icon name='dashboard_customize' size={32} color='var(--text-content-tertiary)' />
            <span style={BODY_TEXT}>Template นี้ยังไม่มี widget — เปิด Dashboard Builder เพื่อเพิ่ม widget</span>
          </section>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
              gap: 'var(--dim-space-400)',
            }}
          >
            {template.widgets.map((w) => (
              <section key={w.id} className='flex flex-col min-w-0' style={{ ...CARD_STYLE, gap: 'var(--dim-space-300)', gridColumn: w.type === 'table' || w.type === 'bars' ? `span ${Math.min(2, layout.columns)}` : 'auto' }}>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <Icon name={widgetMeta(w.type).icon} size={18} color='var(--text-brandPrimary-default)' />
                  <h2 style={TITLE_TEXT}>{w.title}</h2>
                </div>
                <WidgetBody widget={w} />
              </section>
            ))}
          </div>
        )}
      </div>
    </QueuePageShell>
  );
}

/* ══ โหมด builder ══════════════════════════════════════════════════════ */
let BUILDER_SEQ = 100;

function DashboardBuilder() {
  const history = useHistory();
  const [templates, setTemplates] = useState(() => listDashboardTemplates());
  const [editingId, setEditingId] = useState(null);     // template ที่กำลังแก้ (null = ใหม่)
  const [name, setName] = useState('');
  const [layout, setLayout] = useState('three');
  const [widgets, setWidgets] = useState([]);
  const [makeDefault, setMakeDefault] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [deleteFor, setDeleteFor] = useState(null);
  const [toast, setToast] = useState(null);

  const pushToast = (message) => setToast({ id: Date.now(), variant: 'success', message });
  const refresh = () => setTemplates(listDashboardTemplates());

  const addWidget = (type) => {
    const meta = widgetMeta(type);
    BUILDER_SEQ += 1;
    setWidgets((prev) => [...prev, { id: `bw-${BUILDER_SEQ}`, type, title: meta.label, dataset: defaultDatasetFor(type) }]);
    setDirty(true);
  };
  const patchWidget = (id, patch) => { setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w))); setDirty(true); };
  const removeWidget = (id) => { setWidgets((prev) => prev.filter((w) => w.id !== id)); setDirty(true); };
  /* จัดลำดับด้วยปุ่มเลื่อนขึ้น/ลง (ไม่ใช้ drag — ตาม spec) */
  const moveWidget = (idx, dir) => {
    setWidgets((prev) => {
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [m] = next.splice(idx, 1);
      next.splice(to, 0, m);
      return next;
    });
    setDirty(true);
  };

  const loadTemplate = (t) => {
    if (t.locked) {
      /* template มาตรฐานแก้ไม่ได้ — ใช้เป็นจุดตั้งต้น (สำเนา) */
      setEditingId(null);
      setName(`${t.name} (สำเนา)`);
    } else {
      setEditingId(t.id);
      setName(t.name);
    }
    setLayout(t.layout);
    setWidgets(t.widgets.map((w) => ({ ...w })));
    setMakeDefault(getDefaultDashboardTemplateId() === t.id);
    setDirty(false);
  };

  const canSave = name.trim().length > 0 && widgets.length > 0;

  const save = (asDraft = false) => {
    if (!canSave) return;
    const id = saveDashboardTemplate({ id: editingId || undefined, name: name.trim(), layout, widgets, updatedBy: 'ลดา ดีงาม' });
    if (makeDefault) setDefaultDashboardTemplate(id);
    refresh();
    setEditingId(id);
    setDirty(false);
    pushToast(asDraft
      ? `บันทึกร่าง template "${name.trim()}" แล้ว (mock — session เดียว)`
      : `บันทึก template "${name.trim()}" แล้ว${makeDefault ? ' และตั้งเป็นค่าเริ่มต้น' : ''}`);
    if (!asDraft) history.push('/consent/dashboard');
  };

  const runDelete = () => {
    const t = deleteFor;
    setDeleteFor(null);
    if (!t) return;
    const wasDefault = getDefaultDashboardTemplateId() === t.id;
    deleteDashboardTemplate(t.id);
    refresh();
    if (editingId === t.id) { setEditingId(null); setName(''); setWidgets([]); setDirty(false); }
    pushToast(wasDefault
      ? `ลบ "${t.name}" แล้ว — ค่าเริ่มต้นสลับกลับเป็นแดชบอร์ดมาตรฐาน`
      : `ลบ template "${t.name}" แล้ว`);
  };

  const layoutMeta = DASHBOARD_LAYOUTS.find((l) => l.key === layout) || DASHBOARD_LAYOUTS[1];
  const defaultId = getDefaultDashboardTemplateId();

  return (
    <>
      <QueuePageShell
        activeKey='consent-dashboard'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-dashboard'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={['แดชบอร์ด', 'Dashboard Builder']}
        title='Dashboard Builder'
        onBack={() => (dirty ? setConfirmCancel(true) : history.push('/consent/dashboard'))}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            /* longhand — inline shorthand + var() renders as 0 (project bug note) */
            paddingTop: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-1200, 48px)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {/* ── 1. ข้อมูล template + แม่แบบ layout ── */}
          <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
            <h2 style={TITLE_TEXT}>1. ตั้งชื่อและเลือกแม่แบบ Layout</h2>
            <InputField
              label='ชื่อ Template'
              required
              value={name}
              onChange={(v) => { setName(v); setDirty(true); }}
              placeholder='เช่น แดชบอร์ดติดตาม Re-Consent รายเดือน'
              helperText={!name.trim() ? 'ต้องตั้งชื่อก่อนบันทึก' : undefined}
            />
            <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              {DASHBOARD_LAYOUTS.map((l) => {
                const selected = layout === l.key;
                return (
                  <button
                    key={l.key}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => { setLayout(l.key); setDirty(true); }}
                    className='flex flex-col items-start text-left'
                    style={{
                      flex: '1 1 180px',
                      gap: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-400)', paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-400)', paddingLeft: 'var(--dim-space-400)',
                      borderRadius: 'var(--dim-radius-400)',
                      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-card-default)'}`,
                      boxShadow: selected ? 'inset 0 0 0 var(--dim-stroke-100) var(--border-brandPrimary-default, #007549)' : 'none',
                      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'border-color 120ms ease, background-color 120ms ease',
                    }}
                  >
                    {/* mini zone preview */}
                    <span aria-hidden className='flex w-full' style={{ gap: 'var(--dim-space-100)' }}>
                      {Array.from({ length: l.columns }).map((_, i) => (
                        <span key={i} style={{ flex: 1, height: 28, borderRadius: 'var(--dim-radius-100)', background: selected ? 'var(--surface-brandPrimary-secondary, #C5EDDA)' : 'var(--surface-neutral-tertiary, #F4F5F5)' }} />
                      ))}
                    </span>
                    <span style={{ ...BODY_TEXT, color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{l.title}</span>
                    <span style={MUTED_XS}>{l.subtitle}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── 2. Widget palette + canvas ── */}
          <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <h2 style={{ ...TITLE_TEXT, flex: 1 }}>2. เพิ่ม Widget (ผูก dataset consent)</h2>
              {WIDGET_TYPES.map((w) => (
                <NeutralSubdueButton key={w.key} size='sm' leadingIcon={w.icon} onClick={() => addWidget(w.key)}>
                  {w.label}
                </NeutralSubdueButton>
              ))}
            </div>

            {widgets.length === 0 ? (
              /* Empty canvas — บันทึก disabled + แนะนำเพิ่ม widget */
              <div
                className='flex flex-col items-center justify-center w-full'
                style={{
                  minHeight: 180,
                  gap: 'var(--dim-space-200)',
                  border: 'var(--dim-stroke-150) dashed var(--border-formbuilder-default, #C5EDDA)',
                  background: 'var(--surface-formbuilder-default, #F4FBF8)',
                  borderRadius: 'var(--dim-radius-400)',
                  color: 'var(--text-formbuilder-subtext, #858C92)',
                }}
              >
                <Icon name='dashboard_customize' size={28} />
                <span style={BODY_TEXT}>ยังไม่มี widget — กดปุ่มด้านบนเพื่อเพิ่ม widget ลง canvas (ต้องมีอย่างน้อย 1 ชิ้นจึงบันทึกได้)</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${layoutMeta.columns}, minmax(0, 1fr))`,
                  gap: 'var(--dim-space-400)',
                }}
              >
                {widgets.map((w, idx) => (
                  <div
                    key={w.id}
                    className='flex flex-col min-w-0'
                    style={{
                      gap: 'var(--dim-space-300)',
                      paddingTop: 'var(--dim-space-400)', paddingRight: 'var(--dim-space-400)',
                      paddingBottom: 'var(--dim-space-400)', paddingLeft: 'var(--dim-space-400)',
                      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                      borderRadius: 'var(--dim-radius-400)',
                      background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                      gridColumn: w.type === 'table' || w.type === 'bars' ? `span ${Math.min(2, layoutMeta.columns)}` : 'auto',
                    }}
                  >
                    <div className='flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
                      <Icon name={widgetMeta(w.type).icon} size={16} color='var(--text-brandPrimary-default)' />
                      <span style={{ ...MUTED_XS, flex: 1 }}>{widgetMeta(w.type).label} · ลำดับ {idx + 1}</span>
                      <NeutralSubdueIconButton icon='arrow_upward' variant='outline' size='sm' aria-label='เลื่อนขึ้น' title='เลื่อนขึ้น' disabled={idx === 0} onClick={() => moveWidget(idx, -1)} />
                      <NeutralSubdueIconButton icon='arrow_downward' variant='outline' size='sm' aria-label='เลื่อนลง' title='เลื่อนลง' disabled={idx === widgets.length - 1} onClick={() => moveWidget(idx, 1)} />
                      <NeutralSubdueIconButton icon='close' variant='outline' size='sm' aria-label='ลบ widget' title='ลบ widget' onClick={() => removeWidget(w.id)} />
                    </div>
                    <InputField
                      label='ชื่อ widget'
                      value={w.title}
                      onChange={(v) => patchWidget(w.id, { title: v })}
                      placeholder='ตั้งชื่อ widget'
                    />
                    <Select
                      label='Dataset'
                      options={datasetOptionsFor(w.type)}
                      value={effectiveDataset(w)}
                      onChange={(v) => patchWidget(w.id, { dataset: v })}
                      searchable={false}
                    />
                    {/* live preview จาก dataset จริง */}
                    <WidgetBody widget={w} compact />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── 3. Template ที่บันทึกไว้ ── */}
          <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
            <h2 style={TITLE_TEXT}>3. Template ที่บันทึกไว้</h2>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              {templates.map((t) => (
                <div
                  key={t.id}
                  className='flex items-center flex-wrap w-full'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                    paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                    border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                    borderRadius: 'var(--dim-radius-300)',
                    background: editingId === t.id ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
                  }}
                >
                  <div className='flex flex-col min-w-0' style={{ flex: 1, gap: 'var(--dim-space-050)' }}>
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{t.name}</span>
                      {t.locked && <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>มาตรฐาน</ColorfulBadge>}
                      {defaultId === t.id && <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>ค่าเริ่มต้น</ColorfulBadge>}
                    </div>
                    <span style={MUTED_XS}>
                      {(DASHBOARD_LAYOUTS.find((l) => l.key === t.layout) || {}).title || t.layout} · {t.widgets.length} widget · อัปเดต {t.updatedAt} โดย {t.updatedBy}
                    </span>
                  </div>
                  <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-150)' }}>
                    <NeutralSubdueButton
                      size='sm'
                      disabled={defaultId === t.id}
                      onClick={() => { setDefaultDashboardTemplate(t.id); refresh(); pushToast(`ตั้ง "${t.name}" เป็นค่าเริ่มต้นแล้ว`); }}
                    >
                      ตั้งเป็นค่าเริ่มต้น
                    </NeutralSubdueButton>
                    <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={() => loadTemplate(t)}>
                      {t.locked ? 'ใช้เป็นต้นแบบ' : 'แก้ไข'}
                    </NeutralSubdueButton>
                    <NeutralSubdueIconButton
                      icon='delete'
                      variant='outline'
                      size='sm'
                      aria-label='ลบ template'
                      title={t.locked ? 'template มาตรฐานลบไม่ได้' : 'ลบ template'}
                      disabled={t.locked}
                      onClick={() => setDeleteFor(t)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sticky footer — pattern wizard เดิม: ยกเลิก | บันทึกร่าง | บันทึก */}
        <div
          className='sticky bottom-0 z-10 flex items-center w-full'
          style={{
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            /* upward footer lift — canonical token (ScheduleFooter, mobile sheets) */
            boxShadow: 'var(--shadow-brand-drop-top-100, 0 -1px 4px rgba(8,167,104,0.08))',
            paddingTop: 'var(--dim-space-400)', paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-400)', paddingLeft: 'var(--dim-space-600)',
            gap: 'var(--dim-space-600)',
          }}
        >
          <Checkbox
            checked={makeDefault}
            onChange={(v) => { setMakeDefault(!!v); setDirty(true); }}
            label='ตั้งเป็นแดชบอร์ดเริ่มต้นของเมนู "แดชบอร์ด"'
          />
          <div className='flex-1' />
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-300)' }}>
            <NeutralButton variant='outline' size='lg' onClick={() => (dirty ? setConfirmCancel(true) : history.push('/consent/dashboard'))}>ยกเลิก</NeutralButton>
            <BrandSubdueButton variant='outline' size='lg' leadingIcon='save' disabled={!canSave} onClick={() => save(true)}>บันทึกร่าง</BrandSubdueButton>
            <BrandButton variant='fill' size='lg' leadingIcon='check' disabled={!canSave} onClick={() => save(false)}>บันทึก Template</BrandButton>
          </div>
        </div>
      </QueuePageShell>

      {/* ยกเลิกกลางทางขณะมีแก้ค้าง */}
      <AlertDialog
        open={confirmCancel}
        type='warning'
        title='ละทิ้งการแก้ไข?'
        description='Widget และการตั้งค่าที่ยังไม่บันทึกจะหายไป'
        confirmLabel='ละทิ้ง'
        cancelLabel='แก้ไขต่อ'
        onConfirm={() => { setConfirmCancel(false); history.push('/consent/dashboard'); }}
        onCancel={() => setConfirmCancel(false)}
        onClose={() => setConfirmCancel(false)}
      />

      {/* ลบ template (+ edge: ลบตัวที่เป็นค่าเริ่มต้น → สลับกลับมาตรฐาน) */}
      <AlertDialog
        open={!!deleteFor}
        type='destructive'
        title='ลบ Template?'
        description={deleteFor
          ? `ต้องการลบ "${deleteFor.name}" หรือไม่${getDefaultDashboardTemplateId() === deleteFor.id ? ' — template นี้เป็นค่าเริ่มต้น ระบบจะสลับกลับไปใช้แดชบอร์ดมาตรฐาน' : ''}`
          : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={runDelete}
        onCancel={() => setDeleteFor(null)}
        onClose={() => setDeleteFor(null)}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

export default function ConsentDashboardPage() {
  const location = useLocation();
  const isBuilder = location.pathname.replace(/\/+$/, '').endsWith('/builder');
  return isBuilder ? <DashboardBuilder /> : <DashboardView />;
}
