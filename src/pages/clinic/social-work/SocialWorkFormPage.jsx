import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Checkbox from '@/components/checkbox/Checkbox';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import Icon from '@/components/icons/Icon';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import {
  SwSectionCard, SwField, SwBanner, SwAuditLine, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
/* reuse เนื้อ step เดิมเป็นบล็อกในหน้าเดียว (ลด churn ของไฟล์ 111KB) */
import {
  SwStep2Vitals, SwStep3History, SwStep7Supporting, SwStep8Closing,
} from '@/pages/clinic/social-work/SocialWorkSteps';
import {
  SW_SUB_FORM_PANELS, validateSwSubForm, summarizeSwSubForm, swSubFormFlags,
} from '@/pages/clinic/social-work/SocialWorkSubFormPanels';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_SW_VISIT,
  SW_CURRENT_USER,
  SW_WORKERS,
  SW_CLINICS,
  SW_SUB_FORMS,
  SW_INTAKE_CHANNELS,
  SW_CLIENT_TYPES,
  SW_TARGET_GROUPS,
  SW_INFORMANT_RELATIONS,
  SW_EDUCATION_LEVELS,
  SW_OCCUPATIONS,
  SW_RESIDENCE_OWNERSHIP,
  SW_DOMICILES,
  SW_WELFARE_CARD_STATUS,
  SW_SERVICE_CAUSE_SUGGESTIONS,
  getSwIntakeByHn,
  getSwRegistrationByHn,
  getSwQueueRows,
  getSwPersonByHn,
  getSwDraft,
  saveSwDraft,
  clearSwDraft,
  saveSwVisitRecord,
  getSwVisitRecords,
  hasSocialWorkRights,
  setSocialWorkRights,
  peekNextSwSn,
  isSwSnTaken,
  formatCid,
  calcAgeYears,
  formatSwDate,
  formatSwDateTime,
  todayIso,
} from '@/data/socialWorkClinic';

/* SocialWorkFormPage — แบบบันทึกผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.2)
   (TOR §1.10.11.2) — refit ตามมติ คทง.10 ครั้งที่ 3 ข้อ 2:

   เดิมเป็น wizard 8 ขั้นตอนที่บังคับเดินทีละ step → ตอนนี้เป็น "หน้าเดียว"
   ที่แสดง Intake + Fact Finding อยู่บนหน้า แล้วเปิดหัวข้อย่อยอีก 10 ชุด
   เป็นปุ่ม Pop-up ที่ "แก้ไขได้ตลอดการลงข้อมูล" (SocialWorkSubFormPanels.jsx)
   โดยยังใช้ form-state object เดียวและ saveSwDraft / saveSwVisitRecord ตัวเดิม
   เพื่อไม่กระทบหน้าติดตามผล ทะเบียน และรายงานที่อ่าน record ร่วมกัน.

   ส่วนที่คงจากโครงเดิม (reuse ตรงจาก SocialWorkSteps.jsx):
     • Vital Signs / Nurse Note (อ่านอย่างเดียว)
     • ประวัติทางสังคมและครอบครัว (ตารางสมาชิกครอบครัว)
     • ข้อมูลประกอบการวินิจฉัย (การรักษา · ส่งปรึกษา · Lab · X-ray)
     • แถบคำสั่งทางการแพทย์ / e-Document / ส่งต่อ / นัดหมาย + ยืนยันบันทึก

   ครบ 4 กริยาของ TOR:
     แสดง   — ระเบียนที่บันทึกแล้วเปิดแบบอ่านอย่างเดียว
     บันทึก — ปุ่ม "ยืนยันบันทึกแบบ ส.ส.2" ท้ายหน้า (SN ออกอัตโนมัติเมื่อสำเร็จ)
     แก้ไข  — ปุ่ม "แก้ไขบันทึก" บนแถบมุมมอง + ทุก popup แก้ไขได้ตลอด
     ยกเลิก — "ยกเลิกการบันทึก" + เตือนข้อมูลค้างก่อนออกจากหน้า/ปิด popup */

const breadcrumb = ['บันทึกการรักษา', 'งานสังคมสงเคราะห์', 'แบบบันทึกผู้ใช้บริการ (ส.ส.2)'];
const HOME_PATH = '/clinic/social-work';
const QUEUE_PATH = '/clinic/social-work/queue';

const cloneDefaultVisit = () => JSON.parse(JSON.stringify(DEFAULT_SW_VISIT));

/* แบบย่อยบางชุดต้อง sync ค่าขึ้นระดับบนสุดของ form เพื่อให้หน้าทะเบียน /
   ติดตามผล / รายงาน ที่อ่าน record ชุดเดิมยังทำงานได้เหมือนเดิม */
