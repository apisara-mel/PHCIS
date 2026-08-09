import React from 'react';
import InputField from '@/components/forms/InputField';
import Select from '@/components/forms/Select';
import Switch from '@/components/switch/Switch';
import Icon from '@/components/icons/Icon';
import Topic from '@/components/topic/Topic';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import BrandDashedAddButton from '@/components/button/BrandDashedAddButton';
import RowMenu from '@/components/overflow/RowActionMenu';
import { HOUR_GROUPS, TIME_OPTIONS } from '@/pages/system/centerHourOptions';
import {
  NODE_KINDS,
  UNIT_KINDS,
  createRoomNode,
  createUnit,
  duplicateRoomNode,
  duplicateUnit,
  summarizeStructure,
  unitKindLabel,
} from '@/data/centerStructure';

/* ระบบจัดการระบบ · ตัวแก้ไขโครงสร้างศูนย์บริการ
   ══════════════════════════════════════════════════════════════════════
   สองระดับ: **แผนก และ คลินิก อยู่ระดับเดียวกัน** (ต่างกันแค่ประเภท)
   แต่ละหน่วยมีเวลาเปิด-ปิดของตัวเอง และถือห้องตรวจ/เตียงของตัวเอง

     หน่วยบริการ (แผนก | คลินิก)
        └── ห้องตรวจ (แพทย์) · เตียงสังเกตอาการ

   • เวลาเปิด-ปิด: ค่าตั้งต้นคือ "ตามเวลาศูนย์" กดสวิตช์เพื่อกำหนดเฉพาะหน่วย
     (แยก 3 กลุ่มวันเหมือนเวลาศูนย์)
   • ห้อง/เตียง ผูกกับหน่วยที่อยู่เหนือขึ้นไปเสมอ — ย้ายข้ามหน่วยไม่ได้
     ต้องทำสำเนาแล้วลบของเดิม
   • ทุกระดับมีเมนู ⋮ ที่มี "ทำสำเนา" — คัดลอกทั้งกิ่งพร้อม id ใหม่

   ยังไม่มี component ชุดนี้ใน MIH Design System — ลงทะเบียนไว้ใน
   docs/awaiting-components.md (รอผู้ใช้รายที่ 2 จึงยกขึ้น DS). */

const PANEL = {
  background: 'var(--surface-neutral-quaternary, #F9FBFB)',
  border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary, #F4F5F5)',
  borderRadius: 'var(--dim-radius-400, 12px)',
};

const META = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xs)',
  lineHeight: 1.5,
};

const VALUE = {
  color: 'var(--text-content-default)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-sm)',
  lineHeight: 1.5,
};

