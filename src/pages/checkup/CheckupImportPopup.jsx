import React, { useMemo, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { UploadProgressBox, useSmoothUploadProgress } from '@/components/forms/UploadProgressBar';
import {
  MEMBER_IMPORT_HEADERS, MEMBER_IMPORT_ACCEPT, SAMPLE_MEMBER_CSV,
  parseMemberSpreadsheet, isSpreadsheetFile, formatThaiDate,
} from '@/data/checkupStore';
import { EmptyState, NoticeBar, StatTile, SubCard } from '@/pages/checkup/CheckupUi';

/* CheckupImportPopup — นำเข้ารายชื่อกลุ่มเป้าหมายจากสเปรดชีต (TOR 1.19.3 / 1.19.4).

   Flow mirrors the finance NhsoImportSection contract (choose file → decode →
   preview → confirm) but adds the row-level validation the TOR edge cases ask
   for: wrong file type, empty file, missing header columns, CID not 13 digits,
   duplicate CID (in-file and against existing members), future birth date.
   Only rows that pass are importable, and cancelling mid-preview writes
   nothing. */

const STEP = { pick: 'pick', uploading: 'uploading', preview: 'preview' };

const CheckupImportPopup = ({ open, onClose, existingMembers = [], onImport }) => {
  const fileRef = useRef(null);
  const [step, setStep] = useState(STEP.pick);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [parsed, setParsed] = useState(null);
  const [pendingText, setPendingText] = useState('');

  const finishUpload = () => {
    const result = parseMemberSpreadsheet(pendingText, existingMembers);
    setParsed(result);
    setStep(STEP.preview);
  };

  const progress = useSmoothUploadProgress({
    active: step === STEP.uploading,
    durationMs: 1200,
    onDone: finishUpload,
  });

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
    setFileName('ตัวอย่างรายชื่อกลุ่มเป้าหมาย.csv');
    setFileError('');
    setPendingText(SAMPLE_MEMBER_CSV);
    setStep(STEP.uploading);
  };

  const downloadTemplate = () => {
    const blob = new Blob(['﻿', `${MEMBER_IMPORT_HEADERS.join(',')}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'แบบฟอร์มรายชื่อกลุ่มเป้าหมาย.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => ([
    { key: 'rowNo', label: 'แถวที่', width: 80 },
    {
      key: 'status',
      label: 'ผลตรวจสอบ',
      width: 130,
      sortable: false,
      render: (r) => (r.valid
        ? <ColorfulBadge style='green' size='small' hierarchy='secondary' icon='check_circle'>ผ่าน</ColorfulBadge>
        : <ColorfulBadge style='red' size='small' hierarchy='secondary' icon='error'>ไม่ผ่าน</ColorfulBadge>),
    },
    { key: 'cid', label: 'เลขบัตรประชาชน', width: 170, render: (r) => r.cid || '—' },
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 200, render: (r) => r.name || '—' },
    { key: 'sex', label: 'เพศ', width: 80, render: (r) => r.sex || '—' },
    { key: 'dob', label: 'วันเกิด', width: 150, render: (r) => (r.dob ? formatThaiDate(r.dob) : '—') },
    { key: 'phone', label: 'เบอร์โทร', width: 130, render: (r) => r.phone || '—' },
    {
      key: 'errors',
      label: 'ปัญหาที่พบ',
      flex: true,
      minWidth: 240,
      sortable: false,
      render: (r) => (r.errors.length === 0
        ? <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>
        : (
          <span style={{ color: 'var(--text-danger-secondary, #DC2626)', fontSize: 'var(--type-size-xs, 12px)' }}>
            {r.errors.join(' · ')}
          </span>
        )),
    },
  ]), []);

  const passed = parsed?.passed || [];
  const failed = parsed?.failed || [];

  const primaryAction = step === STEP.preview && parsed?.ok
    ? {
      label: passed.length > 0 ? `นำเข้า ${passed.length} รายการ` : 'ไม่มีแถวที่นำเข้าได้',
      onClick: () => {
        onImport(passed.map(({ rowNo, errors, valid, ...row }) => row));
        handleClose();
      },
      disabled: passed.length === 0,
    }
    : undefined;

  return (
    <Popup
      open={open}
      onClose={handleClose}
      title='นำเข้ารายชื่อกลุ่มเป้าหมายจากสเปรดชีต'
      subtitle='เลือกไฟล์ → ตรวจสอบตัวอย่างข้อมูล → นำเข้าเฉพาะแถวที่ผ่านการตรวจสอบ'
      size='extraLarge'
      tertiaryAction={{ label: step === STEP.preview ? 'ยกเลิกการนำเข้า' : 'ปิด', onClick: handleClose }}
      secondaryAction={step === STEP.preview ? { label: 'เลือกไฟล์ใหม่', onClick: reset } : undefined}
      primaryAction={primaryAction}
    >
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
        <input
          ref={fileRef}
          type='file'
          accept={MEMBER_IMPORT_ACCEPT}
          onChange={handleFile}
          style={{ display: 'none' }}
          aria-hidden
        />

        {step === STEP.pick ? (
          <>
            <SubCard tone='brand'>
              <div className='flex flex-col items-center text-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <span style={{ color: 'var(--icon-brandPrimary-default, #007549)' }}>
                  <Icon name='upload_file' size={32} />
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
                  เลือกไฟล์สเปรดชีตรายชื่อผู้รับบริการ
                </span>
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  {`รองรับ .csv .txt .xls .xlsx — ต้องมีหัวคอลัมน์: ${MEMBER_IMPORT_HEADERS.join(' · ')}`}
                </span>
                <div className='flex items-center flex-wrap justify-center' style={{ gap: 'var(--dim-space-200)' }}>
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
            {parsed && !parsed.ok ? <NoticeBar tone='danger' icon='error'>{parsed.error}</NoticeBar> : null}
          </>
        ) : null}

        {step === STEP.uploading ? (
          <UploadProgressBox progress={progress} fileName={fileName} label='กำลังอ่านไฟล์และตรวจสอบข้อมูล…' />
        ) : null}

        {step === STEP.preview && parsed && !parsed.ok ? (
          <>
            <NoticeBar tone='danger' icon='error'>{parsed.error}</NoticeBar>
            <EmptyState
              icon='error'
              title='ไม่สามารถอ่านไฟล์นี้ได้'
              subtitle={`ไฟล์ "${fileName}" ไม่ผ่านการตรวจสอบโครงสร้าง — โปรดแก้ไขไฟล์แล้วนำเข้าอีกครั้ง`}
              actionLabel='เลือกไฟล์ใหม่'
              onAction={reset}
            />
          </>
        ) : null}

        {step === STEP.preview && parsed?.ok ? (
          <>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <StatTile label='แถวทั้งหมดในไฟล์' value={parsed.rows.length} unit='แถว' tone='info' icon='table_rows' />
              <StatTile label='นำเข้าได้' value={passed.length} unit='แถว' tone='brand' icon='check_circle' />
              <StatTile label='ข้าม (ไม่ผ่าน)' value={failed.length} unit='แถว' tone='danger' icon='error' />
            </div>

            <NoticeBar tone={failed.length > 0 ? 'warning' : 'success'} icon={failed.length > 0 ? 'warning' : 'check_circle'}>
              {failed.length > 0
                ? `พบแถวที่ไม่ผ่านการตรวจสอบ ${failed.length} แถว (แสดงเป็นสีแดง) — ระบบจะนำเข้าเฉพาะ ${passed.length} แถวที่ผ่าน และข้าม ${failed.length} แถว`
                : `ตรวจสอบผ่านทั้งหมด ${passed.length} แถว — กด "นำเข้า" เพื่อเพิ่มเข้ากลุ่มเป้าหมาย`}
            </NoticeBar>

            <Table
              columns={columns}
              rows={parsed.rows}
              rowKey={(r) => `${r.rowNo}-${r.cid || 'x'}`}
              emptyMessage='ไม่มีข้อมูลในไฟล์'
            />

            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              หากกด "ยกเลิกการนำเข้า" ระบบจะไม่เขียนข้อมูลใด ๆ ลงกลุ่มเป้าหมาย
            </span>
          </>
        ) : null}
      </div>
    </Popup>
  );
};

export default CheckupImportPopup;
