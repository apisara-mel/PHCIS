/* ใบรับรอง self-signed สำหรับ dev server ที่ต้องเป็น https

   ทำไมต้องมี: `getUserMedia` (กล้อง/ไมค์) ทำงานเฉพาะใน secure context.
   `localhost` นับว่าปลอดภัยอยู่แล้ว แต่ `http://192.168.x.x` ไม่นับ — มือถือที่
   เปิดหน้าผู้รับบริการผ่าน IP ของ LAN จึงเปิดกล้องไม่ได้เลยถ้าไม่ใช่ https.

   ทำไมไม่ใช้ `server.https: true` ของ Vite: Vite 2 สร้างใบรับรองด้วยพารามิเตอร์
   เก่า (คีย์สั้น/ลายเซ็นเก่า) ซึ่ง OpenSSL 3 ใน Node รุ่นใหม่ปฏิเสธ — เซิร์ฟเวอร์
   ขึ้นได้แต่ TLS handshake ล้มทุกครั้ง (curl ตอบ error 35). ที่นี่จึงออกเองด้วย
   `openssl` (ติดมากับ macOS) เป็น RSA 2048 + SHA-256 พร้อม SAN ครบ.

   ใบรับรองเก็บใน `.dev-certs/` (อยู่ใน .gitignore) และสร้างครั้งเดียว. */

import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DIR = '.dev-certs';
const KEY = path.join(DIR, 'dev-key.pem');
const CRT = path.join(DIR, 'dev-cert.pem');

/** IPv4 ของเครื่องบน LAN — ใส่เป็น SAN เพื่อให้มือถือเตือนน้อยที่สุด */
const lanAddresses = () => {
  try {
    return Object.values(os.networkInterfaces())
      .flat()
      .filter((n) => n && n.family === 'IPv4' && !n.internal)
      .map((n) => n.address);
  } catch {
    /* บาง Node/macOS โยน uv_interface_addresses — ไม่ใช่เหตุให้ล้มทั้ง dev server */
    return [];
  }
};

const buildCert = (extraIps) => {
  fs.mkdirSync(DIR, { recursive: true });
  const ips = ['127.0.0.1', ...extraIps];
  const san = ['DNS:localhost', ...ips.map((ip) => `IP:${ip}`)].join(',');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
    '-days', '365',
    '-keyout', KEY,
    '-out', CRT,
    '-subj', '/CN=MIH PHCIS dev',
    '-addext', `subjectAltName=${san}`,
  ], { stdio: 'ignore' });
};

/**
 * คืนค่า `server.https` ให้ Vite — หรือ false เมื่อออกใบรับรองไม่ได้
 * (ไม่มี openssl / ไม่มีสิทธิ์เขียน) เพื่อให้ dev server ยังขึ้นเป็น http ได้ตามเดิม
 */
export const devHttpsOptions = (hint) => {
  const extraIps = [...new Set([...(hint ? [hint] : []), ...lanAddresses()])]
    .filter((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
  try {
    if (!fs.existsSync(KEY) || !fs.existsSync(CRT)) buildCert(extraIps);
    return { key: fs.readFileSync(KEY), cert: fs.readFileSync(CRT) };
  } catch {
    try { buildCert(extraIps); return { key: fs.readFileSync(KEY), cert: fs.readFileSync(CRT) }; } catch {
      console.warn('\n  [dev-cert] ออกใบรับรองไม่สำเร็จ — dev server จะขึ้นเป็น http\n'
        + '  มือถือจะเปิดกล้อง/ไมค์ไม่ได้ผ่าน IP ของ LAN (ต้องเป็น secure context)\n');
      return false;
    }
  }
};

export default devHttpsOptions;
