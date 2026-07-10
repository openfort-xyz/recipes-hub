import type { OpenfortProviderProps } from "@openfort/react-native";

// MAINNET ONLY — this recipe has no testnet target. Lighter's L1 deposit contract and the
// account's owning EOA both live on Ethereum mainnet; transactions here move real funds.
export const MAINNET_CHAIN_ID = 1;

export const ETHEREUM_MAINNET_CHAIN = {
  id: MAINNET_CHAIN_ID,
  name: "Ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://ethereum-rpc.publicnode.com", "https://eth.merkle.io"],
    },
  },
} as const;

export const SUPPORTED_CHAINS = [ETHEREUM_MAINNET_CHAIN] as OpenfortProviderProps["supportedChains"];
