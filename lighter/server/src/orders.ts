import type { Config } from "./config.js";
import { getNextNonce, sendTx } from "./lighterApi.js";
import {
  createAuthToken,
  createSigningClient,
  loadSigner,
  signCancelOrder,
  signCreateOrder,
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

export async function submitCreateOrder(config: Config, order: CreateOrderInput) {
  const wallet = await ensureSigningClient(config);
  const nonce = await getNextNonce(config, wallet.accountIndex, wallet.apiKeyIndex);
  const signed = signCreateOrder({
    ...order,
    nonce,
    apiKeyIndex: wallet.apiKeyIndex,
    accountIndex: wallet.accountIndex,
  });
  const result = await sendTx(config, signed.txType, signed.txInfo);
  return { txHash: result.tx_hash, signedHash: signed.txHash };
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

export async function getAuthToken(config: Config): Promise<string> {
  const wallet = await ensureSigningClient(config);
  const deadline = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour
  return createAuthToken(deadline, wallet.apiKeyIndex, wallet.accountIndex);
}
