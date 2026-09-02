import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CreateConsentRequestHeaderAction from '@/components/consent/CreateConsentRequestHeaderAction';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import {
  AncStep2Screening, AncStepExamDiagnosis,
  AncStep5Orders, AncStep7Card,
} from '@/pages/treat/anc/AncSteps';
import AncPregnancyProgress from '@/pages/treat/anc/AncPregnancyProgress';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  buildAncVisitForm, getAncCompletedSteps, getAncPatientByHn, calcBmi,
  calculateGestationalAge, summarizeLabRiskFindings, formatAncDate,
  ANC_ULTRASOUND_RESULT_FIELDS,
} from '@/data/ancVisits';
import Popup from '@/components/popup/Popup';
import Popover from '@/components/popup/Popover';
import Icon from '@/components/icons/Icon';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* AncFormPage — บันทึกการรักษา แผนกฝากครรภ์ (ANC), first-visit MVP.
   Mirrors TreatmentFormPage.jsx: owns one form-state object across all
   7 steps of the shared TreatmentFormShell, seeded from the ANC mock
   registry (`ancVisits.js`) when the patient already has one, or from
   an empty first-visit default otherwise. */

const breadcrumb = ['บันทึกการรักษา', 'คลินิกฝากครรภ์'];

/* Same 7-step scaffold as OPD's TREATMENT_STEPS (TreatmentFormShell.jsx),
   with step 7 relabeled — ANC issues an "ใบฝากครรภ์" (ANC card), not a
   medical certificate. */
const ANC_STEPS = [
  /* ขั้น "ประวัติการรักษา" ถูกถอดออกจากลำดับขั้น (มติผู้ใช้ 2 ก.ย. 69) —
     โค้ดของขั้นนี้ (`AncStep1History`) ยังอยู่ในไฟล์ AncSteps.jsx ครบ ใส่กลับได้
     ด้วยการเติมหัวข้อกลับเข้าอาเรย์นี้กับ STEP_RENDERERS */
  /* ไม่ใช่ "คัดกรอง" — จุดคัดกรองมีที่เดียวที่ `/opd/screening` step นี้เก็บเฉพาะ
     แบบประเมินของงานฝากครรภ์ (ST-5 · 2Q · ความเสี่ยงตั้งครรภ์ · GDM ·
     สัญญาณอันตราย · การสูบบุหรี่) */
  { title: 'แบบประเมิน', subtitle: 'Assessment' },
  /* ตรวจร่างกายกับวินิจฉัยรวมเป็นขั้นเดียว แบ่งซ้าย-ขวา (มติผู้ใช้ 2 ก.ย. 69) */
  { title: 'ตรวจร่างกายและวินิจฉัย', subtitle: 'Examination & Diagnosis' },
  /* นัดหมายรวมอยู่ใต้ตารางสั่งการรักษาแล้ว (มติผู้ใช้ 3 ก.ย. 69) */
  { title: 'สั่งการรักษา', subtitle: 'Treatment Order' },
  { title: 'ตรวจสอบ', subtitle: 'Review' },
];

const STEP_RENDERERS = [
  AncStep2Screening, AncStepExamDiagnosis,
  AncStep5Orders, AncStep7Card,
];

/* ลำดับขั้นที่เหลือเทียบกับลำดับเดิม 7 ขั้นของ `getAncCompletedSteps` —
   ใช้แปลง index ปัจจุบันกลับไปเป็นฐานเดิม และรวมธง "ตรวจร่างกาย"+"วินิจฉัย"
   เป็นธงเดียวของขั้นที่รวมกันแล้ว */
const STEP_BASE_INDEX = [1, 3, 4, 6];

/* แถบสัญญาณชีพใต้แถบขั้นตอน (มติผู้ใช้ 2 ก.ย. 69) — ข้อความล้วนเรียงแนวนอน
   ไม่ใช่การ์ด/ป้ายสี เพราะเป็นค่าอ้างอิงที่ต้องเห็นตลอดทุกขั้น ไม่ใช่สิ่งที่ต้อง
   ตัดสินใจตรงนี้ · ช่องกรอกจริงยังอยู่ที่ขั้น "ตรวจร่างกาย" ที่เดียว */
const VITAL_TEXT_FIELDS = [
  { key: 'bp',     label: 'ความดันโลหิต', unit: 'mmHg' },
  { key: 'hr',     label: 'ชีพจร',        unit: 'ครั้ง/นาที' },
  { key: 'rr',     label: 'การหายใจ',     unit: 'ครั้ง/นาที' },
  { key: 'temp',   label: 'อุณหภูมิ',     unit: '°C' },
  { key: 'weight', label: 'น้ำหนัก',      unit: 'กก.' },
  { key: 'height', label: 'ส่วนสูง',      unit: 'ซม.' },
];

