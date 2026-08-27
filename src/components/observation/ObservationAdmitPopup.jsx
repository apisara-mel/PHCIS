import React, { useEffect, useState } from 'react';
import Popup from '@/components/popup/Popup';
import SecondarySearch from '@/components/search/SecondarySearch';
import { DropdownPanel, SuggestionRow } from '@/components/search/PrimarySearch';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Select from '@/components/forms/Select';
import Icon from '@/components/icons/Icon';
import { FieldShell } from '@/components/forms/_inputBox';
import { resolveBedImage } from '@/components/observation/BedInfoTooltip';
import {
  isBedAvailable,
  BED_CLEANING_STATUS,
  MOCK_OBSERVATION_PATIENTS,
  OBSERVATION_BED_STATUS,
} from '@/data/observationMock';
import { getPatientByHN, PATIENT_PROFILES } from '@/data/patientProfiles';
import { staffAvatarForName } from '@/data/avatarAssets';
import { USERS } from '@/data/usersAccess';
import { withDoctorAvatars } from '@/pages/appointment/appointmentDoctorRoster';
import { getCurrentUser } from '@/pages/users/usersShared';

/* MIH ObservationAdmitPopup — "ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ"
   ยกออกมาจาก ObservationQueuePage เพื่อให้หน้าคัดกรอง OPD เรียกใช้ป๊อปอัป
   ตัวเดียวกันได้เมื่อกดคำสั่ง "ส่งเข้าห้องสังเกตการณ์" (มติผู้ใช้ 27 ส.ค. 69)
   คอมโพเนนต์ถือ state ของฟอร์มเอง แล้วคืนค่าทั้งก้อนผ่าน `onSubmit(form)`
   ผู้เรียกเป็นคนตัดสินว่าจะเขียนลงเตียงอย่างไร

   props
     • open · onClose · onSubmit(form)
     • beds        — รายการเตียง (ค่าเริ่มต้น = MOCK_OBSERVATION_PATIENTS)
     • patientHn   — เติมผู้ป่วยล่วงหน้า (หน้าคัดกรองรู้อยู่แล้วว่าเป็นใคร)
     • chiefComplaint — อาการสำคัญแรกรับที่กรอกไว้แล้วจากขั้นตอนก่อนหน้า
     • chiefComplaintSuggestions — ส่งเข้ามาแทนการ import ข้ามหน้า (กัน cycle) */

/* ทุกแถวในดรอปดาวน์ "แพทย์ผู้สั่ง" ต้องมีรูป (มติผู้ใช้ 27 ส.ค. 69) —
   USERS มี avatarUrl ไม่ครบ จึงเติมจากทะเบียนแพทย์ด้วย withDoctorAvatars
   ซึ่งจับคู่ด้วยชื่อ ชุดเดียวกับชิปตัวกรอง "แพทย์:" ทุกหน้าในระบบ */
/* `withDoctorAvatars` จับคู่รูปจากทะเบียนแพทย์ด้วยชื่อ ซึ่งครอบคลุมแค่หมอที่อยู่ใน
   ทะเบียนนัดหมาย ที่เหลือจึงเป็นแถวเปล่า — เติมรูปจากกองรูปเจ้าหน้าที่ด้วยการแฮช
   ชื่อ (ชื่อเดิมได้รูปเดิมเสมอ) ให้ทุกแถวมีรูปครบ (มติผู้ใช้ 28 ส.ค. 69) */
const DOCTOR_OPTIONS = withDoctorAvatars(
  USERS
    .filter((u) => u.role === 'doctor')
    .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl || undefined })),
).map((opt) => (opt.image
  ? opt
  : { ...opt, image: staffAvatarForName(opt.label || opt.value), imageVariant: 'avatar' }));
const NURSE_OPTIONS = USERS
  .filter((u) => u.role === 'nurse')
  .map((u) => ({ value: u.name, label: u.name, image: u.avatarUrl }));

const CURRENT_NURSE = (() => {
  const me = getCurrentUser();
  if (me?.name) return { name: me.name, avatarUrl: me.avatarUrl || '' };
  const fallback = NURSE_OPTIONS[0];
  return { name: fallback?.value || 'พว. สุภาพร ชัยมงคล', avatarUrl: fallback?.image || '' };
})();

