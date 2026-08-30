import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import QueuePageShell from '@/templates/QueuePageShell';
import SYSTEM_NAV from '@/pages/system/systemNav';
import Table from '@/components/table/Table';
import InputField from '@/components/forms/InputField';
import Dropdown from '@/components/forms/Dropdown';
import Switch from '@/components/switch/Switch';
import Checkbox from '@/components/checkbox/Checkbox';
import TabPill, { TabBar } from '@/components/tab/TabPill';
import Popup from '@/components/popup/Popup';
import BrandPrimaryButton from '@/components/button/BrandPrimaryButton';
import NeutralSubdueButton from '@/components/button/NeutralSubdueButton';
import BrandSubdueButton from '@/components/button/BrandSubdueButton';
import Icon from '@/components/icons/Icon';
import Barcode128 from '@/components/lab/Barcode128';
import { useActiveCenter } from '@/pages/users/usersShared';
import ColorfulBadge from '@/components/badge/ColorfulBadge';
import {
  QueueCenterSubNav,
  SectionCard,
  FieldLabel,
  HelperText,
  PAGE_BODY_STYLE,
  CARD_STYLE,
} from './queueCenterShared';
import { QUEUE_STATIONS } from '@/data/queueCenterStore';

/* ประเภทตู้มีสองแบบเท่านั้น — ตู้กดคิว · ตู้ชำระเงิน (มติผู้ใช้ 31 ส.ค. 69)
   เดิมโมดูลนี้เรียกของสิ่งเดียวกันด้วยสามชื่อ: "จุดประสงค์ กดเพื่อรับคิว/กดเพื่อ
   ชำระเงิน" ในฟอร์มตู้ · "ตู้กดคิว/ตู้ชำระเงิน" ในหน้าตั้งค่าตู้ Kiosk · และชื่อ
   ตู้ที่ระบบสร้างให้ใช้คำว่า "ตู้รับคิว" อีกคำ ตอนนี้เหลือชุดเดียว `KIOSK_TYPES`
   ใช้ร่วมกันทุกที่ ค่า `queue`/`payment` เท่าเดิม ข้อมูลเก่าจึงอ่านต่อได้ */
const KIOSK_TYPES = [
  { value: 'queue', label: 'ตู้กดคิว', icon: 'kiosk' },
  { value: 'payment', label: 'ตู้ชำระเงิน', icon: 'payments' },
];

const kioskTypeLabel = (value) => KIOSK_TYPES.find((t) => t.value === value)?.label ?? '—';

/* รหัสจอเขียนทรงเดียวกับรหัสตู้ (K-01 · P-01) เพื่อให้ทะเบียนสองใบอ่านเป็น
   ระบบเดียวกัน — D = Display (มติผู้ใช้ 31 ส.ค. 69) */
/* รูปแบบการวางคิวบนจอ (มติผู้ใช้ 31 ส.ค. 69) — จอโถงรวมแสดงหลายจุดบริการพร้อมกัน
   จึงต้องแบ่งคอลัมน์ ส่วนจอประจำห้องตรวจแสดงคิวเดียวเต็มจอ ตั้งแยกรายจอเพราะแต่ละ
   จุดติดตั้งมีขนาดจอและจำนวนจุดบริการไม่เท่ากัน */
/* ข้อมูลที่จะแสดงบนจอเรียกคิว (มติผู้ใช้ 31 ส.ค. 69) — ล้อกับ "ข้อมูลที่ต้องการ
   แสดงบนใบคิว" ของตู้บริการ ต่างกันตรงที่จอเป็นสื่อสาธารณะ ชื่อผู้รับบริการจึงต้อง
   ปิดบังบางส่วนตาม PDPA ไม่มีตัวเลือกให้แสดงเต็ม
   ช่องที่ `required` คือแกนของจอ ปิดแล้วจอไม่เหลือหน้าที่ของตัวเอง */
const SCREEN_FIELDS = [
  { key: 'queueNumber',  label: 'เลขคิวที่กำลังเรียก', required: true },
  { key: 'stationName',  label: 'ชื่อคลินิก / จุดบริการ', required: true },
  { key: 'siteHeader',   label: 'โลโก้และชื่อศูนย์' },
  { key: 'patientName',  label: 'ชื่อผู้รับบริการ (ปิดบังบางส่วน)' },
  { key: 'counter',      label: 'ช่อง / ห้องที่ต้องไป' },
  { key: 'nextQueues',   label: 'คิวถัดไป 3 คิว' },
  { key: 'waitingCount', label: 'จำนวนคิวคงเหลือ' },
  { key: 'clock',        label: 'วัน-เวลาปัจจุบัน' },
  { key: 'ticker',       label: 'ข้อความประชาสัมพันธ์ (วิ่งด้านล่าง)' },
];

const SCREEN_FIELD_DEFAULTS = {
  queueNumber: true, stationName: true, siteHeader: true, patientName: false,
  counter: true, nextQueues: true, waitingCount: true, clock: true, ticker: false,
};

/* โทนเสียงประกาศเรียกคิว (มติผู้ใช้ 31 ส.ค. 69) — เดิมมีแค่หญิง/ชาย ซึ่งบอกแค่เพศ
   ไม่ได้บอก "อารมณ์" ของเสียง ที่หน้างานต่างกันจริง: โถงรวมเสียงดังฟังชัดต้องมาก่อน
   ส่วนคลินิกสุขภาพจิต/ผู้สูงอายุต้องการเสียงนุ่มช้า `rate`/`pitch` คือค่าที่ส่งให้
   SpeechSynthesis จริง ไม่ใช่ป้ายเฉย ๆ */
const VOICE_TONES = [
  { value: 'female',      label: 'เสียงผู้หญิง',        gender: 'female', rate: 0.90, pitch: 1.20 },
  { value: 'male',        label: 'เสียงผู้ชาย',         gender: 'male',   rate: 0.90, pitch: 0.78 },
  { value: 'soft-female', label: 'นุ่มนวล (หญิง)',      gender: 'female', rate: 0.80, pitch: 1.05 },
  { value: 'soft-male',   label: 'นุ่มนวล (ชาย)',       gender: 'male',   rate: 0.80, pitch: 0.85 },
  { value: 'clear',       label: 'ชัดถ้อยชัดคำ (โถงรวม)', gender: 'female', rate: 0.72, pitch: 1.00 },
  { value: 'brisk',       label: 'กระชับ (คิวหนาแน่น)',  gender: 'female', rate: 1.05, pitch: 1.15 },
];

const VOICE_TONE_BY_VALUE = Object.fromEntries(VOICE_TONES.map((v) => [v.value, v]));

/* ขนาดจอที่ติดตั้งจริง (มติผู้ใช้ 31 ส.ค. 69) — ทุกขนาดเป็น 16:9 เหมือนกัน แต่
   ขนาดนิ้วเป็นตัวกำหนดว่าตัวอักษรบนจอใหญ่พอให้อ่านจากระยะยืนรอหรือไม่ พรีวิวจึง
   ปรับสเกลตัวหนังสือตามขนาดที่เลือก (จอเล็ก = ตัวอักษรบนพรีวิวย่อลงตามสัดส่วนจริง) */
const SCREEN_SIZES = [
  { value: 32, label: '32 นิ้ว (16:9)', scale: 0.85 },
  { value: 43, label: '43 นิ้ว (16:9)', scale: 0.95 },
  { value: 44, label: '44 นิ้ว (16:9)', scale: 1 },
  { value: 55, label: '55 นิ้ว (16:9)', scale: 1.1 },
  { value: 65, label: '65 นิ้ว (16:9)', scale: 1.2 },
  { value: 75, label: '75 นิ้ว (16:9)', scale: 1.3 },
];

const MONITOR_LAYOUTS = [
  /* เรียกตามสิ่งที่คนตั้งค่าคิดถึงจริง คือ "จอนี้แสดงกี่คลินิก" ไม่ใช่จำนวนคอลัมน์
     ซึ่งเป็นวิธีวางเลย์เอาต์ (มติผู้ใช้ 31 ส.ค. 69) — ค่าเก็บเป็นตัวเลขเท่าเดิม */
  { value: 1, label: '1 คลินิก' },
  { value: 2, label: '2 คลินิก' },
  { value: 3, label: '3 คลินิก' },
  { value: 4, label: '4 คลินิก' },
];

const monitorNumberLabel = (number) => `D-${String(number ?? 0).padStart(2, '0')}`;

/* ขนาดกระดาษมาตรฐานของเครื่องพิมพ์ใบคิว — เรียกด้วยชื่อกระดาษที่คนหน้างานใช้จริง
   แล้วต่อท้ายด้วยความกว้าง (มติผู้ใช้ 31 ส.ค. 69) เดิมมีแต่ตัวเลข "58 มม." ซึ่งคน
   ที่ไม่ได้ดูแลเครื่องพิมพ์เดาไม่ออกว่าเลือกอันไหนถึงจะได้กระดาษแบบที่ตู้ใส่อยู่

     58 / 80 มม. = ม้วนกระดาษความร้อน (thermal) สองขนาดที่ตู้คิวใช้กันเป็นมาตรฐาน
     76 มม.      = กระดาษสลิปของเครื่องพิมพ์หัวเข็ม (dot matrix) ที่ยังใช้ที่จุดการเงิน
     A5 / A4     = กระดาษแผ่นสำหรับเครื่องพิมพ์ทั่วไป เผื่อจุดที่พิมพ์ใบคิวรวมทั้งแผ่น

   ค่า `value` เดิม ('58mm' · '80mm' · 'a4') คงไว้ ข้อมูลตู้ที่ตั้งไว้แล้วจึงไม่เพี้ยน */
const TICKET_SIZES = [
  { value: '58mm', label: 'สลิปความร้อน 58 มม.' },
  { value: '76mm', label: 'สลิปหัวเข็ม 76 มม.' },
  { value: '80mm', label: 'ใบเสร็จความร้อน 80 มม.' },
  { value: 'a5',   label: 'A5 (148 มม.)' },
  { value: 'a4',   label: 'A4 (210 มม.)' },
];

/* คลินิก/แผนกของศูนย์ — แตกจากเดิมที่ยุบคลินิกเฉพาะทางสิบกว่าจุดไว้ในบรรทัดเดียว
   ว่า "กลุ่มคลินิกเฉพาะทาง" (มติผู้ใช้ 31 ส.ค. 69) เลือกแผนกแล้วดรอปดาวน์จุดบริการ
   จึงเหลือตัวเลือกที่เกี่ยวข้องจริง ไม่ใช่รายการยาวสิบรายการที่ต้องไล่หา */
const ORGANIZATION_UNITS = [
  { value: 'registration',  label: 'งานเวชระเบียนและคัดกรอง',        stationIds: ['st-screening'] },
  { value: 'opd',           label: 'แผนกผู้ป่วยนอก (OPD)',           stationIds: ['st-opd'] },
  { value: 'mch',           label: 'งานอนามัยแม่และเด็ก',            stationIds: ['st-anc', 'st-family'] },
  { value: 'pediatrics',    label: 'คลินิกกุมารเวชกรรม',             stationIds: ['st-ped'] },
  { value: 'elderly',       label: 'คลินิกผู้สูงอายุ',                stationIds: ['st-elderly'] },
  { value: 'ncd',           label: 'คลินิกโรคเรื้อรัง (NCD)',        stationIds: ['st-ncd'] },
  { value: 'mental',        label: 'คลินิกสุขภาพจิต',                stationIds: ['st-mental'] },
  { value: 'dental',        label: 'คลินิกทันตกรรม',                 stationIds: ['st-dental'] },
  { value: 'tb',            label: 'คลินิกวัณโรค',                   stationIds: ['st-tb'] },
  { value: 'immunization',  label: 'งานสร้างเสริมภูมิคุ้มกันโรค',      stationIds: ['st-vaccine'] },
  { value: 'diagnostics',   label: 'งานชันสูตรและรังสีวิทยา',         stationIds: ['st-lab', 'st-xray'] },
  { value: 'rehab',         label: 'งานเวชศาสตร์ฟื้นฟูและกายภาพบำบัด', stationIds: ['st-physio'] },
  { value: 'finance',       label: 'แผนกการเงิน',                    stationIds: ['st-finance'] },
  { value: 'pharmacy',      label: 'แผนกเภสัชกรรม',                  stationIds: ['st-pharmacy'] },
];

/* ชั้นที่ติดตั้งตู้ได้ทั้งอาคาร — เดิมดรอปดาวน์นี้มีตัวเลือกเดียวคือชั้นของจุดบริการ
   ที่เลือก จึงไม่ได้ทำหน้าที่เป็นดรอปดาวน์เลย ทั้งที่ตู้ของจุดบริการหนึ่งอาจตั้งอยู่
   คนละชั้นกับห้องตรวจ (เช่น ตู้กดคิวรวมที่โถงชั้น 1) — มติผู้ใช้ 31 ส.ค. 69 */
