import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project site path: /<repo-name>/
  base: command === 'build' ? '/Pickleball-Tracker/' : '/'
}));
