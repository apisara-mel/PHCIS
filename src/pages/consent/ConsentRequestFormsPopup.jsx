import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Alert from '@/components/alert/Alert';
import AlertDialog from '@/components/popup/AlertDialog';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import PendingConsentFormCard from '@/components/consent/PendingConsentFormCard';
import ConsentFormPrintConfirmDialog from '@/components/consent/ConsentFormPrintConfirmDialog';
import ConsentIdentityVerifyPanel from '@/components/consent/ConsentIdentityVerifyPanel';
import ConsentFormFillBody from '@/components/consent/ConsentFormFillBody';
import SignedConsentFormBody from '@/pages/consent/SignedConsentFormBody';
import { toSignedFormViewEventFromRecord } from '@/data/signedConsentFormView';
import { recordDisclosureFill } from '@/components/consent/ConsentDisclosureFillPopup';
import {
  REGISTRATION_PENDING_CONSENT_CARDS,
  getRegistrationConsentForm,
  matchRegistrationConsentFormId,
} from '@/data/registrationConsentForms';
import { resolveConsentPatientCard } from '@/data/consentPatientDisplay';
import { formatNationalId, ID_CARD_CHIP_PHOTO_MOCK } from '@/data/registrationForm';
import { findMrPatientByHn } from '@/data/mrPatients';

/* PHCIS | Consent — "กรอกแบบฟอร์มความยินยอม" (แท็บผู้รับบริการทั้งหมด)
   1 แถว = 1 คน จึงยังไม่รู้ว่าจะขอความยินยอมใบไหน — popup นี้พาไปทีละขั้น

   ทั้งหมดอยู่ใน **Popup ใบเดียว** แล้ว drill-down เปลี่ยนเนื้อข้างในเอา
   (กติกา DS: ห้ามเปิด Popup ซ้อน Popup — ดู `NestedPopupPanel`)
     1. list — เลือกแบบฟอร์มที่ยังไม่เคยขอ (การ์ดชุดเดียวกับ Step 1 ลงทะเบียน)
     2. identity — ด.1.1.1 ยืนยันตัวตน: ข้อมูลเดิมจากบัตรในทะเบียน (รูป+ข้อมูล)
        แล้วเลือกวิธีจาก pill tab 3 แบบในขั้นเดียวกัน
          • นำบัตรมา      → เสียบบัตร แล้วกดอ่านบัตร
          • ไม่ได้นำบัตรมา → อัปโหลด/ถ่ายภาพใบขับขี่หรือหนังสือเดินทาง +
                           เจ้าหน้าที่ติ๊กว่าข้อมูลตรงกัน
          • บุคคลต่างด้าว  → สแกนลายนิ้วมือ (ไม่มีเลข 13 หลักให้เทียบ)
     3. form — กรอกเอกสารจริง (`ConsentFormFillBody` ใบเดียวกับหน้าเต็ม)
     4. view — ดูเอกสารที่ลงนามไว้แล้ว (read-only) ของใบที่ขอไปแล้ว
   ปุ่ม ‹ ที่หัว popup ถอยกลับทีละขั้น · ✕ ปิดทั้งใบ

   "ยังไม่ขอความยินยอม" = ยังไม่มี consent record ของหัวข้อนั้นเลย (ทุกสถานะ) —
   ใบที่เคยขอแล้วหมดอายุ/ถูกถอน เป็นงานของ Re-Consent ในแท็บสถานะ ไม่ใช่ที่นี่

   flow เต็ม: `docs/consent-fill-user-flow.md` */

/** ป้ายสถานะบนการ์ดใบที่เคยขอความยินยอมไปแล้ว — ข้อความสั้นกว่าใน worklist
    เพราะที่นี่ตอบแค่ "ใบนี้ทำไปแล้วหรือยัง / ผลเป็นยังไง" */
