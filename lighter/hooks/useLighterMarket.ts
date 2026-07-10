import { useCallback, useEffect, useState } from "react";

import { fetchMarket, fetchOrderBook, type MarketMeta, type OrderBookResponse } from "../services/lighterServerClient";

export function useLighterMarket(pollMs = 4000) {
  const [market, setMarket] = useState<MarketMeta | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBookResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [marketResult, bookResult] = await Promise.all([fetchMarket(), fetchOrderBook(8)]);
      setMarket(marketResult);
      setOrderBook(bookResult);
      setError(null);
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load market data");
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

  const bestBid = orderBook?.bids[0]?.price ? Number.parseFloat(orderBook.bids[0].price) : null;
  const bestAsk = orderBook?.asks[0]?.price ? Number.parseFloat(orderBook.asks[0].price) : null;
  const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : (bestBid ?? bestAsk);

  return { market, orderBook, midPrice, isLoading: !hasLoadedOnce && isFetching, error, refresh };
}
