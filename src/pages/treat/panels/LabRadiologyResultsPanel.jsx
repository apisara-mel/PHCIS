import React, { useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import TabPill from '@/components/tab/TabPill';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Select from '@/components/forms/Select';
import Tooltip from '@/components/tooltip/Tooltip';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, InfoPair,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, AccessDeniedPanel, PanelAlert, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  labVisitsFor, analytesFor, seriesFor, labFlagMeta,
} from '@/data/treatmentLabTrends';
import {
  subscribeInterfaces, getInterface, pacsStudiesFor, openPacsStudy, openPacsReport,
  subscribeLabNotifications, getLabNotifications, acknowledgeLabNotification,
} from '@/data/treatmentInterfaces';

/* PHCIS | EMR §1.4.3.12 / §1.4.3.13 — ผลตรวจทางห้องปฏิบัติการและรังสีวิทยา.
   สองโหมดตามที่ TOR สั่ง:
     (ก) รายครั้ง — ตารางผลของ 1 visit พร้อมสัญลักษณ์ ↑/↓ และสีเตือน
         H / L / ค่าวิกฤต เทียบค่าปกติ
     (ข) เปรียบเทียบช่วงเวลา — เลือก analyte แล้วดูค่าข้าม visit
         (คอลัมน์ = วันที่) พร้อมเส้นแนวโน้มและไฮไลต์เซลล์ที่ผิดปกติ

   ค่าที่เป็นข้อความ (ผลเพาะเชื้อ) จะไม่ถูกนำไปวาดกราฟ — แสดงเป็นข้อความ
   พร้อมป้าย abnormal ตาม edge case ที่ระบุไว้. */

const FlagMark = ({ flag }) => {
  const meta = labFlagMeta(flag);
  if (flag === 'normal') return null;
  return (
    <StatusBadge style={meta.badge} size='small' icon={flag === 'critical' ? 'priority_high' : undefined}>
      {meta.symbol} {meta.label}
    </StatusBadge>
  );
};

const valueColor = (flag) => (
  flag === 'critical' ? 'var(--text-alert-error, #B91C1C)'
    : flag === 'high' ? 'var(--text-colorfulbadge-yellow, #A16207)'
      : flag === 'low' ? 'var(--text-alert-info, #1D4ED8)'
        : 'var(--text-content-default)'
);

