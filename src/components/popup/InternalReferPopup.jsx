import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { DEPARTMENTS } from '@/data/usersAccess';
import { readDepartments } from '@/data/departmentStore';
import { QUEUE_STATIONS, getStationLabel } from '@/data/queueCenterStore';
import { DEFAULT_CLINIC_VALUE, useClinicFilter } from '@/components/layout/HeaderClinicContext';

/* คำแนะนำหมายเหตุการส่งต่อภายใน (mock) — ขึ้นเมื่อพิมพ์ครบ 3 ตัวอักษร
   (มติผู้ใช้ 25 ส.ค. 69) ของจริงควรดึงจากคลังคำของหน่วยบริการ */
const INTERNAL_REFER_NOTE_HINTS = [
  'อาการคงที่ พร้อมส่งต่อ',
  'แจ้งประวัติแพ้ยาให้ปลายทางแล้ว',
  'ขอให้ตรวจซ้ำก่อนจ่ายยา',
  'ผู้รับบริการต้องการพบแพทย์คนเดิม',
  'นัดติดตามอาการภายใน 1 สัปดาห์',
  'แนบผลแลปล่าสุดไปด้วยแล้ว',
];

/* Shared "ส่งต่อภายใน" popup — same destination catalogs as observation
   discharge: assess departments ∪ usersAccess DEPARTMENTS, and every
   queue-center QUEUE_STATIONS service point. Optional note is never required. */

const REFER_DEPARTMENT_PLACEHOLDER = '-- เลือกแผนกปลายทาง --';
const REFER_SERVICE_POINT_PLACEHOLDER = '-- เลือกจุดบริการปลายทาง --';

export const listInternalReferDepartments = (centerId = DEFAULT_CLINIC_VALUE) => {
  const seen = new Set();
  const options = [];
  const add = (value, label) => {
    const key = String(label || '').trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    options.push({ value: value || label, label });
  };
  readDepartments(centerId)
    .filter((d) => d.active !== false)
    .forEach((d) => add(d.id, d.name));
  DEPARTMENTS.forEach((d) => add(d.key, d.label));
  return options;
};

export const listInternalReferServicePoints = () => (
  [...QUEUE_STATIONS]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((s) => ({
      value: s.id,
      label: s.active === false ? `${s.label} (ปิดรับคิว)` : s.label,
    }))
);

export const resolveInternalReferLabels = ({
  departmentId,
  servicePointId,
  centerId = DEFAULT_CLINIC_VALUE,
} = {}) => {
  const dept = listInternalReferDepartments(centerId).find((o) => o.value === departmentId);
  const stationLabel = getStationLabel(servicePointId);
  return {
    departmentLabel: dept?.label || departmentId || '',
    servicePointLabel: stationLabel && stationLabel !== '—'
      ? stationLabel
      : (listInternalReferServicePoints().find((o) => o.value === servicePointId)?.label || servicePointId || ''),
  };
};

/** Form fields only — for embedding inside a larger popup (e.g. observation). */
export function InternalReferFields({
  department,
  servicePoint,
  note,
  onDepartmentChange,
  onServicePointChange,
  onNoteChange,
  departmentOptions,
  servicePointOptions,
}) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <Select
        label='แผนกปลายทาง'
        value={department}
        onChange={(val) => {
          onDepartmentChange?.(val);
          onServicePointChange?.('');
        }}
        options={departmentOptions}
        placeholder={REFER_DEPARTMENT_PLACEHOLDER}
        required
      />
      <Select
        label='จุดบริการปลายทาง'
        helperText='เลือกจากจุดบริการทั้งหมดในระบบ (ผังจุดบริการ)'
        value={servicePoint}
        onChange={onServicePointChange}
        options={servicePointOptions}
        placeholder={REFER_SERVICE_POINT_PLACEHOLDER}
        required
        disabled={!department}
      />
      <SuggestibleTextarea
        voice
        label='หมายเหตุ'
        value={note}
        onChange={(val) => onNoteChange?.(typeof val === 'string' ? val : val?.target?.value || '')}
        placeholder='เช่น อาการคงที่ พร้อมส่งต่อ · แจ้งประวัติแพ้ยา · เอกสารที่ต้องแนบ'
        showHelperText={false}
        suggestions={INTERNAL_REFER_NOTE_HINTS}
        minChars={3}
      />
    </div>
  );
}

/**
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {(payload: {
 *   departmentId: string,
 *   departmentLabel: string,
 *   servicePointId: string,
 *   servicePointLabel: string,
 *   note: string,
 * }) => void} onConfirm
 * @param {string} [fromDepartment] — shown as "จากแผนก"
 * @param {string} [title]
 * @param {string} [subtitle]
 * @param {string} [primaryLabel]
 * @param {React.ReactNode} [extra] — optional fields below the shared ones (e.g. ESI)
 * @param {string} [centerId] — override clinic scope for department catalog
 */
export default function InternalReferPopup({
  open,
  onClose,
  onConfirm,
  fromDepartment,
  title = 'ส่งต่อภายใน',
  subtitle,
  primaryLabel = 'ยืนยันส่งต่อ',
  extra,
  centerId: centerIdProp,
}) {
  const clinicCtx = useClinicFilter();
  const centerId = centerIdProp || clinicCtx?.clinic || DEFAULT_CLINIC_VALUE;

  const [department, setDepartment] = useState('');
  const [servicePoint, setServicePoint] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setDepartment('');
    setServicePoint('');
    setNote('');
  }, [open]);

  const departmentOptions = listInternalReferDepartments(centerId);
  const servicePointOptions = listInternalReferServicePoints();
  const incomplete = !String(department || '').trim() || !String(servicePoint || '').trim();

  const handleConfirm = () => {
    if (incomplete) return;
    const { departmentLabel, servicePointLabel } = resolveInternalReferLabels({
      departmentId: department,
      servicePointId: servicePoint,
      centerId,
    });
    onConfirm?.({
      departmentId: department,
      departmentLabel,
      servicePointId: servicePoint,
      servicePointLabel,
      note: note.trim(),
    });
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size='large'
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{
        label: primaryLabel,
        onClick: handleConfirm,
        disabled: incomplete,
      }}
    >
      <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400)' }}>
        {fromDepartment ? (
          <div
            className='flex items-center flex-wrap'
            style={{
              gap: 'var(--dim-space-200, 8px)',
              fontSize: 'var(--type-size-xs)',
            }}
          >
            <span
              style={{
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-content-secondary)',
              }}
            >
              จากแผนก:
            </span>
            <span
              style={{
                fontWeight: 'var(--type-weight-bold)',
                color: 'var(--text-brandPrimary-default)',
              }}
            >
              {fromDepartment}
            </span>
          </div>
        ) : null}

        <InternalReferFields
          department={department}
          servicePoint={servicePoint}
          note={note}
          onDepartmentChange={setDepartment}
          onServicePointChange={setServicePoint}
          onNoteChange={setNote}
          departmentOptions={departmentOptions}
          servicePointOptions={servicePointOptions}
        />

        {extra}
      </div>
    </Popup>
  );
}
