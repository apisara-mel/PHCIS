import React from 'react';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import { Sym } from '@/components/forms/_inputBox';
import { DEFAULT_ROOMS, DEFAULT_QUOTAS } from '@/data/opdRoomConfig';
import {
  countActiveAppointmentsOnDate,
  evaluateDayAvailability,
  AVAILABILITY,
} from './appointmentSettingsStore';
import { ANY_DOCTOR_VALUE, formatApptListDate, parseDateKey } from './appointmentShared';

/* TOR 1.6.2.6 / 1.6.1.5 — ตรวจความซ้ำซ้อนของ Resource ก่อนยืนยันนัด.
   ตรวจ 6 ชั้น: แพทย์ซ้ำ · ห้องตรวจซ้ำ · โควตาคลินิก · โควตาคิวรายวัน ·
   วันหยุด (สถานพยาบาล / Resource) · ช่วงรับนัดล่วงหน้า + เตือนสิทธิหมดอายุ.

   ห้องตรวจ + โควตาหน่วยบริการอ่านจาก src/data/opdRoomConfig.js อย่างเดียว
   (ระบบ OPD เป็นเจ้าของไฟล์นั้น — โมดูลนัดหมายไม่เขียนกลับ). */

export const CONFLICT_SEVERITY = { BLOCK: 'block', WARN: 'warn' };

const periodOf = (time) => (Number(String(time || '00:00').split(':')[0]) < 12 ? 'เช้า' : 'บ่าย');

/** doctor + period → ห้องตรวจ ตามผังห้องของ OPD. */
const roomForDoctor = (doctor, time) => {
  if (!doctor) return null;
  const period = periodOf(time);
  return DEFAULT_ROOMS.find((r) => r.doctor === doctor && r.period === period)?.room || null;
};

/** คลินิก → หน่วยบริการที่มีโควตาใน opdRoomConfig. */
const quotaUnitForClinic = (clinic = '') => {
  const name = String(clinic);
  if (name.includes('ทันต')) return 'ตรวจรักษา';
  if (name.includes('อายุรกรรม')) return 'อายุรกรรม';
  if (name.includes('เด็ก') || name.includes('กุมาร')) return 'กุมารเวช';
  if (name.includes('จิต')) return 'จิตเวช';
  if (name.includes('ศัลย')) return 'ศัลยกรรม';
  return 'ตรวจรักษา';
};

const sameSlot = (a, date, time) => a.date === date && (a.time || '') === (time || '');

const isActive = (a) => a.status !== 'cancelled' && a.status !== 'no_show';

/**
 * ประเมินการชนทรัพยากรทั้งหมดของ slot ที่กำลังจะยืนยัน.
 * @returns {{ issues: Array, blocking: boolean, hasWarning: boolean, availability: object }}
 */
