import React, { useCallback, useMemo, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import SuccessToast from '@/components/toast/SuccessToast';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  FONT_BODY,
  FONT_DISPLAY,
  INK_SECONDARY,
  INK_STRONG,
  SURFACE_CARD,
  Sym,
  accentOf,
} from '@/components/queue-display/queueDisplayUi';
import { useQueueSnapshot } from '@/components/queue-display/queueDisplayHooks';
import {
  QUEUE_ROLES,
  QUEUE_STATIONS,
  formatHm,
  getAnnouncement,
  getDefaultAnnouncement,
  getDisplayAudit,
  getQueueActor,
  getStationState,
  isDemoAutoCallRunning,
  setAnnouncement,
  setQueueActorRole,
  stopDemoAutoCall,
} from '@/data/queueDisplayView';

/* QueueAnnouncerConsolePage — /queue-center/display/console

   หน้าควบคุม **ตัวจอ** ที่นั่งคู่กับจอ TV (อยู่ในไดเรกทอรีของโมดูลจอ ไม่แตะ
   `src/pages/queue-center` ของโมดูล 1.3)

   ── ขอบเขต (สำคัญ) ──────────────────────────────────────────────────────
   ปุ่ม **เรียกคิว / เรียกซ้ำ / ยืนยันการมา / ไม่มาตามเรียก / เรียกกลับ /
   ยกเลิกคิว** อยู่ที่หน้าจัดการคิวของโมดูล 1.3 (`/queue-center`) **ที่เดียว**
   หน้านี้เคยมีปุ่มชุดที่สองซ้อนกัน ทำให้เจ้าหน้าที่มีสองหน้าที่กดเรียกคิวได้
   ด้วยคำ/ปุ่ม/ประวัติคนละแบบ (ผิดหลัก consistency & standards ของ Nielsen
   และทำให้ audit ของการเรียกคิวเดียวกันกระจายอยู่สองที่) จึงยุบเหลือเฉพาะ
   สิ่งที่เป็นของจอจริง ๆ:

   · แสดง (read-only) ว่าจอของจุดบริการนี้กำลังแสดงอะไร — เลขที่กำลังเรียก
     คิวถัดไป และหมายเลขที่เรียกผ่านไปแล้ว (พรีวิวของ TV2)
   · แก้ไข/บันทึก/ยกเลิกการแก้ **ข้อความประกาศ** บนแถบล่างของจอ (+ dirty guard)
   · ลิงก์เปิดจอของจุดบริการนี้ · หน้าเลือกจอ (เปิด/ปิด + ทดสอบเสียง)
   · หยุด "โหมดสาธิต" ที่เดินคิวอัตโนมัติ (affordance ที่จอ TV ชี้มาหา)
   · ประวัติเฉพาะการกระทำของฝั่งจอ (แก้ประกาศ / เรียกจากโหมดสาธิต)

   TOR ที่หน้านี้ครอบจริง: 1.3.4.1 (แสดงสถานะบนจอ + ข้อความประกาศ) และ
   1.3.4.2 (สถานะเสียง — ปุ่มเปิด/ทดสอบอยู่ที่หน้าเลือกจอเพราะต้อง user gesture)
   ส่วน 1.3.4.3 (เรียกซ้ำ) และ 1.3.4.5 (บันทึกการมายืนยัน) ครอบโดย
   `/queue-center` ของโมดูล 1.3

   สิทธิ: ผู้ใช้ที่ไม่มีสิทธิ (canOperate=false) ดูได้อย่างเดียว ปุ่มแก้ไข
   ข้อความประกาศถูก disabled พร้อมคำอธิบายว่าใครมีสิทธิ — ไม่ redirect เงียบ ๆ */

const breadcrumb = ['ระบบจัดการคิว', 'จอแสดงผลการเรียกคิว', 'คอนโซลจอ'];

/* ข้อความประกาศที่ใช้บ่อย — เป็น suggestions ของ SuggestibleTextarea
   (playbook §2.6 บังคับว่าช่องที่บุคลากรพิมพ์ต้องมี suggestions + minChars) */
