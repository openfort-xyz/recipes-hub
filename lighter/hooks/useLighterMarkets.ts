import { useCallback, useEffect, useState } from "react";

import { fetchMarkets, type Market } from "../services/lighterServerClient";

/** All active markets with live prices — powers the asset selector and portfolio price lookups. */
export function useLighterMarkets(pollMs = 3000) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchMarkets();
      setMarkets(result.markets);
      setError(null);
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load markets");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    // Polling an external REST endpoint on an interval is a legitimate effect (synchronizing
    // with an external system, not derived render state) — see React docs "You Might Not Need
    // an Effect". refresh()'s setState calls only run after its internal await, not
    // synchronously within this effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  return { markets, isLoading: !hasLoadedOnce && isFetching, error, refresh };
}
