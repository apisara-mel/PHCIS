import React, { useMemo, useState } from 'react';
import Badge from '@/components/badge/Badge';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import { Field, FieldGrid } from '@/components/forms/Fields';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import { Icon } from '@/components/icons/Icon';
import { LAB_ANALYZERS, LAB_ANALYZER_BY_KEY, LAB_REPORT_MODES } from '@/data/labInterfaces';
import { allQcStates, qcStateFor, qcHealth, validateCalibrationDraft } from '@/data/labQc';

/* แท็บ "เครื่องตรวจวิเคราะห์" ของหน้า /lab/interface — QC strip on top, the
   analyser roster underneath.

   Extracted from LabInterfacePage so that page stays a shell of state +
   dialogs rather than a thousand lines of markup, and because these two
   blocks are one subject: the QC verdict is what decides whether an
   instrument's Automatic mode is allowed to move results at all, so putting
   the verdict on a different screen from the mode selector would let someone
   set Automatic on an out-of-control instrument without ever seeing why that
   is a bad idea.

   Purely presentational — every mutation is handed back to the page as a
   callback, so the toasts, the confirm dialogs and the audit actor all stay
   in one place. */

const StateCard = ({ state, canEdit, denyReason, onRunQc, onOverride, onClearOverride, onCalibrate }) => (
  <div
    className='flex flex-col'
    style={{
      flex: '1 1 260px',
      minWidth: 240,
      gap: 'var(--dim-space-200)',
      background: state.blocked ? 'var(--surface-alert-error)' : 'var(--surface-card-200)',
      border: `var(--dim-stroke-100) solid ${state.blocked ? 'var(--border-alert-error)' : 'var(--border-neutral-quaternary)'}`,
      borderRadius: 'var(--dim-radius-300)',
      paddingTop: 'var(--dim-space-400)',
      paddingBottom: 'var(--dim-space-400)',
      paddingLeft: 'var(--dim-space-400)',
      paddingRight: 'var(--dim-space-400)',
    }}
  >
    <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
      {state.analyzerName}
    </span>
    {/* Three states, not two. A control that PASSED yesterday is not the same
        thing as a control that passed this morning, and it is not the same
        thing as one that failed: the operator's next action is "run it", not
        "fix it". Painting a stale run green was the bug — the seeded ua-01
        run is dated the day before and its own note says so. */}
    {state.stale ? (
      <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <Badge style='warning' size='small' icon='schedule'>
          {state.last ? 'ยังไม่ได้รัน QC ของวันนี้' : 'ยังไม่ได้รัน QC'}
        </Badge>
        {state.last && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            ล่าสุด {state.last.at} · {state.verdict?.label}
          </span>
        )}
      </span>
    ) : (
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
        <Badge style={state.verdict.badge} size='small'>{state.verdict.label}</Badge>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          {state.last?.at}
        </span>
      </span>
    )}
    <span
      style={{
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        color: state.calibrationOverdue ? 'var(--text-statusbadge-error)' : 'var(--text-content-tertiary)',
      }}
    >
      สอบเทียบครั้งถัดไป {state.calibration?.nextDue ?? '—'}
      {state.calibrationOverdue ? ' · เกินกำหนดแล้ว' : ''}
    </span>
    {state.override && (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning)' }}>
        ยกเว้นการบล็อกโดย {state.override.by || 'ไม่ระบุ'} — {state.override.reason}
      </span>
    )}
    <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-150)' }}>
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='science'
        disabled={!canEdit}
        title={canEdit ? undefined : denyReason}
        onClick={() => onRunQc(LAB_ANALYZER_BY_KEY[state.analyzer])}
      >
        บันทึกผล QC
      </NeutralSubdueButton>
      <NeutralSubdueButton
        variant='outline'
        size='sm'
        leadingIcon='tune'
        disabled={!canEdit}
        title={canEdit ? undefined : denyReason}
        onClick={() => onCalibrate(state)}
      >
        บันทึกการสอบเทียบ
      </NeutralSubdueButton>
      {state.blocked && (
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='lock_open'
          disabled={!canEdit}
          title={canEdit ? undefined : denyReason}
          onClick={() => onOverride(state)}
        >
          ยกเว้นการบล็อก
        </NeutralSubdueButton>
      )}
      {state.override && (
        <DangerSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='lock'
          disabled={!canEdit}
          title={canEdit ? undefined : denyReason}
          onClick={() => onClearOverride(state.analyzer)}
        >
          ยกเลิกการยกเว้น
        </DangerSubdueButton>
      )}
    </div>
  </div>
);

