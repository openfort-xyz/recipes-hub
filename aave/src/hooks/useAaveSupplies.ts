import { type EvmAddress, chainId as toChainId, useUserSupplies } from '@aave/react'

/**
 * Read the connected user's Aave v4 supply positions on the active chain.
 *
 * Aave v4 exposes a declarative `useUserSupplies` hook (hub/spoke model) that
 * replaces the v3 `userSupplies` client action. The query is paused until both
 * a user address and a chain are available, and refreshes on its own.
 */
export function useAaveSupplies(user: EvmAddress | undefined, currentChainId: number | undefined) {
  const result = useUserSupplies({
    query: {
      userChains: {
        user,
        chainIds: currentChainId ? [toChainId(currentChainId)] : [],
      },
    },
    pause: !user || !currentChainId,
  })

  return {
    userSupplyPositions: result.data,
    suppliesLoading: result.loading,
    suppliesError: result.error ?? null,
  }
}
