import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import DatePicker from '@/components/forms/DatePicker';
import Dropdown from '@/components/forms/Dropdown';
import InputField from '@/components/forms/InputField';
import SuggestibleTextarea from '@/components/forms/SuggestibleTextarea';
import ConsentAuditBar from '@/components/forms/ConsentAuditBar';
import Popup from '@/components/popup/Popup';
import AlertDialog from '@/components/popup/AlertDialog';
import UnsavedChangesPopup from '@/components/popup/UnsavedChangesPopup';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandIconButton from '@/components/button/BrandIconButton';
import Badge from '@/components/badge/Badge';
import Icon from '@/components/icons/Icon';
import {
  getRoomConfig,
  getRoomConfigOrDefault,
  listRoomConfigDates,
  saveRoomConfig,
  todayKey,
  ROOM_PERIODS,
} from '@/data/opdRoomConfig';
import SYSTEM_NAV from '@/pages/system/systemNav';
import { buildDoctorRoster } from '@/pages/appointment/appointmentDoctorRoster';

/* OpdRoomConfigPage — TOR 1.2.7.1 + 1.2.7.2.
   Daily exam-room + quota configuration:
     Section 1 ตั้งค่าห้องตรวจ — rooms × ช่วงเวลา (เช้า/บ่าย), per-row doctor
       Dropdown (options READ-ONLY from appointmentDoctorRoster), เพิ่ม/ลบแถว,
       คัดลอกจากประวัติ (copy a previous day's config).
     Section 2 โควตาผู้รับบริการ — per service-unit quota with current booked
       count; expanding a quota (จำเป็นต้องรับเพิ่ม) requires เหตุผล before
       save. Saved quota is what the walk-in slot picker (/opd/requests) reads.
   Every save stamps ผู้บันทึก + เวลา (ConsentAuditBar-style strip). */

const breadcrumb = ['จัดการระบบ', 'ตั้งค่าห้องตรวจและโควตารายวัน'];

const OVERRIDE_REASON_SUGGESTIONS = [
  'ผู้ป่วยส่งต่อจากจุดคัดกรองเกินคาดการณ์ จำเป็นต้องรับเพิ่มในช่วงบ่าย',
  'แพทย์เพิ่มเวรตรวจพิเศษ รองรับผู้ป่วยเพิ่มได้',
  'สถานการณ์ระบาดไข้หวัดใหญ่ ผู้รับบริการเพิ่มขึ้นผิดปกติ',
  'แผนกข้างเคียงงดตรวจ รับผู้ป่วยแทนชั่วคราว',
];

const parseDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const thaiDateLabel = (key) => {
  const d = parseDateKey(key);
  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const sectionTitleStyle = {
  /* longhand — inline SHORTHAND carrying var() is dropped by CSSOM */
  marginTop: 'var(--dim-space-0, 0px)',
  marginRight: 'var(--dim-space-0, 0px)',
  marginBottom: 'var(--dim-space-0, 0px)',
  marginLeft: 'var(--dim-space-0, 0px)',
  color: 'var(--text-brandPrimary-default, #007549)',
  fontFamily: 'var(--type-family-heading-content)',
  fontWeight: 'var(--type-weight-title, var(--type-weight-regular, 400))',
  fontSize: 'var(--type-size-base)',
};

const cellText = {
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  color: 'var(--text-content-default, #363B3F)',
};

const OpdRoomConfigPage = () => {
  const history = useHistory();
  const roster = useMemo(() => buildDoctorRoster() || [], []);
  const doctorOptions = useMemo(
    () => roster.map((d) => ({ value: d.name, label: `${d.name} (${d.subDivision})` })),
    [roster],
  );

  const [dateKey, setDateKey] = useState(() => todayKey());
  const [config, setConfig] = useState(() => getRoomConfigOrDefault(todayKey()));
  const [originalQuotas, setOriginalQuotas] = useState(() => getRoomConfigOrDefault(todayKey()).quotas);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyPick, setCopyPick] = useState(null);
  const [copiedFrom, setCopiedFrom] = useState(null);
  const [saveAlert, setSaveAlert] = useState(null); // { ok, message }
  /* Date the user tried to switch to while the form was dirty — the
     UnsavedChanges guard resolves to this date instead of dropping the
     intent (null = the guard was raised by ยกเลิก/ย้อนกลับ instead). */
  const [pendingDateKey, setPendingDateKey] = useState(null);
  const [quotaErrors, setQuotaErrors] = useState({});
  /* Seeded from the stored config so a previously approved expansion is
     visible on mount (and survives the next save) — see loadDate(). */
  const [overrideReasons, setOverrideReasons] = useState(() => (
    getRoomConfigOrDefault(todayKey()).quotas.reduce((acc, q) => {
      if (q.overrideReason) acc[q.unit] = q.overrideReason;
      return acc;
    }, {})
  ));

  /* Role mock — user without OPD-admin role sees the page read-only. */
  const [isAdmin, setIsAdmin] = useState(true);

  const loadDate = (key) => {
    const cfg = getRoomConfigOrDefault(key);
    setDateKey(key);
    setConfig(cfg);
    setOriginalQuotas(cfg.quotas.map((q) => ({ ...q })));
    /* Seed from what was persisted — a documented quota expansion is an
       approval /opd/requests depends on, so it must stay visible (and survive
       the next unrelated save) instead of being blanked on every load. */
    setOverrideReasons(
      cfg.quotas.reduce((acc, q) => {
        if (q.overrideReason) acc[q.unit] = q.overrideReason;
        return acc;
      }, {}),
    );
    setQuotaErrors({});
    setCopiedFrom(null);
    setDirty(false);
  };

  const handleDateChange = (d) => {
    if (!d) return;
    const key = todayKey(d);
    if (key === dateKey) return;
    if (dirty) {
      setPendingDateKey(key);
      setUnsavedOpen(true);
      return;
    }
    loadDate(key);
  };

  /* Guard resolution — บันทึกร่างและออก saves then follows the intent;
     ไม่บันทึก discards then follows it. "Intent" = switch date when the
     guard came from the DatePicker, otherwise leave the page. */
  const resolveGuard = () => {
    if (pendingDateKey) {
      const key = pendingDateKey;
      setPendingDateKey(null);
      loadDate(key);
      return;
    }
    history.push('/opd/queue');
  };

  /* ── Section 1: rooms ─────────────────────────────────────────────── */
  const setRoomDoctor = (idx, doctor) => {
    setConfig((c) => ({
      ...c,
      rooms: c.rooms.map((r, i) => (i === idx ? { ...r, doctor } : r)),
    }));
    setDirty(true);
  };

  const addRoomRow = () => {
    setConfig((c) => {
      /* Next row continues the grid: if the last room has only ช่วงเช้า, add
         its ช่วงบ่าย row; otherwise open a new room number at ช่วงเช้า. */
      const last = c.rooms[c.rooms.length - 1];
      const lastRoomRows = last ? c.rooms.filter((r) => r.room === last.room) : [];
      if (last && lastRoomRows.length === 1) {
        const missing = ROOM_PERIODS.find((p) => p !== lastRoomRows[0].period) || ROOM_PERIODS[1];
        return { ...c, rooms: [...c.rooms, { room: last.room, period: missing, doctor: '' }] };
      }
      const roomNumbers = c.rooms.map((r) => parseInt((r.room.match(/\d+/) || ['0'])[0], 10));
      const nextRoom = Math.max(0, ...roomNumbers) + 1;
      return {
        ...c,
        rooms: [...c.rooms, { room: `ห้องตรวจที่ ${nextRoom}`, period: ROOM_PERIODS[0], doctor: '' }],
      };
    });
    setDirty(true);
  };

  const removeRoomRow = (idx) => {
    setConfig((c) => ({ ...c, rooms: c.rooms.filter((_, i) => i !== idx) }));
    setDirty(true);
  };

  /* ── Section 2: quotas ────────────────────────────────────────────── */
  const setQuota = (unit, raw) => {
    const value = raw.replace(/[^0-9]/g, '');
    setConfig((c) => ({
      ...c,
      quotas: c.quotas.map((q) => (q.unit === unit ? { ...q, quota: value === '' ? '' : Number(value) } : q)),
    }));
    setDirty(true);
  };

  const originalQuotaOf = (unit) => originalQuotas.find((q) => q.unit === unit);

  const needsOverride = (q) => {
    const orig = originalQuotaOf(q.unit);
    return orig && Number(q.quota) > Number(orig.quota);
  };

  const validate = () => {
    const errors = {};
    config.quotas.forEach((q) => {
      const n = Number(q.quota);
      if (!Number.isInteger(n) || n <= 0) {
        errors[q.unit] = 'โควตาต้องเป็นจำนวนเต็มบวก';
      } else if (n < q.booked) {
        errors[q.unit] = `ต้องไม่น้อยกว่าจำนวนที่รับแล้ว (${q.booked} ราย)`;
      } else if (needsOverride(q) && !(overrideReasons[q.unit] || '').trim()) {
        errors[q.unit] = 'การขยายโควตาต้องระบุเหตุผล (จำเป็นต้องรับเพิ่ม)';
      }
    });
    config.rooms.forEach((r, i) => {
      if (!r.doctor) errors[`room-${i}`] = 'เลือกแพทย์ประจำห้อง';
    });
    setQuotaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** @returns {boolean} true when the config was persisted. */
  const handleSave = () => {
    if (!validate()) {
      setSaveAlert({ ok: false, message: 'บันทึกไม่สำเร็จ — กรุณาแก้ไขรายการที่ติดเงื่อนไข (โควตาต้องเป็นจำนวนเต็มบวก ≥ จำนวนที่รับแล้ว และการขยายโควตาต้องมีเหตุผล)' });
      return false;
    }
    /* A recorded expansion reason stays attached to the quota row even after
       it stops being a *new* expansion — /opd/requests reads `overrideReason`
       to decide whether an over-quota walk-in may still be accepted, so an
       unrelated later save must never silently revoke the approval. */
    const quotasWithOverride = config.quotas.map((q) => {
      const reason = (overrideReasons[q.unit] || '').trim();
      if (needsOverride(q)) return { ...q, overrideReason: reason };
      return reason ? { ...q, overrideReason: reason } : { ...q };
    });
    const saved = saveRoomConfig(dateKey, {
      rooms: config.rooms,
      quotas: quotasWithOverride,
      note: copiedFrom ? `คัดลอกจาก ${copiedFrom}` : 'ตั้งค่าประจำวัน',
      savedBy: 'จนท.สมพร ทองดี',
    });
    /* Merge the persisted quotas back into `config` — without this the page's
       own copy never gains `overrideReason` and the NEXT save writes the row
       back without it. */
    setConfig((c) => ({
      ...c,
      quotas: quotasWithOverride.map((q) => ({ ...q })),
      savedBy: saved.savedBy,
      savedAt: saved.savedAt,
      isDefault: false,
    }));
    setOriginalQuotas(quotasWithOverride.map((q) => ({ ...q })));
    setDirty(false);
    setSaveAlert({ ok: true, message: `บันทึกการตั้งค่าวันที่ ${thaiDateLabel(dateKey)} แล้ว (ผู้บันทึก ${saved.savedBy} · ${saved.savedAt})` });
    return true;
  };

  const handleCancel = () => {
    if (dirty) { setPendingDateKey(null); setUnsavedOpen(true); return; }
    history.push('/opd/queue');
  };

  /* ── Copy from history (คัดลอกประวัติการตั้งค่า) ──────────────────── */
  const historyDates = useMemo(
    () => listRoomConfigDates().filter((d) => d !== dateKey),
    [dateKey, saveAlert],
  );

  const applyCopy = () => {
    if (!copyPick) return;
    const src = getRoomConfig(copyPick);
    if (!src) return;
    setConfig((c) => ({
      ...c,
      rooms: src.rooms.map((r) => ({ ...r })),
      quotas: src.quotas.map((q) => {
        const cur = c.quotas.find((x) => x.unit === q.unit);
        return { ...q, booked: cur ? cur.booked : q.booked };
      }),
    }));
    setCopiedFrom(copyPick);
    setCopyOpen(false);
    setCopyPick(null);
    setDirty(true);
  };

  const disabledAll = !isAdmin;

  return (
    <>
      <UnsavedChangesPopup
        open={unsavedOpen}
        onClose={() => setUnsavedOpen(false)}
        onSave={() => {
          setUnsavedOpen(false);
          if (handleSave()) resolveGuard();
        }}
        onDiscard={() => {
          setUnsavedOpen(false);
          setDirty(false);
          resolveGuard();
        }}
      />
      <AlertDialog
        open={!!saveAlert}
        onClose={() => setSaveAlert(null)}
        onConfirm={() => setSaveAlert(null)}
        type={saveAlert?.ok ? 'success' : 'destructive'}
        title={saveAlert?.ok ? 'บันทึกสำเร็จ' : 'ตรวจสอบข้อมูล'}
        description={saveAlert?.message || ''}
        showCancel={false}
        confirmLabel='ตกลง'
      />

      {/* คัดลอกจากประวัติ — previous day configs */}
      <Popup
        open={copyOpen}
        onClose={() => { setCopyOpen(false); setCopyPick(null); }}
        title='คัดลอกการตั้งค่าจากประวัติ'
        subtitle='เลือกวันที่เคยตั้งค่าไว้ แล้วนำห้องตรวจ + โควตามาใช้กับวันที่กำลังตั้งค่า'
        secondaryAction={{ label: 'ยกเลิก', onClick: () => { setCopyOpen(false); setCopyPick(null); } }}
        primaryAction={{ label: 'นำการตั้งค่ามาใช้', disabled: !copyPick, onClick: applyCopy }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
          {historyDates.length === 0 && (
            <span style={{ ...cellText, color: 'var(--text-content-tertiary, #858C92)' }}>
              ยังไม่มีประวัติการตั้งค่าวันอื่น
            </span>
          )}
          {historyDates.map((d) => {
            const cfg = getRoomConfig(d);
            const chosen = copyPick === d;
            return (
              <button
                key={d}
                type='button'
                onClick={() => setCopyPick(d)}
                className='w-full flex items-center text-left'
                style={{
                  gap: 'var(--dim-space-300)',
                  paddingTop: 'var(--dim-space-300)',
                  paddingBottom: 'var(--dim-space-300)',
                  paddingLeft: 'var(--dim-space-400)',
                  paddingRight: 'var(--dim-space-400)',
                  borderRadius: 'var(--dim-radius-300, 10px)',
                  border: chosen
                    ? 'var(--dim-stroke-200, 2px) solid var(--border-brandPrimary-default, #007549)'
                    : 'var(--dim-stroke-100, 1px) solid var(--border-input-default, #E2E4E6)',
                  background: chosen ? 'var(--surface-brandPrimary-quaternary, #F4FBF8)' : 'var(--surface-card-100, #FFFFFF)',
                  cursor: 'pointer',
                }}
              >
                <Icon name='history' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
                <span className='flex flex-col items-start' style={{ gap: 'var(--dim-space-050, 2px)' }}>
                  <span style={{ ...cellText, fontWeight: 'var(--type-weight-medium)' }}>{thaiDateLabel(d)}</span>
                  <span style={{ ...cellText, fontSize: 'var(--type-size-xs)', color: 'var(--text-content-tertiary, #858C92)' }}>
                    {cfg ? `${cfg.rooms.length} แถวห้องตรวจ · บันทึกโดย ${cfg.savedBy} (${cfg.savedAt})${cfg.note ? ` · ${cfg.note}` : ''}` : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Popup>

      <QueuePageShell
        activeKey='system-opd-room-config'
        sidebarItems={SYSTEM_NAV}
        sidebarFallbackKey='system-opd-room-config'
        brandTitle='จัดการระบบ'
        breadcrumb={breadcrumb}
        title='ตั้งค่าห้องตรวจและโควตารายวัน'
        actions={(
          <NeutralSubdueButton
            leadingIcon={isAdmin ? 'admin_panel_settings' : 'lock'}
            onClick={() => setIsAdmin((v) => !v)}
            accessibilityLabel='สลับบทบาทตัวอย่าง'
          >
            {isAdmin ? 'บทบาท: หัวหน้างาน OPD (แก้ไขได้)' : 'บทบาท: เจ้าหน้าที่ทั่วไป (อ่านอย่างเดียว)'}
          </NeutralSubdueButton>
        )}
      >
        <div
          className='flex flex-col flex-1 min-w-0'
          style={{
            paddingTop: 'var(--dim-space-600)',
            paddingLeft: 'var(--dim-space-600)',
            paddingRight: 'var(--dim-space-600)',
            paddingBottom: 'var(--dim-space-600)',
            gap: 'var(--dim-space-400)',
          }}
        >
          {!isAdmin && (
            <div
              className='flex items-center'
              style={{
                gap: 'var(--dim-space-200)',
                paddingTop: 'var(--dim-space-300)',
                paddingBottom: 'var(--dim-space-300)',
                paddingLeft: 'var(--dim-space-400)',
                paddingRight: 'var(--dim-space-400)',
                background: 'var(--surface-alert-warning, #FFF9F0)',
                borderRadius: 'var(--dim-radius-400, 12px)',
              }}
            >
              <Icon name='lock' size={18} style={{ color: 'var(--text-warning-default, #C2410C)' }} />
              <span style={{ ...cellText, color: 'var(--text-warning-default, #C2410C)', fontWeight: 'var(--type-weight-medium)' }}>
                สิทธิ์ไม่เพียงพอ — บทบาทของคุณดูการตั้งค่าได้อย่างเดียว การแก้ไขต้องเป็นหัวหน้างาน OPD
              </span>
            </div>
          )}

          {/* Date + audit strip */}
          <div
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-400)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              gap: 'var(--dim-space-300)',
            }}
          >
            <div className='flex items-end flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
              <DatePicker
                label='วันที่ให้บริการ'
                value={parseDateKey(dateKey)}
                onChange={handleDateChange}
                showHelperText={false}
                disabled={false}
              />
              <BrandSubdueButton
                variant='outline'
                leadingIcon='content_copy'
                disabled={disabledAll || historyDates.length === 0}
                onClick={() => setCopyOpen(true)}
                title={historyDates.length === 0 ? 'ยังไม่มีประวัติการตั้งค่าให้คัดลอก' : undefined}
              >
                คัดลอกจากประวัติ
              </BrandSubdueButton>
              {copiedFrom && (
                <Badge style='info' size='small'>{`คัดลอกจาก ${thaiDateLabel(copiedFrom)} — ยังไม่บันทึก`}</Badge>
              )}
            </div>
            <ConsentAuditBar
              recordedBy={config.savedBy || 'ยังไม่เคยบันทึกสำหรับวันนี้ (ใช้ค่าเริ่มต้น)'}
              recordedAt={config.savedAt || '—'}
            />
          </div>

          {/* Section 1 — ตั้งค่าห้องตรวจ */}
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Icon name='meeting_room' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
              <h2 style={sectionTitleStyle}>ตั้งค่าห้องตรวจ (แพทย์ประจำห้อง × ช่วงเวลา)</h2>
            </div>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
              {config.rooms.map((r, idx) => (
                <div
                  key={`${r.room}-${r.period}-${idx}`}
                  className='flex items-center flex-wrap'
                  style={{
                    gap: 'var(--dim-space-300)',
                    paddingTop: 'var(--dim-space-200)',
                    paddingBottom: 'var(--dim-space-200)',
                    paddingLeft: 'var(--dim-space-300)',
                    paddingRight: 'var(--dim-space-300)',
                    borderRadius: 'var(--dim-radius-300, 10px)',
                    border: quotaErrors[`room-${idx}`]
                      ? 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-default, #DC2626)'
                      : 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                  }}
                >
                  <span style={{ ...cellText, width: 112, fontWeight: 'var(--type-weight-medium)' }}>{r.room}</span>
                  <Badge style={r.period === 'เช้า' ? 'info' : 'warning'} size='small'>{`ช่วง${r.period}`}</Badge>
                  <div className='flex-1 min-w-0' style={{ minWidth: 260 }}>
                    <Dropdown
                      value={r.doctor}
                      onChange={(v) => setRoomDoctor(idx, v)}
                      options={doctorOptions}
                      placeholder='เลือกแพทย์ประจำห้อง'
                      state={disabledAll ? 'disabled' : 'default'}
                    />
                  </div>
                  {quotaErrors[`room-${idx}`] && (
                    <span style={{ ...cellText, color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs)' }}>
                      {quotaErrors[`room-${idx}`]}
                    </span>
                  )}
                  <BrandIconButton
                    icon='delete'
                    size='sm'
                    variant='ghost'
                    disabled={disabledAll || config.rooms.length <= 1}
                    aria-label='ลบแถวห้องตรวจ'
                    onClick={() => removeRoomRow(idx)}
                  />
                </div>
              ))}
            </div>

            <BrandSubdueButton
              variant='outline'
              leadingIcon='add'
              disabled={disabledAll}
              onClick={addRoomRow}
              className='self-start'
            >
              เพิ่มแพทย์ / แถวห้องตรวจ
            </BrandSubdueButton>
          </section>

          {/* Section 2 — โควตาผู้รับบริการ */}
          <section
            className='w-full flex flex-col'
            style={{
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              paddingTop: 'var(--dim-space-600)',
              paddingBottom: 'var(--dim-space-600)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              gap: 'var(--dim-space-400)',
            }}
          >
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Icon name='groups' size={20} style={{ color: 'var(--text-brandPrimary-default, #007549)' }} />
              <h2 style={sectionTitleStyle}>โควตาผู้รับบริการต่อหน่วยบริการ</h2>
            </div>
            <span style={{ ...cellText, color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              โควตาที่บันทึกเป็นแหล่งข้อมูลที่หน้า “คำขอ Walk-in” ใช้ตัดสินว่ารับเพิ่มได้หรือไม่ — การขยายโควตา (จำเป็นต้องรับเพิ่ม) ต้องระบุเหตุผลก่อนบันทึก
            </span>

            <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
              {config.quotas.map((q) => {
                const err = quotaErrors[q.unit];
                const over = needsOverride(q);
                const orig = originalQuotaOf(q.unit);
                return (
                  <div
                    key={q.unit}
                    className='flex flex-col'
                    style={{
                      gap: 'var(--dim-space-200)',
                      paddingTop: 'var(--dim-space-300)',
                      paddingBottom: 'var(--dim-space-300)',
                      paddingLeft: 'var(--dim-space-300)',
                      paddingRight: 'var(--dim-space-300)',
                      borderRadius: 'var(--dim-radius-300, 10px)',
                      border: err
                        ? 'var(--dim-stroke-100, 1px) solid var(--border-dangerButton-default, #DC2626)'
                        : 'var(--dim-stroke-100, 1px) solid var(--border-brandPrimary-quaternary, #E2F3EB)',
                    }}
                  >
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-400)' }}>
                      <span style={{ ...cellText, width: 112, fontWeight: 'var(--type-weight-medium)' }}>{q.unit}</span>
                      <div style={{ width: 128 }}>
                        <InputField
                          label='โควตา'
                          showLabel={false}
                          showHelperText={false}
                          showLeadingIcon={false}
                          size='md'
                          value={String(q.quota)}
                          onChange={(v) => setQuota(q.unit, v)}
                          placeholder='จำนวน'
                          disabled={disabledAll}
                          error={err ? ' ' : undefined}
                        />
                      </div>
                      <span style={{ ...cellText, color: 'var(--text-content-secondary, #636B72)' }}>
                        รับแล้ว {q.booked} ราย
                      </span>
                      {orig && (
                        <span style={{ ...cellText, color: 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
                          โควตาเดิม {orig.quota}
                        </span>
                      )}
                      {Number(q.quota) > 0 && q.booked >= Number(q.quota) && (
                        <Badge style='warning' size='small'>เต็มโควตา</Badge>
                      )}
                      {over && <Badge style='info' size='small'>ขยายโควตา — ต้องมีเหตุผล</Badge>}
                      {!over && q.overrideReason && <Badge style='success' size='small'>อนุมัติขยายโควตาแล้ว</Badge>}
                    </div>
                    {/* Stored approval stays readable after saving so staff can
                        see WHY /opd/requests still accepts over-quota walk-ins. */}
                    {!over && q.overrideReason && (
                      <span style={{ ...cellText, color: 'var(--text-content-secondary, #636B72)', fontSize: 'var(--type-size-xs)' }}>
                        เหตุผลการขยายโควตาที่บันทึกไว้: {q.overrideReason}
                      </span>
                    )}
                    {err && (
                      <span style={{ ...cellText, color: 'var(--text-danger-default, #B91C1C)', fontSize: 'var(--type-size-xs)' }}>{err}</span>
                    )}
                    {over && (
                      <SuggestibleTextarea
                        label={`เหตุผลการขยายโควตา ${q.unit} (จำเป็นต้องรับเพิ่ม)`}
                        required
                        voice
                        value={overrideReasons[q.unit] || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOverrideReasons((m) => ({ ...m, [q.unit]: v }));
                          setDirty(true);
                        }}
                        placeholder='เช่น ผู้ป่วยส่งต่อจากจุดคัดกรองเกินคาดการณ์ จำเป็นต้องรับเพิ่ม'
                        suggestions={OVERRIDE_REASON_SUGGESTIONS}
                        minChars={3}
                        disabled={disabledAll}
                        popoverAriaLabel='คำแนะนำเหตุผลการขยายโควตา'
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Save / cancel footer */}
          <div
            className='flex items-center w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-400)',
              paddingBottom: 'var(--dim-space-400)',
              paddingLeft: 'var(--dim-space-600)',
              paddingRight: 'var(--dim-space-600)',
              background: 'var(--surface-card-100)',
              borderRadius: 'var(--dim-radius-500)',
              boxShadow: 'var(--shadow-card)',
              position: 'sticky',
              bottom: 'var(--dim-space-200)',
              zIndex: 50,
            }}
          >
            <span style={{ ...cellText, color: dirty ? 'var(--text-warning-default, #C2410C)' : 'var(--text-content-tertiary, #858C92)', fontSize: 'var(--type-size-xs)' }}>
              {dirty ? 'มีการแก้ไขที่ยังไม่บันทึก' : 'ไม่มีการแก้ไขค้าง'}
            </span>
            <div className='flex-1' />
            <NeutralSubdueButton size='lg' onClick={handleCancel}>ยกเลิก</NeutralSubdueButton>
            <BrandPrimaryButton size='lg' leadingIcon='save' disabled={disabledAll || !dirty} onClick={handleSave}>
              บันทึกการตั้งค่า
            </BrandPrimaryButton>
          </div>
        </div>
      </QueuePageShell>
    </>
  );
};

export default OpdRoomConfigPage;
