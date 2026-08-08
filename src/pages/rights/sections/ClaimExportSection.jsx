import React, { useMemo, useState } from 'react';
import Table, { EllipsisText } from '@/components/table/Table';
import SelectableCardButton from '@/components/button/SelectableCardButton';
import DatePickerRange from '@/components/forms/DatePickerRange';
import RadioGroup from '@/components/radio/RadioGroup';
import Checkbox from '@/components/checkbox/Checkbox';
import FilterTag from '@/components/forms/FilterTag';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import {
  SectionCard,
  FieldGrid,
  ReadField,
  MetricTile,
  EmptyState,
  PermissionHint,
  T,
  useRightsClaimTick,
} from '@/pages/rights/rightsUi';
import {
  RIGHTS_VISITS,
  EXPORT_FORMATS,
  EXPORT_FILE_TYPES,
  EXPORT_HISTORY,
  exportFormatByKey,
  countExportRecords,
  buildExportRows,
  serialiseExport,
  approxSize,
  formatBytes,
  downloadTextFile,
  appendExportHistory,
  withinThaiRange,
  rangeIsInverted,
  submitStatusOf,
  formatThaiBuddhistDate,
  parseThaiBuddhistDate,
  thaiDate,
} from '@/data/rightsClaimStore';

/* §1.7.4.10 – §1.7.4.12 — ดึงข้อมูลออกเป็นไฟล์สำหรับเรียกเก็บ.

   Three steps, in the order the TOR lists them:
     1. §1.7.4.10 รูปแบบชุดข้อมูล  — 16 แฟ้ม e-Claim / 13 แฟ้มมาตรฐาน /
                                    เบิกจ่ายตรงข้าราชการ / รูปแบบอื่นตามผู้เรียกเก็บ
     2. §1.7.4.11 ประเภทไฟล์       — CSV หรือ TXT (pipe-delimited) ตามโครงสร้าง
                                    ที่ผู้เรียกเก็บกำหนด
     3. §1.7.4.12 ช่วงวันที่        — วันที่เริ่มต้น + วันที่สิ้นสุด

   The CSV writer (including the UTF-8 BOM so Excel opens Thai correctly)
   is re-implemented in rightsClaimStore rather than imported from
   finance/sections/EclaimSection.jsx — the wave brief forbids /rights from
   touching /finance, and the two exporters answer different TOR sections.

   ⚠ แฟ้มและคอลัมน์เป็น mock ตามโครงสร้างสาธารณะ ยังต้อง verify กับผู้เรียกเก็บจริง
   (สปสช. / กรมบัญชีกลาง / บริษัทประกัน) ก่อนใช้งานจริง. */

const QUICK_RANGES = [
  { key: 'thisMonth',  label: 'เดือนนี้' },
  { key: 'lastMonth',  label: 'เดือนที่แล้ว' },
  { key: 'last7',      label: '7 วันที่ผ่านมา' },
  { key: 'last30',     label: '30 วันที่ผ่านมา' },
  { key: 'thisYear',   label: 'ปีนี้' },
];

const resolveQuickRange = (key) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const end = new Date(today);
  if (key === 'thisMonth') {
    start.setDate(1);
  } else if (key === 'lastMonth') {
    start.setMonth(start.getMonth() - 1, 1);
    end.setDate(0);
  } else if (key === 'last7') {
    start.setDate(start.getDate() - 6);
  } else if (key === 'last30') {
    start.setDate(start.getDate() - 29);
  } else if (key === 'thisYear') {
    start.setMonth(0, 1);
  }
  return [formatThaiBuddhistDate(start), formatThaiBuddhistDate(end)];
};

