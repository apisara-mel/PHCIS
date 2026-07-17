import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  Sym,
  Textarea,
  SuccessCard,
  SUCCESS_CARD_BG,
  MobileOptionCard,
  ClinicCard,
  DoctorCard,
  BookingCalendar,
  LocationPermissionPopup,
  AppNotification,
  buildAppointmentConfirmBody,
  BrandSubdueButton,
  BrandSubdueIconButton,
} from '@/components/mobile';
import {
  BookingWizardShell,
  BookingPanel,
  BookingSearchRow,
  DoctorSummaryCard,
  ConfirmDetailRow,
  InfoAlert,
  BOOKING_STEP_META,
} from '@/components/mobile/BookingWizard';
import {
  BookingMapSheet,
  BookingSortSheet,
  BookingCalendarSheet,
  BookingSlotFullSheet,
  BookingChangeDoctorSheet,
  SORT_OPTIONS,
  toBeKey,
} from '@/components/mobile/BookingSheets';
import { CLINICS, DOCTORS } from '@/data/mobileMock';
import { bookAppointment, updateAppointment } from '@/data/phcisLink';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import useSearchHistory from '@/components/search/useSearchHistory';

/* BMA Health · Booking — Archive Figma 4WXeI8fgBLQGgQ9VheM2yD · 173:82969
   Flow: ประเภทบริการ (58:26028) → แผนก → ศูนย์ → แพทย์ → วัน/เวลา → ยืนยัน → สำเร็จ
   Wizard stepper = 5 steps (แผนก…ยืนยัน); serviceType is a pre-step (no bar).
   Annotation cases:
   · Search · No recent search · Sorting · ดูแผนที่
   · เปลี่ยนวัน · เปลี่ยนแพทย์ · Slot เต็ม */

const STEPS = ['serviceType', 'dept', 'centre', 'doctor', 'datetime', 'confirm', 'success'];

/* Service-type hero — Lottie “Online health checkup” (600×600 → 128 display) */
const SERVICE_TYPE_HERO_LOTTIE = '/illustration/mobile/online-health-checkup.json';
const SERVICE_TYPE_HERO_FALLBACK = '/illustration/mobile/booking-service-type-hero.png';
const SERVICE_TYPE_HERO_SIZE = 128;
const SEARCH_EMPTY_LOTTIE = '/illustration/mobile/search-history-empty.json';
const SEARCH_EMPTY_FALLBACK = '/illustration/mobile/search-history-empty.png';

const SERVICE_TYPES = [
  {
    key: 'clinic',
    title: 'เข้ารับบริการที่ศูนย์',
    subtitle: 'พบแพทย์และรับบริการ ณ ศูนย์บริการสาธารณสุขใกล้บ้าน',
    icon: '/illustration/mobile/booking-svc-clinic.svg',
  },
  {
    key: 'online',
    title: 'เข้ารับบริการออนไลน์ (Telemedicine)',
    subtitle: 'พูดคุยกับแพทย์ผ่านวิดีโอคอล',
    icon: '/illustration/mobile/booking-svc-telemed.svg',
  },
];

/* บริการที่ศูนย์บริการสาธารณสุข กทม. (ศบส.) ให้จริง — หน่วยบริการปฐมภูมิ
   ไม่ใช่คลินิกเฉพาะทางแบบโรงพยาบาล. อ้างอิงชุดบริการมาตรฐานของสำนักอนามัย
   กรุงเทพมหานคร (ตรวจโรคทั่วไป · ทันตกรรม · NCD · แม่และเด็ก · วัณโรค ฯลฯ). */
const DEPARTMENTS = [
  { key: 'general', label: 'ตรวจรักษาโรคทั่วไป', subtitle: 'ตรวจรักษาโรคเบื้องต้นและเวชปฏิบัติทั่วไป', searchTerms: ['อายุรกรรม'], recent: true },
  { key: 'dental', label: 'ทันตกรรม', subtitle: 'ตรวจ อุด ถอน ขูดหินปูน และดูแลช่องปาก', recent: true },
  { key: 'chronic', label: 'คลินิกโรคเรื้อรัง (เบาหวาน/ความดัน)', subtitle: 'ติดตามดูแลผู้ป่วยเบาหวานและความดันโลหิตสูง' },
  { key: 'anc', label: 'คลินิกฝากครรภ์ (ANC)', subtitle: 'ดูแลสุขภาพหญิงตั้งครรภ์และทารกในครรภ์' },
  { key: 'wellbaby', label: 'คลินิกสุขภาพเด็กดี', subtitle: 'ตรวจพัฒนาการและให้วัคซีนตามวัย', searchTerms: ['กุมารเวชกรรม'] },
  { key: 'planning', label: 'วางแผนครอบครัว', subtitle: 'ให้คำปรึกษาและบริการคุมกำเนิด' },
  { key: 'tb', label: 'คลินิกวัณโรค', subtitle: 'คัดกรองและรักษาผู้ป่วยวัณโรค' },
  { key: 'sti', label: 'คลินิกโรคติดต่อทางเพศสัมพันธ์', subtitle: 'ตรวจรักษาและให้คำปรึกษาโรคติดต่อทางเพศสัมพันธ์' },
  { key: 'mind', label: 'คลินิกสุขภาพจิต', subtitle: 'ประเมินและให้คำปรึกษาปัญหาสุขภาพจิต' },
  { key: 'physio', label: 'กายภาพบำบัด', subtitle: 'ฟื้นฟูสมรรถภาพและกายภาพบำบัด', searchTerms: ['กระดูกและข้อ'] },
  { key: 'elder', label: 'คลินิกผู้สูงอายุ', subtitle: 'ตรวจประเมินและดูแลสุขภาพผู้สูงอายุ' },
  { key: 'thaimed', label: 'แพทย์แผนไทย', subtitle: 'นวด ประคบ อบสมุนไพร และเวชกรรมไทย' },
  { key: 'quitsmoke', label: 'คลินิกเลิกบุหรี่', subtitle: 'ให้คำปรึกษาและช่วยเลิกบุหรี่' },
  { key: 'vaccine', label: 'ฉีดวัคซีน / สร้างเสริมภูมิคุ้มกัน', subtitle: 'บริการวัคซีนสำหรับเด็กและผู้ใหญ่' },
];

