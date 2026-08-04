import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import FormShell from '@/templates/FormShell';
import Alert from '@/components/alert/Alert';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import SuccessToast from '@/components/toast/SuccessToast';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import {
  StepConsent, Step1Personal, Step2Address, Step3Contact, Step4Rights, Step5Flags,
} from '@/components/forms/RegistrationSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT, MR_PATIENTS } from '@/data/mrPatients';
import {
  applySmartCardRead,
  buildEmptyRegistrationForm,
  buildHnPreview,
  clearRegistrationDraft,
  getRegistrationCompletedSteps,
  getRegistrationMissingReport,
  getStepMissingFields,
  REGISTRATION_STEP_NAMES,
  appendRegistrationAudit,
  REGISTRATION_AUDIT_USER,
  loadRegistrationDraft,
  saveRegistrationDraft,
} from '@/data/registrationForm';
import DuplicatePatientWarningPopup from './DuplicatePatientWarningPopup';
import PatientCardPrintPopup, { buildOpdCardFromForm } from './PatientCardPrintPopup';

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

const breadcrumb = ['ระบบงานเวชระเบียน', 'ข้อมูลผู้รับบริการ'];

const STEP_RENDERERS = [
  StepConsent,
  Step1Personal,
  Step2Address,
  Step3Contact,
  Step4Rights,
  Step5Flags,
];

const SAVE_BUTTON_TEXT = 'บันทึกข้อมูลผู้รับบริการ';
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

  /* ── step advance with validation ───────────────────────────────── */
  const handleStepChange = (next) => {
    if (next === stepIndex) return;
    if (next < stepIndex) {
      setMissingReport(null);
      setStepIndex(next);
      return;
    }
    const missing = getStepMissingFields(form, stepIndex);
    if (missing.length > 0) {
      setMissingReport([{
        stepIndex,
        stepLabel: REGISTRATION_STEP_NAMES[stepIndex],
        fields: missing,
      }]);
      showToast('error', `ข้อมูลไม่ครบ (${REGISTRATION_STEP_NAMES[stepIndex]}): ${missing.join(' · ')}`);
      return;
    }
    if (stepIndex === 1) {
      const matches = unconfirmedDuplicates();
      if (matches.length) {
        openDupPopup(matches, () => {
          setMissingReport(null);
          setStepIndex(next);
        });
        return;
      }
    }
    setMissingReport(null);
    setStepIndex(next);
  };

  /* ── save flow (1.1.1.10 + 1.1.1.13) ────────────────────────────── */
  const [printCard, setPrintCard] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const allowNavRef = useRef(false);
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;
  const formRef = useRef(form);
  formRef.current = form;

  const doSave = () => {
    const f = formRef.current;
    appendRegistrationAudit({
      step: 'เวชระเบียน',
      field: 'บันทึกทะเบียนผู้รับบริการ',
      oldValue: '—',
      newValue: `${f.prefixTh || ''}${f.firstNameTh || ''} ${f.lastNameTh || ''} · HN ${buildHnPreview(f)}`,
    });
    clearRegistrationDraft();
    dirtyRef.current = false;
    setSuccessToast('บันทึกข้อมูลผู้รับบริการสำเร็จ');
    /* Legacy flow: บันทึก → พิมพ์ OPD Card (1.1.1.10) */
    setPrintCard(buildOpdCardFromForm(f, buildHnPreview(f)));
    setPrintOpen(true);
  };

  const handleSaveAttempt = () => {
    const report = getRegistrationMissingReport(formRef.current);
    if (report.length > 0) {
      setMissingReport(report);
      const first = report[0];
      showToast('error', `บันทึกไม่ได้ — ข้อมูลไม่ครบ ${report.length} ขั้นตอน · เริ่มที่ ${first.stepLabel}: ${first.fields.join(' · ')}`);
      return;
    }
    const matches = unconfirmedDuplicates();
    if (matches.length) {
      openDupPopup(matches, doSave);
      return;
    }
    doSave();
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

  return (
    <ClinicFilterProvider>
    <div
      className='flex w-full min-h-screen'
      style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
      onClickCapture={handleClickCapture}
    >
      <Sidebar activeKey='registration' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={breadcrumb} />
        <FormShell
          stepIndex={stepIndex}
          onStepChange={handleStepChange}
          onReadSmartCard={handleReadSmartCard}
          smartCardRead={form.idCardFromChip}
          completedSteps={completedSteps}
        >
          {/* 1.1.1.13 — clickable missing-field panel (คลิก jump ไป step) */}
          {missingReport && missingReport.length > 0 && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <Alert
                type='error'
                title='ยังบันทึกไม่ได้ — ข้อมูลที่จำเป็นยังไม่ครบ'
                subtext='กดปุ่มขั้นตอนด้านล่างเพื่อข้ามไปกรอกข้อมูลที่ขาด'
                showCloseButton={false}
                showBadge={false}
                showIndicator={false}
                style={{ width: '100%' }}
              />
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {missingReport.map((r) => (
                  <BrandSubdueButton
                    key={r.stepIndex}
                    variant='outline'
                    size='sm'
                    leadingIcon='error'
                    onClick={() => {
                      setStepIndex(r.stepIndex);
                      setMissingReport(null);
                    }}
                  >
                    {`${r.stepLabel}: ${r.fields.join(' · ')}`}
                  </BrandSubdueButton>
                ))}
              </div>
            </div>
          )}
          <ActiveStep
            form={form}
            setForm={setForm}
            patient={patient}
            onNameBlurCheck={stepIndex === 1 ? handleNameBlurCheck : undefined}
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
