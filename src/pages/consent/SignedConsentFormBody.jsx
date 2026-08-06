import React, { useMemo } from 'react';
import InputField from '@/components/forms/InputField';
import RadioButton from '@/components/radio/RadioButton';
import Signature from '@/components/form-builder/Signature';
import Icon from '@/components/icons/Icon';
import {
  getRegistrationConsentForm,
  resolveRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import { DEMO_SIGNED_SIGNATURE_DATA_URL } from '@/data/mockSignature';
import {
  PH_SIGNED_CONSENT_SECTIONS,
  PH_SIGNED_PATIENT_FIELDS,
  buildSignedClauseAnswers,
  isPhConsentFormCode,
  resolveSignedPatientFields,
} from '@/data/signedConsentFormView';

const sectionCardStyle = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  padding: 'var(--dim-space-500)',
  width: '100%',
  boxSizing: 'border-box',
};

const sectionTitleStyle = {
  margin: 0,
  width: '100%',
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-base, 16px)',
  fontWeight: 'var(--type-weight-bold)',
  lineHeight: 'normal',
};

const consentRadioStyle = {
  minHeight: 40,
  height: 40,
  paddingTop: 'var(--dim-space-200)',
  paddingBottom: 'var(--dim-space-200)',
  paddingLeft: 'var(--dim-space-400)',
  paddingRight: 'var(--dim-space-400)',
  pointerEvents: 'none',
};

const ConsentChoiceRadios = ({ value, name }) => (
  <div
    className='flex flex-wrap items-center'
    style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-200)' }}
    role='radiogroup'
    aria-label={name}
    aria-disabled
  >
    <RadioButton
      name={name}
      value='yes'
      title='ยินยอม'
      checked={value === 'yes'}
      onChange={() => {}}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon
      icon={<Icon name='check' size={16} color='var(--text-brandPrimary-default)' />}
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
      onChange={() => {}}
      border
      showRadio={false}
      showCircleIcon={false}
      showIcon
      icon={<Icon name='close' size={16} color='var(--text-danger-default, #DC2626)' />}
      showDescription={false}
      showBadge={false}
      showBadgeTitle={false}
      style={consentRadioStyle}
    />
  </div>
);

const clauseAnswerForAction = (action) => {
  if (action === 'ไม่ให้ความยินยอม' || action === 'ถอนความยินยอม') return 'no';
  if (action === 'ให้ความยินยอม' || action === 'แก้ไขความยินยอม') return 'yes';
  return 'yes';
};

/** Read-only ฉบับที่ลงนามแล้ว — ใช้ใน popup worklist / timeline */
export default function SignedConsentFormBody({
  event,
  patientHn = '',
  patientName = '',
  showFormHeader = true,
}) {
  const isPhForm = isPhConsentFormCode(event?.formCode);

  const formId = useMemo(
    () => resolveRegistrationConsentFormId({
      formCode: event?.formCode,
      type: event?.type,
    }),
    [event?.formCode, event?.type],
  );

  const meta = useMemo(() => getRegistrationConsentForm(formId), [formId]);

  const patientFields = useMemo(
    () => resolveSignedPatientFields(patientHn, patientName),
    [patientHn, patientName],
  );

  const overallAnswer = clauseAnswerForAction(event?.action);

  const clauseAnswers = useMemo(
    () => buildSignedClauseAnswers(event?.recordId, overallAnswer),
    [event?.recordId, overallAnswer],
  );

  const sections = useMemo(() => {
    if (isPhForm) return PH_SIGNED_CONSENT_SECTIONS;
    return (meta.clauses || []).map((c) => ({
      id: c.id,
      title: c.title,
      detail: c.detail,
    }));
  }, [isPhForm, meta.clauses]);

  const patientFieldDefs = useMemo(() => {
    if (isPhForm) return PH_SIGNED_PATIENT_FIELDS;
    return meta.patientFields || [];
  }, [isPhForm, meta.patientFields]);

  const displayTitle = event?.formName || meta.title;
  const displayVersion = event?.version || meta.version;
  const typeLabel = event?.type || meta.categoryLabel || 'PDPA';

  if (!event) return null;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
      {showFormHeader && (
        <div
          className='flex flex-col w-full min-w-0'
          style={{
            ...sectionCardStyle,
            gap: 'var(--dim-space-400)',
          }}
        >
          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-900, 44px)',
                height: 'var(--dim-size-900, 44px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                background: 'var(--surface-brandPrimary-quaternary)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              <Icon name='description' size={24} />
            </span>
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
              <h2
                style={{
                  margin: 0,
                  color: 'var(--text-brandPrimary-default)',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-base, 16px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.3,
                }}
              >
                {displayTitle}
              </h2>
              <span
                style={{
                  color: 'var(--text-content-quaternary, #ADB2B7)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                  lineHeight: 1.4,
                }}
              >
                {typeLabel}
                {' · '}
                {event.formCode || meta.id}
                {' · '}
                {displayVersion}
              </span>
            </div>
          </div>
        </div>
      )}

      <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
        <h2 style={sectionTitleStyle}>ข้อมูลผู้ป่วย</h2>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {patientFieldDefs.map((field) => (
            <InputField
              key={field.key}
              label={field.label}
              value={patientFields[field.key] || patientFields.fullName || '—'}
              disabled
              readOnly
              tabIndex={-1}
              showHelperText={false}
              showLeadingIcon={false}
            />
          ))}
        </div>
      </section>

      <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
        <h2 style={sectionTitleStyle}>ข้อความยินยอม</h2>
        {!isPhForm && meta.intro && (
          <p
            style={{
              margin: 0,
              width: '100%',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
            }}
          >
            {meta.intro}
          </p>
        )}
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {sections.map((clause, index) => {
            const answer = isPhForm
              ? (clauseAnswers[clause.id] || overallAnswer)
              : overallAnswer;
            return (
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
                  <span
                    style={{
                      color: 'var(--text-brandPrimary-default, #007549)',
                      fontFamily: 'var(--type-family-heading-graphic2)',
                      fontSize: 'var(--type-size-base, 16px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      lineHeight: 1.5,
                    }}
                  >
                    ข้อที่ {index + 1} · {clause.title}
                  </span>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--text-content-default)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                      lineHeight: 1.5,
                    }}
                  >
                    {clause.detail}
                  </p>
                  <ConsentChoiceRadios
                    name={`signed-clause-${clause.id}`}
                    value={answer}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
        <h2 style={sectionTitleStyle}>ลายมือชื่อ</h2>
        <div
          className='flex flex-col items-center w-full min-w-0'
          style={{ gap: 'var(--dim-space-150)' }}
        >
          <div className='w-full max-w-[323px]'>
            <Signature
              value={DEMO_SIGNED_SIGNATURE_DATA_URL}
              onChange={() => {}}
              disabled
              height={94}
              showFooter={false}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--type-family-heading-content)',
              fontSize: 'var(--type-size-sm)',
              fontWeight: 'var(--type-weight-bold)',
              color: 'var(--text-content-default)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {patientFields.fullName}
          </span>
          <span
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-secondary)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            วันเวลา: {event.dateTime || '—'} · ช่องทาง: {event.channel || '—'}
          </span>
        </div>
        {(isPhForm || meta.signatureNote) && (
          <p
            style={{
              margin: 0,
              width: '100%',
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {isPhForm
              ? 'ข้อมูลส่วนบุคคลจะถูกเก็บรักษาและใช้เฉพาะตามวัตถุประสงค์ที่ระบุในแบบฟอร์มเท่านั้น'
              : meta.signatureNote}
          </p>
        )}
      </section>
    </div>
  );
}