/* เวลาทำการมาตรฐานของ ศบส. กทม. — ในเวลาราชการ · นอกเวลา · วันหยุด
   (Figma 125:5748 แสดงสามแถวพร้อมป้ายกำกับ). */
const CENTRE_HOURS = [
  { label: 'เวลาราชการ', time: '08.00-16.00น.' },
  { label: 'นอกเวลา', time: '16.01-20.00น.' },
  { label: 'วันหยุดพิเศษ', time: '08.00-12.00น.' },
];

/* Map each service to a CLINICS department key so the centre step can filter.
   Services without a dedicated mock clinic fall back to 'general' (offered by
   every ศบส.), so the flow always surfaces at least the general centres. */
const DEPT_TO_MOCK = {
  general: 'general',
  dental: 'dental',
  chronic: 'chronic',
  anc: 'anc',
  wellbaby: 'wellbaby',
  tb: 'tb',
};

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_WEEKDAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

const BOOKED_SLOTS = new Set(['08:15', '09:30', '09:45', '10:45', '11:15', '14:45', '15:15', '17:00', '17:30', '18:45']);

/* Demo: Wednesdays after first week are fully booked (Slot เต็ม). */
const FULL_SLOT_WEEKDAYS = new Set([3]);

const TIME_PERIODS = [
  {
    key: 'morning',
    label: 'ช่วงเช้า (09:00 - 12:00)',
    slots: ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00'],
  },
  {
    key: 'afternoon',
    label: 'ช่วงบ่าย (13:00 - 16:00)',
    slots: ['13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45'],
  },
  {
    key: 'evening',
    label: 'นอกเวลา (16:01 - 20:00)',
    slots: ['16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00'],
  },
];

const ALL_SLOTS = TIME_PERIODS.flatMap((p) => p.slots);

const parseBeKey = (key) => {
  if (!key) return null;
  const [yBe, mm, dd] = String(key).split('-').map(Number);
  if (!yBe || !mm || !dd) return null;
  return new Date(yBe - 543, mm - 1, dd);
};

