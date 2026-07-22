import type { OpenfortProviderProps } from "@openfort/react-native";

import { getL1ChainId, getL1ChainName, getL1NativeSymbol, getL1RpcUrls } from "../utils/config";

/**
 * Env-driven L1 chain for the embedded wallet. Defaults to Ethereum mainnet, and stays there even
 * in Lighter-testnet mode: Lighter's testnet account funding is a single faucet REST call (see
 * services/lighterServerClient.ts#requestFaucet) that needs no on-chain transaction at all, so the
 * wallet's L1 chain is only ever exercised by the real mainnet deposit path
 * (services/depositFlow.ts). Lighter's own testnet "L1" (reported chainId 123456 via
 * /api/v1/layer1BasicInfo) has no discoverable public RPC — it collides with an unrelated public
 * chain ("ADIL Devnet") and isn't something an external wallet can transact against. See
 * docs/lighter-signing-notes.md.
 */
export const L1_CHAIN_ID = getL1ChainId();

export const L1_CHAIN = {
  id: L1_CHAIN_ID,
  name: getL1ChainName(),
  nativeCurrency: {
    name: getL1ChainName(),
    symbol: getL1NativeSymbol(),
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: getL1RpcUrls(),
    },
  },
} as const;

export const SUPPORTED_CHAINS = [L1_CHAIN] as OpenfortProviderProps["supportedChains"];
