import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import { FilterDropdown } from '@/components/forms/FilterTag';
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
import { ExportFormatPopup } from '@/pages/consent/consentExportPopup';
import { buildExportReport } from '@/pages/dashboard/dashboardReportKit';
import {
  DCY_EXPORT_COLUMNS, DC_ROOMS,
  buildDcyExportRows, childFullName, daycareCenterOptions, dischargeDaycareChild,
  formatAgeMonths, formatShDate, getDaycareChildren, getDcyExportLog, logDcyExport,
  resolveDaycareCenter, restoreDaycareChild, roomLabel, saveDaycareChild,
} from '@/data/daycareCore';
import {
  Field, FieldRow, NoticeBar, PagerRow,
} from '@/pages/clinic/school-health/schoolHealthShared';

/* DaycareChildRegistryPage — ทะเบียนเด็กในสถานรับเลี้ยง (TOR §3.5.1)

   จุดสำคัญตามมติ คทง.5 ครั้งที่ 4: ฟอร์มนี้ต้องเก็บ **ฟิลด์ที่กรมกิจการเด็ก
   และเยาวชน (ดย.) ต้องการ** ไว้ด้วย (ประเภทเด็ก · อาชีพผู้ปกครอง · รายได้
   ครัวเรือน · ความพิการ) เพราะเดิมเจ้าหน้าที่ต้องคีย์สองรอบ — ครั้งหนึ่งใน
   ระบบศูนย์ฯ อีกครั้งในฐานข้อมูลเด็กปฐมวัยของ ดย. ระบบใหม่จึงรวมไว้ที่เดียว
   แล้ว "นำส่งออกข้อมูล ดย." เป็นไฟล์รวมในนามสำนักอนามัย                  */

const breadcrumb = ['สถานรับเลี้ยงเด็กกลางวัน', 'ทะเบียนเด็ก'];
const PAGE_SIZE = 10;

const CHILD_TYPE_OPTIONS = [
  { value: 'เด็กปกติ', label: 'เด็กปกติ' },
  { value: 'เด็กด้อยโอกาส', label: 'เด็กด้อยโอกาส' },
  { value: 'เด็กพิการ', label: 'เด็กพิการ' },
  { value: 'เด็กกำพร้า', label: 'เด็กกำพร้า' },
];

const INCOME_OPTIONS = [
  { value: 'ต่ำกว่า 15,000 บาท/เดือน', label: 'ต่ำกว่า 15,000 บาท/เดือน' },
  { value: '15,000–30,000 บาท/เดือน', label: '15,000–30,000 บาท/เดือน' },
  { value: 'มากกว่า 30,000 บาท/เดือน', label: 'มากกว่า 30,000 บาท/เดือน' },
];

const DISCHARGE_REASONS = [
  'เข้าเรียนชั้นอนุบาลแล้ว',
  'ย้ายที่อยู่ออกนอกพื้นที่',
  'ผู้ปกครองขอถอนชื่อ',
  'อายุเกินเกณฑ์ของสถานรับเลี้ยง',
];

const blankChild = () => ({
  centerId: 'dc-21', room: 'room-toddler',
  prefix: 'ด.ช.', firstName: '', lastName: '', nationalId: '', birthDate: '', sex: 'ชาย',
  guardianName: '', guardianRelation: '', guardianPhone: '', address: '',
  rights: 'สิทธิบัตรทอง (UC เด็ก)', congenital: '', allergies: '',
  enrolledAt: '', active: true,
  dcyFields: { childType: 'เด็กปกติ', guardianOccupation: '', householdIncome: 'ต่ำกว่า 15,000 บาท/เดือน', disability: 'ไม่มี' },
});

