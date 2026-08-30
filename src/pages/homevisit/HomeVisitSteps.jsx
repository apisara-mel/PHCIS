import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import TimePicker from '@/components/forms/TimePicker';
import SelectableTag from '@/components/forms/SelectableTag';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import PhotoUploadField from '@/components/forms/PhotoUploadField';
import AddressMapBlock from '@/components/forms/AddressMapBlock';
import CarriedDentalPanel from '@/components/dental/CarriedDentalPanel';
import {
  PersonalProfileFields,
  DtxFields,
  HealthRiskFields,
} from '@/components/homevisit/homeScreeningSections';
import { PATIENT_GROUP_OPTIONS, MOBILITY_OPTIONS } from '@/data/registrationForm';
import { Step2Address as RegistrationAddressStep } from '@/components/forms/RegistrationSteps';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import VitalReadingCard from '@/components/card/VitalReadingCard';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import {
  HOMEVISIT_TIME_SLOTS,
  HOMEVISIT_CENTER,
  HOMEVISIT_CENTER_LOCATION,
  HOMEVISIT_DEVICE,
  VITAL_FIELDS,
  BARTHEL_ITEMS,
  BARTHEL_MAX_SCORE,
  HOME_ENVIRONMENT_ITEMS,
  CAREGIVER_OPTIONS,
  SCREEN_2Q_QUESTIONS,
  PAIN_SCALE,
  NUTRITION_OPTIONS,
  PRESSURE_SORE_OPTIONS,
  ROLE_NOTE_SECTIONS,
  CARE_ACTIVITIES,
  FAMILY_RELATIONS,
  HOUSE_TYPE_OPTIONS,
  HOUSE_OWNERSHIP_OPTIONS,
  WATER_SOURCE_OPTIONS,
  TOILET_OPTIONS,
  HOMEVISIT_ILLNESS_SUGGESTIONS,
  HOMEVISIT_ASSESSMENT_SUGGESTIONS,
  HOMEVISIT_PLAN_SUGGESTIONS,
  HOMEVISIT_FAMILY_SUGGESTIONS,
  ARRIVAL_DISTANCE_THRESHOLD_M,
  distanceMeters,
  formatDistance,
  formatHomeVisitDate,
  todayIsoDate,
  nowHHMM,
  readDeviceVitals,
  getDeviceConnected,
  setDeviceConnected,
  evaluateVital,
  summarizeVitals,
  calcBmi,
  scoreBarthel,
  countBarthelAnswered,
  isBarthelComplete,
  interpretBarthel,
  getArrivalCheckIn,
  saveArrivalCheckIn,
  getVisitSubmission,
  saveVisitSubmission,
  saveHomeVisitDraft,
  summarizeOrders,
  getHomeVisitAccess,
  resolveGroup,
  resolveSource,
  HOMEVISIT_SOURCES,
} from '@/data/homevisitVisits';
import {
  MNA_ITEMS,
  MNA_MAX_SCORE,
  mnaBmiScore,
  scoreMna,
  countMnaAnswered,
  isMnaComplete,
  interpretMna,
  SCREEN_9Q_QUESTIONS,
  SCREEN_9Q_FREQUENCY,
  SCREEN_9Q_MAX_SCORE,
  score9q,
  count9qAnswered,
  is9qComplete,
  has9qSuicidalRisk,
  interpret9q,
  PPS_LEVELS,
  interpretPps,
  summarizeStandardTools,
} from '@/data/homevisitAssessments';
import {
  sendNhsoClaim,
  getNhsoClaim,
  NHSO_REQUIRED_FIELDS,
} from '@/data/homevisitHhc';
import {
  HOMEVISIT_ORDER_GROUPS,
  HOMEVISIT_ORDER_NOTE_SUGGESTIONS,
  collectHomeVisitOrderItems,
  countHomeVisitOrders,
  homeVisitOrderLabel,
  sendOrdersToCpoe,
  getCpoeHandoff,
} from '@/data/homevisitCpoe';
import { getVisitHistory, appendVisitHistory } from '@/data/homevisitRegistry';
import { printHomeVisitSummary } from '@/pages/homevisit/homevisitPrint';
import {
  TopicHeader,
  Field,
  StepCard,
  StepSection,
  NoticeBand,
  EmptyHint,
  AuditStamp,
} from '@/pages/homevisit/homevisitShared';

/* HomeVisitSteps — เนื้อหา 7 ขั้นตอนของ "บันทึกประเมินการเยี่ยมบ้าน"
   (TOR 1.10.12.2 + 1.10.12.3 + §1.18.3–1.18.10) ที่เสียบเข้า
   `TreatmentFormShell` ผ่าน `HomeVisitRecordPage` — โครงเดียวกับ
   AncSteps / AddictionSteps ทุกประการ.

     1 ข้อมูลทั่วไปและการเดินทาง  — GPS (1.18.8) + เวลาถึงบ้าน (1.18.9)
     2 ประวัติ                     — ประวัติเจ็บป่วย + ย้อนหลังตามสิทธิ (1.18.3)
     3 สัญญาณชีพ                   — บันทึกเอง + อ่านจากอุปกรณ์ (1.18.4)
     4 ประเมิน/คัดกรอง/ADL         — ดัชนีบาร์เธล ป้อนหน้าติดตาม (1.10.12.4)
     5 บันทึกตามบทบาท + กิจกรรม    — EMR รายวิชาชีพ (1.18.5) · กิจกรรม (1.18.7)
                                     · ปรึกษาแพทย์ทางไกล (1.18.10)
     6 สั่งการรักษา                — CPOE (1.18.6)
     7 Family Folder + ส่งศูนย์ฯ   — (1.10.12.3) + ลิงก์โมดูลงานชุมชน + พิมพ์ */

/* ── Step 1 — ข้อมูลทั่วไปและการเดินทาง ───────────────────────────── */

/* ── Step 1 — ข้อมูลทั่วไป ─────────────────────────────────────────
   ข้อมูลของการเยี่ยมครั้งนี้ล้วน ๆ · ที่อยู่/แผนที่/บันทึกการเดินทางย้ายไปขั้นที่ 2
   (มติผู้ใช้ 30 ส.ค. 69) */
