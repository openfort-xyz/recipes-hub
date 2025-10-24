import type { IncomingMessage, ServerResponse } from "http";
import { createServer } from "http";
import { config } from "dotenv";
import { loadConfig, type Config } from "./config.js";
import { createOpenfortClient } from "./openfort.js";
import { handleHealth, handleShieldSession, handleProtectedContent } from "./routes.js";

// Load .env.local
config({ path: ".env.local" });

function setCorsHeaders(res: ServerResponse, allowedOrigins: string[]): void {
  const origin = allowedOrigins[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, X-TRANSACTION-HASH");
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  config: Config,
  openfortClient: ReturnType<typeof createOpenfortClient>
): Promise<void> {
  setCorsHeaders(res, config.allowedOrigins);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname === "/api/health" && req.method === "GET") {
      await handleHealth(req, res);
    } else if (pathname === "/api/shield-session" && req.method === "POST") {
      await handleShieldSession(req, res, openfortClient, config.openfort.shield);
    } else if (pathname === "/api/protected-content") {
      await handleProtectedContent(req, res, config.paywall);
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    }
  } catch (error) {
    console.error("Server error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}

const env = loadConfig();
const openfortClient = createOpenfortClient(env.openfort.secretKey);

console.log(`
🚀 x402 Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Running on: http://localhost:${env.port}
🎯 Paying to: ${env.paywall.payToAddress}
🔗 Network: ${env.paywall.payment.network}
📋 Frontend should be on: http://localhost:5173
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

const server = createServer((req, res) => handleRequest(req, res, env, openfortClient));

server.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
