/* ระบบจัดการระบบ · ฟอร์มรูปแบบโครงสร้างศูนย์ (ใช้ร่วมหน้าเต็มกับ popup)
   ══════════════════════════════════════════════════════════════════════
   แยกออกมาเพื่อให้ "สร้างรูปแบบโครงสร้างศูนย์ใหม่" (popup ในทะเบียน) กับ
   หน้าเต็ม /admin/structures/new · /:id/edit ใช้เนื้อฟอร์มชุดเดียวกัน
   — แบบเดียวกับที่ centerForm.jsx ทำให้ AddCenterPage กับ CenterEditPopup

     useStructureForm({ existing, onSaved })  — state · validation · persist
     <StructureFormBody form={form} />        — ชื่อรูปแบบ + ตัวแก้ไขโครงสร้าง

   `onSaved` ว่าง = โหมดหน้าเต็ม (ผู้เรียกจัดการ redirect เอง) ·
   ส่ง onSaved มา = popup ปิดตัวเองแล้วให้ผู้เรียกรีเฟรชทะเบียน */

import React, { useEffect, useMemo, useState } from 'react';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Topic from '@/components/topic/Topic';
import CenterStructureEditor from '@/pages/system/CenterStructureEditor';
import { TIME_OPTIONS } from '@/pages/system/centerHourOptions';
import { readCenters } from '@/data/centerStore';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import Icon from '@/components/icons/Icon';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import DangerSubdueIconButton from '@/components/button/DangerSubdueIconButton';
import Stepper from '@/components/stepper/Stepper';
import {
  createStructureTemplate,
  createUnit,
  createRoomNode,
  readStructures,
  upsertStructure,
  summarizeStructure,
  countStructure,
  unitKindLabel,
} from '@/data/centerStructure';

/* ไม่มีกรอบ/เงา — ฟอร์มนี้อยู่ใน popup ที่มีกรอบของตัวเองอยู่แล้ว
   ซ้อนกรอบอีกชั้นทำให้อ่านเป็นกล่องในกล่อง (25 ส.ค. 2569) */
const CARD = {
  background: 'var(--surface-card-100)',
  borderRadius: 'var(--dim-radius-500)',
  padding: 'var(--dim-space-600)',
};

/* 3 step เหมือน popup อื่นในระบบ (เพิ่มศูนย์บริการ) — หน้าเต็มไม่ส่ง step มา
   จึงยัง render ครบทุกส่วนในหน้าเดียวเหมือนเดิม
   step "ศูนย์ที่ใช้รูปแบบ" ถูกถอดออก 25 ส.ค. 2569 — ตอนสร้างรูปแบบยังไม่ใช่
   จังหวะไปผูกศูนย์ ผูกทีหลังได้ที่หน้าเต็ม (แนวเดียวกับที่ถอด section นี้
   ออกจากฟอร์มเพิ่มศูนย์บริการ) */
export const STRUCTURE_FORM_STEPS = [
  { key: 'name', label: 'ชื่อรูปแบบ' },
  { key: 'units', label: 'แผนก/คลินิก' },
  { key: 'review', label: 'รีวิว' },
];

/* โหมดแก้ไขมี step "ศูนย์ที่ใช้รูปแบบ" เพิ่มมา — ตอนสร้างยังไม่ใช่จังหวะ
   ผูกศูนย์ แต่ตอนแก้ไขคือที่เดียวที่จัดการรายชื่อศูนย์ได้ */
export const STRUCTURE_FORM_STEPS_WITH_CENTERS = [
  { key: 'name', label: 'ชื่อรูปแบบ' },
  { key: 'units', label: 'แผนก/คลินิก' },
  { key: 'centers', label: 'ศูนย์ที่ใช้รูปแบบ' },
  { key: 'review', label: 'รีวิว' },
];

/* ตรวจรหัสซ้ำ — ใช้ทั้งใน useStructureForm และตัวแก้ไขที่ฝังในฟอร์มศูนย์ */
export function computeCodeIssues(units = []) {
  const dupOf = (list) => {
    const count = {};
    list.forEach((c) => { const v = String(c || '').trim(); if (v) count[v] = (count[v] || 0) + 1; });
    return new Set(Object.keys(count).filter((k) => count[k] > 1));
  };
  const dupUnitCodes = dupOf(units.map((u) => u.code));
  const dupNodeCodes = {};
  units.forEach((u) => { dupNodeCodes[u.id] = dupOf((u.nodes || []).map((n) => n.code)); });
  const hasAny = dupUnitCodes.size > 0
    || Object.keys(dupNodeCodes).some((k) => dupNodeCodes[k].size > 0);
  return { dupUnitCodes, dupNodeCodes, hasAny };
}

