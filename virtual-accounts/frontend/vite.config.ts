import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dedicated port so it doesn't collide with other recipe dev servers.
  // `host: true` lets a tunnel (needed for Noah's hosted KYC) reach it.
  server: { host: true, port: 5182, strictPort: true },
})
