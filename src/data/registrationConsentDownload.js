import { downloadConsentFormPdf } from '@/data/consentFormDownload';
import { getRegistrationConsentForm } from '@/data/registrationConsentForms';

/* PHCIS | เวชระเบียน · ขั้นที่ 1 — ดาวน์โหลดใบยินยอมเป็น PDF (ด.1.1.15)

   ใช้เครื่องปั๊ม PDF ตัวเดียวกับระบบจัดการความยินยอม (`consentFormDownload`)
   ต่างกันแค่ต้องแปลงการ์ดของขั้นลงทะเบียนให้เป็นรูป record ที่ตัวปั๊มอ่านได้
   และส่ง `sections` ซึ่งเป็นตัวบทจริงของใบนั้นไปด้วย ไม่ใช้ข้อสัญญากลางของ wizard */

/** ขอบเขตการใช้งานที่พิมพ์บนหัวเอกสาร — ใบของขั้นลงทะเบียนใช้ที่เดียวกันทุกใบ */
const REGISTRATION_SCOPE = [{
  group: 'สำนักอนามัย',
  subBranch: 'ศูนย์บริการสาธารณสุข',
  dept: 'งานเวชระเบียน',
}];

export const downloadRegistrationConsentPdf = (card) => {
  const meta = getRegistrationConsentForm(card?.id || card?.code) || {};
  return downloadConsentFormPdf({
    id: card?.id || card?.code || meta.id,
    code: card?.code || card?.id || meta.id,
    name: card?.title || meta.title,
    type: card?.categoryLabel || meta.categoryLabel,
    version: card?.version || meta.version,
    scopes: REGISTRATION_SCOPE,
    sections: (meta.clauses || []).map((c) => ({
      title: c.title,
      detail: c.detail,
    })),
  });
};
