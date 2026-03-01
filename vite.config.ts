import { resolve } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'confab/static/app',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'frontend/src/main.ts'),
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
