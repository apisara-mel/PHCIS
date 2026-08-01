import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DatePicker from '@/components/forms/DatePicker';
import { Field } from '@/components/forms/Fields';
import { formatThaiBuddhistDate } from '@/data/registrationForm';
import {
  addFacilityHoliday,
  getFacilityHolidays,
  removeFacilityHoliday,
  subscribeApptSettings,
} from '../appointment/appointmentSettingsStore';
import { formatApptListDate, isoKey } from '../appointment/appointmentShared';

/* ตั้งค่าวันหยุดสถานพยาบาล — shared store with appointment holidays. */

const LIST_TEXT = {
  margin: 0,
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const FacilityHolidayPopup = ({ open, onClose }) => {
  const [tick, setTick] = useState(0);
  const [holidayDate, setHolidayDate] = useState(null);
  const [holidayName, setHolidayName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => subscribeApptSettings(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!open) return;
    setHolidayDate(null);
    setHolidayName('');
    setDeleteTarget(null);
  }, [open]);

  const facility = getFacilityHolidays();
  void tick;

  const handleAdd = () => {
    if (!holidayDate) return;
    addFacilityHoliday(
      isoKey(holidayDate),
      holidayName.trim() || 'วันหยุดสถานพยาบาล',
    );
    setHolidayDate(null);
    setHolidayName('');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget?.date) return;
    removeFacilityHoliday(deleteTarget.date);
    setDeleteTarget(null);
  };

  return (
    <>
      <Popup
        open={open}
        onClose={onClose}
        title='ตั้งค่าวันหยุดสถานพยาบาล'
        subtitle='กำหนดวันหยุดของสถานพยาบาล — ระบบจะปิดการจัดตารางเวรในวันดังกล่าว'
        size='large'
        tertiaryAction={{ label: 'ปิด', onClick: onClose }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-600)' }}>
          <div
            className='flex w-full items-start'
            style={{ gap: 'var(--dim-space-400)' }}
          >
            <div style={{ flex: '1 1 0', minWidth: 0, width: 0 }}>
              <Field label='วันที่' required>
                <DatePicker
                  size='large'
                  value={holidayDate}
                  format={formatThaiBuddhistDate}
                  onChange={setHolidayDate}
                  placeholder='เลือกวันที่'
                  showLabel={false}
                  showHelperText={false}
                  className='w-full'
                  style={{ width: '100%' }}
                />
              </Field>
            </div>
            <div style={{ flex: '1 1 0', minWidth: 0, width: 0 }}>
              <Field label='ชื่อวันหยุด'>
                <input
                  value={holidayName}
                  onChange={(e) => setHolidayName(e.target.value)}
                  placeholder='เช่น วันหยุดชดเชย'
                  className='w-full'
                  style={{
                    width: '100%',
                    height: 'var(--dim-size-800)',
                    boxSizing: 'border-box',
                    padding: '0 var(--dim-space-400)',
                    borderRadius: 'var(--dim-radius-200)',
                    border: 'var(--dim-stroke-100) solid var(--border-input-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm)',
                    color: 'var(--text-neutral-default)',
                    background: 'var(--surface-input-default)',
                  }}
                />
              </Field>
            </div>
          </div>

          <div>
            <BrandButton
              size='lg'
              leadingIcon='add'
              onClick={handleAdd}
              disabled={!holidayDate}
            >
              เพิ่มวันหยุด
            </BrandButton>
          </div>

          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
            <span
              style={{
                ...LIST_TEXT,
                fontWeight: 'var(--type-weight-medium)',
                color: 'var(--text-topic-tertiary-title)',
              }}
            >
              รายการวันหยุด ({facility.length})
            </span>
            {facility.length === 0 ? (
              <p style={{ ...LIST_TEXT, color: 'var(--text-content-secondary)' }}>
                ยังไม่มีวันหยุดสถานพยาบาล
              </p>
            ) : (
              <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200)' }}>
                {facility.map((h) => (
                  <li
                    key={h.date}
                    className='flex items-center justify-between'
                    style={{
                      gap: 'var(--dim-space-300)',
                      padding: 'var(--dim-space-300)',
                      borderRadius: 'var(--dim-radius-300)',
                      background: 'var(--surface-brandPrimary-quaternary)',
                      border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
                    }}
                  >
                    <span style={LIST_TEXT}>
                      {formatApptListDate(h.date)} · {h.name}
                    </span>
                    <NeutralSubdueButton
                      size='sm'
                      variant='outline'
                      onClick={() => setDeleteTarget(h)}
                    >
                      ลบ
                    </NeutralSubdueButton>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Popup>

      <AlertDialog
        open={!!deleteTarget}
        type='destructive'
        title='ลบวันหยุดสถานพยาบาล?'
        description={
          deleteTarget
            ? `ต้องการลบ “${deleteTarget.name}” วันที่ ${formatApptListDate(deleteTarget.date)} ออกจากรายการหรือไม่`
            : ''
        }
        cancelLabel='ยกเลิก'
        confirmLabel='ลบวันหยุด'
        onClose={() => setDeleteTarget(null)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default FacilityHolidayPopup;
