import React, { useEffect, useRef, useState } from 'react';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import RadioButton from '@/components/radio/RadioButton';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import ConsentIdCardOnFile from '@/components/consent/ConsentIdCardOnFile';
import ConsentIdCardReadStep from '@/components/consent/ConsentIdCardReadStep';
import ConsentIdentitySuccessStep from '@/components/consent/ConsentIdentitySuccessStep';
import ConsentFingerprintScanStep from '@/components/consent/ConsentFingerprintScanStep';
import ConsentAltIdentityStep, {
  ALT_IDENTITY_CASE_LABEL,
  ALT_IDENTITY_DOC_TYPES,
} from '@/components/consent/ConsentAltIdentityStep';

/* ด.1.1.1 — แผงยืนยันตัวตนก่อนกรอกใบยินยอม (ใช้ร่วมทุกจุดเข้าของโมดูล Consent)

   รวม state ทั้งขั้นไว้ในตัวเอง แล้วรายงานผลขึ้นไปทาง `onChange` — popup แม่
   เหลือหน้าที่แค่เปิด/ปิดปุ่ม "ต่อไป" กับเอาข้อความวิธียืนยันไปแสดงต่อ
     • ConsentRequestFormsPopup (worklist ผู้รับบริการทั้งหมด) — มีข้อมูลบัตร
       ในทะเบียนของแถวนั้น → สองคอลัมน์ ซ้ายคือ ConsentIdCardOnFile
     • ConsentFormViewPopup (เมนูแบบฟอร์มความยินยอม) — ยังไม่รู้ว่าผู้รับบริการ
       เป็นใคร (ไม่ได้ผ่านเวชระเบียน) → ไม่มีการ์ดซ้าย เหลือคอลัมน์ยืนยันอย่างเดียว

   เพิ่มตัวเลือก "ผู้ให้ความยินยอม" (14 ส.ค. 2569): ผู้รับบริการด้วยตนเอง หรือ
   ผู้ปกครองให้แทนบุตรที่เป็นผู้เยาว์ — เปลี่ยนคำในกล่องยืนยัน (บัตร/นิ้ว/เอกสาร
   เป็นของผู้ปกครอง) และติดไปกับข้อความวิธียืนยันที่เก็บลง audit */

export const CONSENT_SIGNER_OPTIONS = [
  {
    value: 'self',
    title: 'ผู้รับบริการด้วยตนเอง',
    /* description ของ RadioButton เป็น nowrap — ต้องสั้นพอไม่ล้นกล่อง */
    description: 'ยืนยันตัวตนด้วยบัตรของตนเอง',
  },
  {
    value: 'guardian',
    title: 'ผู้ปกครองแทนบุตร (ผู้เยาว์)',
    description: 'ใช้บัตรผู้ปกครองยืนยันแทน',
  },
];

/** คนที่ต้องเสียบบัตร/วางนิ้ว/ยื่นเอกสาร ตามผู้ให้ความยินยอมที่เลือก */
const PERSON_LABEL = { self: 'ผู้รับบริการ', guardian: 'ผู้ปกครอง' };
const GUARDIAN_SUFFIX = ' · ผู้ปกครองให้ความยินยอมแทนบุตร';

