import { getDefaultConfig } from "@openfort/react/wagmi";
import { createConfig } from "wagmi";
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

// Required for external-wallet ("Connect Wallet") sign-in. Without it Openfort
// drops the WALLET auth provider and only email sign-in is shown.
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  ...getDefaultConfig({
    appName: "Openfort NEAR Intents Demo",
    chains,
    walletConnectProjectId,
  }),
  // Defer browser-only storage (indexedDB) hydration to the client so server
  // rendering doesn't touch it.
  ssr: true,
});

export type WagmiConfigType = typeof wagmiConfig;

declare module "wagmi" {
  interface Register {
    config: WagmiConfigType;
  }
}
