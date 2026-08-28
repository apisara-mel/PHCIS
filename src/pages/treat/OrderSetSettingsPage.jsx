import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  CDSS_RULE_DEFS, CDSS_SEVERITIES, CDSS_ENFORCEMENTS, getCdssSettings,
  subscribeCdssSettings, setCdssRule, setRepeatOverride,
  priceHistoryFor, recordPriceChange, ROLE_ORDER_MATRIX,
} from '@/data/treatmentOrderSets';
import {
  DRUG_REGISTRY, DRUG_CLASSIFICATIONS, subscribeRegistry, setRegistryDrugActive,
  currentPrice, upsertRegistryDrug,
} from '@/data/pharmacyRegistry';
import {
  LAB_TESTS, LAB_GROUP_LABEL, LAB_RIGHTS, resolveRightPricing, setLabTestRetired,
  subscribeCatalog as subscribeLabCatalog, repeatWindowDays as labRepeatWindow,
} from '@/data/labCatalog';
import {
  XRAY_EXAMS, XRAY_RIGHTS, XRAY_MODALITY_BY_KEY, claimFor, setXrayExamRetired,
  subscribeCatalog as subscribeXrayCatalog, repeatWindowDays as xrayRepeatWindow,
} from '@/data/xrayCatalog';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';
import DutyRosterAction from '@/components/patient/DutyRosterAction';

