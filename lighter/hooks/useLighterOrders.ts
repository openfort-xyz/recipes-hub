import { useCallback, useEffect, useState } from "react";

import {
  cancelOrder as cancelOrderRequest,
  createOrder as createOrderRequest,
  fetchOpenOrders,
  type ActiveOrder,
  type CreateOrderRequest,
} from "../services/lighterServerClient";

export function useLighterOrders(pollMs = 5000) {
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchOpenOrders();
      setOrders(result.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load open orders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // See useLighterMarkets.ts for why this poll effect is exempted from set-state-in-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [refresh, pollMs]);

  const createOrder = useCallback(
    async (order: CreateOrderRequest) => {
      const result = await createOrderRequest(order);
      await refresh();
      return result;
    },
    [refresh],
  );

  const cancelOrder = useCallback(
    async (marketIndex: number, orderIndex: number) => {
      const result = await cancelOrderRequest(marketIndex, orderIndex);
      await refresh();
      return result;
    },
    [refresh],
  );

  return { orders, isLoading, error, refresh, createOrder, cancelOrder };
}