export function useStructureForm({ existing = null, onSaved, withCenters = false } = {}) {
  const isEdit = !!existing;
  const steps = withCenters ? STRUCTURE_FORM_STEPS_WITH_CENTERS : STRUCTURE_FORM_STEPS;
  const [step, setStep] = useState(steps[0].key);
  const idx = steps.findIndex((x) => x.key === step);
  const goNext = () => idx < steps.length - 1 && setStep(steps[idx + 1].key);
  const goPrev = () => idx > 0 && setStep(steps[idx - 1].key);
  const [name, setName] = useState('');
  /* สร้างใหม่ = เริ่มจาก "ว่าง" ให้ผู้ใช้กำหนดเองว่าจะมีกี่แผนก/กี่ห้อง
     (25 ส.ค. 2569 — เดิมยัด defaultStructure ให้ 2 หน่วยเสมอ) */
  /* สร้างใหม่ = เริ่มด้วยกลุ่มเปล่า 2 กลุ่มให้กรอกได้เลย (25 ส.ค. 2569) */
  const [units, setUnits] = useState(() => (existing?.units?.length
    ? existing.units
    : [createUnit({ kind: 'department' }), createUnit({ kind: 'department' })]));
  const [appliedCenters, setAppliedCenters] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name || '');
    setUnits(existing.units?.length ? existing.units : []);
    setAppliedCenters(existing.appliedCenters || []);
  }, [existing]);

  const centerOptions = useMemo(
    () => readCenters()
      .filter((c) => !c.draft)
      .map((c) => ({
        value: c.hcode9 || c.code,
        label: `${c.name || 'ศูนย์บริการ'}${c.hcode9 ? ` (${c.hcode9})` : ''}`,
      })),
    [],
  );

  /* ชื่อรูปแบบต้องไม่ซ้ำกับที่มีอยู่ (ไม่นับรูปแบบที่กำลังแก้ไขเอง) —
     ซ้ำแล้วเลือกใช้ตอนเพิ่มศูนย์จะแยกไม่ออกว่าอันไหนคืออันไหน */
  const otherTemplates = useMemo(
    () => readStructures().filter((t) => t.id !== existing?.id),
    [existing],
  );
  const nameDupOwner = useMemo(() => {
    const v = name.trim();
    if (!v) return null;
    return otherTemplates.find((t) => String(t.name || '').trim() === v) || null;
  }, [name, otherTemplates]);

  const nameError = nameDupOwner
    ? `มีรูปแบบชื่อนี้อยู่แล้ว — ${summarizeStructure(nameDupOwner.units || [])}`
    : '';
  const nameUnique = !!name.trim() && !nameDupOwner;

  /* รหัสห้ามซ้ำ (25 ส.ค. 2569)
     — รหัสแผนก/คลินิก: ห้ามซ้ำกันภายในรูปแบบเดียวกัน
     — รหัสจุดรับบริการ: ห้ามซ้ำกันภายในแผนก/คลินิกเดียวกัน
       (คนละแผนกใช้ R1 ได้ เพราะอ่านคู่กับรหัสแผนกอยู่แล้ว) */
  const codeIssues = useMemo(() => computeCodeIssues(units), [units]);

  const addBlankUnit = (kind = 'department') => setUnits((prev) => [...prev, createUnit({ kind })]);

  /* ต้องมีชื่อรูปแบบ (ไม่ซ้ำ) และทุกแผนก/คลินิกต้องมีชื่อ ไม่งั้นรายการจะอ่านไม่ออก */
  /* แก้ไข: ยังไม่แตะอะไรเลย = ปุ่มบันทึกยังกดไม่ได้ (25 ส.ค. 2569) */
  const isDirty = useMemo(() => {
    if (!existing) return true;
    if (name.trim() !== String(existing.name || '').trim()) return true;
    if (JSON.stringify(appliedCenters) !== JSON.stringify(existing.appliedCenters || [])) return true;
    return JSON.stringify(units) !== JSON.stringify(existing.units || []);
  }, [existing, name, units, appliedCenters]);

  const valid = !!name.trim() && !nameDupOwner
    && units.length > 0 && units.every((u) => u.name.trim())
    && !codeIssues.hasAny;

  const save = (draft) => {
    const base = existing || createStructureTemplate({});
    upsertStructure({
      ...base,
      name: name.trim() || 'รูปแบบโครงสร้างศูนย์',
      units,
      appliedCenters,
      draft,
    });
  };

  const handleSaveDraft = () => {
    if (!name.trim()) {
      window.alert('กรุณาตั้งชื่อรูปแบบก่อนบันทึกร่าง');
      return false;
    }
    save(true);
    onSaved?.();
    return true;
  };

  const handleSubmit = () => {
    if (!valid) return false;
    save(false);
    /* popup (มี onSaved) และโหมดแก้ไข จบที่ผู้เรียก · สร้างใหม่บนหน้าเต็ม
       ถึงจะโชว์หน้าสำเร็จ */
    if (onSaved || isEdit) onSaved?.(); else setSaved(true);
    return true;
  };

  /* ไปขั้นถัดไปไม่ได้ถ้าขั้นปัจจุบันยังกรอกไม่ครบ */
  const stepValid = step === 'name'
    ? (!!name.trim() && !nameDupOwner)
    : (step === 'units'
      ? units.length > 0 && units.every((u) => u.name.trim()) && !codeIssues.hasAny
      : true);

  return {
    isEdit,
    STEPS: steps,
    step, setStep, idx, goNext, goPrev, stepValid,
    name, setName, nameError, nameUnique, addBlankUnit, codeIssues,
    units, setUnits,
    appliedCenters, setAppliedCenters,
    centerOptions,
    valid, isDirty, saved, setSaved,
    handleSaveDraft, handleSubmit,
    summary: summarizeStructure(units),
    counts: countStructure(units),
  };
}

