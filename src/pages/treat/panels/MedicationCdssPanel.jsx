import React, { useEffect, useMemo, useState } from 'react';
import Table from '@/components/table/Table';
import Select from '@/components/forms/Select';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import StatusBadge from '@/components/badge/StatusBadge';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandButton from '@/components/button/BrandButton';
import AlertDialog from '@/components/popup/AlertDialog';
import {
  PanelCard, PanelEmptyState, Sym, CancelledMark, strikeIf,
  PANEL_LABEL_STYLE, PANEL_VALUE_STYLE,
} from '@/pages/treat/panels/panelKit';
import {
  useTreatmentAccess, useTreatmentStore, GuardedAction, PanelAlert,
  ReasonDialog, CountLabel,
} from '@/pages/treat/panels/panelHooks';
import {
  checkDrugInteractions, checkDuplicateDrugs, checkHighAlert, checkOutOfRights,
  checkDisallowedChronicDisease, getRegistryDrug, currentPrice, DRUG_CLASSIFICATIONS,
  checkPharmacogenomicRisk, checkPregnancyCategoryX,
} from '@/data/pharmacyRegistry';
import {
  ORDER_MODES, orderModeMeta, calcDoseByWeight, timesPerDayFrom,
  needsPrescribingReason, needsSupportingForm, summariseSig,
} from '@/data/treatmentSigDetail';
import {
  CDSS_RULE_DEFS, getCdssSettings, subscribeCdssSettings, isCdssRuleOn,
  cdssBlocks, getCdssRule, orderSetsForMe, subscribeOrderSets, markOrderSetUsed,
} from '@/data/treatmentOrderSets';
import { appendAudit, CURRENT_CLINICIAN } from '@/data/treatmentAudit';
import { NO_EDIT_RIGHT_TOOLTIP } from '@/data/treatmentAccess';
import MedicationSigDetailPanel from '@/pages/treat/panels/MedicationSigDetailPanel';

/* PHCIS | CPOE §1.5.4.3 / .8 / .13 / .14 / .15 / .17 / .18–.21
   + §1.5.1.4 / §1.5.1.5 / §1.5.1.8 / §1.5.1.9 — CDSS ยา + ตารางรายละเอียดคำสั่งยา.

   ไม่มี engine ใหม่: เรียก checkDrugInteractions / checkDuplicateDrugs /
   checkHighAlert / checkOutOfRights / checkDisallowedChronicDisease จาก
   `pharmacyRegistry.js` ซึ่งเดิมถูกเรียกเฉพาะฝั่งห้องยา — งานที่นี่คือ
   "เดินสาย" ชุดเดิมเข้า CPOE ให้เตือนตั้งแต่ตอนแพทย์สั่ง.

   กัน alert fatigue: ยาหนึ่งตัวที่ติดหลายเงื่อนไขถูกยุบเป็น "แถบเดียว
   ต่อชนิดเตือน" เรียงตามความรุนแรง กดขยายจึงเห็นรายคู่ — และแถบที่กด
   "รับทราบ" แล้วจะไม่เด้งซ้ำใน visit เดียวกัน ยกเว้นแพ้ยาตรงตัวซึ่ง
   dismiss ไม่ได้ตามกฎ. */

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 };

/* §1.5.4.19 "แพ้ข้ามกลุ่ม" — drugAllergies ในเวชระเบียน (mrPatients.js) เก็บแค่
   { name, symptom, severity } ไม่มีชื่อกลุ่มยา จึงต้องอนุมานกลุ่มจากชื่อทั้ง
   ฝั่งสารก่อภูมิแพ้และฝั่งรายการยาที่สั่ง มิฉะนั้นสาขานี้ไม่มีวันทำงานเลย.
   ถ้าวันหนึ่งเวชระเบียนเพิ่มฟิลด์ `group` มาเอง ระบบจะใช้ค่านั้นก่อน. */
