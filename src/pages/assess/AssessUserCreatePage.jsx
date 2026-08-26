import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import WizardMorphHeader, { WIZARD_MORPH_SHELL_PROPS } from '@/components/layout/WizardMorphHeader';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Icon from '@/components/icons/Icon';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import DatePicker from '@/components/forms/DatePicker';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import Switch from '@/components/switch/Switch';
import Alert from '@/components/alert/Alert';
import Radio from '@/components/radio/Radio';
import Popup from '@/components/popup/Popup';
import StepProgress from '@/components/step/StepProgress';
import AlertDialog from '@/components/popup/AlertDialog';
import ESignatureField from '@/components/form-builder/ESignatureField';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  CENTER_OPTIONS,
  readAccessControls,
  APPROVAL_DRAFT,
} from '@/data/accessControlStore';
import { findCenterDetail } from '@/data/centerStore';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions } from '@/data/positionStore';
import { isValidEmail, EMAIL_FORMAT_ERROR } from '@/data/usersAccess';
import {
  TITLE_OPTIONS,
  GENDER_OPTIONS,
  emptyAssignment,
  findAssessUser,
  createAssessUser,
  upsertAssessUser,
  findDuplicateAssignments,
  fullName,
  centerLabel,
  readAssessUsers,
} from '@/data/assessUserStore';

/* PHCIS | Assess-control — Create personnel (Figma 4D3nTx53 · 10:44391). */

const breadcrumb = ['บุคลากร'];