export function evaluateAppointmentConflicts({
  date,
  time,
  staffId = null,
  doctor = '',
  clinic = '',
  appointments = [],
  ignoreAppointmentId = null,
  patientCount = 1,
  rightsExpiry = null,
  needsRoom = true,
} = {}) {
  const issues = [];
  const pool = (appointments || []).filter(
    (a) => isActive(a) && a.id !== ignoreAppointmentId,
  );

  if (!date || !time) {
    issues.push({
      key: 'incomplete',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'ยังไม่ได้เลือกวัน-เวลานัด',
      detail: 'ต้องเลือกวันที่และช่วงเวลาก่อนจึงจะตรวจความซ้ำซ้อนได้',
    });
    return { issues, blocking: true, hasWarning: false, availability: null };
  }

  /* โควตาคิวรายวัน = ระดับ "หน่วยบริการ" เสมอ (staffId = null) ให้ตรงกับ
     AppointmentCapacityBar และตารางโควตาในหน้าตั้งค่า ที่นับแบบ facility-wide
     เช่นกัน — ถ้านับแยกรายแพทย์ ป้าย Available/Non-available จะขัดกับสิ่งที่
     ตอนกดยืนยันบังคับใช้จริง และ setCapacityOverride รายวัน (ตั้งระดับหน่วย
     บริการ) จะกลายเป็นเพดานรายแพทย์โดยไม่ตั้งใจ. */
  const bookedToday = countActiveAppointmentsOnDate(pool, date, null);
  const availability = evaluateDayAvailability({
    dateKey: date,
    staffId: null,
    bookedCount: bookedToday,
  });
  /* staffId ยังใช้เฉพาะกฎที่ผูกกับ Resource จริง ๆ — วันหยุด/รูปแบบตาราง/
     ช่วงรับนัดล่วงหน้าของแพทย์ท่านนั้น. */
  const resourceAvailability = staffId != null
    ? evaluateDayAvailability({ dateKey: date, staffId, bookedCount: bookedToday })
    : availability;

  if (availability.status === AVAILABILITY.FACILITY_HOLIDAY) {
    issues.push({
      key: 'facility_holiday',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'ตรงกับวันหยุดสถานพยาบาล',
      detail: `${formatApptListDate(date)} ถูกกำหนดเป็นวันหยุดสถานพยาบาล — สร้างนัดไม่ได้ (TOR 1.6.1.5)`,
    });
  }
  if (resourceAvailability.status === AVAILABILITY.RESOURCE_CLOSED) {
    issues.push({
      key: 'resource_closed',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'ตรงกับวันหยุดของ Resource',
      detail: `${doctor || 'Resource ที่เลือก'} ปิดให้บริการวันที่ ${formatApptListDate(date)}`,
    });
  }
  if (resourceAvailability.status === AVAILABILITY.CLOSED_WEEKDAY) {
    issues.push({
      key: 'closed_weekday',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'ไม่ใช่วันเปิดบริการตามรูปแบบตาราง',
      detail: 'วันในสัปดาห์นี้ไม่ได้อยู่ในรูปแบบตาราง Resource ที่ตั้งไว้',
    });
  }
  if (resourceAvailability.status === AVAILABILITY.OUT_OF_RANGE) {
    issues.push({
      key: 'out_of_range',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'เกินช่วงเปิดรับนัดล่วงหน้า',
      detail: 'วันที่ที่ขออยู่นอกช่วง advanceDays ที่ตั้งไว้ในรูปแบบตาราง Resource',
    });
  }
  if (availability.status === AVAILABILITY.PAST) {
    issues.push({
      key: 'past',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'วันที่ผ่านมาแล้ว',
      detail: 'ไม่สามารถสร้างนัดย้อนหลังได้',
    });
  }
  if (availability.status === AVAILABILITY.FULL) {
    issues.push({
      key: 'quota_day',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'เต็มโควตาคิวของวันนั้น',
      detail: `จองแล้ว ${availability.booked} จากโควตา ${availability.quota} คิว — ปรับโควตาได้ที่ ตั้งค่าระบบนัดหมาย › โควตาคิวรายวัน`,
    });
  } else if (availability.remaining > 0 && availability.remaining < patientCount) {
    issues.push({
      key: 'quota_group',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'คิวคงเหลือไม่พอสำหรับจำนวนผู้รับบริการ',
      detail: `ต้องการ ${patientCount} คิว แต่เหลือ ${availability.remaining} คิวในวันที่ ${formatApptListDate(date)}`,
    });
  }

  /* ── แพทย์ซ้ำซ้อน ── */
  const namedDoctor = doctor && doctor !== ANY_DOCTOR_VALUE ? doctor : '';
  if (!namedDoctor && staffId == null) {
    issues.push({
      key: 'no_doctor',
      severity: CONFLICT_SEVERITY.BLOCK,
      title: 'ยังไม่ได้ระบุแพทย์ผู้ตรวจ',
      detail: 'คำขอแบบ "ไม่ระบุแพทย์" ต้องเลือกแพทย์ หรือรับเข้าคิวรวม (pool) ก่อนยืนยัน (TOR 1.6.2.3)',
    });
  } else {
    const doctorClash = pool.filter((a) => (
      sameSlot(a, date, time)
      && (staffId != null
        ? String(a.staffId) === String(staffId)
        : a.doctor === namedDoctor)
    ));
    if (doctorClash.length) {
      issues.push({
        key: 'doctor',
        severity: CONFLICT_SEVERITY.BLOCK,
        title: 'แพทย์มีนัดในช่วงเวลานี้แล้ว',
        detail: `${namedDoctor || 'แพทย์ที่เลือก'} มีนัด ${doctorClash.length} รายการเวลา ${time} น. (${doctorClash.map((a) => a.patient).join(', ')})`,
      });
    }
  }

  /* ── ห้องตรวจซ้ำซ้อน ── */
  if (needsRoom && namedDoctor) {
    const room = roomForDoctor(namedDoctor, time);
    if (!room) {
      issues.push({
        key: 'room_unassigned',
        severity: CONFLICT_SEVERITY.WARN,
        title: 'ยังไม่ได้จัดห้องตรวจให้แพทย์ท่านนี้',
        detail: `ผังห้องตรวจช่วง${periodOf(time)}ยังไม่มี ${namedDoctor} — ตรวจสอบที่ระบบ OPD › ตั้งค่าห้องตรวจ`,
      });
    } else {
      const roommates = pool.filter((a) => (
        sameSlot(a, date, time)
        && a.doctor !== namedDoctor
        && roomForDoctor(a.doctor, a.time) === room
      ));
      if (roommates.length) {
        issues.push({
          key: 'room',
          severity: CONFLICT_SEVERITY.BLOCK,
          title: `${room} ถูกใช้งานในช่วงเวลานี้แล้ว`,
          detail: `${roommates[0].doctor} มีนัดใน${room} เวลา ${time} น.`,
        });
      }
    }
  }

  /* ── โควตาหน่วยบริการ (คลินิก) ── */
  const unit = quotaUnitForClinic(clinic);
  const unitQuota = DEFAULT_QUOTAS.find((q) => q.unit === unit);
  if (unitQuota) {
    const sameClinicToday = pool.filter(
      (a) => a.date === date && quotaUnitForClinic(a.clinic || a.dept) === unit,
    ).length;
    const projected = unitQuota.booked + sameClinicToday + patientCount;
    if (projected > unitQuota.quota) {
      issues.push({
        key: 'clinic_quota',
        severity: CONFLICT_SEVERITY.BLOCK,
        title: `เกินโควตาของหน่วยบริการ ${unit}`,
        detail: `โควตา ${unitQuota.quota} · ใช้ไปแล้ว ${unitQuota.booked + sameClinicToday} · คำขอนี้ต้องการอีก ${patientCount}`,
      });
    } else if (projected > unitQuota.quota - 3) {
      issues.push({
        key: 'clinic_quota_near',
        severity: CONFLICT_SEVERITY.WARN,
        title: `โควตาหน่วยบริการ ${unit} ใกล้เต็ม`,
        detail: `เหลืออีก ${unitQuota.quota - projected} คิวหลังยืนยันคำขอนี้`,
      });
    }
  }

  /* ── สิทธิการรักษาหมดอายุก่อนวันนัด ── */
  if (rightsExpiry && parseDateKey(rightsExpiry) < parseDateKey(date)) {
    issues.push({
      key: 'rights_expired',
      severity: CONFLICT_SEVERITY.WARN,
      title: 'สิทธิการรักษาหมดอายุก่อนวันนัด',
      detail: `สิทธิหมดอายุ ${formatApptListDate(rightsExpiry)} — ต้องต่อสิทธิหรือยืนยันทับพร้อมบันทึกเหตุผล`,
    });
  }

  return {
    issues,
    blocking: issues.some((i) => i.severity === CONFLICT_SEVERITY.BLOCK),
    hasWarning: issues.some((i) => i.severity === CONFLICT_SEVERITY.WARN),
    availability,
  };
}

