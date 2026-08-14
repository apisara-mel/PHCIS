import React, { useEffect, useMemo, useState } from 'react';
import Popup from '@/components/popup/Popup';
import InputField from '@/components/forms/InputField';
import Checkbox from '@/components/checkbox/Checkbox';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import { Sym } from '@/components/forms/Fields';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import BrandFilterTag from '@/components/forms/FilterTag';

const CATEGORY_LABELS = {
  medication: 'ยา', medicalSupply: 'เวชภัณฑ์มิใช่ยา', lab: 'Lab',
  xray: 'X-ray', procedure: 'หัตถการ', consult: 'ปรึกษา',
};
const CATEGORY_BADGES = { medication: 'teal', medicalSupply: 'blue', lab: 'purple', xray: 'orange', procedure: 'green', consult: 'grey' };

const ORDER_SETS = [
  { id: 'set-wound-care', name: 'ชุดทำแผลทั่วไป', description: 'ยาลดปวดและอุปกรณ์ทำแผลพื้นฐาน', itemIds: ['med-paracetamol', 'supply-gauze', 'supply-tape'] },
  { id: 'set-allergy', name: 'ชุดบรรเทาอาการแพ้', description: 'ยาสำหรับอาการแพ้และหน้ากากอนามัย', itemIds: ['med-cetirizine', 'supply-mask'] },
  { id: 'set-minor-procedure', name: 'ชุดหัตถการแผลขนาดเล็ก', description: 'ผ้าก๊อซ สำลี เทปกาว และกระบอกฉีดยา', itemIds: ['supply-gauze', 'supply-cotton', 'supply-tape', 'supply-syringe'] },
  { id: 'set-annual-checkup', name: 'ชุดตรวจสุขภาพประจำปี', description: 'CBC, FBS, ปัสสาวะ และเอกซเรย์ทรวงอก', itemIds: ['lab-lab-cbc', 'lab-lab-fbs', 'lab-lab-ua', 'xray-xr-cxr-pa'] },
  { id: 'set-chest-symptom', name: 'ชุดประเมินอาการทางทรวงอก', description: 'CBC, เอกซเรย์ทรวงอก และปรึกษาอายุรกรรม', itemIds: ['lab-lab-cbc', 'xray-xr-cxr-pa', 'consult-im'] },
];

