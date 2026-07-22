export const HYPERLIQUID_TESTNET_HTTP_URL = "https://api.hyperliquid-testnet.xyz";
export const HYPERLIQUID_TESTNET_WS_URL = "wss://api.hyperliquid-testnet.xyz/ws";

// Bridge2 deposit contract on Arbitrum Sepolia. Any transfer of >= 5 USDC2
// sent here is credited to the sender's Hyperliquid account within ~1 minute.
// Verified on-chain (Blockscout, tagged "Bridge2", recent `batchedDepositWithPermit`
// / plain-transfer deposits observed): https://sepolia.arbiscan.io/address/0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89
export const HYPERLIQUID_BRIDGE_ADDRESS = "0x08cfc1B6b2dCF36A1480b99353A354AA8AC56f89" as const;

// The token Hyperliquid's testnet Bridge2 actually accepts is "USDC2", not the
// Circle "USD Coin" proxy at 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d that this
// constant previously pointed to. Verified by reading Bridge2's recent deposit/
// withdrawal transfers on-chain — every one moves USDC2, none move the Circle token.
export const HYPERLIQUID_USDC_TOKEN_ADDRESS = "0x1baAbB04529D43a73232B713C0FE471f7c7334d5" as const;
export const HYPERLIQUID_USDC_DECIMALS = 6;

export const HYPERLIQUID_MIN_DEPOSIT_USDC = 5;

export const HYPE_ASSET_ID = 11035 as const; // 10000 + 1035 (spot asset index for orders)
export const HYPE_MARKET_ID = `@1035` as const; // Raw index for price queries
export const HYPE_SYMBOL = "HYPE";

export const PRICE_POLL_INTERVAL_MS = 3000;

export const DEFAULT_SLIPPAGE = 0.02; // 2% default slippage for trades
