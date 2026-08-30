import React from 'react';
import StaffProfileAvatar from '@/components/appointment/StaffProfileAvatar';

/* MIH AppointmentStaffHero — Figma Appointment 1:38620 (user info).
   Gradient fill is the documented exception (not expressible as a single token). */

const GROUP_POLICY_FALLBACK = {
  doctor: 'แพทย์',
  nurse: 'พยาบาล',
  admin: 'เจ้าหน้าที่ธุรการ',
  registrar: 'เจ้าหน้าที่เวชระเบียน',
  reception: 'เจ้าหน้าที่ทะเบียน',
};

function thaiDisplayName(staff) {
  if (staff.nameTh) return staff.nameTh;
  if (/^(นาย|นาง|นางสาว|ดร\.)/.test(staff.name)) return staff.name;
  if (staff.role === 'doctor') return `นาย${staff.name}`;
  if (staff.role === 'nurse') return `นางสาว${staff.name}`;
  return staff.name;
}

function HeroMetaColumn({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-regular)',
          lineHeight: 1.5,
          color: 'var(--text-content-on-content)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--type-family-heading-graphic2)',
          fontSize: 'var(--type-size-sm)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.25,
          letterSpacing: '-0.28px',
          color: 'var(--text-content-on-content)',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  return `${minutes} นาที ${String(remainingSeconds).padStart(2, '0')} วินาที`;
}

const AppointmentStaffHero = ({ staff, showAvgExamTime = true }) => {
  const policyLabel =
    staff.groupPolicyLabel || GROUP_POLICY_FALLBACK[staff.groupPolicy] || staff.groupPolicy;
  const thisMonthSeconds = Number.isFinite(staff.avgExamThisMonthSec)
    ? Math.max(0, Math.round(staff.avgExamThisMonthSec))
    : null;
  const lastMonthSeconds = Number.isFinite(staff.avgExamLastMonthSec)
    ? Math.max(0, Math.round(staff.avgExamLastMonthSec))
    : null;
  const hasMonthComparison = thisMonthSeconds !== null && lastMonthSeconds !== null && lastMonthSeconds > 0;
  const differenceSeconds = hasMonthComparison ? thisMonthSeconds - lastMonthSeconds : 0;
  const differencePercent = hasMonthComparison
    ? Math.abs((differenceSeconds / lastMonthSeconds) * 100)
    : 0;
  const comparisonLabel = differenceSeconds > 0
    ? 'มากกว่าเดือนก่อน'
    : differenceSeconds < 0
      ? 'น้อยกว่าเดือนก่อน'
      : 'เท่ากับเดือนก่อน';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--dim-space-600)',
        padding: 'var(--dim-space-400) var(--dim-space-600) var(--dim-space-400) var(--dim-space-400)',
        borderRadius: 'var(--dim-radius-500)',
        background:
          'linear-gradient(97.85deg, rgb(0, 147, 183) 0.67%, rgb(6, 178, 186) 100.76%)',
        color: 'var(--text-content-on-content)',
      }}
    >
      <div
        className='inline-flex items-center flex-wrap'
        style={{ gap: 'var(--dim-space-400)' }}
      >
        <StaffProfileAvatar staff={staff} size={68} ring />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            lineHeight: 1.5,
            color: 'var(--text-content-on-content)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-regular)',
            }}
          >
            {thaiDisplayName(staff)}
          </span>
          {staff.nameEn && (
            <span
              style={{
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-regular)',
              }}
            >
              {staff.nameEn}
            </span>
          )}
        </div>
      </div>

      <div
        aria-hidden
        style={{
          width: 'var(--dim-stroke-100)',
          height: 'var(--dim-size-600)',
          background: 'var(--border-table-line)',
          opacity: 0.5,
          flexShrink: 0,
        }}
      />

      <div
        className='inline-flex items-center flex-wrap'
        style={{
          flex: '1 1 0',
          minWidth: 0,
          gap: 'var(--dim-space-600)',
        }}
      >
        <HeroMetaColumn label='กิจกรรม' value={policyLabel} />
        {staff.subDivision && (
          <HeroMetaColumn label='กิจกรรมย่อย' value={staff.subDivision} />
        )}
        {staff.dept && <HeroMetaColumn label='แผนก' value={staff.dept} />}
      </div>

      {showAvgExamTime ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            justifyContent: 'center',
            padding: 'var(--dim-space-200) var(--dim-space-300)',
            borderRadius: 'var(--dim-radius-200)',
            background: 'var(--surface-card-100)',
            flexShrink: 0,
          }}
        >
        <span
          style={{
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            color: 'var(--text-neutral-default)',
          }}
        >
          {hasMonthComparison ? 'เวลาตรวจโดยเฉลี่ยเดือนนี้' : 'เวลาตรวจโดยเฉลี่ย'}
        </span>
        <span
          style={{
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg)',
            fontWeight: 'var(--type-weight-regular)',
            lineHeight: 1.5,
            color: 'var(--text-brandPrimary-default)',
          }}
        >
          {hasMonthComparison ? formatDuration(thisMonthSeconds) : `${staff.avgExamMin} นาที`}
        </span>
        {hasMonthComparison ? (
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-regular)',
              lineHeight: 1.5,
              marginTop: 'var(--dim-space-050)',
              whiteSpace: 'nowrap',
            }}
          >
            {comparisonLabel} {formatDuration(Math.abs(differenceSeconds))}
          </span>
        ) : null}
        {hasMonthComparison ? (
          <span
            style={{
              color: 'var(--text-statussummarycard-increase)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-xs)',
              fontWeight: 'var(--type-weight-medium)',
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            ({differencePercent.toFixed(1)}%)
          </span>
        ) : null}
        </div>
      ) : null}
    </div>
  );
};

export { StaffAvatar } from '@/components/appointment/StaffProfileAvatar';
export default AppointmentStaffHero;
