import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  MobileShell,
  MobileHeader,
  Sym,
  BrandButton,
  Password,
  useMobileApp,
} from '@/components/mobile';
import MobileIconBadge from '@/components/mobile/MobileIconBadge';
import Switch from '@/components/switch/Switch';

/* BMA Health · Settings — Figma Mobile Application 2042:31043
   Screens: main (2042:31045) · Language (2042:31152) · theme picker */

const SETTINGS_STORE = 'phcis_mobile_settings_v1';

const loadSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORE);
    if (raw) return JSON.parse(raw);
  } catch (_e) { /* ignore */ }
  return {
    biometric: true,
    notifications: true,
    news: true,
  };
};

const saveSettings = (s) => {
  try {
    localStorage.setItem(SETTINGS_STORE, JSON.stringify(s));
  } catch (_e) { /* ignore */ }
};

const Card = ({ children, style }) => (
  <div
    style={{
      width: '100%',
      background: 'var(--surface-card-100, #FFFFFF)',
      borderRadius: 'var(--dim-radius-500, 16px)',
      boxShadow: 'var(--shadow-brand-drop-bottom-200)',
      padding: 'var(--dim-space-400, 16px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--dim-space-300, 12px)',
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <p style={{
    margin: 0,
    width: '100%',
    fontFamily: 'var(--type-family-heading-graphic2)',
    fontSize: 'var(--type-size-base, 16px)',
    color: 'var(--text-brandPrimary-default, #007549)',
  }}
  >
    {children}
  </p>
);

const Divider = () => (
  <div style={{ height: 1, width: '100%', background: 'var(--border-neutral-quaternary, #F4F5F5)' }} />
);

const NavRow = ({
  icon,
  label,
  value,
  onClick,
  trailing,
  showChevron = true,
  labelColor,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className='flex items-center w-full text-left'
      style={{
        gap: 'var(--dim-space-300, 12px)',
        border: 0,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        padding: 0,
        minHeight: 32,
      }}
    >
      <MobileIconBadge icon={icon} tone='green' size={32} iconSize={16} />
      <p className='flex-1' style={{
        margin: 0,
        fontSize: 'var(--type-size-sm, 14px)',
        color: labelColor || 'var(--text-content-default, #111314)',
      }}
      >
        {label}
      </p>
      {value != null && value !== '' && (
        <p style={{
          margin: 0,
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-tertiary, #858C92)',
          whiteSpace: 'nowrap',
        }}
        >
          {value}
        </p>
      )}
      {trailing}
      {onClick && showChevron && !trailing && (
        <Sym name='chevron_right' size={16} color='var(--text-content-tertiary, #858C92)' />
      )}
    </Tag>
  );
};

const ToggleRow = ({ icon, label, checked, onChange }) => (
  <div className='flex items-center' style={{ gap: 'var(--dim-space-300, 12px)', width: '100%' }}>
    <MobileIconBadge icon={icon} tone='green' size={32} iconSize={16} />
    <p className='flex-1' style={{
      margin: 0,
      fontSize: 'var(--type-size-sm, 14px)',
      color: 'var(--text-content-default, #111314)',
    }}
    >
      {label}
    </p>
    <Switch checked={checked} onChange={onChange} aria-label={label} />
  </div>
);

const SelectRow = ({ label, selected, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    className='flex items-center w-full text-left'
    style={{
      gap: 'var(--dim-space-200, 8px)',
      minHeight: 56,
      padding: 'var(--dim-space-200, 8px) var(--dim-space-300, 12px)',
      border: 0,
      borderRadius: 'var(--dim-radius-150, 6px)',
      background: 'var(--surface-list-default, #FFFFFF)',
      cursor: 'pointer',
    }}
  >
    <p className='flex-1' style={{
      margin: 0,
      fontSize: 'var(--type-size-sm, 14px)',
      color: 'var(--text-list-default, #4D5358)',
    }}
    >
      {label}
    </p>
    {selected && <Sym name='check' size={16} color='var(--text-brandPrimary-default, #007549)' />}
  </button>
);

const PillInput = ({ className = 'mih-settings-input', ...props }) => (
  <input
    className={className}
    {...props}
    style={{
      width: '100%',
      height: 56,
      padding: '0 var(--dim-space-600, 24px)',
      borderRadius: 'var(--dim-radius-full)',
      border: 'var(--dim-stroke-100) solid var(--border-input-default, #E2E4E6)',
      background: 'var(--surface-input-default, #FFFFFF)',
      fontFamily: 'var(--type-family-body)',
      fontSize: 'var(--type-size-base, 16px)',
      color: 'var(--text-content-default)',
      ...props.style,
    }}
  />
);

const Field = ({ label, children }) => (
  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150, 6px)', width: '100%' }}>
    <label style={{ fontSize: 'var(--type-size-sm)', color: 'var(--text-content-default)' }}>{label}</label>
    {children}
  </div>
);

/* ─── Sub views ─────────────────────────────────────────────────────── */

const LanguageView = ({ lang, onPick, onBack }) => (
  <>
    <MobileHeader title='ภาษา' onBack={onBack} />
    <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
      <Card style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <SelectRow label='ไทย' selected={lang === 'th'} onClick={() => onPick('th')} />
        <Divider />
        <SelectRow label='English' selected={lang === 'en'} onClick={() => onPick('en')} />
      </Card>
    </div>
  </>
);

const ThemeView = ({ theme, onPick, onBack }) => (
  <>
    <MobileHeader title='ธีมการแสดงผล' onBack={onBack} />
    <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
      <Card style={{ gap: 'var(--dim-space-050, 2px)' }}>
        <SelectRow label='สว่าง' selected={theme === 'light'} onClick={() => onPick('light')} />
        <Divider />
        <SelectRow label='มืด' selected={theme === 'dark'} onClick={() => onPick('dark')} />
      </Card>
    </div>
  </>
);

const PasswordView = ({ onBack, onSaved }) => {
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const canSave = cur.length >= 4 && pw.length >= 8 && pw === pw2;

  return (
    <>
      <MobileHeader title='เปลี่ยนรหัสผ่าน' onBack={onBack} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <Card style={{ gap: 'var(--dim-space-500, 20px)' }}>
          <Password
            label='รหัสผ่านเดิม'
            required
            value={cur}
            autoComplete='current-password'
            autoFocus
            onChange={(e) => { setCur(e.target.value); setErr(''); }}
          />
          <Password
            label='รหัสผ่านใหม่'
            required
            value={pw}
            autoComplete='new-password'
            onChange={(e) => { setPw(e.target.value); setErr(''); }}
          />
          <Password
            label='ยืนยันรหัสผ่านใหม่'
            required
            value={pw2}
            autoComplete='new-password'
            error={err || (pw2.length > 0 && pw !== pw2 ? 'รหัสผ่านยืนยันไม่ตรงกัน' : undefined)}
            onChange={(e) => { setPw2(e.target.value); setErr(''); }}
          />
        </Card>
        <BrandButton
          size='lg'
          disabled={!canSave}
          onClick={() => {
            if (pw.length < 8) return setErr('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร');
            if (pw !== pw2) return setErr('รหัสผ่านยืนยันไม่ตรงกัน');
            onSaved();
          }}
        >
          บันทึก
        </BrandButton>
      </div>
    </>
  );
};

const PinView = ({ onBack, onSaved }) => {
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const ok = pin.length === 6 && pin === pin2;
  return (
    <>
      <MobileHeader title='เปลี่ยนรหัส PIN' onBack={onBack} />
      <div style={{ padding: 'var(--dim-space-400, 16px)', display: 'flex', flexDirection: 'column', gap: 'var(--dim-space-400, 16px)' }}>
        <Card>
          <Field label='PIN ใหม่ (6 หลัก)'>
            <PillInput type='password' inputMode='numeric' maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
          </Field>
          <Field label='ยืนยัน PIN'>
            <PillInput type='password' inputMode='numeric' maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          </Field>
        </Card>
        <BrandButton size='lg' disabled={!ok} onClick={onSaved}>บันทึก</BrandButton>
      </div>
    </>
  );
};

const InfoView = ({ title, body, onBack }) => (
  <>
    <MobileHeader title={title} onBack={onBack} />
    <div style={{ padding: 'var(--dim-space-400, 16px)' }}>
      <Card>
        <p style={{
          margin: 0,
          fontSize: 'var(--type-size-sm, 14px)',
          color: 'var(--text-content-secondary, #4D5358)',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
        >
          {body}
        </p>
      </Card>
    </div>
  </>
);

/* ─── Main list ─────────────────────────────────────────────────────── */

const SettingsHome = ({
  lang,
  theme,
  settings,
  patch,
  onOpen,
  onLogout,
}) => (
  <>
    <MobileHeader title='ตั้งค่า' onBack={() => onOpen('back')} />
    <div
      style={{
        padding: 'var(--dim-space-400, 16px)',
        paddingBottom: 'var(--dim-space-600, 24px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--dim-space-400, 16px)',
      }}
    >
      <Card>
        <SectionTitle>ทั่วไป</SectionTitle>
        <NavRow
          icon='language'
          label='ภาษา'
          value={lang === 'en' ? 'English' : 'ไทย'}
          onClick={() => onOpen('language')}
        />
        <Divider />
        <NavRow
          icon='light_mode'
          label='ธีมการแสดงผล'
          value={theme === 'dark' ? 'มืด' : 'สว่าง'}
          onClick={() => onOpen('theme')}
        />
      </Card>

      <Card>
        <SectionTitle>บัญชีและความปลอดภัย</SectionTitle>
        <NavRow icon='lock' label='เปลี่ยนรหัสผ่าน' onClick={() => onOpen('password')} />
        <Divider />
        <NavRow icon='pin' label='เปลี่ยนรหัส PIN' onClick={() => onOpen('pin')} />
        <Divider />
        <ToggleRow
          icon='fingerprint'
          label='เข้าสู่ระบบด้วยลายนิ้วมือ / Face ID'
          checked={settings.biometric}
          onChange={(v) => patch({ biometric: v })}
        />
      </Card>

      <Card>
        <SectionTitle>การแจ้งเตือน</SectionTitle>
        <ToggleRow
          icon='notifications'
          label='การแจ้งเตือน'
          checked={settings.notifications}
          onChange={(v) => patch({ notifications: v })}
        />
        <Divider />
        <ToggleRow
          icon='description'
          label='ข่าวสาร'
          checked={settings.news}
          onChange={(v) => patch({ news: v })}
        />
      </Card>

      <Card>
        <SectionTitle>ความเป็นส่วนตัวและข้อมูล</SectionTitle>
        <NavRow icon='description' label='การยินยอมให้ใช้ข้อมูลสุขภาพ' onClick={() => onOpen('consent')} />
        <Divider />
        <NavRow icon='description' label='นโยบายความเป็นส่วนตัว' onClick={() => onOpen('privacy')} />
        <Divider />
        <NavRow icon='delete' label='ลบบัญชี' onClick={() => onOpen('delete')} />
      </Card>

      <Card>
        <SectionTitle>ความช่วยเหลือ</SectionTitle>
        <NavRow icon='help' label='ศูนย์ช่วยเหลือ / คำถามที่พบบ่อย' onClick={() => onOpen('faq')} />
        <Divider />
        <NavRow icon='headphones' label='ติดต่อเจ้าหน้าที่' onClick={() => onOpen('contact')} />
        <Divider />
        <NavRow icon='info' label='เงื่อนไขการใช้บริการ' onClick={() => onOpen('terms')} />
        <Divider />
        <NavRow icon='smartphone' label='เกี่ยวกับแอปพลิเคชัน' value='เวอร์ชัน 1.0.0' />
      </Card>

      <Card>
        <NavRow icon='logout' label='ออกจากระบบ' showChevron={false} onClick={onLogout} />
      </Card>
    </div>
  </>
);

/* ─── Page ──────────────────────────────────────────────────────────── */

const hashToView = (hash) => {
  const h = (hash || '').replace(/^#/, '');
  if (h === 'password') return 'password';
  if (h === 'notifications') return 'home';
  if (h === 'privacy') return 'privacy';
  if (h === 'language') return 'language';
  return 'home';
};

const MobileSettingsInner = () => {
  const history = useHistory();
  const location = useLocation();
  const { lang, setLang, theme, setTheme, signOut } = useMobileApp();
  const [settings, setSettings] = useState(loadSettings);
  const [view, setView] = useState(() => hashToView(location.hash));
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(''), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const patch = (partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  };

  const goHome = () => setView('home');

  if (view === 'language') {
    return (
      <LanguageView
        lang={lang}
        onBack={goHome}
        onPick={(k) => { setLang(k); goHome(); }}
      />
    );
  }
  if (view === 'theme') {
    return (
      <ThemeView
        theme={theme}
        onBack={goHome}
        onPick={(t) => { setTheme(t); goHome(); }}
      />
    );
  }
  if (view === 'password') {
    return (
      <PasswordView
        onBack={goHome}
        onSaved={() => { setToast('บันทึกรหัสผ่านใหม่เรียบร้อย'); goHome(); }}
      />
    );
  }
  if (view === 'pin') {
    return (
      <PinView
        onBack={goHome}
        onSaved={() => { setToast('บันทึก PIN เรียบร้อย'); goHome(); }}
      />
    );
  }
  if (view === 'consent') {
    return (
      <InfoView
        title='การยินยอมให้ใช้ข้อมูลสุขภาพ'
        body={'คุณสามารถจัดการความยินยอมการใช้ข้อมูลสุขภาพได้ที่ศูนย์บริการสาธารณสุขใกล้บ้าน\n\nระบบ PHCIS Mobile ใช้ข้อมูลเพื่อการดูแลรักษาและติดตามผลตามขอบเขตที่คุณยินยอม'}
        onBack={goHome}
      />
    );
  }
  if (view === 'privacy') {
    return (
      <InfoView
        title='นโยบายความเป็นส่วนตัว'
        body={'ระบบ PHCIS Mobile จัดเก็บข้อมูลของผู้ใช้งานตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)\n\nผู้ใช้สามารถขอตรวจสอบ แก้ไข หรือลบข้อมูลของตนได้ที่ศูนย์บริการสาธารณสุข สำนักอนามัย กรุงเทพมหานคร'}
        onBack={goHome}
      />
    );
  }
  if (view === 'delete') {
    return (
      <InfoView
        title='ลบบัญชี'
        body={'การลบบัญชีจะทำให้ไม่สามารถเข้าใช้งานแอปได้ และข้อมูลบางส่วนอาจถูกลบถาวร\n\nหากต้องการลบบัญชี กรุณาติดต่อเจ้าหน้าที่ที่ศูนย์บริการสาธารณสุขใกล้บ้าน (สาธิต)'}
        onBack={goHome}
      />
    );
  }
  if (view === 'faq') {
    return (
      <InfoView
        title='ศูนย์ช่วยเหลือ'
        body={'คำถามที่พบบ่อย\n\n• นัดหมายออนไลน์ได้อย่างไร?\nเลือกเมนูนัดหมาย แล้วทำตามขั้นตอน\n\n• ลืมรหัสผ่านทำอย่างไร?\nที่หน้าเข้าสู่ระบบ เลือก “ลืมรหัสผ่าน”\n\n• วิดีโอคอลใช้งานอย่างไร?\nเข้าเมนูนัดหมายหรือ Telemed ตามสิทธิการรักษา'}
        onBack={goHome}
      />
    );
  }
  if (view === 'contact') {
    return (
      <InfoView
        title='ติดต่อเจ้าหน้าที่'
        body={'สายด่วนสำนักอนามัย กรุงเทพมหานคร\nโทร 1555 (ในเวลาทำการ)\n\nหรือติดต่อศูนย์บริการสาธารณสุขใกล้บ้านของท่าน'}
        onBack={goHome}
      />
    );
  }
  if (view === 'terms') {
    return (
      <InfoView
        title='เงื่อนไขการใช้บริการ'
        body={'การใช้แอป PHCIS Mobile ถือว่าคุณยอมรับเงื่อนไขการใช้บริการของสำนักอนามัย กรุงเทพมหานคร\n\nห้ามใช้แอปเพื่อวัตถุประสงค์ที่ผิดกฎหมาย หรือแอบอ้างตัวตนของผู้อื่น'}
        onBack={goHome}
      />
    );
  }

  return (
    <>
      <SettingsHome
        lang={lang}
        theme={theme}
        settings={settings}
        patch={patch}
        onOpen={(key) => {
          if (key === 'back') {
            history.push('/m/profile');
            return;
          }
          setView(key);
        }}
        onLogout={() => {
          signOut();
          history.replace('/m/login');
        }}
      />
      {toast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 100, transform: 'translateX(-50%)',
          background: 'rgba(15,27,23,0.9)', color: '#fff',
          padding: '8px 16px', borderRadius: 999, fontSize: 12, zIndex: 50,
          whiteSpace: 'nowrap',
        }}
        >
          {toast}
        </div>
      )}
    </>
  );
};

if (typeof document !== 'undefined' && !document.getElementById('mih-settings-input-css')) {
  const style = document.createElement('style');
  style.id = 'mih-settings-input-css';
  style.textContent = `
.mih-settings-input,
.mih-settings-input:focus,
.mih-settings-input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}
.mih-settings-input:focus,
.mih-settings-input:focus-visible {
  border-color: var(--border-brandPrimary-default, #08A768) !important;
  box-shadow: 0 0 0 4px rgba(8, 167, 104, 0.15) !important;
}
.mih-settings-input::placeholder {
  color: var(--text-content-tertiary, #858C92);
  opacity: 1;
}`;
  document.head.appendChild(style);
}

const MobileSettingsPage = () => (
  <MobileShell requireAuth background='var(--background-screen-brand-100, #F4FBF8)'>
    <MobileSettingsInner />
  </MobileShell>
);

export default MobileSettingsPage;
