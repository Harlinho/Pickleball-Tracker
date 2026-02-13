import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appVersion = process.env.GITHUB_SHA?.slice(0, 8) ?? process.env.npm_package_version ?? 'dev';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages project site path: /<repo-name>/
  base: command === 'build' ? '/Pickleball-Tracker/' : '/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  }
}));
