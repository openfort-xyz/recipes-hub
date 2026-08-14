import { useQuery } from '@tanstack/react-query'
import { yieldXyz } from '../lib/yieldXyz'

export function useYieldDetail(yieldId: string) {
  return useQuery({
    queryKey: ['yield', yieldId],
    queryFn: () => yieldXyz.getYield(yieldId),
  })
}

export function useValidators(yieldId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['validators', yieldId],
    queryFn: () => yieldXyz.getValidators(yieldId),
    select: (data) => data.items,
    enabled,
  })
}

export function useBalances(yieldId: string, address?: string) {
  return useQuery({
    queryKey: ['balances', yieldId, address],
    queryFn: () => yieldXyz.getBalances(yieldId, address!),
    enabled: !!address,
  })
}
