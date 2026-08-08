import React, { useEffect, useMemo, useState } from 'react';
import QueuePageShell from '@/templates/QueuePageShell';
import PrimarySearch from '@/components/search/PrimarySearch';
import useSearchHistory from '@/components/search/useSearchHistory';
import Table from '@/components/table/Table';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandButton from '@/components/button/BrandButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import Select from '@/components/forms/Select';
import DatePickerRange from '@/components/forms/DatePickerRange';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import ConsentIdentityVerifyPopup from '@/components/popup/ConsentIdentityVerifyPopup';
import Icon from '@/components/icons/Icon';
import { getConsentRecords, subscribeConsentStore } from '@/data/consentWorkflowStore';
import { canManageConsent } from '@/data/consentPermissions';
import {
  CONSENT_PATIENT_SEARCH_POOL,
  consentPatientSearchHistorySeed,
  consentPatientSearchSuggestions,
  toConsentPatientSearchItem,
} from '@/data/consentPatientSearch';
import {
  CONSENT_LEVELS, LEVEL_BY_KEY, DATA_CATEGORIES, MATRIX_ROLES,
  LEVEL_DEFAULT_MATRIX, TYPE_TO_LEVEL, RIGHTS_HISTORY_SEED, RIGHTS_OVERRIDE_SEED,
} from '@/data/consentAccessLevels';
import SYSTEM_NAV from '@/pages/system/systemNav';

/* PHCIS | สิทธิเข้าถึงข้อมูลผู้ป่วยตามระดับความยินยอม
   (TOR ด.1.1.18 + ด.1.1.14) — /assess/consent-access-rights (จัดการระบบ).

   ค้นผู้ป่วย (HN) → แสดงระดับความยินยอมที่ลงนาม (จาก consent record จริงของ
   worklist) และ matrix สิทธิ: แถว = หมวดข้อมูล (ศัพท์ HCIS — ชุดเดียวกับ
   DATA_TYPES ในรายงาน) · คอลัมน์ = บทบาทผู้ใช้ (Admin/Editor/Viewer) พร้อม
   สถานะเข้าถึงได้/ไม่ได้. เพิ่มสิทธิ (หมวด+บทบาท+ช่วงเวลา+อ้างเอกสาร) และ
   ยกเลิกสิทธิ ผ่าน confirm + identity verify + audit. แผงล่าง = timeline
   ประวัติการเพิ่ม/ยกเลิกสิทธิ.

   ด.1.1.14: ผู้ใช้ role Viewer เห็น read-only — ปุ่มเพิ่ม/ยกเลิกถูก "ซ่อน"
   ทั้งหมด (ไม่ใช่แค่ disabled) + banner สิทธิไม่พอ. บทบาทปัจจุบัน derive
   จากอีเมลที่ login (mock session). ข้อมูลทั้งหมด mock local. */

const STAFF_NAME = 'ลดา ดีงาม';

const SHELL = {
  sidebarItems: SYSTEM_NAV,
  sidebarFallbackKey: 'system-consent-access-rights',
  brandTitle: 'จัดการระบบ',
  breadcrumb: ['จัดการระบบ', 'สิทธิเข้าถึงตามความยินยอม'],
  activeKey: 'system-consent-access-rights',
};

const BODY_TEXT = {
  color: 'var(--text-content-secondary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.6,
};
const TITLE_TEXT = {
  color: 'var(--text-brandPrimary-default)',
  fontFamily: 'var(--type-family-heading-graphic2)',
  fontSize: 'var(--type-size-base)',
  fontWeight: 'var(--type-weight-regular, 400)',
  lineHeight: 1.4,
};
const MUTED_XS = { ...BODY_TEXT, color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs)' };
const CARD_STYLE = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

const isoFormat = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const isoParse = (s) => (s ? new Date(`${s}T00:00:00`) : null);
const nowThai = () => new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

/* ระดับความยินยอมของผู้ป่วยจาก record ที่ลงนามและยังมีผล */
const levelOfPatient = (records) => {
  const live = records.filter((r) => ['ยินยอมแล้ว', 'ถูกแทนที่ด้วยเวอร์ชันใหม่', 'มีเวอร์ชันใหม่', 'ใกล้หมดอายุ'].includes(r.status));
  if (live.length === 0) return 'none';
  if (live.some((r) => r.type === 'PDPA')) return 'full';
  if (live.some((r) => ['ผ่าตัด', 'การรักษา', 'เลือด'].includes(r.type))) return 'treatment';
  if (live.some((r) => r.type === 'การวิจัย')) return 'research';
  return TYPE_TO_LEVEL[live[0].type] || 'partial';
};

