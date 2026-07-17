import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileNavHeader,
  Sym,
  BrandButton,
  BrandSubdueButton,
} from '@/components/mobile';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import LottieIllustration from '@/components/illustrations/LottieIllustration';
import { DoctorSummaryCard, ConfirmDetailRow } from '@/components/mobile/BookingWizard';
import { StepIcon } from '@/components/mobile/stepIcons';
import { FakeQR } from '@/pages/mobile/MobileRegisterPage';
import { CURRENT_USER, CLINICS, resolveDoctorAvatar } from '@/data/mobileMock';
import { usePhcisLink, updateAppointment } from '@/data/phcisLink';

/* BMA Health · Appointment detail — Figma 2042:26323 (online) / 2042:26567 (clinic)
   + cancellation action sheet Archive 176:98463. */

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const CANCEL_REASONS = [
  'ไม่มีอาการแล้ว / ดีขึ้นแล้ว',
  'ติดธุระด่วนกะทันหัน',
  'มีปัญหาขัดข้องทางเทคนิค',
  'อื่นๆ (โปรดระบุ)',
];

/* Care journey — Figma 371:45332. Every stage carries the brand-green ring;
   glyphs are the exact two-tone Figma step icons (see stepIcons.jsx). */
const JOURNEY_STEPS = [
  { key: 'book', label: 'จองนัด', icon: 'check', done: true },
  { key: 'consult', label: 'ปรึกษาแพทย์', icon: 'stethoscope', done: false, active: true },
  { key: 'pharmacy', label: 'จัดยา', icon: 'pill', done: false },
  { key: 'pay', label: 'ชำระเงิน', icon: 'bill', done: false },
  { key: 'receive', label: 'รับยา', icon: 'medicine', done: false },
];

const formatThaiDate = (yyyyMmDd) => {
  const parts = String(yyyyMmDd || '').split('-').map(Number);
  if (parts.length < 3) return yyyyMmDd;
  const [, mm, dd] = parts;
  return `วันนี้, ${dd} ${THAI_MONTHS_SHORT[mm - 1]}`;
};

const Card = ({ children, style }) => (
  <div
    style={{
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      padding: 'var(--dim-space-400, 16px)',
      ...style,
    }}
  >
    {children}
  </div>
);

const STEP_LINE = 'var(--border-brandPrimary-default, #007549)';

