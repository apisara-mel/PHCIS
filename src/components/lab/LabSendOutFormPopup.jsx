import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Field, FieldGrid } from '@/components/forms/Fields';
import { Icon } from '@/components/icons/Icon';
import LabTubeDot from '@/pages/lab/LabTubeDot';
import {
  LAB_EXTERNAL_LABS, LAB_EXTERNAL_LAB_BY_KEY, LAB_COURIERS,
  LAB_SENDOUT_REASONS, validateSendOutDraft, summariseSendOut,
} from '@/data/labSendOuts';

/* Monospace for accession numbers and identifiers — a rendering requirement,
   not a design-system value. tokens.css defines no --type-family-mono, and a
   var() that only ever resolves to its own fallback silently drifts the day a
   theme defines one. Plain stack, stated once. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


/* แบบฟอร์มส่งคำขอไปหน่วยงานที่ตรวจ — the legacy manual's §2.1.3, opened from
   the selection bar on /lab/send-out.

   The confirmation summary is not decoration: the legacy screen shows the
   consignment grouped by ประเภทงาน with a รวมจำนวนสิ่งส่งตรวจ block BEFORE
   committing, because the person packing the cool box counts physical tubes
   against that number. Committing first and counting afterwards is how a
   specimen goes missing without anyone noticing for two days. */

const SENDOUT_NOTE_SUGGESTIONS = [
  'ส่งพร้อมรายการอื่นในกล่องเดียวกัน — ตรวจนับก่อนปิดกล่อง',
  'ต้องควบคุมอุณหภูมิ 2–8 °C ตลอดการขนส่ง',
  'แนบสำเนาใบคำขอตรวจและใบส่งต่อผู้ป่วยไปด้วย',
  'ประสานหน่วยงานปลายทางทางโทรศัพท์แล้ว — ผู้รับทราบเรื่อง',
  'ขอผลด่วน — แจ้งกลับทางโทรศัพท์ทันทีที่ทราบผล',
  'ตัวอย่างซ้ำจากการเจาะครั้งที่ 2 — ยกเลิกใบนำส่งฉบับก่อนหน้า',
];

