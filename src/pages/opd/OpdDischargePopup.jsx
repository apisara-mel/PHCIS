import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import Dropdown from '@/components/forms/Dropdown';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Badge from '@/components/badge/Badge';
import Icon from '@/components/icons/Icon';
import { addWalkinRequest, WALKIN_DEPARTMENTS } from '@/data/opdWalkinRequests';

/* OpdDischargePopup — TOR 1.2.6.1 จำหน่าย/ส่งต่อผู้รับบริการ (3 branches).
   Canonical mount = /treat/record (integrator wires it); fallback mount =
   /opd/queue row action on ตรวจเสร็จแล้ว rows, so the flow is reachable
   before the integrator lands. Branches:
     1. ส่งตัวกลับบ้าน           — optional คำแนะนำ + นัดหมายครั้งถัดไป link
     2. ส่งต่อแผนกอื่นภายในศูนย์ — dept Dropdown → creates walk-in request
     3. ส่งต่อสถานพยาบาลอื่น    — hospital lookup (legacy manual §2.10:
        type ≥1 char → filtered list → select) + เหตุผล + พิมพ์ใบส่งตัว
   Confirm stamps ผู้บันทึก + เวลา and reports the disposition upward. */

/* Hospital catalog — legacy §2.10 lookup-dialog list (กทม. + ปริมณฑล). */
const HOSPITALS = [
  'โรงพยาบาลกลาง',
  'โรงพยาบาลตากสิน',
  'โรงพยาบาลเจริญกรุงประชารักษ์',
  'โรงพยาบาลหลวงพ่อทวีศักดิ์ ชุตินฺธโร อุทิศ',
  'โรงพยาบาลเวชการุณย์รัศมิ์',
  'โรงพยาบาลลาดกระบังกรุงเทพมหานคร',
  'โรงพยาบาลราชพิพัฒน์',
  'โรงพยาบาลสิรินธร',
  'โรงพยาบาลผู้สูงอายุบางขุนเทียน',
  'โรงพยาบาลรามาธิบดี',
  'โรงพยาบาลราชวิถี',
  'โรงพยาบาลพระมงกุฎเกล้า',
  'สถาบันสุขภาพเด็กแห่งชาติมหาราชินี',
];

const REFER_REASON_SUGGESTIONS = [
  'เกินศักยภาพของศูนย์บริการสาธารณสุข ต้องการการตรวจเพิ่มเติมเฉพาะทาง',
  'ส่งต่อเพื่อพบแพทย์เฉพาะทางตามสิทธิการรักษา',
  'ต้องการการตรวจทางห้องปฏิบัติการ/ภาพถ่ายรังสีที่ศูนย์ไม่มี',
  'อาการไม่ทุเลาหลังการรักษาเบื้องต้น ส่งต่อเพื่อประเมินซ้ำ',
  'ผู้ป่วยมีภาวะแทรกซ้อนที่ต้องเฝ้าระวังใกล้ชิด',
];

const HOME_ADVICE_SUGGESTIONS = [
  'รับประทานยาตามแพทย์สั่งให้ครบ หากอาการไม่ดีขึ้นใน 3 วันให้กลับมาพบแพทย์',
  'ดื่มน้ำมากๆ พักผ่อนให้เพียงพอ งดอาหารรสจัด',
  'สังเกตอาการไข้ หากไข้สูงเกิน 38.5°C ให้เช็ดตัวและมาพบแพทย์ทันที',
  'ทำแผลทุกวัน ห้ามให้แผลโดนน้ำ นัดตัดไหมตามกำหนด',
  'ออกกำลังกายเบาๆ ตามคำแนะนำ หลีกเลี่ยงการยกของหนัก',
];

/* Chrome-free native input inside our own bordered wrapper — per CLAUDE.md
   "No browser-default input chrome" (AISearch canonical pattern). */
const HOSP_INPUT_STYLE_ID = 'mih-opd-hosp-input-style';
const ensureHospInputStyle = () => {
  if (typeof document === 'undefined') return;
  const css = `
.mih-opd-hosp-input,
.mih-opd-hosp-input:focus,
.mih-opd-hosp-input:focus-visible {
  caret-color: transparent;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-opd-hosp-input::placeholder {
  color: var(--text-input-default, #ADB2B7);
  opacity: 1;
}`;
  const existing = document.getElementById(HOSP_INPUT_STYLE_ID);
  if (existing) { existing.textContent = css; return; }
  const tag = document.createElement('style');
  tag.id = HOSP_INPUT_STYLE_ID;
  tag.textContent = css;
  document.head.appendChild(tag);
};
ensureHospInputStyle();

