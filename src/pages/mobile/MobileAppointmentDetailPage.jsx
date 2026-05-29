import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  MobileCard,
  MobileButton,
  MobileBadge,
  Sym,
} from '@/components/mobile/MobileShell';
import { APPOINTMENTS, CLINICS, findAppointment } from '@/data/mobileMock';

/* MIH PHCIS Mobile · Appointment detail.
   Implements TOR §4.2.2 (reschedule) + §4.2.3 (cancel) + §4.2.4 (summary).
   For video-type appointments, surfaces a "เข้าห้องตรวจ" CTA that routes
   to /m/telemed (TOR §4.3 stub).                                          */

const formatThaiDate = (yyyy_mm_dd) => {
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const [y, m, d] = yyyy_mm_dd.split('-').map(Number);
  return `${d} ${months[m - 1]} ${y}`;
};

const typeMeta = {
  visit:     { icon: 'medical_services', label: 'พบแพทย์',   tone: 'brand' },
  video:     { icon: 'video_camera_front', label: 'วิดีโอคอล', tone: 'info' },
  homevisit: { icon: 'home_health', label: 'เยี่ยมบ้าน',     tone: 'success' },
};

const Row = ({ label, value, mono = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--dim-space-300, 12px)', padding: '10px 0', borderBottom: '1px solid var(--border-content-quaternary, #F0F1F3)' }}>
    <span style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-tertiary)' }}>{label}</span>
    <span style={{
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-bold, 700)',
      color: 'var(--text-content-primary)',
      fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
      textAlign: 'right',
    }}>{value}</span>
  </div>
);

const MobileAppointmentDetailInner = () => {
  const history = useHistory();
  const { id } = useParams();
  const [cancelled, setCancelled] = useState(false);

  const apt = findAppointment(id);
  if (!apt) {
    return (
      <>
        <MobileHeader title='ไม่พบนัดหมาย' onBack={() => history.push('/m/appointments')} />
        <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
          <MobileCard>
            <p style={{ margin: 0, color: 'var(--text-content-secondary)' }}>
              ไม่พบนัดหมายรหัส {id} ในระบบ
            </p>
          </MobileCard>
        </div>
      </>
    );
  }

  const meta = typeMeta[apt.type] || typeMeta.visit;
  const clinic = CLINICS.find((c) => c.code === apt.clinic);

  const onCancel = () => {
    if (window.confirm('ยืนยันการยกเลิกนัดหมายนี้?')) setCancelled(true);
  };

  return (
    <>
      <MobileHeader title='รายละเอียดนัดหมาย' onBack={() => history.push('/m/appointments')} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        {/* Hero card */}
        <MobileCard padding='var(--dim-space-500, 20px)'>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', marginBottom: 'var(--dim-space-300, 12px)' }}>
            <span style={{
              width: 56, height: 56, borderRadius: 'var(--dim-radius-400, 12px)',
              background: 'linear-gradient(135deg, #007549 0%, #4CC6AE 100%)',
              color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sym name={meta.icon} size={28} fill />
            </span>
            <div>
              <MobileBadge tone={meta.tone}>{meta.label}</MobileBadge>
              {cancelled && <MobileBadge tone='warning'>ยกเลิกแล้ว</MobileBadge>}
              {apt.status === 'past' && <MobileBadge>เสร็จสิ้น</MobileBadge>}
              <p style={{
                margin: '4px 0 0',
                fontFamily: 'var(--type-family-display)',
                fontSize: 'var(--type-size-xl, 20px)',
                fontWeight: 'var(--type-weight-bold, 700)',
                color: 'var(--text-content-primary)',
              }}>
                {formatThaiDate(apt.date)} · {apt.time} น.
              </p>
            </div>
          </div>

          <div>
            <Row label='ศูนย์บริการ' value={clinic ? clinic.name : '-'} />
            <Row label='คลินิก'      value={apt.deptLabel} />
            <Row label='ผู้ตรวจ'      value={apt.doctor} />
            {apt.staffPhone && <Row label='เบอร์ติดต่อ' value={apt.staffPhone} mono />}
            <Row label='รหัสนัดหมาย'  value={apt.id} mono />
            <Row label='หมายเหตุ'    value={apt.note || '-'} />
          </div>
        </MobileCard>

        {/* CTAs */}
        {apt.status === 'upcoming' && !cancelled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
            {apt.type === 'video' && (
              <MobileButton icon='video_call' onClick={() => history.push(`/m/telemed?apt=${apt.id}`)}>
                เข้าห้องตรวจวิดีโอคอล
              </MobileButton>
            )}
            <MobileButton variant='secondary' icon='edit_calendar' onClick={() => history.push(`/m/book?reschedule=${apt.id}`)}>
              เลื่อนนัดหมาย
            </MobileButton>
            <MobileButton variant='danger' icon='cancel' onClick={onCancel}>
              ยกเลิกนัดหมาย
            </MobileButton>
          </div>
        )}

        {/* Notification reminder (4.2.5) */}
        {apt.status === 'upcoming' && !cancelled && (
          <MobileCard padding='var(--dim-space-300, 12px)' style={{ background: 'var(--surface-info-quaternary, #ECF4FE)', borderColor: 'var(--border-info-default, #1F6FEB)' }}>
            <div className='flex items-start' style={{ gap: 8 }}>
              <Sym name='notifications_active' size={20} color='var(--text-info-default, #1F6FEB)' />
              <p style={{ margin: 0, fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-secondary)' }}>
                ระบบจะส่งการแจ้งเตือนก่อนถึงเวลานัด <strong>1 วัน</strong> และ <strong>1 ชั่วโมง</strong>
              </p>
            </div>
          </MobileCard>
        )}
      </div>
    </>
  );
};

const MobileAppointmentDetailPage = () => (
  <MobileShell>
    <MobileAppointmentDetailInner />
  </MobileShell>
);

export default MobileAppointmentDetailPage;
