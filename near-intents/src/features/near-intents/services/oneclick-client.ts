import type {
  ExecutionStatusResponse,
  OneClickToken,
  QuoteRequestParams,
  QuoteResponse,
} from "@/features/near-intents/types";

// Browser-side helpers. These call our own /api routes, which inject the JWT
// server-side and forward to the 1Click API.

const parseError = async (
  response: Response,
  fallback: string
): Promise<Error> => {
  try {
    const body = await response.json();
    return new Error(body?.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
};

export const loadTokens = async (): Promise<OneClickToken[]> => {
  const response = await fetch("/api/tokens");
  if (!response.ok) {
    throw await parseError(response, "Failed to load tokens");
  }
  return response.json();
};

export const getQuote = async (
  params: QuoteRequestParams
): Promise<QuoteResponse> => {
  const response = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    throw await parseError(response, "Failed to fetch quote");
  }
  return response.json();
};

export const getStatus = async (
  depositAddress: string,
  depositMemo?: string
): Promise<ExecutionStatusResponse> => {
  const query = new URLSearchParams({ depositAddress });
  if (depositMemo) {
    query.set("depositMemo", depositMemo);
  }
  const response = await fetch(`/api/status?${query.toString()}`);
  if (!response.ok) {
    throw await parseError(response, "Failed to fetch status");
  }
  return response.json();
};

export const notifyDeposit = async (input: {
  txHash: string;
  depositAddress: string;
  memo?: string;
}): Promise<void> => {
  await fetch("/api/deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
};