/* บันทึกการสอบเทียบ — inline under the QC strip rather than a popup, because
   it is filled in from a service report already lying on the bench and the
   instrument it belongs to must stay visible while it is typed.

   Before this the calibration record was display-only: recordCalibration()
   existed in labQc.js with no caller anywhere in src/, so a card could show
   "เกินกำหนดแล้ว" forever with no way to clear it. */
const CalibrationForm = ({ state, onSave, onCancel }) => {
  const [draft, setDraft] = useState({
    lastAt: state.calibration?.lastAt ?? '',
    nextDue: state.calibration?.nextDue ?? '',
    by: state.calibration?.by ?? '',
  });
  const [errors, setErrors] = useState({});

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { next[k] = undefined; });
      return next;
    });
  };

  const submit = () => {
    const check = validateCalibrationDraft(draft);
    if (!check.ok) { setErrors(check.errors); return; }
    onSave(state.analyzer, draft);
  };

  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300)',
        background: 'var(--surface-card-200)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary)',
        borderRadius: 'var(--dim-radius-300)',
        paddingTop: 'var(--dim-space-400)',
        paddingBottom: 'var(--dim-space-400)',
        paddingLeft: 'var(--dim-space-400)',
        paddingRight: 'var(--dim-space-400)',
      }}
    >
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
        <Icon name='tune' size={18} style={{ color: 'var(--text-brandPrimary-default)' }} />
        บันทึกการสอบเทียบ — {state.analyzerName}
      </span>
      <FieldGrid cols={3}>
        <Field label='วันที่สอบเทียบ' required>
          <InputField
            showLabel={false}
            showLeadingIcon={false}
            size='md'
            type='date'
            value={draft.lastAt}
            error={errors.lastAt}
            onChange={(v) => set({ lastAt: typeof v === 'string' ? v : v?.target?.value ?? '' })}
          />
        </Field>
        <Field label='กำหนดสอบเทียบครั้งถัดไป' required>
          <InputField
            showLabel={false}
            showLeadingIcon={false}
            size='md'
            type='date'
            value={draft.nextDue}
            error={errors.nextDue}
            onChange={(v) => set({ nextDue: typeof v === 'string' ? v : v?.target?.value ?? '' })}
          />
        </Field>
        <Field label='ผู้สอบเทียบ / หน่วยงาน' required>
          <InputField
            showLabel={false}
            showLeadingIcon={false}
            size='md'
            placeholder='เช่น บริษัทผู้แทนจำหน่าย Roche'
            value={draft.by}
            error={errors.by}
            onChange={(v) => set({ by: typeof v === 'string' ? v : v?.target?.value ?? '' })}
          />
        </Field>
      </FieldGrid>
      <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={{ flex: 1, minWidth: 200, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
          การสอบเทียบเป็นกิจกรรมของช่าง/ผู้แทนจำหน่ายตามรอบ ไม่ใช่ QC ประจำวัน — บันทึกแยกกันเพื่อให้เห็นเครื่องที่ผ่าน QC รายวันแต่เลยกำหนดสอบเทียบ
        </span>
        <NeutralSubdueButton variant='outline' size='md' onClick={onCancel}>
          ยกเลิก
        </NeutralSubdueButton>
        <BrandPrimaryButton size='md' leadingIcon='save' onClick={submit}>
          บันทึกการสอบเทียบ
        </BrandPrimaryButton>
      </div>
    </div>
  );
};

