import { useCallback, useEffect, useState } from "react";

import { fetchOrderBook, type OrderBookResponse } from "../services/lighterServerClient";

/** Live bid/ask levels for one selected market — used to compute the IOC crossing price. */
export function useLighterOrderBook(marketIndex: number | null, pollMs = 3000) {
  const [orderBook, setOrderBook] = useState<OrderBookResponse | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (marketIndex === null) {
      setIsFetching(false);
      return;
    }
    try {
      const result = await fetchOrderBook(marketIndex, 8);
      setOrderBook(result);
      setError(null);
      setHasLoadedOnce(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order book");
    } finally {
      setIsFetching(false);
    }
  }, [marketIndex]);

  useEffect(() => {
    // See useLighterMarkets.ts for why this poll effect is exempted from set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasLoadedOnce(false);
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  const bestBid = orderBook?.bids[0]?.price ? Number.parseFloat(orderBook.bids[0].price) : null;
  const bestAsk = orderBook?.asks[0]?.price ? Number.parseFloat(orderBook.asks[0].price) : null;
  const midPrice = bestBid !== null && bestAsk !== null ? (bestBid + bestAsk) / 2 : (bestBid ?? bestAsk);

  return { orderBook, bestBid, bestAsk, midPrice, isLoading: !hasLoadedOnce && isFetching, error, refresh };
}
