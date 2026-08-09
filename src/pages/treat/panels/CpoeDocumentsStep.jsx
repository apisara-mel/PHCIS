import React, { useEffect, useMemo, useState } from 'react';
import { Step7Certificate } from '@/components/forms/TreatmentSteps';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentFormFillPopup from '@/components/popup/ConsentFormFillPopup';
import PharmacyPrescriptionPrint from '@/components/pharmacy/PharmacyPrescriptionPrint';
/* §1.5.10.2 — แผ่นพิมพ์ใบคำขอตรวจจริง (A4) + ตัวช่วยพิมพ์/บันทึกเป็น PDF */
import LabRequestPrintSheet from '@/pages/treat/LabRequestPrintSheet';
import XrayRequestPrintSheet from '@/pages/treat/XrayRequestPrintSheet';
import { printWithFilename } from '@/pages/treat/printKit';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, PanelAlert, ReasonDialog, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  subscribeRequestTemplates, getRequestTemplates,
  upsertRequestTemplate, removeRequestTemplate,
} from '@/data/treatmentOrderSets';
import {
  subscribeDocuments, documentsForPatient,
  nextLabRequestNo, nextXrayRequestNo,
} from '@/data/treatmentDocuments';
import { FORMS, getFormsByCategory } from '@/data/formsLibrary';
import { LAB_TEST_BY_ID } from '@/data/labCatalog';
import { XRAY_EXAM_BY_ID } from '@/data/xrayCatalog';
import { getRegistryDrug, currentPrice } from '@/data/pharmacyRegistry';
import { needsSupportingForm } from '@/data/treatmentSigDetail';
import { appendAudit, stampNow, CURRENT_CLINICIAN } from '@/data/treatmentAudit';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | CPOE §1.5.1.6 / §1.5.2.10 / §1.5.10.1 / §1.5.10.2 /
   §1.5.11.3 / §1.5.11.4 / §1.5.11.5 — ขั้นเอกสารและการพิมพ์ (step 8).

   ห่อ `Step7Certificate` เดิมไว้ทั้งดุ้นโดยไม่แตะโค้ดของมัน แล้วเติม
   ส่วนที่ TOR §1.5 ยังขาด: พิมพ์ใบสั่งยา · พิมพ์ใบคำขอตรวจ ·
   ตัวจัดการเทมเพลตแบบฟอร์มคำขอ · ใบรับรองแพทย์ภาษาอังกฤษ ·
   แบบฟอร์มความยินยอมประกอบการสั่งการรักษา · ลายเซ็นอิเล็กทรอนิกส์.

   ข้อจำกัดตามจริง: ไม่มี PDF engine — ทุกการพิมพ์คือ window.print()
   ผ่าน @media print เท่านั้น. */

const CERT_LANGUAGES = [
  { key: 'th', label: 'ไทย' },
  { key: 'en', label: 'English' },
  { key: 'both', label: 'สองภาษา (ไทย / English)' },
];

/* หัวข้อมาตรฐานของใบรับรองแพทย์ทั้งสองภาษา (§1.5.11.3) */
const CERT_STRINGS = {
  title:      { th: 'ใบรับรองแพทย์', en: 'Medical Certificate' },
  center:     { th: 'ศูนย์บริการสาธารณสุข 4 ดินแดง สำนักอนามัย กรุงเทพมหานคร', en: 'Public Health Center 4 Din Daeng, Health Department, Bangkok Metropolitan Administration' },
  certNo:     { th: 'เลขที่ใบรับรอง', en: 'Certificate No.' },
  patient:    { th: 'ข้าพเจ้าได้ตรวจร่างกาย', en: 'I have examined' },
  hn:         { th: 'เลขประจำตัวผู้ป่วย (HN)', en: 'Hospital Number (HN)' },
  examinedOn: { th: 'เมื่อวันที่', en: 'Examined on' },
  diagnosis:  { th: 'ผลการตรวจและการวินิจฉัย', en: 'Findings and diagnosis' },
  rest:       { th: 'เห็นควรให้หยุดพักรักษาตัวเป็นเวลา', en: 'Recommended rest period' },
  from:       { th: 'ตั้งแต่วันที่', en: 'From' },
  to:         { th: 'ถึงวันที่', en: 'To' },
  doctor:     { th: 'แพทย์ผู้ตรวจ', en: 'Examining physician' },
  license:    { th: 'เลขที่ใบอนุญาตประกอบวิชาชีพเวชกรรม', en: 'Medical license number' },
  signedAt:   { th: 'ลงนามเมื่อ', en: 'Signed at' },
  manualSign: { th: 'ลงชื่อ ................................................', en: 'Signature ................................................' },
};

const certText = (key, lang) => {
  const s = CERT_STRINGS[key];
  if (!s) return key;
  if (lang === 'en') return s.en;
  if (lang === 'both') return `${s.th} / ${s.en}`;
  return s.th;
};

const TEMPLATE_FIELD_OPTIONS = [
  { key: 'hn', label: 'HN' },
  { key: 'name', label: 'ชื่อ - นามสกุล' },
  { key: 'rights', label: 'สิทธิการรักษา' },
  { key: 'doctor', label: 'แพทย์ผู้ส่งตรวจ' },
  { key: 'tests', label: 'รายการตรวจ' },
  { key: 'note', label: 'หมายเหตุ' },
  { key: 'prep', label: 'ข้อความการเตรียมตัวตรวจ' },
  { key: 'barcode', label: 'บาร์โค้ดสิ่งส่งตรวจ' },
];

const PREP_SUGGESTIONS = [
  'งดอาหารและเครื่องดื่มที่มีน้ำตาลอย่างน้อย 8 ชั่วโมงก่อนเจาะเลือด',
  'ดื่มน้ำเปล่าได้ตามปกติ และมาเจาะเลือดช่วงเช้า 07:00–09:00',
  'นำยาที่ใช้อยู่ทั้งหมดมาแสดงต่อเจ้าหน้าที่ก่อนเข้ารับการตรวจ',
  'เก็บปัสสาวะช่วงกลาง (midstream) ใส่ถ้วยที่ได้รับจากเจ้าหน้าที่',
];

