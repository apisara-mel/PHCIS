# Code review PR #58 — Table content-fit (สำหรับเจ้าของงานตาราง/mih-table)

รีวิว 9 ส.ค. 2569 (adversarial: find → verify ต่อ finding) บน merge `87dacfd` + สภาพ head ปัจจุบัน
สถานะ: **ยืนยันแล้ว 10 · หักล้าง 2** — แก้ไปแล้ว 1 ข้อเล็ก (TabCountBadge token) ที่เหลือ**จงใจไม่แก้จาก session อื่น**เพราะ `Table.jsx` กำลังถูกแก้ต่อเนื่องอยู่ — ไฟล์นี้คือ handoff

## ควรแก้ (กลไก — เรียงตามแรงกระแทก)

1. **Perf: measure pass รันซ้ำแทบทุก re-render + รันคู่หลัง fonts.ready** (`Table.jsx:1263` + `:1130`)
   `sortConfig` default เป็น object literal สร้างใหม่ทุก render และอยู่ใน dep array → พิมพ์ search 1 ตัวอักษรบน worklist ใหญ่ = forced layout ~600+ ครั้ง แล้ว `document.fonts.ready.then` (resolved แล้ว) ยิงซ้ำอีกรอบเต็ม ๆ
   แก้: default เป็น module constant + ใช้ primitive ใน deps + (ถ้าไหว) batch clone ลง host เดียวให้ reflow ครั้งเดียว

2. **`columnFit='fixed'` (escape hatch ที่ประกาศไว้) พังเงียบ** (`Table.jsx:1390`)
   คอลัมน์ `{key,label}` เฉย ๆ ใน mode fixed ได้ body cell กว้าง 0 (header auto-size) และ flex column ได้ header `flex:'1 0 0'` แต่ body `flex:'1 1 0'` — ยังไม่มี consumer ใช้ mode นี้ จึงยังไม่ระเบิด แต่จะพังทันทีที่มีคนหยิบใช้

3. **EllipsisText tooltip ค้าง state เก่า** (`Table.jsx:155`)
   `isOverflow` คำนวณเฉพาะตอน text เปลี่ยน/window resize แต่ content-fit เปลี่ยนความกว้างคอลัมน์แบบ async → hover ข้อความที่เห็นเต็มแล้วยังเด้ง tooltip แก้: ResizeObserver บน span

4. **ComponentsLibraryPage TableSortLiveDemo คอลัมน์เบี้ยว** (`ComponentsLibraryPage.jsx:2429`)
   demo bypass `<Table>` แต่ยังอ่าน `c.width` ที่ PR ลบไป → `reduce(s+c.width)` = NaN, header/data ต่างคน auto-size — หน้า reference ของ DS เอง

## ควรตัดสินใจเชิงดีไซน์ (ไม่ใช่แก้กลไก)

5. **content-fit ฆ่า truncation/wrap ถาวรทั้ง ~140 consumer** (`Table.jsx:333` + CSS `:95`)
   nowrap + max-content ทุก descendant = คอลัมน์ note ยาว ~300 ตัวอักษร (เช่น RegistrationEditHistoryPanel ค่าเดิม/ค่าใหม่) ได้ minWidth ~2000px · badge cap (`StatusBadge` maxWidth:224 / `ColorfulBadge` capMaxWidth) ตายถาวรเพราะ attribute อยู่บน wrapper ตลอดเวลา ไม่ใช่เฉพาะตอนวัด
   ข้อเสนอ: รองรับ `c.maxWidth` เป็น ceiling ของค่าที่วัดได้ + จำกัด badge-override CSS ให้ทำงานเฉพาะช่วงวัด (หรือประกาศใน mih-table skill ให้ชัดว่า "no-truncate by design" แล้วกำหนดวิธีจัดการคอลัมน์ข้อความยาว)

6. **ข้อมูล 67-00026/28 ขัดกันสองไฟล์** (`patientProfiles.js:324` vs `mrPatients.js:248/280`)
   ฝั่งใหม่ให้ VN + แพทย์ + "ผู้ป่วยใหม่" แต่ mrPatients ยังเป็น รอลงทะเบียน/ไม่เคยรับบริการ → จอเภสัชกับคิวเวชระเบียนเล่าคนละเรื่อง — ของ session เภสัช ต้องเลือกความจริงหนึ่งเดียว

7. **headerFloorPx ผูก magic numbers** (`Table.jsx:262`) — `'400 12px Mitr'`/padX 32/sortW 18 ต้องตามให้ทัน token ถ้า HeaderCell เปลี่ยน — เสนออ่านผ่าน getComputedStyle จาก header จริง

## หักล้างแล้ว (อย่าเสียเวลาไล่ซ้ำ)

- **img ทำคอลัมน์บวมเท่ารูปจริง** — REFUTED ด้วย headless Chrome: ทุก `<img>` ใน Table ปัจจุบันมี height กำกับ → aspect-ratio transfer ทำให้ max-content = 36px ไม่ใช่ 1024px ⚠️ เงื่อนไขรอด: img ที่ตั้ง width อย่างเดียว (ไม่มี height) จะวัดเท่า natural width — กติกาควรบันทึกใน mih-table skill: "รูปในเซลล์ต้องกำหนด height เสมอ"
- **stickyLeft ชนกับ flex growth** — REFUTED (สอง state เกิดพร้อมกันไม่ได้)

แก้ไปแล้วในรอบนี้: `TabCountBadge.jsx` minWidth/height → `--dim-size-500/400` (กติกา token)
