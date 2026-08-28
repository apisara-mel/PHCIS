import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell, { QUEUE_STICKY_UNDER_TABS } from '@/templates/QueuePageShell';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Checkbox from '@/components/checkbox/Checkbox';
import Table from '@/components/table/Table';
import AlertDialog from '@/components/popup/AlertDialog';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import MaskedWorklistName from '@/components/privacy/MaskedWorklistName';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  hasSchoolHealthRights, setSchoolHealthRights, gradeLabel,
  formatShDate, formatShDateTime, todayIso, toIso, thNum,
} from '@/data/schoolHealthCore';
import { schoolOptions, gradeOptionsForSchool, getClassrooms, getSchoolById } from '@/data/schoolHealthSchools';
import { getClassRoster } from '@/data/schoolHealthStudents';
import {
  BATCH_MODES, NOT_GIVEN_REASONS, notGivenReasonLabel,
  getVaccineScheduleForGrade, getMissingVaccines, getLatestService,
  describeLot, validateLot, saveBatchVaccine, getBatchLog,
} from '@/data/schoolHealthServices';
import { getVaccineLots, getVaccineById } from '@/data/immunizationVaccines';
import { evaluateNutrition } from '@/data/schoolHealthGrowthRef';
import {
  PageBody, PageCard, SubCard, SectionHeader, NoticeBar, ErrorList, EmptyState,
  ReadField, Field, FieldRow, StatTile, StatRow, AuditLine, ReadOnlyBanner,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* SchoolHealthBatchVaccinePage — บันทึกการให้บริการแบบโดยรวม (TOR §3.3.6, §3.3.7)

   เลือกโรงเรียน → ชั้น → ห้อง → (วัคซีนตามตารางสร้างเสริมภูมิคุ้มกันของชั้นนั้น)
   → ตารางรายชื่อทั้งห้องแบบติ๊กหลายคน + เลือก Lot No. จากคลังวัคซีนของศูนย์ฯ
   (ตัดสต็อกตาม Lot ที่ใช้จริงเพื่อ traceability AEFI)

   โหมด "เก็บตก ป.1" ตั้งค่าเริ่มต้นให้ทุกคน = ได้รับครบ แล้วติ๊กออกเฉพาะคนที่ขาด
   จึงต้องมี banner อธิบายพฤติกรรม default + ปุ่มล้างการติ๊กทั้งหมด กันบันทึกโดยไม่ตรวจ

   รองรับ batch ทันตกรรม และชั่งน้ำหนัก/วัดส่วนสูงทั้งห้องด้วย
   (ตารางติ๊กทั้งห้องตามคู่มือ HCIS §2.3-5) */

const breadcrumb = ['บันทึกการรักษา', 'งานอนามัยโรงเรียน', 'บันทึกบริการรายห้อง'];

const NOTE_SUGGESTIONS = [
  'ให้บริการวัคซีนในห้องประชุมโรงเรียน สังเกตอาการ 30 นาทีหลังฉีด',
  'ผู้ปกครองลงนามยินยอมล่วงหน้าครบทุกราย',
  'ไม่พบอาการไม่พึงประสงค์ระหว่างและหลังให้บริการ',
  'นักเรียนที่ขาดเรียนนัดเก็บตกรอบถัดไป',
];

const SchoolHealthBatchVaccinePage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [mode, setMode] = useState('vaccine');
  const [scope, setScope] = useState({
    schoolId: navState?.schoolId || '',
    grade: navState?.grade || '',
    roomId: navState?.roomId || '',
  });
  const [vaccineId, setVaccineId] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [catchUpMode, setCatchUpMode] = useState(false);
  const [marks, setMarks] = useState({});
  const [errors, setErrors] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [tick, setTick] = useState(0);

  const canWrite = hasSchoolHealthRights();

  const rooms = getClassrooms(scope.schoolId).filter((r) => !scope.grade || r.grade === scope.grade);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const roster = useMemo(
    () => (scope.schoolId && scope.grade && scope.roomId
      ? getClassRoster(scope.schoolId, scope.grade, scope.roomId)
      : []),
    [scope.schoolId, scope.grade, scope.roomId, tick],
  );

  const schedule = scope.grade ? getVaccineScheduleForGrade(scope.grade) : [];
  const lots = vaccineId ? getVaccineLots(vaccineId) : [];
  const lotInfo = vaccineId && lotNo ? describeLot(vaccineId, lotNo) : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const batchLog = useMemo(() => getBatchLog(), [tick]);

  /* เก็บตก ป.1: default ทุกคน = ได้รับครบ แล้วติ๊กออกเฉพาะคนที่ขาด */
  useEffect(() => {
    if (!roster.length) { setMarks({}); return; }
    const next = {};
    roster.forEach((st) => {
      next[st.id] = { given: catchUpMode, reason: '', weightKg: '', heightCm: '', decayed: '' };
    });
    setMarks(next);
  }, [roster, catchUpMode, mode, vaccineId]);

  const setMark = (id, key) => (value) => setMarks((m) => ({
    ...m,
    [id]: { ...(m[id] || {}), [key]: value },
  }));

  const givenCount = Object.values(marks).filter((m) => m?.given).length;
  const notGivenCount = roster.length - givenCount;
  const lotRemaining = lotInfo?.remaining ?? null;

  const clearAll = () => {
    const next = {};
    roster.forEach((st) => { next[st.id] = { given: false, reason: '', weightKg: '', heightCm: '', decayed: '' }; });
    setMarks(next);
    setToast('ล้างการติ๊กทั้งหมดแล้ว — ติ๊กใหม่ทีละคนตามที่ตรวจจริง');
  };

  const selectAll = () => {
    const next = {};
    roster.forEach((st) => { next[st.id] = { ...(marks[st.id] || {}), given: true, reason: '' }; });
    setMarks(next);
  };

  const validate = () => {
    const errs = [];
    if (!scope.schoolId) errs.push('กรุณาเลือกโรงเรียน');
    if (!scope.grade) errs.push('กรุณาเลือกชั้นเรียน');
    if (!scope.roomId) errs.push('กรุณาเลือกห้องเรียน');
    if (!date) errs.push('กรุณาระบุวันที่ให้บริการ');
    else if (date > todayIso()) errs.push('วันที่ให้บริการต้องไม่เป็นวันในอนาคต');
    if (roster.length === 0) errs.push('ห้องเรียนนี้ยังไม่มีรายชื่อนักเรียน — นำเข้ารายชื่อก่อน');
    if (givenCount === 0) errs.push('ยังไม่ได้ติ๊กนักเรียนที่ได้รับบริการแม้แต่คนเดียว');
    if (mode === 'vaccine') {
      if (!vaccineId) errs.push('กรุณาเลือกวัคซีนที่จะให้บริการ');
      else {
        const lotError = validateLot(vaccineId, lotNo, givenCount);
        if (lotError) errs.push(lotError);
      }
    }
    if (mode === 'checkup') {
      const missing = roster.filter((st) => marks[st.id]?.given
        && (!marks[st.id]?.weightKg || !marks[st.id]?.heightCm));
      if (missing.length > 0) errs.push(`กรอกน้ำหนัก/ส่วนสูงให้ครบสำหรับนักเรียนที่ติ๊กไว้ (ยังขาด ${missing.length} คน)`);
    }
    /* เหตุผลกรณีไม่ได้รับ — ไม่บังคับ แต่เตือนถ้ายังว่างเยอะ */
    return errs;
  };

  const requestSave = () => {
    const errs = validate();
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setConfirmOpen(true);
  };

  const doSave = () => {
    const rows = roster.map((st) => ({
      studentId: st.id,
      given: !!marks[st.id]?.given,
      reason: marks[st.id]?.reason || '',
      weightKg: marks[st.id]?.weightKg ? Number(marks[st.id].weightKg) : undefined,
      heightCm: marks[st.id]?.heightCm ? Number(marks[st.id].heightCm) : undefined,
      decayed: marks[st.id]?.decayed ? Number(marks[st.id].decayed) : undefined,
    }));
    const entry = saveBatchVaccine({
      mode, schoolId: scope.schoolId, grade: scope.grade, roomId: scope.roomId,
      vaccineId: mode === 'vaccine' ? vaccineId : '',
      lotNo: mode === 'vaccine' ? lotNo : '',
      date, rows, note,
    });
    setConfirmOpen(false);
    setTick((t) => t + 1);
    setToast(`บันทึกทั้งชุดเรียบร้อย — ให้บริการ ${entry.givenCount} คน · ไม่ได้รับ ${entry.notGivenCount} คน`);
  };

  const missingByStudent = useMemo(() => {
    const map = new Map();
    roster.forEach((st) => map.set(st.id, getMissingVaccines(st)));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, tick]);

  const columns = useMemo(() => {
    const base = [
      { key: 'studentNo', label: 'เลขที่' },
      { key: 'hn', label: 'HN' },
      {
        key: 'fullName',
        label: 'ชื่อ-นามสกุล',
        flex: true,
        minWidth: 200,
        render: (r) => <MaskedWorklistName name={r.fullName} recordKey={r.hn} linkTo={`/clinic/school-health/student/${r.id}`} />,
      },
      { key: 'sex', label: 'เพศ' },
      {
        key: 'given',
        label: mode === 'vaccine' ? 'ได้รับวัคซีน' : mode === 'dental' ? 'ตรวจแล้ว' : 'ชั่ง/วัดแล้ว',
        sortable: false,
        align: 'center',
        render: (r) => (
          <Checkbox
            checked={!!marks[r.id]?.given}
            disabled={!canWrite}
            onChange={(v) => { setMark(r.id, 'given')(v); if (v) setMark(r.id, 'reason')(''); }}
            label=''
          />
        ),
      },
    ];

    if (mode === 'vaccine') {
      base.push({
        key: 'missing',
        label: 'วัคซีนที่ยังขาดตามระดับชั้น',
        flex: true,
        minWidth: 260,
        sortable: false,
        render: (r) => {
          const missing = missingByStudent.get(r.id) || [];
          return missing.length === 0
            ? <ColorfulBadge style='green' size='small' hierarchy='secondary'>ครบตามเกณฑ์</ColorfulBadge>
            : <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-alert-warning, #C2410C)' }}>{missing.map((m) => m.doseLabel).join(' · ')}</span>;
        },
      });
    }

    if (mode === 'checkup') {
      base.push(
        {
          key: 'weightKg',
          label: 'น้ำหนัก (กก.)',
          sortable: false,
          render: (r) => (
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              size='sm'
              type='number'
              disabled={!canWrite || !marks[r.id]?.given}
              value={marks[r.id]?.weightKg || ''}
              onChange={setMark(r.id, 'weightKg')}
              placeholder='0.0'
            />
          ),
        },
        {
          key: 'heightCm',
          label: 'ส่วนสูง (ซม.)',
          sortable: false,
          render: (r) => (
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              size='sm'
              type='number'
              disabled={!canWrite || !marks[r.id]?.given}
              value={marks[r.id]?.heightCm || ''}
              onChange={setMark(r.id, 'heightCm')}
              placeholder='0'
            />
          ),
        },
        {
          key: 'bmi',
          label: 'แปลผล BMI for Age',
          sortable: false,
          render: (r) => {
            const m = marks[r.id];
            if (!m?.weightKg || !m?.heightCm) return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>;
            const n = evaluateNutrition({
              sex: r.sex, birthDate: r.birthDate, measuredAt: date, weightKg: m.weightKg, heightCm: m.heightCm,
            });
            if (!n) return '—';
            return (
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <ColorfulBadge style={n.style} size='small' hierarchy='secondary'>{n.label}</ColorfulBadge>
                <span style={{ fontSize: 'var(--type-size-xs, 12px)' }}>{`BMI ${n.bmi}`}</span>
              </span>
            );
          },
        },
      );
    }

    if (mode === 'dental') {
      base.push(
        {
          key: 'decayed',
          label: 'ฟันผุ (ซี่)',
          sortable: false,
          render: (r) => (
            <InputField
              showLabel={false}
              showHelperText={false}
              showLeadingIcon={false}
              size='sm'
              type='number'
              disabled={!canWrite || !marks[r.id]?.given}
              value={marks[r.id]?.decayed || ''}
              onChange={setMark(r.id, 'decayed')}
              placeholder='0'
            />
          ),
        },
        {
          key: 'lastDental',
          label: 'ตรวจฟันครั้งล่าสุด',
          sortable: false,
          render: (r) => {
            const last = getLatestService(r.id, 'dental');
            return last ? formatShDate(last.date) : <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ยังไม่เคยตรวจ</span>;
          },
        },
      );
    }

    base.push({
      key: 'reason',
      label: 'เหตุผลกรณีไม่ได้รับ',
      flex: true,
      minWidth: 240,
      sortable: false,
      render: (r) => (
        <Select
          showLabel={false}
          searchable={false}
          size='sm'
          disabled={!canWrite || !!marks[r.id]?.given}
          value={marks[r.id]?.reason || ''}
          onChange={setMark(r.id, 'reason')}
          options={NOT_GIVEN_REASONS}
          placeholder={marks[r.id]?.given ? 'ได้รับแล้ว' : 'เลือกเหตุผล'}
        />
      ),
    });

    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, marks, canWrite, missingByStudent, date]);

  const school = getSchoolById(scope.schoolId);
  const room = rooms.find((r) => r.id === scope.roomId);
  const isCatchUpGrade = scope.grade === 'p1';

  return (
    <QueuePageShell
      activeKey='school-health'
      breadcrumb={breadcrumb}
      title='บันทึกบริการรายห้อง (Batch entry)'
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
          <NeutralSubdueButton size='sm' leadingIcon='monitoring' onClick={() => history.push('/clinic/school-health/dashboard')}>
            Dashboard เก็บตก
          </NeutralSubdueButton>
        </div>
      )}
    >
      <AlertDialog
        open={confirmOpen}
        type='warning'
        title='ยืนยันบันทึกทั้งชุด'
        description={mode === 'vaccine'
          ? `จะบันทึกการให้วัคซีน ${getVaccineById(vaccineId)?.nameTh || ''} Lot ${lotNo} ให้นักเรียน ${givenCount} คน และบันทึกเหตุผลกรณีไม่ได้รับอีก ${notGivenCount} คน — ระบบจะตัดสต็อกตาม Lot ที่ใช้จริง`
          : `จะบันทึกผลบริการให้นักเรียน ${givenCount} คน และบันทึกเหตุผลกรณีไม่ได้รับอีก ${notGivenCount} คน — ทุกแถวแนบผู้บันทึกและเวลาเดียวกัน`}
        cancelLabel='กลับไปตรวจสอบ'
        confirmLabel='ยืนยันบันทึก'
        onCancel={() => setConfirmOpen(false)}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSave}
      />

      <PageBody>
        <ReadOnlyBanner show={!canWrite} />

        <PageCard>
          <SectionHeader
            icon='checklist'
            title='เลือกขอบเขตและกิจกรรมที่จะบันทึก'
            subtitle='โรงเรียน → ชั้นเรียน → ห้องเรียน → กิจกรรม — จากนั้นระบบจะดึงรายชื่อนักเรียนทั้งห้องมาให้ติ๊ก'
          />
          <FieldRow>
            <Field label='กิจกรรมที่บันทึก' required minWidth={240}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={mode}
                onChange={(v) => { setMode(v); setVaccineId(''); setLotNo(''); setCatchUpMode(false); }}
                options={BATCH_MODES.map((m) => ({ value: m.value, label: m.label }))}
                placeholder='เลือกกิจกรรม'
              />
            </Field>
            <Field label='โรงเรียน' required minWidth={240}>
              <Select
                showLabel={false}
                size='lg'
                value={scope.schoolId}
                onChange={(v) => { setScope({ schoolId: v, grade: '', roomId: '' }); setVaccineId(''); setLotNo(''); }}
                options={schoolOptions(false)}
                placeholder='เลือกโรงเรียน'
              />
            </Field>
            <Field label='ชั้นเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!scope.schoolId}
                value={scope.grade}
                onChange={(v) => { setScope((s) => ({ ...s, grade: v, roomId: '' })); setVaccineId(''); setLotNo(''); setCatchUpMode(false); }}
                options={gradeOptionsForSchool(scope.schoolId, false)}
                placeholder='เลือกชั้น'
              />
            </Field>
            <Field
              label='ห้องเรียน'
              required
              flex='0 0 var(--dim-size-2200, 192px)'
              minWidth={160}
              hint={scope.grade && rooms.length === 0 ? 'ชั้นนี้ยังไม่มีห้องเรียนในทะเบียน' : undefined}
            >
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!scope.grade || rooms.length === 0}
                value={scope.roomId}
                onChange={(v) => setScope((s) => ({ ...s, roomId: v }))}
                options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                placeholder='เลือกห้อง'
              />
            </Field>
            <Field label='วันที่ให้บริการ' required flex='0 0 var(--dim-size-2450, 280px)' minWidth={200}>
              <DatePicker
                showLabel={false}
                showHelperText={false}
                value={date ? new Date(date) : null}
                onChange={(d) => setDate(d ? toIso(d) : '')}
                placeholder='เลือกวันที่'
              />
            </Field>
          </FieldRow>

          {mode === 'vaccine' ? (
            <>
              <FieldRow>
                <Field
                  label='วัคซีนตามตารางสร้างเสริมภูมิคุ้มกันของชั้นนี้'
                  required
                  minWidth={280}
                  hint={scope.grade && schedule.length === 0 ? `ชั้น ${gradeLabel(scope.grade)} ไม่มีวัคซีนตามตารางในโรงเรียน — เลือกจากรายการทั้งหมดได้จากหน้าข้อมูลนักเรียนรายคน` : undefined}
                >
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={!scope.grade || schedule.length === 0}
                    value={vaccineId}
                    onChange={(v) => { setVaccineId(v); setLotNo(''); }}
                    options={schedule.map((s) => ({ value: s.vaccineId, label: `${s.vaccine?.abbr || s.vaccineId} — ${s.doseLabel}` }))}
                    placeholder='เลือกวัคซีน'
                  />
                </Field>
                <Field
                  label='Lot No. (คลังวัคซีนของศูนย์ฯ)'
                  required
                  minWidth={260}
                  hint={vaccineId && lots.length === 0 ? 'วัคซีนนี้ไม่มี Lot ในคลัง — ประสานคลังเบิกก่อนออกให้บริการ' : undefined}
                >
                  <Select
                    showLabel={false}
                    searchable={false}
                    size='lg'
                    disabled={!vaccineId || lots.length === 0}
                    value={lotNo}
                    onChange={setLotNo}
                    options={lots.map((l) => ({ value: l.lotNo, label: `${l.lotNo} · หมดอายุ ${formatShDate(l.expiry)} · คงเหลือ ${l.remaining} โดส` }))}
                    placeholder='เลือก Lot No.'
                  />
                </Field>
              </FieldRow>

              {lotInfo ? (
                <SubCard tone='brand'>
                  <div className='flex items-center flex-wrap w-full' style={{ gap: 'var(--dim-space-500, 20px)' }}>
                    <ReadField label='Lot No.' value={lotInfo.lotNo} minWidth={140} />
                    <ReadField label='วันหมดอายุ' value={formatShDate(lotInfo.expiry)} minWidth={160} />
                    <ReadField label='คงเหลือ' value={`${lotRemaining} โดส`} minWidth={140} />
                    <ReadField label='ติ๊กไว้แล้ว' value={`${givenCount} คน`} minWidth={130} />
                    <ReadField label='การเก็บรักษา' value={lotInfo.coldChain} minWidth={140} />
                  </div>
                  {lotInfo.warning ? (
                    <NoticeBar tone={lotInfo.warning.tone === 'danger' ? 'danger' : 'warning'} icon='warning'>
                      {lotInfo.warning.message}
                    </NoticeBar>
                  ) : null}
                  {lotRemaining != null && givenCount > lotRemaining ? (
                    <NoticeBar tone='danger' icon='error'>
                      {`ติ๊กไว้ ${givenCount} คน แต่ Lot นี้คงเหลือ ${lotRemaining} โดส — เลือก Lot อื่นหรือลดจำนวนก่อนบันทึก`}
                    </NoticeBar>
                  ) : null}
                </SubCard>
              ) : null}

              {isCatchUpGrade ? (
                <SubCard>
                  <Checkbox
                    checked={catchUpMode}
                    disabled={!canWrite}
                    onChange={setCatchUpMode}
                    label='โหมด "เก็บตก ป.1" — ตั้งค่าเริ่มต้นให้ทุกคนเป็น "ได้รับครบ"'
                    description='ใช้เมื่อทั้งห้องได้รับวัคซีนครบตามสมุดสีชมพูอยู่แล้ว แล้วติ๊กออกเฉพาะคนที่ยังขาด'
                  />
                  {catchUpMode ? (
                    <NoticeBar
                      tone='warning'
                      icon='warning'
                      trailing={(
                        <NeutralSubdueButton size='sm' leadingIcon='backspace' disabled={!canWrite} onClick={clearAll}>
                          ล้างการติ๊กทั้งหมด
                        </NeutralSubdueButton>
                      )}
                    >
                      ขณะนี้ระบบติ๊ก &quot;ได้รับครบ&quot; ให้นักเรียนทุกคนไว้ล่วงหน้า — ต้องตรวจสอบรายคนก่อนบันทึก
                      หากยังไม่ได้ตรวจ ให้กด &quot;ล้างการติ๊กทั้งหมด&quot; แล้วติ๊กทีละคนตามจริง
                    </NoticeBar>
                  ) : null}
                </SubCard>
              ) : null}
            </>
          ) : null}

          <Field label='หมายเหตุการออกให้บริการ' flex='1 1 100%' minWidth={280}>
            <SuggestibleTextarea
              voice
              disabled={!canWrite}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              suggestions={NOTE_SUGGESTIONS}
              minChars={3}
              placeholder='เช่น ให้บริการในห้องประชุมโรงเรียน สังเกตอาการ 30 นาทีหลังฉีด'
            />
          </Field>
        </PageCard>

        <PageCard>
          <SectionHeader
            icon='groups'
            title={room ? `รายชื่อนักเรียนทั้งห้อง — ${school?.name || ''} ${room.name}` : 'รายชื่อนักเรียนทั้งห้อง'}
            subtitle={room ? `ครูประจำชั้น ${room.teacher} · ติ๊กหลายคนพร้อมกันได้ · แถวที่ไม่ได้ติ๊กบันทึกเป็น "ไม่ได้รับ" พร้อมเหตุผล` : undefined}
            trailing={roster.length > 0 ? (
              <>
                <NeutralSubdueButton size='sm' leadingIcon='done_all' disabled={!canWrite} onClick={selectAll}>
                  ติ๊กทั้งห้อง
                </NeutralSubdueButton>
                <NeutralSubdueButton size='sm' leadingIcon='backspace' disabled={!canWrite} onClick={clearAll}>
                  ล้างการติ๊กทั้งหมด
                </NeutralSubdueButton>
              </>
            ) : null}
          />

          <ErrorList errors={errors} />

          {!scope.roomId ? (
            <EmptyState
              icon='meeting_room'
              title='ยังไม่ได้เลือกห้องเรียน'
              subtitle='เลือกโรงเรียน ชั้นเรียน และห้องเรียนด้านบน เพื่อดึงรายชื่อนักเรียนทั้งห้องมาบันทึกพร้อมกัน'
            />
          ) : roster.length === 0 ? (
            <EmptyState
              icon='groups'
              title='ห้องเรียนนี้ยังไม่มีรายชื่อนักเรียน'
              subtitle='นำเข้ารายชื่อทั้งห้องจากไฟล์ Excel ที่หน้าทะเบียนนักเรียน แล้วกลับมาบันทึกบริการรายห้องอีกครั้ง'
              actionLabel='ไปนำเข้ารายชื่อนักเรียน'
              onAction={() => history.push({ pathname: '/clinic/school-health/students', state: { schoolId: scope.schoolId } })}
            />
          ) : (
            <>
              <StatRow>
                <StatTile label='นักเรียนในห้อง' value={thNum(roster.length)} unit='คน' icon='groups' tone='info' />
                <StatTile label={mode === 'vaccine' ? 'ติ๊กว่าได้รับแล้ว' : 'ติ๊กว่าให้บริการแล้ว'} value={thNum(givenCount)} unit='คน' icon='check_circle' tone='brand' />
                <StatTile label='ยังไม่ได้รับ' value={thNum(notGivenCount)} unit='คน' icon='pending' tone='warning' />
                {mode === 'vaccine' ? (
                  <StatTile
                    label='คงเหลือใน Lot หลังบันทึก'
                    value={lotRemaining == null ? '—' : thNum(Math.max(0, lotRemaining - givenCount))}
                    unit='โดส'
                    icon='inventory_2'
                    tone={lotRemaining != null && givenCount > lotRemaining ? 'danger' : 'info'}
                  />
                ) : null}
              </StatRow>

              <Table
                columns={columns}
                rows={roster}
                rowKey={(r) => r.id}
                stickyColCount={3}
                stickyHeaderTop={QUEUE_STICKY_UNDER_TABS}
                emptyMessage='ไม่มีนักเรียนในห้องนี้'
              />

              {notGivenCount > 0 && roster.some((st) => !marks[st.id]?.given && !marks[st.id]?.reason) ? (
                <NoticeBar tone='info' icon='info'>
                  {`มี ${roster.filter((st) => !marks[st.id]?.given && !marks[st.id]?.reason).length} คนที่ยังไม่ได้ระบุเหตุผลกรณีไม่ได้รับ — บันทึกได้ แต่แนะนำให้ระบุเพื่อใช้วางแผนรอบเก็บตก`}
                </NoticeBar>
              ) : null}

              <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <div className='flex-1' />
                <NeutralSubdueButton size='lg' leadingIcon='close' onClick={() => { clearAll(); setErrors([]); }}>
                  ล้างฟอร์ม
                </NeutralSubdueButton>
                <BrandSubdueButton variant='fill' size='lg' leadingIcon='save' disabled={!canWrite} onClick={requestSave}>
                  บันทึกทั้งชุด
                </BrandSubdueButton>
              </div>
            </>
          )}
        </PageCard>

        <PageCard>
          <SectionHeader
            icon='history'
            title='ประวัติการบันทึกรายห้อง'
            subtitle='ทุกชุดบันทึกเป็นรายคนโดยแนบผู้บันทึกเดียวกันทุกแถว พร้อม Lot No. ที่ใช้จริงเพื่อการติดตาม AEFI'
          />
          {batchLog.length === 0 ? (
            <EmptyState compact icon='history' title='ยังไม่มีการบันทึกรายห้องใน session นี้' subtitle='เมื่อบันทึกทั้งชุดสำเร็จ รายการจะปรากฏที่นี่พร้อมผู้บันทึกและเวลา' />
          ) : (
            <Table
              columns={[
                { key: 'date', label: 'วันที่ให้บริการ', render: (r) => formatShDate(r.date) },
                { key: 'mode', label: 'กิจกรรม', render: (r) => (BATCH_MODES.find((m) => m.value === r.mode)?.label || r.mode) },
                { key: 'schoolName', label: 'โรงเรียน', flex: true, minWidth: 200 },
                { key: 'room', label: 'ชั้น/ห้อง', render: (r) => `${r.gradeName} · ${r.roomName}` },
                { key: 'vaccineName', label: 'วัคซีน', flex: true, minWidth: 200, render: (r) => r.vaccineName || '—' },
                { key: 'lotNo', label: 'Lot No.', render: (r) => r.lotNo || '—' },
                { key: 'givenCount', label: 'ได้รับ (คน)', align: 'center' },
                { key: 'notGivenCount', label: 'ไม่ได้รับ (คน)', align: 'center' },
                {
                  key: 'reasons',
                  label: 'สรุปเหตุผลที่ไม่ได้รับ',
                  flex: true,
                  minWidth: 260,
                  sortable: false,
                  render: (r) => ((r.reasons || []).length
                    ? [...new Set(r.reasons.map((x) => notGivenReasonLabel(x.reason)))].join(' · ')
                    : '—'),
                },
                {
                  key: 'by',
                  label: 'ผู้บันทึก · เวลา',
                  flex: true,
                  minWidth: 230,
                  sortable: false,
                  render: (r) => (
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                      <span style={{ fontSize: 'var(--type-size-sm, 14px)' }}>{r.by}</span>
                      <span style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                        {`${r.position} · ${formatShDateTime(r.at)}`}
                      </span>
                    </div>
                  ),
                },
              ]}
              rows={batchLog}
              rowKey={(r) => r.id}
              emptyMessage='ยังไม่มีประวัติ'
            />
          )}
          <AuditLine icon='info'>
            การแก้ไข/ยกเลิกรายการวัคซีนย้อนหลังทำได้จากแท็บ &quot;ให้บริการวัคซีน&quot; ในหน้าข้อมูลนักเรียนรายคน — ระบบคง Lot No. เดิมไว้เสมอเพื่อ traceability AEFI
          </AuditLine>
        </PageCard>
      </PageBody>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default SchoolHealthBatchVaccinePage;
