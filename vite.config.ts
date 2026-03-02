import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'confab/static/app',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(ROOT_DIR, 'frontend/src/main.ts'),
      output: {
        entryFileNames: 'gui.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'gui.css';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
