import { useQuery } from '@tanstack/react-query'
import { sdk } from '../lib/vaultsFyi'

export function usePositions(userAddress?: string) {
  return useQuery({
    queryKey: ['positions', userAddress],
    queryFn: () => sdk.getPositions({ path: { userAddress: userAddress! } }),
    enabled: !!userAddress,
  })
}
