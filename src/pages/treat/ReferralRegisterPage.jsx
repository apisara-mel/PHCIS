import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Table from '@/components/table/Table';
import Pagination from '@/components/pagination/Pagination';
import PrimarySearch from '@/components/search/PrimarySearch';
import SearchResultCount from '@/components/search/SearchResultCount';
import StatusBadge from '@/components/badge/StatusBadge';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import PhcisTopToast from '@/components/alert/PhcisTopToast';
import Popup from '@/components/popup/Popup';
import ReferralPrintSheet from '@/pages/treat/ReferralPrintSheet';
import InternalReferralPrintSheet from '@/pages/treat/InternalReferralPrintSheet';
import { printWithFilename } from '@/pages/treat/printKit';
import { ReferralHistoryTimeline } from '@/pages/treat/panels/ReferralHistoryPanel';
import {
  PanelCard, PanelEmptyState, InfoPair, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, AccessDeniedPanel,
  ReasonDialog, PanelAlert, CountLabel, paginate,
} from '@/pages/treat/panels/panelHooks';
import {
  REFER_STATUSES, referStatusMeta, REFER_FACILITIES, facilityMeta,
  REFER_CENTERS, centerMeta, COMMUNICABLE_NOTIFY_OPTIONS,
  REFER_REASON_SUGGESTIONS, REFER_HISTORY_SUGGESTIONS, REFER_SYMPTOM_SUGGESTIONS,
  REFER_TREATMENT_SUGGESTIONS, blankReferral, subscribeReferrals, getReferrals,
  referralsByDirection, missingReferFields, isReferIncomplete,
  saveReferral, sendReferral, cancelReferral, printReferral,
  INTERNAL_DESTINATIONS, internalDestinationMeta, INTERNAL_GOAL_SUGGESTIONS,
  INTERNAL_REASON_SUGGESTIONS, nextReferNoFor, referralTargetLabel,
  EREFERRAL_GATEWAY, eReferralQueue, eReferralStatusMeta, retryEReferral,
  setReferralAppointmentDate,
} from '@/data/treatmentRefer';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';

/* PHCIS | EMR §1.4.3.14 / §1.4.11.1 / §1.4.6.1 — ทะเบียนการส่งต่อผู้รับบริการ.
   หน้าเดียวครอบคลุมสองทิศทางตามคู่มือ HCIS §2.10:
     • §2.10.1 ลำดับส่งต่อออก  → แท็บ "ส่งต่อออก" (ตารางทะเบียน)
     • §2.10.2 บันทึก/แก้ไขรายละเอียด → ฟอร์มในหน้าเดียวกัน (pattern
       PharmacyRegistryPage: list + edit ใช้ route เดียว ไม่ push หน้าใหม่)
   คำศัพท์ตัวนับ "จำนวน N รายการ" + legend "ข้อมูลไม่สมบูรณ์" คงตามคู่มือ. */

const breadcrumb = ['ทะเบียนการส่งต่อผู้รับบริการ'];

/* ทิศทางที่ 3 "ส่งต่อภายในหน่วยงาน" (TOR §1.5.8.3) — คู่มือ HCIS
   §2.1.17 งานเยี่ยมบ้าน / §2.1.19 ส่งต่อหน่วยงานภายใน ศบส. */
const DIRECTION_TABS = [
  { key: 'out',      label: 'ส่งต่อออก' },
  { key: 'in',       label: 'รับเข้าจากสถานพยาบาลอื่น' },
  { key: 'internal', label: 'ส่งต่อภายในหน่วยงาน' },
];

/* ชื่อไฟล์เริ่มต้นของ "บันทึกเป็น PDF" (§1.4.6.1) — เจ้าหน้าที่เวชระเบียน
   ต้องเก็บไฟล์เข้าแฟ้มผู้รับบริการได้โดยไม่ต้องพิมพ์ชื่อเอง */
const referralFileName = (row) => [
  row?.direction === 'internal' ? 'ใบส่งต่อภายใน' : 'ใบส่งต่อ',
  row?.referNo, row?.hn, row?.name,
].filter(Boolean).join('_');

const PER_PAGE = 10;

/* ค้นหา 3 แบบตามคู่มือ §1.4: HN / เลข 13 หลัก / ชื่อ+นามสกุล.
   คู่มือระบุ wildcard 2 ตัว — `+` คั่นคำ (AND ทุกคำต้องเจอ) และ `%`
   แทนอักษรกี่ตัวก็ได้. เราแปลง `%` เป็น `.*` แล้ว match แบบ regex. */
const buildMatcher = (raw) => {
  const q = String(raw || '').trim();
  if (!q) return () => true;
  const digits = q.replace(/[^0-9]/g, '');

  /* เลขบัตรประชาชน 13 หลัก — เทียบเฉพาะตัวเลขเพื่อให้พิมพ์มีขีดหรือไม่มีก็ได้ */
  if (digits.length === 13) {
    return (r) => String(r.cid || '').replace(/[^0-9]/g, '') === digits;
  }

  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const terms = q.split('+').map((t) => t.trim()).filter(Boolean);
  const regexes = terms.map((t) => new RegExp(escapeRe(t).replace(/%/g, '.*'), 'i'));

  return (r) => {
    const hay = [r.hn, r.name, r.referNo, r.cardNo, r.cid, facilityMeta(r.toFacility)?.label]
      .filter(Boolean).join(' ');
    return regexes.every((re) => re.test(hay));
  };
};

const parseThaiDate = (s) => {
  /* seed ใช้รูปแบบ "6 พฤษภาคม 2569" — แปลงคร่าว ๆ ให้กรองช่วงวันที่ได้ */
  const TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const m = String(s || '').match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  const mi = TH.indexOf(m[2]);
  if (mi < 0) return null;
  return new Date(Number(m[3]) - 543, mi, Number(m[1]));
};

const StatusCell = ({ row }) => {
  const meta = referStatusMeta(row.status);
  return <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>;
};

/* ── ตารางทะเบียน ───────────────────────────────────────────── */

const RegisterTable = ({ rows, direction, onOpen, onHistory, emptyKind }) => {
  const isInternal = direction === 'internal';
  const columns = [
    {
      key: 'referNo', header: 'เลขที่ใบส่งต่อ',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(row.status === 'cancelled') }}>{row.referNo}</span>
          {isReferIncomplete(row) ? (
            <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              <Sym name='error' size={12} color='var(--icon-dangerButton-default, #B91C1C)' />
              <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>
                ข้อมูลไม่สมบูรณ์
              </span>
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'hn', header: 'HN' },
    {
      key: 'name', header: 'ชื่อ - นามสกุล', flex: 1,
      render: (row) => <span style={strikeIf(row.status === 'cancelled') || undefined}>{row.name}</span>,
    },
    {
      key: 'route',
      header: isInternal
        ? 'ต้นทาง → หน่วยงานภายใน'
        : direction === 'out' ? 'ต้นทาง → ปลายทาง' : 'ต้นทาง → ศูนย์ของเรา',
      render: (row) => (
        <span style={PANEL_LABEL_STYLE}>
          {centerMeta(row.fromCenter)?.label || '—'}
          {' → '}
          {referralTargetLabel(row)}
        </span>
      ),
    },
    ...(isInternal ? [
      {
        key: 'assignee', header: 'ผู้รับมอบหมาย',
        render: (row) => (row.assignee
          ? <span style={PANEL_VALUE_STYLE}>{row.assignee}</span>
          : <StatusBadge style='warning' size='small' icon='person_alert'>ยังไม่มอบหมาย</StatusBadge>),
      },
      {
        key: 'dueDate',
        header: 'กำหนดวันเยี่ยม / วันนัด',
        render: (row) => (row.dueDate
          ? <span style={PANEL_VALUE_STYLE}>{row.dueDate}</span>
          : <span style={PANEL_LABEL_STYLE}>ยังไม่กำหนด</span>),
      },
    ] : [
      { key: 'sentDate', header: 'วันที่ส่ง', render: (row) => row.sentDate || row.lastVisitDate || '—' },
      {
        key: 'validUntil', header: 'อายุใบส่งต่อ',
        render: (row) => {
          if (!row.validUntil) return <span style={PANEL_LABEL_STYLE}>—</span>;
          const d = parseThaiDate(row.validUntil);
          const expired = d && d.getTime() < Date.now();
          return expired
            ? <StatusBadge style='error' size='small' icon='event_busy'>หมดอายุ {row.validUntil}</StatusBadge>
            : <span style={PANEL_LABEL_STYLE}>ถึง {row.validUntil}</span>;
        },
      },
    ]),
    { key: 'status', header: 'สถานะ', render: (row) => <StatusCell row={row} /> },
    {
      key: 'history', header: 'ประวัติการส่งต่อ',
      render: (row) => (
        <NeutralSubdueButton
          variant='outline'
          size='sm'
          leadingIcon='history'
          onClick={(e) => {
            /* กันไม่ให้ onRowClick ของตารางเปิดฟอร์มพร้อมกับ popup ประวัติ */
            if (e && e.stopPropagation) e.stopPropagation();
            onHistory(row);
          }}
        >
          ดูของผู้ป่วยรายนี้
        </NeutralSubdueButton>
      ),
    },
  ];

  const emptyCopy = {
    none: {
      msg: isInternal
        ? 'ยังไม่มีใบส่งต่อภายในหน่วยงาน'
        : direction === 'out' ? 'ยังไม่มีใบส่งต่อออกในระบบ' : 'ยังไม่มีใบส่งต่อรับเข้าจากสถานพยาบาลอื่น',
      sub: isInternal
        ? 'กด "ออกใบส่งต่อภายในใหม่" เพื่อส่งงานเยี่ยมบ้าน คลินิกเฉพาะโรค สังคมสงเคราะห์ หรือเวชศาสตร์ฟื้นฟู'
        : direction === 'out'
          ? 'กด "ออกใบส่งต่อใหม่" เพื่อสร้างใบส่งตัวฉบับแรกของศูนย์บริการ'
          : 'ใบส่งต่อขาเข้าจะปรากฏที่นี่เมื่อสถานพยาบาลอื่นส่งผู้รับบริการมายังศูนย์',
    },
    filtered: {
      msg: 'ไม่พบใบส่งต่อที่ตรงกับเงื่อนไขการค้นหา',
      sub: 'ลองปรับคำค้น (HN / เลขบัตร 13 หลัก / ชื่อ+นามสกุล) หรือขยายช่วงวันที่',
    },
  }[emptyKind] || {};

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={onOpen}
      emptyMessage={emptyCopy.msg}
      emptySubtext={emptyCopy.sub}
    />
  );
};

