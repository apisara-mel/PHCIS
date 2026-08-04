import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import { Field, FieldGrid } from '@/components/forms/Fields';
import { Icon } from '@/components/icons/Icon';
import {
  QC_LEVELS, QC_VERDICTS, evaluateZ, validateQcDraft, qcRunsFor, activeQcRunsFor,
} from '@/data/labQc';

/* Monospace is a rendering requirement for aligned numeric columns, not a
   design-system value — the MIH token scale has no --type-family-mono, so
   naming one and relying on its fallback would be a token that silently
   drifts the day a theme defines it. Plain stack, stated once. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

/* บันทึกผลควบคุมคุณภาพ (IQC) ของเครื่องตรวจวิเคราะห์.

   The z-score is computed and shown LIVE as the values are keyed, not after
   saving. A technician who can see "z = 3.4 · หลุดเกณฑ์" while the control
   vial is still on the bench can re-run it; one who finds out after saving
   has to amend a record instead.

   Levey-Jennings is drawn as a strip rather than a full chart: the question
   at the bench is "is today's point inside the lines", and a 12-point strip
   answers it in the space a chart would need for axes alone. */

const QC_NOTE_SUGGESTIONS = [
  'ทวนซ้ำด้วยสารควบคุมขวดใหม่ — ผลอยู่ในเกณฑ์',
  'เปลี่ยน Lot สารควบคุมใหม่ในวันนี้',
  'ปรับเทียบเครื่อง (Calibration) ก่อนรัน QC',
  'อุณหภูมิห้องปฏิบัติการสูงกว่าเกณฑ์ระหว่างการรัน',
  'สารควบคุมใกล้หมดอายุ — เบิกล็อตใหม่แล้ว',
  'แจ้งบริษัทผู้แทนจำหน่ายเข้าตรวจสอบเครื่อง',
  'ผลอยู่ในเกณฑ์ควบคุมทุกระดับ — เปิดให้ตรวจผู้ป่วยได้',
];

