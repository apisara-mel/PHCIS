import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import RecordWizardMorphBand, { MORPH_STICKY_BELOW_PATIENT } from '@/components/layout/RecordWizardMorphBand';
import TabUnderline from '@/components/tab/TabUnderline';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import { SectionTitle, Field, FieldGrid } from '@/components/forms/Fields';
import ESignatureField from '@/components/form-builder/ESignatureField';
import VitalTrendChart from '@/components/observation/VitalTrendChart';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import TelemedOrderStrip from '@/components/telemed/TelemedOrderStrip';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  getTelemedVisit,
  subscribeTelemedVisits,
  addTelemedOrder,
  cancelTelemedOrder,
  addTelemedEvidence,
  removeTelemedEvidence,
  setTelemedServiceWindow,
  isVisitLocked,
  isClaimReady,
  formatThaiDateTime,
  formatClock,
  TELEMED_ORIGIN_UNITS,
  TELEMED_DOCTORS,
  TELEMED_DEPARTMENTS,
  TELEMED_EVIDENCE_ACCEPT_LABEL,
  TELEMED_EVIDENCE_MAX_MB,
} from '@/data/telemedVisits';
import {
  ASSESSMENT_STEPS,
  ASSESSMENT_TABS,
  REFERRAL_STATUS_OPTIONS,
  NEXT_ACTION_OPTIONS,
  SUGGEST_SYMPTOM,
  SUGGEST_DIAGNOSIS,
  SUGGEST_ADVICE,
  SUGGEST_PLAN,
  SUGGEST_REASON,
  VITAL_LABELS,
  getAssessmentByVisit,
  makeBlankAssessment,
  saveAssessment,
  amendAssessment,
  cancelAssessment,
  restoreAssessment,
  requestRetroEdit,
  subscribeAssessments,
  validateAssessment,
  vitalSoftWarnings,
  stepsWithIssues,
} from '@/data/telemedAssessments';
import {
  getRpmPatientByHn,
  getRpmReadings,
  evaluateRpmPatient,
  toTrendData,
  RPM_SOURCE,
  DTX_MEAL_STATE,
  editRpmReading,
  cancelRpmReading,
} from '@/data/telemedRpm';
import { getConsentByVisit, consentTone, canRecordCall } from '@/data/telemedConsent';
import {
  TELEMED_DEFAULT_ROLE,
  telemedCan,
  telemedDenyReason,
  telemedActor,
  logTelemedEvent,
} from '@/utils/telemedAccess';
import { PageBanner, RoleSwitcher, EmptyState, AuditStamp } from '@/pages/telemed/telemedShared';

/* TelemedAssessmentPage — บันทึกการประเมินทางไกลต่อ 1 visit
   (TOR §1.13.1 / .2 / .3 / .5 / .6 / .9).

   โครง 5 ขั้นตอนตามคู่มือ Telemed บทที่ 3 "บันทึกซักประวัติ".
   หมายเหตุ (integrator): TreatmentFormShell / FormShell hardcode เส้นทาง
   footer (`history.push('/treat/queue')` และไม่ส่ง `onSave` ให้ปุ่ม
   "บันทึกร่าง") หน้านี้จึงประกอบ StepProgress + footer เอง เพื่อให้ปุ่ม
   บันทึกร่าง / จบการบันทึก ทำงานจริงและ validate ก่อนปิดงานได้ —
   ใช้ token + โครงเดียวกับ TreatmentFormShell ทุกประการ. */

const VITAL_ROWS = [
  ['height', 'ซม.'], ['weight', 'กก.'], ['temp', '°C'],
  ['bpSys', 'mmHg'], ['bpDia', 'mmHg'], ['o2sat', '%'],
  ['rr', 'ครั้ง/นาที'], ['pulse', 'ครั้ง/นาที'], ['pulsePct', '%'], ['dtx', 'mg/dL'],
];

const SEVERITY_OPTIONS = [
  { value: 'mild',     label: 'เล็กน้อย' },
  { value: 'moderate', label: 'ปานกลาง' },
  { value: 'severe',   label: 'รุนแรง — ต้องส่งต่อ' },
];

const cardStyle = {
  borderRadius: 'var(--dim-radius-500)',
  background: 'var(--surface-card-100)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  overflow: 'hidden',
};

