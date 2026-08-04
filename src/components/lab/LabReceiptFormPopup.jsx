import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import Checkbox from '@/components/checkbox/Checkbox';
import { Icon } from '@/components/icons/Icon';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import {
  LAB_RECEIVE_DISPOSITIONS, LAB_RECEIVE_DISPOSITION_BY_KEY,
  LAB_RECEIVE_UNITS, LAB_RECEIVE_STAGE_BY_KEY,
  validateReceiptDraft,
} from '@/data/labReceive';
import { LAB_REJECT_REASONS, LAB_REJECT_REASON_BY_KEY } from '@/data/labOrders';

/* Monospace for accession numbers — a rendering requirement for aligned
   identifiers, not a design-system value. tokens.css defines no
   --type-family-mono, so the var() here only ever resolved to its own
   fallback; a plain stack states that honestly. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


/* แบบฟอร์มรับสิ่งส่งตรวจ — the receipt form behind every row action on
   /lab/receive, and the same form the batch bar opens for a multi-row
   selection (the legacy manual's §2.1.6 "แบบกลุ่ม" is one disposition applied
   to N rows, not a fifth screen).

   Lives in components/lab/ rather than inside LabReceivePage so the page
   stays a worklist and does not grow a 300-line form in its middle — the
   mistake LabQueuePage.jsx already made once at 1,512 lines.

   Every rule enforced here comes from validateReceiptDraft in
   src/data/labReceive.js. The form SURFACES those errors per field; it does
   not re-implement them, so the batch path and the single-row path can
   never diverge in what they accept. */

/* สภาพสิ่งส่งตรวจ — free text typed by a technician, so per CLAUDE.md it is
   a SuggestibleTextarea with voice + suggestions + minChars, never a bare
   textarea. The phrases are the ones a receiving counter actually writes. */
const QUALITY_NOTE_SUGGESTIONS = [
  'ปริมาณเลือดไม่พอต่อการตรวจ — ประสานหน่วยงานให้เจาะเพิ่ม',
  'ตัวอย่างมีลิ่มเลือด (Clot) — ไม่สามารถตรวจได้',
  'เม็ดเลือดแดงแตก (Hemolysis) เห็นได้ชัดจากสีซีรัม',
  'หลอดไม่มีสติกเกอร์ระบุตัวผู้ป่วย — ต้องทิ้งหลอดและเจาะใหม่',
  'สติกเกอร์ไม่ตรงกับใบคำขอ — ตรวจสอบกับหน่วยงานที่ส่งแล้ว',
  'ส่งถึงห้องปฏิบัติการช้ากว่าเวลาที่กำหนด (เกิน 2 ชั่วโมง)',
  'ภาชนะรั่วซึมระหว่างขนส่ง',
  'รอใบคำขอตรวจฉบับจริงจากหน่วยงานที่ส่ง',
  'สภาพตัวอย่างเหมาะสม พร้อมส่งตรวจ',
];