export const HomeVisitStep1Service = ({ form, setForm, readOnly, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection>
        <TopicHeader icon='event'>ข้อมูลการให้บริการ</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {/* ถอด "วันที่ให้บริการ" กับ "เวลาออกเดินทางจากศูนย์บริการฯ" ออก
              (มติผู้ใช้ 30 ส.ค. 69) — วันที่ยังถูกบันทึกเป็นวันนี้อัตโนมัติ
              (`serviceDate` ตั้งค่าเริ่มต้นใน `buildEmptyHomeVisitForm`) และ
              เวลาที่ใช้จริงคือ "เวลาถึงบ้าน" ที่ปั๊มจาก GPS ตาม TOR 1.18.9
              ไม่ใช่เวลาที่ออกจากศูนย์ */}
          {/* ๖ กลุ่มผู้รับบริการ (TOR ๑.๑๐.๑๒.๑) กับที่มาของเคส — ย้ายมาจาก
              เวชระเบียนเยี่ยมบ้านให้กรอกที่บันทึกการเยี่ยมโดยตรง ไม่ต้องสลับหน้า */}
          <Field label='ประเภทผู้รับบริการ 6 กลุ่ม'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.patientGroup} onChange={set('patientGroup')} disabled={readOnly}
              options={PATIENT_GROUP_OPTIONS.map((g) => ({ value: g.key, label: g.label }))}
              placeholder='เลือกกลุ่มผู้รับบริการ'
            />
          </Field>
          <Field label='ที่มาของเคส (ประเภทรับ–ส่งต่อ)'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.homevisitSource} onChange={set('homevisitSource')} disabled={readOnly}
              options={HOMEVISIT_SOURCES.map((o) => ({ value: o.value, label: o.label }))}
              placeholder='เลือกที่มาของเคส'
            />
          </Field>
          {/* สภาพการเคลื่อนไหว — ช่องสุดท้ายของเวชระเบียนเยี่ยมบ้านที่ย้ายมาอยู่ที่นี่
              บันทึกการเยี่ยมจึงเป็นเจ้าของข้อมูลชุดนี้ครบทั้งสามช่อง */}
          <Field label='สภาพการเคลื่อนไหว'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.mobility} onChange={set('mobility')} disabled={readOnly}
              options={MOBILITY_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
              placeholder='เลือกสภาพการเคลื่อนไหว'
            />
          </Field>
          {form.mobility === 'other' && (
            <Field label='ระบุสภาพการเคลื่อนไหว'>
              <InputField
                showLabel={false} showHelperText={false}
                value={form.mobilityOther || ''}
                onChange={set('mobilityOther')}
                disabled={readOnly}
                placeholder='เช่น ใช้ walker · ต้องมีผู้พยุง'
              />
            </Field>
          )}
          <Field label='ประเภทการเยี่ยม'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.visitType} onChange={set('visitType')} disabled={readOnly}
              options={[
                { value: 'first', label: 'เยี่ยมครั้งแรก (แรกรับ)' },
                { value: 'followup', label: 'เยี่ยมติดตาม' },
                { value: 'urgent', label: 'เยี่ยมกรณีเร่งด่วน' },
              ]}
              placeholder='เลือกประเภทการเยี่ยม'
            />
          </Field>
        </div>

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {/* ถอดแถบ "ทีมผู้ออกเยี่ยม (เลือกได้หลายคน)" ออก (มติผู้ใช้ 30 ส.ค. 69)
              — ToR §๑.๑๐.๑๒ ไม่ได้ขอช่องนี้ และฟอร์มกระดาษของทีมเยี่ยมบ้านก็ไม่มี
              `form.team` ยังอยู่ในบันทึก โดยตั้งค่าเป็นผู้รับผิดชอบของนัด (หรือ
              ผู้ใช้ที่ล็อกอิน) ให้เอง — §๑.๑๘.๕ ยังต้องรู้ว่าวิชาชีพไหนเป็นผู้บันทึก */}
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', minWidth: 260 }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
              รูปถ่ายระหว่างการเยี่ยม
            </span>
            <PhotoUploadField
              label={form.photos.length ? `เพิ่มรูป (มีแล้ว ${form.photos.length} รูป)` : 'ถ่าย/อัปโหลดรูป'}
              icon='photo_camera'
              capture='environment'
              multiple
              disabled={readOnly}
              /* เก็บ previewUrl ไว้ด้วย ไม่ใช่เก็บแค่ชื่อไฟล์ (มติผู้ใช้ 30 ส.ค. 69)
                 — อัปแล้วต้องเห็นรูป ไม่ใช่เห็นแต่ชื่อไฟล์ซึ่งบอกไม่ได้ว่าถ่ายอะไรมา
                 รูปเก่าที่บันทึกไว้เป็นสตริงยังอ่านได้ (แสดงเป็นชื่อไฟล์เหมือนเดิม) */
              /* อ่านเป็น data URL ไม่ใช่ blob URL (มติผู้ใช้ 30 ส.ค. 69) — blob URL
                 ใช้ได้เฉพาะในหน้าที่เปิดอยู่ พอบันทึกร่างลง sessionStorage แล้ว
                 กลับมาเปิดใหม่ ลิงก์จะตายและเหลือแค่ชื่อไฟล์เหมือนเดิม */
              onFiles={(files) => Array.from(files).forEach((file, i) => {
                const entryId = `hv-photo-${Date.now()}-${i}`;
                const push = (previewUrl) => setForm((f) => ({
                  ...f,
                  photos: [...f.photos, { id: entryId, name: file.name, previewUrl }],
                }));
                if (typeof FileReader === 'undefined') {
                  push('');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => push(String(reader.result || ''));
                reader.onerror = () => push('');
                reader.readAsDataURL(file);
              })}
            />
            {form.photos.length > 0 && (
              <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {form.photos.map((photo, i) => {
                  const entry = typeof photo === 'string' ? { name: photo, previewUrl: '' } : photo;
                  const key = entry.id || `${entry.name}-${i}`;
                  return entry.previewUrl ? (
                    <div
                      key={key}
                      className='relative'
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 'var(--dim-radius-300, 8px)',
                        overflow: 'hidden',
                        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E5E7EB)',
                        background: 'var(--surface-neutral-quaternary, #F3F4F6)',
                      }}
                    >
                      <img
                        src={entry.previewUrl}
                        alt={entry.name}
                        title={entry.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {!readOnly && (
                        <div className='absolute' style={{ top: 2, right: 2 }}>
                          <BrandIconButton
                            icon='close'
                            variant='fill'
                            size='sm'
                            aria-label={`ลบรูป ${entry.name}`}
                            onClick={() => setForm((f) => ({
                              ...f,
                              photos: f.photos.filter((_, idx) => idx !== i),
                            }))}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <ColorfulBadge key={key} style='grey' size='small' hierarchy='secondary' width='hug' maxWidth={220}>
                      {entry.name}
                    </ColorfulBadge>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </StepSection>
    </StepCard>
  );
};

/* ── Step 2 — ที่อยู่และการเดินทาง ────────────────────────────────
   หน้าตาเหมือนขั้น "ที่อยู่" ของหน้าเวชระเบียนทุกอย่าง (ใช้คอมโพเนนต์ตัวเดียวกัน)
   ต่างแค่ต่อท้ายด้วยตำแหน่งบ้าน/เวลาถึงบ้าน และบันทึกการเดินทาง
   (มติผู้ใช้ 30 ส.ค. 69) */
export const HomeVisitStep2Address = ({
  form, setForm, readOnly, visitId, appointment, registryEntry, onDataChanged, blockedMsg,
}) => {
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [confirmArrival, setConfirmArrival] = useState(null); /* {reason:'far'|'restamp'} */
  const [restampNote, setRestampNote] = useState('');
  const [restampError, setRestampError] = useState('');

  const home = registryEntry?.home || appointment?.home || null;
  const checkIn = visitId ? getArrivalCheckIn(visitId) : null;

  const distance = useMemo(
    () => (form.currentLocation && home ? distanceMeters(form.currentLocation, home) : null),
    [form.currentLocation, home],
  );
  const tooFar = distance !== null && distance > ARRIVAL_DISTANCE_THRESHOLD_M;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const captureLocation = () => {
    setGeoError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setForm((f) => ({ ...f, geolocationDenied: true }));
      setGeoError('อุปกรณ์นี้ไม่รองรับการอ่านพิกัด (Geolocation) — ให้ปักหมุดตำแหน่งปัจจุบันด้วยตนเองแทน');
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setForm((f) => ({
          ...f,
          geolocationDenied: false,
          currentLocation: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            pinSaved: true,
            source: 'gps',
            at: nowHHMM(),
          },
        }));
      },
      () => {
        setGeoBusy(false);
        setForm((f) => ({ ...f, geolocationDenied: true }));
        setGeoError('ไม่ได้รับอนุญาตให้เข้าถึงตำแหน่ง (Geolocation permission denied) — ให้ปักหมุดตำแหน่งปัจจุบันด้วยตนเองแทน');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const stampArrival = (note = '') => {
    const entry = saveArrivalCheckIn(visitId, {
      distanceMeters: distance,
      location: form.currentLocation,
      note,
    });
    setForm((f) => ({ ...f, arrivalTime: entry.time }));
    setConfirmArrival(null);
    setRestampNote('');
    onDataChanged?.();
  };

  const requestStampArrival = () => {
    if (!form.currentLocation) {
      setGeoError('ต้องบันทึกพิกัดปัจจุบันก่อน จึงจะเทียบระยะและบันทึกเวลาถึงบ้านได้');
      return;
    }
    if (checkIn) {
      setRestampError('');
      setConfirmArrival({ reason: 'restamp' });
      return;
    }
    if (tooFar) {
      setConfirmArrival({ reason: 'far' });
      return;
    }
    stampArrival();
  };

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ยกขั้น "ที่อยู่" ของหน้าเวชระเบียนมาทั้งก้อน (`Step2Address`)
          — ที่อยู่ตามทะเบียนบ้าน / ที่อยู่ปัจจุบัน (+ปักหมุดแผนที่) / ที่อยู่ติดต่อได้
          พร้อมธง "เหมือนที่อยู่…" ครบเหมือนกันทุกช่อง (มติผู้ใช้ 30 ส.ค. 69)
          หน้านี้เพิ่มเฉพาะการเดินทาง/เวลาถึงบ้านต่อท้าย */}
      <RegistrationAddressStep
        form={form}
        setForm={setForm}
        mapHeading='ตำแหน่งบ้านและการเดินทาง'
        /* บันทึกการเดินทางอยู่ในการ์ด "ที่อยู่ปัจจุบัน" (มติผู้ใช้ 30 ส.ค. 69) —
           เป็นเรื่องของการเดินทางไปยังที่อยู่นั้นโดยตรง ไม่ใช่หัวข้อแยก */
        currentAddressExtra={(
        <SuggestibleTextarea
          label='บันทึกการเดินทาง'
          required
          voice
          value={form.travelNote}
          onChange={(e) => set('travelNote')(e.target.value)}
          suggestions={[
            'เดินทางโดยรถของศูนย์บริการฯ ใช้เวลาประมาณ 20 นาที',
            'บ้านอยู่ในซอยแคบ ต้องจอดรถปากซอยและเดินเข้า 200 เมตร',
            'ไม่พบผู้รับบริการที่บ้านในรอบแรก ต้องกลับมาเยี่ยมซ้ำในช่วงบ่าย',
          ]}
          minChars={2}
          disabled={readOnly}
          placeholder='เส้นทาง อุปสรรคการเข้าถึงบ้าน และข้อมูลที่ทีมครั้งถัดไปควรรู้'
        />
        )}
      />

      <StepSection>
        <TopicHeader icon='map-pin'>การเดินทางและเวลาถึงบ้าน</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', flex: '1 1 380px', minWidth: 320 }}>
            {/* ปักหมุดบ้านได้จากหน้านี้เลย — ชุดเดียวกับหน้าเวชระเบียน (ค้นหาชุมชน/
                สถานที่ + ลากหมุด) ไม่ใช่แผนที่อ่านอย่างเดียว (มติผู้ใช้ 30 ส.ค. 69)
                ทีมเยี่ยมบ้านคือคนที่ไปยืนอยู่หน้าบ้านจริง ถ้าหมุดในทะเบียนผิด
                คนที่แก้ได้ถูกต้องที่สุดคือคนที่อยู่ตรงนั้น */}
            <AddressMapBlock
              value={form.homeLocation || home || {}}
              onChange={(next) => set('homeLocation')({ ...(form.homeLocation || home || {}), ...next })}
              readOnly={readOnly}
              heading='ตำแหน่งบ้านผู้รับบริการ'
            />
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {registryEntry?.address || appointment?.address || '—'}
            </span>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', flex: '1 1 360px', minWidth: 300 }}>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <BrandSubdueButton
                variant='outline' size='md' leadingIcon='my_location'
                onClick={captureLocation} disabled={readOnly || geoBusy}
              >
                {geoBusy ? 'กำลังอ่านพิกัด…' : 'บันทึกพิกัดปัจจุบัน'}
              </BrandSubdueButton>
            </div>

            {geoError && <NoticeBand tone='danger' icon='location_off'>{geoError}</NoticeBand>}

            {tooFar && (
              <NoticeBand tone='warning' icon='social_distance'>
                พิกัดปัจจุบันห่างจากบ้านผู้รับบริการ {formatDistance(distance)}
                {' '}(เกินเกณฑ์ {ARRIVAL_DISTANCE_THRESHOLD_M} เมตร) — ระบบจะให้ยืนยันก่อนบันทึกเวลาถึงบ้าน
              </NoticeBand>
            )}

            {checkIn && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                  บันทึกเวลาถึงบ้านแล้ว {checkIn.time} น.
                </ColorfulBadge>
                <AuditStamp by={checkIn.by} at={checkIn.at} prefix='บันทึกเวลาถึงบ้านโดย' />
                {(checkIn.restamps || []).length > 0 && (
                  <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    ประทับเวลาซ้ำ {checkIn.restamps.length} ครั้ง — ครั้งก่อนหน้า{' '}
                    {checkIn.restamps.map((r) => `${r.time} (${r.note || 'ไม่ระบุเหตุผล'})`).join(' · ')}
                  </span>
                )}
              </div>
            )}

            {form.geolocationDenied && (
              <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <NoticeBand tone='warning' icon='edit_location_alt'>
                  ใช้การปักหมุดด้วยตนเองแทนพิกัดอัตโนมัติ — ระบบจะบันทึกว่าเป็นพิกัดที่เจ้าหน้าที่ระบุเอง
                </NoticeBand>
                <AddressMapBlock
                  value={form.currentLocation || {}}
                  readOnly={readOnly}
                  compact
                  heading='ปักหมุดตำแหน่งปัจจุบันด้วยตนเอง'
                  onChange={(next) => set('currentLocation')({ ...next, source: 'manual', at: nowHHMM() })}
                />
              </div>
            )}
          </div>
        </div>

      </StepSection>

      <Popup
        open={!!confirmArrival}
        onClose={() => setConfirmArrival(null)}
        title={confirmArrival?.reason === 'restamp' ? 'บันทึกเวลาถึงบ้านซ้ำ' : 'ยืนยันการบันทึกเวลาถึงบ้าน'}
        subtitle={distance === null ? '' : `ระยะจากพิกัดปัจจุบันถึงบ้าน ${formatDistance(distance)}`}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setConfirmArrival(null) }}
        primaryAction={{
          label: 'ยืนยันบันทึกเวลา',
          onClick: () => {
            if (confirmArrival?.reason === 'restamp' && !restampNote.trim()) {
              setRestampError('การประทับเวลาซ้ำต้องระบุเหตุผล เพื่อเก็บเป็น audit trail');
              return;
            }
            stampArrival(restampNote.trim());
          },
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          {confirmArrival?.reason === 'far' ? (
            <NoticeBand tone='warning' icon='social_distance'>
              พิกัดปัจจุบันอยู่ห่างจากตำแหน่งบ้านในทะเบียนเกิน {ARRIVAL_DISTANCE_THRESHOLD_M} เมตร
              — ยืนยันว่าถึงบ้านผู้รับบริการแล้วจริงหรือไม่ (อาจเกิดจากพิกัดบ้านในทะเบียนคลาดเคลื่อน)
            </NoticeBand>
          ) : (
            <>
              <NoticeBand tone='warning' icon='replay'>
                การเยี่ยมครั้งนี้บันทึกเวลาถึงบ้านไว้แล้วเมื่อ {checkIn?.time} น. — ระบบอนุญาตให้บันทึกซ้ำได้
                แต่ต้องระบุเหตุผลและจะเก็บเวลาเดิมไว้ในประวัติ
              </NoticeBand>
              <SuggestibleTextarea
                label='เหตุผลที่บันทึกเวลาซ้ำ'
                required
                voice
                value={restampNote}
                onChange={(e) => { setRestampNote(e.target.value); if (e.target.value.trim()) setRestampError(''); }}
                suggestions={[
                  'บันทึกเวลาผิดพลาดในครั้งแรก',
                  'ออกจากบ้านแล้วกลับเข้ามาเยี่ยมซ้ำในวันเดียวกัน',
                  'ระบบบันทึกเวลาก่อนถึงบ้านจริง',
                ]}
                minChars={2}
                placeholder='ระบุเหตุผลการประทับเวลาซ้ำ'
              />
              {restampError && (
                <span style={{ color: 'var(--text-input-errorHelper, #DC2626)', fontSize: 'var(--type-size-xs)' }}>
                  {restampError}
                </span>
              )}
            </>
          )}
        </div>
      </Popup>
    </StepCard>
  );
};

/* ── Step 2 — ประวัติ ─────────────────────────────────────────────── */

export const HomeVisitStep2History = ({ form, setForm, readOnly, hn, registryEntry, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const addMedication = () => setForm((f) => ({
    ...f,
    medications: [...f.medications, { id: `med-${Date.now()}`, name: '', dose: '', adherence: '' }],
  }));
  const updateMedication = (id, key, value) => setForm((f) => ({
    ...f,
    medications: f.medications.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
  }));
  const removeMedication = (id) => setForm((f) => ({
    ...f,
    medications: f.medications.filter((m) => m.id !== id),
  }));

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      {/* ถอดการ์ด "ข้อมูลจากเวชระเบียน" ออกจากขั้นนี้ (มติผู้ใช้ 30 ส.ค. 69) —
          สิทธิ/แพ้ยา/โรคประจำตัว/ธงต่าง ๆ อยู่บนหัวแฟ้มผู้รับบริการด้านบนแล้ว
          ส่วน ๖ กลุ่มผู้รับบริการ · ประเภทรับ–ส่งต่อ · การเคลื่อนไหว ย้ายไปกรอกที่
          ขั้นที่ 1 ของบันทึกการเยี่ยมโดยตรง */}

      <StepSection>
        <TopicHeader icon='file-text'>ประวัติการเจ็บป่วย</TopicHeader>
        <SuggestibleTextarea
          label='ประวัติการเจ็บป่วยและการรักษาปัจจุบัน'
          required
          voice
          value={form.illnessHistory}
          onChange={(e) => set('illnessHistory')(e.target.value)}
          suggestions={HOMEVISIT_ILLNESS_SUGGESTIONS}
          minChars={3}
          disabled={readOnly}
          placeholder='โรคประจำตัว การรักษาที่ได้รับ อุปกรณ์การแพทย์ที่ใช้ที่บ้าน และการเปลี่ยนแปลงตั้งแต่ครั้งก่อน'
        />
      </StepSection>

      <StepSection>
        <TopicHeader icon='pill'>ยาที่ใช้อยู่ที่บ้าน</TopicHeader>
        {form.medications.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้บันทึกรายการยา — กดปุ่มด้านล่างเพื่อเพิ่มรายการยาที่พบที่บ้าน
          </span>
        ) : (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {form.medications.map((m) => (
              <div key={m.id} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <Field label='ชื่อยา'>
                  <InputField showLabel={false} showHelperText={false} value={m.name} onChange={(v) => updateMedication(m.id, 'name', v)} disabled={readOnly} placeholder='เช่น Amlodipine 5 มก.' />
                </Field>
                <Field label='วิธีใช้'>
                  <InputField showLabel={false} showHelperText={false} value={m.dose} onChange={(v) => updateMedication(m.id, 'dose', v)} disabled={readOnly} placeholder='เช่น 1x1 เช้า' />
                </Field>
                <Field label='ความร่วมมือในการใช้ยา'>
                  <Select
                    showLabel={false} showHelperText={false} searchable={false} size='lg'
                    value={m.adherence} onChange={(v) => updateMedication(m.id, 'adherence', v)} disabled={readOnly}
                    options={[
                      { value: 'good', label: 'รับประทานครบตามสั่ง' },
                      { value: 'partial', label: 'ลืมบางมื้อ' },
                      { value: 'poor', label: 'ไม่ได้รับประทาน' },
                      { value: 'stopped', label: 'หยุดยาเอง' },
                    ]}
                    placeholder='เลือก'
                  />
                </Field>
                {!readOnly && (
                  <BrandIconButton icon='close' variant='ghost' size='sm' onClick={() => removeMedication(m.id)} aria-label='ลบรายการยา' />
                )}
              </div>
            ))}
          </div>
        )}
        {!readOnly && <BrandDashedAddButton onClick={addMedication}>เพิ่มรายการยาที่พบที่บ้าน</BrandDashedAddButton>}
      </StepSection>

      {/* มติ คทง.6 — งานทันตกรรมของทีมเยี่ยมบ้านต้องเชื่อมกลับมาที่ระบบ
          ทันตกรรม: พยาบาลเยี่ยมบ้านเห็นผลตรวจฟันล่าสุดได้โดยไม่ต้องเปิด
          Visit ทันตกรรมใหม่ และส่งตรวจได้เมื่อพบปัญหาช่องปากที่บ้าน */}
      <StepSection>
        <CarriedDentalPanel
          hn={hn}
          patientName={registryEntry?.name}
          from='homevisit'
          readOnly={readOnly}
        />
      </StepSection>

      {/* ตารางประวัติการเยี่ยมย้อนหลังถูกถอดออก (มติผู้ใช้ 30 ส.ค. 69) — ย้ายไปดูที่
          ปุ่ม "ประวัติการเยี่ยมบ้าน" บนแถบหัวข้อ ซึ่งเปิดอ่านทีละครั้งได้เต็ม ๆ
          และเปิดจากขั้นไหนก็ได้ ไม่ต้องเลื่อนลงมาที่ขั้นประวัติ */}
    </StepCard>
  );
};

/* ── Step 3 — สัญญาณชีพ ──────────────────────────────────────────── */

export const HomeVisitStep3Vitals = ({ form, setForm, readOnly, onDataChanged, blockedMsg }) => {
  const [deviceMsg, setDeviceMsg] = useState('');
  const connected = getDeviceConnected();

  const setVital = (key) => (value) => setForm((f) => ({ ...f, vitals: { ...f.vitals, [key]: value } }));

  const summary = useMemo(() => summarizeVitals(form.vitals), [form.vitals]);
  const bmi = useMemo(() => calcBmi(form.vitals.weight, form.vitals.height), [form.vitals.weight, form.vitals.height]);

  const readFromDevice = () => {
    const reading = readDeviceVitals();
    if (!reading) {
      setDeviceMsg('อ่านค่าจากอุปกรณ์ไม่สำเร็จ — อุปกรณ์ยังไม่เชื่อมต่อ กรุณาบันทึกค่าด้วยตนเอง');
      return;
    }
    setForm((f) => ({
      ...f,
      vitals: {
        ...f.vitals,
        temp: reading.temp,
        pulse: reading.pulse,
        respiration: reading.respiration,
        oxygen: reading.oxygen,
        sys: reading.sys,
        dia: reading.dia,
      },
      deviceReading: reading,
    }));
    setDeviceMsg('');
    onDataChanged?.();
  };

  const badgeFor = (key) => {
    const res = evaluateVital(key, form.vitals[key]);
    if (res.status === 'normal') return { tone: 'success', label: 'ปกติ' };
    if (res.status === 'abnormal') return { tone: 'warning', label: 'ผิดปกติ' };
    if (res.status === 'invalid') return { tone: 'error', label: 'ค่าไม่ถูกต้อง' };
    return undefined;
  };

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection>
        <TopicHeader
          icon='activity'
          aside={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <NeutralSubdueButton
                variant='outline' size='sm'
                leadingIcon={connected ? 'bluetooth_connected' : 'bluetooth_disabled'}
                onClick={() => { setDeviceConnected(!connected); setDeviceMsg(''); onDataChanged?.(); }}
              >
                {connected ? 'จำลองอุปกรณ์ไม่เชื่อมต่อ' : 'จำลองอุปกรณ์เชื่อมต่อแล้ว'}
              </NeutralSubdueButton>
              <BrandSubdueButton
                variant='fill' size='sm' leadingIcon='download'
                onClick={readFromDevice}
                disabled={readOnly || !connected}
              >
                อ่านค่าจากอุปกรณ์
              </BrandSubdueButton>
            </div>
          )}
        >
          สัญญาณชีพ (TOR 1.18.4)
        </TopicHeader>

        {!connected && (
          <NoticeBand tone='warning' icon='bluetooth_disabled'>
            ยังไม่ได้เชื่อมต่อ{HOMEVISIT_DEVICE.label} — ปุ่ม “อ่านค่าจากอุปกรณ์” ถูกปิดใช้งาน
            ให้บันทึกค่าที่วัดได้ด้วยตนเองในช่องด้านล่าง
          </NoticeBand>
        )}
        {deviceMsg && <NoticeBand tone='danger' icon='error'>{deviceMsg}</NoticeBand>}

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {VITAL_FIELDS.map((f) => {
            const res = evaluateVital(f.key, form.vitals[f.key]);
            return (
              <Field
                key={f.key}
                label={`${f.label} (${f.unit})`}
                error={res.status === 'invalid' ? res.message : undefined}
                hint={res.status === 'abnormal'
                  ? res.message
                  : f.normal ? `เกณฑ์ปกติ ${f.normal[0]}–${f.normal[1]} ${f.unit}` : undefined}
              >
                <InputField
                  showLabel={false} showHelperText={false}
                  value={form.vitals[f.key]}
                  onChange={setVital(f.key)}
                  disabled={readOnly}
                  placeholder={f.normal ? `${f.normal[0]}–${f.normal[1]}` : f.unit}
                  error={res.status === 'invalid' ? ' ' : undefined}
                />
              </Field>
            );
          })}
        </div>

        {summary.invalid.length > 0 && (
          <NoticeBand tone='danger' icon='error'>
            ค่าที่บันทึกไม่ถูกต้อง {summary.invalid.length} รายการ — {summary.invalid.join(' · ')}
          </NoticeBand>
        )}
        {summary.invalid.length === 0 && summary.abnormal.length > 0 && (
          <NoticeBand tone='warning' icon='warning'>
            พบค่าผิดปกติ {summary.abnormal.length} รายการ — {summary.abnormal.join(' · ')}
            {' '}(บันทึกต่อได้ แต่ควรระบุการดูแลในขั้นตอนบันทึกตามบทบาทวิชาชีพ)
          </NoticeBand>
        )}
      </StepSection>

      <StepSection>
        <TopicHeader icon='monitor_heart'>ค่าที่อ่านได้ล่าสุด</TopicHeader>
        {form.deviceReading ? (
          <AuditStamp
            by={form.deviceReading.by}
            at={form.deviceReading.at}
            prefix={`อ่านจาก ${form.deviceReading.device} โดย`}
          />
        ) : (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้อ่านค่าจากอุปกรณ์ในการเยี่ยมครั้งนี้ — การ์ดด้านล่างแสดงค่าที่บันทึกด้วยตนเอง
          </span>
        )}
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <VitalReadingCard
            bordered horizontal type='reading' iconName='thermostat'
            label='อุณหภูมิ' value={form.vitals.temp ? `${form.vitals.temp} °C` : '—'}
            badge={badgeFor('temp')} showBadge={!!badgeFor('temp')}
          />
          <VitalReadingCard
            bordered horizontal type='reading' iconName='monitor_heart'
            label='ชีพจร' value={form.vitals.pulse ? `${form.vitals.pulse} /นาที` : '—'}
            badge={badgeFor('pulse')} showBadge={!!badgeFor('pulse')}
          />
          <VitalReadingCard
            bordered horizontal type='reading' iconName='blood_pressure'
            label='ความดันโลหิต'
            value={form.vitals.sys && form.vitals.dia ? `${form.vitals.sys}/${form.vitals.dia}` : '—'}
            badge={badgeFor('sys')} showBadge={!!badgeFor('sys')}
          />
          <VitalReadingCard
            bordered horizontal type='reading' iconName='pulmonology'
            label='อัตราการหายใจ' value={form.vitals.respiration ? `${form.vitals.respiration} /นาที` : '—'}
            badge={badgeFor('respiration')} showBadge={!!badgeFor('respiration')}
          />
          <VitalReadingCard
            bordered horizontal type='reading' iconName='spo2'
            label='ออกซิเจนปลายนิ้ว' value={form.vitals.oxygen ? `${form.vitals.oxygen} %` : '—'}
            badge={badgeFor('oxygen')} showBadge={!!badgeFor('oxygen')}
          />
          <VitalReadingCard
            bordered horizontal={false} type='bmi'
            label='BMI' value={bmi ? String(bmi) : '—'}
            bmiMarkerPercent={bmi ? Math.max(0, Math.min(100, ((bmi - 15) / 25) * 100)) : 0}
            showBadge={false}
          />
        </div>

        <SuggestibleTextarea
          label='บันทึกเพิ่มเติมเกี่ยวกับการวัดสัญญาณชีพ'
          voice
          value={form.vitalsNote}
          onChange={(e) => setForm((f) => ({ ...f, vitalsNote: e.target.value }))}
          suggestions={[
            'วัดความดันในท่านั่งหลังพัก 5 นาที ค่าอยู่ในเกณฑ์เดิม',
            'ผู้ป่วยมีไข้ต่ำ ๆ ให้เช็ดตัวและติดตามซ้ำใน 2 ชั่วโมง',
            'ค่าออกซิเจนต่ำกว่าปกติ ปรับอัตราออกซิเจนที่บ้านและแจ้งแพทย์',
          ]}
          minChars={2}
          disabled={readOnly}
          placeholder='สภาวะขณะวัด ความผิดปกติที่พบ และการดูแลเบื้องต้น'
        />
      </StepSection>
    </StepCard>
  );
};