/* ── ฟอร์มใบส่งต่อ (คู่มือ §2.10.2) ─────────────────────────── */

const FormSection = ({ title, children }) => (
  <PanelCard title={title}>
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>{children}</div>
  </PanelCard>
);

const Row = ({ children }) => (
  <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>{children}</div>
);

const Col = ({ children, min = 220, flex = 1 }) => (
  <div className='flex flex-col min-w-0' style={{ flex, minWidth: min }}>{children}</div>
);

const ReferralForm = ({ draft, setDraft, canEdit, readOnly }) => {
  const set = (key) => (v) => setDraft((d) => ({ ...d, [key]: v }));
  const setAddr = (key) => (v) => setDraft((d) => ({
    ...d, patientAddress: { ...d.patientAddress, [key]: v },
  }));
  const setText = (key) => (e) => setDraft((d) => ({
    ...d, [key]: typeof e === 'string' ? e : e?.target?.value ?? '',
  }));

  const locked = readOnly || !canEdit;
  const a = draft.patientAddress || {};
  const isInternal = draft.direction === 'internal';
  const dest = internalDestinationMeta(draft.internalDestination);

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      <FormSection title='๑. ข้อมูลผู้รับบริการ'>
        <Row>
          <Col><InputField label='HN' value={draft.hn} onChange={set('hn')} disabled={locked} showLeadingIcon={false} placeholder='เช่น 67-00001' /></Col>
          <Col><InputField label='เลขประจำตัวประชาชน (13 หลัก)' value={draft.cid} onChange={set('cid')} disabled={locked} showLeadingIcon={false} placeholder='0-0000-00000-00-0' /></Col>
          <Col flex={2}><InputField label='ชื่อ - นามสกุล' value={draft.name} onChange={set('name')} disabled={locked} showLeadingIcon={false} placeholder='ชื่อ นามสกุล ผู้รับบริการ' /></Col>
        </Row>
        <Row>
          <Col><InputField label='โทรศัพท์' value={draft.patientPhone} onChange={set('patientPhone')} disabled={locked} showLeadingIcon={false} placeholder='08X-XXX-XXXX' /></Col>
          <Col><InputField label='สิทธิการรักษา' value={draft.rights} onChange={set('rights')} disabled={locked} showLeadingIcon={false} placeholder='เช่น บัตรทอง (UC)' /></Col>
          <Col><InputField label='วันที่รับบริการครั้งล่าสุด' value={draft.lastVisitDate} onChange={set('lastVisitDate')} disabled={locked} showLeadingIcon={false} placeholder='เช่น 6 พฤษภาคม 2569' /></Col>
        </Row>
        {draft.rightsExpired ? (
          <PanelAlert tone='warning' icon='gpp_maybe' title='สิทธิการรักษาหมดอายุ'>
            สิทธิของผู้รับบริการหมดอายุแล้ว — ยืนยัน ศบส. ที่เรียกเก็บก่อนออกใบส่งต่อ
            ระบบยังให้ดำเนินการต่อได้ แต่ปลายทางอาจเรียกเก็บไม่ได้
          </PanelAlert>
        ) : null}
        <Row>
          <Col min={140}><InputField label='บ้านเลขที่' value={a.houseNo} onChange={setAddr('houseNo')} disabled={locked} showLeadingIcon={false} placeholder='เลขที่' /></Col>
          <Col min={100}><InputField label='หมู่' value={a.moo} onChange={setAddr('moo')} disabled={locked} showLeadingIcon={false} placeholder='-' /></Col>
          <Col min={160}><InputField label='ซอย' value={a.soi} onChange={setAddr('soi')} disabled={locked} showLeadingIcon={false} placeholder='ซอย' /></Col>
          <Col min={160}><InputField label='ถนน' value={a.road} onChange={setAddr('road')} disabled={locked} showLeadingIcon={false} placeholder='ถนน' /></Col>
        </Row>
        <Row>
          <Col min={160}><InputField label='แขวง / ตำบล' value={a.subDistrict} onChange={setAddr('subDistrict')} disabled={locked} showLeadingIcon={false} placeholder='แขวง' /></Col>
          <Col min={160}><InputField label='เขต / อำเภอ' value={a.district} onChange={setAddr('district')} disabled={locked} showLeadingIcon={false} placeholder='เขต' /></Col>
          <Col min={160}><InputField label='จังหวัด' value={a.province} onChange={setAddr('province')} disabled={locked} showLeadingIcon={false} placeholder='จังหวัด' /></Col>
          <Col min={140}><InputField label='รหัสไปรษณีย์' value={a.zipcode} onChange={setAddr('zipcode')} disabled={locked} showLeadingIcon={false} placeholder='10XXX' /></Col>
        </Row>
      </FormSection>

      {isInternal ? (
        /* ๒. (ส่งต่อภายใน) หน่วยงานปลายทางภายใน + การมอบหมาย — ไม่มี
           สถานพยาบาลปลายทาง/สิทธิเรียกเก็บ ตามคู่มือ §2.1.19 */
        <FormSection title='๒. หน่วยงานปลายทางภายในและการมอบหมาย'>
          <Row>
            <Col flex={2}>
              <Select
                label='ศูนย์บริการต้นทาง'
                value={draft.fromCenter}
                onChange={set('fromCenter')}
                options={REFER_CENTERS.map((c) => ({ value: c.value, label: c.label }))}
                placeholder='เลือกศูนย์บริการต้นทาง'
                disabled={locked}
              />
            </Col>
            <Col flex={3}>
              <Select
                label='หน่วยงานปลายทางภายใน'
                required
                value={draft.internalDestination}
                onChange={(v) => setDraft((d) => ({
                  /* เปลี่ยนหน่วยงานแล้วต้องล้างผู้รับมอบหมายเดิม เพราะรายชื่อ
                     ทีมเป็นคนละชุด — ไม่งั้นจะเหลือชื่อคนที่ไม่อยู่หน่วยนั้น */
                  ...d, internalDestination: v, assignee: '',
                }))}
                options={INTERNAL_DESTINATIONS.map((o) => ({ value: o.value, label: o.label }))}
                placeholder='เลือกหน่วยงานปลายทางภายใน'
                disabled={locked}
                error={!draft.internalDestination ? 'ต้องระบุหน่วยงานปลายทางก่อนมอบหมายงาน' : undefined}
              />
            </Col>
          </Row>
          {dest ? (
            <Row>
              <InfoPair label='สังกัดหน่วยงานปลายทาง' value={dest.unit} minWidth={280} />
            </Row>
          ) : null}
          <Row>
            <Col flex={2}>
              <Select
                label='ผู้รับมอบหมาย'
                required
                value={draft.assignee}
                onChange={set('assignee')}
                options={(dest?.team || []).map((t) => ({ value: t, label: t }))}
                placeholder={dest ? 'เลือกผู้รับมอบหมาย' : 'เลือกหน่วยงานปลายทางก่อน'}
                disabled={locked || !dest}
                error={!draft.assignee ? 'ต้องระบุผู้รับมอบหมายก่อนจึงจะส่งงานได้' : undefined}
              />
            </Col>
            <Col flex={2}>
              <InputField
                label={dest?.dueLabel || 'กำหนดวันเยี่ยม / วันนัด'}
                required
                value={draft.dueDate}
                onChange={set('dueDate')}
                disabled={locked}
                showLeadingIcon={false}
                placeholder='เช่น 13 พฤษภาคม 2569'
                helperText='บันทึกร่างได้แม้ยังไม่กำหนด แต่ส่งงานไม่ได้จนกว่าจะระบุ'
                error={!draft.dueDate ? 'ต้องกำหนดวันก่อนจึงจะส่งงานได้' : undefined}
              />
            </Col>
            <Col>
              <InputField
                label='ผู้ส่ง (แพทย์ / ผู้รับผิดชอบ)'
                required
                value={draft.sender}
                onChange={set('sender')}
                disabled={locked}
                showLeadingIcon={false}
                placeholder='ชื่อผู้ส่งต่อภายใน'
              />
            </Col>
          </Row>
          <SuggestibleTextarea
            voice
            label='เป้าหมายการติดตาม'
            value={draft.followUpGoal}
            onChange={setText('followUpGoal')}
            suggestions={INTERNAL_GOAL_SUGGESTIONS}
            minChars={2}
            height={110}
            minHeight={88}
            disabled={locked}
            popoverAriaLabel='ตัวอย่างเป้าหมายการติดตาม'
            placeholder='สิ่งที่ต้องการให้หน่วยงานปลายทางติดตาม พร้อมความถี่และระยะเวลา'
          />
          {draft.assignedAt ? (
            <PanelAlert tone='info' icon='assignment_ind' title='มอบหมายงานแล้ว'>
              มอบหมายให้ {draft.assignee || '—'} เมื่อ {draft.assignedAt}
              {draft.assignmentAcceptedAt ? ` · ผู้รับมอบหมายตอบรับแล้วเมื่อ ${draft.assignmentAcceptedAt}` : ' · ยังไม่ตอบรับ'}
              {' '}— การแก้ไขหลังจากนี้ผู้รับมอบหมายอาจเริ่มลงพื้นที่ไปแล้ว ต้องแจ้งเจ้าตัวด้วยตนเองทุกครั้ง
            </PanelAlert>
          ) : null}
        </FormSection>
      ) : (
      <FormSection title='๒. สถานพยาบาลต้นทางและปลายทาง'>
        <Row>
          <Col flex={2}>
            <Select
              label='ศูนย์บริการต้นทาง'
              value={draft.fromCenter}
              onChange={set('fromCenter')}
              options={REFER_CENTERS.map((c) => ({ value: c.value, label: c.label }))}
              placeholder='เลือกศูนย์บริการต้นทาง'
              disabled={locked}
            />
          </Col>
          <Col flex={2}>
            <Select
              label='ศบส. ที่เรียกเก็บ'
              value={draft.billingCenter}
              onChange={set('billingCenter')}
              options={REFER_CENTERS.map((c) => ({ value: c.value, label: c.label }))}
              placeholder='เลือก ศบส. ที่เรียกเก็บ'
              disabled={locked}
            />
          </Col>
        </Row>
        <Row>
          <Col flex={2}>
            <Select
              label='สถานพยาบาลปลายทาง'
              required
              value={draft.toFacility}
              onChange={set('toFacility')}
              options={REFER_FACILITIES.map((f) => ({ value: f.value, label: f.label }))}
              placeholder='เลือกสถานพยาบาลปลายทาง'
              disabled={locked}
              error={!draft.toFacility && !draft.toFacilityOther ? 'ต้องระบุปลายทางก่อนส่งใบส่งต่อ' : undefined}
            />
          </Col>
          <Col flex={2}>
            <InputField
              label='หรือระบุปลายทางอื่น (นอกรายการ)'
              value={draft.toFacilityOther}
              onChange={set('toFacilityOther')}
              disabled={locked}
              showLeadingIcon={false}
              placeholder='ชื่อสถานพยาบาลปลายทาง'
            />
          </Col>
        </Row>
        {draft.toFacility ? (
          <Row>
            <InfoPair label='โทรศัพท์ปลายทาง' value={facilityMeta(draft.toFacility)?.phone} />
            <InfoPair label='โทรสาร' value={facilityMeta(draft.toFacility)?.fax} />
            <InfoPair label='อีเมลรับใบส่งต่อ' value={facilityMeta(draft.toFacility)?.email} minWidth={220} />
          </Row>
        ) : null}
        <Row>
          <Col>
            <InputField
              label='ใบส่งต่อมีอายุถึงวันที่'
              value={draft.validUntil}
              onChange={set('validUntil')}
              disabled={locked}
              showLeadingIcon={false}
              placeholder='เช่น 6 มิถุนายน 2569'
              helperText='เว้นว่างได้ — ระบบจะไม่เตือนวันหมดอายุ'
            />
          </Col>
          <Col>
            <InputField label='ผู้ส่ง (แพทย์ผู้รับผิดชอบ)' required value={draft.sender} onChange={set('sender')} disabled={locked} showLeadingIcon={false} placeholder='ชื่อแพทย์ผู้ส่งต่อ' />
          </Col>
        </Row>
      </FormSection>
      )}

      <FormSection title='๓. ข้อมูลทางคลินิก'>
        <SuggestibleTextarea
          voice
          label='ประวัติการเจ็บป่วย'
          value={draft.history}
          onChange={setText('history')}
          suggestions={REFER_HISTORY_SUGGESTIONS}
          minChars={2}
          height={120}
          minHeight={88}
          disabled={locked}
          popoverAriaLabel='ตัวอย่างประวัติการเจ็บป่วย'
          placeholder='โรคประจำตัว การรักษาที่ผ่านมา ประวัติแพ้ยา'
        />
        <SuggestibleTextarea
          voice
          label='อาการสำคัญ / อาการปัจจุบัน'
          required
          value={draft.symptom}
          onChange={setText('symptom')}
          suggestions={REFER_SYMPTOM_SUGGESTIONS}
          minChars={2}
          height={120}
          minHeight={88}
          disabled={locked}
          popoverAriaLabel='ตัวอย่างอาการสำคัญ'
          placeholder='อาการที่นำมาพบแพทย์และระยะเวลาที่เป็น'
        />
        <SuggestibleTextarea
          voice
          label='ผลการตรวจทางห้องปฏิบัติการ / รังสีวิทยา'
          value={draft.labResult}
          onChange={setText('labResult')}
          suggestions={['ผลตรวจอยู่ระหว่างรอ — จะส่งตามภายหลัง']}
          minChars={2}
          height={110}
          minHeight={88}
          disabled={locked}
          popoverAriaLabel='ตัวอย่างผลตรวจ'
          placeholder='ค่าที่ผิดปกติพร้อมหน่วย เช่น Creatinine 2.4 mg/dL (H)'
        />
        <SuggestibleTextarea
          voice
          label='การรักษาที่ให้ไปแล้ว'
          value={draft.treatmentGiven}
          onChange={setText('treatmentGiven')}
          suggestions={REFER_TREATMENT_SUGGESTIONS}
          minChars={2}
          height={110}
          minHeight={88}
          disabled={locked}
          popoverAriaLabel='ตัวอย่างการรักษาที่ให้ไปแล้ว'
          placeholder='ยา / หัตถการ / การดูแลก่อนส่งต่อ'
        />
        <SuggestibleTextarea
          voice
          label={isInternal ? 'เหตุผลที่ส่งต่อภายใน / สิ่งที่ต้องการให้หน่วยงานช่วย' : 'เหตุผลที่ส่งต่อ / สิ่งที่ต้องการให้ช่วยเหลือ'}
          required
          value={draft.requirement}
          onChange={setText('requirement')}
          suggestions={isInternal ? INTERNAL_REASON_SUGGESTIONS : REFER_REASON_SUGGESTIONS}
          minChars={2}
          height={120}
          minHeight={88}
          disabled={locked}
          popoverAriaLabel='ตัวอย่างเหตุผลการส่งต่อ'
          placeholder='ระบุสิ่งที่ต้องการให้ปลายทางดำเนินการ'
        />
        <Row>
          <Col flex={2}>
            <Select
              label='หมายเหตุโรคติดต่อที่ต้องแจ้ง'
              value={draft.communicableNotify}
              onChange={set('communicableNotify')}
              options={COMMUNICABLE_NOTIFY_OPTIONS}
              placeholder='เลือกสถานะการแจ้งโรคติดต่อ'
              disabled={locked}
            />
          </Col>
          <Col flex={2}>
            <InputField label='หมายเหตุเพิ่มเติม' value={draft.note} onChange={set('note')} disabled={locked} showLeadingIcon={false} placeholder='ข้อมูลอื่นที่ปลายทางควรทราบ' />
          </Col>
        </Row>
        {draft.communicableNotify === 'pending' ? (
          <PanelAlert tone='error' icon='coronavirus' title='ยังไม่ได้แจ้งงานระบาดวิทยา'>
            ผู้รับบริการเข้าข่ายโรคติดต่อที่ต้องแจ้ง — ต้องแจ้งงานระบาดวิทยาก่อนหรือพร้อมกับการส่งต่อ
          </PanelAlert>
        ) : null}
      </FormSection>
    </div>
  );
};

