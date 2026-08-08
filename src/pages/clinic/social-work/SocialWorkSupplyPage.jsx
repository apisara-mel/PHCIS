import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Icon from '@/components/icons/Icon';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import DatePicker from '@/components/forms/DatePicker';
import Textarea from '@/components/forms/Textarea';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import Popup from '@/components/popup/Popup';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import {
  SwSectionHeader, SwField, SwBanner, SwInlineSearch, SwPagerBar, SwEmptyHint, toLocalIso,
} from '@/pages/clinic/social-work/SocialWorkShared';
import {
  SW_INVENTORY_LINK,
  SW_MATERIAL_CATEGORIES,
  SW_MATERIAL_OPTIONS,
  SW_UNITS,
  SW_SUPPLY_SOURCES,
  SW_SUPPLY_USER,
  EXPIRY_BLOCK_DAYS,
  EXPIRY_WARN_DAYS,
  daysToExpire,
  findSwMaterial,
  resolveSwCategory,
  getSwReceipts,
  saveSwReceipt,
  cancelSwReceipt,
  reactivateSwReceipt,
  getSwIssues,
  saveSwIssue,
  cancelSwIssue,
  reactivateSwIssue,
  getSwStockByCategory,
  getSwExpiringLots,
  getSwLotsForMaterial,
  getSwRemainingForLot,
  getSwRequesters,
  logSwSupplyPrint,
  getSwSupplyPrintLog,
} from '@/data/socialWorkSupplies';
import {
  hasSocialWorkRights,
  setSocialWorkRights,
  formatSwDate,
  formatSwDateTime,
  formatBaht,
  todayIso,
} from '@/data/socialWorkClinic';

/* SocialWorkSupplyPage — บันทึกรับ-จ่ายวัสดุ (TOR 1.10.11.3).

   Two ledgers behind a tab strip (รับเข้า / จ่ายออก) over a stock-balance
   summary. Field vocabulary is the legacy manual's (§2.8–2.9): เลขที่ใบเบิก ·
   วันที่รับ · ยี่ห้อ · สูตร/ชนิด · Lot Number · Expire Date · รับมาจาก ·
   ปริมาณ · หน่วยนับ · ราคาต่อหน่วย · จำนวนเงิน — จำนวนเงินคำนวณอัตโนมัติ
   (ปริมาณ × ราคาต่อหน่วย) และแก้ไขเองไม่ได้.

   ทั้งสอง ledger ทำครบ 4 verbs: แสดง / บันทึก / แก้ไข / ยกเลิก —
   แถวที่ยกเลิกยังแสดงอยู่แบบขีดฆ่า พร้อม ยกเลิกโดย/เมื่อ/เหตุผล และกด
   "เปิดใช้งาน" กลับได้ (ธรรมเนียมของระบบเดิม).

   เชื่อมระบบคลัง: แสดงสถานะการซิงก์เป็น mock อย่างเดียว (SW_INVENTORY_LINK)
   — โมดูลคลัง/ห้องยาเป็นพื้นที่ของทีมอื่น (§1.9) จึงไม่ import ข้ามมา. */

const breadcrumb = ['ระบบบันทึกการรักษา', 'งานสังคมสงเคราะห์', 'รับ-จ่ายวัสดุ'];
const PAGE_SIZE = 10;

const EMPTY_RECEIPT = {
  id: '',
  receiveDate: todayIso(),
  requisitionNo: '',
  materialCode: '',
  brand: '',
  formula: '',
  lot: '',
  expireDate: '',
  source: '',
  qty: '',
  unit: '',
  unitPrice: '',
};

const EMPTY_ISSUE = {
  id: '',
  issueDate: todayIso(),
  requesterId: '',
  materialCode: '',
  lot: '',
  qty: '',
  note: '',
};

const struck = { color: 'var(--text-content-tertiary, #858C92)', textDecoration: 'line-through' };

const SocialWorkSupplyPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();

  const [tab, setTab] = useState(navState?.tab === 'issue' ? 'issue' : 'receive');
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [, setRightsTick] = useState(0);

  const [receiptForm, setReceiptForm] = useState(EMPTY_RECEIPT);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptErrors, setReceiptErrors] = useState({});

  const [issueForm, setIssueForm] = useState(EMPTY_ISSUE);
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueErrors, setIssueErrors] = useState({});

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [banner, setBanner] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [printTick, setPrintTick] = useState(0);

  const canWrite = hasSocialWorkRights();
  const toggleRightsDemo = () => {
    setSocialWorkRights(!hasSocialWorkRights());
    setRightsTick((t) => t + 1);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const receipts = useMemo(() => getSwReceipts(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const issues = useMemo(() => getSwIssues(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stockByCategory = useMemo(() => getSwStockByCategory(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const expiringLots = useMemo(() => getSwExpiringLots(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const requesters = useMemo(() => getSwRequesters(), [tick]);

  const approvedRequesters = requesters.filter((r) => r.status === 'approved');

  /* Deep-link จากขั้นตอนที่ 5 ของ สส.2 — เปิดฟอร์มจ่ายออกพร้อมเติมบริบทให้ */
  useEffect(() => {
    if (navState?.tab !== 'issue' || !navState?.hn) return;
    const requester = getSwRequesters().find((r) => r.hn === navState.hn && r.status !== 'cancelled');
    setTab('issue');
    if (!requester) {
      setBanner({
        tone: 'warning',
        text: `HN ${navState.hn} ยังไม่มีทะเบียนผู้ขอวัสดุ — ต้องลงทะเบียนผู้ขอก่อนจึงจะจ่ายวัสดุได้`,
        action: 'requester',
      });
      return;
    }
    const lots = navState.materialCode ? getSwLotsForMaterial(navState.materialCode) : [];
    setIssueForm({
      ...EMPTY_ISSUE,
      requesterId: requester.id,
      materialCode: navState.materialCode || '',
      lot: lots[0]?.lot || '',
      qty: navState.qty ? String(navState.qty) : '',
    });
    setIssueOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summaryCards = useMemo(() => ([
    ...stockByCategory.slice(0, 2).map((c) => ({
      key: `stock-${c.value}`,
      label: `คงเหลือ — ${c.label}`,
      value: c.remaining,
      color: c.remaining > 0 ? 'positive' : 'negative',
      icon: c.icon,
    })),
    { key: 'expiring', label: `ใกล้หมดอายุ (≤ ${EXPIRY_WARN_DAYS} วัน)`, value: expiringLots.length, color: 'warning', icon: 'schedule' },
    { key: 'pendingIssue', label: 'คำขอที่อนุมัติแล้ว รอจ่าย', value: approvedRequesters.length, color: 'info', icon: 'local_shipping' },
  ]), [stockByCategory, expiringLots, approvedRequesters]);

  const tabs = [
    { key: 'receive', label: 'รับเข้า', icon: 'download', count: receipts.filter((r) => r.status !== 'cancelled').length },
    { key: 'issue', label: 'จ่ายออก', icon: 'upload', count: issues.filter((r) => r.status !== 'cancelled').length },
    { key: 'stock', label: 'ยอดคงเหลือรายล็อต', icon: 'inventory', count: stockByCategory.reduce((s, c) => s + c.lots, 0) },
  ];

  /* ── filtering ─────────────────────────────────────────────────── */
  const matchSearch = (row, extra = []) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const mat = findSwMaterial(row.materialCode);
    return [row.requisitionNo, row.lot, row.materialCode, mat?.name, row.brand, row.source, ...extra]
      .some((f) => f && String(f).toLowerCase().includes(q));
  };

  const matchCategory = (row) =>
    categoryFilter === 'all' || findSwMaterial(row.materialCode)?.category === categoryFilter;

  const matchStatus = (row) =>
    statusFilter === 'all'
    || (statusFilter === 'active' && row.status !== 'cancelled')
    || (statusFilter === 'cancelled' && row.status === 'cancelled');

  const filteredReceipts = useMemo(
    () => receipts.filter((r) => matchSearch(r) && matchCategory(r) && matchStatus(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receipts, search, categoryFilter, statusFilter],
  );

  const filteredIssues = useMemo(
    () => issues.filter((r) => matchSearch(r, [r.hn, r.name]) && matchCategory(r) && matchStatus(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issues, search, categoryFilter, statusFilter],
  );

  const allLots = useMemo(() => {
    /* ทุกล็อต (รวมที่คงเหลือ 0) เพื่อให้ตรวจสอบย้อนหลังได้ */
    const map = new Map();
    receipts.filter((r) => r.status !== 'cancelled').forEach((r) => {
      const key = `${r.materialCode}|${r.lot}`;
      const prev = map.get(key) || { key, materialCode: r.materialCode, lot: r.lot, expireDate: r.expireDate, unit: r.unit, received: 0, issued: 0, unitPrice: r.unitPrice };
      prev.received += Number(r.qty) || 0;
      map.set(key, prev);
    });
    issues.filter((i) => i.status !== 'cancelled').forEach((i) => {
      const key = `${i.materialCode}|${i.lot}`;
      const prev = map.get(key) || { key, materialCode: i.materialCode, lot: i.lot, expireDate: '', unit: i.unit, received: 0, issued: 0, unitPrice: 0 };
      prev.issued += Number(i.qty) || 0;
      map.set(key, prev);
    });
    return Array.from(map.values())
      .map((l) => ({ ...l, remaining: l.received - l.issued }))
      .filter((l) => matchCategory(l))
      .filter((l) => matchSearch(l))
      .sort((a, b) => String(a.expireDate).localeCompare(String(b.expireDate)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipts, issues, search, categoryFilter]);

  const activeRows = tab === 'receive' ? filteredReceipts : tab === 'issue' ? filteredIssues : allLots;
  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const pageRows = activeRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /* ── รับเข้า form ──────────────────────────────────────────────── */
  const receiptTotal = useMemo(() => {
    const qty = Number(receiptForm.qty);
    const price = Number(receiptForm.unitPrice);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
    return qty * price;
  }, [receiptForm.qty, receiptForm.unitPrice]);

  const expireDays = daysToExpire(receiptForm.expireDate);

  const openReceiptCreate = () => {
    if (!canWrite) return;
    setReceiptForm({ ...EMPTY_RECEIPT, receiveDate: todayIso() });
    setReceiptErrors({});
    setReceiptOpen(true);
  };

  const openReceiptEdit = (row) => {
    if (!canWrite) return;
    setReceiptForm({
      id: row.id,
      receiveDate: row.receiveDate,
      requisitionNo: row.requisitionNo,
      materialCode: row.materialCode,
      brand: row.brand || '',
      formula: row.formula || '',
      lot: row.lot,
      expireDate: row.expireDate,
      /* ค่า Expire เดิมของแถว — ใช้ตัดสินว่าผู้ใช้แก้ค่า Expire หรือไม่
         (แก้ไขแถวของล็อตที่หมดอายุไปแล้วต้องทำได้ ตราบใดที่ไม่แตะ Expire) */
      initialExpireDate: row.expireDate,
      source: row.source || '',
      qty: String(row.qty),
      unit: row.unit,
      unitPrice: String(row.unitPrice),
    });
    setReceiptErrors({});
    setReceiptOpen(true);
  };

  const setReceiptField = (key) => (value) => {
    setReceiptForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'materialCode') {
        const mat = findSwMaterial(value);
        if (mat) {
          next.unit = next.unit || mat.unit;
          next.brand = next.brand || mat.brand;
        }
      }
      return next;
    });
    setReceiptErrors((e) => ({ ...e, [key]: undefined }));
  };

  const saveReceipt = () => {
    const errs = {};
    if (!receiptForm.receiveDate) errs.receiveDate = 'กรุณาระบุวันที่รับ';
    if (!receiptForm.requisitionNo.trim()) errs.requisitionNo = 'กรุณาระบุเลขที่ใบเบิก';
    if (!receiptForm.materialCode) errs.materialCode = 'กรุณาเลือกรายการวัสดุ';
    if (!receiptForm.lot.trim()) errs.lot = 'กรุณาระบุ Lot Number';
    if (!receiptForm.expireDate) errs.expireDate = 'กรุณาระบุวันหมดอายุ (Expire Date)';
    /* บังคับ "ต้องเป็นวันในอนาคต" เฉพาะตอนสร้างใหม่ หรือเมื่อผู้ใช้เปลี่ยนค่า
       Expire จากค่าเดิม — ไม่งั้นรายการรับเข้าของล็อตที่หมดอายุไปแล้ว
       จะแก้ไข field อื่น (เช่น ปริมาณ/ราคา) ไม่ได้เลย */
    else if ((!receiptForm.id || receiptForm.expireDate !== receiptForm.initialExpireDate)
      && daysToExpire(receiptForm.expireDate) <= 0) errs.expireDate = 'วันหมดอายุต้องเป็นวันในอนาคต';
    if (!receiptForm.source) errs.source = 'กรุณาระบุแหล่งที่รับมา';
    const qty = Number(receiptForm.qty);
    if (!Number.isFinite(qty) || qty <= 0) errs.qty = 'ปริมาณต้องมากกว่า 0';
    if (!receiptForm.unit) errs.unit = 'กรุณาเลือกหน่วยนับ';
    const price = Number(receiptForm.unitPrice);
    if (!Number.isFinite(price) || price < 0) errs.unitPrice = 'ราคาต่อหน่วยต้องไม่ติดลบ';
    if (Object.keys(errs).length > 0) {
      setReceiptErrors(errs);
      return;
    }
    const { isNew } = saveSwReceipt({
      id: receiptForm.id || undefined,
      receiveDate: receiptForm.receiveDate,
      requisitionNo: receiptForm.requisitionNo.trim(),
      materialCode: receiptForm.materialCode,
      brand: receiptForm.brand.trim(),
      formula: receiptForm.formula.trim(),
      lot: receiptForm.lot.trim(),
      expireDate: receiptForm.expireDate,
      source: receiptForm.source,
      qty,
      unit: receiptForm.unit,
      unitPrice: price,
    });
    setReceiptOpen(false);
    setTick((t) => t + 1);
    setBanner({
      tone: 'brand',
      text: isNew
        ? `บันทึกการรับวัสดุเข้าคลังงานสังคมสงเคราะห์แล้ว — ${findSwMaterial(receiptForm.materialCode)?.name} จำนวน ${qty} ${receiptForm.unit} (${formatBaht(qty * price)})`
        : 'บันทึกการแก้ไขรายการรับเข้าแล้ว',
    });
  };

  /* ── จ่ายออก form ──────────────────────────────────────────────── */
  const issueRequester = useMemo(
    () => requesters.find((r) => r.id === issueForm.requesterId) || null,
    [requesters, issueForm.requesterId],
  );

  const issueLots = useMemo(
    /* ตอนแก้ไข (มี id): lot ปัจจุบันของแถวอาจมี remaining = 0 แล้ว —
       ต้องรวมเข้า options เสมอ ไม่งั้นช่อง Lot ของฟอร์มแก้ไขว่าง */
    () => (issueForm.materialCode
      ? getSwLotsForMaterial(issueForm.materialCode, { includeLot: issueForm.id ? issueForm.lot : undefined })
      : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issueForm.materialCode, issueForm.id, issueForm.lot, tick],
  );

  const issueRemaining = useMemo(() => {
    if (!issueForm.materialCode || !issueForm.lot) return null;
    return getSwRemainingForLot(issueForm.materialCode, issueForm.lot, issueForm.id || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueForm.materialCode, issueForm.lot, issueForm.id, tick]);

  const openIssueCreate = () => {
    if (!canWrite) return;
    setIssueForm({ ...EMPTY_ISSUE, issueDate: todayIso() });
    setIssueErrors({});
    setIssueOpen(true);
  };

  const openIssueEdit = (row) => {
    if (!canWrite) return;
    setIssueForm({
      id: row.id,
      issueDate: row.issueDate,
      requesterId: row.requesterId,
      materialCode: row.materialCode,
      lot: row.lot,
      qty: String(row.qty),
      note: row.note || '',
    });
    setIssueErrors({});
    setIssueOpen(true);
  };

  const setIssueField = (key) => (value) => {
    setIssueForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'materialCode') {
        /* FEFO — ล็อตที่หมดอายุก่อนถูกเลือกให้เป็นค่าเริ่มต้น */
        const lots = getSwLotsForMaterial(value);
        next.lot = lots[0]?.lot || '';
      }
      return next;
    });
    setIssueErrors((e) => ({ ...e, [key]: undefined }));
  };

  const saveIssue = () => {
    const errs = {};
    if (!issueForm.issueDate) errs.issueDate = 'กรุณาระบุวันที่จ่าย';
    if (!issueForm.requesterId) errs.requesterId = 'กรุณาเลือกผู้รับจากทะเบียนผู้ขอวัสดุ';
    if (!issueForm.materialCode) errs.materialCode = 'กรุณาเลือกรายการวัสดุ';
    if (!issueForm.lot) errs.lot = 'กรุณาเลือก Lot ที่จะจ่าย';
    const qty = Number(issueForm.qty);
    if (!Number.isFinite(qty) || qty <= 0) errs.qty = 'จำนวนจ่ายต้องมากกว่า 0';
    else if (issueRemaining !== null && qty > issueRemaining) {
      errs.qty = `จ่ายเกินยอดคงเหลือของล็อตนี้ (คงเหลือ ${issueRemaining} ${findSwMaterial(issueForm.materialCode)?.unit || ''})`;
    }
    if (issueForm.requesterId && issueRequester && issueRequester.status === 'rejected') {
      errs.requesterId = 'คำขอนี้ถูกพิจารณาไม่อนุมัติ — จ่ายวัสดุไม่ได้';
    }
    if (Object.keys(errs).length > 0) {
      setIssueErrors(errs);
      return;
    }
    const mat = findSwMaterial(issueForm.materialCode);
    const { isNew } = saveSwIssue({
      id: issueForm.id || undefined,
      issueDate: issueForm.issueDate,
      requesterId: issueForm.requesterId,
      hn: issueRequester?.hn || '',
      name: issueRequester?.name || '',
      materialCode: issueForm.materialCode,
      lot: issueForm.lot,
      qty,
      unit: mat?.unit || '',
      note: issueForm.note.trim(),
    });
    setIssueOpen(false);
    setTick((t) => t + 1);
    setBanner({
      tone: 'brand',
      text: isNew
        ? `จ่ายวัสดุให้ ${issueRequester?.name} แล้ว — ${mat?.name} จำนวน ${qty} ${mat?.unit || ''} (Lot ${issueForm.lot})`
        : 'บันทึกการแก้ไขรายการจ่ายออกแล้ว',
    });
  };

  /* ── ยกเลิก / เปิดใช้งาน ───────────────────────────────────────── */
  const openCancel = (row, kind) => {
    if (!canWrite) return;
    setCancelReason('');
    setCancelError('');
    setCancelTarget({ ...row, kind });
  };

  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError('กรุณาระบุเหตุผลการยกเลิกรายการ');
      return;
    }
    if (cancelTarget.kind === 'receipt') cancelSwReceipt(cancelTarget.id, cancelReason.trim());
    else cancelSwIssue(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setTick((t) => t + 1);
  };

  const reactivate = (row, kind) => {
    if (!canWrite) return;
    if (kind === 'receipt') reactivateSwReceipt(row.id);
    else reactivateSwIssue(row.id);
    setTick((t) => t + 1);
  };

  const doPrintSlip = (row) => {
    logSwSupplyPrint(row.id, 'ใบจ่ายวัสดุสังคมสงเคราะห์');
    setPrintTick((t) => t + 1);
    setPrintTarget(row);
  };

  const printLog = useMemo(
    () => (printTarget ? getSwSupplyPrintLog(printTarget.id) : []),
    [printTarget, printTick],
  );

  /* ── columns ───────────────────────────────────────────────────── */
  const cancelBlock = (r) => (
    <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
      <ColorfulBadge style='red' size='small' hierarchy='secondary'>ยกเลิกแล้ว</ColorfulBadge>
      {r.cancellation && (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          โดย {r.cancellation.by} · {formatSwDateTime(r.cancellation.at)}
          <br />เหตุผล: {r.cancellation.reason}
        </span>
      )}
    </div>
  );

  const dim = (r) => (r.status === 'cancelled' ? struck : undefined);

  const expiryBadge = (iso) => {
    const days = daysToExpire(iso);
    if (days === null) return '—';
    if (days <= 0) return <ColorfulBadge style='red' size='small' hierarchy='secondary'>หมดอายุแล้ว</ColorfulBadge>;
    if (days <= EXPIRY_BLOCK_DAYS) return <ColorfulBadge style='red' size='small' hierarchy='secondary'>{formatSwDate(iso)} · เหลือ {days} วัน</ColorfulBadge>;
    if (days <= EXPIRY_WARN_DAYS) return <ColorfulBadge style='orange' size='small' hierarchy='secondary'>{formatSwDate(iso)} · เหลือ {days} วัน</ColorfulBadge>;
    return formatSwDate(iso);
  };

  const receiptColumns = useMemo(() => ([
    { key: 'receiveDate', label: 'วันที่รับ', render: (r) => <span style={dim(r)}>{formatSwDate(r.receiveDate)}</span> },
    { key: 'requisitionNo', label: 'เลขที่ใบเบิก', render: (r) => <span style={dim(r)}>{r.requisitionNo}</span> },
    { key: 'material', label: 'รายการวัสดุ', flex: true, minWidth: 220, render: (r) => <span style={dim(r)}>{findSwMaterial(r.materialCode)?.name || r.materialCode}</span> },
    { key: 'category', label: 'หมวด', render: (r) => <span style={dim(r)}>{resolveSwCategory(findSwMaterial(r.materialCode)?.category)}</span> },
    { key: 'brand', label: 'ยี่ห้อ', render: (r) => <span style={dim(r)}>{r.brand || '—'}</span> },
    { key: 'formula', label: 'สูตร / ชนิด', flex: true, minWidth: 180, render: (r) => <span style={dim(r)}>{r.formula || '—'}</span> },
    { key: 'lot', label: 'Lot Number', render: (r) => <span style={dim(r)}>{r.lot}</span> },
    { key: 'expireDate', label: 'Expire Date', render: (r) => (r.status === 'cancelled' ? <span style={struck}>{formatSwDate(r.expireDate)}</span> : expiryBadge(r.expireDate)) },
    { key: 'source', label: 'รับมาจาก', flex: true, minWidth: 220, render: (r) => <span style={dim(r)}>{r.source}</span> },
    { key: 'qty', label: 'ปริมาณ', align: 'right', render: (r) => <span style={dim(r)}>{r.qty}</span> },
    { key: 'unit', label: 'หน่วยนับ', render: (r) => <span style={dim(r)}>{r.unit}</span> },
    { key: 'unitPrice', label: 'ราคาต่อหน่วย', align: 'right', render: (r) => <span style={dim(r)}>{formatBaht(r.unitPrice)}</span> },
    { key: 'amount', label: 'จำนวนเงิน', align: 'right', render: (r) => <span style={dim(r)}>{formatBaht((Number(r.qty) || 0) * (Number(r.unitPrice) || 0))}</span> },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? cancelBlock(r)
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>ใช้งาน</ColorfulBadge>),
    },
    {
      key: 'audit', label: 'ผู้บันทึก', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.recordedBy}<br />{formatSwDateTime(r.recordedAt)}
          {r.editedBy && <><br />แก้ไขโดย {r.editedBy} · {formatSwDateTime(r.editedAt)}</>}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => reactivate(r, 'receipt')}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openReceiptEdit(r)}>แก้ไข</BrandSubdueButton>
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={() => openCancel(r, 'receipt')}>ยกเลิก</DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canWrite]);

  const issueColumns = useMemo(() => ([
    { key: 'issueDate', label: 'วันที่จ่าย', render: (r) => <span style={dim(r)}>{formatSwDate(r.issueDate)}</span> },
    { key: 'hn', label: 'HN ผู้รับ', render: (r) => <span style={dim(r)}>{r.hn || '—'}</span> },
    { key: 'name', label: 'ชื่อผู้รับ', flex: true, minWidth: 180, render: (r) => <span style={dim(r)}>{r.name}</span> },
    {
      key: 'requestNo', label: 'เลขทะเบียนผู้ขอ',
      render: (r) => <span style={dim(r)}>{requesters.find((q) => q.id === r.requesterId)?.requestNo || '—'}</span>,
    },
    { key: 'material', label: 'รายการวัสดุ', flex: true, minWidth: 220, render: (r) => <span style={dim(r)}>{findSwMaterial(r.materialCode)?.name || r.materialCode}</span> },
    { key: 'lot', label: 'Lot Number', render: (r) => <span style={dim(r)}>{r.lot}</span> },
    { key: 'qty', label: 'จำนวนจ่าย', align: 'right', render: (r) => <span style={dim(r)}>{`${r.qty} ${r.unit || ''}`}</span> },
    { key: 'note', label: 'หมายเหตุ', flex: true, minWidth: 200, render: (r) => <span style={dim(r)}>{r.note || '—'}</span> },
    {
      key: 'status', label: 'สถานะ',
      render: (r) => (r.status === 'cancelled'
        ? cancelBlock(r)
        : <ColorfulBadge style='green' size='small' hierarchy='secondary'>จ่ายแล้ว</ColorfulBadge>),
    },
    {
      key: 'audit', label: 'ผู้จ่าย', sortable: false,
      render: (r) => (
        <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-secondary, #636B72)' }}>
          {r.issuedBy}<br />{formatSwDateTime(r.recordedAt)}
          {r.editedBy && <><br />แก้ไขโดย {r.editedBy} · {formatSwDateTime(r.editedAt)}</>}
        </span>
      ),
    },
    {
      key: 'actions', label: 'การดำเนินการ', sortable: false,
      render: (r) => (
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton size='sm' leadingIcon='print' onClick={() => doPrintSlip(r)}>พิมพ์ใบจ่าย</NeutralSubdueButton>
          {!canWrite ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary'>สิทธิไม่เพียงพอ</ColorfulBadge>
          ) : r.status === 'cancelled' ? (
            <BrandSubdueButton variant='outline' size='sm' leadingIcon='restart_alt' onClick={() => reactivate(r, 'issue')}>
              เปิดใช้งาน
            </BrandSubdueButton>
          ) : (
            <>
              <BrandSubdueButton variant='outline' size='sm' leadingIcon='edit' onClick={() => openIssueEdit(r)}>แก้ไข</BrandSubdueButton>
              <DangerSubdueButton size='sm' leadingIcon='block' onClick={() => openCancel(r, 'issue')}>ยกเลิก</DangerSubdueButton>
            </>
          )}
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick, canWrite, requesters]);

  const stockColumns = useMemo(() => ([
    { key: 'material', label: 'รายการวัสดุ', flex: true, minWidth: 240, render: (r) => findSwMaterial(r.materialCode)?.name || r.materialCode },
    { key: 'category', label: 'หมวด', render: (r) => resolveSwCategory(findSwMaterial(r.materialCode)?.category) },
    { key: 'lot', label: 'Lot Number' },
    { key: 'expireDate', label: 'Expire Date', render: (r) => expiryBadge(r.expireDate) },
    { key: 'received', label: 'รับเข้า', align: 'right' },
    { key: 'issued', label: 'จ่ายออก', align: 'right' },
    {
      key: 'remaining', label: 'คงเหลือ', align: 'right',
      render: (r) => (
        <ColorfulBadge style={r.remaining > 0 ? 'teal' : 'grey'} size='small' hierarchy='secondary'>
          {`${r.remaining} ${r.unit || ''}`}
        </ColorfulBadge>
      ),
    },
    { key: 'value', label: 'มูลค่าคงเหลือ', align: 'right', render: (r) => formatBaht(r.remaining * (Number(r.unitPrice) || 0)) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [tick]);

  const columns = tab === 'receive' ? receiptColumns : tab === 'issue' ? issueColumns : stockColumns;
  const rowKey = tab === 'stock' ? ((r) => r.key) : ((r) => r.id);

  const filtersActive = search.trim() !== '' || categoryFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => { setSearch(''); setCategoryFilter('all'); setStatusFilter('all'); setPage(1); };

  const requesterOptions = requesters
    .filter((r) => r.status !== 'cancelled' && r.status !== 'rejected')
    .map((r) => ({ value: r.id, label: `${r.requestNo} · ${r.name} (HN ${r.hn})` }));

  return (
    <QueuePageShell
      activeKey='treat'
      breadcrumb={breadcrumb}
      title='บันทึกรับ-จ่ายวัสดุงานสังคมสงเคราะห์'
      onBack={() => history.push('/clinic/social-work')}
      backLabel='กลับหน้าคิว'
      actions={(
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <NeutralSubdueButton
            size='sm'
            leadingIcon={canWrite ? 'lock_open' : 'lock'}
            onClick={toggleRightsDemo}
            title='สลับสิทธิงานสังคมสงเคราะห์ (สำหรับทดสอบ)'
          >
            {canWrite ? 'สิทธิ: เข้าถึงได้' : 'สิทธิ: ถูกจำกัด'}
          </NeutralSubdueButton>
          <BrandSubdueButton variant='outline' leadingIcon='assignment_ind' onClick={() => history.push('/clinic/social-work/requesters')}>
            ทะเบียนผู้ขอวัสดุ
          </BrandSubdueButton>
          {tab === 'issue' ? (
            <BrandButton leadingIcon='local_shipping' onClick={openIssueCreate} disabled={!canWrite}>
              บันทึกจ่ายวัสดุ
            </BrandButton>
          ) : (
            <BrandButton leadingIcon='add' onClick={openReceiptCreate} disabled={!canWrite}>
              บันทึกรับวัสดุ
            </BrandButton>
          )}
        </div>
      )}
      summaryCards={summaryCards}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(k) => { setTab(k); setPage(1); }}
    >
      {/* ── รับเข้า popup ─────────────────────────────────────────── */}
      <Popup
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        title={receiptForm.id ? 'แก้ไขรายการรับวัสดุ' : 'บันทึกรับวัสดุเข้าคลังงานสังคมสงเคราะห์'}
        subtitle='ตามแบบบันทึกรับวัสดุของระบบเดิม (เลขที่ใบเบิก · Lot · Expire · ปริมาณ · ราคาต่อหน่วย)'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setReceiptOpen(false) }}
        primaryAction={{ label: receiptForm.id ? 'บันทึกการแก้ไข' : 'บันทึกรับวัสดุ', onClick: saveReceipt }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='ศูนย์บริการสาธารณสุข'>
              <InputField value='ศบส. 21 วัดธาตุทอง (ตาม login)' onChange={() => {}} disabled />
            </SwField>
            <SwField label='วันที่รับ' required hint={receiptErrors.receiveDate} hintTone='error'>
              <DatePicker
                showLabel={false}
                value={receiptForm.receiveDate ? new Date(receiptForm.receiveDate) : null}
                onChange={(d) => setReceiptField('receiveDate')(d ? toLocalIso(d) : '')}
                placeholder='เลือกวันที่รับ'
              />
            </SwField>
            <SwField label='เลขที่ใบเบิก' required hint={receiptErrors.requisitionNo} hintTone='error'>
              <InputField
                value={receiptForm.requisitionNo}
                onChange={setReceiptField('requisitionNo')}
                error={receiptErrors.requisitionNo ? ' ' : undefined}
                placeholder='เช่น บ.6908-014'
              />
            </SwField>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='รายการวัสดุ' required hint={receiptErrors.materialCode} hintTone='error'>
              <Select
                showLabel={false} searchable size='lg'
                value={receiptForm.materialCode}
                onChange={setReceiptField('materialCode')}
                options={SW_MATERIAL_OPTIONS}
                placeholder='เลือกวัสดุ'
                error={receiptErrors.materialCode ? ' ' : undefined}
              />
            </SwField>
            <SwField label='ยี่ห้อ'>
              <InputField value={receiptForm.brand} onChange={setReceiptField('brand')} placeholder='เช่น เซอร์เทนตี้' />
            </SwField>
            <SwField label='สูตร / ชนิด'>
              <InputField value={receiptForm.formula} onChange={setReceiptField('formula')} placeholder='เช่น ไซส์ M (แบบเทป)' />
            </SwField>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='Lot Number' required hint={receiptErrors.lot} hintTone='error'>
              <InputField
                value={receiptForm.lot}
                onChange={setReceiptField('lot')}
                error={receiptErrors.lot ? ' ' : undefined}
                placeholder='เช่น LOT-DP2608A'
              />
            </SwField>
            <SwField
              label='Expire Date'
              required
              hint={receiptErrors.expireDate
                || (expireDays !== null && expireDays > 0 && expireDays <= EXPIRY_BLOCK_DAYS
                  ? `เตือน: วัสดุจะหมดอายุใน ${expireDays} วัน — ควรจ่ายออกก่อนล็อตอื่น`
                  : undefined)}
              hintTone={receiptErrors.expireDate ? 'error' : undefined}
            >
              <DatePicker
                showLabel={false}
                value={receiptForm.expireDate ? new Date(receiptForm.expireDate) : null}
                onChange={(d) => setReceiptField('expireDate')(d ? toLocalIso(d) : '')}
                placeholder='เลือกวันหมดอายุ'
              />
            </SwField>
            <SwField label='รับมาจาก' required hint={receiptErrors.source} hintTone='error'>
              <Select
                showLabel={false} searchable size='lg'
                value={receiptForm.source}
                onChange={setReceiptField('source')}
                options={SW_SUPPLY_SOURCES.map((s) => ({ value: s, label: s }))}
                placeholder='เลือกแหล่งที่มา'
                error={receiptErrors.source ? ' ' : undefined}
              />
            </SwField>
          </div>

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='ปริมาณ' required hint={receiptErrors.qty} hintTone='error' minWidth={140}>
              <InputField
                type='number'
                value={receiptForm.qty}
                onChange={setReceiptField('qty')}
                error={receiptErrors.qty ? ' ' : undefined}
                placeholder='0'
              />
            </SwField>
            <SwField label='หน่วยนับ' required hint={receiptErrors.unit} hintTone='error' minWidth={140}>
              <Select
                showLabel={false} searchable={false} size='lg'
                value={receiptForm.unit}
                onChange={setReceiptField('unit')}
                options={SW_UNITS.map((u) => ({ value: u, label: u }))}
                placeholder='เลือกหน่วย'
                error={receiptErrors.unit ? ' ' : undefined}
              />
            </SwField>
            <SwField label='ราคาต่อหน่วย (บาท)' required hint={receiptErrors.unitPrice} hintTone='error' minWidth={160}>
              <InputField
                type='number'
                value={receiptForm.unitPrice}
                onChange={setReceiptField('unitPrice')}
                error={receiptErrors.unitPrice ? ' ' : undefined}
                placeholder='0'
              />
            </SwField>
            <SwField label='จำนวนเงิน (คำนวณอัตโนมัติ)' minWidth={180}>
              <InputField value={formatBaht(receiptTotal)} onChange={() => {}} disabled />
            </SwField>
          </div>
        </div>
      </Popup>

      {/* ── จ่ายออก popup ─────────────────────────────────────────── */}
      <Popup
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={issueForm.id ? 'แก้ไขรายการจ่ายวัสดุ' : 'บันทึกจ่ายวัสดุ'}
        subtitle='จ่ายได้เฉพาะผู้ที่มีทะเบียนผู้ขอวัสดุ · ล็อตเริ่มต้นเลือกตามหลัก FEFO (หมดอายุก่อนจ่ายก่อน)'
        tertiaryAction={{ label: 'ยกเลิก', onClick: () => setIssueOpen(false) }}
        primaryAction={{ label: issueForm.id ? 'บันทึกการแก้ไข' : 'บันทึกจ่ายวัสดุ', onClick: saveIssue }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
          {requesterOptions.length === 0 && (
            <SwBanner tone='warning' icon='assignment_late'>
              ยังไม่มีผู้ขอวัสดุที่ใช้งานได้ในทะเบียน — ต้องลงทะเบียนผู้ขอก่อนจึงจะจ่ายวัสดุได้
            </SwBanner>
          )}
          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='วันที่จ่าย' required hint={issueErrors.issueDate} hintTone='error'>
              <DatePicker
                showLabel={false}
                value={issueForm.issueDate ? new Date(issueForm.issueDate) : null}
                onChange={(d) => setIssueField('issueDate')(d ? toLocalIso(d) : '')}
                placeholder='เลือกวันที่จ่าย'
              />
            </SwField>
            <SwField
              label='ผู้รับ (จากทะเบียนผู้ขอวัสดุ)'
              required
              hint={issueErrors.requesterId}
              hintTone='error'
            >
              <Select
                showLabel={false} searchable size='lg'
                value={issueForm.requesterId}
                onChange={setIssueField('requesterId')}
                options={requesterOptions}
                placeholder='ค้นหาเลขทะเบียนผู้ขอ / ชื่อ / HN'
                error={issueErrors.requesterId ? ' ' : undefined}
              />
            </SwField>
            <SwField label='ผู้จ่าย'>
              <InputField value={SW_SUPPLY_USER} onChange={() => {}} disabled />
            </SwField>
          </div>

          {issueErrors.requesterId && (
            <SwBanner
              tone='danger'
              icon='error'
              action={(
                <BrandSubdueButton
                  variant='outline' size='sm' leadingIcon='assignment_ind'
                  onClick={() => history.push('/clinic/social-work/requesters')}
                >
                  ไปทะเบียนผู้ขอวัสดุ
                </BrandSubdueButton>
              )}
            >
              {issueErrors.requesterId}
            </SwBanner>
          )}

          {issueRequester && (
            <SwBanner tone='neutral' icon='person'>
              {issueRequester.requestNo} · {issueRequester.name} (HN {issueRequester.hn}) ·
              สถานะคำขอ: {issueRequester.status === 'approved' ? 'อนุมัติแล้ว' : issueRequester.status === 'received' ? 'รับของแล้ว' : 'รอประเมิน'}
              {issueRequester.status === 'pending' ? ' — ควรประเมิน ADL และอนุมัติก่อนจ่าย' : ''}
            </SwBanner>
          )}

          <div className='flex items-start w-full flex-wrap' style={{ gap: 'var(--dim-space-400, 16px)' }}>
            <SwField label='รายการวัสดุ' required hint={issueErrors.materialCode} hintTone='error'>
              <Select
                showLabel={false} searchable size='lg'
                value={issueForm.materialCode}
                onChange={setIssueField('materialCode')}
                options={SW_MATERIAL_OPTIONS}
                placeholder='เลือกวัสดุ'
                error={issueErrors.materialCode ? ' ' : undefined}
              />
            </SwField>
            <SwField
              label='Lot ที่จ่าย (FEFO)'
              required
              hint={issueErrors.lot || (issueLots.length === 0 && issueForm.materialCode ? 'ไม่มีล็อตที่มียอดคงเหลือสำหรับวัสดุนี้' : undefined)}
              hintTone={issueErrors.lot ? 'error' : undefined}
            >
              <Select
                showLabel={false} searchable={false} size='lg'
                value={issueForm.lot}
                onChange={setIssueField('lot')}
                options={issueLots.map((l) => ({
                  value: l.lot,
                  label: `${l.lot} · หมดอายุ ${formatSwDate(l.expireDate)} · คงเหลือ ${l.remaining} ${l.unit}`,
                }))}
                placeholder='เลือกล็อต'
                error={issueErrors.lot ? ' ' : undefined}
              />
            </SwField>
            <SwField
              label='จำนวนจ่าย'
              required
              hint={issueErrors.qty || (issueRemaining !== null ? `คงเหลือในล็อตนี้ ${issueRemaining} ${findSwMaterial(issueForm.materialCode)?.unit || ''}` : undefined)}
              hintTone={issueErrors.qty ? 'error' : undefined}
              minWidth={160}
            >
              <InputField
                type='number'
                value={issueForm.qty}
                onChange={setIssueField('qty')}
                error={issueErrors.qty ? ' ' : undefined}
                placeholder='0'
              />
            </SwField>
          </div>

          <SwField label='หมายเหตุ'>
            <InputField value={issueForm.note} onChange={setIssueField('note')} placeholder='เช่น จ่ายรอบเดือนสิงหาคม / ผู้ดูแลรับแทน' />
          </SwField>
        </div>
      </Popup>

      {/* ── ยกเลิกรายการ ──────────────────────────────────────────── */}
      <Popup
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title={cancelTarget?.kind === 'receipt' ? 'ยกเลิกรายการรับวัสดุ' : 'ยกเลิกรายการจ่ายวัสดุ'}
        subtitle={cancelTarget ? `${findSwMaterial(cancelTarget.materialCode)?.name || ''} · Lot ${cancelTarget.lot} · จำนวน ${cancelTarget.qty}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setCancelTarget(null) }}
        primaryAction={{ label: 'ยืนยันยกเลิกรายการ', onClick: confirmCancel, tone: 'danger' }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            รายการที่ยกเลิกจะยังแสดงอยู่ในตารางแบบขีดฆ่า พร้อมชื่อผู้ยกเลิก เวลา และเหตุผล
            และยอดคงเหลือจะถูกคำนวณใหม่ทันที
          </span>
          <Textarea
            label='เหตุผลการยกเลิก'
            required
            value={cancelReason}
            onChange={(v) => { setCancelReason(v); if (v.trim()) setCancelError(''); }}
            error={cancelError || undefined}
            placeholder='เช่น บันทึกซ้ำ / ผู้รับขอเลื่อนรับของ / คีย์จำนวนผิด'
          />
        </div>
      </Popup>

      {/* ── ตัวอย่างใบจ่ายวัสดุ + print log ───────────────────────── */}
      <Popup
        open={!!printTarget}
        onClose={() => setPrintTarget(null)}
        title='ใบจ่ายวัสดุสังคมสงเคราะห์'
        subtitle={printTarget ? `${printTarget.name} · ${findSwMaterial(printTarget.materialCode)?.name} · ${printTarget.qty} ${printTarget.unit || ''}` : ''}
        tertiaryAction={{ label: 'ปิด', onClick: () => setPrintTarget(null) }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <span style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-secondary, #636B72)' }}>
            ระบบบันทึกการพิมพ์ทุกครั้ง (ผู้พิมพ์ + วันเวลา)
          </span>
          {printLog.map((e, i) => (
            <span key={`${e.at}-${i}`} style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
              พิมพ์{e.docType} โดย {e.by} · {formatSwDateTime(e.at)}
            </span>
          ))}
        </div>
      </Popup>

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{
          paddingTop: 'var(--dim-space-600, 24px)',
          paddingBottom: 'var(--dim-space-600, 24px)',
          paddingLeft: 'var(--dim-space-600, 24px)',
          paddingRight: 'var(--dim-space-600, 24px)',
          gap: 'var(--dim-space-600, 24px)',
        }}
      >
        {/* เชื่อมระบบคลัง — mock (แสดงผลอย่างเดียว) */}
        <SwBanner tone='neutral' icon='link'>
          เชื่อมข้อมูลกับ{SW_INVENTORY_LINK.system} · ซิงก์ล่าสุด {formatSwDateTime(SW_INVENTORY_LINK.lastSyncAt)} ·
          {` ${SW_INVENTORY_LINK.mode}`}
        </SwBanner>

        {!canWrite && (
          <SwBanner tone='warning' icon='lock'>
            บัญชีนี้ไม่มีสิทธิงานสังคมสงเคราะห์ — ดูบัญชีรับ-จ่ายได้ แต่บันทึก แก้ไข หรือยกเลิกรายการไม่ได้
          </SwBanner>
        )}

        {expiringLots.length > 0 && (
          <SwBanner tone='warning' icon='schedule'>
            มีวัสดุ {expiringLots.length} ล็อตที่ใกล้หมดอายุภายใน {EXPIRY_WARN_DAYS} วัน —
            แนะนำให้จ่ายออกตามหลัก FEFO ก่อนล็อตอื่น ({expiringLots.slice(0, 3).map((l) => `${findSwMaterial(l.materialCode)?.name} (${l.lot})`).join(' · ')})
          </SwBanner>
        )}

        {banner && (
          <SwBanner
            tone={banner.tone}
            icon={banner.tone === 'brand' ? 'check-circle' : 'warning'}
            onClose={() => setBanner(null)}
            action={banner.action === 'requester' ? (
              <BrandSubdueButton
                variant='outline' size='sm' leadingIcon='assignment_ind'
                onClick={() => history.push('/clinic/social-work/requesters')}
              >
                ลงทะเบียนผู้ขอวัสดุ
              </BrandSubdueButton>
            ) : undefined}
          >
            {banner.text}
          </SwBanner>
        )}

        <section
          className='w-full flex flex-col'
          style={{
            background: 'var(--surface-card-100, #FFFFFF)',
            borderRadius: 'var(--dim-radius-500, 16px)',
            border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
            boxShadow: 'var(--shadow-card-strong)',
            paddingTop: 'var(--dim-space-600, 24px)',
            paddingBottom: 'var(--dim-space-600, 24px)',
            paddingLeft: 'var(--dim-space-600, 24px)',
            paddingRight: 'var(--dim-space-600, 24px)',
            gap: 'var(--dim-space-400, 16px)',
          }}
        >
          <SwSectionHeader
            icon={tab === 'receive' ? 'download' : tab === 'issue' ? 'upload' : 'inventory'}
            aside={(
              <span style={{ fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                ยอดคงเหลือรวมทุกหมวด {stockByCategory.reduce((s, c) => s + c.remaining, 0)} หน่วย
              </span>
            )}
          >
            {tab === 'receive' ? 'บัญชีรับวัสดุเข้า' : tab === 'issue' ? 'บัญชีจ่ายวัสดุออก' : 'ยอดคงเหลือรายล็อต'}
          </SwSectionHeader>

          <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <SwInlineSearch
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
              placeholder='ค้นหาเลขที่ใบเบิก / Lot / ชื่อวัสดุ / ชื่อผู้รับ'
            />
            <Select
              showLabel={false} searchable={false} size='md'
              value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPage(1); }}
              options={[{ value: 'all', label: 'ทุกหมวดวัสดุ' }, ...SW_MATERIAL_CATEGORIES]}
              placeholder='หมวดวัสดุ'
            />
            {tab !== 'stock' && (
              <Select
                showLabel={false} searchable={false} size='md'
                value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }}
                options={[
                  { value: 'all', label: 'ทุกสถานะ' },
                  { value: 'active', label: 'ใช้งาน' },
                  { value: 'cancelled', label: 'ยกเลิกแล้ว' },
                ]}
                placeholder='สถานะ'
              />
            )}
            {filtersActive && (
              <NeutralSubdueButton variant='outline' size='sm' onClick={clearFilters}>ล้างตัวกรอง</NeutralSubdueButton>
            )}
          </div>

          {activeRows.length === 0 ? (
            <SwEmptyHint icon={filtersActive ? 'search_off' : 'inventory_2'}>
              {filtersActive
                ? `ไม่พบรายการที่ตรงกับ${search.trim() ? ` "${search.trim()}"` : 'ตัวกรองที่เลือก'} — ลองล้างตัวกรอง`
                : tab === 'receive'
                  ? 'ยังไม่มีรายการรับวัสดุเข้า — กด "บันทึกรับวัสดุ" เพื่อเริ่มบันทึก'
                  : tab === 'issue'
                    ? 'ยังไม่มีรายการจ่ายวัสดุออก'
                    : 'ยังไม่มียอดคงเหลือในคลังงานสังคมสงเคราะห์'}
            </SwEmptyHint>
          ) : (
            <Table
              columns={columns}
              rows={pageRows}
              rowKey={rowKey}
              emptyMessage='ไม่มีรายการ'
            />
          )}

          <SwPagerBar total={activeRows.length} page={page} pageSize={PAGE_SIZE}>
            <Pagination currentPage={page} pageCount={totalPages} onPageChange={setPage} />
          </SwPagerBar>
        </section>

        <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)', fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
          <Icon name='info' size={14} />
          จำนวนเงิน = ปริมาณ × ราคาต่อหน่วย (คำนวณอัตโนมัติ) · รายการที่ยกเลิกยังคงแสดงเพื่อการตรวจสอบย้อนหลัง
        </span>
      </div>
    </QueuePageShell>
  );
};

export default SocialWorkSupplyPage;