const FLOOR_OPTIONS = [
  { value: 'ชั้นใต้ดิน (B1)', label: 'ชั้นใต้ดิน (B1)' },
  { value: 'ชั้น 1', label: 'ชั้น 1' },
  { value: 'ชั้น 2', label: 'ชั้น 2' },
  { value: 'ชั้น 3', label: 'ชั้น 3' },
  { value: 'ชั้น 4', label: 'ชั้น 4' },
  { value: 'ชั้น 5', label: 'ชั้น 5' },
];

const stationsForUnit = (unitId) => {
  const unit = ORGANIZATION_UNITS.find((item) => item.value === unitId);
  return QUEUE_STATIONS.filter((station) => unit?.stationIds.includes(station.id));
};

const organizationLabel = (unitId) => ORGANIZATION_UNITS.find((item) => item.value === unitId)?.label || '—';
const stationLabel = (stationId) => QUEUE_STATIONS.find((station) => station.id === stationId)?.label || '—';
const kioskStationLabel = (stationId) => ({
  'st-screening': 'ซักประวัติ',
  'st-finance': 'การเงิน',
}[stationId] || stationLabel(stationId));

const DISPLAY_FIELDS = [
  { key: 'queueNumber', label: 'เลขคิว', required: true },
  { key: 'waitingAhead', label: 'ผู้รอคิวก่อนหน้า' },
  { key: 'issuedDate', label: 'วันที่' },
  { key: 'issuedTime', label: 'เวลา' },
  { key: 'patientName', label: 'ชื่อ–นามสกุลผู้รับบริการ', required: true },
  { key: 'contact', label: 'ติดต่อ' },
  { key: 'hn', label: 'เลข HN', required: true },
  { key: 'hnBarcode', label: 'Barcode HN', required: true },
  { key: 'servicePoint', label: 'จุดให้บริการ', required: true },
  { key: 'serviceStep', label: 'จุดที่ต้องติดต่อ', required: true },
  { key: 'statusQr', label: 'QR Code สำหรับดูสถานะคิวออนไลน์', required: true },
  { key: 'callOrderNote', label: 'ข้อความ “ลำดับการเรียกคิวไม่เรียงตามหมายเลข”', required: true },
  { key: 'kioskNumber', label: 'รหัสตู้' },
  { key: 'kioskName', label: 'ชื่อตู้' },
  { key: 'location', label: 'ตำแหน่งที่ตั้ง' },
  { key: 'floor', label: 'ชั้น' },
];

const TOR_DISPLAY_DEFAULTS = {
  queueNumber: true, patientName: true, hn: true, hnBarcode: true,
  servicePoint: true, serviceStep: true, statusQr: true, callOrderNote: true,
};

const TICKET_DISPLAY_DEFAULTS = {
  ...TOR_DISPLAY_DEFAULTS,
  waitingAhead: true,
  issuedDate: true,
  issuedTime: true,
  contact: true,
};

/* รูปแบบเลขคิวที่ตู้จะออกให้ (มติผู้ใช้ 31 ส.ค. 69) — แต่ละศูนย์เรียกคิวคนละแบบ
   บางที่ใช้อักษรหมวดนำหน้า บางที่ใช้เลขล้วน และจำนวนหลักก็ไม่เท่ากันเมื่อคิวต่อวัน
   เยอะกว่าพันคิว ตั้งแยกตามประเภทตู้ได้ เพราะตู้กดคิวกับตู้ชำระเงินมักคนละหมวด

   `build(prefix, n)` เป็นตัวสร้างเลขจริง หน้าตัวอย่างและป้ายในดรอปดาวน์ใช้ตัวเดียว
   กัน ป้ายที่เห็นจึงเป็นผลลัพธ์จริงเสมอ ไม่ใช่ข้อความที่พิมพ์ไว้แล้วลืมแก้ */
const QUEUE_NUMBER_FORMATS = [
  { value: 'letter-dash-3',  desc: 'อักษรหมวด-เลข 3 หลัก', usesPrefix: true, build: (p, n) => `${p}-${String(n).padStart(3, '0')}` },
  { value: 'letter-3',       desc: 'อักษรหมวดติดเลข 3 หลัก', usesPrefix: true, build: (p, n) => `${p}${String(n).padStart(3, '0')}` },
  { value: 'letter-space-3', desc: 'อักษรหมวด เว้นวรรค เลข 3 หลัก', usesPrefix: true, build: (p, n) => `${p} ${String(n).padStart(3, '0')}` },
  { value: 'letter-dash-4',  desc: 'อักษรหมวด-เลข 4 หลัก', usesPrefix: true, build: (p, n) => `${p}-${String(n).padStart(4, '0')}` },
  /* ไอคอน + ตัวเลข — ศูนย์ที่แยกคิวเช้า/บ่ายด้วยรูปแทนตัวอักษร (เลขคิวเริ่มนับใหม่
     ทุกช่วง เลข 042 ใบเช้ากับใบบ่ายจึงซ้ำกันได้) รูปแบบไม่ระบุว่าเป็นไอคอนอะไร
     (มติผู้ใช้ 31 ส.ค. 69) — ระบบเลือกให้เองจากเวลาที่ออกบัตร ก่อนเที่ยง ☀
     หลังเที่ยง ☾ คนตั้งค่าจึงเลือกแค่ "ทรง" ของเลขคิวเหมือนกลุ่มอักษรหมวด
     ใช้อักขระ ☀/☾ ไม่ใช่ไอคอนของเว็บ เพราะเครื่องพิมพ์ความร้อนพิมพ์ตัวอักษร */
  { value: 'icon-dash-3',   desc: 'ไอคอน-เลข 3 หลัก', icon: true, build: (p, n, sym) => `${sym}-${String(n).padStart(3, '0')}` },
  { value: 'icon-3',        desc: 'ไอคอนติดเลข 3 หลัก', icon: true, build: (p, n, sym) => `${sym}${String(n).padStart(3, '0')}` },
  { value: 'icon-space-3',  desc: 'ไอคอน เว้นวรรค เลข 3 หลัก', icon: true, build: (p, n, sym) => `${sym} ${String(n).padStart(3, '0')}` },
  { value: 'icon-dash-4',   desc: 'ไอคอน-เลข 4 หลัก', icon: true, build: (p, n, sym) => `${sym}-${String(n).padStart(4, '0')}` },
  { value: 'icon-letter-3', desc: 'ไอคอน + อักษรหมวด-เลข 3 หลัก', icon: true, usesPrefix: true, build: (p, n, sym) => `${sym} ${p}-${String(n).padStart(3, '0')}` },
  /* อักษรไทย — ดู THAI_LETTERS ด้านล่างสำหรับที่มาของตัวอักษร */
  { value: 'thai-dash-3',  desc: 'อักษรไทย-เลข 3 หลัก', usesPrefix: true, build: (p, n) => `${toThaiPrefix(p)}-${String(n).padStart(3, '0')}` },
  { value: 'thai-3',       desc: 'อักษรไทยติดเลข 3 หลัก', usesPrefix: true, build: (p, n) => `${toThaiPrefix(p)}${String(n).padStart(3, '0')}` },
  { value: 'thai-dash-4',  desc: 'อักษรไทย-เลข 4 หลัก', usesPrefix: true, build: (p, n) => `${toThaiPrefix(p)}-${String(n).padStart(4, '0')}` },
  /* เลขล้วนอยู่ท้ายสุด — เป็นแบบที่ตัดข้อมูลออกมากที่สุด จึงไม่ควรมาแย่งแถวที่
     มองเห็นทันทีในดรอปดาวน์จากรูปแบบที่มีไอคอน (มติผู้ใช้ 31 ส.ค. 69) */
  { value: 'digits-3',     desc: 'เลขล้วน 3 หลัก', build: (p, n) => String(n).padStart(3, '0') },
];

/* อักษรไทยประจำหมวดคิว (มติผู้ใช้ 31 ส.ค. 69) — ศูนย์ที่ประกาศคิวเป็นภาษาไทย
   ต้องการบัตรเป็น "ก-012" ไม่ใช่ "A-012" ทะเบียนจุดบริการเก็บอักษรเป็นละติน
   (A · B · S · F …) จึงแมปตามลำดับตัวอักษร A→ก B→ข C→ค … ให้ผลนิ่งและเดาได้
   ถ้าตั้งโหมด "ใช้ตัวอักษรเดียวกันทุกคลินิก" แล้วพิมพ์อักษรไทยมาเองก็ใช้ตัวนั้นเลย */
const THAI_LETTERS = 'กขคงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝ';

const toThaiPrefix = (prefix) => {
  const first = String(prefix || '').charAt(0);
  if (!first) return THAI_LETTERS[0];
  /* พิมพ์อักษรไทยมาเองแล้ว — ไม่ต้องแมปซ้ำ */
  if (/[\u0E00-\u0E7F]/.test(first)) return first;
  const idx = first.toUpperCase().charCodeAt(0) - 65;
  return THAI_LETTERS[idx] ?? THAI_LETTERS[0];
};

/** สัญลักษณ์ช่วงเวลาของรูปแบบกลุ่มไอคอน — ก่อนเที่ยงพระอาทิตย์ หลังเที่ยงดวงจันทร์ */
const sessionSymbol = (hour = 9) => (hour < 12 ? '☀' : '☾');

/* บนบัตรตัวอย่างวาดเป็นรูปจริง ไม่ใช่อักขระ ☀ — อักขระตัวนี้ฟอนต์ Sarabun ไม่มี
   เบราว์เซอร์จึงตกไปใช้ฟอนต์สำรองแล้วออกมาจิ๋วจนดูเหมือนไม่ได้เปลี่ยนอะไร และวาด
   เป็น SVG ในไฟล์นี้เอง ไม่พึ่ง ligature ของ Material Symbols เพราะถ้าฟอนต์ไอคอน
   ยังโหลดไม่เสร็จจะโผล่เป็นคำว่า "wb_sunny" คาบัตร (มติผู้ใช้ 31 ส.ค. 69)
   ตัวที่ส่งไปพิมพ์ลงกระดาษยังเป็นอักขระ ☀/☾ เหมือนเดิม */
const SessionGlyph = ({ hour = 9, size = 36 }) => (hour < 12 ? (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' aria-hidden>
    <circle cx='12' cy='12' r='4.2' />
    <path d='M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6' />
  </svg>
) : (
  <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden>
    <path d='M20 14.5A8.2 8.2 0 0 1 9.5 4 8.2 8.2 0 1 0 20 14.5z' />
  </svg>
));

const formatUsesIcon = (formatValue) => !!QUEUE_NUMBER_FORMAT_BY_VALUE[formatValue]?.icon;

const QUEUE_NUMBER_FORMAT_BY_VALUE = Object.fromEntries(QUEUE_NUMBER_FORMATS.map((f) => [f.value, f]));

/* อักษรหมวดคิว — TOR 1.3.2.1 ให้ออกคิวแยกตามประเภทบริการ แต่ละคลินิกจึงมีอักษร
   ของตัวเองอยู่แล้วใน QUEUE_STATIONS (`prefix`) บางศูนย์กลับอยากใช้ตัวเดียวกัน
   ทั้งศูนย์แล้วแยกด้วยจุดบริการบนบัตรแทน จึงเลือกได้สองโหมด (มติผู้ใช้ 31 ส.ค. 69) */
const PREFIX_MODES = [
  /* "ใช้ตัวอักษรเดียวกัน" ขึ้นก่อน (มติผู้ใช้ 31 ส.ค. 69) — เป็นตัวเลือกที่ตั้งค่า
     ง่ายกว่าและศูนย์ส่วนใหญ่เริ่มจากแบบนี้ ส่วนแบบรายคลินิกเป็นการตั้งละเอียด */
  { value: 'shared',     label: 'ใช้ตัวอักษรเดียวกันทุกคลินิก' },
  { value: 'per-clinic', label: 'ใช้อักษรของแต่ละคลินิก (ตามทะเบียนจุดบริการ)' },
];

/* รูปแบบนี้ใช้อักษรหมวดหรือไม่ — 'เลขล้วน' และรูปแบบสัญลักษณ์ล้วนไม่ใช้ ช่อง
   ตั้งค่าอักษรหมวดจึงไม่ต้องขึ้นให้ตั้งค่าค้างไว้โดยไม่มีผลกับบัตร */
const formatUsesPrefix = (formatValue) => !!QUEUE_NUMBER_FORMAT_BY_VALUE[formatValue]?.usesPrefix;

const buildQueueCode = (formatValue, prefix, serial, symbol = '☀') => (
  QUEUE_NUMBER_FORMAT_BY_VALUE[formatValue] ?? QUEUE_NUMBER_FORMATS[0]
).build(prefix, serial, symbol);



/* ตัวอย่างที่ใช้ทั้งในดรอปดาวน์และบนบัตร — อักษรหมวดกับเลขรันของแต่ละประเภทตู้ */
const QUEUE_SAMPLE = {
  queue:   { stationId: 'st-opd',     serial: 42, fallbackPrefix: 'A' },
  payment: { stationId: 'st-finance', serial: 16, fallbackPrefix: 'F' },
};

