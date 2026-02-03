import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración básica para que React funcione perfectamente en Vercel
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
