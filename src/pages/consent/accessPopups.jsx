import React, { useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import CameraCapturePopup from '@/components/popup/CameraCapturePopup';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import FileUploadField from '@/components/forms/FileUploadField';
import DatePickerRange from '@/components/forms/DatePickerRange';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';

/* Helper popups ของ AccessManagementPage — TOR ด.1.1.17 (แตกไฟล์ตาม playbook):

     • ScanImportPopup   — 17.1 สแกนแบบฟอร์มขอเข้าถึงข้อมูลนำเข้าระบบ (ศัพท์
                           HCIS: บันทึกการ SCAN เอกสาร): อัปโหลด/ถ่ายภาพ →
                           mock-OCR prefill → ตรวจแก้ → บันทึกเป็นคำขอใหม่
     • ApprovePeriodPopup — 17.2 อนุมัติโดยระบุช่วงเวลาสิทธิ เริ่มต้น-สิ้นสุด
                           (validate สิ้นสุด ≥ เริ่ม)
     • AccessDetailPopup — รายละเอียดคำขอ + audit การเปิด/ปิดสิทธิ (17.3)

   Mock local; ทุกค่า visual alias design.md tokens; copy ไทย. */

const STAFF_NAME = 'ลดา ดีงาม';

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const LABEL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};
const ERROR_TEXT = {
  color: 'var(--text-danger-default, #B91C1C)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const isoFormat = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const isoParse = (s) => (s ? new Date(`${s}T00:00:00`) : null);

const PURPOSE_OPTIONS = [
  'การรักษาพยาบาล', 'การส่งต่อผู้ป่วย', 'การวิจัยทางการแพทย์',
  'การเบิกจ่ายค่ารักษา', 'การตรวจสอบคุณภาพ', 'การติดตามอาการ',
].map((p) => ({ value: p, label: p }));

const SCOPE_OPTIONS = ['ประวัติการรักษา', 'ผลตรวจ Lab', 'ภาพรังสี', 'ใบสั่งยา', 'ข้อมูลสิทธิ']
  .map((s) => ({ value: s, label: s }));

/* mock-OCR: ไฟล์ PDF อ่านได้ → prefill / ไฟล์ภาพ (รวมภาพจากกล้อง) อ่านไม่ได้
   → ฟอร์มเปล่าให้กรอกเอง (edge case ตาม spec — ไม่ block) */
const OCR_RESULT = {
  name: 'ธนวัฒน์ ศรีสุข',
  empCode: 'EMP-0142',
  unit: 'ศูนย์บริการสาธารณสุข 41 คลองเตย',
  hn: '67-00009',
  purpose: 'การส่งต่อผู้ป่วย',
  scopes: ['ประวัติการรักษา', 'ผลตรวจ Lab'],
};

/* ══ 17.1 — สแกนแบบฟอร์มนำเข้า ══════════════════════════════════════════ */
export function ScanImportPopup({ open, onClose, onImported }) {
  const [phase, setPhase] = useState('upload');         // upload | reading | review
  const [fileName, setFileName] = useState(null);
  const [fileError, setFileError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [ocrFailed, setOcrFailed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  /* review fields (แก้ไขได้ทุกช่องก่อนบันทึก) */
  const [name, setName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [unit, setUnit] = useState('');
  const [hn, setHn] = useState('');
  const [purpose, setPurpose] = useState('');
  const [scopes, setScopes] = useState([]);
  /* timeout id ของ mock-OCR — ต้อง clear เมื่อปิด popup / unmount ไม่งั้น
     timer ยิง setState บน component ที่ปิด/ถอดไปแล้ว (React 17 warning) */
  const ocrTimerRef = useRef(null);
  const clearOcrTimer = () => {
    if (ocrTimerRef.current) { clearTimeout(ocrTimerRef.current); ocrTimerRef.current = null; }
  };

  useEffect(() => {
    if (!open) { clearOcrTimer(); return; }
    clearOcrTimer();
    setPhase('upload'); setFileName(null); setFileError(''); setCameraOpen(false);
    setOcrFailed(false); setConfirmDiscard(false);
    setName(''); setEmpCode(''); setUnit(''); setHn(''); setPurpose(''); setScopes([]);
  }, [open]);

  /* unmount (เช่นเปลี่ยน route ระหว่าง phase 'reading') → clear เสมอ */
  useEffect(() => clearOcrTimer, []);

  const handleFile = (file) => {
    const okType = /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!okType) { setFileError('รองรับเฉพาะไฟล์ PDF, JPG หรือ PNG'); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError('ไฟล์ต้องไม่เกิน 10 MB'); return; }
    setFileError('');
    setFileName(file.name);
    runOcr(file.name, /\.pdf$/i.test(file.name));
  };

  const handleCameraCapture = () => {
    setCameraOpen(false);
    setFileName('camera-scan.png');
    runOcr('camera-scan.png', false);
  };

  /* mock-OCR อ่านเอกสาร ~1.2 วิ */
  const runOcr = (fname, readable) => {
    clearOcrTimer();
    setPhase('reading');
    ocrTimerRef.current = setTimeout(() => {
      ocrTimerRef.current = null;
      if (readable) {
        setOcrFailed(false);
        setName(OCR_RESULT.name); setEmpCode(OCR_RESULT.empCode); setUnit(OCR_RESULT.unit);
        setHn(OCR_RESULT.hn); setPurpose(OCR_RESULT.purpose); setScopes(OCR_RESULT.scopes);
      } else {
        setOcrFailed(true);
        setName(''); setEmpCode(''); setUnit(''); setHn(''); setPurpose(''); setScopes([]);
      }
      setPhase('review');
    }, 1200);
  };

  const dirty = fileName || name || hn;
  const ready = phase === 'review' && name.trim() && hn.trim() && purpose && scopes.length > 0;

  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };

  const save = () => {
    if (!ready) return;
    onImported({ name: name.trim(), empCode: empCode.trim(), unit: unit.trim(), hn: hn.trim(), purpose, scopes, fileName });
  };

  return (
    <>
      <Popup
        open={open}
        onClose={requestClose}
        size='large'
        title='สแกนแบบฟอร์มนำเข้า (บันทึกการ SCAN เอกสาร)'
        subtitle='อัปโหลดหรือถ่ายภาพแบบฟอร์มขอเข้าถึงข้อมูล — ระบบอ่านข้อมูล (OCR) แล้วให้ตรวจแก้ก่อนบันทึกเป็นคำขอใหม่'
        primaryAction={{ label: 'บันทึกเป็นคำขอใหม่', onClick: save, disabled: !ready }}
        secondaryAction={{ label: 'ยกเลิก', onClick: requestClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
          {/* จังหวะ 1 — เอกสาร */}
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={LABEL_TEXT}>1. เอกสารแบบฟอร์ม <span style={{ color: 'var(--text-danger-default, #B91C1C)' }}>*</span></span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <FileUploadField
                accept='.pdf,.jpg,.jpeg,.png'
                buttonLabel='อัปโหลดไฟล์สแกน'
                fileName={fileName}
                onFile={handleFile}
                onClear={() => { clearOcrTimer(); setFileName(null); setPhase('upload'); }}
              />
              <NeutralSubdueButton size='sm' leadingIcon='photo_camera' onClick={() => setCameraOpen(true)}>
                ถ่ายภาพเอกสาร
              </NeutralSubdueButton>
            </div>
            <span style={{ ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}>
              PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB — ไฟล์ PDF ระบบอ่านข้อมูลอัตโนมัติได้แม่นยำที่สุด
            </span>
            {fileError && <span style={ERROR_TEXT}>{fileError}</span>}
          </div>

          {phase === 'reading' && (
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Icon name='document_scanner' size={18} color='var(--text-brandPrimary-default)' />
              <span style={BODY_TEXT}>กำลังอ่านข้อมูลจากเอกสาร (OCR)…</span>
            </div>
          )}

          {/* จังหวะ 2 — ตรวจแก้ก่อนบันทึก */}
          {phase === 'review' && (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div
                className='flex items-start'
                style={{
                  gap: 'var(--dim-space-200)',
                  paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                  background: ocrFailed ? 'var(--surface-danger-tertiary, #FEE2E2)' : 'var(--surface-statussummarycard-positive, #D1F6EE)',
                  borderRadius: 'var(--dim-radius-300)',
                }}
              >
                <Icon name={ocrFailed ? 'error' : 'check_circle'} size={18} color={ocrFailed ? 'var(--text-danger-default, #B91C1C)' : 'var(--text-statussummarycard-positive-number, #196C65)'} />
                <span style={{ ...BODY_TEXT, color: ocrFailed ? 'var(--text-danger-default, #B91C1C)' : 'var(--text-statussummarycard-positive-number, #196C65)' }}>
                  {ocrFailed
                    ? 'OCR อ่านข้อมูลจากภาพไม่สำเร็จ — กรอกข้อมูลเองได้ทุกช่องด้านล่าง (ไฟล์แนบยังถูกเก็บไว้)'
                    : 'อ่านข้อมูลจากเอกสารสำเร็จ — ตรวจสอบและแก้ไขก่อนบันทึก'}
                </span>
              </div>
              <span style={LABEL_TEXT}>2. ตรวจสอบข้อมูลคำขอ</span>
              <div className='flex items-start flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
                <div className='flex flex-col' style={{ flex: '1 1 260px', gap: 'var(--dim-space-300)' }}>
                  <InputField label='ผู้ขอ (เจ้าหน้าที่)' required value={name} onChange={setName} placeholder='ชื่อ-นามสกุลผู้ขอ' />
                  <InputField label='รหัสพนักงาน' value={empCode} onChange={setEmpCode} placeholder='เช่น EMP-0142' />
                  <InputField label='หน่วยงาน' value={unit} onChange={setUnit} placeholder='หน่วยงานต้นสังกัด' />
                </div>
                <div className='flex flex-col' style={{ flex: '1 1 260px', gap: 'var(--dim-space-300)' }}>
                  <InputField label='HN ผู้รับบริการ' required value={hn} onChange={setHn} placeholder='เช่น 67-00009' />
                  <Select label='วัตถุประสงค์' required options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} placeholder='เลือกวัตถุประสงค์' searchable={false} />
                  <Select multiple selectAllLabel='เลือกทุกหมวด' label='ขอบเขตข้อมูลที่ขอเข้าถึง' required options={SCOPE_OPTIONS} value={scopes} onChange={setScopes} placeholder='เลือกหมวดข้อมูล' searchable={false} />
                </div>
              </div>
            </div>
          )}
        </div>
      </Popup>

      {/* ถ่ายภาพเอกสารด้วยกล้อง (reuse CameraCapturePopup เดิม) */}
      <CameraCapturePopup
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <AlertDialog
        open={confirmDiscard}
        type='warning'
        title='ละทิ้งการแก้ไข?'
        description='เอกสารที่สแกนและข้อมูลที่กรอกไว้จะไม่ถูกบันทึก'
        confirmLabel='ละทิ้ง'
        cancelLabel='ทำต่อ'
        onConfirm={() => { setConfirmDiscard(false); onClose(); }}
        onCancel={() => setConfirmDiscard(false)}
        onClose={() => setConfirmDiscard(false)}
      />
    </>
  );
}

/* ══ 17.2 — อนุมัติพร้อมช่วงเวลาสิทธิ ═══════════════════════════════════ */
export function ApprovePeriodPopup({ open, record, onClose, onApprove }) {
  const [range, setRange] = useState(['', '']);

  useEffect(() => {
    if (!open) return;
    setRange([isoFormat(new Date()), '']);
  }, [open]);

  const [startIso, endIso] = range;
  const invalidOrder = !!startIso && !!endIso && endIso < startIso;
  const ready = !!startIso && !!endIso && !invalidOrder;

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      title='อนุมัติคำขอ — ระบุช่วงเวลาสิทธิ'
      subtitle={record ? `${record.reqNo} · ${record.name} · HN ${record.hn}` : undefined}
      primaryAction={{ label: 'อนุมัติสิทธิ', onClick: () => ready && onApprove({ periodStart: startIso, periodEnd: endIso }), disabled: !ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <span style={BODY_TEXT}>
          สิทธิเข้าถึงข้อมูลจะ Active เฉพาะช่วงเวลาที่ระบุ — พ้นวันสิ้นสุดระบบจะปรับสถานะเป็น
          Inactive อัตโนมัติ (ด.1.1.17.2)
        </span>
        <DatePickerRange
          label='ช่วงเวลาที่ให้สิทธิ (เริ่มต้น - สิ้นสุด)'
          required
          value={range}
          onChange={setRange}
          format={isoFormat}
          parse={isoParse}
          error={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
          helperText={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : 'ตัวอย่าง: ให้สิทธิ 30 วันสำหรับการส่งต่อผู้ป่วย'}
        />
      </div>
    </Popup>
  );
}

/* ══ รายละเอียดคำขอ + audit สถานะ Active (17.3) ═════════════════════════ */
const DetailRow = ({ label, value }) => (
  <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
    <span style={{ width: 160, flexShrink: 0, ...BODY_TEXT, color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{ flex: 1, ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{value || '-'}</span>
  </div>
);

export function AccessDetailPopup({ open, record, onClose, thaiDateOfIso }) {
  if (!record) return null;
  return (
    <Popup
      open={open}
      onClose={onClose}
      size='large'
      title='รายละเอียดสิทธิการเข้าถึง'
      subtitle={`${record.reqNo} · ${record.name}`}
      primaryAction={{ label: 'ปิด', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          <ColorfulBadge style={record.active ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
            {record.active ? 'Active' : 'Inactive'}
          </ColorfulBadge>
          <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{record.status}</ColorfulBadge>
        </div>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
          <DetailRow label='ผู้ขอ (เจ้าหน้าที่)' value={`${record.name} · ${record.empCode}`} />
          <DetailRow label='HN ผู้รับบริการ' value={record.hn} />
          <DetailRow label='วัตถุประสงค์' value={record.purpose} />
          <DetailRow
            label='ช่วงเวลาสิทธิ'
            value={record.periodStart
              ? `${thaiDateOfIso(record.periodStart)} – ${thaiDateOfIso(record.periodEnd)}`
              : 'ยังไม่กำหนด (รออนุมัติ)'}
          />
          <DetailRow label='ไฟล์แนบ' value={`${record.file} (${record.fileSize})`} />
        </div>
        {/* audit การอนุมัติ / toggle Active ล่าสุด — TOR 1.4.3.16 */}
        <ConsentAuditBar
          recordedBy={(record.audit && record.audit.by) || STAFF_NAME}
          recordedAt={(record.audit && record.audit.at) || record.createdDate}
          editedAt={record.audit && record.audit.editedAt}
        />
      </div>
    </Popup>
  );
}
