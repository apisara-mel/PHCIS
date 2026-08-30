import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import FieldControl, { FULL_WIDTH_TYPES } from '@/components/forms/FormFieldControl';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import NeutralButton from '@/components/button/NeutralButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  getFormBySlug,
  getCategory,
  CATEGORY_PALETTE,
} from '@/data/formsLibrary';
import {
  clearFormDraft,
  completeConsentSigning,
  loadFormDraft,
  saveFormDraft,
  validateSignToken,
} from '@/data/consentWorkflowStore';
import { DEFAULT_SERVICE_CENTER_CHANNEL, MOBILE_APP_CHANNEL } from '@/data/consentChannels';
import EDOCUMENT_NAV, { EDOCUMENT_BRAND_TITLE } from '@/pages/forms/edocumentNav';

/* คลังเอกสาร e-document — Fill page.

   Same surface for two callers:
     • Staff on desktop ("เจ้าหน้าที่กรอกในเครื่องนี้" from FormDetailPage)
     • Patient on phone (QR target — Sidebar collapses to drawer < md)

   `?role=patient` strips clinician chrome (back-to-catalog / "เจ้าหน้าที่
   กรอกแทน" banner) so the QR-landed view feels patient-facing without a
   separate page. */

/* ส่วนของแบบฟอร์ม — จัดช่องเป็นกริดสองคอลัมน์บนจอกว้าง (มติผู้ใช้ 30 ส.ค. 69)
   ฟอร์มเยี่ยมบ้านบางใบมี 40+ ช่อง เรียงเดี่ยวลงมาทำให้ต้องเลื่อนยาวมาก
   ช่องข้อความยาว/กลุ่มตัวเลือก/ลายเซ็น ยังกินเต็มแถวเพื่อให้อ่านง่าย */
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
      <span className='text-xs text-ink-tertiary'>{section.fields.length} ช่อง</span>
    </div>
    <div
      className='grid w-full grid-cols-1 md:grid-cols-2'
      style={{ columnGap: 'var(--dim-space-500)', rowGap: 'var(--dim-space-400)' }}
    >
      {section.fields.map((f, i) => {
        const fieldKey = `s${sectionIndex}-f${i}`;
        return (
          <div
            key={fieldKey}
            className={`flex flex-col min-w-0 ${FULL_WIDTH_TYPES.has(f.type) ? 'md:col-span-2' : ''}`}
          >
            <FieldControl
              field={f}
              fieldKey={fieldKey}
              value={values[fieldKey]}
              onChange={(v) => setValue(fieldKey, v)}
            />
          </div>
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

  const queryMeta = useMemo(() => {
    if (typeof window === 'undefined') return { token: null, requestId: null };
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get('token'),
      requestId: params.get('request') ? Number(params.get('request')) : null,
    };
  }, []);

  const tokenCheck = useMemo(() => {
    if (!queryMeta.token) return { ok: true, recordId: queryMeta.requestId };
    return validateSignToken(queryMeta.token);
  }, [queryMeta]);

  const requestId = tokenCheck.ok ? (tokenCheck.recordId || queryMeta.requestId) : null;

  const tokenBlockReason = useMemo(() => {
    if (role !== 'patient' || tokenCheck.ok) return null;
    if (tokenCheck.reason === 'expired') return 'ลิงก์ QR หมดอายุแล้ว — ขอลิงก์ใหม่จากเจ้าหน้าที่';
    if (tokenCheck.reason === 'cancelled') return 'คำขอความยินยอมนี้ถูกยกเลิกแล้ว';
    return 'ลิงก์ไม่ถูกต้อง — ตรวจสอบ QR หรือขอลิงก์ใหม่';
  }, [role, tokenCheck]);

  const [values, setValues] = useState({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /* Edge case (pages-prompt หน้า 4): ผู้ป่วยเลือก "ไม่ยินยอม" ได้ —
     confirm ก่อน แล้วบันทึกสถานะ declined (audit ยังเก็บครบ ไม่ลบคำขอ) */
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!form || draftLoaded || tokenBlockReason) return;
    const draft = loadFormDraft(slug, role, requestId);
    if (draft?.values) setValues(draft.values);
    setDraftLoaded(true);
  }, [form, slug, role, requestId, draftLoaded, tokenBlockReason]);

  useEffect(() => {
    if (!form || tokenBlockReason || submitted || declined) return;
    saveFormDraft(slug, role, requestId, values);
  }, [values, form, slug, role, requestId, tokenBlockReason, submitted, declined]);

  const signChannel = role === 'patient' ? MOBILE_APP_CHANNEL : DEFAULT_SERVICE_CENTER_CHANNEL;

  const finishSigning = (outcome) => {
    if (requestId) {
      completeConsentSigning(requestId, { outcome, channel: signChannel });
      clearFormDraft(slug, role, requestId);
    }
  };

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
        <Sidebar
          activeKey='edocument-catalog'
          items={EDOCUMENT_NAV}
          fallbackKey='edocument-dashboard'
        />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={['คลังเอกสาร e-document', 'ไม่พบแบบฟอร์ม']} brandTitle={EDOCUMENT_BRAND_TITLE} />
          <div className='flex flex-1 items-center justify-center text-ink-tertiary'>
            ไม่พบแบบฟอร์มที่ตรงกับลิงก์นี้
          </div>
        </main>
      </div>
    );
  }

  if (tokenBlockReason) {
    return (
      <div className='min-h-screen w-full flex bg-brand-50'>
        <Sidebar
          activeKey='edocument-catalog'
          items={EDOCUMENT_NAV}
          fallbackKey='edocument-dashboard'
        />
        <main className='flex-1 flex flex-col min-w-0'>
          <Header breadcrumb={[form.name]} brandTitle={EDOCUMENT_BRAND_TITLE} />
          <div className='flex flex-1 flex-col items-center justify-center p-6' style={{ gap: 'var(--dim-space-300)' }}>
            <Icon name='link_off' size={40} color='var(--text-danger-default)' />
            <p style={{ margin: 0, fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)', color: 'var(--text-content-secondary)', textAlign: 'center' }}>
              {tokenBlockReason}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const breadcrumb = role === 'patient'
    ? [form.name]
    : ['คลังเอกสาร e-document', category?.label || '', form.name, 'กรอกแบบฟอร์ม'].filter(Boolean);

  return (
    <div className='min-h-screen w-full flex bg-brand-50'>
      <Sidebar
        activeKey='edocument-catalog'
        items={EDOCUMENT_NAV}
        fallbackKey='edocument-dashboard'
      />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={breadcrumb} brandTitle={EDOCUMENT_BRAND_TITLE} />
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

          {!submitted && !declined && draftLoaded && role === 'patient' && (
            <section
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-200)',
                padding: 'var(--dim-space-300) var(--dim-space-400)',
                borderRadius: 'var(--dim-radius-200)',
                background: 'var(--surface-neutral-quaternary)',
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs)',
              }}
            >
              <Icon name='cloud_done' size={16} />
              บันทึกแบบร่างอัตโนมัติ — กลับมากรอกต่อได้แม้ออฟไลน์ชั่วคราว
            </section>
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
              style={{ padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400)' }}
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
                    กลับไปคลังเอกสาร e-document
                  </BrandButton>
                )}
              </div>
            </section>
          ) : submitted ? (
            <section
              className='bg-surface-card rounded-card shadow-card flex flex-col items-center w-full text-center'
              style={{ padding: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400)' }}
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
                    กลับไปคลังเอกสาร e-document
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
                  onClick={() => {
                    if (missingRequired.length === 0) {
                      finishSigning('signed');
                      setSubmitted(true);
                    }
                  }}
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
        onConfirm={() => { setDeclineOpen(false); finishSigning('declined'); setDeclined(true); }}
        onCancel={() => setDeclineOpen(false)}
        onClose={() => setDeclineOpen(false)}
      />
    </div>
  );
};

export default FormFillPage;
