import React, { useEffect, useRef, useState } from 'react';
import Popup from '@/components/popup/Popup';
import StatusBadge from '@/components/badge/StatusBadge';
import BrandButton from '@/components/button/BrandButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandCircleSubdueIconButton from '@/components/button/BrandCircleSubdueIconButton';
import DangerCircleSubdueIconButton from '@/components/button/DangerCircleSubdueIconButton';

/* Figma PHCIS | Telemedicine · Participant (114:56061)
   Entry: avatar stack content-group (58:8962) → list popup → เพิ่มผู้เข้าร่วม. */

const Sym = ({ name, size = 20, fill = 0, color, style }) => (
  <span
    className='material-symbols-outlined'
    aria-hidden
    style={{
      fontFamily: 'Material Symbols Outlined',
      fontVariationSettings: `'FILL' ${fill}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      fontSize: size,
      lineHeight: 1,
      color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style,
    }}
  >
    {name}
  </span>
);

const STATUS_META = {
  joined: { style: 'success', label: 'เข้าร่วมแล้ว' },
  connecting: { style: 'warning', label: 'กำลังเชื่อมต่อ' },
  left: { style: 'neutral', label: 'ออกจากห้องแล้ว' },
};

const FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'doctor', label: 'แพทย์' },
  { key: 'nurse', label: 'พยาบาล' },
];

/* รูป mock ของบุคลากร
   ══════════════════════════════════════════════════════════════════════
   ของเดิมใช้ไฟล์เดียวกันซ้ำทุกคนในกลุ่ม และไฟล์เหล่านั้นไม่ใช่รูปคนเดียว:
   `doctor-a.png` เป็นแผ่นรวม 5 รูปเรียงเป็นตาราง · `doctor-f.png` เป็นภาพครึ่งตัว
   ที่คนอยู่ชิดขวา · `patient.png` มีพื้นที่ว่างอยู่กลางภาพ. พอเอามาครอปเป็นวงกลม
   จึงได้ใบหน้าครึ่งซีก หลายหน้าในกรอบเดียว หรือวงกลมเปล่า และเพศไม่ตรงคำนำหน้า
   (นพ. ได้รูปผู้หญิง). ที่นี่ใช้รูปที่ครอปเป็นรายคนแล้ว และเลือกตามคำนำหน้าชื่อ */
const DOCTOR_FEMALE = [1, 2, 3, 4, 5, 6].map((n) => `/avatars/telemed/staff-doctor-female-${n}.png`);
const DOCTOR_MALE = [1, 2, 3].map((n) => `/avatars/telemed/staff-doctor-male-${n}.png`);
const NURSE_FEMALE = ['/avatars/telemed/staff-nurse-female-1.png'];
const PATIENT_MALE = ['/avatars/somchai-mock.png', '/avatars/patient-male-d.png', '/avatars/patient-male-e.png'];
const PATIENT_FEMALE = ['/avatars/patient-female-a.png', '/avatars/patient-female-b.png', '/avatars/patient-female-c.png'];

const pick = (pool, i) => pool[i % pool.length];

/** เลือกรูปจากคำนำหน้าชื่อ + บทบาท เพื่อไม่ให้เพศ/วิชาชีพหลุดจากกัน */
const avatarFor = (name, role, i = 0) => {
  if (name.startsWith('พญ.')) return pick(DOCTOR_FEMALE, i);
  if (name.startsWith('นพ.')) return pick(DOCTOR_MALE, i);
  if (role === 'พยาบาล') return pick(NURSE_FEMALE, i);
  if (name.startsWith('นาย')) return pick(PATIENT_MALE, i);
  return pick(PATIENT_FEMALE, i);
};



/** ทะเบียนผู้ที่เชิญเข้าห้องปรึกษาได้ — เฉพาะ "บุคลากร" เท่านั้น
    ผู้รับบริการเข้าห้องผ่านนัดหมายของตัวเอง ไม่ใช่ผ่านการเชิญของแพทย์
    จึงถูกถอดออกจากทะเบียนนี้ทั้งหมด */
export const TELEMED_INVITE_DIRECTORY = [
  { id: 'dir-doctor', name: 'พญ.สมหญิง รักษาดี', sub: 'somying@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-nurse', name: 'น.ส.ใจดี งามวงศ์', sub: 'jaidee@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-dentist', name: 'นพ.ใจดีมาก งามวงศ์', sub: 'jaideemak@hospital.go.th', filter: 'doctor', role: 'ทันตแพทย์', accent: '#8B5CF6' },
  { id: 'dir-005', name: 'พญ.กมลชนก แสงทอง', sub: 'kamonchanok@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-006', name: 'นพ.ธนกร ใจดี', sub: 'thanakorn@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#8B5CF6' },
  { id: 'dir-007', name: 'น.ส.พิมพ์ชนก รุ่งเรือง', sub: 'pimchanok@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-008', name: 'พญ.อรวรรณ ศรีสุข', sub: 'orawan@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-009', name: 'นพ.ปิยะ วัฒนกุล', sub: 'piya@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#8B5CF6' },
  { id: 'dir-010', name: 'น.ส.สุพัตรา ยิ้มแย้ม', sub: 'supattra@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-011', name: 'พญ.นภัสสร ทองคำ', sub: 'napassorn@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-012', name: 'นพ.เอกชัย ไพศาล', sub: 'ekkachai@hospital.go.th', filter: 'doctor', role: 'ทันตแพทย์', accent: '#8B5CF6' },
  { id: 'dir-013', name: 'น.ส.รัตนาภรณ์ หอมกลิ่น', sub: 'rattanaporn@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-014', name: 'พญ.ชนิดา รักเรียน', sub: 'chanida@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-015', name: 'นพ.กิตติพงศ์ มั่งมี', sub: 'kittipong@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#8B5CF6' },
  { id: 'dir-016', name: 'น.ส.วิภาวี ใจงาม', sub: 'wipawee@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-017', name: 'พญ.ธัญญาเรศ พูนผล', sub: 'thanyares@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-018', name: 'นพ.ภาณุพงศ์ ศรีวิไล', sub: 'panupong@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#8B5CF6' },
  { id: 'dir-019', name: 'น.ส.กาญจนา ดวงแก้ว', sub: 'kanjana@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
  { id: 'dir-020', name: 'พญ.ปวีณา สุขสวัสดิ์', sub: 'paweena@hospital.go.th', filter: 'doctor', role: 'แพทย์', accent: '#10B981' },
  { id: 'dir-021', name: 'น.ส.อารียา แสนดี', sub: 'areeya@hospital.go.th', filter: 'nurse', role: 'พยาบาล', accent: '#10B981' },
].map((row, i) => ({ ...row, avatar: avatarFor(row.name, row.role, i) }));

export const DEFAULT_TELEMED_EXTRA_PARTICIPANTS = [
  {
    id: 'nurse-1',
    name: 'น.ส.ใจดี งามวงศ์',
    role: 'พยาบาล',
    avatar: NURSE_FEMALE[0],
    accent: '#10B981',
    micOn: true,
    camOn: false,
    status: 'connecting',
  },
  {
    id: 'dent-1',
    name: 'นพ.ใจดีมาก งามวงศ์',
    role: 'ทันตแพทย์',
    avatar: DOCTOR_MALE[1],
    accent: '#8B5CF6',
    micOn: true,
    camOn: true,
    status: 'left',
  },
];

const injectSearchChrome = () => {
  if (typeof document === 'undefined') return;
  const id = 'mih-telemed-participant-search-css';
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
.mih-telemed-participant-search,
.mih-telemed-participant-search:focus,
.mih-telemed-participant-search:focus-visible {
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-telemed-participant-search::placeholder {
  color: var(--text-secondarysearch-default, #ADB2B7);
  opacity: 1;
}
`;
  document.head.appendChild(style);
};

const Avatar = ({ src, name, size = 40 }) => (
  <span
    aria-hidden={!name}
    title={name}
    style={{
      width: size,
      height: size,
      borderRadius: 'var(--dim-radius-full, 9999px)',
      overflow: 'hidden',
      flexShrink: 0,
      background: 'var(--surface-neutral-tertiary, #F4F5F5)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {src ? (
      <img src={src} alt='' width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <Sym name='person' size={Math.round(size * 0.55)} fill={1} color='var(--icon-content-secondary, #636B72)' />
    )}
  </span>
);

const FilterChip = ({ label, selected, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
  <button
    type='button'
    onClick={onClick}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'var(--dim-size-600, 32px)',
      minWidth: 'var(--dim-size-800, 40px)',
      maxWidth: 192,
      padding: 'var(--dim-space-100, 4px) var(--dim-space-300, 12px)',
      gap: 'var(--dim-space-150, 6px)',
      borderRadius: 'var(--dim-radius-full, 9999px)',
      border: `var(--dim-stroke-100, 1px) solid ${
        selected
          ? 'var(--border-brandtag-selected, #C5EDDA)'
          : (hovered ? 'var(--border-brandtag-hover, #C5EDDA)' : 'var(--border-brandtag-default, #E2E4E6)')
      }`,
      background: selected
        ? (hovered ? 'var(--surface-brandtag-selected-hover, #E2F3EB)' : 'var(--surface-brandtag-selected, #F4FBF8)')
        : (hovered ? 'var(--surface-brandtag-hover, #F4FBF8)' : 'var(--surface-brandtag-default, #FFFFFF)'),
      color: selected
        ? 'var(--text-brandtag-selected, #007549)'
        : (hovered ? 'var(--text-brandtag-hover, #007549)' : 'var(--text-brandtag-default, #4D5358)'),
      transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-sm, 14px)',
      fontWeight: 'var(--type-weight-medium, 500)',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
  );
};

/* Back chevron in the "Add Participant" header — same hover chrome as
   Popup's X close button (Figma 104:5369 Default/Hover): transparent by
   default, --surface-neutralbutton-quaternary-hover pill on hover. */
const BackButton = ({ onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type='button'
      aria-label='กลับ'
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'var(--dim-size-600, 32px)',
        height: 'var(--dim-size-600, 32px)',
        padding: 0,
        border: 0,
        borderRadius: 'var(--dim-radius-200, 8px)',
        background: hovered
          ? 'var(--surface-neutralbutton-quaternary-hover, #F4F5F5)'
          : 'transparent',
        cursor: 'pointer',
        flexShrink: 0,
        color: hovered
          ? 'var(--icon-neutralbutton-secondary, #636B72)'
          : 'var(--icon-neutralbutton-default, #4D5358)',
        transition: 'background-color 150ms ease-out, color 150ms ease-out',
      }}
    >
      <Sym name='chevron_left' size={20} color='currentColor' />
    </button>
  );
};