/* ติ๊กถูกสีเขียวท้ายช่อง — บอกว่าชื่อที่พิมพ์ไม่ซ้ำกับรูปแบบที่มีอยู่
   (แบบเดียวกับช่องรหัสศูนย์/ชื่อศูนย์ในฟอร์มเพิ่มศูนย์บริการ) */
function UniqueTick({ label }) {
  return (
    <span className='inline-flex items-center' role='img' aria-label={label} title={label}>
      <Icon name='check_circle' size={20} color='var(--icon-positive-success, #24A899)' />
    </span>
  );
}

/* ความกว้างคอลัมน์ซ้ายของบล็อกจุดรับบริการ — ใช้ทั้งแถวหัว (จำนวน+stepper)
   และแถวรายห้อง (เลขลำดับ) ให้ช่องกรอกตรงกับป้ายเสมอ */
const ROOM_LEFT_W = 200;

/* nodes เก็บทั้งห้องตรวจและเตียงไว้ array เดียว แยกด้วย `kind` — ข้อมูลรุ่นเก่า
   ที่ยังไม่มี kind นับเป็นห้องตรวจ (ค่าเริ่มต้นของ createRoomNode) */
const nodeKindOf = (n) => (n?.kind === 'bed' ? 'bed' : 'room');
const nodesByKind = (u, kind) => (u?.nodes || []).filter((n) => nodeKindOf(n) === kind);

/* ป้าย/placeholder ของสองชนิด — โครงแถวเหมือนกันเป๊ะ ต่างแค่คำ */
const NODE_UI = {
  room: {
    countLabel: 'จำนวนจุดรับบริการ/ห้องตรวจ',
    nameLabel: 'ชื่อจุดรับบริการ/ห้องตรวจ',
    emptyLabel: 'ยังไม่มีจุดรับบริการ',
    namePlaceholder: (i) => `จุดรับบริการ ${i + 1}`,
    codePlaceholder: (i) => `R${i + 1}`,
  },
  bed: {
    countLabel: 'จำนวนเตียงสังเกตอาการ',
    nameLabel: 'ชื่อเตียงสังเกตอาการ',
    emptyLabel: 'ยังไม่มีเตียงสังเกตอาการ',
    namePlaceholder: (i) => `เตียง ${i + 1}`,
    codePlaceholder: (i) => `B${i + 1}`,
  },
};

const FIELD_LABEL = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  fontWeight: 'var(--type-weight-medium)',
  lineHeight: 1.5,
};

/* "ตามเวลาศูนย์" ต้องมีค่าจริง ไม่ใช่ '' เพื่อให้ <Select> อยู่ในสถานะ filled */
const CENTER_HOURS = '__center__';

/* กลุ่มแผนก/คลินิก — หนึ่งกล่องต่อหนึ่งหน่วยบริการ (25 ส.ค. 2569)
   เข้ามาครั้งแรกมีให้ 2 กลุ่ม กรอกได้เลย และกดปุ่มเพิ่มกลุ่มต่อได้
   ทุกค่าผูกกับ `units` ตรง ๆ ไม่มี state ซ้อนใน component นี้ */
