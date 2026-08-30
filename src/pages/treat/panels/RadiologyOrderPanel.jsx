import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Pagination from '@/components/pagination/Pagination';
import {
  PanelCard, PanelEmptyState, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, PanelAlert,
  ReasonDialog, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  XRAY_EXAM_BY_ID, XRAY_VIEWS, XRAY_MODALITY_BY_KEY, XRAY_RIGHT_BY_KEY,
  claimFor, summariseSelection, duplicateWarning, repeatWindowDays,
} from '@/data/xrayCatalog';
import {
  XRAY_ORDERS, XRAY_STATUS_BY_KEY, XRAY_STATUSES, XRAY_RESULT_TYPE_BY_KEY,
  xrayHistoryFor, rollUpOrderStatus, groupByOrder,
} from '@/data/xrayOrders';
import {
  openPacsStudy, openPacsReport, pacsStudiesFor, isInterfaceUp, getInterface, subscribeInterfaces,
} from '@/data/treatmentInterfaces';
import { effectiveRepeatWindow, subscribeCdssSettings, getCdssSettings } from '@/data/treatmentOrderSets';
import { appendAudit, stampNow } from '@/data/treatmentAudit';

/* PHCIS | CPOE §1.5.3.2 / .4 / .5 / .6 / .7 / .8 (+ §1.5.1.4 / §1.5.1.5)
   — ส่วนขยายของแท็บ X-ray: note ต่อรายการ · ข้อเสนอแก้ไขจากรังสีแพทย์ ·
   ติดตามสถานะและผล · ผลผิดปกติที่ต้องรับทราบ · ยอดรวมและยอดเบิกได้.

   ตารางคำสั่งหลัก (ท่าถ่าย / ความเร่งด่วน / ราคา) ยังเป็นของเดิมใน
   TreatmentSteps — panel นี้เติมสิ่งที่ยังขาดเท่านั้น ไม่รื้อของเดิม. */

const XRAY_NOTE_SUGGESTIONS = [
  'สงสัยกระดูกหักบริเวณที่ระบุ — ขอภาพ 2 ท่าตั้งฉากกัน',
  'ติดตามผลหลังการรักษา เทียบกับภาพครั้งก่อน',
  'ประเมินก่อนผ่าตัด / ก่อนทำหัตถการ',
  'ผู้รับบริการอาจตั้งครรภ์ — ระวังรังสี ขอให้ซักประวัติ LMP ก่อนถ่ายภาพ',
  'ผู้รับบริการมีอุปกรณ์โลหะฝังในร่างกาย ระบุตำแหน่งไว้ในใบขอตรวจ',
  'ผู้รับบริการเคลื่อนไหวลำบาก ต้องถ่ายภาพที่เตียง (portable)',
];

/* §1.5.3.2 — ข้อเสนอแก้ไขคำสั่งจากรังสีแพทย์ (mock, ผูกกับ examId) */
const RADIOLOGIST_SUGGESTIONS = [
  {
    id: 'rs-1', examId: 'xr-cxr-pa',
    by: 'รังสีแพทย์ นพ.ธเนศ อินทรวิเชียร', at: '6 พ.ค. 2569 · 10:05',
    field: 'ท่าถ่าย',
    before: 'PA เพียงท่าเดียว', after: 'PA + Lateral',
    reason: 'อาการทางคลินิกสงสัยรอยโรคหลังหัวใจ — ท่า PA เดียวมองไม่เห็น',
  },
  {
    id: 'rs-2', examId: 'xr-acute-abd',
    by: 'รังสีแพทย์ พญ.ชนิดา วัฒนกุล', at: '6 พ.ค. 2569 · 10:18',
    field: 'วิธีตรวจ (modality)',
    before: 'เอกซเรย์ช่องท้องเฉียบพลัน', after: 'อัลตราซาวด์ช่องท้องส่วนบน',
    reason: 'ผู้รับบริการเป็นหญิงวัยเจริญพันธุ์ — เลี่ยงรังสีถ้าคำถามทางคลินิกตอบได้ด้วยอัลตราซาวด์',
  },
];

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