const MediaToggle = ({ on, kind, onClick, ariaLabel }) => {
  const IconBtn = on ? BrandCircleSubdueIconButton : DangerCircleSubdueIconButton;
  const icon = kind === 'mic'
    ? (on ? 'mic' : 'mic_off')
    : (on ? 'videocam' : 'videocam_off');
  return (
    <IconBtn
      variant='outline'
      size='xs'
      icon={icon}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        border: on
          ? 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimaryButton-tertiary, #C5EDDA)'
          : 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-tertiary, #FECACA)',
      }}
    />
  );
};

const ParticipantRow = ({
  person,
  isLast,
  onToggleMic,
  onToggleCam,
}) => {
  const status = STATUS_META[person.status] || STATUS_META.joined;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--dim-space-200, 8px)',
        minHeight: 'var(--dim-size-1000, 48px)',
        padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
        /* สีเส้นคั่นเดียวกับแถวตารางหน้า worklist (--border-table-line) */
        borderBottom: isLast
          ? 'none'
          : 'var(--dim-stroke-100, 1px) solid var(--border-table-line, var(--brand-p50, #F4FBF8))',
        borderRadius: 'var(--dim-radius-150, 6px)',
        background: 'var(--surface-list-default, #FFFFFF)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <Avatar src={person.avatar} name={person.name} />
      <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', gap: 'var(--dim-space-200, 8px)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm, 14px)',
              color: 'var(--text-list-default, #4D5358)',
              lineHeight: 1.5,
            }}
          >
            {person.name}
          </div>
          <div
            style={{
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-xs, 12px)',
              color: 'var(--text-list-subtext, #858C92)',
              lineHeight: 1.5,
            }}
          >
            {person.roleLabel || person.role}
          </div>
          <div style={{ display: 'flex', gap: 'var(--dim-space-100, 4px)', paddingTop: 'var(--dim-space-100, 4px)' }}>
            <MediaToggle
              on={person.micOn !== false}
              kind='mic'
              ariaLabel={person.micOn !== false ? 'ปิดไมโครโฟน' : 'เปิดไมโครโฟน'}
              onClick={() => onToggleMic?.(person.id)}
            />
            <MediaToggle
              on={person.camOn !== false}
              kind='cam'
              ariaLabel={person.camOn !== false ? 'ปิดกล้อง' : 'เปิดกล้อง'}
              onClick={() => onToggleCam?.(person.id)}
            />
          </div>
        </div>
        <StatusBadge style={status.style} size='small'>{status.label}</StatusBadge>
      </div>
    </div>
  );
};

