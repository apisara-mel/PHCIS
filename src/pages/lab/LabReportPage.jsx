import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Icon from '@/components/icons/Icon';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import LabPatientReport from '@/components/lab/LabPatientReport';
import { LAB_ORDERS, withTestLabel, subscribeOrders } from '@/data/labOrders';
import { printLab } from '@/data/labPrintSettings';

/* Preview + print for the patient's result sheet.

   The sheet itself is print-only by default (it lives inside the
   `@media print` visibility switch in labPrintSettings.js), which makes it
   impossible to check without burning paper. This page mounts the same
   component visibly on a grey desk so it can be reviewed on screen, and
   prints the real thing from the same markup — what you see is what comes
   out of the printer, rather than two layouts that drift apart. */

/* Body only — no app shell. `/lab/report/:orderId` wraps it in one; the
   worklist's ใบผลตรวจ row action opens the same body in a popup so the sheet
   can be checked without leaving the queue. */
export const LabReportBody = ({ orderId, onDone }) => {

  const [version, setVersion] = useState(0);
  useEffect(() => subscribeOrders(() => setVersion((v) => v + 1)), []);

  const rows = useMemo(
    () => LAB_ORDERS.filter((o) => o.orderId === orderId).map(withTestLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderId, version],
  );

  const releasedCount = rows.filter((r) => r.status === 'reported' && r.results).length;

  return (
    <>
      <div className='flex-1 flex flex-col min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
          <div className='flex items-center flex-wrap mih-lab-no-print' style={{ gap: 'var(--dim-space-300)' }}>
            <div className='flex-1' />
            <span className='text-xs text-ink-tertiary'>
              {releasedCount > 0
                ? `${releasedCount} รายการที่รับรองผลแล้ว`
                : 'ยังไม่มีผลที่รับรองแล้วในคำสั่งนี้'}
            </span>
            <NeutralSubdueButton variant='outline' size='md' onClick={() => onDone?.()}>
              ปิด
            </NeutralSubdueButton>
            <BrandButton
              size='md'
              leadingIcon='print'
              disabled={releasedCount === 0}
              onClick={() => printLab('patient')}
            >
              พิมพ์ใบรายงานผล
            </BrandButton>
          </div>

          {releasedCount === 0 ? (
            <div
              className='flex-1 flex items-center justify-center text-sm text-ink-tertiary'
              style={{ background: 'var(--surface-card-100)', borderRadius: 'var(--dim-radius-500)', minHeight: 320 }}
            >
              ใบรายงานผลจะออกได้เมื่อมีผลตรวจที่รับรองแล้วอย่างน้อย 1 รายการ
            </div>
          ) : (
            /* The sheet on a desk. The grey surround is screen-only; the
               print stylesheet drops everything but the sheet itself. */
            <div
              className='w-full flex justify-center'
              style={{
                background: 'var(--surface-card-200)',
                borderRadius: 'var(--dim-radius-500)',
                paddingTop: 'var(--dim-space-800, 32px)',
                paddingBottom: 'var(--dim-space-800, 32px)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                overflowX: 'auto',
              }}
            >
              <div
                style={{
                  width: '210mm',
                  flexShrink: 0,
                  background: '#FFFFFF',
                  boxShadow: 'var(--shadow-card-strong)',
                }}
              >
                <LabPatientReport rows={rows} preview />
              </div>
            </div>
          )}
      </div>

      {/* The real print target — same component, hidden until printing.
          Positioned out of flow so it cannot take width from the app shell
          it sits beside. */}
      <div className='mih-lab-print-root'>
        <LabPatientReport rows={rows} />
      </div>
    </>
  );
};

/* Route shell — /lab/report/:orderId. */
const LabReportPage = () => {
  const history = useHistory();
  const { orderId } = useParams();

  return (
    <div className='min-h-screen flex' style={{ background: 'var(--background-screen-brand-100, #F4FBF8)' }}>
      <Sidebar activeKey='lab' />
      <main className='flex-1 flex flex-col min-w-0'>
        <Header breadcrumb={['ห้องปฏิบัติการ', 'ใบรายงานผลสำหรับผู้ป่วย', orderId]} />
        <div className='p-3 md:p-6 flex-1 flex flex-col' style={{ gap: 'var(--dim-space-500)' }}>
          <div>
            <button
              type='button'
              onClick={() => history.push('/lab/queue')}
              className='inline-flex items-center gap-1 text-sm text-ink-secondary hover:text-brand-500'
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 'var(--dim-space-0)' }}
            >
              <Icon name='chevron-left' size={16} />
              กลับไปยังห้องปฏิบัติการ
            </button>
          </div>
          <LabReportBody orderId={orderId} onDone={() => history.push('/lab/queue')} />
        </div>
      </main>
    </div>
  );
};

export default LabReportPage;