const AncVitalsTextRow = ({ form, vitals = {}, prePregnancyWeight, children }) => {
  const bmi = calcBmi(prePregnancyWeight || vitals.weight, vitals.height);
  /* ป้าย G-P-A และอายุครรภ์ย้ายมาอยู่แถวเดียวกับสัญญาณชีพ ขนาดเล็ก
     (มติผู้ใช้ 2 ก.ย. 69) — เป็นตัวระบุครรภ์ที่ต้องเห็นคู่กับค่าที่วัดได้ */
  const ga = calculateGestationalAge(form?.lmp);
  /* ยังไม่ได้ลงทะเบียนฝากครรภ์ก็ยังไม่มี G-P-A — ซ่อนป้ายไปเลย ดีกว่าโชว์
     "G- P- A0" ที่อ่านแล้วเหมือนข้อมูลผิด (ตรวจด้วย headless Chrome 2 ก.ย. 69) */
  const registered = String(form?.gravida ?? '').trim() !== '';
  const gpaLabel = registered
    ? `G${form.gravida} P${form.para || 0} A${form.abortion || 0}`
    : null;
  const gaLabel = ga ? `GA ${ga.weeks}${ga.days ? `+${ga.days}` : ''} สัปดาห์` : null;
  const items = VITAL_TEXT_FIELDS
    .filter((f) => String(vitals[f.key] ?? '').trim() !== '')
    .map((f) => ({ label: f.label, value: `${vitals[f.key]} ${f.unit}` }));
  if (bmi != null) items.push({ label: 'BMI', value: String(bmi) });
  if (!items.length && !gaLabel && !gpaLabel) return null;

  return (
    <div
      className='flex items-center w-full flex-wrap'
      /* พื้นขาวต่อจากแถบขั้นตอน (มติผู้ใช้ 2 ก.ย. 69) — แถบนี้เป็นส่วนหัวของหน้า
         ไม่ใช่เนื้อหาที่ลอยอยู่บนพื้นเขียวของหน้าจอ · เส้นคั่นล่างบอกขอบเขต
         ก่อนถึงแถบอายุครรภ์ */
      style={{
        /* เลื่อนขึ้นแล้วยังเห็นค่าอยู่ — เกาะใต้แถบขั้นตอนพอดี (มติผู้ใช้ 2 ก.ย. 69)
           ตำแหน่งมาจาก `--mih-record-band-bottom` ที่เปลือกฟอร์มวัดความสูงจริง
           ของแถบขั้นตอนให้ (แถบย่อตอนเลื่อน ตัวเลขตายตัวจึงใช้ไม่ได้)
           z-index ต่ำกว่าแถบขั้นตอน (1090) หนึ่งชั้น */
        position: 'sticky',
        top: 'var(--mih-record-band-bottom, 0px)',
        zIndex: 1085,
        gap: 'var(--dim-space-400, 16px)',
        padding: 'var(--dim-space-300, 12px) var(--dim-space-600, 24px)',
        background: 'var(--surface-card-100, #FFFFFF)',
        /* เงาแบรนด์ใต้แถบแทนเส้นคั่น (มติผู้ใช้ 2 ก.ย. 69) — แถบนี้ลอยอยู่เหนือ
           เนื้อหาตอนเลื่อน เงาบอกชั้นได้ตรงกว่าเส้น 1px */
        boxShadow: 'var(--shadow-brand-drop-bottom-200)',
        fontFamily: 'var(--type-family-body)',
        /* เล็กกว่าเนื้อหาในขั้นหนึ่งระดับ (มติผู้ใช้ 2 ก.ย. 69) — เป็นค่าอ้างอิง
           ที่ติดอยู่บนหัวตลอด ไม่ควรแย่งน้ำหนักกับเนื้อหาของขั้น */
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}
    >
      {items.map((it, i) => (
        <span key={it.label} className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {i > 0 && (
            <span aria-hidden style={{ color: 'var(--text-content-quaternary, #ADB2B7)' }}>·</span>
          )}
          <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>{it.label}</span>
          <span style={{ color: 'var(--text-content-default, #363B3F)' }}>{it.value}</span>
        </span>
      ))}
      {/* ป้ายระบุครรภ์ย้ายไปอยู่ฝั่งขวา ติดกับเส้นอายุครรภ์ (มติผู้ใช้ 2 ก.ย. 69)
          — ซ้ายเป็นค่าที่วัดวันนี้ ขวาเป็นบริบทของครรภ์ */}
      <span
        className='flex items-center shrink-0'
        style={{ gap: 'var(--dim-space-200, 8px)', marginLeft: 'auto' }}
      >
        {gpaLabel && (
          <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>{gpaLabel}</ColorfulBadge>
        )}
        {gaLabel && (
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{gaLabel}</ColorfulBadge>
        )}
      </span>
      {children}
    </div>
  );
};

/* ปุ่ม "ผลตรวจชันสูตร" และ "ผลตรวจรังสี" อยู่หน้าปุ่มข้อมูลทางการแพทย์ (EMR)
   บนแถวแจ้งเตือนของการ์ดผู้ป่วย (มติผู้ใช้ 2 ก.ย. 69) — ทั้งคู่อ่านจากค่าที่
   บันทึกไว้ในวิสิตนี้ ไม่ได้สร้างชุดข้อมูลใหม่: ชันสูตรมาจาก `labResults`
   (ชุดเดียวกับที่ขั้นสั่งการรักษาบันทึก) ส่วนรังสีมาจากผล Ultrasound */
const AncResultPopups = ({ form, open, onClose }) => {
  const labRows = summarizeLabRiskFindings(form.labResults).map((r, i) => ({ ...r, id: `${r.label}-${i}` }));
  const imagingRows = ANC_ULTRASOUND_RESULT_FIELDS
    .filter((f) => String(form.ultrasoundResults?.[f.key] ?? '').trim() !== '')
    .map((f) => ({ id: f.key, label: f.label, value: form.ultrasoundResults[f.key] }));

  return (
    <>
      <Popup
        open={open === 'lab'}
        onClose={onClose}
        size='large'
        title='ผลตรวจชันสูตร'
        subtitle='ผลจากห้องปฏิบัติการที่บันทึกไว้ในการฝากครรภ์ครั้งนี้'
        primaryAction={{ label: 'ปิด', onClick: onClose }}
      >
        <div style={{ padding: 'var(--dim-space-600, 24px)' }}>
          <Table
            columns={[
              { key: 'label', label: 'รายการตรวจ', flex: true, minWidth: 200 },
              { key: 'value', label: 'ผลตรวจ' },
              {
                key: 'risk',
                label: 'การแปลผล',
                render: (r) => (
                  <ColorfulBadge style={r.risk ? 'red' : 'green'} size='small' hierarchy='secondary'>
                    {r.risk ? 'ผิดปกติ' : 'ปกติ'}
                  </ColorfulBadge>
                ),
              },
              { key: 'note', label: 'ข้อควรปฏิบัติ', flex: true, minWidth: 240, render: (r) => r.note || '-' },
            ]}
            rows={labRows}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีผลตรวจจากห้องปฏิบัติการในครรภ์นี้'
          />
        </div>
      </Popup>

      <Popup
        open={open === 'imaging'}
        onClose={onClose}
        size='large'
        title='ผลตรวจรังสี'
        subtitle={form.ultrasoundDone
          ? `ตรวจ Ultrasound แล้ว${form.ultrasoundDate ? ` เมื่อ ${formatAncDate(form.ultrasoundDate)}` : ''}${form.ultrasoundGaWeeks ? ` · อายุครรภ์ ${form.ultrasoundGaWeeks} สัปดาห์` : ''}`
          : 'ยังไม่ได้บันทึกว่าได้รับการตรวจ Ultrasound ในครรภ์นี้'}
        primaryAction={{ label: 'ปิด', onClick: onClose }}
      >
        <div style={{ padding: 'var(--dim-space-600, 24px)' }}>
          <Table
            columns={[
              { key: 'label', label: 'รายการ', flex: true, minWidth: 220 },
              { key: 'value', label: 'ผลตรวจ', flex: true, minWidth: 220 },
            ]}
            rows={imagingRows}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีผลตรวจทางรังสีในครรภ์นี้'
          />
        </div>
      </Popup>
    </>
  );
};

const AncFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const patient = useMemo(() => {
    const p = (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  const ancPatient = useMemo(() => (navState?.hn && getAncPatientByHn(navState.hn)) || null, [navState?.hn]);

  /* The HN every ANC record (registration + visit history) is keyed by.
     It MUST be the HN the queue navigated with, not `cardPatient.hn`:
     `getPatientByHN` falls back to DEFAULT_PATIENT for any HN missing from
     patientProfiles (67-00027 and 67-00029 are), which would silently file
     several different mothers' pregnancies under HN 67-00001 and show each
     of them the others' carried-forward history. `cardPatient` stays the
     source for DISPLAY only. */
  const ancHn = navState?.hn || cardPatient?.hn;

  /* One seed per mount — reading the registration saved by earlier visits. */
  const seed = useMemo(() => buildAncVisitForm(ancHn, ancPatient), [ancHn, ancPatient]);

  const [stepIndex, setStepIndex] = useState(0);
  const [resultPopup, setResultPopup] = useState(null);
  /* เมนู "ส่งตรวจ" บนหัวการ์ด — ทรงเดียวกับหน้าบันทึกการรักษา OPD
     (มติผู้ใช้ 2 ก.ย. 69) ทั้งสองรายการพาไปที่ขั้น "สั่งการรักษา" ซึ่งเป็นที่
     ของใบสั่งแล็บ/รังสีของวิสิตนี้ ไม่ได้สร้างเส้นทางสั่งตรวจใหม่ */
  const [sendExamOpen, setSendExamOpen] = useState(false);
  const sendExamAnchorRef = useRef(null);
  const ORDERS_STEP = 2;
  const CARD_STEP = 4;
  const goToStep = (idx) => {
    setSendExamOpen(false);
    setStepIndex(idx);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [form, setForm] = useState(() => seed.form);

  const ActiveStep = STEP_RENDERERS[stepIndex];

  /* `getAncCompletedSteps` ยังคืนธง 7 ตัวตามลำดับขั้นเดิม — แมปกลับให้ตรงกับ
     5 ขั้นที่เหลือ (ขั้นที่รวมกันจะติ๊กเมื่อครบทั้งสองฝั่ง) */
  const completedSteps = useMemo(() => {
    const base = getAncCompletedSteps(form, STEP_BASE_INDEX[stepIndex] ?? stepIndex);
    /* 4 ขั้น: แบบประเมิน · ตรวจร่างกาย+วินิจฉัย · สั่งการรักษา(+นัด) · ตรวจสอบ */
    return [base[1], base[2] && base[3], base[4] || base[5], base[6]];
  }, [form, stepIndex]);

  return (
    <ClinicFilterProvider>
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='treat' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        {/* ไม่มีแถบ SubHeader แล้ว (มติผู้ใช้ 2 ก.ย. 69) — หัวเรื่องซ้ำกับหัวการ์ด
            ผู้ป่วยที่อยู่ถัดลงมาบรรทัดเดียวกันเป๊ะ เหลือไว้ที่การ์ดที่เดียว
            ทรงเดียวกับหน้าบันทึกการรักษา OPD ที่ไม่มี SubHeader เช่นกัน
            (ปุ่ม "คำขอเข้าถึงข้อมูล" ย้ายไปอยู่แถวปุ่มบนการ์ดตั้งแต่ 1 ก.ย. 69) */}
        <PatientCard
          sticky
          showBack={false}
          patient={cardPatient}
          /* แพ้ยา/โรคประจำตัวชิดซ้ายติดกัน + ปุ่มดูทั้งหมดที่กางรายการเต็มลงมา
             และปุ่มผลตรวจสองใบอยู่หน้าปุ่ม EMR (มติผู้ใช้ 2 ก.ย. 69) */
          alertGroupsLeft
          alertExpandable
          /* แถวแพ้ยา/โรคประจำตัวต้องมีเสมอ แม้รายนี้ไม่มีข้อมูล (มติผู้ใช้ 3 ก.ย. 69) */
          forceAlertRow
          alertRowActions={(
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='biotech' onClick={() => setResultPopup('lab')}>
                ผลตรวจชันสูตร
              </BrandSubdueButton>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='radiology' onClick={() => setResultPopup('imaging')}>
                ผลตรวจรังสี
              </BrandSubdueButton>
            </>
          )}
          title={`บันทึกฝากครรภ์ — ตรวจครรภ์ครั้งที่ ${seed.visitNo}`}
          drugAllergies={patient.drugAllergies}
          chronicDiseases={patient.chronicDiseases}
          actions={
            <>
              {/* "คำขอเข้าถึงข้อมูล" มาก่อนปุ่มพิมพ์บัตร (มติผู้ใช้ 1 ก.ย. 69) */}
              <CreateConsentRequestHeaderAction />
              <span ref={sendExamAnchorRef} className='inline-flex'>
                <BrandSubdueButton
                  variant='outline'
                  leadingIcon='send'
                  trailingIcon='expand_more'
                  aria-haspopup='menu'
                  aria-expanded={sendExamOpen}
                  onClick={() => setSendExamOpen((v) => !v)}
                >
                  ส่งตรวจ
                </BrandSubdueButton>
              </span>
              <Popover
                open={sendExamOpen}
                onClose={() => setSendExamOpen(false)}
                anchorRef={sendExamAnchorRef}
                style={{ zIndex: 1600 }}
              >
                <div
                  role='menu'
                  className='flex flex-col'
                  style={{
                    minWidth: 'var(--dim-size-2050, 220px)',
                    background: 'var(--surface-card-100)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                    boxShadow: 'var(--shadow-drop-bottom-400)',
                    paddingTop: 'var(--dim-space-100)',
                    paddingBottom: 'var(--dim-space-100)',
                  }}
                >
                  {[
                    { key: 'lab', icon: 'biotech', label: 'ส่งตรวจแล็บ' },
                    { key: 'xray', icon: 'radiology', label: 'ส่งตรวจรังสี' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type='button'
                      role='menuitem'
                      onClick={() => goToStep(ORDERS_STEP)}
                      className='flex items-center w-full text-left'
                      style={{
                        gap: 'var(--dim-space-200)',
                        padding: 'var(--dim-space-200) var(--dim-space-400)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-content-default)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                      }}
                    >
                      <Icon name={item.icon} size={16} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </Popover>
              <BrandSubdueButton
                variant='outline'
                leadingIcon='medication'
                onClick={() => goToStep(ORDERS_STEP)}
              >
                พิมพ์ใบสั่งยา
              </BrandSubdueButton>
              <BrandSubdueButton
                variant='fill'
                leadingIcon='credit_card'
                onClick={() => goToStep(CARD_STEP)}
              >
                พิมพ์บัตรฝากครรภ์
              </BrandSubdueButton>
            </>
          }
        />
        <TreatmentFormShell
          /* ไม่มีคำว่า "ANC" ซ้ำเหนือแถบขั้นตอนแล้ว (มติผู้ใช้ 2 ก.ย. 69) — breadcrumb
             กับหัวการ์ดผู้ป่วยบอกอยู่แล้วว่าอยู่ที่บันทึกฝากครรภ์ครั้งที่เท่าไหร่ ·
             ยังส่ง `morphTitle` ไว้เพราะป๊อปอัปส่งต่อใช้เป็นชื่อต้นทาง (referFromDepartment) */
          morphTitle='ANC'
          hideMorphTitle
          /* แถบอายุครรภ์อยู่ใต้แถบขั้นตอน (มติผู้ใช้ 2 ก.ย. 69) — ลำดับการอ่านคือ
             "อยู่ขั้นไหน" ก่อน แล้วค่อยเป็นบริบทของครรภ์นี้ */
          belowBand={(
            <AncVitalsTextRow form={form} vitals={form.vitals} prePregnancyWeight={form.prePregnancyWeight}>
              {/* เส้นอายุครรภ์ย่อขนาดมาอยู่แถวเดียวกับสัญญาณชีพ (มติผู้ใช้ 2 ก.ย. 69) */}
              <AncPregnancyProgress compact form={form} cardPatient={cardPatient} ancHn={ancHn} visitNo={seed.visitNo} />
            </AncVitalsTextRow>
          )}
          /* CTA ขั้นสุดท้าย (มติผู้ใช้ 3 ก.ย. 69) */
          finishLabel='บันทึกและส่งต่อ'
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          completedSteps={completedSteps}
          steps={ANC_STEPS}
          /* ขั้น "ตรวจร่างกายและวินิจฉัย" เป็นสองการ์ดของตัวเอง — เปลือกจึงไม่ต้อง
             วางการ์ดขาวซ้อนอีกชั้น (index 1 ของ ANC_STEPS) */
          plainBodySteps={[1]}
          queuePath='/treat/anc/queue'
          step0FlushLeft={false}
        >
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            cardPatient={cardPatient}
            ancHn={ancHn}
            visitNo={seed.visitNo}
            isFollowUp={seed.isFollowUp}
            carriedFields={seed.carriedFields}
          />
        </TreatmentFormShell>
        <AncResultPopups form={form} open={resultPopup} onClose={() => setResultPopup(null)} />
        <Footer />
      </div>
    </div>
    </ClinicFilterProvider>
  );
};

export default AncFormPage;
