import React, { useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { UploadProgressBox, useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import { formatShDate, gradeLabel, SH_ACADEMIC_YEARS, CURRENT_ACADEMIC_YEAR } from '@/data/schoolHealthCore';
import { gradeOptionsForSchool, getClassrooms } from '@/data/schoolHealthSchools';
import {
  IMPORT_TEMPLATE_HEADER, IMPORT_SAMPLE_ROWS, isSpreadsheetFile, parseStudentSpreadsheet,
} from '@/data/schoolHealthStudents';
import {
  EmptyState, NoticeBar, StatTile, StatRow, SubCard, Field, FieldRow,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* StudentImportPopup — นำเข้ารายชื่อนักเรียนรายห้องจากสเปรดชีต
   (คู่มือ HCIS §2.3.1 "นำเข้าข้อมูลนักเรียน", TOR §3.2.1)

   Flow เดียวกับ CheckupImportPopup: เลือกปลายทาง (โรงเรียน→ชั้น→ห้อง) →
   เลือกไฟล์ → อ่าน+ตรวจสอบ → พรีวิวรายแถว → นำเข้าเฉพาะแถวที่ผ่าน
   แถวที่ไม่ผ่าน (เลขบัตร ปชช. ผิด/ซ้ำ · วันเกิดในอนาคต · ข้อมูลไม่ครบ)
   ถูกแสดงพร้อมเหตุผลและถูกข้าม ไม่ถูกเขียนลงทะเบียน */

const STEP = { pick: 'pick', uploading: 'uploading', preview: 'preview' };

const StudentImportPopup = ({
  open,
  onClose,
  onImport,
  existingStudents = [],
  schoolOptions = [],
  defaultSchoolId = '',
}) => {
  const fileRef = useRef(null);
  const [step, setStep] = useState(STEP.pick);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsed, setParsed] = useState(null);
  const [pendingText, setPendingText] = useState('');
  const [meta, setMeta] = useState({
    schoolId: defaultSchoolId,
    grade: '',
    roomId: '',
    academicYear: CURRENT_ACADEMIC_YEAR,
  });

  const finishUpload = () => {
    setParsed(parseStudentSpreadsheet(pendingText, existingStudents));
    setStep(STEP.preview);
  };

  const progress = useSmoothUploadProgress({ active: step === STEP.uploading, durationMs: 1100, onDone: finishUpload });

  const reset = () => {
    setStep(STEP.pick);
    setFileName('');
    setFileError('');
    setParsed(null);
    setPendingText('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileName(file.name);
    if (!isSpreadsheetFile(file.name)) {
      setFileError(`ไฟล์ "${file.name}" ไม่ใช่ไฟล์สเปรดชีต — รองรับเฉพาะ .csv .txt .xls .xlsx`);
      setParsed(null);
      setStep(STEP.pick);
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => {
      setPendingText(String(reader.result || ''));
      setStep(STEP.uploading);
    };
    reader.readAsText(file, 'utf-8');
  };

  const useSample = () => {
    setFileName('ตัวอย่างรายชื่อนักเรียน.csv');
    setFileError('');
    setPendingText([IMPORT_TEMPLATE_HEADER, ...IMPORT_SAMPLE_ROWS].join('\n'));
    setStep(STEP.uploading);
  };

  const downloadTemplate = () => {
    if (typeof document === 'undefined') return;
    const blob = new Blob(['﻿', `${IMPORT_TEMPLATE_HEADER}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แบบฟอร์มรายชื่อนักเรียน.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => ([
    { key: '_line', label: 'แถวที่' },
    {
      key: 'status',
      label: 'ผลตรวจสอบ',
      sortable: false,
      render: (r) => (r._ok
        ? <ColorfulBadge style='green' size='small' hierarchy='secondary' icon='check_circle'>ผ่าน</ColorfulBadge>
        : <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='error'>ไม่ผ่าน</ColorfulBadge>),
    },
    { key: 'studentNo', label: 'เลขที่' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200, render: (r) => `${r.prefix || ''}${r.firstName} ${r.lastName}`.trim() || '—' },
    { key: 'sex', label: 'เพศ', render: (r) => r.sex || '—' },
    { key: 'birthDate', label: 'วันเกิด', render: (r) => (r.birthDate ? formatShDate(r.birthDate) : '—') },
    { key: 'citizenId', label: 'เลขบัตรประชาชน', render: (r) => r.citizenId || '—' },
    { key: 'guardianName', label: 'ผู้ปกครอง', flex: true, minWidth: 180, render: (r) => r.guardianName || '—' },
    { key: 'guardianPhone', label: 'เบอร์ติดต่อ', render: (r) => r.guardianPhone || '—' },
    {
      key: 'errors',
      label: 'ปัญหาที่พบ',
      flex: true,
      minWidth: 260,
      sortable: false,
      render: (r) => (r._errors.length === 0
        ? <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>
        : (
          <span style={{ color: 'var(--text-alert-error, #B91C1C)', fontSize: 'var(--type-size-xs, 12px)' }}>
            {r._errors.join(' · ')}
          </span>
        )),
    },
  ]), []);

  const rooms = getClassrooms(meta.schoolId).filter((r) => !meta.grade || r.grade === meta.grade);
  const destinationReady = !!(meta.schoolId && meta.grade && meta.roomId);
  const valid = parsed?.valid || [];
  const invalid = parsed?.invalid || [];

  const primaryAction = step === STEP.preview
    ? {
      label: valid.length > 0 ? `นำเข้า ${valid.length} รายการ` : 'ไม่มีแถวที่นำเข้าได้',
      disabled: valid.length === 0 || !destinationReady,
      onClick: () => {
        onImport(parsed.rows, meta);
        handleClose();
      },
    }
    : undefined;

  return (
    <Popup
      open={open}
      onClose={handleClose}
      size='extraLarge'
      title='นำเข้ารายชื่อนักเรียนจากสเปรดชีต'
      subtitle='เลือกห้องเรียนปลายทาง → เลือกไฟล์ → ตรวจสอบตัวอย่างข้อมูล → นำเข้าเฉพาะแถวที่ผ่าน'
      tertiaryAction={{ label: step === STEP.preview ? 'ยกเลิกการนำเข้า' : 'ปิด', onClick: handleClose }}
      secondaryAction={step === STEP.preview ? { label: 'เลือกไฟล์ใหม่', onClick: reset } : undefined}
      primaryAction={primaryAction}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <input
          ref={fileRef}
          type='file'
          accept='.csv,.txt,.xls,.xlsx'
          onChange={handleFile}
          style={{ display: 'none' }}
          aria-hidden
        />

        <SubCard>
          <span
            style={{
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            ข้อมูลโรงเรียนปลายทาง (คู่มือ §2.3.1 ข้อ 1)
          </span>
          <FieldRow>
            <Field label='โรงเรียน' required minWidth={220}>
              <Select
                showLabel={false}
                size='lg'
                value={meta.schoolId}
                onChange={(v) => setMeta((m) => ({ ...m, schoolId: v, grade: '', roomId: '' }))}
                options={schoolOptions}
                placeholder='เลือกโรงเรียน'
              />
            </Field>
            <Field label='ชั้นเรียน' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!meta.schoolId}
                value={meta.grade}
                onChange={(v) => setMeta((m) => ({ ...m, grade: v, roomId: '' }))}
                options={gradeOptionsForSchool(meta.schoolId, false)}
                placeholder='เลือกชั้น'
              />
            </Field>
            <Field
              label='ห้องเรียน'
              required
              flex='0 0 var(--dim-size-2200, 192px)'
              minWidth={160}
              hint={meta.grade && rooms.length === 0 ? 'ชั้นนี้ยังไม่มีห้องเรียน — เพิ่มห้องที่ทะเบียนโรงเรียนก่อน' : undefined}
            >
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                disabled={!meta.grade || rooms.length === 0}
                value={meta.roomId}
                onChange={(v) => setMeta((m) => ({ ...m, roomId: v }))}
                options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                placeholder='เลือกห้อง'
              />
            </Field>
            <Field label='ปีการศึกษา' required flex='0 0 var(--dim-size-2200, 192px)' minWidth={160}>
              <Select
                showLabel={false}
                searchable={false}
                size='lg'
                value={meta.academicYear}
                onChange={(v) => setMeta((m) => ({ ...m, academicYear: v }))}
                options={SH_ACADEMIC_YEARS}
                placeholder='เลือกปีการศึกษา'
              />
            </Field>
          </FieldRow>
        </SubCard>

        {step === STEP.pick ? (
          <>
            <SubCard tone='brand'>
              <div className='flex flex-col items-center text-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span style={{ color: 'var(--text-brandPrimary-default, #007549)' }}>
                  <Icon name='upload_file' size={32} />
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium)' }}>
                  เลือกไฟล์สเปรดชีตรายชื่อนักเรียนของห้องนี้
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {`รองรับ .csv .txt .xls .xlsx — หัวคอลัมน์: ${IMPORT_TEMPLATE_HEADER}`}
                </span>
                <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <BrandSubdueButton variant='fill' size='md' leadingIcon='attach_file' onClick={() => fileRef.current?.click()}>
                    เลือกไฟล์
                  </BrandSubdueButton>
                  <NeutralSubdueButton size='md' leadingIcon='download' onClick={downloadTemplate}>
                    ดาวน์โหลดแบบฟอร์ม
                  </NeutralSubdueButton>
                  <NeutralSubdueButton size='md' leadingIcon='science' onClick={useSample}>
                    ใช้ไฟล์ตัวอย่าง (สาธิต)
                  </NeutralSubdueButton>
                </div>
              </div>
            </SubCard>
            {fileError ? <NoticeBar tone='danger' icon='error'>{fileError}</NoticeBar> : null}
          </>
        ) : null}

        {step === STEP.uploading ? (
          <UploadProgressBox progress={progress} fileName={fileName} label='กำลังอ่านไฟล์และตรวจสอบข้อมูล…' />
        ) : null}

        {step === STEP.preview && parsed ? (
          parsed.rows.length === 0 ? (
            <EmptyState
              icon='error'
              title='ไฟล์นี้ไม่มีข้อมูลนักเรียน'
              subtitle={`ไฟล์ "${fileName}" ว่างเปล่าหรือมีเฉพาะหัวคอลัมน์ — ตรวจสอบไฟล์แล้วนำเข้าอีกครั้ง`}
              actionLabel='เลือกไฟล์ใหม่'
              onAction={reset}
            />
          ) : (
            <>
              <StatRow>
                <StatTile label='แถวทั้งหมดในไฟล์' value={parsed.rows.length} unit='แถว' tone='info' icon='table_rows' />
                <StatTile label='นำเข้าได้' value={valid.length} unit='แถว' tone='brand' icon='check_circle' />
                <StatTile label='ข้าม (ไม่ผ่าน)' value={invalid.length} unit='แถว' tone='danger' icon='error' />
              </StatRow>

              {!destinationReady ? (
                <NoticeBar tone='warning' icon='warning'>
                  เลือกโรงเรียน ชั้นเรียน และห้องเรียนปลายทางให้ครบก่อน จึงจะกดนำเข้าได้
                </NoticeBar>
              ) : null}

              <NoticeBar tone={invalid.length > 0 ? 'warning' : 'brand'} icon={invalid.length > 0 ? 'warning' : 'check_circle'}>
                {invalid.length > 0
                  ? `พบแถวที่ไม่ผ่านการตรวจสอบ ${invalid.length} แถว — ระบบจะนำเข้าเฉพาะ ${valid.length} แถวที่ผ่าน และข้ามแถวที่มีปัญหา`
                  : `ตรวจสอบผ่านทั้งหมด ${valid.length} แถว — กด "นำเข้า" เพื่อเพิ่มเข้าทะเบียนนักเรียนของห้องที่เลือก`}
              </NoticeBar>

              <Table
                columns={columns}
                rows={parsed.rows}
                rowKey={(r) => `${r._line}-${r.citizenId || 'x'}`}
                emptyMessage='ไม่มีข้อมูลในไฟล์'
              />

              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                {`ปลายทาง: ${meta.schoolId ? '' : 'ยังไม่เลือกโรงเรียน'}${meta.grade ? ` ${gradeLabel(meta.grade)}` : ''}${meta.roomId ? ` · ${rooms.find((r) => r.id === meta.roomId)?.name || ''}` : ''} · ปีการศึกษา ${meta.academicYear} · หากกด "ยกเลิกการนำเข้า" ระบบจะไม่เขียนข้อมูลใด ๆ ลงทะเบียน`}
              </span>
            </>
          )
        ) : null}
      </div>
    </Popup>
  );
};

export default StudentImportPopup;
