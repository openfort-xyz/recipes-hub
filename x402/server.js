import { config } from "dotenv";
import { createServer } from "http";

import { createPaywallServer } from "./server/app.js";
import { resolveEnvironment } from "./server/config/environment.js";

// Load .env.local
config({ path: ".env.local" });

const env = resolveEnvironment();
const requestHandler = createPaywallServer(env);

console.log(`
🚀 x402 Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Running on: http://localhost:${env.port}
🎯 Paying to: ${env.paywall.payToAddress}
🔗 Network: ${env.paywall.payment.network}
📋 Frontend should be on: http://localhost:5173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const server = createServer(requestHandler);

server.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
