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

export interface LighterAccountAsset {
  symbol: string;
  asset_id: number;
  balance: string;
  locked_balance: string;
}

export interface LighterAccount {
  index: number;
  l1_address: string;
  status: number;
  collateral: string;
  available_balance: string;
  positions: LighterAccountPosition[];
  assets: LighterAccountAsset[];
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

export interface LighterOrderBookDetail {
  symbol: string;
  market_id: number;
  market_type: "perp" | "spot";
  status: string;
  min_base_amount: string;
  min_quote_amount: string;
  supported_size_decimals: number;
  supported_price_decimals: number;
  supported_quote_decimals: number;
  mark_price?: string;
  last_trade_price?: number;
}

/**
 * GET /api/v1/orderBookDetails with no market_id returns every market (perp + spot) in one call,
 * including live mark_price/last_trade_price alongside the size/price decimals each market needs
 * for order encoding — a strict superset of the older /api/v1/orderBooks, so this recipe uses it
 * for both market discovery and live pricing (one upstream call instead of N). Undocumented on
 * apidocs.lighter.xyz like most of what this recipe relies on — found by trying the singular form
 * of the documented plural /api/v1/orderBooks.
 */
export async function getOrderBookDetails(config: Config): Promise<LighterOrderBookDetail[]> {
  const result = await getJson<{
    order_book_details: LighterOrderBookDetail[];
    spot_order_book_details: LighterOrderBookDetail[];
  }>(config.lighter.apiBaseUrl, "/api/v1/orderBookDetails");
  return [...result.order_book_details, ...result.spot_order_book_details];
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

export interface LighterTrade {
  tx_hash: string;
  market_id: number;
  size: string;
  price: string;
  timestamp: number;
  ask_account_id: number;
  bid_account_id: number;
}

/**
 * GET /api/v1/trades — the authoritative fill record. Requires sort_by + limit (undocumented on
 * apidocs.lighter.xyz's parameter list as "required" until you omit them and get code 20001; see
 * FRICTION_LOG.md) and, per the docs, an auth token for any non-market-wide query. An IOC order
 * that fills appears here with the tx_hash from sendTx's response; one that expires unmatched
 * never appears here at all — there is no "confirmed no match" record, only "absent so far."
 */
export async function getAccountTrades(
  config: Config,
  accountIndex: number,
  authToken: string,
  limit = 20,
): Promise<LighterTrade[]> {
  const url = new URL("/api/v1/trades", config.lighter.apiBaseUrl);
  url.searchParams.set("account_index", String(accountIndex));
  url.searchParams.set("sort_by", "timestamp");
  url.searchParams.set("sort_dir", "desc");
  url.searchParams.set("limit", String(limit));
  const response = await fetch(url, { headers: { authorization: authToken } });
  const body = (await response.json()) as LighterEnvelope & { trades?: LighterTrade[] };
  if (!response.ok || body.code !== 200) {
    throw new LighterApiError(body.message ?? "Failed to fetch trades", body.code, response.status);
  }
  return body.trades ?? [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` up to `attempts` times, waiting `delayMs` between attempts (not after the last
 * one). Rethrows the last error if every attempt fails.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(delayMs);
      }
    }
  }
  throw lastError;
}

const FAUCET_RETRY_ATTEMPTS = 3;
const FAUCET_RETRY_DELAY_MS = 2000;

/**
 * Testnet-only. GET /api/v1/faucet?l1_address=... both creates the Lighter account AND credits
 * it (verified live: a fresh address got 10,000 USDC margin balance, 3 ETH, 1,000,000 LIT
 * instantly) — no on-chain L1 transaction required. Undocumented on apidocs.lighter.xyz, found by
 * probing (see FRICTION_LOG.md).
 *
 * Also intermittently flaky (~1-in-3 success rate observed live, plain 500s through CloudFront,
 * no rate-limit headers — see FRICTION_LOG.md) while unrelated endpoints stay healthy, so this
 * retries a few times before giving up. Caller must gate this to testnet — the endpoint's
 * mainnet behavior was not tested and is assumed nonexistent/disabled.
 */
export async function requestFaucet(config: Config, l1Address: string): Promise<void> {
  try {
    await withRetry(
      () => getJson(config.lighter.apiBaseUrl, "/api/v1/faucet", { l1_address: l1Address }),
      FAUCET_RETRY_ATTEMPTS,
      FAUCET_RETRY_DELAY_MS,
    );
  } catch (error) {
    if (error instanceof LighterApiError) {
      throw new LighterApiError(
        `${error.message} (after ${FAUCET_RETRY_ATTEMPTS} attempts — Lighter's testnet faucet is intermittently flaky, try again)`,
        error.code,
        error.httpStatus,
      );
    }
    throw error;
  }
}

export interface SendTxResult {
  tx_hash: string;
  /**
   * Unix ms timestamp (NOT a duration) of when Lighter predicts this tx will actually execute —
   * verified live by decoding it against wall-clock time at response receipt (see FRICTION_LOG.md).
   * Absent from the type by default because callers must not assume it's always present.
   */
  predicted_execution_time_ms?: number;
}

export async function sendTx(config: Config, txType: number, txInfo: string): Promise<SendTxResult> {
  const url = new URL("/api/v1/sendTx", config.lighter.apiBaseUrl);
  const body = new URLSearchParams();
  body.set("tx_type", String(txType));
  body.set("tx_info", txInfo);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = (await response.json()) as LighterEnvelope & SendTxResult;
  if (!response.ok || json.code !== 200) {
    throw new LighterApiError(json.message ?? "sendTx failed", json.code, response.status);
  }
  return {
    tx_hash: json.tx_hash ?? "",
    ...(json.predicted_execution_time_ms !== undefined
      ? { predicted_execution_time_ms: json.predicted_execution_time_ms }
      : {}),
  };
}
