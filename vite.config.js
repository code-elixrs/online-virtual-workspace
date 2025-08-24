import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['c6f2a663c192.ngrok-free.app'], // Replace with your actual host
  }
})
