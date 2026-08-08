import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import TabPill from '@/components/tab/TabPill';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import {
  PanelCard, PanelEmptyState, Sym, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import { PanelAlert, GuardedAction } from '@/pages/treat/panels/panelHooks';
import {
  ORDER_MODES, MEAL_RELATIONS, MEAL_SLOTS, INTERVAL_OPTIONS,
  INJECTION_ROUTES, INJECTION_DILUENTS, RATE_UNITS,
  PHARMACIST_NOTE_SUGGESTIONS, reasonSuggestionsFor, needsPrescribingReason,
  needsSupportingForm, blankSigDetail, blankTaperRow, calcDoseByWeight,
  timesPerDayFrom, suggestQuantity, summariseSig,
} from '@/data/treatmentSigDetail';
import { getRegistryDrug, DRUG_CLASSIFICATIONS } from '@/data/pharmacyRegistry';
import { appendAudit } from '@/data/treatmentAudit';

/* PHCIS | CPOE §1.5.4.3 / .4 / .6 / .7 / .9 / .11 / .12 —
   "วิธีใช้ยาแบบละเอียด" + เครื่องคำนวณขนาดยา.

   ตั้งใจสร้างเป็น panel/dialog แยกใน src/pages/treat/panels แทนการแก้
   `src/components/popup/AddMedicationPopup.jsx` เพราะ popup ตัวนั้นเป็น
   component กลางที่คลินิก NCD ใช้ร่วม — ตาม playbook §4 builder แก้ได้
   เฉพาะไฟล์ของโมดูลตัวเอง. แท็บ "ทั่วไป" ของ popup เดิมจึงทำงานเหมือนเดิม
   ทุกประการ และแพทย์เปิดหน้ารายละเอียดนี้จากตารางคำสั่งยาแทน. */

const MODE_TABS = [
  { key: 'meal',      label: 'Meal selected — ตามมื้ออาหาร' },
  { key: 'interval',  label: 'Interval — ทุก N ชั่วโมง' },
  { key: 'time',      label: 'Time specific — ระบุเวลา' },
  { key: 'taper',     label: 'Tapering / Split dose' },
  { key: 'injection', label: 'Injection — ยาฉีด' },
];

const classificationLabel = (key) =>
  DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const Row = ({ children }) => (
  <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>{children}</div>
);
const Col = ({ children, min = 200, flex = 1 }) => (
  <div className='flex flex-col min-w-0' style={{ flex, minWidth: min }}>{children}</div>
);

const MedicationSigDetailPanel = ({
  open, row, weightKg, canEdit = true, onClose, onConfirm, hn, visitId,
}) => {
  const [sig, setSig] = useState(blankSigDetail);
  const [touched, setTouched] = useState(false);
  const [newTime, setNewTime] = useState('');
  /* §1.5.4.18 — ยืนยันซ้ำเมื่อขนาดยาเกินเพดานอ้างอิง (reset ทุกครั้งที่เปิด) */
  const [doseConfirmed, setDoseConfirmed] = useState(false);

  useEffect(() => {
    if (open) {
      setSig({ ...blankSigDetail(), ...(row?.sigDetail || {}), orderMode: row?.orderMode || row?.sigDetail?.orderMode || 'once' });
      setTouched(false);
      setNewTime('');
      setDoseConfirmed(false);
    }
  }, [open, row]);

  const drug = row ? getRegistryDrug(row.name) : null;
  const reasonRequired = row ? needsPrescribingReason(row.name) : false;
  const supportForm = row ? needsSupportingForm(row.name) : null;

  const set = (patch) => setSig((s) => ({ ...s, ...patch }));
  const setInj = (patch) => setSig((s) => ({ ...s, injection: { ...s.injection, ...patch } }));

  const timesPerDay = useMemo(
    () => timesPerDayFrom(row?.frequency, sig),
    [row?.frequency, sig],
  );

  const dose = useMemo(() => calcDoseByWeight({
    name: row?.name,
    dosePerTake: sig.doseAmount || row?.dosePerTake,
    timesPerDay,
    weightKg,
  }), [row?.name, row?.dosePerTake, sig.doseAmount, timesPerDay, weightKg]);

  const qty = useMemo(() => suggestQuantity({
    name: row?.name,
    dosePerTake: sig.doseAmount || row?.dosePerTake,
    timesPerDay,
    days: sig.durationDays,
  }), [row?.name, row?.dosePerTake, sig.doseAmount, timesPerDay, sig.durationDays]);

  const reasonMissing = reasonRequired && String(sig.prescribingReason || '').trim().length < 5;

  const toggleSlot = (key) => set({
    slots: (sig.slots || []).includes(key)
      ? sig.slots.filter((s) => s !== key)
      : [...(sig.slots || []), key],
  });

  const addTaperRow = () => set({ taperRows: [...(sig.taperRows || []), blankTaperRow()] });
  const patchTaper = (id, patch) => set({
    taperRows: (sig.taperRows || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
  });
  const removeTaper = (id) => set({ taperRows: (sig.taperRows || []).filter((r) => r.id !== id) });

  const addTime = () => {
    const t = newTime.trim();
    if (!/^\d{1,2}:\d{2}$/.test(t)) return;
    if ((sig.times || []).includes(t)) return;
    set({ times: [...(sig.times || []), t].sort() });
    setNewTime('');
  };

  /* §1.5.4.18 — เกินเพดานแล้วต้องติ๊กยืนยันซ้ำก่อน commit จึงจะผ่าน */
  const doseGateBlocked = dose.ok && dose.exceeded && !doseConfirmed;

  const commit = () => {
    setTouched(true);
    if (reasonMissing) return;
    if (doseGateBlocked) return;
    onConfirm?.({
      sigDetail: sig,
      orderMode: sig.orderMode,
      stat: sig.orderMode === 'stat',
      prescribingReason: sig.prescribingReason,
      supportingFormAttached: sig.supportingFormAttached,
      /* §1.5.4.12 — จำนวนที่คำนวณได้เป็น "opt-in": เขียนทับเฉพาะเมื่อแพทย์
         กด "ใช้ค่านี้" (sig.appliedQty) เท่านั้น มิฉะนั้นคงค่าที่พิมพ์ไว้เอง */
      quantity: sig.appliedQty != null && sig.appliedQty !== '' ? sig.appliedQty : row?.quantity,
    });
    appendAudit({
      hn, visitId, category: 'medrec',
      field: `วิธีใช้ยาแบบละเอียด — ${row?.name || ''}`,
      oldValue: summariseSig(row?.sigDetail, { dosePerTake: row?.dosePerTake, unit: row?.unit }) || '—',
      newValue: summariseSig(sig, { dosePerTake: sig.doseAmount || row?.dosePerTake, unit: row?.unit }),
    });
    onClose?.();
  };

  if (!row) return null;

  return (
    /* ใช้ <Popup size='large'> แทน AlertDialog: ฟอร์มนี้ยาวกว่า 1 หน้าจอ
       และมีตาราง tapering 6 คอลัมน์ — AlertDialog กว้าง 448px และไม่มี
       body ที่ scroll ได้ ทำให้แถวปุ่มบันทึกหลุดออกนอกจอ (Popup มี
       header/body ที่ scroll ได้/footer ตาม design.md §6) */
    <Popup
      open={open}
      size='large'
      title={`วิธีใช้ยาแบบละเอียด — ${row.name}`}
      subtitle='กรอกได้ครบทุกกลุ่มที่ TOR กำหนด — Meal selected · Interval · Time specific · Tapering/Split dose · Injection พร้อมเครื่องคำนวณ MKDay / MKDose และจำนวนที่ควรจ่าย'
      onClose={onClose}
      primaryAction={{ label: 'บันทึกวิธีใช้ยา', onClick: commit, disabled: !canEdit }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        {/* ── ป้ายกำกับยา ────────────────────────────────────── */}
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {drug?.highAlert ? <StatusBadge style='error' size='small' icon='priority_high'>High Alert Drug</StatusBadge> : null}
          {drug ? <ColorfulBadge style='purple' size='small' width='hug'>{classificationLabel(drug.classification)}</ColorfulBadge> : null}
          {drug?.packSize ? <ColorfulBadge style='grey' size='small' width='hug'>1 กล่อง = {drug.packSize} {drug.unit === 'capsule' ? 'แคปซูล' : 'เม็ด'}</ColorfulBadge> : null}
        </div>

        {/* ── §1.5.4.3 ลักษณะการสั่ง ─────────────────────────── */}
        <PanelCard title='ลักษณะการสั่งยา' subtitle='รายครั้ง · ต่อเนื่อง · ฉุกเฉินให้ทันที (STAT)'>
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            {ORDER_MODES.map((m) => (
              <label
                key={m.key}
                className='inline-flex items-center'
                style={{ gap: 'var(--dim-space-100, 4px)', cursor: canEdit ? 'pointer' : 'not-allowed' }}
              >
                <input
                  type='radio'
                  name='sig-order-mode'
                  checked={sig.orderMode === m.key}
                  disabled={!canEdit}
                  onChange={() => set({ orderMode: m.key })}
                />
                <span style={PANEL_VALUE_STYLE}>{m.label}</span>
                <span style={PANEL_LABEL_STYLE}>· {m.hint}</span>
              </label>
            ))}
          </div>
        </PanelCard>

        {/* ── §1.5.4.7 กลุ่มวิธีใช้ ──────────────────────────── */}
        <PanelCard title='วิธีใช้ยา' subtitle='เลือกรูปแบบที่ตรงกับคำสั่งจริง — ระบบจะสรุปเป็นข้อความฉลากยาให้อัตโนมัติ'>
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {MODE_TABS.map((t) => (
              <TabPill key={t.key} selected={sig.mode === t.key} onClick={() => canEdit && set({ mode: t.key })}>
                {t.label}
              </TabPill>
            ))}
          </div>

          {sig.mode === 'meal' ? (
            <>
              <Row>
                <Col>
                  <Select
                    label='ความสัมพันธ์กับอาหาร'
                    value={sig.mealRelation}
                    onChange={(v) => set({ mealRelation: v })}
                    disabled={!canEdit}
                    options={MEAL_RELATIONS.map((r) => ({ value: r.key, label: r.label }))}
                    placeholder='เลือก'
                  />
                </Col>
              </Row>
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {MEAL_SLOTS.map((s) => (
                  <Checkbox
                    key={s.key}
                    label={`${s.label} (${s.defaultTime})`}
                    checked={(sig.slots || []).includes(s.key)}
                    disabled={!canEdit}
                    onChange={() => toggleSlot(s.key)}
                  />
                ))}
              </div>
            </>
          ) : null}

          {sig.mode === 'interval' ? (
            <Row>
              <Col>
                <Select
                  label='ความถี่ (Interval)'
                  value={sig.intervalKey}
                  onChange={(v) => set({ intervalKey: v })}
                  disabled={!canEdit}
                  options={INTERVAL_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                  placeholder='เลือกความถี่'
                />
              </Col>
              {sig.intervalKey === 'custom' ? (
                <Col>
                  <InputField
                    label='กำหนดเอง — ทุกกี่ชั่วโมง'
                    value={sig.intervalHours}
                    onChange={(v) => set({ intervalHours: v })}
                    disabled={!canEdit}
                    showLeadingIcon={false}
                    placeholder='เช่น 10'
                  />
                </Col>
              ) : null}
            </Row>
          ) : null}

          {sig.mode === 'time' ? (
            <>
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {(sig.times || []).length === 0 ? (
                  <span style={PANEL_LABEL_STYLE}>ยังไม่ได้ระบุเวลา — เพิ่มเวลาให้ยาเป็นรายมื้อด้านล่าง</span>
                ) : (sig.times || []).map((t) => (
                  <span
                    key={t}
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-100, 4px)',
                      borderRadius: 'var(--dim-radius-full)',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
                      background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                      paddingTop: 'var(--dim-space-100, 4px)',
                      paddingRight: 'var(--dim-space-200, 8px)',
                      paddingBottom: 'var(--dim-space-100, 4px)',
                      paddingLeft: 'var(--dim-space-200, 8px)',
                      ...PANEL_VALUE_STYLE,
                    }}
                  >
                    {t}
                    {canEdit ? (
                      <button
                        type='button'
                        aria-label={`ลบเวลา ${t}`}
                        onClick={() => set({ times: sig.times.filter((x) => x !== t) })}
                        style={{ background: 'transparent', border: 0, cursor: 'pointer', lineHeight: 1 }}
                      >
                        <Sym name='close' size={14} color='var(--icon-neutral-tertiary, #ADB2B7)' />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
              <Row>
                <Col min={180}>
                  <InputField
                    label='เพิ่มเวลา (HH:MM)'
                    value={newTime}
                    onChange={setNewTime}
                    disabled={!canEdit}
                    showLeadingIcon={false}
                    placeholder='เช่น 14:00'
                  />
                </Col>
                <Col min={140} flex={0}>
                  <GuardedAction allowed={canEdit}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addTime}>
                      เพิ่มเวลา
                    </NeutralSubdueButton>
                  </GuardedAction>
                </Col>
              </Row>
            </>
          ) : null}

          {sig.mode === 'taper' ? (
            <>
              {(sig.taperRows || []).length === 0 ? (
                <PanelEmptyState
                  icon='stairs'
                  title='ยังไม่มีช่วงการลดขนาดยา'
                  subtitle='เพิ่มช่วงแรก แล้วระบุวันเริ่ม–สิ้นสุด และขนาดยาต่อครั้งของแต่ละช่วง'
                  action={
                    <GuardedAction allowed={canEdit}>
                      <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={addTaperRow}>
                        เพิ่มช่วงแรก
                      </BrandButton>
                    </GuardedAction>
                  }
                />
              ) : (
                <>
                  <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                    <Table
                      rowKey={(r) => r.id}
                      rows={sig.taperRows}
                      columns={[
                        {
                          key: 'startDate', header: 'วันที่เริ่ม',
                          render: (r) => (
                            <InputField value={r.startDate} onChange={(v) => patchTaper(r.id, { startDate: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='6 พ.ค. 2569' />
                          ),
                        },
                        {
                          key: 'endDate', header: 'วันที่สิ้นสุด',
                          render: (r) => (
                            <InputField value={r.endDate} onChange={(v) => patchTaper(r.id, { endDate: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='12 พ.ค. 2569' />
                          ),
                        },
                        {
                          key: 'dosePerTake', header: 'ขนาดต่อครั้ง',
                          render: (r) => (
                            <InputField value={r.dosePerTake} onChange={(v) => patchTaper(r.id, { dosePerTake: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='2' />
                          ),
                        },
                        {
                          key: 'timesPerDay', header: 'ครั้ง/วัน',
                          render: (r) => (
                            <InputField value={r.timesPerDay} onChange={(v) => patchTaper(r.id, { timesPerDay: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='3' />
                          ),
                        },
                        {
                          key: 'note', header: 'หมายเหตุ', flex: 1,
                          render: (r) => (
                            <InputField value={r.note} onChange={(v) => patchTaper(r.id, { note: v })}
                              disabled={!canEdit} showLabel={false} showLeadingIcon={false} placeholder='เช่น ลดลงทีละครึ่งเม็ด' />
                          ),
                        },
                        {
                          key: 'actions', header: '',
                          render: (r) => (
                            <GuardedAction allowed={canEdit}>
                              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => removeTaper(r.id)}>
                                ลบ
                              </NeutralSubdueButton>
                            </GuardedAction>
                          ),
                        },
                      ]}
                      emptyMessage='ยังไม่มีช่วงการลดขนาดยา'
                    />
                  </div>
                  <GuardedAction allowed={canEdit}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='add' onClick={addTaperRow}>
                      เพิ่มช่วงถัดไป
                    </NeutralSubdueButton>
                  </GuardedAction>
                </>
              )}
            </>
          ) : null}

          {sig.mode === 'injection' ? (
            <>
              <Row>
                <Col>
                  <Select
                    label='วิธีบริหารยา'
                    value={sig.injection.route}
                    onChange={(v) => setInj({ route: v })}
                    disabled={!canEdit}
                    options={INJECTION_ROUTES.map((r) => ({ value: r.key, label: r.label }))}
                    placeholder='เลือกวิธีบริหาร'
                  />
                </Col>
                <Col>
                  <Select
                    label='สารละลายที่ผสม'
                    value={sig.injection.diluent}
                    onChange={(v) => setInj({ diluent: v })}
                    disabled={!canEdit}
                    options={INJECTION_DILUENTS.map((d) => ({ value: d.key, label: d.label }))}
                    placeholder='เลือกสารละลาย'
                  />
                </Col>
              </Row>
              <Row>
                <Col min={160}>
                  <InputField label='ปริมาตรรวม (mL)' value={sig.injection.volumeMl}
                    onChange={(v) => setInj({ volumeMl: v })} disabled={!canEdit}
                    showLeadingIcon={false} placeholder='เช่น 100' />
                </Col>
                <Col min={160}>
                  <InputField label='อัตราเร็วการให้ยา' value={sig.injection.rate}
                    onChange={(v) => setInj({ rate: v })} disabled={!canEdit}
                    showLeadingIcon={false} placeholder='เช่น 125' />
                </Col>
                <Col min={200}>
                  <Select
                    label='หน่วยอัตราเร็ว'
                    value={sig.injection.rateUnit}
                    onChange={(v) => setInj({ rateUnit: v })}
                    disabled={!canEdit}
                    options={RATE_UNITS.map((u) => ({ value: u.key, label: u.label }))}
                    placeholder='เลือกหน่วย'
                  />
                </Col>
                <Col min={180}>
                  <InputField label='ระยะเวลาให้ยา (นาที)' value={sig.injection.durationMin}
                    onChange={(v) => setInj({ durationMin: v })} disabled={!canEdit}
                    showLeadingIcon={false} placeholder='เช่น 30' />
                </Col>
              </Row>
            </>
          ) : null}

          {/* §1.5.4.4 ระยะเวลา / ปริมาณที่ควรได้รับ — แยกจาก "จำนวน" ชัดเจน */}
          <Row>
            <Col min={180}>
              <InputField
                label='ปริมาณที่ควรได้รับต่อครั้ง'
                value={sig.doseAmount}
                onChange={(v) => set({ doseAmount: v })}
                disabled={!canEdit}
                showLeadingIcon={false}
                placeholder={`ค่าเริ่มต้นจากคำสั่ง: ${row.dosePerTake || '—'} ${row.unit || 'เม็ด'}`}
                helperText='ใช้เมื่อขนาดต่างจากที่ระบุในแท็บทั่วไป'
              />
            </Col>
            <Col min={180}>
              <InputField
                label='ระยะเวลาการให้ยา (จำนวนวัน)'
                value={sig.durationDays}
                onChange={(v) => set({ durationDays: v })}
                disabled={!canEdit}
                showLeadingIcon={false}
                placeholder='เช่น 5'
              />
            </Col>
          </Row>

          <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
            สรุปฉลากยา: {summariseSig(sig, { dosePerTake: sig.doseAmount || row.dosePerTake, unit: row.unit }) || '—'}
          </span>
        </PanelCard>

        {/* ── §1.5.4.11 / §1.5.4.12 เครื่องคำนวณ ──────────────── */}
        <PanelCard title='เครื่องคำนวณขนาดยา' subtitle='คำนวณสดจากน้ำหนักในสัญญาณชีพและความถี่ที่เลือก'>
          {!dose.ok && dose.reason === 'noWeight' ? (
            <PanelAlert tone='warning' icon='monitor_weight' title='ต้องมีน้ำหนักตัวจึงคำนวณ mg/kg ได้'>
              {dose.message} — ระบบไม่คำนวณจากค่าประมาณเพราะเสี่ยงอย่างยิ่งในผู้ป่วยเด็ก
            </PanelAlert>
          ) : null}
          {!dose.ok && dose.reason === 'noStrength' ? (
            <PanelAlert tone='info' icon='info' title='ไม่พบขนาดยา (mg) ในชื่อยา'>
              {dose.message} — กรอกขนาดยาลงในชื่อรายการ หรือคำนวณด้วยตนเอง
            </PanelAlert>
          ) : null}
          {dose.ok ? (
            <>
              <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <span style={PANEL_VALUE_STYLE}>MKDose = <strong>{dose.mkDose}</strong> mg/kg/dose</span>
                <span style={PANEL_VALUE_STYLE}>MKDay = <strong>{dose.mkDay}</strong> mg/kg/day</span>
                <span style={PANEL_LABEL_STYLE}>
                  (น้ำหนัก {dose.weight} กก. · {dose.mgPerDose} mg/ครั้ง · {dose.mgPerDay} mg/วัน · {timesPerDay} ครั้ง/วัน)
                </span>
              </div>
              {dose.exceeded ? (
                <>
                  <PanelAlert tone='error' icon='dangerous' title='ขนาดยาเกินเพดานอ้างอิง'>
                    {dose.messages.join(' · ')} — ต้องกดยืนยันซ้ำก่อนบันทึก และควรตรวจสอบขนาดยากับเภสัชกร
                  </PanelAlert>
                  <Checkbox
                    label='ยืนยันว่าตรวจสอบขนาดยาซ้ำแล้ว และยืนยันจะสั่งตามนี้'
                    checked={doseConfirmed}
                    disabled={!canEdit}
                    onChange={() => setDoseConfirmed((v) => !v)}
                  />
                  {touched && doseGateBlocked ? (
                    <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
                      ยังบันทึกไม่ได้ — ต้องติ๊กยืนยันว่าตรวจสอบขนาดยาที่เกินเพดานซ้ำแล้ว
                    </span>
                  ) : null}
                </>
              ) : (
                <StatusBadge style='success' size='small' icon='check_circle'>ขนาดยาอยู่ในเกณฑ์อ้างอิง</StatusBadge>
              )}
            </>
          ) : null}

          <div
            className='flex flex-wrap items-center justify-between w-full'
            style={{
              gap: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
              paddingTop: 'var(--dim-space-300, 12px)',
              paddingRight: 'var(--dim-space-300, 12px)',
              paddingBottom: 'var(--dim-space-300, 12px)',
              paddingLeft: 'var(--dim-space-300, 12px)',
            }}
          >
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                {qty.ok ? `แนะนำจ่าย ${qty.qty} ${qty.unit}` : 'ยังคำนวณจำนวนที่ควรจ่ายไม่ได้'}
              </span>
              <span style={PANEL_LABEL_STYLE}>{qty.ok ? qty.formula : qty.message}</span>
              {qty.ok && qty.packNote ? <span style={PANEL_LABEL_STYLE}>{qty.packNote}</span> : null}
              {/* §1.5.4.12 — ค่าที่คำนวณจะทับ "จำนวน" ในตารางคำสั่งยาก็ต่อเมื่อกด "ใช้ค่านี้" */}
              {sig.appliedQty != null && sig.appliedQty !== '' ? (
                <StatusBadge style='success' size='small' icon='check_circle'>
                  ใช้ค่าที่คำนวณแล้ว — จะบันทึกจำนวน {sig.appliedQty} {qty.unit || row.unit || 'เม็ด'}
                </StatusBadge>
              ) : (
                <span style={PANEL_LABEL_STYLE}>
                  ยังไม่ได้ใช้ค่านี้ — จะคงจำนวนเดิมที่กรอกไว้ ({row.quantity || '—'} {row.unit || 'เม็ด'})
                </span>
              )}
            </div>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <GuardedAction allowed={canEdit && qty.ok}>
                <BrandButton variant='outline' size='sm' leadingIcon='done' onClick={() => set({ appliedQty: qty.qty })}>
                  ใช้ค่านี้
                </BrandButton>
              </GuardedAction>
              {sig.appliedQty != null && sig.appliedQty !== '' ? (
                <GuardedAction allowed={canEdit}>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={() => set({ appliedQty: null })}>
                    ยกเลิกการใช้ค่านี้
                  </NeutralSubdueButton>
                </GuardedAction>
              ) : null}
            </div>
          </div>
        </PanelCard>

        {/* ── §1.5.4.6 ช่องเฉพาะรายการยา ─────────────────────── */}
        <PanelCard title='ข้อมูลเฉพาะรายการยานี้'>
          <Checkbox
            label='Small Dose STAT — จ่ายขนาดน้อยให้ทันทีที่ห้องยา'
            checked={!!sig.smallDoseStat}
            disabled={!canEdit}
            onChange={() => set({ smallDoseStat: !sig.smallDoseStat })}
          />
          <SuggestibleTextarea
            voice
            label='หมายเหตุถึงเภสัชกร'
            value={sig.pharmacistNote}
            onChange={(e) => set({ pharmacistNote: typeof e === 'string' ? e : e?.target?.value ?? '' })}
            suggestions={PHARMACIST_NOTE_SUGGESTIONS}
            minChars={2}
            height={120}
            minHeight={88}
            disabled={!canEdit}
            popoverAriaLabel='ตัวอย่างหมายเหตุถึงเภสัชกร'
            placeholder='เช่น บดยาก่อนจ่าย · จัดใส่ซองรายมื้อ'
          />
        </PanelCard>

        {/* ── §1.5.4.9 เหตุผลการสั่งใช้ยา ─────────────────────── */}
        {reasonRequired ? (
          <PanelCard
            title='เหตุผลการสั่งใช้ยา (บังคับ)'
            subtitle={`${classificationLabel(drug?.classification)} — ต้องระบุเหตุผลก่อนจึงจะบันทึกได้`}
          >
            <SuggestibleTextarea
              voice
              required
              label='เหตุผลการสั่งใช้'
              value={sig.prescribingReason}
              onChange={(e) => set({ prescribingReason: typeof e === 'string' ? e : e?.target?.value ?? '' })}
              suggestions={reasonSuggestionsFor(drug?.classification)}
              minChars={2}
              height={130}
              minHeight={96}
              disabled={!canEdit}
              popoverAriaLabel='ตัวอย่างเหตุผลการสั่งใช้ยา'
              placeholder='ระบุเหตุผลทางคลินิกที่ต้องใช้ยาชนิดนี้'
            />
            {touched && reasonMissing ? (
              <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
                ต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร — เหตุผลนี้จะถูกบันทึกในเวชระเบียนและใช้ตรวจสอบการสั่งใช้ยา
              </span>
            ) : null}
          </PanelCard>
        ) : null}

        {/* ── §1.5.4.15 เอกสารประกอบ ─────────────────────────── */}
        {supportForm ? (
          <PanelCard title='เอกสารประกอบการสั่งยา'>
            <PanelAlert tone='warning' icon='description' title={supportForm.formName}>
              {supportForm.why} — ต้องแนบเอกสารนี้ที่ขั้นเอกสาร/ใบรับรองแพทย์ก่อนส่งใบสั่งยาไปห้องยา
            </PanelAlert>
            <Checkbox
              label='แนบเอกสารประกอบเรียบร้อยแล้ว'
              checked={!!sig.supportingFormAttached}
              disabled={!canEdit}
              onChange={() => set({ supportingFormAttached: !sig.supportingFormAttached })}
            />
          </PanelCard>
        ) : null}
      </div>
    </Popup>
  );
};

export default MedicationSigDetailPanel;
