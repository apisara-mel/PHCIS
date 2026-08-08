import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import useSearchHistory from '@/components/search/useSearchHistory';
import PatientCard from '@/components/card/PatientCard';
import { PATIENT_PROFILES } from '@/data/patientProfiles';
import Alert from '@/components/alert/Alert';
import Icon from '@/components/icons/Icon';
import StatusBadge from '@/components/badge/StatusBadge';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import FilterTag from '@/components/forms/FilterTag';
import Popup from '@/components/popup/Popup';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import DangerSubdueButton from '@/components/button/DangerSubdueButton';
import {
  SectionCard,
  FieldGrid,
  ReadField,
  EmptyState,
  AuditList,
  AuditNote,
  LookupPopup,
  ReasonPopup,
  PermissionHint,
  T,
} from '@/pages/rights/rightsUi';
import {
  searchPatients,
  patientByHn,
  getHnRights,
  rightsById,
  HOSPITAL_CODES,
  hospitalByCode,
  runNhsoCheck,
  recordNhsoCheck,
  nhsoStatusMeta,
  setRightsCardActivated,
  setRightsCardHospitals,
  setCivilConfirmation,
  isCompleteNationalId,
  maskNationalId,
  formatNationalIdFull,
  parseThaiBuddhistDate,
} from '@/data/rightsClaimStore';

/* §1.7.1.1 เช็คสิทธิจากระบบ สปสช. + §1.7.2.1 Activate + §1.7.2.4 รหัส
   สถานพยาบาลหลัก/รอง + §1.7.2.5 ยืนยันสิทธิข้าราชการ.

   Division of labour with Registration (deliberate, per the wave brief):
   the rights *cards* themselves belong to /registration/register Step 4 and
   are rendered read-only here with a jump link. The three facts Step 4 does
   not model — activation state, facility codes, and the direct-billing
   confirmation — are owned by this screen and stored in rightsClaimStore
   keyed by HN. In production these must be ONE record; today they are two
   mocks that do not sync, and the on-screen note says so. */

const SEARCH_HISTORY_KEY = 'mih:primarysearch-history:rights-check';

/* Dev-only outcome switch. §1.7.1.1's failure paths (สิทธิหมดอายุ / ไม่พบสิทธิ /
   เชื่อมต่อไม่ได้) are impossible to demo from a happy-path mock, so QA can
   force each branch instead of hunting for a patient that triggers it. */
const CHECK_MODES = [
  { key: 'auto',     label: 'ผลจริงตามข้อมูล', icon: 'bolt' },
  { key: 'expired',  label: 'บังคับ: หมดอายุ',  icon: 'schedule' },
  { key: 'notFound', label: 'บังคับ: ไม่พบสิทธิ', icon: 'person_off' },
  { key: 'offline',  label: 'บังคับ: เชื่อมต่อไม่ได้', icon: 'cloud_off' },
];

const patientToSearchItem = (p) => ({
  id: p.hn,
  label: p.shortName,
  sublabel: p.insurance,
  value: p.shortName,
  avatarSrc: p.avatarUrl,
  badges: [
    { label: p.hn, tone: 'indigo' },
    { label: maskNationalId(p.nationalId), tone: 'teal' },
  ],
});

const hospitalLabel = (code) => {
  const h = hospitalByCode(code);
  if (!h) return null;
  return `${h.code} — ${h.name}`;
};

/* One rights card: read-only rights identity from Registration + the
   editable /rights-owned fields beneath it. */