/* ── Step 4 — ประเมินการเยี่ยม + คัดกรอง + ADL ────────────────────── */

export const HomeVisitStep4Assessment = ({ form, setForm, readOnly, blockedMsg }) => {
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleEnvironment = (key) => setForm((f) => ({
    ...f,
    environment: { ...f.environment, [key]: !f.environment[key] },
  }));

  const setAdl = (itemKey, value) => setForm((f) => ({
    ...f,
    adlAnswers: { ...f.adlAnswers, [itemKey]: value },
  }));

  const adlTotal = useMemo(() => scoreBarthel(form.adlAnswers), [form.adlAnswers]);
  const adlAnswered = useMemo(() => countBarthelAnswered(form.adlAnswers), [form.adlAnswers]);
  const adlInterp = useMemo(() => interpretBarthel(adlTotal), [adlTotal]);

  const q2Positive = SCREEN_2Q_QUESTIONS.filter((q) => form.screen2q?.[q.key] === true).length;
  const envRisks = HOME_ENVIRONMENT_ITEMS.filter((i) => form.environment?.[i.key] !== true);

  /* ── เครื่องมือมาตรฐาน (มติ คทง.4 ต่อ §1.18.5) ──────────────────
     MNA-SF · 9Q (เมื่อ 2Q ผลบวก) · PPS — คำนวณคะแนนและแปลผลอัตโนมัติ
     ทุกตัว ไม่มีช่องให้ผู้บันทึกสรุปเป็น "ดีขึ้น/แย่ลง" เองอีก */
  const bmi = useMemo(() => calcBmi(form.vitals?.weight, form.vitals?.height), [form.vitals]);
  const bmiScore = useMemo(() => mnaBmiScore(bmi), [bmi]);

  const mnaTotal = useMemo(() => scoreMna(form.mna), [form.mna]);
  const mnaAnswered = useMemo(() => countMnaAnswered(form.mna), [form.mna]);
  const mnaDone = isMnaComplete(form.mna);
  const mnaInterp = useMemo(() => interpretMna(mnaTotal), [mnaTotal]);

  /** ตอบ MNA — พร้อมเติมผลแปล (`nutrition`) ให้อัตโนมัติเมื่อครบทุกข้อ. */
  const setMna = (itemKey, value) => setForm((f) => {
    const mna = { ...f.mna, [itemKey]: value };
    return {
      ...f,
      mna,
      nutrition: isMnaComplete(mna) ? interpretMna(scoreMna(mna)).nutrition : '',
    };
  });

  const applyBmiToMna = () => {
    if (bmiScore === null) return;
    setMna('f', bmiScore);
  };

  const q9Total = useMemo(() => score9q(form.screen9q), [form.screen9q]);
  const q9Answered = useMemo(() => count9qAnswered(form.screen9q), [form.screen9q]);
  const q9Done = is9qComplete(form.screen9q);
  const q9Interp = useMemo(() => interpret9q(q9Total), [q9Total]);
  const q9Suicidal = has9qSuicidalRisk(form.screen9q);

  const set9q = (key, value) => setForm((f) => ({
    ...f,
    screen9q: { ...f.screen9q, [key]: value },
  }));

  const ppsInterp = useMemo(() => interpretPps(form.pps), [form.pps]);

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection>
        <TopicHeader icon='home'>ประเมินสภาพแวดล้อมในบ้าน</TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          เลือกข้อที่ “ผ่านเกณฑ์” — ข้อที่ไม่ได้เลือกจะถูกสรุปเป็นความเสี่ยงของบ้านหลังนี้
        </span>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {HOME_ENVIRONMENT_ITEMS.map((item) => (
            <SelectableTag
              key={item.key}
              label={item.label}
              size='md'
              selected={!!form.environment?.[item.key]}
              onClick={readOnly ? undefined : () => toggleEnvironment(item.key)}
            />
          ))}
        </div>
        {envRisks.length > 0 && (
          <NoticeBand tone='warning' icon='report'>
            ความเสี่ยงของสภาพแวดล้อมที่ยังไม่ผ่านเกณฑ์ {envRisks.length} ข้อ — {envRisks.map((i) => i.label).join(' · ')}
          </NoticeBand>
        )}
      </StepSection>

      {/* แบบคัดกรองสุขภาพรายบุคคล — ฟอร์มเดียวกับหน้า "คัดกรองเยี่ยมบ้าน" ที่เคยทำไว้
          ยกมาไว้ทั้งชุดในขั้น "ประเมินและคัดกรอง" (มติผู้ใช้ 30 ส.ค. 69) ซึ่งเป็นที่ของ
          เครื่องมือคัดกรองทั้งหมดอยู่แล้ว (ADL/Barthel · MNA-SF · 2Q/9Q · PPS)
          ช่องที่ระบบมีอยู่แล้วไม่ถูกยกมาซ้ำ: ชื่อ-ที่อยู่-เบอร์-สิทธิ (เวชระเบียน) ·
          น้ำหนัก/ส่วนสูง/BMI/BP/PR/RR/T (ขั้นสัญญาณชีพ) · รายการยา/อาหารที่แพ้และ
          โรคประจำตัว (ขั้นประวัติ) · วันที่สำรวจ (ใช้วันที่ให้บริการของบันทึกนี้) */}
      <StepSection>
        <TopicHeader icon='assignment_ind'>แบบคัดกรองสุขภาพรายบุคคล — ข้อมูลประชากรและสิทธิ</TopicHeader>
        <PersonalProfileFields
          value={form.homeScreening}
          onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
          readOnly={readOnly}
        />
      </StepSection>

      <StepSection>
        <TopicHeader icon='warning'>ความเสี่ยงด้านสุขภาพ (เลือกได้หลายข้อ)</TopicHeader>
        <HealthRiskFields
          value={form.homeScreening}
          onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
          readOnly={readOnly}
        />
      </StepSection>

      {/* DTX คู่กับสถานะการอดอาหาร — ค่าน้ำตาลอ่านไม่ได้ถ้าไม่รู้ว่าอดอาหารมาหรือไม่ */}
      <StepSection>
        <TopicHeader icon='bloodtype'>น้ำตาลปลายนิ้ว (DTX)</TopicHeader>
        <DtxFields
          value={form.homeScreening}
          onChange={(next) => setForm((f) => ({ ...f, homeScreening: next }))}
          readOnly={readOnly}
        />
      </StepSection>

      <StepSection>
        <TopicHeader icon='health_metrics'>คัดกรองสุขภาพรายบุคคล</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ผู้ดูแลหลัก'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.caregiver} onChange={set('caregiver')} disabled={readOnly}
              options={CAREGIVER_OPTIONS}
              placeholder='เลือกลักษณะผู้ดูแล'
            />
          </Field>
          <Field
            label='ภาวะโภชนาการ'
            hint='ระบบแปลผลจากคะแนน MNA-SF ด้านล่างให้อัตโนมัติ — ไม่ต้องเลือกเอง'
          >
            <div
              className='flex items-center'
              style={{
                minHeight: 'var(--dim-size-1000, 48px)',
                gap: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-200, 8px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #DFE1E3)',
                background: 'var(--surface-neutral-quaternary, #F9FBFB)',
              }}
            >
              {mnaDone ? (
                <ColorfulBadge style={mnaInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={320}>
                  {NUTRITION_OPTIONS.find((o) => o.value === mnaInterp.nutrition)?.label || mnaInterp.label}
                </ColorfulBadge>
              ) : (
                <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
                  ยังประเมิน MNA-SF ไม่ครบ
                </span>
              )}
            </div>
          </Field>
          <Field label='แผลกดทับ'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.pressureSore} onChange={set('pressureSore')} disabled={readOnly}
              options={PRESSURE_SORE_OPTIONS}
              placeholder='เลือกระยะแผลกดทับ'
            />
          </Field>
        </div>

        {form.caregiver === 'none' && (
          <NoticeBand tone='warning' icon='person_alert'>
            ผู้รับบริการไม่มีผู้ดูแล — ควรประสานงานสังคมสงเคราะห์และ อสส. ในชุมชนก่อนปิดการเยี่ยม
          </NoticeBand>
        )}

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
            ระดับความปวด (0 = ไม่ปวด · 10 = ปวดมากที่สุด)
          </span>
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {PAIN_SCALE.map((n) => (
              <SelectableTag
                key={n}
                label={String(n)}
                size='md'
                selected={form.painScore === n}
                onClick={readOnly ? undefined : () => set('painScore')(n)}
              />
            ))}
          </div>
          {Number.isFinite(form.painScore) && form.painScore >= 7 && (
            <NoticeBand tone='danger' icon='priority_high'>
              ความปวดระดับรุนแรง ({form.painScore}/10) — ควรทบทวนแผนจัดการความปวดและพิจารณาปรึกษาแพทย์ทางไกล
            </NoticeBand>
          )}
        </div>

        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
            คัดกรองภาวะซึมเศร้า 2Q
          </span>
          {SCREEN_2Q_QUESTIONS.map((q, idx) => (
            <div key={q.key} className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span className='flex-1 min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
                {idx + 1}. {q.label}
              </span>
              <SelectableTag
                label='มี'
                size='md'
                selected={form.screen2q?.[q.key] === true}
                onClick={readOnly ? undefined : () => setForm((f) => ({ ...f, screen2q: { ...f.screen2q, [q.key]: true } }))}
              />
              <SelectableTag
                label='ไม่มี'
                size='md'
                selected={form.screen2q?.[q.key] === false}
                onClick={readOnly ? undefined : () => setForm((f) => ({ ...f, screen2q: { ...f.screen2q, [q.key]: false } }))}
              />
            </div>
          ))}
          {q2Positive > 0 && (
            <NoticeBand tone='warning' icon='psychology'>
              คัดกรอง 2Q ผลบวก {q2Positive} ข้อ — ต้องประเมิน 9Q ต่อให้ครบก่อนไปขั้นตอนถัดไป
              และส่งต่อคลินิกสุขภาพจิตหากเข้าเกณฑ์
            </NoticeBand>
          )}
        </div>

        {/* 9Q — บังคับเมื่อ 2Q ผลบวก (มติ คทง.4 ต่อ §1.18.5) */}
        {q2Positive > 0 && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-bold)',
                color: 'var(--text-content-default, #363B3F)',
              }}>
                แบบประเมินโรคซึมเศร้า 9Q
              </span>
              <div className='flex-1' />
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                {q9Total}/{SCREEN_9Q_MAX_SCORE} คะแนน
              </span>
              {q9Done && (
                <ColorfulBadge style={q9Interp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                  {q9Interp.label}
                </ColorfulBadge>
              )}
            </div>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ถามความถี่ของอาการใน 2 สัปดาห์ที่ผ่านมา ระบบรวมคะแนนและแปลผลระดับความรุนแรงให้อัตโนมัติ
              (ตอบแล้ว {q9Answered}/{SCREEN_9Q_QUESTIONS.length} ข้อ)
            </span>
            {SCREEN_9Q_QUESTIONS.map((q, idx) => (
              <div key={q.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
                <span style={{
                  fontSize: 'var(--type-size-sm)',
                  color: q.critical ? 'var(--text-pill-red, #B91C1C)' : 'var(--text-content-default, #363B3F)',
                }}>
                  {idx + 1}. {q.label}
                </span>
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {SCREEN_9Q_FREQUENCY.map((opt) => (
                    <SelectableTag
                      key={opt.value}
                      label={`${opt.label} (${opt.value})`}
                      size='md'
                      selected={form.screen9q?.[q.key] === opt.value}
                      onClick={readOnly ? undefined : () => set9q(q.key, opt.value)}
                    />
                  ))}
                </div>
              </div>
            ))}
            {q9Suicidal && (
              <NoticeBand tone='danger' icon='crisis_alert'>
                ผู้รับบริการตอบข้อ 9 (คิดทำร้ายตนเอง) — ต้องประเมินความเสี่ยงฆ่าตัวตาย (8Q)
                และส่งต่อจิตแพทย์ทันทีในการเยี่ยมครั้งนี้ ห้ามรอรอบเยี่ยมถัดไป
              </NoticeBand>
            )}
            {q9Done && !q9Suicidal && (
              <NoticeBand tone={q9Interp.key === 'none' ? 'info' : 'warning'} icon='psychology_alt'>
                {q9Interp.label} — {q9Interp.advice}
              </NoticeBand>
            )}
          </div>
        )}
      </StepSection>

      {/* ── MNA-SF (มติ คทง.4 ต่อ §1.18.5) ─────────────────────────── */}
      <StepSection>
        <TopicHeader
          icon='nutrition'
          aside={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                {mnaTotal}/{MNA_MAX_SCORE} คะแนน
              </span>
              <ColorfulBadge style={mnaInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                {mnaDone ? mnaInterp.label : `ตอบแล้ว ${mnaAnswered}/${MNA_ITEMS.length} ข้อ`}
              </ColorfulBadge>
            </div>
          )}
        >
          ประเมินภาวะโภชนาการ — MNA-SF
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ใช้แบบประเมินมาตรฐานแทนการเลือก “ดี/เสี่ยง/ขาดสารอาหาร” เอง — ระบบรวมคะแนน แปลผล
          และเติมช่อง “ภาวะโภชนาการ” ด้านบนให้อัตโนมัติเมื่อตอบครบทั้ง {MNA_ITEMS.length} ข้อ
        </span>
        {MNA_ITEMS.map((item, idx) => (
          <div key={item.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span className='flex-1 min-w-0' style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
                {idx + 1}. {item.label}
              </span>
              {item.autoFromBmi && bmiScore !== null && form.mna?.f !== bmiScore && !readOnly && (
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='calculate' onClick={applyBmiToMna}>
                  ใช้ค่า BMI {bmi} ที่ระบบคำนวณ
                </NeutralSubdueButton>
              )}
            </div>
            {item.autoFromBmi && bmiScore === null && (
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ยังไม่มีค่า BMI — กรอกน้ำหนักและส่วนสูงในขั้นตอนสัญญาณชีพ แล้วกลับมากดใช้ค่าอัตโนมัติได้
              </span>
            )}
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {item.options.map((opt) => (
                <SelectableTag
                  key={opt.value}
                  label={`${opt.label} (${opt.value})`}
                  size='md'
                  selected={form.mna?.[item.key] === opt.value}
                  onClick={readOnly ? undefined : () => setMna(item.key, opt.value)}
                />
              ))}
            </div>
          </div>
        ))}
        {mnaDone && (
          <NoticeBand tone={mnaInterp.key === 'normal' ? 'info' : 'warning'} icon='restaurant'>
            {mnaInterp.label} — {mnaInterp.advice}
          </NoticeBand>
        )}
      </StepSection>

      {/* ── PPS (มติ คทง.4 ต่อ §1.18.5) ────────────────────────────── */}
      <StepSection>
        <TopicHeader
          icon='monitor_heart'
          aside={ppsInterp ? (
            <ColorfulBadge style={ppsInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
              {ppsInterp.label}
            </ColorfulBadge>
          ) : undefined}
        >
          ระดับความสามารถ — PPS (Palliative Performance Scale)
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          เลือกระดับที่ตรงกับผู้รับบริการมากที่สุด — ระบบใช้ผลนี้เสนอรอบการเยี่ยมครั้งถัดไปให้อัตโนมัติ
        </span>
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          {PPS_LEVELS.map((level) => (
            <SelectableTag
              key={level.value}
              label={level.label}
              size='md'
              selected={Number(form.pps) === level.value && form.pps !== ''}
              onClick={readOnly ? undefined : () => set('pps')(level.value)}
            />
          ))}
        </div>
        {ppsInterp && (
          <NoticeBand tone={ppsInterp.key === 'stable' ? 'info' : 'warning'} icon='event_repeat'>
            {ppsInterp.label} — {ppsInterp.advice}
            {ppsInterp.followUpDays ? ` (ระบบเสนอรอบเยี่ยมถัดไปทุก ${ppsInterp.followUpDays} วัน)` : ''}
          </NoticeBand>
        )}
      </StepSection>

      <StepSection>
        <TopicHeader
          icon='accessible'
          aside={(
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <span style={{ fontSize: 'var(--type-size-sm)', fontWeight: 'var(--type-weight-bold)', color: 'var(--text-content-default, #363B3F)' }}>
                {adlTotal}/{BARTHEL_MAX_SCORE} คะแนน
              </span>
              <ColorfulBadge style={adlInterp.badge} size='small' hierarchy='secondary' width='hug' maxWidth={420}>
                {adlInterp.label}
              </ColorfulBadge>
            </div>
          )}
        >
          ประเมิน ADL — ดัชนีบาร์เธล (Barthel Index)
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          ตอบครบทุกข้อ ระบบคำนวณคะแนนรวมและแปลผลกลุ่มติดสังคม/ติดบ้าน/ติดเตียงให้อัตโนมัติ
          และส่งคะแนนไปแสดงเป็นแนวโน้มในหน้าติดตามการเยี่ยมบ้าน (ตอบแล้ว {adlAnswered}/{BARTHEL_ITEMS.length} ข้อ)
        </span>
        {BARTHEL_ITEMS.map((item, idx) => (
          <div key={item.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default, #363B3F)' }}>
              {idx + 1}. {item.label}
            </span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {item.options.map((opt) => (
                <SelectableTag
                  key={opt.value}
                  label={`${opt.label} (${opt.value})`}
                  size='md'
                  selected={form.adlAnswers?.[item.key] === opt.value}
                  onClick={readOnly ? undefined : () => setAdl(item.key, opt.value)}
                />
              ))}
            </div>
          </div>
        ))}
      </StepSection>

      <StepSection>
        <TopicHeader icon='clipboard-list'>สรุปผลการประเมินการเยี่ยมบ้าน</TopicHeader>
        <SuggestibleTextarea
          label='สรุปผลการประเมิน'
          required
          voice
          value={form.assessmentNote}
          onChange={(e) => set('assessmentNote')(e.target.value)}
          suggestions={HOMEVISIT_ASSESSMENT_SUGGESTIONS}
          minChars={3}
          disabled={readOnly}
          placeholder='สภาพผู้รับบริการ สภาพแวดล้อม ผู้ดูแล และปัญหาที่ต้องแก้ไขเร่งด่วน'
        />
      </StepSection>
    </StepCard>
  );
};

/* ── Step 5 — บันทึกตามบทบาทวิชาชีพ + กิจกรรมการดูแล + Telemed ────── */

export const HomeVisitStep5Care = ({ form, setForm, readOnly, visitId, hn, appointment, blockedMsg }) => {
  const routerHistory = useHistory();
  const [telemedOpen, setTelemedOpen] = useState(false);

  const setRoleNote = (profession, value) => setForm((f) => ({
    ...f,
    roleNotes: { ...f.roleNotes, [profession]: value },
  }));

  const toggleActivity = (key) => setForm((f) => ({
    ...f,
    activities: { ...f.activities, [key]: !f.activities[key] },
  }));

  const activityGroups = useMemo(() => {
    const map = new Map();
    CARE_ACTIVITIES.forEach((a) => {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group).push(a);
    });
    return Array.from(map.entries());
  }, []);

  const selectedActivities = CARE_ACTIVITIES.filter((a) => form.activities?.[a.key]);
  const filledRoles = ROLE_NOTE_SECTIONS.filter((s) => String(form.roleNotes?.[s.profession] || '').trim());

  const launchTelemed = () => {
    /* push ด้านล่างจะ unmount HomeVisitRecordPage ใน commit เดียวกับ setForm —
       autosave effect ของหน้าไม่ทันทำงาน จึงต้องบันทึกร่างตรงนี้เองก่อนออก
       (ตรงกับข้อความใน popup ว่า "แบบร่างจะถูกบันทึกอัตโนมัติก่อนออกจากหน้านี้")
       stepIndex 4 = ขั้นตอนที่ 5 ใน HOMEVISIT_STEP_RENDERERS. */
    saveHomeVisitDraft(visitId, { ...form, telemedRequested: true }, 4);
    setForm((f) => ({ ...f, telemedRequested: true }));
    setTelemedOpen(false);
    routerHistory.push({
      pathname: '/telemed/worklist',
      state: {
        hn,
        name: appointment?.name,
        from: 'homevisit',
        reason: 'ปรึกษาแพทย์ทางไกลระหว่างการเยี่ยมบ้าน',
      },
    });
  };

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection>
        <TopicHeader
          icon='stethoscope'
          aside={(
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              บันทึกแล้ว {filledRoles.length}/{ROLE_NOTE_SECTIONS.length} วิชาชีพ (TOR 1.18.5)
            </span>
          )}
        >
          บันทึกเวชระเบียนตามบทบาทวิชาชีพ
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          แต่ละวิชาชีพบันทึกเฉพาะส่วนของตนเอง ระบบเก็บรวมเป็นเวชระเบียนของการเยี่ยมครั้งนี้
          — ต้องบันทึกอย่างน้อย 1 วิชาชีพจึงจะไปขั้นตอนถัดไปได้
        </span>
        {ROLE_NOTE_SECTIONS.map((section) => (
          <div key={section.profession} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <SuggestibleTextarea
              label={section.label}
              voice
              value={form.roleNotes?.[section.profession] || ''}
              onChange={(e) => setRoleNote(section.profession, e.target.value)}
              suggestions={section.suggestions}
              minChars={3}
              disabled={readOnly}
              placeholder={section.placeholder}
            />
          </div>
        ))}
      </StepSection>

      <StepSection>
        <TopicHeader
          icon='checklist'
          aside={(
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              เลือกแล้ว {selectedActivities.length} กิจกรรม (TOR 1.18.7)
            </span>
          )}
        >
          กิจกรรมการดูแลที่ให้ในการเยี่ยมครั้งนี้
        </TopicHeader>
        {activityGroups.map(([group, items]) => (
          <div key={group} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>{group}</span>
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              {items.map((a) => (
                <SelectableTag
                  key={a.key}
                  label={a.label}
                  size='md'
                  selected={!!form.activities?.[a.key]}
                  onClick={readOnly ? undefined : () => toggleActivity(a.key)}
                />
              ))}
            </div>
          </div>
        ))}
        {selectedActivities.length === 0 && (
          <NoticeBand tone='warning' icon='checklist'>
            ยังไม่ได้เลือกกิจกรรมการดูแล — ต้องเลือกอย่างน้อย 1 รายการก่อนไปขั้นตอนสั่งการรักษา
          </NoticeBand>
        )}
      </StepSection>

      <StepSection>
        <TopicHeader icon='videocam'>ปรึกษาแพทย์ทางไกล (Telemedicine · TOR 1.18.10)</TopicHeader>
        <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='fill' size='md' leadingIcon='videocam'
            onClick={() => setTelemedOpen(true)}
            disabled={readOnly}
          >
            ปรึกษาแพทย์ทางไกล
          </BrandSubdueButton>
          {form.telemedRequested && (
            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug' maxWidth={420}>
              ส่งคำขอปรึกษาแพทย์ทางไกลจากการเยี่ยมครั้งนี้แล้ว
            </ColorfulBadge>
          )}
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            เปิดห้องปรึกษาในระบบ Telemedicine ที่มีอยู่ พร้อมส่งบริบทผู้รับบริการไปด้วย
            (ระบบเยี่ยมบ้านไม่แก้ไขหน้าจอ Telemedicine)
          </span>
        </div>
      </StepSection>

      <Popup
        open={telemedOpen}
        onClose={() => setTelemedOpen(false)}
        title='เปิดห้องปรึกษาแพทย์ทางไกล'
        subtitle={appointment ? `${appointment.name} · HN: ${appointment.hn}` : ''}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setTelemedOpen(false) }}
        primaryAction={{ label: 'เปิดระบบ Telemedicine', onClick: launchTelemed }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบจะพาไปยังรายการปรึกษาทางไกลของ PHCIS พร้อมบริบทผู้รับบริการรายนี้
            — เมื่อสนทนาเสร็จ ให้กลับมาบันทึกผลการปรึกษาในช่อง “บันทึกแพทย์” ของขั้นตอนนี้
          </span>
          <NoticeBand tone='neutral' icon='info'>
            แบบร่างการเยี่ยมจะถูกบันทึกอัตโนมัติก่อนออกจากหน้านี้ กลับมาทำต่อได้จากแท็บ “ที่ร่างไว้” ในคิวเยี่ยมบ้าน
          </NoticeBand>
        </div>
      </Popup>
    </StepCard>
  );
};

