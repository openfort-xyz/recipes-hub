/** Raw token entry returned by GET /v0/tokens. */
export interface OneClickToken {
  assetId: string;
  decimals: number;
  blockchain: string;
  symbol: string;
  price: number;
  priceUpdatedAt: string;
  contractAddress?: string;
}

/**
 * A token surfaced in the UI. Origin assets are always EVM (the wallet signs
 * the deposit there); destination assets can be any chain NEAR Intents
 * supports, including non-EVM ones, so `chainId` is only set for EVM chains.
 */
export interface SwapAsset {
  assetId: string;
  symbol: string;
  decimals: number;
  blockchain: string;
  /** Set only for EVM chains; undefined for Solana, Bitcoin, etc. */
  chainId?: number;
  /** Undefined for a chain's native asset (ETH, SOL, BTC, ...). */
  contractAddress?: `0x${string}`;
  isNative: boolean;
  isEvm: boolean;
  price: number;
}

/** The `quote` object inside a /v0/quote response. */
export interface Quote {
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted: string;
  amountInUsd: string;
  minAmountIn: string;
  amountOut: string;
  amountOutFormatted: string;
  amountOutUsd: string;
  minAmountOut: string;
  deadline?: string;
  timeWhenInactive?: string;
  timeEstimate: number;
  refundFee?: string;
  withdrawFee?: string;
}

export interface QuoteResponse {
  correlationId: string;
  timestamp: string;
  signature: string;
  quote: Quote;
}

export type SwapStatus =
  | "KNOWN_DEPOSIT_TX"
  | "PENDING_DEPOSIT"
  | "INCOMPLETE_DEPOSIT"
  | "PROCESSING"
  | "SUCCESS"
  | "REFUNDED"
  | "FAILED";

export interface TransactionDetails {
  hash: string;
  explorerUrl: string;
}

export interface SwapDetails {
  amountInFormatted?: string;
  amountOutFormatted?: string;
  originChainTxHashes: TransactionDetails[];
  destinationChainTxHashes: TransactionDetails[];
  refundedAmountFormatted?: string;
  refundReason?: string;
}

export interface ExecutionStatusResponse {
  status: SwapStatus;
  updatedAt: string;
  quoteResponse: QuoteResponse;
  swapDetails: SwapDetails;
}

/**
 * Privacy level for a swap. `public` is a normal on-chain swap. `basic` and
 * `advanced` route the swap through NEAR's Confidential Intents so the trade is
 * not broadcast publicly. Confidential levels require an authenticated (JWT)
 * 1Click integration that has been granted access — see the README.
 */
export type Confidentiality = "public" | "basic" | "advanced";

/** Client-supplied portion of a quote request; the server fills the rest. */
export interface QuoteRequestParams {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  refundTo: string;
  dry: boolean;
  /** Defaults to `public` when omitted. */
  confidentiality?: Confidentiality;
}