const ALLERGY_GROUPS = [
  { group: 'เพนิซิลลิน (Penicillins)', matches: ['penicillin', 'amoxicillin', 'ampicillin', 'dicloxacillin', 'cloxacillin', 'co-amoxiclav', 'augmentin'] },
  { group: 'เซฟาโลสปอริน (Cephalosporins)', matches: ['cephalexin', 'cefalexin', 'cefixime', 'cefuroxime', 'ceftriaxone', 'cefdinir'] },
  { group: 'ซัลฟา (Sulfonamides)', matches: ['sulfonamide', 'sulfa', 'sulfamethoxazole', 'co-trimoxazole', 'trimethoprim', 'bactrim'] },
  { group: 'ยาต้านการอักเสบที่ไม่ใช่สเตียรอยด์ (NSAIDs)', matches: ['nsaid', 'aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'mefenamic', 'piroxicam', 'celecoxib', 'indomethacin'] },
  { group: 'แมโครไลด์ (Macrolides)', matches: ['erythromycin', 'azithromycin', 'clarithromycin', 'roxithromycin'] },
  { group: 'ควิโนโลน (Quinolones)', matches: ['ciprofloxacin', 'ofloxacin', 'levofloxacin', 'norfloxacin'] },
];

/* คู่กลุ่มที่มีรายงานแพ้ข้ามกัน (ไม่ใช่กลุ่มเดียวกันแต่เสี่ยงร่วม) */
const CROSS_GROUP_PAIRS = [
  ['เพนิซิลลิน (Penicillins)', 'เซฟาโลสปอริน (Cephalosporins)'],
];

const groupsForName = (name) => {
  const n = String(name || '').toLowerCase();
  if (!n) return [];
  return ALLERGY_GROUPS.filter((g) => g.matches.some((m) => n.includes(m))).map((g) => g.group);
};

const groupsRelated = (a, b) => a === b
  || CROSS_GROUP_PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

const baht = (n) => Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const classificationLabel = (key) =>
  DRUG_CLASSIFICATIONS.find((c) => c.key === key)?.label || key;

const MedicationCdssPanel = ({ form, setForm, patient, onGoToDocuments, onGoToMedRec }) => {
  const access = useTreatmentAccess();
  const canEdit = access.canEdit;
  const hn = patient?.hn || '';
  const rows = form?.medications || [];

  const [cdss] = useTreatmentStore(subscribeCdssSettings, getCdssSettings, []);
  const [orderSets] = useTreatmentStore(subscribeOrderSets, orderSetsForMe, []);

  const [expanded, setExpanded] = useState('');
  const [stopTarget, setStopTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [confirmHighAlert, setConfirmHighAlert] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [sigRow, setSigRow] = useState(null);
  const [pickedSet, setPickedSet] = useState('');

  const dismissed = form?.cdssDismissed || {};
  const dismiss = (key) => setForm((f) => ({
    ...f, cdssDismissed: { ...(f.cdssDismissed || {}), [key]: true },
  }));

  const weightKg = form?.vitals?.weight;
  const patientRights = patient?.rights || '';

  /* ── รวบรวมสัญญาณจาก engine เดิมทั้งชุด ─────────────────── */
  const signals = useMemo(() => {
    const active = rows.filter((r) => !r.discontinuedAt && !r.cancelledAt);
    const out = [];

    /* แพ้ยา — ตรงตัว + ข้ามกลุ่ม จาก patient.drugAllergies */
    if (isCdssRuleOn('allergy')) {
      const allergens = (patient?.drugAllergies || []).map((a) => {
        const name = a.name || a.drug || String(a);
        const explicit = a.group || a.className || '';
        return { name, groups: explicit ? [explicit] : groupsForName(name) };
      });
      const exact = [];
      const cross = [];
      active.forEach((row) => {
        const rowGroups = groupsForName(row.name);
        allergens.forEach((al) => {
          const rn = String(row.name || '').toLowerCase();
          const an = String(al.name || '').toLowerCase();
          if (!an) return;
          if (rn.includes(an) || an.includes(rn.split(' ')[0])) {
            exact.push({ row, allergen: al.name });
            return;
          }
          /* กลุ่มเดียวกัน หรือกลุ่มที่มีรายงานแพ้ข้ามกัน → เตือน (dismiss ได้) */
          const hit = al.groups.find((ag) => rowGroups.some((rg) => groupsRelated(ag, rg)));
          if (hit) cross.push({ row, allergen: al.name, group: hit });
        });
      });
      if (exact.length) {
        out.push({
          key: 'allergy-exact', rule: 'allergy', severity: 'critical', tone: 'error',
          icon: 'dangerous', dismissible: false,
          title: `แพ้ยาตรงตัว ${exact.length} รายการ — ห้ามสั่ง`,
          summary: exact.map((e) => `${e.row.name} (แพ้ ${e.allergen})`).join(' · '),
          details: exact.map((e) => ({
            head: e.row.name,
            body: `ผู้รับบริการมีประวัติแพ้ ${e.allergen} — ห้ามสั่งยาชนิดนี้ ให้เปลี่ยนเป็นยากลุ่มอื่น หรือปรึกษาเภสัชกรก่อน`,
          })),
        });
      }
      if (cross.length) {
        out.push({
          key: 'allergy-cross', rule: 'allergy', severity: 'warning', tone: 'warning',
          icon: 'warning', dismissible: true,
          title: `ความเสี่ยงแพ้ยาข้ามกลุ่ม ${cross.length} รายการ`,
          summary: cross.map((e) => `${e.row.name} (กลุ่มเดียวกับ ${e.allergen})`).join(' · '),
          details: cross.map((e) => ({
            head: e.row.name,
            body: `อยู่ในกลุ่ม ${e.group} เดียวกับที่ผู้รับบริการเคยแพ้ (${e.allergen}) — ติดตามอาการหลังใช้ยาอย่างใกล้ชิด`,
          })),
        });
      }
    }

    /* มติ คทง.7 — คัดกรองยีนก่อนสั่งยา (HLA-B)
       ผลบวก = ห้ามสั่ง (dismiss ไม่ได้ เหมือนแพ้ยาตรงตัว)
       ยังไม่มีผล = เตือนให้ส่งตรวจก่อน (dismiss ได้ เพราะบางกรณีแพทย์
       สั่งพร้อมใบส่งตรวจและจ่ายยาเมื่อผลออก) */
    if (isCdssRuleOn('pharmacogenomic')) {
      const gene = checkPharmacogenomicRisk(patient, active);
      const positive = gene.filter((g) => g.state === 'positive');
      const pending = gene.filter((g) => g.state === 'pending');
      if (positive.length) {
        out.push({
          key: 'pgx-positive', rule: 'pharmacogenomic', severity: 'critical', tone: 'error',
          icon: 'genetics', dismissible: false,
          title: `ผลคัดกรองยีนเป็นบวก ${positive.length} รายการ — ห้ามสั่ง`,
          summary: positive.map((g) => `${g.item.name} (${g.gene} Positive)`).join(' · '),
          details: positive.map((g) => ({
            head: `${g.item.name} · ${g.gene}`,
            body: `ผลตรวจ ${g.gene} เป็นบวก — ${g.risk} ห้ามสั่งยาชนิดนี้ ให้เลือกยากลุ่มอื่นแทน`,
          })),
        });
      }
      if (pending.length) {
        out.push({
          key: 'pgx-pending', rule: 'pharmacogenomic', severity: 'warning', tone: 'warning',
          icon: 'science', dismissible: true,
          title: `ต้องคัดกรองยีนก่อนสั่ง ${pending.length} รายการ`,
          summary: pending.map((g) => `${g.item.name} (ยังไม่มีผล ${g.gene})`).join(' · '),
          details: pending.map((g) => ({
            head: `${g.item.name} · ${g.gene}`,
            body: `ยังไม่มีผลตรวจ ${g.labName} ในระบบ — ส่งตรวจก่อนเริ่มยา (${g.risk})`,
          })),
        });
      }
    }

    /* มติ คทง.7 — ยา Pregnancy Category X ในหญิงตั้งครรภ์ = ห้ามสั่ง */
    if (isCdssRuleOn('pregnancy')) {
      const catX = checkPregnancyCategoryX(patient, active);
      if (catX.length) {
        out.push({
          key: 'pregnancy-x', rule: 'pregnancy', severity: 'critical', tone: 'error',
          icon: 'pregnant_woman', dismissible: false,
          title: `ยาห้ามใช้ในหญิงตั้งครรภ์ ${catX.length} รายการ — ห้ามสั่ง`,
          summary: catX.map((c) => c.item.name).join(' · '),
          details: catX.map((c) => ({
            head: `${c.item.name} · Pregnancy Category X`,
            body: `ผู้รับบริการอยู่ระหว่างตั้งครรภ์ — ${c.reason} ให้เลือกยาที่ปลอดภัยในหญิงตั้งครรภ์แทน`,
          })),
        });
      }
    }

    /* ปฏิกิริยาระหว่างยา — ในใบเดียวกัน */
    if (isCdssRuleOn('interaction')) {
      const pairs = checkDrugInteractions(active);
      if (pairs.length) {
        out.push({
          key: 'interaction', rule: 'interaction', severity: 'critical', tone: 'error',
          icon: 'join_inner', dismissible: true,
          title: `พบปฏิกิริยาระหว่างยา ${pairs.length} คู่`,
          summary: pairs.map((p) => `${p.a} + ${p.b}`).join(' · '),
          details: pairs.map((p) => ({ head: `${p.a} + ${p.b}`, body: p.description })),
        });
      }

      /* **มติ คทง.1** — DI ข้าม Visit: เทียบยาที่กำลังสั่งวันนี้กับยาที่ผู้รับ
         บริการ "ยังกินอยู่" จาก visit ก่อนหน้า คู่ที่ชนกันเองในประวัติเดิม
         ไม่ต้องเตือน (แพทย์เจ้าของเดิมพิจารณาไปแล้ว) — เตือนเฉพาะคู่ที่เกิด
         จากยาใหม่วันนี้ ไม่งั้นเป็น alert fatigue ทันที */
      const carried = (form?.activeMedsFromPastVisits || []).filter((m) => !m.stoppedAt);
      if (carried.length && active.length) {
        const activeNames = new Set(active.map((r) => String(r.name).toLowerCase()));
        const crossPairs = checkDrugInteractions([...active, ...carried])
          .filter((p) => {
            const a = String(p.a).toLowerCase();
            const b = String(p.b).toLowerCase();
            /* คู่ที่ "ขาหนึ่งเป็นยาใหม่วันนี้ อีกขาเป็นยาเดิม" เท่านั้น */
            return activeNames.has(a) !== activeNames.has(b);
          })
          .map((p) => {
            const oldName = activeNames.has(String(p.a).toLowerCase()) ? p.b : p.a;
            const source = carried.find((m) => String(m.name).toLowerCase() === String(oldName).toLowerCase());
            return { ...p, oldName, source };
          });
        if (crossPairs.length) {
          out.push({
            key: 'interaction-crossvisit', rule: 'interaction', severity: 'critical', tone: 'error',
            icon: 'history_toggle_off', dismissible: true,
            title: `ปฏิกิริยากับยาเดิมที่ยังใช้อยู่ ${crossPairs.length} คู่`,
            summary: crossPairs.map((p) => `${p.a} + ${p.b}`).join(' · '),
            details: crossPairs.map((p) => ({
              head: `${p.a} + ${p.b}`,
              body: `${p.description} — ${p.oldName} เป็นยาเดิมจาก${p.source?.clinic || 'visit ก่อนหน้า'} เริ่มใช้ ${p.source?.startedAt || '—'} และยังไม่ได้หยุด`,
            })),
          });
        }
      }
    }

    /* ยาซ้ำซ้อนในใบเดียวกัน + ซ้ำภายในวันเดียวกัน (§1.5.1.9) */
    if (isCdssRuleOn('duplicate')) {
      const dups = checkDuplicateDrugs(active);
      const sameDay = (form?.sameDayPrescriptions || []).filter(
        (p) => active.some((r) => String(r.name).toLowerCase() === String(p.name).toLowerCase()),
      );
      if (dups.length || sameDay.length) {
        out.push({
          key: 'duplicate', rule: 'duplicate', severity: 'warning', tone: 'warning',
          icon: 'content_copy', dismissible: true,
          title: `ยาซ้ำซ้อน ${dups.length + sameDay.length} รายการ`,
          summary: [...dups, ...sameDay.map((s) => `${s.name} (สั่งไปแล้ววันนี้)`)].join(' · '),
          details: [
            ...dups.map((n) => ({ head: n, body: 'ปรากฏมากกว่า 1 ครั้งในใบสั่งยาเดียวกัน — ลบรายการซ้ำหรือรวมขนาดยาให้เป็นบรรทัดเดียว' })),
            ...sameDay.map((s) => ({
              head: s.name,
              body: `ถูกสั่งไปแล้ววันนี้ที่ ${s.clinic || 'หน่วยงานอื่น'} เวลา ${s.at || '—'} — ตรวจสอบก่อนสั่งซ้ำเพื่อเลี่ยงยาเกินขนาด`,
            })),
          ],
        });
      }
    }

    /* ขนาดยาเกินเพดานตามน้ำหนัก */
    if (isCdssRuleOn('dose')) {
      const over = [];
      const needWeight = [];
      active.forEach((row) => {
        const calc = calcDoseByWeight({
          name: row.name,
          dosePerTake: row.dosePerTake,
          timesPerDay: timesPerDayFrom(row.frequency, row.sigDetail),
          weightKg,
        });
        if (!calc.ok && calc.reason === 'noWeight') needWeight.push(row);
        if (calc.ok && calc.exceeded) over.push({ row, calc });
      });
      if (over.length) {
        out.push({
          key: 'dose', rule: 'dose', severity: 'critical', tone: 'error',
          icon: 'scale', dismissible: true,
          title: `ขนาดยาเกินเพดานตามน้ำหนัก ${over.length} รายการ`,
          summary: over.map((o) => `${o.row.name} (${o.calc.mkDay} mg/kg/day)`).join(' · '),
          details: over.map((o) => ({ head: o.row.name, body: o.calc.messages.join(' · ') })),
        });
      }
      if (needWeight.length) {
        out.push({
          key: 'dose-noweight', rule: 'dose', severity: 'info', tone: 'info',
          icon: 'monitor_weight', dismissible: true,
          title: 'ยังคำนวณขนาดยาตามน้ำหนักไม่ได้',
          summary: `ไม่มีน้ำหนักตัวใน สัญญาณชีพ — ${needWeight.length} รายการยังไม่ผ่านการตรวจขนาดยาตามน้ำหนัก`,
          details: [{
            head: 'ต้องมีน้ำหนักจึงคำนวณได้',
            body: 'กลับไปบันทึกน้ำหนักที่ขั้นคัดกรองและซักประวัติ — ระบบจะไม่คำนวณจากค่าประมาณเพราะเสี่ยงต่อผู้ป่วยเด็ก',
          }],
        });
      }
    }

    /* High alert / ยาควบคุม */
    if (isCdssRuleOn('highalert')) {
      const ha = checkHighAlert(active);
      const controlled = active.filter((r) => {
        const d = getRegistryDrug(r.name);
        return d && (d.classification === 'narcotic' || d.classification === 'psychotropic');
      });
      const merged = [...new Map([...ha, ...controlled].map((r) => [r.name, r])).values()];
      if (merged.length) {
        out.push({
          key: 'highalert', rule: 'highalert', severity: 'critical', tone: 'error',
          icon: 'priority_high', dismissible: true,
          title: `ยาความเสี่ยงสูง / ยาควบคุม ${merged.length} รายการ — ต้องยืนยันซ้ำก่อนบันทึก`,
          summary: merged.map((r) => r.name).join(' · '),
          details: merged.map((r) => {
            const d = getRegistryDrug(r.name);
            return {
              head: r.name,
              body: `${d?.highAlert ? 'High Alert Drug · ' : ''}${classificationLabel(d?.classification)} — ต้องตรวจสอบขนาดยาซ้ำโดยผู้สั่ง และบันทึกเหตุผลการสั่งใช้`,
            };
          }),
        });
      }
    }

    /* โรคประจำตัวที่ห้ามใช้ยานี้ */
    const disallowed = checkDisallowedChronicDisease(patient, active);
    if (disallowed.length) {
      out.push({
        key: 'chronic', rule: 'highalert', severity: 'critical', tone: 'error',
        icon: 'personal_injury', dismissible: true,
        title: `ยาที่ขัดกับโรคประจำตัว ${disallowed.length} รายการ`,
        summary: disallowed.map((d) => `${d.item.name} × ${d.disease}`).join(' · '),
        details: disallowed.map((d) => ({
          head: d.item.name,
          body: `ผู้รับบริการมีโรคประจำตัว "${d.disease}" ซึ่งเป็นข้อควรระวังของยานี้ — พิจารณาเปลี่ยนยาหรือปรับขนาด`,
        })),
      });
    }

    /* เอกสารประกอบการสั่งยา (§1.5.4.15) */
    const needForms = active
      .map((r) => ({ row: r, form: needsSupportingForm(r.name) }))
      .filter((x) => x.form && !x.row.supportingFormAttached);
    if (needForms.length) {
      out.push({
        key: 'supportform', rule: 'highalert', severity: 'warning', tone: 'warning',
        icon: 'description', dismissible: true,
        title: `ต้องแนบเอกสารประกอบการสั่งยา ${needForms.length} รายการ`,
        summary: needForms.map((x) => `${x.row.name} → ${x.form.formName}`).join(' · '),
        details: needForms.map((x) => ({ head: x.row.name, body: `${x.form.why} — ต้องแนบ "${x.form.formName}" ที่ขั้นเอกสาร` })),
        action: onGoToDocuments ? { label: 'ไปแนบเอกสาร', onClick: onGoToDocuments } : null,
      });
    }

    /* สิทธิเบิกไม่ครอบคลุม (§1.5.1.4) */
    if (isCdssRuleOn('rights')) {
      const oor = checkOutOfRights(patientRights, active);
      if (oor.length) {
        out.push({
          key: 'rights', rule: 'rights', severity: 'warning', tone: 'warning',
          icon: 'account_balance_wallet', dismissible: true,
          title: `สิทธิเบิกไม่ครอบคลุม ${oor.length} รายการ`,
          summary: oor.map((r) => r.name).join(' · '),
          details: oor.map((r) => ({
            head: r.name,
            body: `สิทธิ "${patientRights || 'ไม่ระบุ'}" เบิกยาชนิดนี้ไม่ได้ — ผู้รับบริการต้องชำระเอง หรือเปลี่ยนเป็นยาในบัญชีที่เบิกได้`,
          })),
        });
      }
    }

    return out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }, [rows, patient, patientRights, weightKg, cdss, form?.sameDayPrescriptions, form?.activeMedsFromPastVisits, onGoToDocuments]);

  /* §1.5.4.18–.21 — "ระดับความรุนแรงขั้นต่ำที่แจ้ง" ที่ตั้งไว้ต่อกฎต้องมีผลจริง
     (เดิมค่านี้ถูกบันทึกและ audit แต่ไม่มีใครอ่าน สัญญาณ info/warning จึงเด้ง
     แม้ตั้งเป็น "เฉพาะระดับรุนแรง") */
  const minRankOf = (rule) => SEVERITY_RANK[getCdssRule(rule).minSeverity] ?? 1;
  const aboveThreshold = (s) => SEVERITY_RANK[s.severity] >= minRankOf(s.rule);

  const visibleSignals = signals.filter(
    (s) => aboveThreshold(s) && !(s.dismissible && dismissed[s.key]),
  );
  const blockingSignals = signals.filter(
    (s) => aboveThreshold(s) && cdssBlocks(s.rule) && s.severity === 'critical',
  );

  /* ยกสถานะ "ห้ามส่งใบสั่งยา" ขึ้นไปที่ฟอร์ม เพื่อให้ปุ่ม "ส่งยาไปห้องยา"
     ใน TreatmentFormPage ถูกกันไว้จริงตามที่แถบเตือนบอก — เดิมแถบเตือนบอกว่า
     "ถูกกันไม่ให้ส่งต่อ" แต่ปุ่มยังกดส่งได้ */
  const blockReason = blockingSignals.map((s) => s.title).join(' · ');
  useEffect(() => {
    const blocked = blockReason.length > 0;
    setForm((f) => (
      f.cpoeSendBlocked === blocked && f.cpoeSendBlockReason === blockReason
        ? f
        : { ...f, cpoeSendBlocked: blocked, cpoeSendBlockReason: blockReason }
    ));
  }, [blockReason, setForm]);

  /* ── ราคา / ยอดเบิกได้ (§1.5.1.5) ────────────────────────── */
  const money = useMemo(() => {
    let total = 0; let claim = 0;
    rows.forEach((row) => {
      if (row.discontinuedAt || row.cancelledAt) return;
      const drug = getRegistryDrug(row.name);
      const unitPrice = drug ? currentPrice(drug) : (row.unitPrice ?? 0);
      const qty = Number(row.quantity ?? 1) || 1;
      const line = unitPrice * qty;
      total += line;
      const eligible = drug ? drug.rightsEligible.includes(patientRights) : false;
      if (eligible) claim += line;
    });
    return { total, claim, patientPay: total - claim };
  }, [rows, patientRights]);

  /* ── สิทธิ 3 กรณี (§1.5.1.4) ─────────────────────────────── */
  const rightsCase = !patientRights || patientRights === 'ชำระเงินเอง'
    ? 'none'
    : patient?.rightsExpired ? 'expired' : 'ok';

  /* ── การกระทำต่อแถว ──────────────────────────────────────── */
  const patchRow = (id, patch) => setForm((f) => ({
    ...f,
    medications: (f.medications || []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
  }));

  const setOrderMode = (row, mode) => {
    patchRow(row.id, { orderMode: mode, stat: mode === 'stat' });
    appendAudit({
      hn, visitId: form?.visitId, category: 'medrec',
      field: `ลักษณะการสั่งยา — ${row.name}`,
      oldValue: orderModeMeta(row.orderMode || 'once').label,
      newValue: orderModeMeta(mode).label,
    });
  };

  /* มติ คทง.1 ครั้งที่ 4 — แพทย์หลายคนสั่งใน VN เดียวได้ แต่ระบบบันทึกรหัส
     ผู้สั่งทุกรายการ และ **แพทย์ยกเลิก/แก้คำสั่งของแพทย์ท่านอื่นผ่านระบบ
     โดยตรงไม่ได้** — แถวที่ไม่มี orderedBy (ของเดิม) ถือเป็นของผู้ใช้ปัจจุบัน */
  const ownedByOther = (row) => Boolean(row.orderedBy && row.orderedBy !== CURRENT_CLINICIAN.name);
  const otherDoctorReason = (row) => `คำสั่งนี้สั่งโดย ${row.orderedBy} — ยกเลิก/แก้ไขได้เฉพาะแพทย์ผู้สั่ง (มติ คทง.1)`;

  const doStop = (reason) => {
    if (!stopTarget) return;
    patchRow(stopTarget.id, { discontinuedAt: new Date().toISOString(), discontinueReason: reason });
    appendAudit({
      hn, visitId: form?.visitId, category: 'medrec',
      field: `หยุดยา — ${stopTarget.name}`,
      oldValue: 'กำลังใช้', newValue: `หยุดยา — ${reason}`,
    });
    setStopTarget(null);
  };

  const doCancel = (reason) => {
    if (!cancelTarget) return;
    patchRow(cancelTarget.id, { cancelledAt: new Date().toISOString(), cancelReason: reason });
    appendAudit({
      hn, visitId: form?.visitId, category: 'medrec',
      field: `ยกเลิกคำสั่งยา — ${cancelTarget.name}`,
      oldValue: 'อยู่ในใบสั่งยา', newValue: `ยกเลิก — ${reason}`,
    });
    setCancelTarget(null);
  };

  const restore = (row) => {
    patchRow(row.id, { cancelledAt: '', cancelReason: '', discontinuedAt: '', discontinueReason: '' });
    appendAudit({
      hn, visitId: form?.visitId, category: 'medrec',
      field: `กู้คืนคำสั่งยา — ${row.name}`, oldValue: 'ยกเลิก/หยุดยา', newValue: 'กลับมาใช้งาน',
    });
  };

  /* ── ชุดยาของฉัน (§1.5.1.8) ─────────────────────────────── */
  const applyOrderSet = () => {
    const set = orderSets.find((s) => s.id === pickedSet);
    if (!set) return;
    const meds = set.items.filter((i) => i.kind === 'medication');
    if (meds.length === 0) return;
    setForm((f) => ({
      ...f,
      medications: [
        ...(f.medications || []),
        ...meds.map((m, i) => ({
          id: `med-set-${Date.now()}-${i}`,
          /* มติ คทง.1 — บันทึกรหัสผู้สั่งทุกรายการ (ต่อ VN สั่งได้หลายแพทย์) */
          orderedBy: CURRENT_CLINICIAN.name,
          name: m.label,
          usage: 'รับประทาน (Oral)',
          dosePerTake: m.dosePerTake || '1',
          unit: 'เม็ด',
          frequency: m.frequency || 'วันละ 1 ครั้ง',
          when: 'หลังอาหาร',
          warning: m.note || '',
          quantity: 1,
          totalPrice: 0,
          reimbursable: false,
          purpose: `จากชุดคำสั่ง ${set.name}`,
          orderMode: 'once',
          approve: false, consult: false, stat: false, print: false,
          editor: 'พญ.สมหญิง',
          fromOrderSet: set.name,
        })),
      ],
    }));
    markOrderSetUsed(set.id);
    appendAudit({
      hn, visitId: form?.visitId, category: 'medrec',
      field: `ใช้ชุดคำสั่ง "${set.name}"`, oldValue: '—', newValue: `เพิ่มยา ${meds.length} รายการ`,
    });
    setPickedSet('');
  };

  /* ── ตารางรายละเอียด 11 มิติ (§1.5.4.8) ─────────────────── */
  const detailColumns = [
    {
      key: 'name', header: 'รายการยา',
      render: (row) => {
        const drug = getRegistryDrug(row.name);
        const inactive = !!row.cancelledAt || !!row.discontinuedAt;
        return (
          <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={{ ...PANEL_VALUE_STYLE, ...strikeIf(inactive) }}>{row.name}</span>
            <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
              {drug?.highAlert ? <StatusBadge style='error' size='small' icon='priority_high'>High Alert</StatusBadge> : null}
              {drug && drug.classification !== 'nlem'
                ? <ColorfulBadge style='purple' size='small' width='hug'>{classificationLabel(drug.classification)}</ColorfulBadge>
                : null}
              {row.fromOrderSet ? <ColorfulBadge style='teal' size='small' width='hug'>ชุดคำสั่ง</ColorfulBadge> : null}
              {form?.continueOrder ? <ColorfulBadge style='blue' size='small' width='hug'>ต่อเนื่อง</ColorfulBadge> : null}
            </div>
          </div>
        );
      },
    },
    {
      key: 'mode', header: 'ลักษณะการสั่ง',
      render: (row) => (
        <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          {ORDER_MODES.map((m) => (
            <label
              key={m.key}
              className='inline-flex items-center'
              style={{ gap: 'var(--dim-space-100, 4px)', cursor: canEdit ? 'pointer' : 'not-allowed' }}
            >
              <input
                type='radio'
                name={`mode-${row.id}`}
                checked={(row.orderMode || 'once') === m.key}
                disabled={!canEdit || !!row.cancelledAt}
                onChange={() => setOrderMode(row, m.key)}
              />
              <span style={PANEL_LABEL_STYLE}>{m.label}</span>
            </label>
          ))}
        </div>
      ),
    },
    {
      key: 'sig', header: 'ปริมาณ / เวลา / จำนวน',
      render: (row) => (
        <div className='flex flex-col min-w-0' style={{ gap: 'var(--dim-space-100, 4px)' }}>
          <span style={PANEL_VALUE_STYLE}>
            ครั้งละ {row.dosePerTake || '—'} {row.unit || 'เม็ด'} · {row.frequency || '—'} · {row.when || '—'}
          </span>
          <span style={PANEL_LABEL_STYLE}>จำนวนที่จ่าย {row.quantity ?? '—'} {row.unit || 'เม็ด'}</span>
          {row.sigDetail ? (
            <span style={PANEL_LABEL_STYLE}>{summariseSig(row.sigDetail, { dosePerTake: row.dosePerTake, unit: row.unit })}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'money', header: 'จำนวนเงิน',
      render: (row) => {
        const drug = getRegistryDrug(row.name);
        const unitPrice = drug ? currentPrice(drug) : (row.unitPrice ?? 0);
        const qty = Number(row.quantity ?? 1) || 1;
        const eligible = drug ? drug.rightsEligible.includes(patientRights) : false;
        return (
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            <span style={PANEL_VALUE_STYLE}>{baht(unitPrice * qty)} บาท</span>
            <span style={PANEL_LABEL_STYLE}>ราคา/หน่วย {baht(unitPrice)}</span>
            {eligible
              ? <StatusBadge style='success' size='small' icon='verified'>เบิกได้</StatusBadge>
              : <StatusBadge style='warning' size='small' icon='payments'>เบิกไม่ได้ · ชำระเอง</StatusBadge>}
          </div>
        );
      },
    },
    {
      key: 'flags', header: 'สถานะ',
      render: (row) => {
        const drug = getRegistryDrug(row.name);
        const stock = drug?.usageRate?.reorderPoint ?? 0;
        const low = stock > 0 && stock < 45;
        const sf = needsSupportingForm(row.name);
        return (
          <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-100, 4px)' }}>
            {row.stat || row.orderMode === 'stat' ? <StatusBadge style='error' size='small' icon='bolt'>STAT</StatusBadge> : null}
            {row.approve ? <StatusBadge style='success' size='small' icon='check'>อนุมัติแล้ว</StatusBadge> : null}
            {row.consult ? <ColorfulBadge style='blue' size='small' width='hug'>ขอคำปรึกษาเภสัชกร</ColorfulBadge> : null}
            {row.print ? <ColorfulBadge style='grey' size='small' width='hug'>พิมพ์ฉลากแล้ว</ColorfulBadge> : null}
            {low ? <StatusBadge style='warning' size='small' icon='inventory_2'>สต็อกใกล้หมด</StatusBadge> : null}
            {sf ? (
              <StatusBadge style={row.supportingFormAttached ? 'success' : 'warning'} size='small' icon='description'>
                {row.supportingFormAttached ? 'แนบเอกสารแล้ว' : 'ต้องแนบเอกสาร'}
              </StatusBadge>
            ) : null}
            {needsPrescribingReason(row.name) && !String(row.prescribingReason || '').trim()
              ? <StatusBadge style='error' size='small' icon='edit_note'>ยังไม่ระบุเหตุผลการสั่งใช้</StatusBadge>
              : null}
            {row.discontinuedAt ? <StatusBadge style='neutral' size='small' icon='block'>หยุดยาแล้ว</StatusBadge> : null}
          </div>
        );
      },
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div className='flex flex-wrap items-center' style={{ gap: 'var(--dim-space-200, 8px)' }}>
          <NeutralSubdueButton variant='outline' size='sm' leadingIcon='visibility' onClick={() => setDetailRow(row)}>
            แสดง
          </NeutralSubdueButton>
          <GuardedAction allowed={canEdit && !row.cancelledAt}>
            <NeutralSubdueButton variant='outline' size='sm' leadingIcon='tune' onClick={() => setSigRow(row)}>
              วิธีใช้ยาแบบละเอียด
            </NeutralSubdueButton>
          </GuardedAction>
          {row.cancelledAt || row.discontinuedAt ? (
            <GuardedAction
              allowed={canEdit && !ownedByOther(row)}
              reason={ownedByOther(row) ? otherDoctorReason(row) : undefined}
            >
              <NeutralSubdueButton variant='outline' size='sm' leadingIcon='undo' onClick={() => restore(row)}>
                กู้คืน
              </NeutralSubdueButton>
            </GuardedAction>
          ) : (
            <>
              <GuardedAction
                allowed={canEdit && !ownedByOther(row)}
                reason={ownedByOther(row) ? otherDoctorReason(row) : undefined}
              >
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='stop_circle' onClick={() => setStopTarget(row)}>
                  หยุดยา
                </NeutralSubdueButton>
              </GuardedAction>
              <GuardedAction
                allowed={canEdit && !ownedByOther(row)}
                reason={ownedByOther(row) ? otherDoctorReason(row) : undefined}
              >
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='block' onClick={() => setCancelTarget(row)}>
                  ยกเลิก
                </NeutralSubdueButton>
              </GuardedAction>
            </>
          )}
        </div>
      ),
    },
  ];

  const medRecPending = Number(form?.medRecPending || 0);

  return (
    <div className='flex flex-col w-full min-w-0' style={{ gap: 'var(--dim-space-300, 12px)' }}>
      {/* ── สิทธิการรักษา 3 กรณี ─────────────────────────────── */}
      {rightsCase === 'none' ? (
        <PanelAlert tone='warning' icon='account_balance_wallet' title='ผู้รับบริการไม่มีสิทธิการรักษา — ชำระเงินเอง'>
          ทุกรายการจะแสดงราคาเต็มและติดป้าย "ชำระเงินเอง" — แจ้งผู้รับบริการก่อนสั่งยาราคาสูง
        </PanelAlert>
      ) : null}
      {rightsCase === 'expired' ? (
        <PanelAlert tone='warning' icon='gpp_maybe' title='สิทธิการรักษาหมดอายุ'>
          สิทธิ "{patientRights}" หมดอายุแล้ว — ยังสั่งยาได้ แต่การเบิกจ่ายอาจไม่ผ่าน
          ให้ตรวจสอบสิทธิที่งานเวชระเบียนก่อนส่งใบสั่งยาไปห้องยา
        </PanelAlert>
      ) : null}

      {/* แถบเตือน "ยังประสานรายการยาเดิมไม่ครบ" ถูกเอาออก 31 ส.ค. 69 (มติผู้ใช้)
          — ด่านจริงยังอยู่ครบ: ปุ่ม "ส่งยาไปห้องยา" ยังถูกกันไว้ และข้อความเตือน
          ตอนกดยังมาจาก `TreatmentFormPage` เหมือนเดิม */}

      {/* ── CDSS rail ─────────────────────────────────────────── */}
      {/* แถบเขียว "ตรวจสอบความปลอดภัยของใบสั่งยาแล้ว…" ถูกเอาออก 31 ส.ค. 69
          (มติผู้ใช้) — แจ้งเฉพาะตอนเจอประเด็นจริงพอ เหมือนที่ทำกับแถบเขียวของ
          แบบประเมินความปลอดภัยไปแล้ว 28 ส.ค. 69 */}

      {visibleSignals.map((sig) => (
        <PanelAlert
          key={sig.key}
          tone={sig.tone}
          icon={sig.icon}
          title={sig.title}
          onDismiss={sig.dismissible && canEdit ? () => dismiss(sig.key) : undefined}
        >
          {sig.summary}
          <span style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }} className='flex flex-wrap items-center'>
            <NeutralSubdueButton
              variant='outline'
              size='sm'
              leadingIcon={expanded === sig.key ? 'expand_less' : 'expand_more'}
              onClick={() => setExpanded(expanded === sig.key ? '' : sig.key)}
            >
              {expanded === sig.key ? 'ซ่อนรายละเอียด' : `ดูรายละเอียด ${sig.details.length} รายการ`}
            </NeutralSubdueButton>
            {sig.action ? (
              <span style={{ marginLeft: 'var(--dim-space-200, 8px)' }}>
                <NeutralSubdueButton variant='outline' size='sm' leadingIcon='open_in_new' onClick={sig.action.onClick}>
                  {sig.action.label}
                </NeutralSubdueButton>
              </span>
            ) : null}
            {!sig.dismissible ? (
              <span style={{ marginLeft: 'var(--dim-space-200, 8px)', ...PANEL_LABEL_STYLE }}>
                คำเตือนนี้ปิดไม่ได้ — ต้องแก้ไขใบสั่งยาก่อนจึงจะหายไป
              </span>
            ) : null}
          </span>
          {expanded === sig.key ? (
            <span className='flex flex-col w-full' style={{ display: 'block', marginTop: 'var(--dim-space-200, 8px)' }}>
              {sig.details.map((d, i) => (
                <span key={i} style={{ display: 'block', marginTop: 'var(--dim-space-100, 4px)' }}>
                  <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{d.head}</span> — {d.body}
                </span>
              ))}
            </span>
          ) : null}
        </PanelAlert>
      ))}

      {blockingSignals.length > 0 ? (
        <PanelAlert tone='error' icon='lock' title='ใบสั่งยานี้ถูกกันไม่ให้ส่งต่อ'>
          มีคำเตือนระดับรุนแรงที่ตั้งค่าไว้เป็น "บล็อก" ({blockingSignals.map((s) => s.title).join(' · ')}) —
          แก้ไขรายการยาก่อน หรือปรับเกณฑ์ที่หน้าตั้งค่าชุดคำสั่ง (แท็บเกณฑ์การแจ้งเตือน CDSS)
        </PanelAlert>
      ) : null}

      {/* การ์ด "รายละเอียดคำสั่งยาและการตรวจสอบความปลอดภัย" ถูกเอาออกทั้งใบ
          31 ส.ค. 69 (มติผู้ใช้) — ตารางยาในนี้เป็นรายการชุดเดียวกับตารางหลักของ
          ขั้นสั่งการรักษาที่อยู่เหนือขึ้นไป ต่างกันแค่รูปแบบการแสดง (ชุดคำสั่ง ·
          ลักษณะการสั่ง · สรุปยอดเงิน) · โค้ดของบล็อกนี้ถูกลบทิ้ง แต่ตัวช่วยที่มัน
          ใช้ (`orderSets` · `money` · `rows` · ReasonDialog หยุดยา/ยกเลิก) ยังอยู่
          และแถบเตือน CDSS ด้านบนยังทำงานเหมือนเดิม */}

      {/* หยุดยา — บังคับเหตุผล ไม่ลบแถว */}
      <ReasonDialog
        open={!!stopTarget}
        type='warning'
        title={`หยุดยา — ${stopTarget?.name || ''}`}
        description='ระบบจะขีดฆ่ารายการนี้ไว้พร้อมเหตุผลและเวลา ไม่ลบออกจากใบสั่งยา เพื่อคงร่องรอยการรักษา'
        confirmLabel='ยืนยันการหยุดยา'
        suggestions={[
          'ผู้รับบริการมีผลข้างเคียงจากยาชนิดนี้',
          'อาการดีขึ้นแล้ว ไม่จำเป็นต้องใช้ยาต่อ',
          'เปลี่ยนเป็นยากลุ่มอื่นที่เหมาะสมกว่า',
          'ซ้ำซ้อนกับยาเดิมที่ผู้รับบริการใช้อยู่แล้ว',
        ]}
        onConfirm={doStop}
        onClose={() => setStopTarget(null)}
      />

      {/* ยกเลิกคำสั่งยา */}
      <ReasonDialog
        open={!!cancelTarget}
        type='destructive'
        title={`ยกเลิกคำสั่งยา — ${cancelTarget?.name || ''}`}
        description='รายการจะถูกขีดฆ่าไว้ในตารางพร้อมเหตุผล ไม่ลบทิ้ง และเหตุผลจะถูกบันทึกในประวัติการแก้ไข'
        confirmLabel='ยืนยันการยกเลิก'
        suggestions={[
          'สั่งผิดรายการ — จะสั่งรายการที่ถูกต้องแทน',
          'ผู้รับบริการปฏิเสธการใช้ยาชนิดนี้',
          'ระบบแจ้งเตือนปฏิกิริยาระหว่างยา จึงยกเลิกรายการนี้',
          'สิทธิการรักษาไม่ครอบคลุมและผู้รับบริการไม่ประสงค์ชำระเอง',
        ]}
        onConfirm={doCancel}
        onClose={() => setCancelTarget(null)}
      />

      {/* ยืนยันซ้ำสำหรับยาความเสี่ยงสูง */}
      <AlertDialog
        open={!!confirmHighAlert}
        type='warning'
        title='ยืนยันการสั่งยาความเสี่ยงสูง'
        description={confirmHighAlert
          ? `${confirmHighAlert.name} เป็นยาความเสี่ยงสูง / ยาควบคุม — ยืนยันว่าตรวจสอบขนาดยาและข้อบ่งชี้ซ้ำแล้ว`
          : ''}
        confirmLabel='ยืนยันการสั่ง'
        cancelLabel='กลับไปแก้ไข'
        onConfirm={() => {
          patchRow(confirmHighAlert.id, { highAlertConfirmed: true });
          appendAudit({
            hn, visitId: form?.visitId, category: 'medrec',
            field: `ยืนยันการสั่งยาความเสี่ยงสูง — ${confirmHighAlert.name}`,
            oldValue: 'ยังไม่ยืนยัน', newValue: 'ยืนยันโดยผู้สั่ง',
          });
          setConfirmHighAlert(null);
        }}
        onCancel={() => setConfirmHighAlert(null)}
        onClose={() => setConfirmHighAlert(null)}
      />

      {/* แสดงรายละเอียดรายการเดียว (การกระทำ "แสดง") */}
      <AlertDialog
        open={!!detailRow}
        type='info'
        title={`รายละเอียดคำสั่งยา — ${detailRow?.name || ''}`}
        description=''
        confirmLabel='ปิด'
        showCancel={false}
        onConfirm={() => setDetailRow(null)}
        onClose={() => setDetailRow(null)}
      >
        {detailRow ? (
          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200, 8px)' }}>
            <span style={PANEL_VALUE_STYLE}>
              {summariseSig(detailRow.sigDetail, { dosePerTake: detailRow.dosePerTake, unit: detailRow.unit })
                || `ครั้งละ ${detailRow.dosePerTake || '—'} ${detailRow.unit || 'เม็ด'} · ${detailRow.frequency || '—'} · ${detailRow.when || '—'}`}
            </span>
            <span style={PANEL_LABEL_STYLE}>ผู้บันทึก: {detailRow.editor || '—'}</span>
            <span style={PANEL_LABEL_STYLE}>ข้อบ่งใช้: {detailRow.purpose || '—'}</span>
            <span style={PANEL_LABEL_STYLE}>คำเตือน: {detailRow.warning || '—'}</span>
            <span style={PANEL_LABEL_STYLE}>เหตุผลการสั่งใช้: {detailRow.prescribingReason || '—'}</span>
            <span style={PANEL_LABEL_STYLE}>หมายเหตุถึงเภสัชกร: {detailRow.sigDetail?.pharmacistNote || '—'}</span>
            {detailRow.discontinuedAt
              ? <CancelledMark at={detailRow.discontinuedAt} reason={detailRow.discontinueReason} label='หยุดยาแล้ว' />
              : null}
            {detailRow.cancelledAt
              ? <CancelledMark at={detailRow.cancelledAt} reason={detailRow.cancelReason} label='ยกเลิกคำสั่งยา' />
              : null}
            {getRegistryDrug(detailRow.name)?.highAlert && !detailRow.highAlertConfirmed ? (
              <GuardedAction allowed={canEdit} reason={NO_EDIT_RIGHT_TOOLTIP}>
                <BrandButton
                  variant='outline'
                  size='sm'
                  leadingIcon='verified'
                  onClick={() => { setDetailRow(null); setConfirmHighAlert(detailRow); }}
                >
                  ยืนยันการสั่งยาความเสี่ยงสูง
                </BrandButton>
              </GuardedAction>
            ) : null}
          </div>
        ) : null}
      </AlertDialog>

      {/* วิธีใช้ยาแบบละเอียด + เครื่องคำนวณขนาดยา (§1.5.4.3/.4/.6/.7/.9/.11/.12).
          แยกเป็น dialog ของโมดูลนี้แทนการแก้ AddMedicationPopup ซึ่งเป็น
          component กลางที่คลินิก NCD ใช้ร่วม — แท็บ "ทั่วไป" ของ popup เดิม
          จึงทำงานเหมือนเดิมทุกประการ */}
      <MedicationSigDetailPanel
        open={!!sigRow}
        row={sigRow}
        weightKg={weightKg}
        canEdit={canEdit}
        hn={hn}
        visitId={form?.visitId}
        onClose={() => setSigRow(null)}
        onConfirm={(patch) => patchRow(sigRow.id, patch)}
      />
    </div>
  );
};

export default MedicationCdssPanel;
