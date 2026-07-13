import { useQuery } from '@tanstack/react-query'
import { getAllBorrowMarkets } from '../lib/vaultsFyiBeta'

/** Discover borrow markets on Base (default). */
export function useBorrowMarkets(network = 'base') {
  return useQuery({
    queryKey: ['borrowMarkets', network],
    queryFn: () => getAllBorrowMarkets(network),
  })
}
