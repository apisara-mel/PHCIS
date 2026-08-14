import React, { useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SubHeader } from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { getRegistrationConsentForm } from '@/data/registrationConsentForms';
import {
  formatNationalId,
  loadRegistrationDraft,
  markRegistrationConsentCompleted,
} from '@/data/registrationForm';
import { recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import CONSENT_NAV from '@/pages/consent/consentNav';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';

/* MIH RegistrationConsentFillPage — Figma PHCIS-Registration 295:41105
   (PHCIS_Registration_Step01_Consent). Two-column shell: form max 640px +
   QR / Patient View panel 448px. Content from PD-1011 / TX-1011 / CL-1011. */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ลงทะเบียนผู้รับบริการ'];
/* เข้ามาจาก /consent (แท็บผู้รับบริการทั้งหมด) — หน้ากรอกใบเดียวกัน แต่ chrome
   ต้องเป็นของระบบจัดการความยินยอม */
const CONSENT_BREADCRUMB = ['จัดการความยินยอม', 'กรอกแบบฟอร์มความยินยอม'];

const buildFullNameTh = (src) => {
  if (!src) return '';
  const parts = [src.prefixTh, src.firstNameTh, src.lastNameTh]
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  return parts.join(' ');
};

const resolveConsentPatientDefaults = (locationState) => {
  const draft = loadRegistrationDraft();
  const hint = locationState?.patient || {};
  const roster = (hint.hn && findMrPatientByHn(hint.hn)) || DEFAULT_MR_PATIENT;
  /* เข้ามาจากระบบจัดการความยินยอม = เจาะจงผู้รับบริการรายนั้นแล้ว จึงห้ามให้
     ร่างการลงทะเบียนที่ค้างอยู่ (คนละคน) มาทับชื่อ/เลขบัตร — ฝั่งลงทะเบียน
     ยังใช้ลำดับเดิม (draft ก่อน) เพราะชื่อที่พิมพ์แก้ในฟอร์มสดกว่า */
  const hintFirst = Boolean(locationState?.preferPatientHint);

  const fullName = hintFirst
    ? (buildFullNameTh(hint) || buildFullNameTh(roster) || buildFullNameTh(draft))
    : (buildFullNameTh(draft) || buildFullNameTh(hint) || buildFullNameTh(roster));

  const nationalIdRaw = hintFirst
    ? (hint.nationalId || roster.nationalId || '')
    : (draft?.nationalId || hint.nationalId || roster.nationalId || '');
  const nationalId = nationalIdRaw ? formatNationalId(nationalIdRaw) : '';

  const hn = hintFirst
    ? (hint.hn || roster.hn || '')
    : (hint.hn || draft?.hn || roster.hn || '');

  return { fullName, nationalId, hn, draft, patientHint: hint };
};

const RegistrationConsentFillPage = () => {
  const history = useHistory();
  const location = useLocation();
  const { formId } = useParams();
  const meta = useMemo(() => getRegistrationConsentForm(formId), [formId]);

  const defaults = useMemo(
    () => resolveConsentPatientDefaults(location.state),
    [location.state],
  );
  const patientHint = defaults.patientHint;

  /* สถานะฟอร์มอยู่ใน ConsentFormFillBody (ใช้ร่วมกับ popup ของทั้งสองระบบ) —
     หน้านี้ถือแค่ปุ่ม footer จึงรับ { ready, submit } กลับมา */
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });

  /* ปกติกลับหน้าลงทะเบียน — แต่ถ้าถูกเรียกจากระบบจัดการความยินยอม
     (แท็บผู้รับบริการทั้งหมด → กรอกแบบฟอร์มความยินยอม) ต้องกลับไปที่นั่น */
  const returnTo = location.state?.returnTo || '/registration/register';
  const fromRegistration = returnTo === '/registration/register';

  const goBack = () => {
    history.push({
      pathname: returnTo,
      state: location.state?.returnState || { hn: patientHint.hn },
    });
  };

  const handleSubmit = ({ outcome, fullName, hn, meta: formMeta }) => {
    recordMrConsentSigning({
      hn: hn || patientHint.hn,
      name: fullName,
      formId: formMeta.id,
      formTitle: formMeta.title,
      type: formMeta.categoryLabel,
      version: formMeta.version,
      channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      outcome,
    });
    /* ธง "ยินยอมครบแล้ว" เป็นของร่างการลงทะเบียนที่กำลังทำอยู่ — ถ้ามาจาก
       ระบบจัดการความยินยอม (คนละคนกับร่าง) ห้ามไปติ๊กให้ */
    if (fromRegistration) markRegistrationConsentCompleted(formMeta.id);
    history.push({
      pathname: returnTo,
      state: {
        ...(location.state?.returnState || {}),
        hn: patientHint.hn || hn,
        consentCompletedId: formMeta.id,
      },
    });
  };

  return (
    <ClinicFilterProvider>
      <div
        className='flex w-full min-h-screen'
        style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
      >
        {fromRegistration ? (
          <Sidebar activeKey='registration' />
        ) : (
          /* ระบบจัดการความยินยอมเป็นระบบระดับบนสุดคนละตัวกับ PHCIS — เมนูข้าง
             ต้องเป็นของระบบนั้น ไม่งั้นกรอกเสร็จแล้วหาทางกลับไม่เจอ */
          <Sidebar
            activeKey='consent-manage'
            items={CONSENT_NAV}
            fallbackKey='consent-manage'
            openWidth='calc(var(--dim-size-2500, 320px) + var(--dim-size-1700, 80px))'
            wrapLabels
          />
        )}
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header
            breadcrumb={fromRegistration ? breadcrumb : CONSENT_BREADCRUMB}
            brandTitle={fromRegistration ? undefined : 'ระบบจัดการความยินยอม'}
            standalone={false}
          />
          <div
            className='w-full sticky'
            style={{
              top: 'var(--mih-topbar-offset, var(--dim-size-1400, 64px))',
              zIndex: 1101,
              background: 'var(--surface-navigation-default)',
            }}
          >
          <SubHeader
            title={meta.title}
            hideBottomBorder
            afterTitle={(
              <div className='flex items-center shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
                <ColorfulBadge
                  style={meta.categoryStyle}
                  size='small'
                  hierarchy='secondary'
                  showDot={false}
                  showIcon={false}
                >
                  {meta.categoryLabel}
                </ColorfulBadge>
                <ColorfulBadge
                  style='magenta'
                  size='small'
                  hierarchy='secondary'
                  showDot={false}
                  showIcon={false}
                >
                  {meta.version}
                </ColorfulBadge>
              </div>
            )}
          >
            {/* ปุ่มชุดนี้เป็นงานเวชระเบียน (บัตรผู้รับบริการ / อ่านสมาร์ทการ์ด)
                มาจากระบบจัดการความยินยอมจึงเหลือแค่พิมพ์แบบฟอร์มให้ลงนาม */}
            {fromRegistration ? (
              <>
                <BrandSubdueButton variant='outline' size='md' leadingIcon='print'>
                  พิมพ์บัตรผู้รับบริการ
                </BrandSubdueButton>
                <BrandPrimaryButton size='md' leadingIcon='credit_card'>
                  อ่านบัตรสมาร์ทการ์ด
                </BrandPrimaryButton>
              </>
            ) : (
              <BrandSubdueButton
                variant='outline'
                size='md'
                leadingIcon='print'
                onClick={() => window.print?.()}
              >
                พิมพ์แบบฟอร์ม
              </BrandSubdueButton>
            )}
          </SubHeader>
          </div>

          <div
            className='flex-1 flex flex-col min-w-0 w-full'
            style={{
              padding: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            {/* Outer shell — Figma PHCIS_Registration_Step01_Consent */}
            <div
              className='flex flex-col w-full min-w-0'
              style={{
                background: 'var(--surface-card-100)',
                borderRadius: 'var(--dim-radius-500, 16px)',
                boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              }}
            >
              <div
                className='flex items-start justify-center w-full min-w-0 overflow-hidden'
                style={{
                  gap: 'var(--dim-space-600)',
                  padding: 'var(--dim-space-600)',
                }}
              >
                {/* เนื้อเอกสาร + แผงขวา (QR / Patient View) ใช้ร่วมกับ popup
                    กรอกใบยินยอมของทั้งเวชระเบียนและระบบจัดการความยินยอม */}
                <ConsentFormFillBody
                  key={meta.id}
                  formId={meta.id}
                  initialFullName={defaults.fullName}
                  initialNationalId={defaults.nationalId}
                  initialHn={defaults.hn}
                  onStateChange={setFormApi}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>

          <Footer
            type='with BTN'
            sticky
            showLegal={false}
            showAutoSave
            autoSaveText='ร่างแบบฟอร์ม บันทึกล่าสุด: 2 นาทีที่แล้ว'
            showButton3
            button3Label='ยกเลิก'
            onButton3Click={goBack}
            showButton2={false}
            showButton1
            button1Label='บันทึก'
            button1Disabled={!formApi.ready}
            onButton1Click={() => formApi.submit()}
          />
          <Footer type='No' />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationConsentFillPage;
