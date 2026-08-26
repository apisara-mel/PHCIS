import React from 'react';
import { SummaryCard } from '@/components/layout/SummaryCardsBar';
import { Donut, DonutLegend, HBarList, VBars } from '@/components/graph/Charts';
import ColorfulBadge from '@/components/badge/ColorfulBadge';

/* ระบบจัดการระบบ · ตัวเรนเดอร์ widget ของเทมเพลตแดชบอร์ด
   ใช้ร่วมกันสองที่ให้ภาพตรงกันเป๊ะ:
     • ตัวอย่างในป๊อปอัปสร้างเทมเพลต (ระหว่างจัดวาง)
     • แดชบอร์ดจริงเมื่อเลือกเทมเพลตนั้น

   ทุก widget ผูก dataset ของจัดการระบบจริง — เปลี่ยน dataset แล้วภาพเปลี่ยนจริง
   Select ใน builder จึงไม่มี dead control (หลักเดียวกับฝั่งความยินยอม) */

const MUTED_XS = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};
const CELL_TEXT = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

const Empty = ({ children }) => <span style={MUTED_XS}>{children}</span>;

/** ctx = ผลลัพธ์ที่หน้าแดชบอร์ดคำนวณไว้แล้ว ส่งต่อมาให้ widget ใช้ซ้ำ
    ไม่คำนวณเองซ้ำสอง จะได้ไม่มีทางเห็นตัวเลขไม่ตรงกับการ์ด KPI ด้านบน */
export const buildSystemWidgetContext = (parts) => ({
  kpiRegistries: [],
  kpiUsage: [],
  approvalSegments: [],
  accessTotal: 0,
  usersByPosition: [],
  usersTotal: 0,
  usersByCenter: [],
  monthLabels: [],
  monthSeries: [],
  hourlyRows: [],
  functionRows: [],
  registryRows: [],
  ...parts,
});

export function SystemDashboardWidget({ widget, ctx, compact = false }) {
  const type = widget?.type;
  const dataset = widget?.dataset;

  if (type === 'stat') {
    const cards = dataset === 'usage' ? ctx.kpiUsage : ctx.kpiRegistries;
    if (!cards.length) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return (
      <div className='flex items-stretch flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
        {cards.map((c) => <SummaryCard key={c.key} card={c} variant='panel' />)}
      </div>
    );
  }

  if (type === 'donut') {
    const isAccess = dataset === 'access';
    const segments = isAccess ? ctx.approvalSegments : ctx.usersByPosition;
    if (!segments.length) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return (
      <div className='flex items-center justify-center w-full flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
        <Donut
          segments={segments}
          size={compact ? 132 : 148}
          centerLabel={String(isAccess ? ctx.accessTotal : ctx.usersTotal)}
          centerSub={isAccess ? 'แม่แบบ' : 'คน'}
        />
        <DonutLegend segments={segments} />
      </div>
    );
  }

  if (type === 'bars') {
    if (!ctx.monthLabels.length) return <Empty>ไม่มีเดือนไหนอยู่ในช่วงวันที่ที่เลือก</Empty>;
    return <VBars months={ctx.monthLabels} series={ctx.monthSeries} height={compact ? 160 : 200} barMaxWidth={18} />;
  }

  if (type === 'hbar') {
    const rows = dataset === 'usage-hours'
      ? ctx.hourlyRows
      : (dataset === 'usage-functions' ? ctx.functionRows : ctx.usersByCenter);
    if (!rows.length) return <Empty>ไม่มีข้อมูลในชุดนี้</Empty>;
    return (
      <HBarList
        rows={rows}
        valueLabel={dataset === 'staff-center' ? 'คน' : 'ครั้ง'}
        maxVisibleRows={compact ? 4.5 : 5.5}
      />
    );
  }

  if (type === 'table') {
    const rows = ctx.registryRows;
    if (!rows.length) return <Empty>ไม่มีรายการในชุดนี้</Empty>;
    return (
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        {rows.slice(0, compact ? 4 : 8).map((r) => (
          <div key={r.id} className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span className='truncate' style={{ ...CELL_TEXT, flex: '1 1 auto', minWidth: 0 }}>{r.name}</span>
            <ColorfulBadge style={r.count > 0 ? 'green' : 'grey'} size='small' hierarchy='secondary' width='hug'>
              {`${Number(r.count || 0).toLocaleString('th-TH')} ${r.unit}`}
            </ColorfulBadge>
          </div>
        ))}
      </div>
    );
  }

  return <Empty>ยังไม่รองรับการ์ดชนิดนี้</Empty>;
}

export default SystemDashboardWidget;