/* ── เส้นแนวโน้มเล็ก ๆ สำหรับ analyte เดียว (SVG ข้อมูลสถิติ) ── */
const TrendLine = ({ series }) => {
  const pts = series.filter((s) => Number.isFinite(s.value));
  if (pts.length < 2) return null;

  const W = 560; const H = 140; const P = 24;
  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals); const max = Math.max(...vals);
  const span = max - min || 1;
  const x = (i) => P + (i / (pts.length - 1)) * (W - P * 2);
  const y = (v) => P + (1 - (v - min) / span) * (H - P * 2);

  return (
    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role='img' aria-label='เส้นแนวโน้มผลตรวจ' style={{ minWidth: W, display: 'block' }}>
        <polyline
          points={pts.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          fill='none'
          stroke='var(--border-brandPrimary-default, #007549)'
          strokeWidth='2'
        />
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={x(i)} cy={y(p.value)} r='4'
              fill={p.flag === 'normal' ? 'var(--surface-brandPrimary-default, #007549)' : 'var(--surface-dangerButton-default, #B91C1C)'}
            />
            <text
              x={x(i)} y={y(p.value) - 10} textAnchor='middle'
              fill='var(--text-content-tertiary, #858C92)'
              style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 10px)' }}
            >
              {p.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const LabRadiologyResultsPanel = ({ patient, onGoToOrders }) => {
  const access = useTreatmentAccess();
  const hn = patient?.hn || '';

  const [interfaces] = useTreatmentStore(subscribeInterfaces, () => getInterface('pacs'), []);
  const [notifications] = useTreatmentStore(
    subscribeLabNotifications,
    () => getLabNotifications().filter((n) => n.hn === hn),
    [hn],
  );

  const [mode, setMode] = useState('single');       /* single | compare */
  const [visitId, setVisitId] = useState('');
  const [analyte, setAnalyte] = useState('');
  const [pacsResult, setPacsResult] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

  const visits = useMemo(() => labVisitsFor(hn), [hn]);
  const analytes = useMemo(() => analytesFor(hn), [hn]);
  const selectedVisit = visits.find((v) => v.id === visitId) || visits[0] || null;

  const activeAnalyte = analyte || (analytes.find((a) => a.numeric)?.key || '');
  const series = useMemo(
    () => (activeAnalyte ? seriesFor(hn, activeAnalyte) : []),
    [hn, activeAnalyte],
  );
  const analyteMeta = analytes.find((a) => a.key === activeAnalyte);

  const pacsUp = interfaces?.status === 'up';
  const studies = useMemo(() => pacsStudiesFor(hn), [hn]);

  const criticalUnacked = notifications.filter((n) => n.critical && !n.acknowledgedAt);

  if (!access.canView) return <AccessDeniedPanel what='ผลตรวจทางห้องปฏิบัติการและรังสีวิทยา' />;

  const singleColumns = [
    {
      key: 'name', header: 'รายการตรวจ', flex: 1,
      render: (row) => <span style={PANEL_VALUE_STYLE}>{row.name}</span>,
    },
    {
      key: 'value', header: 'ผล',
      render: (row) => (row.text ? (
        /* ค่าเป็นข้อความ — แสดงเป็นข้อความ ไม่พยายามทำเป็นตัวเลข */
        <span style={{ ...PANEL_VALUE_STYLE, color: valueColor(row.flag) }}>{row.text}</span>
      ) : (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, color: valueColor(row.flag), fontWeight: 'var(--type-weight-bold)' }}>
            {typeof row.value === 'number' ? row.value.toLocaleString('th-TH') : row.value}
          </span>
          <span style={PANEL_LABEL_STYLE}>{row.unit}</span>
        </span>
      )),
    },
    { key: 'ref', header: 'ค่าปกติ', render: (row) => <span style={PANEL_LABEL_STYLE}>{row.ref}</span> },
    { key: 'flag', header: 'การแปลผล', render: (row) => <FlagMark flag={row.flag} /> },
  ];

  const compareColumns = [
    {
      key: 'reportedAt', header: 'วันที่รายงานผล',
      render: (row) => <span style={PANEL_VALUE_STYLE}>{row.reportedAt}</span>,
    },
    {
      key: 'value', header: analyteMeta?.name || 'ผล',
      render: (row) => (row.text ? (
        <span style={{ ...PANEL_VALUE_STYLE, color: valueColor(row.flag) }}>{row.text}</span>
      ) : (
        <span
          className='inline-flex items-center'
          style={{
            gap: 'var(--dim-space-100, 4px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            paddingTop: 'var(--dim-space-100, 4px)',
            paddingBottom: 'var(--dim-space-100, 4px)',
            paddingLeft: 'var(--dim-space-200, 8px)',
            paddingRight: 'var(--dim-space-200, 8px)',
            background: row.flag === 'normal'
              ? 'transparent'
              : row.flag === 'critical'
                ? 'var(--surface-danger-quaternary, #FFF0F0)'
                : 'var(--surface-colorfulbadge-yellow, #FEF9C3)',
          }}
        >
          <span style={{ ...PANEL_VALUE_STYLE, color: valueColor(row.flag), fontWeight: 'var(--type-weight-bold)' }}>
            {row.value}
          </span>
          <span style={PANEL_LABEL_STYLE}>{row.unit}</span>
        </span>
      )),
    },
    { key: 'ref', header: 'ค่าปกติ', render: (row) => <span style={PANEL_LABEL_STYLE}>{row.ref}</span> },
    { key: 'flag', header: 'การแปลผล', render: (row) => <FlagMark flag={row.flag} /> },
  ];

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {/* ค่าวิกฤตที่ยังไม่รับทราบ — ต้องเด่นกว่า H/L ธรรมดา */}
      {criticalUnacked.length > 0 ? (
        <PanelAlert tone='error' icon='priority_high' title={`มีผลตรวจค่าวิกฤต ${criticalUnacked.length} รายการที่ยังไม่รับทราบ`}>
          {criticalUnacked.map((n) => `${n.testName} (ผลเสร็จ ${n.completedAt})`).join(' · ')}
          <span style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }}>
            {criticalUnacked.map((n) => (
              <NeutralSubdueButton
                key={n.id} variant='outline' size='sm' leadingIcon='check'
                onClick={() => acknowledgeLabNotification(n.id)}
              >
                รับทราบ {n.testName}
              </NeutralSubdueButton>
            ))}
          </span>
        </PanelAlert>
      ) : null}

      {/* ── ผลตรวจทางห้องปฏิบัติการ ─────────────────────── */}
      <PanelCard
        title='ผลตรวจทางห้องปฏิบัติการ'
        subtitle='ดูผลรายครั้ง หรือเทียบค่าเดียวกันข้ามช่วงเวลาเพื่อดูแนวโน้ม'
        action={<CountLabel n={visits.length} unit='ครั้ง' />}
      >
        <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <TabPill selected={mode === 'single'} onClick={() => setMode('single')}>ผลรายครั้ง</TabPill>
          <TabPill selected={mode === 'compare'} onClick={() => setMode('compare')}>เปรียบเทียบช่วงเวลา</TabPill>
        </div>

        {visits.length === 0 ? (
          <PanelEmptyState
            icon='biotech'
            title='ยังไม่เคยสั่งตรวจทางห้องปฏิบัติการให้ผู้รับบริการรายนี้'
            subtitle='เมื่อสั่งตรวจและห้องแล็บรายงานผลแล้ว ผลจะมาแสดงที่นี่โดยอัตโนมัติ'
            action={onGoToOrders ? (
              <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={onGoToOrders}>
                ไปสั่งตรวจในขั้นตอนสั่งการรักษา
              </BrandButton>
            ) : null}
          />
        ) : mode === 'single' ? (
          <>
            <div style={{ minWidth: 320, maxWidth: 420 }}>
              <Select
                label='เลือกครั้งที่ตรวจ'
                value={selectedVisit?.id || ''}
                onChange={setVisitId}
                options={visits.map((v) => ({ value: v.id, label: `${v.reportedAt} · ${v.orderNo}` }))}
                placeholder='เลือกครั้งที่ตรวจ'
              />
            </div>

            {selectedVisit ? (
              <>
                <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
                  <InfoPair label='เลขที่ใบสั่งตรวจ' value={selectedVisit.orderNo} />
                  <InfoPair label='เก็บสิ่งส่งตรวจ' value={selectedVisit.collectedAt} minWidth={180} />
                  <InfoPair label='รายงานผล' value={selectedVisit.reportedAt} minWidth={180} />
                  <InfoPair label='ผู้รายงานผล' value={selectedVisit.reportedBy} minWidth={200} />
                </div>

                {selectedVisit.panels.map((p) => (
                  <div key={p.panel} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                    <span style={{ ...PANEL_VALUE_STYLE, fontWeight: 'var(--type-weight-bold)' }}>{p.panel}</span>
                    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                      <Table columns={singleColumns} rows={p.rows} rowKey={(r) => r.key} />
                    </div>
                  </div>
                ))}
              </>
            ) : null}
          </>
        ) : (
          <>
            {visits.length < 2 ? (
              <PanelEmptyState
                icon='compare_arrows'
                title='ต้องมีผลตรวจอย่างน้อย 2 ครั้งจึงจะเปรียบเทียบได้'
                subtitle={`ขณะนี้มีผลตรวจ ${visits.length} ครั้ง — เมื่อมีผลครั้งถัดไป ระบบจะแสดงแนวโน้มให้อัตโนมัติ`}
              />
            ) : (
              <>
                <div style={{ minWidth: 320, maxWidth: 420 }}>
                  <Select
                    label='เลือกค่าที่ต้องการเปรียบเทียบ'
                    value={activeAnalyte}
                    onChange={setAnalyte}
                    options={analytes.map((a) => ({ value: a.key, label: `${a.name}${a.unit ? ` (${a.unit})` : ''}` }))}
                    placeholder='เลือกรายการตรวจ'
                  />
                </div>

                {series.length === 0 ? (
                  <PanelEmptyState
                    icon='search_off'
                    title='ไม่พบผลของรายการนี้ในช่วงที่เลือก'
                    subtitle='ลองเลือกรายการตรวจอื่น หรือขยายช่วงเวลาที่ต้องการดู'
                  />
                ) : (
                  <>
                    {series.every((s) => s.text) ? (
                      <PanelAlert tone='info' icon='description' title='ผลรายการนี้เป็นข้อความ'>
                        ค่าที่ห้องปฏิบัติการรายงานมาไม่ใช่ตัวเลข จึงแสดงเป็นข้อความพร้อมการแปลผล และไม่วาดเส้นแนวโน้ม
                      </PanelAlert>
                    ) : (
                      <TrendLine series={series} />
                    )}

                    <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                      <Table columns={compareColumns} rows={series} rowKey={(r) => r.visitId} />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </PanelCard>

      {/* ── รังสีวิทยา / PACS ───────────────────────────── */}
      <PanelCard
        title='ผลตรวจทางรังสีวิทยาและภาพใน PACS'
        subtitle='อ่านรายงานผลได้เสมอ — การเปิดภาพต้องอาศัยการเชื่อมต่อ PACS'
        action={<CountLabel n={studies.length} unit='รายการ' />}
      >
        {!pacsUp ? (
          <PanelAlert tone='error' icon='cloud_off' title='PACS ขาดการเชื่อมต่อ'>
            ไม่สามารถเปิดภาพได้ตั้งแต่ {interfaces?.downSince || 'ไม่ทราบเวลา'} — ระบบยังให้อ่านรายงานผลที่ดึงมาแล้วได้ตามปกติ
            (ซิงก์ล่าสุด {interfaces?.lastSyncAt || '—'})
          </PanelAlert>
        ) : null}

        {studies.length === 0 ? (
          <PanelEmptyState
            icon='radiology'
            title='ยังไม่มีการตรวจทางรังสีวิทยาของผู้รับบริการรายนี้'
            subtitle='เมื่อสั่งตรวจและห้องรังสีถ่ายภาพแล้ว รายการจะปรากฏที่นี่'
          />
        ) : (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            {studies.map((s) => (
              <div
                key={s.id}
                className='flex flex-wrap items-center justify-between w-full'
                style={{
                  gap: 'var(--dim-space-200, 8px)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary)',
                  paddingTop: 'var(--dim-space-300, 12px)',
                  paddingRight: 'var(--dim-space-300, 12px)',
                  paddingBottom: 'var(--dim-space-300, 12px)',
                  paddingLeft: 'var(--dim-space-300, 12px)',
                }}
              >
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <span style={PANEL_VALUE_STYLE}>{s.examType}</span>
                  <span style={PANEL_LABEL_STYLE}>{s.studyDate} · {s.accession} · {s.images} ภาพ</span>
                </div>
                <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                  <ColorfulBadge style={s.status === 'พร้อมดูภาพ' ? 'teal' : 'yellow'} size='small' width='hug'>
                    {s.status}
                  </ColorfulBadge>
                  {/* อ่านได้เสมอแม้ PACS ขาดการเชื่อมต่อ — ตรงกับที่ alert ด้านบนสัญญาไว้ */}
                  <NeutralSubdueButton
                    variant='outline' size='sm' leadingIcon='description'
                    onClick={() => setReportTarget(openPacsReport(s))}
                  >
                    เปิดใบรายงานผล
                  </NeutralSubdueButton>
                  {pacsUp ? (
                    <NeutralSubdueButton
                      variant='outline' size='sm' leadingIcon='image'
                      onClick={() => setPacsResult(openPacsStudy(s))}
                    >
                      เปิดภาพใน PACS
                    </NeutralSubdueButton>
                  ) : (
                    <Tooltip
                      position='top'
                      content={`PACS ขาดการเชื่อมต่อตั้งแต่ ${interfaces?.downSince || 'ไม่ทราบเวลา'} — เปิดภาพไม่ได้จนกว่าจะเชื่อมต่อสำเร็จ`}
                    >
                      <span style={{ display: 'inline-flex', cursor: 'not-allowed' }}>
                        <NeutralSubdueButton variant='outline' size='sm' leadingIcon='image' disabled>
                          เปิดภาพใน PACS
                        </NeutralSubdueButton>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PanelAlert tone='warning' icon='info' title='ขอบเขตการเชื่อมต่อในเวอร์ชันนี้'>
          หน้าจอนี้เป็นตัวติดตามสถานะการเชื่อมต่อ (interface monitor) — ยังไม่มี HL7 v2.5.1 หรือ DICOMweb engine จริง
          ผลและรายการภาพเป็นข้อมูลจำลองที่จัดรูปแบบตามข้อกำหนดไว้ล่วงหน้า
        </PanelAlert>
      </PanelCard>

      {/* ใบรายงานผลที่ดึงมาแล้ว — ไม่ขึ้นกับสถานะการเชื่อมต่อ PACS */}
      <AlertDialog
        open={!!reportTarget}
        type={reportTarget?.ok ? 'info' : 'warning'}
        title={reportTarget?.title || 'ใบรายงานผล'}
        description={reportTarget?.message || ''}
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setReportTarget(null)}
        onClose={() => setReportTarget(null)}
      />

      <AlertDialog
        open={!!pacsResult}
        type={pacsResult?.ok ? 'success' : 'warning'}
        title={pacsResult?.ok ? 'เปิดภาพใน PACS' : 'เปิดภาพไม่สำเร็จ'}
        description={pacsResult?.message || 'ระบบส่งคำขอเปิดภาพไปยัง PACS แล้ว และบันทึกการเข้าถึงไว้ในประวัติการแก้ไข'}
        confirmLabel='ตกลง'
        showCancel={false}
        onConfirm={() => setPacsResult(null)}
        onClose={() => setPacsResult(null)}
      />
    </div>
  );
};

export default LabRadiologyResultsPanel;
