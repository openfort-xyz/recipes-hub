import {
  QUOTE_DEADLINE_MINUTES,
  SLIPPAGE_TOLERANCE_BPS,
} from "@/features/near-intents/constants";
import type {
  ExecutionStatusResponse,
  OneClickToken,
  QuoteRequestParams,
  QuoteResponse,
} from "@/features/near-intents/types";

// Server-only helpers for the NEAR Intents 1Click API. The JWT lives here and
// is never exposed to the browser — every call is proxied through /api routes.

const BASE_URL =
  process.env.ONECLICK_BASE_URL ?? "https://1click.chaindefuser.com";
const JWT = process.env.ONECLICK_JWT;

const authHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (JWT) {
    headers.Authorization = `Bearer ${JWT}`;
  }
  return headers;
};

const toError = async (response: Response): Promise<Error> => {
  let detail = response.statusText;
  try {
    const body = await response.json();
    detail = body?.message ?? JSON.stringify(body);
  } catch {
    // Non-JSON error body — fall back to the status text.
  }
  return new Error(`1Click ${response.status}: ${detail}`);
};

export const fetchTokens = async (): Promise<OneClickToken[]> => {
  const response = await fetch(`${BASE_URL}/v0/tokens`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return response.json();
};

export const requestQuote = async (
  params: QuoteRequestParams
): Promise<QuoteResponse> => {
  const deadline = new Date(
    Date.now() + QUOTE_DEADLINE_MINUTES * 60_000
  ).toISOString();

  const body = {
    dry: params.dry,
    swapType: "EXACT_INPUT",
    slippageTolerance: SLIPPAGE_TOLERANCE_BPS,
    depositType: "ORIGIN_CHAIN",
    refundType: "ORIGIN_CHAIN",
    recipientType: "DESTINATION_CHAIN",
    depositMode: "SIMPLE",
    originAsset: params.originAsset,
    destinationAsset: params.destinationAsset,
    amount: params.amount,
    recipient: params.recipient,
    refundTo: params.refundTo,
    deadline,
  };

  const response = await fetch(`${BASE_URL}/v0/quote`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return response.json();
};

export const fetchStatus = async (
  depositAddress: string,
  depositMemo?: string
): Promise<ExecutionStatusResponse> => {
  const query = new URLSearchParams({ depositAddress });
  if (depositMemo) {
    query.set("depositMemo", depositMemo);
  }
  const response = await fetch(`${BASE_URL}/v0/status?${query.toString()}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!response.ok) {
    throw await toError(response);
  }
  return response.json();
};

export const submitDeposit = async (input: {
  txHash: string;
  depositAddress: string;
  memo?: string;
}): Promise<void> => {
  const response = await fetch(`${BASE_URL}/v0/deposit/submit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw await toError(response);
  }
};
