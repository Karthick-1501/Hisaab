import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the backend during development
      '/upload': 'http://localhost:3001',
      '/review': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/dashboard': 'http://localhost:3001',
      '/budgets': 'http://localhost:3001',
      '/transactions': 'http://localhost:3001',
    },
  },
})
