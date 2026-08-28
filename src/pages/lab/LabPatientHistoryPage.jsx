import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PatientCard from '@/components/card/PatientCard';
import Badge from '@/components/badge/Badge';
import Alert from '@/components/alert/Alert';
import Select from '@/components/forms/Select';
import DatePickerRange from '@/components/forms/DatePickerRange';
import { FilterDropdown } from '@/components/forms/FilterTag';
import ClearFiltersTag, { SmoothFilterResults } from '@/components/forms/ClearFiltersTag';
import useSmoothClearFilters from '@/hooks/useSmoothClearFilters';
import Switch from '@/components/switch/Switch';
import PrivacyRevealPopup from '@/components/popup/PrivacyRevealPopup';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import { Icon } from '@/components/icons/Icon';
import { TrendChart } from '@/pages/lab/LabDetailPanel';
import { LAB_GROUPS } from '@/data/labCatalog';
import { LAB_ORDERS, withTestLabel, subscribeOrders } from '@/data/labOrders';
import { buildCumulative, trendPointsFor, cumulativePatients, CUMULATIVE_TODAY } from '@/data/labCumulative';
import { appendLabAudit } from '@/data/labAudit';
import { printLab } from '@/data/labPrintSettings';

/* ผลตรวจย้อนหลัง / เปรียบเทียบ (cumulative report) — /lab/history/:hn.

   Before this screen, the only retrospective view in the whole module was a
   6-point sparkline inside LabDetailPanel's drawer (L385) and a single
   delta-vs-previous line beside one input on LabResultEntryPage (L118).
   Neither answers the question a clinician actually brings to the lab: "what
   has this patient's creatinine been doing over the last year?" — and both
   are scoped to a single order row.

   The layout is the cumulative sheet every laboratory produces: analytes
   down, collection dates across, newest on the LEFT. Newest-left is not a
   style choice — the current value is what the clinician came for, and a
   left-to-right timeline puts it at the far edge of a scrolling table.

   Confidential analytes (§1.15.6.4) are the reason this screen needs care.
   A cumulative sheet lists every analyte by name across every visit, which
   makes it precisely where an unaudited Anti-HIV row would leak. They are
   listed (hiding their existence would mislead the reader) but masked until
   an explicit reveal, and every reveal writes appendLabAudit. */

const breadcrumb = ['ห้องปฏิบัติการ', 'ผลตรวจย้อนหลัง / เปรียบเทียบ'];
const CURRENT_ACTOR = 'เจ้าหน้าที่ห้องปฏิบัติการ';
const ALL = '__all__';

/* Monospace for accession numbers — a rendering requirement for aligned
   identifiers, not a design-system value. tokens.css defines no
   --type-family-mono, so that var() only ever resolved to its own fallback;
   a plain stack states that honestly instead of naming a token that would
   silently change meaning the day a theme defines one. */
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';


const parseIso = (s) => {
  if (!s) return null;
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const toIso = (d) => {
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/* Flag glyph for one cell. H / L is what a paper cumulative sheet prints and
   what a clinician scans for; the tone carries the same information for a
   reader who cannot resolve the letter at a glance. */
const CellValue = ({ cell, row, masked }) => {
  if (cell.empty) {
    return (
      <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-quaternary)' }}>
        —
      </span>
    );
  }
  if (masked) {
    return (
      <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-quaternary)' }}>
        <Icon name='lock' size={12} />
        ••••
      </span>
    );
  }
  const numeric = Number(cell.value);
  const range = row.range;
  let flag = '';
  if (Number.isFinite(numeric) && (cell.status === 'abnormal' || cell.status === 'critical')) {
    const m = String(range ?? '').match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
    if (m) flag = numeric > Number(m[2]) ? 'H' : numeric < Number(m[1]) ? 'L' : '';
    else if (/^[<≤]/.test(String(range ?? ''))) flag = 'H';
    else if (/^[>≥]/.test(String(range ?? ''))) flag = 'L';
  }
  const color = cell.status === 'critical'
    ? 'var(--text-statusbadge-error)'
    : cell.status === 'abnormal'
      ? 'var(--text-statusbadge-warning)'
      : 'var(--text-content-default)';
  return (
    <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 'var(--type-size-sm)',
          fontWeight: cell.status === 'normal' ? 'var(--type-weight-regular)' : 'var(--type-weight-bold)',
          color,
        }}
      >
        {cell.value}
      </span>
      {flag && (
        <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', color }}>
          {flag}
        </span>
      )}
      {cell.status === 'critical' && <Icon name='warning' size={12} style={{ color }} />}
    </span>
  );
};

