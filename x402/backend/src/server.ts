import express from "express";
import { config } from "dotenv";
import { loadConfig } from "./config.js";
import { createOpenfortClient, resolveBackendWalletAddress } from "./openfort.js";
import {
  handleBackendWalletCreate,
  handleBackendWalletStatus,
  handleBackendWalletTestPayment,
  handleBackendWalletUpgrade,
  handleHealth,
  handleProtectedContent,
  handleShieldSession,
} from "./routes.js";

// Load .env.local
config({ path: ".env.local" });

const env = loadConfig();
// OPENFORT_WALLET_SECRET is required for backend wallet sign (X-Wallet-Auth); without it, account.sign() will fail.
const openfortClient = createOpenfortClient(env.openfort.secretKey, env.openfort.walletSecret || undefined);

const app = express();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && env.allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  } else if (env.allowedOrigins.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, X-TRANSACTION-HASH");
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

async function resolvePayToAddress(): Promise<void> {
  if (!openfortClient) {
    console.log("ℹ️  Backend wallet: skipped (OPENFORT_SECRET_KEY required)");
    return;
  }
  if (!env.openfort.walletSecret) {
    console.log("ℹ️  Backend wallet: skipped (OPENFORT_WALLET_SECRET required for backend.get)");
    return;
  }
  const walletId = env.openfort.walletId.trim();
  if (!walletId) return;
  const address = await resolveBackendWalletAddress(openfortClient, walletId);
  if (address) {
    // Backend wallet is the payer; payTo stays from PAY_TO_ADDRESS (recipient)
    console.log(`🔑 Backend wallet (payer) resolved: ${address}`);
  }
}

resolvePayToAddress().then(() => {
  // Routes
  app.get("/api/health", handleHealth);
  app.post("/api/protected-create-encryption-session", (req, res) =>
    handleShieldSession(req, res, openfortClient, env.openfort.shield),
  );
  app.all("/api/protected-content", (req, res) =>
    handleProtectedContent(req, res, env.paywall),
  );
  app.get("/api/backend-wallet/status", (_req, res) =>
    handleBackendWalletStatus(_req, res, openfortClient, env),
  );
  app.post("/api/backend-wallet/create", (_req, res) =>
    handleBackendWalletCreate(_req, res, openfortClient, env),
  );
  app.post("/api/backend-wallet/upgrade", (_req, res) =>
    handleBackendWalletUpgrade(_req, res, openfortClient, env),
  );
  app.get("/api/backend-wallet/test-payment", (_req, res) =>
    handleBackendWalletTestPayment(_req, res, openfortClient, env),
  );

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  const hasBackendWalletSecret = Boolean(env.openfort.walletSecret?.trim());
  const hasBackendWalletId = Boolean(env.openfort.walletId?.trim());
  const hasPayTo = Boolean(env.paywall.payToAddress?.trim());

  const mode = hasBackendWalletSecret ? "Backend wallet (Option B)" : "Embedded wallet (Option A)";
  let configLine: string;
  if (hasBackendWalletSecret) {
    if (hasPayTo) configLine = "Config: ✓ Ready (payTo resolved)";
    else if (hasBackendWalletId) configLine = "Config: ✗ PayTo resolve failed (check OPENFORT_BACKEND_WALLET_ID)";
    else configLine = "Config: ⚠ Create a wallet in the demo (Frontend → Backend wallet tab), then set OPENFORT_BACKEND_WALLET_ID in .env.local and restart";
  } else {
    configLine = hasPayTo ? "Config: ✓ Ready" : "Config: ⚠ Set PAY_TO_ADDRESS in .env.local";
  }

  console.log(`
🚀 x402 Demo Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Mode: ${mode}
${configLine}
🌐 Running on: http://localhost:${env.port}
🎯 Paying to: ${env.paywall.payToAddress || "(none)"}
🔗 Network: ${env.paywall.payment.network}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  app.listen(env.port, () => {
    console.log(`Server is listening on port ${env.port}`);
  });
}).catch((err) => {
  console.error("Fatal: failed to initialize server:", err);
  process.exit(1);
});