/** อักษรหมวดที่จะใช้จริง — ตามคลินิก หรือตัวเดียวกันทั้งศูนย์ */
const resolvePrefix = (settings, stationId, fallback) => {
  if (settings.prefixMode === 'shared') return (settings.sharedPrefix || fallback).toUpperCase();
  /* ตั้งรายคลินิกได้ (มติผู้ใช้ 31 ส.ค. 69) — ที่ตั้งเองชนะค่าในทะเบียนจุดบริการ
     ยังไม่ได้ตั้งก็ตกไปใช้ `prefix` ของทะเบียนตามเดิม */
  return settings.prefixByStation?.[stationId]
    || QUEUE_STATIONS.find((st) => st.id === stationId)?.prefix
    || fallback;
};

const createTicketSettings = (sharedPrefix = 'A') => ({
  ticketSize: '80mm',
  numberFormat: 'letter-dash-3',
  /* ค่าเริ่มต้น = ใช้ตัวอักษรเดียวกันทุกคลินิก (มติผู้ใช้ 31 ส.ค. 69) — รายการ
     อักษรรายคลินิกเป็นข้อมูลยาว 15 บรรทัด จึงขึ้นเฉพาะตอนผู้ใช้เลือกโหมดนั้นจริง
     ไม่ใช่กางค้างไว้ตั้งแต่เปิดหน้า */
  prefixMode: 'shared',
  /* { [stationId]: 'A' } — ว่าง = ใช้อักษรจากทะเบียนจุดบริการ */
  prefixByStation: {},
  sharedPrefix,
  displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true },
});

const INITIAL_MONITORS = [
  { id: 'monitor-1', number: 1, name: 'จอที่ 1', location: 'โถงชั้น 1', floor: 'ชั้น 1', displayId: 'DISPLAY-01', layout: 3, screenFields: { ...SCREEN_FIELD_DEFAULTS }, stationIds: ['st-screening', 'st-opd', 'st-lab', 'st-finance', 'st-pharmacy'] },
  { id: 'monitor-2', number: 2, name: 'จอที่ 2', location: 'หน้าห้องตรวจ ชั้น 2', floor: 'ชั้น 2', displayId: 'DISPLAY-02', layout: 1, screenFields: { ...SCREEN_FIELD_DEFAULTS, nextQueues: false }, stationIds: ['st-ped', 'st-elderly', 'st-ncd'] },
  { id: 'monitor-3', number: 3, name: 'จอที่ 3', location: 'โถงอาคารบริการ', floor: 'ชั้น 1', displayId: 'DISPLAY-03', layout: 2, screenFields: { ...SCREEN_FIELD_DEFAULTS }, stationIds: ['st-anc', 'st-mental', 'st-dental', 'st-tb', 'st-vaccine', 'st-family'] },
];

const INITIAL_KIOSKS = [
  {
    id: 'kiosk-01', kioskNumber: 'K-01', kioskName: 'ตู้กดคิว อาคาร A', kioskId: 'KIOSK-A-01',
    organizationUnit: 'registration', stationId: 'st-screening', floor: 'ชั้น 1', purpose: 'queue',
    ticketSize: '80mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true }, active: true,
  },
  {
    id: 'kiosk-02', kioskNumber: 'P-01', kioskName: 'ตู้ชำระเงิน อาคาร A', kioskId: 'KIOSK-A-P01',
    organizationUnit: 'finance', stationId: 'st-finance', floor: 'ชั้น 1', purpose: 'payment',
    ticketSize: '58mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: true, location: false, floor: false }, active: true,
  },
];

const blankKiosk = () => ({
  id: `kiosk-${Date.now()}`, kioskNumber: '', kioskName: '', kioskId: '', organizationUnit: '', stationId: '', floor: '', purpose: '',
  ticketSize: '80mm', displayFields: { ...TICKET_DISPLAY_DEFAULTS, kioskNumber: true, kioskName: true, kioskId: false, location: true, floor: true }, active: true,
});

/* ทุกช่องใน DISPLAY_FIELDS ต้องเห็นผลในตัวอย่างได้ด้วยตัวเอง — ติ๊กช่องเดียว
   แล้วไม่มีอะไรเปลี่ยน แปลว่าผู้ใช้ตั้งค่าโดยไม่รู้ว่าจะได้ใบคิวหน้าตาแบบไหน
   จึงแยก "ชื่อตู้ / รหัสตู้ / ตำแหน่งที่ตั้ง / ชั้น" เป็นตัวอย่างคนละค่า
   และให้ QR เป็นบรรทัดของตัวเอง ไม่ห้อยท้ายขั้นตอนรับบริการ */
const joinParts = (parts) => parts.filter(Boolean).join(' · ');

/* ── ลำดับความสำคัญบนบัตรคิว (มติผู้ใช้ 31 ส.ค. 69) ────────────────────────
   เดิมทุกบรรทัดตัวเท่ากันหมดที่ขนาด xs ต่างกันแค่สีจาง ๆ คนที่หยิบบัตรออกจากตู้
   จึงต้องไล่อ่านทั้งใบกว่าจะเจอเลขคิว ทั้งที่บัตรคิวมีงานอยู่สองอย่างเท่านั้น คือ
   "เลขคิวของฉันคืออะไร" และ "ต้องไปที่ไหน" จัดใหม่เป็นสี่ชั้น

     1 เลขคิว        — ตัวใหญ่สุด อ่านได้จากระยะแขน (พระเอกของใบ)
     2 จุดให้บริการ   — ที่ที่ต้องไป · จุดที่ต้องติดต่อเป็นบรรทัดรองของชั้นนี้
     3 ผู้รับบริการ   — ชื่อ + HN/บาร์โค้ด กลุ่มเดียวกัน คั่นด้วยเส้นบาง
     4 ข้อมูลประกอบ  — วัน-เวลา · คิวก่อนหน้า · ติดต่อ · ตู้ที่กด ตัวเล็กสุด สีจางสุด

   ทุกช่องยังผูกกับเช็กบ็อกซ์เดิมทุกตัว ปิดช่องไหนบรรทัดนั้นหายไปทั้งบรรทัด และ
   ถ้าปิดทั้งกลุ่ม เส้นคั่นของกลุ่มนั้นก็ไม่ขึ้น จะได้ไม่เหลือเส้นลอย */

const OFFICE_HEALTH_LOGO = '/images/office-health-logo.png';

const TICKET_META_STYLE = {
  color: 'var(--text-content-tertiary)',
  fontFamily: 'var(--type-family-body)',
  fontSize: 'var(--type-size-xxs, 11px)',
  lineHeight: 1.6,
};

const TicketDivider = () => (
  <div
    aria-hidden
    style={{
      width: '100%',
      height: 1,
      background: 'var(--border-neutral-quaternary)',
      marginTop: 'var(--dim-space-300)',
      marginBottom: 'var(--dim-space-300)',
    }}
  />
);

