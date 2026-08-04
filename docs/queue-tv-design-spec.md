# จอ TV เรียกคิว (Queue Display) — สเปกจาก Figma

ที่มา: Figma `PHCIS | Screening` file `tobdR9prwt00v4X3aSMsxF` (สั่งโดย user 4 ส.ค. 2026)
เป็นส่วนหนึ่งของ TOR §1.3.4 "การแสดงผลการเรียกคิว" (และรองรับ 1.3.3 เรียกคิว / 1.3.5 เสร็จสิ้นคิว)

Builder **ต้องเรียก `get_design_context` ของ Figma MCP เองก่อนเขียนโค้ด** (โหลด guidance `skill://figma/figma-design-to-code/SKILL.md` ผ่าน ReadMcpResourceTool ก่อน แล้วส่ง `skillNames: "resource:figma-design-to-code"`) — เอกสารนี้เป็นสรุปกำกับ ไม่ใช่ตัวแทนของ design context

## 3 เลย์เอาต์ (คนละ node — ทำครบทั้งสาม)

| ชื่อ | node-id | ใช้เมื่อ | โครงหน้าจอ |
|---|---|---|---|
| **TV1 — จุดพักคอยรวม (Main Hall)** | `129:62395` | จอโถงรวม แสดงหลายแผนกพร้อมกัน | 3 คอลัมน์เท่ากัน (แผนกซักประวัติ / รอเข้าห้องตรวจ / การเงินและรับยา) |
| **TV2 — จอเฉพาะจุดบริการ** | `129:62394` | จอหน้าห้องตรวจ/จุดเดียว | ซ้าย: แถบ "กำลังเรียก + ห้องตรวจ 3" + เลขคิวยักษ์ + "เรียกล่าสุดเวลา HH:MM น." · ขวา: แถบ "คิวถัดไป" ไล่ 6 คิว + "คิวที่เหลือทั้งหมด" · ล่างซ้าย: หมายเลขที่เรียกผ่านไปแล้ว (Passed Numbers) |
| **TV3 — การเงินและรับยา** | `129:62393` | จอโซนการเงิน/ห้องยา | 2 คอลัมน์ (คิวชำระเงิน / คิวรับยา) |

ทุกจอออกแบบที่ **1920×1270** (16:9 ต่อขอบล่างเป็นแถบประกาศ) — ต้องสเกลได้เต็มจอจริงด้วย `vw/vh` หรือ transform scale ไม่ใช่ fix 1920px

## โครงร่วมของทุกจอ

1. **Header (สูง 117px, เส้นใต้ 2px `--dim-stroke-200`)**
   - ซ้าย: โลโก้สำนักอนามัย 68×68 + "สำนักอนามัย" (24px bold) + ชื่อศูนย์ (20px) — ใช้โลโก้จริงจาก asset ที่ export มา ห้ามวาดใหม่
   - กลาง: ชื่อจุดบริการ 36px (`--typography-size-4xl`) จัดกึ่งกลาง
   - ขวา: ไอคอนนาฬิกา 24px + เวลาเดินจริง `HH:MM:SS` (30px bold) + วันที่ไทย พ.ศ. (20px)
2. **แถบประกาศล่าง (สูง 64px)** — พื้น gradient `linear-gradient(90deg, #00A4AC 0%, #1FA091 100%)` (ข้อยกเว้น gradient ตาม CLAUDE.md ใช้ inline ได้), ข้อความขาว 24px, "Announcement:" + ข้อความวิ่ง (marquee เลื่อนเมื่อยาวเกินจอ)
3. **การ์ดคิวต่อจุดบริการ** (ใช้ซ้ำทั้ง 3 จอ — ทำเป็น component เดียว)
   - หัวการ์ด สูง 72px พื้นสีประจำแผนก มุมบน radius 24px ตัวอักษรขาว 30px
   - "หมายเลขปัจจุบัน" 24px → กล่องขาว border 6px สีประจำแผนก radius 24px → เลขคิว **112px extra-bold** letter-spacing -5.6px
   - แถบ "คิวถัดไป" 48px พื้น `#F3F4F6` → รายการ 4 แถว สูง 80px สลับพื้นขาว/`#F9FAFB`: ซ้าย "คิวที่ N" 30px สีรอง, ขวา เลขคิว 48px bold
   - แถวสถานะพิเศษใช้ `ColorfulBadge` orange เช่น "กำลังจัดเตรียมยา" (TV3 คิวรับยา)
   - "คิวที่เหลือทั้งหมด" 18px + ตัวเลข 24px bold
   - "หมายเลขที่เรียกผ่านไปแล้ว:" + ชิปเลขคิว (พื้น `#F5F6F7` radius 12px สูง 48px) + บรรทัดเตือนไอคอน `triangle-alert` + ข้อความแดง 20px "หมายเลขที่เรียกผ่านไปแล้ว กรุณาติดต่อเจ้าหน้าที่"

## การ map token (สำคัญ — CLAUDE.md บังคับ)