/* ── e-Referral: สถานะเกตเวย์ + คิวส่งออก (§1.5.8.1 / §1.5.8.4) ──
   รูปแบบเดียวกับการ์ด interface ของ LIS ใน /treat/interfaces: สถานะ
   endpoint + โปรโตคอล + เวลาที่เริ่มขาดการเชื่อมต่อ แล้วตามด้วยคิวส่งออก
   ที่บอกได้ว่าใบไหนส่งสำเร็จ/รอคิว/ล้มเหลวเพราะอะไร.
   **ยังไม่มี gateway จริง** — ทุกสถานะมาจาก mock ใน treatmentRefer.js */
const EReferralPanel = ({ queue, canEdit, onRetry, onAppointment }) => {
  const gw = EREFERRAL_GATEWAY;
  const columns = [
    { key: 'eReferralNo', header: 'เลขที่ e-Referral', render: (r) => r.eReferralNo || '—' },
    { key: 'referNo', header: 'เลขที่ใบส่งต่อ' },
    { key: 'name', header: 'ชื่อ - นามสกุล', flex: 1 },
    { key: 'facility', header: 'สถานพยาบาลปลายทาง', flex: 1 },
    {
      key: 'status', header: 'สถานะคิวส่งออก',
      render: (r) => {
        const meta = eReferralStatusMeta(r.status);
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <StatusBadge style={meta.badge} size='small'>{meta.label}</StatusBadge>
            {r.attempts ? <span style={PANEL_LABEL_STYLE}>ลองส่งแล้ว {r.attempts} ครั้ง</span> : null}
            {r.error ? (
              <span style={{ ...PANEL_LABEL_STYLE, color: 'var(--text-alert-error, #B91C1C)' }}>{r.error}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'appointmentDate', header: 'วันที่มารับบริการปลายทาง',
      render: (r) => (r.appointmentDate
        ? <span style={PANEL_VALUE_STYLE}>{r.appointmentDate}</span>
        : <span style={PANEL_LABEL_STYLE}>ยังไม่ได้รับแจ้ง</span>),
    },
    {
      key: 'actions', header: 'การจัดการ',
      render: (r) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <GuardedAction
            allowed={canEdit && r.status !== 'sent'}
            reason={r.status === 'sent' ? 'ใบนี้ส่งเข้าระบบ e-Referral สำเร็จแล้ว' : NO_EDIT_RIGHT_TOOLTIP}
          >
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='refresh' onClick={() => onRetry(r)}>
              ลองส่งซ้ำ
            </NeutralSubdueButton>
          </GuardedAction>
          <GuardedAction allowed={canEdit}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='event_available' onClick={() => onAppointment(r)}>
              บันทึกวันที่นัด
            </NeutralSubdueButton>
          </GuardedAction>
        </div>
      ),
    },
  ];

  return (
    <PanelCard
      title={gw.name}
      subtitle={`${gw.endpoint} · ${gw.protocol}`}
      action={<StatusBadge style='warning' size='small' icon='cloud_off'>{gw.statusLabel}</StatusBadge>}
    >
      <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <InfoPair label='ซิงก์ล่าสุด' value={gw.lastSyncAt} minWidth={180} />
        <InfoPair label='เริ่มขาดการเชื่อมต่อ' value={gw.degradedSince} minWidth={200} />
        <InfoPair label='ใบในคิวส่งออก' value={`${queue.length} ใบ`} minWidth={140} />
      </div>

      <PanelAlert tone='warning' icon='info' title='ยังไม่มีเกตเวย์ e-Referral จริงในระบบต้นแบบ'>
        {gw.note}
      </PanelAlert>

      {queue.length === 0 ? (
        <PanelEmptyState
          icon='outgoing_mail'
          title='ยังไม่มีใบส่งต่อในคิว e-Referral'
          subtitle='ใบส่งต่อออกที่กด "ส่งใบส่งต่อ" แล้วจะเข้าคิวนี้พร้อมเลขที่ e-Referral โดยอัตโนมัติ'
        />
      ) : (
        <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
          <Table columns={columns} rows={queue} rowKey={(r) => r.id} />
        </div>
      )}
    </PanelCard>
  );
};

/* ── หน้าเพจ ─────────────────────────────────────────────────── */

const ReferralRegisterPage = () => {
  const history = useHistory();
  const { state: navState } = useLocation();
  const access = useTreatmentAccess();

  const [rows] = useTreatmentStore(subscribeReferrals, getReferrals);
  const [direction, setDirection] = useState('out');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  /* mode: 'list' | 'form' — pattern PharmacyRegistryPage (หน้าเดียว) */
  const [mode, setMode] = useState('list');
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [toast, setToast] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [sendGuard, setSendGuard] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  const [printCopies, setPrintCopies] = useState(2);
  /* 'print' = สั่งพิมพ์ปกติ · 'pdf' = บันทึกเป็น PDF (§1.4.6.1) — ต่างกันที่
     ชื่อไฟล์เริ่มต้นที่ส่งให้ print dialog เท่านั้น ยังไม่มี PDF engine จริง */
  const [printMode, setPrintMode] = useState('print');
  const [leaveGuard, setLeaveGuard] = useState(false);
  /* ใบที่รออยู่หลังผ่านประตู "ยังไม่ได้บันทึก" — ใช้ตอนกระโดดข้ามใบจาก
     popup ประวัติการส่งต่อ ไม่ให้ร่างที่พิมพ์ค้างไว้หายไปเงียบ ๆ */
  const [pendingOpenRow, setPendingOpenRow] = useState(null);
  /* §1.5.8.2 — popup ประวัติการส่งต่อรายผู้ป่วยข้าม visit */
  const [historyTarget, setHistoryTarget] = useState(null);
  /* §1.5.8.4 — บันทึกวันที่ปลายทางนัดผู้รับบริการมารับบริการ */
  const [appointmentTarget, setAppointmentTarget] = useState(null);
  const [appointmentDraft, setAppointmentDraft] = useState('');

  /* deep-link จากศูนย์เอกสาร Step 7 — เปิดฟอร์มใหม่ให้เลย.
     ต้องกิน nav state "ครั้งเดียว" แล้วล้างทิ้ง ไม่งั้นกด "กลับไปทะเบียน"
     แล้ว effect จะยิงซ้ำเปิดฟอร์มเปล่าใหม่ทันที (ติดกับดักในฟอร์มถาวร) */
  const navConsumedRef = useRef(false);
  useEffect(() => {
    if (navConsumedRef.current) return;
    if (!navState?.newForPatient) return;
    navConsumedRef.current = true;
    /* deep-link มาจากศูนย์เอกสาร = ใบส่งต่อ "ภายนอก" เสมอ จึงขอเลขชุด RF-
       ที่นี่ (blankReferral() ไม่ออกเลขให้แล้ว เพื่อไม่ให้เลขขาดหาย) */
    const blank = { ...blankReferral(navState.newForPatient), direction: 'out', referNo: nextReferNoFor('out') };
    setDraft(blank);
    setBaseline(blank);
    setMode('form');
    /* ล้าง location.state ทิ้ง — react-router v5 เก็บ state ไว้จนกว่าจะ navigate ใหม่ */
    history.replace({ pathname: '/treat/refer', state: undefined });
  }, [navState, history]);

  const directionRows = useMemo(() => referralsByDirection(direction), [rows, direction]); // eslint-disable-line react-hooks/exhaustive-deps

  /* คิวส่งออก e-Referral — อ่านจาก store เดียวกัน จึงรีเฟรชตาม `rows` */
  const eReferralRows = useMemo(() => eReferralQueue(), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const isInternalTab = direction === 'internal';

  const filtered = useMemo(() => {
    const match = buildMatcher(query);
    return directionRows
      .filter(match)
      .filter((r) => statusFilter === 'all' || r.status === statusFilter);
  }, [directionRows, query, statusFilter]);

  useEffect(() => { setPage(1); }, [query, statusFilter, direction]);

  const { pageCount, page: safePage, slice } = paginate(filtered, page, PER_PAGE);

  const summaryCards = useMemo(() => {
    const count = (pred) => directionRows.filter(pred).length;
    return [
      { key: 'all',        label: 'ใบส่งต่อทั้งหมด', value: directionRows.length,                        indicator: DIRECTION_TABS.find((t) => t.key === direction)?.label, color: 'brand',       icon: 'send' },
      { key: 'draft',      label: 'ร่าง',            value: count((r) => r.status === 'draft'),           indicator: 'ยังไม่ได้ส่ง',        color: 'inprogress',  icon: 'edit_note' },
      { key: 'sent',       label: 'ส่งแล้ว',          value: count((r) => r.status === 'sent'),            indicator: 'รอปลายทางตอบกลับ',   color: 'info',        icon: 'outgoing_mail' },
      { key: 'replied',    label: 'ตอบกลับแล้ว',      value: count((r) => r.status === 'replied'),         indicator: 'ปลายทางรับเรื่องแล้ว', color: 'positive',    icon: 'mark_email_read' },
      { key: 'incomplete', label: 'ข้อมูลไม่สมบูรณ์', value: count((r) => isReferIncomplete(r)),           indicator: 'ต้องกรอกให้ครบก่อนส่ง', color: 'destructive', icon: 'error' },
      { key: 'cancelled',  label: 'ยกเลิก',          value: count((r) => r.status === 'cancelled'),       indicator: 'เก็บไว้เป็นหลักฐาน',   color: 'brand',       icon: 'block' },
    ];
  }, [directionRows, direction]);

  const dirty = useMemo(
    () => (draft && baseline ? JSON.stringify(draft) !== JSON.stringify(baseline) : false),
    [draft, baseline],
  );

  const showToast = (variant, message) => setToast({ id: Date.now(), variant, message });

  const openRow = (row) => { setDraft({ ...row }); setBaseline({ ...row }); setMode('form'); };
  const openNew = () => {
    /* เลขที่ใบส่งต่อภายในเป็นคนละชุดกับภายนอก (IR- vs RF-) — ขอเลขครั้งเดียว
       ตามทิศทางที่กำลังเปิดอยู่ (blankReferral() ไม่ออกเลขมาให้แล้ว จึงไม่มี
       เลข RF- ถูกกินทิ้งตอนเปิดใบภายใน) */
    const blank = { ...blankReferral(), direction, referNo: nextReferNoFor(direction) };
    setDraft(blank); setBaseline(blank); setMode('form');
  };

  /* ปลายทางหลังผ่านประตู "ยังไม่ได้บันทึก" — ถ้ามีใบที่รอเปิดอยู่ให้เด้งไป
     ใบนั้นต่อ ไม่งั้นกลับไปหน้าทะเบียนตามเดิม */
  const leaveForm = () => {
    if (pendingOpenRow) {
      const row = pendingOpenRow;
      setPendingOpenRow(null);
      setDirection(row.direction);
      openRow(row);
      return;
    }
    setMode('list'); setDraft(null); setBaseline(null);
  };

  const backToList = () => {
    if (dirty) { setPendingOpenRow(null); setLeaveGuard(true); return; }
    setMode('list'); setDraft(null); setBaseline(null);
  };

  /* ทิศทางของใบมาจากตัวใบเอง ไม่ใช่แท็บที่เปิดอยู่ — เพราะ popup ประวัติ
     เปิดใบข้ามทิศทางได้ ถ้ายัด `direction` ของแท็บลงไปจะเปลี่ยนใบภายใน
     ให้กลายเป็นใบภายนอกตอนกดบันทึก */
  const doSave = () => {
    const saved = saveReferral({ ...draft, direction: draft.direction || direction });
    setDraft({ ...saved }); setBaseline({ ...saved });
    showToast('success', saved.status === 'draft'
      ? `บันทึกร่างใบส่งต่อ ${saved.referNo} แล้ว`
      : `บันทึกการแก้ไขใบส่งต่อ ${saved.referNo} แล้ว`);
    return saved;
  };

  const doSend = () => {
    const missing = missingReferFields(draft);
    if (missing.length) { setSendGuard(missing); return; }
    const saved = saveReferral({ ...draft, direction: draft.direction || direction });
    const sent = sendReferral(saved.id);
    setDraft({ ...sent }); setBaseline({ ...sent });
    showToast('success', sent.direction === 'internal'
      ? `มอบหมายใบส่งต่อภายใน ${sent.referNo} ให้ ${sent.assignee || 'หน่วยงานปลายทาง'} แล้ว`
      : `ส่งใบส่งต่อ ${sent.referNo} ไปยังปลายทางแล้ว`);
  };

  const doPrint = () => {
    /* ใบที่ยังไม่เคยบันทึกจะไม่มี id — printReferral() จะคืน null แล้ว crash
       ทั้งหน้า จึงต้องบันทึกร่างให้ก่อน และยังกันพลาดอีกชั้นถ้าบันทึกไม่ผ่าน */
    const target = printTarget?.id ? printTarget : doSave();
    const updated = target?.id ? printReferral(target.id, printCopies) : null;
    if (!updated) {
      showToast('error', 'ยังพิมพ์ไม่ได้ — บันทึกร่างใบส่งต่อก่อน แล้วจึงสั่งพิมพ์อีกครั้ง');
      setPrintTarget(null);
      return;
    }
    if (draft?.id === updated.id) { setDraft({ ...updated }); setBaseline({ ...updated }); }
    setPrintTarget(null);
    showToast('success', printMode === 'pdf'
      ? `เปิดหน้าต่างบันทึกเป็น PDF แล้ว (ชื่อไฟล์ ${referralFileName(updated)}) · บันทึกการพิมพ์ ${printCopies} ชุด`
      : `บันทึกการพิมพ์ ${printCopies} ชุด (รวมพิมพ์แล้ว ${updated.printCount} ครั้ง)`);
    /* §1.4.6.1 — ตั้งชื่อไฟล์ให้ปลายทาง "Save as PDF" ของเบราว์เซอร์ผ่าน
       document.title (ยังไม่มี PDF engine ฝั่ง server) */
    printWithFilename(referralFileName(updated));
  };

  /* โหมด "ไม่มีสิทธิ์" — ปฏิเสธทั้งหน้าพร้อมทางออกกลับคิว */
  if (!access.canView) {
    return (
      <QueuePageShell activeKey='refer' breadcrumb={breadcrumb} title='ทะเบียนการส่งต่อผู้รับบริการ'>
        <div style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)' }}>
          <AccessDeniedPanel what='ทะเบียนการส่งต่อ' onBack={() => history.push('/treat/queue')} />
        </div>
      </QueuePageShell>
    );
  }

  const canEdit = access.canEdit;
  /* ใบส่งต่อ "ภายนอก" ที่ส่งออกไปแล้วห้ามแก้ เพราะปลายทางถือฉบับที่พิมพ์ไปแล้ว
     — ต้องยกเลิกแล้วออกฉบับใหม่. ส่วนใบ "ภายใน" เป็นการมอบหมายงานในศูนย์
     เดียวกัน คู่มือ §2.1.19 ให้แก้รายละเอียด/เลื่อนวันเยี่ยมได้ ระบบจึงปล่อย
     ให้แก้ต่อได้แต่ต้องเตือนว่าผู้รับมอบหมายอาจเริ่มลงพื้นที่แล้ว (TOR §1.5.8.3
     บังคับให้ "แก้ไข" ใช้งานได้จริง ไม่ใช่แค่ยกเลิกแล้วออกใหม่). */
  const rowLocked = !draft
    ? false
    : draft.direction === 'internal'
      ? draft.status === 'cancelled'
      : (draft.status === 'sent' || draft.status === 'replied' || draft.status === 'cancelled');

  return (
    <QueuePageShell
      activeKey='refer'
      breadcrumb={breadcrumb}
      title={mode === 'list' ? 'ทะเบียนการส่งต่อผู้รับบริการ' : `ใบส่งต่อ ${draft?.referNo || ''}`}
      onBack={mode === 'list' ? () => history.push('/treat/queue') : backToList}
      backLabel={mode === 'list' ? 'กลับไปหน้าคิว' : 'กลับไปทะเบียน'}
      summaryCards={mode === 'list' ? summaryCards : undefined}
      tabs={mode === 'list' ? DIRECTION_TABS.map((t) => ({ key: t.key, label: t.label })) : undefined}
      activeTab={direction}
      onTabChange={setDirection}
      actions={mode === 'list' ? (
        <GuardedAction allowed={canEdit}>
          <BrandButton variant='fill' size='sm' leadingIcon='add' onClick={openNew}>
            {isInternalTab ? 'ออกใบส่งต่อภายในใหม่' : 'ออกใบส่งต่อใหม่'}
          </BrandButton>
        </GuardedAction>
      ) : null}
    >
      <PhcisTopToast session={toast} onDismiss={() => setToast(null)} />

      <div
        className='flex flex-col flex-1 min-w-0'
        style={{ paddingTop: 'var(--dim-space-600, 24px)', paddingRight: 'var(--dim-space-600, 24px)', paddingBottom: 'var(--dim-space-600, 24px)', paddingLeft: 'var(--dim-space-600, 24px)', gap: 'var(--dim-space-400, 16px)' }}
      >
        {mode === 'list' ? (
          <>
            <PanelCard
              title={DIRECTION_TABS.find((t) => t.key === direction)?.label}
              subtitle='ค้นหาได้ 3 แบบตามคู่มือ — เลข HN · เลขประจำตัวประชาชน 13 หลัก · ชื่อ+นามสกุล (ใช้ + คั่นคำ และ % แทนอักษรที่ไม่ทราบ)'
              action={<CountLabel n={filtered.length} />}
            >
              <div className='flex flex-wrap items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <PrimarySearch
                  value={query}
                  onChange={setQuery}
                  width={520}
                  placeholder='ค้นหา HN / เลขบัตร 13 หลัก / ชื่อ+นามสกุล'
                />
                <div style={{ minWidth: 220 }}>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[{ value: 'all', label: 'ทุกสถานะ' }, ...REFER_STATUSES.map((s) => ({ value: s.key, label: s.label }))]}
                    placeholder='กรองตามสถานะ'
                    showLabel={false}
                    showHelperText={false}
                  />
                </div>
                {query || statusFilter !== 'all' ? (
                  <NeutralSubdueButton variant='outline' size='sm' leadingIcon='filter_alt_off' onClick={() => { setQuery(''); setStatusFilter('all'); }}>
                    ล้างตัวกรอง
                  </NeutralSubdueButton>
                ) : null}
              </div>

              <SearchResultCount found={filtered.length} total={directionRows.length} />

              {/* legend "ข้อมูลไม่สมบูรณ์" ตามคู่มือ */}
              <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-300, 12px)' }}>
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <Sym name='error' size={14} color='var(--icon-dangerButton-default, #B91C1C)' />
                  <span style={PANEL_LABEL_STYLE}>ข้อมูลไม่สมบูรณ์ — บันทึกร่างได้ แต่ยังส่งไม่ได้</span>
                </span>
                <span className='inline-flex items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
                  <Sym name='event_busy' size={14} color='var(--icon-dangerButton-default, #B91C1C)' />
                  <span style={PANEL_LABEL_STYLE}>ใบส่งต่อหมดอายุแล้ว</span>
                </span>
              </div>

              {/* ทิศทางนี้ยังไม่มีใบเลย → empty state เฉพาะทิศทาง + ปุ่มสร้างใบแรก
                  (แยกจาก empty-filtered ที่กรองแล้วไม่เจอ ซึ่งยังต้องเห็นโครงตาราง) */}
              {directionRows.length === 0 ? (
                <PanelEmptyState
                  icon={isInternalTab ? 'diversity_1' : direction === 'out' ? 'send' : 'call_received'}
                  title={isInternalTab
                    ? 'ยังไม่มีใบส่งต่อภายในหน่วยงาน'
                    : direction === 'out' ? 'ยังไม่มีใบส่งต่อออกในระบบ' : 'ยังไม่มีใบส่งต่อรับเข้าจากสถานพยาบาลอื่น'}
                  subtitle={isInternalTab
                    ? 'ส่งงานเยี่ยมบ้าน คลินิกเฉพาะโรค สังคมสงเคราะห์ หรือเวชศาสตร์ฟื้นฟู ได้จากปุ่มด้านล่าง'
                    : direction === 'out'
                      ? 'กดปุ่มด้านล่างเพื่อสร้างใบส่งตัวฉบับแรกของศูนย์บริการ'
                      : 'ใบส่งต่อขาเข้าจะปรากฏที่นี่เมื่อสถานพยาบาลอื่นส่งผู้รับบริการมายังศูนย์'}
                  action={direction !== 'in' ? (
                    <GuardedAction allowed={canEdit}>
                      <BrandButton variant='outline' size='sm' leadingIcon='add' onClick={openNew}>
                        {isInternalTab ? 'สร้างใบส่งต่อภายในใบแรก' : 'สร้างใบส่งต่อใบแรก'}
                      </BrandButton>
                    </GuardedAction>
                  ) : null}
                />
              ) : (
                <div className='w-full min-w-0' style={{ overflowX: 'auto' }}>
                  <RegisterTable
                    rows={slice}
                    direction={direction}
                    onOpen={openRow}
                    onHistory={(row) => setHistoryTarget(row)}
                    emptyKind='filtered'
                  />
                </div>
              )}

              {pageCount > 1 ? (
                <div className='flex justify-end w-full'>
                  <Pagination currentPage={safePage} pageCount={pageCount} onPageChange={setPage} />
                </div>
              ) : null}
            </PanelCard>

            {/* §1.5.8.1 / §1.5.8.4 — สถานะเกตเวย์ e-Referral + คิวส่งออก
                (แสดงเฉพาะแท็บส่งต่อออก เพราะรับเข้า/ภายในไม่ผ่าน gateway) */}
            {direction === 'out' ? (
              <EReferralPanel
                queue={eReferralRows}
                canEdit={canEdit}
                onRetry={(row) => {
                  const updated = retryEReferral(row.id);
                  if (!updated) return;
                  showToast(
                    updated.eReferralStatus === 'sent' ? 'success' : 'error',
                    updated.eReferralStatus === 'sent'
                      ? `ส่ง ${updated.eReferralNo} เข้าระบบ e-Referral สำเร็จ`
                      : `ส่ง ${updated.eReferralNo} ไม่สำเร็จ (ครั้งที่ ${updated.eReferralAttempts}) — ${updated.eReferralError}`,
                  );
                }}
                onAppointment={(row) => {
                  setAppointmentTarget(row);
                  setAppointmentDraft(row.appointmentDate || '');
                }}
              />
            ) : null}
          </>
        ) : (
          <>
            {/* แถบสถานะ + การกระทำของใบนี้ */}
            <PanelCard
              title={`สถานะใบส่งต่อ · ${referStatusMeta(draft.status).label}`}
              subtitle={`สร้างโดย ${draft.createdBy || '—'} ${draft.createdAt ? `· ${draft.createdAt}` : ''} · พิมพ์แล้ว ${draft.printCount || 0} ครั้ง`}
              action={
                <>
                  <GuardedAction allowed={canEdit && !rowLocked}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='save' onClick={doSave}>
                      {draft.status === 'draft' ? 'บันทึกร่าง' : 'บันทึกการแก้ไข'}
                    </NeutralSubdueButton>
                  </GuardedAction>
                  <GuardedAction allowed={canEdit && draft.status === 'draft'}>
                    <BrandButton variant='fill' size='sm' leadingIcon='send' onClick={doSend}>
                      {draft.direction === 'internal' ? 'มอบหมายงานให้หน่วยงานภายใน' : 'ส่งใบส่งต่อ'}
                    </BrandButton>
                  </GuardedAction>
                  <GuardedAction
                    allowed={canEdit && draft.status !== 'cancelled' && !!draft.id}
                    reason={!draft.id ? 'ต้องกด "บันทึกร่าง" ก่อน จึงจะพิมพ์ใบส่งตัวได้' : NO_EDIT_RIGHT_TOOLTIP}
                  >
                    <BrandSubdueButton
                      variant='outline' size='sm' leadingIcon='print'
                      onClick={() => { setPrintMode('print'); setPrintTarget(draft); }}
                    >
                      {draft.direction === 'internal' ? 'พิมพ์ใบส่งต่อภายใน' : 'พิมพ์ใบส่งตัว'}
                    </BrandSubdueButton>
                  </GuardedAction>
                  {/* §1.4.6.1 — บันทึกเป็นไฟล์ PDF โดยตั้งชื่อไฟล์ให้อัตโนมัติ */}
                  <GuardedAction
                    allowed={canEdit && draft.status !== 'cancelled' && !!draft.id}
                    reason={!draft.id ? 'ต้องกด "บันทึกร่าง" ก่อน จึงจะบันทึกเป็น PDF ได้' : NO_EDIT_RIGHT_TOOLTIP}
                  >
                    <NeutralSubdueButton
                      variant='outline' size='sm' leadingIcon='picture_as_pdf'
                      onClick={() => { setPrintMode('pdf'); setPrintTarget(draft); }}
                    >
                      บันทึกเป็น PDF
                    </NeutralSubdueButton>
                  </GuardedAction>
                  <GuardedAction allowed={canEdit && draft.status !== 'cancelled' && !!draft.id}>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(draft)}>
                      ยกเลิกใบส่งต่อ
                    </NeutralSubdueButton>
                  </GuardedAction>
                  {/* §1.5.8.2 — เปิดประวัติการส่งต่อของผู้ป่วยรายนี้ได้จากในฟอร์มด้วย
                      ไม่ต้องย้อนกลับไปทะเบียนก่อน */}
                  <GuardedAction allowed={!!String(draft.hn || '').trim()} reason='ใบนี้ยังไม่มี HN ในระบบ — ยังดูประวัติข้าม visit ไม่ได้'>
                    <NeutralSubdueButton variant='outline' size='sm' leadingIcon='history' onClick={() => setHistoryTarget(draft)}>
                      ประวัติการส่งต่อ
                    </NeutralSubdueButton>
                  </GuardedAction>
                </>
              }
            >
              {draft.cancelledAt ? (
                <CancelledMark at={draft.cancelledAt} reason={draft.cancelReason} label='ใบส่งต่อถูกยกเลิก' />
              ) : null}
              {rowLocked && draft.status !== 'cancelled' ? (
                <PanelAlert tone='info' icon='lock' title='ใบส่งต่อถูกส่งออกไปแล้ว'>
                  แก้ไขเนื้อหาไม่ได้เพื่อรักษาความสอดคล้องกับฉบับที่ปลายทางได้รับ — หากข้อมูลผิด ให้ยกเลิกใบนี้พร้อมเหตุผลแล้วออกฉบับใหม่
                </PanelAlert>
              ) : null}
              {/* ส่งต่อภายใน: แก้ได้ต่อ แต่ต้องเตือนก่อนว่าอาจกระทบงานที่เริ่มไปแล้ว */}
              {draft.direction === 'internal' && (draft.status === 'sent' || draft.status === 'replied') ? (
                <PanelAlert tone='warning' icon='assignment_late' title='ใบนี้มอบหมายงานไปแล้ว — แก้ไขได้แต่ต้องแจ้งผู้รับมอบหมาย'>
                  มอบหมายให้ {draft.assignee || '—'}
                  {draft.assignedAt ? ` เมื่อ ${draft.assignedAt}` : ''}
                  {draft.assignmentAcceptedAt ? ` · ตอบรับแล้ว ${draft.assignmentAcceptedAt}` : ' · ยังไม่ตอบรับ'}
                  {' '}— ผู้รับมอบหมายอาจเริ่มลงพื้นที่หรือเตรียมงานไปแล้ว
                  ทุกการแก้ไขจะถูกบันทึกในประวัติการแก้ไข และต้องแจ้งเจ้าตัวด้วยตนเองทุกครั้ง
                </PanelAlert>
              ) : null}
              {!canEdit ? (
                <PanelAlert tone='info' icon='visibility' title='โหมดดูอย่างเดียว'>
                  {NO_EDIT_RIGHT_TOOLTIP} — ปุ่มบันทึก/ส่ง/ยกเลิก/พิมพ์ถูกปิดไว้ แต่ยังอ่านรายละเอียดได้ทั้งหมด
                </PanelAlert>
              ) : null}
              {missingReferFields(draft).length ? (
                <PanelAlert tone='warning' icon='error' title='ข้อมูลไม่สมบูรณ์'>
                  ยังขาด: {missingReferFields(draft).join(' · ')} — บันทึกร่างได้ แต่กด "ส่งใบส่งต่อ" ไม่ได้จนกว่าจะครบ
                </PanelAlert>
              ) : null}
            </PanelCard>

            <ReferralForm draft={draft} setDraft={setDraft} canEdit={canEdit} readOnly={rowLocked} />

            {/* ใบพิมพ์ — แสดงตัวอย่างในหน้า และเป็นตัวเดียวที่ @media print ปล่อยให้เห็น.
                ส่งต่อภายในใช้แผ่นคนละแบบ (ไม่มีสถานพยาบาลปลายทาง มีช่องเซ็น
                "ผู้รับมอบหมาย" แทน) ตามคู่มือ HCIS §2.1.19 */}
            <PanelCard
              title={draft.direction === 'internal' ? 'ตัวอย่างใบส่งต่อภายในสำหรับพิมพ์' : 'ตัวอย่างใบส่งตัวสำหรับพิมพ์'}
              subtitle='กระดาษ A4 ขอบ 12 มม. ผ่าน @media print ของ printKit · ปุ่ม "บันทึกเป็น PDF" ด้านบนตั้งชื่อไฟล์ให้อัตโนมัติแล้วใช้ปลายทาง Save as PDF ของเบราว์เซอร์ (ยังไม่มี PDF engine ฝั่ง server)'
            >
              {draft.direction === 'internal'
                ? <InternalReferralPrintSheet row={draft} copies={draft.printCopies} />
                : <ReferralPrintSheet row={draft} copies={draft.printCopies} />}
            </PanelCard>
          </>
        )}
      </div>

      {/* ยืนยันการยกเลิก — บังคับเหตุผล */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title={cancelTarget?.direction === 'internal' ? 'ยกเลิกใบส่งต่อภายใน' : 'ยกเลิกใบส่งต่อ'}
        description={
          cancelTarget?.direction === 'internal'
            ? (cancelTarget?.status === 'sent' || cancelTarget?.status === 'replied'
              ? `งานนี้มอบหมายให้ ${cancelTarget?.assignee || 'หน่วยงานภายใน'} ไปแล้ว ผู้รับมอบหมายอาจเริ่มลงพื้นที่หรือเตรียมงานไว้แล้ว — ต้องแจ้งเจ้าตัวด้วยตนเองเพิ่มเติม ระบบจะขีดฆ่าใบนี้ไว้พร้อมเหตุผล ไม่ลบออกจากทะเบียน`
              : 'ระบบจะขีดฆ่าใบส่งต่อภายในนี้ไว้ในทะเบียนพร้อมเหตุผล ไม่ลบออกจากระบบ')
            : (cancelTarget?.status === 'sent' || cancelTarget?.status === 'replied'
              ? 'ใบส่งต่อฉบับนี้ถูกส่งออกไปแล้ว ปลายทางอาจได้รับเอกสารเรียบร้อยแล้ว — ต้องแจ้งปลายทางด้วยตนเองเพิ่มเติม ระบบจะเก็บใบนี้ไว้พร้อมเหตุผล ไม่ลบออกจากทะเบียน'
              : 'ระบบจะขีดฆ่าใบส่งต่อนี้ไว้ในทะเบียนพร้อมเหตุผล ไม่ลบออกจากระบบ')
        }
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={cancelTarget?.direction === 'internal' ? [
          'ผู้รับบริการย้ายที่อยู่ออกนอกพื้นที่รับผิดชอบของศูนย์บริการ',
          'ผู้รับบริการปฏิเสธการเยี่ยมบ้าน ขอมารับบริการที่ศูนย์เองแทน',
          'ส่งหน่วยงานภายในผิดหน่วย — ออกใบส่งต่อภายในฉบับใหม่แทน',
          'อาการดีขึ้นแล้ว ไม่จำเป็นต้องติดตามที่บ้านต่อ',
        ] : [
          'ผู้รับบริการปฏิเสธการส่งต่อ ขอรับการรักษาที่ศูนย์บริการต่อ',
          'ระบุสถานพยาบาลปลายทางผิด — ออกใบส่งต่อฉบับใหม่แทน',
          'อาการดีขึ้นหลังการรักษาที่ศูนย์ จึงไม่จำเป็นต้องส่งต่อ',
          'ปลายทางแจ้งว่าเตียงเต็ม ขอเปลี่ยนสถานพยาบาลปลายทาง',
        ]}
        onConfirm={(reason) => {
          const updated = cancelReferral(cancelTarget.id, reason);
          if (draft?.id === updated.id) { setDraft({ ...updated }); setBaseline({ ...updated }); }
          setCancelTarget(null);
          showToast('success', `ยกเลิกใบส่งต่อ ${updated.referNo} แล้ว (เก็บไว้ในทะเบียนพร้อมเหตุผล)`);
        }}
        onClose={() => setCancelTarget(null)}
      />

      {/* กันการส่งเมื่อข้อมูลไม่ครบ */}
      <AlertDialog
        open={!!sendGuard}
        type='warning'
        title='ยังส่งใบส่งต่อไม่ได้'
        description={`ข้อมูลที่จำเป็นยังไม่ครบ: ${(sendGuard || []).join(' · ')} — กรอกให้ครบก่อนจึงจะส่งได้ (บันทึกร่างไว้ก่อนได้)`}
        confirmLabel='กลับไปกรอกต่อ'
        showCancel={false}
        onConfirm={() => setSendGuard(null)}
        onClose={() => setSendGuard(null)}
      />

      {/* เลือกจำนวนชุดก่อนพิมพ์ */}
      <AlertDialog
        open={!!printTarget}
        type='info'
        title={printMode === 'pdf' ? 'บันทึกใบส่งตัวเป็น PDF' : 'พิมพ์ใบส่งตัว'}
        description={printMode === 'pdf'
          ? `ระบบจะเปิดหน้าต่างพิมพ์ของเบราว์เซอร์ โดยตั้งชื่อไฟล์ให้เป็น "${printTarget ? referralFileName(printTarget) : ''}" — เลือกปลายทางเป็น "บันทึกเป็น PDF" (ยังไม่มี PDF engine ฝั่งเซิร์ฟเวอร์) · ระบบนับเป็นการพิมพ์และบันทึกลงประวัติการแก้ไขด้วย`
          : `ระบบจะนับจำนวนครั้งที่พิมพ์เพิ่มและบันทึกลงประวัติการแก้ไข (พิมพ์ไปแล้ว ${printTarget?.printCount || 0} ครั้ง)`}
        confirmLabel={printMode === 'pdf' ? 'บันทึกเป็น PDF' : 'พิมพ์'}
        cancelLabel='ยกเลิก'
        onConfirm={doPrint}
        onCancel={() => setPrintTarget(null)}
        onClose={() => setPrintTarget(null)}
      >
        <div style={{ minWidth: 220 }}>
          <Select
            label='จำนวนชุดที่พิมพ์'
            value={String(printCopies)}
            onChange={(v) => setPrintCopies(Number(v))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} ชุด` }))}
            placeholder='เลือกจำนวนชุด'
          />
        </div>
      </AlertDialog>

      {/* กันออกจากฟอร์มโดยยังไม่บันทึก */}
      <UnsavedChangesPopup
        open={leaveGuard}
        onClose={() => { setLeaveGuard(false); setPendingOpenRow(null); }}
        onSave={() => { doSave(); setLeaveGuard(false); leaveForm(); }}
        onDiscard={() => { setLeaveGuard(false); leaveForm(); }}
        title='ยังไม่ได้บันทึกใบส่งต่อฉบับนี้'
        description={pendingOpenRow
          ? `กด "บันทึก" เพื่อเก็บใบฉบับนี้เป็นร่างก่อนเปิดใบ ${pendingOpenRow.referNo} หรือ "ไม่บันทึก" เพื่อทิ้งสิ่งที่พิมพ์ไว้แล้วเปิดใบนั้นทันที`
          : 'กด "บันทึก" เพื่อเก็บเป็นร่างไว้ในทะเบียน หรือ "ไม่บันทึก" เพื่อคืนค่าเดิมทั้งหมดและกลับไปหน้าทะเบียน'}
      />

      {/* §1.5.8.2 — ประวัติการส่งต่อรายผู้ป่วยข้าม visit ครบทั้ง 3 ทิศทาง */}
      <Popup
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        size='extraLarge'
        title={`ประวัติการส่งต่อ — ${historyTarget?.name || ''}`}
        subtitle={`HN ${historyTarget?.hn || '—'} · ทุกใบส่งต่อของผู้รับบริการรายนี้ข้ามครั้งที่มารับบริการ เรียงตามเวลา (ใหม่ → เก่า) · ใบที่ยกเลิกยังคงอยู่ในประวัติ`}
        primaryAction={{ label: 'ปิด', onClick: () => setHistoryTarget(null) }}
      >
        <ReferralHistoryTimeline
          hn={historyTarget?.hn || ''}
          onOpen={(row) => {
            /* กระโดดไปที่ใบนั้นจริง ๆ — ต้องสลับแท็บตามทิศทางของใบด้วย
               ไม่งั้นกด "กลับไปทะเบียน" แล้วจะไม่เจอใบที่เพิ่งดู.
               ถ้าร่างที่เปิดอยู่ยังไม่ได้บันทึก ต้องผ่านประตูเดียวกับ
               "กลับไปทะเบียน" ก่อน ไม่งั้นข้อความทางคลินิกที่พิมพ์ค้างไว้
               จะถูกทับหายไปเงียบ ๆ */
            if (dirty) {
              setPendingOpenRow(row);
              setHistoryTarget(null);
              setLeaveGuard(true);
              return;
            }
            setHistoryTarget(null);
            setDirection(row.direction);
            openRow(row);
          }}
        />
      </Popup>

      {/* §1.5.8.4 — วันที่ปลายทางนัดให้ผู้รับบริการมารับบริการ */}
      <AlertDialog
        open={!!appointmentTarget}
        type='info'
        title='บันทึกวันที่มารับบริการปลายทาง'
        description={`ใบส่งต่อ ${appointmentTarget?.referNo || ''} · ${appointmentTarget?.facility || ''} — บันทึกวันที่ปลายทางแจ้งนัด เพื่อให้เจ้าหน้าที่ติดตามผู้รับบริการได้`}
        confirmLabel='บันทึกวันที่'
        cancelLabel='ยกเลิก'
        onConfirm={() => {
          const updated = setReferralAppointmentDate(appointmentTarget.id, appointmentDraft.trim());
          setAppointmentTarget(null);
          if (draft?.id === updated?.id) { setDraft({ ...updated }); setBaseline({ ...updated }); }
          showToast('success', updated?.appointmentDate
            ? `บันทึกวันที่มารับบริการ ${updated.appointmentDate} แล้ว`
            : 'ล้างวันที่มารับบริการแล้ว');
        }}
        onCancel={() => setAppointmentTarget(null)}
        onClose={() => setAppointmentTarget(null)}
      >
        <InputField
          label='วันที่ปลายทางนัดให้มารับบริการ'
          value={appointmentDraft}
          onChange={setAppointmentDraft}
          showLeadingIcon={false}
          placeholder='เช่น 12 พฤษภาคม 2569'
          helperText='เว้นว่างเพื่อล้างวันที่นัดออก — ทุกการแก้ไขถูกบันทึกในประวัติการแก้ไข'
        />
      </AlertDialog>
    </QueuePageShell>
  );
};

export default ReferralRegisterPage;
