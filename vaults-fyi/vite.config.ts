import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env (including non-VITE_ vars). VAULTS_FYI_API_KEY is server-side
  // only — it never reaches the browser bundle. The dev proxy below adds the
  // x-api-key header on every request to /api/vaults-fyi/*.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/vaults-fyi": {
          target: "https://api.vaults.fyi",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/vaults-fyi/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (env.VAULTS_FYI_API_KEY) {
                proxyReq.setHeader("x-api-key", env.VAULTS_FYI_API_KEY);
              }
            });
          },
        },
      },
    },
  };
});
