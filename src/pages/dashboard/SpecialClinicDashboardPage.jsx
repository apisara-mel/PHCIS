import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Dropdown from '@/components/forms/Dropdown';
import FilterDateTag from '@/components/forms/FilterDateTag';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Checkbox from '@/components/checkbox/Checkbox';
import Icon from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import SuccessToast from '@/components/toast/SuccessToast';
import { screenValue } from '@/components/dashboard/DashboardTemplateSwitcher';
import { DashboardHeaderActions, DashboardHeaderFilters } from '@/components/dashboard/DashboardPageHeader';
import { FilterDropdown } from '@/components/forms/FilterTag';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { DonutWithLegend, Gauge, HBarList, VBars } from '@/components/graph/Charts';
import PHCIS_CHART, { PHCIS_CHART_PALETTE } from '@/data/phcisChartPalette';
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { PHCIS_CURRENT_USER } from '@/data/phcisCurrentUser';
import {
  CARD,
  FISCAL_YEAR_OPTIONS,
  ChartPanel,
  ChartsRow,
  DASHBOARD_EXPORT_FOOTER,
  EmptyChartNote,
  ReportGroupCard,
  ReportViewPopup,
  StatTile,
  StatTileRow,
  buildExportReport,
  fiscalYearDateFilter,
  fiscalYearOf,
  hbarRows,
} from '@/pages/dashboard/dashboardReportKit';
import { safePct } from '@/data/dashboardCommon';
import {
  CLINIC_OUTCOMES,
  CLINIC_TABS,
  CLINIC_WIDGETS,
  CONFIDENTIAL_ROLES,
  RESTRICTED_MOCK_ROLE,
  clinicDetailRows,
  clinicTab,
} from '@/data/dashboardClinicOutcomes';

/* TOR §1.20.7 — Dashboard ผลการดูแลผู้รับบริการคลินิกพิเศษ (7.1–7.11)

   ทุกข้อของ §1.20.7 ระบุ "ตามที่ผู้ใช้งานกำหนดได้" — จึงมีป๊อปอัป “กำหนดหน้าจอ”
   ที่เปิด/ปิดและจัดลำดับวิดเจ็ตของแต่ละคลินิกได้ แล้วจำค่าไว้ต่อผู้ใช้ (localStorage)
   ยกเลิก = คืนค่าที่บันทึกไว้ล่าสุด · รีเซ็ต = กลับค่าเริ่มต้น

   คลินิกที่เป็นข้อมูลลับตาม §1.4.2 (HIV · PEP/PrEP · สุขภาพจิต · สารเสพติด · วัณโรค)
   แสดงเฉพาะตัวเลขรวม ไม่มีชื่อ/HN บนหน้าจอหรือในตาราง ดูรายงาน และการเปิดดูถูกบันทึก
   ลงประวัติการเข้าถึงข้อมูลลับ (ผู้เปิด + เวลา) */

const breadcrumb = ['แดชบอร์ด', 'Dashboard คลินิกพิเศษ'];

const STORAGE_KEY = 'mih:dashboard-clinic-widgets';

const ANC_PATH = '/dashboard';

/** อ่าน config ที่บันทึกไว้ — พังเมื่อไหร่ก็ตกกลับเป็น layout เริ่มต้นเสมอ */
const readStoredConfig = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch (err) {
    return {};
  }
};

const writeStoredConfig = (config) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    /* storage เต็ม/ปิดใช้งาน — หน้าจอยังทำงานต่อได้ด้วย config ใน state */
  }
};

const defaultConfigFor = (clinicKey) =>
  (CLINIC_WIDGETS[clinicKey] || []).map((w) => ({ key: w.key, visible: true }));

/** merge ค่าที่บันทึกกับรายการวิดเจ็ตปัจจุบัน (กันกรณีมีวิดเจ็ตใหม่/ถูกลบ) */
const resolveConfig = (clinicKey, stored) => {
  const widgets = CLINIC_WIDGETS[clinicKey] || [];
  const saved = Array.isArray(stored?.[clinicKey]) ? stored[clinicKey] : null;
  if (!saved) return defaultConfigFor(clinicKey);
  const known = new Map(widgets.map((w) => [w.key, w]));
  const ordered = saved
    .filter((s) => s && known.has(s.key))
    .map((s) => ({ key: s.key, visible: s.visible !== false }));
  const missing = widgets
    .filter((w) => !ordered.some((o) => o.key === w.key))
    .map((w) => ({ key: w.key, visible: true }));
  const merged = [...ordered, ...missing];
  return merged.length ? merged : defaultConfigFor(clinicKey);
};

