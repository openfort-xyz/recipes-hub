import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getExplorerUrl = (txHash: string, chainId?: number) => {
  if (!chainId) return null;

  const explorers: { [key: number]: string } = {
    1: `https://etherscan.io/tx/${txHash}`,
    10: `https://optimistic.etherscan.io/tx/${txHash}`,
    137: `https://polygonscan.com/tx/${txHash}`,
    42161: `https://arbiscan.io/tx/${txHash}`,
    8453: `https://basescan.org/tx/${txHash}`,
    56: `https://bscscan.com/tx/${txHash}`,
    43114: `https://snowtrace.io/tx/${txHash}`,
    250: `https://ftmscan.com/tx/${txHash}`,
    100: `https://gnosisscan.io/tx/${txHash}`,
    1101: `https://zkevm.polygonscan.com/tx/${txHash}`,
    7777777: `https://explorer.zora.energy/tx/${txHash}`,
    11155420: `https://sepolia.optimism.io/tx/${txHash}`,
    11155111: `https://sepolia.etherscan.io/tx/${txHash}`,
    80001: `https://mumbai.polygonscan.com/tx/${txHash}`,
  };

  return explorers[chainId] || null;
};

// Explorer tx-URL builders keyed by 1Click blockchain identifiers. Origin
// chains are always EVM, but destinations can be any chain NEAR Intents
// supports, so non-EVM explorers are included too.
const EXPLORER_BY_BLOCKCHAIN: Record<string, (txHash: string) => string> = {
  eth: (tx) => `https://etherscan.io/tx/${tx}`,
  base: (tx) => `https://basescan.org/tx/${tx}`,
  arb: (tx) => `https://arbiscan.io/tx/${tx}`,
  op: (tx) => `https://optimistic.etherscan.io/tx/${tx}`,
  pol: (tx) => `https://polygonscan.com/tx/${tx}`,
  avax: (tx) => `https://snowtrace.io/tx/${tx}`,
  bsc: (tx) => `https://bscscan.com/tx/${tx}`,
  gnosis: (tx) => `https://gnosisscan.io/tx/${tx}`,
  scroll: (tx) => `https://scrollscan.com/tx/${tx}`,
  bera: (tx) => `https://berascan.com/tx/${tx}`,
  sol: (tx) => `https://solscan.io/tx/${tx}`,
  btc: (tx) => `https://mempool.space/tx/${tx}`,
  near: (tx) => `https://nearblocks.io/txns/${tx}`,
  tron: (tx) => `https://tronscan.org/#/transaction/${tx}`,
  ton: (tx) => `https://tonviewer.com/transaction/${tx}`,
  xrp: (tx) => `https://xrpscan.com/tx/${tx}`,
  doge: (tx) => `https://blockchair.com/dogecoin/transaction/${tx}`,
  ltc: (tx) => `https://blockchair.com/litecoin/transaction/${tx}`,
  bch: (tx) => `https://blockchair.com/bitcoin-cash/transaction/${tx}`,
  zec: (tx) => `https://blockchair.com/zcash/transaction/${tx}`,
  dash: (tx) => `https://blockchair.com/dash/transaction/${tx}`,
  sui: (tx) => `https://suiscan.xyz/mainnet/tx/${tx}`,
  stellar: (tx) => `https://stellar.expert/explorer/public/tx/${tx}`,
  aptos: (tx) => `https://explorer.aptoslabs.com/txn/${tx}?network=mainnet`,
  cardano: (tx) => `https://cardanoscan.io/transaction/${tx}`,
  starknet: (tx) => `https://starkscan.co/tx/${tx}`,
};

/**
 * Resolves the explorer link for a transaction reported by the 1Click status
 * endpoint. The API sometimes returns an empty or relative `explorerUrl`; a
 * relative href would silently resolve against this app's own origin, so only
 * absolute http(s) URLs are trusted and everything else falls back to a
 * per-blockchain explorer (or null, in which case no link is rendered).
 */
export const resolveTxExplorerUrl = (
  tx: { hash: string; explorerUrl?: string },
  blockchain?: string
): string | null => {
  if (tx.explorerUrl && /^https?:\/\//.test(tx.explorerUrl)) {
    return tx.explorerUrl;
  }
  const build = blockchain ? EXPLORER_BY_BLOCKCHAIN[blockchain] : undefined;
  return build ? build(tx.hash) : null;
};

export const formatAmount = (amount: string, decimals: number) => {
  try {
    const value = Number(amount) / 10 ** decimals;
    return value.toFixed(6);
  } catch {
    return "0";
  }
};
