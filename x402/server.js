import { config } from "dotenv";
import { serve } from "@hono/node-server";

import { createPaywallServer } from "./server/app.js";
import { resolveEnvironment } from "./server/config/environment.js";

// Load .env.local
config({ path: ".env.local" });

const env = resolveEnvironment();
const app = createPaywallServer(env);

console.log(`
🚀 x402 Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Running on: http://localhost:${env.port}
🎯 Paying to: ${env.paywall.payToAddress}
🔗 Network: ${env.paywall.payment.network}
📋 Frontend should be on: http://localhost:5173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

serve({
  fetch: app.fetch,
  port: env.port,
});