const widgetLabel = (clinicKey, widgetKey) =>
  (CLINIC_WIDGETS[clinicKey] || []).find((w) => w.key === widgetKey)?.label || widgetKey;

const DETAIL_COLUMNS = [
  { key: 'section', label: 'หมวด', flex: true, minWidth: 160 },
  { key: 'label', label: 'รายการ', flex: true, minWidth: 260 },
  {
    key: 'value', label: 'ค่า', align: 'right',
    render: (r) => Number(r.value || 0).toLocaleString('th-TH'),
    csv: (r) => r.value,
  },
  { key: 'extra', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => r.extra || '—', csv: (r) => r.extra || '' },
];

const toneFor = (kpi) => (kpi.tone === 'success' ? undefined : kpi.tone);

/* ── per-widget renderers ────────────────────────────────────────────────── */

const donutFromList = (list, centerLabel, centerSub) => (
  <DonutWithLegend
    segments={(list || []).map((r, i) => ({
      label: r.label,
      value: r.value,
      color: PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length],
    }))}
    size={180}
    centerLabel={centerLabel}
    centerSub={centerSub}
  />
);

const trendPanel = (data, title) => (
  <ChartPanel title={title}>
    {data?.trend?.months?.length ? (
      <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
        <VBars
          months={data.trend.months}
          series={[{ label: data.trendLabel || 'จำนวน', color: PHCIS_CHART.indigo, values: data.trend.values }]}
          height={200}
          barMaxWidth={14}
        />
      </div>
    ) : <EmptyChartNote text='ยังไม่มีข้อมูลแนวโน้ม' hint='ข้อมูลจะปรากฏเมื่อมีการบันทึกบริการ' />}
  </ChartPanel>
);