const FIELD_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const ConsentIdentityVerifyPanel = ({ idCard, formTitle, contextText, onChange }) => {
  /* 'self' | 'guardian' — ใครเป็นผู้ให้ความยินยอม */
  const [subject, setSubject] = useState('self');
  /* 'card' | 'forgot' | 'foreign' — วิธียืนยันตัวตนจาก pill tab */
  const [idTab, setIdTab] = useState('card');
  const [altDocType, setAltDocType] = useState('');
  const [altFileName, setAltFileName] = useState('');
  const [altFileError, setAltFileError] = useState('');
  const [altMatched, setAltMatched] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [reading, setReading] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  /* 'card' | 'doc' | 'fingerprint' — วิธีที่ผ่านการยืนยันจริง + ข้อความ audit */
  const [method, setMethod] = useState(null);
  const [methodText, setMethodText] = useState('');
  const readTimer = useRef(null);

  useEffect(() => () => { if (readTimer.current) clearTimeout(readTimer.current); }, []);

  /* รายงานขึ้น popup แม่ — เก็บ onChange ใน ref กัน effect วนเพราะ arrow ใหม่ทุก render */
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    onChangeRef.current?.({
      verifiedAt,
      method,
      methodText,
      reading,
      subject,
      subjectLabel: CONSENT_SIGNER_OPTIONS.find((o) => o.value === subject)?.title || '',
    });
  }, [verifiedAt, method, methodText, reading, subject]);

  const personLabel = PERSON_LABEL[subject] || PERSON_LABEL.self;

  const resetVerification = () => {
    setVerifiedAt(null);
    setMethod(null);
    setMethodText('');
    setAltMatched(false);
  };

  /* สลับวิธี/ผู้ให้ความยินยอม = เริ่มใหม่ ผลของแบบก่อนหน้าใช้ไม่ได้ */
  const switchIdTab = (next) => {
    setIdTab(next);
    resetVerification();
  };
  const switchSubject = (next) => {
    if (next === subject) return;
    setSubject(next);
    resetVerification();
  };

  const stamp = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  /* mock เครื่องอ่านบัตร — ของจริงคือ event จาก smart-card reader (backend) */
  const startCardRead = () => {
    if (reading) return;
    setReading(true);
    readTimer.current = setTimeout(() => {
      readTimer.current = null;
      setReading(false);
      setMethod('card');
      setMethodText(subject === 'guardian'
        ? 'ผู้ปกครองยืนยันด้วยบัตรประชาชนของตนเอง (ให้ความยินยอมแทนบุตร)'
        : 'ยืนยันด้วยบัตรประชาชนของผู้รับบริการ');
      setVerifiedAt(stamp());
    }, 1400);
  };

  /* mock เครื่องสแกนลายนิ้วมือ — ของจริงเป็น event จากเครื่องอ่าน (backend) */
  const startFingerprintScan = () => {
    if (reading) return;
    setReading(true);
    readTimer.current = setTimeout(() => {
      readTimer.current = null;
      setReading(false);
      setMethod('fingerprint');
      setMethodText(`บุคคลต่างด้าว / ไม่มีบัตรประชาชน · ยืนยันด้วยการสแกนลายนิ้วมือ${subject === 'guardian' ? GUARDIAN_SUFFIX : ''}`);
      setVerifiedAt(stamp());
    }, 1600);
  };

  const confirmAlt = () => {
    if (!altDocType || !altFileName) return;
    const docLabel = ALT_IDENTITY_DOC_TYPES.find((o) => o.value === altDocType)?.label || '';
    setMethod('doc');
    setMethodText(`${ALT_IDENTITY_CASE_LABEL.forgot} · ตรวจ${docLabel} (${altFileName}) · เจ้าหน้าที่ยืนยันข้อมูลตรงกัน${subject === 'guardian' ? GUARDIAN_SUFFIX : ''}`);
    setVerifiedAt(stamp());
    setAltMatched(true);
  };

  /* DragAndDrop คืน array ของไฟล์ · กล้องคืน dataURL → เก็บแค่ชื่อไฟล์ไว้โชว์
     (mock — ยังไม่ส่งไฟล์จริงไปไหน) */
  const handleAltFilePick = (files) => {
    const file = Array.isArray(files) ? files[0] : files;
    if (!file) return;
    setAltFileError('');
    setAltFileName(file.name || 'เอกสารที่อัปโหลด');
  };

  const verifyColumn = (
    <div
      className={`flex flex-col min-w-0 ${idCard ? 'flex-1' : 'w-full'}`}
      style={{ gap: 'var(--dim-space-500)' }}
    >
      {/* ใครเป็นผู้ให้ความยินยอม — ต้องเลือกก่อนเพราะเปลี่ยนว่า "บัตรของใคร"
          ที่จะใช้ยืนยันในทุกวิธีด้านล่าง */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <span style={FIELD_LABEL}>ผู้ให้ความยินยอม</span>
        <div className='flex flex-wrap items-stretch w-full' style={{ gap: 'var(--dim-space-200)' }}>
          {CONSENT_SIGNER_OPTIONS.map((o) => (
            <RadioButton
              key={o.value}
              name='consent-signer-subject'
              value={o.value}
              title={o.title}
              description={o.description}
              checked={subject === o.value}
              disabled={reading}
              onChange={() => switchSubject(o.value)}
              border
              showRadio
              showCircleIcon={false}
              showIcon={false}
              showBadge={false}
              showBadgeTitle={false}
              style={{
                flex: '1 1 240px',
                minWidth: 0,
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
              }}
            />
          ))}
        </div>
      </div>

      {/* วิธียืนยัน 3 ทางเป็น pill tab */}
      <TabBar align='center' aria-label='วิธียืนยันตัวตน' className='self-center shrink-0 max-w-full'>
        <TabPill
          size='small'
          selected={idTab === 'card'}
          leadingIcon='credit_card'
          disabled={reading}
          onClick={() => switchIdTab('card')}
        >
          นำบัตรมา
        </TabPill>
        <TabPill
          size='small'
          selected={idTab === 'forgot'}
          leadingIcon='badge'
          disabled={reading}
          onClick={() => switchIdTab('forgot')}
        >
          ไม่ได้นำบัตรมา
        </TabPill>
        <TabPill
          size='small'
          selected={idTab === 'foreign'}
          leadingIcon='fingerprint'
          disabled={reading}
          onClick={() => switchIdTab('foreign')}
        >
          บุคคลต่างด้าว
        </TabPill>
      </TabBar>

      {/* ยืนยันผ่านแล้ว = แทนที่กล่องของวิธีนั้นด้วยสถานะสำเร็จ (Lottie
          consent-success + "ยืนยันตัวตนสำเร็จ") ไม่ต้องเดาว่าต้องทำอะไรต่อ */}
      {verifiedAt ? (
        <ConsentIdentitySuccessStep method={methodText} verifiedAt={verifiedAt} />
      ) : (
        <>
          {idTab === 'card' && (
            <ConsentIdCardReadStep
              formTitle={formTitle}
              contextText={contextText}
              personLabel={personLabel}
              status={reading ? 'reading' : 'idle'}
              verified={!!verifiedAt}
              onRead={startCardRead}
            />
          )}

          {idTab === 'forgot' && (
            <ConsentAltIdentityStep
              personLabel={personLabel}
              docType={altDocType}
              onDocTypeChange={setAltDocType}
              fileName={altFileName}
              onFilePick={handleAltFilePick}
              onOpenCamera={() => setCameraOpen(true)}
              onClearFile={() => { setAltFileName(''); setAltFileError(''); }}
              fileError={altFileError}
              matched={altMatched}
              onConfirmMatch={confirmAlt}
            />
          )}

          {idTab === 'foreign' && (
            <ConsentFingerprintScanStep
              formTitle={formTitle}
              contextText={contextText}
              personLabel={personLabel}
              status={reading ? 'scanning' : 'idle'}
              verified={!!verifiedAt}
              onScan={startFingerprintScan}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      {idCard ? (
        /* สองคอลัมน์เท่ากัน 50/50: ซ้าย = ข้อมูลบัตรที่มีในระบบ · ขวา = การยืนยัน
           items-stretch — คอลัมน์สูงเท่ากัน กล่องเขียวฝั่งขวายืดชนก้นการ์ดซ้าย */
        <div className='flex items-stretch w-full min-w-0' style={{ gap: 'var(--dim-space-600)' }}>
          <div className='flex flex-1 min-w-0'>
            <ConsentIdCardOnFile idCard={idCard} stacked />
          </div>
          {verifyColumn}
        </div>
      ) : verifyColumn}

      {/* กล้องถ่ายเอกสาร — CameraCapturePopup portal ไป document.body เอง
          จึงวางในนี้ได้โดยไม่ติดกติกา "ห้าม Popup ซ้อน Popup" ของ DOM ชั้นใน */}
      <CameraCapturePopup
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => {
          setCameraOpen(false);
          if (!dataUrl) return;
          setAltFileError('');
          setAltFileName('ภาพถ่ายเอกสาร.png');
        }}
      />
    </>
  );
};

export default ConsentIdentityVerifyPanel;
