import React, { useEffect, useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Popover from '@/components/popup/Popover';
import AlertDialog from '@/components/popup/AlertDialog';
import Icon from '@/components/icons/Icon';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FieldControl, { FULL_WIDTH_TYPES } from '@/components/forms/FormFieldControl';
import { getCategory } from '@/data/formsLibrary';
import { loadFormDraft, saveFormDraft } from '@/data/consentWorkflowStore';

/* กรอก/ดูแบบฟอร์มในคลังเอกสารเป็น popup — รูปแบบเดียวกับป๊อปอัปกรอกใบยินยอม
   ในเวชระเบียน (`ConsentDisclosureFillPopup` + `ConsentFormFillBody`)
   (มติผู้ใช้ 30 ส.ค. 69):
     • popup ขนาด extraLarge · หัวเรื่อง = ชื่อฟอร์ม · คำบรรยาย = หมวด · รหัส · V
     • แถบ QR ให้ผู้รับบริการสแกนไปกรอกบนโทรศัพท์
     • เนื้อเอกสารเป็นคอลัมน์กลางกว้าง 640 ซ้อนเป็นการ์ดรายส่วน
     • ปุ่มท้าย popup: พิมพ์ · ยกเลิก · บันทึก
   ช่องกรอกทุกชนิดใช้ `FieldControl` ตัวเดียวกับหน้ากรอกเต็ม จึงเป็นคอมโพเนนต์
   ของ design system ทั้งหมด */

const sectionCardStyle = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  padding: 'var(--dim-space-600) var(--dim-space-600)',
  width: '100%',
};

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 'normal',
};

const DRAFT_ROLE = 'staff';

