import React, { useEffect, useMemo, useState } from 'react';
import BrandButton from '@/components/button/BrandButton';
import NeutralButton from '@/components/button/NeutralButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import { resolveFormScopes } from '@/components/consent/FormScopeGrouping';
import { stripConsentScopes, consentPositionLabel } from '@/data/consentFormScopes';
import Popup from '@/components/popup/Popup';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import AlertDialog from '@/components/popup/AlertDialog';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { StepReview, ConsentFormEditPopup } from '@/pages/consent/CreateConsentFormPage';
import { VersionHistoryPopup, bumpVersion } from '@/pages/consent/consentVersionHistory';
import {
  getConsentFormDraftById,
  readConsentFormDrafts,
  saveConsentFormWizardDraft,
} from '@/data/consentFormDraftStore';
import { buildWizardDraftFromRecord } from '@/data/consentFormWizardContent';
import { logExport, recordMrConsentSigning } from '@/data/consentWorkflowStore';
import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import Alert from '@/components/alert/Alert';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import ConsentIdentityVerifyPanel from '@/components/consent/ConsentIdentityVerifyPanel';
import ConsentQrScanBlock from '@/components/consent/ConsentQrScanBlock';
import { resolveRegistrationConsentFormId } from '@/data/registrationConsentForms';
import { DEFAULT_SERVICE_CENTER_CHANNEL } from '@/data/consentChannels';
import { DEFAULT_MR_PATIENT } from '@/data/mrPatients';
import { formatNationalId } from '@/data/registrationForm';

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

/* รหัสแบบฟอร์ม + เวอร์ชั่น — ใน popup ดูตัวอย่างจะถูกยกไปวางแถวเดียวกับ Alert
   (มติผู้ใช้ 25 ส.ค. 69) เพราะสองชิปนี้กินความสูงเต็มแถวโดยไม่มีข้อมูลพอ
   ส่วนหน้าเต็ม (ConsentFormViewPage) ยังวางไว้เหนือเนื้อหาเหมือนเดิม */
/* ปุ่ม "ผู้ที่มีสิทธิ์เข้าถึง" ย้ายจากคอลัมน์การดำเนินการในตารางเข้ามาอยู่ใน
   popup ดูตัวอย่าง (มติผู้ใช้ 25 ส.ค. 69) — hover แล้วเห็นรายชื่อได้เลย
   ไม่ต้องเปิด popup ซ้อน popup */
const ACCESS_HINT_TEXT = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  color: 'var(--text-content-secondary, #5F676D)',
  lineHeight: 1.5,
};
const ACCESS_HINT_GROUP = {
  ...ACCESS_HINT_TEXT,
  fontWeight: 'var(--type-weight-medium, 500)',
  color: 'var(--text-content-primary)',
};

export const ConsentFormAccessHoverButton = ({ record }) => {
  const groups = useMemo(() => {
    const scopes = stripConsentScopes(resolveFormScopes(record));
    const map = new Map();
    scopes.forEach((sc) => {
      const g = sc.group || '-';
      if (!map.has(g)) map.set(g, new Set());
      if (sc.subBranch && sc.subBranch !== '-') map.get(g).add(sc.subBranch);
    });
    return [...map.entries()].map(([group, subs]) => ({ group, subs: [...subs] }));
  }, [record]);

  const positions = (record?.positions || []).map(consentPositionLabel).filter(Boolean);

  const hint = (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
      {positions.length ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={ACCESS_HINT_GROUP}>ตำแหน่ง</span>
          <span style={ACCESS_HINT_TEXT}>{positions.join(' · ')}</span>
        </div>
      ) : null}
      {groups.length ? groups.map((g) => (
        <div key={g.group} className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={ACCESS_HINT_GROUP}>{g.group}</span>
          <span style={ACCESS_HINT_TEXT}>{g.subs.length ? g.subs.join(' · ') : 'ทุกหน่วยงาน'}</span>
        </div>
      )) : (
        <span style={ACCESS_HINT_TEXT}>ยังไม่ได้กำหนดผู้มีสิทธิ์เข้าถึง</span>
      )}
    </div>
  );

  return (
    /* self-stretch บน anchor ของ Tooltip + height 100% บนปุ่ม — ปุ่มจึงสูงเท่า
       กล่อง "รหัสแบบฟอร์ม" ที่อยู่แถวเดียวกัน (มติผู้ใช้ 25 ส.ค. 69)
       แถวนั้นเป็น items-stretch อยู่แล้ว ไม่ต้อง hardcode ความสูง */
    <Tooltip variant='light' position='bottom' maxWidth={360} content={hint} className='self-stretch shrink-0'>
      <NeutralSubdueButton
        leadingIcon='lock_person'
        variant='outline'
        size='sm'
        style={{ height: '100%' }}
      >
        ผู้ที่มีสิทธิ์เข้าถึง
      </NeutralSubdueButton>
    </Tooltip>
  );
};

