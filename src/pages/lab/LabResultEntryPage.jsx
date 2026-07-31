import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import AlertDialog from '@/components/popup/AlertDialog';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import {
  getLabOrder, updateLabOrder, subscribeOrders, withTestLabel, LAB_STATUS_BY_KEY,
} from '@/data/labOrders';
import { resolveAnalyteRange } from '@/data/labCatalog';
import {
  analyteResultType, evaluateResult, blankNotify, isNotifyComplete, makeAmendment,
} from '@/data/labResults';

/* บันทึกผลตรวจทางห้องปฏิบัติการ — TOR ภาคผนวก ก §1.15.6.

   §1.15.6.1 is the requirement this screen exists for:
     "สามารถบันทึกผลตรวจทางห้องปฏิบัติการได้ โดยมีระบบป้องกันการลงข้อมูล
      ผิดพลาดตามชนิดข้อมูลของผล Lab นั้น"
   The guard is per-analyte and type-driven — a numeric analyte renders a
   number field that refuses units and implausible magnitudes, an enum
   analyte renders a fixed choice list, free text renders a textarea. All of
   that lives in labResults.js so the rules are testable independently of
   this UI.

   Also covered here:
     §1.15.6.2 — ผลจากหน่วยงานภายนอก: an order sitting in `external` records
                 the outside lab and its reference number alongside the
                 values, because a send-out result is legally that lab's
                 result, reported through ours.
     §1.15.6.4 — a confidential test (Anti-HIV, VDRL) keeps its patient
                 identity masked while the technician keys the value in.
     §1.15.3.2 — reference ranges resolve per patient sex/age, and panic
                 limits are evaluated separately from them.

   Beyond the TOR, two things standard laboratory practice requires and
   which the team's own worklist legend implies ("ค่าวิกฤต (แจ้งแพทย์)"):

     • CRITICAL-VALUE NOTIFICATION — a panic value cannot be released until
       the ordering doctor has been told, with read-back recorded. That is
       the whole reason a value is classed critical rather than abnormal.
     • AMENDED REPORTS — a released result is not editable in place; the
       ward may already have acted on it. Re-entering one keeps the original
       values and stamps the report as corrected, with a mandatory reason. */

