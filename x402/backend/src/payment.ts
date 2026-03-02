import { randomBytes } from "node:crypto";
import type { EvmAccount, Openfort } from "@openfort/openfort-node";
import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  parseEventLogs,
  verifyTypedData,
  type Address,
  type Hex,
} from "viem";
import { hashAuthorization } from "viem/utils";
import type { Config } from "./config.js";

// ---- Network types ----

export const NETWORK_CHAIN_ID = {
  "base-sepolia": 84532,
  base: 8453,
} as const;

export type SupportedNetwork = keyof typeof NETWORK_CHAIN_ID;

// ---- Payment types ----

export interface PaymentRequirements {
  scheme: "exact";
  network: SupportedNetwork;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: Address;
  maxTimeoutSeconds: number;
  asset: Address;
  extra?: {
    name?: string;
    version?: string;
  };
}

export interface ExactEvmPayloadAuthorization {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

export interface ExactEvmPayload {
  signature: Hex;
  authorization: ExactEvmPayloadAuthorization;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: SupportedNetwork;
  payload: ExactEvmPayload;
}

// ---- EIP-712 types ----

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

// ---- Error ----

export class PaymentVerificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

// ---- Replay protection ----
// NOTE: Use Redis/DB in production

const usedNonces = new Set<string>();
const usedTxHashes = new Set<string>();

// ---- On-chain verification (Option A: Embedded Wallet) ----

export async function verifyOnChainPayment(
  txHash: string,
  paywall: Config["paywall"],
  rpcUrl: string,
): Promise<void> {
  const normalizedHash = txHash.toLowerCase();
  if (usedTxHashes.has(normalizedHash)) {
    throw new PaymentVerificationError(
      "REPLAY",
      "Transaction hash already used",
    );
  }

  const client = createPublicClient({ transport: http(rpcUrl) });

  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash as Hex });
  } catch {
    throw new PaymentVerificationError(
      "TX_NOT_FOUND",
      "Transaction not found on-chain",
    );
  }

  if (receipt.status !== "success") {
    throw new PaymentVerificationError(
      "TX_FAILED",
      "Transaction did not succeed",
    );
  }

  const logs = parseEventLogs({
    abi: erc20Abi,
    eventName: "Transfer",
    logs: receipt.logs,
  });

  const payTo = getAddress(paywall.payToAddress);
  const requiredAmount = BigInt(paywall.payment.maxAmountRequired);

  const matchingLog = logs.find((log: any) =>
    getAddress(log.args.to) === payTo && log.args.value >= requiredAmount,
  );

  if (!matchingLog) {
    throw new PaymentVerificationError(
      "INSUFFICIENT_PAYMENT",
      "No matching transfer found in transaction logs",
    );
  }

  usedTxHashes.add(normalizedHash);
}

// ---- Off-chain verification (Option B: Backend Wallet) ----

