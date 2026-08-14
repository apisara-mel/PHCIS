import React, { useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { SectionTitle } from '@/components/forms/Fields';
import PendingConsentFormCard from '@/components/consent/PendingConsentFormCard';
import ConsentDisclosureFillPopup from '@/components/consent/ConsentDisclosureFillPopup';
import {
  REGISTRATION_PENDING_CONSENT_CARDS,
  matchRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { formatNationalId } from '@/data/registrationForm';
import { findMrPatientByHn } from '@/data/mrPatients';

/* PHCIS | Consent — "กรอกแบบฟอร์มความยินยอม" (แท็บผู้รับบริการทั้งหมด)
   1 แถว = 1 คน จึงยังไม่รู้ว่าจะขอความยินยอมใบไหน — popup นี้ทำหน้าที่เลือก
   ใบก่อน แล้วค่อยพาไปหน้ากรอก

   content ใช้ชุดเดียวกับ Step 1 ของหน้าลงทะเบียนผู้รับบริการ (Figma 292:104252):
   หัวข้อ "แบบฟอร์มที่ยังไม่ขอความยินยอม" → การ์ด `PendingConsentFormCard`
   (พิมพ์ / กรอกแบบฟอร์ม) — ไม่มี Alert เตือนจำนวนใบ เพราะหัวข้อบอกอยู่แล้ว
   ต่างกันแค่ที่นี่รู้ว่าเป็นของใคร จึงมี PatientSummaryCard กำกับหัว popup

   "ยังไม่ขอความยินยอม" = ยังไม่มี consent record ของหัวข้อนั้นเลย (ทุกสถานะ) —
   ใบที่เคยขอแล้วหมดอายุ/ถูกถอน เป็นงานของ Re-Consent ในแท็บสถานะ ไม่ใช่ที่นี่ */

/** ใบที่ผู้รับบริการรายนี้ยังไม่เคยมีคำขอความยินยอมเลย (จาก record ทั้งแฟ้ม) */
export const pendingConsentCardsFor = (records = []) => {
  const requested = new Set(
    records
      .map((r) => matchRegistrationConsentFormId({ formCode: r.formCode, type: r.type }))
      .filter(Boolean),
  );
  return REGISTRATION_PENDING_CONSENT_CARDS.filter((c) => !requested.has(c.id));
};

const ConsentRequestFormsPopup = ({
  open,
  hn,
  name,
  records = [],
  onClose,
  onFill,
  onPrint,
}) => {
  const pending = useMemo(() => pendingConsentCardsFor(records), [records]);
  const patientCard = useMemo(
    () => (open && hn ? resolveConsentPatientCard(hn, name) : null),
    [open, hn, name],
  );
  /* nested popup — กรอกใบยินยอมซ้อนบน popup เลือกใบ (Popup จัด z-index เอง) */
  const [fillFormId, setFillFormId] = useState(null);

  const fillPatient = useMemo(() => {
    if (!hn) return null;
    const mr = findMrPatientByHn(hn);
    const rawId = mr?.nationalId || '';
    return {
      hn,
      fullName: patientCard?.fullName || name || '',
      nationalId: rawId ? formatNationalId(rawId) : '',
    };
  }, [hn, name, patientCard]);

  if (!open) return null;

  return (
    <>
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      width={960}
      title='กรอกแบบฟอร์มความยินยอม'
      subtitle='เลือกแบบฟอร์มที่ต้องการขอความยินยอมจากผู้รับบริการ'
      secondaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
        {patientCard && (
          <PatientSummaryCard
            /* พื้นหลังเข้ม — ชุดเดียวกับ ConsentConsentedFormsPopup ที่เปิดจาก
               แถวเดียวกัน จะได้เป็นการ์ดผู้รับบริการหน้าตาเดียวกันทั้งแท็บ */
            variant='gradient'
            avatarUrl={patientCard.avatarUrl}
            avatarAlt={patientCard.fullName || patientCard.shortName || ''}
            cells={[
              {
                label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                value: patientCard.fullName || patientCard.shortName || '—',
              },
              { label: 'HN (Hospital Number)', value: patientCard.hn || hn || '—' },
            ]}
          />
        )}

        {pending.length > 0 ? (
          <>
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <SectionTitle icon='assignment'>แบบฟอร์มที่ยังไม่ขอความยินยอม</SectionTitle>
              <div
                className='grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch'
                style={{ gap: 'var(--dim-space-400)' }}
              >
                {pending.map((item) => (
                  <PendingConsentFormCard
                    key={item.id}
                    {...item}
                    onPrint={() => onPrint?.(item.id)}
                    onFill={() => setFillFormId(item.id)}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <Alert
            type='success'
            title='ขอความยินยอมครบทุกแบบฟอร์มแล้ว'
            subtext='ผู้รับบริการรายนี้มีคำขอความยินยอมครบทั้ง 3 หัวข้อ — ใบที่หมดอายุหรือถูกถอนให้ใช้ Re-Consent จากแท็บสถานะ'
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
          />
        )}
      </div>
    </Popup>

    {/* nested — กรอกใบที่เลือก แล้วรายงานกลับให้หน้า worklist toast + รีเฟรช */}
    <ConsentDisclosureFillPopup
      open={!!fillFormId}
      formId={fillFormId}
      patient={fillPatient}
      onClose={() => setFillFormId(null)}
      onSaved={(payload) => {
        setFillFormId(null);
        onFill?.(payload);
      }}
    />
    </>
  );
};

export default ConsentRequestFormsPopup;
