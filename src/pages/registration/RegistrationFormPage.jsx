import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import QueueSubMenu from '@/components/layout/QueueSubMenu';
import MissingFieldsPopup from './MissingFieldsPopup';
import StepReview from './StepReview';
import QueueCallActions from '@/components/queue/QueueCallActions';
import DeleteQueueConfirmPopup from '@/components/popup/DeleteQueueConfirmPopup';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import FormShell from '@/templates/FormShell';
import Alert from '@/components/alert/Alert';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import SuccessToast from '@/components/toast/SuccessToast';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  StepConsent, Step1Personal, Step2Address, Step3Contact, Step4Rights, Step5Flags,
  PatientStatusCard,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT, MR_PATIENTS } from '@/data/mrPatients';
import {
  applySmartCardRead,
  buildEmptyRegistrationForm,
  buildHnPreview,
  clearRegistrationDraft,
  getRegistrationCompletedSteps,
  getRegistrationMissingReport,
  REGISTRATION_STEP_NAMES,
  appendRegistrationAudit,
  REGISTRATION_AUDIT_USER,
  loadRegistrationDraft,
  saveRegistrationDraft,
} from '@/data/registrationForm';
import InternalReferPopup from '@/components/popup/InternalReferPopup';
import DuplicatePatientWarningPopup from './DuplicatePatientWarningPopup';
import PatientCardPrintPopup, { buildOpdCardFromForm } from './PatientCardPrintPopup';
import {
  buildRegistrationQueueSubMenuBuckets,
  REGISTRATION_QUEUE_ROWS,
  REGISTRATION_QUEUE_SUBMENU_LABELS,
} from '@/data/registrationQueue';

/* MIH RegistrationFormPage — Figma 292:104252 / 2373:119045..119049.
   Step 1 = แบบฟอร์มยินยอม; Step 2 = ข้อมูลส่วนตัว (รวม สถานะผู้รับบริการ).
   Queue row supplies HN for status badges; chip read prefills personal data.
   Draft persists in sessionStorage so consent fill navigation keeps progress.

   TOR §1.1 gap-closing hosted here (FormShell itself untouched):
   · 1.1.1.13 — บันทึก/ถัดไป ที่ข้อมูลไม่ครบ → PhcisTopToast error ระบุ
     field + step, พร้อม inline panel คลิก jump ไป step ที่ขาด
   · 1.1.1.5  — duplicate ชื่อ-สกุล → DuplicatePatientWarningPopup, การยืนยัน
     ถูก audit ({confirmedBy, timestamp, matchedHNs}); เลขบัตรซ้ำยัง hard-block
     ตาม 1.1.1.4 เดิม
   · 1.1.1.10 — หลังบันทึกสำเร็จเปิด PatientCardPrintPopup (OPD Card) ก่อน
     กลับหน้าคิว (legacy: บันทึก → พิมพ์ OPD Card)
   · ออกจากฟอร์มที่แก้ไขค้าง → UnsavedChangesPopup (history.block guard —
     FormShell เป็นเจ้าของปุ่ม จึงดักที่ history + click-capture แทน) */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ลงทะเบียนผู้รับบริการ'];

const STEP_RENDERERS = [
  StepConsent,
  Step1Personal,
  Step2Address,
  Step3Contact,
  Step4Rights,
  Step5Flags,
  /* ขั้นที่ 7 — ทวนข้อมูลทั้งหมดก่อนบันทึก (มติผู้ใช้ 27 ส.ค. 69) */
  StepReview,
];

/* ต้องตรงกับข้อความปุ่มขั้นสุดท้ายใน <FormShell> — โค้ดดักเจตนา "กดบันทึก"
   ด้วยการอ่าน textContent ของปุ่ม ถ้าเปลี่ยนที่ FormShell แล้วลืมแก้ตรงนี้
   การเตือน "ยังไม่ได้บันทึก" ตอนออกจากหน้าจะเงียบไปเฉย ๆ */
