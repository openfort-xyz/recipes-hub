import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The Zama relayer SDK ships WASM; excluding it from dep pre-bundling avoids
  // the esbuild "wrong relayer url / __wbindgen_malloc" class of init failures.
  optimizeDeps: {
    exclude: ['@zama-fhe/relayer-sdk'],
  },
  // Dedicated port so it doesn't collide with other recipe dev servers.
  server: { port: 5182, strictPort: true },
})
