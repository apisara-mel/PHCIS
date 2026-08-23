import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  hasSchoolHealthRights, setSchoolHealthRights, STUDENT_STATUS, DISCHARGE_REASONS,
  SH_ACADEMIC_YEARS, CURRENT_ACADEMIC_YEAR, gradeLabel,
  formatShDate, formatShDateTime, formatAgeYears, todayIso, toIso, thNum,
} from '@/data/schoolHealthCore';
import { schoolOptions, gradeOptionsForSchool, getClassrooms, getSchoolById } from '@/data/schoolHealthSchools';
import {
  PREFIXES, SEX_OPTIONS, BLOOD_TYPES, RELIGIONS, GUARDIAN_RELATIONS, guardianRelationLabel,
  RIGHT_TYPES, rightLabel, rightStyle, EMPTY_STUDENT,
  getStudentRows, saveStudent, dischargeStudent, reactivateStudent, findStudentDuplicate,
  importStudents, previewPromotion, runPromotion, getPromotionHistory,
} from '@/data/schoolHealthStudents';
import StudentImportPopup from '@/pages/clinic/school-health/StudentImportPopup';
import {
  PageBody, PageCard, SubCard, SectionHeader, NoticeBar, ErrorList, EmptyState,
  PagerRow, ReadField, Field, FieldRow, StatTile, StatRow, AuditLine, ReadOnlyBanner,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* StudentRegistryPage — ทะเบียนนักเรียน (TOR §3.2.1–3.2.3, §3.3.1)

   ลำดับ cascade ตามคู่มือ HCIS §2.3: โรงเรียน → ชั้นเรียน → ห้องเรียน
   ครบ 4 กริยา (แสดง / บันทึก / แก้ไข / ยกเลิก-จำหน่าย) + 2 งานพิเศษ
   ตามมติ คทง.5:
     · นำเข้ารายชื่อจาก Excel รายห้อง (StudentImportPopup)
     · เลื่อนชั้นอัตโนมัติประจำปีการศึกษา พร้อม popup พรีวิวก่อนยืนยัน
       (ป.6/ม.6 → จำหน่ายจบการศึกษา · กันกดซ้ำในปีเดียวกัน · exclude รายคนได้) */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานอนามัยโรงเรียน', 'ทะเบียนนักเรียน'];
const PAGE_SIZE = 10;

const CHRONIC_SUGGESTIONS = [
  'หืด (Asthma) — พ่นยาเวลามีอาการ',
  'ภูมิแพ้อากาศ',
  'เบาหวานชนิดที่ 1 — ฉีดอินซูลินตามแผน',
  'ลมชัก — รับประทานยากันชักต่อเนื่อง',
  'ธาลัสซีเมียพาหะ',
  'ไม่มีโรคประจำตัว',
];

const MED_SUGGESTIONS = [
  'Salbutamol MDI พ่นเวลามีอาการหอบ',
  'Cetirizine 5 mg รับประทานก่อนนอนเมื่อมีอาการ',
  'Insulin glargine 12 unit ก่อนนอน',
  'ยาธาตุเหล็กเสริม สัปดาห์ละ 1 เม็ด',
  'ไม่มียาที่ใช้ประจำ',
];

const ALLERGY_SUGGESTIONS = [
  'Amoxicillin (ผื่นลมพิษ)',
  'Penicillin (บวมริมฝีปาก)',
  'อาหารทะเล (ผื่นคัน)',
  'ไม่มีประวัติแพ้ยา/อาหาร',
];

const emptyForm = () => ({ ...EMPTY_STUDENT, chronicDiseases: [], allergies: [], birthDate: '' });

const listToText = (list) => (Array.isArray(list) ? list.join('\n') : (list || ''));
const textToList = (text) => String(text || '').split('\n').map((s) => s.trim()).filter(Boolean);

const StudentRegistryPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [activeTab, setActiveTab] = useState('active');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({
    school: navState?.schoolId || 'all', grade: 'all', room: 'all', right: 'all',
  });

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeReason, setDischargeReason] = useState('');
  const [dischargeNote, setDischargeNote] = useState('');
  const [dischargeError, setDischargeError] = useState('');

  const [importOpen, setImportOpen] = useState(false);

  const [promotionOpen, setPromotionOpen] = useState(false);
  const [promotionYear, setPromotionYear] = useState(CURRENT_ACADEMIC_YEAR);
  const [promotionScope, setPromotionScope] = useState('all');
  const [excludeIds, setExcludeIds] = useState([]);
  const [promotionConfirm, setPromotionConfirm] = useState(false);

  const canWrite = hasSchoolHealthRights();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getStudentRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const promotionLog = useMemo(() => getPromotionHistory(), [tick]);

  const setFilter = (key) => (val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  const isDefault = filters.school === 'all' && filters.grade === 'all'
    && filters.room === 'all' && filters.right === 'all';
  const filtersActive = !isDefault || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setFilters({ school: 'all', grade: 'all', room: 'all', right: 'all' });
    setSearchQ('');
    setPage(1);
  });

  const tabs = useMemo(() => ([
    { key: 'active', label: 'กำลังศึกษา', icon: 'school', count: rows.filter((r) => r.status === 'active').length },
    { key: 'all', label: 'ทั้งหมด', icon: 'group', count: rows.length },
    { key: 'graduated', label: 'จบการศึกษา', icon: 'workspace_premium', count: rows.filter((r) => r.status === 'graduated').length },
    { key: 'transferred', label: 'ย้ายออก', icon: 'move_down', count: rows.filter((r) => r.status === 'transferred').length },
    { key: 'cancelled', label: 'ยกเลิกทะเบียน', icon: 'block', count: rows.filter((r) => r.status === 'cancelled').length },
  ]), [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeTab !== 'all') result = result.filter((r) => r.status === activeTab);
    if (filters.school !== 'all') result = result.filter((r) => r.schoolId === filters.school);
    if (filters.grade !== 'all') result = result.filter((r) => r.grade === filters.grade);
    if (filters.room !== 'all') result = result.filter((r) => r.roomId === filters.room);
    if (filters.right === 'none') result = result.filter((r) => !r.hasRight || r.rightExpired);
    else if (filters.right !== 'all') result = result.filter((r) => r.rightType === filters.right);
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => [r.fullName, r.hn, r.citizenId, r.studentNo, r.schoolName, r.roomName, r.guardianName]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, filters, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  /* ── ฟอร์ม ── */

  const setField = (key) => (value) => { setDirty(true); setForm((f) => ({ ...f, [key]: value })); };

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      schoolId: filters.school !== 'all' ? filters.school : '',
      grade: filters.grade !== 'all' ? filters.grade : '',
      roomId: filters.room !== 'all' ? filters.room : '',
    });
    setErrors([]);
    setDuplicateWarning('');
    setDirty(false);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setForm({ ...emptyForm(), ...row });
    setErrors([]);
    setDuplicateWarning('');
    setDirty(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm());
    setErrors([]);
    setDuplicateWarning('');
    setDiscardOpen(false);
    setDirty(false);
  };

  const requestCloseForm = () => { if (dirty) setDiscardOpen(true); else closeForm(); };

  const onCitizenIdChange = (value) => {
    setField('citizenId')(value);
    const dup = findStudentDuplicate({ id: form.id, citizenId: value });
    setDuplicateWarning(dup
      ? `เลขบัตรประชาชนนี้มีในทะเบียนแล้ว (${dup.fullName} · ${dup.schoolName} ${dup.gradeName}) — ตรวจสอบก่อนสร้างซ้ำ`
      : '');
  };

  const validate = () => {
    const errs = [];
    if (!form.prefix) errs.push('กรุณาเลือกคำนำหน้า');
    if (!String(form.firstName || '').trim()) errs.push('กรุณาระบุชื่อ');
    if (!String(form.lastName || '').trim()) errs.push('กรุณาระบุนามสกุล');
    if (!form.sex) errs.push('กรุณาเลือกเพศ');
    if (!form.birthDate) errs.push('กรุณาระบุวันเกิด');
    else if (form.birthDate > todayIso()) errs.push('วันเกิดต้องไม่เป็นวันในอนาคต');
    if (!form.schoolId) errs.push('กรุณาเลือกโรงเรียน');
    if (!form.grade) errs.push('กรุณาเลือกชั้นเรียน');
    if (!form.roomId) errs.push('กรุณาเลือกห้องเรียน');
    if (!String(form.studentNo || '').trim()) errs.push('กรุณาระบุเลขที่นักเรียน');
    if (form.citizenId && !/^\d{13}$/.test(String(form.citizenId).trim())) {
      errs.push('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
    }
    if (!String(form.guardianName || '').trim()) errs.push('กรุณาระบุชื่อผู้ปกครอง');
    if (!String(form.guardianPhone || '').trim()) errs.push('กรุณาระบุเบอร์ติดต่อผู้ปกครอง');
    if (findStudentDuplicate({ id: form.id, citizenId: form.citizenId })) {
      errs.push('เลขบัตรประชาชนซ้ำกับนักเรียนที่มีอยู่แล้ว — แก้ไขหรือเปิดทะเบียนเดิมแทน');
    }
    return errs;
  };

  const submit = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    const { saved, isNew } = saveStudent(form);
    setTick((t) => t + 1);
    closeForm();
    setToast(isNew
      ? `บันทึกทะเบียนนักเรียน ${saved.fullName} เรียบร้อย (HN ${saved.hn})`
      : `แก้ไขทะเบียน ${saved.fullName} เรียบร้อย`);
  };

  const confirmDischarge = () => {
    if (!dischargeReason) { setDischargeError('กรุณาเลือกเหตุผลการจำหน่าย/ยกเลิกทะเบียน'); return; }
    if (dischargeReason === 'other' && !dischargeNote.trim()) {
      setDischargeError('เลือก "อื่น ๆ" ต้องระบุรายละเอียดเหตุผล');
      return;
    }
    dischargeStudent(dischargeTarget.id, { reason: dischargeReason, note: dischargeNote.trim() });
    setDischargeTarget(null);
    setDischargeReason('');
    setDischargeNote('');
    setTick((t) => t + 1);
    setToast('จำหน่ายนักเรียนออกจากทะเบียนแล้ว — เปิดใช้งานคืนได้จากแท็บสถานะ');
  };

  /* ── เลื่อนชั้น ── */

  const promotionPreview = useMemo(
    () => (promotionOpen
      ? previewPromotion({ academicYear: promotionYear, schoolId: promotionScope, excludeIds })
      : { promoted: [], graduated: [], blocked: [], alreadyRun: null }),
    [promotionOpen, promotionYear, promotionScope, excludeIds],
  );

  const toggleExclude = (id) => setExcludeIds((prev) =>
    (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const doPromotion = () => {
    const result = runPromotion({ academicYear: promotionYear, schoolId: promotionScope, excludeIds });
    setPromotionConfirm(false);
    setPromotionOpen(false);
    setExcludeIds([]);
    setTick((t) => t + 1);
    setToast(result.ran
      ? `เลื่อนชั้นสำเร็จ — เลื่อน ${result.entry.promotedCount} คน · จำหน่ายจบการศึกษา ${result.entry.graduatedCount} คน`
      : `ปีการศึกษา ${promotionYear} เคยเลื่อนชั้นไปแล้ว — ระบบไม่ทำซ้ำ`);
  };

  /* ── ตาราง ── */

  const columns = useMemo(() => ([
    { key: 'studentNo', label: 'เลขที่' },
    { key: 'hn', label: 'HN' },
    {
      key: 'fullName',
      label: 'ชื่อ-นามสกุล',
      flex: true,
      minWidth: 200,
      render: (r) => (
        <span className='inline-flex items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <MaskedWorklistName name={r.fullName} recordKey={r.hn} linkTo={`/clinic/school-health/student/${r.id}`} />
          {r.confidential ? <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='lock'>ข้อมูลลับ</ColorfulBadge> : null}
        </span>
      ),
    },
    { key: 'sex', label: 'เพศ' },
    { key: 'birthDate', label: 'วันเกิด', render: (r) => formatShDate(r.birthDate) },
    { key: 'age', label: 'อายุ', sortable: false, render: (r) => formatAgeYears(r.birthDate) },
    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 200 },
    { key: 'room', label: 'ชั้น/ห้อง', render: (r) => `${r.gradeName} · ${r.roomName}` },
    { key: 'teacher', label: 'ครูประจำชั้น', flex: true, minWidth: 180 },
    {
      key: 'guardian',
      label: 'ผู้ปกครอง',
      flex: true,
      minWidth: 220,
      sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.guardianName || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {`${guardianRelationLabel(r.guardianRelation)} · ${r.guardianPhone || 'ไม่ระบุเบอร์'}`}
          </span>
        </div>
      ),
    },
    {
      key: 'rights',
      label: 'สิทธิการรักษา',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <ColorfulBadge style={r.rightExpired ? 'red' : rightStyle(r.rightType)} size='small' hierarchy='secondary'>
            {r.rightExpired ? 'สิทธิหมดอายุ' : rightLabel(r.rightType)}
          </ColorfulBadge>
          {r.rightExpiry ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`ถึง ${formatShDate(r.rightExpiry)}`}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'chronic',
      label: 'โรคประจำตัว / ยาที่ใช้ประจำ',
      flex: true,
      minWidth: 240,
      sortable: false,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>
            {(r.chronicDiseases || []).length ? r.chronicDiseases.join(' · ') : 'ไม่มีโรคประจำตัว'}
          </span>
          {r.regularMeds ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{r.regularMeds}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.discharge?.note}>
          <ColorfulBadge style={STUDENT_STATUS[r.status]?.style || 'grey'} size='small' hierarchy='secondary'>
            {STUDENT_STATUS[r.status]?.label || '—'}
          </ColorfulBadge>
          {r.discharge ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`โดย ${r.discharge.by} · ${formatShDateTime(r.discharge.at)}`}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='clinical_notes'
            onClick={(e) => { e.stopPropagation(); history.push(`/clinic/school-health/student/${r.id}`); }}
          >
            ข้อมูลสุขภาพ
          </BrandSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={(e) => { e.stopPropagation(); if (canWrite) openEdit(r); }}>
            แก้ไข
          </NeutralSubdueButton>
          {r.status === 'active' ? (
            <DangerSubdueButton
              size='sm'
              leadingIcon='block'
              disabled={!canWrite}
              onClick={(e) => {
                e.stopPropagation();
                if (!canWrite) return;
                setDischargeReason('');
                setDischargeNote('');
                setDischargeError('');
                setDischargeTarget(r);
              }}
            >
              จำหน่าย
            </DangerSubdueButton>
          ) : (
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={(e) => { e.stopPropagation(); if (!canWrite) return; reactivateStudent(r.id); setTick((t) => t + 1); setToast('เปิดใช้งานทะเบียนนักเรียนอีกครั้งแล้ว'); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, tick]);

  const promotionColumns = (kind) => ([
    ...(kind !== 'blocked' ? [{
      key: 'include',
      label: 'รวมในการเลื่อน',
      sortable: false,
      render: (r) => (
        <Checkbox
          checked={!excludeIds.includes(r.id)}
          onChange={() => toggleExclude(r.id)}
          label=''
        />
      ),
    }] : []),
    { key: 'studentNo', label: 'เลขที่' },
    { key: 'fullName', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200, render: (r) => <MaskedWorklistName name={r.fullName} recordKey={r.hn} /> },
    { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 190 },
    { key: 'from', label: 'ชั้น/ห้องเดิม', render: (r) => `${r.gradeName} · ${r.roomName}` },
    ...(kind === 'blocked'
      ? [{ key: 'reason', label: 'เหตุผลที่เลื่อนไม่ได้', flex: true, minWidth: 280, sortable: false }]
      : [{ key: 'to', label: 'ผลหลังเลื่อน', flex: true, minWidth: 220, sortable: false, render: (r) => (
        <ColorfulBadge style={r.toGrade ? 'green' : 'indigo'} size='small' hierarchy='secondary'>
          {r.toGrade ? `${r.toGradeName} · ${r.toRoomName}` : 'จำหน่าย — จบการศึกษา'}
        </ColorfulBadge>
      ) }]),
  ]);

  const rooms = getClassrooms(filters.school === 'all' ? null : filters.school)
    .filter((r) => filters.grade === 'all' || r.grade === filters.grade);

  const formRooms = getClassrooms(form.schoolId).filter((r) => !form.grade || r.grade === form.grade);
  const isEditing = !!form.id;
  const activeCount = rows.filter((r) => r.status === 'active').length;

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='ทะเบียนนักเรียน'
      onBack={() => history.push('/clinic/school-health')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={() => { setSchoolHealthRights(!hasSchoolHealthRights()); setTick((t) => t + 1); }}
          >
            {canWrite ? 'สิทธิ: แก้ไขได้' : 'สิทธิ: อ่านอย่างเดียว'}
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='apartment' onClick={() => history.push('/clinic/school-health/schools')}>
            ทะเบียนโรงเรียน
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='upload_file' disabled={!canWrite} onClick={() => canWrite && setImportOpen(true)}>
            นำเข้าจาก Excel
          </NeutralSubdueButton>
          <NeutralSubdueButton
            size='sm'
            leadingIcon='moving'
            disabled={!canWrite}
            onClick={() => { if (!canWrite) return; setExcludeIds([]); setPromotionOpen(true); }}
          >
            เลื่อนชั้นอัตโนมัติ
          </NeutralSubdueButton>
          <BrandSubdueButton variant='fill' size='sm' leadingIcon='person_add' disabled={!canWrite} onClick={() => canWrite && openCreate()}>
            เพิ่มนักเรียน
          </BrandSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      {/* ── popup: นำเข้า Excel ── */}
      <StudentImportPopup
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingStudents={rows}
        schoolOptions={schoolOptions(false)}
        defaultSchoolId={filters.school !== 'all' ? filters.school : ''}
        onImport={(parsedRows, meta) => {
          const result = importStudents(parsedRows, meta);
          setTick((t) => t + 1);
          setToast(`นำเข้ารายชื่อนักเรียนสำเร็จ ${result.saved.length} คน${result.skipped ? ` · ข้าม ${result.skipped} แถวที่ไม่ผ่านการตรวจสอบ` : ''}`);
        }}
      />

      {/* ── popup: จำหน่าย/ยกเลิกทะเบียน ── */}
      <Popup
        open={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        title='จำหน่ายนักเรียนออกจากทะเบียน'
        subtitle={dischargeTarget ? `${dischargeTarget.fullName} · ${dischargeTarget.schoolName} ${dischargeTarget.gradeName} ${dischargeTarget.roomName}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setDischargeTarget(null) }}
        primaryAction={{ label: 'ยืนยันจำหน่าย', onClick: confirmDischarge, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NoticeBar tone='warning' icon='warning'>
            ทะเบียนจะไม่ถูกลบ — ระบบเก็บแถวเดิมไว้พร้อมเหตุผล ผู้ทำรายการ และเวลา
            ประวัติบริการสุขภาพของนักเรียนยังดูย้อนหลังได้ และเปิดใช้งานคืนได้ภายหลัง
          </NoticeBar>
          <Field label='เหตุผล' required minWidth={220} flex='1 1 100%'>
            <Select
              showLabel={false}
              searchable={false}
              size='lg'
              value={dischargeReason}
              onChange={(v) => { setDischargeReason(v); setDischargeError(''); }}
              options={DISCHARGE_REASONS}
              placeholder='เลือกเหตุผล'
            />
          </Field>
          <Textarea
            label='รายละเอียดเพิ่มเติม'
            required={dischargeReason === 'other'}
            value={dischargeNote}
            onChange={(v) => { setDischargeNote(v); if (v.trim()) setDischargeError(''); }}
            error={dischargeError || undefined}
            placeholder='เช่น ย้ายตามผู้ปกครองไปจังหวัดสตูล'
          />
        </div>
      </Popup>

      {/* ── popup: ทิ้งการแก้ไข ── */}
      <Popup
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        title='ยกเลิกการแก้ไข'
        tertiaryAction={{ label: 'ทำต่อ', onClick: () => setDiscardOpen(false) }}
        primaryAction={{ label: 'ทิ้งการแก้ไข', onClick: closeForm, tone: 'danger' }}
      >
        <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
          ข้อมูลที่กรอกไว้จะไม่ถูกบันทึกและกลับไปใช้ค่าเดิมของทะเบียน ต้องการทิ้งการแก้ไขหรือไม่
        </span>
      </Popup>

      {/* ── popup: พรีวิวการเลื่อนชั้น ── */}
      <Popup
        open={promotionOpen}
        onClose={() => setPromotionOpen(false)}
        size='extraLarge'
        title='เลื่อนชั้นอัตโนมัติประจำปีการศึกษา'
        subtitle='ตรวจสอบผลก่อนยืนยัน — ระบบจะเลื่อนห้องเรียนตามลำดับชั้น และจำหน่าย "จบการศึกษา" ให้ชั้นสูงสุดที่โรงเรียนเปิดสอน'
        tertiaryAction={{ label: 'ปิด', onClick: () => setPromotionOpen(false) }}
        primaryAction={{
          label: `ยืนยันเลื่อนชั้น ${promotionPreview.promoted.length + promotionPreview.graduated.length} คน`,
          onClick: () => setPromotionConfirm(true),
          disabled: !canWrite || (promotionPreview.promoted.length + promotionPreview.graduated.length) === 0,
        }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <FieldRow>
            <Field label='ปีการศึกษาที่เลื่อนเข้า' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
              <Select showLabel={false} searchable={false} size='lg' value={promotionYear} onChange={setPromotionYear} options={SH_ACADEMIC_YEARS} placeholder='เลือกปีการศึกษา' />
            </Field>
            <Field label='ขอบเขต' flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
              <Select showLabel={false} size='lg' value={promotionScope} onChange={setPromotionScope} options={schoolOptions()} placeholder='เลือกโรงเรียน' />
            </Field>
          </FieldRow>

          {promotionPreview.alreadyRun ? (
            <NoticeBar tone='warning' icon='warning'>
              {`ปีการศึกษา ${promotionYear} เคยเลื่อนชั้นไปแล้วเมื่อ ${formatShDateTime(promotionPreview.alreadyRun.at)} โดย ${promotionPreview.alreadyRun.by} (เลื่อน ${promotionPreview.alreadyRun.promotedCount} คน · จบการศึกษา ${promotionPreview.alreadyRun.graduatedCount} คน) — กดยืนยันซ้ำระบบจะไม่ทำรายการใหม่`}
            </NoticeBar>
          ) : (
            <NoticeBar tone='info' icon='info'>
              การเลื่อนชั้นทำได้ปีละครั้งต่อปีการศึกษา — ติ๊กออกในคอลัมน์ &quot;รวมในการเลื่อน&quot; สำหรับนักเรียนซ้ำชั้นหรือกำลังย้ายออก
            </NoticeBar>
          )}

          <StatRow>
            <StatTile label='เลื่อนขึ้นชั้นถัดไป' value={promotionPreview.promoted.length} unit='คน' tone='brand' icon='moving' />
            <StatTile label='จำหน่าย — จบการศึกษา' value={promotionPreview.graduated.length} unit='คน' tone='info' icon='workspace_premium' />
            <StatTile label='เลื่อนไม่ได้ (ต้องแก้ทะเบียน)' value={promotionPreview.blocked.length} unit='คน' tone='warning' icon='report' />
            <StatTile label='ถูกยกเว้นรายคน' value={excludeIds.length} unit='คน' tone='danger' icon='person_remove' />
          </StatRow>

          <SectionHeader icon='moving' title='รายชื่อที่จะเลื่อนขึ้นชั้นถัดไป' />
          {promotionPreview.promoted.length === 0 ? (
            <EmptyState compact icon='moving' title='ไม่มีนักเรียนที่เลื่อนชั้นได้ในขอบเขตนี้' subtitle='ตรวจสอบว่าโรงเรียนมีห้องเรียนของชั้นถัดไปในทะเบียนแล้วหรือยัง' />
          ) : (
            <Table columns={promotionColumns('promoted')} rows={promotionPreview.promoted} rowKey={(r) => r.id} emptyMessage='ไม่มีรายการ' />
          )}

          <SectionHeader icon='workspace_premium' title='รายชื่อที่จะจำหน่ายเนื่องจากจบการศึกษา' />
          {promotionPreview.graduated.length === 0 ? (
            <EmptyState compact icon='workspace_premium' title='ไม่มีนักเรียนที่จบการศึกษาในรอบนี้' />
          ) : (
            <Table columns={promotionColumns('graduated')} rows={promotionPreview.graduated} rowKey={(r) => r.id} emptyMessage='ไม่มีรายการ' />
          )}

          {promotionPreview.blocked.length > 0 ? (
            <>
              <SectionHeader icon='report' title='เลื่อนไม่ได้ — ต้องเพิ่มห้องเรียนของชั้นถัดไปก่อน' />
              <Table columns={promotionColumns('blocked')} rows={promotionPreview.blocked} rowKey={(r) => r.id} emptyMessage='ไม่มีรายการ' />
            </>
          ) : null}

          {promotionLog.length > 0 ? (
            <SubCard tone='brand'>
              <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-brandPrimary-default, #007549)' }}>ประวัติการเลื่อนชั้นล่าสุด</span>
              {promotionLog.slice(0, 3).map((p) => (
                <AuditLine key={`${p.academicYear}-${p.at}`}>
                  {`ปีการศึกษา ${p.academicYear} · เลื่อน ${p.promotedCount} คน · จบการศึกษา ${p.graduatedCount} คน · โดย ${p.by} (${p.position}) เมื่อ ${formatShDateTime(p.at)}`}
                </AuditLine>
              ))}
            </SubCard>
          ) : null}
        </div>
      </Popup>

      <AlertDialog
        open={promotionConfirm}
        type='warning'
        title='ยืนยันเลื่อนชั้นอัตโนมัติ'
        description={`ระบบจะเลื่อนชั้น ${promotionPreview.promoted.length} คน และจำหน่ายจบการศึกษา ${promotionPreview.graduated.length} คน สำหรับปีการศึกษา ${promotionYear} — การทำรายการนี้บันทึกผู้ทำรายการและเวลาไว้ และจะไม่ทำซ้ำในปีเดียวกัน`}
        cancelLabel='กลับไปตรวจสอบ'
        confirmLabel='ยืนยันเลื่อนชั้น'
        onCancel={() => setPromotionConfirm(false)}
        onClose={() => setPromotionConfirm(false)}
        onConfirm={doPromotion}
      />

      <PageBody>
        <ReadOnlyBanner show={!canWrite} />

        {formOpen ? (
          <PageCard>
            <SectionHeader
              icon='person_add'
              title={isEditing ? `แก้ไขทะเบียนนักเรียน — ${form.firstName} ${form.lastName}` : 'เพิ่มนักเรียนใหม่'}
              subtitle='ข้อมูลส่วนตัวและผู้ปกครองตามแบบฟอร์มคู่มือ HCIS §2.3'
              trailing={(
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {isEditing ? `HN ${form.hn}` : 'HN จะออกให้อัตโนมัติเมื่อบันทึกสำเร็จ'}
                </span>
              )}
            />
            <ErrorList errors={errors} />
            {duplicateWarning ? <NoticeBar tone='warning' icon='warning'>{duplicateWarning}</NoticeBar> : null}

            <SectionHeader icon='school' title='สังกัดโรงเรียน (โรงเรียน → ชั้นเรียน → ห้องเรียน)' />
            <FieldRow>
              <Field label='โรงเรียน' required minWidth={240}>
                <Select
                  showLabel={false}
                  size='lg'
                  disabled={!canWrite}
                  value={form.schoolId}
                  onChange={(v) => { setField('schoolId')(v); setForm((f) => ({ ...f, grade: '', roomId: '' })); }}
                  options={schoolOptions(false)}
                  placeholder='เลือกโรงเรียน'
                />
              </Field>
              <Field label='ชั้นเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={!canWrite || !form.schoolId}
                  value={form.grade}
                  onChange={(v) => { setField('grade')(v); setForm((f) => ({ ...f, roomId: '' })); }}
                  options={gradeOptionsForSchool(form.schoolId, false)}
                  placeholder='เลือกชั้น'
                />
              </Field>
              <Field
                label='ห้องเรียน'
                required
                flex='0 0 var(--dim-size-2200, 192px)'
                minWidth={160}
                hint={form.grade && formRooms.length === 0 ? 'ชั้นนี้ยังไม่มีห้องเรียน — เพิ่มที่ทะเบียนโรงเรียนก่อน' : undefined}
              >
                <Select
                  showLabel={false}
                  searchable={false}
                  size='lg'
                  disabled={!canWrite || !form.grade || formRooms.length === 0}
                  value={form.roomId}
                  onChange={setField('roomId')}
                  options={formRooms.map((r) => ({ value: r.id, label: r.name }))}
                  placeholder='เลือกห้อง'
                />
              </Field>
              <Field label='เลขที่นักเรียน' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.studentNo} onChange={setField('studentNo')} placeholder='เช่น 01' />
              </Field>
              <Field label='ปีการศึกษา' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.academicYear} onChange={setField('academicYear')} options={SH_ACADEMIC_YEARS} placeholder='เลือกปี' />
              </Field>
            </FieldRow>

            <SectionHeader icon='badge' title='ข้อมูลส่วนตัว' />
            <FieldRow>
              <Field label='คำนำหน้า' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.prefix} onChange={setField('prefix')} options={PREFIXES} placeholder='เลือก' />
              </Field>
              <Field label='ชื่อ' required minWidth={180}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.firstName} onChange={setField('firstName')} placeholder='เช่น ปุณณวิช' />
              </Field>
              <Field label='นามสกุล' required minWidth={180}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.lastName} onChange={setField('lastName')} placeholder='เช่น สายทอง' />
              </Field>
              <Field label='เพศ' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.sex} onChange={setField('sex')} options={SEX_OPTIONS} placeholder='เลือกเพศ' />
              </Field>
              <Field label='วันเกิด' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
                <DatePicker
                  showLabel={false}
                  showHelperText={false}
                  value={form.birthDate ? new Date(form.birthDate) : null}
                  onChange={(d) => setField('birthDate')(d ? toIso(d) : '')}
                  placeholder='เลือกวันเกิด'
                />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label='เลขบัตรประชาชน' flex='0 0 var(--dim-size-2450, 280px)' minWidth={200} hint='ตัวเลข 13 หลัก — ใช้ตรวจสอบความซ้ำซ้อนของทะเบียน'>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.citizenId} onChange={onCitizenIdChange} placeholder='1100701234561' />
              </Field>
              <Field label='หมู่โลหิต' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.bloodType} onChange={setField('bloodType')} options={BLOOD_TYPES} placeholder='เลือก' />
              </Field>
              <Field label='ศาสนา' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.religion} onChange={setField('religion')} options={RELIGIONS} placeholder='เลือก' />
              </Field>
              <Field label='เชื้อชาติ' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.race} onChange={setField('race')} placeholder='ไทย' />
              </Field>
              <Field label='สัญชาติ' flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.nationality} onChange={setField('nationality')} placeholder='ไทย' />
              </Field>
            </FieldRow>
            <Field label='ที่อยู่ปัจจุบัน' flex='1 1 100%' minWidth={280}>
              <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.address} onChange={setField('address')} placeholder='บ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์' />
            </Field>

            <SectionHeader icon='family_restroom' title='ผู้ปกครองและสิทธิการรักษา' />
            <FieldRow>
              <Field label='ชื่อ-นามสกุลผู้ปกครอง' required minWidth={220}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.guardianName} onChange={setField('guardianName')} placeholder='เช่น นางสาวจุฑามาศ สายทอง' />
              </Field>
              <Field label='ความสัมพันธ์' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.guardianRelation} onChange={setField('guardianRelation')} options={GUARDIAN_RELATIONS} placeholder='เลือก' />
              </Field>
              <Field label='เบอร์ติดต่อ' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.guardianPhone} onChange={setField('guardianPhone')} placeholder='081-234-5678' />
              </Field>
              <Field label='สิทธิการรักษา' minWidth={240}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.rightType} onChange={setField('rightType')} options={RIGHT_TYPES.map((r) => ({ value: r.value, label: r.label }))} placeholder='เลือกสิทธิ' />
              </Field>
              <Field label='สิทธิหมดอายุ' flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
                <DatePicker
                  showLabel={false}
                  showHelperText={false}
                  value={form.rightExpiry ? new Date(form.rightExpiry) : null}
                  onChange={(d) => setField('rightExpiry')(d ? toIso(d) : '')}
                  placeholder='เลือกวันหมดอายุ (ถ้ามี)'
                />
              </Field>
            </FieldRow>

            <SectionHeader icon='medical_information' title='ข้อมูลสุขภาพพื้นฐาน' subtitle='แสดงเป็นแถบเตือนบนการ์ดนักเรียนในหน้าบันทึกบริการ' />
            <FieldRow>
              <Field label='โรคประจำตัว (บรรทัดละ 1 รายการ)' flex='1 1 0' minWidth={260}>
                <SuggestibleTextarea
                  voice
                  disabled={!canWrite}
                  value={listToText(form.chronicDiseases)}
                  onChange={(e) => setField('chronicDiseases')(textToList(e.target.value))}
                  suggestions={CHRONIC_SUGGESTIONS}
                  minChars={2}
                  placeholder='เช่น หืด (Asthma)'
                />
              </Field>
              <Field label='ยาที่ใช้ประจำ' flex='1 1 0' minWidth={260}>
                <SuggestibleTextarea
                  voice
                  disabled={!canWrite}
                  value={form.regularMeds}
                  onChange={(e) => setField('regularMeds')(e.target.value)}
                  suggestions={MED_SUGGESTIONS}
                  minChars={2}
                  placeholder='เช่น Salbutamol MDI พ่นเวลามีอาการ'
                />
              </Field>
              <Field label='ประวัติแพ้ยา/อาหาร (บรรทัดละ 1 รายการ)' flex='1 1 0' minWidth={260}>
                <SuggestibleTextarea
                  voice
                  disabled={!canWrite}
                  value={listToText(form.allergies)}
                  onChange={(e) => setField('allergies')(textToList(e.target.value))}
                  suggestions={ALLERGY_SUGGESTIONS}
                  minChars={2}
                  placeholder='เช่น Amoxicillin (ผื่นลมพิษ)'
                />
              </Field>
            </FieldRow>
            <Checkbox
              checked={!!form.confidential}
              disabled={!canWrite}
              onChange={(v) => setField('confidential')(v)}
              label='ทำเครื่องหมายเป็นข้อมูลลับ (§1.4.2)'
              description='ชื่อในตารางและรายงานกลุ่มจะถูกปิดบัง แสดงเต็มเฉพาะผู้มีสิทธิและเมื่อกดขอเปิดเผย'
            />

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' leadingIcon='close' onClick={requestCloseForm}>ยกเลิก</NeutralSubdueButton>
              <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' disabled={!canWrite} onClick={submit}>
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกทะเบียนนักเรียน'}
              </BrandSubdueButton>
            </div>
          </PageCard>
        ) : null}

        <PageCard gap='var(--dim-space-600, 24px)'>
          <StatRow>
            <StatTile label='นักเรียนที่กำลังศึกษา' value={thNum(activeCount)} unit='คน' icon='school' tone='brand' />
            <StatTile label='จบการศึกษาแล้ว' value={thNum(rows.filter((r) => r.status === 'graduated').length)} unit='คน' icon='workspace_premium' tone='info' />
            <StatTile label='ย้ายออก' value={thNum(rows.filter((r) => r.status === 'transferred').length)} unit='คน' icon='move_down' tone='warning' />
            <StatTile
              label='ไม่มีสิทธิ / สิทธิหมดอายุ'
              value={thNum(rows.filter((r) => r.status === 'active' && (!r.hasRight || r.rightExpired)).length)}
              unit='คน'
              icon='badge'
              tone='danger'
              hint='ยังบันทึกบริการอนามัยโรงเรียนได้ตามปกติ (TOR 3.3.2)'
            />
          </StatRow>

          <div className='w-full flex items-start justify-center'>
            <PrimarySearch
              value={searchQ}
              onChange={(v) => { setSearchQ(v); setPage(1); }}
              onSubmit={(label) => { setSearchQ(label); setPage(1); }}
              placeholder='ค้นหาชื่อนักเรียน / HN / เลขบัตรประชาชน / ชื่อผู้ปกครอง'
              width={640}
            />
          </div>

          <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
              <FilterDropdown
                prefix='โรงเรียน:'
                options={schoolOptions()}
                value={filters.school}
                onChange={(v) => { setFilters((f) => ({ ...f, school: v, grade: 'all', room: 'all' })); setPage(1); }}
              />
              <FilterDropdown
                prefix='ชั้น:'
                options={gradeOptionsForSchool(filters.school === 'all' ? null : filters.school)}
                value={filters.grade}
                onChange={(v) => { setFilters((f) => ({ ...f, grade: v, room: 'all' })); setPage(1); }}
              />
              <FilterDropdown
                prefix='ห้อง:'
                options={[{ value: 'all', label: 'ทุกห้อง' }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]}
                value={filters.room}
                onChange={setFilter('room')}
              />
              <FilterDropdown
                prefix='สิทธิ:'
                options={[
                  { value: 'all', label: 'ทุกสิทธิ' },
                  { value: 'none', label: 'ไม่มีสิทธิ / สิทธิหมดอายุ' },
                  ...RIGHT_TYPES.map((r) => ({ value: r.value, label: r.label })),
                ]}
                value={filters.right}
                onChange={setFilter('right')}
              />
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
            </OverflowFlexRow>
          </div>

          <SmoothFilterResults opaque={resultsOpaque}>
            <SearchResultCount found={filtered.length} total={rows.length} unit='คน' />
            {filtered.length === 0 ? (
              <EmptyState
                icon={filtersActive ? 'search_off' : 'groups'}
                title={filtersActive ? 'ไม่พบนักเรียนที่ตรงกับเงื่อนไข' : 'ยังไม่มีนักเรียนในทะเบียนของขอบเขตนี้'}
                subtitle={filtersActive
                  ? 'ลองล้างตัวกรอง หรือเปลี่ยนแท็บสถานะเป็น "ทั้งหมด"'
                  : 'เพิ่มนักเรียนทีละคน หรือใช้ "นำเข้าจาก Excel" เพื่อนำเข้ารายชื่อทั้งห้องพร้อมกัน'}
                actionLabel={filtersActive ? 'ล้างตัวกรอง' : (canWrite ? 'นำเข้ารายชื่อจาก Excel' : undefined)}
                onAction={filtersActive ? clearFilters : (canWrite ? () => setImportOpen(true) : undefined)}
              />
            ) : (
              <>
                <Table
                  columns={columns}
                  rows={pageRows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => history.push(`/clinic/school-health/student/${r.id}`)}
                  stickyColCount={3}
                  stickyRightColCount={1}
                  stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                  emptyMessage='ไม่พบนักเรียน'
                />
                <PagerRow page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} unit='คน' />
              </>
            )}
          </SmoothFilterResults>

          <SubCard tone='brand'>
            <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
              <ReadField label='ขอบเขตที่กำลังดู' value={filters.school === 'all' ? 'ทุกโรงเรียน' : (getSchoolById(filters.school)?.name || '—')} minWidth={220} />
              <ReadField label='ชั้น/ห้อง' value={`${filters.grade === 'all' ? 'ทุกชั้น' : gradeLabel(filters.grade)} · ${filters.room === 'all' ? 'ทุกห้อง' : (rooms.find((r) => r.id === filters.room)?.name || '—')}`} minWidth={200} />
              <ReadField label='วันที่ทำรายการ' value={formatShDate(todayIso())} minWidth={180} />
              <div className='flex-1' />
              <AuditLine>ทุกการเพิ่ม/แก้ไข/จำหน่าย/เลื่อนชั้น บันทึกผู้ทำรายการ ตำแหน่ง และเวลาไว้ในประวัติของนักเรียนรายนั้น</AuditLine>
            </div>
          </SubCard>
        </PageCard>
      </PageBody>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default StudentRegistryPage;
