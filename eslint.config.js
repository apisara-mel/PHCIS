import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import react from 'eslint-plugin-react';

/* ESLint — ตั้งไว้เพื่อดักบั๊กชนิดเดียว: อ้างตัวแปรที่ไม่มีอยู่จริง
   ══════════════════════════════════════════════════════════════════════
   26 ส.ค. 2569: เจอจอขาวจาก ReferenceError 6 ครั้งในวันเดียว (PERM_NONE ·
   PERM_HEADERS · ALL_MODULE_KEYS · findCenterDetail · hasRecords ·
   ACCESS_SYSTEMS) ทุกครั้ง `npm run build` ผ่านหมด เพราะ esbuild ไม่ตรวจ
   ตัวแปรที่ไม่ได้ประกาศ — บั๊กจึงไปโผล่ตอนผู้ใช้กดใช้งานจริง

   กับดักที่เจอบ่อยที่สุดคือบล็อก `export { X } from '...'` ซึ่งเป็น re-export
   ล้วน ไม่ได้สร้าง binding ในไฟล์ตัวเอง อ้าง X ตรง ๆ ในไฟล์นั้นจึงพัง

   ตั้งใจเปิดกฎเท่าที่จำเป็น (no-undef เป็น error, ตัวแปรไม่ได้ใช้เป็น warn)
   ไม่ใช่ชุดจัดรูปแบบโค้ด — จะได้ไม่มี noise จนไม่มีใครรัน */
export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    /* ลงทะเบียนปลั๊กอินไว้เพื่อให้คอมเมนต์ eslint-disable ของ
       react-hooks/exhaustive-deps ที่มีอยู่เดิมทั่วโปรเจกต์ resolve ได้
       (ไม่งั้น eslint ฟ้อง "rule not found" 384 จุดจนกฎจริงจมหาย)
       ตัวกฎเองยังไม่เปิด — เป็นงานเก็บกวาดรอบหน้า */
    plugins: { 'react-hooks': reactHooks, react },
    linterOptions: {
      /* ปิดไว้ — กฎ react/react-hooks ยังไม่เปิด คอมเมนต์ disable ที่มีอยู่เดิม
         จึงถูกนับว่า "ไม่ได้ใช้" 386 จุด กลบผลลัพธ์จริงหมด */
      reportUnusedDisableDirectives: false,
    },
    rules: {
      'no-undef': 'error',
      /* ปิดไว้ก่อน — โค้ดเดิมมี import ที่ไม่ได้ใช้อยู่หลายพันจุด เปิดแล้ว
         no-undef จะจมหายไปใน noise จนไม่มีใครรัน (ค่อยเปิดตอนเก็บกวาดรอบหน้า) */
      'no-unused-vars': 'off',
    },
  },
];