const ClaimExportSection = ({ role }) => {
  /* Store arrays mutate in place — `tick` is what invalidates the memos. */
  const tick = useRightsClaimTick();
  const [formatKey, setFormatKey] = useState(null);
  const [fileType, setFileType] = useState('csv');
  const [range, setRange] = useState(() => resolveQuickRange('last30'));
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [preview, setPreview] = useState(null); // { formatKey, fileType, from, to, files: [...] }

  const [from, to] = range;
  const format = formatKey ? exportFormatByKey(formatKey) : null;
  const inverted = rangeIsInverted(from, to);
  const missingDates = !from || !to;

  /* Which visits fall inside the requested window. §1.7.3.5/.6 mean a visit
     that has not been confirmed should not leave the building, so the
     default excludes them — but the operator can override for a dry run. */
  const scopedVisits = useMemo(() => RIGHTS_VISITS.filter((v) => {
    if (!withinThaiRange(v.visitDate, from, to)) return false;
    if (confirmedOnly && submitStatusOf(v) !== 'confirmed') return false;
    return true;
  }), [from, to, confirmedOnly, tick]);

  const excludedCount = useMemo(() => RIGHTS_VISITS.filter((v) => (
    withinThaiRange(v.visitDate, from, to) && submitStatusOf(v) !== 'confirmed'
  )).length, [from, to, tick]);

  const canGenerate = !!format && !inverted && !missingDates;

  const buildPreview = () => {
    if (!canGenerate) return;
    const files = format.files.map((f) => {
      const rows = buildExportRows(f, scopedVisits);
      const records = countExportRecords(f, scopedVisits);
      return {
        ...f,
        records,
        rows,
        bytes: records > 0 ? approxSize(rows) : 0,
        filename: `${f.name}_${(from || '').replace(/\s/g, '')}_${(to || '').replace(/\s/g, '')}.${fileType}`,
      };
    });
    setPreview({ formatKey, fileType, from, to, files, visitCount: scopedVisits.length });
  };

  const totalRecords = preview ? preview.files.reduce((s, f) => s + f.records, 0) : 0;
  const totalBytes = preview ? preview.files.reduce((s, f) => s + f.bytes, 0) : 0;

  const downloadOne = (file) => {
    downloadTextFile(file.filename, serialiseExport(file.rows, preview.fileType));
  };

  const downloadAll = () => {
    preview.files.forEach((f, idx) => {
      /* Browsers throttle back-to-back programmatic downloads; stagger them
         so all files actually reach the disk. */
      window.setTimeout(() => downloadOne(f), idx * 150);
    });
    appendExportHistory({
      formatKey: preview.formatKey,
      fileType: preview.fileType,
      from: preview.from,
      to: preview.to,
      files: preview.files.length,
      records: totalRecords,
    }, role.userName);
  };

  const previewColumns = [
    { key: 'name', label: 'ชื่อแฟ้ม', width: 140 },
    { key: 'title', label: 'เนื้อหาของแฟ้ม', flex: true, minWidth: 220, render: (f) => <EllipsisText text={f.title} /> },
    {
      key: 'records', label: 'จำนวน record', width: 150, align: 'center',
      render: (f) => (f.records > 0
        ? <span style={T.value}>{f.records.toLocaleString('th-TH')}</span>
        : <span style={T.muted}>0 (แฟ้มว่าง)</span>),
    },
    { key: 'bytes', label: 'ขนาดโดยประมาณ', width: 160, render: (f) => <span style={T.body}>{formatBytes(f.bytes)}</span> },
    {
      key: 'download', label: '', width: 140, sortable: false,
      render: (f) => (
        <div className='flex justify-end w-full'>
          <BrandSubdueButton
            size='sm'
            variant='outline'
            leadingIcon='download'
            disabled={f.records === 0}
            title={f.records === 0 ? 'แฟ้มนี้ไม่มี record ในช่วงวันที่ที่เลือก' : undefined}
            onClick={(e) => { e.stopPropagation(); downloadOne(f); }}
          >
            ดาวน์โหลด
          </BrandSubdueButton>
        </div>
      ),
    },
  ];

  const historyColumns = [
    { key: 'at', label: 'เวลาที่ดึง', width: 220 },
    { key: 'by', label: 'ผู้ดึงข้อมูล', width: 190, render: (h) => <EllipsisText text={h.by} /> },
    { key: 'format', label: 'รูปแบบชุดข้อมูล', flex: true, minWidth: 220, render: (h) => <EllipsisText text={exportFormatByKey(h.formatKey)?.label || h.formatKey} /> },
    { key: 'fileType', label: 'ประเภทไฟล์', width: 120, render: (h) => String(h.fileType).toUpperCase() },
    { key: 'range', label: 'ช่วงวันที่', width: 260, render: (h) => `${h.from} – ${h.to}` },
    { key: 'files', label: 'จำนวนแฟ้ม', width: 120, align: 'center' },
    { key: 'records', label: 'จำนวน record', width: 140, align: 'center', render: (h) => h.records.toLocaleString('th-TH') },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
      {/* ── ขั้นที่ 1 · §1.7.4.10 ── */}
      <SectionCard
        title='ขั้นที่ 1 · เลือกรูปแบบชุดข้อมูลที่ใช้เรียกเก็บ'
        subtitle='TOR §1.7.4.10'
        icon='folder_zip'
      >
        <div className='flex items-stretch flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          {EXPORT_FORMATS.map((f) => (
            <SelectableCardButton
              key={f.key}
              selected={formatKey === f.key}
              ariaLabel={f.label}
              onClick={() => { setFormatKey(f.key); setPreview(null); }}
            >
              <span className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <Icon name={f.icon} size={18} />
                <span className='flex flex-col items-start'>
                  <span style={{ ...T.value, color: 'inherit' }}>{f.label}</span>
                  <span style={{ ...T.muted, color: 'inherit', opacity: 0.8 }}>{f.hint} · {f.files.length} แฟ้ม</span>
                </span>
              </span>
            </SelectableCardButton>
          ))}
        </div>
        {!formatKey && (
          <span style={{ ...T.muted, color: 'var(--text-statusbadge-warning, #C2410C)' }}>
            ยังไม่ได้เลือกรูปแบบชุดข้อมูล — ปุ่ม “สร้างไฟล์” จะยังกดไม่ได้
          </span>
        )}
      </SectionCard>

      {/* ── ขั้นที่ 2 · §1.7.4.11 ── */}
      <SectionCard
        title='ขั้นที่ 2 · เลือกประเภทไฟล์'
        subtitle='TOR §1.7.4.11 — ตามโครงสร้างที่หน่วยงานผู้เรียกเก็บกำหนด'
        icon='description'
      >
        <RadioGroup
          legend='ประเภทไฟล์ที่ส่งออก'
          direction='row'
          value={fileType}
          onChange={(v) => { setFileType(v); setPreview(null); }}
          options={EXPORT_FILE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <span style={T.muted}>
          {EXPORT_FILE_TYPES.find((t) => t.value === fileType)?.hint}
        </span>
      </SectionCard>

      {/* ── ขั้นที่ 3 · §1.7.4.12 ── */}
      <SectionCard
        title='ขั้นที่ 3 · กำหนดช่วงวันที่ในการดึงข้อมูล'
        subtitle='TOR §1.7.4.12 — ระบุวันที่เริ่มต้นและวันที่สิ้นสุด'
        icon='date_range'
      >
        <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
          <DatePickerRange
            label='ช่วงวันที่รับบริการ'
            required
            value={range}
            onChange={(next) => { setRange(next); setPreview(null); }}
            format={formatThaiBuddhistDate}
            parse={parseThaiBuddhistDate}
            error={inverted ? 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด' : undefined}
            helperText={inverted ? undefined : 'ระบบจะดึงเฉพาะครั้งบริการที่มีวันที่รับบริการอยู่ในช่วงนี้'}
          />
        </div>
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={T.muted}>ช่วงลัด:</span>
          {QUICK_RANGES.map((q) => (
            <FilterTag
              key={q.key}
              selected={JSON.stringify(range) === JSON.stringify(resolveQuickRange(q.key))}
              onClick={() => { setRange(resolveQuickRange(q.key)); setPreview(null); }}
              value={q.label}
            />
          ))}
          <NeutralSubdueButton
            size='sm'
            variant='outline'
            onClick={() => { setRange(['', '']); setPreview(null); }}
          >
            ล้างวันที่
          </NeutralSubdueButton>
        </div>

        <label className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <Checkbox checked={confirmedOnly} onChange={() => { setConfirmedOnly((v) => !v); setPreview(null); }} />
          <span style={T.body}>ดึงเฉพาะครั้งบริการที่ยืนยันข้อมูลการรักษาและรหัสโรคแล้ว (แนะนำ)</span>
        </label>

        <FieldGrid cols={3}>
          <ReadField label='วันที่เริ่มต้น' value={from || 'ยังไม่เลือก'} />
          <ReadField label='วันที่สิ้นสุด' value={to || 'ยังไม่เลือก'} />
          <ReadField label='ครั้งบริการที่เข้าเงื่อนไข' value={`${scopedVisits.length} รายการ`} />
        </FieldGrid>

        {missingDates && (
          <Alert type='warning' title='ยังไม่ระบุช่วงวันที่ให้ครบ' subtext='ต้องเลือกทั้งวันที่เริ่มต้นและวันที่สิ้นสุดก่อนสร้างไฟล์' />
        )}
        {inverted && (
          <Alert type='error' title='ช่วงวันที่ไม่ถูกต้อง' subtext='วันที่เริ่มต้นมากกว่าวันที่สิ้นสุด — สลับวันที่แล้วลองอีกครั้ง' />
        )}
        {confirmedOnly && excludedCount > 0 && (
          <Alert
            type='info'
            title={`มี ${excludedCount} ครั้งบริการในช่วงนี้ที่ยังยืนยันไม่ครบ`}
            subtext='รายการเหล่านี้ถูกกันออกจากไฟล์ — ไปยืนยันที่แท็บ “ส่งเบิก” หรือเอาเครื่องหมายถูกออกเพื่อดึงแบบทดลอง'
          />
        )}
        {!missingDates && !inverted && scopedVisits.length === 0 && (
          <Alert
            type='info'
            title='ไม่มีข้อมูลในช่วงวันที่ที่เลือก'
            subtext='ทุกแฟ้มจะมี 0 record และปุ่มดาวน์โหลดจะถูกปิดไว้ — ลองขยายช่วงวันที่'
          />
        )}

        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
          <BrandPrimaryButton
            size='lg'
            leadingIcon='build'
            disabled={!canGenerate}
            title={!format ? 'เลือกรูปแบบชุดข้อมูลก่อน' : inverted ? 'แก้ช่วงวันที่ก่อน' : missingDates ? 'ระบุช่วงวันที่ให้ครบก่อน' : undefined}
            onClick={buildPreview}
          >
            สร้างไฟล์
          </BrandPrimaryButton>
          {preview && (
            <NeutralSubdueButton size='lg' variant='outline' onClick={() => setPreview(null)}>
              ยกเลิกผลการสร้างไฟล์
            </NeutralSubdueButton>
          )}
        </div>
      </SectionCard>

      {/* ── preview ── */}
      {preview && (
        <SectionCard
          title={`ผลการสร้างไฟล์ · ${exportFormatByKey(preview.formatKey)?.label}`}
          subtitle={`${preview.from} – ${preview.to} · ${preview.visitCount} ครั้งบริการ · ${String(preview.fileType).toUpperCase()}`}
          icon='inventory_2'
          actions={(
            <BrandSubdueButton
              size='sm'
              variant='fill'
              leadingIcon='download'
              disabled={totalRecords === 0}
              title={totalRecords === 0 ? 'ไม่มี record ให้ดาวน์โหลด' : undefined}
              onClick={downloadAll}
            >
              ดาวน์โหลดทุกแฟ้ม ({preview.files.filter((f) => f.records > 0).length})
            </BrandSubdueButton>
          )}
        >
          <div className='grid' style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--dim-space-300)' }}>
            <MetricTile label='จำนวนแฟ้ม' value={preview.files.length} hint={`มีข้อมูล ${preview.files.filter((f) => f.records > 0).length} แฟ้ม`} />
            <MetricTile label='record รวม' value={totalRecords.toLocaleString('th-TH')} />
            <MetricTile label='ขนาดรวมโดยประมาณ' value={formatBytes(totalBytes)} />
            <MetricTile label='ครั้งบริการที่ดึง' value={preview.visitCount} hint={confirmedOnly ? 'เฉพาะที่ยืนยันแล้ว' : 'รวมที่ยังไม่ยืนยัน'} />
          </div>

          {totalRecords === 0 ? (
            <EmptyState
              icon='folder_off'
              title='ทุกแฟ้มไม่มี record ในช่วงวันที่ที่เลือก'
              subtext='ปุ่มดาวน์โหลดถูกปิดไว้ — ขยายช่วงวันที่ หรือยืนยันครั้งบริการเพิ่มก่อน'
            />
          ) : (
            <Table columns={previewColumns} rows={preview.files} rowKey={(f) => f.name} stickyColCount={1} emptyMessage='ไม่มีแฟ้มในชุดข้อมูลนี้' />
          )}

          <span style={T.muted}>
            ไฟล์ CSV เขียนด้วย UTF-8 + BOM เพื่อให้ Excel อ่านภาษาไทยได้ · ไฟล์ TXT คั่นด้วยเครื่องหมาย | ตามโครงสร้างผู้เรียกเก็บ
          </span>
          <Alert
            type='warning'
            title='โครงสร้างแฟ้มในต้นแบบนี้ยังต้องตรวจสอบกับผู้เรียกเก็บจริง'
            subtext='ชื่อแฟ้มและคอลัมน์อ้างตามโครงสร้างที่เผยแพร่ทั่วไป — ก่อนใช้งานจริงต้องเทียบกับคู่มือโครงสร้างข้อมูลของ สปสช. / กรมบัญชีกลาง / บริษัทประกันแต่ละราย'
          />
        </SectionCard>
      )}

      {/* ── audit: ประวัติการดึงข้อมูล ── */}
      <SectionCard
        title='ประวัติการดึงข้อมูลส่งเบิก'
        subtitle='บันทึกผู้ดึง เวลา รูปแบบ และช่วงวันที่ทุกครั้งเป็นหลักฐาน'
        icon='history'
        tone='muted'
        actions={<StatusBadge style='neutral' size='small'>{EXPORT_HISTORY.length} รายการ</StatusBadge>}
      >
        {EXPORT_HISTORY.length === 0 ? (
          <EmptyState icon='history_toggle_off' title='ยังไม่มีประวัติการดึงข้อมูล' subtext={`ระบบจะบันทึกทุกครั้งที่กดดาวน์โหลด (วันนี้ ${thaiDate(new Date())})`} />
        ) : (
          <Table columns={historyColumns} rows={EXPORT_HISTORY} rowKey={(h) => h.id} stickyColCount={1} emptyMessage='ยังไม่มีประวัติการดึงข้อมูล' />
        )}
        <PermissionHint show={!role.canEdit} text='บทบาทนี้ดึงข้อมูลได้ แต่แก้ไขข้อมูลต้นทางที่แท็บอื่นไม่ได้' />
      </SectionCard>
    </div>
  );
};

export default ClaimExportSection;
