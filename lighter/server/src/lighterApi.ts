import type { Config } from "./config.js";

export class LighterApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = "LighterApiError";
  }
}

interface LighterEnvelope {
  code: number;
  message?: string;
}

async function getJson<T>(baseUrl: string, path: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { method: "GET" });
  const body = (await response.json()) as T & LighterEnvelope;
  if (!response.ok || body.code !== 200) {
    throw new LighterApiError(body.message ?? "Lighter API request failed", body.code, response.status);
  }
  return body;
}

export interface LighterAccountPosition {
  market_id: number;
  symbol: string;
  sign: number;
  position: string;
  avg_entry_price: string;
  unrealized_pnl: string;
}

export interface LighterAccount {
  index: number;
  l1_address: string;
  status: number;
  collateral: string;
  available_balance: string;
  positions: LighterAccountPosition[];
}

export async function getAccountByL1Address(config: Config, l1Address: string): Promise<LighterAccount | null> {
  try {
    const result = await getJson<{ accounts: LighterAccount[] }>(
      config.lighter.apiBaseUrl,
      "/api/v1/account",
      { by: "l1_address", value: l1Address },
    );
    return result.accounts[0] ?? null;
  } catch (error) {
    if (error instanceof LighterApiError && error.code === 21100) {
      return null; // "account not found" — not onboarded yet, not an error state for us
    }
    throw error;
  }
}

export async function getAccountByIndex(config: Config, accountIndex: number): Promise<LighterAccount | null> {
  const result = await getJson<{ accounts: LighterAccount[] }>(
    config.lighter.apiBaseUrl,
    "/api/v1/account",
    { by: "index", value: accountIndex },
  );
  return result.accounts[0] ?? null;
}

export interface LighterApiKeyEntry {
  account_index: number;
  api_key_index: number;
  public_key: string;
  nonce: number;
}

export async function getRegisteredApiKeys(config: Config, accountIndex: number): Promise<LighterApiKeyEntry[]> {
  const result = await getJson<{ api_keys: LighterApiKeyEntry[] }>(
    config.lighter.apiBaseUrl,
    "/api/v1/apikeys",
    { account_index: accountIndex },
  );
  return result.api_keys;
}

export async function getNextNonce(config: Config, accountIndex: number, apiKeyIndex: number): Promise<number> {
  const result = await getJson<{ nonce: number }>(config.lighter.apiBaseUrl, "/api/v1/nextNonce", {
    account_index: accountIndex,
    api_key_index: apiKeyIndex,
  });
  return result.nonce;
}

export interface LighterOrderBookLevel {
  order_index: number;
  order_id: string;
  initial_base_amount: string;
  remaining_base_amount: string;
  price: string;
  order_expiry: number;
}

export async function getOrderBookOrders(
  config: Config,
  marketId: number,
  limit = 10,
): Promise<{ bids: LighterOrderBookLevel[]; asks: LighterOrderBookLevel[] }> {
  return getJson(config.lighter.apiBaseUrl, "/api/v1/orderBookOrders", { market_id: marketId, limit });
}

export interface LighterOrderBookMeta {
  symbol: string;
  market_id: number;
  status: string;
  min_base_amount: string;
  min_quote_amount: string;
  supported_size_decimals: number;
  supported_price_decimals: number;
  supported_quote_decimals: number;
}

export async function getOrderBooks(config: Config): Promise<LighterOrderBookMeta[]> {
  const result = await getJson<{ order_books: LighterOrderBookMeta[] }>(
    config.lighter.apiBaseUrl,
    "/api/v1/orderBooks",
  );
  return result.order_books;
}

export interface LighterActiveOrder {
  order_index: number;
  order_id: string;
  market_index: number;
  is_ask: boolean;
  price: string;
  remaining_base_amount: string;
  initial_base_amount: string;
  status: string;
}

export async function getAccountActiveOrders(
  config: Config,
  accountIndex: number,
  authToken: string,
  marketId?: number,
): Promise<LighterActiveOrder[]> {
  const url = new URL("/api/v1/accountActiveOrders", config.lighter.apiBaseUrl);
  url.searchParams.set("account_index", String(accountIndex));
  if (marketId !== undefined) {
    url.searchParams.set("market_id", String(marketId));
  }
  const response = await fetch(url, { headers: { authorization: authToken } });
  const body = (await response.json()) as LighterEnvelope & { orders?: LighterActiveOrder[] };
  if (!response.ok || body.code !== 200) {
    throw new LighterApiError(body.message ?? "Failed to fetch active orders", body.code, response.status);
  }
  return body.orders ?? [];
}

export async function sendTx(
  config: Config,
  txType: number,
  txInfo: string,
): Promise<{ tx_hash: string }> {
  const url = new URL("/api/v1/sendTx", config.lighter.apiBaseUrl);
  const body = new URLSearchParams();
  body.set("tx_type", String(txType));
  body.set("tx_info", txInfo);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await response.json()) as LighterEnvelope & { tx_hash?: string };
  if (!response.ok || json.code !== 200) {
    throw new LighterApiError(json.message ?? "sendTx failed", json.code, response.status);
  }
  return { tx_hash: json.tx_hash ?? "" };
}
