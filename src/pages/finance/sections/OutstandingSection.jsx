import React, { useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import RadioGroup from '@/components/radio/RadioGroup';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import FilterDateTag from '@/components/forms/FilterDateTag';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import FileUploadField from '@/components/forms/FileUploadField';
import Popup from '@/components/popup/Popup';
import { Icon } from '@/components/icons/Icon';
import { formatBaht, timeToMinutes, matchesDateFilter, outstandingOf, hasResidual } from '@/data/financePaymentPrototype';

/* ยอดค้างชำระ (Outstanding Receivables) — TOR §1.5.6. Follow-up screen for
   receipts still sitting in "รอชำระเงิน" — records each contact attempt
   (note + staff name) as an audit trail rather than a single boolean, so
   a second follow-up doesn't erase the first. Search (name/HN, แผนก,
   สถานะการเบิกจ่าย), date filter, and a supporting-document attachment
   per follow-up per TOR §1.5.6.5. */

const CLAIM_STATUSES = [
  { key: 'inprogress', label: 'ดำเนินการ' },
  { key: 'received', label: 'ได้รับเงินแล้ว' },
];
const CLAIM_STATUS_STYLE = { inprogress: 'warning', received: 'success' };
const FOLLOW_UP_NOTE_SUGGESTIONS = [
  'โทรติดต่อผู้ป่วยแล้ว นัดมาชำระวันพรุ่งนี้',
  'โทรติดต่อผู้ป่วยไม่ได้ จะติดต่อใหม่อีกครั้ง',
  'ส่งข้อความแจ้งเตือนยอดค้างชำระทาง SMS แล้ว',
  'ผู้ป่วยแจ้งว่าอยู่ระหว่างเบิกจ่ายกับต้นสังกัด',
  'ประสานงานกับหน่วยงานต้นสังกัดเรื่องเอกสารเบิกจ่าย',
  'ผู้ป่วยนัดชำระเงินภายในสัปดาห์นี้',
];

const FollowUpForm = ({ row, onCancel, onConfirm }) => {
  const [note, setNote] = useState('');
  const [signer, setSigner] = useState('');
  const [claimStatus, setClaimStatus] = useState(row.claimStatus || 'inprogress');
  const [docName, setDocName] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const canConfirm = note.trim().length > 0 && signer.trim().length > 0;

  const handleFile = (file) => {
    setDocName(file.name);
    setDocUrl(URL.createObjectURL(file));
  };

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
      <SuggestibleTextarea
        voice
        label='บันทึกการติดตาม'
        required
        height={140}
        minHeight={96}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder='เช่น โทรติดต่อผู้ป่วยแล้ว นัดมาชำระวันพรุ่งนี้'
        suggestions={FOLLOW_UP_NOTE_SUGGESTIONS}
        minChars={3}
      />
      <InputField label='เจ้าหน้าที่ผู้บันทึก' value={signer} onChange={setSigner} placeholder='ชื่อ-นามสกุล' />
      <RadioGroup
        legend='สถานะการเบิกจ่าย'
        direction='row'
        value={claimStatus}
        onChange={setClaimStatus}
        options={CLAIM_STATUSES.map((s) => ({ value: s.key, label: s.label }))}
      />
      <FileUploadField
        label='เอกสารประกอบการเบิก'
        buttonLabel='แนบเอกสาร'
        helperText='แนบใบเสร็จ/หนังสือรับรองสิทธิ เพื่อให้ผู้ตรวจสอบเปิดดูได้จากตารางติดตาม'
        fileName={docName}
        onFile={handleFile}
        onClear={() => { setDocName(null); setDocUrl(null); }}
      />
      <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200)' }}>
        <NeutralSubdueButton size='sm' onClick={onCancel}>ยกเลิก</NeutralSubdueButton>
        <BrandSubdueButton
          size='sm'
          disabled={!canConfirm}
          onClick={() => onConfirm({ note: note.trim(), signer: signer.trim(), claimStatus, docName, docUrl })}
        >
          บันทึกการติดตาม
        </BrandSubdueButton>
      </div>
    </div>
  );
};

