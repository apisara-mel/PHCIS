import React, { useState } from 'react';
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
import { logExport } from '@/data/consentWorkflowStore';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import Alert from '@/components/alert/Alert';

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
  return (
    <Popup
      open={!!open && !!record}
      onClose={onClose}
      size='extraLarge'
      title={record?.name || 'ดูแบบฟอร์มความยินยอม'}
      actions={[
        { key: 'print', kind: 'secondary', label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
        { key: 'close', kind: 'secondary', label: 'ปิด', onClick: onClose },
      ]}
    >
      {record && (
        <div className='flex flex-col items-center w-full' style={{ gap: 'var(--dim-space-500)' }}>
          <Alert
            type='info'
            title='เอกสารสำหรับการตรวจสอบข้อมูล'
            subtext='เอกสารฉบับนี้จัดแสดงเพื่อการตรวจสอบข้อมูลเท่านั้น ไม่สามารถแก้ไขหรือบันทึกข้อมูลผ่านหน้าต่างนี้ได้'
            showCloseButton={false}
            showBadge={false}
            showIndicator={false}
            style={{ width: '100%', maxWidth: 'var(--dim-size-2900, 640px)' }}
          />
          <ConsentFormViewBody
            record={record}
            onToast={onToast}
            showActions={false}
            showAuditBar={showAuditBar}
          />
        </div>
      )}
    </Popup>
  );
}

export default ConsentFormViewPopup;
