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
  ORDER_SET_SCOPES, ORDER_SET_ITEM_KINDS, orderSetScopeMeta, itemKindMeta,
  blankOrderSet, blankOrderSetItem, getOrderSets, subscribeOrderSets,
  upsertOrderSet, setOrderSetActive, cancelOrderSet,
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
import { CURRENT_CLINICIAN } from '@/data/treatmentAudit';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.7 (ชุดคำสั่ง) + §1.5.9 (ตั้งค่ารายการสั่งการรักษา)
   + เกณฑ์การแจ้งเตือน CDSS ที่ §1.5.4.18–.21 บังคับให้ตั้งเองได้.

   หน้าเดียว 5 แท็บ (list + create/edit ในหน้าเดียวกัน ตาม pattern
   PharmacyRegistryPage — playbook §3). */

const breadcrumb = ['ระบบบันทึกการรักษา', 'ตั้งค่าชุดคำสั่งและรายการสั่งการรักษา'];

const TABS = [
  { key: 'sets',   label: 'ชุดคำสั่ง (Order set)' },
  { key: 'drugs',  label: 'รายการยาและเวชภัณฑ์' },
  { key: 'tests',  label: 'รายการ Lab / X-ray' },
  { key: 'cdss',   label: 'เกณฑ์การแจ้งเตือน CDSS' },
  { key: 'roles',  label: 'สิทธิ์การสั่งการรักษาตาม Role' },
];

const PER_PAGE = 10;

const SET_DESC_SUGGESTIONS = [
  'ชุดมาตรฐานสำหรับผู้ป่วยโรคเรื้อรังที่มาตามนัดทุก 3 เดือน',
  'ใช้กับผู้รับบริการที่มีอาการเฉียบพลันและยังแยกโรคไม่ได้',
  'ชุดยาตามอาการสำหรับการติดเชื้อทางเดินหายใจส่วนบนที่ไม่มีข้อบ่งชี้ยาปฏิชีวนะ',
  'ชุดติดตามหลังทำหัตถการ ใช้ร่วมกับการนัดทำแผล',
];

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