const SAVE_BUTTON_TEXT = 'บันทึกและส่งต่อ';
const LAST_STEP_INDEX = STEP_RENDERERS.length - 1;

const normName = (v) => String(v ?? '').trim();

/** TOR 1.1.1.5 — ชื่อ+นามสกุลไทยตรงกับทะเบียนเดิม (คนละเลขบัตร → เตือน;
   เลขบัตรตรงกันเป๊ะเป็นเคส hard-block 1.1.1.4 เดิม ไม่เข้าข่ายเตือนซ้ำ). */
const findDuplicateNameMatches = (form) => {
  const first = normName(form.firstNameTh);
  const last = normName(form.lastNameTh);
  if (!first || !last) return [];
  const typedCid = String(form.nationalId ?? '').replace(/\D/g, '');
  return MR_PATIENTS
    .filter((p) => normName(p.firstNameTh) === first && normName(p.lastNameTh) === last)
    .filter((p) => {
      const cid = String(p.nationalId ?? '').replace(/\D/g, '');
      return !typedCid || !cid || cid !== typedCid;
    })
    .map((p) => ({
      hn: p.hn,
      fullName: `${p.prefixTh || ''}${p.firstNameTh} ${p.lastNameTh}`,
      dob: p.dob || '—',
    }));
};

const RegistrationFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const patient = useMemo(() => {
    return (navState && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
  }, [navState]);

  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState(() => loadRegistrationDraft() || buildEmptyRegistrationForm());

  /* ── toasts ─────────────────────────────────────────────────────── */
  const [toastSession, setToastSession] = useState(null);
  const toastSeqRef = useRef(0);
  const showToast = (variant, message) =>
    setToastSession({ id: ++toastSeqRef.current, variant, message });
  const [successToast, setSuccessToast] = useState('');

  /* ── dirty tracking (for UnsavedChangesPopup) ───────────────────── */
  const dirtyRef = useRef(false);
  const mountedRef = useRef(false);
  useEffect(() => {
    saveRegistrationDraft(form);
    if (mountedRef.current) dirtyRef.current = true;
    else mountedRef.current = true;
  }, [form]);

  useEffect(() => {
    const id = navState?.consentCompletedId;
    if (!id) return;
    setForm((s) => {
      const prev = Array.isArray(s.consentCompletedIds) ? s.consentCompletedIds : [];
      if (prev.includes(id)) return s;
      return { ...s, consentCompletedIds: [...prev, id] };
    });
  }, [navState?.consentCompletedId]);

  const handleReadSmartCard = () => {
    setForm((prev) => applySmartCardRead(prev, patient));
    setStepIndex(1);
  };

  /* ── 1.1.1.13 — missing-field report + jump panel ───────────────── */
  const [missingReport, setMissingReport] = useState(null);

  /* ── 1.1.1.5 — duplicate-name popup state ───────────────────────── */
  const confirmedNamesRef = useRef([]);
  const [dupState, setDupState] = useState(null); /* { matches, onProceed } */
  const nameKey = () => `${normName(form.firstNameTh)}|${normName(form.lastNameTh)}`;
  const unconfirmedDuplicates = () => {
    if (confirmedNamesRef.current.includes(nameKey())) return [];
    return findDuplicateNameMatches(form);
  };

  const openDupPopup = (matches, onProceed) => setDupState({ matches, onProceed });

  const handleDupConfirm = () => {
    if (!dupState) return;
    const hns = dupState.matches.map((m) => m.hn);
    /* Audit — {confirmedBy, timestamp, matchedHNs} ลง RegistrationEditHistoryPanel */
    appendRegistrationAudit({
      step: 'เวชระเบียน',
      field: 'ยืนยันดำเนินการต่อแม้ชื่อ-สกุลซ้ำ',
      oldValue: `HN ที่ชน: ${hns.join(', ')}`,
      newValue: `ยืนยันโดย ${REGISTRATION_AUDIT_USER}`,
    });
    confirmedNamesRef.current = [...confirmedNamesRef.current, nameKey()];
    const proceed = dupState.onProceed;
    setDupState(null);
    proceed?.();
  };

  /* blur บนชื่อ-นามสกุล (Step1Personal ส่ง callback มาเรียก) */
  const handleNameBlurCheck = () => {
    if (dupState) return;
    const matches = unconfirmedDuplicates();
    if (matches.length) openDupPopup(matches, null);
  };

  /* ── step navigation — free jump; validation only on final submit ── */
  const handleStepChange = (next) => {
    if (next === stepIndex) return;
    setMissingReport(null);
    setStepIndex(next);
  };

  /* ── save flow (1.1.1.10 + 1.1.1.13) ────────────────────────────── */
  const [printCard, setPrintCard] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  /* After step-6 main CTA validates, open ส่งต่อภายใน before doSave. */
  const [referOpen, setReferOpen] = useState(false);
  const allowNavRef = useRef(false);
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const formRef = useRef(form);
  formRef.current = form;

  const doSave = (referPayload) => {
    const f = formRef.current;
    appendRegistrationAudit({
      step: 'เวชระเบียน',
      field: 'บันทึกทะเบียนผู้รับบริการ',
      oldValue: '—',
      newValue: `${f.prefixTh || ''}${f.firstNameTh || ''} ${f.lastNameTh || ''} · HN ${buildHnPreview(f)}`,
    });
    if (referPayload) {
      appendRegistrationAudit({
        step: 'เวชระเบียน',
        field: 'ส่งต่อภายใน',
        oldValue: '—',
        newValue: [
          referPayload.departmentLabel,
          referPayload.servicePointLabel,
          referPayload.note || null,
        ].filter(Boolean).join(' · '),
      });
    }
    clearRegistrationDraft();
    dirtyRef.current = false;
    setSuccessToast('บันทึกข้อมูลผู้รับบริการสำเร็จ');
    /* Legacy flow: บันทึก → พิมพ์ OPD Card (1.1.1.10) */
    setPrintCard(buildOpdCardFromForm(f, buildHnPreview(f)));
    setPrintOpen(true);
  };

  const openInternalRefer = () => setReferOpen(true);

  const handleSaveAttempt = () => {
    const report = getRegistrationMissingReport(formRef.current);
    if (report.length > 0) {
      /* ป๊อปอัปเดียวบอกว่าขาดอะไรบ้าง — เลิกใช้ toast + แผงในหน้า + แถวชิป
         สามชิ้นพร้อมกัน ซึ่งชิปยาวจนซ้อนทับกันอ่านไม่ออก (มติผู้ใช้ 27 ส.ค. 69) */
      setMissingReport(report);
      return;
    }
    const matches = unconfirmedDuplicates();
    if (matches.length) {
      openDupPopup(matches, openInternalRefer);
      return;
    }
    openInternalRefer();
  };

  const handleReferConfirm = (payload) => {
    setReferOpen(false);
    doSave(payload);
  };

  const handlePrintPopupClose = () => {
    setPrintOpen(false);
    allowNavRef.current = true;
    history.push('/registration/queue');
  };

  /* ── navigation guard — FormShell owns its buttons, so intent comes
     from a click-capture ref + history.block (React Router v5). ────── */
  const lastIntentRef = useRef(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const pendingLocationRef = useRef(null);

  const handleClickCapture = (e) => {
    const btn = e.target?.closest?.('button');
    if (!btn) return;
    const text = btn.textContent || '';
    lastIntentRef.current = text.includes(SAVE_BUTTON_TEXT) ? 'save' : null;
  };

  useEffect(() => {
    const unblock = history.block((location) => {
      if (allowNavRef.current) return undefined;
      const path = location?.pathname || '';
      /* Consent-fill hop keeps the draft — always allowed. */
      if (path.startsWith('/registration/consent/')) return undefined;
      const intent = lastIntentRef.current;
      lastIntentRef.current = null;
      if (intent === 'save' && stepIndexRef.current === LAST_STEP_INDEX) {
        handleSaveAttempt();
        return false;
      }
      if (dirtyRef.current) {
        pendingLocationRef.current = location;
        setUnsavedOpen(true);
        return false;
      }
      return undefined;
    });
    return unblock;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const leaveTo = (clearDraft) => {
    if (clearDraft) clearRegistrationDraft();
    else saveRegistrationDraft(formRef.current);
    setUnsavedOpen(false);
    allowNavRef.current = true;
    const loc = pendingLocationRef.current;
    history.push(loc ? `${loc.pathname}${loc.search || ''}` : '/registration/queue');
  };

  const ActiveStep = STEP_RENDERERS[stepIndex];
  const completedSteps = useMemo(() => getRegistrationCompletedSteps(form), [form]);

  /* QueueSubMenu buckets — same roster as RegistrationQueuePage so the
     side panel counts stay in sync with the full เวชระเบียน queue. */
  /* พักคิว / ยกเลิกคิว จากพาเนล — เก็บเป็น state ของหน้านี้ (roster กลางเป็น
     ค่าคงที่ ยังไม่มี store ที่เขียนได้) `paused` แค่สลับปุ่ม ส่วนยกเลิกเอาแถวออก */
  const [queuePaused, setQueuePaused] = useState({});
  /* เรียกคิวไปแล้วคนไหนบ้าง — ปุ่มขึ้นสถานะ "เรียกแล้ว" แต่ยังกดซ้ำได้ */
  const [queueCalled, setQueueCalled] = useState({});
  const [queueCancelled, setQueueCancelled] = useState({});
  /* ยกเลิกคิวต้องยืนยันก่อนเสมอ — ป๊อปอัปตัวเดียวกับตารางคิวเวชระเบียน
     (มติผู้ใช้ 27 ส.ค. 69) */
  const [queueCancelCandidate, setQueueCancelCandidate] = useState(null);

  const queueBuckets = useMemo(() => {
    /* หมวด "รอลงทะเบียน" แสดงครบทุกคิวของวันนั้น ไม่ตัดเหลือ 2 แถวแบบ preview
       (มติผู้ใช้ 27 ส.ค. 69) — พาเนลมี overflow-y อยู่แล้ว ลิสต์ยาวจึงเลื่อนได้
       หมวดอื่นยังเป็น preview ตามเดิมเผื่อหน้าอื่นเปิดใช้ */
    const raw = buildRegistrationQueueSubMenuBuckets(
      REGISTRATION_QUEUE_ROWS.filter((r) => !queueCancelled[r.id]),
      { waiting: Infinity },
    );
    const map = (rows) => rows.map((r) => ({
      id: r.id,
      hn: r.hn,
      name: r.name || r.queue || 'ผู้รับบริการใหม่',
      queue: r.queue,
      badge: r.vipBadge,
      /* รูปจากทะเบียนแถวเดียวกับตารางคิว — คนที่ยังไม่เคยมารับบริการไม่มีรูป
         ให้ตกไปเป็น silhouette "ผู้ใช้ใหม่" เหมือนในตาราง */
      avatarUrl: r.avatarUrl,
      newUser: r.neverServed || !r.name,
      deceased: r.lifeStatus === 'deceased',
      /* หมวด "กำลังลงทะเบียน" ต้องบอกว่าใครเป็นคนทำอยู่ — ไม่งั้นเจ้าหน้าที่
         อีกคนไม่รู้ว่าเคสนี้มีเจ้าของแล้ว แล้วไปหยิบซ้ำ (มติผู้ใช้ 29 ส.ค. 69) */
      sublabel: r.registeredBy ? `ลงทะเบียนโดย ${r.registeredBy}` : undefined,
    }));
    return {
      done:       { items: map(raw.done.items),       total: raw.done.total       },
      draft:      { items: map(raw.draft.items),      total: raw.draft.total      },
      inProgress: { items: map(raw.inProgress.items), total: raw.inProgress.total },
      waiting:    { items: map(raw.waiting.items),    total: raw.waiting.total    },
    };
  }, [queueCancelled]);

  const goToPatientRegister = (p) => {
    history.push({
      pathname: '/registration/register',
      state: { hn: p.hn || undefined, queue: p.queue },
    });
  };

  return (
    <ClinicFilterProvider>
    <div
      className='flex w-full min-h-screen'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
      onClickCapture={handleClickCapture}
    >
      <Sidebar activeKey='registration' />
      {/* QueueSubMenu — Figma "Sub Menu B" (same pattern as TreatmentFormPage).
          Lets staff glance at the rest of the MR queue without leaving the
          open registration form. "ดูทั้งหมด" jumps to /registration/queue. */}
      <DeleteQueueConfirmPopup
        open={!!queueCancelCandidate}
        onClose={() => setQueueCancelCandidate(null)}
        onConfirm={() => {
          setQueueCancelled((s2) => ({ ...s2, [queueCancelCandidate.id]: true }));
          setQueueCancelCandidate(null);
        }}
        title='ยืนยันการยกเลิกคิว'
        subtitle='คิวนี้จะถูกนำออกจากรายการ และไม่สามารถย้อนกลับได้'
        queue={queueCancelCandidate?.queue}
        hn={queueCancelCandidate?.hn || '—'}
        patientName={queueCancelCandidate?.name || '—'}
        avatarSrc={queueCancelCandidate?.avatarUrl}
      />
      <MissingFieldsPopup
        open={!!(missingReport && missingReport.length > 0)}
        onClose={() => setMissingReport(null)}
        report={missingReport || []}
        onJumpToStep={(idx) => { setStepIndex(idx); setMissingReport(null); }}
      />

      <QueueSubMenu
        queue={queueBuckets}
        sectionLabels={REGISTRATION_QUEUE_SUBMENU_LABELS}
        /* เห็นแค่คิวที่รอลงทะเบียน พร้อมเลขคิวและปุ่มจัดการคิว · ไม่มี "ดูทั้งหมด"
           แล้ว (มติผู้ใช้ 27 ส.ค. 69) */
        /* สองหมวด: คิวที่รอ + คิวที่กำลังทำอยู่ (มติผู้ใช้ 29 ส.ค. 69) — เดิมเห็น
           แต่คิวที่รอ เจ้าหน้าที่จึงไม่รู้ว่าใครกำลังถูกให้บริการอยู่ ทั้งที่เป็นคน
           ที่ต้องรู้ก่อนจะเรียกคิวถัดไป · คำเรียกหมวดมาจาก sectionLabels ของแต่ละ
           โมดูล (ลงทะเบียน / คัดกรอง / ตรวจ) จึงใช้คำที่ถูกของงานนั้น */
        sections={['inProgress', 'waiting']}
        showQueueNo
        /* แถวเรียบคั่นเส้นบางเหมือนตาราง worklist — ไม่ใช่การ์ด ไม่มีจุดสี
           ไม่มี chevron และทุกอย่างอยู่บรรทัดเดียว (มติผู้ใช้ 27 ส.ค. 69) */
        rowVariant='divider'
        onPickPatient={goToPatientRegister}
        renderRowActions={(p, section, rowIdx) => (
          <QueueCallActions
            /* หมวด "กำลังลงทะเบียน" → ปุ่มบอกสถานะจริงของงาน ส่วนหมวดที่รออยู่
               แถวแรกคือคิวที่กำลังถูกเรียก จึงขึ้น "เรียกแล้ว" ตั้งแต่แรก
               (มติผู้ใช้ 29 ส.ค. 69) */
            statusLabel={section === 'inProgress' ? 'กำลังลงทะเบียน' : undefined}
            called={!!queueCalled[p.id] || (section === 'waiting' && rowIdx === 0)}
            paused={!!queuePaused[p.id]}
            disabledReason={p.deceased ? 'ผู้รับบริการเสียชีวิต — เรียกคิวไม่ได้' : undefined}
            onCall={() => setQueueCalled((s2) => ({ ...s2, [p.id]: true }))}
            onPause={() => setQueuePaused((s2) => ({ ...s2, [p.id]: !s2[p.id] }))}
            onCancel={() => setQueueCancelCandidate(p)}
          />
        )}
      />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} standalone={false} />
        <FormShell
          stepIndex={stepIndex}
          onStepChange={handleStepChange}
          onReadSmartCard={handleReadSmartCard}
          smartCardRead={form.idCardFromChip}
          completedSteps={completedSteps}
          onSubmit={handleSaveAttempt}
          onSaveDraft={() => showToast('success', 'บันทึกร่างแล้ว')}
          /* เมนู "การนัดหมาย" บนแถบหัวผูกกับผู้รับบริการรายนี้ */
          patientHn={form.hn || patient?.hn || ''}
          /* step ที่เนื้อหาเป็นการ์ดอยู่แล้วประกาศ `rendersOwnCards` ไว้เอง */
          bodyCard={!ActiveStep?.rendersOwnCards}
          /* สถานะผู้รับบริการ = การ์ดขาวแยกใบเหนือการ์ดเนื้อหา เฉพาะขั้นตอน
             "ข้อมูลส่วนตัว" (มติผู้ใช้ 27 ส.ค. 69) */
          beforeCard={stepIndex === 1
            ? <PatientStatusCard form={form} setForm={setForm} patient={patient} />
            : null}
        >
          {/* 1.1.1.13 — รายการข้อมูลที่ยังขาด ย้ายไปอยู่ใน <MissingFieldsPopup> */}
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            onNameBlurCheck={stepIndex === 1 ? handleNameBlurCheck : undefined}
            /* ใช้เฉพาะขั้น "ตรวจสอบข้อมูล" — ปุ่มแก้ไขในแต่ละการ์ดพากลับไปขั้นต้นทาง */
            onJumpToStep={setStepIndex}
          />
        </FormShell>
        <Footer />
      </div>

      {/* 1.1.1.5 — duplicate ชื่อ-สกุล */}
      <DuplicatePatientWarningPopup
        open={!!dupState}
        matches={dupState?.matches || []}
        typedName={`${form.prefixTh || ''}${form.firstNameTh || ''} ${form.lastNameTh || ''}`.trim()}
        onConfirm={handleDupConfirm}
        onCancel={() => setDupState(null)}
      />

      {/* 1.1.1.10 — OPD Card หลังบันทึกสำเร็จ */}
      <PatientCardPrintPopup
        open={printOpen}
        onClose={handlePrintPopupClose}
        card={printCard}
        subtitle='บันทึกทะเบียนสำเร็จ — พิมพ์บัตรผู้รับบริการ (OPD Card) ให้ผู้รับบริการ'
        extraAction={{
          /* Legacy ห้องบัตร flow (คู่มือ บทที่ 2): บันทึกทะเบียน → พิมพ์ OPD
             Card → ส่งตรวจ. Hands the fresh record to the visit page the same
             way the queue row does. */
          label: 'ไปหน้าส่งตรวจ (เปิด Visit)',
          onClick: () => {
            setPrintOpen(false);
            allowNavRef.current = true;
            /* Use the roster HN this form was opened with — a brand-new
               registration's HN is still a preview string that no mock
               record answers to, so the visit page would fall back to the
               default patient. */
            history.push({
              pathname: '/registration/visit',
              state: { hn: navState?.hn || patient?.hn },
            });
          },
        }}
      />

      <InternalReferPopup
        open={referOpen}
        onClose={() => setReferOpen(false)}
        onConfirm={handleReferConfirm}
        fromDepartment='งานเวชระเบียน'
        subtitle='เลือกจุดบริการหรือแผนกปลายทาง'
      />

      {/* ออกจากฟอร์มที่แก้ไขค้าง */}
      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => leaveTo(false)}
        onDiscard={() => leaveTo(true)}
      />

      <PhcisTopToast session={toastSession} onDismiss={() => setToastSession(null)} />
      <SuccessToast
        open={!!successToast}
        message={successToast}
        onClose={() => setSuccessToast('')}
      />
    </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationFormPage;
