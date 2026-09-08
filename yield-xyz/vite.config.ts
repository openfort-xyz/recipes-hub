import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env (including non-VITE_ vars). YIELD_XYZ_API_KEY is server-side
  // only — it never reaches the browser bundle. The dev proxy below adds the
  // X-API-KEY header on every request to /api/yield-xyz/*.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/yield-xyz': {
          target: 'https://api.yield.xyz/v1',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/yield-xyz/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.YIELD_XYZ_API_KEY) {
                proxyReq.setHeader('X-API-KEY', env.YIELD_XYZ_API_KEY)
              }
            })
          },
        },
      },
    },
  }
})
