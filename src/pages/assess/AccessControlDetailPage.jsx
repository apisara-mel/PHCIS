import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Topic from '@/components/topic/Topic';
import { HeaderCell, DataCell, TableRow } from '@/components/table/Table';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  PHCIS_MODULES,
  CONSENT_MODULES,
  PERM_NONE,
  PERM_VIEW,
  PERM_EDIT,
  findAccessControl,
  latestVersion,
  formatVersion,
  APPROVAL_META,
  APPROVAL_DRAFT,
  APPROVAL_APPROVED,
  isAccessEffective,
  isWithinDailyWindow,
  formatDailyWindow,
  usersHoldingTemplate,
  dataScopeLabel,
  PII_MASKED,
} from '@/data/accessControlStore';
import { readAssessUsers, fullName } from '@/data/assessUserStore';

/* PHCIS | Assess-control — Access rights detail (Figma 4D3nTx53 · 17:32686). */

const breadcrumb = ['สิทธิการเข้าถึง'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const TABLE_FRAME = {
  border: 'var(--dim-stroke-100) solid var(--border-table-default)',
  borderRadius: 'var(--dim-radius-400)',
  overflow: 'hidden',
};

const CELL_TEXT = {
  color: 'var(--text-neutral-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-regular)',
  lineHeight: 1.5,
};

const DATA_CELL_OFF = {
  showCheckbox: false,
  showProfile: false,
  showTextGroup: false,
  showText: false,
  showSubtext: false,
  showStepper: false,
  showInputField: false,
  showSelect: false,
  showBadge: false,
  showSwitch: false,
  showButton1: false,
  showButton2: false,
  showButton3: false,
};

const PERM_COL_W = 128;

const PERM_BADGE = {
  [PERM_NONE]: { style: 'red', label: 'ไม่มีสิทธิ' },
  [PERM_VIEW]: { style: 'blue', label: 'มีสิทธิดู' },
  [PERM_EDIT]: { style: 'teal', label: 'มีสิทธิแก้ไข' },
};

function contextCards(record) {
  return [
    {
      key: 'center',
      icon: 'location_on',
      color: 'positive',
      value: record.center,
      label: 'ศูนย์บริการ',
    },
    {
      key: 'activity',
      icon: 'face',
      color: 'info',
      value: record.activity,
      label: 'กิจกรรม',
    },
    {
      key: 'sub',
      icon: 'face',
      color: 'positive',
      value: record.subActivity,
      label: 'กิจกรรมย่อย',
    },
    {
      key: 'dept',
      icon: 'face',
      color: 'info',
      value: record.department,
      label: 'แผนก',
    },
    /* ไม่มีการ์ด "ตำแหน่ง" — แม่แบบสิทธิไม่ผูกตำแหน่งแล้ว ตำแหน่งไปอยู่ที่
       ขั้นตอนเพิ่มบุคลากรแทน. แสดงเวอร์ชันของแม่แบบตรงนี้แทน. */
    {
      key: 'version',
      icon: 'history',
      value: formatVersion(latestVersion(record)),
      label: 'เวอร์ชันแม่แบบ',
      tileBg: 'var(--color-lavender-50, #F7F4FF)',
      iconInk: 'var(--text-statussummarycard-lavender-number, #8A6CD8)',
    },
  ];
}

/* ช่องข้อมูลอ่านอย่างเดียวในการ์ดธรรมาภิบาลสิทธิ์ */
function GovField({ label, text, children }) {
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)', flex: '1 1 200px' }}>
      <span style={{
        color: 'var(--text-content-tertiary)',
        fontFamily: 'var(--type-family-body)',
        fontSize: 'var(--type-size-xs)',
        lineHeight: 1.5,
      }}
      >
        {label}
      </span>
      {children || <span style={CELL_TEXT}>{text || '—'}</span>}
    </div>
  );
}