const REQUESTED_STATUS_BADGE = {
  'ยินยอมแล้ว':        { label: 'ให้ความยินยอมแล้ว', tone: 'green'  },
  'ปฏิเสธ':            { label: 'ปฏิเสธ',            tone: 'grey'   },
  'ถอนความยินยอม':     { label: 'ถอนความยินยอม',     tone: 'red'    },
  'รอลงนาม':           { label: 'รอลงนาม',           tone: 'orange' },
  'อยู่ระหว่างลงนาม':   { label: 'รอลงนาม',           tone: 'orange' },
  'ขอเพิกถอน':         { label: 'ขอเพิกถอน',         tone: 'red'    },
  'ใกล้หมดอายุ':        { label: 'ใกล้หมดอายุ',        tone: 'yellow' },
  'หมดอายุ':           { label: 'หมดอายุ',           tone: 'red'    },
};

/** ใบที่เคยมีคำขอแล้ว + สถานะล่าสุดของใบนั้น (id ใหญ่กว่า = สร้างทีหลัง) */
export const requestedConsentCardsFor = (records = []) => {
  const latest = new Map();
  records.forEach((r) => {
    const id = matchRegistrationConsentFormId({ formCode: r.formCode, type: r.type });
    if (!id) return;
    const prev = latest.get(id);
    if (!prev || (r.id || 0) >= (prev.id || 0)) latest.set(id, r);
  });
  return REGISTRATION_PENDING_CONSENT_CARDS
    .filter((c) => latest.has(c.id))
    .map((c) => {
      const record = latest.get(c.id);
      return {
        ...c,
        record,
        status: REQUESTED_STATUS_BADGE[record.status]
          || { label: record.status, tone: 'grey' },
      };
    });
};

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
  /* ใบที่ทำไปแล้ว — แยกอีก section ให้เห็นว่าเคยให้ความยินยอมแล้ว */
  const requested = useMemo(() => requestedConsentCardsFor(records), [records]);
  const patientCard = useMemo(
    () => (open && hn ? resolveConsentPatientCard(hn, name) : null),
    [open, hn, name],
  );

  /* 'list' | 'identity' | 'form' | 'view' — ขั้นภายใน popup ใบเดียวกัน */
  const [step, setStep] = useState('list');
  const [fillFormId, setFillFormId] = useState(null);
  /* กระจกสถานะจาก ConsentIdentityVerifyPanel — state จริงอยู่ในแผงนั้น
     popup ใช้แค่เปิดปุ่ม "ต่อไป" + เอาข้อความวิธียืนยันไปโชว์ในขั้นกรอกฟอร์ม */
  const IDENTITY_IDLE = { verifiedAt: null, method: null, methodText: '', reading: false, subject: 'self', subjectLabel: '' };
  const [identity, setIdentity] = useState(IDENTITY_IDLE);
  const [formApi, setFormApi] = useState({ ready: false, submit: () => {} });
  /* null | 'list' | 'close' — ค้างไว้ว่าจะไปไหนต่อหลังยืนยันละทิ้งที่กรอกค้าง */
  const [confirmDiscard, setConfirmDiscard] = useState(null);
  /* การ์ดใบที่กำลังจะพิมพ์ — ยืนยันก่อนสั่งพิมพ์ */
  const [printForm, setPrintForm] = useState(null);
  /* 'pending' | 'requested' — pill tab ในขั้นเลือกใบ */
  const [listTab, setListTab] = useState('pending');
  /* การ์ด + record ที่กำลังดูเอกสาร (ขั้น view) — เก็บการ์ดด้วยเพราะชื่อ/รหัส
     ฟอร์มที่จะโชว์บนหัว popup อยู่ที่การ์ด ไม่ใช่ที่ record (record เก็บชื่อ
     ตามที่ store บันทึกไว้ ซึ่งอาจว่างสำหรับใบที่เพิ่งเซ็นในรอบนี้) */
  const [viewCard, setViewCard] = useState(null);

  const meta = useMemo(
    () => (fillFormId ? getRegistrationConsentForm(fillFormId) : null),
    [fillFormId],
  );

  /* ปิดแล้วเปิดใหม่ = เริ่มที่รายการใบเสมอ · การยืนยันตัวตนไม่ค้างข้ามรอบ
     (state ภายในแผงยืนยันรีเซ็ตเองตอน unmount — เหลือแค่กระจกฝั่งนี้) */
  useEffect(() => {
    if (open) return;
    setStep('list');
    setListTab('pending');
    setViewCard(null);
    setFillFormId(null);
    setIdentity(IDENTITY_IDLE);
    setFormApi({ ready: false, submit: () => {} });
    setConfirmDiscard(null);
    setPrintForm(null);
  }, [open]);

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

  /* ข้อมูลเดิมจากบัตรประชาชน — ใช้ในขั้น "ไม่ได้นำบัตรมา" ให้เจ้าหน้าที่เทียบ
     กับเอกสารที่นำมาแทน (รูป + ข้อมูลหลักจากทะเบียนผู้รับบริการ) */
  const idCardOnFile = useMemo(() => {
    if (!hn) return null;
    const mr = findMrPatientByHn(hn);
    const addr = mr?.address;
    return {
      photoUrl: patientCard?.avatarUrl || '',
      /* รูปจากชิปบัตรประชาชน (ฉากหลังแถบวัดส่วนสูง) — mock ชุดเดียวกับที่
         หน้าลงทะเบียนใช้ตอนอ่านบัตรสมาร์ทการ์ด */
      idCardPhotoUrl: ID_CARD_CHIP_PHOTO_MOCK,
      fullName: patientCard?.fullName
        || [mr?.prefixTh, mr?.firstNameTh, mr?.lastNameTh].filter(Boolean).join(' ')
        || name
        || '',
      nationalId: mr?.nationalId ? formatNationalId(mr.nationalId) : '',
      dob: mr?.dob || '',
      gender: mr?.gender || '',
      hn,
      address: addr
        ? [addr.houseNo, addr.moo && `หมู่ ${addr.moo}`, addr.road, addr.subdistrict, addr.district, addr.province, addr.zip]
          .filter(Boolean).join(' ')
        : '',
    };
  }, [hn, name, patientCard]);

  if (!open) return null;

  /* เลือกใบ → เข้าขั้นยืนยันตัวตนเสมอ (เปลี่ยนใบก็ต้องยืนยันใหม่) */
  const openFill = (formId) => {
    setFillFormId(formId);
    setIdentity(IDENTITY_IDLE);
    setFormApi({ ready: false, submit: () => {} });
    setStep('identity');
  };

  const openView = (card) => {
    setViewCard(card);
    setStep('view');
  };

  const goList = () => {
    setStep('list');
    setViewCard(null);
    setFillFormId(null);
    setIdentity(IDENTITY_IDLE);
    setFormApi({ ready: false, submit: () => {} });
  };

  /* กรอกค้างไว้แล้วถอยกลับ/ปิด — เตือนก่อนทิ้ง (ขั้นเลือกใบ/เสียบบัตรไม่มีอะไรให้ทิ้ง) */
  const dirty = step === 'form' && formApi.ready;
  const run = (next) => (next === 'close' ? onClose?.() : goList());
  const request = (next) => () => (dirty ? setConfirmDiscard(next) : run(next));

  const isList = step === 'list';
  const isView = step === 'view';
  const isIdentity = step === 'identity';

  const title = isList
    ? 'กรอกแบบฟอร์มความยินยอม'
    : (isIdentity
      ? 'ยืนยันตัวตนผู้รับบริการ'
      : (isView
        ? (viewCard?.title || viewCard?.record?.formName || 'แบบฟอร์มที่ลงนามแล้ว')
        : meta?.title));
  const subtitle = isList
    ? 'เลือกแบบฟอร์มที่ต้องการขอความยินยอมจากผู้รับบริการ'
    : (isIdentity
      ? `ยืนยันตัวตนก่อนกรอก ${meta?.title || ''}`
      : (isView
        ? [viewCard?.code, viewCard?.version && `V ${viewCard.version}`, viewCard?.record?.status]
          .filter(Boolean).join(' · ')
        : `${meta?.categoryLabel} · ${meta?.id} · V ${meta?.version}`));

  return (
    <>
      <Popup
        open={open}
        onClose={request('close')}
        /* ‹ ถอยกลับไปรายการใบ — ไม่ใช่ปิดทั้งใบ (✕ ทำหน้าที่นั้น) */
        onBack={isList ? undefined : request('list')}
        /* identity ใช้ large (สูงตาม content) — extraLarge จะดึงเต็ม viewport
           เหลือที่ว่างใต้กล่องยืนยันเยอะ · form/view ยังต้องเต็มจอเพราะเอกสารยาว */
        size={(step === 'form' || isView) ? 'extraLarge' : 'large'}
        width={isList ? 960 : ((step === 'form' || isView) ? undefined : 1040)}
        title={title}
        subtitle={subtitle}
        primaryAction={isIdentity
          /* ปุ่มลงมือของแต่ละวิธี (อ่านบัตร / ยืนยันว่าเป็นคนเดียวกัน / สแกน
             ลายนิ้วมือ) อยู่ในกล่องของวิธีนั้น — footer เหลือ "ต่อไป" อย่างเดียว */
          ? { label: 'ต่อไป', onClick: () => setStep('form'), disabled: !identity.verifiedAt || identity.reading }
          : ((isList || isView)
            ? undefined
            : { label: 'บันทึก', onClick: () => formApi.submit(), disabled: !formApi.ready })}
        secondaryAction={isList
          ? { label: 'ปิด', onClick: onClose }
          : (isView
            ? { label: 'ปิด', onClick: goList }
            : { label: 'ยกเลิก', onClick: request('list'), disabled: identity.reading })}
        /* ด.1.1.15 — พิมพ์ใบยินยอมให้ลงนามบนกระดาษ (เฉพาะตอนอยู่ในเอกสารแล้ว) */
        tertiaryAction={(step === 'form' || isView)
          ? { label: 'พิมพ์', leadingIcon: 'print', onClick: () => window.print?.() }
          : undefined}
      >
        {isList && (
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

            {/* pill tab แทนสองหัวข้อซ้อนกัน — ใบที่ยังไม่ขอ vs ที่ขอไปแล้ว
                เป็นข้อมูลชุดเดียวกันคนละสถานะ จึงสลับดูทีละกลุ่ม */}
            <TabBar align='center' aria-label='กลุ่มแบบฟอร์มความยินยอม' className='self-center shrink-0 max-w-full'>
              <TabPill
                size='small'
                selected={listTab === 'pending'}
                leadingIcon='assignment'
                count={pending.length}
                onClick={() => setListTab('pending')}
              >
                ยังไม่ขอความยินยอม
              </TabPill>
              <TabPill
                size='small'
                selected={listTab === 'requested'}
                leadingIcon='assignment_turned_in'
                count={requested.length}
                onClick={() => setListTab('requested')}
              >
                ขอความยินยอมแล้ว
              </TabPill>
            </TabBar>

            {listTab === 'pending' && (
              pending.length > 0 ? (
                <div
                  className='grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch'
                  style={{ gap: 'var(--dim-space-400)' }}
                >
                  {pending.map((item) => (
                    <PendingConsentFormCard
                      key={item.id}
                      {...item}
                      onPrint={() => setPrintForm(item)}
                      onFill={() => openFill(item.id)}
                    />
                  ))}
                </div>
              ) : (
                <Alert
                  type='success'
                  title='ขอความยินยอมครบทุกแบบฟอร์มแล้ว'
                  subtext='ผู้รับบริการรายนี้มีคำขอความยินยอมครบทั้ง 3 หัวข้อ — ใบที่หมดอายุหรือถูกถอนให้ใช้ Re-Consent จากแท็บสถานะ'
                  showCloseButton={false}
                  showBadge={false}
                  showIndicator={false}
                />
              )
            )}

            {listTab === 'requested' && (
              requested.length > 0 ? (
                <div
                  className='grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch'
                  style={{ gap: 'var(--dim-space-400)' }}
                >
                  {requested.map((item) => (
                    <PendingConsentFormCard
                      key={item.id}
                      {...item}
                      status={item.status}
                      showFill={false}
                      onView={() => openView(item)}
                      onPrint={() => setPrintForm(item)}
                    />
                  ))}
                </div>
              ) : (
                <Alert
                  type='info'
                  title='ยังไม่เคยขอความยินยอมจากผู้รับบริการรายนี้'
                  subtext='เลือกแบบฟอร์มจากแท็บ "ยังไม่ขอความยินยอม" เพื่อเริ่มขอความยินยอม'
                  showCloseButton={false}
                  showBadge={false}
                  showIndicator={false}
                />
              )
            )}
          </div>
        )}

        {isIdentity && (
          /* แผงยืนยันตัวตนชุดกลาง — สองคอลัมน์ (ซ้าย = ข้อมูลบัตรในทะเบียน)
             + ตัวเลือกผู้ให้ความยินยอม (ตนเอง/ผู้ปกครองแทนบุตร) + pill tab 3 วิธี */
          <ConsentIdentityVerifyPanel
            idCard={idCardOnFile}
            formTitle={meta?.title}
            onChange={setIdentity}
          />
        )}

        {isView && viewCard?.record && (
          <SignedConsentFormBody
            event={toSignedFormViewEventFromRecord(viewCard.record)}
            patientHn={viewCard.record.hn || hn || ''}
            patientName={viewCard.record.name || fillPatient?.fullName || name || ''}
            showFormHeader
          />
        )}

        {step === 'form' && meta && (
          <>
            {identity.verifiedAt && (
              <Alert
                /* บัตรประชาชน = ช่องทางมาตรฐาน (เขียว) · วิธีทดแทน = เหลืองให้เอะใจ */
                type={identity.method === 'card' ? 'success' : 'warning'}
                title={identity.method === 'card'
                  ? 'ยืนยันตัวตนด้วยบัตรประชาชนแล้ว'
                  : 'ยืนยันตัวตนโดยไม่ใช้บัตรประชาชน'}
                subtext={[
                  fillPatient?.fullName,
                  identity.method === 'card' && identity.subject === 'self' ? fillPatient?.nationalId : null,
                  identity.methodText,
                  identity.verifiedAt,
                ].filter(Boolean).join(' · ')}
                showCloseButton={false}
                showBadge={false}
                showIndicator={false}
              />
            )}
            <ConsentFormFillBody
              key={fillFormId}
              formId={fillFormId}
              initialFullName={fillPatient?.fullName || ''}
              initialNationalId={fillPatient?.nationalId || ''}
              initialHn={fillPatient?.hn || ''}
              onStateChange={setFormApi}
              /* บันทึกแล้วกลับมาที่รายการใบ — ยังมีใบอื่นให้ทำต่อในคนเดียวกัน
                 (หน้า worklist แค่ toast ไม่ปิด popup) */
              onSubmit={(payload) => {
                const saved = recordDisclosureFill(payload, fillPatient);
                goList();
                onFill?.(saved);
              }}
            />
          </>
        )}
      </Popup>

      <ConsentFormPrintConfirmDialog
        form={printForm}
        onCancel={() => setPrintForm(null)}
        onConfirm={() => {
          const item = printForm;
          setPrintForm(null);
          window.print?.();
          onPrint?.(item?.id);
        }}
      />

      <AlertDialog
        open={!!confirmDiscard}
        type='warning'
        title={confirmDiscard === 'close' ? 'ปิดโดยไม่บันทึก?' : 'ย้อนกลับไปเลือกแบบฟอร์ม?'}
        description={`ข้อมูลที่กรอกใน ${meta?.title || 'แบบฟอร์ม'} จะไม่ถูกบันทึก`}
        confirmLabel={confirmDiscard === 'close' ? 'ปิด' : 'ย้อนกลับ'}
        cancelLabel='กรอกต่อ'
        onConfirm={() => { const next = confirmDiscard; setConfirmDiscard(null); run(next); }}
        onCancel={() => setConfirmDiscard(null)}
        onClose={() => setConfirmDiscard(null)}
      />
    </>
  );
};

export default ConsentRequestFormsPopup;
