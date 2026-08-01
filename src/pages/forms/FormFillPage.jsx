import React, { useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ESignatureField from '@/components/form-builder/ESignatureField';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import NeutralButton from '@/components/button/NeutralButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  getFormBySlug,
  getCategory,
  CATEGORY_PALETTE,
} from '@/data/formsLibrary';

/* คลังแบบฟอร์ม — Fill page.

   Same surface for two callers:
     • Staff on desktop ("เจ้าหน้าที่กรอกในเครื่องนี้" from FormDetailPage)
     • Patient on phone (QR target — Sidebar collapses to drawer < md)

   `?role=patient` strips clinician chrome (back-to-catalog / "เจ้าหน้าที่
   กรอกแทน" banner) so the QR-landed view feels patient-facing without a
   separate page. */

const RADIO_4_OPTIONS = [
  { value: 0, label: 'ไม่เลย' },
  { value: 1, label: 'บางวัน' },
  { value: 2, label: 'มากกว่าครึ่ง' },
  { value: 3, label: 'เกือบทุกวัน' },
];

const RADIO_5_OPTIONS = [
  { value: 1, label: 'น้อยที่สุด' },
  { value: 2, label: 'น้อย' },
  { value: 3, label: 'ปานกลาง' },
  { value: 4, label: 'มาก' },
  { value: 5, label: 'มากที่สุด' },
];

const SELECT_FALLBACK = [
  { value: '', label: 'กรุณาเลือก' },
  { value: 'option1', label: 'ตัวเลือกที่ 1' },
  { value: 'option2', label: 'ตัวเลือกที่ 2' },
  { value: 'option3', label: 'ตัวเลือกที่ 3' },
];

/* Field renderers — each receives (value, onChange, field, key). Visual
   alias from design tokens (--surface-input-*, --border-input-*, etc.) so
   brand-swap retints automatically. */

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--surface-input-default)',
  border: 'var(--dim-stroke-100) solid var(--border-input-default)',
  borderRadius: 'var(--dim-radius-200)',
  color: 'var(--text-input-filled)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  outline: 'none',
};

const TextRenderer = ({ value, onChange, field }) => (
  <input
    type='text'
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder || `กรอก${field.label}`}
    style={fieldStyle}
  />
);

const TextareaRenderer = ({ value, onChange, field }) => (
  <textarea
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    placeholder={field.placeholder || `กรอก${field.label}`}
    rows={3}
    style={{ ...fieldStyle, resize: 'vertical', minHeight: 96 }}
  />
);

const DateRenderer = ({ value, onChange }) => (
  <input
    type='date'
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    style={fieldStyle}
  />
);

const DateTimeRenderer = ({ value, onChange }) => (
  <input
    type='datetime-local'
    value={value || ''}
    onChange={(e) => onChange(e.target.value)}
    style={fieldStyle}
  />
);

const SelectRenderer = ({ value, onChange, field }) => {
  const options = field.options || SELECT_FALLBACK;
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...fieldStyle, appearance: 'none', backgroundPosition: 'right 12px center' }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

const CheckboxRenderer = ({ value, onChange, field }) => (
  <label
    className='flex items-center cursor-pointer w-full'
    style={{
      gap: 'var(--dim-space-300)',
      padding: 'var(--dim-space-300)',
      background: value
        ? 'var(--surface-brandPrimary-quaternary)'
        : 'var(--surface-card-100)',
      border: `var(--dim-stroke-100) solid ${value
        ? 'var(--border-brandPrimary-default)'
        : 'var(--border-card-default)'}`,
      borderRadius: 'var(--dim-radius-200)',
    }}
  >
    <input
      type='checkbox'
      checked={!!value}
      onChange={(e) => onChange(e.target.checked)}
      style={{ width: 18, height: 18, accentColor: 'var(--surface-brandPrimary-default)' }}
    />
    <span className='text-sm text-ink'>
      {field.label}
      {field.required && <span className='ml-1' style={{ color: 'var(--text-input-require)' }}>*</span>}
    </span>
  </label>
);

