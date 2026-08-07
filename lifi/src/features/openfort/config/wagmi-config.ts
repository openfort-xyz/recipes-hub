import { embeddedWalletConnector } from "@openfort/react/wagmi";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
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

const mainnetIds = new Set<number>([
  mainnet.id,
  polygon.id,
  arbitrum.id,
  optimism.id,
  base.id,
  avalanche.id,
]);

const mainnetChains = [mainnet, polygon, arbitrum, optimism, base, avalanche] as const;
const testnetChains = [sepolia, polygonAmoy, arbitrumSepolia, optimismSepolia, baseSepolia] as const;

const chains = mainnetIds.has(DEFAULT_CHAIN_ID)
  ? mainnetChains
  : testnetChains;

export type WagmiChainId = (typeof chains)[number]["id"];
export const isWagmiChainId = (chainId: number): chainId is WagmiChainId =>
  chains.some((chain) => chain.id === chainId);

export const wagmiConfig = createConfig({
  chains,
  connectors: [embeddedWalletConnector(), injected()],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [avalanche.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});

export type WagmiConfigType = typeof wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: WagmiConfigType;
  }
}