export default function ConsentAccessRightsPage() {
  const [consentRecords, setConsentRecordsState] = useState(getConsentRecords);
  useEffect(() => subscribeConsentStore(() => setConsentRecordsState(getConsentRecords())), []);

  const canManage = canManageConsent();

  const [search, setSearch] = useState('');
  const [selectedHn, setSelectedHn] = useState(null);
  const [notFound, setNotFound] = useState(false);
  /* overrides: `${hn}:${cat}:${role}` → true (grant) / false (revoke) */
  const [overrides, setOverrides] = useState(() => ({ ...RIGHTS_OVERRIDE_SEED }));
  const [historyByHn, setHistoryByHn] = useState(() => {
    const clone = {};
    Object.keys(RIGHTS_HISTORY_SEED).forEach((k) => { clone[k] = [...RIGHTS_HISTORY_SEED[k]]; });
    return clone;
  });
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeFor, setRevokeFor] = useState(null);     // { category }
  const [revokeRole, setRevokeRole] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [verifyNext, setVerifyNext] = useState(null);   // 'grant' | 'revoke'
  const [pendingRevoke, setPendingRevoke] = useState(null);
  const [toast, setToast] = useState(null);
  const { history: searchHistory, push: pushHistory, clear: clearHistory } =
    useSearchHistory('mih:primarysearch-history:consent-rights', {
      seedIfEmpty: consentPatientSearchHistorySeed(4),
    });

  const searchSuggestions = useMemo(
    () => consentPatientSearchSuggestions(search),
    [search],
  );

  /* grant popup fields */
  const [gCategory, setGCategory] = useState('');
  const [gRole, setGRole] = useState('');
  const [gRange, setGRange] = useState(['', '']);
  const [gRef, setGRef] = useState('');

  const pushToast = (message) => setToast({ id: Date.now(), variant: 'success', message });

  const patientRecords = useMemo(
    () => (selectedHn ? consentRecords.filter((r) => r.hn === selectedHn) : []),
    [selectedHn, consentRecords],
  );
  const patient = patientRecords[0] || null;
  const levelKey = useMemo(() => levelOfPatient(patientRecords), [patientRecords]);
  const level = LEVEL_BY_KEY[levelKey];
  const signedDocs = useMemo(() => patientRecords
    .filter((r) => ['ยินยอมแล้ว', 'ถูกแทนที่ด้วยเวอร์ชันใหม่', 'มีเวอร์ชันใหม่', 'ใกล้หมดอายุ'].includes(r.status))
    .map((r) => ({ value: `${r.type} ${r.version}`, label: `${r.type} · ${r.version} (ลงนาม ${r.signedDate})` })), [patientRecords]);

  const handleSubmit = (value, item) => {
    const q = (value || '').trim();
    if (!q) { setSelectedHn(null); setNotFound(false); return; }
    const fromItem = item?.id && CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === item.id);
    const hit = fromItem
      || consentRecords.find((r) =>
        r.hn.toLowerCase() === q.toLowerCase()
        || r.hn.toLowerCase().includes(q.toLowerCase())
        || r.name.includes(q))
      || CONSENT_PATIENT_SEARCH_POOL.find((p) =>
        p.hn.toLowerCase() === q.toLowerCase()
        || p.label.includes(q)
        || p.name.includes(q));
    if (hit) {
      const hn = hit.hn;
      const pool = CONSENT_PATIENT_SEARCH_POOL.find((p) => p.hn === hn);
      pushHistory(pool ? toConsentPatientSearchItem(pool) : { label: q, value: q });
      setSelectedHn(hn);
      setNotFound(false);
      setSearch('');
    } else {
      pushHistory({ label: q, value: q });
      setSelectedHn(null);
      setNotFound(true);
    }
  };

  /* สิทธิ effective = ค่า default ตามระดับความยินยอม ± overrides */
  const hasAccess = (catKey, role) => {
    const ov = overrides[`${selectedHn}:${catKey}:${role}`];
    if (ov === true) return true;
    if (ov === false) return false;
    return ((LEVEL_DEFAULT_MATRIX[levelKey] || {})[catKey] || []).includes(role);
  };

  const appendHistory = (entry) => {
    setHistoryByHn((prev) => ({
      ...prev,
      [selectedHn]: [{ id: `h-${Date.now()}`, ...entry }, ...(prev[selectedHn] || [])],
    }));
  };

  /* ── เพิ่มสิทธิ ── */
  const openGrant = () => {
    setGCategory(''); setGRole(''); setGRange(['', '']); setGRef('');
    setVerifyNext('grant');
  };
  const [gStart, gEnd] = gRange;
  const gInvalid = !!gStart && !!gEnd && gEnd < gStart;
  const grantReady = gCategory && gRole && gStart && gEnd && !gInvalid && gRef;
  const runGrant = () => {
    if (!grantReady) return;
    const cat = DATA_CATEGORIES.find((c) => c.key === gCategory);
    setOverrides((prev) => ({ ...prev, [`${selectedHn}:${gCategory}:${gRole}`]: true }));
    appendHistory({
      action: 'เพิ่มสิทธิ', category: cat.label, role: gRole,
      period: `${gStart} – ${gEnd}`, by: STAFF_NAME, at: nowThai(), ref: gRef,
    });
    setGrantOpen(false);
    pushToast(`เพิ่มสิทธิ ${gRole} เข้าถึง "${cat.label}" แล้ว (อ้างอิง ${gRef})`);
  };

  /* ── ยกเลิกสิทธิ ── */
  const openRevoke = (category) => {
    setPendingRevoke({ category });
    setVerifyNext('revoke');
  };
  const revokeRoles = revokeFor
    ? MATRIX_ROLES.filter((r) => hasAccess(revokeFor.category.key, r.key)).map((r) => ({ value: r.key, label: r.key }))
    : [];
  const runRevoke = () => {
    if (!revokeFor || !revokeRole) return;
    setOverrides((prev) => ({ ...prev, [`${selectedHn}:${revokeFor.category.key}:${revokeRole}`]: false }));
    appendHistory({
      action: 'ยกเลิกสิทธิ', category: revokeFor.category.label, role: revokeRole,
      period: '-', by: STAFF_NAME, at: nowThai(), ref: 'คำสั่งเจ้าหน้าที่ (ผ่านการพิสูจน์ตัวตน)',
    });
    pushToast(`ยกเลิกสิทธิ ${revokeRole} เข้าถึง "${revokeFor.category.label}" แล้ว — เก็บใน audit trail`);
    setRevokeConfirm(false);
    setRevokeFor(null);
    setRevokeRole('');
  };

  /* ── matrix columns ── */
  const matrixColumns = useMemo(() => {
    const cols = [
      {
        key: 'category', header: 'หมวดข้อมูล (HCIS)',
        render: (r) => (
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <Icon name={r.icon} size={18} color='var(--text-brandPrimary-default)' />
            <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{r.label}</span>
          </div>
        ),
      },
      ...MATRIX_ROLES.map((role) => ({
        key: role.key, header: role.key,
        render: (r) => (hasAccess(r.key, role.key)
          ? <ColorfulBadge style='green' size='small' hierarchy='secondary' width='hug'>เข้าถึงได้</ColorfulBadge>
          : <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>ไม่ได้</ColorfulBadge>)})),
    ];
    if (canManage) {
      cols.push({
        key: 'manage', header: 'การจัดการ',
        render: (r) => (
          <NeutralSubdueButton
            size='sm'
            leadingIcon='do_not_disturb_on'
            disabled={!MATRIX_ROLES.some((role) => hasAccess(r.key, role.key))}
            onClick={() => openRevoke(r)}
          >
            ยกเลิกสิทธิ
          </NeutralSubdueButton>
        ),
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHn, levelKey, overrides, canManage]);

  const historyEntries = (selectedHn && historyByHn[selectedHn]) || [];

  return (
    <>
      <QueuePageShell
        activeKey={SHELL.activeKey}
        sidebarItems={SHELL.sidebarItems}
        sidebarFallbackKey={SHELL.sidebarFallbackKey}
        brandTitle={SHELL.brandTitle}
        breadcrumb={SHELL.breadcrumb}
        title='สิทธิเข้าถึงตามความยินยอม'
      >
        <div className='flex flex-col flex-1 min-w-0' style={{ padding: 'var(--dim-space-600)', gap: 'var(--dim-space-400)' }}>
          {/* ด.1.1.14 — Viewer read-only banner (ปุ่มจัดการถูกซ่อนทั้งหมด) */}
          {!canManage && (
            <div
              className='flex items-start w-full'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)',
                paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)',
                background: 'var(--surface-statussummarycard-inprogress, #FFEDD5)',
                borderRadius: 'var(--dim-radius-300)',
              }}
            >
              <Icon name='lock' size={18} color='var(--text-statussummarycard-inprogress-number, #C2410C)' />
              <span style={{ ...BODY_TEXT, color: 'var(--text-statussummarycard-inprogress-number, #C2410C)' }}>
                สิทธิ์ของคุณ (Viewer) ดูข้อมูลได้อย่างเดียว — การเพิ่ม/ยกเลิกสิทธิถูกปิดไว้ ติดต่อผู้ดูแลระบบหากต้องการแก้ไข
              </span>
            </div>
          )}

          {/* ค้นหาผู้ป่วย */}
          <section className='w-full flex flex-col items-center' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
            <PrimarySearch
              value={search}
              onChange={setSearch}
              onSubmit={handleSubmit}
              placeholder='ค้นหา HN / เลขบัตร / Passport / ชื่อ-สกุล / โทรศัพท์'
              width={640}
              suggestions={searchSuggestions}
              history={searchHistory}
              onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
            />
            {notFound && (
              <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
                <span style={{ ...BODY_TEXT, color: 'var(--text-danger-default, #B91C1C)' }}>ไม่พบผู้ป่วยที่ค้นหา</span>
                <span style={MUTED_XS}>ตรวจสอบ HN (เช่น 67-00008) หรือชื่อ-นามสกุลอีกครั้ง</span>
              </div>
            )}
            {!selectedHn && !notFound && (
              <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
                <Icon name='person_search' size={28} color='var(--text-content-tertiary)' />
                <span style={BODY_TEXT}>ค้นหาผู้ป่วยเพื่อดูระดับความยินยอมและ matrix สิทธิการเข้าถึง</span>
              </div>
            )}
          </section>

          {patient && (
            <>
              {/* บริบทผู้ป่วย + ระดับความยินยอม */}
              <section className='w-full flex items-center flex-wrap' style={{ ...CARD_STYLE, gap: 'var(--dim-space-500)' }}>
                <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100)', flex: 1 }}>
                  <span style={{ ...TITLE_TEXT }}>{patient.name} · HN {patient.hn}</span>
                  {patient.guardian && <span style={MUTED_XS}>ผู้แทนโดยชอบธรรม: {patient.guardian}</span>}
                  <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                    <span style={BODY_TEXT}>ระดับความยินยอมที่ลงนาม:</span>
                    <ColorfulBadge style={level.tone} size='small' hierarchy='secondary' width='hug'>{level.label}</ColorfulBadge>
                    {patientRecords.filter((r) => ['ยินยอมแล้ว', 'ถูกแทนที่ด้วยเวอร์ชันใหม่', 'มีเวอร์ชันใหม่', 'ใกล้หมดอายุ'].includes(r.status)).map((r) => (
                      <ColorfulBadge key={r.id} style='blue' size='small' hierarchy='secondary' width='hug'>{r.version}</ColorfulBadge>
                    ))}
                  </div>
                  <span style={MUTED_XS}>{level.description}</span>
                </div>
                {canManage && levelKey !== 'none' && (
                  <BrandButton variant='fill' size='md' leadingIcon='add' onClick={openGrant}>
                    เพิ่มสิทธิ
                  </BrandButton>
                )}
              </section>

              {/* Matrix ระดับความยินยอม × หมวดข้อมูล × บทบาท */}
              <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
                <h2 style={TITLE_TEXT}>Matrix สิทธิการเข้าถึง (ตามระดับความยินยอม: {level.label})</h2>
                {levelKey === 'none' ? (
                  <div className='flex items-start' style={{ gap: 'var(--dim-space-200)', paddingTop: 'var(--dim-space-300)', paddingRight: 'var(--dim-space-400)', paddingBottom: 'var(--dim-space-300)', paddingLeft: 'var(--dim-space-400)', background: 'var(--surface-danger-tertiary, #FEE2E2)', borderRadius: 'var(--dim-radius-300)' }}>
                    <Icon name='warning' size={18} color='var(--text-danger-default, #B91C1C)' />
                    <span style={{ ...BODY_TEXT, color: 'var(--text-danger-default, #B91C1C)' }}>
                      ผู้ป่วยยังไม่มีเอกสารความยินยอมที่มีผล — ทุกหมวดเข้าถึงไม่ได้ ส่งคำขอความยินยอมจากหน้าจัดการความยินยอมก่อน
                    </span>
                  </div>
                ) : null}
                <Table
                  columns={matrixColumns}
                  rows={DATA_CATEGORIES}
                  rowKey={(r) => r.key}
                  emptyMessage='ไม่มีหมวดข้อมูล'
                />
                <span style={MUTED_XS}>
                  สิทธิพื้นฐานมาจากระดับความยินยอมที่ลงนาม — การเพิ่ม/ยกเลิกรายหมวดจะทับค่าพื้นฐานและถูกบันทึกใน audit trail (ไม่มี hard delete)
                </span>
              </section>

              {/* Timeline ประวัติการเพิ่ม/ยกเลิกสิทธิ */}
              <section className='w-full flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-400)' }}>
                <h2 style={TITLE_TEXT}>ประวัติการเพิ่ม / ยกเลิกสิทธิ</h2>
                {historyEntries.length === 0 ? (
                  <span style={BODY_TEXT}>ยังไม่มีประวัติการปรับสิทธิของผู้ป่วยรายนี้</span>
                ) : (
                  <div className='flex flex-col w-full'>
                    {historyEntries.map((h, i) => (
                      <div key={h.id} className='flex items-stretch' style={{ gap: 'var(--dim-space-300)' }}>
                        <div className='flex flex-col items-center' style={{ width: 24, flexShrink: 0 }}>
                          <span
                            aria-hidden
                            className='inline-flex items-center justify-center'
                            style={{
                              width: 22, height: 22, borderRadius: 'var(--dim-radius-full)',
                              background: h.action === 'เพิ่มสิทธิ' ? 'var(--surface-statussummarycard-positive, #D1F6EE)' : 'var(--surface-danger-tertiary, #FEE2E2)',
                              color: h.action === 'เพิ่มสิทธิ' ? 'var(--text-statussummarycard-positive-number, #196C65)' : 'var(--text-danger-default, #B91C1C)',
                              flexShrink: 0,
                            }}
                          >
                            <Icon name={h.action === 'เพิ่มสิทธิ' ? 'add' : 'remove'} size={14} />
                          </span>
                          {i < historyEntries.length - 1 && (
                            <span aria-hidden style={{ width: 'var(--dim-stroke-100)', flex: 1, background: 'var(--border-neutral-tertiary)' }} />
                          )}
                        </div>
                        <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-050)', paddingBottom: 'var(--dim-space-400)' }}>
                          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                            <ColorfulBadge style={h.action === 'เพิ่มสิทธิ' ? 'green' : 'red'} size='small' hierarchy='secondary' width='hug'>{h.action}</ColorfulBadge>
                            <span style={{ ...BODY_TEXT, color: 'var(--text-content-default)', fontWeight: 'var(--type-weight-medium)' }}>{h.category}</span>
                            <ColorfulBadge style='blue' size='small' hierarchy='secondary' width='hug'>{h.role}</ColorfulBadge>
                            {h.period && h.period !== '-' && <span style={MUTED_XS}>ช่วงเวลา {h.period}</span>}
                          </div>
                          <span style={MUTED_XS}>โดย {h.by} · {h.at} · อ้างอิง: {h.ref}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <ConsentAuditBar recordedBy={STAFF_NAME} recordedAt={nowThai()} />
              </section>
            </>
          )}
        </div>
      </QueuePageShell>

      {/* ด.1.1.1 — พิสูจน์ตัวตนก่อนเพิ่ม/ยกเลิกสิทธิแทนเจ้าของข้อมูล */}
      <ConsentIdentityVerifyPopup
        open={!!verifyNext}
        onClose={() => { setVerifyNext(null); setPendingRevoke(null); }}
        onVerified={() => {
          const next = verifyNext;
          setVerifyNext(null);
          if (next === 'grant') setGrantOpen(true);
          else if (next === 'revoke' && pendingRevoke) {
            setRevokeFor(pendingRevoke);
            setRevokeRole('');
            setPendingRevoke(null);
          }
        }}
        actionLabel={verifyNext === 'grant' ? 'เพิ่มสิทธิเข้าถึงข้อมูลผู้ป่วย' : 'ยกเลิกสิทธิเข้าถึงข้อมูลผู้ป่วย'}
        patientName={patient ? patient.name : undefined}
        hn={selectedHn || undefined}
      />

      {/* เพิ่มสิทธิ — หมวด + บทบาท + ช่วงเวลา + อ้างเอกสารยินยอม */}
      <Popup
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        size='large'
        title='เพิ่มสิทธิเข้าถึงข้อมูล'
        subtitle={patient ? `${patient.name} · HN ${patient.hn} · ระดับความยินยอม: ${level ? level.label : '-'}` : undefined}
        primaryAction={{ label: 'เพิ่มสิทธิ', onClick: runGrant, disabled: !grantReady }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setGrantOpen(false) }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <Select
            label='หมวดข้อมูล'
            required
            options={DATA_CATEGORIES.map((c) => ({ value: c.key, label: c.label }))}
            value={gCategory}
            onChange={setGCategory}
            placeholder='เลือกหมวดข้อมูล'
            searchable={false}
          />
          <Select
            label='บทบาทผู้ใช้ที่ได้รับสิทธิ'
            required
            options={MATRIX_ROLES.map((r) => ({ value: r.key, label: r.key }))}
            value={gRole}
            onChange={setGRole}
            placeholder='เลือกบทบาท'
            searchable={false}
          />
          <DatePickerRange
            label='ช่วงเวลาสิทธิ (เริ่มต้น - สิ้นสุด)'
            required
            value={gRange}
            onChange={setGRange}
            format={isoFormat}
            parse={isoParse}
            error={gInvalid ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
            helperText={gInvalid ? 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มต้น' : undefined}
          />
          <Select
            label='อ้างอิงเอกสารความยินยอมที่ลงนาม'
            required
            options={signedDocs}
            value={gRef}
            onChange={setGRef}
            placeholder={signedDocs.length ? 'เลือกเอกสารอ้างอิง' : 'ไม่มีเอกสารที่ลงนาม'}
            searchable={false}
            disabled={signedDocs.length === 0}
          />
        </div>
      </Popup>

      {/* ยกเลิกสิทธิ — เลือกบทบาท → AlertDialog destructive */}
      <Popup
        open={!!revokeFor}
        onClose={() => { setRevokeFor(null); setRevokeRole(''); }}
        size='default'
        title='ยกเลิกสิทธิเข้าถึงข้อมูล'
        subtitle={revokeFor ? `หมวด: ${revokeFor.category.label}` : undefined}
        primaryAction={{ label: 'ยกเลิกสิทธิ', onClick: () => revokeRole && setRevokeConfirm(true), disabled: !revokeRole }}
        secondaryAction={{ label: 'ปิด', onClick: () => { setRevokeFor(null); setRevokeRole(''); } }}
      >
        <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
          <span style={BODY_TEXT}>
            เลือกบทบาทที่ต้องการยกเลิกสิทธิ — การยกเลิกถูกบันทึกใน audit trail และย้อนดูได้จากประวัติ (ไม่มี hard delete)
          </span>
          <Select
            label='บทบาทที่ยกเลิกสิทธิ'
            required
            options={revokeRoles}
            value={revokeRole}
            onChange={setRevokeRole}
            placeholder='เลือกบทบาท'
            searchable={false}
          />
        </div>
      </Popup>
      <AlertDialog
        open={revokeConfirm}
        type='destructive'
        title='ยืนยันการยกเลิกสิทธิ?'
        description={revokeFor ? `ยกเลิกสิทธิ ${revokeRole} เข้าถึง "${revokeFor.category.label}" ของ HN ${selectedHn} — มีผลทันที` : ''}
        confirmLabel='ยกเลิกสิทธิ'
        cancelLabel='กลับ'
        onConfirm={runRevoke}
        onCancel={() => setRevokeConfirm(false)}
        onClose={() => setRevokeConfirm(false)}
      />

      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
