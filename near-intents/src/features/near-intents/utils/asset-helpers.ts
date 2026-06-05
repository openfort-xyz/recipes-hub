import {
  CHAIN_META,
  EVM_ORIGIN_CHAIN_ID,
  isOriginBlockchain,
} from "@/features/near-intents/constants";
import type { OneClickToken, SwapAsset } from "@/features/near-intents/types";

const evmContractAddress = (token: OneClickToken): `0x${string}` | undefined =>
  token.contractAddress && token.contractAddress.startsWith("0x")
    ? (token.contractAddress.toLowerCase() as `0x${string}`)
    : undefined;

/** Origin asset: EVM only, with the chain id the wallet needs to sign. */
export const toOriginAsset = (token: OneClickToken): SwapAsset | null => {
  if (!isOriginBlockchain(token.blockchain)) {
    return null;
  }
  const contractAddress = evmContractAddress(token);
  return {
    assetId: token.assetId,
    symbol: token.symbol,
    decimals: token.decimals,
    blockchain: token.blockchain,
    chainId: EVM_ORIGIN_CHAIN_ID[token.blockchain],
    contractAddress,
    isNative: !contractAddress,
    isEvm: true,
    price: token.price,
  };
};

/** Destination asset: any chain we have metadata for, EVM or not. */
export const toDestinationAsset = (token: OneClickToken): SwapAsset | null => {
  const meta = CHAIN_META[token.blockchain];
  if (!meta) {
    return null;
  }
  const contractAddress = evmContractAddress(token);
  return {
    assetId: token.assetId,
    symbol: token.symbol,
    decimals: token.decimals,
    blockchain: token.blockchain,
    chainId: isOriginBlockchain(token.blockchain)
      ? EVM_ORIGIN_CHAIN_ID[token.blockchain]
      : undefined,
    contractAddress,
    isNative: !contractAddress,
    isEvm: meta.isEvm,
    price: token.price,
  };
};

const compact = (assets: (SwapAsset | null)[]): SwapAsset[] =>
  assets.filter((asset): asset is SwapAsset => asset !== null);

export const buildOriginAssets = (tokens: OneClickToken[]): SwapAsset[] =>
  compact(tokens.map(toOriginAsset));

export const buildDestinationAssets = (tokens: OneClickToken[]): SwapAsset[] =>
  compact(tokens.map(toDestinationAsset));

const findAsset = (
  assets: SwapAsset[],
  blockchain: string,
  symbol: string
): SwapAsset | undefined =>
  assets.find(
    (asset) => asset.blockchain === blockchain && asset.symbol === symbol
  );

/** Defaults: USDC on Base → USDC on Arbitrum (both EVM, so the form works immediately). */
export const pickDefaultPair = (
  originAssets: SwapAsset[],
  destinationAssets: SwapAsset[]
): { from: SwapAsset | null; to: SwapAsset | null } => ({
  from: findAsset(originAssets, "base", "USDC") ?? originAssets[0] ?? null,
  to:
    findAsset(destinationAssets, "arb", "USDC") ??
    destinationAssets.find((asset) => asset.blockchain !== "base") ??
    destinationAssets[0] ??
    null,
});
