import type { Config } from "./config.js";
import { computeInitialWaitMs, waitForFillConfirmation, type FillConfirmationTrade } from "./fillConfirmation.js";
import {
  classifySelfTestOutcome,
  SELF_TEST_MARKET_INDEX,
  SELF_TEST_ORDER_INDEX,
  type KeySelfTestResult,
} from "./keySelfTest.js";
import { getAccountTrades, getNextNonce, sendTx, type LighterTrade } from "./lighterApi.js";
import {
  ASSET_ROUTE_TYPE_PERPS,
  createAuthToken,
  createSigningClient,
  loadSigner,
  signCancelOrder,
  signCreateOrder,
  signWithdraw,
} from "../signer/signer.js";

export class ServerWalletNotConfiguredError extends Error {
  constructor() {
    super(
      "Server Lighter API key is not configured. Complete onboarding (register an API key via " +
        "ChangePubKey) and set LIGHTER_API_KEY_PRIVATE_KEY, LIGHTER_API_KEY_INDEX and " +
        "LIGHTER_ACCOUNT_INDEX before trading.",
    );
    this.name = "ServerWalletNotConfiguredError";
  }
}

function requireServerWallet(config: Config): {
  privateKey: string;
  apiKeyIndex: number;
  accountIndex: number;
} {
  const { apiKeyPrivateKey, apiKeyIndex, accountIndex } = config.lighter;
  if (!apiKeyPrivateKey || accountIndex === null) {
    throw new ServerWalletNotConfiguredError();
  }
  return { privateKey: apiKeyPrivateKey, apiKeyIndex, accountIndex };
}

let clientReadyForKey: string | null = null;

async function ensureSigningClient(config: Config): Promise<{ apiKeyIndex: number; accountIndex: number }> {
  await loadSigner();
  const wallet = requireServerWallet(config);
  if (clientReadyForKey !== wallet.privateKey) {
    createSigningClient(
      config.lighter.apiBaseUrl,
      wallet.privateKey,
      config.lighter.chainId,
      wallet.apiKeyIndex,
      wallet.accountIndex,
    );
    clientReadyForKey = wallet.privateKey;
  }
  return wallet;
}

export interface CreateOrderInput {
  marketIndex: number;
  clientOrderIndex: number;
  baseAmount: number;
  price: number;
  isAsk: boolean;
  orderType: number;
  timeInForce: number;
  reduceOnly: boolean;
  triggerPrice: number;
  orderExpiry: number;
}

export interface CreateOrderResult {
  txHash: string;
  signedHash: string;
  /** True only once a matching trade is confirmed via /api/v1/trades — never a guess. */
  filled: boolean;
  /** Present only when filled — the actual matched size/price, which can differ slightly from
   * the requested marketable-limit price. */
  trade?: FillConfirmationTrade;
}

export async function submitCreateOrder(config: Config, order: CreateOrderInput): Promise<CreateOrderResult> {
  const wallet = await ensureSigningClient(config);
  const nonce = await getNextNonce(config, wallet.accountIndex, wallet.apiKeyIndex);
  const signed = signCreateOrder({
    ...order,
    nonce,
    apiKeyIndex: wallet.apiKeyIndex,
    accountIndex: wallet.accountIndex,
  });
  const result = await sendTx(config, signed.txType, signed.txInfo);

  const authToken = await getAuthToken(config);
  const trade = await waitForFillConfirmation({
    txHash: result.tx_hash,
    initialWaitMs: computeInitialWaitMs(result.predicted_execution_time_ms, Date.now()),
    fetchTrades: () => getAccountTrades(config, wallet.accountIndex, authToken, 10),
  });

  return {
    txHash: result.tx_hash,
    signedHash: signed.txHash,
    filled: trade !== null,
    ...(trade ? { trade } : {}),
  };
}

export async function submitCancelOrder(config: Config, marketIndex: number, orderIndex: number) {
  const wallet = await ensureSigningClient(config);
  const nonce = await getNextNonce(config, wallet.accountIndex, wallet.apiKeyIndex);
  const signed = signCancelOrder({
    marketIndex,
    orderIndex,
    nonce,
    apiKeyIndex: wallet.apiKeyIndex,
    accountIndex: wallet.accountIndex,
  });
  const result = await sendTx(config, signed.txType, signed.txInfo);
  return { txHash: result.tx_hash, signedHash: signed.txHash };
}

let lastSelfTestResult: KeySelfTestResult | null = null;

/** Null until selfTestServerKey has run at least once — see server.ts's startup sequence. */
export function getServerKeyValidity(): KeySelfTestResult | null {
  return lastSelfTestResult;
}

/**
 * Proves the server's configured key is actually recognized on-chain before trusting it for real
 * trades. ChangePubKey rotates the on-chain key at (account, apiKeyIndex) on every submit — sign
 * twice and the server's configured key silently goes stale with no other signal until an order
 * fails (see FRICTION_LOG.md's key-rotation entry). Only meaningful once, at startup: this
 * submits a real (harmless) transaction, so it isn't something to run on every request.
 */
export async function selfTestServerKey(config: Config): Promise<KeySelfTestResult> {
  const wallet = await ensureSigningClient(config);
  try {
    const nonce = await getNextNonce(config, wallet.accountIndex, wallet.apiKeyIndex);
    const signed = signCancelOrder({
      marketIndex: SELF_TEST_MARKET_INDEX,
      orderIndex: SELF_TEST_ORDER_INDEX,
      nonce,
      apiKeyIndex: wallet.apiKeyIndex,
      accountIndex: wallet.accountIndex,
    });
    await sendTx(config, signed.txType, signed.txInfo);
    lastSelfTestResult = "valid";
  } catch (error) {
    lastSelfTestResult = classifySelfTestOutcome(error);
  }
  return lastSelfTestResult;
}

export async function getAuthToken(config: Config): Promise<string> {
  const wallet = await ensureSigningClient(config);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  return createAuthToken(deadline, wallet.apiKeyIndex, wallet.accountIndex);
}

/** The authoritative fill record for the configured account — see getAccountTrades. */
export async function getRecentTrades(config: Config, limit = 20): Promise<LighterTrade[]> {
  const wallet = await ensureSigningClient(config);
  const authToken = await getAuthToken(config);
  return getAccountTrades(config, wallet.accountIndex, authToken, limit);
}

// Verified on-chain via eth_call to USDC_ASSET_INDEX() / tokenToAssetIndex() — see FRICTION_LOG.md.
const USDC_ASSET_INDEX = 3;

/**
 * Withdraws USDC to the account's OWN registered L1 address — Lighter's L2WithdrawTxInfo carries
 * no destination address (see docs/lighter-signing-notes.md), so the server's API key alone is
 * sufficient authorization; there is no way to redirect funds elsewhere with this transaction.
 */
export async function submitWithdraw(config: Config, amountUsdcRaw: number) {
  const wallet = await ensureSigningClient(config);
  const nonce = await getNextNonce(config, wallet.accountIndex, wallet.apiKeyIndex);
  const signed = signWithdraw({
    assetIndex: USDC_ASSET_INDEX,
    routeType: ASSET_ROUTE_TYPE_PERPS,
    amount: amountUsdcRaw,
    nonce,
    apiKeyIndex: wallet.apiKeyIndex,
    accountIndex: wallet.accountIndex,
  });
  const result = await sendTx(config, signed.txType, signed.txInfo);
  return { txHash: result.tx_hash, signedHash: signed.txHash };
}