const Card = ({ icon, title, subtitle, action, children }) => (
  <section
    className='flex flex-col w-full'
    style={{
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500)',
      boxShadow: 'var(--shadow-card)',
      paddingTop: 'var(--dim-space-600)',
      paddingRight: 'var(--dim-space-600)',
      paddingBottom: 'var(--dim-space-600)',
      paddingLeft: 'var(--dim-space-600)',
      gap: 'var(--dim-space-400)',
    }}
  >
    <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
      {icon && <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default)' }} />}
      <div className='flex flex-col min-w-0' style={{ flex: '1 1 240px', gap: 'var(--dim-space-050, 2px)' }}>
        <span style={{ fontFamily: 'var(--type-family-heading-content)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', fontSize: 'var(--type-size-base)', color: 'var(--text-content-default)' }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            {subtitle}
          </span>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const LabAnalyzerQcPanel = ({
  today,
  canEdit = true,
  denyReason,
  version = 0,
  onRunQc,
  onOverride,
  onClearOverride,
  onRecordCalibration,
  onReportModeChange,
}) => {
  const qc = useMemo(() => qcHealth(today), [today, version]);
  const states = useMemo(() => allQcStates(today), [today, version]);
  const [calibrationTarget, setCalibrationTarget] = useState(null);

  const calibrationState = calibrationTarget
    ? states.find((s) => s.analyzer === calibrationTarget) ?? null
    : null;

  return (
    <>
      {/* QC strip. Sits above the roster because it gates it. */}
      <Card
        icon='rule'
        title='ควบคุมคุณภาพภายใน (IQC) และการสอบเทียบ'
        subtitle='เครื่องที่ผลควบคุมคุณภาพหลุดเกณฑ์ หรือยังไม่ได้รัน QC ของวันนี้ จะถูกบล็อกไม่ให้นำเข้าผลอัตโนมัติ จนกว่าจะรัน QC ใหม่หรือมีการยกเว้นพร้อมเหตุผล'
        action={(
          <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            {qc.stale > 0 && (
              <Badge style='warning' size='small' icon='schedule'>ค้างรัน QC วันนี้ {qc.stale} เครื่อง</Badge>
            )}
            <Badge style={qc.blocked > 0 ? 'error' : 'success'} size='small'>
              {qc.blocked > 0 ? `บล็อก ${qc.blocked} เครื่อง` : 'ทุกเครื่องอยู่ในเกณฑ์'}
            </Badge>
          </span>
        )}
      >
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {states.map((s) => (
            <StateCard
              key={s.analyzer}
              state={s}
              canEdit={canEdit}
              denyReason={denyReason}
              onRunQc={onRunQc}
              onOverride={onOverride}
              onClearOverride={onClearOverride}
              onCalibrate={(st) => setCalibrationTarget(st.analyzer)}
            />
          ))}
        </div>
        {calibrationState && (
          <CalibrationForm
            key={calibrationState.analyzer}
            state={calibrationState}
            onCancel={() => setCalibrationTarget(null)}
            onSave={(analyzer, draft) => {
              onRecordCalibration?.(analyzer, draft);
              setCalibrationTarget(null);
            }}
          />
        )}
      </Card>

      <Card
        icon='biotech'
        title='ทะเบียนเครื่องตรวจวิเคราะห์'
        subtitle='ประเภทการรายงานผล (Normal / Manual / Automatic) ตามหน้าตั้งค่าของคู่มือ MyHOSPITAL Lab — แม้ตั้งเป็น Automatic ผลที่เข้ามาก็ยังต้องกดยืนยันก่อนรายงาน'
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {LAB_ANALYZERS.map((a) => {
            const state = qcStateFor(a.key, today);
            return (
              <div
                key={a.key}
                className='flex flex-wrap items-center w-full'
                style={{
                  gap: 'var(--dim-space-400)',
                  background: 'var(--surface-card-200)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  borderRadius: 'var(--dim-radius-300)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                }}
              >
                <div className='flex flex-col min-w-0' style={{ flex: '1 1 280px', gap: 'var(--dim-space-050, 2px)' }}>
                  <span className='inline-flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    {a.name}
                    <Badge
                      style={a.status === 'online' ? 'success' : a.status === 'warning' ? 'warning' : 'neutral'}
                      size='small'
                      icon={a.status === 'online' ? 'check_circle' : a.status === 'warning' ? 'error' : 'power_settings_new'}
                    >
                      {a.status === 'online' ? 'ออนไลน์' : a.status === 'warning' ? 'แจ้งเตือน' : 'ออฟไลน์'}
                    </Badge>
                    {state.blocked && (
                      <Badge style='error' size='small' icon='block'>
                        {state.stale ? 'ยังไม่ได้รัน QC ของวันนี้ — บล็อกการนำเข้าผล' : 'QC ไม่ผ่าน — บล็อกการนำเข้าผล'}
                      </Badge>
                    )}
                  </span>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {a.thai} · S/N {a.serialNo} · {a.port}
                  </span>
                  {a.note && (
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-statusbadge-warning)' }}>
                      {a.note}
                    </span>
                  )}
                </div>
                <div style={{ width: 280 }} title={canEdit ? undefined : denyReason}>
                  <Select
                    label='ประเภทการรายงานผล'
                    value={a.reportMode}
                    options={LAB_REPORT_MODES.map((m) => ({ value: m.key, label: m.label, subtext: m.thai }))}
                    onChange={(v) => onReportModeChange(a, v)}
                    size='md'
                    disabled={!canEdit}
                    searchable={false}
                  />
                </div>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)', minWidth: 120 }}>
                  รอนำเข้า {a.pending} ข้อความ
                  <br />
                  ล่าสุด {a.lastMessageAt}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
};

export default LabAnalyzerQcPanel;