const RightsCardBlock = ({ hn, card, role, onOpenLookup }) => {
  const rights = rightsById(card.rightsId);
  const [civilPopup, setCivilPopup] = useState(false);
  const [unconfirmPopup, setUnconfirmPopup] = useState(false);
  const [deactivatePopup, setDeactivatePopup] = useState(false);

  /* endDate is a Thai Buddhist display string ("8 สิงหาคม 2569"); compare via
     the shared parser rather than string ordering. */
  const expired = useMemo(() => {
    const end = parseThaiBuddhistDate(card.endDate);
    if (!end) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end.getTime() < today.getTime();
  }, [card.endDate]);

  const canEdit = role.canEdit;
  const needsCivil = !!rights?.requiresCivilConfirm;

  return (
    <SectionCard
      title={`${card.groupTitle}${card.primary ? ' (สิทธิหลัก)' : ''}`}
      subtitle={rights ? `${rights.code} · ${rights.name}` : 'ยังไม่ระบุสิทธิในทะเบียน'}
      icon={card.primary ? 'verified_user' : 'shield'}
      actions={(
        <>
          {card.activated
            ? <StatusBadge style='success' icon='check_circle' size='small'>เปิดใช้งานแล้ว</StatusBadge>
            : <StatusBadge style='neutral' icon='pause_circle' size='small'>ยังไม่เปิดใช้งาน</StatusBadge>}
          {expired && <StatusBadge style='error' icon='schedule' size='small'>หมดอายุ</StatusBadge>}
          {needsCivil && (card.civilConfirmed
            ? <StatusBadge style='success' icon='verified' size='small'>ยืนยันเบิกจ่ายตรงแล้ว</StatusBadge>
            : <StatusBadge style='warning' icon='pending' size='small'>รอยืนยันเบิกจ่ายตรง</StatusBadge>)}
        </>
      )}
    >
      <FieldGrid cols={3}>
        <ReadField label='สิทธิ (จากทะเบียน — อ่านอย่างเดียว)' value={rights ? rights.name : '-'} />
        <ReadField label='วันเริ่มใช้สิทธิ' value={card.startDate} />
        <ReadField
          label='วันหมดสิทธิ'
          value={card.endDate}
          tone={expired ? 'var(--text-statusbadge-error, #B91C1C)' : undefined}
        />
        <ReadField label='รหัสสถานพยาบาลหลัก' value={hospitalLabel(card.mainHospitalCode) || 'ยังไม่ระบุ'} wide />
        <ReadField label='รหัสสถานพยาบาลรอง' value={hospitalLabel(card.subHospitalCode) || 'ยังไม่ระบุ'} wide />
      </FieldGrid>

      <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
        {/* §1.7.2.4 — ระบุ/แก้รหัสสถานพยาบาล (แสดง/บันทึก/ยกเลิก/แก้ไข ครบใน LookupPopup) */}
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='local_hospital'
          disabled={!canEdit}
          title={canEdit ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
          onClick={() => onOpenLookup({ cardId: card.id, field: 'main' })}
        >
          {card.mainHospitalCode ? 'แก้ไขสถานพยาบาลหลัก' : 'ระบุสถานพยาบาลหลัก'}
        </BrandSubdueButton>
        <BrandSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='domain_add'
          disabled={!canEdit}
          title={canEdit ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่าย'}
          onClick={() => onOpenLookup({ cardId: card.id, field: 'sub' })}
        >
          {card.subHospitalCode ? 'แก้ไขสถานพยาบาลรอง' : 'ระบุสถานพยาบาลรอง'}
        </BrandSubdueButton>

        {/* §1.7.2.1 — Activate / ยกเลิกการเปิดใช้งาน */}
        {card.activated ? (
          <DangerSubdueButton
            size='sm'
            disabled={!canEdit}
            onClick={() => setDeactivatePopup(true)}
          >
            ยกเลิกการเปิดใช้งานสิทธิ
          </DangerSubdueButton>
        ) : (
          <BrandPrimaryButton
            size='sm'
            leadingIcon='play_circle'
            disabled={!canEdit || expired || !rights || rights.code === 'CASH'}
            title={expired ? 'สิทธิหมดอายุ — ต้องต่ออายุที่ทะเบียนก่อน' : undefined}
            onClick={() => setRightsCardActivated(hn, card.id, true, role.userName, 'เปิดใช้งานจากหน้าเช็คสิทธิ')}
          >
            เปิดใช้งานสิทธิ (Activate)
          </BrandPrimaryButton>
        )}

        {/* §1.7.2.5 — ยืนยันสิทธิข้าราชการ (เบิกจ่ายตรง) */}
        {needsCivil && (card.civilConfirmed ? (
          <NeutralSubdueButton size='sm' variant='outline' disabled={!canEdit} onClick={() => setUnconfirmPopup(true)}>
            ยกเลิกการยืนยันสิทธิเบิกจ่ายตรง
          </NeutralSubdueButton>
        ) : (
          <BrandSubdueButton size='sm' leadingIcon='verified' disabled={!canEdit} onClick={() => setCivilPopup(true)}>
            ยืนยันสิทธิเบิกจ่ายตรง
          </BrandSubdueButton>
        ))}
      </div>

      <PermissionHint show={!canEdit} />

      {expired && (
        <Alert
          type='warning'
          title='สิทธิใบนี้หมดอายุแล้ว'
          subtext='ปุ่มเปิดใช้งานถูกปิดไว้ — ต้องต่ออายุ/เปิดสิทธิใหม่ที่หน้าทะเบียน (Step 4 สิทธิการรักษา) ก่อน'
        />
      )}

      {card.civilConfirmed && (
        <div
          className='flex flex-col'
          style={{
            gap: 'var(--dim-space-050, 2px)',
            borderRadius: 'var(--dim-radius-200, 8px)',
            background: 'var(--surface-brandPrimary-quaternary)',
            paddingTop: 'var(--dim-space-300)',
            paddingRight: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-300)',
            paddingLeft: 'var(--dim-space-300)',
          }}
        >
          <span style={T.label}>เลขอนุมัติเบิกจ่ายตรง</span>
          <span style={T.value}>{card.civilApprovalNo}</span>
          <AuditNote prefix='ยืนยันโดย' by={card.civilConfirmedBy} at={card.civilConfirmedAt} />
        </div>
      )}

      <AuditNote
        prefix='แก้ไขล่าสุดโดย'
        by={card.updatedBy || card.activatedBy}
        at={card.updatedAt || card.activatedAt}
      />

      {/* ยืนยันสิทธิข้าราชการ — confirm dialog issues the mock approval number */}
      <Popup
        open={civilPopup}
        onClose={() => setCivilPopup(false)}
        title='ยืนยันสิทธิเบิกจ่ายตรง (ข้าราชการ)'
        subtitle={`${card.groupTitle} · ${rights?.name || '-'}`}
        primaryAction={{
          label: 'ยืนยันและออกเลขอนุมัติ',
          onClick: () => { setCivilConfirmation(hn, card.id, true, role.userName); setCivilPopup(false); },
        }}
        secondaryAction={{ label: 'ยกเลิก', onClick: () => setCivilPopup(false) }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          <span style={T.body}>
            ระบบจะออกเลขอนุมัติเบิกจ่ายตรง แล้วบันทึกชื่อผู้ยืนยันและเวลาไว้เป็นหลักฐาน
            หลังยืนยันแล้วจะออกเลขอนุมัติซ้ำไม่ได้ ต้องยกเลิกการยืนยันก่อน
          </span>
          <span style={T.muted}>ผู้ยืนยัน: {role.userName} ({role.position})</span>
        </div>
      </Popup>

      <ReasonPopup
        open={unconfirmPopup}
        onClose={() => setUnconfirmPopup(false)}
        onConfirm={(reason) => setCivilConfirmation(hn, card.id, false, role.userName, reason)}
        title='ยกเลิกการยืนยันสิทธิเบิกจ่ายตรง'
        subtitle={`เลขอนุมัติเดิม ${card.civilApprovalNo || '-'} จะถูกยกเลิก`}
        label='เหตุผลที่ยกเลิกการยืนยัน'
        confirmLabel='ยกเลิกการยืนยัน'
        presets={['ยืนยันผิดคน', 'หน่วยงานต้นสังกัดแจ้งเปลี่ยนสิทธิ', 'เอกสารประกอบไม่ครบ']}
      />

      <ReasonPopup
        open={deactivatePopup}
        onClose={() => setDeactivatePopup(false)}
        onConfirm={(reason) => setRightsCardActivated(hn, card.id, false, role.userName, reason)}
        title='ยกเลิกการเปิดใช้งานสิทธิ'
        subtitle={`${card.groupTitle} · ${rights?.name || '-'}`}
        label='เหตุผลที่ยกเลิกการเปิดใช้งาน'
        confirmLabel='ยกเลิกการเปิดใช้งาน'
        presets={['เปิดใช้งานผิดใบ', 'สิทธิถูกยกเลิกจากต้นสังกัด', 'ผู้รับบริการย้ายสถานพยาบาลหลัก']}
      />
    </SectionCard>
  );
};

const RightsCheckSection = ({ role }) => {
  const history = useHistory();
  const [query, setQuery] = useState('');
  const [hn, setHn] = useState(null);
  const [notFound, setNotFound] = useState('');
  const [idError, setIdError] = useState('');
  const [checkMode, setCheckMode] = useState('auto');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [lookup, setLookup] = useState(null); // { cardId, field }
  const [revealId, setRevealId] = useState(false);

  const { history: searchHistory, push: pushHistory, clear: clearHistory } = useSearchHistory(SEARCH_HISTORY_KEY);

  const patient = hn ? patientByHn(hn) : null;
  const record = hn ? getHnRights(hn) : null;
  const lastCheck = record?.lastCheck || null;

  const suggestions = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchPatients(q).map(patientToSearchItem);
  }, [query]);

  const pickerMatchCount = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return 0;
    return PATIENT_PROFILES.filter((p) => [p.hn, p.shortName, p.fullName, p.nationalId, p.englishName]
      .some((f) => f && f.toString().toLowerCase().includes(q))).length;
  }, [query]);

  const resolvePatient = (value, item) => {
    if (item?.id) {
      const byHn = patientByHn(item.id);
      if (byHn) return byHn;
    }
    const found = searchPatients(value ?? item?.value ?? item?.label ?? '');
    return found[0] || null;
  };

  const handleSubmit = (value, item) => {
    const raw = String(value ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    /* Validation before firing the mock lookup — a partial national ID
       must not reach the สปสช. call. */
    if (digits.length > 0 && digits === raw.replace(/[-\s]/g, '') && digits.length < 13 && !raw.includes('-') && !/[ก-๙a-zA-Z]/.test(raw)) {
      setIdError(`เลขบัตรประชาชนต้องมี 13 หลัก (พิมพ์แล้ว ${digits.length} หลัก)`);
      return;
    }
    setIdError('');
    const found = resolvePatient(raw, item);
    if (!found) {
      setHn(null);
      setNotFound(raw);
      return;
    }
    setNotFound('');
    pushHistory(patientToSearchItem(found));
    setHn(found.hn);
    setRevealId(false);
    setCheckError('');
  };

  const runCheck = () => {
    if (!hn) return;
    setChecking(true);
    setCheckError('');
    runNhsoCheck(hn, checkMode)
      .then((result) => {
        recordNhsoCheck(hn, result, role.userName);
        setChecking(false);
      })
      .catch((err) => {
        setCheckError(err.message || 'เชื่อมต่อระบบตรวจสอบสิทธิไม่ได้');
        setChecking(false);
      });
  };

  const activeCard = lookup && record ? record.cards.find((c) => c.id === lookup.cardId) : null;

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-500)' }}>
      <div className='w-full flex items-start justify-center'>
        <PrimarySearch
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder='ค้นหาด้วยเลขบัตรประชาชน 13 หลัก / HN / ชื่อ-สกุล'
          width={680}
          history={searchHistory}
          onHistoryClear={searchHistory.length > 0 ? clearHistory : undefined}
          suggestions={suggestions}
        />
      </div>

      {query.trim() && !patient ? (
        <SearchResultCount found={pickerMatchCount} total={PATIENT_PROFILES.length} />
      ) : null}

      {idError && (
        <Alert type='error' title='เลขบัตรประชาชนไม่ครบ' subtext={idError} />
      )}

      {!patient ? (
        notFound ? (
          <EmptyState
            icon='person_search'
            title={`ไม่พบผู้รับบริการที่ตรงกับ “${notFound}”`}
            subtext='ตรวจสอบเลขบัตรประชาชน/HN อีกครั้ง หรือค้นด้วยชื่อ-สกุลบางส่วน — ถ้าเป็นผู้รับบริการรายใหม่ ต้องลงทะเบียนที่งานเวชระเบียนก่อน'
          />
        ) : (
          <EmptyState
            icon='badge'
            title='ค้นหาผู้รับบริการเพื่อเริ่มตรวจสอบสิทธิ'
            subtext='พิมพ์เลขบัตรประชาชน 13 หลัก, HN หรือชื่อ-สกุล แล้วกด Enter — ระบบจะแสดงสิทธิจากทะเบียนพร้อมปุ่มตรวจสอบออนไลน์ (สปสช.)'
          />
        )
      ) : (
        <>
          <PatientCard
            patient={patient}
            embedded
            tags={(
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                <ColorfulBadge badgeStyle='indigo' size='small'>HN {patient.hn}</ColorfulBadge>
                <ColorfulBadge badgeStyle='teal' size='small'>
                  บัตรประชาชน {revealId && role.canRevealId ? formatNationalIdFull(patient.nationalId) : maskNationalId(patient.nationalId)}
                </ColorfulBadge>
              </div>
            )}
          />

          {/* §1.4.2 ข้อมูลลับ — เปิดเลขเต็มได้เฉพาะ role ที่มีสิทธิ */}
          <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-300)' }}>
            <NeutralSubdueButton
              size='sm'
              variant='outline'
              leadingIcon={revealId ? 'visibility_off' : 'visibility'}
              disabled={!role.canRevealId}
              title={role.canRevealId ? undefined : 'ต้องเป็นเจ้าหน้าที่เบิกจ่ายจึงจะเปิดเลขบัตรเต็มได้'}
              onClick={() => setRevealId((v) => !v)}
            >
              {revealId ? 'ซ่อนเลขบัตรประชาชน' : 'แสดงเลขบัตรประชาชนเต็ม'}
            </NeutralSubdueButton>
            <BrandSubdueButton
              size='sm'
              variant='outline'
              leadingIcon='open_in_new'
              onClick={() => history.push('/registration/register')}
            >
              ดู/แก้สิทธิในทะเบียน (Step 4)
            </BrandSubdueButton>
          </div>

          <Alert
            type='info'
            title='สิทธิการรักษาแก้ไขได้ที่หน้าทะเบียนเท่านั้น'
            subtext='การ์ดสิทธิด้านล่างดึงมาจากทะเบียนผู้รับบริการแบบอ่านอย่างเดียว — รหัสสถานพยาบาลหลัก/รอง, การเปิดใช้งาน (Activate) และการยืนยันสิทธิเบิกจ่ายตรง แก้ไขได้ที่หน้านี้ (ยังเก็บแยกจากฟอร์มทะเบียนใน prototype นี้)'
          />

          {/* ── §1.7.1.1 ตรวจสอบสิทธิออนไลน์ (สปสช.) ── */}
          <SectionCard
            title='ตรวจสอบสิทธิจากระบบ สปสช.'
            subtitle='ยิงคำขอไปยังระบบตรวจสอบสิทธิของสำนักงานหลักประกันสุขภาพแห่งชาติ (mock)'
            icon='cloud_sync'
            actions={(
              <BrandPrimaryButton size='sm' leadingIcon='cloud_sync' disabled={checking} onClick={runCheck}>
                {checking ? 'กำลังตรวจสอบ…' : 'ตรวจสอบสิทธิออนไลน์ (สปสช.)'}
              </BrandPrimaryButton>
            )}
          >
            <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
              <span style={T.muted}>ผลลัพธ์ที่ต้องการทดสอบ:</span>
              {CHECK_MODES.map((m) => (
                <FilterTag
                  key={m.key}
                  leadingIcon={m.icon}
                  selected={checkMode === m.key}
                  onClick={() => setCheckMode(m.key)}
                  value={m.label}
                />
              ))}
            </div>

            {checking && (
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span style={{ color: 'var(--text-brandPrimary-default)', display: 'inline-flex' }}>
                  <Icon name='progress_activity' size={18} />
                </span>
                <span style={T.body}>กำลังเชื่อมต่อระบบตรวจสอบสิทธิ สปสช. …</span>
              </div>
            )}

            {checkError && (
              <Alert
                type='error'
                title='เชื่อมต่อระบบตรวจสอบสิทธิไม่ได้'
                subtext={checkError}
                detail={(
                  <div className='flex items-center justify-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
                    <NeutralSubdueButton size='sm' variant='outline' onClick={() => setCheckError('')}>ปิดข้อความ</NeutralSubdueButton>
                    <BrandSubdueButton size='sm' leadingIcon='refresh' onClick={runCheck}>ลองใหม่</BrandSubdueButton>
                  </div>
                )}
              />
            )}

            {checkError && (
              <div
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-200)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default, #E2E4E6)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingRight: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-300)',
                }}
              >
                <StatusBadge style='warning' icon='cloud_off' size='small'>ข้อมูล offline ล่าสุด</StatusBadge>
                <span style={T.body}>
                  แสดงสิทธิจากทะเบียนผู้รับบริการแทนผลออนไลน์ — ใช้ตัดสินใจชั่วคราวได้ แต่ต้องตรวจสอบซ้ำเมื่อระบบกลับมา
                </span>
                <FieldGrid cols={2}>
                  <ReadField label='สิทธิหลัก (จากทะเบียน)' value={rightsById(record.cards[0]?.rightsId)?.name} />
                  <ReadField label='สถานพยาบาลหลัก (จากทะเบียน)' value={hospitalLabel(record.cards[0]?.mainHospitalCode) || 'ยังไม่ระบุ'} />
                </FieldGrid>
              </div>
            )}

            {!checking && !checkError && lastCheck && (
              <div
                className='flex flex-col'
                style={{
                  gap: 'var(--dim-space-300)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary)',
                  background: 'var(--surface-brandPrimary-quaternary)',
                  paddingTop: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  paddingBottom: 'var(--dim-space-400)',
                  paddingLeft: 'var(--dim-space-400)',
                }}
              >
                <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={T.heading}>ผลตอบกลับจาก สปสช.</span>
                  <StatusBadge style={nhsoStatusMeta(lastCheck.status).color} size='small'>
                    {nhsoStatusMeta(lastCheck.status).label}
                  </StatusBadge>
                </div>
                <FieldGrid cols={3}>
                  <ReadField label='สิทธิหลัก' value={lastCheck.main} />
                  <ReadField label='สิทธิรอง' value={lastCheck.sub || 'ไม่มี'} />
                  <ReadField label='สถานะสิทธิ' value={nhsoStatusMeta(lastCheck.status).label} />
                  <ReadField label='รหัส/ชื่อสถานพยาบาลหลัก' value={hospitalLabel(lastCheck.mainHospitalCode) || 'ไม่พบข้อมูล'} />
                  <ReadField label='รหัส/ชื่อสถานพยาบาลรอง' value={hospitalLabel(lastCheck.subHospitalCode) || 'ไม่มี'} />
                  <ReadField label='วันเริ่ม – วันหมดสิทธิ' value={lastCheck.startDate ? `${lastCheck.startDate} – ${lastCheck.endDate}` : 'ไม่พบข้อมูล'} />
                </FieldGrid>
                <AuditNote prefix='ตรวจสอบโดย' by={lastCheck.checkedBy} at={lastCheck.checkedAt} />
                {lastCheck.status !== 'active' && (
                  <Alert
                    type='warning'
                    title={lastCheck.status === 'expired' ? 'สิทธิหมดอายุ' : 'ไม่พบสิทธิของผู้รับบริการรายนี้'}
                    subtext='ปุ่มเปิดใช้งานสิทธิจะถูกปิดไว้ — แนะนำส่งผู้รับบริการไปเปิด/ต่อสิทธิที่หน้าทะเบียนก่อน แล้วกลับมาตรวจสอบซ้ำ'
                    detail={(
                      <div className='flex justify-end w-full'>
                        <BrandSubdueButton size='sm' leadingIcon='open_in_new' onClick={() => history.push('/registration/register')}>
                          ไปหน้าทะเบียนสิทธิ
                        </BrandSubdueButton>
                      </div>
                    )}
                  />
                )}
              </div>
            )}

            {!checking && !checkError && !lastCheck && (
              <span style={T.muted}>ยังไม่เคยตรวจสอบออนไลน์สำหรับ HN นี้ในรอบการใช้งานนี้</span>
            )}
          </SectionCard>

          {/* ── สิทธิรายใบ ── */}
          {record.cards.map((card) => (
            <RightsCardBlock
              key={card.id}
              hn={hn}
              card={card}
              role={role}
              onOpenLookup={setLookup}
            />
          ))}

          <SectionCard title='ประวัติการทำรายการสิทธิของ HN นี้' icon='history' tone='muted'>
            <AuditList entries={record.audit} emptyText='ยังไม่มีการตรวจสอบ/แก้ไขสิทธิในรอบการใช้งานนี้' />
          </SectionCard>
        </>
      )}

      {/* §1.7.2.4 lookup — เลือกรหัสสถานพยาบาลแบบ HCIS แล้วกดตกลง */}
      <LookupPopup
        open={!!lookup && !!activeCard}
        onClose={() => setLookup(null)}
        title={lookup?.field === 'sub' ? 'เลือกรหัสสถานพยาบาลรอง' : 'เลือกรหัสสถานพยาบาลหลัก'}
        subtitle={activeCard ? `${activeCard.groupTitle} · ${rightsById(activeCard.rightsId)?.name || '-'}` : ''}
        rows={HOSPITAL_CODES}
        value={lookup?.field === 'sub' ? activeCard?.subHospitalCode : activeCard?.mainHospitalCode}
        allowClear={lookup?.field === 'sub'}
        onConfirm={(code) => {
          if (!activeCard) return;
          setRightsCardHospitals(hn, activeCard.id, {
            mainHospitalCode: lookup.field === 'main' ? code : activeCard.mainHospitalCode,
            subHospitalCode: lookup.field === 'sub' ? code : activeCard.subHospitalCode,
          }, role.userName);
        }}
      />
    </div>
  );
};

export default RightsCheckSection;
