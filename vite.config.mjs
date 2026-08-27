import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import path from 'path';
import { fileURLToPath } from 'url';
import { telemedSignalRelay } from './scripts/vite-telemed-relay.mjs';
import { devHttpsOptions } from './scripts/dev-cert.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Vite serves `.md` as `text/markdown` without a charset hint, which
   makes browsers fall back to Latin-1 — Thai content then renders as
   mojibake (`ถ่ายรูป` → `à¸–à¹‰à¸²à¸¢à¸£à¸¹à¸›`). Wrap `res.setHeader`
   so any markdown Content-Type gets `; charset=utf-8` appended before
   the header reaches the wire. */
const utf8MarkdownPlugin = () => ({
  name: 'utf8-markdown',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && /\.md(\?|$)/.test(req.url)) {
        const origSet = res.setHeader.bind(res);
        res.setHeader = (name, value) => {
          if (
            typeof name === 'string'
            && name.toLowerCase() === 'content-type'
            && typeof value === 'string'
            && /^text\/markdown/i.test(value)
            && !/charset/i.test(value)
          ) {
            return origSet(name, `${value}; charset=utf-8`);
          }
          return origSet(name, value);
        };
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  plugins: [reactRefresh(), utf8MarkdownPlugin(), telemedSignalRelay()],
  /* Avoid `uv_interface_addresses` crash on newer Node/macOS when Vite
     enumerates all network interfaces (default host). */
  server: {
    /* ปกติผูกกับ loopback (ดูหมายเหตุ uv_interface_addresses ด้านล่าง) แต่ตอน
       demo Telemedicine ต้องให้มือถือใน Wi-Fi เดียวกันเปิดหน้าผู้รับบริการได้
       → `npm run dev:lan` ตั้ง MIH_LAN=1 แล้วผูกกับทุก interface.
       ระบุ IP เองได้ด้วย MIH_LAN=<ip> ถ้าเครื่องมีหลายวง. */
    host: process.env.MIH_LAN
      ? (process.env.MIH_LAN === '1' ? '0.0.0.0' : process.env.MIH_LAN)
      : '127.0.0.1',
    /* กล้อง/ไมค์ (getUserMedia) ทำงานเฉพาะใน secure context — `localhost` ผ่าน
       แต่ `http://192.168.x.x` ไม่ผ่าน. มือถือที่เปิดผ่าน IP ของ LAN จึงต้องเป็น
       https ไม่งั้นสาย Telemedicine จะเปิดกล้องไม่ได้เลย. `dev:lan` เปิดให้อัตโนมัติ
       ด้วยใบรับรอง self-signed ของ Vite — เครื่องที่เปิดครั้งแรกต้องกด "ดำเนินการต่อ"
       ผ่านหน้าเตือนใบรับรองหนึ่งครั้ง. */
    https: process.env.MIH_HTTPS === '1'
      ? devHttpsOptions(process.env.MIH_LAN !== '1' ? process.env.MIH_LAN : null)
      : false,
    port: 3000,
    /* Google Drive sync writes placeholder files like `.!NNNNN!Foo.jsx`
       while pulling remote changes. These are ghost paths that vanish
       before the watcher can read them, so chokidar fires events on
       missing files → Vite/Tailwind blow up with ENOENT in dev. Ignore
       both the placeholders and macOS .DS_Store metadata. */
    watch: {
      ignored: ['**/.!*', '**/.DS_Store'],
    },
  },
  preview: { host: '127.0.0.1', port: 4173 },
});
