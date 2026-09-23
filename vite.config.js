import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

function copyIsvDocs() {
  return {
    name: 'copy-isv-tracker-docs',
    closeBundle() {
      for (const filename of ['ISV_TRACKER_설치_가이드.md', 'ISV_TRACKER_온보딩_가이드.md']) {
        copyFileSync(resolve(__dirname, filename), resolve(__dirname, 'dist', filename))
      }
    },
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react(), copyIsvDocs()],
  base: command === 'serve' ? '/' : '/isvtracker/', // 로컬: /, GitHub Pages: /isvtracker/
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: { input: resolve(__dirname, 'index.html') },
  },
}))
