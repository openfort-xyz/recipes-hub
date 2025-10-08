import { getDefaultConfig } from "@openfort/react";
import { createConfig } from "wagmi";
import {
  arbitrum,
  arbitrumSepolia,
  avalanche,
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  polygonAmoy,
  sepolia,
} from "wagmi/chains";

const DEFAULT_CHAIN_ID = Number.parseInt(
  process.env.NEXT_PUBLIC_OPENFORT_DEFAULT_CHAIN_ID ?? "11155111",
  10
);

const mainnetIds = new Set([
  mainnet.id,
  polygon.id,
  arbitrum.id,
  optimism.id,
  base.id,
  avalanche.id,
]);

const chains = (mainnetIds.has(DEFAULT_CHAIN_ID)
  ? [mainnet, polygon, arbitrum, optimism, base, avalanche]
  : [sepolia, polygonAmoy, arbitrumSepolia, optimismSepolia, baseSepolia]
) as const;

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Openfort LiFi Demo",
    chains,
  })
);

export type WagmiConfigType = typeof wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: WagmiConfigType;
  }
}