export async function verifyOffChainPayment(
  encoded: string,
  paywall: Config["paywall"],
): Promise<void> {
  const raw = decodePaymentHeader(encoded);
  const payment = parsePaymentPayload(raw);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const { authorization, signature } = payment.payload;

  if (BigInt(authorization.validBefore) <= BigInt(nowSeconds)) {
    throw new PaymentVerificationError(
      "EXPIRED",
      "Payment authorization has expired",
    );
  }

  if (BigInt(authorization.validAfter) > BigInt(nowSeconds)) {
    throw new PaymentVerificationError(
      "NOT_YET_VALID",
      "Payment authorization is not yet valid",
    );
  }

  const payTo = getAddress(paywall.payToAddress);
  if (getAddress(authorization.to) !== payTo) {
    throw new PaymentVerificationError(
      "WRONG_RECIPIENT",
      "Payment is not addressed to this server",
    );
  }

  if (BigInt(authorization.value) < BigInt(paywall.payment.maxAmountRequired)) {
    throw new PaymentVerificationError(
      "INSUFFICIENT_AMOUNT",
      "Payment amount is less than required",
    );
  }

  const nonceKey = `${authorization.from.toLowerCase()}:${authorization.nonce.toLowerCase()}`;
  if (usedNonces.has(nonceKey)) {
    throw new PaymentVerificationError("REPLAY", "Payment nonce already used");
  }

  const chainId = NETWORK_CHAIN_ID[payment.network];
  const domain = {
    name: paywall.payment.extra.name || "USD Coin",
    version: paywall.payment.extra.version || "2",
    chainId,
    verifyingContract: getAddress(paywall.payment.asset),
  };

  const message = {
    from: getAddress(authorization.from),
    to: getAddress(authorization.to),
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  };

  const valid = await verifyTypedData({
    address: getAddress(authorization.from),
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message,
    signature,
  });

  if (!valid) {
    throw new PaymentVerificationError(
      "INVALID_SIGNATURE",
      "Payment signature is invalid",
    );
  }

  usedNonces.add(nonceKey);
}

// ---- Backend wallet payment creation (Option B) ----

export async function createBackendWalletPayment(
  account: EvmAccount,
  requirements: PaymentRequirements,
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(nowSeconds - 600);
  const validBefore = BigInt(
    nowSeconds + (requirements.maxTimeoutSeconds ?? 300),
  );
  const nonce = generateNonce();

  const chainId = NETWORK_CHAIN_ID[requirements.network];
  const domain = {
    name: requirements.extra?.name ?? "USD Coin",
    version: requirements.extra?.version ?? "2",
    chainId,
    verifyingContract: getAddress(requirements.asset),
  };

  const message = {
    from: account.address,
    to: getAddress(requirements.payTo),
    value: BigInt(requirements.maxAmountRequired),
    validAfter,
    validBefore,
    nonce,
  };

  const signature = await account.signTypedData({
    domain,
    types: TRANSFER_WITH_AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message,
  });

  const payload: PaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: requirements.network,
    payload: {
      signature,
      authorization: {
        from: account.address,
        to: getAddress(requirements.payTo),
        value: requirements.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString(
    "base64",
  );
  return encoded;
}

// ---- Gas sponsorship (Openfort policy) ----
// USDC transferWithAuthorization contract ABI (EIP-3009; payer submits)
const TRANSFER_WITH_AUTHORIZATION_ABI = [
  {
    name: "transferWithAuthorization",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
  },
] as const;

function splitSignature(signature: Hex): { v: number; r: Hex; s: Hex } {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (hex.length !== 130) {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      `Invalid signature length (expected 65 bytes, got ${hex.length / 2})`,
    );
  }
  const r = `0x${hex.slice(0, 64)}` as Hex;
  const s = `0x${hex.slice(64, 128)}` as Hex;
  let v = Number.parseInt(hex.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { v, r, s };
}

/**
 * Normalize ECDSA signature to use yParity (0/1) in the last byte for Account Abstraction V8.
 * Openfort parses r, s, yParity from the signature; some backends return v=27/28.
 */
function signatureToYParityFormat(signature: string): string {
  const hex = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (hex.length !== 130) return signature;
  const v = Number.parseInt(hex.slice(128, 130), 16);
  const yParity = v === 27 ? 0 : v === 28 ? 1 : v;
  return `0x${hex.slice(0, 128)}${yParity.toString(16).padStart(2, "0")}`;
}

// EIP-7702 Calibur implementation (Base Sepolia); same address used in Openfort backend wallet gasless docs
const EIP7702_CALIBUR_IMPLEMENTATION: Address =
  "0x000000009b1d0af20d8c6d0a44e162d11f9b8f00";

const OPENFORT_API_BASE = "https://api.openfort.io";

/** Try multiple API response shapes (camelCase, snake_case) for delegated account id. */
function parseDelegatedAccountId(data: unknown): string | null {
  if (data === null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const camel = o.delegatedAccount;
  if (
    camel !== null &&
    typeof camel === "object" &&
    typeof (camel as { id?: string }).id === "string"
  )
    return (camel as { id: string }).id;
  const snake = o.delegated_account;
  if (
    snake !== null &&
    typeof snake === "object" &&
    typeof (snake as { id?: string }).id === "string"
  )
    return (snake as { id: string }).id;
  return null;
}

/**
 * Calls Openfort API to upgrade backend EOA to Delegated Account (EIP-7702).
 * API uses PUT. 409 "Account already exist" means already upgraded — we then GET to obtain delegatedAccount.id.
 */
async function openfortBackendUpdateToDelegated(
  apiSecretKey: string,
  walletId: string,
  chainId: number,
): Promise<{ delegatedAccountId: string } | null> {
  const url = `${OPENFORT_API_BASE}/v2/accounts/backend/${encodeURIComponent(walletId)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiSecretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountType: "Delegated Account",
      chainType: "EVM",
      chainId,
      implementationType: "Calibur",
    }),
  });

  const bodyText = await res.text();
  let parsed: unknown;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    parsed = {};
  }

  if (res.ok) {
    const id = parseDelegatedAccountId(parsed);
    return id ? { delegatedAccountId: id } : null;
  }

  if (res.status === 409) {
    const id = parseDelegatedAccountId(parsed);
    if (id) return { delegatedAccountId: id };
    const getRes = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiSecretKey}` },
    });
    const getText = await getRes.text();
    if (getRes.ok) {
      let getParsed: unknown;
      try {
        getParsed = getText ? JSON.parse(getText) : {};
      } catch {
        getParsed = {};
      }
      const getId = parseDelegatedAccountId(getParsed);
      if (getId) return { delegatedAccountId: getId };
    }
    return null;
  }

  return null;
}

