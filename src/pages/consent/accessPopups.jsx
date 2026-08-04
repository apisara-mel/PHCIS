import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import DatePickerRange from '@/components/forms/DatePickerRange';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import AccessRequestForm from '@/pages/consent/AccessRequestForm';
import { accessPatientLabel } from '@/data/accessRecords';

/* Helper popups ของ AccessManagementPage — TOR ด.1.1.17 (แตกไฟล์ตาม playbook):

     • ScanImportPopup   — 17.1 อัปโหลดแบบฟอร์มขอเข้าถึงข้อมูลนำเข้าระบบ
                           (ศัพท์ HCIS: บันทึกการ SCAN เอกสาร): อัปโหลด/ถ่ายภาพ →
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

/* ══ 17.1 — ขอสิทธิ์การเข้าถึงแบบฟอร์ม ══════════════════════════════ */
export function ScanImportPopup({ open, onClose, onImported }) {
  const [formApi, setFormApi] = useState({
    ready: false,
    dirty: false,
    submit: () => {},
    requestCancel: () => {},
  });

  if (!open) return null;

  return (
    <Popup
      open={open}
      onClose={() => (formApi.dirty ? formApi.requestCancel() : onClose())}
      size='large'
      title='ขอสิทธิ์การเข้าถึงแบบฟอร์ม'
      subtitle='อัปโหลดหรือถ่ายภาพแบบฟอร์มขอเข้าถึงข้อมูล — ระบบอ่านข้อมูล (OCR) แล้วให้ตรวจแก้ก่อนบันทึกเป็นคำขอใหม่'
      primaryAction={{ label: 'ส่งคำขอสิทธิ์', onClick: () => formApi.submit(), disabled: !formApi.ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: () => (formApi.dirty ? formApi.requestCancel() : onClose()) }}
    >
      <AccessRequestForm
        key={open ? 'open' : 'closed'}
        showFooter={false}
        onCancel={onClose}
        onSubmit={(payload) => onImported?.(payload)}
        onStateChange={setFormApi}
      />
    </Popup>
  );
}

/* ══ 17.2 — แก้ไขช่วงเวลาสิทธิ (admin คลิกคอลัมน์) ═══════════════════════ */
export function EditPeriodPopup({ open, record, onClose, onSave, thaiDateOfIso }) {
  const [range, setRange] = useState(['', '']);

  useEffect(() => {
    if (!open || !record) return;
    setRange([record.periodStart || '', record.periodEnd || '']);
  }, [open, record]);

  const [startIso, endIso] = range;
  const invalidOrder = !!startIso && !!endIso && endIso < startIso;
  const ready = !!startIso && !!endIso && !invalidOrder;

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      title='แก้ไขช่วงเวลาสิทธิ'
      subtitle={record ? `${record.reqNo} · ${record.name} · ${accessPatientLabel(record)}` : undefined}
      primaryAction={{ label: 'บันทึกช่วงเวลา', onClick: () => ready && onSave({ periodStart: startIso, periodEnd: endIso }), disabled: !ready }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    >
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
        <span style={BODY_TEXT}>
          กำหนดวันเริ่มต้นและวันสิ้นสุดของสิทธิเข้าถึงข้อมูล — การเปลี่ยนแปลงจะบันทึกใน audit
        </span>
        <DatePickerRange
          label='ช่วงเวลาสิทธิ (เริ่มต้น - สิ้นสุด)'
          required
          value={range}
          onChange={setRange}
          format={isoFormat}
          parse={isoParse}
          error={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
          helperText={invalidOrder ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : (record?.periodStart
            ? `ปัจจุบัน: ${thaiDateOfIso(record.periodStart)} – ${thaiDateOfIso(record.periodEnd)}`
            : 'เลือกวันเริ่มต้นและวันสิ้นสุด')}
        />
      </div>
    </Popup>
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
      subtitle={record ? `${record.reqNo} · ${record.name} · ${accessPatientLabel(record)}` : undefined}
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
          <DetailRow
            label='Group Policy / สาขาย่อย / แผนก'
            value={[record.group, record.subBranch, record.dept].filter(Boolean).join(' · ') || '-'}
          />
          <DetailRow label='ประเภทการขอ' value={record.accessTypeLabel || '-'} />
          <DetailRow
            label='แบบฟอร์มความยินยอม'
            value={record.formName ? `${record.formCode ? `${record.formCode} · ` : ''}${record.formName}` : '-'}
          />
          <DetailRow label='เหตุผลที่ขอ' value={record.reason || '-'} />
          <DetailRow label='ผู้รับบริการ' value={accessPatientLabel(record)} />
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