const rowStyle = (severity) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--dim-space-200, 8px)',
  paddingTop: 'var(--dim-space-200, 8px)',
  paddingBottom: 'var(--dim-space-200, 8px)',
  paddingLeft: 'var(--dim-space-300, 12px)',
  paddingRight: 'var(--dim-space-300, 12px)',
  borderRadius: 'var(--dim-radius-200, 8px)',
  background: severity === CONFLICT_SEVERITY.BLOCK
    ? 'var(--surface-alert-error)'
    : 'var(--surface-alert-warning)',
});

const AppointmentConflictPanel = ({
  result,
  date,
  time,
  onFindEarliest,
  onPropose,
  compact = false,
}) => {
  if (!result) return null;
  const { issues, blocking, availability } = result;

  return (
    <section
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        paddingTop: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-400, 16px)',
        paddingLeft: 'var(--dim-space-400, 16px)',
        paddingRight: 'var(--dim-space-400, 16px)',
        borderRadius: 'var(--dim-radius-400, 12px)',
        border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
        background: 'var(--surface-card-100)',
      }}
    >
      <div className='flex items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <span
          className='flex items-center'
          style={{
            gap: 'var(--dim-space-200, 8px)',
            color: 'var(--text-content-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-sm, 14px)',
            fontWeight: 'var(--type-weight-medium)',
          }}
        >
          <Sym name='rule' size={18} color='var(--icon-brandPrimary-default)' />
          ตรวจความซ้ำซ้อนของทรัพยากร
        </span>
        <StatusBadge style={blocking ? 'error' : issues.length ? 'warning' : 'success'} size='small'>
          {blocking ? 'ยืนยันไม่ได้' : issues.length ? 'ยืนยันได้ (มีข้อควรระวัง)' : 'ไม่พบการชน'}
        </StatusBadge>
      </div>

      {availability ? (
        <div
          className='flex flex-wrap items-center'
          style={{
            gap: 'var(--dim-space-300, 12px)',
            color: 'var(--text-content-secondary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
          }}
        >
          <span>วันที่ {date ? formatApptListDate(date) : '—'} · เวลา {time || '—'} น.</span>
          <span>
            คิววันนั้น {availability.booked}/{availability.quota} · เหลือ {availability.remaining}
          </span>
          <StatusBadge style={availability.style} size='small'>
            {availability.label} — {availability.reason}
          </StatusBadge>
        </div>
      ) : null}

      {issues.length === 0 ? (
        <div
          style={{
            ...rowStyle(CONFLICT_SEVERITY.WARN),
            background: 'var(--surface-alert-success)',
          }}
        >
          <Sym name='check_circle' size={18} color='var(--icon-positive-success)' />
          <span
            style={{
              color: 'var(--text-alert-success)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            ไม่พบการชนของแพทย์ · ห้องตรวจ · โควตาคลินิก — ยืนยันนัดได้
          </span>
        </div>
      ) : (
        <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {issues.map((issue) => (
            <li key={issue.key} style={rowStyle(issue.severity)}>
              <Sym
                name={issue.severity === CONFLICT_SEVERITY.BLOCK ? 'block' : 'warning'}
                size={18}
                color={issue.severity === CONFLICT_SEVERITY.BLOCK
                  ? 'var(--icon-alertdialog-destructive)'
                  : 'var(--icon-alertdialog-warning)'}
              />
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                <span
                  style={{
                    color: issue.severity === CONFLICT_SEVERITY.BLOCK
                      ? 'var(--text-alert-error)'
                      : 'var(--text-alert-warning)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium)',
                  }}
                >
                  {issue.title}
                </span>
                <span
                  style={{
                    color: 'var(--text-content-secondary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                    lineHeight: 1.5,
                  }}
                >
                  {issue.detail}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!compact && blocking && (onFindEarliest || onPropose) ? (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {onFindEarliest ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='search' onClick={onFindEarliest}>
              ค้นหา Slot ว่างที่เร็วที่สุด
            </BrandSubdueButton>
          ) : null}
          {onPropose ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='event_repeat' onClick={onPropose}>
              เสนอเวลาใหม่
            </BrandSubdueButton>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default AppointmentConflictPanel;
