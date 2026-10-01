import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // В деве /api идёт на локальный бэкенд, в проде это делает Caddy
    proxy: { '/api': 'http://localhost:8080' },
  },
})
