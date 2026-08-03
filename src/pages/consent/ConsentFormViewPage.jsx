import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import AlertDialog from '@/components/popup/AlertDialog';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { StepReview } from '@/pages/consent/CreateConsentFormPage';
import { VersionHistoryPopup, bumpVersion } from '@/pages/consent/consentVersionHistory';
import { CONSENT_FORM_RECORDS, FORM_TYPE_TONE } from '@/data/consentFormRecords';
import { buildWizardPrefillFromRecord } from '@/data/consentFormWizardContent';
import { logExport } from '@/data/consentWorkflowStore';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import { ConsentFormSharePopup } from '@/pages/consent/ConsentFormSharePopup';
import CONSENT_NAV from '@/pages/consent/consentNav';

/* PHCIS | Consent — ดูแบบฟอร์มความยินยอม (Figma 302:143587).
   Header meta: ผู้ที่มีสิทธิ์เข้าถึง (scope chips + "+N เพิ่มเติม") · ประเภท ·
   เวอร์ชั่น. Content = StepReview (document preview + live Patient View
   phone). Sticky footer per Figma: วันที่อัปเดตล่าสุด · แก้ไข · พิมพ์ ·
   บันทึกผ่านคอมพิวเตอร์ · แสดง QR Code.

   Annotation 414:123633: เก็บ log เมื่อ export (บันทึกผ่านคอมพิวเตอร์) —
   แต่ "พิมพ์" ไม่เก็บ log. Audit bar per TOR 1.4.3.16. */

const TYPE_VALUE = {
  'การวิจัย': 'research',
  'บันทึกภาพ/สื่อ': 'media',
  'การรักษา': 'treatment',
  'ผ่าตัด': 'surgical',
  'วัคซีน': 'vaccine',
  'PDPA': 'data',
};

/* Representative consent clauses shown in the preview (registry rows carry no
   clause body, so a realistic default set stands in). */
const PREVIEW_SECTIONS = [
  { id: 's1', title: 'วัตถุประสงค์ของการให้ความยินยอม', detail: 'ข้าพเจ้าได้รับคำอธิบายถึงวัตถุประสงค์ ขั้นตอน ประโยชน์ และความเสี่ยงที่อาจเกิดขึ้นจากการรักษา/หัตถการนี้จากแพทย์ผู้ดูแลอย่างครบถ้วนแล้ว' },
  { id: 's2', title: 'ความเสี่ยงและภาวะแทรกซ้อนที่อาจเกิดขึ้น', detail: 'ข้าพเจ้าเข้าใจว่าการรักษาทุกชนิดมีความเสี่ยง และอาจเกิดภาวะแทรกซ้อนที่ไม่สามารถคาดการณ์ได้ ซึ่งทีมแพทย์จะดูแลอย่างเต็มความสามารถตามมาตรฐานวิชาชีพ' },
  { id: 's3', title: 'การเปิดเผยและคุ้มครองข้อมูลส่วนบุคคล', detail: 'ข้าพเจ้ายินยอมให้สถานพยาบาลเก็บรวบรวมและใช้ข้อมูลสุขภาพเพื่อการรักษาพยาบาล ภายใต้พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)' },
  { id: 's4', title: 'สิทธิในการเพิกถอนความยินยอม', detail: 'ข้าพเจ้าทราบว่าสามารถเพิกถอนความยินยอมนี้ได้ทุกเมื่อ โดยไม่กระทบต่อสิทธิในการรับบริการอื่น ๆ' },
];

const PATIENT_FIELD_KEYS = new Set(['name', 'hn', 'doctor', 'birth']);

const META_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.4,
};

/* Header meta cell — bordered mini-panel per Figma (ผู้ที่มีสิทธิ์เข้าถึง /
   ประเภท / เวอร์ชั่น). */
const MetaCell = ({ label, children }) => (
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
    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>{children}</div>
  </div>
);

