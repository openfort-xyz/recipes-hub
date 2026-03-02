import express from "express";
import rateLimit from "express-rate-limit";
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

// Rate limiters for auth/payment routes (mitigates DoS)
const rateLimitProtectedContent = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: "Too many requests, try again later." },
  standardHeaders: true,
});
const rateLimitTestPayment = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: "Too many requests, try again later." },
  standardHeaders: true,
});

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
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-PAYMENT, PAYMENT-SIGNATURE, X-TRANSACTION-HASH",
  );
  res.setHeader("Access-Control-Expose-Headers", "X-PAYMENT-RESPONSE, PAYMENT-RESPONSE");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

async function resolvePayToAddress(): Promise<void> {
  if (!openfortClient || !env.openfort.walletSecret) return;
  const walletId = env.openfort.walletId.trim();
  if (!walletId) return;
  await resolveBackendWalletAddress(openfortClient, walletId);
}

resolvePayToAddress().then(() => {
  // Routes
  app.get("/api/health", handleHealth);
  app.post("/api/protected-create-encryption-session", (req: express.Request, res: express.Response) =>
    handleShieldSession(req, res, openfortClient, env.openfort.shield),
  );
  app.all("/api/protected-content", rateLimitProtectedContent, (req: express.Request, res: express.Response) =>
    handleProtectedContent(req, res, env.paywall, env.openfort.facilitatorUrl, {
      keyId: env.openfort.facilitatorApiKeyId,
      keySecret: env.openfort.facilitatorApiKeySecret,
    }),
  );
  app.get("/api/backend-wallet/status", (_req: express.Request, res: express.Response) =>
    handleBackendWalletStatus(_req, res, openfortClient, env),
  );
  app.post("/api/backend-wallet/create", (_req: express.Request, res: express.Response) =>
    handleBackendWalletCreate(_req, res, openfortClient, env),
  );
  app.post("/api/backend-wallet/upgrade", (_req: express.Request, res: express.Response) =>
    handleBackendWalletUpgrade(_req, res, openfortClient, env),
  );
  app.get("/api/backend-wallet/test-payment", rateLimitTestPayment, (_req: express.Request, res: express.Response) =>
    handleBackendWalletTestPayment(_req, res, openfortClient, env),
  );

  // 404 handler
  app.use((_req: express.Request, res: express.Response) => {
    res.status(404).json({ error: "Not Found" });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  });

  app.listen(env.port);
}).catch((err) => {
  console.error("Fatal: failed to initialize server:", err);
  process.exit(1);
});
