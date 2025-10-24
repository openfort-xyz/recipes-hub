import type { Address } from "viem";

export const NETWORK_CHAIN_ID = {
  "base-sepolia": 84532,
  base: 8453,
} as const;

export type SupportedNetwork = keyof typeof NETWORK_CHAIN_ID;

export const USDC_ADDRESSES: Record<number, Address> = {
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

export function getNetworkId(network: SupportedNetwork): number {
  return NETWORK_CHAIN_ID[network];
}