const ANNOUNCEMENT_SUGGESTIONS = [
  'หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่ ณ จุดบริการ',
  'กรุณาเตรียมบัตรประชาชนและใบนัดให้พร้อมก่อนเข้ารับบริการ',
  'ขณะนี้มีผู้รับบริการจำนวนมาก ขออภัยในความล่าช้า',
  'ผู้สูงอายุ ผู้พิการ และสตรีมีครรภ์ ติดต่อเจ้าหน้าที่เพื่อรับคิวพิเศษได้ที่จุดประชาสัมพันธ์',
  'ปิดรับคิวนอกเวลาราชการ เวลา 16.00 น. กรุณาติดต่อเจ้าหน้าที่ก่อนเวลาปิดรับ',
  'งดสูบบุหรี่ภายในอาคาร และกรุณาสวมหน้ากากอนามัยตลอดเวลาที่อยู่ในจุดบริการ',
];

const ACTION_LABEL = {
  call: 'เรียกคิว',
  recall: 'เรียกคิวซ้ำ',
  'confirm-present': 'ยืนยันมาแล้ว',
  'confirm-absent': 'บันทึกไม่มาตามเรียก',
  'recall-passed': 'นำกลับเข้าคิว',
  undo: 'ยกเลิกการเรียกล่าสุด',
  cancel: 'ยกเลิกคิว',
  announcement: 'แก้ไขข้อความประกาศ',
};

const ACTION_TONE = {
  call: 'teal',
  recall: 'orange',
  'confirm-present': 'green',
  'confirm-absent': 'red',
  'recall-passed': 'blue',
  undo: 'yellow',
  cancel: 'red',
  announcement: 'indigo',
};

const panelStyle = {
  background: SURFACE_CARD,
  borderRadius: 'var(--dim-radius-500, 16px)',
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
  borderColor: 'var(--border-brandPrimary-quaternary, #E2F3EB)',
  boxShadow: 'var(--shadow-card-strong)',
  boxSizing: 'border-box',
  paddingTop: 'var(--dim-space-600, 24px)',
  paddingBottom: 'var(--dim-space-600, 24px)',
  paddingLeft: 'var(--dim-space-600, 24px)',
  paddingRight: 'var(--dim-space-600, 24px)',
};

const selectStyle = {
  minHeight: 'var(--dim-size-800, 40px)',
  borderRadius: 'var(--dim-radius-400, 12px)',
  borderStyle: 'solid',
  borderWidth: 'var(--dim-stroke-100, 1px)',
  borderColor: 'var(--border-card-default, #E2E4E6)',
  background: SURFACE_CARD,
  color: INK_STRONG,
  fontFamily: FONT_BODY,
  fontSize: 'var(--type-size-base, 16px)',
  paddingLeft: 'var(--dim-space-300, 12px)',
  paddingRight: 'var(--dim-space-300, 12px)',
};

