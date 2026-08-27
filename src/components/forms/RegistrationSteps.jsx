import React, { useEffect, useRef, useState } from 'react';

import {
  SectionTitle, SectionTitleIcon, SubCard, FieldGrid, Field,
  AddRowButton, Sym,
} from '@/components/forms/Fields';
import InputField from '@/components/forms/InputField';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import CheckboxButton from '@/components/checkbox/CheckboxButton';
import RadioButton from '@/components/radio/RadioButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PendingConsentFormCard from '@/components/consent/PendingConsentFormCard';
import ConsentDisclosureFillPopup from '@/components/consent/ConsentDisclosureFillPopup';
import ConsentFormPrintConfirmDialog from '@/components/consent/ConsentFormPrintConfirmDialog';
import SuccessPopup from '@/components/popup/SuccessPopup';
import Alert from '@/components/alert/Alert';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { REGISTRATION_PENDING_CONSENT_CARDS, consentFormCoverUrl } from '@/data/registrationConsentForms';
import { CONSENT_WORKLIST_FORM_POOL, CONSENT_TOPICS } from '@/data/consentFormRecords';
import ConsentWithdrawRequestPopup from '@/components/consent/ConsentWithdrawRequestPopup';
import { saveRegistrationDraft, markRegistrationConsentCompleted } from '@/data/registrationForm';
import healthInsuranceAnim from '@/assets/illustrations/Girl finding health insurance online.json';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DeleteEmergencyContactConfirmPopup from '@/components/popup/DeleteEmergencyContactConfirmPopup';
import DeleteDrugAllergyConfirmPopup from '@/components/popup/DeleteDrugAllergyConfirmPopup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import RightsDocumentScanPopup from '@/components/popup/RightsDocumentScanPopup';
import FaceScanVerifyPopup from '@/components/popup/FaceScanVerifyPopup';
import Popup from '@/components/popup/Popup';
import DragAndDrop from '@/components/form-builder/DragAndDrop';
import {
  formatNationalId,
  formatThaiBuddhistDate,
  parseThaiBuddhistDate,
  ID_CARD_CHIP_PHOTO_MOCK,
  MOBILITY_OTHER_SUGGESTIONS,
  buildMockRightsGroups,
  hasThaiCharacters,
  getBirthYearError,
  ageToBirthYearBE,
  appendRegistrationAudit,
  EDUCATION_OPTIONS,
  OCCUPATION_OPTIONS,
} from '@/data/registrationForm';
import { MR_GENDERS, MR_GENDER_IDENTITIES } from '@/data/mrPatients';
import {
  THAI_PROVINCE_NAMES,
  THAI_POSTCODES,
  provinceByPostcode,
} from '@/data/thaiProvinces';
import { districtsOfProvince, subdistrictsOfDistrict } from '@/data/thaiDistricts';
import useTakePhotoCapture from '@/hooks/useTakePhotoCapture';
import { shouldUseNativeCameraInput } from '@/utils/cameraDevice';
import { HOSPITAL_OPTIONS, HOSPITAL_OTHER_VALUE } from '@/data/hospitals';
import SelectWithOther from '@/components/forms/SelectWithOther';

/* Per-step form bodies for the Registration (เวชระเบียน) flow.
   Each step accepts (form, setForm) and reads/writes its own slice.
   Layouts faithfully follow Figma 2373:119045..119049 — section title,
   subcards for repeating entries, footer add-row buttons. */

/* ─────────────────────────────────────────────────────────────
   Step 1 — ข้อมูลส่วนตัว (Figma 2373:119045)
   ───────────────────────────────────────────────────────────── */

const PREFIX_TH = ['นาย', 'นาง', 'นางสาว', 'เด็กชาย', 'เด็กหญิง'];
const PREFIX_EN = ['Mr.', 'Mrs.', 'Ms.', 'Master', 'Miss'];
const BLOOD_TYPES = ['O', 'A', 'B', 'AB'];
/* ทะเบียนการศึกษา/อาชีพ ย้ายไปอยู่ที่ registrationForm.js แล้ว — เป็นข้อมูล
   ไม่ใช่ UI และหน้าอื่น (สรุปข้อมูล / รายงาน) ต้องอ่านชุดเดียวกัน */
const EDUCATION = EDUCATION_OPTIONS;
const OCCUPATIONS = OCCUPATION_OPTIONS;
const MARITAL = ['โสด', 'สมรส', 'หย่า', 'หม้าย'];
/** Spouse name row — Figma 2373:119045; only when marital status is สมรส. */
const SHOWS_SPOUSE_FIELDS = (marital) => marital === 'สมรส';

/* Figma 2373:119045 — field rhythm inside step 1 body. */
const STEP1_FIELD_GAP = 'var(--dim-space-600)';

/* Photo cluster — Figma PHCIS-Registration 303:132572 · Profile 303:131528. */
const PHOTO_CLUSTER_WIDTH = 384;
const PHOTO_ZONE_SIZE = 160;

const ICON_CAMERA = '/icons/registration/camera.svg';
const ICON_SECTION_PHONE = '/icons/registration/phone.svg';
const ICON_SECTION_ALERT_TRIANGLE = '/icons/registration/alert-triangle.svg';

/* สถานะผู้รับบริการ — การ์ดขาว "แยกใบ" อยู่เหนือการ์ดเนื้อหาของ step
   (มติผู้ใช้ 27 ส.ค. 69: "เป็นการ์ดสีขาวแยกออกมา ไม่รวม section เดียวกับ
   ข้อมูลส่วนตัว") ประกอบเข้าหน้าผ่าน slot `beforeCard` ของ <FormShell>
   ไม่ได้อยู่ใน Step1Personal อีกแล้ว */
const PATIENT_STATUS_TONES = {
  active: {
    tileBg:   'var(--surface-brandPrimary-quaternary)',
    tileIcon: 'var(--icon-brandPrimary-default)',
  },
  inactive: {
    tileBg:   'var(--surface-info-quaternary, #F0F6FF)',
    tileIcon: 'var(--icon-info-default, #1d4ed8)',
  },
};

const PatientStatusCircleIcon = ({ icon, tone = 'active' }) => {
  const t = PATIENT_STATUS_TONES[tone] || PATIENT_STATUS_TONES.active;
  return (
    <span
      aria-hidden
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--dim-radius-full)',
        background: t.tileBg,
        color: t.tileIcon,
      }}
    >
      <Sym name={icon} size={20} color='currentColor' />
    </span>
  );
};

const PatientStatusOption = ({ icon, label, tone = 'active', value, checked, onChange, name }) => (
  <RadioButton
    name={name}
    value={value}
    checked={checked}
    onChange={onChange}
    title={label}
    circleIcon={<PatientStatusCircleIcon icon={icon} tone={tone} />}
    showRadio={false}
    showIcon={false}
    showBadgeTitle={false}
    showBadge={false}
    showDescription={false}
  />
);

/* หัวข้อย่อยใน card สถานะผู้รับบริการ (สถานะการมีชีวิต / กลุ่มการออกเลข HN). */
const PatientStatusSubTitle = ({ children }) => (
  <span style={{
    color: 'var(--text-content-secondary, #636B72)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium)',
    lineHeight: 1.5,
  }}>
    {children}
  </span>
);

const PatientStatusSection = ({
  patientStatus = 'active',
  onPatientStatusChange,
  hn,
  patientTypeLabel = 'ผู้ป่วยใหม่',
  /* TOR 1.1.1.2 — สถานะการมีชีวิต (record side). Optional: old callers
     without these props render exactly the original card. */
  lifeStatus,
  onLifeStatusChange,
  deceasedDate,
  onDeceasedDateChange,
}) => {
  const setStatus = onPatientStatusChange || (() => {});
  const hnLabel = hn || '—';
  const showLifeStatus = typeof onLifeStatusChange === 'function';
  return (
    <div
      className='w-full flex flex-col'
      /* การ์ดขาวใบของตัวเอง — ทรงเดียวกับการ์ดเนื้อหาของ step ใน FormShell
         (radius-500 + surface-card-100 + เงา) ไม่ใช่กล่องซ้อนอยู่ข้างในอีกแล้ว */
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-600)',
        borderRadius: 'var(--dim-radius-500)',
        background: 'var(--surface-card-100)',
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      }}
    >
      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600)' }}>
        {/* หัวการ์ดใช้ <SectionTitle> ตัวเดียวกับ "ข้อมูลส่วนตัว" — การ์ดเป็นสีขาว
            แล้ว แถบชื่อสีขาวแบบเดิมจะจมหายไปกับพื้น (มติผู้ใช้ 27 ส.ค. 69) */}
        <div className='flex flex-1 min-w-0'>
          <SectionTitle icon='how_to_reg'>สถานะผู้รับบริการ</SectionTitle>
        </div>
        <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge badgeStyle='teal' hierarchy='primary' size='default' width='hug'>
            {patientTypeLabel}
          </ColorfulBadge>
          <ColorfulBadge badgeStyle='teal' hierarchy='secondary' size='default' width='hug'>
            HN: {hnLabel}
          </ColorfulBadge>
        </div>
      </div>
      <div
        role='radiogroup'
        aria-label='สถานะผู้รับบริการ'
        className='flex items-center flex-wrap'
        style={{ gap: 'var(--dim-space-400)' }}
      >
        <PatientStatusOption
          name='patient-active-status'
          icon='sentiment_satisfied'
          label='ยังคง Active'
          tone='active'
          value='active'
          checked={patientStatus === 'active'}
          onChange={setStatus}
        />
        <PatientStatusOption
          name='patient-active-status'
          icon='sentiment_calm'
          label='ไม่ Active แล้ว'
          tone='inactive'
          value='inactive'
          checked={patientStatus === 'inactive'}
          onChange={setStatus}
        />
      </div>

      {/* TOR 1.1.1.2 — สถานะการมีชีวิต + วันที่เสียชีวิต (บังคับเมื่อเสียชีวิต) */}
      {showLifeStatus && (
        <div
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-300)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-content-quaternary, #E4E7EC)',
            paddingTop: 'var(--dim-space-300)',
          }}
        >
          <PatientStatusSubTitle>สถานะการมีชีวิต</PatientStatusSubTitle>
          <div
            role='radiogroup'
            aria-label='สถานะการมีชีวิต'
            className='flex items-center flex-wrap'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <PatientStatusOption
              name='patient-life-status'
              icon='favorite'
              label='มีชีวิตอยู่'
              tone='active'
              value='alive'
              checked={(lifeStatus || 'alive') === 'alive'}
              onChange={onLifeStatusChange}
            />
            <PatientStatusOption
              name='patient-life-status'
              icon='heart_broken'
              label='เสียชีวิต'
              tone='inactive'
              value='deceased'
              checked={lifeStatus === 'deceased'}
              onChange={onLifeStatusChange}
            />
          </div>
          {lifeStatus === 'deceased' && (
            /* การ์ดนี้กว้างเต็มแถว ส่วน "ข้อมูลส่วนตัว" อยู่ในคอลัมน์ซ้ายที่แคบกว่า
               (มีการ์ดรูปกว้าง 384 + gap 48 อยู่ขวา) ถ้าใช้ 3 คอลัมน์ตรง ๆ ช่อง
               วันที่จะกว้างกว่า "คำนำหน้า" — กันพื้นที่ขวาไว้เท่ากันก่อน แล้วค่อย
               แบ่ง 3 คอลัมน์ ความกว้างจึงตรงกัน (มติผู้ใช้ 27 ส.ค. 69) */
            <div style={{ paddingRight: `calc(${PHOTO_CLUSTER_WIDTH}px + var(--dim-space-1200))` }}>
            <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='วันที่เสียชีวิต' required>
                <DatePicker
                  size='lg'
                  value={parseThaiBuddhistDate(deceasedDate)}
                  onChange={(d) => onDeceasedDateChange?.(d ? formatThaiBuddhistDate(d) : '')}
                  format={formatThaiBuddhistDate}
                  placeholder='วว/ดด/ปปปป'
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>
            </FieldGrid>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 1 — แบบฟอร์มยินยอม (Figma 292:104252 · Consent Pending)
   ───────────────────────────────────────────────────────────── */

/* การ์ดใบนี้ย้ายไป `@/components/consent/PendingConsentFormCard` แล้ว —
   ระบบจัดการความยินยอม (popup กรอกแบบฟอร์มความยินยอม) ใช้ใบเดียวกัน */

/* แบบฟอร์มอื่น ๆ — ใบยินยอมที่เผยแพร่อยู่ในระบบจัดการความยินยอมแต่ไม่ได้อยู่ในชุด
   บังคับของการลงทะเบียน ใบพวกนี้จะลงนามตอนเข้ารับบริการที่ต้องใช้ (ผ่าตัด · วิจัย ·
   ส่งต่อ ฯลฯ) ที่ขั้นลงทะเบียนจึงให้พิมพ์ไปเตรียมไว้ได้ ยังไม่เปิดให้กรอกที่นี่ —
   ตัวกรอกของใบเหล่านี้อยู่ที่โมดูลต้นทาง ไม่ใช่ฟอร์มลงทะเบียน */
const CONSENT_TOPIC_TONE = Object.fromEntries(
  CONSENT_TOPICS.map((t) => [t.type, t.tone]),
);

const REGISTRATION_REQUIRED_TITLES = new Set(
  REGISTRATION_PENDING_CONSENT_CARDS.map((f) => f.title),
);

/** จำนวนใบที่โชว์ในกลุ่ม "แบบฟอร์มอื่นๆ" — ทั้งพูลยาวเกินกว่าจะอ่านรวดเดียว */
const OTHER_CONSENT_FORM_LIMIT = 8;

const OTHER_CONSENT_FORM_POOL = CONSENT_WORKLIST_FORM_POOL
  .filter((f) => !REGISTRATION_REQUIRED_TITLES.has(f.name));

const OTHER_CONSENT_FORM_CARDS = OTHER_CONSENT_FORM_POOL
  .slice(0, OTHER_CONSENT_FORM_LIMIT)
  .map((f, i) => ({
    id: f.code,
    code: f.code,
    title: f.name,
    version: String(f.version || '').replace(/^V\s*/, '') || '1.0',
    /* ป้ายหมวดใช้ "หัวข้อหลัก" สั้น ๆ (ข้อมูลส่วนบุคคล · ข้อมูลการรักษา · การเบิกจ่าย)
       พร้อมสีประจำหัวข้อจาก CONSENT_TOPICS — ไม่ใช่ heading ซึ่งยาวเท่าชื่อใบ */
    categoryLabel: f.worklistType,
    categoryStyle: CONSENT_TOPIC_TONE[f.worklistType] || 'grey',
    cover: consentFormCoverUrl(i + 3),
  }));

/** Step 1 · แบบฟอร์มยินยอม — Figma Registration 292:104252.
 *  กรอกแบบฟอร์ม → /registration/consent/:formId (Figma 298:81941). */
export const StepConsent = ({ form, setForm, patient }) => {
  const completed = Array.isArray(form?.consentCompletedIds) ? form.consentCompletedIds : [];
  const pending = REGISTRATION_PENDING_CONSENT_CARDS.filter((f) => !completed.includes(f.id));
  const pendingCount = pending.length;
  /* กรอกใบยินยอมใน popup ซ้อนบนหน้าลงทะเบียน — ไม่พาออกจาก step (เดิม push ไป
      /registration/consent/:formId แล้วต้องเด้งกลับมาพร้อม state) */
  const [fillFormId, setFillFormId] = useState(null);
  /* การ์ดใบที่กำลังจะพิมพ์ — ยืนยันก่อนสั่งพิมพ์ (ปุ่มไอคอนกดพลาดง่าย) */
  const [printForm, setPrintForm] = useState(null);
  /* ป๊อปอัปสำเร็จหลังลงนาม — ทุกการบันทึกใน popup ต้องยืนยันด้วยป๊อปอัป
     ไม่ใช่ toast (มติผู้ใช้ 27 ส.ค. 69) */
  const [signedForm, setSignedForm] = useState(null);
  /* ขอถอนความยินยอม (ด.1.1.5) — คำขอเข้าแท็บรอดำเนินการของระบบจัดการความยินยอม */
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawnCount, setWithdrawnCount] = useState(0);

  const draftFullName = [form?.prefixTh, form?.firstNameTh, form?.lastNameTh]
    .map((p) => String(p || '').trim()).filter(Boolean).join(' ');
  const patientFullName = [patient?.prefixTh, patient?.firstNameTh, patient?.lastNameTh]
    .map((p) => String(p || '').trim()).filter(Boolean).join(' ');
  const rawNationalId = form?.nationalId || patient?.nationalId || '';

  const markCompleted = (formId) => {
    saveRegistrationDraft(form);
    markRegistrationConsentCompleted(formId);
    setForm?.((s) => {
      const prev = Array.isArray(s.consentCompletedIds) ? s.consentCompletedIds : [];
      return prev.includes(formId) ? s : { ...s, consentCompletedIds: [...prev, formId] };
    });
    setFillFormId(null);
    setSignedForm(REGISTRATION_PENDING_CONSENT_CARDS.find((f) => f.id === formId) || { id: formId });
  };

  return (
    <>
      {/* สองกลุ่มแยกการ์ดคนละใบ — ใบบังคับของการลงทะเบียนกับใบเสริมของโมดูลอื่น
          อยู่ในกล่องเดียวกันแล้วอ่านไม่ออกว่าอันไหนต้องทำก่อนไปขั้นถัดไป */}
      <SubCard>
        <div className='flex w-full items-center' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex-1 min-w-0'>
            <SectionTitle icon='assignment'>แบบฟอร์มที่ยังไม่ขอความยินยอม</SectionTitle>
          </div>
          <NeutralSubdueButton
            variant='outline'
            size='md'
            onClick={() => setWithdrawOpen(true)}
          >
            ขอถอนความยินยอม
          </NeutralSubdueButton>
        </div>

        {/* ไม่มี Alert เตือนจำนวนใบที่ค้าง — หัวข้อ "แบบฟอร์มที่ยังไม่ขอความยินยอม"
            ด้านบนบอกอยู่แล้ว การเตือนซ้ำเป็น noise */}
        {pendingCount === 0 ? (
          <Alert
            type='success'
            title='แบบฟอร์มยินยอมครบถ้วนแล้ว'
            subtext='สามารถไปขั้นตอนถัดไปเพื่อกรอกข้อมูลส่วนตัวได้'
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
            style={{ maxWidth: 640, width: '100%' }}
          />
        ) : (
          <div
            className='grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1366px]:grid-cols-5 items-stretch'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            {pending.map((item) => (
              <PendingConsentFormCard
                key={item.id}
                {...item}
                onPrint={() => setPrintForm(item)}
                onFill={() => setFillFormId(item.id)}
              />
            ))}
          </div>
        )}
      </SubCard>

      <SubCard>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-050)' }}>
          <SectionTitle icon='folder_open'>แบบฟอร์มอื่นๆ</SectionTitle>
          <span style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            {`ใบยินยอมที่ไม่บังคับตอนลงทะเบียน — ลงนามเมื่อเข้ารับบริการที่ต้องใช้ พิมพ์เตรียมไว้ล่วงหน้าได้ · แสดง ${OTHER_CONSENT_FORM_CARDS.length} จาก ${OTHER_CONSENT_FORM_POOL.length} ใบที่เผยแพร่อยู่`}
          </span>
        </div>
        <div
          className='grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1366px]:grid-cols-5 items-stretch'
          style={{ gap: 'var(--dim-space-400)' }}
        >
          {OTHER_CONSENT_FORM_CARDS.map((item) => (
            <PendingConsentFormCard
              key={item.id}
              {...item}
              showFill={false}
              onPrint={() => setPrintForm(item)}
            />
          ))}
        </div>
      </SubCard>

      <ConsentFormPrintConfirmDialog
        form={printForm}
        onCancel={() => setPrintForm(null)}
        onConfirm={() => { setPrintForm(null); window.print?.(); }}
      />

      {/* กรอกใบยินยอม — เอกสารตัวเดียวกับหน้า /registration/consent/:formId */}
      <ConsentDisclosureFillPopup
        open={!!fillFormId}
        formId={fillFormId}
        patient={{
          hn: patient?.hn || form?.hn || '',
          fullName: draftFullName || patientFullName,
          nationalId: rawNationalId ? formatNationalId(rawNationalId) : '',
        }}
        onClose={() => setFillFormId(null)}
        onSaved={({ formId }) => markCompleted(formId)}
      />

      <ConsentWithdrawRequestPopup
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        hn={patient?.hn || form?.hn || ''}
        patientName={draftFullName || patientFullName}
        onSubmitted={(done) => setWithdrawnCount(done.length)}
      />

      <SuccessPopup
        open={withdrawnCount > 0}
        onClose={() => setWithdrawnCount(0)}
        buttonLabel='เรียบร้อย'
        title='ส่งคำขอถอนความยินยอมแล้ว'
        description={`${withdrawnCount} ใบเข้าสถานะ “ขอเพิกถอน” รอเจ้าหน้าที่ผู้ดูแลอนุมัติในระบบจัดการความยินยอม`}
      />

      {/* ลงนามสำเร็จ — ป๊อปอัป ไม่ใช่ toast */}
      <SuccessPopup
        open={Boolean(signedForm)}
        onClose={() => setSignedForm(null)}
        buttonLabel='เรียบร้อย'
        title={`ลงนาม “${signedForm?.title || 'แบบฟอร์มยินยอม'}” สำเร็จ`}
        description={pendingCount === 0
          ? 'ครบทุกแบบฟอร์มแล้ว — ไปขั้นตอนถัดไปเพื่อกรอกข้อมูลส่วนตัวได้'
          : `เหลืออีก ${pendingCount} แบบฟอร์มที่ยังไม่ขอความยินยอม`}
      />
    </>
  );
};

