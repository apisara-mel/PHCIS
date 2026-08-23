import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import SuccessToast from '@/components/toast/SuccessToast';
import { HBarList } from '@/components/graph/Charts';
import PHCIS_CHART from '@/data/phcisChartPalette';
import {
  SwSectionCard, SwField, SwBanner, SwEmptyHint, SwInlineSearch,
  SwAuditLine, SwConfidentialMask, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_CURRENT_USER,
  searchSwPeople,
  calcAgeYears,
  formatCid,
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';
import {
  SW_NUTRI_GROUPS,
  SW_NUTRI_TARGETS,
  SW_NUTRI_END_REASONS,
  SW_NAF_ITEMS,
  SW_NAF_MAX,
  SW_MNA_ITEMS,
  SW_MNA_MAX,
  isNafComplete,
  isMnaComplete,
  scoreNaf,
  scoreMna,
  nutriMaterialOptions,
  findNutriMaterial,
  resolveNutriMaterialLabel,
  resolveSwNutriGroup,
  assessSwNutritionCase,
  ageInMonths,
  formatAgeYm,
  getSwNutritionCases,
  getSwNutritionCase,
  saveSwNutritionCase,
  addSwNutritionVisit,
  updateSwNutritionVisit,
  cancelSwNutritionVisit,
  restoreSwNutritionVisit,
  cancelSwNutritionCase,
  reactivateSwNutritionCase,
  endSwNutritionCase,
  reopenSwNutritionCase,
} from '@/data/socialWorkNutrition';
import {
  saveSwIssue, getSwLotsForMaterial, findSwMaterial,
} from '@/data/socialWorkSupplies';

/* SocialWorkNutritionPage — เมนูที่ 5 "การช่วยเหลือด้านโภชนาการ"
   (TOR §1.10.11.3 · §1.10.11.5 · มติ คทง.10 ครั้งที่ 5 ข้อ 5.1–5.4).

   แท็บ 4 กลุ่ม:
     เด็ก 0–19 ปี   — โปรแกรมคำนวณเทียบเกณฑ์อ้างอิงการเจริญเติบโต (ห้ามพิมพ์ทับ)
     หญิงตั้งครรภ์  — เทียบกราฟการเพิ่มน้ำหนักตามอายุครรภ์ + ภาวะโลหิตจาง
     ผู้ใหญ่        — Modified NAF (A/B/C)
     ผู้สูงอายุ     — MNA Assessment (24–30 / 17–23.5 / < 17)

   ทุกกลุ่ม: วัสดุที่ให้การช่วยเหลือ = dropdown · ปริมาณ = ขนาด (dropdown) +
   จำนวน + หน่วย (dropdown) · ตารางประวัติการช่วยเหลือรายครั้ง · การยุติการ
   ช่วยเหลือเลือกจาก dropdown เหตุผลเฉพาะกลุ่ม แล้ว freeze เคสเป็นอ่านอย่างเดียว.

   ครบ 4 กริยา: แสดง · บันทึก · แก้ไข · ยกเลิก (เหตุผลบังคับ + กู้คืนได้)
   ทั้งระดับเคสและระดับรายการช่วยเหลือรายครั้ง — พร้อม audit ผู้บันทึก/เวลา.
   การจ่ายวัสดุถูกส่งเข้าบัญชี "จ่ายออก" ของหน้ารับ-จ่ายวัสดุ และเตือนเมื่อ
   จำนวนที่จ่ายเกินยอดคงเหลือในคลัง. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'การช่วยเหลือด้านโภชนาการ'];

const EMPTY_CASE = {
  id: '',
  group: 'child',
  hn: '',
  sn: '',
  name: '',
  cid: '',
  birthDate: '',
  sex: '',
  caseNo: '',
  birthWeightG: '',
  heightCm: '',
  prePregnancyKg: '',
  gestWeeks: '',
  hct: '',
  hb: '',
  target: '',
  naf: {},
  mna: {},
};

const EMPTY_VISIT = {
  id: '',
  date: todayIso(),
  weightKg: '',
  heightCm: '',
  gestWeeks: '',
  hct: '',
  hb: '',
  material: '',
  size: '',
  qty: '',
  unit: '',
  note: '',
};

const TONE_BADGE = { positive: 'green', warning: 'yellow', danger: 'red', neutral: 'grey' };

const cancelledText = {
  textDecoration: 'line-through',
  color: 'var(--text-content-tertiary, #858C92)',
};

/* แถวคำถามของแบบประเมิน (NAF / MNA) — radio แบบ chip */
const AssessmentGrid = ({ items, answers, onPick, disabled }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
    {items.map((item, idx) => (
      <div
        key={item.key}
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-200, 8px)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          background: idx % 2 === 0
            ? 'var(--surface-card-quaternary, #F9FBFB)'
            : 'var(--surface-card-100, #FFFFFF)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
        }}
      >
        <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
          {`${idx + 1}. ${item.label}`}
        </span>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {item.options.map((opt) => {
            const active = answers?.[item.key] === opt.value;
            return (
              <button
                key={`${item.key}-${opt.value}`}
                type='button'
                disabled={disabled}
                onClick={() => onPick(item.key, opt.value)}
                style={{
                  paddingTop: 'var(--dim-space-150, 6px)',
                  paddingBottom: 'var(--dim-space-150, 6px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-full, 999px)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs, 12px)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  border: `var(--dim-stroke-100, 1px) solid ${active
                    ? 'var(--border-brandPrimary-default, #007549)'
                    : 'var(--border-neutral-tertiary, #E2E4E6)'}`,
                  background: active
                    ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                    : 'var(--surface-card-100, #FFFFFF)',
                  color: active
                    ? 'var(--text-brandPrimary-default, #007549)'
                    : 'var(--text-content-secondary, #636B72)',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {`${opt.label} (${opt.value})`}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

const SocialWorkNutritionPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState('child');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedId, setSelectedId] = useState(null);
  const [caseEditing, setCaseEditing] = useState(null); /* null | 'new' | id */
  const [caseForm, setCaseForm] = useState(EMPTY_CASE);
  const [caseErrors, setCaseErrors] = useState({});

  const [visitForm, setVisitForm] = useState(EMPTY_VISIT);
  const [visitErrors, setVisitErrors] = useState({});
  const [visitEditingId, setVisitEditingId] = useState(null);

  const [endTarget, setEndTarget] = useState(null);
  const [endReason, setEndReason] = useState('');
  const [endError, setEndError] = useState('');
  const [reopenTarget, setReopenTarget] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null); /* { kind: 'case'|'visit', row } */
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [toast, setToast] = useState('');
  const [, setRightsTick] = useState(0);

  const canWrite = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allCases = useMemo(() => getSwNutritionCases(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selected = useMemo(() => (selectedId ? getSwNutritionCase(selectedId) : null), [selectedId, tick]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCases.filter((c) => {
      if (tab !== 'all' && c.group !== tab) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return [c.hn, c.sn, c.name, c.cid, c.caseNo].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [allCases, tab, statusFilter, search]);

  const tabs = useMemo(() => ([
    ...SW_NUTRI_GROUPS.map((g) => ({
      key: g.value,
      label: `${g.label} (${allCases.filter((c) => c.group === g.value).length})`,
      icon: g.icon,
    })),
    { key: 'all', label: `ทั้งหมด (${allCases.length})`, icon: 'apps' },
  ]), [allCases]);

  const summaryCards = useMemo(() => ([
    { key: 'active', label: 'เคสที่อยู่ระหว่างช่วยเหลือ', value: String(allCases.filter((c) => c.status === 'active').length), color: 'info', icon: 'nutrition' },
    { key: 'ended', label: 'ยุติการช่วยเหลือแล้ว', value: String(allCases.filter((c) => c.status === 'ended').length), color: 'positive', icon: 'task_alt' },
    { key: 'cancelled', label: 'ยกเลิกเคส', value: String(allCases.filter((c) => c.status === 'cancelled').length), color: 'danger', icon: 'cancel' },
    { key: 'visits', label: 'ครั้งที่ให้การช่วยเหลือรวม', value: String(allCases.reduce((s, c) => s + (c.visits || []).filter((v) => !v.cancelled).length, 0)), color: 'positive', icon: 'inventory_2' },
    { key: 'risk', label: 'เคสที่ผลประเมินยังต้องช่วยเหลือ', value: String(allCases.filter((c) => c.status === 'active' && assessSwNutritionCase(c)?.needsHelp).length), color: 'warning', icon: 'monitor_weight' },
  ]), [allCases]);

  /* ── ฟอร์มเคส ─────────────────────────────────────────────────── */
  const setCase = (key) => (value) => {
    setCaseForm((f) => ({ ...f, [key]: value }));
    setCaseErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openCreateCase = () => {
    setCaseForm({ ...EMPTY_CASE, group: tab === 'all' ? 'child' : tab });
    setCaseErrors({});
    setCaseEditing('new');
    setSelectedId(null);
  };

  const openEditCase = (row) => {
    setCaseForm({ ...EMPTY_CASE, ...row, naf: row.naf || {}, mna: row.mna || {} });
    setCaseErrors({});
    setCaseEditing(row.id);
  };

  const pickPatient = (hn) => {
    const person = searchSwPeople(hn).find((p) => p.hn === hn);
    if (!person) {
      setCaseErrors((e) => ({ ...e, hn: 'ไม่พบ HN นี้ในระบบเวชระเบียน' }));
      return;
    }
    setCaseForm((f) => ({
      ...f,
      hn: person.hn,
      sn: person.sn,
      name: person.name,
      cid: person.cid,
      birthDate: person.birthDate,
      sex: person.sex,
    }));
    setCaseErrors((e) => ({ ...e, hn: undefined }));
  };

  const validateCase = () => {
    const next = {};
    if (!caseForm.hn) next.hn = 'ระบุ HN ผู้รับการช่วยเหลือ';
    if (!caseForm.name) next.name = 'ระบุชื่อ-นามสกุล (เชื่อมจากเวชระเบียน)';
    if (!caseForm.target) next.target = 'เลือกกลุ่มเป้าหมายที่ช่วยเหลือ (บันทึกเฉพาะครั้งแรก)';
    if (caseForm.group === 'pregnant') {
      if (!caseForm.heightCm) next.heightCm = 'ระบุส่วนสูง';
      if (!caseForm.prePregnancyKg) next.prePregnancyKg = 'ระบุน้ำหนักก่อนตั้งครรภ์';
      if (!caseForm.gestWeeks) next.gestWeeks = 'ระบุอายุครรภ์ (สัปดาห์)';
    }
    if (caseForm.group === 'adult' && !isNafComplete(caseForm.naf)) {
      next.naf = 'ตอบแบบประเมิน Modified NAF ให้ครบทุกข้อ';
    }
    if (caseForm.group === 'elderly' && !isMnaComplete(caseForm.mna)) {
      next.mna = 'ตอบแบบประเมิน MNA ให้ครบทุกข้อ';
    }
    setCaseErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitCase = () => {
    if (!canWrite || !validateCase()) return;
    const { saved, isNew } = saveSwNutritionCase(caseForm);
    setTick((t) => t + 1);
    setCaseEditing(null);
    setSelectedId(saved.id);
    setToast(isNew ? 'บันทึกเคสการช่วยเหลือด้านโภชนาการแล้ว' : 'แก้ไขเคสการช่วยเหลือด้านโภชนาการแล้ว');
  };

  /* ── ฟอร์มการช่วยเหลือรายครั้ง ────────────────────────────────── */
  const setVisit = (key) => (value) => {
    setVisitForm((f) => ({ ...f, [key]: value }));
    setVisitErrors((e) => ({ ...e, [key]: undefined }));
  };

  const materialMeta = findNutriMaterial(selected?.group, visitForm.material);

  const stockRemaining = useMemo(() => {
    if (!materialMeta?.supplyCode) return null;
    return getSwLotsForMaterial(materialMeta.supplyCode)
      .reduce((s, l) => s + (Number(l.remaining) || 0), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialMeta, tick]);

  const overStock = stockRemaining != null && Number(visitForm.qty) > stockRemaining;

  const validateVisit = () => {
    const next = {};
    if (!visitForm.date) next.date = 'เลือกวันที่ช่วยเหลือ';
    if (!visitForm.material) next.material = 'เลือกวัสดุที่ให้การช่วยเหลือ';
    if (!visitForm.size) next.size = 'เลือกขนาด';
    const qty = Number(visitForm.qty);
    if (!visitForm.qty || Number.isNaN(qty) || qty <= 0) next.qty = 'ระบุจำนวนเป็นตัวเลขมากกว่า 0';
    if (!visitForm.unit) next.unit = 'เลือกหน่วย';
    if (selected?.group === 'child' || selected?.group === 'pregnant' || selected?.group === 'adult' || selected?.group === 'elderly') {
      if (!visitForm.weightKg) next.weightKg = 'ระบุน้ำหนักปัจจุบัน (กิโลกรัม)';
    }
    if (selected?.group === 'child' && !visitForm.heightCm) next.heightCm = 'ระบุส่วนสูง/ความยาว (เซนติเมตร)';
    setVisitErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitVisit = () => {
    if (!canWrite || !selected || !validateVisit()) return;
    const payload = {
      ...visitForm,
      weightKg: Number(visitForm.weightKg) || undefined,
      heightCm: visitForm.heightCm ? Number(visitForm.heightCm) : undefined,
      gestWeeks: visitForm.gestWeeks ? Number(visitForm.gestWeeks) : undefined,
      hct: visitForm.hct ? Number(visitForm.hct) : undefined,
      hb: visitForm.hb ? Number(visitForm.hb) : undefined,
      qty: Number(visitForm.qty),
    };
    if (visitEditingId) {
      updateSwNutritionVisit(selected.id, visitEditingId, payload);
      setToast('แก้ไขรายการช่วยเหลือรายครั้งแล้ว');
    } else {
      addSwNutritionVisit(selected.id, payload);
      /* เชื่อมบัญชีจ่ายออกของหน้ารับ-จ่ายวัสดุ (มติข้อ 21) */
      if (materialMeta?.supplyCode) {
        const lot = getSwLotsForMaterial(materialMeta.supplyCode)[0];
        saveSwIssue({
          issueDate: payload.date,
          requesterId: '',
          hn: selected.hn,
          name: selected.name,
          materialCode: materialMeta.supplyCode,
          lot: lot?.lot || '—',
          qty: payload.qty,
          unit: payload.unit,
          note: `ช่วยเหลือด้านโภชนาการ (${resolveSwNutriGroup(selected.group)}) — ${materialMeta.label} ${payload.size}`,
        });
      }
      setToast('บันทึกการช่วยเหลือรายครั้งแล้ว — ส่งรายการเข้าบัญชีจ่ายออกของคลังวัสดุด้วย');
    }
    setVisitForm({ ...EMPTY_VISIT, date: todayIso() });
    setVisitEditingId(null);
    setVisitErrors({});
    setTick((t) => t + 1);
  };

  const startEditVisit = (v) => {
    setVisitEditingId(v.id);
    setVisitForm({
      ...EMPTY_VISIT,
      ...v,
      weightKg: String(v.weightKg ?? ''),
      heightCm: String(v.heightCm ?? ''),
      gestWeeks: String(v.gestWeeks ?? ''),
      hct: String(v.hct ?? ''),
      hb: String(v.hb ?? ''),
      qty: String(v.qty ?? ''),
    });
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }
    if (cancelTarget.kind === 'case') {
      cancelSwNutritionCase(cancelTarget.row.id, cancelReason.trim());
      setToast('ยกเลิกเคสแล้ว — รายการยังแสดงในตารางและกู้คืนได้');
    } else {
      cancelSwNutritionVisit(selected.id, cancelTarget.row.id, cancelReason.trim());
      setToast('ยกเลิกรายการช่วยเหลือรายครั้งแล้ว');
    }
    setTick((t) => t + 1);
    setCancelTarget(null);
    setCancelReason('');
    setCancelError('');
  };

  const confirmEnd = () => {
    if (!endReason) {
      setEndError('เลือกเหตุผลการยุติการช่วยเหลือ');
      return;
    }
    endSwNutritionCase(endTarget.id, endReason);
    setTick((t) => t + 1);
    setEndTarget(null);
    setEndReason('');
    setEndError('');
    setToast('ยุติการช่วยเหลือแล้ว — เคสถูกล็อกเป็นอ่านอย่างเดียว ประวัติยังดูได้');
  };

  const confirmReopen = () => {
    if (!reopenReason.trim()) {
      setReopenError('ระบุเหตุผลการเปิดเคสใหม่');
      return;
    }
    reopenSwNutritionCase(reopenTarget.id, reopenReason.trim());
    setTick((t) => t + 1);
    setReopenTarget(null);
    setReopenReason('');
    setReopenError('');
    setToast('เปิดเคสใหม่แล้ว — บันทึกการช่วยเหลือต่อได้');
  };

  const assessment = selected ? assessSwNutritionCase(selected) : null;
  const readOnlyCase = !!selected && (selected.status === 'ended' || selected.status === 'cancelled');

  /* ── คอลัมน์ตารางเคส ─────────────────────────────────────────── */
  const dim = (r) => (r.status === 'cancelled' ? cancelledText : undefined);

  const caseColumns = useMemo(() => ([
    { key: 'hn', label: 'HN', render: (r) => <span style={dim(r)}>{r.hn}</span> },
    { key: 'sn', label: 'SN', render: (r) => <span style={dim(r)}>{r.sn || '—'}</span> },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 190, render: (r) => <span style={dim(r)}>{r.name}</span> },
    { key: 'cid', label: 'เลขประจำตัวประชาชน', render: (r) => <span style={dim(r)}>{formatCid(r.cid)}</span> },
    {
      key: 'group',
      label: 'กลุ่ม',
      render: (r) => (
        <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{resolveSwNutriGroup(r.group)}</ColorfulBadge>
      ),
    },
    {
      key: 'age',
      label: 'อายุ',
      render: (r) => {
        if (!r.birthDate) return '—';
        return r.group === 'child'
          ? formatAgeYm(ageInMonths(r.birthDate))
          : `${calcAgeYears(r.birthDate)} ปี`;
      },
    },
    {
      key: 'assessment',
      label: 'ผลประเมินภาวะโภชนาการ (คำนวณอัตโนมัติ)',
      flex: true,
      minWidth: 300,
      render: (r) => {
        const a = assessSwNutritionCase(r);
        if (!a) {
          return (
            <span style={{ color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              ยังกรอกข้อมูลไม่ครบ — คำนวณไม่ได้
            </span>
          );
        }
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style={TONE_BADGE[a.tone] || 'grey'} size='small' hierarchy='secondary'>
              {a.needsHelp ? 'ต้องช่วยเหลือต่อ' : 'ภาวะโภชนาการปกติ'}
            </ColorfulBadge>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
              {a.summary}
            </span>
          </div>
        );
      },
    },
    {
      key: 'visits',
      label: 'ครั้งที่ช่วยเหลือ',
      render: (r) => <span style={dim(r)}>{`${(r.visits || []).filter((v) => !v.cancelled).length} ครั้ง`}</span>,
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        if (r.status === 'cancelled') {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกเคส</ColorfulBadge>
              {r.cancellation && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
                  <br />เหตุผล: {r.cancellation.reason}
                </span>
              )}
            </div>
          );
        }
        if (r.status === 'ended') {
          return (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยุติการช่วยเหลือ</ColorfulBadge>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {r.endedReason}
                <br />{`โดย ${r.endedBy} · ${formatSwDateTime(r.endedAt)}`}
              </span>
            </div>
          );
        }
        return <ColorfulBadge style='green' size='small' hierarchy='secondary'>อยู่ระหว่างช่วยเหลือ</ColorfulBadge>;
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); setCaseEditing(null); }}>
            แสดง
          </NeutralSubdueButton>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={(e) => { e.stopPropagation(); reactivateSwNutritionCase(r.id); setTick((t) => t + 1); setToast('เปิดใช้งานเคสอีกครั้งแล้ว'); }}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : r.status === 'ended' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='lock_open' onClick={(e) => { e.stopPropagation(); setReopenTarget(r); setReopenReason(''); setReopenError(''); }}>
              เปิดเคสใหม่
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); openEditCase(r); }}>
                แก้ไข
              </BrandSubdueButton>
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={(e) => { e.stopPropagation(); setCancelTarget({ kind: 'case', row: r }); setCancelReason(''); setCancelError(''); }}>
                ยกเลิก
              </DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, tick]);

  const visitColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่ช่วยเหลือ', render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{formatSwDate(v.date)}</span> },
    { key: 'weightKg', label: 'น้ำหนัก (กก.)', render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{v.weightKg ?? '—'}</span> },
    { key: 'heightCm', label: 'ส่วนสูง (ซม.)', render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{v.heightCm ?? '—'}</span> },
    {
      key: 'material',
      label: 'วัสดุที่ให้การช่วยเหลือ',
      flex: true,
      minWidth: 260,
      render: (v) => (
        <span style={v.cancelled ? cancelledText : undefined}>
          {resolveNutriMaterialLabel(selected?.group, v.material)}
        </span>
      ),
    },
    { key: 'size', label: 'ขนาด', render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{v.size}</span> },
    { key: 'qty', label: 'จำนวน', render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{`${v.qty} ${v.unit}`}</span> },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 240, render: (v) => <span style={v.cancelled ? cancelledText : undefined}>{v.note || '—'}</span> },
    {
      key: 'audit',
      label: 'ผู้บันทึก',
      sortable: false,
      render: (v) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {v.by}<br />{formatSwDateTime(v.at)}
          {v.editedAt && (<><br /><span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{`แก้ไข ${formatSwDateTime(v.editedAt)}`}</span></>)}
          {v.cancelled && (
            <><br /><span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>
              {`ยกเลิกโดย ${v.cancelled.by} · ${formatSwDateTime(v.cancelled.at)} · ${v.cancelled.reason}`}
            </span></>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (v) => {
        if (!canWrite || readOnlyCase) {
          return <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>อ่านอย่างเดียว</span>;
        }
        return v.cancelled ? (
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => { restoreSwNutritionVisit(selected.id, v.id); setTick((t) => t + 1); setToast('กู้คืนรายการช่วยเหลือแล้ว'); }}>
            เปิดใช้งาน
          </BrandSubdueButton>
        ) : (
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => startEditVisit(v)}>แก้ไข</BrandSubdueButton>
            <DangerSubdueButton size='sm' leadingIcon='block' onClick={() => { setCancelTarget({ kind: 'visit', row: v }); setCancelReason(''); setCancelError(''); }}>ยกเลิก</DangerSubdueButton>
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, readOnlyCase, selected]);

  const trendRows = useMemo(() => {
    if (!selected) return [];
    return (selected.visits || [])
      .filter((v) => !v.cancelled && v.weightKg)
      .map((v) => ({
        label: formatSwDate(v.date),
        value: Number(v.weightKg),
        segments: [{ value: Number(v.weightKg), color: PHCIS_CHART.teal, label: 'กก.' }],
      }));
  }, [selected]);

  const groupMeta = SW_NUTRI_GROUPS.find((g) => g.value === (selected?.group || caseForm.group));

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='การช่วยเหลือด้านโภชนาการ'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าแรก'
      summaryCards={summaryCards}
      tabs={tabs}
      tabVariant='pill'
      activeTab={tab}
      onTabChange={(v) => { setTab(v); setSelectedId(null); setCaseEditing(null); }}
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='inventory_2' onClick={() => history.push('/clinic/social-work/supplies')}>
            คลังวัสดุ
          </NeutralSubdueButton>
          <BrandButton size='sm' leadingIcon='add' disabled={!canWrite} onClick={openCreateCase}>
            เพิ่มเคสช่วยเหลือ
          </BrandButton>
        </div>
      )}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-500, 20px)',
        }}
      >
        {!canWrite && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — ดูข้อมูลได้แต่บันทึก แก้ไข
            ยุติการช่วยเหลือ หรือยกเลิกไม่ได้
          </SwBanner>
        )}

        {groupMeta && (
          <SwBanner tone='brand' icon='science'>
            {`เครื่องมือประเมินของกลุ่ม "${groupMeta.label}" คือ ${groupMeta.tool} — ระบบคำนวณและแปลผลให้อัตโนมัติ ผู้ใช้ไม่สามารถพิมพ์ทับผลแปลได้ (มติ คทง.10 ครั้งที่ 5)`}
          </SwBanner>
        )}

        {/* ── ฟอร์มเคส ─────────────────────────────────────────── */}
        {caseEditing && canWrite && (
          <SwSectionCard
            icon='person_add'
            title={caseEditing === 'new' ? 'เพิ่มเคสการช่วยเหลือด้านโภชนาการ' : `แก้ไขเคส ${caseForm.name}`}
          >
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <SwField label='กลุ่มการช่วยเหลือ' required minWidth={220}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={caseEditing !== 'new'}
                  value={caseForm.group}
                  onChange={(v) => { setCase('group')(v); setCase('target')(''); }}
                  options={SW_NUTRI_GROUPS}
                  placeholder='เลือกกลุ่ม'
                />
              </SwField>
              <SwField label='HN (เชื่อมจากเวชระเบียน)' required hint={caseErrors.hn} hintTone={caseErrors.hn ? 'error' : undefined} minWidth={240}>
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <InputField value={caseForm.hn} onChange={setCase('hn')} placeholder='เช่น 67-00031' error={!!caseErrors.hn} showHelperText={false} />
                  <NeutralSubdueButton size='sm' leadingIcon='person_search' onClick={() => pickPatient(caseForm.hn)}>ดึงข้อมูล</NeutralSubdueButton>
                </div>
              </SwField>
              <SwField label='SN (เชื่อม Intake ของ ส.ส.2)' minWidth={200}>
                <InputField value={caseForm.sn} onChange={setCase('sn')} placeholder='SN/2569/21/xxxx' />
              </SwField>
              <SwField label='ชื่อ-สกุล' required hint={caseErrors.name} hintTone={caseErrors.name ? 'error' : undefined} minWidth={220}>
                <InputField value={caseForm.name} onChange={setCase('name')} placeholder='เชื่อมจากเวชระเบียน' error={!!caseErrors.name} showHelperText={false} />
              </SwField>
              <SwField label='เลขประจำตัวประชาชน' minWidth={200}>
                <InputField value={caseForm.cid ? formatCid(caseForm.cid) : ''} onChange={() => {}} disabled placeholder='เชื่อมจากเวชระเบียน' />
              </SwField>
              <SwField label='วัน เดือน ปีเกิด' minWidth={200}>
                <DatePicker
                  showLabel={false}
                  value={caseForm.birthDate ? new Date(caseForm.birthDate) : null}
                  onChange={(d) => setCase('birthDate')(d ? toLocalIso(d) : '')}
                  placeholder='เชื่อมจากเวชระเบียน'
                />
              </SwField>
              <SwField label='เพศ' minWidth={140}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  value={caseForm.sex}
                  onChange={setCase('sex')}
                  options={[{ value: 'ชาย', label: 'ชาย' }, { value: 'หญิง', label: 'หญิง' }]}
                  placeholder='เลือกเพศ'
                />
              </SwField>
            </div>

            {caseForm.group === 'child' && (
              <SwField label='น้ำหนักแรกเกิด (กรัม) — บันทึกเฉพาะครั้งแรก' minWidth={260} grow={false}>
                <InputField type='number' value={caseForm.birthWeightG} onChange={setCase('birthWeightG')} placeholder='เช่น 2380' />
              </SwField>
            )}

            {caseForm.group === 'pregnant' && (
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ส่วนสูง (ซม.)' required hint={caseErrors.heightCm} hintTone={caseErrors.heightCm ? 'error' : undefined} minWidth={160}>
                  <InputField type='number' value={caseForm.heightCm} onChange={setCase('heightCm')} placeholder='158' error={!!caseErrors.heightCm} showHelperText={false} />
                </SwField>
                <SwField label='น้ำหนักก่อนตั้งครรภ์ (กก.)' required hint={caseErrors.prePregnancyKg} hintTone={caseErrors.prePregnancyKg ? 'error' : undefined} minWidth={200}>
                  <InputField type='number' value={caseForm.prePregnancyKg} onChange={setCase('prePregnancyKg')} placeholder='46' error={!!caseErrors.prePregnancyKg} showHelperText={false} />
                </SwField>
                <SwField label='อายุครรภ์ (สัปดาห์)' required hint={caseErrors.gestWeeks} hintTone={caseErrors.gestWeeks ? 'error' : undefined} minWidth={180}>
                  <InputField type='number' value={caseForm.gestWeeks} onChange={setCase('gestWeeks')} placeholder='28' error={!!caseErrors.gestWeeks} showHelperText={false} />
                </SwField>
                <SwField label='ค่าฮีมาโตคริต Hct (%)' minWidth={180}>
                  <InputField type='number' value={caseForm.hct} onChange={setCase('hct')} placeholder='31' />
                </SwField>
                <SwField label='ค่าฮีโมโกลบิน Hb (g/dl)' minWidth={180}>
                  <InputField type='number' value={caseForm.hb} onChange={setCase('hb')} placeholder='10.4' />
                </SwField>
              </div>
            )}

            {caseForm.group === 'adult' && (
              <SwField label='แบบประเมิน Modified NAF' required hint={caseErrors.naf} hintTone={caseErrors.naf ? 'error' : undefined}>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <AssessmentGrid
                    items={SW_NAF_ITEMS}
                    answers={caseForm.naf}
                    onPick={(k, v) => setCaseForm((f) => ({ ...f, naf: { ...f.naf, [k]: v } }))}
                  />
                  <SwBanner tone={isNafComplete(caseForm.naf) ? 'brand' : 'neutral'} icon='calculate'>
                    {isNafComplete(caseForm.naf)
                      ? `คะแนนรวม ${scoreNaf(caseForm.naf)} / ${SW_NAF_MAX} — ระบบแปลผลอัตโนมัติเมื่อบันทึก`
                      : `ตอบครบทุกข้อเพื่อให้ระบบคำนวณ (เต็ม ${SW_NAF_MAX} คะแนน)`}
                  </SwBanner>
                </div>
              </SwField>
            )}

            {caseForm.group === 'elderly' && (
              <SwField label='แบบประเมิน MNA (Mini Nutritional Assessment)' required hint={caseErrors.mna} hintTone={caseErrors.mna ? 'error' : undefined}>
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <AssessmentGrid
                    items={SW_MNA_ITEMS}
                    answers={caseForm.mna}
                    onPick={(k, v) => setCaseForm((f) => ({ ...f, mna: { ...f.mna, [k]: v } }))}
                  />
                  <SwBanner tone={isMnaComplete(caseForm.mna) ? 'brand' : 'neutral'} icon='calculate'>
                    {isMnaComplete(caseForm.mna)
                      ? `คะแนนรวม ${scoreMna(caseForm.mna)} / ${SW_MNA_MAX} — ระบบแปลผลอัตโนมัติเมื่อบันทึก`
                      : `ตอบครบทุกข้อเพื่อให้ระบบคำนวณ (เต็ม ${SW_MNA_MAX} คะแนน)`}
                  </SwBanner>
                </div>
              </SwField>
            )}

            <SwField
              label='กลุ่มเป้าหมายที่ช่วยเหลือ (บันทึกเฉพาะครั้งแรก)'
              required
              hint={caseErrors.target}
              hintTone={caseErrors.target ? 'error' : undefined}
            >
              <Select
                showLabel={false}
                searchable
                size='lg'
                value={caseForm.target}
                onChange={setCase('target')}
                options={SW_NUTRI_TARGETS[caseForm.group] || []}
                error={!!caseErrors.target}
                placeholder='เลือกกลุ่มเป้าหมาย'
              />
            </SwField>

            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <SwAuditLine by={SW_CURRENT_USER} at={new Date().toISOString()} label='ผู้บันทึก' formatDateTime={formatSwDateTime} />
              <div className='flex-1' />
              <NeutralSubdueButton leadingIcon='close' onClick={() => { setCaseEditing(null); setCaseErrors({}); }}>ยกเลิกการกรอก</NeutralSubdueButton>
              <BrandButton leadingIcon='save' onClick={submitCase}>
                {caseEditing === 'new' ? 'บันทึกเคส' : 'บันทึกการแก้ไข'}
              </BrandButton>
            </div>
          </SwSectionCard>
        )}

        {/* ── รายการเคส ────────────────────────────────────────── */}
        <SwSectionCard icon='list_alt' title='รายการเคสการช่วยเหลือด้านโภชนาการ'>
          <div className='flex w-full flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwInlineSearch value={search} onChange={setSearch} placeholder='ค้นหา HN / SN / ชื่อ / เลขบัตร' minWidth={280} />
            <div style={{ minWidth: 220 }}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'active', label: 'อยู่ระหว่างช่วยเหลือ' },
                  { value: 'ended', label: 'ยุติการช่วยเหลือ' },
                  { value: 'cancelled', label: 'ยกเลิกเคส' },
                ]}
                placeholder='สถานะ'
              />
            </div>
            {(search || statusFilter !== 'all') && (
              <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => { setSearch(''); setStatusFilter('all'); }}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            )}
            <div className='flex-1' />
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              {`พบ ${rows.length} เคส จาก ${allCases.length} เคส`}
            </span>
          </div>

          {!canWrite ? (
            <SwConfidentialMask what='ข้อมูลการช่วยเหลือด้านโภชนาการ' />
          ) : rows.length === 0 ? (
            <SwEmptyHint icon='nutrition'>
              ยังไม่มีเคสในกลุ่มนี้ — กด &quot;เพิ่มเคสช่วยเหลือ&quot; เพื่อเริ่มบันทึก
            </SwEmptyHint>
          ) : (
            <Table
              columns={caseColumns}
              rows={rows}
              rowKey={(r) => r.id}
              onRowClick={(r) => { setSelectedId(r.id); setCaseEditing(null); }}
              pageSize={20}
              stickyRightColCount={1}
              emptyMessage='ไม่พบเคส'
            />
          )}
        </SwSectionCard>

        {/* ── รายละเอียดเคสที่เลือก ─────────────────────────────── */}
        {selected && (
          <SwSectionCard
            icon='monitor_weight'
            title={`${selected.name} · ${resolveSwNutriGroup(selected.group)}`}
            aside={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`HN ${selected.hn}`}</ColorfulBadge>
                {selected.sn && <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{selected.sn}</ColorfulBadge>}
                <NeutralSubdueButton size='sm' leadingIcon='close' onClick={() => setSelectedId(null)}>ปิดรายละเอียด</NeutralSubdueButton>
              </div>
            )}
          >
            {selected.status === 'ended' && (
              <SwBanner
                tone='neutral'
                icon='lock'
                action={canWrite ? (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='lock_open' onClick={() => { setReopenTarget(selected); setReopenReason(''); setReopenError(''); }}>
                    เปิดเคสใหม่
                  </BrandSubdueButton>
                ) : undefined}
              >
                {`ยุติการช่วยเหลือแล้ว — ${selected.endedReason} · โดย ${selected.endedBy} · ${formatSwDateTime(selected.endedAt)} · เคสนี้เป็นอ่านอย่างเดียว ประวัติยังดูได้`}
              </SwBanner>
            )}

            {selected.status === 'cancelled' && selected.cancellation && (
              <SwBanner tone='danger' icon='block'>
                {`เคสนี้ถูกยกเลิกโดย ${selected.cancellation.by} · ${formatSwDateTime(selected.cancellation.at)} — เหตุผล: ${selected.cancellation.reason}`}
              </SwBanner>
            )}

            {selected.reopen && (
              <SwBanner tone='warning' icon='history'>
                {`เปิดเคสใหม่โดย ${selected.reopen.by} · ${formatSwDateTime(selected.reopen.at)} — เหตุผล: ${selected.reopen.reason}`}
              </SwBanner>
            )}

            {/* ข้อมูลผู้รับบริการ (เชื่อมเวชระเบียน) */}
            <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              {[
                ['เลขประจำตัวประชาชน', formatCid(selected.cid)],
                ['วัน เดือน ปีเกิด', formatSwDate(selected.birthDate)],
                ['อายุ', selected.group === 'child' ? formatAgeYm(ageInMonths(selected.birthDate)) : `${calcAgeYears(selected.birthDate) ?? '—'} ปี`],
                ['เพศ', selected.sex || '—'],
                ['เลขที่สังคมสงเคราะห์', selected.caseNo || '—'],
                ['กลุ่มเป้าหมายที่ช่วยเหลือ', (SW_NUTRI_TARGETS[selected.group] || []).find((t) => t.value === selected.target)?.label || '—'],
              ].map(([label, value]) => (
                <div key={label} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* ผลแปลอัตโนมัติ (ห้ามพิมพ์ทับ) */}
            <div
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                paddingTop: 'var(--dim-space-400, 16px)',
                paddingBottom: 'var(--dim-space-400, 16px)',
                paddingLeft: 'var(--dim-space-400, 16px)',
                paddingRight: 'var(--dim-space-400, 16px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-card-quaternary, #F9FBFB)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #EEF0F1)',
              }}
            >
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <Icon name='calculate' size={18} />
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
                  การประเมินภาวะโภชนาการ (คำนวณโดยระบบ — แก้ไขด้วยการพิมพ์ไม่ได้)
                </span>
                {assessment && (
                  <ColorfulBadge style={TONE_BADGE[assessment.tone] || 'grey'} size='small' hierarchy='secondary'>
                    {assessment.needsHelp ? 'ต้องช่วยเหลือต่อ' : 'ภาวะโภชนาการปกติ'}
                  </ColorfulBadge>
                )}
              </div>
              {assessment ? (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                  {assessment.summary}
                </span>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-danger-default, #B91C1C)' }}>
                  ข้อมูลไม่ครบสำหรับคำนวณ — ต้องมีน้ำหนัก ส่วนสูง และอายุ (หรือแบบประเมินครบทุกข้อ) ก่อน
                </span>
              )}
              {!assessment && (
                <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ปุ่มคำนวณถูกปิดจนกว่าข้อมูลจะครบ — เพิ่มรายการช่วยเหลือรายครั้งพร้อมน้ำหนัก/ส่วนสูง หรือแก้ไขแบบประเมินของเคส
                </span>
              )}
            </div>

            {/* กราฟแนวโน้มน้ำหนัก */}
            {trendRows.length > 0 && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-medium)' }}>
                  แนวโน้มน้ำหนักรายครั้ง (กิโลกรัม)
                </span>
                <HBarList valueLabel='กก.' rows={trendRows} />
              </div>
            )}

            {/* ฟอร์มเพิ่ม/แก้ไขรายการช่วยเหลือ */}
            {canWrite && !readOnlyCase && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
                  {visitEditingId ? 'แก้ไขรายการช่วยเหลือ' : 'เพิ่มครั้งที่ช่วยเหลือ'}
                </span>
                <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <SwField label='วันที่ช่วยเหลือ' required hint={visitErrors.date} hintTone={visitErrors.date ? 'error' : undefined} minWidth={200}>
                    <DatePicker
                      showLabel={false}
                      value={visitForm.date ? new Date(visitForm.date) : null}
                      onChange={(d) => setVisit('date')(d ? toLocalIso(d) : '')}
                      placeholder='เลือกวันที่'
                    />
                  </SwField>
                  <SwField label='น้ำหนักปัจจุบัน (กก.)' required hint={visitErrors.weightKg} hintTone={visitErrors.weightKg ? 'error' : undefined} minWidth={180}>
                    <InputField type='number' value={visitForm.weightKg} onChange={setVisit('weightKg')} placeholder='เช่น 8.6' error={!!visitErrors.weightKg} showHelperText={false} />
                  </SwField>
                  {selected.group === 'child' && (
                    <SwField label='ส่วนสูง/ความยาว (ซม.)' required hint={visitErrors.heightCm} hintTone={visitErrors.heightCm ? 'error' : undefined} minWidth={200}>
                      <InputField type='number' value={visitForm.heightCm} onChange={setVisit('heightCm')} placeholder='เช่น 78.2' error={!!visitErrors.heightCm} showHelperText={false} />
                    </SwField>
                  )}
                  {(selected.group === 'adult' || selected.group === 'elderly') && (
                    <SwField label='ส่วนสูง (ซม.)' minWidth={180}>
                      <InputField type='number' value={visitForm.heightCm} onChange={setVisit('heightCm')} placeholder='เช่น 168' />
                    </SwField>
                  )}
                  {selected.group === 'pregnant' && (
                    <>
                      <SwField label='อายุครรภ์ ณ ครั้งนี้ (สัปดาห์)' minWidth={200}>
                        <InputField type='number' value={visitForm.gestWeeks} onChange={setVisit('gestWeeks')} placeholder='เช่น 28' />
                      </SwField>
                      <SwField label='Hct (%)' minWidth={140}>
                        <InputField type='number' value={visitForm.hct} onChange={setVisit('hct')} placeholder='31' />
                      </SwField>
                      <SwField label='Hb (g/dl)' minWidth={140}>
                        <InputField type='number' value={visitForm.hb} onChange={setVisit('hb')} placeholder='10.4' />
                      </SwField>
                    </>
                  )}
                </div>

                <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <SwField label='วัสดุที่ให้การช่วยเหลือ' required hint={visitErrors.material} hintTone={visitErrors.material ? 'error' : undefined} minWidth={320}>
                    <Select
                      showLabel={false}
                      searchable
                      size='lg'
                      value={visitForm.material}
                      onChange={(v) => { setVisit('material')(v); setVisit('size')(''); setVisit('unit')(''); }}
                      options={nutriMaterialOptions(selected.group)}
                      error={!!visitErrors.material}
                      placeholder='เลือกวัสดุ'
                    />
                  </SwField>
                  <SwField label='ขนาด' required hint={visitErrors.size} hintTone={visitErrors.size ? 'error' : undefined} minWidth={180}>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={!materialMeta}
                      value={visitForm.size}
                      onChange={setVisit('size')}
                      options={(materialMeta?.sizes || []).map((s) => ({ value: s, label: s }))}
                      error={!!visitErrors.size}
                      placeholder='เลือกขนาด'
                    />
                  </SwField>
                  <SwField label='จำนวน' required hint={visitErrors.qty} hintTone={visitErrors.qty ? 'error' : undefined} minWidth={150}>
                    <InputField type='number' value={visitForm.qty} onChange={setVisit('qty')} placeholder='เช่น 4' error={!!visitErrors.qty} showHelperText={false} />
                  </SwField>
                  <SwField label='หน่วย' required hint={visitErrors.unit} hintTone={visitErrors.unit ? 'error' : undefined} minWidth={160}>
                    <Select
                      showLabel={false}
                      searchable={false}
                      size='lg'
                      disabled={!materialMeta}
                      value={visitForm.unit}
                      onChange={setVisit('unit')}
                      options={(materialMeta?.units || []).map((u) => ({ value: u, label: u }))}
                      error={!!visitErrors.unit}
                      placeholder='เลือกหน่วย'
                    />
                  </SwField>
                </div>

                {materialMeta && (
                  <SwBanner tone={overStock ? 'danger' : 'neutral'} icon={overStock ? 'warning' : 'inventory_2'}>
                    {materialMeta.supplyCode
                      ? (overStock
                        ? `จำนวนที่จ่ายเกินยอดคงเหลือในคลัง — ${findSwMaterial(materialMeta.supplyCode)?.name || materialMeta.supplyCode} คงเหลือ ${stockRemaining} หน่วย กรุณาตรวจสอบที่หน้ารับ-จ่ายวัสดุก่อนบันทึก`
                        : `เชื่อมคลังวัสดุ: ${findSwMaterial(materialMeta.supplyCode)?.name || materialMeta.supplyCode} คงเหลือ ${stockRemaining} หน่วย — เมื่อบันทึกระบบจะสร้างรายการจ่ายออกให้อัตโนมัติ`)
                      : 'วัสดุรายการนี้ยังไม่มีรหัสในคลังงานสังคมสงเคราะห์ — บันทึกไว้ในเคสโภชนาการเท่านั้น'}
                  </SwBanner>
                )}

                <SwField label='หมายเหตุ / คำแนะนำที่ให้'>
                  <SuggestibleTextarea
                    voice
                    value={visitForm.note}
                    onChange={(e) => setVisit('note')(e.target.value)}
                    suggestions={[
                      'แนะนำวิธีชงนมผงและการเก็บรักษาแก่ผู้ปกครองแล้ว',
                      'น้ำหนักเพิ่มขึ้นตามเกณฑ์ นัดติดตามครั้งถัดไปใน 1 เดือน',
                      'ผู้รับบริการมีอาการท้องอืดหลังรับประทาน ปรับปริมาณลง',
                      'ประสานคลินิกฝากครรภ์ให้ยาเสริมธาตุเหล็กเพิ่มเติม',
                      'ญาติมารับแทนเนื่องจากผู้ป่วยติดเตียง',
                    ]}
                    minChars={3}
                    placeholder='บันทึกรายละเอียดการช่วยเหลือครั้งนี้'
                  />
                </SwField>

                <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                  <SwAuditLine by={SW_CURRENT_USER} at={new Date().toISOString()} label='ผู้บันทึก' formatDateTime={formatSwDateTime} />
                  <div className='flex-1' />
                  {visitEditingId && (
                    <NeutralSubdueButton leadingIcon='close' onClick={() => { setVisitEditingId(null); setVisitForm({ ...EMPTY_VISIT, date: todayIso() }); setVisitErrors({}); }}>
                      ยกเลิกการแก้ไข
                    </NeutralSubdueButton>
                  )}
                  <BrandButton leadingIcon='save' onClick={submitVisit}>
                    {visitEditingId ? 'บันทึกการแก้ไข' : 'บันทึกการช่วยเหลือ'}
                  </BrandButton>
                  {!readOnlyCase && (
                    <DangerSubdueButton leadingIcon='task_alt' onClick={() => { setEndTarget(selected); setEndReason(''); setEndError(''); }}>
                      ยุติการช่วยเหลือ
                    </DangerSubdueButton>
                  )}
                </div>
              </div>
            )}

            {/* ประวัติการช่วยเหลือรายครั้ง */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)' }}>
                ประวัติการช่วยเหลือรายครั้ง
              </span>
              {(selected.visits || []).length === 0 ? (
                <SwEmptyHint icon='inventory_2'>ยังไม่มีการบันทึกการช่วยเหลือในเคสนี้</SwEmptyHint>
              ) : (
                <Table
                  columns={visitColumns}
                  rows={[...(selected.visits || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))}
                  rowKey={(v) => v.id}
                  pageSize={20}
                  emptyMessage='ยังไม่มีประวัติการช่วยเหลือ'
                />
              )}
            </div>

            <SwAuditLine
              by={selected.recordedBy}
              at={selected.recordedAt}
              label='เคสบันทึกโดย'
              formatDateTime={formatSwDateTime}
              extra={(selected.editLog || []).length > 0
                ? `แก้ไขล่าสุด ${formatSwDateTime(selected.editLog[selected.editLog.length - 1].at)}`
                : undefined}
            />
          </SwSectionCard>
        )}
      </div>

      {/* ── popup ยุติการช่วยเหลือ ─────────────────────────────────── */}
      <Popup
        open={!!endTarget}
        onClose={() => { setEndTarget(null); setEndError(''); }}
        title='ยุติการช่วยเหลือด้านโภชนาการ'
        subtitle={endTarget ? `${endTarget.name} · ${resolveSwNutriGroup(endTarget.group)}` : ''}
        secondaryAction={{ label: 'ไม่ยุติ', onClick: () => { setEndTarget(null); setEndError(''); } }}
        primaryAction={{ label: 'ยืนยันการยุติ', onClick: confirmEnd }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SwBanner tone='warning' icon='warning'>
            เมื่อยุติแล้ว เคสนี้จะเป็นอ่านอย่างเดียว — บันทึกการช่วยเหลือเพิ่มไม่ได้
            แต่ประวัติทั้งหมดยังดูและพิมพ์ได้ และเปิดเคสใหม่พร้อมเหตุผลได้ภายหลัง
          </SwBanner>
          <SwField label='เหตุผลการยุติการช่วยเหลือ' required hint={endError} hintTone={endError ? 'error' : undefined}>
            <Select
              showLabel={false}
              searchable
              size='lg'
              value={endReason}
              onChange={(v) => { setEndReason(v); setEndError(''); }}
              options={(SW_NUTRI_END_REASONS[endTarget?.group] || []).map((r) => ({ value: r, label: r }))}
              error={!!endError}
              placeholder='เลือกเหตุผลตามกลุ่มการช่วยเหลือ'
            />
          </SwField>
        </div>
      </Popup>

      {/* ── popup เปิดเคสใหม่ ──────────────────────────────────────── */}
      <Popup
        open={!!reopenTarget}
        onClose={() => { setReopenTarget(null); setReopenError(''); }}
        title='เปิดเคสการช่วยเหลือใหม่'
        subtitle={reopenTarget ? `${reopenTarget.name} · ยุติไปเมื่อ ${formatSwDateTime(reopenTarget.endedAt)}` : ''}
        secondaryAction={{ label: 'ไม่เปิดเคส', onClick: () => { setReopenTarget(null); setReopenError(''); } }}
        primaryAction={{ label: 'เปิดเคสใหม่', onClick: confirmReopen }}
      >
        <SwField label='เหตุผลการเปิดเคสใหม่' required hint={reopenError} hintTone={reopenError ? 'error' : undefined}>
          <SuggestibleTextarea
            voice
            value={reopenReason}
            onChange={(e) => { setReopenReason(e.target.value); setReopenError(''); }}
            suggestions={[
              'ประเมินซ้ำแล้วภาวะโภชนาการถดถอย ต้องช่วยเหลือต่อเนื่อง',
              'ยุติผิดพลาด — ผู้รับบริการยังอยู่ในเกณฑ์ที่ต้องช่วยเหลือ',
              'ผู้รับบริการกลับมารับบริการที่ศูนย์อีกครั้งหลังย้ายกลับ',
            ]}
            minChars={3}
            placeholder='ระบุเหตุผลการเปิดเคสใหม่'
          />
        </SwField>
      </Popup>

      {/* ── popup ยกเลิก (เคส / รายการรายครั้ง) ───────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelError(''); }}
        title={cancelTarget?.kind === 'case' ? 'ยกเลิกเคสการช่วยเหลือ' : 'ยกเลิกรายการช่วยเหลือรายครั้ง'}
        subtitle={cancelTarget?.kind === 'case'
          ? (cancelTarget?.row ? `${cancelTarget.row.name} · HN ${cancelTarget.row.hn}` : '')
          : (cancelTarget?.row ? `วันที่ ${formatSwDate(cancelTarget.row.date)}` : '')}
        secondaryAction={{ label: 'ไม่ยกเลิก', onClick: () => { setCancelTarget(null); setCancelError(''); } }}
        primaryAction={{ label: 'ยืนยันการยกเลิก', onClick: confirmCancel }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <SwBanner tone='warning' icon='warning'>
            รายการที่ยกเลิกจะยังแสดง (ขีดฆ่า) พร้อมผู้ยกเลิก เวลา และเหตุผล
            ไม่ถูกนับในรายงานฉบับที่ 12 และกด &quot;เปิดใช้งาน&quot; เพื่อกู้คืนได้
          </SwBanner>
          <SwField label='เหตุผลการยกเลิก' required hint={cancelError} hintTone={cancelError ? 'error' : undefined}>
            <SuggestibleTextarea
              voice
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(''); }}
              suggestions={[
                'บันทึกซ้ำกับรายการที่ลงไว้แล้ว',
                'ลงข้อมูลผิดคน ต้องบันทึกใหม่',
                'ผู้รับบริการไม่ได้มารับวัสดุจริง',
                'จำนวนหรือขนาดวัสดุไม่ถูกต้อง',
              ]}
              minChars={2}
              placeholder='ระบุเหตุผลการยกเลิก'
            />
          </SwField>
        </div>
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SocialWorkNutritionPage;
