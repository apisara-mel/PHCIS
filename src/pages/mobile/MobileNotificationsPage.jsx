import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  HealthInfoSheet,
  MobileHeader,
  MobileShell,
  NotificationCard,
} from '@/components/mobile';
import { usePhcisLink } from '@/data/phcisLink';

// Figma 262:28529 — Appointment: Notifications
const notifications = [
  {
    id: 'pharmacy-ready',
    icon: 'baht',
    tone: 'green',
    title: 'พร้อมชำระเงินแล้ว',
    time: '1 นาทีที่แล้ว',
    body: 'เภสัชกรจัดยาสำหรับการปรึกษาวันที่ 1 ก.ค. 2569 เรียบร้อยแล้ว แตะเพื่อดูรายการและชำระเงิน',
    showButton: true,
    unread: true,
  },
  {
    id: 'health-form',
    icon: 'ecg_heart',
    tone: 'green',
    title: 'กรอกข้อมูลสุขภาพก่อนพบแพทย์',
    time: '6 นาทีที่แล้ว',
    body: 'กรอกข้อมูลสุขภาพก่อนพบแพทย์ โดยสามารถกรอกก่อนได้ถึงก่อนเวลานัดหมาย',
    unread: true,
  },
  {
    id: 'confirmed',
    icon: 'check',
    tone: 'green',
    title: 'ยืนยันการนัดหมายแล้ว',
    time: '5 นาทีที่แล้ว',
    body: 'นัดกับ นพ. สมชาย ใจดี วันที่ 5 ก.ค. 2569 เวลา 10:00 น. ได้รับการยืนยันเรียบร้อย',
    unread: true,
  },
  {
    id: 'doctor-changed',
    icon: 'swap_horiz',
    tone: 'orange',
    title: 'เปลี่ยนแพทย์ผู้ตรวจ',
    time: '1 ชม. ที่แล้ว',
    body: 'แพทย์เปลี่ยนจาก นพ. สมชาย ใจดี เป็น พญ. ศิริพร วงศ์ดี สำหรับนัดวันที่ 5 ก.ค. 2569',
    unread: true,
  },
  {
    id: 'time-changed',
    icon: 'clock',
    tone: 'blue',
    title: 'เปลี่ยนเวลานัดหมาย',
    time: '1 ชม. ที่แล้ว',
    body: 'เวลานัดเปลี่ยนจาก 10:00 น. เป็น 13:30 น. วันที่ 5 ก.ค. 2569 โปรดตรวจสอบ',
    unread: false,
  },
  {
    id: 'cancelled',
    icon: 'close',
    tone: 'red',
    title: 'ยกเลิกการนัดหมาย',
    time: 'เมื่อวานนี้',
    body: 'การนัดหมายวันที่ 2 ก.ค. 2569 ถูกยกเลิก แตะเพื่อดูรายละเอียดหรือจองใหม่',
    unread: false,
  },
];

const MobileNotificationsPage = () => {
  const history = useHistory();
  const { appointments } = usePhcisLink();
  const [healthSheetOpen, setHealthSheetOpen] = useState(false);
  const hasCompletedTelemed = appointments.some((appointment) => appointment.telemedDone);
  const visibleNotifications = hasCompletedTelemed
    ? notifications
    : notifications.filter((notification) => notification.id !== 'pharmacy-ready');

  return (
    <MobileShell
      showBottomNav={false}
      background='var(--surface-card-100, #FFFFFF)'
      statusBarStyle={{ height: 'var(--dim-size-1050, 50px)' }}
    >
      <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <MobileHeader
          title='การแจ้งเตือน'
          backIcon='chevron_left'
          onBack={() => history.goBack()}
          right={<span aria-hidden style={{ width: 'var(--dim-size-800, 40px)', height: 'var(--dim-size-800, 40px)' }} />}
          containerStyle={{
            height: 'var(--dim-size-1500, 68px)',
            padding: '0 var(--dim-space-200, 8px)',
            gap: 'var(--dim-space-300, 12px)',
            background: 'var(--surface-navigation-default, #FFFFFF)',
            borderBottom: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-brand-drop-bottom-100)',
          }}
          titleStyle={{
            textAlign: 'center',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-base, 16px)',
            fontWeight: 'var(--type-weight-regular, 400)',
            lineHeight: 1.5,
            letterSpacing: 0,
            color: 'var(--text-content-default, #363B3F)',
          }}
        />

        <main role='list' aria-label='รายการแจ้งเตือน' style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {visibleNotifications.map((notification) => (
            <div role='listitem' key={notification.id}>
              <NotificationCard
                title={notification.title}
                time={notification.time}
                body={notification.body}
                icon={notification.icon}
                tone={notification.tone}
                showButton={Boolean(notification.showButton)}
                onButtonClick={() => history.push('/m/pharmacy/payment')}
                onClick={notification.id === 'health-form'
                  ? () => setHealthSheetOpen(true)
                  : notification.id === 'pharmacy-ready'
                    ? () => history.push('/m/pharmacy/payment')
                    : undefined}
              />
            </div>
          ))}
        </main>
        <HealthInfoSheet
          open={healthSheetOpen}
          onClose={() => setHealthSheetOpen(false)}
        />
      </div>
    </MobileShell>
  );
};

export default MobileNotificationsPage;
