import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, GuardedAction, PanelAlert, ReasonDialog, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import { addTreatmentNote } from '@/data/treatmentNotes';
import { appendAudit, stampNow, CURRENT_CLINICIAN } from '@/data/treatmentAudit';

/* PHCIS | CPOE §1.5.5.2 / .3 / .4 (+ §1.5.1.5) — บันทึกการทำหัตถการ.
   คอลัมน์และคำศัพท์ตามคู่มือ HCIS §2.4 (ลำดับ / วันที่เริ่มต้น / เวลาเริ่มต้น /
   ตำแหน่ง / หัตถการ / จำนวน / หน่วย / ราคาต่อหน่วย) พร้อมแท็บ
   "กิจกรรมพยาบาล" ที่คู่มือแยกไว้ และรหัส ICD-9-CM ตามที่ TOR สั่ง. */

const UNCODED_LABEL = 'ยังไม่ลงรหัส';

/* ICD-9-CM ชุดหัตถการที่ทำได้จริงในศูนย์บริการสาธารณสุข */
const ICD9_PROCEDURES = [
  { code: '86.59', nameTh: 'เย็บปิดแผลผิวหนังและเนื้อเยื่อใต้ผิวหนัง', nameEn: 'Closure of skin and subcutaneous tissue', price: 350, unit: 'ครั้ง', claim: 350 },
  { code: '86.28', nameTh: 'ทำแผลและตัดเนื้อตายแบบไม่ผ่าตัด', nameEn: 'Nonexcisional debridement of wound', price: 200, unit: 'ครั้ง', claim: 200 },
  { code: '86.05', nameTh: 'ผ่าเปิดระบายหนองที่ผิวหนัง (I&D)', nameEn: 'Incision with removal of foreign body', price: 400, unit: 'ครั้ง', claim: 400 },
  { code: '96.59', nameTh: 'ล้างแผลด้วยน้ำเกลือ', nameEn: 'Other irrigation of wound', price: 120, unit: 'ครั้ง', claim: 120 },
  { code: '99.29', nameTh: 'ฉีดยาหรือสารเข้ากล้ามเนื้อ/ใต้ผิวหนัง', nameEn: 'Injection of other therapeutic substance', price: 80, unit: 'ครั้ง', claim: 80 },
  { code: '99.23', nameTh: 'ฉีดสเตียรอยด์เฉพาะที่', nameEn: 'Injection of steroid', price: 500, unit: 'ครั้ง', claim: 300 },
  { code: '93.94', nameTh: 'พ่นยาขยายหลอดลม (Nebulization)', nameEn: 'Respiratory medication by nebulizer', price: 150, unit: 'ครั้ง', claim: 150 },
  { code: '57.94', nameTh: 'ใส่สายสวนปัสสาวะ', nameEn: 'Insertion of indwelling urinary catheter', price: 250, unit: 'ครั้ง', claim: 250 },
  { code: '96.07', nameTh: 'ใส่สายให้อาหารทางจมูก (NG tube)', nameEn: 'Insertion of other gastric tube', price: 250, unit: 'ครั้ง', claim: 250 },
  { code: '89.52', nameTh: 'ตรวจคลื่นไฟฟ้าหัวใจ (EKG 12 lead)', nameEn: 'Electrocardiogram', price: 180, unit: 'ครั้ง', claim: 180 },
  { code: '86.22', nameTh: 'ตัดเนื้อตายแบบผ่าตัด (Excisional debridement)', nameEn: 'Excisional debridement of wound', price: 600, unit: 'ครั้ง', claim: 600 },
  { code: '98.20', nameTh: 'เอาสิ่งแปลกปลอมออกโดยไม่ผ่าตัด', nameEn: 'Removal of foreign body without incision', price: 300, unit: 'ครั้ง', claim: 300 },
];

/* กิจกรรมพยาบาล — แยก "มีค่าใช้จ่าย" / "ไม่มีค่าใช้จ่าย" ตามคู่มือ §2.4
   `claim` = ยอดที่กองทุนเบิกได้ต่อครั้ง (แยกจาก `price` เหมือนหัตถการ).
   เดิมกิจกรรมพยาบาลถูกบวกเข้า "รวมเบิกได้" เต็มจำนวนเสมอ ผู้รับบริการที่
   ชำระเงินเองจึงเห็น "ต้องชำระเอง 0 บาท" ทั้งที่ต้องจ่ายจริง */