const RadioGroup = ({ value, onChange, options, name }) => (
  <div
    className='flex flex-wrap w-full'
    style={{ gap: 'var(--dim-space-200)' }}
  >
    {options.map((opt) => {
      const selected = String(value) === String(opt.value);
      return (
        <label
          key={opt.value}
          className='flex items-center cursor-pointer'
          style={{
            gap: 'var(--dim-space-200)',
            padding: '8px 14px',
            minHeight: 40,
            background: selected
              ? 'var(--surface-brandPrimary-quaternary)'
              : 'var(--surface-card-100)',
            border: `var(--dim-stroke-100) solid ${selected
              ? 'var(--border-brandPrimary-default)'
              : 'var(--border-card-default)'}`,
            borderRadius: 'var(--dim-radius-full)',
            color: selected
              ? 'var(--text-brandPrimary-default)'
              : 'var(--text-content-secondary)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: selected ? 'var(--type-weight-medium)' : 'var(--type-weight-regular)',
            transition: 'background 120ms ease, border-color 120ms ease',
          }}
        >
          <input
            type='radio'
            name={name}
            checked={selected}
            onChange={() => onChange(opt.value)}
            style={{ accentColor: 'var(--surface-brandPrimary-default)' }}
          />
          {opt.label}
        </label>
      );
    })}
  </div>
);

const SliderRenderer = ({ value, onChange }) => {
  const num = typeof value === 'number' ? value : 0;
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <div className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
        <span className='text-xs text-ink-tertiary' style={{ minWidth: 24 }}>0</span>
        <input
          type='range'
          min={0}
          max={10}
          step={1}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: 'var(--surface-brandPrimary-default)' }}
        />
        <span className='text-xs text-ink-tertiary' style={{ minWidth: 24, textAlign: 'right' }}>10</span>
      </div>
      <div className='text-sm font-bold' style={{ color: 'var(--text-brandPrimary-default)' }}>
        ระดับที่เลือก: {num}
      </div>
    </div>
  );
};

/* ลายเซ็นจริง 3 ช่องทาง (TOR 1.8.4.1–2): เลือกที่บันทึก / วาดใหม่ / อัปโหลด. */
const SignatureRenderer = ({ value, onChange }) => (
  <ESignatureField value={typeof value === 'string' ? value : ''} onChange={onChange} />
);

const renderField = (field, key, value, onChange) => {
  switch (field.type) {
    case 'text':       return <TextRenderer     value={value} onChange={onChange} field={field} />;
    case 'textarea':   return <TextareaRenderer value={value} onChange={onChange} field={field} />;
    case 'date':       return <DateRenderer     value={value} onChange={onChange} />;
    case 'datetime':   return <DateTimeRenderer value={value} onChange={onChange} />;
    case 'select':     return <SelectRenderer   value={value} onChange={onChange} field={field} />;
    case 'checkbox':   return <CheckboxRenderer value={value} onChange={onChange} field={field} />;
    case 'signature':  return <SignatureRenderer value={value} onChange={onChange} />;
    case 'slider-0-10':return <SliderRenderer   value={value} onChange={onChange} />;
    case 'radio-4':    return <RadioGroup value={value} onChange={onChange} options={RADIO_4_OPTIONS} name={key} />;
    case 'radio-5':    return <RadioGroup value={value} onChange={onChange} options={RADIO_5_OPTIONS} name={key} />;
    default:           return <TextRenderer value={value} onChange={onChange} field={field} />;
  }
};

/* Checkboxes render their own label inline (so the whole row is tap-target).
   For everything else we render an explicit label row above the control. */
const needsExternalLabel = (type) => type !== 'checkbox';

const FieldBlock = ({ field, fieldKey, value, onChange }) => (
  <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
    {needsExternalLabel(field.type) && (
      <label
        className='text-sm font-medium'
        style={{ color: 'var(--text-content-primary)' }}
      >
        {field.label}
        {field.required && (
          <span className='ml-1' style={{ color: 'var(--text-input-require)' }}>*</span>
        )}
      </label>
    )}
    {renderField(field, fieldKey, value, onChange)}
  </div>
);

const SectionCard = ({ section, sectionIndex, values, setValue }) => (
  <section
    className='flex flex-col w-full'
    style={{
      padding: 'var(--dim-space-500)',
      gap: 'var(--dim-space-400)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      borderRadius: 'var(--dim-radius-500)',
    }}
  >
    <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
      <span
        className='inline-flex items-center justify-center shrink-0'
        style={{
          width: 28,
          height: 28,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-default)',
          color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
          fontWeight: 'var(--type-weight-bold)',
          fontSize: 'var(--type-size-xs)',
        }}
      >
        {sectionIndex + 1}
      </span>
      <h3 className='text-base font-bold text-ink'>{section.title}</h3>
    </div>
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {section.fields.map((f, i) => {
        const fieldKey = `s${sectionIndex}-f${i}`;
        return (
          <FieldBlock
            key={fieldKey}
            fieldKey={fieldKey}
            field={f}
            value={values[fieldKey]}
            onChange={(v) => setValue(fieldKey, v)}
          />
        );
      })}
    </div>
  </section>
);