StepConsent.rendersOwnCards = true;

/* PhotoCluster — empty: Figma 303:132572 · verified: success strip ยืนยันตัวตนสำเร็จ
   (แทนแถบ 96% / ความน่าเชื่อถือ). Tap empty → FaceScanVerifyPopup. */
const FACE_VERIFIED_ID_FALLBACK = '/illustration/registration/face-verified-id.png';
const ICON_COMPARE_PHOTOS = '/illustration/registration/compare-photos.svg';

/* % ความตรงของใบหน้า (mock) — ของจริงมาจากบริการเปรียบเทียบใบหน้า
   ค่าเดียวใช้ทั้งในป๊อปอัปที่แสดงผลและใน `faceMatchScore` ที่เขียนลงฟอร์ม
   จะได้ไม่โชว์เลขหนึ่งแล้วบันทึกอีกเลข */
export const MOCK_FACE_MATCH_SCORE = 96;

const PhotoCluster = ({
  hospitalPhoto,
  idCardPhoto,
  faceMatchScore,
  faceVerifiedAt,
  onVerified,
  patientName,
  referencePhoto,
}) => {
  const [scanOpen, setScanOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const verified = faceMatchScore != null && faceMatchScore > 0;
  /* Verified tile shows รูปบัตรประชาชน (chip / Figma mock). */
  const idPhoto = idCardPhoto || FACE_VERIFIED_ID_FALLBACK;
  const livePhoto = hospitalPhoto || idPhoto;
  const updatedLabel = faceVerifiedAt
    || (verified ? formatThaiBuddhistDate(new Date()) : '-');

  const openScan = () => setScanOpen(true);

  const handleCapture = (dataUrl) => {
    onVerified?.(dataUrl);
    setScanOpen(false);
  };

  return (
    <div
      className='flex flex-col items-center justify-start w-full'
      style={{
        gap: 'var(--dim-space-400)',
        padding: 'var(--dim-space-600) var(--dim-space-0)',
        borderRadius: 'var(--dim-radius-400)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) dashed var(--border-neutral-tertiary, #E2E4E6)',
      }}
    >
      <div className='flex flex-col items-center w-full text-center' style={{ gap: 2 }}>
        <span style={{
          color: 'var(--text-topic-secondary-title, #007549)',
          fontFamily: 'var(--type-family-heading-graphic2, var(--type-family-heading-content))',
          fontSize: 'var(--type-size-base)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
          width: '100%',
        }}>
          ถ่ายรูปเพื่อยืนยันตัวตน
        </span>
        <span style={{
          color: 'var(--text-topic-tertiary-subtext, #ADB2B7)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.5,
          width: '100%',
        }}>
          กรุณาถ่ายรูปผู้รับบริการเพื่อยืนยันตัวตน
        </span>
      </div>

      {verified ? (
        <>
          <div
            className='relative shrink-0 overflow-hidden'
            style={{
              width: PHOTO_ZONE_SIZE,
              height: PHOTO_ZONE_SIZE,
              borderRadius: 'var(--dim-radius-500, 16px)',
            }}
          >
            <img
              src={idPhoto}
              alt='รูปบัตรประชาชน'
              width={PHOTO_ZONE_SIZE}
              height={PHOTO_ZONE_SIZE}
              style={{
                width: PHOTO_ZONE_SIZE,
                height: PHOTO_ZONE_SIZE,
                objectFit: 'cover',
                objectPosition: 'center 6%',
                display: 'block',
                borderRadius: 'var(--dim-radius-500, 16px)',
              }}
            />
          </div>

          <div
            className='flex items-center justify-center'
            style={{
              gap: 'var(--dim-space-200)',
              minHeight: 40,
              padding: 'var(--dim-space-200) var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-200)',
              background: 'var(--surface-positive-quaternary, var(--surface-brandPrimary-quaternary, #E2F3EB))',
              width: '100%',
              maxWidth: 236,
              boxSizing: 'border-box',
            }}
            role='status'
            aria-label='ยืนยันตัวตนสำเร็จ'
          >
            <Sym
              name='check_circle'
              size={20}
              color='var(--icon-positive-success, var(--icon-brandPrimary-default, #007549))'
            />
            <span style={{
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}>
              ยืนยันตัวตนสำเร็จ
            </span>
          </div>

          <BrandSubdueButton
            type='button'
            variant='outline'
            size='md'
            leadingIconElement={(
              <img
                src={ICON_COMPARE_PHOTOS}
                alt=''
                width={20}
                height={20}
                style={{ width: 20, height: 20, display: 'block' }}
              />
            )}
            onClick={() => setCompareOpen(true)}
          >
            ดูภาพเปรียบเทียบ
          </BrandSubdueButton>
        </>
      ) : (
        <button
          type='button'
          onClick={openScan}
          className='flex flex-col items-center justify-center shrink-0 overflow-hidden'
          style={{
            width: PHOTO_ZONE_SIZE,
            height: PHOTO_ZONE_SIZE,
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-200)',
            background: 'var(--surface-formbuilder-default, #F4FBF8)',
            border: 'var(--dim-stroke-150, 1.5px) dashed var(--border-formbuilder-default, #C5EDDA)',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
          aria-label='ถ่ายรูปเพื่อยืนยันตัวตน'
        >
          <img
            src={ICON_CAMERA}
            alt=''
            width={20}
            height={20}
            style={{ width: 20, height: 20, display: 'block' }}
          />
          <span style={{
            color: 'var(--text-formbuilder-text, #007549)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-medium)',
            lineHeight: 1.5,
            textAlign: 'center',
          }}>
            ถ่ายรูป
          </span>
        </button>
      )}

      <div
        className='flex w-full items-center justify-center'
        style={{ gap: 'var(--dim-space-200)' }}
      >
        <div
          className='inline-flex items-center shrink-0'
          style={{ gap: 'var(--dim-space-100)' }}
        >
          <Sym name='schedule' size={16} color='var(--text-neutral-default)' />
          <span
            style={{
              color: 'var(--text-neutral-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            วันที่อัปเดทล่าสุด
          </span>
        </div>
        <span
          style={{
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {updatedLabel}
        </span>
      </div>

      <FaceScanVerifyPopup
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onCapture={handleCapture}
        patientName={patientName}
        referencePhoto={referencePhoto || idCardPhoto || FACE_VERIFIED_ID_FALLBACK}
        matchScore={MOCK_FACE_MATCH_SCORE}
      />

      <Popup
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        title='ภาพเปรียบเทียบ'
        size='large'
        actions={[]}
      >
        <div className='flex w-full items-start justify-center' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <img
              src={livePhoto}
              alt='รูปที่สแกน'
              width={200}
              height={200}
              style={{
                width: 200,
                height: 200,
                objectFit: 'cover',
                borderRadius: 'var(--dim-radius-400)',
                display: 'block',
              }}
            />
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}>
              รูปที่สแกน
            </span>
          </div>
          <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <img
              src={idPhoto}
              alt='รูปบัตรประชาชน'
              width={200}
              height={200}
              style={{
                width: 200,
                height: 200,
                objectFit: 'cover',
                objectPosition: 'center 6%',
                borderRadius: 'var(--dim-radius-400)',
                display: 'block',
              }}
            />
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}>
              รูปบัตรประชาชน
            </span>
          </div>
        </div>
      </Popup>
    </div>
  );
};

/** การ์ด "สถานะผู้รับบริการ" แบบพร้อมใช้ — ใบขาวแยกจากการ์ดข้อมูลส่วนตัว
    ส่งเข้า slot `beforeCard` ของ <FormShell> ในขั้นตอน "ข้อมูลส่วนตัว"
    (TOR 1.1.1.2 — audit ทุกการสลับ มีชีวิตอยู่ ↔ เสียชีวิต อยู่ในนี้) */
export const PatientStatusCard = ({ form, setForm, patient }) => {
  const handleLifeStatusChange = (next) => {
    setForm((s) => {
      if ((s.lifeStatus || 'alive') === next) return s;
      appendRegistrationAudit({
        step: 'ส่วนตัว',
        field: 'สถานะการมีชีวิต',
        oldValue: (s.lifeStatus || 'alive') === 'alive' ? 'มีชีวิตอยู่' : 'เสียชีวิต',
        newValue: next === 'alive' ? 'มีชีวิตอยู่' : 'เสียชีวิต',
      });
      return {
        ...s,
        lifeStatus: next,
        deceasedDate: next === 'deceased' ? s.deceasedDate : '',
      };
    });
  };
  return (
    <PatientStatusSection
      patientStatus={form.patientStatus || 'active'}
      onPatientStatusChange={(v) => setForm((s) => ({ ...s, patientStatus: v }))}
      hn={form.hn || patient?.hn || ''}
      patientTypeLabel='ผู้ป่วยใหม่'
      lifeStatus={form.lifeStatus || 'alive'}
      onLifeStatusChange={handleLifeStatusChange}
      deceasedDate={form.deceasedDate}
      onDeceasedDateChange={(v) => setForm((s) => ({ ...s, deceasedDate: v }))}
    />
  );
};

export const Step1Personal = ({ form, setForm, patient, onNameBlurCheck }) => {
  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));
  const handleMaritalChange = (marital) => {
    setForm((s) => ({
      ...s,
      marital,
      ...(SHOWS_SPOUSE_FIELDS(marital)
        ? {}
        : { spouseFirstName: '', spouseLastName: '' }),
    }));
  };
  /* Figma 101:12707 — chip-read locks card-sourced fields only. */
  const fromChip = !!form.idCardFromChip;
  const showSpouseFields = SHOWS_SPOUSE_FIELDS(form.marital);
  /* กลุ่มการออกเลข HN ยังอยู่ในข้อมูล (`form.hnGroup`) และยังคุมช่อง Passport /
     เลขบัตรประชาชนอยู่ — แต่ตัวเลือกบนหน้าจอถูกถอดออกตามคำสั่ง 27 ส.ค. 69
     จึงไม่มีการสลับกลุ่มระหว่างกรอก และไม่ต้องมี dialog ยืนยันล้าง field */
  const isForeignDoc = form.hnGroup === 'foreign-doc';
  const isNoDoc = form.hnGroup === 'no-doc';
  const enFirstNameError = isForeignDoc && hasThaiCharacters(form.firstNameEn)
    ? 'ห้ามใช้อักษรไทย — กรอกชื่อเป็นภาษาอังกฤษตามเอกสาร' : '';
  const enLastNameError = isForeignDoc && hasThaiCharacters(form.lastNameEn)
    ? 'ห้ามใช้อักษรไทย — กรอกนามสกุลเป็นภาษาอังกฤษตามเอกสาร' : '';

  /* ── TOR 1.1.1.11 — ไม่ทราบวันเกิด → ปีเกิด พ.ศ. อย่างเดียว / กรอกอายุแทน ── */
  const birthYearError = getBirthYearError(form.birthYearBE);
  const currentBE = new Date().getFullYear() + 543;
  const ageFromYear = !birthYearError && String(form.birthYearBE || '').length === 4
    ? `${currentBE - Number(form.birthYearBE)} ปี`
    : '';
  const handleDobUnknownToggle = (checked) => {
    setForm((s) => ({
      ...s,
      dobUnknown: checked,
      /* ติ๊กออก → กลับมาบังคับวันเดือนปีเต็มตามเดิม */
      ...(checked ? { dob: '' } : { birthYearBE: '' }),
    }));
  };

  return (
    /* สถานะผู้รับบริการ ไม่ได้อยู่ใน step นี้แล้ว — เป็นการ์ดขาวแยกใบ ประกอบเข้า
       ผ่าน slot `beforeCard` ของ <FormShell> ดู <PatientStatusCard> */
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
      <div className='flex w-full' style={{ gap: 'var(--dim-space-1200)' }}>
        <div className='flex-1 flex flex-col' style={{ gap: STEP1_FIELD_GAP }}>
          <SectionTitle icon='face'>ข้อมูลส่วนตัว</SectionTitle>

          {/* TOR 1.1.1.5 — blur บนชื่อ-นามสกุลไทย → ตรวจชื่อซ้ำกับ MR_PATIENTS
              (host หน้า form ส่ง onNameBlurCheck เข้ามา; step อื่นไม่ส่งก็ไม่ตรวจ) */}
          <div onBlurCapture={() => onNameBlurCheck?.()}>
          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='คำนำหน้า' required>
              <Select
                value={form.prefixTh}
                onChange={set('prefixTh')}
                options={PREFIX_TH}
                placeholder='เลือกคำนำหน้า'
                disabled={fromChip}
                showFieldName={false}
              />
            </Field>
            <Field label='ชื่อ' required>
              <InputField
                value={form.firstNameTh}
                onChange={set('firstNameTh')}
                placeholder='ชื่อ'
                showLabel={false}
              />
            </Field>
            <Field label='นามสกุล' required>
              <InputField
                value={form.lastNameTh}
                onChange={set('lastNameTh')}
                placeholder='นามสกุล'
                showLabel={false}
              />
            </Field>
          </FieldGrid>
          </div>

          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='Prefix' required>
              <Select
                value={form.prefixEn}
                onChange={set('prefixEn')}
                options={PREFIX_EN}
                placeholder='Mr.'
                disabled={fromChip}
                showFieldName={false}
              />
            </Field>
            <Field label='ชื่อ' required>
              <InputField
                value={form.firstNameEn}
                onChange={set('firstNameEn')}
                placeholder='First name'
                showLabel={false}
                error={enFirstNameError}
                showHelperText={!!enFirstNameError}
                helperText={enFirstNameError}
              />
            </Field>
            <Field label='นามสกุล' required>
              <InputField
                value={form.lastNameEn}
                onChange={set('lastNameEn')}
                placeholder='Last name'
                showLabel={false}
                error={enLastNameError}
                showHelperText={!!enLastNameError}
                helperText={enLastNameError}
              />
            </Field>
          </FieldGrid>

          {/* TOR 1.1.1.20 กลุ่ม 2 — ชาวต่างชาติ: เลข Passport บังคับ */}
          {isForeignDoc && (
            <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='เลขที่ Passport' required>
                <InputField
                  value={form.passportNo}
                  onChange={(v) => set('passportNo')(String(v ?? '').toUpperCase())}
                  placeholder='เช่น MJ0455812'
                  maxLength={12}
                />
              </Field>
            </FieldGrid>
          )}

          {/* Figma 205:14733 — เพศกำเนิด aligns with คำนำหน้า col; เพศสภาพ with ชื่อ. */}
          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='เพศกำเนิด' required>
              <Select
                value={form.gender}
                onChange={set('gender')}
                options={MR_GENDERS}
                placeholder='เพศกำเนิด'
                disabled={fromChip}
              />
            </Field>
            <Field label='เพศสภาพ'>
              <Select
                value={form.genderIdentity}
                onChange={set('genderIdentity')}
                options={MR_GENDER_IDENTITIES}
                placeholder='เลือกเพศสภาพ'
              />
            </Field>
          </FieldGrid>

          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field
              label='เลขบัตรประชาชน'
              required={!isForeignDoc && !isNoDoc}
              hint={isNoDoc ? 'กลุ่มไม่มีเอกสาร — ออก HN ชั่วคราว ไม่ต้องกรอกเลขบัตร' : undefined}
            >
              <InputField
                value={form.nationalId}
                onChange={(v) => set('nationalId')(formatNationalId(v))}
                placeholder={isNoDoc ? 'ไม่ต้องกรอก (HN ชั่วคราว)' : 'เลขบัตรประชาชน'}
                disabled={fromChip || isNoDoc}
                maxLength={17}
                inputMode='numeric'
              />
            </Field>
            <Field label='วันออกบัตร' required>
              <DatePicker
                size='lg'
                value={parseThaiBuddhistDate(form.idIssueDate)}
                onChange={(d) => set('idIssueDate')(d ? formatThaiBuddhistDate(d) : '')}
                format={formatThaiBuddhistDate}
                placeholder='วว/ดด/ปปปป'
                disabled={fromChip}
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            <Field label='วันหมดอายุ' required>
              <DatePicker
                size='lg'
                value={parseThaiBuddhistDate(form.idExpiryDate)}
                onChange={(d) => set('idExpiryDate')(d ? formatThaiBuddhistDate(d) : '')}
                format={formatThaiBuddhistDate}
                placeholder='19 สิงหาคม 2571'
                disabled={fromChip}
                showLabel={false}
                showHelperText={false}
              />
            </Field>
          </FieldGrid>

          {/* TOR 1.1.1.11 — ไม่ทราบวันเกิด: DatePicker ↔ ปีเกิด (พ.ศ.) / กรอกอายุแทน
              ช่องวันเกิดกับ checkbox เป็นคู่เดียวกัน จึงชิดกันกว่าระยะห่างระหว่าง
              แถวฟิลด์ปกติ (มติผู้ใช้ 27 ส.ค. 69) */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          {form.dobUnknown ? (
            <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='ปีเกิด (พ.ศ.)' required>
                <InputField
                  value={form.birthYearBE}
                  onChange={(v) => set('birthYearBE')(String(v ?? '').replace(/\D/g, '').slice(0, 4))}
                  placeholder='เช่น 2498'
                  inputMode='numeric'
                  maxLength={4}
                  error={birthYearError}
                  showHelperText={!!birthYearError}
                  helperText={birthYearError}
                />
              </Field>
              {/* ช่องอายุเดียว — เดิมแยกเป็น "กรอกอายุแทน (ปี)" (กรอกได้) กับ "อายุ"
                  (อ่านอย่างเดียว) ซึ่งเป็นค่าเดียวกัน ยุบเหลือช่องเดียวที่ทั้ง
                  แสดงและแก้ได้ (มติผู้ใช้ 27 ส.ค. 69) */}
              <Field label='อายุ (ปี)' hint='กรอกอายุแทนได้ ระบบคำนวณปีเกิดย้อนกลับให้ (ตามระบบเดิม)'>
                <InputField
                  value={ageFromYear ? String(currentBE - Number(form.birthYearBE)) : ''}
                  onChange={(v) => set('birthYearBE')(ageToBirthYearBE(v))}
                  placeholder='เช่น 71'
                  inputMode='numeric'
                  maxLength={3}
                />
              </Field>
              {/* ช่องที่สามของแถวว่างพอดี — ย้ายหมู่เลือดขึ้นมาแทนที่จะอยู่ใน
                  FieldGrid ของตัวเองใต้ checkbox ให้ทรงเดียวกับกรณีทราบวันเกิด */}
              <Field label='หมู่เลือด'>
                <Select
                  value={form.bloodType}
                  onChange={set('bloodType')}
                  options={BLOOD_TYPES}
                  placeholder='เลือกหมู่เลือด'
                />
              </Field>
            </FieldGrid>
          ) : (
            <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='วันเดือนปีเกิด' required>
                <DatePicker
                  size='lg'
                  value={parseThaiBuddhistDate(form.dob)}
                  onChange={(d) => set('dob')(d ? formatThaiBuddhistDate(d) : '')}
                  format={formatThaiBuddhistDate}
                  placeholder='วว/ดด/ปปปป'
                  showLabel={false}
                  showHelperText={false}
                />
              </Field>
              <Field label='อายุ (ปี เดือน วัน)'>
                <InputField value={form.ageDisplay} onChange={set('ageDisplay')} placeholder='36 ปี - 7 เดือน - 11 วัน' disabled />
              </Field>
              <Field label='หมู่เลือด'>
                <Select
                  value={form.bloodType}
                  onChange={set('bloodType')}
                  options={BLOOD_TYPES}
                  placeholder='เลือกหมู่เลือด'
                />
              </Field>
            </FieldGrid>
          )}

          <CheckboxButton
            checked={!!form.dobUnknown}
            onChange={handleDobUnknownToggle}
            label='ไม่ทราบวันเกิด (เก็บเฉพาะปีเกิด พ.ศ.)'
            border
            showCircleIcon={false}
            showIcon={false}
            className='shrink-0'
            style={{ width: 'fit-content', alignSelf: 'flex-start' }}
          />
          </div>

          {/* TOR 1.1.1.14 — ข้อมูลการเกิด (ใบรับรองการเกิด) */}
          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='แพทย์ผู้ออกใบรับรองการเกิด'>
              <InputField
                value={form.birthCertDoctor}
                onChange={set('birthCertDoctor')}
                placeholder='เช่น นพ.ประวิทย์ ชาญเวชกิจ'
              />
            </Field>
            <Field label='เวลาเกิด'>
              {/* คลิกแล้วเลือกชั่วโมง/นาทีจากคอลัมน์ — ตัวเดียวกับหน้าจัดการระบบ
                  (มติผู้ใช้ 27 ส.ค. 69) ค่าที่เก็บเป็นรูปแบบ HH:MM */}
              <TimePicker
                size='lg'
                value={form.birthTime}
                onChange={set('birthTime')}
                placeholder='--:--'
                showLabel={false}
                showHelperText={false}
              />
            </Field>
            {/* เดิมเป็นข้อความพิมพ์อิสระ คนกรอกคนละแบบ ("รพ.กลาง" / "โรงพยาบาลกลาง")
                จนนับสถิติไม่ได้ — เปลี่ยนเป็นทะเบียนสถานพยาบาลที่พิมพ์ค้นได้
                พร้อมตัวเลือก "อื่นๆ" สำหรับที่ไม่มีในทะเบียน (มติผู้ใช้ 27 ส.ค. 69) */}
            <Field label='สถานที่เกิด'>
              <SelectWithOther
                value={form.birthPlace}
                onChange={set('birthPlace')}
                otherValue={form.birthPlaceOther}
                onOtherChange={set('birthPlaceOther')}
                options={HOSPITAL_OPTIONS}
                otherOption={HOSPITAL_OTHER_VALUE}
                placeholder='ค้นหาชื่อโรงพยาบาล'
                otherPlaceholder='ระบุสถานที่เกิด เช่น เกิดที่บ้าน / คลินิก'
                otherLabel='ระบุสถานที่เกิด'
              />
            </Field>
          </FieldGrid>

          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='การศึกษา' required>
              <Select
                value={form.education}
                onChange={set('education')}
                options={EDUCATION}
                placeholder='เลือกการศึกษา'
              />
            </Field>
            <Field label='อาชีพ' required>
              <SelectWithOther
                value={form.occupation}
                onChange={set('occupation')}
                otherValue={form.occupationOther}
                onOtherChange={set('occupationOther')}
                options={OCCUPATIONS}
                placeholder='เลือกอาชีพ'
                otherPlaceholder='ระบุอาชีพ'
                otherLabel='ระบุอาชีพ'
              />
            </Field>
          </FieldGrid>

          <FieldGrid cols={3} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
            <Field label='สถานภาพ'>
              <Select
                value={form.marital}
                onChange={handleMaritalChange}
                options={MARITAL}
                placeholder='เลือกสถานภาพ'
              />
            </Field>
          </FieldGrid>

          {showSpouseFields && (
            <FieldGrid cols={2} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='ชื่อคู่สมรส'>
                <InputField
                  value={form.spouseFirstName}
                  onChange={set('spouseFirstName')}
                  placeholder='ชื่อคู่สมรส'
                  showLeadingIcon={false}
                />
              </Field>
              <Field label='นามสกุลคู่สมรส'>
                <InputField
                  value={form.spouseLastName}
                  onChange={set('spouseLastName')}
                  placeholder='นามสกุลคู่สมรส'
                  showLeadingIcon={false}
                />
              </Field>
            </FieldGrid>
          )}
        </div>

        {/* Photo cluster — Figma PHCIS-Registration 303:132572 · Profile 303:131528. */}
        <div className='flex flex-col shrink-0' style={{ width: PHOTO_CLUSTER_WIDTH, gap: 'var(--dim-space-300)' }}>
          <PhotoCluster
            hospitalPhoto={form.hospitalPhoto}
            idCardPhoto={form.idCardPhoto}
            faceMatchScore={form.faceMatchScore}
            faceVerifiedAt={form.faceVerifiedAt}
            patientName={[form.prefixTh, form.firstNameTh, form.lastNameTh].filter(Boolean).join(' ') || undefined}
            referencePhoto={form.idCardPhoto || undefined}
            onVerified={(dataUrl) => setForm((s) => ({
              ...s,
              hospitalPhoto: dataUrl,
              idCardPhoto: s.idCardPhoto || ID_CARD_CHIP_PHOTO_MOCK,
              faceMatchScore: MOCK_FACE_MATCH_SCORE,
              faceVerifiedAt: formatThaiBuddhistDate(new Date()),
            }))}
          />

          {/* ปุ่ม "ถ่ายรูป (กล้อง)" กับช่อง "อัปโหลดรูปภาพ" ถูกถอดออกจากหน้า
              ลงทะเบียน (มติผู้ใช้ 27 ส.ค. 69) — รูปยืนยันตัวตนมาจากการสแกน
              ใบหน้าใน PhotoCluster ทางเดียว */}
        </div>
      </div>


    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Step 2 — ที่อยู่ (Figma 2373:119046)
   ───────────────────────────────────────────────────────────── */

/* จังหวัด/รหัสไปรษณีย์ ครบทุกจังหวัด — ดู src/data/thaiProvinces.js
   (เดิม hardcode ไว้ 6 จังหวัด / 5 รหัส · มติผู้ใช้ 27 ส.ค. 69) */
const PROVINCES = THAI_PROVINCE_NAMES;
/* เขต/อำเภอ และ แขวง/ตำบล กรองตามระดับบนที่เลือก — ดู src/data/thaiDistricts.js */

/* Placeholders mirror the field label per Figma 207:20375 — every empty
   Step 2 input shows its own muted label inside the field so the empty
   ที่อยู่ปัจจุบัน / ที่อยู่ติดต่อได้ cards read as "fill in <รหัสไปรษณีย์>,
   <จังหวัด>, …" rather than blank rectangles. */
const ADDRESS_PLACEHOLDERS = {
  zip:         'รหัสไปรษณีย์',
  province:    'จังหวัด',
  district:    'เขต/อำเภอ',
  subdistrict: 'แขวง/ตำบล',
  road:        'ถนน',
  moo:         'หมู่/ซอย',
  houseNo:     'เลขที่บ้าน',
};

const AddressBlock = ({ data, onChange, disabled = false }) => {
  const set = (k) => (v) => onChange({ ...data, [k]: v });
  const districtOptions = districtsOfProvince(data.province);
  const subdistrictOptions = subdistrictsOfDistrict(data.province, data.district);
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <FieldGrid cols={4} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
        <Field label='รหัสไปรษณีย์' required>
          <Select
            value={data.zip}
            /* เลือกรหัสแล้วเติมจังหวัดให้เลย ลดการกรอกซ้ำและกันเลือกไม่ตรงกัน */
            onChange={(v) => {
              const province = provinceByPostcode(v);
              onChange({ ...data, zip: v, ...(province ? { province } : {}) });
            }}
            options={THAI_POSTCODES}
            placeholder={ADDRESS_PLACEHOLDERS.zip}
            disabled={disabled}
          />
        </Field>
        <Field label='จังหวัด' required>
          <Select
            value={data.province}
            /* เปลี่ยนจังหวัด → ล้างเขต/แขวงที่เลือกไว้ ไม่งั้นจะค้างค่าของจังหวัดเดิม
               ซึ่งไม่มีอยู่ในลิสต์ใหม่ (มติผู้ใช้ 27 ส.ค. 69) */
            onChange={(v) => onChange({ ...data, province: v, district: '', subdistrict: '' })}
            options={PROVINCES}
            placeholder={ADDRESS_PLACEHOLDERS.province}
            disabled={disabled}
          />
        </Field>
        <Field label='เขต/อำเภอ' required>
          <Select
            value={data.district}
            onChange={(v) => onChange({ ...data, district: v, subdistrict: '' })}
            options={districtOptions}
            placeholder={ADDRESS_PLACEHOLDERS.district}
            /* ยังไม่เลือกจังหวัด = เลือกเขตไม่ได้ */
            disabled={disabled || !data.province}
          />
        </Field>
        <Field label='แขวง/ตำบล'>
          {/* เลือกเขต/อำเภอแล้วต้องกรอกตำบลได้เสมอ (มติผู้ใช้ 27 ส.ค. 69)
              จังหวัดที่ยังไม่มีชุดข้อมูลตำบล (ดู thaiDistricts.js) ให้พิมพ์เองแทน
              การ disable ทิ้งไว้ — ปล่อยให้กรอกไม่ได้เท่ากับกรอกที่อยู่ไม่จบ */}
          {subdistrictOptions.length > 0 ? (
            <Select
              value={data.subdistrict}
              onChange={set('subdistrict')}
              options={subdistrictOptions}
              placeholder={ADDRESS_PLACEHOLDERS.subdistrict}
              disabled={disabled || !data.district}
            />
          ) : (
            <InputField
              value={data.subdistrict}
              onChange={set('subdistrict')}
              placeholder={ADDRESS_PLACEHOLDERS.subdistrict}
              disabled={disabled || !data.district}
              showHelperText={false}
            />
          )}
        </Field>
      </FieldGrid>
      <FieldGrid cols={4} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
        <Field label='ถนน'>
          <InputField value={data.road} onChange={set('road')} placeholder={ADDRESS_PLACEHOLDERS.road} disabled={disabled} />
        </Field>
        <Field label='หมู่/ซอย'>
          <InputField value={data.moo} onChange={set('moo')} placeholder={ADDRESS_PLACEHOLDERS.moo} disabled={disabled} />
        </Field>
        <Field label='เลขที่บ้าน'>
          <InputField value={data.houseNo} onChange={set('houseNo')} placeholder={ADDRESS_PLACEHOLDERS.houseNo} disabled={disabled} />
        </Field>
      </FieldGrid>
    </div>
  );
};

/* Postal-address text fields — Figma 207:19757 "เหมือนที่อยู่ตามทะเบียน
   บ้าน" copies these 7 keys from `addressRegistered` into the target
   slice when the checkbox is checked. Map pin (lat/lng/pinSaved) is
   intentionally NOT in this list — it's an independent map state
   that should survive the snapshot copy. */
const ADDRESS_TEXT_KEYS = ['zip', 'province', 'district', 'subdistrict', 'road', 'moo', 'houseNo'];

const copyRegisteredInto = (registered, target) => {
  const next = { ...target };
  ADDRESS_TEXT_KEYS.forEach((k) => { next[k] = registered?.[k] ?? ''; });
  return next;
};

/* Figma 207:19757 — mirror checkbox stays disabled until ทะเบียนบ้าน has
   the same required fields as AddressBlock (รหัสไปรษณีย์ / จังหวัด / เขต). */
const REGISTERED_ADDRESS_REQUIRED_KEYS = ['zip', 'province', 'district'];

const isRegisteredAddressComplete = (addr) =>
  REGISTERED_ADDRESS_REQUIRED_KEYS.every((k) => String(addr?.[k] ?? '').trim() !== '');

export const Step2Address = ({ form, setForm }) => {
  const setAddr = (key) => (v) => setForm((s) => ({ ...s, [key]: v }));
  const registeredComplete = isRegisteredAddressComplete(form.addressRegistered);

  /* Checkbox — ON copies ทะเบียนบ้าน text fields into the target slice and
     keeps them in sync while checked. OFF leaves the last copied values
     editable. Map pin (lat/lng/pinSaved) stays on the target slice only. */
  const handleUseRegistered = (targetKey, flagKey) => (checked) => {
    setForm((s) => {
      if (checked && !isRegisteredAddressComplete(s.addressRegistered)) return s;
      const next = { ...s, [flagKey]: checked };
      if (checked) {
        next[targetKey] = copyRegisteredInto(s.addressRegistered, s[targetKey]);
      }
      return next;
    });
  };

  /* While "เหมือนที่อยู่ตามทะเบียนบ้าน" is checked, mirror edits made in
     ที่อยู่ตามทะเบียนบ้าน into the target address slice. */
  useEffect(() => {
    if (!form.useRegisteredForCurrent) return;
    setForm((s) => ({
      ...s,
      addressCurrent: copyRegisteredInto(s.addressRegistered, s.addressCurrent),
    }));
  }, [form.addressRegistered, form.useRegisteredForCurrent, setForm]);

  useEffect(() => {
    if (!form.useRegisteredForContact) return;
    setForm((s) => ({
      ...s,
      addressContact: copyRegisteredInto(s.addressRegistered, s.addressContact),
    }));
  }, [form.addressRegistered, form.useRegisteredForContact, setForm]);

  /* If required ทะเบียนบ้าน fields are cleared, drop mirror flags. */
  useEffect(() => {
    if (registeredComplete) return;
    if (!form.useRegisteredForCurrent && !form.useRegisteredForContact) return;
    setForm((s) => ({
      ...s,
      useRegisteredForCurrent: false,
      useRegisteredForContact: false,
    }));
  }, [registeredComplete, form.useRegisteredForCurrent, form.useRegisteredForContact, setForm]);

  const currentAddressDisplay = form.useRegisteredForCurrent
    ? form.addressRegistered
    : form.addressCurrent;
  const contactAddressDisplay = form.useRegisteredForContact
    ? form.addressRegistered
    : form.addressContact;

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* ไม่มีหัวข้อ "ที่อยู่" ซ้ำแล้ว — stepper ด้านบนบอกอยู่ว่าอยู่ขั้นนี้
          (มติผู้ใช้ 27 ส.ค. 69) */}
      <SubCard titleTone='brand' titleIcon='home' title='ที่อยู่ตามทะเบียนบ้าน'>
        <AddressBlock data={form.addressRegistered} onChange={setAddr('addressRegistered')} />
      </SubCard>

      <SubCard titleTone='brand' titleIcon='location_on' title='ที่อยู่ปัจจุบัน'>
        <CheckboxButton
          checked={form.useRegisteredForCurrent}
          onChange={handleUseRegistered('addressCurrent', 'useRegisteredForCurrent')}
          disabled={!registeredComplete}
          label='เหมือนที่อยู่ตามทะเบียนบ้าน'
          border
          showCircleIcon={false}
          showIcon={false}
          className='shrink-0'
          style={{ width: 'fit-content', alignSelf: 'flex-start' }}
        />
        <AddressBlock
          data={currentAddressDisplay}
          onChange={setAddr('addressCurrent')}
          disabled={form.useRegisteredForCurrent}
        />
        <AddressMapBlock
          value={form.addressCurrent}
          onChange={(patch) => setForm((s) => ({
            ...s,
            addressCurrent: { ...s.addressCurrent, ...patch },
          }))}
        />
      </SubCard>

      <SubCard titleTone='brand' titleIcon='contact_mail' title='ที่อยู่ติดต่อได้'>
        <CheckboxButton
          checked={form.useRegisteredForContact}
          onChange={handleUseRegistered('addressContact', 'useRegisteredForContact')}
          disabled={!registeredComplete}
          label='เหมือนที่อยู่ตามทะเบียนบ้าน'
          border
          showCircleIcon={false}
          showIcon={false}
          className='shrink-0'
          style={{ width: 'fit-content', alignSelf: 'flex-start' }}
        />
        <AddressBlock
          data={contactAddressDisplay}
          onChange={setAddr('addressContact')}
          disabled={form.useRegisteredForContact}
        />
      </SubCard>
    </div>
  );
};

/* ขั้นนี้เนื้อหาเป็นการ์ดย่อยสามใบอยู่แล้ว — บอก <FormShell> ว่าไม่ต้องมีการ์ด
   ขาวใหญ่ครอบอีกชั้น (มติผู้ใช้ 27 ส.ค. 69) */
Step2Address.rendersOwnCards = true;

/* ─────────────────────────────────────────────────────────────
   Step 3 — ข้อมูลการติดต่อ (Figma 2373:119047)
   ───────────────────────────────────────────────────────────── */

const RELATIONS = ['บิดา', 'มารดา', 'คู่สมรส', 'บุตร', 'พี่/น้อง', 'ปู่/ย่า/ตา/ยาย', 'ญาติ', 'เพื่อน', 'เพื่อนบ้าน', 'ผู้ดูแล', 'นายจ้าง', 'อื่นๆ'];

/** Figma 207:15747 — every required emergency-contact field filled. */
const isEmergencyContactComplete = (entry) =>
  String(entry?.name ?? '').trim() !== ''
  && String(entry?.last ?? '').trim() !== ''
  && String(entry?.relation ?? '').trim() !== ''
  && String(entry?.phone ?? '').trim() !== '';

/** Figma PHCIS-Registration 211:21962 — gate History List form Button until
   the current drug-allergy card has every required field (ชื่อยา / อาการ / ระดับ). */
const isDrugAllergyEntryComplete = (entry) =>
  String(entry?.name ?? '').trim() !== ''
  && String(entry?.symptom ?? '').trim() !== ''
  && String(entry?.severity ?? '').trim() !== '';

/** Empty card — delete skips confirm dialog (Figma 211:23046). */
const isDrugAllergyEntryEmpty = (entry) =>
  String(entry?.name ?? '').trim() === ''
  && String(entry?.symptom ?? '').trim() === ''
  && String(entry?.severity ?? '').trim() === '';

export const Step3Contact = ({ form, setForm }) => {
  const set = (k) => (v) => setForm((s) => ({ ...s, [k]: v }));

  const updateEmergency = (idx, key, value) => {
    setForm((s) => ({
      ...s,
      emergency: s.emergency.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    }));
  };
  const addEmergency = () => setForm((s) => ({
    ...s,
    emergency: [...s.emergency, { name: '', last: '', relation: 'บิดา', relationOther: '', phone: '', tag: '' }],
  }));
  const removeEmergency = (idx) => setForm((s) => ({
    ...s,
    emergency: s.emergency.filter((_, i) => i !== idx),
  }));

  const [emergencyDeleteIndex, setEmergencyDeleteIndex] = useState(null);

  const lastEmergency = form.emergency[form.emergency.length - 1];
  const canAddEmergency = isEmergencyContactComplete(lastEmergency);

  const confirmRemoveEmergency = () => {
    if (emergencyDeleteIndex == null) return;
    removeEmergency(emergencyDeleteIndex);
    setEmergencyDeleteIndex(null);
  };

  return (
    /* สองกลุ่มแยกเป็นการ์ดคนละใบ หัวการ์ดเขียวมีไอคอนนำหน้า ทรงเดียวกับขั้น
       "ที่อยู่" (มติผู้ใช้ 27 ส.ค. 69) */
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SubCard titleTone='brand' titleIcon='call' title='ข้อมูลการติดต่อ'>
        <FieldGrid cols={4} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
          <Field label='โทรศัพท์มือถือ' required>
            <InputField value={form.phone} onChange={set('phone')} placeholder='081-234-5678' />
          </Field>
          <Field label='เบอร์สำรอง'>
            <InputField value={form.altPhone} onChange={set('altPhone')} placeholder='081-234-9078' />
          </Field>
          <Field label='อีเมล'>
            <InputField value={form.email} onChange={set('email')} placeholder='somchai.m@email.com' leadingIcon='mail' />
          </Field>
        </FieldGrid>
      </SubCard>

      <SubCard titleTone='brand' titleIcon='emergency' title='ผู้ติดต่อฉุกเฉิน'>
        {form.emergency.map((e, idx) => (
          <SubCard
            key={idx}
            surfaceTone='neutral'
            title={`คนที่ ${idx + 1}`}
            pillLabel={e.tag || (idx === 0 ? 'ประกันสังคม' : null)}
            onDelete={form.emergency.length > 1 ? () => setEmergencyDeleteIndex(idx) : null}
          >
            <FieldGrid cols={4} rowGap={STEP1_FIELD_GAP} columnGap={STEP1_FIELD_GAP}>
              <Field label='ชื่อผู้ติดต่อ' required>
                <InputField value={e.name} onChange={(v) => updateEmergency(idx, 'name', v)} placeholder='ชื่อผู้ติดต่อ' />
              </Field>
              <Field label='นามสกุลผู้ติดต่อ' required>
                <InputField value={e.last} onChange={(v) => updateEmergency(idx, 'last', v)} placeholder='ชื่อผู้ติดต่อ' />
              </Field>
              <Field label='ความสัมพันธ์' required>
                {/* เลือก "อื่นๆ" แล้วต้องระบุ ไม่งั้นผู้ติดต่อฉุกเฉินจะไม่รู้ว่า
                    เกี่ยวข้องกันยังไง (มติผู้ใช้ 27 ส.ค. 69) */}
                <SelectWithOther
                  value={e.relation}
                  onChange={(v) => updateEmergency(idx, 'relation', v)}
                  otherValue={e.relationOther}
                  onOtherChange={(v) => updateEmergency(idx, 'relationOther', v)}
                  options={RELATIONS}
                  placeholder='ความสัมพันธ์'
                  otherPlaceholder='ระบุความสัมพันธ์'
                  otherLabel='ระบุความสัมพันธ์'
                />
              </Field>
              <Field label='โทรศัพท์' required>
                <InputField value={e.phone} onChange={(v) => updateEmergency(idx, 'phone', v)} placeholder='โทรศัพท์' />
              </Field>
            </FieldGrid>
          </SubCard>
        ))}
        <div className='w-full'>
          <BrandDashedAddButton
            type='button'
            disabled={!canAddEmergency}
            disabledAppearance='brandFade'
            onClick={addEmergency}
          >
            เพิ่มผู้ติดต่อฉุกเฉิน
          </BrandDashedAddButton>
        </div>
      </SubCard>

      <DeleteEmergencyContactConfirmPopup
        open={emergencyDeleteIndex !== null}
        onClose={() => setEmergencyDeleteIndex(null)}
        onConfirm={confirmRemoveEmergency}
      />
    </div>
  );
};

Step3Contact.rendersOwnCards = true;

/* ─────────────────────────────────────────────────────────────
   Step 4 — สิทธิการรักษา (Figma 214:21954 · 1:4150 lookup · 1:4153 group card)
   ───────────────────────────────────────────────────────────── */

const RIGHTS_LOOKUP_PANEL_STYLE = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-600)',
  borderRadius: 'var(--dim-radius-500)',
  background: 'var(--surface-positive-quaternary, #F4FBFA)',
  width: 'fit-content',
  boxSizing: 'border-box',
  marginTop: 'var(--dim-space-1200)',
};

/* การ์ดกลุ่มสิทธิ — ขาวแยกใบเหมือนการ์ดอื่นในฟอร์ม (มติผู้ใช้ 27 ส.ค. 69) */
const RIGHTS_GROUP_SHELL = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--dim-space-300)',
  padding: 'var(--dim-space-600)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  width: '100%',
  boxSizing: 'border-box',
};

