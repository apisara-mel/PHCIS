import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import { Sym } from '@/components/forms/_inputBox';
import { getAppointmentsNotArrived } from '@/data/queueCenterStore';
import {
  NO_SHOW_NOTE_SUGGESTIONS,
  NO_SHOW_REASONS,
  OTHER_REASON_LABEL,
} from './appointmentHcisMasters';
import { NO_PERMISSION_TOOLTIP } from './appointmentPermissions';
import {
  APPT_STATUS_CANCELLED,
  APPT_STATUS_NO_SHOW,
  formatApptListDate,
  getAppointmentDisplayStatus,
  isAppointmentReadOnly,
  isoKey,
  printAppointmentSlipBatch,
} from './appointmentShared';

/* TOR 1.6.2.8 / 1.3.2.3 — "รายการนัดวันนี้ที่ยังไม่มาติดต่อ".

   ⚠️ ข้อมูล 2 ชุดไม่เชื่อมกัน: `queueCenterStore.appointmentsToday` (mock 5 แถว
   ไม่มีฟิลด์ date, HN/แพทย์คนละชุดกับ INITIAL_APPOINTMENTS) จึง **ไม่ join** กับ
   นัดของโมดูลนี้ ตารางหลักสร้างจากข้อมูลของโมดูลเอง ส่วนศูนย์บริหารคิวแสดงเป็น
   แผงอ้างอิงอ่านอย่างเดียวที่ติดป้ายแหล่งที่มาชัดเจน (ห้ามเขียนกลับ). */

const PAGE_SIZE = 10;
const OTHER_REASON = OTHER_REASON_LABEL;
const NO_SHOW_NOTE_MIN = 10;

