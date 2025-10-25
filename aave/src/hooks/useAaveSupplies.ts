import { useState, useEffect, useCallback } from 'react';
import { useAaveClient } from "@aave/react";
import { userSupplies as fetchUserSupplies } from "@aave/client/actions";
import type { MarketUserReserveSupplyPosition } from "@aave/graphql";

export function useAaveSupplies(user: any, markets: any) {
  const aaveClient = useAaveClient();
  const [userSupplyPositions, setUserSupplyPositions] = useState<MarketUserReserveSupplyPosition[] | undefined>(undefined);
  const [suppliesLoading, setSuppliesLoading] = useState(true);
  const [suppliesError, setSuppliesError] = useState<Error | null>(null);

  const refreshUserSupplies = useCallback(async () => {
    if (!aaveClient || !user) {
      setUserSupplyPositions(undefined);
      setSuppliesLoading(false);
      setSuppliesError(null);
      return;
    }
    if (!markets || markets.length === 0) {
      if (!markets) {
        setUserSupplyPositions(undefined);
        setSuppliesLoading(true);
      } else {
        setUserSupplyPositions([]);
        setSuppliesLoading(false);
      }
      setSuppliesError(null);
      return;
    }

    setSuppliesLoading(true);
    setSuppliesError(null);

    const result = await fetchUserSupplies(aaveClient, {
      markets: markets.map((market: any) => ({
        chainId: market.chain.chainId,
        address: market.address,
      })),
      user,
    });

    if (result.isErr()) {
      console.error("Failed to fetch user supplies:", result.error);
      setSuppliesError(result.error);
      setUserSupplyPositions(undefined);
    } else {
      setUserSupplyPositions(result.value);
    }

    setSuppliesLoading(false);
  }, [aaveClient, user, markets]);

  useEffect(() => {
    void refreshUserSupplies();
  }, [refreshUserSupplies]);

  return {
    userSupplyPositions,
    suppliesLoading,
    suppliesError,
    refreshUserSupplies
  };
}