/* ปุ่มแนบไฟล์รูปสี่เหลี่ยมข้าง ๆ ช่องอัปโหลด (ถ่ายรูป · สแกน) — เส้นประเหมือน
   DragAndDrop และเข้มขึ้นตอนเอาเมาส์ชี้ ปุ่มที่ไม่ตอบสนองการชี้อ่านเหมือนป้าย */
const RightsAttachTile = ({ icon, label, onClick, htmlFor }) => {
  const [hovered, setHovered] = useState(false);
  const style = {
    ...RIGHTS_PHOTO_CAPTURE_TILE,
    background: hovered
      ? 'var(--surface-formbuilder-hover, var(--surface-brandPrimary-tertiary))'
      : RIGHTS_PHOTO_CAPTURE_TILE.background,
    borderColor: hovered
      ? 'var(--border-brandPrimary-default, #007549)'
      : undefined,
  };
  const bind = {
    style,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
  const body = (
    <>
      <Sym name={icon} size={20} color='currentColor' />
      {label}
    </>
  );
  return htmlFor
    ? <label htmlFor={htmlFor} className='inline-flex cursor-pointer' {...bind}>{body}</label>
    : <button type='button' onClick={onClick} {...bind}>{body}</button>;
};

/* Figma 1:4153 — inner white card sections inside RightsGroupCard. */
const RIGHTS_INNER_CARD = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-card-100)',
  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
  gap: 'var(--dim-space-300)',
  boxSizing: 'border-box',
};

