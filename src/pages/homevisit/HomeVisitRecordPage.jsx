import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import TreatmentFormShell from '@/templates/TreatmentFormShell';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  buildHomeVisitForm,
  getHomeVisitCompletedSteps,
  getStepValidationError,
  saveHomeVisitDraft,
  clearHomeVisitDraft,
  markHomeVisitCompleted,
  getHomeVisitCompletion,
  logHomeVisitEdit,
  getHomeVisitEditLog,
  findHomeVisitAppointment,
  findHomeVisitAppointmentByHn,
  setHomeVisitStatus,
  getVisitSubmission,
  resolveSource,
} from '@/data/homevisitVisits';
import { findRegistryEntryByHn } from '@/data/homevisitRegistry';
import { HOMEVISIT_STEP_RENDERERS } from '@/pages/homevisit/HomeVisitSteps';
import {
  HomeVisitAccessGate,
  NoticeBand,
  GroupBadge,
  SourceBadge,
  FlagBadges,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitRecordPage — บันทึกประเมินการเยี่ยมบ้าน (TOR 1.10.12.2 /
   1.10.12.3 + §1.18.3–1.18.10).

   Shell บาง ๆ ตาม playbook §3 (เหมือน AncFormPage / AddictionFormPage):
   ถือ form state ก้อนเดียวข้าม 7 ขั้นตอนของ `TreatmentFormShell` โดยเนื้อหา
   แต่ละขั้นอยู่ใน `HomeVisitSteps.jsx`. เพิ่มจากคลินิกอื่น:
     • ตรวจความครบถ้วนรายขั้น (`getStepValidationError`) ก่อนปล่อยให้ไปขั้นถัดไป
     • บันทึกร่างอัตโนมัติ + กลับมาทำต่อที่ขั้นล่าสุด (แท็บ "ที่ร่างไว้")
     • เยี่ยมที่ปิดแล้วเปิดแบบอ่านอย่างเดียว จนกว่าจะกด "แก้ไขบันทึก"
       ซึ่งบันทึกผู้แก้ไข+เวลาเป็น audit trail */

const breadcrumb = ['ระบบเยี่ยมบ้าน', 'บันทึกประเมินการเยี่ยมบ้าน'];

const HOMEVISIT_STEPS = [
  { title: 'ข้อมูลทั่วไปและการเดินทาง', subtitle: 'Travel & GPS Check-in' },
  { title: 'ประวัติ',                    subtitle: 'History' },
  { title: 'สัญญาณชีพ',                  subtitle: 'Vital Signs' },
  { title: 'ประเมินและคัดกรอง',          subtitle: 'Assessment & ADL' },
  { title: 'บันทึกตามบทบาท/กิจกรรม',     subtitle: 'Care Records' },
  { title: 'สั่งการรักษา',               subtitle: 'Treatment Order' },
  { title: 'Family Folder และส่งศูนย์ฯ', subtitle: 'Family Folder & Submit' },
];

const HomeVisitRecordPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  /* นัดเยี่ยมที่กำลังบันทึก — คิวส่ง visitId มาให้; ถ้าเปิดตรงด้วย hn
     ให้หานัดของ HN นั้นแทน (deep link / ปุ่มในทะเบียน). */
  const appointment = useMemo(() => {
    if (navState?.visitId) return findHomeVisitAppointment(navState.visitId);
    if (navState?.hn) return findHomeVisitAppointmentByHn(navState.hn);
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navState?.visitId, navState?.hn]);

  const hn = appointment?.hn || navState?.hn || null;
  const visitId = appointment?.id || navState?.visitId || (hn ? `hv-adhoc-${hn}` : 'hv-adhoc');

  const registryEntry = useMemo(() => (hn ? findRegistryEntryByHn(hn) : null), [hn]);

  const mrPatient = useMemo(() => {
    const p = (hn && findMrPatientByHn(hn)) || DEFAULT_MR_PATIENT;
    return { ...p, name: appointment?.name || navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [hn, appointment, navState]);

  const cardPatient = useMemo(
    () => (hn && getPatientByHN(hn)) || DEFAULT_PATIENT,
    [hn],
  );

  const seed = useMemo(
    () => buildHomeVisitForm(visitId, appointment, registryEntry),
    [visitId, appointment, registryEntry],
  );

  const [stepIndex, setStepIndexRaw] = useState(seed.stepIndex);
  const [form, setFormRaw] = useState(() => seed.form);
  const [dirty, setDirty] = useState(false);
  const [blockedMsg, setBlockedMsg] = useState('');
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const completion = useMemo(
    () => getHomeVisitCompletion(visitId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitId, tick],
  );
  const [editSession, setEditSession] = useState(null);
  const readOnly = !!completion && !editSession;

  const submission = useMemo(
    () => getVisitSubmission(visitId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitId, tick],
  );

  const setForm = (updater) => {
    setDirty(true);
    setFormRaw(updater);
  };

  /* บันทึกร่างอัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน (TreatmentFormShell ไม่มี
     callback ของปุ่ม "บันทึกร่าง") — เปิดใหม่จะกลับมาที่ขั้นล่าสุด. */
  /* สถานะคิวอัปเดตได้เฉพาะเมื่อมีนัดจริงในคิว — การเปิดบันทึกแบบ ad-hoc
     (เข้าจากหน้าติดตามด้วย hn อย่างเดียว) ต้องไม่สร้างแถวคิวปลอมขึ้นมา. */
  const hasAppointment = !!appointment;
  const syncQueueStatus = (status) => {
    if (hasAppointment) setHomeVisitStatus(visitId, status);
  };

  const formRef = useRef(form);
  formRef.current = form;
  useEffect(() => {
    if (!dirty || readOnly) return;
    saveHomeVisitDraft(visitId, formRef.current, stepIndex);
    /* visit ที่ปิดการบันทึกแล้ว (มี completion stamp) ต้องไม่ถูกดันกลับไป
       แท็บ "ที่ร่างไว้" ตอนแก้ไขหลังปิด — สถานะคิวคง 'done' ไว้. */
    if (hasAppointment && !completion) setHomeVisitStatus(visitId, 'draft');
  }, [form, stepIndex, dirty, readOnly, visitId, hasAppointment, completion]);

  /* ไปขั้นถัดไปได้เมื่อขั้นปัจจุบันครบถ้วน (ย้อนกลับไม่ตรวจ). */
  const setStepIndex = (next) => {
    if (next > stepIndex && !readOnly) {
      const err = getStepValidationError(formRef.current, stepIndex);
      if (err) {
        setBlockedMsg(err);
        return;
      }
    }
    setBlockedMsg('');
    setStepIndexRaw(next);
  };

  const handleLeave = () => {
    if (dirty && !readOnly) {
      setUnsavedOpen(true);
      return;
    }
    history.push('/homevisit');
  };

  const startEditSession = () => {
    setEditSession(logHomeVisitEdit(visitId, 'แก้ไขบันทึกการเยี่ยมหลังปิดการบันทึก'));
    setTick((t) => t + 1);
  };

  const finishVisit = () => {
    markHomeVisitCompleted(visitId);
    clearHomeVisitDraft(visitId);
    syncQueueStatus('done');
    history.push('/homevisit');
  };

  const editLog = useMemo(
    () => getHomeVisitEditLog(visitId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visitId, editSession, tick],
  );

  const completedSteps = useMemo(
    () => getHomeVisitCompletedSteps(form, stepIndex),
    [form, stepIndex],
  );

  const ActiveStep = HOMEVISIT_STEP_RENDERERS[stepIndex];
  const group = registryEntry?.group || appointment?.group;
  const source = registryEntry?.source || appointment?.source;
  const flags = registryEntry?.flags || appointment?.flags || [];
  const visitNo = seed.visitNo;

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='homevisit' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          <SubHeader title={`บันทึกประเมินการเยี่ยมบ้าน — ครั้งที่ ${visitNo}`} hideBottomBorder />

          <UnsavedChangesPopup
            open={unsavedOpen}
            onClose={() => setUnsavedOpen(false)}
            onSave={() => {
              saveHomeVisitDraft(visitId, formRef.current, stepIndex);
              syncQueueStatus('draft');
              setUnsavedOpen(false);
              history.push('/homevisit');
            }}
            onDiscard={() => {
              clearHomeVisitDraft(visitId);
              setUnsavedOpen(false);
              history.push('/homevisit');
            }}
            title='ออกจากบันทึกการเยี่ยมโดยยังไม่บันทึก?'
            description='ข้อมูลที่กรอกไว้จะหายไปหากออกโดยไม่บันทึก — เลือก “บันทึกร่างและออก” เพื่อกลับมาทำต่อจากแท็บ “ที่ร่างไว้”'
          />

          <HomeVisitAccessGate subject='บันทึกการเยี่ยมบ้าน'>
            <PatientCard
              sticky
              showBack={false}
              patient={cardPatient}
              title={`บันทึกประเมินการเยี่ยมบ้าน — ครั้งที่ ${visitNo}`}
              drugAllergies={mrPatient.drugAllergies}
              chronicDiseases={mrPatient.chronicDiseases}
              tags={(
                <div className='flex items-center gap-2 flex-wrap'>
                  {group && <GroupBadge group={group} full />}
                  {source && <SourceBadge source={source} />}
                  <FlagBadges group={group} flags={flags} />
                  {(registryEntry?.confidential || appointment?.confidential) && (
                    <ColorfulBadge style='red' size='small' hierarchy='secondary'>ข้อมูลลับ §1.4.2</ColorfulBadge>
                  )}
                  {completion && (
                    <ColorfulBadge style='teal' size='small' hierarchy='secondary'>
                      ปิดการบันทึกเมื่อ {completion.at}
                    </ColorfulBadge>
                  )}
                  {submission && (
                    <ColorfulBadge style='green' size='small' hierarchy='secondary'>
                      ส่งข้อมูลเข้าศูนย์ฯ แล้ว
                    </ColorfulBadge>
                  )}
                </div>
              )}
              actions={
                readOnly ? (
                  <BrandSubdueButton variant='fill' leadingIcon='edit' onClick={startEditSession}>
                    แก้ไขบันทึก (บันทึกผู้แก้ไข)
                  </BrandSubdueButton>
                ) : (
                  <BrandSubdueButton variant='fill' leadingIcon='task_alt' onClick={finishVisit}>
                    จบการบันทึกการเยี่ยม
                  </BrandSubdueButton>
                )
              }
            />

            {!registryEntry && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='warning' icon='assignment_late'>
                  ผู้รับบริการรายนี้ยังไม่มีทะเบียนเยี่ยมบ้าน — บันทึกการเยี่ยมได้
                  แต่ควรลงทะเบียนก่อนเพื่อให้มีกลุ่มผู้รับบริการ ตำแหน่งบ้าน และรอบการติดตามที่ถูกต้อง
                </NoticeBand>
              </div>
            )}

            {seed.fromDraft && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='info' icon='history'>
                  เปิดจากแบบร่างที่บันทึกไว้เมื่อ {seed.draftSavedAt} — ทำต่อจากขั้นตอนล่าสุดได้ทันที
                </NoticeBand>
              </div>
            )}

            {source && resolveSource(source)?.auto && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='neutral' icon='link'>
                  เคสนี้รับต่อจากระบบอื่น: {resolveSource(source)?.label} — ข้อมูลที่มาถูกล็อกไว้ที่ทะเบียนผู้รับบริการ
                </NoticeBand>
              </div>
            )}

            {readOnly && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='info' icon='lock'>
                  การเยี่ยมครั้งนี้ปิดการบันทึกแล้ว — เปิดแบบอ่านอย่างเดียว กด “แก้ไขบันทึก”
                  เพื่อแก้ไข (ระบบจะบันทึกผู้แก้ไขและเวลาเป็น audit trail)
                </NoticeBand>
              </div>
            )}

            {editSession && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='warning' icon='edit'>
                  กำลังแก้ไขบันทึกหลังปิดการบันทึก — ผู้แก้ไข {editSession.by} · {editSession.at}
                  {editLog.length > 1 ? ` (แก้ไขแล้ว ${editLog.length} ครั้ง)` : ''}
                </NoticeBand>
              </div>
            )}

            <TreatmentFormShell
              morphTitle='เยี่ยมบ้าน'
              stepIndex={stepIndex}
              onStepChange={setStepIndex}
              completedSteps={completedSteps}
              steps={HOMEVISIT_STEPS}
              queuePath='/homevisit'
              step0FlushLeft={false}
              onLeave={handleLeave}
              fromDepartment='งานเยี่ยมบ้าน'
              onFinish={() => { finishVisit(); return false; }}
            onSaveDraft={() => { if (!readOnly) saveHomeVisitDraft(visitId, formRef.current, stepIndex); }}
          >
              <ActiveStep
                form={form}
                setForm={setForm}
                readOnly={readOnly}
                visitId={visitId}
                hn={hn}
                appointment={appointment}
                registryEntry={registryEntry}
                blockedMsg={blockedMsg}
                onDataChanged={() => setTick((t) => t + 1)}
              />
            </TreatmentFormShell>
          </HomeVisitAccessGate>
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default HomeVisitRecordPage;
