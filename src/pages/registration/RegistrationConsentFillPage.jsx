import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { SubHeader } from '@/components/layout/Header';
import { ClinicFilterProvider } from '@/components/layout/HeaderClinicContext';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandButton from '@/components/button/BrandButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import Signature from '@/components/form-builder/Signature';
import RadioButton from '@/components/radio/RadioButton';
import Icon from '@/components/icons/Icon';
import { getRegistrationConsentForm } from '@/data/registrationConsentForms';
import {
  formatNationalId,
  loadRegistrationDraft,
  markRegistrationConsentCompleted,
} from '@/data/registrationForm';
import { recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { findMrPatientByHn, DEFAULT_MR_PATIENT } from '@/data/mrPatients';

/* MIH RegistrationConsentFillPage — Figma PHCIS-Registration 295:41105
   (PHCIS_Registration_Step01_Consent). Two-column shell: form max 640px +
   QR / Patient View panel 448px. Content from PD-1011 / TX-1011 / CL-1011. */

const breadcrumb = ['ระบบงานเวชระเบียน', 'ข้อมูลผู้รับบริการ'];

const QR_SCAN_ILLUSTRATION = '/illustration/registration/consent-qr-scan.png';

const sectionCardStyle = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500, 16px)',
  boxShadow: 'var(--shadow-brand-drop-bottom-200)',
  padding: 'var(--dim-space-600) 24px',
  width: '100%',
};

const sectionTitleStyle = {
  margin: 0,
  width: '100%',
  color: '#383B3D',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 'normal',
};

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

  const fullName = buildFullNameTh(draft)
    || buildFullNameTh(hint)
    || buildFullNameTh(roster);

  const nationalIdRaw = draft?.nationalId || hint.nationalId || roster.nationalId || '';
  const nationalId = nationalIdRaw ? formatNationalId(nationalIdRaw) : '';

  const hn = hint.hn || draft?.hn || roster.hn || '';

  return { fullName, nationalId, hn, draft, patientHint: hint };
};

/** Compact consent radios — Figma 295:41105 / 298:82500
   Radio Button · Border=Yes · title only · h=40 (ยินยอม 74 / ไม่ยินยอม 88). */
const consentRadioStyle = {
  minHeight: 40,
  height: 40,
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
};

const ConsentChoiceRadios = ({ value, onChange, name }) => (
  <div
    className='flex flex-wrap items-center'
    style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)' }}
    role='radiogroup'
    aria-label={name}
  >
    <RadioButton
      name={name}
      value='yes'
      title='ยินยอม'
      checked={value === 'yes'}
      onChange={() => onChange('yes')}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon={false}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={consentRadioStyle}
    />
    <RadioButton
      name={name}
      value='no'
      title='ไม่ยินยอม'
      checked={value === 'no'}
      onChange={() => onChange('no')}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon={false}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={consentRadioStyle}
    />
  </div>
);