/* Figma Photo (216:23779) — 128×128 dashed capture tile in รูปภาพประกอบ. */
const RIGHTS_PHOTO_CAPTURE_TILE = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--dim-space-200)',
  width: 128,
  alignSelf: 'stretch',
  flexShrink: 0,
  padding: 'var(--dim-space-600)',
  borderRadius: 'var(--dim-radius-200)',
  background: 'var(--surface-formbuilder-default, var(--surface-brandPrimary-quaternary))',
  border: 'var(--dim-stroke-150) dashed var(--border-formbuilder-default, var(--border-brandPrimaryButton-tertiary))',
  color: 'var(--text-formbuilder-text, var(--text-brandPrimaryButton-default))',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
  textAlign: 'center',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const RightsLookupPanel = ({ form, setForm, onVerified }) => {
  const nationalIdDigits = String(form.nationalId ?? '').replace(/\D/g, '');
  const canVerify = nationalIdDigits.length === 13;

  const handleVerify = () => {
    if (!canVerify) return;
    setForm((s) => ({
      ...s,
      rightsLookupDone: true,
      rightsGroups: buildMockRightsGroups(),
    }));
    onVerified?.();
  };

  return (
    <div style={RIGHTS_LOOKUP_PANEL_STYLE}>
      <div
        className='shrink-0 flex items-center justify-center'
        style={{ width: 160, height: 128 }}
      >
        <LottieIllustration animationData={healthInsuranceAnim} size={160} />
      </div>
      <div className='flex flex-col shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
          <span style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}>
            กรอกเลขบัตรประชาชน
          </span>
          <span style={{
            color: 'var(--text-content-quaternary)',
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-medium)',
            fontSize: 'var(--type-size-sm)',
            lineHeight: 1.5,
          }}>
            เพื่อตรวจสอบสิทธิ์การรักษาพยาบาล
          </span>
        </div>
        <div className='flex items-center' style={{ gap: 'var(--dim-space-400)' }}>
          <div style={{ width: 320, maxWidth: 640, minWidth: 128, flexShrink: 0 }}>
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              placeholder='กรอกเลขบัตรประชาชน'
              value={form.nationalId}
              onChange={(v) => setForm((s) => ({
                ...s,
                nationalId: formatNationalId(v),
              }))}
              inputMode='numeric'
              maxLength={17}
              inputStyle={{ textAlign: 'center' }}
            />
          </div>
          <BrandButton
            leadingIcon='search'
            disabled={!canVerify}
            onClick={handleVerify}
          >
            ตรวจสอบสิทธิ์อีกครั้ง
          </BrandButton>
        </div>
      </div>
    </div>
  );
};