const QueueAnnouncerConsolePage = () => {
  const history = useHistory();
  const [stationId, setStationId] = useState('st-opd');
  const [toast, setToast] = useState(null);
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceDraft, setAnnounceDraft] = useState('');
  const [announceBaseline, setAnnounceBaseline] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  /* bump เพื่อให้ actor/permission ที่อ่านจาก store แบบ synchronous
     re-render หลังสลับบทบาท (store ไม่ได้เป็น React state) */
  const [tick, setTick] = useState(0);

  /* useQueueSnapshot อ่านใหม่เองเมื่อ selector เปลี่ยน argument (deps ของ
     useCallback) และเมื่อ store notify — ไม่ต้องสะกิดด้วย effect อีก */
  const [state] = useQueueSnapshot(
    useCallback(() => getStationState(stationId, { nextCount: 12 }), [stationId]),
  );
  const [announcement, refreshAnnouncement] = useQueueSnapshot(
    useCallback(() => getAnnouncement(), []),
  );
  const [audit, refreshAudit] = useQueueSnapshot(
    useCallback(() => getDisplayAudit(stationId), [stationId]),
  );
  const [demoRunning, refreshDemo] = useQueueSnapshot(
    useCallback(() => isDemoAutoCallRunning(), []),
  );

  const actor = getQueueActor();
  const canOperate = !!actor.canOperate;
  const station = state && state.station;
  const current = state && state.current;
  const accent = accentOf(station && station.accent);

  /* `color` ต้องเป็นหนึ่งใน tone ที่มี token จริง —
     info · positive · inprogress · brand · destructive
     (SummaryCardsBar ประกอบชื่อ token จากค่านี้ตรง ๆ ใส่ค่าอื่นแล้วไทล์จะใส) */
  const summaryCards = useMemo(() => ([
    {
      key: 'calling',
      label: 'กำลังเรียก',
      value: current ? 1 : 0,
      color: 'inprogress',
      icon: 'campaign'},
    {
      key: 'waiting',
      label: 'รอเรียก',
      value: state ? state.next.length : 0,
      color: 'info',
      icon: 'schedule'},
    {
      key: 'confirmed',
      label: 'ยืนยันการมาแล้ว',
      value: current && current.confirmed === true ? 1 : 0,
      color: 'positive',
      icon: 'how_to_reg'},
    {
      key: 'passed',
      label: 'เรียกผ่านไปแล้ว',
      value: state ? state.passed.length : 0,
      color: 'destructive',
      icon: 'person_off'},
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [state, current, tick]);

  /* ── ตารางคิวถัดไป (อ่านอย่างเดียว — พรีวิวของสิ่งที่จอแสดง) ────── */
  const nextColumns = useMemo(() => ([
    {
      key: 'seq',
      label: 'ลำดับ',
      render: (row) => `คิวที่ ${row.seq}`,
    },
    {
      key: 'number',
      label: 'เลขคิว',
      render: (row) => (
        <ColorfulBadge style='teal' size='default' hierarchy='secondary' width='hug'>
          {row.number}
        </ColorfulBadge>
      ),
    },
    {
      key: 'statusLabel',
      label: 'สถานะที่แสดงบนจอ',
      flex: true,
      minWidth: 200,
      render: (row) => (row.statusBadge ? (
        <ColorfulBadge style={row.statusBadge} size='small' hierarchy='secondary' width='hug'>
          {row.statusLabel}
        </ColorfulBadge>
      ) : (row.statusLabel || '—')),
    },
  ]), []);

  /* ── ตารางหมายเลขที่เรียกผ่านไปแล้ว (อ่านอย่างเดียว) ───────────── */
  const passedColumns = useMemo(() => ([
    {
      key: 'number',
      label: 'เลขคิว',
      render: (row) => (
        <ColorfulBadge style='grey' size='default' hierarchy='secondary' width='hug'>
          {row.number}
        </ColorfulBadge>
      ),
    },
    {
      key: 'passedAt',
      label: 'เวลาที่ผ่านคิว',
      flex: true,
      minWidth: 200,
      render: (row) => `${formatHm(row.passedAt)} น.`,
    },
  ]), []);

  /* ── ตาราง audit ของฝั่งจอ ─────────────────────────────────────── */
  const auditColumns = useMemo(() => ([
    { key: 'ts', label: 'เวลา', render: (row) => `${formatHm(row.ts)} น.` },
    { key: 'number', label: 'เลขคิว', render: (row) => row.number || '—' },
    {
      key: 'action',
      label: 'การกระทำ',
      render: (row) => (
        <ColorfulBadge style={ACTION_TONE[row.action] || 'grey'} size='small' hierarchy='secondary' width='hug'>
          {ACTION_LABEL[row.action] || row.action}
        </ColorfulBadge>
      ),
    },
    { key: 'actor', label: 'ผู้ทำรายการ', render: (row) => row.actor || '—' },
    { key: 'detail', label: 'รายละเอียด', flex: true, minWidth: 260, render: (row) => row.detail || '—' },
  ]), []);

  /* ── ข้อความประกาศ (แสดง / บันทึก / ยกเลิก / แก้ไข) ─────────────── */
  const openAnnouncement = () => {
    const text = (announcement && announcement.text) || '';
    setAnnounceDraft(text);
    setAnnounceBaseline(text);
    setAnnounceOpen(true);
  };

  const announceDirty = announceDraft !== announceBaseline;

  const closeAnnouncement = () => {
    /* dirty guard — แก้ค้างไว้แล้วกดยกเลิกต้องถามยืนยันก่อนทิ้ง */
    if (announceDirty) setDiscardOpen(true);
    else setAnnounceOpen(false);
  };

  const saveAnnouncement = () => {
    setAnnouncement(announceDraft, actor.name);
    setAnnounceOpen(false);
    refreshAnnouncement();
    refreshAudit();
    setToast('บันทึกข้อความประกาศบนจอแล้ว');
  };

  const handleStopDemo = () => {
    stopDemoAutoCall();
    refreshDemo();
    setToast('หยุดโหมดสาธิตแล้ว — คิวจะขยับเฉพาะเมื่อเจ้าหน้าที่กดเรียกเท่านั้น');
  };

  const emptyPermissionNote = canOperate
    ? null
    : `บัญชีนี้ (${actor.name} · ${actor.role}) ดูข้อมูลได้อย่างเดียว — การแก้ไขข้อความประกาศบนจอ ต้องใช้สิทธิ “เจ้าหน้าที่จุดบริการ” หรือ “ผู้ดูแลระบบคิว”`;

  return (
    <QueuePageShell
      activeKey='queue-center'
      breadcrumb={breadcrumb}
      summaryTitle={`คอนโซลจอแสดงผล · ${station ? station.label : ''}`}
      summaryCards={summaryCards}
    >
      {/* ── ทิ้งการแก้ไขข้อความประกาศ ───────────────────────────────── */}
      <AlertDialog
        open={discardOpen}
        type='warning'
        title='ทิ้งการแก้ไขข้อความประกาศ?'
        description='ข้อความที่แก้ไว้จะไม่ถูกบันทึก และจอ TV จะยังแสดงข้อความเดิม'
        confirmLabel='ทิ้งการแก้ไข'
        cancelLabel='กลับไปแก้ต่อ'
        onCancel={() => setDiscardOpen(false)}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => {
          setDiscardOpen(false);
          setAnnounceOpen(false);
          setAnnounceDraft(announceBaseline);
        }}
      />

      {/* ── แก้ไขข้อความประกาศ ─────────────────────────────────────── */}
      <Popup
        open={announceOpen}
        onClose={closeAnnouncement}
        title='แก้ไขข้อความประกาศบนจอ'
        subtitle='ข้อความนี้จะวิ่งบนแถบล่างของจอ TV ทุกเครื่องที่เปิดอยู่'
        tertiaryAction={{ label: 'ยกเลิก', onClick: closeAnnouncement }}
        secondaryAction={{
          label: 'คืนค่าเริ่มต้น',
          onClick: () => setAnnounceDraft(getDefaultAnnouncement()),
        }}
        primaryAction={{
          label: 'บันทึกข้อความ',
          onClick: saveAnnouncement,
          disabled: !announceDirty,
        }}
      >
        <SuggestibleTextarea
          voice
          label='ข้อความประกาศ'
          value={announceDraft}
          onChange={(e) => setAnnounceDraft((e && e.target && e.target.value) || '')}
          placeholder='พิมพ์ข้อความที่จะให้วิ่งบนจอ หรือกดไมโครโฟนเพื่อพูด'
          suggestions={ANNOUNCEMENT_SUGGESTIONS}
          minChars={2}
          height={160}
        />
        <p style={{ marginTop: 'var(--dim-space-200, 8px)', marginBottom: 0, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
          เว้นว่างไว้ = จอจะแสดงชื่อหน่วยงานแทน (แถบประกาศจะไม่หายไป เพื่อให้ความสูงของจอคงเดิม)
        </p>
      </Popup>

      <SuccessToast open={!!toast} message={toast || ''} onClose={() => setToast(null)} />

      {/* padding เป็น longhand เสมอ — inline shorthand ที่มี var() ถูก CSSOM
          ทิ้งจนกลายเป็น 0 (ดู CLAUDE.md / บันทึกบั๊กของโปรเจกต์) */}
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* ── สิทธิไม่พอ ───────────────────────────────────────────── */}
        {emptyPermissionNote ? (
          <div
            role='status'
            style={{
              ...panelStyle,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--dim-space-300, 12px)',
              background: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
              borderColor: 'var(--border-colorfulbadge-warning, #FEF08A)',
            }}
          >
            <Sym name='lock' size={24} color='var(--text-colorfulbadge-yellow, #A16207)' />
            <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-colorfulbadge-yellow, #A16207)', lineHeight: 1.6 }}>
              {emptyPermissionNote}
            </span>
          </div>
        ) : null}

        {/* ── โหมดสาธิตกำลังทำงาน (มาจากหน้าเลือกจอ และเดินข้ามหน้าได้) ── */}
        {demoRunning ? (
          <div
            role='status'
            style={{
              ...panelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-400, 16px)',
              flexWrap: 'wrap',
              background: 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
              borderColor: 'var(--border-colorfulbadge-warning, #FEF08A)',
            }}
          >
            <Sym name='autoplay' size={24} color='var(--text-colorfulbadge-yellow, #A16207)' />
            <span style={{ flex: '1 1 320px', minWidth: 0, fontFamily: FONT_BODY, fontSize: 'var(--type-size-base, 16px)', color: 'var(--text-colorfulbadge-yellow, #A16207)', lineHeight: 1.6 }}>
              โหมดสาธิตกำลังทำงาน — ระบบเรียกคิวถัดไปอัตโนมัติทุก 15 วินาที
              ในข้อมูลชุดเดียวกับที่ใช้งานจริง หยุดก่อนเริ่มให้บริการจริงเสมอ
            </span>
            <NeutralSubdueButton size='md' leadingIcon='stop_circle' onClick={handleStopDemo}>
              หยุดโหมดสาธิต
            </NeutralSubdueButton>
          </div>
        ) : null}

        {/* ── แผงจอที่กำลังดูแล ───────────────────────────────────── */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-600, 24px)' }}>
          <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, minWidth: 280 }}>
              จอของจุดบริการ / ห้องตรวจ
              <select value={stationId} onChange={(e) => setStationId(e.target.value)} style={selectStyle}>
                {QUEUE_STATIONS.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{`${s.label} · ${s.zone} ${s.floor}`}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, minWidth: 240 }}>
              บทบาทผู้ใช้ (สำหรับทดสอบสิทธิ)
              <select
                value={actor.key}
                onChange={(e) => { setQueueActorRole(e.target.value); setTick((t) => t + 1); }}
                style={selectStyle}
              >
                {QUEUE_ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{`${r.name} · ${r.role}`}</option>
                ))}
              </select>
            </label>

            <div style={{ flex: '1 1 auto' }} />

            <div style={{ display: 'flex', gap: 'var(--dim-space-400, 16px)', flexWrap: 'wrap' }}>
              <Link
                to={`/queue-center/display/station?room=${encodeURIComponent(stationId)}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--dim-space-200, 8px)',
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                <Sym name='tv' size={20} color='var(--text-brandPrimary-default, #007549)' />
                เปิดจอของจุดบริการนี้
              </Link>
              <Link
                to='/queue-center/display'
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--dim-space-200, 8px)',
                  fontFamily: FONT_BODY,
                  fontSize: 'var(--type-size-sm, 14px)',
                  color: 'var(--text-brandPrimary-default, #007549)',
                }}
              >
                <Sym name='volume_up' size={20} color='var(--text-brandPrimary-default, #007549)' />
                ตั้งค่าจอ / เปิด-ทดสอบเสียง
              </Link>
            </div>
          </div>

          {/* สิ่งที่จอแสดงอยู่ตอนนี้ (อ่านอย่างเดียว) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-600, 24px)',
              flexWrap: 'wrap',
              background: 'var(--surface-neutralButton-quaternary, #F9FBFB)',
              borderRadius: 'var(--dim-radius-500, 16px)',
              borderStyle: 'solid',
              borderWidth: 'var(--dim-stroke-200, 2px)',
              borderColor: accent,
              boxSizing: 'border-box',
              paddingTop: 'var(--dim-space-600, 24px)',
              paddingBottom: 'var(--dim-space-600, 24px)',
              paddingLeft: 'var(--dim-space-600, 24px)',
              paddingRight: 'var(--dim-space-600, 24px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)', minWidth: 220 }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-lg, 18px)', color: INK_SECONDARY }}>
                หมายเลขที่แสดงบนจอขณะนี้
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-5xl, 48px)', fontWeight: 'var(--type-weight-bold, 700)', lineHeight: 1.1, color: INK_STRONG }}>
                {current ? current.number : '—'}
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY }}>
                {current
                  ? `เรียกล่าสุด ${formatHm(current.calledAt)} น. · ครั้งที่ ${current.callCount}${current.confirmed === true ? ' · ยืนยันการมาแล้ว' : ''}`
                  : 'ยังไม่มีคิวที่กำลังเรียกในจุดบริการนี้'}
              </span>
            </div>

            {/* การเรียกคิวทั้งหมดทำที่หน้าจัดการคิวของโมดูล 1.3 ที่เดียว */}
            <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-300, 12px)' }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
                เรียกคิวถัดไป · เรียกซ้ำ · ยืนยันการมา / ไม่มาตามเรียก · เรียกกลับ · ยกเลิกคิว
                ทำที่ <b>หน้าจัดการคิว</b> ที่เดียว เพื่อให้ประวัติการเรียกทุกครั้งอยู่ในที่เดียวกัน
              </span>
              {/* ปุ่มจริง ไม่ใช่ <button> ซ้อนใน <a> (interactive ซ้อนกันไม่ถูก
                  ตามสเปก HTML และ screen reader อ่านซ้ำสองครั้ง) */}
              <div style={{ alignSelf: 'flex-start' }}>
                <BrandSubdueButton
                  variant='fill'
                  size='md'
                  leadingIcon='campaign'
                  onClick={() => history.push('/queue-center')}
                >
                  ไปที่หน้าจัดการคิวและเรียกคิว
                </BrandSubdueButton>
              </div>
            </div>
          </div>

          {/* ข้อความประกาศปัจจุบัน */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--dim-space-400, 16px)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-100, 4px)' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-lg, 18px)', color: INK_SECONDARY }}>
                ข้อความประกาศบนจอขณะนี้
              </span>
              <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-base, 16px)', color: INK_STRONG, lineHeight: 1.6 }}>
                {(announcement && announcement.text) || '—'}
              </span>
              {announcement && announcement.updatedAt ? (
                <span style={{ fontFamily: FONT_BODY, fontSize: 'var(--type-size-xs, 12px)', color: INK_SECONDARY }}>
                  {`แก้ไขล่าสุด ${formatHm(announcement.updatedAt)} น. โดย ${announcement.updatedBy}`}
                </span>
              ) : null}
            </div>
            <BrandSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='edit'
              disabled={!canOperate}
              title={!canOperate ? 'ไม่มีสิทธิแก้ไขข้อความประกาศ' : undefined}
              onClick={openAnnouncement}
            >
              แก้ไขข้อความประกาศ
            </BrandSubdueButton>
          </div>
        </div>

        {/* ── ตารางคิวถัดไป ─────────────────────────────────────────── */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
            คิวถัดไปที่จะขึ้นบนจอ
          </h2>
          <Table
            columns={nextColumns}
            rows={(state && state.next) || []}
            rowKey={(row) => row.queueId}
            emptyMessage='ไม่มีคิวรอที่จุดบริการนี้'
          />
        </div>

        {/* ── ตารางเรียกผ่านไปแล้ว ─────────────────────────────────── */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
            หมายเลขที่เรียกผ่านไปแล้ว (แสดงบนแถบล่างของจอ)
          </h2>
          <Table
            columns={passedColumns}
            rows={(state && state.passed) || []}
            rowKey={(row) => row.queueId}
            emptyMessage='ยังไม่มีหมายเลขที่เรียกผ่านไป'
          />
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
            ผู้รับบริการที่มาติดต่อภายหลัง ให้กด “เรียกกลับ” ที่หน้าจัดการคิว —
            คิวจะกลับเข้าแถวและหายจากรายการนี้บนจอทันที
          </p>
        </div>

        {/* ── ประวัติของฝั่งจอ (audit trail) ───────────────────────── */}
        <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
          <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 'var(--type-size-xl, 20px)', fontWeight: 'var(--type-weight-medium, 500)', color: INK_STRONG }}>
            ประวัติการทำรายการของจอ (ใหม่สุดอยู่บนสุด)
          </h2>
          <Table
            columns={auditColumns}
            rows={(audit || []).slice(0, 60)}
            rowKey={(row) => row.id}
            emptyMessage='ยังไม่มีการแก้ไขข้อความประกาศหรือการทำรายการจากจอนี้'
          />
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 'var(--type-size-sm, 14px)', color: INK_SECONDARY, lineHeight: 1.6 }}>
            ประวัติการเรียกคิวรายใบ (เรียก / เรียกซ้ำ / ยืนยันการมา / ยกเลิก) ดูได้ที่หน้าจัดการคิว
          </p>
        </div>
      </div>
    </QueuePageShell>
  );
};

export default QueueAnnouncerConsolePage;