export default function ConsentFormViewPage() {
  const history = useHistory();
  const { id } = useParams();
  const [qrOpen, setQrOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [versionOpen, setVersionOpen] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const record = useMemo(
    () => CONSENT_FORM_RECORDS.find((r) => String(r.id) === String(id)) || CONSENT_FORM_RECORDS[0],
    [id],
  );

  const scopeChips = record.scopes[0];
  const moreCount = record.scopes.length - 1;

  /* บันทึกผ่านคอมพิวเตอร์ = export → เก็บ log (annotation 414:123633). */
  const handleExport = () => {
    logExport({ source: `${record.code} ${record.name}`, format: 'file' });
    setToast({ id: Date.now(), variant: 'success', message: `บันทึกไฟล์ ${record.code} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
  };

  /* ด.1.1.15 — ดาวน์โหลด PDF เพื่อพิมพ์ให้ลงนามก่อนให้สิทธิเข้าถึง (เก็บ log). */
  const handleDownloadPdf = async () => {
    try {
      const filename = await downloadConsentFormPdf(record);
      logExport({ source: `${record.code} ${record.name}`, format: 'pdf' });
      setToast({ id: Date.now(), variant: 'success', message: `ดาวน์โหลด ${filename} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
    } catch {
      setToast({ id: Date.now(), variant: 'error', message: 'ไม่สามารถดาวน์โหลด PDF ได้ — ลองใหม่อีกครั้ง' });
    }
  };

  /* พิมพ์ — ไม่เก็บ log ตาม annotation. */
  const handlePrint = () => window.print?.();

  /* ด.1.1.5 — สร้างเวอร์ชันใหม่จาก wizard เดิม (prefill + bump, ห้ามแก้ทับ) */
  const goCreateVersion = () => {
    history.push('/consent/forms/new', {
      prefill: buildWizardPrefillFromRecord(record, { newVersion: true }),
    });
  };
  const handleEdit = () => {
    if (record.status === 'เผยแพร่') setBumpOpen(true);
    else history.push('/consent/forms/new', {
      prefill: buildWizardPrefillFromRecord(record, { newVersion: false }),
    });
  };

  return (
    <>
      <QueuePageShell
        activeKey='consent-forms'
        sidebarItems={CONSENT_NAV}
        sidebarFallbackKey='consent-forms'
        brandTitle='ระบบจัดการความยินยอม'
        breadcrumb={['แบบฟอร์มความยินยอม', 'ดูแบบฟอร์ม']}
        title={record.name}
        onBack={() => history.push('/consent/forms')}
        actions={(
          <div className='flex items-stretch flex-wrap justify-end' style={{ gap: 'var(--dim-space-200)' }}>
            <MetaCell label='ผู้ที่มีสิทธิ์เข้าถึง'>
              <ColorfulBadge style='magenta' size='small' hierarchy='secondary' width='hug'>{scopeChips.group}</ColorfulBadge>
              <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{scopeChips.subBranch}</ColorfulBadge>
              <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>{scopeChips.dept}</ColorfulBadge>
              {moreCount > 0 && (
                <span style={{ ...META_LABEL, whiteSpace: 'nowrap' }}>+{moreCount} เพิ่มเติม</span>
              )}
            </MetaCell>
            <MetaCell label='ประเภท'>
              <ColorfulBadge style={FORM_TYPE_TONE[record.type] || 'grey'} size='small' hierarchy='secondary' width='hug'>{record.type}</ColorfulBadge>
            </MetaCell>
            <MetaCell label='เวอร์ชั่น'>
              <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{record.version}</ColorfulBadge>
            </MetaCell>
          </div>
        )}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
          <StepReview
            name={record.name}
            docTitle={record.name}
            code={record.code}
            type={TYPE_VALUE[record.type] || 'general'}
            version={record.version}
            ttl='30'
            sections={PREVIEW_SECTIONS}
            patientFields={PATIENT_FIELD_KEYS}
            allowESign
          />

          {/* Audit trail — TOR 1.4.3.16 */}
          <ConsentAuditBar
            recordedBy={record.creator}
            recordedAt={record.updatedDate}
            editedAt={record.updatedDate}
          />

          {/* Sticky action bar — Figma 302:143587 footer */}
          <section
            className='flex items-center flex-wrap w-full sticky bottom-0'
            style={{
              gap: 'var(--dim-space-300)',
              padding: 'var(--dim-space-400) var(--dim-space-500)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              borderRadius: 'var(--dim-radius-400)',
              boxShadow: 'var(--shadow-card)',
              zIndex: 5,
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
            <NeutralButton variant='outline' size='md' leadingIcon='edit' onClick={handleEdit}>
              แก้ไข
            </NeutralButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={handlePrint}>
              พิมพ์
            </NeutralSubdueButton>
            <NeutralSubdueButton variant='outline' size='md' leadingIcon='ios_share' onClick={() => setShareOpen(true)}>
              ส่งออก
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
        </div>
      </QueuePageShell>

      {/* QR ให้ผู้ป่วยสแกนเปิดแบบฟอร์มบนมือถือ — Flow E */}
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

      {/* ด.1.1.5 — timeline เวอร์ชัน */}
      <VersionHistoryPopup
        open={versionOpen}
        record={record}
        onClose={() => setVersionOpen(false)}
        onCreateVersion={() => { setVersionOpen(false); goCreateVersion(); }}
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

      <ConsentFormSharePopup
        open={shareOpen}
        record={record}
        onClose={() => setShareOpen(false)}
        onShared={({ email }) => {
          setToast({ id: Date.now(), variant: 'success', message: `ส่งออก ${record.code} ไปยัง ${email} แล้ว — ระบบบันทึก log การส่งออกข้อมูล` });
        }}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