const parseIso = (s) => {
  if (!s) return null;
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toIso = (d) => {
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const addDays = (iso, days) => {
  const d = parseIso(iso);
  if (!d) return '';
  d.setDate(d.getDate() + (Number(days) || 0));
  return toIso(d);
};

const LabSendOutFormPopup = ({ open, rows = [], today, onClose, onConfirm }) => {
  const makeInitial = () => ({
    labKey: '',
    reason: '',
    courier: '',
    sentAt: `${today} ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`,
    expectedAt: '',
    note: '',
  });

  const [draft, setDraft] = useState(makeInitial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(makeInitial());
    setErrors({});
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows.map((r) => r.id).join(','), today]);

  const lab = LAB_EXTERNAL_LAB_BY_KEY[draft.labKey] ?? null;
  const summary = useMemo(() => summariseSendOut(rows), [rows]);
  const live = useMemo(() => validateSendOutDraft(draft), [draft]);
  const shown = touched ? { ...live.errors, ...errors } : errors;

  const set = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => { next[k] = undefined; });
      return next;
    });
  };

  /* Choosing the destination auto-computes the expected return date from
     that lab's own turnaroundDays — the number the "เกินกำหนด" flag is later
     measured against. Still editable: a lab can promise faster for a STAT. */
  const chooseLab = (key) => {
    const chosen = LAB_EXTERNAL_LAB_BY_KEY[key];
    set({
      labKey: key,
      expectedAt: chosen ? addDays(draft.sentAt, chosen.turnaroundDays) : draft.expectedAt,
    });
  };

  const handleConfirm = () => {
    setTouched(true);
    if (!rows.length) {
      setErrors({ labKey: 'ต้องเลือกอย่างน้อย 1 รายการก่อนยืนยันการส่ง' });
      return;
    }
    const check = validateSendOutDraft(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    onConfirm?.(draft);
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='ยืนยันส่งคำขอตรวจไปหน่วยงานภายนอก'
      subtitle='ตรวจสอบจำนวนสิ่งส่งตรวจให้ตรงกับที่บรรจุจริงก่อนยืนยัน — ระบบจะออกเลขที่ใบนำส่งและพิมพ์ใบนำส่งให้'
      primaryAction={{ label: 'ยืนยันการส่ง', onClick: handleConfirm }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {rows.length === 0 && (
          <Alert
            type='warning'
            iconName='error'
            iconFill={1}
            title='ยังไม่ได้เลือกรายการที่จะส่ง'
            subtext='เลือกรายการจากตาราง "รอส่ง" อย่างน้อย 1 รายการก่อน'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}

        <FieldGrid cols={2}>
          <Field label='หน่วยงานปลายทาง' required span={2}>
            <Select
              placeholder='เลือกหน่วยงานที่จะส่งตรวจ'
              value={draft.labKey}
              error={shown.labKey}
              options={LAB_EXTERNAL_LABS.map((l) => ({
                value: l.key,
                label: l.name,
                subtext: `${l.scope} · ตอบกลับ ${l.turnaroundDays} วัน · ${l.courier}`,
              }))}
              onChange={chooseLab}
              showLabel={false}
              size='md'
            />
          </Field>
        </FieldGrid>

        {lab && (
          <div
            className='flex flex-wrap w-full'
            style={{
              gap: 'var(--dim-space-400)',
              background: 'var(--surface-card-200)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              borderRadius: 'var(--dim-radius-300)',
              paddingTop: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-400)',
              paddingRight: 'var(--dim-space-400)',
            }}
          >
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              <Icon name='call' size={14} /> {lab.contact}
            </span>
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              <Icon name='local_shipping' size={14} /> {lab.courier}
            </span>
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}>
              <Icon name='schedule' size={14} /> ตอบกลับภายใน {lab.turnaroundDays} วัน
            </span>
          </div>
        )}

        <FieldGrid cols={2}>
          <Field label='เหตุผลที่ส่งตรวจภายนอก' required>
            <Select
              placeholder='เลือกเหตุผล'
              value={draft.reason}
              error={shown.reason}
              options={LAB_SENDOUT_REASONS.map((r) => ({ value: r.key, label: r.label }))}
              onChange={(v) => set({ reason: v })}
              showLabel={false}
              size='md'
              searchable={false}
            />
          </Field>
          <Field label='ผู้นำส่ง' required>
            <Select
              placeholder='เลือกผู้นำส่ง'
              value={draft.courier}
              error={shown.courier}
              options={LAB_COURIERS.map((c) => ({ value: c, label: c }))}
              onChange={(v) => set({ courier: v })}
              showLabel={false}
              size='md'
              searchable={false}
            />
          </Field>
          <Field label='วัน-เวลาที่ส่ง' required>
            <InputField
              showLabel={false}
              showLeadingIcon={false}
              size='md'
              placeholder='เช่น 2026-08-05 10:00'
              value={draft.sentAt}
              error={shown.sentAt}
              onChange={(v) => set({ sentAt: typeof v === 'string' ? v : v?.target?.value ?? '' })}
            />
          </Field>
          <Field
            label='วันที่คาดว่าจะได้ผล'
            required
            hint={lab ? `คำนวณจากระยะเวลาตอบกลับ ${lab.turnaroundDays} วันของหน่วยงานปลายทาง` : undefined}
          >
            <DatePicker
              showFieldName={false}
              showLabel={false}
              size='md'
              placeholder='เลือกวันที่คาดว่าจะได้ผล'
              value={parseIso(draft.expectedAt)}
              minDate={parseIso(draft.sentAt)}
              error={shown.expectedAt}
              onChange={(d) => set({ expectedAt: toIso(d) })}
            />
          </Field>
        </FieldGrid>

        <SuggestibleTextarea
          label='หมายเหตุถึงหน่วยงานปลายทาง'
          value={draft.note}
          onChange={(e) => set({ note: e?.target ? e.target.value : e })}
          placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
          suggestions={SENDOUT_NOTE_SUGGESTIONS}
          minChars={3}
          voice
          rows={2}
          height={104}
        />

        {/* สรุปก่อนยืนยัน — grouped by ประเภทงาน with the specimen roll-up
            underneath, exactly the legacy screen's shape. */}
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300)',
            background: 'var(--surface-brandPrimary-quaternary)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-tertiary)',
            borderRadius: 'var(--dim-radius-300)',
            paddingTop: 'var(--dim-space-400)',
            paddingBottom: 'var(--dim-space-400)',
            paddingLeft: 'var(--dim-space-400)',
            paddingRight: 'var(--dim-space-400)',
          }}
        >
          <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-sm)', color: 'var(--text-brandPrimary-default)' }}>
            สรุปรายการที่จะส่ง — รวม {summary.totalSpecimens} สิ่งส่งตรวจ · {summary.totalTests} รายการตรวจ
          </span>
          {summary.groups.map((g) => (
            <div key={g.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100)' }}>
              <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-default)' }}>
                {g.label} ({g.rows.length})
              </span>
              {g.rows.map((r) => (
                <span
                  key={r.id}
                  className='inline-flex items-center flex-wrap'
                  style={{ gap: 'var(--dim-space-200)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary)' }}
                >
                  <span style={{ fontFamily: MONO }}>{r.accessionNo}</span>
                  <span>{r.confidential ? `${r.groupLabel} (ปกปิด)` : r.testLabel}</span>
                  {r.tube && <LabTubeDot tube={r.tube} count={r.tubeCount} size={8} />}
                  <span>{r.confidential ? 'ผู้ป่วยปกปิด' : r.patient?.shortName}</span>
                  {r.urgency === 'stat' && <Badge style='error' size='small'>STAT</Badge>}
                </span>
              ))}
            </div>
          ))}
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)' }}>
            {summary.specimenGroups.map((s) => (
              <span key={s.key} style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                {s.label} {s.specimens} ตัวอย่าง
              </span>
            ))}
          </div>
        </div>

        {/* Confidential rows are named by GROUP only on the manifest — a
            printed sheet handled by a courier must not carry "Anti-HIV"
            beside a patient's name. */}
        {rows.some((r) => r.confidential) && (
          <Alert
            type='info'
            iconName='lock'
            iconFill={1}
            title='มีรายการที่เป็นผลตรวจปกปิดอยู่ในชุดนี้'
            subtext='ใบนำส่งจะพิมพ์เฉพาะชื่อกลุ่มตรวจและ Accession — ไม่พิมพ์ชื่อรายการตรวจและชื่อผู้ป่วย'
            showBadge={false}
            showIndicator={false}
            showDetail={false}
          />
        )}
      </div>
    </Popup>
  );
};

export default LabSendOutFormPopup;
