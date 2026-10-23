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

// Tokens a Gnosis Pay account on Gnosis Chain spends from, keyed by the account's native currency.
// https://docs.gnosispay.com/concepts/safe/tokens-and-chains-supported
export const TOKENS_BY_CURRENCY: Record<string, SpendableToken> = {
  EUR: { symbol: "EURe", address: "0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430", decimals: 18 },
  GBP: { symbol: "GBPe", address: "0x8E34bfEC4f6Eb781f9743D9b4af99CD23F9b7053", decimals: 18 },
  USD: { symbol: "USDCe", address: "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0", decimals: 6 },
};
