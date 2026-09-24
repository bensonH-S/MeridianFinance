import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/financas/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    proxy: {
      '/api': {
        target: 'https://grupoalvim.com.br',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => `/financas${path}`,
      },
    },
  },
}))