/* PHCIS | CPOE §1.5.9 (ตั้งค่ารายการสั่งการรักษา) + เกณฑ์การแจ้งเตือน
   CDSS ที่ §1.5.4.18–.21 บังคับให้ตั้งเองได้.

   ชุด preset กลางและสิทธิ์ผู้เข้าถึงเป็นข้อมูลระดับระบบ จัดการเฉพาะที่
   /admin/order-sets เพื่อไม่ให้สิทธิ์ของโมดูลการรักษากลายเป็นทางลัดข้าม
   system.settings. หน้านี้จึงเหลือเฉพาะทะเบียนรายการ, CDSS และ Role. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'ตั้งค่ารายการสั่งการรักษาและ CDSS'];

const TABS = [
  { key: 'drugs',  label: 'รายการยาและเวชภัณฑ์' },
  { key: 'tests',  label: 'รายการ Lab / X-ray' },
  { key: 'cdss',   label: 'เกณฑ์การแจ้งเตือน CDSS' },
  { key: 'roles',  label: 'สิทธิ์การสั่งการรักษาตาม Role' },
];

const PER_PAGE = 10;

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

const classificationLabel = (key) =>
  DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const OrderSetSettingsPage = () => {
  const history = useHistory();
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;

  const [tab, setTab] = useState('drugs');
  const [toast, setToast] = useState(null);
  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  /* ── แท็บ 1 · รายการยา ──────────────────────────────────── */
  const [drugsTick, refreshDrugs] = useTreatmentStore(subscribeRegistry, () => Date.now(), []);
  const [drugQuery, setDrugQuery] = useState('');
  const [drugPage, setDrugPage] = useState(1);
  const [priceTarget, setPriceTarget] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceReason, setPriceReason] = useState('');
  const [historyTarget, setHistoryTarget] = useState(null);

  const filteredDrugs = useMemo(() => {
    const q = drugQuery.trim().toLowerCase();
    const list = DRUG_REGISTRY.slice();
    if (!q) return list;
    return list.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [drugQuery, drugsTick]);

  useEffect(() => { setDrugPage(1); }, [drugQuery]);
  const drugsPaged = paginate(filteredDrugs, drugPage, PER_PAGE);

  const applyPriceChange = () => {
    const price = Number(newPrice);
    if (!Number.isFinite(price) || price < 0 || !priceFrom.trim()) return;
    const old = currentPrice(priceTarget);
    /* §1.5.9.3 — currentPrice() คืนแถวแรกที่ effectiveFrom <= วันนี้ <= effectiveTo
       ถ้าปิดแถวเดิมด้วยวันเดียวกับที่ราคาใหม่เริ่ม ระบบจะยังคิดราคาเก่าในวันที่มีผล
       จึงต้องปิดแถวเดิมที่ "วันก่อนหน้า" */
    const startDate = priceFrom.trim();
    const prevDay = new Date(startDate);
    prevDay.setDate(prevDay.getDate() - 1);
    const closeOn = Number.isNaN(prevDay.getTime())
      ? startDate
      : prevDay.toISOString().slice(0, 10);
    upsertRegistryDrug({
      ...priceTarget,
      priceSchedule: [
        ...priceTarget.priceSchedule.map((p) => (p.effectiveTo ? p : { ...p, effectiveTo: closeOn })),
        { id: `${priceTarget.id}-p${priceTarget.priceSchedule.length + 1}`, effectiveFrom: priceFrom.trim(), effectiveTo: null, price },
      ],
    });
    recordPriceChange({
      drugId: priceTarget.id, drugName: priceTarget.name,
      oldPrice: old, newPrice: price, effectiveFrom: priceFrom.trim(), reason: priceReason,
    });
    setPriceTarget(null); setNewPrice(''); setPriceFrom(''); setPriceReason('');
    refreshDrugs();
    showToast('success', 'บันทึกราคาใหม่พร้อมวันที่มีผลแล้ว');
  };

  /* ── แท็บ 2 · Lab / X-ray ──────────────────────────────── */
  const [labTick, refreshLab] = useTreatmentStore(subscribeLabCatalog, () => Date.now(), []);
  const [xrayTick, refreshXray] = useTreatmentStore(subscribeXrayCatalog, () => Date.now(), []);
  const [testKind, setTestKind] = useState('lab');
  const [testQuery, setTestQuery] = useState('');
  const [testPage, setTestPage] = useState(1);
  const [rightKey, setRightKey] = useState('uc');
  const [xrayRightKey, setXrayRightKey] = useState('UCS');
  const [retireTarget, setRetireTarget] = useState(null);

  const testRows = useMemo(() => {
    const q = testQuery.trim().toLowerCase();
    const list = testKind === 'lab' ? LAB_TESTS.slice() : XRAY_EXAMS.slice();
    if (!q) return list;
    return list.filter((t) => JSON.stringify([t.nameEn, t.nameTh, t.name, t.code]).toLowerCase().includes(q));
  }, [testKind, testQuery, labTick, xrayTick]);

  useEffect(() => { setTestPage(1); }, [testQuery, testKind]);
  const testsPaged = paginate(testRows, testPage, PER_PAGE);

  /* ── แท็บ 3 · CDSS ─────────────────────────────────────── */
  const [cdss, refreshCdss] = useTreatmentStore(subscribeCdssSettings, getCdssSettings, []);
  const [repeatKind, setRepeatKind] = useState('lab');
  const [repeatItem, setRepeatItem] = useState('');
  const [repeatDays, setRepeatDays] = useState('');

  const applyRepeatOverride = () => {
    if (!repeatItem) return;
    setRepeatOverride(repeatKind, repeatItem, repeatDays === '' ? null : Number(repeatDays));
    refreshCdss();
    showToast('success', repeatDays === ''
      ? 'คืนค่าหน้าต่างเวลาสั่งซ้ำเป็นค่ามาตรฐานแล้ว'
      : `ตั้งหน้าต่างเวลาสั่งซ้ำเป็น ${repeatDays} วันแล้ว`);
    setRepeatItem(''); setRepeatDays('');
  };

  if (!access.canView) {
    return (
      <QueuePageShell activeKey='treat' breadcrumb={breadcrumb} title='ตั้งค่ารายการสั่งการรักษาและ CDSS'>
        <div style={{
          paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)',
        }}>
          <AccessDeniedPanel what='การตั้งค่ารายการสั่งการรักษาและ CDSS' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      /* ทุกหน้าของเมนูบันทึกการรักษามีปุ่มนี้ (มติผู้ใช้ 28 ส.ค. 69) */
      leadingActions={<DutyRosterAction />}
      title='ตั้งค่ารายการสั่งการรักษาและ CDSS'
      onBack={() => history.push('/treat/queue')}
      backLabel='กลับไปหน้าคิว'
      tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
      activeTab={tab}
      onTabChange={setTab}
    >
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-400, 16px)',
        }}
      >
        {!canEdit ? (
          <PanelAlert tone='info' icon='visibility' title='โหมดดูอย่างเดียว'>
            {NO_EDIT_RIGHT_TOOLTIP} — อ่านค่าตั้งได้ทั้งหมด แต่ปุ่มบันทึก/แก้ไข/ปิดใช้งานถูกปิดไว้
          </PanelAlert>
        ) : null}

        {/* ══ แท็บ 1 · รายการยาและเวชภัณฑ์ ═══════════════════ */}
        {tab === 'drugs' ? (
          <PanelCard
            title='รายการยาและเวชภัณฑ์'
            subtitle='เปิด/ปิดรายการ · แก้ไขราคาแบบมีวันที่มีผล · ดูประวัติการเปลี่ยนราคา (§1.5.9.2 / §1.5.9.3)'
            action={<CountLabel n={filteredDrugs.length} unit='รายการ' />}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <PrimarySearch value={drugQuery} onChange={setDrugQuery} width={420} placeholder='ค้นหาชื่อยา หรือรหัสยา' />
              {drugQuery ? (
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => setDrugQuery('')}>
                  ล้างคำค้น
                </NeutralSubdueButton>
              ) : null}
            </div>

            {filteredDrugs.length === 0 ? (
              <PanelEmptyState
                icon='search_off'
                title={`ไม่พบรายการยาที่ตรงกับ "${drugQuery}"`}
                subtitle='ลองพิมพ์ชื่อสามัญหรือรหัสยา เช่น MED-0001'
                action={
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='backspace' onClick={() => setDrugQuery('')}>
                    ล้างคำค้น
                  </NeutralSubdueButton>
                }
              />
            ) : (
              <>
                <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                  <Table
                    rowKey={(r) => r.id}
                    rows={drugsPaged.slice}
                    columns={[
                      {
                        key: 'name', header: 'ชื่อยา', flex: 1,
                        render: (r) => (
                          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <span style={PANEL_VALUE_STYLE}>{r.name}</span>
                            <span style={PANEL_LABEL_STYLE}>รหัส {r.code} · {r.manufacturer}</span>
                          </div>
                        ),
                      },
                      {
                        key: 'classification', header: 'ประเภท',
                        render: (r) => (
                          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <ColorfulBadge style={r.classification === 'nlem' ? 'teal' : 'purple'} size='small' width='hug'>
                              {classificationLabel(r.classification)}
                            </ColorfulBadge>
                            {r.highAlert ? <StatusBadge style='error' size='small' icon='priority_high'>High Alert</StatusBadge> : null}
                          </div>
                        ),
                      },
                      {
                        key: 'unit', header: 'หน่วย',
                        render: (r) => <span style={PANEL_VALUE_STYLE}>{r.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}</span>,
                      },
                      {
                        key: 'price', header: 'ราคา/หน่วย',
                        render: (r) => (
                          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <span style={PANEL_VALUE_STYLE}>{baht(currentPrice(r))} บาท</span>
                            <span style={PANEL_LABEL_STYLE}>ปรับราคาแล้ว {r.priceSchedule.length} ครั้ง</span>
                          </div>
                        ),
                      },
                      {
                        key: 'active', header: 'สถานะ',
                        render: (r) => (
                          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <StatusBadge style={r.active ? 'success' : 'neutral'} size='small'>
                              {r.active ? 'Active' : 'Inactive'}
                            </StatusBadge>
                            <GuardedAction allowed={canEdit}>
                              <NeutralSubdueButton
                                variant='outline' size='sm'
                                leadingIcon={r.active ? 'toggle_off' : 'toggle_on'}
                                onClick={() => {
                                  setRegistryDrugActive(r.id, !r.active);
                                  refreshDrugs();
                                  showToast('success', `${r.active ? 'ปิด' : 'เปิด'}ใช้งาน ${r.name} แล้ว`);
                                }}
                              >
                                {r.active ? 'ปิด' : 'เปิด'}
                              </NeutralSubdueButton>
                            </GuardedAction>
                          </div>
                        ),
                      },
                      {
                        key: 'actions', header: '',
                        render: (r) => (
                          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <GuardedAction allowed={canEdit}>
                              <NeutralSubdueButton
                                variant='outline' size='sm' leadingIcon='payments'
                                onClick={() => { setPriceTarget(r); setNewPrice(String(currentPrice(r))); setPriceFrom(''); setPriceReason(''); }}
                              >
                                แก้ไขราคา
                              </NeutralSubdueButton>
                            </GuardedAction>
                            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='history' onClick={() => setHistoryTarget(r)}>
                              ประวัติราคา
                            </NeutralSubdueButton>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage='ไม่พบรายการยา'
                  />
                </div>
                {drugsPaged.pageCount > 1 ? (
                  <div className='flex justify-end w-full'>
                    <Pagination currentPage={drugsPaged.page} pageCount={drugsPaged.pageCount} onPageChange={setDrugPage} />
                  </div>
                ) : null}
              </>
            )}
          </PanelCard>
        ) : null}

        {/* ══ แท็บ 3 · Lab / X-ray ════════════════════════ */}
        {tab === 'tests' ? (
          <PanelCard
            title='รายการ Lab และ X-ray'
            subtitle='เปิด/ปิดรายการที่สั่งได้ และดูราคา + ยอดเบิกได้แยกตามสิทธิการรักษา (§1.5.9.3 · รองรับ §1.5.1.4/§1.5.1.5)'
            action={<CountLabel n={testRows.length} unit='รายการ' />}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div style={{ minWidth: 200 }}>
                <Select
                  value={testKind}
                  onChange={setTestKind}
                  options={[{ value: 'lab', label: 'รายการตรวจแล็บ' }, { value: 'xray', label: 'รายการตรวจรังสีวิทยา' }]}
                  placeholder='เลือกชนิด'
                  showLabel={false}
                  showHelperText={false}
                />
              </div>
              <div style={{ minWidth: 260 }}>
                {testKind === 'lab' ? (
                  <Select
                    value={rightKey}
                    onChange={setRightKey}
                    options={LAB_RIGHTS.map((r) => ({ value: r.key, label: r.label }))}
                    placeholder='สิทธิที่ใช้คำนวณราคา'
                    showLabel={false}
                    showHelperText={false}
                  />
                ) : (
                  <Select
                    value={xrayRightKey}
                    onChange={setXrayRightKey}
                    options={XRAY_RIGHTS.map((r) => ({ value: r.key, label: r.label || r.thai || r.key }))}
                    placeholder='สิทธิที่ใช้คำนวณราคา'
                    showLabel={false}
                    showHelperText={false}
                  />
                )}
              </div>
              <PrimarySearch value={testQuery} onChange={setTestQuery} width={380} placeholder='ค้นหาชื่อรายการตรวจ' />
              {testQuery ? (
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => setTestQuery('')}>
                  ล้างคำค้น
                </NeutralSubdueButton>
              ) : null}
            </div>

            {testRows.length === 0 ? (
              <PanelEmptyState
                icon='search_off'
                title={`ไม่พบรายการตรวจที่ตรงกับ "${testQuery}"`}
                subtitle='ลองพิมพ์ชื่อภาษาอังกฤษ เช่น CBC หรือชื่อไทย เช่น เอกซเรย์ทรวงอก'
                action={
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='backspace' onClick={() => setTestQuery('')}>
                    ล้างคำค้น
                  </NeutralSubdueButton>
                }
              />
            ) : (
              <>
                <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                  <Table
                    rowKey={(r) => r.id}
                    rows={testsPaged.slice}
                    columns={[
                      {
                        key: 'name', header: 'รายการตรวจ', flex: 1,
                        render: (r) => (
                          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <span style={PANEL_VALUE_STYLE}>{testKind === 'lab' ? `${r.nameEn} — ${r.nameTh}` : r.name}</span>
                            <span style={PANEL_LABEL_STYLE}>
                              รหัส {r.code} · {testKind === 'lab' ? LAB_GROUP_LABEL[r.group] : XRAY_MODALITY_BY_KEY[r.modality]?.thai}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: 'price', header: 'ราคา / ยอดเบิกได้ตามสิทธิ',
                        render: (r) => {
                          if (testKind === 'lab') {
                            const p = resolveRightPricing(r, rightKey);
                            return (
                              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                                <span style={PANEL_VALUE_STYLE}>{baht(p.price)} บาท</span>
                                {p.reimbursable
                                  ? <StatusBadge style='success' size='small' icon='verified'>เบิกได้เต็มจำนวน</StatusBadge>
                                  : <StatusBadge style='warning' size='small' icon='payments'>เบิกไม่ได้ · ผู้รับบริการชำระเอง</StatusBadge>}
                              </div>
                            );
                          }
                          const c = claimFor(r, xrayRightKey);
                          return (
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              <span style={PANEL_VALUE_STYLE}>{baht(c.price)} บาท</span>
                              <span style={PANEL_LABEL_STYLE}>เบิกได้ {baht(c.claim)} · จ่ายเอง {baht(c.patientPay)}</span>
                            </div>
                          );
                        },
                      },
                      {
                        key: 'repeat', header: 'หน้าต่างเวลาสั่งซ้ำ',
                        render: (r) => {
                          const base = testKind === 'lab' ? labRepeatWindow(r.id) : xrayRepeatWindow(r.id);
                          const override = cdss.repeatOverrides?.[testKind]?.[r.id];
                          return (
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              <span style={PANEL_VALUE_STYLE}>{override ?? base} วัน</span>
                              {override != null
                                ? <ColorfulBadge style='yellow' size='small' width='hug'>ตั้งค่าเอง (มาตรฐาน {base} วัน)</ColorfulBadge>
                                : <span style={PANEL_LABEL_STYLE}>ใช้ค่ามาตรฐาน</span>}
                            </div>
                          );
                        },
                      },
                      {
                        key: 'active', header: 'สถานะ',
                        render: (r) => (
                          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                            <StatusBadge style={r.retired ? 'neutral' : 'success'} size='small'>
                              {r.retired ? 'ปิดรายการ' : 'เปิดใช้งาน'}
                            </StatusBadge>
                            <GuardedAction allowed={canEdit}>
                              <NeutralSubdueButton
                                variant='outline' size='sm'
                                leadingIcon={r.retired ? 'toggle_on' : 'toggle_off'}
                                onClick={() => {
                                  if (!r.retired) { setRetireTarget({ ...r, kind: testKind }); return; }
                                  if (testKind === 'lab') setLabTestRetired(r.id, false);
                                  else setXrayExamRetired(r.id, false);
                                  refreshLab(); refreshXray();
                                  showToast('success', 'เปิดใช้งานรายการตรวจแล้ว');
                                }}
                              >
                                {r.retired ? 'เปิด' : 'ปิด'}
                              </NeutralSubdueButton>
                            </GuardedAction>
                          </div>
                        ),
                      },
                    ]}
                    emptyMessage='ไม่พบรายการตรวจ'
                  />
                </div>
                {testsPaged.pageCount > 1 ? (
                  <div className='flex justify-end w-full'>
                    <Pagination currentPage={testsPaged.page} pageCount={testsPaged.pageCount} onPageChange={setTestPage} />
                  </div>
                ) : null}
              </>
            )}
          </PanelCard>
        ) : null}

        {/* ══ แท็บ 3 · CDSS ═══════════════════════════════ */}
        {tab === 'cdss' ? (
          <>
            <PanelCard
              title='เกณฑ์การแจ้งเตือน CDSS'
              subtitle='TOR §1.5.4.18–.21 กำหนดทุกข้อว่า "มีระบบที่สามารถระบุเกณฑ์การแจ้งเตือนเองได้" — ค่าที่ตั้งที่นี่มีผลกับหน้าสั่งการรักษาทันที'
            >
              <PanelAlert tone='info' icon='shield' title='กฎที่ปิดไม่ได้'>
                การแจ้งเตือนแพ้ยาตรงตัวถูกล็อกให้เปิดตลอด และตั้งเป็น "บล็อก" เป็นค่าเริ่มต้น —
                เป็นความปลอดภัยขั้นพื้นฐานที่ระบบไม่ยอมให้ปิด
              </PanelAlert>
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table
                  rowKey={(r) => r.key}
                  rows={CDSS_RULE_DEFS}
                  columns={[
                    {
                      key: 'label', header: 'ชนิดการแจ้งเตือน', flex: 1,
                      render: (r) => (
                        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <span style={PANEL_VALUE_STYLE}>{r.label}</span>
                          <span style={PANEL_LABEL_STYLE}>{r.hint}</span>
                          <ColorfulBadge style='grey' size='small' width='hug'>TOR {r.tor}</ColorfulBadge>
                        </div>
                      ),
                    },
                    {
                      key: 'enabled', header: 'เปิดใช้งาน',
                      render: (r) => (
                        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <Checkbox
                            label={cdss.rules[r.key]?.enabled ? 'เปิด' : 'ปิด'}
                            checked={!!cdss.rules[r.key]?.enabled}
                            disabled={!canEdit || r.lockedOn}
                            onChange={() => { setCdssRule(r.key, { enabled: !cdss.rules[r.key]?.enabled }); refreshCdss(); }}
                          />
                          {r.lockedOn ? <span style={PANEL_LABEL_STYLE}>ปิดไม่ได้ตามนโยบายความปลอดภัย</span> : null}
                        </div>
                      ),
                    },
                    {
                      key: 'minSeverity', header: 'ระดับความรุนแรงขั้นต่ำที่แจ้ง',
                      render: (r) => (
                        <Select
                          value={cdss.rules[r.key]?.minSeverity}
                          onChange={(v) => { setCdssRule(r.key, { minSeverity: v }); refreshCdss(); }}
                          disabled={!canEdit || !cdss.rules[r.key]?.enabled}
                          options={CDSS_SEVERITIES.map((s) => ({ value: s.key, label: s.label }))}
                          placeholder='เลือกระดับ'
                          showLabel={false}
                          showHelperText={false}
                        />
                      ),
                    },
                    {
                      key: 'enforcement', header: 'รูปแบบการบังคับ',
                      render: (r) => (
                        <Select
                          value={cdss.rules[r.key]?.enforcement}
                          onChange={(v) => { setCdssRule(r.key, { enforcement: v }); refreshCdss(); }}
                          disabled={!canEdit || !cdss.rules[r.key]?.enabled}
                          options={CDSS_ENFORCEMENTS.map((e) => ({ value: e.key, label: e.label }))}
                          placeholder='เลือกรูปแบบ'
                          showLabel={false}
                          showHelperText={false}
                        />
                      ),
                    },
                  ]}
                  emptyMessage='ไม่มีเกณฑ์'
                />
              </div>
            </PanelCard>

            <PanelCard
              title='หน้าต่างเวลาสำหรับการสั่งซ้ำ (Lab / X-ray)'
              subtitle='ตั้งค่าเองรายรายการเพื่อแทนค่ามาตรฐานของแคตตาล็อก — เว้นว่างแล้วกดบันทึกเพื่อคืนค่ามาตรฐาน'
            >
              <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div style={{ minWidth: 200 }}>
                  <Select
                    label='ชนิดรายการ'
                    value={repeatKind}
                    onChange={(v) => { setRepeatKind(v); setRepeatItem(''); }}
                    disabled={!canEdit}
                    options={[{ value: 'lab', label: 'Lab' }, { value: 'xray', label: 'X-ray' }]}
                    placeholder='เลือกชนิด'
                  />
                </div>
                <div style={{ minWidth: 320, flex: 1 }}>
                  <Select
                    label='รายการ'
                    value={repeatItem}
                    onChange={setRepeatItem}
                    disabled={!canEdit}
                    options={repeatKind === 'lab'
                      ? LAB_TESTS.map((t) => ({ value: t.id, label: `${t.nameEn} — ${t.nameTh}` }))
                      : XRAY_EXAMS.map((e) => ({ value: e.id, label: e.name }))}
                    placeholder='เลือกรายการที่ต้องการตั้งค่า'
                  />
                </div>
                <div style={{ minWidth: 180 }}>
                  <InputField
                    label='จำนวนวัน'
                    value={repeatDays}
                    onChange={setRepeatDays}
                    disabled={!canEdit}
                    showLeadingIcon={false}
                    placeholder='เว้นว่าง = ใช้ค่ามาตรฐาน'
                  />
                </div>
                <GuardedAction allowed={canEdit && !!repeatItem}>
                  <BrandButton variant='outline' size='sm' leadingIcon='save' onClick={applyRepeatOverride}>
                    บันทึกค่า
                  </BrandButton>
                </GuardedAction>
              </div>
              <span style={PANEL_LABEL_STYLE}>
                ค่าที่ตั้งเองอยู่ตอนนี้: Lab {Object.keys(cdss.repeatOverrides?.lab || {}).length} รายการ ·
                {' '}X-ray {Object.keys(cdss.repeatOverrides?.xray || {}).length} รายการ
              </span>
            </PanelCard>
          </>
        ) : null}

        {/* ══ แท็บ 4 · Role ═══════════════════════════════ */}
        {tab === 'roles' ? (
          <PanelCard
            title='สิทธิ์การสั่งการรักษาตาม Role (อ่านอย่างเดียว)'
            subtitle='ตารางนี้สรุปนโยบายที่ระบบบังคับใช้ — การตั้งค่าจริงอยู่ที่ระบบจัดการผู้ใช้และสิทธิ์ (§1.5.9.4)'
            action={
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='manage_accounts' onClick={() => history.push('/users')}>
                ไปตั้งค่าสิทธิ์ผู้ใช้
              </NeutralSubdueButton>
            }
          >
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                rowKey={(r) => r.role}
                rows={ROLE_ORDER_MATRIX}
                columns={[
                  { key: 'role', header: 'บทบาท' },
                  { key: 'medication', header: 'ยา' },
                  { key: 'lab', header: 'แล็บ' },
                  { key: 'xray', header: 'X-ray' },
                  { key: 'procedure', header: 'หัตถการ' },
                  { key: 'consult', header: 'ปรึกษา' },
                  { key: 'cancel', header: 'การยกเลิก', flex: 1 },
                ]}
                emptyMessage='ไม่มีข้อมูลสิทธิ์'
              />
            </div>
          </PanelCard>
        ) : null}
      </div>

      {/* ปิดรายการตรวจ — บังคับเหตุผล */}
      <ReasonDialog
        open={!!retireTarget}
        type='warning'
        title='ปิดรายการตรวจ'
        description='รายการที่ปิดจะสั่งใหม่ไม่ได้ แต่คำสั่งและผลเดิมยังอ้างอิงได้ตามปกติ'
        confirmLabel='ยืนยันการปิดรายการ'
        suggestions={[
          'ศูนย์บริการไม่มีเครื่องมือ/น้ำยาสำหรับรายการนี้แล้ว',
          'มีรายการตรวจใหม่ที่แม่นยำกว่ามาแทน',
          'ส่งตรวจภายนอกแทน ไม่ให้สั่งจากหน้านี้',
        ]}
        onConfirm={(reason) => {
          if (retireTarget.kind === 'lab') setLabTestRetired(retireTarget.id, true);
          else setXrayExamRetired(retireTarget.id, true);
          refreshLab(); refreshXray();
          setRetireTarget(null);
          showToast('success', `ปิดรายการตรวจแล้ว — ${reason}`);
        }}
        onClose={() => setRetireTarget(null)}
      />

      {/* แก้ไขราคายาแบบมีวันที่มีผล */}
      <AlertDialog
        open={!!priceTarget}
        type='info'
        title={`แก้ไขราคายา — ${priceTarget?.name || ''}`}
        description='ราคาใหม่จะมีผลตั้งแต่วันที่ระบุ ราคาเดิมยังคงอยู่ในประวัติเพื่อให้ใบเสร็จเก่าคำนวณย้อนหลังได้ถูกต้อง'
        confirmLabel='บันทึกราคาใหม่'
        cancelLabel='ยกเลิก'
        onConfirm={applyPriceChange}
        onCancel={() => setPriceTarget(null)}
        onClose={() => setPriceTarget(null)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <InfoPair label='ราคาปัจจุบัน' value={priceTarget ? `${baht(currentPrice(priceTarget))} บาท` : '—'} />
          <InputField
            label='ราคาใหม่ (บาทต่อหน่วย)'
            required
            value={newPrice}
            onChange={setNewPrice}
            showLeadingIcon={false}
            placeholder='เช่น 1.50'
            error={newPrice !== '' && !Number.isFinite(Number(newPrice)) ? 'ต้องเป็นตัวเลข' : undefined}
          />
          <InputField
            label='วันที่มีผล (YYYY-MM-DD)'
            required
            value={priceFrom}
            onChange={setPriceFrom}
            showLeadingIcon={false}
            placeholder='2026-09-01'
            error={priceFrom !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(priceFrom) ? 'รูปแบบต้องเป็น YYYY-MM-DD' : undefined}
          />
          <SuggestibleTextarea
            voice
            label='เหตุผลการปรับราคา'
            value={priceReason}
            onChange={(e) => setPriceReason(typeof e === 'string' ? e : e?.target?.value ?? '')}
            suggestions={[
              'ปรับตามราคากลางองค์การเภสัชกรรมปีงบประมาณใหม่',
              'ผู้จำหน่ายปรับราคาขึ้นตามสัญญาจัดซื้อรอบใหม่',
              'ปรับลดราคาตามผลการต่อรองราคาจัดซื้อร่วม',
            ]}
            minChars={2}
            height={110}
            minHeight={80}
            popoverAriaLabel='ตัวอย่างเหตุผลการปรับราคา'
            placeholder='ระบุที่มาของราคาใหม่เพื่อการตรวจสอบย้อนหลัง'
          />
        </div>
      </AlertDialog>

      {/* ประวัติการเปลี่ยนราคา */}
      <AlertDialog
        open={!!historyTarget}
        type='info'
        title={`ประวัติการเปลี่ยนราคา — ${historyTarget?.name || ''}`}
        description=''
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setHistoryTarget(null)}
        onClose={() => setHistoryTarget(null)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {priceHistoryFor(historyTarget?.id).length === 0 ? (
            <span style={PANEL_LABEL_STYLE}>ยังไม่มีประวัติการเปลี่ยนราคาของรายการนี้</span>
          ) : priceHistoryFor(historyTarget?.id).map((p) => (
            <div key={p.id} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span style={PANEL_VALUE_STYLE}>
                {baht(p.oldPrice)} → {baht(p.newPrice)} บาท · มีผล {p.effectiveFrom}
              </span>
              <span style={PANEL_LABEL_STYLE}>{p.by} · {p.at} · {p.reason}</span>
            </div>
          ))}
        </div>
      </AlertDialog>
    </QueuePageShell>
  );
};

export default OrderSetSettingsPage;