/* ต้องครอบ MR_RIGHTS ให้ครบ (mrPatients.js) — สิทธิที่ map ไม่เจอเดิมตกเป็น
   'CASH' ทำให้ผู้ป่วยสิทธิรัฐวิสาหกิจ / ประกันชีวิตถูกแสดงว่าจ่ายเองทั้งใบ
   ทั้งที่ MedicationCdssPanel มองว่าเบิกได้ — ตัวเลขบนหน้าจอเดียวกันขัดกัน */
const XRAY_RIGHT_KEY_BY_MR_RIGHT = {
  'บัตรทอง (UC)': 'UCS',
  'บัตรทอง': 'UCS',
  'ประกันสังคม': 'SSS',
  'ข้าราชการ': 'OFC',
  'รัฐวิสาหกิจ': 'OFC',
  'ชำระเงินเอง': 'CASH',
  /* ตารางค่าบริการรังสียังไม่มีคีย์ประกันเอกชน — ใช้คีย์แยกไว้เพื่อไม่ให้
     ถูกกลืนเป็น "ชำระเงินเอง" เงียบ ๆ แล้วเตือนบนหน้าจอแทน */
  'ประกันชีวิต AIA': 'PRIVATE',
};

const XRAY_UNMAPPED_RIGHT_KEY = 'PRIVATE';