function StructureUnitsBuilder({ units, onUnitsChange, onAdd, codeIssues }) {
  const unitCodeError = (u) => (codeIssues?.dupUnitCodes?.has(String(u.code || '').trim())
    ? 'รหัสนี้ซ้ำกับแผนก/คลินิกอื่นในรูปแบบนี้'
    : '');
  const nodeCodeError = (u, n) => (codeIssues?.dupNodeCodes?.[u.id]?.has(String(n.code || '').trim())
    ? 'รหัสซ้ำในแผนก/คลินิกนี้'
    : '');
  const patch = (id, next) => onUnitsChange(units.map((u) => (u.id === id ? { ...u, ...next } : u)));
  const remove = (id) => onUnitsChange(units.filter((u) => u.id !== id));

  const kindOf = nodeKindOf;
  const nodesOf = nodesByKind;

  /* จัดลำดับห้องตรวจก่อนเตียงเสมอ ไม่ว่าจะแก้ฝั่งไหนก่อน — ลำดับใน array
     จึงคงที่ และหน้าทบทวน/ตัวนับปลายทางอ่านได้ตรงกันทุกครั้ง */
  const setNodeCount = (u, kind, n) => {
    const next = Math.max(0, Math.min(30, Number(n) || 0));
    const same = nodesOf(u, kind);
    const resized = Array.from({ length: next }, (_, i) => same[i] || createRoomNode({ kind }));
    const rooms = kind === 'room' ? resized : nodesOf(u, 'room');
    const beds = kind === 'bed' ? resized : nodesOf(u, 'bed');
    patch(u.id, { nodes: [...rooms, ...beds] });
  };

  /* i คือลำดับ "ภายในชนิดนั้น" ไม่ใช่ index ของ array รวม */
  const setNode = (u, kind, i, field, v) => {
    let seen = -1;
    patch(u.id, {
      nodes: u.nodes.map((n) => {
        if (kindOf(n) !== kind) return n;
        seen += 1;
        return seen === i ? { ...n, [field]: v } : n;
      }),
    });
  };

  const timeValue = (u, side) => (u.followsCenterHours
    ? CENTER_HOURS
    : (u.hours?.weekday?.[side === 'open' ? 'inStart' : 'inEnd'] || CENTER_HOURS));

  const setTime = (u, side, v) => {
    if (v === CENTER_HOURS) { patch(u.id, { followsCenterHours: true }); return; }
    const w = u.hours?.weekday || {};
    patch(u.id, {
      followsCenterHours: false,
      hours: {
        ...u.hours,
        weekday: {
          ...w,
          closed: false,
          inStart: side === 'open' ? v : (w.inStart || ''),
          inEnd: side === 'close' ? v : (w.inEnd || ''),
        },
      },
    });
  };

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {units.map((u, idx) => (
        <div
          key={u.id}
          className='flex flex-col w-full'
          style={{
            gap: 'var(--dim-space-400)',
            padding: 'var(--dim-space-500)',
            background: 'var(--surface-neutral-quaternary, #F9FBFB)',
            borderRadius: 'var(--dim-radius-400, 12px)',
          }}
        >
          <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-300)' }}>
            <span className='flex-1 min-w-0' style={{ ...FIELD_LABEL, color: 'var(--text-topic-tertiary-title)' }}>
              {`${idx + 1}. ${unitKindLabel(u.kind)}${u.name ? ` · ${u.name}` : ''}`}
            </span>
            <DangerSubdueIconButton
              icon='delete'
              variant='ghost'
              size='sm'
              aria-label={`ลบกลุ่มที่ ${idx + 1}`}
              disabled={units.length <= 1}
              onClick={() => remove(u.id)}
            />
          </div>

          {/* items-start — ข้อความ error ใต้ช่องต้องดันลงล่าง ไม่ใช่ดันกล่อง
              ขึ้นบนจนเยื้องกับช่องข้าง ๆ (25 ส.ค. 2569) */}
          <div className='flex flex-wrap items-start w-full' style={{ gap: 'var(--dim-space-400)' }}>
            {/* กว้างคงที่ 192px + gap 16 = 208 เท่ากับ ROOM_LEFT_W (200) + gap 8
                ช่อง "ชื่อแผนก" กับ "ชื่อจุดรับบริการ" จึงเริ่มที่ตำแหน่งเดียวกัน
                (25 ส.ค. 2569) */}
            <div style={{ flex: '0 0 192px', width: 192 }}>
              <Select
                label='ประเภท'
                showHelperText={false}
                searchable={false}
                size='large'
                options={[
                  { value: 'department', label: 'แผนก' },
                  { value: 'clinic', label: 'คลินิก' },
                ]}
                value={u.kind}
                onChange={(v) => patch(u.id, { kind: v })}
              />
            </div>
            <div style={{ flex: '2 1 280px', minWidth: 240 }}>
              <InputField
                label={u.kind === 'clinic' ? 'ชื่อคลินิก' : 'ชื่อแผนก'}
                required
                showLeadingIcon={false}
                showHelperText={false}
                value={u.name}
                onChange={(v) => patch(u.id, { name: v })}
                placeholder={u.kind === 'clinic' ? 'เช่น คลินิกโรคเรื้อรัง' : 'เช่น ผู้ป่วยนอก (OPD)'}
              />
            </div>
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <InputField
                label='รหัส'
                showLeadingIcon={false}
                showHelperText={!!unitCodeError(u)}
                error={unitCodeError(u) || undefined}
                value={u.code}
                onChange={(v) => patch(u.id, { code: v })}
                placeholder={u.kind === 'clinic' ? 'GP' : 'OPD'}
              />
            </div>
            <div style={{ flex: '1 1 170px', minWidth: 150 }}>
              <Select
                label='เวลาเปิด'
                showHelperText={false}
                searchable={false}
                size='large'
                options={[{ value: CENTER_HOURS, label: 'ตามเวลาศูนย์' }, ...TIME_OPTIONS]}
                value={timeValue(u, 'open')}
                onChange={(v) => setTime(u, 'open', v)}
              />
            </div>
            <div style={{ flex: '1 1 170px', minWidth: 150 }}>
              <Select
                label='เวลาปิด'
                showHelperText={false}
                searchable={false}
                size='large'
                options={[{ value: CENTER_HOURS, label: 'ตามเวลาศูนย์' }, ...TIME_OPTIONS]}
                value={timeValue(u, 'close')}
                onChange={(v) => setTime(u, 'close', v)}
              />
            </div>
          </div>

          {/* บรรทัดบน = ป้ายทั้งสาม (จำนวน · ชื่อ · รหัส) · บรรทัดถัดมา stepper
              อยู่แถวเดียวกับช่องกรอกห้องแรก ไม่ลอยสูงกว่าคอลัมน์ขวา
              (25 ส.ค. 2569) — คอลัมน์ซ้ายกว้างคงที่ทุกแถวจึงตรงกันหมด

              บล็อกเดียวกันนี้ใช้ซ้ำสองรอบ: จุดรับบริการ/ห้องตรวจ กับ
              เตียงสังเกตอาการ (26 ส.ค. 2569 มติผู้ใช้) — รหัสยังห้ามซ้ำข้ามชนิด
              ภายในแผนก/คลินิกเดียวกัน จึงใช้ nodeCodeError ตัวเดิม */}
          {['room', 'bed'].map((kind) => {
            const ui = NODE_UI[kind];
            const list = nodesOf(u, kind);
            return (
              <div key={`${u.id}-${kind}`} className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                <div className='flex items-end w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <span style={{ ...FIELD_LABEL, width: ROOM_LEFT_W, flexShrink: 0 }}>
                    {ui.countLabel}
                  </span>
                  {/* ป้ายสองอันนี้โผล่ต่อเมื่อมีช่องกรอกจริงข้างล่าง (25 ส.ค. 2569) */}
                  {list.length ? (
                    <>
                      <span className='flex-1 min-w-0' style={FIELD_LABEL}>{ui.nameLabel}</span>
                      <span style={{ ...FIELD_LABEL, width: 120, flexShrink: 0 }}>รหัส</span>
                    </>
                  ) : null}
                </div>

                <div className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                  <div style={{ width: ROOM_LEFT_W, flexShrink: 0 }}>
                    <Stepper
                      size='large'
                      min={0}
                      max={30}
                      value={list.length}
                      onChange={(n) => setNodeCount(u, kind, n == null ? 0 : n)}
                      aria-label={ui.countLabel}
                    />
                  </div>
                  {list.length ? (
                    <>
                      <div className='flex-1 min-w-0'>
                        <InputField
                          showLabel={false}
                          showLeadingIcon={false}
                          showHelperText={false}
                          value={list[0].name}
                          onChange={(v) => setNode(u, kind, 0, 'name', v)}
                          placeholder={ui.namePlaceholder(0)}
                        />
                      </div>
                      <div style={{ width: 120, flexShrink: 0 }}>
                        <InputField
                          showLabel={false}
                          showLeadingIcon={false}
                          showHelperText={false}
                          error={nodeCodeError(u, list[0]) || undefined}
                          value={list[0].code}
                          onChange={(v) => setNode(u, kind, 0, 'code', v)}
                          placeholder={ui.codePlaceholder(0)}
                        />
                      </div>
                    </>
                  ) : <div className='flex-1' />}
                </div>

                {list.slice(1).map((n, k) => {
                  const i = k + 1;
                  return (
                    <div key={n.id} className='flex items-center w-full' style={{ gap: 'var(--dim-space-200)' }}>
                      <span style={{ width: ROOM_LEFT_W, flexShrink: 0 }} aria-hidden />
                      <div className='flex-1 min-w-0'>
                        <InputField
                          showLabel={false}
                          showLeadingIcon={false}
                          showHelperText={false}
                          value={n.name}
                          onChange={(v) => setNode(u, kind, i, 'name', v)}
                          placeholder={ui.namePlaceholder(i)}
                        />
                      </div>
                      <div style={{ width: 120, flexShrink: 0 }}>
                        <InputField
                          showLabel={false}
                          showLeadingIcon={false}
                          showHelperText={false}
                          error={nodeCodeError(u, n) || undefined}
                          value={n.code}
                          onChange={(v) => setNode(u, kind, i, 'code', v)}
                          placeholder={ui.codePlaceholder(i)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}

      {/* ปุ่มเดียว — เพิ่มเป็น "แผนก" ไว้ก่อน แล้วสลับเป็นคลินิกได้จาก
          dropdown "ประเภท" ในกล่องนั้น (25 ส.ค. 2569) */}
      <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={() => onAdd('department')}>
        เพิ่มแผนก/คลินิก
      </BrandDashedAddButton>
    </div>
  );
}

/* ตัวแก้ไขโครงสร้างแบบยืนเดี่ยว — ใช้ใน step 5 ของฟอร์มศูนย์ตอนผู้ใช้เลือก
   "เริ่มจากโครงสร้างตั้งต้น" คือกรอกโครงสร้างเองด้วยฟอร์มชุดเดียวกับหน้า
   สร้างรูปแบบ (25 ส.ค. 2569) */
export function StructureUnitsEditor({ units, onUnitsChange }) {
  const codeIssues = useMemo(() => computeCodeIssues(units), [units]);
  return (
    <StructureUnitsBuilder
      units={units}
      onUnitsChange={onUnitsChange}
      onAdd={(kind = 'department') => onUnitsChange([...units, createUnit({ kind })])}
      codeIssues={codeIssues}
    />
  );
}

/* หน้ารีวิว (step สุดท้าย) — สรุปข้อมูลจาก step 1 + 2 แบบอ่านอย่างเดียว
   ให้ตรวจทานก่อนบันทึก ไม่ใช่ฟอร์มกรอกซ้ำ (25 ส.ค. 2569) */
export function StructureReview({ name, units, counts, showName = true }) {
  const stats = [
    { key: 'departments', label: 'แผนก', value: counts.departments },
    { key: 'clinics', label: 'คลินิก', value: counts.clinics },
    { key: 'rooms', label: 'ห้องตรวจ', value: counts.rooms },
    { key: 'beds', label: 'เตียง', value: counts.beds },
  ];

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-500)' }}>
      {/* ชื่อรูปแบบ + ตัวเลขสรุป — ซ่อนชื่อได้เมื่อผู้เรียกโชว์ชื่อเองอยู่แล้ว */}
      {showName ? (
      <div
        className='flex flex-col w-full'
        style={{
          gap: 'var(--dim-space-300)',
          padding: 'var(--dim-space-500)',
          background: 'var(--surface-brandPrimary-quaternary)',
          borderRadius: 'var(--dim-radius-400, 12px)',
        }}
      >
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
            ชื่อรูปแบบ
          </span>
          <span style={{
            color: 'var(--text-brandPrimary-default)',
            fontFamily: 'var(--type-family-heading-graphic2)',
            fontSize: 'var(--type-size-lg, 18px)',
            lineHeight: 1.5,
          }}
          >
            {name.trim() || 'ยังไม่ได้ตั้งชื่อรูปแบบ'}
          </span>
        </div>
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
          {stats.map((st) => (
            <div key={st.key} className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
              <span style={{
                color: 'var(--text-brandPrimary-default)',
                fontFamily: 'var(--type-family-heading-graphic2)',
                fontSize: 'var(--type-size-lg, 18px)',
                lineHeight: 1.5,
              }}
              >
                {st.value}
              </span>
              <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      ) : null}

      {/* รายการแผนก/คลินิก — แจกแจงทุก field ที่กรอกไว้ใน step 2 */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {units.map((u, i) => {
          const openAt = u.followsCenterHours ? 'ตามเวลาศูนย์' : (u.hours?.weekday?.inStart || '—');
          const closeAt = u.followsCenterHours ? 'ตามเวลาศูนย์' : (u.hours?.weekday?.inEnd || '—');
          return (
            <div
              key={u.id}
              className='flex flex-col w-full'
              style={{
                gap: 'var(--dim-space-300)',
                padding: 'var(--dim-space-400)',
                background: 'var(--surface-neutral-quaternary, #F9FBFB)',
                borderRadius: 'var(--dim-radius-300)',
              }}
            >
              {/* เลขข้อเป็นวงกลมพื้นเขียวอ่อน ตัวหนา — เดิมกลืนไปกับข้อความ
                  จนไล่ลำดับไม่ทัน (25 ส.ค. 2569) */}
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <span
                  className='inline-flex items-center justify-center shrink-0'
                  style={{
                    width: 'var(--dim-size-500, 24px)',
                    height: 'var(--dim-size-500, 24px)',
                    borderRadius: 'var(--dim-radius-1000, 100px)',
                    background: 'var(--surface-brandPrimary-quaternary)',
                    color: 'var(--text-brandPrimary-default)',
                    fontFamily: 'var(--type-family-heading-graphic2)',
                    fontSize: 'var(--type-size-xs)',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ ...FIELD_LABEL, color: 'var(--text-topic-tertiary-title)' }}>
                  {`${unitKindLabel(u.kind)}${u.name ? ` · ${u.name}` : ''}`}
                </span>
              </div>

              {/* ทั้งแถวฟิลด์และรายการห้องใช้ grid 6 คอลัมน์ชุดเดียวกัน —
                  "ชื่อจุดรับบริการ" จึงตรงกับ "ชื่อแผนก" และรหัสตรงกับรหัส
                  (25 ส.ค. 2569) */}
              <div style={REVIEW_GRID}>
                <ReviewField label='ประเภท' value={unitKindLabel(u.kind)} />
                <ReviewField
                  label={u.kind === 'clinic' ? 'ชื่อคลินิก' : 'ชื่อแผนก'}
                  value={u.name}
                />
                <ReviewField label='รหัส' value={u.code} />
                <ReviewField label='เวลาเปิด' value={openAt} />
                <ReviewField label='เวลาปิด' value={closeAt} />
                <ReviewField label='จำนวนจุดรับบริการ/ห้องตรวจ' value={String(nodesByKind(u, 'room').length)} />
                <ReviewField label='จำนวนเตียงสังเกตอาการ' value={String(nodesByKind(u, 'bed').length)} />
              </div>

              {/* แยกรายการตามชนิด — ทบทวนแล้วเห็นชัดว่าอะไรเป็นห้องตรวจ อะไรเป็นเตียง
                  ถ้าไม่มีทั้งสองชนิดจึงขึ้นข้อความว่าง (26 ส.ค. 2569) */}
              {nodesByKind(u, 'room').length === 0 && nodesByKind(u, 'bed').length === 0 ? (
                <span style={{ ...REVIEW_VALUE, color: 'var(--text-content-tertiary)' }}>
                  ยังไม่มีจุดรับบริการหรือเตียงสังเกตอาการ
                </span>
              ) : ['room', 'bed'].map((kind) => {
                const list = nodesByKind(u, kind);
                if (!list.length) return null;
                const ui = NODE_UI[kind];
                return (
                  <div key={`${u.id}-review-${kind}`} style={REVIEW_GRID}>
                    <span aria-hidden />
                    {/* ใช้ขนาดเดียวกับป้ายของ ReviewField (xs) — เดิมเป็น sm
                        ทำให้สอง subtext ในการ์ดเดียวกันตัวไม่เท่ากัน (25 ส.ค. 2569) */}
                    <span style={REVIEW_LABEL}>{ui.nameLabel}</span>
                    <span style={REVIEW_LABEL}>รหัส</span>
                    <span style={{ gridColumn: 'span 3' }} aria-hidden />
                    {list.map((n, j) => (
                      <React.Fragment key={n.id}>
                        <span style={{ ...REVIEW_VALUE, color: 'var(--text-content-tertiary)', textAlign: 'right' }}>
                          {`${j + 1}.`}
                        </span>
                        <span style={REVIEW_VALUE}>{n.name || ui.namePlaceholder(j)}</span>
                        <span style={REVIEW_VALUE}>{n.code || '—'}</span>
                        <span style={{ gridColumn: 'span 3' }} aria-hidden />
                      </React.Fragment>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* กริด 6 คอลัมน์ที่ใช้ร่วมกันทั้งแถวฟิลด์และรายการจุดรับบริการ */
const REVIEW_GRID = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  columnGap: 'var(--dim-space-400)',
  rowGap: 'var(--dim-space-200)',
  width: '100%',
};

/* ป้ายกำกับในหน้ารีวิว — ขนาด xs ใช้ร่วมกันทุกจุด */
const REVIEW_LABEL = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const REVIEW_VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* ป้าย + ค่าที่กรอกไว้ — ค่าว่างแสดงเป็น "—" ไม่ปล่อยช่องว่าง */
function ReviewField({ label, value }) {
  return (
    <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-050, 2px)' }}>
      <span style={REVIEW_LABEL}>{label}</span>
      <span style={REVIEW_VALUE}>{String(value || '').trim() || '—'}</span>
    </div>
  );
}

/* การ์ดรูปแบบของศูนย์บริการ — พรีวิวว่ารูปแบบนี้หน้าตาเป็นอย่างไร
   ชื่อ + ตัวเลขแยกหมวด + รายชื่อแผนก/คลินิกจริง (25 ส.ค. 2569 แทนกล่อง
   "สรุปโครงสร้าง" เดิมที่เป็นข้อความบรรทัดเดียว) */
function StructurePreviewCard({ units, counts }) {
  const stats = [
    { key: 'departments', label: 'แผนก', value: counts.departments },
    { key: 'clinics', label: 'คลินิก', value: counts.clinics },
    { key: 'rooms', label: 'ห้องตรวจ', value: counts.rooms },
    { key: 'beds', label: 'เตียง', value: counts.beds },
  ];

  return (
    <div
      className='flex flex-col w-full'
      style={{
        gap: 'var(--dim-space-300)',
        padding: 'var(--dim-space-400)',
        background: 'var(--surface-brandPrimary-quaternary)',
        /* ไม่มีเส้นขอบ — พื้นเขียวจางแยกการ์ดออกจากพื้นขาวชัดพออยู่แล้ว
           (25 ส.ค. 2569) */
        borderRadius: 'var(--dim-radius-400, 12px)',
      }}
    >
      <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-500)' }}>
        {stats.map((st) => (
          <div key={st.key} className='flex flex-col' style={{ gap: 'var(--dim-space-050, 2px)' }}>
            <span style={{
              color: 'var(--text-brandPrimary-default)',
              fontFamily: 'var(--type-family-heading-graphic2)',
              fontSize: 'var(--type-size-lg, 18px)',
              lineHeight: 1.5,
            }}
            >
              {st.value}
            </span>
            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
              {st.label}
            </span>
          </div>
        ))}
      </div>

      {units.length ? (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-100)' }}>
          {units.map((u) => (
            <ColorfulBadge key={u.id} style='green' size='small' hierarchy='secondary' width='hug'>
              {u.name.trim() || `${unitKindLabel(u.kind)}ไม่มีชื่อ`}
            </ColorfulBadge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StructureFormBody({ form, showAppliedCenters = true, stepped = false }) {
  const {
    name, setName, units, setUnits,
    appliedCenters, setAppliedCenters, centerOptions, counts, step,
    nameError, nameUnique, addBlankUnit, codeIssues,
  } = form;

  /* stepped = popup โชว์ทีละขั้น · หน้าเต็มโชว์ทุกส่วนพร้อมกันเหมือนเดิม */
  const show = (key) => !stepped || step === key;

  return (
    <>
      {(stepped ? show('name') : true) ? (
      <section className='flex flex-col w-full' style={{ ...CARD, gap: 'var(--dim-space-400)' }}>
        {/* หัวข้อ "ชื่อรูปแบบ" ถูกถอดออก 25 ส.ค. 2569 — ป้ายของช่องกรอกบอกอยู่แล้ว
            การ์ดพรีวิวย้ายไป step "แผนก/คลินิก" เพราะตัวเลขเปลี่ยนตามการแก้โครงสร้าง
            กล่องกรอกจัดกึ่งกลาง ไม่ชิดซ้ายในพื้นที่ว่างกว้าง ๆ */}
        <div style={{ maxWidth: 520, width: '100%', marginLeft: 'auto', marginRight: 'auto' }}>
          <InputField
            label='ชื่อรูปแบบ'
            required
            value={name}
            onChange={setName}
            placeholder='เช่น ศูนย์ขนาดกลาง — OPD + ทันตกรรม'
            error={nameError || undefined}
            helperText={nameError || 'ชื่อนี้จะให้เลือกตอนเพิ่มศูนย์บริการ (step รูปแบบโครงสร้างศูนย์)'}
            trailing={nameUnique ? <UniqueTick label='ชื่อรูปแบบนี้ยังไม่ถูกใช้' /> : undefined}
          />
        </div>
      </section>
      ) : null}

      {/* step "แผนกและคลินิก" — การ์ดพรีวิวรูปแบบ + การ์ดหน่วยบริการ */}
      {/* step "แผนก/คลินิก" ใน popup = แถวเพิ่ม + รายการที่เพิ่มไว้เท่านั้น
          ไม่กางตัวแก้ไขเต็ม (25 ส.ค. 2569) เพราะทุกค่าที่ต้องกรอกอยู่ในแถว
          เพิ่มครบแล้ว · หน้าเต็มยังใช้ตัวแก้ไขเดิม */}
      {stepped && show('units') ? (
        <StructureUnitsBuilder
          units={units}
          onUnitsChange={setUnits}
          onAdd={addBlankUnit}
          codeIssues={codeIssues}
        />
      ) : null}

      {stepped && show('review') ? (
        <StructureReview name={name} units={units} counts={counts} />
      ) : null}

      {!stepped ? (
        <>
          <StructurePreviewCard units={units} counts={counts} />
          <CenterStructureEditor
            units={units}
            onUnitsChange={setUnits}
            showAppliedCenters={false}
          />
        </>
      ) : null}

      {/* step "ศูนย์ที่ใช้รูปแบบ" — เฉพาะการ์ดผูกศูนย์ ไม่ซ้ำการ์ดหน่วยบริการ */}
      {(show('centers') || show('review')) && showAppliedCenters ? (
        <CenterStructureEditor
          units={units}
          onUnitsChange={setUnits}
          appliedCenters={appliedCenters}
          onAppliedCentersChange={setAppliedCenters}
          centerOptions={centerOptions}
          showAppliedCenters
          showUnits={false}
        />
      ) : null}
    </>
  );
}

export default useStructureForm;