const classificationLabel = (key) =>
  DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const OrderSetSettingsPage = () => {
  const history = useHistory();
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;

  const [tab, setTab] = useState('sets');
  const [toast, setToast] = useState(null);
  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  /* ── แท็บ 1 · ชุดคำสั่ง ─────────────────────────────────── */
  const [sets, refreshSets] = useTreatmentStore(subscribeOrderSets, getOrderSets, []);
  const [setDraft, setSetDraft] = useState(null);
  const [setQuery, setSetQuery] = useState('');
  const [setPage, setSetPage] = useState(1);
  const [cancelSetTarget, setCancelSetTarget] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [nameError, setNameError] = useState('');

  const filteredSets = useMemo(() => {
    const q = setQuery.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter((s) => s.name.toLowerCase().includes(q) || String(s.owner).toLowerCase().includes(q));
  }, [sets, setQuery]);

  useEffect(() => { setSetPage(1); }, [setQuery]);
  const setsPaged = paginate(filteredSets, setPage, PER_PAGE);

  const openNewSet = () => { setSetDraft({ ...blankOrderSet() }); setNameError(''); };
  const openSet = (row) => { setSetDraft({ ...row, items: row.items.map((i) => ({ ...i })) }); setNameError(''); };

  const saveSet = () => {
    if (!String(setDraft.name || '').trim()) {
      setNameError('ต้องตั้งชื่อชุดคำสั่งก่อนบันทึก');
      return;
    }
    if ((setDraft.items || []).length === 0) {
      setNameError('ชุดคำสั่งต้องมีอย่างน้อย 1 รายการ');
      return;
    }
    const saved = upsertOrderSet(setDraft);
    setSetDraft({ ...saved, items: saved.items.map((i) => ({ ...i })) });
    setNameError('');
    refreshSets();
    showToast('success', `บันทึกชุดคำสั่ง "${saved.name}" แล้ว`);
  };

  const addSetItem = (kind) => setSetDraft((d) => ({ ...d, items: [...(d.items || []), blankOrderSetItem(kind)] }));
  const patchSetItem = (id, patch) => setSetDraft((d) => ({
    ...d, items: (d.items || []).map((i) => (i.id === id ? { ...i, ...patch } : i)),
  }));
  const removeSetItem = (id) => setSetDraft((d) => ({ ...d, items: (d.items || []).filter((i) => i.id !== id) }));

  const optionsForKind = (kind) => {
    if (kind === 'medication') {
      return DRUG_REGISTRY.filter((d) => d.active).map((d) => ({ value: d.name, label: d.name, subtext: classificationLabel(d.classification) }));
    }
    if (kind === 'lab') {
      return LAB_TESTS.filter((t) => !t.retired).map((t) => ({ value: t.id, label: `${t.nameEn} — ${t.nameTh}`, subtext: LAB_GROUP_LABEL[t.group] }));
    }
    if (kind === 'xray') {
      return XRAY_EXAMS.filter((e) => !e.retired).map((e) => ({ value: e.id, label: e.name, subtext: XRAY_MODALITY_BY_KEY[e.modality]?.thai }));
    }
    return [];
  };

  /* ── แท็บ 2 · รายการยา ──────────────────────────────────── */
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

  /* ── แท็บ 3 · Lab / X-ray ──────────────────────────────── */
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

  /* ── แท็บ 4 · CDSS ─────────────────────────────────────── */
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
      <QueuePageShell activeKey='treat' breadcrumb={breadcrumb} title='ตั้งค่าชุดคำสั่งและรายการสั่งการรักษา'>
        <div style={{
          paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)',
        }}>
          <AccessDeniedPanel what='การตั้งค่าชุดคำสั่งและรายการสั่งการรักษา' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='ตั้งค่าชุดคำสั่งและรายการสั่งการรักษา'
      onBack={() => history.push('/treat/queue')}
      backLabel='กลับไปหน้าคิว'
      tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
      activeTab={tab}
      onTabChange={(k) => { setTab(k); setSetDraft(null); }}
      actions={tab === 'sets' ? (
        <GuardedAction allowed={canEdit}>
          <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={openNewSet}>
            สร้างชุดคำสั่งใหม่
          </BrandButton>
        </GuardedAction>
      ) : null}
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

        {/* ══ แท็บ 1 · ชุดคำสั่ง ══════════════════════════ */}
        {tab === 'sets' ? (
          <>
            <PanelCard
              title='ชุดคำสั่งทั้งหมด'
              subtitle='หนึ่งชุดผสมได้ทั้ง ยา + Lab + X-ray + หัตถการ ตามที่ TOR §1.5.7.1 ระบุ — ชุดที่ปิดใช้งานจะไม่ปรากฏในหน้าสั่งการรักษา'
              action={<CountLabel n={filteredSets.length} unit='ชุด' />}
            >
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <PrimarySearch value={setQuery} onChange={setSetQuery} width={420} placeholder='ค้นหาชื่อชุดคำสั่ง หรือเจ้าของ' />
                {setQuery ? (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => setSetQuery('')}>
                    ล้างคำค้น
                  </NeutralSubdueButton>
                ) : null}
              </div>

              {filteredSets.length === 0 ? (
                <PanelEmptyState
                  icon='playlist_add'
                  title={sets.length === 0 ? 'ยังไม่มีชุดคำสั่งในระบบ' : `ไม่พบชุดคำสั่งที่ตรงกับ "${setQuery}"`}
                  subtitle={sets.length === 0
                    ? 'สร้างชุดคำสั่งแรกเพื่อให้แพทย์สั่งยา/แล็บ/รังสี/หัตถการชุดเดียวกันได้ในคลิกเดียว'
                    : 'ลองพิมพ์คำที่สั้นลง หรือกดล้างคำค้น'}
                  action={sets.length === 0 ? (
                    <GuardedAction allowed={canEdit}>
                      <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={openNewSet}>
                        สร้างชุดคำสั่งแรก
                      </BrandButton>
                    </GuardedAction>
                  ) : (
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='backspace' onClick={() => setSetQuery('')}>
                      ล้างคำค้น
                    </NeutralSubdueButton>
                  )}
                />
              ) : (
                <>
                  <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                    <Table
                      rowKey={(r) => r.id}
                      rows={setsPaged.slice}
                      onRowClick={openSet}
                      columns={[
                        {
                          key: 'name', header: 'ชื่อชุด', flex: 1,
                          render: (r) => (
                            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              <span style={PANEL_VALUE_STYLE}>{r.name}</span>
                              <span style={PANEL_LABEL_STYLE}>{r.description || '—'}</span>
                            </div>
                          ),
                        },
                        {
                          key: 'scope', header: 'เจ้าของ', width: 220,
                          render: (r) => (
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              <ColorfulBadge style={orderSetScopeMeta(r.scope).badge} size='small' width='hug'>
                                {orderSetScopeMeta(r.scope).label}
                              </ColorfulBadge>
                              <span style={PANEL_LABEL_STYLE}>{r.owner}</span>
                            </div>
                          ),
                        },
                        {
                          key: 'items', header: 'จำนวนรายการแยกชนิด', width: 280,
                          render: (r) => (
                            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              {ORDER_SET_ITEM_KINDS.map((k) => {
                                const n = r.items.filter((i) => i.kind === k.key).length;
                                if (!n) return null;
                                return (
                                  <ColorfulBadge key={k.key} style={k.badge} size='small' width='hug'>
                                    {k.label} {n}
                                  </ColorfulBadge>
                                );
                              })}
                            </div>
                          ),
                        },
                        {
                          key: 'lastUsedAt', header: 'ใช้งานล่าสุด', width: 200,
                          render: (r) => (
                            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                              <span style={PANEL_VALUE_STYLE}>{r.lastUsedAt || '—'}</span>
                              <span style={PANEL_LABEL_STYLE}>ใช้ไปแล้ว {r.useCount || 0} ครั้ง</span>
                            </div>
                          ),
                        },
                        {
                          key: 'active', header: 'สถานะ', width: 200,
                          render: (r) => (
                            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                              <StatusBadge style={r.active ? 'success' : 'neutral'} size='small'>
                                {r.active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </StatusBadge>
                              <GuardedAction allowed={canEdit}>
                                <NeutralSubdueButton
                                  variant='outline' size='sm'
                                  leadingIcon={r.active ? 'toggle_off' : 'toggle_on'}
                                  onClick={() => {
                                    if (r.active) { setCancelSetTarget(r); return; }
                                    setOrderSetActive(r.id, true);
                                    refreshSets();
                                    showToast('success', `เปิดใช้งานชุดคำสั่ง "${r.name}" แล้ว`);
                                  }}
                                >
                                  {r.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                </NeutralSubdueButton>
                              </GuardedAction>
                            </div>
                          ),
                        },
                      ]}
                      emptyMessage='ยังไม่มีชุดคำสั่ง'
                    />
                  </div>
                  {setsPaged.pageCount > 1 ? (
                    <div className='flex justify-end w-full'>
                      <Pagination currentPage={setsPaged.page} pageCount={setsPaged.pageCount} onPageChange={setSetPage} />
                    </div>
                  ) : null}
                </>
              )}
            </PanelCard>

            {setDraft ? (
              <PanelCard
                title={setDraft.id ? `แก้ไขชุดคำสั่ง — ${setDraft.name}` : 'สร้างชุดคำสั่งใหม่'}
                subtitle='กำหนดค่า default ต่อรายการได้ (ขนาด / ความถี่ / จำนวนวัน / ความเร่งด่วน) — แพทย์ยังปรับได้ตอนสั่งจริง'
                action={
                  <>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={() => setPreviewOpen(true)}>
                      ดูตัวอย่างก่อนบันทึก
                    </NeutralSubdueButton>
                    <GuardedAction allowed={canEdit}>
                      <BrandButton variant='fill' size='sm' leadingIcon='save' onClick={saveSet}>
                        บันทึกชุดคำสั่ง
                      </BrandButton>
                    </GuardedAction>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={() => setSetDraft(null)}>
                      ปิด
                    </NeutralSubdueButton>
                  </>
                }
              >
                {nameError ? <PanelAlert tone='error' icon='error' title='บันทึกไม่ได้'>{nameError}</PanelAlert> : null}

                <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <div style={{ minWidth: 320, flex: 2 }}>
                    <InputField
                      label='ชื่อชุดคำสั่ง'
                      required
                      value={setDraft.name}
                      onChange={(v) => setSetDraft((d) => ({ ...d, name: v }))}
                      disabled={!canEdit}
                      showLeadingIcon={false}
                      placeholder='เช่น ชุดตรวจติดตามเบาหวาน'
                      error={nameError && !String(setDraft.name).trim() ? nameError : undefined}
                    />
                  </div>
                  <div style={{ minWidth: 260, flex: 1 }}>
                    <Select
                      label='ขอบเขตการใช้งาน'
                      value={setDraft.scope}
                      onChange={(v) => setSetDraft((d) => ({
                        ...d, scope: v, owner: v === 'shared' ? CURRENT_CLINICIAN.center : CURRENT_CLINICIAN.name,
                      }))}
                      disabled={!canEdit}
                      options={ORDER_SET_SCOPES.map((s) => ({ value: s.key, label: s.label }))}
                      placeholder='เลือกขอบเขต'
                    />
                  </div>
                </div>
                <SuggestibleTextarea
                  voice
                  label='คำอธิบายการใช้งาน'
                  value={setDraft.description}
                  onChange={(e) => setSetDraft((d) => ({
                    ...d, description: typeof e === 'string' ? e : e?.target?.value ?? '',
                  }))}
                  suggestions={SET_DESC_SUGGESTIONS}
                  minChars={2}
                  height={110}
                  minHeight={80}
                  disabled={!canEdit}
                  popoverAriaLabel='ตัวอย่างคำอธิบายชุดคำสั่ง'
                  placeholder='อธิบายว่าใช้ชุดนี้กับผู้รับบริการกลุ่มไหน'
                />

                <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={PANEL_LABEL_STYLE}>เพิ่มรายการ:</span>
                  {ORDER_SET_ITEM_KINDS.map((k) => (
                    <GuardedAction key={k.key} allowed={canEdit}>
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={() => addSetItem(k.key)}>
                        {k.label}
                      </NeutralSubdueButton>
                    </GuardedAction>
                  ))}
                </div>

                {(setDraft.items || []).length === 0 ? (
                  <PanelEmptyState
                    icon='list_alt'
                    title='ชุดคำสั่งนี้ยังไม่มีรายการ'
                    subtitle='กดปุ่มด้านบนเพื่อเพิ่มยา แล็บ X-ray หรือหัตถการเข้าชุด — ผสมได้ทุกชนิดในชุดเดียว'
                  />
                ) : (
                  <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                    <Table
                      rowKey={(r) => r.id}
                      rows={setDraft.items}
                      columns={[
                        {
                          key: 'kind', header: 'ชนิด', width: 120,
                          render: (r) => (
                            <ColorfulBadge style={itemKindMeta(r.kind).badge} size='small' width='hug'>
                              {itemKindMeta(r.kind).label}
                            </ColorfulBadge>
                          ),
                        },
                        {
                          key: 'label', header: 'รายการ', flex: 1,
                          render: (r) => (r.kind === 'procedure' ? (
                            <InputField
                              value={r.label} onChange={(v) => patchSetItem(r.id, { label: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false}
                              placeholder='ชื่อหัตถการ เช่น ทำแผลสะอาดขนาดเล็ก'
                            />
                          ) : (
                            <Select
                              value={r.kind === 'medication' ? r.label : r.refId}
                              onChange={(v) => {
                                const opt = optionsForKind(r.kind).find((o) => o.value === v);
                                patchSetItem(r.id, { refId: v, label: r.kind === 'medication' ? v : (opt?.label || v) });
                              }}
                              disabled={!canEdit}
                              options={optionsForKind(r.kind)}
                              placeholder='เลือกรายการ'
                              showLabel={false}
                              showHelperText={false}
                            />
                          )),
                        },
                        {
                          key: 'defaults', header: 'ค่า default', width: 320,
                          render: (r) => (r.kind === 'medication' ? (
                            <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                              <div style={{ minWidth: 90 }}>
                                <InputField value={r.dosePerTake} onChange={(v) => patchSetItem(r.id, { dosePerTake: v })}
                                  disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='ขนาด' />
                              </div>
                              <div style={{ minWidth: 130 }}>
                                <InputField value={r.frequency} onChange={(v) => patchSetItem(r.id, { frequency: v })}
                                  disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='ความถี่' />
                              </div>
                              <div style={{ minWidth: 80 }}>
                                <InputField value={r.days} onChange={(v) => patchSetItem(r.id, { days: v })}
                                  disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='วัน' />
                              </div>
                            </div>
                          ) : (
                            <Select
                              value={r.urgency}
                              onChange={(v) => patchSetItem(r.id, { urgency: v })}
                              disabled={!canEdit}
                              options={[
                                { value: 'routine', label: 'ปกติ' },
                                { value: 'urgent', label: 'ด่วน' },
                                { value: 'stat', label: 'ด่วนมาก (STAT)' },
                              ]}
                              placeholder='ความเร่งด่วน'
                              showLabel={false}
                              showHelperText={false}
                            />
                          )),
                        },
                        {
                          key: 'note', header: 'หมายเหตุ', width: 260,
                          render: (r) => (
                            <InputField
                              value={r.note} onChange={(v) => patchSetItem(r.id, { note: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false}
                              placeholder='คำแนะนำที่จะติดไปกับรายการ'
                            />
                          ),
                        },
                        {
                          key: 'actions', header: '', width: 100,
                          render: (r) => (
                            <GuardedAction allowed={canEdit}>
                              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => removeSetItem(r.id)}>
                                ลบ
                              </NeutralSubdueButton>
                            </GuardedAction>
                          ),
                        },
                      ]}
                      emptyMessage='ยังไม่มีรายการในชุด'
                    />
                  </div>
                )}
              </PanelCard>
            ) : null}
          </>
        ) : null}

        {/* ══ แท็บ 2 · รายการยา ═══════════════════════════ */}
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
                        key: 'classification', header: 'ประเภท', width: 240,
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
                        key: 'unit', header: 'หน่วย', width: 120,
                        render: (r) => <span style={PANEL_VALUE_STYLE}>{r.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}</span>,
                      },
                      {
                        key: 'price', header: 'ราคา/หน่วย', width: 200,
                        render: (r) => (
                          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                            <span style={PANEL_VALUE_STYLE}>{baht(currentPrice(r))} บาท</span>
                            <span style={PANEL_LABEL_STYLE}>ปรับราคาแล้ว {r.priceSchedule.length} ครั้ง</span>
                          </div>
                        ),
                      },
                      {
                        key: 'active', header: 'สถานะ', width: 210,
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
                        key: 'actions', header: '', width: 240,
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
                        key: 'price', header: 'ราคา / ยอดเบิกได้ตามสิทธิ', width: 280,
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
                        key: 'repeat', header: 'หน้าต่างเวลาสั่งซ้ำ', width: 200,
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
                        key: 'active', header: 'สถานะ', width: 220,
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

        {/* ══ แท็บ 4 · CDSS ═══════════════════════════════ */}
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
                      key: 'enabled', header: 'เปิดใช้งาน', width: 200,
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
                      key: 'minSeverity', header: 'ระดับความรุนแรงขั้นต่ำที่แจ้ง', width: 280,
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
                      key: 'enforcement', header: 'รูปแบบการบังคับ', width: 300,
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

        {/* ══ แท็บ 5 · Role ═══════════════════════════════ */}
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
                  { key: 'role', header: 'บทบาท', width: 200 },
                  { key: 'medication', header: 'ยา', width: 180 },
                  { key: 'lab', header: 'แล็บ', width: 220 },
                  { key: 'xray', header: 'X-ray', width: 180 },
                  { key: 'procedure', header: 'หัตถการ', width: 220 },
                  { key: 'consult', header: 'ปรึกษา', width: 160 },
                  { key: 'cancel', header: 'การยกเลิก', flex: 1 },
                ]}
                emptyMessage='ไม่มีข้อมูลสิทธิ์'
              />
            </div>
          </PanelCard>
        ) : null}
      </div>

      {/* ตัวอย่างชุดคำสั่งก่อนบันทึก */}
      <AlertDialog
        open={previewOpen}
        type='info'
        title={`ตัวอย่างชุดคำสั่ง — ${setDraft?.name || '(ยังไม่ตั้งชื่อ)'}`}
        description='นี่คือรายการที่จะถูกเพิ่มเข้าใบสั่งการรักษาเมื่อแพทย์เลือกชุดนี้'
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setPreviewOpen(false)}
        onClose={() => setPreviewOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {(setDraft?.items || []).length === 0 ? (
            <span style={PANEL_LABEL_STYLE}>ยังไม่มีรายการในชุดนี้</span>
          ) : setDraft.items.map((i) => (
            <span key={i.id} style={PANEL_VALUE_STYLE}>
              [{itemKindMeta(i.kind).label}] {i.label || '(ยังไม่เลือกรายการ)'}
              {i.dosePerTake ? ` · ครั้งละ ${i.dosePerTake}` : ''}
              {i.frequency ? ` · ${i.frequency}` : ''}
              {i.days ? ` · ${i.days} วัน` : ''}
              {i.note ? ` · ${i.note}` : ''}
            </span>
          ))}
        </div>
      </AlertDialog>

      {/* ปิดใช้งานชุดคำสั่ง — บังคับเหตุผล */}
      <ReasonDialog
        open={!!cancelSetTarget}
        type='warning'
        title='ปิดใช้งานชุดคำสั่ง'
        description='ชุดที่ปิดใช้งานจะไม่ปรากฏในหน้าสั่งการรักษา แต่ยังอยู่ในทะเบียนพร้อมเหตุผล เปิดกลับได้ทุกเมื่อ'
        confirmLabel='ยืนยันการปิดใช้งาน'
        suggestions={[
          'แนวทางการรักษาเปลี่ยน ชุดนี้ไม่สอดคล้องกับแนวทางปัจจุบันแล้ว',
          'มีชุดคำสั่งใหม่ที่ครอบคลุมกว่ามาแทนแล้ว',
          'รายการยาในชุดถูกตัดออกจากบัญชีของศูนย์บริการ',
        ]}
        onConfirm={(reason) => {
          cancelOrderSet(cancelSetTarget.id, reason);
          refreshSets();
          setCancelSetTarget(null);
          showToast('success', 'ปิดใช้งานชุดคำสั่งแล้ว (เก็บไว้ในทะเบียนพร้อมเหตุผล)');
        }}
        onClose={() => setCancelSetTarget(null)}
      />

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
