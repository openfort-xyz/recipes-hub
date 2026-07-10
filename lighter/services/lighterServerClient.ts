import { getLighterServerBaseUrl } from "../utils/config";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getLighterServerBaseUrl().replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? `Request to ${path} failed with status ${response.status}`);
  }
  return body as T;
}

export interface LighterServerConfig {
  apiBaseUrl: string;
  chainId: number;
  network: "testnet" | "mainnet";
  serverWalletConfigured: boolean;
}

export function fetchServerConfig(): Promise<LighterServerConfig> {
  return request("/api/lighter/config");
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

export interface LighterApiKeyEntry {
  account_index: number;
  api_key_index: number;
  public_key: string;
  nonce: number;
}

export interface AccountResponse {
  onboarded: boolean;
  account: LighterAccount | null;
  apiKeys: LighterApiKeyEntry[];
}

export function fetchAccount(l1Address: string): Promise<AccountResponse> {
  return request(`/api/lighter/account?l1Address=${encodeURIComponent(l1Address)}`);
}

export interface Market {
  marketIndex: number;
  symbol: string;
  marketType: "perp" | "spot";
  sizeDecimals: number;
  priceDecimals: number;
  minBaseAmount: string;
  minQuoteAmount: string;
  price: string;
}

/** All currently active markets (perp + spot), with live prices — discovered fresh each call. */
export function fetchMarkets(): Promise<{ markets: Market[] }> {
  return request("/api/lighter/markets");
}

export interface OrderBookLevel {
  order_index: number;
  order_id: string;
  initial_base_amount: string;
  remaining_base_amount: string;
  price: string;
  order_expiry: number;
}

export interface OrderBookResponse {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export function fetchOrderBook(marketIndex: number, limit = 10): Promise<OrderBookResponse> {
  return request(`/api/lighter/orderbook?marketIndex=${marketIndex}&limit=${limit}`);
}

export interface ActiveOrder {
  order_index: number;
  order_id: string;
  market_index: number;
  is_ask: boolean;
  price: string;
  remaining_base_amount: string;
  initial_base_amount: string;
  status: string;
}

export function fetchOpenOrders(): Promise<{ orders: ActiveOrder[] }> {
  return request("/api/lighter/orders");
}

export interface ChangePubKeyMessageResponse {
  apiKeyIndex: number;
  accountIndex: number;
  nonce: number;
  messageToSign: string;
}

export function requestChangePubKeyMessage(accountIndex: number): Promise<ChangePubKeyMessageResponse> {
  return request("/api/lighter/changepubkey/message", {
    method: "POST",
    body: JSON.stringify({ accountIndex }),
  });
}

export interface ChangePubKeySubmitResponse {
  txHash: string;
  apiKeyIndex: number;
  accountIndex: number;
  apiKeyPrivateKey: string;
  apiKeyPublicKey: string;
}

export function submitChangePubKey(accountIndex: number, l1Sig: string): Promise<ChangePubKeySubmitResponse> {
  return request("/api/lighter/changepubkey/submit", {
    method: "POST",
    body: JSON.stringify({ accountIndex, l1Sig }),
  });
}

export interface CreateOrderRequest {
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

export interface SubmitOrderResponse {
  txHash: string;
  signedHash: string;
}

export function createOrder(order: CreateOrderRequest): Promise<SubmitOrderResponse> {
  return request("/api/lighter/order", { method: "POST", body: JSON.stringify(order) });
}

export function cancelOrder(marketIndex: number, orderIndex: number): Promise<SubmitOrderResponse> {
  return request("/api/lighter/order/cancel", { method: "POST", body: JSON.stringify({ marketIndex, orderIndex }) });
}

export interface WithdrawResponse {
  txHash: string;
  signedHash: string;
}

/** amountUsdcRaw is USDC scaled by 10^6 (e.g. 5 USDC = 5_000_000). Always lands on your own L1 address. */
export function withdrawUsdc(amountUsdcRaw: number): Promise<WithdrawResponse> {
  return request("/api/lighter/withdraw", { method: "POST", body: JSON.stringify({ amountUsdcRaw }) });
}

/** Testnet only — creates and funds the Lighter account in one call, no wallet signature needed. */
export function requestFaucet(l1Address: string): Promise<{ ok: true }> {
  return request("/api/lighter/faucet", { method: "POST", body: JSON.stringify({ l1Address }) });
}