const RowChip = ({ row }) => (
  <div
    className='flex flex-wrap items-center'
    style={{
      gap: 'var(--dim-space-200)',
      background: 'var(--surface-card-200)',
      border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
      borderRadius: 'var(--dim-radius-200)',
      paddingTop: 'var(--dim-space-200)',
      paddingBottom: 'var(--dim-space-200)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
    }}
  >
    <span style={{ fontFamily: MONO, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
      {row.accessionNo}
    </span>
    <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
      {row.testLabel}
    </span>
    {row.tube && <LabTubeDot tube={row.tube} count={row.tubeCount} size={8} />}
    <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
      {row.confidential ? 'ผู้ป่วยปกปิด (VCT)' : `${row.patient?.shortName ?? ''} · HN ${row.patient?.hn ?? ''}`}
    </span>
    {row.urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
  </div>
);

const DispositionCard = ({ option, selected, onSelect }) => (
  <button
    type='button'
    onClick={() => onSelect(option.key)}
    aria-pressed={selected}
    className='flex items-start text-left'
    style={{
      flex: '1 1 160px',
      minWidth: 150,
      gap: 'var(--dim-space-200)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      background: selected ? 'var(--surface-brandPrimary-quaternary)' : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${selected ? 'var(--border-brandPrimary-default)' : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-200)',
      cursor: 'pointer',
    }}
  >
    <Icon
      name={selected ? 'radio_button_checked' : 'radio_button_unchecked'}
      size={18}
      style={{ color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-tertiary)', flexShrink: 0 }}
    />
    <span className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span
        className='inline-flex items-center'
        style={{
          gap: 'var(--dim-space-150)',
          fontFamily: 'var(--type-family-body)',
          fontWeight: 'var(--type-weight-medium)',
          fontSize: 'var(--type-size-sm)',
          color: selected ? 'var(--text-brandPrimary-default)' : 'var(--text-content-default)',
        }}
      >
        <Icon name={option.icon} size={16} />
        {option.label}
      </span>
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
        {option.key === 'accept' && 'รับไว้และส่งต่อขั้นตอนถัดไป'}
        {option.key === 'reject' && 'ต้องระบุเหตุผลการปฏิเสธ'}
        {option.key === 'hold' && 'ค้างไว้ที่จุดรับ — ยังไม่ปฏิเสธ'}
        {option.key === 'addon' && 'ต้องระบุรายการที่ขอตรวจเพิ่ม'}
      </span>
    </span>
  </button>
);

const LabReceiptFormPopup = ({
  open,
  rows = [],
  stage,
  receiver,
  existing = null,
  mode = 'create',
  onClose,
  onSubmit,
}) => {
  const stageDef = LAB_RECEIVE_STAGE_BY_KEY[stage] ?? null;
  const batch = rows.length > 1;

  const makeInitial = () => ({
    stage,
    disposition: existing?.disposition ?? 'accept',
    quantity: existing?.quantity ?? (rows[0]?.volumeMl || 3),
    unit: existing?.unit ?? 'mL',
    serialNo: existing?.serialNo ?? '',
    receivedBy: existing?.receivedBy ?? receiver?.name ?? '',
    receiverPosition: existing?.receiverPosition ?? receiver?.position ?? '',
    receivedAt: existing?.receivedAt ?? new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
    rejectReason: existing?.rejectReason ?? '',
    addOnTest: existing?.addOnTest ?? '',
    qualityOk: existing?.qualityOk ?? true,
    qualityNote: existing?.qualityNote ?? '',
  });

  const [draft, setDraft] = useState(makeInitial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  /* Re-seed whenever the popup opens against a different selection —
     otherwise a quantity keyed for the previous tube would silently ride
     along onto the next one. */
  useEffect(() => {
    if (!open) return;
    setDraft(makeInitial());
    setErrors({});
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stage, existing, rows.map((r) => r.id).join(','), receiver?.name]);

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { next[k] = undefined; });
      return next;
    });
  };

  const dispositionDef = LAB_RECEIVE_DISPOSITION_BY_KEY[draft.disposition] ?? null;
  const live = useMemo(() => validateReceiptDraft(draft), [draft]);
  const shownErrors = touched ? { ...live.errors, ...errors } : errors;

  const rejectReason = LAB_REJECT_REASON_BY_KEY[draft.rejectReason] ?? null;

  const handleSubmit = () => {
    setTouched(true);
    const check = validateReceiptDraft(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    onSubmit?.(draft);
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title={mode === 'amend' ? 'แก้ไขการรับสิ่งส่งตรวจ' : `บันทึกรับสิ่งส่งตรวจ — ${stageDef?.label ?? ''}`}
      subtitle={batch
        ? `บันทึกผลการรับเดียวกันให้ ${rows.length} รายการที่เลือกไว้ (${stageDef?.manual ?? ''} แบบกลุ่ม)`
        : stageDef?.hint}
      primaryAction={{ label: mode === 'amend' ? 'บันทึกการแก้ไข' : 'บันทึกการรับ', onClick: handleSubmit }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {/* What is being received. In batch mode the list is capped so the
            dialog cannot grow past the viewport on a 30-row selection. */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
            รายการที่กำลังรับ ({rows.length})
          </span>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150)', maxHeight: 168, overflowY: 'auto' }}>
            {rows.slice(0, 12).map((r) => <RowChip key={r.id} row={r} />)}
            {rows.length > 12 && (
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                และอีก {rows.length - 12} รายการ
              </span>
            )}
          </div>
        </div>

        {/* ผลการรับ — the legacy form's four-way disposition. */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-input-label)' }}>
            ผลการรับ <span style={{ color: 'var(--text-input-require)' }}>*</span>
          </span>
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-200)' }}>
            {LAB_RECEIVE_DISPOSITIONS.map((d) => (
              <DispositionCard
                key={d.key}
                option={d}
                selected={draft.disposition === d.key}
                onSelect={(k) => set({ disposition: k })}
              />
            ))}
          </div>
          {shownErrors.disposition && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-secondary)' }}>
              {shownErrors.disposition}
            </span>
          )}
        </div>

        {/* ปฏิเสธ — reason is required, and a patient-safety reason says so
            before the user commits, not after. */}
        {dispositionDef?.needsReason && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <Field label='เหตุผลการปฏิเสธ' required>
              <Select
                placeholder='เลือกเหตุผลการปฏิเสธ'
                value={draft.rejectReason}
                error={shownErrors.rejectReason}
                options={LAB_REJECT_REASONS.map((r) => ({
                  value: r.key,
                  label: r.label,
                  subtext: r.patientSafety
                    ? 'ต้องทิ้งหลอดและเจาะใหม่ — สติกเกอร์เดิมใช้ไม่ได้'
                    : (r.redrawRequired ? 'ต้องเจาะซ้ำ' : 'ไม่ต้องเจาะซ้ำ'),
                }))}
                onChange={(v) => set({ rejectReason: v })}
                showLabel={false}
                size='md'
                searchable={false}
              />
            </Field>
            {rejectReason && (
              <Alert
                type={rejectReason.patientSafety ? 'destructive' : 'warning'}
                iconName={rejectReason.patientSafety ? 'dangerous' : 'replay'}
                iconFill={1}
                title={rejectReason.patientSafety
                  ? 'หลอดนี้ต้องทิ้งและเจาะใหม่พร้อมพิมพ์สติกเกอร์ใหม่'
                  : (rejectReason.redrawRequired ? 'ระบบจะส่งกลับไปยังขั้นตอนรอเก็บตัวอย่างเพื่อเจาะซ้ำ' : 'ระบบจะบันทึกการปฏิเสธโดยไม่สั่งเจาะซ้ำ')}
                subtext={rejectReason.patientSafety
                  ? 'ตัวอย่างที่ระบุตัวผู้ป่วยไม่ได้ ไม่สามารถแก้ไขด้วยการติดสติกเกอร์ใหม่บนหลอดเดิม'
                  : undefined}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
                showSubtext={!!rejectReason.patientSafety}
              />
            )}
          </div>
        )}

        {/* ตรวจเพิ่ม — the added test must be named or nobody downstream
            knows what to run. */}
        {dispositionDef?.needsAddOn && (
          <Field label='รายการที่ขอตรวจเพิ่มบนสิ่งส่งตรวจเดิม' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              placeholder='เช่น Electrolytes (ใช้ซีรัมหลอดเดิม)'
              value={draft.addOnTest}
              error={shownErrors.addOnTest}
              onChange={(v) => set({ addOnTest: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </Field>
        )}

        {/* ปริมาณ + หน่วย + serial. Only meaningful for a disposition that
            actually takes the specimen in. */}
        {(draft.disposition === 'accept' || draft.disposition === 'addon') && (
          <FieldGrid cols={3}>
            <Field label='ปริมาณที่รับ' required>
              <InputField
                showLabel={false}
                showLeadingIcon={false}
                size='md'
                type='number'
                placeholder='เช่น 3'
                value={String(draft.quantity ?? '')}
                error={shownErrors.quantity}
                onChange={(v) => set({ quantity: typeof v === 'string' ? v : v?.target?.value ?? '' })}
              />
            </Field>
            <Field label='หน่วย' required>
              <Select
                placeholder='เลือกหน่วย'
                value={draft.unit}
                error={shownErrors.unit}
                options={LAB_RECEIVE_UNITS.map((u) => ({ value: u, label: u }))}
                onChange={(v) => set({ unit: v })}
                showLabel={false}
                size='md'
                searchable={false}
              />
            </Field>
            <Field label='เลขที่ Serial ของสิ่งส่งตรวจ' hint='เว้นว่างได้ — ระบบจะอ้างอิงด้วย Accession'>
              <InputField
                showLabel={false}
                showLeadingIcon={false}
                size='md'
                placeholder='เช่น SN-690731-0041'
                value={draft.serialNo}
                onChange={(v) => set({ serialNo: typeof v === 'string' ? v : v?.target?.value ?? '' })}
              />
            </Field>
          </FieldGrid>
        )}

        {/* ผู้รับ + เวลา. Pre-filled from the station header but editable,
            because a receipt keyed an hour late must record the time the
            specimen actually arrived, not the time it was typed. */}
        <FieldGrid cols={2}>
          <Field label='ผู้รับ' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              placeholder='เลือกผู้รับที่หัวหน้าจอก่อน'
              value={draft.receivedBy}
              error={shownErrors.receivedBy}
              onChange={(v) => set({ receivedBy: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </Field>
          <Field label='วัน-เวลาที่รับ' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              value={draft.receivedAt}
              error={shownErrors.receivedAt}
              onChange={(v) => set({ receivedAt: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </Field>
        </FieldGrid>

        {/* สภาพสิ่งส่งตรวจ — the legacy form's "ไม่สามารถดำเนินการตรวจได้
            เพราะ …" line. Marking it unsuitable makes the note mandatory. */}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <Checkbox
            checked={draft.qualityOk === false}
            onChange={(next) => set({ qualityOk: !next })}
            label='สภาพสิ่งส่งตรวจไม่เหมาะสม — ไม่สามารถดำเนินการตรวจได้'
            description='ติ๊กเมื่อพบปัญหาที่ตัวอย่าง เช่น ปริมาณไม่พอ มีลิ่มเลือด หรือภาชนะรั่ว'
          />
          <SuggestibleTextarea
            label={draft.qualityOk === false ? 'ระบุเหตุผลที่ไม่สามารถดำเนินการตรวจได้' : 'บันทึกสภาพสิ่งส่งตรวจ (ถ้ามี)'}
            required={draft.qualityOk === false}
            value={draft.qualityNote}
            onChange={(e) => set({ qualityNote: e?.target ? e.target.value : e })}
            placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
            suggestions={QUALITY_NOTE_SUGGESTIONS}
            minChars={3}
            voice
            rows={3}
            height={120}
          />
          {shownErrors.qualityNote && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-danger-secondary)' }}>
              {shownErrors.qualityNote}
            </span>
          )}
        </div>

        {batch && (
          <Alert
            type='info'
            iconName='checklist'
            title={`จะบันทึกผลการรับเดียวกันให้ทั้ง ${rows.length} รายการ`}
            subtext='หากรายการใดมีสภาพต่างกัน ให้แยกบันทึกทีละรายการแทน'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
      </div>
    </Popup>
  );
};

export default LabReceiptFormPopup;