const ClinicWidget = ({ clinicKey, widgetKey, data }) => {
  const label = widgetLabel(clinicKey, widgetKey);

  if (widgetKey === 'kpi') {
    return (
      <StatTileRow>
        {(data.kpi || []).map((k) => (
          <StatTile
            key={k.key}
            label={k.label}
            value={typeof k.value === 'number' ? k.value.toLocaleString('th-TH') : k.value}
            unit={k.unit}
            tone={toneFor(k)}
          />
        ))}
      </StatTileRow>
    );
  }

  if (widgetKey === 'trend') return <ChartsRow>{trendPanel(data, label)}</ChartsRow>;

  if (clinicKey === 'ncd' && widgetKey === 'control') {
    return (
      <ChartsRow>
        {(data.control || []).map((c, i) => (
          <ChartPanel key={c.key} title={c.label}>
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Gauge
                value={c.value}
                color={i === 0 ? PHCIS_CHART.teal : PHCIS_CHART.indigo}
                label={`ของเป้าหมาย ${c.target}%`}
              />
              <span
                style={{
                  color: c.value >= c.target ? 'var(--text-brandPrimary-default, #007549)' : 'var(--text-warning-default, #C2410C)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                {c.value >= c.target ? 'บรรลุเป้าหมาย' : `ต่ำกว่าเป้าหมาย ${Math.round((c.target - c.value) * 10) / 10}%`}
              </span>
            </div>
          </ChartPanel>
        ))}
      </ChartsRow>
    );
  }

  if (clinicKey === 'ncd' && widgetKey === 'group') {
    const total = (data.diseaseGroups || []).reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {data.diseaseGroups?.length
            ? donutFromList(data.diseaseGroups, total.toLocaleString('th-TH'), 'ราย')
            : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (clinicKey === 'ncd' && widgetKey === 'complication') {
    return (
      <ChartsRow>
        <ChartPanel title={label} alignContent='start'>
          {data.complications?.length ? (
            <div className='w-full'>
              <HBarList valueLabel='ราย' rows={hbarRows(data.complications, PHCIS_CHART.pink, 'ราย')} />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'screening') {
    /* วัณโรคใช้ `screeningFunnel` ซึ่งแต่ละขั้นเป็น "เซตย่อย" ของขั้นก่อนหน้า
       (เป้าหมาย → คัดกรอง → ผิดปกติ → CXR → ยืนยัน) ไม่ใช่ส่วนของทั้งหมด
       จึงห้ามวาดโดนัท — การรวมทุกขั้นได้ 2,470 และร้อยละที่ออกมาไม่มีความหมาย
       แสดงเป็นแถบลดหลั่นพร้อมอัตราผ่านจากขั้นก่อนหน้าแทน
       ส่วน `screening` (2Q ปกติ / 9Q mild / mod / severe / 8Q) เป็นกลุ่มที่
       ไม่ทับซ้อนกันจริง จึงยังใช้โดนัทได้ */
    if (data.screeningFunnel?.length) {
      const funnel = data.screeningFunnel;
      return (
        <ChartsRow>
          <ChartPanel title={`${label} (ลำดับขั้นการคัดกรอง)`} alignContent='start'>
            <div className='w-full'>
              <HBarList
                valueLabel='ราย'
                rows={funnel.map((stage, i) => {
                  const prev = i === 0 ? null : funnel[i - 1].value;
                  return {
                    /* HBarList ไม่มีช่องคำอธิบายแยก จึงต่ออัตราผ่านไว้ในป้ายชื่อ */
                    label: prev
                      ? `${stage.label} · ${safePct(stage.value, prev)}% ของขั้นก่อนหน้า`
                      : stage.label,
                    value: stage.value,
                    segments: [{
                      value: stage.value,
                      color: i === funnel.length - 1 ? PHCIS_CHART.pink : PHCIS_CHART.teal,
                      label: stage.label,
                    }],
                  };
                })}
              />
            </div>
          </ChartPanel>
        </ChartsRow>
      );
    }

    const list = data.screening || [];
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, total.toLocaleString('th-TH'), 'ราย') : <EmptyChartNote />}
        </ChartPanel>
        <ChartPanel title={`${label} (เรียงลำดับ)`} alignContent='start'>
          {list.length ? (
            <div className='w-full'>
              <HBarList valueLabel='ราย' rows={hbarRows(list, PHCIS_CHART.teal, 'ราย')} />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'outcome' || widgetKey === 'improve' || widgetKey === 'status') {
    const list = data.outcome || data.improvement || data.status || [];
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, total.toLocaleString('th-TH'), 'ราย') : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'cascade') {
    const list = data.cascade || [];
    return (
      <ChartsRow>
        <ChartPanel title={label} alignContent='start'>
          {list.length ? (
            <div className='w-full'>
              <HBarList valueLabel='ราย' rows={hbarRows(list, PHCIS_CHART.teal, 'ราย')} />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'viral') {
    const list = data.viral || [];
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, total.toLocaleString('th-TH'), 'ราย') : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'starts') {
    const t = data.startsTrend;
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {t?.months?.length ? (
            <div className='w-full' style={{ paddingTop: 'var(--dim-space-200)' }}>
              <VBars
                months={t.months}
                series={[
                  { label: 'เริ่ม PEP', color: PHCIS_CHART.pink, values: t.pep },
                  { label: 'เริ่ม PrEP', color: PHCIS_CHART.teal, values: t.prep },
                ]}
                height={200}
                barMaxWidth={14}
              />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'retain') {
    const list = data.retention || [];
    return (
      <ChartsRow>
        {list.map((r, i) => (
          <ChartPanel key={r.key} title={r.label}>
            <Gauge value={r.value} color={PHCIS_CHART_PALETTE[i % PHCIS_CHART_PALETTE.length]} label='อัตราคงอยู่' />
          </ChartPanel>
        ))}
      </ChartsRow>
    );
  }

  if (widgetKey === 'program') {
    const list = data.programs || [];
    return (
      <ChartsRow>
        <ChartPanel title={label} alignContent='start'>
          {list.length ? (
            <div className='w-full'>
              <HBarList
                valueLabel='ราย'
                rows={list.map((p) => ({
                  label: p.label,
                  value: p.value,
                  segments: [
                    { value: p.completed, color: PHCIS_CHART.teal, label: 'ครบโปรแกรม' },
                    { value: Math.max(0, p.value - p.completed), color: PHCIS_CHART.yellow, label: 'ยังไม่ครบ' },
                  ],
                }))}
              />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'substance' || widgetKey === 'cause' || widgetKey === 'group') {
    const list = data.substances || data.causes || data.groups || data.diseaseGroups || [];
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, total.toLocaleString('th-TH'), 'ราย') : <EmptyChartNote />}
        </ChartPanel>
        <ChartPanel title={`${label} (เรียงลำดับ)`} alignContent='start'>
          {list.length ? (
            <div className='w-full'>
              <HBarList valueLabel='ราย' rows={hbarRows(list, PHCIS_CHART.indigo, 'ราย')} />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'coverage') {
    const list = data.coverage || [];
    return (
      <ChartsRow>
        <ChartPanel title={label} alignContent='start'>
          {list.length ? (
            <div className='w-full'>
              <HBarList
                valueLabel='%'
                maxVisibleRows={6.5}
                rows={list.map((c) => ({
                  label: c.label,
                  value: c.value,
                  segments: [{
                    value: c.value,
                    color: c.value >= 90 ? PHCIS_CHART.teal : c.value >= 80 ? PHCIS_CHART.yellow : PHCIS_CHART.pink,
                    label: 'ความครอบคลุม',
                  }],
                }))}
              />
            </div>
          ) : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'ontime') {
    const list = data.ontime || [];
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, `${safePct(list[0]?.value || 0, total)}%`, 'ตรงกำหนด') : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  if (widgetKey === 'type' || widgetKey === 'budget') {
    const list = data.assistanceTypes || [];
    if (widgetKey === 'budget') {
      return (
        <ChartsRow>
          <ChartPanel title={label} alignContent='start'>
            {list.length ? (
              <div className='w-full'>
                <HBarList
                  valueLabel='บาท'
                  rows={hbarRows(list.map((r) => ({ label: r.label, value: r.baht })), PHCIS_CHART.yellow, 'บาท')}
                />
              </div>
            ) : <EmptyChartNote />}
          </ChartPanel>
        </ChartsRow>
      );
    }
    const total = list.reduce((s, r) => s + r.value, 0);
    return (
      <ChartsRow>
        <ChartPanel title={label}>
          {list.length ? donutFromList(list, total.toLocaleString('th-TH'), 'เคส') : <EmptyChartNote />}
        </ChartPanel>
      </ChartsRow>
    );
  }

  return null;
};

/* ── สิทธิ์ไม่พอ (§1.4.2 + playbook §5) ──────────────────────────────────
   รูปแบบเดียวกับ AccessDenied ของ ExecutiveDashboardPage เพื่อให้ทั้งระบบ
   สื่อสารสถานะ “ไม่มีสิทธิ์” แบบเดียวกัน */
const AccessDenied = ({ clinicLabel, role }) => (
  <div
    className='w-full flex flex-col items-center text-center'
    style={{
      ...CARD,
      gap: 'var(--dim-space-300)',
      paddingTop: 'var(--dim-space-800, 32px)',
      paddingBottom: 'var(--dim-space-800, 32px)',
    }}
  >
    <span style={{ color: 'var(--text-warning-default, #C2410C)' }}>
      <Icon name='lock_person' size={40} />
    </span>
    <span
      style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-lg, 18px)',
      }}
    >
      ไม่มีสิทธิ์เข้าถึงข้อมูลคลินิก{clinicLabel}
    </span>
    <span
      style={{
        color: 'var(--text-content-secondary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.6,
        maxWidth: 'var(--dim-size-2600, 384px)',
      }}
    >
      คลินิกนี้เป็นข้อมูลลับตามข้อกำหนด §1.4.2 เปิดให้เฉพาะสิทธิ์ {CONFIDENTIAL_ROLES.join(' · ')}
      สิทธิ์ปัจจุบันของคุณคือ “{role}” ระบบจึงไม่ประมวลผล ไม่แสดง และไม่ให้ส่งออกข้อมูลของคลินิกนี้
      หากต้องการเข้าถึง กรุณาขอสิทธิ์ผ่านผู้ดูแลระบบของสำนักอนามัย
    </span>
    <span
      style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
      }}
    >
      การพยายามเข้าถึงครั้งนี้ถูกบันทึกไว้ในประวัติการเข้าถึงข้อมูลลับแล้ว
    </span>
  </div>
);

/* ── customization popup ─────────────────────────────────────────────────── */

const CustomizePopup = ({ open, clinicKey, config, onCancel, onSave, onReset }) => {
  const [draft, setDraft] = useState(config);

  useEffect(() => { if (open) setDraft(config); }, [open, config, clinicKey]);

  const move = (index, delta) => {
    setDraft((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const visibleCount = draft.filter((d) => d.visible).length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(config);

  return (
    <Popup
      open={open}
      onClose={onCancel}
      size='large'
      title='กำหนดหน้าจอ Dashboard'
      subtitle={`เลือกวิดเจ็ตที่ต้องการแสดงและจัดลำดับสำหรับ “${clinicTab(clinicKey).label}” (TOR §1.20.7 “ตามที่ผู้ใช้งานกำหนดได้”)`}
      primaryAction={{ label: 'บันทึกการตั้งค่า', onClick: () => onSave(draft), disabled: visibleCount === 0 }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onCancel }}
      tertiaryAction={{ label: 'คืนค่าเริ่มต้น', onClick: onReset }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {visibleCount === 0 ? (
          <span
            style={{
              color: 'var(--text-danger-default, #B91C1C)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}
          >
            ต้องเลือกอย่างน้อย 1 วิดเจ็ตจึงจะบันทึกได้
          </span>
        ) : null}
        {draft.map((item, i) => (
          <div
            key={item.key}
            className='flex items-center justify-between w-full'
            style={{
              gap: 'var(--dim-space-300)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              paddingTop: 'var(--dim-space-200)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              paddingRight: 'var(--dim-space-300)',
            }}
          >
            <Checkbox
              checked={item.visible}
              onChange={(next) => setDraft((prev) => prev.map((d) => (d.key === item.key ? { ...d, visible: next } : d)))}
              label={widgetLabel(clinicKey, item.key)}
              description={`ลำดับที่ ${i + 1}`}
            />
            <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-150)' }}>
              <NeutralSubdueIconButton
                icon='arrow_upward'
                variant='outline'
                size='sm'
                aria-label={`เลื่อน ${widgetLabel(clinicKey, item.key)} ขึ้น`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              />
              <NeutralSubdueIconButton
                icon='arrow_downward'
                variant='outline'
                size='sm'
                aria-label={`เลื่อน ${widgetLabel(clinicKey, item.key)} ลง`}
                disabled={i === draft.length - 1}
                onClick={() => move(i, 1)}
              />
            </div>
          </div>
        ))}
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
          }}
        >
          {dirty ? 'มีการเปลี่ยนแปลงที่ยังไม่บันทึก — กด “ยกเลิก” เพื่อคืนค่าที่บันทึกไว้ล่าสุด' : 'ยังไม่มีการเปลี่ยนแปลง'}
        </span>
      </div>
    </Popup>
  );
};

/* ── page ────────────────────────────────────────────────────────────────── */

const SpecialClinicDashboardPage = () => {
  const [activeClinic, setActiveClinic] = useState('ncd');
  const [pageDate, setPageDate] = useState({ quick: 'thisyear' });
  const [storedConfig, setStoredConfig] = useState(() => readStoredConfig());
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [viewBundle, setViewBundle] = useState(null);
  const [exportReport, setExportReport] = useState(null);
  const [exported, setExported] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [accessLog, setAccessLog] = useState([]);
  const [accessLogOpen, setAccessLogOpen] = useState(false);

  /* Mock role switch — โปรโตไทป์ยังไม่มีระบบสิทธิ์จริง จึงสลับดูได้ทั้งสองสถานะ
     ค่าเริ่มต้นยึดตามสิทธิ์ของผู้ใช้ที่ล็อกอินอยู่ */
  const [asAuthorized, setAsAuthorized] = useState(true);
  const currentRole = asAuthorized ? PHCIS_CURRENT_USER.groupPolicy : RESTRICTED_MOCK_ROLE;
  const confidentialAllowed = CONFIDENTIAL_ROLES.includes(currentRole);

  const tab = clinicTab(activeClinic);
  /* §1.4.2 — สิทธิ์ไม่พอ = ไม่ประมวลผลข้อมูลใด ๆ ของคลินิกนั้นเลย */
  const blocked = tab.confidential && !confidentialAllowed;
  const data = blocked ? null : CLINIC_OUTCOMES[activeClinic];
  const config = useMemo(
    () => resolveConfig(activeClinic, storedConfig),
    [activeClinic, storedConfig],
  );

  /* แคตตาล็อกรายงานตัดคลินิกข้อมูลลับออกทั้งชุดเมื่อสิทธิ์ไม่พอ
     (ป๊อปอัปส่งออกเลือกหัวข้ออื่นข้ามมาไม่ได้) */
  const reportsCatalog = useMemo(() => CLINIC_TABS
    .filter((c) => c.key !== 'anc')
    .filter((c) => !c.confidential || confidentialAllowed)
    .map((c) => buildExportReport(
      `clinic-${c.key}`,
      `รายงานผลการดูแลผู้รับบริการ ${c.label}`,
      DETAIL_COLUMNS,
      clinicDetailRows(c.key),
    )), [confidentialAllowed]);

  const exportTopics = useMemo(
    () => reportsCatalog.map((r) => ({ value: r.key, label: r.title })),
    [reportsCatalog],
  );

  const clinicOptions = useMemo(
    () => CLINIC_TABS.map((c) => ({ value: c.key, label: c.label, leadingIcon: c.icon })),
    [],
  );

  /* บันทึกการเปิดดู (และการถูกปฏิเสธ) ข้อมูลคลินิกข้อมูลลับ (§1.4.2 audit trail) */
  const logConfidentialView = (clinicKey, denied) => {
    const c = clinicTab(clinicKey);
    if (!c.confidential) return;
    const now = new Date();
    const stamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setAccessLog((prev) => [
      {
        id: `${clinicKey}-${now.getTime()}`,
        clinic: c.label,
        actor: PHCIS_CURRENT_USER.displayName,
        role: currentRole,
        at: stamp,
        denied,
        scope: denied
          ? 'ถูกปฏิเสธการเข้าถึง (สิทธิ์ไม่พอ)'
          : 'ข้อมูลสรุปเชิงสถิติ (ไม่ระบุตัวบุคคล)',
      },
      ...prev,
    ].slice(0, 50));
  };

  useEffect(() => {
    logConfidentialView(activeClinic, blocked);
  }, [activeClinic, blocked]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveConfig = (draft) => {
    const next = { ...storedConfig, [activeClinic]: draft };
    setStoredConfig(next);
    writeStoredConfig(next);
    setCustomizeOpen(false);
    setSavedToast(true);
  };

  const resetConfig = () => {
    const next = { ...storedConfig };
    delete next[activeClinic];
    setStoredConfig(next);
    writeStoredConfig(next);
    setCustomizeOpen(false);
    setSavedToast(true);
  };

  const visibleWidgets = config.filter((c) => c.visible);

  const summaryCards = useMemo(() => {
    if (!data?.kpi) return undefined;
    return data.kpi.slice(0, 4).map((k, i) => ({
      key: k.key,
      label: k.label,
      value: typeof k.value === 'number' ? k.value.toLocaleString('th-TH') : k.value,
      indicator: `${tab.label}${k.unit ? ` · ${k.unit}` : ''}`,
      color: k.tone === 'warning' ? 'destructive' : i === 0 ? 'brand' : i === 1 ? 'info' : 'positive',
      icon: tab.icon,
    }));
  }, [data, tab]);

  /* ANC (7.7) เสร็จแล้วบนหน้าแดชบอร์ดภาพรวม — แท็บนี้ลิงก์ไปที่เดิม ไม่สร้างซ้ำ */
  const isAnc = activeClinic === 'anc';

  const roleSwitch = (
    <NeutralSubdueButton
      size='md'
      leadingIcon={asAuthorized ? 'admin_panel_settings' : 'person'}
      onClick={() => setAsAuthorized((v) => !v)}
    >
      {`สิทธิ์: ${currentRole}`}
    </NeutralSubdueButton>
  );

  return (
    <QueuePageShell
      activeKey='dashboard'
      breadcrumb={breadcrumb}
      title='Dashboard คลินิกพิเศษ'
      actions={<DashboardHeaderActions>{roleSwitch}</DashboardHeaderActions>}
      /* เลือกคลินิกด้วย dropdown แทนแถบ pill (มติผู้ใช้ 27 ส.ค. 69) — คลินิกพิเศษ
         มี 12 รายการ แถว pill จึงล้นจอและต้องเลื่อนแนวนอนหาอันที่ต้องการ */
      afterTitle={(
        <DashboardHeaderFilters
          dateFilter={pageDate}
          onDateFilterChange={setPageDate}
          defaultQuick='thisyear'
          templateValue={screenValue('clinics')}
        >
          <FilterDropdown
            prefix='คลินิก:'
            leadingIcon={clinicOptions.find((o) => o.value === activeClinic)?.leadingIcon}
            options={clinicOptions}
            value={activeClinic}
            onChange={setActiveClinic}
          />
        </DashboardHeaderFilters>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600)',
          paddingRight: 'var(--dim-space-600)',
          paddingBottom: 'var(--dim-space-600)',
          paddingLeft: 'var(--dim-space-600)',
          gap: 'var(--dim-space-600)',
        }}
      >
        {/* การ์ดสรุปอยู่ใต้แถบ Tab (มติผู้ใช้ 27 ส.ค. 69) — `summaryCards` ของ
            QueuePageShell ถูกวางเหนือ tab เสมอ จึง render เองตรงนี้แทน */}
        <section className='w-full flex items-stretch flex-wrap' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          {summaryCards.map((card) => (
            <SummaryCard key={card.key} card={card} variant='panel' />
          ))}
        </section>

        {tab.confidential && !blocked ? (
          <section
            className='w-full flex items-center justify-between flex-wrap'
            style={{
              background: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
              border: 'var(--dim-stroke-100) solid var(--surface-colorfulbadge-yellow-bold, #EAB308)',
              borderRadius: 'var(--dim-radius-400, 12px)',
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
            }}
          >
            <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
              <span style={{ color: 'var(--text-colorfulbadge-yellow, #A16207)' }}>
                <Icon name='lock' size={20} />
              </span>
              <div className='flex flex-col min-w-0'>
                <span
                  style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-sm)',
                  }}
                >
                  คลินิกข้อมูลลับตามข้อกำหนด §1.4.2 — แสดงเฉพาะข้อมูลสรุปเชิงสถิติ
                </span>
                <span
                  style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs)',
                  }}
                >
                  ไม่แสดงชื่อ-นามสกุล เลขบัตรประชาชน หรือ HN ทั้งบนหน้าจอและในรายงานที่ส่งออก ·
                  การเปิดดูถูกบันทึกโดย {PHCIS_CURRENT_USER.displayName}
                </span>
              </div>
            </div>
            <NeutralSubdueButton size='sm' leadingIcon='history' onClick={() => setAccessLogOpen(true)}>
              ประวัติการเข้าถึง ({accessLog.length})
            </NeutralSubdueButton>
          </section>
        ) : null}

        {blocked ? (
          <div className='flex flex-col w-full items-center' style={{ gap: 'var(--dim-space-400)' }}>
            <AccessDenied clinicLabel={tab.label} role={currentRole} />
            <NeutralSubdueButton size='sm' leadingIcon='history' onClick={() => setAccessLogOpen(true)}>
              ประวัติการเข้าถึง ({accessLog.length})
            </NeutralSubdueButton>
          </div>
        ) : (
          <>
        <ReportGroupCard
          title={`ผลการดูแลผู้รับบริการ · ${tab.label}`}
          subtitle={`TOR ${tab.torId}${tab.confidential ? ' · ข้อมูลสรุปเชิงสถิติเท่านั้น' : ''}`}
          onView={isAnc ? undefined : () => setViewBundle({
            key: activeClinic,
            title: `ผลการดูแลผู้รับบริการ ${tab.label}`,
            reports: [reportsCatalog.find((r) => r.key === `clinic-${activeClinic}`)].filter(Boolean),
          })}
          onExport={isAnc ? undefined : () => setExportReport(
            reportsCatalog.find((r) => r.key === `clinic-${activeClinic}`) || null,
          )}
          extraActions={(
            <>
              {!isAnc ? (
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon='tune'
                  collapseLabelBelow='lg'
                  onClick={() => setCustomizeOpen(true)}
                >
                  กำหนดหน้าจอ
                </NeutralSubdueButton>
              ) : null}
              <Link to={isAnc ? ANC_PATH : tab.queuePath}>
                <NeutralSubdueButton size='sm' trailingIcon='chevron_right' collapseLabelBelow='lg'>
                  ดูทั้งหมด
                </NeutralSubdueButton>
              </Link>
            </>
          )}
        >
          {isAnc ? (
            <div className='flex flex-col w-full items-start' style={{ gap: 'var(--dim-space-300)' }}>
              <ColorfulBadge style='green' size='small' hierarchy='secondary'>
                TOR 1.20.7.7 — พร้อมใช้งานแล้วบนแดชบอร์ดภาพรวม
              </ColorfulBadge>
              <span
                style={{
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  lineHeight: 1.6,
                }}
              >
                Dashboard ผลการฝากครรภ์ (ANC) แสดงอยู่บนหน้า “แดชบอร์ดภาพรวมโรงพยาบาล” แล้ว
                หน้าจอนี้จึงลิงก์ไปที่การ์ดเดิมแทนการสร้างซ้ำ เพื่อให้ตัวเลขมาจากแหล่งเดียวกัน
              </span>
              <Link to={ANC_PATH}>
                <NeutralSubdueButton size='sm' trailingIcon='arrow_forward'>
                  ไปที่การ์ดผลการฝากครรภ์
                </NeutralSubdueButton>
              </Link>
            </div>
          ) : !data ? (
            <EmptyChartNote
              text='ยังไม่มีชุดข้อมูลของคลินิกนี้'
              hint='เลือกคลินิกอื่นจากแถบด้านบน'
              icon='inbox'
            />
          ) : visibleWidgets.length === 0 ? (
            <EmptyChartNote
              text='ยังไม่ได้เลือกวิดเจ็ตสำหรับคลินิกนี้'
              hint='กด “กำหนดหน้าจอ” เพื่อเลือกวิดเจ็ตที่ต้องการแสดง'
              icon='tune'
            />
          ) : (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
              {visibleWidgets.map((w) => (
                <ClinicWidget key={w.key} clinicKey={activeClinic} widgetKey={w.key} data={data} />
              ))}
            </div>
          )}
        </ReportGroupCard>

        {!isAnc ? (
          <section className='w-full flex flex-col' style={{ ...CARD, gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
                lineHeight: 1.6,
              }}
            >
              การตั้งค่าหน้าจอถูกบันทึกไว้ในเครื่องของผู้ใช้แต่ละคน (แยกตามคลินิก) —
              แสดง {visibleWidgets.length} จาก {config.length} วิดเจ็ต
              {tab.confidential ? ' · ข้อมูลคลินิกนี้เป็นข้อมูลลับ จึงสรุปเป็นตัวเลขรวมเท่านั้น' : ''}
            </span>
          </section>
        ) : null}
          </>
        )}
      </div>

      <CustomizePopup
        open={customizeOpen}
        clinicKey={activeClinic}
        config={config}
        onCancel={() => setCustomizeOpen(false)}
        onSave={saveConfig}
        onReset={resetConfig}
      />

      <Popup
        open={accessLogOpen}
        onClose={() => setAccessLogOpen(false)}
        size='large'
        title='ประวัติการเข้าถึงข้อมูลคลินิกข้อมูลลับ'
        subtitle='บันทึกผู้เปิดดูและเวลา ตามข้อกำหนดข้อมูลลับ §1.4.2'
        primaryAction={{ label: 'ปิด', onClick: () => setAccessLogOpen(false) }}
      >
        <Table
          columns={[
            { key: 'at', label: 'เวลา' },
            { key: 'clinic', label: 'คลินิก', flex: true, minWidth: 180 },
            { key: 'actor', label: 'ผู้เข้าถึง', flex: true, minWidth: 200 },
            { key: 'role', label: 'สิทธิ์' },
            {
              key: 'scope',
              label: 'ขอบเขตข้อมูล',
              flex: true,
              minWidth: 240,
              render: (r) => <Badge style={r.denied ? 'error' : 'info'} size='small'>{r.scope}</Badge>,
              csv: (r) => r.scope,
            },
          ]}
          rows={accessLog}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีการเข้าถึงในเซสชันนี้'
          emptySubtext='ระบบจะบันทึกทุกครั้งที่เปิดดูคลินิกข้อมูลลับ'
          pagination={false}
        />
      </Popup>

      <ReportViewPopup
        open={!!viewBundle}
        bundle={viewBundle}
        onClose={() => setViewBundle(null)}
        onExportReport={(report) => { if (report) setExportReport(report); }}
        footnote={tab.confidential
          ? 'ตารางนี้เป็นข้อมูลสรุปเชิงสถิติเท่านั้น ไม่มีข้อมูลระบุตัวบุคคล ตามข้อกำหนดข้อมูลลับ §1.4.2'
          : null}
      />

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        reportsCatalog={reportsCatalog}
        topics={exportTopics}
        onClose={() => setExportReport(null)}
        onExported={() => setExported(true)}
        documentFooter={DASHBOARD_EXPORT_FOOTER}
        logExportFn={null}
        topicsFieldName='dashboard-clinic-export-topics'
      />

      <SuccessToast open={exported} message='นำส่งออกรายงานคลินิกพิเศษแล้ว' onClose={() => setExported(false)} />
      <SuccessToast open={savedToast} message='บันทึกการตั้งค่าหน้าจอแล้ว' onClose={() => setSavedToast(false)} />
    </QueuePageShell>
  );
};

export default SpecialClinicDashboardPage;
