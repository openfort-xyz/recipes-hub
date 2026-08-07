import { embeddedWalletConnector } from "@openfort/react/wagmi";
import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import {
  arbitrum,
  avalanche,
  base,
  mainnet,
  optimism,
  polygon,
} from "wagmi/chains";

// NEAR Intents has no testnet — this recipe runs on mainnet chains only.
const chains = [base, arbitrum, optimism, polygon, mainnet, avalanche] as const;

export type WagmiChainId = (typeof chains)[number]["id"];
export const isWagmiChainId = (chainId: number): chainId is WagmiChainId =>
  chains.some((chain) => chain.id === chainId);

// Required for external-wallet ("Connect Wallet") sign-in. Without it Openfort
// drops the WALLET auth provider and only email sign-in is shown.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [embeddedWalletConnector(), injected()];
if (walletConnectProjectId) {
  connectors.push(walletConnect({ projectId: walletConnectProjectId }));
}

export const wagmiConfig = createConfig({
  chains,
  connectors,
  ssr: true,
  transports: {
    [base.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [polygon.id]: http(),
    [mainnet.id]: http(),
    [avalanche.id]: http(),
  },
});

export type WagmiConfigType = typeof wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: WagmiConfigType;
  }
}
