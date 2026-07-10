import { config as loadEnv } from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { loadConfig } from "./config.js";
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
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
});