const formatThaiDateShort = (beKey) => {
  const d = parseBeKey(beKey);
  if (!d) return beKey;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.getTime() === today.getTime();
  const label = `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
  return isToday ? `วันนี้, ${label}` : label;
};

/* Figma Notification 175:90671 — "5 ก.ค. 2569" (day · short month · BE year) */
const formatThaiDateWithBeYear = (beKey) => {
  const d = parseBeKey(beKey);
  if (!d) return beKey;
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const notificationsEnabled = () => {
  try {
    const raw = window.localStorage.getItem('phcis_mobile_settings_v1');
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.notifications !== false;
  } catch {
    return true;
  }
};

const buildDateOptions = () => {
  const out = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 3); /* sticky: จองล่วงหน้าอย่างน้อย 3 วัน */
  for (let i = 0; i < 21; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    /* Skip some mid-week days as "วันที่ไม่พร้อมให้บริการ" */
    const unavailable = i > 7 && d.getDay() === 0;
    if (unavailable) continue;
    out.push({
      key: toBeKey(d),
      weekday: THAI_WEEKDAYS_SHORT[d.getDay()],
      day: d.getDate(),
      month: d.getMonth(),
      jsDate: d,
      slotFull: FULL_SLOT_WEEKDAYS.has(d.getDay()) && i >= 4,
    });
  }
  return out;
};

const enrichDoctor = (d) => ({
  ...d,
  license: d.license || `ว.${12340 + Number(String(d.id).replace(/\D/g, '') || 1)}`,
});

const sortLabel = (key) => {
  const option = SORT_OPTIONS.find((item) => item.key === key);
  return option?.triggerLabel || option?.label || 'ใกล้ที่สุด';
};

const MobileBookInner = ({ onShellBackground }) => {
  const history = useHistory();
  const { search } = useLocation();
  const reschedule = new URLSearchParams(search).get('reschedule');

  const [step, setStep] = useState('serviceType');
  const [dept, setDept] = useState(null);
  const [clinic, setClinic] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [symptom, setSymptom] = useState('');
  const [wantCert, setWantCert] = useState(null);
  const [serviceType, setServiceType] = useState(null);
  const [deptQuery, setDeptQuery] = useState('');
  const [deptSearchOpen, setDeptSearchOpen] = useState(false);
  const [centreQuery, setCentreQuery] = useState('');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [centreSort, setCentreSort] = useState('nearest');
  const deptSearchHistory = useSearchHistory('mih:mobile-book:department-search', { limit: 4 });

  /* Annotation sheets */
  const [mapClinic, setMapClinic] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [slotFullOpen, setSlotFullOpen] = useState(false);
  const [changeDoctorOpen, setChangeDoctorOpen] = useState(false);
  /* datetime step is two screens (Figma 140:9464 → 140:21752):
     'date' picks the day (calendar), then ถัดไป → 'time' picks the slot. */
  const [datePhase, setDatePhase] = useState('date');
  /* Location permission (Figma 253:35159) — asked when picking "ที่ศูนย์"
     before dept selection, so centres can be sorted by distance. */
  const [locationPopup, setLocationPopup] = useState(false);
  const [, setLocationGranted] = useState(false);
  const [serviceTypeHeroAnim, setServiceTypeHeroAnim] = useState(null);
  const [searchEmptyAnim, setSearchEmptyAnim] = useState(null);
  /* Archive Figma 175:90671 — in-app confirm banner after booking success */
  const [bookingNoti, setBookingNoti] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(SERVICE_TYPE_HERO_LOTTIE)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setServiceTypeHeroAnim(d); })
      .catch(() => { /* PNG fallback */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(SEARCH_EMPTY_LOTTIE)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (alive) setSearchEmptyAnim(data); })
      .catch(() => { /* PNG fallback */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    onShellBackground?.(
      deptSearchOpen
        ? 'var(--surface-navigation-default, #FFFFFF)'
        : step === 'success'
        ? SUCCESS_CARD_BG
        : 'var(--background-screen-brand-100, #F4FBF8)',
    );
  }, [step, deptSearchOpen, onShellBackground]);

  /* Leaving service-type: on-site visit asks for location first; online skips. */
  const leaveServiceType = () => {
    if (serviceType === 'clinic') setLocationPopup(true);
    else go('dept');
  };

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const availableDateKeys = useMemo(() => dateOptions.map((d) => d.key), [dateOptions]);

  const idx = STEPS.indexOf(step);
  const go = (s) => setStep(s);
  const goBack = () => {
    if (idx <= 0) history.push('/m/home');
    else setStep(STEPS[idx - 1]);
  };

  const mockDeptKey = DEPT_TO_MOCK[dept?.key] || 'general';

  const filteredDepts = useMemo(() => {
    const q = deptQuery.trim().toLowerCase();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => (
      d.label.includes(q)
      || d.subtitle.includes(q)
      || d.searchTerms?.some((term) => term.includes(q))
    ));
  }, [deptQuery]);

  const recentDepts = DEPARTMENTS.filter((d) => d.recent);
  /* Case: No recent search — hide recent block while searching or when empty */
  const showRecentDepts = !deptQuery.trim() && recentDepts.length > 0;

  const filteredClinics = useMemo(() => {
    const withDept = CLINICS.filter((c) => c.departments.some((d) => d.key === mockDeptKey));
    let list = withDept.length ? [...withDept] : [...CLINICS];
    const q = centreQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => (
        String(c.number).includes(q)
        || (c.shortName || '').toLowerCase().includes(q)
        || c.name.toLowerCase().includes(q)
      ));
    }
    if (centreSort === 'name') {
      list.sort((a, b) => (a.shortName || a.name).localeCompare(b.shortName || b.name, 'th'));
    } else if (centreSort === 'number') {
      list.sort((a, b) => Number(a.number) - Number(b.number));
    } else {
      list.sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99));
    }
    return list;
  }, [centreQuery, mockDeptKey, centreSort]);

  /* "ศูนย์บริการที่ใช้บริการล่าสุด" — ศูนย์ที่เคยใช้บริการ (สูงสุด 5)
     เรียงตามระยะทาง, ไม่ผูกกับแผนกที่เลือก, ซ่อนขณะค้นหา. */
  const recentClinics = useMemo(() => {
    if (centreQuery.trim()) return [];
    return CLINICS
      .filter((c) => c.recent)
      .sort((a, b) => (a.distanceKm || 99) - (b.distanceKm || 99))
      .slice(0, 5);
  }, [centreQuery]);

  const doctorOptions = useMemo(() => {
    if (!clinic) return [];
    let list = DOCTORS.filter((d) => d.clinics.includes(clinic.code));
    if (mockDeptKey !== 'general') {
      const byDept = list.filter((d) => d.dept === mockDeptKey);
      if (byDept.length) list = byDept;
    }
    return list.map(enrichDoctor);
  }, [clinic, mockDeptKey]);

  const filteredDoctors = useMemo(() => {
    const q = doctorQuery.trim().toLowerCase();
    if (!q) return doctorOptions;
    return doctorOptions.filter((d) => (
      d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
    ));
  }, [doctorOptions, doctorQuery]);

  const selectedDateMeta = dateOptions.find((d) => d.key === date);
  const dateIsSlotFull = Boolean(selectedDateMeta?.slotFull);

  const openSlotsForDate = useMemo(() => {
    if (!date || dateIsSlotFull) return [];
    return ALL_SLOTS.filter((t) => !BOOKED_SLOTS.has(t));
  }, [date, dateIsSlotFull]);

  useEffect(() => {
    if (step === 'datetime' && datePhase === 'time' && date && dateIsSlotFull) {
      setSlotFullOpen(true);
      setTime(null);
    }
  }, [step, datePhase, date, dateIsSlotFull]);

  const confirmBooking = () => {
    if (!date || !time || !clinic || !doctor || !serviceType || !symptom.trim() || wantCert == null) return;
    const payload = {
      type: serviceType === 'online' ? 'video' : 'visit',
      date,
      time,
      clinic: clinic.code,
      deptKey: mockDeptKey,
      deptLabel: dept?.label || 'ตรวจรักษาทั่วไป',
      doctor: doctor.name,
      note: symptom,
      locationLabel: `ศูนย์ ${clinic.number}, ${clinic.shortName || clinic.name}`,
      certRequested: wantCert,
    };
    if (reschedule) {
      updateAppointment(reschedule, { ...payload, status: 'upcoming' });
    } else {
      bookAppointment(payload);
    }
    if (notificationsEnabled()) {
      setBookingNoti({
        title: 'ยืนยันการนัดหมายแล้ว',
        body: buildAppointmentConfirmBody({
          doctor: doctor.name,
          dateLabel: formatThaiDateWithBeYear(date),
          time,
        }),
      });
    }
    go('success');
  };

  const sheets = (
    <>
      <BookingMapSheet
        open={Boolean(mapClinic)}
        clinic={mapClinic}
        hoursRows={CENTRE_HOURS}
        onClose={() => setMapClinic(null)}
      />
      <BookingSortSheet
        open={sortOpen}
        value={centreSort}
        onSelect={setCentreSort}
        onClose={() => setSortOpen(false)}
      />
      <BookingCalendarSheet
        open={calendarOpen}
        selectedKey={date}
        availableKeys={availableDateKeys}
        onSelect={(key) => { setDate(key); setTime(null); }}
        onClose={() => setCalendarOpen(false)}
      />
      <BookingSlotFullSheet
        open={slotFullOpen}
        onClose={() => setSlotFullOpen(false)}
        onChangeDate={() => { setSlotFullOpen(false); setCalendarOpen(true); }}
        onChangeDoctor={() => { setSlotFullOpen(false); setChangeDoctorOpen(true); }}
      />
      <BookingChangeDoctorSheet
        open={changeDoctorOpen}
        doctors={doctorOptions}
        currentDoctor={doctor}
        selectedId={doctor?.id}
        centreName={clinic?.shortName}
        onSelect={(d) => { setDoctor(d); setTime(null); }}
        onClose={() => setChangeDoctorOpen(false)}
      />
    </>
  );

  const pageWrap = { position: 'relative', height: '100%', overflow: 'hidden' };

  /* Figma 253:32666 — focused department search replaces the wizard chrome
     with a compact back/search/cancel header and recent-search chips. */
  if (step === 'dept' && deptSearchOpen) {
    const closeSearch = () => {
      setDeptSearchOpen(false);
      setDeptQuery('');
    };
    const hasQuery = Boolean(deptQuery.trim());

    return (
      <div
        className='flex flex-col'
        style={{
          height: '100%',
          minHeight: '100%',
          background: 'var(--surface-navigation-default, #FFFFFF)',
        }}
      >
        <div
          className='flex items-center shrink-0'
          style={{
            height: 'var(--dim-size-1500, 68px)',
            padding: '0 var(--dim-space-200, 8px)',
            gap: 'var(--dim-space-300, 12px)',
            background: 'var(--surface-navigation-default, #FFFFFF)',
          }}
        >
          <button
            type='button'
            aria-label='ย้อนกลับ'
            onClick={closeSearch}
            className='inline-flex items-center justify-center shrink-0'
            style={{
              width: 'var(--dim-size-800, 40px)',
              height: 'var(--dim-size-800, 40px)',
              padding: 'var(--dim-space-200, 8px)',
              border: 0,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'transparent',
              color: 'var(--text-content-secondary, #636B72)',
              cursor: 'pointer',
            }}
          >
            <Sym name='chevron_left' size={24} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <BookingSearchRow
              placeholder='อายุรกรรม'
              value={deptQuery}
              onChange={setDeptQuery}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeSearch();
              }}
              autoFocus
              focused
            />
          </div>

          <button
            type='button'
            onClick={closeSearch}
            style={{
              minWidth: 'var(--dim-size-1500, 68px)',
              height: 'var(--dim-size-1200, 56px)',
              padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
              border: 0,
              borderRadius: 'var(--dim-radius-full, 9999px)',
              background: 'transparent',
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            ยกเลิก
          </button>
        </div>

        <div
          className='flex-1 overflow-y-auto flex flex-col'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-400, 16px)',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: 'var(--text-brandPrimary-default, #007549)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg, 18px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
          >
            {hasQuery ? 'ผลการค้นหา' : 'ค้นหาล่าสุด'}
          </h2>

          {!hasQuery ? (
            deptSearchHistory.history.length > 0 ? (
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                {deptSearchHistory.history.map((term) => (
                  <button
                    key={typeof term === 'string' ? term : term.id || term.value || term.label}
                    type='button'
                    onClick={() => {
                      setDeptQuery(typeof term === 'string' ? term : term.value || term.label);
                      setDeptSearchOpen(false);
                    }}
                    style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                  >
                    <ColorfulBadge
                      style='green'
                      size='default'
                      fill='outline'
                      hierarchy='secondary'
                      width='hug'
                    >
                      {typeof term === 'string' ? term : term.label}
                    </ColorfulBadge>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className='flex flex-col items-center'
                style={{
                  width: '100%',
                  gap: 'var(--dim-space-300, 12px)',
                }}
              >
                {searchEmptyAnim ? (
                  <LottieIllustration
                    animationData={searchEmptyAnim}
                    size='var(--dim-size-1900, 112px)'
                    loop
                    ariaLabel=''
                  />
                ) : (
                  <img
                    src={SEARCH_EMPTY_FALLBACK}
                    alt=''
                    aria-hidden
                    width={112}
                    height={112}
                    style={{
                      width: 'var(--dim-size-1900, 112px)',
                      height: 'var(--dim-size-1900, 112px)',
                      display: 'block',
                    }}
                  />
                )}
                <p
                  style={{
                    width: '100%',
                    margin: 0,
                    textAlign: 'center',
                    color: 'var(--text-neutral-default, #4D5358)',
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-base, 16px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    lineHeight: 1.5,
                  }}
                >
                  ยังไม่มีประวัติการค้นหา
                </p>
              </div>
            )
          ) : (
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {filteredDepts.map((item) => (
                <MobileOptionCard
                  key={item.key}
                  title={item.label}
                  subtitle={item.subtitle}
                  selected={dept?.key === item.key}
                  onClick={() => {
                    deptSearchHistory.push(deptQuery.trim() || item.searchTerms?.[0] || item.label);
                    setDept(item);
                    setDeptSearchOpen(false);
                    setDeptQuery('');
                  }}
                />
              ))}
              {!filteredDepts.length && (
                <p
                  style={{
                    margin: 0,
                    color: 'var(--text-content-tertiary, #858C92)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    lineHeight: 1.5,
                  }}
                >
                  ไม่พบแผนกที่ตรงกับคำค้นหา
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── Pre-step: Service type — Figma 58:26028 ─────────────────────── */
  if (step === 'serviceType') {
    return (
      <div style={pageWrap}>
        <BookingWizardShell
          stepKey='serviceType'
          title='เลือกประเภทบริการ'
          onBack={goBack}
          footerLabel='ถัดไป'
          footerDisabled={!serviceType}
          onFooter={leaveServiceType}
          contentStyle={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
          }}
        >
          <div
            className='flex flex-col flex-1 min-h-0'
            style={{
              background: 'var(--surface-card-100, #FFFFFF)',
              borderRadius: 'var(--dim-radius-600, 24px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              paddingTop: 'var(--dim-space-600, 24px)',
              overflow: 'hidden',
            }}
          >
            <div
              className='flex flex-col items-center shrink-0'
              style={{ gap: 'var(--dim-space-150, 6px)', padding: '0 var(--dim-space-400, 16px)' }}
            >
              <span className='overflow-hidden shrink-0' style={{ width: SERVICE_TYPE_HERO_SIZE, height: SERVICE_TYPE_HERO_SIZE }}>
                {serviceTypeHeroAnim ? (
                  <LottieIllustration
                    animationData={serviceTypeHeroAnim}
                    size={SERVICE_TYPE_HERO_SIZE}
                    loop
                    ariaLabel=''
                  />
                ) : (
                  <img
                    src={SERVICE_TYPE_HERO_FALLBACK}
                    alt=''
                    width={SERVICE_TYPE_HERO_SIZE}
                    height={SERVICE_TYPE_HERO_SIZE}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                )}
              </span>
              <h2
                style={{
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  lineHeight: 1.375,
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                เลือกประเภทบริการที่ต้องการนัดหมาย
              </h2>
            </div>

            <div
              className='flex flex-col flex-1'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                padding: 'var(--dim-space-600, 24px) var(--dim-space-400, 16px)',
              }}
            >
              {SERVICE_TYPES.map((opt) => (
                <MobileOptionCard
                  key={opt.key}
                  align='start'
                  title={opt.title}
                  subtitle={opt.subtitle}
                  selected={serviceType === opt.key}
                  onClick={() => setServiceType(opt.key)}
                  illustration={(
                    <img
                      src={opt.icon}
                      alt=''
                      width={36}
                      height={36}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  )}
                />
              ))}
            </div>
          </div>
        </BookingWizardShell>
        {sheets}
        {locationPopup && (
          <LocationPermissionPopup
            onAllow={() => { setLocationGranted(true); setLocationPopup(false); go('dept'); }}
            onDeny={() => { setLocationGranted(false); setLocationPopup(false); go('dept'); }}
          />
        )}
      </div>
    );
  }

  /* Success — Archive Figma 175:94673 via SuccessCard
     + in-app Notification 175:90671 after confirm */
  if (step === 'success') {
    return (
      <>
        {bookingNoti && (
          <AppNotification
            title={bookingNoti.title}
            body={bookingNoti.body}
            delay={3000}
            onDismiss={() => setBookingNoti(null)}
            onClick={() => history.push('/m/appointments')}
          />
        )}
        <SuccessCard
          title={reschedule ? 'เลื่อนนัดหมายสำเร็จ' : 'สร้างนัดหมายสำเร็จ'}
          description={(
            <>
              ระบบได้บันทึกการนัดหมายของคุณเรียบร้อยแล้ว กรุณารอการยืนยันจากเจ้าหน้าที่ภายใน 5 วัน
              <br />
              ซึ่งอาจจะมีการเปลี่ยนแปลง
            </>
          )}
          primaryAction={{
            label: 'ดูการนัดหมาย',
            onClick: () => history.push('/m/appointments'),
            showTailingIcon: true,
            tailingIcon: 'chevron_right',
          }}
          secondaryAction={{
            label: 'กลับสู่หน้าหลัก',
            onClick: () => history.push('/m/home'),
            showTailingIcon: true,
            tailingIcon: 'chevron_right',
          }}
        />
      </>
    );
  }

  /* ─── Step 1: Department ─────────────────────────────────────────── */
  if (step === 'dept') {
    return (
      <div style={pageWrap}>
        <BookingWizardShell
          stepKey='dept'
          title={BOOKING_STEP_META.dept.title}
          onBack={goBack}
          footerLabel='ถัดไป'
          footerDisabled={!dept}
          onFooter={() => go('centre')}
          contentStyle={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
          }}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <BookingPanel title='เลือกแผนกที่ต้องการนัดหมาย'>
              <BookingSearchRow
                placeholder='ค้นหาแผนก'
                value={deptQuery}
                onChange={setDeptQuery}
                onFocus={() => setDeptSearchOpen(true)}
              />
            </BookingPanel>

            {showRecentDepts && (
              <BookingPanel variant='section' title='แผนกที่ใช้บริการล่าสุด'>
                <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  {recentDepts.map((d) => (
                    <MobileOptionCard
                      key={d.key}
                      width={256}
                      title={d.label}
                      subtitle={d.subtitle}
                      selected={dept?.key === d.key}
                      onClick={() => setDept(d)}
                    />
                  ))}
                </div>
              </BookingPanel>
            )}

            <BookingPanel variant='section' title='แผนกทั้งหมด'>
              {filteredDepts.map((d) => (
                <MobileOptionCard
                  key={d.key}
                  title={d.label}
                  subtitle={d.subtitle}
                  selected={dept?.key === d.key}
                  onClick={() => setDept(d)}
                />
              ))}
              {!filteredDepts.length && (
                <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)' }}>
                  ไม่พบแผนกที่ตรงกับคำค้นหา
                </p>
              )}
            </BookingPanel>
          </div>
        </BookingWizardShell>
        {sheets}
      </div>
    );
  }

  /* ─── Step 2: Centre ─────────────────────────────────────────────── */
  if (step === 'centre') {
    return (
      <div style={pageWrap}>
        <BookingWizardShell
          stepKey='centre'
          title={BOOKING_STEP_META.centre.title}
          onBack={goBack}
          footerLabel='ถัดไป'
          footerDisabled={!clinic}
          onFooter={() => go('doctor')}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <BookingPanel title='เลือกศูนย์บริการที่ต้องการนัดหมาย'>
              <BookingSearchRow
                placeholder='ค้นหาเลขหรือชื่อศูนย์บริการ'
                value={centreQuery}
                onChange={setCentreQuery}
              />
            </BookingPanel>

            {recentClinics.length > 0 && (
              <BookingPanel variant='section' title='ศูนย์บริการที่ใช้บริการล่าสุด'>
                <div className='flex overflow-x-auto' style={{ gap: 'var(--dim-space-300, 12px)', paddingBottom: 4 }}>
                  {recentClinics.map((c) => (
                    <div key={`r-${c.code}`} style={{ flex: '0 0 300px', maxWidth: 300 }}>
                      <ClinicCard
                        number={c.number}
                        name={c.shortName || c.name}
                        distanceKm={c.distanceKm}
                        hoursRows={CENTRE_HOURS}
                        showBadge={!!c.availableToday}
                        showCheckbox={false}
                        selected={clinic?.code === c.code}
                        onClick={() => { setClinic(c); setDoctor(null); }}
                        onMap={() => setMapClinic(c)}
                      />
                    </div>
                  ))}
                </div>
              </BookingPanel>
            )}

            <BookingPanel
              variant='section'
              title='ศูนย์บริการทั้งหมด'
              titleRight={(
                <BrandSubdueButton
                  variant='Outline'
                  size='Small'
                  fullWidth={false}
                  leadingIcon='location_on'
                  trailingIcon='expand_more'
                  onClick={() => setSortOpen(true)}
                >
                  {sortLabel(centreSort)}
                </BrandSubdueButton>
              )}
            >
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)' }}>
                แสดงเฉพาะศูนย์บริการให้บริการ{dept?.label || 'แผนกที่เลือก'}
              </p>
              {filteredClinics.map((c) => (
                <ClinicCard
                  key={c.code}
                  number={c.number}
                  name={c.shortName || c.name}
                  distanceKm={c.distanceKm}
                  hoursRows={CENTRE_HOURS}
                  showBadge={!!c.availableToday}
                  showCheckbox={false}
                  selected={clinic?.code === c.code}
                  onClick={() => { setClinic(c); setDoctor(null); }}
                  onMap={() => setMapClinic(c)}
                />
              ))}
              {!filteredClinics.length && (
                <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-sm, 14px)' }}>
                  ไม่พบศูนย์บริการที่ตรงกับคำค้นหา
                </p>
              )}
            </BookingPanel>
          </div>
        </BookingWizardShell>
        {sheets}
      </div>
    );
  }

  /* ─── Step 3: Doctor ─────────────────────────────────────────────── */
  if (step === 'doctor') {
    const anyone = { id: 'ANY', name: 'ไม่ระบุแพทย์', anyone: true, specialty: null, license: null };
    return (
      <div style={pageWrap}>
        <BookingWizardShell
          stepKey='doctor'
          title={BOOKING_STEP_META.doctor.title}
          onBack={goBack}
          footerLabel='ถัดไป'
          footerDisabled={!doctor}
          onFooter={() => {
            setDatePhase('date');
            go('datetime');
          }}
          contentStyle={{
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
          }}
        >
          <BookingPanel
            gap='var(--dim-space-400, 16px)'
            style={{ overflow: 'hidden' }}
          >
            <div
              className='flex flex-col items-center'
              style={{ width: '100%', gap: 'var(--dim-space-400, 16px)' }}
            >
              <h2
                style={{
                  width: '100%',
                  margin: 0,
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-medium, 500)',
                  color: 'var(--text-brandPrimary-default, #007549)',
                  lineHeight: 1.375,
                }}
              >
                เลือกแพทย์ที่ต้องการนัดหมาย
              </h2>
              <BookingSearchRow placeholder='ค้นหาชื่อแพทย์' value={doctorQuery} onChange={setDoctorQuery} />
            </div>
            <div
              aria-hidden
              style={{
                width: '100%',
                height: 'var(--dim-stroke-100, 1px)',
                background: 'var(--border-neutral-quaternary, #F4F5F5)',
              }}
            />
            <InfoAlert>แพทย์อาจเปลี่ยนแปลงได้ โดยเราจะแจ้งล่วงหน้าก่อนถึงวันนัดหมาย</InfoAlert>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
              <DoctorCard
                anyone
                name={anyone.name}
                subtitle='ระบบจะเลือกแพทย์ให้โดยอัตโนมัติ'
                centre={clinic?.shortName}
                selected={doctor?.id === 'ANY'}
                onClick={() => setDoctor(anyone)}
              />
              {filteredDoctors.map((d) => (
                <DoctorCard
                  key={d.id}
                  name={d.name}
                  dept={d.specialty}
                  license={d.license}
                  centre={clinic?.shortName}
                  avatar={d.avatar || '/illustration/mobile/doctor-somying.png'}
                  showBadge={!!d.availableToday}
                  selected={doctor?.id === d.id}
                  onClick={() => setDoctor(d)}
                />
              ))}
            </div>
          </BookingPanel>
        </BookingWizardShell>
        {sheets}
      </div>
    );
  }

  /* ─── Step 4a: Date ──────────────────────────────────────────────── */
  if (step === 'datetime') {
    if (datePhase === 'date') {
      return (
        <div style={pageWrap}>
          <BookingWizardShell
            stepKey='date'
            title={BOOKING_STEP_META.date.title}
            onBack={goBack}
            footerLabel='ถัดไป'
            footerDisabled={!date}
            onFooter={() => setDatePhase('time')}
          >
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <DoctorSummaryCard
                doctor={doctor}
                centreName={clinic?.shortName}
                onChange={() => setChangeDoctorOpen(true)}
              />

              <BookingPanel
                title='เลือกวันที่ท่านต้องการเพื่อนัดหมาย'
                titleWeight='regular'
              >
                <BookingCalendar
                  selectedKey={date}
                  availableKeys={availableDateKeys}
                  onSelect={(key) => {
                    setDate(key);
                    setTime(null);
                  }}
                />
              </BookingPanel>
            </div>
          </BookingWizardShell>
          {sheets}
        </div>
      );
    }

    /* Figma 140:21752 — a dedicated time screen after date selection. */
    return (
      <div style={pageWrap}>
        <BookingWizardShell
          stepKey='time'
          title={BOOKING_STEP_META.time.title}
          onBack={() => setDatePhase('date')}
          footerLabel='ยืนยันเวลานัดหมาย'
          footerDisabled={!time || dateIsSlotFull}
          onFooter={() => go('confirm')}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <DoctorSummaryCard
              doctor={doctor}
              centreName={clinic?.shortName}
              onChange={() => setChangeDoctorOpen(true)}
            />

            <section
              style={{
                background: 'var(--surface-card-100, #FFFFFF)',
                borderRadius: 'var(--dim-radius-600, 24px)',
                paddingBlock: 'var(--dim-space-400, 16px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--dim-space-400, 16px)',
                overflow: 'hidden',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingInline: 'var(--dim-space-400, 16px)',
                  width: '100%',
                  textAlign: 'center',
                  fontFamily: 'var(--type-family-heading-graphic2)',
                  fontSize: 'var(--type-size-xl, 20px)',
                  fontWeight: 'var(--type-weight-regular, 400)',
                  lineHeight: 1.375,
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                เลือกเวลาที่ท่านต้องการเพื่อนัดหมาย
              </h2>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--dim-space-400, 16px)',
                  paddingRight: 'var(--dim-space-400, 16px)',
                  minWidth: 0,
                }}
              >
                <div
                  className='scrollbar-hide-native'
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflowX: 'auto',
                    borderRight: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-tertiary, #C5EDDA)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--dim-space-300, 12px)',
                      width: 'max-content',
                      paddingInline: 'var(--dim-space-400, 16px)',
                    }}
                  >
                    {dateOptions.map((option) => {
                      const active = option.key === date;
                      return (
                        <button
                          key={option.key}
                          type='button'
                          onClick={() => {
                            setDate(option.key);
                            setTime(null);
                          }}
                          style={{
                            width: 'var(--dim-size-1100, 52px)',
                            flex: '0 0 var(--dim-size-1100, 52px)',
                            padding: 'var(--dim-space-200, 8px) var(--dim-space-100, 4px)',
                            borderRadius: 'var(--dim-radius-600, 24px)',
                            border: active
                              ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                              : 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                            background: active
                              ? 'var(--surface-card-brand100, #F4FBF8)'
                              : 'var(--surface-card-100, #FFFFFF)',
                            color: active
                              ? 'var(--text-brandPrimary-default, #007549)'
                              : 'var(--text-content-default, #111314)',
                            boxShadow: active ? 'var(--shadow-brand-drop-bottom-200)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              marginBottom: 'calc(var(--dim-space-100, 4px) * -1)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-xs, 12px)',
                              fontWeight: 'var(--type-weight-medium, 500)',
                              lineHeight: 1.5,
                              color: active
                                ? 'var(--text-brandPrimary-default, #007549)'
                                : 'var(--text-content-tertiary, #858C92)',
                            }}
                          >
                            {option.weekday}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-xl, 20px)',
                              fontWeight: 'var(--type-weight-bold, 700)',
                              lineHeight: 1.5,
                            }}
                          >
                            {option.day}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <BrandSubdueIconButton
                  icon='calendar_month'
                  size='Large'
                  aria-label='เปิดปฏิทินเพื่อเปลี่ยนวันที่'
                  onClick={() => setCalendarOpen(true)}
                />
              </div>

              {dateIsSlotFull ? (
                <div style={{ paddingInline: 'var(--dim-space-400, 16px)' }}>
                  <button
                    type='button'
                    onClick={() => setSlotFullOpen(true)}
                    style={{
                      width: '100%',
                      border: 'var(--dim-stroke-100, 1px) solid var(--border-warning-default, #FDBA74)',
                      background: 'var(--surface-warning-quaternary, #FFF7ED)',
                      borderRadius: 'var(--dim-radius-400, 12px)',
                      padding: 'var(--dim-space-300, 12px)',
                      color: 'var(--text-warning-default, #C2410C)',
                      fontFamily: 'var(--type-family-body)',
                      fontSize: 'var(--type-size-sm, 14px)',
                      fontWeight: 'var(--type-weight-regular, 400)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    วันที่เลือกไม่มีช่วงเวลาว่าง — แตะเพื่อเปลี่ยนวันหรือแพทย์
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--dim-space-800, 32px)',
                    padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) 0',
                  }}
                >
                {TIME_PERIODS.map((period) => (
                  <div
                    key={period.key}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--dim-space-300, 12px)',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-sm, 14px)',
                        fontWeight: 'var(--type-weight-regular, 400)',
                        lineHeight: 1.5,
                        color: 'var(--text-content-tertiary, #858C92)',
                      }}
                    >
                      {period.label}
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 'var(--dim-space-300, 12px)',
                      }}
                    >
                      {period.slots.map((t) => {
                        const disabled = BOOKED_SLOTS.has(t);
                        const active = t === time;
                        return (
                          <button
                            key={`${period.key}-${t}`}
                            type='button'
                            disabled={disabled}
                            onClick={() => setTime(t)}
                            style={{
                              height: 'var(--dim-size-1000, 48px)',
                              minWidth: 0,
                              paddingInline: 'var(--dim-space-200, 8px)',
                              borderRadius: 'var(--dim-radius-full, 9999px)',
                              border: active
                                ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
                                : disabled
                                  ? 'var(--dim-stroke-100) solid var(--border-disabledButton-tertiary, #E2E4E6)'
                                  : 'var(--dim-stroke-100) solid var(--border-neutralbutton-tertiary, #E2E4E6)',
                              background: disabled
                                ? 'var(--surface-disabledButton-tertiary, #F4F5F5)'
                                : active
                                  ? 'var(--surface-brandPrimary-default, #007549)'
                                  : 'var(--surface-card-100, #FFFFFF)',
                              color: disabled
                                ? 'var(--text-disabledButton-tertiary, #ADB2B7)'
                                : active
                                  ? 'var(--text-brandprimarybutton-on-brand, #FFFFFF)'
                                  : 'var(--text-neutralbutton-default, #4D5358)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-lg, 18px)',
                              fontWeight: 'var(--type-weight-regular, 400)',
                              lineHeight: 1.5,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                  {openSlotsForDate.length === 0 && (
                    <p style={{ margin: 0, textAlign: 'center', color: 'var(--text-content-tertiary)' }}>
                      ไม่พบช่วงเวลาว่าง
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>
        </BookingWizardShell>
        {sheets}
      </div>
    );
  }

  /* ─── Step 5: Confirm ────────────────────────────────────────────── */
  return (
    <div style={pageWrap}>
      <BookingWizardShell
        stepKey='confirm'
        title={BOOKING_STEP_META.confirm.title}
        onBack={goBack}
        footerLabel='ยืนยันเวลานัดหมาย'
        footerDisabled={!symptom.trim() || wantCert == null}
        onFooter={confirmBooking}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <DoctorSummaryCard doctor={doctor} centreName={clinic?.shortName} />

          {/* รายละเอียดการนัดหมาย — Figma AppointmentCard */}
          <div
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              padding: 'var(--dim-space-400, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              รายละเอียดการนัดหมาย
            </p>
            <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
              <ConfirmDetailRow icon='calendar_today' label='วันที่' value={formatThaiDateShort(date)} />
              <ConfirmDetailRow icon='schedule' label='เวลา' value={`${time} น.`} />
              <ConfirmDetailRow
                icon={serviceType === 'online' ? 'video' : 'map-pin'}
                label='ประเภทการเข้ารับบริการ'
                value={serviceType === 'online' ? 'เข้ารับบริการออนไลน์ (Telemedicine)' : 'เข้ารับบริการที่ศูนย์'}
                tone='green'
              />
            </div>
          </div>

          <div
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              padding: 'var(--dim-space-400, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              ข้อมูลประกอบการนัดหมาย
            </p>
            <Textarea
              label='อาการเบื้องต้น / หมายเหตุ'
              required
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder='เช่น มีอาการเจ็บหน้าอกแปลบๆ บางครั้งเวลาออกกำลังกายหนัก ต้องการปรึกษาเบื้องต้น'
              rows={4}
              resize='none'
            />
          </div>

          <div
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              boxShadow: 'var(--shadow-brand-drop-bottom-200)',
              padding: 'var(--dim-space-400, 16px)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--dim-space-400, 16px)',
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                color: 'var(--text-content-tertiary, #858C92)',
              }}
            >
              ต้องการรับใบรับรองแพทย์
            </p>
            <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)' }}>
              {[
                { v: true, label: 'รับ', icon: 'check' },
                { v: false, label: 'ไม่รับ', icon: 'close' },
              ].map((opt) => {
                const active = wantCert === opt.v;
                return (
                  <button
                    key={opt.label}
                    type='button'
                    onClick={() => setWantCert(opt.v)}
                    className='flex-1 inline-flex items-center'
                    style={{
                      gap: 'var(--dim-space-400, 16px)',
                      padding: 'var(--dim-space-400, 16px)',
                      borderRadius: 'var(--dim-radius-600, 24px)',
                      border: active
                        ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)'
                        : 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                      background: 'var(--surface-card-100, #FFFFFF)',
                      color: 'var(--text-content-default, #111314)',
                      cursor: 'pointer',
                      fontFamily: 'var(--type-family-heading-graphic2)',
                      fontSize: 'var(--type-size-base, 16px)',
                      textAlign: 'left',
                    }}
                  >
                    <Sym
                      name={opt.icon}
                      size={24}
                      color='var(--icon-brandPrimary-default, #007549)'
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BookingWizardShell>
      {sheets}
    </div>
  );
};

const MobileBookPage = () => {
  const [shellBg, setShellBg] = useState('var(--background-screen-brand-100, #F4FBF8)');
  return (
    <MobileShell
      requireAuth
      showBottomNav={false}
      background={shellBg}
      statusBarTone={shellBg === SUCCESS_CARD_BG ? 'transparentDark' : 'default'}
    >
      <MobileBookInner onShellBackground={setShellBg} />
    </MobileShell>
  );
};

export default MobileBookPage;
