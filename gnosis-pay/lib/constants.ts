import { parseUnits } from "ethers";

// Gnosis Chain — where Gnosis Pay accounts and their spendable stablecoins live.
export const GNOSIS_CHAIN_ID = 100;

// Recovery password used to auto-create/restore the embedded wallet in this demo.
// Password recovery keeps the key client-side encrypted (no backend). In a real
// app, collect this from the user or use automatic recovery via a backend.
export const DEMO_RECOVERY_PASSWORD = "openfort-gnosis-pay-demo";

export const GNOSIS_CHAIN = {
  id: GNOSIS_CHAIN_ID,
  name: "Gnosis",
  nativeCurrency: { name: "xDAI", symbol: "XDAI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.gnosischain.com"] },
  },
  blockExplorers: {
    default: { name: "Gnosisscan", url: "https://gnosisscan.io" },
  },
} as const;

export type SpendableToken = {
  symbol: string;
  address: string;
  decimals: number;
};

// Tokens a Gnosis Pay card can spend from its Safe.
// https://help.gnosispay.com/hc/en-us/articles/39563942614292-Spendable-Tokens-for-Your-Gnosis-Card-Safe
export const SPENDABLE_TOKENS: Record<string, SpendableToken> = {
  EURe: { symbol: "EURe", address: "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", decimals: 18 },
  GBPe: { symbol: "GBPe", address: "0x8E34bfEC4f6Eb781f9743D9b4af99CD23F9b7053", decimals: 18 },
  USDCe: { symbol: "USDCe", address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0", decimals: 6 },
};

// The card's settlement currency for this recipe.
export const CARD_TOKEN = SPENDABLE_TOKENS.EURe;

// Default spending allowance applied during account setup (Roles module).
export const SETUP_ALLOWANCE = {
  // Amount that refills each period, denominated in CARD_TOKEN units.
  refill: parseUnits("100", CARD_TOKEN.decimals),
  // Refill cadence, in seconds (24h).
  period: 60 * 60 * 24,
};

// Default Delay module configuration applied during account setup.
export const SETUP_DELAY = {
  // Seconds an allowance/owner change waits in the queue before it can run.
  // Gnosis Pay uses 180s; kept here so the security model is visible in the demo.
  cooldown: 180,
  // 0 means a queued change never expires.
  expiration: 0,
};
