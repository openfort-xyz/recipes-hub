import express from "express";
import { config } from "dotenv";
import { loadConfig } from "./config.js";
import { createOpenfortClient } from "./openfort.js";
import { handleHealth, handleShieldSession, handleProtectedContent } from "./routes.js";

// Load .env.local
config({ path: ".env.local" });

const env = loadConfig();
const openfortClient = createOpenfortClient(env.openfort.secretKey);

const app = express();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  const origin = env.allowedOrigins[0] || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, X-TRANSACTION-HASH");
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Routes
app.get("/api/health", handleHealth);
app.post("/api/protected-create-encryption-session", (req, res) => handleShieldSession(req, res, openfortClient, env.openfort.shield));
app.all("/api/protected-content", (req, res) => handleProtectedContent(req, res, env.paywall));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

console.log(`
🚀 x402 Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Running on: http://localhost:${env.port}
🎯 Paying to: ${env.paywall.payToAddress}
🔗 Network: ${env.paywall.payment.network}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

app.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
