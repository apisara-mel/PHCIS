import React, { useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import StepProgress from '@/components/step/StepProgress';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuccessToast from '@/components/toast/SuccessToast';
import { CONSENT_RECORDS, buildConsentSummaryFromRows } from '@/data/consentRecords';
import {
  DASHBOARD_LAYOUTS,
  WIDGET_TYPES,
  WIDGET_DATASETS,
  WIDGET_TYPE_DATASETS,
  WIDGET_DEFAULT_SPAN,
  saveDashboardTemplate,
} from '@/data/consentDashboardTemplates';
import {
  ConsentDashboardWidget,
  buildConsentWidgetContext,
} from '@/data/consentDashboardWidgets';

/* PHCIS | Consent — ป๊อปอัปสร้างเทมเพลตแดชบอร์ด (TOR ด.1.1.12)
   เปิดจากปุ่ม "สร้าง / จัดการเทมเพลต" บนหน้าแดชบอร์ด — ไม่ต้องออกจากหน้า
   ทำได้ 3 อย่างในป๊อปอัปเดียว:
     1) ตั้งชื่อเทมเพลต
     2) เลือกข้อมูลที่จะแสดง (widget ผูก dataset consent จริง)
     3) ระบุตำแหน่ง — ลำดับบนหน้าจอ + ความกว้าง (กี่โซน) ตามเค้าโครงที่เลือก
   ตัวอย่างในป๊อปอัปเรนเดอร์ด้วย widget ตัวเดียวกับที่แดชบอร์ดใช้จริง
   (consentDashboardWidgets) — สิ่งที่เห็นตอนจัดวางคือสิ่งที่ได้ */

const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
  margin: 0,
};
const SUB_TEXT = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};
const BODY_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};
const ZONE_STYLE = {
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-card-default)',
  borderRadius: 'var(--dim-radius-400)',
  padding: 'var(--dim-space-400)',
  boxSizing: 'border-box',
  minWidth: 0,
};

/* Hover / active / focus ของการ์ด "เลือกข้อมูลที่จะแสดง" — inject ครั้งเดียว
   ต่อโมดูล (pattern เดียวกับ AISearch) เพื่อให้ HMR ไม่ทิ้ง <style> ค้าง */
const PALETTE_STYLE_ID = 'mih-widget-palette-style';
const PALETTE_CSS = `
.mih-widget-palette-card {
  transition: background-color 160ms ease-out, border-color 160ms ease-out, box-shadow 160ms ease-out;
}
.mih-widget-palette-card:hover {
  background: var(--surface-brandPrimary-quaternary) !important;
  border-color: var(--border-brandPrimary-tertiary) !important;
  box-shadow: var(--shadow-card) !important;
}
.mih-widget-palette-card:active {
  background: var(--surface-brandPrimary-tertiary) !important;
}
.mih-widget-palette-card:focus-visible {
  outline: var(--dim-stroke-400, 4px) solid var(--border-brandPrimary-tertiary);
  outline-offset: 2px;
}
/* ระยะระหว่างวงกลมเลขขั้นกับป้ายชื่อขั้น = 4px — override เฉพาะ stepper ของ
   ป๊อปอัปนี้ (StepProgress compact ตั้ง gap 0 เป็นค่ากลางของ DS จึงไม่แก้ที่นั่น) */
.mih-template-stepper [data-step-progress] > * {
  gap: var(--dim-space-100, 4px) !important;
}
`;
if (typeof document !== 'undefined') {
  const prevPaletteStyle = document.getElementById(PALETTE_STYLE_ID);
  if (prevPaletteStyle) prevPaletteStyle.remove();
  const paletteStyleTag = document.createElement('style');
  paletteStyleTag.id = PALETTE_STYLE_ID;
  paletteStyleTag.textContent = PALETTE_CSS;
  document.head.appendChild(paletteStyleTag);
}