const RadiologyOrderPanel = ({ form, setForm, patient, onGoToInterfaces }) => {
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const [dupTarget, setDupTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);
  const [page, setPage] = useState(1);
  const [pacsResult, setPacsResult] = useState(null);

  const [pacsIface] = useTreatmentStore(subscribeInterfaces, () => getInterface('pacs'), []);
  const [cdss] = useTreatmentStore(subscribeCdssSettings, getCdssSettings, []);

  const rightKey = XRAY_RIGHT_KEY_BY_MR_RIGHT[patient?.rights] ?? XRAY_UNMAPPED_RIGHT_KEY;
  /* สิทธิที่ไม่มีในตารางค่าบริการรังสี — แสดงคำเตือนแทนการเงียบ ๆ ว่าจ่ายเอง */
  const rightNotInFeeSchedule = !XRAY_RIGHT_BY_KEY[rightKey];
  const orders = form?.xrayOrders || [];
  const history = useMemo(() => xrayHistoryFor(hn), [hn]);
  const summary = useMemo(
    () => summariseSelection(orders.filter((o) => !o.cancelledAt).map((o) => o.examId), rightKey),
    [orders, rightKey],
  );

  const patchOrder = (examId, patch) => setForm((f) => ({
    ...f,
    xrayOrders: (f.xrayOrders || []).map((o) => (o.examId === examId ? { ...o, ...patch } : o)),
  }));

  /* ── ข้อเสนอแก้ไขจากรังสีแพทย์ที่เกี่ยวกับคำสั่งใน visit นี้ ── */
  const decisions = form?.radiologistDecisions || {};
  const pendingSuggestions = RADIOLOGIST_SUGGESTIONS.filter(
    (s) => orders.some((o) => o.examId === s.examId) && !decisions[s.id],
  );

  const acceptSuggestion = (s) => {
    setForm((f) => ({
      ...f,
      radiologistDecisions: { ...(f.radiologistDecisions || {}), [s.id]: { decision: 'accept', at: stampNow() } },
    }));
    appendAudit({
      hn, visitId, category: 'interface',
      field: `ยอมรับข้อเสนอแก้ไขคำสั่งรังสีจาก ${s.by}`,
      oldValue: s.before, newValue: s.after,
    });
  };

  const rejectSuggestion = (reason) => {
    if (!rejectTarget) return;
    setForm((f) => ({
      ...f,
      radiologistDecisions: {
        ...(f.radiologistDecisions || {}),
        [rejectTarget.id]: { decision: 'reject', reason, at: stampNow() },
      },
    }));
    appendAudit({
      hn, visitId, category: 'interface',
      field: `ปฏิเสธข้อเสนอแก้ไขคำสั่งรังสีจาก ${rejectTarget.by}`,
      oldValue: rejectTarget.after, newValue: `คงคำสั่งเดิม (${rejectTarget.before}) — ${reason}`,
    });
    setRejectTarget(null);
  };

  /* ── สถานะและผลตรวจ ─────────────────────────────────────── */
  const patientFilms = useMemo(() => XRAY_ORDERS.filter((o) => o.patient?.hn === hn), [hn]);
  const grouped = useMemo(() => groupByOrder(patientFilms), [patientFilms]);
  const filmRows = useMemo(
    () => (onlyAbnormal
      ? patientFilms.filter((o) => o.resultType && o.resultType !== 'normal')
      : patientFilms),
    [patientFilms, onlyAbnormal],
  );
  const { pageCount, page: safePage, slice } = paginate(filmRows, page, 10);

  /* "ผลผิดปกติเร่งด่วน" คือ abnormalUrgent ตาม XRAY_RESULT_TYPES —
     ต้องกดรับทราบก่อนปิดการตรวจ (§1.5.3.8) */
  const unacknowledgedCritical = patientFilms.filter(
    (o) => o.resultType === 'abnormalUrgent' && !(form?.xrayAcknowledged || {})[o.id],
  );

  /* ภาพใน PACS ของผู้รับบริการรายนี้ — openPacsStudy รับ study object.
     ห้าม fallback เป็น pacsStudies[0]: การเปิดภาพ/ใบรายงานของ study อื่น
     ให้แพทย์ดูเป็นความเสี่ยงทางคลินิก ไม่ตรงกับรายการก็ต้องคืน null */
  const pacsStudies = useMemo(() => pacsStudiesFor(hn), [hn]);
  const studyFor = (row) => pacsStudies.find(
    (s) => s.examType === XRAY_EXAM_BY_ID[row.examId]?.name || s.accession === row.xn,
  ) || null;

  /* คำเตือน "สั่งซ้ำ" ที่เคารพหน้าต่างเวลาที่ override ไว้จริง (§1.5.3.6) —
     duplicateWarning() กรองด้วยหน้าต่างมาตรฐานไปแล้ว การขยายหน้าต่างจึงไม่มีผล
     ถ้าไม่หาแถวล่าสุดเองก่อน */
  const repeatWarningFor = (examId) => {
    const win = effectiveRepeatWindow('xray', examId, repeatWindowDays(examId));
    const recent = history
      .filter((h) => h.examId === examId)
      .sort((a, b) => a.daysAgo - b.daysAgo)[0];
    if (!recent || recent.daysAgo > win) return null;
    const exam = XRAY_EXAM_BY_ID[examId];
    const base = duplicateWarning(examId, [recent]) || {
      daysAgo: recent.daysAgo,
      message: recent.daysAgo === 0
        ? `เคยตรวจ ${exam?.name || examId} วันนี้แล้ว`
        : `เคยตรวจ ${exam?.name || examId} เมื่อ ${recent.daysAgo} วันก่อน`,
    };
    return { ...base, windowDays: win };
  };

  const acknowledge = (row) => {
    setForm((f) => ({
      ...f, xrayAcknowledged: { ...(f.xrayAcknowledged || {}), [row.id]: stampNow() },
    }));
    appendAudit({
      hn, visitId, category: 'interface',
      field: `รับทราบผลภาพรังสีวิกฤต ${XRAY_EXAM_BY_ID[row.examId]?.name || row.examId}`,
      oldValue: 'ยังไม่รับทราบ', newValue: `รับทราบเมื่อ ${stampNow()}`,
    });
  };

  const pacsUp = isInterfaceUp('pacs');

  const noteColumns = [
    {
      key: 'exam', header: 'รายการตรวจ', flex: 1,
      render: (o) => {
        const exam = XRAY_EXAM_BY_ID[o.examId];
        const warn = repeatWarningFor(o.examId);
        const ionising = exam && exam.modality !== 'us' && exam.modality !== 'mri';
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(!!o.cancelledAt) }}>{exam?.name || o.examId}</span>
            <span style={PANEL_LABEL_STYLE}>
              {XRAY_MODALITY_BY_KEY[exam?.modality]?.thai || '—'} ·
              {' '}ท่าถ่าย {XRAY_VIEWS.find((v) => v.key === o.view)?.label || o.view || '—'}
            </span>
            {warn ? (
              <StatusBadge style='warning' size='small' icon='content_copy'>
                {warn.message} (เกณฑ์ {warn.windowDays} วัน)
                {ionising ? ' — ผู้รับบริการจะได้รับปริมาณรังสีสะสมเพิ่ม' : ''}
                {o.duplicateReason ? ` · เหตุผล: ${o.duplicateReason}` : ''}
              </StatusBadge>
            ) : null}
            {o.cancelledAt ? <CancelledMark at={o.cancelledAt} reason={o.cancelReason} label='ยกเลิกรายการตรวจ' /> : null}
          </div>
        );
      },
    },
    {
      key: 'money', header: 'ราคา / ยอดเบิกได้',
      render: (o) => {
        const c = claimFor(XRAY_EXAM_BY_ID[o.examId], rightKey);
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={PANEL_VALUE_STYLE}>{baht(c.price)} บาท</span>
            <span style={PANEL_LABEL_STYLE}>เบิกได้ {baht(c.claim)} · จ่ายเอง {baht(c.patientPay)}</span>
          </div>
        );
      },
    },
    {
      key: 'note', header: 'Note ถึงหน่วยรังสี',
      render: (o) => (
        <SuggestibleTextarea
          voice
          label=''
          value={o.note || ''}
          onChange={(e) => patchOrder(o.examId, {
            note: typeof e === 'string' ? e : e?.target?.value ?? '',
          })}
          suggestions={XRAY_NOTE_SUGGESTIONS}
          minChars={2}
          height={110}
          minHeight={80}
          disabled={!canEdit || !!o.cancelledAt}
          popoverAriaLabel='ตัวอย่าง Note ถึงหน่วยรังสี'
          placeholder='ข้อมูลทางคลินิกที่ช่วยให้รังสีแพทย์อ่านภาพได้ตรงคำถาม'
        />
      ),
    },
    {
      key: 'actions', header: '',
      render: (o) => (o.cancelledAt ? (
        <GuardedAction allowed={canEdit}>
          <NeutralSubdueButton
            variant='outline' size='sm' leadingIcon='undo'
            onClick={() => patchOrder(o.examId, { cancelledAt: '', cancelReason: '' })}
          >
            กู้คืน
          </NeutralSubdueButton>
        </GuardedAction>
      ) : (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {repeatWarningFor(o.examId) && !o.duplicateReason ? (
            <GuardedAction allowed={canEdit}>
              <NeutralSubdueButton
                variant='outline' size='sm' leadingIcon='edit_note'
                onClick={() => setDupTarget(o)}
              >
                ระบุเหตุผลสั่งซ้ำ
              </NeutralSubdueButton>
            </GuardedAction>
          ) : null}
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(o)}>
              ยกเลิก
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      )),
    },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ── ข้อเสนอแก้ไขจากรังสีแพทย์ (§1.5.3.2) ─────────────── */}
      {pendingSuggestions.length > 0 ? (
        <PanelCard
          title='ข้อเสนอแก้ไขรายละเอียดคำสั่งจากรังสีแพทย์'
          subtitle='รังสีแพทย์แก้คำสั่งเองไม่ได้ — ต้องให้แพทย์เจ้าของคำสั่งยอมรับหรือปฏิเสธพร้อมเหตุผล ทุกครั้งบันทึกร่องรอย'
          action={<CountLabel n={pendingSuggestions.length} unit='ข้อเสนอ' />}
        >
          {pendingSuggestions.map((s) => (
            <div
              key={s.id}
              className='flex flex-wrap items-center justify-between w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-colorfulbadge-warning, #FEF08A)',
                background: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
                paddingTop: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-300, 12px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
              }}
            >
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
                  {XRAY_EXAM_BY_ID[s.examId]?.name || s.examId} — เสนอแก้ {s.field}
                </span>
                <span style={PANEL_VALUE_STYLE}>
                  {s.before} <Sym name='arrow_forward' size={14} color='var(--icon-content-tertiary, #6C7278)' /> {s.after}
                </span>
                <span style={PANEL_LABEL_STYLE}>เหตุผล: {s.reason}</span>
                <span style={PANEL_LABEL_STYLE}>{s.by} · {s.at}</span>
              </div>
              <div className='flex flex-wrap items-center shrink-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <GuardedAction allowed={canEdit}>
                  <BrandButton variant='outline' size='sm' leadingIcon='check' onClick={() => acceptSuggestion(s)}>
                    ยอมรับ
                  </BrandButton>
                </GuardedAction>
                <GuardedAction allowed={canEdit}>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={() => setRejectTarget(s)}>
                    ปฏิเสธพร้อมเหตุผล
                  </NeutralSubdueButton>
                </GuardedAction>
              </div>
            </div>
          ))}
        </PanelCard>
      ) : null}

      {/* ── รายละเอียดคำสั่ง + note + ยอดรวม ────────────────── */}
      <PanelCard
        title='รายละเอียดคำสั่งตรวจทางรังสีวิทยา'
        subtitle='กรอก Note ต่อรายการเพื่อบอกคำถามทางคลินิกให้รังสีแพทย์ — ช่วยให้รายงานผลตรงประเด็น'
        action={<CountLabel n={orders.filter((o) => !o.cancelledAt).length} unit='รายการ' />}
      >
        {rightNotInFeeSchedule ? (
          <PanelAlert tone='info' icon='payments' title={`สิทธิ "${patient?.rights || 'ไม่ระบุ'}" ยังไม่มีในตารางค่าบริการรังสีวิทยา`}>
            ระบบยังคำนวณยอดเบิกไม่ได้สำหรับสิทธินี้ จึงแสดงยอดเบิกได้เป็น 0 ไว้ก่อน —
            ไม่ได้แปลว่าผู้รับบริการต้องชำระเอง ให้ตรวจสอบเงื่อนไขกับงานประกันสุขภาพก่อนเรียกเก็บ
          </PanelAlert>
        ) : null}

        {orders.length === 0 ? (
          <PanelEmptyState
            icon='radiology'
            title='ยังไม่มีรายการ X-ray ที่สั่ง'
            subtitle='กรุณาสั่ง X-ray — กด "เพิ่ม X-ray" ด้านบนเพื่อเปิดตัวเลือกรายการตรวจทางรังสีวิทยา'
          />
        ) : (
          <>
            <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
              <Table columns={noteColumns} rows={orders} rowKey={(o) => o.examId} />
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
              <span>รวมเงินทั้งหมด ({summary.count} รายการ) {baht(summary.total)} บาท</span>
              <span>รวมเบิกได้ {baht(summary.claimTotal)} บาท</span>
              <span style={{
                color: summary.patientPay > 0
                  ? 'var(--text-statusbadge-warning, #C2410C)'
                  : 'var(--text-table-footer, var(--brand-p800, #004C31))',
              }}>
                ต้องชำระเอง {baht(summary.patientPay)} บาท
              </span>
            </div>
          </>
        )}
      </PanelCard>

      {/* ── สถานะและผลตรวจ (§1.5.3.7 / §1.5.3.8) ─────────────── */}
      <PanelCard
        title='สถานะและผลตรวจทางรังสีวิทยาของผู้รับบริการรายนี้'
        /* บรรทัด "ลำดับสถานะ: …" ถูกเอาออก 31 ส.ค. 69 (มติผู้ใช้) — เป็นคำอธิบาย
           ผังสถานะทั้งระบบ ไม่ใช่ข้อมูลของผู้รับบริการรายนี้ (ทำแบบเดียวกับ
           LabOrderPanel) */
        action={
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Checkbox
              label='เฉพาะผลผิดปกติ'
              checked={onlyAbnormal}
              onChange={() => { setOnlyAbnormal(!onlyAbnormal); setPage(1); }}
            />
            <StatusBadge style={pacsUp ? 'success' : 'error'} size='small' icon={pacsUp ? 'lan' : 'lan_disconnect'}>
              PACS · {pacsIface?.status === 'up' ? 'พร้อมใช้งาน' : 'ไม่พร้อมใช้งาน'}
            </StatusBadge>
            {onGoToInterfaces ? (
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='settings_ethernet' onClick={onGoToInterfaces}>
                ดูสถานะการเชื่อมต่อ
              </NeutralSubdueButton>
            ) : null}
          </span>
        }
      >
        {unacknowledgedCritical.length > 0 ? (
          <PanelAlert tone='error' icon='crisis_alert' title={`มีผลภาพรังสีวิกฤตที่ยังไม่รับทราบ ${unacknowledgedCritical.length} รายการ`}>
            ต้องกดรับทราบผลวิกฤตทุกรายการก่อนปิดการตรวจครั้งนี้ —
            {unacknowledgedCritical.map((o) => XRAY_EXAM_BY_ID[o.examId]?.name || o.examId).join(' · ')}
          </PanelAlert>
        ) : null}

        {filmRows.length === 0 ? (
          <PanelEmptyState
            icon='imagesearch_roller'
            title={onlyAbnormal ? 'ไม่มีผลภาพรังสีที่ผิดปกติ' : 'ยังไม่มีผลภาพรังสีของผู้รับบริการรายนี้'}
            subtitle={onlyAbnormal
              ? 'ปิดตัวกรอง "เฉพาะผลผิดปกติ" เพื่อดูผลทั้งหมด'
              : 'ผลจะปรากฏที่นี่เมื่อหน่วยรังสีวิทยารายงานผลเข้าระบบ'}
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
                  {
                    key: 'xn', header: 'เลขที่คำสั่ง (XN)',
                    render: (r) => <span style={PANEL_VALUE_STYLE}>{r.xn || r.orderId || '—'}</span>,
                  },
                  {
                    key: 'exam', header: 'รายการตรวจ', flex: 1,
                    render: (r) => <span style={PANEL_VALUE_STYLE}>{XRAY_EXAM_BY_ID[r.examId]?.name || r.examId}</span>,
                  },
                  {
                    key: 'status', header: 'สถานะ',
                    render: (r) => {
                      const meta = XRAY_STATUS_BY_KEY[r.status];
                      const roll = rollUpOrderStatus(grouped.get ? (grouped.get(r.orderId) || [r]) : [r]);
                      return (
                        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          <StatusBadge style={meta?.badge || 'neutral'} size='small'>{meta?.label || r.status}</StatusBadge>
                          {roll && roll !== r.status
                            ? <span style={PANEL_LABEL_STYLE}>สถานะรวมของใบ: {XRAY_STATUS_BY_KEY[roll]?.label || roll}</span>
                            : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'result', header: 'ผลการอ่านภาพ',
                    render: (r) => {
                      const meta = XRAY_RESULT_TYPE_BY_KEY[r.resultType];
                      const acked = (form?.xrayAcknowledged || {})[r.id];
                      return (
                        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                          {meta
                            ? <StatusBadge style={meta.color || 'neutral'} size='small'>{meta.thai}</StatusBadge>
                            : <span style={PANEL_LABEL_STYLE}>ยังไม่รายงานผล</span>}
                          <span style={PANEL_LABEL_STYLE}>{r.impression || r.findings || '—'}</span>
                          {r.resultType === 'abnormalUrgent' ? (
                            acked
                              ? <StatusBadge style='success' size='small' icon='check'>รับทราบแล้ว {acked}</StatusBadge>
                              : (
                                <GuardedAction allowed={canEdit}>
                                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='task_alt' onClick={() => acknowledge(r)}>
                                    กดรับทราบผลวิกฤต
                                  </NeutralSubdueButton>
                                </GuardedAction>
                              )
                          ) : null}
                        </div>
                      );
                    },
                  },
                  {
                    key: 'actions', header: '',
                    render: (r) => (
                      <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <GuardedAction
                          allowed={pacsUp}
                          reason='ระบบ PACS ไม่พร้อมใช้งาน — ลองใหม่ที่หน้าการเชื่อมต่อระบบภายนอก'
                        >
                          <NeutralSubdueButton
                            variant='outline' size='sm' leadingIcon='image'
                            onClick={() => {
                              const st = studyFor(r);
                              setPacsResult(st
                                ? openPacsStudy(st)
                                : { ok: false, message: 'ยังไม่มีภาพของรายการนี้ในระบบ PACS' });
                            }}
                          >
                            ดูภาพ (PACS)
                          </NeutralSubdueButton>
                        </GuardedAction>
                        <NeutralSubdueButton
                          variant='outline' size='sm' leadingIcon='description'
                          onClick={() => {
                            const st = studyFor(r);
                            setPacsResult(st
                              ? openPacsReport(st)
                              : { ok: false, message: 'ยังไม่มีใบรายงานผลของรายการนี้' });
                          }}
                        >
                          ดูรายงานผล
                        </NeutralSubdueButton>
                      </div>
                    ),
                  },
                ]}
                emptyMessage='ไม่มีผลภาพรังสี'
              />
            </div>
            {pageCount > 1 ? (
              <div className='flex justify-end w-full'>
                <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </PanelCard>

      {/* เตือนสั่งซ้ำ (§1.5.3.6) */}
      <ReasonDialog
        open={!!dupTarget}
        type='warning'
        title='รายการนี้เพิ่งถ่ายภาพไปไม่นาน'
        description={dupTarget
          ? `${repeatWarningFor(dupTarget.examId)?.message || ''} — การถ่ายภาพซ้ำเร็วเกินไปทำให้ผู้รับบริการได้รับปริมาณรังสีสะสมโดยไม่จำเป็น ระบุเหตุผลทางคลินิกเพื่อบันทึกไว้`
          : ''}
        confirmLabel='สั่งซ้ำโดยระบุเหตุผลนี้'
        suggestions={[
          'อาการทางคลินิกเปลี่ยนแปลงชัดเจนหลังถ่ายภาพครั้งก่อน',
          'ภาพครั้งก่อนคุณภาพไม่เพียงพอต่อการวินิจฉัย',
          'ติดตามผลหลังการรักษาตามแนวทางที่กำหนด',
          'ประเมินก่อนทำหัตถการ จำเป็นต้องใช้ภาพล่าสุด',
        ]}
        onConfirm={(reason) => {
          patchOrder(dupTarget.examId, { duplicateReason: reason });
          appendAudit({
            hn, visitId, category: 'interface',
            field: `สั่งซ้ำรายการตรวจรังสี ${XRAY_EXAM_BY_ID[dupTarget.examId]?.name || dupTarget.examId}`,
            oldValue: repeatWarningFor(dupTarget.examId)?.message || '—', newValue: reason,
          });
          setDupTarget(null);
        }}
        onClose={() => setDupTarget(null)}
      />

      {/* ปฏิเสธข้อเสนอรังสีแพทย์ */}
      <ReasonDialog
        open={!!rejectTarget}
        type='warning'
        title='ปฏิเสธข้อเสนอแก้ไขจากรังสีแพทย์'
        description={rejectTarget
          ? `คงคำสั่งเดิม "${rejectTarget.before}" แทนข้อเสนอ "${rejectTarget.after}" — ต้องระบุเหตุผลเพื่อบันทึกร่องรอย`
          : ''}
        confirmLabel='ยืนยันการปฏิเสธ'
        suggestions={[
          'คำถามทางคลินิกตอบได้ด้วยคำสั่งเดิมแล้ว ไม่จำเป็นต้องเพิ่มภาพ',
          'ผู้รับบริการมีข้อจำกัดในการเดินทาง จึงเลือกวิธีตรวจที่ทำได้วันนี้',
          'ปรึกษารังสีแพทย์ทางโทรศัพท์แล้ว ตกลงคงคำสั่งเดิม',
        ]}
        onConfirm={rejectSuggestion}
        onClose={() => setRejectTarget(null)}
      />

      {/* ยกเลิกรายการตรวจ */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title='ยกเลิกรายการตรวจทางรังสีวิทยา'
        description='รายการจะถูกขีดฆ่าไว้พร้อมเหตุผล ไม่ลบทิ้ง'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'สั่งผิดรายการ / ผิดตำแหน่ง — จะสั่งใหม่ให้ถูกต้อง',
          'ผู้รับบริการแจ้งว่าอาจตั้งครรภ์ จึงงดการถ่ายภาพรังสี',
          'มีภาพเดิมที่ยังใช้ประเมินได้ ไม่จำเป็นต้องถ่ายซ้ำ',
        ]}
        onConfirm={(reason) => {
          patchOrder(cancelTarget.examId, { cancelledAt: stampNow(), cancelReason: reason });
          appendAudit({
            hn, visitId, category: 'interface',
            field: `ยกเลิกรายการตรวจรังสี ${XRAY_EXAM_BY_ID[cancelTarget.examId]?.name || cancelTarget.examId}`,
            oldValue: 'อยู่ในคำสั่ง', newValue: `ยกเลิก — ${reason}`,
          });
          setCancelTarget(null);
        }}
        onClose={() => setCancelTarget(null)}
      />

      {/* ผลการเปิด PACS */}
      <AlertDialog
        open={!!pacsResult}
        type={pacsResult && pacsResult.ok === false ? 'warning' : 'info'}
        title={pacsResult?.title
          || (pacsResult && pacsResult.ok === false ? 'เปิดข้อมูลจาก PACS ไม่สำเร็จ' : 'ข้อมูลจากระบบ PACS')}
        description={pacsResult?.message || ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setPacsResult(null)}
        onClose={() => setPacsResult(null)}
      />
    </div>
  );
};

export default RadiologyOrderPanel;