export default function FormDetailPopup({
  open,
  form,
  onClose,
  onEdit,
  onOpenFullPage,
  onSaved,
}) {
  const [values, setValues] = useState({});
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrButtonRef = useRef(null);

  const slug = form?.slug;

  /* เปิดใบใหม่ = โหลดร่างของใบนั้น (ถ้ามี) แล้วเริ่มนับ dirty ใหม่ */
  useEffect(() => {
    if (!open || !slug) return;
    const draft = loadFormDraft(slug, DRAFT_ROLE, null);
    setValues(draft?.values ?? {});
    setDirty(false);
    setQrOpen(false);
  }, [open, slug]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !slug) return '';
    return `${window.location.origin}/forms/${slug}/fill?role=patient`;
  }, [slug]);

  if (!open || !form) return null;

  const category = getCategory(form.category);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`;

  const setValue = (key, v) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setDirty(true);
  };

  const runClose = () => { setConfirmDiscard(false); onClose?.(); };
  const requestClose = () => (dirty ? setConfirmDiscard(true) : runClose());

  const handleSave = () => {
    saveFormDraft(slug, DRAFT_ROLE, null, values);
    setDirty(false);
    onSaved?.({ slug, name: form.name, values });
    onClose?.();
  };

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        title={form.name}
        subtitle={[category?.label, form.code, `V ${form.version}`].filter(Boolean).join(' · ')}
        size='extraLarge'
        bodyScrollable
        tertiaryAction={{ label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
        primaryAction={{ label: 'บันทึก', onClick: handleSave, disabled: !dirty }}
      >
        <div
          className='flex items-start justify-center w-full min-w-0 shrink-0'
          style={{ gap: 'var(--dim-space-600)' }}
        >
          <div
            className='flex flex-col min-w-0'
            style={{ flex: '1 0 0', maxWidth: 640, gap: 'var(--dim-space-400)' }}
          >
            {/* แถบ QR — ผู้รับบริการสแกนไปกรอกบนโทรศัพท์ได้ */}
            <div
              className='flex flex-wrap items-center w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                padding: 'var(--dim-space-300, 12px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name='info' size={18} />
              <span className='flex-1 min-w-0 text-sm'>ผู้รับบริการสามารถสแกน QR เพื่อกรอกบนโทรศัพท์ได้</span>
              <NeutralSubdueButton
                ref={qrButtonRef}
                size='sm'
                variant='outline'
                leadingIcon='qr_code_2'
                active={qrOpen}
                aria-expanded={qrOpen}
                onClick={() => setQrOpen((o) => !o)}
              >
                แสดง QR
              </NeutralSubdueButton>
              <Popover
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                anchorRef={qrButtonRef}
                style={{
                  padding: 'var(--dim-space-400, 16px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-dropdown-default)',
                  borderRadius: 'var(--dim-radius-400, 12px)',
                  background: 'var(--surface-dropdown-default)',
                  boxShadow: 'var(--shadow-dropdown)',
                  zIndex: 'var(--sm-z-modal-popover, 1450)',
                }}
              >
                <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <img
                    src={qrSrc}
                    alt={`QR สำหรับ ${form.name}`}
                    style={{ width: 'var(--dim-size-2100, 160px)', height: 'var(--dim-size-2100, 160px)' }}
                  />
                  <span className='text-xs text-ink-tertiary'>สแกนเพื่อเปิดแบบฟอร์มบนโทรศัพท์</span>
                </div>
              </Popover>
            </div>

            {/* สรุปหัวเอกสาร + ทางลัด */}
            <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
              <h2 style={sectionTitleStyle}>{form.name}</h2>
              <p className='text-sm text-ink-secondary' style={{ margin: 'var(--dim-space-0)' }}>{form.summary}</p>
              <div className='flex flex-wrap items-center text-sm text-ink-tertiary' style={{ gap: 'var(--dim-space-400)' }}>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='layers' size={16} />
                  {form.sections.length} ส่วน
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='clock' size={16} />
                  ใช้เวลา ~{form.estimatedMinutes} นาที
                </span>
                <span className='inline-flex items-center gap-1'>
                  <Icon name='translate' size={16} />
                  {form.language}
                </span>
              </div>
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
                {onEdit && (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={onEdit}>
                    แก้ไขแบบฟอร์ม
                  </NeutralSubdueButton>
                )}
                {onOpenFullPage && (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={onOpenFullPage}>
                    เปิดเต็มหน้าจอ
                  </NeutralSubdueButton>
                )}
              </div>
            </section>

            {/* เนื้อแบบฟอร์ม — การ์ดละหนึ่งส่วน */}
            {form.sections.map((section, si) => (
              <section
                key={si}
                className='flex flex-col'
                style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}
              >
                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span
                    className='inline-flex items-center justify-center shrink-0'
                    style={{
                      width: 'var(--dim-size-500, 28px)',
                      height: 'var(--dim-size-500, 28px)',
                      borderRadius: 'var(--dim-radius-full)',
                      background: 'var(--surface-brandPrimary-default)',
                      color: 'var(--text-brandPrimary-on-brand, #FFFFFF)',
                      fontFamily: 'var(--type-family-body)',
                      fontWeight: 'var(--type-weight-bold)',
                      fontSize: 'var(--type-size-xs)',
                    }}
                  >
                    {si + 1}
                  </span>
                  <h2 style={{ ...sectionTitleStyle, width: 'auto' }}>{section.title}</h2>
                  <span className='text-xs text-ink-tertiary'>{section.fields.length} ช่อง</span>
                </div>
                <div
                  className='grid w-full grid-cols-1 md:grid-cols-2'
                  style={{ columnGap: 'var(--dim-space-500)', rowGap: 'var(--dim-space-400)' }}
                >
                  {section.fields.map((field, fi) => {
                    const fieldKey = `s${si}-f${fi}`;
                    return (
                      <div
                        key={fieldKey}
                        className={`flex flex-col min-w-0 ${FULL_WIDTH_TYPES.has(field.type) ? 'md:col-span-2' : ''}`}
                      >
                        <FieldControl
                          field={field}
                          fieldKey={fieldKey}
                          value={values[fieldKey]}
                          onChange={(v) => setValue(fieldKey, v)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </Popup>

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ละทิ้งการกรอกแบบฟอร์ม?'
        description={`ข้อมูลที่กรอกใน ${form.name} จะไม่ถูกบันทึก`}
        confirmLabel='ละทิ้ง'
        cancelLabel='กรอกต่อ'
        onConfirm={runClose}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}
