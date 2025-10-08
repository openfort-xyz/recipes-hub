import type { Chain, Token } from "@lifi/sdk";
import {
  ETHEREUM_CHAIN_ID,
  ETH_SYMBOL,
  USDC_ETHEREUM_ADDRESS,
  USDC_SYMBOL,
} from "../constants";

export const findToken = (
  tokens: Token[],
  {
    symbol,
    address,
  }: {
    symbol?: string;
    address?: string;
  }
) => {
  if (address) {
    const lowerAddress = address.toLowerCase();
    const matchByAddress = tokens.find(
      (token) => token.address.toLowerCase() === lowerAddress
    );
    if (matchByAddress) {
      return matchByAddress;
    }
  }

  if (symbol) {
    const lowerSymbol = symbol.toLowerCase();
    const matchBySymbol = tokens.find(
      (token) => token.symbol.toLowerCase() === lowerSymbol
    );
    if (matchBySymbol) {
      return matchBySymbol;
    }
  }

  return undefined;
};

export const getPreferredChain = (
  chains: Chain[],
  walletChainId?: number
): Chain | null => {
  if (!chains.length) {
    return null;
  }

  const matches = [
    chains.find((chain) => chain.id === ETHEREUM_CHAIN_ID),
    chains.find((chain) => chain.key?.toLowerCase() === "ethereum"),
    walletChainId ? chains.find((chain) => chain.id === walletChainId) : null,
    chains[0],
  ];

  return matches.find((chain): chain is Chain => !!chain) ?? null;
};

export const shouldReplaceToken = (token: Token | null, chainId: number) =>
  !token || token.chainId !== chainId;

export const pickDefaultFromToken = (tokens: Token[]) =>
  findToken(tokens, { symbol: ETH_SYMBOL }) ?? tokens[0] ?? null;

export const pickDefaultToToken = (tokens: Token[], chainId: number) => {
  if (!tokens.length) {
    return null;
  }

  if (chainId === ETHEREUM_CHAIN_ID) {
    return (
      findToken(tokens, { address: USDC_ETHEREUM_ADDRESS }) ??
      findToken(tokens, { symbol: USDC_SYMBOL }) ??
      tokens[0] ??
      null
    );
  }

  return findToken(tokens, { symbol: USDC_SYMBOL }) ?? tokens[0] ?? null;
};
