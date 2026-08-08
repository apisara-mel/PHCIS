import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import Table from '@/components/table/Table';
import Badge from '@/components/badge/Badge';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import PatientSummaryCard from '@/components/card/PatientSummaryCard';
import { resolveQueuePatientAvatarProps } from '@/components/patient/QueuePatientAvatar';
import { useStepDirection } from '@/components/step/stepTransition';
import { triggerPharmacyPrint } from '@/components/pharmacy/pharmacyPrintUtils';
import Icon from '@/components/icons/Icon';
import { findMrPatientByHn } from '@/data/mrPatients';
import { resolveMedicationImage } from '@/data/medicationCatalog';
import {
  PHARMACY_QUEUE,
  PHARMACY_USAGE_HISTORY,
  DISPENSE_STATUS,
  PAYMENT_STATUS,
} from '@/data/pharmacyQueue';

/* ประวัติการรับยาของ HN — เปิดจากผู้รับบริการทั้งหมด (ไม่ navigate ออกจากหน้า).
   รวมคิววันนี้ + PHARMACY_USAGE_HISTORY (ย้อนหลัง) เรียงใหม่→เก่าโดยค่าเริ่มต้น.
   คลิก "ดูรายการยา" → nested panel ภายใน popup เดียว (ConsentHistory pattern).
   ปุ่มหลัก "ปิด" / แผงรายการยา: secondary "กลับ".
   พิมพ์: data-pharmacy-print-mode=med-history (pharmacyPrintUtils). */

/* Idempotent — patients page may not load PharmacyLabelPrint's stylesheet. */
if (typeof document !== 'undefined' && !document.getElementById('mih-pharmacy-med-history-print-style')) {
  const css = document.createElement('style');
  css.id = 'mih-pharmacy-med-history-print-style';
  css.textContent = `
    .mih-pharmacy-print-only.mih-pharmacy-print-med-history { display: none; }
    @media print {
      html[data-pharmacy-print-mode="med-history"] body * {
        visibility: hidden !important;
      }
      html[data-pharmacy-print-mode="med-history"] .mih-pharmacy-print-med-history,
      html[data-pharmacy-print-mode="med-history"] .mih-pharmacy-print-med-history * {
        visibility: visible !important;
      }
      html[data-pharmacy-print-mode="med-history"] .mih-pharmacy-print-only.mih-pharmacy-print-med-history {
        display: block !important;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
    }
  `;
  document.head.appendChild(css);
}

const STATUS_PILL = {
  [DISPENSE_STATUS.WAITING]:   { style: 'warning', label: 'รอเรียก'      },
  [DISPENSE_STATUS.CALLED]:    { style: 'info',    label: 'เรียกแล้ว'    },
  [DISPENSE_STATUS.PREPARING]: { style: 'info',    label: 'จัดยา'        },
  [DISPENSE_STATUS.DISPENSED]: { style: 'success', label: 'จ่ายแล้ว'     },
  [DISPENSE_STATUS.PARTIAL]:   { style: 'warning', label: 'จ่ายบางส่วน'  },
  [DISPENSE_STATUS.NO_SHOW]:   { style: 'neutral', label: 'ไม่มารับยา'   },
  [DISPENSE_STATUS.PROBLEM]:   { style: 'error',   label: 'มีปัญหา'      },
  [DISPENSE_STATUS.CANCELLED]: { style: 'neutral', label: 'ยกเลิก'       },
};

const PAYMENT_STATUS_PILL = {
  [PAYMENT_STATUS.NOT_APPLICABLE]: { style: 'neutral', label: 'ไม่มีค่าใช้จ่าย' },
  [PAYMENT_STATUS.UNPAID]:         { style: 'error',   label: 'ค้างชำระ'       },
  [PAYMENT_STATUS.PAID]:           { style: 'success', label: 'ชำระแล้ว'       },
};

const SOURCE_LABEL = {
  new: 'สั่งใหม่',
  remed: 'สั่งซ้ำ',
};

const dateKey = (row) => row.issuedDate || '9999-99-99';

/* Same 36px circular drug-photo tile as PharmacyDispensePage. */
const MedImageTile = ({ src, alt }) => {
  const [broken, setBroken] = useState(false);
  const baseStyle = {
    width: 'var(--dim-size-700, 36px)',
    height: 'var(--dim-size-700, 36px)',
    borderRadius: 'var(--dim-radius-full)',
    border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
    flexShrink: 0,
    boxSizing: 'border-box',
  };
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={alt || 'medication'}
        loading='lazy'
        onError={() => setBroken(true)}
        style={{ ...baseStyle, objectFit: 'cover', background: 'var(--surface-card-quaternary, #F9FBFB)' }}
      />
    );
  }
  return (
    <span
      className='inline-flex items-center justify-center'
      style={{
        ...baseStyle,
        background: 'var(--surface-brandPrimary-quaternary)',
        color: 'var(--text-brandPrimary-default)',
      }}
      aria-hidden
    >
      <Icon name='medication' size={18} color='currentColor' />
    </span>
  );
};

