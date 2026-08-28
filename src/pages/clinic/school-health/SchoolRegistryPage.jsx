import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
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
import SuccessToast from '@/components/toast/SuccessToast';
import {
  hasSchoolHealthRights, setSchoolHealthRights, GRADE_LEVELS, gradeLabel,
  SH_ACADEMIC_YEARS, SH_TERMS, SH_CENTER_OPTIONS, SH_NURSES, CURRENT_ACADEMIC_YEAR,
  formatShDate, formatShDateTime, todayIso, toIso, thNum,
} from '@/data/schoolHealthCore';
import {
  SCHOOL_AFFILIATIONS, affiliationLabel, resolveAffiliation, SCHOOL_STATUS,
  EMPTY_SCHOOL, EMPTY_CLASSROOM, getSchoolRows, getSchoolById, saveSchool,
  cancelSchool, reactivateSchool, findSchoolDuplicate,
  getClassrooms, saveClassroom, removeClassroom, getEnrollmentByGrade, getSchoolCapacity,
  SCHOOL_ACTIVITY_TYPES, activityTypeLabel, EMPTY_ACTIVITY, getSchoolActivities,
  saveSchoolActivity, cancelSchoolActivity, reactivateSchoolActivity,
  getAllVisitPlans,
} from '@/data/schoolHealthSchools';
import { getActiveStudents } from '@/data/schoolHealthStudents';
import {
  PageBody, PageCard, SubCard, SectionHeader, NoticeBar, ErrorList, EmptyState,
  PagerRow, ReadField, Field, FieldRow, StatTile, StatRow, AuditLine, ReadOnlyBanner,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* SchoolRegistryPage — ทะเบียนโรงเรียน (TOR §3.1.1, §3.1.2, §3.2.2)

   โครงหน้า = PharmacyRegistryPage / ImmunizationRegistryPage: list +
   create/edit อยู่หน้าเดียวกัน (ฟอร์มกางเหนือรายการ) ครบ 4 กริยา
     แสดง   — ตารางทะเบียน + ตารางจำนวนนักเรียนแยกชั้น/เพศ (คู่มือ §2.1)
     บันทึก — ฟอร์มพื้นฐานโรงเรียน + โครงสร้างห้องเรียน (popup คู่มือ §2.3-1.3)
     แก้ไข  — ปุ่มบนแถวเปิดฟอร์มเดิม · กดออกกลางคันมี ConfirmCancelEdit
     ยกเลิก — soft cancel พร้อมเหตุผล + เปิดใช้งานคืนได้

   แท็บ "กิจกรรมบริการสุขภาพ" คือ §2.2 ของคู่มือ (ส่งเสริมสุขภาพ / อสร. /
   ยสร. / ป้องกันควบคุมโรค / รักษาพยาบาล) ใช้ vocabulary กิจกรรม + กิจกรรมย่อย */

const breadcrumb = ['บันทึกการรักษา', 'งานอนามัยโรงเรียน', 'ทะเบียนโรงเรียน'];
const PAGE_SIZE = 10;

const NOTE_SUGGESTIONS = [
  'มีห้องพยาบาลประจำโรงเรียนและครูอนามัยประจำ',
  'ตรวจสุขภาพประจำปีรอบเดือนพฤษภาคม–มิถุนายน',
  'มีชั้นอนุบาลร่วมด้วย — ต้องแยกรอบตรวจอนุบาล/ประถม',
  'โรงเรียนขนาดใหญ่ ต้องแบ่งรอบให้บริการ 2 วัน',
  'ประสานครูอนามัยล่วงหน้า 1 สัปดาห์ก่อนออกให้บริการ',
];

const ACTIVITY_DETAIL_SUGGESTIONS = [
  'ให้สุขศึกษาเรื่องโภชนาการและการแปรงฟันที่ถูกวิธี',
  'อบรมนักเรียนแกนนำ อสร. หลักสูตร 1 วัน',
  'รณรงค์ป้องกันโรคไข้เลือดออกและสำรวจลูกน้ำยุงลาย',
  'ให้บริการวัคซีนตามระดับชั้นในโรงเรียน',
  'ตรวจรักษาเบื้องต้นในห้องพยาบาลและจ่ายยาตามกลุ่มอาการ',
];

const ACTIVITY_OUTCOME_SUGGESTIONS = [
  'นักเรียนเข้าร่วมครบทุกห้อง ไม่มีเหตุการณ์ไม่พึงประสงค์',
  'ผ่านการประเมินทุกคน มอบเกียรติบัตรเรียบร้อย',
  'สำรวจลูกน้ำยุงลายพบภาชนะมีลูกน้ำ กำจัดครบทุกจุด',
  'ได้รับวัคซีนครบตามเป้าหมาย ที่เหลือนัดเก็บตกรอบถัดไป',
  'ส่งต่อนักเรียนที่พบความผิดปกติเข้ารับบริการที่ศูนย์ฯ',
];

const emptySchool = () => ({ ...EMPTY_SCHOOL, levels: [], surveyDate: todayIso() });
const emptyActivity = () => ({ ...EMPTY_ACTIVITY, date: todayIso() });

const SchoolRegistryPage = () => {
  const history = useHistory();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [affiliationFilter, setAffiliationFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState('');

  /* ── ฟอร์มโรงเรียน ── */
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptySchool());
  const [errors, setErrors] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* ── ห้องเรียน ── */
  const [roomSchool, setRoomSchool] = useState(null);
  const [roomForm, setRoomForm] = useState({ ...EMPTY_CLASSROOM });
  const [roomErrors, setRoomErrors] = useState([]);
  const [roomRemoveTarget, setRoomRemoveTarget] = useState(null);

  /* ── ยกเลิกทะเบียน ── */
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  /* ── กิจกรรม ── */
  const [actFormOpen, setActFormOpen] = useState(false);
  const [actForm, setActForm] = useState(emptyActivity());
  const [actErrors, setActErrors] = useState([]);
  const [actCancelTarget, setActCancelTarget] = useState(null);
  const [actCancelReason, setActCancelReason] = useState('');
  const [actSchoolFilter, setActSchoolFilter] = useState('all');

  const canWrite = hasSchoolHealthRights();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => getSchoolRows(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const students = useMemo(() => getActiveStudents(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const activities = useMemo(() => getSchoolActivities(actSchoolFilter), [tick, actSchoolFilter]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visitPlans = useMemo(() => getAllVisitPlans(), [tick]);

  const studentCountBySchool = useMemo(() => {
    const map = new Map();
    students.forEach((st) => map.set(st.schoolId, (map.get(st.schoolId) || 0) + 1));
    return map;
  }, [students]);

  const filtersActive = affiliationFilter !== 'all' || searchQ.trim() !== '';
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(filtersActive, () => {
    setAffiliationFilter('all');
    setSearchQ('');
    setPage(1);
  });

  const tabs = useMemo(() => ([
    { key: 'all', label: 'ทั้งหมด', icon: 'apartment', count: rows.length },
    { key: 'active', label: 'ใช้งาน', icon: 'check_circle', count: rows.filter((r) => r.status !== 'cancelled').length },
    { key: 'cancelled', label: 'ยกเลิกแล้ว', icon: 'block', count: rows.filter((r) => r.status === 'cancelled').length },
    { key: 'activities', label: 'กิจกรรมบริการสุขภาพ', icon: 'volunteer_activism', count: getSchoolActivities('all').filter((a) => a.status !== 'cancelled').length },
    { key: 'plan', label: 'แผนออกให้บริการ', icon: 'event_upcoming', count: visitPlans.length },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [rows, visitPlans, tick]);

  const filtered = useMemo(() => {
    let result = rows;
    if (activeTab === 'active') result = result.filter((r) => r.status !== 'cancelled');
    if (activeTab === 'cancelled') result = result.filter((r) => r.status === 'cancelled');
    if (affiliationFilter !== 'all') result = result.filter((r) => r.affiliation === affiliationFilter);
    const q = searchQ.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => [r.name, r.code, r.district, r.nurse, r.healthTeacher]
        .some((f) => f && String(f).toLowerCase().includes(q)));
    }
    return result;
  }, [rows, activeTab, affiliationFilter, searchQ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  /* ── โรงเรียน: create / edit / save / cancel ── */

  const setField = (key) => (value) => { setDirty(true); setForm((f) => ({ ...f, [key]: value })); };

  const openCreate = () => {
    setForm(emptySchool());
    setErrors([]);
    setDuplicateWarning('');
    setDirty(false);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setForm({ ...emptySchool(), ...row, levels: [...(row.levels || [])] });
    setErrors([]);
    setDuplicateWarning('');
    setDirty(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptySchool());
    setErrors([]);
    setDuplicateWarning('');
    setDiscardOpen(false);
    setDirty(false);
  };

  const requestCloseForm = () => {
    if (dirty) { setDiscardOpen(true); return; }
    closeForm();
  };

  const onCodeChange = (value) => {
    setField('code')(value);
    const dup = findSchoolDuplicate({ id: form.id, code: value, name: form.name });
    setDuplicateWarning(dup ? `รหัส/ชื่อโรงเรียนนี้มีอยู่แล้ว (${dup.name}) — ตรวจสอบก่อนสร้างซ้ำ` : '');
  };

  const validate = () => {
    const errs = [];
    if (!String(form.name || '').trim()) errs.push('กรุณาระบุชื่อโรงเรียน');
    if (!String(form.code || '').trim()) errs.push('กรุณาระบุรหัสโรงเรียน');
    if (!form.affiliation) errs.push('กรุณาเลือกสังกัด');
    if (!form.levels || form.levels.length === 0) errs.push('กรุณาเลือกระดับชั้นที่เปิดสอนอย่างน้อย 1 ชั้น');
    if (!form.centerId) errs.push('กรุณาเลือกศูนย์บริการสาธารณสุขที่ดูแล');
    if (!form.nurse) errs.push('กรุณาเลือกพยาบาลอนามัยโรงเรียนที่รับผิดชอบ');
    if (!form.surveyDate) errs.push('กรุณาระบุวันที่สำรวจ');
    if (form.teacherCount !== '' && Number(form.teacherCount) < 0) errs.push('จำนวนครูต้องไม่ติดลบ');
    return errs;
  };

  const submit = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    const { saved, isNew } = saveSchool(form);
    setTick((t) => t + 1);
    closeForm();
    setToast(isNew
      ? `บันทึกทะเบียนโรงเรียน ${saved.name} เรียบร้อย`
      : `แก้ไขทะเบียน ${saved.name} เรียบร้อย`);
  };

  const confirmCancelSchool = () => {
    if (!cancelReason.trim()) { setCancelError('กรุณาระบุเหตุผลการยกเลิกทะเบียน'); return; }
    cancelSchool(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
    setTick((t) => t + 1);
    setToast('ยกเลิกทะเบียนโรงเรียนแล้ว — ข้อมูลบริการเดิมยังดูย้อนหลังได้');
  };

  /* ── ห้องเรียน ── */

  const openRooms = (row) => {
    setRoomSchool(row);
    setRoomForm({ ...EMPTY_CLASSROOM, schoolId: row.id });
    setRoomErrors([]);
  };

  const submitRoom = () => {
    const errs = [];
    if (!roomForm.grade) errs.push('กรุณาเลือกชั้นเรียน');
    if (!String(roomForm.name || '').trim()) errs.push('กรุณาระบุชื่อห้องเรียน เช่น ป.1/1');
    if (!String(roomForm.teacher || '').trim()) errs.push('กรุณาระบุครูประจำชั้น');
    if (Number(roomForm.capacity) <= 0) errs.push('ความจุห้องต้องมากกว่า 0');
    if (Number(roomForm.male) < 0 || Number(roomForm.female) < 0) errs.push('จำนวนนักเรียนต้องไม่ติดลบ');
    if (Number(roomForm.male) + Number(roomForm.female) > Number(roomForm.capacity)) {
      errs.push('จำนวนนักเรียนชาย+หญิง มากกว่าความจุห้อง');
    }
    if (errs.length > 0) { setRoomErrors(errs); return; }
    saveClassroom({ ...roomForm, schoolId: roomSchool.id });
    setRoomForm({ ...EMPTY_CLASSROOM, schoolId: roomSchool.id });
    setRoomErrors([]);
    setTick((t) => t + 1);
    setToast('บันทึกห้องเรียนเรียบร้อย');
  };

  /* ── กิจกรรมบริการสุขภาพ ── */

  const setActField = (key) => (value) => setActForm((f) => ({ ...f, [key]: value }));

  const submitActivity = () => {
    const errs = [];
    if (!actForm.schoolId) errs.push('กรุณาเลือกโรงเรียน');
    if (!actForm.type) errs.push('กรุณาเลือกกิจกรรม (ด้านบริการสุขภาพ)');
    if (!actForm.sub) errs.push('กรุณาเลือกกิจกรรมย่อย');
    if (!actForm.date) errs.push('กรุณาระบุวันที่ดำเนินกิจกรรม');
    if (actForm.date && actForm.date > todayIso()) errs.push('วันที่ดำเนินกิจกรรมต้องไม่เป็นวันในอนาคต');
    if (actForm.participants === '' || Number(actForm.participants) < 0) errs.push('กรุณาระบุจำนวนผู้เข้าร่วม (ไม่ติดลบ)');
    if (!String(actForm.detail || '').trim()) errs.push('กรุณาบันทึกรายละเอียดกิจกรรม');
    if (errs.length > 0) { setActErrors(errs); return; }
    const { isNew } = saveSchoolActivity(actForm);
    setActFormOpen(false);
    setActForm(emptyActivity());
    setActErrors([]);
    setTick((t) => t + 1);
    setToast(isNew ? 'บันทึกกิจกรรมบริการสุขภาพเรียบร้อย' : 'แก้ไขกิจกรรมเรียบร้อย');
  };

  /* ── ตาราง ── */

  const columns = useMemo(() => ([
    { key: 'code', label: 'รหัสโรงเรียน' },
    {
      key: 'name',
      label: 'ชื่อโรงเรียน',
      flex: true,
      minWidth: 220,
      render: (r) => (
        <button
          type='button'
          onClick={(e) => { e.stopPropagation(); history.push({ pathname: '/clinic/school-health/students', state: { schoolId: r.id } }); }}
          style={{
            background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
            color: 'var(--text-brandPrimary-default, #007549)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-medium)',
          }}
          title='เปิดทะเบียนนักเรียนของโรงเรียนนี้'
        >
          {r.name}
        </button>
      ),
    },
    {
      key: 'affiliation',
      label: 'สังกัด',
      render: (r) => (
        <ColorfulBadge style={resolveAffiliation(r.affiliation)?.style || 'grey'} size='small' hierarchy='secondary'>
          {affiliationLabel(r.affiliation)}
        </ColorfulBadge>
      ),
    },
    { key: 'levels', label: 'ระดับชั้นที่เปิดสอน', flex: true, minWidth: 190, sortable: false, render: (r) => (r.levels?.length ? `${gradeLabel(r.levels[0])} – ${gradeLabel(r.levels[r.levels.length - 1])}` : '—') },
    { key: 'rooms', label: 'ห้องเรียน', align: 'center', sortable: false, render: (r) => `${getClassrooms(r.id).length} ห้อง` },
    { key: 'students', label: 'นักเรียนในทะเบียน', align: 'center', sortable: false, render: (r) => `${thNum(studentCountBySchool.get(r.id) || 0)} คน` },
    {
      key: 'capacity',
      label: 'รับเพิ่มได้',
      align: 'center',
      sortable: false,
      render: (r) => {
        const cap = getSchoolCapacity(r.id);
        if (cap.capacity === 0) return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่มีห้องเรียน</span>;
        return <ColorfulBadge style={cap.vacancy > 0 ? 'green' : 'yellow'} size='small' hierarchy='secondary'>{`${thNum(cap.vacancy)} คน`}</ColorfulBadge>;
      },
    },
    { key: 'centerId', label: 'ศบส. ที่ดูแล', flex: true, minWidth: 170, render: (r) => SH_CENTER_OPTIONS.find((c) => c.value === r.centerId)?.label || '—' },
    { key: 'nurse', label: 'พยาบาลผู้รับผิดชอบ', flex: true, minWidth: 180 },
    { key: 'healthTeacher', label: 'ครูอนามัย', flex: true, minWidth: 160, render: (r) => r.healthTeacher || '—' },
    { key: 'teacherCount', label: 'จำนวนครู', align: 'center', render: (r) => (r.teacherCount === '' ? '—' : `${thNum(r.teacherCount)} คน`) },
    { key: 'surveyDate', label: 'วันที่สำรวจ', render: (r) => formatShDate(r.surveyDate) },
    {
      key: 'status',
      label: 'สถานะทะเบียน',
      render: (r) => (r.status === 'cancelled' ? (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }} title={r.cancellation?.reason}>
          <ColorfulBadge style='red' size='small' hierarchy='secondary'>{SCHOOL_STATUS.cancelled.label}</ColorfulBadge>
          {r.cancellation ? (
            <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`โดย ${r.cancellation.by} · ${formatShDateTime(r.cancellation.at)}`}
            </span>
          ) : null}
        </div>
      ) : (
        <ColorfulBadge style='green' size='small' hierarchy='secondary'>{SCHOOL_STATUS.active.label}</ColorfulBadge>
      )),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='meeting_room' onClick={(e) => { e.stopPropagation(); openRooms(r); }}>
            ห้องเรียน
          </BrandSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={(e) => { e.stopPropagation(); if (canWrite) openEdit(r); }}>
            แก้ไข
          </NeutralSubdueButton>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={(e) => { e.stopPropagation(); if (!canWrite) return; reactivateSchool(r.id); setTick((t) => t + 1); setToast('เปิดใช้งานทะเบียนโรงเรียนอีกครั้งแล้ว'); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <DangerSubdueButton
              size='sm'
              leadingIcon='block'
              disabled={!canWrite}
              onClick={(e) => { e.stopPropagation(); if (!canWrite) return; setCancelReason(''); setCancelError(''); setCancelTarget(r); }}
            >
              ยกเลิก
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, tick, studentCountBySchool]);

  const activityColumns = useMemo(() => ([
    { key: 'date', label: 'วันที่', render: (r) => formatShDate(r.date) },
    { key: 'schoolId', label: 'โรงเรียน', flex: true, minWidth: 200, render: (r) => getSchoolById(r.schoolId)?.name || '—' },
    { key: 'type', label: 'กิจกรรม', flex: true, minWidth: 240, render: (r) => activityTypeLabel(r.type) },
    { key: 'sub', label: 'กิจกรรมย่อย', flex: true, minWidth: 220 },
    { key: 'academicYear', label: 'ปี/ภาคเรียน', render: (r) => `${r.academicYear} / ${r.term}` },
    { key: 'participants', label: 'ผู้เข้าร่วม', align: 'center', render: (r) => `${thNum(r.participants)} คน` },
    { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 260, sortable: false },
    { key: 'outcome', label: 'ผลการดำเนินงาน', flex: true, minWidth: 260, sortable: false, render: (r) => r.outcome || '—' },
    {
      key: 'recordedBy',
      label: 'ผู้บันทึกรายงาน',
      flex: true,
      minWidth: 190,
      render: (r) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.recordedBy || '—'}</span>
          <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>{r.position || '—'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>บันทึกแล้ว</ColorfulBadge>),
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon='edit'
            disabled={!canWrite}
            onClick={() => { if (!canWrite) return; setActForm({ ...emptyActivity(), ...r }); setActErrors([]); setActFormOpen(true); }}
          >
            แก้ไข
          </NeutralSubdueButton>
          {r.status === 'cancelled' ? (
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='restart_alt'
              disabled={!canWrite}
              onClick={() => { if (!canWrite) return; reactivateSchoolActivity(r.id); setTick((t) => t + 1); }}
            >
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <DangerSubdueButton
              size='sm'
              leadingIcon='block'
              disabled={!canWrite}
              onClick={() => { if (!canWrite) return; setActCancelReason(''); setActCancelTarget(r); }}
            >
              ยกเลิก
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [canWrite, tick]);

  const enrollment = roomSchool ? getEnrollmentByGrade(roomSchool.id) : [];
  const roomRows = roomSchool ? getClassrooms(roomSchool.id) : [];
  const isEditing = !!form.id;
  const subTypes = SCHOOL_ACTIVITY_TYPES.find((t) => t.value === actForm.type)?.subs || [];

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='ทะเบียนโรงเรียน'
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
          <NeutralSubdueButton size='sm' leadingIcon='groups' onClick={() => history.push('/clinic/school-health/students')}>
            ทะเบียนนักเรียน
          </NeutralSubdueButton>
          {activeTab === 'activities' ? (
            <BrandSubdueButton
              variant='fill'
              size='sm'
              leadingIcon='add'
              disabled={!canWrite}
              onClick={() => { if (!canWrite) return; setActForm(emptyActivity()); setActErrors([]); setActFormOpen(true); }}
            >
              บันทึกกิจกรรม
            </BrandSubdueButton>
          ) : (
            <BrandSubdueButton variant='fill' size='sm' leadingIcon='add_home_work' disabled={!canWrite} onClick={() => canWrite && openCreate()}>
              เพิ่มโรงเรียน
            </BrandSubdueButton>
          )}
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(k) => { setActiveTab(k); setPage(1); }}
    >
      {/* ── popup: ยกเลิกทะเบียนโรงเรียน ── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกทะเบียนโรงเรียน'
        subtitle={cancelTarget ? `${cancelTarget.code} · ${cancelTarget.name}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกทะเบียน', onClick: confirmCancelSchool, tone: 'danger' }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NoticeBar tone='warning' icon='warning'>
            ทะเบียนจะไม่ถูกลบ — ระบบเก็บแถวเดิมไว้ในสถานะ &quot;ยกเลิกทะเบียนแล้ว&quot; พร้อมเหตุผลและผู้ยกเลิก
            ทะเบียนนักเรียนและประวัติบริการของโรงเรียนนี้ยังดูย้อนหลังได้ตามปกติ
          </NoticeBar>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
            error={cancelError || undefined}
            placeholder='เช่น โรงเรียนยุบรวม / ย้ายไปอยู่ในความดูแลของ ศบส. อื่น'
          />
        </div>
      </Popup>

      {/* ── popup: ยืนยันทิ้งการแก้ไข ── */}
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

      {/* ── popup: ห้องเรียน + ครูประจำชั้น (คู่มือ §2.3-1.3) ── */}
      <Popup
        open={!!roomSchool}
        onClose={() => setRoomSchool(null)}
        size='extraLarge'
        title='โครงสร้างชั้นเรียนและห้องเรียน'
        subtitle={roomSchool ? `${roomSchool.name} · ปีการศึกษา ${roomSchool.academicYear}` : ''}
        primaryAction={{ label: 'ปิด', onClick: () => setRoomSchool(null) }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
          <SectionHeader
            icon='meeting_room'
            title='เพิ่ม/แก้ไขห้องเรียน'
            subtitle='ระบุครูประจำชั้นรายห้อง ความจุ และจำนวนนักเรียนแยกเพศ — ตัวเลขนี้ใช้คำนวณ "จำนวนเด็กที่รับเพิ่มได้" บน Dashboard'
          />
          <ErrorList errors={roomErrors} />
          <FieldRow>
            <Field label='ชั้นเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!canWrite}
                value={roomForm.grade}
                onChange={(v) => setRoomForm((f) => ({ ...f, grade: v }))}
                options={GRADE_LEVELS
                  .filter((g) => !roomSchool?.levels?.length || roomSchool.levels.includes(g.value))
                  .map((g) => ({ value: g.value, label: g.label }))}
                placeholder='เลือกชั้น'
              />
            </Field>
            <Field label='ชื่อห้องเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <InputField
                showLabel={false}
                showHelperText={false}
                showLeadingIcon={false}
                disabled={!canWrite}
                value={roomForm.name}
                onChange={(v) => setRoomForm((f) => ({ ...f, name: v }))}
                placeholder='เช่น ป.1/1'
              />
            </Field>
            <Field label='ครูประจำชั้น' required minWidth={200}>
              <InputField
                showLabel={false}
                showHelperText={false}
                showLeadingIcon={false}
                disabled={!canWrite}
                value={roomForm.teacher}
                onChange={(v) => setRoomForm((f) => ({ ...f, teacher: v }))}
                placeholder='เช่น ครูสุกัญญา พูลสวัสดิ์'
              />
            </Field>
            <Field label='ความจุห้อง (คน)' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
              <InputField
                showLabel={false}
                showHelperText={false}
                showLeadingIcon={false}
                type='number'
                disabled={!canWrite}
                value={roomForm.capacity}
                onChange={(v) => setRoomForm((f) => ({ ...f, capacity: v }))}
                placeholder='35'
              />
            </Field>
            <Field label='นักเรียนชาย' flex='0 0 var(--dim-size-2100, 160px)' minWidth={130}>
              <InputField
                showLabel={false}
                showHelperText={false}
                showLeadingIcon={false}
                type='number'
                disabled={!canWrite}
                value={roomForm.male}
                onChange={(v) => setRoomForm((f) => ({ ...f, male: v }))}
                placeholder='0'
              />
            </Field>
            <Field label='นักเรียนหญิง' flex='0 0 var(--dim-size-2100, 160px)' minWidth={130}>
              <InputField
                showLabel={false}
                showHelperText={false}
                showLeadingIcon={false}
                type='number'
                disabled={!canWrite}
                value={roomForm.female}
                onChange={(v) => setRoomForm((f) => ({ ...f, female: v }))}
                placeholder='0'
              />
            </Field>
          </FieldRow>
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <div className='flex-1' />
            {roomForm.id ? (
              <NeutralSubdueButton size='md' leadingIcon='close' onClick={() => { setRoomForm({ ...EMPTY_CLASSROOM, schoolId: roomSchool.id }); setRoomErrors([]); }}>
                ยกเลิกการแก้ไขห้อง
              </NeutralSubdueButton>
            ) : null}
            <BrandSubdueButton variant='fill' size='md' leadingIcon='save' disabled={!canWrite} onClick={submitRoom}>
              {roomForm.id ? 'บันทึกการแก้ไขห้อง' : 'เพิ่มห้องเรียน'}
            </BrandSubdueButton>
          </div>

          <SectionHeader icon='table_chart' title='ห้องเรียนทั้งหมด' />
          {roomRows.length === 0 ? (
            <EmptyState
              icon='meeting_room'
              title='โรงเรียนนี้ยังไม่มีห้องเรียนในทะเบียน'
              subtitle='เพิ่มห้องเรียนอย่างน้อย 1 ห้องก่อน จึงจะนำเข้ารายชื่อนักเรียนและใช้ Batch entry รายห้องได้'
            />
          ) : (
            <Table
              columns={[
                { key: 'grade', label: 'ชั้น', render: (r) => gradeLabel(r.grade) },
                { key: 'name', label: 'ห้องเรียน' },
                { key: 'teacher', label: 'ครูประจำชั้น', flex: true, minWidth: 200 },
                { key: 'capacity', label: 'ความจุ', align: 'center', render: (r) => `${r.capacity} คน` },
                { key: 'male', label: 'ชาย', align: 'center' },
                { key: 'female', label: 'หญิง', align: 'center' },
                { key: 'total', label: 'รวม', align: 'center', render: (r) => Number(r.male) + Number(r.female) },
                {
                  key: 'actions',
                  label: 'การดำเนินการ',
                  sortable: false,
                  render: (r) => (
                    <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                      <NeutralSubdueButton size='sm' leadingIcon='edit' disabled={!canWrite} onClick={() => setRoomForm({ ...r })}>
                        แก้ไข
                      </NeutralSubdueButton>
                      <DangerSubdueButton size='sm' leadingIcon='block' disabled={!canWrite} onClick={() => setRoomRemoveTarget(r)}>
                        ยกเลิกห้อง
                      </DangerSubdueButton>
                    </div>
                  ),
                },
              ]}
              rows={roomRows}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีห้องเรียน'
            />
          )}

          <SectionHeader
            icon='groups'
            title='จำนวนนักเรียนแยกชั้นและเพศ'
            subtitle='ตามแบบฟอร์มบันทึกข้อมูลพื้นฐานโรงเรียน (คู่มือ HCIS §2.1)'
          />
          {enrollment.length === 0 ? (
            <EmptyState compact icon='groups' title='ยังไม่มีข้อมูลจำนวนนักเรียน' subtitle='เพิ่มห้องเรียนพร้อมจำนวนนักเรียนชาย/หญิง เพื่อให้ระบบสรุปตารางนี้ให้' />
          ) : (
            <Table
              columns={[
                { key: 'gradeName', label: 'ชั้นเรียน' },
                { key: 'rooms', label: 'จำนวนห้อง', align: 'center', render: (r) => `${r.rooms} ห้อง` },
                { key: 'male', label: 'ชาย', align: 'center' },
                { key: 'female', label: 'หญิง', align: 'center' },
                { key: 'total', label: 'รวม', align: 'center' },
                { key: 'capacity', label: 'ความจุรวม', align: 'center' },
                {
                  key: 'vacancy',
                  label: 'รับเพิ่มได้',
                  align: 'center',
                  render: (r) => (
                    <ColorfulBadge style={r.vacancy > 0 ? 'green' : 'yellow'} size='small' hierarchy='secondary'>
                      {`${r.vacancy} คน`}
                    </ColorfulBadge>
                  ),
                },
              ]}
              rows={enrollment}
              rowKey={(r) => r.grade}
              emptyMessage='ไม่มีข้อมูล'
            />
          )}
        </div>
      </Popup>

      {/* ── popup: ยืนยันยกเลิกห้องเรียน ── */}
      <Popup
        open={!!roomRemoveTarget}
        onClose={() => setRoomRemoveTarget(null)}
        title='ยกเลิกห้องเรียน'
        subtitle={roomRemoveTarget ? `${roomRemoveTarget.name} · ครูประจำชั้น ${roomRemoveTarget.teacher}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setRoomRemoveTarget(null) }}
        primaryAction={{
          label: 'ยืนยันยกเลิกห้อง',
          tone: 'danger',
          onClick: () => {
            removeClassroom(roomRemoveTarget.id);
            setRoomRemoveTarget(null);
            setTick((t) => t + 1);
            setToast('ยกเลิกห้องเรียนแล้ว — ประวัติบริการที่อ้างถึงห้องนี้ยังคงอยู่');
          },
        }}
      >
        <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
          ห้องเรียนจะถูกซ่อนจากรายการและตัวเลือก cascade แต่ประวัติบริการที่บันทึกไว้แล้วยังอ้างอิงห้องนี้ได้ตามปกติ
        </span>
      </Popup>

      {/* ── popup: บันทึกกิจกรรมบริการสุขภาพ (คู่มือ §2.2) ── */}
      <Popup
        open={actFormOpen}
        onClose={() => setActFormOpen(false)}
        size='large'
        title={actForm.id ? 'แก้ไขกิจกรรมบริการสุขภาพ' : 'บันทึกกิจกรรมบริการสุขภาพ'}
        subtitle='กิจกรรม 5 ด้านตามคู่มือ HCIS §2.2 — ส่งเสริมสุขภาพ · อสร. · ยสร. · ป้องกันควบคุมโรค · รักษาพยาบาล'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setActFormOpen(false) }}
        primaryAction={{ label: actForm.id ? 'บันทึกการแก้ไข' : 'บันทึกกิจกรรม', onClick: submitActivity }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <ErrorList errors={actErrors} />
          <FieldRow>
            <Field label='โรงเรียน' required minWidth={220}>
              <Select
                showLabel={false}
                size='lg'
                disabled={!canWrite}
                value={actForm.schoolId}
                onChange={setActField('schoolId')}
                options={rows.filter((r) => r.status !== 'cancelled').map((r) => ({ value: r.id, label: r.name }))}
                placeholder='เลือกโรงเรียน'
              />
            </Field>
            <Field label='ปีการศึกษา' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={actForm.academicYear} onChange={setActField('academicYear')} options={SH_ACADEMIC_YEARS} placeholder='เลือกปี' />
            </Field>
            <Field label='ภาคการศึกษา' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={actForm.term} onChange={setActField('term')} options={SH_TERMS} placeholder='เลือกภาคเรียน' />
            </Field>
            <Field label='วันที่ดำเนินกิจกรรม' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
              <DatePicker
                showLabel={false}
                showHelperText={false}
                value={actForm.date ? new Date(actForm.date) : null}
                onChange={(d) => setActField('date')(d ? toIso(d) : '')}
                placeholder='เลือกวันที่'
              />
            </Field>
          </FieldRow>
          <FieldRow>
            <Field label='กิจกรรม (ด้านบริการสุขภาพ)' required minWidth={260}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!canWrite}
                value={actForm.type}
                onChange={(v) => { setActField('type')(v); setActField('sub')(''); }}
                options={SCHOOL_ACTIVITY_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                placeholder='เลือกกิจกรรม'
              />
            </Field>
            <Field label='กิจกรรมย่อย' required minWidth={240} hint={actForm.type ? undefined : 'เลือกกิจกรรมหลักก่อน จึงจะเลือกกิจกรรมย่อยได้'}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!canWrite || !actForm.type}
                value={actForm.sub}
                onChange={setActField('sub')}
                options={subTypes.map((s) => ({ value: s, label: s }))}
                placeholder='เลือกกิจกรรมย่อย'
              />
            </Field>
            <Field label='จำนวนผู้เข้าร่วม (คน)' required flex='0 0 var(--dim-size-2100, 160px)' minWidth={140}>
              <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={actForm.participants} onChange={setActField('participants')} placeholder='0' />
            </Field>
          </FieldRow>
          <Field label='รายละเอียดกิจกรรม' required flex='1 1 100%' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={actForm.detail}
              onChange={(e) => setActField('detail')(e.target.value)}
              suggestions={ACTIVITY_DETAIL_SUGGESTIONS}
              minChars={3}
              placeholder='บันทึกสิ่งที่ดำเนินการในโรงเรียน เช่น หัวข้อสุขศึกษา ชั้นเรียนที่เข้าร่วม'
            />
          </Field>
          <Field label='ผลการดำเนินงาน' flex='1 1 100%' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={actForm.outcome}
              onChange={(e) => setActField('outcome')(e.target.value)}
              suggestions={ACTIVITY_OUTCOME_SUGGESTIONS}
              minChars={3}
              placeholder='สรุปผลที่ได้ ปัญหาอุปสรรค และการติดตามต่อ'
            />
          </Field>
          <NoticeBar tone='brand' icon='badge'>
            ระบบจะบันทึก &quot;ผู้บันทึกรายงาน&quot; และตำแหน่งจากบัญชีที่ลงชื่อเข้าใช้โดยอัตโนมัติ ตามแบบฟอร์มคู่มือ HCIS
          </NoticeBar>
        </div>
      </Popup>

      {/* ── popup: ยกเลิกกิจกรรม ── */}
      <Popup
        open={!!actCancelTarget}
        onClose={() => setActCancelTarget(null)}
        title='ยกเลิกกิจกรรมบริการสุขภาพ'
        subtitle={actCancelTarget ? `${activityTypeLabel(actCancelTarget.type)} · ${formatShDate(actCancelTarget.date)}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setActCancelTarget(null) }}
        primaryAction={{
          label: 'ยืนยันยกเลิก',
          tone: 'danger',
          onClick: () => {
            if (!actCancelReason.trim()) return;
            cancelSchoolActivity(actCancelTarget.id, actCancelReason.trim());
            setActCancelTarget(null);
            setTick((t) => t + 1);
            setToast('ยกเลิกกิจกรรมแล้ว');
          },
        }}
      >
        <Textarea
          label='เหตุผลการยกเลิก'
          required
          value={actCancelReason}
          onChange={setActCancelReason}
          placeholder='เช่น บันทึกซ้ำ / เลื่อนกิจกรรมออกไป'
        />
      </Popup>

      <PageBody>
        <ReadOnlyBanner show={!canWrite} />

        {/* ── ฟอร์มทะเบียนโรงเรียน ── */}
        {formOpen ? (
          <PageCard>
            <SectionHeader
              icon='add_home_work'
              title={isEditing ? `แก้ไขทะเบียน ${form.name || ''}` : 'เพิ่มโรงเรียนใหม่'}
              subtitle='ข้อมูลพื้นฐานโรงเรียนตามแบบฟอร์มคู่มือ HCIS §2.1'
              trailing={(
                <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {isEditing ? `รหัสโรงเรียน ${form.code}` : `ปีการศึกษา ${CURRENT_ACADEMIC_YEAR} · วันที่สำรวจตั้งค่าเป็นวันนี้ให้อัตโนมัติ`}
                </span>
              )}
            />
            <ErrorList errors={errors} />
            {duplicateWarning ? <NoticeBar tone='warning' icon='warning'>{duplicateWarning}</NoticeBar> : null}

            <FieldRow>
              <Field label='รหัสโรงเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.code} onChange={onCodeChange} placeholder='เช่น 10120101' />
              </Field>
              <Field label='ชื่อโรงเรียน' required flex='2 1 0' minWidth={260}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.name} onChange={setField('name')} placeholder='เช่น โรงเรียนวัดธาตุทอง' />
              </Field>
              <Field label='สังกัด' required minWidth={200}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.affiliation} onChange={setField('affiliation')} options={SCHOOL_AFFILIATIONS.map((a) => ({ value: a.value, label: a.label }))} placeholder='เลือกสังกัด' />
              </Field>
              <Field label='ปีการศึกษา' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.academicYear} onChange={setField('academicYear')} options={SH_ACADEMIC_YEARS} placeholder='เลือกปี' />
              </Field>
            </FieldRow>

            <Field label='ระดับชั้นที่เปิดสอน' required flex='1 1 100%' minWidth={280} hint='เลือกได้หลายชั้น — ใช้กำหนดตัวเลือก cascade ของทะเบียนนักเรียนและการเลื่อนชั้นอัตโนมัติ'>
              <Select
                showLabel={false}
                multiple
                selectAllLabel='เลือกทุกชั้น'
                searchable={false}
                size='lg'
                disabled={!canWrite}
                value={form.levels}
                onChange={setField('levels')}
                options={GRADE_LEVELS.map((g) => ({ value: g.value, label: g.label }))}
                placeholder='เลือกระดับชั้น'
              />
            </Field>

            <FieldRow>
              <Field label='ที่อยู่โรงเรียน' flex='3 1 0' minWidth={280}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.address} onChange={setField('address')} placeholder='บ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด รหัสไปรษณีย์' />
              </Field>
              <Field label='เขต' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.district} onChange={setField('district')} placeholder='เช่น เขตวัฒนา' />
              </Field>
              <Field label='โทรศัพท์' flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.phone} onChange={setField('phone')} placeholder='0 2391 4482' />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='ศูนย์บริการสาธารณสุขที่ดูแล' required minWidth={220}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.centerId} onChange={setField('centerId')} options={SH_CENTER_OPTIONS} placeholder='เลือก ศบส.' />
              </Field>
              <Field label='พยาบาลอนามัยโรงเรียนที่รับผิดชอบ' required minWidth={220}>
                <Select showLabel={false} searchable={false} size='lg' disabled={!canWrite} value={form.nurse} onChange={setField('nurse')} options={SH_NURSES.map((n) => ({ value: n.label, label: n.label }))} placeholder='เลือกพยาบาล' />
              </Field>
              <Field label='ครูอนามัยโรงเรียน' minWidth={200}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.healthTeacher} onChange={setField('healthTeacher')} placeholder='เช่น ครูสุกัญญา พูลสวัสดิ์' />
              </Field>
              <Field label='ผู้อำนวยการโรงเรียน' minWidth={200}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} disabled={!canWrite} value={form.directorName} onChange={setField('directorName')} placeholder='เช่น นายวิเชียร ธรรมรักษ์' />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='จำนวนครูทั้งหมด (คน)' flex='0 0 var(--dim-size-2100, 160px)' minWidth={150}>
                <InputField showLabel={false} showHelperText={false} showLeadingIcon={false} type='number' disabled={!canWrite} value={form.teacherCount} onChange={setField('teacherCount')} placeholder='0' />
              </Field>
              <Field label='วันที่สำรวจ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
                <DatePicker
                  showLabel={false}
                  showHelperText={false}
                  value={form.surveyDate ? new Date(form.surveyDate) : null}
                  onChange={(d) => setField('surveyDate')(d ? toIso(d) : '')}
                  placeholder='เลือกวันที่สำรวจ'
                />
              </Field>
            </FieldRow>

            <Field label='หมายเหตุ / ข้อควรทราบเมื่อออกให้บริการ' flex='1 1 100%' minWidth={280}>
              <SuggestibleTextarea
                voice
                disabled={!canWrite}
                value={form.note}
                onChange={(e) => setField('note')(e.target.value)}
                suggestions={NOTE_SUGGESTIONS}
                minChars={3}
                placeholder='เช่น มีห้องพยาบาลประจำโรงเรียน / ต้องแบ่งรอบให้บริการ 2 วัน'
              />
            </Field>

            <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <div className='flex-1' />
              <NeutralSubdueButton size='lg' leadingIcon='close' onClick={requestCloseForm}>ยกเลิก</NeutralSubdueButton>
              <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' disabled={!canWrite} onClick={submit}>
                {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกทะเบียนโรงเรียน'}
              </BrandSubdueButton>
            </div>
          </PageCard>
        ) : null}

        {/* ── แท็บกิจกรรม ── */}
        {activeTab === 'activities' ? (
          <PageCard>
            <SectionHeader
              icon='volunteer_activism'
              title='กิจกรรมบริการสุขภาพในโรงเรียน'
              subtitle='บันทึกกิจกรรม 5 ด้านตามคู่มือ HCIS §2.2 พร้อมผู้บันทึกรายงานและตำแหน่ง'
              trailing={(
                <FilterDropdown
                  prefix='โรงเรียน:'
                  options={[{ value: 'all', label: 'ทุกโรงเรียน' }, ...rows.map((r) => ({ value: r.id, label: r.name }))]}
                  value={actSchoolFilter}
                  onChange={setActSchoolFilter}
                />
              )}
            />
            {activities.length === 0 ? (
              <EmptyState
                icon='volunteer_activism'
                title='ยังไม่มีการบันทึกกิจกรรมบริการสุขภาพ'
                subtitle='กด "บันทึกกิจกรรม" ที่แถบด้านบนเพื่อบันทึกกิจกรรมด้านส่งเสริมสุขภาพ อสร. ยสร. ป้องกันควบคุมโรค หรือรักษาพยาบาล'
                actionLabel={canWrite ? 'บันทึกกิจกรรมแรก' : undefined}
                onAction={canWrite ? () => { setActForm(emptyActivity()); setActFormOpen(true); } : undefined}
              />
            ) : (
              <Table
                columns={activityColumns}
                rows={activities}
                rowKey={(r) => r.id}
                stickyColCount={2}
                stickyRightColCount={1}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่พบกิจกรรม'
              />
            )}
          </PageCard>
        ) : null}

        {/* ── แท็บแผนออกให้บริการ ── */}
        {activeTab === 'plan' ? (
          <PageCard>
            <SectionHeader
              icon='event_upcoming'
              title='แผนออกให้บริการโรงเรียน'
              subtitle='ระบบแจ้งเตือนล่วงหน้า 1 สัปดาห์ก่อนถึงกำหนด — ดูสรุปแบบ Dashboard ได้ที่เมนู Dashboard'
              trailing={(
                <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => history.push('/clinic/school-health/dashboard')}>
                  เปิด Dashboard
                </NeutralSubdueButton>
              )}
            />
            <Table
              columns={[
                { key: 'date', label: 'วันที่ออกให้บริการ', render: (r) => formatShDate(r.date) },
                {
                  key: 'daysLeft',
                  label: 'เหลืออีก',
                  render: (r) => (
                    <ColorfulBadge style={r.daysLeft <= 7 ? 'orange' : 'grey'} size='small' hierarchy='secondary'>
                      {`${r.daysLeft} วัน`}
                    </ColorfulBadge>
                  ),
                },
                { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 220 },
                { key: 'gradeName', label: 'ชั้น' },
                { key: 'service', label: 'กิจกรรมที่วางแผน', flex: true, minWidth: 280 },
                { key: 'staff', label: 'ผู้รับผิดชอบ', flex: true, minWidth: 190 },
              ]}
              rows={visitPlans}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีแผนออกให้บริการ'
            />
          </PageCard>
        ) : null}

        {/* ── รายการทะเบียนโรงเรียน ── */}
        {activeTab !== 'activities' && activeTab !== 'plan' ? (
          <PageCard gap='var(--dim-space-600, 24px)'>
            <StatRow>
              <StatTile label='โรงเรียนในความดูแล' value={thNum(rows.filter((r) => r.status !== 'cancelled').length)} unit='แห่ง' icon='apartment' tone='brand' />
              <StatTile label='ห้องเรียนทั้งหมด' value={thNum(getClassrooms().length)} unit='ห้อง' icon='meeting_room' tone='info' />
              <StatTile label='นักเรียนในทะเบียน' value={thNum(students.length)} unit='คน' icon='groups' tone='info' />
              <StatTile
                label='รับเพิ่มได้รวมทุกโรงเรียน'
                value={thNum(rows.filter((r) => r.status !== 'cancelled').reduce((s, r) => s + getSchoolCapacity(r.id).vacancy, 0))}
                unit='คน'
                icon='person_add'
                tone='warning'
                hint='คำนวณจากความจุห้องเรียนที่กรอกในทะเบียน (TOR 3.1.2)'
              />
            </StatRow>

            <div className='w-full flex items-start justify-center'>
              <PrimarySearch
                value={searchQ}
                onChange={(v) => { setSearchQ(v); setPage(1); }}
                onSubmit={(label) => { setSearchQ(label); setPage(1); }}
                placeholder='ค้นหาชื่อโรงเรียน / รหัสโรงเรียน / ครูอนามัย / พยาบาลผู้รับผิดชอบ'
                width={640}
              />
            </div>

            <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              <OverflowFlexRow itemGap='var(--dim-space-200, 8px)' moreAriaLabel='แสดงตัวกรองที่ซ่อน'>
                <FilterDropdown
                  prefix='สังกัด:'
                  options={[{ value: 'all', label: 'ทุกสังกัด' }, ...SCHOOL_AFFILIATIONS.map((a) => ({ value: a.value, label: a.label }))]}
                  value={affiliationFilter}
                  onChange={(v) => { setAffiliationFilter(v); setPage(1); }}
                />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </OverflowFlexRow>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
              <SearchResultCount found={filtered.length} total={rows.length} unit='โรงเรียน' />
              {filtered.length === 0 ? (
                <EmptyState
                  icon='search_off'
                  title='ไม่พบโรงเรียนที่ตรงกับเงื่อนไข'
                  subtitle='ลองล้างตัวกรองสังกัด หรือค้นด้วยรหัสโรงเรียนแทนชื่อ'
                  actionLabel='ล้างตัวกรอง'
                  onAction={clearFilters}
                />
              ) : (
                <>
                  <Table
                    columns={columns}
                    rows={pageRows}
                    rowKey={(r) => r.id}
                    stickyColCount={2}
                    stickyRightColCount={1}
                    stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                    emptyMessage='ไม่พบทะเบียนโรงเรียน'
                  />
                  <PagerRow page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} unit='โรงเรียน' />
                </>
              )}
            </SmoothFilterResults>

            <SubCard tone='brand'>
              <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
                <ReadField label='ปีการศึกษาปัจจุบัน' value={CURRENT_ACADEMIC_YEAR} minWidth={160} />
                <ReadField label='วันที่ทำรายการ' value={formatShDate(todayIso())} minWidth={190} />
                <div className='flex-1' />
                <AuditLine>ทุกการเพิ่ม/แก้ไข/ยกเลิกทะเบียนบันทึกผู้ทำรายการ ตำแหน่ง และเวลาไว้ในประวัติของแถวนั้น</AuditLine>
              </div>
            </SubCard>
          </PageCard>
        ) : null}
      </PageBody>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SchoolRegistryPage;