function PermBadge({ level }) {
  const meta = PERM_BADGE[level] || PERM_BADGE[PERM_NONE];
  return (
    <ColorfulBadge style={meta.style} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
}

function ReadonlyPermTable({ title, modules, permissions }) {
  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
      <Topic
        hierarchy='tertiary'
        title={title}
        showSubText={false}
        showBadge={false}
        showChevron={false}
        showLeadingIcon={false}
        showSuccess={false}
      />
      <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
        <div style={{ minWidth: 360 }}>
          <div className='flex w-full'>
            <HeaderCell
              title='ระบบ'
              showSubtext={false}
              showSorting
              style={{ flex: '1 1 0', minWidth: 0, borderTopLeftRadius: 'var(--dim-radius-400)' }}
            />
            <HeaderCell
              title='สิทธิการเข้าถึง'
              showSubtext={false}
              showSorting
              style={{ width: PERM_COL_W, flexShrink: 0, borderTopRightRadius: 'var(--dim-radius-400)' }}
            />
          </div>
          {modules.map((mod, rowIdx) => {
            const isLast = rowIdx === modules.length - 1;
            const rowStyle = isLast ? { borderBottom: 'none' } : {};
            return (
              <TableRow key={mod.key}>
                <DataCell
                  {...DATA_CELL_OFF}
                  style={{ flex: '1 1 0', minWidth: 0, ...rowStyle }}
                >
                  <span style={CELL_TEXT}>{mod.label}</span>
                </DataCell>
                <DataCell
                  {...DATA_CELL_OFF}
                  style={{ width: PERM_COL_W, flexShrink: 0, ...rowStyle }}
                >
                  <PermBadge level={permissions[mod.key] || PERM_NONE} />
                </DataCell>
              </TableRow>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function AccessControlDetailPage() {
  const navigate = useHistory();
  const { id } = useParams();
  const record = useMemo(() => findAccessControl(id), [id]);
  const cards = useMemo(() => (record ? contextCards(record) : []), [record]);
  /* บุคลากรที่เข้าเงื่อนไข ABAC ของแม่แบบนี้ */
  const holders = useMemo(
    () => (record ? usersHoldingTemplate(record, readAssessUsers()) : []),
    [record],
  );

  if (!record) {
    return (
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='สิทธิการเข้าถึง'
        onBack={() => navigate.push('/assess/access-control')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบสิทธิการเข้าถึง</div>
      </QueuePageShell>
    );
  }

  return (
    <QueuePageShell
      activeKey='assess-access-control'
      sidebarItems={ASSESS_NAV}
      sidebarFallbackKey='assess-access-control'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='สิทธิการเข้าถึง'
      onBack={() => navigate.push('/assess/access-control')}
    >
      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-300)' }}
      >
        {/* Context row — Status Summary Card × 5 (Figma 17:30409) */}
        <section className='flex flex-col w-full' style={CARD}>
          <div className='flex flex-wrap w-full items-stretch' style={{ gap: 'var(--dim-space-400)' }}>
            {cards.map((card) => (
              <SummaryCard key={card.key} card={card} />
            ))}
          </div>
        </section>

        {/* ธรรมาภิบาลสิทธิ์ — สถานะอนุมัติ · ขอบเขตข้อมูล · ช่วงเวลาที่มีผล
            (มติ คทง.13 §1.3/§2.3 + คทง.2/3/4/10/11) */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <Topic
            hierarchy='primary'
            title='การอนุมัติและขอบเขตข้อมูล'
            subText={isAccessEffective(record)
              ? 'สิทธิ์นี้ได้รับอนุมัติและมีผลบังคับใช้อยู่'
              : 'สิทธิ์นี้ยังไม่มีผลบังคับใช้ (รออนุมัติ หรือยังไม่ถึง/พ้นช่วงเวลา)'}
            leadingIcon='shield_person'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-600)' }}>
            <GovField label='สถานะอนุมัติ'>
              <ColorfulBadge
                style={(APPROVAL_META[record.approvalStatus || APPROVAL_DRAFT] || APPROVAL_META[APPROVAL_DRAFT]).badge}
                size='small'
                hierarchy='secondary'
                width='hug'
              >
                {(APPROVAL_META[record.approvalStatus || APPROVAL_DRAFT] || APPROVAL_META[APPROVAL_DRAFT]).label}
              </ColorfulBadge>
            </GovField>
            <GovField label='ผู้อนุมัติ' text={record.approvalStatus === APPROVAL_APPROVED ? (record.approvedBy || '—') : '—'} />
            <GovField
              label='วันที่อนุมัติ'
              text={record.approvedAt ? new Date(record.approvedAt).toLocaleDateString('th-TH') : '—'}
            />
            <GovField label='ขอบเขตข้อมูลที่มองเห็น' text={dataScopeLabel(record.dataScope)} />
            <GovField
              label='ข้อมูลระบุตัวตน (PII)'
              text={record.piiVisibility === PII_MASKED ? 'ปิดบัง — ดูสรุป/รหัสนิรนาม' : 'เห็นข้อมูลระบุตัวตน'}
            />
            <GovField
              label='ช่วงเวลาที่มีผล'
              text={record.effectiveFrom || record.effectiveTo
                ? `${record.effectiveFrom || 'ทันที'} – ${record.effectiveTo || 'ไม่กำหนด'}`
                : 'ไม่กำหนด'}
            />
            {/* หน้าต่างเวลาเข้าใช้งานรายวัน (Figma "PHCIS | History and Access") */}
            <GovField label='เวลาเข้าใช้งาน (รายวัน)'>
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={CELL_TEXT}>{formatDailyWindow(record)}</span>
                {record.dailyFrom || record.dailyTo ? (
                  <ColorfulBadge
                    style={isWithinDailyWindow(record) ? 'green' : 'grey'}
                    size='small'
                    hierarchy='secondary'
                    width='hug'
                  >
                    {isWithinDailyWindow(record) ? 'อยู่ในเวลา' : 'นอกเวลาเข้าใช้'}
                  </ColorfulBadge>
                ) : null}
              </div>
            </GovField>
            {record.approvalNote ? <GovField label='เหตุผล/บันทึกถึงผู้อนุมัติ' text={record.approvalNote} /> : null}
          </div>
        </section>

        {/* ผู้ถือสิทธิ์ตามแม่แบบนี้ — ABAC จับคู่จาก assignment ของบุคลากรเอง
            (ศูนย์ · กิจกรรม · กิจกรรมย่อย · แผนก) ไม่ต้องผูกรายคน */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <Topic
            hierarchy='primary'
            title={`ผู้ถือสิทธิ์นี้ (${holders.length} คน)`}
            subText='ระบบจับคู่ให้อัตโนมัติจากศูนย์/กิจกรรม/แผนกที่บุคลากรปฏิบัติงาน — ไม่ต้องผูกทีละคน'
            leadingIcon='group'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          {holders.length === 0 ? (
            <span style={CELL_TEXT}>
              ยังไม่มีบุคลากรที่เข้าเงื่อนไขแม่แบบนี้ — ตรวจว่ามีผู้ปฏิบัติงานตรงกับ
              ศูนย์/กิจกรรม/แผนกที่กำหนดไว้ด้านบนหรือยัง
            </span>
          ) : (
            <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
              {holders.map(({ user, assignments }) => (
                <div
                  key={user.id}
                  className='flex flex-wrap items-baseline w-full'
                  style={{ gap: 'var(--dim-space-300)' }}
                >
                  <span style={{ ...CELL_TEXT, minWidth: 180 }}>{fullName(user)}</span>
                  <span style={{ ...CELL_TEXT, color: 'var(--text-content-tertiary)' }}>
                    {assignments
                      .map((a) => [a.center, a.activity, a.department].filter(Boolean).join(' · '))
                      .join('  |  ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Permissions card (Figma 17:29411) */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-600)' }}>
          <Topic
            hierarchy='primary'
            title='สิทธิ์เข้าถึงระบบ'
            subText='เลือกระดับการเข้าถึงของแต่ละระบบ'
            leadingIcon='settings'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          <ReadonlyPermTable
            title='ระบบ PHCIS'
            modules={PHCIS_MODULES}
            permissions={record.permissions}
          />
          <ReadonlyPermTable
            title='ระบบจัดการความยินยอม'
            modules={CONSENT_MODULES}
            permissions={record.permissions}
          />
        </section>
      </div>
    </QueuePageShell>
  );
}
