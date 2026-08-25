import React, { useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Topic from '@/components/topic/Topic';
import { HeaderCell, DataCell, TableRow } from '@/components/table/Table';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  PERM_NONE,
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
import {
  ACCESS_SYSTEMS,
  PERM_META,
  PERM_MIXED,
  menuLeafKeys,
  systemLeafKeys,
  rollupLevel,
} from '@/data/accessMenuCatalog';

/* PHCIS | Assess-control — Access rights detail (Figma 4D3nTx53 · 17:32686). */

const breadcrumb = ['สิทธิ์การเข้าถึงระบบ'];

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



function contextCards(record) {
  return [
    {
      key: 'center',
      icon: 'location_on',
      color: 'positive',
      value: record.center,
      label: 'ศูนย์บริการ',
    },
    /* สิทธิ์กำหนดตาม ตำแหน่ง · บทบาท · แผนก (26 ส.ค. 2569 มติผู้ใช้) */
    {
      key: 'position',
      icon: 'badge',
      color: 'info',
      value: record.position,
      label: 'ตำแหน่ง',
    },
    {
      key: 'activity',
      icon: 'face',
      color: 'info',
      value: record.activity,
      label: 'บทบาท',
    },
    {
      key: 'sub',
      icon: 'face',
      color: 'positive',
      value: record.subActivity,
      label: 'บทบาทย่อย',
    },
    {
      key: 'dept',
      icon: 'face',
      color: 'info',
      value: record.department,
      label: 'แผนก',
    },
    /* เวอร์ชันของแม่แบบต่อท้ายชุดคุณลักษณะ */
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
  if (level === PERM_MIXED) {
    return (
      <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
        กำหนดรายเมนู
      </ColorfulBadge>
    );
  }
  const meta = PERM_META[level] || PERM_META[PERM_NONE];
  return (
    <ColorfulBadge style={meta.badge} size='small' hierarchy='secondary' width='hug'>
      {meta.label}
    </ColorfulBadge>
  );
}

/* ตารางสิทธิ์แบบอ่านอย่างเดียว — ระบบ → เมนู → เมนูย่อย ตามโครงเดียวกับ
   หน้าแก้ไข (26 ส.ค. 2569) แสดงเฉพาะรายการที่ "มีสิทธิ์" เพื่อไม่ให้ยาวเป็นร้อยแถว */
function ReadonlyPermTree({ permissions }) {
  const rows = [];
  ACCESS_SYSTEMS.forEach((system) => {
    const sysLeaves = systemLeafKeys(system);
    if (sysLeaves.every((k) => (permissions[k] || PERM_NONE) === PERM_NONE)) return;
    rows.push({ key: system.key, label: system.label, depth: 0, level: rollupLevel(permissions, sysLeaves) });
    system.menus.forEach((menu) => {
      const leaves = menuLeafKeys(menu);
      if (leaves.every((k) => (permissions[k] || PERM_NONE) === PERM_NONE)) return;
      const level = rollupLevel(permissions, leaves);
      rows.push({ key: menu.key, label: menu.label, depth: 1, level });
      /* เมนูย่อยแจกแจงเฉพาะตอนสิทธิ์ไม่เท่ากันทั้งเมนู */
      if (level === PERM_MIXED) {
        menu.children.forEach((sub) => {
          const subLevel = permissions[sub.key] || PERM_NONE;
          if (subLevel === PERM_NONE) return;
          rows.push({ key: sub.key, label: sub.label, depth: 2, level: subLevel });
        });
      }
    });
  });

  if (!rows.length) {
    return (
      <span style={{ ...CELL_TEXT, color: 'var(--text-content-tertiary)' }}>
        แม่แบบนี้ยังไม่ได้เปิดสิทธิ์เข้าถึงระบบใดเลย
      </span>
    );
  }

  return (
    <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
      <div style={{ minWidth: 360 }}>
        <div className='flex w-full'>
          <HeaderCell
            title='ระบบ / เมนู / เมนูย่อย'
            showSubtext={false}
            style={{ flex: '1 1 0', minWidth: 0, borderTopLeftRadius: 'var(--dim-radius-400)' }}
          />
          <HeaderCell
            title='ระดับสิทธิ์'
            showSubtext={false}
            style={{ width: PERM_COL_W, flexShrink: 0, borderTopRightRadius: 'var(--dim-radius-400)' }}
          />
        </div>
        {rows.map((row, i) => {
          const rowStyle = i === rows.length - 1 ? { borderBottom: 'none' } : {};
          return (
            <TableRow key={row.key}>
              <DataCell
                {...DATA_CELL_OFF}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  paddingLeft: `calc(var(--dim-space-400) + ${row.depth} * var(--dim-space-600))`,
                  background: row.depth === 0 ? 'var(--surface-brandPrimary-quaternary)' : undefined,
                  ...rowStyle,
                }}
              >
                <span
                  style={{
                    ...CELL_TEXT,
                    fontFamily: row.depth === 0
                      ? 'var(--type-family-heading-graphic2)'
                      : 'var(--type-family-body)',
                    color: row.depth === 0 ? 'var(--text-brandPrimary-default)' : CELL_TEXT.color,
                  }}
                >
                  {row.label}
                </span>
              </DataCell>
              <DataCell {...DATA_CELL_OFF} style={{ width: PERM_COL_W, flexShrink: 0, ...rowStyle }}>
                <PermBadge level={row.level} />
              </DataCell>
            </TableRow>
          );
        })}
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
        title='สิทธิ์การเข้าถึงระบบ'
        onBack={() => navigate.push('/assess/access-control')}
      >
        <div style={{ padding: 'var(--dim-space-600)' }}>ไม่พบสิทธิ์การเข้าถึงระบบ</div>
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
      title='สิทธิ์การเข้าถึงระบบ'
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
            (ศูนย์ · ตำแหน่ง · บทบาท · บทบาทย่อย · แผนก) ไม่ต้องผูกรายคน */}
        <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
          <Topic
            hierarchy='primary'
            title={`ผู้ถือสิทธิ์นี้ (${holders.length} คน)`}
            subText='ระบบจับคู่ให้อัตโนมัติจากศูนย์/ตำแหน่ง/บทบาท/แผนกที่บุคลากรปฏิบัติงาน — ไม่ต้องผูกทีละคน'
            leadingIcon='group'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          {holders.length === 0 ? (
            <span style={CELL_TEXT}>
              ยังไม่มีบุคลากรที่เข้าเงื่อนไขแม่แบบนี้ — ตรวจว่ามีผู้ปฏิบัติงานตรงกับ
              ศูนย์/ตำแหน่ง/บทบาท/แผนกที่กำหนดไว้ด้านบนหรือยัง
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
                      .map((a) => [a.center, a.position, a.activity, a.department].filter(Boolean).join(' · '))
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
            title='สิทธิ์การเข้าถึงระบบ'
            subText='ระดับการเข้าถึงรายเมนู — แสดงเฉพาะระบบ/เมนูที่เปิดสิทธิ์ไว้'
            leadingIcon='settings'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          <ReadonlyPermTree permissions={record.permissions} />
        </section>
      </div>
    </QueuePageShell>
  );
}