/* Outstanding debt is the one thing here that is NOT a per-day view — a
   balance unpaid since last month is exactly what this screen exists to
   chase. Defaulting the date chip to "วันนี้" hid every older row and left
   the tab empty on open while the summary card above still showed a total
   (TOR §1.8.6.1 / §1.8.6.6 both require the default view to show the
   current full list). "30 วันที่ผ่านมา" keeps a bounded default without
   amputating the backlog. */
const FILTER_DEFAULTS = { dept: 'all', claimStatus: 'all', dateValue: { quick: '30days' } };

const OutstandingSection = ({ queue, onFollowUp }) => {
  const [activeRow, setActiveRow] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(FILTER_DEFAULTS);
  const setFilter = (key) => (val) => setFilters((f) => ({ ...f, [key]: val }));

  const deptOptions = useMemo(() => {
    const depts = [...new Set(queue.map((r) => r.dept))];
    return [{ value: 'all', label: 'ทุกแผนก' }, ...depts.map((d) => ({ value: d, label: d }))];
  }, [queue]);

  /* Unfiltered pending/residual universe — SearchResultCount "จาก" total. */
  const pendingBase = useMemo(
    () => queue.filter((r) => r.status === 'pending' || hasResidual(r)),
    [queue],
  );

  const pendingRows = useMemo(() => {
    /* Not just status==='pending' — a receipt settled for only part of the
       visit still owes the rest (TOR §1.8.1.15 → §1.8.6.1). */
    let rows = pendingBase;
    if (q.trim()) {
      const query = q.trim().toLowerCase();
      rows = rows.filter((r) => r.hn.toLowerCase().includes(query) || r.patient.shortName.toLowerCase().includes(query));
    }
    if (filters.dept !== 'all') rows = rows.filter((r) => r.dept === filters.dept);
    if (filters.claimStatus !== 'all') rows = rows.filter((r) => (r.claimStatus || 'inprogress') === filters.claimStatus);
    rows = rows.filter((r) => matchesDateFilter(r.visitDate, filters.dateValue));
    return rows.sort((a, b) => timeToMinutes(a.visitTime) - timeToMinutes(b.visitTime));
  }, [pendingBase, q, filters]);

  const outstandingTotal = pendingRows.reduce((s, r) => s + outstandingOf(r), 0);

  const filtersActive = !!q.trim()
    || filters.dept !== 'all'
    || filters.claimStatus !== 'all'
    || filters.dateValue?.quick !== FILTER_DEFAULTS.dateValue.quick;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(
    filtersActive,
    () => {
      setQ('');
      setFilters(FILTER_DEFAULTS);
    },
  );

  const columns = [
    { key: 'queueNo', label: 'คิว' },
    {
      key: 'patient', label: 'ผู้ป่วย', flex: true, minWidth: 200,
      render: (row) => (
        <div className='flex flex-col min-w-0'>
          <EllipsisText text={row.patient.shortName} />
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>HN {row.hn}</span>
        </div>
      ),
    },
    { key: 'dept', label: 'แผนก' },
    { key: 'center', label: 'ศูนย์/คลินิก' },
    { key: 'rights', label: 'สิทธิ', render: (row) => <ColorfulBadge badgeStyle={row.rights.badge} size='small'>{row.rights.short}</ColorfulBadge> },
    {
      key: 'visitTime', label: 'เข้ารับบริการเมื่อ',
      render: (row) => (
        <div className='flex flex-col'>
          <span>{row.visitDate}</span>
          <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>{row.visitTime} น.</span>
        </div>
      ),
    },
    {
      key: 'amountDue', label: 'ยอดค้างชำระ',
      render: (row) => (
        <div className='flex flex-col'>
          <span style={{ fontWeight: 'var(--type-weight-bold)', color: 'var(--text-statusbadge-warning, #B25E09)' }}>{formatBaht(outstandingOf(row))}</span>
          {hasResidual(row) && (
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
              ค้างบางส่วน · ใบเสร็จ {row.receiptNo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'claimStatus', label: 'สถานะการเบิกจ่าย',
      render: (row) => (row.claimStatus
        ? <StatusBadge style={CLAIM_STATUS_STYLE[row.claimStatus]} size='small'>{CLAIM_STATUSES.find((s) => s.key === row.claimStatus)?.label}</StatusBadge>
        : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>-</span>),
    },
    {
      key: 'doc', label: 'เอกสารประกอบ',
      render: (row) => (row.followUps?.length && row.followUps[row.followUps.length - 1].docName
        ? <a href={row.followUps[row.followUps.length - 1].docUrl} target='_blank' rel='noreferrer' onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-brandPrimary-default)' }}>ดูเอกสาร</a>
        : <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>-</span>),
    },
    {
      key: 'followUp', label: 'สถานะติดตาม',
      render: (row) => (row.followUps?.length
        ? <StatusBadge style='info' size='small'>ติดตามแล้ว ({row.followUps.length})</StatusBadge>
        : <StatusBadge style='warning' size='small'>ยังไม่ติดตาม</StatusBadge>),
    },
    {
      key: 'action', label: '',
      render: (row) => <NeutralSubdueButton size='sm' onClick={(e) => { e.stopPropagation(); setActiveRow(row); }}>บันทึกติดตาม</NeutralSubdueButton>,
    },
  ];

  return (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={q}
          onChange={setQ}
          placeholder='ค้นหาชื่อ-สกุลผู้ป่วย / HN'
          width={480}
        />
      </div>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        <FilterDropdown prefix='แผนก:' options={deptOptions} value={filters.dept} onChange={setFilter('dept')} />
        <FilterDropdown
          prefix='สถานะการเบิกจ่าย:'
          options={[{ value: 'all', label: 'ทั้งหมด' }, ...CLAIM_STATUSES.map((s) => ({ value: s.key, label: s.label }))]}
          value={filters.claimStatus}
          onChange={setFilter('claimStatus')}
        />
        <FilterDateTag prefix='วัน:' value={filters.dateValue} onChange={setFilter('dateValue')} defaultQuick={FILTER_DEFAULTS.dateValue.quick} />
        <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
      </div>

      <SmoothFilterResults opaque={resultsOpaque}>
      <SearchResultCount found={pendingRows.length} total={pendingBase.length} />

      <div
        className='flex flex-col'
        style={{
          maxWidth: 260,
          background: 'var(--surface-brandPrimary-quaternary, #F4FBF8)',
          borderRadius: 'var(--dim-radius-300)',
          padding: 'var(--dim-space-300)',
          gap: 'var(--dim-space-050, 2px)',
        }}
      >
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>ยอดค้างชำระรวม ({pendingRows.length} ราย)</span>
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-lg)', fontWeight: 'var(--type-weight-bold)' }}>{formatBaht(outstandingTotal)}</span>
      </div>

      <Table columns={columns} rows={pendingRows} rowKey={(row) => row.id} emptyMessage='ไม่พบยอดค้างชำระที่ตรงกับเงื่อนไข' />
      </SmoothFilterResults>

      {activeRow && (
        <Popup
          open
          onClose={() => setActiveRow(null)}
          size='medium'
          title='บันทึกการติดตามยอดค้างชำระ'
          subtitle={`${activeRow.patient.shortName} · HN ${activeRow.hn} · คิว ${activeRow.queueNo} · ค้างชำระ ${formatBaht(activeRow.amountDue)}`}
        >
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
            {activeRow.followUps?.length > 0 && (
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                {activeRow.followUps.map((f, idx) => (
                  <div key={idx} className='flex items-start justify-between' style={{ padding: 'var(--dim-space-200)', background: 'var(--surface-card-100)', borderRadius: 'var(--dim-radius-200)' }}>
                    <div className='flex flex-col'>
                      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{f.note}</span>
                      <div style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>โดย {f.signer}</div>
                    </div>
                    <Icon name='attach_file' size={16} style={f.docName ? undefined : { opacity: 0.3 }} />
                  </div>
                ))}
              </div>
            )}
            <FollowUpForm
              row={activeRow}
              onCancel={() => setActiveRow(null)}
              onConfirm={(payload) => {
                onFollowUp(activeRow.id, payload);
                setActiveRow(null);
              }}
            />
          </div>
        </Popup>
      )}
    </div>
  );
};

export default OutstandingSection;
