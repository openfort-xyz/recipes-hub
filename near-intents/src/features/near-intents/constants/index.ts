// Origin chains: the Openfort embedded wallet signs the deposit here via wagmi,
// so origin is restricted to the EVM chains configured in wagmi-config.
export const EVM_ORIGIN_CHAIN_ID = {
  eth: 1,
  base: 8453,
  arb: 42161,
  op: 10,
  pol: 137,
  avax: 43114,
} as const;

export type OriginBlockchain = keyof typeof EVM_ORIGIN_CHAIN_ID;

export const ORIGIN_BLOCKCHAINS = Object.keys(
  EVM_ORIGIN_CHAIN_ID
) as OriginBlockchain[];

export const isOriginBlockchain = (blockchain: string): blockchain is OriginBlockchain =>
  blockchain in EVM_ORIGIN_CHAIN_ID;

interface ChainMeta {
  label: string;
  color: string;
  isEvm: boolean;
}

// Metadata for every chain we surface. Destinations can be any of these —
// including non-EVM — because the destination is just a recipient address that
// the solver network delivers to.
export const CHAIN_META: Record<string, ChainMeta> = {
  eth: { label: "Ethereum", color: "#627EEA", isEvm: true },
  base: { label: "Base", color: "#0052FF", isEvm: true },
  arb: { label: "Arbitrum", color: "#28A0F0", isEvm: true },
  op: { label: "Optimism", color: "#FF0420", isEvm: true },
  pol: { label: "Polygon", color: "#8247E5", isEvm: true },
  avax: { label: "Avalanche", color: "#E84142", isEvm: true },
  bsc: { label: "BNB Chain", color: "#F0B90B", isEvm: true },
  gnosis: { label: "Gnosis", color: "#3E6957", isEvm: true },
  bera: { label: "Berachain", color: "#814625", isEvm: true },
  scroll: { label: "Scroll", color: "#EBC28E", isEvm: true },
  monad: { label: "Monad", color: "#836EF9", isEvm: true },
  xlayer: { label: "X Layer", color: "#1A1A1A", isEvm: true },
  plasma: { label: "Plasma", color: "#1A1A1A", isEvm: true },
  abs: { label: "Abstract", color: "#1A1A1A", isEvm: true },
  sol: { label: "Solana", color: "#14B789", isEvm: false },
  btc: { label: "Bitcoin", color: "#F7931A", isEvm: false },
  doge: { label: "Dogecoin", color: "#C2A633", isEvm: false },
  xrp: { label: "XRP", color: "#23292F", isEvm: false },
  ton: { label: "TON", color: "#0098EA", isEvm: false },
  tron: { label: "Tron", color: "#EF0027", isEvm: false },
  near: { label: "NEAR", color: "#1A1A1A", isEvm: false },
  sui: { label: "Sui", color: "#4DA2FF", isEvm: false },
  stellar: { label: "Stellar", color: "#1A1A1A", isEvm: false },
  aptos: { label: "Aptos", color: "#1A1A1A", isEvm: false },
  cardano: { label: "Cardano", color: "#0033AD", isEvm: false },
  ltc: { label: "Litecoin", color: "#345D9D", isEvm: false },
  bch: { label: "Bitcoin Cash", color: "#0AC18E", isEvm: false },
  zec: { label: "Zcash", color: "#C99D2E", isEvm: false },
  dash: { label: "Dash", color: "#008CE7", isEvm: false },
  starknet: { label: "Starknet", color: "#0C0C4F", isEvm: false },
  aleo: { label: "Aleo", color: "#1A1A1A", isEvm: false },
  movement: { label: "Movement", color: "#1A1A1A", isEvm: false },
  hypercore: { label: "Hypercore", color: "#072723", isEvm: false },
  adi: { label: "ADI", color: "#1A1A1A", isEvm: false },
};

export const chainLabel = (blockchain: string): string =>
  CHAIN_META[blockchain]?.label ?? blockchain.toUpperCase();

// Back-compat label lookup keyed by the origin chains.
export const BLOCKCHAIN_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(CHAIN_META).map(([key, meta]) => [key, meta.label])
);

export const DEFAULT_SWAP_AMOUNT = "1";

// Slippage tolerance in basis points (100 = 1%).
export const SLIPPAGE_TOLERANCE_BPS = 100;

// How long the deposit address stays valid before refunds begin.
export const QUOTE_DEADLINE_MINUTES = 30;

export const STATUS_POLL_INTERVAL_MS = 4000;

export const TERMINAL_STATUSES = ["SUCCESS", "REFUNDED", "FAILED"] as const;