/**
 * Tries to upgrade a backend EOA to a Delegated Account (EIP-7702) for gasless transactions.
 * See https://www.openfort.io/docs/products/server/usage (Sending gasless transactions).
 * Returns delegatedAccountId when the SDK or API supports backend.update; otherwise null.
 */
export async function tryUpgradeBackendWalletToDelegated(
  openfortClient: Openfort,
  walletId: string,
  chainId: number,
  rpcUrl: string,
  apiSecretKey: string,
): Promise<{ delegatedAccountId: string } | null> {
  const result = await getDelegatedAccountAuth(
    openfortClient,
    walletId,
    chainId,
    rpcUrl,
    apiSecretKey,
  );
  return result.delegatedAccountId
    ? { delegatedAccountId: result.delegatedAccountId }
    : null;
}

/**
 * Builds EIP-7702 delegation signature and resolves Delegated Account id (SDK, API, or env override).
 * See https://www.openfort.io/docs/products/server/usage (Sending gasless transactions).
 */
async function getDelegatedAccountAuth(
  openfortClient: Openfort,
  walletId: string,
  chainId: number,
  rpcUrl: string,
  apiSecretKey: string,
  delegatedAccountIdOverride?: string,
): Promise<{ delegatedAccountId?: string; signedAuthorization: Hex }> {
  const account = await openfortClient.accounts.evm.backend.get({
    id: walletId,
  });
  if (!account) {
    throw new PaymentVerificationError(
      "TX_BROADCAST_FAILED",
      "Backend wallet account not found for EIP-7702 auth",
    );
  }
  const publicClient = createPublicClient({ transport: http(rpcUrl) });
  const eoaNonce = await publicClient.getTransactionCount({
    address: account.address as Address,
  });
  const authHash = hashAuthorization({
    contractAddress: EIP7702_CALIBUR_IMPLEMENTATION,
    chainId,
    nonce: eoaNonce,
  });
  const signedAuthorization = await account.sign({ hash: authHash });

  if (delegatedAccountIdOverride?.trim()) {
    return {
      delegatedAccountId: delegatedAccountIdOverride.trim(),
      signedAuthorization,
    };
  }

  const backend = openfortClient.accounts.evm.backend as {
    update?: (params: {
      id: string;
      accountType: string;
      chainType: string;
      chainId: number;
      implementationType: string;
    }) => Promise<{ delegatedAccount?: { id: string } }>;
  };
  if (typeof backend.update === "function") {
    try {
      const updated = await backend.update({
        id: walletId,
        accountType: "Delegated Account",
        chainType: "EVM",
        chainId,
        implementationType: "Calibur",
      });
      const delegatedId = updated?.delegatedAccount?.id;
      if (delegatedId)
        return { delegatedAccountId: delegatedId, signedAuthorization };
    } catch (updateErr) {
      const msg =
        typeof updateErr === "object" &&
        updateErr !== null &&
        "message" in updateErr
          ? String((updateErr as { message: unknown }).message)
          : String(updateErr);
      console.error("Error updating backend wallet to delegated account", msg);
      // Account` already exist → resolve via API; other errors → fall through to API
    }
  }

  const apiResult = await openfortBackendUpdateToDelegated(
    apiSecretKey,
    walletId,
    chainId,
  );
  if (apiResult)
    return {
      delegatedAccountId: apiResult.delegatedAccountId,
      signedAuthorization,
    };

  return { signedAuthorization };
}

