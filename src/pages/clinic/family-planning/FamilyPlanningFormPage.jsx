import React, { useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import CreateConsentRequestHeaderAction from '@/components/consent/CreateConsentRequestHeaderAction';
import Footer from '@/components/layout/Footer';
import PatientCard from '@/components/card/PatientCard';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Popup from '@/components/popup/Popup';
import Icon from '@/components/icons/Icon';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import { EmptyStepBody } from '@/pages/clinic/family-planning/FamilyPlanningSteps';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  DEFAULT_FP_VISIT,
  getFpRegistrationByHn,
  getFpQueueRowByHn,
  getFpDraft,
  saveFpDraft,
  clearFpDraft,
  saveFpVisitRecord,
  getFpVisitRecords,
  formatFpDateTime,
  todayIso,
} from '@/data/familyPlanningVisits';

/* FamilyPlanningFormPage — บันทึกวางแผนครอบครัว (TOR 1.10.8).

   เนื้อในและแถบ 7 ขั้นถูกล้าง 2 ก.ย. 69 ตามมติผู้ใช้ — เหลือ PatientCard ·
   แบนเนอร์ทะเบียน/ร่าง · พื้นที่ว่าง · footer ยกเลิก/บันทึกร่าง/จบการบันทึก
   ของเดิมทั้งเจ็ดขั้นอยู่ใน git ที่ FamilyPlanningSteps.jsx */

const breadcrumb = ['บันทึกการรักษา', 'คลินิกวางแผนครอบครัว'];
const QUEUE_PATH = '/clinic/family-planning';
const REGISTRY_PATH = '/clinic/family-planning/registry';

const cloneDefaultVisit = () => ({
  ...JSON.parse(JSON.stringify(DEFAULT_FP_VISIT)),
  serviceDate: todayIso(),
});

const FamilyPlanningFormPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const cardPatient = useMemo(
    () => (navState?.hn && getPatientByHN(navState.hn)) || DEFAULT_PATIENT,
    [navState?.hn],
  );

  /* ทุก record ผูกกับ HN ที่หน้าคิวส่งมา — ไม่ใช่ cardPatient.hn
     (getPatientByHN fallback เป็น DEFAULT_PATIENT สำหรับ HN ที่ไม่มีใน
     patientProfiles ซึ่งจะทำให้บันทึกของคนละคนไปกองรวมกันที่ 67-00001)
     — guard เดียวกับ AncFormPage / MentalHealthFormPage */
  const fpHn = navState?.hn || cardPatient?.hn;

  const mrPatient = useMemo(() => {
    const p = (navState?.hn && findMrPatientByHn(navState.hn)) || DEFAULT_MR_PATIENT;
    return { ...p, queue: navState?.queue, name: navState?.name || `${p.firstNameTh} ${p.lastNameTh}` };
  }, [navState]);

  const queueRow = useMemo(() => getFpQueueRowByHn(fpHn), [fpHn]);
  const registration = useMemo(
    () => getFpRegistrationByHn(fpHn),
    [fpHn],
  );

  /* ── mode: resume draft > view saved visit > new record ─────────── */
  const initial = useMemo(() => {
    const draft = getFpDraft(fpHn);
    if (draft) {
      return {
        mode: 'draft',
        form: { ...cloneDefaultVisit(), ...draft.form },
        draftSavedAt: draft.savedAt,
      };
    }
    const visits = getFpVisitRecords(fpHn);
    const last = visits[visits.length - 1];
    const row = getFpQueueRowByHn(fpHn);
    if (last && (navState?.statusKey === 'done' || row?.statusKey === 'done')) {
      return { mode: 'view', form: { ...cloneDefaultVisit(), ...last }, lastVisit: last };
    }
    if (row?.statusKey === 'draft') {
      return { mode: 'draft', form: cloneDefaultVisit() };
    }
    return { mode: 'new', form: cloneDefaultVisit() };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fpHn]);

  const [mode, setMode] = useState(initial.mode); /* 'new' | 'draft' | 'view' | 'edit' */
  const [form] = useState(initial.form);
  const [saved, setSaved] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [resumeBanner, setResumeBanner] = useState(initial.mode === 'draft');

  const seedJson = useRef(JSON.stringify(initial.form));
  const locked = mode === 'view' || saved;
  const dirty = !saved && JSON.stringify(form) !== seedJson.current;

  const visitNo = getFpVisitRecords(fpHn).length + (mode === 'view' ? 0 : 1);
  const pageTitle = `บันทึกวางแผนครอบครัว — ครั้งที่ ${Math.max(visitNo, 1)}`;

  const confirmSave = () => {
    saveFpVisitRecord(fpHn, form);
    clearFpDraft(fpHn);
    seedJson.current = JSON.stringify(form);
    setSaved(true);
  };

  const handleBack = () => {
    if (dirty && !locked) { setLeaveOpen(true); return; }
    history.push(QUEUE_PATH);
  };

  const leaveKeepDraft = () => {
    saveFpDraft(fpHn, form, 0);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const leaveDiscard = () => {
    clearFpDraft(fpHn);
    setLeaveOpen(false);
    history.push(QUEUE_PATH);
  };

  const startEdit = () => {
    setMode('edit');
    setSaved(false);
    setResumeBanner(false);
  };

  const goRegistry = () => history.push({
    pathname: REGISTRY_PATH,
    state: { hn: fpHn, name: mrPatient.name, createFor: fpHn },
  });

  const bannerBase = {
    gap: 'var(--dim-space-300, 12px)',
    marginLeft: 'var(--dim-space-600, 24px)',
    marginRight: 'var(--dim-space-600, 24px)',
    marginTop: 'var(--dim-space-400, 16px)',
    paddingTop: 'var(--dim-space-300, 12px)',
    paddingBottom: 'var(--dim-space-300, 12px)',
    paddingLeft: 'var(--dim-space-400, 16px)',
    paddingRight: 'var(--dim-space-400, 16px)',
    borderRadius: 'var(--dim-radius-200, 8px)',
    fontSize: 'var(--type-size-sm)',
  };

  return (
    <ClinicFilterProvider>
      <div className='flex w-full min-h-screen' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
        <Sidebar activeKey='treat' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} standalone={false} />
          {/* ไม่มีแถบ SubHeader แล้ว — ทรงเดียวกับคลินิกฝากครรภ์ (มติผู้ใช้ 2 ก.ย. 69)
              หัวเรื่องอยู่บนการ์ดผู้ป่วยที่เดียว ปุ่มคำขอเข้าถึงข้อมูลอยู่แถวปุ่มบนการ์ด */}
          <Popup
            open={leaveOpen}
            onClose={() => setLeaveOpen(false)}
            title='ยังไม่ได้บันทึกการให้บริการ'
            subtitle={`${mrPatient.name} · HN: ${fpHn}${navState?.queue ? ` · คิว ${navState.queue}` : ''}`}
            tertiaryAction={{ label: 'ละทิ้งร่างและออก', onClick: leaveDiscard }}
            primaryAction={{ label: 'บันทึกร่างและออก', onClick: leaveKeepDraft }}
          >
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
              มีข้อมูลที่ยังไม่ได้บันทึกในแบบบันทึกวางแผนครอบครัว — บันทึกเป็นร่างไว้ทำต่อ
              (แสดงในแท็บ "ที่ร่างไว้" ของหน้าคิว) หรือละทิ้งการเปลี่ยนแปลงทั้งหมด
            </span>
          </Popup>

          <PatientCard
            sticky
            showBack={false}
            patient={cardPatient}
            alertGroupsLeft
            alertExpandable
            title={pageTitle}
            drugAllergies={mrPatient.drugAllergies}
            chronicDiseases={mrPatient.chronicDiseases}
            actions={(
              <>
                <CreateConsentRequestHeaderAction />
                <BrandSubdueButton
                  variant='fill'
                  leadingIcon='credit_card'
                  onClick={goRegistry}
                >
                  พิมพ์บัตรติดตาม
                </BrandSubdueButton>
              </>
            )}
          />

          {/* ยังไม่มีทะเบียน — คู่มือ p.2-1 "ไม่พบข้อมูล กรุณาลงทะเบียน" */}
          {(!registration || registration.status === 'cancelled') && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-warning-quaternary, #FFF9F0)',
                color: 'var(--text-warning-default, #C2410C)',
              }}
            >
              <Icon name='person_search' size={18} />
              <span>
                ไม่พบข้อมูลทะเบียนวางแผนครอบครัวของ HN {fpHn} — ต้องลงทะเบียนเพื่อออก
                "เลขที่วางแผนครอบครัว" ก่อนจึงจะพิมพ์บัตรติดตามและปิดการบันทึกได้สมบูรณ์
              </span>
              <div className='flex-1' />
              <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' onClick={goRegistry}>
                ลงทะเบียน
              </BrandSubdueButton>
            </div>
          )}

          {/* สิทธิหมดอายุ / ไม่มีสิทธิ */}
          {queueRow?.rightsExpired && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-danger-quaternary, #FFF0F0)',
                color: 'var(--text-danger-default, #B91C1C)',
              }}
            >
              <Icon name='warning' size={18} />
              <span>
                สิทธิการรักษาหมดอายุ ({queueRow.insurance}) — ยังบันทึกการให้บริการได้
                แต่ค่าบริการจะถูกส่งเป็น "ชำระเงินเอง" ไปยังห้องเงิน
              </span>
            </div>
          )}

          {/* กลับมาทำต่อจากร่าง */}
          {resumeBanner && !saved && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
            >
              <Icon name='history' size={18} />
              <span>
                กลับมาทำต่อจากร่างที่บันทึกไว้{initial.draftSavedAt ? ` (${formatFpDateTime(initial.draftSavedAt)})` : ''}
              </span>
              <div className='flex-1' />
              <button
                type='button'
                onClick={() => setResumeBanner(false)}
                aria-label='ปิดการแจ้งเตือน'
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-brandPrimary-default, #007549)' }}
              >
                <Icon name='close' size={16} />
              </button>
            </div>
          )}

          {/* แก้ไขบันทึกที่บันทึกแล้ว */}
          {mode === 'view' && (
            <div
              className='flex justify-end'
              style={{
                marginBottom: 'var(--dim-space-300)',
              }}
            >
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={startEdit}>
                แก้ไขบันทึก
              </BrandSubdueButton>
            </div>
          )}

          {/* บันทึกสำเร็จ */}
          {saved && (
            <div
              className='flex items-center'
              style={{
                ...bannerBase,
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default, #007549)',
              }}
            >
              <Icon name='check-circle' size={18} />
              <span>บันทึกการให้บริการวางแผนครอบครัวเรียบร้อยแล้ว — กด "จบการบันทึก" ที่แถบด้านล่างเพื่อกลับหน้าคิว</span>
            </div>
          )}

          <main
            className='flex-1 min-w-0 flex flex-col'
            style={{
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <EmptyStepBody
              title='บันทึกวางแผนครอบครัว'
              subtitle='เนื้อหาและขั้นตอนถูกถอดออกแล้ว — ยังไม่มีเนื้อหา'
            />
          </main>
          <Footer
            type='with BTN'
            sticky
            showLegal={false}
            showAutoSave={false}
            showButton3
            button3Label='ยกเลิก'
            onButton3Click={handleBack}
            showButton2={!locked}
            button2Label='บันทึกร่าง'
            button2Icon='save'
            onButton2Click={() => { if (!locked) saveFpDraft(fpHn, form, 0); }}
            showButton1
            button1Label={saved ? 'กลับหน้าคิว' : 'จบการบันทึก'}
            button1TrailingIcon='check'
            onButton1Click={() => {
              if (!saved && !locked) confirmSave();
              history.push(QUEUE_PATH);
            }}
          />
          <Footer />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default FamilyPlanningFormPage;