const syncTopLevel = (key, v) => {
  if (key === 'diagnosis') {
    return {
      primaryProblem: v.primaryProblem || '',
      secondaryProblems: (v.secondaryProblems || []).map((s) => s.code).filter(Boolean),
      socialDiagnosis: v.socialDiagnosis || '',
      socialAssessment: v.socialAssessment || '',
    };
  }
  if (key === 'intervention') {
    return {
      services: v.services || {},
      funds: v.funds || [],
      consumableRequests: v.materials || [],
      advices: v.adviceNote ? [v.adviceNote] : [],
    };
  }
  if (key === 'followup') return { followUps: v.followUps || [] };
  if (key === 'termination') {
    return {
      terminated: !!v.terminated,
      terminationReason: v.terminationReason || '',
      terminationDate: v.terminationDate || '',
      terminatedBy: v.terminatedBy || '',
    };
  }
  return {};
};

const SocialWorkFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const params = useParams();

  const swHn = params?.hn || navState?.hn || DEFAULT_PATIENT.hn;

  const cardPatient = useMemo(() => getPatientByHN(swHn) || DEFAULT_PATIENT, [swHn]);
  const queueRow = useMemo(
    () => getSwQueueRows().find((r) => r.hn === swHn) || getSwPersonByHn(swHn),
    [swHn],
  );
  const intake = useMemo(() => getSwIntakeByHn(swHn), [swHn]);
  const registration = useMemo(() => getSwRegistrationByHn(swHn), [swHn]);
  const previousVisits = useMemo(() => getSwVisitRecords(swHn), [swHn]);

  /* ── mode: resume draft > view saved visit > new record ─────────── */
  const initial = useMemo(() => {
    const seed = cloneDefaultVisit();
    seed.serviceDate = todayIso();
    seed.receivedDate = registration?.receivedDate || todayIso();
    seed.sn = '';
    seed.worker = queueRow?.worker || '';
    seed.clinic = queueRow?.clinic || 'social';
    seed.intakeChannel = queueRow?.intakeChannel || '';
    seed.targetGroup = queueRow?.targetGroup || '';
    seed.clientType = queueRow?.clientType || 'new';
    seed.previousVisitCount = getSwVisitRecords(swHn).length;
    seed.informant = registration?.informant || '';
    seed.informantRelation = registration?.informantRelation || '';
    seed.informantPhone = registration?.informantPhone || '';
    seed.currentAddress = registration?.currentAddress || '';
    seed.houseRegAddress = registration?.houseRegAddress || '';
    seed.sameAddress = !!(registration?.currentAddress
      && registration?.currentAddress === registration?.houseRegAddress);
    seed.subForms = {};

    const draft = getSwDraft(swHn);
    if (draft) {
      return {
        mode: 'draft',
        form: { ...seed, ...draft.form, subForms: draft.form.subForms || {} },
        draftSavedAt: draft.savedAt,
      };
    }
    const visits = getSwVisitRecords(swHn);
    const last = visits[visits.length - 1];
    if (last && (navState?.statusKey === 'done' || queueRow?.statusKey === 'done')) {
      return { mode: 'view', form: { ...seed, ...last, subForms: last.subForms || {} }, lastVisit: last };
    }
    return { mode: 'new', form: seed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [form, setFormState] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');
  const [saveError, setSaveError] = useState('');
  const [snError, setSnError] = useState('');
  const [, setRightsTick] = useState(0);

  /* popup ของแบบย่อย */
  const [openKey, setOpenKey] = useState(null);
  const [panelDraft, setPanelDraft] = useState({});
  const [panelError, setPanelError] = useState('');
  const [panelLeaveOpen, setPanelLeaveOpen] = useState(false);
  const panelSeed = useRef('{}');

  /* เปิดเคสใหม่หลังยุติบริการ */
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenError, setReopenError] = useState('');

  const seedJson = useRef(JSON.stringify(initial.form));
  const canWrite = hasSocialWorkRights();
  const locked = mode === 'view' || saved || !!form.terminated || !canWrite;
  const saveLocked = mode === 'view' || saved || !canWrite;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const setForm = (updater) => {
    setFormState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      /* บันทึกร่างอัตโนมัติ (มติ คทง.10 ครั้งที่ 3 ข้อ 18) */
      if (mode !== 'view' && !saved && canWrite) saveSwDraft(swHn, next, 0);
      return next;
    });
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  /* ── SN / เลขเคส ─────────────────────────────────────────────── */
  const nextSn = useMemo(() => peekNextSwSn(form.serviceDate), [form.serviceDate]);
  const effectiveSn = form.sn || nextSn;

  const changeSn = (value) => {
    set('sn')(value);
    setSnError(value && isSwSnTaken(value, swHn) ? 'เลข SN นี้ถูกใช้กับผู้รับบริการรายอื่นแล้ว' : '');
  };

  /* ── popup แบบย่อย ───────────────────────────────────────────── */
  const openPanel = (key) => {
    const current = form.subForms?.[key] || {};
    panelSeed.current = JSON.stringify(current);
    setPanelDraft({ ...current });
    setPanelError('');
    setOpenKey(key);
  };

  const panelDirty = JSON.stringify(panelDraft) !== panelSeed.current;

  const closePanel = (force) => {
    if (!force && panelDirty && !locked) { setPanelLeaveOpen(true); return; }
    setOpenKey(null);
    setPanelDraft({});
    setPanelError('');
    setPanelLeaveOpen(false);
  };

  const savePanel = () => {
    const message = validateSwSubForm(openKey, panelDraft);
    if (message) { setPanelError(message); return; }
    const key = openKey;
    const existing = form.subForms?.[key];
    const now = new Date().toISOString();
    const value = {
      ...panelDraft,
      savedBy: existing?.savedBy || SW_CURRENT_USER,
      savedAt: existing?.savedAt || now,
      editedAt: existing?.savedAt ? now : undefined,
    };
    setForm((f) => ({
      ...f,
      subForms: { ...(f.subForms || {}), [key]: value },
      ...syncTopLevel(key, value),
    }));
    setPanelLeaveOpen(false);
    setOpenKey(null);
    setPanelDraft({});
    setPanelError('');
  };

  /* ── บันทึก / ยกเลิก / แก้ไข ─────────────────────────────────── */
  /* แจ้ง error แล้วเลื่อนขึ้นหัวหน้าจอ — แถบ error อยู่บนสุด แต่ปุ่มยืนยันบันทึก
     อยู่ท้ายหน้า ถ้าไม่เลื่อนให้ ผู้ใช้จะไม่เห็นว่าทำไมบันทึกไม่ผ่าน */
  const failSave = (message) => {
    setSaveError(message);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmSave = () => {
    if (!form.intakeChannel || !form.targetGroup) {
      failSave('กรอก "การรับเรื่อง" และ "กลุ่มเป้าหมาย" ในส่วน Intake ให้ครบก่อนบันทึก');
      return;
    }
    if (!form.subForms?.diagnosis?.savedAt) {
      failSave('ต้องบันทึกแบบย่อย "ประเมินและวินิจฉัยทางสังคม" (ปัญหาหลัก) ก่อนยืนยันบันทึก');
      return;
    }
    if (snError) {
      failSave('เลข SN ซ้ำกับผู้รับบริการรายอื่น — แก้ไขก่อนบันทึก');
      return;
    }
    const blocking = ['childRisk', 'violence']
      .map((k) => (form.subForms?.[k]?.savedAt ? validateSwSubForm(k, form.subForms[k]) : null))
      .find(Boolean);
    if (blocking) { failSave(blocking); return; }

    const payload = {
      ...form,
      sn: form.sn || '',
      patientName: cardPatient.fullName,
      patientCid: cardPatient.cid || queueRow?.cid || '',
      patientBirthDate: cardPatient.birthDate || '',
      patientSex: cardPatient.sex || queueRow?.sex || '',
      patientAge: calcAgeYears(cardPatient.birthDate),
      caseNo: registration?.caseNo || '',
    };
    const entry = saveSwVisitRecord(swHn, payload);
    clearSwDraft(swHn);
    setFormState((f) => ({ ...f, sn: entry.sn }));
    seedJson.current = JSON.stringify({ ...form, sn: entry.sn });
    setSaveError('');
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && mode !== 'view' && !saved) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveSwDraft(swHn, form, 0);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearSwDraft(swHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const confirmReopen = () => {
    if (!reopenReason.trim()) { setReopenError('ระบุเหตุผลการเปิดเคสใหม่'); return; }
    const termination = form.subForms?.termination || {};
    setForm((f) => ({
      ...f,
      terminated: false,
      subForms: {
        ...(f.subForms || {}),
        termination: {
          ...termination,
          terminated: false,
          reopen: { reason: reopenReason.trim(), by: SW_CURRENT_USER, at: new Date().toISOString() },
          editedAt: new Date().toISOString(),
        },
      },
    }));
    setReopenOpen(false);
    setReopenReason('');
    setReopenError('');
  };

  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  const flags = useMemo(() => swSubFormFlags(form), [form]);

  const stepProps = {
    form,
    setForm,
    swHn,
    intake,
    registration,
    queueRow,
    cardPatient,
    locked,
    saveLocked,
    saved,
    onConfirmSave: confirmSave,
  };

  const ActivePanel = openKey ? SW_SUB_FORM_PANELS[openKey] : null;
  const activeMeta = openKey ? SW_SUB_FORMS.find((f) => f.key === openKey) : null;

  const bannerWrap = {
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
  };

  const bodyWrap = {
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
    marginBottom: 'var(--dim-space-400, 16px)',
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title='แบบบันทึกผู้ใช้บริการสังคมสงเคราะห์ (ส.ส.2)' hideBottomBorder />

          {/* เตือนข้อมูลค้างก่อนออกจากหน้า */}
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกแบบ ส.ส.2'
            subtitle={`${cardPatient.fullName} · HN: ${swHn}${queueRow?.queue ? ` · คิว ${queueRow.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในแบบ ส.ส.2 — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ &quot;ที่ร่างไว้&quot; ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            title='แบบบันทึกผู้ใช้บริการสังคมสงเคราะห์ — ส.ส.2'
            drugAllergies={intake.drugAllergies}
            chronicDiseases={intake.chronicDiseases}
            actions={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{`SN ${effectiveSn}`}</ColorfulBadge>
                {registration ? (
                  <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{registration.caseNo}</ColorfulBadge>
                ) : (
                  <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่มีเลข CASE</ColorfulBadge>
                )}
                <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
                  {`ผู้บันทึก ${SW_CURRENT_USER}`}
                </ColorfulBadge>
                <NeutralSubdueButton
                  size='sm'
                  leadingIcon={canWrite ? 'lock_open' : 'lock'}
                  onClick={toggleRightsDemo}
                  title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
                >
                  {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
                </NeutralSubdueButton>
                <NeutralSubdueButton size='sm' leadingIcon='home' onClick={() => history.push(HOME_PATH)}>
                  หน้าแรกงานสังคมสงเคราะห์
                </NeutralSubdueButton>
                {!locked && (
                  <NeutralSubdueButton
                    size='sm'
                    leadingIcon='block'
                    onClick={() => { if (dirty) setLeaveOpen(true); else history.push(QUEUE_PATH); }}
                  >
                    ยกเลิกการบันทึก
                  </NeutralSubdueButton>
                )}
              </div>
            )}
          />

          {!canWrite && (
            <div style={bannerWrap}>
              <SwBanner tone='warning' icon='lock'>
                บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ (§1.4.2) — เปิดดูแบบ ส.ส.2 ได้ในโหมดปกปิด
                แต่บันทึก แก้ไข หรือยกเลิกไม่ได้
              </SwBanner>
            </div>
          )}

          {(queueRow?.rightsExpired || queueRow?.noRights) && (
            <div style={bannerWrap}>
              <SwBanner tone='warning' icon='warning'>
                {`ผู้รับบริการ${queueRow.noRights ? 'ไม่มีสิทธิการรักษา' : `สิทธิการรักษาหมดอายุ (${queueRow.insurance})`} — ยังบันทึกการให้บริการสังคมสงเคราะห์ได้ตามปกติ และควรประสานงานสิทธิประโยชน์ให้ผู้รับบริการก่อนกลับ`}
              </SwBanner>
            </div>
          )}

          {/* Flag ข้อควรระวังจากผลคัดกรองในแบบย่อย */}
          {flags.map((f) => (
            <div key={f.text} style={bannerWrap}>
              <SwBanner tone={f.tone === 'red' ? 'danger' : 'warning'} icon={f.icon}>{f.text}</SwBanner>
            </div>
          ))}

          {resumeBanner && !saved && (
            <div style={bannerWrap}>
              <SwBanner tone='brand' icon='history' onClose={() => setResumeBanner(false)}>
                {`กลับมาทำต่อจากร่างที่บันทึกไว้${initial.draftSavedAt ? ` (${formatSwDateTime(initial.draftSavedAt)})` : ''} — ข้อมูลที่กรอกไว้ถูกเก็บอัตโนมัติทุกครั้งที่แก้ไข`}
              </SwBanner>
            </div>
          )}

          {mode === 'view' && (
            <div style={bannerWrap}>
              <SwBanner
                tone='neutral'
                icon='visibility'
                action={canWrite ? (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                    แก้ไขบันทึก
                  </BrandSubdueButton>
                ) : undefined}
              >
                {`แสดงแบบ ส.ส.2 ที่บันทึกแล้ว (อ่านอย่างเดียว)${initial.lastVisit ? ` · บันทึกโดย ${initial.lastVisit.savedBy} · ${formatSwDateTime(initial.lastVisit.savedAt)}` : ''}`}
              </SwBanner>
            </div>
          )}

          {form.terminated && mode !== 'view' && (
            <div style={bannerWrap}>
              <SwBanner
                tone='neutral'
                icon='lock'
                action={canWrite ? (
                  <BrandSubdueButton variant='outline' size='sm' leadingIcon='lock_open' onClick={() => { setReopenOpen(true); setReopenReason(''); setReopenError(''); }}>
                    เปิดเคสใหม่
                  </BrandSubdueButton>
                ) : undefined}
              >
                เคสนี้ยุติการให้บริการแล้ว — ระเบียนเป็นอ่านอย่างเดียว
                หากต้องการให้บริการต่อ ให้กด &quot;เปิดเคสใหม่&quot; พร้อมระบุเหตุผล
              </SwBanner>
            </div>
          )}

          {saveError && (
            <div style={bannerWrap}>
              <SwBanner tone='danger' icon='error' onClose={() => setSaveError('')}>{saveError}</SwBanner>
            </div>
          )}

          {saved && (
            <div style={bannerWrap}>
              <SwBanner tone='brand' icon='check-circle'>
                {`บันทึกแบบ ส.ส.2 เรียบร้อยแล้ว — ระบบออกเลข SN ${form.sn || effectiveSn} ให้กับการให้บริการครั้งนี้`}
              </SwBanner>
            </div>
          )}

          {/* ══ เนื้อหาหน้าเดียว ═══════════════════════════════════ */}
          <div className='flex flex-col' style={{ ...bodyWrap, gap: 'var(--dim-space-500, 20px)' }}>

            {/* ── Intake ─────────────────────────────────────────── */}
            <SwSectionCard
              icon='assignment_ind'
              title='ประวัติผู้ใช้บริการ — การรับเรื่อง (Intake)'
              aside={<ColorfulBadge style='grey' size='small' hierarchy='secondary'>Intake 1–10</ColorfulBadge>}
            >
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='วันที่รับเรื่อง (Intake 1)' required minWidth={200}>
                  <DatePicker
                    showLabel={false}
                    disabled={locked}
                    value={form.receivedDate ? new Date(form.receivedDate) : null}
                    onChange={(d) => set('receivedDate')(d ? toLocalIso(d) : '')}
                    placeholder='เลือกวันที่'
                  />
                </SwField>
                <SwField label='เลข HN (จากเวชระเบียน)' minWidth={180}>
                  <InputField disabled value={swHn} onChange={() => {}} placeholder='HN' />
                </SwField>
                <SwField
                  label='เลข SN (ออกอัตโนมัติ — พิมพ์แก้ได้)'
                  minWidth={280}
                  hint={snError || `รูปแบบ SN/ปีงบ/เลข ศบส./ลำดับ — ถ้าไม่พิมพ์ ระบบจะออกเป็น ${nextSn} เมื่อบันทึกสำเร็จ`}
                  hintTone={snError ? 'error' : undefined}
                >
                  <InputField
                    disabled={locked}
                    value={form.sn}
                    onChange={changeSn}
                    placeholder={nextSn}
                    error={!!snError}
                    showHelperText={false}
                  />
                </SwField>
                <SwField label='เลขที่สังคมสงเคราะห์ (เลข CASE)' minWidth={220} hint='แก้ไขเลขที่บันทึกผิดได้ที่หน้าทะเบียนผู้รับบริการ'>
                  <InputField disabled value={registration?.caseNo || ''} onChange={() => {}} placeholder='ยังไม่มีเลข CASE' />
                </SwField>
              </div>

              <div className='flex w-full flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <NeutralSubdueButton size='sm' leadingIcon='history'>
                  {`การให้บริการที่ผ่านมา ${previousVisits.length} ครั้ง`}
                </NeutralSubdueButton>
                {previousVisits.slice(-3).reverse().map((v, i) => (
                  <ColorfulBadge key={`${v.savedAt}-${i}`} style='grey' size='small' hierarchy='secondary'>
                    {formatSwDate(v.visitDate)}
                  </ColorfulBadge>
                ))}
                {previousVisits.length === 0 && (
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ยังไม่เคยมีประวัติการให้บริการงานสังคมสงเคราะห์ในระบบ
                  </span>
                )}
              </div>

              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='การรับเรื่อง' required minWidth={260}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.intakeChannel}
                    onChange={set('intakeChannel')}
                    options={SW_INTAKE_CHANNELS}
                    placeholder='เลือกช่องทางการรับเรื่อง (คลินิก / ชุมชน / ภายนอก)'
                  />
                </SwField>
                <SwField label='กลุ่มเป้าหมาย' required minWidth={260}>
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    disabled={locked}
                    value={form.targetGroup}
                    onChange={set('targetGroup')}
                    options={SW_TARGET_GROUPS}
                    placeholder='เลือกกลุ่มเป้าหมาย'
                  />
                </SwField>
                <SwField label='ประเภทผู้ใช้บริการ' minWidth={260}>
                  <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    {SW_CLIENT_TYPES.map((t) => (
                      <SelectableTag
                        key={t.value}
                        label={t.label}
                        size='md'
                        selected={form.clientType === t.value}
                        onClick={() => !locked && set('clientType')(t.value)}
                      />
                    ))}
                  </div>
                </SwField>
                <SwField label='ผู้ให้บริการ' minWidth={260}>
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    disabled={locked}
                    value={form.worker}
                    onChange={set('worker')}
                    options={SW_WORKERS.map((w) => ({ value: w, label: w }))}
                    placeholder='เลือกผู้ให้บริการ'
                  />
                </SwField>
                <SwField label='หน่วยบริการ' minWidth={240}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.clinic}
                    onChange={set('clinic')}
                    options={SW_CLINICS}
                    placeholder='เลือกหน่วยบริการ'
                  />
                </SwField>
              </div>

              <SwField label='สาเหตุการใช้บริการ / การส่งปรึกษา'>
                <SuggestibleTextarea
                  voice
                  disabled={locked}
                  value={form.serviceCause}
                  onChange={(e) => set('serviceCause')(e.target.value)}
                  suggestions={SW_SERVICE_CAUSE_SUGGESTIONS}
                  minChars={3}
                  placeholder='ระบุสาเหตุที่ผู้รับบริการมาใช้บริการหรือถูกส่งปรึกษา (ไม่จำกัดจำนวนคำ)'
                />
              </SwField>

              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ผู้ให้ข้อมูล — ชื่อ-สกุล' minWidth={240}>
                  <InputField disabled={locked} value={form.informant} onChange={set('informant')} placeholder='เช่น นางสมทรง รุ่งเรือง' />
                </SwField>
                <SwField label='ความเกี่ยวข้อง' minWidth={220}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.informantRelation}
                    onChange={set('informantRelation')}
                    options={SW_INFORMANT_RELATIONS}
                    placeholder='เลือกความเกี่ยวข้อง'
                  />
                </SwField>
                <SwField label='โทรศัพท์ที่ติดต่อได้' minWidth={200}>
                  <InputField disabled={locked} value={form.informantPhone} onChange={set('informantPhone')} placeholder='เช่น 081-234-5678' />
                </SwField>
              </div>

              <SwAuditLine by={SW_CURRENT_USER} at={new Date().toISOString()} label='ผู้บันทึก' formatDateTime={formatSwDateTime} />
            </SwSectionCard>

            {/* ── Fact Finding ───────────────────────────────────── */}
            <SwSectionCard
              icon='travel_explore'
              title='การค้นหาข้อเท็จจริง (Fact Finding) — ข้อมูลเชื่อมจากเวชระเบียน'
              aside={<ColorfulBadge style='grey' size='small' hierarchy='secondary'>Finding 1–15</ColorfulBadge>}
            >
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                {[
                  ['ชื่อ-สกุล', cardPatient.fullName],
                  ['เลขประจำตัวประชาชน', formatCid(cardPatient.cid || queueRow?.cid || '')],
                  ['วดป. เกิด', formatSwDate(cardPatient.birthDate)],
                  ['อายุ', calcAgeYears(cardPatient.birthDate) != null ? `${calcAgeYears(cardPatient.birthDate)} ปี` : (queueRow?.age || '—')],
                  ['เพศ', cardPatient.sex || queueRow?.sex || '—'],
                  ['สิทธิการรักษา', cardPatient.insurance || queueRow?.insurance || '—'],
                ].map(([label, value]) => (
                  <div key={label} className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)', minWidth: 200 }}>
                    <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{label}</span>
                    <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>{value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ระดับการศึกษา' minWidth={240}>
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    disabled={locked}
                    value={form.education}
                    onChange={set('education')}
                    options={SW_EDUCATION_LEVELS.map((e) => ({ value: e, label: e }))}
                    placeholder='เลือกระดับการศึกษา'
                  />
                </SwField>
                <SwField label='อาชีพ' minWidth={240}>
                  <Select
                    showLabel={false}
                    searchable
                    size='lg'
                    disabled={locked}
                    value={form.occupation}
                    onChange={set('occupation')}
                    options={SW_OCCUPATIONS.map((o) => ({ value: o, label: o }))}
                    placeholder='เลือกอาชีพ'
                  />
                </SwField>
                <SwField label='บัตรสวัสดิการแห่งรัฐ (สถานะรายได้น้อย)' minWidth={280}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.welfareCard}
                    onChange={set('welfareCard')}
                    options={SW_WELFARE_CARD_STATUS}
                    placeholder='เลือกสถานะบัตรสวัสดิการแห่งรัฐ'
                  />
                </SwField>
                <SwField label='ภูมิลำเนา' minWidth={240}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.domicile}
                    onChange={set('domicile')}
                    options={SW_DOMICILES}
                    placeholder='เลือกภูมิลำเนา'
                  />
                </SwField>
              </div>

              <SwField label='ที่อยู่ปัจจุบัน (เชื่อมจากเวชระเบียน — แก้ไขได้)'>
                <InputField
                  disabled={locked}
                  value={form.currentAddress}
                  onChange={(v) => setForm((f) => ({
                    ...f,
                    currentAddress: v,
                    houseRegAddress: f.sameAddress ? v : f.houseRegAddress,
                  }))}
                  placeholder='เลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์'
                />
              </SwField>

              <Checkbox
                checked={!!form.sameAddress}
                disabled={locked}
                onChange={(next) => setForm((f) => ({
                  ...f,
                  sameAddress: next,
                  houseRegAddress: next ? f.currentAddress : f.houseRegAddress,
                }))}
                label='ที่อยู่ตามทะเบียนบ้านเหมือนที่อยู่ปัจจุบัน'
              />

              <SwField label='ที่อยู่ตามทะเบียนบ้าน (เชื่อมจากเวชระเบียน — แก้ไขได้)'>
                <InputField
                  disabled={locked || form.sameAddress}
                  value={form.houseRegAddress}
                  onChange={set('houseRegAddress')}
                  placeholder='เลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์'
                />
              </SwField>

              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                <SwField label='ความเป็นเจ้าของที่อยู่อาศัย' minWidth={280}>
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={locked}
                    value={form.residenceOwnership}
                    onChange={set('residenceOwnership')}
                    options={SW_RESIDENCE_OWNERSHIP}
                    placeholder='เลือกความเป็นเจ้าของ'
                  />
                </SwField>
              </div>

              <SwField label='สภาพแวดล้อมที่อยู่อาศัย'>
                <SuggestibleTextarea
                  voice
                  disabled={locked}
                  value={form.environmentNote}
                  onChange={(e) => set('environmentNote')(e.target.value)}
                  suggestions={[
                    'บ้านไม้ชั้นเดียวสภาพทรุดโทรม พื้นผุ เสี่ยงต่อการหกล้ม',
                    'ห้องเช่าขนาดเล็กในชุมชนแออัด อากาศถ่ายเทไม่สะดวก',
                    'มีห้องน้ำภายในบ้านแต่ไม่มีราวจับ ไม่เหมาะกับผู้สูงอายุ',
                    'สภาพแวดล้อมโดยรอบสะอาด มีเพื่อนบ้านช่วยดูแลเป็นระยะ',
                    'ไม่มีที่พักอาศัยเป็นหลักแหล่ง พักอาศัยในพื้นที่สาธารณะ',
                  ]}
                  minChars={3}
                  placeholder='บันทึกสภาพที่อยู่อาศัยและสิ่งแวดล้อมที่พบจากการเยี่ยม/สอบถาม'
                />
              </SwField>
            </SwSectionCard>

            {/* ประวัติทางสังคมและครอบครัว — reuse เนื้อ step เดิม */}
            <SwStep3History {...stepProps} />

            {/* ── เมนูย่อย 10 ปุ่ม Pop-up ────────────────────────── */}
            <SwSectionCard
              icon='dashboard_customize'
              title='หัวข้อย่อยของแบบ ส.ส.2 — เปิดเป็น Pop-up แก้ไขได้ตลอดการลงข้อมูล'
              aside={(
                <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                  {`บันทึกแล้ว ${SW_SUB_FORMS.filter((f) => form.subForms?.[f.key]?.savedAt).length}/${SW_SUB_FORMS.length}`}
                </ColorfulBadge>
              )}
            >
              <div className='flex w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                {SW_SUB_FORMS.map((meta, idx) => {
                  const value = form.subForms?.[meta.key];
                  const isSaved = !!value?.savedAt;
                  const summary = summarizeSwSubForm(meta.key, value);
                  return (
                    <button
                      key={meta.key}
                      type='button'
                      onClick={() => openPanel(meta.key)}
                      className='flex flex-col items-start text-left min-w-0'
                      style={{
                        flex: '1 1 300px',
                        minWidth: 280,
                        gap: 'var(--dim-space-150, 6px)',
                        paddingTop: 'var(--dim-space-400, 16px)',
                        paddingBottom: 'var(--dim-space-400, 16px)',
                        paddingLeft: 'var(--dim-space-400, 16px)',
                        paddingRight: 'var(--dim-space-400, 16px)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        cursor: 'pointer',
                        border: `var(--dim-stroke-100, 1px) solid ${isSaved
                          ? 'var(--border-brandPrimary-quaternary, #E2F3EB)'
                          : 'var(--border-neutral-tertiary, #E2E4E6)'}`,
                        background: isSaved
                          ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)'
                          : 'var(--surface-card-100, #FFFFFF)',
                      }}
                    >
                      <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                        <span style={{ color: 'var(--icon-brandPrimary-default, #007549)' }}>
                          <Icon name={meta.icon} size={20} />
                        </span>
                        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                          {`หัวข้อที่ ${idx + 1}`}
                        </span>
                        <div className='flex-1' />
                        <ColorfulBadge style={isSaved ? 'green' : 'grey'} size='small' hierarchy='secondary'>
                          {isSaved ? 'บันทึกแล้ว' : 'ยังไม่บันทึก'}
                        </ColorfulBadge>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm, 14px)',
                          fontWeight: 'var(--type-weight-bold)',
                          color: 'var(--text-content-default, #363B3F)',
                        }}
                      >
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
                        {summary || meta.hint}
                      </span>
                      {isSaved && (
                        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                          {`${value.savedBy} · ${formatSwDateTime(value.savedAt)}${value.editedAt ? ` · แก้ไข ${formatSwDateTime(value.editedAt)}` : ''}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </SwSectionCard>

            {/* Vital Signs / Nurse Note (อ่านอย่างเดียว) */}
            <SwStep2Vitals {...stepProps} />

            {/* ข้อมูลประกอบการวินิจฉัย */}
            <SwStep7Supporting {...stepProps} />

            {/* คำสั่งทางการแพทย์ · e-Document · ส่งต่อ · นัดหมาย + ยืนยันบันทึก */}
            <SwStep8Closing {...stepProps} />
          </div>

          <div
            className='flex items-center'
            style={{
              marginLeft: 'var(--dim-space-600, 24px)',
              marginRight: 'var(--dim-space-600, 24px)',
              marginTop: 'var(--dim-space-200, 8px)',
              marginBottom: 'var(--dim-space-400, 16px)',
              gap: 'var(--dim-space-200, 8px)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary, #858C92)',
            }}
          >
            <Icon name='info' size={14} />
            <span>
              ทุกหัวข้อบันทึกผู้บันทึกและวันเวลาโดยอัตโนมัติ (audit trail) —
              ร่างถูกเก็บอัตโนมัติทุกครั้งที่แก้ไข จนกว่าจะยืนยันบันทึกหรือละทิ้ง
            </span>
          </div>

          <Footer />
        </div>
      </div>

      {/* ── Pop-up แบบย่อย ─────────────────────────────────────────── */}
      <Popup
        open={!!openKey}
        onClose={() => closePanel(false)}
        title={activeMeta?.label || ''}
        subtitle={`${cardPatient.fullName} · HN ${swHn} · SN ${effectiveSn}`}
        width={900}
        secondaryAction={{ label: 'ปิดโดยไม่บันทึก', onClick: () => closePanel(false) }}
        primaryAction={locked ? undefined : { label: 'บันทึกหัวข้อนี้', onClick: savePanel }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {panelError && <SwBanner tone='danger' icon='error'>{panelError}</SwBanner>}
          {ActivePanel && (
            <ActivePanel
              value={panelDraft}
              onChange={(patch) => { setPanelDraft((d) => ({ ...d, ...patch })); setPanelError(''); }}
              locked={locked}
              form={form}
              cardPatient={cardPatient}
            />
          )}
        </div>
      </Popup>

      {/* เตือนข้อมูลค้างเมื่อปิด popup */}
      <UnsavedChangesPopup
        open={panelLeaveOpen}
        onClose={() => setPanelLeaveOpen(false)}
        onSave={savePanel}
        onDiscard={() => closePanel(true)}
        title='ยังไม่ได้บันทึกหัวข้อนี้'
        description={`มีข้อมูลที่กรอกไว้ใน "${activeMeta?.label || ''}" แต่ยังไม่ได้กดบันทึก — เลือกบันทึกหัวข้อนี้ หรือปิดโดยละทิ้งการเปลี่ยนแปลง`}
      />

      {/* เปิดเคสใหม่หลังยุติบริการ */}
      <Popup
        open={reopenOpen}
        onClose={() => { setReopenOpen(false); setReopenError(''); }}
        title='เปิดเคสใหม่หลังยุติการให้บริการ'
        subtitle={`${cardPatient.fullName} · HN ${swHn}`}
        secondaryAction={{ label: 'ไม่เปิดเคส', onClick: () => { setReopenOpen(false); setReopenError(''); } }}
        primaryAction={{ label: 'เปิดเคสใหม่', onClick: confirmReopen }}
      >
        <SwField label='เหตุผลการเปิดเคสใหม่' required hint={reopenError} hintTone={reopenError ? 'error' : undefined}>
          <SuggestibleTextarea
            voice
            value={reopenReason}
            onChange={(e) => { setReopenReason(e.target.value); setReopenError(''); }}
            suggestions={[
              'ผู้รับบริการกลับมาขอความช่วยเหลือด้วยปัญหาเดิมอีกครั้ง',
              'ยุติการให้บริการผิดพลาด — ยังมีแผนช่วยเหลือค้างอยู่',
              'พบปัญหาใหม่จากการเยี่ยมบ้านที่ต้องเปิดเคสต่อเนื่อง',
            ]}
            minChars={3}
            placeholder='ระบุเหตุผลการเปิดเคสใหม่ (บันทึกไว้ใน audit trail)'
          />
        </SwField>
      </Popup>
    </ClinicFilterProvider>
  );
};

export default SocialWorkFormPage;
