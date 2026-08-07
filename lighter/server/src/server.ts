import { config as loadEnv } from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { isAuthorized } from "./auth.js";
import { loadConfig } from "./config.js";
import { selfTestServerKey } from "./orders.js";
import { createOpenfortClient } from "./openfort.js";
import {
  errorHandler,
  handleAccount,
  handleCancelOrder,
  handleChangePubKeyMessage,
  handleChangePubKeySubmit,
  handleConfig,
  handleCreateOrder,
  handleFaucet,
  handleHealth,
  handleMarkets,
  handleOpenOrders,
  handleOrderBook,
  handleShieldSession,
  handleTrades,
  handleWithdraw,
  notFoundHandler,
} from "./routes.js";

loadEnv({ path: ".env.local" });

const config = loadConfig();
const openfortClient = createOpenfortClient(config);

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && config.allowedOrigins.includes(requestOrigin)) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  } else if (config.allowedOrigins.length === 0) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// Optional shared-secret auth (see auth.ts). /api/health stays open so smoke checks and load
// balancers never need the secret.
app.use((req, res, next) => {
  if (req.path === "/api/health") {
    next();
    return;
  }
  if (!isAuthorized(config.authToken, req.get("Authorization"))) {
    res.status(401).json({ error: "Missing or invalid Authorization header (LIGHTER_SERVER_AUTH_TOKEN is set)." });
    return;
  }
  next();
});

const rateLimitTrading = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests, try again later." },
  standardHeaders: true,
});

app.get("/api/health", handleHealth);
app.post("/api/protected-create-encryption-session", (req, res) =>
  handleShieldSession(req, res, openfortClient, config.openfort.shield),
);
app.get("/api/lighter/config", (req, res) => handleConfig(req, res, config));
app.get("/api/lighter/account", (req, res) => handleAccount(req, res, config));
app.get("/api/lighter/markets", (req, res) => handleMarkets(req, res, config));
app.get("/api/lighter/orderbook", (req, res) => handleOrderBook(req, res, config));
app.get("/api/lighter/orders", (req, res) => handleOpenOrders(req, res, config));
app.get("/api/lighter/trades", (req, res) => handleTrades(req, res, config));
app.post("/api/lighter/changepubkey/message", rateLimitTrading, (req, res) =>
  handleChangePubKeyMessage(req, res, config),
);
app.post("/api/lighter/changepubkey/submit", rateLimitTrading, (req, res) =>
  handleChangePubKeySubmit(req, res, config),
);
app.post("/api/lighter/order", rateLimitTrading, (req, res) => handleCreateOrder(req, res, config));
app.post("/api/lighter/order/cancel", rateLimitTrading, (req, res) => handleCancelOrder(req, res, config));
app.post("/api/lighter/withdraw", rateLimitTrading, (req, res) => handleWithdraw(req, res, config));
app.post("/api/lighter/faucet", rateLimitTrading, (req, res) => handleFaucet(req, res, config));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Lighter recipe server listening on :${config.port}`);
  if (!config.authToken) {
    console.warn(
      "[lighter-server] Running without route auth (LIGHTER_SERVER_AUTH_TOKEN unset). Fine on " +
        "localhost; set the same token in both .env files before exposing this server to a network.",
    );
  }
});

// Runs in the background rather than blocking startup — a network hiccup here shouldn't hang the
// whole server. Until it resolves, /api/lighter/config optimistically reports whatever key
// material is present as configured; see handleConfig for why "some key present" isn't the same
// claim as "proven valid".
if (config.lighter.apiKeyPrivateKey && config.lighter.accountIndex !== null) {
  selfTestServerKey(config)
    .then((result) => {
      if (result === "invalid") {
        console.warn(
          "[lighter-server] Configured API key was rejected as an invalid signature on a real " +
            "self-test transaction — it's likely stale (ChangePubKey rotates the on-chain key on " +
            "every submit; re-authorize twice and the earlier key silently stops working). " +
            "Re-authorize from the app and update server/.env.local with the fresh values.",
        );
      }
    })
    .catch((err) => {
      console.error("[lighter-server] Startup key self-test failed to run:", err instanceof Error ? err.message : err);
    });
}
