import type { Openfort } from "@openfort/openfort-node";
import type { NextFunction, Request, Response } from "express";
import { isAddress } from "viem";
import { buildChangePubKeyRegistration, submitChangePubKeyRegistration } from "./changePubKey.js";
import { isTestnet, type Config } from "./config.js";
import {
  LighterApiError,
  getAccountActiveOrders,
  getAccountByL1Address,
  getOrderBookOrders,
  getRegisteredApiKeys,
  requestFaucet,
} from "./lighterApi.js";
import { getActiveMarkets, requireMarket } from "./markets.js";
import { createEncryptionSession } from "./openfort.js";
import { getAuthToken, getRecentTrades, submitCancelOrder, submitCreateOrder, submitWithdraw } from "./orders.js";

function handleError(req: Request, res: Response, error: unknown): void {
  const route = `${req.method} ${req.path}`;
  if (error instanceof LighterApiError) {
    console.error(
      JSON.stringify({ context: "lighter-api-error", route, lighterCode: error.code, message: error.message }),
    );
    res.status(error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 502).json({
      error: error.message,
      lighterCode: error.code,
    });
    return;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(JSON.stringify({ context: "lighter-server", route, message }));
  res.status(500).json({ error: message });
}

export function handleHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", message: "Lighter recipe server is running" });
}

export async function handleShieldSession(
  req: Request,
  res: Response,
  openfortClient: Openfort | null,
  shieldConfig: Config["openfort"]["shield"],
): Promise<void> {
  const hasShieldConfig = Boolean(shieldConfig.publishableKey && shieldConfig.secretKey && shieldConfig.encryptionShare);
  if (!openfortClient || !hasShieldConfig) {
    res.status(500).json({ error: "Openfort Shield configuration is missing." });
    return;
  }
  try {
    const sessionId = await createEncryptionSession(openfortClient, shieldConfig);
    res.status(200).json({ session: sessionId });
  } catch (error) {
    handleError(req, res, error);
  }
}

export function handleConfig(_req: Request, res: Response, config: Config): void {
  res.status(200).json({
    apiBaseUrl: config.lighter.apiBaseUrl,
    chainId: config.lighter.chainId,
    network: isTestnet(config.lighter.apiBaseUrl) ? "testnet" : "mainnet",
    serverWalletConfigured: Boolean(config.lighter.apiKeyPrivateKey && config.lighter.accountIndex !== null),
    // Not a secret — just an integer identifying which account the server signs for, so the app
    // can catch a split-brain (server env pointing at a different account than the one it's
    // showing/trading) instead of silently treating "some key is configured" as "the right key
    // is configured". See FRICTION_LOG.md.
    accountIndex: config.lighter.accountIndex,
  });
}

/**
 * Every order-signing route requires the caller to state which account it believes it's trading
 * — cheap defense-in-depth against the server env pointing at a different account than the app
 * (e.g. re-onboarded into a new wallet without restarting the server), which would otherwise
 * sign and fill orders on an account the app isn't even displaying. Returns an error message if
 * they don't match, or null if they do.
 */
export function checkAccountMatch(serverAccountIndex: number | null, requestAccountIndex: number): string | null {
  if (serverAccountIndex === null || serverAccountIndex !== requestAccountIndex) {
    return `Server is configured for account ${serverAccountIndex ?? "none"}, but this request is for account ${requestAccountIndex}. Update server/.env.local and restart the server.`;
  }
  return null;
}

function requireL1Address(req: Request, res: Response): string | null {
  const l1Address = req.query["l1Address"];
  if (typeof l1Address !== "string" || !isAddress(l1Address, { strict: false })) {
    res.status(400).json({ error: "Query param l1Address must be a valid EVM address." });
    return null;
  }
  return l1Address;
}

