import { ChainType, createClient, getChains, type SDKClient } from "@lifi/sdk";
import { EthereumProvider } from "@lifi/sdk-provider-ethereum";
import type { Config } from "wagmi";
import { getWalletClient, switchChain } from "wagmi/actions";

let client: SDKClient | null = null;

/**
 * Create the LI.FI v4 SDK client. v4 is headless: actions take the client as
 * their first argument, and EVM wallet wiring lives in a modular
 * `@lifi/sdk-provider-ethereum` provider rather than the old bundled `EVM()`.
 */
export const initializeLiFiConfig = (wagmiConfig: Config): SDKClient => {
  client = createClient({
    integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR as string,
    apiKey: process.env.NEXT_PUBLIC_LIFI_API_KEY as string,
    providers: [
      EthereumProvider({
        getWalletClient: () => getWalletClient(wagmiConfig),
        switchChain: async (chainId) => {
          const chain = await switchChain(wagmiConfig, { chainId });
          return getWalletClient(wagmiConfig, { chainId: chain.id });
        },
      }),
    ],
  });
  return client;
};

export const getLiFiClient = (): SDKClient => {
  if (!client) {
    throw new Error("LI.FI client not initialized — call initializeLiFiConfig first");
  }
  return client;
};

export const loadSupportedChains = async () => {
  try {
    return await getChains(getLiFiClient(), { chainTypes: [ChainType.EVM] });
  } catch {
    return [];
  }
};
