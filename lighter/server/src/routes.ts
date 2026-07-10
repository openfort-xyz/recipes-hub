import type { Openfort } from "@openfort/openfort-node";
import type { NextFunction, Request, Response } from "express";
import { isAddress } from "viem";
import { buildChangePubKeyRegistration, submitChangePubKeyRegistration } from "./changePubKey.js";
import type { Config } from "./config.js";
import {
  LighterApiError,
  getAccountActiveOrders,
  getAccountByL1Address,
  getOrderBookOrders,
  getOrderBooks,
  getRegisteredApiKeys,
} from "./lighterApi.js";
import { createEncryptionSession } from "./openfort.js";
import { getAuthToken, submitCancelOrder, submitCreateOrder } from "./orders.js";

function handleError(res: Response, error: unknown): void {
  if (error instanceof LighterApiError) {
    res.status(error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 502).json({
      error: error.message,
      lighterCode: error.code,
    });
    return;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(JSON.stringify({ context: "lighter-server", message }));
  res.status(500).json({ error: message });
}

export function handleHealth(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok", message: "Lighter recipe server is running" });
}

export async function handleShieldSession(
  _req: Request,
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
    handleError(res, error);
  }
}

export function handleConfig(_req: Request, res: Response, config: Config): void {
  res.status(200).json({
    apiBaseUrl: config.lighter.apiBaseUrl,
    chainId: config.lighter.chainId,
    marketIndex: config.lighter.marketIndex,
    marketSymbol: config.lighter.marketSymbol,
    serverWalletConfigured: Boolean(config.lighter.apiKeyPrivateKey && config.lighter.accountIndex !== null),
  });
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
    handleError(res, error);
  }
}

export async function handleMarket(_req: Request, res: Response, config: Config): Promise<void> {
  try {
    const books = await getOrderBooks(config);
    const market = books.find((book) => book.market_id === config.lighter.marketIndex);
    if (!market) {
      res.status(404).json({ error: `Market index ${config.lighter.marketIndex} not found.` });
      return;
    }
    res.status(200).json(market);
  } catch (error) {
    handleError(res, error);
  }
}

export async function handleOrderBook(req: Request, res: Response, config: Config): Promise<void> {
  const limitRaw = req.query["limit"];
  const limit = typeof limitRaw === "string" ? Number.parseInt(limitRaw, 10) : 10;
  try {
    const book = await getOrderBookOrders(config, config.lighter.marketIndex, Number.isFinite(limit) ? limit : 10);
    res.status(200).json(book);
  } catch (error) {
    handleError(res, error);
  }
}

export async function handleOpenOrders(_req: Request, res: Response, config: Config): Promise<void> {
  try {
    if (config.lighter.accountIndex === null) {
      res.status(200).json({ orders: [] });
      return;
    }
    const authToken = await getAuthToken(config);
    const orders = await getAccountActiveOrders(
      config,
      config.lighter.accountIndex,
      authToken,
      config.lighter.marketIndex,
    );
    res.status(200).json({ orders });
  } catch (error) {
    handleError(res, error);
  }
}

export async function handleChangePubKeyMessage(req: Request, res: Response, config: Config): Promise<void> {
  const { accountIndex } = req.body as { accountIndex?: number };
  if (typeof accountIndex !== "number") {
    res.status(400).json({ error: "Body must include numeric accountIndex." });
    return;
  }
  try {
    const registration = await buildChangePubKeyRegistration(config, accountIndex);
    res.status(200).json(registration);
  } catch (error) {
    handleError(res, error);
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
    console.warn(
      "[lighter-server] New Lighter API key generated — copy this into your server .env NOW, it will not be shown again:\n" +
        `  LIGHTER_API_KEY_PRIVATE_KEY=${result.apiKeyPrivateKey}\n` +
        `  LIGHTER_API_KEY_INDEX=${result.apiKeyIndex}\n` +
        `  LIGHTER_ACCOUNT_INDEX=${result.accountIndex}`,
    );
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
}

interface CreateOrderBody {
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
        "Body must include clientOrderIndex, baseAmount, price, isAsk, orderType, timeInForce, orderExpiry (numbers/boolean).",
    });
    return;
  }
  try {
    const result = await submitCreateOrder(config, {
      marketIndex: config.lighter.marketIndex,
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
    handleError(res, error);
  }
}

export async function handleCancelOrder(req: Request, res: Response, config: Config): Promise<void> {
  const { orderIndex } = req.body as { orderIndex?: number };
  if (typeof orderIndex !== "number") {
    res.status(400).json({ error: "Body must include numeric orderIndex." });
    return;
  }
  try {
    const result = await submitCancelOrder(config, config.lighter.marketIndex, orderIndex);
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
}