const reorderList = (list, fromIndex, toIndex) => {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const formatRightsFileSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const filesToRightsDocuments = (files) => {
  const stamp = Date.now();
  return Array.from(files).map((file, index) => ({
    id: `rights-doc-${stamp}-${index}`,
    name: file.name,
    sizeLabel: formatRightsFileSize(file.size),
  }));
};

const filesToRightsPhotos = (files) => {
  const stamp = Date.now();
  return Array.from(files).map((file, index) => ({
    id: `rights-photo-${stamp}-${index}`,
    name: file.name,
    sizeLabel: formatRightsFileSize(file.size),
    previewUrl: URL.createObjectURL(file),
  }));
};

const dataUrlToRightsPhoto = (dataUrl, name) => ({
  id: `rights-photo-${Date.now()}`,
  name,
  sizeLabel: formatRightsFileSize(Math.round((dataUrl.length * 3) / 4)),
  previewUrl: dataUrl,
});

const revokeRightsPhotoPreview = (photo) => {
  if (photo?.previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(photo.previewUrl);
  }
};

const RightsUploadedDocChip = ({ name, sizeLabel, onRemove }) => (
  <div
    className='inline-flex items-center shrink-0'
    style={{
      gap: 'var(--dim-space-300)',
      flex: '1 1 0',
      minHeight: 80,
      maxWidth: 320,
      minWidth: 160,
      padding: 'var(--dim-space-400)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      boxShadow: 'var(--shadow-formbuilder, 0 1px 4px rgba(100, 116, 139, 0.1))',
      boxSizing: 'border-box',
    }}
  >
    <span
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-brandPrimary-quaternary)',
        fontSize: 18,
      }}
      aria-hidden
    >
      📄
    </span>
    <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-50)' }}>
      <span style={{
        color: 'var(--text-content-default)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-sm)',
        lineHeight: 1.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {name}
      </span>
      <span style={{
        color: 'var(--text-formbuilder-subtext, var(--text-content-tertiary))',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}>
        {sizeLabel}
      </span>
    </div>
    <button
      type='button'
      onClick={onRemove}
      className='inline-flex items-center justify-center shrink-0'
      style={{
        width: 32,
        height: 32,
        borderRadius: 'var(--dim-radius-200)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-content-tertiary)',
      }}
      aria-label='ลบไฟล์'
    >
      <Sym name='close' size={16} color='currentColor' />
    </button>
  </div>
);

/* Figma 216:28622 — uploaded photo thumb in รูปภาพประกอบ (128×128). */
const RightsPhotoThumb = ({ previewUrl, name, onRemove }) => (
  <div
    className='relative inline-flex shrink-0 items-center justify-center overflow-hidden'
    style={{
      width: 128,
      height: 128,
      padding: 'var(--dim-space-600)',
      borderRadius: 'var(--dim-radius-200)',
      background: 'var(--surface-formbuilder-default-on, var(--surface-card-100))',
      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
      boxShadow: 'var(--shadow-formbuilder, 0 1px 4px rgba(100, 116, 139, 0.1))',
      boxSizing: 'border-box',
    }}
  >
    <img
      src={previewUrl}
      alt={name}
      className='max-w-full max-h-full object-contain'
      style={{ borderRadius: 'var(--dim-radius-400)' }}
    />
    <button
      type='button'
      onClick={onRemove}
      className='absolute top-1 right-1 inline-flex items-center justify-center'
      style={{
        width: 28,
        height: 28,
        borderRadius: 'var(--dim-radius-200)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        cursor: 'pointer',
        color: 'var(--text-content-tertiary)',
      }}
      aria-label='ลบรูปภาพ'
    >
      <Sym name='close' size={14} color='currentColor' />
    </button>
  </div>
);

/* รายละเอียดสิทธิแต่ละรายการ — ทรงเดียวกับหน้าตรวจสอบสิทธิของตู้ Kiosk
   (`08-EntitlementDetailsSelf`): ติ๊กถูก + ชื่อสิทธิ + แถบ "ใช้สิทธิในฐานะ"
   (มติผู้ใช้ 27 ส.ค. 69) ตู้กับเคาน์เตอร์ต้องบอกเรื่องเดียวกันกับผู้รับบริการ */
/* ชื่อสิทธิกับแถบ "ใช้สิทธิในฐานะ" อยู่แถวเดียวกัน (มติผู้ใช้ 27 ส.ค. 69) —
   เป็นข้อมูลของสิทธิใบเดียวกัน วางคนละบรรทัดแล้วอ่านเหมือนคนละเรื่อง และกิน
   ความสูงเป็นสองเท่าเมื่อมีหลายสิทธิ · flex-wrap ไว้ให้จอแคบตกบรรทัดเองแทน
   ที่จะบีบข้อความ */
const RightsEntitlementDetails = ({ items = [], onReorder }) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const finishDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDrop = (toIndex) => {
    if (dragIndex == null || dragIndex === toIndex) {
      finishDrag();
      return;
    }
    onReorder?.(reorderList(items, dragIndex, toIndex));
    finishDrag();
  };

  if (!items.length) return null;
  const draggable = typeof onReorder === 'function' && items.length > 1;
  return (
    /* คั่นแต่ละสิทธิด้วยเส้นบาง ๆ แทนช่องว่าง — ลำดับอ่านง่ายขึ้นเวลาลากสลับ */
    <div className='flex flex-col w-full'>
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={draggable}
          onDragStart={draggable ? (e) => {
            setDragIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          } : undefined}
          onDragEnd={draggable ? finishDrag : undefined}
          onDragOver={draggable ? (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setOverIndex(index);
          } : undefined}
          onDrop={draggable ? (e) => {
            e.preventDefault();
            handleDrop(index);
          } : undefined}
          className='flex items-center w-full flex-wrap'
          style={{
            gap: 'var(--dim-space-200) var(--dim-space-300)',
            padding: 'var(--dim-space-300) var(--dim-space-200)',
            borderRadius: 'var(--dim-radius-200)',
            borderTop: index === 0
              ? undefined
              : 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
            cursor: draggable ? (dragIndex === index ? 'grabbing' : 'grab') : undefined,
            opacity: dragIndex === index ? 0.45 : 1,
            boxShadow: overIndex === index && dragIndex !== index
              ? '0 0 0 var(--dim-stroke-200) var(--border-brandPrimary-default, #007549)'
              : undefined,
            transition: 'opacity 120ms ease, box-shadow 120ms ease',
          }}
        >
          <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
            {draggable && (
              <Sym name='drag_indicator' size={20} color='var(--brand-p500)' />
            )}
            <Sym name='check_circle' size={18} color='var(--icon-positive-success, var(--text-brandPrimary-default))' />
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}>
              {item.label}
            </span>
          </div>
          <div
            className='flex items-center shrink-0'
            style={{
              gap: 'var(--dim-space-200)',
              marginLeft: 'auto',
              padding: 'var(--dim-space-200) var(--dim-space-300)',
              borderRadius: 'var(--dim-radius-300, 10px)',
              background: 'var(--surface-brandPrimary-quaternary)',
            }}
          >
            <span style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}>
              ใช้สิทธิในฐานะ
            </span>
            <span style={{
              color: 'var(--text-content-default)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              lineHeight: 1.5,
            }}>
              {item.role || 'เจ้าของสิทธิ (ตนเอง)'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const RightsGroupCard = ({
  group,
  onRemoveDocument,
  onAddDocuments,
  onAddPhotos,
  onRemovePhoto,
  onReorderPriorityItems,
}) => {
  const priorityCount = group.priorityItems?.length ?? 0;
  const useNativeCapture = shouldUseNativeCameraInput();
  const {
    cameraInputId,
    cameraInputRef,
    cameraOpen,
    openTakePhoto,
    handleNativeInput,
    handlePopupCapture,
    closePopup,
  } = useTakePhotoCapture(({ file, dataUrl }) => {
    if (dataUrl) {
      onAddPhotos(group.id, [dataUrlToRightsPhoto(dataUrl, `ภาพถ่าย_${Date.now()}.jpg`)]);
      return;
    }
    if (file) onAddPhotos(group.id, [file]);
  });

  const handleUploadFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    onAddDocuments(group.id, files);
  };

  const photos = group.photos ?? [];
  const [scanOpen, setScanOpen] = useState(false);

  return (
    <div style={RIGHTS_GROUP_SHELL}>
      <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-50)' }}>
          <span style={{
            color: 'var(--text-topic-secondary-title, var(--text-brandPrimary-default))',
            fontFamily: 'var(--type-family-heading-content)',
            fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
            fontSize: 'var(--type-size-base)',
            lineHeight: 1.5,
          }}>
            {group.title}
          </span>
          <span style={{
            color: 'var(--text-topic-tertiary-subtext, var(--text-content-quaternary))',
            fontFamily: 'var(--type-family-body)',
            fontWeight: 'var(--type-weight-medium)',
            fontSize: 'var(--type-size-xs)',
            lineHeight: 1.5,
          }}>
            เลือกลำดับความต้องการใช้สิทธิ เพียงลากแล้ววาง โดยระบบจะตัดสิทธิ์จากลำดับแรกก่อน
          </span>
        </div>
        <ColorfulBadge style='green' size='small' width='hug'>
          {`${priorityCount} สิทธิ`}
        </ColorfulBadge>
      </div>

      {/* รายละเอียดสิทธิแบบเดียวกับตู้ Kiosk */}
      <div style={RIGHTS_INNER_CARD}>
        <RightsEntitlementDetails
          items={group.priorityItems}
          onReorder={(nextItems) => onReorderPriorityItems(group.id, nextItems)}
        />
      </div>

      {/* กล่องเดียวจบ (มติผู้ใช้ 27 ส.ค. 69) — เอกสารกับรูปภาพเป็นสิ่งแนบของเรื่อง
          เดียวกัน แยกสองกล่องทำให้ต้องตัดสินใจก่อนว่าไฟล์ที่ถืออยู่นับเป็นอะไร
          Figma 214:29504 (เอกสารประกอบ) + 216:28535 (รูปภาพประกอบ) รวมเป็นแถวเดียว */}
      <div style={RIGHTS_INNER_CARD}>
        <span style={{
          color: 'var(--text-topic-tertiary-title, var(--text-content-default))',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-sm)',
          lineHeight: 1.5,
        }}>
          เอกสารประกอบ
        </span>
        {(group.documents?.length || photos.length) ? (
          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {(group.documents ?? []).map((doc) => (
              <RightsUploadedDocChip
                key={doc.id}
                name={doc.name}
                sizeLabel={doc.sizeLabel}
                onRemove={() => onRemoveDocument(group.id, doc.id)}
              />
            ))}
            {photos.map((photo) => (
              <RightsPhotoThumb
                key={photo.id}
                previewUrl={photo.previewUrl}
                name={photo.name}
                onRemove={() => onRemovePhoto(group.id, photo.id)}
              />
            ))}
          </div>
        ) : null}
        {/* ช่องอัปโหลดกับปุ่มถ่ายรูปอยู่แถวเดียวกัน — เป็นสองทางของการแนบสิ่งเดียวกัน
            ปุ่มถ่ายรูปยืดสูงเท่าช่องอัปโหลดแทนสี่เหลี่ยม 128×128 ตายตัว */}
        <div className='flex items-stretch w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex-1 min-w-0'>
            <DragAndDrop
              size='sm'
              value={[]}
              onChange={handleUploadFiles}
              accept='image/*,.pdf'
            />
          </div>
          {useNativeCapture ? (
            <>
              <RightsAttachTile icon='image' label='ถ่ายรูป' htmlFor={cameraInputId} />
              <input
                ref={cameraInputRef}
                id={cameraInputId}
                type='file'
                accept='image/*'
                capture='environment'
                className='sr-only'
                onChange={handleNativeInput}
              />
            </>
          ) : (
            <RightsAttachTile icon='image' label='ถ่ายรูป' onClick={openTakePhoto} />
          )}
          <RightsAttachTile icon='document_scanner' label='สแกน' onClick={() => setScanOpen(true)} />
        </div>
      </div>
      <CameraCapturePopup
        open={cameraOpen}
        onClose={closePopup}
        onCapture={handlePopupCapture}
      />
      <RightsDocumentScanPopup
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScanned={(entry) => onAddDocuments(group.id, [entry])}
      />
    </div>
  );
};

