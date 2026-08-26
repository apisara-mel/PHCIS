import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Topic from '@/components/topic/Topic';
import Footer from '@/components/layout/Footer';
import SuccessScreen from '@/components/layout/SuccessScreen';
import BrandButton from '@/components/button/BrandButton';
import Radio from '@/components/radio/Radio';
import Icon from '@/components/icons/Icon';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import Popup from '@/components/popup/Popup';
import StepProgress from '@/components/step/StepProgress';
import AlertDialog from '@/components/popup/AlertDialog';
import { HeaderCell, DataCell, TableRow } from '@/components/table/Table';
import ASSESS_NAV from '@/pages/assess/assessNav';
import {
  PERM_NONE,
  PERM_VIEW,
  PERM_WRITE,
  PERM_EDIT,
  CENTER_OPTIONS,
  defaultPermissions,
  findAccessControl,
  createAccessControl,
  upsertAccessControl,
  bumpAccessControlVersion,
  latestVersion,
  formatVersion,
  countPermissionBuckets,
  submitForApproval,
  APPROVAL_DRAFT,
  DATA_SCOPE_OPTIONS,
  SCOPE_CENTER,
  PII_OPTIONS,
  PII_VISIBLE,
  PII_MASKED,
  dataScopeLabel,
} from '@/data/accessControlStore';
import { findCenterDetail } from '@/data/centerStore';
import { readActivities } from '@/data/activityStore';
import { readDepartments } from '@/data/departmentStore';
import { readPositions, sortPositions } from '@/data/positionStore';
import {
  ACCESS_SYSTEMS,
  PERM_META,
  PERM_MIXED,
  menuLeafKeys,
  systemLeafKeys,
  rollupLevel,
  setLevelForLeaves,
} from '@/data/accessMenuCatalog';

/* PHCIS | Assess-control — Create / edit access rights (Figma 4D3nTx53 · 15:30160). */

/* 3 ขั้นของป๊อปอัปเพิ่ม/แก้ไขสิทธิ์ — เรียงตามลำดับที่ต้องตัดสินใจจริง:
   ตั้งชื่อ+ผูกบทบาทก่อน → ขอบเขต/ช่วงเวลาที่สิทธิ์มีผล → รายละเอียดสิทธิ์ */
const ACCESS_FORM_STEPS = [
  { key: 'template', label: 'แม่แบบและการผูกบทบาท' },
  { key: 'scope',    label: 'ขอบเขตและช่วงเวลา' },
  { key: 'perm',     label: 'สิทธิ์การเข้าถึงระบบ' },
];

const breadcrumb = ['สิทธิ์การเข้าถึงระบบ'];

const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
  boxShadow: 'var(--shadow-card)',
  padding: 'var(--dim-space-600)',
};

/* ในป๊อปอัปไม่ใช้ขอบ/เงาของการ์ด (ตัวป๊อปอัปมีกรอบของตัวเองแล้ว ซ้อนสองชั้น
   ดูหนักโดยไม่ได้ข้อมูลเพิ่ม) แต่ยังต้องเห็นว่าช่องไหนอยู่กลุ่มเดียวกัน จึงรอง
   พื้นสีเทาอ่อนแทนขอบ (26 ส.ค. 2569 มติผู้ใช้) */
/* คำอธิบายที่ใช้ซ้ำบ่อยในทะเบียนสิทธิ์ — เสนอให้เลือกแล้วพิมพ์ต่อได้ */
const DESCRIPTION_SUGGESTIONS = [
  'เข้าถึงเฉพาะระบบบันทึกการรักษา',
  'เข้าถึงการรักษาระดับสูงสุด',
  'ดูข้อมูลได้อย่างเดียว ไม่แก้ไข',
  'เฉพาะงานเวชระเบียนและคัดกรอง',
  'เฉพาะงานเภสัชกรรมและจ่ายยา',
  'เฉพาะงานการเงินและสิทธิการรักษา',
  'สิทธิ์ผู้ดูแลระบบของศูนย์',
];