export const ConsentFormMetaChips = ({ record }) => (
  <div className='flex items-stretch flex-wrap shrink-0' style={{ gap: 'var(--dim-space-200)' }}>
    <MetaCell label='รหัสแบบฟอร์ม'>
      <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{record.code || '—'}</ColorfulBadge>
    </MetaCell>
    <MetaCell label='เวอร์ชั่น'>
      <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{record.version}</ColorfulBadge>
    </MetaCell>
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
  /* popup ดูตัวอย่างยกชิป รหัส/เวอร์ชั่น ไปวางแถวเดียวกับ Alert เอง */
  showMeta = true,
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [bumpOpen, setBumpOpen] = useState(false);
  /* registry row ของร่างที่จะแก้ — เปิด wizard เป็น popup (ไม่นำทางออกจากหน้า) */
  const [editDraftFor, setEditDraftFor] = useState(null);

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
        {showMeta ? <ConsentFormMetaChips record={record} /> : null}

        <div className='hidden md:block'>
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
        </div>

        <div className='md:hidden flex flex-col min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
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
            stackLayout
          />
          <ConsentQrScanBlock
            qrNode={<FakeQR seed={record.code || record.name} />}
          />
        </div>

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
            /* กู้คืน = สร้างแบบร่างเวอร์ชันใหม่ (ไม่เผยแพร่ทันที) — โผล่ในแท็บ
               ที่ร่างไว้ของเมนูแบบฟอร์ม ให้แก้ไขก่อนเผยแพร่ */
            onRestoreVersion={(row, snapshot, nextVersion) => {
              /* กู้คืนซ้ำใบเดิม = อัปเดตร่างเดิม ไม่สร้างร่างซ้ำ — popup ประวัติ
                 ยังเปิดอยู่ ให้เห็นร่างใหม่บน timeline ทันที */
              const existing = readConsentFormDrafts().find(
                (d) => d.registry?.code === row.code && d.registry?.version === nextVersion,
              );
              saveConsentFormWizardDraft({
                ...buildWizardDraftFromRecord(row),
                version: nextVersion,
              }, { draftId: existing?.id });
            }}
            /* แก้ไขร่างจากการ์ดบน timeline → เปิด wizard เป็น popup ต่อ
               (ปิดใบประวัติก่อน ไม่ให้ popup ซ้อนกัน) */
            onEditDraft={(entry) => {
              setVersionOpen(false);
              const draft = getConsentFormDraftById(entry.draftId);
              if (draft?.registry) setEditDraftFor(draft.registry);
            }}
            onToast={onToast}
          />
          {/* wizard แก้ไขร่างจากการ์ดบน timeline — popup ต่อจากใบประวัติที่ปิดไปแล้ว */}
          <ConsentFormEditPopup
            key={editDraftFor ? `draft-${editDraftFor.id}` : 'draft-closed'}
            open={!!editDraftFor}
            record={editDraftFor}
            onClose={() => setEditDraftFor(null)}
            onPublished={({ code, version: ver }) => {
              setEditDraftFor(null);
              onToast?.({ id: Date.now(), variant: 'success', message: `เผยแพร่ ${code} เวอร์ชัน ${ver} แล้ว` });
            }}
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
       view → identity → fill
     ทางเข้านี้ผู้รับบริการไม่ได้ผ่านเวชระเบียน (ไม่ได้เสียบบัตรที่ตู้ Kiosk)
     จึงต้องคั่นขั้นยืนยันตัวตน (ด.1.1.1) ก่อนกรอกเสมอ — แผงเดียวกับ
     ConsentRequestFormsPopup แต่ไม่มีการ์ดข้อมูลบัตรฝั่งซ้าย เพราะยังไม่รู้
     ว่าผู้รับบริการเป็นใคร (ชื่อ/HN ไปกรอกในตัวฟอร์มเอง)
     บันทึกแล้วเข้า consent store ผูกกับเทมเพลตใบนี้ (รหัส/ชื่อ/เวอร์ชันจริง) */
  const [step, setStep] = useState('view');
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });
  /* กระจกสถานะจากแผงยืนยันตัวตน — state จริงอยู่ใน ConsentIdentityVerifyPanel */
  const IDENTITY_IDLE = { verifiedAt: null, method: null, methodText: '', reading: false, subject: 'self', subjectLabel: '' };
  const [identity, setIdentity] = useState(IDENTITY_IDLE);

  useEffect(() => {
    if (open) return;
    setStep('view');
    setIdentity(IDENTITY_IDLE);
    setFormApi({ ready: false, submit: () => {} });
  }, [open]);

  /* เทมเพลต PH-xxx สังกัดหัวข้อหลัก 1 ใน 3 — ใช้เอกสารกรอกของหัวข้อนั้น */
  const fillFormId = useMemo(
    () => (record ? resolveRegistrationConsentFormId({ formCode: record.code, type: record.type }) : null),
    [record],
  );

  /* ยืนยันตัวตนสำเร็จ = ระบบรู้แล้วว่าผู้รับบริการคือใคร → auto-fill
     ชื่อตามบัตร / เลขบัตรประชาชน / เลข HN ในฟอร์ม (mock: การอ่านบัตร/นิ้ว/
     เอกสารคืนตัวตนจากทะเบียน — ใช้ผู้รับบริการตัวอย่างของเวชระเบียน) */
  const verifiedPatient = useMemo(() => ({
    fullName: [DEFAULT_MR_PATIENT.prefixTh, DEFAULT_MR_PATIENT.firstNameTh, DEFAULT_MR_PATIENT.lastNameTh]
      .filter(Boolean).join(' '),
    nationalId: DEFAULT_MR_PATIENT.nationalId ? formatNationalId(DEFAULT_MR_PATIENT.nationalId) : '',
    hn: DEFAULT_MR_PATIENT.hn || '',
  }), []);

  const handleSubmit = ({ outcome, fullName, hn }) => {
    recordMrConsentSigning({
      hn,
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
  const isIdentity = step === 'identity';
  const isFill = step === 'fill';

  /* เข้าขั้นยืนยันตัวตนใหม่ทุกครั้ง — ผลยืนยันรอบก่อนใช้ข้ามรอบไม่ได้ */
  const openIdentity = () => {
    setIdentity(IDENTITY_IDLE);
    setFormApi({ ready: false, submit: () => {} });
    setStep('identity');
  };

  return (
    <Popup
      open={!!open && !!record}
      onClose={onClose}
      onBack={isView ? undefined : () => setStep(isFill ? 'identity' : 'view')}
      /* identity สูงตาม content (large) — view/fill เอกสารยาว ใช้เต็มจอ */
      size={isIdentity ? 'large' : 'extraLarge'}
      width={isIdentity ? 720 : undefined}
      title={isIdentity ? 'ยืนยันตัวตนผู้รับบริการ' : (record?.name || 'ดูแบบฟอร์มความยินยอม')}
      subtitle={isIdentity
        ? `ยืนยันตัวตนก่อนกรอก ${record?.name || 'แบบฟอร์มความยินยอม'}`
        : (isFill
          ? [record?.code, record?.version].filter(Boolean).join(' · ')
          : undefined)}
      actions={isView
        ? [
          { key: 'print', kind: 'secondary', label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
          { key: 'close', kind: 'secondary', label: 'ปิด', onClick: onClose },
          { key: 'fill', kind: 'primary', label: 'กรอกแบบฟอร์ม', leadingIcon: 'edit', onClick: openIdentity },
        ]
        : (isIdentity
          ? [
            { key: 'cancel', kind: 'secondary', label: 'ยกเลิก', onClick: () => setStep('view'), disabled: identity.reading },
            { key: 'next', kind: 'primary', label: 'ต่อไป', onClick: () => setStep('fill'), disabled: !identity.verifiedAt || identity.reading },
          ]
          : [
            { key: 'print', kind: 'tertiary', label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() },
            { key: 'cancel', kind: 'secondary', label: 'ยกเลิก', onClick: () => setStep('view') },
            { key: 'save', kind: 'primary', label: 'บันทึก', onClick: () => formApi.submit(), disabled: !formApi.ready },
          ])}
    >
      {isView && record && (
        <>
          {/* กัน user เข้าใจผิดว่าฟอร์มในโหมดดูกรอกได้ — ช่องทั้งหมดเป็น preview */}
          {/* Alert กับชิป รหัส/เวอร์ชั่น อยู่แถวเดียวกัน (มติผู้ใช้ 25 ส.ค. 69) —
              เดิมชิปกินความสูงเต็มแถวของตัวเองทั้งที่มีข้อมูลแค่ 2 ค่า */}
          <div
            className='flex items-stretch flex-wrap w-full min-w-0'
            style={{ gap: 'var(--dim-space-300)' }}
          >
            <div className='flex-1 min-w-0'>
              <Alert
                type='info'
                title='โหมดดูตัวอย่างแบบฟอร์ม'
                subtext='หน้านี้ยังกรอกข้อมูลไม่ได้ — กดปุ่ม "กรอกแบบฟอร์ม" ด้านล่างเพื่อเริ่มกรอกให้ผู้รับบริการ'
                showCloseButton={false}
                showBadge={false}
                showIndicator={false}
              />
            </div>
            <ConsentFormMetaChips record={record} />
            <ConsentFormAccessHoverButton record={record} />
          </div>
          <ConsentFormViewBody
          record={record}
          onToast={onToast}
          showActions={false}
          showAuditBar={showAuditBar}
          showMeta={false}
        />
        </>
      )}

      {isIdentity && (
        /* ไม่มีการ์ดข้อมูลบัตรฝั่งซ้าย — ทางเข้านี้ยังไม่รู้ว่าผู้รับบริการเป็นใคร
           (ไม่ได้ลงทะเบียนผ่านเวชระเบียนมาก่อน) เหลือเฉพาะคอลัมน์ยืนยันตัวตน */
        <ConsentIdentityVerifyPanel
          formTitle={record?.name}
          onChange={setIdentity}
        />
      )}

      {isFill && fillFormId && (
        <ConsentFormFillBody
            key={record?.code}
            /* สถานะยืนยันตัวตนเป็น badge ข้างหัวข้อ "ข้อมูลผู้ป่วย"
               (มติผู้ใช้ 25 ส.ค. 69) — เดิมเป็น Alert เต็มความกว้างเหนือฟอร์ม
               ทั้งที่เนื้อหาคือสถานะสั้น ๆ บรรทัดเดียว รายละเอียด (วิธียืนยัน +
               เวลา) ย้ายไปอยู่ใน title ของ badge */
            identityBadge={identity.verifiedAt ? (
              <ColorfulBadge
                style={identity.method === 'card' ? 'green' : 'yellow'}
                size='small'
                hierarchy='secondary'
                width='hug'
                /* tick ถูก แทนจุดสี (มติผู้ใช้ 25 ส.ค. 69) — ทั้งสองเคสคือ
                   "ยืนยันแล้ว" ต่างกันที่วิธี ซึ่ง tone สื่ออยู่แล้ว */
                icon='check_circle'
                title={[identity.methodText, identity.verifiedAt].filter(Boolean).join(' · ')}
              >
                {identity.method === 'card' ? 'ยืนยันตัวตนด้วยบัตรประชาชนแล้ว' : 'ยืนยันตัวตนโดยไม่ใช้บัตรประชาชน'}
              </ColorfulBadge>
            ) : null}
            formId={fillFormId}
            /* กรอกให้ล่วงหน้าเฉพาะเมื่อยืนยันตัวตนผ่านแล้ว (เข้าขั้นนี้ได้
               ต้องผ่าน identity เสมอ — เงื่อนไขกันไว้เผื่อ flow อื่นในอนาคต) */
            initialFullName={identity.verifiedAt ? verifiedPatient.fullName : ''}
            initialNationalId={identity.verifiedAt ? verifiedPatient.nationalId : ''}
            initialHn={identity.verifiedAt ? verifiedPatient.hn : ''}
            onStateChange={setFormApi}
            onSubmit={handleSubmit}
        />
      )}
    </Popup>
  );
}

export default ConsentFormViewPopup;
