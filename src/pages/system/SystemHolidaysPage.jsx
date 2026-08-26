import React, { useCallback, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
import NeutralSubdueIconButton from '@/components/button/NeutralSubdueIconButton';
import Icon from '@/components/icons/Icon';
import Switch from '@/components/switch/Switch';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import InputField from '@/components/forms/InputField';
import Textarea from '@/components/forms/Textarea';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import SmallAlert from '@/components/alert/SmallAlert';
import SYSTEM_NAV from '@/pages/system/systemNav';
import {
  readHolidays,
  writeHolidays,
  createHoliday,
  computeHolidayStats,
  holidayYears,
  holidayYear,
  buddhistYear,
  formatThaiDate,
  thaiWeekday,
  fallsOnWeekend,
  holidayTypeMeta,
  HOLIDAY_TYPE_OPTIONS,
  HOLIDAY_OFFICIAL,
  HOLIDAY_SUBSTITUTE,
} from '@/data/holidayStore';

/* ระบบจัดการระบบ · วันหยุดประจำปี
   ทะเบียนกลางของวันหยุดสำนักอนามัย — ศูนย์บริการทั้ง 69 แห่งอ้างชุดเดียวกัน
   แทนการตั้งวันหยุดนักขัตฤกษ์แยกทีละศูนย์ในฟอร์มเพิ่มศูนย์บริการ */

const breadcrumb = ['จัดการระบบ', 'วันหยุดประจำปี'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
};

const TEXT_CELL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const SUBTEXT_CELL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const emptyDraft = () => ({ date: '', name: '', type: HOLIDAY_OFFICIAL, note: '' });

/* ทะเบียนเก็บวันที่เป็น ISO string ส่วน <DatePicker> ของ DS รับ-ส่งเป็น Date
   จึงต้องแปลงตรงขอบ ไม่ให้ Date หลุดลงไปใน store */
const isoToDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateToIso = (d) => {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* วันที่ + วันในสัปดาห์ — วันที่ตรงเสาร์-อาทิตย์ติดป้ายเตือนให้ตั้งวันชดเชย */
function DateCell({ row }) {
  const weekend = fallsOnWeekend(row.date);
  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={TEXT_CELL}>{formatThaiDate(row.date)}</span>
      <span style={SUBTEXT_CELL}>
        {`วัน${thaiWeekday(row.date)}`}
        {weekend && row.type !== HOLIDAY_SUBSTITUTE ? ' · ตรงวันหยุดสุดสัปดาห์' : ''}
      </span>
    </div>
  );
}

export default function SystemHolidaysPage() {
  const [rows, setRows] = useState(() => readHolidays());
  const [filterYear, setFilterYear] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editing, setEditing] = useState(null);   /* record หรือ 'new' */
  const [draft, setDraft] = useState(emptyDraft());
  const [removing, setRemoving] = useState(null);
  const [toast, setToast] = useState(null);
  /* เรียงตามหัวคอลัมน์ — ตั้งต้นเรียงตามวันที่จากน้อยไปมาก (ปฏิทินไล่ทั้งปี) */
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'asc' });
  const handleSort = (key) => setSortConfig((prev) => (
    prev.key === key
      ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' }
  ));

  const refresh = useCallback(() => setRows(readHolidays()), []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const persist = useCallback((next) => {
    writeHolidays(next);
    setRows(next);
  }, []);

  const years = useMemo(() => holidayYears(rows), [rows]);
  /* ตัวเลือกปี = ปีปัจจุบันย้อนหลัง 5 ปี (รวม 6 ปี) เสมอ แม้ปีนั้นยังไม่มี
     ข้อมูลในทะเบียน — ผู้ใช้ต้องเลือกดูย้อนหลังได้ · ถ้ามีปีอื่นในทะเบียน
     (เช่น ประกาศวันหยุดปีหน้าล่วงหน้า) ก็เอามารวมด้วย */
  const yearOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const span = [];
    for (let y = thisYear; y >= thisYear - 5; y -= 1) span.push(y);
    return [...new Set([...span, ...years])]
      .sort((a, b) => b - a)
      .map((y) => ({ value: String(y), label: `พ.ศ. ${y + 543}` }));
  }, [years]);

  const filtersActive = !!filterYear || !!filterType;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => { setFilterYear(''); setFilterType(''); },
  );

  const filtered = useMemo(() => rows
    .filter((r) => (!filterYear || String(holidayYear(r.date)) === filterYear))
    .filter((r) => (!filterType || r.type === filterType)), [rows, filterYear, filterType]);

  const sortValueOf = (row, key) => {
    switch (key) {
      case 'date': return row.date || '';
      case 'name': return row.name || '';
      case 'type': return holidayTypeMeta(row.type).label;
      case 'active': return row.active !== false ? 1 : 0;
      default: return '';
    }
  };

  const visible = useMemo(() => {
    if (!sortConfig.key) return filtered;
    const dir = sortConfig.direction === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = sortValueOf(a, sortConfig.key);
      const bv = sortValueOf(b, sortConfig.key);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'th') * dir;
    });
  }, [filtered, sortConfig]);

  const stats = useMemo(() => computeHolidayStats(visible), [visible]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'event', color: 'info', value: String(stats.total), label: 'วันหยุดทั้งหมด' },
    { key: 'official', icon: 'flag', color: 'positive', value: String(stats.official), label: 'วันหยุดราชการ' },
    { key: 'substitute', icon: 'event_repeat', color: 'warning', value: String(stats.substitute), label: 'วันหยุดชดเชย' },
    { key: 'agency', icon: 'domain', color: 'info', value: String(stats.agency), label: 'วันหยุดเฉพาะหน่วยงาน' },
  ], [stats]);

  const openCreate = () => { setDraft(emptyDraft()); setEditing('new'); };
  const openEdit = (row) => { setDraft({ ...row }); setEditing(row); };
  const closeForm = () => { setEditing(null); setDraft(emptyDraft()); };

  /* วันเดียวกันซ้ำในทะเบียนไม่ได้ ยกเว้นรายการที่กำลังแก้ไขอยู่เอง */
  const dupOwner = useMemo(() => {
    if (!draft.date) return null;
    return rows.find((r) => r.date === draft.date && r.id !== (editing?.id)) || null;
  }, [draft.date, rows, editing]);

  /* ตั้งวันหยุดซ้ำวันเดิมไม่ได้ — บอกไปเลยว่าวันนั้นถูกตั้งเป็นวันอะไรไว้แล้ว
     จะได้รู้ว่าต้องไปแก้รายการเดิมหรือเปลี่ยนวัน (ไม่ใช่แค่ "ซ้ำ") */
  const dateError = dupOwner
    ? `เคยตั้งวันหยุดของวันที่ ${formatThaiDate(dupOwner.date)} ไว้แล้ว — "${dupOwner.name}"`
    : '';
  const canSave = !!draft.date && !!draft.name.trim() && !!draft.type && !dupOwner;

  const handleSave = () => {
    if (!canSave) return;
    if (editing === 'new') {
      persist([...rows, createHoliday(draft)]);
      showToast('เพิ่มวันหยุดแล้ว');
    } else {
      persist(rows.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)));
      showToast('บันทึกการแก้ไขวันหยุดแล้ว');
    }
    closeForm();
  };

  const handleToggle = (row, next) => {
    persist(rows.map((r) => (r.id === row.id ? { ...r, active: next } : r)));
  };

  const handleRemove = () => {
    if (!removing) return;
    persist(rows.filter((r) => r.id !== removing.id));
    showToast('ลบวันหยุดแล้ว');
    setRemoving(null);
  };

  const columns = useMemo(() => [
    { key: 'date', header: 'วันที่', sortable: true, minWidth: 200, render: (row) => <DateCell row={row} /> },
    {
      key: 'name',
      header: 'ชื่อวันหยุด',
      sortable: true,
      minWidth: 320,
      render: (row) => (
        <div className='flex flex-col'>
          <span style={TEXT_CELL}>{row.name}</span>
          {row.note ? <span style={SUBTEXT_CELL}>{row.note}</span> : null}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'ประเภท',
      sortable: true,
      minWidth: 180,
      render: (row) => {
        const meta = holidayTypeMeta(row.type);
        return (
          <ColorfulBadge style={meta.badge} size='small' hierarchy='secondary' width='hug'>
            {meta.label}
          </ColorfulBadge>
        );
      },
    },
    {
      key: 'active',
      header: 'สถานะ',
      sortable: true,
      minWidth: 140,
      render: (row) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Switch
            checked={row.active !== false}
            onChange={(next) => handleToggle(row, next)}
            aria-label={`ใช้งานวันหยุด ${row.name}`}
          />
          <span style={SUBTEXT_CELL}>{row.active !== false ? 'ปิดทำการ' : 'ยกเลิกวันหยุด'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'การดำเนินการ',
      minWidth: 140,
      render: (row) => (
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <BrandSubdueIconButton
            icon='edit'
            variant='outline'
            size='sm'
            aria-label={`แก้ไข ${row.name}`}
            onClick={() => openEdit(row)}
          />
          <NeutralSubdueIconButton
            variant='outline'
            size='sm'
            aria-label={`ลบ ${row.name}`}
            onClick={() => setRemoving(row)}
          >
            <Icon name='delete' size={16} />
          </NeutralSubdueIconButton>
        </div>
      ),
    },
  ], [rows]);

  const formOpen = editing !== null;

  return (
    <>
      <QueuePageShell
        activeKey='system-holidays'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-holidays'
        brandTitle='ระบบ PHCIS'
        breadcrumb={breadcrumb}
        title='วันหยุดประจำปี'
        headerInfo={(
          <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
            <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
            </div>
          </section>
        )}
        actions={(
          <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openCreate}>
            เพิ่มวันหยุด
          </BrandButton>
        )}
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}>
          <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-500)' }}>
            <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
              <div className='flex items-center flex-wrap min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                <FilterDropdown
                  prefix='ปี:'
                  options={yearOptions}
                  value={filterYear}
                  onChange={setFilterYear}
                  placeholder='ทุกปี'
                />
                <FilterDropdown
                  prefix='ประเภท:'
                  options={HOLIDAY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={filterType}
                  onChange={setFilterType}
                  placeholder='ทั้งหมด'
                />
                <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              </div>
              <div className='flex-1' />
              <span style={SUBTEXT_CELL}>
                {`ทั้งหมด ${visible.length} วัน`}
                {filterYear ? ` · พ.ศ. ${Number(filterYear) + 543}` : ''}
              </span>
            </div>

            <SmoothFilterResults opaque={resultsOpaque}>
              <Table
                columns={columns}
                rows={visible}
                rowKey={(row) => row.id}
                sortConfig={sortConfig}
                onSort={handleSort}
                /* ปฏิทินวันหยุดทั้งปีมีราว 20 กว่าวัน — ต้องกวาดตาเห็นทั้งปี
                   ในหน้าเดียว การแบ่งหน้าทำให้ ธ.ค. ไปอยู่หน้า 2 (25 ส.ค. 2569) */
                pagination={false}
                stickyColCount={1}
                stickyShadow
                emptyMessage='ไม่พบวันหยุดตามเงื่อนไข'
              />
            </SmoothFilterResults>
          </section>
        </div>
      </QueuePageShell>

      <Popup
        open={formOpen}
        onClose={closeForm}
        size='default'
        title={editing === 'new' ? 'เพิ่มวันหยุด' : 'แก้ไขวันหยุด'}
        subtitle={editing && editing !== 'new' && editing.date
          ? `${formatThaiDate(editing.date)} · ปีงบประมาณ พ.ศ. ${buddhistYear(editing.date)}`
          : undefined}
        primaryAction={{ label: 'บันทึก', onClick: handleSave, disabled: !canSave }}
        secondaryAction={{ label: 'ยกเลิก', onClick: closeForm }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          {/* ปฏิทินของ design system (Figma "Date Picker" 341:6345) —
              ไม่ใช้ <input type='date'> เพราะเบราว์เซอร์วาดปฏิทินของตัวเอง
              ซึ่งไม่ผูกกับ token และเป็นคนละหน้าตาในแต่ละ OS */}
          <DatePicker
            label='วันที่'
            required
            placeholder='เลือกวันที่'
            value={isoToDate(draft.date)}
            onChange={(d) => setDraft((p) => ({ ...p, date: dateToIso(d) }))}
            error={dateError || undefined}
            helperText={draft.date && !dateError
              ? `วัน${thaiWeekday(draft.date)} · ${formatThaiDate(draft.date)}`
              : 'เลือกวันที่ตามประกาศสำนักนายกรัฐมนตรี'}
          />
          <InputField
            label='ชื่อวันหยุด'
            required
            showLeadingIcon={false}
            showHelperText={false}
            value={draft.name}
            onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
            placeholder='เช่น วันปิยมหาราช'
          />
          <Select
            label='ประเภท'
            required
            options={HOLIDAY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={draft.type}
            onChange={(v) => setDraft((p) => ({ ...p, type: v }))}
            searchable={false}
            showHelperText
            helperText={fallsOnWeekend(draft.date)
              ? 'วันที่เลือกตรงกับเสาร์-อาทิตย์ — อย่าลืมเพิ่มวันหยุดชดเชยด้วย'
              : 'วันหยุดชดเชยใช้เมื่อวันหยุดราชการตรงกับเสาร์-อาทิตย์'}
          />
          <Textarea
            label='หมายเหตุ'
            showHelperText={false}
            rows={3}
            value={draft.note}
            onChange={(v) => setDraft((p) => ({ ...p, note: v }))}
            placeholder='เช่น ชดเชยวันอาทิตย์ที่ 31 พฤษภาคม'
          />
        </div>
      </Popup>

      <AlertDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        type='warning'
        alignment='center'
        title='ลบวันหยุดนี้?'
        /* ขึ้นบรรทัดใหม่หลัง "ถูกลบออกจากทะเบียน" — ประโยคแรกคือสิ่งที่จะเกิดขึ้น
           ประโยคที่สองคือผลกระทบ อ่านรวดเดียวแล้วแยกสองเรื่องนี้ไม่ออก */
        description={removing ? (
          <>
            {`"${removing.name}" (${formatThaiDate(removing.date)}) จะถูกลบออกจากทะเบียน`}
            <br />
            ศูนย์บริการทุกแห่งจะกลับมาเปิดทำการตามเวลาปกติในวันนั้น
          </>
        ) : ''}
        confirmLabel='ลบ'
        cancelLabel='ยกเลิก'
        onConfirm={handleRemove}
      />

      {toast ? (
        <div className='fixed left-1/2 z-[200] -translate-x-1/2' style={{ bottom: 'var(--dim-space-600)' }}>
          <SmallAlert variant='success' leadingGraphic='phcis'>{toast}</SmallAlert>
        </div>
      ) : null}
    </>
  );
}