const CARD_FLAT = {
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
  borderRadius: 'var(--dim-radius-400)',
  padding: 'var(--dim-space-400)',
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

const PERM_COL_W = { none: 112, view: 156, write: 116, edit: 156 };

function PermRadioCell({ name, value, level, checked, onSelect }) {
  return (
    <div className='flex items-center justify-center w-full'>
      <Radio
        name={name}
        value={level}
        checked={checked}
        onChange={() => onSelect(level)}
        aria-label={value}
        showDescription={false}
        style={{ gap: 'var(--dim-space-0)' }}
      />
    </div>
  );
}

/* ช่องผูกบทบาท — ฟิลด์ปกติมีป้ายกำกับของตัวเอง ไม่ใช่ตาราง (26 ส.ค. 2569
   มติผู้ใช้) ตารางแถวเดียวอ่านยากและต้องเลื่อนแนวนอนบนจอแคบ ทั้งที่นี่คือ
   "ฟอร์มกรอกค่าเดียว" ไม่ใช่รายการหลายแถว */
function RoleFields({
  centerId,
  branchId,
  positionId,
  activityId,
  subActivityId,
  departmentId,
  description,
  centerOpts,
  branchOpts,
  positionOpts,
  activityOpts,
  subActivityOpts,
  deptOpts,
  onCenter,
  onBranch,
  onPosition,
  onActivity,
  onSubActivity,
  onDepartment,
  onDescription,
}) {
  /* สิทธิ์กำหนดตาม ตำแหน่ง · บทบาท · แผนก (26 ส.ค. 2569 มติผู้ใช้)
     "บทบาทย่อย" ถอดออกจากฟอร์ม 26 ส.ค. 69 — แม่แบบผูกถึงระดับบทบาทพอ
     (ค่า subActivityId ของ record เดิมยังถูกเก็บและใช้จับคู่ต่อไปตามปกติ) */
  const fields = [
    /* เรียงจากหน่วยใหญ่ไปเล็ก: ศูนย์ → แผนกในศูนย์ → ตำแหน่ง → บทบาท
       (26 ส.ค. 2569 มติผู้ใช้ — เดิมแผนกไปอยู่ท้ายสุด) */
    { key: 'center',   label: 'ศูนย์บริการ', options: centerOpts,   value: centerId,     onChange: onCenter },
    /* สาขาย่อยขึ้นกับศูนย์ที่เลือก — ศูนย์ที่ไม่มีสาขาจะเหลือแค่ "ทุกสาขา"
       (ตัวเลือกเดียว = ปิดช่องไว้ ไม่ให้กดแล้วไม่มีอะไรให้เลือก) */
    {
      key: 'branch',
      label: 'สาขาย่อย',
      options: branchOpts,
      value: branchId,
      onChange: onBranch,
      placeholder: 'ทุกสาขาในศูนย์นี้',
      disabled: !centerId || branchOpts.length <= 1,
    },
    { key: 'dept',     label: 'แผนก',        options: deptOpts,     value: departmentId, onChange: onDepartment },
    { key: 'position', label: 'ตำแหน่ง',     options: positionOpts, value: positionId,   onChange: onPosition },
    { key: 'activity', label: 'บทบาท',       options: activityOpts, value: activityId,   onChange: onActivity },
  ];

  return (
    <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {fields.map((f) => (
        <div key={f.key} style={{ flex: '1 1 220px', minWidth: 200 }}>
          <Select
            label={f.label}
            showHelperText={false}
            size='large'
            options={f.options}
            value={f.value}
            onChange={f.onChange}
            placeholder={f.placeholder}
            disabled={f.disabled}
          />
        </div>
      ))}
      {/* คำอธิบายมักยาวหลายบรรทัด และคำที่ใช้ซ้ำกันทั้งทะเบียน จึงเป็น textarea
          พร้อมคำแนะนำที่พิมพ์ต่อได้ (26 ส.ค. 2569 มติผู้ใช้) */}
      <div className='w-full' style={{ flex: '1 1 100%', minWidth: 240 }}>
        <SuggestibleTextarea
          label='คำอธิบาย'
          value={description}
          onChange={(e) => onDescription(e?.target ? e.target.value : e)}
          placeholder='เช่น เข้าถึงการรักษาระดับสูงสุด'
          suggestions={DESCRIPTION_SUGGESTIONS}
          minChars={1}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PermissionTree — สิทธิ์ 3 ระดับ: ระบบ → เมนู → เมนูย่อย (26 ส.ค. 2569)
   ══════════════════════════════════════════════════════════════════════
   ระดับสิทธิ์เก็บที่ "ใบ" (เมนูที่ไม่มีเมนูย่อย หรือเมนูย่อยแต่ละอัน) แถวแม่
   เป็นตัวสรุป — กดที่แถวแม่ = เซ็ตลูกทุกตัวพร้อมกัน ลูกไม่เท่ากันแสดงว่า
   "กำหนดรายเมนู" */

const PERM_HEADERS = [
  { level: PERM_NONE, title: 'ไม่มีสิทธิ์', width: PERM_COL_W.none },
  { level: PERM_VIEW, title: 'อ่านได้อย่างเดียว', width: PERM_COL_W.view },
  { level: PERM_WRITE, title: 'เขียนได้', width: PERM_COL_W.write },
  { level: PERM_EDIT, title: 'อ่านและเขียนได้', width: PERM_COL_W.edit },
];

const PERM_TREE_MIN_W = 640;

function PermLevelCells({ nodeKey, label, level, onSelect, rowStyle }) {
  return PERM_HEADERS.map((col, i) => (
    <DataCell
      key={col.level}
      {...DATA_CELL_OFF}
      style={{
        width: col.width,
        flexShrink: 0,
        justifyContent: 'center',
        ...(i === PERM_HEADERS.length - 1 ? {} : {}),
        ...rowStyle,
      }}
    >
      <PermRadioCell
        name={nodeKey}
        value={`${label} — ${PERM_META[col.level].label}`}
        level={col.level}
        checked={level === col.level}
        onSelect={onSelect}
      />
    </DataCell>
  ));
}

function PermNodeRow({
  nodeKey, label, depth, level, onSelect, expandable, expanded, onToggle,
}) {
  const isSystem = depth === 0;
  return (
    <TableRow>
      <DataCell
        {...DATA_CELL_OFF}
        style={{
          flex: '1 1 0',
          minWidth: 0,
          paddingLeft: `calc(var(--dim-space-400) + ${depth} * var(--dim-space-600))`,
          background: isSystem ? 'var(--surface-brandPrimary-quaternary)' : undefined,
        }}
      >
        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
          {expandable ? (
            <button
              type='button'
              onClick={onToggle}
              aria-label={expanded ? `ย่อ ${label}` : `กาง ${label}`}
              aria-expanded={expanded}
              className='inline-flex items-center justify-center shrink-0'
              style={{
                width: 'var(--dim-size-500, 20px)',
                height: 'var(--dim-size-500, 20px)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-content-tertiary)',
                cursor: 'pointer',
              }}
            >
              <Icon name={expanded ? 'expand_more' : 'chevron_right'} size={18} />
            </button>
          ) : (
            <span className='shrink-0' style={{ width: 'var(--dim-size-500, 20px)' }} />
          )}
          <span
            className='truncate'
            style={{
              ...CELL_TEXT,
              fontFamily: isSystem
                ? 'var(--type-family-heading-graphic2)'
                : 'var(--type-family-body)',
              color: isSystem ? 'var(--text-brandPrimary-default)' : CELL_TEXT.color,
            }}
          >
            {label}
          </span>
          {level === PERM_MIXED ? (
            <ColorfulBadge style='grey' size='small' hierarchy='secondary' width='hug'>
              กำหนดรายเมนู
            </ColorfulBadge>
          ) : null}
        </div>
      </DataCell>
      <PermLevelCells nodeKey={nodeKey} label={label} level={level} onSelect={onSelect} />
    </TableRow>
  );
}

function PermissionTree({ permissions, onSetLeaves }) {
  /* ระบบกางไว้หมดตั้งแต่แรก · เมนูย่อยพับไว้ก่อน ไม่งั้นแถวยาวเป็นร้อย */
  const [openMenus, setOpenMenus] = useState({});
  const [closedSystems, setClosedSystems] = useState({});
  const toggleMenu = (key) => setOpenMenus((p) => ({ ...p, [key]: !p[key] }));
  const toggleSystem = (key) => setClosedSystems((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className='w-full overflow-x-auto' style={TABLE_FRAME}>
      <div style={{ minWidth: PERM_TREE_MIN_W }}>
        <div className='flex w-full'>
          <HeaderCell
            title='ระบบ / เมนู / เมนูย่อย'
            showSubtext={false}
            style={{ flex: '1 1 0', minWidth: 0, borderTopLeftRadius: 'var(--dim-radius-400)' }}
          />
          {PERM_HEADERS.map((col, i) => (
            <HeaderCell
              key={col.level}
              title={col.title}
              showSubtext={false}
              align='center'
              style={{
                width: col.width,
                flexShrink: 0,
                ...(i === PERM_HEADERS.length - 1
                  ? { borderTopRightRadius: 'var(--dim-radius-400)' }
                  : {}),
              }}
            />
          ))}
        </div>

        {ACCESS_SYSTEMS.map((system) => {
          const sysLeaves = systemLeafKeys(system);
          const sysOpen = !closedSystems[system.key];
          return (
            <React.Fragment key={system.key}>
              <PermNodeRow
                nodeKey={system.key}
                label={system.label}
                depth={0}
                level={rollupLevel(permissions, sysLeaves)}
                onSelect={(lv) => onSetLeaves(sysLeaves, lv)}
                expandable
                expanded={sysOpen}
                onToggle={() => toggleSystem(system.key)}
              />
              {sysOpen && system.menus.map((menu) => {
                const leaves = menuLeafKeys(menu);
                const hasChildren = menu.children.length > 0;
                const menuOpen = !!openMenus[menu.key];
                return (
                  <React.Fragment key={menu.key}>
                    <PermNodeRow
                      nodeKey={menu.key}
                      label={menu.label}
                      depth={1}
                      level={rollupLevel(permissions, leaves)}
                      onSelect={(lv) => onSetLeaves(leaves, lv)}
                      expandable={hasChildren}
                      expanded={menuOpen}
                      onToggle={() => toggleMenu(menu.key)}
                    />
                    {hasChildren && menuOpen && menu.children.map((sub) => (
                      <PermNodeRow
                        key={sub.key}
                        nodeKey={sub.key}
                        label={sub.label}
                        depth={2}
                        level={permissions[sub.key] || PERM_NONE}
                        onSelect={(lv) => onSetLeaves([sub.key], lv)}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ใช้ได้สองเปลือก — หน้าเต็ม (route /assess/access-control/new · /:id/edit)
   และป๊อปอัป (กด "เพิ่มสิทธิ์การเข้าถึงระบบ" ในทะเบียน 26 ส.ค. 69 มติผู้ใช้)
   เนื้อฟอร์มชุดเดียวกัน แก้ที่เดียวมีผลทั้งสองทาง — หลักเดียวกับ CenterEditPopup */
export default function AccessControlCreatePage({
  asPopup = false,
  existingId = null,
  onClose,
  onSaved,
}) {
  const navigate = useHistory();
  const { id: routeId } = useParams();
  const id = asPopup ? existingId : routeId;
  const isEdit = asPopup ? !!existingId : window.location.pathname.endsWith('/edit');
  const existing = useMemo(() => (id ? findAccessControl(id) : null), [id]);

  const [templateName, setTemplateName] = useState('');
  const [centerId, setCenterId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [subActivityId, setSubActivityId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [saved, setSaved] = useState(false);
  /* Confirmation ก่อนบันทึกจริง (Nielsen #5 Error prevention) — การเปลี่ยนสิทธิ์
     กระทบการเข้าถึงของบุคลากรทั้งกลุ่มกิจกรรม จึงให้ทวนสรุปก่อนยืนยัน */
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  /* step ของโหมดป๊อปอัป (หน้าเต็มไม่ใช้) */
  const [stepIdx, setStepIdx] = useState(0);
  /* ธรรมาภิบาลสิทธิ์ (มติ คทง.13 §1.3/§2.3 + คทง.2/3/4/10/11):
     ขอบเขตข้อมูล · การเห็น PII · ช่วงเวลาที่สิทธิ์มีผล · สถานะอนุมัติ */
  const [dataScope, setDataScope] = useState(SCOPE_CENTER);
  const [piiVisibility, setPiiVisibility] = useState(PII_VISIBLE);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  /* ช่วงเวลาเข้าใช้งานรายวัน (access-time window) — Figma "History and Access" */
  const [dailyFrom, setDailyFrom] = useState('');
  const [dailyTo, setDailyTo] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [approvalNote, setApprovalNote] = useState('');

  const activities = useMemo(() => readActivities(), []);
  const departments = useMemo(() => readDepartments(), []);
  const positions = useMemo(() => sortPositions(readPositions()).filter((p) => p.active !== false), []);

  /* เวอร์ชันที่กำลังแก้อยู่: ของใหม่เริ่มที่ v1 · ของเดิมบันทึกทับแล้วเดินขึ้นหนึ่งขั้น */
  const currentVersion = existing ? latestVersion(existing) : 1;
  const nextVersion = existing ? currentVersion + 1 : 1;

  useEffect(() => {
    if (!existing) return;
    setTemplateName(existing.templateName || '');
    setCenterId(existing.centerId || '');
    setBranchId(existing.branchId || '');
    setPositionId(existing.positionId || '');
    setActivityId(existing.activityId || '');
    setSubActivityId(existing.subActivityId || '');
    setDepartmentId(existing.departmentId || '');
    setDescription(existing.description || '');
    setPermissions({ ...defaultPermissions(), ...existing.permissions });
    setDataScope(existing.dataScope || SCOPE_CENTER);
    setPiiVisibility(existing.piiVisibility || PII_VISIBLE);
    setEffectiveFrom(existing.effectiveFrom || '');
    setDailyFrom(existing.dailyFrom || '');
    setDailyTo(existing.dailyTo || '');
    setEffectiveTo(existing.effectiveTo || '');
    setApprovalNote(existing.approvalNote || '');
  }, [existing]);

  const selectedActivity = activities.find((a) => a.id === activityId);
  const subActivityOpts = useMemo(() => {
    const list = selectedActivity?.subActivities || [];
    return [{ value: '', label: 'ทุกบทบาทย่อย' }, ...list.map((sub) => ({ value: sub.id, label: sub.name }))];
  }, [selectedActivity]);

  const centerOpts = [{ value: '', label: 'เลือกศูนย์บริการ' }, ...CENTER_OPTIONS];

  /* สาขาย่อยอ่านจากทะเบียนศูนย์จริง — ศูนย์ที่ไม่มีสาขาจะเหลือแค่ "ทุกสาขา"
     (26 ส.ค. 2569 มติผู้ใช้) */
  const branchOpts = useMemo(() => {
    const detail = centerId ? findCenterDetail(centerId) : null;
    return [
      { value: '', label: 'ทุกสาขาในศูนย์นี้' },
      ...(detail?.branches || []).map((b) => ({ value: b.id, label: b.name })),
    ];
  }, [centerId]);
  /* คุณลักษณะที่เว้นว่าง = ไม่จำกัด (ตรงกับกติกา ABAC ใน accessControlStore)
     จึงอ่านว่า "ทุก…" ไม่ใช่ "ยังไม่ผูก" */
  const positionOpts = [{ value: '', label: 'ทุกตำแหน่ง' }, ...positions.map((p) => ({ value: p.id, label: p.name }))];
  const activityOpts = [{ value: '', label: 'ทุกบทบาท' }, ...activities.map((a) => ({ value: a.id, label: a.name }))];
  const deptOpts = [{ value: '', label: 'ทุกแผนก' }, ...departments.map((d) => ({ value: d.id, label: d.name }))];

  const labelOf = (opts, value) => opts.find((o) => o.value === value)?.label || '';

  /* บันทึกได้เมื่อ **ตั้งชื่อแม่แบบ** แล้ว — ไม่บังคับกิจกรรม / ตำแหน่ง */
  const nameValid = templateName.trim().length > 0;
  /* ศูนย์ · แผนก · ตำแหน่ง · บทบาท ต้องเลือกครบ (26 ส.ค. 2569 มติผู้ใช้) —
     สาขาย่อยยังไม่บังคับ เว้นว่าง = คลุมทั้งศูนย์ */
  const roleValid = !!(centerId && departmentId && positionId && activityId);

  /* เซ็ตระดับสิทธิ์ให้ "ใบ" ที่ส่งมา — แถวระบบ/เมนูส่งใบของทั้งกลุ่มมาพร้อมกัน */
  const applyLeaves = (leafKeys, level) => {
    setPermissions((p) => setLevelForLeaves(p, leafKeys, level));
  };

  const buildRecord = ({ bump }) => {
    const base = existing || createAccessControl({});
    const withEdits = {
      ...base,
      templateName: templateName.trim(),
      centerId,
      center: labelOf(centerOpts, centerId),
      positionId,
      position: positionId ? labelOf(positionOpts, positionId) : '',
      activityId,
      activity: activityId ? labelOf(activityOpts, activityId) : '',
      subActivityId,
      subActivity: labelOf(subActivityOpts, subActivityId),
      departmentId,
      department: labelOf(deptOpts, departmentId),
      description: description.trim(),
      permissions,
      active: base.active !== false,
      dataScope,
      piiVisibility,
      effectiveFrom,
      dailyFrom,
      dailyTo,
      effectiveTo,
      approvalNote: approvalNote.trim(),
    };
    /* แก้ของเดิม = ออกเวอร์ชันใหม่ (เวอร์ชันเก่าเก็บลง history ให้ย้อนดูได้) */
    return bump && existing ? bumpAccessControlVersion(withEdits) : withEdits;
  };

  /* ออกจากฟอร์ม — ป๊อปอัปปิดตัวเอง หน้าเต็มกลับไปทะเบียน */
  const leaveForm = () => {
    if (asPopup) { onClose?.(); return; }
    navigate.push('/assess/access-control');
  };

  const handleSaveDraft = () => {
    /* บันทึกร่าง = ยังไม่ส่งขออนุมัติ สิทธิ์จึงยังไม่มีผล */
    upsertAccessControl({ ...buildRecord({ bump: false }), approvalStatus: APPROVAL_DRAFT });
    if (asPopup) { onSaved?.('บันทึกร่างสิทธิ์การเข้าถึงระบบแล้ว'); onClose?.(); }
  };

  /* ช่วงวันที่ต้องไม่กลับหัว (สิ้นสุดก่อนเริ่ม) — คทง.13 §2.3 */
  const dateRangeError = !!effectiveFrom && !!effectiveTo && effectiveTo < effectiveFrom
    ? 'วันสิ้นสุดต้องไม่มาก่อนวันเริ่มมีผล'
    : '';

  /* ปุ่ม primary เปิด modal ทวนสรุปก่อน — ยืนยันแล้วจึงบันทึกจริง */
  const handleSubmit = () => {
    if (!nameValid || !roleValid || dateRangeError) return;
    setConfirmSaveOpen(true);
  };

  const applySubmit = () => {
    setConfirmSaveOpen(false);
    /* กด "ส่งขออนุมัติ" = เข้าคิวรออนุมัติ ยังไม่มีผลจนกว่าผู้มีอำนาจจะอนุมัติ */
    upsertAccessControl(submitForApproval(buildRecord({ bump: true }), approvalNote.trim()));
    if (asPopup) {
      onSaved?.('ส่งขออนุมัติสิทธิ์การเข้าถึงระบบแล้ว — รอผู้มีอำนาจอนุมัติ');
      onClose?.();
      return;
    }
    if (isEdit) {
      navigate.push(`/assess/access-control/${id}`);
      return;
    }
    setSaved(true);
  };

  const confirmSummary = useMemo(() => {
    const { view, write, edit } = countPermissionBuckets(permissions);
    const parts = [
      positionId ? `ตำแหน่ง "${labelOf(positionOpts, positionId)}"` : '',
      activityId ? `บทบาท "${labelOf(activityOpts, activityId)}"${subActivityId ? ` · ${labelOf(subActivityOpts, subActivityId)}` : ''}` : '',
      departmentId ? `แผนก "${labelOf(deptOpts, departmentId)}"` : '',
    ].filter(Boolean);
    const scope = parts.length ? parts.join(' · ') : 'ยังไม่ผูกตำแหน่ง/บทบาท/แผนก';
    const versionNote = isEdit ? `บันทึกเป็น ${formatVersion(nextVersion)} (แทน ${formatVersion(currentVersion)})` : 'เวอร์ชันแรก (v1)';
    const period = effectiveFrom || effectiveTo
      ? ` · มีผล ${effectiveFrom || 'ทันที'} ถึง ${effectiveTo || 'ไม่กำหนด'}`
      : '';
    return `${scope} — อ่านได้ ${view} เมนู · เขียนได้ ${write} เมนู · อ่านและเขียนได้ ${edit} เมนู · ${dataScopeLabel(dataScope)}${piiVisibility === PII_MASKED ? ' (ปิดบัง PII)' : ''}${period} · ${versionNote}`;
  }, [permissions, positionId, activityId, subActivityId, departmentId, positionOpts, activityOpts,
    subActivityOpts, deptOpts, isEdit, nextVersion,
    currentVersion, dataScope, piiVisibility, effectiveFrom, effectiveTo,
    dailyFrom, dailyTo]);

  if (isEdit && id && !existing) {
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

  const saveDisabled = !nameValid || !roleValid || !!dateRangeError;
  const submitLabel = isEdit ? `ส่งขออนุมัติ ${formatVersion(nextVersion)}` : 'ส่งขออนุมัติสิทธิ์';

  /* ป๊อปอัปเดินเป็น step — ฟอร์มเดียวยาว 3 การ์ดกดยากบนจอเล็ก และการตั้งสิทธิ์
     ควรตั้งชื่อ/ผูกบทบาทให้เสร็จก่อนค่อยลงรายละเอียดสิทธิ์ (26 ส.ค. 69 มติผู้ใช้)
     หน้าเต็ม (route เดิม) ยังเป็นฟอร์มยาวเลื่อนเดียวเหมือนเดิม */
  const sectionCard = asPopup ? CARD_FLAT : CARD;

  const stepSections = [
    (
<>
          {/* Card 0 — แม่แบบ + เวอร์ชัน. ตั้งชื่อแม่แบบก่อนเป็นอันดับแรก
              โดยยังไม่ต้องผูกกิจกรรม — ผูกทีหลังได้ในการ์ดถัดไป. */}
          {/* ไม่มีหัวข้อการ์ดและกล่องเวอร์ชัน — ชื่อ step บนหัวป๊อปอัปบอกอยู่แล้ว
              และเวอร์ชันไปโผล่ที่ subtitle ของป๊อปอัปตอนแก้ไข (26 ส.ค. 2569) */}
          <section className='flex flex-col w-full' style={{ ...sectionCard, gap: 'var(--dim-space-400)' }}>
            <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '2 1 320px', minWidth: 240 }}>
                <InputField
                  label='ชื่อแม่แบบ'
                  required
                  value={templateName}
                  onChange={setTemplateName}
                  placeholder='เช่น สิทธิแพทย์ตรวจโรคทั่วไป'
                  helperText='ชื่อนี้ใช้อ้างอิงแม่แบบเมื่อนำไปผูกกับกิจกรรมหรือบุคลากร'
                />
              </div>
            </div>
          </section>

          {/* Card 1 — ข้อมูลบทบาท (Figma 15:30160 · card) */}
          <section className='flex flex-col w-full' style={{ ...sectionCard, gap: 'var(--dim-space-300)' }}>
            <Topic
              hierarchy='primary'
              title='ข้อมูลบทบาท'
              showSubText={false}
              showLeadingIcon={false}
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <RoleFields
              centerId={centerId}
              branchId={branchId}
              positionId={positionId}
              activityId={activityId}
              subActivityId={subActivityId}
              departmentId={departmentId}
              description={description}
              centerOpts={centerOpts}
              branchOpts={branchOpts}
              positionOpts={positionOpts}
              activityOpts={activityOpts}
              subActivityOpts={subActivityOpts}
              deptOpts={deptOpts}
              onCenter={(v) => { setCenterId(v); setBranchId(''); }}
              onBranch={setBranchId}
              onPosition={setPositionId}
              onActivity={(v) => { setActivityId(v); setSubActivityId(''); }}
              onSubActivity={setSubActivityId}
              onDepartment={setDepartmentId}
              onDescription={setDescription}
            />
          </section>

</>
    ),
    (
<>
          {/* Card 1.5 — ขอบเขตข้อมูลและระยะเวลา
              มติ คทง.2/3/4/10/11: ศบส. เห็นเฉพาะของตน · กอง/ผู้บริหารเห็น
              ภาพรวมแต่ปิดบัง PII · คทง.4: อสส. เห็นเฉพาะเคสที่ได้รับมอบหมาย
              มติ คทง.13 §2.3: กำหนดช่วงเวลาเริ่ม-สิ้นสุดการเข้าถึงได้ */}
          <section className='flex flex-col w-full' style={{ ...sectionCard, gap: 'var(--dim-space-400)' }}>
            <Topic
              hierarchy='primary'
              title='ขอบเขตข้อมูลและระยะเวลาที่มีผล'
              subText='กำหนดว่าเห็นข้อมูลของหน่วยใดได้บ้าง เห็นข้อมูลระบุตัวตนหรือไม่ และสิทธิ์นี้มีผลช่วงใด'
              showLeadingIcon={false}
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                <Select
                  label='ขอบเขตข้อมูลที่มองเห็น'
                  options={DATA_SCOPE_OPTIONS.map((o) => ({ value: o.value, label: o.label, subtext: o.hint }))}
                  value={dataScope}
                  onChange={setDataScope}
                  searchable={false}
                  showHelperText
                  helperText='อสส./ผู้ช่วยงานชุมชน ให้เลือก "เฉพาะเคสที่ได้รับมอบหมาย" (มติ คทง.4)'
                />
              </div>
              <div style={{ flex: '1 1 320px', minWidth: 260 }}>
                <Select
                  label='ข้อมูลระบุตัวตน (PII)'
                  options={PII_OPTIONS}
                  value={piiVisibility}
                  onChange={setPiiVisibility}
                  searchable={false}
                  showHelperText
                  helperText='ระดับกอง/ผู้บริหารให้ปิดบัง PII และดูผ่านรหัสนิรนาม (มติ คทง.10/11)'
                />
              </div>
            </div>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                <InputField
                  label='วันเริ่มมีผล'
                  type='date'
                  showLeadingIcon={false}
                  value={effectiveFrom}
                  onChange={setEffectiveFrom}
                  helperText='เว้นว่าง = มีผลทันทีที่อนุมัติ'
                />
              </div>
              <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                <InputField
                  label='วันสิ้นสุด'
                  type='date'
                  showLeadingIcon={false}
                  value={effectiveTo}
                  onChange={setEffectiveTo}
                  error={dateRangeError || undefined}
                  helperText={dateRangeError || 'เว้นว่าง = ไม่กำหนดวันสิ้นสุด'}
                />
              </div>
              {/* ช่วงเวลาเข้าใช้งานรายวัน — Figma "PHCIS | History and Access"
                  กำหนดหน้าต่างเวลาต่อวัน (เช่น 08.00-16.00 น.) แยกจากช่วง "วัน"
                  ข้างบน · เว้นว่าง = เข้าได้ตลอด 24 ชม. · ข้ามเที่ยงคืนได้ (เวรดึก) */}
              <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                <InputField
                  label='เข้าใช้งานได้ตั้งแต่ (รายวัน)'
                  type='time'
                  showLeadingIcon={false}
                  value={dailyFrom}
                  onChange={setDailyFrom}
                  helperText='เว้นว่าง = เข้าได้ตลอด 24 ชม.'
                />
              </div>
              <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                <InputField
                  label='ถึงเวลา (รายวัน)'
                  type='time'
                  showLeadingIcon={false}
                  value={dailyTo}
                  onChange={setDailyTo}
                  helperText={dailyFrom && dailyTo && dailyTo < dailyFrom
                    ? 'ข้ามเที่ยงคืน — ใช้กับเวรดึก'
                    : 'เว้นว่าง = ถึงสิ้นวัน'}
                />
              </div>
            </div>
            <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-400)' }}>
              <div style={{ flex: '2 1 320px', minWidth: 260 }}>
                <InputField
                  label='เหตุผล/บันทึกถึงผู้อนุมัติ'
                  showLeadingIcon={false}
                  value={approvalNote}
                  onChange={setApprovalNote}
                  placeholder='เช่น ขอเปิดสิทธิ์ให้ทีมสังคมสงเคราะห์ปีงบ 69'
                  helperText='แสดงให้ผู้มีอำนาจเห็นตอนพิจารณาอนุมัติ'
                />
              </div>
            </div>
          </section>

</>
    ),
    (
<>
          {/* Card 2 — สิทธิ์การเข้าถึงระบบ (Figma 15:30160 · card) */}
          <section className='flex flex-col w-full' style={{ ...sectionCard, gap: 'var(--dim-space-600)' }}>
            <Topic
              hierarchy='primary'
              title='สิทธิ์การเข้าถึงระบบ'
              subText='กำหนดได้ถึงระดับเมนูย่อย — กดที่แถวระบบหรือเมนูเพื่อเซ็ตทั้งกลุ่มพร้อมกัน'
              showLeadingIcon={false}
              showBadge={false}
              showChevron={false}
              showSuccess={false}
            />
            <PermissionTree permissions={permissions} onSetLeaves={applyLeaves} />
          </section>
</>
    ),
  ];

  const shellBody = (sections) => (
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            padding: 'var(--dim-space-600)',
            gap: 'var(--dim-space-300)',
            paddingBottom: 'var(--dim-space-900)',
          }}
        >
          {sections}
        </div>
  );

  const body = shellBody(stepSections);
  const isLastStep = stepIdx === ACCESS_FORM_STEPS.length - 1;

  /* ทวนสรุปก่อนบันทึกการเปลี่ยนแปลงสิทธิ์ — กัน slip ก่อนกระทบทั้งกลุ่มบทบาท */
  const confirmDialog = (
    <AlertDialog
      open={confirmSaveOpen}
      onClose={() => setConfirmSaveOpen(false)}
      type='warning'
      alignment='center'
      title={isEdit ? 'ส่งขออนุมัติสิทธิ์เวอร์ชันใหม่?' : 'ส่งขออนุมัติสิทธิ์การเข้าถึงระบบ?'}
      description={`แม่แบบ "${templateName.trim()}" — ${confirmSummary}. สิทธิ์จะยังไม่มีผลจนกว่าผู้มีอำนาจจะอนุมัติ`}
      confirmLabel={isEdit ? `ส่งขออนุมัติ ${formatVersion(nextVersion)}` : 'ส่งขออนุมัติ'}
      cancelLabel='ยกเลิก'
      onConfirm={applySubmit}
    />
  );

  if (asPopup) {
    return (
      <>
        <Popup
          open
          onClose={leaveForm}
          size='extraLarge'
          title={isEdit ? 'แก้ไขสิทธิ์การเข้าถึงระบบ' : 'เพิ่มสิทธิ์การเข้าถึงระบบ'}
          subtitle={isEdit ? `เวอร์ชันปัจจุบัน ${formatVersion(currentVersion)}` : undefined}
          headerCenter={(
            <StepProgress
              steps={ACCESS_FORM_STEPS.map((st) => st.label)}
              current={stepIdx}
              onStepClick={(i) => { if (i < stepIdx) setStepIdx(i); }}
              labelNoWrap
            />
          )}
          /* วางปุ่มแบบเดียวกับป๊อปอัปแบบ step อื่นของระบบ (CenterEditPopup):
             secondary = ย้อนกลับ/ยกเลิก · tertiary = บันทึกร่าง · primary = เดินหน้า */
          secondaryAction={stepIdx > 0
            ? { label: 'ย้อนกลับ', onClick: () => setStepIdx((i) => i - 1) }
            : { label: 'ยกเลิก', onClick: leaveForm }}
          tertiaryAction={{ label: 'บันทึกร่าง', disabled: saveDisabled, onClick: handleSaveDraft }}
          /* ขั้นสุดท้ายเท่านั้นที่ส่งขออนุมัติ — คทง.13 §1.3 สิทธิ์ต้องผ่านการอนุมัติก่อนมีผล
             ขั้นแรกยังต้องมีชื่อแม่แบบก่อนถึงจะเดินหน้าได้ */
          primaryAction={isLastStep
            ? { label: submitLabel, trailingIcon: 'arrow_forward', disabled: saveDisabled, onClick: handleSubmit }
            : { label: 'ถัดไป', trailingIcon: 'arrow_forward', disabled: stepIdx === 0 && (!nameValid || !roleValid), onClick: () => setStepIdx((i) => i + 1) }}
        >
          {shellBody(stepSections[stepIdx])}
        </Popup>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <QueuePageShell
        activeKey='assess-access-control'
        sidebarItems={ASSESS_NAV}
        sidebarFallbackKey='assess-access-control'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='สิทธิ์การเข้าถึงระบบ'
      >
        {body}

        <Footer
          type='with BTN'
          sticky
          showButton3
          button3Label='ยกเลิก'
          onButton3Click={leaveForm}
          showButton2
          button2Label='บันทึกร่าง'
          button2Icon='save'
          button2Disabled={saveDisabled}
          onButton2Click={handleSaveDraft}
          showButton1
          button1Label={submitLabel}
          button1TrailingIcon='arrow_forward'
          button1Disabled={saveDisabled}
          onButton1Click={handleSubmit}
        />
      </QueuePageShell>

      {confirmDialog}

      {saved ? (
        <SuccessScreen
          title={<>ส่งขออนุมัติสิทธิ์การเข้าถึงระบบ<br />สำเร็จ — รอผู้มีอำนาจอนุมัติ</>}
          buttonLabel='เข้าสู่หน้าสิทธิ์การเข้าถึงระบบ'
          onDone={() => navigate.push('/assess/access-control')}
        />
      ) : null}
    </>
  );
}