const TelemedAssessmentPage = () => {
  const history = useHistory();
  const params = useParams();
  const visitId = params?.visitId;

  const [role, setRole] = useState(TELEMED_DEFAULT_ROLE);
  const [tab, setTab] = useState('current');
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [showIssues, setShowIssues] = useState(false);
  const [tick, setTick] = useState(0);

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [amendTarget, setAmendTarget] = useState(null);
  const [amendReason, setAmendReason] = useState('');
  const [amendError, setAmendError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [retroOpen, setRetroOpen] = useState(false);
  const [retroReason, setRetroReason] = useState('');
  const [retroError, setRetroError] = useState('');
  const [evidenceError, setEvidenceError] = useState('');
  const [toast, setToast] = useState(null);
  const [readingEdit, setReadingEdit] = useState(null);
  const [readingReason, setReadingReason] = useState('');
  const [readingError, setReadingError] = useState('');

  useEffect(() => subscribeTelemedVisits(() => setTick((t) => t + 1)), []);
  useEffect(() => subscribeAssessments(() => setTick((t) => t + 1)), []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visit = useMemo(() => getTelemedVisit(visitId), [visitId, tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stored = useMemo(() => (visitId ? getAssessmentByVisit(visitId) : null), [visitId, tick]);

  const rpm = useMemo(() => {
    if (!visit) return null;
    const p = getRpmPatientByHn(visit.hn);
    if (!p) return null;
    const readings = getRpmReadings(p.id, { includeCancelled: true });
    const active = getRpmReadings(p.id);
    return { patient: p, readings, ...evaluateRpmPatient(p, active) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit, tick]);

  const consent = useMemo(() => (visitId ? getConsentByVisit(visitId) : null), [visitId, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const recordability = useMemo(() => (visitId ? canRecordCall(visitId) : null), [visitId, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  /* prefill ครั้งแรก: ใช้บันทึกเดิม หรือสร้างโครงเปล่าจาก visit + ค่า RPM */
  useEffect(() => {
    if (!visit) return;
    const base = stored || makeBlankAssessment(visit);
    if (!stored && rpm?.latest) {
      base.vitals = {
        ...base.vitals,
        bpSys: rpm.latest.bpSys != null ? String(rpm.latest.bpSys) : '',
        bpDia: rpm.latest.bpDia != null ? String(rpm.latest.bpDia) : '',
        pulse: rpm.latest.pulse != null ? String(rpm.latest.pulse) : '',
        o2sat: rpm.latest.o2sat != null ? String(rpm.latest.o2sat) : '',
        temp: rpm.latest.temp != null ? String(rpm.latest.temp) : '',
        dtx: rpm.latest.dtx != null ? String(rpm.latest.dtx) : '',
        dtxMeal: rpm.latest.meal || 'fasting',
        vitalSource: rpm.latest.source,
      };
      base.gis = rpm.patient.homeLocation;
    }
    setDraft(base);
    setStepIndex(base.stepIndex || 0);
    setDirty(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId, stored?.id, visit?.id]);

  /* เตือนก่อนปิดแท็บ/กด back เมื่อมีข้อมูลค้าง */
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const canEdit = telemedCan(role, 'edit');
  const canAdd = telemedCan(role, 'add');
  const canCancel = telemedCan(role, 'cancel');
  const canEditRpm = telemedCan(role, 'editRpm');

  const locked = visit ? isVisitLocked(visit) : false;
  const retroApproved = Boolean(stored?.retroEdit);
  const readOnly = !canEdit || (locked && !retroApproved) || stored?.status === 'cancelled';

  const issues = useMemo(() => (draft ? validateAssessment(draft) : []), [draft]);
  const issueSteps = useMemo(() => stepsWithIssues(issues), [issues]);
  const completedSteps = useMemo(
    () => ASSESSMENT_STEPS.map((_, i) => (i < stepIndex && !issueSteps.includes(i))),
    [stepIndex, issueSteps],
  );

  const cardPatient = useMemo(
    () => (visit?.hn && getPatientByHN(visit.hn)) || DEFAULT_PATIENT,
    [visit?.hn],
  );

  const setSection = (section, patch) => {
    setDraft((d) => ({ ...d, [section]: { ...d[section], ...patch } }));
    setDirty(true);
  };

  const issueFor = (field) => (showIssues ? issues.find((i) => i.field === field)?.message : undefined);

  /* บันทึกทับของที่ "บันทึกสมบูรณ์" แล้ว = การแก้ไข → ต้องมีเหตุผลเสมอ
     (TOR §1.13.2 + playbook §5 audit trail)

     ต้องเทียบ **ทุกส่วน** ไม่ใช่เฉพาะขั้นตอนที่เปิดอยู่ — ไม่งั้นการแก้ไข
     ที่ทำไว้ในขั้นตอนอื่นจะถูกทิ้งเงียบ ๆ ตอนกดบันทึก */
  const ASSESSMENT_SECTIONS = ['referral', 'vitals', 'assessment', 'plan', 'evidence'];

  const changedSections = () => {
    if (!draft || !stored) return [];
    return ASSESSMENT_SECTIONS
      .map((section) => ({ section, patch: draft[section] || {} }))
      .filter(({ section, patch }) => {
        const prev = stored[section] || {};
        return Object.keys(patch).some(
          (k) => JSON.stringify(patch[k] ?? null) !== JSON.stringify(prev[k] ?? null),
        );
      });
  };

  /** คืน true เมื่อข้อมูลถูกเขียนลง store จริงแล้ว (false = ยังต้องกรอกเหตุผล) */
  const handleSaveDraft = ({ exitAfter = false } = {}) => {
    if (!draft) return false;
    if (stored?.status === 'final') {
      const changes = changedSections();
      if (!changes.length) {
        setDirty(false);
        setToast('ไม่มีการเปลี่ยนแปลงให้บันทึก');
        return true;
      }
      setAmendTarget({ changes, exitAfter });
      setAmendReason('');
      setAmendError('');
      return false;
    }
    saveAssessment({ ...draft, stepIndex }, telemedActor(role), { final: false });
    logTelemedEvent(role, 'บันทึกร่างการประเมินทางไกล', { detail: `${visit.name} (HN ${visit.hn})` });
    setDirty(false);
    setToast('บันทึกร่างแล้ว');
    return true;
  };

  const handleFinish = () => {
    setShowIssues(true);
    if (issues.length) {
      setToast(null);
      return;
    }
    saveAssessment({ ...draft, stepIndex }, telemedActor(role), { final: true });
    logTelemedEvent(role, 'จบการบันทึกการประเมินทางไกล', { detail: `${visit.name} (HN ${visit.hn})` });
    setDirty(false);
    setToast('บันทึกสมบูรณ์แล้ว — สถานะการประเมินเป็น "บันทึกสมบูรณ์"');
  };

  const handleBack = () => {
    if (dirty) { setConfirmDiscard(true); return; }
    history.push('/telemed/worklist');
  };

  const confirmAmend = () => {
    if (!amendReason.trim()) { setAmendError('ต้องระบุเหตุผลการแก้ไข'); return; }
    const changes = amendTarget?.changes || [];
    let failure = null;
    changes.forEach(({ section, patch }) => {
      const result = amendAssessment(visitId, section, patch, amendReason, telemedActor(role));
      if (!result.ok && !failure) failure = result.reason;
    });
    if (failure) { setAmendError(failure); return; }
    const sectionLabels = changes
      .map(({ section }) => ASSESSMENT_STEPS[ASSESSMENT_SECTIONS.indexOf(section)]?.title || section)
      .join(', ');
    logTelemedEvent(role, 'แก้ไขข้อมูลการประเมิน', { detail: `${visit.name} · ${sectionLabels} · ${amendReason}` });
    const shouldExit = amendTarget?.exitAfter;
    setAmendTarget(null);
    setAmendReason('');
    setDirty(false);
    setToast(`บันทึกการแก้ไข ${changes.length} ส่วน (${sectionLabels}) พร้อมเหตุผลแล้ว`);
    if (shouldExit) history.push('/telemed/worklist');
  };

  const confirmCancelAssessment = () => {
    const result = cancelAssessment(visitId, cancelReason, telemedActor(role));
    if (!result.ok) { setCancelError(result.reason); return; }
    logTelemedEvent(role, 'ยกเลิกบันทึกการประเมิน', { detail: `${visit.name} · ${cancelReason}` });
    setCancelOpen(false);
    setCancelReason('');
    setToast('ยกเลิกบันทึกแล้ว — ยังกู้คืนได้จากปุ่ม "กู้คืนบันทึก"');
  };

  const confirmRetro = () => {
    const result = requestRetroEdit(visitId, retroReason, telemedActor(role));
    if (!result.ok) { setRetroError(result.reason); return; }
    logTelemedEvent(role, 'ขอแก้ไขบันทึกย้อนหลัง', { detail: `${visit.name} · ${retroReason}` });
    setRetroOpen(false);
    setRetroReason('');
    setToast('เปิดให้แก้ไขย้อนหลังแล้ว — การแก้ไขทุกครั้งถูกบันทึกไว้ในประวัติ');
  };

  const handleAddEvidence = (mock) => {
    const result = addTelemedEvidence(visitId, mock, telemedActor(role));
    if (!result.ok) { setEvidenceError(result.reason); return; }
    setEvidenceError('');
    setSection('evidence', { files: [...(draft.evidence.files || []), result.evidence] });
    logTelemedEvent(role, 'อัพโหลดหลักฐานการให้บริการ', { detail: result.evidence.name });
  };

  const confirmReadingEdit = () => {
    const values = {};
    ['bpSys', 'bpDia', 'dtx', 'o2sat', 'temp', 'pulse'].forEach((k) => {
      if (readingEdit.values[k] !== '' && readingEdit.values[k] != null) values[k] = readingEdit.values[k];
    });
    const result = editRpmReading(readingEdit.reading.id, values, readingReason, telemedActor(role));
    if (!result.ok) {
      setReadingError(result.reason || Object.values(result.errors || {})[0] || 'แก้ไขไม่สำเร็จ');
      return;
    }
    logTelemedEvent(role, 'แก้ไขค่าจากอุปกรณ์จากหน้าบันทึกการประเมิน', { detail: readingReason });
    setReadingEdit(null);
    setReadingReason('');
    setReadingError('');
  };

  if (!visit) {
    return (
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='telemed' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={['ระบบ Telemedicine', 'บันทึกการประเมินทางไกล']} />
          <main className='flex-1 flex items-center justify-center'>
            <EmptyState
              icon='error'
              title='ไม่พบรายการปรึกษาทางไกลนี้'
              hint='รายการอาจถูกลบหรือลิงก์ไม่ถูกต้อง — กลับไปเลือกรายการจากหน้าห้องตรวจทางไกล'
              action={(
                <BrandPrimaryButton size='md' leadingIcon='arrow_back' onClick={() => history.push('/telemed/worklist')}>
                  กลับหน้าห้องตรวจ
                </BrandPrimaryButton>
              )}
            />
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const softWarns = draft ? vitalSoftWarnings(draft.vitals) : [];
  const claimReady = isClaimReady({ ...visit, evidence: draft?.evidence.files || [], startedAt: draft?.evidence.startedAt, endedAt: draft?.evidence.endedAt });

  /* ── step bodies ───────────────────────────────────────────────────── */
  const renderStep = () => {
    if (!draft) return null;
    switch (stepIndex) {
      case 0:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <SectionTitle icon='forward_to_inbox'>ข้อมูลส่งตรวจ</SectionTitle>
            <FieldGrid cols={2}>
              <Field label='หน่วยบริการต้นทาง' required>
                <Select
                  showLabel={false}
                  size='lg'
                  searchable
                  disabled={readOnly}
                  value={draft.referral.originUnit}
                  onChange={(v) => setSection('referral', { originUnit: v })}
                  options={TELEMED_ORIGIN_UNITS.map((u) => ({ value: u, label: u }))}
                  placeholder='เลือกหน่วยบริการต้นทาง'
                />
                {issueFor('originUnit') && <InlineIssue>{issueFor('originUnit')}</InlineIssue>}
              </Field>
              <Field label='แผนกที่ส่งตรวจ' required>
                <Select
                  showLabel={false}
                  size='lg'
                  searchable={false}
                  disabled={readOnly}
                  value={draft.referral.department}
                  onChange={(v) => setSection('referral', { department: v })}
                  options={TELEMED_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                  placeholder='เลือกแผนก'
                />
                {issueFor('department') && <InlineIssue>{issueFor('department')}</InlineIssue>}
              </Field>
              <Field label='แพทย์ผู้ให้บริการ'>
                <Select
                  showLabel={false}
                  size='lg'
                  searchable={false}
                  disabled={readOnly}
                  value={draft.referral.doctor}
                  onChange={(v) => setSection('referral', { doctor: v })}
                  options={TELEMED_DOCTORS.map((d) => ({ value: d, label: d }))}
                />
              </Field>
              <Field label='สถานะการส่งตรวจ'>
                <Select
                  showLabel={false}
                  size='lg'
                  searchable={false}
                  disabled={readOnly}
                  value={draft.referral.status}
                  onChange={(v) => setSection('referral', { status: v })}
                  options={REFERRAL_STATUS_OPTIONS}
                />
              </Field>
              <Field label='Authen Code สปสช.'>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  disabled={readOnly}
                  value={draft.referral.authenCode}
                  onChange={(v) => setSection('referral', { authenCode: typeof v === 'string' ? v : v?.target?.value })}
                  placeholder='เช่น AUT-6801-2394'
                />
              </Field>
            </FieldGrid>
            <Field label='อาการเบื้องต้น / เหตุผลที่ส่งปรึกษา' required>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={SUGGEST_SYMPTOM}
                disabled={readOnly}
                value={draft.referral.chiefComplaint}
                onChange={(v) => setSection('referral', { chiefComplaint: v })}
                placeholder='อาการที่หน่วยบริการต้นทางแจ้งมา'
                height={120}
              />
              {issueFor('chiefComplaint') && <InlineIssue>{issueFor('chiefComplaint')}</InlineIssue>}
            </Field>
            <Field label='หมายเหตุ'>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={[
                  'ผู้รับบริการอยู่บ้านคนเดียว ต้องมีผู้ช่วยถือโทรศัพท์',
                  'สัญญาณอินเทอร์เน็ตที่บ้านไม่เสถียร อาจต้องใช้โหมดเสียงอย่างเดียว',
                  'ผู้รับบริการมีปัญหาการได้ยิน ต้องพูดช้าและชัด',
                ]}
                disabled={readOnly}
                value={draft.referral.note}
                onChange={(v) => setSection('referral', { note: v })}
                placeholder='บริบทเพิ่มเติมสำหรับผู้ให้บริการ'
                height={100}
              />
            </Field>
          </div>
        );

      case 1:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <SectionTitle icon='ecg_heart'>ซักประวัติ + สัญญาณชีพ</SectionTitle>
            <PageBanner tone='info' icon='bluetooth_connected' title={`ที่มาของค่า: ${RPM_SOURCE[draft.vitals.vitalSource]?.label || 'ไม่ระบุ'}`}>
              {rpm?.latest
                ? `ค่าเริ่มต้นดึงจากค่าล่าสุดของอุปกรณ์ที่บ้าน เมื่อ ${formatThaiDateTime(rpm.latest.at)} — แก้ไขได้ตามที่วัดจริงระหว่างสาย`
                : 'ผู้รับบริการรายนี้ยังไม่ได้ลงทะเบียนอุปกรณ์ RPM — กรอกค่าที่วัดได้ระหว่างสาย'}
            </PageBanner>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--dim-space-400)' }}>
              {VITAL_ROWS.map(([k, unit]) => (
                <div key={k} className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                    {`${VITAL_LABELS[k]} (${unit})`}
                  </span>
                  <InputField
                    size='lg'
                    showLabel={false}
                    showHelperText={false}
                    disabled={readOnly}
                    value={draft.vitals[k]}
                    onChange={(v) => setSection('vitals', { [k]: typeof v === 'string' ? v : v?.target?.value })}
                    placeholder='—'
                  />
                  {issueFor(k) && <InlineIssue>{issueFor(k)}</InlineIssue>}
                </div>
              ))}
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>สถานะ DTX ก่อน/หลังอาหาร</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={readOnly}
                  value={draft.vitals.dtxMeal}
                  onChange={(v) => setSection('vitals', { dtxMeal: v })}
                  options={DTX_MEAL_STATE}
                />
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>ที่มาของค่า</span>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={readOnly}
                  value={draft.vitals.vitalSource}
                  onChange={(v) => setSection('vitals', { vitalSource: v })}
                  options={Object.keys(RPM_SOURCE).map((k) => ({ value: k, label: RPM_SOURCE[k].label }))}
                />
              </div>
            </div>
            {softWarns.length > 0 && (
              <PageBanner tone='warning' icon='warning' title='ค่าผิดปกติแต่บันทึกได้'>
                {softWarns.join(' · ')}
              </PageBanner>
            )}
          </div>
        );

      case 2:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <SectionTitle icon='diagnosis'>ประเมิน / วินิจฉัย</SectionTitle>
            <Field label='บันทึกข้ออาการ' required>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={SUGGEST_SYMPTOM}
                disabled={readOnly}
                value={draft.assessment.symptoms}
                onChange={(v) => setSection('assessment', { symptoms: v })}
                placeholder='อาการที่ประเมินได้จากการสังเกตและซักถามระหว่างสาย'
                height={140}
              />
              {issueFor('symptoms') && <InlineIssue>{issueFor('symptoms')}</InlineIssue>}
            </Field>
            <Field label='สรุปผลวินิจฉัย' required>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={SUGGEST_DIAGNOSIS}
                disabled={readOnly}
                value={draft.assessment.diagnosis}
                onChange={(v) => setSection('assessment', { diagnosis: v })}
                placeholder='เช่น Essential hypertension, uncontrolled (I10)'
                height={110}
              />
              {issueFor('diagnosis') && <InlineIssue>{issueFor('diagnosis')}</InlineIssue>}
            </Field>
            <FieldGrid cols={2}>
              <Field label='ระดับความรุนแรง'>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={readOnly}
                  value={draft.assessment.severity}
                  onChange={(v) => setSection('assessment', { severity: v })}
                  options={SEVERITY_OPTIONS}
                />
              </Field>
            </FieldGrid>
            {draft.gis && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <SectionTitle icon='location_on'>ตำแหน่งการประเมิน (GIS)</SectionTitle>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)' }}>
                  {`${draft.gis.label} · แผนที่สาธิต ไม่ใช่พิกัดจริงจากอุปกรณ์`}
                </span>
                <AddressMapBlock value={draft.gis} readOnly heading='ตำแหน่งที่ผู้รับบริการอยู่ขณะประเมิน' hint='พิกัดจาก GIS ตอนลงทะเบียนอุปกรณ์ (ดูอย่างเดียว)' />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <SectionTitle icon='prescriptions'>คำสั่งการรักษา</SectionTitle>
            <TelemedOrderStrip
              orders={visit.orders}
              role={role}
              disabled={readOnly}
              disabledReason={
                stored?.status === 'cancelled'
                  ? 'บันทึกนี้ถูกยกเลิก — กู้คืนบันทึกก่อนจึงจะสั่งการรักษาได้'
                  : 'รายการนี้ปิดแล้ว — กด "ขอแก้ไขย้อนหลัง" ก่อนจึงจะสั่ง/ยกเลิกคำสั่งได้'
              }
              onAddOrder={(order) => {
                addTelemedOrder(visitId, { ...order, by: telemedActor(role) }, telemedActor(role));
                logTelemedEvent(role, 'สั่งการรักษาจากหน้าบันทึกการประเมิน', { detail: order.label });
              }}
              onCancelOrder={(orderId, reason) => {
                cancelTelemedOrder(visitId, orderId, reason, telemedActor(role));
                logTelemedEvent(role, 'ยกเลิกคำสั่งการรักษา', { detail: reason });
              }}
            />
            <Field label='การให้คำแนะนำ' required>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={SUGGEST_ADVICE}
                disabled={readOnly}
                value={draft.plan.advice}
                onChange={(v) => setSection('plan', { advice: v })}
                placeholder='คำแนะนำที่ให้ผู้รับบริการระหว่างสาย'
                height={130}
              />
              {issueFor('advice') && <InlineIssue>{issueFor('advice')}</InlineIssue>}
            </Field>
            <Field label='แผนการรักษา / เกณฑ์ส่งกลับ' required>
              <SuggestibleTextarea
                voice
                minChars={3}
                suggestions={SUGGEST_PLAN}
                disabled={readOnly}
                value={draft.plan.treatmentPlan}
                onChange={(v) => setSection('plan', { treatmentPlan: v })}
                placeholder='แผนการรักษา · เกณฑ์ส่งกลับ รพ.สต. · เกณฑ์ส่งปรึกษาอายุรแพทย์'
                height={130}
              />
              {issueFor('treatmentPlan') && <InlineIssue>{issueFor('treatmentPlan')}</InlineIssue>}
            </Field>
            <FieldGrid cols={2}>
              <Field label='การดำเนินการถัดไป'>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={readOnly}
                  value={draft.plan.nextAction}
                  onChange={(v) => setSection('plan', { nextAction: v })}
                  options={NEXT_ACTION_OPTIONS}
                />
              </Field>
              <Field label='นัดครั้งถัดไป'>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  disabled={readOnly}
                  value={draft.plan.nextAppointment}
                  onChange={(v) => setSection('plan', { nextAppointment: typeof v === 'string' ? v : v?.target?.value })}
                  placeholder='เช่น 2569-09-02'
                />
              </Field>
            </FieldGrid>
          </div>
        );

      case 4:
      default:
        return (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
            <SectionTitle icon='photo_library'>หลักฐานการให้บริการ</SectionTitle>
            {!claimReady && (
              <PageBanner tone='warning' icon='receipt_long' title='ยังเบิกจ่ายไม่ได้'>
                ต้องมีภาพหลักฐานอย่างน้อย 1 ไฟล์ และระบุวันที่/เวลาเริ่ม-สิ้นสุดการให้บริการ (คู่มือ 5.3.5) — บันทึกร่างไว้ก่อนได้
              </PageBanner>
            )}
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <BrandSubdueButton
                size='md'
                variant='outline'
                leadingIcon='upload'
                disabled={readOnly}
                onClick={() => handleAddEvidence({ name: `telemed-evidence-${Date.now()}.png`, type: 'image/png', sizeMb: 0.8 })}
              >
                อัพโหลดภาพหลักฐาน
              </BrandSubdueButton>
              <NeutralSubdueButton
                size='md'
                variant='outline'
                leadingIcon='picture_as_pdf'
                disabled={readOnly}
                onClick={() => handleAddEvidence({ name: `telemed-summary-${Date.now()}.pdf`, type: 'application/pdf', sizeMb: 1.4 })}
              >
                แนบไฟล์ PDF
              </NeutralSubdueButton>
              <NeutralSubdueButton
                size='md'
                variant='outline'
                leadingIcon='bug_report'
                disabled={readOnly}
                onClick={() => handleAddEvidence({ name: 'video-too-large.mov', type: 'video/quicktime', sizeMb: 42 })}
              >
                ทดสอบไฟล์ผิดชนิด
              </NeutralSubdueButton>
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                {`รับเฉพาะ ${TELEMED_EVIDENCE_ACCEPT_LABEL} · ไม่เกิน ${TELEMED_EVIDENCE_MAX_MB} MB`}
              </span>
            </div>
            {evidenceError && <InlineIssue>{evidenceError}</InlineIssue>}
            {issueFor('files') && <InlineIssue>{issueFor('files')}</InlineIssue>}

            <Table
              columns={[
                { key: 'name', label: 'ไฟล์', flex: true, minWidth: 220, sortable: false },
                { key: 'kind', label: 'ชนิด', width: 100, sortable: false, render: (r) => (
                  <ColorfulBadge style={r.kind === 'pdf' ? 'red' : 'blue'} size='small' hierarchy='secondary'>
                    {r.kind === 'pdf' ? 'PDF' : 'ภาพ'}
                  </ColorfulBadge>
                ) },
                { key: 'size', label: 'ขนาด', width: 100, sortable: false },
                { key: 'at', label: 'อัพโหลดเมื่อ', width: 200, sortable: false, render: (r) => formatThaiDateTime(r.at) },
                { key: 'by', label: 'ผู้อัพโหลด', width: 180, sortable: false },
                { key: 'act', label: 'การจัดการ', width: 130, sortable: false, render: (r) => (
                  <NeutralSubdueButton
                    size='sm'
                    variant='outline'
                    leadingIcon='delete'
                    disabled={readOnly}
                    onClick={() => {
                      removeTelemedEvidence(visitId, r.id, 'ลบจากหน้าบันทึกการประเมิน', telemedActor(role));
                      setSection('evidence', { files: draft.evidence.files.filter((f) => f.id !== r.id) });
                      logTelemedEvent(role, 'ลบหลักฐานการให้บริการ', { detail: r.name });
                    }}
                  >
                    ลบ
                  </NeutralSubdueButton>
                ) },
              ]}
              rows={draft.evidence.files || []}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีภาพหลักฐานการให้บริการ'
              emptySubtext='อัพโหลดภาพหน้าจอระหว่างสายหรือเอกสารสรุปเพื่อใช้ประกอบการเบิกจ่าย'
            />

            <SectionTitle icon='schedule'>วันที่และเวลาให้บริการ</SectionTitle>
            <FieldGrid cols={2}>
              <Field label='เวลาเริ่มให้บริการ' required>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  disabled={readOnly}
                  value={draft.evidence.startedAt ? formatThaiDateTime(draft.evidence.startedAt) : ''}
                  onChange={() => {}}
                  placeholder='กด "ใช้เวลาปัจจุบัน"'
                />
              </Field>
              <Field label='เวลาสิ้นสุดการให้บริการ' required>
                <InputField
                  size='lg'
                  showLabel={false}
                  showHelperText={false}
                  disabled={readOnly}
                  value={draft.evidence.endedAt ? formatThaiDateTime(draft.evidence.endedAt) : ''}
                  onChange={() => {}}
                  placeholder='กด "ใช้เวลาปัจจุบัน"'
                />
              </Field>
            </FieldGrid>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <NeutralSubdueButton
                size='md'
                variant='outline'
                leadingIcon='play_arrow'
                disabled={readOnly}
                onClick={() => {
                  const now = new Date().toISOString();
                  setSection('evidence', { startedAt: now });
                  setTelemedServiceWindow(visitId, { startedAt: now }, telemedActor(role));
                }}
              >
                บันทึกเวลาเริ่ม (ตอนนี้)
              </NeutralSubdueButton>
              <NeutralSubdueButton
                size='md'
                variant='outline'
                leadingIcon='stop'
                disabled={readOnly}
                onClick={() => {
                  const now = new Date().toISOString();
                  if (draft.evidence.startedAt && new Date(now) < new Date(draft.evidence.startedAt)) {
                    setEvidenceError('เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่ม');
                    return;
                  }
                  setSection('evidence', { endedAt: now });
                  setTelemedServiceWindow(visitId, { endedAt: now }, telemedActor(role));
                }}
              >
                บันทึกเวลาสิ้นสุด (ตอนนี้)
              </NeutralSubdueButton>
            </div>
            {issueFor('startedAt') && <InlineIssue>{issueFor('startedAt')}</InlineIssue>}

            <SectionTitle icon='verified_user'>สถานะความยินยอม PDPA</SectionTitle>
            {consent ? (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <ColorfulBadge style={consentTone(consent.status)} size='default' hierarchy='secondary'>
                  {consent.status}
                </ColorfulBadge>
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                  {`${consent.formName} · ${consent.channel} · หมดอายุ ${consent.expiryDate}`}
                </span>
                <BrandSubdueButton size='sm' variant='outline' leadingIcon='open_in_new' onClick={() => history.push('/telemed/consent')}>
                  เปิดทะเบียนความยินยอม
                </BrandSubdueButton>
              </div>
            ) : (
              <PageBanner tone='warning' icon='gpp_maybe' title='ยังไม่มีเอกสารความยินยอม'>
                บันทึกสายไม่ได้จนกว่าจะมีความยินยอม —{' '}
                <button
                  type='button'
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)', textDecoration: 'underline', fontFamily: 'inherit', fontSize: 'inherit' }}
                  onClick={() => history.push('/telemed/consent')}
                >
                  ขอความยินยอมใหม่
                </button>
              </PageBanner>
            )}
            {recordability && !recordability.allowed && (
              <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-alert-warning, #C2410C)' }}>
                {recordability.reason}
              </span>
            )}

            <SectionTitle icon='signature'>ลายเซ็นผู้บันทึก</SectionTitle>
            <ESignatureField
              value={draft.evidence.signature || ''}
              onChange={(v) => setSection('evidence', { signature: v || '' })}
              signerName={telemedActor(role)}
            />
            {issueFor('signature') && <InlineIssue>{issueFor('signature')}</InlineIssue>}
          </div>
        );
    }
  };

  /* ── แท็บ "ค่าจากอุปกรณ์" ─────────────────────────────────────────── */
  const renderDeviceTab = () => {
    if (!rpm) {
      return (
        <EmptyState
          icon='monitor_heart'
          title='ผู้รับบริการรายนี้ยังไม่ได้ลงทะเบียนอุปกรณ์ RPM'
          hint='ลงทะเบียนอุปกรณ์วัดที่บ้านที่หน่วยบริการต้นทาง แล้วค่าจะไหลเข้ามาที่นี่อัตโนมัติ'
          action={(
            <BrandSubdueButton size='md' variant='outline' leadingIcon='monitor_heart' onClick={() => history.push('/telemed/rpm')}>
              เปิดกระดาน RPM
            </BrandSubdueButton>
          )}
        />
      );
    }
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          {rpm.alerts.length === 0
            ? <ColorfulBadge style='green' size='small' hierarchy='secondary'>ค่าอยู่ในเกณฑ์ทั้งหมด</ColorfulBadge>
            : rpm.alerts.map((a) => (
              <ColorfulBadge key={a.key} style={a.level === 'critical' ? 'red' : 'orange'} size='small' hierarchy='secondary'>
                {`${a.label} — ${a.detail}`}
              </ColorfulBadge>
            ))}
        </div>
        <div style={{ height: 300 }}>
          <VitalTrendChart parameter='bp' data={toTrendData(getRpmReadings(rpm.patient.id).slice(0, 10).reverse(), 'bp')} fillHeight />
        </div>
        <Table
          columns={[
            { key: 'at', label: 'วัน-เวลา', width: 190, sortable: false, render: (r) => formatThaiDateTime(r.at) },
            { key: 'value', label: 'ค่า', flex: true, minWidth: 220, sortable: false, render: (r) => {
              const parts = [];
              if (r.bpSys != null) parts.push(`BP ${r.bpSys}/${r.bpDia}`);
              if (r.dtx != null) parts.push(`DTX ${r.dtx}`);
              if (r.o2sat != null) parts.push(`O₂ ${r.o2sat}%`);
              if (r.temp != null) parts.push(`T ${r.temp}°C`);
              if (r.pulse != null) parts.push(`PR ${r.pulse}`);
              return parts.join(' · ') || '—';
            } },
            { key: 'source', label: 'ที่มา', width: 150, sortable: false, render: (r) => (
              <ColorfulBadge style={RPM_SOURCE[r.source]?.tone || 'grey'} size='small' hierarchy='secondary'>
                {RPM_SOURCE[r.source]?.label}
              </ColorfulBadge>
            ) },
            { key: 'audit', label: 'ผู้บันทึก / แก้ไข', width: 240, sortable: false, render: (r) => (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                {r.recordedBy && <AuditStamp action='บันทึก' by={r.recordedBy} at={r.at} />}
                {r.editedBy && <AuditStamp action='แก้ไข' by={r.editedBy} at={r.editedAt} />}
                {r.cancelled && (
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-alert-error, #B91C1C)' }}>
                    {`ยกเลิกโดย ${r.cancelled.by} · ${r.cancelled.reason}`}
                  </span>
                )}
              </div>
            ) },
            { key: 'act', label: 'การจัดการ', width: 220, sortable: false, render: (r) => (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
                <NeutralSubdueButton
                  size='sm'
                  variant='outline'
                  leadingIcon='edit'
                  disabled={!canEditRpm || Boolean(r.cancelled)}
                  title={canEditRpm ? undefined : telemedDenyReason(role, 'editRpm')}
                  onClick={() => {
                    setReadingEdit({
                      reading: r,
                      values: ['bpSys', 'bpDia', 'dtx', 'o2sat', 'temp', 'pulse']
                        .reduce((acc, k) => ({ ...acc, [k]: r[k] ?? '' }), {}),
                    });
                    setReadingReason('');
                    setReadingError('');
                  }}
                >
                  แก้ไข
                </NeutralSubdueButton>
                <NeutralSubdueButton
                  size='sm'
                  variant='outline'
                  leadingIcon='block'
                  disabled={!canEditRpm || Boolean(r.cancelled)}
                  title={canEditRpm ? undefined : telemedDenyReason(role, 'editRpm')}
                  onClick={() => {
                    const result = cancelRpmReading(r.id, 'ยกเลิกจากหน้าบันทึกการประเมิน', telemedActor(role));
                    if (result.ok) logTelemedEvent(role, 'ยกเลิกค่าจากอุปกรณ์');
                  }}
                >
                  ยกเลิก
                </NeutralSubdueButton>
              </div>
            ) },
          ]}
          rows={rpm.readings}
          rowKey={(r) => r.id}
          emptyMessage='ยังไม่มีค่าที่รับเข้าระบบ'
        />
      </div>
    );
  };

  /* ── แท็บ "ประวัติการแก้ไขข้อมูล" ─────────────────────────────────── */
  const renderHistoryTab = () => {
    const rows = [
      ...(stored?.history || []).map((h) => ({ ...h, scope: 'การประเมิน' })),
      ...(visit.audit || []).map((a) => ({ ...a, scope: 'รายการนัด' })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at));
    if (rows.length === 0) {
      return <EmptyState icon='history' title='ยังไม่มีประวัติการแก้ไข' hint='เมื่อมีการบันทึก แก้ไข หรือยกเลิกข้อมูล ระบบจะบันทึกไว้ที่นี่พร้อมผู้ทำและเวลา' />;
    }
    return (
      <Table
        columns={[
          { key: 'at', label: 'วัน-เวลา', width: 200, sortable: false, render: (r) => formatThaiDateTime(r.at) },
          { key: 'by', label: 'ผู้ดำเนินการ', width: 200, sortable: false },
          { key: 'scope', label: 'ส่วนของข้อมูล', width: 140, sortable: false, render: (r) => (
            <ColorfulBadge style={r.scope === 'การประเมิน' ? 'teal' : 'indigo'} size='small' hierarchy='secondary'>{r.scope}</ColorfulBadge>
          ) },
          { key: 'action', label: 'การกระทำ', flex: true, minWidth: 200, sortable: false },
          { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 220, sortable: false, render: (r) => r.detail || '—' },
          { key: 'reason', label: 'เหตุผล', flex: true, minWidth: 200, sortable: false, render: (r) => r.reason || '—' },
        ]}
        rows={rows}
        rowKey={(r) => r.id || `${r.at}-${r.action}`}
        emptyMessage='ยังไม่มีประวัติการแก้ไข'
      />
    );
  };

  const isLast = stepIndex === ASSESSMENT_STEPS.length - 1;

  return (
    <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='telemed' />
      <div className='flex-1 min-w-0 flex flex-col'>
        <Header breadcrumb={['ระบบ Telemedicine', 'บันทึกการประเมินทางไกล']} />

        <PatientCard
          sticky
          patient={cardPatient}
          title='บันทึกการประเมินทางไกล (Telemedicine)'
          actions={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <RoleSwitcher role={role} onChange={setRole} />
              <BrandSubdueButton variant='outline' size='md' leadingIcon='print' onClick={() => { logTelemedEvent(role, 'พิมพ์ใบสรุปการให้บริการทางไกล'); window.print(); }}>
                พิมพ์ใบสรุปการให้บริการ
              </BrandSubdueButton>
              {stored?.status === 'cancelled' ? (
                <BrandSubdueButton
                  variant='outline'
                  size='md'
                  leadingIcon='restore'
                  disabled={!canCancel}
                  onClick={() => { restoreAssessment(visitId, telemedActor(role)); setToast('กู้คืนบันทึกแล้ว'); }}
                >
                  กู้คืนบันทึก
                </BrandSubdueButton>
              ) : (
                <NeutralSubdueButton
                  size='md'
                  leadingIcon='block'
                  disabled={!canCancel || !stored}
                  title={!canCancel ? telemedDenyReason(role, 'cancel') : !stored ? 'ยังไม่มีบันทึกให้ยกเลิก' : undefined}
                  onClick={() => { setCancelReason(''); setCancelError(''); setCancelOpen(true); }}
                >
                  ยกเลิกบันทึก
                </NeutralSubdueButton>
              )}
            </div>
          )}
        />

        <main className='flex-1 min-w-0 flex flex-col'>
          {/* banners */}
          <div
            className='flex flex-col'
            style={{
              gap: 'var(--dim-space-200)',
              paddingTop: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
            }}
          >
            {stored?.status === 'cancelled' && (
              <PageBanner tone='danger' icon='block' title='บันทึกนี้ถูกยกเลิก'>
                {`${stored.cancel?.by || '—'} · ${stored.cancel?.reason || '—'} — ข้อมูลยังอยู่ในระบบและกู้คืนได้`}
              </PageBanner>
            )}
            {locked && !retroApproved && (
              <PageBanner
                tone='warning'
                icon='lock'
                title='บันทึกถูกปิดการแก้ไข'
                actions={(
                  <BrandSubdueButton
                    size='sm'
                    variant='outline'
                    leadingIcon='edit_calendar'
                    disabled={!canEdit}
                    onClick={() => { setRetroReason(''); setRetroError(''); setRetroOpen(true); }}
                  >
                    ขอแก้ไขย้อนหลัง
                  </BrandSubdueButton>
                )}
              >
                รายการนี้อยู่ในสถานะ &quot;ตรวจแล้ว&quot; หรือเกิน 24 ชั่วโมง — ต้องระบุเหตุผลเพื่อขอแก้ไขย้อนหลัง (บันทึกลง audit)
              </PageBanner>
            )}
            {retroApproved && (
              <PageBanner tone='info' icon='edit_calendar' title='เปิดให้แก้ไขย้อนหลังชั่วคราว'>
                {`${stored.retroEdit.by} · ${stored.retroEdit.reason}`}
              </PageBanner>
            )}
            {!canEdit && (
              <PageBanner tone='warning' icon='visibility' title='บทบาทนี้ดูได้อย่างเดียว'>
                {telemedDenyReason(role, 'edit')}
              </PageBanner>
            )}
            {visit.rightsExpired && (
              <PageBanner tone='warning' icon='shield_question' title='สิทธิการรักษาหมดอายุ'>
                {`${visit.rights} — ตรวจสอบสิทธิและขอ Authen Code สปสช. ก่อนสั่งการรักษา`}
              </PageBanner>
            )}
            {showIssues && issues.length > 0 && (
              <PageBanner tone='danger' icon='error' title={`ยังบันทึกไม่ครบ ${issues.length} รายการ`}>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  {issues.map((i) => (
                    <button
                      key={`${i.step}-${i.field}`}
                      type='button'
                      className='text-left hover:underline'
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: 'var(--text-alert-error, #B91C1C)', fontFamily: 'inherit',
                        fontSize: 'var(--type-size-sm)',
                      }}
                      onClick={() => setStepIndex(i.step)}
                    >
                      {`· ขั้นที่ ${i.step + 1} ${ASSESSMENT_STEPS[i.step].title} — ${i.message}`}
                    </button>
                  ))}
                </div>
              </PageBanner>
            )}
          </div>

          {/* page-level tabs */}
          <div
            className='w-full'
            style={{
              paddingTop: 'var(--dim-space-300)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
            }}
          >
            <TabUnderline tabs={ASSESSMENT_TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }))} value={tab} onChange={setTab} />
          </div>

          {tab === 'current' && (
            <RecordWizardMorphBand
              title='ประเมินผู้ป่วย Telemedicine'
              steps={ASSESSMENT_STEPS}
              current={stepIndex}
              completedSteps={completedSteps}
              onStepClick={setStepIndex}
              stickyTop={MORPH_STICKY_BELOW_PATIENT}
            />
          )}

          <div
            className='flex-1 flex flex-col min-h-0'
            style={{ paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}
          >
            {tab === 'current' ? (
              <div className='flex flex-col w-full flex-1 min-h-0' style={cardStyle}>
                <div
                  className='flex flex-1 flex-col min-h-0'
                  style={{ paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}
                >
                  {renderStep()}
                </div>
              </div>
            ) : tab === 'device' ? (
              <div className='flex flex-col w-full' style={{ ...cardStyle, paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}>
                {renderDeviceTab()}
              </div>
            ) : (
              <div className='flex flex-col w-full' style={{ ...cardStyle, paddingTop: 'var(--dim-space-600)', paddingBottom: 'var(--dim-space-600)', paddingLeft: 'var(--dim-space-600)', paddingRight: 'var(--dim-space-600)' }}>
                {renderHistoryTab()}
              </div>
            )}
          </div>

          {/* footer — โครงเดียวกับ TreatmentFormShell แต่ผูก handler จริง */}
          {tab === 'current' && (
            <div
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-400)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                background: 'var(--surface-navigation-default)',
                boxShadow: 'var(--shadow-brand-drop-top-100)',
                position: 'sticky',
                bottom: 'var(--dim-space-0)',
                zIndex: 60,
              }}
            >
              <NeutralSubdueButton
                size='lg'
                leadingIcon={stepIndex === 0 ? undefined : 'arrow_back'}
                onClick={() => (stepIndex === 0 ? handleBack() : setStepIndex(stepIndex - 1))}
                className='shrink-0'
              >
                {stepIndex === 0 ? 'ยกเลิก' : 'ย้อนกลับ'}
              </NeutralSubdueButton>
              <span
                className='inline-flex items-center min-w-0'
                style={{
                  gap: 'var(--dim-space-200)',
                  color: 'var(--text-content-secondary)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                }}
              >
                <span style={{ width: 'var(--dim-space-150, 6px)', height: 'var(--dim-space-150, 6px)', borderRadius: 'var(--dim-radius-full)', background: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
                {stored
                  ? `${stored.status === 'final' ? 'บันทึกสมบูรณ์' : 'ร่างแบบฟอร์ม'} · แก้ไขล่าสุด ${stored.updatedBy || stored.createdBy} ${formatClock(stored.updatedAt || stored.createdAt)}`
                  : 'ยังไม่เคยบันทึก'}
                {dirty ? ' · มีการแก้ไขที่ยังไม่บันทึก' : ''}
              </span>
              <div className='flex-1' />
              <BrandSubdueButton
                variant='outline'
                size='lg'
                leadingIcon='save'
                disabled={readOnly}
                title={readOnly ? 'บันทึกถูกปิดการแก้ไข' : undefined}
                onClick={() => handleSaveDraft()}
              >
                บันทึกร่าง
              </BrandSubdueButton>
              <BrandPrimaryButton
                size='lg'
                trailingIcon='arrow_forward'
                disabled={readOnly && isLast}
                onClick={() => (isLast ? handleFinish() : setStepIndex(stepIndex + 1))}
              >
                {isLast ? 'จบการบันทึก' : `ถัดไป: ${ASSESSMENT_STEPS[stepIndex + 1].title}`}
              </BrandPrimaryButton>
            </div>
          )}

          <Footer />
        </main>
      </div>

      {/* ── ทิ้งการแก้ไข ── */}
      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ทิ้งการแก้ไขที่ยังไม่ได้บันทึก?'
        description='ข้อมูลที่กรอกไว้จะหายไป — เลือก "บันทึกร่าง" เพื่อเก็บไว้ก่อน'
        cancelLabel='บันทึกร่างแล้วออก'
        confirmLabel='ทิ้งการแก้ไข'
        onCancel={() => {
          /* ออกได้ก็ต่อเมื่อบันทึกลง store จริงแล้ว — ถ้าเป็นบันทึกสมบูรณ์
             จะเปิดป๊อปอัพเหตุผลก่อน แล้วค่อยออกหลังยืนยัน (exitAfter) */
          const persisted = handleSaveDraft({ exitAfter: true });
          setConfirmDiscard(false);
          if (persisted) history.push('/telemed/worklist');
        }}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => { setConfirmDiscard(false); setDirty(false); history.push('/telemed/worklist'); }}
      />

      {/* ── แก้ไขพร้อมเหตุผล ── */}
      <Popup
        open={Boolean(amendTarget)}
        onClose={() => setAmendTarget(null)}
        title='บันทึกเหตุผลการแก้ไข'
        subtitle={amendTarget
          ? `ส่วนที่เปลี่ยนแปลง: ${(amendTarget.changes || [])
            .map(({ section }) => ASSESSMENT_STEPS[ASSESSMENT_SECTIONS.indexOf(section)]?.title || section)
            .join(', ')}`
          : ''}
        width={560}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setAmendTarget(null) }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: confirmAmend }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={amendReason}
            onChange={(v) => { setAmendReason(v); if (amendError) setAmendError(''); }}
            placeholder='เหตุผลการแก้ไข (บังคับ)'
            height={110}
          />
          {amendError && <InlineIssue>{amendError}</InlineIssue>}
        </div>
      </Popup>

      {/* ── ยกเลิกบันทึก ── */}
      <AlertDialog
        open={cancelOpen}
        type='destructive'
        title='ยกเลิกบันทึกการประเมิน'
        description='บันทึกจะถูกทำเครื่องหมายว่ายกเลิก แต่ยังคงอยู่ในระบบและกู้คืนได้'
        cancelLabel='ไม่ยกเลิก'
        confirmLabel='ยืนยันยกเลิกบันทึก'
        onCancel={() => setCancelOpen(false)}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancelAssessment}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (cancelError) setCancelError(''); }}
            placeholder='เหตุผลการยกเลิก (บังคับ)'
            height={110}
          />
          {cancelError && <InlineIssue>{cancelError}</InlineIssue>}
        </div>
      </AlertDialog>

      {/* ── ขอแก้ไขย้อนหลัง ── */}
      <AlertDialog
        open={retroOpen}
        type='warning'
        title='ขอแก้ไขบันทึกย้อนหลัง'
        description='ระบุเหตุผล — ระบบจะเปิดให้แก้ไขชั่วคราวและบันทึกคำขอนี้ลงประวัติการใช้งาน'
        cancelLabel='ยกเลิก'
        confirmLabel='ส่งคำขอและเปิดแก้ไข'
        onCancel={() => setRetroOpen(false)}
        onClose={() => setRetroOpen(false)}
        onConfirm={confirmRetro}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <SuggestibleTextarea
            voice
            minChars={3}
            suggestions={SUGGEST_REASON}
            value={retroReason}
            onChange={(v) => { setRetroReason(v); if (retroError) setRetroError(''); }}
            placeholder='เหตุผลการขอแก้ไขย้อนหลัง (บังคับ)'
            height={110}
          />
          {retroError && <InlineIssue>{retroError}</InlineIssue>}
        </div>
      </AlertDialog>

      {/* ── แก้ไขค่าจากอุปกรณ์ ── */}
      <Popup
        open={Boolean(readingEdit)}
        onClose={() => setReadingEdit(null)}
        title='แก้ไขค่าที่รับจากอุปกรณ์'
        subtitle={readingEdit ? formatThaiDateTime(readingEdit.reading.at) : ''}
        width={600}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setReadingEdit(null) }}
        primaryAction={{ label: 'บันทึกการแก้ไข', onClick: confirmReadingEdit }}
      >
        {readingEdit && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
              {['bpSys', 'bpDia', 'dtx', 'o2sat', 'temp', 'pulse'].map((k) => (
                <div key={k} className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>{VITAL_LABELS[k] || k}</span>
                  <InputField
                    size='lg'
                    showLabel={false}
                    showHelperText={false}
                    value={String(readingEdit.values[k] ?? '')}
                    onChange={(v) => setReadingEdit((s) => ({ ...s, values: { ...s.values, [k]: typeof v === 'string' ? v : v?.target?.value } }))}
                  />
                </div>
              ))}
            </div>
            <SuggestibleTextarea
              voice
              minChars={3}
              suggestions={SUGGEST_REASON}
              value={readingReason}
              onChange={(v) => { setReadingReason(v); if (readingError) setReadingError(''); }}
              placeholder='เหตุผลการแก้ไข (บังคับ) — ค่าเดิมจะถูกเก็บไว้'
              height={100}
            />
            {readingError && <InlineIssue>{readingError}</InlineIssue>}
          </div>
        )}
      </Popup>

      <AlertDialog
        open={Boolean(toast)}
        type='success'
        title='ดำเนินการแล้ว'
        description={toast || ''}
        showCancel={false}
        confirmLabel='ตกลง'
        onConfirm={() => setToast(null)}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

const InlineIssue = ({ children }) => (
  <span
    className='inline-flex items-center'
    style={{ gap: 'var(--dim-space-100)', color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-sm)' }}
  >
    <Icon name='error' size={14} />
    {children}
  </span>
);

export default TelemedAssessmentPage;