const NURSING_ACTIVITIES = [
  { key: 'na-1', label: 'ทำแผลขนาดเล็ก',                billable: true,  price: 80,  claim: 80  },
  { key: 'na-2', label: 'ตัดไหม',                       billable: true,  price: 100, claim: 100 },
  { key: 'na-3', label: 'ให้สารน้ำทางหลอดเลือดดำ',       billable: true,  price: 150, claim: 150 },
  { key: 'na-4', label: 'พ่นยาและสังเกตอาการ 30 นาที',   billable: true,  price: 120, claim: 120 },
  { key: 'na-5', label: 'วัดสัญญาณชีพซ้ำและเฝ้าระวัง',    billable: false, price: 0,   claim: 0   },
  { key: 'na-6', label: 'ให้คำแนะนำการดูแลแผลที่บ้าน',    billable: false, price: 0,   claim: 0   },
  { key: 'na-7', label: 'ให้คำแนะนำการใช้ยาและการมาตามนัด', billable: false, price: 0,  claim: 0   },
  { key: 'na-8', label: 'ประเมินความปวดและบันทึกผล',      billable: false, price: 0,   claim: 0   },
];

/* §1.5.1.4 — ไม่มีสิทธิ / ชำระเงินเอง = เบิกไม่ได้ทั้งใบ (ทั้งหัตถการและ
   กิจกรรมพยาบาล) ไม่ใช่แค่ยอดหัตถการอย่างเดียว */
const NON_CLAIMABLE_RIGHTS = new Set(['', 'ชำระเงินเอง', 'ไม่มีสิทธิ']);
const rightsClaimable = (rights) => !NON_CLAIMABLE_RIGHTS.has(String(rights || '').trim());

const PERFORMERS = [
  { value: 'somying',   label: 'พญ.สมหญิง รักษ์ดี (แพทย์)' },
  { value: 'anucha',    label: 'นพ.อนุชา ศรีวิไล (แพทย์)' },
  { value: 'suchada',   label: 'พว.สุชาดา แก้วมณี (พยาบาลวิชาชีพ)' },
  { value: 'manop',     label: 'พว.มานพ เกษมสุข (พยาบาลวิชาชีพ)' },
];

const PROC_DETAIL_SUGGESTIONS = [
  'ล้างแผลด้วย NSS ปิดด้วยผ้าก๊อซปราศจากเชื้อ ไม่มีเลือดออกซึม',
  'ฉีดยาชา 1% Lidocaine 3 mL เย็บแผล 4 เข็มด้วย Nylon 4-0 นัดตัดไหม 7 วัน',
  'ผ่าเปิดระบายหนอง ได้หนองประมาณ 5 mL ส่งเพาะเชื้อ ใส่ผ้าระบาย',
  'พ่นยาขยายหลอดลม 1 ครั้ง สังเกตอาการ 30 นาที ไม่มีผลข้างเคียง',
  'ผู้รับบริการทนต่อการทำหัตถการได้ดี สัญญาณชีพคงที่ตลอดการทำ',
];

const PROGRESS_SUGGESTIONS = [
  'แผลแห้งดี ไม่มีสิ่งคัดหลั่ง ขอบแผลติดกันดี',
  'ผู้รับบริการปวดลดลงจาก 7/10 เหลือ 3/10 หลังทำหัตถการ',
  'นัดติดตามอีก 3 วัน หากมีไข้หรือแผลบวมแดงให้กลับมาก่อนนัด',
];

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

/* นาทีระหว่างเวลา HH:MM สองค่า — คืน null เมื่อกรอกไม่ครบ/ผิดรูปแบบ */
const minutesBetween = (start, end) => {
  const p = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const a = p(start); const b = p(end);
  if (a == null || b == null) return null;
  return b - a;
};

