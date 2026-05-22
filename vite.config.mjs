import { defineConfig } from 'vite';
import reactRefresh from '@vitejs/plugin-react-refresh';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
  },
  plugins: [reactRefresh()],
  /* Avoid `uv_interface_addresses` crash on newer Node/macOS when Vite
     enumerates all network interfaces (default host). */
  server: {
    host: '127.0.0.1',
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
