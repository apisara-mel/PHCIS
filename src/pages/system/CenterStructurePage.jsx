import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import SuccessToast from '@/components/toast/SuccessToast';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import CenterStructurePopup from '@/pages/system/CenterStructurePopup';
import Popup from '@/components/popup/Popup';
import BrandSubdueIconButton from '@/components/button/BrandSubdueIconButton';
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
  /* รูปแบบที่กำลังจะลบ — null = ไม่มี dialog เปิดอยู่ */
  const [removing, setRemoving] = useState(null);
  /* popup สร้างรูปแบบใหม่ — เปิดจากปุ่มในหน้านี้ทั้งสามจุด */
  const [creating, setCreating] = useState(false);
  /* ชื่อรูปแบบที่เพิ่งสร้างสำเร็จ — ใช้เปิด dialog ยืนยันผล (25 ส.ค. 2569) */
  const [createdName, setCreatedName] = useState(null);
  /* รูปแบบที่กำลังแก้ไขใน popup — null = ไม่ได้เปิดอยู่ */
  const [editingTpl, setEditingTpl] = useState(null);
  /* รูปแบบที่กำลังเปิดดูรายชื่อศูนย์ — คอลัมน์ "ศูนย์ที่ใช้รูปแบบนี้" เดิมยาว
     จนตารางอ่านไม่ได้ (บางรูปแบบผูก 28 ศูนย์) จึงย้ายมาเป็นปุ่มดูใน
     คอลัมน์การดำเนินการแทน (25 ส.ค. 2569) */
  const [viewing, setViewing] = useState(null);

  const refresh = useCallback(() => setRows(readStructures()), []);
  useEffect(() => { refresh(); }, [refresh]);

  /* แท็บ "ทั้งหมด / ร่าง" — ร่างคือรูปแบบที่ยังบันทึกไม่ครบ ไม่ควรปนกับรูปแบบ
     ที่พร้อมใช้ในทะเบียนเดียวกัน (26 ส.ค. 2569 มติผู้ใช้) */
  const [tab, setTab] = useState('all');

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

  /* แท็บ "ทั้งหมด" ไม่รวมร่าง — ไม่งั้นร่างจะโผล่สองที่และนับซ้ำ */
  const draftRows = useMemo(() => rows.filter((t) => t.draft), [rows]);
  const readyRows = useMemo(() => rows.filter((t) => !t.draft), [rows]);
  const visibleRows = tab === 'draft' ? draftRows : readyRows;

  /* แท็บขีดเส้นใต้ใต้การ์ดสรุป — ใช้ชุดเดียวกับหน้าศูนย์บริการ/หน้าอื่น
     (QueuePageShell เรนเดอร์ให้) ไม่ใช่ pill ลอยอยู่ในการ์ด (26 ส.ค. 2569) */
  const tabDefs = [
    { key: 'all', label: 'ทั้งหมด', icon: 'account_tree', count: readyRows.length },
    { key: 'draft', label: 'บันทึกร่าง', icon: 'save', count: draftRows.length },
  ];

  const summaryCards = useMemo(() => [
    { key: 'total', icon: 'account_tree', color: 'info', value: String(totals.templates), label: 'รูปแบบโครงสร้างทั้งหมด' },
    { key: 'clinics', icon: 'medical_services', color: 'positive', value: String(totals.clinics), label: 'คลินิกในทุกรูปแบบ' },
    { key: 'applied', icon: 'domain', color: 'brand', value: String(totals.applied), label: 'ศูนย์ที่ผูกรูปแบบแล้ว' },
  ], [totals]);

  const goCreate = () => setCreating(true);
  const goEdit = (row) => setEditingTpl(row);

  const handleDuplicate = (row) => {
    const copy = duplicateStructureTemplate(row);
    persist([...rows, copy]);
    showToast(`ทำสำเนา "${copy.name}" แล้ว`);
  };

  /* ลบต้องยืนยันก่อน — รูปแบบหนึ่งผูกกับหลายศูนย์ ลบพลาดแล้วต้องตั้งใหม่ทั้งชุด */
  const confirmDelete = () => {
    if (!removing) return;
    persist(rows.filter((r) => r.id !== removing.id));
    showToast(`ลบ "${removing.name}" แล้ว`);
    setRemoving(null);
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
      key: 'action',
      header: 'การดำเนินการ',
      minWidth: 320,
      render: (row) => (
        <span
          className='inline-flex items-center'
          style={{ gap: 'var(--dim-space-200)' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role='presentation'
        >
          {/* กางปุ่มออกมาให้เห็นทั้งหมด ไม่ซ่อนใต้เมนู ⋮ (25 ส.ค. 2569) —
              มีแค่ 3 การกระทำ ซ่อนไว้แล้วต้องคลิกสองครั้งกว่าจะถึง */}
          <BrandSubdueIconButton
            icon='visibility'
            variant='outline'
            size='sm'
            aria-label={`ดูศูนย์ที่ใช้ ${row.name}`}
            title={`ศูนย์ที่ใช้รูปแบบนี้ (${(row.appliedCenters || []).length})`}
            onClick={() => setViewing(row)}
          />
          <NeutralSubdueButton leadingIcon='edit' size='sm' onClick={() => goEdit(row)}>
            แก้ไข
          </NeutralSubdueButton>
          <NeutralSubdueButton leadingIcon='content_copy' size='sm' onClick={() => handleDuplicate(row)}>
            ทำสำเนา
          </NeutralSubdueButton>
          <DangerSubdueButton leadingIcon='delete' variant='ghost' size='sm' onClick={() => setRemoving(row)}>
            ลบ
          </DangerSubdueButton>
        </span>
      ),
    },
  ], [rows]);

  const hasRows = rows.length > 0;

  return (
    <QueuePageShell
      activeKey='system-structures'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-structures'
      brandTitle='จัดการระบบ'
      breadcrumb={breadcrumb}
      title='รูปแบบโครงสร้างศูนย์'
      /* การ์ดสรุปอยู่ใน headerInfo เพื่อให้ใช้พื้นหลังเดียวกับแถบหัวข้อ+ปุ่ม
         เหมือนหน้าอื่น (ศูนย์บริการ · วันหยุดประจำปี · สิทธิการเข้าถึง) —
         ของเดิมอยู่ในเนื้อหน้าเลยตกไปอยู่บนพื้นเขียวจาง (25 ส.ค. 2569) */
      headerInfo={hasRows ? (
        <section className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {summaryCards.map((c) => (
              <SummaryCard key={c.key} card={c} variant='panel' />
            ))}
          </div>
        </section>
      ) : null}
      actions={hasRows ? (
        <BrandButton variant='fill' size='md' leadingIcon='add' onClick={goCreate}>
          สร้างรูปแบบโครงสร้างศูนย์ใหม่
        </BrandButton>
      ) : null}
      tabs={hasRows ? tabDefs : undefined}
      activeTab={tab}
      onTabChange={setTab}
    >
      <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
        {hasRows ? (
          <>
            <section className='w-full flex flex-col' style={{ ...CARD, padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
              <span style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                ตั้งรูปแบบโครงสร้างศูนย์ เพื่อเลือกใช้ซ้ำตอนเพิ่มศูนย์บริการ
              </span>
              {/* rowKey ต้องเป็นฟังก์ชัน — ของเดิมส่ง string 'id' ซึ่ง Table เรียก
                  เป็นฟังก์ชัน (rowKey is not a function) แต่ไม่เคยพังเพราะตาราง
                  ว่างมาตลอด เพิ่งโผล่ตอนมีข้อมูลตัวอย่าง (25 ส.ค. 2569) */}
              <Table
                columns={columns}
                rows={visibleRows}
                rowKey={(row) => row.id}
                onRowClick={goEdit}
                emptyMessage={tab === 'draft' ? 'ยังไม่มีรูปแบบที่เป็นร่าง' : 'ยังไม่มีรูปแบบที่พร้อมใช้'}
              />
              <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={goCreate}>
                สร้างรูปแบบโครงสร้างศูนย์ใหม่
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
              สร้างรูปแบบโครงสร้างศูนย์ใหม่
            </BrandButton>
          </section>
        )}
      </div>

      {/* mount ใหม่ทุกครั้งที่เปิด ฟอร์มจะได้เริ่มจากโครงสร้างตั้งต้นเสมอ */}
      {creating ? (
        <CenterStructurePopup
          open
          onClose={() => setCreating(false)}
          onSaved={() => {
            const list = readStructures();
            refresh();
            setCreatedName(list[list.length - 1]?.name || 'รูปแบบใหม่');
          }}
        />
      ) : null}

      <AlertDialog
        open={!!createdName}
        onClose={() => setCreatedName(null)}
        type='success'
        alignment='center'
        title='สร้างรูปแบบโครงสร้างศูนย์สำเร็จ'
        description={createdName
          ? `"${createdName}" ถูกบันทึกลงทะเบียนแล้ว — เลือกใช้ได้ตอนเพิ่มศูนย์บริการ`
          : ''}
        confirmLabel='เรียบร้อย'
        showCancel={false}
        onConfirm={() => setCreatedName(null)}
      />

      {/* แก้ไขก็เปิดเป็น popup เหมือนกัน — key = id ให้ฟอร์ม remount ตามรูปแบบที่เลือก */}
      {editingTpl ? (
        <CenterStructurePopup
          key={editingTpl.id}
          open
          template={editingTpl}
          onClose={() => setEditingTpl(null)}
          onSaved={() => { refresh(); showToast('บันทึกรูปแบบโครงสร้างศูนย์แล้ว'); }}
        />
      ) : null}

      <Popup
        open={!!viewing}
        onClose={() => setViewing(null)}
        size='default'
        title='ศูนย์ที่ใช้รูปแบบนี้'
        subtitle={viewing
          ? `${viewing.name} · ${(viewing.appliedCenters || []).length} ศูนย์`
          : undefined}
        secondaryAction={{ label: 'ปิด', onClick: () => setViewing(null) }}
      >
        {(viewing?.appliedCenters || []).length ? (
          /* ข้อความธรรมดา 2 คอลัมน์ — badge เขียวเรียงกัน 28 อันอ่านยากกว่า
             และไม่ได้สื่อสถานะอะไร (25 ส.ค. 2569) */
          <div
            className='w-full'
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              columnGap: 'var(--dim-space-600)',
              rowGap: 'var(--dim-space-200)',
            }}
          >
            {(viewing.appliedCenters || []).map((id) => (
              <span key={id} style={TEXT_CELL}>{centerLabelOf(id)}</span>
            ))}
          </div>
        ) : (
          <span style={SUBTEXT_CELL}>ยังไม่ได้ผูกกับศูนย์ใด</span>
        )}
      </Popup>

      <AlertDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        type='warning'
        alignment='center'
        title='ลบรูปแบบโครงสร้างนี้?'
        description={removing ? (
          <>
            {`"${removing.name}" จะถูกลบออกจากทะเบียน`}
            <br />
            {(removing.appliedCenters || []).length
              ? `ศูนย์บริการ ${(removing.appliedCenters || []).length} แห่งที่ผูกรูปแบบนี้ไว้จะไม่มีรูปแบบอ้างอิง — โครงสร้างที่บันทึกไว้ในแต่ละศูนย์ยังอยู่ตามเดิม`
              : 'รูปแบบนี้ยังไม่ได้ผูกกับศูนย์ใด'}
          </>
        ) : ''}
        confirmLabel='ลบรูปแบบ'
        cancelLabel='ยกเลิก'
        onConfirm={confirmDelete}
      />

      {/* toast ของ DS โผล่ด้านบนจอเหมือนหน้าอื่น (Figma 139:20246) —
          ของเดิมเป็นกล่องลอยมุมขวาล่างที่ทำเองเฉพาะหน้านี้ (25 ส.ค. 2569) */}
      <SuccessToast
        open={!!toast}
        message={toast || ''}
        onClose={() => setToast(null)}
      />
    </QueuePageShell>
  );
}