/* ภาพย่อของเค้าโครง — แถวบน = การ์ดเต็มความกว้าง (แถบ KPI)
   แถวล่าง = จำนวนโซนต่อแถวของเค้าโครงนั้น ให้เห็นว่าเลือกแล้วหน้าตาแบบไหน */
const LayoutPreview = ({ columns, selected }) => {
  const fill = selected ? 'var(--surface-brandPrimary-tertiary)' : 'var(--surface-brandPrimary-quaternary)';
  const stroke = selected ? 'var(--border-brandPrimary-tertiary)' : 'var(--border-brandPrimary-quaternary)';
  const block = {
    background: fill,
    border: `var(--dim-stroke-100) solid ${stroke}`,
    borderRadius: 'var(--dim-radius-100, 4px)',
  };
  return (
    <span aria-hidden className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)' }}>
      <span style={{ ...block, height: 10, width: '100%' }} />
      <span className='flex w-full' style={{ gap: 'var(--dim-space-100)' }}>
        {Array.from({ length: columns }, (_, i) => (
          <span key={i} style={{ ...block, height: 26, flex: '1 1 0', minWidth: 0 }} />
        ))}
      </span>
    </span>
  );
};

/* helper เดิมเป็น module-level ผูกกับ catalog ของความยินยอมตรง ๆ — ย้ายมารับ
   catalog เป็นอาร์กิวเมนต์ เพื่อให้แดชบอร์ดจัดการระบบใช้ป๊อปอัปตัวเดียวกันได้
   (26 ส.ค. 2569 มติผู้ใช้ — "นำปุ่ม template ไปใส่ในแดชบอร์ดจัดการระบบด้วย") */
const columnsOf = (layouts, key) => (layouts.find((l) => l.key === key) || layouts[1] || layouts[0]).columns;
const metaOf = (types, type) => types.find((w) => w.key === type) || {};
const labelOfDataset = (datasets, key) => (datasets.find((d) => d.key === key) || {}).label || key;

let WIDGET_SEQ = 100;
const newWidgetId = () => `w${++WIDGET_SEQ}`;

/* 3 ขั้นของการสร้างเทมเพลต — ชื่อ → จัดตำแหน่ง → ตรวจแล้วบันทึก */
const STEPS = [
  { title: 'ตั้งชื่อเทมเพลต',   subtitle: 'ชื่อ + เค้าโครงหน้าจอ' },
  { title: 'ระบุตำแหน่ง',      subtitle: 'เลือกการ์ดและจัดวาง' },
  { title: 'ตรวจสอบและบันทึก', subtitle: 'ดูตัวอย่างหน้าจอรวม' },
];

const emptyDraft = () => ({ id: null, name: '', layout: 'three', widgets: [] });