const HeadCell = ({ children, width, sticky, left }) => (
  <th
    style={{
      width,
      minWidth: width,
      textAlign: 'left',
      position: sticky ? 'sticky' : undefined,
      left: sticky ? left : undefined,
      zIndex: sticky ? 2 : undefined,
      background: 'var(--surface-table-header)',
      color: 'var(--text-table-title)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-xs)',
      fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      whiteSpace: 'nowrap',
    }}
  >
    {children}
  </th>
);

const BodyCell = ({ children, width, sticky, left, background }) => (
  <td
    style={{
      width,
      minWidth: width,
      position: sticky ? 'sticky' : undefined,
      left: sticky ? left : undefined,
      zIndex: sticky ? 1 : undefined,
      background: background ?? 'var(--surface-card-100)',
      borderBottom: 'var(--dim-stroke-100) solid var(--border-table-default)',
      paddingTop: 'var(--dim-space-300)',
      paddingBottom: 'var(--dim-space-300)',
      paddingLeft: 'var(--dim-space-300)',
      paddingRight: 'var(--dim-space-300)',
      verticalAlign: 'top',
    }}
  >
    {children}
  </td>
);

const LabPatientHistoryPage = () => {
  const historyNav = useHistory();
  const { hn: hnParam } = useParams();

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setVersion((v) => v + 1)), []);

  const patients = useMemo(() => cumulativePatients(), [version]);
  const hn = hnParam && patients.some((p) => p.hn === hnParam) ? hnParam : (patients[0]?.hn ?? '');

  const [range, setRange] = useState(['', '']);
  const [group, setGroup] = useState(ALL);
  const [abnormalOnly, setAbnormalOnly] = useState(false);
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  const [revealed, setRevealed] = useState([]);
  const [revealTarget, setRevealTarget] = useState(null);

  /* Re-mask whenever the patient changes — a reveal is granted for one
     patient's one analyte, never carried across. */
  useEffect(() => { setRevealed([]); setSelectedRowKey(null); }, [hn]);

  const data = useMemo(
    () => buildCumulative(hn, {
      from: range[0],
      to: range[1],
      group: group === ALL ? null : group,
      abnormalOnly,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hn, range, group, abnormalOnly, version],
  );

  const selectedRow = useMemo(() => {
    if (!selectedRowKey) return null;
    for (const s of data.sections) {
      const found = s.rows.find((r) => r.key === selectedRowKey);
      if (found) return found;
    }
    return null;
  }, [selectedRowKey, data]);

  /* Orders belonging to this patient that have a releasable patient report —
     the second print output, reusing the existing LabPatientReport route
     rather than duplicating the sheet here. */
  const printableOrders = useMemo(() => {
    const seen = new Map();
    LAB_ORDERS
      .filter((o) => o.patient.hn === hn && o.status === 'reported' && o.results)
      .map(withTestLabel)
      .forEach((r) => { if (!seen.has(r.orderId)) seen.set(r.orderId, r); });
    return [...seen.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hn, version]);

  const isMasked = (row) => row.confidential && !revealed.includes(row.key);

  const handleReveal = () => {
    if (!revealTarget) return;
    setRevealed((prev) => [...new Set([...prev, revealTarget.key])]);
    appendLabAudit({
      actor: CURRENT_ACTOR,
      scope: 'confidential',
      action: 'เปิดดูผลตรวจที่ปกปิดบนใบสรุปผลย้อนหลัง',
      detail: `HN ${hn} · ${revealTarget.testLabel} — ${revealTarget.label}`,
      after: { revealed: true },
    });
    setRevealTarget(null);
  };

  const hasFilter = !!range[0] || !!range[1] || group !== ALL || abnormalOnly;
  const { showClearChip, resultsOpaque, clearFilters } = useSmoothClearFilters(hasFilter, () => {
    setRange(['', '']);
    setGroup(ALL);
    setAbnormalOnly(false);
  });

  const summaryCards = useMemo(() => [
    { key: 'visits', label: 'ครั้งที่มีผลตรวจ', value: data.columns.length, indicator: 'แสดงล่าสุด 8 ครั้ง', color: 'brand', icon: 'event_repeat' },
    { key: 'analytes', label: 'ค่าที่เปรียบเทียบได้', value: data.totalRows, indicator: 'รายการย่อยทั้งหมด', color: 'info', icon: 'table_rows' },
    { key: 'abnormal', label: 'ค่าที่เคยผิดปกติ', value: data.abnormalRows, indicator: 'อย่างน้อย 1 ครั้ง', color: 'inprogress', icon: 'error' },
    { key: 'critical', label: 'ค่าที่เคยถึงเกณฑ์วิกฤต', value: data.criticalRows, indicator: 'ต้องเคยแจ้งแพทย์', color: 'destructive', icon: 'warning' },
  ], [data]);

  const patient = data.patient;

  return (
    <>
      <PrivacyRevealPopup
        open={!!revealTarget}
        fieldLabel={revealTarget ? `ผลตรวจ ${revealTarget.testLabel}` : 'ผลตรวจที่ปกปิด'}
        onClose={() => setRevealTarget(null)}
        onConfirm={handleReveal}
      />

      <QueuePageShell
        activeKey='lab'
        breadcrumb={breadcrumb}
        title='ผลตรวจย้อนหลัง / เปรียบเทียบ (Cumulative report)'
        onBack={() => historyNav.push('/lab/queue')}
        backLabel='กลับไปยังห้องปฏิบัติการ'
        summaryCards={summaryCards}
        summaryFlushUnderSubHeader={false}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-1200)',
            gap: 'var(--dim-space-600)',
          }}
        >
          {patient && (
            <PatientCard
              patient={patient}
              title='ผลตรวจทางห้องปฏิบัติการย้อนหลัง'
              actions={(
                <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <div style={{ width: 260 }}>
                    <Select
                      value={hn}
                      options={patients.map((p) => ({ value: p.hn, label: `${p.patient.shortName} · HN ${p.hn}` }))}
                      onChange={(v) => historyNav.push(`/lab/history/${v}`)}
                      showLabel={false}
                      size='md'
                    />
                  </div>
                </div>
              )}
            />
          )}

          <div
            className='flex flex-col w-full'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='flex flex-wrap items-end w-full mih-lab-no-print' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '1 1 360px', minWidth: 300 }}>
                <DatePickerRange
                  label='ช่วงวันที่เก็บตัวอย่าง'
                  size='md'
                  value={range}
                  format={toIso}
                  parse={parseIso}
                  onChange={setRange}
                  helperText='เว้นว่างเพื่อดูทุกครั้งที่มีผลตรวจ'
                />
              </div>
              <FilterDropdown
                prefix='กลุ่มตรวจ:'
                options={[{ value: ALL, label: 'ทั้งหมด' }, ...LAB_GROUPS.map((g) => ({ value: g.key, label: g.thai }))]}
                value={group}
                onChange={setGroup}
              />
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)', height: 40 }}>
                <Switch checked={abnormalOnly} onChange={setAbnormalOnly} aria-label='แสดงเฉพาะค่าผิดปกติ' />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary)' }}>
                  เฉพาะค่าผิดปกติ
                </span>
              </span>
              <ClearFiltersTag active={showClearChip} onClear={clearFilters} />
              <div className='flex-1' />
              <NeutralSubdueButton
                variant='outline'
                size='md'
                leadingIcon='description'
                disabled={printableOrders.length === 0}
                onClick={() => historyNav.push(`/lab/report/${printableOrders[0].orderId}`)}
              >
                ใบรายงานผลรายครั้ง
              </NeutralSubdueButton>
              <BrandPrimaryButton
                size='md'
                leadingIcon='print'
                disabled={data.totalRows === 0}
                onClick={() => {
                  appendLabAudit({
                    actor: CURRENT_ACTOR,
                    scope: 'result',
                    action: 'พิมพ์ใบสรุปผลตรวจย้อนหลัง',
                    detail: `HN ${hn} · ${data.columns.length} ครั้ง · ${data.totalRows} รายการย่อย`,
                  });
                  window.setTimeout(() => printLab('cumulative'), 0);
                }}
              >
                พิมพ์ใบสรุปผลย้อนหลัง
              </BrandPrimaryButton>
            </div>

            <SmoothFilterResults opaque={resultsOpaque} style={{ gap: 'var(--dim-space-400)' }}>
            {data.hasConfidential && (
              <Alert
                type='info'
                iconName='lock'
                iconFill={1}
                title='มีผลตรวจที่เป็นความลับอยู่ในใบสรุปนี้'
                subtext='ค่าจะถูกปกปิดจนกว่าจะยืนยันตัวตนเพื่อเปิดดู และการเปิดดูทุกครั้งจะถูกบันทึกใน audit trail'
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}

            {data.totalRows === 0 ? (
              <div
                className='w-full flex flex-col items-center justify-center'
                style={{
                  gap: 'var(--dim-space-300)',
                  minHeight: 280,
                  background: 'var(--surface-card-200)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  borderRadius: 'var(--dim-radius-500)',
                }}
              >
                <Icon name={hasFilter ? 'search_off' : 'science'} size={32} style={{ color: 'var(--text-content-quaternary)' }} />
                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-tertiary)', textAlign: 'center' }}>
                  {hasFilter
                    ? 'ไม่พบผลตรวจที่ตรงกับตัวกรองที่เลือก'
                    : 'ยังไม่มีผลตรวจที่รับรองแล้วสำหรับผู้ป่วยรายนี้'}
                </span>
                {hasFilter ? (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={clearFilters}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                ) : (
                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-quaternary)' }}>
                    ใบสรุปนี้แสดงเฉพาะผลที่ผ่านการรับรองแล้วเท่านั้น
                  </span>
                )}
              </div>
            ) : (
              <div className='w-full' style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
                  <thead>
                    <tr>
                      <HeadCell width={240} sticky left={0}>รายการตรวจ / ค่าที่วัด</HeadCell>
                      <HeadCell width={130}>ค่าอ้างอิง</HeadCell>
                      {data.columns.map((c) => (
                        <HeadCell key={c.key} width={130}>
                          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                            <span>{c.date === CUMULATIVE_TODAY ? `${c.date} (วันนี้)` : c.date}</span>
                            <span style={{ fontWeight: 'var(--type-weight-regular)', color: 'var(--text-content-tertiary)' }}>
                              {c.orderId} · {c.location}
                            </span>
                          </div>
                        </HeadCell>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.sections.map((section) => (
                      <React.Fragment key={section.key}>
                        <tr>
                          <td
                            colSpan={data.columns.length + 2}
                            style={{
                              background: 'var(--surface-brandPrimary-quaternary)',
                              color: 'var(--text-brandPrimary-default)',
                              fontFamily: 'var(--type-family-body)',
                              fontSize: 'var(--type-size-xs)',
                              fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
                              paddingTop: 'var(--dim-space-200)',
                              paddingBottom: 'var(--dim-space-200)',
                              paddingLeft: 'var(--dim-space-300)',
                              paddingRight: 'var(--dim-space-300)',
                            }}
                          >
                            {section.label} ({section.rows.length})
                          </td>
                        </tr>
                        {section.rows.map((row) => {
                          const masked = isMasked(row);
                          const on = selectedRowKey === row.key;
                          return (
                            <tr
                              key={row.key}
                              onClick={() => setSelectedRowKey(on ? null : row.key)}
                              style={{ cursor: 'pointer', background: on ? 'var(--surface-table-hover)' : undefined }}
                            >
                              <BodyCell width={240} sticky left={0} background={on ? 'var(--surface-table-hover)' : 'var(--surface-card-100)'}>
                                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                                  <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                                    {row.confidential && <Icon name='lock' size={12} style={{ color: 'var(--text-content-quaternary)' }} />}
                                    {row.label}
                                    {row.hasCritical && <Badge style='error' size='small'>เคยวิกฤต</Badge>}
                                  </span>
                                  <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                                    {row.testLabel} · {row.unit || '—'}
                                  </span>
                                  {masked && (
                                    <button
                                      type='button'
                                      onClick={(e) => { e.stopPropagation(); setRevealTarget(row); }}
                                      className='inline-flex items-center self-start mih-lab-no-print'
                                      style={{
                                        gap: 'var(--dim-space-100)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: 'var(--dim-space-0)',
                                        fontFamily: 'var(--type-family-body)',
                                        fontSize: 'var(--type-size-xs)',
                                        color: 'var(--text-brandPrimary-default)',
                                      }}
                                    >
                                      <Icon name='visibility' size={12} />
                                      เปิดดูผลที่ปกปิด
                                    </button>
                                  )}
                                </div>
                              </BodyCell>
                              <BodyCell width={130} background={on ? 'var(--surface-table-hover)' : undefined}>
                                <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                                  {row.range || '—'}
                                </span>
                              </BodyCell>
                              {row.cells.map((cell) => (
                                <BodyCell key={cell.key} width={130} background={on ? 'var(--surface-table-hover)' : undefined}>
                                  <CellValue cell={cell} row={row} masked={masked} />
                                </BodyCell>
                              ))}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selecting an analyte swaps in its full-width trend — the same
                TrendChart LabDetailPanel already exports, so a value plotted
                in the drawer and here cannot look different. */}
            {selectedRow && !isMasked(selectedRow) && trendPointsFor(selectedRow).length > 1 && (
              <div
                className='flex flex-col w-full'
                style={{
                  gap: 'var(--dim-space-200)',
                  background: 'var(--surface-card-200)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                  borderRadius: 'var(--dim-radius-300)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                }}
              >
                <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
                  <span style={{ fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>
                    แนวโน้ม {selectedRow.label} ({selectedRow.unit || '—'}) · ค่าอ้างอิง {selectedRow.range || '—'}
                  </span>
                  <div className='flex-1' />
                  <NeutralSubdueButton variant='outline' size='sm' onClick={() => setSelectedRowKey(null)}>
                    ปิดกราฟ
                  </NeutralSubdueButton>
                </div>
                <TrendChart points={trendPointsFor(selectedRow)} />
              </div>
            )}
            {selectedRow && isMasked(selectedRow) && (
              <Alert
                type='warning'
                iconName='lock'
                iconFill={1}
                title='ผลตรวจนี้ถูกปกปิด — ต้องยืนยันตัวตนก่อนจึงจะดูแนวโน้มได้'
                showSubtext={false}
                showBadge={false}
                showIndicator={false}
                showDetail={false}
              />
            )}
            </SmoothFilterResults>
          </div>
        </div>
      </QueuePageShell>

      {/* Print target — the cumulative sheet, plain black-on-white, rendered
          from the same `data` the screen shows. Confidential rows that were
          never revealed print masked, exactly as they appear.

          PORTALED TO body: labPrintSettings.js hides
          `body > *:not(.mih-lab-print-root)` while printing, and #root matches
          that selector — a print root nested inside the React tree is hidden
          along with its ancestor no matter what `display: block !important`
          says about the inner document, so printLab('cumulative') printed a
          blank page. */}
      {typeof document !== 'undefined' && createPortal(
        <div className='mih-lab-print-root'>
        <div
          className='mih-lab-print-only mih-lab-print-cumulative'
          style={{ width: '297mm', background: '#FFFFFF', color: '#000000', padding: '10mm', boxSizing: 'border-box' }}
        >
          <div style={{ borderBottom: '0.4mm solid #000000', paddingBottom: '2mm', marginBottom: '3mm' }}>
            <div style={{ fontFamily: 'var(--type-family-heading-content)', fontSize: '13pt', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))' }}>
              ใบสรุปผลตรวจทางห้องปฏิบัติการย้อนหลัง (Cumulative report)
            </div>
            <div style={{ fontFamily: 'var(--type-family-body)', fontSize: '9pt' }}>
              {patient ? `${patient.fullName ?? patient.shortName} · HN ${hn} · ${patient.sex} · ${patient.age}` : `HN ${hn}`}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: '8pt', borderBottom: '0.4mm solid #000000', padding: '1.5mm 1mm' }}>รายการตรวจ / ค่าที่วัด</th>
                <th style={{ textAlign: 'left', fontSize: '8pt', borderBottom: '0.4mm solid #000000', padding: '1.5mm 1mm' }}>ค่าอ้างอิง</th>
                {data.columns.map((c) => (
                  <th key={c.key} style={{ textAlign: 'left', fontSize: '8pt', borderBottom: '0.4mm solid #000000', padding: '1.5mm 1mm' }}>
                    {c.date}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sections.map((section) => (
                <React.Fragment key={`p-${section.key}`}>
                  <tr>
                    <td colSpan={data.columns.length + 2} style={{ fontSize: '8pt', fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))', padding: '2mm 1mm 1mm', borderBottom: '0.15mm solid #999999' }}>
                      {section.label}
                    </td>
                  </tr>
                  {section.rows.map((row) => (
                    <tr key={`p-${row.key}`}>
                      <td style={{ fontSize: '8pt', padding: '1.5mm 1mm', borderBottom: '0.15mm solid #CCCCCC' }}>
                        {row.label} <span style={{ color: '#555555' }}>({row.testLabel}{row.unit ? ` · ${row.unit}` : ''})</span>
                      </td>
                      <td style={{ fontSize: '8pt', padding: '1.5mm 1mm', borderBottom: '0.15mm solid #CCCCCC', color: '#333333' }}>
                        {row.range || '—'}
                      </td>
                      {row.cells.map((cell) => (
                        <td
                          key={`p-${row.key}-${cell.key}`}
                          style={{
                            fontSize: '8pt',
                            fontFamily: MONO,
                            padding: '1.5mm 1mm',
                            borderBottom: '0.15mm solid #CCCCCC',
                            fontWeight: cell.status && cell.status !== 'normal' ? 'var(--type-weight-bold)' : 'var(--type-weight-regular)',
                          }}
                        >
                          {cell.empty ? '—' : (isMasked(row) ? '••••' : cell.value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '4mm', fontSize: '7.5pt', color: '#444444' }}>
            แสดงเฉพาะผลที่ผ่านการรับรองแล้ว · ค่าที่พิมพ์ตัวหนาคือค่าที่อยู่นอกช่วงอ้างอิงของผู้ป่วยรายนี้ (แยกตามเพศและอายุ)
          </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};

export default LabPatientHistoryPage;