| ค่าใน Figma | ใช้ token | หมายเหตุ |
|---|---|---|
| radius 24px | `var(--dim-radius-600, 24px)` | ✅ ตรง |
| radius 12px | `var(--dim-radius-400, 12px)` | ✅ ตรง |
| space 4/8/12/16/24/32/48 | `--dim-space-100/200/300/400/600/800/1200` | ✅ ตรง |
| สีม่วง `#818CF8` | `var(--surface-colorfulbadge-indigo-bold, #818CF8)` | ✅ ตรงเป๊ะ |
| badge ส้ม `#FFEDD5` / `#C2410C` | `--surface-colorfulbadge-orange` / `--text-colorfulbadge-orange` | ✅ ใช้ `ColorfulBadge` เดิมเลย |
| ข้อความรอง `#636B72` | `var(--text-content-secondary, #636B72)` | ✅ ตรง |
| **สีชมพู `#F472B6`** | ❌ ไม่มีใน DS (ที่ใกล้สุด `--surface-colorfulbadge-pink-bold: #EC4899`) | ใช้ pink-bold แล้ว**บันทึกใน awaiting/รายงาน**ว่า Figma ใช้ pink/400 ที่ยังไม่มี token |
| **สีฟ้า `#60A5FA`** | ❌ ไม่มี surface token (มี `--surface-colorfulbadge-blue-bold: #3B82F6`) | ใช้ blue-bold + รายงานเช่นกัน |
| **เทาพื้น `#F9FAFB` / `#F3F4F6` / `#F5F6F7`** | ใกล้สุด `--surface-neutralButton-quaternary: #F9FBFB`, `--surface-neutral-tertiary: #F4F5F5` | ใช้ของใกล้สุด + รายงาน |
| **ข้อความเข้ม `#0F172A`** | ใช้ `var(--text-content-primary)` | ตัวเลขคิวใช้ token นี้ |
| **แดงเตือน `#F04242`** | ใกล้สุด `--text-danger-secondary: #DC2626` | ใช้ของ DS + รายงาน |
| gradient teal ล่าง | inline `linear-gradient(90deg,#00A4AC,#1FA091)` | ✅ ข้อยกเว้น gradient |
| ฟอนต์ Mitr / Inter / Sarabun | ใช้ family ที่ repo มีอยู่แล้ว | อย่า import ฟอนต์ใหม่ถ้า repo ยังไม่มี |

ทุกช่องที่ทำเครื่องหมาย ❌ ให้ใส่ไว้ใน `newComponents`/`notes` ของ manifest เพื่อให้ integrator ลงบันทึกเป็น token ที่ต้องเสนอเข้า mih-design (repo นั้น read-only สำหรับเรา)

## พฤติกรรม (ต้องมี ไม่ใช่ภาพนิ่ง)

- นาฬิกาเดินจริงทุกวินาที (`setInterval` + cleanup) วันที่เป็น พ.ศ. ภาษาไทย
- คิวอัปเดตอัตโนมัติจาก mock store (`setInterval` จำลองการเรียกคิวใหม่ทุก ~15 วิ) — เลขปัจจุบันเปลี่ยน + เด้ง animation + คิวถัดไปเลื่อนขึ้น
- เรียกคิวใหม่ → เอฟเฟกต์กระพริบ/สเกลที่กล่องเลขคิว + (mock) เสียงเรียกด้วย SpeechSynthesis ถ้ามี ให้ปิด/เปิดได้และไม่พังถ้า browser ไม่รองรับ
- แถบประกาศเลื่อนอัตโนมัติเมื่อข้อความยาวเกินความกว้าง
- Auto-refresh/heartbeat: ถ้า data หยุดอัปเดตเกิน N วินาที แสดงสถานะ "กำลังเชื่อมต่อ..." (edge case จอค้าง)
- โหมดเต็มจอ (fullscreen API) + ซ่อน cursor เมื่อไม่ขยับ — จอ TV ไม่มีคนคุม
- ไม่มี interaction อื่นเลย (ไม่มีปุ่ม/ฟอร์ม) — เป็นจอแสดงผลอย่างเดียว

## Route ที่ต้องสร้าง

```
/queue-center/display            → เลือก/สลับเลย์เอาต์ตาม query (?layout=hall|station|finance&zone=...)
/queue-center/display/hall       → TV1
/queue-center/display/station    → TV2 (รับ ?room= / ?dept=)
/queue-center/display/finance    → TV3
```

จอเหล่านี้ต้อง render **นอก layout หลัก** (ไม่มี Sidebar/Header ของแอป) — เช็ควิธีที่ `/kiosk` กับ `MobileTicketPage` ทำ standalone layout แล้วทำแบบเดียวกัน

## Edge cases ที่ต้องครอบคลุม

- ยังไม่มีคิวเลย (แสดง "-" หรือ "ยังไม่มีคิว" ไม่ใช่ค้างว่าง)
- คิวถัดไปน้อยกว่า 4 รายการ (แถวว่างต้องไม่พัง layout)
- เลขคิวยาวผิดปกติ (เช่น 6 ตัวอักษร) ต้องไม่ล้นกล่อง
- ไม่มีหมายเลขที่เรียกผ่าน → ซ่อนทั้งบล็อกรวมบรรทัดเตือน
- ชื่อจุดบริการ/ประกาศยาวมาก → ตัดด้วย ellipsis หรือ marquee
- จอสัดส่วนอื่น (16:10, 4:3) และ TV 4K → ต้องสเกลได้ไม่แตก