/* ก่อนตรวจสอบสิทธิ์ — การ์ดขาวใบเดียวรองแผงค้นหาไว้ ทรงเดียวกับการ์ด
   "ตรวจสอบสิทธิ์" ของสถานะหลังตรวจ และไม่มีหัวข้อ "สิทธิ์การรักษา" ซ้ำกับ
   ชื่อ step (มติผู้ใช้ 27 ส.ค. 69) */
const Step4RightsLookupEmpty = ({ form, setForm }) => (
  <SubCard>
    <div
      className='flex w-full items-center justify-center'
      style={{ minHeight: 400 }}
    >
      <RightsLookupPanel form={form} setForm={setForm} />
    </div>
  </SubCard>
);

const Step4RightsResults = ({ form, setForm }) => {
  const removeDocument = (groupId, docId) => {
    setForm((s) => ({
      ...s,
      rightsGroups: s.rightsGroups.map((g) => (
        g.id === groupId
          ? { ...g, documents: g.documents.filter((d) => d.id !== docId) }
          : g
      )),
    }));
  };

  const addDocuments = (groupId, filesOrEntries) => {
    const list = Array.isArray(filesOrEntries) ? filesOrEntries : Array.from(filesOrEntries || []);
    if (!list.length) return;
    /* ไฟล์ที่สแกนมาถูกแปลงเป็น entry เรียบร้อยแล้ว (มี sizeLabel) ต่างจาก File
       ที่ผู้ใช้ลากมาวางซึ่งยังต้องแปลงก่อน */
    const entries = list[0]?.sizeLabel != null ? list : filesToRightsDocuments(list);
    setForm((s) => ({
      ...s,
      rightsGroups: s.rightsGroups.map((g) => (
        g.id === groupId
          ? { ...g, documents: [...(g.documents || []), ...entries] }
          : g
      )),
    }));
  };

  const reorderPriorityItems = (groupId, priorityItems) => {
    setForm((s) => ({
      ...s,
      rightsGroups: s.rightsGroups.map((g) => (
        g.id === groupId ? { ...g, priorityItems } : g
      )),
    }));
  };

  const removePhoto = (groupId, photoId) => {
    setForm((s) => ({
      ...s,
      rightsGroups: s.rightsGroups.map((g) => {
        if (g.id !== groupId) return g;
        const target = (g.photos || []).find((p) => p.id === photoId);
        revokeRightsPhotoPreview(target);
        return {
          ...g,
          photos: (g.photos || []).filter((p) => p.id !== photoId),
        };
      }),
    }));
  };

  const addPhotos = (groupId, filesOrEntries) => {
    const list = Array.isArray(filesOrEntries) ? filesOrEntries : [];
    if (!list.length) return;
    const entries = list[0]?.previewUrl != null
      ? list
      : filesToRightsPhotos(list);
    setForm((s) => ({
      ...s,
      rightsGroups: s.rightsGroups.map((g) => (
        g.id === groupId
          ? { ...g, photos: [...(g.photos || []), ...entries] }
          : g
      )),
    }));
  };

  return (
    /* สามส่วนแยกการ์ดคนละใบ: การตรวจสอบสิทธิ์ · สิทธิที่ 1 · สิทธิที่ 2
       (มติผู้ใช้ 27 ส.ค. 69) และไม่มีหัวข้อ "สิทธิ์การรักษา" ซ้ำกับชื่อ step */
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      <SubCard>
        <div className='flex w-full justify-center'>
          <RightsLookupPanel form={form} setForm={setForm} />
        </div>
      </SubCard>
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        {form.rightsGroups.map((group) => (
          <RightsGroupCard
            key={group.id}
            group={group}
            onRemoveDocument={removeDocument}
            onAddDocuments={addDocuments}
            onAddPhotos={addPhotos}
            onRemovePhoto={removePhoto}
            onReorderPriorityItems={reorderPriorityItems}
          />
        ))}
      </div>
    </div>
  );
};

export const Step4Rights = ({ form, setForm }) => (
  form.rightsLookupDone
    ? <Step4RightsResults form={form} setForm={setForm} />
    : <Step4RightsLookupEmpty form={form} setForm={setForm} />
);

Step4Rights.rendersOwnCards = true;

/* ─────────────────────────────────────────────────────────────
   Step 5 — หมายเหตุและ Flag (Figma 2373:119049)
   ───────────────────────────────────────────────────────────── */

/* Figma PHCIS-Registration 134:26673 — mobility row uses RadioButton
   (2860:3497): 36px `surface/brandPrimary/quaternary` icon tile + label,
   neutral card chrome; selected → brand border + top shadow. */
const MobilityCircleIcon = ({ icon }) => (
  <span
    aria-hidden
    className='inline-flex items-center justify-center shrink-0'
    style={{
      width: 36,
      height: 36,
      borderRadius: 'var(--dim-radius-full)',
      background: 'var(--surface-brandPrimary-quaternary)',
      color: 'var(--text-brandPrimary-default)',
    }}
  >
    <Sym name={icon} size={20} color='currentColor' />
  </span>
);

const MOBILITY = [
  { key: 'walk',  label: 'เดิน',         icon: 'directions_walk'   },
  { key: 'wheel', label: 'นั่งรถเข็น',    icon: 'accessible'         },
  { key: 'gurney',label: 'เปลนอน',       icon: 'self_improvement'   },
  { key: 'other', label: 'อื่นๆ',         icon: 'more_horiz'         },
];

/* Figma PHCIS-Registration 134:29261 — group input below mobility radios. */
const MOBILITY_OTHER_PANEL = {
  width: '100%',
  padding: 'var(--dim-space-400)',
  borderRadius: 'var(--dim-radius-400)',
  background: 'var(--surface-brandPrimary-quaternary)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
};

/* Severity options — Figma 211:19873 renders each option as a colorful
   badge pill (น้อย=yellow, ปานกลาง=orange, มาก=red). Select consumes
   the `badge` slot and renders the pill as a prefix inside the trigger
   so the chosen severity reads as a tag, not plain text. */
const SEVERITY = [
  { value: 'low',    label: 'น้อย',    badge: { style: 'yellow', label: 'น้อย'    } },
  { value: 'medium', label: 'ปานกลาง', badge: { style: 'orange', label: 'ปานกลาง' } },
  { value: 'high',   label: 'มาก',     badge: { style: 'red',    label: 'มาก'     } },
];

/* Voice-textarea suggestions for "อาการแพ้" — stock Thai allergy
   reactions surfaced after 1+ chars typed, matching the project rule
   that every voice textarea ships with a suggestion popover. */
/* Figma PHCIS-Registration 1:4146 — Voice Textarea (2568:11454) for ชื่อยา;
   stock drug names surfaced after 1+ chars (Penicillin, NSAIDs, …). */
const ALLERGY_DRUG_NAME_SUGGESTIONS = [
  'Penicillin',
  'Amoxicillin',
  'Ampicillin',
  'NSAIDs',
  'Aspirin',
  'Ibuprofen',
  'Diclofenac',
  'Naproxen',
  'Codeine',
  'Morphine',
  'Sulfonamides',
  'Sulfamethoxazole',
  'Trimethoprim',
  'Cephalosporin',
  'Ciprofloxacin',
  'Metronidazole',
  'Vancomycin',
];

let __drugAllergyEntrySeq = 0;
const createDrugAllergyEntry = () => ({
  id: `reg-drug-allergy-${++__drugAllergyEntrySeq}`,
  name: '',
  symptom: '',
  severity: '',
});

let __foodAllergyEntrySeq = 0;
const createFoodAllergyEntry = () => ({
  id: `reg-food-allergy-${++__foodAllergyEntrySeq}`,
  name: '',
  symptom: '',
  severity: '',
});

let __chemicalAllergyEntrySeq = 0;
const createChemicalAllergyEntry = () => ({
  id: `reg-chemical-allergy-${++__chemicalAllergyEntrySeq}`,
  name: '',
  symptom: '',
  severity: '',
});

