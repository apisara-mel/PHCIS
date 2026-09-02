import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import FollowUpStatusMenuButton from '@/components/homevisit/FollowUpStatusMenuButton';
import { useTelemedCall } from '@/components/telemed/TelemedCallProvider';
import Header, { SubHeader } from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import HomeVisitHistoryPopup from '@/components/homevisit/HomeVisitHistoryPopup';
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
} from '@/data/homevisitVisits';
import { findRegistryEntryByHn, getVisitHistory } from '@/data/homevisitRegistry';
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
  /* ลำดับเดียวกับหน้าเวชระเบียน: ยินยอมก่อน แล้วจึงข้อมูลส่วนตัว
     (มติผู้ใช้ 30 ส.ค. 69) */
  { title: 'แบบฟอร์มความยินยอม',        subtitle: 'Consent Forms' },
  { title: 'ข้อมูลส่วนตัว',             subtitle: 'Personal Information' },
  /* ที่อยู่ + ปักหมุด + บันทึกการเดินทาง + ข้อมูลการติดต่อ อยู่ขั้นเดียวกัน
     (มติผู้ใช้ 2 ก.ย. 69 — เดิมแยกเป็นขั้น "ที่อยู่และการเดินทาง" กับ
     "ข้อมูลการติดต่อ") */
  { title: 'ที่อยู่และการติดต่อ',        subtitle: 'Address & Contact' },
  { title: 'สิทธิการรักษา',              subtitle: 'Healthcare Rights' },
  /* คัดกรอง = สัญญาณชีพ + ประวัติการแพ้/โรคประจำตัว + พฤติกรรมสุขภาพ
     (มติผู้ใช้ 2 ก.ย. 69) — ถึงบ้านแล้ววัดสัญญาณชีพ ทวนประวัติแพ้/โรคประจำตัว
     และถามพฤติกรรมสุขภาพเป็นชุดเดียวกัน ก่อนเริ่มซักอาการโดยมีค่าที่วัดได้
     อยู่ตรงหน้า */
  { title: 'คัดกรอง',                    subtitle: 'Screening' },
  { title: 'ประเมินอาการป่วย',            subtitle: 'Chief Complaint & History' },
  { title: 'Family Folder',              subtitle: 'Family Folder & Submit' },
];

