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

export const formatAmount = (amount: string, decimals: number) => {
  try {
    const value = Number(amount) / 10 ** decimals;
    return value.toFixed(6);
  } catch {
    return "0";
  }
};