const InviteRow = ({ person, invited, isLast, onInvite, onUninvite }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--dim-space-200, 8px)',
      minHeight: 'var(--dim-size-1000, 48px)',
      padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
      /* เส้นคั่นสีเดียวกับแถวตารางหน้า worklist */
      borderBottom: isLast
        ? 'none'
        : 'var(--dim-stroke-100, 1px) solid var(--border-table-line, var(--brand-p50, #F4FBF8))',
      background: 'var(--surface-list-default, #FFFFFF)',
      width: '100%',
      boxSizing: 'border-box',
    }}
  >
    <Avatar src={person.avatar} name={person.name} />
    <div style={{ flex: '1 1 0%', minWidth: 0 }}>
      <div style={{ fontSize: 'var(--type-size-sm, 14px)', color: 'var(--text-list-default, #4D5358)', lineHeight: 1.5 }}>
        {person.name}
      </div>
      <div style={{ fontSize: 'var(--type-size-xs, 12px)', color: 'var(--text-list-subtext, #858C92)', lineHeight: 1.5 }}>
        {person.sub}
      </div>
    </div>
    {/* Figma 215:22124 "+ เชิญ" (solid) → "เชิญแล้ว" (quaternary chip + check),
        not a greyed-out disabled state — `active` keeps it brand-tinted. */}
    <BrandButton
      variant='fill'
      size='sm'
      active={invited}
      leadingIcon={invited ? 'check' : 'add'}
      /* กดซ้ำที่ "เชิญแล้ว" = ถอนการเชิญ — เดิมกดแล้วไม่มีอะไรเกิดขึ้น
         ผู้ใช้ที่กดผิดคนจึงไม่มีทางแก้จากหน้านี้ */
      title={invited ? 'กดอีกครั้งเพื่อยกเลิกการเชิญ' : undefined}
      onClick={() => (invited ? onUninvite(person) : onInvite(person))}
    >
      {invited ? 'เชิญแล้ว' : 'เชิญ'}
    </BrandButton>
  </div>
);

