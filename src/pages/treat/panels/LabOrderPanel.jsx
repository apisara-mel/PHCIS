import React, { useEffect, useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import TabPill from '@/components/tab/TabPill';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import AlertDialog from '@/components/popup/AlertDialog';
import LabOrderPicker from '@/components/lab/LabOrderPicker';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, PanelAlert,
  ReasonDialog, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import Pagination from '@/components/pagination/Pagination';
import {
  LAB_GROUPS, LAB_GROUP_LABEL, LAB_TESTS, LAB_TEST_BY_ID, LAB_TUBES,
  LAB_RIGHTS, resolveRightPricing, summariseSelection, duplicateWarning,
  repeatWindowDays,
} from '@/data/labCatalog';
import {
  subscribeRequestTemplates, getRequestTemplates, removeRequestTemplate,
} from '@/data/treatmentOrderSets';
import {
  LAB_STATUSES, LAB_STATUS_BY_KEY, LAB_URGENCIES, labHistoryFor, priorOrdersFor,
  rollUpOrderStatus, groupByOrder, LAB_ORDERS, advanceOrdersFor, dueAdvanceOrders,
  cancelAdvanceOrder, subscribeOrders,
} from '@/data/labOrders';
import { isInterfaceUp, interfaceStatusMeta, getInterface, subscribeInterfaces } from '@/data/treatmentInterfaces';
import { effectiveRepeatWindow, subscribeCdssSettings, getCdssSettings } from '@/data/treatmentOrderSets';
import { appendAudit, CURRENT_CLINICIAN, stampNow } from '@/data/treatmentAudit';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.2 — ใบขอตรวจทางห้องปฏิบัติการ + ติดตามผล.
   คำศัพท์และลำดับฟิลด์ตามคู่มือ HCIS §2.8 (ฟอร์มขอตรวจ) และ §2.3
   (checklist การเตรียมตัวตรวจ) ทุกจุดใช้ catalog/orders ที่มีอยู่แล้ว. */

/* ต้องครอบ MR_RIGHTS ให้ครบทุกค่า (mrPatients.js) — ถ้า map ไม่เจอแล้ว
   fallback เป็น selfpay ผู้ป่วยสิทธิ "รัฐวิสาหกิจ" / "ประกันชีวิต AIA"
   จะถูกคิดเงินเองทั้งใบ และขัดกับ MedicationCdssPanel ที่มองว่าเบิกได้ */
const RIGHT_KEY_BY_THAI = {
  'บัตรทอง (UC)': 'uc',
  'บัตรทอง': 'uc',
  'ประกันสังคม': 'sso',
  'ข้าราชการ': 'csmbs',
  /* LAB_RIGHTS ระบุ csmbs = "ข้าราชการ/รัฐวิสาหกิจ (CSMBS)" */
  'รัฐวิสาหกิจ': 'csmbs',
  'ชำระเงินเอง': 'selfpay',
  'ประกันชีวิต AIA': 'other',
};

/* สิทธิที่ยังไม่ได้ map → 'other' (ประกันเอกชน/สิทธิอื่น) ไม่ใช่ 'selfpay' */
const FALLBACK_RIGHT_KEY = 'other';

/* ชุดตรวจตามคู่มือ HCIS §2.8 — map ไปยัง testId ที่มีจริงในแคตตาล็อก */
const LAB_PANEL_SETS = [
  { key: 'cbc',      label: 'CBC',                     testIds: ['lab-cbc'] },
  { key: 'electro',  label: 'Electrolyte',             testIds: ['lab-electrolytes'] },
  { key: 'lipid',    label: 'LIPID Profile',           testIds: ['lab-lipid'] },
  { key: 'chup',     label: 'CH-UP (ตรวจสุขภาพทั่วไป)', testIds: ['lab-cbc', 'lab-fbs', 'lab-lipid', 'lab-ua'] },
  { key: 'anc',      label: 'ANC Profile',             testIds: ['lab-cbc', 'lab-abo', 'lab-vdrl', 'lab-antihiv'] },
  { key: 'dm',       label: 'ติดตามเบาหวาน (BMA/L)',    testIds: ['lab-fbs', 'lab-hba1c', 'lab-creatinine'] },
  { key: 'ua',       label: 'UA (ปัสสาวะ)',             testIds: ['lab-ua'] },
  { key: 'culture',  label: 'Hemoculture (จุลชีววิทยา)', testIds: ['lab-hemoculture'] },
];

const REQUEST_NATURES = [
  { key: 'normal',   label: 'ปกติ' },
  { key: 'appoint',  label: 'นัดตรวจ LAB (สั่งล่วงหน้า)' },
];

/* checklist "การเตรียมตัวตรวจ" (คู่มือ §2.3) — เติมอัตโนมัติตาม test ที่เลือก */
const PREP_ITEMS = [
  { key: 'fasting',  label: 'งดอาหารและเครื่องดื่มที่มีน้ำตาลก่อนเจาะเลือด' },
  { key: 'water',    label: 'ดื่มน้ำเปล่าได้ตามปกติ' },
  { key: 'morning',  label: 'มาเจาะเลือดช่วงเช้า (07:00–09:00)' },
  { key: 'midstream', label: 'เก็บปัสสาวะช่วงกลาง (midstream) ใส่ถ้วยที่ได้รับ' },
  { key: 'meds',     label: 'นำยาที่ใช้อยู่ทั้งหมดมาแสดงต่อเจ้าหน้าที่' },
  { key: 'noexercise', label: 'งดออกกำลังกายหนักก่อนตรวจ 24 ชั่วโมง' },
];

const NOTE_SUGGESTIONS = [
  'ผู้รับบริการงดอาหารมาแล้ว 10 ชั่วโมง',
  'เจาะเลือดยาก — ขอให้เจ้าหน้าที่ที่ชำนาญเป็นผู้เจาะ',
  'ผู้รับบริการใช้ยาต้านการแข็งตัวของเลือด ระวังเลือดออกหลังเจาะ',
  'ขอผลด่วนภายในวันนี้เพื่อประกอบการตัดสินใจส่งต่อ',
  'ตรวจติดตามหลังปรับยา — เทียบกับผลครั้งก่อน',
];

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

const LabOrderPanel = ({ form, setForm, patient, onGoToInterfaces }) => {
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const [group, setGroup] = useState('all');
  const [dupTarget, setDupTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState('tpl-standard');
  const [templateDelete, setTemplateDelete] = useState(null);
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const [advanceCancel, setAdvanceCancel] = useState(null);
  const [sendToast, setSendToast] = useState('');

  /* tick ที่เปลี่ยนค่าจริงทุกครั้งที่ store แจ้งเปลี่ยน — ใช้เป็น dependency
     ของ useMemo (ใช้ refresh callback ไม่ได้เพราะ identity คงที่) */
  const [ordersTick, refreshOrders] = useTreatmentStore(subscribeOrders, () => Date.now(), []);
  const [lisIface] = useTreatmentStore(subscribeInterfaces, () => getInterface('lis'), []);
  const [cdss] = useTreatmentStore(subscribeCdssSettings, getCdssSettings, []);
  /* §1.5.2.10 — เทมเพลตใบคำขอมาจาก store กลางเดียวกับตัวจัดการที่ขั้นเอกสาร */
  const [templates] = useTreatmentStore(subscribeRequestTemplates, getRequestTemplates, []);

  const rightKey = RIGHT_KEY_BY_THAI[patient?.rights] || FALLBACK_RIGHT_KEY;
  const rightMeta = LAB_RIGHTS.find((r) => r.key === rightKey);

  const header = form?.labRequest || {};
  const setHeader = (patch) => setForm((f) => ({
    ...f, labRequest: { ...(f.labRequest || {}), ...patch },
  }));

  const rows = form?.labs || [];
  const selectedIds = rows.filter((r) => !r.cancelledAt).map((r) => r.testId);
  const history = useMemo(() => labHistoryFor(hn), [hn]);

  /* §1.5.2.7 — "วัน-เวลาที่บันทึกขอ" ต้องถูกตรึงไว้ครั้งเดียวตอนเปิดใบคำขอ
     ก่อนหน้านี้ render เป็น stampNow() ทุกครั้ง เวลาจึงเลื่อนไปเรื่อย ๆ */
  useEffect(() => {
    if (!form?.labRequest?.requestedAt) setHeader({ requestedAt: stampNow() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* เทมเพลตอาจถูกลบจากขั้นเอกสาร — ให้ dropdown ตกกลับไปที่ตัวแรกที่ยังอยู่ */
  useEffect(() => {
    if (templates.length && !templates.some((t) => t.id === templateKey)) {
      setTemplateKey(templates[0].id);
    }
  }, [templates, templateKey]);

  const activeTemplate = templates.find((t) => t.id === templateKey) || null;

  /* คำเตือน "สั่งซ้ำ" ที่เคารพหน้าต่างเวลาที่ admin override ไว้จริง
     (§1.5.2.4). duplicateWarning() ของ catalog กรองด้วยหน้าต่างมาตรฐาน
     ไปแล้ว — ถ้า override ขยายจาก 7 → 30 วัน base จะเป็น null ตั้งแต่ต้น
     และคำเตือนหายไปเงียบ ๆ จึงต้องหาแถวล่าสุดเองก่อนแล้วค่อยเทียบ.
     `cdss` เป็น dependency โดยพฤตินัย: store แจ้งเปลี่ยน → re-render → คำนวณใหม่ */
  const repeatWarningFor = (id) => {
    const win = effectiveRepeatWindow('lab', id, repeatWindowDays(id));
    const recent = history
      .filter((h) => h.testId === id)
      .sort((a, b) => a.daysAgo - b.daysAgo)[0];
    if (!recent || recent.daysAgo > win) return null;
    const test = LAB_TEST_BY_ID[id];
    const base = duplicateWarning(id, [recent]) || {
      daysAgo: recent.daysAgo,
      resultSummary: recent.resultSummary ?? null,
      message: recent.daysAgo === 0
        ? `เคยตรวจ ${test?.nameEn || id} วันนี้แล้ว`
        : `เคยตรวจ ${test?.nameEn || id} เมื่อ ${recent.daysAgo} วันก่อน`,
    };
    return { ...base, windowDays: win };
  };

  /* ── การเลือกรายการตรวจ ─────────────────────────────────── */
  const commitSelection = (nextIds) => {
    const prevById = Object.fromEntries(rows.map((r) => [r.testId, r]));
    const next = [];
    let flagged = null;
    nextIds.forEach((id) => {
      if (prevById[id]) { next.push(prevById[id]); return; }
      const warn = repeatWarningFor(id);
      if (warn && !flagged) flagged = { testId: id, warning: warn };
      next.push({
        id: `lab-${id}-${Date.now()}`,
        testId: id,
        urgency: 'routine',
        note: '',
        duplicateWarned: !!warn,
        duplicateReason: '',
        cancelledAt: '', cancelReason: '',
      });
    });
    /* รายการที่ถูกเอาออกจาก picker = ยกเลิก ไม่ลบทิ้ง ถ้าเคยบันทึกไว้แล้ว */
    rows.forEach((r) => {
      if (!nextIds.includes(r.testId) && r.cancelledAt) next.push(r);
    });
    setForm((f) => ({ ...f, labs: next }));
    if (flagged) setDupTarget(flagged);
    appendAudit({
      hn, visitId, category: 'interface', field: 'เลือกรายการตรวจทางห้องปฏิบัติการ',
      oldValue: `${rows.length} รายการ`, newValue: `${next.filter((r) => !r.cancelledAt).length} รายการ`,
    });
  };

  const patchRow = (id, patch) => setForm((f) => ({
    ...f, labs: (f.labs || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));

  const doCancelRow = (reason) => {
    if (!removeTarget) return;
    patchRow(removeTarget.id, { cancelledAt: stampNow(), cancelReason: reason });
    appendAudit({
      hn, visitId, category: 'interface',
      field: `ยกเลิกรายการตรวจ ${LAB_TEST_BY_ID[removeTarget.testId]?.nameEn || removeTarget.testId}`,
      oldValue: 'อยู่ในใบขอตรวจ', newValue: `ยกเลิก — ${reason}`,
    });
    setRemoveTarget(null);
  };

  /* ── ยอดรวมและราคาแยกสิทธิ ──────────────────────────────── */
  const money = useMemo(() => {
    const active = rows.filter((r) => !r.cancelledAt);
    let total = 0; let claim = 0;
    active.forEach((r) => {
      const test = LAB_TEST_BY_ID[r.testId];
      const p = resolveRightPricing(test, rightKey);
      total += p.price || 0;
      if (p.reimbursable) claim += p.price || 0;
    });
    return { total, claim, patientPay: total - claim, count: active.length };
  }, [rows, rightKey]);

  const selectionSummary = useMemo(
    () => summariseSelection(rows.filter((r) => !r.cancelledAt).map((r) => r.testId)),
    [rows],
  );

  /* ── การเตรียมตัวตรวจ (auto จาก test ที่เลือก) ───────────── */
  const autoPrep = useMemo(() => {
    const keys = new Set();
    if (selectionSummary.fastingHours > 0) { keys.add('fasting'); keys.add('water'); keys.add('morning'); }
    if (selectionSummary.tubes.some((t) => t.tube.key === 'urinecup')) keys.add('midstream');
    keys.add('meds');
    if (rows.some((r) => r.testId === 'lab-lipid')) keys.add('noexercise');
    return PREP_ITEMS.filter((p) => keys.has(p.key));
  }, [selectionSummary, rows]);

  /* ── สถานะและผลตรวจ ─────────────────────────────────────── */
  const patientOrders = useMemo(
    () => LAB_ORDERS.filter((o) => o.patient?.hn === hn),
    [hn, ordersTick],
  );
  const grouped = useMemo(() => groupByOrder(patientOrders), [patientOrders]);
  /* ธง H/L/ค่าวิกฤต — labOrders เก็บเป็น flag ระดับแถว (abnormal / critical)
     พร้อม resultSummary ที่อธิบายว่าค่าไหนสูง/ต่ำ จึงอ่านจากตรงนั้น */
  const resultRows = useMemo(() => {
    const list = patientOrders.map((o) => ({ ...o, test: LAB_TEST_BY_ID[o.testId] }));
    return onlyAbnormal ? list.filter((r) => r.abnormal || r.critical) : list;
  }, [patientOrders, onlyAbnormal]);

  const criticalCount = patientOrders.filter((r) => r.critical).length;

  const { pageCount, page: safePage, slice } = paginate(resultRows, resultPage, 10);

  /* ── คำสั่งล่วงหน้า ──────────────────────────────────────── */
  const todayIso = new Date().toISOString().slice(0, 10);
  const advance = useMemo(() => advanceOrdersFor(hn), [hn, ordersTick]);
  const dueToday = useMemo(
    () => dueAdvanceOrders(todayIso).filter((a) => a.patient?.hn === hn),
    [hn, todayIso, ordersTick],
  );

  const pullAdvance = (adv) => {
    commitSelection([...new Set([...selectedIds, ...adv.testIds])]);
    appendAudit({
      hn, visitId, category: 'interface', field: `ดึงคำสั่งล่วงหน้า ${adv.id} มาใช้`,
      oldValue: 'รอถึงกำหนด', newValue: `${adv.testIds.length} รายการเข้าใบขอตรวจวันนี้`,
    });
  };

  const doCancelAdvance = (reason) => {
    if (!advanceCancel) return;
    cancelAdvanceOrder(advanceCancel.id);
    appendAudit({
      hn, visitId, category: 'interface', field: `ยกเลิกคำสั่งล่วงหน้า ${advanceCancel.id}`,
      oldValue: 'รอถึงกำหนด', newValue: `ยกเลิก — ${reason}`,
    });
    setAdvanceCancel(null);
    refreshOrders();
  };

  /* ── LIS ────────────────────────────────────────────────── */
  const lisUp = isInterfaceUp('lis');
  const lisMeta = interfaceStatusMeta(lisIface?.status);

  const sendToLis = () => {
    const ln = header.ln || `LN-${new Date().getFullYear() + 543}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    setHeader({ ln, sentAt: stampNow(), status: lisUp ? 'ส่งเข้า LIS แล้ว' : 'รอส่งเข้า LIS (ระบบปลายทางไม่พร้อม)' });
    setSendToast(lisUp
      ? `ส่งใบขอตรวจเข้าคิว LIS แล้ว (เลขที่ ${ln})`
      : `ระบบ LIS ไม่พร้อมใช้งาน — บันทึกใบขอตรวจไว้ในคิวรอส่ง (เลขที่ ${ln})`);
    appendAudit({
      hn, visitId, category: 'interface', field: 'ส่งใบขอตรวจเข้า LIS',
      oldValue: '—', newValue: `${ln} · ${lisUp ? 'ส่งสำเร็จ' : 'เข้าคิวรอส่ง'}`,
    });
  };

  const filteredTestIds = group === 'all'
    ? undefined
    : LAB_TESTS.filter((t) => t.group === group && !t.retired).map((t) => t.id);

  const orderColumns = [
    {
      key: 'test', header: 'รายการตรวจ', flex: 1,
      render: (r) => {
        const t = LAB_TEST_BY_ID[r.testId];
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!!r.cancelledAt) }}>
              {t?.nameEn || r.testId} — {t?.nameTh || ''}
            </span>
            <span style={PANEL_LABEL_STYLE}>{t ? LAB_GROUP_LABEL[t.group] : '—'} · รหัส {t?.code || '—'}</span>
            {r.duplicateWarned ? (
              <StatusBadge style='warning' size='small' icon='content_copy'>
                สั่งซ้ำ{r.duplicateReason ? ` — ${r.duplicateReason}` : ' (ยังไม่ระบุเหตุผล)'}
              </StatusBadge>
            ) : null}
            {r.cancelledAt ? <CancelledMark at={r.cancelledAt} reason={r.cancelReason} label='ยกเลิกรายการตรวจ' /> : null}
          </div>
        );
      },
    },
    {
      key: 'tube', header: 'สิ่งส่งตรวจ',
      render: (r) => {
        const t = LAB_TEST_BY_ID[r.testId];
        const tube = t ? LAB_TUBES[t.tubeKey] : null;
        if (!tube) return <span style={PANEL_LABEL_STYLE}>—</span>;
        return (
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{
              width: 'var(--dim-space-300, 12px)', height: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-full)', background: tube.color, display: 'inline-block',
            }} />
            <span style={PANEL_LABEL_STYLE}>{tube.thai}</span>
          </span>
        );
      },
    },
    {
      key: 'urgency', header: 'ความเร่งด่วน',
      render: (r) => (
        <Select
          value={r.urgency}
          onChange={(v) => patchRow(r.id, { urgency: v })}
          disabled={!canEdit || !!r.cancelledAt}
          options={LAB_URGENCIES.map((u) => ({ value: u.key, label: u.label }))}
          placeholder='เลือก'
          showLabel={false}
          showHelperText={false}
        />
      ),
    },
    {
      key: 'send', header: 'สั่งส่งตรวจ',
      render: (r) => (r.cancelledAt
        ? <StatusBadge style='error' size='small' icon='block'>ยกเลิก</StatusBadge>
        : <StatusBadge style='info' size='small' icon='send'>รอสั่งส่งตรวจ</StatusBadge>)},
    {
      key: 'price', header: 'ราคา',
      render: (r) => {
        const p = resolveRightPricing(LAB_TEST_BY_ID[r.testId], rightKey);
        return <span style={PANEL_VALUE_STYLE}>{baht(p.price)}</span>;
      },
    },
    {
      key: 'claim', header: 'ราคาเบิกได้',
      render: (r) => {
        const p = resolveRightPricing(LAB_TEST_BY_ID[r.testId], rightKey);
        return p.reimbursable
          ? <span style={PANEL_VALUE_STYLE}>{baht(p.price)}</span>
          : <StatusBadge style='warning' size='small' icon='payments'>เบิกไม่ได้</StatusBadge>;
      },
    },
    {
      key: 'actions', header: '',
      render: (r) => (r.cancelledAt ? (
        <GuardedAction allowed={canEdit}>
          <NeutralSubdueButton
            variant='outline' size='sm' leadingIcon='undo'
            onClick={() => patchRow(r.id, { cancelledAt: '', cancelReason: '' })}
          >
            กู้คืน
          </NeutralSubdueButton>
        </GuardedAction>
      ) : (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {r.duplicateWarned && !r.duplicateReason ? (
            <GuardedAction allowed={canEdit}>
              <NeutralSubdueButton
                variant='outline' size='sm' leadingIcon='edit_note'
                onClick={() => setDupTarget({ testId: r.testId, rowId: r.id, warning: repeatWarningFor(r.testId) })}
              >
                ระบุเหตุผล
              </NeutralSubdueButton>
            </GuardedAction>
          ) : null}
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setRemoveTarget(r)}>
              ยกเลิก
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      )),
    },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── คำสั่งล่วงหน้าถึงกำหนด (§1.5.2.9) ─────────────────── */}
      {dueToday.length > 0 ? (
        <PanelAlert tone='info' icon='event_upcoming' title={`มีคำสั่งตรวจล่วงหน้า ${dueToday.length} รายการ ครบกำหนดแล้ว`}>
          {dueToday.map((a) => (
            <span key={a.id} style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
              {a.id} · {a.testIds.map((t) => LAB_TEST_BY_ID[t]?.nameEn || t).join(' · ')} ·
              {' '}นัดวันที่ {a.scheduledFor}
              {a.scheduledFor < todayIso ? ' ' : ''}
              {a.scheduledFor < todayIso ? <ColorfulBadge style='orange' size='small' width='hug'>เกินกำหนด</ColorfulBadge> : null}
              <span style={{ marginLeft: 'var(--dim-space-200, 8px)' }}>
                <GuardedAction allowed={canEdit}>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='download' onClick={() => pullAdvance(a)}>
                    ดึงมาใช้
                  </NeutralSubdueButton>
                </GuardedAction>
              </span>
              <span style={{ marginLeft: 'var(--dim-space-200, 8px)' }}>
                <GuardedAction allowed={canEdit}>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setAdvanceCancel(a)}>
                    ยกเลิกคำสั่งล่วงหน้า
                  </NeutralSubdueButton>
                </GuardedAction>
              </span>
            </span>
          ))}
        </PanelAlert>
      ) : null}

      {/* ── หัวใบขอตรวจ (คู่มือ §2.8) ────────────────────────── */}
      <PanelCard
        title='ใบขอตรวจทางห้องปฏิบัติการ'
        subtitle='ข้อมูลส่วนหัวระบบเติมให้อัตโนมัติจากผู้เข้าใช้งานและผู้รับบริการรายนี้ — แก้ไขได้เฉพาะช่องที่เป็นการตัดสินใจของแพทย์'
        action={
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <StatusBadge style={lisUp ? 'success' : 'error'} size='small' icon={lisUp ? 'lan' : 'lan_disconnect'}>
              LIS · {lisMeta?.label || (lisUp ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน')}
            </StatusBadge>
            {onGoToInterfaces ? (
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='settings_ethernet' onClick={onGoToInterfaces}>
                ดูสถานะการเชื่อมต่อ
              </NeutralSubdueButton>
            ) : null}
          </span>
        }
      >
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <InfoPair label='วัน-เวลาที่บันทึกขอ' value={header.requestedAt || '—'} minWidth={200} />
          <InfoPair label='แพทย์ผู้ส่งตรวจ' value={CURRENT_CLINICIAN.name} minWidth={200} />
          <InfoPair label='หน่วยงานที่ขอ' value={CURRENT_CLINICIAN.center} minWidth={240} />
          <InfoPair label='สิทธิการรักษา' value={rightMeta?.label || patient?.rights || 'ไม่ระบุ'} minWidth={200} />
          <InfoPair label='สถานะการขอ' value={header.status || 'รอสั่งส่งตรวจ'} minWidth={180} />
          <InfoPair label='เลขที่ใบขอตรวจ (LN)' value={header.ln || 'ระบบจะออกเลขให้หลังบันทึก'} minWidth={220} />
        </div>
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <Select
              label='ประเภทงาน'
              value={header.workType || group}
              onChange={(v) => { setHeader({ workType: v }); setGroup(v); }}
              disabled={!canEdit}
              options={[{ value: 'all', label: 'ทุกประเภทงาน' }, ...LAB_GROUPS.map((g) => ({ value: g.key, label: LAB_GROUP_LABEL[g.key] }))]}
              placeholder='เลือกประเภทงาน'
            />
          </div>
          <div style={{ minWidth: 240, flex: 1 }}>
            <Select
              label='ลักษณะการขอตรวจ'
              value={header.nature || 'normal'}
              onChange={(v) => setHeader({ nature: v })}
              disabled={!canEdit}
              options={REQUEST_NATURES.map((n) => ({ value: n.key, label: n.label }))}
              placeholder='เลือกลักษณะการขอตรวจ'
            />
          </div>
          <div style={{ minWidth: 220, flex: 1 }}>
            <InputField
              label='วัน-เวลาที่ส่ง / นัดตรวจ'
              value={header.scheduledAt || ''}
              onChange={(v) => setHeader({ scheduledAt: v })}
              disabled={!canEdit}
              showLeadingIcon={false}
              placeholder='เช่น 12 พ.ค. 2569 · 08:00'
              helperText={header.nature === 'appoint' ? 'จำเป็นสำหรับการนัดตรวจ LAB' : 'เว้นว่างได้เมื่อเป็นการขอตรวจปกติ'}
            />
          </div>
        </div>
        <SuggestibleTextarea
          voice
          label='หมายเหตุถึงห้องปฏิบัติการ'
          value={header.note || ''}
          onChange={(e) => setHeader({ note: typeof e === 'string' ? e : e?.target?.value ?? '' })}
          suggestions={NOTE_SUGGESTIONS}
          minChars={2}
          height={120}
          minHeight={88}
          disabled={!canEdit}
          popoverAriaLabel='ตัวอย่างหมายเหตุใบขอตรวจ'
          placeholder='ข้อมูลที่ห้องปฏิบัติการควรทราบก่อนเก็บสิ่งส่งตรวจ'
        />
      </PanelCard>

      {/* ── เลือกรายการตรวจ ────────────────────────────────── */}
      <PanelCard
        title='เลือกรายการตรวจ'
        subtitle='เลือกจากรายการเดี่ยว หรือกดชุดตรวจสำเร็จรูปตามคู่มือ — ระบบเตือนทันทีเมื่อเพิ่งตรวจไปไม่นาน'
        action={<CountLabel n={selectedIds.length} unit='รายการ' />}
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TabPill selected={group === 'all'} onClick={() => setGroup('all')}>ทั้งหมด</TabPill>
          {LAB_GROUPS.map((g) => (
            <TabPill key={g.key} selected={group === g.key} onClick={() => setGroup(g.key)}>
              {g.thai}
            </TabPill>
          ))}
        </div>

        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={PANEL_LABEL_STYLE}>รายการชุดตรวจ:</span>
          {LAB_PANEL_SETS.map((s) => (
            <GuardedAction key={s.key} allowed={canEdit}>
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='playlist_add'
                onClick={() => commitSelection([...new Set([...selectedIds, ...s.testIds.filter((id) => LAB_TEST_BY_ID[id])])])}
              >
                {s.label}
              </NeutralSubdueButton>
            </GuardedAction>
          ))}
        </div>

        <LabOrderPicker
          history={history}
          value={selectedIds}
          onChange={commitSelection}
          testIds={filteredTestIds}
          patientName={patient?.name}
          disabled={!canEdit}
        />
      </PanelCard>

      {/* ── ตารางรายการที่เลือก ────────────────────────────── */}
      <PanelCard
        title='รายการตรวจในใบขอตรวจนี้'
        subtitle='แก้ไขความเร่งด่วนได้ทุกแถว · การยกเลิกจะขีดฆ่าไว้พร้อมเหตุผล ไม่ลบออกจากใบ'
        action={
          <>
            <GuardedAction allowed={canEdit && selectedIds.length > 0}>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='print' onClick={() => setPrintOpen(true)}>
                พิมพ์ใบคำขอ
              </NeutralSubdueButton>
            </GuardedAction>
            <GuardedAction
              allowed={canEdit && selectedIds.length > 0}
              reason={selectedIds.length === 0 ? 'ต้องเลือกอย่างน้อย 1 รายการตรวจก่อน' : NO_EDIT_RIGHT_TOOLTIP}
            >
              <BrandPrimaryButton size='sm' leadingIcon='send' onClick={sendToLis}>
                {lisUp ? 'ส่งเข้า LIS' : 'บันทึกเข้าคิวรอส่ง LIS'}
              </BrandPrimaryButton>
            </GuardedAction>
          </>
        }
      >
        {!lisUp ? (
          <PanelAlert tone='warning' icon='lan_disconnect' title='ระบบ LIS ไม่พร้อมใช้งาน'>
            ใบขอตรวจยังบันทึกได้ตามปกติและจะเข้าคิวรอส่งอัตโนมัติเมื่อระบบกลับมา —
            ตรวจสอบสถานะและกดลองใหม่ได้ที่หน้าการเชื่อมต่อระบบภายนอก
          </PanelAlert>
        ) : null}
        {sendToast ? (
          <PanelAlert tone='success' icon='task_alt' title='บันทึกใบขอตรวจแล้ว' onDismiss={() => setSendToast('')}>
            {sendToast}
          </PanelAlert>
        ) : null}

        {rows.length === 0 ? (
          <PanelEmptyState
            icon='science'
            title='ยังไม่มีรายการแล็บที่สั่ง'
            subtitle='กรุณาสั่งแล็บ — เลือกรายการจากตัวเลือกด้านบน หรือกดชุดตรวจสำเร็จรูป'
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={orderColumns} rows={rows} rowKey={(r) => r.id} />
            </div>
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
              <span>รวมเงินทั้งหมด ({money.count} รายการ) {baht(money.total)} บาท</span>
              <span>รวมเบิกได้ {baht(money.claim)} บาท</span>
              <span style={{
                color: money.patientPay > 0
                  ? 'var(--text-statusbadge-warning, #C2410C)'
                  : 'var(--text-table-footer, var(--brand-p800, #004C31))',
              }}>
                ต้องชำระเอง {baht(money.patientPay)} บาท
              </span>
            </div>
            <span style={PANEL_LABEL_STYLE}>
              สรุปสิ่งส่งตรวจ: {selectionSummary.tubeCount} หลอด · ปริมาตรรวม {selectionSummary.volumeMl} mL
              {selectionSummary.fastingHours > 0 ? ` · ต้องงดอาหาร ${selectionSummary.fastingHours} ชั่วโมง` : ''}
            </span>
          </>
        )}
      </PanelCard>

      {/* ── การเตรียมตัวตรวจ (คู่มือ §2.3) ─────────────────── */}
      {autoPrep.length > 0 ? (
        <PanelCard
          title='การเตรียมตัวก่อนการตรวจ (พิมพ์ให้ผู้รับบริการ)'
          subtitle='ระบบเลือกหัวข้อให้อัตโนมัติตามรายการตรวจที่สั่ง — ติ๊กเพิ่ม/ออกได้ตามที่อธิบายจริง'
        >
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {PREP_ITEMS.map((p) => (
              <Checkbox
                key={p.key}
                label={p.label}
                checked={(header.prep || autoPrep.map((a) => a.key)).includes(p.key)}
                disabled={!canEdit}
                onChange={() => {
                  const cur = header.prep || autoPrep.map((a) => a.key);
                  setHeader({ prep: cur.includes(p.key) ? cur.filter((k) => k !== p.key) : [...cur, p.key] });
                }}
              />
            ))}
          </div>
        </PanelCard>
      ) : null}

      {/* ── สถานะและผลตรวจ ────────────────────────────────── */}
      <PanelCard
        title='สถานะและผลตรวจของผู้รับบริการรายนี้'
        subtitle={`ลำดับสถานะ: ${LAB_STATUSES.map((s) => s.label).join(' → ')}`}
        action={
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Checkbox
              label='เฉพาะค่าผิดปกติ'
              checked={onlyAbnormal}
              onChange={() => { setOnlyAbnormal(!onlyAbnormal); setResultPage(1); }}
            />
            <CountLabel n={resultRows.length} />
          </span>
        }
      >
        {criticalCount > 0 ? (
          <PanelAlert tone='error' icon='crisis_alert' title={`พบค่าวิกฤต ${criticalCount} รายการ`}>
            ค่าวิกฤตต้องได้รับการรับทราบและดำเนินการก่อนปิดการตรวจ — ห้ามปิดคำเตือนนี้โดยไม่บันทึกการดำเนินการ
          </PanelAlert>
        ) : null}

        {resultRows.length === 0 ? (
          <PanelEmptyState
            icon='lab_panel'
            title={onlyAbnormal ? 'ไม่มีผลตรวจที่ผิดปกติ' : 'ยังไม่มีผลตรวจของผู้รับบริการรายนี้'}
            subtitle={onlyAbnormal
              ? 'ปิดตัวกรอง "เฉพาะค่าผิดปกติ" เพื่อดูผลทั้งหมด'
              : 'ผลจะปรากฏที่นี่เมื่อห้องปฏิบัติการรายงานผลเข้าระบบ'}
            action={onlyAbnormal ? (
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => setOnlyAbnormal(false)}>
                ล้างตัวกรอง
              </NeutralSubdueButton>
            ) : null}
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table
                rowKey={(r) => r.id}
                rows={slice}
                columns={[
                  { key: 'orderId', header: 'เลขที่คำสั่ง' },
                  {
                    key: 'test', header: 'รายการตรวจ', flex: 1,
                    render: (r) => (
                      <span style={PANEL_VALUE_STYLE}>{r.test?.nameEn || r.testId} — {r.test?.nameTh || ''}</span>
                    ),
                  },
                  {
                    key: 'status', header: 'สถานะ',
                    render: (r) => {
                      const meta = LAB_STATUS_BY_KEY[r.status];
                      const roll = rollUpOrderStatus(grouped.get ? (grouped.get(r.orderId) || [r]) : [r]);
                      return (
                        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <StatusBadge style={meta?.badge || 'neutral'} size='small'>{meta?.label || r.status}</StatusBadge>
                          {roll && roll !== r.status ? <span style={PANEL_LABEL_STYLE}>สถานะรวมของใบ: {LAB_STATUS_BY_KEY[roll]?.label || roll}</span> : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'flags', header: 'ผลและค่าผิดปกติ',
                    render: (r) => (
                      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          {r.critical ? <StatusBadge style='error' size='small' icon='crisis_alert'>ค่าวิกฤต</StatusBadge> : null}
                          {r.abnormal && !r.critical ? <StatusBadge style='warning' size='small' icon='trending_up'>ผิดปกติ (H/L)</StatusBadge> : null}
                          {!r.abnormal && !r.critical && r.status === 'reported'
                            ? <StatusBadge style='success' size='small' icon='check'>อยู่ในเกณฑ์ปกติ</StatusBadge>
                            : null}
                          {r.confidential ? <ColorfulBadge style='purple' size='small' width='hug'>ข้อมูลลับ</ColorfulBadge> : null}
                        </div>
                        <span style={PANEL_LABEL_STYLE}>
                          {r.confidential && !access.canSeeConfidential
                            ? 'ผลถูกปิดบังตามระดับสิทธิ์ — กด "ขอเปิดดู" ที่แท็บผลตรวจ'
                            : (r.resultSummary || 'ยังไม่มีรายงานผล')}
                        </span>
                      </div>
                    ),
                  },
                ]}
                emptyMessage='ไม่มีผลตรวจ'
              />
            </div>
            {pageCount > 1 ? (
              <div className='flex justify-end w-full'>
                <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setResultPage} />
              </div>
            ) : null}
          </>
        )}
      </PanelCard>

      {/* ── ประวัติการสั่งตรวจ (สั่งซ้ำตามประวัติ) ─────────── */}
      <PanelCard
        title='ประวัติการสั่งตรวจของผู้รับบริการรายนี้'
        subtitle='กด "สั่งตามประวัตินี้" เพื่อนำรายการเดิมเข้าใบขอตรวจวันนี้'
      >
        {priorOrdersFor(hn).length === 0 ? (
          <PanelEmptyState icon='history' title='ยังไม่มีประวัติการสั่งตรวจ' subtitle='ผู้รับบริการรายนี้ยังไม่เคยถูกสั่งตรวจทางห้องปฏิบัติการในระบบ' />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {priorOrdersFor(hn).slice(0, 5).map((o) => (
              <div
                key={o.orderId}
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
                  <span style={PANEL_VALUE_STYLE}>
                    {(o.testIds || []).map((t) => LAB_TEST_BY_ID[t]?.nameEn || t).join(' · ')}
                  </span>
                  <span style={PANEL_LABEL_STYLE}>{o.orderId} · {o.orderedDate || o.orderedAt || '—'}</span>
                </div>
                <GuardedAction allowed={canEdit}>
                  <NeutralSubdueButton
                    variant='outline' size='sm' leadingIcon='replay'
                    onClick={() => commitSelection([...new Set([...selectedIds, ...(o.testIds || [])])])}
                  >
                    สั่งตามประวัตินี้
                  </NeutralSubdueButton>
                </GuardedAction>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      {/* เตือนสั่งซ้ำ — ไม่บล็อกแข็ง ให้ระบุเหตุผลแล้วสั่งต่อได้ */}
      <ReasonDialog
        open={!!dupTarget}
        type='warning'
        title='รายการนี้เพิ่งตรวจไปไม่นาน'
        description={dupTarget?.warning
          ? `${dupTarget.warning.message} (ภายในเกณฑ์ ${dupTarget.warning.windowDays} วัน)${dupTarget.warning.resultSummary ? ` · ผลเดิม: ${dupTarget.warning.resultSummary}` : ''} — ยังสั่งซ้ำได้ แต่ต้องระบุเหตุผลทางคลินิกเพื่อบันทึกไว้`
          : 'ระบุเหตุผลในการสั่งซ้ำเพื่อบันทึกไว้ในเวชระเบียน'}
        confirmLabel='สั่งซ้ำโดยระบุเหตุผลนี้'
        suggestions={[
          'ติดตามผลหลังปรับการรักษา จำเป็นต้องเทียบกับค่าเดิม',
          'ผลครั้งก่อนผิดปกติมาก ต้องยืนยันซ้ำก่อนตัดสินใจ',
          'สงสัยสิ่งส่งตรวจเดิมมีปัญหา (hemolysis / เก็บไม่ถูกวิธี)',
          'อาการทางคลินิกเปลี่ยนแปลงชัดเจนหลังตรวจครั้งก่อน',
        ]}
        onConfirm={(reason) => {
          const rowId = dupTarget.rowId
            || rows.find((r) => r.testId === dupTarget.testId && !r.cancelledAt)?.id;
          if (rowId) patchRow(rowId, { duplicateReason: reason });
          appendAudit({
            hn, visitId, category: 'interface',
            field: `สั่งซ้ำรายการตรวจ ${LAB_TEST_BY_ID[dupTarget.testId]?.nameEn || dupTarget.testId}`,
            oldValue: dupTarget.warning?.message || '—', newValue: reason,
          });
          setDupTarget(null);
        }}
        onClose={() => setDupTarget(null)}
      />

      {/* ยกเลิกรายการตรวจ */}
      <ReasonDialog
        open={!!removeTarget}
        type='destructive'
        title='ยกเลิกรายการตรวจ'
        description='รายการจะถูกขีดฆ่าไว้ในใบขอตรวจพร้อมเหตุผล ไม่ลบทิ้ง เพื่อคงร่องรอยการสั่งการรักษา'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'สั่งผิดรายการ — จะสั่งรายการที่ถูกต้องแทน',
          'ผู้รับบริการไม่สะดวกงดอาหาร ขอเลื่อนไปตรวจครั้งหน้า',
          'มีผลตรวจเดิมที่ยังใช้ได้ จึงไม่จำเป็นต้องตรวจซ้ำ',
        ]}
        onConfirm={doCancelRow}
        onClose={() => setRemoveTarget(null)}
      />

      {/* ยกเลิกคำสั่งล่วงหน้า */}
      <ReasonDialog
        open={!!advanceCancel}
        type='destructive'
        title='ยกเลิกคำสั่งตรวจล่วงหน้า'
        description={advanceCancel ? `${advanceCancel.id} · ${advanceCancel.note || ''}` : ''}
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'แผนการรักษาเปลี่ยน ไม่จำเป็นต้องตรวจตามที่สั่งล่วงหน้า',
          'ผู้รับบริการย้ายไปรับการรักษาที่สถานพยาบาลอื่น',
          'สั่งซ้ำกับคำสั่งล่วงหน้าฉบับอื่นแล้ว',
        ]}
        onConfirm={doCancelAdvance}
        onClose={() => setAdvanceCancel(null)}
      />

      {/* เทมเพลตใบคำขอ + พิมพ์ */}
      <AlertDialog
        open={printOpen}
        type='info'
        title='พิมพ์ใบคำขอตรวจทางห้องปฏิบัติการ'
        description='เลือกเทมเพลตแบบฟอร์มคำขอ แล้วดูตัวอย่างก่อนสั่งพิมพ์ — พิมพ์ผ่าน @media print (ยังไม่มี PDF engine ในเวฟนี้)'
        confirmLabel='พิมพ์'
        cancelLabel='ปิด'
        onConfirm={() => {
          appendAudit({
            hn, visitId, category: 'document', field: 'พิมพ์ใบคำขอตรวจทางห้องปฏิบัติการ',
            oldValue: '—', newValue: `เทมเพลต ${activeTemplate?.name || templateKey}`,
          });
          setPrintOpen(false);
          if (typeof window !== 'undefined' && window.print) window.print();
        }}
        onCancel={() => setPrintOpen(false)}
        onClose={() => setPrintOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <Select
            label='เทมเพลตแบบฟอร์มคำขอ'
            value={templateKey}
            onChange={setTemplateKey}
            options={templates.map((t) => ({ value: t.id, label: t.name, subtext: t.owner }))}
            placeholder='เลือกเทมเพลต'
            helperText='สร้าง / แก้ไข / ลบ เทมเพลตของตนเองได้ที่ขั้นเอกสาร (ตัวจัดการเทมเพลตแบบฟอร์มคำขอ)'
          />
          <span style={PANEL_LABEL_STYLE}>
            หัวกระดาษ: {activeTemplate?.header || '—'}
          </span>
          <span style={PANEL_LABEL_STYLE}>
            รายการที่จะพิมพ์: {rows.filter((r) => !r.cancelledAt).map((r) => LAB_TEST_BY_ID[r.testId]?.nameEn || r.testId).join(' · ') || '—'}
          </span>
          {/* กฎเดียวกับตัวจัดการเทมเพลตที่ขั้นเอกสาร: เทมเพลตระบบลบไม่ได้
              และการลบต้องระบุเหตุผลเสมอ */}
          <GuardedAction
            allowed={canEdit && !!activeTemplate && !activeTemplate.locked}
            reason={activeTemplate?.locked
              ? 'เทมเพลตของระบบ ลบไม่ได้'
              : NO_EDIT_RIGHT_TOOLTIP}
          >
            <NeutralSubdueButton
              variant='outline' size='sm' leadingIcon='delete'
              onClick={() => setTemplateDelete(activeTemplate)}
            >
              ลบเทมเพลตนี้
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      </AlertDialog>

      {/* ลบเทมเพลตใบคำขอ — เหตุผลบังคับ เหมือนที่ขั้นเอกสาร */}
      <ReasonDialog
        open={!!templateDelete}
        type='destructive'
        title='ลบเทมเพลตแบบฟอร์มคำขอ'
        description={`ลบเทมเพลต "${templateDelete?.name || ''}" ออกจากรายการ — ใบคำขอที่พิมพ์ไปแล้วไม่ได้รับผลกระทบ`}
        confirmLabel='ยืนยันการลบ'
        suggestions={[
          'ไม่ได้ใช้งานแล้ว มีเทมเพลตใหม่มาแทน',
          'สร้างซ้ำโดยไม่ตั้งใจ',
          'หัวกระดาษไม่ตรงกับหน่วยงานปัจจุบัน',
        ]}
        onConfirm={(reason) => {
          removeRequestTemplate(templateDelete.id, reason);
          setTemplateDelete(null);
        }}
        onClose={() => setTemplateDelete(null)}
      />
    </div>
  );
};

export default LabOrderPanel;
