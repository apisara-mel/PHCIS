import React, { useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import PatientCard from '@/components/card/PatientCard';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Icon from '@/components/icons/Icon';
import { getPatientByHN, DEFAULT_PATIENT } from '@/data/patientProfiles';
import {
  CHECKUP_ITEM_GROUPS, VISIT_STATUSES,
  listVisitsByHn, getVisitRecord, getPackage, visitItems, buildComparison,
  collectAbnormalFindings, computeBmi, bmiBand, interpretValue, visitRefOverrides,
  formatThaiDate, formatThaiDateTime, findCatalogItem, getScreening,
} from '@/data/checkupStore';
import { summariseScreening } from '@/pages/checkup/CheckupScreeningSteps';
import CheckupTrendSection from '@/pages/checkup/CheckupTrendSection';
import CheckupCompareTable from '@/pages/checkup/CheckupCompareTable';
import {
  PageBody, PageCard, EmptyState, NoticeBar, SectionHeader, SubCard,
  ReadField, ResultBadge, RefSourceBadge, VerdictBadge, StatTile, CheckupAuditBar,
} from '@/pages/checkup/CheckupUi';

/* CheckupHistoryPage — ผลตรวจย้อนหลัง + เปรียบเทียบ
   (TOR 1.19.10 หลายครั้งใน 1 โปรแกรม · 1.19.11 ดูผลย้อนหลัง · 1.19.12 เปรียบเทียบ).

   Three tabs:
     ไทม์ไลน์    — every checkup visit with its summary verdict; opening one
                    shows the full record READ-ONLY (same content the record
                    wizard captures, rendered as a report)
     เปรียบเทียบ  — CheckupCompareTable (metrics × visits, sticky first column)
     แนวโน้ม      — CheckupTrendSection (charts per metric family)

   When a patient has only one visit, the comparison tab is hidden and replaced
   with an explanatory note (spec edge case). */

const breadcrumb = ['ระบบงานตรวจสุขภาพ', 'ผลตรวจย้อนหลัง'];

const CheckupHistoryPage = () => {
  const history = useHistory();
  const { hn } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const patient = useMemo(() => getPatientByHN(hn) || DEFAULT_PATIENT, [hn]);

  /* Oldest → newest so "ครั้งที่" and the compare columns read left to right. */
  const visits = useMemo(
    () => listVisitsByHn(hn).slice().sort((a, b) => String(a.visitDate).localeCompare(String(b.visitDate))),
    [hn],
  );
  const records = useMemo(() => visits.map((v) => getVisitRecord(v.id)), [visits]);

  const comparison = useMemo(() => buildComparison(hn), [hn]);
  const summarised = comparison.visits;

  const selected = visits[selectedIdx] || null;
  const selectedRecord = records[selectedIdx] || null;
  const selectedScreening = selected ? getScreening(selected.id) : null;

  const canCompare = summarised.length >= 2;

  const tabs = useMemo(() => {
    const base = [
      { key: 'timeline', label: `ไทม์ไลน์การตรวจ (${visits.length})`, icon: 'history' },
    ];
    if (canCompare) base.push({ key: 'compare', label: 'เปรียบเทียบข้ามครั้ง', icon: 'compare_arrows' });
    base.push({ key: 'trend', label: 'กราฟแนวโน้ม', icon: 'monitoring' });
    return base;
  }, [visits.length, canCompare]);

  const timelineColumns = useMemo(() => ([
    {
      key: 'round',
      label: 'ครั้งที่',
      render: (r) => <ColorfulBadge style={(r.round || 1) > 1 ? 'indigo' : 'grey'} size='small' hierarchy='secondary'>{`ครั้งที่ ${r.round || 1}`}</ColorfulBadge>,
    },
    { key: 'visitDate', label: 'วันที่ตรวจ', render: (r) => formatThaiDate(r.visitDate) },
    { key: 'programName', label: 'โปรแกรมตรวจสุขภาพ', flex: true, minWidth: 300 },
    {
      key: 'packageId',
      label: 'ชุดตรวจ',
      flex: true,
      minWidth: 220,
      render: (r) => getPackage(r.packageId)?.code || '—'},
    { key: 'doctor', label: 'แพทย์', flex: true, minWidth: 160 },
    {
      key: 'verdict',
      label: 'สรุปผลการตรวจ',
      sortable: false,
      render: (r) => {
        const rec = getVisitRecord(r.id);
        if (!rec) return <ColorfulBadge style='grey' size='small' hierarchy='secondary'>ยังไม่บันทึกผล</ColorfulBadge>;
        return <VerdictBadge verdict={rec.summaryVerdict} />;
      },
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        const cfg = VISIT_STATUSES[r.statusKey] || VISIT_STATUSES.waiting;
        return <ColorfulBadge style={cfg.badge} size='small' hierarchy='secondary'>{cfg.label}</ColorfulBadge>;
      },
    },
    {
      key: 'actions',
      label: 'การดำเนินการ',
      sortable: false,
      render: (r, idx) => (
        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-150)' }}>
          <BrandSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={(e) => { e.stopPropagation(); setSelectedIdx(idx); }}>
            ดูรายละเอียด
          </BrandSubdueButton>
          <NeutralSubdueButton size='sm' leadingIcon='description' onClick={(e) => { e.stopPropagation(); history.push(`/checkup/report/${r.id}`); }}>
            รายงาน
          </NeutralSubdueButton>
        </span>
      ),
    },
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  ]), []);

  /* Read-only detail of one visit — mirrors what the record wizard captures. */
  const renderDetail = () => {
    if (!selected) return null;
    if (!selectedRecord) {
      return (
        <PageCard>
          <SectionHeader
            icon='visibility'
            title={`รายละเอียดการตรวจครั้งที่ ${selected.round || 1} · ${formatThaiDate(selected.visitDate)}`}
            subtitle='อ่านอย่างเดียว'
          />
          <EmptyState
            icon='folder_off'
            title='ครั้งนี้ยังไม่มีผลตรวจที่บันทึกไว้'
            subtitle={`สถานะปัจจุบัน: ${VISIT_STATUSES[selected.statusKey]?.label || '—'} — เปิดหน้าบันทึกผลตรวจเพื่อกรอกผล`}
            actionLabel='ไปบันทึกผลตรวจครั้งนี้'
            onAction={() => history.push(`/checkup/record/${selected.id}`)}
          />
        </PageCard>
      );
    }

    const overrides = visitRefOverrides(selected);
    const items = visitItems(selected);
    const findings = collectAbnormalFindings(selected, selectedRecord);
    const bmi = computeBmi(selectedRecord.vitals?.weight, selectedRecord.vitals?.height);
    const band = bmiBand(bmi);
    const screeningSummary = selectedScreening ? summariseScreening(selectedScreening) : [];

    const resultColumns = [
      { key: 'code', label: 'รหัส' },
      { key: 'name', label: 'รายการตรวจ', flex: true, minWidth: 250, render: (r) => findCatalogItem(r.code)?.name || r.code },
      {
        key: 'value',
        label: 'ผลตรวจ',
        flex: true,
        minWidth: 240,
        render: (r) => (r.value === '' || r.value == null
          ? <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>ไม่มีผล</span>
          : String(r.value)),
      },
      {
        key: 'verdict',
        label: 'แปลผล',
        sortable: false,
        render: (r) => {
          const item = findCatalogItem(r.code);
          if (!item) return null;
          if (item.resultType === 'numeric') {
            return <ResultBadge verdict={interpretValue(r.code, r.value, overrides)} />;
          }
          if (r.value === '' || r.value == null) return null;
          const isNormal = /ปกติ|^ลบ|Negative|Non-reactive|ไม่พบรอยโรค|ไม่พบความผิดปกติ/i.test(String(r.value));
          return <ResultBadge verdict={{ status: isNormal ? 'normal' : 'abnormal' }} />;
        },
      },
      {
        key: 'ref',
        label: 'ค่าอ้างอิง / ที่มา',
        sortable: false,
        render: (r) => {
          const item = findCatalogItem(r.code);
          if (item?.resultType !== 'numeric') return <span style={{ color: 'var(--text-content-tertiary, #858C92)' }}>—</span>;
          const verdict = interpretValue(r.code, r.value, overrides);
          return <RefSourceBadge sourceKey={verdict.source} range={verdict.range} />;
        },
      },
    ];

    return (
      <>
        <PageCard>
          <SectionHeader
            icon='visibility'
            title={`รายละเอียดการตรวจครั้งที่ ${selected.round || 1} · ${formatThaiDate(selected.visitDate)}`}
            subtitle={`${selected.programName} · ชุดตรวจ ${getPackage(selected.packageId)?.code || '—'} · แพทย์ ${selected.doctor} (อ่านอย่างเดียว)`}
            trailing={(
              <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <VerdictBadge verdict={selectedRecord.summaryVerdict} size='default' />
                <BrandSubdueButton variant='outline' size='sm' leadingIcon='description' onClick={() => history.push(`/checkup/report/${selected.id}`)}>
                  เปิดรายงานผลรายบุคคล
                </BrandSubdueButton>
              </span>
            )}
          />

          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <StatTile label='รายการตรวจทั้งหมด' value={items.length} unit='รายการ' tone='info' icon='checklist' />
            <StatTile label='รายการผิดปกติ' value={findings.length} unit='รายการ' tone={findings.length > 0 ? 'danger' : 'brand'} icon='error' />
            <StatTile label='ดัชนีมวลกาย (BMI)' value={bmi != null ? bmi : '—'} unit={band?.label} tone={band?.badge === 'green' ? 'brand' : 'warning'} icon='monitor_weight' />
          </div>

          <SubCard>
            <SectionHeader icon='monitor_heart' title='สัญญาณชีพและการวัด' />
            <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-600)' }}>
              <ReadField label='น้ำหนัก' value={selectedRecord.vitals?.weight ? `${selectedRecord.vitals.weight} กก.` : '—'} minWidth={120} />
              <ReadField label='ส่วนสูง' value={selectedRecord.vitals?.height ? `${selectedRecord.vitals.height} ซม.` : '—'} minWidth={120} />
              <ReadField label='BMI' value={bmi != null ? `${bmi} kg/m² (${band?.label})` : '—'} minWidth={200} />
              <ReadField label='รอบเอว' value={selectedRecord.vitals?.waist ? `${selectedRecord.vitals.waist} ซม.` : '—'} minWidth={120} />
              <ReadField label='ความดันโลหิต' value={selectedRecord.vitals?.sbp ? `${selectedRecord.vitals.sbp}/${selectedRecord.vitals.dbp} mmHg` : '—'} minWidth={180} />
              <ReadField label='ชีพจร' value={selectedRecord.vitals?.pulse ? `${selectedRecord.vitals.pulse} ครั้ง/นาที` : '—'} minWidth={150} />
              <ReadField label='สายตา (ซ้าย/ขวา)' value={selectedRecord.vitals?.visionL ? `${selectedRecord.vitals.visionL} / ${selectedRecord.vitals.visionR}` : '—'} minWidth={180} />
            </div>
          </SubCard>

          {CHECKUP_ITEM_GROUPS.map((g) => {
            const rows = items
              .filter((i) => i.group === g.key)
              .map((i) => ({ code: i.code, value: selectedRecord.results?.[i.code] ?? '' }));
            if (rows.length === 0) return null;
            return (
              <div key={g.key} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
                <SectionHeader icon={g.icon} title={g.label} subtitle={`${rows.length} รายการ`} />
                <Table columns={resultColumns} rows={rows} rowKey={(r) => r.code} emptyMessage='ไม่มีรายการ' />
              </div>
            );
          })}

          <SubCard>
            <SectionHeader icon='stethoscope' title='ผลการตรวจร่างกาย' />
            <div className='flex items-start flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <ColorfulBadge
                style={selectedRecord.physical?.overall === 'abnormal' ? 'red' : 'green'}
                size='small'
                hierarchy='secondary'
              >
                {selectedRecord.physical?.overall === 'abnormal' ? 'ผิดปกติ' : 'ปกติ'}
              </ColorfulBadge>
              <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)' }}>
                {selectedRecord.physical?.detail || 'ไม่มีรายละเอียดเพิ่มเติม'}
              </span>
            </div>
          </SubCard>

          {screeningSummary.length > 0 ? (
            <SubCard tone='info'>
              <SectionHeader
                icon='checklist'
                title='แบบคัดกรองที่บันทึกในครั้งนี้'
                subtitle='ผลที่เป็นข้อมูลลับ (HIV / สุขภาพจิตเสี่ยง) ถูกปิดบังในสรุปนี้'
              />
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                {screeningSummary.map((s) => (
                  <ColorfulBadge key={s} style='indigo' size='small' hierarchy='secondary'>{s}</ColorfulBadge>
                ))}
              </div>
            </SubCard>
          ) : null}

          <SubCard tone={selectedRecord.summaryVerdict === 'abnormal' ? 'warning' : 'success'}>
            <SectionHeader icon='fact_check' title='สรุปผลและข้อแนะนำ' />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', whiteSpace: 'pre-wrap' }}>
              {selectedRecord.summaryText || 'ไม่มีสรุปผล'}
            </span>
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-content-secondary, #636B72)', whiteSpace: 'pre-wrap' }}>
              {selectedRecord.adviceText || 'ไม่มีข้อแนะนำ'}
            </span>
          </SubCard>

          <CheckupAuditBar record={selectedRecord} />
        </PageCard>
      </>
    );
  };

  if (visits.length === 0) {
    return (
      <QueuePageShell
        activeKey='checkup'
        breadcrumb={breadcrumb}
        title={`ผลตรวจย้อนหลัง — HN ${hn}`}
        onBack={() => history.push('/checkup')}
        backLabel='กลับไปคิวตรวจสุขภาพ'
      >
        <PageBody>
          <PageCard>
            <EmptyState
              icon='history'
              title='ยังไม่มีประวัติการตรวจสุขภาพของผู้รับบริการรายนี้'
              subtitle={`HN ${hn} ยังไม่มีใบสั่งตรวจสุขภาพในระบบ — เปิดใบสั่งตรวจจากคิวหรือกลุ่มเป้าหมายก่อน`}
              actionLabel='ไปหน้ากลุ่มเป้าหมาย'
              onAction={() => history.push('/checkup/targets')}
            />
          </PageCard>
        </PageBody>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      activeKey='checkup'
      breadcrumb={breadcrumb}
      title={`ผลตรวจย้อนหลัง — ${patient.fullName} · HN ${hn}`}
      onBack={() => history.push('/checkup')}
      backLabel='กลับไปคิวตรวจสุขภาพ'
      actions={(
        <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
          <NeutralSubdueButton size='md' leadingIcon='print' onClick={() => { if (typeof window !== 'undefined') window.print(); }}>
            พิมพ์ประวัติการตรวจ
          </NeutralSubdueButton>
        </div>
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <PatientCard
        sticky
        showBack={false}
        patient={patient}
        title='ผลตรวจสุขภาพย้อนหลัง'
        tags={(
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
            <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{`ตรวจสุขภาพ ${visits.length} ครั้ง`}</ColorfulBadge>
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>{`สรุปผลแล้ว ${summarised.length} ครั้ง`}</ColorfulBadge>
            <ColorfulBadge style='indigo' size='small' hierarchy='secondary'>อ่านอย่างเดียว</ColorfulBadge>
          </div>
        )}
      />

      <PageBody>
        {activeTab === 'timeline' ? (
          <>
            <PageCard>
              <SectionHeader
                icon='history'
                title='ไทม์ไลน์การตรวจสุขภาพ'
                subtitle='ทุกครั้งที่มารับบริการในทุกโปรแกรม — คลิกแถวเพื่อดูรายละเอียดของครั้งนั้นแบบอ่านอย่างเดียว'
              />
              <Table
                columns={timelineColumns}
                rows={visits}
                rowKey={(r) => r.id}
                onRowClick={(r) => setSelectedIdx(visits.findIndex((v) => v.id === r.id))}
                stickyColCount={2}
                emptyMessage='ไม่พบประวัติการตรวจ'
              />
              {!canCompare ? (
                <NoticeBar tone='info' icon='info'>
                  ผู้รับบริการมีผลตรวจที่สรุปแล้วเพียง {summarised.length} ครั้ง — แท็บ "เปรียบเทียบข้ามครั้ง" จะปรากฏเมื่อมีผลตรวจที่สรุปแล้วตั้งแต่ 2 ครั้งขึ้นไป
                </NoticeBar>
              ) : null}
            </PageCard>
            {renderDetail()}
          </>
        ) : null}

        {activeTab === 'compare' && canCompare ? (
          <PageCard>
            <SectionHeader
              icon='compare_arrows'
              title='เปรียบเทียบผลตรวจข้ามครั้ง'
              subtitle='คอลัมน์แรกถูกตรึงไว้ — เลื่อนแนวนอนเพื่อดูครั้งอื่น ๆ · คลิกค่าเพื่อเปิดรายละเอียดของครั้งนั้น'
              trailing={(
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  <ColorfulBadge style='green' size='small' hierarchy='secondary'>ปกติ</ColorfulBadge>
                  <ColorfulBadge style='red' size='small' hierarchy='secondary'>ผิดปกติ</ColorfulBadge>
                </span>
              )}
            />
            <CheckupCompareTable
              comparison={comparison}
              onSelectVisit={(idx) => {
                const target = comparison.visits[idx];
                const pos = visits.findIndex((v) => v.id === target.id);
                if (pos >= 0) { setSelectedIdx(pos); setActiveTab('timeline'); }
              }}
            />
            <SubCard tone='brand'>
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
                <Icon name='info' size={16} />
                <span className='flex-1 min-w-0' style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)' }}>
                  ลูกศรเทียบค่าครั้งแรกกับครั้งล่าสุดของแต่ละรายการ — "ดีขึ้น/แย่ลง" คำนวณจากทิศทางที่ดีของรายการนั้น
                  (เช่น HDL และ eGFR ยิ่งสูงยิ่งดี ส่วน LDL น้ำตาล และความดัน ยิ่งต่ำยิ่งดี)
                </span>
              </div>
            </SubCard>
          </PageCard>
        ) : null}

        {activeTab === 'trend' ? (
          <PageCard>
            <SectionHeader
              icon='monitoring'
              title='กราฟแนวโน้มผลตรวจสุขภาพ'
              subtitle='น้ำหนัก / BMI / รอบเอว · ความดันโลหิต · น้ำตาล · ไขมัน · ไต-ตับ'
            />
            <CheckupTrendSection
              visits={comparison.visits}
              records={comparison.records}
              selectedIdx={comparison.visits.findIndex((v) => v.id === selected?.id)}
              onSelect={(idx) => {
                const target = comparison.visits[idx];
                const pos = visits.findIndex((v) => v.id === target.id);
                if (pos >= 0) { setSelectedIdx(pos); setActiveTab('timeline'); }
              }}
            />
            <span style={{ fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-content-tertiary, #858C92)' }}>
              {`ข้อมูลจากผลตรวจที่สรุปแล้ว ${summarised.length} ครั้ง · อัปเดตล่าสุด ${formatThaiDateTime(records[records.length - 1]?.savedAt)}`}
            </span>
          </PageCard>
        ) : null}
      </PageBody>
    </QueuePageShell>
  );
};

export default CheckupHistoryPage;
