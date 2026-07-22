import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dedicated port so it doesn't collide with other recipe dev servers.
  server: { port: 5181, strictPort: true },
})