const HomeVisitRecordPage = () => {
  const history = useHistory();
  const { start: startTelemedCall } = useTelemedCall();
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

  /* ร่างที่บันทึกไว้ก่อนหน้าอาจชี้ขั้นที่ไม่มีแล้ว (จำนวนขั้นถูกเพิ่ม/ลบระหว่างทาง)
     — ถ้าไม่หนีบช่วง `TreatmentFormShell` จะอ่าน `steps[stepIndex + 1].title`
     ของ undefined แล้วหน้าขาวทั้งหน้า (บั๊กที่ผู้ใช้เจอ 30 ส.ค. 69) */
  const [stepIndex, setStepIndexRaw] = useState(
    () => Math.min(Math.max(0, seed.stepIndex ?? 0), HOMEVISIT_STEPS.length - 1),
  );
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

  /* มติ คทง.4 — แจ้งเตือนการบันทึกบริการซ้ำซ้อนในวันเดียวกัน: ค่าตอบแทน
     CG/อสส. ของวันเดียวกันจะชนกันแล้วเบิกไม่ได้ จึงเตือนตั้งแต่เปิดหน้า
     (ไม่บล็อก — เยี่ยมซ้ำวันเดียวกันมีเหตุจำเป็นได้ เช่น เคสฉุกเฉิน) */
  const sameDayVisit = useMemo(() => {
    if (!hn) return null;
    const today = new Date().toISOString().slice(0, 10);
    return (getVisitHistory(hn) || []).find((h) => {
      const d = String(h.date || h.visitDate || '').slice(0, 10);
      return d === today && h.visitId !== visitId;
    }) || null;
  }, [hn, visitId]);

  /* identity ต้องคงที่ — RegistrationSteps ใส่ `setForm` ไว้ใน deps ของ
     เอฟเฟกต์ mirror ที่อยู่ ถ้าสร้างใหม่ทุกเรนเดอร์จะวนไม่รู้จบ */
  const setForm = useCallback((updater) => {
    setDirty(true);
    setFormRaw(updater);
  }, []);

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

  /* ข้ามขั้นได้อิสระ (มติผู้ใช้ 30 ส.ค. 69) — ทีมเยี่ยมบ้านทำงานที่บ้านผู้รับบริการ
     ลำดับจริงไม่ได้เรียงตามฟอร์มเสมอ (บางบ้านวัดสัญญาณชีพก่อนซักประวัติ บางบ้าน
     ต้องข้ามไปสั่งการรักษาก่อนแล้วย้อนกลับมา) การล็อกไม่ให้ไปขั้นถัดไปจึงขวางงาน
     มากกว่าช่วย · ยังคำนวณข้อความ "ยังกรอกไม่ครบ" ไว้เตือนที่หัวขั้น แต่ไม่บล็อก */
  const setStepIndex = (next) => {
    setBlockedMsg(
      next > stepIndex && !readOnly
        ? (getStepValidationError(formRef.current, stepIndex) || '')
        : '',
    );
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

  /* ป๊อปอัปประวัติการเยี่ยมบ้าน — เปิดจากหัวแฟ้มระหว่างกำลังบันทึกอยู่ได้เลย
     (มติผู้ใช้ 30 ส.ค. 69) ทรงเดียวกับป๊อปอัป "ข้อมูลทางการแพทย์ (EMR)" */
  const [visitHistoryOpen, setVisitHistoryOpen] = useState(false);
  /* อ่านบัตรสมาร์ทการ์ดที่หน้างาน (TOR ๑.๑.๑.๗ — ปุ่มชุดเดียวกับหน้าเวชระเบียน)
     ทีมเยี่ยมบ้านพกเครื่องอ่านบัตรไปด้วย จึงยืนยันตัวตนและดึงที่อยู่ตามบัตรได้
     ที่บ้านเลย (มติผู้ใช้ 30 ส.ค. 69) · เดโมนี้เติมที่อยู่จากทะเบียนกลางแทนการ
     อ่านชิปจริง แล้วบอกผลด้วยแถบข้อความ */
  const [smartCardMsg, setSmartCardMsg] = useState('');

  const readSmartCard = () => {
    const addr = mrPatient?.address;
    if (!addr) {
      setSmartCardMsg('อ่านบัตรไม่สำเร็จ — ไม่พบข้อมูลที่อยู่ตามบัตรของผู้รับบริการรายนี้');
      return;
    }
    setForm((f) => ({
      ...f,
      addressRegistered: { ...f.addressRegistered, ...addr },
    }));
    setSmartCardMsg(`อ่านบัตรสำเร็จ — เติมที่อยู่ตามบัตรให้ในขั้น "ที่อยู่และการเดินทาง" แล้ว (${mrPatient.prefixTh || ''}${mrPatient.firstNameTh || ''} ${mrPatient.lastNameTh || ''})`);
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
          {/* ปุ่มประวัติการเยี่ยมบ้านอยู่แถวเดียวกับ "ขอเข้าถึงข้อมูล" ของ SubHeader
              (มติผู้ใช้ 30 ส.ค. 69) — สองปุ่มนี้เป็นทางเข้าไปดูข้อมูลย้อนหลังเหมือนกัน
              ควรอยู่ที่เดียวกัน ไม่ใช่กระจายอยู่บนหัวแฟ้มอีกจุด */}
          <SubHeader title={`บันทึกประเมินการเยี่ยมบ้าน — ครั้งที่ ${visitNo}`} hideBottomBorder>
            {/* ปรึกษาแพทย์ทางไกลอยู่หน้าสุดของแถว (มติผู้ใช้ 30 ส.ค. 69) — ที่บ้าน
                ต้องเรียกแพทย์ได้ทันทีที่เจอเรื่องเกินมือ ไม่ต้องเดินไปหาปุ่มในขั้น
                ที่กำลังกรอกอยู่ · พาไปที่เดียวกับปุ่มในขั้น "ประเมินอาการป่วย"
                และบันทึกร่างก่อนออกจากหน้าเหมือนกัน */}
            <BrandSubdueButton
              variant='fill'
              size='sm'
              leadingIcon='videocam'
              /* เปิด "ห้องตรวจรักษาออนไลน์" เป็นป๊อปอัปทับหน้าเดิม (มติผู้ใช้
                 2 ก.ย. 69) — เดิมพาออกไปหน้า /telemed/worklist ทำให้บันทึกที่
                 กรอกค้างไว้หายไปจากจอ ทีมต้องเดินทางกลับเข้ามาใหม่ทุกครั้ง
                 ป๊อปอัปมาจาก TelemedCallProvider ซึ่ง mount อยู่เหนือ router */
              onClick={() => {
                saveHomeVisitDraft(visitId, formRef.current, stepIndex);
                setForm((f) => ({ ...f, telemedRequested: true }));
                startTelemedCall({ visitId });
              }}
            >
              ปรึกษาแพทย์ทางไกล
            </BrandSubdueButton>
            {/* ติดตามสถานะโครงการที่ผู้รับบริการเข้าร่วม — ตอนนี้มีโครงการผ้าอ้อม
                (มติผู้ใช้ 2 ก.ย. 69) ที่บ้านมักถามเรื่องรอบการรับของ ทีมจึงต้อง
                ตอบได้โดยไม่ต้องออกจากบันทึกการเยี่ยม */}
            <FollowUpStatusMenuButton hn={hn} />
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='history'
              onClick={() => setVisitHistoryOpen(true)}
            >
              ประวัติการเยี่ยมบ้าน
            </BrandSubdueButton>
            {/* อ่านบัตรสมาร์ทการ์ดอยู่ขวาสุดและเป็นปุ่มหลัก (มติผู้ใช้ 30 ส.ค. 69)
                — เป็นการกระทำแรกที่ทีมทำเมื่อไปถึงบ้าน จึงเด่นกว่าปุ่มอ่านข้อมูล */}
            <BrandPrimaryButton
              size='sm'
              leadingIcon='credit_card'
              onClick={readSmartCard}
            >
              อ่านบัตรสมาร์ทการ์ด
            </BrandPrimaryButton>
          </SubHeader>

          <HomeVisitHistoryPopup
            open={visitHistoryOpen}
            onClose={() => setVisitHistoryOpen(false)}
            hn={hn}
            patientName={registryEntry?.name || appointment?.name}
          />

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
              /* `embedded` = ไม่วาดแถวหัวการ์ด (ชื่อหน้า + ปุ่ม) ทั้งแถว
                 (มติผู้ใช้ 30 ส.ค. 69) — SubHeader ด้านบนบอกอยู่แล้วว่าอยู่หน้าไหน
                 ส่วนการปิดบันทึกทำได้ที่ปุ่มขั้นสุดท้ายของวิซาร์ด */
              embedded
              /* ไม่มีปุ่ม "ข้อมูลทางการแพทย์ (EMR)" บนหัวแฟ้มของหน้านี้
                 (มติผู้ใช้ 30 ส.ค. 69) — ทางเข้าดูข้อมูลย้อนหลังของงานเยี่ยมบ้านคือ
                 ปุ่ม "ประวัติการเยี่ยมบ้าน" บนแถบหัวข้อ */
              showMedicalHistory={false}
              /* ป้ายกลุ่ม/แหล่งรับเข้า อยู่แถวเดียวกับ แพ้ยา/โรคประจำตัว
                 (มติผู้ใช้ 30 ส.ค. 69) — ป้ายไม่กี่ใบไม่ต้องกินความสูงสองแถว */
              tagsInAlertRow
              patient={cardPatient}
              /* ไม่ใส่ `title` ซ้ำแล้ว (มติผู้ใช้ 30 ส.ค. 69) — SubHeader เหนือการ์ด
                 พิมพ์ประโยคเดียวกันเป๊ะอยู่แล้ว เหลือไว้แต่ปุ่ม "จบการบันทึกการเยี่ยม"
                 ซึ่งเป็นทางลัดปิดบันทึกโดยไม่ต้องเดินไปขั้นสุดท้าย */
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
            />

            {/* ถอดแถบเตือน "ยังไม่มีทะเบียนเยี่ยมบ้าน" ออก (มติผู้ใช้ 30 ส.ค. 69)
                — เตือนสิ่งที่คนบันทึกแก้ที่หน้านี้ไม่ได้ และไม่ได้ห้ามอะไร
                (หน้าติดตามยังมีแถบของตัวเองอยู่ ที่นั่นเกี่ยวกับรอบติดตามจริง) */}

            {sameDayVisit && !readOnly && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='warning' icon='event_repeat'>
                  วันนี้มีการบันทึกบริการของผู้รับบริการรายนี้แล้ว
                  {sameDayVisit.by ? ` (โดย ${sameDayVisit.by})` : ''} —
                  การบันทึกซ้ำในวันเดียวกันทำให้การเบิกค่าตอบแทน CG/อสส. ชนกันและเบิกไม่ได้
                  ตรวจสอบก่อนบันทึกต่อ (มติ คทง.4)
                </NoticeBand>
              </div>
            )}

            {/* ถอดแถบ "เปิดจากแบบร่าง…" และ "เคสนี้รับต่อจากระบบอื่น…" ออก
                (มติผู้ใช้ 30 ส.ค. 69) — ที่มาของเคสมีป้ายอยู่บนหัวแฟ้มแล้ว
                ส่วนแบบร่างเห็นได้จากแท็บ "ที่ร่างไว้" ของหน้าคิว */}

            {smartCardMsg && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='info' icon='credit_card'>{smartCardMsg}</NoticeBand>
              </div>
            )}

            {readOnly && (
              <div style={{
                paddingTop: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-600)',
                paddingRight: 'var(--dim-space-600)',
              }}>
                <NoticeBand tone='info' icon='lock'>
                  การเยี่ยมครั้งนี้ปิดการบันทึกแล้ว — เปิดแบบอ่านอย่างเดียว
                  (ระบบจะบันทึกผู้แก้ไขและเวลาเป็น audit trail เมื่อกดแก้ไข)
                </NoticeBand>
                {/* ปุ่มแก้ไขย้ายมาที่นี่หลังถอดแถวหัวการ์ดออก — ไม่งั้นบันทึกที่ปิดแล้ว
                    จะไม่มีทางเปิดแก้ได้เลย */}
                <div style={{ paddingTop: 'var(--dim-space-200)' }}>
                  <BrandSubdueButton variant='fill' leadingIcon='edit' onClick={startEditSession}>
                    แก้ไขบันทึก (บันทึกผู้แก้ไข)
                  </BrandSubdueButton>
                </div>
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
              /* ไม่มีคำว่า "เยี่ยมบ้าน" ซ้ำเหนือแถบขั้นตอนแล้ว (มติผู้ใช้ 30 ส.ค. 69)
                 — breadcrumb กับหัวข้อหน้า (SubHeader) บอกอยู่แล้วว่าอยู่ที่บันทึก
                 ประเมินการเยี่ยมบ้านครั้งที่เท่าไหร่ · ยังส่ง `morphTitle` ไว้เพราะ
                 ป๊อปอัปส่งต่อใช้เป็นชื่อต้นทาง (referFromDepartment) */
              morphTitle='เยี่ยมบ้าน'
              hideMorphTitle
              /* การ์ดขาวที่รองแถบขั้นตอนมีเงาด้านบน คั่นออกจากหัวแฟ้มผู้รับบริการ
                 เหมือนหน้าบันทึกการรักษา (มติผู้ใช้ 30 ส.ค. 69) */
              morphBandClassName='mih-morph-band-top-shadow'
              /* ขั้น "ที่อยู่และการเดินทาง" ยกการ์ดที่อยู่ของหน้าเวชระเบียนมาทั้งก้อน
                 ซึ่งเป็นการ์ดขาวอยู่แล้ว — ไม่ต้องมีพื้นขาวของ shell ครอบอีกชั้น
                 (มติผู้ใช้ 30 ส.ค. 69) */
              /* ขั้นที่เนื้อหา "เป็นการ์ดขาวของตัวเองอยู่แล้ว" ต้องไม่มีการ์ดขาว
                 ของ shell รองอีกชั้น ไม่งั้นเป็นขาวซ้อนขาว (มติผู้ใช้ 30 ส.ค. 69)
                 0 ยินยอม · 1 ข้อมูลส่วนตัว · 2 ที่อยู่ — ทั้งสามยกคอมโพเนนต์
                 ของหน้าเวชระเบียนมา ซึ่งมาพร้อมการ์ดของมันเอง */
              /* ขั้นที่ 5 (index 4) = อาการป่วย ซึ่งเนื้อหาเป็นการ์ดของตัวเอง —
                 เลื่อนมาจาก index 3 ตอนสลับกับสัญญาณชีพ */
              /* ขั้นที่เนื้อหาเป็นการ์ดของตัวเอง: ยินยอม · ข้อมูลส่วนตัว · ที่อยู่ ·
                 ติดต่อ · สิทธิ · อาการป่วย */
              plainBodySteps={[0, 1, 2, 3, 4, 5]}
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
