import { tempoModerato } from 'viem/chains'

/**
 * PathUSD + Tempo testnet configuration.
 *
 * Chain identity (id, RPC, explorer, name) is sourced from viem's
 * `tempoModerato` so it can never drift from the chain the treasury actually
 * signs against. Only the PathUSD token specifics live here.
 */
export const NETWORK_CONFIG = {
  tempo: {
    chainId: tempoModerato.id,
    caip2: `eip155:${tempoModerato.id}`,
    pathUsdContract: '0x20c0000000000000000000000000000000000000' as `0x${string}`,
    pathUsdDecimals: 6,
    name: tempoModerato.name,
    rpcUrl: tempoModerato.rpcUrls.default.http[0],
    explorerUrl: tempoModerato.blockExplorers?.default.url ?? 'https://explore.tempo.xyz',
  },
} as const

export function getNetworkConfig() {
  return NETWORK_CONFIG.tempo
}
