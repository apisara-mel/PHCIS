import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { FilterDropdown } from '@/components/forms/FilterTag';
import FilterDateTag from '@/components/forms/FilterDateTag';
import OverflowFlexRow from '@/components/overflow/OverflowFlexRow';
import Table from '@/components/table/Table';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import SuccessToast from '@/components/toast/SuccessToast';
import {
  DC_ROOMS, LESSON_DOMAINS,
  cancelLesson, daycareCenterOptions, formatShDate, getLessons, lessonDomainLabel,
  resolveDaycareCenter, roomLabel, saveLesson, todayIso,
} from '@/data/daycareCore';
import {
  Field, FieldRow, NoticeBar, PagerRow, SubCard,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* DaycareLessonsPage — บันทึกกิจกรรมการเรียนการสอนรายวัน (TOR §3.5.4)
   และเรียกดูประวัติย้อนหลัง (§3.5.5)

   จัดกลุ่มตาม "ด้านพัฒนาการ" ที่กิจกรรมนั้นส่งเสริม เพราะบันทึกชุดนี้ถูกใช้
   ประกอบการประเมิน DSPM ของเด็กแต่ละคน (ครูพี่เลี้ยงสังเกตระหว่างกิจกรรม
   แล้วพยาบาลนำมาอ้างอิงตอนประเมิน) ไม่ใช่แค่บันทึกว่าวันนี้สอนอะไร        */

const breadcrumb = ['สถานรับเลี้ยงเด็กกลางวัน', 'กิจกรรมการเรียนการสอน'];
const PAGE_SIZE = 10;

const TOPIC_SUGGESTIONS = [
  'เดินทรงตัวบนเส้น + โยนรับลูกบอล',
  'นิทานภาพ + ชี้ชื่อสิ่งของ',
  'ฝึกแปรงฟันหลังอาหารกลางวัน',
  'จับคู่รูปทรงและสี',
  'ฝึกใส่-ถอดรองเท้าด้วยตนเอง',
  'ร้องเพลงและทำท่าประกอบเป็นกลุ่ม',
];

const blankLesson = () => ({
  centerId: 'dc-21', room: 'room-pre', date: todayIso(),
  domain: 'motor', topic: '', detail: '', by: '',
});

const DaycareLessonsPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [center, setCenter] = useState('all');
  const [room, setRoom] = useState('all');
  const [domain, setDomain] = useState('all');
  const [dateFilter, setDateFilter] = useState({ quick: 'thismonth' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [toast, setToast] = useState('');

  const lessons = useMemo(
    () => getLessons({ centerId: center, room })
      .filter((l) => (domain === 'all' ? true : l.domain === domain)),
    [center, room, domain, tick],
  );

  const pageRows = lessons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const save = () => {
    if (!editing?.topic?.trim() || !editing?.date) return;
    saveLesson(editing);
    setEditing(null);
    setTick((t) => t + 1);
    setToast('บันทึกกิจกรรมการเรียนการสอนแล้ว');
  };

  const columns = useMemo(() => ([
    { key: 'date', label: 'วันที่', width: 130, render: (r) => formatShDate(r.date) },
    { key: 'roomLabel', label: 'ห้อง', flex: true, minWidth: 190, render: (r) => roomLabel(r.room) },
    {
      key: 'domain', label: 'ด้านพัฒนาการ', flex: true, minWidth: 190,
      render: (r) => <ColorfulBadge style='teal' size='small' hierarchy='secondary' width='hug'>{lessonDomainLabel(r.domain)}</ColorfulBadge>,
    },
    { key: 'topic', label: 'กิจกรรม', flex: true, minWidth: 250 },
    { key: 'detail', label: 'บันทึกการสังเกต', flex: true, minWidth: 300 },
    { key: 'by', label: 'ผู้บันทึก', flex: true, minWidth: 180 },
    {
      key: 'status', label: 'สถานะ', width: 130,
      render: (r) => (r.cancelled
        ? <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>ยกเลิกแล้ว</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>บันทึกแล้ว</ColorfulBadge>),
    },
    {
      key: 'actions', label: 'การดำเนินการ', width: 210, sortable: false,
      render: (r) => (r.cancelled ? '—' : (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); setEditing({ ...r }); }}>
            แก้ไข
          </NeutralSubdueButton>
          <DangerSubdueButton size='sm' leadingIcon='close' onClick={(e) => { e.stopPropagation(); setCancelTarget(r); setCancelReason(''); }}>
            ยกเลิก
          </DangerSubdueButton>
        </div>
      )),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  return (
    <QueuePageShell
      activeKey='daycare'
      breadcrumb={breadcrumb}
      title='กิจกรรมการเรียนการสอนรายวัน'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='arrow_back' onClick={() => history.push('/clinic/daycare')}>
            กลับหน้าเด็กในความดูแล
          </NeutralSubdueButton>
          <BrandSubdueButton size='sm' variant='fill' leadingIcon='add' onClick={() => setEditing(blankLesson())}>
            บันทึกกิจกรรมวันนี้
          </BrandSubdueButton>
        </div>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
        <NoticeBar tone='info' icon='psychology'>
          บันทึกกิจกรรมจัดกลุ่มตาม “ด้านพัฒนาการ” ที่กิจกรรมนั้นส่งเสริม เพื่อให้ใช้อ้างอิงตอนประเมิน DSPM
          ของเด็กรายคนได้ — สิ่งที่ครูพี่เลี้ยงสังเกตระหว่างกิจกรรมคือหลักฐานสำคัญของการประเมิน
        </NoticeBar>

        <SubCard>
          <OverflowFlexRow gap='var(--dim-space-300)'>
            <FilterDateTag prefix='ช่วงเวลา:' value={dateFilter} onChange={setDateFilter} defaultQuick='thismonth' />
            <FilterDropdown
              prefix='สถานรับเลี้ยง:'
              options={[{ value: 'all', label: 'ทุกแห่ง' }, ...daycareCenterOptions()]}
              value={center}
              onChange={(v) => { setCenter(v); setPage(1); }}
            />
            <FilterDropdown
              prefix='ห้อง:'
              options={[{ value: 'all', label: 'ทุกห้อง' }, ...DC_ROOMS]}
              value={room}
              onChange={(v) => { setRoom(v); setPage(1); }}
            />
            <FilterDropdown
              prefix='ด้านพัฒนาการ:'
              options={[{ value: 'all', label: 'ทุกด้าน' }, ...LESSON_DOMAINS]}
              value={domain}
              onChange={(v) => { setDomain(v); setPage(1); }}
            />
          </OverflowFlexRow>

          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            emptyMessage='ยังไม่มีบันทึกกิจกรรมในช่วงที่เลือก'
          />
          <PagerRow page={page} pageSize={PAGE_SIZE} total={lessons.length} onPageChange={setPage} unit='กิจกรรม' />
        </SubCard>
      </div>

      <Popup
        open={!!editing}
        onClose={() => setEditing(null)}
        size='large'
        title={editing?.id ? 'แก้ไขบันทึกกิจกรรม' : 'บันทึกกิจกรรมการเรียนการสอน'}
        subtitle={editing ? `${resolveDaycareCenter(editing.centerId)} · ${roomLabel(editing.room)}` : ''}
        primaryAction={{ label: 'บันทึก', onClick: save, disabled: !editing?.topic?.trim() || !editing?.date }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setEditing(null) }}
      >
        {editing && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <FieldRow>
              <Field label='วันที่' required>
                <DatePicker value={editing.date} onChange={(v) => setEditing((e) => ({ ...e, date: v }))} />
              </Field>
              <Field label='สถานรับเลี้ยง'>
                <Select value={editing.centerId} onChange={(v) => setEditing((e) => ({ ...e, centerId: v }))} options={daycareCenterOptions()} />
              </Field>
              <Field label='ห้อง'>
                <Select value={editing.room} onChange={(v) => setEditing((e) => ({ ...e, room: v }))} options={DC_ROOMS} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label='ด้านพัฒนาการที่ส่งเสริม'>
                <Select value={editing.domain} onChange={(v) => setEditing((e) => ({ ...e, domain: v }))} options={LESSON_DOMAINS} />
              </Field>
              <Field label='ผู้บันทึก'>
                <InputField value={editing.by} onChange={(v) => setEditing((e) => ({ ...e, by: v?.target ? v.target.value : v }))} placeholder='ชื่อครูพี่เลี้ยง / พยาบาล' />
              </Field>
            </FieldRow>
            <SuggestibleTextarea
              label='กิจกรรม'
              required
              value={editing.topic}
              onChange={(v) => setEditing((e) => ({ ...e, topic: v }))}
              suggestions={TOPIC_SUGGESTIONS}
              minChars={2}
              rows={2}
              voice
              placeholder='ชื่อกิจกรรมที่จัดในวันนี้'
            />
            <SuggestibleTextarea
              label='บันทึกการสังเกตเด็ก'
              value={editing.detail}
              onChange={(v) => setEditing((e) => ({ ...e, detail: v }))}
              suggestions={[
                'เด็กเข้าร่วมครบทุกคน ทำกิจกรรมได้ตามวัย',
                'มีเด็กที่ยังทำตามคำสั่ง 2 ขั้นตอนไม่ได้ — บันทึกไว้ประกอบการประเมินพัฒนาการ',
                'เด็กบางคนยังไม่กล้าเข้ากลุ่ม ต้องกระตุ้นเพิ่ม',
              ]}
              minChars={2}
              rows={3}
              voice
              placeholder='สิ่งที่สังเกตได้ระหว่างกิจกรรม โดยเฉพาะเด็กที่ทำไม่ได้ตามวัย'
            />
          </div>
        )}
      </Popup>

      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title='ยกเลิกบันทึกกิจกรรม'
        subtitle={cancelTarget ? `${formatShDate(cancelTarget.date)} · ${cancelTarget.topic}` : ''}
        primaryAction={{
          label: 'ยืนยันยกเลิก',
          onClick: () => {
            cancelLesson(cancelTarget.id, cancelReason);
            setCancelTarget(null);
            setTick((t) => t + 1);
            setToast('ยกเลิกบันทึกกิจกรรมแล้ว');
          },
          disabled: !cancelReason.trim(),
        }}
        secondaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
      >
        <SuggestibleTextarea
          label='เหตุผลการยกเลิก'
          required
          value={cancelReason}
          onChange={setCancelReason}
          suggestions={['บันทึกซ้ำ', 'ลงวันที่ผิด', 'กิจกรรมถูกยกเลิกจริง']}
          minChars={2}
          rows={3}
          voice
        />
      </Popup>

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default DaycareLessonsPage;