const STEPS = [
  { key: 'personal', n: 1, label: 'ข้อมูลส่วนตัว' },
  { key: 'assign', n: 2, label: 'หน่วยงานและตำแหน่ง' },
  { key: 'review', n: 3, label: 'รีวิว' },
];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TOPIC_PRIMARY = {
  color: 'var(--text-topic-primary-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const TOPIC_SUB = {
  color: 'var(--text-topic-primary-subtext-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const TABLE_HEAD = {
  color: 'var(--text-table-title)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

/* ติ๊กถูกสีเขียวท้ายช่องกรอก — บอกว่าค่าที่พิมพ์ไม่ซ้ำกับทะเบียนที่มีอยู่
   (ชุดเดียวกับฟอร์มเพิ่มศูนย์บริการ) */
function UniqueTick({ label }) {
  return (
    <span className='inline-flex items-center' role='img' aria-label={label} title={label}>
      <Icon name='check_circle' size={20} color='var(--icon-positive-success, #24A899)' />
    </span>
  );
}

/* อายุจากวันเกิด — คืน "ปี-เดือน-วัน" ตามรูปแบบที่ทะเบียนใช้อยู่
   (ยืมวันสิ้นเดือนของเดือนก่อนหน้ามาเติมเมื่อวันเกิดมากกว่าวันปัจจุบัน) */
function ageFromBirthDate(iso) {
  if (!iso) return '';
  const birth = new Date(iso);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  if (birth > now) return '';
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years}-${months}-${days}`;
}

/* ข้อมูลส่วนตัวจัดเป็นกริด 3 คอลัมน์คงที่ — เดิมแต่ละแถวเป็น flex-wrap ที่มี
   flex-basis ต่างกัน ช่องกรอกจึงกว้างไม่เท่ากันและไม่ตรงคอลัมน์กันเลย
   (26 ส.ค. 2569 มติผู้ใช้ — "จัด alignment ให้ดูง่าย") */
const FIELD_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 'var(--dim-space-400)',
  alignItems: 'start',
};

const LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* คอลัมน์ตารางหน่วยงานและตำแหน่ง (step 2).
   • วันเวลาเริ่มงาน / วันเวลาสิ้นสุด — ช่วงปฏิบัติงานที่ศูนย์นั้น
   • สถานะในศูนย์ — Active/Inactive **รายศูนย์** ไม่ใช่รายบุคคล */
const ASSIGN_COLUMNS = [
  { key: 'order',      title: 'ลำดับ',            width: 72 },
  { key: 'center',     title: 'ศูนย์บริการ',       width: 200 },
  /* สาขาย่อยของศูนย์ที่เลือก — เว้นว่าง = ประจำที่ศูนย์แม่ (26 ส.ค. 69) */
  { key: 'branch',     title: 'ศูนย์บริการย่อย',    width: 200 },
  { key: 'activity',   title: 'Group Policy',      width: 180 },
  { key: 'sub',        title: 'บทบาท',             width: 180 },
  { key: 'dept',       title: 'แผนก',             width: 180 },
  { key: 'position',   title: 'ตำแหน่ง',           width: 180 },
  /* แม่แบบสิทธิ์การเข้าถึงระบบที่ให้กับ assignment นี้ (26 ส.ค. 2569 มติผู้ใช้)
     — เดิมระบบจับคู่แม่แบบให้เองจากคุณสมบัติ ตอนนี้เลือกตรง ๆ ตรงนี้ */
  { key: 'access',     title: 'แม่แบบสิทธิ์',       width: 220 },
  { key: 'startAt',    title: 'วันเวลาเริ่มงาน',    width: 208 },
  { key: 'endAt',      title: 'วันเวลาสิ้นสุด',     width: 208 },
  { key: 'active',     title: 'สถานะในศูนย์',      width: 152 },
  { key: 'primary',    title: 'สาขาหลัก',          width: 104 },
  { key: 'actions',    title: 'การดำเนินการ',      width: 120 },
];

const CELL_PAD = {
  padding: 'var(--dim-space-200) var(--dim-space-400)',
  borderBottom: 'var(--dim-stroke-100) solid var(--border-table-line)',
};

/* `datetime-local` คืนค่า 'YYYY-MM-DDTHH:mm' — แปลงเป็นรูปแบบไทยให้อ่านง่าย
   บนหน้ารีวิว (ไม่แตะ timezone เพราะเป็นเวลาท้องถิ่นอยู่แล้ว). */
function formatDateTime(v) {
  if (!v) return '—';
  const [date, time = ''] = String(v).split('T');
  const [y, m, d] = date.split('-');
  if (!y || !m || !d) return v;
  return `${d}/${m}/${Number(y) + 543}${time ? ` ${time} น.` : ''}`;
}

function TopicHeader({ icon, title, subtitle }) {
  return (
    <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-200)' }}>
      <Icon name={icon} size={20} style={{ color: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
      <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050)' }}>
        <span style={TOPIC_PRIMARY}>{title}</span>
        {subtitle ? <span style={TOPIC_SUB}>{subtitle}</span> : null}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)', flex: '1 1 160px' }}>
      <span style={LABEL}>{label}</span>
      <span style={VALUE}>{value || '—'}</span>
    </div>
  );
}

/* ใช้ได้สองเปลือกด้วยเนื้อฟอร์มชุดเดียวกัน — หน้าเต็ม (route เดิม) และป๊อปอัป
   (กด "เพิ่มบุคลากร" ในทะเบียน 26 ส.ค. 69 มติผู้ใช้) หลักเดียวกับป๊อปอัป
   เพิ่มสิทธิ์การเข้าถึงระบบและเพิ่มศูนย์บริการ */
export default function AssessUserCreatePage({
  asPopup = false,
  existingId = null,
  onClose,
  onSaved,
}) {
  const navigate = useHistory();
  const { id: routeId } = useParams();
  const id = asPopup ? existingId : routeId;
  const isEdit = asPopup ? !!existingId : window.location.pathname.endsWith('/edit');
  const existing = useMemo(() => (id ? findAssessUser(id) : null), [id]);

  const [step, setStep] = useState('personal');
  const [showCodeList, setShowCodeList] = useState(false);
  /* ออกจากฟอร์ม — ป๊อปอัปปิดตัวเอง หน้าเต็มกลับไปทะเบียน */
  const leaveForm = () => {
    if (asPopup) { onClose?.(); return; }
    navigate.push('/assess/users');
  };
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const [personal, setPersonal] = useState({
    employeeCode: '',
    title: '', firstName: '', lastName: '', prefixEn: '', nameEn: '', surnameEn: '',
    gender: '', nationalId: '', licenseNo: '', birthDate: '', age: '', phone: '', email: '',
    /* อีเมลส่วนตัว แยกจากอีเมลองค์กรที่ใช้ login (26 ส.ค. 2569 มติผู้ใช้) */
    personalEmail: '',
    /* รูปโปรไฟล์ — เก็บเป็น data URL เหมือน ESignatureField (mock ไม่มี storage) */
    photo: '',
    signature: '',
  });
  const [assignments, setAssignments] = useState([emptyAssignment()]);
  const [saved, setSaved] = useState(false);
  const [showDupeAlert, setShowDupeAlert] = useState(false);
  /* โหมดเพิ่มบุคลากร: สร้างใหม่ vs เลือกบุคลากรเดิมจากระบบ (กันสร้างคนซ้ำ
     และกันให้สิทธิ์ซ้ำซ้อน — Nielsen #5/#6) เฉพาะ flow สร้าง (ไม่ใช่แก้ไข) */
  const [entryMode, setEntryMode] = useState('new'); // 'new' | 'existing'
  const [pickedUserId, setPickedUserId] = useState('');
  /* Confirmation ก่อนบันทึกจริง — การผูกสิทธิ์กิจกรรมมีผลต่อการเข้าถึงข้อมูลผู้ป่วย */
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const activities = useMemo(() => readActivities(), []);
  const departments = useMemo(() => readDepartments(), []);
  const positions = useMemo(() => readPositions(), []);
  const allUsers = useMemo(() => readAssessUsers(), []);
  const pickedUser = useMemo(
    () => (entryMode === 'existing' ? allUsers.find((u) => u.id === pickedUserId) || null : null),
    [entryMode, pickedUserId, allUsers],
  );

  useEffect(() => {
    if (!existing) return;
    setPersonal({
      employeeCode: existing.employeeCode || '',
      signature: existing.signature || '',
      title: existing.title || '',
      firstName: existing.firstName || '',
      lastName: existing.lastName || '',
      prefixEn: existing.prefixEn || '',
      nameEn: existing.nameEn || '',
      surnameEn: existing.surnameEn || '',
      gender: existing.gender || '',
      nationalId: existing.nationalId || '',
      licenseNo: existing.licenseNo || '',
      birthDate: existing.birthDate || '',
      age: existing.age || '',
      phone: existing.phone || '',
      personalEmail: existing.personalEmail || '',
      photo: existing.photo || '',
      email: existing.email || '',
    });
    setAssignments(existing.assignments?.length ? existing.assignments : [emptyAssignment()]);
  }, [existing]);

  /* เลือกบุคลากรเดิม → เติมข้อมูลส่วนตัว + สิทธิ์กิจกรรมเดิมของเขาเข้าฟอร์ม
     (แถวเดิมโชว์ให้เห็นว่ามีอะไรอยู่แล้ว — เพิ่มแถวใหม่ได้โดยไม่ให้ซ้ำ)
     สลับกลับมา "สร้างใหม่" หรือเปลี่ยนคน = ล้างฟอร์มเริ่มใหม่ */
  useEffect(() => {
    if (isEdit) return;
    if (!pickedUser) {
      setPersonal({
        employeeCode: '', title: '', firstName: '', lastName: '', prefixEn: '', nameEn: '', surnameEn: '',
        gender: '', nationalId: '', licenseNo: '', birthDate: '', age: '', phone: '', email: '',
        personalEmail: '', photo: '',
        signature: '',
      });
      setAssignments([emptyAssignment()]);
      return;
    }
    setPersonal({
      employeeCode: pickedUser.employeeCode || '',
      signature: pickedUser.signature || '',
      title: pickedUser.title || '',
      firstName: pickedUser.firstName || '',
      lastName: pickedUser.lastName || '',
      prefixEn: pickedUser.prefixEn || '',
      nameEn: pickedUser.nameEn || '',
      surnameEn: pickedUser.surnameEn || '',
      gender: pickedUser.gender || '',
      nationalId: pickedUser.nationalId || '',
      licenseNo: pickedUser.licenseNo || '',
      birthDate: pickedUser.birthDate || '',
      age: pickedUser.age || '',
      phone: pickedUser.phone || '',
      personalEmail: pickedUser.personalEmail || '',
      photo: pickedUser.photo || '',
      email: pickedUser.email || '',
    });
    setAssignments(pickedUser.assignments?.length ? pickedUser.assignments : [emptyAssignment()]);
  }, [isEdit, pickedUser]);

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];
  const activityOpts = [{ value: '', label: 'เลือกกิจกรรม' }, ...activities.map((a) => ({ value: a.id, label: a.name }))];
  const deptOpts = [{ value: '', label: 'เลือกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];
  const posOpts = [{ value: '', label: 'เลือกตำแหน่ง' }, ...positions.map((p) => ({ value: p.id, label: p.name }))];

  /* Auto-complete เลือกบุคลากรเดิม — ค้นด้วยชื่อ/รหัสพนักงาน/เลขวิชาชีพ
     (Select searchable) พร้อม subtext บอกกิจกรรมเดิมกันเลือกผิดคน */
  const userPickOpts = useMemo(() => allUsers.map((u) => ({
    value: u.id,
    label: fullName(u),
    subtext: [u.employeeCode, u.licenseNo, (u.assignments || []).filter((a) => a.activity).map((a) => a.activity).join(', ')]
      .filter(Boolean).join(' · ') || 'ยังไม่มีสิทธิ์กิจกรรม',
  })), [allUsers]);

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';
  /* สาขาย่อยขึ้นกับศูนย์ที่เลือกในแถวนั้น — ศูนย์ที่ยังไม่มีสาขาจะเหลือแค่
     "ประจำที่ศูนย์แม่" ให้เลือก */
  const branchOptsFor = (centerId) => {
    const detail = centerId ? findCenterDetail(centerId) : null;
    return [
      { value: '', label: 'ประจำที่ศูนย์แม่' },
      ...(detail?.branches || []).map((b) => ({ value: b.id, label: b.name })),
    ];
  };

  /* แม่แบบสิทธิ์ที่เลือกได้ — เอาเฉพาะที่เปิดใช้งานอยู่ ร่างที่ยังไม่ส่งขออนุมัติ
     ไม่ควรผูกกับคน (26 ส.ค. 2569 มติผู้ใช้) */
  const accessTemplateOpts = useMemo(() => ([
    { value: '', label: 'ยังไม่กำหนดสิทธิ์' },
    ...readAccessControls()
      .filter((r) => r.active !== false && (r.approvalStatus || APPROVAL_DRAFT) !== APPROVAL_DRAFT)
      .map((r) => ({ value: r.id, label: r.templateName || 'ไม่มีชื่อแม่แบบ' })),
  ]), []);

  const subOptsFor = (activityId) => {
    const act = activities.find((a) => a.id === activityId);
    return [{ value: '', label: 'เลือกบทบาท' }, ...(act?.subActivities || []).map((sub) => ({ value: sub.id, label: sub.name }))];
  };

  const setField = (key) => (v) => setPersonal((p) => ({ ...p, [key]: v }));

  const setAssignment = (idx, patch) => {
    setAssignments((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const setPrimary = (idx) => {
    setAssignments((rows) => rows.map((r, i) => ({ ...r, isPrimary: i === idx })));
  };

  const addAssignment = () => setAssignments((rows) => [...rows, { ...emptyAssignment(), isPrimary: rows.length === 0 }]);

  const removeAssignment = (idx) => {
    setAssignments((rows) => {
      const next = rows.filter((_, i) => i !== idx);
      if (!next.some((r) => r.isPrimary) && next.length) next[0] = { ...next[0], isPrimary: true };
      return next.length ? next : [{ ...emptyAssignment(), isPrimary: true }];
    });
  };

  /* อีเมลบังคับกรอก **และ** ต้องถูกรูปแบบ ไม่งั้นข้ามไป step ถัดไปไม่ได้ */
  /* รหัสพนักงานต้องไม่ซ้ำกับคนอื่นในทะเบียน (ตัวพิมพ์ใหญ่เล็กไม่ต่างกัน) */
  const employeeCodeKey = personal.employeeCode.trim().toLowerCase();
  const employeeCodeDuplicate = !!employeeCodeKey && allUsers.some((u) => (
    u.id !== existing?.id && String(u.employeeCode || '').trim().toLowerCase() === employeeCodeKey
  ));
  const employeeCodeError = employeeCodeDuplicate ? 'รหัสพนักงานนี้ถูกใช้แล้ว' : '';
  const employeeCodeUnique = !!employeeCodeKey && !employeeCodeDuplicate;

  const personalValid = !employeeCodeDuplicate && personal.employeeCode.trim() && personal.firstName.trim()
    && personal.lastName.trim() && personal.nationalId.trim()
    && personal.email.trim() && isValidEmail(personal.email);

  /* สิ้นสุดเว้นว่างได้ (= ปฏิบัติงานต่อเนื่อง) แต่ถ้าใส่ ต้องไม่มาก่อนวันเริ่ม */
  const rangeValid = (r) => !r.startAt || !r.endAt || r.endAt > r.startAt;

  const assignmentValid = assignments.every((r) => (
    r.centerId && r.activityId && r.subActivityId && r.departmentId && r.positionId
    && r.startAt && rangeValid(r)
  )) && assignments.some((r) => r.isPrimary);

  const duplicateIdx = findDuplicateAssignments(assignments);

  const buildRecord = () => {
    /* เลือกบุคลากรเดิม = อัปเดต record ของคนนั้น (id เดิม) ไม่สร้างคนซ้ำ */
    const base = existing || pickedUser || createAssessUser({});
    const normalized = assignments.map((r) => ({
      ...r,
      center: centerLabel(r.centerId) || labelOf(centerOpts, r.centerId),
      activity: labelOf(activityOpts, r.activityId),
      subActivity: labelOf(subOptsFor(r.activityId), r.subActivityId),
      accessTemplate: r.accessTemplateId ? labelOf(accessTemplateOpts, r.accessTemplateId) : '',
      branch: r.branchId ? labelOf(branchOptsFor(r.centerId), r.branchId) : '',
      department: labelOf(deptOpts, r.departmentId),
      position: labelOf(posOpts, r.positionId),
    }));
    return {
      ...base,
      ...personal,
      assignments: normalized,
      active: base.active !== false,
    };
  };

  const handleSaveDraft = () => {
    upsertAssessUser(buildRecord());
    if (asPopup) { onSaved?.('บันทึกร่างบุคลากรแล้ว'); onClose?.(); }
  };

  const goNext = () => {
    if (step === 'personal') {
      if (!personalValid) return;
      setStep('assign');
      return;
    }
    if (step === 'assign') {
      if (duplicateIdx.length) {
        setShowDupeAlert(true);
        return;
      }
      if (!assignmentValid) return;
      setStep('review');
    }
  };

  const goBack = () => {
    if (step === 'assign') setStep('personal');
    else if (step === 'review') setStep('assign');
  };

  /* ปุ่มบันทึกเปิด modal ทวนสรุปก่อน — ยืนยันแล้วจึงบันทึกจริง */
  const handleSubmit = () => {
    if (!personalValid || !assignmentValid || duplicateIdx.length) return;
    setConfirmSaveOpen(true);
  };

  const applySubmit = () => {
    setConfirmSaveOpen(false);
    const record = upsertAssessUser(buildRecord());
    if (asPopup) {
      onSaved?.(pickedUser || isEdit ? 'อัปเดตสิทธิ์บุคลากรแล้ว' : 'สร้างบุคลากรใหม่แล้ว');
      onClose?.();
      return;
    }
    if (isEdit) {
      navigate.push(`/assess/users/${record.id}`);
      return;
    }
    setSaved(true);
  };

  const confirmSummary = useMemo(() => {
    const acts = [...new Set(assignments.map((r) => labelOf(activityOpts, r.activityId)).filter(Boolean))];
    const primary = assignments.find((r) => r.isPrimary);
    const center = primary ? (centerLabel(primary.centerId) || labelOf(centerOpts, primary.centerId)) : '';
    return `${fullName(personal)} — ${assignments.length} หน่วยงาน · กิจกรรม: ${acts.join(', ') || '—'}${center ? ` · ศูนย์หลัก: ${center}` : ''}`;
  }, [assignments, personal, activityOpts, centerOpts]);

  const footerPrimary = step === 'personal'
    ? { label: 'ถัดไป: หน่วยงานและตำแหน่ง', icon: 'arrow_forward', disabled: !personalValid, onClick: goNext }
    : step === 'assign'
      ? { label: 'ถัดไป: รีวิว', icon: 'arrow_forward', disabled: !assignmentValid || !!duplicateIdx.length, onClick: goNext }
      : { label: isEdit ? 'บันทึก' : 'สร้างบุคลากร', icon: isEdit ? 'save' : 'check', disabled: false, onClick: handleSubmit };

  if (isEdit && id && !existing) {
    return (
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='บุคลากร'
        onBack={() => navigate.push('/assess/users')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบบุคลากร</div>
      </QueuePageShell>
    );
  }

  const confirmDialog = (
    /* ทวนสรุปก่อนบันทึกการเปลี่ยนแปลงสิทธิ์ — กระทบการเข้าถึงข้อมูลของบุคลากร */
    <AlertDialog
      open={confirmSaveOpen}
      onClose={() => setConfirmSaveOpen(false)}
      type='warning'
      alignment='center'
      title={pickedUser || isEdit ? 'ยืนยันการบันทึกสิทธิ์ของบุคลากรเดิม?' : 'ยืนยันการสร้างบุคลากร?'}
      description={confirmSummary}
      confirmLabel={isEdit ? 'บันทึก' : pickedUser ? 'บันทึกสิทธิ์' : 'สร้างบุคลากร'}
      cancelLabel='ยกเลิก'
      onConfirm={applySubmit}
    />
  );

  const codeListPopup = (
    <Popup
      open={showCodeList}
      onClose={() => setShowCodeList(false)}
      size='large'
      title='รหัสพนักงานที่มีอยู่แล้ว'
      subtitle={`${allUsers.length} รายการในทะเบียนบุคลากร`}
      tertiaryAction={{ label: 'ปิด', onClick: () => setShowCodeList(false) }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {allUsers.length === 0 ? (
          <span style={{ ...VALUE, color: 'var(--text-content-tertiary)' }}>ยังไม่มีบุคลากรในทะเบียน</span>
        ) : allUsers.map((u) => (
          <div key={u.id} className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span style={{ ...VALUE, width: 160, flexShrink: 0 }}>{u.employeeCode || '—'}</span>
            <span className='truncate' style={{ ...VALUE, flex: '1 1 auto', minWidth: 0 }}>{fullName(u)}</span>
          </div>
        ))}
      </div>
    </Popup>
  );

  const formBody = (
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)', paddingBottom: 'var(--dim-space-900)' }}>
          {/* การ์ด "เลือกวิธีเพิ่มบุคลากร" ถอดออก 26 ส.ค. 2569 (มติผู้ใช้) — ฟอร์มนี้
              คือการสร้างบุคลากรใหม่เสมอ ส่วนการปรับสิทธิ์คนเดิมทำที่หน้ารายละเอียด */}
          {step === 'personal' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <TopicHeader icon='face' title='ข้อมูลส่วนตัว' subtitle='กรอกข้อมูลส่วนตัวของบุคลากร' />
              {/* รูปโปรไฟล์ — ใช้ระบุตัวบุคลากรในจอคิว/ตารางเวร และหน้าโปรไฟล์
                  (26 ส.ค. 2569 มติผู้ใช้) เก็บเป็น data URL เหมือนลายเซ็น */}
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                {/* ไม่มีวงกลมพรีวิวว่าง ๆ ตอนยังไม่ได้อัปโหลด (26 ส.ค. 2569 มติผู้ใช้)
                    — โชว์รูปจริงต่อเมื่อมีรูปแล้วเท่านั้น */}
                {personal.photo ? (
                  <span
                    className='inline-flex items-center justify-center shrink-0 overflow-hidden'
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                    }}
                  >
                    <img src={personal.photo} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                ) : null}
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                  <PhotoUploadField
                    label={personal.photo ? 'เปลี่ยนรูปโปรไฟล์' : 'อัปโหลดรูปโปรไฟล์'}
                    onFiles={(files) => {
                      const file = files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setPersonal((prev) => ({ ...prev, photo: String(reader.result || '') }));
                      reader.readAsDataURL(file);
                    }}
                  />
                  <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                    ไฟล์ภาพ .jpg / .png — ใช้แสดงในจอคิว ตารางเวร และหน้าโปรไฟล์
                  </span>
                </div>
              </div>
              {/* ปุ่มดูรหัสอยู่ติดกล่องรหัส ไม่ลอยไปชิดขอบขวา และมีติ๊กถูกสีเขียวบอกว่า
                  รหัสนี้ยังไม่ถูกใช้ แบบเดียวกับฟอร์มเพิ่มศูนย์บริการ (26 ส.ค. 2569) */}
              <div className='flex flex-wrap items-start' style={{ gap: 'var(--dim-space-300)' }}>
                <div style={{ width: 320, maxWidth: '100%' }}>
                  <InputField
                    label='รหัสพนักงาน'
                    required
                    value={personal.employeeCode}
                    onChange={setField('employeeCode')}
                    placeholder='เช่น EMP-00412'
                    error={employeeCodeError || undefined}
                    helperText={employeeCodeError || 'รหัสประจำตัวบุคลากรของสำนักอนามัย ต้องไม่ซ้ำกับผู้อื่น'}
                    trailing={employeeCodeUnique ? <UniqueTick label='รหัสนี้ยังไม่ถูกใช้' /> : undefined}
                  />
                </div>
                <div style={{ paddingTop: 'var(--dim-space-700, 28px)' }}>
                  <NeutralSubdueButton
                    leadingIcon='list'
                    variant='outline'
                    size='md'
                    onClick={() => setShowCodeList(true)}
                  >
                    ดูรหัสพนักงานที่มีอยู่แล้ว
                  </NeutralSubdueButton>
                </div>
              </div>
              <div style={FIELD_GRID}>
                <div>
                  <Select label='คำนำหน้า' options={TITLE_OPTIONS} value={personal.title} onChange={setField('title')} searchable={false} />
                </div>
                <div>
                  <InputField label='ชื่อ' required value={personal.firstName} onChange={setField('firstName')} placeholder='เช่น สมชาย' />
                </div>
                <div>
                  <InputField label='นามสกุล' required value={personal.lastName} onChange={setField('lastName')} placeholder='เช่น ใจดี' />
                </div>
              </div>
              <div style={FIELD_GRID}>
                <div>
                  <InputField label='Prefix' value={personal.prefixEn} onChange={setField('prefixEn')} placeholder='Mr.' />
                </div>
                <div>
                  <InputField label='Name' value={personal.nameEn} onChange={setField('nameEn')} placeholder='Somchai' />
                </div>
                <div>
                  <InputField label='Surname' value={personal.surnameEn} onChange={setField('surnameEn')} placeholder='Jaisawaddee' />
                </div>
              </div>
              <div style={FIELD_GRID}>
                <div>
                  <InputField label='เลขบัตรประชาชน' required value={personal.nationalId} onChange={setField('nationalId')} placeholder='x-xxx-xxxxx-xx-x' />
                </div>
                <div>
                  <InputField label='รหัสวิชาชีพ (ว.)' value={personal.licenseNo} onChange={setField('licenseNo')} placeholder='ว.12345' />
                </div>
              </div>
              <div style={FIELD_GRID}>
                <div>
                  {/* ปฏิทินของ design system แทนการพิมพ์ DD/MM/YYYY เอง — อายุคำนวณ
                      ให้อัตโนมัติ ไม่ต้องกรอกซ้ำ (26 ส.ค. 2569 มติผู้ใช้) */}
                  <DatePicker
                    label='วันเดือนปีเกิด'
                    size='md'
                    showHelperText={false}
                    value={personal.birthDate ? new Date(personal.birthDate) : undefined}
                    onChange={(d) => {
                      const iso = d ? new Date(d).toISOString().slice(0, 10) : '';
                      setPersonal((prev) => ({ ...prev, birthDate: iso, age: ageFromBirthDate(iso) }));
                    }}
                  />
                </div>
                <div>
                  <InputField
                    label='อายุ (ปี-เดือน-วัน)'
                    value={personal.age}
                    readOnly
                    disabled
                    placeholder='คำนวณจากวันเกิด'
                  />
                </div>
              </div>
              <div style={FIELD_GRID}>
                <div>
                  <InputField label='เบอร์โทรศัพท์' value={personal.phone} onChange={setField('phone')} placeholder='08x-xxx-xxxx' />
                </div>
                <div>
                  <InputField
                    label='อีเมลองค์กร (ใช้เข้าสู่ระบบ)'
                    required
                    value={personal.email}
                    onChange={setField('email')}
                    placeholder='name@bma.go.th'
                    helperText='อีเมลนี้คือ username ที่ใช้เข้าสู่ระบบ'
                    error={isValidEmail(personal.email) ? '' : EMAIL_FORMAT_ERROR}
                  />
                </div>
                {/* อีเมลส่วนตัวใช้ติดต่อ/กู้คืนบัญชี ไม่ใช่ช่องทาง login */}
                <div>
                  <InputField
                    label='อีเมลส่วนตัว'
                    value={personal.personalEmail}
                    onChange={setField('personalEmail')}
                    placeholder='name@gmail.com'
                    helperText='ใช้ติดต่อและกู้คืนบัญชี ไม่ใช้เข้าสู่ระบบ'
                    error={!personal.personalEmail || isValidEmail(personal.personalEmail) ? '' : EMAIL_FORMAT_ERROR}
                  />
                </div>
              </div>

              {/* ลายเซ็นดิจิทัล — เซ็นสดบนจอ หรืออัปโหลดรูปลายเซ็นก็ได้
                  (ESignatureField รวมทั้งสองช่องทางไว้แล้ว ตาม TOR §1.8.4.1–.2) */}
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <TopicHeader
                  icon='stylus_note'
                  title='ลายเซ็นดิจิทัล'
                  subtitle='เซ็นบนจอหรืออัปโหลดรูปลายเซ็น — ใช้กำกับเอกสารที่บุคลากรคนนี้ลงนาม'
                />
                <ESignatureField
                  showSavedTab={false}
                  value={personal.signature}
                  onChange={setField('signature')}
                  signerName={fullName(personal)}
                />
              </div>
            </section>
          )}

          {step === 'assign' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              <TopicHeader
                icon='face'
                title='หน่วยงานและตำแหน่ง'
                subtitle='บุคลากร 1 คนทำงานได้หลายสำนักงานอนามัย และกรุณาเลือกสาขาหลัก 1 แห่ง'
              />
              {showDupeAlert && (
                <Alert
                  type='warning'
                  title='มีรายการที่ซ้ำกัน'
                  subtext='กรุณาตรวจสอบหน่วยงานและตำแหน่งที่ซ้ำกัน แล้วแก้ไขก่อนดำเนินการต่อ'
                  onClose={() => setShowDupeAlert(false)}
                />
              )}
              <div
                className='w-full overflow-x-auto'
                style={{
                  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
                  borderRadius: 'var(--dim-radius-400)',
                }}
              >
                <table className='w-full border-collapse' style={{ minWidth: 1640 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-table-header)' }}>
                      {ASSIGN_COLUMNS.map(({ title, width }) => (
                        <th
                          key={title}
                          className='text-left'
                          style={{
                            ...TABLE_HEAD,
                            padding: 'var(--dim-space-200) var(--dim-space-400)',
                            borderBottom: 'var(--dim-stroke-200) solid var(--border-table-default)',
                            width,
                          }}
                        >
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((row, idx) => {
                      const isDupe = duplicateIdx.includes(idx);
                      const subOpts = subOptsFor(row.activityId);
                      return (
                        <tr key={row.id} style={isDupe ? { background: 'var(--surface-alert-warning)' } : undefined}>
                          <td style={{ ...CELL_TEXT, ...CELL_PAD }}>
                            {idx + 1}
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={centerOpts} value={row.centerId} onChange={(v) => setAssignment(idx, { centerId: v, center: centerLabel(v), branchId: '', branch: '' })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select
                              size='medium'
                              showLabel={false}
                              showHelperText={false}
                              options={branchOptsFor(row.centerId)}
                              value={row.branchId}
                              onChange={(v) => setAssignment(idx, { branchId: v, branch: labelOf(branchOptsFor(row.centerId), v) })}
                              disabled={!row.centerId}
                            />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={activityOpts} value={row.activityId} onChange={(v) => setAssignment(idx, { activityId: v, subActivityId: '', subActivity: '' })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={subOpts} value={row.subActivityId} onChange={(v) => setAssignment(idx, { subActivityId: v })} disabled={!row.activityId} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={deptOpts} value={row.departmentId} onChange={(v) => setAssignment(idx, { departmentId: v })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select size='medium' showLabel={false} showHelperText={false} options={posOpts} value={row.positionId} onChange={(v) => setAssignment(idx, { positionId: v })} />
                          </td>
                          <td style={CELL_PAD}>
                            <Select
                              size='medium'
                              showLabel={false}
                              showHelperText={false}
                              options={accessTemplateOpts}
                              value={row.accessTemplateId}
                              onChange={(v) => setAssignment(idx, {
                                accessTemplateId: v,
                                accessTemplate: labelOf(accessTemplateOpts, v),
                              })}
                            />
                          </td>
                          <td style={CELL_PAD}>
                            <InputField
                              showLabel={false}
                              showHelperText={false}
                              showLeadingIcon={false}
                              size='medium'
                              type='datetime-local'
                              value={row.startAt || ''}
                              onChange={(v) => setAssignment(idx, { startAt: v })}
                              aria-label={`วันเวลาเริ่มงานแถว ${idx + 1}`}
                            />
                          </td>
                          <td style={CELL_PAD}>
                            <InputField
                              showLabel={false}
                              showHelperText={false}
                              showLeadingIcon={false}
                              size='medium'
                              type='datetime-local'
                              value={row.endAt || ''}
                              onChange={(v) => setAssignment(idx, { endAt: v })}
                              aria-label={`วันเวลาสิ้นสุดแถว ${idx + 1}`}
                            />
                          </td>
                          {/* สถานะรายศูนย์ — คนเดียวกัน Active ที่ศูนย์หนึ่ง Inactive อีกศูนย์ได้ */}
                          <td style={CELL_PAD}>
                            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                              <Switch
                                checked={row.active !== false}
                                onChange={(next) => setAssignment(idx, { active: next })}
                                aria-label={`สถานะในศูนย์แถว ${idx + 1}`}
                              />
                              <ColorfulBadge style={row.active !== false ? 'green' : 'grey'}>
                                {row.active !== false ? 'Active' : 'Inactive'}
                              </ColorfulBadge>
                            </div>
                          </td>
                          <td style={CELL_PAD}>
                            <Switch checked={row.isPrimary} onChange={() => setPrimary(idx)} aria-label={`สาขาหลักแถว ${idx + 1}`} />
                          </td>
                          <td style={CELL_PAD}>
                            <DangerSubdueIconButton icon='delete' variant='ghost' size='md' aria-label='ลบ' disabled={assignments.length <= 1} onClick={() => removeAssignment(idx)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <BrandDashedAddButton onClick={addAssignment}>เพิ่มหน่วยงานและตำแหน่ง</BrandDashedAddButton>
            </section>
          )}

          {step === 'review' && (
            <section className='flex flex-col w-full' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
              <TopicHeader icon='fact_check' title='รีวิว' subtitle='ตรวจสอบข้อมูลก่อนสร้างบุคลากร' />
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={TOPIC_PRIMARY}>ข้อมูลส่วนตัว</span>
                <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
                  <InfoField label='รหัสพนักงาน' value={personal.employeeCode} />
                  <InfoField label='ชื่อ-นามสกุล' value={fullName(personal)} />
                  <InfoField label='Name' value={[personal.nameEn, personal.surnameEn].filter(Boolean).join(' ')} />
                  <InfoField label='เลขบัตรประชาชน' value={personal.nationalId} />
                  <InfoField label='รหัสวิชาชีพ (ว.)' value={personal.licenseNo} />
                  <InfoField label='อีเมล' value={personal.email} />
                  <InfoField label='เบอร์โทรศัพท์' value={personal.phone} />
                </div>
                <div className='flex flex-col' style={{ gap: 'var(--dim-space-100)' }}>
                  <span style={LABEL}>ลายเซ็นดิจิทัล</span>
                  {personal.signature ? (
                    <img
                      src={personal.signature}
                      alt='ลายเซ็นดิจิทัล'
                      style={{
                        height: 64,
                        width: 'auto',
                        maxWidth: 240,
                        objectFit: 'contain',
                        background: 'var(--surface-card-100)',
                        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                        borderRadius: 'var(--dim-radius-200)',
                        padding: 'var(--dim-space-200)',
                      }}
                    />
                  ) : (
                    <span style={VALUE}>ยังไม่ได้เซ็น</span>
                  )}
                </div>
              </div>
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={TOPIC_PRIMARY}>หน่วยงานและตำแหน่ง</span>
                {assignments.map((row, idx) => (
                  <div
                    key={row.id}
                    className='flex flex-wrap'
                    style={{
                      gap: 'var(--dim-space-400)',
                      padding: 'var(--dim-space-400)',
                      border: 'var(--dim-stroke-100) solid var(--border-card-default)',
                      borderRadius: 'var(--dim-radius-400)',
                    }}
                  >
                    <InfoField label='ลำดับ' value={String(idx + 1)} />
                    <InfoField label='ศูนย์บริการ' value={centerLabel(row.centerId) || labelOf(centerOpts, row.centerId)} />
                    <InfoField label='ศูนย์บริการย่อย' value={row.branchId ? labelOf(branchOptsFor(row.centerId), row.branchId) : 'ประจำที่ศูนย์แม่'} />
                    <InfoField label='Group Policy' value={labelOf(activityOpts, row.activityId)} />
                    <InfoField label='บทบาท' value={labelOf(subOptsFor(row.activityId), row.subActivityId)} />
                    <InfoField label='แผนก' value={labelOf(deptOpts, row.departmentId)} />
                    <InfoField label='ตำแหน่ง' value={labelOf(posOpts, row.positionId)} />
                    <InfoField label='แม่แบบสิทธิ์' value={row.accessTemplateId ? labelOf(accessTemplateOpts, row.accessTemplateId) : 'ยังไม่กำหนดสิทธิ์'} />
                    <InfoField label='วันเวลาเริ่มงาน' value={formatDateTime(row.startAt)} />
                    <InfoField label='วันเวลาสิ้นสุด' value={row.endAt ? formatDateTime(row.endAt) : 'ไม่กำหนด'} />
                    <InfoField label='สถานะในศูนย์' value={row.active !== false ? 'Active' : 'Inactive'} />
                    <InfoField label='สาขาหลัก' value={row.isPrimary ? 'ใช่' : 'ไม่ใช่'} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
  );

  if (asPopup) {
    return (
      <>
        <Popup
          open
          onClose={leaveForm}
          size='extraLarge'
          title={isEdit ? 'แก้ไขบุคลากร' : 'เพิ่มบุคลากร'}
          headerCenter={(
            <StepProgress
              steps={STEPS.map((st) => st.label)}
              current={stepIndex}
              onStepClick={(i) => { if (i < stepIndex) setStep(STEPS[i].key); }}
              labelNoWrap
            />
          )}
          /* วางปุ่มแบบเดียวกับป๊อปอัป step อื่นของระบบ */
          secondaryAction={step === 'personal'
            ? { label: 'ยกเลิก', onClick: leaveForm }
            : { label: 'ย้อนกลับ', onClick: goBack }}
          tertiaryAction={{ label: 'บันทึกร่าง', onClick: handleSaveDraft }}
          primaryAction={{
            label: footerPrimary.label,
            trailingIcon: footerPrimary.icon,
            disabled: footerPrimary.disabled,
            onClick: footerPrimary.onClick,
          }}
        >
          {formBody}
        </Popup>
        {confirmDialog}
      {codeListPopup}
        {codeListPopup}
      </>
    );
  }

  return (
    <>
      <QueuePageShell
        activeKey='system-staff'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='system-staff'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        {...WIZARD_MORPH_SHELL_PROPS}
        headerInfo={(
          <WizardMorphHeader
            title={isEdit ? 'แก้ไขบุคลากร' : 'สร้างบุคลากร'}
            steps={STEPS.map((s) => s.label)}
            current={stepIndex}
            onStepClick={(i) => { if (i < stepIndex) setStep(STEPS[i].key); }}
          />
        )}
      >
        {formBody}

        <Footer
          type='with BTN'
          sticky
          showButton3
          button3Label={step === 'personal' ? 'ยกเลิก' : 'ย้อนกลับ'}
          button3Icon={step === 'personal' ? undefined : 'arrow_back'}
          onButton3Click={step === 'personal' ? () => navigate.push('/assess/users') : goBack}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={footerPrimary.label}
          button1TrailingIcon={footerPrimary.icon}
          button1Disabled={footerPrimary.disabled}
          onButton1Click={footerPrimary.onClick}
        />
      </QueuePageShell>
      {confirmDialog}
      {saved ? (
        <SuccessScreen
          title={pickedUser
            ? <>อัปเดตสิทธิ์บุคลากร<br />สำเร็จ</>
            : <>คุณสร้างบุคลากรใหม่<br />สำเร็จ</>}
          buttonLabel='เข้าสู่หน้าบุคลากร'
          onDone={() => navigate.push('/assess/users')}
        />
      ) : null}
    </>
  );
}
