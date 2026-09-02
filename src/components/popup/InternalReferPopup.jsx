import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { VOICE_TEXTAREA_MIN_HEIGHT } from '@/components/forms/VoiceTextarea';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
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

/* หน่วยงานสนับสนุน — ไม่ใช่ปลายทางที่ "ส่งผู้ป่วยไปพบแพทย์" แต่เป็นที่ที่ผู้ป่วย
   ไปทำอย่างอื่นต่อ (รับยา เจาะเลือด ถ่ายภาพ จ่ายเงิน) ยังส่งต่อไปได้ แต่ไม่ใช่
   ตัวเลือกที่คนกำลังส่งต่อมองหาเป็นอันแรก */
const SUPPORT_UNIT_HINTS = [
  'เภสัช', 'ห้องปฏิบัติการ', 'ชันสูตร', 'รังสี', 'เวชระเบียน',
  'การเงิน', 'คลังยา', 'ธุรการ', 'บริหาร', 'สารสนเทศ', 'เทคโนโลยี',
];

const isSupportUnit = (label = '') =>
  SUPPORT_UNIT_HINTS.some((hint) => String(label).includes(hint));

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
  /* คลินิก/แผนกตรวจรักษาขึ้นก่อน หน่วยงานสนับสนุนไปท้ายรายการ (มติผู้ใช้
     28 ส.ค. 69) — เดิมเรียงตามลำดับของ catalog ทำให้เภสัชกรรมและห้องปฏิบัติการ
     แทรกอยู่กลางกลุ่มคลินิก คนที่กำลังส่งต่อผู้ป่วยไปพบแพทย์ต้องกวาดผ่านมันทุกครั้ง
     ใช้ sort ที่เสถียร ลำดับภายในแต่ละกลุ่มจึงยังเป็นลำดับเดิมของ catalog */
  return options
    .map((o, i) => ({ o, i, rank: isSupportUnit(o.label) ? 1 : 0 }))
    .sort((a, b) => (a.rank - b.rank) || (a.i - b.i))
    .map(({ o }) => o);
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
  /** ช่องเพิ่มเติมของผู้เรียก (เช่น ESI) — วางก่อน "หมายเหตุ" เพราะเป็นข้อมูล
      ของการส่งต่อ ส่วนหมายเหตุเป็นข้อความปิดท้าย (มติผู้ใช้ 28 ส.ค. 69) */
  extra,
}) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      <Select
        label='แผนกหรือคลินิกปลายทาง'
        value={department}
        onChange={(val) => {
          onDepartmentChange?.(val);
          onServicePointChange?.('');
        }}
        options={departmentOptions}
        placeholder={REFER_DEPARTMENT_PLACEHOLDER}
        required
      />
      {extra}
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

  /* ส่งต่อได้หลายแผนกในครั้งเดียว และแต่ละแผนกมีหมายเหตุของตัวเอง (มติผู้ใช้
     2 ก.ย. 69) — เคสหนึ่งรายมักต้องส่งหลายทางพร้อมกัน (เช่น กายภาพบำบัด +
     สังคมสงเคราะห์) เหตุผลที่ส่งไปแต่ละที่คนละเรื่องกัน เดิมต้องเปิดป๊อปอัปซ้ำ
     ทีละแผนกและหมายเหตุปนกัน */
  const [destinations, setDestinations] = useState([]);
  const [pendingDepartments, setPendingDepartments] = useState([]);
  const [servicePoint, setServicePoint] = useState('');

  useEffect(() => {
    if (!open) return;
    setDestinations([]);
    setPendingDepartments([]);
    setServicePoint('');
  }, [open]);

  const departmentOptions = listInternalReferDepartments(centerId);
  const chosen = new Set(destinations.map((d) => d.department));
  /* แผนกที่เลือกไปแล้วหายจากรายการ จะได้ไม่เลือกซ้ำแล้วได้หมายเหตุสองก้อน
     ของแผนกเดียวกัน */
  const availableOptions = departmentOptions.filter((o) => !chosen.has(o.value));

  const addDestination = (value) => {
    if (!value || chosen.has(value)) return;
    setDestinations((list) => [...list, { department: value, note: '' }]);
  };
  const updateNote = (value, note) => setDestinations((list) => list.map(
    (d) => (d.department === value ? { ...d, note } : d),
  ));
  const removeDestination = (value) => {
    setDestinations((list) => list.filter((d) => d.department !== value));
    setPendingDepartments((list) => list.filter((d) => d !== value));
  };

  const labelOf = (value) => departmentOptions.find((o) => o.value === value)?.label || value;

  /* ช่อง "จุดบริการปลายทาง" ถูกถอดออกแล้ว (มติผู้ใช้ 28 ส.ค. 69) — ถ้ายังนับเป็น
     เงื่อนไขอยู่ ปุ่มยืนยันจะ disabled ตลอดกาลทุกหน้าที่เรียกป๊อปอัปนี้
     ค่ายังส่งกลับไปเป็นค่าว่างตามเดิม ผู้เรียกที่อ่าน servicePoint จึงไม่พัง */
  const incomplete = destinations.length === 0;

  const handleConfirm = () => {
    if (incomplete) return;
    const { servicePointLabel } = resolveInternalReferLabels({
      departmentId: destinations[0].department,
      servicePointId: servicePoint,
      centerId,
    });
    const list = destinations.map((d) => ({
      departmentId: d.department,
      departmentLabel: labelOf(d.department),
      note: String(d.note || '').trim(),
    }));
    /* คีย์เดิม (departmentId/departmentLabel/note) ยังส่งกลับเป็นปลายทางแรก
       เสมอ หน้าที่อ่าน payload อยู่ก่อนหน้านี้จึงไม่ต้องแก้ ส่วนหน้าที่รองรับ
       หลายปลายทางให้อ่าน `destinations` */
    onConfirm?.({
      departmentId: list[0].departmentId,
      departmentLabel: list[0].departmentLabel,
      servicePointId: servicePoint,
      servicePointLabel,
      note: list[0].note,
      destinations: list,
    });
  };

  return (
    <Popup
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      /* ป๊อปอัปกว้างขึ้น (มติผู้ใช้ 2 ก.ย. 69) — มีได้หลายปลายทาง แต่ละอันมี
         ช่องหมายเหตุของตัวเอง ความกว้างเดิมทำให้อ่านเป็นแถบยาวแคบ */
      size='extraLarge'
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
            /* ขยายฟอนต์ให้อ่านง่าย (มติผู้ใช้ 28 ส.ค. 69) — บรรทัดนี้บอกว่ากำลังส่งต่อ
               มาจากไหน ซึ่งเป็นบริบทหลักของป๊อปอัป ไม่ควรเล็กกว่าช่องกรอกด้านล่าง */
            style={{
              gap: 'var(--dim-space-200, 8px)',
              fontSize: 'var(--type-size-base)',
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

        <Select
          label='แผนกหรือคลินิกปลายทาง'
          helperText='เลือกได้หลายแผนก แล้วกดยืนยันในรายการ'
          multiple
          multipleConfirmLabel='ยืนยันรายการที่เลือก'
          value={pendingDepartments}
          onChange={(values) => setPendingDepartments(values)}
          onConfirmSelection={(values) => { setDestinations(values.map((department) => ({ department, note: '' }))); setServicePoint(''); }}
          options={departmentOptions}
          placeholder={REFER_DEPARTMENT_PLACEHOLDER}
          required
        />

        {extra}

        {destinations.length > 0 ? (
          <Table
            columns={[
              {
                key: 'department',
                header: 'แผนก',
                render: (row) => (
                  <span style={{
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-base)',
                    fontWeight: 'var(--type-weight-medium)',
                    color: 'var(--text-content-default, #363B3F)',
                  }}>
                    {labelOf(row.department)}
                  </span>
                ),
              },
              {
                key: 'note',
                header: 'บันทึก',
                flex: 1,
                render: (row) => (
                  <SuggestibleTextarea
                    voice
                    label={`หมายเหตุถึง${labelOf(row.department)}`}
                    value={row.note}
                    onChange={(val) => updateNote(
                      row.department,
                      typeof val === 'string' ? val : val?.target?.value || '',
                    )}
                    placeholder='เช่น อาการคงที่ พร้อมส่งต่อ · แจ้งประวัติแพ้ยา · เอกสารที่ต้องแนบ'
                    showHelperText={false}
                    suggestions={INTERNAL_REFER_NOTE_HINTS}
                    minChars={3}
                    height={VOICE_TEXTAREA_MIN_HEIGHT}
                    minHeight={VOICE_TEXTAREA_MIN_HEIGHT}
                  />
                ),
              },
              {
                key: 'actions',
                header: 'จัดการ',
                render: (row) => (
                  <NeutralSubdueIconButton
                    icon='delete'
                    variant='outline'
                    size='sm'
                    aria-label={`ลบปลายทาง ${labelOf(row.department)}`}
                    onClick={() => removeDestination(row.department)}
                  />
                ),
              },
            ]}
            rows={destinations}
            rowKey={(row) => row.department}
          />
        ) : null}
      </div>
    </Popup>
  );
}