const TicketPreview = ({ kioskType, settings }) => {
  const { label: centerName } = useActiveCenter();
  const fields = settings.displayFields;
  const isQueueKiosk = kioskType === 'queue';
  const { stationId, serial, fallbackPrefix } = QUEUE_SAMPLE[kioskType] ?? QUEUE_SAMPLE.queue;
  /* ตัวอย่างตรึงเวลา 09:30 น. ตามวัน-เวลาที่โชว์บนบัตร รูปแบบ 'อัตโนมัติ' จึงขึ้น
     พระอาทิตย์ให้เห็นผลจริง ไม่ใช่เปลี่ยนไปมาตามเวลาที่เปิดหน้าจอ */
  const symbolChar = sessionSymbol(9);
  const code = buildQueueCode(
    settings.numberFormat,
    resolvePrefix(settings, stationId, fallbackPrefix),
    serial,
    symbolChar,
  );
  /* รูปแบบกลุ่มไอคอน — ถอดอักขระออกจากสตริงแล้ววาดไอคอนแทนที่ตำแหน่งเดิม
     ตัวคั่น (- หรือเว้นวรรค) ยังอยู่ ทรงเลขคิวจึงตรงกับที่จะพิมพ์จริง */
  const codeIcon = formatUsesIcon(settings.numberFormat);
  /* จุดบริการบนบัตรอ่านจากทะเบียนจุดบริการเดียวกับที่ให้อักษรหมวด ตัวอย่างจึง
     สอดคล้องกันเสมอ (เลือกโหมด "ตามคลินิก" แล้วเห็นทั้งอักษรและชื่อของคลินิกนั้น) */
  const station = QUEUE_STATIONS.find((st) => st.id === stationId);
  const codeText = codeIcon ? code.replace(symbolChar, '') : code;
  const sample = isQueueKiosk
    ? { code: codeText, service: station?.label || 'คลินิกตรวจรักษาทั่วไป', next: 'จุดคัดกรอง', kiosk: 'K-01', kioskName: 'ตู้กดคิว ๑', location: station?.zone || 'อาคาร A', floor: station?.floor || 'ชั้น 1' }
    : { code: codeText, service: station?.label || 'จุดรับชำระเงิน', next: 'เคาน์เตอร์การเงิน', kiosk: 'P-01', kioskName: 'ตู้ชำระเงิน ๑', location: station?.zone || 'อาคาร A', floor: station?.floor || 'ชั้น 1' };
  const kioskLine = joinParts([
    fields.kioskNumber ? sample.kiosk : '',
    fields.kioskName ? sample.kioskName : '',
    fields.location ? sample.location : '',
    fields.floor ? sample.floor : '',
  ]);
  const issuedLine = joinParts([
    fields.issuedDate ? 'วันที่ 29 สิงหาคม 2569' : '',
    fields.issuedTime ? 'เวลา 09:30 น.' : '',
  ]);
  const waitingLine = joinParts([
    fields.waitingAhead ? 'ผู้รอคิวก่อนหน้า 3 ราย' : '',
    fields.contact ? 'ติดต่อ 0 2245 1000' : '',
  ]);
  /* บาร์โค้ดเป็นภาพของตัวเอง ไม่ใช่ขีดต่อท้ายบรรทัด HN (มติผู้ใช้ 31 ส.ค. 69) —
     ของเดิมพิมพ์ "|||||| ||| ||||" ต่อท้ายเลข HN ซึ่งอ่านเป็นขยะข้อความ ไม่ใช่
     บาร์โค้ด ใช้ Barcode128 ตัวเดียวกับบัตรคิวที่พิมพ์จริงแทน */
  const hnLine = fields.hn ? 'HN 67-00001' : '';

  const hasPatient = fields.patientName || hnLine || fields.hnBarcode;
  const hasService = fields.servicePoint || fields.serviceStep || fields.statusQr;
  const hasMeta = issuedLine || waitingLine || kioskLine;

  return (
    <div className='mx-auto w-full' style={{ ...CARD_STYLE, maxWidth: 360, padding: 'var(--dim-space-500)', textAlign: 'center', borderStyle: 'dashed', gap: 0 }}>
      {/* หัวบัตร — โลโก้สำนักอนามัยและชื่อศูนย์ที่ออกบัตร (มติผู้ใช้ 31 ส.ค. 69)
          บัตรที่ไม่มีชื่อหน่วยงานใช้อ้างอิงไม่ได้เลยเวลาคนถือไปถามที่จุดอื่น
          ชื่อศูนย์อ่านจากศูนย์ที่กำลังให้บริการ (useActiveCenter) ไม่ได้ hardcode
          ตัวเล็กและสีรอง เพื่อไม่ให้แย่งสายตาไปจากเลขคิวซึ่งเป็นพระเอกของใบ */}
      <div className='flex flex-col items-center' style={{ gap: 'var(--dim-space-100)' }}>
        <img
          src={OFFICE_HEALTH_LOGO}
          alt=''
          aria-hidden
          style={{ width: 32, height: 32, objectFit: 'contain' }}
        />
        <div style={{
          color: 'var(--text-content-secondary)',
          fontFamily: 'var(--type-family-body)',
          fontSize: 'var(--type-size-xs)',
          fontWeight: 'var(--type-weight-medium)',
          lineHeight: 1.4,
        }}>
          {centerName}
        </div>
        <div style={TICKET_META_STYLE}>สำนักอนามัย กรุงเทพมหานคร</div>
      </div>

      {/* 1 — เลขคิว */}
      {fields.queueNumber ? (
        <div
          className='flex items-center justify-center'
          style={{
            gap: 'var(--dim-space-200)',
            marginTop: 'var(--dim-space-100)',
            /* Sarabun เหมือนทั้งใบ (มติผู้ใช้ 31 ส.ค. 69) — ฟอนต์ graphic ของหัวเรื่อง
               ทำให้เลขคิวอ่านเป็นงานกราฟิก ไม่ใช่ตัวเลขที่ต้องอ่านเร็ว ๆ */
            fontFamily: 'var(--type-family-body)',
            fontSize: 'var(--type-size-4xl, 40px)',
            fontWeight: 'var(--type-weight-bold, 700)',
            lineHeight: 1.1,
            letterSpacing: '0.02em',
            color: 'var(--text-brandPrimary-default)',
          }}
        >
          {codeIcon ? <SessionGlyph hour={9} size={36} /> : null}
          {sample.code}
        </div>
      ) : null}

      {/* 2 — ที่ที่ต้องไป */}
      {hasService ? (
        <div className='flex flex-col' style={{ marginTop: 'var(--dim-space-300)', gap: 'var(--dim-space-050)' }}>
          {fields.servicePoint ? (
            <div style={{
              color: 'var(--text-content-primary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-base)',
              fontWeight: 'var(--type-weight-bold, 700)',
              lineHeight: 1.4,
            }}>
              {sample.service}
            </div>
          ) : null}
          {fields.serviceStep ? (
            <div style={{
              color: 'var(--text-content-secondary)',
              fontFamily: 'var(--type-family-body)',
              fontSize: 'var(--type-size-sm)',
            }}>
              จุดที่ต้องติดต่อ: {sample.next}
            </div>
          ) : null}
          {fields.statusQr ? (
            <div className='mx-auto flex flex-col items-center' style={{ marginTop: 'var(--dim-space-200)', gap: 'var(--dim-space-100)' }}>
              {/* ช่อง QR จริงกินพื้นที่บนกระดาษ — แทนด้วยกรอบขนาดจริง ไม่ใช่บรรทัดข้อความ
                  ไม่งั้นตัวอย่างจะดูสั้นกว่าใบที่พิมพ์ออกมาจริง */}
              <div
                aria-hidden
                style={{
                  /* ขยายเป็น 96px (มติผู้ใช้ 31 ส.ค. 69) — QR บนกระดาษกว้าง 58–80 มม.
                     ต้องใหญ่พอให้กล้องมือถือจับได้จากระยะถือปกติ */
                  width: 96,
                  height: 96,
                  borderRadius: 'var(--dim-radius-100, 4px)',
                  border: 'var(--dim-stroke-100) solid var(--border-neutral-tertiary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-content-quaternary)',
                }}
              >
                <Icon name='qr_code_2' size={72} />
              </div>
              <span style={TICKET_META_STYLE}>สแกนดูสถานะคิว</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 3 — ผู้รับบริการ */}
      {hasPatient ? (
        <>
          <TicketDivider />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            {fields.patientName ? (
              <div style={{
                color: 'var(--text-content-secondary)',
                fontFamily: 'var(--type-family-body)',
                fontSize: 'var(--type-size-sm)',
                fontWeight: 'var(--type-weight-medium)',
              }}>
                นายสมชาย มีสุข
              </div>
            ) : null}
            {hnLine ? <div style={TICKET_META_STYLE}>{hnLine}</div> : null}
            {fields.hnBarcode ? (
              <div className='mx-auto' style={{ marginTop: 'var(--dim-space-100)' }}>
                <Barcode128 value='6700001' height={32} moduleWidth={1.1} showText={false} />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {/* 4 — ข้อมูลประกอบ */}
      {hasMeta ? (
        <>
          <TicketDivider />
          <div className='flex flex-col' style={{ gap: 'var(--dim-space-050)' }}>
            {issuedLine ? <div style={TICKET_META_STYLE}>{issuedLine}</div> : null}
            {waitingLine ? <div style={TICKET_META_STYLE}>{waitingLine}</div> : null}
            {kioskLine ? <div style={TICKET_META_STYLE}>{kioskLine}</div> : null}
          </div>
        </>
      ) : null}

      {fields.callOrderNote ? (
        <div style={{
          marginTop: 'var(--dim-space-300)',
          paddingTop: 'var(--dim-space-300)',
          borderTop: '1px dashed var(--border-neutral-tertiary)',
          ...TICKET_META_STYLE,
        }}>
          ลำดับการเรียกคิวไม่เรียงตามหมายเลข
        </div>
      ) : null}
    </div>
  );
};

const QueueKioskSettingsPage = () => {
  const location = useLocation();
  const isTicketSettings = location.pathname === '/queue-center/ticket-settings';
  const isDisplaySettings = location.pathname === '/queue-center/display';
  /* ทะเบียนจอแสดงผล — หน้ารายการ คู่กับหน้าตั้งค่าเหมือนตู้บริการ */
  const isDisplayList = location.pathname === '/queue-center/displays';
  const [kiosks, setKiosks] = useState(INITIAL_KIOSKS);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);
  const [monitors, setMonitors] = useState(INITIAL_MONITORS);
  const [monitorSaved, setMonitorSaved] = useState(false);
  /* "ข้อมูลที่ต้องการแสดงบนจอ" และ "จำนวนคลินิกที่แสดง" เป็นค่าระดับศูนย์ ไม่ผูก
     กับจอใบใดใบหนึ่ง (มติผู้ใช้ 31 ส.ค. 69) — จอทุกใบของศูนย์แสดงข้อมูลชุดเดียวกัน
     ส่วนจุดบริการของแต่ละจอยังตั้งรายจอในทะเบียนจอเหมือนเดิม */
  const [screenFields, setScreenFields] = useState({ ...SCREEN_FIELD_DEFAULTS });
  const [previewLayout, setPreviewLayout] = useState(1);
  const [screenSize, setScreenSize] = useState(44);
  const [announcementVoiceTone, setAnnouncementVoiceTone] = useState('female');
  const [activeChange, setActiveChange] = useState(null);
  const [ticketSettingsByKioskType, setTicketSettingsByKioskType] = useState({
    queue: createTicketSettings('A'),
    payment: createTicketSettings('F'),
  });
  const [ticketSaved, setTicketSaved] = useState(false);
  /* เพิ่มจอใหม่จากหน้าทะเบียนจอ (มติผู้ใช้ 31 ส.ค. 69) — ฟอร์มถามแค่ตัวตนของจอ
     ส่วนจุดบริการที่จะขึ้นบนจอไปเลือกที่หน้าตั้งค่าจอ ซึ่งมีสวิตช์ครบทุกจุดอยู่แล้ว */
  const { label: centerName } = useActiveCenter();
  const [monitorDraft, setMonitorDraft] = useState(null);
  /* หน้าตั้งค่าทั้งสองเปิดเป็นป๊อปอัปจากหน้าทะเบียนได้ด้วย (มติผู้ใช้ 31 ส.ค. 69) —
     คนที่กำลังดูทะเบียนอยู่ไม่ต้องออกจากหน้าไปตั้งค่าแล้วเดินกลับมา */
  const [kioskSettingsOpen, setKioskSettingsOpen] = useState(false);
  const [displaySettingsOpen, setDisplaySettingsOpen] = useState(false);
  const purposeLabel = useMemo(() => Object.fromEntries(KIOSK_TYPES.map((item) => [item.value, item.label])), []);
  const isNewDraft = !!draft && !kiosks.some((item) => item.id === draft.id);
  /* คอลัมน์ทะเบียนจอ — บอกสามอย่างที่คนดูแลจอต้องรู้: จอไหน อยู่ตรงไหน และ
     แสดงคิวของจุดบริการอะไรบ้าง (ชิปอักษรหมวด เพราะเป็นสิ่งที่ขึ้นบนจอจริง) */
  /* เพิ่มจอใหม่ = ทุกช่องเริ่มว่าง (มติผู้ใช้ 31 ส.ค. 69) — เว้นรหัสจอ/รหัสอ้างอิง
     ระบบที่เป็นค่าที่ระบบสร้างเอง ไม่ใช่ของที่ผู้ใช้กรอก */
  const blankMonitor = () => ({
    id: `monitor-${Date.now()}`,
    number: monitors.reduce((max, m) => Math.max(max, m.number || 0), 0) + 1,
    name: '',
    location: '',
    floor: '',
    displayId: `DISPLAY-${String(monitors.reduce((max, m) => Math.max(max, m.number || 0), 0) + 1).padStart(2, '0')}`,
    layout: '',
    screenFields: { ...SCREEN_FIELD_DEFAULTS },
    stationIds: [],
  });

  const saveMonitor = () => {
    if (!monitorDraft?.name.trim() || !monitorDraft?.location.trim() || !monitorDraft?.floor || !monitorDraft?.layout || !monitorDraft?.stationIds.length) return;
    setMonitors((current) => (current.some((m) => m.id === monitorDraft.id)
      ? current.map((m) => (m.id === monitorDraft.id ? monitorDraft : m))
      : [...current, monitorDraft]));
    setMonitorDraft(null);
    setMonitorSaved(true);
    window.setTimeout(() => setMonitorSaved(false), 2400);
  };

  const monitorColumns = [
    /* ชิปสีชมพู คู่กับรหัสตู้ที่เป็นชิปสีเขียวน้ำทะเล — สองทะเบียนอ่านเป็นระบบ
       เดียวกันแต่แยกอุปกรณ์ออกจากกันด้วยสี (มติผู้ใช้ 31 ส.ค. 69) */
    { key: 'number', label: 'รหัสจอ', render: (row) => <ColorfulBadge style='pink' size='small' hierarchy='secondary'>{monitorNumberLabel(row.number)}</ColorfulBadge> },
    { key: 'name', label: 'ชื่อจอ', render: (row) => row.name },
    { key: 'location', label: 'ตำแหน่งที่ติดตั้ง', render: (row) => row.location },
    {
      key: 'stations',
      label: 'จุดบริการที่แสดงบนจอ',
      sortable: false,
      render: (row) => (
        <div className='flex flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
          {row.stationIds.length === 0
            ? <span style={{ color: 'var(--text-content-tertiary)' }}>ยังไม่ได้เลือกจุดบริการ</span>
            : row.stationIds.map((id) => {
              const st = QUEUE_STATIONS.find((item) => item.id === id);
              return st ? (
                <ColorfulBadge key={id} style='grey' size='small' hierarchy='secondary'>
                  {`${st.prefix} · ${st.label}`}
                </ColorfulBadge>
              ) : null;
            })}
        </div>
      ),
    },
    {
      key: 'action',
      label: 'การดำเนินการ',
      sortable: false,
      render: (row) => (
        <NeutralSubdueButton
          size='sm'
          variant='outline'
          leadingIcon='edit'
          /* ฟอร์มเดียวกับ "เพิ่มจอ" แต่เติมค่าของแถวนั้นไว้แล้ว (มติผู้ใช้ 31 ส.ค. 69)
             — คัดลอก stationIds ออกมาก่อน ไม่ให้ติ๊กในร่างไปแก้ของจริงก่อนกดบันทึก */
          onClick={() => setMonitorDraft({ ...row, stationIds: [...row.stationIds] })}
        >
          แก้ไข
        </NeutralSubdueButton>
      ),
    },
  ];

  const pageTitle = isDisplaySettings ? 'ตั้งค่าจอแสดงผลการเรียกคิว (TV)'
    : isDisplayList ? 'รายการจอแสดงผลการเรียกคิว'
      : isTicketSettings ? 'ตั้งค่าตู้ Kiosk'
        : 'รายการตู้บริการ';

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const generateKioskIdentity = (purpose, stationId) => {
    const station = QUEUE_STATIONS.find((item) => item.id === stationId);
    if (!purpose || !station) return { kioskName: '', kioskNumber: '', kioskId: '' };
    const prefix = purpose === 'payment' ? 'P' : 'K';
    const number = kiosks.reduce((highest, item) => {
      const match = String(item.kioskNumber || '').match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0) + 1;
    const serial = String(number).padStart(2, '0');
    return {
      kioskName: `${kioskTypeLabel(purpose)} ${station.label}`,
      kioskNumber: `${prefix}-${serial}`,
      kioskId: `KIOSK-${station.code}-${serial}`,
    };
  };
  /* ชื่อตู้ตั้งเองได้อิสระ (มติผู้ใช้ 31 ส.ค. 69) — ระบบยังเดาชื่อตั้งต้นให้เวลาเลือก
     แผนก/ประเภทตู้ แต่พอผู้ใช้พิมพ์เองแล้วจะไม่เขียนทับอีก (`*Touched`)
     "รหัสอ้างอิงระบบ (Kiosk ID)" ยังล็อกไว้ให้ระบบสร้าง เพราะเป็นคีย์ที่ใช้อ้างอิงตู้ */
  const applyGeneratedIdentity = (current, patch) => {
    const next = { ...current, ...patch };
    if (kiosks.some((item) => item.id === current.id)) return next;
    const generated = generateKioskIdentity(next.purpose, next.stationId);
    return {
      ...next,
      ...generated,
      kioskName: next.kioskNameTouched ? next.kioskName : generated.kioskName,
      kioskNumber: next.kioskNumberTouched ? next.kioskNumber : generated.kioskNumber,
    };
  };
  /* ช่อง "จุดรับบริการ / ห้องตรวจ" ถูกลบออกจากฟอร์ม 31 ส.ค. 69 (มติผู้ใช้) — คลินิก/
     แผนกที่เลือกผูกกับจุดบริการอยู่แล้วในทะเบียน (ORGANIZATION_UNITS.stationIds)
     ระบบจึงผูกให้เองด้วยจุดแรกของแผนกนั้น แล้วเอาไปสร้างชื่อ/รหัสตู้ต่อเหมือนเดิม
     ค่า `stationId` ยังถูกเก็บและแสดงในตารางตามเดิม */
  const selectOrganizationUnit = (organizationUnit) => {
    const station = stationsForUnit(organizationUnit)[0];
    setDraft((current) => applyGeneratedIdentity(current, {
      organizationUnit,
      stationId: station?.id || '',
      floor: station?.floor || '',
    }));
  };
  const selectPurpose = (purpose) => setDraft((current) => applyGeneratedIdentity(current, { purpose }));
  const updateDisplayField = (key, value) => setDraft((current) => ({
    ...current,
    displayFields: { ...current.displayFields, [key]: value },
  }));
  /* สองประเภทตู้แยกเป็นแท็บแคปซูล (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมวางการ์ดของทั้ง
     สองกลุ่มต่อกันลงมา ต้องเลื่อนผ่านทั้งกลุ่มตู้กดคิวกว่าจะถึงตู้ชำระเงิน ทั้งที่
     ตั้งค่าทีละกลุ่มอยู่แล้ว (ปุ่มบันทึกก็แยกกลุ่มใครกลุ่มมัน) */
  const [ticketTab, setTicketTab] = useState(KIOSK_TYPES[0].value);

  const updateTicketDisplayField = (kioskType, key, value) => setTicketSettingsByKioskType((current) => ({
    ...current,
    [kioskType]: {
      ...current[kioskType],
      displayFields: { ...current[kioskType].displayFields, [key]: value },
    },
  }));

  const save = () => {
    if (!draft.kioskNumber.trim() || !draft.kioskName.trim() || !draft.kioskId.trim() || !draft.organizationUnit || !draft.stationId || !draft.floor || !draft.purpose) return;
    setKiosks((current) => current.some((item) => item.id === draft.id)
      ? current.map((item) => (item.id === draft.id ? draft : item))
      : [...current, draft]);
    setDraft(null);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  const toggleMonitorStation = (monitorId, stationId) => {
    setMonitors((current) => current.map((monitor) => {
      if (monitor.id !== monitorId) return monitor;
      const stationIds = monitor.stationIds.includes(stationId)
        ? monitor.stationIds.filter((id) => id !== stationId)
        : [...monitor.stationIds, stationId];
      return { ...monitor, stationIds };
    }));
  };

  const requestActiveChange = (kiosk, active) => setActiveChange({ kiosk, active });
  const confirmActiveChange = () => {
    if (!activeChange) return;
    setKiosks((current) => current.map((item) => item.id === activeChange.kiosk.id
      ? { ...item, active: activeChange.active }
      : item));
    setActiveChange(null);
  };

  /* เสียงต้องเปลี่ยนตามโทนที่เลือกจริง (มติผู้ใช้ 31 ส.ค. 69)
     ปัญหาที่เจอ: `getVoices()` คืนค่าว่างในครั้งแรกเพราะเบราว์เซอร์โหลดรายชื่อเสียง
     แบบ async — ต้องรอ `voiceschanged` ก่อน ไม่งั้นเลือกโทนไหนก็ได้เสียง default
     เหมือนกันหมด · เครื่องส่วนใหญ่มีเสียงไทยแค่ตัวเดียว (หญิง) โทน "ชาย" จึงต้อง
     ปรับ pitch ลงลึกกว่าเดิมเพื่อให้ต่างกันจริง แทนที่จะหวังว่าจะมีเสียงชายให้เลือก */
  const voicesRef = useRef([]);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return undefined;
    const sync = () => { voicesRef.current = window.speechSynthesis.getVoices() || []; };
    sync();
    window.speechSynthesis.addEventListener?.('voiceschanged', sync);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', sync);
  }, []);

  const speakWithTone = (toneValue) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const tone = VOICE_TONE_BY_VALUE[toneValue] || VOICE_TONES[0];
    const voices = voicesRef.current.length ? voicesRef.current : (window.speechSynthesis.getVoices() || []);
    const namePattern = tone.gender === 'female'
      ? /female|woman|girl|หญิง|premwadee|kanya|siri|narisa/i
      : /male|man|ชาย|pattara|narong|somchai|thanawat/i;
    const thaiVoices = voices.filter((item) => String(item.lang || '').toLowerCase().startsWith('th'));
    const voice = thaiVoices.find((item) => namePattern.test(item.name))
      || thaiVoices[0]
      || voices.find((item) => namePattern.test(item.name));
    const utterance = new SpeechSynthesisUtterance('ขอเชิญหมายเลข เอ ศูนย์สี่สอง เข้ารับบริการที่คลินิกตรวจรักษาทั่วไป');
    utterance.lang = 'th-TH';
    utterance.rate = tone.rate;
    utterance.pitch = tone.pitch;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };


  const columns = [
    { key: 'kioskNumber', label: 'รหัสตู้', render: (row) => <ColorfulBadge style='teal' size='small' hierarchy='secondary'>{row.kioskNumber}</ColorfulBadge> },
    { key: 'kioskName', label: 'ชื่อตู้', flex: true, minWidth: 220 },
    { key: 'purpose', label: 'ประเภทตู้', render: (row) => purposeLabel[row.purpose] },
    { key: 'organizationUnit', label: 'คลินิก / แผนก', render: (row) => organizationLabel(row.organizationUnit) },
    { key: 'stationId', label: 'จุดบริการ / ห้องตรวจ', render: (row) => kioskStationLabel(row.stationId) },
    { key: 'floor', label: 'ชั้น', render: (row) => row.floor || '—' },
    { key: 'ticketSize', label: 'ความกว้างกระดาษที่พิมพ์ออกจากตู้', render: (row) => TICKET_SIZES.find((item) => item.value === row.ticketSize)?.label },
    { key: 'active', label: 'สถานะ', render: (row) => <Switch checked={row.active} onChange={(value) => requestActiveChange(row, typeof value === 'boolean' ? value : !row.active)} aria-label={`เปลี่ยนสถานะ ${row.kioskName}`} /> },
    { key: 'action', label: 'การดำเนินการ', sortable: false, render: (row) => <NeutralSubdueButton size='sm' variant='outline' leadingIcon='edit' onClick={() => setDraft({ ...row, displayFields: { ...row.displayFields } })}>แก้ไข</NeutralSubdueButton> },
  ];

  /* เนื้อหาของหน้าตั้งค่าทั้งสองถูกยกออกมาเป็นตัวแปร เพราะต้องใช้สองที่: เป็นหน้า
     เต็มของแท็บตัวเอง และเป็นป๊อปอัปที่เปิดจากหน้าทะเบียน (มติผู้ใช้ 31 ส.ค. 69)
     ทั้งสองทางใช้ state ชุดเดียวกัน ตั้งค่าจากทางไหนก็เห็นผลเหมือนกัน */
  const ticketSettingsContent = (
          /* แท็บ + การ์ดทั้งสองใบวางบนพื้นขาวใบเดียว (มติผู้ใช้ 31 ส.ค. 69) — เดิม
             ลอยอยู่บนพื้นเขียวอ่อนของหน้า ทำให้แถบแท็บดูไม่ผูกกับเนื้อหาที่มันคุม
             การ์ดข้างในจึงเหลือแค่เส้นขอบ ไม่มีเงา จะได้ไม่เป็นการ์ดซ้อนการ์ด */
          <div className='flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
            {/* แท็บทรงเดียวกับแท็บหมวดของจุดคัดกรอง (มติผู้ใช้ 31 ส.ค. 69) — TabBar
                เป็นรางเขียวอ่อนคลุมทั้งแถว แต่ละแท็บมีไอคอนนำหน้า ไม่ใช่ชิปลอย */}
            <TabBar
              aria-label='ประเภทตู้'
              /* รางแท็บกว้างเท่าป้ายสองอันรวมกัน ไม่ยืดเต็มการ์ด และวางกึ่งกลาง
                 การ์ด (มติผู้ใช้ 31 ส.ค. 69) — `margin-inline: auto` เป็นตัวจัดกลาง
                 เพราะรางถูกบีบเป็น fit-content แล้ว การตั้ง align ข้างในไม่มีผล */
              className='max-w-full'
              style={{ width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}
            >
              {KIOSK_TYPES.map((type) => (
                <TabPill
                  key={type.value}
                  size='small'
                  /* ส่งเป็น element ไม่ใช่ชื่อสตริง — TabPill เรนเดอร์สตริงด้วย
                     Material Symbols ligature ซึ่งไม่มีตัว `kiosk` ในชุดฟอนต์
                     จึงโผล่เป็นตัวอักษรดิบ "kiosk" `Icon` มี SVG ของตู้บริการ
                     วาดไว้เองอยู่แล้ว (Icon.jsx case 'kiosk') */
                  leadingIcon={<Icon name={type.icon} />}
                  selected={ticketTab === type.value}
                  onClick={() => setTicketTab(type.value)}
                >
                  {type.label}
                </TabPill>
              ))}
            </TabBar>

            {KIOSK_TYPES.filter((type) => type.value === ticketTab).map((type) => {
                const settings = ticketSettingsByKioskType[type.value];
                const isQueueKiosk = type.value === 'queue';
                return (
                  /* ซ้าย 2 ส่วน (ฟอร์ม) : ขวา 1 ส่วน (ตัวอย่างบัตร) — มติผู้ใช้ 31 ส.ค. 69 */
                  <div key={type.value} className='grid grid-cols-1 xl:grid-cols-3' style={{ gap: 'var(--dim-space-600)' }}>
                    <div className='xl:col-span-2 flex min-w-0'>
                    <SectionCard
                      flat
                      icon={type.icon}
                      title={`กลุ่ม${type.label}`}
                      subtitle={isQueueKiosk ? 'กำหนดรูปแบบใบคิวสำหรับตู้กดคิวทุกตู้' : 'กำหนดรูปแบบใบคิวสำหรับตู้ชำระเงินทุกตู้'}
                    >
                      {/* รูปแบบเลขคิว + ความกว้างกระดาษ อยู่แถวเดียวกัน (มติผู้ใช้ 31 ส.ค. 69) */}
                      <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                        <FieldLabel>รูปแบบเลขคิว</FieldLabel>
                        <Dropdown
                          value={settings.numberFormat}
                          onChange={(numberFormat) => setTicketSettingsByKioskType((current) => ({
                            ...current,
                            [type.value]: { ...current[type.value], numberFormat },
                          }))}
                          options={QUEUE_NUMBER_FORMATS.map((f) => ({
                            value: f.value,
                            label: `${f.build(
                              resolvePrefix(settings, QUEUE_SAMPLE[type.value].stationId, QUEUE_SAMPLE[type.value].fallbackPrefix),
                              QUEUE_SAMPLE[type.value].serial,
                              sessionSymbol(),
                            )} — ${f.desc}`,
                          }))}
                        />
                      </div>
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                        <FieldLabel>ความกว้างกระดาษที่พิมพ์ออกจากตู้</FieldLabel>
                        <Dropdown value={settings.ticketSize} onChange={(ticketSize) => setTicketSettingsByKioskType((current) => ({
                          ...current,
                          [type.value]: { ...current[type.value], ticketSize },
                        }))} options={TICKET_SIZES} />
                      </div>
                      </div>

                      {/* อักษรหมวดตั้งได้ก็ต่อเมื่อรูปแบบที่เลือกใช้มันจริง (มติผู้ใช้
                          31 ส.ค. 69) — รูปแบบเลขล้วนหรือสัญลักษณ์ล้วนไม่มีที่ให้ใส่
                          อักษร ถ้ายังโชว์ช่องไว้ก็จะตั้งค่าค้างโดยไม่มีผลกับบัตร */}
                      {!formatUsesPrefix(settings.numberFormat) ? (
                        <HelperText>รูปแบบที่เลือกไม่ใช้อักษรหมวดคิว — เลือกรูปแบบที่มีอักษรหมวดหรืออักษรไทยก่อน จึงจะตั้งค่าอักษรรายคลินิกได้</HelperText>
                      ) : (
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)' }}>
                        <FieldLabel>อักษรหมวดคิว</FieldLabel>
                        {/* โหมดกับตัวอักษรอยู่แถวเดียวกัน ซ้าย-ขวา (มติผู้ใช้ 31 ส.ค. 69)
                            — เป็นค่าคู่กัน วางซ้อนกันทำให้ดูเป็นคนละเรื่อง */}
                        <div className='flex items-start w-full' style={{ gap: 'var(--dim-space-300)' }}>
                          <div className='flex-1 min-w-0'>
                            <Dropdown
                              size='md'
                              value={settings.prefixMode}
                              onChange={(prefixMode) => setTicketSettingsByKioskType((current) => ({
                                ...current,
                                [type.value]: { ...current[type.value], prefixMode },
                              }))}
                              options={PREFIX_MODES}
                            />
                          </div>
                          {settings.prefixMode === 'shared' ? (
                            <div className='shrink-0' style={{ width: 120 }}>
                              <InputField
                                size='md'
                                label='ตัวอักษรที่ใช้ทุกคลินิก'
                                showLabel={false}
                                showHelperText={false}
                                value={settings.sharedPrefix}
                                onChange={(sharedPrefix) => setTicketSettingsByKioskType((current) => ({
                                  ...current,
                                  [type.value]: { ...current[type.value], sharedPrefix: sharedPrefix.slice(0, 2).toUpperCase() },
                                }))}
                                placeholder='เช่น A'
                                maxLength={2}
                              />
                            </div>
                          ) : null}
                        </div>
                        {/* ตารางอักษรรายคลินิกขึ้นเฉพาะโหมด "แต่ละคลินิก" — โหมดตัวอักษร
                            เดียวกันใช้ช่องเดียวข้างดรอปดาวน์พอ (มติผู้ใช้ 31 ส.ค. 69) */}
                        {settings.prefixMode === 'shared' ? null : (
                          <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-200)' }}>
                            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>
                              กำหนดอักษร/สัญลักษณ์ของแต่ละคลินิก — เว้นว่างเพื่อใช้อักษรจากทะเบียนจุดบริการ
                            </span>
                            {/* ทำเป็นตารางจริง (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมเป็นกริดสองคอลัมน์
                                ที่จับคู่ชื่อกับช่องกรอกด้วยสายตา อ่านยากเมื่อมี 15 คลินิก
                                คอลัมน์ "ตัวอย่างเลขคิว" คำนวณจากรูปแบบที่เลือกจริง */}
                            <Table
                              columns={[
                                { key: 'label', label: 'คลินิก / จุดบริการ', flex: true, minWidth: 220, render: (st) => st.label },
                                {
                                  key: 'prefix',
                                  label: 'อักษร / สัญลักษณ์',
                                  align: 'center',
                                  sortable: false,
                                  render: (st) => (
                                    <div style={{ width: 88, margin: '0 auto' }}>
                                      <InputField
                                        size='md'
                                        showLabel={false}
                                        showHelperText={false}
                                        aria-label={`อักษรหมวดคิวของ ${st.label}`}
                                        value={settings.prefixByStation?.[st.id] ?? ''}
                                        onChange={(value) => setTicketSettingsByKioskType((current) => ({
                                          ...current,
                                          [type.value]: {
                                            ...current[type.value],
                                            prefixByStation: {
                                              ...(current[type.value].prefixByStation ?? {}),
                                              [st.id]: value.slice(0, 2),
                                            },
                                          },
                                        }))}
                                        placeholder={st.prefix}
                                        maxLength={2}
                                      />
                                    </div>
                                  ),
                                },
                                {
                                  key: 'sample',
                                  label: 'ตัวอย่างเลขคิว',
                                  align: 'center',
                                  sortable: false,
                                  render: (st) => (
                                    <ColorfulBadge style='grey' size='small' hierarchy='secondary'>
                                      {buildQueueCode(
                                        settings.numberFormat,
                                        resolvePrefix(settings, st.id, st.prefix),
                                        42,
                                        sessionSymbol(),
                                      )}
                                    </ColorfulBadge>
                                  ),
                                },
                              ]}
                              rows={QUEUE_STATIONS.filter((st) => st.active)}
                              rowKey={(st) => st.id}
                            />
                          </div>
                        )}
                      </div>

                      )}
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-300)' }}>
                        {/* คำอธิบายใต้หัวข้อถูกเอาออก 31 ส.ค. 69 (มติผู้ใช้) — ต่อท้ายหัวข้อ
                            แล้วอ่านรวมเป็นประโยคเดียวจนงง ส่วนที่มันบอก (สถานที่มาจาก
                            คลินิก/จุดบริการ/ชั้นของตู้) เห็นได้จากตัวอย่างใบคิวข้าง ๆ อยู่แล้ว */}
                        <FieldLabel>ข้อมูลที่ต้องการแสดงบนใบคิว</FieldLabel>
                        <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-200)' }}>
                          {DISPLAY_FIELDS.map((field) => (
                            <Checkbox
                              key={field.key}
                              checked={!!settings.displayFields[field.key]}
                              onChange={(value) => updateTicketDisplayField(type.value, field.key, value)}
                              label={field.label}
                            />
                          ))}
                        </div>
                      </div>
                    </SectionCard>
                    </div>
                    <SectionCard
                      flat
                      icon='receipt_long'
                      title={`ตัวอย่างใบคิว — ${type.label}`}
                      subtitle='ตัวอย่างจะอัปเดตตามข้อมูลที่เลือกในกลุ่มนี้'
                    >
                      <TicketPreview kioskType={type.value} settings={settings} />
                    </SectionCard>
                  </div>
                );
            })}

            {/* ปุ่มบันทึกเป็นแถบติดขอบล่าง แบบเดียวกับหน้าตั้งค่าจอแสดงผล
                (มติผู้ใช้ 31 ส.ค. 69) — ฟอร์มยาว ปุ่มจึงต้องอยู่กับสายตาเสมอ
                เวลาเปิดเป็นป๊อปอัปไม่ต้องมีแถบนี้ เพราะปุ่มไปอยู่ท้ายป๊อปอัปคู่กับ "ปิด" */}
            {kioskSettingsOpen ? null : (
            <div
              className='sticky flex items-center justify-end w-full'
              style={{
                bottom: 0,
                gap: 'var(--dim-space-300)',
                paddingTop: 'var(--dim-space-400)',
                background: 'var(--surface-card-100)',
                borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
              }}
            >
              {ticketSaved ? (
                <span style={{ color: 'var(--text-positive-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                  บันทึกการตั้งค่าใบคิวเรียบร้อยแล้ว
                </span>
              ) : null}
              <BrandPrimaryButton size='md' leadingIcon='save' onClick={() => { setTicketSaved(true); window.setTimeout(() => setTicketSaved(false), 2400); }}>
                บันทึก
              </BrandPrimaryButton>
            </div>
            )}
          </div>
  );

  const displaySettingsContent = (
    /* วางแท็บไว้บนสุดของพื้นขาว กึ่งกลาง — ตำแหน่งเดียวกับแท็บประเภทตู้ในหน้า
       ตั้งค่าตู้ Kiosk (มติผู้ใช้ 31 ส.ค. 69) สองหน้าตั้งค่าจึงอ่านเป็นทรงเดียวกัน */
    <div className='flex flex-col' style={{ ...CARD_STYLE, gap: 'var(--dim-space-600)' }}>
      <TabBar
        aria-label='จำนวนคลินิกที่แสดงบนจอ'
        className='max-w-full'
        style={{ width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}
      >
        {MONITOR_LAYOUTS.map((item) => (
          <TabPill
            key={item.value}
            size='small'
            selected={previewLayout === item.value}
            onClick={() => setPreviewLayout(item.value)}
          >
            {item.label}
          </TabPill>
        ))}
      </TabBar>

          <div className='grid grid-cols-1 xl:grid-cols-2' style={{ gap: 'var(--dim-space-600)' }}>
            <SectionCard
              flat
              icon='tv'
              title='ตั้งค่าจอแสดงผล'
              subtitle='กำหนดจุดบริการที่จะแสดงบนแต่ละจอ'
            >
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                {/* ไม่ต้องมีกรอบ (มติผู้ใช้ 31 ส.ค. 69) — อยู่ในการ์ดขาวอยู่แล้ว
                    กรอบซ้อนอีกชั้นทำให้อ่านเป็นกล่องในกล่อง */}
                <div>
                  {/* จุดบริการที่จอนี้รับผิดชอบย้ายไปตั้งในฟอร์มเพิ่ม/แก้ไขจอแล้ว
                      การ์ดนี้จึงคุม "ข้อมูลที่แสดงบนจอ" อย่างเดียว (มติผู้ใช้ 31 ส.ค. 69) */}
                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', marginBottom: 'var(--dim-space-400)', maxWidth: 320 }}>
                    <FieldLabel>ขนาดหน้าจอที่ติดตั้ง</FieldLabel>
                    <Dropdown
                      size='md'
                      value={screenSize}
                      onChange={setScreenSize}
                      options={SCREEN_SIZES}
                    />
                  </div>

                  <FieldLabel>ข้อมูลที่ต้องการแสดงบนจอ</FieldLabel>
                  <div className='grid grid-cols-1 sm:grid-cols-2' style={{ gap: 'var(--dim-space-200)', marginTop: 'var(--dim-space-200)' }}>
                    {SCREEN_FIELDS.map((field) => (
                      <Checkbox
                        key={field.key}
                        checked={!!screenFields[field.key]}
                        disabled={field.required}
                        onChange={(value) => setScreenFields((current) => ({ ...current, [field.key]: !!value }))}
                        label={field.label}
                      />
                    ))}
                  </div>
                  <div style={{ marginTop: 'var(--dim-space-300)', paddingTop: 'var(--dim-space-300)', borderTop: '1px solid var(--border-table-line)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>
                    ใช้กับจอทุกใบของศูนย์ · จุดบริการของแต่ละจอตั้งได้ที่ปุ่ม “แก้ไข” ในทะเบียนจอ
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              flat
              icon='tv'
              title='Preview จอแสดงผล'
              subtitle='ตรวจสอบหน้าจอและเสียงประกาศก่อนนำไปใช้งานจริง'
            >
              <div className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                {/* พรีวิวจอเรียกคิว — ย่อจากแบบใน Figma (PHCIS | Screening)
                    · 1 คลินิก  node 129:62394 — เลขคิวเดี่ยวใบใหญ่ + รางคิวถัดไปด้านขวา
                    · 2 คลินิก  node 129:62393 — คอลัมน์คลินิกเรียงข้างกัน
                    · 3 คลินิก  node 129:62395 — เหมือน 2 คลินิก เพิ่มคอลัมน์
                    ทุกส่วนผูกกับ "ข้อมูลที่ต้องการแสดงบนจอ" ปิดช่องไหนหายทั้งส่วน */}
                {(() => {
                  const fields = screenFields;
                  const cols = previewLayout;
                  /* พรีวิวเป็นตัวอย่างระดับศูนย์ ไม่ผูกกับจอใบใดใบหนึ่งแล้ว (มติผู้ใช้
                     31 ส.ค. 69) — หยิบจุดบริการต้น ๆ ของทะเบียนมาเท่าจำนวนคลินิกที่เลือก */
                  const stations = QUEUE_STATIONS.filter((st) => st.active).slice(0, previewLayout);
                  const sizeScale = SCREEN_SIZES.find((z) => z.value === screenSize)?.scale ?? 1;
                  const columnTone = ['blue', 'pink', 'indigo', 'teal'];
                  const toneBold = (i) => `var(--surface-colorfulbadge-${columnTone[i % columnTone.length]}-bold)`;

                  const Header = () => (
                    <div
                      className='flex items-center justify-between w-full'
                      style={{
                        gap: 'var(--dim-space-300)',
                        paddingBottom: 'var(--dim-space-300)',
                        borderBottom: 'var(--dim-stroke-200, 2px) solid var(--border-neutral-tertiary)',
                      }}
                    >
                      {fields.siteHeader ? (
                        <div className='flex items-center min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                          <img src={OFFICE_HEALTH_LOGO} alt='' aria-hidden style={{ width: 28, height: 28, objectFit: 'contain' }} />
                          <div className='flex flex-col min-w-0'>
                            <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)', lineHeight: 1.2 }}>สำนักอนามัย</strong>
                            <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>{centerName}</span>
                          </div>
                        </div>
                      ) : <span />}
                      <span className='flex-1 text-center truncate' style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)' }}>
                        ตัวอย่างจอแสดงผล
                      </span>
                      {fields.clock ? (
                        <div className='flex flex-col items-end shrink-0'>
                          <div className='flex items-center' style={{ gap: 'var(--dim-space-100)' }}>
                            <Icon name='schedule' size={14} style={{ color: 'var(--text-content-secondary)' }} />
                            <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>10:45:23</strong>
                          </div>
                          <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>6 พฤษภาคม 2569</span>
                        </div>
                      ) : <span />}
                    </div>
                  );

                  const Ticker = () => (fields.ticker ? (
                    <div
                      className='flex items-center justify-center w-full'
                      style={{
                        gap: 'var(--dim-space-200)',
                        marginTop: 'var(--dim-space-300)',
                        padding: 'var(--dim-space-200) var(--dim-space-300)',
                        borderRadius: 'var(--dim-radius-200)',
                        background: 'linear-gradient(90deg, #00A4AC 0%, #1FA091 100%)',
                        color: '#FFFFFF',
                        fontFamily: 'var(--type-family-body)',
                        fontSize: 'var(--type-size-xxs, 11px)',
                      }}
                    >
                      <strong>Announcement:</strong>
                      <span className='truncate'>หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่ ณ จุดบริการ</span>
                    </div>
                  ) : null);

                  const PassedNumbers = () => (
                    <div className='flex items-center flex-wrap' style={{ gap: 'var(--dim-space-150)' }}>
                      <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>หมายเลขที่เรียกผ่านไปแล้ว</span>
                      {['A-009', 'A-010'].map((code) => (
                        <span key={code} style={{ padding: '2px var(--dim-space-200)', borderRadius: 'var(--dim-radius-200)', background: 'var(--surface-neutral-quaternary)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>{code}</span>
                      ))}
                    </div>
                  );

                  return (
                    <div
                      aria-label='ตัวอย่างหน้าจอแสดงผลการเรียกคิว'
                      className='flex flex-col w-full'
                      style={{
                        /* จอจริงเป็นทีวี 44 นิ้ว อัตราส่วน 16:9 — พรีวิวต้องเป็นกรอบ
                           สัดส่วนเดียวกัน ไม่งั้นสิ่งที่เห็นตอนตั้งค่ากับของจริงคนละทรง
                           (มติผู้ใช้ 31 ส.ค. 69) เนื้อหาข้างในย่อ/ขยายตามความกว้างการ์ด */
                        aspectRatio: '16 / 9',
                        overflow: 'hidden',
                        gap: 'var(--dim-space-200)',
                        padding: 'var(--dim-space-300)',
                        borderRadius: 'var(--dim-radius-500)',
                        background: 'var(--surface-card-100)',
                        border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)',
                        boxShadow: 'var(--shadow-card-strong)',
                      }}
                    >
                      <Header />

                      {cols === 1 ? (
                        /* 1 คลินิก — เลขคิวใบใหญ่ซ้าย · รางคิวถัดไปขวา */
                        <div className='flex w-full flex-1 min-h-0' style={{ gap: 'var(--dim-space-300)' }}>
                          <div className='flex flex-col flex-1 min-w-0' style={{ gap: 'var(--dim-space-200)' }}>
                            {fields.counter ? (
                              <div
                                className='flex items-center justify-between w-full'
                                style={{ gap: 'var(--dim-space-200)', padding: 'var(--dim-space-150) var(--dim-space-400)', borderRadius: 'var(--dim-radius-full)', border: 'var(--dim-stroke-200, 2px) solid var(--border-neutral-quaternary)' }}
                              >
                                <span className='flex items-center' style={{ gap: 'var(--dim-space-150)', color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-sm)' }}>
                                  <Icon name='volume_up' size={16} />
                                  กำลังเรียก
                                </span>
                                <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-base)' }}>ห้องตรวจ 3</strong>
                              </div>
                            ) : null}
                            <div
                              className='flex items-center justify-center w-full'
                              style={{ flex: 1, minHeight: 96, borderRadius: 'var(--dim-radius-500)', border: `4px solid ${toneBold(1)}`, background: 'var(--surface-card-100)' }}
                            >
                              <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-bold)', fontSize: Math.round(64 * sizeScale), lineHeight: 1, letterSpacing: '-0.02em' }}>
                                {`${stations[0]?.prefix || 'A'}124`}
                              </strong>
                            </div>
                            {fields.stationName ? (
                              <span className='text-center' style={{ color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
                                {stations[0]?.label || 'รอเข้าห้องตรวจ'}
                              </span>
                            ) : null}
                            {fields.patientName ? (
                              <span className='text-center' style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>คุณสมชาย ม.</span>
                            ) : null}
                            <PassedNumbers />
                          </div>

                          {fields.nextQueues ? (
                            <div className='flex flex-col shrink-0' style={{ width: 148, borderRadius: 'var(--dim-radius-300)', overflow: 'hidden', border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}>
                              <div className='text-center' style={{ padding: 'var(--dim-space-150)', background: toneBold(1), color: '#FFFFFF', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-medium)', fontSize: 'var(--type-size-xs)' }}>คิวถัดไป</div>
                              {[125, 126, 127, 128].map((no, i) => (
                                <div key={no} className='text-center' style={{ padding: 'var(--dim-space-150)', background: i % 2 ? 'var(--surface-card-200)' : 'var(--surface-card-100)', color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-lg)' }}>
                                  {`${stations[0]?.prefix || 'A'}-${no}`}
                                </div>
                              ))}
                              {fields.waitingCount ? (
                                <div className='text-center' style={{ padding: 'var(--dim-space-150)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)', color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>
                                  คิวที่เหลือทั้งหมด <strong style={{ fontSize: 'var(--type-size-base)' }}>26</strong>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        /* 2–4 คลินิก — คอลัมน์คลินิกเรียงข้างกัน */
                        <div className='grid w-full flex-1 min-h-0' style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 'var(--dim-space-300)', alignItems: 'stretch' }}>
                          {Array.from({ length: cols }).map((_, i) => {
                            const st = stations[i];
                            return (
                              <div
                                key={st?.id || `slot-${i}`}
                                /* คอลัมน์ต้องย่อได้จริงในกรอบ 16:9 — `min-h-0` + `overflow:hidden`
                                   ที่ตัวการ์ด และหัวแถบ `shrink-0` พร้อม line-height เต็ม
                                   ไม่งั้นตัวหนังสือบนแถบสีโดนตัดครึ่ง (มติผู้ใช้ 31 ส.ค. 69) */
                                className='flex flex-col min-h-0 overflow-hidden'
                                style={{ borderRadius: 'var(--dim-radius-300)', border: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}
                              >
                                <div
                                  className='text-center truncate shrink-0'
                                  style={{
                                    padding: 'var(--dim-space-200) var(--dim-space-200)',
                                    background: toneBold(i),
                                    color: '#FFFFFF',
                                    fontFamily: 'var(--type-family-body)',
                                    fontWeight: 'var(--type-weight-medium)',
                                    fontSize: 'var(--type-size-xs)',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {fields.stationName ? (st?.label || 'ยังไม่ได้ผูกจุดบริการ') : 'จุดบริการ'}
                                </div>
                                <div className='flex flex-col items-center shrink-0' style={{ gap: 'var(--dim-space-150)', padding: 'var(--dim-space-250, 10px) var(--dim-space-300)' }}>
                                  <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>หมายเลขปัจจุบัน</span>
                                  <div className='flex items-center justify-center w-full' style={{ minHeight: 66, borderRadius: 'var(--dim-radius-300)', border: `3px solid ${toneBold(i)}` }}>
                                    <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontWeight: 'var(--type-weight-bold)', fontSize: Math.round((cols >= 3 ? 30 : 40) * sizeScale), lineHeight: 1 }}>
                                      {st ? `${st.prefix}112` : '—'}
                                    </strong>
                                  </div>
                                </div>
                                {fields.nextQueues ? (
                                  <>
                                    <div className='text-center' style={{ padding: '2px', background: 'var(--surface-card-200)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>คิวถัดไป</div>
                                    {(cols >= 3 ? [1, 2, 3] : [1, 2, 3, 4]).map((no) => (
                                      <div key={no} className='flex items-center justify-between' style={{ padding: 'var(--dim-space-100) var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)' }}>
                                        <span style={{ color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>{`คิวที่ ${no}`}</span>
                                        <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>{st ? `${st.prefix}11${2 + no}` : '—'}</strong>
                                      </div>
                                    ))}
                                  </>
                                ) : null}
                                {fields.waitingCount ? (
                                  <div className='flex items-center justify-between' style={{ padding: 'var(--dim-space-150) var(--dim-space-200)', borderTop: 'var(--dim-stroke-100) solid var(--border-neutral-quaternary)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>
                                    <span>คิวที่เหลือทั้งหมด</span>
                                    <strong style={{ color: 'var(--text-content-secondary)', fontSize: 'var(--type-size-sm)' }}>15</strong>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <Ticker />
                    </div>
                  );
                })()}


                <div style={{ ...CARD_STYLE, padding: 'var(--dim-space-400)', boxShadow: 'none' }}>
                  <div className='flex items-start justify-between' style={{ gap: 'var(--dim-space-300)', marginBottom: 'var(--dim-space-300)' }}>
                    <div>
                      <strong style={{ color: 'var(--text-content-primary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>เสียงประกาศ</strong>
                      <div style={{ marginTop: 'var(--dim-space-050)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xs)' }}>กดเลือกโทนเสียงเพื่อฟังข้อความตัวอย่าง</div>
                    </div>
                    <Icon name='volume_up' size={22} style={{ color: 'var(--text-brandPrimary-default)' }} />
                  </div>
                  <div className='grid grid-cols-2 sm:grid-cols-3' style={{ gap: 'var(--dim-space-200)', alignItems: 'end' }}>
                    {/* ปุ่มโทนเสียงใช้คอมโพเนนต์ของดีไซน์ซิสเต็ม (มติผู้ใช้ 31 ส.ค. 69) —
                        ของเดิมเป็น <button> ที่จัดสไตล์เอง จึงไม่มี hover/focus/active
                        ตามโทเคน `active` คือสถานะถูกเลือกของ BrandSubdueButton อยู่แล้ว */}
                    {VOICE_TONES.map((voice) => (
                      <BrandSubdueButton
                        key={voice.value}
                        size='md'
                        variant='outline'
                        leadingIcon='volume_up'
                        active={announcementVoiceTone === voice.value}
                        aria-pressed={announcementVoiceTone === voice.value}
                        /* กดเลือกแล้วอ่านให้ฟังทันที ไม่ต้องมีปุ่มฟังตัวอย่างแยก */
                        onClick={() => { setAnnouncementVoiceTone(voice.value); speakWithTone(voice.value); }}
                      >
                        {voice.label}
                      </BrandSubdueButton>
                    ))}
                  </div>
                  <div style={{ marginTop: 'var(--dim-space-200)', color: 'var(--text-content-tertiary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-xxs, 11px)' }}>
                    ตัวอย่างใช้เสียงสังเคราะห์ของเครื่องที่เปิดหน้านี้ — ถ้าเครื่องมีเสียงภาษาไทยตัวเดียว ระบบจะปรับระดับเสียงและความเร็วให้ต่างกันตามโทนที่เลือก
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

      {/* ปุ่มบันทึกเป็นแถบติดขอบล่าง (มติผู้ใช้ 31 ส.ค. 69) — ของเดิมอยู่ท้ายการ์ด
          ซ้าย ทำให้ลอยอยู่กลางหน้าโดยมีที่ว่างใต้มันครึ่งจอ และต้องเลื่อนหาเวลา
          ตั้งค่ายาว ๆ แถบนี้ติดอยู่กับสายตาเสมอไม่ว่าเลื่อนไปถึงไหน
          เวลาเปิดเป็นป๊อปอัปไม่ต้องมี เพราะปุ่มไปอยู่ท้ายป๊อปอัปคู่กับ "ปิด" */}
      {displaySettingsOpen ? null : (
      <div
        className='sticky flex items-center justify-end w-full'
        style={{
          bottom: 0,
          gap: 'var(--dim-space-300)',
          marginTop: 'var(--dim-space-200)',
          paddingTop: 'var(--dim-space-400)',
          background: 'var(--surface-card-100)',
          borderTop: 'var(--dim-stroke-100) solid var(--border-brandPrimary-quaternary)',
        }}
      >
        {monitorSaved ? (
          <span style={{ color: 'var(--text-positive-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            บันทึกการตั้งค่าจอเรียบร้อยแล้ว
          </span>
        ) : null}
        <BrandPrimaryButton size='md' leadingIcon='save' onClick={() => { setMonitorSaved(true); window.setTimeout(() => setMonitorSaved(false), 2400); }}>
          บันทึก
        </BrandPrimaryButton>
      </div>
      )}
    </div>
  );

  return (
    <QueuePageShell
      activeKey='queue-center'
      sidebarItems={SYSTEM_NAV}
      sidebarFallbackKey='system-overview'
      sidebarHideActiveChevron
      breadcrumb={['ตู้กดบัตรคิวและจอแสดงผล', pageTitle]}
      title={pageTitle}
      summaryCards={[
        { key: 'all', label: 'ตู้บริการทั้งหมด', value: kiosks.length, indicator: 'รายการ', color: 'info', icon: 'print' },
        { key: 'active', label: 'เปิดใช้งาน', value: kiosks.filter((item) => item.active).length, indicator: 'พร้อมใช้งาน', color: 'positive', icon: 'check_circle' },
        { key: 'monitors', label: 'จอแสดงผล', value: monitors.length, indicator: 'จอที่ตั้งค่าไว้', color: 'info', icon: 'tv' },
      ]}
      belowSummary={<QueueCenterSubNav />}
    >
      <div className='flex flex-col flex-1 min-w-0' style={PAGE_BODY_STYLE}>
        {!isTicketSettings && !isDisplaySettings && !isDisplayList ? (
          <>
            {saved ? <div role='status' style={{ ...CARD_STYLE, padding: 'var(--dim-space-300)', color: 'var(--text-positive-default)' }}>บันทึกการตั้งค่าเรียบร้อยแล้ว</div> : null}

            <SectionCard
              icon='kiosk'
              title='รายการตู้บริการ'
              subtitle='กำหนดข้อมูลประจำตู้ ประเภทตู้ และตำแหน่งตามโครงสร้างองค์กร'
              /* คู่กับหน้ารายการจอ — ทะเบียนพาไปหน้าตั้งค่าของอุปกรณ์ตัวเองได้เลย
                 (มติผู้ใช้ 31 ส.ค. 69) ไม่ต้องย้อนขึ้นไปหาแท็บด้านบน */
              action={(
                <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                  {/* ปุ่มคู่ต้องสูงเท่ากัน — ทั้งสองตัวระบุ size='md' ตรง ๆ ไม่ปล่อยให้
                      แต่ละตัวไปหยิบค่า default ของตัวเอง (มติผู้ใช้ 31 ส.ค. 69) */}
                  <NeutralSubdueButton size='md' variant='outline' leadingIcon='settings' onClick={() => setKioskSettingsOpen(true)}>
                    ตั้งค่าตู้บริการ
                  </NeutralSubdueButton>
                  <BrandPrimaryButton size='md' leadingIcon='add' onClick={() => setDraft(blankKiosk())}>เพิ่มตู้บริการ</BrandPrimaryButton>
                </div>
              )}
            >
              <Table columns={columns} rows={kiosks} rowKey={(row) => row.id} />
            </SectionCard>

            {draft ? (
              <Popup
                open={!!draft}
                onClose={() => setDraft(null)}
                title={kiosks.some((item) => item.id === draft.id) ? 'แก้ไขข้อมูลตู้บริการ' : 'เพิ่มตู้บริการ'}
                /* ฟอร์มมีเจ็ดช่องเรียงสองคอลัมน์ ป๊อปอัปขนาด extraLarge จึงสูงเกิน
                   เนื้อหาไปมาก เหลือที่ว่างข้างล่างครึ่งจอ (มติผู้ใช้ 31 ส.ค. 69) */
                size='large'
                tertiaryAction={{ label: 'ยกเลิก', onClick: () => setDraft(null) }}
                primaryAction={{ label: 'บันทึกการตั้งค่า', onClick: save, disabled: !draft.kioskNumber.trim() || !draft.kioskName.trim() || !draft.kioskId.trim() || !draft.organizationUnit || !draft.stationId || !draft.floor || !draft.purpose }}
              >
                <div className='w-full'>
                  <section className='flex flex-col' style={{ gap: 'var(--dim-space-400)' }}>
                    {/* ทุกช่องกว้างเท่ากัน — ช่องของกริดกว้างไม่เกิน 640 ซึ่งเป็นเพดาน
                        ความกว้างของ InputField อยู่แล้ว ดรอปดาวน์จึงไม่ยืดเลยไปกว่า
                        ช่องชื่อตู้/รหัสตู้ (มติผู้ใช้ 31 ส.ค. 69) */}
                    <div
                      className='grid grid-cols-1 md:grid-cols-2'
                      style={{ gap: 'var(--dim-space-400)', gridTemplateColumns: undefined }}
                    >
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 640 }}>
                        <FieldLabel required>คลินิก / แผนก</FieldLabel>
                        <Dropdown size='md' value={draft.organizationUnit} onChange={selectOrganizationUnit} options={ORGANIZATION_UNITS} placeholder='เลือกคลินิก / แผนก' />
                      </div>
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 640 }}>
                        <FieldLabel required>ประเภทตู้</FieldLabel>
                        <Dropdown size='md' value={draft.purpose} onChange={selectPurpose} options={KIOSK_TYPES} placeholder='เลือกประเภทตู้' />
                      </div>
                      <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 640 }}>
                        <FieldLabel required>ชั้น</FieldLabel>
                        <Dropdown
                          size='md'
                          value={draft.floor}
                          onChange={(floor) => update('floor', floor)}
                          options={FLOOR_OPTIONS}
                          placeholder='เลือกชั้น'
                        />
                      </div>
                      <InputField
                        size='md'
                        label='ชื่อตู้'
                        required
                        value={draft.kioskName}
                        onChange={(value) => setDraft((current) => ({ ...current, kioskName: value, kioskNameTouched: true }))}
                        placeholder='เช่น ตู้กดคิว โถงชั้น 1'
                      />
                      <InputField
                        size='md'
                        label='รหัสตู้ (แสดงบนใบคิว)'
                        required
                        value={draft.kioskNumber}
                        onChange={(value) => setDraft((current) => ({ ...current, kioskNumber: value, kioskNumberTouched: true }))}
                        placeholder='เช่น K-01'
                      />
                      <InputField size='md' label='รหัสอ้างอิงระบบ (Kiosk ID)' required value={draft.kioskId} onChange={(value) => update('kioskId', value)} placeholder='ระบบจะสร้างให้อัตโนมัติ' disabled={isNewDraft} />
                    </div>
                  </section>
                </div>
              </Popup>
            ) : null}
          </>
        ) : null}

        {isTicketSettings ? ticketSettingsContent : null}

        {/* ตั้งค่าตู้ Kiosk แบบป๊อปอัป — เนื้อหาเดียวกับหน้าเต็ม ใช้ state ชุดเดียวกัน */}
        <Popup
          open={kioskSettingsOpen}
          onClose={() => setKioskSettingsOpen(false)}
          title='ตั้งค่าตู้ Kiosk'
          size='extraLarge'
          secondaryAction={{ label: 'ปิด', onClick: () => setKioskSettingsOpen(false) }}
          primaryAction={{
            label: 'บันทึก',
            onClick: () => { setTicketSaved(true); window.setTimeout(() => setTicketSaved(false), 2400); setKioskSettingsOpen(false); },
          }}
        >
          {ticketSettingsContent}
        </Popup>

        <Popup
          open={displaySettingsOpen}
          onClose={() => setDisplaySettingsOpen(false)}
          title='ตั้งค่าจอแสดงผลการเรียกคิว (TV)'
          size='extraLarge'
          secondaryAction={{ label: 'ปิด', onClick: () => setDisplaySettingsOpen(false) }}
          primaryAction={{
            label: 'บันทึก',
            onClick: () => { setMonitorSaved(true); window.setTimeout(() => setMonitorSaved(false), 2400); setDisplaySettingsOpen(false); },
          }}
        >
          {displaySettingsContent}
        </Popup>

        {isDisplayList ? (
          <SectionCard
            icon='tv'
            title='รายการจอแสดงผลการเรียกคิว'
            subtitle='ทะเบียนจอทั้งหมดของศูนย์ · ตำแหน่งที่ติดตั้ง และจุดบริการที่แต่ละจอแสดงคิวให้'
            action={(
              <div className='flex items-center' style={{ gap: 'var(--dim-space-200)' }}>
                <NeutralSubdueButton size='md' variant='outline' leadingIcon='settings' onClick={() => setDisplaySettingsOpen(true)}>
                  ตั้งค่าหน้าจอ
                </NeutralSubdueButton>
                <BrandPrimaryButton size='md' leadingIcon='add' onClick={() => setMonitorDraft(blankMonitor())}>
                  เพิ่มจอแสดงผลการเรียกคิว
                </BrandPrimaryButton>
              </div>
            )}
          >
            {monitorSaved ? <div role='status' style={{ marginBottom: 'var(--dim-space-300)', color: 'var(--text-positive-default)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>บันทึกจอแสดงผลเรียบร้อยแล้ว</div> : null}
            <Table columns={monitorColumns} rows={monitors} rowKey={(row) => row.id} />

            <Popup
              open={!!monitorDraft}
              onClose={() => setMonitorDraft(null)}
              title={monitors.some((m) => m.id === monitorDraft?.id) ? 'แก้ไขจอแสดงผลการเรียกคิว' : 'เพิ่มจอแสดงผลการเรียกคิว'}
              /* ฟอร์มถามครบทุกคอลัมน์ของทะเบียน (มติผู้ใช้ 31 ส.ค. 69) — เดิมไม่ถาม
                 จุดบริการที่จะแสดงบนจอ จอที่เพิ่งเพิ่มจึงเข้าตารางแบบว่างเปล่าแล้ว
                 ต้องไปตั้งต่ออีกที่ */
              size='large'
              tertiaryAction={{ label: 'ยกเลิก', onClick: () => setMonitorDraft(null) }}
              primaryAction={{
                label: 'บันทึก',
                onClick: saveMonitor,
                disabled: !monitorDraft?.name.trim() || !monitorDraft?.location.trim() || !monitorDraft?.floor || !monitorDraft?.layout || !monitorDraft?.stationIds.length,
              }}
            >
              {monitorDraft ? (
                <div className='flex flex-col w-full' style={{ gap: 'var(--dim-space-400)' }}>
                  {/* ชุดช่องล้อกับฟอร์มเพิ่มตู้บริการ (มติผู้ใช้ 31 ส.ค. 69) —
                      ตำแหน่ง/ชั้น · จำนวนคลินิกที่แสดง (คู่กับ "ประเภทตู้") ·
                      ชื่อ · รหัสที่แสดง · รหัสอ้างอิงระบบ */}
                  <div className='grid grid-cols-1 md:grid-cols-2' style={{ gap: 'var(--dim-space-400)' }}>
                    <InputField
                      size='md'
                      label='ตำแหน่งที่ติดตั้ง'
                      required
                      value={monitorDraft.location}
                      onChange={(value) => setMonitorDraft((current) => ({ ...current, location: value }))}
                      placeholder='เช่น โถงชั้น 1 · หน้าห้องตรวจ'
                    />
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 640 }}>
                      <FieldLabel required>จำนวนคลินิกที่แสดงบนจอ</FieldLabel>
                      <Dropdown
                        size='md'
                        value={monitorDraft.layout}
                        /* ลดจำนวนคลินิกแล้วต้องตัดจุดบริการส่วนเกินทิ้ง ไม่งั้นจะเหลือ
                           จุดที่ติ๊กไว้มากกว่าช่องที่จอมีจริง (มติผู้ใช้ 31 ส.ค. 69) */
                        onChange={(layout) => setMonitorDraft((current) => ({
                          ...current,
                          layout,
                          stationIds: current.stationIds.slice(0, Number(layout) || 0),
                        }))}
                        options={MONITOR_LAYOUTS}
                        placeholder='เลือกจำนวนคลินิก'
                      />
                    </div>
                    <div className='flex flex-col' style={{ gap: 'var(--dim-space-150)', maxWidth: 640 }}>
                      <FieldLabel required>ชั้น</FieldLabel>
                      <Dropdown
                        size='md'
                        value={monitorDraft.floor}
                        onChange={(floor) => setMonitorDraft((current) => ({ ...current, floor }))}
                        options={FLOOR_OPTIONS}
                        placeholder='เลือกชั้น'
                      />
                    </div>
                    <InputField
                      size='md'
                      label='ชื่อจอ'
                      required
                      value={monitorDraft.name}
                      onChange={(value) => setMonitorDraft((current) => ({ ...current, name: value }))}
                      placeholder='เช่น จอโถงผู้ป่วยนอก'
                    />
                    <InputField
                      size='md'
                      label='รหัสจอ (แสดงบนจอ)'
                      required
                      value={monitorNumberLabel(monitorDraft.number)}
                      onChange={() => {}}
                      disabled
                    />
                    <InputField
                      size='md'
                      label='รหัสอ้างอิงระบบ (Display ID)'
                      required
                      value={monitorDraft.displayId}
                      onChange={() => {}}
                      disabled
                    />
                  </div>

                  <div className='flex flex-col' style={{ gap: 'var(--dim-space-200)' }}>
                    <FieldLabel required>
                      {monitorDraft.layout
                        ? `จุดบริการที่แสดงบนจอ (เลือกได้ ${monitorDraft.layout} จุด · เลือกแล้ว ${monitorDraft.stationIds.length})`
                        : 'จุดบริการที่แสดงบนจอ — เลือกจำนวนคลินิกก่อน'}
                    </FieldLabel>
                    <div className='grid grid-cols-1 sm:grid-cols-2' style={{ gap: 'var(--dim-space-200)' }}>
                      {QUEUE_STATIONS.filter((station) => station.active).map((station) => (
                        <Checkbox
                          key={station.id}
                          checked={monitorDraft.stationIds.includes(station.id)}
                          /* ติ๊กได้ไม่เกินจำนวนคลินิกที่จอแสดง — ครบแล้วช่องที่เหลือ
                             ปิดไว้ ไม่ปล่อยให้ติ๊กแล้วค่อยไปเด้งตอนบันทึก */
                          disabled={!monitorDraft.stationIds.includes(station.id)
                            && monitorDraft.stationIds.length >= (Number(monitorDraft.layout) || 0)}
                          onChange={(next) => setMonitorDraft((current) => {
                            const on = typeof next === 'boolean' ? next : !current.stationIds.includes(station.id);
                            if (on && current.stationIds.length >= (Number(current.layout) || 0)) return current;
                            return {
                              ...current,
                              stationIds: on
                                ? [...current.stationIds, station.id]
                                : current.stationIds.filter((id) => id !== station.id),
                            };
                          })}
                          label={`${station.prefix} · ${station.label}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </Popup>
          </SectionCard>
        ) : null}

        {isDisplaySettings ? displaySettingsContent : null}

        <Popup
          open={!!activeChange}
          onClose={() => setActiveChange(null)}
          title={activeChange?.active ? 'ยืนยันการเปิดใช้งานตู้บริการ' : 'ยืนยันการปิดใช้งานตู้บริการ'}
          subtitle={activeChange?.active
            ? `ต้องการเปิดใช้งาน ${activeChange?.kiosk.kioskName} ใช่หรือไม่`
            : `ต้องการปิดใช้งาน ${activeChange?.kiosk.kioskName} ใช่หรือไม่`}
          tertiaryAction={{ label: 'ยกเลิก', onClick: () => setActiveChange(null) }}
          primaryAction={{ label: 'ยืนยัน', onClick: confirmActiveChange }}
        >
          <p style={{ margin: 0, color: 'var(--text-content-secondary)', fontFamily: 'var(--type-family-body)', fontSize: 'var(--type-size-sm)' }}>
            {activeChange?.active ? 'ผู้รับบริการจะสามารถใช้งานตู้บริการนี้ได้ทันที' : 'ผู้รับบริการจะไม่สามารถใช้งานตู้บริการนี้ได้จนกว่าจะเปิดใช้งานอีกครั้ง'}
          </p>
        </Popup>
      </div>
    </QueuePageShell>
  );
};

export default QueueKioskSettingsPage;