export default function ConsentDashboardTemplatePopup({
  open,
  onClose,
  onSaved,
  /* catalog + ตัวเรนเดอร์ตัวอย่าง — ไม่ส่งมา = ใช้ของระบบความยินยอมเหมือนเดิม */
  layouts = DASHBOARD_LAYOUTS,
  widgetTypes = WIDGET_TYPES,
  datasets = WIDGET_DATASETS,
  typeDatasets = WIDGET_TYPE_DATASETS,
  defaultSpan = WIDGET_DEFAULT_SPAN,
  onSaveTemplate = saveDashboardTemplate,
  fallbackDataset = 'records',
  renderPreview,
}) {
  const layoutColumns = (key) => columnsOf(layouts, key);
  const widgetMeta = (type) => metaOf(widgetTypes, type);
  const datasetLabel = (key) => labelOfDataset(datasets, key);
  const bodyRef = useRef(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [nameError, setNameError] = useState('');
  const [toast, setToast] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [step, setStep] = useState(0);

  const columns = layoutColumns(draft.layout);

  /* ข้อมูลจริงของ widget — ทั้งหน้า preview ใช้ชุดเดียวกับแดชบอร์ด */
  const ctx = useMemo(() => buildConsentWidgetContext({
    records: CONSENT_RECORDS,
    summary: buildConsentSummaryFromRows(CONSENT_RECORDS, {
      allTimeTotal: CONSENT_RECORDS.length,
      periodLabel: 'ทั้งหมด',
    }),
  }), []);

  const addWidget = (type) => {
    const meta = widgetMeta(type);
    const allowed = typeDatasets[type] || [fallbackDataset];
    setDraft((d) => ({
      ...d,
      widgets: [...d.widgets, {
        id: newWidgetId(),
        type,
        title: meta.label || 'ข้อมูล',
        dataset: allowed[0],
        span: Math.min(defaultSpan[type] || 1, layoutColumns(d.layout)),
      }],
    }));
  };

  const updateWidget = (id, patch) => setDraft((d) => ({
    ...d,
    widgets: d.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
  }));

  /* เปลี่ยนชนิดการ์ด — ต้องรีเซ็ต dataset เป็นชุดแรกที่ชนิดใหม่รองรับ
     ไม่งั้นจะค้าง dataset ที่ชนิดใหม่เรนเดอร์ไม่ได้ (เช่น bars + access) */
  const changeWidgetType = (id, type) => {
    const allowed = typeDatasets[type] || [fallbackDataset];
    setDraft((d) => ({
      ...d,
      widgets: d.widgets.map((w) => (w.id === id ? {
        ...w,
        type,
        dataset: allowed.includes(w.dataset) ? w.dataset : allowed[0],
        title: w.title === widgetMeta(w.type).label ? widgetMeta(type).label : w.title,
        span: Math.min(w.span || 1, layoutColumns(d.layout)),
      } : w)),
    }));
  };

  const removeWidget = (id) => setDraft((d) => ({ ...d, widgets: d.widgets.filter((w) => w.id !== id) }));

  const moveWidget = (id, dir) => setDraft((d) => {
    const idx = d.widgets.findIndex((w) => w.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= d.widgets.length) return d;
    const widgets = [...d.widgets];
    [widgets[idx], widgets[next]] = [widgets[next], widgets[idx]];
    return { ...d, widgets };
  });

  const changeLayout = (key) => setDraft((d) => ({
    ...d,
    layout: key,
    /* ความกว้างเกินจำนวนโซนใหม่ → หดลงให้พอดี ไม่ให้ตำแหน่งที่ตั้งไว้เพี้ยน */
    widgets: d.widgets.map((w) => ({ ...w, span: Math.min(w.span || 1, layoutColumns(key)) })),
  }));

  const saveDraft = () => {
    if (!draft.name.trim()) {
      setNameError('ตั้งชื่อเทมเพลตก่อนบันทึก');
      return;
    }
    if (!draft.widgets.length) {
      setToast('เลือกข้อมูลที่จะแสดงอย่างน้อย 1 รายการก่อนบันทึก');
      return;
    }
    const isEdit = Boolean(draft.id);
    const savedName = draft.name.trim();
    onSaveTemplate({ ...draft, name: savedName });
    setDraft(emptyDraft());
    setStep(0);
    /* บันทึกแล้วปิดป๊อปอัปทันที แล้วให้หน้าแดชบอร์ดขึ้นจอ success ต่อ */
    if (onSaved) onSaved({ name: savedName, isEdit });
    if (onClose) onClose();
  };

  const canSave = Boolean(draft.name.trim()) && draft.widgets.length > 0;
  /* ไปขั้นถัดไปได้เมื่อขั้นปัจจุบันครบเงื่อนไข — กันบันทึกเทมเพลตเปล่า */
  const canGoNext = step === 0 ? Boolean(draft.name.trim()) : draft.widgets.length > 0;
  const maxReachableStep = !draft.name.trim() ? 0 : (draft.widgets.length ? 2 : 1);


  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        size='extraLarge'
        title={draft.id ? 'แก้ไขเทมเพลตแดชบอร์ด' : 'สร้างเทมเพลตแดชบอร์ด'}
        subtitle='ตั้งชื่อ เลือกข้อมูลที่จะแสดง และระบุตำแหน่งบนหน้าจอรวมของแดชบอร์ด'
        primaryAction={step < STEPS.length - 1
          ? {
            label: `ถัดไป: ${STEPS[step + 1].title}`,
            onClick: () => setStep(step + 1),
            disabled: !canGoNext,
          }
          : {
            label: draft.id ? 'บันทึกการแก้ไข' : 'บันทึกเทมเพลต',
            onClick: saveDraft,
            disabled: !canSave,
          }}
        secondaryAction={step > 0
          ? { label: 'ย้อนกลับ', onClick: () => setStep(step - 1) }
          : { label: 'ปิด', onClick: onClose }}
      >
        <div ref={bodyRef} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
    {/* stepper ตรึงไว้บนสุดของ body ป๊อปอัป — เลื่อนอ่านเนื้อหายาว ๆ แล้วยังเห็นว่าอยู่ขั้นไหน */}
    <div
      className='mih-template-stepper flex justify-center w-full'
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: 'var(--surface-card-100)',
        paddingTop: 'var(--dim-space-200)',
        paddingBottom: 'var(--dim-space-300)',
        borderBottom: 'var(--dim-stroke-100) solid var(--border-card-default)',
      }}
    >
      <StepProgress
        steps={STEPS}
        current={step}
        completedSteps={[Boolean(draft.name.trim()), draft.widgets.length > 0, false]}
        onStepClick={(n) => setStep(Math.min(n, maxReachableStep))}
        labelNoWrap
        compact
      />
    </div>

    {step === 0 && (
      <>
      {/* 1) ชื่อเทมเพลต + เค้าโครง */}
      <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <h2 style={TITLE_TEXT}>ตั้งชื่อเทมเพลต</h2>
          <span style={SUB_TEXT}>ชื่อที่ใช้เลือกเทมเพลตนี้ในหน้าแดชบอร์ด</span>
        </div>
        <div style={{ maxWidth: 'var(--dim-size-2700, 448px)' }}>
          <InputField
            label='ชื่อเทมเพลต'
            required
            value={draft.name}
            onChange={(v) => { setDraft((d) => ({ ...d, name: v })); if (v.trim()) setNameError(''); }}
            placeholder='เช่น จอติดตามความยินยอมรายวัน'
            error={nameError || undefined}
            helperText={nameError || undefined}
            showHelperText={Boolean(nameError)}
          />
        </div>

        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ ...BODY_TEXT, fontWeight: 'var(--type-weight-medium)' }}>เค้าโครงหน้าจอ</span>
          <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            {layouts.map((l) => (
              <div key={l.key} style={{ flex: '0 0 var(--dim-size-2450, 280px)', minWidth: 0 }}>
                <SelectableCardButton
                  className='w-full'
                  selected={draft.layout === l.key}
                  onClick={() => changeLayout(l.key)}
                  ariaLabel={`เค้าโครง ${l.title}`}
                  minHeight={72}
                >
                  <span className='flex flex-col text-left w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <LayoutPreview columns={l.columns} selected={draft.layout === l.key} />
                    <span className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      <span style={{ ...BODY_TEXT, fontWeight: 'var(--type-weight-medium)' }}>{l.title}</span>
                      <span style={SUB_TEXT}>{l.subtitle}</span>
                    </span>
                  </span>
                </SelectableCardButton>
              </div>
            ))}
          </div>
        </div>
      </section>
      </>
    )}

    {step === 1 && (
      <>
      {/* 2) ระบุตำแหน่ง */}
      <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <h2 style={TITLE_TEXT}>ระบุตำแหน่งบนหน้าจอ</h2>
          <span style={SUB_TEXT}>
            {`ลำดับจากบนลงล่าง ซ้ายไปขวา · ความกว้างนับเป็นโซน (เค้าโครงนี้มี ${columns} โซนต่อแถว)`}
          </span>
        </div>

        {draft.widgets.length === 0 ? (
          <div
            className='flex flex-col items-center justify-center w-full'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-800)',
              paddingBottom: 'var(--dim-space-800)',
              border: 'var(--dim-stroke-100) dashed var(--border-card-default)',
              borderRadius: 'var(--dim-radius-400)',
            }}
          >
            <Icon name='dashboard_customize' size={28} />
            <span style={BODY_TEXT}>ยังไม่ได้เลือกข้อมูล</span>
            <span style={SUB_TEXT}>กด “เพิ่มการ์ด” เพื่อเลือกข้อมูลที่จะแสดง</span>
          </div>
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            {draft.widgets.map((w, i) => (
              <div
                key={w.id}
                className='flex items-start flex-wrap w-full'
                style={{ ...ZONE_STYLE, gap: 'var(--dim-space-300)' }}
              >
                <span
                  aria-hidden
                  className='flex items-center justify-center shrink-0'
                  style={{
                    width: 'var(--dim-size-700, 36px)',
                    height: 'var(--dim-size-700, 36px)',
                    borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    color: 'var(--text-brandPrimary-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    fontWeight: 'var(--type-weight-medium)',
                  }}
                >
                  {i + 1}
                </span>

                <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)', flex: '2 1 var(--dim-size-2500, 320px)', minWidth: 0 }}>
                  <InputField
                    label='หัวข้อที่แสดงบนการ์ด'
                    value={w.title}
                    onChange={(v) => updateWidget(w.id, { title: v })}
                    size='md'
                    showHelperText={false}
                    placeholder={widgetMeta(w.type).label}
                  />
                  <span style={SUB_TEXT}>{widgetMeta(w.type).label} · {datasetLabel(w.dataset)}</span>
                </div>

                <div style={{ flex: '1 1 var(--dim-size-2100, 160px)', minWidth: 0 }}>
                  <Select
                    label='ชนิดการ์ด'
                    options={widgetTypes.map((t) => ({ value: t.key, label: t.label }))}
                    value={w.type}
                    onChange={(v) => changeWidgetType(w.id, v)}
                    searchable={false}
                    showHelperText={false}
                  />
                </div>

                <div style={{ flex: '1 1 var(--dim-size-2100, 160px)', minWidth: 0 }}>
                  <Select
                    label='ข้อมูลที่ผูก'
                    options={(typeDatasets[w.type] || [fallbackDataset]).map((k) => ({ value: k, label: datasetLabel(k) }))}
                    value={w.dataset}
                    onChange={(v) => updateWidget(w.id, { dataset: v })}
                    searchable={false}
                    showHelperText={false}
                  />
                </div>

                <div style={{ flex: '0 1 var(--dim-size-2100, 160px)', minWidth: 0 }}>
                  <Select
                    label='ความกว้าง'
                    options={Array.from({ length: columns }, (_, n) => ({
                      value: String(n + 1),
                      label: n + 1 === columns ? `${n + 1} โซน (เต็มแถว)` : `${n + 1} โซน`,
                    }))}
                    value={String(Math.min(w.span || 1, columns))}
                    onChange={(v) => updateWidget(w.id, { span: Number(v) })}
                    searchable={false}
                    showHelperText={false}
                  />
                </div>

                <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-150)', paddingTop: 'var(--dim-space-500)' }}>
                  <NeutralSubdueIconButton
                    icon='arrow_upward'
                    size='sm'
                    aria-label='เลื่อนขึ้น'
                    disabled={i === 0}
                    onClick={() => moveWidget(w.id, -1)}
                  />
                  <NeutralSubdueIconButton
                    icon='arrow_downward'
                    size='sm'
                    aria-label='เลื่อนลง'
                    disabled={i === draft.widgets.length - 1}
                    onClick={() => moveWidget(w.id, 1)}
                  />
                  <DangerSubdueIconButton
                    icon='delete'
                    size='sm'
                    aria-label='นำออกจากหน้าจอ'
                    onClick={() => removeWidget(w.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* เพิ่มการ์ดจากในส่วนจัดตำแหน่งได้เลย ไม่ต้องเลื่อนกลับไปพาเลตข้อ 2 */}
        <BrandDashedAddButton onClick={() => setPickerOpen(true)}>
          เพิ่มการ์ด
        </BrandDashedAddButton>
      </section>
      </>
    )}

    {step === 2 && (
      <>
      {/* 3) ตัวอย่างหน้าจอรวม */}
      <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-start justify-between flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
            <h2 style={TITLE_TEXT}>ตัวอย่างหน้าจอรวม</h2>
            <span style={SUB_TEXT}>ข้อมูลจริงจากระบบความยินยอม — หน้าตาแบบนี้เมื่อใช้เทมเพลตนี้</span>
          </div>
          <ColorfulBadge style='indigo' size='small' hierarchy='secondary' width='hug'>
            {`${draft.widgets.length} การ์ด · ${columns} โซนต่อแถว`}
          </ColorfulBadge>
        </div>

        {draft.widgets.length === 0 ? (
          <span style={SUB_TEXT}>ยังไม่มีอะไรให้แสดง — กด “เพิ่มการ์ด” ก่อน</span>
        ) : (
          <div
            className='w-full'
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap: 'var(--dim-space-400)',
              background: 'var(--background-screen-brand-100, #F4FBF8)',
              borderRadius: 'var(--dim-radius-400)',
              padding: 'var(--dim-space-400)',
            }}
          >
            {draft.widgets.map((w) => (
              <div
                key={w.id}
                className='flex flex-col'
                style={{
                  ...ZONE_STYLE,
                  gap: 'var(--dim-space-300)',
                  gridColumn: `span ${Math.min(w.span || 1, columns)} / span ${Math.min(w.span || 1, columns)}`,
                }}
              >
                <span style={{ ...BODY_TEXT, fontWeight: 'var(--type-weight-medium)' }}>{w.title}</span>
                {renderPreview
                  ? renderPreview(w, (w.span || 1) < 2)
                  : <ConsentDashboardWidget widget={w} ctx={ctx} compact={(w.span || 1) < 2} />}
              </div>
            ))}
          </div>
        )}
      </section>
      </>
    )}
      </div>
      </Popup>

      <Popup
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        size='extraLarge'
        title='เลือกข้อมูลที่จะแสดง'
        subtitle='เลือกการ์ด 1 ใบเพื่อเพิ่มลงหน้าจอ — เพิ่มซ้ำได้ถ้าต้องการดูหลายชุด'
        secondaryAction={{ label: 'ปิด', onClick: () => setPickerOpen(false) }}
      >
    <div
      className='w-full'
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 'var(--dim-space-300)',
      }}
    >
      {widgetTypes.map((w) => {
        const used = draft.widgets.filter((x) => x.type === w.key).length;
        return (
          <button
            key={w.key}
            type='button'
            onClick={() => { addWidget(w.key); setPickerOpen(false); }}
            className='mih-widget-palette-card flex items-start text-left'
            style={{
              width: '100%',
              gap: 'var(--dim-space-300)',
              minWidth: 0,
              minHeight: 'var(--dim-size-900, 44px)',
              paddingTop: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-400)',
              cursor: 'pointer',
            }}
          >
            <span
              aria-hidden
              className='flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                borderRadius: 'var(--dim-radius-300)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--icon-brandPrimary-default)',
              }}
            >
              <Icon name={w.icon} size={20} />
            </span>
            <span className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              <span className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ ...BODY_TEXT, fontWeight: 'var(--type-weight-medium)' }}>{w.label}</span>
                {used > 0 && (
                  <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                    {`เลือกแล้ว ${used}`}
                  </ColorfulBadge>
                )}
              </span>
              <span style={SUB_TEXT}>{w.description}</span>
            </span>
            <span aria-hidden style={{ color: 'var(--icon-brandPrimary-default)' }}>
              <Icon name='add' size={20} />
            </span>
          </button>
        );
      })}
    </div>
      </Popup>

      <SuccessToast open={Boolean(toast)} message={toast || ''} onClose={() => setToast(null)} />
    </>
  );
}
