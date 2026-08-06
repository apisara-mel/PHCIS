import React, { useMemo } from 'react';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  getRegistrationConsentForm,
  resolveRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import { isPhConsentFormCode } from '@/data/signedConsentFormView';
import SignedConsentFormBody from '@/pages/consent/SignedConsentFormBody';

/* MIH ConsentSignedFormViewPopup — read-only ฉบับที่ลงนามแล้ว (ข้อความยินยอม +
   คำตอบรายข้อ + ลายมือชื่อ). เปิดจาก timeline / telemed. */

const clauseAnswerForAction = (action) => {
  if (action === 'ไม่ให้ความยินยอม' || action === 'ถอนความยินยอม') return 'no';
  if (action === 'ให้ความยินยอม' || action === 'แก้ไขความยินยอม') return 'yes';
  return 'yes';
};

const ConsentSignedFormViewPopup = ({
  open,
  onClose,
  event,
  patientHn = '',
  patientName = '',
}) => {
  const isPhForm = isPhConsentFormCode(event?.formCode);

  const formId = useMemo(
    () => resolveRegistrationConsentFormId({
      formCode: event?.formCode,
      type: event?.type,
    }),
    [event?.formCode, event?.type],
  );

  const meta = useMemo(() => getRegistrationConsentForm(formId), [formId]);

  const displayTitle = event?.formName || meta.title;
  const displayVersion = event?.version || meta.version;
  const clauseValue = clauseAnswerForAction(event?.action);

  if (!open || !event) return null;

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={(
        <span
          style={{
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-bold)',
            lineHeight: 1.4,
            display: 'block',
          }}
        >
          {displayTitle}
        </span>
      )}
      subtitle={`${event.formCode || meta.id} · ${event.dateTime || '—'}`}
      size='large'
      width={720}
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <ColorfulBadge style={isPhForm ? 'blue' : meta.categoryStyle} size='small' hierarchy='secondary' width='hug'>
            {event.type || meta.categoryLabel}
          </ColorfulBadge>
          <ColorfulBadge style='magenta' size='small' hierarchy='secondary' width='hug'>
            {displayVersion}
          </ColorfulBadge>
          {event.formCode && (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
              {event.formCode}
            </ColorfulBadge>
          )}
          <ColorfulBadge
            style={clauseValue === 'yes' ? 'green' : 'red'}
            size='small'
            hierarchy='secondary'
            width='hug'
          >
            {event.action}
          </ColorfulBadge>
        </div>

        <SignedConsentFormBody
          event={event}
          patientHn={patientHn}
          patientName={patientName}
          showFormHeader={false}
        />
      </div>
    </Popup>
  );
};

export default ConsentSignedFormViewPopup;