const emptyAnswers = (clauses) => Object.fromEntries(clauses.map((c) => [c.id, '']));

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

  const [fullName, setFullName] = useState(defaults.fullName);
  const [nationalId, setNationalId] = useState(defaults.nationalId);
  const [hn, setHn] = useState(defaults.hn);
  const [answers, setAnswers] = useState(() => emptyAnswers(meta.clauses));
  const [signature, setSignature] = useState(null);

  useEffect(() => {
    setAnswers(emptyAnswers(meta.clauses));
    setSignature(null);
  }, [meta.id, meta.clauses]);

  useEffect(() => {
    setFullName(defaults.fullName);
    setNationalId(defaults.nationalId);
    setHn(defaults.hn);
  }, [defaults.fullName, defaults.nationalId, defaults.hn]);

  const fieldValues = { fullName, nationalId, hn };
  const setFieldValue = {
    fullName: setFullName,
    nationalId: setNationalId,
    hn: setHn,
  };

  const canSave = useMemo(() => {
    const fieldsOk = (meta.patientFields || []).every((f) => {
      if (!f.required) return true;
      return String(fieldValues[f.key] || '').trim() !== '';
    });
    const clausesOk = meta.clauses.every((c) => answers[c.id] === 'yes' || answers[c.id] === 'no');
    return Boolean(fieldsOk && clausesOk && signature);
  }, [answers, fieldValues, meta.clauses, meta.patientFields, signature]);

  const qrSrc = useMemo(() => {
    const target = typeof window !== 'undefined'
      ? `${window.location.origin}/registration/consent/${meta.id}?role=patient`
      : meta.id;
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(target)}`;
  }, [meta.id]);

  const goBack = () => {
    history.push({
      pathname: '/registration/register',
      state: location.state?.returnState || { hn: patientHint.hn },
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    const outcome = Object.values(answers).some((a) => a === 'no') ? 'declined' : 'signed';
    recordMrConsentSigning({
      hn: hn || patientHint.hn,
      name: fullName,
      formId: meta.id,
      formTitle: meta.title,
      type: meta.categoryLabel,
      version: meta.version,
      channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      outcome,
    });
    markRegistrationConsentCompleted(meta.id);
    history.push({
      pathname: '/registration/register',
      state: {
        ...(location.state?.returnState || {}),
        hn: patientHint.hn || hn,
        consentCompletedId: meta.id,
      },
    });
  };

  const setAnswer = (id) => (val) => setAnswers((s) => ({ ...s, [id]: val }));

  return (
    <ClinicFilterProvider>
      <div
        className='flex w-full min-h-screen'
        style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}
      >
        <Sidebar activeKey='registration' />
        <div className='flex-1 min-w-0 flex flex-col'>
          <Header breadcrumb={breadcrumb} />
          <SubHeader
            title={meta.title}
            onBack={goBack}
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
            <BrandSubdueButton variant='outline' size='md' leadingIcon='print'>
              พิมพ์บัตรผู้รับบริการ
            </BrandSubdueButton>
            <BrandPrimaryButton size='md' leadingIcon='credit_card'>
              อ่านบัตรสมาร์ทการ์ด
            </BrandPrimaryButton>
          </SubHeader>

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
                {/* ── Left form (max 640) ── */}
                <div
                  className='flex flex-col min-w-0'
                  style={{ flex: '1 0 0', maxWidth: 640, gap: 'var(--dim-space-400)' }}
                >
                  <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
                    <h2 style={sectionTitleStyle}>ข้อมูลผู้ป่วย</h2>
                    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                      {(meta.patientFields || []).map((field) => (
                        <InputField
                          key={field.key}
                          label={field.label}
                          required={field.required}
                          value={fieldValues[field.key] || ''}
                          onChange={setFieldValue[field.key]}
                          placeholder={field.placeholder}
                          showHelperText={false}
                          showLeadingIcon={false}
                        />
                      ))}
                    </div>
                  </section>

                  <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
                    <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-100)' }}>
                      <h2 style={{ ...sectionTitleStyle, width: 'auto', whiteSpace: 'nowrap' }}>
                        ข้อความยินยอม
                      </h2>
                    </div>
                    {meta.intro && (
                      <p style={{
                        margin: 0,
                        width: '100%',
                        color: 'var(--text-content-secondary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        lineHeight: 1.5,
                      }}>
                        {meta.intro}
                      </p>
                    )}
                    {meta.clauses.map((clause, index) => (
                      <div
                        key={clause.id}
                        className='flex w-full items-start'
                        style={{
                          gap: 'var(--dim-space-300)',
                          padding: 'var(--dim-space-300)',
                          borderRadius: 'var(--dim-radius-400, 12px)',
                          border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                          background: 'var(--surface-card-100)',
                        }}
                      >
                        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-150)' }}>
                          <span style={{
                            color: 'var(--text-topic-secondary-title, #007549)',
                            fontFamily: 'var(--type-family-heading-graphic2)',
                            fontSize: 'var(--type-size-base, 16px)',
                            fontWeight: 'var(--type-weight-regular)',
                            lineHeight: 1.5,
                          }}>
                            ข้อที่ {index + 1} - {clause.title}
                          </span>
                          <p style={{
                            margin: 0,
                            color: 'var(--text-content-default)',
                            fontFamily: 'var(--type-family-body)',
                            fontSize: 'var(--type-size-sm)',
                            lineHeight: 1.5,
                          }}>
                            {clause.detail}
                          </p>
                          <ConsentChoiceRadios
                            name={`clause-${clause.id}`}
                            value={answers[clause.id]}
                            onChange={setAnswer(clause.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className='flex flex-col items-center' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
                    <h2 style={sectionTitleStyle}>ลายมือชื่อ</h2>
                    <Signature
                      value={signature}
                      onChange={setSignature}
                      onConfirm={setSignature}
                      height={100}
                      width={323}
                    />
                    <div
                      className='flex flex-col w-full'
                      style={{
                        background: 'var(--surface-card-200, #FDFDFD)',
                        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                        borderRadius: 'var(--dim-radius-400, 12px)',
                        padding: 'var(--dim-space-400)',
                        gap: 'var(--dim-space-100)',
                        color: 'var(--text-content-secondary)',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        fontWeight: 'var(--type-weight-bold)',
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                      }}>
                        หมายเหตุ
                      </span>
                      <span style={{
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm)',
                        fontWeight: 'var(--type-weight-regular)',
                        lineHeight: 1.5,
                      }}>
                        เอกสารนี้มีอายุ 365 วัน นับจากวันที่ลงนาม
                      </span>
                    </div>
                  </section>
                </div>

                {/* ── Right panel 448 — QR + Patient View ── */}
                <aside
                  className='flex flex-col items-center shrink-0'
                  style={{
                    width: 448,
                    gap: 'var(--dim-space-1200, 48px)',
                    padding: 'var(--dim-space-600)',
                    background: 'var(--surface-card-100)',
                    borderLeft: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
                    borderRadius: 'var(--dim-radius-500, 16px)',
                    boxShadow: 'var(--shadow-brand-drop-bottom-200)',
                  }}
                >
                  <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                    <img
                      src={QR_SCAN_ILLUSTRATION}
                      alt=''
                      width={112}
                      height={112}
                      style={{ width: 112, height: 112, objectFit: 'contain' }}
                    />
                    <p style={{
                      margin: 0,
                      width: '100%',
                      textAlign: 'center',
                      color: 'var(--text-content-default)',
                      fontFamily: 'var(--type-family-heading-graphic2)',
                      fontSize: 'var(--type-size-base, 16px)',
                      fontWeight: 'var(--type-weight-regular)',
                      lineHeight: 1.5,
                    }}>
                      หรือให้ผู้รับบริการยินยอมด้วยตนเองผ่านโทรศัพท์
                      <br aria-hidden />
                      Application
                      <br aria-hidden />
                      โดยสแกน QR Code ด้านล่างนี้
                    </p>
                    <div
                      style={{
                        background: 'var(--surface-card-100)',
                        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                        borderRadius: 'var(--dim-radius-200)',
                        padding: 'var(--dim-space-300)',
                      }}
                    >
                      <img
                        src={qrSrc}
                        alt='QR Code สำหรับยินยอมผ่านมือถือ'
                        width={160}
                        height={160}
                        style={{ display: 'block', width: 160, height: 160 }}
                      />
                    </div>
                  </div>

                  <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                    <div className='flex items-center' style={{ gap: 'var(--dim-space-600)' }}>
                      <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                        <Icon name='visibility' size={16} color='var(--text-brandPrimary-default, #007549)' />
                        <span style={{
                          color: 'var(--text-brandPrimary-default, #007549)',
                          fontFamily: 'var(--type-family-heading-graphic2)',
                          fontSize: 'var(--type-size-sm)',
                          fontWeight: 'var(--type-weight-regular)',
                          lineHeight: 1.5,
                          whiteSpace: 'nowrap',
                        }}>
                          ตัวอย่างในโทรศัพท์ (Patient View)
                        </span>
                      </div>
                      <StatusBadge style='success' size='small' showDot={false} showIcon={false}>
                        Live
                      </StatusBadge>
                    </div>

                    <div style={{
                      width: 320,
                      height: 654,
                      borderRadius: 40,
                      background: '#1D1D1F',
                      padding: 10,
                      boxShadow: '0 20px 48px rgba(8,167,104,0.14)',
                      boxSizing: 'border-box',
                    }}>
                      <div style={{
                        position: 'relative',
                        background: 'var(--surface-card-100)',
                        borderRadius: 30,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 88,
                          height: 22,
                          borderRadius: 9999,
                          background: '#1D1D1F',
                          zIndex: 2,
                        }} />
                        <div
                          className='flex items-center shrink-0'
                          style={{
                            gap: 'var(--dim-space-200)',
                            padding: '36px var(--dim-space-400) var(--dim-space-300)',
                            borderBottom: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                          }}
                        >
                          <Icon name='arrow_back_ios_new' size={14} color='var(--text-content-secondary)' />
                          <span style={{
                            flex: 1,
                            textAlign: 'center',
                            color: 'var(--text-content-default)',
                            fontFamily: 'var(--type-family-heading-graphic2)',
                            fontSize: 'var(--type-size-sm)',
                          }}>
                            ใบยินยอม
                          </span>
                          <span style={{ width: 14 }} />
                        </div>
                        <div className='flex flex-col' style={{
                          flex: 1,
                          minHeight: 0,
                          overflowY: 'auto',
                          padding: 'var(--dim-space-400)',
                          gap: 'var(--dim-space-300)',
                        }}>
                          <div className='flex flex-col' style={{
                            gap: 'var(--dim-space-100)',
                            padding: 'var(--dim-space-300)',
                            borderRadius: 'var(--dim-radius-200)',
                            background: 'var(--surface-brandPrimary-quaternary)',
                          }}>
                            <span style={{
                              color: 'var(--text-brandPrimary-default)',
                              fontFamily: 'var(--type-family-heading-graphic2)',
                              fontSize: 'var(--type-size-sm)',
                              lineHeight: 1.4,
                            }}>
                              {meta.title}
                            </span>
                            <span style={{
                              color: 'var(--text-content-tertiary)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 11,
                            }}>
                              {meta.id} · {meta.version} · {meta.categoryLabel}
                            </span>
                          </div>
                          {meta.clauses.map((c, i) => (
                            <div key={c.id} className='flex flex-col' style={{ gap: 4 }}>
                              <span style={{
                                color: 'var(--text-brandPrimary-default)',
                                fontFamily: 'var(--type-family-heading-graphic2)',
                                fontSize: 11,
                              }}>
                                ข้อที่ {i + 1} · {c.title}
                              </span>
                              <span style={{
                                color: 'var(--text-content-secondary)',
                                fontFamily: 'var(--type-family-body)',
                                fontSize: 10,
                                lineHeight: 1.45,
                              }}>
                                {c.detail}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className='shrink-0' style={{
                          padding: 'var(--dim-space-300) var(--dim-space-400)',
                          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                        }}>
                          <BrandButton variant='fill' size='md' style={{ width: '100%' }}>
                            ยืนยันการยินยอม
                          </BrandButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
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
            button1Disabled={!canSave}
            onButton1Click={handleSave}
          />
          <Footer type='No' />
        </div>
      </div>
    </ClinicFilterProvider>
  );
};

export default RegistrationConsentFillPage;
