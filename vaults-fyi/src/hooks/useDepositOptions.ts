import { useQuery } from "@tanstack/react-query";
import { sdk } from "../lib/vaultsFyi";

export type VaultOption = Awaited<
  ReturnType<typeof sdk.getAllVaults>
>["data"][number];

export function useDepositOptions() {
  return useQuery({
    queryKey: ["depositOptions"],
    queryFn: async () => {
      const result = await sdk.getAllVaults({
        query: {
          allowedAssets: ["USDC"],
          allowedNetworks: ["base"],
          onlyTransactional: true,
          sortBy: "apy7day",
          sortOrder: "desc",
          perPage: 20,
        },
      });

      return result.data.filter(
        (v) =>
          v.transactionalProperties?.depositStepsType !== "complex" &&
          v.transactionalProperties?.redeemStepsType !== "complex",
      );
    },
  });
}