const TreatmentOrderPickerPopup = ({ open, onClose, items = [], onConfirm }) => {
  const [mode, setMode] = useState('items');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [doctorSets, setDoctorSets] = useState([]);
  const [creatingSet, setCreatingSet] = useState(false);
  const [setName, setSetName] = useState('');
  const [setDescription, setSetDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('items'); setQuery(''); setCategory('all'); setSelectedIds([]); setCreatingSet(false);
  }, [open]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('th-TH');
    return items.filter((item) => (category === 'all' || item.category === category)
      && (!q || `${item.name} ${item.unit || ''} ${item.detail || ''}`.toLocaleLowerCase('th-TH').includes(q)));
  }, [category, items, query]);
  const toggle = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const chooseSet = (set) => {
    const available = new Set(items.map((item) => item.id));
    setSelectedIds(set.itemIds.filter((id) => available.has(id)));
  };
  const handleConfirm = () => {
    onConfirm?.(items.filter((item) => selectedIds.includes(item.id)));
    onClose?.();
  };
  const saveDoctorSet = () => {
    if (!setName.trim() || selectedIds.length === 0) return;
    setDoctorSets((current) => [...current, {
      id: `doctor-set-${Date.now()}`,
      name: setName.trim(),
      description: setDescription.trim() || 'ชุดคำสั่งส่วนตัวของแพทย์',
      itemIds: [...selectedIds],
      owner: 'doctor',
    }]);
    setSetName(''); setSetDescription(''); setCreatingSet(false);
  };

  return (
    <Popup open={open} onClose={onClose} size='extraLarge' title='เพิ่มรายการสั่งการรักษา'
      subtitle='ค้นหา เลือกหลายรายการ หรือเลือกชุดคำสั่งสำเร็จรูป'
      tertiaryAction={{ label: 'ล้างรายการที่เลือก', onClick: () => setSelectedIds([]), disabled: selectedIds.length === 0 }}
      secondaryAction={{ label: 'ยกเลิก', onClick: onClose }}
      primaryAction={{ label: `เพิ่ม ${selectedIds.length} รายการ`, onClick: handleConfirm, disabled: selectedIds.length === 0 }}
      bodyStyle={{ gap: 'var(--dim-space-400, 16px)' }}>
      <TabBar aria-label='วิธีเพิ่มรายการสั่งการรักษา'>
        <TabPill label='ค้นหารายการ' selected={mode === 'items'} onClick={() => setMode('items')} />
        <TabPill label='ชุดคำสั่งสำเร็จรูป' selected={mode === 'sets'} onClick={() => setMode('sets')} />
      </TabBar>
      {mode === 'items' ? <>
        <InputField label='ค้นหารายการ' value={query} onChange={(event) => setQuery(event?.target?.value ?? event ?? '')}
          placeholder='ค้นหายา Lab X-ray หัตถการ หรือคลินิกปรึกษา' leadingIcon='search' />
        <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {[['all', 'ทั้งหมด'], ...Object.entries(CATEGORY_LABELS)].map(([key, label]) => (
            <BrandFilterTag
              key={key}
              variant='brand'
              size='lg'
              value={label}
              selected={category === key}
              showLeadingIcon={false}
              showTailingIcon={false}
              showTitle={false}
              onClick={() => setCategory(key)}
            />
          ))}
        </div>
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          {visibleItems.map((item) => { const checked = selectedIds.includes(item.id); return <button key={item.id} type='button' onClick={() => toggle(item.id)} aria-pressed={checked} className='flex items-center w-full text-left' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-300, 12px) var(--dim-space-400, 16px)', border: `${checked ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)'} solid ${checked ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-quaternary, #E2E4E6)'}`, borderRadius: 'var(--dim-radius-200, 8px)', background: checked ? 'var(--surface-brandPrimary-quaternary, #EAF8F2)' : 'var(--surface-card-default, #FFFFFF)' }}>
            <span onClick={(event) => event.stopPropagation()}><Checkbox checked={checked} onChange={() => toggle(item.id)} aria-label={`เลือก ${item.name}`} /></span>
            <span className='flex-1 min-w-0'><span style={{ color: 'var(--text-content-default, #202427)', fontSize: 'var(--type-size-sm, 14px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{item.name}</span><span style={{ display: 'block', color: 'var(--text-content-tertiary, #697077)', fontSize: 'var(--type-size-xs, 12px)' }}>{item.detail || (item.unit ? `หน่วย ${item.unit}` : 'กรอกรายละเอียดหลังเพิ่มรายการ')}</span></span>
            <ColorfulBadge style={CATEGORY_BADGES[item.category] || 'grey'} size='small'>{CATEGORY_LABELS[item.category]}</ColorfulBadge>
          </button>; })}
          {visibleItems.length === 0 && <div className='flex flex-col items-center text-center' style={{ gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-800, 32px)' }}><Sym name='search_off' size={32} color='var(--icon-neutral-tertiary, #8A9095)' /><span style={{ color: 'var(--text-content-secondary, #454B50)', fontSize: 'var(--type-size-sm, 14px)' }}>ไม่พบรายการที่ค้นหา</span></div>}
        </div>
      </> : <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400, 16px)' }}>
        <div className='flex items-center justify-between flex-wrap' style={{ gap: 'var(--dim-space-300, 12px)' }}>
          <div><div style={{ color: 'var(--text-content-default, #202427)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)' }}>ชุดคำสั่งการรักษา</div><div style={{ color: 'var(--text-content-tertiary, #697077)', fontSize: 'var(--type-size-sm, 14px)' }}>ชุดมาตรฐานจัดการโดย Admin ส่วนแพทย์สร้างชุดส่วนตัวได้จากรายการที่เลือก</div></div>
          <BrandSubdueButton leadingIcon='add' disabled={selectedIds.length === 0} onClick={() => setCreatingSet(true)}>เพิ่ม Order Set ของฉัน</BrandSubdueButton>
        </div>
        {creatingSet && <div className='flex flex-col' style={{ gap: 'var(--dim-space-300, 12px)', padding: 'var(--dim-space-400, 16px)', background: 'var(--surface-card-quaternary, #F9FBFB)', border: 'var(--dim-stroke-100, 1px) solid var(--border-neutral-quaternary, #E2E4E6)', borderRadius: 'var(--dim-radius-300, 12px)' }}>
          <InputField label='ชื่อ Order Set' value={setName} onChange={(event) => setSetName(event?.target?.value ?? event ?? '')} placeholder='เช่น ชุดทำแผลประจำของฉัน' />
          <InputField label='คำอธิบาย' value={setDescription} onChange={(event) => setSetDescription(event?.target?.value ?? event ?? '')} placeholder='อธิบายว่าใช้ชุดนี้เมื่อใด' />
          <div className='flex items-center justify-end' style={{ gap: 'var(--dim-space-200, 8px)' }}><BrandSubdueButton onClick={() => setCreatingSet(false)}>ยกเลิก</BrandSubdueButton><BrandPrimaryButton disabled={!setName.trim()} onClick={saveDoctorSet}>บันทึก Order Set</BrandPrimaryButton></div>
        </div>}
        <div className='grid w-full' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--dim-space-300, 12px)' }}>
          {[...doctorSets, ...ORDER_SETS.map((set) => ({ ...set, owner: 'admin' }))].map((set) => { const selected = set.itemIds.every((id) => selectedIds.includes(id)); return <button key={set.id} type='button' onClick={() => chooseSet(set)} aria-pressed={selected} className='flex flex-col items-start text-left' style={{ gap: 'var(--dim-space-200, 8px)', padding: 'var(--dim-space-400, 16px)', border: `${selected ? 'var(--dim-stroke-200, 2px)' : 'var(--dim-stroke-100, 1px)'} solid ${selected ? 'var(--border-brandPrimary-default, #007549)' : 'var(--border-neutral-quaternary, #E2E4E6)'}`, borderRadius: 'var(--dim-radius-300, 12px)', background: selected ? 'var(--surface-brandPrimary-quaternary, #EAF8F2)' : 'var(--surface-card-default, #FFFFFF)' }}><span className='flex items-center justify-between w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}><span style={{ color: 'var(--text-content-default, #202427)', fontSize: 'var(--type-size-base, 16px)', fontWeight: 'var(--type-weight-medium, 500)' }}>{set.name}</span><ColorfulBadge style={set.owner === 'doctor' ? 'teal' : 'grey'} size='small'>{set.owner === 'doctor' ? 'ของฉัน' : 'Admin'}</ColorfulBadge></span><span style={{ color: 'var(--text-content-tertiary, #697077)', fontSize: 'var(--type-size-sm, 14px)' }}>{set.description}</span><span style={{ color: 'var(--text-brandPrimary-default, #007549)', fontSize: 'var(--type-size-xs, 12px)' }}>{set.itemIds.length} รายการ</span></button>; })}
        </div>
      </div>}
    </Popup>
  );
};
export default TreatmentOrderPickerPopup;