const ITEM_COLUMNS = [
  {
    key: 'name',
    label: 'ชื่อยา',
    flex: true,
    minWidth: 220,
    render: (it) => (
      <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-300)' }}>
        <MedImageTile src={resolveMedicationImage(it.name)} alt={it.name} />
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-50)' }}>
          <span style={{ fontWeight: 'var(--type-weight-medium)' }}>{it.name}</span>
          {it.instructions ? (
            <span
              className='truncate'
              style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' }}
              title={it.instructions}
            >
              {it.instructions}
            </span>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    key: 'dose',
    label: 'ขนาด/ครั้ง',
    render: (it) => `${it.dosePerTake || '—'} ${it.unit || ''}`.trim(),
  },
  { key: 'frequency', label: 'ความถี่', render: (it) => it.frequency || '—' },
  { key: 'when', label: 'เวลาใช้ยา', render: (it) => it.when || '—' },
  {
    key: 'quantity',
    label: 'จำนวน',
    align: 'center',
    render: (it) => `${it.quantity ?? '—'}${it.unit ? ` ${it.unit}` : ''}`,
  },
  {
    key: 'source',
    label: 'ประเภท',
    render: (it) => (
      <Badge style={it.source === 'remed' ? 'info' : 'neutral'} size='small'>
        {SOURCE_LABEL[it.source] || it.source || '—'}
      </Badge>
    ),
  },
  {
    key: 'drugType',
    label: 'แหล่งยา',
    render: (it) => it.drugType || '—',
  },
];

const PharmacyMedicationHistoryPopup = ({
  open,
  onClose,
  hn = '',
  patientName = '',
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRx, setSelectedRx] = useState(null);
  const panelStep = selectedRx ? 1 : 0;
  const panelDirection = useStepDirection(panelStep);

  /* Reset drill-down + sort when opening for another HN. */
  useEffect(() => {
    if (open) {
      setSortConfig({ key: null, direction: 'asc' });
      setSelectedRx(null);
    }
  }, [open, hn]);

  const mr = useMemo(() => (hn ? findMrPatientByHn(hn) : null), [hn]);

  const displayName = useMemo(() => {
    if (patientName) return patientName;
    if (mr) return `${mr.prefixTh || ''}${mr.firstNameTh} ${mr.lastNameTh}`.trim();
    return '';
  }, [patientName, mr]);

  const avatar = useMemo(
    () => resolveQueuePatientAvatarProps({ hn, displayName }),
    [hn, displayName],
  );

  const handleSort = (key) => {
    setSortConfig((prev) => (
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ));
  };

  const openItems = (rx) => setSelectedRx(rx);
  const closeItems = () => setSelectedRx(null);

  const rows = useMemo(() => {
    if (!hn) return [];
    const hnKey = hn.toLowerCase();
    /* ประวัติการรับยา — ไม่รวมสถานะรอเรียก (ยังอยู่ในคิว ยังไม่ใช่ประวัติ) */
    const notWaiting = (r) => r.status !== DISPENSE_STATUS.WAITING;
    const today = PHARMACY_QUEUE.filter((r) => r.hn.toLowerCase() === hnKey && notWaiting(r));
    const past = PHARMACY_USAGE_HISTORY.filter((r) => r.hn.toLowerCase() === hnKey && notWaiting(r));
    return [...today, ...past].sort((a, b) => {
      const byDate = String(dateKey(b)).localeCompare(String(dateKey(a)));
      if (byDate !== 0) return byDate;
      return String(b.issuedAt || '').localeCompare(String(a.issuedAt || ''));
    });
  }, [hn]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const sign = sortConfig.direction === 'desc' ? -1 : 1;
    const normalize = (row, key) => {
      switch (key) {
        case 'issuedDate':  return dateKey(row);
        case 'items':       return row.items?.length ?? 0;
        case 'payment':     return PAYMENT_STATUS_PILL[row.paymentStatus]?.label || '';
        case 'status':      return STATUS_PILL[row.status]?.label || row.status || '';
        default:            return row[key] ?? '';
      }
    };
    const collator = new Intl.Collator('th', { numeric: true, sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      const av = normalize(a, sortConfig.key);
      const bv = normalize(b, sortConfig.key);
      const primary = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : collator.compare(String(av), String(bv));
      return sign * primary;
    });
  }, [rows, sortConfig]);

  const columns = useMemo(() => [
    {
      key: 'issuedDate',
      label: 'วันที่',
      render: (r) => r.issuedDate || 'วันนี้',
    },
    {
      key: 'queueNo',
      label: 'เลขที่ใบสั่งยา',
      render: (r) => <Badge style='success' size='small'>{r.queueNo}</Badge>,
    },
    { key: 'issuedAt', label: 'เวลาสั่งยา', render: (r) => r.issuedAt || '—' },
    {
      key: 'items',
      label: 'รายการยา',
      flex: true,
      minWidth: 220,
      render: (r) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-50)' }}>
          <span style={{ fontWeight: 'var(--type-weight-medium)' }}>
            {r.items.length} รายการ
          </span>
          <span
            className='truncate'
            style={{
              color: 'var(--text-content-tertiary)',
              fontSize: 'var(--type-size-xs)',
            }}
            title={r.items.map((i) => i.name).join(', ')}
          >
            {r.items.map((i) => i.name).join(', ')}
          </span>
        </div>
      ),
    },
    {
      key: 'dispensedAt',
      label: 'เวลาจ่ายยา',
      render: (r) => r.dispensedAt || '—',
    },
    {
      key: 'payment',
      label: 'การชำระเงิน',
      render: (r) => {
        const pill = PAYMENT_STATUS_PILL[r.paymentStatus];
        if (!pill) return '—';
        return <Badge style={pill.style} size='small'>{pill.label}</Badge>;
      },
    },
    {
      key: 'status',
      label: 'สถานะ',
      render: (r) => {
        const pill = STATUS_PILL[r.status] || { style: 'neutral', label: r.status || '—' };
        return <Badge style={pill.style} size='small'>{pill.label}</Badge>;
      },
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (r) => (
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='visibility'
          onClick={(e) => {
            e.stopPropagation();
            openItems(r);
          }}
          aria-label={`ดูรายการยา ${r.queueNo}`}
        >
          ดูรายการยา
        </BrandSubdueButton>
      ),
    },
  ], []);

  const isItemsPanel = Boolean(selectedRx);

  const handleBack = () => {
    if (isItemsPanel) {
      closeItems();
      return;
    }
    onClose?.();
  };

  const popupTitle = isItemsPanel
    ? `รายการยา · ${selectedRx.queueNo}`
    : 'ประวัติการรับยา';

  const popupSubtitle = isItemsPanel
    ? [
      selectedRx.issuedDate || 'วันนี้',
      selectedRx.issuedAt || null,
      `${selectedRx.items.length} รายการ`,
    ].filter(Boolean).join(' · ')
    : `${sortedRows.length} ใบสั่งยา`;

  const printedAt = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
  const ageGender = [
    mr?.age != null ? `${mr.age} ปี` : null,
    mr?.gender || null,
  ].filter(Boolean).join(' · ') || '—';

  const canPrint = isItemsPanel
    ? (selectedRx?.items?.length || 0) > 0
    : sortedRows.length > 0;

  const handlePrint = () => {
    if (!canPrint) return;
    triggerPharmacyPrint('med-history');
  };

  const thStyle = {
    textAlign: 'left',
    padding: 'var(--dim-space-200)',
    borderBottom: 'var(--dim-stroke-200) solid var(--border-card-default)',
    fontSize: 'var(--type-size-xs)',
  };
  const tdStyle = {
    padding: 'var(--dim-space-200)',
    borderBottom: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
    fontSize: 'var(--type-size-sm)',
    verticalAlign: 'top',
  };

  return (
    <>
      {open ? (
        <div
          className='mih-pharmacy-print-only mih-pharmacy-print-med-history'
          style={{
            padding: 'var(--dim-space-600)',
            fontFamily: 'var(--type-family-body)',
            color: 'var(--text-content-default)',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--type-size-lg)',
              fontWeight: 'var(--type-weight-bold)',
              marginBottom: 'var(--dim-space-100)',
            }}
          >
            {isItemsPanel ? `รายการยา · ${selectedRx.queueNo}` : 'ประวัติการรับยา'}
          </h1>
          <p
            style={{
              fontSize: 'var(--type-size-xs)',
              color: 'var(--text-content-tertiary)',
              marginBottom: 'var(--dim-space-400)',
            }}
          >
            {[
              displayName || null,
              hn ? `HN ${hn}` : null,
              ageGender !== '—' ? ageGender : null,
              `พิมพ์เมื่อ ${printedAt}`,
            ].filter(Boolean).join(' · ')}
          </p>

          {isItemsPanel ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ชื่อยา', 'ขนาด/ครั้ง', 'ความถี่', 'เวลาใช้ยา', 'จำนวน', 'ประเภท', 'แหล่งยา', 'คำแนะนำ'].map((label) => (
                    <th key={label} style={thStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedRx.items.map((it) => (
                  <tr key={it.id || it.name}>
                    <td style={tdStyle}>{it.name}</td>
                    <td style={tdStyle}>{`${it.dosePerTake || '—'} ${it.unit || ''}`.trim()}</td>
                    <td style={tdStyle}>{it.frequency || '—'}</td>
                    <td style={tdStyle}>{it.when || '—'}</td>
                    <td style={tdStyle}>{`${it.quantity ?? '—'}${it.unit ? ` ${it.unit}` : ''}`}</td>
                    <td style={tdStyle}>{SOURCE_LABEL[it.source] || it.source || '—'}</td>
                    <td style={tdStyle}>{it.drugType || '—'}</td>
                    <td style={tdStyle}>{it.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['วันที่', 'เลขที่ใบสั่งยา', 'เวลาสั่งยา', 'รายการยา', 'เวลาจ่ายยา', 'สถานะ'].map((label) => (
                    <th key={label} style={thStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id || r.queueNo}>
                    <td style={tdStyle}>{r.issuedDate || 'วันนี้'}</td>
                    <td style={tdStyle}>{r.queueNo}</td>
                    <td style={tdStyle}>{r.issuedAt || '—'}</td>
                    <td style={tdStyle}>
                      <div>{r.items.length} รายการ</div>
                      <div style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary)' }}>
                        {r.items.map((i) => i.name).join(', ')}
                      </div>
                    </td>
                    <td style={tdStyle}>{r.dispensedAt || '—'}</td>
                    <td style={tdStyle}>{STATUS_PILL[r.status]?.label || r.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      <div className='mih-med-history-no-print'>
        <Popup
          open={open}
          onClose={onClose}
          size='extraLarge'
          title={popupTitle}
          subtitle={popupSubtitle}
          onBack={isItemsPanel ? handleBack : undefined}
          headerTrailing={(
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon='print'
              disabled={!canPrint}
              onClick={handlePrint}
              aria-label='พิมพ์ประวัติการรับยา'
            >
              พิมพ์
            </NeutralSubdueButton>
          )}
          primaryAction={{ label: 'ปิด', onClick: onClose }}
          secondaryAction={
            isItemsPanel
              ? { label: 'กลับ', onClick: closeItems }
              : undefined
          }
        >
          {isItemsPanel ? (
            <div
              key={`items-${selectedRx.id || selectedRx.queueNo}`}
              data-direction={panelDirection}
              className='mih-step-content flex flex-col w-full min-w-0'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <Table
                columns={ITEM_COLUMNS}
                rows={selectedRx.items}
                rowKey={(it) => it.id || it.name}
                stickyColCount={1}
                emptyMessage='ไม่มีรายการยาในใบสั่งนี้'
              />
            </div>
          ) : (
            <div
              key='history-list'
              data-direction={panelDirection}
              className='mih-step-content flex flex-col w-full min-w-0'
              style={{ gap: 'var(--dim-space-400)' }}
            >
              <PatientSummaryCard
                variant='default'
                avatarUrl={avatar.avatarUrl ?? null}
                avatarAlt={displayName || hn}
                cells={[
                  {
                    label: 'ชื่อ-นามสกุล ผู้รับบริการ',
                    value: displayName || '—',
                  },
                  {
                    label: 'HN (Hospital Number)',
                    value: hn || '—',
                  },
                  {
                    label: 'อายุ / เพศ',
                    value: ageGender,
                  },
                ]}
              />

              <Table
                columns={columns}
                rows={sortedRows}
                rowKey={(r) => r.id || r.queueNo}
                sortConfig={sortConfig}
                onSort={handleSort}
                stickyColCount={1}
                onRowClick={(r) => openItems(r)}
                emptyMessage='ยังไม่มีประวัติการรับยาของผู้รับบริการรายนี้'
                emptySubtext='เมื่อมีการสั่งจ่ายยา รายการจะแสดงที่นี่'
              />
            </div>
          )}
        </Popup>
      </div>
    </>
  );
};

export default PharmacyMedicationHistoryPopup;