const BRANCHES = [
  { key: 'home', icon: 'home', label: 'ส่งตัวกลับบ้าน', sub: 'จบการรักษาวันนี้' },
  { key: 'dept', icon: 'move_down', label: 'ส่งต่อแผนกอื่นภายในศูนย์', sub: 'สร้างคำขอ Walk-in ให้แผนกปลายทาง' },
  { key: 'refer', icon: 'local_hospital', label: 'ส่งต่อสถานพยาบาลอื่น (Refer)', sub: 'ค้นหาสถานพยาบาลปลายทาง + ใบส่งตัว' },
];

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const OpdDischargePopup = ({
  open,
  onClose,
  patient = {},
  /** onConfirm(result) — result: { branch, dept?, hospital?, reason?, advice?, by, at } */
  onConfirm,
  /** onScheduleAppointment(patient) — opens the appointment system for the
      follow-up visit of the ส่งตัวกลับบ้าน branch. Omit and the link renders
      disabled instead of as a dead affordance. */
  onScheduleAppointment,
  recordedBy = 'พว.กานดา ศรีวิไล',
}) => {
  const [branch, setBranch] = useState(null);
  const [advice, setAdvice] = useState('');
  const [dept, setDept] = useState('');
  const [hospQuery, setHospQuery] = useState('');
  const [hospital, setHospital] = useState('');
  const [referReason, setReferReason] = useState('');
  const [printAlert, setPrintAlert] = useState(false);
  const [confirmedStamp, setConfirmedStamp] = useState(null);

  /* Reset per open so a second patient never inherits the previous state. */
  useEffect(() => {
    if (open) {
      setBranch(null); setAdvice(''); setDept('');
      setHospQuery(''); setHospital(''); setReferReason('');
      setConfirmedStamp(null);
    }
  }, [open]);

  const hospMatches = useMemo(() => {
    const q = hospQuery.trim();
    if (q.length < 1) return [];
    return HOSPITALS.filter((h) => h.includes(q)).slice(0, 6);
  }, [hospQuery]);

  /* Three DISTINCT rights states — collapsing them into one red-flag strip
     trains staff to ignore it. 'ชำระเอง' is a legitimate self-pay status in
     patientProfiles (not an expired entitlement), and a caller that simply
     didn't pass `rights` has not checked yet — neither is an expiry. */
  const rightsExpired = !!patient.rightsExpired;
  const selfPay = !patient.rightsExpired && patient.rights === 'ชำระเอง';
  const rightsUnknown = !patient.rightsExpired && !patient.rights;

  const destinationReady =
    branch === 'home'
    || (branch === 'dept' && dept !== '')
    || (branch === 'refer' && hospital !== '' && referReason.trim() !== '');

  const handleConfirm = () => {
    if (!destinationReady) return;
    const at = nowHHMM();
    if (branch === 'dept') {
      addWalkinRequest({
        hn: patient.hn,
        name: patient.name,
        complaint: `ส่งต่อจากห้องตรวจ — ${advice.trim() || 'ตามคำสั่งแพทย์'}`,
        esi: 4,
        dept,
        requestedBy: recordedBy,
      });
    }
    setConfirmedStamp({ by: recordedBy, at });
    onConfirm?.({
      branch,
      dept: branch === 'dept' ? dept : undefined,
      hospital: branch === 'refer' ? hospital : undefined,
      reason: branch === 'refer' ? referReason.trim() : undefined,
      advice: branch === 'home' ? advice.trim() : undefined,
      by: recordedBy,
      at,
    });
  };

  const fieldLabelStyle = {
    color: 'var(--text-content-default, #363B3F)',
    fontFamily: 'var(--type-family-body)',
    fontSize: 'var(--type-size-sm)',
    fontWeight: 'var(--type-weight-medium)',
  };

  return (
    <>
      <AlertDialog
        open={printAlert}
        onClose={() => setPrintAlert(false)}
        onConfirm={() => setPrintAlert(false)}
        type='info'
        title='พิมพ์ใบส่งตัว'
        description={hospital
          ? `สร้างตัวอย่างใบส่งตัวไปยัง ${hospital} แล้ว (เอกสารตัวอย่าง — ระบบพิมพ์จริงเชื่อมต่อภายหลัง)`
          : 'กรุณาเลือกสถานพยาบาลปลายทางก่อนพิมพ์ใบส่งตัว'}
        showCancel={false}
        confirmLabel='ตกลง'
      />
      <Popup
        open={open}
        onClose={onClose}
        title='จำหน่าย / ส่งต่อผู้รับบริการ'
        subtitle={patient.name ? `${patient.name} · HN ${patient.hn || '—'}` : 'เลือกปลายทางหลังตรวจเสร็จ'}
        secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
        primaryAction={{
          label: 'ยืนยันการจำหน่าย',
          onClick: handleConfirm,
          disabled: !destinationReady,
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
          {/* สิทธิ — three separate states (playbook §5 rights edge cases).
              Only a genuine expiry is a warning; not-yet-checked is neutral
              info and self-pay is purely informational. */}
          {rightsExpired && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                background: 'var(--surface-alert-warning, #FFF9F0)',
                borderRadius: 'var(--dim-radius-300, 10px)',
              }}
            >
              <Icon name='warning' size={18} style={{ color: 'var(--text-warning-default, #C2410C)' }} />
              <span style={{ ...fieldLabelStyle, color: 'var(--text-warning-default, #C2410C)' }}>
                สิทธิการรักษาหมดอายุ — หากส่งต่อ (Refer) ควรตรวจสอบสิทธิและใบส่งตัวก่อน
              </span>
              <Badge style='warning' size='small'>สิทธิหมดอายุ</Badge>
            </div>
          )}
          {rightsUnknown && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-200)',
                paddingBottom: 'var(--dim-space-200)',
                paddingLeft: 'var(--dim-space-300)',
                paddingRight: 'var(--dim-space-300)',
                background: 'var(--surface-alert-info, #F0F6FF)',
                borderRadius: 'var(--dim-radius-300, 10px)',
              }}
            >
              <Icon name='info' size={18} style={{ color: 'var(--text-info-default, #1D4ED8)' }} />
              <span style={{ ...fieldLabelStyle, color: 'var(--text-info-default, #1D4ED8)' }}>
                ยังไม่ได้ตรวจสอบสิทธิของผู้รับบริการรายนี้ — ตรวจสอบก่อนออกใบส่งตัว
              </span>
            </div>
          )}
          {selfPay && (
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Badge style='neutral' size='small'>ชำระเอง</Badge>
              <span
                style={{
                  color: 'var(--text-content-tertiary, #858C92)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-xs)',
                }}
              >
                ผู้รับบริการชำระค่าบริการเอง (ไม่ใช่สิทธิหมดอายุ)
              </span>
            </div>
          )}

          {/* Branch radio cards */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
            <span style={fieldLabelStyle}>ปลายทางการจำหน่าย *</span>
            <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              {BRANCHES.map((b) => (
                <SelectableCardButton
                  key={b.key}
                  selected={branch === b.key}
                  onClick={() => setBranch(b.key)}
                  ariaLabel={b.label}
                  minHeight={64}
                >
                  <span className='flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
                    <Icon name={b.icon} size={22} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
                    <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                      <span style={fieldLabelStyle}>{b.label}</span>
                      <span
                        style={{
                          color: 'var(--text-content-tertiary, #858C92)',
                          fontSize: 'var(--type-size-xs)',
                          fontWeight: 'var(--type-weight-regular)',
                        }}
                      >
                        {b.sub}
                      </span>
                    </span>
                  </span>
                </SelectableCardButton>
              ))}
            </div>
          </div>

          {/* Branch 1 — home */}
          {branch === 'home' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <SuggestibleTextarea
                label='คำแนะนำก่อนกลับบ้าน (ไม่บังคับ)'
                voice
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder='เช่น รับประทานยาตามแพทย์สั่งให้ครบ หากอาการไม่ดีขึ้นใน 3 วันให้กลับมาพบแพทย์'
                suggestions={HOME_ADVICE_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำก่อนกลับบ้าน'
              />
              {/* TOR 1.2.6.1 home-discharge leg — deep-link into the
                  appointment system. When the mount does not supply a handler
                  the control renders as disabled text with an explicit
                  "เชื่อมต่อภายหลัง" note rather than a clickable dead
                  affordance (a dead control reads as a broken system). */}
              <button
                type='button'
                className='inline-flex items-center self-start'
                disabled={!onScheduleAppointment}
                onClick={() => onScheduleAppointment?.(patient)}
                title={onScheduleAppointment ? undefined : 'ยังไม่ได้เชื่อมต่อระบบนัดหมายจากหน้านี้'}
                style={{
                  gap: 'var(--dim-space-150)',
                  background: 'none',
                  border: 'none',
                  cursor: onScheduleAppointment ? 'pointer' : 'not-allowed',
                  color: onScheduleAppointment
                    ? 'var(--text-brandPrimary-default, #007549)'
                    : 'var(--text-content-quaternary, #ADB2B7)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  paddingTop: 'var(--dim-space-0, 0px)',
                  paddingBottom: 'var(--dim-space-0, 0px)',
                  paddingLeft: 'var(--dim-space-0, 0px)',
                  paddingRight: 'var(--dim-space-0, 0px)',
                }}
              >
                <Icon name='calendar_add_on' size={18} />
                {onScheduleAppointment
                  ? 'นัดหมายครั้งถัดไป (เปิดระบบนัดหมาย)'
                  : 'นัดหมายครั้งถัดไป (เชื่อมต่อระบบนัดหมายภายหลัง)'}
              </button>
            </div>
          )}

          {/* Branch 2 — internal department (ScreeningConfirmPopup dept catalog) */}
          {branch === 'dept' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={fieldLabelStyle}>แผนกปลายทาง *</span>
              <Dropdown
                value={dept}
                onChange={setDept}
                options={WALKIN_DEPARTMENTS.map((d) => ({ value: d, label: d }))}
                placeholder='เลือกแผนกภายในศูนย์'
              />
              <span
                style={{
                  color: 'var(--text-content-tertiary, #858C92)',
                  fontSize: 'var(--type-size-xs)',
                  fontFamily: 'var(--type-family-body)',
                }}
              >
                ระบบจะสร้างคำขอ Walk-in ในบอร์ดคำขอของแผนกปลายทางโดยอัตโนมัติ
              </span>
            </div>
          )}

          {/* Branch 3 — refer (hospital lookup per legacy §2.10) */}
          {branch === 'refer' && (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={fieldLabelStyle}>สถานพยาบาลปลายทาง *</span>
                {hospital ? (
                  <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                    <Badge style='success' size='small'>{hospital}</Badge>
                    <button
                      type='button'
                      onClick={() => { setHospital(''); setHospQuery(''); }}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-content-tertiary, #858C92)',
                        fontSize: 'var(--type-size-xs)',
                        fontFamily: 'var(--type-family-body)',
                        textDecoration: 'underline',
                        paddingTop: 'var(--dim-space-0, 0px)',
                        paddingBottom: 'var(--dim-space-0, 0px)',
                        paddingLeft: 'var(--dim-space-0, 0px)',
                        paddingRight: 'var(--dim-space-0, 0px)',
                      }}
                    >
                      เปลี่ยนสถานพยาบาล
                    </button>
                  </div>
                ) : (
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                    <div
                      className='flex items-center'
                      style={{
                        gap: 'var(--dim-space-200)',
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                        borderRadius: 'var(--dim-radius-300, 10px)',
                        paddingTop: 'var(--dim-space-200)',
                        paddingBottom: 'var(--dim-space-200)',
                        paddingLeft: 'var(--dim-space-300)',
                        paddingRight: 'var(--dim-space-300)',
                        background: 'var(--surface-card-100, #FFFFFF)',
                      }}
                    >
                      <Icon name='search' size={18} style={{ color: 'var(--icon-input-default, #ADB2B7)' }} />
                      <input
                        className='mih-opd-hosp-input flex-1 min-w-0'
                        value={hospQuery}
                        onChange={(e) => setHospQuery(e.target.value)}
                        placeholder='พิมพ์ชื่อสถานพยาบาลอย่างน้อย 1 ตัวอักษร เช่น "ราช"'
                        aria-label='ค้นหาสถานพยาบาลปลายทาง'
                        style={{
                          fontFamily: 'var(--type-family-body)',
                          fontSize: 'var(--type-size-sm)',
                          color: 'var(--text-input-filled, #4D5358)',
                        }}
                      />
                    </div>
                    {hospQuery.trim().length >= 1 && (
                      hospMatches.length > 0 ? (
                        <ul
                          className='flex flex-col'
                          style={{
                            marginTop: 'var(--dim-space-0, 0px)',
                            marginRight: 'var(--dim-space-0, 0px)',
                            marginBottom: 'var(--dim-space-0, 0px)',
                            marginLeft: 'var(--dim-space-0, 0px)',
                            paddingTop: 'var(--dim-space-100)',
                            paddingBottom: 'var(--dim-space-100)',
                            paddingLeft: 'var(--dim-space-0, 0px)',
                            paddingRight: 'var(--dim-space-0, 0px)',
                            listStyle: 'none',
                            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                            borderRadius: 'var(--dim-radius-300, 10px)',
                            background: 'var(--surface-card-100, #FFFFFF)',
                            boxShadow: 'var(--shadow-card)',
                            maxHeight: 180,
                            overflowY: 'auto',
                          }}
                        >
                          {hospMatches.map((h) => (
                            <li key={h}>
                              <button
                                type='button'
                                onClick={() => setHospital(h)}
                                className='w-full flex items-center'
                                style={{
                                  gap: 'var(--dim-space-200)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  paddingTop: 'var(--dim-space-200)',
                                  paddingBottom: 'var(--dim-space-200)',
                                  paddingLeft: 'var(--dim-space-300)',
                                  paddingRight: 'var(--dim-space-300)',
                                  fontFamily: 'var(--type-family-body)',
                                  fontSize: 'var(--type-size-sm)',
                                  color: 'var(--text-content-default, #363B3F)',
                                }}
                              >
                                <Icon name='local_hospital' size={16} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
                                {h}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span
                          style={{
                            color: 'var(--text-content-tertiary, #858C92)',
                            fontSize: 'var(--type-size-xs)',
                            fontFamily: 'var(--type-family-body)',
                          }}
                        >
                          ไม่พบสถานพยาบาลที่ตรงกับ “{hospQuery.trim()}”
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>
              <SuggestibleTextarea
                label='เหตุผลการส่งต่อ'
                required
                voice
                value={referReason}
                onChange={(e) => setReferReason(e.target.value)}
                placeholder='เช่น เกินศักยภาพของศูนย์ ต้องการการตรวจเพิ่มเติมเฉพาะทาง'
                suggestions={REFER_REASON_SUGGESTIONS}
                minChars={3}
                popoverAriaLabel='คำแนะนำเหตุผลการส่งต่อ'
              />
              <button
                type='button'
                onClick={() => setPrintAlert(true)}
                className='inline-flex items-center self-start'
                style={{
                  gap: 'var(--dim-space-150)',
                  background: 'none',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  cursor: 'pointer',
                  color: 'var(--text-brandPrimary-default, #007549)',
                  fontFamily: 'var(--type-family-body)',
                  fontSize: 'var(--type-size-sm)',
                  fontWeight: 'var(--type-weight-medium)',
                  paddingTop: 'var(--dim-space-200)',
                  paddingBottom: 'var(--dim-space-200)',
                  paddingLeft: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-300)',
                }}
              >
                <Icon name='print' size={18} />
                พิมพ์ใบส่งตัว
              </button>
            </div>
          )}

          {/* Audit stamp — read-only, appears after confirm */}
          {confirmedStamp && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                color: 'var(--text-content-tertiary, #858C92)',
                fontSize: 'var(--type-size-xs)',
                fontFamily: 'var(--type-family-body)',
              }}
            >
              <Icon name='verified_user' size={16} />
              บันทึกโดย {confirmedStamp.by} · เวลา {confirmedStamp.at} น.
            </div>
          )}
        </div>
      </Popup>
    </>
  );
};

export default OpdDischargePopup;