let __chronicConditionEntrySeq = 0;
const createChronicConditionEntry = () => ({
  id: `reg-chronic-condition-${++__chronicConditionEntrySeq}`,
  name: '',
  symptom: '',
  severity: '',
});

/* Food allergy "ชื่ออาหาร" — common Thai allergens surfaced after 1+
   chars typed. Same VoiceTextarea + suggestion pattern as the drug
   allergy name field. */
const ALLERGY_FOOD_NAME_SUGGESTIONS = [
  'กุ้ง',
  'ปลาทะเล',
  'หอย',
  'ปูทะเล',
  'ไข่',
  'นมวัว',
  'นมถั่วเหลือง',
  'ถั่วลิสง',
  'ถั่วเปลือกแข็ง (Tree nuts)',
  'ข้าวสาลี / กลูเตน',
  'งา',
  'เห็ด',
  'ผงชูรส (MSG)',
];

/* Chemical allergy "ชื่อสารเคมี" — common irritants / contact allergens
   surfaced after 1+ chars typed. */
const ALLERGY_CHEMICAL_NAME_SUGGESTIONS = [
  'น้ำยาฟอกขาว (Chlorine bleach)',
  'แอลกอฮอล์ฆ่าเชื้อ',
  'ฟอร์มาลดีไฮด์',
  'ลาเท็กซ์ (Latex)',
  'น้ำหอม / สารเติมกลิ่น',
  'สีผม / สารฟอกย้อม',
  'นิกเกิล',
  'ผงซักฟอก',
  'ครีมกันแดด',
  'ยาหม่อง / น้ำมันระเหย',
];

/* Chronic condition "ชื่อโรคประจำตัว" — common Thai chronic conditions. */
const CHRONIC_CONDITION_NAME_SUGGESTIONS = [
  'เบาหวาน',
  'ความดันโลหิตสูง',
  'ไขมันในเลือดสูง',
  'หอบหืด / Asthma',
  'โรคหัวใจ',
  'โรคไต',
  'ไทรอยด์',
  'ลมชัก / Epilepsy',
  'ไมเกรน',
  'มะเร็ง',
  'ตับอักเสบ',
  'ภูมิแพ้ตัวเอง (SLE)',
];

/* Chronic-condition "อาการ" suggestions — common day-to-day presentations
   so the receptionist can pick a prompt instead of describing from scratch. */
const CHRONIC_CONDITION_SYMPTOM_SUGGESTIONS = [
  'ทานยาควบคุมอาการต่อเนื่อง',
  'มีอาการกำเริบเมื่อหยุดยา',
  'น้ำตาลในเลือดสูง',
  'ความดันโลหิตขึ้นเป็นบางช่วง',
  'หายใจไม่สะดวก ต้องพ่นยา',
  'อ่อนเพลีย เหนื่อยง่าย',
  'ปวดหัวบ่อย',
  'นอนหลับยาก',
];

const ALLERGY_SYMPTOM_SUGGESTIONS = [
  'Anaphylaxis',
  'ผื่นลมพิษทั่วตัว',
  'หน้าบวม / หนังตาบวม',
  'หายใจไม่ออก / หลอดลมตีบ',
  'ผื่นแดงคัน',
  'คลื่นไส้ / อาเจียน',
  'ปวดท้อง / ท้องเสีย',
  'มึนหัว / หน้ามืด',
  'ความดันโลหิตต่ำ',
  'ปากบวม / ลิ้นบวม',
];

