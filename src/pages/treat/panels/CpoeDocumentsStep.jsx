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
import SuccessPopup from '@/components/popup/SuccessPopup';
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
  /* ป๊อปอัปสำเร็จหลังลงนาม — ไม่ใช้ toast (มติผู้ใช้ 27 ส.ค. 69) */
  const [signedConsent, setSignedConsent] = useState(null);
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

      {/* การ์ด "ภาษาของใบรับรองแพทย์" (§1.5.11.3) พร้อมใบตัวอย่าง ถูกเอาออก
          31 ส.ค. 69 (มติผู้ใช้) — ตัวเลือกภาษาและตัวอย่างทั้งใบไม่ถูกใช้ในโฟลว์นี้
          `CERT_LANGUAGES` / `certText()` ยังอยู่ในไฟล์ พร้อมเสียบกลับถ้าจะเอาคืน */}

      {/* การ์ด "พิมพ์เอกสารของการตรวจครั้งนี้" (ศูนย์พิมพ์เอกสาร §1.5.10.1/2)
          ถูกเอาออก 28 ส.ค. 69 */}

      {/* การ์ด "ตัวจัดการเทมเพลตแบบฟอร์มคำขอตรวจ" (§1.5.2.10) ถูกเอาออก
          28 ส.ค. 69 — งานจัดการเทมเพลตเป็นงานตั้งค่า ไม่ใช่ของขั้นเอกสาร
          ในใบตรวจของคนไข้รายหนึ่ง */}

      {/* การ์ด "แบบฟอร์มความยินยอมประกอบการสั่งการรักษา" (§1.5.1.6) ถูกเอาออก
          28 ส.ค. 69 */}

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
          setSignedConsent(consentForm);
          setConsentForm(null);
        }}
      />

      {/* ลงนามแบบฟอร์มความยินยอมสำเร็จ — ป๊อปอัป ไม่ใช่ toast */}
      <SuccessPopup
        open={Boolean(signedConsent)}
        onClose={() => setSignedConsent(null)}
        buttonLabel='เรียบร้อย'
        title={`ลงนาม “${signedConsent?.name || 'แบบฟอร์มความยินยอม'}” สำเร็จ`}
        description='แนบเข้าแฟ้มเอกสารของการรักษาครั้งนี้แล้ว'
      />
    </div>
  );
};

export default CpoeDocumentsStep;
