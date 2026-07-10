import { readFileSync } from "node:fs";
import path from "node:path";

// The vendored lighter-go WASM build exposes these as globalThis functions once
// wasm_exec.js's Go runtime instantiates and runs the module. See README.md for
// provenance (exact lighter-go commit + build command).
interface LighterWasmGlobals {
  GenerateAPIKey: () => WasmResult<{ privateKey: string; publicKey: string }>;
  CreateClient: (
    url: string,
    privateKey: string,
    chainId: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<Record<string, never>>;
  CreateAuthToken: (
    deadline: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<{ authToken: string }>;
  SignChangePubKey: (
    pubKeyHex: string,
    skipNonce: number,
    nonce: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<SignedTxResult>;
  SignCreateOrder: (...args: number[]) => WasmResult<SignedTxResult>;
  SignCancelOrder: (
    marketIndex: number,
    orderIndex: number,
    skipNonce: number,
    nonce: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<SignedTxResult>;
  SignCancelAllOrders: (
    timeInForce: number,
    time: number,
    cancelAllMarketIndex: number,
    skipNonce: number,
    nonce: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<SignedTxResult>;
  SignWithdraw: (
    assetIndex: number,
    routeType: number,
    amount: number,
    skipNonce: number,
    nonce: number,
    apiKeyIndex: number,
    accountIndex: number,
  ) => WasmResult<SignedTxResult>;
}

type WasmResult<T> = (T & { error?: undefined }) | { error: string };

export interface SignedTxResult {
  txType: number;
  txInfo: string;
  txHash: string;
  messageToSign?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var Go: new () => {
    importObject: WebAssembly.Imports;
    run: (instance: WebAssembly.Instance) => Promise<void>;
  };
}

function wasmGlobals(): LighterWasmGlobals {
  return globalThis as unknown as LighterWasmGlobals;
}

function unwrap<T>(result: WasmResult<T>, label: string): T {
  if ("error" in result && result.error !== undefined) {
    throw new Error(`[lighter-signer] ${label} failed: ${result.error}`);
  }
  return result;
}

let readyPromise: Promise<void> | null = null;

/**
 * Loads the vendored lighter-go WASM signer and runs its Go runtime exactly once.
 * Must resolve before calling any other export in this module.
 */
export async function loadSigner(): Promise<void> {
  if (readyPromise) {
    return readyPromise;
  }
  readyPromise = (async () => {
    const signerDir = path.join(process.cwd(), "signer");
    await import(path.join(signerDir, "wasm_exec.js"));
    const wasmBytes = readFileSync(path.join(signerDir, "lighter-signer.wasm"));
    const go = new globalThis.Go();
    const { instance } = await WebAssembly.instantiate(wasmBytes, go.importObject);
    // go.run() never resolves (the Go program blocks on `select {}`); don't await it.
    void go.run(instance);
    // Give the Go scheduler a tick to register its globalThis functions before returning.
    await new Promise((resolve) => setImmediate(resolve));
  })();
  return readyPromise;
}

export function generateApiKey(): { privateKey: string; publicKey: string } {
  return unwrap(wasmGlobals().GenerateAPIKey(), "GenerateAPIKey");
}

export function createSigningClient(
  url: string,
  privateKey: string,
  chainId: number,
  apiKeyIndex: number,
  accountIndex: number,
): void {
  unwrap(
    wasmGlobals().CreateClient(url, privateKey, chainId, apiKeyIndex, accountIndex),
    "CreateClient",
  );
}

export function createAuthToken(
  deadlineUnixSeconds: number,
  apiKeyIndex: number,
  accountIndex: number,
): string {
  return unwrap(
    wasmGlobals().CreateAuthToken(deadlineUnixSeconds, apiKeyIndex, accountIndex),
    "CreateAuthToken",
  ).authToken;
}

export function signChangePubKey(params: {
  pubKeyHex: string;
  nonce: number;
  apiKeyIndex: number;
  accountIndex: number;
}): SignedTxResult {
  return unwrap(
    wasmGlobals().SignChangePubKey(
      params.pubKeyHex,
      0,
      params.nonce,
      params.apiKeyIndex,
      params.accountIndex,
    ),
    "SignChangePubKey",
  );
}

export interface CreateOrderParams {
  marketIndex: number;
  clientOrderIndex: number;
  baseAmount: number;
  price: number;
  isAsk: boolean;
  orderType: number;
  timeInForce: number;
  reduceOnly: boolean;
  triggerPrice: number;
  /**
   * Required and validated against `orderType`/`timeInForce` by lighter-go
   * (types/txtypes/create_order.go Validate()): an Immediate-or-Cancel LimitOrder or MarketOrder
   * must pass `ORDER_EXPIRY_NIL` (0); a GoodTillTime/PostOnly LimitOrder must pass a real future
   * millisecond timestamp. There is no universal default — passing the wrong one for a given
   * type/TIF combination fails with "OrderExpiry is invalid".
   */
  orderExpiry: number;
  nonce: number;
  apiKeyIndex: number;
  accountIndex: number;
}

// Order type constants — types/txtypes/constants.go
export const ORDER_TYPE_LIMIT = 0;
export const ORDER_TYPE_MARKET = 1;
// Time-in-force constants — types/txtypes/constants.go
export const TIME_IN_FORCE_IMMEDIATE_OR_CANCEL = 0;
export const TIME_IN_FORCE_GOOD_TILL_TIME = 1;
// NilOrderExpiry int64 = 0 — types/txtypes/constants.go
export const ORDER_EXPIRY_NIL = 0;

// Sentinel values from lighter-go's types/txtypes/constants.go — all "no integrator" fields are 0.
const NIL_INTEGRATOR_INDEX = 0;
const NIL_INTEGRATOR_FEE = 0;
const SELF_TRADE_BEHAVIOR_EXPIRE_MAKER = 0;
const SELF_TRADE_EQUALITY_ACCOUNT_INDEX = 0;
const NIL_MARKET_INDEX = 255; // types/txtypes/constants.go: NilMarketIndex int16 = 255

export function signCreateOrder(params: CreateOrderParams): SignedTxResult {
  return unwrap(
    wasmGlobals().SignCreateOrder(
      params.marketIndex,
      params.clientOrderIndex,
      params.baseAmount,
      params.price,
      params.isAsk ? 1 : 0,
      params.orderType,
      params.timeInForce,
      params.reduceOnly ? 1 : 0,
      params.triggerPrice,
      params.orderExpiry,
      NIL_INTEGRATOR_INDEX,
      NIL_INTEGRATOR_FEE,
      NIL_INTEGRATOR_FEE,
      SELF_TRADE_BEHAVIOR_EXPIRE_MAKER,
      SELF_TRADE_EQUALITY_ACCOUNT_INDEX,
      0,
      params.nonce,
      params.apiKeyIndex,
      params.accountIndex,
    ),
    "SignCreateOrder",
  );
}

export function signCancelOrder(params: {
  marketIndex: number;
  orderIndex: number;
  nonce: number;
  apiKeyIndex: number;
  accountIndex: number;
}): SignedTxResult {
  return unwrap(
    wasmGlobals().SignCancelOrder(
      params.marketIndex,
      params.orderIndex,
      0,
      params.nonce,
      params.apiKeyIndex,
      params.accountIndex,
    ),
    "SignCancelOrder",
  );
}

export function signCancelAllOrders(params: {
  nonce: number;
  apiKeyIndex: number;
  accountIndex: number;
}): SignedTxResult {
  return unwrap(
    wasmGlobals().SignCancelAllOrders(
      0,
      0,
      NIL_MARKET_INDEX,
      0,
      params.nonce,
      params.apiKeyIndex,
      params.accountIndex,
    ),
    "SignCancelAllOrders",
  );
}

// types/txtypes/constants.go: AssetRouteType_Perps = 0, AssetRouteType_Spot = 1
export const ASSET_ROUTE_TYPE_PERPS = 0;
export const ASSET_ROUTE_TYPE_SPOT = 1;

/**
 * L2WithdrawTxInfo carries no destination address and no L1Sig (see
 * types/txtypes/withdraw.go — grepped for GetL1SignatureBody, absent on this type) — Lighter's
 * server routes withdrawals exclusively to the account's registered L1 owner address, so this
 * is safe to sign with the server-held API key alone (see docs/lighter-signing-notes.md).
 */
export function signWithdraw(params: {
  assetIndex: number;
  routeType: number;
  amount: number;
  nonce: number;
  apiKeyIndex: number;
  accountIndex: number;
}): SignedTxResult {
  return unwrap(
    wasmGlobals().SignWithdraw(
      params.assetIndex,
      params.routeType,
      params.amount,
      0,
      params.nonce,
      params.apiKeyIndex,
      params.accountIndex,
    ),
    "SignWithdraw",
  );
}
