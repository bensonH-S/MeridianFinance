import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/financas/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5080', timeout: 300000, proxyTimeout: 300000 },
    },
  },
}))