/* ── Step 6 — สั่งการรักษา (CPOE · TOR 1.18.6) ────────────────────────
   รายการทั้งหมดมาจากแคตตาล็อกกลางชุดเดียวกับหน้าจอ CPOE (`labCatalog` ·
   `xrayCatalog` · ICD-9-CM · รายการยา/เวชภัณฑ์ของ Step5Orders) และส่งต่อ
   ด้วย id เดิม เพื่อให้แพทย์ที่ศูนย์ฯ กด "นำเข้า" แล้วได้แถวคำสั่งจริง
   ผ่านการตรวจซ้ำซ้อน/CDSS ของ CPOE — ไม่ใช่ข้อความที่ต้องคีย์ใหม่. */

export const HomeVisitStep6Orders = ({
  form, setForm, readOnly, hn, appointment, registryEntry, blockedMsg,
}) => {
  const routerHistory = useHistory();
  const patientHn = hn || registryEntry?.hn || appointment?.hn || '';
  const [handoff, setHandoff] = useState(() => (patientHn ? getCpoeHandoff(patientHn) : null));

  const toggleOrder = (groupKey, id) => setForm((f) => ({
    ...f,
    [groupKey]: (f[groupKey] || []).includes(id)
      ? f[groupKey].filter((v) => v !== id)
      : [...(f[groupKey] || []), id],
  }));

  const totalOrders = countHomeVisitOrders(form);
  /* คำสั่งที่ "ส่งไปแล้ว" ต่างจากที่เลือกอยู่ตอนนี้หรือไม่ — ถ้าต่างต้องส่งซ้ำ */
  const sentIds = (handoff?.items || []).map((i) => i.id).sort().join('|');
  const currentIds = collectHomeVisitOrderItems(form).map((i) => i.id).sort().join('|');
  const handoffStale = !!handoff && sentIds !== currentIds;

  const sendToCpoe = () => {
    if (!patientHn || totalOrders === 0) return;
    setHandoff(sendOrdersToCpoe({ hn: patientHn, visitId: appointment?.id, form }));
  };

  const openCpoe = () => routerHistory.push({
    pathname: '/treat/record',
    state: {
      hn: patientHn,
      name: registryEntry?.name || appointment?.name,
      from: 'homevisit',
    },
  });

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <NoticeBand tone='neutral' icon='info'>
        รายการในขั้นตอนนี้เป็นรายการเดียวกับแคตตาล็อกของระบบ CPOE ที่ศูนย์บริการฯ (รหัสแล็บ/เอกซเรย์/ICD-9-CM
        ชุดเดียวกัน) — กด “ส่งคำสั่งเข้า CPOE” แล้วแพทย์ที่ศูนย์ฯ นำเข้าเป็นคำสั่งจริงได้ทันที
        โดยผ่านการตรวจซ้ำซ้อนและ CDSS ของ CPOE (TOR 1.18.6) · ขั้นตอนนี้ไม่บังคับกรอก
      </NoticeBand>

      {HOMEVISIT_ORDER_GROUPS.map((group) => (
        <StepSection key={group.key}>
          <TopicHeader
            icon={group.icon}
            aside={(
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                เลือกแล้ว {form[group.key]?.length || 0} รายการ
              </span>
            )}
          >
            {group.label}
          </TopicHeader>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            {group.hint}
          </span>
          <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {group.items.map((opt) => (
              <SelectableTag
                key={opt.id}
                label={opt.detail ? `${opt.name} · ${opt.detail}` : opt.name}
                size='md'
                selected={(form[group.key] || []).includes(opt.id)}
                onClick={readOnly ? undefined : () => toggleOrder(group.key, opt.id)}
              />
            ))}
          </div>
        </StepSection>
      ))}

      <StepSection>
        <TopicHeader icon='edit'>รายละเอียดคำสั่งการรักษา</TopicHeader>
        {totalOrders === 0 && (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้เลือกคำสั่งการรักษา — การเยี่ยมบางครั้งไม่มีคำสั่งการรักษา สามารถข้ามขั้นตอนนี้ได้
          </span>
        )}
        <SuggestibleTextarea
          label='รายละเอียด/เงื่อนไขของคำสั่ง'
          voice
          value={form.orderNote}
          onChange={(e) => setForm((f) => ({ ...f, orderNote: e.target.value }))}
          suggestions={HOMEVISIT_ORDER_NOTE_SUGGESTIONS}
          minChars={2}
          disabled={readOnly}
          placeholder='ความถี่ ระยะเวลา ผู้รับผิดชอบ และเงื่อนไขพิเศษของคำสั่งการรักษา'
        />
      </StepSection>

      {/* TOR 1.18.6 — ส่งคำสั่งเข้าคิวนำเข้าของ CPOE */}
      <StepSection>
        <TopicHeader
          icon='swap_horiz'
          aside={handoff && !handoffStale ? (
            <ColorfulBadge
              style={handoff.status === 'imported' ? 'teal' : 'blue'}
              size='small' hierarchy='secondary' width='hug' maxWidth={460}
            >
              {handoff.status === 'imported'
                ? `แพทย์นำเข้าเป็นคำสั่งจริงแล้ว ${handoff.importedCount} รายการ`
                : `รอแพทย์นำเข้าที่หน้าจอ CPOE ${handoff.items.length} รายการ`}
            </ColorfulBadge>
          ) : undefined}
        >
          ส่งคำสั่งการรักษาเข้าระบบ CPOE ของศูนย์บริการฯ
        </TopicHeader>

        <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='fill' size='md' leadingIcon='send'
            onClick={sendToCpoe}
            disabled={readOnly || totalOrders === 0 || !patientHn || (!!handoff && !handoffStale)}
          >
            {handoffStale ? 'ส่งคำสั่งชุดใหม่เข้า CPOE' : 'ส่งคำสั่งเข้า CPOE'}
          </BrandSubdueButton>
          <NeutralSubdueButton
            variant='outline' size='md' leadingIcon='stethoscope'
            onClick={openCpoe}
            disabled={!patientHn}
          >
            เปิดหน้าจอ CPOE ของผู้รับบริการ
          </NeutralSubdueButton>
          <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
            เลือกไว้ {totalOrders} รายการ
          </span>
        </div>

        {!patientHn && (
          <NoticeBand tone='warning' icon='person_alert'>
            ยังไม่ทราบ HN ของผู้รับบริการ — เปิดบันทึกการเยี่ยมจากคิวหรือทะเบียน จึงจะส่งคำสั่งเข้า CPOE ได้
          </NoticeBand>
        )}

        {handoff && handoff.status === 'imported' && !handoffStale && (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <AuditStamp by={handoff.by} at={handoff.at} prefix='ส่งจากการเยี่ยมโดย' />
            <AuditStamp by={handoff.importedBy} at={handoff.importedAt} prefix='นำเข้าเป็นคำสั่งจริงโดย' />
          </div>
        )}

        {handoff && handoff.status === 'pending' && !handoffStale && (
          <>
            <AuditStamp by={handoff.by} at={handoff.at} prefix='ส่งจากการเยี่ยมโดย' />
            <NoticeBand tone='info' icon='pending_actions'>
              คำสั่งรออยู่ในหน้าจอ CPOE ของ HN {patientHn} แล้ว — แพทย์จะเห็นแถบ “คำสั่งจากการเยี่ยมบ้าน”
              ที่ขั้นสั่งการรักษา และกดนำเข้าเพื่อให้ผ่านการตรวจซ้ำซ้อน/CDSS ก่อนยืนยัน
            </NoticeBand>
          </>
        )}

        {handoffStale && (
          <NoticeBand tone='warning' icon='sync_problem'>
            รายการที่เลือกไว้ตอนนี้ไม่ตรงกับชุดที่ส่งเข้า CPOE เมื่อ {handoff.at}
            {' '}— กด “ส่งคำสั่งชุดใหม่เข้า CPOE” เพื่อให้แพทย์เห็นรายการล่าสุด
          </NoticeBand>
        )}
      </StepSection>
    </StepCard>
  );
};