export const Step5Flags = ({ form, setForm }) => {
  const setMobility = (key) => setForm((s) => ({
    ...s,
    mobility: key,
    mobilityOther: key === 'other' ? s.mobilityOther : '',
  }));
  const setMobilityOther = (e) => setForm((s) => ({
    ...s,
    mobilityOther: e?.target?.value ?? '',
  }));
  const setFlag = (key, v) => setForm((s) => ({ ...s, flags: { ...s.flags, [key]: v } }));

  const updateAllergy = (idx, key, value) => {
    setForm((s) => ({
      ...s,
      drugAllergies: s.drugAllergies.map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  };
  const addAllergy = () => setForm((s) => ({
    ...s,
    drugAllergies: [...(s.drugAllergies ?? []), createDrugAllergyEntry()],
  }));

  const [allergyDeleteIndex, setAllergyDeleteIndex] = useState(null);
  const pendingAllergyDeleteRef = useRef(null);

  const confirmRemoveAllergy = () => {
    const idx = pendingAllergyDeleteRef.current;
    if (idx == null) return;
    setForm((s) => ({
      ...s,
      drugAllergies: (s.drugAllergies ?? []).filter((_, i) => i !== idx),
    }));
    pendingAllergyDeleteRef.current = null;
    setAllergyDeleteIndex(null);
  };

  const requestRemoveAllergy = (idx) => {
    const list = form.drugAllergies ?? [];
    const entry = list[idx];
    if (!entry) return;
    if (isDrugAllergyEntryEmpty(entry)) {
      setForm((s) => ({
        ...s,
        drugAllergies: (s.drugAllergies ?? []).filter((_, i) => i !== idx),
      }));
      return;
    }
    pendingAllergyDeleteRef.current = idx;
    setAllergyDeleteIndex(idx);
  };

  const drugAllergies = form.drugAllergies ?? [];
  const lastDrugAllergy = drugAllergies[drugAllergies.length - 1];
  const canAddDrugAllergy = isDrugAllergyEntryComplete(lastDrugAllergy);

  /* Food allergy — parallel state + handlers to drugAllergies. Same entry
     shape (`{ id, name, symptom, severity }`) so the empty/complete
     predicates can be re-used as-is. */
  const updateFoodAllergy = (idx, key, value) => {
    setForm((s) => ({
      ...s,
      foodAllergies: (s.foodAllergies ?? []).map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  };
  const addFoodAllergy = () => setForm((s) => ({
    ...s,
    foodAllergies: [...(s.foodAllergies ?? []), createFoodAllergyEntry()],
  }));

  const [foodAllergyDeleteIndex, setFoodAllergyDeleteIndex] = useState(null);
  const pendingFoodAllergyDeleteRef = useRef(null);

  const confirmRemoveFoodAllergy = () => {
    const idx = pendingFoodAllergyDeleteRef.current;
    if (idx == null) return;
    setForm((s) => ({
      ...s,
      foodAllergies: (s.foodAllergies ?? []).filter((_, i) => i !== idx),
    }));
    pendingFoodAllergyDeleteRef.current = null;
    setFoodAllergyDeleteIndex(null);
  };

  const requestRemoveFoodAllergy = (idx) => {
    const list = form.foodAllergies ?? [];
    const entry = list[idx];
    if (!entry) return;
    if (isDrugAllergyEntryEmpty(entry)) {
      setForm((s) => ({
        ...s,
        foodAllergies: (s.foodAllergies ?? []).filter((_, i) => i !== idx),
      }));
      return;
    }
    pendingFoodAllergyDeleteRef.current = idx;
    setFoodAllergyDeleteIndex(idx);
  };

  const foodAllergies = form.foodAllergies ?? [];
  const lastFoodAllergy = foodAllergies[foodAllergies.length - 1];
  const canAddFoodAllergy = isDrugAllergyEntryComplete(lastFoodAllergy);

  /* Chemical allergy — same shape + predicates as the drug list. */
  const updateChemicalAllergy = (idx, key, value) => {
    setForm((s) => ({
      ...s,
      chemicalAllergies: (s.chemicalAllergies ?? []).map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  };
  const addChemicalAllergy = () => setForm((s) => ({
    ...s,
    chemicalAllergies: [...(s.chemicalAllergies ?? []), createChemicalAllergyEntry()],
  }));

  const [chemicalAllergyDeleteIndex, setChemicalAllergyDeleteIndex] = useState(null);
  const pendingChemicalAllergyDeleteRef = useRef(null);

  const confirmRemoveChemicalAllergy = () => {
    const idx = pendingChemicalAllergyDeleteRef.current;
    if (idx == null) return;
    setForm((s) => ({
      ...s,
      chemicalAllergies: (s.chemicalAllergies ?? []).filter((_, i) => i !== idx),
    }));
    pendingChemicalAllergyDeleteRef.current = null;
    setChemicalAllergyDeleteIndex(null);
  };

  const requestRemoveChemicalAllergy = (idx) => {
    const list = form.chemicalAllergies ?? [];
    const entry = list[idx];
    if (!entry) return;
    if (isDrugAllergyEntryEmpty(entry)) {
      setForm((s) => ({
        ...s,
        chemicalAllergies: (s.chemicalAllergies ?? []).filter((_, i) => i !== idx),
      }));
      return;
    }
    pendingChemicalAllergyDeleteRef.current = idx;
    setChemicalAllergyDeleteIndex(idx);
  };

  const chemicalAllergies = form.chemicalAllergies ?? [];
  const lastChemicalAllergy = chemicalAllergies[chemicalAllergies.length - 1];
  const canAddChemicalAllergy = isDrugAllergyEntryComplete(lastChemicalAllergy);

  /* Chronic conditions — same shape + predicates as the allergy lists.
     `symptom` reads as "อาการ / รายละเอียด" in the UI. */
  const updateChronicCondition = (idx, key, value) => {
    setForm((s) => ({
      ...s,
      chronicConditions: (s.chronicConditions ?? []).map((a, i) => (i === idx ? { ...a, [key]: value } : a)),
    }));
  };
  const addChronicCondition = () => setForm((s) => ({
    ...s,
    chronicConditions: [...(s.chronicConditions ?? []), createChronicConditionEntry()],
  }));

  const [chronicConditionDeleteIndex, setChronicConditionDeleteIndex] = useState(null);
  const pendingChronicConditionDeleteRef = useRef(null);

  const confirmRemoveChronicCondition = () => {
    const idx = pendingChronicConditionDeleteRef.current;
    if (idx == null) return;
    setForm((s) => ({
      ...s,
      chronicConditions: (s.chronicConditions ?? []).filter((_, i) => i !== idx),
    }));
    pendingChronicConditionDeleteRef.current = null;
    setChronicConditionDeleteIndex(null);
  };

  const requestRemoveChronicCondition = (idx) => {
    const list = form.chronicConditions ?? [];
    const entry = list[idx];
    if (!entry) return;
    if (isDrugAllergyEntryEmpty(entry)) {
      setForm((s) => ({
        ...s,
        chronicConditions: (s.chronicConditions ?? []).filter((_, i) => i !== idx),
      }));
      return;
    }
    pendingChronicConditionDeleteRef.current = idx;
    setChronicConditionDeleteIndex(idx);
  };

  const chronicConditions = form.chronicConditions ?? [];
  const lastChronicCondition = chronicConditions[chronicConditions.length - 1];
  const canAddChronicCondition = isDrugAllergyEntryComplete(lastChronicCondition);

  return (
    /* สองกลุ่มแยกการ์ดคนละใบ (มติผู้ใช้ 27 ส.ค. 69) */
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* Figma PHCIS-Registration 210:21268 — mobility block */}
      <SubCard titleTone='brand' titleIcon='directions_walk' title='สภาพของผู้รับบริการ'>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div
            role='radiogroup'
            aria-label='สภาพการเคลื่อนไหว'
            className='flex flex-wrap'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            {MOBILITY.map((m) => (
              <RadioButton
                key={m.key}
                name='patient-mobility'
                value={m.key}
                checked={form.mobility === m.key}
                onChange={setMobility}
                title={m.label}
                circleIcon={m.key === 'other' ? undefined : <MobilityCircleIcon icon={m.icon} />}
                showCircleIcon={m.key !== 'other'}
                showRadio={false}
                showIcon={false}
                showBadgeTitle={false}
                showBadge={false}
                showDescription={false}
              />
            ))}
          </div>

          {form.mobility === 'other' && (
            <div className='flex flex-col w-full' style={MOBILITY_OTHER_PANEL}>
              <SuggestibleTextarea
                voice
                label='ระบุสภาพของผู้รับบริการ'
                required
                value={form.mobilityOther}
                onChange={(e) => setMobilityOther(e?.target ? e.target.value : e)}
                placeholder='ใช้ไม้เท้า / ใช้ walker'
                suggestions={MOBILITY_OTHER_SUGGESTIONS}
                minChars={1}
                height={160}
                minHeight={96}
                popoverAriaLabel='คำแนะนำสภาพการเคลื่อนไหว'
              />
            </div>
          )}
        </div>
      </SubCard>

      {/* Figma 210:21275 — topic + choices in one column, 24px (space/600) between rows */}
      <SubCard titleTone='brand' titleIcon='flag' title='หมายเหตุและ Flag'>
          <Checkbox checked={form.flags.vip} onChange={(v) => setFlag('vip', v)} label='VIP / ผู้ป่วยพิเศษ' />
          {/* Toggling "แพ้อาหาร" ON seeds the first food card so the
              receptionist sees input fields immediately, mirroring the
              "แพ้ยา" pattern below. Toggling OFF only flips the flag —
              typed entries stay so a wrong tick doesn't wipe data. */}
          <Checkbox
            checked={form.flags.allergyOther}
            onChange={(v) => setForm((s) => {
              const next = { ...s, flags: { ...s.flags, allergyOther: v } };
              if (v && (next.foodAllergies ?? []).length === 0) {
                next.foodAllergies = [createFoodAllergyEntry()];
              }
              return next;
            })}
            label='แพ้อาหาร'
          />

          {form.flags.allergyOther && (
            <>
              {foodAllergies.map((a, idx) => (
                <SubCard
                  key={a.id ?? `reg-food-allergy-fallback-${idx}`}
                  surfaceTone='brandQuaternary'
                  title={`อาหารตัวที่ ${idx + 1}`}
                  onDelete={
                    foodAllergies.length > 1
                      ? () => requestRemoveFoodAllergy(idx)
                      : null
                  }
                >
                  {/* ชื่อ + อาการ อยู่แถวเดียวกัน ห่าง 40px (มติผู้ใช้ 27 ส.ค. 69)
                      ⚠️ TOKEN DEBT — สเกล space ยังไม่มี 40px (มี 800=32 · 1200=48)
                      อ้าง `--dim-space-1000` ไว้ตามชื่อในสเกล ถ้าเพิ่ม token ที่ repo
                      `mih-design` แล้ว `npm run tokens:pull` ค่าจะมาแทน fallback เอง */}
                  <div
                    className='flex items-start w-full'
                    style={{ gap: 'var(--dim-space-1000, 40px)' }}
                  >
                    <Field label='ชื่ออาหาร' required style={{ flex: '1 1 0' }}>
                      <SuggestibleTextarea
                        voice
                        value={a.name}
                        onChange={(e) => updateFoodAllergy(idx, 'name', e?.target?.value ?? '')}
                        placeholder='เช่น กุ้ง, ปลาทะเล, นมวัว, ถั่วลิสง'
                        suggestions={ALLERGY_FOOD_NAME_SUGGESTIONS}
                        minChars={1}
                        height={160}
                        minHeight={96}
                        popoverAriaLabel='คำแนะนำชื่ออาหาร'
                      />
                    </Field>
                    <Field
                      label='อาการ'
                      required
                      hint='ระบุอาการแพ้ทุกครั้งที่เคยพบ เพื่อช่วยแพทย์ประเมินความเสี่ยง'
                      style={{ flex: '1 1 0' }}
                    >
                      <SuggestibleTextarea
                        voice
                        value={a.symptom}
                        onChange={(e) => updateFoodAllergy(idx, 'symptom', e?.target?.value ?? '')}
                        placeholder='อาการแพ้รุนแรง เช่น Anaphylaxis, ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก'
                        suggestions={ALLERGY_SYMPTOM_SUGGESTIONS}
                        minChars={1}
                        popoverAriaLabel='คำแนะนำอาการแพ้'
                      />
                    </Field>
                  </div>
                  <Field label='ระดับความรุนแรง' required>
                    <Select
                      value={a.severity}
                      onChange={(v) => updateFoodAllergy(idx, 'severity', v)}
                      options={SEVERITY}
                      placeholder='เลือกระดับความรุนแรง'
                    />
                  </Field>
                </SubCard>
              ))}
              <div className='w-full'>
                <BrandDashedAddButton
                  type='button'
                  disabled={!canAddFoodAllergy}
                  disabledAppearance='brandFade'
                  onClick={addFoodAllergy}
                >
                  เพิ่ม
                </BrandDashedAddButton>
              </div>
            </>
          )}
          {/* Toggling "แพ้ยา" ON also seeds the first drug card so the
              receptionist sees the input fields immediately (Figma
              211:19873). Toggling OFF only flips the flag — the typed
              data stays so the user doesn't lose work if they uncheck
              by accident. */}
          <Checkbox
            checked={form.flags.allergyDrug}
            onChange={(v) => setForm((s) => {
              const next = { ...s, flags: { ...s.flags, allergyDrug: v } };
              if (v && (next.drugAllergies ?? []).length === 0) {
                next.drugAllergies = [createDrugAllergyEntry()];
              }
              return next;
            })}
            label='แพ้ยา'
          />

          {form.flags.allergyDrug && (
            <>
              {drugAllergies.map((a, idx) => (
                /* Figma PHCIS-Registration 134:27582 — group input (2498:6269):
                   surface/brandPrimary/quaternary + border/brandPrimary/quaternary.
                   Delete when 2+ cards (same rule as Step 3 emergency contacts). */
                <SubCard
                  key={a.id ?? `reg-drug-allergy-fallback-${idx}`}
                  surfaceTone='brandQuaternary'
                  title={`ยาตัวที่ ${idx + 1}`}
                  onDelete={
                    drugAllergies.length > 1
                      ? () => requestRemoveAllergy(idx)
                      : null
                  }
                >
                  {/* Figma 1:4146 — Voice Textarea (2568:11454) + autocomplete. */}
                  {/* ชื่อ + อาการ อยู่แถวเดียวกัน ห่าง 40px (มติผู้ใช้ 27 ส.ค. 69)
                      ⚠️ TOKEN DEBT — สเกล space ยังไม่มี 40px (มี 800=32 · 1200=48)
                      อ้าง `--dim-space-1000` ไว้ตามชื่อในสเกล ถ้าเพิ่ม token ที่ repo
                      `mih-design` แล้ว `npm run tokens:pull` ค่าจะมาแทน fallback เอง */}
                  <div
                    className='flex items-start w-full'
                    style={{ gap: 'var(--dim-space-1000, 40px)' }}
                  >
                    <Field label='ชื่อยา' required style={{ flex: '1 1 0' }}>
                      <SuggestibleTextarea
                        voice
                        value={a.name}
                        onChange={(e) => updateAllergy(idx, 'name', e?.target?.value ?? '')}
                        placeholder='Penicillin'
                        suggestions={ALLERGY_DRUG_NAME_SUGGESTIONS}
                        minChars={1}
                        height={160}
                        minHeight={96}
                        popoverAriaLabel='คำแนะนำชื่อยา'
                      />
                    </Field>
                    {/* Figma 1:4146 — Voice Textarea (2568:11508) + suggestion popover. */}
                    <Field
                      label='อาการ'
                      required
                      hint='ระบุอาการแพ้ทุกครั้งที่เคยพบ เพื่อช่วยแพทย์ประเมินความเสี่ยง'
                      style={{ flex: '1 1 0' }}
                    >
                      <SuggestibleTextarea
                        voice
                        value={a.symptom}
                        onChange={(e) => updateAllergy(idx, 'symptom', e?.target?.value ?? '')}
                        placeholder='อาการแพ้รุนแรง เช่น Anaphylaxis, ผื่นลมพิษทั่วตัว, หน้าบวม, หายใจไม่ออก'
                        suggestions={ALLERGY_SYMPTOM_SUGGESTIONS}
                        minChars={1}
                        popoverAriaLabel='คำแนะนำอาการแพ้'
                      />
                    </Field>
                  </div>
                  <Field label='ระดับความรุนแรง' required>
                    <Select
                      value={a.severity}
                      onChange={(v) => updateAllergy(idx, 'severity', v)}
                      options={SEVERITY}
                      placeholder='เลือกระดับความรุนแรง'
                    />
                  </Field>
                </SubCard>
              ))}
              {/* Figma 211:21962 — History List form Button (BrandDashedAddButton);
                  same gating pattern as Step 3 emergency contacts. */}
              <div className='w-full'>
                <BrandDashedAddButton
                  type='button'
                  disabled={!canAddDrugAllergy}
                  disabledAppearance='brandFade'
                  onClick={addAllergy}
                >
                  เพิ่ม
                </BrandDashedAddButton>
              </div>
            </>
          )}

          {/* Toggling "แพ้สารเคมี" ON seeds the first chemical card so the
              receptionist sees the input fields immediately, same pattern
              as the drug + food allergy checkboxes above. */}
          <Checkbox
            checked={form.flags.skinReaction}
            onChange={(v) => setForm((s) => {
              const next = { ...s, flags: { ...s.flags, skinReaction: v } };
              if (v && (next.chemicalAllergies ?? []).length === 0) {
                next.chemicalAllergies = [createChemicalAllergyEntry()];
              }
              return next;
            })}
            label='แพ้สารเคมี'
          />

          {form.flags.skinReaction && (
            <>
              {chemicalAllergies.map((a, idx) => (
                <SubCard
                  key={a.id ?? `reg-chemical-allergy-fallback-${idx}`}
                  surfaceTone='brandQuaternary'
                  title={`สารเคมีตัวที่ ${idx + 1}`}
                  onDelete={
                    chemicalAllergies.length > 1
                      ? () => requestRemoveChemicalAllergy(idx)
                      : null
                  }
                >
                  {/* ชื่อ + อาการ อยู่แถวเดียวกัน ห่าง 40px (มติผู้ใช้ 27 ส.ค. 69)
                      ⚠️ TOKEN DEBT — สเกล space ยังไม่มี 40px (มี 800=32 · 1200=48)
                      อ้าง `--dim-space-1000` ไว้ตามชื่อในสเกล ถ้าเพิ่ม token ที่ repo
                      `mih-design` แล้ว `npm run tokens:pull` ค่าจะมาแทน fallback เอง */}
                  <div
                    className='flex items-start w-full'
                    style={{ gap: 'var(--dim-space-1000, 40px)' }}
                  >
                    <Field label='ชื่อสารเคมี' required style={{ flex: '1 1 0' }}>
                      <SuggestibleTextarea
                        voice
                        value={a.name}
                        onChange={(e) => updateChemicalAllergy(idx, 'name', e?.target?.value ?? '')}
                        placeholder='เช่น น้ำยาฟอกขาว, ลาเท็กซ์, นิกเกิล'
                        suggestions={ALLERGY_CHEMICAL_NAME_SUGGESTIONS}
                        minChars={1}
                        height={160}
                        minHeight={96}
                        popoverAriaLabel='คำแนะนำชื่อสารเคมี'
                      />
                    </Field>
                    <Field
                      label='อาการ'
                      required
                      hint='ระบุอาการแพ้ทุกครั้งที่เคยพบ เพื่อช่วยแพทย์ประเมินความเสี่ยง'
                      style={{ flex: '1 1 0' }}
                    >
                      <SuggestibleTextarea
                        voice
                        value={a.symptom}
                        onChange={(e) => updateChemicalAllergy(idx, 'symptom', e?.target?.value ?? '')}
                        placeholder='อาการแพ้รุนแรง เช่น ผื่นแดงคัน, ผื่นลมพิษ, ปวดแสบปวดร้อน'
                        suggestions={ALLERGY_SYMPTOM_SUGGESTIONS}
                        minChars={1}
                        popoverAriaLabel='คำแนะนำอาการแพ้สารเคมี'
                      />
                    </Field>
                  </div>
                  <Field label='ระดับความรุนแรง' required>
                    <Select
                      value={a.severity}
                      onChange={(v) => updateChemicalAllergy(idx, 'severity', v)}
                      options={SEVERITY}
                      placeholder='เลือกระดับความรุนแรง'
                    />
                  </Field>
                </SubCard>
              ))}
              <div className='w-full'>
                <BrandDashedAddButton
                  type='button'
                  disabled={!canAddChemicalAllergy}
                  disabledAppearance='brandFade'
                  onClick={addChemicalAllergy}
                >
                  เพิ่ม
                </BrandDashedAddButton>
              </div>
            </>
          )}

          {/* Toggling "โรคประจำตัว" ON seeds the first chronic card. */}
          <Checkbox
            checked={form.flags.chronic}
            onChange={(v) => setForm((s) => {
              const next = { ...s, flags: { ...s.flags, chronic: v } };
              if (v && (next.chronicConditions ?? []).length === 0) {
                next.chronicConditions = [createChronicConditionEntry()];
              }
              return next;
            })}
            label='โรคประจำตัว'
          />

          {form.flags.chronic && (
            <>
              {chronicConditions.map((a, idx) => (
                <SubCard
                  key={a.id ?? `reg-chronic-condition-fallback-${idx}`}
                  surfaceTone='brandQuaternary'
                  title={`โรคที่ ${idx + 1}`}
                  onDelete={
                    chronicConditions.length > 1
                      ? () => requestRemoveChronicCondition(idx)
                      : null
                  }
                >
                  <Field label='ชื่อโรค' required>
                    <SuggestibleTextarea
                      voice
                      value={a.name}
                      onChange={(e) => updateChronicCondition(idx, 'name', e?.target?.value ?? '')}
                      placeholder='เช่น เบาหวาน, ความดันโลหิตสูง, ไทรอยด์'
                      suggestions={CHRONIC_CONDITION_NAME_SUGGESTIONS}
                      minChars={1}
                      height={160}
                      minHeight={96}
                      popoverAriaLabel='คำแนะนำชื่อโรค'
                    />
                  </Field>
                  <Field
                    label='อาการ / รายละเอียด'
                    required
                    hint='ระบุอาการปัจจุบันและการรักษาที่ได้รับ เพื่อให้แพทย์ทราบบริบทผู้ป่วย'
                  >
                    <SuggestibleTextarea
                      voice
                      value={a.symptom}
                      onChange={(e) => updateChronicCondition(idx, 'symptom', e?.target?.value ?? '')}
                      placeholder='เช่น ทานยาควบคุมต่อเนื่อง, มีอาการกำเริบบางช่วง'
                      suggestions={CHRONIC_CONDITION_SYMPTOM_SUGGESTIONS}
                      minChars={1}
                      popoverAriaLabel='คำแนะนำอาการของโรคประจำตัว'
                    />
                  </Field>
                  <Field label='ระดับความรุนแรง' required>
                    <Select
                      value={a.severity}
                      onChange={(v) => updateChronicCondition(idx, 'severity', v)}
                      options={SEVERITY}
                      placeholder='เลือกระดับความรุนแรง'
                    />
                  </Field>
                </SubCard>
              ))}
              <div className='w-full'>
                <BrandDashedAddButton
                  type='button'
                  disabled={!canAddChronicCondition}
                  disabledAppearance='brandFade'
                  onClick={addChronicCondition}
                >
                  เพิ่ม
                </BrandDashedAddButton>
              </div>
            </>
          )}
          <Checkbox checked={form.flags.flagOther} onChange={(v) => setFlag('flagOther', v)} label='อื่นๆ' />
        {/* ปุ่มอยู่ชิดซ้าย ไม่ใช่กลางการ์ด (มติผู้ใช้ 27 ส.ค. 69) */}
        <div className='flex justify-start'>
          <AddRowButton>เพิ่ม Flag</AddRowButton>
        </div>
      </SubCard>

      <DeleteDrugAllergyConfirmPopup
        open={allergyDeleteIndex !== null}
        onClose={() => setAllergyDeleteIndex(null)}
        onConfirm={confirmRemoveAllergy}
      />
      {/* Same alert dialog reused with food-allergy copy. */}
      <DeleteDrugAllergyConfirmPopup
        open={foodAllergyDeleteIndex !== null}
        onClose={() => setFoodAllergyDeleteIndex(null)}
        onConfirm={confirmRemoveFoodAllergy}
        title='ยืนยันการลบอาหาร'
        message='คุณต้องการลบข้อมูลอาหารที่แพ้ของผู้ป่วย'
        confirmLabel='ลบข้อมูลอาหาร'
      />
      {/* Reused alert dialog — chemical-allergy copy. */}
      <DeleteDrugAllergyConfirmPopup
        open={chemicalAllergyDeleteIndex !== null}
        onClose={() => setChemicalAllergyDeleteIndex(null)}
        onConfirm={confirmRemoveChemicalAllergy}
        title='ยืนยันการลบสารเคมี'
        message='คุณต้องการลบข้อมูลสารเคมีที่แพ้ของผู้ป่วย'
        confirmLabel='ลบข้อมูลสารเคมี'
      />
      {/* Reused alert dialog — chronic-condition copy. */}
      <DeleteDrugAllergyConfirmPopup
        open={chronicConditionDeleteIndex !== null}
        onClose={() => setChronicConditionDeleteIndex(null)}
        onConfirm={confirmRemoveChronicCondition}
        title='ยืนยันการลบโรคประจำตัว'
        message='คุณต้องการลบข้อมูลโรคประจำตัวของผู้ป่วย'
        confirmLabel='ลบข้อมูลโรค'
      />
    </div>
  );
};

/* ขั้นนี้เนื้อหาเป็นการ์ดสองใบอยู่แล้ว — ไม่ต้องมีการ์ดใหญ่ครอบ */
Step5Flags.rendersOwnCards = true;
