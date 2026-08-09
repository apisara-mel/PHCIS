import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import SmallAlert from '@/components/alert/SmallAlert';
import RowMenu from '@/components/overflow/RowActionMenu';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { readCenters } from '@/data/centerStore';
import {
  readStructures,
  writeStructures,
  countStructure,
  summarizeStructure,
  duplicateStructureTemplate,
} from '@/data/centerStructure';

/* ระบบจัดการระบบ · รูปแบบโครงสร้างศูนย์
   ══════════════════════════════════════════════════════════════════════
   ทะเบียน "รูปแบบ" ของโครงสร้างภายในศูนย์ (แผนก/คลินิก → ห้องตรวจ/เตียง)
   ตั้งไว้ครั้งเดียวแล้วเลือกใช้ซ้ำได้ตอนเพิ่มศูนย์บริการ (step แผนกและคลินิก)
   หรือผูกกับหลายศูนย์พร้อมกันผ่าน `appliedCenters`.

   หน้านี้เป็นทะเบียนอย่างเดียว — ตัวแก้ไขจริงอยู่ที่ CenterStructureEditor
   ซึ่งใช้ร่วมกับหน้าเพิ่มศูนย์บริการ จะได้ไม่มี UI แก้โครงสร้างสองชุด. */

const breadcrumb = ['จัดการระบบ', 'รูปแบบโครงสร้างศูนย์'];

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
  lineHeight: 1.5,
};

export default function CenterStructurePage() {
  const navigate = useHistory();
  const [rows, setRows] = useState(() => readStructures());
  const [toast, setToast] = useState(null);

  const refresh = useCallback(() => setRows(readStructures()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const persist = useCallback((next) => {
    writeStructures(next);
    setRows(next);
  }, []);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  /* map รหัสศูนย์ → ชื่อ เพื่อโชว์ว่ารูปแบบนี้ถูกใช้ที่ศูนย์ไหนบ้าง */
  const centerLabelOf = useMemo(() => {
    const all = readCenters();
    return (key) => {
      const c = all.find((x) => x.hcode9 === key || x.code === key);
      return c ? (c.name || key) : key;
    };
  }, []);

  const totals = useMemo(() => rows.reduce((acc, t) => {
    const c = countStructure(t.units || []);
    return {
      templates: acc.templates + 1,
      clinics: acc.clinics + c.clinics,
      applied: acc.applied + (t.appliedCenters || []).length,
    };
  }, { templates: 0, clinics: 0, applied: 0 }), [rows]);

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'account_tree', color: 'info', value: String(totals.templates), label: 'รูปแบบโครงสร้างทั้งหมด' },
    { key: 'clinics', icon: 'medical_services', color: 'positive', value: String(totals.clinics), label: 'คลินิกในทุกรูปแบบ' },
    { key: 'applied', icon: 'domain', value: String(totals.applied), label: 'ศูนย์ที่ผูกรูปแบบแล้ว' },
  ], [totals]);

  const goCreate = () => navigate.push('/admin/structures/new');
  const goEdit = (row) => navigate.push(`/admin/structures/${row.id}/edit`);

  const handleDuplicate = (row) => {
    const copy = duplicateStructureTemplate(row);
    persist([...rows, copy]);
    showToast(`ทำสำเนา "${copy.name}" แล้ว`);
  };

  const handleDelete = (row) => {
    persist(rows.filter((r) => r.id !== row.id));
    showToast(`ลบ "${row.name}" แล้ว`);
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'ชื่อรูปแบบ',
      sortable: true,
      minWidth: 220,
      render: (row) => (
        <div className='flex flex-col'>
          <span style={TEXT_CELL}>{row.name}</span>
          {row.draft ? <span style={SUBTEXT_CELL}>ร่าง</span> : null}
        </div>
      ),
    },
    {
      key: 'summary',
      header: 'โครงสร้าง',
      minWidth: 280,
      render: (row) => <span style={TEXT_CELL}>{summarizeStructure(row.units || [])}</span>,
    },
    {
      key: 'applied',
      header: 'ศูนย์ที่ใช้รูปแบบนี้',
      minWidth: 220,
      render: (row) => {
        const ids = row.appliedCenters || [];
        if (!ids.length) return <span style={SUBTEXT_CELL}>ยังไม่ได้ผูกกับศูนย์ใด</span>;
        return (
          <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
            {ids.map((id) => (
              <ColorfulBadge key={id} style='green' width='hug'>{centerLabelOf(id)}</ColorfulBadge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      minWidth: 148,
      render: (row) => (
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-200)' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role='presentation'
        >
          <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => goEdit(row)}>
            แก้ไข
          </NeutralSubdueButton>
          <RowMenu
            ariaLabel={`ตัวเลือก ${row.name}`}
            items={[
              { key: 'dup', icon: 'content_copy', label: 'ทำสำเนารูปแบบ', onClick: () => handleDuplicate(row) },
              { key: 'del', icon: 'delete', label: 'ลบรูปแบบ', danger: true, onClick: () => handleDelete(row) },
            ]}
          />
        </span>
      ),
    },
  ], [rows, centerLabelOf]);

  const hasRows = rows.length > 0;

  return (
    <QueuePageShell
      activeKey='system-structures'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-structures'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='รูปแบบโครงสร้างศูนย์'
      actions={hasRows ? (
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={goCreate}>
          สร้างรูปแบบใหม่
        </BrandButton>
      ) : null}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {hasRows ? (
          <>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              {summaryCards.map((c) => (
                <div key={c.key} style={{ flex: '1 1 240px', minWidth: 220 }}>
                  <SummaryCard {...c} />
                </div>
              ))}
            </div>

            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                ตั้งรูปแบบ แผนก/คลินิก และห้องตรวจ/เตียง ไว้ครั้งเดียว แล้วเลือกใช้ซ้ำได้ตอนเพิ่มศูนย์บริการ
              </span>
              <Table columns={columns} rows={rows} rowKey='id' onRowClick={goEdit} />
              <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={goCreate}>
                สร้างรูปแบบโครงสร้างใหม่
              </BrandDashedAddButton>
            </section>
          </>
        ) : (
          <section
            className='w-full flex flex-col items-center justify-center'
            style={{ ...CARD, padding: 'var(--dim-space-900, 40px)', gap: 'var(--dim-space-400)', minHeight: 360 }}
          >
            <span style={{ color: 'var(--text-brandPrimary-default)', fontFamily: 'var(--type-family-heading-graphic2)', fontSize: 'var(--type-size-base)' }}>
              ยังไม่มีรูปแบบโครงสร้างศูนย์
            </span>
            <span style={{ ...SUBTEXT_CELL, fontSize: 'var(--type-size-sm)', textAlign: 'center', maxWidth: 480 }}>
              สร้างรูปแบบ แผนก/คลินิก และห้องตรวจ/เตียง เก็บไว้ แล้วนำไปใช้ตอนเพิ่มศูนย์บริการได้เลย
              โดยไม่ต้องตั้งค่าใหม่ทุกศูนย์
            </span>
            <BrandButton variant='fill' size='md' leadingIcon='add' onClick={goCreate}>
              สร้างรูปแบบใหม่
            </BrandButton>
          </section>
        )}
      </div>

      {toast ? (
        <div style={{ position: 'fixed', right: 24, bottom: 96, zIndex: 1400 }}>
          <SmallAlert type='success' title={toast} />
        </div>
      ) : null}
    </QueuePageShell>
  );
}
