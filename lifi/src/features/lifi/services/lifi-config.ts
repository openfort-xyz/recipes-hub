import { ChainType, EVM, createConfig, getChains } from "@lifi/sdk";
import { getWalletClient, switchChain } from "wagmi/actions";
import type { Config } from "wagmi";

export const initializeLiFiConfig = (wagmiConfig: Config) =>
  createConfig({
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR as string,
    providers: [
      EVM({
        getWalletClient: () => getWalletClient(wagmiConfig),
        switchChain: async (chainId) => {
          const chain = await switchChain(wagmiConfig, { chainId });
          return getWalletClient(wagmiConfig, { chainId: chain.id });
        },
      }),
    ],
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY as string,
  });

export const loadSupportedChains = async () => {
  try {
    return await getChains({
      chainTypes: [ChainType.EVM],
    });
  } catch {
    return [];
  }
};
