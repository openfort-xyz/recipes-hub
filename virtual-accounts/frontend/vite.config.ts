import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dedicated port so it doesn't collide with other recipe dev servers.
  // Noah's hosted KYC needs an HTTPS return URL, so dev runs behind a tunnel:
  // `host: true` binds it, and the allowlist stops Vite 403-ing the tunnel host.
  server: {
    host: true,
    port: 5182,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com', '.ngrok.app', '.ngrok-free.app', '.ngrok.io'],
  },
})