const FormFillPage = () => {
  const { slug } = useParams();
  const history = useHistory();
  const form = getFormBySlug(slug);
  const category = form ? getCategory(form.category) : null;
  const tone = category ? CATEGORY_PALETTE[category.color] : null;

  /* `?role=patient` swaps the banner copy + hides the "back to catalog"
     link so a QR-scan landing reads as patient-facing rather than
     clinician-facing. Defaults to the staff (in-clinic) role. */
  const role = useMemo(() => {
    if (typeof window === 'undefined') return 'staff';
    const p = new URLSearchParams(window.location.search).get('role');
    return p === 'patient' ? 'patient' : 'staff';
  }, []);

  const [values, setValues] = useState({});
  const [submitted, setSubmitted] = useState(false);
  /* Edge case (pages-prompt หน้า 4): ผู้ป่วยเลือก "ไม่ยินยอม" ได้ —
     confirm ก่อน แล้วบันทึกสถานะ declined (audit ยังเก็บครบ ไม่ลบคำขอ) */
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declined, setDeclined] = useState(false);

  const setValue = (key, v) => setValues((prev) => ({ ...prev, [key]: v }));

  /* Validation (TOR 1.4.9.1 + spec): ช่อง required (รวม signature) ว่าง
     → block submit พร้อมบอกจำนวนที่เหลือ */
  const missingRequired = useMemo(() => {
    if (!form) return [];
    const out = [];
    form.sections.forEach((section, si) => {
      (section.fields || []).forEach((f, fi) => {
        if (!f.required) return;
        const v = values[`s${si}-f${fi}`];
        const empty = v === undefined || v === null || v === '' || v === false;
        if (empty) out.push(f.label);
      });
    });
    return out;
  }, [form, values]);

  /* รหัสอ้างอิงของการส่ง (mock — deterministic ต่อฟอร์ม/วัน) */
  const refCode = useMemo(() => {
    const seed = `${slug}-${new Date().toDateString()}`;
    let h = 0;
    for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 100000;
    return `CST-${String(h).padStart(5, '0')}`;
  }, [slug]);

  if (!form) {
    return (
      <div className='min-h-screen w-full flex bg-brand-50'>
        <Sidebar activeKey='consent' />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['คลังแบบฟอร์ม', 'ไม่พบแบบฟอร์ม']} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>
            ไม่พบแบบฟอร์มที่ตรงกับลิงก์นี้
          </div>
        </main>
      </div>
    );
  }

  const breadcrumb = role === 'patient'
    ? [form.name]
    : ['คลังแบบฟอร์ม', category?.label || '', form.name, 'กรอกแบบฟอร์ม'].filter(Boolean);

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar activeKey='consent' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          {/* Back link — staff only */}
          {role === 'staff' && !submitted && !declined && (
            <div>
              <button
                type='button'
                onClick={() => history.push(`/forms/${slug}`)}
                className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
              >
                <Icon name='chevron-left' size={16} />
                กลับไปยังหน้ารายละเอียดแบบฟอร์ม
              </button>
            </div>
          )}

          {/* Mode banner */}
          {!submitted && !declined && (
            <section
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-300)',
                background: role === 'staff'
                  ? 'var(--surface-colorfulbadge-blue)'
                  : 'var(--surface-brandPrimary-quaternary)',
                color: role === 'staff'
                  ? 'var(--text-colorfulbadge-blue)'
                  : 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name={role === 'staff' ? 'support_agent' : 'smartphone'} size={20} />
              <div className='flex-1 min-w-0 flex flex-col'>
                <span className='text-sm font-bold'>
                  {role === 'staff'
                    ? 'โหมดเจ้าหน้าที่กรอกแทนผู้ป่วย'
                    : 'แบบฟอร์มสำหรับผู้ป่วย'}
                </span>
                <span className='text-xs' style={{ opacity: 0.85 }}>
                  {role === 'staff'
                    ? 'กรอกข้อมูลแทนผู้ป่วยผ่านคอมพิวเตอร์เครื่องนี้ — บันทึกเสร็จระบบจะแสดงสรุปข้อมูล'
                    : 'กรุณากรอกข้อมูลตามจริง ระบบบันทึกข้อมูลในระบบเวชระเบียนเมื่อกดส่ง'}
                </span>
              </div>
            </section>
          )}

          {/* Hero */}
          {!submitted && !declined && (
            <section
              className='bg-surface-card rounded-card shadow-card flex items-start w-full'
              style={{ gap: 'var(--dim-space-400)', padding: 'var(--dim-space-500)' }}
            >
              {tone && (
                <div
                  className='shrink-0 inline-flex items-center justify-center'
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--dim-radius-400)',
                    background: tone.surface,
                    color: tone.text,
                  }}
                >
                  <Icon name={category.icon} size={22} />
                </div>
              )}
              <div className='flex-1 min-w-0 flex flex-col gap-1'>
                <h1 className='text-lg font-bold text-ink' style={{ margin: 'var(--dim-space-0)' }}>{form.name}</h1>
                <p className='text-sm text-ink-secondary' style={{ margin: 'var(--dim-space-0)' }}>{form.summary}</p>
                <p className='text-xs text-ink-tertiary'>
                  เวอร์ชัน {form.version} · ใช้เวลา ~{form.estimatedMinutes} นาที
                </p>
              </div>
            </section>
          )}

          {declined ? (
            /* Edge case: ผู้ป่วยไม่ยินยอม — คำขอถูกบันทึกเป็น declined
               (ไม่ลบ audit, Reconsent ได้ภายหลังจาก worklist) */
            <section
              className='bg-surface-card rounded-card shadow-card flex flex-col items-center w-full text-center'
              style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-400)' }}
            >
              <div
                className='inline-flex items-center justify-center'
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-colorfulbadge-red, #FDEBEC)',
                  color: 'var(--text-colorfulbadge-red, #B91C1C)',
                }}
              >
                <Icon name='do_not_disturb_on' size={36} />
              </div>
              <h2 className='text-lg font-bold text-ink'>บันทึกการไม่ยินยอมแล้ว</h2>
              <p className='text-sm text-ink-secondary' style={{ maxWidth: 440 }}>
                ระบบบันทึกว่าท่านเลือก<strong className='mx-1 text-ink'>ไม่ยินยอม</strong>
                สำหรับ {form.name} — การตัดสินใจนี้ไม่กระทบสิทธิการรับบริการอื่น ๆ
                และท่านสามารถให้ความยินยอมใหม่ได้ทุกเมื่อที่จุดบริการ
              </p>
              <span
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-150)',
                  padding: 'var(--dim-space-150) var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                รหัสอ้างอิง
                <strong style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-bold)' }}>{refCode}</strong>
              </span>
              <div className='w-full' style={{ maxWidth: 560 }}>
                <ConsentAuditBar
                  recordedBy={role === 'staff' ? 'พญ.สมหญิง รักษ์ดี' : 'ผู้รับบริการ (ผ่าน QR)'}
                  recordedAt={new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                />
              </div>
              <div className='flex flex-wrap items-center justify-center' style={{ gap: 'var(--dim-space-300)' }}>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={() => { setDeclined(false); setValues({}); }}
                >
                  เปลี่ยนใจ — กรอกแบบฟอร์มใหม่
                </NeutralSubdueButton>
                {role === 'staff' && (
                  <BrandButton size='md' onClick={() => history.push('/forms')}>
                    กลับไปคลังแบบฟอร์ม
                  </BrandButton>
                )}
              </div>
            </section>
          ) : submitted ? (
            <section
              className='bg-surface-card rounded-card shadow-card flex flex-col items-center w-full text-center'
              style={{ padding: 'var(--dim-space-700)', gap: 'var(--dim-space-400)' }}
            >
              <div
                className='inline-flex items-center justify-center'
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  color: 'var(--text-brandPrimary-default)',
                }}
              >
                <Icon name='check' size={36} />
              </div>
              <h2 className='text-lg font-bold text-ink'>
                {role === 'patient' ? 'ส่งความยินยอมสำเร็จ' : 'บันทึกแบบฟอร์มสำเร็จ'}
              </h2>
              <p className='text-sm text-ink-secondary' style={{ maxWidth: 420 }}>
                ขอบคุณที่กรอกข้อมูล ระบบได้บันทึก
                <strong className='mx-1 text-ink'>{form.name}</strong>
                เข้าระบบเรียบร้อย (Prototype — ไม่ได้บันทึกจริง)
              </p>
              {/* รหัสอ้างอิงการส่ง — spec หน้า 4 (QR patient success) */}
              <span
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-150)',
                  padding: 'var(--dim-space-150) var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-full)',
                  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                รหัสอ้างอิง
                <strong style={{ color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-bold)' }}>{refCode}</strong>
              </span>
              {/* Audit trail ต่อการบันทึก — TOR 1.4.3.16 */}
              <div className='w-full' style={{ maxWidth: 560 }}>
                <ConsentAuditBar
                  recordedBy={role === 'staff' ? 'พญ.สมหญิง รักษ์ดี' : 'ผู้รับบริการ (ลงนามผ่าน QR)'}
                  recordedAt={new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}
                />
              </div>
              <div className='flex flex-wrap items-center justify-center' style={{ gap: 'var(--dim-space-300)' }}>
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  onClick={() => { setValues({}); setSubmitted(false); }}
                >
                  กรอกแบบฟอร์มใหม่
                </NeutralSubdueButton>
                {role === 'staff' && (
                  <BrandButton
                    size='md'
                    onClick={() => history.push('/forms')}
                  >
                    กลับไปคลังแบบฟอร์ม
                  </BrandButton>
                )}
              </div>
            </section>
          ) : (
            <>
              {/* Sections */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                {form.sections.map((section, i) => (
                  <SectionCard
                    key={i}
                    section={section}
                    sectionIndex={i}
                    values={values}
                    setValue={setValue}
                  />
                ))}
              </div>

              {/* Footer actions */}
              <section
                className='bg-surface-card rounded-card shadow-card flex flex-wrap items-center w-full'
                style={{ gap: 'var(--dim-space-300)', padding: 'var(--dim-space-500)' }}
              >
                {/* Validation hint — required ว่างกี่ช่อง (block submit) */}
                {missingRequired.length > 0 && (
                  <span
                    className='inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-150)',
                      color: 'var(--text-colorfulbadge-orange, #B45309)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                    }}
                  >
                    <Icon name='error' size={16} />
                    ต้องกรอกอีก {missingRequired.length} ช่องที่มีเครื่องหมาย *
                  </span>
                )}
                <div className='flex-1' />
                {role === 'staff' && (
                  <NeutralSubdueButton
                    variant='outline'
                    size='md'
                    onClick={() => history.push(`/forms/${slug}`)}
                  >
                    ยกเลิก
                  </NeutralSubdueButton>
                )}
                {/* Decline path — ผู้ป่วยปฏิเสธได้เสมอ (ไม่ต้องกรอกครบ) */}
                {role === 'patient' && (
                  <NeutralButton
                    variant='outline'
                    size='md'
                    onClick={() => setDeclineOpen(true)}
                  >
                    ไม่ยินยอม
                  </NeutralButton>
                )}
                <BrandButton
                  size='md'
                  leadingIcon='save'
                  disabled={missingRequired.length > 0}
                  onClick={() => { if (missingRequired.length === 0) setSubmitted(true); }}
                >
                  {role === 'patient' ? 'ยืนยันส่ง' : 'บันทึกแบบฟอร์ม'}
                </BrandButton>
              </section>
            </>
          )}
        </div>
        <Footer copyright='© 2026 ศูนย์การพยาบาลคุณภาพ ดินแดง กรุงเทพมหานคร' />
      </main>

      {/* Confirm ก่อนบันทึกไม่ยินยอม — กันกดพลาด (Nielsen #5) */}
      <AlertDialog
        open={declineOpen}
        type='warning'
        title='ยืนยันการไม่ยินยอม'
        description={`ท่านกำลังเลือก "ไม่ยินยอม" สำหรับ ${form.name} — การตัดสินใจนี้ไม่กระทบสิทธิการรับบริการอื่น ๆ และเปลี่ยนใจให้ความยินยอมใหม่ได้ทุกเมื่อ`}
        confirmLabel='ยืนยันไม่ยินยอม'
        cancelLabel='กลับไปกรอกต่อ'
        onConfirm={() => { setDeclineOpen(false); setDeclined(true); }}
        onCancel={() => setDeclineOpen(false)}
        onClose={() => setDeclineOpen(false)}
      />
    </div>
  );
};

export default FormFillPage;