export async function handleAccount(req: Request, res: Response, config: Config): Promise<void> {
  const l1Address = requireL1Address(req, res);
  if (!l1Address) return;
  try {
    const account = await getAccountByL1Address(config, l1Address);
    if (!account) {
      res.status(200).json({ onboarded: false, account: null, apiKeys: [] });
      return;
    }
    const apiKeys = await getRegisteredApiKeys(config, account.index);
    res.status(200).json({ onboarded: true, account, apiKeys });
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleMarkets(req: Request, res: Response, config: Config): Promise<void> {
  try {
    const markets = await getActiveMarkets(config);
    res.status(200).json({ markets });
  } catch (error) {
    handleError(req, res, error);
  }
}

function requireMarketIndexParam(raw: unknown, res: Response): number | null {
  const marketIndex = typeof raw === "string" ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(marketIndex)) {
    res.status(400).json({ error: "Query/body param marketIndex is required and must be numeric." });
    return null;
  }
  return marketIndex;
}

export async function handleOrderBook(req: Request, res: Response, config: Config): Promise<void> {
  const marketIndex = requireMarketIndexParam(req.query["marketIndex"], res);
  if (marketIndex === null) return;
  const limitRaw = req.query["limit"];
  const limit = typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : 10;
  try {
    const markets = await getActiveMarkets(config);
    requireMarket(markets, marketIndex);
    const book = await getOrderBookOrders(config, marketIndex, Number.isFinite(limit) ? limit : 10);
    res.status(200).json(book);
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleOpenOrders(req: Request, res: Response, config: Config): Promise<void> {
  try {
    if (config.lighter.accountIndex === null) {
      res.status(200).json({ orders: [] });
      return;
    }
    const authToken = await getAuthToken(config);
    // No market_id filter — the portfolio/open-orders view wants everything across all 5 markets.
    const orders = await getAccountActiveOrders(config, config.lighter.accountIndex, authToken);
    res.status(200).json({ orders });
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleTrades(req: Request, res: Response, config: Config): Promise<void> {
  try {
    if (config.lighter.accountIndex === null) {
      res.status(200).json({ trades: [] });
      return;
    }
    const limitRaw = req.query["limit"];
    const limit = typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : 20;
    const trades = await getRecentTrades(config, Number.isFinite(limit) ? limit : 20);
    res.status(200).json({
      trades: trades.map((t) => ({
        txHash: t.tx_hash,
        marketIndex: t.market_id,
        size: t.size,
        price: t.price,
        timestamp: t.timestamp,
        isAsk: t.ask_account_id === config.lighter.accountIndex,
      })),
    });
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleChangePubKeyMessage(req: Request, res: Response, config: Config): Promise<void> {
  const { accountIndex } = req.body as { accountIndex?: number };
  if (typeof accountIndex !== "number" || !Number.isFinite(accountIndex)) {
    res.status(400).json({ error: "Body must include a finite numeric accountIndex." });
    return;
  }
  try {
    const registration = await buildChangePubKeyRegistration(config, accountIndex);
    res.status(200).json(registration);
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleChangePubKeySubmit(req: Request, res: Response, config: Config): Promise<void> {
  const { accountIndex, l1Sig } = req.body as { accountIndex?: number; l1Sig?: string };
  if (typeof accountIndex !== "number" || typeof l1Sig !== "string" || !l1Sig) {
    res.status(400).json({ error: "Body must include numeric accountIndex and string l1Sig." });
    return;
  }
  try {
    const result = await submitChangePubKeyRegistration(config, accountIndex, l1Sig);
    // The private key itself goes back in the response body only (the app displays it on-screen
    // for the operator to copy) — never to server logs, which are far more likely than the app's
    // ephemeral UI to be captured, persisted, or shipped to a log aggregator.
    console.warn(
      `[lighter-server] New Lighter API key generated for account ${result.accountIndex} ` +
        `(apiKeyIndex ${result.apiKeyIndex}) — copy the credentials from the app screen into your ` +
        "server .env.local NOW, they will not be shown again.",
    );
    res.status(200).json(result);
  } catch (error) {
    handleError(req, res, error);
  }
}

interface CreateOrderBody {
  accountIndex: number;
  marketIndex: number;
  clientOrderIndex: number;
  baseAmount: number;
  price: number;
  isAsk: boolean;
  orderType: number;
  timeInForce: number;
  reduceOnly?: boolean;
  triggerPrice?: number;
  orderExpiry: number;
}

export async function handleCreateOrder(req: Request, res: Response, config: Config): Promise<void> {
  const body = req.body as Partial<CreateOrderBody>;
  if (
    typeof body.accountIndex !== "number" ||
    typeof body.marketIndex !== "number" ||
    typeof body.clientOrderIndex !== "number" ||
    typeof body.baseAmount !== "number" ||
    typeof body.price !== "number" ||
    typeof body.isAsk !== "boolean" ||
    typeof body.orderType !== "number" ||
    typeof body.timeInForce !== "number" ||
    typeof body.orderExpiry !== "number"
  ) {
    res.status(400).json({
      error:
        "Body must include accountIndex, marketIndex, clientOrderIndex, baseAmount, price, isAsk, orderType, timeInForce, orderExpiry (numbers/boolean).",
    });
    return;
  }
  // typeof x === "number" is true for NaN/Infinity — reject those explicitly so a malformed
  // request fails with a clean 400 here instead of an opaque error from the WASM signer.
  if (
    !Number.isFinite(body.accountIndex) ||
    !Number.isFinite(body.marketIndex) ||
    !Number.isFinite(body.clientOrderIndex) ||
    !Number.isFinite(body.orderType) ||
    !Number.isFinite(body.timeInForce) ||
    !Number.isFinite(body.orderExpiry) ||
    !Number.isFinite(body.baseAmount) ||
    body.baseAmount <= 0 ||
    !Number.isFinite(body.price) ||
    body.price <= 0
  ) {
    res.status(400).json({ error: "Numeric fields must be finite; baseAmount and price must be positive." });
    return;
  }
  const mismatch = checkAccountMatch(config.lighter.accountIndex, body.accountIndex);
  if (mismatch) {
    res.status(409).json({ error: mismatch });
    return;
  }
  try {
    const markets = await getActiveMarkets(config);
    requireMarket(markets, body.marketIndex);
    const result = await submitCreateOrder(config, {
      marketIndex: body.marketIndex,
      clientOrderIndex: body.clientOrderIndex,
      baseAmount: body.baseAmount,
      price: body.price,
      isAsk: body.isAsk,
      orderType: body.orderType,
      timeInForce: body.timeInForce,
      reduceOnly: body.reduceOnly ?? false,
      triggerPrice: body.triggerPrice ?? 0,
      orderExpiry: body.orderExpiry,
    });
    res.status(200).json(result);
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleCancelOrder(req: Request, res: Response, config: Config): Promise<void> {
  const { accountIndex, marketIndex, orderIndex } = req.body as {
    accountIndex?: number;
    marketIndex?: number;
    orderIndex?: number;
  };
  if (typeof accountIndex !== "number" || typeof marketIndex !== "number" || typeof orderIndex !== "number") {
    res.status(400).json({ error: "Body must include numeric accountIndex, marketIndex and orderIndex." });
    return;
  }
  if (!Number.isFinite(accountIndex) || !Number.isFinite(marketIndex) || !Number.isFinite(orderIndex)) {
    res.status(400).json({ error: "accountIndex, marketIndex and orderIndex must be finite numbers." });
    return;
  }
  const mismatch = checkAccountMatch(config.lighter.accountIndex, accountIndex);
  if (mismatch) {
    res.status(409).json({ error: mismatch });
    return;
  }
  try {
    const markets = await getActiveMarkets(config);
    requireMarket(markets, marketIndex);
    const result = await submitCancelOrder(config, marketIndex, orderIndex);
    res.status(200).json(result);
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleFaucet(req: Request, res: Response, config: Config): Promise<void> {
  if (!isTestnet(config.lighter.apiBaseUrl)) {
    res.status(400).json({
      error: "Faucet is only available on testnet. Deposit real USDC instead — see docs/lighter-signing-notes.md.",
    });
    return;
  }
  const { l1Address } = req.body as { l1Address?: string };
  if (typeof l1Address !== "string" || !isAddress(l1Address, { strict: false })) {
    res.status(400).json({ error: "Body must include a valid EVM address as l1Address." });
    return;
  }
  try {
    await requestFaucet(config, l1Address);
    res.status(200).json({ ok: true });
  } catch (error) {
    handleError(req, res, error);
  }
}

export async function handleWithdraw(req: Request, res: Response, config: Config): Promise<void> {
  const { amountUsdcRaw } = req.body as { amountUsdcRaw?: number };
  if (typeof amountUsdcRaw !== "number" || amountUsdcRaw <= 0) {
    res.status(400).json({ error: "Body must include a positive numeric amountUsdcRaw (USDC, 6 decimals)." });
    return;
  }
  try {
    const result = await submitWithdraw(config, amountUsdcRaw);
    res.status(200).json(result);
  } catch (error) {
    handleError(req, res, error);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
