import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

dotenv.config();

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [
    react(),
    {
      name: 'postbuild',
      closeBundle() {
        if (process.env.CI) {
          console.log('Skipping zebar.exe task because this is a CI build');
          return;
        }

        const exePath = process.env.ZEBAR_EXE_PATH || 'zebar.exe';

        try {
          execSync(`taskkill /IM ${exePath} /F`, { stdio: 'inherit' });
        } catch (err) {
          console.log((err as Error).message);
        }

        execSync(`start ${exePath}`, { stdio: 'inherit' });
      },
    },
  ],
  base: './',
});