const SectionCard = ({ icon, title, subtitle, children, action, tone }) => (
  <section
    className='bg-surface-card rounded-card shadow-card flex flex-col w-full'
    style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
  >
    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <div
        className='shrink-0 inline-flex items-center justify-center'
        style={{
          width: 'var(--dim-size-800, 40px)',
          height: 'var(--dim-size-800, 40px)',
          borderRadius: 'var(--dim-radius-300, 10px)',
          background: tone === 'danger' ? 'var(--surface-statusbadge-error, #FEE2E2)' : 'var(--surface-brandPrimary-quaternary)',
          color: tone === 'danger' ? 'var(--text-statusbadge-error, #B91C1C)' : 'var(--text-brandPrimary-default)',
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div className='flex-1 min-w-0 flex flex-col'>
        <h2 className='text-base font-bold text-ink'>{title}</h2>
        {subtitle && <p className='text-xs text-ink-tertiary'>{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const FIELD_STYLE = {
  width: '100%',
  paddingTop: 'var(--dim-space-150)',
  paddingRight: 'var(--dim-space-300)',
  paddingBottom: 'var(--dim-space-150)',
  paddingLeft: 'var(--dim-space-300)',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  fontSize: 'var(--type-size-sm)',
  outline: 'none',
};

/* Per-status colouring for a result row — critical and abnormal must be
   distinguishable at a glance while keying, not only after saving. */
const STATUS_TONE = {
  critical: { border: 'var(--border-statusbadge-error, #B91C1C)', text: 'var(--text-statusbadge-error, #B91C1C)', label: 'ค่าวิกฤต', icon: 'warning' },
  abnormal: { border: 'var(--border-statusbadge-warning, #C2410C)', text: 'var(--text-statusbadge-warning, #C2410C)', label: 'ผิดปกติ', icon: 'error' },
  normal:   { border: 'var(--border-brandPrimary-secondary)', text: 'var(--text-brandPrimary-default)', label: 'ปกติ', icon: 'check_circle' },
  unknown:  { border: 'var(--border-input-default)', text: 'var(--text-content-tertiary)', label: '', icon: null },
};

/* One analyte input. The control rendered is decided by the analyte's
   resolved result type — this is §1.15.6.1's "ตามชนิดข้อมูลของผล Lab นั้น"
   made literal. */
const AnalyteField = ({ test, analyte, value, onChange, row, patient, disabled }) => {
  const type = analyteResultType(test, analyte);
  const range = resolveAnalyteRange(analyte, patient);
  const tone = STATUS_TONE[row?.status ?? 'unknown'] ?? STATUS_TONE.unknown;
  const err = row?.validation?.ok === false && !row.validation.empty ? row.validation.error : null;

  return (
    <div
      className='flex flex-wrap items-start w-full'
      style={{
        gap: 'var(--dim-space-300)',
        background: 'var(--surface-card-200)',
        borderRadius: 'var(--dim-radius-200)',
        border: `var(--dim-stroke-100) solid ${err ? 'var(--border-statusbadge-error, #B91C1C)' : tone.border}`,
        paddingTop: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-400)',
      }}
    >
      <div className='flex flex-col' style={{ flex: '1 1 220px', minWidth: 180 }}>
        <span className='text-sm font-bold text-ink'>{analyte.label}</span>
        <span className='text-xs text-ink-tertiary'>
          {range ? `ค่าปกติ ${range}${analyte.unit ? ` ${analyte.unit}` : ''}` : 'ไม่มีค่าอ้างอิง'}
          {/* Panic limits are shown next to the reference range so the
              person keying knows what will trigger a phone call. */}
          {(typeof analyte.criticalLow === 'number' || typeof analyte.criticalHigh === 'number') && (
            <> · วิกฤต {typeof analyte.criticalLow === 'number' ? `≤ ${analyte.criticalLow}` : ''}
              {typeof analyte.criticalLow === 'number' && typeof analyte.criticalHigh === 'number' ? ' หรือ ' : ''}
              {typeof analyte.criticalHigh === 'number' ? `≥ ${analyte.criticalHigh}` : ''}
            </>
          )}
        </span>
      </div>

      <div className='flex flex-col' style={{ flex: '0 1 260px', minWidth: 200 }}>
        {type === 'enum' ? (
          <select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={FIELD_STYLE}
            aria-label={analyte.label}
          >
            <option value=''>— เลือกผล —</option>
            {(analyte.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : type === 'numeric' ? (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <input
              type='text'
              inputMode='decimal'
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder='ตัวเลข'
              aria-label={analyte.label}
              style={{ ...FIELD_STYLE, fontFamily: 'var(--type-family-mono, monospace)' }}
            />
            {analyte.unit && <span className='text-xs text-ink-tertiary shrink-0'>{analyte.unit}</span>}
          </div>
        ) : (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            rows={2}
            placeholder='พิมพ์ผลเป็นข้อความ'
            aria-label={analyte.label}
            style={{ ...FIELD_STYLE, resize: 'vertical' }}
          />
        )}
        {err && (
          <span className='text-xs' style={{ marginTop: 'var(--dim-space-100)', color: 'var(--text-statusbadge-error, #B91C1C)' }}>
            {err}
          </span>
        )}
      </div>

      <div className='flex items-center' style={{ minWidth: 110, gap: 'var(--dim-space-150)', color: tone.text }}>
        {tone.icon && row?.status !== 'unknown' && !err && (
          <>
            <Icon name={tone.icon} size={16} />
            <span className='text-xs' style={{ fontWeight: 'var(--type-weight-medium)' }}>{tone.label}</span>
          </>
        )}
      </div>
    </div>
  );
};

const LabResultEntryPage = () => {
  const history = useHistory();
  const { id } = useParams();

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setVersion((v) => v + 1)), []);

  const order = useMemo(() => {
    const raw = getLabOrder(id);
    return raw ? withTestLabel(raw) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, version]);

  /* Draft values, seeded from whatever is already on the order so reopening
     a saved-but-unreleased result resumes rather than starting blank. */
  const [values, setValues] = useState({});
  const [notify, setNotify] = useState(blankNotify());
  const [externalRef, setExternalRef] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [confirmRelease, setConfirmRelease] = useState(false);

  const seededFor = React.useRef(null);
  useEffect(() => {
    if (!order || seededFor.current === order.id) return;
    seededFor.current = order.id;
    setValues(order.results ? { ...order.results } : {});
    setNotify(order.criticalNotify ? { ...order.criticalNotify } : blankNotify());
    setExternalRef(order.externalRef ?? '');
    setAmendReason('');
  }, [order]);

  /* No auth layer exists in this frontend-only app, so CURRENT_ACTOR stands
     in for whoever a real one would resolve — same stand-in as the
     worklist's audit log. */
  const CURRENT_ACTOR = 'ทนพ. ธนกฤต ศรีสมบูรณ์';

  const evalResult = useMemo(
    () => (order ? evaluateResult(order.testId, values, order.patient) : null),
    [order, values],
  );

  if (!order) {
    return (
      <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='lab' />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['งานชันสูตรโรค (Lab)', 'บันทึกผลตรวจ', 'ไม่พบรายการ']} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>
            ไม่พบรายการตรวจที่ตรงกับลิงก์นี้
          </div>
        </main>
      </div>
    );
  }

  const test = evalResult?.test;
  const masked = order.confidential;
  const alreadyReleased = order.status === 'reported';
  const hasCritical = (evalResult?.critical.length ?? 0) > 0;
  const notifyDone = isNotifyComplete(notify);

  /* Save keeps the result in the lab's hands (รอรับรองผล) — it does NOT put
     it in front of the doctor. Releasing is a separate, gated action,
     because the team was explicit: "แพทย์จะดูได้ต่อเมื่อได้รับอนุมัติผล". */
  const canSave = evalResult && evalResult.errors.length === 0 && evalResult.missing.length < (test?.analytes?.length ?? 0);
  const canRelease = evalResult
    && evalResult.errors.length === 0
    && evalResult.missing.length === 0
    && (!hasCritical || notifyDone)
    && (!alreadyReleased || amendReason.trim().length > 0);

  const setValue = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  const buildPatch = (status) => {
    const patch = {
      results: { ...values },
      resultSummary: evalResult.summary,
      critical: evalResult.overall === 'critical',
      abnormal: evalResult.overall === 'critical' || evalResult.overall === 'abnormal',
      status,
      performedBy: CURRENT_ACTOR,
      criticalNotify: hasCritical ? { ...notify } : undefined,
      externalRef: order.status === 'external' ? externalRef : undefined,
    };
    /* An amendment is recorded only when a RELEASED result changes — see
       makeAmendment's contract in labResults.js. */
    if (alreadyReleased && amendReason.trim()) {
      patch.amendments = [
        ...(order.amendments ?? []),
        makeAmendment({
          previousValues: order.results ?? {},
          previousSummary: order.resultSummary,
          reason: amendReason.trim(),
          by: CURRENT_ACTOR,
          at: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
        }),
      ];
      patch.amended = true;
    }
    return patch;
  };

  const handleSave = () => {
    updateLabOrder(order.id, buildPatch('approval'));
    setSavedMsg('บันทึกผลแล้ว — รอผู้มีสิทธิ์รับรองผล');
    setSaved(true);
  };

  const handleRelease = () => {
    updateLabOrder(order.id, {
      ...buildPatch('reported'),
      approvedBy: CURRENT_ACTOR,
      approvedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    });
    setConfirmRelease(false);
    setSavedMsg(alreadyReleased ? 'ออกรายงานผลฉบับแก้ไขแล้ว' : 'รับรองและรายงานผลแล้ว');
    setSaved(true);
    setTimeout(() => history.push('/lab/queue'), 900);
  };

  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='lab' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={['งานชันสูตรโรค (Lab)', 'บันทึกผลตรวจ', order.accessionNo]} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div>
            <button
              type='button'
              onClick={() => history.push('/lab/queue')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยัง Worklist
            </button>
          </div>

          {/* Amending an already-released result is the exception, so it is
              announced before anything else on the page. */}
          {alreadyReleased && (
            <Alert
              type='warning'
              iconName='history'
              iconFill={1}
              title='ผลนี้รายงานไปแล้ว — การแก้ไขจะออกเป็นรายงานฉบับแก้ไข (Amended report)'
              subtext='ผลเดิมจะถูกเก็บไว้ และต้องระบุเหตุผลในการแก้ไข เนื่องจากหน่วยงานที่สั่งอาจดำเนินการตามผลเดิมไปแล้ว'
              showBadge={false}
              showIndicator={false}
              showDetail={false}
            />
          )}

          {/* Specimen header — 2 identifiers, accession, tube. Confidential
              tests stay masked here (§1.15.6.4): the technician needs the
              accession and the tube, not the patient's name. */}
          <SectionCard
            icon='science'
            title={`${order.testLabel} — ${order.testNameTh}`}
            subtitle={`${order.groupLabel} · TMLT ${order.tmlt}`}
            action={<Badge style={LAB_STATUS_BY_KEY[order.status]?.color ?? 'neutral'} size='small'>{order.statusLabel}</Badge>}
          >
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-mono, monospace)', fontSize: 'var(--type-size-sm)' }}>
                <Icon name='barcode' size={14} />
                {order.accessionNo}
              </span>
              <span className='text-sm font-bold text-ink'>
                {masked ? 'ผู้ป่วยปกปิด (VCT)' : order.patient.fullName}
              </span>
              <span className='text-sm text-ink-secondary'>HN {masked ? '•••••' : order.patient.hn}</span>
              {!masked && (
                <span className='text-sm text-ink-secondary'>
                  {parseInt(order.patient.age, 10)} ปี / {order.patient.sex}
                </span>
              )}
              <LabTubeDot tube={order.tube} count={order.tubeCount} />
              <span className='text-xs text-ink-tertiary'>สั่งโดย {order.doctor} · {order.location} · {order.orderedAt}</span>
            </div>
            {masked && (
              <span className='text-xs' style={{ color: 'var(--text-content-tertiary)' }}>
                <Icon name='lock' size={12} /> รายการนี้เป็นผลตรวจที่ต้องปกปิด — ข้อมูลผู้ป่วยถูกซ่อนระหว่างบันทึกผล
              </span>
            )}
          </SectionCard>

          {/* §1.15.6.2 — a send-out result belongs to the outside lab, so it
              is recorded with that lab's own reference number. */}
          {order.status === 'external' && (
            <SectionCard
              icon='send'
              title='ผลจากหน่วยงานภายนอก'
              subtitle={`ส่งตรวจที่ ${order.externalLab ?? '—'}${order.sentOutAt ? ` · ${order.sentOutAt}` : ''}`}
            >
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 360 }}>
                <span className='text-xs text-ink-secondary'>เลขที่อ้างอิงของหน่วยงานภายนอก</span>
                <input
                  type='text'
                  value={externalRef}
                  onChange={(e) => setExternalRef(e.target.value)}
                  placeholder='เช่น EXT-2569-004512'
                  style={{ ...FIELD_STYLE, fontFamily: 'var(--type-family-mono, monospace)' }}
                />
              </label>
            </SectionCard>
          )}

          {/* The result fields themselves. */}
          <SectionCard
            icon='fact_check'
            title='บันทึกผลตรวจ'
            subtitle='ชนิดช่องกรอกกำหนดตามชนิดข้อมูลของแต่ละรายการ — ตัวเลข / ข้อความ / เลือกจากรายการ'
            action={
              evalResult && (
                <Badge
                  style={evalResult.overall === 'critical' ? 'error' : evalResult.overall === 'abnormal' ? 'warning' : evalResult.overall === 'normal' ? 'success' : 'neutral'}
                  size='small'
                >
                  {evalResult.overall === 'incomplete' ? `กรอกแล้ว ${(test?.analytes?.length ?? 0) - evalResult.missing.length}/${test?.analytes?.length ?? 0}` : STATUS_TONE[evalResult.overall].label}
                </Badge>
              )
            }
          >
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {(test?.analytes ?? []).map((a) => {
                const row = evalResult?.rows.find((r) => r.analyte.key === a.key);
                return (
                  <AnalyteField
                    key={a.key}
                    test={test}
                    analyte={a}
                    value={values[a.key]}
                    onChange={(v) => setValue(a.key, v)}
                    row={row}
                    patient={order.patient}
                    /* A derived value (eGFR) is computed, never keyed. */
                    disabled={a.derived}
                  />
                );
              })}
            </div>

            {evalResult?.summary && (
              <span className='text-xs text-ink-secondary'>
                สรุปผลที่จะบันทึก: {evalResult.summary}
              </span>
            )}
          </SectionCard>

          {/* Critical-value notification — appears only when a panic value is
              actually present, and blocks release until complete. */}
          {hasCritical && (
            <SectionCard
              icon='warning'
              tone='danger'
              title='ค่าวิกฤต — ต้องแจ้งแพทย์ผู้สั่งก่อนรายงานผล'
              subtitle={evalResult.critical.map((r) => `${r.analyte.label} = ${r.raw}${r.analyte.unit ? ` ${r.analyte.unit}` : ''}`).join(' · ')}
              action={<Badge style={notifyDone ? 'success' : 'error'} size='small'>{notifyDone ? 'แจ้งครบแล้ว' : 'ยังไม่ได้แจ้ง'}</Badge>}
            >
              <Alert
                type='error'
                iconName='call'
                iconFill={1}
                title={`ต้องโทรแจ้ง ${order.doctor} และให้ผู้รับสายทวนค่ากลับ (read-back)`}
                subtext='ระบบจะยังไม่ให้รายงานผลจนกว่าจะบันทึกว่าแจ้งใคร เวลาใด โดยใคร และผู้รับสายทวนค่ากลับแล้ว'
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3 w-full'>
                <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>แจ้งแก่ (ชื่อผู้รับแจ้ง) <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                  <input
                    type='text'
                    value={notify.notifiedTo}
                    onChange={(e) => setNotify((n) => ({ ...n, notifiedTo: e.target.value }))}
                    placeholder={order.doctor}
                    style={FIELD_STYLE}
                  />
                </label>
                <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>เวลาที่แจ้ง <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                  <input
                    type='time'
                    value={notify.notifiedAt}
                    onChange={(e) => setNotify((n) => ({ ...n, notifiedAt: e.target.value }))}
                    style={FIELD_STYLE}
                  />
                </label>
                <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>ผู้แจ้ง <span style={{ color: 'var(--text-input-require)' }}>*</span></span>
                  <input
                    type='text'
                    value={notify.notifiedBy}
                    onChange={(e) => setNotify((n) => ({ ...n, notifiedBy: e.target.value }))}
                    placeholder={CURRENT_ACTOR}
                    style={FIELD_STYLE}
                  />
                </label>
              </div>
              <label className='inline-flex items-start cursor-pointer' style={{ gap: 'var(--dim-space-200)' }}>
                <input
                  type='checkbox'
                  checked={notify.readBack}
                  onChange={(e) => setNotify((n) => ({ ...n, readBack: e.target.checked }))}
                  style={{ width: 'var(--dim-size-300, 16px)', height: 'var(--dim-size-300, 16px)', accentColor: 'var(--surface-brandPrimary-default)', marginTop: 2 }}
                />
                <span className='text-sm text-ink-secondary'>
                  ผู้รับสายทวนค่าวิกฤตกลับถูกต้องแล้ว (read-back confirmed)
                </span>
              </label>
              <label className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                <span className='text-xs text-ink-secondary'>บันทึกเพิ่มเติม</span>
                <textarea
                  value={notify.note}
                  onChange={(e) => setNotify((n) => ({ ...n, note: e.target.value }))}
                  rows={2}
                  placeholder='เช่น แจ้งทางโทรศัพท์ภายใน 1234 · แพทย์รับทราบและสั่งตรวจซ้ำ'
                  style={{ ...FIELD_STYLE, resize: 'vertical' }}
                />
              </label>
            </SectionCard>
          )}

          {/* Amendment reason — mandatory when re-releasing. */}
          {alreadyReleased && (
            <SectionCard
              icon='edit_note'
              title='เหตุผลในการแก้ไขผล'
              subtitle='บังคับกรอก — จะถูกบันทึกคู่กับผลเดิมในรายงานฉบับแก้ไข'
            >
              <textarea
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                rows={2}
                placeholder='เช่น พบว่าสลับตัวอย่างกับ Accession L69-0718 · ตรวจซ้ำแล้วได้ผลใหม่'
                style={{ ...FIELD_STYLE, resize: 'vertical' }}
              />
              {(order.amendments?.length ?? 0) > 0 && (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                  <span className='text-xs text-ink-secondary'>ประวัติการแก้ไข</span>
                  {order.amendments.map((a, i) => (
                    <span key={i} className='text-xs text-ink-tertiary'>
                      {a.at} · {a.by} — {a.reason} (ผลเดิม: {a.previousSummary ?? '—'})
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

          {/* Sticky footer — save vs release are deliberately two buttons.
              Saving parks the result at รอรับรองผล; releasing is what makes
              it visible to the doctor. */}
          <section
            className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full sticky bottom-0'
            style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-500)' }}
          >
            <span className='text-sm text-ink-secondary'>
              {evalResult?.errors.length
                ? `มี ${evalResult.errors.length} รายการที่กรอกไม่ถูกต้อง`
                : evalResult?.missing.length
                  ? `ยังกรอกไม่ครบ ${evalResult.missing.length} รายการ`
                  : hasCritical && !notifyDone
                    ? 'ต้องบันทึกการแจ้งค่าวิกฤตก่อนจึงจะรายงานผลได้'
                    : alreadyReleased && !amendReason.trim()
                      ? 'ต้องระบุเหตุผลในการแก้ไขก่อนออกรายงานฉบับแก้ไข'
                      : 'พร้อมรายงานผล'}
            </span>
            <div className='flex-1' />
            <NeutralSubdueButton variant='outline' size='md' onClick={() => history.push('/lab/queue')}>
              ยกเลิก
            </NeutralSubdueButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='save' disabled={!canSave} onClick={handleSave}>
              บันทึกร่าง (รอรับรองผล)
            </NeutralSubdueButton>
            <BrandButton
              size='md'
              leadingIcon='check_circle'
              disabled={!canRelease}
              onClick={() => setConfirmRelease(true)}
            >
              {alreadyReleased ? 'ออกรายงานฉบับแก้ไข' : 'รับรองและรายงานผล'}
            </BrandButton>
          </section>
        </div>
      </main>

      <AlertDialog
        open={confirmRelease}
        type={hasCritical ? 'warning' : 'info'}
        title={alreadyReleased ? 'ออกรายงานผลฉบับแก้ไข?' : 'รับรองและรายงานผล?'}
        description={
          alreadyReleased
            ? `ผลเดิมของ ${order.accessionNo} จะถูกเก็บเป็นประวัติ และระบบจะออกรายงานฉบับแก้ไขให้${order.doctor} ทราบ`
            : `เมื่อรับรองแล้ว ${order.doctor} จะเห็นผลตรวจนี้ทันที และสถานะจะเปลี่ยนเป็น "รายงานผลแล้ว"${hasCritical ? ' — รายการนี้มีค่าวิกฤตที่แจ้งแพทย์แล้ว' : ''}`
        }
        cancelLabel='ยกเลิก'
        confirmLabel={alreadyReleased ? 'ออกรายงานฉบับแก้ไข' : 'รับรองผล'}
        onClose={() => setConfirmRelease(false)}
        onCancel={() => setConfirmRelease(false)}
        onConfirm={handleRelease}
      />
      <SuccessToast open={saved} message={savedMsg} onClose={() => setSaved(false)} />
    </div>
  );
};

export default LabResultEntryPage;