const blankProcedure = () => ({
  id: `proc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
  code: '', name: '', uncoded: false,
  startDate: '', startTime: '', endDate: '', endTime: '',
  site: '', qty: 1, unit: 'ครั้ง', unitPrice: 0, claimPerUnit: 0,
  performer: 'somying', detail: '', otherActivity: '',
  cancelledAt: '', cancelReason: '',
});

const ProcedureOrderPanel = ({ form, setForm, patient, onOpenBodyDiagram }) => {
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const [query, setQuery] = useState('');
  const [uncodedOpen, setUncodedOpen] = useState(false);
  const [uncodedText, setUncodedText] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteBody, setNoteBody] = useState('');
  const [reopenTarget, setReopenTarget] = useState(null);
  const [timeError, setTimeError] = useState('');

  const rows = form?.procedureOrders || [];
  const nursing = form?.nursingActivities || {};

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ICD9_PROCEDURES.filter(
      (p) => p.code.includes(q) || p.nameTh.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const setRows = (updater) => setForm((f) => ({
    ...f,
    procedureOrders: typeof updater === 'function' ? updater(f.procedureOrders || []) : updater,
  }));

  const patchRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addProcedure = (p) => {
    const row = {
      ...blankProcedure(),
      code: p.code, name: p.nameTh,
      unit: p.unit, unitPrice: p.price, claimPerUnit: p.claim,
      startDate: stampNow().split(' · ')[0],
      startTime: stampNow().split(' · ')[1] || '',
    };
    setRows((rs) => [...rs, row]);
    appendAudit({
      hn, visitId, category: 'problem', field: `บันทึกหัตถการ ${p.code}`,
      oldValue: '—', newValue: `${p.nameTh} (ICD-9-CM ${p.code})`,
    });
    setQuery('');
  };

  const addUncoded = () => {
    if (!uncodedText.trim()) return;
    setRows((rs) => [...rs, {
      ...blankProcedure(),
      code: '', name: uncodedText.trim(), uncoded: true,
      startDate: stampNow().split(' · ')[0],
      startTime: stampNow().split(' · ')[1] || '',
    }]);
    appendAudit({
      hn, visitId, category: 'problem', field: 'บันทึกหัตถการแบบยังไม่ลงรหัส',
      oldValue: '—', newValue: `${uncodedText.trim()} (${UNCODED_LABEL})`,
    });
    setUncodedText('');
    setUncodedOpen(false);
  };

  const validateTime = (row, patch) => {
    const next = { ...row, ...patch };
    const mins = minutesBetween(next.startTime, next.endTime);
    if (mins != null && mins < 0 && next.startDate === next.endDate) {
      setTimeError(`${next.name || 'หัตถการ'}: เวลาสิ้นสุด (${next.endTime}) อยู่ก่อนเวลาเริ่มต้น (${next.startTime})`);
      return false;
    }
    setTimeError('');
    return true;
  };

  const doCancel = (reason) => {
    if (!cancelTarget) return;
    patchRow(cancelTarget.id, { cancelledAt: stampNow(), cancelReason: reason });
    appendAudit({
      hn, visitId, category: 'problem', field: `ยกเลิกหัตถการ ${cancelTarget.name}`,
      oldValue: 'บันทึกไว้', newValue: `ยกเลิก — ${reason}`,
    });
    setCancelTarget(null);
  };

  const saveNote = () => {
    if (noteBody.trim().length < 10) return;
    addTreatmentNote({
      hn, visitId, type: 'treatment',
      body: `${noteTarget?.name ? `[${noteTarget.name}] ` : ''}${noteBody.trim()}`,
    });
    setNoteBody('');
    setNoteTarget(null);
  };

  const toggleNursing = (a) => setForm((f) => {
    const cur = f.nursingActivities || {};
    const next = { ...cur };
    if (next[a.key]) delete next[a.key];
    else next[a.key] = { qty: 1, billable: a.billable, price: a.price, claim: a.claim ?? 0, label: a.label };
    appendAudit({
      hn, visitId, category: 'problem', field: `กิจกรรมพยาบาล — ${a.label}`,
      oldValue: cur[a.key] ? 'บันทึกไว้' : 'ยังไม่บันทึก',
      newValue: next[a.key] ? 'บันทึกแล้ว' : 'ยกเลิกการบันทึก',
    });
    return { ...f, nursingActivities: next };
  });

  const canClaim = rightsClaimable(patient?.rights);

  const money = useMemo(() => {
    let total = 0; let claim = 0;
    rows.forEach((r) => {
      if (r.cancelledAt) return;
      const q = Number(r.qty || 1);
      total += (Number(r.unitPrice) || 0) * q;
      if (canClaim) claim += (Number(r.claimPerUnit) || 0) * q;
    });
    Object.values(nursing).forEach((n) => {
      if (!n.billable) return;
      const q = Number(n.qty || 1);
      total += (Number(n.price) || 0) * q;
      /* กิจกรรมที่บันทึกไว้ก่อนมี field `claim` จะไม่มีค่า — ตกกลับไปที่ catalog */
      const perUnitClaim = n.claim != null
        ? Number(n.claim) || 0
        : Number(NURSING_ACTIVITIES.find((a) => a.label === n.label)?.claim || 0);
      if (canClaim) claim += perUnitClaim * q;
    });
    return { total, claim, patientPay: total - claim };
  }, [rows, nursing, canClaim]);

  const columns = [
    {
      key: 'seq', header: 'ลำดับ', width: 80,
      render: (r) => <span style={PANEL_VALUE_STYLE}>{rows.indexOf(r) + 1}</span>,
    },
    {
      key: 'start', header: 'วัน-เวลาที่เริ่มต้น', width: 240,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <InputField
            value={r.startDate} onChange={(v) => patchRow(r.id, { startDate: v })}
            disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false}
            placeholder='6 พ.ค. 2569'
          />
          <InputField
            value={r.startTime} onChange={(v) => patchRow(r.id, { startTime: v })}
            disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false}
            placeholder='10:30'
          />
        </div>
      ),
    },
    {
      key: 'end', header: 'วัน-เวลาสิ้นสุด · รวมเวลา', width: 250,
      render: (r) => {
        const mins = minutesBetween(r.startTime, r.endTime);
        const invalid = mins != null && mins < 0 && r.startDate === r.endDate;
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <InputField
              value={r.endDate} onChange={(v) => { if (validateTime(r, { endDate: v })) patchRow(r.id, { endDate: v }); }}
              disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false}
              placeholder='6 พ.ค. 2569'
            />
            <InputField
              value={r.endTime} onChange={(v) => { validateTime(r, { endTime: v }); patchRow(r.id, { endTime: v }); }}
              disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false}
              placeholder='10:55'
              error={invalid ? 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่มต้น' : undefined}
            />
            <span style={PANEL_LABEL_STYLE}>
              รวมเวลา: {mins == null ? '—' : invalid ? 'ค่าไม่ถูกต้อง' : `${mins} นาที`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'site', header: 'ตำแหน่งที่ทำ', width: 220,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <InputField
            value={r.site} onChange={(v) => patchRow(r.id, { site: v })}
            disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false}
            placeholder='เช่น ปลายแขนซ้าย'
          />
          {onOpenBodyDiagram ? (
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='accessibility_new' onClick={onOpenBodyDiagram}>
              ระบุตำแหน่งบนภาพร่างกาย
            </NeutralSubdueButton>
          ) : null}
        </div>
      ),
    },
    {
      key: 'name', header: 'หัตถการ (ICD-9-CM)', flex: 1,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!!r.cancelledAt) }}>{r.name}</span>
          {r.uncoded || !r.code
            ? <StatusBadge style='warning' size='small' icon='help'>{UNCODED_LABEL}</StatusBadge>
            : <ColorfulBadge style='blue' size='small' width='hug'>ICD-9-CM {r.code}</ColorfulBadge>}
          {r.cancelledAt ? <CancelledMark at={r.cancelledAt} reason={r.cancelReason} label='ยกเลิกหัตถการ' /> : null}
        </div>
      ),
    },
    {
      key: 'qty', header: 'จำนวน / หน่วย', width: 160,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <InputField
            value={String(r.qty ?? 1)} onChange={(v) => patchRow(r.id, { qty: Number(v) || 1 })}
            disabled={!canEdit || !!r.cancelledAt} showLabel={false} showLeadingIcon={false} placeholder='1'
          />
          <span style={PANEL_LABEL_STYLE}>{r.unit || 'ครั้ง'}</span>
        </div>
      ),
    },
    {
      key: 'price', header: 'ราคา/หน่วย · เบิกได้', width: 190,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>{baht(r.unitPrice)} บาท</span>
          <span style={PANEL_LABEL_STYLE}>เบิกได้ {baht(r.claimPerUnit)} / หน่วย</span>
          <span style={PANEL_LABEL_STYLE}>รวม {baht((Number(r.unitPrice) || 0) * (Number(r.qty) || 1))} บาท</span>
        </div>
      ),
    },
    {
      key: 'performer', header: 'ผู้ทำหัตถการ', width: 250,
      render: (r) => (
        <Select
          value={r.performer}
          onChange={(v) => patchRow(r.id, { performer: v })}
          disabled={!canEdit || !!r.cancelledAt}
          options={PERFORMERS}
          placeholder='เลือกผู้ทำหัตถการ'
          showLabel={false}
          showHelperText={false}
        />
      ),
    },
    {
      key: 'actions', header: '', width: 260,
      render: (r) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.cancelledAt ? (
            <GuardedAction allowed={canEdit}>
              <NeutralSubdueButton
                variant='outline' size='sm' leadingIcon='undo'
                onClick={() => patchRow(r.id, { cancelledAt: '', cancelReason: '' })}
              >
                กู้คืน
              </NeutralSubdueButton>
            </GuardedAction>
          ) : (
            <>
              <GuardedAction allowed={canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='note_add' onClick={() => setNoteTarget(r)}>
                  บันทึกโน้ต
                </NeutralSubdueButton>
              </GuardedAction>
              <GuardedAction allowed={canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='replay' onClick={() => setReopenTarget(r)}>
                  Re-Operation
                </NeutralSubdueButton>
              </GuardedAction>
              <GuardedAction allowed={canEdit}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(r)}>
                  ยกเลิก
                </NeutralSubdueButton>
              </GuardedAction>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── ค้นหาและเพิ่มหัตถการ ─────────────────────────────── */}
      <PanelCard
        title='เพิ่มรายการหัตถการ'
        subtitle='ค้นด้วยรหัส ICD-9-CM หรือชื่อหัตถการ (ไทย/อังกฤษ) — ค้นไม่พบให้บันทึกเป็นข้อความไว้ก่อนแล้วกลับมาลงรหัสภายหลัง'
      >
        <InputField
          label='ค้นหารหัสหัตถการ (ICD-9-CM)'
          value={query}
          onChange={setQuery}
          leadingIcon='search'
          disabled={!canEdit}
          placeholder='เช่น 86.59 หรือ เย็บแผล หรือ debridement'
          helperText='เลือกรายการที่ตรงเพื่อเพิ่มเข้าบันทึกหัตถการของการตรวจครั้งนี้'
        />

        {query.trim() && hits.length === 0 ? (
          <PanelEmptyState
            icon='search_off'
            title={`ไม่พบรหัสหัตถการที่ตรงกับ "${query}"`}
            subtitle='ลองพิมพ์คำที่สั้นลง หรือบันทึกเป็นข้อความไว้ก่อนแล้วกลับมาลงรหัสภายหลัง'
            action={
              <div className='flex flex-wrap items-center justify-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='backspace' onClick={() => setQuery('')}>
                  ล้างคำค้น
                </NeutralSubdueButton>
                <GuardedAction allowed={canEdit}>
                  <BrandButton
                    variant='outline' size='sm' leadingIcon='edit_note'
                    onClick={() => { setUncodedText(query); setUncodedOpen(true); }}
                  >
                    บันทึกเป็นข้อความ ({UNCODED_LABEL})
                  </BrandButton>
                </GuardedAction>
              </div>
            }
          />
        ) : null}

        {hits.length > 0 ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {hits.map((p) => (
              <button
                key={p.code}
                type='button'
                disabled={!canEdit}
                onClick={() => addProcedure(p)}
                className='flex flex-wrap items-center justify-between w-full text-left'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  cursor: canEdit ? 'pointer' : 'not-allowed',
                }}
              >
                <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <span style={PANEL_VALUE_STYLE}>{p.nameTh}</span>
                  <span style={PANEL_LABEL_STYLE}>{p.nameEn}</span>
                </span>
                <span className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <ColorfulBadge style='blue' size='small' width='hug'>ICD-9-CM {p.code}</ColorfulBadge>
                  <span style={PANEL_LABEL_STYLE}>{baht(p.price)} บาท · เบิกได้ {baht(p.claim)}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </PanelCard>

      {/* ── ตารางหัตถการ ─────────────────────────────────────── */}
      <PanelCard
        title='รายการหัตถการที่ทำในการตรวจครั้งนี้'
        subtitle='คอลัมน์ตามคู่มือระบบคลินิกตรวจรักษา §2.4 — แก้ไขได้ทุกช่อง การยกเลิกจะขีดฆ่าไว้พร้อมเหตุผล'
        action={<CountLabel n={rows.filter((r) => !r.cancelledAt).length} unit='รายการ' />}
      >
        {timeError ? (
          <PanelAlert tone='error' icon='schedule' title='เวลาไม่ถูกต้อง'>{timeError}</PanelAlert>
        ) : null}

        {rows.length === 0 ? (
          <PanelEmptyState
            icon='medical_services'
            title='ยังไม่มีรายการหัตถการที่สั่ง'
            subtitle='กรุณาสั่งหัตถการ — ค้นหารหัส ICD-9-CM จากช่องด้านบนเพื่อเพิ่มรายการ'
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
            </div>
            {rows.filter((r) => !r.cancelledAt).map((r) => (
              <SuggestibleTextarea
                key={`detail-${r.id}`}
                voice
                label={`รายละเอียดการทำหัตถการ — ${r.name}`}
                value={r.detail || ''}
                onChange={(e) => patchRow(r.id, { detail: typeof e === 'string' ? e : e?.target?.value ?? '' })}
                suggestions={PROC_DETAIL_SUGGESTIONS}
                minChars={2}
                height={120}
                minHeight={88}
                disabled={!canEdit}
                popoverAriaLabel='ตัวอย่างรายละเอียดการทำหัตถการ'
                placeholder='ขั้นตอนที่ทำ วัสดุที่ใช้ และการตอบสนองของผู้รับบริการ'
              />
            ))}
          </>
        )}
      </PanelCard>

      {/* ── กิจกรรมพยาบาล ────────────────────────────────────── */}
      <PanelCard
        title='กิจกรรมพยาบาล'
        subtitle='แยกกลุ่มมีค่าใช้จ่าย (ไหลเข้ายอดรวม) และไม่มีค่าใช้จ่าย (บันทึกอย่างเดียว) ตามคู่มือ §2.4'
        action={<CountLabel n={Object.keys(nursing).length} unit='กิจกรรม' />}
      >
        <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>กลุ่มมีค่าใช้จ่าย</span>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {NURSING_ACTIVITIES.filter((a) => a.billable).map((a) => (
            <div key={a.key} className='flex flex-wrap items-center justify-between w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <Checkbox
                label={a.label}
                checked={!!nursing[a.key]}
                disabled={!canEdit}
                onChange={() => toggleNursing(a)}
              />
              <span style={PANEL_LABEL_STYLE}>
                {baht(a.price)} บาท · {canClaim ? `เบิกได้ ${baht(a.claim)} บาท` : 'เบิกไม่ได้ (ชำระเอง)'}
              </span>
            </div>
          ))}
        </div>
        <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>กลุ่มไม่มีค่าใช้จ่าย</span>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {NURSING_ACTIVITIES.filter((a) => !a.billable).map((a) => (
            <Checkbox
              key={a.key}
              label={a.label}
              checked={!!nursing[a.key]}
              disabled={!canEdit}
              onChange={() => toggleNursing(a)}
            />
          ))}
        </div>

        <SuggestibleTextarea
          voice
          label='กิจกรรมอื่น ๆ'
          value={form?.nursingOther || ''}
          onChange={(e) => setForm((f) => ({
            ...f, nursingOther: typeof e === 'string' ? e : e?.target?.value ?? '',
          }))}
          suggestions={PROGRESS_SUGGESTIONS}
          minChars={2}
          height={110}
          minHeight={80}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างกิจกรรมพยาบาลอื่น ๆ'
          placeholder='กิจกรรมที่ไม่มีในรายการด้านบน'
        />

        <div
          className='flex flex-wrap items-center justify-end w-full'
          style={{
            gap: 'var(--dim-space-600, 24px)',
            background: 'var(--surface-table-footer, var(--brand-p100, #E2F3EB))',
            borderRadius: 'var(--dim-radius-200, 8px)',
            paddingTop: 'var(--dim-space-300, 12px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            paddingBottom: 'var(--dim-space-300, 12px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-bold)',
            color: 'var(--text-table-footer, var(--brand-p800, #004C31))',
          }}
        >
          <span>รวมค่าหัตถการและกิจกรรมพยาบาล {baht(money.total)} บาท</span>
          <span>รวมเบิกได้ {baht(money.claim)} บาท</span>
          <span style={{
            color: money.patientPay > 0
              ? 'var(--text-statusbadge-warning, #C2410C)'
              : 'var(--text-table-footer, var(--brand-p800, #004C31))',
          }}>
            ต้องชำระเอง {baht(money.patientPay)} บาท
          </span>
        </div>
      </PanelCard>

      {/* บันทึกเป็นข้อความเมื่อค้นรหัสไม่พบ */}
      <AlertDialog
        open={uncodedOpen}
        type='info'
        title={`บันทึกหัตถการเป็นข้อความ (${UNCODED_LABEL})`}
        description='ใช้เมื่อยังหารหัส ICD-9-CM ที่ตรงไม่ได้ — ระบบจะติดป้ายเตือนไว้และให้กลับมาลงรหัสภายหลังได้'
        confirmLabel='บันทึกเป็นข้อความ'
        cancelLabel='ยกเลิก'
        onConfirm={addUncoded}
        onCancel={() => { setUncodedText(''); setUncodedOpen(false); }}
        onClose={() => setUncodedOpen(false)}
      >
        <InputField
          label='ชื่อหัตถการ'
          required
          value={uncodedText}
          onChange={setUncodedText}
          showLeadingIcon={false}
          placeholder='เช่น ดามนิ้วมือด้วยเฝือกอ่อน'
          error={uncodedText.trim() ? undefined : 'ต้องระบุชื่อหัตถการ'}
        />
      </AlertDialog>

      {/* บันทึกโน้ตหัตถการ */}
      <AlertDialog
        open={!!noteTarget}
        type='info'
        title={`บันทึกความคืบหน้าหัตถการ — ${noteTarget?.name || ''}`}
        description='บันทึกจะถูกเก็บเป็นบันทึกทางคลินิกประเภท "บันทึกการทำหัตถการ (Treatment)" และไปแสดงที่แท็บบันทึกทางคลินิกอัตโนมัติ'
        confirmLabel='บันทึกโน้ต'
        cancelLabel='ยกเลิก'
        onConfirm={saveNote}
        onCancel={() => { setNoteTarget(null); setNoteBody(''); }}
        onClose={() => { setNoteTarget(null); setNoteBody(''); }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <SuggestibleTextarea
            voice
            required
            label='บันทึกความคืบหน้า'
            value={noteBody}
            onChange={(e) => setNoteBody(typeof e === 'string' ? e : e?.target?.value ?? '')}
            suggestions={PROGRESS_SUGGESTIONS}
            minChars={2}
            height={130}
            minHeight={96}
            popoverAriaLabel='ตัวอย่างบันทึกความคืบหน้า'
            placeholder='สภาพแผล การตอบสนอง และแผนติดตาม'
          />
          {noteBody.trim().length > 0 && noteBody.trim().length < 10 ? (
            <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
              บันทึกต้องยาวอย่างน้อย 10 ตัวอักษรจึงจะมีความหมายทางคลินิก
            </span>
          ) : null}
        </div>
      </AlertDialog>

      {/* Re-Operation */}
      <AlertDialog
        open={!!reopenTarget}
        type='info'
        title='ทำซ้ำหัตถการเดิม (Re-Operation)'
        description={reopenTarget
          ? `สร้างรายการใหม่จาก "${reopenTarget.name}" โดยคัดลอกรหัส ตำแหน่ง จำนวน และราคา แล้วตั้งวัน-เวลาเริ่มต้นเป็นตอนนี้`
          : ''}
        confirmLabel='สร้างรายการใหม่'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          const src = reopenTarget;
          setRows((rs) => [...rs, {
            ...blankProcedure(),
            code: src.code, name: src.name, uncoded: src.uncoded,
            site: src.site, qty: src.qty, unit: src.unit,
            unitPrice: src.unitPrice, claimPerUnit: src.claimPerUnit,
            performer: src.performer,
            startDate: stampNow().split(' · ')[0],
            startTime: stampNow().split(' · ')[1] || '',
          }]);
          appendAudit({
            hn, visitId, category: 'problem', field: `Re-Operation — ${src.name}`,
            oldValue: '—', newValue: `ทำซ้ำโดย ${CURRENT_CLINICIAN.name}`,
          });
          setReopenTarget(null);
        }}
        onCancel={() => setReopenTarget(null)}
        onClose={() => setReopenTarget(null)}
      />

      {/* ยกเลิกหัตถการ */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกรายการหัตถการ'
        description='รายการจะถูกขีดฆ่าไว้พร้อมเหตุผล ไม่ลบทิ้ง เพื่อคงร่องรอยการรักษาและการเรียกเก็บ'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'บันทึกผิดรายการ — จะบันทึกรายการที่ถูกต้องแทน',
          'ยังไม่ได้ทำหัตถการจริง เลื่อนไปครั้งหน้า',
          'ผู้รับบริการปฏิเสธการทำหัตถการหลังอธิบายความเสี่ยง',
        ]}
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />
    </div>
  );
};

export default ProcedureOrderPanel;
