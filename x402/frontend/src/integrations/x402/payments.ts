import { getAddress, toHex, type Address, type Hex } from "viem";

import { AUTHORIZATION_TYPES } from "./contracts";
import { getNetworkId } from "./networks";
import type {
  ExactEvmPayloadAuthorization,
  PaymentPayload,
  PaymentRequirements,
  UnsignedPaymentPayload,
} from "./types";

export function preparePaymentHeader(
  from: Address,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): UnsignedPaymentPayload {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const { validAfter, validBefore } = getAuthorizationWindow(
    nowSeconds,
    paymentRequirements.maxTimeoutSeconds,
  );

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined,
      authorization: {
        from,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce: createNonce(),
      },
    },
  };
}

export async function createPayment(
  client: any,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const accountAddress = resolveAccountAddress(client);
  if (!accountAddress) {
    throw new Error("Wallet client missing account address");
  }

  const unsigned = preparePaymentHeader(accountAddress, x402Version, paymentRequirements);
  const signed = await signPaymentHeader(client, accountAddress, paymentRequirements, unsigned);
  return signed;
}

export function encodePayment(payment: PaymentPayload): string {
  const safePayload = {
    ...payment,
    payload: {
      ...payment.payload,
      authorization: {
        ...payment.payload.authorization,
      },
    },
  };
  return toBase64(JSON.stringify(safePayload));
}

function getAuthorizationWindow(nowSeconds: number, maxTimeoutSeconds: number): {
  validAfter: string;
  validBefore: string;
} {
  return {
    validAfter: BigInt(nowSeconds - 600).toString(),
    validBefore: BigInt(nowSeconds + maxTimeoutSeconds).toString(),
  };
}

async function signPaymentHeader(
  client: any,
  accountAddress: Address,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<PaymentPayload> {
  const domain = buildAuthorizationDomain(paymentRequirements);

  const { authorization } = unsignedPaymentHeader.payload;
  const signature = await client.signTypedData({
    account: accountAddress,
    domain,
    types: AUTHORIZATION_TYPES,
    primaryType: "TransferWithAuthorization",
    message: buildAuthorizationMessage(authorization),
  });

  return {
    ...unsignedPaymentHeader,
    payload: {
      authorization,
      signature,
    },
  };
}

function buildAuthorizationDomain(paymentRequirements: PaymentRequirements) {
  const chainId = getNetworkId(paymentRequirements.network);
  return {
    name: paymentRequirements.extra?.name ?? "USD Coin",
    version: paymentRequirements.extra?.version ?? "2",
    chainId,
    verifyingContract: getAddress(paymentRequirements.asset),
  };
}

function buildAuthorizationMessage(authorization: ExactEvmPayloadAuthorization) {
  return {
    from: getAddress(authorization.from),
    to: getAddress(authorization.to),
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  };
}

function resolveAccountAddress(client: any): Address | undefined {
  if (typeof client.account === "string") {
    return getAddress(client.account);
  }
  if (client.account?.address) {
    return getAddress(client.account.address);
  }
  return undefined;
}

function createNonce(): Hex {
  const bytes = new Uint8Array(32);
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(bytes);
}

function toBase64(data: string): string {
  if (typeof globalThis !== "undefined" && typeof globalThis.btoa === "function") {
    return globalThis.btoa(unescape(encodeURIComponent(data)));
  }
  if (typeof globalThis !== "undefined") {
    const maybeBuffer = (globalThis as Record<string, any>).Buffer;
    if (typeof maybeBuffer?.from === "function") {
      return maybeBuffer.from(data, "utf-8").toString("base64");
    }
  }
  throw new Error("Base64 encoding not supported in this environment");
}