const FIELD_LABEL_STYLE = {
  margin: 0,
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

const blankForm = () => ({
  bedId: '',
  patientName: '',
  hn: '',
  vn: '',
  age: '',
  gender: 'ชาย',
  chiefComplaint: '',
  diagnosis: '',
  doctorName: DOCTOR_OPTIONS[0]?.value || '',
  nurseName: CURRENT_NURSE.name,
  nurseAvatar: CURRENT_NURSE.avatarUrl,
  avatar: '',
});

const ObservationAdmitPopup = ({
  open,
  onClose,
  onSubmit,
  beds = MOCK_OBSERVATION_PATIENTS,
  /** เตียงเป้าหมายที่ผู้เรียกเล็งไว้ (กดจากการ์ดเตียงใบใดใบหนึ่ง) */
  initialBedId = '',
  patientHn = '',
  chiefComplaint = '',
  chiefComplaintSuggestions = [],
}) => {
  const [form, setForm] = useState(blankForm);
  const [searchQuery, setSearchQuery] = useState('');

  const pickPatient = (hn) => {
    const p = getPatientByHN(hn);
    if (!p) return;
    /* age เก็บเป็นข้อความยาว "42 ปี - 3 เดือน - 8 วัน" ในโปรไฟล์กลาง —
       ฟอร์มนี้ใช้แค่จำนวนปี */
    setForm((prev) => ({
      ...prev,
      hn: p.hn,
      patientName: p.fullName || p.shortName || '',
      age: String(parseInt(p.age, 10) || ''),
      gender: p.sex || prev.gender,
      avatar: p.avatarUrl || '',
    }));
    setSearchQuery('');
  };

  /* เปิดป๊อปอัปครั้งใหม่ = เริ่มฟอร์มใหม่เสมอ พร้อมเติมผู้ป่วย/อาการที่ผู้เรียก
     รู้อยู่แล้ว และเลือกเตียงว่างเตียงแรกให้ (id ตายตัวจะค้างเมื่อเตียงถูกครอง) */
  useEffect(() => {
    if (!open) return;
    const targeted = beds.find((b) => b.id === initialBedId && isBedAvailable(b))?.id;
    const firstFree = targeted || beds.find(isBedAvailable)?.id || '';
    setForm({ ...blankForm(), bedId: firstFree, chiefComplaint });
    setSearchQuery('');
    if (patientHn) pickPatient(patientHn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patientHn, chiefComplaint, initialBedId]);

  const searchSuggestions = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return PATIENT_PROFILES
      .filter((p) => p.fullName.toLowerCase().includes(q) || p.hn.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({
        id: p.hn,
        label: p.fullName,
        sublabel: `HN: ${p.hn} • ${p.sex}, ${p.age}`,
        value: p.hn,
        avatarSrc: p.avatarUrl,
      }));
  })();

  /* ผู้เรียกส่ง HN มาแล้ว (หน้าคัดกรอง) → ล็อกผู้ป่วยไว้ ไม่ต้องมีช่องค้นหา */
  const patientLocked = !!patientHn;

  const canSubmit = Boolean(
    form.hn
    && form.bedId
    && String(form.chiefComplaint || '').trim()
    && form.doctorName
    && form.nurseName,
  ) && isBedAvailable(beds.find((p) => p.id === form.bedId));

  const selectedBed = beds.find((p) => p.id === form.bedId);
  const isSelectedBedFree = isBedAvailable(selectedBed);
  /* แสดงครบทุกเตียงพร้อมสถานะ (มติผู้ใช้ 28 ส.ค. 69) — เดิมกรองเหลือเฉพาะเตียงว่าง
     พยาบาลจึงไม่เห็นว่าเตียงที่เหลืออยู่ในสถานะอะไร และไม่รู้ว่าทั้งวอร์ดมีกี่เตียง
     เตียงว่างเรียงขึ้นก่อน ที่เลือกไม่ได้ยังกดได้แต่ปุ่มยืนยันจะถูกปิดพร้อมข้อความบอกเหตุ */
  /* `OBSERVATION_BED_STATUS.badgeStyle` เป็นชื่อเชิงความหมาย (info/warning/…)
     ส่วน <ColorfulBadge> รับชื่อสี — แปลงก่อน ไม่งั้นแถวในดรอปดาวน์เรนเดอร์ป้ายไม่ออก */
  const BED_BADGE_TONE = { info: 'blue', neutral: 'grey', warning: 'orange', success: 'teal' };
  const bedStatusMeta = (b) => {
    const meta = OBSERVATION_BED_STATUS[b?.status] || { label: b?.status || '—', badgeStyle: 'neutral' };
    return { label: meta.label, tone: BED_BADGE_TONE[meta.badgeStyle] || 'grey' };
  };
  const bedOptions = [...beds].sort((a, b) => {
    const free = Number(isBedAvailable(b)) - Number(isBedAvailable(a));
    if (free) return free;
    return String(a.bedNo).localeCompare(String(b.bedNo), 'th', { numeric: true });
  });

  return (
<Popup
    open={open}
    onClose={onClose}
    title='ลงทะเบียนรับผู้ป่วยเข้าเตียงสังเกตอาการ'
    size='large'
    secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
    primaryAction={{
      label: 'ยืนยันครองเตียงสังเกตอาการ',
      onClick: (e) => { e?.preventDefault?.(); onSubmit?.(form); },
      /* ทุกช่องที่ติดดาวต้องครบก่อน ไม่ใช่แค่ผู้ป่วยกับเตียง — ปุ่มที่กดได้ทั้งที่
         อาการสำคัญยังว่างจะบันทึกเวชระเบียนที่ไม่มีเหตุรับเข้า (มติผู้ใช้ 28 ส.ค. 69) */
      disabled: !canSubmit,
    }}
  >
    <div className='flex flex-col text-xs text-ink-secondary' style={{ gap: 'var(--dim-space-600, 24px)' }}>
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <p style={FIELD_LABEL_STYLE}>
          ผู้ป่วย
        </p>
        {/* เปิดจากหน้าคัดกรอง = รู้อยู่แล้วว่าเป็นใคร จึงไม่ต้องมีช่องค้นหา
            เหลือแค่การ์ดยืนยันตัวผู้ป่วยด้านล่าง (มติผู้ใช้ 27 ส.ค. 69) */}
        {!patientLocked && (
          <div className='relative w-full'>
            <SecondarySearch
              fullWidth
              value={searchQuery}
              onChange={(val) => setSearchQuery(val ?? '')}
              onSubmit={(value) => {
                const hit = searchSuggestions.find(
                  (s) => s.value === value || s.label === value,
                ) ?? searchSuggestions[0];
                if (hit) pickPatient(hit.value);
                else if (value) pickPatient(value);
              }}
              placeholder='ค้นหา HN / ชื่อ-สกุล'
              className='w-full'
              style={{ width: '100%', maxWidth: 'none' }}
            />
            {searchQuery.trim() && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + var(--dim-space-100, 4px))',
                  left: 0,
                  right: 0,
                  zIndex: 1200,
                }}
              >
                <DropdownPanel>
                  {searchSuggestions.length > 0 ? (
                    searchSuggestions.map((item) => (
                      <SuggestionRow
                        key={item.id}
                        item={item}
                        query={searchQuery.trim()}
                        onPick={(picked) => pickPatient(picked.value ?? picked.label)}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        padding: 'var(--dim-space-300, 12px)',
                        color: 'var(--text-content-tertiary)',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm, 14px)',
                        lineHeight: 1.5,
                      }}
                    >
                      ไม่พบผู้ป่วยที่ค้นหา
                    </div>
                  )}
                </DropdownPanel>
              </div>
            )}
          </div>
        )}
        {form.hn && (
          <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
            <PatientSummaryCard
              avatarUrl={form.avatar}
              avatarAlt={form.patientName}
              cells={[
                { label: 'ชื่อ-นามสกุล ผู้ป่วย', value: form.patientName },
                { label: 'HN (Hospital Number)', value: form.hn },
                { label: 'เตียง', value: selectedBed?.bedNo || '-' },
              ]}
            />
          </div>
        )}
      </div>

      {/* VN/ชื่อ-นามสกุล/HN/อายุ/เพศ are no longer separate editable
          fields — "ผู้ป่วย" search above fills them straight into
          admitForm (see pickPatient) and the
          PatientSummaryCard confirms what was picked. Only the bed
          itself still needs a choice here — opens the same photo-
          tile BedSelectionPopup as OPD screening instead of a
          plain text dropdown. */}
      <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
        <p style={FIELD_LABEL_STYLE}>
          เลือกเตียงสังเกตอาการ
        </p>
        {/* dropdown ตัวมาตรฐาน (มติผู้ใช้ 27 ส.ค. 69) — เดิมเป็นปุ่มที่เปิด
            แผงเลือกเตียงซ้อนอีกชั้น ทั้งที่รายการเตียงว่างสั้นพอจะเลือกจบใน
            dropdown เดียว รูปเตียงยังอยู่ในแถวตัวเลือกผ่าน option.image */}
        <Select
          value={form.bedId}
          onChange={(val) => setForm((prev) => ({ ...prev, bedId: val }))}
          options={bedOptions.map((b) => {
            const meta = bedStatusMeta(b);
            return {
              value: b.id,
              label: b.bedType ? `${b.bedNo} · ${b.bedType}` : b.bedNo,
              subtext: meta.label,
              badge: { style: meta.tone, label: meta.label },
              image: resolveBedImage(b),
            };
          })}
          placeholder='เลือกเตียง'
        />
        {!isSelectedBedFree && (
          <p style={{ marginTop: 'var(--dim-space-150)', color: 'var(--text-danger-default)', fontSize: 'var(--type-size-xs)' }}>
            {selectedBed?.status === BED_CLEANING_STATUS
              ? 'เตียงนี้รอทำความสะอาด — ต้องกด “ทำความสะอาดเสร็จ” ก่อนจึงจะรับผู้ป่วยเข้าเตียงได้'
              : 'เตียงนี้มีผู้ป่วยครองอยู่แล้ว — กรุณาเลือกเตียงว่าง'}
          </p>
        )}
      </div>

      {/* Same suggestion popover as OPD screening's "อาการ (Chief
          Complaint)" field — reuses its suggestion list, appears
          after 3 characters. */}
      <SuggestibleTextarea
        voice
        label='อาการสำคัญแรกรับ (Chief Complaint)'
        rows={2}
        placeholder='เช่น แน่นหน้าอก เวียนศีรษะ ปวดท้องรุนแรง มีไข้สูง'
        value={form.chiefComplaint}
        onChange={(e) => setForm((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
        suggestions={chiefComplaintSuggestions}
        minChars={3}
        popoverAriaLabel='คำแนะนำอาการสำคัญ'
        required
      />

      <div className='grid grid-cols-2' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <Select
          label='แพทย์ผู้สั่ง'
          value={form.doctorName}
          onChange={(val) => setForm((prev) => ({ ...prev, doctorName: val }))}
          options={DOCTOR_OPTIONS}
          required
        />
        {/* พยาบาลรับผู้ป่วย — locked to the signed-in user (filled field + avatar). */}
        <FieldShell label='พยาบาลรับผู้ป่วย' required>
          <div
            className='inline-flex items-center w-full'
            aria-readonly='true'
            style={{
              height: 'var(--dim-size-800, 48px)',
              gap: 'var(--dim-space-200, 8px)',
              paddingLeft: 'var(--dim-space-400, 16px)',
              paddingRight: 'var(--dim-space-400, 16px)',
              paddingTop: 'var(--dim-space-200, 8px)',
              paddingBottom: 'var(--dim-space-200, 8px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              /* ช่องนี้แก้ไม่ได้ (ล็อกกับผู้ใช้ที่ล็อกอินอยู่) จึงใช้พื้นแบบ disabled
                 แต่ตัวหนังสือยังใช้สี filled ให้อ่านออก — D-017 */
              border: 'var(--dim-stroke-100, 1px) solid var(--border-input-disabled)',
              background: 'var(--surface-disabled-tertiary)',
              boxSizing: 'border-box',
            }}
          >
            {form.nurseAvatar ? (
              <img
                src={form.nurseAvatar}
                alt=''
                /* 32px เท่ารูปใน <Select> ฝั่งซ้าย (--dim-size-600) — จับคู่ที่
                   ขนาดของ design system แทนการย่อ Select ซึ่งจะไปเปลี่ยนทุก
                   dropdown ที่มีรูปทั้งระบบ */
                style={{
                  width: 'var(--dim-size-600, 32px)',
                  height: 'var(--dim-size-600, 32px)',
                  borderRadius: 'var(--dim-radius-full, 9999px)',
                  objectFit: 'cover',
                  flexShrink: 0,
                }}
              />
            ) : (
              <Icon
                name='person'
                size={32}
                style={{ color: 'var(--icon-input-filled)', flexShrink: 0 }}
              />
            )}
            <span
              style={{
                color: 'var(--text-input-filled)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm, 14px)',
                fontWeight: 'var(--type-weight-regular)',
                lineHeight: 1.5,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {form.nurseName}
            </span>
          </div>
        </FieldShell>
      </div>
    </div>
  </Popup>
  );
};

export default ObservationAdmitPopup;