const baht = (n) => Number(n || 0).toLocaleString('th-TH');

const DOC_TYPES = [
  { key: 'prescription', label: 'ใบสั่งยา', icon: 'medication', tor: '1.5.10.1' },
  { key: 'labrequest',   label: 'ใบคำขอตรวจทางห้องปฏิบัติการ', icon: 'science', tor: '1.5.10.2' },
  { key: 'xrayrequest',  label: 'ใบคำขอตรวจทางรังสีวิทยา', icon: 'radiology', tor: '1.5.10.2' },
  { key: 'certificate',  label: 'ใบรับรองแพทย์', icon: 'assignment', tor: '1.5.11.3' },
];

const CpoeDocumentsStep = (props) => {
  const { form, setForm, patient, cardPatient } = props;
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const hn = patient?.hn || '';
  const visitId = form?.visitId || 'v-current';

  const [docType, setDocType] = useState('prescription');
  const [previewOpen, setPreviewOpen] = useState(false);
  /* §1.5.2.10 — เทมเพลตอยู่ใน store กลาง (treatmentOrderSets) ใบขอตรวจแล็บ
     อ่านตัวเดียวกัน เทมเพลตที่สร้าง/แก้/ลบที่นี่จึงไปโผล่ที่นั่นจริง */
  const [templates] = useTreatmentStore(subscribeRequestTemplates, getRequestTemplates, []);
  const [templateDraft, setTemplateDraft] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [consentForm, setConsentForm] = useState(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  /* §1.4.6.3 — กันพิมพ์เอกสารเปล่า · §1.5.11.4 — คำแนะนำบันทึกเป็น PDF */
  const [emptyPrintGuard, setEmptyPrintGuard] = useState(false);
  const [pdfHintOpen, setPdfHintOpen] = useState(false);

  const certLang = form?.certLanguage || 'th';
  const setCertLang = (v) => {
    setForm((f) => ({ ...f, certLanguage: v }));
    appendAudit({
      hn, visitId, category: 'document', field: 'ภาษาของใบรับรองแพทย์',
      oldValue: CERT_LANGUAGES.find((l) => l.key === certLang)?.label || certLang,
      newValue: CERT_LANGUAGES.find((l) => l.key === v)?.label || v,
    });
  };

  const meds = (form?.medications || []).filter((m) => !m.cancelledAt);
  const labs = (form?.labs || []).filter((l) => !l.cancelledAt);
  const films = (form?.xrayOrders || []).filter((x) => !x.cancelledAt);
  const primaryDx = (form?.diagnoses || []).find((d) => d.type === 'principle') || (form?.diagnoses || [])[0];

  const consentForms = useMemo(() => getFormsByCategory('consent'), []);
  const consentRecords = form?.consentRecords || [];

  /* §1.5.10.2 — เลขที่ใบคำขอต้องออกจริงเมื่อมีรายการสั่ง (เดิมแผ่นพิมพ์ตก
     ไปใช้ข้อความไทย "ยังไม่ออกเลขที่" แล้วยิงเข้าบาร์โค้ด ซึ่งสแกนได้ค่าว่าง) */
  useEffect(() => {
    if (labs.length && !form?.labRequest?.requestNo) {
      setForm((f) => ({
        ...f,
        labRequest: {
          ...(f.labRequest || {}),
          requestNo: nextLabRequestNo(),
          requestedAt: f.labRequest?.requestedAt || stampNow(),
        },
      }));
    }
    if (films.length && !form?.xrayRequest?.requestNo) {
      setForm((f) => ({
        ...f,
        xrayRequest: {
          ...(f.xrayRequest || {}),
          requestNo: nextXrayRequestNo(),
          requestedAt: f.xrayRequest?.requestedAt || stampNow(),
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labs.length, films.length, form?.labRequest?.requestNo, form?.xrayRequest?.requestNo]);

  /* §1.5.10.2 — แถบเตือนชั้นความลับบนแผ่นพิมพ์ต้องมีที่มาจากข้อมูลจริง:
     ผู้ใช้ติ๊กเองที่การ์ดนี้ หรือมีเอกสารของผู้รับบริการรายนี้ที่ถูกทำ
     เครื่องหมาย "ข้อมูลลับ" ไว้แล้วในศูนย์เอกสาร */
  const [patientDocs] = useTreatmentStore(subscribeDocuments, () => documentsForPatient(hn), [hn]);
  const hasConfidentialDoc = patientDocs.some((d) => d.confidential && d.status !== 'cancelled');
  const resultConfidential = !!form?.resultConfidential || hasConfidentialDoc;

  const setResultConfidential = (v) => {
    const next = typeof v === 'boolean' ? v : !form?.resultConfidential;
    setForm((f) => ({ ...f, resultConfidential: next }));
    appendAudit({
      hn, visitId, category: 'confidential', field: 'ชั้นความลับของผลตรวจบนใบคำขอ',
      oldValue: form?.resultConfidential ? 'ข้อมูลลับ' : 'ปกติ',
      newValue: next ? 'ข้อมูลลับ — แผ่นพิมพ์ขึ้นคำเตือนชั้นความลับ' : 'ปกติ',
    });
  };

  /* คำสั่งที่ต้องมีเอกสารประกอบแต่ยังไม่แนบ (§1.5.1.6 + §1.5.4.15) */
  const missingConsent = useMemo(() => meds
    .map((m) => ({ med: m, need: needsSupportingForm(m.name) }))
    .filter((x) => x.need && !x.med.supportingFormAttached), [meds]);

  /* จำนวนรายการของเอกสารชนิดที่เลือกอยู่ — ใช้เตือนก่อนพิมพ์หน้าเปล่า
     (§1.4.6.3: ห้ามปล่อยให้สั่งพิมพ์เอกสารที่ไม่มีเนื้อหา) */
  const docItemCount = docType === 'prescription' ? meds.length
    : docType === 'labrequest' ? labs.length
      : docType === 'xrayrequest' ? films.length
        : (form?.certIssue === 'yes' ? 1 : 0);
  const docIsEmpty = docItemCount === 0;

  /* ชื่อไฟล์เริ่มต้นของ Save as PDF — เบราว์เซอร์ใช้ document.title */
  const docFileName = () => {
    const label = DOC_TYPES.find((d) => d.key === docType)?.label || 'เอกสาร';
    const who = (cardPatient?.fullName || patient?.name || '').replace(/\s+/g, '-');
    return [label, patient?.hn, who].filter(Boolean).join('_');
  };

  const printDoc = () => {
    appendAudit({
      hn, visitId, category: 'document',
      field: `พิมพ์เอกสาร — ${DOC_TYPES.find((d) => d.key === docType)?.label || docType}`,
      oldValue: '—', newValue: `พิมพ์โดย ${CURRENT_CLINICIAN.name} เมื่อ ${stampNow()}`,
    });
    setPreviewOpen(false);
    printWithFilename(docFileName());
  };

  /* "บันทึกเป็น PDF" — เส้นทางเดียวกับพิมพ์ แต่ตั้งชื่อไฟล์ให้และเตือนว่า
     ต้องเลือกปลายทาง "Save as PDF" ใน print dialog เอง */
  const saveAsPdf = () => {
    if (docIsEmpty) { setEmptyPrintGuard(true); return; }
    setPdfHintOpen(true);
  };

  const doSaveAsPdf = () => {
    appendAudit({
      hn, visitId, category: 'document',
      field: `บันทึกเป็น PDF — ${DOC_TYPES.find((d) => d.key === docType)?.label || docType}`,
      oldValue: '—', newValue: `${docFileName()}.pdf · โดย ${CURRENT_CLINICIAN.name} เมื่อ ${stampNow()}`,
    });
    setPdfHintOpen(false);
    printWithFilename(docFileName());
  };

  const saveTemplate = () => {
    if (!String(templateDraft.name || '').trim()) return;
    /* store เป็นคน audit ให้เอง (ผู้ใช้ + เวลา) จึงไม่ appendAudit ซ้ำที่นี่ */
    upsertRequestTemplate(templateDraft);
    setTemplateDraft(null);
  };

  const signNow = () => {
    setForm((f) => ({
      ...f,
      docSignature: {
        by: CURRENT_CLINICIAN.name,
        license: CURRENT_CLINICIAN.license,
        at: stampNow(),
        image: f.certSignature || '',
      },
    }));
    appendAudit({
      hn, visitId, category: 'document', field: 'ลงนามอิเล็กทรอนิกส์บนเอกสาร',
      oldValue: '—', newValue: `${CURRENT_CLINICIAN.name} · ${stampNow()}`,
    });
    setSignatureOpen(false);
  };

  const signature = form?.docSignature;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-600, 24px)' }}>
      {/* ── การ์ดใบรับรองแพทย์เดิม — ทำงานเหมือนเดิมทุกประการ ── */}
      <Step7Certificate {...props} />

      {/* ── §1.5.11.3 ภาษาของใบรับรองแพทย์ ─────────────────── */}
      <PanelCard
        title='ภาษาของใบรับรองแพทย์'
        subtitle='TOR §1.5.11.3 กำหนดให้ออกใบรับรองแพทย์ภาษาอังกฤษได้ — เลือกภาษาแล้วหัวข้อและข้อความมาตรฐานทั้งใบจะเปลี่ยนตาม'
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {CERT_LANGUAGES.map((l) => (
            <label key={l.key} className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', cursor: canEdit ? 'pointer' : 'not-allowed' }}>
              <input
                type='radio'
                name='cert-language'
                checked={certLang === l.key}
                disabled={!canEdit}
                onChange={() => setCertLang(l.key)}
              />
              <span style={PANEL_VALUE_STYLE}>{l.label}</span>
            </label>
          ))}
        </div>

        {certLang !== 'th' && !cardPatient?.englishName ? (
          <PanelAlert tone='warning' icon='translate' title='ยังไม่มีชื่อผู้รับบริการเป็นอักษรโรมัน'>
            เวชระเบียนของผู้รับบริการรายนี้ยังไม่มีชื่อภาษาอังกฤษ — ใบรับรองภาษาอังกฤษจะพิมพ์ชื่อเป็นภาษาไทยแทน
            ให้แจ้งงานเวชระเบียนบันทึกชื่ออักษรโรมันก่อนออกใบ
          </PanelAlert>
        ) : null}

        {/* ตัวอย่างหัวข้อทั้งใบตามภาษาที่เลือก */}
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            borderRadius: 'var(--dim-radius-300, 10px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
            paddingTop: 'var(--dim-space-400, 16px)',
            paddingRight: 'var(--dim-space-400, 16px)',
            paddingBottom: 'var(--dim-space-400, 16px)',
            paddingLeft: 'var(--dim-space-400, 16px)',
          }}
        >
          <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>
            {certText('title', certLang)}
          </span>
          <span style={PANEL_LABEL_STYLE}>{certText('center', certLang)}</span>
          <InfoPair label={certText('certNo', certLang)} value={form?.certNo} />
          <InfoPair
            label={certText('patient', certLang)}
            value={certLang === 'en' ? (cardPatient?.englishName || cardPatient?.fullName) : cardPatient?.fullName}
          />
          <InfoPair label={certText('hn', certLang)} value={patient?.hn} />
          <InfoPair label={certText('diagnosis', certLang)} value={primaryDx ? `${primaryDx.code || ''} ${primaryDx.name}` : '—'} />
          <InfoPair
            label={certText('rest', certLang)}
            value={form?.restDays ? `${form.restDays} ${certLang === 'en' ? 'day(s)' : 'วัน'}` : '—'}
          />
          <InfoPair label={certText('from', certLang)} value={form?.startDate} />
          <InfoPair label={certText('to', certLang)} value={form?.endDate} />
          <InfoPair label={certText('doctor', certLang)} value={CURRENT_CLINICIAN.name} />
          <InfoPair label={certText('license', certLang)} value={CURRENT_CLINICIAN.license} />
          {/* §1.5.11.5 — ไม่มีลายเซ็นอิเล็กทรอนิกส์ต้องมีเส้นให้เซ็นมือ ไม่ปล่อยว่าง */}
          {signature?.at || form?.certSignedAt ? (
            <span style={PANEL_LABEL_STYLE}>
              {certText('signedAt', certLang)}: {signature?.at || form?.certSignedAt} · {signature?.by || CURRENT_CLINICIAN.name}
            </span>
          ) : (
            <span style={PANEL_VALUE_STYLE}>{certText('manualSign', certLang)}</span>
          )}
        </div>
      </PanelCard>

      {/* ── §1.5.10.1 / §1.5.10.2 ศูนย์พิมพ์เอกสาร ─────────── */}
      <PanelCard
        title='พิมพ์เอกสารของการตรวจครั้งนี้'
        subtitle='เลือกเอกสาร → ดูตัวอย่าง → พิมพ์ · ทุกครั้งบันทึกผู้พิมพ์และเวลาลงประวัติการแก้ไข'
        action={
          <GuardedAction allowed={canEdit}>
            <BrandButton variant='outline' size='sm' leadingIcon='draw' onClick={() => setSignatureOpen(true)}>
              {signature ? 'ลงนามใหม่' : 'ลงนามอิเล็กทรอนิกส์'}
            </BrandButton>
          </GuardedAction>
        }
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {DOC_TYPES.map((d) => {
            const picked = docType === d.key;
            return (
              <button
                key={d.key}
                type='button'
                onClick={() => setDocType(d.key)}
                className='inline-flex items-center'
                style={{
                  gap: 'var(--dim-space-100, 4px)',
                  borderRadius: 'var(--dim-radius-full)',
                  border: `var(--dim-stroke-100, 1px) solid ${picked
                    ? 'var(--border-brandPrimary-default, #007549)'
                    : 'var(--border-neutral-quaternary)'}`,
                  background: picked
                    ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                    : 'var(--surface-neutral-quaternary, #F9FBFB)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  cursor: 'pointer',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-content-default)',
                }}
              >
                <Sym name={d.icon} size={16} color={picked
                  ? 'var(--icon-brandPrimary-default, #007549)'
                  : 'var(--icon-neutral-tertiary, #ADB2B7)'} />
                {d.label}
              </button>
            );
          })}
        </div>

        {docType === 'prescription' ? (
          meds.length === 0 ? (
            <PanelEmptyState
              icon='medication'
              title='ยังไม่มีรายการยาที่จะพิมพ์'
              subtitle='กลับไปสั่งยาที่ขั้นสั่งการรักษาก่อน แล้วจึงพิมพ์ใบสั่งยาได้'
            />
          ) : (
            <>
              <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                <Table
                  rowKey={(r) => r.id}
                  rows={meds}
                  columns={[
                    { key: 'name', header: 'รายการยา', flex: 1 },
                    {
                      key: 'sig', header: 'วิธีใช้',
                      render: (r) => (
                        <span style={PANEL_LABEL_STYLE}>
                          ครั้งละ {r.dosePerTake || '—'} {r.unit || 'เม็ด'} · {r.frequency || '—'} · {r.when || '—'}
                        </span>
                      ),
                    },
                    { key: 'quantity', header: 'จำนวน' },
                    {
                      key: 'price', header: 'ราคา',
                      render: (r) => {
                        const drug = getRegistryDrug(r.name);
                        return <span style={PANEL_VALUE_STYLE}>{baht((drug ? currentPrice(drug) : 0) * (Number(r.quantity) || 1))}</span>;
                      },
                    },
                  ]}
                  emptyMessage='ไม่มีรายการยา'
                />
              </div>
              {/* ใบสั่งยาจริงที่ @media print ของห้องยาจะปล่อยให้เห็น */}
              <PharmacyPrescriptionPrint
                patient={cardPatient?.fullName || patient?.name}
                hn={patient?.hn}
                diagnosis={primaryDx ? { icd10: primaryDx.code, name: primaryDx.name } : undefined}
                doctor={CURRENT_CLINICIAN.name}
                items={meds.map((m) => ({
                  name: m.name,
                  usage: `ครั้งละ ${m.dosePerTake || '-'} ${m.unit || 'เม็ด'} ${m.frequency || ''} ${m.when || ''}`.trim(),
                  quantity: m.quantity,
                  unit: m.unit,
                }))}
              />
            </>
          )
        ) : null}

        {docType === 'labrequest' ? (
          labs.length === 0 ? (
            <PanelEmptyState
              icon='science'
              title='ยังไม่มีรายการตรวจแล็บที่จะพิมพ์'
              subtitle='กลับไปสั่งแล็บที่ขั้นสั่งการรักษาก่อน แล้วจึงพิมพ์ใบคำขอตรวจได้'
            />
          ) : (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <Select
                label='เทมเพลตแบบฟอร์มคำขอ'
                value={form?.labRequestTemplate || templates[0]?.id}
                onChange={(v) => setForm((f) => ({ ...f, labRequestTemplate: v }))}
                disabled={!canEdit}
                options={templates.map((t) => ({ value: t.id, label: t.name, subtext: t.owner }))}
                placeholder='เลือกเทมเพลต'
                helperText='จัดการเทมเพลตได้ที่การ์ด "ตัวจัดการเทมเพลตแบบฟอร์มคำขอ" ด้านล่าง'
              />
              <span style={PANEL_LABEL_STYLE}>
                รายการที่จะพิมพ์: {labs.map((l) => LAB_TEST_BY_ID[l.testId]?.nameEn || l.testId).join(' · ')}
              </span>
            </div>
          )
        ) : null}

        {docType === 'xrayrequest' ? (
          films.length === 0 ? (
            <PanelEmptyState
              icon='radiology'
              title='ยังไม่มีรายการตรวจทางรังสีวิทยาที่จะพิมพ์'
              subtitle='กลับไปสั่ง X-ray ที่ขั้นสั่งการรักษาก่อน'
            />
          ) : (
            <span style={PANEL_LABEL_STYLE}>
              รายการที่จะพิมพ์: {films.map((x) => XRAY_EXAM_BY_ID[x.examId]?.name || x.examId).join(' · ')}
            </span>
          )
        ) : null}

        {docType === 'certificate' ? (
          form?.certIssue !== 'yes' ? (
            <PanelEmptyState
              icon='assignment'
              title='ยังไม่ได้ออกใบรับรองแพทย์สำหรับการตรวจครั้งนี้'
              subtitle='เลือก "รับ" ที่การ์ดใบรับรองแพทย์ด้านบนเพื่อออกใบ แล้วจึงพิมพ์ได้'
            />
          ) : (
            <span style={PANEL_LABEL_STYLE}>
              ใบรับรองแพทย์เลขที่ {form?.certNo} · ภาษา {CERT_LANGUAGES.find((l) => l.key === certLang)?.label}
            </span>
          )
        ) : null}

        {/* §1.5.10.2 — ทำเครื่องหมายว่าผลของใบคำขอนี้เป็นข้อมูลลับ →
            แผ่นพิมพ์ขึ้นแถบเตือนชั้นความลับที่หัวกระดาษ */}
        {docType === 'labrequest' || docType === 'xrayrequest' ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <GuardedAction allowed={canEdit && !hasConfidentialDoc} reason={hasConfidentialDoc
              ? 'ผู้รับบริการรายนี้มีเอกสารที่ทำเครื่องหมายข้อมูลลับอยู่แล้ว — ปลดที่ศูนย์เอกสาร'
              : NO_EDIT_RIGHT_TOOLTIP}
            >
              <Checkbox
                checked={resultConfidential}
                onChange={setResultConfidential}
                label='ผลการตรวจของใบคำขอนี้เป็นข้อมูลลับ (พิมพ์คำเตือนชั้นความลับบนแผ่นกระดาษ)'
              />
            </GuardedAction>
            {hasConfidentialDoc ? (
              <span style={PANEL_LABEL_STYLE}>
                ระบบตั้งให้อัตโนมัติ เพราะผู้รับบริการรายนี้มีเอกสารที่ทำเครื่องหมาย "ข้อมูลลับ" อยู่ในศูนย์เอกสารแล้ว
              </span>
            ) : null}
          </div>
        ) : null}

        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={() => setPreviewOpen(true)}>
            ดูตัวอย่างก่อนพิมพ์
          </NeutralSubdueButton>
          {/* §1.4.6.1–.4 / §1.5.11.4 — "บันทึกเป็น PDF" ใช้ปลายทาง Save as PDF
              ของ print dialog พร้อมตั้งชื่อไฟล์ให้ (ไม่มี PDF engine ฝั่ง server) */}
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='picture_as_pdf' onClick={saveAsPdf}>
            บันทึกเป็น PDF
          </NeutralSubdueButton>
          <span style={PANEL_LABEL_STYLE}>
            ขนาด A4 · หัวตารางซ้ำทุกหน้าเมื่อรายการยาวเกิน 1 หน้า · ยังไม่มี PDF engine ในระบบต้นแบบนี้
          </span>
        </div>

        {/* §1.5.10.2 — แผ่นพิมพ์จริงของใบคำขอตรวจ (เดิมมีแค่ตัวเลือกเทมเพลต).
            เรนเดอร์ในหน้าเลย และเป็นตัวเดียวที่ @media print ปล่อยให้เห็น */}
        {docType === 'labrequest' ? (
          <LabRequestPrintSheet
            patient={{ ...patient, name: cardPatient?.fullName || patient?.name }}
            form={form}
            confidential={resultConfidential}
          />
        ) : null}
        {docType === 'xrayrequest' ? (
          <XrayRequestPrintSheet
            patient={{ ...patient, name: cardPatient?.fullName || patient?.name }}
            form={form}
            confidential={resultConfidential}
          />
        ) : null}
      </PanelCard>

      {/* ── §1.5.2.10 ตัวจัดการเทมเพลตแบบฟอร์มคำขอ ────────── */}
      <PanelCard
        title='ตัวจัดการเทมเพลตแบบฟอร์มคำขอตรวจ'
        subtitle='สร้าง / แก้ไข / ลบ เทมเพลตของผู้ใช้เอง — เทมเพลตที่บันทึกจะไปปรากฏใน dropdown ของใบขอตรวจแล็บ'
        action={
          <GuardedAction allowed={canEdit}>
            <BrandButton
              variant='outline' size='sm' leadingIcon='add'
              onClick={() => setTemplateDraft({
                id: '', name: '', header: '', fields: ['hn', 'name', 'tests'], prepText: '',
              })}
            >
              สร้างเทมเพลตใหม่
            </BrandButton>
          </GuardedAction>
        }
      >
        <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
          <Table
            rowKey={(r) => r.id}
            rows={templates}
            columns={[
              {
                key: 'name', header: 'ชื่อเทมเพลต', flex: 1,
                render: (r) => (
                  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span style={PANEL_VALUE_STYLE}>{r.name}</span>
                    <span style={PANEL_LABEL_STYLE}>{r.header}</span>
                  </div>
                ),
              },
              {
                key: 'fields', header: 'ฟิลด์ที่แสดง',
                render: (r) => (
                  <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    {r.fields.map((f) => (
                      <ColorfulBadge key={f} style='grey' size='small' width='hug'>
                        {TEMPLATE_FIELD_OPTIONS.find((o) => o.key === f)?.label || f}
                      </ColorfulBadge>
                    ))}
                  </div>
                ),
              },
              { key: 'owner', header: 'เจ้าของ' },
              {
                key: 'actions', header: '',
                render: (r) => (
                  <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <GuardedAction
                      allowed={canEdit && !r.locked}
                      reason={r.locked ? 'เทมเพลตของระบบ แก้ไขไม่ได้ — คัดลอกไปสร้างใหม่แทน' : NO_EDIT_RIGHT_TOOLTIP}
                    >
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => setTemplateDraft({ ...r })}>
                        แก้ไข
                      </NeutralSubdueButton>
                    </GuardedAction>
                    <GuardedAction
                      allowed={canEdit && !r.locked}
                      reason={r.locked ? 'เทมเพลตของระบบ ลบไม่ได้' : NO_EDIT_RIGHT_TOOLTIP}
                    >
                      <NeutralSubdueButton variant='outline' size='sm' leadingIcon='delete' onClick={() => setDeleteTarget(r)}>
                        ลบ
                      </NeutralSubdueButton>
                    </GuardedAction>
                  </div>
                ),
              },
            ]}
            emptyMessage='ยังไม่มีเทมเพลต'
          />
        </div>

        {templateDraft ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <InputField
              label='ชื่อเทมเพลต'
              required
              value={templateDraft.name}
              onChange={(v) => setTemplateDraft((d) => ({ ...d, name: v }))}
              showLeadingIcon={false}
              placeholder='เช่น ใบคำขอคลินิกเด็กดี'
              error={String(templateDraft.name || '').trim() ? undefined : 'ต้องตั้งชื่อเทมเพลต'}
            />
            <InputField
              label='หัวกระดาษ'
              value={templateDraft.header}
              onChange={(v) => setTemplateDraft((d) => ({ ...d, header: v }))}
              showLeadingIcon={false}
              placeholder='ชื่อหน่วยงานที่จะพิมพ์บนหัวใบคำขอ'
            />
            <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {TEMPLATE_FIELD_OPTIONS.map((o) => (
                <Checkbox
                  key={o.key}
                  label={o.label}
                  checked={(templateDraft.fields || []).includes(o.key)}
                  onChange={() => setTemplateDraft((d) => ({
                    ...d,
                    fields: (d.fields || []).includes(o.key)
                      ? d.fields.filter((f) => f !== o.key)
                      : [...(d.fields || []), o.key],
                  }))}
                />
              ))}
            </div>
            <SuggestibleTextarea
              voice
              label='ข้อความการเตรียมตัวตรวจที่พิมพ์ให้ผู้รับบริการ'
              value={templateDraft.prepText}
              onChange={(e) => setTemplateDraft((d) => ({
                ...d, prepText: typeof e === 'string' ? e : e?.target?.value ?? '',
              }))}
              suggestions={PREP_SUGGESTIONS}
              minChars={2}
              height={120}
              minHeight={88}
              popoverAriaLabel='ตัวอย่างข้อความการเตรียมตัวตรวจ'
              placeholder='ข้อความที่จะพิมพ์ท้ายใบคำขอ'
            />
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <GuardedAction allowed={canEdit}>
                <BrandButton variant='fill' size='sm' leadingIcon='save' onClick={saveTemplate}>
                  บันทึกเทมเพลต
                </BrandButton>
              </GuardedAction>
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='close' onClick={() => setTemplateDraft(null)}>
                ยกเลิก
              </NeutralSubdueButton>
            </div>
          </div>
        ) : null}
      </PanelCard>

      {/* ── §1.5.1.6 แบบฟอร์มความยินยอมประกอบการสั่งการรักษา ── */}
      <PanelCard
        title='แบบฟอร์มความยินยอมประกอบการสั่งการรักษา'
        subtitle='เลือกแบบฟอร์มตามที่สำนักอนามัยกำหนด → กรอกและลงนาม → ผูกกับการตรวจครั้งนี้และคำสั่งที่เกี่ยวข้อง'
        action={<CountLabel n={consentRecords.length} unit='ฉบับ' />}
      >
        {missingConsent.length > 0 ? (
          <>
            <PanelAlert tone='warning' icon='assignment_late' title={`มีคำสั่งยา ${missingConsent.length} รายการที่ยังไม่มีเอกสารประกอบ`}>
              {missingConsent.map((x) => `${x.med.name} → ${x.need.formName}`).join(' · ')} —
              ระบบจะเตือนซ้ำที่ขั้นสั่งการรักษาจนกว่าจะแนบครบ
            </PanelAlert>
            {/* แบบฟอร์มประกอบการสั่งยาเป็นคนละชุดกับหนังสือยินยอมด้านล่าง
                (ยาเสพติด/นอกบัญชียาหลัก/วัตถุออกฤทธิ์) — ยืนยันการแนบทีละรายการ
                ไม่ใช่ปลดล็อกยกชุดตอนลงนามใบยินยอมทั่วไป */}
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {missingConsent.map((x) => (
                <div
                  key={x.med.id || x.med.name}
                  className='flex flex-wrap items-center justify-between w-full'
                  style={{
                    gap: 'var(--dim-space-300, 12px)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                    paddingTop: 'var(--dim-space-300, 12px)',
                    paddingRight: 'var(--dim-space-300, 12px)',
                    paddingBottom: 'var(--dim-space-300, 12px)',
                    paddingLeft: 'var(--dim-space-300, 12px)',
                  }}
                >
                  <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                    <span style={PANEL_VALUE_STYLE}>{x.need.formName}</span>
                    <span style={PANEL_LABEL_STYLE}>{x.med.name} · {x.need.why}</span>
                  </div>
                  <GuardedAction allowed={canEdit}>
                    <NeutralSubdueButton
                      variant='outline' size='sm' leadingIcon='attach_file'
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          medications: (f.medications || []).map((m) => (
                            (m.id && x.med.id ? m.id === x.med.id : m.name === x.med.name)
                              ? { ...m, supportingFormAttached: true }
                              : m
                          )),
                        }));
                        appendAudit({
                          hn, visitId, category: 'document',
                          field: `แนบเอกสารประกอบการสั่งยา — ${x.med.name}`,
                          oldValue: 'ยังไม่แนบ',
                          newValue: `${x.need.formName} · ยืนยันโดย ${CURRENT_CLINICIAN.name} เมื่อ ${stampNow()}`,
                        });
                      }}
                    >
                      ยืนยันว่าแนบเอกสารนี้แล้ว
                    </NeutralSubdueButton>
                  </GuardedAction>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {consentForms.map((f) => {
            const done = consentRecords.some((r) => r.slug === f.slug);
            return (
              <div
                key={f.slug}
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-100, 4px)',
                  minWidth: 260,
                  flex: '1 1 260px',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                  background: 'var(--surface-card-100)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                }}
              >
                <span style={PANEL_VALUE_STYLE}>{f.name}</span>
                <span style={PANEL_LABEL_STYLE}>{f.summary} · {f.version}</span>
                <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {done ? <StatusBadge style='success' size='small' icon='task_alt'>กรอกและลงนามแล้ว</StatusBadge> : null}
                  <GuardedAction allowed={canEdit}>
                    <NeutralSubdueButton
                      variant='outline' size='sm' leadingIcon={done ? 'edit' : 'edit_document'}
                      onClick={() => setConsentForm(f)}
                    >
                      {done ? 'แก้ไข/ลงนามใหม่' : 'กรอกแบบฟอร์ม'}
                    </NeutralSubdueButton>
                  </GuardedAction>
                </div>
              </div>
            );
          })}
        </div>

        {consentRecords.length > 0 ? (
          <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
            <Table
              rowKey={(r) => r.slug}
              rows={consentRecords}
              columns={[
                { key: 'name', header: 'แบบฟอร์ม', flex: 1 },
                { key: 'signedAt', header: 'ลงนามเมื่อ' },
                { key: 'signedBy', header: 'ผู้ลงนาม' },
                {
                  key: 'linkedOrders', header: 'ผูกกับคำสั่ง',
                  render: (r) => <span style={PANEL_LABEL_STYLE}>{(r.linkedOrders || []).join(' · ') || 'ทั้ง visit'}</span>,
                },
              ]}
              emptyMessage='ยังไม่มีแบบฟอร์มยินยอมของการตรวจครั้งนี้'
            />
          </div>
        ) : null}
      </PanelCard>

      {/* ตัวอย่างก่อนพิมพ์ */}
      <AlertDialog
        open={previewOpen}
        type='info'
        title={`ตัวอย่างก่อนพิมพ์ — ${DOC_TYPES.find((d) => d.key === docType)?.label || ''}`}
        description={signature
          ? `เอกสารจะประทับ "ลงนามโดย ${signature.by} เมื่อ ${signature.at}"`
          : 'ยังไม่ได้ลงนามอิเล็กทรอนิกส์ — เอกสารจะพิมพ์เส้นสำหรับลงลายมือชื่อแทน ไม่ปล่อยช่องว่างเปล่า'}
        confirmLabel='พิมพ์'
        cancelLabel='ปิด'
        onConfirm={() => {
          /* §1.4.6.3 — ห้ามพิมพ์เอกสารที่ไม่มีเนื้อหา */
          if (docIsEmpty) { setPreviewOpen(false); setEmptyPrintGuard(true); return; }
          printDoc();
        }}
        onCancel={() => setPreviewOpen(false)}
        onClose={() => setPreviewOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <InfoPair label='ผู้รับบริการ' value={`${cardPatient?.fullName || patient?.name || '—'} (HN ${patient?.hn || '—'})`} />
          <InfoPair label='แพทย์ผู้ออกเอกสาร' value={`${CURRENT_CLINICIAN.name} · ${CURRENT_CLINICIAN.license}`} />
          <InfoPair label='จำนวนรายการ' value={
            docType === 'prescription' ? `${meds.length} รายการยา`
              : docType === 'labrequest' ? `${labs.length} รายการตรวจ`
                : docType === 'xrayrequest' ? `${films.length} รายการตรวจ`
                  : '1 ฉบับ'
          } />
          {docIsEmpty ? (
            <PanelAlert tone='warning' icon='error' title='เอกสารนี้ยังไม่มีรายการ'>
              กด "พิมพ์" ตอนนี้จะได้กระดาษเปล่า — กลับไปเพิ่มรายการในขั้นตอนสั่งการรักษาก่อน
            </PanelAlert>
          ) : null}
          <span style={PANEL_LABEL_STYLE}>
            หมายเหตุ: ระบบต้นแบบพิมพ์ผ่าน @media print เท่านั้น (ยังไม่มี PDF engine) —
            ถ้ารายการยาวเกิน 1 หน้า หัวตารางจะซ้ำทุกหน้าและมีเลขหน้ากำกับ
          </span>
        </div>
      </AlertDialog>

      {/* §1.4.6.3 — เตือนก่อนพิมพ์เอกสารเปล่า */}
      <AlertDialog
        open={emptyPrintGuard}
        type='warning'
        title='ยังพิมพ์เอกสารนี้ไม่ได้'
        description={`${DOC_TYPES.find((d) => d.key === docType)?.label || 'เอกสาร'} ยังไม่มีรายการใด — ถ้าสั่งพิมพ์ตอนนี้จะได้กระดาษเปล่า กรุณาเพิ่มรายการในขั้นตอนสั่งการรักษาก่อน แล้วจึงกลับมาพิมพ์อีกครั้ง`}
        confirmLabel='กลับไปเพิ่มรายการ'
        showCancel={false}
        onConfirm={() => setEmptyPrintGuard(false)}
        onClose={() => setEmptyPrintGuard(false)}
      />

      {/* §1.5.11.4 / §1.4.6.1–.4 — คำแนะนำบันทึกเป็น PDF (ไม่มี PDF engine) */}
      <AlertDialog
        open={pdfHintOpen}
        type='info'
        title='บันทึกเอกสารเป็นไฟล์ PDF'
        description='ระบบต้นแบบยังไม่มีตัวสร้าง PDF ฝั่งเซิร์ฟเวอร์ — ใช้ความสามารถ "บันทึกเป็น PDF" ของเบราว์เซอร์แทน ซึ่งได้ไฟล์หน้าตาเหมือนที่พิมพ์ทุกประการ'
        confirmLabel='เปิดหน้าต่างพิมพ์'
        cancelLabel='ยกเลิก'
        onConfirm={doSaveAsPdf}
        onCancel={() => setPdfHintOpen(false)}
        onClose={() => setPdfHintOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <InfoPair label='ชื่อไฟล์ที่ระบบตั้งให้' value={`${docFileName()}.pdf`} />
          <span style={PANEL_LABEL_STYLE}>
            ขั้นตอน: กด "เปิดหน้าต่างพิมพ์" → ที่ช่อง "ปลายทาง / Destination" เลือก
            <b> "บันทึกเป็น PDF" (Save as PDF)</b> → กดบันทึก
          </span>
          <span style={PANEL_LABEL_STYLE}>
            กระดาษถูกตั้งเป็น A4 แนวตั้ง ขอบ 12 มม. · หัวตารางซ้ำทุกหน้า · การบันทึกครั้งนี้ถูกเขียนลงประวัติการแก้ไข
          </span>
        </div>
      </AlertDialog>

      {/* ลบเทมเพลต */}
      <ReasonDialog
        open={!!deleteTarget}
        type='destructive'
        title='ลบเทมเพลตแบบฟอร์มคำขอ'
        description={`ลบเทมเพลต "${deleteTarget?.name || ''}" ออกจากรายการ — ใบคำขอที่พิมพ์ไปแล้วไม่ได้รับผลกระทบ`}
        confirmLabel='ยืนยันการลบ'
        suggestions={[
          'ไม่ได้ใช้งานแล้ว มีเทมเพลตใหม่มาแทน',
          'สร้างซ้ำโดยไม่ตั้งใจ',
          'หัวกระดาษไม่ตรงกับหน่วยงานปัจจุบัน',
        ]}
        onConfirm={(reason) => {
          removeRequestTemplate(deleteTarget.id, reason);
          setDeleteTarget(null);
        }}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ลงนามอิเล็กทรอนิกส์ */}
      <AlertDialog
        open={signatureOpen}
        type='info'
        title='ลงนามอิเล็กทรอนิกส์บนเอกสาร'
        description={`ระบบจะประทับ "ลงนามโดย ${CURRENT_CLINICIAN.name} (${CURRENT_CLINICIAN.license}) เมื่อ ${stampNow()}" ลงบนเอกสารที่พิมพ์จากขั้นตอนนี้`}
        confirmLabel='ยืนยันการลงนาม'
        cancelLabel='ยกเลิก'
        onConfirm={signNow}
        onCancel={() => setSignatureOpen(false)}
        onClose={() => setSignatureOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {form?.certSignature ? (
            <span style={PANEL_LABEL_STYLE}>ใช้ลายเซ็นที่วาดไว้ในการ์ดใบรับรองแพทย์ด้านบน</span>
          ) : (
            <PanelAlert tone='warning' icon='draw' title='ยังไม่มีภาพลายเซ็น'>
              คุณยังไม่ได้วาดลายเซ็นในการ์ดใบรับรองแพทย์ — ระบบจะประทับเป็นข้อความ
              "ลงนามโดย … เมื่อ …" แทน และเอกสารจะยังมีเส้นให้ลงลายมือชื่อกำกับ
            </PanelAlert>
          )}
        </div>
      </AlertDialog>

      {/* กรอกแบบฟอร์มยินยอม */}
      <ConsentFormFillPopup
        open={!!consentForm}
        form={consentForm}
        patient={cardPatient || patient}
        onClose={() => setConsentForm(null)}
        onConfirm={() => {
          setForm((f) => {
            const prev = (f.consentRecords || []).filter((r) => r.slug !== consentForm.slug);
            /* ปลดธง "ต้องแนบเอกสาร" เฉพาะยาที่ต้องการ "แบบฟอร์มใบนี้" เท่านั้น
               (เดิมลงนามใบไหนก็ล้างคำเตือนของยาเสพติด/นอก NLEM ทั้งหมด) */
            const matches = (name) => {
              const need = needsSupportingForm(name);
              return !!need && need.formName === consentForm.name;
            };
            return {
              ...f,
              consentRecords: [...prev, {
                slug: consentForm.slug,
                name: consentForm.name,
                signedAt: stampNow(),
                signedBy: CURRENT_CLINICIAN.name,
                linkedOrders: (f.medications || [])
                  .filter((m) => !m.cancelledAt && matches(m.name))
                  .map((m) => m.name),
              }],
              medications: (f.medications || []).map((m) => (
                matches(m.name) ? { ...m, supportingFormAttached: true } : m
              )),
            };
          });
          appendAudit({
            hn, visitId, category: 'document', field: `กรอกแบบฟอร์มความยินยอม — ${consentForm.name}`,
            oldValue: '—', newValue: `ลงนามโดย ${CURRENT_CLINICIAN.name} เมื่อ ${stampNow()}`,
          });
          setConsentForm(null);
        }}
      />
    </div>
  );
};

export default CpoeDocumentsStep;