/**
 * Submits transferWithAuthorization via Openfort transaction intents with policy gas sponsorship.
 * Flow: EOA (backend wallet, walletId) signs the userOpHash; the Delegated Account (delegatedAccountId,
 * same on-chain address as EOA but with EIP-7702 code) is the transaction sender. Backend wallet must
 * be upgraded to a Delegated Account for the chain; see
 * https://www.openfort.io/docs/products/server/usage (Sending gasless transactions).
 * When policyId is empty, no policy is sent and Openfort uses project-scoped fee sponsorship (auto-discovered).
 * When policyId is set, it is sent for transaction-scoped fee sponsorship.
 */
export async function submitTransferWithAuthorizationGasless(
  openfortClient: Openfort,
  walletId: string,
  policyId: string,
  payload: PaymentPayload,
  asset: Address,
  rpcUrl: string,
  apiSecretKey: string,
  delegatedAccountIdOverride?: string,
): Promise<Hex> {
  const chainId = NETWORK_CHAIN_ID[payload.network];
  const { authorization, signature } = payload.payload;
  const { v, r, s } = splitSignature(signature);

  const data = encodeFunctionData({
    abi: TRANSFER_WITH_AUTHORIZATION_ABI,
    functionName: "transferWithAuthorization",
    args: [
      getAddress(authorization.from),
      getAddress(authorization.to),
      BigInt(authorization.value),
      BigInt(authorization.validAfter),
      BigInt(authorization.validBefore),
      authorization.nonce,
      v,
      r,
      s,
    ],
  });

  const { delegatedAccountId, signedAuthorization: signedAuth } =
    await getDelegatedAccountAuth(
      openfortClient,
      walletId,
      chainId,
      rpcUrl,
      apiSecretKey,
      delegatedAccountIdOverride,
    );

  if (!delegatedAccountId) {
    throw new PaymentVerificationError(
      "TX_BROADCAST_FAILED",
      "Account type not supported (backend EOA cannot use policy; Delegated Account upgrade not available from API)",
    );
  }

  // Project-scoped fee sponsorship: omit policy so Openfort auto-discovers. Transaction-scoped: send policy.
  const createParams = {
    chainId,
    account: delegatedAccountId,
    ...(policyId.trim() ? { policy: policyId.trim() } : {}),
    signedAuthorization: signedAuth,
    interactions: [{ to: asset, data }],
  };
  let intent: Awaited<
    ReturnType<typeof openfortClient.transactionIntents.create>
  >;
  try {
    intent = await openfortClient.transactionIntents.create(
      createParams as Parameters<
        typeof openfortClient.transactionIntents.create
      >[0],
    );
  } catch (err) {
    const msg = openfortErrorMessage(err);
    const invalidPol =
      typeof msg === "string" &&
      (msg.includes("Invalid pol") || msg.includes("Invalid policy"));
    throw new PaymentVerificationError(
      "TX_BROADCAST_FAILED",
      invalidPol
        ? `${msg} Use a fee sponsorship policy from the Fee sponsorships tab (not a backend wallet policy). For project-scoped gas sponsorship, leave OPENFORT_POLICY_ID empty.`
        : msg,
    );
  }

  let txHash = intent.response?.transactionHash;

  // For non-custodial accounts Openfort returns nextAction.payload.signableHash.
  // For custodial EIP-7702 Delegated Accounts, Openfort cannot auto-sign (AA V8 limitation),
  // so nextAction is absent. Fall back to intent.details.userOperationHash which AA V8 always exposes.
  const nextActionHash = (
    intent.nextAction?.payload as { signableHash?: string } | undefined
  )?.signableHash;
  const detailsHash = (
    intent.details as { userOperationHash?: string } | null | undefined
  )?.userOperationHash;
  const hashToSign = nextActionHash ?? detailsHash;

  if (!txHash && hashToSign) {
    // Sign the userOperationHash with the backend wallet EOA key.
    // Must be a raw hash sign (no EIP-191 prefix) — the Calibur validateUserOp
    // verifies ecrecover(userOpHash, sig) === owner (the delegating EOA).
    const account = await openfortClient.accounts.evm.backend.get({
      id: walletId,
    });
    if (!account) {
      throw new PaymentVerificationError(
        "TX_BROADCAST_FAILED",
        "Backend wallet account not found for signing intent",
      );
    }
    const signableHex = hashToSign.startsWith("0x")
      ? hashToSign
      : `0x${hashToSign}`;

    let sig: string;
    try {
      sig = await account.sign({ hash: signableHex as Hex });
    } catch (signErr) {
      throw new PaymentVerificationError(
        "TX_BROADCAST_FAILED",
        `Backend sign failed: ${signErr instanceof Error ? signErr.message : String(signErr)}`,
      );
    }

    // Openfort docs pass raw signature; use yParity only if OPENFORT_SIGNATURE_YPARITY=1 (for debugging).
    const useYParity = process.env.OPENFORT_SIGNATURE_YPARITY === "1";
    const signatureForApi = useYParity ? signatureToYParityFormat(sig) : sig;

    // EOA (backend wallet) signs userOpHash; delegated account (same address, with code) is the UserOp sender.
    // Use SDK so Openfort receives the signature in the format it expects (matches docs: transactionIntents.signature(txIntent.id, { signature })).
    let signed: Awaited<
      ReturnType<typeof openfortClient.transactionIntents.signature>
    >;
    try {
      signed = await openfortClient.transactionIntents.signature(intent.id, {
        signature: signatureForApi,
      });
    } catch (sigApiErr) {
      const msg = openfortErrorMessage(sigApiErr);
      throw new PaymentVerificationError("TX_BROADCAST_FAILED", msg);
    }
    txHash = signed.response?.transactionHash;
  }

  // Openfort may broadcast asynchronously — poll up to 10s for the transaction hash.
  if (!txHash) {
    for (let attempt = 0; attempt < 5; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(
        `${OPENFORT_API_BASE}/v1/transaction_intents/${encodeURIComponent(intent.id)}`,
        { headers: { Authorization: `Bearer ${apiSecretKey}` } },
      );
      if (pollRes.ok) {
        const polled = (await pollRes.json()) as IntentDiagnosticShape;
        txHash = (polled.response as { transactionHash?: string } | undefined)
          ?.transactionHash;
        if (txHash) break;
      }
    }
  }

  if (!txHash) {
    throw new PaymentVerificationError(
      "TX_BROADCAST_FAILED",
      `Openfort intent ${intent.id} created but no transactionHash. Check fee sponsorship (${policyId ? `policy ${policyId}` : "project-scoped policy"}) in Openfort dashboard. See server logs for intent/response details.`,
    );
  }
  return txHash as Hex;
}

