import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Tooltip from '@/components/tooltip/Tooltip';
import Select from '@/components/forms/Select';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import { Sym, PANEL_LABEL_STYLE, PANEL_VALUE_STYLE } from '@/pages/treat/panels/panelKit';
import { useTreatmentAccess, useTreatmentStore, PanelAlert } from '@/pages/treat/panels/panelHooks';
import {
  TREATMENT_PERMISSION_MODES, setTreatmentAccessMode,
} from '@/data/treatmentAccess';
import {
  subscribeProblemList, activeProblemsForPatient,
} from '@/data/treatmentProblemList';
import {
  subscribeLabNotifications, getLabNotifications, unreadLabNotificationCount,
  acknowledgeLabNotification, startTelemedSession, getInterface,
} from '@/data/treatmentInterfaces';

/* PHCIS | EMR §1.4.3.21 — แถบเฝ้าระวังคลินิกระหว่างตรวจรักษา.
   TOR ระบุว่าข้อมูลการแพ้ต้องเห็น "บนหน้าจอระหว่างการตรวจรักษา" —
   แถบนี้จึงติดอยู่ทุก step (sticky ใต้ PatientCard) ไม่ต้องกดเข้าไปดู.

   รวม 6 เรื่องไว้ในแถบเดียว:
     1. การแพ้ยา/อาหาร/สารเคมี + ปฏิกิริยา (§1.4.3.21)
     2. Flag ความปลอดภัย / DNR / บริจาคอวัยวะ (§1.4.3.15, §1.4.3.20)
     3. จำนวนโรคที่กำลังรักษา (problem list)
     4. กระดิ่งแจ้งเตือนผลแล็บเสร็จ + ตัวนับที่ยังไม่รับทราบ (§1.4.7.2)
     5. ชิปโหมดสิทธิ์ + ตัวสลับเพื่อตรวจ state สิทธิ์ไม่พอ (§1.4.2.1)
     6. ปุ่มปรึกษาทางไกลของ visit นี้ (§1.4.3.23)

   แยก "ไม่พบประวัติแพ้" (ยืนยันเชิงบวก) ออกจาก "ยังไม่ได้ซักประวัติ"
   ด้วยสีคนละสี — การไม่มีข้อมูลกับยังไม่ได้ถามไม่ใช่เรื่องเดียวกัน. */

const RAIL_SURFACE = {
  borderRadius: 'var(--dim-radius-400, 12px)',
  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
  background: 'var(--surface-card-100)',
  boxShadow: 'var(--shadow-card)',
  paddingTop: 'var(--dim-space-300, 12px)',
  paddingRight: 'var(--dim-space-400, 16px)',
  paddingBottom: 'var(--dim-space-300, 12px)',
  paddingLeft: 'var(--dim-space-400, 16px)',
};

const severityTone = (s) => (s === 'critical' ? 'red' : s === 'high' ? 'orange' : 'yellow');

const AllergyChip = ({ entry }) => (
  <Tooltip
    position='bottom'
    maxWidth={320}
    content={`${entry.name} — ${entry.symptom || 'ไม่ได้ระบุปฏิกิริยา'}${entry.notedOn ? ` · พบอาการเมื่อ ${entry.notedOn}` : ''}`}
  >
    <span style={{ display: 'inline-flex' }}>
      <ColorfulBadge style={severityTone(entry.severity)} size='small' width='hug' icon='warning' hierarchy='primary'>
        {entry.name}
      </ColorfulBadge>
    </span>
  </Tooltip>
);

