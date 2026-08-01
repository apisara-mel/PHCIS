import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import { SectionTitle, Field, FieldGrid } from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import ESignatureField from '@/components/form-builder/ESignatureField';
import Icon from '@/components/icons/Icon';

/* Registration · "แบบฟอร์มยินยอม" step — fills one FORMS-library consent
   entry (src/data/formsLibrary.js, category='consent') in-clinic. Renders
   the form's static `sections[].fields[]` catalog generically (checkbox
   clauses, read-only patient identity fields, signature) rather than
   hand-authoring one popup per consent form — new consent forms added to
   the catalog get a working fill UI for free. */

const identityValue = (label, patient) => {
  if (label.includes('ชื่อ-นามสกุล')) {
    const prefixAndFirst = [patient?.prefixTh, patient?.firstNameTh].filter(Boolean).join('');
    return [prefixAndFirst, patient?.lastNameTh].filter(Boolean).join(' ');
  }
  if (label.includes('เลขประจำตัวประชาชน') || label.includes('บัตรประชาชน')) return patient?.nationalId || '';
  if (label.includes('HN')) return patient?.hn || '';
  if (label.includes('เกิด')) return patient?.dob || '';
  if (label.includes('วันที่')) return new Date().toLocaleDateString('th-TH');
  return '';
};

const ConsentFormFillPopup = ({ open, form, patient, onClose, onConfirm }) => {
  const [checks, setChecks] = useState({});
  const [signature, setSignature] = useState(null);

  const requiredCheckboxCount = useMemo(() => {
    if (!form) return 0;
    return form.sections.reduce(
      (n, sec) => n + sec.fields.filter((f) => f.type === 'checkbox' && f.required).length,
      0,
    );
  }, [form]);

  const hasSignatureField = useMemo(
    () => Boolean(form?.sections?.some((sec) => sec.fields.some((f) => f.type === 'signature'))),
    [form],
  );

  const checkedRequiredCount = useMemo(() => {
    if (!form) return 0;
    let n = 0;
    form.sections.forEach((sec, si) => {
      sec.fields.forEach((f, fi) => {
        if (f.type === 'checkbox' && f.required && checks[`${si}-${fi}`]) n += 1;
      });
    });
    return n;
  }, [form, checks]);

  const canConfirm =
    checkedRequiredCount === requiredCheckboxCount && (!hasSignatureField || Boolean(signature));

  if (!open || !form) return null;

  const handleClose = () => {
    setChecks({});
    setSignature(null);
    onClose?.();
  };

  const handleConfirm = () => {
    onConfirm?.({ slug: form.slug, signedAt: new Date().toISOString() });
    setChecks({});
    setSignature(null);
  };

  return (
    <Popup
      open={open}
      onClose={handleClose}
      title={form.name}
      subtitle={form.summary}
      size='large'
      width={640}
      primaryAction={{ label: 'ยืนยันการยินยอม', onClick: handleConfirm, disabled: !canConfirm }}
      secondaryAction={{ label: 'ยกเลิก', onClick: handleClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        {form.sections.map((sec, si) => (
          <div key={sec.title} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <SectionTitle icon='assignment'>{sec.title}</SectionTitle>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {sec.fields.map((f, fi) => {
                const key = `${si}-${fi}`;
                if (f.type === 'checkbox') {
                  return (
                    <Checkbox
                      key={key}
                      label={f.required ? `${f.label} *` : f.label}
                      checked={Boolean(checks[key])}
                      onChange={(v) =>
                        setChecks((s) => ({
                          ...s,
                          [key]: typeof v === 'boolean' ? v : Boolean(v?.target?.checked),
                        }))
                      }
                    />
                  );
                }
                if (f.type === 'signature') {
                  return (
                    <div key={key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                      <span
                        className='text-sm'
                        style={{ color: 'var(--text-content-secondary)' }}
                      >
                        {f.label}
                        {f.required ? ' *' : ''}
                      </span>
                      {/* e-Signature 3 ช่องทาง — TOR 1.8.4.1–2 */}
                      <ESignatureField value={signature || ''} onChange={(v) => setSignature(v || null)} />
                    </div>
                  );
                }
                return (
                  <FieldGrid key={key} cols={2}>
                    <Field label={f.label} required={f.required}>
                      <InputField
                        size='lg'
                        value={identityValue(f.label, patient)}
                        disabled
                        showLabel={false}
                        showHelperText={false}
                      />
                    </Field>
                  </FieldGrid>
                );
              })}
            </div>
          </div>
        ))}

        <div
          className='flex items-center gap-2 text-xs pt-1'
          style={{ color: 'var(--text-content-tertiary)' }}
        >
          <Icon name='info' size={16} />
          <span>ต้องติ๊กยินยอมในทุกข้อที่บังคับ (*) และลงลายเซ็นก่อนจึงจะยืนยันได้</span>
        </div>
      </div>
    </Popup>
  );
};

export default ConsentFormFillPopup;