export function toErrorJson(err: unknown): object {
  if (err instanceof PaymentVerificationError)
    return { name: err.name, code: err.code, message: err.message };
  if (err instanceof Error)
    return { name: err.name, message: err.message, stack: err.stack };
  return { value: String(err) };
}

type IntentDiagnosticShape = {
  id?: string;
  response?: unknown;
  nextAction?: { type?: string; payload?: Record<string, unknown> };
  status?: unknown;
};

// ---- Helpers ----

/** Extract a readable message from Openfort API errors (errorMessage.message) or standard Error. */
function openfortErrorMessage(err: unknown): string {
  if (err !== null && typeof err === "object") {
    const o = err as Record<string, unknown>;
    const em = o.errorMessage;
    if (
      em !== null &&
      typeof em === "object" &&
      typeof (em as Record<string, unknown>).message === "string"
    ) {
      return (em as Record<string, string>).message;
    }
    if (typeof em === "string") return em;
  }
  if (err instanceof Error && err.message && err.message !== "[object Object]")
    return err.message;
  return "Openfort transaction intent failed";
}

function generateNonce(): Hex {
  return `0x${randomBytes(32).toString("hex")}` as Hex;
}

export function parsePaymentPayload(raw: unknown): PaymentPayload {
  if (typeof raw !== "object" || raw === null) {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Payment payload must be an object",
    );
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.x402Version !== "number") {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Missing or invalid x402Version",
    );
  }

  if (obj.scheme !== "exact") {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Unsupported payment scheme",
    );
  }

  const network = obj.network;
  if (network !== "base-sepolia" && network !== "base") {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Unsupported network",
    );
  }

  const payload = obj.payload;
  if (typeof payload !== "object" || payload === null) {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Missing payload object",
    );
  }

  const p = payload as Record<string, unknown>;
  const authorization = p.authorization;
  if (typeof authorization !== "object" || authorization === null) {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Missing authorization object",
    );
  }

  const auth = authorization as Record<string, unknown>;
  const authFields = [
    "from",
    "to",
    "value",
    "validAfter",
    "validBefore",
    "nonce",
  ] as const;
  for (const field of authFields) {
    if (typeof auth[field] !== "string") {
      throw new PaymentVerificationError(
        "MALFORMED_PAYLOAD",
        `Missing or invalid authorization.${field}`,
      );
    }
  }

  if (typeof p.signature !== "string") {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Missing signature",
    );
  }

  return {
    x402Version: obj.x402Version,
    scheme: "exact",
    network: network as SupportedNetwork,
    payload: {
      signature: p.signature as Hex,
      authorization: {
        from: auth.from as Address,
        to: auth.to as Address,
        value: auth.value as string,
        validAfter: auth.validAfter as string,
        validBefore: auth.validBefore as string,
        nonce: auth.nonce as Hex,
      },
    },
  };
}

export function decodePaymentHeader(paymentHeader: string): unknown {
  if (!paymentHeader) {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Missing payment header",
    );
  }
  try {
    const decoded = Buffer.from(paymentHeader, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    throw new PaymentVerificationError(
      "MALFORMED_PAYLOAD",
      "Failed to decode payment header",
    );
  }
}

export function createPaymentRequiredResponse(
  paywallConfig: Config["paywall"],
) {
  return {
    error: "Payment required",
    x402Version: 1,
    paymentRequirements: {
      ...paywallConfig.payment,
      payTo: paywallConfig.payToAddress,
    },
  };
}
