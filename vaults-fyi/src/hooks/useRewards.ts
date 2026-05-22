import { useQuery } from "@tanstack/react-query";
import { sdk } from "../lib/vaultsFyi";

export function useRewards(userAddress?: string) {
  return useQuery({
    queryKey: ["rewardsContext", userAddress],
    queryFn: () =>
      sdk.getRewardsTransactionsContext({
        path: { userAddress: userAddress! },
      }),
    enabled: !!userAddress,
  });
}
