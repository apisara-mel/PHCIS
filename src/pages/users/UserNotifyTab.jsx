import React from 'react';
import Icon from '@/components/icons/Icon';
import Switch from '@/components/switch/Switch';
import Select from '@/components/forms/Select';
import InputField from '@/components/forms/InputField';
import Alert from '@/components/alert/Alert';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { SectionCard } from '@/pages/users/userEditParts';
import {
  CHANNELS,
  NOTIFICATION_CATEGORIES,
  isQuietNow,
  validateNotificationPref,
} from '@/data/userNotifications';

/* เมทริกซ์ "ประเภทเหตุการณ์ × ช่องทาง" รายบุคคล — ครึ่ง "ตั้งค่ารายบุคคล"
   ของ TOR 1.17.5.5. ใช้ store เดียวกับแท็บ "ตั้งค่าช่องทาง" ของหน้า
   /users/notifications (src/data/userNotifications.js) — ห้ามแยก store. */

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const v = `${String(h).padStart(2, '0')}:00`;
  return { value: v, label: `${v} น.` };
});

const NotificationMatrix = ({ pref, onChange, readOnly, compact = false }) => {
  const errors = validateNotificationPref(pref);

  const setChannel = (cat, ch, next) => {
    if (readOnly) return;
    const nextPref = JSON.parse(JSON.stringify(pref));
    nextPref.channels[cat][ch] = next;
    onChange(nextPref);
  };

  const setQuiet = (patch) => {
    if (readOnly) return;
    onChange({ ...pref, quietHours: { ...pref.quietHours, ...patch } });
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
      {errors.critical ? <Alert type='error' title='ปิดช่องทางของค่าวิกฤตไม่ได้' subtext={errors.critical} /> : null}

      <div className='w-full' style={{ overflowX: 'auto' }}>
        <div className='flex flex-col' style={{ minWidth: 560, gap: 'var(--dim-space-200, 8px)' }}>
          {/* หัวตาราง */}
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
            <span className='flex-1 min-w-0' style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
              ประเภทเหตุการณ์
            </span>
            {CHANNELS.map((c) => (
              <span
                key={c.key}
                className='inline-flex items-center justify-center shrink-0'
                style={{
                  width: 'var(--dim-size-1800, 96px)',
                  gap: 'var(--dim-space-100, 4px)',
                  color: 'var(--text-content-tertiary)',
                  fontSize: 'var(--type-size-xs, 12px)',
                }}
              >
                <Icon name={c.icon} size={14} />
                {c.label}
              </span>
            ))}
          </div>

          {NOTIFICATION_CATEGORIES.map((cat) => (
            <div
              key={cat.key}
              className='flex items-center w-full'
              style={{
                gap: 'var(--dim-space-300, 12px)',
                paddingTop: 'var(--dim-space-250, 10px)',
                paddingBottom: 'var(--dim-space-250, 10px)',
                paddingLeft: 'var(--dim-space-300, 12px)',
                paddingRight: 'var(--dim-space-300, 12px)',
                background: 'var(--surface-card-100)',
                border: 'var(--dim-stroke-100, 1px) solid var(--border-card-default)',
                borderRadius: 'var(--dim-radius-200, 8px)',
              }}
            >
              <span className='flex-1 min-w-0 flex items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
                <ColorfulBadge style={cat.tone} size='small' icon={cat.icon}>{cat.label}</ColorfulBadge>
                {!compact ? (
                  <span className='truncate' style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
                    {cat.desc}
                  </span>
                ) : null}
              </span>
              {CHANNELS.map((ch) => {
                const forced = cat.key === 'critical' && ch.key === 'inapp';
                return (
                  <span key={ch.key} className='inline-flex items-center justify-center shrink-0' style={{ width: 'var(--dim-size-1800, 96px)' }}>
                    <Switch
                      checked={!!pref.channels[cat.key][ch.key]}
                      disabled={readOnly || forced}
                      onChange={(next) => setChannel(cat.key, ch.key, next)}
                      aria-label={`${cat.label} ทาง ${ch.label}`}
                    />
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div
        className='flex flex-wrap items-end w-full'
        style={{
          gap: 'var(--dim-space-300, 12px)',
          paddingTop: 'var(--dim-space-300, 12px)',
          paddingBottom: 'var(--dim-space-300, 12px)',
          paddingLeft: 'var(--dim-space-300, 12px)',
          paddingRight: 'var(--dim-space-300, 12px)',
          background: 'var(--surface-brandPrimary-quaternary)',
          borderRadius: 'var(--dim-radius-300, 10px)',
        }}
      >
        <span className='flex items-center' style={{ gap: 'var(--dim-space-200, 8px)', minWidth: 220 }}>
          <Switch
            checked={!!pref.quietHours.enabled}
            disabled={readOnly}
            onChange={(next) => setQuiet({ enabled: next })}
            aria-label='เปิดช่วงเวลาห้ามรบกวน'
          />
          <span className='flex flex-col'>
            <span style={{ color: 'var(--text-content-primary)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>
              ช่วงเวลาห้ามรบกวน
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontSize: 'var(--type-size-xs, 12px)' }}>
              งดอีเมล/SMS ในช่วงนี้ (ค่าวิกฤตยังส่งเสมอ)
            </span>
          </span>
        </span>
        <div style={{ width: 160 }}>
          <Select
            label='ตั้งแต่'
            searchable={false}
            size='md'
            disabled={readOnly || !pref.quietHours.enabled}
            value={pref.quietHours.start}
            onChange={(v) => setQuiet({ start: v })}
            options={HOURS}
          />
        </div>
        <div style={{ width: 160 }}>
          <Select
            label='ถึง'
            searchable={false}
            size='md'
            disabled={readOnly || !pref.quietHours.enabled}
            value={pref.quietHours.end}
            onChange={(v) => setQuiet({ end: v })}
            options={HOURS}
          />
        </div>
        {pref.quietHours.enabled ? (
          <ColorfulBadge style={isQuietNow(pref.quietHours) ? 'orange' : 'grey'} size='small' icon='bedtime'>
            {isQuietNow(pref.quietHours) ? 'ขณะนี้อยู่ในช่วงห้ามรบกวน' : 'ขณะนี้ไม่อยู่ในช่วงห้ามรบกวน'}
          </ColorfulBadge>
        ) : null}
        {errors.quietHours ? (
          <span style={{ color: 'var(--text-input-require)', fontSize: 'var(--type-size-xs, 12px)' }}>{errors.quietHours}</span>
        ) : null}
      </div>

      <div className='flex flex-wrap items-end w-full' style={{ gap: 'var(--dim-space-300, 12px)' }}>
        <div style={{ width: 220 }}>
          <InputField
            label='ค่าวิกฤต: ไม่รับทราบภายใน (นาที)'
            type='number'
            size='md'
            disabled={readOnly}
            value={String(pref.escalateMinutes)}
            onChange={(v) => onChange({ ...pref, escalateMinutes: Number(v) || 0 })}
            error={errors.escalateMinutes}
            helperText='ครบเวลาแล้วระบบจะแจ้งเตือนซ้ำไปยังผู้รับผิดชอบระดับถัดไป'
          />
        </div>
        <div style={{ width: 240 }}>
          <Select
            label='แจ้งต่อไปยัง'
            searchable={false}
            size='md'
            disabled={readOnly}
            value={pref.escalateTo}
            onChange={(v) => onChange({ ...pref, escalateTo: v })}
            options={[
              { value: 'หัวหน้าเวร', label: 'หัวหน้าเวร' },
              { value: 'หัวหน้าแผนก', label: 'หัวหน้าแผนก' },
              { value: 'ผู้อำนวยการศูนย์', label: 'ผู้อำนวยการศูนย์' },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export { NotificationMatrix };

const UserNotifyTab = ({ pref, onChange, readOnly }) => (
  <SectionCard
    icon='notifications'
    title='การแจ้งเตือนของผู้ใช้รายนี้'
    subtitle='กำหนดว่าเหตุการณ์แต่ละประเภทจะแจ้งผ่านช่องทางใดบ้าง — ค่าเดียวกับแท็บ "ตั้งค่าช่องทาง" ในศูนย์รวมการแจ้งเตือน'
  >
    <NotificationMatrix pref={pref} onChange={onChange} readOnly={readOnly} />
  </SectionCard>
);

export default UserNotifyTab;