/* ── Step 7 — Family Folder + ส่งข้อมูลกลับศูนย์ ───────────────────── */

export const HomeVisitStep7Family = ({
  form, setForm, readOnly, visitId, hn, appointment, registryEntry, onDataChanged, blockedMsg,
}) => {
  const routerHistory = useHistory();
  const [submitOpen, setSubmitOpen] = useState(false);
  const submission = visitId ? getVisitSubmission(visitId) : null;
  /* §1.7.1.1 (มติ คทง.4) — คีย์ที่นี่ที่เดียว แล้วส่งชุดข้อมูล สปสช. ต่อ
     ให้อัตโนมัติ ไม่ต้องไปคีย์ซ้ำที่ระบบ BKK Home Care */
  const [nhsoClaim, setNhsoClaim] = useState(() => (visitId ? getNhsoClaim(visitId) : null));

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const addMember = () => setForm((f) => ({
    ...f,
    familyMembers: [...f.familyMembers, {
      id: `fam-${Date.now()}`, name: '', relation: '', age: '', health: '',
    }],
  }));
  const updateMember = (id, key, value) => setForm((f) => ({
    ...f,
    familyMembers: f.familyMembers.map((m) => (m.id === id ? { ...m, [key]: value } : m)),
  }));
  const removeMember = (id) => setForm((f) => ({
    ...f,
    familyMembers: f.familyMembers.filter((m) => m.id !== id),
  }));

  const adlTotal = scoreBarthel(form.adlAnswers);
  const adlInterp = interpretBarthel(adlTotal);

  const claimContext = {
    entry: registryEntry || appointment,
    form,
    adlComplete: isBarthelComplete(form.adlAnswers),
  };

  const sendClaim = () => setNhsoClaim(sendNhsoClaim(visitId, claimContext));

  const confirmSubmit = () => {
    saveVisitSubmission(visitId, {
      hn,
      summary: form.assessmentNote,
      orders: summarizeOrders(form, homeVisitOrderLabel),
      nextVisitDate: form.nextVisitDate,
    });
    appendVisitHistory(hn, {
      date: form.serviceDate || todayIsoDate(),
      profession: registryEntry?.profession || appointment?.profession || 'nurse',
      adl: adlTotal,
      vitals: form.vitals,
      summary: form.assessmentNote,
      orders: summarizeOrders(form, homeVisitOrderLabel),
      tools: summarizeStandardTools(form).map((t) => `${t.name} ${t.total}/${t.max}`).join(' · '),
    });
    /* ส่งชุดข้อมูลเบิกจ่าย สปสช. ต่อทันทีในขั้นตอนเดียวกัน */
    sendClaim();
    setSubmitOpen(false);
    onDataChanged?.();
  };

  const doPrint = () => {
    const vitalMap = {};
    VITAL_FIELDS.forEach((f) => {
      const v = String(form.vitals?.[f.key] ?? '').trim();
      if (v) vitalMap[f.key] = { label: f.label, value: v, unit: f.unit };
    });
    printHomeVisitSummary({
      patientName: registryEntry?.name || appointment?.name,
      hn,
      groupLabel: resolveGroup(registryEntry?.group || appointment?.group)?.label,
      sourceLabel: resolveSource(registryEntry?.source || appointment?.source)?.label,
      address: registryEntry?.address || appointment?.address,
      visitNo: (appointment?.visitCount || 0) + 1,
      serviceDate: form.serviceDate,
      arrivalTime: form.arrivalTime,
      distanceLabel: form.currentLocation && (registryEntry?.home || appointment?.home)
        ? formatDistance(distanceMeters(form.currentLocation, registryEntry?.home || appointment?.home))
        : '—',
      team: form.team,
      vitals: vitalMap,
      adlScore: adlTotal,
      adlLabel: adlInterp.label,
      assessment: form.assessmentNote,
      roleNotes: ROLE_NOTE_SECTIONS
        .filter((s) => String(form.roleNotes?.[s.profession] || '').trim())
        .map((s) => [s.label, form.roleNotes[s.profession]]),
      activities: CARE_ACTIVITIES.filter((a) => form.activities?.[a.key]).map((a) => a.label),
      orders: [
        ['ยาและเวชภัณฑ์', (form.drugOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['ห้องปฏิบัติการ', (form.labOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['เอกซเรย์', (form.xrayOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
        ['หัตถการ/ต่อเนื่อง', (form.procedureOrders || []).map(homeVisitOrderLabel).join(' · ') || '—'],
      ].filter((row) => row[1] !== '—'),
      familyNote: form.familyNote,
      nextVisitDate: form.nextVisitDate,
      planNote: form.planNote,
      submission,
    });
  };

  return (
    <StepCard>
      {blockedMsg && <NoticeBand tone='danger' icon='error'>{blockedMsg}</NoticeBand>}

      <StepSection>
        <TopicHeader icon='family_restroom'>Family Folder — ข้อมูลครอบครัวและที่อยู่อาศัย</TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          แฟ้มครอบครัว (Family Folder) ตามคู่มือระบบงานสาธารณสุขในชุมชน — ใช้ร่วมกับงานเชิงรุกในชุมชน
        </span>

        {form.familyMembers.length === 0 ? (
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary, #858C92)' }}>
            ยังไม่ได้บันทึกสมาชิกในครอบครัว — กดปุ่มด้านล่างเพื่อเพิ่มสมาชิกที่อาศัยอยู่ในบ้านหลังนี้
          </span>
        ) : (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {form.familyMembers.map((m) => (
              <div key={m.id} className='flex items-end w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <Field label='ชื่อ-สกุล'>
                  <InputField showLabel={false} showHelperText={false} value={m.name} onChange={(v) => updateMember(m.id, 'name', v)} disabled={readOnly} placeholder='ชื่อสมาชิกในครอบครัว' />
                </Field>
                <Field label='ความสัมพันธ์'>
                  <Select
                    showLabel={false} showHelperText={false} searchable={false} size='lg'
                    value={m.relation} onChange={(v) => updateMember(m.id, 'relation', v)} disabled={readOnly}
                    options={FAMILY_RELATIONS.map((r) => ({ value: r, label: r }))}
                    placeholder='เลือกความสัมพันธ์'
                  />
                </Field>
                <Field label='อายุ (ปี)'>
                  <InputField showLabel={false} showHelperText={false} value={m.age} onChange={(v) => updateMember(m.id, 'age', v)} disabled={readOnly} placeholder='ปี' />
                </Field>
                <Field label='ภาวะสุขภาพ'>
                  <InputField showLabel={false} showHelperText={false} value={m.health} onChange={(v) => updateMember(m.id, 'health', v)} disabled={readOnly} placeholder='เช่น สุขภาพดี / เบาหวาน' />
                </Field>
                {!readOnly && (
                  <BrandIconButton icon='close' variant='ghost' size='sm' onClick={() => removeMember(m.id)} aria-label='ลบสมาชิก' />
                )}
              </div>
            ))}
          </div>
        )}
        {!readOnly && <BrandDashedAddButton onClick={addMember}>เพิ่มสมาชิกในครอบครัว</BrandDashedAddButton>}

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='ลักษณะที่อยู่อาศัย'>
            <Select showLabel={false} showHelperText={false} searchable={false} size='lg' value={form.houseType} onChange={set('houseType')} disabled={readOnly} options={HOUSE_TYPE_OPTIONS} placeholder='เลือกลักษณะบ้าน' />
          </Field>
          <Field label='กรรมสิทธิ์ที่อยู่อาศัย'>
            <Select showLabel={false} showHelperText={false} searchable={false} size='lg' value={form.houseOwnership} onChange={set('houseOwnership')} disabled={readOnly} options={HOUSE_OWNERSHIP_OPTIONS} placeholder='เลือกกรรมสิทธิ์' />
          </Field>
          <Field label='แหล่งน้ำดื่ม'>
            <Select showLabel={false} showHelperText={false} searchable={false} size='lg' value={form.waterSource} onChange={set('waterSource')} disabled={readOnly} options={WATER_SOURCE_OPTIONS} placeholder='เลือกแหล่งน้ำ' />
          </Field>
          <Field label='ส้วม/สุขา'>
            <Select showLabel={false} showHelperText={false} searchable={false} size='lg' value={form.toilet} onChange={set('toilet')} disabled={readOnly} options={TOILET_OPTIONS} placeholder='เลือกลักษณะส้วม' />
          </Field>
        </div>

        <SuggestibleTextarea
          label='บันทึก Family Folder'
          voice
          value={form.familyNote}
          onChange={(e) => set('familyNote')(e.target.value)}
          suggestions={HOMEVISIT_FAMILY_SUGGESTIONS}
          minChars={3}
          disabled={readOnly}
          placeholder='โครงสร้างครอบครัว ผู้ดูแลหลัก เศรษฐานะ และปัจจัยเสี่ยงของครัวเรือน'
        />
      </StepSection>

      <StepSection>
        <TopicHeader icon='send'>ส่งข้อมูลกลับศูนย์บริการสาธารณสุขและงานเชิงรุกในชุมชน</TopicHeader>
        <div className='flex items-center w-full flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <BrandSubdueButton
            variant='fill' size='md' leadingIcon='send'
            onClick={() => setSubmitOpen(true)}
            disabled={readOnly || !!submission}
          >
            ส่งข้อมูลเข้ารักษาที่ศูนย์บริการสาธารณสุข
          </BrandSubdueButton>
          <NeutralSubdueButton
            variant='outline' size='md' leadingIcon='diversity_3'
            onClick={() => routerHistory.push({
              pathname: '/checkup/community',
              state: { hn, from: 'homevisit', name: registryEntry?.name || appointment?.name },
            })}
          >
            บันทึกงานเชิงรุกในโมดูลงานชุมชน
          </NeutralSubdueButton>
          <NeutralSubdueButton variant='outline' size='md' leadingIcon='print' onClick={doPrint}>
            พิมพ์ใบสรุปเยี่ยมบ้าน
          </NeutralSubdueButton>
        </div>

        {submission ? (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug' maxWidth={520}>
              ส่งข้อมูลเข้า{submission.center}แล้ว
            </ColorfulBadge>
            <AuditStamp by={submission.by} at={submission.at} prefix='ส่งโดย' />
            <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              ส่งซ้ำไม่ได้ — หากต้องแก้ไขข้อมูลที่ส่งไปแล้ว ให้แก้ที่บันทึกการเยี่ยมและแจ้งศูนย์บริการฯ โดยตรง
            </span>
          </div>
        ) : (
          <NoticeBand tone='warning' icon='outbox'>
            ยังไม่ได้ส่งข้อมูลการเยี่ยมครั้งนี้เข้าศูนย์บริการฯ — ระบบจะสรุปสัญญาณชีพ ผลประเมิน ADL
            คำสั่งการรักษา และแผนการดูแล ส่งเข้าเวชระเบียนของศูนย์บริการฯ เมื่อกดปุ่มด้านบน
          </NoticeBand>
        )}
      </StepSection>

      {/* §1.7.1.1 (มติ คทง.4) — ส่งชุดข้อมูลเบิกจ่าย สปสช. ต่ออัตโนมัติ */}
      <StepSection>
        <TopicHeader
          icon='cloud_sync'
          aside={nhsoClaim ? (
            <ColorfulBadge
              style={nhsoClaim.status === 'accepted' ? 'teal' : 'orange'}
              size='small' hierarchy='secondary' width='hug' maxWidth={420}
            >
              {nhsoClaim.status === 'accepted' ? `ส่งสำเร็จ · เลขอ้างอิง ${nhsoClaim.ref}` : 'ข้อมูลไม่ครบ — ยังส่งไม่ผ่าน'}
            </ColorfulBadge>
          ) : undefined}
        >
          ส่งข้อมูลเบิกจ่ายให้ สปสช. อัตโนมัติ
        </TopicHeader>
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          คีย์ข้อมูลที่ระบบนี้ที่เดียว ระบบส่งชุดข้อมูลที่ สปสช. ต้องการต่อให้เอง —
          ไม่ต้องคีย์ซ้ำในระบบ BKK Home Care ซึ่งเป็นต้นเหตุที่ข้อมูลไม่ครบจนเบิกจ่ายไม่ได้
        </span>

        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {NHSO_REQUIRED_FIELDS.map((f) => {
            const ok = !!String(f.get(claimContext) || '').trim();
            return (
              <ColorfulBadge
                key={f.key}
                style={ok ? 'teal' : 'red'}
                size='small'
                hierarchy='secondary'
                width='hug'
                maxWidth={320}
                showIcon
                icon={ok ? 'check' : 'close'}
              >
                {f.label}
              </ColorfulBadge>
            );
          })}
        </div>

        {nhsoClaim ? (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <AuditStamp by={nhsoClaim.by} at={nhsoClaim.at} prefix='ส่งชุดข้อมูล สปสช. โดย' />
            {nhsoClaim.status === 'incomplete' && (
              <>
                <NoticeBand tone='danger' icon='sync_problem'>
                  สปสช. ตีกลับเพราะข้อมูลไม่ครบ — ขาด {nhsoClaim.missing.join(' · ')}
                  {' '}กรุณากลับไปเติมให้ครบแล้วกดส่งอีกครั้ง
                </NoticeBand>
                <div>
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='refresh' onClick={sendClaim} disabled={readOnly}>
                    ส่งชุดข้อมูลอีกครั้ง
                  </NeutralSubdueButton>
                </div>
              </>
            )}
          </div>
        ) : (
          <NoticeBand tone='neutral' icon='schedule_send'>
            ระบบจะส่งชุดข้อมูลให้ สปสช. อัตโนมัติทันทีที่กด “ส่งข้อมูลเข้ารักษาที่ศูนย์บริการสาธารณสุข”
            ด้านบน — ไม่ต้องกดส่งแยกอีกขั้นตอน
          </NoticeBand>
        )}
      </StepSection>

      <StepSection>
        <TopicHeader icon='calendar'>นัดเยี่ยมครั้งถัดไปและแผนการดูแล</TopicHeader>
        <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <Field label='วันนัดเยี่ยมครั้งถัดไป' required>
            <DatePicker
              showLabel={false}
              value={form.nextVisitDate ? new Date(form.nextVisitDate) : null}
              onChange={(d) => set('nextVisitDate')(d ? d.toISOString().slice(0, 10) : '')}
              disabled={readOnly}
              placeholder='เลือกวันที่'
            />
          </Field>
          <Field label='ช่วงเวลา'>
            <Select
              showLabel={false} showHelperText={false} searchable={false} size='lg'
              value={form.nextVisitSlot} onChange={set('nextVisitSlot')} disabled={readOnly}
              options={HOMEVISIT_TIME_SLOTS}
              placeholder='เลือกช่วงเวลา'
            />
          </Field>
        </div>
        <SuggestibleTextarea
          label='แผนการดูแลต่อเนื่อง'
          voice
          value={form.planNote}
          onChange={(e) => set('planNote')(e.target.value)}
          suggestions={HOMEVISIT_PLAN_SUGGESTIONS}
          minChars={3}
          disabled={readOnly}
          placeholder='สิ่งที่ต้องติดตามครั้งถัดไป ผู้รับผิดชอบ และการประสานหน่วยงานที่เกี่ยวข้อง'
        />
      </StepSection>

      <Popup
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title='ยืนยันส่งข้อมูลเข้ารักษาที่ศูนย์บริการสาธารณสุข'
        subtitle={`${registryEntry?.name || appointment?.name || ''} · HN: ${hn || '—'}`}
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setSubmitOpen(false) }}
        primaryAction={{ label: 'ยืนยันส่งข้อมูล', onClick: confirmSubmit }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
          <span>ระบบจะส่งข้อมูลต่อไปนี้เข้าเวชระเบียนของ{HOMEVISIT_CENTER}:</span>
          <span>· สัญญาณชีพและผลการประเมินการเยี่ยมครั้งนี้</span>
          <span>· คะแนน ADL {adlTotal}/{BARTHEL_MAX_SCORE} ({adlInterp.label})</span>
          <span>· คำสั่งการรักษา: {summarizeOrders(form, homeVisitOrderLabel)}</span>
          <span>· นัดเยี่ยมครั้งถัดไป: {form.nextVisitDate ? formatHomeVisitDate(form.nextVisitDate) : 'ยังไม่กำหนด'}</span>
          <NoticeBand tone='warning' icon='warning'>
            เมื่อส่งแล้วจะส่งซ้ำไม่ได้ และข้อมูลจะปรากฏในหน้าติดตามการเยี่ยมบ้านทันที
          </NoticeBand>
        </div>
      </Popup>
    </StepCard>
  );
};

export const HOMEVISIT_STEP_RENDERERS = [
  HomeVisitStep1Service,
  HomeVisitStep2Address,
  HomeVisitStep2History,
  HomeVisitStep3Vitals,
  HomeVisitStep4Assessment,
  HomeVisitStep5Care,
  HomeVisitStep6Orders,
  HomeVisitStep7Family,
];

export default HOMEVISIT_STEP_RENDERERS;
