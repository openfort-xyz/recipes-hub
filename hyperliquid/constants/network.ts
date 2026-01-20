import { OpenfortProviderProps } from "@openfort/react-native";

export const CHAIN_IDS = {
  ARBITRUM_SEPOLIA: 421614,
} as const;

export const CHAIN_IDS_HEX = {
  ARBITRUM_SEPOLIA: `0x${CHAIN_IDS.ARBITRUM_SEPOLIA.toString(16)}` as const,
} as const;

export const ARBITRUM_SEPOLIA_CHAIN = {
  id: CHAIN_IDS.ARBITRUM_SEPOLIA,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://sepolia-rollup.arbitrum.io/rpc",
        "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
        "https://arb-sepolia.g.alchemy.com/v2/demo",
      ],
    },
  },
} as const;

export const SUPPORTED_CHAINS = [ARBITRUM_SEPOLIA_CHAIN] as OpenfortProviderProps["supportedChains"];

export type SupportedChainId = NonNullable<typeof SUPPORTED_CHAINS>[number]["id"];