const TreatmentSafetyRail = ({ patient, form, stickyTop = 'var(--dim-size-1400, 64px)' }) => {
  const history = useHistory();
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [problems] = useTreatmentStore(
    subscribeProblemList,
    () => activeProblemsForPatient(hn),
    [hn],
  );
  const [notifications] = useTreatmentStore(
    subscribeLabNotifications,
    () => getLabNotifications().filter((n) => n.hn === hn),
    [hn],
  );

  const [labOpen, setLabOpen] = useState(false);
  const [telemedOpen, setTelemedOpen] = useState(false);
  const [telemedResult, setTelemedResult] = useState(null);

  const allergies = patient?.drugAllergies || [];
  const flags = patient?.flags || {};

  /* "ยังไม่ได้ซักประวัติการแพ้" ต่างจาก "ไม่แพ้" — ใช้ธง allergyDrug /
     allergyOther ประกอบกับ form.allergies เพื่อแยกสองกรณีนี้ */
  const allergyReviewed = !!(flags.allergyDrug || flags.allergyOther || String(form?.allergies || '').trim());
  const unread = unreadLabNotificationCount(hn);
  const criticalUnread = notifications.filter((n) => n.critical && !n.acknowledgedAt).length;

  const telemedIface = getInterface('telemed');
  const rightsExpired = !!patient?.rightsExpired;

  const modeMeta = TREATMENT_PERMISSION_MODES.find((m) => m.key === access.mode);

  return (
    <div
      className='w-full min-w-0'
      style={{
        position: 'sticky',
        top: stickyTop,
        zIndex: 20,
        paddingLeft: 'var(--dim-space-600, 24px)',
        paddingRight: 'var(--dim-space-600, 24px)',
        paddingTop: 'var(--dim-space-200, 8px)',
        paddingBottom: 'var(--dim-space-200, 8px)',
        background: 'var(--background-screen-brand-100, #F4FBF8)',
      }}
    >
      <div className='flex flex-wrap items-center w-full' style={{ ...RAIL_SURFACE, gap: 'var(--dim-space-400, 16px)' }}>
        {/* 1 · การแพ้ยา / สารเคมี — เห็นตลอดเวลา */}
        <div className='flex flex-wrap items-center min-w-0' style={{ gap: 'var(--dim-space-200, 8px)', flex: '2 1 320px' }}>
          <Sym name='release_alert' size={18} color='var(--icon-dangerButton-default, #B91C1C)' />
          <span style={{ ...PANEL_LABEL_STYLE, fontWeight: 'var(--type-weight-bold)' }}>การแพ้:</span>
          {allergies.length > 0 ? (
            allergies.map((a, i) => <AllergyChip key={`${a.name}-${i}`} entry={a} />)
          ) : allergyReviewed ? (
            <StatusBadge style='success' size='small' icon='verified'>
              ไม่พบประวัติแพ้ยา / สารเคมี (ทบทวนเมื่อ {form?.vitalsRecordedAt || 'การตรวจครั้งนี้'})
            </StatusBadge>
          ) : (
            <StatusBadge style='warning' size='small' icon='help'>
              ยังไม่ได้ซักประวัติการแพ้ — ต้องซักก่อนสั่งยา
            </StatusBadge>
          )}
        </div>

        {/* 2 · Flag ความปลอดภัย / DNR / บริจาคอวัยวะ */}
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {flags.dnr ? (
            <Tooltip content='ผู้รับบริการแสดงเจตนาไม่ประสงค์รับการช่วยฟื้นคืนชีพ (DNR)' position='bottom'>
              <span style={{ display: 'inline-flex' }}>
                <StatusBadge style='error' size='small' icon='do_not_disturb_on'>DNR</StatusBadge>
              </span>
            </Tooltip>
          ) : null}
          {flags.organDonor ? (
            <Tooltip content='ผู้รับบริการแสดงความจำนงบริจาคอวัยวะ' position='bottom'>
              <span style={{ display: 'inline-flex' }}>
                <StatusBadge style='info' size='small' icon='volunteer_activism'>บริจาคอวัยวะ</StatusBadge>
              </span>
            </Tooltip>
          ) : null}
          {flags.fallRisk ? (
            <StatusBadge style='warning' size='small' icon='personal_injury'>เสี่ยงพลัดตกหกล้ม</StatusBadge>
          ) : null}
          {flags.vip ? <StatusBadge style='purple' size='small' icon='star'>VIP</StatusBadge> : null}
          {rightsExpired ? (
            <Tooltip content='สิทธิการรักษาหมดอายุ — ยืนยันสิทธิก่อนส่งยาหรือออกใบส่งต่อ' position='bottom'>
              <span style={{ display: 'inline-flex' }}>
                <StatusBadge style='error' size='small' icon='gpp_maybe'>สิทธิหมดอายุ</StatusBadge>
              </span>
            </Tooltip>
          ) : null}
        </div>

        {/* 3 · โรคที่กำลังรักษา */}
        <Tooltip
          position='bottom'
          maxWidth={320}
          content={problems.length ? problems.map((p) => `${p.name} (${p.code})`).join('\n') : 'ยังไม่มีรายการโรคที่กำลังรักษา'}
        >
          <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <Sym name='fact_check' size={16} color='var(--icon-neutral-tertiary, #ADB2B7)' />
            <span style={PANEL_LABEL_STYLE}>โรคที่รักษาอยู่</span>
            <ColorfulBadge style={problems.length ? 'teal' : 'grey'} size='small' width='hug'>
              {problems.length}
            </ColorfulBadge>
          </span>
        </Tooltip>

        {/* 4 · กระดิ่งผลแล็บ */}
        <button
          type='button'
          onClick={() => setLabOpen(true)}
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
          }}
          aria-label={`การแจ้งเตือนผลแล็บ ${unread} รายการที่ยังไม่รับทราบ`}
        >
          <Sym
            name={unread ? 'notifications_active' : 'notifications'}
            size={18}
            color={criticalUnread ? 'var(--icon-dangerButton-default, #B91C1C)' : 'var(--icon-neutral-tertiary, #ADB2B7)'}
          />
          <span style={PANEL_LABEL_STYLE}>ผลแล็บ</span>
          {unread ? (
            <StatusBadge style={criticalUnread ? 'error' : 'info'} size='small'>{unread}</StatusBadge>
          ) : (
            <span style={PANEL_LABEL_STYLE}>รับทราบครบแล้ว</span>
          )}
        </button>

        {/* 6 · ปรึกษาทางไกล */}
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='video_camera_front'
          onClick={() => setTelemedOpen(true)}
        >
          ปรึกษาทางไกล
        </BrandSubdueButton>

        {/* 5 · ชิปโหมดสิทธิ์ + ตัวสลับ (ใช้ตรวจ state สิทธิ์ไม่พอได้จริง) */}
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', marginLeft: 'auto', minWidth: 240 }}>
          <Sym name='shield_person' size={16} color='var(--icon-neutral-tertiary, #ADB2B7)' />
          <Select
            value={access.mode}
            onChange={(v) => setTreatmentAccessMode(v)}
            options={TREATMENT_PERMISSION_MODES.map((m) => ({ value: m.key, label: m.label }))}
            placeholder='โหมดสิทธิ์'
            showLabel={false}
            showHelperText={false}
            size='md'
          />
        </div>
      </div>

      {/* คำเตือนเสริมใต้แถบเมื่อสิทธิ์ไม่พอ — ห้ามซ่อนเงียบ ๆ */}
      {!access.canEdit && access.canView ? (
        <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
          <PanelAlert tone='info' icon='visibility' title={`โหมด "${modeMeta?.label}"`}>
            ปุ่มบันทึก แก้ไข ยกเลิก และพิมพ์ ถูกปิดไว้ทั้งระบบบันทึกการรักษา — ยังอ่านข้อมูลได้ตามปกติ
          </PanelAlert>
        </div>
      ) : null}
      {access.canEdit && !access.canSeeConfidential ? (
        <div style={{ marginTop: 'var(--dim-space-200, 8px)' }}>
          <PanelAlert tone='warning' icon='lock' title='ไม่มีสิทธิ์ระดับข้อมูลลับ'>
            ฟิลด์และเอกสารที่ถูกทำเครื่องหมายว่าเป็นข้อมูลลับจะแสดงเป็น •••• — กด "ขอเปิดดู" เพื่อบันทึกการเข้าถึง
          </PanelAlert>
        </div>
      ) : null}

      {/* กล่องแจ้งเตือนผลแล็บ */}
      <AlertDialog
        open={labOpen}
        type={criticalUnread ? 'warning' : 'info'}
        title='การแจ้งเตือนผลตรวจทางห้องปฏิบัติการ'
        description={
          notifications.length === 0
            ? 'ยังไม่มีผลตรวจที่แจ้งเตือนสำหรับผู้รับบริการรายนี้'
            : `ทั้งหมด ${notifications.length} รายการ · ยังไม่รับทราบ ${unread} รายการ${criticalUnread ? ` (ค่าวิกฤต ${criticalUnread} รายการ)` : ''}`
        }
        confirmLabel='ไปหน้าสถานะการเชื่อมต่อ'
        cancelLabel='ปิด'
        onConfirm={() => { setLabOpen(false); history.push('/treat/interfaces'); }}
        onCancel={() => setLabOpen(false)}
        onClose={() => setLabOpen(false)}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className='flex flex-wrap items-center justify-between w-full'
              style={{
                gap: 'var(--dim-space-200, 8px)',
                borderRadius: 'var(--dim-radius-300, 10px)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                paddingTop: 'var(--dim-space-200, 8px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                paddingBottom: 'var(--dim-space-200, 8px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
              }}
            >
              <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <span style={PANEL_VALUE_STYLE}>{n.testName}</span>
                  {n.critical ? <StatusBadge style='error' size='small' icon='priority_high'>ค่าวิกฤต</StatusBadge> : null}
                </span>
                <span style={PANEL_LABEL_STYLE}>ผลเสร็จ {n.completedAt} · แจ้งไปยัง {n.recipient}</span>
                {n.acknowledgedAt ? (
                  <span style={PANEL_LABEL_STYLE}>รับทราบแล้วเมื่อ {n.acknowledgedAt}</span>
                ) : null}
              </div>
              {n.acknowledgedAt ? (
                <StatusBadge style='success' size='small' icon='check'>รับทราบแล้ว</StatusBadge>
              ) : (
                <NeutralSubdueButton
                  variant='outline'
                  size='sm'
                  leadingIcon='check'
                  onClick={() => acknowledgeLabNotification(n.id)}
                >
                  รับทราบ
                </NeutralSubdueButton>
              )}
            </div>
          ))}
        </div>
      </AlertDialog>

      {/* เริ่มการปรึกษาทางไกล */}
      <AlertDialog
        open={telemedOpen}
        type={telemedIface?.status === 'up' ? 'info' : 'warning'}
        title='เริ่มการปรึกษาทางไกล (Telemedicine)'
        description={
          telemedIface?.status === 'up'
            ? `เปิดห้องสนทนาสำหรับ ${patient?.name || 'ผู้รับบริการ'} — หากต้องการบันทึกภาพ/เสียง ต้องได้รับความยินยอมก่อนทุกครั้ง`
            : `ระบบปรึกษาทางไกลอยู่ในสถานะ "${telemedIface?.status === 'down' ? 'ขาดการเชื่อมต่อ' : 'ตอบสนองช้า'}" — เริ่มสนทนาได้แต่คุณภาพอาจไม่เสถียร`
        }
        confirmLabel='เริ่มห้องสนทนา (ไม่บันทึกภาพ)'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          const res = startTelemedSession({
            hn,
            patientName: patient?.name || '',
            recording: false,
            consentBy: '',
          });
          setTelemedOpen(false);
          setTelemedResult(res);
        }}
        onCancel={() => setTelemedOpen(false)}
        onClose={() => setTelemedOpen(false)}
      />

      <AlertDialog
        open={!!telemedResult}
        type={telemedResult?.ok ? 'success' : 'warning'}
        title={telemedResult?.ok ? 'เปิดห้องสนทนาแล้ว' : 'เริ่มการสนทนาไม่สำเร็จ'}
        description={
          telemedResult?.ok
            ? 'สถานะปัจจุบัน: รอผู้รับบริการเข้าห้อง — หากผู้รับบริการไม่เข้าห้องภายในเวลาที่กำหนด ระบบจะบันทึกเป็น "ผู้ป่วยไม่เข้าห้อง" ไม่ค้างที่หน้าเชื่อมต่อ'
            : telemedResult?.message || ''
        }
        confirmLabel='ดูรายการ session'
        cancelLabel='ปิด'
        onConfirm={() => { setTelemedResult(null); history.push('/treat/interfaces'); }}
        onCancel={() => setTelemedResult(null)}
        onClose={() => setTelemedResult(null)}
      />
    </div>
  );
};

export default TreatmentSafetyRail;