const DaycareChildRegistryPage = () => {
  const history = useHistory();
  const [tick, setTick] = useState(0);
  const [center, setCenter] = useState('all');
  const [room, setRoom] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [dischargeTarget, setDischargeTarget] = useState(null);
  const [dischargeReason, setDischargeReason] = useState('');
  const [exportReport, setExportReport] = useState(null);
  const [toast, setToast] = useState('');
  const searchHistory = useSearchHistory('mih:daycare-registry', { limit: 8 });

  const children = useMemo(
    () => getDaycareChildren({ centerId: center, includeInactive: showInactive }),
    [center, showInactive, tick],
  );

  const rows = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return children
      .filter((c) => (room === 'all' ? true : c.room === room))
      .filter((c) => (q
        ? [childFullName(c), c.nationalId, c.guardianName].some((f) => String(f || '').toLowerCase().includes(q))
        : true))
      .map((c) => ({
        ...c,
        name: childFullName(c),
        ageLabel: formatAgeMonths(c.birthDate),
        roomLabel: roomLabel(c.room),
        centerLabel: resolveDaycareCenter(c.centerId),
        childType: c.dcyFields?.childType || '—',
      }));
  }, [children, room, searchQ]);

  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exportLog = getDcyExportLog();

  const openExport = () => {
    const dcyRows = buildDcyExportRows({ centerId: center });
    setExportReport(buildExportReport(
      'dcy-children',
      'ข้อมูลเด็กปฐมวัยเพื่อนำส่งกรมกิจการเด็กและเยาวชน (ดย.)',
      DCY_EXPORT_COLUMNS,
      dcyRows,
    ));
  };

  const saveChild = () => {
    if (!editing?.firstName?.trim() || !editing?.lastName?.trim() || !editing?.birthDate) return;
    saveDaycareChild(editing);
    setEditing(null);
    setTick((t) => t + 1);
    setToast('บันทึกทะเบียนเด็กแล้ว');
  };

  const columns = useMemo(() => ([
    { key: 'name', label: 'ชื่อ-นามสกุล', flex: true, minWidth: 190 },
    { key: 'nationalId', label: 'เลขบัตรประชาชน', width: 150 },
    { key: 'ageLabel', label: 'อายุ', width: 110 },
    { key: 'roomLabel', label: 'ห้อง/กลุ่มอายุ', flex: true, minWidth: 170 },
    { key: 'guardianName', label: 'ผู้ปกครอง', flex: true, minWidth: 170 },
    {
      key: 'childType', label: 'ประเภทเด็ก (ดย.)', flex: true, minWidth: 140,
      render: (r) => <ColorfulBadge style={r.childType === 'เด็กปกติ' ? 'grey' : 'indigo'} size='small' hierarchy='secondary' width='hug'>{r.childType}</ColorfulBadge>,
    },
    {
      key: 'status', label: 'สถานะ', width: 130,
      render: (r) => (r.active === false
        ? <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>จำหน่ายแล้ว</ColorfulBadge>
        : <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>อยู่ในความดูแล</ColorfulBadge>),
    },
    {
      key: 'actions', label: 'การดำเนินการ', width: 250, sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-150, 6px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='edit' onClick={(e) => { e.stopPropagation(); setEditing({ ...r }); }}>
            แก้ไข
          </NeutralSubdueButton>
          {r.active === false ? (
            <NeutralSubdueButton
              size='sm' leadingIcon='restart_alt'
              onClick={(e) => { e.stopPropagation(); restoreDaycareChild(r.id); setTick((t) => t + 1); setToast('เปิดใช้งานทะเบียนเด็กคืนแล้ว'); }}
            >
              เปิดใช้งาน
            </NeutralSubdueButton>
          ) : (
            <DangerSubdueButton size='sm' leadingIcon='person_remove' onClick={(e) => { e.stopPropagation(); setDischargeTarget(r); setDischargeReason(''); }}>
              จำหน่าย
            </DangerSubdueButton>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), []);

  return (
    <QueuePageShell
      activeKey='daycare'
      breadcrumb={breadcrumb}
      title='ทะเบียนเด็กในสถานรับเลี้ยงเด็กกลางวัน'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='arrow_back' onClick={() => history.push('/clinic/daycare')}>
            กลับหน้าเด็กในความดูแล
          </NeutralSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='ios_share' onClick={openExport}>
            นำส่งออกข้อมูล ดย.
          </NeutralSubdueButton>
          <BrandSubdueButton size='sm' variant='fill' leadingIcon='person_add' onClick={() => setEditing(blankChild())}>
            เพิ่มเด็ก
          </BrandSubdueButton>
        </div>
      )}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
        <NoticeBar tone='info' icon='sync_alt'>
          ฟิลด์ที่กำกับ “(ดย.)” คือข้อมูลที่กรมกิจการเด็กและเยาวชนต้องการ — เก็บที่นี่ที่เดียว
          แล้วกด “นำส่งออกข้อมูล ดย.” เพื่อส่งเป็นไฟล์รวมในนามสำนักอนามัย ไม่ต้องคีย์ซ้ำในระบบ ดย. อีก (มติ คทง.5 ครั้งที่ 4)
          {exportLog.length > 0 && ` · ส่งออกล่าสุด ${exportLog[0].at} โดย ${exportLog[0].by}`}
        </NoticeBar>

        <div
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card-strong)',
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-500)',
          }}
        >
          <div className='w-full flex items-center' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex-1' />
            <PrimarySearch
              value={searchQ}
              onChange={setSearchQ}
              onSubmit={(label) => { setSearchQ(label); setPage(1); }}
              history={searchHistory.history}
              onHistoryClear={searchHistory.history.length > 0 ? searchHistory.clear : undefined}
              placeholder='ค้นหาชื่อเด็ก / เลขบัตรประชาชน / ผู้ปกครอง'
            />
            <div className='flex-1' />
          </div>

          <OverflowFlexRow gap='var(--dim-space-300)'>
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
              prefix='แสดง:'
              options={[{ value: 'active', label: 'เฉพาะที่อยู่ในความดูแล' }, { value: 'all', label: 'รวมที่จำหน่ายแล้ว' }]}
              value={showInactive ? 'all' : 'active'}
              onChange={(v) => { setShowInactive(v === 'all'); setPage(1); }}
            />
          </OverflowFlexRow>

          <SearchResultCount found={rows.length} total={children.length} />
          <Table
            columns={columns}
            rows={pageRows}
            rowKey={(r) => r.id}
            onRowClick={(r) => history.push(`/clinic/daycare/child/${r.id}`)}
            emptyMessage='ยังไม่มีเด็กในทะเบียน — กด “เพิ่มเด็ก” เพื่อเริ่มบันทึก'
          />
          <PagerRow page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} unit='คน' />
        </div>
      </div>

      {/* ฟอร์มทะเบียนเด็ก — ส่วนบนคือข้อมูลที่ ศบส. ใช้เอง ส่วนล่างคือฟิลด์ ดย. */}
      <Popup
        open={!!editing}
        onClose={() => setEditing(null)}
        size='extraLarge'
        title={editing?.id ? 'แก้ไขทะเบียนเด็ก' : 'เพิ่มเด็กเข้าสถานรับเลี้ยง'}
        subtitle='ข้อมูลที่กำกับ (ดย.) จะถูกรวมในไฟล์นำส่งกรมกิจการเด็กและเยาวชน'
        primaryAction={{
          label: 'บันทึก',
          onClick: saveChild,
          disabled: !editing?.firstName?.trim() || !editing?.lastName?.trim() || !editing?.birthDate,
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setEditing(null) }}
      >
        {editing && (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <FieldRow>
              <Field label='คำนำหน้า' minWidth={120}>
                <Select
                  value={editing.prefix}
                  onChange={(v) => setEditing((e) => ({ ...e, prefix: v, sex: v === 'ด.ญ.' ? 'หญิง' : 'ชาย' }))}
                  options={[{ value: 'ด.ช.', label: 'ด.ช.' }, { value: 'ด.ญ.', label: 'ด.ญ.' }]}
                />
              </Field>
              <Field label='ชื่อ' required>
                <InputField value={editing.firstName} onChange={(v) => setEditing((e) => ({ ...e, firstName: v?.target ? v.target.value : v }))} placeholder='ชื่อจริง' />
              </Field>
              <Field label='นามสกุล' required>
                <InputField value={editing.lastName} onChange={(v) => setEditing((e) => ({ ...e, lastName: v?.target ? v.target.value : v }))} placeholder='นามสกุล' />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='เลขบัตรประชาชน'>
                <InputField value={editing.nationalId} onChange={(v) => setEditing((e) => ({ ...e, nationalId: v?.target ? v.target.value : v }))} placeholder='13 หลัก' />
              </Field>
              <Field label='วันเกิด' required>
                <DatePicker value={editing.birthDate} onChange={(v) => setEditing((e) => ({ ...e, birthDate: v }))} />
              </Field>
              <Field label='วันที่รับเข้า'>
                <DatePicker value={editing.enrolledAt} onChange={(v) => setEditing((e) => ({ ...e, enrolledAt: v }))} />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='สถานรับเลี้ยง'>
                <Select value={editing.centerId} onChange={(v) => setEditing((e) => ({ ...e, centerId: v }))} options={daycareCenterOptions()} />
              </Field>
              <Field label='ห้อง/กลุ่มอายุ'>
                <Select value={editing.room} onChange={(v) => setEditing((e) => ({ ...e, room: v }))} options={DC_ROOMS} />
              </Field>
              <Field label='สิทธิการรักษา'>
                <InputField value={editing.rights} onChange={(v) => setEditing((e) => ({ ...e, rights: v?.target ? v.target.value : v }))} />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='ชื่อผู้ปกครอง'>
                <InputField value={editing.guardianName} onChange={(v) => setEditing((e) => ({ ...e, guardianName: v?.target ? v.target.value : v }))} />
              </Field>
              <Field label='ความสัมพันธ์'>
                <InputField value={editing.guardianRelation} onChange={(v) => setEditing((e) => ({ ...e, guardianRelation: v?.target ? v.target.value : v }))} placeholder='เช่น มารดา / ยาย' />
              </Field>
              <Field label='เบอร์ติดต่อ'>
                <InputField value={editing.guardianPhone} onChange={(v) => setEditing((e) => ({ ...e, guardianPhone: v?.target ? v.target.value : v }))} />
              </Field>
            </FieldRow>

            <Field label='ที่อยู่' flex='1 1 100%'>
              <InputField value={editing.address} onChange={(v) => setEditing((e) => ({ ...e, address: v?.target ? v.target.value : v }))} />
            </Field>

            <FieldRow>
              <Field label='โรคประจำตัว'>
                <InputField value={editing.congenital} onChange={(v) => setEditing((e) => ({ ...e, congenital: v?.target ? v.target.value : v }))} placeholder='ไม่มี = ใส่ -' />
              </Field>
              <Field label='ประวัติการแพ้'>
                <InputField value={editing.allergies} onChange={(v) => setEditing((e) => ({ ...e, allergies: v?.target ? v.target.value : v }))} placeholder='แพ้ยา / แพ้อาหาร' />
              </Field>
            </FieldRow>

            <NoticeBar tone='info' icon='folder_shared'>
              ส่วนด้านล่างคือฟิลด์ที่กรมกิจการเด็กและเยาวชน (ดย.) ต้องการ — กรอกที่นี่ที่เดียว ไม่ต้องคีย์ซ้ำในระบบ ดย.
            </NoticeBar>

            <FieldRow>
              <Field label='ประเภทเด็ก (ดย.)'>
                <Select
                  value={editing.dcyFields?.childType}
                  onChange={(v) => setEditing((e) => ({ ...e, dcyFields: { ...e.dcyFields, childType: v } }))}
                  options={CHILD_TYPE_OPTIONS}
                />
              </Field>
              <Field label='อาชีพผู้ปกครอง (ดย.)'>
                <InputField
                  value={editing.dcyFields?.guardianOccupation}
                  onChange={(v) => setEditing((e) => ({ ...e, dcyFields: { ...e.dcyFields, guardianOccupation: v?.target ? v.target.value : v } }))}
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label='รายได้ครัวเรือน (ดย.)'>
                <Select
                  value={editing.dcyFields?.householdIncome}
                  onChange={(v) => setEditing((e) => ({ ...e, dcyFields: { ...e.dcyFields, householdIncome: v } }))}
                  options={INCOME_OPTIONS}
                />
              </Field>
              <Field label='ความพิการ (ดย.)'>
                <InputField
                  value={editing.dcyFields?.disability}
                  onChange={(v) => setEditing((e) => ({ ...e, dcyFields: { ...e.dcyFields, disability: v?.target ? v.target.value : v } }))}
                  placeholder='ไม่มี / ระบุประเภท'
                />
              </Field>
            </FieldRow>
          </div>
        )}
      </Popup>

      {/* จำหน่ายเด็ก — เหตุผลบังคับ + เปิดใช้งานคืนได้ */}
      <Popup
        open={!!dischargeTarget}
        onClose={() => setDischargeTarget(null)}
        title='จำหน่ายเด็กออกจากสถานรับเลี้ยง'
        subtitle={dischargeTarget ? `${dischargeTarget.name} · ${dischargeTarget.roomLabel}` : ''}
        primaryAction={{
          label: 'ยืนยันจำหน่าย',
          onClick: () => {
            dischargeDaycareChild(dischargeTarget.id, dischargeReason);
            setDischargeTarget(null);
            setTick((t) => t + 1);
            setToast('จำหน่ายเด็กออกจากทะเบียนแล้ว — เปิดใช้งานคืนได้จากตัวกรอง “รวมที่จำหน่ายแล้ว”');
          },
          disabled: !dischargeReason.trim(),
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setDischargeTarget(null) }}
      >
        <SuggestibleTextarea
          label='เหตุผลการจำหน่าย'
          required
          value={dischargeReason}
          onChange={setDischargeReason}
          suggestions={DISCHARGE_REASONS}
          minChars={2}
          rows={3}
          voice
          placeholder='ระบุเหตุผล เช่น เข้าเรียนชั้นอนุบาลแล้ว'
        />
      </Popup>

      <ExportFormatPopup
        open={!!exportReport}
        report={exportReport}
        onClose={() => setExportReport(null)}
        onExported={() => {
          logDcyExport({ centerId: center, format: 'file', rows: exportReport?.table?.rows?.length || 0 });
          setToast('นำส่งออกข้อมูล ดย. แล้ว — ระบบบันทึก log การส่งออก');
          setTick((t) => t + 1);
        }}
      />

      <SuccessToast open={!!toast} message={toast} onClose={() => setToast('')} />
    </QueuePageShell>
  );
};

export default DaycareChildRegistryPage;