const JourneyStepper = () => (
  <div
    className='flex items-start'
    style={{
      padding: 'var(--dim-space-300, 12px) var(--dim-space-0, 0px)',
      background: 'var(--surface-card-100)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
    }}
  >
    {JOURNEY_STEPS.map((step, i) => {
      /* Figma step states 284:37331 — every stage keeps the brand-green ring + the
         exact two-tone glyph (no red / no grey); only the circle surface changes:
           done → teal/100 · current → emerald/50 · upcoming → white.
         Each stage owns flex-1 rails on both sides so the green line runs edge-to-edge
         and touches the circles (371:45332); the outer halves are hidden. */
      const bg = step.done
        ? 'var(--surface-positive-tertiary, #D1F6EE)'
        : step.active
          ? 'var(--background-screen-brand-100, #F4FBF8)'
          : 'var(--surface-card-100, #FFFFFF)';
      const first = i === 0;
      const last = i === JOURNEY_STEPS.length - 1;
      return (
        <div key={step.key} className='flex flex-col items-center' style={{ flex: 1, minWidth: 0, gap: 'var(--dim-space-100, 4px)' }}>
          <div className='flex items-center' style={{ width: '100%' }}>
            <span style={{ flex: 1, height: 'var(--dim-stroke-200, 2px)', background: first ? 'transparent' : STEP_LINE }} />
            <span
              className='inline-flex items-center justify-center shrink-0'
              style={{
                boxSizing: 'border-box',
                width: 44,
                height: 44,
                borderRadius: 'var(--dim-radius-600, 24px)',
                border: 'var(--dim-stroke-200) solid var(--border-brandPrimary-default, #007549)',
                background: bg,
              }}
            >
              <StepIcon name={step.icon} size={20} />
            </span>
            <span style={{ flex: 1, height: 'var(--dim-stroke-200, 2px)', background: last ? 'transparent' : STEP_LINE }} />
          </div>
          <span style={{
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-xs, 12px)',
            textAlign: 'center',
            color: step.done
              ? 'var(--text-brandPrimary-default, #007549)'
              : 'var(--text-content-secondary, #636B72)',
            lineHeight: 1.5,
          }}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </div>
);

/* Figma 154:54910 — heading, centered 80×80 Lottie, then the checklist stacked below. */
const PREP_ILLUS = encodeURI('/illustration/mobile/Medical Report (1).json');

const PrepChecklist = ({ isOnline }) => {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(PREP_ILLUS)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (alive) setAnimationData(data); })
      .catch(() => { /* Keep the reserved illustration space. */ });
    return () => { alive = false; };
  }, []);

  const items = isOnline
    ? [
      'กรุณาเข้าห้องวิดีโอคอลล่วงหน้า 15 นาทีก่อนถึงเวลานัดหมาย',
      'เตรียมข้อมูลยาและอาหารเสริมที่กินอยู่ (ถ่ายรูปฉลากยาไปได้)',
    ]
    : [
      'กรุณามาถึงศูนย์ก่อนเวลานัดอย่างน้อย 15 นาที',
      'เตรียมบัตรประชาชนและ QR Code สำหรับกดบัตรคิว',
      'เตรียมข้อมูลยาและอาหารเสริมที่กินอยู่',
    ];

  return (
    <Card>
      <p style={{
        margin: '0 0 var(--dim-space-300, 12px)',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-base, 16px)',
        color: 'var(--text-brandPrimary-default)',
      }}
      >
        การเตรียมตัว
      </p>
      <div
        className='flex justify-center'
        style={{ marginBottom: 'var(--dim-space-400, 16px)' }}
      >
        <LottieIllustration animationData={animationData} size={80} loop style={{ flexShrink: 0 }} />
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-200, 8px)' }}>
        {items.map((t) => (
          <li key={t} className='flex items-start' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <Sym name='check_circle' size={18} color='var(--text-brandPrimary-default)' />
            <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.45 }}>{t}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const CancelSheet = ({ open, onClose, onConfirm }) => {
  const [reason, setReason] = useState(null);
  const [otherText, setOtherText] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    setReason(null);
    setOtherText('');
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const canConfirm = reason != null && (reason !== CANCEL_REASONS[3] || otherText.trim().length > 0);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'var(--surface-overlay-default, rgb(100 116 139 / 0.40))',
      }}
      onClick={onClose}
      role='presentation'
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label='ยกเลิกนัดหมาย'
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          height: 'calc(100% - var(--dim-size-1300, 60px))',
          minHeight: 0,
          overflow: 'hidden',
          background: 'var(--surface-card-100, #FFFFFF)',
          borderTopLeftRadius: 'var(--dim-radius-700, 38px)',
          borderTopRightRadius: 'var(--dim-radius-700, 38px)',
          boxShadow: 'var(--shadow-brand-drop-top-200)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className='flex flex-col items-center'
          style={{
            paddingBottom: 'calc(var(--dim-space-200, 8px) + var(--dim-space-050, 2px))',
            background: 'var(--surface-card-100, #FFFFFF)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #F4F5F5)',
          }}
        >
          <div
            className='flex flex-col items-center'
            style={{
              width: 'var(--dim-size-700, 36px)',
              height: 'var(--dim-size-300, 16px)',
              paddingTop: 'calc(var(--dim-space-100, 4px) + var(--dim-stroke-100, 1px))',
            }}
          >
            <span
              style={{
                width: 'var(--dim-size-700, 36px)',
                height: 'var(--dim-space-100, 4px)',
                borderRadius: 'var(--dim-radius-full, 9999px)',
                background: 'var(--border-switch-default, #C9CDD0)',
              }}
            />
          </div>
          <div
            className='flex items-center w-full'
            style={{ paddingInline: 'var(--dim-space-400, 16px)' }}
          >
            <span style={{ width: 'var(--dim-size-800, 40px)', flexShrink: 0 }} aria-hidden />
            <span aria-hidden style={{ width: 'var(--dim-space-200, 8px)', alignSelf: 'stretch' }} />
            <p style={{
              flex: 1,
              margin: 0,
              textAlign: 'center',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-default)',
            }}
            >
              ยกเลิกนัดหมาย
            </p>
            <button
              type='button'
              aria-label='ปิด'
              onClick={onClose}
              style={{
                width: 'var(--dim-size-800, 40px)',
                height: 'var(--dim-size-800, 40px)',
                borderRadius: 'var(--dim-radius-600, 24px)',
                border: 0,
                background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
                color: 'var(--text-brandPrimary-default)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sym name='close' size={16} />
            </button>
          </div>
        </div>

        <div
          className='flex flex-col'
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            gap: 'var(--dim-space-400, 16px)',
            padding: 'var(--dim-space-400, 16px)',
          }}
        >
          <Alert
            type='info'
            title='การยกเลิก'
            subtext='หากยกเลิกก่อนเวลานัดน้อยกว่า 1 วัน จะถูกบันทึกว่า "ไม่มาตามนัด" และหากมีประวัติ "ไม่มาตามนัด" บ่อยครั้ง อาจส่งผลให้คุณไม่สามารถทำการนัดหมายล่วงหน้าผ่านแอปพลิเคชันได้ชั่วคราว'
            showCloseButton={false}
            iconSize={16}
            iconWeight={400}
            textGap='var(--dim-space-050, 2px)'
            titleStyle={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
            }}
            subtextStyle={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.5,
            }}
            style={{ borderRadius: 'var(--dim-radius-600, 24px)' }}
          />

          <div>
            <p style={{
              margin: 0,
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-brandPrimary-default)',
            }}
            >
              ช่วยบอกเราหน่อยว่าเกิดอะไรขึ้น?
            </p>
            <p style={{
              margin: 'var(--dim-space-100, 4px) 0 0',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-regular, 400)',
              lineHeight: 1.5,
              color: 'var(--text-content-tertiary)',
            }}
            >
              ความคิดเห็นของคุณจะช่วยให้เราปรับปรุงบริการให้ดียิ่งขึ้น
            </p>
          </div>

          <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)' }}>
            {CANCEL_REASONS.map((r) => {
              const active = reason === r;
              return (
                <button
                  key={r}
                  type='button'
                  onClick={() => setReason(r)}
                  style={{
                    width: '100%',
                    minHeight: 'var(--dim-size-1200, 56px)',
                    textAlign: 'left',
                    padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
                    borderRadius: 'var(--dim-radius-200, 8px)',
                    border: active
                      ? 'var(--dim-stroke-200) solid var(--border-brandPrimary-default)'
                      : 'var(--dim-stroke-100) solid var(--border-neutralButton-tertiary, #E2E4E6)',
                    background: active
                      ? 'var(--surface-brandPrimary-quaternary)'
                      : 'var(--surface-card-100)',
                    cursor: 'pointer',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-regular, 400)',
                    lineHeight: 1.5,
                    color: 'var(--text-content-default)',
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {reason === CANCEL_REASONS[3] && (
            <textarea
              className='mih-apt-cancel-other'
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder='โปรดระบุเหตุผล'
              rows={3}
              style={{
                width: '100%',
                padding: 'var(--dim-space-300, 12px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                border: 'var(--dim-stroke-100) solid var(--border-input-default, #E2E4E6)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-base, 16px)',
                resize: 'none',
              }}
            />
          )}
        </div>

        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            padding: 'var(--dim-space-400, 16px) var(--dim-space-400, 16px) var(--dim-space-800, 32px)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
          }}
        >
          <BrandButton
            size='lg'
            disabled={!canConfirm}
            onClick={() => onConfirm?.(reason === CANCEL_REASONS[3] ? otherText.trim() : reason)}
          >
            ยืนยันการยกเลิกนัดหมาย
          </BrandButton>
          <BrandButton variant='outline' size='md' onClick={onClose}>
            ไม่ยกเลิกนัดหมาย
          </BrandButton>
        </div>
      </div>
    </div>
  );
};

const SuccessCancel = ({ onDone }) => (
  <div
    className='flex flex-col items-center justify-center'
    style={{
      minHeight: '100%',
      background: 'var(--mobile-surface-brandPrimaryButton-default, #08A768)',
      padding: 'var(--dim-space-600, 24px)',
    }}
  >
    <div
      className='flex flex-col items-center'
      style={{
        width: '100%',
        maxWidth: 340,
        background: 'var(--surface-card-100)',
        borderRadius: 'var(--dim-radius-600, 24px)',
        padding: 'var(--dim-space-800, 32px) var(--dim-space-600, 24px)',
        gap: 'var(--dim-space-400, 16px)',
        boxShadow: 'var(--shadow-brand-drop-bottom-300)',
      }}
    >
      <span
        className='inline-flex items-center justify-center'
        style={{
          width: 88,
          height: 88,
          borderRadius: 'var(--dim-radius-full)',
          background: 'var(--surface-brandPrimary-quaternary)',
          color: 'var(--text-brandPrimary-default)',
        }}
      >
        <Sym name='event_busy' size={48} fill />
      </span>
      <h1 style={{
        margin: 0,
        textAlign: 'center',
        fontFamily: 'var(--type-family-heading-graphic2)',
        fontSize: 'var(--type-size-2xl, 24px)',
        color: 'var(--text-brandPrimary-default)',
      }}
      >
        ยกเลิกนัดหมายสำเร็จ
      </h1>
      <p style={{ margin: 0, textAlign: 'center', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', lineHeight: 1.5 }}>
        ระบบได้ยกเลิกนัดหมายเรียบร้อยแล้ว
      </p>
      <BrandButton size='lg' onClick={onDone}>ดูรายการนัดหมาย</BrandButton>
    </div>
  </div>
);

const MobileAppointmentDetailInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const { search } = useLocation();
  const { appointments } = usePhcisLink();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelledOk, setCancelledOk] = useState(false);

  const apt = useMemo(() => appointments.find((a) => a.id === id), [appointments, id]);

  useEffect(() => {
    const action = new URLSearchParams(search).get('action');
    if (action === 'cancel' && apt && apt.status === 'upcoming') setCancelOpen(true);
  }, [search, apt]);

  if (cancelledOk) {
    return <SuccessCancel onDone={() => history.push('/m/appointments')} />;
  }

  if (!apt) {
    return (
      <>
        <MobileNavHeader title='ไม่พบนัดหมาย' onBack={() => history.push('/m/appointments')} />
        <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <Card>
            <p style={{ margin: 0, color: 'var(--text-content-secondary)' }}>ไม่พบนัดหมายรหัส {id}</p>
          </Card>
        </div>
      </>
    );
  }

  const isOnline = apt.type === 'video';
  const isVisit = apt.type === 'visit';
  const clinic = CLINICS.find((c) => c.code === apt.clinic);
  const canAct = apt.status === 'upcoming' && apt.aptStatus !== 'cancelled' && apt.aptStatus !== 'noshow';
  const hn = CURRENT_USER?.centers?.[0]?.hn || '67-00001';
  const patientName = `${CURRENT_USER.prefix || ''}${CURRENT_USER.firstName || ''} ${CURRENT_USER.lastName || ''}`.trim();

  const doctor = {
    name: apt.doctor,
    specialty: apt.specialty || apt.deptLabel,
    license: apt.license,
    anyone: false,
    avatar: apt.doctorAvatar || resolveDoctorAvatar(apt.doctor),
  };

  const confirmCancel = (reason) => {
    updateAppointment(apt.id, {
      status: 'past',
      aptStatus: 'cancelled',
      cancelReason: reason,
    });
    setCancelOpen(false);
    setCancelledOk(true);
  };

  return (
    <div className='flex flex-col' style={{ minHeight: '100%', position: 'relative' }}>
      <MobileNavHeader
        title='รายละเอียดการนัดหมาย'
        onBack={() => history.push('/m/appointments')}
      />

      <div
        className='flex-1 min-h-0'
        style={{
          padding: 'var(--dim-space-400, 16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--dim-space-300, 12px)',
          background: 'var(--background-screen-brand-100, #F4FBF8)',
        }}
      >
        {isOnline && canAct && <JourneyStepper />}

        {canAct && (
          <Alert
            type='info'
            title='รอเข้ารับการตรวจ'
            subtext={isOnline
              ? 'กรุณาเข้าห้องวิดีโอคอลล่วงหน้า 15 นาทีก่อนถึงเวลานัดหมาย'
              : 'กรุณามาถึงศูนย์ก่อนเวลานัดอย่างน้อย 15 นาที และเตรียม QR Code สำหรับกดบัตรคิว'}
            showCloseButton={false}
            titleStyle={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-sm, 14px)',
              lineHeight: 1.5,
            }}
            subtextStyle={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              fontWeight: 'var(--type-weight-medium, 500)',
              lineHeight: 1.5,
            }}
          />
        )}

        <DoctorSummaryCard doctor={doctor} centreName={clinic?.shortName || clinic?.name} />

        <Card>
          <p style={{
            margin: '0 0 var(--dim-space-400, 16px)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            color: 'var(--text-brandPrimary-default)',
          }}
          >
            รายละเอียดการนัดหมาย
          </p>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <ConfirmDetailRow icon='calendar_today' label='วันที่' value={formatThaiDate(apt.date)} />
            <ConfirmDetailRow icon='schedule' label='เวลา' value={`${apt.time} น.`} />
            <ConfirmDetailRow icon='location_on' label='ศูนย์ให้บริการ' value={apt.locationLabel || clinic?.name || '—'} />
            <ConfirmDetailRow
              icon={isOnline ? 'video' : 'map-pin'}
              label='ประเภทการเข้ารับบริการ'
              value={isOnline ? 'ออนไลน์ (Telemedicine)' : 'เข้ารับบริการที่ศูนย์'}
              tone='green'
            />
          </div>

          <div style={{ marginTop: 'var(--dim-space-400, 16px)' }}>
            <Alert
              type={isOnline ? 'info' : 'warning'}
              title='การยกเลิก'
              subtext={isOnline
                ? 'หากยกเลิกก่อนเวลานัดน้อยกว่า 3 วัน จะถูกบันทึกว่า “ไม่มาตามนัด”'
                : 'หากยกเลิกก่อนเวลานัดน้อยกว่า 24 ชั่วโมง จะถูกบันทึกว่า “ไม่มาตามนัด”'}
              showCloseButton={false}
              titleStyle={{
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-sm, 14px)',
                lineHeight: 1.5,
              }}
              subtextStyle={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
                fontWeight: 'var(--type-weight-medium, 500)',
                lineHeight: 1.5,
              }}
            />
          </div>
        </Card>

        {isOnline && canAct && (
          <Card>
            <p style={{
              margin: '0 0 var(--dim-space-300, 12px)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              color: 'var(--text-brandPrimary-default)',
            }}
            >
              วิธีการใช้งานห้องวิดีโอคอล
            </p>
            <div
              className='relative overflow-hidden'
              style={{
                borderRadius: 'var(--dim-radius-400, 12px)',
                background: 'var(--surface-neutral-tertiary, #F4F5F5)',
                aspectRatio: '16 / 10',
              }}
            >
              <img
                src='/illustration/mobile/doctor-h.png'
                alt=''
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              />
              <span
                className='absolute inset-0 flex items-center justify-center'
                style={{ background: 'rgba(15,27,23,0.28)' }}
              >
                <span
                  className='inline-flex items-center justify-center'
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--dim-radius-full)',
                    background: 'var(--surface-card-100)',
                    color: 'var(--text-brandPrimary-default)',
                    boxShadow: 'var(--shadow-brand-drop-bottom-200)',
                  }}
                >
                  <Sym name='play_arrow' size={32} fill />
                </span>
              </span>
            </div>
          </Card>
        )}

        {isVisit && canAct && (
          <Card>
            <p style={{
              margin: '0 0 var(--dim-space-400, 16px)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base, 16px)',
              color: 'var(--text-brandPrimary-default)',
            }}
            >
              QR Code ของฉัน
            </p>
            <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-300, 12px)', textAlign: 'center' }}>
              <FakeQR seed={`APT-${apt.id}-${hn}`} size={144} framed />
              <p style={{
                margin: 0,
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                color: 'var(--text-content-default)',
              }}
              >
                {patientName}
              </p>
              <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>
                HN: {hn}
              </ColorfulBadge>
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary)', lineHeight: 1.45 }}>
                กรุณาบันทึก QR Code เพื่อนำไปสแกนกดบัตรคิวที่ศูนย์บริการ
              </p>
              <BrandButton
                size='lg'
                leadingIcon='download'
                onClick={() => window.alert('บันทึก QR Code แล้ว (สาธิต)')}
              >
                บันทึก QR Code
              </BrandButton>
            </div>
          </Card>
        )}

        {canAct && <PrepChecklist isOnline={isOnline} />}

        <Card>
          <p style={{
            margin: '0 0 var(--dim-space-200, 8px)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            color: 'var(--text-brandPrimary-default)',
          }}
          >
            อาการเบื้องต้น / หมายเหตุ
          </p>
          <p style={{ margin: 0, fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary)', lineHeight: 1.5 }}>
            {apt.note || '—'}
          </p>
        </Card>
      </div>

      {canAct && (
        <div
          className='shrink-0'
          style={{
            padding: 'var(--dim-space-400, 16px)',
            background: 'var(--surface-card-100)',
            borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            boxShadow: 'var(--shadow-brand-drop-top-100)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--dim-space-300, 12px)',
          }}
        >
          {isOnline && (
            <BrandButton
              size='lg'
              leadingIcon='video'
              onClick={() => history.push(`/m/telemed?apt=${apt.id}`)}
            >
              เข้าห้องวิดีโอคอล
            </BrandButton>
          )}
          <div className='flex' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <BrandSubdueButton variant='outline' size='lg' style={{ flex: 1 }} onClick={() => setCancelOpen(true)}>
              ยกเลิก
            </BrandSubdueButton>
            <BrandSubdueButton
              variant='outline'
              size='lg'
              style={{ flex: 1 }}
              onClick={() => history.push(`/m/book?reschedule=${apt.id}`)}
            >
              เลื่อนนัด
            </BrandSubdueButton>
          </div>
        </div>
      )}

      <CancelSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={confirmCancel}
      />
    </div>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-apt-cancel-other-css')) {
  const style = document.createElement('style');
  style.id = 'mih-apt-cancel-other-css';
  style.textContent = `
.mih-apt-cancel-other,
.mih-apt-cancel-other:focus,
.mih-apt-cancel-other:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-apt-cancel-other::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const MobileAppointmentDetailPage = () => (
  <MobileShell
    requireAuth
    showBottomNav={false}
    background='var(--background-screen-brand-100, #F4FBF8)'
  >
    <MobileAppointmentDetailInner />
  </MobileShell>
);

export default MobileAppointmentDetailPage;