const TEXT_CELL = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm, 14px)',
  lineHeight: 1.5,
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** นัดของวันนี้ ที่เลยเวลานัดแล้ว และยังไม่ลงทะเบียนมาติดต่อ. */
export function selectNotArrivedToday(appointments) {
  const todayKey = isoKey(new Date());
  const cutoff = nowHHMM();
  return (appointments || []).filter((a) => {
    if (a.date !== todayKey) return false;
    if (a.arrived) return false;
    const status = getAppointmentDisplayStatus(a);
    if (status === APPT_STATUS_CANCELLED) return false;
    if (a.status === APPT_STATUS_NO_SHOW) return true;
    return String(a.time || '') <= cutoff;
  }).sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

const AppointmentNotArrivedView = ({
  appointments = [],
  canManage = true,
  onMarkNoShow,
  onOpenDetail,
}) => {
  const history = useHistory();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState(NO_SHOW_REASONS[0]);
  const [note, setNote] = useState('');
  const [noteTouched, setNoteTouched] = useState(false);

  /* "อื่น ๆ" ต้องมีคำอธิบาย ≥ 10 ตัวอักษร ให้เท่ากับ flow ปฏิเสธคำขอ —
     ไม่งั้น audit row ของ appendCancelAudit บันทึกแค่คำว่า "อื่น ๆ" ลอย ๆ */
  const needsNote = reason === OTHER_REASON;
  const noteValid = !needsNote || note.trim().length >= NO_SHOW_NOTE_MIN;

  const rows = useMemo(() => selectNotArrivedToday(appointments), [appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.patient, r.hn, r.doctor, r.clinic]
      .some((f) => String(f || '').toLowerCase().includes(q)));
  }, [rows, search]);

  const printable = useMemo(() => filtered.filter((r) => !isAppointmentReadOnly(r)), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const queueCenterRows = useMemo(() => {
    try {
      return getAppointmentsNotArrived() || [];
    } catch {
      return [];
    }
  }, []);

  const columns = [
    {
      key: 'time', header: 'เวลานัด', sortable: false,
      render: (r) => <span style={{ ...TEXT_CELL, whiteSpace: 'nowrap' }}>{r.time} น.</span>,
    },
    {
      key: 'hn', header: 'HN', sortable: false,
      render: (r) => <span style={TEXT_CELL}>{r.hn}</span>,
    },
    {
      key: 'patient', header: 'ผู้รับบริการ', sortable: false,
      render: (r) => <span className='truncate' style={{ ...TEXT_CELL, fontWeight: 'var(--type-weight-medium)' }}>{r.patient}</span>,
    },
    {
      key: 'clinic', header: 'คลินิกที่นัดตรวจ', sortable: false,
      render: (r) => <span className='truncate' style={TEXT_CELL}>{r.clinic || r.dept || '—'}</span>,
    },
    {
      key: 'doctor', header: 'แพทย์ที่นัดตรวจ', flex: true, minWidth: 180, sortable: false,
      render: (r) => <span className='truncate' style={TEXT_CELL}>{r.doctor || 'ไม่ระบุแพทย์'}</span>,
    },
    {
      key: 'status', header: 'สถานะการนัด (HCIS)', sortable: false,
      render: (r) => (
        r.status === APPT_STATUS_NO_SHOW ? (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <StatusBadge style='error' size='small'>6 · ไม่มาตามนัด</StatusBadge>
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
              }}
            >
              {r.noShowAt ? `บันทึกเมื่อ ${r.noShowAt}` : ''} {r.noShowReason || ''}
            </span>
          </div>
        ) : (
          <StatusBadge style='info' size='small'>2 · ยังไม่ได้ลงทะเบียนตรวจรักษา</StatusBadge>
        )
      ),
    },
    {
      key: 'actions', header: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <BrandSubdueButton
            variant='outline'
            size='sm'
            leadingIcon='visibility'
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(r); }}
          >
            ดูรายละเอียด
          </BrandSubdueButton>
          <span title={canManage ? 'บันทึกว่าผู้รับบริการไม่มาตามนัด' : NO_PERMISSION_TOOLTIP}>
            <DangerSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='person_off'
              disabled={!canManage || r.status === APPT_STATUS_NO_SHOW}
              onClick={(e) => {
                e.stopPropagation();
                setTarget(r);
                setReason(NO_SHOW_REASONS[0]);
                setNote('');
                setNoteTouched(false);
              }}
            >
              บันทึกไม่มาตามนัด
            </DangerSubdueButton>
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className='flex w-full' style={{ gap: 'var(--dim-space-500, 20px)', alignItems: 'flex-start' }}>
      {/* ── ตารางหลัก (ข้อมูลของโมดูลนัดหมายเอง) ─────────────────────── */}
      <section
        className='flex flex-col min-w-0'
        style={{
          flex: 1,
          gap: 'var(--dim-space-400, 16px)',
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
          background: 'var(--surface-card-100)',
          boxShadow: 'var(--shadow-brand-top-200)',
        }}
      >
        <div className='flex flex-wrap items-center justify-between' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <span
              style={{
                color: 'var(--text-content-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-base, 16px)',
                fontWeight: 'var(--type-weight-medium)',
              }}
            >
              นัดหมายวันนี้ที่ยังไม่มาติดต่อ · {formatApptListDate(isoKey(new Date()))}
            </span>
            <span
              style={{
                color: 'var(--text-content-tertiary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
              }}
            >
              เกณฑ์: นัดของวันนี้ · ยืนยันแล้ว · เลยเวลานัด · ยังไม่ลงทะเบียนตรวจรักษา
            </span>
          </div>
          {/* ใบนัดที่ยกเลิก / ไม่มาตามนัดแล้ว พิมพ์ซ้ำไม่ได้ (isAppointmentReadOnly) */}
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='print'
            disabled={printable.length === 0}
            onClick={() => printAppointmentSlipBatch(printable, { heading: 'ใบนัดที่ยังไม่มาติดต่อ' })}
          >
            {`พิมพ์ใบนัดที่ค้าง (${printable.length})`}
          </NeutralSubdueButton>
        </div>

        <div className='w-full flex items-start justify-center'>
          <PrimarySearch
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            onSubmit={(v) => { setSearch(v); setPage(1); }}
            placeholder='ค้นหา ชื่อผู้รับบริการ / HN / แพทย์'
            width={520}
          />
        </div>

        <Table
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          onRowClick={onOpenDetail}
          emptyMessage={search
            ? `ไม่พบนัดหมายที่ตรงกับ “${search}”`
            : 'วันนี้ผู้รับบริการมาติดต่อครบทุกนัดแล้ว'}
          emptySubtext={search
            ? 'ลองล้างคำค้นหาแล้วดูรายการทั้งหมดอีกครั้ง'
            : 'เมื่อมีนัดที่เลยเวลาแล้วยังไม่ลงทะเบียน ระบบจะแสดงที่นี่โดยอัตโนมัติ'}
          style={{ maxHeight: 520, overflow: 'auto' }}
        />

        <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-600, 24px)' }}>
          <span
            style={{
              flex: 1,
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            แสดง {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
            {Math.min(safePage * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ
          </span>
          {search ? (
            <NeutralSubdueButton size='sm' variant='outline' onClick={() => { setSearch(''); setPage(1); }}>
              ล้างตัวกรอง
            </NeutralSubdueButton>
          ) : null}
          <Pagination currentPage={safePage} pageCount={totalPages} onPageChange={setPage} />
        </div>
      </section>

      {/* ── แผงอ้างอิง read-only จากศูนย์บริหารคิว ───────────────────── */}
      <aside
        className='flex flex-col shrink-0'
        style={{
          width: 340,
          gap: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-500, 20px)',
          paddingBottom: 'var(--dim-space-500, 20px)',
          paddingLeft: 'var(--dim-space-500, 20px)',
          paddingRight: 'var(--dim-space-500, 20px)',
          borderRadius: 'var(--dim-radius-500, 16px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-tertiary)',
          background: 'var(--surface-card-200)',
        }}
      >
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
          <Sym name='hub' size={18} color='var(--icon-brandPrimary-default)' />
          อ้างอิงจากศูนย์บริหารคิว
        </span>
        <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
          ข้อมูลคนละชุด · อ่านอย่างเดียว
        </ColorfulBadge>
        <span
          style={{
            color: 'var(--text-content-tertiary)',
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-xs, 12px)',
            lineHeight: 1.6,
          }}
        >
          รายการด้านล่างมาจากระบบศูนย์บริหารคิว (queueCenterStore) ซึ่งเป็นชุดข้อมูลจำลอง
          คนละชุดกับนัดหมายของโมดูลนี้ — HN และแพทย์อาจไม่ตรงกัน ระบบจึงไม่จับคู่ให้อัตโนมัติ
          และไม่เขียนข้อมูลกลับไปยังศูนย์บริหารคิว
        </span>

        {queueCenterRows.length === 0 ? (
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
            }}
          >
            ศูนย์บริหารคิวไม่ได้ส่งรายการค้างมาในขณะนี้
          </span>
        ) : (
          <ul className='flex flex-col m-0 p-0 list-none' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {queueCenterRows.map((r) => (
              <li
                key={r.id}
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-050, 2px)',
                  paddingTop: 'var(--dim-space-200, 8px)',
                  paddingBottom: 'var(--dim-space-200, 8px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  borderRadius: 'var(--dim-radius-200, 8px)',
                  background: 'var(--surface-card-100)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-content-default)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-sm, 14px)',
                    fontWeight: 'var(--type-weight-medium)',
                  }}
                >
                  {r.time} น. · {r.name}
                </span>
                <span
                  style={{
                    color: 'var(--text-content-tertiary)',
                    fontFamily: 'var(--type-family-body)',
                    fontSize: 'var(--type-size-xs, 12px)',
                  }}
                >
                  HN {r.hn} · {r.doctor} · {r.note}
                </span>
              </li>
            ))}
          </ul>
        )}

        <NeutralSubdueButton
          size='sm'
          variant='outline'
          leadingIcon='open_in_new'
          onClick={() => history.push('/queue-center/issue')}
        >
          เปิดศูนย์บริหารคิว (ออกบัตรคิว)
        </NeutralSubdueButton>
      </aside>

      {/* ── ยืนยันบันทึกไม่มาตามนัด ─────────────────────────────────── */}
      <AlertDialog
        open={!!target}
        type='destructive'
        title='บันทึกว่าไม่มาตามนัด'
        description={target
          ? `${target.patient} (HN ${target.hn}) นัดเวลา ${target.time} น. — ระบบจะบันทึกผู้ดำเนินการและเวลาที่บันทึกไว้ในประวัติ และแจ้งเตือนกลับผู้รับบริการ`
          : ''}
        confirmLabel='ยืนยันบันทึก'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          /* AlertDialog ไม่รองรับ disabled บนปุ่มยืนยัน จึงกันที่ handler แทน —
             กดแล้วจะไม่ปิด dialog จนกว่าจะกรอกคำอธิบายครบ */
          if (!noteValid) { setNoteTouched(true); return; }
          if (target) onMarkNoShow?.(target, needsNote ? `${reason} — ${note.trim()}` : reason, note.trim());
          setTarget(null);
          setNote('');
          setNoteTouched(false);
        }}
        onClose={() => { setTarget(null); setNote(''); setNoteTouched(false); }}
      >
        <div
          className='flex flex-col w-full'
          style={{ gap: 'var(--dim-space-200, 8px)', marginTop: 'var(--dim-space-300, 12px)' }}
        >
          <span
            style={{
              color: 'var(--text-content-tertiary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
            }}
          >
            เหตุผล · เวลาที่บันทึก {nowHHMM()} น.
          </span>
          <Select
            options={NO_SHOW_REASONS.map((r) => ({ value: r, label: r }))}
            value={reason}
            onChange={(v) => { setReason(v); setNoteTouched(false); }}
            size='md'
            searchable={false}
            showLabel={false}
            showHelperText={false}
          />
          <SuggestibleTextarea
            label={needsNote
              ? `คำอธิบายเพิ่มเติม (บังคับ ≥ ${NO_SHOW_NOTE_MIN} ตัวอักษร)`
              : 'คำอธิบายเพิ่มเติม (ไม่บังคับ)'}
            required={needsNote}
            value={note}
            onChange={(e) => { setNote(e?.target ? e.target.value : e); setNoteTouched(true); }}
            placeholder='พิมพ์อย่างน้อย 3 ตัวอักษรเพื่อดูข้อความที่ใช้บ่อย'
            suggestions={NO_SHOW_NOTE_SUGGESTIONS}
            minChars={3}
            voice
            rows={3}
            height={104}
          />
          {noteTouched && !noteValid ? (
            <span
              style={{
                color: 'var(--text-alert-error)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-xs, 12px)',
              }}
            >
              เลือก “{OTHER_REASON}” ต้องระบุคำอธิบายอย่างน้อย {NO_SHOW_NOTE_MIN} ตัวอักษร
            </span>
          ) : null}
        </div>
      </AlertDialog>
    </div>
  );
};

export default AppointmentNotArrivedView;
