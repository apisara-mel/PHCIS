import React, { useMemo } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import RadioButton from '@/components/radio/RadioButton';
import Icon from '@/components/icons/Icon';
import {
  getRegistrationConsentForm,
  resolveRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import { findMrPatientByHn } from '@/data/mrPatients';
import { formatNationalId } from '@/data/registrationForm';
import { resolveConsentPatient } from '@/data/consentPatientDisplay';

/* MIH ConsentSignedFormViewPopup — read-only view of a signed consent
   using the MR registration template (ใบยินยอมเปิดเผยข้อมูลส่วนบุคคล
   PD-1011 / TX-1011 / CL-1011). Opened from Consent History Timeline. */

const sectionCardStyle = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-400)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  padding: 'var(--dim-space-500)',
  width: '100%',
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
      onChange={() => {}}
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

const clauseAnswerForAction = (action) => {
  if (action === 'ไม่ให้ความยินยอม' || action === 'ถอนความยินยอม') return 'no';
  if (action === 'ให้ความยินยอม' || action === 'แก้ไขความยินยอม') return 'yes';
  return 'yes';
};

const resolvePatientFields = (hn, fallbackName) => {
  const resolved = resolveConsentPatient(hn, fallbackName);
  const roster = hn ? findMrPatientByHn(String(hn).replace(/-\d+$/, '')) : null;
  const fullName = [
    roster?.prefixTh,
    roster?.firstNameTh,
    roster?.lastNameTh,
  ].filter(Boolean).join(' ')
    || resolved.name
    || fallbackName
    || '—';
  const nationalIdRaw = roster?.nationalId || '';
  return {
    fullName,
    nationalId: nationalIdRaw ? formatNationalId(nationalIdRaw) : '—',
    hn: resolved.hn || hn || '—',
  };
};

const ConsentSignedFormViewPopup = ({
  open,
  onClose,
  event,
  patientHn = '',
  patientName = '',
}) => {
  const formId = useMemo(
    () => resolveRegistrationConsentFormId({
      formCode: event?.formCode,
      type: event?.type,
    }),
    [event?.formCode, event?.type],
  );

  const meta = useMemo(() => getRegistrationConsentForm(formId), [formId]);

  const patientFields = useMemo(
    () => resolvePatientFields(patientHn, patientName),
    [patientHn, patientName],
  );

  const clauseValue = clauseAnswerForAction(event?.action);
  const displayTitle = event?.formName || meta.title;
  const displayVersion = event?.version || meta.version;

  if (!open || !event) return null;

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={displayTitle}
      subtitle={`${event.formCode || meta.id} · ${event.dateTime || '—'}`}
      size='large'
      width={720}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge style={meta.categoryStyle} size='small' hierarchy='secondary' width='hug'>
            {event.type || meta.categoryLabel}
          </ColorfulBadge>
          <ColorfulBadge style='magenta' size='small' hierarchy='secondary' width='hug'>
            {displayVersion}
          </ColorfulBadge>
          <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
            {meta.id}
          </ColorfulBadge>
          <ColorfulBadge
            style={clauseValue === 'yes' ? 'green' : 'red'}
            size='small'
            hierarchy='secondary'
            width='hug'
          >
            {event.action}
          </ColorfulBadge>
        </div>

        <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-400)' }}>
          <h2 style={sectionTitleStyle}>ข้อมูลผู้ป่วย</h2>
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {(meta.patientFields || []).map((field) => (
              <InputField
                key={field.key}
                label={field.label}
                value={patientFields[field.key] || '—'}
                disabled
                showHelperText={false}
                showLeadingIcon={false}
              />
            ))}
          </div>
        </section>

        <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
          <h2 style={sectionTitleStyle}>ข้อความยินยอม</h2>
          {meta.intro && (
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
                <span
                  style={{
                    color: 'var(--text-topic-secondary-title, #007549)',
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-base, 16px)',
                    fontWeight: 'var(--type-weight-regular)',
                    lineHeight: 1.5,
                  }}
                >
                  ข้อที่ {index + 1} - {clause.title}
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
                  name={`view-clause-${clause.id}`}
                  value={clauseValue}
                />
              </div>
            </div>
          ))}
        </section>

        <section className='flex flex-col' style={{ ...sectionCardStyle, gap: 'var(--dim-space-300)' }}>
          <h2 style={sectionTitleStyle}>ลายมือชื่อ</h2>
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-400)',
              borderRadius: 'var(--dim-radius-400)',
              border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
              background: 'var(--surface-card-200, #FDFDFD)',
              color: 'var(--text-content-secondary)',
            }}
          >
            <Icon name='draw' size={20} color='var(--text-brandPrimary-default)' />
            <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)' }}>
              <span
                style={{
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-bold)',
                  color: 'var(--text-content-default)',
                }}
              >
                {clauseValue === 'yes' ? 'ลงนามแล้ว' : 'บันทึกคำตอบแล้ว (ไม่ยินยอม / ถอน)'}
              </span>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                วันเวลา: {event.dateTime || '—'} · ช่องทาง: {event.channel || '—'}
              </span>
            </div>
          </div>
          {meta.signatureNote && (
            <p
              style={{
                margin: 0,
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                lineHeight: 1.5,
              }}
            >
              {meta.signatureNote}
            </p>
          )}
        </section>
      </div>
    </Popup>
  );
};

export default ConsentSignedFormViewPopup;