/**
 * @param {'list'|'add'} [initialView]
 */
const TelemedParticipantsPopup = ({
  open,
  onClose,
  initialView = 'list',
  doctor,
  patient,
  doctorMicOn = true,
  doctorCamOn = true,
  patientMicOn = true,
  patientCamOn = true,
  participants = [],
  onToggleSelfMic,
  onToggleSelfCam,
  onTogglePatientMic,
  onTogglePatientCam,
  onToggleParticipantMedia,
  onInvite,
  onUninvite,
  meetingLink = '',
  linkCopied = false,
  onCopyLink,
}) => {
  const [view, setView] = useState(initialView);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setFilter('all');
      setQuery('');
    }
  }, [open, initialView]);

  useEffect(() => { injectSearchChrome(); }, []);

  const roster = [
    {
      id: 'self',
      name: doctor?.name || 'แพทย์',
      roleLabel: 'คุณ',
      avatar: doctor?.avatar || avatarFor(doctor?.name || 'พญ.', 'แพทย์', 0),
      micOn: doctorMicOn,
      camOn: doctorCamOn,
      status: 'joined',
      isSelf: true,
    },
    {
      id: 'patient',
      name: patient?.fullName || patient?.name || 'ผู้รับบริการ',
      roleLabel: 'ผู้รับบริการ',
      avatar: patient?.avatar || avatarFor(patient?.fullName || patient?.name || 'นาย', 'ผู้รับบริการ', 0),
      micOn: patientMicOn,
      camOn: patientCamOn,
      status: 'joined',
      isPatient: true,
    },
    ...participants.map((p) => ({
      ...p,
      roleLabel: p.roleLabel || p.role,
      status: p.status || 'joined',
      micOn: p.micOn !== false,
      camOn: p.camOn !== false,
    })),
  ];

  const invitedIds = new Set(participants.map((p) => p.directoryId || p.id));

  const filteredDirectory = TELEMED_INVITE_DIRECTORY.filter((row) => {
    if (filter === 'doctor' && row.filter !== 'doctor') return false;
    if (filter === 'nurse' && row.filter !== 'nurse') return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return `${row.name} ${row.sub}`.toLowerCase().includes(q);
  });

  const handleToggleMic = (id) => {
    if (id === 'self') onToggleSelfMic?.();
    else if (id === 'patient') onTogglePatientMic?.();
    else onToggleParticipantMedia?.(id, 'mic');
  };
  const handleToggleCam = (id) => {
    if (id === 'self') onToggleSelfCam?.();
    else if (id === 'patient') onTogglePatientCam?.();
    else onToggleParticipantMedia?.(id, 'cam');
  };

  const leading = view === 'add' ? (
    <BackButton onClick={() => setView('list')} />
  ) : null;

  const linkBar = (
    <div
      style={{
        display: 'flex',
        gap: 'var(--dim-space-200, 8px)',
        alignItems: 'center',
        width: '100%',
        marginTop: 'var(--dim-space-200, 8px)',
      }}
    >
      <div
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          height: 'var(--dim-size-800, 40px)',
          display: 'flex',
          alignItems: 'center',
          padding: 'var(--dim-space-200, 8px) var(--dim-space-400, 16px)',
          borderRadius: 'var(--dim-radius-200, 8px)',
          border: 'var(--dim-stroke-100, 1px) solid var(--border-input-disabled, #E2E4E6)',
          background: 'var(--surface-input-disabled, #F4F5F5)',
          color: 'var(--text-input-disabled, #ADB2B7)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-base, 16px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={meetingLink}
      >
        {meetingLink}
      </div>
      <BrandSubdueButton
        variant='outline'
        size='md'
        leadingIcon={linkCopied ? 'check' : 'content_copy'}
        onClick={onCopyLink}
      >
        {linkCopied ? 'คัดลอกแล้ว' : 'คัดลอกลิงก์'}
      </BrandSubdueButton>
    </div>
  );

  return (
    <Popup
      open={open}
      onClose={onClose}
      size='default'
      width={448}
      leading={leading}
      title={view === 'list' ? `ผู้เข้าร่วม (${roster.length})` : 'เพิ่มผู้เข้าร่วม'}
      bodyStyle={{ paddingTop: 0, gap: view === 'add' ? 'var(--dim-space-400, 16px)' : 0 }}
      /* หัวป๊อปอัปเรียงแบบ items-start เป็นค่าเริ่มต้น (เผื่อกรณีมีคำบรรยายใต้ชื่อ)
         ป๊อปอัปนี้มีแต่ชื่อเรื่อง ตัวอักษรจึงลอยสูงกว่าปุ่ม ‹ และ ✕ ที่สูง 32px */
      headerStyle={{ alignItems: 'center' }}
      footer={view === 'list' ? (
        <BrandButton
          variant='fill'
          size='md'
          leadingIcon='group_add'
          onClick={() => setView('add')}
        >
          เพิ่มผู้เข้าร่วม
        </BrandButton>
      ) : null}
    >
      {view === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {roster.map((person, i) => (
            <ParticipantRow
              key={person.id}
              person={person}
              isLast={i === roster.length - 1}
              onToggleMic={handleToggleMic}
              onToggleCam={handleToggleCam}
            />
          ))}
        </div>
      ) : (
        <>
          {/* ลิงก์เข้าห้องอยู่บนสุด — เป็นทางลัดที่ใช้บ่อยกว่าการไล่หาชื่อทีละคน
              และเดิมถูกดันไปอยู่ใต้รายชื่อ 20 แถว ต้องเลื่อนจอลงไปหา */}
          {linkBar}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--dim-space-200, 8px)',
              height: 'var(--dim-size-800, 40px)',
              width: '100%',
              padding: 'var(--dim-space-300, 12px)',
              borderRadius: 'var(--dim-radius-200, 8px)',
              border: 'var(--dim-stroke-100, 1px) solid var(--border-secondarysearch-default, #C9CDD0)',
              background: 'var(--surface-search-default, #FFFFFF)',
              boxSizing: 'border-box',
            }}
          >
            <Sym name='search' size={16} color='var(--icon-content-tertiary, #858C92)' />
            <input
              ref={searchRef}
              className='mih-telemed-participant-search'
              type='search'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='ค้นหาชื่อ, อีเมล'
              aria-label='ค้นหาชื่อ, อีเมล'
              style={{
                flex: '1 1 0%',
                minWidth: 0,
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-base, 16px)',
                color: 'var(--text-content-default, #363B3F)',
                padding: 0,
              }}
            />
            {query && (
              <button
                type='button'
                aria-label='ล้างคำค้นหา'
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 'var(--dim-size-400, 20px)', height: 'var(--dim-size-400, 20px)',
                  border: 0, padding: 0, borderRadius: 'var(--dim-radius-full, 9999px)',
                  background: 'transparent', cursor: 'pointer',
                }}
              >
                <Sym name='close' size={16} color='var(--icon-content-tertiary, #858C92)' />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 'var(--dim-space-200, 8px)', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                label={f.label}
                selected={filter === f.key}
                onClick={() => setFilter(f.key)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {filteredDirectory.map((row, idx) => (
              <InviteRow
                key={row.id}
                person={row}
                isLast={idx === filteredDirectory.length - 1}
                invited={invitedIds.has(row.id) || participants.some((p) => p.name === row.name)}
                onInvite={(person) => onInvite?.(person)}
                onUninvite={(person) => onUninvite?.(person)}
              />
            ))}
            {filteredDirectory.length === 0 && (
              <div style={{ padding: 'var(--dim-space-400, 16px)', color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-sm, 14px)', textAlign: 'center' }}>
                ไม่พบรายชื่อที่ค้นหา
              </div>
            )}
          </div>

        </>
      )}
    </Popup>
  );
};

export default TelemedParticipantsPopup;
