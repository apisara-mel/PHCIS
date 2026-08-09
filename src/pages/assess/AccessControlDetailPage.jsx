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
} from '@/data/accessControlStore';

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
      key: 'group',
      icon: 'face',
      color: 'info',
      value: record.groupPolicy,
      label: 'Group Policy',
    },
    {
      key: 'sub',
      icon: 'face',
      color: 'positive',
      value: record.subBranch,
      label: 'สาขาย่อย',
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
