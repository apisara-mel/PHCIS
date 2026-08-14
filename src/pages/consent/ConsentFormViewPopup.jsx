import React, { useEffect, useMemo, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import AlertDialog from '@/components/popup/AlertDialog';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { StepReview } from '@/pages/consent/CreateConsentFormPage';
import { VersionHistoryPopup, bumpVersion } from '@/pages/consent/consentVersionHistory';
import { logExport, recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import SecondarySearch from '@/components/search/SecondarySearch';
import { SuggestionRow as SearchSuggestionRow } from '@/components/search/PrimarySearch';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import Alert from '@/components/alert/Alert';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { resolveRegistrationConsentFormId } from '@/data/registrationConsentForms';
import { findMrPatientByHn, MR_PATIENTS } from '@/data/mrPatients';
import { formatNationalId } from '@/data/registrationForm';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';

/* PHCIS | Consent — ดูแบบฟอร์มความยินยอม ใน Popup (Figma 302:143587).
   เปิดจากปุ่ม visibility ในเมนูแบบฟอร์มความยินยอม แทนการนำทางเต็มหน้า. */


/** หมายเหตุท้ายเอกสาร (mock) — PDPA เท่านั้น */
const CONSENT_FORM_VIEW_NOTES = {
  PDPA: 'ข้อมูลส่วนบุคคลจะถูกเก็บรักษาและใช้เฉพาะตามวัตถุประสงค์ที่ระบุในแบบฟอร์มเท่านั้น',
};

const consentFormViewNote = () => CONSENT_FORM_VIEW_NOTES.PDPA;

const PREVIEW_SECTIONS = [
  { id: 's1', title: 'วัตถุประสงค์ของการให้ความยินยอม', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงที่อาจเกิดขึ้นจากการรักษา/หัตถการนี้จากแพทย์ผู้ดูแลอย่างครบถ้วนแล้ว' },
  { id: 's2', title: 'ความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น', detail: 'ข้าพเจ้าเข้าใจว่าการรักษาทุกชนิดมีความเสี่ยง และอาจเกิดภาวะแทรกซ้อนที่ไม่สามารถคาดการณ์ได้ ซึ่งทีมแพทย์จะดูแลอย่างเต็มความสามารถตามมาตรฐานวิชาชีพ' },
  { id: 's3', title: 'การเปิดเผยและคุ้มครองข้อมูลส่วนบุคคล', detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' },
  { id: 's4', title: 'สิทธิในการเพิกถอนความยินยอม', detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ' },
];

const PATIENT_FIELD_KEYS = new Set(['name', 'hn', 'doctor', 'birth']);

/** Mock staff avatars for form creators (ดูแบบฟอร์ม popup). */
const CREATOR_AVATAR = {
  'ลดา ดีงาม': '/avatars/telemed/nurse-a.png',
  'สมชาย มั่นใจดี': '/avatars/telemed/doctor-a.png',
  'พิมพ์ชนก ทองดี': '/avatars/patient-female-a.png',
  'กมลวรรณ พูนสุข': '/avatars/patient-female-b.png',
};

const resolveCreatorAvatar = (name) => CREATOR_AVATAR[name] || '/avatars/telemed/nurse-a.png';

const META_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

const MetaCell = ({ label, children, stack = false }) => (
  <div
    className='flex flex-col'
    style={{
      gap: 'var(--dim-space-100)',
      padding: 'var(--dim-space-200) var(--dim-space-300)',
      background: 'var(--surface-card-100)',
      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
      borderRadius: 'var(--dim-radius-300)',
    }}
  >
    <span style={META_LABEL}>{label}</span>
    <div
      className={stack ? 'flex flex-col w-full min-w-0' : 'flex items-center flex-wrap'}
      style={{ gap: 'var(--dim-space-100)' }}
    >
      {children}
    </div>
  </div>
);

/** Shared preview body — ใช้ใน Popup และหน้าเต็ม (deep link). */
export function ConsentFormViewBody({
  record,
  onEdit,
  onCreateVersion,
  onToast,
  showActions = true,
  showAuditBar = true,
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);

  if (!record) return null;

  const handleExport = () => {
    logExport({ source: `${record.code} ${record.name}`, format: 'file' });
    onToast?.({ id: Date.now(), variant: 'success', message: `บันทึกไฟล์ ${record.code} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
  };

  const handleDownloadPdf = async () => {
    try {
      const filename = await downloadConsentFormPdf(record);
      logExport({ source: `${record.code} ${record.name}`, format: 'pdf' });
      onToast?.({ id: Date.now(), variant: 'success', message: `ดาวน์โหลด ${filename} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
    } catch {
      onToast?.({ id: Date.now(), variant: 'error', message: 'ไม่สามารถดาวน์โหลด PDF ได้ — ลองใหม่อีกครั้ง' });
    }
  };

  const handlePrint = () => window.print?.();

  const handleEditClick = () => {
    if (record.status === 'เผยแพร่') setBumpOpen(true);
    else onEdit?.(record);
  };

  const goCreateVersion = () => {
    onCreateVersion?.(record);
  };

  return (
    <>
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <MetaCell label='รหัสแบบฟอร์ม'>
            <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{record.code || '—'}</ColorfulBadge>
          </MetaCell>
          <MetaCell label='เวอร์ชั่น'>
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{record.version}</ColorfulBadge>
          </MetaCell>
        </div>

        <StepReview
          name={record.name}
          docTitle={record.name}
          code={record.code}
          type='data'
          version={record.version}
          sections={PREVIEW_SECTIONS}
          patientFields={PATIENT_FIELD_KEYS}
          allowESign
          note={consentFormViewNote()}
          /* แผงขวาใช้ชุดเดียวกับหน้ากรอกใบยินยอมของเวชระเบียน — QR ให้
             ผู้รับบริการสแกนยินยอมเองผ่านมือถือ อยู่เหนือเครื่องตัวอย่าง */
          showPatientQr
        />

        {showAuditBar && (
        <ConsentAuditBar
          recordedBy={record.creator}
          {...(showActions
            ? {
              recordedAt: record.updatedDate,
              editedAt: record.updatedDate,
            }
            : {
              avatarSrc: resolveCreatorAvatar(record.creator),
              groupPolicy: record.group,
              showIcon: false,
              showTimestamps: false,
              showFlag: false,
              showRecordedByLabel: false,
            })}
        />
        )}

        {showActions && (
          <section
            className='flex items-center flex-wrap w-full'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-400) var(--dim-space-500)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-400)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 'var(--dim-radius-full)', background: 'var(--surface-brandPrimary-default)' }} />
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                วันที่อัปเดตล่าสุด: {record.updatedDate}
              </span>
            </span>
            <div className='flex-1' />
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='history' onClick={() => setVersionOpen(true)}>
              ประวัติเวอร์ชัน
            </NeutralSubdueButton>
            <NeutralButton variant='outline' size='md' leadingIcon='edit' onClick={handleEditClick}>
              แก้ไข
            </NeutralButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={handlePrint}>
              พิมพ์
            </NeutralSubdueButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='download' onClick={handleDownloadPdf}>
              ดาวน์โหลด PDF
            </NeutralSubdueButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='computer' onClick={handleExport}>
              บันทึกผ่านคอมพิวเตอร์
            </NeutralSubdueButton>
            <BrandButton variant='fill' size='md' leadingIcon='qr_code_2' onClick={() => setQrOpen(true)}>
              แสดง QR Code
            </BrandButton>
          </section>
        )}
      </div>

      {showActions && (
        <>
          <Popup
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            title='แสดง QR Code ให้ผู้รับบริการ'
            subtitle={record.name}
            size='default'
            secondaryAction={{ label: 'ปิด', onClick: () => setQrOpen(false) }}
          >
            <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <FakeQR seed={record.code} size={220} framed />
              <p
                className='text-center'
                style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', maxWidth: 320 }}
              >
                ให้ผู้รับบริการใช้กล้องมือถือสแกน QR นี้เพื่อเปิดแบบฟอร์ม {record.code} และลงลายเซ็นด้วยตนเอง
              </p>
            </div>
          </Popup>

          <VersionHistoryPopup
            open={versionOpen}
            record={record}
            onClose={() => setVersionOpen(false)}
            onCreateVersion={() => { setVersionOpen(false); goCreateVersion(); }}
            onRestoreVersion={() => setVersionOpen(false)}
            onToast={onToast}
          />
          <AlertDialog
            open={bumpOpen}
            type='warning'
            title='แบบฟอร์มนี้เผยแพร่แล้ว'
            description={`${record.code} (${record.version}) แก้ทับไม่ได้ — ระบบจะสร้างเวอร์ชันใหม่ ${bumpVersion(record.version)} ให้แก้ไขแทน`}
            confirmLabel='สร้างเวอร์ชันใหม่'
            cancelLabel='ยกเลิก'
            onConfirm={() => { setBumpOpen(false); goCreateVersion(); }}
            onCancel={() => setBumpOpen(false)}
            onClose={() => setBumpOpen(false)}
          />
        </>
      )}
    </>
  );
}

export function ConsentFormViewPopup({
  open,
  record,
  onClose,
  onToast,
  showAuditBar = false,
}) {
  /* drill-down ใน Popup ใบเดียว (ห้ามเปิด Popup ซ้อน Popup):
       view → patient (ต้องเลือกผู้รับบริการก่อน) → fill (กรอกแบบฟอร์มจริง)
     บันทึกแล้วเข้า consent store ผูกกับเทมเพลตใบนี้ (รหัส/ชื่อ/เวอร์ชันจริง) */
  const [step, setStep] = useState('view');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientHn, setPatientHn] = useState(null);
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });

  useEffect(() => {
    if (open) return;
    setStep('view');
    setPatientQuery('');
    setPatientHn(null);
    setFormApi({ ready: false, submit: () => {} });
  }, [open]);

  /* ค้นจากทะเบียนผู้รับบริการเต็ม (MR_PATIENTS 100 ราย) — พูลเดียวกับแท็บ
     ผู้รับบริการทั้งหมดใน worklist ไม่ใช่พูลคิว OPD ที่มีไม่กี่ราย */
  const suggestions = useMemo(() => {
    const q = patientQuery.trim().toLowerCase();
    if (!q) return [];
    return MR_PATIENTS
      .filter((m) => {
        const name = [m.prefixTh, m.firstNameTh, m.lastNameTh].filter(Boolean).join(' ');
        const card = resolveConsentPatientCard(m.hn);
        return [m.hn, name, card?.fullName, m.nationalId, m.phone]
          .some((f) => f && String(f).toLowerCase().includes(q));
      })
      .slice(0, 8)
      .map((m) => {
        const card = resolveConsentPatientCard(m.hn);
        return {
          id: m.hn,
          hn: m.hn,
          label: card?.fullName
            || [m.prefixTh, m.firstNameTh, m.lastNameTh].filter(Boolean).join(' '),
          value: m.hn,
          sublabel: m.nationalId ? `เลขบัตร ${formatNationalId(m.nationalId)}` : undefined,
          badges: [{ label: m.hn, tone: 'indigo' }],
        };
      });
  }, [patientQuery]);

  const patient = useMemo(() => {
    if (!patientHn) return null;
    const card = resolveConsentPatientCard(patientHn);
    const mr = findMrPatientByHn(patientHn);
    return {
      hn: patientHn,
      fullName: card?.fullName || card?.shortName || '',
      nationalId: mr?.nationalId ? formatNationalId(mr.nationalId) : '',
      avatarUrl: card?.avatarUrl || '',
    };
  }, [patientHn]);

  /* เทมเพลต PH-xxx สังกัดหัวข้อหลัก 1 ใน 3 — ใช้เอกสารกรอกของหัวข้อนั้น */
  const fillFormId = useMemo(
    () => (record ? resolveRegistrationConsentFormId({ formCode: record.code, type: record.type }) : null),
    [record],
  );

  const handleSubmit = ({ outcome, fullName, hn }) => {
    recordMrConsentSigning({
      hn: hn || patient?.hn,
      name: fullName,
      formId: record.code,
      formTitle: record.name,
      type: record.type,
      version: record.version,
      channel: DEFAULT_SERVICE_CENTER_CHANNEL,
      outcome,
    });
    onToast?.({
      id: Date.now(),
      variant: 'success',
      message: `บันทึกความยินยอม ${record.name} ของ ${fullName} แล้ว — ดูได้ที่เมนูจัดการความยินยอม`,
    });
    onClose?.();
  };

  const isView = step === 'view';
  const isPatient = step === 'patient';
  const isFill = step === 'fill';

  return (
    <Popup
      open={!!open && !!record}
      onClose={onClose}
      onBack={isView ? undefined : () => setStep(isFill ? 'patient' : 'view')}
      size={isPatient ? 'large' : 'extraLarge'}
      width={isPatient ? 640 : undefined}
      title={record?.name || 'ดูแบบฟอร์มความยินยอม'}
      subtitle={isPatient
        ? 'เลือกผู้รับบริการก่อนกรอกแบบฟอร์ม'
        : (isFill
          ? [record?.code, record?.version, patient?.fullName && `ผู้รับบริการ: ${patient.fullName}`]
            .filter(Boolean).join(' · ')
          : undefined)}
      actions={isView
        ? [
          { key: 'print', kind: 'secondary', label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
          { key: 'close', kind: 'secondary', label: 'ปิด', onClick: onClose },
          /* กรอกได้ต่อเมื่อเลือกผู้รับบริการก่อน — ปุ่มนี้พาไปขั้นเลือกคน */
          { key: 'fill', kind: 'primary', label: 'กรอกแบบฟอร์ม', leadingIcon: 'edit', onClick: () => setStep('patient') },
        ]
        : (isPatient
          ? [
            { key: 'back', kind: 'secondary', label: 'ย้อนกลับ', onClick: () => setStep('view') },
            { key: 'next', kind: 'primary', label: 'ต่อไป', onClick: () => setStep('fill'), disabled: !patient },
          ]
          : [
            { key: 'print', kind: 'tertiary', label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
            { key: 'cancel', kind: 'secondary', label: 'ยกเลิก', onClick: () => setStep('patient') },
            { key: 'save', kind: 'primary', label: 'บันทึก', onClick: () => formApi.submit(), disabled: !formApi.ready },
          ])}
    >
      {isView && record && (
        <>
          {/* กัน user เข้าใจผิดว่าฟอร์มในโหมดดูกรอกได้ — ช่องทั้งหมดเป็น preview */}
          <Alert
            type='info'
            title='นี่เป็นมุมมองสำหรับดูแบบฟอร์มเท่านั้น'
            subtext='หากต้องการกรอกแบบฟอร์มให้ผู้รับบริการ ให้คลิกปุ่ม "กรอกแบบฟอร์ม" ด้านล่าง แล้วเลือกผู้รับบริการก่อน'
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
          />
          <ConsentFormViewBody
          record={record}
          onToast={onToast}
          showActions={false}
          showAuditBar={showAuditBar}
        />
        </>
      )}

      {isPatient && (
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <span style={{
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm)',
            fontWeight: 'var(--type-weight-medium)',
          }}>
            ผู้รับบริการ <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span>
          </span>

          {patient ? (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              <PatientSummaryCard
                variant='gradient'
                avatarUrl={patient.avatarUrl}
                avatarAlt={patient.fullName}
                cells={[
                  { label: 'ชื่อ-นามสกุล ผู้รับบริการ', value: patient.fullName || '—' },
                  { label: 'HN (Hospital Number)', value: patient.hn },
                ]}
              />
              <NeutralSubdueButton
                variant='outline'
                size='sm'
                leadingIcon='swap_horiz'
                className='self-start'
                onClick={() => { setPatientHn(null); setPatientQuery(''); }}
              >
                เปลี่ยนผู้รับบริการ
              </NeutralSubdueButton>
            </div>
          ) : (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
              <SecondarySearch
                fullWidth
                value={patientQuery}
                onChange={(v) => setPatientQuery(v ?? '')}
                placeholder='ค้นหา HN / เลขบัตร / ชื่อ-สกุล / โทรศัพท์'
              />
              {patientQuery.trim() && (
                <div
                  className='scrollbar-thin flex flex-col w-full'
                  style={{
                    maxHeight: 320,
                    overflowY: 'auto',
                    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                    borderRadius: 'var(--dim-radius-300)',
                  }}
                >
                  {suggestions.length > 0 ? suggestions.map((item) => (
                    <SearchSuggestionRow
                      key={item.id || item.label}
                      item={item}
                      query={patientQuery}
                      onPick={(picked) => { setPatientHn(picked.hn || picked.id); setPatientQuery(''); }}
                    />
                  )) : (
                    <span style={{
                      padding: 'var(--dim-space-300)',
                      color: 'var(--text-content-tertiary)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm)',
                    }}>
                      ไม่พบรายการที่ค้นหา
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isFill && fillFormId && (
        <ConsentFormFillBody
          key={`${record?.code}-${patient?.hn}`}
          formId={fillFormId}
          initialFullName={patient?.fullName || ''}
          initialNationalId={patient?.nationalId || ''}
          initialHn={patient?.hn || ''}
          onStateChange={setFormApi}
          onSubmit={handleSubmit}
        />
      )}
    </Popup>
  );
}

export default ConsentFormViewPopup;