/* เวลาเปิด-ปิดของหน่วย — สามกลุ่มวัน กลุ่มละ เปิด/ปิด + ช่วงเวลา. */
function UnitHours({ hours, onChange }) {
  const setGroup = (key, patch) => onChange({ ...hours, [key]: { ...hours[key], ...patch } });

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
      {HOUR_GROUPS.map((g) => {
        const value = hours[g.key] || {};
        const closed = !!value.closed;
        return (
          <div
            key={g.key}
            className='flex items-center flex-wrap w-full'
            style={{
              gap: 'var(--dim-space-300)',
              paddingTop: 'var(--dim-space-200)',
              paddingRight: 'var(--dim-space-300)',
              paddingBottom: 'var(--dim-space-200)',
              paddingLeft: 'var(--dim-space-300)',
              background: 'var(--surface-card-100)',
              border: 'var(--dim-stroke-100) solid var(--border-card-default)',
              borderRadius: 'var(--dim-radius-300)',
            }}
          >
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)', flex: '1 1 180px', minWidth: 160 }}>
              <Icon name={g.icon} size={18} style={{ color: 'var(--text-brandPrimary-default)', flexShrink: 0 }} />
              <div className='flex flex-col min-w-0'>
                <span style={VALUE}>{g.label}</span>
                <span style={META}>{g.sub}</span>
              </div>
            </div>
            <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
              <Switch
                checked={!closed}
                onChange={(next) => setGroup(g.key, { closed: !next })}
                aria-label={`เปิดทำการ ${g.label}`}
              />
              <ColorfulBadge style={closed ? 'grey' : 'green'}>
                {closed ? 'ปิดทำการ' : 'เปิดทำการ'}
              </ColorfulBadge>
            </div>
            {!closed && (
              <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-200)', flex: '2 1 320px' }}>
                <div style={{ flex: '1 1 120px', minWidth: 110 }}>
                  <Select
                    showLabel={false}
                    showHelperText={false}
                    size='medium'
                    searchable={false}
                    placeholder='เริ่ม'
                    options={TIME_OPTIONS}
                    value={value.inStart || ''}
                    onChange={(v) => setGroup(g.key, { inStart: v })}
                  />
                </div>
                <span style={META}>ถึง</span>
                <div style={{ flex: '1 1 120px', minWidth: 110 }}>
                  <Select
                    showLabel={false}
                    showHelperText={false}
                    size='medium'
                    searchable={false}
                    placeholder='สิ้นสุด'
                    options={TIME_OPTIONS}
                    value={value.inEnd || ''}
                    onChange={(v) => setGroup(g.key, { inEnd: v })}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ระดับ 2 — ห้องตรวจ (แพทย์) หรือ เตียงสังเกตอาการ. */
function NodeRow({ node, onChange, onDuplicate, onRemove, canRemove }) {
  const isBed = node.kind === 'bed';
  return (
    <div
      className='flex items-end flex-wrap w-full'
      style={{
        gap: 'var(--dim-space-300)',
        paddingTop: 'var(--dim-space-300)',
        paddingRight: 'var(--dim-space-300)',
        paddingBottom: 'var(--dim-space-300)',
        paddingLeft: 'var(--dim-space-300)',
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-card-default)',
        borderRadius: 'var(--dim-radius-300)',
      }}
    >
      <div style={{ flex: '1 1 180px', minWidth: 160 }}>
        <Select
          label='ประเภท'
          showHelperText={false}
          size='medium'
          searchable={false}
          options={NODE_KINDS.map((k) => ({ value: k.key, label: k.label }))}
          value={node.kind}
          onChange={(v) => onChange({ kind: v })}
        />
      </div>
      <div style={{ flex: '2 1 200px', minWidth: 180 }}>
        <InputField
          label={isBed ? 'ชื่อเตียง' : 'ชื่อห้องตรวจ'}
          showHelperText={false}
          showLeadingIcon={false}
          size='medium'
          value={node.name}
          onChange={(v) => onChange({ name: v })}
          placeholder={isBed ? 'เช่น เตียงสังเกตอาการ 1' : 'เช่น ห้องตรวจ 1'}
        />
      </div>
      <div style={{ flex: '1 1 120px', minWidth: 110 }}>
        <InputField
          label='รหัส'
          showHelperText={false}
          showLeadingIcon={false}
          size='medium'
          value={node.code}
          onChange={(v) => onChange({ code: v })}
          placeholder={isBed ? 'B1' : 'R1'}
        />
      </div>
      {isBed ? (
        <div style={{ flex: '1 1 120px', minWidth: 110 }}>
          <InputField
            label='จำนวนที่รองรับ'
            showHelperText={false}
            showLeadingIcon={false}
            size='medium'
            type='number'
            value={String(node.capacity ?? 1)}
            onChange={(v) => onChange({ capacity: Number(v) || 1 })}
            placeholder='1'
          />
        </div>
      ) : (
        <div style={{ flex: '2 1 200px', minWidth: 180 }}>
          <InputField
            label='แพทย์ประจำห้อง'
            showHelperText={false}
            showLeadingIcon={false}
            size='medium'
            value={node.doctor}
            onChange={(v) => onChange({ doctor: v })}
            placeholder='เช่น นพ.สมชาย ใจดี'
          />
        </div>
      )}
      <div className='flex items-center' style={{ paddingBottom: 'var(--dim-space-100)' }}>
        <RowMenu
          ariaLabel={`ตัวเลือก ${node.name || 'รายการ'}`}
          items={[
            { key: 'dup', icon: 'content_copy', label: 'ทำสำเนา', onClick: onDuplicate },
            { key: 'del', icon: 'delete', label: 'ลบ', danger: true, disabled: !canRemove, onClick: onRemove },
          ]}
        />
      </div>
    </div>
  );
}

/* ระดับ 1 — หน่วยบริการ: แผนก หรือ คลินิก (ระดับเดียวกัน). */
function UnitCard({ unit, index, onChange, onDuplicate, onRemove, canRemove }) {
  const setNode = (nodeId, patch) => onChange({
    nodes: unit.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
  });
  const addNode = (kind) => onChange({ nodes: [...unit.nodes, createRoomNode({ kind })] });
  const dupNode = (node) => onChange({ nodes: [...unit.nodes, duplicateRoomNode(node)] });
  const delNode = (nodeId) => onChange({ nodes: unit.nodes.filter((n) => n.id !== nodeId) });

  const rooms = unit.nodes.filter((n) => n.kind !== 'bed').length;
  const beds = unit.nodes.length - rooms;
  const kindMeta = UNIT_KINDS.find((k) => k.key === unit.kind) || UNIT_KINDS[0];

  return (
    <section
      className='flex flex-col w-full'
      style={{
        background: 'var(--surface-card-100)',
        border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        borderRadius: 'var(--dim-radius-500)',
        boxShadow: 'var(--shadow-card)',
        padding: 'var(--dim-space-500)',
        gap: 'var(--dim-space-400)',
      }}
    >
      <div className='flex items-start justify-between w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <Topic
          hierarchy='secondary'
          title={`${index + 1}. ${unitKindLabel(unit.kind)}${unit.name ? ` · ${unit.name}` : ''}`}
          subText={`${rooms} ห้องตรวจ · ${beds} เตียง`}
          leadingIcon={kindMeta.icon}
          showBadge={false}
          showChevron={false}
          showSuccess={false}
        />
        <RowMenu
          ariaLabel={`ตัวเลือก ${unit.name || index + 1}`}
          items={[
            { key: 'dup', icon: 'content_copy', label: 'ทำสำเนา (พร้อมห้อง/เตียง)', onClick: onDuplicate },
            { key: 'del', icon: 'delete', label: 'ลบรายการนี้', danger: true, disabled: !canRemove, onClick: onRemove },
          ]}
        />
      </div>

      <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
        {/* ประเภทเป็นแค่ป้ายกำกับ ไม่ใช่ชั้นของโครงสร้าง — แผนกกับคลินิกอยู่ระดับเดียวกัน */}
        <div style={{ flex: '1 1 180px', minWidth: 160 }}>
          <Select
            label='ประเภท'
            showHelperText={false}
            size='medium'
            searchable={false}
            options={UNIT_KINDS.map((k) => ({ value: k.key, label: k.label }))}
            value={unit.kind}
            onChange={(v) => onChange({ kind: v })}
          />
        </div>
        <div style={{ flex: '2 1 260px', minWidth: 220 }}>
          <InputField
            label={`ชื่อ${unitKindLabel(unit.kind)}`}
            required
            showHelperText={false}
            showLeadingIcon={false}
            size='medium'
            value={unit.name}
            onChange={(v) => onChange({ name: v })}
            placeholder={unit.kind === 'clinic' ? 'เช่น คลินิกตรวจโรคทั่วไป' : 'เช่น ผู้ป่วยนอก (OPD)'}
          />
        </div>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          <InputField
            label='รหัส'
            showHelperText={false}
            showLeadingIcon={false}
            size='medium'
            value={unit.code}
            onChange={(v) => onChange({ code: v })}
            placeholder={unit.kind === 'clinic' ? 'GP' : 'OPD'}
          />
        </div>
      </div>

      {/* เวลาเปิด-ปิดของหน่วยนี้ */}
      <div className='flex flex-col w-full' style={{ ...PANEL, padding: 'var(--dim-space-400)', gap: 'var(--dim-space-200)' }}>
        <div className='flex items-center justify-between flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div className='flex flex-col min-w-0'>
            <span style={VALUE}>{`เวลาเปิด-ปิดของ${unitKindLabel(unit.kind)}`}</span>
            <span style={META}>
              {unit.followsCenterHours
                ? 'ใช้เวลาทำการเดียวกับศูนย์บริการ'
                : 'กำหนดเวลาเฉพาะรายการนี้ แยกจากเวลาศูนย์'}
            </span>
          </div>
          <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
            <Switch
              checked={!unit.followsCenterHours}
              onChange={(next) => onChange({ followsCenterHours: !next })}
              aria-label='กำหนดเวลาเฉพาะรายการนี้'
            />
            <span style={META}>กำหนดเอง</span>
          </div>
        </div>
        {!unit.followsCenterHours && (
          <UnitHours hours={unit.hours} onChange={(hours) => onChange({ hours })} />
        )}
      </div>

      {/* ระดับ 2 — ห้อง/เตียงของหน่วยนี้ */}
      <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
        <span style={VALUE}>ห้องตรวจและเตียง</span>
        {unit.nodes.length === 0 && (
          <span style={META}>{`ยังไม่มีห้องตรวจหรือเตียงใน${unitKindLabel(unit.kind)}นี้`}</span>
        )}
        {unit.nodes.map((node) => (
          <NodeRow
            key={node.id}
            node={node}
            canRemove
            onChange={(patch) => setNode(node.id, patch)}
            onDuplicate={() => dupNode(node)}
            onRemove={() => delNode(node.id)}
          />
        ))}
        <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
          <div style={{ flex: '1 1 220px' }}>
            <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={() => addNode('room')}>
              เพิ่มห้องตรวจ
            </BrandDashedAddButton>
          </div>
          <div style={{ flex: '1 1 220px' }}>
            <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={() => addNode('bed')}>
              เพิ่มเตียงสังเกตอาการ
            </BrandDashedAddButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function CenterStructureEditor({
  units,
  onUnitsChange,
  appliedCenters,
  onAppliedCentersChange,
  centerOptions,
  /* ซ่อนการ์ด "ใช้รูปแบบนี้กับศูนย์" ในบริบทที่ผูกศูนย์อยู่แล้ว */
  showAppliedCenters = true,
}) {
  const setUnit = (unitId, patch) => onUnitsChange(
    units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)),
  );
  const addUnit = (kind) => onUnitsChange([...units, createUnit({ kind })]);
  const dupUnit = (unit) => onUnitsChange([...units, duplicateUnit(unit)]);
  const delUnit = (unitId) => onUnitsChange(units.filter((u) => u.id !== unitId));

  return (
    <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
      {showAppliedCenters && (
        <section
          className='flex flex-col w-full'
          style={{
            background: 'var(--surface-card-100)',
            border: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
            borderRadius: 'var(--dim-radius-500)',
            boxShadow: 'var(--shadow-card)',
            padding: 'var(--dim-space-500)',
            gap: 'var(--dim-space-300)',
          }}
        >
          <Topic
            hierarchy='primary'
            title='ใช้รูปแบบโครงสร้างนี้กับศูนย์'
            subText='เลือกได้หลายศูนย์ — ศูนย์ที่กำลังสร้างจะได้รูปแบบนี้อยู่แล้ว'
            leadingIcon='content_copy'
            showBadge={false}
            showChevron={false}
            showSuccess={false}
          />
          <div style={{ maxWidth: 520 }}>
            <Select
              label='ศูนย์บริการที่ใช้รูปแบบนี้'
              multiple
              selectAllLabel='เลือกทุกศูนย์'
              searchable
              showHelperText
              helperText='เว้นว่างได้ — จะใช้เฉพาะศูนย์ที่กำลังสร้างเท่านั้น'
              placeholder='เลือกศูนย์บริการ'
              options={centerOptions}
              value={appliedCenters}
              onChange={onAppliedCentersChange}
            />
          </div>
          <span style={META}>{summarizeStructure(units)}</span>
        </section>
      )}

      {units.map((unit, i) => (
        <UnitCard
          key={unit.id}
          unit={unit}
          index={i}
          canRemove={units.length > 1}
          onChange={(patch) => setUnit(unit.id, patch)}
          onDuplicate={() => dupUnit(unit)}
          onRemove={() => delUnit(unit.id)}
        />
      ))}

      {/* แผนกกับคลินิกอยู่ระดับเดียวกัน จึงเป็นปุ่มเพิ่มคู่กัน ไม่ใช่ปุ่มซ้อนชั้น */}
      <div className='flex flex-wrap w-full' style={{ gap: 'var(--dim-space-300)' }}>
        <div style={{ flex: '1 1 240px' }}>
          <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={() => addUnit('department')}>
            เพิ่มแผนก
          </BrandDashedAddButton>
        </div>
        <div style={{ flex: '1 1 240px' }}>
          <BrandDashedAddButton className='w-full' style={{ width: '100%' }} onClick={() => addUnit('clinic')}>
            เพิ่มคลินิก
          </BrandDashedAddButton>
        </div>
      </div>
    </div>
  );
}