/* Levey-Jennings strip: ±1/2/3 SD bands with one dot per recent run. */
const LjStrip = ({ runs, level }) => {
  const points = runs
    .map((r) => r.levels.find((l) => l.level === level))
    .filter(Boolean)
    .slice(0, 12)
    .reverse();
  if (!points.length) return null;

  const W = 320;
  const H = 84;
  const mid = H / 2;
  const unit = (H / 2) / 3.6;   /* 3.6 SD fills half the height */
  const y = (z) => mid - Math.max(-3.5, Math.min(3.5, Number(z) || 0)) * unit;
  const x = (i) => 8 + ((W - 16) * i) / Math.max(1, points.length - 1);

  return (
    <svg width='100%' viewBox={`0 0 ${W} ${H}`} role='img' aria-label={`Levey-Jennings ${level}`}>
      <rect x={0} y={0} width={W} height={H} rx={8} fill='var(--surface-chart-area)' />
      {[3, 2, 1].map((sd) => (
        <g key={sd}>
          <line x1={4} x2={W - 4} y1={y(sd)} y2={y(sd)} stroke={sd === 3 ? 'var(--stroke-chart-series-dbp)' : 'var(--stroke-chart-grid)'} strokeWidth={1} strokeDasharray={sd === 3 ? '4 3' : '2 3'} />
          <line x1={4} x2={W - 4} y1={y(-sd)} y2={y(-sd)} stroke={sd === 3 ? 'var(--stroke-chart-series-dbp)' : 'var(--stroke-chart-grid)'} strokeWidth={1} strokeDasharray={sd === 3 ? '4 3' : '2 3'} />
        </g>
      ))}
      <line x1={4} x2={W - 4} y1={mid} y2={mid} stroke='var(--stroke-chart-grid)' strokeWidth={1.5} />
      <path
        d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.z)}`).join(' ')}
        fill='none'
        stroke='var(--stroke-chart-series-sbp)'
        strokeWidth={1.5}
      />
      {points.map((p, i) => (
        <circle
          key={`${level}-${i}`}
          cx={x(i)}
          cy={y(p.z)}
          r={3}
          /* INK tokens, not surface: --surface-statusbadge-error is #FEE2E2
             (red/100), a pastel badge background. The ±3 SD point is the one
             mark on this chart that blocks an instrument — it has to read as
             a red dot, not a pink smudge on --surface-chart-area. */
          fill={Math.abs(p.z) >= 3 ? 'var(--text-statusbadge-error)' : Math.abs(p.z) >= 2 ? 'var(--text-statusbadge-warning)' : 'var(--stroke-chart-series-sbp)'}
        />
      ))}
    </svg>
  );
};

const LabQcRunPopup = ({ open, analyzer, analyzerName, today, canEdit = true, denyReason, onClose, onSubmit, onVoid, actor }) => {
  /* ISO-prefixed, NOT toLocaleString('th-TH'): the daily-control gate in
     labQc.js compares the run's day against `today`, and a Buddhist-era
     short date ("31/7/2569") would make every freshly saved run read as a
     different day from the ISO `today` the pages pass in. qcRunDay() copes
     with both, but writing the format the rest of the module speaks keeps
     the two from having to agree by accident. */
  const nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const makeInitial = () => ({
    at: `${today ?? ''} ${nowTime()}`.trim(),
    by: actor ?? '',
    lot: '',
    note: '',
    levels: QC_LEVELS.map((l) => ({ level: l.key, value: '', mean: '', sd: '' })),
  });

  const [draft, setDraft] = useState(makeInitial);
  const [errors, setErrors] = useState({});
  /* Non-null while correcting a previously saved run — the form is the same
     form, so a technician fixing a mis-keyed control sees the live z update
     exactly as when they first entered it. */
  const [amendOf, setAmendOf] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidAttempted, setVoidAttempted] = useState(false);

  const resetAmend = () => {
    setAmendOf(null);
    setVoidTarget(null);
    setVoidReason('');
    setVoidAttempted(false);
  };

  useEffect(() => {
    if (!open) return;
    setDraft(makeInitial());
    setErrors({});
    resetAmend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, analyzer, today]);

  const setLevel = (i, patch) => setDraft((d) => ({
    ...d,
    levels: d.levels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
  }));

  /* Live z per level while typing — the whole point of the form. */
  const zOf = (l) => {
    const mean = Number(l.mean);
    const sd = Number(l.sd);
    const value = Number(l.value);
    if (!Number.isFinite(mean) || !Number.isFinite(sd) || sd <= 0 || !Number.isFinite(value) || l.value === '') return null;
    return Number(((value - mean) / sd).toFixed(2));
  };

  const liveVerdict = useMemo(() => {
    const zs = draft.levels.map(zOf).filter((z) => z != null);
    if (!zs.length) return null;
    if (zs.some((z) => Math.abs(z) >= 3)) return QC_VERDICTS.fail;
    if (zs.some((z) => Math.abs(z) >= 2)) return QC_VERDICTS.warning;
    return QC_VERDICTS.pass;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.levels]);

  /* Two lists, deliberately. The strip plots only what still counts, so a
     corrected run stops bending the Levey-Jennings line; the table below
     shows everything ever recorded, including what was amended or voided,
     because that is the record an auditor asks for. */
  const history = useMemo(() => (analyzer ? activeQcRunsFor(analyzer) : []), [analyzer, open, amendOf, voidTarget]);
  const allRuns = useMemo(() => (analyzer ? qcRunsFor(analyzer) : []), [analyzer, open, amendOf, voidTarget]);

  const startAmend = (run) => {
    setAmendOf(run.id);
    setVoidTarget(null);
    setErrors({});
    setDraft({
      at: run.at,
      by: run.by,
      lot: run.lot,
      note: run.note ?? '',
      levels: QC_LEVELS.map((l) => {
        const found = run.levels.find((x) => x.level === l.key);
        return {
          level: l.key,
          value: found ? String(found.value) : '',
          mean: found ? String(found.mean) : '',
          sd: found ? String(found.sd) : '',
        };
      }),
    });
  };

  const cancelAmend = () => {
    setDraft(makeInitial());
    setErrors({});
    resetAmend();
  };

  const handleSubmit = () => {
    const check = validateQcDraft(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    onSubmit?.(draft, amendOf);
  };

  const handleVoid = () => {
    setVoidAttempted(true);
    if (!voidReason.trim()) return;
    onVoid?.(voidTarget.id, voidReason.trim());
    setVoidTarget(null);
    setVoidReason('');
    setVoidAttempted(false);
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={amendOf ? 'แก้ไขผลควบคุมคุณภาพ (IQC)' : 'บันทึกผลควบคุมคุณภาพ (IQC)'}
      subtitle={analyzerName
        ? (amendOf
          ? `${analyzerName} — แก้ไขรายการ ${amendOf}; รายการเดิมจะยังอยู่ในประวัติและถูกทำเครื่องหมายว่าถูกแทนที่`
          : `${analyzerName} — บันทึกทุกระดับที่รันในวันนี้`)
        : undefined}
      /* Popup's FooterButton forwards only onClick/disabled — no title — so
         the reason for the disabled state is stated in the banner at the top
         of the body instead of hidden in a tooltip that never appears. */
      primaryAction={{ label: amendOf ? 'บันทึกการแก้ไข' : 'บันทึกผล QC', onClick: handleSubmit, disabled: !canEdit }}
      secondaryAction={{ label: amendOf ? 'ยกเลิกการแก้ไข' : 'ยกเลิก', onClick: amendOf ? cancelAmend : onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {!canEdit && (
          <Alert
            type='warning'
            iconName='lock'
            iconFill={1}
            title={denyReason ?? 'สิทธิ์ไม่พอ — ดูได้อย่างเดียว'}
            subtext='เปิดหน้านี้ด้วยสิทธิ์เจ้าหน้าที่ห้องปฏิบัติการเพื่อบันทึกหรือแก้ไขผลควบคุมคุณภาพ'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
        <FieldGrid cols={3}>
          <Field label='วัน-เวลาที่รัน' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              value={draft.at}
              error={errors.at}
              onChange={(v) => { setDraft((d) => ({ ...d, at: typeof v === 'string' ? v : v?.target?.value ?? '' })); setErrors((e) => ({ ...e, at: undefined })); }}
            />
          </Field>
          <Field label='ผู้ตรวจสอบ' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              placeholder='ชื่อนักเทคนิคการแพทย์ผู้รัน QC'
              value={draft.by}
              error={errors.by}
              onChange={(v) => { setDraft((d) => ({ ...d, by: typeof v === 'string' ? v : v?.target?.value ?? '' })); setErrors((e) => ({ ...e, by: undefined })); }}
            />
          </Field>
          <Field label='Lot สารควบคุม' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              placeholder='เช่น PNU-2214'
              value={draft.lot}
              error={errors.lot}
              onChange={(v) => { setDraft((d) => ({ ...d, lot: typeof v === 'string' ? v : v?.target?.value ?? '' })); setErrors((e) => ({ ...e, lot: undefined })); }}
            />
          </Field>
        </FieldGrid>

        {draft.levels.map((l, i) => {
          const z = zOf(l);
          const verdict = z == null ? null : evaluateZ(z);
          return (
            <div
              key={l.level}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-300)',
                background: 'var(--surface-card-200)',
                border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                borderRadius: 'var(--dim-radius-300)',
                paddingTop: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
              }}
            >
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                  {QC_LEVELS.find((x) => x.key === l.level)?.label ?? l.level}
                </span>
                <div className='flex-1' />
                {z != null && (
                  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                    <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                      z = {z}
                    </span>
                    <Badge style={verdict.badge} size='small'>{verdict.label}</Badge>
                  </span>
                )}
              </div>
              <FieldGrid cols={3}>
                <Field label='ค่าที่วัดได้' required>
                  <InputField
                    showLabel={false}
                    showLeadingIcon={false}
                    size='md'
                    type='number'
                    value={String(l.value ?? '')}
                    error={errors[`value-${i}`]}
                    onChange={(v) => setLevel(i, { value: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                  />
                </Field>
                <Field label='ค่าเฉลี่ยเป้าหมาย (Mean)' required>
                  <InputField
                    showLabel={false}
                    showLeadingIcon={false}
                    size='md'
                    type='number'
                    value={String(l.mean ?? '')}
                    error={errors[`mean-${i}`]}
                    onChange={(v) => setLevel(i, { mean: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                  />
                </Field>
                <Field label='ส่วนเบี่ยงเบนมาตรฐาน (SD)' required>
                  <InputField
                    showLabel={false}
                    showLeadingIcon={false}
                    size='md'
                    type='number'
                    value={String(l.sd ?? '')}
                    error={errors[`sd-${i}`]}
                    onChange={(v) => setLevel(i, { sd: typeof v === 'string' ? v : v?.target?.value ?? '' })}
                  />
                </Field>
              </FieldGrid>
              {history.length > 0 && (
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    Levey-Jennings — {history.length} ครั้งล่าสุด (เส้นประนอกสุดคือ ±3 SD)
                  </span>
                  <LjStrip runs={history} level={l.level} />
                </div>
              )}
            </div>
          );
        })}

        {liveVerdict?.key === 'fail' && (
          <Alert
            type='destructive'
            iconName='block'
            iconFill={1}
            title='ผล QC หลุดเกณฑ์ควบคุม — เครื่องนี้จะถูกบล็อกไม่ให้นำเข้าผลอัตโนมัติ'
            subtext='แก้ไขสาเหตุแล้วรัน QC ใหม่ หรือให้หัวหน้างานยกเว้นการบล็อกพร้อมระบุเหตุผล'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
        {liveVerdict?.key === 'warning' && (
          <Alert
            type='warning'
            iconName='error'
            iconFill={1}
            title='เข้าเกณฑ์เตือน 1-2s — ควรทวนซ้ำก่อนตรวจผู้ป่วย'
            subtext='กฎ 1-2s เพียงข้อเดียวยังไม่ใช่เหตุให้ปฏิเสธการรัน แต่เป็นสัญญาณให้ตรวจสอบ'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}

        <SuggestibleTextarea
          label='บันทึกการดำเนินการ / สาเหตุ'
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e?.target ? e.target.value : e }))}
          placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
          suggestions={QC_NOTE_SUGGESTIONS}
          minChars={3}
          voice
          rows={2}
          height={104}
        />

        {/* ประวัติการรัน QC — the surface that makes แก้ไข and ยกเลิก reachable
            for a run that was already saved. Before this, a mis-keyed control
            value was permanent and could only be papered over by running the
            control again, which wastes reagent and leaves the wrong number
            driving the import gate in the meantime. */}
        {allRuns.length > 0 && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
              ประวัติการรัน QC ของเครื่องนี้ ({allRuns.length})
            </span>
            {allRuns.slice(0, 8).map((r) => {
              const superseded = Boolean(r.supersededBy);
              const inactive = r.voided || superseded;
              return (
                <div
                  key={r.id}
                  className='flex flex-wrap items-center w-full'
                  style={{
                    gap: 'var(--dim-space-200)',
                    background: 'var(--surface-card-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    borderRadius: 'var(--dim-radius-300)',
                    paddingTop: 'var(--dim-space-300)',
                    paddingBottom: 'var(--dim-space-300)',
                    paddingLeft: 'var(--dim-space-400)',
                    paddingRight: 'var(--dim-space-400)',
                    opacity: inactive ? 0.7 : 1,
                  }}
                >
                  <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {r.id}
                  </span>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
                    {r.at} · {r.by} · Lot {r.lot}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                    {r.levels.map((l) => `${l.level} z=${l.z}`).join('  ')}
                  </span>
                  {r.voided ? (
                    <Badge style='neutral' size='small' icon='undo'>ยกเลิกแล้ว</Badge>
                  ) : superseded ? (
                    <Badge style='neutral' size='small' icon='history'>ถูกแทนที่ด้วย {r.supersededBy}</Badge>
                  ) : (
                    <Badge style={QC_VERDICTS[r.verdict].badge} size='small'>{QC_VERDICTS[r.verdict].label}</Badge>
                  )}
                  {r.voided && r.voidReason && (
                    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                      เหตุผล: {r.voidReason}
                    </span>
                  )}
                  <div className='flex-1' />
                  {!inactive && (
                    <>
                      <NeutralSubdueButton
                        variant='outline'
                        size='sm'
                        leadingIcon='edit'
                        disabled={!canEdit || amendOf === r.id}
                        onClick={() => startAmend(r)}
                      >
                        แก้ไข
                      </NeutralSubdueButton>
                      <DangerSubdueButton
                        variant='outline'
                        size='sm'
                        leadingIcon='undo'
                        disabled={!canEdit}
                        onClick={() => { setVoidTarget(r); setVoidReason(''); setVoidAttempted(false); }}
                      >
                        ยกเลิกรายการ
                      </DangerSubdueButton>
                    </>
                  )}
                </div>
              );
            })}
            {voidTarget && (
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  background: 'var(--surface-alert-warning)',
                  border: 'var(--dim-stroke-100) solid var(--border-alert-warning)',
                  borderRadius: 'var(--dim-radius-300)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                }}
              >
                <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                  ยกเลิกรายการ {voidTarget.id} ({voidTarget.at}) — รายการจะยังอยู่ในประวัติพร้อมเหตุผล แต่จะไม่ถูกใช้ตัดสินสถานะเครื่อง
                </span>
                <InputField
                  label='เหตุผลที่ยกเลิก'
                  required
                  showLeadingIcon={false}
                  size='md'
                  placeholder='เช่น บันทึกผิดเครื่อง · คีย์ค่าผิดหลัก'
                  value={voidReason}
                  error={voidAttempted && !voidReason.trim() ? 'ต้องระบุเหตุผลก่อนจึงจะยกเลิกรายการได้' : undefined}
                  onChange={(v) => setVoidReason(typeof v === 'string' ? v : v?.target?.value ?? '')}
                />
                <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <div className='flex-1' />
                  <NeutralSubdueButton variant='outline' size='sm' onClick={() => { setVoidTarget(null); setVoidReason(''); setVoidAttempted(false); }}>
                    ไม่ยกเลิก
                  </NeutralSubdueButton>
                  <DangerSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={handleVoid}>
                    ยืนยันยกเลิกรายการ
                  </DangerSubdueButton>
                </div>
              </div>
            )}
          </div>
        )}

        {errors.form && (
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-secondary)' }}>
            <Icon name='error' size={14} />
            {errors.form}
          </span>
        )}

        {errors.levels && (
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-secondary)' }}>
            <Icon name='error' size={14} />
            {errors.levels}
          </span>
        )}
      </div>
    </Popup>
  );
};

export default LabQcRunPopup;
